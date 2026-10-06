import { auth } from '../../firebase';
import { Capacitor } from '@capacitor/core';

export interface ReturnVerificationResult {
    handled: boolean;
    paymentSessionId?: string;
    transactionId?: string;
    referenceNumber?: string;
    paymentRequestId?: string;
    verifiedStatus?: 'PAID' | 'FAILED' | 'CANCELLED' | 'EXPIRED' | 'PENDING' | 'PENDING_REVIEW';
    amount?: number;
    currency?: string;
    errorMessage?: string;
}

const NATIVE_SCHEMES = ['ridersbud:', 'com.sasetin42.ridersbud:'];

/**
 * PaymentReturnCoordinator:
 * Single place for parsing return deep links and App Links.
 * CRITICAL RULE: ONLY performs verification. NEVER re-initiates payments or opens external browser!
 */
export class PaymentReturnCoordinator {
    /**
     * Parses return deep link or App Link.
     * Returns null if URL is not a payment return URL.
     */
    static parseUrl(url: string): {
        paymentSessionId?: string;
        transactionId?: string;
        referenceNumber?: string;
        paymentRequestId?: string;
        event?: string;
    } | null {
        if (!url) return null;
        try {
            const parsed = new URL(url);
            const isNative = NATIVE_SCHEMES.includes(parsed.protocol.toLowerCase());
            const isReturn = isNative
                ? (parsed.host === 'payment' && parsed.pathname.startsWith('/return'))
                : (parsed.pathname === '/payment/return' || parsed.pathname.startsWith('/payment/return'));

            if (!isReturn) return null;

            const params = parsed.searchParams;
            return {
                paymentSessionId: params.get('s') || params.get('sessionId') || undefined,
                transactionId: params.get('tx') || params.get('transaction') || undefined,
                referenceNumber: params.get('ref') || params.get('reference_number') || undefined,
                paymentRequestId: params.get('prid') || params.get('payment_request_id') || params.get('reference') || undefined,
                event: params.get('e') || params.get('event') || undefined
            };
        } catch {
            return null;
        }
    }

    /**
     * Verifies payment via the backend hitpay-proxy verification endpoint.
     * Guaranteed read-only / verification-only; NEVER creates or opens checkout.
     */
    static async verifyReturn(url: string): Promise<ReturnVerificationResult> {
        const parsed = this.parseUrl(url);
        if (!parsed) {
            return { handled: false };
        }

        const { paymentSessionId, transactionId, referenceNumber, paymentRequestId } = parsed;

        try {
            let token: string | null = null;
            if (auth?.currentUser) {
                token = await auth.currentUser.getIdToken().catch(() => null);
            }

            const headers: Record<string, string> = {
                'Content-Type': 'application/json'
            };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const isNative = Capacitor.isNativePlatform();
            const proxyBase = isNative ? 'https://ridersbud-10806.web.app/api/hitpay-proxy' : '/api/hitpay-proxy';

            const queryParams = new URLSearchParams({
                action: 'verify'
            });
            if (paymentSessionId) queryParams.set('sessionId', paymentSessionId);
            if (transactionId) queryParams.set('id', transactionId);
            if (referenceNumber) queryParams.set('ref', referenceNumber);
            if (paymentRequestId) queryParams.set('prid', paymentRequestId);

            const resp = await fetch(`${proxyBase}?${queryParams.toString()}`, {
                method: 'GET',
                headers
            });

            const data = await resp.json().catch(() => null);

            if (!resp.ok || !data) {
                return {
                    handled: true,
                    paymentSessionId,
                    transactionId,
                    referenceNumber,
                    paymentRequestId,
                    verifiedStatus: 'PENDING',
                    errorMessage: data?.error || 'Verification pending'
                };
            }

            const status = (data.status || data.transaction?.status || 'PENDING').toUpperCase();
            return {
                handled: true,
                paymentSessionId,
                transactionId: data.transactionId || transactionId,
                referenceNumber: data.referenceNumber || referenceNumber,
                paymentRequestId: data.paymentRequestId || paymentRequestId,
                verifiedStatus: status,
                amount: data.amount || data.transaction?.amount,
                currency: data.currency || data.transaction?.currency
            };
        } catch (err: any) {
            return {
                handled: true,
                paymentSessionId,
                transactionId,
                referenceNumber,
                paymentRequestId,
                verifiedStatus: 'PENDING',
                errorMessage: err?.message || 'Verification network error'
            };
        }
    }
}
