import React from 'react';
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

    const logoUrl = logo || db?.settings.loadingLogoUrl || db?.settings.splashLogoUrl || "/riders-logo.png";
    const tagline = db?.settings.appTagline || "Trusted Car Care Wherever You Are";

    const containerClass = fullScreen
        ? 'fixed inset-0 z-[9999] flex flex-col items-center justify-center min-h-screen'
        : 'flex flex-col items-center justify-center min-h-[60vh]';

    return (
        <div className={`${containerClass} bg-[#0A0A0A] overflow-hidden select-none`}>
            <div className="flex flex-col items-center justify-center relative">
                <div className="relative flex items-center justify-center mb-6 w-48 h-48">
                    {/* Pulsing depth glow */}
                    <div className="absolute w-44 h-44 rounded-full bg-primary/10 blur-3xl animate-pulse" />
                    
                    {/* Structural guide ring */}
                    <div className="absolute w-40 h-40 rounded-full border border-white/5" />
                    
                    {/* Smooth rotating gradient segment */}
                    <div className="absolute w-36 h-36 rounded-full border-2 border-t-primary border-r-primary border-b-transparent border-l-transparent animate-spin" />
                    
                    {/* Inner App Logo */}
                    {logoUrl && (
                        <div className="absolute inset-0 flex items-center justify-center z-10">
                            <div className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center bg-black/40 border border-white/10 shadow-inner">
                                <img 
                                    src={logoUrl} 
                                    alt="Loading..." 
                                    className="w-full h-full object-cover rounded-full animate-pulse" 
                                    onError={(e) => {
                                        const target = e.currentTarget;
                                        if (!target.src.endsWith('/riders-logo.png')) {
                                            target.src = '/riders-logo.png';
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
