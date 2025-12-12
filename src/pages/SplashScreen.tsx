import React, { useState, useEffect } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import ridersBudLogo from '../assets/ridersbud-logo.png';

const SplashScreen: React.FC = () => {
    const { db } = useDatabase();
    const [imageLoaded, setImageLoaded] = useState(false);

    // Use the new RidersBUD logo as default
    const defaultLogo = ridersBudLogo;

    // Helper to validate valid image source
    const isValidUrl = (url?: string) => url && (url.trim().length > 0) && (url.startsWith('http') || url.startsWith('data:image'));

    const splashLogo = db?.settings?.brandingAssets?.splashLogoUrl;
    const generalLogo = db?.settings?.appLogoUrl;

    // Prioritize: custom splash logo > general logo > new RidersBUD logo
    const logoUrl = isValidUrl(splashLogo) ? splashLogo : (isValidUrl(generalLogo) ? generalLogo : defaultLogo);
    const tagline = db?.settings?.appTagline || "Trusted Car Care Wherever You Are";

    // Preload image for instant display
    useEffect(() => {
        const img = new Image();
        img.src = typeof logoUrl === 'string' ? logoUrl : defaultLogo;
        img.onload = () => setImageLoaded(true);
        img.onerror = () => setImageLoaded(true); // Still show even if error
    }, [logoUrl]);

    return (
        <div className="flex flex-col items-center justify-center h-screen w-screen bg-gradient-to-br from-secondary via-secondary to-dark-gray">
            {/* Animated background circles */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary opacity-10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary opacity-5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>

            {/* Logo container */}
            <div className={`relative z-10 transition-all duration-700 ${imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
                <img
                    src={typeof logoUrl === 'string' ? logoUrl : defaultLogo}
                    alt="RidersBUD Logo"
                    className="w-80 md:w-96 animate-fadeIn"
                    style={{
                        filter: 'drop-shadow(0 0 30px rgba(254, 120, 3, 0.4))',
                        animation: 'fadeIn 0.8s ease-out'
                    }}
                />
            </div>

            {/* Tagline */}
            <p className="relative z-10 text-light-gray mt-8 text-lg font-medium animate-fadeIn" style={{ animationDelay: '0.3s' }}>
                {tagline}
            </p>

            {/* Loading indicator */}
            <div className="relative z-10 mt-8 flex gap-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
        </div>
    );
};

export default SplashScreen;