import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db as firestore } from '../firebase';
import { PaymentEntityKind, collectionForEntity } from './firestoreCollections';
import { getHitPayProxyEndpoint } from '../services/HitPayService';
import {
    clearPendingPaymentMarker,
    getPendingPaymentMarker,
    navigateTo,
    watchPaymentVerification
} from './paymentRedirect';

/**
 * Server-verified payment return handling for HitPay checkout.
 *
 * Central rule: a redirect back from HitPay (`?status=...`) only tells the app
 * that the checkout flow has returned — it is NEVER treated as proof of
 * payment. `handlePaymentReturn()` is the ONE entry point for every return
 * channel:
 *
 *   - ridersbud://payment/return            (native URL scheme)
 *   - https://ridersbud-10806.web.app/payment/return  (App Link fallback)
 *
 * It resolves the local pending transaction, asks the backend to re-verify
 * directly with HitPay (`action=verify`), and routes to the payment status
 * screen. Only the server-settled `paymentTransactions/{id}` = PAID can ever
 * render success. No function here ever writes payment fields to Firestore.
 */

export type PaymentVerificationState =
    | 'INITIALIZING'
    | 'CONNECTING'
    | 'WAITING'
    | 'VERIFYING'
    | 'PAID'
    | 'FAILED'
    | 'CANCELLED'
    | 'EXPIRED'
    | 'PENDING';

export type BackendPaymentStatus = 'completed' | 'failed' | 'canceled' | 'pending' | 'unknown';

/** Same authoritative criteria the entity watcher uses (webhook-written fields). */
export const isPaymentEntityVerified = (data: any): boolean => {
    if (!data) return false;
    if (data.isVerified === true) return true;
    if (typeof data.hitpayStatus === 'string' && data.hitpayStatus.toLowerCase() === 'completed') return true;
    if (typeof data.paymentStatus === 'string' && ['paid', 'Paid'].includes(data.paymentStatus)) return true;
    if (data.gcashPaymentStatus === 'verified') return true;
    return false;
};

// ---------------------------------------------------------------------------
// Return URL parsing (both channels behave identically)
// ---------------------------------------------------------------------------

export interface PaymentReturnInfo {
    transactionId?: string;
    referenceNumber?: string;
    /** HitPay appends `reference` = payment request id on redirect. */
    paymentRequestId?: string;
    /** DISPLAY ONLY — never used as proof of payment. */
    gatewayStatus?: string;
}

const NATIVE_SCHEMES = ['ridersbud:', 'com.sasetin42.ridersbud:'];

/**
 * Parse a payment-return URL from either channel. Returns null for
 * non-return URLs so callers can fall through to generic deep-link handling.
 */
export const parsePaymentReturnUrl = (url: string): PaymentReturnInfo | null => {
    if (!url) return null;
    try {
        const parsed = new URL(url);
        const isNative = NATIVE_SCHEMES.includes(parsed.protocol.toLowerCase());
        const isReturn = isNative
            ? parsed.host === 'payment' && parsed.pathname.startsWith('/return')
            : parsed.pathname === '/payment/return';
        if (!isReturn) return null;

        const params = parsed.searchParams;
        return {
            transactionId: params.get('tx') || params.get('transaction') || undefined,
            referenceNumber: params.get('ref') || params.get('reference_number') || undefined,
            paymentRequestId: params.get('payment_request_id') || params.get('reference') || undefined,
            gatewayStatus: params.get('status') || undefined
        };
    } catch {
        return null;
    }
};

// ---------------------------------------------------------------------------
// Backend access (client sends no credentials)
// ---------------------------------------------------------------------------

/** Fetch our authoritative paymentTransactions record. */
export const fetchPaymentTransaction = async (opts: {
    transactionId?: string;
    paymentRequestId?: string;
    reference?: string;
}): Promise<any | null> => {
    const id = opts.transactionId || opts.paymentRequestId || '';
    const ref = opts.reference || '';
    if (!id && !ref) return null;
    try {
        const endpoint = getHitPayProxyEndpoint(
            `/api/hitpay-proxy?action=transaction&id=${encodeURIComponent(id)}&ref=${encodeURIComponent(ref)}`
        );
        const resp = await fetch(endpoint);
        if (!resp.ok) return null;
        return await resp.json();
    } catch {
        return null;
    }
};

/**
 * Ask the backend to re-verify directly with HitPay and settle idempotently.
 * Safe to call any number of times (webhook-first or callback-first both work).
 */
