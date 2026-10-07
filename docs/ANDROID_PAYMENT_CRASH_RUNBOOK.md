# Android payment crash: diagnosis, confirmed root causes, and full-fix procedure

Build: **v1.1.5 (versionCode 16)** — every confirmed defect below is fixed in this build
(v1.1.4 fixed root causes 1–8; v1.1.5 adds the hardening in "v1.1.5 additions").

## v1.1.5 additions (this build)

- **Custom Tab auto-return wired.** `startPaymentWatcher` previously had zero call sites:
  if the native payment container failed to launch and the Chrome Custom Tab fallback was
  used, nothing ever closed the tab or brought the customer back. Now every `Browser.open`
  checkout path (`openPaymentUrl`, both `PaymentController` fallbacks) starts
  `watchPendingPaymentReturn()` — on server settlement the tab auto-closes and the app
  routes to the return route. On `/payment/return` the centralized status screen keeps
  ownership (no yank off the receipt).
- **Legacy redirect defaults fixed.** `HitPayService` fell back to `/customer-portal/`,
  which the App Links intent filter does not cover (pathPrefix `/payment/return`), so a
  gateway return there never opened the app. Fallbacks now target `/payment/return`.
- **Default payment method = HitPay redirect.** `ServicePaymentScreen` no longer starts
  with an empty selection (which disabled the pay button); it preselects the HitPay
  hosted-redirect option. Manual GCash stays opt-in.
- **Popup WebView leak fixed.** `onCreateWindow` popups were never destroyed — each leaked
  WebView keeps a renderer alive and adds to the memory pressure that kills the main
  renderer during payment. Popups are now tracked and destroyed in
  `destroyWebViewSafely()` (render-process death and `onDestroy`).
- **`android:largeHeap="true"`** — raises the app heap headroom at the exact moment two
  WebViews (bridge + payment) plus Firestore listeners coexist.
- **Stack traces symbolicated** — `-keepattributes SourceFile,LineNumberTable` enabled so
  any future native crash is readable from logcat / Play Console.
- **App Link verification re-checked for 1.1.5:** release-keystore SHA-256
  `88:D5:6B:98:2A:4E:33:ED:EB:6C:5D:0E:72:3B:A6:17:FF:56:FD:05:82:AC:A1:32:72:83:1E:0C:27:6B:A1:3C`
  matches `public/assetlinks.json`, and `https://ridersbud-10806.web.app/.well-known/assetlinks.json`
  serves it live (fetched OK).

## What was reported

- Android System notification: *"App Error — Detection showed that RidersBUD crashed for its own
  reasons"* — occurring while paying online / when proceeding to the Payment step.
- Payment Breakdown → **Proceed to Pay** flow must open the HitPay gateway and **return the user to
  the application** afterwards, with no error and no dead flow.

## Confirmed root causes (found by tracing the full checkout path)

### 1. Native process kill on WebView renderer death (the "App Error" crash)

`BridgeWebViewClient.onRenderProcessGone()` in Capacitor returns `false` unless a `WebViewListener`
claims the event, and a `false` return makes Android **kill the app process** — exactly the reported
crash notification. The renderer dies under memory pressure or its own crash, and the HitPay flow
opens a **second** WebView (`HitPayPaymentActivity`) on top of the bridge WebView while a Firestore
listener, maps and images are all alive. That is precisely the moment devices run out of memory, so
the kill happened "when paying online".

**Fix:** `MainActivity` now registers a `WebViewListener` whose `onRenderProcessGone()` returns
`true` (keeps the process alive), logs the event, and rebuilds the activity on the main loop. The
payment `rb_pending_payment_watch` marker in `localStorage` plus the resume hook in `App.tsx` restore
in-flight verification after the rebuild, so no payment state is lost.

### 2. Payment return events were silently dropped (the dead flow after paying)

`HitPayPaymentActivity` sent `PAYMENT_REDIRECT` / `PAYMENT_CLOSED` / `PAYMENT_ERROR` /
`PROVIDER_*` as **implicit** broadcasts (`new Intent(action)` with no package). The plugin registers
its receiver with `RECEIVER_NOT_EXPORTED` (API 33+, and this app targets SDK 36), and on Android 13+
a context-registered `RECEIVER_NOT_EXPORTED` receiver does **not** receive custom-action implicit
broadcasts — even from the same application (AOSP issue 293487554). The gateway redirect therefore
never reached JavaScript: the payment container finished and the customer was left staring at the
previous screen with no verification.

**Fix:** every payment broadcast now goes through `targetedBroadcast()` which calls
`intent.setPackage(getPackageName())`. This guarantees delivery to the in-app receiver and stops
other apps from spoofing payment events. `HitPayInAppPlugin.closePayment()` is package-targeted and
exception-guarded as well; receiver registration is wrapped so it can never throw.

### 3. `window.open()` checkouts stranded the customer

The hardened WebView enabled `setSupportMultipleWindows(true)` + `JavaScriptCanOpenWindowsAutomatically`
but never implemented `onCreateWindow`. HitPay's hosted checkout (and several 3-D Secure / e-wallet
handoffs) opens the next step with `window.open()`, which silently returned `null` — a frozen,
unclickable checkout.

