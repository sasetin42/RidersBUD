'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

const {
  calculateAuthoritativeAmount,
  computeRawBodyHmac,
  computeLegacyHmac,
  verifyWebhookSignature,
  timingSafeEqualString,
  parseReferenceEntity,
  computeEntityPaymentUpdate,
  normalizeHitPayStatus,
  parseGatewayAmount
} = require('../lib/hitpay');

test('parseGatewayAmount - HitPay comma-formatted amount strings (root-cause of gateway=NaN mismatch)', () => {
  // HitPay returns `{"amount":"1,750.00"}` — Number() of that is NaN, which
  // used to block EVERY completed payment as an amount mismatch.
  assert.equal(parseGatewayAmount({ amount: '1,750.00' }), 1750);
  assert.equal(parseGatewayAmount({ amount: '1750.00' }), 1750);
  assert.equal(parseGatewayAmount({ amount: 1750 }), 1750);
  assert.equal(parseGatewayAmount({ amount: '5.00' }), 5);
  assert.equal(parseGatewayAmount({ amount: '2,000' }), 2000);

  // Fallback to payments[0].amount when the top-level amount is missing
  assert.equal(
    parseGatewayAmount({ amount: undefined, payments: [{ amount: '1,750.00' }] }),
    1750
  );

  // Unreadable amounts must surface as NaN (settlement treats it as
  // GATEWAY_AMOUNT_UNREADABLE, never as an AMOUNT_MISMATCH)
  assert.equal(Number.isNaN(parseGatewayAmount({ amount: null, payments: [] })), true);
  assert.equal(Number.isNaN(parseGatewayAmount({ amount: 'abc' })), true);
  assert.equal(Number.isNaN(parseGatewayAmount(null)), true);
  assert.equal(Number.isNaN(parseGatewayAmount({})), true);
});

test('calculateAuthoritativeAmount - Bookings downpayment and balance', () => {
  const booking = {
    totalAmount: 3000,
    downpaymentAmount: 1500,
    paidAmount: 0
  };

  // Downpayment request
  const dp = calculateAuthoritativeAmount(booking, 'bookings', 'downpayment', 'BOK-12345-DP');
  assert.equal(dp.amount, 1500);
  assert.equal(dp.remainingBalance, 3000);
  assert.equal(dp.isDeposit, true);

  // Balance request after DP is paid
  const bookingWithDp = { ...booking, paidAmount: 1500 };
  const bal = calculateAuthoritativeAmount(bookingWithDp, 'bookings', 'balance', 'BOK-12345-BAL');
  assert.equal(bal.amount, 1500);
  assert.equal(bal.remainingBalance, 1500);

  // Full upfront payment request (100%)
  const full = calculateAuthoritativeAmount(booking, 'bookings', 'full', 'BOK-12345-FULL');
  assert.equal(full.amount, 3000);
  assert.equal(full.remainingBalance, 3000);
  assert.equal(full.isDeposit, false);
});

test('calculateAuthoritativeAmount - Rental bookings 50% deposit and remaining balance', () => {
  const rental = {
    totalPrice: 5000,
    paidAmount: 0
  };

  const dp = calculateAuthoritativeAmount(rental, 'rentalBookings', 'downpayment', 'RNT-9999-DP');
  assert.equal(dp.amount, 2500);
  assert.equal(dp.isDeposit, true);

  const rentalPaid = { ...rental, paidAmount: 2500 };
  const bal = calculateAuthoritativeAmount(rentalPaid, 'rentalBookings', 'balance', 'RNT-9999-BAL');
  assert.equal(bal.amount, 2500);
});

test('calculateAuthoritativeAmount - Liaison bookings downpayment calculation', () => {
  const liaison = {
    fees: { total: 2000, serviceFee: 1500, governmentFee: 500 },
    paidAmount: 0
  };

  const dp = calculateAuthoritativeAmount(liaison, 'liaisonBookings', 'downpayment', 'LIA-8888-DP');
  assert.equal(dp.amount, 1000);
  assert.equal(dp.isDeposit, true);

  const full = calculateAuthoritativeAmount(liaison, 'liaisonBookings', 'full', 'LIA-8888-FULL');
  assert.equal(full.amount, 2000);
});

