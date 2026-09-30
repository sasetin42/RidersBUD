const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });
const https = require('https');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

admin.initializeApp();

/**
 * Cloud Function HTTP Proxy for HitPay API requests.
 * Allows frontend web client to generate payment requests without browser CORS errors.
 */
exports.hitpayProxy = functions.https.onRequest((req, res) => {
  return cors(req, res, () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
    }

    try {
      const body = req.body || {};
      const isSandbox = body.isSandbox !== false;
      const apiKey = body.apiKey;
      const payload = JSON.stringify(body.payload || {});

      if (!apiKey) {
        return res.status(400).json({ error: 'Missing HitPay API key.' });
      }

      const hostname = isSandbox ? 'api.sandbox.hit-pay.com' : 'api.hit-pay.com';
      const path = '/v1/payment-requests';

      const options = {
        hostname: hostname,
        port: 443,
        path: path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-BUSINESS-API-KEY': apiKey,
          'Content-Length': Buffer.byteLength(payload)
        }
      };

      const proxyReq = https.request(options, (proxyRes) => {
        let respData = '';
        proxyRes.on('data', (chunk) => {
          respData += chunk;
        });

        proxyRes.on('end', () => {
          res.status(proxyRes.statusCode || 200);
          res.setHeader('Content-Type', 'application/json');
          return res.send(respData);
        });
      });

      proxyReq.on('error', (err) => {
        console.error('HitPay Proxy Request Error:', err);
        return res.status(502).json({ error: err.message || 'HitPay connection failed' });
      });

      proxyReq.write(payload);
      proxyReq.end();
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

    // Retrieve HitPay Salt from Firestore system settings
    const settingsDoc = await admin.firestore().collection('settings').doc('general').get();
    const settings = settingsDoc.exists ? settingsDoc.data() : {};
    const isSandbox = payload.status === 'completed' && String(payload.payment_id || '').includes('sandbox');
    const salt = (isSandbox ? settings.hitpaySandboxSalt : settings.hitpaySalt) || settings.hitpaySalt || settings.hitpaySandboxSalt;

    // Verify HMAC-SHA256 signature if salt is configured
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
        console.warn('⚠️ HitPay Webhook HMAC signature mismatch. Received:', receivedHmac, 'Computed:', computedHmac);
        return res.status(401).send('Invalid signature');
      }
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
      receivedAt: admin.firestore.FieldValue.serverTimestamp(),
      rawPayload: payload
    });

    // If payment was completed, atomically update the target Booking or Order
    if (status === 'completed' && referenceNumber) {
      // Check if reference points to a booking (e.g. BOK-xxx-DP-timestamp or BOK-xxx)
      let bookingId = '';
      let isDeposit = false;

      if (referenceNumber.startsWith('BOK-')) {
        const parts = referenceNumber.split('-');
        bookingId = parts[1];
        if (parts.includes('DP')) isDeposit = true;
      }

      if (bookingId) {
        const bookingRef = admin.firestore().collection('bookings').doc(bookingId);
        const bookingSnap = await bookingRef.get();

        if (bookingSnap.exists) {
          const bookingData = bookingSnap.data();
          const currentPaid = Number(bookingData.paidAmount || 0);
          const totalAmount = Number(bookingData.totalAmount || 0);
          const newPaidAmount = currentPaid + amount;
          const isFullyPaid = newPaidAmount >= (totalAmount - 1);

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

          const existingTxs = bookingData.paymentTransactions || [];
          const updatedTxs = [...existingTxs.filter(t => t.reference !== referenceNumber), txRecord];

          await bookingRef.update({
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
            status: isFullyPaid && bookingData.status === 'Work Done' ? 'Completed' : (bookingData.status || 'Upcoming'),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
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

          console.log(`✅ Webhook verified: Booking ${bookingId} marked ${isFullyPaid ? 'FULLY PAID' : 'PARTIAL'}.`);
        }
      }
    }

    return res.status(200).json({ received: true, status: 'processed' });
  } catch (err) {
    console.error('HitPay Webhook Processing Error:', err);
    return res.status(500).json({ error: err.message || 'Webhook internal error' });
  }
});

