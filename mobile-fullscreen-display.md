# Immersive Fullscreen Mobile Display (Hide Phone Status & Navigation Bars)

## Goal
Make the RidersBUD application display strictly the top priority by completely hiding the phone's top system bar (clock, battery, Wi-Fi, notifications) and the phone's bottom 3-button system menu. Only the application's top header and application navigation menu will be visible on the screen. If the user swipes inward from the edge, the system bars appear transiently and automatically hide again.

---

## Technical Architecture & Root Cause
1. **Current Behavior**:
   - `MainActivity.java` currently keeps system bars visible (`WindowCompat.setDecorFitsSystemWindows(getWindow(), false)` with light status bar icons).
   - In `capacitor.config.json`, `SystemBars.hidden` is set to `false`.
   - Result: As seen in the device screenshot, the phone's top notification/clock bar and bottom 3-button OS navigation keys overlay/cut into the screen space.
2. **Target Behavior (Immersive Fullscreen)**:
   - On Android: Configure `WindowInsetsControllerCompat` with:
     - `controller.hide(WindowInsetsCompat.Type.systemBars())`
     - `controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE)`
     - Re-apply immersion in `onResume()` and `onWindowFocusChanged(boolean hasFocus)` so dialogs or keyboard dismissals never leave the system bars permanently stuck on screen.
   - In `capacitor.config.json`:
     - Set `"hidden": true` in `SystemBars` plugin settings.
   - In CSS / Web Layout:
     - Ensure headers and `BottomNav` render flush and clean with appropriate padding when in immersive fullscreen.

---

## Tasks
- [ ] Task 1: Update `MainActivity.java` to apply immersive sticky fullscreen (`controller.hide(WindowInsetsCompat.Type.systemBars())` and `BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE`) with lifecycle enforcement in `onResume` and `onWindowFocusChanged`. → Verify: Inspect `MainActivity.java` syntax and Android window lifecycle hooks.
- [ ] Task 2: Update `capacitor.config.json` SystemBars configuration to set `"hidden": true`. → Verify: JSON validates and sets hidden mode.
- [ ] Task 3: Bump Android version to `versionCode 25` and `versionName "1.1.14"`. → Verify: `build.gradle` and `version.json` updated.
- [ ] Task 4: Run test suite (`npm test`) to ensure zero regressions across application controllers. → Verify: 98 tests passing.
- [ ] Task 5: Build web assets, sync Capacitor, compile release APK (`scripts/release-apk.mjs --skip-deploy`), and stage `RidersBUD-v1.1.14.apk`. → Verify: New APK generated in `public/releases/` and `playstore-release/apk/`.

---

## Done When
- [ ] Phone top status bar (clock, battery, signal) and bottom phone 3-button menu are hidden when running the mobile app.
- [ ] Only RidersBUD application navigation and headers are visible on screen.
- [ ] Swiping from the edge transiently shows system bars which automatically fade away.
- [ ] Staged signed release APK `v1.1.14` is ready for user installation and testing.
