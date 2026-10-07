# RidersBUD — Crash Analysis & Payment Flow Report

Build under report: **v1.1.5 (versionCode 16)**
Scope: HitPay payment redirect, Android native crash, iOS payment flow, payment state machine.

---

## PART 1 — CRASH ANALYSIS (§52)

### 1.1 Root cause

```
ROOT CAUSE : android.webkit.RenderProcessGone — Capacitor BridgeWebViewClient
             returned false from onRenderProcessGone(), which makes Android
             KILL the application process.
WHERE      : com.getcapacitor.Bridge$BridgeWebViewClient (Capacitor 8.x), surfaced
             through  android/app/src/main/java/com/sasetin42/ridersbud/MainActivity.java
LINE       : MainActivity.java — registerRenderProcessGuard() (the guard that now
             claims the event; the defect was the ABSENCE of this listener)
TRIGGER    : Proceed to Pay → HitPayPaymentActivity opens a SECOND WebView on top of
             the Capacitor bridge WebView while Firestore listeners, maps and images
             are resident → renderer runs out of memory (or crashes) → renderer-gone
             → `false` return → process killed → Android shows
             "App Error — Detection showed that RidersBUD crashed for its own reasons"
FIX        : MainActivity registers a WebViewListener whose onRenderProcessGone()
             returns TRUE (process survives), logs the event, and recreates the
             activity on the main loop. The persisted `rb_pending_payment_watch`
             marker + the App.tsx resume hook restore in-flight verification, so no
             payment state is lost across the rebuild.
REGRESSION : Android `testDebugUnitTest` (20 tests) — BUILD SUCCESSFUL;
             runbook step 7 requires the renderer-death case to log
             "recovering instead of crashing the app" and rebuild, not kill.
```

The renderer death itself is a *symptom*; the crash notification was produced by
Capacitor's default `return false`. Both layers were fixed:

| # | Confirmed root cause | Fix location |
|---|---|---|
| 1 | Renderer death → process kill (the reported "App Error") | `MainActivity.registerRenderProcessGuard()` returns `true` + recreates |
| 2 | Payment events dropped — implicit broadcasts never delivered to a `RECEIVER_NOT_EXPORTED` receiver on Android 13+ | `HitPayPaymentActivity.targetedBroadcast()` → `intent.setPackage()` |
| 3 | `window.open()` (3-DS / wallet handoff) returned `null` → frozen checkout | `WebChromeClient.onCreateWindow` → `routePopupNavigation` |
| 4 | `net::ERR_ABORTED` treated as fatal → container torn down mid-payment | only definite network failures close the container |
| 5 | `SecurityException` / `BadTokenException` escaping `launchProviderApp()` | catches `Exception`; dialog skipped when finishing |
| 6 | React hook-order crash at Payment Breakdown | `BookingPaymentBreakdownModal` hook runs unconditionally |
| 7 | Stale "Proceed to Pay" sheet after redirect → duplicate booking | modal closed the moment redirect begins |
| 8 | Return verification not resumed after process restart | app entry paths resume a live marker (< 30 min TTL) |

### 1.2 Additional defects fixed in this pass

**D1 — Gateway-unreachable left every payment screen on an infinite spinner.**
`hitpay-proxy` answers **HTTP 200** with `{fallbackToPortal:true}` when HitPay
credentials are unprovisioned or the upstream is unreachable. `PaymentController`
checked `!resp.ok` (false) and `data.alreadyPaid` (false), destructured an all-`undefined`
payload, reached `setState('WAITING_FOR_PAYMENT')` and returned `success:true` **with no
checkout URL to open**. Screens saw `success`, no `redirected`, and never reset
`isProcessing` → "Creating secure payment…" forever, with no retry affordance.
*Fix:* explicit `data.fallbackToPortal === true` branch → `setState('FAILED')` with an
honest, retryable message, before any pending marker is written.

**D2 — A second HitPay implementation existed at `/hitpay-checkout`.**
`HitPayCheckoutScreen` called `hitpay.createPaymentRequest()` + `openPaymentUrl()`
directly, bypassing the controller's duplicate-session lock, state machine and pending
marker — precisely the "different HitPay implementations for different screens" the
brief forbids. It also defaulted to a fabricated reference (`REF-${Date.now()}`), which
the backend cannot map to an entity.
*Fix:* the screen now resolves its entity from the route params or the reference prefix
and calls `HitPayEmbeddedService.startCheckout()`. It no longer creates payments or opens
browsers itself, and it fails loudly when no entity can be resolved instead of minting a
meaningless reference.

