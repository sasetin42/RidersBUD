# RIDERSBUD — Complete HitPay Native In-App Payment Architecture

## Executive Summary
A complete architectural overhaul of HitPay payment processing was implemented across RidersBUD's Android APK, iOS configuration, frontend application, and Firebase Cloud Functions.

All root causes of the browser loop, duplicate checkout creation, forged status tampering, and untrusted client-side amount manipulation were systematically eliminated and replaced with an authoritative in-app architecture.

---

## Architecture Comparison

### Previous Vulnerable Architecture
```
RidersBUD Screen (Mount Effect)
      ↓ (Auto-created HitPay request with unverified amount)
HitPay Hosted Checkout URL
      ↓
Browser.open() / Android Custom Tab
      ↓
Hosted Checkout Page
      ↓
Provider Redirect / Deep Link
      ↓
Live Web App inside Browser Tab (Loop!)
      ↓ (Forged ?status= URLs allowed client order cancellation/completion)
```

### New Hardened In-App Architecture
```
RidersBUD User Action ("Pay Now")
      ↓
PaymentController (Deduplication Lock)
      ↓ (Firebase ID Token Authentication)
Cloud Function (hitpayProxy)
      ↓ (Authoritative Server-side Price Lookup & Verification)
HitPay REST API (Server-to-Server)
      ↓
paymentTransactions/{tx} = CHECKOUT_OPEN
      ↓
HitPayInApp Native Container (Android Activity / iOS Controller)
  ├── QR Ph: Rendered natively via NativeQrPayment (EMVCo payload)
  ├── Cards: Hardened WebView with TLS, DOM storage, & 3DS authorization
  └── Wallets (GCash/Maya): Direct App Intent (No Chrome!)
      ↓
Payment Confirmation
  ├── Webhook: HMAC-SHA256(rawBody, salt) [Authoritative Proof]
  ├── Idempotent Event Log: paymentWebhookEvents/{sha256}
  └── Firestore Settle: paymentTransactions/{tx} -> PAID
      ↓
onSnapshot Listener detects PAID
      ↓
Payment Container Automatically Closes
      ↓
✓ Payment Successful Screen & Routing
```

---

## Detailed Implementation Summary

### 1. Android Native Container (`HitPayInApp` Plugin)
- **Plugin Implementation:** `android/app/src/main/java/com/sasetin42/ridersbud/payment/HitPayInAppPlugin.java`
- **Native Activity:** `android/app/src/main/java/com/sasetin42/ridersbud/payment/HitPayPaymentActivity.java`
- **Navigation Policy:** `android/app/src/main/java/com/sasetin42/ridersbud/payment/PaymentNavigationPolicy.java`
- **Security Features:**
  - Modern TLS with strict SSL error cancellation (`onReceivedSslError -> cancel`).
  - File access and content access disabled (`setAllowFileAccess(false)`).
  - No vulnerable JavaScript bridges injected.
  - Strict domain allowlist (`*.hit-pay.com`, `*.sandbox.hit-pay.com`, `ridersbud-10806.web.app`).
  - Provider app intent handling (`gcash://`, `paymaya://`, `intent://`) launches native wallet apps directly without launching Chrome.
  - Intercepts return routes (`/payment/return`) and fires `paymentRedirect` events to close the container immediately.
  - Android Back button intercepts with a "Leave Payment?" confirmation modal preventing accidental session loss.

### 2. App Links & Intent Configuration
- **`AndroidManifest.xml`:**
  - Scoped `autoVerify="true"` App Link intent filter strictly to `android:pathPrefix="/payment/return"`, ending intent hijacking across regular app routes.
  - Maintained `ridersbud://payment/return` as native fallback.
  - Added package queries for `com.globe.gcash.android`, `com.paymaya`, and `com.grabtaxi.passenger`.
- **`assetlinks.json`:**
  - Added release keystore SHA-256 fingerprint: `88:D5:6B:98:2A:4E:33:ED:EB:6C:5D:0E:72:3B:A6:17:FF:56:FD:05:82:AC:A1:32:72:83:1E:0C:27:6B:A1:3C`.
  - Configured `firebase.json` ignore rules (`!**/.well-known/**`) to ensure proper deployment.

