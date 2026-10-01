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
 * Native payment redirect + auto-return for RidersBUD.
 *
 * On Android, opening the HitPay checkout in the SAME WebView risks losing the
 * app session. We open the gateway in a Chrome Custom Tab (@capacitor/browser)
 * and simultaneously watch Firestore for the webhook's verification fields.
 * The moment payment is verified, we auto-close the Custom Tab and route the
 * user back into the app. A poll fallback covers missed snapshots, and a
 * pending-marker TTL (30 min) prevents stale redirects from hijacking later
 * sessions.
 */

const PENDING_MARKER_KEY = 'rb_pending_payment_watch';
const PENDING_MARKER_TTL_MS = 30 * 60 * 1000; // 30 minutes

export interface PendingPaymentMarker {
    entityKind: PaymentEntityKind;
    entityId: string;
    returnRoute: string;
    startedAt: number;
    purpose?: string;
}

export interface PaymentWatchResult {
    verified: boolean;
    source: 'snapshot' | 'poll' | 'timeout';
    paymentStatus?: string;
}

export const isNativePlatform = (): boolean => Capacitor.isNativePlatform();

const isVerifiedPayload = (data: any): boolean => {
    if (!data) return false;
    if (data.isVerified === true) return true;
    if (typeof data.hitpayStatus === 'string' && data.hitpayStatus.toLowerCase() === 'completed') return true;
    if (typeof data.paymentStatus === 'string' && data.paymentStatus.toLowerCase() === 'paid') return true;
    if (data.gcashPaymentStatus === 'verified') return true;
    return false;
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
// Core watcher
// ---------------------------------------------------------------------------

/**
 * Watch a Firestore record for payment verification. Returns a disposer.
 * Combines a realtime snapshot listener with a poll fallback and a hard cap.
 */
export const watchPaymentVerification = (
    entityKind: PaymentEntityKind,
    entityId: string,
    onVerified: () => void,
    onTimeout?: () => void,
    timeoutMs: number = 30 * 60 * 1000
): (() => void) => {
    if (!entityId || !firestore) return () => {};

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
 * Open the payment gateway URL. Native: Chrome Custom Tab (watchable, closable).
 * Web: plain redirect (behavior unchanged).
 */
export const openPaymentUrl = async (url: string): Promise<void> => {
    if (isNativePlatform()) {
        try {
            await Browser.open({ url });
            return;
        } catch {
            // fall through to window.open
        }
    }
    window.location.href = url;
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

/** Quick one-shot check so we don't spin a watcher for an already-paid record. */
const isVerifiedAlready = (entityKind: PaymentEntityKind, entityId: string): boolean => {
    // Synchronous check is impossible with Firestore; returning false simply
    // starts a watcher that fires immediately when the doc is already verified.
    void entityKind;
    void entityId;
    return false;
};

/**
 * Fire-and-forget watcher used by payment screens: watches the entity, then
 * closes the Custom Tab and routes back to `returnRoute` when verified.
 */
export const startPaymentWatcher = (
    entityKind: PaymentEntityKind,
    entityId: string,
    returnRoute: string
): void => {
    watchPaymentVerification(
        entityKind,
        entityId,
        () => {
            // Clear the marker FIRST so the post-navigation resume hooks cannot
            // re-trigger and cause a navigation loop.
            clearPendingPaymentMarker();
            // Verified: close the Custom Tab (if any) and return to the app.
            if (isNativePlatform()) {
                Browser.close().catch(() => {});
            }
            if (!atRoute(returnRoute)) {
                window.location.href = returnRoute;
            }
        },
        () => {
            // Timeout: leave the user wherever they are; marker TTL cleans up
        }
    );
};
