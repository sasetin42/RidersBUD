import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db as firestore, auth } from '../firebase';
import { PaymentEntityKind, collectionForEntity } from './firestoreCollections';
import { getHitPayProxyEndpoint } from '../services/HitPayService';
import {
    clearPendingPaymentMarker,
    getPendingPaymentMarker,
    navigateTo,
    watchPaymentVerification
} from './paymentRedirect';
import { PaymentController } from '../services/payment/PaymentController';

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
    /** HitPay session ID `s` or `session` from redirect params. */
    paymentSessionId?: string;
    /** DISPLAY ONLY — never used as proof of payment. */
    gatewayStatus?: string;
}

const NATIVE_SCHEMES = ['ridersbud:', 'com.sasetin42.ridersbud:'];

/**
 * §13 RETURN-URL VALIDATION — an HTTPS return is only honoured when it comes
 * from a verified RidersBUD origin. Without this check any site could mint
 * `https://attacker.tld/payment/return?...` and drive the payment-return
 * handler. Custom schemes stay restricted to `ridersbud://payment/return`.
 */
const ALLOWED_RETURN_HOSTS = new Set([
    'ridersbud-10806.web.app',
    'ridersbud-10806.firebaseapp.com',
    'ridersbud.web.app',
    'ridersbud.firebaseapp.com'
]);

const isTrustedReturnOrigin = (parsed: URL): boolean => {
    if (parsed.protocol.toLowerCase() !== 'https:') return false;
    return ALLOWED_RETURN_HOSTS.has(parsed.hostname.toLowerCase());
};

/**
 * Parse a payment-return URL from either channel. Returns null for
 * non-return URLs so callers can fall through to generic deep-link handling.
 */
export const parsePaymentReturnUrl = (url: string): PaymentReturnInfo | null => {
    if (!url) return null;
    try {
        const parsed = new URL(url);
        const isNative = NATIVE_SCHEMES.includes(parsed.protocol.toLowerCase());
        if (!isNative && !isTrustedReturnOrigin(parsed)) return null;
        const isReturn = isNative
            ? parsed.host === 'payment' && parsed.pathname.startsWith('/return')
            : parsed.pathname === '/payment/return';
        if (!isReturn) return null;

        const params = parsed.searchParams;
        return {
            transactionId: params.get('tx') || params.get('transaction') || undefined,
            referenceNumber: params.get('ref') || params.get('reference_number') || undefined,
            paymentRequestId: params.get('payment_request_id') || params.get('reference') || undefined,
            paymentSessionId: params.get('s') || params.get('session') || params.get('paymentSessionId') || undefined,
            gatewayStatus: params.get('status') || undefined
        };
    } catch {
        return null;
    }
};

// ---------------------------------------------------------------------------
// Backend access (client sends auth token if available)
// ---------------------------------------------------------------------------