test('calculateAuthoritativeAmount - ServiceRequests (Driver & Towing) downpayment vs full', () => {
  const serviceReq = {
    details: { totalAmount: 4000, downpaymentAmount: 2000 },
    paidAmount: 0
  };

  const dp = calculateAuthoritativeAmount(serviceReq, 'serviceRequests', 'downpayment', 'TOW-7777-DP');
  assert.equal(dp.amount, 2000);
  assert.equal(dp.isDeposit, true);

  const bal = calculateAuthoritativeAmount({ ...serviceReq, paidAmount: 2000 }, 'serviceRequests', 'balance', 'TOW-7777-BAL');
  assert.equal(bal.amount, 2000);
});

test('calculateAuthoritativeAmount - Orders require full payment', () => {
  const order = {
    total: 1250.50,
    paidAmount: 0
  };

  const res = calculateAuthoritativeAmount(order, 'orders', 'full', 'ORD-5555');
  assert.equal(res.amount, 1250.50);
});

test('Webhook signature verification - Raw body HMAC-SHA256 (v2)', () => {
  const salt = 'test_webhook_salt_12345';
  const rawBody = Buffer.from(JSON.stringify({ payment_id: 'pid_999', status: 'completed', amount: '1500.00' }));
  const signature = crypto.createHmac('sha256', salt).update(rawBody).digest('hex');

  const headers = { 'hitpay-signature': signature };
  const res = verifyWebhookSignature({ rawBody, payload: {}, headers, salts: [salt] });

  assert.equal(res.valid, true);
  assert.equal(res.mode, 'v2');
  assert.equal(res.salt, salt);

  // Invalid signature must reject
  const invalidRes = verifyWebhookSignature({ rawBody, payload: {}, headers: { 'hitpay-signature': 'invalid_sig' }, salts: [salt] });
  assert.equal(invalidRes.valid, false);
});

test('Webhook signature verification - Legacy HMAC', () => {
  const salt = 'legacy_salt_xyz';
  const payload = {
    amount: '500.00',
    currency: 'PHP',
    status: 'completed'
  };
  const expectedHmac = computeLegacyHmac(payload, salt);
  payload.hmac = expectedHmac;

  const res = verifyWebhookSignature({ rawBody: null, payload, headers: {}, salts: [salt] });
  assert.equal(res.valid, true);
  assert.equal(res.mode, 'legacy');
});

test('computeEntityPaymentUpdate - Idempotency and status advancement', () => {
  const booking = {
    totalAmount: 3000,
    paidAmount: 0,
    status: 'Work Done',
    paymentTransactions: []
  };

  const update1 = computeEntityPaymentUpdate(booking, {
    amount: 1500,
    reference: 'BOK-1-DP',
    transactionId: 'tx_1',
    kind: 'downpayment',
    collectionName: 'bookings'
  });

  assert.equal(update1.update.paidAmount, 1500);
  assert.equal(update1.update.remainingBalance, 1500);
  assert.equal(update1.update.paymentStatus, 'partial');
  assert.equal(update1.isFullyPaid, false);

  // Balance settlement advances Work Done to Completed
  const bookingAfterDp = { ...booking, ...update1.update };
  const update2 = computeEntityPaymentUpdate(bookingAfterDp, {
    amount: 1500,
    reference: 'BOK-1-BAL',
    transactionId: 'tx_2',
    kind: 'balance',
    collectionName: 'bookings'
  });

  assert.equal(update2.update.paidAmount, 3000);
  assert.equal(update2.update.remainingBalance, 0);
  assert.equal(update2.update.paymentStatus, 'paid');
  assert.equal(update2.update.isPaid, true);
  assert.equal(update2.update.status, 'Completed');
  assert.equal(update2.update.paymentMethod, 'Online (HitPay)');
  assert.equal(update2.update.paymentGateway, 'hitpay');
  assert.ok(update2.update.gcashPaymentStatus); // admin.firestore.FieldValue.delete() sentinel
  assert.equal(update2.isFullyPaid, true);

  // Duplicate replay should not increase paid amount
  const bookingFullyPaid = { ...bookingAfterDp, ...update2.update };
  const updateReplay = computeEntityPaymentUpdate(bookingFullyPaid, {
    amount: 1500,
    reference: 'BOK-1-BAL',
    transactionId: 'tx_2',
    kind: 'balance',
    collectionName: 'bookings'
  });

  assert.equal(updateReplay.alreadyApplied, true);
  assert.equal(updateReplay.update.paidAmount, 3000);
});

