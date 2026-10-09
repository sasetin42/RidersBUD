import { Settings } from '../types';

export interface WebManifestData {
  name: string;
  short_name: string;
  description: string;
  start_url: string;
  scope: string;
  display: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser';
  orientation: 'portrait' | 'landscape' | 'any' | 'portrait-primary' | 'natural';
  theme_color: string;
  background_color: string;
  lang: string;
  categories: string[];
  icons: Array<{
    src: string;
    sizes: string;
    type: string;
    purpose?: string;
  }>;
  shortcuts?: Array<{
    name: string;
    short_name: string;
    description: string;
    url: string;
    icons: Array<{ src: string; sizes: string }>;
  }>;
}

/**
 * Builds a compliant Web App Manifest JSON object directly from dynamic settings.
 */
export function buildWebManifest(settings?: Partial<Settings>): WebManifestData {
  const name = settings?.pwaAppName || settings?.appName || 'RidersBUD';
  const short_name = settings?.pwaShortName || 'RidersBUD';
  const description = settings?.pwaDescription || 'RidersBUD mobile delivery and rider platform';
  const start_url = settings?.pwaStartUrl || '/';
  const scope = settings?.pwaScope || '/';
  const display = settings?.pwaDisplayMode || 'standalone';
  const orientation = settings?.pwaOrientation || 'portrait';
  const theme_color = settings?.pwaThemeColor || settings?.accentColor || '#FE7803';
  const background_color = settings?.pwaBackgroundColor || '#0A0A0C';
  const lang = settings?.defaultLanguage || 'en';

  // Primary icons with fallback cascade
  const icon192 = settings?.pwaIcon192Url || settings?.pwaLogoUrl || settings?.faviconUrl || '/icons/icon-192.png';
  const icon512 = settings?.pwaIcon512Url || settings?.pwaLogoUrl || '/icons/icon-512.png';
  const maskable512 = settings?.pwaMaskableIconUrl || icon512;
  const appleTouch = settings?.pwaAppleTouchIconUrl || '/icons/apple-touch-icon-180.png';

  const icons: WebManifestData['icons'] = [
    { src: icon192, sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: icon512, sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: maskable512, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    { src: appleTouch, sizes: '180x180', type: 'image/png', purpose: 'any' }
  ];

  const shortcuts: WebManifestData['shortcuts'] = [
    {
      name: 'Find Mechanic',
      short_name: 'Find',
      description: 'Find verified roadside mechanics near you',
      url: '/find-mechanic',
      icons: [{ src: icon192, sizes: '192x192' }]
    },
    {
      name: 'My Garage',
      short_name: 'Garage',
      description: 'View registered vehicles and service history',
      url: '/garage',
      icons: [{ src: icon192, sizes: '192x192' }]
    },
    {
      name: 'Parts Store',
      short_name: 'Parts',
      description: 'Browse genuine spare parts and accessories',
      url: '/parts-store',
      icons: [{ src: icon192, sizes: '192x192' }]
    },
    {
      name: 'Active Bookings',
      short_name: 'Bookings',
      description: 'Check active service requests and dispatch status',
      url: '/bookings',
      icons: [{ src: icon192, sizes: '192x192' }]
    }
  ];

  return {
    name,
    short_name,
    description,
    start_url,
    scope,
    display,
    orientation,
    theme_color,
    background_color,
    lang,
    categories: settings?.pwaCategories || ['utilities', 'travel', 'shopping'],
    icons,
    shortcuts: settings?.pwaEnableLiveShortcuts !== false ? shortcuts : undefined
  };
}

let activeBlobUrl: string | null = null;

/**
 * Dynamically injects the webmanifest JSON Blob into the document head,
 * overriding the static manifest so changes in Admin Settings (Display Mode, Theme Color, App Name)
 * take effect instantly in the browser without rebuilding or redeploying.
 */
export function syncDynamicManifest(settings?: Partial<Settings>): void {
  if (typeof document === 'undefined') return;

  const manifestData = buildWebManifest(settings);
  const manifestString = JSON.stringify(manifestData, null, 2);

  // Revoke previously created object URL to prevent memory leaks
  if (activeBlobUrl) {
    try {
      URL.revokeObjectURL(activeBlobUrl);
    } catch (_) {}
  }

  const blob = new Blob([manifestString], { type: 'application/manifest+json' });
  activeBlobUrl = URL.createObjectURL(blob);

  // Update or create <link rel="manifest">
  let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
  if (!manifestLink) {
    manifestLink = document.createElement('link');
    manifestLink.rel = 'manifest';
    document.head.appendChild(manifestLink);
  }
  manifestLink.href = activeBlobUrl;

  // Also update theme-color meta tag
  let themeColorMeta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
  if (!themeColorMeta) {
    themeColorMeta = document.createElement('meta');
    themeColorMeta.name = 'theme-color';
    document.head.appendChild(themeColorMeta);
  }
  themeColorMeta.content = manifestData.theme_color;

  // Update apple-mobile-web-app-title
  let appleTitleMeta = document.querySelector('meta[name="apple-mobile-web-app-title"]') as HTMLMetaElement | null;
  if (!appleTitleMeta) {
    appleTitleMeta = document.createElement('meta');
    appleTitleMeta.name = 'apple-mobile-web-app-title';
    document.head.appendChild(appleTitleMeta);
  }
  appleTitleMeta.content = manifestData.short_name;

  // Update application-name
  let appNameMeta = document.querySelector('meta[name="application-name"]') as HTMLMetaElement | null;
  if (!appNameMeta) {
    appNameMeta = document.createElement('meta');
    appNameMeta.name = 'application-name';
    document.head.appendChild(appNameMeta);
  }
  appNameMeta.content = manifestData.name;

  // Handle Display Mode DOM classes and dynamic Fullscreen API
  applyDisplayModeRuntime(manifestData.display, settings?.pwaForceFullscreenInStandalone);
}

/**
 * Applies runtime display mode adaptations (e.g. fullscreen triggers, safe-area attributes,
 * CSS variables, and native browser fullscreen controls when user chooses fullscreen mode).
 */
export function applyDisplayModeRuntime(
  displayMode: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser',
  forceFullscreenInStandalone = false
): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const body = document.body;

  // Set data-display-mode attribute for CSS styling
  root.setAttribute('data-pwa-display-mode', displayMode);
  body.classList.remove('pwa-standalone', 'pwa-fullscreen', 'pwa-minimal-ui', 'pwa-browser');
  body.classList.add(`pwa-${displayMode}`);

  // Check if currently running in standalone display mode
  const isRunningStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;

  if (displayMode === 'fullscreen' || (forceFullscreenInStandalone && isRunningStandalone)) {
    root.classList.add('pwa-mode-fullscreen');
    
    // Add user interaction listener for requestFullscreen if eligible
    const enterFullscreenOnTap = () => {
      if (document.fullscreenElement) return;
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    };

    // Attach once for first touch/click in fullscreen mode
    window.addEventListener('click', enterFullscreenOnTap, { once: true });
    window.addEventListener('touchstart', enterFullscreenOnTap, { once: true });
  } else {
    root.classList.remove('pwa-mode-fullscreen');
  }
}
