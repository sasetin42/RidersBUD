# Final Payment Proceed & Looping Issue Fix Plan

## Goal
Fix the final payment balance settlement loop ("pabalik-balik") where payment does not proceed properly in `BookingDetailScreen.tsx`, `ServicePaymentScreen.tsx`, and `HomeScreen.tsx` for Car Rental, Driver for Hire, and Service bookings.

---

## Root Causes Identified
1. **Missing Collection-Specific Updater in `BookingDetailScreen.tsx`:**
   - `updateRentalBooking` is not destructured from `useDatabase()`.
   - When the user completes HitPay payment for a Car Rental, the return callback only called `updateBookingPayment` (targeting the `'bookings'` collection in Firestore).
   - Because Car Rental bookings are stored in the `'rentalBookings'` collection, Firestore throws `No document to update`.
   - As a result, `rentalBookings` is never updated with `isPaid: true` or `paymentStatus: 'paid'`.
   - When the page re-renders, `!booking.isPaid` is still `true`, causing the mandatory "Settle Remaining Balance" modal to immediately reappear ("pabalik-balik").
2. **Mismatched Metadata in Session Storage & Redirect URLs:**
   - In `handleInitiateHitPayBalance` in `BookingDetailScreen.tsx`, `isRental` was hardcoded to `false` in `sessionStorage.setItem('pendingHitPayServiceTx', ...)`.
   - The `returnUrl` omitted booking type tags (`isRental=true`), making downstream reconciliation fail if redirected through intermediate portals.
3. **Hardcoded Mechanic Copy on Rental & Driver Modals:**
   - The modal text hardcoded "Your mechanic Mechanic has finished work on your vehicle." Even for Car Rental and Driver for Hire, which caused confusion and improper badge/icon display.
4. **`ServicePaymentScreen.tsx` Status Reset:**
   - In `ServicePaymentScreen.tsx`, finalizing a fully settled rental set `status: 'Confirmed'` instead of `'Completed'` or retaining full closure.

---

## Tasks

- [ ] **Task 1: Add `updateRentalBooking` to `BookingDetailScreen.tsx` & Fix Callback Finalizer**
  - Destructure `updateRentalBooking` from `useDatabase()`.
  - In the `useEffect` handling HitPay gateway return query params (`status === 'completed' || status === 'success'`), check if `isRental || targetBookingId.startsWith('RNT-') || targetBookingId.startsWith('RN-')`.
  - Call `await updateRentalBooking(targetBookingId, { isPaid: true, paymentStatus: 'paid', paidAmount: fullTotal, remainingBalance: 0, balancePaid: true, balancePaymentRef: hitpayRef, balancePaidAt: new Date().toISOString(), status: 'Completed' })`.
  - Provide fallback direct Firestore `updateDoc(doc(firestore, 'rentalBookings', targetBookingId), ...)` to guarantee synchronization even if context cache is lagging.
  - Clear URL search params via `window.history.replaceState` and display `showCompleteTransactionModal(true)`.
  - → *Verify:* Returning from payment gateway marks the rental as fully paid and transitions the screen into completed receipt state without modal looping.

- [ ] **Task 2: Fix `handleInitiateHitPayBalance` in `BookingDetailScreen.tsx`**
  - Accurately set `isRental: isRental` in `pendingHitPayServiceTx` sessionStorage payload.
  - Include `&isRental=true` in `returnUrl` when booking is a rental.
  - Include rental vehicle name and customer ID in the HitPay request purpose and metadata.
  - → *Verify:* Session storage and gateway return URL have accurate stream identifiers.

- [ ] **Task 3: Dynamic Visuals & Messaging in Settle Remaining Balance Modal**
  - Detect `isRental` vs `isDriverHire` vs maintenance booking in the modal.
  - For Car Rental: Display `Rental Completed` badge with `<Car />` icon, and text: `"Your rental reservation for [Car Name] is completed. Payment of the remaining balance is required to finalize and release your rental booking."`
  - For Driver for Hire: Display `Trip Completed` badge with `<Navigation />` icon, and text: `"Your driver [Driver Name] has completed the trip. Payment of the remaining balance is required to finalize your trip booking."`
  - For Maintenance: Retain `Service Completed` with mechanic name.
  - → *Verify:* Modal displays matching service title and vehicle details without "Your mechanic Mechanic".

- [ ] **Task 4: Harden `ServicePaymentScreen.tsx` Rental Balance Finalization**
  - When `isFullyPaid` is true for a rental booking, ensure status transitions to `'Completed'` (not reset to `'Confirmed'`).
  - Update remaining balance to `0` and sync both Firestore and local database.
  - → *Verify:* Settling via `ServicePaymentScreen` marks balance as 0 and status as Completed.

- [ ] **Task 5: Full Build & Type Verification**
  - Run `npx tsc --noEmit` to verify type safety.
  - Run `npm run build` to confirm production bundle builds cleanly.
  - → *Verify:* Build exits 0 with zero runtime or compilation issues.

---

## Done When
- [ ] User completing final payment for Car Rental, Driver for Hire, or Service has their booking authoritative state updated in Firestore (`isPaid: true`, `remainingBalance: 0`, `paymentStatus: 'paid'`).
- [ ] The "Settle Remaining Balance" modal closes and DOES NOT loop back ("hindi na pabalik-balik").
- [ ] A celebration confirmation / completed transaction modal is shown with updated balance details.
