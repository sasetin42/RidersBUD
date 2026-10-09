import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-red-600 via-amber-600 to-red-600 text-white text-xs font-semibold px-4 py-2 flex items-center justify-between shadow-lg">
      <div className="flex items-center gap-2 max-w-screen-md mx-auto w-full justify-between">
        <div className="flex items-center gap-2">
          <WifiOff className="w-4 h-4 animate-pulse flex-shrink-0" />
          <span>You are currently offline. Changes may not synchronize until you reconnect.</span>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-1 bg-black/20 hover:bg-black/30 px-2 py-1 rounded text-[11px] font-bold uppercase transition flex-shrink-0"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Retry</span>
        </button>
      </div>
    </div>
  );
};
