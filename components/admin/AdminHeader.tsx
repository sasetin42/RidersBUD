import React, { useState, useEffect, useRef } from 'react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useNavigate, Link } from 'react-router-dom';
import NotificationBell from '../NotificationBell';
import Tooltip from '../ui/Tooltip';
import { Search, Menu, User, Clock, LogOut, Settings, HelpCircle, ChevronDown, Globe } from 'lucide-react';

interface AdminHeaderProps {
    onToggleSidebar: () => void;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({ onToggleSidebar }) => {
    const { logout, adminUser } = useAdminAuth();
    const navigate = useNavigate();
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [dateTime, setDateTime] = useState(new Date());
    const profileRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const timer = setInterval(() => {
            setDateTime(new Date());
        }, 1000);

        // Outside click dropdown close disabled per user request

        return () => {
            clearInterval(timer);
        };
    }, []);

    const formattedDate = dateTime.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    const formattedTime = dateTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });


    return (
        <header className="flex-shrink-0 bg-[#121212]/95 backdrop-blur-xl border-b border-white/5 h-20 flex items-center justify-between z-40 px-4 lg:px-8 transition-all duration-300">
            {/* Left side: Toggle button for mobile/tablet and Search */}
            <div className="flex items-center gap-4 flex-1">
                <Tooltip content="Toggle Sidebar">
                    <button
                        onClick={onToggleSidebar}
                        className="p-2 text-gray-400 hover:text-white lg:hidden rounded-lg hover:bg-white/5 transition-colors"
                        aria-label="Toggle sidebar"
                    >
                        <Menu size={24} />
                    </button>
                </Tooltip>

                {/* Search Bar */}
                <div className="relative hidden md:block max-w-md w-full">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-4">
                        <Search size={18} className="text-gray-500" />
                    </span>
                    <input
                        type="text"
                        placeholder="Search mechanics, bookings, orders..."
                        className="w-full pl-12 pr-4 py-2.5 bg-[#1F1F1F] border border-white/5 rounded-xl text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all duration-300"
                    />
                </div>
            </div>

            {/* Realtime Date & Time */}
            <div className="hidden md:flex flex-col items-end mr-8 text-right">
                <p className="text-sm font-bold text-white tracking-wide ">{formattedDate}</p>
                <div className="flex items-center gap-2 text-xs font-mono text-primary">
                    <Clock size={12} />
                    {formattedTime}
                </div>
            </div>

            {/* Icons & Profile */}
            <div className="flex items-center gap-4 lg:gap-6">
                <Tooltip content="Notifications">
                    <NotificationBell />
                </Tooltip>

                <div className="h-8 w-px bg-white/10 mx-1 hidden sm:block"></div>

                {/* Profile Section */}
                <div className="relative" ref={profileRef}>
                    <Tooltip content="Profile">
                        <button
                            onClick={() => setIsProfileOpen(!isProfileOpen)}
                            className="flex items-center gap-3 group px-2 py-1.5 rounded-2xl hover:bg-white/5 transition-all outline-none"
                        >
                        <div className="hidden text-right sm:block group-hover:opacity-80 transition-opacity">
                            <p className="text-sm font-bold text-white">{adminUser?.name || 'Admin User'}</p>
                            <p className="text-[10px] text-primary font-black  tracking-widest flex items-center justify-end gap-1">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                                Online
                            </p>
                        </div>
                        <div className="relative">
                            <div className="w-10 h-10 bg-gradient-to-tr from-primary to-orange-600 rounded-xl flex items-center justify-center font-bold text-white text-lg shadow-lg shadow-primary/20 ring-2 ring-white/10 transition-transform group-hover:rotate-6 group-active:scale-90">
                                {adminUser?.name?.charAt(0) || 'A'}
                            </div>
                            <div className="absolute -bottom-1 -right-1 bg-[#121212] p-0.5 rounded-lg border border-white/10 text-gray-400">
                                <ChevronDown size={12} className={`transition-transform duration-300 ${isProfileOpen ? 'rotate-180' : ''}`} />
                            </div>
                        </div>
                    </button>
                    </Tooltip>

                    {/* Profile Dropdown */}
                    {isProfileOpen && (
                        <div className="absolute right-0 mt-3 w-64 bg-[#1A1A1A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-slideDown z-50">
                            <div className="p-5 bg-gradient-to-br from-white/5 to-transparent border-b border-white/5">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center font-bold text-primary text-xl border border-primary/30">
                                        {adminUser?.name?.charAt(0) || 'A'}
                                    </div>
                                    <div>
                                        <p className="text-base font-bold text-white leading-none">{adminUser?.name || 'Admin User'}</p>
                                        <p className="text-xs text-gray-500 mt-1 font-medium">{adminUser?.email || 'admin@ridersbud.com'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-black  tracking-widest rounded-md border border-primary/20">
                                        Super Admin
                                    </span>
                                </div>
                            </div>

                            <div className="p-2">
                                <Link
                                    to="/admin-portal/users"
                                    onClick={() => setIsProfileOpen(false)}
                                    className="w-full flex items-center gap-3 p-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all group"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                        <User size={16} className="group-hover:text-primary" />
                                    </div>
                                    <span className="text-sm font-bold">My Profile</span>
                                </Link>
                                <Link
                                    to="/admin-portal/settings"
                                    onClick={() => setIsProfileOpen(false)}
                                    className="w-full flex items-center gap-3 p-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all group"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                                        <Settings size={16} className="group-hover:text-blue-400" />
                                    </div>
                                    <span className="text-sm font-bold">Account Settings</span>
                                </Link>
                                <a
                                    href="mailto:support@ridersbud.com"
                                    className="w-full flex items-center gap-3 p-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all group"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                                        <HelpCircle size={16} className="group-hover:text-emerald-400" />
                                    </div>
                                    <span className="text-sm font-bold">Help & Support</span>
                                </a>
                                <Link
                                    to="/customer-portal"
                                    onClick={() => setIsProfileOpen(false)}
                                    className="w-full flex items-center gap-3 p-3 rounded-xl text-primary hover:text-white hover:bg-primary transition-all group"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                                        <Globe size={16} className="text-primary group-hover:text-white" />
                                    </div>
                                    <span className="text-sm font-bold">Switch to Customer App</span>
                                </Link>
                            </div>

                            <div className="p-2 bg-white/5">
                                <button
                                    onClick={() => {
                                        setIsProfileOpen(false);
                                        logout();
                                        navigate('/admin-login');
                                    }}
                                    className="w-full flex items-center gap-3 p-3 rounded-xl text-red-400 hover:text-white hover:bg-red-500 transition-all group"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                                        <LogOut size={16} />
                                    </div>
                                    <span className="text-sm font-bold  tracking-widest">Sign Out</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default AdminHeader;
