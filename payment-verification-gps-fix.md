# RidersBUD: Payment Verification, Fullscreen Payment, & Location Permission Hardening Plan

## Objectives
1. **Fix Recurring Location Permission Prompt ("pabalik-balik ng allowing location")**:
   - In native APK, ensure that when location permission is granted in Android, the app strictly uses `@capacitor/geolocation` and native fused location provider.
   - Suppress `navigator.permissions.query` and `navigator.geolocation` fallback in native environment to prevent the WebView from triggering Chrome browser dialogs (`ridersbud-10806.web.app wants to use your device's location`).
   - Completely disable any location prompts or monitors on `/payment/return`, `/hitpay-checkout`, and checkout status screens.
   - Persist granted location state in storage so once allowed, it never repeatedly asks or blocks the user.

2. **Fix Stuck "Payment Verification Pending" Flow (Downpayment to Final Payment)**:
   - In `PaymentStatusScreen.tsx`, `watchTransactionReturnVerification`, and `PaymentVerificationOverlay.tsx`:
     - When HitPay redirects with `status=completed` or query parameters matching transaction / payment request, perform active re-verification immediately and check both `paymentTransactions` and the target booking (`bookings`, `serviceRequests`, `orders`, etc.).
     - If HitPay indicates payment completed or query status confirms success, update client & Firestore state promptly and auto-navigate directly to Booking Confirmation / Details without lingering on the pending/waiting screen.
     - Add active automatic self-settlement when query parameters confirm `completed`/`paid`.

3. **Smooth Fullscreen Native Display for Payment (HitPay Checkout)**:
   - In `HitPayPaymentActivity.java` and `PaymentController.ts`:
     - Configure the window in `HitPayPaymentActivity` with immersive / full-screen flags (hiding navigation/system distraction if needed or expanding edge-to-edge).
     - Prioritize native `HitPayPaymentActivity` over external browser where supported so the payment gateway displays smoothly in full mobile view without a web browser URL bar or truncated frames.

---

## Step Breakdown
- [ ] **Step 1: Location Permission Loop Fix** (`utils/locationHelper.ts`, `App.tsx`):
  - In `isGeolocationPermissionDenied()` and `initPermissionMonitor()`, detect native platform and bypass browser geolocation permission query.
  - In `safeGetCurrentPosition()` and `safeWatchPosition()`, on native platform, do NOT fall through to `navigator.geolocation` if native geolocation is available or handles permissions.
  - In `App.tsx`, bypass location checks on `/payment/*` routes.
- [ ] **Step 2: Hardening Payment Verification & Completion Flow** (`utils/paymentReturn.ts`, `pages/PaymentStatusScreen.tsx`, `pages/BookingConfirmationScreen.tsx`):
  - On `/payment/return`, actively verify immediately with backend.
  - If payment status is `PAID` / `completed`, automatically advance to the primary entity screen (e.g. `/customer-portal/booking-detail/{id}` or `/customer-portal/booking-confirmation`) with a brief success confirmation banner instead of requiring the user to wait indefinitely or manually click "Done".
  - Ensure downpayment (`-DP`) and balance payments transition the booking status reliably to `Confirmed` / `Paid`.
- [ ] **Step 3: Fullscreen Native Payment Container** (`android/app/src/main/java/com/sasetin42/ridersbud/payment/HitPayPaymentActivity.java`, `services/payment/PaymentController.ts`):
  - Set modern Android edge-to-edge / full-screen window insets on `HitPayPaymentActivity` so the payment gateway fills 100% of the mobile screen cleanly.
  - Refine header to be sleek and compact, showing only essential SSL security and close button.
- [ ] **Step 4: Verification & APK Build**:
  - Run typecheck and unit tests (`npm run test`).
  - Build Android APK via release script.
