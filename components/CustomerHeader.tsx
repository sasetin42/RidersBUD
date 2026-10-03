import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import CustomerSearchModal from './CustomerSearchModal';
import { Settings, LogOut, ChevronLeft, User, Search } from 'lucide-react';
import { getProfileImage } from '../utils/imageConstants';
import { useScrollDirection } from '../hooks/useScrollDirection';
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
    const scrollDirection = useScrollDirection();
    const isHidden = scrollDirection === 'up';

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <header
            className={`sticky top-0 px-4 py-3 z-50 bg-[#121212]/95 backdrop-blur-md flex items-center justify-between border-b border-white/5 shadow-sm transition-transform duration-300 ease-in-out ${isHidden ? '-translate-y-full' : 'translate-y-0'}`}
            style={{ paddingTop: 'calc(0.75rem + var(--safe-top))', paddingBottom: '0.75rem' }}
        >
            <div className="flex items-center gap-3">
                {showBackButton && (
                    <button
                        onClick={onBack || (() => navigate(-1))}
                        className="p-1.5 -ml-2 rounded-full hover:bg-white/5 text-gray-400 hover:text-white transition-all active:scale-95"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                )}
                <div className="flex items-center gap-3">
                    {/* Live Logo of RidersBUD */}
                    <img 
                        src={db?.settings?.customerHeaderLogoUrl || db?.settings?.appLogoUrl || "/ridersbud_logo.png"}
                        alt="RidersBUD Logo"
                        width={36}
                        height={36}
                        className="w-9 h-9 rounded-full object-cover border border-white/10 p-0.5 bg-black/30 shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).src = '/ridersbud_logo.png'; }}
                    />
                    <div>
                        <h1 className="text-base font-black text-white tracking-tight leading-none">{title}</h1>
                        {subtitle && <p className="text-[10px] text-gray-400 font-medium mt-0.5">{subtitle}</p>}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2">
                {/* Search Icon Widget Button (inline before Notification Bell) */}
                <button
                    onClick={() => setIsSearchOpen(true)}
                    className="p-2.5 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 active:scale-95 transition-all flex items-center justify-center"
                    aria-label="Search services, products, and tools"
                    title="Search services, products, and tools"
                >
                    <Search className="h-5 w-5" />
                </button>

                {/* Notification Bell - fully functional */}
                <NotificationBell />

                {/* Profile Dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                        className="w-8 h-8 rounded-full border-2 border-white/10 overflow-hidden shadow-2xl focus:outline-none focus:ring-2 focus:ring-[#FE7803]/50 transition-all"
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
