import { PaymentRequest, Settings } from '../types';

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
 * Returns the absolute proxy endpoint if running inside Capacitor Android APK,
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
 * The HitPay credentials can be stored server-side or in Firestore settings/main.
 * All gateway calls go through the hitpayProxy endpoint (Vite dev proxy locally,
 * Cloud Function in production / native APK).
 */
class HitPayService {
    private baseUrl: string;
    private isSandbox: boolean;
    private apiKey: string;

    constructor(apiKey: string = '', _salt: string = '', isSandbox: boolean = true) {
        this.baseUrl = isSandbox ? SANDBOX_API_URL : PRODUCTION_API_URL;
        this.isSandbox = isSandbox;
        this.apiKey = apiKey;
    }

    /**
     * Creates a HitPayService instance from the app's Firestore Settings.
     * Optionally accepts an explicit overrideIsSandbox boolean.
     */
    static fromSettings(settings: Settings | undefined, overrideIsSandbox?: boolean): HitPayService {
        const isSandbox = typeof overrideIsSandbox === 'boolean'
            ? overrideIsSandbox
            : (settings?.hitpaySandboxMode ?? false);
        const apiKey = isSandbox 
            ? (settings?.hitpaySandboxApiKey || '') 
            : (settings?.hitpayApiKey || '');
        return new HitPayService(apiKey, '', isSandbox);
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

        // 4. Reference Number: Alphanumeric with hyphens
        const reference_number = data.reference_number || `REF-${Date.now()}`;

        // 5. Purpose: Max 255 chars as enforced by HitPay validation
        const purpose = (data.purpose || 'RidersBUD Service Payment').slice(0, 250);

        // 6. Name: Max 100 chars, non-empty
        const name = (data.name && data.name.trim().length > 0) ? data.name.trim().slice(0, 100) : 'RidersBud Customer';

        // 7. Redirect URL: NEVER allow localhost or capacitor:// to go to HitPay!
        // On native APK (Capacitor) or localhost, map to the live production domain.
        let redirect_url = data.redirect_url;
        if (!redirect_url || redirect_url.includes('localhost') || redirect_url.includes('127.0.0.1') || redirect_url.startsWith('capacitor:')) {
            const cleanPath = redirect_url
                ? redirect_url.replace(/^(https?:\/\/[^\/]+|capacitor:\/\/localhost)/i, '')
                : '/customer-portal/';
            redirect_url = `${getLiveAppOrigin()}${cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`}`;
        }

        // 8. Webhook: Authoritative Cloud Function webhook endpoint
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

        // 8. Payment Methods filter (e.g. ['gcash'], ['qrph'], ['card'], ['paymaya'])
        // Map UI method codes to valid gateway codes based on HitPay environment
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
                // For live accounts where GCash is handled via QRPH / InstaPay / HitPay hosted channels,
                // omitting the restrictive single filter allows HitPay hosted checkout to display all channels
            }

            // Only attach payment_methods if we have non-empty mapped methods.
            // If empty, HitPay renders all activated channels on the business account.
            if (mappedMethods.length > 0) {
                payload.payment_methods = Array.from(new Set(mappedMethods));
            }
        }

        // 9. Phone: Only include if clean digits/plus exist and not dummy string
        if (data.phone && typeof data.phone === 'string' && data.phone.trim().length >= 7) {
            const cleanPhone = data.phone.replace(/[^\d+]/g, '');
            if (cleanPhone.length >= 7) {
                payload.phone = cleanPhone;
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
     * Creates a payment request via the hitpayProxy Cloud Function and returns
     * the official HitPay hosted checkout URL.
     *
     * IMPORTANT — payment session ids are NEVER fabricated. HitPay's drop-in resolves
     * `GET /v1/business/{id}/checkout-dropin-pr`, so a synthetic id (the old
     * `hitpay_<timestamp>` placeholder) returns 404, the sheet never renders and the
     * customer is left on an infinite spinner. When the gateway cannot be reached we
     * instead return `portalFallback: true` with an EMPTY id so callers can route to
     * the in-app checkout portal.
     */
    async createPaymentRequest(data: PaymentRequest): Promise<{ url: string, id: string, portalFallback?: boolean }> {
        if (!data?.amount) {
            throw new Error("HitPay payment request requires an amount.");
        }

        const payload = this.sanitizePayload(data);

        type Attempt =
            | { kind: 'ok'; url: string; id: string }
            | { kind: 'portal'; reason: string }
            | { kind: 'error'; message: string; retryable: boolean };

        const dispatch = async (): Promise<Attempt> => {
            let proxyResp: Response;
            try {
                proxyResp = await fetch(getHitPayProxyEndpoint('/api/hitpay-proxy'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        isSandbox: this.isSandbox,
                        apiKey: this.apiKey || undefined,
                        payload
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

            if (proxyResp.ok && proxyResult && proxyResult.url) {
                return {
                    kind: 'ok',
                    url: String(proxyResult.url),
                    id: proxyResult.id ? String(proxyResult.id) : ''
                };
            }

            if (proxyResult && proxyResult.fallbackToPortal) {
                // Upstream HitPay unreachable at that moment — worth one retry
                return {
                    kind: 'portal',
                    reason: String(proxyResult.message || proxyResult.reason || 'HitPay gateway is currently unreachable.')
                };
            }

            if (proxyResult) {
                const errorDetail = proxyResult.errors
                    ? Object.entries(proxyResult.errors).map(([k, v]) => `${k}: ${(v as any[]).join(', ')}`).join('; ')
                    : (proxyResult.message || proxyResult.error || 'Payment request validation error');
                return {
                    kind: 'error',
                    message: typeof errorDetail === 'string' ? errorDetail : JSON.stringify(errorDetail),
                    // Validation errors are deterministic — retrying would just add latency
                    retryable: false
                };
            }

            return { kind: 'error', message: 'Payment proxy returned an empty response.', retryable: true };
        };

        let attempt = await dispatch();

        // One automatic retry for transient network / upstream failures so a single
        // blip doesn't degrade a healthy checkout into the fallback portal.
        const retryable = attempt.kind === 'portal' || (attempt.kind === 'error' && attempt.retryable);
        if (retryable) {
            await new Promise(r => setTimeout(r, 1500));
            attempt = await dispatch();
        }

        if (attempt.kind === 'ok') {
            return { url: attempt.url, id: attempt.id };
        }

        if (attempt.kind === 'portal') {
            // Gateway connection blocked/unavailable — route to the in-app checkout portal,
            // which creates its own session and surfaces a friendly, retryable error.
            const params = new URLSearchParams({
                amount: String(payload.amount),
                currency: payload.currency || 'PHP',
                reference: payload.reference_number,
                redirect_url: payload.redirect_url || (typeof window !== 'undefined' ? `${window.location.origin}/customer-portal/` : ''),
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
                portalFallback: true
            };
        }

        throw new Error(`Unable to initialize HitPay payment session: ${attempt.message || 'HitPay gateway is currently unreachable. Please verify your internet or try again.'}`);
    }
}

export { HitPayService };
