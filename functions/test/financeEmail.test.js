'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  classifyDailyTx,
  buildDailyFinanceSummary,
  MISMATCH_VERIFICATION_STATUSES
} = require('../lib/financeEmail');

// Fixed window so tests are deterministic: 2026-10-05 00:00 → 24h later.
const WINDOW_START = Date.UTC(2026, 9, 5, 0, 0, 0);
const WINDOW_END = WINDOW_START + 24 * 60 * 60 * 1000;

const ts = (ms) => ({ toMillis: () => ms });
const inWindow = WINDOW_START + 60 * 60 * 1000; // 01:00 in the window
const beforeWindow = WINDOW_START - 60 * 60 * 1000;

test('classifyDailyTx - PAID with paidAt in window is settled', () => {
  const tx = { status: 'PAID', paidAt: ts(inWindow), updatedAt: ts(inWindow) };
  assert.equal(classifyDailyTx(tx, WINDOW_START, WINDOW_END), 'settled');
});

test('classifyDailyTx - PAID without paidAt falls back to updatedAt in window', () => {
  const tx = { status: 'PAID', updatedAt: ts(inWindow) };
  assert.equal(classifyDailyTx(tx, WINDOW_START, WINDOW_END), 'settled');
});

test('classifyDailyTx - PAID settled before the window is ignored', () => {
  const tx = { status: 'PAID', paidAt: ts(beforeWindow), updatedAt: ts(beforeWindow) };
  assert.equal(classifyDailyTx(tx, WINDOW_START, WINDOW_END), null);
});

test('classifyDailyTx - EXPIRED in window is expired', () => {
  const tx = { status: 'EXPIRED', updatedAt: ts(inWindow), createdAt: ts(beforeWindow) };
  assert.equal(classifyDailyTx(tx, WINDOW_START, WINDOW_END), 'expired');
});

test('classifyDailyTx - PENDING_REVIEW and mismatch verdicts are escalated', () => {
  const pendingReview = { status: 'PENDING_REVIEW', updatedAt: ts(inWindow) };
  assert.equal(classifyDailyTx(pendingReview, WINDOW_START, WINDOW_END), 'escalated');

  const mismatch = {
    status: 'VERIFYING',
    verificationStatus: 'AMOUNT_MISMATCH',
    updatedAt: ts(inWindow)
  };
  assert.equal(classifyDailyTx(mismatch, WINDOW_START, WINDOW_END), 'escalated');
  assert.ok(MISMATCH_VERIFICATION_STATUSES.includes('AMOUNT_MISMATCH'));
});

test('classifyDailyTx - sweep escalation (escalatedAt) lands in escalated bucket', () => {
  const tx = { status: 'WAITING_FOR_PAYMENT', updatedAt: ts(beforeWindow), escalatedAt: ts(inWindow) };
  assert.equal(classifyDailyTx(tx, WINDOW_START, WINDOW_END), 'escalated');
});

test('classifyDailyTx - old escalatedAt outside the window is ignored', () => {
  const tx = { status: 'WAITING_FOR_PAYMENT', updatedAt: ts(beforeWindow), escalatedAt: ts(beforeWindow) };
  assert.equal(classifyDailyTx(tx, WINDOW_START, WINDOW_END), null);
});

test('buildDailyFinanceSummary - totals, subject, and deep links are correct', () => {
  const txs = [
    { id: 'tx_paid_1', status: 'PAID', paidAt: ts(inWindow), amount: 1500, referenceNumber: 'BOK-AB12CD34-DP', entityKind: 'booking', entityId: 'AB12CD34', paymentMethod: 'HitPay (Online)' },
    { id: 'tx_paid_2', status: 'PAID', paidAt: ts(inWindow), amount: 250, referenceNumber: 'ORD-XY98WV12-FULL', entityKind: 'order', entityId: 'XY98WV12' },
    { id: 'tx_expired_1', status: 'EXPIRED', updatedAt: ts(inWindow), amount: 1000, referenceNumber: 'BOK-EX11PI22-DP', entityKind: 'booking', entityId: 'EX11PI22' },
    { id: 'tx_stale_1', status: 'PAID', paidAt: ts(beforeWindow), updatedAt: ts(beforeWindow), amount: 999, referenceNumber: 'BOK-OLD00000-DP' }
  ];
  const escalations = [
    { id: 'n1', type: 'PAYMENT_MISMATCH_REVIEW', transactionId: 'tx_mismatch_1', referenceNumber: 'BOK-MM33NV44-DP', amount: 500, reason: 'amount mismatch: gateway=500 expected=1500', createdAt: ts(inWindow) },
    { id: 'n2', type: 'UNRELATED_TYPE', transactionId: 'tx_whatever', createdAt: ts(inWindow) }
  ];

  const summary = buildDailyFinanceSummary({
    txs,
    escalations,
    windowStartMs: WINDOW_START,
    windowEndMs: WINDOW_END,
    monitorBaseUrl: 'https://ridersbud-10806.web.app/admin-portal/payment-monitor'
  });

  assert.equal(summary.totals.settled.count, 2);
  assert.equal(summary.totals.settled.amount, 1750);
  assert.equal(summary.totals.expired.count, 1);
  assert.equal(summary.totals.expired.amount, 1000);
  // The unrelated notification type must NOT be treated as an escalation.
  assert.equal(summary.totals.escalated.count, 1);

  assert.ok(summary.subject.includes('settled 2'));
  assert.ok(summary.subject.includes('expired 1'));
  assert.ok(summary.subject.includes('escalated 1'));

  assert.ok(summary.html.includes('BOK-AB12CD34-DP'));
  assert.ok(summary.html.includes('tx_mismatch_1'));
  assert.ok(summary.html.includes('/admin-portal/payment-monitor?tx=tx_mismatch_1'));
  assert.ok(!summary.html.includes('BOK-OLD00000-DP'), 'out-of-window tx must not appear');

  assert.ok(summary.text.includes('SETTLED   BOK-AB12CD34-DP'));
  assert.ok(summary.text.includes('ESCALATED BOK-MM33NV44-DP'));
});

test('buildDailyFinanceSummary - escalation notification dedupes against its transaction row', () => {
  const txs = [
    { id: 'tx_dup_1', status: 'PENDING_REVIEW', updatedAt: ts(inWindow), amount: 700, referenceNumber: 'BOK-DUP1C2C3-DP' }
  ];
  const escalations = [
    { id: 'n1', type: 'PAYMENT_MISMATCH_REVIEW', transactionId: 'tx_dup_1', referenceNumber: 'BOK-DUP1C2C3-DP', amount: 700, createdAt: ts(inWindow) }
  ];

  const summary = buildDailyFinanceSummary({
    txs,
    escalations,
    windowStartMs: WINDOW_START,
    windowEndMs: WINDOW_END
  });

  assert.equal(summary.totals.escalated.count, 1, 'same tx via both sources counted once');
  assert.ok(summary.escalated[0].id === 'tx_dup_1');
});

test('buildDailyFinanceSummary - empty window renders the all-clear subject', () => {
  const summary = buildDailyFinanceSummary({
    txs: [],
    escalations: [],
    windowStartMs: WINDOW_START,
    windowEndMs: WINDOW_END
  });
  assert.equal(summary.totals.settled.count, 0);
  assert.equal(summary.totals.expired.count, 0);
  assert.equal(summary.totals.escalated.count, 0);
  assert.ok(summary.subject.includes('settled 0'));
  assert.ok(summary.html.includes('None in this window'));
});
