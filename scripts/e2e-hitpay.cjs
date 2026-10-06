/* RidersBUD HitPay sandbox E2E suite — exercises the DEPLOYED functions.
 *
 * Covers, against production hosting (sandbox HitPay):
 *   1. Payment-initiation security hardening (ENTITY_REQUIRED / ENTITY_NOT_FOUND)
 *   2. Authoritative verify on a gateway-pending payment (GATEWAY_PENDING — never PAID)
 *   3. Webhook signature enforcement (401 for bad/missing signatures)
 *   4. Webhook retry contract (503 + retry:true while the gateway is pending)
 *   5. Settlement regressions for the gateway=NaN fix:
 *        - verify on previously stuck comma-amount payments → PAID (idempotent)
 *        - signed 'completed' webhook replay on a settled comma-amount payment → 200 PAID
 *
 * Fixtures (stable, created by earlier runs / real sandbox payments):
 *   tx_RBTEST-E2E-1791125384568  — sandbox tx stuck at the gateway (status PENDING)
 *   a2e6e33f-293f-4871-a84a-7b2a7425a87e — its payment request (gateway: pending)
 *   tx_BOK-busFvky7mGsTIZL1x4Sg-DP — real sandbox payment settled PAID by the NaN fix
 *   a2e6ec26-4415-490d-a0ee-6fb459ad334f — its completed payment request (amount "1,750.00")
 *   tx_BOK-RCQY35GE-DP-9197 — second real payment settled PAID by the NaN fix
 *
 * Reads the sandbox webhook salt from functions/.env (server-side secret, never printed).
 * Full create → checkout → settle coverage runs against a booking seeded fresh
 * on every run by scripts/seed-e2e-booking.cjs (throwaway customer account;
 * no admin privileges, no service account, no rules changes required).
 */
const fs = require('fs');
const crypto = require('crypto');
const { seedBooking } = require('./seed-e2e-booking.cjs');

const BASE = 'https://ridersbud-10806.web.app/api/hitpay-proxy';
const WEBHOOK = 'https://ridersbud-10806.web.app/api/hitpay-webhook';

const PENDING_TX = 'tx_RBTEST-E2E-1791125384568';
const PENDING_PR = 'a2e6e33f-293f-4871-a84a-7b2a7425a87e';
const PENDING_REF = 'RBTEST-E2E-1791125384568';
const PAID_TX_1 = 'tx_BOK-busFvky7mGsTIZL1x4Sg-DP';
const PAID_TX_2 = 'tx_BOK-RCQY35GE-DP-9197';
const COMPLETED_PR = 'a2e6ec26-4415-490d-a0ee-6fb459ad334f';
const COMPLETED_REF = 'BOK-busFvky7mGsTIZL1x4Sg-DP';

// --- load sandbox salt from functions/.env (same file deployed with functions) ---
const envText = fs.readFileSync('functions/.env', 'utf8');
const getEnv = (k) => (envText.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1]?.trim() || '';
const SANDBOX_SALT = getEnv('HITPAY_SANDBOX_SALT') || getEnv('HITPAY_SALT');
if (!SANDBOX_SALT) { console.error('FAIL: no sandbox salt in functions/.env'); process.exit(1); }

const results = [];
const check = (name, ok, detail) => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'} — ${name}${detail ? ' :: ' + detail : ''}`); };

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

const signedWebhook = (payloadObj) => {
  const payload = JSON.stringify(payloadObj);
  const sig = crypto.createHmac('sha256', SANDBOX_SALT).update(payload).digest('hex');
  return post(WEBHOOK, payload, {
    'Content-Type': 'application/json',
    'hitpay-signature': sig,
    'hitpay-event-object': 'payment_request',
    'hitpay-event-type': payloadObj.status || 'completed'
  });
};

