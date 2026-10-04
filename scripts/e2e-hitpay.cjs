/* RidersBUD HitPay sandbox E2E suite — exercises the DEPLOYED functions.
 * Reads the sandbox webhook salt from functions/.env (server-side secret, never printed). */
const fs = require('fs');
const crypto = require('crypto');

const BASE = 'https://ridersbud-10806.web.app/api/hitpay-proxy';
const WEBHOOK = 'https://ridersbud-10806.web.app/api/hitpay-webhook';

// --- load sandbox salt from functions/.env (same file deployed with functions) ---
const envText = fs.readFileSync('functions/.env', 'utf8');
const getEnv = (k) => (envText.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1]?.trim() || '';
const SANDBOX_SALT = getEnv('HITPAY_SANDBOX_SALT') || getEnv('HITPAY_SALT');
if (!SANDBOX_SALT) { console.error('FAIL: no sandbox salt in functions/.env'); process.exit(1); }

const BASE_REF = 'RBTEST-E2E-' + Date.now();
let REF = BASE_REF;
const results = [];
const check = (name, ok, detail) => { results.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} — ${name}${detail ? ' :: ' + detail : ''}`); };

const post = async (url, body, headers = {}) => {
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body)
  });
  const text = await resp.text();
  let json = null; try { json = JSON.parse(text); } catch { /* non-json */ }
  return { status: resp.status, json, text };
};

const get = async (url) => {
  const resp = await fetch(url);
  const text = await resp.text();
  let json = null; try { json = JSON.parse(text); } catch { /* non-json */ }
  return { status: resp.status, json, text };
};

(async () => {
  // 1) Initial create + session reuse: second call with same reference returns reused session
  const create1 = await post(BASE, {
    isSandbox: true,
    referenceNumber: REF,
    kind: 'balance',
    payload: { amount: 5.00, currency: 'PHP', reference_number: REF, email: 'e2e@ridersbud.com', name: 'RidersBUD E2E Test', purpose: 'E2E settlement test' }
  });
  const prId = create1.json && create1.json.id;
  const txId = create1.json && create1.json.transactionId;
  const create2 = await post(BASE, {
    isSandbox: true,
    referenceNumber: REF,
    kind: 'balance',
    payload: { amount: 5.00, currency: 'PHP', reference_number: REF, email: 'e2e@ridersbud.com', name: 'RidersBUD E2E Test', purpose: 'E2E settlement test' }
  });
  const reusedSession = create2.json && create2.json.url && create2.json.id;
  check('create/reuse returns ONE session for the same reference',
    !!reusedSession && create2.json.reused === true && create2.json.id === prId,
    `reused=${create2.json && create2.json.reused} id=${create2.json && create2.json.id}`);

  // 2) Transaction record exists with the standardized lifecycle fields
  const txView = await get(`${BASE}?action=transaction&id=${encodeURIComponent(txId || REF)}&ref=${encodeURIComponent(REF)}`);
  const tx = txView.json || {};
  const requiredFields = ['transactionId', 'entityKind', 'entityId', 'referenceNumber', 'amount', 'currency', 'environment', 'status', 'verificationStatus', 'createdAt'];
  const missing = requiredFields.filter((f) => tx[f] === undefined);
  check('paymentTransactions record created with standardized fields',
    txView.status === 200 && missing.length === 0 && (tx.status === 'PENDING' || tx.status === 'INITIATED'),
    `status=${tx.status} missing=[${missing.join(',')}]`);
  check('transaction carries sandbox environment', tx.environment === 'sandbox', `env=${tx.environment}`);

  // 3) verify action talks to HitPay directly and does NOT mark pending as paid
  const verify1 = await get(`${BASE}?action=verify&id=${encodeURIComponent(txId)}&sandbox=true`);
  check('server verify: pending gateway stays un-paid',
    verify1.json && verify1.json.ok === true && verify1.json.result && verify1.json.result.status !== 'PAID',
    `result=${JSON.stringify(verify1.json && verify1.json.result).slice(0, 160)}`);

  // 4) webhook with WRONG signature must be rejected (401)
  const badPayload = JSON.stringify({ id: prId, status: 'completed', amount: '5.00', currency: 'PHP', reference_number: REF });
  const badSig = crypto.createHmac('sha256', 'wrong-salt').update(badPayload).digest('hex');
  const rejected = await post(WEBHOOK, badPayload, {
    'Content-Type': 'application/json',
    'hitpay-signature': badSig,
    'hitpay-event-object': 'payment_request',
    'hitpay-event-type': 'completed'
  });
  check('webhook with invalid signature rejected with 401', rejected.status === 401, `http=${rejected.status}`);

  // 5) webhook with NO signature must be rejected
  const unsigned = await post(WEBHOOK, badPayload, { 'Content-Type': 'application/json', 'hitpay-event-object': 'payment_request' });
  check('webhook without signature rejected', unsigned.status === 401 || unsigned.status === 500, `http=${unsigned.status}`);

  // 6) VALID v2 signature claiming "completed" — but HitPay API says the request is
  //    still pending, so settlement MUST refuse to mark it PAID (webhook alone is
  //    never proof; server-side re-verification is authoritative).
  const goodPayload = JSON.stringify({ id: prId, status: 'completed', amount: '5.00', currency: 'PHP', reference_number: REF });
  const goodSig = crypto.createHmac('sha256', SANDBOX_SALT).update(goodPayload).digest('hex');
  const signedWebhook = await post(WEBHOOK, goodPayload, {
    'Content-Type': 'application/json',
    'hitpay-signature': goodSig,
    'hitpay-event-object': 'payment_request',
    'hitpay-event-type': 'completed'
  });
  check('validly-signed webhook accepted (200)', signedWebhook.status === 200, `http=${signedWebhook.status} body=${signedWebhook.text.slice(0, 200)}`);
  check('signed "completed" webhook does NOT mark PAID when gateway says pending',
    signedWebhook.json && signedWebhook.json.status !== 'PAID',
    `settlement status=${signedWebhook.json && signedWebhook.json.status}`);

  // 7) duplicate webhook is idempotent (no error, no PAID flip)
  const dup = await post(WEBHOOK, goodPayload, {
    'Content-Type': 'application/json',
    'hitpay-signature': goodSig,
    'hitpay-event-object': 'payment_request',
    'hitpay-event-type': 'completed'
  });
  check('duplicate webhook idempotent (200, still not PAID)',
    dup.status === 200 && dup.json && dup.json.status !== 'PAID',
    `status=${dup.json && dup.json.status} already=${dup.json && dup.json.alreadySettled}`);

  // 8) transaction still PENDING after all of the above
  const txAfter = await get(`${BASE}?action=transaction&id=${encodeURIComponent(txId)}&ref=${encodeURIComponent(REF)}`);
  check('transaction still PENDING (no false PAID anywhere)',
    txAfter.json && txAfter.json.status === 'PENDING',
    `status=${txAfter.json && txAfter.json.status} verification=${txAfter.json && txAfter.json.verificationStatus}`);

  const failed = results.filter((r) => !r.ok);
  console.log(`\n=== E2E SUMMARY: ${results.length - failed.length}/${results.length} passed ===`);
  if (failed.length) { console.log('FAILED:', failed.map((f) => f.name).join(' | ')); process.exit(1); }
})().catch((e) => { console.error('E2E fatal:', e); process.exit(1); });
