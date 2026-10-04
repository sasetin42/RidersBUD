import { HitPayService } from './HitPayService';
import { PaymentEntityKind } from '../utils/firestoreCollections';
import { setPendingPaymentMarker, openPaymentUrl, startPaymentWatcher } from '../utils/paymentRedirect';
import { PaymentSession } from '../types';

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
    customerId?: string;
    /** 'downpayment' | 'balance' | 'full' — how settlement applies to the entity. */
    kind?: string;
    returnRoute: string;
    isSandbox?: boolean;
    settings?: any;
    /** Session already created in the background (pre-warm) — reuse it instead of paying for a second one. */
    prewarmedSession?: { url: string; id: string; transactionId?: string } | null;
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
    /** paymentTransactions/{transactionId} — authoritative settlement record. */
    transactionId?: string;
    amount?: number;
    currency?: string;
    paymentMethod?: string;
    timestamp?: string;
    errorMessage?: string;
}

/**
 * HitPayEmbeddedService — the single payment orchestration layer.
 *
 * Flow:
 * 1. Transaction-level lock: double taps join the SAME in-flight session;
 *    a different payment is rejected while one is active.
 * 2. Creates (or reuses) the session server-side via hitpayProxy — the backend
 *    creates `paymentTransactions/{tx}` (INITIATED → PENDING) and never spawns
 *    a duplicate HitPay request for the same stable reference.
 *    A PAID transaction short-circuits (`alreadyPaid`) — no new session.
 * 3. Presents the payment in a Chrome Custom Tab (secure native browser) —
 *    never window.location, window.open, or an uncontrolled WebView.
 * 4. Watches the server-settled transaction: PAID closes the tab, clears the
 *    pending marker/lock and routes back; the status screen shows the receipt.
 *    Only server verification can ever produce PAID.
 */
class HitPayEmbeddedService {
    /** key = entityKind:entityId:kind → in-flight session promise (double-tap join). */
    private static activeSessions = new Map<string, Promise<CheckoutResult>>();

    static isSessionActive(): boolean {
        return this.activeSessions.size > 0;
    }

    static async startCheckout(params: CheckoutSessionParams): Promise<CheckoutResult> {
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
            customerId,
            kind,
            returnRoute,
            isSandbox = true,
            settings,
            prewarmedSession,
            onStateChange
        } = params;

        // --- Session lock (requirement #11) ---
        const lockKey = `${entityKind}:${entityId}:${kind || referenceNumber}`;
        const inFlight = this.activeSessions.get(lockKey);
        if (inFlight) {
            // Same payment tapped again → join the existing session (no duplicate).
            return inFlight;
        }
        if (this.activeSessions.size > 0) {
            return {
                success: false,
                paymentState: 'FAILED',
                errorMessage: 'A payment session is already in progress. Please complete or close it first.'
            };
        }

        const run = this.launchSession(params, {
            entityKind, entityId, amount, currency, referenceNumber, purpose,
            customerEmail, customerName, customerPhone, customerId, kind,
            returnRoute, isSandbox, settings, prewarmedSession, onStateChange
        }, lockKey);

