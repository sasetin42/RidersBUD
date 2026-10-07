/**
 * Client mirror of the backend's `calculateAuthoritativeAmount`
 * (functions/lib/hitpay.js) used by the service/booking checkout screens.
 *
 * The backend is AUTHORITATIVE for every charge: if the amount a screen shows
 * diverges from its computation, the payment request is rejected with HTTP 400
 * PAYMENT_AMOUNT_MISMATCH — which surfaced to customers as "online payment is
 * not working". Keeping this module aligned with the server's field precedence
 * (pinned by test/paymentCheckout.test.ts against the REAL server function)
 * means the amount shown is exactly the amount charged.
 *
 * The server still validates the hint and PaymentController self-heals a
 * mismatch by retrying once with the server's authoritative amount — this
 * module exists so that path is the exception, not the norm.
 */

export interface ServiceAmounts {
    /** Total chargeable amount for the entity (server precedence). */
    total: number;
    /** Downpayment due while the deposit is still outstanding. */
    downpaymentDue: number;
}

const EMPTY: ServiceAmounts = { total: 0, downpaymentDue: 0 };

/** Number() with null/undefined falling back — mirrors JS `??` then Number(). */
const num = (value: unknown, fallback = 0): number => {
    if (value === null || value === undefined) return fallback;
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
};

const round2 = (n: number): number => Number(n.toFixed(2));

/**
 * Resolves `{ total, downpaymentDue }` with the exact per-collection field
 * precedence the server uses. `servicesSum` is the screen's
 * `services.reduce(...)` — only 'bookings' falls back to it, mirroring the
 * server (which only sums `data.services` when `totalAmount` is missing).
 */
export function resolveServiceAmounts(booking: any, servicesSum: number): ServiceAmounts {
    if (!booking) return EMPTY;
    const b = booking;

    let total: number;
    let downpaymentDue: number;

    if (b.isRental) {
        // rentalBookings: totalPrice ?? totalAmount; dp ?? total*0.5
        total = num(b.totalPrice ?? b.totalAmount);
        downpaymentDue = num(b.downpaymentAmount, total * 0.5);
    } else if (b.isLiaison) {
        // liaisonBookings: totalAmount ?? fees.total ?? price ?? 1500
        const fees = b.fees || {};
        total = num(b.totalAmount ?? fees.total ?? b.price, 1500);
        downpaymentDue = num(b.downpaymentAmount, num(fees.downpayment, Math.round(total * 0.5)));
    } else if (b.isServiceRequest || b.isDriver || b.isDriverHire) {
        // serviceRequests: totalAmount ?? details.totalAmount ?? estimatedCost
        const details = b.details || {};
        total = num(b.totalAmount ?? details.totalAmount ?? b.estimatedCost);
        downpaymentDue = num(b.downpaymentAmount, num(details.downpaymentAmount, total * 0.5));
    } else {
        // bookings: totalAmount doc field first; services sum only as fallback
        const docTotal = num(b.totalAmount);
        if (docTotal > 0) {
            total = docTotal;
        } else if (Array.isArray(b.services)) {
            total = num(servicesSum);
        } else {
            total = 0;
        }
        downpaymentDue = num(b.downpaymentAmount, total * 0.5);
    }

    return {
        total: round2(Math.max(0, total)),
        downpaymentDue: round2(Math.max(0, downpaymentDue))
    };
}

/**
 * Mirror of the server's final amount selection for kind 'downpayment'/'balance':
 * charge the downpayment while it is still outstanding, otherwise the remaining
 * balance. Returns 0 when nothing is due — callers must NOT initiate a payment
 * in that case (the backend would either reject it or charge a stale amount).
 */
export function computeAmountDue(opts: {
    isDeposit: boolean;
    paid: number;
    total: number;
    downpaymentDue: number;
}): number {
    const paid = Math.max(0, num(opts.paid));
    const total = Math.max(0, num(opts.total));
    const downpaymentDue = Math.max(0, num(opts.downpaymentDue));

    if (opts.isDeposit && paid < downpaymentDue - 0.01) {
        return round2(downpaymentDue);
    }
    return round2(Math.max(0, total - paid));
}
