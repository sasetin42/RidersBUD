import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PaymentController } from '../services/payment/PaymentController';

/**
 * Spec §18 / §42 TEST G / §43 — DUPLICATE PAYMENT PREVENTION.
 *
 * These exercise the REAL PaymentController against a stubbed transport (no
 * Firestore listener is started, because responses carry no transactionId), so
 * they assert the actual single-flight lock rather than a re-implementation.
 *
 *   TEST G: double-tapping "PROCEED TO PAY ₱1,750" must issue ONE payment request.
 */

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
    returnRoute: '/customer-portal/service-payment', // explicit: avoids window default
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
        // Faithful Response shape: caller inspects .ok then awaits .json()
        const payload = nextBody();
        return jsonResponse(payload, payload?.ok !== false && !payload?.error);
    }));
    // Fresh controller state between tests (static maps persist otherwise).
    (PaymentController as any).activePromises?.clear?.();
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('§42 TEST G — double tap creates ONE payment request', () => {
    it('two concurrent pay() calls for the same entity hit the proxy exactly once', async () => {
        nextBody = () => checkoutOk('BOK-12345-DP');

        const p1 = PaymentController.pay(baseParams() as any);
        const p2 = PaymentController.pay(baseParams() as any);

        const [r1, r2] = await Promise.all([p1, p2]);

        expect(fetchCalls.length).toBe(1);
        expect(fetchCalls[0].body?.action).toBe('create');
        expect(fetchCalls[0].body?.referenceNumber).toBe('BOK-12345-DP');
        // Both taps resolve to the SAME result object — one session, not two.
        expect(r1).toBe(r2);
        expect(r1.success).toBe(true);
        expect(r1.state).toBe('CHECKOUT_OPEN');
    });

    it('rapid sequential taps each start their own request only after the lock releases', async () => {
        nextBody = () => checkoutOk('BOK-12345-DP');

        const first = await PaymentController.pay(baseParams() as any);
        expect(first.success).toBe(true);
        expect(fetchCalls.length).toBe(1);

        // Deliberate re-attempt AFTER completion (spec §25 "Try Again") must work —
        // the lock must not deadlock the customer out of paying.
        const second = await PaymentController.pay(baseParams() as any);
        expect(second.success).toBe(true);
        expect(fetchCalls.length).toBe(2);
    });
});

describe('§18 — one active session blocks a different payment', () => {
    it('a second payment for ANOTHER entity is refused while one is in flight', async () => {
        nextBody = () => checkoutOk('BOK-12345-DP');

        const inFlight = PaymentController.pay(baseParams() as any);

        // Different lockKey (different entity) while A is still active.
        const refused = await PaymentController.pay(
            baseParams({ entityId: 'bok-99999', referenceNumber: 'BOK-99999-DP' }) as any
        );

        expect(refused.success).toBe(false);
        expect(refused.state).toBe('FAILED');
        expect(refused.errorMessage).toMatch(/already active/i);

        const settled = await inFlight;
        expect(settled.success).toBe(true);
        // The refused call must NOT have created a second HitPay request.
        expect(fetchCalls.length).toBe(1);
        expect(fetchCalls[0].body?.entityId).toBe('bok-12345');
    });

    it('userConfirmedRetry allows the explicit retry path', async () => {
        nextBody = () => checkoutOk('BOK-12345-DP');

        const inFlight = PaymentController.pay(baseParams() as any);
        const retry = await PaymentController.pay(
            baseParams({ entityId: 'bok-99999', referenceNumber: 'BOK-99999-DP', userConfirmedRetry: true }) as any
        );

        expect(retry.success).toBe(true);
        await inFlight;
        expect(fetchCalls.length).toBe(2);
    });
});

describe('§18 — already PAID short-circuits without a new checkout', () => {
    it('returns PAID and issues no second payment when the server says alreadyPaid', async () => {
        nextBody = () => ({
            alreadyPaid: true,
            status: 'PAID',
            transactionId: 'tx_paid_1',
            paymentSessionId: 'ses_paid',
            referenceNumber: 'BOK-12345-DP',
            amount: 1750,
            currency: 'PHP'
        });

        const res = await PaymentController.pay(baseParams() as any);

        expect(res.success).toBe(true);
        expect(res.state).toBe('PAID');
        // No checkoutUrl was ever opened — "Payment Already Completed", not a new session.
        expect(res.checkoutUrl).toBeUndefined();
        expect(fetchCalls.length).toBe(1);
    });
});

describe('D1 regression — backend fallbackToPortal must not hang the UI', () => {
    it('surfaces FAILED with a message instead of success:true and no checkout', async () => {
        nextBody = () => ({
            fallbackToPortal: true,
            reason: 'upstream_unreachable',
            message: 'The HitPay gateway is currently unreachable.'
        });

        const res = await PaymentController.pay(baseParams() as any);

        // Before the fix this returned success:true + WAITING_FOR_PAYMENT with no
        // checkoutUrl, pinning every payment screen on an infinite spinner.
        expect(res.success).toBe(false);
        expect(res.state).toBe('FAILED');
        expect(res.errorMessage).toBeTruthy();
        expect(res.checkoutUrl).toBeUndefined();
        expect(res.transactionId).toBeUndefined();
    });

    it('distinguishes unprovisioned credentials from a transient outage', async () => {
        nextBody = () => ({ fallbackToPortal: true, reason: 'credentials_not_configured' });
        const res = await PaymentController.pay(baseParams() as any);
        expect(res.success).toBe(false);
        expect(res.state).toBe('FAILED');
        expect(res.errorMessage).toMatch(/not enabled yet/i);
    });
});

describe('§43 — session creation payload is backend-authoritative', () => {
    it('sends entity + kind + reference so the server recomputes the amount', async () => {
        nextBody = () => checkoutOk('BOK-12345-DP');
        await PaymentController.pay(baseParams() as any);

        const body = fetchCalls[0].body;
        expect(body.action).toBe('create');
        expect(body.entityKind).toBe('booking');
        expect(body.entityId).toBe('bok-12345');
        expect(body.kind).toBe('downpayment');
        expect(body.referenceNumber).toBe('BOK-12345-DP');
        // The client only HINTS at the amount; the backend recomputes authoritatively.
        expect(body.expectedAmount).toBe(1750);
        expect(body).toHaveProperty('checkoutMode');
    });

    it('never sends HitPay credentials to the proxy', async () => {
        nextBody = () => checkoutOk('BOK-12345-DP');
        await PaymentController.pay(baseParams() as any);

        const serialised = JSON.stringify(fetchCalls[0].body);
        expect(serialised).not.toMatch(/HITPAY_(API_KEY|SALT|SECRET)/i);
        expect(serialised).not.toMatch(/api[_-]?key/i);
        expect(serialised).not.toMatch(/salt/i);
    });

    it('rejects payment initiation without an entity', async () => {
        await expect(
            PaymentController.pay({ entityKind: '', entityId: '' } as any)
        ).rejects.toThrow(/entityKind and entityId/i);
        expect(fetchCalls.length).toBe(0);
    });
});
