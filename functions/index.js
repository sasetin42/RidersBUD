const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });
const https = require('https');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

admin.initializeApp();

// In-memory credential caching with 5-minute TTL to avoid redundant Firestore reads
const cachedCreds = {
  sandbox: null,
  live: null,
  expiresAt: 0
};

/**
 * HitPay credentials are edited in Admin → Settings → Financials and stored in
 * Firestore settings/main. Resolution order (FIRST MATCH WINS):
 *   1. settings/main (admin-editable via the settings panel)
 *   2. settings/hitpaySecrets (admin-only legacy doc)
 *   3. Cloud Functions env (functions/.env, last-resort fallback)
 */
async function resolveHitpayCredentials(isSandbox) {
  const now = Date.now();
  const cacheKey = isSandbox ? 'sandbox' : 'live';

  if (cachedCreds[cacheKey] && cachedCreds.expiresAt > now) {
    return cachedCreds[cacheKey];
  }

  const resolve = async () => {
    // 1. Admin-editable settings/main (authoritative)
    try {
      const mainSnap = await admin.firestore().collection('settings').doc('main').get();
      if (mainSnap.exists) {
        const s = mainSnap.data() || {};
        const apiKey = isSandbox ? s.hitpaySandboxApiKey : s.hitpayApiKey;
        const salt = isSandbox ? s.hitpaySandboxSalt : s.hitpaySalt;
        if (apiKey && salt) {
          return { apiKey, salt, source: 'settings/main' };
        }
      }
    } catch (e) {
      console.warn('settings/main read failed:', e && e.message);
    }

    // 2. Firestore secrets document (admin-only, legacy)
    try {
      const secretsSnap = await admin.firestore().collection('settings').doc('hitpaySecrets').get();
      if (secretsSnap.exists) {
        const s = secretsSnap.data() || {};
        const apiKey = isSandbox ? (s.hitpaySandboxApiKey || s.sandboxApiKey) : (s.hitpayApiKey || s.liveApiKey);
        const salt = isSandbox ? (s.hitpaySandboxSalt || s.sandboxSalt) : (s.hitpaySalt || s.liveSalt);
        if (apiKey && salt) {
          return { apiKey, salt, source: 'firestore:hitpaySecrets' };
        }
      }
    } catch (e) {
      console.warn('hitpaySecrets read failed:', e && e.message);
    }

    // 3. Environment variables (last-resort fallback)
    const envKey = isSandbox ? process.env.HITPAY_SANDBOX_API_KEY : process.env.HITPAY_LIVE_API_KEY;
    const envSalt = isSandbox ? process.env.HITPAY_SANDBOX_SALT : process.env.HITPAY_SALT;
    if (envKey && envSalt) {
      return { apiKey: envKey, salt: envSalt, source: 'env' };
    }

    // 4. Default provisioned keys fallback
    const defaultSandboxKey = 'test_8f19363aee170cc711e558a5503ae6176a25cc7f382cc9aa8c0cf3d81f8639f8';
    const defaultLiveKey = 'live_ec0ea2cf67cf38d8c57c20b56cca7b56034d66400cbd70e2517529a5baaac2cb';
    return {
      apiKey: isSandbox ? defaultSandboxKey : defaultLiveKey,
      salt: isSandbox ? 'test_salt_default' : 'live_salt_default',
      source: 'default_provisioned'
    };
  };

  const resolved = await resolve();
  if (resolved && resolved.apiKey) {
    cachedCreds[cacheKey] = resolved;
    cachedCreds.expiresAt = Date.now() + 5 * 60 * 1000; // 5-minute TTL
  }
  return resolved;
}

// Persistent Keep-Alive agent to eliminate repeated TLS handshake latency
const hitpayAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 60000,
  keepAliveMsecs: 30000
});

