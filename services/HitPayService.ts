import { PaymentRequest, PaymentSession, Settings } from '../types';
import { auth } from '../firebase';

const SANDBOX_API_URL = 'https://api.sandbox.hit-pay.com/v1';
const PRODUCTION_API_URL = 'https://api.hit-pay.com/v1';

export const getLiveAppOrigin = (): string => {
    if (typeof window !== 'undefined') {
        const origin = window.location.origin;
        if (origin && !origin.includes('localhost') && !origin.includes('127.0.0.1') && !origin.startsWith('capacitor:')) {
            return origin;
        }
    }
    return 'https://ridersbud-10806.web.app';
};

/**
 * Returns the absolute proxy endpoint if running inside Capacitor Android/iOS APK,
 * or relative endpoint if running on web.
 */
export const getHitPayProxyEndpoint = (path: string = '/api/hitpay-proxy'): string => {
    if (typeof window !== 'undefined') {
        const isNative = (window as any).Capacitor?.isNativePlatform?.() || window.location.protocol === 'capacitor:';
        if (isNative) {
            return `https://ridersbud-10806.web.app${path}`;
        }
    }
    return path;
};

/**
 * SECURITY MODEL:
 *
 * HitPay credentials NEVER touch the client. Every gateway call goes through
 * the hitpayProxy Cloud Function (or the same function via the dev forwarder),
 * which:
 *   - resolves credentials server-side (env / settings/hitpaySecrets),
 *   - enforces the authoritative amount from Firestore,
 *   - creates/reuses the paymentTransactions record (idempotency),
 *   - reuses an existing pending HitPay payment request for the same reference
 *     so double taps cannot spawn duplicate payment sessions.
 */
class HitPayService {
    private baseUrl: string;
    private isSandbox: boolean;

    constructor(_apiKey: string = '', _salt: string = '', isSandbox: boolean = true) {
        this.baseUrl = isSandbox ? SANDBOX_API_URL : PRODUCTION_API_URL;
        this.isSandbox = isSandbox;
    }

    /**
     * Creates a HitPayService instance from the app's Firestore Settings.
     * Optionally accepts an explicit overrideIsSandbox boolean.
     */
    static fromSettings(settings: Settings | undefined, overrideIsSandbox?: boolean): HitPayService {
        const isSandbox = typeof overrideIsSandbox === 'boolean'
            ? overrideIsSandbox
            : (settings?.hitpaySandboxMode ?? true);
        return new HitPayService('', '', isSandbox);
    }

    /**
     * Checks if the HitPay Gateway is enabled in system settings.
     * Availability of actual credentials is verified server-side by hitpayProxy.
     */
    static isGatewayActive(settings: Settings | undefined): boolean {
        if (!settings) return false;
        return settings.hitpayEnabled !== false;
    }

    /**
     * Credentials are always "configured" from the client's perspective —
     * the Cloud Function holds them and returns fallbackToPortal if missing.
     */
    isConfigured(): boolean {
        return true;
    }

    /**
     * Returns whether current instance is running in Sandbox mode.
     */
    getIsSandbox(): boolean {
        return this.isSandbox;
    }