### 3. Backend & Cloud Functions Hardening
- **`functions/lib/hitpay.js` & `functions/index.js`:**
  - **Firebase ID Token Authentication:** Required on all `hitpayProxy` endpoints. Validates caller ownership against requested entities.
  - **Authoritative Price Calculation:** Server calculates exact downpayment or remaining balance for bookings, rentalBookings, liaisonBookings, serviceRequests, and orders.
  - **Amount Tampering Rejection:** If client amount differs by > 0.01 tolerance, immediately rejects with `400 { error: 'PAYMENT_AMOUNT_MISMATCH' }`.
  - **Session Deduplication:** Resumes in-flight sessions in `CREATED`, `INITIALIZING`, `CHECKOUT_OPEN`, `WAITING_FOR_PAYMENT`, or `VERIFYING` states. Returns `alreadyPaid` for settled transactions.
  - **Signature Verification:** Validates `Hitpay-Signature` over raw request buffer (`req.rawBody`) using HMAC-SHA256 and timing-safe equality.
  - **Webhook Idempotency:** Prevents duplicate settlements using `paymentWebhookEvents/{sha256(rawBody)}` and transaction state tracking.
  - **Callable `markOfflinePayment`:** Secure endpoint for admin and mechanic offline cash settlement.
- **`firestore.rules`:**
  - Denies client modification of payment settlement fields (`cannotTamperPaymentFields()`).
  - Restricts read access to `paymentTransactions` exclusively to document owners and admins.

### 4. Frontend State Machine & Unified Controller
- **`services/payment/paymentStateMachine.ts`:**
  - Explicit state transitions: `CREATED -> INITIALIZING -> CHECKOUT_OPEN -> WAITING_FOR_PAYMENT -> VERIFYING -> PAID / FAILED / CANCELLED / EXPIRED / PENDING`.
  - `PAID` is an absorbing terminal state that cannot be transitioned out of.
- **`services/payment/PaymentController.ts`:**
  - Single orchestrator for checkout initiation, active session caching, and Firestore `paymentTransactions` real-time synchronization.
  - 5-minute verification timeout with fallback `PENDING` state and automated background monitoring.
- **`services/payment/PaymentReturnCoordinator.ts`:**
  - Single return parser for App Links and native deep links.
  - Architecture guarantee: Strictly performs verification only. Never calls `createPaymentRequest` or `Browser.open`.
- **`components/payment/SecurePaymentSheet.tsx` & `NativeQrPayment.tsx`:**
  - RidersBUD `#FE7803` branded payment sheet.
  - Native EMVCo QR Ph rendering with countdown timer and photo saving.
- **Entry Points Cleaned:**
  - Removed mount effects auto-creating checkouts in `ServicePaymentScreen.tsx`, `BookingScreen.tsx`, and `BookingDetailScreen.tsx`.
  - Removed unverified `?status=` URL effects that cancelled orders in `PaymentScreen.tsx` and `BookingScreen.tsx`.
  - Eliminated client writes of premature `paidAmount` in `ServiceBookingFlow.tsx`, `LiaisonBookingFlow.tsx`, and `RentCarScreen.tsx`.

---

## Automated Test Results

### 1. Frontend Test Suite (`npm test`)
```
✓ test/paymentStateMachine.test.ts (8 tests)
  ✓ valid state lifecycle transitions
  ✓ enforces PAID as an absorbing terminal state
  ✓ throws on invalid transition attempts
  ✓ allows PENDING to resolve to PAID
  ✓ late webhook success overrides local CANCELLED state
  ✓ correctly parses valid App Link and native deep link return URLs
  ✓ rejects non-return deep links
  ✓ PaymentReturnCoordinator never imports or invokes createPaymentRequest or Browser.open
Tests: 8 passed (8)
```

### 2. Backend Functions Test Suite (`npm --prefix functions test`)
```
✔ calculateAuthoritativeAmount - Bookings downpayment and balance
✔ calculateAuthoritativeAmount - Rental bookings 50% deposit and remaining balance
✔ calculateAuthoritativeAmount - Liaison bookings downpayment calculation
✔ calculateAuthoritativeAmount - ServiceRequests (Driver & Towing) downpayment vs full
✔ calculateAuthoritativeAmount - Orders require full payment
✔ Webhook signature verification - Raw body HMAC-SHA256 (v2)
✔ Webhook signature verification - Legacy HMAC
✔ computeEntityPaymentUpdate - Idempotency and status advancement
✔ parseReferenceEntity - parses prefixes properly
Tests: 9 passed (9)
```

### 3. Type Safety & Unified Linting
- `npm run typecheck` (`tsc --noEmit`): **Passed (0 errors)**
- `python .agent/skills/lint-and-validate/scripts/lint_runner.py`: **Passed**
- `npx cap sync android`: **Passed (web assets synced to native assets)**

---

## Release APK Verification

- **Gradle Build Task:** `assembleRelease`
- **Output APK:** `android/app/build/outputs/apk/release/app-release.apk`
- **File Size:** 23.3 MB
- **Signature Verification:**
  - Signer DN: `CN=RidersBUD, OU=Development, O=Sasetin42, L=Manila, ST=Metro Manila, C=PH`
  - SHA-256 Digest: `88:D5:6B:98:2A:4E:33:ED:EB:6C:5D:0E:72:3B:A6:17:FF:56:FD:05:82:AC:A1:32:72:83:1E:0C:27:6B:A1:3C`
  - Signature Scheme v2/v3: **Verified Valid**
