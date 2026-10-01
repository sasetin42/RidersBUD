/**
 * release-apk.mjs — One-command signed APK release pipeline for RidersBUD.
 *
 *   node scripts/release-apk.mjs [--notes "line1\nline2"] [--skip-deploy]
 *
 * Steps:
 *   1. Read versionCode/versionName from android/app/build.gradle (single source of truth)
 *   2. Regenerate public/version.json
 *   3. vite build (production web bundle)
 *   4. Delete dist/releases FIRST (prevents the nested-APK-into-assets bug), then `cap sync`
 *   5. gradle assembleRelease with the bundled JDK 21
 *   6. apksigner verify (signature + v2 scheme check)
 *   7. Stage APK to dist/releases/{RidersBUD-latest.apk,RidersBUD-vX.Y.Z.apk} + playstore-release/apk
 *   8. firebase deploy --only hosting (unless --skip-deploy)
 *   9. Print download links
 */
import { readFileSync, writeFileSync, existsSync, rmSync, mkdirSync, copyFileSync, statSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';

const args = process.argv.slice(2);
const SKIP_DEPLOY = args.includes('--skip-deploy');
const notesIdx = args.indexOf('--notes');
const NOTES = notesIdx !== -1 && args[notesIdx + 1] ? args[notesIdx + 1] : null;

const ROOT = process.cwd();
const log = (s) => console.log(`\n\x1b[1;36m▸ ${s}\x1b[0m`);
const ok = (s) => console.log(`\x1b[1;32m✔ ${s}\x1b[0m`);
const fail = (s) => { console.error(`\x1b[1;31m✖ ${s}\x1b[0m`); process.exit(1); };
const sh = (cmd, opts = {}) => execSync(cmd, { stdio: 'inherit', cwd: ROOT, ...opts });

// ---------------------------------------------------------------------------
// 1. Version from build.gradle
// ---------------------------------------------------------------------------
log('Reading version from android/app/build.gradle…');
const gradle = readFileSync(path.join(ROOT, 'android/app/build.gradle'), 'utf8');
const vCodeMatch = gradle.match(/versionCode\s+(\d+)/);
const vNameMatch = gradle.match(/versionName\s+"([^"]+)"/);
if (!vCodeMatch || !vNameMatch) fail('Cannot find versionCode/versionName in android/app/build.gradle');
const VERSION_CODE = parseInt(vCodeMatch[1], 10);
const VERSION_NAME = vNameMatch[1];
ok(`versionCode ${VERSION_CODE} / versionName ${VERSION_NAME}`);

// ---------------------------------------------------------------------------
// 2. version.json
// ---------------------------------------------------------------------------
log('Regenerating public/version.json…');
const releaseNotes = (NOTES || '• Payments auto-return to the app\n• 70/30 mechanic commission\n• True fullscreen on Android\n• Works offline (bundled app)')
    .split('\\n').map(s => s.trim()).filter(Boolean).join('\n');
const versionJson = {
    versionCode: VERSION_CODE,
    versionName: VERSION_NAME,
    apkUrl: 'https://ridersbud-10806.web.app/releases/RidersBUD-latest.apk',
    releaseNotes,
    mandatory: false,
    minSupportedVersionCode: 1,
    generatedAt: new Date().toISOString()
};
writeFileSync(path.join(ROOT, 'public/version.json'), JSON.stringify(versionJson, null, 2) + '\n');
ok('public/version.json updated');

// ---------------------------------------------------------------------------
// 3. Web build
// ---------------------------------------------------------------------------
log('Building web bundle (vite build)…');
sh('npx vite build');
ok('Web bundle built');

// ---------------------------------------------------------------------------
// 4. Clean staged releases + cap sync
// ---------------------------------------------------------------------------
log('Removing stale dist/releases then syncing Capacitor…');
const distReleases = path.join(ROOT, 'dist/releases');
if (existsSync(distReleases)) {
    rmSync(distReleases, { recursive: true, force: true });
    ok('dist/releases removed (prevents nested-APK bug)');
}
sh('npx cap sync android');
ok('Capacitor sync complete');

// ---------------------------------------------------------------------------
// 5. Gradle release build (bundled JDK)
// ---------------------------------------------------------------------------
log('Building signed release APK (gradle assembleRelease)…');
const JDK = path.join(ROOT, '.gradle_jdk21/jdk-21.0.2+13');
const env = {
    ...process.env,
    JAVA_HOME: JDK,
    PATH: `${path.join(JDK, 'bin')};${process.env.PATH || process.env.Path}`,
    ORG_GRADLE_PROJECT_javaHome: JDK
};
const gradlew = path.join(ROOT, 'android', 'gradlew.bat');
sh(`"${gradlew}" assembleRelease --no-daemon`, { env, cwd: path.join(ROOT, 'android') });
const apkPath = path.join(ROOT, 'android/app/build/outputs/apk/release/app-release.apk');
if (!existsSync(apkPath)) fail('APK not found after gradle build');
const sizeMb = (statSync(apkPath).size / (1024 * 1024)).toFixed(1);
ok(`APK built: ${sizeMb} MB`);

// ---------------------------------------------------------------------------
// 6. Verify signature
// ---------------------------------------------------------------------------
log('Verifying APK signature…');
const apksigner = 'C:/Users/User/AppData/Local/Android/Sdk/build-tools/35.0.0/apksigner.bat';
sh(`"${apksigner}" verify --print-certs "${apkPath}"`, { env });
ok('Signature verified');

// ---------------------------------------------------------------------------
// 7. Stage APKs
// ---------------------------------------------------------------------------
log('Staging APKs…');
mkdirSync(distReleases, { recursive: true });
mkdirSync(path.join(ROOT, 'playstore-release/apk'), { recursive: true });
copyFileSync(apkPath, path.join(distReleases, 'RidersBUD-latest.apk'));
copyFileSync(apkPath, path.join(distReleases, `RidersBUD-v${VERSION_NAME}.apk`));
copyFileSync(apkPath, path.join(ROOT, 'playstore-release/apk/app-release.apk'));
ok('Staged: dist/releases + playstore-release/apk');

// ---------------------------------------------------------------------------
// 8. Deploy hosting
// ---------------------------------------------------------------------------
if (!SKIP_DEPLOY) {
    log('Deploying to Firebase Hosting…');
    sh('firebase deploy --only hosting');
    ok('Hosting deployed');
} else {
    log('Skipping hosting deploy (--skip-deploy)');
}

// ---------------------------------------------------------------------------
// 9. Links
// ---------------------------------------------------------------------------
console.log('\n\x1b[1;33m══════════════════════════════════════════════════\x1b[0m');
console.log(`\x1b[1;37m  RidersBUD v${VERSION_NAME} (versionCode ${VERSION_CODE}) — ${sizeMb} MB\x1b[0m`);
console.log('\x1b[1;33m══════════════════════════════════════════════════\x1b[0m');
console.log('  Download (always latest):');
console.log('    https://ridersbud-10806.web.app/releases/RidersBUD-latest.apk');
console.log(`  Download (versioned):`);
console.log(`    https://ridersbud-10806.web.app/releases/RidersBUD-v${VERSION_NAME}.apk`);
console.log('  Update metadata:');
console.log('    https://ridersbud-10806.web.app/version.json');
console.log('');
