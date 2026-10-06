import { describe, it, expect } from 'vitest';
import {
    categorizeTransaction,
    countByCategory,
    sumAttentionAmount,
    explainVerificationSignal,
    formatRelativeTime,
    toMillis,
    STUCK_THRESHOLD_MS
} from '../utils/paymentMonitor';

const NOW = 1_700_000_000_000;

const tx = (overrides: Record<string, any> = {}) => ({
    id: 'tx_test_1',
    status: 'CHECKOUT_OPEN',
    amount: 1500,
    createdAt: NOW - 5 * 60_000,
    updatedAt: NOW - 5 * 60_000,
    ...overrides
});

describe('categorizeTransaction — attention buckets', () => {
    it('flags PENDING_REVIEW as mismatch regardless of other signals', () => {
        expect(categorizeTransaction(tx({ status: 'PENDING_REVIEW' }), NOW)).toBe('mismatch');
    });

    it('flags verificationStatus mismatches as mismatch even while non-terminal', () => {
        expect(categorizeTransaction(tx({ verificationStatus: 'AMOUNT_MISMATCH' }), NOW)).toBe('mismatch');
        expect(categorizeTransaction(tx({ verificationStatus: 'CURRENCY_MISMATCH' }), NOW)).toBe('mismatch');
        expect(categorizeTransaction(tx({ verificationStatus: 'REFERENCE_MISMATCH' }), NOW)).toBe('mismatch');
    });

    it('flags lastVerificationStatus GATEWAY_UNAVAILABLE as retrying', () => {
        expect(categorizeTransaction(tx({ lastVerificationStatus: 'GATEWAY_UNAVAILABLE' }), NOW)).toBe('retrying');
    });

    it('flags lastVerificationStatus GATEWAY_PENDING as retrying', () => {
        expect(categorizeTransaction(tx({ lastVerificationStatus: 'GATEWAY_PENDING' }), NOW)).toBe('retrying');
    });

    it('flags a failed gateway attempt as retrying even when the transaction is old (priority over stuck)', () => {
        const old = tx({ lastVerificationStatus: 'GATEWAY_UNAVAILABLE', updatedAt: NOW - 60 * 60_000 });
        expect(categorizeTransaction(old, NOW)).toBe('retrying');
    });

    it('flags a non-terminal transaction untouched beyond the threshold as stuck', () => {
        const old = tx({ updatedAt: NOW - STUCK_THRESHOLD_MS - 60_000 });
        expect(categorizeTransaction(old, NOW)).toBe('stuck');
    });

    it('treats missing timestamps as stuck so they always surface', () => {
        expect(categorizeTransaction(tx({ createdAt: undefined, updatedAt: undefined }), NOW)).toBe('stuck');
    });

    it('keeps fresh non-terminal payments in verifying', () => {
        expect(categorizeTransaction(tx({ status: 'WAITING_FOR_PAYMENT' }), NOW)).toBe('verifying');
        expect(categorizeTransaction(tx({ status: 'VERIFYING' }), NOW)).toBe('verifying');
    });
});

describe('categorizeTransaction — terminal buckets', () => {
    it('maps terminal statuses to their own categories', () => {
        expect(categorizeTransaction(tx({ status: 'PAID' }), NOW)).toBe('paid');
        expect(categorizeTransaction(tx({ status: 'FAILED' }), NOW)).toBe('failed');
        expect(categorizeTransaction(tx({ status: 'CANCELLED' }), NOW)).toBe('cancelled');
        expect(categorizeTransaction(tx({ status: 'EXPIRED' }), NOW)).toBe('expired');
    });

    it('PAID wins over terminal noise; status is case-insensitive', () => {
        expect(categorizeTransaction(tx({ status: 'paid' }), NOW)).toBe('paid');
    });
});

describe('countByCategory + sumAttentionAmount', () => {
    it('counts categories and derives the attention total', () => {
        const counts = countByCategory([
            tx({ id: 'a', status: 'PENDING_REVIEW' }),
            tx({ id: 'b', lastVerificationStatus: 'GATEWAY_UNAVAILABLE' }),
            tx({ id: 'c', updatedAt: NOW - 30 * 60_000 }),
            tx({ id: 'd', status: 'PAID' }),
            tx({ id: 'e', status: 'FAILED' })
        ], NOW);

        expect(counts.mismatch).toBe(1);
        expect(counts.retrying).toBe(1);
        expect(counts.stuck).toBe(1);
        expect(counts.paid).toBe(1);
        expect(counts.failed).toBe(1);
        expect(counts.attention).toBe(3);
    });

    it('sums amounts only for attention transactions', () => {
        const total = sumAttentionAmount([
            tx({ id: 'a', status: 'PENDING_REVIEW', amount: 100 }),
            tx({ id: 'b', lastVerificationStatus: 'GATEWAY_UNAVAILABLE', amount: 250.5 }),
            tx({ id: 'c', updatedAt: NOW - 30 * 60_000, amount: 75 }),
            tx({ id: 'd', status: 'PAID', amount: 9999 })
        ], NOW);
        expect(total).toBeCloseTo(425.5, 2);
    });
});

describe('explainVerificationSignal', () => {
    it('explains an unpaid gateway request', () => {
        const msg = explainVerificationSignal(tx({ lastVerificationReason: 'gateway_status_pending' }));
        expect(msg).toContain('UNPAID');
    });

    it('explains gateway unreachability as retrying', () => {
        const msg = explainVerificationSignal(tx({ lastVerificationStatus: 'GATEWAY_UNAVAILABLE', lastVerificationReason: 'upstream_unreachable' }));
        expect(msg.toLowerCase()).toContain('retrying');
    });

    it('explains environment mismatch on 404', () => {
        const msg = explainVerificationSignal(tx({ lastVerificationStatus: 'GATEWAY_UNAVAILABLE', lastVerificationReason: 'http_404' }));
        expect(msg).toContain('environment');
    });

    it('falls back to stateHistory hints for CHECKOUT_OPEN', () => {
        const msg = explainVerificationSignal(tx({ stateHistory: [{ status: 'CHECKOUT_OPEN', timestamp: new Date(NOW).toISOString() }] }));
        expect(msg).toContain('Checkout opened');
    });
});

describe('time helpers', () => {
    it('toMillis handles Firestore timestamps, epochs and ISO strings', () => {
        expect(toMillis({ seconds: NOW / 1000 })).toBe(NOW);
        expect(toMillis(new Date(NOW).toISOString())).toBe(NOW);
        expect(toMillis(undefined)).toBe(0);
        expect(toMillis('not-a-date')).toBe(0);
    });

    it('formatRelativeTime renders compact relative labels', () => {
        expect(formatRelativeTime(NOW - 30_000, NOW)).toBe('30s ago');
        expect(formatRelativeTime(NOW - 5 * 60_000, NOW)).toBe('5m ago');
        expect(formatRelativeTime(NOW + 2 * 3_600_000, NOW)).toBe('2h from now');
        expect(formatRelativeTime(0, NOW)).toBe('—');
    });
});
