import React, { useState } from 'react';
import { useNotification } from '../context/NotificationContext';
import NotificationPanel from './NotificationPanel';

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
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
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