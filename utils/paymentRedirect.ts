import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import {
    doc,
    onSnapshot,
    getDoc
} from 'firebase/firestore';
import { db as firestore } from '../firebase';
import { collectionForEntity, PaymentEntityKind } from './firestoreCollections';

export type { PaymentEntityKind };

/**
 * Native payment presentation + auto-return for RidersBUD.
 *
 * Presentation: Chrome Custom Tab via @capacitor/browser — a secure, in-app
 * browser session where GCash/Maya/3-DS app-switching works natively and the
 * session closes cleanly. (The old uncontrolled WebView dialog was removed.)
 *
 * Truth model: the ONLY proof of payment is the server-settled
 * `paymentTransactions/{id}` document (webhook + HitPay API re-verification).
 * Gateway redirect parameters are never trusted.
 */

const PENDING_MARKER_KEY = 'rb_pending_payment_watch';
const PENDING_MARKER_TTL_MS = 30 * 60 * 1000; // 30 minutes

/** Fired on window so screens can route without importing the router. */
export const NAVIGATE_EVENT = 'ridersbud:navigate';

export interface PendingPaymentMarker {
    entityKind: PaymentEntityKind;
    entityId: string;
    returnRoute: string;
    startedAt: number;
    purpose?: string;
    /** paymentTransactions/{transactionId} — authoritative settlement record. */
    transactionId?: string;
    /** HitPay payment request id — lets the resume flow query backend status. */
    paymentRequestId?: string;
    /** Stable idempotency key for this payment (no timestamps). */
    referenceNumber?: string;
    /** 'sandbox' | 'production' */
    environment?: string;
    /** Path the checkout was initiated from — where the user lands if they close the tab without returning. */
    initiatedFrom?: string;
}

export const isNativePlatform = (): boolean => Capacitor.isNativePlatform();

/**
 * Programmatic SPA navigation helper (no full page reload — reloads used to
 * re-trigger payment initialization and caused navigation loops).
 */
export const navigateTo = (to: string): void => {
    try {
        window.dispatchEvent(new CustomEvent(NAVIGATE_EVENT, { detail: { to } }));
    } catch {
        // CustomEvent unavailable — fall back to history API without reload
        try { window.history.pushState({}, '', to); } catch { /* ignore */ }
    }
};

// ---------------------------------------------------------------------------
// Marker persistence (survives Custom Tab + process death)
// ---------------------------------------------------------------------------

export const setPendingPaymentMarker = (marker: PendingPaymentMarker): void => {
    try {
        localStorage.setItem(PENDING_MARKER_KEY, JSON.stringify(marker));
    } catch {
        // storage unavailable — watcher simply won't resume after process death
    }
};

export const getPendingPaymentMarker = (): PendingPaymentMarker | null => {
    try {
        const raw = localStorage.getItem(PENDING_MARKER_KEY);
        if (!raw) return null;
        const marker = JSON.parse(raw) as PendingPaymentMarker;
        if (!marker?.entityId || !marker?.entityKind) return null;
        if (Date.now() - (marker.startedAt || 0) > PENDING_MARKER_TTL_MS) {
            clearPendingPaymentMarker();
            return null;
        }
        return marker;
    } catch {
        return null;
    }
};

export const clearPendingPaymentMarker = (): void => {
    try {
        localStorage.removeItem(PENDING_MARKER_KEY);
    } catch {
        // ignore
    }
};

// ---------------------------------------------------------------------------
// Core watchers
// ---------------------------------------------------------------------------

const isVerifiedPayload = (data: any): boolean => {
    if (!data) return false;
    if (data.isVerified === true) return true;
    if (typeof data.hitpayStatus === 'string' && data.hitpayStatus.toLowerCase() === 'completed') return true;
    if (typeof data.paymentStatus === 'string' && ['paid', 'Paid'].includes(data.paymentStatus)) return true;
    if (data.gcashPaymentStatus === 'verified') return true;
    return false;
};

