import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import NotificationWidget from './NotificationWidget';

interface AdminHeaderProps {
    onToggleSidebar: () => void;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({ onToggleSidebar }) => {
    const { user, logout } = useAdminAuth();
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <header className="flex-shrink-0 bg-black/20 backdrop-blur-md border-b border-white/5 px-6 h-20 flex items-center justify-between z-30 sticky top-0">
            {/* Left side: Toggle button for mobile/tablet */}
            <div className="flex items-center gap-4">
                <button
                    onClick={onToggleSidebar}
                    className="text-gray-400 hover:text-white lg:hidden p-2 rounded-lg hover:bg-white/5 transition-colors"
                    aria-label="Toggle sidebar"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                    </svg>
                </button>

                {/* Realtime Clock */}
                <div className="hidden md:flex flex-col">
                    <span className="text-lg font-bold text-white tracking-wide font-mono">{formatTime(currentTime)}</span>
                    <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">{formatDate(currentTime)}</span>
                </div>
            </div>


            {/* Right Side: Icons & Profile */}
            <div className="flex items-center gap-6">
                {/* Notification Widget */}
                <NotificationWidget />

                {/* Admin Profile */}
                <div className="flex items-center gap-3 pl-6 border-l border-white/10">
                    <div className="text-right hidden md:block">
                        <p className="text-sm font-bold text-white">Admin User</p>
                        <p className="text-xs text-admin-accent font-medium">Super Admin</p>
                    </div>
                    <button className="w-10 h-10 rounded-full bg-gradient-to-br from-admin-accent to-orange-600 p-[2px] hover:shadow-glow hover:scale-105 transition-all">
                        <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
                            {/* Placeholder for user image, fallback to initial */}
                            <span className="font-bold text-white">A</span>
                        </div>
                    </button>
                </div>
            </div>
        </header>
    );
};

export default AdminHeader;
