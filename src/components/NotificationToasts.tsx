import React, { useState, useEffect } from 'react';
import { useNotification } from '../context/NotificationContext';
import { Notification } from '../types';
import NotificationToast from './NotificationToast';

const NotificationToasts: React.FC = () => {
    const { notifications } = useNotification();
    const [activeToasts, setActiveToasts] = useState<Notification[]>([]);
    const [shownIds, setShownIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        // Find new, unread notifications that haven't been shown as toasts yet
        const newToasts = notifications.filter(n => !n.read && !shownIds.has(n.id));

        if (newToasts.length > 0) {
            // Add new toasts to the active list and mark them as shown
            setActiveToasts(prev => [...prev, ...newToasts]);
            setShownIds(prev => {
                const newSet = new Set(prev);
                newToasts.forEach(t => newSet.add(t.id));
                return newSet;
            });
        }
    }, [notifications, shownIds]);

    const handleDismiss = (id: string) => {
        setActiveToasts(prev => prev.filter(t => t.id !== id));
    };

    return (
        <div className="fixed top-5 right-5 z-[100] space-y-4">
            {activeToasts.map(toast => (
                <NotificationToast key={toast.id} notification={toast} onDismiss={handleDismiss} />
            ))}
        </div>
    );
};

export default NotificationToasts;