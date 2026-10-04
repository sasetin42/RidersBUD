const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const {
  WEBHOOK_URL,
  HTTPS_RETURN_URL,
  ENTITY_COLLECTIONS,
  resolveHitpayCredentials,
  resolveSalt,
  hitpayApi,
  fetchPaymentRequest,
  verifyWebhookSignature,
  deriveTransactionId,
  locateTransaction,
  settleTransaction,
  parseReferenceEntity
} = require('./lib/hitpay');

admin.initializeApp();

const TERMINAL_STATUSES = ['PAID', 'FAILED', 'CANCELLED', 'EXPIRED'];

/**
 * Cloud Function HTTP Proxy for HitPay API requests.
 * The client sends NO credentials — everything is resolved server-side.
 *
 * POST /hitpayProxy { isSandbox, transactionId?, referenceNumber, entityKind, entityId, payload }
 *     -> creates (or reuses) a HitPay payment request + paymentTransactions record
 * GET  /hitpayProxy?action=status&id=<payment_request_id>&sandbox=true
 *     -> authoritative HitPay payment-request status
 * GET  /hitpayProxy?action=transaction&id=<transactionId|payment_request_id>&ref=<reference>
 *     -> our paymentTransactions record
 * GET  /hitpayProxy?action=verify&id=<...>&sandbox=true
 *     -> re-verifies with HitPay and settles the transaction idempotently
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

        // --- status passthrough (server -> HitPay API) ---
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

        // --- our transaction record ---
        if (action === 'transaction') {
          const located = await locateTransaction({
            transactionId: String(req.query.id || ''),
            paymentRequestId: String(req.query.id || ''),
            referenceNumber: String(req.query.ref || req.query.id || '')
          });
          if (!located) return res.status(404).json({ error: 'transaction_not_found' });
          return res.status(200).json({ transactionId: located.id, ...located.data });
        }

        // --- authoritative re-verification + idempotent settlement ---
        if (action === 'verify') {
          const id = String(req.query.id || '');
          const ref = String(req.query.ref || '');
          if (!id && !ref) return res.status(400).json({ error: 'Use ?action=verify&id=<transaction|payment_request_id>&ref=<reference>' });
          const looksLikeTx = id.startsWith('tx_');
          const result = await settleTransaction({
            transactionId: looksLikeTx ? id : '',
            paymentRequestId: looksLikeTx ? '' : id,
            referenceNumber: ref,
            trigger: 'verify'
          });
          const body = { ok: true, result };
          if (result.transactionId) {
            const located = await locateTransaction({ transactionId: result.transactionId });
            if (located) body.transaction = { transactionId: located.id, ...located.data };
          }
          return res.status(200).json(body);
        }

        return res.status(400).json({ error: 'Unknown action. Use ?action=status|transaction|verify' });
      }

      // ----------------------------------------------------------------- POST --
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed. Use POST or GET?action=status.' });
      }

      const body = req.body || {};
      const rawPayload = body.payload || {};
      const entityKind = body.entityKind || rawPayload.entityKind || '';
      const entityId = body.entityId || rawPayload.entityId || '';

      // Authoritative price verification: look the amount up in Firestore
      if (entityKind && entityId) {
        const collectionName = ENTITY_COLLECTIONS[entityKind];
        if (collectionName) {
          try {
            const entitySnap = await admin.firestore().collection(collectionName).doc(entityId).get();
            if (entitySnap.exists) {
              const entityData = entitySnap.data() || {};
              const isDeposit = String(rawPayload.reference_number || '').includes('DP');
              let authoritativeAmount = 0;

              if (collectionName === 'bookings') {
                if (isDeposit) {
                  authoritativeAmount = Number(entityData.downpaymentAmount || (Number(entityData.totalAmount || 0) * 0.5));
                } else {
                  authoritativeAmount = Number(entityData.remainingBalance ?? (Number(entityData.totalAmount || 0) - Number(entityData.paidAmount || 0)));
                  if (authoritativeAmount <= 0) authoritativeAmount = Number(entityData.totalAmount || 0);
                }
              } else if (collectionName === 'orders') {
                authoritativeAmount = Number(entityData.total || entityData.totalAmount || 0);
              } else if (collectionName === 'rentalBookings') {
                if (isDeposit) {
                  authoritativeAmount = Number(entityData.downpaymentAmount || (Number(entityData.totalAmount || entityData.totalPrice || 0) * 0.5));
                } else {
                  authoritativeAmount = Number(entityData.remainingBalance ?? (Number(entityData.totalAmount || entityData.totalPrice || 0) - Number(entityData.paidAmount || 0)));
                  if (authoritativeAmount <= 0) authoritativeAmount = Number(entityData.totalAmount || entityData.totalPrice || 0);
                }
              } else {
                authoritativeAmount = Number(entityData.totalAmount || entityData.estimatedCost || 0);
              }

              if (authoritativeAmount > 0) {
                rawPayload.amount = Number(authoritativeAmount.toFixed(2));
                rawPayload.currency = rawPayload.currency || entityData.currency || 'PHP';
              }
            }
          } catch (lookupErr) {
            console.warn(`Firestore authoritative price lookup failed for ${entityKind}/${entityId}:`, lookupErr.message);
          }
        }
      }

      // --- Transaction identity (idempotency keys) ---
      const referenceNumber = String(rawPayload.reference_number || body.referenceNumber || `RB-${Date.now()}`);
      rawPayload.reference_number = referenceNumber;
      const transactionId = String(body.transactionId || '') || deriveTransactionId(referenceNumber, '');
      const txRef = admin.firestore().collection('paymentTransactions').doc(transactionId);

      // --- Reuse check: same reference must never spawn duplicate HitPay requests ---
      const existing = await locateTransaction({ transactionId, referenceNumber });
      if (existing && existing.id === transactionId && existing.data.referenceNumber === referenceNumber) {
        const ex = existing.data;
        if (ex.status === 'PAID') {
          return res.status(200).json({
            alreadyPaid: true,
            status: 'PAID',
            transactionId,
            referenceNumber,
            amount: ex.amount,
            currency: ex.currency,
            paymentRequestId: ex.paymentRequestId || ''
          });
        }
        const ageMs = Date.now() - ((ex.createdAt && ex.createdAt.toMillis) ? ex.createdAt.toMillis() : 0);
        const reusable = (ex.status === 'PENDING' || ex.status === 'INITIATED')
          && ex.paymentRequestId && ex.checkoutUrl
          && ageMs < 30 * 60 * 1000;
        if (reusable && body.force !== true) {
          return res.status(200).json({
            url: ex.checkoutUrl,
            id: ex.paymentRequestId,
            transactionId,
            status: ex.status,
            environment,
            referenceNumber,
            reused: true
          });
        }
      }

      // --- INITIATED record BEFORE the payment UI opens ---
      const baseTxRecord = {
        entityKind,
        entityId,
        bookingId: entityKind === 'booking' ? entityId : (body.bookingId || ''),
        orderId: entityKind === 'order' ? entityId : (body.orderId || ''),
        referenceNumber,
        amount: Number(rawPayload.amount || 0),
        currency: String(rawPayload.currency || 'PHP').toUpperCase(),
        kind: String(body.kind || ''),
        paymentMethod: String(rawPayload.payment_methods && rawPayload.payment_methods[0] ? rawPayload.payment_methods.join(',') : 'HitPay Online'),
        customerId: String(body.customerId || ''),
        customerName: String(rawPayload.name || ''),
        customerEmail: String(rawPayload.email || ''),
        customerPhone: String(rawPayload.phone || ''),
        environment,
        status: 'INITIATED',
        verificationStatus: 'UNVERIFIED',
        hitpayStatus: '',
        failureReason: '',
        cancelReason: '',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      await admin.firestore().runTransaction(async (t) => {
        const snap = await t.get(txRef);
        if (snap.exists) {
          const data = snap.data();
          if (TERMINAL_STATUSES.includes(data.status)) return; // never reset a terminal record
          t.update(txRef, Object.assign({}, baseTxRecord, {
            createdAt: data.createdAt || admin.firestore.FieldValue.serverTimestamp(),
            status: data.paymentRequestId ? data.status : 'INITIATED'
          }));
        } else {
          t.create(txRef, Object.assign({}, baseTxRecord, {
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          }));
        }
      });

      // --- Authoritative webhook + HTTPS return route ---
      rawPayload.webhook = WEBHOOK_URL;
      if (!rawPayload.redirect_url || !/^https?:\/\//i.test(rawPayload.redirect_url)) {
        // HitPay only accepts http(s) redirect URIs (validated against the live API):
        // custom schemes like ridersbud:// are rejected with 422.
        rawPayload.redirect_url = `${HTTPS_RETURN_URL}?tx=${encodeURIComponent(transactionId)}&ref=${encodeURIComponent(referenceNumber)}`;
      }

      const hostname = isSandbox ? 'api.sandbox.hit-pay.com' : 'api.hit-pay.com';
      const createRequest = async (payloadObj) => hitpayApi({
        isSandbox,
        apiKey: creds.apiKey,
        method: 'POST',
        path: '/v1/payment-requests',
        body: payloadObj
      });

      let result;
      try {
        result = await createRequest(rawPayload);
      } catch (err) {
        await txRef.update({ failureReason: err.message || 'HitPay connection failed', updatedAt: admin.firestore.FieldValue.serverTimestamp() }).catch(() => { });
        return res.status(200).json({ fallbackToPortal: true, reason: 'upstream_unreachable', error: err.message || 'HitPay connection failed' });
      }

      // One retry without a rejected redirect_url (defensive — scheme/URL validation)
      if (result.statusCode === 422 && result.json && result.json.errors && result.json.errors.redirect_url) {
        const retryPayload = Object.assign({}, rawPayload, { redirect_url: HTTPS_RETURN_URL });
        try {
          const retry = await createRequest(retryPayload);
          if (retry.statusCode >= 200 && retry.statusCode < 300) result = retry;
        } catch (_) { /* fall through to error handling below */ }
      }

      if (result.statusCode >= 200 && result.statusCode < 300 && result.json && (result.json.id || result.json.url)) {
        const pr = result.json;
        // PENDING after HitPay accepted the payment request
        await txRef.update({
          status: 'PENDING',
          paymentRequestId: String(pr.id || ''),
          checkoutUrl: String(pr.url || ''),
          hitpayStatus: String(pr.status || 'pending'),
          amount: Number(rawPayload.amount || pr.amount || 0),
          failureReason: '',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }).catch((e) => console.warn('tx PENDING update failed:', e.message));

        return res.status(200).json({
          url: pr.url,
          id: pr.id,
          transactionId,
          status: 'PENDING',
          environment,
          referenceNumber
        });
      }

      // HitPay rejected the request
      const errorDetail = result.json && result.json.errors
        ? Object.entries(result.json.errors).map(([k, v]) => `${k}: ${(v || []).join(', ')}`).join('; ')
        : ((result.json && (result.json.message || result.json.error)) || `HitPay returned HTTP ${result.statusCode}`);
      await txRef.update({
        status: 'FAILED',
        failureReason: String(errorDetail).slice(0, 500),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }).catch(() => { });

      return res.status(result.statusCode || 400).json(
        result.json || { message: errorDetail }
      );
    } catch (e) {
      console.error('HitPay Proxy General Error:', e);
      return res.status(500).json({ error: e.message || 'Internal proxy error' });
    }
  });
});