/**
 * Watch the authoritative `paymentTransactions/{transactionId}` document.
 * Fires exactly once with the terminal status (PAID | FAILED | CANCELLED | EXPIRED).
 * Realtime snapshot + poll fallback + hard cap.
 */
export const watchTransactionVerification = (
    transactionId: string,
    onSettled: (status: string, data: any) => void,
    onTimeout?: () => void,
    timeoutMs: number = 30 * 60 * 1000
): (() => void) => {
    if (!transactionId || !firestore) return () => { };

    let disposed = false;
    let fired = false;
    const timers: number[] = [];
    const fireOnce = (status: string, data: any) => {
        if (fired || disposed) return;
        fired = true;
        onSettled(status, data);
    };

    const ref = doc(firestore, 'paymentTransactions', transactionId);
    const TERMINAL = ['PAID', 'FAILED', 'CANCELLED', 'EXPIRED'];

    let unsubscribe: (() => void) | null = null;
    try {
        unsubscribe = onSnapshot(
            ref,
            (snap) => {
                if (disposed || fired || !snap.exists()) return;
                const data = snap.data() || {};
                if (TERMINAL.includes(String(data.status || ''))) {
                    fireOnce(String(data.status), data);
                }
            },
            () => { /* permission/stream errors: poll fallback already running */ }
        );
    } catch {
        // listener setup failed — poll still covers us
    }

    // Poll fallback with gentle cadence (backoff handled by callers that also
    // actively ask the backend to verify)
    const poll = async () => {
        if (disposed || fired) return;
        try {
            const snap = await getDoc(ref);
            if (!disposed && !fired && snap.exists()) {
                const data = snap.data() || {};
                if (TERMINAL.includes(String(data.status || ''))) {
                    fireOnce(String(data.status), data);
                }
            }
        } catch {
            // transient Firestore errors — retry next tick
        }
    };
    timers.push(window.setInterval(poll, 5000));

    timers.push(window.setTimeout(() => {
        if (!disposed && !fired) {
            fired = true;
            onTimeout?.();
        }
    }, timeoutMs));

    return () => {
        disposed = true;
        if (unsubscribe) unsubscribe();
        timers.forEach(t => {
            window.clearInterval(t);
            window.clearTimeout(t);
        });
    };
};

/**
 * Watch a Firestore entity record for payment verification. Returns a disposer.
 * (Legacy entity-level path — the transaction watcher above is authoritative.)
 */
export const watchPaymentVerification = (
    entityKind: PaymentEntityKind,
    entityId: string,
    onVerified: () => void,
    onTimeout?: () => void,
    timeoutMs: number = 30 * 60 * 1000
): (() => void) => {
    if (!entityId || !firestore) return () => { };

    let disposed = false;
    let fired = false;
    const timers: number[] = [];
    const fireOnce = (fn?: () => void) => {
        if (fired || disposed) return;
        fired = true;
        fn?.();
    };

    const collectionName = collectionForEntity(entityKind);
    const ref = doc(firestore, collectionName, entityId);

    // 1. Realtime snapshot
    let unsubscribe: (() => void) | null = null;
    try {
        unsubscribe = onSnapshot(
            ref,
            (snap) => {
                if (disposed || fired) return;
                if (snap.exists() && isVerifiedPayload(snap.data())) {
                    fireOnce(onVerified);
                }
            },
            () => {
                // Permission/stream errors: poll fallback already running
            }
        );
    } catch {
        // listener setup failed — poll still covers us
    }

    // 2. Poll fallback (every 5s)
    const poll = async () => {
        if (disposed || fired) return;
        try {
            const snap = await getDoc(ref);
            if (!disposed && !fired && snap.exists() && isVerifiedPayload(snap.data())) {
                fireOnce(onVerified);
            }
        } catch {
            // transient Firestore errors — retry next tick
        }
    };
    const pollTimer = window.setInterval(poll, 5000);
    timers.push(pollTimer);

    // 3. Hard timeout
    const timeoutTimer = window.setTimeout(() => {
        if (!disposed && !fired) {
            fired = true;
            onTimeout?.();
        }
    }, timeoutMs);
    timers.push(timeoutTimer);

    return () => {
        disposed = true;
        if (unsubscribe) unsubscribe();
        timers.forEach(t => {
            window.clearInterval(t);
            window.clearTimeout(t);
        });
    };
};