**Fix:** `WebChromeClient.onCreateWindow` now captures the popup's first navigation and routes it
through the same policy engine (`routePopupNavigation`): loads are pulled into the primary WebView,
return/wallet/block decisions behave exactly like a top-level navigation.

### 4. Aborted navigations tore the checkout down mid-payment

`onReceivedError` treated **every** main-frame error as fatal and closed the container. WebView
reports aborted navigations (`net::ERR_ABORTED` → `ERROR_UNKNOWN`) during 3-D Secure hand-offs and
redirects to wallet apps, so the checkout could close while a payment was genuinely in progress.

**Fix:** only definite network failures (DNS, connect, IO, timeout, TLS, bad URL, redirect loop)
close the container. `ERROR_UNKNOWN` is logged and the checkout stays open.

### 5. Wallet launch exceptions could escape as fatal

`launchProviderApp()` only caught `URISyntaxException | ActivityNotFoundException`; a
`SecurityException` from `startActivity` (restricted/targeted intents, background-start rules) would
crash the activity. The exit dialog could also be built after `finish()` (`BadTokenException`).

**Fix:** the provider launch catches `Exception`, and the exit dialog is skipped when the activity is
finishing or destroyed. The `maya` wallet scheme and `intent://…scheme=maya` were also added
to the navigation policy so Maya hand-offs are not blocked.

### 6. React hook-order crash at the Payment Breakdown step (fixed in v1.1.3)

`BookingPaymentBreakdownModal` returned early before calling `useState`/`useEffect`. Opening the
modal changed hook order and could throw a React runtime error exactly at "Proceed to Pay". The hook
now runs unconditionally.

### 7. Stale Payment Breakdown sheet after redirect

`BookingScreen` returned as soon as checkout opened, leaving the modal mounted behind the native
container. When the customer came back from the gateway they met a stale **Proceed to Pay** sheet —
and tapping it again created a duplicate booking. The modal is now closed the moment the redirect
begins.

### 8. Return verification was not resumed after a process/renderer restart

`App.tsx` only resumed a pending payment when the current path matched the marker's route. After a
renderer recovery, process death, or cold App-Link start the bridge reloads at the app root, so the
gate rejected the resume and the customer got a silent screen.

**Fix:** app entry paths (`/`, `/customer-portal`) now also resume a live marker (< 30 min TTL), so
the customer always lands back on verification.

## Return flow (after these fixes)

```
PROCEED TO PAY
  → PaymentController.pay (checkoutMode 'dropin' = default HitPay hosted checkout + redirect_url)
  → HitPayInApp.openPayment → HitPayPaymentActivity (hardened WebView)
  → customer pays (GCash / Maya / QR Ph / card, incl. app-switch and 3-D Secure)
  → gateway redirects to https://ridersbud-10806.web.app/payment/return?s=…&tx=…&ref=…
  → PaymentNavigationPolicy.INTERCEPT_RETURN
  → package-targeted PAYMENT_REDIRECT broadcast  ──┐
  → activity finishes (app revealed)              ──┤
                                                    ├→ App.tsx processIncomingUrl
  (fallback) App Link / appUrlOpen / getLaunchUrl ──┤   → handlePaymentReturn (server re-verify)
  (fallback) Capacitor 'resume' + pending marker  ──┘   → /payment/return (PaymentStatusScreen)
                                                          → Firestore tx doc = PAID → success UI
```

No channel trusts a gateway `status` parameter; only the server-settled
`paymentTransactions/{id}` document can render success.

## Device verification procedure (release gate)

1. Install the candidate APK on the affected device; note model, Android version/API and app version.
2. Use **HitPay Sandbox** first. Never reproduce a crash with live money.
3. `adb logcat -c`, then capture:
   `adb logcat -v threadtime AndroidRuntime:E chromium:E Capacitor/Console:E RidersBUD:V RidersBUDPay:V '*:S'`
4. Reproduce once: booking → Payment Breakdown → select Option A/B → tap Proceed once. The checkout
   must open; no `FATAL EXCEPTION` may appear.
5. Complete or cancel the sandbox payment. Confirm the app returns to `/payment/return` and shows the
   verified result (use the in-screen sandbox simulator when webhooks are not delivered).
6. Repeat for: modal open/close/reopen; back/cancel; offline; wallet app-switch and return; HTTPS App
   Link return; force-stop then relaunch during a pending payment; successful settlement.
7. Repeat step 4 while watching memory (`adb shell dumpsys meminfo com.sasetin42.ridersbud`) — a
   renderer death must log `WebView render process gone … recovering instead of crashing the app`
   and rebuild, **not** kill the process.
8. Redact tokens, API keys, webhook salts, and customer data before sharing any log.

## Release gate

- `npm test`, `npm run typecheck`, `npm run build`.
- Android `testDebugUnitTest` (payment navigation policy suite) and `assembleRelease`.
- `node scripts/release-apk.mjs --skip-deploy` — verifies the APK signature and stages
  `public/releases/RidersBUD-v1.1.4.apk`, `public/releases/RidersBUD-latest.apk` and
  `playstore-release/apk/app-release.apk`.
- Confirm the signing fingerprint still matches `public/.well-known/assetlinks.json` (required for
  the HTTPS App Link return channel).
- Publish/announce only after the affected-device sandbox run above is clean.
