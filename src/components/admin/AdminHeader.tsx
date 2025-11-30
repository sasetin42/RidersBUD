import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import NotificationWidget from './NotificationWidget';

interface AdminHeaderProps {
    onToggleSidebar: () => void;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({ onToggleSidebar }) => {
    const { user, logout } = useAdminAuth(); // Assuming user is available from context
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
        <header className="flex-shrink-0 bg-admin-card border-b border-admin-border px-6 h-20 flex items-center justify-between z-10 sticky top-0">
            {/* Left side: Toggle button for mobile/tablet */}
            <div className="flex items-center gap-4">
                <button
                    onClick={onToggleSidebar}
                    className="text-admin-text-secondary hover:text-admin-text-primary lg:hidden"
                    aria-label="Toggle sidebar"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                    </svg>
                </button>

                {/* Realtime Clock */}
                <div className="hidden md:flex flex-col">
                    <span className="text-lg font-bold text-white tracking-wide">{formatTime(currentTime)}</span>
                    <span className="text-xs text-admin-text-secondary font-medium">{formatDate(currentTime)}</span>
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
                        <p className="text-xs text-admin-text-secondary">Super Admin</p>
                    </div>
                    <button className="w-10 h-10 rounded-full bg-gradient-to-br from-admin-accent to-orange-600 p-[2px] hover:shadow-glow transition-all">
                        <div className="w-full h-full rounded-full bg-admin-card flex items-center justify-center overflow-hidden">
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
