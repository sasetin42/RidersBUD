import {
    PaymentState,
    transitionPaymentState,
    TERMINAL_STATES
} from './paymentStateMachine';
import { PaymentEntityKind } from '../../utils/firestoreCollections';
import { db as firestore } from '../../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { auth } from '../../firebase';
import { setPendingPaymentMarker, watchPendingPaymentReturn } from '../../utils/paymentRedirect';

export interface HitPayInAppPluginInterface {
    openPayment(options: {
        checkoutUrl: string;
        sessionId?: string;
        amount?: string;
        reference?: string;
    }): Promise<{ success: boolean }>;
    closePayment(): Promise<{ success: boolean }>;
    isPaymentOpen(): Promise<{ isOpen: boolean }>;
    openProviderApp(options: { appUrl: string }): Promise<{ success: boolean }>;
    addListener(
        eventName: 'paymentRedirect' | 'paymentClosed' | 'paymentError' | 'paymentOpened' | 'paymentProviderOpened' | 'paymentProviderReturned',
        listenerFunc: (data: any) => void
    ): Promise<any>;
}

export const HitPayInApp = registerPlugin<HitPayInAppPluginInterface>('HitPayInApp');

export interface PaymentInitiationParams {
    entityKind: PaymentEntityKind;
    entityId: string;
    kind?: 'downpayment' | 'balance' | 'full';
    referenceNumber?: string;
    expectedAmount?: number;
    currency?: string;
    customerEmail?: string;
    customerName?: string;
    customerPhone?: string;
    customerId?: string;
    purpose?: string;
    /**
     * How the gateway presents the checkout. Defaults to 'dropin' — the HitPay
     * hosted-checkout REDIRECTION flow: the payment request is created with
     * `redirect_url` pointing back at the app's /payment/return screen, so every
     * completed/cancelled payment returns the customer to the application.
     */
    checkoutMode?: 'dropin' | 'qrph-native' | 'gcash';
    /**
     * Optional HitPay channel filter (e.g. ['gcash']) so a screen can still
     * preselect a method. Passed straight through to the backend — the
     * customer never controls the amount, only the channel presentation.
     */
    paymentMethods?: string[];
    returnRoute?: string;
    isSandbox?: boolean;
    userConfirmedRetry?: boolean;
    onStateChange?: (state: PaymentState, message?: string, tx?: any) => void;
}

export interface PaymentControllerResult {
    success: boolean;
    state: PaymentState;
    redirected?: boolean;
    checkoutUrl?: string;
    paymentSessionId?: string;
    transactionId?: string;
    paymentRequestId?: string;
    referenceNumber?: string;
    amount?: number;
    currency?: string;
    checkoutMode?: 'card_dropin' | 'qrph_dropin' | 'qrph_native' | 'gcash_direct' | 'portal_fallback' | 'dropin';
    qrCodeData?: string;
    directLinkAppUrl?: string;
    directLinkUrl?: string;
    errorMessage?: string;
}

const STORAGE_ACTIVE_PAYMENT = 'rb_active_payment_session';
const VERIFY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes timeout -> PENDING
/**
 * Hard cap on the payment-create request. A stalled fetch used to hold the
 * single-flight `activePromises` lock forever, after which EVERY payment was
 * refused with "A payment session is already active" until the app restarted.
 */
const CREATE_TIMEOUT_MS = 45 * 1000;

/**
 * PaymentController:
 * Single central orchestrator for initiating payment requests, checking active sessions,
 * listening to Firestore paymentTransactions snapshot, and managing timeouts.
 */
export class PaymentController {
    private static activePromises = new Map<string, Promise<PaymentControllerResult>>();
    private static sessionState = new Map<string, PaymentState>();
    private static snapshotUnsubscribers = new Map<string, () => void>();
    /**
     * Identifiers -> live `setState` for in-flight sessions, so the return
     * coordinator can move a session to RETURN_RECEIVED (spec §7) without
     * re-entering `pay()` and without ever creating a second payment.
     */
    private static returnHandlers = new Map<string, (state: PaymentState, msg?: string, tx?: any) => void>();

