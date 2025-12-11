import React from 'react';
import { useDatabase } from '../context/DatabaseContext';

const SplashScreen: React.FC = () => {
    const { db } = useDatabase();

    // Use a default logo while the database is loading or if it's not set
    // Use a default logo while the database is loading or if it's not set
    const defaultLogo = "https://storage.googleapis.com/aistudio-hosting/generative-ai/e499715a-a38f-4d32-80f2-9b2512f7a6b2/assets/RidersBUD_logo.png";

    // Helper to validate valid image source
    const isValidUrl = (url?: string) => url && (url.trim().length > 0) && (url.startsWith('http') || url.startsWith('data:image'));

    const splashLogo = db?.settings?.brandingAssets?.splashLogoUrl;
    const generalLogo = db?.settings?.appLogoUrl;

    const logoUrl = isValidUrl(splashLogo) ? splashLogo : (isValidUrl(generalLogo) ? generalLogo : defaultLogo);
    const tagline = db?.settings?.appTagline || "Trusted Car Care Wherever You Are";

    return (
        <div className="flex flex-col items-center justify-center h-screen w-screen bg-secondary">
            <img
                src={logoUrl}
                alt="RidersBUD Logo"
                className="w-64 animate-pulse"
                style={{ filter: 'drop-shadow(0 0 15px rgba(254, 120, 3, 0.6))' }}
            />
            <p className="text-light-gray mt-4">{tagline}</p>
        </div>
    );
};

export default SplashScreen;