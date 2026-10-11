import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import Tooltip from '../ui/Tooltip';

const NavIcon = ({ icon, label, to, end }: { icon: React.ReactNode; label: string; to: string; end?: boolean }) => (
    <Tooltip content={label} position="top" className="flex-1 w-full h-full min-w-0 flex items-center justify-center">
        <NavLink to={to} end={end} aria-label={label} className="relative group flex flex-col items-center justify-center w-full h-full py-1.5 btn-haptic">
            {({ isActive }) => (
                <>
                    {/* Top Indicator Bar */}
                    <div className={`absolute top-0 w-8 h-1 bg-[#FE7803] rounded-b-full transition-all duration-200 shadow-[0_2px_8px_rgba(254,120,3,0.6)] ${isActive ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'}`}></div>

                    {/* Icon Container */}
                    <div className={`p-1.5 rounded-xl transition-all duration-200 relative flex items-center justify-center ${isActive ? 'bg-[#FE7803]/15 text-[#FE7803] scale-105 shadow-[0_0_12px_rgba(254,120,3,0.3)]' : 'text-gray-400 group-hover:text-gray-200'}`}>
                        {icon}
                    </div>

                    {/* Visible Text Label */}
                    <span className={`text-[10px] sm:text-[11px] font-bold tracking-tight mt-0.5 transition-colors ${isActive ? 'text-[#FE7803]' : 'text-gray-400 group-hover:text-gray-200'}`}>
                        {label}
                    </span>
                </>
            )}
        </NavLink>
    </Tooltip>
);

const MechanicBottomNav: React.FC = () => {
    const location = useLocation();

    // Hide BottomNav on Support Chat screen
    if (location.pathname.includes('/support-chat')) {
        return null;
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-auto flex justify-center">
            <div className="w-full md:max-w-md flex justify-between items-center bg-[#121212]/98 backdrop-blur-2xl border-t border-white/15 shadow-[0_-8px_30px_rgba(0,0,0,0.7)] px-1 sm:px-4 min-h-[3.75rem] h-[calc(3.75rem+var(--safe-bottom))] pb-[var(--safe-bottom)]">
                <NavIcon
                    to="/mechanic-portal/dashboard"
                    label="Home"
                    end
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>}
                />
                <NavIcon
                    to="/mechanic-portal/jobs"
                    label="Jobs"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" /><path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" /></svg>}
                />
                <NavIcon
                    to="/mechanic-portal/earnings"
                    label="Earnings"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.69c.22.071.412.164.567.266.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" /><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" /></svg>}
                />
                <NavIcon
                    to="/mechanic-portal/profile"
                    label="Profile"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>}
                />
            </div>
        </div>
    );
};

export default MechanicBottomNav;
