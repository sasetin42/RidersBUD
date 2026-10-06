# PLAN: Gateway Enforcement & Complete Removal of Manual GCash in Online Payment Flow

> **Status:** IN EXECUTION (Phase 2)
> **Goal:** Strictly enforce gateway settings across all booking, balance settlement, and payment views. When HitPay is enabled or when `gcashEnabled` is false/disabled, completely eliminate and suppress Manual GCash / QR modals, auto-pops, and buttons so the application focuses purely on the enabled online payment gateway.

---

## 1. Problem Diagnosis & Verified Root Causes

### 1.1 Unconditional Auto-Pop in `BookingDetailScreen.tsx` (Lines 1405–1416)
- **Problem**: When a booking reaches `'Work Done'` or has `paymentStatus: 'partial'`, a `useEffect` triggers `setShowGCashPaymentModal(true)` without verifying if `db?.settings?.gcashEnabled` is true or if HitPay is active.
- **Fix**: Gate `shouldAutoPop` strictly on `isManualGcashEnabled && !isHitPayActive`. When HitPay is active, NEVER auto-open the manual GCash modal.

### 1.2 Initial Booking Document Defaults in `BookingScreen.tsx` (Lines 1548–1550)
- **Problem**: When `newBookingData` is constructed, `paymentMethod: 'GCash'` and `gcashPaymentStatus: 'awaiting_payment'` were hardcoded even though the user is paying via HitPay online gateway.
- **Fix**: When HitPay is active, initialize `paymentMethod: 'Online (HitPay)'`, `paymentGateway: 'hitpay'`, and omit `gcashPaymentStatus` (or set to `'none'`).

### 1.3 Unguarded Modal Rendering in `BookingDetailScreen.tsx` (Line 3747)
- **Problem**: `<GCashPaymentModal>` was rendered based solely on `showGCashPaymentModal` without checking `isManualGcashEnabled`.
- **Fix**: Guard with `showGCashPaymentModal && isManualGcashEnabled && !isHitPayActive`.

### 1.4 Balance Settlement Cards in `BookingDetailScreen.tsx` & `HomeScreen.tsx`
- **Problem**: Manual GCash QR buttons were offered even when the user wants or needs to use the enabled online payment gateway.
- **Fix**: Ensure `isManualGcashEnabled` is strictly defined as `db?.settings?.gcashEnabled === true && !HitPayService.isGatewayActive(db?.settings)`. If HitPay is active, only the HitPay balance payment button is shown.
- **Fallback Catch in `handleInitiateHitPayBalance`**: Remove automatic redirect to `/customer-portal/service-payment/...` on error; show an inline error message and retry button instead.

---

## 2. Multi-Agent Orchestration (Phase 2)

- **Agent 1: Frontend Specialist (`pages/BookingDetailScreen.tsx`, `pages/HomeScreen.tsx`, `pages/BookingScreen.tsx`)**
  - Fix `shouldAutoPop` in `BookingDetailScreen.tsx`.
  - Fix modal rendering conditions for GCash modal.
  - Fix balance settlement cards to only display HitPay when HitPay is active.
  - Fix `newBookingData` in `BookingScreen.tsx` to set `paymentMethod: 'Online (HitPay)'` and remove `gcashPaymentStatus: 'awaiting_payment'`.

- **Agent 2: Backend Specialist (`functions/index.js`, `functions/lib/hitpay.js`)**
  - Verify `computeEntityPaymentUpdate` and `settleTransaction` for balance settlements.
  - Ensure booking updates set `paymentMethod: 'Online (HitPay)'` and do not leave manual GCash statuses.

- **Agent 3: Test Engineer**
  - Run `npm test`
  - Run `npm --prefix functions test`
  - Run `npm run typecheck`
  - Run `npm run build`
