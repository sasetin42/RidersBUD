# Implementation Plan: In-App Embedded HitPay Payment Integration for Android & Web

## Goal
Replace the external browser (`Browser.open()`) payment redirect path in the RidersBUD Android APK with the officially supported HitPay Drop-In / Embedded payment integration. Customers remain directly inside the RidersBUD Android application while completing GCash, QR Ph, Card, or Maya payments, with authoritative server-side session creation and webhook-driven Firestore verification.

---

## Technical Architecture & Design

### 1. Official HitPay Drop-In UI Integration
- HitPay officially supports in-app embedded checkout using `hitpay.js`:
  - Sandbox: `https://sandbox.hit-pay.com/hitpay.js`
  - Production: `https://hit-pay.com/hitpay.js`
- Integration mechanism:
  - Backend creates payment request via `/api/hitpay-proxy` and returns `id` (Payment Request ID) and `url`.
  - Frontend loads `hitpay.js` dynamically (or preloaded in `index.html`).
  - Calls `window.HitPay.init(checkoutUrl, { closeOnError: true }, { onClose, onSuccess, onError })`.
  - Calls `window.HitPay.toggle({ paymentRequest: paymentRequestId })`.
  - When payment finishes, `onSuccess` triggers in-app verification, closes the Drop-In modal, and displays a celebration modal without ever switching out to Chrome!
- Deep-link / 3D Secure / App Switch Fallback:
  - If a banking institution requires an app-switch (e.g. Maya or bank app) or if `hitpay.js` cannot render on an older device, a controlled in-app sheet (`HitPayInAppModal`) is seamlessly presented without abandoning the user session.

### 2. Unified Payment Controller (`services/PaymentCoordinator.ts`)
- Unify payment session creation across all entry points:
  1. Service Booking Downpayment (`BookingScreen.tsx`)
  2. Service Balance Settlement (`ServicePaymentScreen.tsx` & `HomeScreen.tsx`)
  3. Parts Store Checkout (`PaymentScreen.tsx`)
  4. Car Rental Reservation (`RentCarScreen.tsx`)
  5. Driver for Hire Booking (`DriverBookingFlow.tsx`)
  6. LTO Liaison Booking (`LiaisonBookingFlow.tsx`)
- All entry points route through the unified coordinator instead of duplicating `HitPayService.createPaymentRequest` + `openPaymentUrl`.

### 3. Server-Side Security & Authoritative Verification (`functions/index.js`)
- HitPay API Keys and Salt remain strictly in Firestore `settings/main` / Cloud Functions secrets.
- Client never passes API keys or computes HMAC.
- Server validates amount against the database booking/order record to prevent client-side amount tampering.
- Idempotency enforced in `paymentWebhookLogs` preventing duplicate payment processing.
- Order / Booking status only marked `paid` / `isVerified: true` by the authoritative webhook.

### 4. Firestore Collections Mapping
- Update `PaymentEntityKind` in `utils/firestoreCollections.ts` to include `'order'` for Parts Store purchases.

---

## Step-by-Step Tasks

- [ ] Task 1: Add HitPay official Drop-In SDK scripts and preconnects to `index.html` and update CSP.
- [ ] Task 2: Update `utils/firestoreCollections.ts` to support `'order'` entity kind.
- [ ] Task 3: Create `services/HitPayEmbeddedService.ts` implementing `window.HitPay.init` & `toggle` with reactive promise lifecycle, state machine (PENDING, PROCESSING, PAID, FAILED, CANCELLED, EXPIRED), and timeout management.
- [ ] Task 4: Enhance `functions/index.js` to ensure orders and bookings validate against duplicate processing and support Drop-In return callbacks.
- [ ] Task 5: Refactor `BookingScreen.tsx`, `ServicePaymentScreen.tsx`, `PaymentScreen.tsx`, `RentCarScreen.tsx`, `DriverBookingFlow.tsx`, and `LiaisonBookingFlow.tsx` to use the in-app embedded HitPay controller instead of `openPaymentUrl(url)`.
- [ ] Task 6: Type-check with `npx tsc --noEmit` and build web bundle with `npm run build`.
- [ ] Task 7: Synchronize Capacitor Android (`npx cap sync android`) and build verified signed release APK.

---

## Verification Criteria
1. When user taps "Pay Now", no external Chrome browser window is launched.
2. The official HitPay embedded overlay opens seamlessly inside the RidersBUD app.
3. User can select GCash / QR Ph / Cards / Maya directly inside the overlay.
4. Completing payment triggers `onSuccess` callback, autoruns Firestore verification, and displays the success screen inside RidersBUD.
5. Cancelling the payment closes the modal gracefully and returns user to the booking screen.
6. Cloud Function webhook idempotently logs the payment and updates Firestore.
