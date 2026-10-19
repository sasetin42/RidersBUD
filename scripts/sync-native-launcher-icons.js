import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Android mipmap target dimensions (ic_launcher square & round)
const androidMipmaps = [
  { dir: 'mipmap-mdpi', size: 48 },
  { dir: 'mipmap-hdpi', size: 72 },
  { dir: 'mipmap-xhdpi', size: 96 },
  { dir: 'mipmap-xxhdpi', size: 144 },
  { dir: 'mipmap-xxxhdpi', size: 192 }
];

// Android Splash Screens (Replacing default Capacitor blue logos)
const androidSplashScreens = [
  { relPath: 'android/app/src/main/res/drawable/splash.png', width: 480, height: 320 },
  { relPath: 'android/app/src/main/res/drawable-port-mdpi/splash.png', width: 320, height: 480 },
  { relPath: 'android/app/src/main/res/drawable-port-hdpi/splash.png', width: 480, height: 800 },
  { relPath: 'android/app/src/main/res/drawable-port-xhdpi/splash.png', width: 720, height: 1280 },
  { relPath: 'android/app/src/main/res/drawable-port-xxhdpi/splash.png', width: 960, height: 1600 },
  { relPath: 'android/app/src/main/res/drawable-port-xxxhdpi/splash.png', width: 1280, height: 1920 },
  { relPath: 'android/app/src/main/res/drawable-land-mdpi/splash.png', width: 480, height: 320 },
  { relPath: 'android/app/src/main/res/drawable-land-hdpi/splash.png', width: 800, height: 480 },
  { relPath: 'android/app/src/main/res/drawable-land-xhdpi/splash.png', width: 1280, height: 720 },
  { relPath: 'android/app/src/main/res/drawable-land-xxhdpi/splash.png', width: 1600, height: 960 },
  { relPath: 'android/app/src/main/res/drawable-land-xxxhdpi/splash.png', width: 1920, height: 1280 }
];

// Android Notification icons (FCM status bar tray icon)
const androidNotificationDrawables = [
  { dir: 'drawable-mdpi', size: 24 },
  { dir: 'drawable-hdpi', size: 36 },
  { dir: 'drawable-xhdpi', size: 48 },
  { dir: 'drawable-xxhdpi', size: 72 },
  { dir: 'drawable-xxxhdpi', size: 96 }
];

// iOS AppIcon target dimensions
const iosIcons = [
  { name: 'AppIcon-512@2x.png', size: 1024 }
];

// iOS Splash Images
const iosSplashImages = [
  'ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png',
  'ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-1.png',
  'ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-2.png'
];

// Web / PWA icon targets
const webIcons = [
  { relPath: 'public/icons/icon-192.png', size: 192 },
  { relPath: 'public/icons/icon-512.png', size: 512 },
  { relPath: 'public/icons/icon-maskable-512.png', size: 512 },
  { relPath: 'public/icons/apple-touch-icon-180.png', size: 180 },
  { relPath: 'public/favicon.png', size: 64 },
  { relPath: 'public/favicon-32x32.png', size: 32 },
  { relPath: 'public/favicon-16x16.png', size: 16 }
];

