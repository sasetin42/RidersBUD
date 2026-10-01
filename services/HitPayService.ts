import { PaymentRequest, Settings } from '../types';

const SANDBOX_API_URL = 'https://api.sandbox.hit-pay.com/v1';
const PRODUCTION_API_URL = 'https://api.hit-pay.com/v1';

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

        // 7. Webhook: HitPay rejects 'localhost' and private IP webhooks with 422.
        // If localhost or missing, fallback to the official production webhook URL.
        let webhook = data.webhook;
        if (!webhook || webhook.includes('localhost') || webhook.includes('127.0.0.1')) {
            webhook = 'https://ridersbud-10806.web.app/payment/webhook';
        }

        const payload: Record<string, any> = {
            amount,
            currency,
            reference_number,
            redirect_url: data.redirect_url,
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
     */
    async createPaymentRequest(data: PaymentRequest): Promise<{ url: string, id: string }> {
        if (!data?.amount) {
            throw new Error("HitPay payment request requires an amount.");
        }

        const payload = this.sanitizePayload(data);
        let lastErrorMessage = '';

        try {
            const endpoint = getHitPayProxyEndpoint('/api/hitpay-proxy');
            const proxyResp = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    isSandbox: this.isSandbox,
                    apiKey: this.apiKey || undefined,
                    payload
                })
            });

            const contentType = proxyResp.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                const proxyResult = await proxyResp.json();
                if (proxyResp.ok && proxyResult && proxyResult.url) {
                    return { url: proxyResult.url, id: proxyResult.id };
                } else if (proxyResult && proxyResult.fallbackToPortal) {
                    // Gateway connection is blocked or unavailable; gracefully route to in-app portal
                    const params = new URLSearchParams({
                        amount: String(payload.amount),
                        currency: payload.currency || 'PHP',
                        reference: payload.reference_number,
                        redirect_url: payload.redirect_url || `${window.location.origin}/customer-portal/`,
                        email: payload.email || 'customer@ridersbud.com',
                        name: payload.name || 'Valued Customer',
                        purpose: payload.purpose || 'RidersBUD Payment',
                        sandbox: this.isSandbox ? 'true' : 'false'
                    });
                    if (payload.phone) params.set('phone', payload.phone);
                    if (payload.payment_methods?.[0]) params.set('method', payload.payment_methods[0]);
                    const portalUrl = `/hitpay-checkout?${params.toString()}`;
                    return { url: portalUrl, id: `hitpay_${Date.now()}` };
                } else if (proxyResult) {
                    const errorDetail = proxyResult.errors
                        ? Object.entries(proxyResult.errors).map(([k, v]) => `${k}: ${(v as any[]).join(', ')}`).join('; ')
                        : (proxyResult.message || proxyResult.error || 'Payment request validation error');
                    lastErrorMessage = typeof errorDetail === 'string' ? errorDetail : JSON.stringify(errorDetail);
                }
            } else {
                lastErrorMessage = `Backend HitPay proxy returned HTTP ${proxyResp.status}.`;
            }
        } catch (proxyErr: any) {
            lastErrorMessage = proxyErr?.message || 'Proxy network failure';
        }

        throw new Error(`Unable to initialize HitPay payment session: ${lastErrorMessage || 'HitPay gateway is currently unreachable. Please verify your internet or try again.'}`);
    }
}

export { HitPayService };