export const verifyPaymentTransaction = async (opts: {
    transactionId?: string;
    paymentRequestId?: string;
    reference?: string;
    isSandbox?: boolean;
}): Promise<any | null> => {
    const id = opts.transactionId || opts.paymentRequestId || '';
    const ref = opts.reference || '';
    if (!id && !ref) return null;
    try {
        const endpoint = getHitPayProxyEndpoint(
            `/api/hitpay-proxy?action=verify&id=${encodeURIComponent(id)}&ref=${encodeURIComponent(ref)}&sandbox=${opts.isSandbox ? 'true' : 'false'}`
        );
        const resp = await fetch(endpoint);
        if (!resp.ok) return null;
        return await resp.json();
    } catch {
        return null;
    }
};

/** Ask the backend for the authoritative payment-request status (display only). */
export const fetchBackendPaymentStatus = async (
    paymentRequestId?: string,
    isSandbox: boolean = false
): Promise<BackendPaymentStatus> => {
    if (!paymentRequestId) return 'unknown';
    try {
        const endpoint = getHitPayProxyEndpoint(
            `/api/hitpay-proxy?action=status&id=${encodeURIComponent(paymentRequestId)}&sandbox=${isSandbox ? 'true' : 'false'}`
        );
        const resp = await fetch(endpoint);
        if (!resp.ok) return 'unknown';
        const data = await resp.json();
        if (data?.fallbackToPortal) return 'unknown';
        const status = String(data?.status || '').toLowerCase();
        if (status === 'completed' || status === 'paid') return 'completed';
        if (status === 'failed') return 'failed';
        if (status === 'canceled' || status === 'cancelled') return 'canceled';
        if (status) return 'pending';
        return 'unknown';
    } catch {
        return 'unknown';
    }
};

// ---------------------------------------------------------------------------
// Centralized return handler
// ---------------------------------------------------------------------------

const matchesMarker = (marker: ReturnType<typeof getPendingPaymentMarker>, info: PaymentReturnInfo): boolean => {
    if (!marker) return false;
    if (info.transactionId && marker.transactionId === info.transactionId) return true;
    if (info.referenceNumber && marker.referenceNumber === info.referenceNumber) return true;
    if (info.paymentRequestId && marker.paymentRequestId === info.paymentRequestId) return true;
    // No identifying params at all — fall back to the single pending marker
    if (!info.transactionId && !info.referenceNumber && !info.paymentRequestId) return true;
    return false;
};

/**
 * handlePaymentReturn(url)
 *   → parse payment_request_id / reference / transaction
 *   → locate local pending transaction
 *   → trigger backend verification (server → HitPay API)
 *   → navigate to the payment status screen
 *
 * Never trusts `status=completed`. Duplicate calls are harmless (verification
 * and settlement are idempotent).
 */
export const handlePaymentReturn = async (url: string): Promise<{ handled: boolean; info?: PaymentReturnInfo }> => {
    const info = parsePaymentReturnUrl(url);
    if (!info) return { handled: false };

    const marker = getPendingPaymentMarker();
    const resolved = matchesMarker(marker, info) ? marker : null;

    const transactionId = info.transactionId || resolved?.transactionId || '';
    const referenceNumber = info.referenceNumber || resolved?.referenceNumber || '';
    const paymentRequestId = info.paymentRequestId || resolved?.paymentRequestId || '';
    const isSandbox = resolved?.environment === 'sandbox';

    // Kick off server-side verification immediately — if the webhook already
    // settled the transaction this is a no-op; if the webhook is still in
    // flight this makes the app independent of its timing.
    verifyPaymentTransaction({ transactionId, paymentRequestId, reference: referenceNumber, isSandbox })
        .catch(() => { /* watcher keeps retrying */ });

    const params = new URLSearchParams();
    if (transactionId) params.set('tx', transactionId);
    if (referenceNumber) params.set('ref', referenceNumber);
    if (paymentRequestId) params.set('prid', paymentRequestId);
    if (isSandbox) params.set('sb', '1');
    const target = `/payment/return${params.toString() ? `?${params.toString()}` : ''}`;

    const alreadyThere = typeof window !== 'undefined' && window.location.pathname === '/payment/return';
    if (!alreadyThere) {
        navigateTo(target);
    }

    return { handled: true, info };
};

// ---------------------------------------------------------------------------
// Transaction-driven verification watcher (used by the status screen/overlay)
// ---------------------------------------------------------------------------

