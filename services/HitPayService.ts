import { PaymentRequest, Settings } from '../types';

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
     * Returns whether this service instance has valid credentials configured.
     */
    isConfigured(): boolean {
        return this.apiKey.length > 0 && this.salt.length > 0;
    }

    /**
     * Creates a payment request to HitPay.
     * If credentials are configured, attempts a real API call.
     * Falls back to sandbox simulation if the call fails (CORS, invalid key, etc.)
     */
    async createPaymentRequest(data: PaymentRequest): Promise<{ url: string, id: string }> {
        console.log(`💳 HitPay [${this.isSandbox ? 'SANDBOX' : 'LIVE'}] — Initiating Payment Request...`, data);

        if (!this.isConfigured()) {
            console.warn('⚠️ HitPay credentials not configured. Using sandbox simulation.');
            return this.simulateSandboxResponse(data);
        }

        try {
            const response = await fetch(`${this.baseUrl}/payment-requests`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-BUSINESS-API-KEY': this.apiKey,
                },
                body: JSON.stringify({
                    amount: data.amount,
                    currency: data.currency,
                    reference_number: data.reference_number,
                    redirect_url: data.redirect_url,
                    webhook: data.webhook,
                    email: data.email,
                    name: data.name,
                    phone: data.phone,
                    purpose: data.purpose || 'RidersBud Payment',
                    ...(data.address && {
                        address: {
                            line1: data.address.line1,
                            line2: data.address.line2,
                            city: data.address.city,
                            state: data.address.state,
                            postal_code: data.address.postal_code,
                            country: data.address.country || 'PH'
                        }
                    })
                })
            });

            if (!response.ok) {
                const errBody = await response.text();
                console.warn(`⚠️ HitPay API returned ${response.status}:`, errBody);

                if (this.isSandbox) {
                    console.log('🔄 Falling back to sandbox simulation...');
                    return this.simulateSandboxResponse(data);
                }
                throw new Error(`Payment gateway error (${response.status}). Please try again.`);
            }

            const result = await response.json();
            console.log('✅ HitPay Payment Request Created:', result.id);

            return {
                url: result.url,
                id: result.id
            };

        } catch (error) {
            console.error('❌ HitPay API Error:', error);

            if (this.isSandbox) {
                console.log('🔄 Falling back to sandbox simulation...');
                return this.simulateSandboxResponse(data);
            }

            throw error;
        }
    }

    /**
     * Generates a HMAC-SHA256 signature for webhook verification.
     */
    generateSignature(payload: Record<string, string>): string {
        const sorted = Object.keys(payload).sort();
        const message = sorted.map(key => `${key}${payload[key]}`).join('');
        // Note: In a browser environment, SubtleCrypto would be used.
        // For server-side Node.js, use crypto.createHmac.
        console.log('🔐 Signature payload:', message, '| Salt:', this.salt);
        return message; // Placeholder — real HMAC done server-side
    }

    /**
     * Simulates a HitPay response for sandbox testing when API calls fail
     * (e.g., due to CORS or missing real API keys)
     */
    private simulateSandboxResponse(data: PaymentRequest): { url: string, id: string } {
        console.log('🔄 [SANDBOX SIMULATION] Generating Payment Link for:', data.amount, data.currency);

        const mockId = `req_${Math.random().toString(36).substr(2, 9)}`;

        const successUrl = new URL(data.redirect_url);
        successUrl.searchParams.append('status', 'completed');
        successUrl.searchParams.append('reference', data.reference_number);
        successUrl.searchParams.append('payment_request_id', mockId);

        return {
            url: successUrl.toString(),
            id: mockId
        };
    }
}

export { HitPayService };
