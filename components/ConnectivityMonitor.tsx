import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { onSnapshot, doc } from 'firebase/firestore';

const ConnectivityMonitor: React.FC = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isFirebaseConnected, setIsFirebaseConnected] = useState(true);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Firebase connection monitor
        const unsub = onSnapshot(doc(db, 'settings', 'main'), 
            () => setIsFirebaseConnected(true),
            () => setIsFirebaseConnected(false)
        );

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            unsub();
        };
    }, []);

    if (isOnline && isFirebaseConnected) return null;

    return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] animate-bounce">
            <div className={`px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 border ${
                !isOnline 
                    ? 'bg-red-500/90 text-white border-red-400' 
                    : 'bg-yellow-500/90 text-black border-yellow-400'
            }`}>
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="text-xs font-black tracking-widest uppercase">
                    {!isOnline ? 'Offline: Check Internet' : 'Connecting to Live Database...'}
                </span>
            </div>
        </div>
    );
};

export default ConnectivityMonitor;
