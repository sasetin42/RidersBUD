import React, { useState } from 'react';
import { useNotification } from '../context/NotificationContext';
import NotificationPanel from './NotificationPanel';
import { Bell } from 'lucide-react';

const NotificationBell: React.FC = () => {
    const { unreadCount } = useNotification();
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(prev => !prev)}
                className="relative btn-glass p-2 rounded-xl transition-all duration-300 hover:scale-110 active:scale-95 group"
                aria-label={`Notifications (${unreadCount} unread)`}
            >
                <Bell className="h-6 w-6 text-light-gray group-hover:text-primary transition-colors" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full gradient-primary text-white text-[10px] font-bold shadow-glow border border-white/30 animate-glow-pulse">
                        {unreadCount}
                    </span>
                )}
            </button>
            {isOpen && <NotificationPanel onClose={() => setIsOpen(false)} />}
        </div>
    );
};

export default NotificationBell;