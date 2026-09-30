# Fix Liaison & Multi-Service Pay Balance Button

## Goal
Make the "Pay Balance" button for Liaison Services fully functional, robust, and consistent with Car Rental and Driver for Hire services across cards, modal dialogs, and payment gateways (HitPay and GCash).

## Tasks
- [x] Task 1: Audit `HomeScreen.tsx` transaction mapping, card buttons, and `balanceBookingForModal` state triggers → Verify: Liaison and Driver transactions pass accurate balance, plate/vehicle details, and title to modal.
- [x] Task 2: Standardize `Pay Balance` actions in `selectedDetailsBooking` modal in `HomeScreen.tsx` → Verify: Clicking `Pay Balance` inside details popup triggers the balance settlement modal consistently without redirect errors.
- [x] Task 3: Enhance `handleInitiateHitPayBalance` and redirect return handler in `HomeScreen.tsx` → Verify: HitPay returns resolve Liaison ID cleanly (prefix handling) and update Firestore status to Completed + paid.
- [x] Task 4: Ensure manual GCash balance flow (`showBalanceGCashModal`) updates Liaison booking records accurately in Firestore → Verify: Uploading receipt sets balance status to Completed and balance paid.
- [x] Task 5: Run TypeScript compilation and build check → Verify: `npm run build` exits 0 with zero errors.

## Done When
- [x] Clicking `Pay Bal` on any Liaison transaction card or detail modal launches the settlement modal cleanly.
- [x] Both HitPay and GCash manual balance payments work identically to Car Rental and Driver for Hire.
- [x] Vehicle details, plate numbers, and titles display correctly without missing field fallbacks.
- [x] `npm run build` succeeds cleanly.
