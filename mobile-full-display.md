# Mobile Full Display & Edge-to-Edge Integration Plan

## Objective
Enable true edge-to-edge full display layout on Android (and iOS) mobile devices. The app background and canvas will stretch completely to the device screen borders (behind the status bar at the top and the 3-button navigation/gesture bar at the bottom) without opaque letterboxing, while keeping system icons legible and interactive touch targets padded via safe-area insets.

---

## Root Cause Analysis
1. **Android 10+ (API 29+) System Scrim / Contrast Enforcement**:
   - By default on Android 10+, Android OS places an artificial solid or semi-opaque grey scrim behind 3-button navigation bars to ensure high contrast, blocking web views from showing edge-to-edge background color behind navigation buttons.
   - Solution: In `MainActivity.java`, call `window.setNavigationBarContrastEnforced(false)` and `window.setStatusBarContrastEnforced(false)` on API 29+.
2. **Window Bar Colors**:
   - Both status bar and navigation bar window colors must be explicitly set to `Color.TRANSPARENT`.
3. **Safe Area Inset Handling**:
   - Web view viewport is set to `viewport-fit=cover`.
   - `BottomNav` and headers already consume `var(--safe-top)` and `var(--safe-bottom)` to ensure buttons are never cut off or hard to tap above the Android navigation buttons.

---

## Implementation Steps
1. **Update `MainActivity.java`**:
   - Enable transparent status bar and navigation bar.
   - Disable contrast enforcement (`setNavigationBarContrastEnforced(false)`, `setStatusBarContrastEnforced(false)`) on Android API 29+.
   - Keep status bar & navigation bar icons light/visible on dark theme canvas (`setAppearanceLightStatusBars(false)`, `setAppearanceLightNavigationBars(false)`).
2. **Update `styles.xml`**:
   - Add `android:enforceNavigationBarContrast` and `android:enforceStatusBarContrast` set to `false`.
3. **Bump App Version**:
   - Increment `versionCode` to 23 and `versionName` to `1.1.12` in `android/app/build.gradle`.
4. **Verification**:
   - Run unit/integration test suite (`npm test`).
   - Run Android build / sync (`npm run release:apk`).
