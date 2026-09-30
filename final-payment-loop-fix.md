# Final Payment Balance Settlement & Reconciliation Plan

## Goal
Completely fix the customer's second/final payment balance settlement across all service types (Mechanic/Standard Service, Car Rental, LTO Liaison, and Driver for Hire) in `BookingDetailScreen.tsx`, `HomeScreen.tsx`, `ServicePaymentScreen.tsx`, and `GCashPaymentModal.tsx`. Ensure payments proceed immediately, reconcile reliably from sessionStorage & Firestore, eliminate race conditions upon gateway return, and prevent looping modals ("pabalik-balik").

---

## Tasks

- [ ] **Task 1: Overhaul Gateway Return Reconciler in `BookingDetailScreen.tsx`**
  - Fix the race condition where `fetchedBooking` is initially null when returning from HitPay (`?status=completed`).
  - Read cached transaction metadata from `sessionStorage.getItem('pendingHitPayServiceTx')` if `fetchedBooking` is hydrating.
  - Implement robust direct Firestore fallback for all 4 booking types (`bookings`, `rentalBookings`, `liaisonBookings`, `serviceRequests`).
  - Authoritatively commit `isPaid: true, balancePaid: true, remainingBalance: 0, paymentStatus: 'paid', status: 'Completed'`.
  - Clean URL query parameters via `window.history.replaceState` and trigger `setShowCompleteTransactionModal(true)` to present the receipt celebration without looping back.
  - → *Verify:* Returning from payment gateway marks the booking as fully paid and transitions the screen into completed receipt state without modal looping.

- [ ] **Task 2: Support Standard Service Booking Returns in `HomeScreen.tsx`**
  - Add standard booking balance settlement handling in the `useEffect` on `HomeScreen.tsx` (in addition to rental, liaison, driver).
  - Update `bookings` collection in Firestore with `isPaid: true, balancePaid: true, remainingBalance: 0, status: 'Completed'`.
  - Dispatch a success notification to the customer and dismiss any pending balance popups.
  - → *Verify:* Settling mechanic/service balance from Home Screen updates Firestore and dismisses the settlement card immediately.

- [ ] **Task 3: Refine `GCashPaymentModal.tsx` & Balance Modal Dismissal**
  - When customer uploads second/final payment receipt (`isSecondPayment`), set `gcashPaymentStatus: 'balance_receipt_uploaded'`.
  - Trigger callback to immediately close the mandatory balance lock modal and persist dismissed/pending state.
  - Ensure the modal displays "Balance Payment Under Verification" without repeatedly popping up.
  - → *Verify:* Uploading final GCash receipt closes the modal and avoids any infinite loop.

- [ ] **Task 4: Harden `ServicePaymentScreen.tsx` Final Payment Transitions**
  - Verify that when `isFullyPaid` is true, remaining balance is 0 and status transitions to `'Completed'` across all categories.
  - Clear pending session transactions reliably.
  - → *Verify:* Direct service payment flow routes cleanly to confirmation with 0 balance.

- [ ] **Task 5: Type Check & Build Verification**
  - Run `npx tsc --noEmit` to verify type safety.
  - Test development server responsiveness.
  - → *Verify:* Zero TypeScript errors and clean compilation.

---

## Done When
- [ ] Final payment via HitPay online immediately marks booking `isPaid: true, remainingBalance: 0, balancePaid: true, status: 'Completed'` across standard services, rentals, liaison, and driver requests.
- [ ] The "Settle Remaining Balance" modal never loops back ("hindi na pabalik-balik").
- [ ] GCash manual receipt upload for final balance puts the booking in "Under Verification" and dismisses the blocking modal.
- [ ] TypeScript check (`npx tsc --noEmit`) passes with 0 errors.
