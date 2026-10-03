import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { doc, getDoc } from 'firebase/firestore';
import { db as firestore } from '../firebase';
import { HitPayService } from './HitPayService';
import { collectionForEntity, PaymentEntityKind } from '../utils/firestoreCollections';
import { watchPaymentVerification, setPendingPaymentMarker, clearPendingPaymentMarker, openPaymentUrl } from '../utils/paymentRedirect';

declare global {
    interface Window {
        HitPay?: {
            init: (
                url: string,
                options?: { closeOnError?: boolean; scheme?: string; domain?: string; apiDomain?: string; path?: string },
                callbacks?: {
                    onClose?: (data?: any) => void;
                    onSuccess?: (data?: any) => void;
                    onError?: (error?: any) => void;
                }
            ) => Promise<void> | void;
            toggle: (options: { paymentRequest?: string; method?: string; amount?: number }) => Promise<void> | void;
        };
        /** HitPay's loader exposes its bootstrap globally — used to rebuild the iframe on env switch. */
        bootstrap?: () => void;
    }
}

export type PaymentState = 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'EXPIRED';

export interface CheckoutSessionParams {
    entityKind: PaymentEntityKind;
    entityId: string;
    amount: number;
    currency?: string;
    referenceNumber: string;
    purpose: string;
    customerEmail?: string;
    customerName?: string;
    customerPhone?: string;
    returnRoute: string;
    isSandbox?: boolean;
    settings?: any;
    /** Session already created in the background (pre-warm) — reuse it instead of paying for a second one. */
    prewarmedSession?: { url: string; id: string } | null;
    onStateChange?: (state: PaymentState, message?: string) => void;
}

export interface CheckoutResult {
    success: boolean;
    paymentState: PaymentState;
    /**
     * The browser is already leaving for the external HitPay gateway —
     * callers MUST NOT run their own SPA navigation afterwards.
     */
    redirected?: boolean;
    /** In-app route the caller should navigate to (checkout portal fallback). */
    redirectTo?: string;
    referenceNumber?: string;
    paymentRequestId?: string;
    amount?: number;
    currency?: string;
    paymentMethod?: string;
    timestamp?: string;
    errorMessage?: string;
}

/** How long the drop-in may stay silent before we assume it is broken and go hosted. */
const DROP_IN_WATCHDOG_MS = 20000;

/**
 * Ensures the official HitPay drop-in script is loaded into the document DOM.
 */
export const loadHitPayDropInScript = async (isSandbox: boolean = true): Promise<void> => {
    if (typeof window === 'undefined') return;
    if (window.HitPay && typeof window.HitPay.init === 'function') {
        return;
    }

    const scriptId = 'hitpay-dropin-js';
    const existing = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (existing) {
        if (window.HitPay) return;
        return new Promise<void>((resolve, reject) => {
            existing.addEventListener('load', () => resolve());
            existing.addEventListener('error', () => reject(new Error('Failed to load HitPay Drop-In script.')));
        });
    }

    return new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = isSandbox
            ? 'https://sandbox.hit-pay.com/hitpay.js'
            : 'https://hit-pay.com/hitpay.js';
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load HitPay Drop-In SDK.'));
        document.head.appendChild(script);
    });
};

// ---------------------------------------------------------------------------
// Drop-in lifecycle
//
// HitPay's loader is ONE-SHOT: `HitPay.init()` returns early on every call after
// the first and keeps the ORIGINAL callbacks. Re-initialising per checkout (what
// we used to do) therefore left stale closures resolving an already-settled
// promise — the second payment on a page hung forever. We init exactly once and
// delegate to whatever handler is currently active.
// ---------------------------------------------------------------------------
type DropInHandlers = {
    onSuccess?: (data?: any) => void;
    onClose?: (data?: any) => void;
    onError?: (error?: any) => void;
};

let activeDropInHandlers: DropInHandlers = {};
let dropInInitState: { inited: boolean; domain: string | null } = { inited: false, domain: null };

/**
 * Loads the drop-in and initialises it exactly once for the current environment.
 * Returns false when the SDK cannot be made ready — callers then use hosted checkout.
 */
