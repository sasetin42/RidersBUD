# Playstore Release: Android App Configuration, Signing, and Build Plan

## Overview
This plan outlines the steps required to configure, sign, optimize, and build the RidersBUD Android application (built using a Capacitor mobile wrapper) into production-ready signed `.apk` and `.aab` files. The final compiled and signed artifacts will be placed in the `/playstore-release/` directory alongside the generated release documentation.

---

## Project Type
**MOBILE** (Capacitor Android wrapper)

---

## Success Criteria
1. **Keystore Generation**: Secure production release keystore file `release-key.jks` generated locally in `./playstore-release/keystore/`.
2. **Release Config Optimization**: Build configurations updated in `android/app/build.gradle` to support release signing, with `minifyEnabled` set to `true` for optimization and Proguard active.
3. **No Credential Exposure**: No hardcoded keystore passwords or credentials committed to the git repository (utilizing local `variables.gradle` or environment properties).
4. **Successful Build Artifacts**:
   - Production Signed Android App Bundle (AAB): `./playstore-release/aab/app-release.aab`
   - Signed Testing APK: `./playstore-release/apk/app-release.apk`
5. **Validation Verification**: Completion of all build steps and automated validation audits (e.g., security check and mobile audit).

---

## Tech Stack
- **Capacitor Android**: Native bridge wrapper linking React web assets to Android platform.
- **Gradle**: Build automation tool for Android compilation.
- **JDK 17**: Required compilation and keystore toolset.
- **Android SDK Tools (`apksigner`, `zipalign`, `keytool`)**: Required tools for optimization, signature validation, and compilation.

---

## File Structure
Once completed, the release artifacts and configuration structure will be:
```
/ (Project Root)
├── playstore-release/
│   ├── aab/
│   │   └── app-release.aab             # Signed Production App Bundle
│   ├── apk/
│   │   └── app-release.apk             # Signed Release Testing APK
│   ├── keystore/
│   │   ├── release-key.jks             # Release Keystore (gitignored)
│   │   └── keystore-info.txt           # Metadata (public)
│   └── docs/
│       ├── app-version-info.md         # Application metadata & versions
│       ├── build-instructions.md       # Step-by-step developer compilation guide
│       ├── google-play-upload-checklist.md
│       └── release-notes.md
├── android/
│   ├── variables.gradle                # Local variables (gitignored passwords if any)
│   └── app/
│       └── build.gradle                # Configured to pull from local env/gradle vars
```

---

## Task Breakdown

### Task 1: Environment & Prerequisites Validation
- **Agent**: `mobile-developer`
- **Skill**: `android-cli`
- **Priority**: High
- **Dependencies**: None
- **INPUT**: Current workspace, target build tools.
- **OUTPUT**: Verified local installation of JDK 17, Android SDK tools (`keytool`, `apksigner`, `zipalign`), and active Gradle tools.
- **VERIFY**: Run `java -version`, `keytool`, and verification commands to ensure binaries are executable.

### Task 2: Configure Android App Signing Credentials (Local Keystore)
- **Agent**: `mobile-developer` & `security-auditor`
- **Skill**: `vulnerability-scanner`
- **Priority**: High
- **Dependencies**: Task 1
- **INPUT**: `./playstore-release/keystore/keystore-info.txt` requirements.
- **OUTPUT**: A generated keystore file `release-key.jks` at `./playstore-release/keystore/release-key.jks`.
- **VERIFY**: Check that the `.jks` file exists and that `.gitignore` properly excludes `.jks` files from version control to prevent credential exposure.

### Task 3: Build Web Assets and Sync to Android Wrapper
- **Agent**: `mobile-developer`
- **Skill**: `app-builder`
- **Priority**: High
- **Dependencies**: None
- **INPUT**: React codebase.
- **OUTPUT**: Compiled production assets in `/dist` synced to the native Android app directory (`/android/app/src/main/assets/public`).
- **VERIFY**: Run `npm run build` and `npx cap sync`. Confirm output folders exist and contain compiled assets.

### Task 4: Configure Gradle for Production Release & Signing Keys
- **Agent**: `mobile-developer` & `security-auditor`
- **Skill**: `clean-code`
- **Priority**: High
- **Dependencies**: Task 2, Task 3
- **INPUT**: `android/app/build.gradle`.
- **OUTPUT**: Modified `build.gradle` that sets up the release signing configs dynamically using environment variables or a local `.properties` file, sets `minifyEnabled true`, and configures Proguard rules.
- **VERIFY**: Inspect `build.gradle` to ensure no passwords or sensitive keys are hardcoded in source control.

### Task 5: Build and Sign Production APK and AAB
- **Agent**: `mobile-developer`
- **Skill**: `android-cli`
- **Priority**: High
- **Dependencies**: Task 4
- **INPUT**: Android project configurations.
- **OUTPUT**:
  - `./playstore-release/aab/app-release.aab`
  - `./playstore-release/apk/app-release.apk`
- **VERIFY**: Run `./gradlew bundleRelease` and `./gradlew assembleRelease` (or use manual signature verification with `apksigner verify`). Verify successful generation and placement of artifacts in target release folders.

### Task 6: Audit and Directory Validation
- **Agent**: `security-auditor` & `test-engineer`
- **Skill**: `vulnerability-scanner`
- **Priority**: Medium
- **Dependencies**: Task 5
- **INPUT**: Generated APK, AAB, and updated codebase.
- **OUTPUT**: Security scan and verification reports confirming release build integrity.
- **VERIFY**: Run validation script `security_scan.py` to confirm no exposed secrets, and verify that the release directory layout matches success criteria exactly.

---

## Phase X: Final Verification Checklist
- [ ] Keystore `release-key.jks` is created and excluded from version control.
- [ ] Gradle configurations are verified to not contain hardcoded secrets.
- [ ] Minification and Proguard are enabled in `build.gradle` for the release build type.
- [ ] Web assets are successfully built and synced to the Android native folder.
- [ ] Signed AAB file exists at `playstore-release/aab/app-release.aab`.
- [ ] Signed APK file exists at `playstore-release/apk/app-release.apk`.
- [ ] Release signatures are verified using `apksigner verify`.
- [ ] Automated security scan via `python .agent/skills/vulnerability-scanner/scripts/security_scan.py .` executes successfully.
