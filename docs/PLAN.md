# Implementation Plan: Native Android APK with Embedded HitPay Payment & True Edge-to-Edge Experience

## Objective
Convert RidersBUD into a 100% native-feeling Android application running edge-to-edge without any Chrome browser UI, incorporating a fully functional, embedded in-app HitPay payment checkout, and handling all Android system insets gracefully.

---

## Architecture & Requirements Analysis

### 1. True Edge-to-Edge Native Experience (No Chrome Browser UI)
- **Manifest & Styles:**
  - Android theme `AppTheme.NoActionBar` must enforce immersive edge-to-edge windowing.
  - Window flags `android:windowLayoutInDisplayCutoutMode="shortEdges"` and `android:windowTranslucentNavigation="false"` with full transparent system bars.
  - Webview must render behind status bar and navigation bar with zero Chrome address bar, toolbar, or navigation controls.
- **System Inset Management:**
  - Standardize CSS variables `--safe-top` and `--safe-bottom` using Capacitor SystemBars plugin and `env(safe-area-inset-*)`.
  - Prevent duplicate insets on header and footer components.

### 2. Fully Embedded HitPay Payment (Zero External Chrome Popups)
- **Problem Statement:** Standard web checkouts trigger external Chrome tabs or intent redirects that break app continuity or crash the app process.
- **Native Embedded Solution:**
  - HitPay Drop-in / Embedded SDK integrated into an in-app native modal sheet or dedicated seamless payment screen (`HitPayCheckoutScreen.tsx` / `PaymentScreen.tsx`).
  - Listen to window `message` events for payment completion, cancellation, and errors without leaving the app.
  - Implement fallback handling for GCash / Maya deep-links (e.g., using Android Intent URL capture inside WebView while preventing app closure).
  - Centralized verification via server proxy (`PaymentVerificationOverlay` / `verifyPaymentStatus`).

### 3. Back Button & State Preservation
- Android hardware back button listener intercepted during active payment sessions to display confirmation before navigating back.
- Clean cleanup of iframe / modal listeners to prevent memory leaks and zombie processes.

---

## 3-Phase Execution Plan

### Phase 1: Native Shell & Edge-to-Edge Configuration (`mobile-developer`)
- Review and refine `android/app/src/main/res/values/styles.xml` and `AndroidManifest.xml` for transparent edge-to-edge support.
- Ensure `capacitor.config.json` has `SystemBars` properly configured for dark, immersive styling.
- Verify `index.html` and `index.css` safe area insets.

### Phase 2: Embedded HitPay Payment Overhaul (`frontend-specialist` + `backend-specialist`)
- Deeply inspect `HitPayCheckoutScreen.tsx`, `components/GCashPaymentModal.tsx`, and `services/hitpayClient.ts`.
- Ensure HitPay drop-in iframe or redirect URL runs within the app frame.
- Guarantee that post-payment redirects (`/payment/return`, `/booking-confirmation`, `/order-confirmation`) resolve inside the app without triggering external browser intents.

### Phase 3: Verification & APK Generation (`test-engineer`)
- Run test suite: `vitest run` (ensure all 98+ tests pass).
- Compile web assets: `npm run build`.
- Sync Capacitor Android: `npx cap sync android`.
- Build and sign production release APK: `node scripts/release-apk.mjs --skip-deploy`.
- Verify signature and APK package integrity.

---

## Approval Checkpoint
Waiting for user confirmation to proceed to Phase 2 (Implementation).