- **DEX Inspection:**
  - R8 shrank and retained `HitPayInAppPlugin`, `HitPayPaymentActivity`, and `PaymentNavigationPolicy`.
- **Staged Artifacts:**
  - `dist/releases/RidersBUD-latest.apk`
  - `public/releases/RidersBUD-latest.apk`
  - `playstore-release/apk/app-release.apk`

---

## Round N — "Stuck on Verifying Payment" + Header scroll fix (2026-10-05)

### Root causes found (from live function logs + a direct HitPay API probe)

1. **`amount mismatch: gateway=NaN expected=1750` — every completed payment blocked.**
   HitPay returns amounts as comma-formatted strings (`"amount":"1,750.00"`).
   `Number("1,750.00")` is `NaN`, so `settleTransaction` mislabelled every
   completed payment as `AMOUNT_MISMATCH` → `PENDING_REVIEW` instead of `PAID`.
   Customers stayed on "Verifying Payment" and a new admin notification was
   created **per poll**. Confirmed by fetching the real payment request from the
   HitPay sandbox API.
2. **Client verify timer chain died silently.** The watcher pre-registered 8
   one-shot timers from page load; mobile WebViews freeze/reset timers when the
   app is backgrounded (customer switching to HitPay/GCash to pay). Logs showed
   exactly ~4 verify calls per attempt then permanent silence — no PENDING
   transition, no further polling.
3. **`auth?.currentUser?.getIdToken().catch(...)` TypeError when auth had not
   restored yet** — verify requests died client-side with no server log.
4. **Webhook signature 401s** when the transaction's recorded environment
   disagreed with where the payment actually happened (only that env's salts
   were tried).
5. **React StrictMode + `startedRef` guard** could leave the status screen with
   no watcher at all (dev), and the resume overlay could double-watch the same
   payment.

### Fixes

- `functions/lib/hitpay.js`
  - `parseGatewayAmount()` — comma/string/multi-source tolerant; regression test added.
  - Unreadable gateway amount → retryable `GATEWAY_UNAVAILABLE` +
    `GATEWAY_AMOUNT_UNREADABLE` diagnostic (never `PENDING_REVIEW`).
  - `GATEWAY_PENDING` now returned explicitly (`verificationStatus` +
    `gatewayStatus`) so the client can render honest copy.
  - Mismatch admin notifications deduped per transaction
    (`PAYMENT_MISMATCH_{txId}` + `timesBlocked` increment).
  - Webhook retro-create amount parsed defensively (no NaN in stored tx).
- `functions/index.js` — webhook validates against recorded-env salts **first,
  then all configured salts** (kills cross-env 401s); failure log now includes
  header/salt diagnostics.
- `utils/paymentReturn.ts` — watcher rebuilt: self-rescheduling verify loop
  (backoff → 20s steady, 45s after PENDING; never a dead gap), PENDING
  announced 90s after start (measured from original start, re-armed on every
  `visibilitychange`/`pageshow` with an immediate verify), honest messages for
  `GATEWAY_PENDING` / `GATEWAY_UNAVAILABLE` / `fallbackToPortal` /
  `gateway_amount_unreadable`, and the auth-token TypeError fixed.
- `pages/PaymentStatusScreen.tsx` — 90s timeout; StrictMode-safe effect
  (resets `startedRef` on cleanup).
- `components/PaymentVerificationOverlay.tsx` — 90s timeout.
- `App.tsx` — resume overlay cleared when `/payment/return` opens (single owner
  of verification).
- `components/CustomerHeader.tsx` + `components/Header.tsx` — hide-on-scroll was
  **inverted** (`'up'`): the header vanished on every upward swipe. Now `'down'`,
  exactly matching `BottomNav`.

### Verification
- Client: `npm test` 29/29, `npm run typecheck`, `npm run build` ✅
- Functions: `npm test` 22/22 (incl. new parseGatewayAmount test), `node --check` ✅
- Deployed `functions,hosting`; live checks: `/payment/return` 200, new bundle
  serves the new watcher copy, `action=verify` returns settled results,
  webhook GET → 405, proxy param validation → 400.

### Follow-up round — E2E proof + admin stuck view (2026-10-06)

**Sandbox end-to-end settlement (gateway=NaN fix confirmed in production):**
- `tx_BOK-busFvky7mGsTIZL1x4Sg-DP` — was `PENDING_REVIEW/AMOUNT_MISMATCH`,
  verify → **`{status:"PAID", verificationStatus:"VERIFIED", changed:true}`**.
- `tx_BOK-RCQY35GE-DP-9197` — was `PENDING_REVIEW/AMOUNT_MISMATCH`,
  verify → **PAID (changed:true)**; settlement logged
  `entity bookings/afdEFS8B5WbpRCQY35Ge not found` (test booking deleted — no
  entity to update, correct behavior).
