import React from 'react';

interface AppLoadingScreenProps {
    message?: string;
    fullScreen?: boolean;
    logo?: string;
}

const AppLoadingScreen: React.FC<AppLoadingScreenProps> = ({
    fullScreen = true,
    logo = '/riders-logo.png'
}) => {
    const containerClass = fullScreen
        ? 'fixed inset-0 z-[9999] flex flex-col items-center justify-center min-h-screen'
        : 'flex flex-col items-center justify-center min-h-[60vh]';

    return (
        <div className={`${containerClass} bg-[#0A0A0A] overflow-hidden select-none`}>
            <div className="flex flex-col items-center justify-center">
                <img
                    src={logo}
                    alt="Riders Logo"
                    className="w-64 animate-pulse mix-blend-screen"
                    style={{ filter: 'drop-shadow(0 0 15px rgba(254, 120, 3, 0.6))' }}
                />
                <p className="text-gray-400 mt-4 text-sm font-semibold tracking-wide">
                    Trusted Car Care Whenever You Are
                </p>
            </div>
        </div>
    );
};

export default AppLoadingScreen;
