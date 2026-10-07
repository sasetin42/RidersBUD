import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'node:module';
import { resolveServiceAmounts, computeAmountDue } from '../utils/paymentAmount';
import { PaymentController } from '../services/payment/PaymentController';

/**
 * CHECKOUT AMOUNT INTEGRITY + CREATE-FAILURE RESILIENCE.
 *
 * Part 1 pins the client's displayed amount (utils/paymentAmount.ts, consumed
 * by ServicePaymentScreen) against the REAL backend implementation of
 * calculateAuthoritativeAmount. Any divergence is a hard HTTP 400
 * PAYMENT_AMOUNT_MISMATCH on every tap — i.e. "online payment is not working".
 *
 * Part 2 exercises the PaymentController failure paths that used to brick the
 * checkout: stalled create requests holding the single-flight lock forever,
 * raw backend error codes shown to the customer, and the snake_case
 * `payment_methods` filter being silently dropped.
 */

// ---------------------------------------------------------------- part 1 ---
// Load the REAL server calculation from the Cloud Functions CommonJS module.
const requireCjs = createRequire(import.meta.url);
const { calculateAuthoritativeAmount } = requireCjs('../functions/lib/hitpay') as {
    calculateAuthoritativeAmount: (
        data: any,
        collection: string,
        kind: string,
        ref?: string
    ) => { amount: number; totalAmount: number; paidAmount: number; remainingBalance: number };
};

/** Exactly what ServicePaymentScreen derives before tapping Pay. */
const clientCheckout = (doc: any) => {
    const servicesSum = Array.isArray(doc.services)
        ? doc.services.reduce((s: number, x: any) => s + (Number(x && x.price) || 0), 0)
        : 0;
    const { total, downpaymentDue } = resolveServiceAmounts(doc, servicesSum);
    const paid = Number(doc.paidAmount || 0);
    // Screen's isDeposit memo (pages/ServicePaymentScreen.tsx)
    const isDeposit = doc.isRental
        ? (paid === 0 || doc.paymentStatus === 'deposit' || doc.paymentStatus === 'partial')
        : (doc.paymentStatus === 'deposit' || paid === 0);
    const kind = isDeposit ? 'downpayment' : 'balance';
    const ref = isDeposit ? 'BOK-x-DP' : 'BOK-x-BAL';
    return {
        amount: computeAmountDue({ isDeposit, paid, total, downpaymentDue }),
        kind,
        ref,
        total
    };
};

type DiffCase = { name: string; collection: string; doc: any };

const DIFF_CASES: DiffCase[] = [
    // bookings
    { name: 'A default 50% deposit', collection: 'bookings', doc: { totalAmount: 3500, services: [{ price: 3500 }], paidAmount: 0 } },
    { name: 'B explicit downpaymentAmount=1000', collection: 'bookings', doc: { totalAmount: 3500, downpaymentAmount: 1000, services: [{ price: 3500 }], paidAmount: 0 } },
    { name: 'C services sum differs from totalAmount', collection: 'bookings', doc: { totalAmount: 3500, services: [{ price: 3500 }, { price: 500 }], paidAmount: 0 } },
    { name: 'D deposit already paid half', collection: 'bookings', doc: { totalAmount: 3500, services: [{ price: 3500 }], paidAmount: 1750, paymentStatus: 'deposit' } },
    { name: 'E odd total=3501', collection: 'bookings', doc: { totalAmount: 3501, services: [{ price: 3501 }], paidAmount: 0 } },
    { name: 'F no totalAmount doc field', collection: 'bookings', doc: { services: [{ price: 3500 }], paidAmount: 0 } },
    { name: 'H partial paid=1000 (deposit)', collection: 'bookings', doc: { totalAmount: 3500, services: [{ price: 3500 }], paidAmount: 1000, paymentStatus: 'deposit' } },
    { name: 'partial paid=1000 (non-rental, balance)', collection: 'bookings', doc: { totalAmount: 3500, services: [{ price: 3500 }], paidAmount: 1000, paymentStatus: 'partial' } },
    { name: 'balance after full dp paid', collection: 'bookings', doc: { totalAmount: 3500, services: [{ price: 3500 }], paidAmount: 1750, paymentStatus: 'partial' } },
    // rentalBookings
    { name: 'R default 50% deposit', collection: 'rentalBookings', doc: { isRental: true, totalPrice: 20000, paidAmount: 0 } },
    { name: 'R explicit downpaymentAmount=8000', collection: 'rentalBookings', doc: { isRental: true, totalPrice: 20000, downpaymentAmount: 8000, paidAmount: 0 } },
    { name: 'R partial dp paid', collection: 'rentalBookings', doc: { isRental: true, totalPrice: 20000, downpaymentAmount: 8000, paidAmount: 8000, paymentStatus: 'partial' } },
    { name: 'R paid without status (balance)', collection: 'rentalBookings', doc: { isRental: true, totalPrice: 20000, paidAmount: 5000 } },
    // liaisonBookings
    { name: 'L fees.total only', collection: 'liaisonBookings', doc: { isLiaison: true, fees: { total: 1500 }, paidAmount: 0 } },
    { name: 'L server 1500 default', collection: 'liaisonBookings', doc: { isLiaison: true, paidAmount: 0 } },
    { name: 'L explicit downpaymentAmount=1200', collection: 'liaisonBookings', doc: { isLiaison: true, totalAmount: 3000, downpaymentAmount: 1200, paidAmount: 0 } },
    // serviceRequests
    { name: 'S details.totalAmount fallback', collection: 'serviceRequests', doc: { isServiceRequest: true, details: { totalAmount: 4000 }, paidAmount: 0 } },
    { name: 'S explicit downpaymentAmount=1500', collection: 'serviceRequests', doc: { isServiceRequest: true, totalAmount: 4000, downpaymentAmount: 1500, paidAmount: 0 } },
    { name: 'S deposit fully paid, balance due', collection: 'serviceRequests', doc: { isServiceRequest: true, totalAmount: 4000, paidAmount: 2000, paymentStatus: 'deposit' } },
    { name: 'S driver estimatedCost fallback', collection: 'serviceRequests', doc: { isDriver: true, estimatedCost: 5000, paidAmount: 0 } }
];

