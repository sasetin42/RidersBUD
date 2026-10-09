import path from 'path';
import https from 'https';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
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
                  const password = params.Password || params.password || '';
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


          // HitPay payment proxy (development) — FORWARDS to the deployed Cloud Function.
          //
          // The payment-transaction lifecycle (INITIATED -> PENDING -> PAID), idempotent
          // payment-request reuse, authoritative amount lookup and webhook settlement all
          // live in the Cloud Function, so dev and production share ONE code path.
          // No HitPay credentials exist in this file or anywhere in the web bundle.
          server.middlewares.use(async (req, res, next) => {
            if (req.url?.startsWith('/api/hitpay-proxy')) {
              const chunks: Buffer[] = [];
              for await (const chunk of req) chunks.push(Buffer.from(chunk));
              const requestBody = Buffer.concat(chunks);
              const target = `https://ridersbud-10806.web.app${req.url}`;
              try {
                const proxyReq = https.request(target, {
                  method: req.method,
                  headers: {
                    'Content-Type': req.headers['content-type'] || 'application/json',
                    'Content-Length': requestBody.length
                  }
                }, (proxyRes) => {
                  res.statusCode = proxyRes.statusCode || 502;
                  const contentType = proxyRes.headers['content-type'];
                  if (contentType) res.setHeader('Content-Type', contentType);
                  proxyRes.pipe(res);
                });
                proxyReq.on('error', (e) => {
                  // 200 + fallbackToPortal keeps the client on its graceful fallback path
                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ fallbackToPortal: true, message: (e as Error).message }));
                });
                proxyReq.end(requestBody);
              } catch (e: any) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: e?.message || 'Proxy failed' }));
              }
              return;
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
    test: {
      include: ['test/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/functions/**']
    }
  };
});
