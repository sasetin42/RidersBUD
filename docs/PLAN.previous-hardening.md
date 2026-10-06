# Implementation Plan & Architectural Spec: Hardened HitPay Mobile Payments (Android & iOS)

## 1. Executive Summary & Goals
Completely harden HitPay online payment processing for RidersBUD across Android APK and iOS. Eliminate browser drop-offs, payment loops, iframe framing failures, unverified client redirects, and duplicate payment initialization. Ensure HitPay webhook and server-side verification are the authoritative proof of payment.

---

## 2. Technical Architecture & Payment Flow

```
RidersBUD App (Android / iOS / Web)
   │
   ├─► 1. Pre-Payment Intent / Lock
   │      - Generate stable idempotency key (BOK-, RNT-, LIA-, TOW-, DRV-, ORD-)
   │      - Write/reuse paymentTransactions/{transactionId} with status = INITIATED
   │
   ├─► 2. Backend Cloud Function Proxy (/api/hitpay-proxy)
   │      - Validates price against authoritative Firestore record
   │      - Securely injects server-side API keys and webhook/return URLs
   │      - Reuses active pending session if already created
   │      - Advances paymentTransactions/{transactionId} to PENDING
   │
   ├─► 3. Secure Native Browser Presentation
   │      - @capacitor/browser (Chrome Custom Tabs on Android / SFSafariViewController on iOS)
   │      - Never uncontrolled iframe, never bare window.location.href on native
   │      - Preserves 3-D Secure, GCash/Maya native app switching
   │
   ├─► 4. Customer Completes / Cancels Payment
   │      - HitPay webhook dispatches to /api/hitpay-webhook
   │      - Cloud Function validates HMAC-SHA256 signature (v2 / legacy)
   │      - Direct HitPay API re-verification before ANY state flip
   │      - Atomic Firestore transaction: paymentTransactions status = PAID
   │      - Idempotent entity update (isPaid, remainingBalance = 0, paymentStatus = "paid")
   │
   └─► 5. Mobile Native Return / App Resume
          - Native URL Scheme: ridersbud://payment/return?tx=...&ref=...
          - HTTPS App Link / Universal Link: https://ridersbud-10806.web.app/payment/return
          - App URL listener in App.tsx / handlePaymentReturn()
          - PaymentStatusScreen / PaymentVerificationOverlay queries server-settled state
          - Clean dismissal of browser tab & clearance of pending local markers
          - Navigation to verified booking/order confirmation
```

---

## 3. Platform Configurations

### Android Native (`android/app/src/main/AndroidManifest.xml`)
- Activity launchMode: `singleTask`
- Intent Filters:
  - Custom scheme: `ridersbud://` and `com.sasetin42.ridersbud://`
  - Explicit path filter: `ridersbud://payment/return` (VIEW, DEFAULT, BROWSABLE)
  - Verified App Links: `https://ridersbud-10806.web.app` (`autoVerify="true"`)
- Package visibility `<queries>` configured for `com.globe.gcash.android`, `com.paymaya`, `com.grabtaxi.passenger`, and `https`/`gcash`/`paymaya` intents.
- Native Activity (`MainActivity.java`) handles `onNewIntent` to pass warm-start VIEW intents into Capacitor bridge.

### iOS Native (`ios/App/App/`)
- Custom URL Schemes in `Info.plist`: `ridersbud`, `com.sasetin42.ridersbud`
- Universal Links in `RidersBUD.entitlements`:
  - `applinks:ridersbud-10806.web.app`
  - `applinks:ridersbud-10806.firebaseapp.com`
- Apple App Site Association (`public/.well-known/apple-app-site-association`) hosted with `application/json` headers via `firebase.json`.
- `AppDelegate.swift` forwards `application(_:open:options:)` and `application(_:continue:restorationHandler:)` to `ApplicationDelegateProxy`.

---

## 4. Backend & Security Specification (`functions/`)
- Zero credentials on client: HitPay API keys and Webhook Salt are kept server-side in `functions/.env` and admin-restricted Firestore `settings/hitpaySecrets`.
- Webhook signature verification (`functions/lib/hitpay.js`):
  - Validates `Hitpay-Signature` (HMAC-SHA256 hex of raw body)
  - Fallback legacy `hmac` dictionary validation
  - Dual environment salt checking (sandbox vs production)
- Verification endpoint: `/api/hitpay-proxy?action=verify&id=<tx>&ref=<ref>&sandbox=true`
  - Calls official HitPay API `GET /v1/payment-requests/{id}`
  - Confirms status == `completed` and verifies amount, currency, and reference match
  - Runs inside Firestore transaction with atomic lock
- Single settlement logic for all business entities:
  - `bookings`: updates `paidAmount`, `remainingBalance = 0`, `isPaid = true`, `paymentStatus = "paid"`
  - `rentalBookings`: updates `paidAmount`, `remainingBalance = 0`, `isPaid = true`
  - `liaisonBookings`: updates `paidAmount`, `isPaid = true`
  - `serviceRequests`: updates `paidAmount`, `isPaid = true`
  - `orders`: transitions `paymentStatus = "paid"`, `isPaid = true`, advances status `Pending` -> `Processing`

---

## 5. Mobile Return & State Management
- `utils/paymentReturn.ts`: centralized `handlePaymentReturn()` router
- `pages/PaymentStatusScreen.tsx`: dedicated status UI rendering states:
  - Initializing Payment
  - Connecting to HitPay
  - Waiting for Payment
  - Verifying Payment
  - Payment Successful (with verified reference, amount, method, date)
  - Payment Failed / Cancelled / Expired
  - Payment Verification Pending (polling with exponential backoff)
- `components/PaymentVerificationOverlay.tsx`: in-app floating overlay when app resumes from background or payment completes while user remains in-app.
- Session lock & deduplication: clears local pending marker upon terminal status, preventing payment modal loops.

---

## 6. Verification & Automated Test Status
- `npm run typecheck`: **0 errors (PASS)**
- `npm run build`: **Vite build succeeded (PASS)**
- `npx cap sync android`: **Synced successfully (PASS)**
- `npx cap sync ios`: **Synced successfully (PASS)**
- `scripts/e2e-hitpay.cjs` suite: **10/10 test assertions passed against deployed Cloud Functions:**
  1. Create/reuse returns ONE session for the same reference
  2. paymentTransactions record created with standardized fields
  3. Transaction carries sandbox environment
  4. Server verify: pending gateway stays un-paid
  5. Webhook with invalid signature rejected with 401
  6. Webhook without signature rejected
  7. Validly-signed webhook accepted (200)
  8. Signed "completed" webhook does NOT mark PAID when gateway says pending
  9. Duplicate webhook idempotent (200, still not PAID)
  10. Transaction still PENDING (no false PAID anywhere)
