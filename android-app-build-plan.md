# Android App Build Plan (Capacitor Standalone APK)

## Goal
Convert and package the latest RidersBUD web app (`https://ridersbud-10806.web.app/`) into a standalone signed Android APK with offline-bundled assets using Capacitor and Gradle.

## Strategy & Decisions
- **Framework**: Capacitor 8 (`@capacitor/android`, `@capacitor/app`, `@capacitor/geolocation`, `@capacitor/browser`).
- **Asset Bundling**: Offline-first local bundle built via Vite (`dist/` synced into `android/app/src/main/assets/public`).
- **Target Artifact**: Production-signed standalone APK (`playstore-release/apk/app-release.apk` & `dist/releases/RidersBUD-latest.apk`).
- **Release Automation**: Execute through `scripts/release-apk.mjs` (`npm run release:apk -- --skip-deploy` or full pipeline) ensuring valid signatures and version metadata.

## Tasks
- [x] Task 1: Verify web bundle build and typescript checks (`npm run build`) → Verify: `dist/` directory generated with zero errors.
- [x] Task 2: Sync web assets and plugins to Android project (`npx cap sync android`) → Verify: Assets copied to `android/app/src/main/assets/public`.
- [x] Task 3: Check Android configuration, permissions, and release signing keys (`android/app/build.gradle` & `playstore-release/keystore/release-key.jks`) → Verify: Keystore and gradle signing configurations confirmed.
- [x] Task 4: Execute Android Release build (`npm run release:apk -- --skip-deploy`) → Verify: Standalone signed `.apk` output created and verified with `apksigner`.
- [x] Task 5: Mobile verification & integrity audit → Verify: Mobile audit and checklist validation completed.

## Done When
- [x] Standalone signed APK is generated and verified ready for direct installation on Android devices.
