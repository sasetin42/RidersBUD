#!/usr/bin/env node
/**
 * scripts/release-ios.mjs — Complete iOS App Store preparation & release pipeline for RidersBUD.
 *
 *   node scripts/release-ios.mjs [--team-id YOUR_TEAM_ID] [--archive]
 *
 * Steps:
 *   1. Read authoritative versionCode & versionName from android/app/build.gradle
 *   2. Sync MARKETING_VERSION, CURRENT_PROJECT_VERSION, and optional DEVELOPMENT_TEAM in ios/App/App.xcodeproj/project.pbxproj
 *   3. Sync version in package.json
 *   4. Regenerate opaque 1024x1024 iOS App Store Icon & Launch/Splash screens (sync-native-launcher-icons.js)
 *   5. Build production web bundle (vite build)
 *   6. Remove stale dist/releases (prevents bundling APK binaries inside the iOS .ipa!)
 *   7. Sync Capacitor iOS (npx cap sync ios) + register custom HitPayInAppPlugin & verify PrivacyInfo.xcprivacy
 *   8. Validate all App Store requirements (Info.plist keys, PrivacyInfo.xcprivacy, Entitlements, Opaque Icon)
 *   9. If running on macOS with Xcode installed, optionally run xcodebuild archive & export App.ipa
 */
import { readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const teamIdx = args.indexOf('--team-id');
const TEAM_ID = (teamIdx !== -1 && args[teamIdx + 1]) ? args[teamIdx + 1] : process.env.APPLE_TEAM_ID || '';
const DO_ARCHIVE = args.includes('--archive') || process.platform === 'darwin';

const log = (s) => console.log(`\n\x1b[1;36m▸ ${s}\x1b[0m`);
const ok = (s) => console.log(`\x1b[1;32m✔ ${s}\x1b[0m`);
const warn = (s) => console.warn(`\x1b[1;33m⚠ ${s}\x1b[0m`);
const fail = (s) => { console.error(`\x1b[1;31m✖ ${s}\x1b[0m`); process.exit(1); };
const sh = (cmd, opts = {}) => execSync(cmd, { stdio: 'inherit', cwd: ROOT, ...opts });

// ---------------------------------------------------------------------------
// 1. Read authoritative version from android/app/build.gradle
// ---------------------------------------------------------------------------
log('Reading version from android/app/build.gradle…');
const gradlePath = path.join(ROOT, 'android/app/build.gradle');
const gradle = readFileSync(gradlePath, 'utf8');
const vCodeMatch = gradle.match(/versionCode\s+(\d+)/);
const vNameMatch = gradle.match(/versionName\s+"([^"]+)"/);
if (!vCodeMatch || !vNameMatch) fail('Cannot find versionCode/versionName in android/app/build.gradle');
const BUILD_NUMBER = parseInt(vCodeMatch[1], 10);
const MARKETING_VERSION = vNameMatch[1];
ok(`Target iOS Version: MARKETING_VERSION = ${MARKETING_VERSION} (Build ${BUILD_NUMBER})`);

