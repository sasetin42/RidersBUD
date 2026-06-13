import React, { createContext, useContext, ReactNode } from 'react';
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
    clearAllNotifications: (recipientId: string) => void;
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
    
    const [isAdminAuthenticated, setIsAdminAuthenticated] = React.useState(
        localStorage.getItem('ridersbud_admin_session') === 'true'
    );

    React.useEffect(() => {
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

    // Live notifications from Firestore (via DatabaseContext), sorted newest first, filtered strictly by active role + UID to prevent leakage
    const notifications = [...(db?.notifications || [])]
        .filter(n => {
            // Admin sees only admin-targeted notifications
            if (isAdminAuthenticated) {
                return n.recipientId === 'admin';
            }

            // Mechanic notification rules
            if (isMechanicAuthenticated && mechanic) {
                // Ensure recipientId strictly matches this mechanic's ID (or 'all' / general alert)
                const isRecipient = n.recipientId === `mechanic-${mechanic.id}` || n.recipientId === 'all';
                if (!isRecipient) return false;

                // Explicitly block customer payment alerts from showing to mechanics
                const isPaymentApprovedNotif = n.title === 'Payment Approved' || n.title === 'Store Payment Approved' || n.title?.includes('Payment Verified');
                if (isPaymentApprovedNotif) return false;

                return true;
            }

            // Customer notification rules
            if (isAuthenticated && user) {
                return n.recipientId === `customer-${user.id}` || n.recipientId === 'all';
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

    const clearAllNotifications = (recipientId: string) => {
        dbClearAllNotifications(recipientId);
    };

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