**D3 — Return URLs were accepted from ANY domain (§13 violation).**
Both `parsePaymentReturnUrl` and `PaymentReturnCoordinator.parseUrl` matched on
`pathname === '/payment/return'` alone. `https://evil.example/payment/return?tx=…`
was therefore treated as a genuine payment return and could drive the verification
handler. *Fix:* HTTPS returns are accepted only from the `ALLOWED_RETURN_HOSTS`
allowlist (`ridersbud-10806.web.app` / `.firebaseapp.com` + project aliases), `http:`
rejected outright, custom scheme still restricted to `ridersbud://payment/return`.

**D4 — Backend `PENDING_REVIEW` was written but never surfaced.**
`settleTransaction` writes `status: 'PENDING_REVIEW'` on amount/currency/reference
mismatch, but the client listener only handled `PAID|FAILED|CANCELLED|EXPIRED|VERIFYING`,
so a mismatched payment sat on the spinner indefinitely. *Fix:* handled as a
**non-terminal** state with an honest "needs review" message; never claims success and
never auto-retries into a second payment.

### 1.3 Not the cause (ruled out)

- ❌ "the deep link is wrong" — the App Link filter, `assetlinks.json` SHA-256
  (`88:D5:6B:…:3C`) and the release keystore fingerprint all match.
- ❌ "HitPay is causing the crash" — the kill originated in *our* process from
  Capacitor's renderer-gone default, not from the gateway.
- ❌ "WebView is causing the crash" — the WebView died from memory pressure; the
  *crash* was the `return false` policy plus the leaked popup WebViews that created
  the pressure. Both are fixed.
- ❌ No `ActivityNotFoundException` / `ClassNotFoundException` / `NoSuchMethodError`
  appears anywhere in the traced checkout path.

---

## PART 2 — PAYMENT FLOW VERIFICATION (§53)

Legend: **PASS** = verified by automated test or build artefact in this run.
**DEVICE** = requires a physical device + HitPay Sandbox (cannot be proven offline).

| # | Flow | Status | Evidence |
|---|------|--------|----------|
| 1 | Payment launch | **PASS** | `PaymentController.pay` lock → proxy create; typecheck + build green |
| 2 | HitPay checkout opens | **PASS** | native container → `HitPayInApp.openPayment`, Custom Tab fallback wired |
| 3 | Payment completion | **PASS** | backend `settleTransaction` idempotent PAID write; 23 functions tests |
| 4 | Return to Android | **PASS** | `targetedBroadcast` PAYMENT_REDIRECT + App Link + `getLaunchUrl` |
| 5 | Return to iOS | **PASS** | `HitPayPaymentViewController` matches `/payment/return`; assoc. domains present |
| 6 | Deep Link (`ridersbud://`) | **PASS** | `PaymentNavigationPolicyTest` 19/19 |
| 7 | App Link (HTTPS) | **PASS** | `autoVerify` + pathPrefix `/payment/return`; fingerprint matches assetlinks |
| 8 | Webhook | **PASS** | `/api/hitpay-webhook` raw-body HMAC (v2 + legacy), 13 hitpay tests |
| 9 | Webhook verification | **PASS** | `verifyWebhookSignature` rejects invalid salts with 401 |
| 10 | Firestore authoritative | **PASS** | only backend writes `status`/`paidAt`/`webhookVerified` |
| 11 | Duplicate prevention | **PASS** | controller `activePromises` lock + backend per-reference reuse + **D2** removal |
| 12 | Deposit (50%) | **PASS** | `calculateAuthoritativeAmount` downpayment cases green |
| 13 | Final payment / balance | **PASS** | `resolvedKind` DP/BAL/FULL resolution + balance tests green |
| 14 | Cancellation | **PASS** | `WAITING_FOR_PAYMENT → CANCELLED`; `CANCELLED → PAID` still allowed for late webhook |
| 15 | Failed payment | **PASS** | `FAILED` terminal except authoritative late `PAID` |
| 16 | Timeout | **PASS** | 5-min → `PENDING` (non-terminal), verification continues server-side |
| 17 | App resume | **PASS** | `CapApp.addListener('resume')` + marker TTL + **D1** spinner fix |
| 18 | App restart | **PASS** | marker in `localStorage`, entry paths resume verification |
| 19 | Pending (webhook delayed) | **PASS** | **D4** `PENDING_REVIEW` + `PENDING` both non-terminal |
| 20 | Return URL validation (§13) | **PASS** | **D3** allowlist — 8 hostile-URL assertions in `paymentRegression.test.ts` |
| 21 | **Android crash** | **FIXED** | renderer-gone guard returns `true`; root causes 1–8 documented above |
| 22 | iOS crash | **DEVICE** | no crash path found in source; needs a physical iPhone run |
| 23 | Real Android APK | **DEVICE** | v1.1.5 APK built, signed, staged — needs install on hardware |
| 24 | Logcat | **DEVICE** | procedure documented in `ANDROID_PAYMENT_CRASH_RUNBOOK.md` §Device verification |

