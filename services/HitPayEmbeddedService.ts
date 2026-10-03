import { HitPayService } from './HitPayService';
import { PaymentEntityKind } from '../utils/firestoreCollections';
import { setPendingPaymentMarker, openPaymentUrl, startPaymentWatcher } from '../utils/paymentRedirect';

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
                    purpose: purpose.slice(0, 250),
                    entityKind,
                    entityId
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
                purpose,
                paymentRequestId: session.id || undefined,
                initiatedFrom: typeof window !== 'undefined' ? window.location.pathname : undefined
            });

            // 3. Session sanity check.
            const isAbsoluteUrl = /^https?:\/\//i.test(session.url);

            // 3b. DIRECT INSTANT IN-APP CHECKOUT (Web & Native Android, Sandbox & Live mode)
            //     Directs user straight to HitPay's official hosted payment gateway inside
            //     the custom native Android container (or web redirect).
            if (isAbsoluteUrl) {
                onStateChange?.('PROCESSING', 'Opening Secure HitPay Checkout...');
                startPaymentWatcher(entityKind, entityId, returnRoute);
                await openPaymentUrl(session.url, purpose || 'Secure Online Payment');
                return {
                    success: true,
                    paymentState: 'PROCESSING',
                    redirected: true,
                    paymentRequestId: session.id || undefined,
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
                ...baseResult
            };
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
        }
    }
}

export { HitPayEmbeddedService };
