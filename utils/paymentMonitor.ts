/**
 * Payment Monitor — pure categorization & diagnostics for the admin
 * `paymentTransactions` monitoring screen (pages/admin/AdminPaymentMonitorScreen.tsx).
 *
 * Kept free of Firebase/React imports so the classification rules are unit
 * testable (test/paymentMonitor.test.ts) and reusable in scripts.
 *
 * Signal sources (written by functions/lib/hitpay.js settlement):
 *  - status                  — lifecycle state (CHECKOUT_OPEN → … → PAID/…)
 *  - verificationStatus      — last settlement verdict (UNVERIFIED, AMOUNT_MISMATCH, …)
 *  - lastVerificationStatus  — why the most recent verify attempt did NOT settle
 *                              (GATEWAY_UNAVAILABLE, GATEWAY_PENDING, …)
 *  - stateHistory[]          — ordered lifecycle transitions with timestamps
 */

export type PaymentMonitorCategory =
    | 'mismatch'
    | 'retrying'
    | 'stuck'
    | 'verifying'
    | 'paid'
    | 'failed'
    | 'cancelled'
    | 'expired'
    | 'other';

export interface PaymentStateHistoryEntry {
    status?: string;
    timestamp?: string;
    reason?: string;
}

export interface PaymentTransactionLike {
    id: string;
    status?: string;
    verificationStatus?: string;
    lastVerificationStatus?: string;
    lastVerificationReason?: string;
    lastVerificationTrigger?: string;
    lastVerificationAt?: any;
    stateHistory?: PaymentStateHistoryEntry[];
    createdAt?: any;
    updatedAt?: any;
    [key: string]: any;
}

export const TERMINAL_STATUSES = ['PAID', 'FAILED', 'CANCELLED', 'EXPIRED'] as const;

/** Non-terminal lifecycle states that still expect a settlement. */
export const ACTIVE_NON_TERMINAL_STATUSES = [
    'INITIALIZING',
    'CHECKOUT_OPEN',
    'WAITING_FOR_PAYMENT',
    'VERIFYING'
] as const;

/** Settlement verdicts that mean "gateway confirmed the payment, but values disagree". */
export const MISMATCH_VERIFICATION_STATUSES = [
    'AMOUNT_MISMATCH',
    'CURRENCY_MISMATCH',
    'REFERENCE_MISMATCH'
] as const;

/**
 * lastVerificationStatus values written when a verify attempt could not settle
 * and the system will (or should) retry — the "actively retrying" signals.
 */
export const RETRYING_VERIFICATION_STATUSES = [
    'GATEWAY_UNAVAILABLE',
    'GATEWAY_PENDING',
    'AWAITING_GATEWAY_VERIFICATION'
] as const;

/** A non-terminal transaction older than this (since last update) is considered stuck. */
export const STUCK_THRESHOLD_MS = 10 * 60 * 1000;

/** Firestore Timestamp / ISO / epoch → epoch ms (0 when unparseable). */
export const toMillis = (v: any): number => {
    if (!v) return 0;
    if (typeof v?.toMillis === 'function') {
        try { return v.toMillis(); } catch { return 0; }
    }
    if (typeof v?.seconds === 'number') return v.seconds * 1000;
    const d = new Date(v);
    return isNaN(d.getTime()) ? 0 : d.getTime();
};

/**
 * Classify a payment transaction for the monitor.
 *
 * Priority (most actionable first):
 *   1. mismatch  — PENDING_REVIEW or a *_MISMATCH verification verdict
 *   2. retrying  — non-terminal AND the last verify attempt could not settle
 *                  (GATEWAY_UNAVAILABLE / GATEWAY_PENDING / AWAITING_GATEWAY_VERIFICATION)
 *   3. stuck     — non-terminal AND untouched for > STUCK_THRESHOLD_MS
 *   4. verifying — non-terminal and still inside the normal window
 *   5. terminal  — paid | failed | cancelled | expired
 */
export const categorizeTransaction = (
    tx: PaymentTransactionLike,
    nowMs: number = Date.now(),
    stuckThresholdMs: number = STUCK_THRESHOLD_MS
): PaymentMonitorCategory => {
    const status = String(tx?.status || '').toUpperCase();
    const verification = String(tx?.verificationStatus || '').toUpperCase();
    const lastVerification = String(tx?.lastVerificationStatus || '').toUpperCase();

    // 1. Mismatch — settlement blocked because gateway values disagree with ours.
    if (status === 'PENDING_REVIEW') return 'mismatch';
    if ((MISMATCH_VERIFICATION_STATUSES as readonly string[]).includes(verification)) return 'mismatch';

    // Terminal states are absorbing — mismatches already handled above.
    if ((TERMINAL_STATUSES as readonly string[]).includes(status)) {
        switch (status) {
            case 'PAID': return 'paid';
            case 'FAILED': return 'failed';
            case 'CANCELLED': return 'cancelled';
            case 'EXPIRED': return 'expired';
            default: return 'other';
        }
    }

    // 2. Retrying — verification is running but the gateway side is not answering yet.
    if ((RETRYING_VERIFICATION_STATUSES as readonly string[]).includes(lastVerification)) return 'retrying';

    // 3/4. Stuck vs still-fresh non-terminal payment.
    if ((ACTIVE_NON_TERMINAL_STATUSES as readonly string[]).includes(status)) {
        const lastTouch = toMillis(tx?.updatedAt) || toMillis(tx?.createdAt) || 0;
        const age = lastTouch > 0 ? nowMs - lastTouch : 0;
        // Unknown timestamps: treat as stuck so they always surface for review.
        if (lastTouch === 0 || age > stuckThresholdMs) return 'stuck';
        return 'verifying';
    }

    return 'other';
};