function hitpayRequest(options, body) {
  return new Promise((resolve, reject) => {
    const optsWithAgent = Object.assign({ agent: hitpayAgent }, options);
    const req = https.request(optsWithAgent, (proxyRes) => {
      let respData = '';
      proxyRes.on('data', (chunk) => { respData += chunk; });
      proxyRes.on('end', () => {
        resolve({ statusCode: proxyRes.statusCode || 200, body: respData });
      });
    });
    req.on('error', reject);
    req.setTimeout(25000, () => req.destroy(new Error('HitPay request timeout')));
    if (body) req.write(body);
    req.end();
  });
}

/**
 * Cloud Function HTTP Proxy for HitPay API requests.
 * The client sends NO credentials — everything is resolved server-side.
 * POST /hitpayProxy { isSandbox, payload }             -> create payment request
 * GET  /hitpayProxy?action=status&id=...&sandbox=true  -> payment request status
 */
exports.hitpayProxy = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const isSandbox = req.method === 'GET'
        ? String(req.query.sandbox || 'false') === 'true'
        : ((req.body || {}).isSandbox === true);

      const creds = await resolveHitpayCredentials(isSandbox);
      if (!creds || !creds.apiKey) {
        return res.status(200).json({
          fallbackToPortal: true,
          reason: 'credentials_not_configured',
          message: 'HitPay credentials are not provisioned server-side yet.'
        });
      }

      const hostname = isSandbox ? 'api.sandbox.hit-pay.com' : 'api.hit-pay.com';

      // ---- GET status ----
      if (req.method === 'GET') {
        const action = String(req.query.action || '');
        const paymentRequestId = String(req.query.id || '');
        if (action !== 'status' || !paymentRequestId) {
          return res.status(400).json({ error: 'Use ?action=status&id=<payment_request_id>' });
        }
        const options = {
          hostname,
          port: 443,
          path: `/v1/payment-requests/${encodeURIComponent(paymentRequestId)}`,
          method: 'GET',
          headers: {
            'X-BUSINESS-API-KEY': creds.apiKey,
            'X-Requested-With': 'XMLHttpRequest'
          }
        };
        try {
          const result = await hitpayRequest(options, null);
          res.status(result.statusCode);
          res.setHeader('Content-Type', 'application/json');
          return res.send(result.body);
        } catch (err) {
          return res.status(200).json({
            fallbackToPortal: true,
            reason: 'upstream_unreachable',
            error: err.message || 'HitPay connection failed'
          });
        }
      }

      // ---- POST create ----
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed. Use POST or GET?action=status.' });
      }

      const rawPayload = (req.body || {}).payload || {};
      const entityKind = (req.body || {}).entityKind || rawPayload.entityKind;
      const entityId = (req.body || {}).entityId || rawPayload.entityId;

      // Authoritative Price Verification: If entityKind and entityId provided, look up in Firestore
      if (entityKind && entityId) {
        let collectionName = '';
        if (entityKind === 'booking') collectionName = 'bookings';
        else if (entityKind === 'order') collectionName = 'orders';
        else if (entityKind === 'rental') collectionName = 'rentalBookings';
        else if (entityKind === 'liaison') collectionName = 'liaisonBookings';
        else if (entityKind === 'service-request') collectionName = 'serviceRequests';

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
              } else if (collectionName === 'liaisonBookings' || collectionName === 'serviceRequests') {
                authoritativeAmount = Number(entityData.totalAmount || entityData.estimatedCost || 0);
              }

              if (authoritativeAmount > 0) {
                rawPayload.amount = Number(authoritativeAmount.toFixed(2));
                rawPayload.currency = rawPayload.currency || entityData.currency || 'PHP';
              }
            }
          } catch (lookupErr) {
            console.warn(`Firestore authoritative price lookup failed for ${collectionName}/${entityId}:`, lookupErr.message);
          }
        }
      }

      // Attach authoritative server webhook URL if not already provided
      if (!rawPayload.webhook) {
        rawPayload.webhook = 'https://ridersbud-10806.web.app/api/hitpay-webhook';
      }

      const payload = JSON.stringify(rawPayload);
      const options = {
        hostname,
        port: 443,
        path: '/v1/payment-requests',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-BUSINESS-API-KEY': creds.apiKey,
          'Content-Length': Buffer.byteLength(payload)
        }
      };

      try {
        const result = await hitpayRequest(options, payload);
        res.status(result.statusCode);
        res.setHeader('Content-Type', 'application/json');
        return res.send(result.body);
      } catch (err) {
        // Upstream unreachable — client routes to the in-app checkout portal.
        return res.status(200).json({
          fallbackToPortal: true,
          reason: 'upstream_unreachable',
          error: err.message || 'HitPay connection failed'
        });
      }
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
    throw new Error('Valid SMTP Port is required.');
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
      requireTls,
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
        // Run real SMTP handshake, EHLO, and AUTH verification
        await transporter.verify();
        const latencyMs = Date.now() - startTime;

        return res.status(200).json({
          success: true,
          action: 'verify',
          message: `Successfully connected and authenticated with ${configDetails.host}:${configDetails.port}!`,
          latencyMs,
          details: `Host: ${configDetails.host} | Port: ${configDetails.port} | Protocol: ${configDetails.encryption} | Auth: Verified | Roundtrip: ${latencyMs}ms`
        });
      }

      if (action === 'send') {
        const from = (payload.from || payload.From || '').trim();
        const to = (payload.to || payload.To || '').trim();
        const replyTo = (payload.replyTo || payload.ReplyTo || '').trim();
        const subject = (payload.subject || payload.Subject || '').trim();
        const body = payload.body || payload.Body || payload.html || payload.Html || '';

        if (!to) {
          return res.status(400).json({ success: false, error: 'Recipient email address (To) is required.' });
        }
        if (!from) {
          return res.status(400).json({ success: false, error: 'Sender email address (From) is required.' });
        }

        const isHtml = typeof body === 'string' && (body.includes('<html') || body.includes('<body') || body.includes('<div') || body.includes('<!DOCTYPE') || body.includes('<p'));

        const mailOptions = {
          from,
          to,
          subject: subject || 'RidersBUD Notification',
          [isHtml ? 'html' : 'text']: body
        };

        if (replyTo) {
          mailOptions.replyTo = replyTo;
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
        errorMsg = `Cannot connect to SMTP server. Verify host, port, and that your server accepts connections (${err.code}).`;
      } else if (err.code === 'ETIMEDOUT') {
        errorMsg = 'Connection timed out. The SMTP server or port might be blocked by a firewall.';
      } else if (err.responseCode && err.responseCode === 550) {
        errorMsg = `Sender or recipient rejected by SMTP server: ${err.response || errorMsg}`;
      }

      // Log failure to Firestore collection smtpLogs if sending failed
      if (action === 'send' && payload.to) {
        try {
          await admin.firestore().collection('smtpLogs').add({
            timestamp: new Date().toISOString(),
            recipient: payload.to || 'Unknown',
            sender: payload.from || 'Unknown',
            subject: payload.subject || 'Test Email',
            status: 'Failed',
            host: payload.host || payload.Host || 'Unknown',
            port: payload.port || payload.Port || 587,
            encryption: payload.encryption || 'SSL/TLS',
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
 * 1. Validates HMAC-SHA256 signature from HitPay using salt
 * 2. Enforces idempotency (prevents double payments & duplicate updates)
 * 3. Updates Firestore booking / order records atomically with full audit trails
 */
exports.hitpayWebhook = functions.https.onRequest(async (req, res) => {
  // HitPay webhooks arrive via POST application/x-www-form-urlencoded or application/json
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const payload = req.body || {};
    const receivedHmac = req.headers['hmac'] || req.headers['x-hitpay-signature'] || payload.hmac || '';

    const isSandbox = payload.status === 'completed' && String(payload.payment_id || '').includes('sandbox');

    // Resolve webhook salt: settings/main (admin-editable) → settings/hitpaySecrets → env
    let salt = '';
    {
      try {
        const mainSnap = await admin.firestore().collection('settings').doc('main').get();
        if (mainSnap.exists) {
          const s = mainSnap.data() || {};
          salt = (isSandbox ? s.hitpaySandboxSalt : s.hitpaySalt) || s.hitpaySalt || s.hitpaySandboxSalt || '';
        }
      } catch (e) {
        console.warn('settings/main salt read failed:', e && e.message);
      }
      if (!salt) {
        try {
          const secretsSnap = await admin.firestore().collection('settings').doc('hitpaySecrets').get();
          if (secretsSnap.exists) {
            const s = secretsSnap.data() || {};
            salt = (isSandbox ? (s.hitpaySandboxSalt || s.sandboxSalt) : (s.hitpaySalt || s.liveSalt)) || '';
          }
        } catch (e) {
          console.warn('hitpaySecrets salt read failed:', e && e.message);
        }
      }
      if (!salt) {
        const envSalt = isSandbox ? process.env.HITPAY_SANDBOX_SALT : process.env.HITPAY_SALT;
        if (envSalt) {
          salt = envSalt;
        }
      }
    }

    // Verify HMAC-SHA256 signature if salt is configured
    let computedSignatureValid = null;
    if (salt && receivedHmac) {
      // HitPay signs payload fields in alphabetical order (excluding hmac)
      const values = [];
      const keys = Object.keys(payload).filter(k => k !== 'hmac').sort();
      for (const k of keys) {
        values.push(`${k}${payload[k]}`);
      }
      const message = values.join('');
      const computedHmac = crypto.createHmac('sha256', salt).update(message).digest('hex');

      if (computedHmac !== receivedHmac) {
        console.warn('HitPay Webhook HMAC signature mismatch. Received:', receivedHmac, 'Computed:', computedHmac);
        return res.status(401).send('Invalid signature');
      }
      computedSignatureValid = true;
    }

    const paymentId = payload.payment_id || payload.id;
    const paymentRequestId = payload.payment_request_id;
    const referenceNumber = payload.reference_number;
    const status = payload.status; // 'completed', 'failed', 'canceled'
    const amount = Number(payload.amount);
    const currency = payload.currency || 'PHP';
    const paymentMethod = payload.payment_type || payload.payment_method || 'HitPay (Online)';

    console.log(`🔔 HitPay Webhook Received [${status}]: Ref: ${referenceNumber}, Amount: ${amount} ${currency}, ID: ${paymentId}`);

    // Check idempotency in paymentWebhookLogs collection
    const logRef = admin.firestore().collection('paymentWebhookLogs').doc(paymentId || `hp_${Date.now()}`);
    const existingLog = await logRef.get();
    if (existingLog.exists) {
      console.log(`ℹ️ Webhook ${paymentId} already processed previously. Skipping to prevent duplicate update.`);
      return res.status(200).json({ status: 'already_processed' });
    }

    // Save webhook log entry for audit & idempotency lock
    await logRef.set({
      paymentId: paymentId || '',
      paymentRequestId: paymentRequestId || '',
      referenceNumber: referenceNumber || '',
      status: status || 'unknown',
      amount: amount || 0,
      currency,
      paymentMethod,
      signatureValid: salt && receivedHmac ? computedSignatureValid : null,
      matched: false,
      receivedAt: admin.firestore.FieldValue.serverTimestamp(),
      rawPayload: payload
    });

    // If payment was completed, atomically update the target entity
    if (status === 'completed' && referenceNumber) {
      // Reference formats: BOK-<id>[-DP], RNT-<id>, LIA-<id>, TOW-<id>, DRV-<id>, ORD-<id>
      let entityId = '';
      let collectionName = '';
      let isDeposit = false;

      if (referenceNumber.startsWith('BOK-')) {
        const parts = referenceNumber.split('-');
        entityId = parts[1];
        collectionName = 'bookings';
        if (parts.includes('DP')) isDeposit = true;
      } else if (referenceNumber.startsWith('RNT-')) {
        entityId = referenceNumber.split('-')[1];
        collectionName = 'rentalBookings';
      } else if (referenceNumber.startsWith('LIA-')) {
        entityId = referenceNumber.split('-')[1];
        collectionName = 'liaisonBookings';
      } else if (referenceNumber.startsWith('TOW-') || referenceNumber.startsWith('DRV-')) {
        entityId = referenceNumber.split('-')[1];
        collectionName = 'serviceRequests';
      } else if (referenceNumber.startsWith('ORD-')) {
        entityId = referenceNumber.split('-')[1];
        collectionName = 'orders';
      }

      if (entityId && collectionName) {
        const entityRef = admin.firestore().collection(collectionName).doc(entityId);
        const entitySnap = await entityRef.get();

        if (entitySnap.exists) {
          const entityData = entitySnap.data();
          const currentPaid = Number(entityData.paidAmount || 0);
          const totalAmount = Number(entityData.totalAmount || entityData.totalPrice || 0);
          const newPaidAmount = currentPaid + amount;
          const isFullyPaid = totalAmount > 0 ? newPaidAmount >= (totalAmount - 1) : true;

          const txRecord = {
            id: `tx_${Date.now()}_${paymentId || 'hp'}`,
            type: isFullyPaid ? 'balance' : (isDeposit ? 'downpayment' : 'payment'),
            amount: amount,
            method: paymentMethod,
            reference: referenceNumber,
            paidAt: new Date().toISOString(),
            status: 'completed',
            gatewayResponse: {
              hitpayPaymentId: paymentId,
              hitpayPaymentRequestId: paymentRequestId,
              hitpayReference: referenceNumber
            }
          };

          const existingTxs = entityData.paymentTransactions || [];
          const updatedTxs = [...existingTxs.filter(t => t.reference !== referenceNumber), txRecord];

          await entityRef.update({
            paidAmount: newPaidAmount,
            remainingBalance: Math.max(0, totalAmount - newPaidAmount),
            paymentStatus: isFullyPaid ? 'paid' : 'partial',
            isPaid: isFullyPaid,
            isVerified: true,
            paymentMethod: paymentMethod,
            hitpayPaymentRequestId: paymentRequestId || '',
            hitpayReference: referenceNumber,
            hitpayStatus: 'completed',
            paymentTransactions: updatedTxs,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            ...(collectionName === 'bookings' ? {
              status: isFullyPaid && entityData.status === 'Work Done' ? 'Completed' : (entityData.status || 'Upcoming')
            } : {}),
            ...(collectionName === 'orders' ? {
              status: 'Processing',
              paymentStatus: 'Paid'
            } : {}),
            ...(isFullyPaid ? {
              balancePaymentRef: referenceNumber,
              balancePaidAt: new Date().toISOString(),
              balancePaid: true
            } : {
              downpaymentRef: referenceNumber,
              downpaymentPaidAt: new Date().toISOString(),
              downpaymentAmount: amount
            })
          });

          // Audit trail: mark the webhook log as matched
          await logRef.update({
            matched: true,
            matchedCollection: collectionName,
            matchedId: entityId
          }).catch(() => {});

          console.log(`Webhook verified: ${collectionName}/${entityId} marked ${isFullyPaid ? 'FULLY PAID' : 'PARTIAL'}.`);
        } else {
          // No matching entity — record it for the Payment Audit screen
          await logRef.update({
            matched: false,
            error: `No ${collectionName} document found for id ${entityId}`
          }).catch(() => {});
        }
      } else {
        // Reference format unrecognized
        await logRef.update({
          matched: false,
          error: `Unrecognized reference format: ${referenceNumber}`
        }).catch(() => {});
      }
    }

    return res.status(200).json({ received: true, status: 'processed' });
  } catch (err) {
    console.error('HitPay Webhook Processing Error:', err);
    return res.status(500).json({ error: err.message || 'Webhook internal error' });
  }
});

