# Application Version Info

Here is the configuration and version metadata for the RidersBUD Android release package.

## Package Metadata
- **App Name**: RidersBUD
- **Package ID (Application ID)**: `com.sasetin42.ridersbud`
- **Namespace**: `com.sasetin42.ridersbud`
- **Version Code**: `1` (Gradle build property `versionCode`)
- **Version Name**: `1.0` (Gradle build property `versionName`)

## SDK & Build Constraints
- **Compile SDK**: `36`
- **Target SDK**: `36`
- **Minimum SDK**: `24` (Android 7.0 - Nougat)
- **Gradle Version**: Configured in wrapper
- **Java Home Target**: JDK 21

## Signing Configuration
- **Keystore Type**: PKCS12 (standard `.jks`)
- **Keystore File Location**: `playstore-release/keystore/release-key.jks`
- **Key Alias**: `ridersbud-alias`
- **Signature Algorithms**: V1 (JAR Signature), V2 (Full APK Signature), V3 (APK Signature Scheme v3)
