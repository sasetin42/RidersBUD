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
                className="relative text-light-gray hover:text-white mt-2"
                aria-label={`Notifications (${unreadCount} unread)`}
            >
                <Bell className="h-7 w-7" />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
                        {unreadCount}
                    </span>
                )}
            </button>
            {isOpen && <NotificationPanel onClose={() => setIsOpen(false)} />}
        </div>
    );
};

export default NotificationBell;