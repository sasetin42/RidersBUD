# Orchestration Plan: Fix Android Payment Closing / Crashing Bug

## 1. Root Cause Analysis
- **Problem**: When contacting the payment server ("Contacting payment server..."), or immediately after HitPay returns the `checkoutUrl`, the Android APK closes or crashes, leaving the payment incomplete and forcing the user to relaunch the app.
- **Root Causes**:
  1. **Dual-WebView Renderer Memory Pressure**: `PaymentController.ts` invoked `HitPayInApp.openPayment(...)`, launching a second native `WebView` (`HitPayPaymentActivity`). On Android devices, running two separate Chromium WebView engines in the same process causes renderer memory spikes.
  2. **RenderProcessGone Recreation Trap**: In `MainActivity.java`, `onRenderProcessGone()` immediately calls `recreate()`. When the secondary payment WebView triggers renderer thrashing, `MainActivity` receives `onRenderProcessGone` and rebuilds the whole Activity, causing the app to vanish or reset to the home screen.
  3. **Multi-Window Leaks & Intent Stack Conflicts**: `HitPayPaymentActivity` created multiple unmanaged popup WebViews during 3DS redirects, compounding memory leaks, and used `FLAG_ACTIVITY_NEW_TASK` without task separation from `MainActivity` (`launchMode="singleTask"`).

## 2. Solution Strategy
- **Switch Native Checkout to Chrome Custom Tabs (`@capacitor/browser`)**:
  - In `services/payment/PaymentController.ts`, directly use `@capacitor/browser` (`Browser.open({ url: checkoutUrl, toolbarColor: '#FE7803' })`) with `watchPendingPaymentReturn()`.
  - Chrome Custom Tabs run out-of-process in Chrome's dedicated sandbox with zero memory footprint on the app, full hardware acceleration, and native support for GCash / Maya app switches.
- **Harden Native `MainActivity` and `HitPayPaymentActivity`**:
  - Keep `HitPayInAppPlugin` and `HitPayPaymentActivity` hardened with `FLAG_ACTIVITY_SINGLE_TOP` and graceful degradation.
  - In `MainActivity.java`, track active payments so `recreate()` is delayed or prevented from killing active payment flows.
- **Build, Sync, and Verify**:
  - Run `npm run build` and `npx cap sync android`.
  - Compile the release APK with `node scripts/release-apk.mjs --skip-deploy`.