    /**
     * Called by the payment return coordinator when a verified return URL
     * arrives. Verification-only: it advances the state machine to
     * RETURN_RECEIVED and never opens a checkout or creates a session.
     * No-op (returns false) when nothing is in flight or the session already
     * settled — a late/duplicate return can never disturb PAID.
     */
    static noteReturnReceived(ids: {
        transactionId?: string;
        paymentRequestId?: string;
        referenceNumber?: string;
    }): boolean {
        const keys = [ids.transactionId, ids.paymentRequestId, ids.referenceNumber]
            .filter((k): k is string => Boolean(k));
        for (const key of keys) {
            const advance = this.returnHandlers.get(key);
            if (advance) {
                advance('RETURN_RECEIVED', 'Payment return received. Verifying with the payment network...');
                return true;
            }
        }
        return false;
    }

    private static registerReturnHandler(
        identifiers: (string | undefined)[],
        advance: (state: PaymentState, msg?: string, tx?: any) => void
    ): void {
        identifiers.forEach((key) => {
            if (key) this.returnHandlers.set(key, advance);
        });
    }

    private static unregisterReturnHandler(identifiers: (string | undefined)[]): void {
        identifiers.forEach((key) => {
            if (key) this.returnHandlers.delete(key);
        });
    }

    /**
     * Check if any payment is currently in an active, non-terminal state.
     */
    static isPaymentInProgress(): boolean {
        return this.activePromises.size > 0;
    }

    /**
     * Initiate or join an in-flight payment request.
     */
    static async pay(params: PaymentInitiationParams): Promise<PaymentControllerResult> {
        const {
            entityKind,
            entityId,
            kind = 'full'
        } = params;

        if (!entityKind || !entityId) {
            throw new Error('Both entityKind and entityId are required to initiate payment.');
        }

        const lockKey = `${entityKind}:${entityId}:${kind}`;
        const existingPromise = this.activePromises.get(lockKey);
        if (existingPromise) {
            // Re-entrant / double tap: join existing in-flight request
            return existingPromise;
        }

        if (this.activePromises.size > 0 && !params.userConfirmedRetry) {
            return {
                success: false,
                state: 'FAILED',
                errorMessage: 'A payment session is already active. Please wait or complete it.'
            };
        }

        const runPromise = this.executePaymentFlow(params, lockKey);
        this.activePromises.set(lockKey, runPromise);

        try {
            return await runPromise;
        } finally {
            this.activePromises.delete(lockKey);
        }
    }

    private static async getAuthToken(): Promise<string | null> {
        try {
            if (auth && auth.currentUser) {
                return await auth.currentUser.getIdToken();
            }
        } catch (e) {
            console.warn('[PaymentController] Unable to fetch Firebase ID token:', e);
        }
        return null;
    }

