# iOS App Store Readiness & Build Pipeline Plan (`ios-appstore-release.md`)

## Goal
Create a complete, App Store-compliant iOS build configuration, native plugin & push notification integration, App Store Guideline 5.1.1(v) account deletion compliance, non-transparent App Store icons, Apple Privacy Manifest (`PrivacyInfo.xcprivacy`), and automated local + cloud CI/CD build pipelines (`release:ios`, GitHub Actions, and Codemagic) to compile and upload a signed `.ipa` to App Store Connect / TestFlight.

---

## Key App Store Requirements Addressed

1. **Native iOS Push Notifications & Deep Linking (`AppDelegate.swift` & `RidersBUD.entitlements`)**:
   - Add `didRegisterForRemoteNotificationsWithDeviceToken` and `didFailToRegisterForRemoteNotificationsWithError` forwarding to `NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, ...)` so `@capacitor/push-notifications` receives the APNs token on iOS.
   - Add `aps-environment` to `ios/App/App/RidersBUD.entitlements` alongside Associated Domains (`applinks:ridersbud-10806.web.app`).

2. **Apple Privacy Manifest (`ios/App/App/PrivacyInfo.xcprivacy`)**:
   - Required by Apple since May 2024 (ITMS-91053) for apps and SDKs accessing Required Reason APIs:
     - `NSPrivacyAccessedAPICategoryUserDefaults` (`CA92.1` — app-specific preferences/session)
     - `NSPrivacyAccessedAPICategoryFileTimestamp` (`C617.1` — web asset & cache file timestamps)
     - `NSPrivacyAccessedAPICategorySystemBootTime` (`35F9.1` — measure elapsed time inside the app)
     - `NSPrivacyAccessedAPICategoryDiskSpace` (`E174.1` — caching & offline storage checks)
   - Register `PrivacyInfo.xcprivacy` in `ios/App/App.xcodeproj/project.pbxproj` Resources build phase.

3. **Info.plist Hardening (`ios/App/App/Info.plist`)**:
   - Add `ITSAppUsesNonExemptEncryption = false` so App Store Connect / TestFlight uploads do not block waiting for manual Export Compliance questionnaire answers on every build.
   - Lock iPhone orientations to Portrait (`UIInterfaceOrientationPortrait`) and set `TARGETED_DEVICE_FAMILY = "1"` (iPhone) so App Review does not require separate 13-inch iPad Pro screenshots or reject on landscape modal layouts.
   - Add `UIBackgroundModes` (`remote-notification`, `location`) to match the location and push notification descriptions.

4. **App Store Icon Alpha Channel Removal (`scripts/sync-native-launcher-icons.js`)**:
   - Apple strictly rejects 1024x1024 App Store icons containing an alpha channel (`ITMS-90717: Invalid large app icon`).
   - Update `scripts/sync-native-launcher-icons.js` to flatten the iOS `AppIcon-512@2x.png` onto `#0A0A0C` (`flatten({ background: '#0A0A0C' })`) and remove the alpha channel before writing, then regenerate the icon.

5. **App Store Guideline 5.1.1(v) — In-App Account Deletion**:
   - Apple rejects any app with account creation that does not include an in-app "Delete Account" flow.
   - Add `deleteCustomerAccount` in `context/AuthContext.tsx` and a "Delete Account" option with a confirmation modal in `pages/ProfileScreen.tsx` and `pages/mechanic/MechanicProfileManagementScreen.tsx`.

6. **Xcode Project Version Synchronization & Build Script (`scripts/release-ios.mjs`)**:
   - Synchronize `MARKETING_VERSION` (`1.1.33`) and `CURRENT_PROJECT_VERSION` (`44`) across `package.json`, `android/app/build.gradle`, and `ios/App/App.xcodeproj/project.pbxproj`.
   - Create `scripts/release-ios.mjs` (`npm run release:ios`) that:
     - Syncs versions across Android & iOS
     - Generates non-transparent iOS AppIcon and Splash assets
     - Builds production web bundle (`vite build`)
     - Syncs Capacitor iOS (`npx cap sync ios` / `cap copy ios`)
     - Runs `scripts/ensure-ios-hitpay-plugin.mjs` and verifies `PrivacyInfo.xcprivacy` + `HitPayInAppPlugin` in `project.pbxproj`
     - On macOS, automatically runs `xcodebuild archive` and exports `App.ipa` using `ios/ExportOptions.plist`.

7. **Cloud macOS CI/CD Workflows (Build `.ipa` from Windows via GitHub Actions or Codemagic)**:
   - Create `ios/ExportOptions.plist` for App Store Connect distribution.
   - Create `.github/workflows/ios-appstore.yml` (GitHub Actions macOS runner) and `codemagic.yaml` so you can generate and upload the signed `.ipa` directly to App Store Connect / TestFlight even without a local Mac.
