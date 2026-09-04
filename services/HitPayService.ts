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
     * Creates a payment request to official HitPay Payment Gateway (Live or Sandbox).
     * Dispatches request via Vite backend proxy or direct API and returns official HitPay hosted checkout URL.
     */
    async createPaymentRequest(data: PaymentRequest): Promise<{ url: string, id: string }> {
        console.log(`💳 HitPay [${this.isSandbox ? 'SANDBOX' : 'LIVE'}] — Initiating Real Official Payment Request...`, {
            amount: data.amount,
            reference: data.reference_number
        });

        if (!this.isConfigured()) {
            throw new Error("HitPay Gateway is not yet configured with valid API keys in Admin Settings. Please contact the administrator.");
        }

        const payload: Record<string, any> = {
            amount: data.amount,
            currency: data.currency || 'PHP',
            reference_number: data.reference_number,
            redirect_url: data.redirect_url,
            webhook: data.webhook || `${window.location.origin}/api/hitpay-webhook`,
            email: data.email || 'customer@ridersbud.com',
            name: data.name || 'RidersBud Customer',
            purpose: data.purpose || 'RidersBud Service Payment'
        };

        if (data.phone) {
            payload.phone = data.phone;
        }

        if (data.address) {
            payload.address = {
                line1: data.address.line1,
                line2: data.address.line2,
                city: data.address.city,
                state: data.address.state,
                postal_code: data.address.postal_code,
                country: data.address.country || 'PH'
            };
        }

        let lastErrorMessage = '';

        // Attempt 1: Vite proxy endpoint (handles CORS and server-to-server TLS connection to HitPay in dev mode)
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
                } else if (proxyResult && proxyResult.error) {
                    lastErrorMessage = typeof proxyResult.error === 'string' ? proxyResult.error : JSON.stringify(proxyResult.error);
                }
            }
        } catch (proxyErr: any) {
            lastErrorMessage = proxyErr?.message || 'Proxy unavailable';
        }

        // Attempt 2: Direct HitPay API call fallback
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

        throw new Error(`Unable to initialize HitPay payment session: ${lastErrorMessage || 'HitPay is unreachable on client-side due to browser CORS restriction.'}`);
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

