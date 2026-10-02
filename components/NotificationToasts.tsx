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
            if (n.status === 'read' || n.read === true) return false;
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

    const handleDismiss = React.useCallback((id: string) => {
        markAsRead(id);
        setToastQueue(prev => prev.filter(n => n.id !== id));
    }, [markAsRead]);

    // Safety fallback auto-dismiss after 3.4s to guarantee queue never stalls
    useEffect(() => {
        if (toastQueue.length === 0) return;
        const currentId = toastQueue[0].id;
        const timer = setTimeout(() => {
            handleDismiss(currentId);
        }, 3400);
        return () => clearTimeout(timer);
    }, [toastQueue, handleDismiss]);

    // Only show the first (most recent) toast in the queue — zero overlaying
    const currentToast = toastQueue[0];
    if (!currentToast) return null;

    return (
        <div className="fixed inset-x-0 top-3 sm:top-4 z-[9999] flex flex-col items-center px-3 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-[360px]">
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
