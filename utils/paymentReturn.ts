import { doc, getDoc } from 'firebase/firestore';
import { db as firestore } from '../firebase';
import { PaymentEntityKind, collectionForEntity } from './firestoreCollections';
import { getHitPayProxyEndpoint } from '../services/HitPayService';
import { clearPendingPaymentMarker, watchPaymentVerification } from './paymentRedirect';

/**
 * Server-verified payment return handling for HitPay checkout.
 *
 * The redirect back from HitPay (?status=completed&reference=...) only tells the
 * app that the checkout flow has returned — it is NEVER treated as proof of
 * payment (requirement #8 / #11). This module:
 *
 *   1. Shows "Verifying your payment..." immediately on return.
 *   2. Polls the backend hitpayProxy status endpoint (server → HitPay API) for
 *      DISPLAY ONLY — it never writes to Firestore.
 *   3. Waits for the webhook's authoritative Firestore write before reporting
 *      PAID ("Payment Successful").
 *   4. Falls back to FAILED / CANCELLED / PENDING display states.
 *
 * No function here ever writes payment fields to Firestore.
 */

export type PaymentVerificationState = 'VERIFYING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'PENDING';

export type BackendPaymentStatus = 'completed' | 'failed' | 'canceled' | 'pending' | 'unknown';

/** Same authoritative criteria the Custom Tab watcher uses (webhook-written fields). */
export const isPaymentEntityVerified = (data: any): boolean => {
    if (!data) return false;
    if (data.isVerified === true) return true;
    if (typeof data.hitpayStatus === 'string' && data.hitpayStatus.toLowerCase() === 'completed') return true;
    if (typeof data.paymentStatus === 'string' && data.paymentStatus.toLowerCase() === 'paid') return true;
    if (data.gcashPaymentStatus === 'verified') return true;
    return false;
};

/**
 * Asks the backend for the authoritative payment-request status.
 * The client sends no credentials — hitpayProxy resolves them server-side and
 * queries the HitPay API directly.
 */
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
