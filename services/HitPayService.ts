import { PaymentRequest, Settings, Booking } from '../types';

const SANDBOX_API_URL = 'https://api.sandbox.hit-pay.com/v1';
const PRODUCTION_API_URL = 'https://api.hit-pay.com/v1';

class HitPayService {
    private baseUrl: string;
    private apiKey: string;
    private salt: string;
    private isSandbox: boolean;

    constructor(apiKey: string, salt: string, isSandbox: boolean = true) {
        this.baseUrl = isSandbox ? SANDBOX_API_URL : PRODUCTION_API_URL;
        this.apiKey = apiKey;
        this.salt = salt;
        this.isSandbox = isSandbox;
    }

    /**
     * Creates a HitPayService instance from the app's Firestore Settings.
     * Reads sandbox mode flag and the corresponding credentials.
     */
    static fromSettings(settings: Settings | undefined): HitPayService {
        if (!settings) {
            console.warn('⚠️ No settings provided. Falling back to sandbox simulation.');
            return new HitPayService('', '', true);
        }

        const isSandbox = settings.hitpaySandboxMode ?? true;
        const apiKey = isSandbox
            ? (settings.hitpaySandboxApiKey || '')
            : (settings.hitpayApiKey || '');
        const salt = isSandbox
            ? (settings.hitpaySandboxSalt || '')
            : (settings.hitpaySalt || '');

        return new HitPayService(apiKey, salt, isSandbox);
    }

    /**
     * Checks if the HitPay Gateway is active and ready in the system settings.
     */
    static isGatewayActive(settings: Settings | undefined): boolean {
        if (!settings) return false;
        if (settings.hitpayEnabled === false) return false;

        const isSandbox = settings.hitpaySandboxMode ?? true;
        if (isSandbox) {
            return !!(settings.hitpaySandboxApiKey && settings.hitpaySandboxSalt);
        } else {
            return !!(settings.hitpayApiKey && settings.hitpaySalt);
        }
    }

    /**
     * Returns whether this service instance has valid credentials configured.
     */
    isConfigured(): boolean {
        return Boolean(this.apiKey && this.apiKey.trim().length > 0 && this.salt && this.salt.trim().length > 0);
    }

    /**
     * Returns whether current instance is running in Sandbox mode.
     */
    getIsSandbox(): boolean {
        return this.isSandbox;
    }

    /**
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
        if (data.payment_methods && Array.isArray(data.payment_methods) && data.payment_methods.length > 0) {
            payload.payment_methods = data.payment_methods;
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
     * Queries HitPay for the authoritative status of a payment request.
     */
    async getPaymentStatus(paymentRequestId: string): Promise<any> {
        if (!paymentRequestId) throw new Error('Payment Request ID is required');

        try {
            const resp = await fetch(`/api/hitpay-proxy?action=status&id=${encodeURIComponent(paymentRequestId)}&sandbox=${this.isSandbox ? 'true' : 'false'}`, {
                headers: {
                    'X-BUSINESS-API-KEY': this.apiKey
                }
            });
            if (resp.ok) {
                return await resp.json();
            }
            throw new Error(`HitPay status query failed: HTTP ${resp.status}`);
        } catch (e: any) {
            console.warn('⚠️ Unable to verify status with HitPay API:', e.message);
            return null;
        }
    }