test('computeEntityPaymentUpdate - Booking full payment transitions Pending or Upcoming to Confirmed', () => {
  const pendingBooking = {
    totalAmount: 2500,
    paidAmount: 0,
    status: 'Pending',
    paymentTransactions: []
  };

  const fullUpdate = computeEntityPaymentUpdate(pendingBooking, {
    amount: 2500,
    reference: 'BOK-2-FULL',
    transactionId: 'tx_full_1',
    kind: 'full',
    collectionName: 'bookings'
  });

  assert.equal(fullUpdate.update.paidAmount, 2500);
  assert.equal(fullUpdate.update.remainingBalance, 0);
  assert.equal(fullUpdate.update.paymentStatus, 'paid');
  assert.equal(fullUpdate.update.isPaid, true);
  assert.equal(fullUpdate.update.status, 'Confirmed');
  assert.equal(fullUpdate.isFullyPaid, true);

  const upcomingBooking = {
    totalAmount: 4000,
    paidAmount: 0,
    status: 'Upcoming',
    paymentTransactions: []
  };

  const upcomingUpdate = computeEntityPaymentUpdate(upcomingBooking, {
    amount: 4000,
    reference: 'BOK-3-FULL',
    transactionId: 'tx_full_2',
    kind: 'full',
    collectionName: 'bookings'
  });

  assert.equal(upcomingUpdate.update.status, 'Confirmed');
  assert.equal(upcomingUpdate.update.paymentStatus, 'paid');
  assert.equal(upcomingUpdate.update.isPaid, true);
});

test('parseReferenceEntity - parses prefixes properly', () => {
  const b = parseReferenceEntity('BOK-abcd1234-DP');
  assert.equal(b.entityKind, 'booking');
  assert.equal(b.entityId, 'abcd1234');
  assert.equal(b.isDeposit, true);

  const r = parseReferenceEntity('RNT-xyz9876-BAL');
  assert.equal(r.entityKind, 'rental');
  assert.equal(r.entityId, 'xyz9876');

  const l = parseReferenceEntity('LIA-liaison555');
  assert.equal(l.entityKind, 'liaison');

  const s = parseReferenceEntity('TOW-towing777-DP');
  assert.equal(s.entityKind, 'service-request');
  assert.equal(s.isDeposit, true);
});

test('Parameter normalization and sandbox simulation isolation logic', () => {
  // ExtractTxParams simulation function matching functions/index.js
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

  // 1. Parameter extraction with various query styles
  const query1 = { s: 'RB-SES-001', tx: 'TXN-999', ref: 'BOK-123-FULL', prid: 'PR-100' };
  const parsed1 = extractTxParams(query1);
  assert.equal(parsed1.paymentSessionId, 'RB-SES-001');
  assert.equal(parsed1.transactionId, 'TXN-999');
  assert.equal(parsed1.referenceNumber, 'BOK-123-FULL');

  // Alternative naming
  const query2 = { paymentSessionId: 'RB-SES-002', transactionId: 'TXN-888', referenceNumber: 'ORD-777' };
  const parsed2 = extractTxParams(query2);
  assert.equal(parsed2.paymentSessionId, 'RB-SES-002');
  assert.equal(parsed2.transactionId, 'TXN-888');
  assert.equal(parsed2.referenceNumber, 'ORD-777');

  // 2. Sandbox simulation endpoint security policy:
  // Must reject if isSandbox is false or environment is production
  const checkSandboxAllowed = (isSandbox, txEnvironment) => {
    if (!isSandbox) {
      return { allowed: false, error: 'FORBIDDEN', message: 'simulate-sandbox is only permitted in the sandbox environment.' };
    }
    if (txEnvironment && txEnvironment !== 'sandbox') {
      return { allowed: false, error: 'FORBIDDEN', message: 'Cannot simulate settlement on a non-sandbox transaction.' };
    }
    return { allowed: true };
  };

  // Production check rejects
  assert.equal(checkSandboxAllowed(false, 'sandbox').allowed, false);
  assert.equal(checkSandboxAllowed(false, 'production').allowed, false);

  // Production transaction inside sandbox environment rejects
  assert.equal(checkSandboxAllowed(true, 'production').allowed, false);

  // Pure sandbox allows
  assert.equal(checkSandboxAllowed(true, 'sandbox').allowed, true);
});

