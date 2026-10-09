# PWA Full Functionality, Display Mode & Settings Enhancement

## Goal
Make all PWA settings, data details, and features completely functional and optimized across Android, iOS, and Desktop, ensuring dynamic Display Mode (`standalone`, `fullscreen`, `minimal-ui`, `browser`) operates seamlessly at runtime with live Web Manifest generation, persistent configuration, offline capabilities, and enhanced device controls.

## Tasks
- [ ] Task 1: Extend TypeScript definitions in `types.ts` with comprehensive PWA attributes (`pwaOrientation`, `pwaCategories`, `pwaLanguage`, `pwaShortcuts`, `pwaProtocolHandlers`, `pwaScreenshots`) → Verify: `npm run typecheck`
- [ ] Task 2: Implement dynamic runtime Web Manifest generation & DOM injection (`utils/pwaManifestHelper.ts`) that reads Firestore settings in real time, converts display mode, colors, icons, shortcuts, and updates `<link rel="manifest">` data URL so changes take effect immediately without rebuilding static assets → Verify: Inspect `<link rel="manifest">` updates in DOM
- [ ] Task 3: Implement Display Mode runtime support in `App.tsx` / `index.html` (including CSS classes, safe area inset handling, Fullscreen API support for `fullscreen` mode, and status bar synchronization) → Verify: When admin selects `fullscreen` or `standalone`, DOM reflects appropriate display modes and body attributes
- [ ] Task 4: Upgrade `components/admin/settings/tabs/PwaSettingsTab.tsx` with all advanced PWA settings (Orientation, Categories, Language, Shortcuts, Live Manifest Download/Inspect, dynamic Display Mode preview in the phone mockup) → Verify: Mockup live preview reflects selected display mode and colors immediately
- [ ] Task 5: Enhance `components/PWAInstallPrompt.tsx` with comprehensive data details, system badge checks, offline indicators, and multi-platform installation guides → Verify: Modal renders custom branding, install triggers, and dismiss logic smoothly
- [ ] Task 6: Audit Service Worker `public/sw.js` and offline shell to ensure safe caching, version upgrades, and offline sync messaging without breaking Firebase Auth / HitPay gateways → Verify: `npm run build` and Service Worker syntax check
- [ ] Task 7: Run verification suite (`npm run typecheck` and `npm run build`) → Verify: Zero TypeScript errors and clean production build

## Done When
- [ ] All PWA settings in Admin Portal are completely interactive, persisted in Firestore, and reflected in real time.
- [ ] Display Mode (`standalone`, `fullscreen`, `minimal-ui`, `browser`) is completely functional both in the Web Manifest and live client application runtime.
- [ ] Production build passes with 0 errors.
