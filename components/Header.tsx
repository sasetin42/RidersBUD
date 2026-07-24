import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import { useScrollDirection } from '../hooks/useScrollDirection';
import { getProfileImage } from '../utils/imageConstants';

interface HeaderProps {
    title: string;
    subtitle?: string;
    showBackButton?: boolean;
    showBack?: boolean;
    rightAction?: React.ReactNode;
    icon?: React.ReactNode;
}

const Header: React.FC<HeaderProps> = ({ title, subtitle, showBackButton = false, showBack = false, rightAction, icon }) => {
    const navigate = useNavigate();
    const { user, hasUnreadSupportMessage } = useAuth();
    const scrollDirection = useScrollDirection();
    const isHidden = scrollDirection === 'up';

    return (
        <div className={`sticky top-0 z-50 bg-[#121212]/80 backdrop-blur-xl border-b border-white/5 px-4 sm:px-6 py-3 flex items-center justify-between shadow-2xl transition-transform duration-300 ease-in-out ${isHidden ? '-translate-y-full' : 'translate-y-0'}`}>
            <div className="flex items-center gap-3 sm:gap-4">
                {(showBackButton || showBack) && (
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 -ml-2 rounded-full hover:bg-white/5 text-gray-400 hover:text-white transition-all active:scale-95"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                )}
                <div className="flex items-center gap-2.5">
                    {icon && (
                        <span className="text-primary opacity-90">{icon}</span>
                    )}
                    <div>
                        <h1 className="text-base sm:text-lg font-black text-white tracking-widest leading-none">{title}</h1>
                        {subtitle && (
                            <p className="text-[10px] sm:text-xs text-primary font-bold tracking-[0.25em] mt-1 opacity-90 animate-fadeIn">{subtitle}</p>
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
