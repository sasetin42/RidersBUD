import path from 'path';
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
                try {
                  const tls = await import('tls');
                  const net = await import('net');

                  let params: any = {};
                  if (req.headers['content-type']?.includes('application/json')) {
                    params = JSON.parse(rawBody || '{}');
                  } else {
                    const search = new URLSearchParams(rawBody);
                    search.forEach((val, key) => { params[key] = val; });
                  }

                  const host = params.Host || params.host;
                  const port = Number(params.Port || params.port) || 465;
                  const username = params.Username || params.username || '';
                  const password = params.Password || params.password || '';
                  const from = params.From || params.from || username;
                  const to = params.To || params.to || username;
                  const subject = params.Subject || params.subject || 'Test Email from RidersBUD';
                  const body = params.Body || params.body || 'This is a test email to verify your SMTP settings.';

                  if (!host || !username || !password) {
                    res.statusCode = 400;
                    res.setHeader('Content-Type', 'text/plain');
                    return res.end('Missing required SMTP fields (Host, Username, Password).');
                  }

                  const isExplicitSsl = port === 465;

                  const smtpPromise = new Promise<string>((resolve, reject) => {
                    let socket: any;
                    let step = 0;
                    let responseBuffer = '';
                    let isFinished = false;

                    const timeout = setTimeout(() => {
                      if (!isFinished) {
                        isFinished = true;
                        if (socket) socket.destroy();
                        reject(new Error(`Connection to SMTP server (${host}:${port}) timed out after 30s.`));
                      }
                    }, 30000);

                    const onConnect = () => {};

                    try {
                      if (isExplicitSsl) {
                        socket = tls.connect({ host, port, rejectUnauthorized: false }, onConnect);
                      } else {
                        socket = net.connect({ host, port }, onConnect);
                      }
                    } catch (e: any) {
                      clearTimeout(timeout);
                      return reject(new Error(`Socket connection failed: ${e.message}`));
                    }

                    socket.setEncoding('utf8');

                    const send = (cmd: string) => {
                      if (socket && !socket.destroyed) {
                        socket.write(cmd + '\r\n');
                      }
                    };

                    socket.on('data', (chunk: string) => {
                      responseBuffer += chunk;
                      const lines = responseBuffer.split(/\r?\n/).filter(Boolean);
                      if (lines.length === 0) return;

                      const lastLine = lines[lines.length - 1];
                      if (lastLine.length >= 4 && lastLine.charAt(3) === '-') {
                        return; // Multiline response, wait for completion
                      }

                      const code = parseInt(lastLine.slice(0, 3), 10);
                      responseBuffer = '';

                      if (code >= 400) {
                        if (!isFinished) {
                          isFinished = true;
                          clearTimeout(timeout);
                          try { send('QUIT'); } catch (_) {}
                          socket.destroy();
                          return reject(new Error(`SMTP Error (${code}): ${lastLine}`));
                        }
                        return;
                      }

                      if (step === 0 && (code === 220 || code === 200)) {
                        step = 1;
                        send('EHLO localhost');
                      } else if (step === 1 && code === 250) {
                        if (!isExplicitSsl && (port === 587 || port === 25)) {
                          step = 2; // STARTTLS
                          send('STARTTLS');
                        } else {
                          step = 3; // AUTH LOGIN
                          send('AUTH LOGIN');
                        }
                      } else if (step === 2 && code === 220) {
                        const tlsSocket = tls.connect({ socket, rejectUnauthorized: false });
                        socket = tlsSocket;
                        socket.setEncoding('utf8');
                        step = 1;
                        send('EHLO localhost');
                      } else if (step === 3 && code === 334) {
                        step = 4;
                        send(Buffer.from(username).toString('base64'));
                      } else if (step === 4 && code === 334) {
                        step = 5;
                        send(Buffer.from(password).toString('base64'));
                      } else if (step === 5 && (code === 235 || code === 250)) {
                        step = 6;
                        const fromMatch = from.match(/<([^>]+)>/);
                        const cleanFrom = fromMatch ? fromMatch[1] : from;
                        send(`MAIL FROM:<${cleanFrom}>`);
                      } else if (step === 6 && code === 250) {
                        step = 7;
                        const toMatch = to.match(/<([^>]+)>/);
                        const cleanTo = toMatch ? toMatch[1] : to;
                        send(`RCPT TO:<${cleanTo}>`);
                      } else if (step === 7 && code === 250) {
                        step = 8;
                        send('DATA');
                      } else if (step === 8 && code === 354) {
                        step = 9;
                        const message = [
                          `From: ${from}`,
                          `To: ${to}`,
                          `Subject: ${subject}`,
                          `MIME-Version: 1.0`,
                          `Content-Type: text/plain; charset=UTF-8`,
                          ``,
                          body,
                          `.`
                        ].join('\r\n');
                        send(message);
                      } else if (step === 9 && code === 250) {
                        if (!isFinished) {
                          isFinished = true;
                          clearTimeout(timeout);
                          try { send('QUIT'); } catch (_) {}
                          socket.end();
                          resolve('OK');
                        }
                      }
                    });

                    socket.on('error', (err: any) => {
                      if (!isFinished) {
                        isFinished = true;
                        clearTimeout(timeout);
                        reject(new Error(`SMTP Connection Error: ${err.message}`));
                      }
                    });
                  });

                  const result = await smtpPromise;
                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'text/plain');
                  res.end(result);
                } catch (error: any) {
                  const msg = error?.message || 'SMTP operation failed.';
                  // Use 503 for SMTP server connection failures, 400 only for bad input
                  const isInputError = msg.includes('Missing required SMTP fields');
                  res.statusCode = isInputError ? 400 : 503;
                  res.setHeader('Content-Type', 'text/plain');
                  res.end(msg);
                }
              });
              return;
            }
            next();
          });

          // Native Node.js HitPay Payment Gateway Proxy to bypass CORS during development
          server.middlewares.use(async (req, res, next) => {
              if (req.url?.startsWith('/api/hitpay-proxy') && req.method === 'POST') {
                let rawBody = '';
                req.on('data', chunk => { rawBody += chunk; });
                req.on('end', async () => {
                  try {
                    const https = await import('https');
                    const parsed = JSON.parse(rawBody || '{}');
                    const isSandbox = parsed.isSandbox !== false;
                    const apiKey = parsed.apiKey || '';
                    const payload = JSON.stringify(parsed.payload || {});

                    const hostname = isSandbox ? 'api.sandbox.hit-pay.com' : 'api.hit-pay.com';
                    const proxyReq = https.request({
                      hostname,
                      path: '/v1/payment-requests',
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-BUSINESS-API-KEY': apiKey,
                        'Content-Length': Buffer.byteLength(payload)
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
                      res.end(JSON.stringify({ error: e.message }));
                    });

                    proxyReq.write(payload);
                    proxyReq.end();
                  } catch (e: any) {
                    res.statusCode = 500;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: e?.message || 'Proxy failed' }));
                  }
                });
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
  };
});
