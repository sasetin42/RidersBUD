# Plan: PWA & Mobile App Customization in Admin Settings (Installation Details, Logo & Splash)

## Goal
Add full PWA customization controls into the RidersBUD Admin Settings panel, allowing administrators to configure installation prompt details, customize PWA display mode, start URL, theme colors, upload app logos/icons, and customize the mobile splash screen, with live synchronization to the client-facing PWA and installation modal.

## Tasks
- [ ] Task 1: Extend `types.ts` (`Settings` interface) with dedicated `pwaSettings` fields:
  - `pwaAppName?: string`
  - `pwaShortName?: string`
  - `pwaDescription?: string`
  - `pwaThemeColor?: string`
  - `pwaBackgroundColor?: string`
  - `pwaStartUrl?: string`
  - `pwaDisplayMode?: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser'`
  - `pwaLogoUrl?: string`
  - `pwaIcon192Url?: string`
  - `pwaIcon512Url?: string`
  - `pwaSplashLogoUrl?: string`
  - `pwaSplashTitle?: string`
  - `pwaSplashTagline?: string`
  - `pwaInstallModalTitle?: string`
  - `pwaInstallModalSubtitle?: string`
  - `pwaAutoPromptDelaySeconds?: number`
  - `pwaApkDownloadUrl?: string`
  - `pwaShowApkDownloadOption?: boolean`
  → Verify: `npm run typecheck` acknowledges the new types

- [ ] Task 2: Create a dedicated administrative settings tab component `components/admin/settings/tabs/PwaSettingsTab.tsx`:
  - Installation Data & Details (App Name, Short Name, Description, Start URL, Display Mode)
  - Color & Branding (Theme Color, Splash Background Color with interactive palette picks)
  - Visual Assets (App Icon 192, 512, Maskable, Apple Touch Icon, Splash Screen Center Logo)
  - Splash & Launch Screen Customization (Title, Tagline, Logo preview)
  - Mobile Pop-up Modal Customization (Custom Modal Title, Subtitle, Auto-popup Delay in seconds, Toggle direct APK download link)
  - Live Mobile Preview Card reflecting live adjustments
  → Verify: Tab compiles cleanly

- [ ] Task 3: Integrate `PwaSettingsTab` into `pages/admin/AdminSettingsScreen.tsx`:
  - Add `'pwa'` to `SettingsTab` union type
  - Add `{ id: 'pwa', label: 'PWA & Mobile App', icon: <Smartphone size={17} />, description: 'Installation, Icons & Splash', keywords: ['pwa', 'install', 'splash', 'logo', 'mobile', 'apk', 'manifest'] }` to `TABS` array
  - Render `PwaSettingsTab` when `activeTab === 'pwa'` with standard asset upload/remove handlers
  → Verify: Tab appears in the Admin Settings sidebar under the configuration domains

- [ ] Task 4: Connect live dynamic PWA settings to client components:
  - `components/PWAInstallPrompt.tsx`: Read titles, descriptions, custom prompt delay, custom logo, and custom APK URL from `db?.settings`
  - `components/AppLoadingScreen.tsx`: Reflect customized splash logo, title, and background colors from `db?.settings`
  → Verify: Changes made in Admin Settings immediately alter the client PWA modal and splash screen in real-time

- [ ] Task 5: Run `npm run typecheck` and `npm run build` → Verify: 0 TypeScript errors and successful production bundling
