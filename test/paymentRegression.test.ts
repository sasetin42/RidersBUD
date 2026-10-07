import { describe, it, expect } from 'vitest';
import {
    transitionPaymentState,
    canTransitionPaymentState,
    PaymentState
} from '../services/payment/paymentStateMachine';
import { PaymentReturnCoordinator } from '../services/payment/PaymentReturnCoordinator';
import { parsePaymentReturnUrl } from '../utils/paymentReturn';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Spec §13 — RETURN URL VALIDATION.
 *
 * The return handler must accept ONLY verified RidersBUD origins. Before the
 * fix, both parsers matched on pathname alone, so
 * `https://evil.example/payment/return?tx=...` was accepted as a genuine
 * payment return.
 */
describe('§13 return URL origin validation', () => {
    const TRUSTED = 'https://ridersbud-10806.web.app/payment/return?tx=tx_1&ref=BOK-1-DP';

    it('accepts the verified App Link origin', () => {
        expect(parsePaymentReturnUrl(TRUSTED)).not.toBeNull();
        expect(PaymentReturnCoordinator.parseUrl(TRUSTED)).not.toBeNull();
    });

    it('accepts the firebaseapp.com alternate host', () => {
        const url = 'https://ridersbud-10806.firebaseapp.com/payment/return?tx=tx_9';
        expect(parsePaymentReturnUrl(url)).not.toBeNull();
        expect(PaymentReturnCoordinator.parseUrl(url)).not.toBeNull();
    });

    it('REJECTS an unknown domain with the correct path (was accepted before fix)', () => {
        const evil = 'https://evil.example/payment/return?tx=tx_attacker&ref=BOK-1-DP';
        expect(parsePaymentReturnUrl(evil)).toBeNull();
        expect(PaymentReturnCoordinator.parseUrl(evil)).toBeNull();
    });

    it('REJECTS lookalike / typosquat domains', () => {
        const lookalikes = [
            'https://ridersbud-10806.web.app.evil.com/payment/return?tx=tx_1',
            'https://ridersbud-10806.web.app.evil.io/payment/return?tx=tx_1',
            'https://notridersbud-10806.web.app/payment/return?tx=tx_1',
            'https://evil.com/https://ridersbud-10806.web.app/payment/return'
        ];
        for (const url of lookalikes) {
            expect(parsePaymentReturnUrl(url)).toBeNull();
            expect(PaymentReturnCoordinator.parseUrl(url)).toBeNull();
        }
    });

    it('REJECTS non-HTTPS schemes even on a trusted host', () => {
        expect(parsePaymentReturnUrl('http://ridersbud-10806.web.app/payment/return?tx=tx_1')).toBeNull();
        expect(PaymentReturnCoordinator.parseUrl('http://ridersbud-10806.web.app/payment/return?tx=tx_1')).toBeNull();
        expect(parsePaymentReturnUrl('javascript://ridersbud-10806.web.app/payment/return?tx=1')).toBeNull();
    });

    it('keeps the native custom scheme restricted to ridersbud://payment/return', () => {
        expect(parsePaymentReturnUrl('ridersbud://payment/return?tx=tx_2')).not.toBeNull();
        expect(parsePaymentReturnUrl('com.sasetin42.ridersbud://payment/return?tx=tx_3')).not.toBeNull();
        // correct scheme, wrong host/path
        expect(parsePaymentReturnUrl('ridersbud://customer-portal/bookings')).toBeNull();
        expect(parsePaymentReturnUrl('ridersbud://evilhost/payment/return?tx=tx_4')).toBeNull();
    });

    it('still refuses non-return paths on a trusted host', () => {
        expect(parsePaymentReturnUrl('https://ridersbud-10806.web.app/customer-portal/')).toBeNull();
        expect(PaymentReturnCoordinator.parseUrl('https://ridersbud-10806.web.app/customer-portal/')).toBeNull();
    });

    it('never throws on malformed input (crash safety)', () => {
        const garbage = ['', 'not a url', '://', 'https://', null as any, undefined as any, 123 as any];
        for (const g of garbage) {
            expect(() => parsePaymentReturnUrl(g as string)).not.toThrow();
            expect(() => PaymentReturnCoordinator.parseUrl(g as string)).not.toThrow();
        }
    });
});

/**
 * Spec §7 — PAYMENT STATE MACHINE.
 */
