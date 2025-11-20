import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../context/NotificationContext';
import { Notification } from '../types';

const NotificationPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { notifications, markAsRead, markAllAsRead } = useNotification();
    const navigate = useNavigate();

    const handleClick = (notification: Notification) => {
        markAsRead(notification.id);
        if (notification.link) {
            navigate(notification.link);
        }
        onClose();
    };
    
    const timeSince = (timestamp: number) => {
        const seconds = Math.floor((new Date().getTime() - timestamp) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return `${Math.floor(interval)}y ago`;
        interval = seconds / 2592000;
        if (interval > 1) return `${Math.floor(interval)}mo ago`;
        interval = seconds / 86400;
        if (interval > 1) return `${Math.floor(interval)}d ago`;
        interval = seconds / 3600;
        if (interval > 1) return `${Math.floor(interval)}h ago`;
        interval = seconds / 60;
        if (interval > 1) return `${Math.floor(interval)}m ago`;
        return `${Math.floor(seconds)}s ago`;
    };

    return (
        <div className="fixed inset-0 bg-transparent z-50" onClick={onClose}>
            <div
                className="absolute top-16 right-6 w-80 max-w-[calc(100%-3rem)] bg-dark-gray rounded-lg shadow-2xl animate-scaleUp origin-top-right border border-field"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-3 border-b border-field flex justify-between items-center">
                    <h3 className="font-bold text-white">Notifications</h3>
                    <button onClick={markAllAsRead} className="text-xs text-primary hover:underline">Mark all as read</button>
                </div>
                <div className="max-h-96 overflow-y-auto">
                    {notifications.length > 0 ? (
                        notifications.map(notif => (
                            <div
                                key={notif.id}
                                onClick={() => handleClick(notif)}
                                className={`p-3 border-b border-field hover:bg-field cursor-pointer ${!notif.read ? 'bg-primary/10' : ''}`}
                            >
                                <p className="font-semibold text-white text-sm">{notif.title}</p>
                                <p className="text-xs text-light-gray">{notif.message}</p>
                                <p className="text-[10px] text-gray-500 mt-1">{timeSince(notif.timestamp)}</p>
                            </div>
                        ))
                    ) : (
                        <p className="p-4 text-center text-sm text-light-gray">No new notifications.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NotificationPanel;