/** Fetch our authoritative paymentTransactions record. */
export const fetchPaymentTransaction = async (opts: {
    transactionId?: string;
    paymentRequestId?: string;
    reference?: string;
    paymentSessionId?: string;
}): Promise<any | null> => {
    const id = opts.transactionId || opts.paymentRequestId || '';
    const ref = opts.reference || '';
    const s = opts.paymentSessionId || '';
    const tx = opts.transactionId || '';
    if (!id && !ref && !s && !tx) return null;
    try {
        // ROOT-CAUSE FIX: `auth?.currentUser?.getIdToken().catch(...)` throws a
        // TypeError when currentUser is null (auth still restoring after the
        // redirect reload) — every verify request died client-side and never
        // reached the server, leaving the screen spinning with no diagnostics.
        const token = auth?.currentUser ? await auth.currentUser.getIdToken().catch(() => null) : null;
        const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
        const endpoint = getHitPayProxyEndpoint(
            `/api/hitpay-proxy?action=transaction&id=${encodeURIComponent(id)}&tx=${encodeURIComponent(tx)}&s=${encodeURIComponent(s)}&ref=${encodeURIComponent(ref)}`
        );
        const resp = await fetch(endpoint, { headers });
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
    paymentSessionId?: string;
    isSandbox?: boolean;
}): Promise<any | null> => {
    const id = opts.transactionId || opts.paymentRequestId || '';
    const ref = opts.reference || '';
    const s = opts.paymentSessionId || '';
    const tx = opts.transactionId || '';
    if (!id && !ref && !s && !tx) return null;
    try {
        // ROOT-CAUSE FIX: `auth?.currentUser?.getIdToken().catch(...)` throws a
        // TypeError when currentUser is null (auth still restoring after the
        // redirect reload) — every verify request died client-side and never
        // reached the server, leaving the screen spinning with no diagnostics.
        const token = auth?.currentUser ? await auth.currentUser.getIdToken().catch(() => null) : null;
        const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
        const endpoint = getHitPayProxyEndpoint(
            `/api/hitpay-proxy?action=verify&id=${encodeURIComponent(id)}&tx=${encodeURIComponent(tx)}&s=${encodeURIComponent(s)}&ref=${encodeURIComponent(ref)}&sandbox=${opts.isSandbox ? 'true' : 'false'}`
        );
        const resp = await fetch(endpoint, { headers });
        if (!resp.ok) {
            // ROOT-CAUSE VISIBILITY: silent failures here used to make the
            // "Verifying" screen spin forever with zero diagnostics.
            console.warn(`[PaymentVerify] verify endpoint responded HTTP ${resp.status}`, {
                transactionId: opts.transactionId || '',
                paymentRequestId: opts.paymentRequestId || '',
                paymentSessionId: opts.paymentSessionId || '',
                reference: ref
            });
            return null;
        }
        return await resp.json();
    } catch (e: any) {
        console.warn('[PaymentVerify] verify request failed:', e?.message || e);
        return null;
    }
};

/**
 * Simulate completing a payment in the HitPay Sandbox environment for testing.
 * Calls backend /api/hitpay-proxy?action=simulate-sandbox with Bearer auth token.
 */