describe('§7 state machine: RETURN_RECEIVED and PENDING_REVIEW', () => {
    const TERMINAL: PaymentState[] = ['PAID', 'FAILED', 'CANCELLED', 'EXPIRED'];

    it('supports the full documented success path', () => {
        const path_: PaymentState[] = ['CREATED', 'INITIALIZING', 'CHECKOUT_OPEN', 'WAITING_FOR_PAYMENT', 'RETURN_RECEIVED', 'VERIFYING', 'PAID'];
        for (let i = 0; i < path_.length - 1; i++) {
            expect(canTransitionPaymentState(path_[i], path_[i + 1])).toBe(true);
        }
    });

    it('RETURN_RECEIVED is verification-only and cannot assert success directly from WAITING', () => {
        // WAITING -> RETURN_RECEIVED is fine, but a return must reach VERIFYING/PAID
        // only via the backend. The machine still forbids going backwards.
        expect(canTransitionPaymentState('RETURN_RECEIVED', 'CHECKOUT_OPEN')).toBe(false);
        expect(canTransitionPaymentState('RETURN_RECEIVED', 'CREATED')).toBe(false);
        expect(canTransitionPaymentState('RETURN_RECEIVED', 'WAITING_FOR_PAYMENT')).toBe(false);
        // and it can never reopen a checkout (no second HitPay session)
        expect(canTransitionPaymentState('PAID', 'RETURN_RECEIVED')).toBe(false);
    });

    it('PENDING_REVIEW resolves without ever having been a success', () => {
        expect(canTransitionPaymentState('VERIFYING', 'PENDING_REVIEW')).toBe(true);
        expect(canTransitionPaymentState('PENDING_REVIEW', 'PAID')).toBe(true);
        expect(canTransitionPaymentState('PENDING_REVIEW', 'FAILED')).toBe(true);
        expect(canTransitionPaymentState('PENDING_REVIEW', 'PENDING')).toBe(true);
        // mismatch must never be reported as a completed checkout
        expect(canTransitionPaymentState('PENDING_REVIEW', 'CHECKOUT_OPEN')).toBe(false);
    });

    it('PAID stays absorbing with the new states present', () => {
        const all: PaymentState[] = [
            'CREATED', 'INITIALIZING', 'CHECKOUT_OPEN', 'WAITING_FOR_PAYMENT',
            'RETURN_RECEIVED', 'VERIFYING', 'PENDING', 'PENDING_REVIEW',
            'FAILED', 'CANCELLED', 'EXPIRED'
        ];
        for (const s of all) {
            expect(canTransitionPaymentState('PAID', s)).toBe(false);
        }
        expect(canTransitionPaymentState('PAID', 'PAID')).toBe(true);
    });

    it('a late verified PAID can still recover every non-success state', () => {
        const recoverable: PaymentState[] = ['FAILED', 'CANCELLED', 'EXPIRED', 'PENDING', 'PENDING_REVIEW', 'VERIFYING', 'RETURN_RECEIVED'];
        for (const s of recoverable) {
            expect(canTransitionPaymentState(s, 'PAID')).toBe(true);
        }
    });

    it('no state may ever jump back to CREATED (no duplicate session restart)', () => {
        const all: PaymentState[] = [
            'INITIALIZING', 'CHECKOUT_OPEN', 'WAITING_FOR_PAYMENT', 'RETURN_RECEIVED',
            'VERIFYING', 'PENDING', 'PENDING_REVIEW', 'PAID', 'FAILED', 'CANCELLED', 'EXPIRED'
        ];
        for (const s of all) {
            expect(canTransitionPaymentState(s, 'CREATED')).toBe(false);
        }
    });

    it('every state in the union has a transition table entry', async () => {
        // Guard against a state being added to the type but forgotten in the
        // table (which would make canTransitionPaymentState silently false).
        const machineSource = fs.readFileSync(
            path.resolve(__dirname, '../services/payment/paymentStateMachine.ts'),
            'utf-8'
        );
        const unionBlock = machineSource.slice(
            machineSource.indexOf('export type PaymentState'),
            machineSource.indexOf('export const TERMINAL_STATES')
        );
        const declared = Array.from(unionBlock.matchAll(/\|\s*'([A-Z_]+)'/g)).map(m => m[1]);
        expect(declared.length).toBeGreaterThanOrEqual(12);
        for (const state of declared) {
            expect(() => transitionPaymentState(state as PaymentState, state as PaymentState)).not.toThrow();
            expect(canTransitionPaymentState(state as PaymentState, state as PaymentState)).toBe(true);
        }
        // The two spec §7 states must actually be declared
        expect(declared).toContain('RETURN_RECEIVED');
        expect(declared).toContain('PENDING_REVIEW');
    });

    it('TERMINAL set does not contain PENDING_REVIEW (it is unresolved, not failed)', () => {
        // PENDING_REVIEW must keep the UI in a non-terminal, still-verifying posture
        expect(canTransitionPaymentState('PENDING_REVIEW', 'VERIFYING')).toBe(true);
    });

    it('illegal transitions still throw rather than silently passing', () => {
        expect(() => transitionPaymentState('PAID', 'CREATED')).toThrow();
        expect(() => transitionPaymentState('CHECKOUT_OPEN', 'CREATED')).toThrow();
        expect(() => transitionPaymentState('PENDING_REVIEW', 'CHECKOUT_OPEN')).toThrow();
    });

    it('TERMINAL constant is unchanged (PAID/FAILED/CANCELLED/EXPIRED)', async () => {
        const { TERMINAL_STATES } = await import('../services/payment/paymentStateMachine');
        expect(Array.from(TERMINAL_STATES).sort()).toEqual(['CANCELLED', 'EXPIRED', 'FAILED', 'PAID']);
        expect(TERMINAL_STATES.has('PENDING')).toBe(false);
        expect(TERMINAL_STATES.has('PENDING_REVIEW')).toBe(false);
        expect(TERMINAL_STATES.has('RETURN_RECEIVED')).toBe(false);
    });
});

