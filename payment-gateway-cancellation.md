# Payment Gateway Cancellation Flow

## Goal
Ensure that when a customer clicks **Back** or leaves the Payment Gateway (HitPay / QR Ph) sequence, the service transaction is **completely and properly cancelled** in the database, with the "Payment Aborted" modal displayed.

## Tasks
- [x] Task 1: Update `pages/ServicePaymentScreen.tsx` to properly cancel `serviceRequests` (Driver for Hire, Liaison, Towing) in addition to `bookings` and `rentalBookings` when `status` is canceled/cancelled/failed → Verify: Test gateway return with `status=canceled` or `status=cancelled`.
- [x] Task 2: Standardize status checking across all payment return routes (`ServicePaymentScreen.tsx`, `BookingConfirmationScreen.tsx`, `PaymentScreen.tsx`) to support `canceled`, `cancelled`, `failed`, and `expired` → Verify: Query string variations cleanly trigger cancellation.
- [x] Task 3: In `pages/services/DriverBookingFlow.tsx` and `pages/services/LiaisonBookingFlow.tsx`, add gateway return & browser Back/abandonment detection to automatically cancel orphaned requests if user navigates back without completing payment → Verify: Back navigation from gateway cleans up pending request.
- [x] Task 4: In `pages/HitPayCheckoutScreen.tsx`, add a top `< Back` button in the header matching SaSe Web Solutions branding to cleanly invoke `handleReturnToApp('canceled')` → Verify: Clicking Back returns with `status=canceled` and triggers modal.
- [x] Task 5: Verify the "Payment Aborted" modal (`CancellationDetailsModal`) opens with accurate reference number, item breakdown, and amount → Verify: Modal matches user specifications.

## Done When
- [x] Leaving or clicking Back from payment gateway marks transaction as `Cancelled` in Firestore and local state.
- [x] The "Payment Aborted" modal displays properly with full transaction details and clear session state.
