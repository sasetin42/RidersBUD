const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const {
  WEBHOOK_URL,
  HTTPS_RETURN_URL,
  TRANSACTION_STATUSES,
  TERMINAL_STATUSES,
  ENTITY_COLLECTIONS,
  COLLECTION_ENTITY_KIND,
  resolveHitpayCredentials,
  resolveWebhookSalts,
  hitpayApi,
  fetchPaymentRequest,
  verifyWebhookSignature,
  calculateAuthoritativeAmount,
  deriveTransactionId,
  locateTransaction,
  settleTransaction,
  computeEntityPaymentUpdate,
  parseReferenceEntity
} = require('./lib/hitpay');

const { buildDailyFinanceSummary } = require('./lib/financeEmail');

if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Authentication & ownership helper for incoming requests.
 * Extracts the Bearer token, verifies via Firebase Admin Auth, and checks admin or user ID.
 * Returns isGuest: true if no token is provided, allowing entity-level verification fallback.
 */
async function authenticateRequest(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return { authenticated: false, uid: null, isGuest: true, statusCode: 200 };
  }
  const token = authHeader.split('Bearer ')[1].trim();
  if (!token) {
    return { authenticated: false, uid: null, isGuest: true, statusCode: 200 };
  }
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    let isAdminUser = false;
    try {
      const adminSnap = await admin.firestore().collection('adminUsers').doc(decodedToken.uid).get();
      isAdminUser = adminSnap.exists;
    } catch (_) { }

    return {
      authenticated: true,
      uid: decodedToken.uid,
      email: decodedToken.email || '',
      isAdmin: isAdminUser
    };
  } catch (err) {
    // If token verification fails (e.g. expired or invalid), reject
    return { authenticated: false, error: 'INVALID_AUTH_TOKEN', detail: err.message, statusCode: 401 };
  }
}

/**
 * Cloud Function HTTP Proxy for HitPay API requests.
 * Secure, authenticated, idempotent.
 */
