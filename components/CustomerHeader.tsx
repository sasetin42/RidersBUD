import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import CustomerSearchModal from './CustomerSearchModal';
import { Settings, LogOut, ChevronLeft, User, Search, Smartphone } from 'lucide-react';
import { getProfileImage } from '../utils/imageConstants';
import { useDatabase } from '../context/DatabaseContext';

interface CustomerHeaderProps {
    title: string;
    subtitle?: string;
    showBackButton?: boolean;
    icon?: React.ReactNode;
    onBack?: () => void;
}

const CustomerHeader: React.FC<CustomerHeaderProps> = ({ title, subtitle, showBackButton = false, icon, onBack }) => {
    const { user, logout } = useAuth();
    const { db } = useDatabase();
    const navigate = useNavigate();
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Steady Header: pinned firmly at the top without disappearing or jumping on scroll
    return (
        <header
            className="sticky top-0 px-3.5 z-50 bg-[#121212]/95 backdrop-blur-md flex items-center justify-between border-b border-white/5 shadow-sm min-h-[3rem] h-[calc(3rem+var(--safe-top))]"
            style={{ paddingTop: 'var(--safe-top, 0px)' }}
        >
            <div className="flex items-center gap-2.5 min-w-0">
                {showBackButton && (
                    <button
                        onClick={onBack || (() => navigate(-1))}
                        className="p-1 -ml-1 rounded-full hover:bg-white/5 text-gray-400 hover:text-white transition-all active:scale-95 shrink-0"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                )}
                <div className="flex items-center gap-2.5 min-w-0">
                    {/* Live Logo of RidersBUD */}
                    <img 
                        src={db?.settings?.customerHeaderLogoUrl || db?.settings?.appLogoUrl || "/ridersbud_logo.png"}
                        alt="RidersBUD Logo"
                        width={30}
                        height={30}
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-white/10 p-0.5 bg-black/30 shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).src = '/ridersbud_logo.png'; }}
                    />
                    <div className="min-w-0 truncate">
                        <h1 className="text-sm sm:text-base font-black text-white tracking-tight leading-none truncate">{title}</h1>
                        {subtitle && <p className="text-[10px] text-gray-400 font-medium mt-0.5 truncate">{subtitle}</p>}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
                {/* Search Icon Widget Button (inline before Notification Bell) */}
                <button
                    onClick={() => setIsSearchOpen(true)}
                    className="p-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 active:scale-95 transition-all flex items-center justify-center"
                    aria-label="Search services, products, and tools"
                    title="Search services, products, and tools"
                >
                    <Search className="h-4.5 w-4.5" />
                </button>

                {/* Notification Bell - fully functional */}
                <NotificationBell />

                {/* Profile Dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-white/15 overflow-hidden shadow-md focus:outline-none focus:ring-2 focus:ring-[#FE7803]/50 transition-all block"
                    >
                        <img
                            src={getProfileImage(user?.picture, user?.name)}
                            alt="Profile"
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).src = '/riders-logo.png'; }}
                        />
                    </button>

                    {isProfileOpen && (
                        <div className="absolute right-0 mt-2 w-52 bg-[#1A1A1A] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-fadeIn">
                            {/* User info */}
                            <div className="px-4 py-3 border-b border-white/5 bg-white/[0.02]">
                                <p className="text-sm font-bold text-white truncate">{user?.name || 'Customer'}</p>
                                <p className="text-[11px] text-gray-500 truncate mt-0.5">{user?.email || ''}</p>
                            </div>
                            <div className="py-1">
                                <button
                                    onClick={() => { navigate('/customer-portal/profile'); setIsProfileOpen(false); }}
                                    className="w-full px-4 py-3 text-left text-sm text-gray-300 hover:bg-white/5 hover:text-white flex items-center gap-2.5 transition-colors"
                                >
                                    <User size={15} />
                                    Profile Settings
                                </button>
                                <button
                                    onClick={() => { navigate('/customer-portal/settings'); setIsProfileOpen(false); }}
                                    className="w-full px-4 py-3 text-left text-sm text-gray-300 hover:bg-white/5 hover:text-white flex items-center gap-2.5 transition-colors"
                                >
                                    <Settings size={15} />
                                    Account Settings
                                </button>
                                <button
                                    onClick={() => {
                                        setIsProfileOpen(false);
                                        window.dispatchEvent(new CustomEvent('open-pwa-install'));
                                    }}
                                    className="w-full px-4 py-3 text-left text-sm text-orange-400 hover:bg-orange-500/10 hover:text-orange-300 flex items-center gap-2.5 transition-colors"
                                >
                                    <Smartphone size={15} />
                                    Install RidersBUD App
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center gap-2.5 transition-colors border-t border-white/5"
                                >
                                    <LogOut size={15} />
                                    Log Out
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Global Search Modal */}
            <CustomerSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
        </header>
    );
};

export default CustomerHeader;