        this.activeSessions.set(lockKey, run);
        try {
            return await run;
        } finally {
            this.activeSessions.delete(lockKey);
        }
    }

    private static async launchSession(
        params: CheckoutSessionParams,
        ctx: {
            entityKind: PaymentEntityKind; entityId: string; amount: number; currency: string;
            referenceNumber: string; purpose: string; customerEmail?: string; customerName?: string;
            customerPhone?: string; customerId?: string; kind?: string; returnRoute: string;
            isSandbox: boolean; settings: any;
            prewarmedSession?: { url: string; id: string; transactionId?: string } | null;
            onStateChange?: (state: PaymentState, message?: string) => void;
        },
        lockKey: string
    ): Promise<CheckoutResult> {
        const {
            entityKind, entityId, amount, currency, referenceNumber, purpose,
            customerEmail, customerName, customerPhone, customerId, kind,
            returnRoute, isSandbox, settings, prewarmedSession, onStateChange
        } = ctx;

        const baseResult = {
            referenceNumber,
            amount,
            currency,
            timestamp: new Date().toISOString()
        };

        try {
            onStateChange?.('PENDING', 'Initializing Payment...');

            // 1. Session — reuse the background pre-warm when available (the backend
            //    still owns idempotency: same reference ⇒ same HitPay request).
            let session: PaymentSession | null = prewarmedSession?.url
                ? { url: prewarmedSession.url, id: prewarmedSession.id, transactionId: prewarmedSession.transactionId }
                : null;

            if (!session) {
                onStateChange?.('PENDING', 'Connecting to HitPay...');

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
                    purpose: purpose.slice(0, 250),
                    entityKind,
                    entityId,
                    kind,
                    customerId
                });
            }

            // Already PAID server-side (stale marker / re-tap after success):
            // show the success state without ever reopening a payment session.
            if ((session as PaymentSession).alreadyPaid) {
                onStateChange?.('PAID', 'Payment Successful');
                setPendingPaymentMarker({
                    entityKind,
                    entityId,
                    returnRoute,
                    startedAt: Date.now(),
                    purpose,
                    transactionId: (session as PaymentSession).transactionId,
                    paymentRequestId: session.id || undefined,
                    referenceNumber,
                    environment: isSandbox ? 'sandbox' : 'production',
                    initiatedFrom: typeof window !== 'undefined' ? window.location.pathname : undefined
                });
                return {
                    success: true,
                    paymentState: 'PAID',
                    redirected: false,
                    paymentRequestId: session.id || undefined,
                    transactionId: (session as PaymentSession).transactionId,
                    ...baseResult
                };
            }

            if (!session?.url) {
                throw new Error('Server did not return a valid payment session.');
            }

            const transactionId = (session as PaymentSession).transactionId || '';
            const environment = (session as PaymentSession).environment || (isSandbox ? 'sandbox' : 'production');

            // 2. Persist recovery marker (survives backgrounding / process death)
            setPendingPaymentMarker({
                entityKind,
                entityId,
                returnRoute,
                startedAt: Date.now(),
                purpose,
                transactionId: transactionId || undefined,
                paymentRequestId: session.id || undefined,
                referenceNumber,
                environment,
                initiatedFrom: typeof window !== 'undefined' ? window.location.pathname : undefined
            });

            const isAbsoluteUrl = /^https?:\/\//i.test(session.url);

            if (isAbsoluteUrl) {
                // 3. Secure native presentation (Chrome Custom Tab) + server-truth watcher
                onStateChange?.('PROCESSING', 'Opening Secure HitPay Checkout...');
                startPaymentWatcher(entityKind, entityId, returnRoute, transactionId || undefined);
                await openPaymentUrl(session.url, purpose || 'Secure Online Payment');
                return {
                    success: true,
                    paymentState: 'PROCESSING',
                    redirected: true,
                    paymentRequestId: session.id || undefined,
                    transactionId,
                    ...baseResult
                };
            }

            // Fallback for non-absolute/offline portal URLs
            const portalUrl = session.url || `/hitpay-checkout?amount=${amount}&currency=${currency}&reference=${encodeURIComponent(referenceNumber)}`;
            onStateChange?.('PROCESSING', 'Opening Payment Portal...');
            return {
                success: true,
                paymentState: 'PROCESSING',
                redirectTo: portalUrl,
                paymentRequestId: session.id || undefined,
                transactionId,
                ...baseResult
            };
        } catch (err: any) {
            const message = err?.message || 'Failed to start payment';
            onStateChange?.('FAILED', message);
            return {
                success: false,
                paymentState: 'FAILED',
                errorMessage: message,
                // Lock is released (activeSessions entry removed by caller) so the
                // customer can retry after a failure — only terminal states and
                // completed sessions keep the session from re-arming.
                ...baseResult
            };
        } finally {
            void lockKey;
        }
    }
}

export { HitPayEmbeddedService };
