# Plan: APK Release and Build Orchestration

## Goal
Fix TypeScript build errors, bump the application version if required, synchronize Android assets, compile the signed production/testing APK, verify cryptographic signatures, and stage/deploy the updated APK release.

## Context & Prerequisites
- Current version in `android/app/build.gradle`: `versionCode 9`, `versionName "1.0.8"`
- Pipeline script: `node scripts/release-apk.mjs`
- Pending build blocker: TS2304 `looksLikeRealPaymentRequestId` in `services/HitPayEmbeddedService.ts`

## Tasks
- [x] Task 1: Fix TS compilation blocker in `services/HitPayEmbeddedService.ts` → Verify: `npm run typecheck` succeeds with 0 errors
- [x] Task 2: Version verification / bump confirmation (`versionCode 10`, `versionName "1.0.9"`) → Verify: `android/app/build.gradle` and `public/version.json` match
- [x] Task 3: Build web assets and run capacitor sync → Verify: `npx vite build` and `npx cap sync android` succeed
- [x] Task 4: Execute signed release build (`release-apk.mjs` or `gradlew assembleRelease`) → Verify: `android/app/build/outputs/apk/release/app-release.apk` is generated and verified by `apksigner`
- [x] Task 5: Stage APK artifacts and deploy hosting if configured → Verify: APK copied to `playstore-release/apk/`, `dist/releases/`, and `public/releases/`
- [x] Task 6: Run verification security and lint audits → Verify: TypeScript compiler clean and signature verified with Android SDK `apksigner`

## Done When
- [x] Signed APK generated, verified with `apksigner`, and staged in `playstore-release/apk/` and `public/releases/`
