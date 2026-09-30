import { App as CapApp } from '@capacitor/app';

export type SuspendEvent = 
  | 'app_sleep' 
  | 'app_resume' 
  | 'power_button_locked' 
  | 'power_button_unlocked' 
  | 'incoming_call_interrupt' 
  | 'call_interrupt_ended';

type SuspendListener = (event: SuspendEvent, details?: any) => void;

class SuspendManager {
  private listeners: Set<SuspendListener> = new Set();
  private isSuspended = false;
  private isInterruptedByCall = false;
  private wakeLock: any = null;
  private lastActiveTimestamp = Date.now();

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window === 'undefined') return;

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.handleSuspend('app_sleep');
      } else {
        this.handleResume('app_resume');
      }
    });

    window.addEventListener('blur', () => {
      // In web desktop/browser, switching windows or clicking devtools triggers window.blur.
      // Only treat as cellular call interruption if document is still visible AND on mobile/native or specifically desired.
      const timeSinceActive = Date.now() - this.lastActiveTimestamp;
      if (!document.hidden && timeSinceActive > 1500) {
        this.handleCallInterruption();
      }
    });

    window.addEventListener('focus', () => {
      this.lastActiveTimestamp = Date.now();
      if (this.isInterruptedByCall) {
        this.handleCallInterruptionEnd();
      }
    });

    window.addEventListener('freeze' as any, () => {
      this.handleSuspend('power_button_locked');
    });

    window.addEventListener('resume' as any, () => {
      this.handleResume('power_button_unlocked');
    });

    import('@capacitor/core').then(({ Capacitor }) => {
      if (Capacitor.isNativePlatform()) {
        try {
          CapApp.addListener('appStateChange', ({ isActive }) => {
            if (!isActive) {
              this.handleSuspend('app_sleep');
            } else {
              this.handleResume('app_resume');
            }
          });
        } catch (e) {
          console.warn('[SuspendManager] Capacitor App listener unavailable, relying on web APIs:', e);
        }
      }
    }).catch(() => {});
  }

  async requestWakeLock(): Promise<boolean> {
    try {
      if ('wakeLock' in navigator && (navigator as any).wakeLock) {
        this.wakeLock = await (navigator as any).wakeLock.request('screen');
        this.wakeLock.addEventListener('release', () => {
          this.wakeLock = null;
        });
        return true;
      }
    } catch (err) {
      console.warn('[SuspendManager] Screen Wake Lock not available or denied:', err);
    }
    return false;
  }

  releaseWakeLock() {
    try {
      if (this.wakeLock) {
        this.wakeLock.release().catch(() => {});
        this.wakeLock = null;
      }
    } catch (e) {
      console.warn('[SuspendManager] Error releasing wake lock:', e);
    }
  }

  private handleSuspend(type: SuspendEvent) {
    this.isSuspended = true;
    this.notify(type);
  }

  private handleResume(type: SuspendEvent) {
    this.isSuspended = false;
    this.lastActiveTimestamp = Date.now();
    this.notify(type);
  }

  private handleCallInterruption() {
    this.isInterruptedByCall = true;
    this.notify('incoming_call_interrupt');
  }

  private handleCallInterruptionEnd() {
    this.isInterruptedByCall = false;
    this.notify('call_interrupt_ended');
  }

  subscribe(listener: SuspendListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(event: SuspendEvent, details?: any) {
    this.listeners.forEach((listener) => {
      try {
        listener(event, details);
      } catch (err) {
        console.error('[SuspendManager] Listener error:', err);
      }
    });
  }

  get state() {
    return {
      isSuspended: this.isSuspended,
      isInterruptedByCall: this.isInterruptedByCall,
    };
  }
}

export const suspendManager = new SuspendManager();