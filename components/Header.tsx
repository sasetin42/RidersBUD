import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMechanicAuth } from '../context/MechanicAuthContext';
import { useDatabase } from '../context/DatabaseContext';
import NotificationBell from './NotificationBell';
import { getProfileImage } from '../utils/imageConstants';

interface HeaderProps {
    title: string;
    subtitle?: string;
    showBackButton?: boolean;
    showBack?: boolean;
    rightAction?: React.ReactNode;
    icon?: React.ReactNode;
    showLogo?: boolean;
}

const Header: React.FC<HeaderProps> = ({ title, subtitle, showBackButton = false, showBack = false, rightAction, icon, showLogo = true }) => {
    const navigate = useNavigate();
    const { user, hasUnreadSupportMessage } = useAuth();
    const { mechanic, isMechanicAuthenticated } = useMechanicAuth();
    const { db } = useDatabase();
    // Pick appropriate logo based on context (Mechanic portal vs Customer portal vs General)
    const headerLogoUrl = isMechanicAuthenticated || mechanic
        ? (db?.settings?.mechanicHeaderLogoUrl || db?.settings?.appLogoUrl || "/ridersbud_logo.png")
        : (db?.settings?.customerHeaderLogoUrl || db?.settings?.appLogoUrl || "/ridersbud_logo.png");

    return (
        <div 
            className="sticky top-0 z-50 bg-[#121212]/90 backdrop-blur-xl border-b border-white/5 px-3.5 sm:px-6 flex items-center justify-between shadow-2xl min-h-[3rem] h-[calc(3rem+var(--safe-top))]"
            style={{ paddingTop: 'var(--safe-top, 0px)' }}
        >
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                {(showBackButton || showBack) && (
                    <button
                        onClick={() => navigate(-1)}
                        className="p-1 -ml-1 rounded-full hover:bg-white/5 text-gray-400 hover:text-white transition-all active:scale-95 shrink-0"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                )}
                <div className="flex items-center gap-2.5 min-w-0">
                    {showLogo && (
                        <img 
                            src={headerLogoUrl}
                            alt="Logo"
                            width={30}
                            height={30}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-white/10 p-0.5 bg-black/30 shrink-0"
                            onError={(e) => { (e.target as HTMLImageElement).src = '/ridersbud_logo.png'; }}
                        />
                    )}
                    {icon && !showLogo && (
                        <span className="text-primary opacity-90 shrink-0">{icon}</span>
                    )}
                    <div className="min-w-0 truncate">
                        <h1 className="text-sm sm:text-base font-black text-white tracking-widest leading-none truncate">{title}</h1>
                        {subtitle && (
                            <p className="text-[10px] text-primary font-bold tracking-[0.2em] mt-0.5 opacity-90 truncate animate-fadeIn">{subtitle}</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3 animate-fadeIn">
                {rightAction ? (
                    rightAction
                ) : user ? (
                    <>
                        <NotificationBell />
                        <Link to="/customer-portal/profile" className="relative group">
                            <div className="w-8 h-8 rounded-full p-0.5 bg-gradient-to-br from-white/10 to-transparent border border-white/10 overflow-hidden">
                                <img
                                    src={getProfileImage(user.picture, user.name)}
                                    alt={user.name}
                                    className="w-full h-full rounded-full object-cover"
                                    onError={(e) => { (e.target as HTMLImageElement).src = '/riders-logo.png'; }}
                                />
                            </div>
                            {/* Notification Dot for Support Messages */}
                            {hasUnreadSupportMessage && (
                                <span className="absolute top-0 right-0 block h-3 w-3 rounded-full ring-2 ring-[#121212] bg-red-500 transform translate-x-1/4 -translate-y-1/4 animate-pulse shadow-lg shadow-red-500/40"></span>
                            )}
                        </Link>
                    </>
                ) : null}
            </div>
        </div>
    );
};

export default Header;
