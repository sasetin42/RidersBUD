# HitPay Payment Checkout Fix for Services

## Goal
Make the HitPay payment checkout in the Services booking flow fully functional, robust, and completely working by routing checkout directly into the branded in-app `/hitpay-checkout` portal (like ServicePaymentScreen) and making return/reconciliation resilient without step resetting or missing booking data.

## Tasks
- [x] Task 1: Update `BookingScreen.tsx` `handleBooking` to route to `/hitpay-checkout` with complete parameters (`amount`, `reference_number`, `redirect_url`, `purpose`, `email`, `name`, `phone`) → Verify: User selecting "Online (HitPay)" in BookingScreen is routed cleanly to `/hitpay-checkout` instead of failing on direct external URL.
- [x] Task 2: Standardize the redirect URL to return to `/customer-portal/booking-confirmation?bookingId=${createdBooking.id}&status=completed` → Verify: Returning from HitPay goes directly to Booking Confirmation with live status rather than reloading step 1 of BookingScreen.
- [x] Task 3: Strengthen `BookingConfirmationScreen.tsx` to handle `status=completed` query params and reconcile downpayment payment in Firestore if needed → Verify: Firestore booking document is verified and updated to `downpayment_paid` with `isVerified: true` and `status: 'Upcoming'`.
- [x] Task 4: Enhance `BookingScreen.tsx` return listener as fallback so both BookingScreen and BookingConfirmationScreen safely process HitPay returns → Verify: No state reset occurs, session storage tx details are properly retrieved and cleared.
- [x] Task 5: Run TypeScript checks and verify build integrity → Verify: `npx tsc --noEmit` passes with 0 errors.

## Done When
- [x] Standard vehicle service bookings in `BookingScreen.tsx` initiate HitPay checkout through `/hitpay-checkout` with in-app modal and complete payment methods.
- [x] Successful payment redirects seamlessly back into the app, updates Firestore to `downpayment_paid` with verified status, and displays the Booking Confirmation screen without step reset.
- [x] TypeScript check and production build succeed cleanly.
