import { HitPayService } from './HitPayService';
import { PaymentEntityKind } from '../utils/firestoreCollections';
import { PaymentController } from './payment/PaymentController';
import { PaymentState } from './payment/paymentStateMachine';

export type { PaymentState };

export interface CheckoutSessionParams {
    entityKind: PaymentEntityKind;
    entityId: string;
    /** Amount hint only — the backend always recomputes the authoritative amount.
     *  Leave undefined (or 0) on retries so an edited entity can never trigger a
     *  PAYMENT_AMOUNT_MISMATCH rejection. */
    amount?: number;
    currency?: string;
    referenceNumber: string;
    purpose: string;
    customerEmail?: string;
    customerName?: string;
    customerPhone?: string;
    customerId?: string;
    /** 'downpayment' | 'balance' | 'full' — how settlement applies to the entity. */
    kind?: 'downpayment' | 'balance' | 'full';
    returnRoute: string;
    isSandbox?: boolean;
    settings?: any;
    prewarmedSession?: { url: string; id: string; transactionId?: string } | null;
    onStateChange?: (state: PaymentState, message?: string) => void;
}

export interface CheckoutResult {
    success: boolean;
    paymentState: PaymentState;
    redirected?: boolean;
    redirectTo?: string;
    referenceNumber?: string;
    paymentRequestId?: string;
    transactionId?: string;
    amount?: number;
    currency?: string;
    paymentMethod?: string;
    timestamp?: string;
    errorMessage?: string;
}

/**
 * HitPayEmbeddedService:
 * Thin facade over PaymentController to maintain backward compatibility with existing callers
 * while strictly enforcing the centralized state machine, locking, and single orchestrator rules.
 */
class HitPayEmbeddedService {
    static isSessionActive(): boolean {
        return PaymentController.isPaymentInProgress();
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
            kind = 'full',
            returnRoute,
            isSandbox = true,
            onStateChange
        } = params;

        const controllerRes = await PaymentController.pay({
            entityKind,
            entityId,
            kind,
            expectedAmount: amount,
            currency,
            customerEmail,
            customerName,
            customerPhone,
            customerId: params.customerId,
            purpose,
            returnRoute,
            isSandbox,
            onStateChange: (state, msg) => {
                onStateChange?.(state, msg);
            }
        });

        return {
            success: controllerRes.success,
            paymentState: controllerRes.state,
            redirected: Boolean(
                controllerRes.redirected ||
                controllerRes.checkoutUrl ||
                controllerRes.checkoutMode === 'card_dropin' ||
                controllerRes.checkoutMode === 'gcash_direct' ||
                controllerRes.checkoutMode === 'dropin'
            ),
            referenceNumber: controllerRes.referenceNumber || referenceNumber,
            paymentRequestId: controllerRes.paymentRequestId,
            transactionId: controllerRes.transactionId,
            amount: controllerRes.amount || amount,
            currency: controllerRes.currency || currency,
            timestamp: new Date().toISOString(),
            errorMessage: controllerRes.errorMessage
        };
    }
}

export { HitPayEmbeddedService };
export default HitPayEmbeddedService;
