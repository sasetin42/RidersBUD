# Plan: Blank Screen & End-to-End Payment Flow Fix for RidersBUD Android APK

> **Status:** PENDING APPROVAL  
> **Target Device/Platform:** Android Native App (Capacitor 7 + React 19 + Vite + HitPay Embedded)

---

## 1. Root Cause Analysis (Bakit Nagba-Blank Screen Pagkatapos ng Loading?)

Nagsagawa kami ng malalim na code inspection (`App.tsx`, `MainActivity.java`, `styles.xml`, at Capacitor build lifecycle) at natuklasan ang mga sumusunod na dahilan:

1. **JavaScript ReferenceError sa `App.tsx` (Critical Crash Trigger):**
   - Sa loob ng main `useEffect` ng `App.tsx`, ang `let backButtonListener: any = null;` ay idineklara **sa loob** lamang ng `if (Capacitor.isNativePlatform()) { ... }` block (line 546).
   - Ngunit sa cleanup return function (line 584), tinawag ang `backButtonListener?.remove?.();` sa labas ng `if` block.
   - Sa production build / strict mode, nagdudulot ito ng runtime `ReferenceError: backButtonListener is not defined` tuwing mag-uunmount, mag-reroute, o mag-mount ang App component. Dahil dito, nagka-crash ang buong React component tree at nagiging blangko (puti o itim) ang screen pagkatapos ng initial loading.

2. **Native Android Splash Window Theme Retention sa `MainActivity.java`:**
   - Ang `AndroidManifest.xml` ay nakatakda sa `android:theme="@style/AppTheme.NoActionBarLaunch"`. Ang launch theme na ito ay may `android:background="@drawable/splash"`.
   - Sa standard Capacitor Android implementation, dapat tawagin ang `setTheme(R.style.AppTheme_NoActionBar);` bago ang `super.onCreate(savedInstanceState)`.
   - Dahil hindi ito tinawag, nananatili ang window background theme ng splash launcher na nagiging sanhi ng black screen, visual freeze, o collision sa WebView background rendering pagka-hide ng Capacitor SplashScreen plugin.

3. **Vite Dynamic Chunk / Suspense Fallback Resilience:**
   - Kapag may mabagal na network o lumang cached bundle habang naglo-load ang lazy-loaded components sa `<React.Suspense>`, kung walang dedicated `vite:preloadError` handler at fallback ErrorBoundary sa router, nag-aabort ang React render loop na nag-iiwan ng blangkong root element.

4. **Location Blocker & HitPay Return Listener Handlers:**
   - Sinisiguro natin na ang geolocation check ay may strict safe-timeout para hindi ma-trap ang user sa infinite loading overlay kung patay ang GPS ng Android device.
   - Ang HitPay Embedded In-App WebView (`HitPayPaymentActivity`) ay ganap nang naka-wire at may double-crash prevention gamit ang `registerRenderProcessGuard()`.

---

## 2. Action Plan & Implementation Tasks

### Task 1: Ayusin ang Variable Scope sa `App.tsx`
- Ilipat ang deklarasyon ng `let backButtonListener: any = null;` pataas kasama ng `appUrlListener`, `paymentRedirectListener`, atbp. (line 445).
- Tiyakin na ligtas ang cleanup sa lahat ng native listeners nang walang anumang scoping error.

### Task 2: Ayusin ang Native Activity Theme sa `MainActivity.java`
- Idagdag ang `setTheme(R.style.AppTheme_NoActionBar);` bago ang `super.onCreate(savedInstanceState);`.
- Papayagan nito ang native window na lumipat agad mula sa Splash Theme patungo sa Transparent edge-to-edge WebView Theme.

### Task 3: Maglagay ng Vite Chunk Preload Error Handler & Global Route Error Boundary
- Magdagdag ng global listener para sa `vite:preloadError` upang awtomatikong mag-reload kung may stale chunk.
- Siguraduhin na ang `<AppLoadingScreen />` at fallback boundaries ay hindi nagha-hang.

### Task 4: Buong End-to-End Build & Native Android Synchronization
- Patakbuhin ang full TypeScript check at Vite build: `npm run build`.
- I-sync ang assets sa Android: `npx cap sync android`.

### Task 5: Pag-compile at Pag-verify ng Bagong Release APK
- I-build ang release APK gamit ang `node scripts/release-apk.mjs --skip-deploy`.
- Patakbuhin ang test suite (`npx vitest run`) upang masigurong 100% passing ang payments at state management.

---

## 3. Verification Criteria
- [ ] Walang `ReferenceError` sa console o native logcat logs.
- [ ] Matapos ang loading screen, maayos na lilitaw ang onboarding o login / customer dashboard (hindi blangko).
- [ ] Ang HitPay Embedded In-App Checkout ay tuloy-tuloy mula booking hanggang resibo nang walang external browser o crash.
- [ ] Matagumpay na mabubuo ang bagong updated APK file (`app-release.apk`).