/**
 * Helper to build nodemailer transporter config from request parameters
 */
function createSmtpTransport(params) {
  const host = (params.host || params.Host || '').trim();
  const port = parseInt(params.port || params.Port || '587', 10);
  const encryption = (params.encryption || params.Encryption || '').toUpperCase(); // 'SSL/TLS' | 'STARTTLS' | 'NONE'
  const username = (params.username || params.Username || '').trim();
  const password = params.password || params.Password || '';
  const authRequired = params.authRequired !== false && params.authRequired !== 'false';

  if (!host) {
    throw new Error('SMTP Host is required.');
  }
  if (!port || isNaN(port)) {
    throw new Error('Valid SMTP port is required.');
  }

  // Determine secure (direct SSL/TLS) vs STARTTLS vs unencrypted
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
      rejectUnauthorized: false // allows self-signed / hosting provider certs
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
 * Handles:
 * 1. action: 'verify' -> Real TLS handshake and authentication test against the SMTP server
 * 2. action: 'send' -> Real email delivery with SMTP acceptance confirmation & logging to Firestore
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
        // Real SMTP handshake, EHLO, and AUTH verification
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

        // Log transaction to Firestore collection smtpLogs
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

      // Classify common SMTP errors cleanly
      if (err.code === 'EAUTH' || (err.responseCode && err.responseCode === 535)) {
        errorMsg = 'SMTP authentication failed. Please verify your SMTP Username and Password/App Secret.';
      } else if (err.code === 'ESOCKET' || err.code === 'ECONNRESET' || err.code === 'ECONNREFUSED') {
        errorMsg = `Cannot connect to SMTP server. Verify the SMTP server address, port, and that your server accepts connections (${err.code}).`;
      } else if (err.code === 'ETIMEDOUT') {
        errorMsg = 'Connection timed out. The SMTP server or port might be blocked by a firewall.';
      } else if (err.responseCode === 550) {
        errorMsg = `Sender or recipient rejected by SMTP server (${err.response || errorMsg}).`;
      }

      // Log failure to Firestore collection smtpLogs if sending failed
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
 * Authoritative HitPay Webhook Endpoint
 *
 * 1. Validates BOTH signature formats:
 *      - v2     `Hitpay-Signature` = HMAC-SHA256(raw JSON body, salt)  [current docs]
 *      - legacy `hmac` field/header = sorted key+value concatenation
 *    Signature validation is NEVER skipped — no salt or no match => 401/500.
 * 2. Environment (sandbox vs production) is resolved from the transaction record,
 *    never guessed from payload contents; salts never cross environments.
 * 3. Settlement is idempotent: `paymentRequestId` / `referenceNumber` /
 *    `transactionId` are the reconciliation keys, terminal states are immutable,
 *    and the entity update runs exactly once inside a Firestore transaction.
 * 4. The webhook alone does NOT mark anything PAID — settleTransaction() re-verifies
 *    the payment directly against the HitPay API first.
 */
exports.hitpayWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const headers = req.headers || {};
    const payload = (typeof req.body === 'object' && req.body !== null) ? req.body : {};

    // Raw body is required for the v2 signature (HMAC over exact bytes)
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

    // --- Resolve candidate salts (environment-aware, never mixed) ---
    let environment = '';
    let salts = [];

    if (paymentRequestId || referenceNumber) {
      try {
        const located = await locateTransaction({ paymentRequestId, referenceNumber });
        if (located && located.data.environment) {
          environment = located.data.environment;
          const salt = await resolveSalt(environment === 'sandbox');
          if (salt) salts = [salt];
        }
      } catch (e) {
        console.warn('transaction lookup for environment failed:', e.message);
      }
    }

    let sandboxSalt = '';
    let liveSalt = '';
    if (!salts.length) {
      sandboxSalt = await resolveSalt(true);
      liveSalt = await resolveSalt(false);
      salts = [sandboxSalt, liveSalt].filter(Boolean);
    }

    if (!salts.length) {
      console.error('HitPay webhook: no salt configured — refusing to process.');
      return res.status(500).json({ error: 'Webhook salt not configured' });
    }

    const verdict = verifyWebhookSignature({ rawBody, payload, headers, salts });
    if (!verdict.valid) {
      console.warn('HitPay webhook: signature validation failed. Header present:', !!(headers['hitpay-signature'] || headers['hmac'] || payload.hmac));
      return res.status(401).send('Invalid signature');
    }

    if (!environment && verdict.salt) {
      if (!sandboxSalt) sandboxSalt = await resolveSalt(true);
      if (!liveSalt) liveSalt = await resolveSalt(false);
      environment = verdict.salt === sandboxSalt ? 'sandbox' : verdict.salt === liveSalt ? 'production' : '';
    }

    console.log(`HitPay webhook [${reportedStatus}] ref=${referenceNumber} pr=${paymentRequestId} env=${environment || 'unknown'} sig=${verdict.mode}`);

    // --- Idempotent settlement (webhook payload alone never marks PAID) ---
    let result;
    try {
      result = await settleTransaction({
        paymentRequestId,
        referenceNumber,
        webhookPayload: payload,
        trigger: 'webhook'
      });
    } catch (settleErr) {
      console.error('HitPay webhook settlement error:', settleErr);
      // 500 => HitPay retries; settlement is idempotent so a retry is safe.
      return res.status(500).json({ error: settleErr.message || 'settlement failed' });
    }

    // --- Audit log (deterministic id + attempt counter => duplicate-safe) ---
    try {
      const paymentId = payload.payment_id || '';
      const logId = paymentRequestId ||
        (paymentId ? `pid_${String(paymentId).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40)}` : '') ||
        `wp_${crypto.createHash('sha1').update(JSON.stringify(payload)).digest('hex').slice(0, 24)}`;
      const logRef = admin.firestore().collection('paymentWebhookLogs').doc(logId);
      await admin.firestore().runTransaction(async (t) => {
        const snap = await t.get(logRef);
        const common = {
          paymentId,
          paymentRequestId,
          referenceNumber,
          status: reportedStatus || 'unknown',
          amount: Number(payload.amount || 0),
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
            receivedAt: admin.firestore.FieldValue.serverTimestamp()
          }));
        }
      });
    } catch (logErr) {
      console.warn('webhook audit log write failed:', logErr.message);
    }

    if (result.status === 'UNMATCHED' || result.status === 'NOT_FOUND') {
      return res.status(200).json({ received: true, status: 'unmatched', reason: result.reason || '' });
    }

    return res.status(200).json({
      received: true,
      status: result.status,
      alreadySettled: result.alreadySettled === true,
      verificationStatus: result.verificationStatus || '',
      transactionId: result.transactionId || ''
    });
  } catch (err) {
    console.error('HitPay Webhook Processing Error:', err);
    return res.status(500).json({ error: err.message || 'Webhook internal error' });
  }
});