export interface TransactionWatchParams {
    transactionId?: string;
    paymentRequestId?: string;
    referenceNumber?: string;
    isSandbox?: boolean;
    /** How long to keep verifying before reporting PENDING (default 3 min). */
    timeoutMs?: number;
    onState: (state: PaymentVerificationState, message: string, tx?: any) => void;
    /** Fired exactly once when the server settles the transaction as PAID. */
    onVerified?: (tx: any) => void;
}

const stateFromTxStatus = (status: string): PaymentVerificationState | null => {
    switch (String(status || '').toUpperCase()) {
        case 'PAID': return 'PAID';
        case 'FAILED': return 'FAILED';
        case 'CANCELLED': return 'CANCELLED';
        case 'EXPIRED': return 'EXPIRED';
        default: return null;
    }
};

/**
 * Watch a returned payment: Firestore transaction doc (server truth) + backend
 * verify calls with exponential backoff. Returns a disposer.
 */
export const watchTransactionReturnVerification = (params: TransactionWatchParams): (() => void) => {
    const {
        transactionId,
        paymentRequestId,
        referenceNumber,
        isSandbox = false,
        timeoutMs = 3 * 60 * 1000,
        onState,
        onVerified
    } = params;

    let disposed = false;
    let settled = false;
    let lastKey = '';
    const cleanups: Array<() => void> = [];

    const emit = (state: PaymentVerificationState, message: string, tx?: any) => {
        if (disposed) return;
        const key = `${state}:${message}`;
        if (key === lastKey) return;
        lastKey = key;
        onState(state, message, tx);
    };

    const finish = (state: PaymentVerificationState, message: string, tx?: any) => {
        if (disposed || settled) return;
        settled = true;
        cleanup();
        emit(state, message, tx);
        if (state === 'PAID') onVerified?.(tx);
    };

    emit('VERIFYING', 'Verifying your payment with HitPay…');

    // 1. Realtime listener on the authoritative transaction record
    if (transactionId && firestore) {
        try {
            const unsub = onSnapshot(
                doc(firestore, 'paymentTransactions', transactionId),
                (snap) => {
                    if (disposed || settled || !snap.exists()) return;
                    const tx: any = { transactionId: snap.id, ...snap.data() };
                    const terminal = stateFromTxStatus(tx.status);
                    if (terminal === 'PAID') {
                        finish('PAID', 'Your payment has been verified by HitPay.', tx);
                    } else if (terminal) {
                        finish(terminal, terminal === 'FAILED' ? 'HitPay could not complete your payment.'
                            : terminal === 'CANCELLED' ? 'The payment was cancelled.'
                                : 'This payment request has expired.', tx);
                    } else {
                        emit('VERIFYING', 'Payment received — finalizing confirmation…', tx);
                    }
                },
                () => { /* stream errors: verify polling below still runs */ }
            );
            cleanups.push(unsub);
        } catch { /* ignore */ }
    }

    // 2. Backend verify calls with exponential backoff
    const delays = [500, 2000, 4000, 8000, 15000, 30000, 30000, 30000];
    let elapsed = 0;
    delays.forEach((delay) => {
        elapsed += delay;
        if (elapsed > timeoutMs) return;
        const timer = window.setTimeout(async () => {
            if (disposed || settled) return;
            const res = await verifyPaymentTransaction({
                transactionId,
                paymentRequestId,
                reference: referenceNumber,
                isSandbox
            }).catch(() => null);
            if (disposed || settled || !res) return;
            const tx = res.transaction || null;
            const terminal = stateFromTxStatus(res.result?.status || tx?.status);
            if (terminal === 'PAID') {
                finish('PAID', 'Your payment has been verified by HitPay.', tx);
            } else if (terminal) {
                finish(terminal, terminal === 'FAILED' ? 'HitPay could not complete your payment.'
                    : terminal === 'CANCELLED' ? 'The payment was cancelled.'
                        : 'This payment request has expired.', tx);
            } else if (res.result?.verificationStatus === 'AMOUNT_MISMATCH') {
                finish('PENDING', 'We received your payment but it needs manual review. Our team will update you shortly.', tx);
            } else {
                emit('VERIFYING', 'Waiting for HitPay confirmation — this usually takes a few seconds…', tx);
            }
        }, delay);
        cleanups.push(() => window.clearTimeout(timer));
    });

    // 3. Timeout → PENDING display state (verification continues server-side)
    const timeoutTimer = window.setTimeout(() => {
        if (disposed || settled) return;
        settled = true;
        cleanup();
        emit('PENDING', 'Payment verification is still in progress. We will notify you automatically once HitPay confirms.');
    }, timeoutMs);
    cleanups.push(() => window.clearTimeout(timeoutTimer));

    function cleanup() {
        while (cleanups.length) {
            try { cleanups.pop()?.(); } catch { /* ignore */ }
        }
    }

    return () => {
        if (disposed) return;
        disposed = true;
        cleanup();
    };
};