- `tx_BOK-NhSWkSCsL0p9yTU5Zw1T-DP` — was `PENDING/AMOUNT_MISMATCH`,
  verify → **PAID (changed:true)**.
- Signed `completed` webhook replay for the comma-amount payment
  (`amount:"1,750.00"`) → `200 {status:"PAID", alreadySettled:true}`.
- `GATEWAY_PENDING` contract live: pending fixture verify returns
  `{status:"PENDING", verificationStatus:"GATEWAY_PENDING", gatewayStatus:"pending", reason:"gateway_status_pending"}`.

**E2E harness rewritten** (`scripts/e2e-hitpay.cjs`) — the old version encoded a
stale contract (entity-less create, `PENDING/INITIATED` statuses, 200 for a
signed-but-pending webhook). New coverage: `ENTITY_REQUIRED`/`ENTITY_NOT_FOUND`
security, GATEWAY_PENDING verify, 401 signature enforcement, 503+`retry:true`
webhook retry contract, no-false-PAID regression, and the two comma-amount PAID
settlement checks. **13/13 passing** (`node scripts/e2e-hitpay.cjs`).
Optional full create/reuse coverage via `E2E_ENTITY_KIND` + `E2E_ENTITY_ID`
(+ `E2E_ENTITY_EMAIL` for guest sessions) when a Firestore entity exists.

**Admin Payment Monitor — stuck view with reasons:**
- Attention rows now show the `lastVerificationStatus` chip + `lastVerificationReason`
  inline (no expanding needed); `NEVER_VERIFIED` when no attempt is recorded.
- Stuck filter sorts oldest-untouched first; an intro banner explains the view.
- Deployed hosting; live bundle `AdminPaymentMonitorScreen-BiKkGhS1.js` verified.

### Follow-up round 2 — dashboard stuck card, PENDING_REVIEW sweep, E2E seeding (2026-10-06)

**Admin dashboard — Stuck Transactions card:**
- New card under the Payment Monitor board in `AdminDashboardScreen` (orange,
  live `counts.stuck`, "No movement 10+ min" pulse badge) that deep-links to
  `/admin-portal/payment-monitor?filter=stuck`.
- The monitor now honors `?filter=<key>` (applied once on mount; manual chip
  selection always wins). Deployed; live chunks verified.

**PENDING_REVIEW sweep (all mismatch-blocked transactions):**
- Enumerated every `Settlement blocked [...]` tx from the full function-log
  history: 18 unique transactions (129 `amount mismatch` log lines — all the
  `gateway=NaN` bug).
- 6 were already PAID (prior round / sandbox simulation); the remaining **12
  were re-verified and ALL settled to `PAID` (`changed=true`)**:
  6YDG6NWU, BJ0E0nHhYQ9lS5Cy6HdN, K6KWZOCN, Q7AGLWYW, SAVQW3FP, SMQPPUAC,
  SVRXRXVR, TO4WTUJP, deRRTev0sC6d87GMkk6P, gxCfxgfx36ycYnP5EHeD,
  xWXg0gRxi6ChilVm09jQ, yOTc5BOv2zBu2ARQaiNP.
- `entityUpdated=false` on these is correct: booking docs had been deleted
  (logged `entity bookings/... not found`) or the legacy tx records carried no
  entity linkage. No PENDING_REVIEW/AMOUNT_MISMATCH transaction remains in the
  log history. Caveat: enumeration covers the retained log window — an admin
  with a portal session can cross-check the monitor's "Mismatched" filter.

**E2E seeding (`scripts/seed-e2e-booking.cjs`):**
- Provisions a throwaway customer via Identity Toolkit (public web API key,
  signUp first run / signInWithPassword later) and creates a fresh
  `bookings/e2e-*` doc through the **Firestore REST API as that customer** —
  satisfies `firestore.rules` (`customerId == request.auth.uid`, unpaid
  payment fields). No admin privileges, no service account, no rules changes.
- Seeded values: totalAmount 1000 / downpaymentAmount 500 / paidAmount 0 →
  authoritative downpayment checkout = 500 PHP.
- `scripts/e2e-hitpay.cjs` now runs a **full create → checkout → settle cycle
  on a fresh seed every run**: session create (amount 500) → idempotent reuse →
  lifecycle/entity fields → gateway-pending verify (`GATEWAY_PENDING`, not
  PAID) → sandbox settle (`simulate-sandbox` → PAID + entity update) → verify
  idempotent PAID → owner-read of the booking asserting `paidAmount=500,
  paymentStatus=partial`.
- Harness result: **21/21 passing** (fixed an assertion that read only
  `doubleValue` — Firestore REST returns `integerValue` for whole numbers).