describe('client displayed amount === backend authoritative amount', () => {
    for (const c of DIFF_CASES) {
        it(`${c.name}`, () => {
            const client = clientCheckout(c.doc);
            const server = calculateAuthoritativeAmount(c.doc, c.collection, client.kind, client.ref);
            // The screen only ever offers a payment when something is due, and
            // in that case its hint must equal the backend's computation exactly.
            expect(client.amount).toBeGreaterThan(0);
            expect(client.amount).toBeCloseTo(server.amount, 2);
            expect(client.total).toBeCloseTo(server.totalAmount, 2);
        });
    }

    it('fully paid bookings show 0 due so the screen blocks the payment (never sends a stale hint)', () => {
        const client = clientCheckout({ totalAmount: 3500, services: [{ price: 3500 }], paidAmount: 3500, paymentStatus: 'paid' });
        expect(client.amount).toBe(0);
        // ServicePaymentScreen disables Pay and shows "already fully paid"
        expect(computeAmountDue({ isDeposit: false, paid: 3500, total: 3500, downpaymentDue: 1750 })).toBe(0);
    });

    it('ServicePaymentScreen derives its due amount from the shared server mirror', () => {
        const src = fs.readFileSync(path.resolve(__dirname, '../pages/ServicePaymentScreen.tsx'), 'utf-8');
        expect(src).toContain('resolveServiceAmounts');
        expect(src).toContain('computeAmountDue');
        // The old client-only formula that diverged from the backend
        expect(src).not.toContain('total / 2');
    });
});

// ---------------------------------------------------------------- part 2 ---

type FetchCall = { url: string; body: any };

let fetchCalls: FetchCall[] = [];
let nextBody: () => any;

const jsonResponse = (body: any, ok = true) => ({
    ok,
    status: ok ? 200 : 500,
    json: async () => body
});

/** Valid "open the checkout" backend response — no transactionId, so no Firestore timer. */
const checkoutOk = (ref: string) => ({
    success: true,
    paymentSessionId: `ses_${ref}`,
    referenceNumber: ref,
    amount: 1750,
    currency: 'PHP',
    checkoutMode: 'dropin',
    checkoutUrl: `https://sandbox.hit-pay.com/checkout/${ref}`,
    environment: 'sandbox'
});

const baseParams = (overrides: Record<string, any> = {}) => ({
    entityKind: 'booking' as const,
    entityId: 'bok-12345',
    kind: 'downpayment' as const,
    referenceNumber: 'BOK-12345-DP',
    expectedAmount: 1750,
    currency: 'PHP',
    returnRoute: '/customer-portal/service-payment',
    isSandbox: true,
    ...overrides
});

beforeEach(() => {
    fetchCalls = [];
    nextBody = () => checkoutOk('BOK-12345-DP');
    vi.stubGlobal('fetch', vi.fn(async (input: any, init?: any) => {
        let body: any = null;
        try { body = init?.body ? JSON.parse(init.body) : null; } catch { body = null; }
        fetchCalls.push({ url: String(input), body });
        const payload = nextBody();
        return jsonResponse(payload, payload?.ok !== false && !payload?.error);
    }));
    (PaymentController as any).activePromises?.clear?.();
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
});

