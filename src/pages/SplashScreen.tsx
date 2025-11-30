import React from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { motion } from 'framer-motion';

const SplashScreen: React.FC = () => {
    const { db } = useDatabase();

    // Use a default logo while the database is loading or if it's not set
    const defaultLogo = "https://storage.googleapis.com/aistudio-hosting/generative-ai/e499715a-a38f-4d32-80f2-9b2512f7a6b2/assets/RidersBUD_logo.png";
    const logoUrl = db?.settings.appLogoUrl || defaultLogo;
    const tagline = db?.settings.appTagline || "Trusted Car Care Wherever You Are";

    return (
        <motion.div
            className="flex flex-col items-center justify-center h-screen w-screen bg-secondary"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
        >
            <motion.img
                src={logoUrl}
                alt="RidersBUD Logo"
                className="w-64"
                style={{ filter: 'drop-shadow(0 0 15px rgba(254, 120, 3, 0.6))' }}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                    duration: 0.8,
                    ease: "easeOut",
                    type: "spring",
                    stiffness: 100
                }}
            />
            <motion.p
                className="text-light-gray mt-4"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
            >
                {tagline}
            </motion.p>
        </motion.div>
    );
};

export default SplashScreen;