export async function syncNativeLauncherIcons(customInputPath) {
  let sourcePath = customInputPath;

  if (!sourcePath || !fs.existsSync(sourcePath)) {
    // Check candidate sources in priority order
    const candidates = [
      path.join(rootDir, 'public', 'assets', 'logo.png'),
      path.join(rootDir, 'public', 'riders-logo.png'),
      path.join(rootDir, 'public', 'icons', 'icon-512.png'),
      path.join(rootDir, 'public', 'favicon.png')
    ];

    for (const c of candidates) {
      if (fs.existsSync(c)) {
        sourcePath = c;
        break;
      }
    }
  }

  if (!sourcePath || !fs.existsSync(sourcePath)) {
    console.error('❌ No valid source launcher icon found to synchronize.');
    process.exit(1);
  }

  console.log(`🚀 Synchronizing Native Mobile Launcher & Splash Assets from: ${sourcePath}`);
  const sourceBuffer = fs.readFileSync(sourcePath);

  // 1. Android Mipmap Icons
  const androidResDir = path.join(rootDir, 'android', 'app', 'src', 'main', 'res');
  if (fs.existsSync(androidResDir)) {
    for (const item of androidMipmaps) {
      const targetDir = path.join(androidResDir, item.dir);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // Generate standard launcher icon
      const targetIcon = path.join(targetDir, 'ic_launcher.png');
      await sharp(sourceBuffer)
        .resize(item.size, item.size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(targetIcon);

      // Generate round launcher icon
      const targetRoundIcon = path.join(targetDir, 'ic_launcher_round.png');
      await sharp(sourceBuffer)
        .resize(item.size, item.size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(targetRoundIcon);

      // Generate foreground icon for adaptive icon format
      // Scale source to 72% with 14% transparent padding around it
      const targetForeground = path.join(targetDir, 'ic_launcher_foreground.png');
      const innerSize = Math.round(item.size * 0.72);
      const pad = Math.round(item.size * 0.14);

      await sharp(sourceBuffer)
        .resize(innerSize, innerSize, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .extend({
          top: pad,
          bottom: pad,
          left: pad,
          right: pad,
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(targetForeground);

      console.log(`  ✅ Android ${item.dir} (${item.size}x${item.size}) generated`);
    }

    // 2. Android Notification Tray Icons for FCM (ic_notification in drawable and drawable-* folders)
    // Create base drawable/ic_notification.png (48x48)
    const baseDrawableDir = path.join(androidResDir, 'drawable');
    if (fs.existsSync(baseDrawableDir)) {
      await sharp(sourceBuffer)
        .resize(48, 48, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(path.join(baseDrawableDir, 'ic_notification.png'));
      console.log(`  ✅ Android drawable/ic_notification.png generated`);
    }

    for (const notif of androidNotificationDrawables) {
      const nDir = path.join(androidResDir, notif.dir);
      if (!fs.existsSync(nDir)) {
        fs.mkdirSync(nDir, { recursive: true });
      }
      await sharp(sourceBuffer)
        .resize(notif.size, notif.size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(path.join(nDir, 'ic_notification.png'));
      console.log(`  ✅ Android ${notif.dir}/ic_notification.png (${notif.size}x${notif.size}) generated`);
    }

    // 3. Android Splash Screens (Dark #0A0A0C background with centered RidersBUD logo)
    for (const splash of androidSplashScreens) {
      const targetSplash = path.join(rootDir, splash.relPath);
      const parentDir = path.dirname(targetSplash);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }

      // Calculate centered logo sizing (approx 35% of min dimension)
      const minDim = Math.min(splash.width, splash.height);
      const logoSize = Math.max(120, Math.round(minDim * 0.35));

      const logoBuffer = await sharp(sourceBuffer)
        .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();

      await sharp({
        create: {
          width: splash.width,
          height: splash.height,
          channels: 4,
          background: { r: 10, g: 10, b: 12, alpha: 1 } // #0A0A0C
        }
      })
        .composite([{ input: logoBuffer, gravity: 'center' }])
        .png()
        .toFile(targetSplash);

      console.log(`  ✅ Android Splash ${splash.relPath} (${splash.width}x${splash.height}) updated`);
    }
  }

  // 4. iOS AppIcon Catalog (App Store strictly forbids alpha channel / transparency in 1024x1024 icon)
  const iosAppIconDir = path.join(rootDir, 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset');
  if (fs.existsSync(iosAppIconDir)) {
    for (const item of iosIcons) {
      const targetIos = path.join(iosAppIconDir, item.name);
      const innerLogoSize = Math.round(item.size * 0.78);
      const resizedLogo = await sharp(sourceBuffer)
        .resize(innerLogoSize, innerLogoSize, { fit: 'contain', background: { r: 10, g: 10, b: 12, alpha: 1 } })
        .png()
        .toBuffer();

      await sharp({
        create: {
          width: item.size,
          height: item.size,
          channels: 3,
          background: { r: 10, g: 10, b: 12 } // Solid #0A0A0C (RGB, no alpha channel)
        }
      })
        .composite([{ input: resizedLogo, gravity: 'center' }])
        .flatten({ background: { r: 10, g: 10, b: 12 } })
        .removeAlpha()
        .png()
        .toFile(targetIos);
      console.log(`  ✅ iOS ${item.name} (${item.size}x${item.size}, opaque RGB for App Store) generated`);
    }
  }

  // 5. iOS Splash Images
  for (const iosSplashRel of iosSplashImages) {
    const fullPath = path.join(rootDir, iosSplashRel);
    if (fs.existsSync(path.dirname(fullPath))) {
      const logoBuffer = await sharp(sourceBuffer)
        .resize(800, 800, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();

      await sharp({
        create: {
          width: 2732,
          height: 2732,
          channels: 4,
          background: { r: 10, g: 10, b: 12, alpha: 1 } // #0A0A0C
        }
      })
        .composite([{ input: logoBuffer, gravity: 'center' }])
        .png()
        .toFile(fullPath);

      console.log(`  ✅ iOS Splash ${iosSplashRel} (2732x2732) updated`);
    }
  }

  // 6. Web & PWA Manifest Assets
  for (const item of webIcons) {
    const targetWeb = path.join(rootDir, item.relPath);
    const parentDir = path.dirname(targetWeb);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    await sharp(sourceBuffer)
      .resize(item.size, item.size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(targetWeb);
    console.log(`  ✅ Web/PWA ${item.relPath} (${item.size}x${item.size}) updated`);
  }

  console.log('🎉 All Android, iOS, Splash & FCM Notification Icons have been completely synchronized!');
}

// Auto-run if executed directly via CLI
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const customArg = process.argv[2];
  syncNativeLauncherIcons(customArg).catch((err) => {
    console.error('Error generating launcher icons:', err);
    process.exit(1);
  });
}
