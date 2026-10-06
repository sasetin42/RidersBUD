/**
 * Daily Finance Email — pure helpers for the scheduled payment digest
 * (exports.paymentDailyFinanceEmail in ../index.js).
 *
 * Kept free of firebase-admin / nodemailer so classification and HTML building
 * stay unit-testable (test/financeEmail.test.js).
 *
 * Buckets (window = the trailing 24h at send time):
 *  - settled   — paymentTransactions that reached PAID inside the window
 *  - expired   — sessions that ended EXPIRED inside the window (no money moved)
 *  - escalated — PENDING_REVIEW mismatches, sweep escalations, or *_MISMATCH
 *                verdicts inside the window (manual action required)
 */

const MISMATCH_VERIFICATION_STATUSES = [
    'AMOUNT_MISMATCH',
    'CURRENCY_MISMATCH',
    'REFERENCE_MISMATCH'
];

/** Firestore Timestamp / ISO / epoch → epoch ms (0 when unparseable). */
function toMillis(value) {
    if (!value) return 0;
    if (typeof value.toMillis === 'function') {
        try { return value.toMillis(); } catch (_) { return 0; }
    }
    if (typeof value.seconds === 'number') return value.seconds * 1000;
    const d = new Date(value);
    return isNaN(d.getTime()) ? 0 : d.getTime();
}

function inWindow(ms, windowStartMs, windowEndMs) {
    return Number.isFinite(ms) && ms > 0 && ms >= windowStartMs && ms <= windowEndMs;
}

/**
 * Classify one paymentTransactions doc into a digest bucket.
 * @returns {'settled'|'expired'|'escalated'|null}
 */
function classifyDailyTx(tx, windowStartMs, windowEndMs) {
    if (!tx) return null;
    const status = String(tx.status || '').toUpperCase();
    const verification = String(tx.verificationStatus || '').toUpperCase();

    const paidMs = toMillis(tx.paidAt) || toMillis(tx.verifiedAt);
    const updatedMs = toMillis(tx.updatedAt);
    const escalatedMs = toMillis(tx.escalatedAt);

    if (status === 'PAID') {
        if (inWindow(paidMs, windowStartMs, windowEndMs)) return 'settled';
        // Terminal docs are never rewritten, so an updatedAt inside the window
        // with no paidAt/verifiedAt means the settlement was first written then.
        if (!paidMs && inWindow(updatedMs, windowStartMs, windowEndMs)) return 'settled';
        return null;
    }
    if (status === 'EXPIRED') {
        return inWindow(updatedMs, windowStartMs, windowEndMs) ? 'expired' : null;
    }
    if (status === 'PENDING_REVIEW') {
        return inWindow(updatedMs, windowStartMs, windowEndMs) ? 'escalated' : null;
    }
    // Sweep escalations on still-unsettled transactions.
    if (inWindow(escalatedMs, windowStartMs, windowEndMs)) return 'escalated';
    if (
        MISMATCH_VERIFICATION_STATUSES.includes(verification) &&
        inWindow(updatedMs, windowStartMs, windowEndMs)
    ) return 'escalated';
    return null;
}

