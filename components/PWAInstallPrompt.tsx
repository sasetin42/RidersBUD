import React, { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare, Smartphone, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';
import { useDatabase } from '../context/DatabaseContext';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const DISMISS_KEY = 'ridersbud_pwa_prompt_dismissed_until';

export const PWAInstallPrompt: React.FC = () => {
  const { db } = useDatabase();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Dynamic admin custom settings with defaults
  const customTitle = db?.settings?.pwaInstallModalTitle || 'Experience RidersBUD on Mobile';
  const customSubtitle = db?.settings?.pwaInstallModalSubtitle || 'Install the mobile application for live GPS tracking, instant mechanic alerts, and offline access.';
  const customLogo = db?.settings?.pwaLogoUrl || db?.settings?.pwaIcon192Url || db?.settings?.appLogoUrl || '/icons/icon-192.png';
  const customApkUrl = db?.settings?.pwaApkDownloadUrl || '/releases/RidersBUD-latest.apk';
  const customDelay = typeof db?.settings?.pwaAutoPromptDelaySeconds === 'number' 
    ? db.settings.pwaAutoPromptDelaySeconds * 1000 
    : 1500;

  useEffect(() => {
    // 1. Detect if running as standalone PWA or native webview (Capacitor)
    const isStandaloneMode = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    setIsStandalone(isStandaloneMode);
    if (isStandaloneMode) return;

    // Detect device operating system
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua) && !(window as any).MSStream;
    const isAndroidDevice = /android/.test(ua);
    setIsIOS(isIosDevice);
    setIsAndroid(isAndroidDevice);

    // 2. Check dismissal cooldown (default 24h cooldown if dismissed)
    try {
      const dismissedUntil = localStorage.getItem(DISMISS_KEY);
      if (dismissedUntil && Date.now() < Number(dismissedUntil)) {
        // Still in cooldown, but allow user to open manually via event
      } else {
        // Reveal pop-up modal smoothly after custom delay on landing
        const initialTimer = setTimeout(() => {
          setIsModalOpen(true);
        }, customDelay);
        return () => clearTimeout(initialTimer);
      }
    } catch {
      setIsModalOpen(true);
    }

    // 3. Listen for Chromium beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Global event listener to allow header, menu, or settings buttons to trigger modal anytime
    const handleTriggerPrompt = () => {
      setIsModalOpen(true);
    };
    window.addEventListener('open-pwa-install', handleTriggerPrompt);

    // Listen for appinstalled
    const handleAppInstalled = () => {
      setIsModalOpen(false);
      setDeferredPrompt(null);
      try {
        localStorage.removeItem(DISMISS_KEY);
      } catch {}
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('open-pwa-install', handleTriggerPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [customDelay]);

  const handleDismiss = () => {
    setIsModalOpen(false);
    try {
      // Cooldown for 24 hours if user clicks 'Maybe Later' or close
      const coolOff = Date.now() + 24 * 60 * 60 * 1000;
      localStorage.setItem(DISMISS_KEY, coolOff.toString());
    } catch {}
  };

  const handlePWAInstall = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setIsModalOpen(false);
        } else {
          handleDismiss();
        }
      } catch (err) {
        console.warn('[PWA] Installation prompt error:', err);
      } finally {
        setDeferredPrompt(null);
      }
    } else {
      // Fallback for browsers without direct programmatic prompt
      if (isAndroid) {
        window.location.href = customApkUrl;
      } else {
        alert("To install RidersBUD, tap your browser's menu (⋮) and select 'Install app' or 'Add to Home screen'.");
      }
      setIsModalOpen(false);
    }
  };

  const handleDownloadAPK = () => {
    window.location.href = customApkUrl;
    setIsModalOpen(false);
  };

  // Do not render anything if running inside standalone installed PWA
  if (isStandalone || (!isModalOpen && !showIOSModal)) {
    return null;
  }

  return (
    <>
      {/* Primary High-Impact Download & Install Modal */}
      {isModalOpen && !showIOSModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-sm bg-[#141419] border border-[#FE7803]/40 rounded-3xl p-6 shadow-2xl shadow-black relative text-center">
            
            {/* Close / Dismiss Button */}
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-2 rounded-full hover:bg-zinc-800/80 transition"
              aria-label="Close download modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Official App Logo */}
            <div className="w-20 h-20 rounded-2xl bg-[#1E1E26] border-2 border-[#FE7803]/50 p-2 mx-auto mb-4 flex items-center justify-center shadow-xl shadow-[#FE7803]/20">
              <img
                src={customLogo}
                alt="RidersBUD"
                className="w-full h-full object-contain rounded-xl"
                onError={(e) => { (e.target as HTMLElement).setAttribute('src', '/favicon.png'); }}
              />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FE7803]/15 text-[#FE7803] text-xs font-bold uppercase tracking-wider mb-2 border border-[#FE7803]/30">
              <Smartphone className="w-3.5 h-3.5" />
              <span>Official Mobile App</span>
            </div>

            <h3 className="text-xl font-extrabold text-white mb-1.5">
              {customTitle}
            </h3>
            
            <p className="text-zinc-400 text-xs mb-5 leading-relaxed">
              {customSubtitle}
            </p>

            {/* Highlights Grid */}
            <div className="grid grid-cols-2 gap-2 text-left bg-[#1B1B22] p-3 rounded-2xl border border-[#2A2A35] mb-5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#FE7803] flex-shrink-0" />
                <span className="text-[11px] text-zinc-300 font-medium">Faster Booking</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#FE7803] flex-shrink-0" />
                <span className="text-[11px] text-zinc-300 font-medium">Live GPS Map</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#FE7803] flex-shrink-0" />
                <span className="text-[11px] text-zinc-300 font-medium">Secure Payments</span>
              </div>
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-[#FE7803] flex-shrink-0" />
                <span className="text-[11px] text-zinc-300 font-medium">Offline Ready</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5">
              <button
                onClick={handlePWAInstall}
                className="w-full bg-[#FE7803] hover:bg-[#E06800] active:scale-[0.98] text-white font-bold py-3.5 px-4 rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#FE7803]/30 transition"
              >
                <Smartphone className="w-4 h-4" />
                <span>{isIOS ? 'Install on iPhone / iPad' : 'Install Mobile App'}</span>
              </button>

              {/* Android Native APK Option */}
              {isAndroid && (
                <button
                  onClick={handleDownloadAPK}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 active:scale-[0.98] text-zinc-200 font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 border border-zinc-700 transition"
                >
                  <Download className="w-3.5 h-3.5 text-[#FE7803]" />
                  <span>Download Android APK Directly</span>
                </button>
              )}

              <button
                onClick={handleDismiss}
                className="w-full text-zinc-500 hover:text-zinc-300 text-xs font-semibold py-2 transition"
              >
                Continue in Browser
              </button>
            </div>

          </div>
        </div>
      )}

      {/* iOS "Add to Home Screen" Instructions Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-[#141419] border border-[#26262E] rounded-3xl p-6 shadow-2xl shadow-black relative text-center">
            <button
              onClick={() => setShowIOSModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-2 rounded-full hover:bg-zinc-800 transition"
              aria-label="Close iOS guide"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 rounded-2xl bg-[#1E1E26] border border-[#FE7803]/30 p-2 mx-auto mb-4 flex items-center justify-center shadow-lg shadow-[#FE7803]/10">
              <img
                src={customLogo}
                alt="RidersBUD"
                className="w-full h-full object-contain rounded-xl"
                onError={(e) => { (e.target as HTMLElement).setAttribute('src', '/favicon.png'); }}
              />
            </div>

            <h3 className="text-xl font-bold text-white mb-2">Install on iPhone</h3>
            <p className="text-zinc-400 text-xs mb-5 px-2">
              Follow these simple steps in Safari to add RidersBUD to your Home Screen:
            </p>

            <div className="space-y-3 text-left bg-[#1B1B22] p-4 rounded-2xl border border-[#2A2A35] mb-6">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#FE7803]/20 text-[#FE7803] flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                  1
                </div>
                <div className="text-xs text-zinc-300">
                  Tap the <strong className="text-white inline-flex items-center gap-1 mx-1"><Share className="w-3.5 h-3.5 text-[#3B82F6]" /> Share</strong> button in Safari's toolbar.
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#FE7803]/20 text-[#FE7803] flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                  2
                </div>
                <div className="text-xs text-zinc-300">
                  Scroll down the action sheet and select <strong className="text-white inline-flex items-center gap-1 mx-1"><PlusSquare className="w-3.5 h-3.5 text-zinc-200" /> Add to Home Screen</strong>.
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#FE7803]/20 text-[#FE7803] flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                  3
                </div>
                <div className="text-xs text-zinc-300">
                  Tap <strong className="text-white mx-1">Add</strong> in the top-right corner to launch RidersBUD from your phone.
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setShowIOSModal(false);
                handleDismiss();
              }}
              className="w-full bg-[#FE7803] hover:bg-[#E06800] text-white font-bold py-3.5 px-4 rounded-xl text-sm transition shadow-lg shadow-[#FE7803]/25"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};