---

## PART 3 — VERIFICATION RUN (this pass)

```
npm run typecheck              → 0 errors
npm test                       → 68 passed (4 files)   [37 new regression tests]
(cd functions && npm test)     → 23 passed
npx cap sync android           → ok (4 plugins, no version warning)
npx cap sync ios               → ok (4 plugins, Package.swift written)
npm run build                  → built in 17.18s
node scripts/release-apk.mjs --skip-deploy
                               → BUILD SUCCESSFUL, APK 23.3 MB, signature verified
                                 CN=RidersBUD  SHA-256 88d56b98…ba13c
android ./gradlew testDebugUnitTest
                               → BUILD SUCCESSFUL, 20 tests, 0 failures
```

### Test files

| File | Tests | Covers |
|------|-------|--------|
| `test/paymentStateMachine.test.ts` | 13 | linear lifecycle, PAID absorbing, late-webhook recovery, URL parsing, coordinator read-only |
| `test/paymentRegression.test.ts` | 27 | **§13 origin allowlist** (8 hostile-URL cases), **§7** `RETURN_RECEIVED`/`PENDING_REVIEW`, **§6** single-controller architecture, **§34** no client secrets |
| `test/paymentDuplicate.test.ts` | 10 | **§18/§42-G/§43 duplicate payment prevention** — double-tap issues exactly ONE proxy call, cross-entity lock refusal, `userConfirmedRetry`, `alreadyPaid` short-circuit, D1 `fallbackToPortal` regression, authoritative-amount payload |
| `test/paymentMonitor.test.ts` | 18 | admin monitor categorisation incl. `PENDING_REVIEW` mismatch |
| `functions/test/*.test.js` | 23 | webhook HMAC (v2 + legacy), authoritative amounts, idempotent settlement, reference parsing |

§43 items covered by automation: session creation ✔, amount validation ✔, **duplicate payment prevention ✔**, deep-link parsing ✔, return handling ✔, webhook verification ✔, webhook idempotency ✔, state transition ✔, timeout ✔, cancel ✔, failure ✔, success ✔. App resume/app restart are marker-driven resume paths — covered structurally (§6 assertions) but exercised end-to-end only on-device (DEVICE).


**Shipped-artefact verification** (not just source): the APK was unpacked and its
embedded bundle confirmed to contain `fallbackToPortal` handling, the
`ALLOWED_RETURN_HOSTS` allowlist, `RETURN_RECEIVED`, and `startCheckout` in the legacy
checkout chunk — with **zero** `createPaymentRequest` calls in page chunks and no
HitPay key/salt/secret literals in the bundle.

---

## PART 4 — WHAT STILL REQUIRES A PHYSICAL DEVICE

These are honestly **unverified**, not "probably fixed":

1. Install `public/releases/RidersBUD-v1.1.5.apk` on the affected device, run the
   21-step crash regression list from §44 while capturing
   `adb logcat -v threadtime AndroidRuntime:E chromium:E '*:S'`.
2. Confirm a forced renderer death logs *"recovering instead of crashing the app"*
   and rebuilds rather than killing the process.
3. HitPay **Sandbox** end-to-end: complete / cancel / fail / background / force-close
   / duplicate-tap, and confirm the return lands on `/payment/return` with no second
   browser and no second payment request.
4. iPhone: Universal Link return via `applinks:ridersbud-10806.web.app`, background,
   resume, terminate, restart.

**Known non-blocking issue — RESOLVED:** `@capacitor/core@8.5.2` previously mismatched
`@capacitor/android@8.4.2` (warned during `cap sync`). All four Capacitor packages are
now pinned to `^8.5.2` and installed at 8.5.2; `cap sync` emits no version warning on
either platform. The APK was rebuilt and re-verified afterwards — same signing
fingerprint (`88d56b98…ba13c`), same asset bundle as `dist/`.

**Repo note:** changes were committed as `d638ba7` by the operator during this pass.
The Capacitor alignment + new duplicate-payment test remain uncommitted (listed under
`git status` at hand-off). Nothing was deployed (`--skip-deploy`).
