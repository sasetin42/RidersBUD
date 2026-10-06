/**
 * Strict Payment State Machine for RidersBUD Native In-App Payments.
 *
 * Strict states:
 * CREATED -> INITIALIZING -> CHECKOUT_OPEN -> WAITING_FOR_PAYMENT -> VERIFYING -> PAID
 *
 * Side / terminal transitions from non-terminal states:
 * -> FAILED | CANCELLED | EXPIRED | PENDING
 *
 * Rules:
 * 1. PAID is absorbing (terminal success). A client CANCELLED/FAILED cannot overwrite server PAID.
 * 2. PENDING can still transition to PAID, FAILED, or EXPIRED.
 * 3. FAILED, CANCELLED, and EXPIRED can only be overridden by a verified server PAID (e.g. late webhook).
 * 4. Illegal transitions throw an Error.
 */

export type PaymentState =
    | 'CREATED'
    | 'INITIALIZING'
    | 'CHECKOUT_OPEN'
    | 'WAITING_FOR_PAYMENT'
    | 'VERIFYING'
    | 'PAID'
    | 'FAILED'
    | 'CANCELLED'
    | 'EXPIRED'
    | 'PENDING';

export const TERMINAL_STATES: ReadonlySet<PaymentState> = new Set<PaymentState>([
    'PAID',
    'FAILED',
    'CANCELLED',
    'EXPIRED'
]);

/**
 * Allowed transitions table.
 */
const ALLOWED_TRANSITIONS: Record<PaymentState, ReadonlySet<PaymentState>> = {
    CREATED: new Set(['INITIALIZING', 'CANCELLED', 'FAILED']),
    INITIALIZING: new Set(['CHECKOUT_OPEN', 'WAITING_FOR_PAYMENT', 'VERIFYING', 'PAID', 'FAILED', 'CANCELLED', 'EXPIRED', 'PENDING']),
    CHECKOUT_OPEN: new Set(['WAITING_FOR_PAYMENT', 'VERIFYING', 'PAID', 'FAILED', 'CANCELLED', 'EXPIRED', 'PENDING']),
    WAITING_FOR_PAYMENT: new Set(['VERIFYING', 'PAID', 'FAILED', 'CANCELLED', 'EXPIRED', 'PENDING']),
    VERIFYING: new Set(['PAID', 'FAILED', 'CANCELLED', 'EXPIRED', 'PENDING']),
    // PENDING can still be settled as PAID or fail/expire later
    PENDING: new Set(['VERIFYING', 'PAID', 'FAILED', 'CANCELLED', 'EXPIRED']),
    // Terminal states:
    PAID: new Set([]), // absorbing
    FAILED: new Set(['PAID']), // Late webhook authoritative recovery
    CANCELLED: new Set(['PAID']), // Late webhook authoritative recovery
    EXPIRED: new Set(['PAID']) // Late webhook authoritative recovery
};

export class IllegalPaymentStateTransitionError extends Error {
    constructor(public fromState: PaymentState, public toState: PaymentState, reason?: string) {
        super(`Illegal payment state transition from ${fromState} to ${toState}${reason ? `: ${reason}` : ''}`);
        this.name = 'IllegalPaymentStateTransitionError';
    }
}

/**
 * Validates whether transition from `from` to `to` is permitted.
 */
export function canTransitionPaymentState(from: PaymentState, to: PaymentState): boolean {
    if (from === to) return true;
    const allowed = ALLOWED_TRANSITIONS[from];
    return !!allowed && allowed.has(to);
}

/**
 * Asserts transition and returns the new state, or throws IllegalPaymentStateTransitionError.
 */
export function transitionPaymentState(from: PaymentState, to: PaymentState, reason?: string): PaymentState {
    if (from === to) return to;
    if (!canTransitionPaymentState(from, to)) {
        throw new IllegalPaymentStateTransitionError(from, to, reason);
    }
    return to;
}
