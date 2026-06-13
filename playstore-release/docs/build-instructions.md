# Android Build Compilation Instructions

Follow these instructions on your local machine to build, sign, and compile the final signed Android App Bundle (`.aab`) and testing APK (`.apk`) files.

## Prerequisites
1. **Java Development Kit (JDK 17)**: Make sure JDK 17 is installed. Run `java -version` to verify.
2. **Android Studio**: Install Android Studio to get the Android SDK, build tools, and emulator setup.
3. **Gradle**: Ensure Gradle command-line tools are available or run via the project's gradle wrapper (`./gradlew` or `gradlew.bat`).

---

## Step 1: Generate the Release Keystore
If you do not have a release key yet, open your terminal/command prompt and run:
```bash
keytool -genkey -v -keystore playstore-release/keystore/release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias ridersbud-key
```
Follow the prompts to configure your passwords and information, and save the resulting `release-key.jks` inside `/playstore-release/keystore/`.

---

## Step 2: Build the Production Web App Bundle
In the project root, compile the web assets:
```bash
npm run build
```
This updates the `/dist` directory.

---

## Step 3: Sync Web Assets to Android Studio
Sync the compiled web files into the android native folder layout:
```bash
npx cap sync
```

---

## Step 4: Open and Build in Android Studio
1. Open **Android Studio**.
2. Select **Open File or Project** and point to the `/android` directory inside the project workspace.
3. Wait for the Gradle sync to finish successfully.

### To Generate the signed testing APK or AAB:
1. Go to the top menu: **Build** > **Generate Signed Bundle / APK...**
2. Choose either **Android App Bundle** (for Play Store upload) or **APK** (for local installation testing) and click **Next**.
3. Point to the keystore file location (`/playstore-release/keystore/release-key.jks`).
4. Enter the **alias** (`ridersbud-key`), **store password**, and **key password** you set in Step 1.
5. Click **Next**, choose the **release** build variant, and select the target output folder.
6. Click **Create** / **Finish**.

---

## Step 5: Command Line Alternative (No IDE)
If you prefer building directly from the command prompt:
1. Open terminal inside the `/android` folder:
   ```bash
   cd android
   ```
2. Build the release App Bundle:
   ```bash
   ./gradlew bundleRelease
   ```
3. Build the release testing APK:
   ```bash
   ./gradlew assembleRelease
   ```
4. Sign the resulting bundle/apk inside `android/app/build/outputs/` using `apksigner` and your `release-key.jks`.
5. Copy the signed builds to:
   - `/playstore-release/apk/app-release.apk`
   - `/playstore-release/aab/app-release.aab`
