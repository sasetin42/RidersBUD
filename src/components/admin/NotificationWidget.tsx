import React, { useState, useRef, useEffect } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { formatDistanceToNow } from 'date-fns';

const NotificationWidget: React.FC = () => {
    const { db, markNotificationAsRead, clearAllNotifications } = useDatabase();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const notifications = db?.notifications || [];
    const unreadCount = notifications.filter(n => !n.read).length;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleNotificationClick = (id: string) => {
        markNotificationAsRead(id);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative group p-2 rounded-xl hover:bg-white/5 transition-all focus:outline-none"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transition-colors ${isOpen ? 'text-admin-accent' : 'text-admin-text-secondary group-hover:text-admin-accent'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-admin-card animate-pulse"></span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-admin-card border border-admin-border rounded-xl shadow-2xl z-50 overflow-hidden animate-scaleUp origin-top-right">
                    <div className="p-4 border-b border-admin-border flex justify-between items-center bg-white/5 backdrop-blur-sm">
                        <h3 className="font-semibold text-white">Notifications</h3>
                        {notifications.length > 0 && (
                            <button
                                onClick={() => clearAllNotifications()}
                                className="text-xs text-admin-text-secondary hover:text-red-400 transition-colors"
                            >
                                Clear all
                            </button>
                        )}
                    </div>

                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-admin-text-secondary flex flex-col items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                </svg>
                                <p>No notifications yet</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-white/5">
                                {notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className={`p-4 hover:bg-white/5 transition-colors cursor-pointer ${!notification.read ? 'bg-admin-accent/5' : ''}`}
                                        onClick={() => handleNotificationClick(notification.id)}
                                    >
                                        <div className="flex gap-3">
                                            <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${!notification.read ? 'bg-admin-accent' : 'bg-transparent'}`}></div>
                                            <div className="flex-1">
                                                <p className={`text-sm ${!notification.read ? 'text-white font-medium' : 'text-admin-text-secondary'}`}>
                                                    {notification.message}
                                                </p>
                                                <p className="text-xs text-admin-text-secondary mt-1 opacity-70">
                                                    {/* Fallback if date-fns fails or timestamp is invalid */}
                                                    {new Date(notification.timestamp).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="p-3 border-t border-admin-border bg-white/5 text-center">
                        <button className="text-xs text-admin-accent hover:text-white transition-colors font-medium">
                            View all notifications
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationWidget;
