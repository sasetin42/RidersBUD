import React, { useMemo } from 'react';
import { useDatabase } from '../context/DatabaseContext';

interface AppLoadingScreenProps {
    message?: string;
    fullScreen?: boolean;
    logo?: string;
}

const AppLoadingScreen: React.FC<AppLoadingScreenProps> = ({
    fullScreen = true,
    logo
}) => {
    const { db } = useDatabase();

    // Read cached settings immediately so the uploaded appearance/loading logo renders on frame 1
    const cachedSettings = useMemo(() => {
        try {
            const raw = localStorage.getItem('ridersbud_settings_cache');
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }, []);

    // Explicit Priority Order requested by user:
    // 1. Explicit prop `logo` (if passed)
    // 2. `loadingLogoUrl` (uploaded under Appearance -> "Loading Screen Badge")
    // 3. `splashLogoUrl` (uploaded under Appearance -> "Splash / Launch Screen")
    // 4. `pwaSplashLogoUrl` (uploaded under PWA Settings)
    // 5. `appLogoUrl` (uploaded under General -> "App Logo")
    // 6. Default official branded PNG icon
    const logoUrl = 
        logo || 
        db?.settings?.loadingLogoUrl || 
        cachedSettings?.loadingLogoUrl ||
        db?.settings?.splashLogoUrl || 
        cachedSettings?.splashLogoUrl ||
        db?.settings?.pwaSplashLogoUrl || 
        cachedSettings?.pwaSplashLogoUrl ||
        db?.settings?.appLogoUrl || 
        cachedSettings?.appLogoUrl ||
        "/icons/icon-192.png";

    const tagline = 
        db?.settings?.pwaSplashTagline || 
        cachedSettings?.pwaSplashTagline ||
        db?.settings?.appTagline || 
        cachedSettings?.appTagline ||
        "Trusted Car Care Wherever You Are";

    const bgColor = 
        db?.settings?.pwaBackgroundColor || 
        cachedSettings?.pwaBackgroundColor ||
        "#0A0A0A";

    const containerClass = fullScreen
        ? 'fixed inset-0 z-[9999] flex flex-col items-center justify-center min-h-screen'
        : 'flex flex-col items-center justify-center min-h-[60vh]';

    return (
        <div 
            className={`${containerClass} overflow-hidden select-none transition-colors duration-300`}
            style={{ backgroundColor: bgColor }}
        >
            <div className="flex flex-col items-center justify-center relative">
                <div className="relative flex items-center justify-center mb-6 w-48 h-48">
                    {/* Pulsing depth glow */}
                    <div className="absolute w-44 h-44 rounded-full bg-primary/10 blur-3xl animate-pulse" />
                    
                    {/* Structural guide ring */}
                    <div className="absolute w-40 h-40 rounded-full border border-white/5" />
                    
                    {/* Smooth rotating gradient segment */}
                    <div className="absolute w-36 h-36 rounded-full border-2 border-t-primary border-r-primary border-b-transparent border-l-transparent animate-spin" />
                    
                    {/* Inner App Logo Badge */}
                    {logoUrl && (
                        <div className="absolute inset-0 flex items-center justify-center z-10">
                            <div className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center bg-black/50 border border-white/10 shadow-inner p-2">
                                <img 
                                    src={logoUrl} 
                                    alt="Loading..." 
                                    className="w-full h-full object-contain rounded-full animate-pulse" 
                                    onError={(e) => {
                                        const target = e.currentTarget;
                                        if (!target.src.endsWith('/icons/icon-192.png') && !target.src.endsWith('/favicon.png')) {
                                            target.src = '/icons/icon-192.png';
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </div>
                <p className="text-gray-400 text-sm font-semibold tracking-wider text-center px-4">
                    {tagline}
                </p>
            </div>
        </div>
    );
};

export default AppLoadingScreen;
