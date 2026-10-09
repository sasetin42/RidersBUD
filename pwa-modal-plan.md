# Plan: Prominent Application Download & Installation Pop-up Modal for RidersBUD

## Goal
Transform the subtle bottom floating banner into a dedicated, high-visibility Application Download / Mobile App Installation Pop-Up Modal that reliably appears for mobile web users, presenting clear options to either directly install the PWA or download the native Android APK.

## Tasks
- [ ] Task 1: Redesign `components/PWAInstallPrompt.tsx` into a centered/bottom-sheet modal with RidersBUD branding, dark backdrop blur, feature badges, and dual action: "Install Web App" (PWA) + "Download Android APK" (`/releases/RidersBUD-latest.apk`) + iOS Safari step-by-step guide → Verify: Modal renders cleanly on mobile viewport
- [ ] Task 2: Ensure modal appears reliably: remove strict blocking restrictions on desktop/mobile browsers if uninstalled, and support direct opening from headers/settings → Verify: Dispatches `open-pwa-install` and automatically displays upon landing
- [ ] Task 3: Run `npm run typecheck` and `npm run build` → Verify: 0 TypeScript errors and bundle generated in `dist/`
- [ ] Task 4: Deploy to Firebase Hosting via `firebase deploy --only hosting` → Verify: Live modal appears on `https://ridersbud-10806.web.app/`

## Done When
- [ ] The app pop-up modal visibly presents itself to mobile web users with clear options for direct mobile application installation and APK download
- [ ] iOS Safari users receive full visual guide for "Add to Home Screen"
- [ ] Production build and Firebase Hosting deployment succeed
