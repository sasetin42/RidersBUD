import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { Notification } from '../types';
import { useDatabase } from './DatabaseContext';

import { useAuth } from './AuthContext';
import { useMechanicAuth } from './MechanicAuthContext';

interface NotificationContextType {
    notifications: Notification[];
    addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read' | 'date'> & { date?: string }) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: (recipientId?: string) => void;
    deleteNotification: (id: string) => void;
    clearAllNotifications: (recipientId: string) => Promise<void>;
    unreadCount: number;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};

/** Build a localStorage key scoped to the active user so each user has their own clearedAt timestamp */
const getClearedAtKey = (recipientId: string | null) =>
    recipientId ? `ridersbud_notif_clearedAt_${recipientId}` : null;

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const {
        db,
        addNotification: dbAddNotification,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        deleteNotification: dbDeleteNotification,
        clearAllNotifications: dbClearAllNotifications,
    } = useDatabase();

    const { user, isAuthenticated } = useAuth();
    const { mechanic, isMechanicAuthenticated } = useMechanicAuth();
    
    const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(
        localStorage.getItem('ridersbud_admin_session') === 'true'
    );

    // Track the timestamp at which the active user last cleared all notifications.
    // Any notification with timestamp <= clearedAt is hidden (covers broadcast 'all' docs too).
    const [clearedAt, setClearedAt] = useState<number>(0);

    // Compute the active recipient ID for this session
    const activeRecipientId: string | null = isAdminAuthenticated
        ? 'admin'
        : isMechanicAuthenticated && mechanic
        ? `mechanic-${mechanic.id}`
        : isAuthenticated && user
        ? `customer-${user.id}`
        : null;

    // Load persisted clearedAt from localStorage whenever the recipient changes
    useEffect(() => {
        const key = getClearedAtKey(activeRecipientId);
        if (key) {
            const stored = localStorage.getItem(key);
            setClearedAt(stored ? parseInt(stored, 10) : 0);
        } else {
            setClearedAt(0);
        }
    }, [activeRecipientId]);

    useEffect(() => {
        const handleAuthChange = () => {
            setIsAdminAuthenticated(localStorage.getItem('ridersbud_admin_session') === 'true');
        };
        window.addEventListener('adminAuthChange', handleAuthChange);
        window.addEventListener('storage', handleAuthChange);
        return () => {
            window.removeEventListener('adminAuthChange', handleAuthChange);
            window.removeEventListener('storage', handleAuthChange);
        };
    }, []);

    // Live notifications from Firestore, sorted newest first, filtered strictly by active role + UID to prevent leakage.
    // Each role type ONLY sees notifications that belong to them — NEVER cross-role notifications.
    // Notifications older than (or equal to) clearedAt are hidden — this makes Clear All work for broadcast 'all' docs too.
    const notifications = [...(db?.notifications || [])]
        .filter(n => {
            // Hide notifications that were cleared (by timestamp)
            if (clearedAt > 0 && (n.timestamp ?? 0) <= clearedAt) return false;

            // Admin sees: admin-targeted notifications + broadcast 'all' notifications
            if (isAdminAuthenticated) {
                return n.recipientId === 'admin' || n.recipientId === 'all';
            }

            // Mechanic notification rules: ONLY their own mechanic notifications + 'all' broadcasts
            if (isMechanicAuthenticated && mechanic) {
                const isMechanicRecipient = n.recipientId === `mechanic-${mechanic.id}`;
                const isBroadcast = n.recipientId === 'all';
                // Strictly block if not for this mechanic and not a broadcast
                if (!isMechanicRecipient && !isBroadcast) return false;

                // Block customer-only and admin-only notification types from showing to mechanics
                const blockedTitles = ['Payment Verified', 'Payment Approved', 'Store Payment Approved', 'Admin Alert'];
                if (blockedTitles.some(t => n.title?.includes(t))) return false;

                // Block any notification that looks like it's for customers or admins
                const isAdminAlert = n.title?.includes('Admin') || n.message?.includes('admin');
                const isCustomerAlert = n.title?.includes('Customer') || n.recipientId?.startsWith('customer-');
                if (isAdminAlert || isCustomerAlert) return false;

                return true;
            }

            // Customer notification rules: ONLY their own customer notifications + 'all' broadcasts
            if (isAuthenticated && user) {
                const isCustomerRecipient = n.recipientId === `customer-${user.id}`;
                const isBroadcast = n.recipientId === 'all';
                // Strictly block if not for this customer and not a broadcast
                if (!isCustomerRecipient && !isBroadcast) return false;

                // Block mechanic-only and admin-only notifications
                if (n.recipientId?.startsWith('mechanic-')) return false;
                if (n.recipientId === 'admin') return false;

                // Block mechanic info assignment alerts but allow the success acceptance notification
                if (n.title?.toLowerCase().includes('mechanic')) {
                    const isAcceptanceSuccess = n.type === 'success' || n.message?.toLowerCase().includes('will be handling');
                    if (!isAcceptanceSuccess) return false;
                }

                return true;
            }

            // If not logged in, do not show any notifications
            return false;
        })
        .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));

    const unreadCount = notifications.filter(n => !n.read).length;

    const addNotification = (notificationData: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
        const recipientId = notificationData.recipientId || 'all';
        dbAddNotification({
            ...notificationData,
            recipientId,
            timestamp: Date.now(),
            read: false,
            date: notificationData.date || new Date().toISOString()
        });
    };

    const markAsRead = (id: string) => {
        markNotificationAsRead(id);
    };

    const markAllAsRead = (recipientId?: string) => {
        if (recipientId) {
            markAllNotificationsAsRead(recipientId);
        } else {
            console.warn("markAllAsRead called without recipientId. Ignoring.");
        }
    };

    const deleteNotification = (id: string) => {
        dbDeleteNotification(id);
    };

    /**
     * Clear ALL notifications for the active user.
     *
     * Strategy:
     * 1. Record the current timestamp as `clearedAt` in state + localStorage.
     *    This immediately hides ALL notifications (including broadcast 'all' docs)
     *    from the UI without touching the global Firestore documents.
     * 2. In parallel, delete user-specific Firestore documents (non-broadcast) via batch.
     *
     * Result: UI clears INSTANTLY (optimistic), Firestore cleanup follows asynchronously.
     */
    const clearAllNotifications = useCallback(async (recipientId: string): Promise<void> => {
        const now = Date.now();

        // 1. Optimistic UI: set clearedAt to now — hides everything immediately
        setClearedAt(now);
        const key = getClearedAtKey(recipientId);
        if (key) {
            localStorage.setItem(key, String(now));
        }

        // 2. Delete user-specific Firestore docs (broadcast 'all' docs are NOT deleted — they belong to everyone)
        try {
            await dbClearAllNotifications(recipientId);
        } catch (e) {
            console.warn('[NotificationContext] clearAllNotifications Firestore delete failed:', e);
            // Even if Firestore delete fails, the clearedAt filter keeps the UI clear
        }
    }, [dbClearAllNotifications]);

    const value = {
        notifications,
        addNotification,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAllNotifications,
        unreadCount,
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};