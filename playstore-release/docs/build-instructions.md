# Android Build Instructions

Follow these steps to compile and sign production-ready packages of RidersBUD.

## Prerequisites
1. **Java Development Kit (JDK)**: JDK 21 installed.
2. **Android SDK**: Android API Level 36, SDK Build-Tools 35, and platforms installed.
3. **Node.js**: Node.js v18+ for building the React frontend.

## 1. Prepare Frontend Assets
Compile the React/Vite web application and sync it to the Capacitor Android project wrapper:
```bash
npm run build
npx cap sync android
```

## 2. Local Configuration
Ensure you have the local configuration files set up (these files are gitignored and should never be committed):
- **`android/local.properties`**: Must contain the path to your Android SDK.
  ```properties
  sdk.dir=C\:\\Users\\User\\AppData\\Local\\Android\\Sdk
  ```
- **`android/variables.gradle`**: Contains the signing credentials:
  ```groovy
  ext {
      ...
      releaseStoreFile = '../../playstore-release/keystore/release-key.jks'
      releaseStorePassword = 'your-keystore-password'
      releaseKeyAlias = 'your-alias'
      releaseKeyPassword = 'your-key-password'
  }
  ```

## 3. Run Build Commands
Navigate to the `android/` directory and execute the Gradle build. Make sure `JAVA_HOME` is set to JDK 21:

### Windows (PowerShell)
```powershell
$env:JAVA_HOME="C:\Users\User\AppData\Local\Programs\Common\jdk-21.0.11+10"
.\gradlew.bat bundleRelease assembleRelease
```

### macOS / Linux
```bash
export JAVA_HOME="/Library/Java/JavaVirtualMachines/jdk-21.jdk/Contents/Home"
./gradlew bundleRelease assembleRelease
```

## 4. Retrieve Outputs
The compiled binaries will be output to:
- **AAB**: `android/app/build/outputs/bundle/release/app-release.aab`
- **APK**: `android/app/build/outputs/apk/release/app-release.apk`

Copy these files to their respective destinations under `playstore-release/aab/` and `playstore-release/apk/`.
