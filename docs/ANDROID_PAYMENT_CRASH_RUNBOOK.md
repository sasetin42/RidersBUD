# Android payment crash: diagnosis and recovery runbook

## What was inspected

The Android checkout path was traced from the Booking Payment Breakdown modal through `BookingScreen`, `HitPayEmbeddedService`, `PaymentController`, `HitPayInAppPlugin`, `HitPayPaymentActivity`, and the return/deep-link handlers. No Android device or emulator was attached during this investigation, and the workspace contains no matching crash report/logcat. Therefore the Android System crash notification cannot yet be tied to a specific native fatal exception. Do not describe the root cause as conclusively confirmed until logcat from the affected device is captured.

## Confirmed application defect fixed

`BookingPaymentBreakdownModal` returned early while closed and only then called `useState`. The component remains mounted while the parent changes `isOpen`, so opening it changed the number/order of React hooks and could throw React's hook-order runtime error exactly as the customer enters the payment step. The hook now runs unconditionally and the selected option is synchronized when the modal opens/reopens.

## Checkout hardening applied

- Native checkout launch exceptions are caught. The app attempts the secure Capacitor Browser checkout as a fallback; if that also fails, payment initiation returns a visible failure rather than claiming checkout opened.
- Initial checkout URLs must use HTTPS and a HitPay domain; unsafe/malformed URLs are rejected before a WebView is launched.
- The native plugin catches `startActivity` failures and rejects the plugin call instead of letting an Android launch exception escape.
- WebView main-frame network failures and renderer process death now close the payment activity through a recoverable payment-error path. No redirect or success is inferred from those errors.
- State-machine callbacks ignore stale/out-of-order Firestore state notifications instead of throwing from an asynchronous snapshot callback.
- The legacy prewarmed checkout path catches Browser launch failures and displays a retryable error rather than an unhandled rejection.

## Verification already performed

- Frontend tests: 31 passed.
- TypeScript: `tsc --noEmit` passed.
- Android `testDebugUnitTest` and `assembleDebug`: passed.
- The Gradle output still includes non-fatal flatDir/deprecation notices. These notices are not evidence of the reported crash.

## Required device reproduction procedure

1. Install the candidate APK on the affected device and note device model, Android version/API level, RidersBUD version, and whether the app exits to the launcher or only displays an error/blank checkout.
2. Use HitPay Sandbox only for the first test. Do not use a real payment or Live credentials for crash reproduction.
3. Connect the device with USB debugging enabled. From PowerShell, use the Android SDK `adb.exe` and capture logs before reproducing:
   - Clear old logs with `adb logcat -c`.
   - Start capture with `adb logcat -v threadtime AndroidRuntime:E chromium:E Capacitor/Console:E '*:S'`.
   - Reproduce once: open a booking, open Payment Breakdown, select downpayment/full payment, and tap Proceed once.
   - Stop capture with Ctrl+C and save the output, including the first `FATAL EXCEPTION`, `Process:` line, exception/cause, and stack frames. If no fatal exception appears, capture `adb logcat -v threadtime` around the exact reproduction instead; a WebView renderer exit may be logged under Chromium/WebView rather than AndroidRuntime.
4. Redact customer information, Firebase tokens, HitPay API keys, webhook salts, payment URLs with identifying query values, and card/e-wallet details before sharing the log. Never include credentials.
5. Repeat separately for: modal open/close/reopen; sandbox checkout opening; back/cancel; offline or dropped network; wallet app switch and return; payment return via the HTTPS App Link; cold-start return after force-stop; successful sandbox settlement. Record which exact step causes the failure.
6. Only after sandbox passes on the affected Android version should Live-mode checks be considered. Use a low-value authorized transaction and refund it through the merchant workflow.

## Release gate

- Run `npm test`, `npm run typecheck`, Android `testDebugUnitTest`, and a signed `assembleRelease` build.
- Verify the APK signature and ensure its SHA-256 signing-certificate fingerprint remains present in `public/.well-known/assetlinks.json`.
- Install/update the signed APK on the affected device (same signing key required for in-place upgrade), then complete the sandbox test matrix above.
- Publish the APK and version metadata only after the affected-device sandbox run is clean. If the crash reproduces, attach the redacted logcat and device/API/build details to this runbook and fix the exact fatal stack before claiming the issue is resolved.

## Current limitation

A generic Android System crash dialog does not contain enough information to distinguish a React runtime exception from an Android Activity launch exception or a WebView renderer crash. No device was connected for this investigation, so the changes above fix a confirmed React bug and harden likely native failure paths, but a clean run on the reporting device remains necessary to verify there are no additional device-specific fatal errors.
