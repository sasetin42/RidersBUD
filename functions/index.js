const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });
const https = require('https');

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