    /**
     * Maps backend error codes to messages a customer can act on. The raw codes
     * (PAYMENT_AMOUNT_MISMATCH, HITPAY_DISABLED, PERMISSION_DENIED, ...) used to
     * be shown verbatim in the UI — which read as "online payment is broken"
     * with no way forward.
     */
    private static describeCreateFailure(status: number, data: any): string {
        const code = String(data?.error || '');
        const message = String(data?.message || '');
        switch (code) {
            case 'HITPAY_DISABLED':
                return message || 'Online payments are currently disabled in system settings.';
            case 'PAYMENT_AMOUNT_MISMATCH': {
                const authoritative = Number(data?.authoritativeAmount);
                if (Number.isFinite(authoritative) && authoritative > 0) {
                    return `Your payment amount was updated to \u20b1${authoritative.toFixed(2)} ${String(data?.currency || 'PHP')}. Please try again.`;
                }
                return 'The amount for this booking changed. Please refresh and try again.';
            }
            case 'ENTITY_NOT_FOUND':
                // The server message only echoes the raw entity id — always use
                // the customer-facing text here.
                return 'We could not find this booking. Please refresh your bookings and try again.';
            case 'MISSING_PAYMENT_ENTITY':
            case 'INVALID_ENTITY_KIND':
                return message || 'This payment is not linked to a valid booking. Please start again from your booking.';
            case 'PERMISSION_DENIED':
            case 'ACCESS_DENIED':
            case 'FORBIDDEN':
                return message || 'You are not authorized to pay for this booking. Please contact support.';
            case 'INVALID_AUTH_TOKEN':
            case 'MISSING_AUTH_TOKEN':
                return 'Your session has expired. Please log out and log in again, then retry.';
            default:
                if (status === 401) {
                    return message || 'Your session has expired. Please log out and log in again, then retry.';
                }
                if (data?.errors && typeof data.errors === 'object') {
                    const detail = Object.entries(data.errors as Record<string, unknown>)
                        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : String(v)}`)
                        .join('; ');
                    if (detail) return `The payment gateway rejected the request: ${detail}`;
                }
                return message || code || `Payment server error: HTTP ${status}`;
        }
    }

    private static async executePaymentFlow(
        params: PaymentInitiationParams,
        lockKey: string
    ): Promise<PaymentControllerResult> {
        const {
            entityKind,
            entityId,
            kind = 'full',
            referenceNumber: clientReferenceNumber,
            expectedAmount,
            currency = 'PHP',
            customerEmail,
            customerName,
            customerPhone,
            customerId,
            purpose,
            paymentMethods,
            checkoutMode: requestedCheckoutMode = 'dropin',
            returnRoute = window?.location?.pathname || '/customer-portal/',
            isSandbox = true,
            userConfirmedRetry = false,
            onStateChange
        } = params;

        let currentState: PaymentState = 'CREATED';
        const setState = (next: PaymentState, msg?: string, tx?: any) => {
            try {
                currentState = transitionPaymentState(currentState, next, msg);
            } catch (transitionError) {
                // Snapshot events can race the native Activity launch. Ignore
                // stale/reordered states instead of throwing from an async
                // Firestore callback into the app runtime.
                console.warn('[PaymentController] Ignoring out-of-order payment state:', transitionError);
                return;
            }
            this.sessionState.set(lockKey, currentState);
            onStateChange?.(currentState, msg, tx);
        };

        try {
            setState('INITIALIZING', 'Contacting payment server...');

            const token = await this.getAuthToken();
            const headers: Record<string, string> = {
                'Content-Type': 'application/json'
            };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const isNative = Capacitor.isNativePlatform();
            const proxyBase = isNative ? 'https://ridersbud-10806.web.app/api/hitpay-proxy' : '/api/hitpay-proxy';

            const hasMethods = Array.isArray(paymentMethods) && paymentMethods.length > 0;
            // One create attempt, hard-capped so a stalled request always
            // releases the single-flight lock when it gives up.
            const sendCreate = async (amountHint: number | undefined) => {
                const ctrl = new AbortController();
                const timer = setTimeout(() => ctrl.abort(), CREATE_TIMEOUT_MS);
                try {
                    return await fetch(proxyBase, {
                        method: 'POST',
                        headers,
                        signal: ctrl.signal,
                        body: JSON.stringify({
                            action: 'create',
                            entityKind,
                            entityId,
                            kind,
                            referenceNumber: clientReferenceNumber,
                            expectedAmount: amountHint,
                            currency,
                            // Default payment method = HitPay hosted checkout with
                            // redirection back into the app (backend honours redirect_url).
                            checkoutMode: requestedCheckoutMode,
                            // The backend reads snake_case `payment_methods`; the
                            // camelCase alias is kept for older deployments.
                            payment_methods: hasMethods ? paymentMethods : undefined,
                            paymentMethods: hasMethods ? paymentMethods : undefined,
                            customerId: customerId || auth?.currentUser?.uid || '',
                            customerEmail,
                            customerName,
                            customerPhone,
                            purpose,
                            returnRoute,
                            isSandbox,
                            userConfirmedRetry
                        })
                    });
                } finally {
                    clearTimeout(timer);
                }
            };

            let resp = await sendCreate(expectedAmount);
            let data = await resp.json().catch(() => null);

            // Self-heal PAYMENT_AMOUNT_MISMATCH: a screen's amount hint can drift
            // from the backend's authoritative computation (explicit
            // downpaymentAmount, edited totals, partially paid records). The
            // backend answers with ITS amount — adopt it and retry exactly once
            // instead of failing the customer's payment with a hard HTTP 400.
            if (data?.error === 'PAYMENT_AMOUNT_MISMATCH') {
                const authoritative = Number(data.authoritativeAmount);
                const hinted = Number(expectedAmount);
                if (Number.isFinite(authoritative) && authoritative > 0 &&
                    (!Number.isFinite(hinted) || Math.abs(authoritative - hinted) > 0.01)) {
                    console.warn(`[PaymentController] Amount hint ${expectedAmount} != authoritative ${authoritative}; retrying once with the server amount.`);
                    setState('INITIALIZING', 'Updating the amount to match your booking...');
                    resp = await sendCreate(authoritative);
                    data = await resp.json().catch(() => null);
                }
            }

            if (!resp.ok || !data) {
                const err = this.describeCreateFailure(resp.status, data);
                console.warn('[PaymentController] Payment creation failed:', resp.status, data);
                setState('FAILED', err);
                return {
                    success: false,
                    state: 'FAILED',
                    errorMessage: err
                };
            }

            // Backend could not reach HitPay (or credentials are not
            // provisioned): it answers 200 with {fallbackToPortal:true} and NO
            // transactionId / checkoutUrl. Falling through used to reach
            // `setState('WAITING_FOR_PAYMENT')` and return success:true with no
            // checkout to open — every screen then sat on its spinner forever
            // ("Creating secure payment..."). Fail loudly and let the customer
            // retry; never mark this as paid and never leave a stale pending
            // marker that would trigger a phantom resume overlay.
            if (data.fallbackToPortal === true) {
                const portalReason = String(data.reason || '');
                const err = portalReason === 'credentials_not_configured'
                    ? 'Online payments are not enabled yet. Please try again later or contact support.'
                    : String(data.message || data.error || 'The HitPay gateway is currently unreachable. Please try again in a moment.');
                console.warn('[PaymentController] Gateway unavailable (fallbackToPortal):', portalReason || 'unspecified');
                setState('FAILED', err);
                return {
                    success: false,
                    state: 'FAILED',
                    errorMessage: err
                };
            }

            // Already paid server-side
            if (data.alreadyPaid || data.status === 'PAID') {
                setState('PAID', 'Payment is already completed.');
                return {
                    success: true,
                    state: 'PAID',
                    transactionId: data.transactionId,
                    paymentSessionId: data.paymentSessionId,
                    referenceNumber: data.referenceNumber,
                    amount: data.amount,
                    currency: data.currency
                };
            }

            const {
                paymentSessionId,
                transactionId,
                paymentRequestId,
                referenceNumber,
                amount,
                checkoutMode,
                checkoutUrl,
                qrCodeData,
                directLinkAppUrl,
                directLinkUrl
            } = data;

            // Persist return context before launching native checkout. The
            // Android payment activity emits paymentRedirect rather than
            // Capacitor's appUrlOpen event, and the app can be recreated while
            // the user is in a wallet or 3-D Secure screen.
            setPendingPaymentMarker({
                entityKind,
                entityId,
                kind,
                returnRoute,
                initiatedFrom: typeof window !== 'undefined' ? window.location.pathname : returnRoute,
                startedAt: Date.now(),
                transactionId,
                paymentRequestId,
                referenceNumber,
                environment: data.environment || (isSandbox ? 'sandbox' : 'production')
            });

            // Persist session to local storage for crash/background recovery
            try {
                localStorage.setItem(STORAGE_ACTIVE_PAYMENT, JSON.stringify({
                    paymentSessionId,
                    transactionId,
                    paymentRequestId,
                    referenceNumber,
                    entityKind,
                    entityId,
                    kind,
                    startedAt: Date.now()
                }));
            } catch (e) {
                // ignore storage failures
            }

            // Start listening to the authoritative paymentTransactions doc in Firestore
            if (transactionId) {
                const identifiers = [transactionId, paymentRequestId, referenceNumber];
                this.registerReturnHandler(identifiers, setState);
                this.listenToTransaction(transactionId, (txState, txMsg, txDoc) => {
                    if (currentState !== txState && !TERMINAL_STATES.has(currentState)) {
                        setState(txState, txMsg, txDoc);
                    }
                    if (TERMINAL_STATES.has(currentState)) {
                        this.unregisterReturnHandler(identifiers);
                    }
                });
            }

            // Route presentation by checkoutMode
            if (checkoutMode === 'qrph_native' && qrCodeData) {
                setState('CHECKOUT_OPEN', 'QR Ph generated. Please scan to complete payment.');
                setState('WAITING_FOR_PAYMENT', 'Awaiting QR Ph confirmation...');
                return {
                    success: true,
                    state: currentState,
                    paymentSessionId,
                    transactionId,
                    paymentRequestId,
                    referenceNumber,
                    amount,
                    currency,
                    checkoutMode,
                    qrCodeData
                };
            }

            if (checkoutMode === 'gcash_direct') {
                setState('CHECKOUT_OPEN', 'Launching GCash...');
                const targetUrl = directLinkAppUrl || directLinkUrl;
                if (isNative && directLinkAppUrl) {
                    try {
                        await HitPayInApp.openProviderApp({ appUrl: directLinkAppUrl });
                    } catch (e) {
                        if (directLinkUrl) {
                            await Browser.open({ url: directLinkUrl, toolbarColor: '#FE7803' });
                            // Custom Tab fallback: auto-close + return on settlement
                            watchPendingPaymentReturn();
                        }
                    }
                } else if (targetUrl) {
                    window.location.href = targetUrl;
                }
                setState('WAITING_FOR_PAYMENT', 'Waiting for GCash payment confirmation...');
                return {
                    success: true,
                    state: currentState,
                    paymentSessionId,
                    transactionId,
                    paymentRequestId,
                    referenceNumber,
                    amount,
                    currency,
                    checkoutMode,
                    directLinkAppUrl,
                    directLinkUrl
                };
            }

            // Card / dropin modal or native container
            if (checkoutUrl) {
                setState('CHECKOUT_OPEN', 'Opening secure checkout...');
                if (isNative) {
                    try {
                        await HitPayInApp.openPayment({
                            checkoutUrl,
                            sessionId: paymentSessionId,
                            amount: amount ? String(amount) : undefined,
                            reference: referenceNumber
                        });
                    } catch (nativeErr: any) {
                        console.warn('[PaymentController] Native container launch failed; trying secure browser fallback:', nativeErr);
                        try {
                            await Browser.open({ url: checkoutUrl, toolbarColor: '#FE7803' });
                            // Custom Tab fallback: the tab has no bridge — watch the
                            // transaction so settlement closes it and returns the
                            // customer to the app (marker was persisted above).
                            watchPendingPaymentReturn();
                        } catch (browserErr: any) {
                            const errorMessage = browserErr?.message || nativeErr?.message || 'Unable to open HitPay checkout on this device.';
                            setState('FAILED', errorMessage);
                            return {
                                success: false,
                                state: currentState,
                                transactionId,
                                paymentRequestId,
                                referenceNumber,
                                errorMessage
                            };
                        }
                    }
                } else if (typeof window !== 'undefined') {
                    window.location.href = checkoutUrl;
                }

                return {
                    success: true,
                    redirected: true,
                    state: 'CHECKOUT_OPEN',
                    checkoutMode: 'dropin',
                    checkoutUrl,
                    paymentSessionId,
                    transactionId,
                    paymentRequestId,
                    referenceNumber,
                    amount,
                    currency
                };
            }

            setState('WAITING_FOR_PAYMENT', 'Waiting for payment...');
            return {
                success: true,
                state: currentState,
                paymentSessionId,
                transactionId,
                paymentRequestId,
                referenceNumber,
                amount,
                currency,
                checkoutMode
            };

        } catch (err: any) {
            const aborted = err?.name === 'AbortError' || /\babort/i.test(String(err?.message || ''));
            const msg = aborted
                ? 'The payment request timed out. Please check your internet connection and try again.'
                : (err?.message || 'Payment initiation failed');
            setState('FAILED', msg);
            this.unregisterReturnHandler([params.referenceNumber]);
            return {
                success: false,
                state: 'FAILED',
                errorMessage: msg
            };
        }
    }

    /**
     * Realtime Firestore listener for transaction settlement.
     */
    private static listenToTransaction(
        transactionId: string,
        onUpdate: (state: PaymentState, msg: string, txDoc: any) => void
    ) {
        if (!firestore || !transactionId) return;

        // Cleanup existing listener if any
        const existingUnsub = this.snapshotUnsubscribers.get(transactionId);
        if (existingUnsub) {
            existingUnsub();
            this.snapshotUnsubscribers.delete(transactionId);
        }

        const timer = setTimeout(() => {
            // 5 minute timeout -> PENDING
            onUpdate('PENDING', 'Payment confirmation is still pending after 5 minutes. We will notify you once confirmed.', null);
            this.stopListening(transactionId);
        }, VERIFY_TIMEOUT_MS);

        try {
            const txDocRef = doc(firestore, 'paymentTransactions', transactionId);
            const unsub = onSnapshot(txDocRef, (snap) => {
                if (!snap.exists()) return;
                const data = snap.data();
                const status = (data.status || '').toUpperCase();

                if (status === 'PAID') {
                    clearTimeout(timer);
                    onUpdate('PAID', 'Payment verified successfully!', data);
                    this.stopListening(transactionId);
                    this.clearStoredSession();
                } else if (status === 'FAILED') {
                    clearTimeout(timer);
                    onUpdate('FAILED', data.failureReason || 'Payment failed.', data);
                    this.stopListening(transactionId);
                    this.clearStoredSession();
                } else if (status === 'CANCELLED') {
                    clearTimeout(timer);
                    onUpdate('CANCELLED', data.cancelReason || 'Payment was cancelled.', data);
                    this.stopListening(transactionId);
                    this.clearStoredSession();
                } else if (status === 'EXPIRED') {
                    clearTimeout(timer);
                    onUpdate('EXPIRED', 'Payment session expired.', data);
                    this.stopListening(transactionId);
                    this.clearStoredSession();
                } else if (status === 'VERIFYING') {
                    onUpdate('VERIFYING', 'Verifying payment with payment network...', data);
                } else if (status === 'PENDING_REVIEW') {
                    // Backend detected an amount/currency/reference mismatch and
                    // parked the transaction for manual review. Surface it as a
                    // NON-terminal state (spec §7): never claim success, never
                    // claim failure, and never auto-retry into a second payment.
                    clearTimeout(timer);
                    onUpdate('PENDING_REVIEW', 'We received your payment but it needs a quick review. We will update your booking automatically.', data);
                    this.stopListening(transactionId);
                }
            });

            this.snapshotUnsubscribers.set(transactionId, () => {
                clearTimeout(timer);
                unsub();
            });
        } catch (e) {
            console.warn('[PaymentController] Snapshot listener failed:', e);
        }
    }

    private static stopListening(transactionId: string) {
        const unsub = this.snapshotUnsubscribers.get(transactionId);
        if (unsub) {
            unsub();
            this.snapshotUnsubscribers.delete(transactionId);
        }
    }

    private static clearStoredSession() {
        try {
            localStorage.removeItem(STORAGE_ACTIVE_PAYMENT);
        } catch {}
    }

    /**
     * Restore session if app resumes.
     */
    static getStoredActiveSession(): any | null {
        try {
            const raw = localStorage.getItem(STORAGE_ACTIVE_PAYMENT);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }
}
