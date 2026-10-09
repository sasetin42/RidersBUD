# Plan: Complete Progressive Web App (PWA) Implementation for RidersBUD

## Goal
Transform RidersBUD into a fully installable, mobile-first PWA for Android and iOS with offline shell caching, custom install prompts, branded icons, and zero disruption to Firebase auth, Firestore, or HitPay payments.

## Tasks
- [ ] Task 1: Generate branded PWA PNG icons (`icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon-180.png`) from existing official logo using `sharp` → Verify: icons exist in `public/icons/` with exact dimensions
- [ ] Task 2: Create standard W3C manifest (`public/manifest.webmanifest`) and synchronize `public/manifest.json` with correct names, theme colors (`#FE7803`), start URL, and maskable icons → Verify: JSON validator passes and manifest link is reachable
- [ ] Task 3: Upgrade Service Worker (`public/sw.js`) with cache busting, offline branded fallback, safe navigation fallback, stale-while-revalidate for static assets, and strict security exclusions (never cache Firebase Auth, HitPay checkout, or Firestore APIs) → Verify: SW registers cleanly without infinite reload loops
- [ ] Task 4: Build mobile-friendly Install Prompt component (`components/PWAInstallPrompt.tsx`) supporting Android Chrome (`beforeinstallprompt`) and iOS Safari ("Add to Home Screen" instructions sheet) with dismiss cooldown → Verify: Prompt appears in browser test and honors dismiss state
- [ ] Task 5: Mount `PWAInstallPrompt` in `App.tsx` and connect offline detection banner (`components/OfflineBanner.tsx`) → Verify: App renders with no UI regressions or console errors
- [ ] Task 6: Update `index.html` with canonical PWA tags, manifest links, Apple mobile web app tags, and theme color → Verify: Head contains correct meta and manifest references
- [ ] Task 7: Update `firebase.json` headers to configure cache control for `sw.js` (`no-cache, no-store, must-revalidate`) and `manifest.webmanifest` (`application/manifest+json`) → Verify: Firebase hosting headers correctly set
- [ ] Task 8: Verification & Production Build: Run `npm run build` and automated security/lint checks → Verify: Production build passes with 0 errors

## Done When
- [ ] PWA manifest and icons are valid and discoverable
- [ ] Service worker caches the application shell and serves safe assets offline
- [ ] Android install prompt and iOS Add to Home Screen guide function smoothly
- [ ] Critical business flows (Firebase Auth, Firestore, HitPay payments) are fully preserved
- [ ] Production build succeeds
