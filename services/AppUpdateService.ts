import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

export interface AppVersionInfo {
  versionCode: number;
  versionName: string;
  apkUrl: string;
  releaseNotes: string;
  mandatory: boolean;
  minSupportedVersionCode?: number;
  fileSizeMb?: string;
  showUpdateModal?: boolean;
  targetAudience?: 'all' | 'customers' | 'mechanics' | 'none';
  externalDownloadUrl?: string;
  allowRemindLater?: boolean;
}

export interface AppUpdateCheckResult {
  updateAvailable: boolean;
  currentVersion: string;
  latestVersion?: AppVersionInfo;
  shouldShowModal?: boolean;
}

// Remote endpoint where version info is stored
const UPDATE_METADATA_URL = 'https://ridersbud-10806.web.app/version.json';
export const DEFAULT_LATEST_APK_URL = 'https://ridersbud-10806.web.app/releases/RidersBUD-latest.apk';

// Web/PWA builds can never be updated via APK download. A huge sentinel
// versionCode guarantees `remoteInfo.versionCode > currentVersionCode` is
// always false on web, so the update modal can never appear there.
const WEB_SENTINEL_VERSION_CODE = 999999;

export class AppUpdateService {
  /**
   * Check if a newer version of RidersBUD is available remotely
   * @param userRole Optional role ('customer' | 'mechanic' | 'admin' | 'guest') to evaluate targetAudience
   */
  static async checkForUpdates(userRole?: string): Promise<AppUpdateCheckResult> {
    try {
      // 1. Get current native app info
      let currentVersionName = '1.0.0';
      let currentVersionCode = 1;

      // Only invoke native Capacitor App.getInfo() if running on a native platform (Android/iOS)
      if (Capacitor.isNativePlatform()) {
        try {
          const appInfo = await App.getInfo();
          currentVersionName = appInfo.version;
          currentVersionCode = parseInt(appInfo.build, 10) || 1;
        } catch {
          // Native getInfo fallback
        }
      } else {
        // Web/PWA: APK updates are meaningless — suppress via sentinel
        currentVersionCode = WEB_SENTINEL_VERSION_CODE;
        try {
          currentVersionName = import.meta.env.VITE_APP_VERSION || 'web';
        } catch {
          currentVersionName = 'web';
        }
      }

      // 2. Gather ALL candidate sources: Firestore settings/main + settings/app + version.json.
      //    Trust the HIGHEST versionCode among them so a stale config can never
      //    suppress a newer release announcement.
      const candidates: AppVersionInfo[] = [];

      try {
        if (db) {
          const mainSettingsRef = doc(db, 'settings', 'main');
          const mainSettingsSnap = await getDoc(mainSettingsRef);
          if (mainSettingsSnap.exists()) {
            const data = mainSettingsSnap.data();
            if (data?.appUpdateConfig && data.appUpdateConfig.versionCode) {
              candidates.push(data.appUpdateConfig as AppVersionInfo);
            }
          }

          const appSettingsRef = doc(db, 'settings', 'app');
          const appSettingsSnap = await getDoc(appSettingsRef);
          if (appSettingsSnap.exists()) {
            const data = appSettingsSnap.data();
            if (data?.appUpdateConfig && data.appUpdateConfig.versionCode) {
              candidates.push(data.appUpdateConfig as AppVersionInfo);
            }
          }
        }
      } catch (firestoreErr) {
        // Firestore read failed, will rely on version.json
      }

      // 3. version.json fallback / additional candidate
      {
        const isLocalWeb = typeof window !== 'undefined' &&
          (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

        const targetUrl = isLocalWeb ? `/version.json?t=${Date.now()}` : `${UPDATE_METADATA_URL}?t=${Date.now()}`;

        let response: Response | null = null;
        try {
          response = await fetch(targetUrl);
        } catch {
          if (!isLocalWeb) {
            try {
              response = await fetch(`/version.json?t=${Date.now()}`);
            } catch {
              // Offline fallback
            }
          }
        }

        if (response && response.ok) {
          try {
            const json = await response.json();
            if (json?.versionCode) candidates.push(json as AppVersionInfo);
          } catch {
            // malformed json — skip
          }
        }
      }

      if (candidates.length === 0) {
        return { updateAvailable: false, currentVersion: currentVersionName, shouldShowModal: false };
      }

      // Normalize each candidate's apkUrl
      for (const remoteInfo of candidates) {
        if (!remoteInfo.apkUrl) {
          remoteInfo.apkUrl = remoteInfo.externalDownloadUrl || DEFAULT_LATEST_APK_URL;
        } else if (remoteInfo.apkUrl.startsWith('/')) {
          const base = typeof window !== 'undefined' ? window.location.origin : 'https://ridersbud-10806.web.app';
          remoteInfo.apkUrl = `${base}${remoteInfo.apkUrl}`;
        }
      }

      // Trust the highest versionCode candidate
      const best = candidates.reduce((a, b) => ((b.versionCode || 0) > (a.versionCode || 0) ? b : a));

      // 4. Compare version code
      const isNewer = best.versionCode > currentVersionCode;

      // 5. Evaluate Customizable Visibility & Target Audience
      // If admin explicitly set showUpdateModal to false, or targetAudience is 'none', modal is hidden
      let shouldShowModal = isNewer;
      if (best.showUpdateModal === false) {
        shouldShowModal = false;
      } else if (best.targetAudience === 'none') {
        shouldShowModal = false;
      } else if (best.targetAudience && userRole) {
        if (best.targetAudience === 'customers' && userRole !== 'customer') {
          shouldShowModal = false;
        } else if (best.targetAudience === 'mechanics' && userRole !== 'mechanic') {
          shouldShowModal = false;
        }
      }

      return {
        updateAvailable: isNewer,
        currentVersion: currentVersionName,
        latestVersion: isNewer ? best : undefined,
        shouldShowModal
      };
    } catch {
      return { updateAvailable: false, currentVersion: '1.0.0', shouldShowModal: false };
    }
  }

  /**
   * Open direct APK download link in browser / download manager
   */
  static openDownloadUrl(apkUrl: string): void {
    if (apkUrl) {
      window.open(apkUrl, '_system');
    }
  }
}