describe('PAYMENT_AMOUNT_MISMATCH self-heal', () => {
    it('adopts the backend authoritative amount and retries exactly once', async () => {
        let calls = 0;
        nextBody = () => {
            calls++;
            if (calls === 1) {
                return {
                    error: 'PAYMENT_AMOUNT_MISMATCH',
                    code: 'AMOUNT_MISMATCH',
                    message: 'Amount mismatch: expected 2000 PHP, received 1750 PHP',
                    authoritativeAmount: 2000,
                    clientAmount: 1750,
                    currency: 'PHP'
                };
            }
            return checkoutOk('BOK-12345-DP');
        };

        const res = await PaymentController.pay(baseParams() as any);

        expect(res.success).toBe(true);
        expect(fetchCalls.length).toBe(2);
        expect(fetchCalls[0].body.expectedAmount).toBe(1750);
        expect(fetchCalls[1].body.expectedAmount).toBe(2000);
    });

    it('never loops: a persistent mismatch fails once with an actionable message', async () => {
        const mismatch = () => ({
            error: 'PAYMENT_AMOUNT_MISMATCH',
            authoritativeAmount: 2000,
            clientAmount: 1750,
            currency: 'PHP'
        });
        nextBody = mismatch;

        const res = await PaymentController.pay(baseParams() as any);

        expect(res.success).toBe(false);
        expect(res.state).toBe('FAILED');
        expect(fetchCalls.length).toBe(2); // initial + ONE retry, never more
        expect(res.errorMessage).toMatch(/2000\.00/);
        expect(res.errorMessage).not.toContain('PAYMENT_AMOUNT_MISMATCH');
    });
});

describe('create-failure messages are customer-actionable, not raw codes', () => {
    it('HITPAY_DISABLED maps to a readable message', async () => {
        nextBody = () => ({ error: 'HITPAY_DISABLED', message: 'Online payments are currently disabled in system settings.' });
        const res = await PaymentController.pay(baseParams() as any);
        expect(res.success).toBe(false);
        expect(res.errorMessage).toMatch(/disabled/i);
        expect(res.errorMessage).not.toContain('HITPAY_DISABLED');
    });

    it('INVALID_AUTH_TOKEN tells the customer to log in again', async () => {
        nextBody = () => ({ error: 'INVALID_AUTH_TOKEN', message: 'Invalid authentication token' });
        const res = await PaymentController.pay(baseParams() as any);
        expect(res.success).toBe(false);
        expect(res.errorMessage).toMatch(/log in again/i);
    });

    it('ENTITY_NOT_FOUND explains the booking is missing', async () => {
        nextBody = () => ({ error: 'ENTITY_NOT_FOUND', code: 'ENTITY_NOT_FOUND', message: 'The specified booking (bok-12345) does not exist.' });
        const res = await PaymentController.pay(baseParams() as any);
        expect(res.success).toBe(false);
        expect(res.errorMessage).toMatch(/could not find this booking/i);
    });
});

describe('payment_methods filter reaches the backend (snake_case wire format)', () => {
    it('sends payment_methods alongside the camelCase alias', async () => {
        await PaymentController.pay(baseParams({ paymentMethods: ['gcash'] }) as any);
        expect(fetchCalls[0].body.payment_methods).toEqual(['gcash']);
        expect(fetchCalls[0].body.paymentMethods).toEqual(['gcash']);
    });

    it('omits the filter entirely when no methods are requested', async () => {
        await PaymentController.pay(baseParams() as any);
        expect(fetchCalls[0].body.payment_methods).toBeUndefined();
    });
});

describe('stalled create request cannot brick the checkout', () => {
    it('times out at CREATE_TIMEOUT_MS, reports a friendly error, and releases the lock', async () => {
        vi.useFakeTimers();

        let releaseStarted!: () => void;
        const started = new Promise<void>((r) => { releaseStarted = r; });

        vi.stubGlobal('fetch', vi.fn((_input: any, init: any) => {
            releaseStarted();
            // Hangs until the AbortController fires.
            return new Promise((_resolve, reject) => {
                init?.signal?.addEventListener('abort', () => {
                    const err = new Error('The user aborted a request.');
                    err.name = 'AbortError';
                    reject(err);
                });
            });
        }));

        const pending = PaymentController.pay(baseParams() as any);
        await started; // timer is armed before fetch is invoked
        await vi.advanceTimersByTimeAsync(46_000);
        const res = await pending;

        expect(res.success).toBe(false);
        expect(res.state).toBe('FAILED');
        expect(res.errorMessage).toMatch(/timed out/i);

        // The single-flight lock was released — the next payment goes through.
        expect(PaymentController.isPaymentInProgress()).toBe(false);
        vi.useRealTimers();
        vi.stubGlobal('fetch', vi.fn(async (input: any, init?: any) => {
            let body: any = null;
            try { body = init?.body ? JSON.parse(init.body) : null; } catch { body = null; }
            fetchCalls.push({ url: String(input), body });
            return jsonResponse(checkoutOk('BOK-12345-DP'));
        }));
        const retry = await PaymentController.pay(baseParams() as any);
        expect(retry.success).toBe(true);
    });
});
