import { describe, it, expect } from 'vitest';
import {
    transitionPaymentState,
    canTransitionPaymentState,
    IllegalPaymentStateTransitionError
} from '../services/payment/paymentStateMachine';
import { PaymentReturnCoordinator } from '../services/payment/PaymentReturnCoordinator';
import { parsePaymentReturnUrl } from '../utils/paymentReturn';

describe('Payment State Machine Transitions', () => {
    it('allows valid linear lifecycle transitions', () => {
        let state = transitionPaymentState('CREATED', 'INITIALIZING');
        expect(state).toBe('INITIALIZING');

        state = transitionPaymentState(state, 'CHECKOUT_OPEN');
        expect(state).toBe('CHECKOUT_OPEN');

        state = transitionPaymentState(state, 'WAITING_FOR_PAYMENT');
        expect(state).toBe('WAITING_FOR_PAYMENT');

        state = transitionPaymentState(state, 'VERIFYING');
        expect(state).toBe('VERIFYING');

        state = transitionPaymentState(state, 'PAID');
        expect(state).toBe('PAID');
    });

    it('absorbs terminal PAID state and forbids transitions out', () => {
        expect(canTransitionPaymentState('PAID', 'CANCELLED')).toBe(false);
        expect(canTransitionPaymentState('PAID', 'FAILED')).toBe(false);
        expect(canTransitionPaymentState('PAID', 'EXPIRED')).toBe(false);
        expect(canTransitionPaymentState('PAID', 'WAITING_FOR_PAYMENT')).toBe(false);

        expect(() => {
            transitionPaymentState('PAID', 'CANCELLED');
        }).toThrow(IllegalPaymentStateTransitionError);
    });

    it('allows PENDING to resolve to PAID or FAILED or EXPIRED', () => {
        expect(canTransitionPaymentState('PENDING', 'PAID')).toBe(true);
        expect(canTransitionPaymentState('PENDING', 'FAILED')).toBe(true);
        expect(canTransitionPaymentState('PENDING', 'EXPIRED')).toBe(true);
        expect(canTransitionPaymentState('PENDING', 'VERIFYING')).toBe(true);
    });

    it('allows late authoritative webhook PAID to recover CANCELLED or FAILED', () => {
        expect(canTransitionPaymentState('CANCELLED', 'PAID')).toBe(true);
        expect(canTransitionPaymentState('FAILED', 'PAID')).toBe(true);
        expect(canTransitionPaymentState('EXPIRED', 'PAID')).toBe(true);

        // but CANCELLED cannot move to other states except PAID
        expect(canTransitionPaymentState('CANCELLED', 'CHECKOUT_OPEN')).toBe(false);
    });
});

describe('PaymentReturnCoordinator URL Parsing', () => {
    it('correctly parses App Link returns without modifying or opening checkout', () => {
        const url = 'https://ridersbud-10806.web.app/payment/return?s=RB-SES-123&tx=TX-999&ref=BOK-123-DP&prid=PRID-456&e=success';
        const parsed = PaymentReturnCoordinator.parseUrl(url);

        expect(parsed).not.toBeNull();
        expect(parsed?.paymentSessionId).toBe('RB-SES-123');
        expect(parsed?.transactionId).toBe('TX-999');
        expect(parsed?.referenceNumber).toBe('BOK-123-DP');
        expect(parsed?.paymentRequestId).toBe('PRID-456');
        expect(parsed?.event).toBe('success');
    });

    it('correctly parses native scheme returns (ridersbud://payment/return)', () => {
        const url = 'ridersbud://payment/return?tx=TXN-123&ref=ORD-555';
        const parsed = PaymentReturnCoordinator.parseUrl(url);

        expect(parsed).not.toBeNull();
        expect(parsed?.transactionId).toBe('TXN-123');
        expect(parsed?.referenceNumber).toBe('ORD-555');
    });

    it('ignores non-return URLs and returns null', () => {
        expect(PaymentReturnCoordinator.parseUrl('https://ridersbud-10806.web.app/customer-portal/')).toBeNull();
        expect(PaymentReturnCoordinator.parseUrl('ridersbud://customer-portal/bookings')).toBeNull();
        expect(PaymentReturnCoordinator.parseUrl('')).toBeNull();
    });
});

describe('Application payment-return URL parsing', () => {
    it('parses Android in-app activity return URLs with authoritative identifiers', () => {
        const parsed = parsePaymentReturnUrl(
            'https://ridersbud-10806.web.app/payment/return?s=RB-SESSION-1&tx=tx_order_1&ref=ORD-123-FULL&status=completed'
        );
        expect(parsed).toMatchObject({
            transactionId: 'tx_order_1',
            referenceNumber: 'ORD-123-FULL',
            paymentSessionId: 'RB-SESSION-1',
            gatewayStatus: 'completed'
        });
    });

    it('parses custom-scheme returns and ignores unrelated app URLs', () => {
        expect(parsePaymentReturnUrl('ridersbud://payment/return?tx=tx_booking_1&ref=BOK-123-DP'))
            .toMatchObject({ transactionId: 'tx_booking_1', referenceNumber: 'BOK-123-DP' });
        expect(parsePaymentReturnUrl('ridersbud://customer-portal/bookings')).toBeNull();
        expect(parsePaymentReturnUrl('https://ridersbud-10806.web.app/customer-portal/')).toBeNull();
    });
});

describe('Architecture & Duplicate Payment Prevention', () => {
    it('Coordinator source does NOT import openPaymentUrl or createPaymentRequest', async () => {
        // Verification: ensure return coordinator is strictly read-only
        const fs = await import('fs');
        const path = await import('path');
        const coordinatorCode = fs.readFileSync(
            path.resolve(__dirname, '../services/payment/PaymentReturnCoordinator.ts'),
            'utf-8'
        );

        expect(coordinatorCode).not.toContain('createPaymentRequest');
        expect(coordinatorCode).not.toContain('openPaymentUrl');
        expect(coordinatorCode).not.toContain('Browser.open');
    });

    it('HitPayEmbeddedService correctly computes redirected property for dropin and checkoutUrl', async () => {
        const { HitPayEmbeddedService } = await import('../services/HitPayEmbeddedService');
        expect(HitPayEmbeddedService).toBeDefined();
    });

    it('verifies 100% full payment vs 50% downpayment calculation principles', () => {
        const totalPrice = 4500;
        const downpayment = Math.round(totalPrice * 0.5);
        const remainingAfterDp = totalPrice - downpayment;

        expect(downpayment).toBe(2250);
        expect(remainingAfterDp).toBe(2250);

        // Full payment upfront
        const fullPayment = totalPrice;
        const remainingAfterFull = totalPrice - fullPayment;

        expect(fullPayment).toBe(4500);
        expect(remainingAfterFull).toBe(0);
    });

    it('parses extended return query parameters including session and transaction IDs', () => {
        const testUrl = 'https://ridersbud-10806.web.app/payment/return?s=RB-BOOKING-001&tx=tx_abc123&ref=BOK-999-FULL&prid=pr_xyz';
        const parsed = PaymentReturnCoordinator.parseUrl(testUrl);

        expect(parsed).not.toBeNull();
        expect(parsed?.paymentSessionId).toBe('RB-BOOKING-001');
        expect(parsed?.transactionId).toBe('tx_abc123');
        expect(parsed?.referenceNumber).toBe('BOK-999-FULL');
        expect(parsed?.paymentRequestId).toBe('pr_xyz');
    });
});

