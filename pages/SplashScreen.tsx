import React from 'react';
import { useDatabase } from '../context/DatabaseContext';

const SplashScreen: React.FC = () => {
    const { db } = useDatabase();

    // Use a default logo while the database is loading or if it's not set
    const logoUrl = "/riders-logo.png";
    const tagline = db?.settings.appTagline || "Trusted Car Care Wherever You Are";

    return (
        <div className="flex flex-col items-center justify-center h-screen w-screen bg-secondary">
            <img
                src={logoUrl}
                alt="RidersBUD Logo"
                className="w-56 h-auto mix-blend-screen"
                style={{ filter: 'drop-shadow(0 0 15px rgba(254, 120, 3, 0.6))' }}
            />
            <p className="text-light-gray mt-4">{tagline}</p>
        </div>
    );
};

export default SplashScreen;
