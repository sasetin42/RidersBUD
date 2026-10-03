# Implementation Plan: In-App HitPay Checkout & Android Custom Tab Integration

## Goal
Implement a compliant, seamless in-app payment experience for RidersBUD Android that keeps the customer inside the app experience, adheres strictly to HitPay mobile integration policies (No iframes, no raw webview hacks), uses Android Custom Tabs (`@capacitor/browser`) with RidersBUD branding, and guarantees authoritative server-side webhook verification.

---

## Architecture & Integration Details

### 1. Checkout Presentation Mechanism
- **Selected Mechanism**: **Android Custom Tab** (via `@capacitor/browser`) with RidersBUD branding (`toolbarColor: '#FE7803'`, `presentationStyle: 'popover'`) as the primary presentation mechanism, paired with official HitPay Drop-In (`hitpay.js`) on supported web environments.
- **Why**: HitPay hosted checkout pages prohibit raw `<iframe>` embedding (`X-Frame-Options` and `Content-Security-Policy: frame-ancestors self ecwid.com`). Crucially, local Philippine payment methods (such as GCash, Maya, and bank 3-D Secure challenges) mandate secure browser contexts with top-level navigations, TLS certificate validation, cookie isolation, and app-to-app intent handoffs that standard Android WebViews block or break. Android Custom Tabs maintain the customer within the RidersBUD app window without launching an external independent Chrome session.
- **Auto-Return & Auto-Dismissal**: When payment completes, the authoritative webhook writes to Firestore. The real-time Firestore watcher (`watchPaymentVerification` in `utils/paymentRedirect.ts` and `HitPayEmbeddedService.ts`) detects the verified payment status and immediately invokes `Browser.close()`, dismissing the Custom Tab and smoothly transitioning the customer to the verified confirmation view.

### 2. Security Model
- **No Client Secrets**: Neither HitPay API Keys nor HMAC Salts exist in the Android application.
- **Authoritative Server Proxy**: Payment requests are created server-side via the Firebase Cloud Function (`hitpayProxy`).
- **Zero Client Status Trust**: The client never sets `paymentStatus = 'paid'` or `isVerified = true`. Only the Cloud Function webhook (`hitpayWebhook`) receiving the cryptographically signed HMAC payload writes the verified status to Firestore.

---

## Tasks Completed

- [x] **Task 1**: Verified HitPay official requirements and prohibited methods (No iframe embedding, no fake native card collection, no raw WebView for 3-D Secure/e-wallets).
- [x] **Task 2**: Enhanced [paymentRedirect.ts](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/RIDERSBUD%20APP/RidersBUD%20App/utils/paymentRedirect.ts) to configure `@capacitor/browser` Custom Tab with RidersBUD brand toolbar color (`#FE7803`) and popover presentation.
- [x] **Task 3**: Enhanced [HitPayEmbeddedService.ts](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/RIDERSBUD%20APP/RidersBUD%20App/services/HitPayEmbeddedService.ts) to guarantee automatic `Browser.close()` dismissal upon backend Firestore webhook verification.
- [x] **Task 4**: Verified Android manifest deep linking (`ridersbud://` and `https://ridersbud-10806.web.app`) in [AndroidManifest.xml](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/RIDERSBUD%20APP/RidersBUD%20App/android/app/src/main/AndroidManifest.xml).
- [x] **Task 5**: Verified all 6 payment entry points (Bookings, Services, Parts Orders, Car Rentals, Driver Hire, Liaison) route through `HitPayEmbeddedService`.
- [x] **Task 6**: Ran TypeScript typecheck (`npm run typecheck`) — Passed cleanly.
- [x] **Task 7**: Ran production web bundle build (`npm run build`) — Built successfully in 21.58s.
- [x] **Task 8**: Synchronized Capacitor Android assets (`npx cap sync android`) — Assets copied and plugins updated.
