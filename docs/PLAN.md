# Implementation Plan: Update APK Version & Deploy Downloadable Release

## Goal
Update the RidersBUD Android APK to version 1.0.4 (versionCode 5), compile and sign the production release APK with the latest codebase improvements (HitPay loading speed optimization, mechanic job timeline payment gate, celebration modal, responsive layouts), stage the APK files, deploy to Firebase Hosting, and generate live downloadable links.

---

## Proposed Version Changes
- **Previous:** `versionName: "1.0.3"`, `versionCode: 4`
- **Target:** `versionName: "1.0.4"`, `versionCode: 5`
- **Release Notes:**
  - Fast HitPay payment connection (<100ms instant redirect via pre-warming)
  - Mandatory customer 2nd payment verification gate on mechanic job timeline
  - Service completion celebration modal with confetti and auto-redirect to home
  - Mobile layout & responsive notification enhancements

---

## Tasks

### Phase 1: Planning & Setup (`project-planner`)
- [ ] Create structured implementation plan in `docs/PLAN.md`.
- [ ] Review Android build configuration and JDK 21 environment.

### Phase 2: Implementation (`mobile-developer`, `devops-engineer`, `test-engineer`)
- [ ] **Task 1: Version Updates (`mobile-developer`)**
  - Update `android/app/build.gradle` (`versionCode 5`, `versionName "1.0.4"`).
  - Update `package.json` (`"version": "1.0.4"`).
  - Update `public/version.json` with new release metadata and notes.
- [ ] **Task 2: Build & Capacitor Sync (`mobile-developer`)**
  - Run web production build: `npm run build`.
  - Remove stale `dist/releases` to prevent nested APK packaging bug.
  - Run `npx cap sync android` to copy the fresh web assets into native Android project.
- [ ] **Task 3: Compile Signed Release APK (`devops-engineer`)**
  - Execute `gradlew.bat assembleRelease` using the local bundled JDK 21 (`.gradle_jdk21/jdk-21.0.2+13`).
  - Verify release APK signature and v2 scheme with `apksigner`.
  - Stage the generated APK to `dist/releases/`, `public/releases/`, and `playstore-release/apk/`.
- [ ] **Task 4: Deploy & Verify Downloadable Link (`devops-engineer` & `test-engineer`)**
  - Deploy hosting bundle to Firebase Hosting (`firebase deploy --only hosting`).
  - Verify live availability of download links:
    - `https://ridersbud-10806.web.app/releases/RidersBUD-latest.apk`
    - `https://ridersbud-10806.web.app/releases/RidersBUD-v1.0.4.apk`
    - `https://ridersbud-10806.web.app/version.json`
  - Run project security and lint checks.

---

## Done When
- [ ] `android/app/build.gradle` and `public/version.json` show `versionCode 5` and `versionName "1.0.4"`.
- [ ] Signed release APK is compiled without errors.
- [ ] APK is deployed to Firebase Hosting and directly downloadable via public HTTPS URLs.
