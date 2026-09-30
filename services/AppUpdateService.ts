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
      }

      let remoteInfo: AppVersionInfo | null = null;

      // 2. First check realtime Firestore `settings` doc if accessible (Realtime Admin Control)
      // Check both 'settings/main' (where AdminSettingsScreen saves) and fallback to 'settings/app'
      try {
        if (db) {
          const mainSettingsRef = doc(db, 'settings', 'main');
          const mainSettingsSnap = await getDoc(mainSettingsRef);
          if (mainSettingsSnap.exists()) {
            const data = mainSettingsSnap.data();
            if (data?.appUpdateConfig && data.appUpdateConfig.versionCode) {
              remoteInfo = data.appUpdateConfig as AppVersionInfo;
            }
          }

          if (!remoteInfo) {
            const appSettingsRef = doc(db, 'settings', 'app');
            const appSettingsSnap = await getDoc(appSettingsRef);
            if (appSettingsSnap.exists()) {
              const data = appSettingsSnap.data();
              if (data?.appUpdateConfig && data.appUpdateConfig.versionCode) {
                remoteInfo = data.appUpdateConfig as AppVersionInfo;
              }
            }
          }
        }
      } catch (firestoreErr) {
        // Firestore read failed, will fallback to version.json
      }

      // 3. Fallback to /version.json if Firestore didn't provide update metadata
      if (!remoteInfo) {
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
          remoteInfo = await response.json();
        }
      }

      if (!remoteInfo) {
        return { updateAvailable: false, currentVersion: currentVersionName, shouldShowModal: false };
      }

      // Normalize apkUrl if relative or empty
      if (!remoteInfo.apkUrl) {
        remoteInfo.apkUrl = remoteInfo.externalDownloadUrl || DEFAULT_LATEST_APK_URL;
      } else if (remoteInfo.apkUrl.startsWith('/')) {
        const base = typeof window !== 'undefined' ? window.location.origin : 'https://ridersbud-10806.web.app';
        remoteInfo.apkUrl = `${base}${remoteInfo.apkUrl}`;
      }

      // 4. Compare version code
      const isNewer = remoteInfo.versionCode > currentVersionCode;

      // 5. Evaluate Customizable Visibility & Target Audience
      // If admin explicitly set showUpdateModal to false, or targetAudience is 'none', modal is hidden
      let shouldShowModal = isNewer;
      if (remoteInfo.showUpdateModal === false) {
        shouldShowModal = false;
      } else if (remoteInfo.targetAudience === 'none') {
        shouldShowModal = false;
      } else if (remoteInfo.targetAudience && userRole) {
        if (remoteInfo.targetAudience === 'customers' && userRole !== 'customer') {
          shouldShowModal = false;
        } else if (remoteInfo.targetAudience === 'mechanics' && userRole !== 'mechanic') {
          shouldShowModal = false;
        }
      }

      return {
        updateAvailable: isNewer,
        currentVersion: currentVersionName,
        latestVersion: isNewer ? remoteInfo : undefined,
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
