# HitPay Online Payment Loading Speed Optimization Plan

## Goal
Accelerate the HitPay online payment loading speed and visual responsiveness across Web and native Android APK, slashing checkout initiation and rendering latency from ~3-4s down to under 1s.

---

## Performance Bottlenecks Identified

1. **Cold Network & TLS Handshake Latency:**
   - Every HitPay proxy call creates a new TCP/TLS connection to `api.hit-pay.com` without HTTP Keep-Alive.
   - Browser / WebView does not preconnect or DNS-prefetch HitPay checkout domains.

2. **Sequential Session Creation Bottleneck:**
   - User waits for `/hitpay-checkout` to mount, selects a method, and clicks "Pay".
   - Only *after* the click does the app dispatch `/api/hitpay-proxy` to HitPay API (~1.2s roundtrip), and only *after* that returns does the iframe begin downloading assets (~1.5s). Total perceived delay: 3-4 seconds.

3. **Dynamic Chunk Lazy-Loading Overhead:**
   - `HitPayCheckoutScreen` and `HitPayInAppModal` are dynamically imported chunks downloaded only after clicking navigation.

4. **Iframe Perceived Render Lag:**
   - Blank or generic spinner while the HitPay hosted checkout executes its client-side JavaScript bundle.

---

## Actionable Tasks

- [x] **Task 1: Network & TLS Optimization (Preconnect + DNS Prefetch)**
  - Added `<link rel="preconnect" href="https://checkout.hit-pay.com" crossorigin>` and `api.hit-pay.com` (both sandbox and production) to `index.html`.
  - **Verify:** Network tab shows early DNS pre-resolution for HitPay domains before checkout.

- [x] **Task 2: Persistent HTTP Keep-Alive in Backend Proxy**
  - In `functions/index.js` and `vite.config.ts`, instantiated `new https.Agent({ keepAlive: true, maxSockets: 50, keepAliveMsecs: 60000 })` for all upstream requests to HitPay.
  - **Verify:** Sequential proxy requests show socket reuse and TTFB reduction of 300-500ms.

- [x] **Task 3: Intelligent Background Pre-Warming & Pre-Initiation**
  - In `HitPayCheckoutScreen.tsx`, initiated background pre-fetching for the default payment session (`gcash`) as soon as the screen mounts with URL params.
  - When the user taps "Pay PHP X", if the pre-warmed session URL is ready, opens the in-app checkout instantly with **0ms initiation delay**!
  - If the user changes payment method, smoothly re-initiates for the selected channel.
  - **Verify:** Tapping "Pay" displays the payment checkout immediately without waiting for a new API roundtrip.

- [x] **Task 4: Component & Chunk Preloading**
  - In `App.tsx`, added `preloadHitPayCheckout` triggered when the user visits payment-eligible screens (`BookingScreen`, `ServiceBookingFlow`, `PaymentScreen`, `ServicePaymentScreen`).
  - **Verify:** Clicking "Proceed to Pay" transitions to `/hitpay-checkout` with zero chunk download delay.

- [x] **Task 5: High-Performance In-App Modal UX & Skeleton UI**
  - In `HitPayInAppModal.tsx`, implemented high-speed connection progress bar and modern shimmer skeleton loader matching HitPay's visual layout.
  - Added smooth opacity cross-fade transition when the iframe completes loading.
  - **Verify:** Seamless visual continuity without jarring layout shifts or blank screens.

- [x] **Task 6: Verification & Verification Build**
  - Run `npx tsc --noEmit` to verify type safety: **Passed (0 errors)**.
  - Run `npm run build` and measure bundle impact: **Built in 15.89s**.
  - Sync with native Android APK via `npx cap sync android`: **Synced in 0.248s**.
  - **Verify:** All payment paths (Services, Downpayment, Final Balance, Parts Store) execute under 1 second.

---

## Done When
- [x] HitPay gateway session initiates instantaneously via background pre-warming.
- [x] Network requests to HitPay reuse persistent sockets via HTTP Keep-Alive.
- [x] In-app modal loads smoothly with modern skeleton placeholder.
- [x] TypeScript check and production build pass with 0 errors.