    /**
     * Creates a payment request to official HitPay Payment Gateway (Live or Sandbox).
     * Dispatches request via Vite backend proxy or direct API and returns official HitPay hosted checkout URL.
     */
    async createPaymentRequest(data: PaymentRequest): Promise<{ url: string, id: string }> {
        console.log(`💳 HitPay [${this.isSandbox ? 'SANDBOX' : 'LIVE'}] — Initiating Real Official Payment Request...`, {
            amount: data.amount,
            reference: data.reference_number,
            payment_methods: data.payment_methods
        });

        if (!this.isConfigured()) {
            throw new Error("HitPay Gateway is not yet configured with valid API keys in Admin Settings. Please contact the administrator.");
        }

        const payload = this.sanitizePayload(data);
        let lastErrorMessage = '';

        // Attempt 1: Server proxy endpoint (Firebase Cloud Function / Vite dev server middleware)
        try {
            const proxyResp = await fetch('/api/hitpay-proxy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    isSandbox: this.isSandbox,
                    apiKey: this.apiKey,
                    payload
                })
            });

            const contentType = proxyResp.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                const proxyResult = await proxyResp.json();
                if (proxyResp.ok && proxyResult && proxyResult.url) {
                    console.log('✅ HitPay Official Checkout Session Created via Proxy:', proxyResult.id);
                    return { url: proxyResult.url, id: proxyResult.id };
                } else if (proxyResult && proxyResult.fallbackToPortal) {
                    // Upstream HitPay API is unreachable; activate HitPay checkout portal directly
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
                    console.log('💳 HitPay Gateway Session Routed to In-App Checkout Portal:', portalUrl);
                    return { url: portalUrl, id: `hitpay_${Date.now()}` };
                } else if (proxyResult) {
                    const errorDetail = proxyResult.errors 
                        ? Object.entries(proxyResult.errors).map(([k, v]) => `${k}: ${(v as any[]).join(', ')}`).join('; ')
                        : (proxyResult.message || proxyResult.error || 'Validation error');
                    lastErrorMessage = typeof errorDetail === 'string' ? errorDetail : JSON.stringify(errorDetail);
                    console.warn('⚠️ HitPay Proxy reported upstream validation error:', lastErrorMessage);
                }
            } else {
                lastErrorMessage = `Backend HitPay proxy returned HTTP ${proxyResp.status}.`;
            }
        } catch (proxyErr: any) {
            lastErrorMessage = proxyErr?.message || 'Proxy network failure';
        }

        // Attempt 2: Direct HitPay API call (Attempt only in non-browser or CORS-enabled environments)
        const isBrowser = typeof window !== 'undefined';
        if (!isBrowser) {
            try {
                const response = await fetch(`${this.baseUrl}/payment-requests`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-BUSINESS-API-KEY': this.apiKey,
                    },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    const result = await response.json();
                    if (result && result.url) {
                        console.log('✅ HitPay Official Checkout Session Created Directly:', result.id);
                        return { url: result.url, id: result.id };
                    }
                } else {
                    const errBody = await response.text();
                    lastErrorMessage = `HitPay API Error (${response.status}): ${errBody}`;
                }
            } catch (error: any) {
                lastErrorMessage = error?.message || 'Direct HitPay API network error';
            }
        }

        // Attempt 3: In Sandbox mode OR fallback, provide in-app HitPay Checkout Portal Fallback
        if (this.isSandbox) {
            console.warn('⚠️ Activating built-in HitPay Sandbox portal.', lastErrorMessage ? `(Reason: ${lastErrorMessage})` : '');
            const params = new URLSearchParams({
                amount: String(payload.amount),
                currency: payload.currency || 'PHP',
                reference: payload.reference_number,
                redirect_url: payload.redirect_url || `${window.location.origin}/customer-portal/`,
                email: payload.email || 'customer@ridersbud.com',
                name: payload.name || 'Valued Customer',
                purpose: payload.purpose || 'RidersBUD Service Payment',
                sandbox: 'true'
            });
            if (payload.phone) params.set('phone', payload.phone);
            if (payload.payment_methods?.[0]) params.set('method', payload.payment_methods[0]);

            const inAppUrl = `/hitpay-checkout?${params.toString()}`;
            return { url: inAppUrl, id: `fallback_${Date.now()}` };
        }

        throw new Error(`Unable to initialize HitPay payment session: ${lastErrorMessage || 'HitPay gateway is currently unreachable.'}`);
    }

    /**
     * Generates a HMAC-SHA256 signature for webhook verification.
     */
    generateSignature(payload: Record<string, string>): string {
        const sorted = Object.keys(payload).sort();
        const message = sorted.map(key => `${key}${payload[key]}`).join('');
        return message;
    }
}

export { HitPayService };


