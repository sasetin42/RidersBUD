import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { useCart } from '../context/CartContext';
import {
    Menu, Bell, ChevronLeft, Search, User,
    LogOut, Settings, HelpCircle, ShoppingCart
} from 'lucide-react';
import NotificationPanel from './NotificationPanel';

interface HeaderProps {
    title?: string;
    showBackButton?: boolean;
    showMenuButton?: boolean;
    transparent?: boolean;
    showSearch?: boolean;
    showCart?: boolean;
}

const Header: React.FC<HeaderProps> = ({
    title,
    showBackButton = false,
    showMenuButton = false,
    transparent = false,
    showSearch = false,
    showCart = false
}) => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { unreadCount } = useNotification();
    const { itemCount } = useCart();

    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

    return (
        <>
            <header
                className={`flex items-center justify-between px-4 py-3 h-[60px] fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${transparent
                        ? 'bg-transparent'
                        : 'bg-[#121212]/90 backdrop-blur-xl border-b border-white/5 shadow-lg shadow-black/20'
                    }`}
            >
                {/* Left Section: Back or Logo */}
                <div className="flex items-center gap-3">
                    {showBackButton ? (
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 rounded-full hover:bg-white/10 text-gray-300 hover:text-white transition-colors active:scale-95"
                        >
                            <ChevronLeft size={24} />
                        </button>
                    ) : showMenuButton ? (
                        <button className="p-2 rounded-full hover:bg-white/10 text-gray-300 hover:text-white transition-colors">
                            <Menu size={24} />
                        </button>
                    ) : (
                        <div className="w-10"></div> // Spacer
                    )}

                    {title && (
                        <h1 className="text-lg font-bold text-white tracking-wide animate-fadeIn">
                            {title}
                        </h1>
                    )}
                </div>

                {/* Right Section: Actions */}
                <div className="flex items-center gap-2">
                    {showSearch && (
                        <button className="p-2 rounded-full hover:bg-white/10 text-gray-300 hover:text-primary transition-colors">
                            <Search size={20} />
                        </button>
                    )}

                    {showCart && (
                        <button
                            onClick={() => navigate('/cart')}
                            className="p-2 rounded-full hover:bg-white/10 text-gray-300 hover:text-primary transition-colors relative"
                        >
                            <ShoppingCart size={20} />
                            {itemCount > 0 && (
                                <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full shadow-md animate-scaleUp">
                                    {itemCount}
                                </span>
                            )}
                        </button>
                    )}

                    {/* Notification Bell */}
                    <div className="relative">
                        <button
                            onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                            className={`p-2 rounded-full transition-colors relative ${isNotificationOpen ? 'bg-white/10 text-primary' : 'hover:bg-white/10 text-gray-300 hover:text-white'}`}
                        >
                            <Bell size={20} />
                            {unreadCount > 0 && (
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse ring-2 ring-[#121212]"></span>
                            )}
                        </button>

                        {/* Dropdown Panel */}
                        {isNotificationOpen && (
                            <div className="absolute top-full right-0 mt-2 w-80 sm:w-96 z-50">
                                <NotificationPanel onClose={() => setIsNotificationOpen(false)} />
                            </div>
                        )}
                    </div>

                    {/* Profile Avatar / Menu */}
                    <div className="relative ml-1">
                        <button
                            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                            className="w-8 h-8 rounded-full overflow-hidden border border-white/20 hover:border-primary transition-all shadow-sm"
                        >
                            <img
                                src={user?.picture || `https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=random`}
                                alt="Profile"
                                className="w-full h-full object-cover"
                            />
                        </button>

                        {/* Profile Dropdown */}
                        {isProfileMenuOpen && (
                            <>
                                <div
                                    className="fixed inset-0 z-40 bg-black/20"
                                    onClick={() => setIsProfileMenuOpen(false)}
                                ></div>
                                <div className="absolute top-full right-0 mt-3 w-48 bg-[#1A1A1A] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50 animate-fadeIn">
                                    <div className="p-3 border-b border-white/5 bg-white/5">
                                        <p className="text-sm font-bold text-white truncate">{user?.name}</p>
                                        <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                                    </div>
                                    <div className="p-1">
                                        <button onClick={() => navigate('/profile')} className="w-full flex items-center gap-3 p-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-left">
                                            <User size={16} /> Profile
                                        </button>
                                        <button onClick={() => navigate('/settings')} className="w-full flex items-center gap-3 p-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-left">
                                            <Settings size={16} /> Settings
                                        </button>
                                        <button onClick={() => navigate('/help')} className="w-full flex items-center gap-3 p-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-left">
                                            <HelpCircle size={16} /> Help & Support
                                        </button>
                                        <div className="h-px bg-white/5 my-1"></div>
                                        <button onClick={logout} className="w-full flex items-center gap-3 p-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors text-left">
                                            <LogOut size={16} /> Logout
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* Spacer to prevent content overlap */}
            <div className="h-[60px]" />

            {/* Overlay for Notifications */}
            {isNotificationOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
                    onClick={() => setIsNotificationOpen(false)}
                ></div>
            )}
        </>
    );
};

export default Header;