export interface PaymentMonitorCounts {
    mismatch: number;
    retrying: number;
    stuck: number;
    verifying: number;
    paid: number;
    failed: number;
    cancelled: number;
    expired: number;
    other: number;
    attention: number; // mismatch + retrying + stuck
}

export const countByCategory = (items: PaymentTransactionLike[], nowMs: number = Date.now()): PaymentMonitorCounts => {
    const counts: PaymentMonitorCounts = {
        mismatch: 0, retrying: 0, stuck: 0, verifying: 0,
        paid: 0, failed: 0, cancelled: 0, expired: 0, other: 0, attention: 0
    };
    for (const tx of items) {
        const c = categorizeTransaction(tx, nowMs);
        counts[c] += 1;
    }
    counts.attention = counts.mismatch + counts.retrying + counts.stuck;
    return counts;
};

/** Money moved to the gateway but settlement is blocked — the critical ops metric. */
export const sumAttentionAmount = (items: PaymentTransactionLike[], nowMs: number = Date.now()): number => {
    return items
        .filter((tx) => ['mismatch', 'retrying', 'stuck'].includes(categorizeTransaction(tx, nowMs)))
        .reduce((s, tx) => s + (Number(tx?.amount) || 0), 0);
};

/**
 * Human-readable hint for why a verification attempt did not settle.
 * Maps lastVerificationReason/status + lifecycle position to operator guidance.
 */
export const explainVerificationSignal = (tx: PaymentTransactionLike): string => {
    const reason = String(tx?.lastVerificationReason || '').toLowerCase();
    const status = String(tx?.status || '').toUpperCase();
    const lastVerification = String(tx?.lastVerificationStatus || '').toUpperCase();

    if (reason.includes('amount mismatch') || reason.includes('currency mismatch') || reason.includes('reference mismatch')) {
        return `Gateway values disagree with our records — settlement blocked pending manual review. (${reason})`;
    }
    if (reason.includes('gateway_status_pending')) {
        return 'HitPay reports this payment request is still UNPAID — the customer likely never completed checkout.';
    }
    if (reason.includes('http_404') || reason.includes('http_401') || reason.includes('http_403')) {
        return 'The gateway payment request could not be found/authorized with the recorded environment — environment or credential mismatch.';
    }
    if (reason.includes('upstream_unreachable') || lastVerification === 'GATEWAY_UNAVAILABLE') {
        return 'The HitPay API could not be reached from the server during the last verification attempt — retrying.';
    }
    if (lastVerification === 'AWAITING_GATEWAY_VERIFICATION' || reason.includes('missing payment_request_id')) {
        return 'This transaction has no gateway payment request id — it never reached the HitPay checkout step.';
    }
    if (lastVerification === 'GATEWAY_PENDING' || reason.includes('gateway_status_')) {
        return `HitPay has not reported a terminal payment status yet (last known: ${reason || 'pending'}).`;
    }

    // stateHistory-driven hints
    const history = Array.isArray(tx?.stateHistory) ? tx.stateHistory : [];
    const lastState = String(history[history.length - 1]?.status || status).toUpperCase();
    if (status === 'CHECKOUT_OPEN' || lastState === 'CHECKOUT_OPEN') {
        return 'Checkout opened at HitPay but no payment was completed — waiting on the customer.';
    }
    if (lastState === 'VERIFYING') {
        return 'Payment was reported and verification started, but the transaction never reached a terminal state.';
    }
    if (lastState === 'WAITING_FOR_PAYMENT') {
        return 'Waiting for the customer to complete payment at the gateway.';
    }
    return 'No settlement yet — keep monitoring or trigger a manual re-verification.';
};

/** Compact relative time for table cells ("3m ago", "in 2h"). */
export const formatRelativeTime = (ms: number, nowMs: number = Date.now()): string => {
    if (!ms) return '—';
    const diff = nowMs - ms;
    const abs = Math.abs(diff);
    const suffix = diff >= 0 ? 'ago' : 'from now';
    if (abs < 60_000) return `${Math.max(1, Math.round(abs / 1000))}s ${suffix}`;
    if (abs < 3_600_000) return `${Math.round(abs / 60_000)}m ${suffix}`;
    if (abs < 86_400_000) return `${Math.round(abs / 3_600_000)}h ${suffix}`;
    return `${Math.round(abs / 86_400_000)}d ${suffix}`;
};

export const CATEGORY_META: Record<PaymentMonitorCategory, { label: string; pill: string; dot: string }> = {
    mismatch: { label: 'Mismatch', pill: 'bg-rose-500/15 text-rose-300 border-rose-500/40', dot: 'bg-rose-400' },
    retrying: { label: 'Retrying', pill: 'bg-amber-500/15 text-amber-300 border-amber-500/40', dot: 'bg-amber-400' },
    stuck: { label: 'Stuck', pill: 'bg-orange-500/15 text-orange-300 border-orange-500/40', dot: 'bg-orange-400' },
    verifying: { label: 'Verifying', pill: 'bg-sky-500/15 text-sky-300 border-sky-500/40', dot: 'bg-sky-400' },
    paid: { label: 'Paid', pill: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40', dot: 'bg-emerald-400' },
    failed: { label: 'Failed', pill: 'bg-red-500/15 text-red-300 border-red-500/40', dot: 'bg-red-400' },
    cancelled: { label: 'Cancelled', pill: 'bg-gray-500/15 text-gray-300 border-gray-500/40', dot: 'bg-gray-400' },
    expired: { label: 'Expired', pill: 'bg-purple-500/15 text-purple-300 border-purple-500/40', dot: 'bg-purple-400' },
    other: { label: 'Other', pill: 'bg-white/10 text-gray-300 border-white/20', dot: 'bg-gray-400' }
};
