/**
 * Firestore collection mapping for payment status watching.
 *
 * The payment redirect watcher needs to know which Firestore collection a
 * given record ID belongs to, because bookings, rentals, liaison jobs and
 * service requests each live in their own collection but share the same
 * payment verification fields (isVerified / hitpayStatus / paymentStatus).
 */
export type PaymentEntityKind =
    | 'booking'          // mechanic service bookings (bookings)
    | 'rental'           // car rental bookings (rentalBookings)
    | 'liaison'          // LTO liaison bookings (liaisonBookings)
    | 'service-request'  // towing / driver-for-hire / other service requests (serviceRequests)

export const PAYMENT_COLLECTIONS: Record<PaymentEntityKind, string> = {
    'booking': 'bookings',
    'rental': 'rentalBookings',
    'liaison': 'liaisonBookings',
    'service-request': 'serviceRequests'
};

export const collectionForEntity = (kind: PaymentEntityKind): string => PAYMENT_COLLECTIONS[kind] ?? 'bookings';