    /**
     * Helper to sanitize and validate payload before dispatching to HitPay API
     */
    private sanitizePayload(data: PaymentRequest): Record<string, any> {
        // 1. Amount: Must be number >= 0.30 with at most 2 decimal places
        const rawAmount = Number(data.amount);
        const amount = isNaN(rawAmount) || rawAmount < 0.3 ? 0.3 : Number(rawAmount.toFixed(2));

        // 2. Email: Must be valid RFC 5322 format or fallback
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const validEmail = (data.email && emailRegex.test(data.email.trim()))
            ? data.email.trim()
            : 'customer@ridersbud.com';

        // 3. Currency: Always uppercase 3 letters (defaults to PHP)
        const currency = (data.currency || 'PHP').toUpperCase();

        // 4. Reference Number: stable idempotency key supplied by the orchestrator.
        //    (The backend rejects duplicate active sessions for the same reference.)
        const reference_number = data.reference_number || `RB-${Date.now()}`;

        // 5. Purpose: Max 255 chars as enforced by HitPay validation
        const purpose = (data.purpose || 'RidersBUD Service Payment').slice(0, 250);

        // 6. Name: Max 100 chars, non-empty
        const name = (data.name && data.name.trim().length > 0) ? data.name.trim().slice(0, 100) : 'RidersBud Customer';

        // 7. Redirect URL: HitPay ONLY accepts http(s) URIs (custom schemes are
        //    rejected with 422 — validated against the live API). The HTTPS return
        //    route is a verified App Link that hands off to ridersbud://payment/return.
        //    The backend always rewrites this to its authoritative value.
        let redirect_url = data.redirect_url;
        if (!redirect_url || redirect_url.includes('localhost') || redirect_url.includes('127.0.0.1') || redirect_url.startsWith('capacitor:')) {
            // Default to the verified App-Link return route — /customer-portal/
            // is NOT covered by the App Links intent filter, so landing there
            // from a Custom Tab stranded the customer outside the app.
            const cleanPath = redirect_url
                ? redirect_url.replace(/^(https?:\/\/[^\/]+|capacitor:\/\/localhost)/i, '')
                : '/payment/return';
            redirect_url = `${getLiveAppOrigin()}${cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`}`;
        }

        // 8. Webhook: Authoritative Cloud Function endpoint (backend always
        //    overrides this with the registered endpoint anyway).
        let webhook = data.webhook;
        if (!webhook || webhook.includes('localhost') || webhook.includes('127.0.0.1') || webhook.includes('/payment/webhook')) {
            webhook = 'https://ridersbud-10806.web.app/api/hitpay-webhook';
        }

        const payload: Record<string, any> = {
            amount,
            currency,
            reference_number,
            redirect_url,
            webhook,
            email: validEmail,
            name,
            purpose
        };

        // 8b. Payment methods — only mapped to codes the gateway understands; if the
        //     account does not expose them the backend retries without the filter so
        //     HitPay renders all activated channels (never a hard-coded dead method).
        if (data.payment_methods && Array.isArray(data.payment_methods) && data.payment_methods.length > 0) {
            const mappedMethods: string[] = [];
            for (const method of data.payment_methods) {
                const m = String(method).toLowerCase().trim();
                if (m === 'card' || m === 'card_cybersource') {
                    mappedMethods.push('card_cybersource');
                } else if (m === 'qrph' || m === 'qrph_netbank') {
                    mappedMethods.push('qrph_netbank');
                } else if (m === 'paymaya' || m === 'maya' || m === 'upay_instapay') {
                    mappedMethods.push('upay_instapay');
                } else if (this.isSandbox && (m === 'gcash' || m === 'gcash_qr')) {
                    mappedMethods.push('gcash');
                }
                // For live accounts where GCash is handled via QRPH / InstaPay / HitPay
                // hosted channels, omitting the restrictive filter lets hosted checkout
                // display every activated channel.
            }

            if (mappedMethods.length > 0) {
                payload.payment_methods = Array.from(new Set(mappedMethods));
            }
        }

        // 9. Phone: Normalize to international E.164 format (+639...) so HitPay auto-fills without prompting
        if (data.phone && typeof data.phone === 'string' && data.phone.trim().length >= 7) {
            const raw = data.phone.trim();
            const digits = raw.replace(/\D/g, '');
            if (raw.startsWith('+') && digits.length >= 10) {
                payload.phone = `+${digits}`;
            } else if (digits.startsWith('09') && digits.length === 11) {
                payload.phone = `+63${digits.slice(1)}`;
            } else if (digits.startsWith('9') && digits.length === 10) {
                payload.phone = `+63${digits}`;
            } else if (digits.startsWith('63') && digits.length >= 12) {
                payload.phone = `+${digits}`;
            } else if (digits.length >= 7) {
                payload.phone = digits;
            }
        }

        // 10. Address: HitPay requires address.line1, address.city, and address.country if address is provided
        if (data.address && data.address.line1 && data.address.city) {
            payload.address = {
                line1: data.address.line1,
                line2: data.address.line2 || '',
                city: data.address.city,
                state: data.address.state || '',
                postal_code: data.address.postal_code || '',
                country: data.address.country || 'PH'
            };
        }

        // 11. Payment lifecycle metadata for backend authoritative verification
        if (data.entityKind) payload.entityKind = data.entityKind;
        if (data.entityId) payload.entityId = data.entityId;
        if (data.transactionId) payload.transactionId = data.transactionId;
        if (data.kind) payload.kind = data.kind;
        if (data.customerId) payload.customerId = data.customerId;
        if (data.force) payload.force = data.force;

        return payload;
    }

    /**
     * Queries the server proxy for the authoritative status of a payment request.
     * No client-side credentials required.
     */
    async getPaymentStatus(paymentRequestId: string): Promise<any> {
        if (!paymentRequestId) throw new Error('Payment Request ID is required');

        try {
            const endpoint = getHitPayProxyEndpoint(`/api/hitpay-proxy?action=status&id=${encodeURIComponent(paymentRequestId)}&sandbox=${this.isSandbox ? 'true' : 'false'}`);
            const resp = await fetch(endpoint);
            if (resp.ok) {
                return await resp.json();
            }
            throw new Error(`HitPay status query failed: HTTP ${resp.status}`);
        } catch (e: any) {
            console.warn('Unable to verify status with HitPay API:', e?.message);
            return null;
        }
    }

    /**
     * Creates (or reuses) a payment request via the hitpayProxy Cloud Function.
     *
     * Guarantees:
     *  - The backend creates/updates `paymentTransactions/{transactionId}` BEFORE the
     *    payment UI opens (INITIATED -> PENDING).
     *  - The SAME reference never spawns two concurrent HitPay requests: a pending
     *    session is returned as-is (`reused: true`); a PAID session returns
     *    `alreadyPaid: true` with NO new session.
     *  - Credentials never leave the server. No synthetic payment ids are fabricated.
     */
    async createPaymentRequest(data: PaymentRequest): Promise<PaymentSession> {
        if (!data?.amount) {
            throw new Error("HitPay payment request requires an amount.");
        }

        const payload = this.sanitizePayload(data);

        type Attempt =
            | { kind: 'ok'; session: PaymentSession }
            | { kind: 'paid'; session: PaymentSession }
            | { kind: 'portal'; reason: string }
            | { kind: 'error'; message: string; retryable: boolean; retryWithoutMethods?: boolean };

        const dispatch = async (payloadToSend: Record<string, any>): Promise<Attempt> => {
            let proxyResp: Response;
            try {
                let token: string | null = null;
                try {
                    if (auth && auth.currentUser) {
                        token = await auth.currentUser.getIdToken();
                    }
                } catch (_) {}

                const headers: Record<string, string> = {
                    'Content-Type': 'application/json'
                };
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }

                proxyResp = await fetch(getHitPayProxyEndpoint('/api/hitpay-proxy'), {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        isSandbox: this.isSandbox,
                        entityKind: data.entityKind,
                        entityId: data.entityId,
                        transactionId: data.transactionId,
                        referenceNumber: data.reference_number,
                        kind: data.kind,
                        customerId: data.customerId || auth?.currentUser?.uid || '',
                        customerEmail: data.email || payloadToSend.email || '',
                        force: data.force === true,
                        // Credentials are resolved server-side — never sent from the client
                        payload: payloadToSend
                    })
                });
            } catch (networkErr: any) {
                return {
                    kind: 'error',
                    message: networkErr?.message || 'Proxy network failure',
                    retryable: true
                };
            }

            const contentType = proxyResp.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                // HTML/404 body: proxy route missing or misconfigured
                return {
                    kind: 'error',
                    message: `Backend HitPay proxy returned HTTP ${proxyResp.status}.`,
                    retryable: proxyResp.status >= 500
                };
            }

            const proxyResult = await proxyResp.json().catch(() => null);

            if (proxyResult && proxyResult.alreadyPaid) {
                return {
                    kind: 'paid',
                    session: {
                        url: '',
                        id: String(proxyResult.paymentRequestId || ''),
                        transactionId: String(proxyResult.transactionId || ''),
                        referenceNumber: String(proxyResult.referenceNumber || data.reference_number || ''),
                        environment: String(proxyResult.environment || ''),
                        alreadyPaid: true,
                        status: 'PAID'
                    }
                };
            }

            if (proxyResp.ok && proxyResult && proxyResult.url) {
                return {
                    kind: 'ok',
                    session: {
                        url: String(proxyResult.url),
                        id: proxyResult.id ? String(proxyResult.id) : '',
                        transactionId: proxyResult.transactionId ? String(proxyResult.transactionId) : '',
                        referenceNumber: proxyResult.referenceNumber ? String(proxyResult.referenceNumber) : data.reference_number,
                        environment: proxyResult.environment ? String(proxyResult.environment) : (this.isSandbox ? 'sandbox' : 'production'),
                        status: proxyResult.status ? String(proxyResult.status) : 'PENDING',
                        reused: proxyResult.reused === true
                    }
                };
            }

            if (proxyResult && proxyResult.fallbackToPortal) {
                return {
                    kind: 'portal',
                    reason: String(proxyResult.message || proxyResult.reason || 'HitPay gateway is currently unreachable.')
                };
            }

            if (proxyResult) {
                const errors = proxyResult.errors as Record<string, string[]> | undefined;
                const errorDetail = errors
                    ? Object.entries(errors).map(([k, v]) => `${k}: ${(v as string[]).join(', ')}`).join('; ')
                    : (proxyResult.message || proxyResult.error || 'Payment request validation error');
                return {
                    kind: 'error',
                    message: typeof errorDetail === 'string' ? errorDetail : JSON.stringify(errorDetail),
                    // Validation errors are deterministic — retrying would just add latency
                    retryable: false,
                    // The account may not expose the requested channel codes — retry once
                    // without the filter so HitPay renders its activated methods.
                    retryWithoutMethods: !!(errors && errors.payment_methods) && !!payloadToSend.payment_methods
                };
            }

            return { kind: 'error', message: 'Payment proxy returned an empty response.', retryable: true };
        };

        let attempt = await dispatch(payload);

        // One retry for transient network / upstream failures, and one retry without
        // payment-method filters if the gateway rejected the channel codes.
        if (attempt.kind === 'portal' || (attempt.kind === 'error' && attempt.retryable)) {
            await new Promise(r => setTimeout(r, 1500));
            attempt = await dispatch(payload);
        } else if (attempt.kind === 'error' && attempt.retryWithoutMethods) {
            const { payment_methods: _omitted, ...payloadWithoutMethods } = payload;
            attempt = await dispatch(payloadWithoutMethods);
        }

        if (attempt.kind === 'ok' || attempt.kind === 'paid') {
            return attempt.session;
        }

        if (attempt.kind === 'portal') {
            // Gateway connection blocked/unavailable — route to the in-app checkout portal,
            // which surfaces a friendly, retryable error.
            const params = new URLSearchParams({
                amount: String(payload.amount),
                currency: payload.currency || 'PHP',
                reference: payload.reference_number,
                redirect_url: payload.redirect_url || `${getLiveAppOrigin()}/payment/return`,
                email: payload.email || 'customer@ridersbud.com',
                name: payload.name || 'Valued Customer',
                purpose: payload.purpose || 'RidersBUD Payment',
                sandbox: this.isSandbox ? 'true' : 'false'
            });
            if (payload.phone) params.set('phone', payload.phone);
            if (payload.payment_methods?.[0]) params.set('method', payload.payment_methods[0]);
            return {
                url: `/hitpay-checkout?${params.toString()}`,
                id: '',
                transactionId: data.transactionId || '',
                referenceNumber: data.reference_number,
                environment: this.isSandbox ? 'sandbox' : 'production',
                portalFallback: true
            };
        }

        throw new Error(`Unable to initialize HitPay payment session: ${attempt.message || 'HitPay gateway is currently unreachable. Please verify your internet or try again.'}`);
    }
}

export { HitPayService };