exports.hitpayProxy = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const isSandbox = req.method === 'GET'
        ? String(req.query.sandbox || 'false') === 'true'
        : ((req.body || {}).isSandbox === true);
      const environment = isSandbox ? 'sandbox' : 'production';

      const creds = await resolveHitpayCredentials(isSandbox);
      if (!creds || !creds.apiKey) {
        return res.status(200).json({
          fallbackToPortal: true,
          reason: 'credentials_not_configured',
          message: 'HitPay credentials are not provisioned server-side yet.'
        });
      }

      // ------------------------------------------------------------------ GET --
      if (req.method === 'GET') {
        const action = String(req.query.action || '');

        const auth = await authenticateRequest(req);
        if (auth.error === 'INVALID_AUTH_TOKEN') {
          return res.status(401).json({ error: auth.error, message: 'Invalid authentication token' });
        }

        // --- status passthrough (authoritative HitPay status) ---
        if (action === 'status') {
          const paymentRequestId = String(req.query.id || '');
          if (!paymentRequestId) return res.status(400).json({ error: 'Use ?action=status&id=<payment_request_id>' });
          try {
            const pr = await fetchPaymentRequest(isSandbox, paymentRequestId);
            if (!pr.ok && pr.reason === 'upstream_unreachable') {
              return res.status(200).json({ fallbackToPortal: true, reason: 'upstream_unreachable', error: pr.error });
            }
            return res.status(pr.statusCode || (pr.ok ? 200 : 502)).json(pr.data || {});
          } catch (err) {
            return res.status(200).json({ fallbackToPortal: true, reason: 'upstream_unreachable', error: err.message });
          }
        }

        // Helper to normalize transaction query parameters across different client naming styles
        const extractTxParams = (query) => {
          const rawTx = String(query.tx || query.transactionId || '').trim();
          const rawS = String(query.s || query.paymentSessionId || '').trim();
          const rawId = String(query.id || query.paymentRequestId || '').trim();
          const rawRef = String(query.ref || query.referenceNumber || '').trim();

          const looksLikeTx = rawId.startsWith('tx_') || Boolean(rawTx);
          const transactionId = rawTx || (looksLikeTx ? rawId : '');
          const paymentRequestId = !rawId.startsWith('tx_') ? rawId : '';
          const paymentSessionId = rawS;
          const referenceNumber = rawRef;

          return { transactionId, paymentSessionId, paymentRequestId, referenceNumber, rawId, rawTx, rawS, rawRef };
        };

        // --- transaction record lookup with ownership check ---
        if (action === 'transaction') {
          const { transactionId, paymentSessionId, paymentRequestId, referenceNumber } = extractTxParams(req.query);

          const located = await locateTransaction({
            transactionId,
            paymentSessionId,
            paymentRequestId,
            referenceNumber
          });
          if (!located) return res.status(404).json({ error: 'transaction_not_found' });

          const txData = located.data;
          if (auth.authenticated && !auth.isAdmin && txData.customerId && txData.customerId !== auth.uid) {
            return res.status(403).json({ error: 'ACCESS_DENIED', message: 'You do not have permission to view this transaction' });
          }

          return res.status(200).json({ transactionId: located.id, ...txData });
        }

        // --- authoritative re-verification + idempotent settlement ---
        if (action === 'verify') {
          const { transactionId, paymentSessionId, paymentRequestId, referenceNumber, rawId, rawTx, rawS, rawRef } = extractTxParams(req.query);

          if (!rawId && !rawTx && !rawS && !rawRef) {
            return res.status(400).json({ error: 'Use ?action=verify&id=<transaction|payment_request_id>&ref=<reference>&tx=<txId>&s=<sessionId>' });
          }

          const located = await locateTransaction({
            transactionId,
            paymentSessionId,
            paymentRequestId,
            referenceNumber
          });

          if (located) {
            const txData = located.data;
            if (auth.authenticated && !auth.isAdmin && txData.customerId && txData.customerId !== auth.uid) {
              return res.status(403).json({ error: 'ACCESS_DENIED', message: 'You do not have permission to verify this transaction' });
            }
          }

          const result = await settleTransaction({
            transactionId,
            paymentSessionId,
            paymentRequestId,
            referenceNumber,
            trigger: 'verify'
          });

          const responsePayload = { ok: true, result };
          if (result.transactionId) {
            const freshLocated = await locateTransaction({ transactionId: result.transactionId });
            if (freshLocated) responsePayload.transaction = { transactionId: freshLocated.id, ...freshLocated.data };
          }
          return res.status(200).json(responsePayload);
        }

        // --- safe sandbox-only testing simulation ---
        if (action === 'simulate-sandbox') {
          // 1. Strictly forbid in production
          if (!isSandbox) {
            return res.status(403).json({
              error: 'FORBIDDEN',
              message: 'simulate-sandbox is only permitted in the sandbox environment.'
            });
          }

          const { transactionId, paymentSessionId, paymentRequestId, referenceNumber, rawId, rawTx, rawS, rawRef } = extractTxParams(req.query);

          if (!rawId && !rawTx && !rawS && !rawRef) {
            return res.status(400).json({ error: 'Provide transaction identifiers (tx, s, ref, or id) to simulate sandbox payment.' });
          }

          const located = await locateTransaction({
            transactionId,
            paymentSessionId,
            paymentRequestId,
            referenceNumber
          });

          if (!located) {
            return res.status(404).json({ error: 'transaction_not_found', message: 'Transaction not found to simulate payment.' });
          }

          const txData = located.data;
          const txId = located.id;
          const txRef = located.ref;

          // Double check environment on the transaction itself
          if (txData.environment && txData.environment !== 'sandbox') {
            return res.status(403).json({
              error: 'FORBIDDEN',
              message: 'Cannot simulate settlement on a non-sandbox transaction.'
            });
          }

          // 2. Ownership check: Must be owner or admin
          if (auth.authenticated && !auth.isAdmin && txData.customerId && txData.customerId !== auth.uid) {
            return res.status(403).json({
              error: 'ACCESS_DENIED',
              message: 'You do not have permission to simulate payment for this transaction.'
            });
          }

          // 3. Directly transition sandbox transaction to PAID and update target entity
          const nowIso = new Date().toISOString();
          const entityKind = txData.entityKind;
          const entityId = txData.entityId;
          const collectionName = ENTITY_COLLECTIONS[entityKind] || '';
          const txAmount = Number(txData.amount || 0);
          let entityUpdated = false;

          const db = admin.firestore();
          await db.runTransaction(async (t) => {
            // 1. ALL READS FIRST (Firestore rule: all reads before writes)
            const snap = await t.get(txRef);
            if (!snap.exists) throw new Error('transaction disappeared');
            const fresh = snap.data();
            if (TERMINAL_STATUSES.includes(fresh.status) && fresh.status === 'PAID') {
              return; // Already paid
            }

            let eRef = null;
            let eSnap = null;
            if (collectionName && entityId) {
              eRef = db.collection(collectionName).doc(entityId);
              eSnap = await t.get(eRef);
            }

            // 2. ALL WRITES AFTER
            const stateHistory = Array.isArray(fresh.stateHistory) ? [...fresh.stateHistory] : [];
            stateHistory.push({ status: 'PAID', timestamp: nowIso, reason: 'sandbox_simulation' });

            t.update(txRef, {
              status: 'PAID',
              verificationStatus: 'VERIFIED',
              webhookVerified: true,
              hitpayStatus: 'completed',
              hitpayPaymentId: fresh.hitpayPaymentId || `sim_${Date.now()}`,
              paidAt: nowIso,
              verifiedAt: nowIso,
              simulated: true,
              stateHistory,
              failureReason: '',
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            if (eRef && eSnap && eSnap.exists) {
              const { update } = computeEntityPaymentUpdate(eSnap.data(), {
                amount: txAmount,
                reference: fresh.referenceNumber || referenceNumber,
                transactionId: txId,
                kind: fresh.kind || '',
                paymentMethod: fresh.paymentMethod || 'HitPay Sandbox (Simulated)',
                paymentRequestId: fresh.paymentRequestId || paymentRequestId || '',
                collectionName
              });
              t.update(eRef, update);
              entityUpdated = true;
            }
          });

          const freshLocated = await locateTransaction({ transactionId: txId });
          return res.status(200).json({
            ok: true,
            simulated: true,
            transactionId: txId,
            status: 'PAID',
            entityUpdated,
            transaction: freshLocated ? { transactionId: freshLocated.id, ...freshLocated.data } : null
          });
        }

        return res.status(400).json({ error: 'Unknown action. Use ?action=status|transaction|verify|simulate-sandbox' });
      }

      // ----------------------------------------------------------------- POST --
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed. Use POST or GET?action=status.' });
      }

      // Check authentication (Bearer token or entity ownership)
      const auth = await authenticateRequest(req);
      if (auth.error === 'INVALID_AUTH_TOKEN') {
        return res.status(401).json({ error: auth.error, message: 'Invalid authentication token' });
      }

      const body = req.body || {};
      const rawPayload = body.payload || {};
      const entityKind = String(body.entityKind || rawPayload.entityKind || '').trim();
      const entityId = String(body.entityId || rawPayload.entityId || '').trim();
      const kind = String(body.kind || rawPayload.kind || '').trim(); // 'downpayment' | 'balance' | 'full'

      // P0 Security: Must have valid entityKind and entityId
      if (!entityKind || !entityId) {
        return res.status(400).json({
          error: 'MISSING_PAYMENT_ENTITY',
          code: 'ENTITY_REQUIRED',
          message: 'Payment initiation requires a valid entityKind and entityId.'
        });
      }

      const collectionName = ENTITY_COLLECTIONS[entityKind];
      if (!collectionName) {
        return res.status(400).json({
          error: 'INVALID_ENTITY_KIND',
          code: 'UNKNOWN_ENTITY_KIND',
          message: `Entity kind "${entityKind}" is not supported.`
        });
      }

      // Fetch authoritative entity record from Firestore
      const entityDocRef = admin.firestore().collection(collectionName).doc(entityId);
      const entitySnap = await entityDocRef.get();
      if (!entitySnap.exists) {
        return res.status(404).json({
          error: 'ENTITY_NOT_FOUND',
          code: 'ENTITY_NOT_FOUND',
          message: `The specified ${entityKind} (${entityId}) does not exist.`
        });
      }

      const entityData = entitySnap.data() || {};
      const entityOwnerId = entityData.customerId || entityData.userId || (entityData.customer && entityData.customer.id) || '';
      const entityOwnerEmail = entityData.customerEmail || entityData.email || (entityData.customer && entityData.customer.email) || '';
      const clientProvidedEmail = String(body.customerEmail || rawPayload.email || '').trim().toLowerCase();
      const clientProvidedId = String(body.customerId || rawPayload.customerId || '').trim();

      // Ownership enforcement:
      // If signed in with Firebase ID token, verify UID
      if (auth.authenticated && !auth.isAdmin && entityOwnerId && entityOwnerId !== auth.uid) {
        return res.status(403).json({
          error: 'PERMISSION_DENIED',
          code: 'OWNERSHIP_MISMATCH',
          message: 'You are not authorized to make payments for this reservation.'
        });
      }

      // If guest / local-bypass session without ID token, ensure customerId, customerEmail matches or entity is open/recent
      if (!auth.authenticated) {
        const matchesId = Boolean(entityOwnerId && clientProvidedId && entityOwnerId === clientProvidedId);
        const matchesEmail = Boolean(entityOwnerEmail && clientProvidedEmail && entityOwnerEmail.toLowerCase() === clientProvidedEmail);

        let createdMillis = 0;
        if (entityData.createdAt) {
          if (typeof entityData.createdAt.toMillis === 'function') {
            createdMillis = entityData.createdAt.toMillis();
          } else if (typeof entityData.createdAt === 'number') {
            createdMillis = entityData.createdAt;
          } else {
            createdMillis = new Date(entityData.createdAt).getTime() || 0;
          }
        }
        const isRecentlyCreated = createdMillis > 0 && Math.abs(Date.now() - createdMillis) < 60 * 60 * 1000;
        const isEntityOpenForPayment = !entityOwnerId || matchesId || matchesEmail || isRecentlyCreated;

        if (!isEntityOpenForPayment) {
          return res.status(401).json({
            error: 'MISSING_AUTH_TOKEN',
            message: 'Authentication required for payment initiation'
          });
        }
      }

      // Reference format
      let referenceNumber = String(rawPayload.reference_number || body.referenceNumber || '').trim();
      if (!referenceNumber) {
        const prefixMap = {
          booking: 'BOK',
          rental: 'RNT',
          liaison: 'LIA',
          'service-request': 'SRV',
          order: 'ORD'
        };
        const prefix = prefixMap[entityKind] || 'RB';
        const suffix = kind === 'downpayment' ? 'DP' : (kind === 'balance' ? 'BAL' : 'FULL');
        referenceNumber = `${prefix}-${entityId.slice(-8).toUpperCase()}-${suffix}-${Date.now().toString().slice(-4)}`;
      }

      // Authoritative amount calculation
      const authAmounts = calculateAuthoritativeAmount(entityData, collectionName, kind, referenceNumber);
      const authoritativeAmount = authAmounts.amount;
      const currency = authAmounts.currency || 'PHP';

      // Check if client supplied an expectedAmount or payload.amount
      const clientAmount = Number(body.expectedAmount ?? body.amount ?? rawPayload.amount);
      if (Number.isFinite(clientAmount) && clientAmount > 0) {
        if (Math.abs(clientAmount - authoritativeAmount) > 0.01) {
          console.warn(`[HitPay] Payment amount mismatch for ${entityKind}/${entityId}: client=${clientAmount}, authoritative=${authoritativeAmount}`);
          return res.status(400).json({
            error: 'PAYMENT_AMOUNT_MISMATCH',
            code: 'AMOUNT_MISMATCH',
            message: `Amount mismatch: expected ${authoritativeAmount} ${currency}, received ${clientAmount} ${currency}`,
            authoritativeAmount,
            clientAmount,
            currency
          });
        }
      }

      // If authoritative amount <= 0, check if already paid
      if (authoritativeAmount <= 0) {
        return res.status(200).json({
          alreadyPaid: true,
          status: 'PAID',
          message: 'This entity has no remaining balance due.',
          remainingBalance: 0
        });
      }

      // Deduplication check: check for active sessions for entityKind + entityId + kind
      const txCollection = admin.firestore().collection('paymentTransactions');
      const activeSessionsQuery = await txCollection
        .where('entityKind', '==', entityKind)
        .where('entityId', '==', entityId)
        .limit(10)
        .get();

      const activeStatuses = ['CREATED', 'INITIALIZING', 'CHECKOUT_OPEN', 'WAITING_FOR_PAYMENT', 'VERIFYING', 'PENDING', 'INITIATED'];
      let existingActiveTx = null;

      if (!activeSessionsQuery.empty) {
        const sorted = activeSessionsQuery.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => {
            const ta = (a.createdAt && a.createdAt.toMillis) ? a.createdAt.toMillis() : 0;
            const tb = (b.createdAt && b.createdAt.toMillis) ? b.createdAt.toMillis() : 0;
            return tb - ta;
          });

        for (const candidate of sorted) {
          if (candidate.status === 'PAID') {
            // Already paid for this specific kind or fully paid
            if (candidate.kind === kind || authAmounts.remainingBalance <= 0) {
              return res.status(200).json({
                alreadyPaid: true,
                status: 'PAID',
                transactionId: candidate.id,
                referenceNumber: candidate.referenceNumber,
                amount: candidate.amount,
                currency: candidate.currency,
                paymentRequestId: candidate.paymentRequestId || ''
              });
            }
          }

          if (activeStatuses.includes(candidate.status) && candidate.paymentRequestId) {
            const ageMs = Date.now() - ((candidate.createdAt && candidate.createdAt.toMillis) ? candidate.createdAt.toMillis() : 0);
            if (ageMs < 30 * 60 * 1000 && candidate.checkoutUrl && body.force !== true) {
              existingActiveTx = candidate;
              break;
            }
          }
        }
      }

      if (existingActiveTx) {
        return res.status(200).json({
          success: true,
          paymentSessionId: existingActiveTx.paymentSessionId || existingActiveTx.id,
          transactionId: existingActiveTx.id,
          paymentRequestId: existingActiveTx.paymentRequestId,
          referenceNumber: existingActiveTx.referenceNumber,
          amount: existingActiveTx.amount,
          currency: existingActiveTx.currency,
          checkoutMode: existingActiveTx.checkoutMode || 'dropin',
          status: existingActiveTx.status,
          checkoutUrl: existingActiveTx.checkoutUrl,
          qr: existingActiveTx.qr || null,
          directLinkAppUrl: existingActiveTx.directLinkAppUrl || null,
          reused: true
        });
      }

      // Generate stable IDs
      const paymentSessionId = `RB-${entityKind}-${entityId}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
      const transactionId = String(body.transactionId || '') || deriveTransactionId(referenceNumber, '');
      const txRef = txCollection.doc(transactionId);

      // Determine checkout mode and payment methods
      // If payment_methods is omitted or empty, HitPay's checkout displays ALL merchant-activated channels
      // (Cards, QR Ph, GCash, Maya, Bank Transfer). Do not force a restrictive filter.
      const checkoutMode = String(body.checkoutMode || 'dropin').toLowerCase(); // 'dropin' | 'qrph-native' | 'gcash'
      const requestedMethods = Array.isArray(body.payment_methods) && body.payment_methods.length > 0
        ? body.payment_methods
        : (Array.isArray(rawPayload.payment_methods) && rawPayload.payment_methods.length > 0 ? rawPayload.payment_methods : null);

      const hitpayPayload = {
        amount: authoritativeAmount,
        currency,
        reference_number: referenceNumber,
        name: String(rawPayload.name || entityData.customerName || auth.email || 'Customer').trim(),
        email: String(rawPayload.email || entityData.customerEmail || auth.email || '').trim(),
        phone: String(rawPayload.phone || entityData.customerPhone || '').trim(),
        purpose: String(rawPayload.purpose || `RidersBUD ${entityKind} (${kind || 'payment'})`).slice(0, 100),
        expires_after: '30 mins',
        redirect_url: `${HTTPS_RETURN_URL}?s=${encodeURIComponent(paymentSessionId)}&tx=${encodeURIComponent(transactionId)}&ref=${encodeURIComponent(referenceNumber)}`
      };

      if (checkoutMode === 'qrph-native') {
        hitpayPayload.generate_qr = true;
        hitpayPayload.payment_methods = ['qrph_netbank'];
      } else if (checkoutMode === 'gcash') {
        hitpayPayload.generate_direct_link = true;
        hitpayPayload.payment_methods = ['gcash'];
      } else if (requestedMethods) {
        hitpayPayload.payment_methods = requestedMethods;
      }

      // Record INITIALIZING in Firestore
      const baseTxRecord = {
        paymentSessionId,
        transactionId,
        entityKind,
        entityId,
        bookingId: entityKind === 'booking' ? entityId : (body.bookingId || ''),
        orderId: entityKind === 'order' ? entityId : (body.orderId || ''),
        referenceNumber,
        amount: authoritativeAmount,
        currency,
        kind,
        checkoutMode,
        paymentMethod: checkoutMode === 'gcash' ? 'GCash' : (checkoutMode === 'qrph-native' ? 'QR Ph' : 'HitPay (Online)'),
        customerId: auth.uid,
        customerName: hitpayPayload.name,
        customerEmail: hitpayPayload.email,
        customerPhone: hitpayPayload.phone,
        environment,
        status: 'INITIALIZING',
        verificationStatus: 'UNVERIFIED',
        stateHistory: [{ status: 'INITIALIZING', timestamp: new Date().toISOString() }],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await txRef.set(baseTxRecord);

      // Call HitPay API to create payment request
      let result;
      try {
        result = await hitpayApi({
          isSandbox,
          apiKey: creds.apiKey,
          method: 'POST',
          path: '/v1/payment-requests',
          body: hitpayPayload
        });
      } catch (err) {
        await txRef.update({
          status: 'FAILED',
          failureReason: err.message || 'HitPay connection failed',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }).catch(() => { });
        return res.status(200).json({
          fallbackToPortal: true,
          reason: 'upstream_unreachable',
          error: err.message || 'HitPay connection failed'
        });
      }

      if (result.statusCode >= 200 && result.statusCode < 300 && result.json && (result.json.id || result.json.url)) {
        const pr = result.json;
        const qrData = pr.qr_code_data || (pr.qr_code ? { qr_code: pr.qr_code } : null);
        const directLinkAppUrl = pr.direct_link_app_url || pr.direct_link_url || null;

        await txRef.update({
          status: 'CHECKOUT_OPEN',
          paymentRequestId: String(pr.id || ''),
          checkoutUrl: String(pr.url || ''),
          hitpayStatus: String(pr.status || 'pending'),
          qr: qrData,
          directLinkAppUrl,
          stateHistory: admin.firestore.FieldValue.arrayUnion({
            status: 'CHECKOUT_OPEN',
            timestamp: new Date().toISOString()
          }),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }).catch((e) => console.warn('[HitPay] tx CHECKOUT_OPEN update error:', e.message));

        return res.status(200).json({
          success: true,
          paymentSessionId,
          transactionId,
          paymentRequestId: pr.id,
          referenceNumber,
          amount: authoritativeAmount,
          currency,
          checkoutMode,
          checkoutUrl: pr.url,
          dropin: {
            defaultUrl: pr.url,
            domain: isSandbox ? 'sandbox.hit-pay.com' : 'hit-pay.com'
          },
          qr: qrData,
          directLinkAppUrl
        });
      }

      // HitPay rejected the request
      const errorDetail = result.json && result.json.errors
        ? Object.entries(result.json.errors).map(([k, v]) => `${k}: ${(v || []).join(', ')}`).join('; ')
        : ((result.json && (result.json.message || result.json.error)) || `HitPay returned HTTP ${result.statusCode}`);

      await txRef.update({
        status: 'FAILED',
        failureReason: String(errorDetail).slice(0, 500),
        stateHistory: admin.firestore.FieldValue.arrayUnion({
          status: 'FAILED',
          timestamp: new Date().toISOString(),
          reason: String(errorDetail).slice(0, 200)
        }),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }).catch(() => { });

      return res.status(result.statusCode || 400).json(
        result.json || { message: errorDetail }
      );
    } catch (e) {
      console.error('[HitPay] Proxy General Error:', e);
      return res.status(500).json({ error: e.message || 'Internal proxy error' });
    }
  });
});

/**
 * Authoritative HitPay Webhook Endpoint
 * Validates HMAC-SHA256 signature using raw body buffer against webhook salts.
 * Enforces deduplication using paymentWebhookLogs / paymentWebhookEvents.
 */
exports.hitpayWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const headers = req.headers || {};
    const payload = (typeof req.body === 'object' && req.body !== null) ? req.body : {};

    let rawBody = null;
    if (Buffer.isBuffer(req.rawBody)) rawBody = req.rawBody;
    else if (typeof req.rawBody === 'string' && req.rawBody.length) rawBody = Buffer.from(req.rawBody, 'utf8');
    else if (String(headers['content-type'] || '').includes('application/json')) {
      try { rawBody = Buffer.from(JSON.stringify(req.body), 'utf8'); } catch (_) { rawBody = null; }
    }

    const paymentRequestId = String(
      payload.payment_request_id ||
      (String(headers['hitpay-event-object'] || '') === 'payment_request' ? payload.id : '') ||
      ''
    );
    const referenceNumber = String(payload.reference_number || '');
    const reportedStatus = String(payload.status || '').toLowerCase();

    // Webhook event deduplication via hash of raw body
    const rawBodySha256 = crypto.createHash('sha256').update(rawBody || JSON.stringify(payload)).digest('hex');
    const eventRef = admin.firestore().collection('paymentWebhookEvents').doc(rawBodySha256);
    const eventSnap = await eventRef.get();
    if (eventSnap.exists && eventSnap.data().processed === true) {
      console.log(`[HitPay] Duplicate webhook event skipped (${rawBodySha256})`);
      return res.status(200).json({ received: true, duplicate: true });
    }

    // Resolve candidate salts
    let environment = '';
    let salts = [];

    if (paymentRequestId || referenceNumber) {
      try {
        const located = await locateTransaction({ paymentRequestId, referenceNumber });
        if (located && located.data.environment) {
          environment = located.data.environment;
          salts = await resolveWebhookSalts(environment === 'sandbox');
        }
      } catch (e) {
        console.warn('[HitPay] transaction lookup for environment failed:', e.message);
      }
    }

    // The recorded environment can disagree with where the payment actually
    // happened (environment mismatch), which used to reject VALID webhooks
    // with 401 because only the recorded env's salts were tried. Validate
    // against the recorded env's salts first, then against every other
    // configured salt — the signature must still match a real salt.
    try {
      const sandboxSalts = await resolveWebhookSalts(true);
      const liveSalts = await resolveWebhookSalts(false);
      salts = Array.from(new Set([...salts, ...sandboxSalts, ...liveSalts]));
    } catch (e) {
      console.warn('[HitPay] salt union build failed:', e.message);
    }

    if (!salts.length) {
      console.error('[HitPay] Webhook: no salt configured — refusing to process.');
      return res.status(500).json({ error: 'Webhook salt not configured' });
    }

    const verdict = verifyWebhookSignature({ rawBody, payload, headers, salts });
    if (!verdict.valid) {
      console.warn('[HitPay] Webhook: signature validation failed.', {
        v2Header: Boolean(headers['hitpay-signature'] || headers['x-hitpay-signature']),
        legacyHeader: Boolean(headers['hmac'] || payload.hmac),
        saltsTried: salts.length,
        paymentRequestId,
        referenceNumber
      });
      return res.status(401).send('Invalid signature');
    }

    // Mark event record as received
    await eventRef.set({
      sha256: rawBodySha256,
      paymentRequestId,
      referenceNumber,
      receivedAt: admin.firestore.FieldValue.serverTimestamp(),
      processed: false
    }, { merge: true });

    // Idempotent settlement
    let result;
    try {
      result = await settleTransaction({
        paymentRequestId,
        referenceNumber,
        webhookPayload: payload,
        trigger: 'webhook'
      });
    } catch (settleErr) {
      console.error('[HitPay] Webhook settlement error:', settleErr);
      return res.status(500).json({ error: settleErr.message || 'settlement failed' });
    }

    /**
     * RETRY SEMANTICS (root-cause fix for stuck "Verifying/Pending" payments):
     * Some settlement outcomes are transient — e.g. the HitPay API was briefly
     * unreachable from the function, or a "completed" payment webhook arrived
     * while the payment request status still read "pending". Previously the
     * event was marked processed and 200-OKed, so HitPay NEVER resent the
     * webhook and the transaction stayed unsettled forever.
     *
     * For retryable outcomes we now return a non-2xx and leave the event
     * unprocessed, so HitPay's webhook retry policy redelivers it until the
     * settlement lands. Definitive outcomes (terminal states, mismatches,
     * unmatched references) are acknowledged as before.
     */
    const isRetryableWebhookOutcome = (r) => {
      if (!r) return true;
      if (r.status === 'ERROR') return true;
      if (r.verificationStatus === 'GATEWAY_UNAVAILABLE') return true;
      if (r.reason === 'gateway_status_pending' && String(reportedStatus).toLowerCase() === 'completed') return true;
      return false;
    };

    if (isRetryableWebhookOutcome(result)) {
      console.warn(`[HitPay] Webhook outcome retryable (${(result && result.status) || 'no-result'}) — asking HitPay to redeliver.`);
      await eventRef.update({
        processed: false,
        settlementStatus: result.status || '',
        willRetry: true,
        lastAttemptAt: admin.firestore.FieldValue.serverTimestamp()
      }).catch(() => { });
      return res.status(503).json({
        received: true,
        retry: true,
        status: result.status,
        verificationStatus: result.verificationStatus || '',
        transactionId: result.transactionId || ''
      });
    }

    await eventRef.update({
      processed: true,
      settlementStatus: result.status || '',
      processedAt: admin.firestore.FieldValue.serverTimestamp()
    }).catch(() => { });

    // Webhook audit log
    try {
      const paymentId = payload.payment_id || '';
      const logId = paymentRequestId ||
        (paymentId ? `pid_${String(paymentId).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40)}` : '') ||
        `wp_${rawBodySha256.slice(0, 24)}`;
      const logRef = admin.firestore().collection('paymentWebhookLogs').doc(logId);
      await admin.firestore().runTransaction(async (t) => {
        const snap = await t.get(logRef);
        const common = {
          paymentId,
          paymentRequestId,
          referenceNumber,
          status: reportedStatus || 'unknown',
          amount: Number(String(payload.amount || 0).replace(/,/g, '')) || 0,
          currency: String(payload.currency || ''),
          paymentMethod: payload.payment_type || payload.payment_method || 'HitPay (Online)',
          signatureValid: true,
          signatureMode: verdict.mode,
          environment,
          settlementStatus: result.status || '',
          matched: result.entityUpdated === true,
          rawPayload: payload
        };
        if (snap.exists) {
          t.update(logRef, Object.assign({}, common, {
            attempts: (snap.data().attempts || 1) + 1,
            lastReceivedAt: admin.firestore.FieldValue.serverTimestamp()
          }));
        } else {
          t.create(logRef, Object.assign({}, common, {
            attempts: 1,
            receivedAt: admin.firestore.FieldValue.serverTimestamp()
          }));
        }
      });
    } catch (logErr) {
      console.warn('[HitPay] Webhook audit log write failed:', logErr.message);
    }

    return res.status(200).json({
      received: true,
      status: result.status,
      alreadySettled: result.alreadySettled === true,
      verificationStatus: result.verificationStatus || '',
      transactionId: result.transactionId || ''
    });
  } catch (err) {
    console.error('[HitPay] Webhook Processing Error:', err);
    return res.status(500).json({ error: err.message || 'Webhook internal error' });
  }
});

/**
 * Task B12: Callable Cloud Function markOfflinePayment
 * Allows admins or assigned mechanics to securely record cash or offline manual payments
 * without granting clients direct write permissions to paymentStatus or paidAmount.
 */
exports.markOfflinePayment = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required.');
  }

  const callerUid = context.auth.uid;
  const db = admin.firestore();

  // Check admin status
  const adminSnap = await db.collection('adminUsers').doc(callerUid).get();
  const isAdmin = adminSnap.exists;

  // Check mechanic status
  const mechanicSnap = await db.collection('mechanics').doc(callerUid).get();
  const isMechanic = mechanicSnap.exists;

  if (!isAdmin && !isMechanic) {
    throw new functions.https.HttpsError('permission-denied', 'Only administrators or mechanics can record offline payments.');
  }

  const entityKind = String(data.entityKind || '').trim();
  const entityId = String(data.entityId || '').trim();
  const amount = Number(data.amount);
  const paymentMethod = String(data.paymentMethod || 'Cash').trim();
  const note = String(data.note || '').trim();

  if (!entityKind || !entityId || !Number.isFinite(amount) || amount <= 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Valid entityKind, entityId, and positive amount are required.');
  }

  const collectionName = ENTITY_COLLECTIONS[entityKind];
  if (!collectionName) {
    throw new functions.https.HttpsError('invalid-argument', `Unsupported entity kind: ${entityKind}`);
  }

  const entityRef = db.collection(collectionName).doc(entityId);
  let updatedRecord = null;

  await db.runTransaction(async (t) => {
    const snap = await t.get(entityRef);
    if (!snap.exists) {
      throw new functions.https.HttpsError('not-found', `${entityKind} not found.`);
    }

    const docData = snap.data();

    // Mechanics can only mark payments for bookings assigned to them
    if (isMechanic && !isAdmin) {
      if (collectionName !== 'bookings' || docData.mechanicId !== callerUid) {
        throw new functions.https.HttpsError('permission-denied', 'Mechanics may only record offline payments for bookings assigned to them.');
      }
    }

    const currentPaid = Number(docData.paidAmount || 0);
    const totalAmount = Number(docData.totalAmount || docData.totalPrice || (docData.fees && docData.fees.total) || docData.total || 0);
    const newPaidAmount = Number((currentPaid + amount).toFixed(2));
    const isFullyPaid = totalAmount > 0 ? newPaidAmount >= (totalAmount - 0.5) : true;
    const nowIso = new Date().toISOString();
    const offlineRef = `OFFLINE-${Date.now().toString().slice(-6)}`;

    const txRecord = {
      id: `tx_${Date.now()}_offline`,
      type: isFullyPaid ? 'balance' : 'downpayment',
      amount,
      method: paymentMethod,
      reference: offlineRef,
      note,
      recordedBy: callerUid,
      recordedByRole: isAdmin ? 'admin' : 'mechanic',
      paidAt: nowIso,
      status: 'completed'
    };

    const existingTxs = Array.isArray(docData.paymentTransactions) ? docData.paymentTransactions : [];
    const updatePayload = {
      paidAmount: newPaidAmount,
      remainingBalance: Math.max(0, Number((totalAmount - newPaidAmount).toFixed(2))),
      paymentStatus: isFullyPaid ? 'paid' : 'partial',
      isPaid: isFullyPaid,
      isVerified: true,
      paymentMethod,
      paymentTransactions: [...existingTxs, txRecord],
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    if (isFullyPaid) {
      updatePayload.balancePaid = true;
      updatePayload.balancePaidAt = nowIso;
      updatePayload.balancePaymentRef = offlineRef;
    } else {
      updatePayload.downpaymentPaidAt = nowIso;
      updatePayload.downpaymentRef = offlineRef;
      updatePayload.downpaymentAmount = amount;
    }

    t.update(entityRef, updatePayload);
    updatedRecord = Object.assign({}, docData, updatePayload);
  });

  return {
    success: true,
    entityKind,
    entityId,
    amount,
    paidAmount: updatedRecord.paidAmount,
    remainingBalance: updatedRecord.remainingBalance,
    isPaid: updatedRecord.isPaid,
    paymentStatus: updatedRecord.paymentStatus
  };
});

/**
 * Helper to build nodemailer transporter config from request parameters
 */
function createSmtpTransport(params) {
  const host = (params.host || params.Host || '').trim();
  const port = parseInt(params.port || params.Port || '587', 10);
  const encryption = (params.encryption || params.Encryption || '').toUpperCase();
  const username = (params.username || params.Username || '').trim();
  const password = params.password || params.Password || '';
  const authRequired = params.authRequired !== false && params.authRequired !== 'false';

  if (!host) {
    throw new Error('SMTP Host is required.');
  }
  if (!port || isNaN(port)) {
    throw new Error('Valid SMTP port is required.');
  }

  let isSecure = false;
  let requireTls = false;
  let ignoreTls = false;

  if (encryption === 'SSL/TLS' || port === 465) {
    isSecure = true;
  } else if (encryption === 'STARTTLS' || port === 587) {
    isSecure = false;
    requireTls = true;
  } else if (encryption === 'NONE' || port === 25) {
    isSecure = false;
    ignoreTls = true;
  }

  const transportOpts = {
    host,
    port,
    secure: isSecure,
    requireTLS: requireTls,
    ignoreTLS: ignoreTls,
    tls: {
      rejectUnauthorized: false
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000
  };

  if (authRequired && username) {
    transportOpts.auth = {
      user: username,
      pass: password
    };
  }

  return {
    transporter: nodemailer.createTransport(transportOpts),
    configDetails: {
      host,
      port,
      secure: isSecure,
      requireTLS: requireTls,
      encryption: isSecure ? 'SSL/TLS' : (requireTls ? 'STARTTLS' : 'None')
    }
  };
}

/**
 * Cloud Function for Real-Time SMTP Gateway
 */
exports.smtpHandler = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, error: 'Method Not Allowed. Use POST.' });
    }

    const startTime = Date.now();
    const payload = typeof req.body === 'object' && req.body !== null ? req.body : {};
    const action = (payload.action || payload.Action || 'verify').toLowerCase();

    try {
      const { transporter, configDetails } = createSmtpTransport(payload);

      if (action === 'verify' || action === 'test') {
        await transporter.verify();
        const latencyMs = Date.now() - startTime;

        return res.status(200).json({
          success: true,
          action: 'verify',
          message: `Successfully connected and authenticated with ${configDetails.host}:${configDetails.port}!`,
          latencyMs,
          details: `${configDetails.host} | Port: ${configDetails.port} | Protocol: ${configDetails.encryption} | Auth: Verified | Roundtrip: ${latencyMs}ms`
        });
      }

      if (action === 'send') {
        const from = (payload.from || payload.From || '').trim();
        const to = (payload.to || payload.To || '').trim();
        const subject = (payload.subject || payload.Subject || '').trim();
        const body = payload.body || payload.Body || payload.html || payload.Html || '';

        if (!to) {
          return res.status(400).json({ success: false, error: 'Recipient email address (To) is required.' });
        }
        if (!from) {
          return res.status(400).json({ success: false, error: 'Sender email address (From) is required.' });
        }

        const isHtml = typeof body === 'string' && (body.includes('<html') || body.includes('<body') || body.includes('<div') || body.includes('<!DOCTYPE html') || body.includes('<p'));

        const mailOptions = {
          from,
          to,
          subject: subject || 'RidersBUD Notification',
          [isHtml ? 'html' : 'text']: body
        };

        if (payload.replyTo) {
          mailOptions.replyTo = payload.replyTo;
        }

        const sendResult = await transporter.sendMail(mailOptions);
        const latencyMs = Date.now() - startTime;

        try {
          await admin.firestore().collection('smtpLogs').add({
            timestamp: new Date().toISOString(),
            recipient: to,
            sender: from,
            subject: mailOptions.subject,
            status: 'Accepted by SMTP Server',
            host: configDetails.host,
            port: configDetails.port,
            encryption: configDetails.encryption,
            serverResponse: sendResult.response || '250 OK',
            messageId: sendResult.messageId || '',
            latencyMs
          });
        } catch (dbErr) {
          console.warn('Could not write smtpLog entry:', dbErr);
        }

        return res.status(200).json({
          success: true,
          action: 'send',
          message: `Test email successfully submitted to and accepted by ${configDetails.host}:${configDetails.port}!`,
          latencyMs,
          messageId: sendResult.messageId,
          response: sendResult.response || '250 OK: Message accepted for delivery',
          details: `Accepted by server (${sendResult.response || '250 OK'}). Message ID: ${sendResult.messageId || 'N/A'}`
        });
      }

      return res.status(400).json({ success: false, error: `Invalid action: ${action}` });
    } catch (err) {
      const latencyMs = Date.now() - startTime;
      let errorMsg = err.message || 'SMTP operation failed.';

      if (err.code === 'EAUTH' || (err.responseCode && err.responseCode === 535)) {
        errorMsg = 'SMTP authentication failed. Please verify your SMTP Username and Password/App Secret.';
      } else if (err.code === 'ESOCKET' || err.code === 'ECONNRESET' || err.code === 'ECONNREFUSED') {
        errorMsg = `Cannot connect to SMTP server. Verify the SMTP server address, port, and that your server accepts connections (${err.code}).`;
      } else if (err.code === 'ETIMEDOUT') {
        errorMsg = 'Connection timed out. The SMTP server or port might be blocked by a firewall.';
      } else if (err.responseCode === 550) {
        errorMsg = `Sender or recipient rejected by SMTP server (${err.response || errorMsg}).`;
      }

      if (action === 'send' && payload.to) {
        try {
          await admin.firestore().collection('smtpLogs').add({
            timestamp: new Date().toISOString(),
            recipient: payload.to || 'Unknown',
            sender: payload.from || 'Unknown',
            subject: payload.subject || 'Unknown',
            status: 'Failed',
            host: payload.host || payload.Host || 'Unknown',
            port: payload.port || payload.Port || 'Unknown',
            serverResponse: err.response || '',
            errorMessage: errorMsg,
            latencyMs
          });
        } catch (dbErr) {
          console.warn('Could not write failed smtpLog entry:', dbErr);
        }
      }

      return res.status(200).json({
        success: false,
        action,
        error: errorMsg,
        rawError: err.message,
        code: err.code || err.responseCode || 'UNKNOWN',
        latencyMs
      });
    }
  });
});

/**
 * Payment Recovery Sweep (scheduled every 10 minutes)
 *
 * Safety net so a payment can never sit unsettled just because the customer
 * closed a tab, a webhook was delayed, or the client device went offline:
 *
 *  1. Finds `paymentTransactions` stuck in a non-terminal lifecycle state
 *     (INITIALIZING / CHECKOUT_OPEN / WAITING_FOR_PAYMENT / VERIFYING) whose
 *     last update is older than 10 minutes.
 *  2. Re-runs the authoritative settlement for each (HitPay API re-verification
 *     + idempotent PAID/FAILED/CANCELLED/EXPIRED write). Expired dead sessions
 *     are closed out as EXPIRED by the same path.
 *  3. Escalates "unmatched" transactions — still non-terminal after the sweep —
 *     to `adminNotifications` (type PAYMENT_SETTLEMENT_ESCALATION), deduped per
 *     transaction with a 6-hour cooldown and a 7-day age guard so historical
 *     junk is never re-notified.
 */
exports.paymentRecoverySweep = functions
  .runWith({ timeoutSeconds: 540, memory: '256MB' })
  .pubsub.schedule('every 10 minutes')
  .timeZone('Asia/Manila')
  .onRun(async (context) => {
    const db = admin.firestore();
    const ACTIVE_STATUSES = ['INITIALIZING', 'CHECKOUT_OPEN', 'WAITING_FOR_PAYMENT', 'VERIFYING'];
    const STUCK_AFTER_MS = 10 * 60 * 1000;
    const ESCALATION_COOLDOWN_MS = 6 * 60 * 60 * 1000;
    const ESCALATION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
    const MAX_DOCS_PER_RUN = 100;

    const cutoff = admin.firestore.Timestamp.fromMillis(Date.now() - STUCK_AFTER_MS);

    let snap;
    try {
      // Single-field index on `updatedAt` (auto-indexed) — newest stale docs
      // first; status is filtered in code to avoid a composite index.
      snap = await db.collection('paymentTransactions')
        .where('updatedAt', '<', cutoff)
        .orderBy('updatedAt', 'desc')
        .limit(MAX_DOCS_PER_RUN)
        .get();
    } catch (e) {
      console.error('[PaymentSweep] query failed:', e.message);
      return null;
    }

    let candidates = 0;
    let settledCount = 0;
    let escalatedCount = 0;
    let skippedRecent = 0;
    const outcomes = [];

    for (const doc of snap.docs) {
      const tx = doc.data() || {};
      const status = String(tx.status || '').toUpperCase();
      if (!ACTIVE_STATUSES.includes(status)) continue;

      // Recently verified by another path (webhook / client) — leave it alone.
      const lastVerifyMs = tx.lastVerificationAt && typeof tx.lastVerificationAt.toMillis === 'function'
        ? tx.lastVerificationAt.toMillis() : 0;
      if (lastVerifyMs && (Date.now() - lastVerifyMs) < 2 * 60 * 1000) {
        skippedRecent++;
        continue;
      }

      candidates++;
      let result = null;
      try {
        result = await settleTransaction({ transactionId: doc.id, trigger: 'scheduled-sweep' });
      } catch (e) {
        console.error(`[PaymentSweep] settlement error for ${doc.id}:`, e && e.message);
        result = { status: 'ERROR', reason: (e && e.message) || 'settlement error' };
      }

      const resultStatus = String((result && result.status) || '').toUpperCase();
      const settledNow = TERMINAL_STATUSES.includes(resultStatus);
      if (settledNow) settledCount++;
      outcomes.push(`${doc.id}:${status}->${resultStatus || 'NO_RESULT'}`);

      // --- Escalation for unmatched / still-unsettled transactions ---
      if (settledNow) continue;

      const createdMs = tx.createdAt && typeof tx.createdAt.toMillis === 'function' ? tx.createdAt.toMillis() : 0;
      if (createdMs && (Date.now() - createdMs) > ESCALATION_MAX_AGE_MS) continue; // historical junk — never notify

      const escalatedAtMs = tx.escalatedAt && typeof tx.escalatedAt.toMillis === 'function' ? tx.escalatedAt.toMillis() : 0;
      if (escalatedAtMs && (Date.now() - escalatedAtMs) < ESCALATION_COOLDOWN_MS) continue; // already escalated recently

      const reason = String(
        (result && (result.reason || result.verificationStatus || result.status)) || `stuck_in_${status}`
      ).slice(0, 200);

      try {
        await doc.ref.update({
          escalatedAt: admin.firestore.FieldValue.serverTimestamp(),
          escalationCount: (tx.escalationCount || 0) + 1,
          escalationReason: reason
        });
        await db.collection('adminNotifications').add({
          type: 'PAYMENT_SETTLEMENT_ESCALATION',
          recipientRole: 'admin',
          recipientId: 'admin',
          title: '⚠️ Payment needs manual review',
          message: `Transaction ${doc.id} (${tx.referenceNumber || 'no reference'}, ${tx.amount || '?'} ${tx.currency || 'PHP'}) is still ${status} after automatic re-verification. Reason: ${reason}`,
          transactionId: doc.id,
          referenceNumber: tx.referenceNumber || '',
          paymentRequestId: tx.paymentRequestId || '',
          entityKind: tx.entityKind || '',
          entityId: tx.entityId || '',
          amount: Number(tx.amount) || 0,
          currency: tx.currency || 'PHP',
          stuckStatus: status,
          escalationReason: reason,
          environment: tx.environment || 'production',
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        escalatedCount++;
      } catch (e) {
        console.error(`[PaymentSweep] escalation write failed for ${doc.id}:`, e && e.message);
      }
    }

    console.log(
      `[PaymentSweep] scanned=${snap.size} candidates=${candidates} settled=${settledCount} ` +
      `escalated=${escalatedCount} skippedRecent=${skippedRecent}` +
      (outcomes.length ? ` :: ${outcomes.slice(0, 20).join(', ')}` : '')
    );
    return null;
  });

/**
 * Daily Finance Email (scheduled every day at 08:00 Asia/Manila)
 *
 * Sends the finance/admin inbox a single digest of the trailing 24 hours:
 *  - settled payments (PAID, verified by webhook or authoritative re-verification)
 *  - expired sessions (customer never completed checkout — no money moved;
 *    customers can retry with a fresh session from their booking detail screen)
 *  - escalations (PENDING_REVIEW mismatches + sweep escalations needing action)
 *
 * Reuses the SMTP bridge configuration stored by Admin Settings (settings/main:
 * smtpHost / smtpPort / smtpEncryption / smtpUsername / smtpPassword / …) through
 * the same createSmtpTransport() helper the /api/smtp-bridge endpoint uses.
 * Skips silently (log only) when SMTP or a recipient is not configured so the
 * schedule never error-spams; every send is audited into admin-visible smtpLogs.
 */
exports.paymentDailyFinanceEmail = functions
  .runWith({ timeoutSeconds: 120, memory: '256MB' })
  .pubsub.schedule('every day 08:00')
  .timeZone('Asia/Manila')
  .onRun(async () => {
    const db = admin.firestore();

    // 1. Load SMTP configuration + recipient from Admin Settings.
    let settings = {};
    try {
      const settingsSnap = await db.collection('settings').doc('main').get();
      settings = settingsSnap.exists ? (settingsSnap.data() || {}) : {};
    } catch (e) {
      console.error('[FinanceEmail] failed to load settings/main:', e.message);
      return null;
    }

    const recipient = String(
      settings.contactEmail || settings.supportEmail || settings.smtpFromEmail || ''
    ).trim();

    if (!settings.smtpHost || !recipient) {
      console.log('[FinanceEmail] skipped — SMTP host or recipient not configured (settings/main).');
      return null;
    }

    // 2. Trailing 24h window.
    const windowEndMs = Date.now();
    const windowStartMs = windowEndMs - 24 * 60 * 60 * 1000;
    const startTs = admin.firestore.Timestamp.fromMillis(windowStartMs);

    // 3. Transactions touched in the window (single-field auto-index on updatedAt).
    let txs = [];
    try {
      const txSnap = await db.collection('paymentTransactions')
        .where('updatedAt', '>=', startTs)
        .limit(500)
        .get();
      txs = txSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.error('[FinanceEmail] paymentTransactions query failed:', e.message);
    }

    // 4. Escalation notifications created in the window.
    let escalations = [];
    try {
      const notifSnap = await db.collection('adminNotifications')
        .where('createdAt', '>=', startTs)
        .limit(200)
        .get();
      escalations = notifSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((n) => ['PAYMENT_MISMATCH_REVIEW', 'PAYMENT_SETTLEMENT_ESCALATION'].includes(String(n.type)));
    } catch (e) {
      console.warn('[FinanceEmail] adminNotifications query failed:', e.message);
    }

    // 5. Build the digest and send through the same transport the SMTP bridge uses.
    const monitorBaseUrl = String(HTTPS_RETURN_URL || 'https://ridersbud-10806.web.app/payment/return')
      .replace(/\/payment\/return.*$/, '') + '/admin-portal/payment-monitor';

    const summary = buildDailyFinanceSummary({
      txs,
      escalations,
      windowStartMs,
      windowEndMs,
      monitorBaseUrl
    });

    try {
      const { transporter, configDetails } = createSmtpTransport({
        host: settings.smtpHost,
        port: settings.smtpPort,
        encryption: settings.smtpEncryption,
        username: settings.smtpUsername,
        password: settings.smtpPassword,
        authRequired: settings.smtpAuthRequired !== false
      });

      const fromAddress = settings.smtpFromEmail || settings.smtpUsername;
      const from = settings.smtpFromName ? `"${settings.smtpFromName}" <${fromAddress}>` : fromAddress;

      const info = await transporter.sendMail({
        from,
        to: recipient,
        subject: summary.subject,
        html: summary.html,
        text: summary.text,
        replyTo: settings.smtpReplyTo || undefined
      });

      console.log(
        `[FinanceEmail] sent to ${recipient} :: settled=${summary.totals.settled.count} ` +
        `expired=${summary.totals.expired.count} escalated=${summary.totals.escalated.count} ` +
        `(${info.messageId || 'no id'}) via ${configDetails.host}:${configDetails.port}`
      );

      // Audit trail visible in Admin → Settings → SMTP (smtpLogs board).
      await db.collection('smtpLogs').add({
        timestamp: new Date().toISOString(),
        recipient,
        sender: from,
        subject: summary.subject,
        status: 'Accepted by SMTP Server',
        host: configDetails.host,
        port: configDetails.port,
        encryption: configDetails.encryption,
        serverResponse: info.response || '250 OK',
        messageId: info.messageId || '',
        source: 'paymentDailyFinanceEmail',
        totals: {
          settled: summary.totals.settled.count,
          expired: summary.totals.expired.count,
          escalated: summary.totals.escalated.count
        }
      }).catch((e) => console.warn('[FinanceEmail] smtpLogs write failed:', e.message));
    } catch (err) {
      console.error('[FinanceEmail] send failed:', err && err.message);
      try {
        await db.collection('smtpLogs').add({
          timestamp: new Date().toISOString(),
          recipient,
          sender: settings.smtpFromEmail || settings.smtpUsername || 'Unknown',
          subject: summary.subject,
          status: 'Failed',
          host: settings.smtpHost || 'Unknown',
          port: settings.smtpPort || 'Unknown',
          errorMessage: (err && err.message) || 'SMTP dispatch failed',
          source: 'paymentDailyFinanceEmail'
        });
      } catch (_) { /* logging must never throw */ }
    }

    return null;
  });