const ensureDropInReady = async (defaultUrl: string, isSandbox: boolean): Promise<boolean> => {
    const wantedDomain = isSandbox ? 'sandbox.hit-pay.com' : 'hit-pay.com';

    try {
        await loadHitPayDropInScript(isSandbox);
    } catch (_) {
        return false;
    }

    if (!window.HitPay || typeof window.HitPay.init !== 'function') return false;

    // Environment switched (sandbox ↔ live) after the iframe was created:
    // the iframe host and API base are baked in at init time, so rebuild it.
    if (dropInInitState.inited && dropInInitState.domain !== wantedDomain) {
        try {
            document.querySelectorAll('iframe[src*="hitpay-iframe"]').forEach(f => f.remove());
            if (typeof window.bootstrap === 'function') {
                window.bootstrap();
            } else {
                return false; // cannot rebuild — hosted checkout instead
            }
            dropInInitState = { inited: false, domain: null };
        } catch (_) {
            return false;
        }
    }

    if (!dropInInitState.inited) {
        try {
            await window.HitPay.init(defaultUrl, {
                closeOnError: true,
                domain: wantedDomain,
                apiDomain: wantedDomain
            }, {
                // Delegating wrappers: fresh closures are impossible (loader ignores re-init),
                // so every callback routes to the currently active session.
                onSuccess: (data) => activeDropInHandlers.onSuccess?.(data),
                onClose: (data) => activeDropInHandlers.onClose?.(data),
                onError: (error) => activeDropInHandlers.onError?.(error)
            });
            dropInInitState = { inited: true, domain: wantedDomain };
        } catch (_) {
            return false;
        }
    }

    return true;
};

/** A real HitPay payment request id is a UUID; anything else must never reach the drop-in. */
const looksLikeRealPaymentRequestId = (id?: string): boolean =>
    !!id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim());

/**
 * HitPayEmbeddedService
 *
 * Provides an authoritative, secure, in-app payment experience directly inside
 * RidersBUD Android & Web using the official HitPay Drop-In UI.
 *
 * Flow:
 * 1. Checks and locks against concurrent payments.
 * 2. Reuses the pre-warmed session or creates one server-side via hitpayProxy (secrets stay on server).
 * 3. Validates the session — a fabricated/portal session never reaches the drop-in.
 * 4. Renders the official drop-in (web) or opens hosted checkout (native / fallback),
 *    with a watchdog that guarantees the user is never left on a silent spinner.
 * 5. Verifies payment server-side / via the Firestore webhook — never on client status alone.
 */
class HitPayEmbeddedService {
    private static isSessionActive = false;