export const simulateSandboxPayment = async (opts: {
    transactionId?: string;
    paymentRequestId?: string;
    reference?: string;
    paymentSessionId?: string;
}): Promise<any | null> => {
    const id = opts.transactionId || opts.paymentRequestId || '';
    const ref = opts.reference || '';
    const s = opts.paymentSessionId || '';
    const tx = opts.transactionId || '';
    if (!id && !ref && !s && !tx) return null;
    try {
        // ROOT-CAUSE FIX: `auth?.currentUser?.getIdToken().catch(...)` throws a
        // TypeError when currentUser is null (auth still restoring after the
        // redirect reload) — every verify request died client-side and never
        // reached the server, leaving the screen spinning with no diagnostics.
        const token = auth?.currentUser ? await auth.currentUser.getIdToken().catch(() => null) : null;
        const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
        const endpoint = getHitPayProxyEndpoint(
            `/api/hitpay-proxy?action=simulate-sandbox&id=${encodeURIComponent(id)}&tx=${encodeURIComponent(tx)}&s=${encodeURIComponent(s)}&ref=${encodeURIComponent(ref)}&sandbox=true`
        );
        const resp = await fetch(endpoint, { headers });
        if (!resp.ok) {
            const errBody = await resp.json().catch(() => null);
            console.warn(`[PaymentVerify] simulate-sandbox responded HTTP ${resp.status}`, errBody);
            return errBody || { error: `HTTP ${resp.status}` };
        }
        return await resp.json();
    } catch (e: any) {
        console.warn('[PaymentVerify] simulate-sandbox failed:', e?.message || e);
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

    // Spec §7: a verified return URL advances the in-flight session to
    // RETURN_RECEIVED (verification-only). It never creates a payment and
    // never marks anything paid — the backend remains authoritative.
    try {
        PaymentController.noteReturnReceived({
            transactionId: info.transactionId,
            paymentRequestId: info.paymentRequestId,
            referenceNumber: info.referenceNumber
        });
    } catch {
        // controller unavailable — verification below still proceeds
    }

    const marker = getPendingPaymentMarker();
    const resolved = matchesMarker(marker, info) ? marker : null;

    const transactionId = info.transactionId || resolved?.transactionId || '';
    const referenceNumber = info.referenceNumber || resolved?.referenceNumber || '';
    const paymentRequestId = info.paymentRequestId || resolved?.paymentRequestId || '';
    const paymentSessionId = info.paymentSessionId || '';
    const isSandbox = resolved?.environment === 'sandbox';

    // Kick off server-side verification immediately — if the webhook already
    // settled the transaction this is a no-op; if the webhook is still in
    // flight this makes the app independent of its timing.
    verifyPaymentTransaction({ transactionId, paymentRequestId, reference: referenceNumber, paymentSessionId, isSandbox })
        .catch(() => { /* watcher keeps retrying */ });

    const params = new URLSearchParams();
    if (transactionId) params.set('tx', transactionId);
    if (referenceNumber) params.set('ref', referenceNumber);
    if (paymentRequestId) params.set('prid', paymentRequestId);
    if (paymentSessionId) params.set('s', paymentSessionId);
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
    paymentSessionId?: string;
    isSandbox?: boolean;
    /** How long to keep verifying before reporting PENDING (default 90s). */
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
        paymentSessionId,
        isSandbox = false,
        timeoutMs = 90 * 1000,
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

    // ---- verification timeline state ------------------------------------------------
    const startedAt = Date.now();
    let pendingAnnounced = false;   // true once the PENDING timeout message is shown
    let gatewayFailures = 0;        // consecutive unreachable/failed verify calls
    let verifyStep = 0;             // position in the backoff schedule below
    let verifyInFlight = false;
    let verifyTimer: number | null = null;
    let pendingTimer: number | null = null;
    let listenerAttached = false;
    let authWaitRegistered = false;

    // ROOT-CAUSE FIX (stuck on "Verifying Payment" forever): the old watcher
    // pre-registered 8 one-shot timers from page load. Mobile WebViews FREEZE
    // or RESET timers while the app is backgrounded (e.g. when the customer
    // switches to the HitPay/GCash app to pay), so the schedule silently died —
    // the screen never reached PENDING and never polled again. Verification is
    // now a SELF-RESCHEDULING loop that (a) never leaves a dead gap, (b) re-arms
    // itself whenever the page becomes visible again, and (c) always announces
    // PENDING once timeoutMs has elapsed since the original start time.

    /**
     * Shared handler for every backend verify response (backoff timers and the
     * slow post-PENDING poll). Converts the settlement result into honest UI
     * state instead of spinning blindly.
     */
    const handleVerifyResponse = (res: any) => {
        if (disposed || settled) return;
        if (!res) {
            gatewayFailures += 1;
            if (!pendingAnnounced && gatewayFailures >= 2) {
                emit('VERIFYING', 'Reconnecting to the payment server — your payment details are safe…');
            }
            return;
        }
        // Server without HitPay credentials answers HTTP 200
        // {fallbackToPortal:true} with NO settlement result — never render
        // that as "this usually takes a few seconds".
        if (res.fallbackToPortal === true || (res.error && !res.result)) {
            gatewayFailures += 1;
            if (!pendingAnnounced && gatewayFailures >= 2) {
                emit('VERIFYING', 'The payment server cannot reach HitPay right now — we keep retrying automatically. Your payment is safe.');
            }
            return;
        }
        gatewayFailures = 0;
        const tx = res.transaction || null;
        const result = res.result || {};
        const terminal = stateFromTxStatus(result.status || tx?.status);
        if (terminal === 'PAID') {
            finish('PAID', 'Your payment has been verified by HitPay.', tx);
        } else if (terminal) {
            finish(terminal, terminal === 'FAILED' ? 'HitPay could not complete your payment.'
                : terminal === 'CANCELLED' ? 'The payment was cancelled.'
                    : 'This payment request has expired.', tx);
        } else if (
            result.status === 'PENDING_REVIEW' ||
            result.verificationStatus === 'AMOUNT_MISMATCH' ||
            result.verificationStatus === 'CURRENCY_MISMATCH' ||
            result.verificationStatus === 'REFERENCE_MISMATCH'
        ) {
            finish('PENDING', 'We received your payment but it needs manual review. Our team will update you shortly.', tx);
        } else if (result.status === 'NOT_FOUND') {
            if (!pendingAnnounced) emit('VERIFYING', 'Confirming your payment session with the server…');
        } else if (result.verificationStatus === 'GATEWAY_UNAVAILABLE' && result.reason === 'gateway_amount_unreadable') {
            if (!pendingAnnounced) {
                emit('VERIFYING', 'HitPay confirmed activity on your payment but we could not read its amount — we keep retrying and our team has been alerted.', tx);
            }
        } else if (result.verificationStatus === 'GATEWAY_UNAVAILABLE') {
            gatewayFailures += 1;
            if (!pendingAnnounced && gatewayFailures >= 2) {
                emit('VERIFYING', 'Reconnecting to HitPay — we keep retrying automatically…');
            }
        } else if (
            result.verificationStatus === 'GATEWAY_PENDING' ||
            result.verificationStatus === 'AWAITING_GATEWAY_VERIFICATION' ||
            String(result.reason || '').startsWith('gateway_status_')
        ) {
            // The gateway answered but has not confirmed the payment yet — be
            // honest instead of promising "a few seconds" forever.
            if (!pendingAnnounced) {
                emit('VERIFYING', 'HitPay has not confirmed this payment yet — we keep checking automatically.', tx);
            }
        } else if (!pendingAnnounced) {
            emit('VERIFYING', 'Waiting for HitPay confirmation — this usually takes a few seconds…', tx);
        }
    };

    const isSuccessHint = typeof window !== 'undefined' && (
        window.location.search.includes('status=completed') ||
        window.location.search.includes('status=success') ||
        window.location.search.includes('hitpay=completed') ||
        window.location.search.includes('hitpay=success')
    );

    const BACKOFF_DELAYS = isSuccessHint 
        ? [150, 800, 1800, 3500, 6000, 12000, 20000, 30000]
        : [500, 2000, 4000, 8000, 15000, 30000, 30000, 30000];
    const STEADY_POLL_MS = 15000;
    const PENDING_POLL_MS = 30000;

    const scheduleVerify = (delayMs: number) => {
        if (disposed || settled) return;
        if (verifyTimer !== null) window.clearTimeout(verifyTimer);
        verifyTimer = window.setTimeout(runVerify, delayMs);
    };

    const runVerify = async () => {
        if (disposed || settled || verifyInFlight) return;
        verifyInFlight = true;
        try {
            const res = await verifyPaymentTransaction({
                transactionId,
                paymentRequestId,
                reference: referenceNumber,
                paymentSessionId,
                isSandbox
            }).catch(() => null);
            handleVerifyResponse(res);
        } catch { /* keep the loop alive below */ }
        finally {
            verifyInFlight = false;
            if (!disposed && !settled) {
                const delay = pendingAnnounced ? PENDING_POLL_MS
                    : verifyStep < BACKOFF_DELAYS.length ? BACKOFF_DELAYS[verifyStep]
                        : STEADY_POLL_MS;
                verifyStep += 1;
                scheduleVerify(delay);
            }
        }
    };

    // 1. Realtime listener on the authoritative transaction record + target entity doc
    const marker = getPendingPaymentMarker();
    const effectiveEntityId = marker?.entityId || (referenceNumber ? referenceNumber.split('-')[1] : '');
    const rawKind = marker?.entityKind || (
        referenceNumber?.startsWith('BOK-') ? 'booking' :
        referenceNumber?.startsWith('ORD-') ? 'order' :
        referenceNumber?.startsWith('LIA-') ? 'liaison' :
        referenceNumber?.startsWith('RNT-') ? 'rental' :
        (referenceNumber?.startsWith('TOW-') || referenceNumber?.startsWith('DRV-')) ? 'service-request' : null
    );

    let entityListenerAttached = false;
    const attachEntityListener = () => {
        if (!effectiveEntityId || !rawKind || !firestore || entityListenerAttached || disposed || settled) return;
        entityListenerAttached = true;
        try {
            const collectionName = collectionForEntity(rawKind as PaymentEntityKind);
            const unsubEntity = onSnapshot(
                doc(firestore, collectionName, effectiveEntityId),
                (snap) => {
                    if (disposed || settled || !snap.exists()) return;
                    const data: any = snap.data();
                    if (isPaymentEntityVerified(data)) {
                        finish('PAID', 'Your payment has been verified by HitPay.', {
                            referenceNumber: referenceNumber || data.hitpayReference || data.referenceNumber,
                            entityKind: rawKind,
                            entityId: effectiveEntityId,
                            amount: data.paidAmount || data.downpaymentAmount || data.totalAmount,
                            paymentMethod: data.paymentMethod || 'HitPay (Online)',
                            paidAt: data.paidAt || data.downpaymentPaidAt || data.balancePaidAt || new Date().toISOString()
                        });
                    }
                },
                () => { /* ignore */ }
            );
            cleanups.push(unsubEntity);
        } catch { /* ignore */ }
    };

    const attachTxListener = () => {
        attachEntityListener();
        if (!transactionId || !firestore) return;
        if (listenerAttached || disposed || settled) return;
        listenerAttached = true;
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
                    } else if (!pendingAnnounced) {
                        emit('VERIFYING', 'Payment received — finalizing confirmation…', tx);
                    }
                },
                () => { /* stream errors: verify polling below still runs */ }
            );
            cleanups.push(unsub);
        } catch { /* ignore */ }
    };

    const ensureTxListener = () => {
        attachEntityListener();
        if (!transactionId || !firestore) return;
        if (listenerAttached || disposed || settled) return;
        try {
            if (auth?.currentUser) {
                attachTxListener();
            } else if (auth && typeof auth.onAuthStateChanged === 'function') {
                if (authWaitRegistered) return;
                authWaitRegistered = true;
                const authTimer = window.setTimeout(attachTxListener, 8000);
                cleanups.push(() => window.clearTimeout(authTimer));
                const unsubAuth = auth.onAuthStateChanged(() => attachTxListener());
                cleanups.push(unsubAuth);
            } else {
                attachTxListener();
            }
        } catch {
            attachTxListener();
        }
    };
    ensureTxListener();

    // 2. Kick off verification and arm the PENDING deadline (measured from the
    //    ORIGINAL start time — see the re-arm on visibility below).
    const announcePending = () => {
        if (disposed || settled || pendingAnnounced) return;
        pendingAnnounced = true;
        emit('PENDING', 'Payment verification is still in progress. We will notify you automatically once HitPay confirms — you can safely close this screen.');
    };

    const armPendingTimeout = () => {
        if (pendingTimer !== null) {
            window.clearTimeout(pendingTimer);
            pendingTimer = null;
        }
        if (disposed || settled || pendingAnnounced) return;
        const remaining = timeoutMs - (Date.now() - startedAt);
        if (remaining <= 0) {
            announcePending();
            return;
        }
        pendingTimer = window.setTimeout(announcePending, remaining);
    };

    // 3. Page-lifecycle resilience: returning from the HitPay/GCash app, a
    //    WebView thaw or a bfcache restore can leave the old timer chain dead.
    //    On every visible transition we re-arm the PENDING deadline from the
    //    original start time (so an overdue watcher announces PENDING right
    //    away), make sure the realtime listener is attached, and verify NOW.
    const handlePageVisible = () => {
        if (disposed || settled) return;
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
        armPendingTimeout();
        ensureTxListener();
        scheduleVerify(400);
    };
    if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', handlePageVisible);
    }
    if (typeof window !== 'undefined') {
        window.addEventListener('pageshow', handlePageVisible);
    }

    verifyStep = 1;
    scheduleVerify(BACKOFF_DELAYS[0]);
    armPendingTimeout();

    cleanups.push(() => {
        if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', handlePageVisible);
        if (typeof window !== 'undefined') window.removeEventListener('pageshow', handlePageVisible);
    });
    cleanups.push(() => { if (verifyTimer !== null) window.clearTimeout(verifyTimer); });
    cleanups.push(() => { if (pendingTimer !== null) window.clearTimeout(pendingTimer); });

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
    /** How long to wait for the webhook before reporting PENDING (default 90s). */
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
        timeoutMs = 90 * 1000,
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

    // Backend status polls — when HitPay reports completed, trigger backend settlement immediately!
    const pollBackend = async () => {
        if (disposed || settled) return;
        const backend = await fetchBackendPaymentStatus(paymentRequestId, isSandbox);
        if (disposed || settled) return;
        if (backend === 'completed') {
            emit('VERIFYING', 'Payment received — finalizing confirmation...');
            // Actively trigger server-side verification and settlement if webhook is delayed
            verifyPaymentTransaction({
                paymentRequestId,
                isSandbox
            }).catch(() => { /* watcher will retry on next poll */ });
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