// ---------------------------------------------------------------------------
// Launch helper
// ---------------------------------------------------------------------------

/**
 * Open the payment gateway URL.
 *
 * Native (Android/iOS): Chrome Custom Tab / SFSafariViewController via
 * @capacitor/browser — secure native presentation, GCash/Maya app-switch and
 * 3-DS supported, no window.location / window.open / uncontrolled WebView.
 * Web: same-tab navigation to the hosted checkout.
 */
export const openPaymentUrl = async (url: string, _title?: string): Promise<void> => {
    if (isNativePlatform()) {
        try {
            await Browser.open({
                url,
                toolbarColor: '#FE7803',
                presentationStyle: 'popover'
            });
            return;
        } catch (browserErr) {
            console.warn('Browser.open failed:', browserErr);
            throw browserErr instanceof Error
                ? browserErr
                : new Error('Unable to open the secure payment session. Please try again.');
        }
    }
    window.location.href = url;
};

/**
 * Programmatically dismiss the native payment Custom Tab.
 */
export const closeInAppPayment = async (): Promise<void> => {
    if (isNativePlatform()) {
        try {
            await Browser.close();
        } catch {
            // ignore — tab may already be closed by the user
        }
    }
};

// ---------------------------------------------------------------------------
// Resume hook
// ---------------------------------------------------------------------------

/**
 * Resume a payment watch after app process death / Custom Tab re-entry.
 * Returns a disposer or null if there is nothing to resume.
 */
export const resumePendingPaymentVerification = (
    onVerified: (marker: PendingPaymentMarker) => void,
    onExpired?: () => void
): (() => void) | null => {
    const marker = getPendingPaymentMarker();
    if (!marker) return null;

    // Already back on the target route (e.g. gateway redirect landed us here):
    // just clean up the marker and let the screen's own logic handle the state.
    if (atRoute(marker.returnRoute)) {
        clearPendingPaymentMarker();
        return null;
    }

    const remaining = PENDING_MARKER_TTL_MS - (Date.now() - (marker.startedAt || 0));
    if (remaining <= 0) {
        clearPendingPaymentMarker();
        onExpired?.();
        return null;
    }

    const stop = watchPaymentVerification(
        marker.entityKind,
        marker.entityId,
        () => {
            clearPendingPaymentMarker();
            onVerified(marker);
        },
        () => {
            clearPendingPaymentMarker();
            onExpired?.();
        },
        remaining
    );

    return stop || null;
};

const atRoute = (route: string): boolean => {
    try {
        const target = route.startsWith('/') ? route : `/${route}`;
        return window.location.pathname === target.split('?')[0];
    } catch {
        return false;
    }
};

/**
 * Fire-and-forget watcher used by payment screens: watches the entity, then
 * closes the Custom Tab and routes back to `returnRoute` when verified.
 */
export const startPaymentWatcher = (
    entityKind: PaymentEntityKind,
    entityId: string,
    returnRoute: string,
    transactionId?: string
): void => {
    const finish = () => {
        // Clear the marker FIRST so post-navigation resume hooks cannot
        // re-trigger and cause a navigation loop.
        clearPendingPaymentMarker();
        // Verified: close the payment Custom Tab and return to the app.
        if (isNativePlatform()) {
            closeInAppPayment().catch(() => { });
        }
        if (!atRoute(returnRoute)) {
            navigateTo(returnRoute);
        }
    };

    if (transactionId) {
        // Authoritative: server-settled transaction record
        watchTransactionVerification(transactionId, finish, () => {
            // Timeout: leave the user wherever they are; marker TTL cleans up
        });
    } else {
        watchPaymentVerification(entityKind, entityId, finish, () => {
            // Timeout: marker TTL cleans up
        });
    }
};
