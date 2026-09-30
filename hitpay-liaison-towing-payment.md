# Plan: Implement HitPay Online Payment for Liaison and Towing Services

## Goal
Fully integrate HitPay Online Payment (supporting both sandbox and live modes based on Admin Settings) into **Liaison (Registration Assistance & Standard LTO Liaison)** and **Towing Services**, matching the existing implementation in **Rent a Car** and **Driver for Hire**.

---

## Architecture & Analysis

### 1. Liaison Booking Flow (`pages/services/LiaisonBookingFlow.tsx`)
- **Current State:**
  - Standard Liaison already has HitPay integration logic for 50% downpayment (`fees.total * 0.5`).
  - However, `Registration Assistance` explicitly bypasses payment with `if (isRegAssist) { navigate('/'); return; }` and displays `"No immediate payment is required"`.
- **Target State:**
  - Both Standard Liaison and Registration Assistance will require 50% downpayment via HitPay when HitPay is enabled.
  - Clean UI breakdown: Total Fee, Downpayment Due Now (50%), Remaining Balance Upon Completion (50%).
  - Check `HitPayService.isGatewayActive(db?.settings)`. If active, automatically initiate payment request with HitPay (Sandbox or Live mode dynamically determined by `HitPayService.fromSettings(db?.settings)`).
  - Store transaction context in `sessionStorage.getItem('pendingHitPayServiceTx')` and redirect to HitPay URL (or in-app checkout `/hitpay-checkout` if in Sandbox/fallback).
  - Upon return to `/customer-portal/service-payment?bookingId=...&isLiaison=true`, verify transaction status and update `liaisonBookings` record.

### 2. Towing Service Flow (`pages/services/ServiceBookingFlow.tsx`)
- **Current State:**
  - `ServiceBookingFlow.tsx` only creates a `serviceRequest` with status `'Pending'` without any payment step.
- **Target State:**
  - When the service is Towing (or any fee-based service request):
    - Display pricing breakdown (e.g. Service Fee / Deposit 50%).
    - Calculate amount to pay now (50% downpayment).
    - If `HitPayService.isGatewayActive(db?.settings)` is active, redirect to HitPay hosted portal or in-app `/hitpay-checkout`.
    - Set `pendingHitPayServiceTx` with `isServiceRequest: true`, `isTowing: true`.
    - On callback `/customer-portal/service-payment?bookingId=...`, mark downpayment as paid and booking confirmed.

### 3. Database & Payment Verification (`pages/ServicePaymentScreen.tsx` & `context/DatabaseContext.tsx`)
- Add `updateLiaisonBooking(id, updates)` in `DatabaseContext.tsx` to handle arbitrary payment field updates on `liaisonBookings`.
- In `pages/ServicePaymentScreen.tsx`:
  - Support `isLiaison` in payment completion handler (`updateLiaisonBooking` with downpayment details).
  - Support `isTowing` / generic `isServiceRequest` in payment completion handler.

---

## Tasks Breakdown
1. **DatabaseContext (`context/DatabaseContext.tsx`):**
   - Expose `updateLiaisonBooking` so payment details (`paidAmount`, `paymentStatus`, `hitpayReference`, etc.) can be persisted directly to `liaisonBookings`.
2. **Service Payment Screen (`pages/ServicePaymentScreen.tsx`):**
   - Add handling for `isLiaison` in `finalizePayment` to update `liaisonBookings` with `paymentStatus: 'partial' | 'paid'`, `paidAmount`, `remainingBalance`, `hitpayReference`, and `downpaymentPaidAt`.
   - Ensure `isServiceRequest` (Towing) updates `serviceRequests` with `paymentStatus: 'partial' | 'paid'`, `status: 'Confirmed'`.
3. **Liaison Booking Flow (`pages/services/LiaisonBookingFlow.tsx`):**
   - Enable HitPay downpayment for Registration Assistance and Standard Liaison alike.
   - Update Step 5 (Review Step) to show the payment breakdown (Downpayment 50% vs Remaining Balance 50%).
   - Trigger HitPay payment request on submit; redirect to HitPay payment URL.
4. **Towing Booking Flow (`pages/services/ServiceBookingFlow.tsx`):**
   - Add pricing calculation, deposit breakdown, and HitPay integration for Towing service requests.
   - Redirect to HitPay gateway on confirmation.
5. **Verification & Testing:**
   - Run `npm run build` to ensure clean TypeScript compilation with 0 errors.

---

## Done When
- [ ] User books Registration Assistance or Standard Liaison -> calculates 50% downpayment -> routes to HitPay (Sandbox or Live based on settings) -> completes payment -> marks booking as paid/downpayment received.
- [ ] User books Towing Service -> calculates fee & downpayment -> routes to HitPay -> completes payment -> marks booking as confirmed with deposit recorded.
- [ ] All code builds cleanly.