// ---------------------------------------------------------------------------
// Legacy entity-level watcher (kept for screens without a transaction id)
// ---------------------------------------------------------------------------

export interface PaymentReturnVerificationParams {
    entityKind: PaymentEntityKind;
    entityId: string;
    paymentRequestId?: string;
    isSandbox?: boolean;
    /** How long to wait for the webhook before reporting PENDING (default 3 min). */
    timeoutMs?: number;
    onState: (state: PaymentVerificationState, message: string) => void;
    /** Fired exactly once, only when the webhook's Firestore write is observed. */
    onVerified: () => void;
}

/**
 * Watch a returned payment: Firestore (webhook, authoritative) + backend status
 * endpoint (display only). Returns a disposer.
 */
export const watchPaymentReturnVerification = (
    params: PaymentReturnVerificationParams
): (() => void) => {
    const {
        entityKind,
        entityId,
        paymentRequestId,
        isSandbox = false,
        timeoutMs = 3 * 60 * 1000,
        onState,
        onVerified
    } = params;

    let disposed = false;
    let settled = false;
    let lastKey = '';

    const emit = (state: PaymentVerificationState, message: string) => {
        if (disposed) return;
        const key = `${state}:${message}`;
        if (key === lastKey) return;
        lastKey = key;
        onState(state, message);
    };

    emit('VERIFYING', 'Please wait while HitPay confirms your payment.');

    const stopWatch = watchPaymentVerification(
        entityKind,
        entityId,
        () => {
            // Authoritative webhook write observed — the ONLY path to PAID.
            if (disposed || settled) return;
            settled = true;
            cleanup();
            clearPendingPaymentMarker();
            emit('PAID', 'Your payment has been verified by HitPay.');
            onVerified();
        },
        async () => {
            // Watcher timeout → ask the backend one last time, then settle.
            if (disposed || settled) return;
            const backend = await fetchBackendPaymentStatus(paymentRequestId, isSandbox);
            if (disposed || settled) return;
            if (backend === 'failed' || backend === 'canceled') {
                settled = true;
                cleanup();
                emit(
                    backend === 'failed' ? 'FAILED' : 'CANCELLED',
                    backend === 'failed'
                        ? 'HitPay could not complete your payment.'
                        : 'The payment was cancelled.'
                );
                return;
            }
            settled = true;
            cleanup();
            emit(
                'PENDING',
                backend === 'completed'
                    ? 'HitPay received your payment — we are waiting for final confirmation.'
                    : 'We have not received a confirmation yet. We will notify you once HitPay confirms.'
            );
        },
        timeoutMs
    );

    // Backend status polls — display only, never writes.
    const pollBackend = async () => {
        if (disposed || settled) return;
        const backend = await fetchBackendPaymentStatus(paymentRequestId, isSandbox);
        if (disposed || settled) return;
        if (backend === 'completed') {
            emit('VERIFYING', 'Payment received — finalizing confirmation...');
        } else if (backend === 'failed') {
            settled = true;
            cleanup();
            emit('FAILED', 'HitPay could not complete your payment.');
        } else if (backend === 'canceled') {
            settled = true;
            cleanup();
            emit('CANCELLED', 'The payment was cancelled.');
        }
    };

    const firstPoll = window.setTimeout(pollBackend, 2500);
    const pollTimer = window.setInterval(pollBackend, 10000);

    function cleanup() {
        window.clearTimeout(firstPoll);
        window.clearInterval(pollTimer);
        try { stopWatch(); } catch { /* already disposed */ }
    }

    return () => {
        if (disposed) return;
        disposed = true;
        cleanup();
    };
};

/**
 * Best-effort fetch of the authoritative (webhook-written) entity document.
 * Used by screens to build post-payment UI from Firestore instead of from
 * redirect parameters.
 */
export const fetchPaymentEntitySnapshot = async (
    entityKind: PaymentEntityKind,
    entityId: string
): Promise<any | null> => {
    if (!firestore || !entityId) return null;
    try {
        const snap = await getDoc(doc(firestore, collectionForEntity(entityKind), entityId));
        return snap.exists() ? { id: snap.id, ...snap.data() } : null;
    } catch {
        return null;
    }
};