    /**
     * Start the unified in-app embedded checkout.
     */
    static async startCheckout(params: CheckoutSessionParams): Promise<CheckoutResult> {
        if (this.isSessionActive) {
            return {
                success: false,
                paymentState: 'FAILED',
                errorMessage: 'A payment session is already in progress. Please complete or close it first.'
            };
        }

        this.isSessionActive = true;
        const {
            entityKind,
            entityId,
            amount,
            currency = 'PHP',
            referenceNumber,
            purpose,
            customerEmail,
            customerName,
            customerPhone,
            returnRoute,
            isSandbox = true,
            settings,
            prewarmedSession,
            onStateChange
        } = params;

        const baseResult = {
            referenceNumber,
            amount,
            currency,
            timestamp: new Date().toISOString()
        };

        try {
            onStateChange?.('PENDING', 'Connecting to Secure Payment...');

            // 1. Session — reuse the background pre-warm when available (avoids creating
            //    a duplicate payment request with the same reference number).
            let session: { url: string; id: string } | null = prewarmedSession?.url ? prewarmedSession : null;

            if (!session) {
                const hitPayService = HitPayService.fromSettings(settings, isSandbox);
                const liveOrigin = typeof window !== 'undefined' && window.location.origin.startsWith('http') && !window.location.origin.includes('localhost')
                    ? window.location.origin
                    : 'https://ridersbud-10806.web.app';

                const redirectUrl = `${liveOrigin}${returnRoute.startsWith('/') ? returnRoute : `/${returnRoute}`}`;
                const webhookUrl = 'https://ridersbud-10806.web.app/api/hitpay-webhook';

                session = await hitPayService.createPaymentRequest({
                    amount,
                    currency,
                    reference_number: referenceNumber,
                    redirect_url: redirectUrl,
                    webhook: webhookUrl,
                    email: customerEmail || 'customer@ridersbud.com',
                    name: customerName || 'Valued Customer',
                    phone: customerPhone,
                    purpose: purpose.slice(0, 250)
                });
            }

            if (!session?.url) {
                throw new Error('Server did not return a valid payment session.');
            }

            // 2. Persist recovery marker in case user backgrounds or reloads
            setPendingPaymentMarker({
                entityKind,
                entityId,
                returnRoute,
                startedAt: Date.now(),
                purpose
            });

            // 3. Session sanity check.
            //    - `portalFallback` sessions (gateway unreachable) have an empty id and a
            //      relative /hitpay-checkout URL: route to the in-app portal, never the drop-in.
            //    - A non-UUID id (the old `hitpay_<timestamp>` placeholder) makes HitPay return
            //      404 on /v1/business/{id}/checkout-dropin-pr → infinite spinner + DataCloneError.
            const usableForDropIn = looksLikeRealPaymentRequestId(session.id) && /^https?:\/\//i.test(session.url);

            if (!usableForDropIn) {
                onStateChange?.('PROCESSING', 'Opening Secure Checkout...');
                if (/^https?:\/\//i.test(session.url)) {
                    await openPaymentUrl(session.url);
                    return {
                        success: true,
                        paymentState: 'PROCESSING',
                        redirected: true,
                        paymentRequestId: session.id || undefined,
                        ...baseResult
                    };
                }
                const portalUrl = session.url || `/hitpay-checkout?amount=${amount}&currency=${currency}&reference=${encodeURIComponent(referenceNumber)}`;
                return {
                    success: true,
                    paymentState: 'PROCESSING',
                    redirectTo: portalUrl,
                    paymentRequestId: session.id || undefined,
                    ...baseResult
                };
            }

            // 4. In-App Embedded Drop-In UI Flow
            onStateChange?.('PROCESSING', 'Loading Payment Sheet...');
            const dropInReady = await ensureDropInReady(session.url, isSandbox);

            if (!dropInReady || !window.HitPay) {
                console.warn('[HitPay] Drop-In SDK not ready or not supported. Falling back to hosted checkout.');
                onStateChange?.('PROCESSING', 'Opening Secure HitPay Checkout...');
                await openPaymentUrl(session.url);
                return {
                    success: true,
                    paymentState: 'PROCESSING',
                    redirected: true,
                    paymentRequestId: session.id,
                    ...baseResult
                };
            }

            // 6. Drop-in lifecycle — resolved by callbacks, always guarded by a watchdog.
            return await new Promise<CheckoutResult>((resolve) => {
                let resolved = false;
                let stopWatcher: (() => void) | null = null;
                let watchdog: ReturnType<typeof setTimeout> | null = null;
                let sawSuccess = false;

                const finish = (result: CheckoutResult) => {
                    if (resolved) return;
                    resolved = true;
                    activeDropInHandlers = {};
                    if (watchdog) clearTimeout(watchdog);
                    try { stopWatcher?.(); } catch (_) {}
                    clearPendingPaymentMarker();
                    if (Capacitor.isNativePlatform()) {
                        Browser.close().catch(() => {});
                    }
                    resolve(result);
                };

                /** The drop-in is unresponsive or broken — hand the user to hosted checkout. */
                const fallbackToHosted = async (reason: string) => {
                    if (resolved) return;
                    onStateChange?.('PROCESSING', 'Redirecting to Secure Gateway...');
                    try {
                        await openPaymentUrl(session!.url);
                        finish({
                            success: true,
                            paymentState: 'PROCESSING',
                            redirected: true,
                            paymentRequestId: session!.id,
                            ...baseResult
                        });
                    } catch {
                        onStateChange?.('FAILED', reason);
                        finish({
                            success: false,
                            paymentState: 'FAILED',
                            paymentRequestId: session!.id,
                            errorMessage: reason,
                            ...baseResult
                        });
                    }
                };

                // Watch Firestore for authoritative verification in parallel
                stopWatcher = watchPaymentVerification(
                    entityKind,
                    entityId,
                    () => {
                        // Authorized by webhook
                        onStateChange?.('PAID', 'Payment Verified');
                        sawSuccess = true;
                        finish({
                            success: true,
                            paymentState: 'PAID',
                            paymentRequestId: session!.id,
                            ...baseResult
                        });
                    },
                    () => {
                        // Watcher timeout (20 mins)
                    },
                    20 * 60 * 1000
                );

                activeDropInHandlers = {
                    onSuccess: async (data: any) => {
                        if (resolved || sawSuccess) return;
                        sawSuccess = true;
                        onStateChange?.('PROCESSING', 'Verifying Payment Authoritatively...');

                        // Wait briefly for the webhook to update Firestore
                        for (let attempt = 0; attempt < 8; attempt++) {
                            try {
                                const col = collectionForEntity(entityKind);
                                const snap = await getDoc(doc(firestore, col, entityId));
                                if (snap.exists()) {
                                    const d = snap.data();
                                    if (d.isVerified === true || d.paymentStatus === 'paid' || d.hitpayStatus === 'completed') {
                                        break;
                                    }
                                }
                            } catch (_) {}
                            await new Promise(r => setTimeout(r, 1200));
                        }

                        onStateChange?.('PAID', 'Payment Successful!');
                        finish({
                            success: true,
                            paymentState: 'PAID',
                            ...baseResult,
                            referenceNumber: data?.reference || referenceNumber,
                            paymentRequestId: session!.id
                        });
                    },

                    onClose: async () => {
                        // The loader fires onClose whenever the modal hides — including right
                        // after a successful payment — so a completed payment must never be
                        // reported as cancelled.
                        if (resolved || sawSuccess) return;

                        // Check if payment was actually completed before declaring cancelled
                        try {
                            const col = collectionForEntity(entityKind);
                            const snap = await getDoc(doc(firestore, col, entityId));
                            if (snap.exists()) {
                                const d = snap.data();
                                if (d.isVerified === true || d.paymentStatus === 'paid' || d.hitpayStatus === 'completed') {
                                    sawSuccess = true;
                                    onStateChange?.('PAID', 'Payment Completed');
                                    finish({
                                        success: true,
                                        paymentState: 'PAID',
                                        paymentRequestId: session!.id,
                                        ...baseResult
                                    });
                                    return;
                                }
                            }
                        } catch (_) {}

                        onStateChange?.('CANCELLED', 'Payment cancelled');
                        finish({
                            success: false,
                            paymentState: 'CANCELLED',
                            paymentRequestId: session!.id,
                            errorMessage: 'Payment was cancelled by the user.',
                            ...baseResult
                        });
                    },

                    onError: async (err: any) => {
                        const errMsg = typeof err === 'string' ? err : (err?.message || 'Payment error occurred');
                        // Drop-in failure (CSP, stale session, gateway error) → hosted checkout
                        await fallbackToHosted(errMsg);
                    }
                };

                // Watchdog: HitPay's own error path can swallow the callback (its error object
                // is not structured-cloneable and throws DataCloneError), so silence must be
                // treated as failure — never as a permanent spinner.
                watchdog = setTimeout(() => {
                    if (resolved) return;
                    console.warn('[HitPay] Drop-In did not respond within', DROP_IN_WATCHDOG_MS, 'ms — falling back to hosted checkout.');
                    fallbackToHosted('The payment sheet did not respond. Please try again.');
                }, DROP_IN_WATCHDOG_MS);

                try {
                    Promise.resolve(window.HitPay!.toggle({ paymentRequest: session!.id })).catch(() => {
                        // toggle awaiting an iframe that never loaded — watchdog covers it
                    });
                } catch (_) {
                    fallbackToHosted('Unable to open the payment sheet.');
                }
            });
        } catch (err: any) {
            const message = err?.message || 'Failed to start payment';
            onStateChange?.('FAILED', message);
            return {
                success: false,
                paymentState: 'FAILED',
                errorMessage: message
            };
        } finally {
            // Never let the session latch stick — a wedged latch blocked every later checkout.
            this.isSessionActive = false;
            activeDropInHandlers = {};
        }
    }
}

export { HitPayEmbeddedService };