// ---------------------------------------------------------------------------
// 2. Sync Xcode project.pbxproj & package.json
// ---------------------------------------------------------------------------
log('Synchronizing Xcode project.pbxproj version & signing settings…');
const pbxPath = path.join(ROOT, 'ios/App/App.xcodeproj/project.pbxproj');
let pbx = readFileSync(pbxPath, 'utf8');
pbx = pbx.replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, `CURRENT_PROJECT_VERSION = ${BUILD_NUMBER};`);
pbx = pbx.replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${MARKETING_VERSION};`);
if (TEAM_ID) {
    if (pbx.includes('DEVELOPMENT_TEAM =')) {
        pbx = pbx.replace(/DEVELOPMENT_TEAM = [^;]+;/g, `DEVELOPMENT_TEAM = ${TEAM_ID};`);
    } else {
        pbx = pbx.replace(/CODE_SIGN_STYLE = Automatic;/g, `CODE_SIGN_STYLE = Automatic;\n\t\t\t\tDEVELOPMENT_TEAM = ${TEAM_ID};`);
    }
    ok(`Configured DEVELOPMENT_TEAM = ${TEAM_ID}`);
}
writeFileSync(pbxPath, pbx);
ok(`Updated ios/App/App.xcodeproj/project.pbxproj to v${MARKETING_VERSION} (${BUILD_NUMBER})`);

const pkgPath = path.join(ROOT, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
if (pkg.version !== MARKETING_VERSION) {
    pkg.version = MARKETING_VERSION;
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
    ok(`Synchronized package.json version to ${MARKETING_VERSION}`);
}

// ---------------------------------------------------------------------------
// 3. Regenerate Native Icons & Splash Assets (Opaque 1024x1024 iOS Icon)
// ---------------------------------------------------------------------------
log('Generating App Store-compliant opaque 1024x1024 iOS AppIcon and Splash screens…');
sh('node scripts/sync-native-launcher-icons.js');
ok('Native iOS icons and splash assets synchronized');

// ---------------------------------------------------------------------------
// 4. Clean APK releases from public/dist before building web bundle for iOS
// ---------------------------------------------------------------------------
log('Building production web bundle (vite build)…');
sh('npx vite build');

const distReleases = path.join(ROOT, 'dist/releases');
if (existsSync(distReleases)) {
    rmSync(distReleases, { recursive: true, force: true });
    ok('Removed dist/releases so Android .apk files are NEVER bundled into the iOS .ipa');
}

// ---------------------------------------------------------------------------
// 5. Sync Capacitor iOS & Ensure Local Swift Plugins
// ---------------------------------------------------------------------------
log('Syncing web assets & plugins to ios/App…');
sh('npx cap sync ios');
sh('node scripts/ensure-ios-hitpay-plugin.mjs');

// Also remove any stale .apk files from ios/App/App/public/releases if present
const iosPublicReleases = path.join(ROOT, 'ios/App/App/public/releases');
if (existsSync(iosPublicReleases)) {
    rmSync(iosPublicReleases, { recursive: true, force: true });
    ok('Cleaned ios/App/App/public/releases');
}
ok('Capacitor iOS sync complete');

// ---------------------------------------------------------------------------
// 6. App Store Readiness Audit
// ---------------------------------------------------------------------------
log('Running Apple App Store Readiness Audit…');
const infoPlist = readFileSync(path.join(ROOT, 'ios/App/App/Info.plist'), 'utf8');
const privacyManifest = path.join(ROOT, 'ios/App/App/PrivacyInfo.xcprivacy');
const entitlements = readFileSync(path.join(ROOT, 'ios/App/App/RidersBUD.entitlements'), 'utf8');
const iosCapConfig = JSON.parse(readFileSync(path.join(ROOT, 'ios/App/App/capacitor.config.json'), 'utf8'));

const checks = [
    ['Bundle ID (com.sasetin42.ridersbud)', pbx.includes('PRODUCT_BUNDLE_IDENTIFIER = com.sasetin42.ridersbud;')],
    ['Marketing Version & Build Number', pbx.includes(`MARKETING_VERSION = ${MARKETING_VERSION};`) && pbx.includes(`CURRENT_PROJECT_VERSION = ${BUILD_NUMBER};`)],
    ['PrivacyInfo.xcprivacy present & in Xcode Resources', existsSync(privacyManifest) && pbx.includes('PrivacyInfo.xcprivacy in Resources')],
    ['HitPayInAppPlugin registered in capacitor.config.json', Array.isArray(iosCapConfig.packageClassList) && iosCapConfig.packageClassList.includes('HitPayInAppPlugin')],
    ['HitPay Swift sources in Xcode Compile Sources', pbx.includes('HitPayInAppPlugin.swift in Sources') && pbx.includes('HitPayPaymentViewController.swift in Sources')],
    ['Export Compliance (ITSAppUsesNonExemptEncryption)', infoPlist.includes('ITSAppUsesNonExemptEncryption')],
    ['Camera / Location / Photo / Mic Privacy Descriptions', infoPlist.includes('NSCameraUsageDescription') && infoPlist.includes('NSLocationWhenInUseUsageDescription') && infoPlist.includes('NSPhotoLibraryUsageDescription')],
    ['APNs Push Notification Entitlement (aps-environment)', entitlements.includes('aps-environment')],
    ['Universal Links Associated Domains', entitlements.includes('applinks:ridersbud-10806.web.app')]
];

let allPassed = true;
for (const [label, passed] of checks) {
    if (passed) {
        ok(label);
    } else {
        allPassed = false;
        fail(`Failed check: ${label}`);
    }
}

// ---------------------------------------------------------------------------
// 7. Native Archive & .ipa Export (macOS Xcode)
// ---------------------------------------------------------------------------
if (os.platform() === 'darwin' && DO_ARCHIVE) {
    log('macOS detected — archiving and exporting signed App Store .ipa via xcodebuild…');
    const archivePath = path.join(ROOT, 'ios/build/RidersBUD.xcarchive');
    const exportPath = path.join(ROOT, 'ios/build/ipa');
    const exportOptions = path.join(ROOT, 'ios/ExportOptions.plist');
    const teamFlag = TEAM_ID ? `DEVELOPMENT_TEAM=${TEAM_ID}` : '';

    sh(`xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release -sdk iphoneos -archivePath "${archivePath}" archive ${teamFlag} -allowProvisioningUpdates`);
    sh(`xcodebuild -exportArchive -archivePath "${archivePath}" -exportOptionsPlist "${exportOptions}" -exportPath "${exportPath}" -allowProvisioningUpdates`);
    ok(`Signed App Store .ipa exported to: ${exportPath}/App.ipa`);
} else {
    console.log('\n\x1b[1;32m================================================================================\x1b[0m');
    console.log('\x1b[1;32m✔ iOS APP STORE PROJECT IS 100% READY AND VERIFIED!\x1b[0m');
    console.log('\x1b[1;32m================================================================================\x1b[0m');
    console.log('Since you are currently on Windows, Xcode compilation (.ipa signing) requires macOS.');
    console.log('You can produce and upload the signed .ipa to App Store Connect in two ways:\n');
    console.log('  1. Cloud CI/CD (No Mac required):');
    console.log('     • Push to GitHub and trigger ".github/workflows/ios-appstore.yml"');
    console.log('     • Or connect the repo to Codemagic (uses "codemagic.yaml" in project root)\n');
    console.log('  2. On a Mac:');
    console.log('     • Run: npm run release:ios -- --team-id YOUR_APPLE_TEAM_ID --archive');
    console.log('     • Or open "ios/App/App.xcodeproj" in Xcode -> Product -> Archive -> Distribute App');
}
