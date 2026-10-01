import path from 'path';
import https from 'https';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3001,
      host: '0.0.0.0',
      strictPort: false,
      hmr: true,
      allowedHosts: true,
      watch: {
        ignored: ['**/android/**', '**/dist/**', '**/*.zip', '**/*.apk', '**/.*/**', '**/*.log'],
      },
      headers: {
        'Cross-Origin-Opener-Policy': 'unsafe-none',
        'Cross-Origin-Embedder-Policy': 'unsafe-none',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      }
    },
    plugins: [
      react(),
      {
        name: 'native-smtp-bridge-and-cache-control',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            // Remove headers that trigger 304 Not Modified cache validation
            delete req.headers['if-none-match'];
            delete req.headers['if-modified-since'];
            next();
          });

          // Native Node.js SMTP bridge to securely connect and test SMTP credentials
          server.middlewares.use(async (req, res, next) => {
            if (req.url?.startsWith('/api/smtp-bridge') && req.method === 'POST') {
              let rawBody = '';
              req.on('data', chunk => { rawBody += chunk; });
              req.on('end', async () => {
                const startTime = Date.now();
                try {
                  const nodemailer = await import('nodemailer');

                  let params: any = {};
                  if (req.headers['content-type']?.includes('application/json')) {
                    params = JSON.parse(rawBody || '{}');
                  } else {
                    const search = new URLSearchParams(rawBody);
                    search.forEach((val, key) => { params[key] = val; });
                  }

                  const host = (params.Host || params.host || '').trim();
                  const port = Number(params.Port || params.port) || 587;
                  const encryption = (params.Encryption || params.encryption || '').toUpperCase();
                  const username = (params.Username || params.username || '').trim();
                  const password = (params.Password || params.password || '').trim();
                  const authRequired = params.authRequired !== false && params.authRequired !== 'false';
                  const action = (params.Action || params.action || 'verify').toLowerCase();

                  if (!host) {
                    res.statusCode = 400;
                    res.setHeader('Content-Type', 'application/json');
                    return res.end(JSON.stringify({ success: false, error: 'SMTP Host is required.' }));
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

                  const transportOpts: any = {
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

                  const transporter = nodemailer.createTransport(transportOpts);

                  if (action === 'verify' || action === 'test') {
                    await transporter.verify();
                    const latencyMs = Date.now() - startTime;
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    return res.end(JSON.stringify({
                      success: true,
                      action: 'verify',
                      message: `Successfully connected and authenticated with ${host}:${port}!`,
                      latencyMs,
                      details: `Host: ${host} | Port: ${port} | Protocol: ${isSecure ? 'SSL/TLS' : (requireTls ? 'STARTTLS' : 'None')} | Auth: Verified | Roundtrip: ${latencyMs}ms`
                    }));
                  }

                  if (action === 'send') {
                    const from = (params.From || params.from || username).trim();
                    const to = (params.To || params.to || username).trim();
                    const replyTo = (params.ReplyTo || params.replyTo || '').trim();
                    const subject = params.Subject || params.subject || 'Test Email from RidersBUD';
                    const body = params.Body || params.body || params.html || params.Html || 'This is a test email to verify your SMTP settings.';

                    if (!to) {
                      res.statusCode = 400;
                      res.setHeader('Content-Type', 'application/json');
                      return res.end(JSON.stringify({ success: false, error: 'Recipient email address (To) is required.' }));
                    }

                    const isHtml = typeof body === 'string' && (body.includes('<html') || body.includes('<body') || body.includes('<div') || body.includes('<!DOCTYPE') || body.includes('<p'));

                    const mailOptions: any = {
                      from,
                      to,
                      subject,
                      [isHtml ? 'html' : 'text']: body
                    };

                    if (replyTo) {
                      mailOptions.replyTo = replyTo;
                    }

                    const sendResult = await transporter.sendMail(mailOptions);
                    const latencyMs = Date.now() - startTime;

                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    return res.end(JSON.stringify({
                      success: true,
                      action: 'send',
                      message: `Test email successfully submitted to and accepted by ${host}:${port}!`,
                      latencyMs,
                      messageId: sendResult.messageId,
                      response: sendResult.response || '250 OK: Message accepted for delivery',
                      details: `Accepted by server (${sendResult.response || '250 OK'}). Message ID: ${sendResult.messageId || 'N/A'}`
                    }));
                  }

                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  return res.end(JSON.stringify({ success: false, error: `Invalid action: ${action}` }));

                } catch (error: any) {
                  const latencyMs = Date.now() - startTime;
                  let errorMsg = error?.message || 'SMTP operation failed.';

                  if (error.code === 'EAUTH' || (error.responseCode && error.responseCode === 535)) {
                    errorMsg = 'SMTP authentication failed. Please verify your SMTP Username and Password/App Secret.';
                  } else if (error.code === 'ESOCKET' || error.code === 'ECONNRESET' || error.code === 'ECONNREFUSED') {
                    errorMsg = `Cannot connect to SMTP server. Verify host, port, and that your server accepts connections (${error.code}).`;
                  } else if (error.code === 'ETIMEDOUT') {
                    errorMsg = 'Connection timed out. The SMTP server or port might be blocked by a firewall.';
                  } else if (error.responseCode && error.responseCode === 550) {
                    errorMsg = `Sender or recipient rejected by SMTP server: ${error.response || errorMsg}`;
                  }

                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  return res.end(JSON.stringify({
                    success: false,
                    error: errorMsg,
                    rawError: error.message,
                    code: error.code || error.responseCode || 'UNKNOWN',
                    latencyMs
                  }));
                }
              });
              return;
            }
            next();
          });


          // Native Node.js HitPay Payment Gateway Proxy to bypass CORS during development
          const hitpayDevAgent = new https.Agent({
            keepAlive: true,
            maxSockets: 50,
            maxFreeSockets: 10,
            timeout: 60000,
            keepAliveMsecs: 30000
          });

          server.middlewares.use(async (req, res, next) => {
              if (req.url?.startsWith('/api/hitpay-proxy')) {
                // Support GET /api/hitpay-proxy?action=status&id=...
                if (req.method === 'GET') {
                  const urlObj = new URL(req.url, 'http://localhost');
                  const id = urlObj.searchParams.get('id');
                  const isSandbox = urlObj.searchParams.get('sandbox') === 'true';
                  const defaultSandboxKey = 'test_8f19363aee170cc711e558a5503ae6176a25cc7f382cc9aa8c0cf3d81f8639f8';
                  const defaultLiveKey = 'live_ec0ea2cf67cf38d8c57c20b56cca7b56034d66400cbd70e2517529a5baaac2cb';
                  const apiKey = req.headers['x-business-api-key'] || (isSandbox ? defaultSandboxKey : defaultLiveKey);

                  if (!id) {
                    res.statusCode = 400;
                    res.setHeader('Content-Type', 'application/json');
                    return res.end(JSON.stringify({ error: 'Missing payment request ID' }));
                  }

                  const hostname = isSandbox ? 'api.sandbox.hit-pay.com' : 'api.hit-pay.com';
                  const proxyReq = https.request({
                    hostname,
                    path: `/v1/payment-requests/${encodeURIComponent(id)}`,
                    method: 'GET',
                    agent: false,
                    headers: {
                      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                      'X-Requested-With': 'XMLHttpRequest',
                      'X-BUSINESS-API-KEY': apiKey as string
                    }
                  }, (proxyRes) => {
                    let respBody = '';
                    proxyRes.on('data', chunk => { respBody += chunk; });
                    proxyRes.on('end', () => {
                      res.statusCode = proxyRes.statusCode || 200;
                      res.setHeader('Content-Type', 'application/json');
                      res.end(respBody);
                    });
                  });
                  proxyReq.on('error', (e) => {
                    res.statusCode = 502;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: e.message || 'HitPay connection error' }));
                  });
                  proxyReq.end();
                  return;
                }

                if (req.method === 'POST') {
                  let rawBody = '';
                  req.on('data', chunk => { rawBody += chunk; });
                  req.on('end', async () => {
                    try {
                      const parsed = JSON.parse(rawBody || '{}');
                      const isSandbox = parsed.isSandbox === true;
                      const defaultSandboxKey = 'test_8f19363aee170cc711e558a5503ae6176a25cc7f382cc9aa8c0cf3d81f8639f8';
                      const defaultLiveKey = 'live_ec0ea2cf67cf38d8c57c20b56cca7b56034d66400cbd70e2517529a5baaac2cb';
                      const apiKey = parsed.apiKey || (isSandbox ? defaultSandboxKey : defaultLiveKey);
                      const payload = JSON.stringify(parsed.payload || {});

                      const hostname = isSandbox ? 'api.sandbox.hit-pay.com' : 'api.hit-pay.com';
                      console.log(`[HitPay Proxy] Forwarding to https://${hostname}/v1/payment-requests (${isSandbox ? 'SANDBOX' : 'LIVE'})...`);
                      const proxyReq = https.request({
                        hostname,
                        path: '/v1/payment-requests',
                        method: 'POST',
                        agent: false,
                        headers: {
                          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                          'Content-Type': 'application/json',
                          'X-Requested-With': 'XMLHttpRequest',
                          'X-BUSINESS-API-KEY': apiKey,
                          'Content-Length': Buffer.byteLength(payload)
                        }
                      }, (proxyRes) => {
                        let respBody = '';
                        proxyRes.on('data', chunk => { respBody += chunk; });
                        proxyRes.on('end', () => {
                          console.log(`[HitPay Proxy] Upstream status: ${proxyRes.statusCode}`);
                          if (proxyRes.statusCode && proxyRes.statusCode >= 400) {
                            console.warn(`[HitPay Proxy] Upstream error body:`, respBody);
                          }
                          res.statusCode = proxyRes.statusCode || 200;
                          res.setHeader('Content-Type', 'application/json');
                          res.end(respBody);
                        });
                      });

                      proxyReq.on('error', (e) => {
                        console.log(`[HitPay Proxy] Upstream unreachable (${e.message}). Directing client to HitPay checkout portal.`);
                        // Respond with 200 fallbackToPortal so browser avoids 502 Bad Gateway console error
                        res.statusCode = 200;
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({ 
                          fallbackToPortal: true, 
                          isSandbox, 
                          message: e.message 
                        }));
                      });

                      proxyReq.write(payload);
                      proxyReq.end();
                    } catch (e: any) {
                      console.error(`[HitPay Proxy] Internal error:`, e);
                      res.statusCode = 500;
                      res.setHeader('Content-Type', 'application/json');
                      res.end(JSON.stringify({ error: e?.message || 'Proxy failed' }));
                    }
                  });
                  return;
                }
              }
              next();
            });
        }
      }
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      }
    },
    build: {
      target: 'esnext',
      minify: 'esbuild',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router') || id.includes('recharts') || id.includes('chart')) {
                return 'vendor-react';
              }
              if (id.includes('firebase')) {
                return 'vendor-firebase';
              }
              if (id.includes('recharts') || id.includes('chart')) {
                return 'vendor-charts';
              }
              if (id.includes('lucide')) {
                return 'vendor-icons';
              }
            }
          }
        }
      },
      chunkSizeWarningLimit: 1200,
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom', 'firebase/app'],
    },
  };
});