/** ₱1,234.56 formatting consistent with the Payment Monitor. */
function peso(n) {
    const v = Number(n) || 0;
    return `\u20B1${v.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function esc(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

const MAX_ROWS_PER_SECTION = 15;

function txRowHtml(tx, monitorUrlBase) {
    const txId = String(tx.id || tx.transactionId || '');
    const monitorLink = monitorUrl(txId, tx.referenceNumber, monitorUrlBase);
    const whenMs = toMillis(tx.paidAt || tx.verifiedAt || tx.updatedAt || tx.escalatedAt || tx.createdAt);
    const when = whenMs
        ? new Date(whenMs).toLocaleString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
        : '—';
    return `<tr>
      <td style="padding:6px 10px;border-bottom:1px solid #222;font-family:monospace;font-size:12px;color:#eee;">${esc(tx.referenceNumber || txId || '—')}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #222;font-size:12px;color:#aaa;">${esc(tx.entityKind || 'entity')} · ${esc(String(tx.entityId || '').slice(-8).toUpperCase() || '—')}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #222;font-size:12px;color:#aaa;">${esc(tx.paymentMethod || (tx.fromNotification ? '—' : 'HitPay'))}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #222;font-size:12px;color:#fff;font-weight:600;text-align:right;">${peso(tx.amount)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #222;font-size:11px;color:#888;">${esc(when)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #222;text-align:right;">
        ${monitorLink ? `<a href="${monitorLink}" style="color:#4ade80;font-size:11px;font-weight:700;text-decoration:none;">Open monitor →</a>` : ''}
      </td>
    </tr>`;
}

function monitorUrl(transactionId, referenceNumber, monitorUrlBase) {
    if (!monitorUrlBase) return '';
    const needle = String(transactionId || referenceNumber || '').trim();
    if (!needle) return monitorUrlBase;
    return `${monitorUrlBase}?tx=${encodeURIComponent(needle)}`;
}

/**
 * Build the full digest email.
 *
 * @param {object} p
 * @param {Array<object>} p.txs paymentTransactions docs (id + data) touched in the window
 * @param {Array<object>} p.escalations adminNotifications docs created in the window
 * @param {number} p.windowStartMs
 * @param {number} p.windowEndMs
 * @param {string} [p.monitorBaseUrl] deep-link base, e.g. https://…/admin-portal/payment-monitor
 * @returns {{subject: string, html: string, text: string, totals: object, settled: Array, expired: Array, escalated: Array}}
 */
function buildDailyFinanceSummary({ txs = [], escalations = [], windowStartMs, windowEndMs, monitorBaseUrl = '' }) {
    const monitorUrlBase = String(monitorBaseUrl || '').replace(/\/$/, '');

    const settled = [];
    const expired = [];
    const escalated = [];
    const escalatedTxIds = new Set();

    for (const tx of txs) {
        const withId = tx.id ? tx : { ...tx, id: tx.transactionId || '' };
        const bucket = classifyDailyTx(withId, windowStartMs, windowEndMs);
        if (bucket === 'settled') settled.push(withId);
        else if (bucket === 'expired') expired.push(withId);
        else if (bucket === 'escalated') {
            escalated.push(withId);
            escalatedTxIds.add(withId.id);
        }
    }

    // Merge escalation notifications (richer reasons); skip ones already listed via their tx.
    const ESCALATION_TYPES = ['PAYMENT_MISMATCH_REVIEW', 'PAYMENT_SETTLEMENT_ESCALATION'];
    for (const n of (escalations || [])) {
        if (!ESCALATION_TYPES.includes(String(n.type))) continue;
        const txId = String(n.transactionId || '');
        if (txId && escalatedTxIds.has(txId)) continue;
        if (txId) escalatedTxIds.add(txId);
        escalated.push({
            id: txId || String(n.id || ''),
            fromNotification: true,
            referenceNumber: n.referenceNumber || '',
            entityKind: n.entityKind || '',
            entityId: n.entityId || '',
            amount: Number(n.amount) || Number(n.gatewayAmount) || 0,
            paymentMethod: '',
            failureReason: n.escalationReason || n.reason || n.stuckStatus || '',
            escalatedAt: n.createdAt || null
        });
    }

    const sum = (rows) => rows.reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const totals = {
        settled: { count: settled.length, amount: sum(settled) },
        expired: { count: expired.length, amount: sum(expired) },
        escalated: { count: escalated.length, amount: sum(escalated) }
    };

    const dayLabel = new Date(windowEndMs).toLocaleDateString('en-PH', {
        timeZone: 'Asia/Manila', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const section = (title, color, rows, note) => {
        const shown = rows.slice(0, MAX_ROWS_PER_SECTION);
        const more = rows.length - shown.length;
        return `<h2 style="margin:24px 0 8px;font-size:14px;color:${color};letter-spacing:.05em;text-transform:uppercase;">
          ${title} — ${rows.length} (${peso(sum(rows))})
        </h2>
        ${note ? `<p style="margin:0 0 8px;font-size:12px;color:#888;">${note}</p>` : ''}
        ${rows.length === 0
                ? `<p style="margin:0;font-size:12px;color:#666;">None in this window. 🎉</p>`
                : `<table style="border-collapse:collapse;width:100%;">
            <thead><tr>
              <th align="left" style="padding:6px 10px;border-bottom:2px solid #333;font-size:10px;color:#777;text-transform:uppercase;">Reference</th>
              <th align="left" style="padding:6px 10px;border-bottom:2px solid #333;font-size:10px;color:#777;text-transform:uppercase;">Entity</th>
              <th align="left" style="padding:6px 10px;border-bottom:2px solid #333;font-size:10px;color:#777;text-transform:uppercase;">Method</th>
              <th align="right" style="padding:6px 10px;border-bottom:2px solid #333;font-size:10px;color:#777;text-transform:uppercase;">Amount</th>
              <th align="left" style="padding:6px 10px;border-bottom:2px solid #333;font-size:10px;color:#777;text-transform:uppercase;">When (MNL)</th>
              <th></th>
            </tr></thead>
            <tbody>${shown.map((row) => txRowHtml(row, monitorUrlBase)).join('')}</tbody>
          </table>
          ${more > 0 ? `<p style="font-size:11px;color:#666;margin:6px 0 0;">+ ${more} more…</p>` : ''}`}`;
    };

    const html = `<div style="background:#0f0f10;padding:24px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:720px;margin:0 auto;background:#161618;border:1px solid #262626;border-radius:16px;padding:24px;">
      <h1 style="margin:0 0 4px;font-size:20px;color:#fff;">RidersBUD Daily Finance Summary</h1>
      <p style="margin:0 0 16px;font-size:12px;color:#888;">${esc(dayLabel)} · trailing 24h · Asia/Manila</p>

      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:8px;">
        <div style="flex:1;min-width:140px;background:#0a221a;border:1px solid #14532d;border-radius:12px;padding:12px;">
          <p style="margin:0;font-size:10px;color:#4ade80;text-transform:uppercase;letter-spacing:.08em;">Settled</p>
          <p style="margin:4px 0 0;font-size:22px;color:#fff;font-weight:800;">${totals.settled.count}</p>
          <p style="margin:0;font-size:12px;color:#86efac;">${peso(totals.settled.amount)} verified</p>
        </div>
        <div style="flex:1;min-width:140px;background:#1f1428;border:1px solid #6b21a8;border-radius:12px;padding:12px;">
          <p style="margin:0;font-size:10px;color:#d8b4fe;text-transform:uppercase;letter-spacing:.08em;">Expired</p>
          <p style="margin:4px 0 0;font-size:22px;color:#fff;font-weight:800;">${totals.expired.count}</p>
          <p style="margin:0;font-size:12px;color:#d8b4fe;">${peso(totals.expired.amount)} never collected</p>
        </div>
        <div style="flex:1;min-width:140px;background:#2a1215;border:1px solid #b91c1c;border-radius:12px;padding:12px;">
          <p style="margin:0;font-size:10px;color:#fca5a5;text-transform:uppercase;letter-spacing:.08em;">Escalated</p>
          <p style="margin:4px 0 0;font-size:22px;color:#fff;font-weight:800;">${totals.escalated.count}</p>
          <p style="margin:0;font-size:12px;color:#fca5a5;">${peso(totals.escalated.amount)} needs review</p>
        </div>
      </div>

      ${section('Settled payments', '#4ade80', settled)}
      ${section('Expired sessions', '#d8b4fe', expired, 'No money moved. Customers can retry from their booking detail screen with a fresh HitPay session.')}
      ${section('Escalations needing review', '#f87171', escalated, 'Open each in the Payment Monitor to diagnose and re-verify with HitPay.')}

      <p style="margin:28px 0 0;padding-top:16px;border-top:1px solid #262626;font-size:11px;color:#666;">
        Generated automatically by RidersBUD Cloud Functions. Live board:
        ${monitorUrlBase ? `<a href="${monitorUrlBase}" style="color:#4ade80;">${esc(monitorUrlBase)}</a>` : 'Payment Monitor'}
      </p>
    </div>
  </div>`;

    const text = [
        `RidersBUD Daily Finance Summary — ${dayLabel} (trailing 24h, Asia/Manila)`,
        ``,
        `Settled:   ${totals.settled.count} payments, ${peso(totals.settled.amount)}`,
        `Expired:   ${totals.expired.count} sessions, ${peso(totals.expired.amount)} never collected`,
        `Escalated: ${totals.escalated.count} needing review, ${peso(totals.escalated.amount)}`,
        ``,
        ...settled.map((t) => `SETTLED   ${t.referenceNumber || t.id}  ${peso(t.amount)}`),
        ...expired.map((t) => `EXPIRED   ${t.referenceNumber || t.id}  ${peso(t.amount)}`),
        ...escalated.map((t) => `ESCALATED ${t.referenceNumber || t.id}  ${peso(t.amount)}  ${t.failureReason || ''}`),
        monitorUrlBase ? `\nLive board: ${monitorUrlBase}` : ''
    ].join('\n');

    const subject = `RidersBUD Daily Finance — settled ${totals.settled.count} (${peso(totals.settled.amount)}), expired ${totals.expired.count}, escalated ${totals.escalated.count}`;

    return { subject, html, text, totals, settled, expired, escalated };
}

module.exports = {
    MISMATCH_VERIFICATION_STATUSES,
    classifyDailyTx,
    buildDailyFinanceSummary,
    toMillis
};
