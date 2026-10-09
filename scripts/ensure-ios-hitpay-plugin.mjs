#!/usr/bin/env node
/**
 * scripts/ensure-ios-hitpay-plugin.mjs
 *
 * WHY THIS EXISTS
 * ---------------
 * `npx cap sync ios` REGENERATES ios/App/App/capacitor.config.json and sets
 * `packageClassList` from the classes it discovers in node_modules plugins only
 * (see @capacitor/cli dist/util/iosplugin.js -> findPluginClasses). Local
 * app-target Swift plugins living in ios/App/App/ are never scanned, so the
 * custom HitPayInAppPlugin is silently dropped from the list on every sync.
 *
 * Without `HitPayInAppPlugin` in packageClassList, Capacitor's
 * CapacitorBridge.registerPlugins() never registers it, so on iOS every
 * `HitPayInApp.openPayment(...)` call rejects as "unimplemented" and the app
 * falls back to an external Browser tab — the in-app checkout never opens and
 * payment returns can't be intercepted (this was one of the iOS payment
 * failures).
 *
 * This script re-inserts the local plugin class after `cap sync ios`, and is
 * safe to run repeatedly. It also verifies the Swift payment sources are
 * registered in the Xcode project's Sources build phase.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const IOS_CONFIG = path.join(root, 'ios', 'App', 'App', 'capacitor.config.json');
const LOCAL_PLUGIN_CLASSES = ['HitPayInAppPlugin'];
const REQUIRED_SWIFT_SOURCES = [
    'HitPayInAppPlugin.swift',
    'HitPayPaymentViewController.swift'
];
const PBXPROJ = path.join(root, 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');

function log(msg) { console.log(`[ensure-ios-hitpay-plugin] ${msg}`); }
function warn(msg) { console.warn(`[ensure-ios-hitpay-plugin] ${msg}`); }

// --- 1. Inject local plugin classes into the generated packageClassList ---
let configChanged = false;
try {
    const raw = fs.readFileSync(IOS_CONFIG, 'utf8');
    const cfg = JSON.parse(raw);
    if (!Array.isArray(cfg.packageClassList)) cfg.packageClassList = [];
    for (const cls of LOCAL_PLUGIN_CLASSES) {
        if (!cfg.packageClassList.includes(cls)) {
            cfg.packageClassList.push(cls);
            configChanged = true;
            log(`Added "${cls}" to packageClassList.`);
        }
    }
    if (configChanged) {
        fs.writeFileSync(IOS_CONFIG, JSON.stringify(cfg, null, '\t') + '\n');
        log(`Updated ${path.relative(root, IOS_CONFIG)}`);
    } else {
        log('packageClassList already contains all local payment plugin classes.');
    }
} catch (e) {
    warn(`Could not update capacitor.config.json: ${e.message}`);
}

// --- 2. Verify Swift payment sources are compiled in the Xcode project ---
try {
    const pbx = fs.readFileSync(PBXPROJ, 'utf8');
    const missing = REQUIRED_SWIFT_SOURCES.filter(
        (f) => !pbx.includes(`${f} in Sources`)
    );
    if (missing.length > 0) {
        warn(
            `The following payment Swift files are NOT in the Xcode Sources build phase: ` +
            `${missing.join(', ')}. Open ios/App/App.xcodeproj in Xcode and add ` +
            `ios/App/App/*.swift to the App target (Build Phases > Compile Sources), ` +
            `otherwise HitPayInApp will be unimplemented on iOS.`
        );
    } else {
        log('All Swift payment sources are registered in the Xcode Sources build phase.');
    }
} catch (e) {
    warn(`Could not verify pbxproj: ${e.message}`);
}

if (configChanged) log('Done. iOS in-app HitPay checkout plugin is registered.');