(async () => {
  // ------------------------------------------------------------------
  // 1) Payment initiation security hardening
  // ------------------------------------------------------------------
  const noEntity = await post(BASE, { isSandbox: true, kind: 'balance', payload: { amount: 5.00, currency: 'PHP' } });
  check('create without entity rejected with ENTITY_REQUIRED (400)',
    noEntity.status === 400 && noEntity.json && noEntity.json.code === 'ENTITY_REQUIRED',
    `http=${noEntity.status} body=${noEntity.text.slice(0, 160)}`);

  const unknownEntity = await post(BASE, { isSandbox: true, entityKind: 'booking', entityId: 'e2eNoSuchEntity', kind: 'downpayment', payload: {} });
  check('create with unknown entity rejected with ENTITY_NOT_FOUND (404)',
    unknownEntity.status === 404 && unknownEntity.json && unknownEntity.json.code === 'ENTITY_NOT_FOUND',
    `http=${unknownEntity.status}`);

  // ------------------------------------------------------------------
  // 1b) FULL create → checkout → settle cycle on a freshly seeded booking
  //     (scripts/seed-e2e-booking.cjs provisions a throwaway owner account
  //      + bookings/{id} doc that satisfies firestore.rules on every run)
  // ------------------------------------------------------------------
  let seed = null;
  try {
    seed = await seedBooking();
    check('seeded a fresh E2E booking with an owner session',
      Boolean(seed.entityId && seed.idToken),
      `entity=${seed.entityId} accountCreated=${seed.accountCreated}`);
  } catch (e) {
    check('seeded a fresh E2E booking with an owner session', false, e.message);
  }

  if (seed) {
    const cycleBody = {
      isSandbox: true,
      entityKind: 'booking',
      entityId: seed.entityId,
      kind: 'downpayment',
      payload: { email: seed.email, name: 'RidersBUD E2E Seed' }
    };

    const create1 = await post(BASE, cycleBody);
    const prId = create1.json && create1.json.paymentRequestId;
    const txId = create1.json && create1.json.transactionId;
    const checkoutUrl = create1.json && create1.json.checkoutUrl;
    check('create → checkout session opened for the seeded booking at the authoritative amount',
      create1.status === 200 && Boolean(prId && txId && checkoutUrl) && Number(create1.json.amount) === seed.downpaymentAmount,
      `http=${create1.status} amount=${create1.json && create1.json.amount} pr=${prId} tx=${txId}`);

    const create2 = await post(BASE, cycleBody);
    check('second create reuses the SAME active session (idempotent)',
      create2.status === 200 && create2.json && create2.json.reused === true && create2.json.paymentRequestId === prId,
      `reused=${create2.json && create2.json.reused} pr=${create2.json && create2.json.paymentRequestId}`);

    const cycTx = await get(`${BASE}?action=transaction&tx=${encodeURIComponent(txId || '')}`);
    check('seeded transaction carries lifecycle + entity fields',
      cycTx.status === 200 && cycTx.json && cycTx.json.environment === 'sandbox' &&
      Number(cycTx.json.amount) === seed.downpaymentAmount && cycTx.json.entityId === seed.entityId,
      `status=${cycTx.json && cycTx.json.status} amount=${cycTx.json && cycTx.json.amount} entity=${cycTx.json && cycTx.json.entityId}`);

    const cycVerify = await get(`${BASE}?action=verify&tx=${encodeURIComponent(txId || '')}&sandbox=true`);
    const cvr = (cycVerify.json && cycVerify.json.result) || {};
    check('fresh checkout is NOT PAID before the gateway completes it',
      Boolean(cycVerify.json && cycVerify.json.ok) && cvr.status !== 'PAID',
      `result=${JSON.stringify(cvr).slice(0, 180)}`);

    // Sandbox settlement (the sanctioned completion mechanism in sandbox —
    // real gateway completion cannot be scripted). Exercises the entity update.
    const settleSim = await get(`${BASE}?action=simulate-sandbox&id=${encodeURIComponent(txId || '')}&sandbox=true`);
    check('sandbox settle completes the transaction as PAID + updates the booking',
      settleSim.json && settleSim.json.ok === true && settleSim.json.status === 'PAID' && settleSim.json.entityUpdated === true,
      `body=${settleSim.text.slice(0, 220)}`);

    const cycVerify2 = await get(`${BASE}?action=verify&tx=${encodeURIComponent(txId || '')}&sandbox=true`);
    check('verify after settle → PAID (idempotent terminal absorb)',
      Boolean(cycVerify2.json && cycVerify2.json.result) && cycVerify2.json.result.status === 'PAID',
      `result=${JSON.stringify(cycVerify2.json && cycVerify2.json.result).slice(0, 180)}`);

    // Read the booking back AS ITS OWNER (firestore.rules owner-read) and
    // assert the settlement actually landed on the entity.
    try {
      const bookingUrl = `https://firestore.googleapis.com/v1/projects/ridersbud-10806/databases/(default)/documents/bookings/${seed.entityId}`;
      const bResp = await fetch(bookingUrl, { headers: { Authorization: `Bearer ${seed.idToken}` } });
      const bJson = await bResp.json().catch(() => ({}));
      // Firestore REST encodes whole numbers as integerValue, fractions as doubleValue.
      const fieldNum = (f) => (f && f.doubleValue !== undefined ? Number(f.doubleValue) : f && f.integerValue !== undefined ? Number(f.integerValue) : NaN);
      const paid = fieldNum(bJson.fields && bJson.fields.paidAmount);
      const payStatus = bJson.fields && bJson.fields.paymentStatus && bJson.fields.paymentStatus.stringValue;
      check('seeded booking updated: paidAmount reflects the downpayment',
        bResp.ok && paid === seed.downpaymentAmount && payStatus === 'partial',
        `paidAmount=${paid} paymentStatus=${payStatus} http=${bResp.status}`);
    } catch (e) {
      check('seeded booking updated: paidAmount reflects the downpayment', false, e.message);
    }
  }

  // ------------------------------------------------------------------
  // 2) Authoritative transaction view + verify on a gateway-pending payment
  // ------------------------------------------------------------------
  const txView = await get(`${BASE}?action=transaction&tx=${encodeURIComponent(PENDING_TX)}`);
  const tx = txView.json || {};
  const requiredFields = ['transactionId', 'referenceNumber', 'amount', 'currency', 'environment', 'status', 'verificationStatus', 'createdAt'];
  const missing = requiredFields.filter((f) => tx[f] === undefined);
  check('paymentTransactions record has the standardized fields',
    txView.status === 200 && missing.length === 0,
    `missing=[${missing.join(',')}] status=${tx.status}`);
  check('fixture transaction carries sandbox environment', tx.environment === 'sandbox', `env=${tx.environment}`);

  const verifyPending = await get(`${BASE}?action=verify&tx=${encodeURIComponent(PENDING_TX)}&sandbox=true`);
  const vres = (verifyPending.json && verifyPending.json.result) || {};
  check('server verify: gateway-pending payment stays un-paid and reports GATEWAY_PENDING',
    verifyPending.json && verifyPending.json.ok === true && vres.status !== 'PAID' && vres.verificationStatus === 'GATEWAY_PENDING' && vres.reason === 'gateway_status_pending',
    `result=${JSON.stringify(vres).slice(0, 200)}`);

  // ------------------------------------------------------------------
  // 3) Webhook signature enforcement
  // ------------------------------------------------------------------
  const pendingPayload = { payment_request_id: PENDING_PR, id: PENDING_PR, status: 'completed', amount: '5.00', currency: 'PHP', reference_number: PENDING_REF, nonce: 'e2e-' + Date.now() };
  const badSig = crypto.createHmac('sha256', 'wrong-salt').update(JSON.stringify(pendingPayload)).digest('hex');
  const rejected = await post(WEBHOOK, JSON.stringify(pendingPayload), {
    'Content-Type': 'application/json',
    'hitpay-signature': badSig,
    'hitpay-event-object': 'payment_request',
    'hitpay-event-type': 'completed'
  });
  check('webhook with invalid signature rejected with 401', rejected.status === 401, `http=${rejected.status}`);

  const unsigned = await post(WEBHOOK, JSON.stringify(pendingPayload), { 'Content-Type': 'application/json', 'hitpay-event-object': 'payment_request' });
  check('webhook without signature rejected', unsigned.status === 401 || unsigned.status === 500, `http=${unsigned.status}`);

  // ------------------------------------------------------------------
  // 4) Webhook retry contract: a validly-signed "completed" webhook is NOT
  //    proof — HitPay API still says pending, so we settle nothing and ask
  //    HitPay to redeliver (503 + retry:true).
  // ------------------------------------------------------------------
  const signedCompleted = await signedWebhook(pendingPayload);
  check('validly-signed "completed" webhook answered with retry (503) while gateway is pending',
    signedCompleted.status === 503 && signedCompleted.json && signedCompleted.json.retry === true && signedCompleted.json.status !== 'PAID',
    `http=${signedCompleted.status} body=${signedCompleted.text.slice(0, 200)}`);

  const dup = await signedWebhook({ ...pendingPayload, nonce: 'e2e-' + Date.now() });
  check('redelivery stays idempotent (never a false PAID)',
    (dup.status === 503 || dup.status === 200) && dup.json && dup.json.status !== 'PAID',
    `http=${dup.status} status=${dup.json && dup.json.status}`);

  const txAfter = await get(`${BASE}?action=transaction&tx=${encodeURIComponent(PENDING_TX)}`);
  check('pending fixture still NOT PAID after every webhook attempt (no false PAID anywhere)',
    txAfter.json && txAfter.json.status !== 'PAID',
    `status=${txAfter.json && txAfter.json.status} verification=${txAfter.json && txAfter.json.verificationStatus}`);

  // ------------------------------------------------------------------
  // 5) gateway=NaN settlement regressions — real sandbox payments that the
  //    comma-formatted amount ("1,750.00") used to block forever.
  // ------------------------------------------------------------------
  const settle1 = await get(`${BASE}?action=verify&tx=${encodeURIComponent(PAID_TX_1)}&sandbox=true`);
  check('comma-amount payment settles/verifies as PAID (gateway=NaN fix)',
    settle1.json && settle1.json.ok === true && settle1.json.result && settle1.json.result.status === 'PAID',
    `result=${JSON.stringify(settle1.json && settle1.json.result).slice(0, 200)}`);

  const settle2 = await get(`${BASE}?action=verify&tx=${encodeURIComponent(PAID_TX_2)}&sandbox=true`);
  check('second stuck payment also verifies as PAID',
    settle2.json && settle2.json.ok === true && settle2.json.result && settle2.json.result.status === 'PAID',
    `result=${JSON.stringify(settle2.json && settle2.json.result).slice(0, 200)}`);

  const paidReplay = await signedWebhook({
    payment_request_id: COMPLETED_PR,
    id: COMPLETED_PR,
    status: 'completed',
    amount: '1,750.00',
    currency: 'PHP',
    reference_number: COMPLETED_REF,
    nonce: 'e2e-' + Date.now()
  });
  check('signed webhook replay on the settled comma-amount payment → 200 PAID (idempotent)',
    paidReplay.status === 200 && paidReplay.json && paidReplay.json.status === 'PAID' && paidReplay.json.alreadySettled === true,
    `http=${paidReplay.status} body=${paidReplay.text.slice(0, 200)}`);

  const failed = results.filter((r) => !r.ok);
  console.log(`\n=== E2E SUMMARY: ${results.length - failed.length}/${results.length} passed ===`);
  if (failed.length) { console.log('FAILED:', failed.map((f) => f.name).join(' | ')); process.exit(1); }
})().catch((e) => { console.error('E2E fatal:', e); process.exit(1); });
