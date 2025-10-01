import React from 'react';
import { getSettings } from '../data/mockData';

const SplashScreen: React.FC = () => {
    const settings = getSettings();
    const logoUrl = settings.splashLogoUrl || "https://storage.googleapis.com/aistudio-hosting/generative-ai/e499715a-a38f-4d32-80f2-9b2512f7a6b2/assets/RidersBUD_logo.png";

    return (
        <div className="flex flex-col items-center justify-center h-screen w-screen bg-secondary">
            <img 
                src={logoUrl}
                alt="RidersBUD Logo"
                className="w-64 animate-pulse"
                style={{ filter: 'drop-shadow(0 0 15px rgba(254, 120, 3, 0.6))' }}
            />
            <p className="text-light-gray mt-4">Your trusted partner on the road.</p>
        </div>
    );
};

export default SplashScreen;