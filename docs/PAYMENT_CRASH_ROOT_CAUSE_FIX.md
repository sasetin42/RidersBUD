# HitPay checkout crash — confirmed root cause, fix, and verification

Build: **v1.1.10 (versionCode 21)** — supersedes v1.1.9 (versionCode 20), which crashed on
every single checkout attempt.

Scope: Android native in-app HitPay container (`HitPayPaymentActivity`), its manifest theme,
`MainActivity` renderer recovery, and the regression tests that lock the fix in.

---

## 1. The crash (reproduced on a real Android runtime)

```
E AndroidRuntime: FATAL EXCEPTION: main
E AndroidRuntime: Process: com.sasetin42.ridersbud:payment, PID: 7309
E AndroidRuntime: java.lang.RuntimeException: Unable to start activity
        ComponentInfo{com.sasetin42.ridersbud/com.sasetin42.ridersbud.payment.HitPayPaymentActivity}
E AndroidRuntime:   at android.app.ActivityThread.performLaunchActivity(ActivityThread.java:4575)
E AndroidRuntime: Caused by: java.lang.IllegalStateException:
        You need to use a Theme.AppCompat theme (or descendant) with this activity.
```

Reproduced on an Android 17 (API 37) emulator by launching the container the same way the
plugin does. It happens **100% of the time**, in the isolated `:payment` process, and it is
exactly what a customer sees as *"pag Proceed to Pay, nag-crash ang app"*.

## 2. Root cause

`HitPayPaymentActivity extends AppCompatActivity`, but the manifest declared it with the
**splash launch theme**:

```xml
android:theme="@style/AppTheme.NoActionBarLaunch"   <!-- parent="Theme.SplashScreen" -->
```

`AppCompatDelegateImpl.createSubDecor()` (reached from `setContentView()`) refuses to build
the activity decor unless the theme defines the **AppCompat** attribute `windowActionBar`:

```java
TypedArray a = mContext.obtainStyledAttributes(R.styleable.AppCompatTheme);
if (!a.hasValue(R.styleable.AppCompatTheme_windowActionBar)) {
    throw new IllegalStateException(
        "You need to use a Theme.AppCompat theme (or descendant) with this activity.");
}
```

`Theme.SplashScreen` (androidx core-splashscreen 1.2.0) only sets the **framework** attribute
`android:windowActionBar`. They are two different resource ids, proven from the shipped
v1.1.9 APK's own resource table:

| Resource | Id | Set by the splash chain? |
|---|---|---|
| `attr/windowActionBar` (AppCompat — what the check reads) | `0x7f030129` | **no** — only `AppTheme.NoActionBar`, `Theme.AppCompat.*`, `Base.V7.Theme.AppCompat*` set it |
| `android:windowActionBar` (framework) | `0x010102ce` | yes (`Theme.SplashScreen.Common`) |

`MainActivity` never hit this because Capacitor's `BridgeActivity.onCreate()` calls
`setTheme(R.style.AppTheme_NoActionBar)` **before** `setContentView()`. The payment activity
did neither, so the container died on creation, the `:payment` process was killed, and the
system showed the "App Error — RidersBUD crashed" notification.

## 3. Fix

1. **`android/app/src/main/res/values/styles.xml`** — new AppCompat-derived theme for the
   container (plus a warning comment on the splash theme):

   ```xml
   <style name="AppTheme.Payment" parent="AppTheme.NoActionBar">
       <item name="android:windowBackground">#FF121212</item>
       <item name="android:windowDrawsSystemBarBackgrounds">true</item>
       <item name="android:statusBarColor">@android:color/transparent</item>
       <item name="android:navigationBarColor">@android:color/transparent</item>
   </style>
   ```

2. **`android/app/src/main/AndroidManifest.xml`** — the container now declares
   `android:theme="@style/AppTheme.Payment"`.

3. **`HitPayPaymentActivity.onCreate()`** — `setTheme(R.style.AppTheme_Payment)` before
   `super.onCreate()`, so the container stays crash-proof even if the manifest theme is ever
   reverted to a splash theme.

4. **`MainActivity.java`** — the working tree did not compile
   (`cannot find symbol: variable webView`, and `onResume()` narrowing `public` →
   `protected`). The renderer-recovery code now resolves the WebView through
   `getBridge().getWebView()` and the teardown/recreate path is a single
   exception-safe helper. **Nothing in this repo could be built or released until this
   was fixed.**

## 4. Verification (not just "it compiles")

`android/app/src/androidTest/.../HitPayPaymentActivityThemeTest.java` — 3 instrumented tests,
run on an Android 17 (API 37) emulator with `./gradlew :app:connectedDebugAndroidTest`:

| Test | Before the fix | After the fix |
|---|---|---|
| `paymentActivityThemeIsAppCompatCompatible` (mirrors AppCompat's exact check) | **FAILED** — theme resId `2131689479` does not define `windowActionBar` | **PASSED** |
| `paymentContainerLaunchesAndRendersItsNativeUi` (starts the container, asserts its native top bar is on screen) | **FAILED** — "the native HitPay checkout container never rendered its top bar" | **PASSED** — `Displayed com.sasetin42.ridersbud/.payment.HitPayPaymentActivity for user 0: +2s520ms` |
| `paymentEventsReachThePluginReceiverAcrossProcesses` (return channel, `:payment` → main process) | PASSED | **PASSED** |

`adb logcat` FATAL EXCEPTION count during the post-fix run: **0** (was 1 per attempt).

`android/app/src/test/.../HitPayPaymentThemeTest.java` — 2 device-free JVM tests (run by
`testDebugUnitTest`, no emulator needed) that fail if the container's theme stops being an
AppCompat descendant, or if `setTheme(...)` stops running before `super.onCreate()`.

Full run for this pass:

```
npm run typecheck                 → 0 errors
npm test                          → 98 passed (5 files)
(cd functions && npm test)        → 23 passed
android testDebugUnitTest         → 22 passed (PaymentNavigationPolicyTest 19, HitPayPaymentThemeTest 2, template 1)
android connectedDebugAndroidTest → 3 passed, 0 FATAL EXCEPTION
node scripts/release-apk.mjs --skip-deploy
                                  → signed APK v1.1.10 (versionCode 21), signature verified
```

## 5. What still needs a real device + real credentials

Cannot be proven from source or an emulator, and is therefore **not** claimed as verified:

1. A full booking → Proceed to Pay → **complete a HitPay Sandbox payment** → receipt run with
   a real customer account (the emulator has no credentials, and the payment request must be
   created by the deployed Cloud Function).
2. Wallet app-switch (GCash / Maya installed) and 3-D Secure bank hand-offs on a physical
   phone.
3. iOS: `HitPayPaymentViewController` is presented by `HitPayInAppPlugin.swift`; the crash
   above is Android-only. An iPhone run is still required for the Universal-Link return.
