
import React from 'react';
import { Search, Bell, Menu, User } from 'lucide-react';

interface AdminHeaderProps {
    onToggleSidebar: () => void;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({ onToggleSidebar }) => {
    return (
        <header className="sticky top-0 z-30 flex-shrink-0 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/5 h-20 px-6 flex items-center justify-between transition-all duration-300">
            {/* Left side: Toggle button (mobile) and Global Admin Search */}
            <div className="flex items-center gap-6 flex-1">
                <button
                    onClick={onToggleSidebar}
                    className="p-2 -ml-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 lg:hidden transition-all"
                    aria-label="Toggle sidebar"
                >
                    <Menu size={24} />
                </button>

                {/* Enhanced Search Bar */}
                <div className="relative hidden md:block w-full max-w-md group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-500 group-focus-within:text-primary transition-colors" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search for bookings, users, or settings..."
                        className="block w-full pl-10 pr-3 py-2.5 border border-white/10 rounded-xl leading-5 bg-white/5 text-gray-300 placeholder-gray-500 focus:outline-none focus:bg-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 sm:text-sm transition-all shadow-inner"
                    />
                    {/* Search Shortcut Hint */}
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-gray-600 text-xs border border-white/10 rounded px-1.5 py-0.5">Ctrl K</span>
                    </div>
                </div>
            </div>

            {/* Right Side: Actions & Profile */}
            <div className="flex items-center gap-4">
                {/* Notifications */}
                <button className="relative p-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all group">
                    <Bell size={22} className="group-hover:animate-swing" />
                    <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-[#0a0a0a] animate-pulse"></span>
                </button>

                {/* Profile Dropdown Trigger */}
                <div className="flex items-center gap-3 pl-4 border-l border-white/10">
                    <div className="hidden md:block text-right">
                        <p className="text-sm font-bold text-white leading-none">Admin User</p>
                        <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">Super Admin</p>
                    </div>
                    <button className="h-10 w-10 rounded-xl bg-gradient-to-br from-gray-700 to-gray-900 border border-white/10 flex items-center justify-center text-white hover:border-primary/50 transition-colors shadow-lg">
                        <User size={20} />
                    </button>
                </div>
            </div>
        </header>
    );
};

export default AdminHeader;
