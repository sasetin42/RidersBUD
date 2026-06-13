import React, { useEffect, useRef, useState } from 'react';
import { useNotification } from '../context/NotificationContext';
import NotificationToast from './NotificationToast';
import { Notification } from '../types';

const NotificationToasts: React.FC = () => {
    const { notifications, markAsRead } = useNotification();
    // Queue of toasts to show — only 1 displayed at a time
    const [toastQueue, setToastQueue] = useState<Notification[]>([]);
    const seenIdsRef = useRef<Set<string>>(new Set());
    const seenKeysRef = useRef<Set<string>>(new Set());

    // Enqueue new unread notifications that arrived within the last 10s
    useEffect(() => {
        const now = Date.now();
        const incoming = notifications.filter(n => {
            if (n.read) return false;
            if (now - (n.timestamp ?? 0) >= 10000) return false;
            if (seenIdsRef.current.has(n.id)) return false;
            const key = `${n.title}|${n.message}`;
            if (seenKeysRef.current.has(key)) return false;
            return true;
        });

        if (incoming.length > 0) {
            incoming.forEach(n => {
                seenIdsRef.current.add(n.id);
                const key = `${n.title}|${n.message}`;
                seenKeysRef.current.add(key);
                setTimeout(() => {
                    seenKeysRef.current.delete(key);
                }, 15000);
            });
            setToastQueue(prev => [...prev, ...incoming]);
        }
    }, [notifications]);

    // Auto-dismiss the current (first) toast after 5 seconds
    useEffect(() => {
        if (toastQueue.length === 0) return;
        const timer = setTimeout(() => {
            markAsRead(toastQueue[0].id);
            setToastQueue(prev => prev.slice(1));
        }, 5000);
        return () => clearTimeout(timer);
    }, [toastQueue, markAsRead]);

    const handleDismiss = (id: string) => {
        markAsRead(id);
        setToastQueue(prev => prev.filter(n => n.id !== id));
    };

    // Only show the first (most recent) toast in the queue
    const currentToast = toastQueue[0];
    if (!currentToast) return null;

    return (
        <div className="fixed inset-x-0 top-4 sm:top-6 z-[60] flex flex-col items-center px-4 sm:px-6 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-md">
                <NotificationToast
                    key={currentToast.id}
                    notification={currentToast}
                    onDismiss={handleDismiss}
                />
            </div>
        </div>
    );
};

export default NotificationToasts;