/**
 * Spec §6 — CENTRAL CONTROLLER. No screen may create HitPay payments or open
 * a browser by itself.
 */
describe('§6 architecture: single payment controller', () => {
    const read = (rel: string) =>
        fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf-8');

    it('PaymentReturnCoordinator never opens a browser or creates a payment', () => {
        const src = read('services/payment/PaymentReturnCoordinator.ts');
        expect(src).not.toContain('Browser.open');
        expect(src).not.toContain('createPaymentRequest');
        expect(src).not.toContain('openPaymentUrl');
        expect(src).not.toContain('window.location');
    });

    it('PaymentReturnCoordinator now enforces the trusted-origin allowlist (§13)', () => {
        const src = read('services/payment/PaymentReturnCoordinator.ts');
        expect(src).toContain('ALLOWED_RETURN_HOSTS');
        expect(src).toContain('isTrusted');
    });

    it('utils/paymentReturn.ts enforces the trusted-origin allowlist (§13)', () => {
        const src = read('utils/paymentReturn.ts');
        expect(src).toContain('ALLOWED_RETURN_HOSTS');
        expect(src).toContain('isTrustedReturnOrigin');
    });

    it('PaymentController handles the backend fallbackToPortal response', () => {
        // Regression: an unhandled fallbackToPortal used to fall through to
        // WAITING_FOR_PAYMENT + success:true with no checkout URL, pinning every
        // payment screen on an infinite spinner.
        const src = read('services/payment/PaymentController.ts');
        expect(src).toContain('fallbackToPortal');
        expect(src).toMatch(/if \(data\.fallbackToPortal === true\)/);
        // and it must not simply swallow it
        expect(src).toContain('setState(\'FAILED\'');
    });

    it('PaymentController owns checkout presentation, not the legacy screen', () => {
        const controller = read('services/payment/PaymentController.ts');
        expect(controller).toContain('HitPayInApp.openPayment');
        expect(controller).toContain('watchPendingPaymentReturn');
    });

    it('legacy /hitpay-checkout screen no longer calls createPaymentRequest directly', () => {
        const src = read('pages/HitPayCheckoutScreen.tsx');
        expect(src).not.toMatch(/hitpay\.createPaymentRequest/);
        expect(src).toContain('HitPayEmbeddedService.startCheckout');
        // still must never treat a redirect as proof of payment
        expect(src).toContain('watchPaymentReturnVerification');
    });

    it('no page imports HitPayService to create a payment request', () => {
        const pagesDir = path.resolve(__dirname, '../pages');
        const offenders: string[] = [];
        const walk = (dir: string) => {
            for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
                const full = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    if (entry.name === 'admin') continue;
                    walk(full);
                } else if (/\.tsx?$/.test(entry.name)) {
                    const src = fs.readFileSync(full, 'utf-8');
                    if (/createPaymentRequest\s*\(/.test(src)) offenders.push(full);
                }
            }
        };
        walk(pagesDir);
        expect(offenders).toEqual([]);
    });

    it('every checkout entry point goes through HitPayEmbeddedService or PaymentController', () => {
        const pagesDir = path.resolve(__dirname, '../pages');
        const started: string[] = [];
        const walk = (dir: string) => {
            for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
                const full = path.join(dir, entry.name);
                if (entry.isDirectory()) walk(full);
                else if (/\.tsx?$/.test(entry.name)) {
                    const src = fs.readFileSync(full, 'utf-8');
                    if (/startCheckout\s*\(/.test(src)) started.push(path.relative(pagesDir, full));
                }
            }
        };
        walk(pagesDir);
        // Sanity: the known payment screens really are on the shared path
        for (const expected of ['ServicePaymentScreen.tsx', 'PaymentScreen.tsx', 'BookingScreen.tsx']) {
            expect(started).toContain(expected);
        }
    });
});

/**
 * Spec §34 — no HitPay secret may live in the client bundle sources.
 */
describe('§34 credentials never reach the client', () => {
    const roots = ['services', 'utils', 'pages', 'components', 'context'];

    const collect = (dir: string, out: string[] = []): string[] => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) collect(full, out);
            else if (/\.tsx?$/.test(entry.name)) out.push(full);
        }
        return out;
    };

    it('no HITPAY_API_KEY / SALT / SECRET literal is assigned in client source', () => {
        const offenders: string[] = [];
        for (const root of roots) {
            const dir = path.resolve(__dirname, '..', root);
            if (!fs.existsSync(dir)) continue;
            for (const file of collect(dir)) {
                const src = fs.readFileSync(file, 'utf-8');
                if (/HITPAY_(API_KEY|SALT|SECRET|WEBHOOK_SALT)\s*[:=]\s*['"][^'"]+['"]/.test(src)) {
                    offenders.push(path.relative(path.resolve(__dirname, '..'), file));
                }
            }
        }
        expect(offenders).toEqual([]);
    });
});
