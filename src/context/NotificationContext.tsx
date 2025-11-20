import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { Notification } from '../types';

interface NotificationContextType {
    notifications: Notification[];
    addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
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

const NOTIFICATION_STORAGE_KEY = 'ridersbud_notifications';

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[]>(() => {
        try {
            const stored = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error("Failed to load notifications from localStorage", error);
            return [];
        }
    });

    const unreadCount = notifications.filter(n => !n.read).length;

    // Sync state with localStorage
    useEffect(() => {
        try {
            localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(notifications));
        } catch (error) {
            console.error("Failed to save notifications to localStorage", error);
        }
    }, [notifications]);
    
    // Sync state across tabs
    const handleStorageChange = useCallback((event: StorageEvent) => {
        if (event.key === NOTIFICATION_STORAGE_KEY && event.newValue) {
            try {
                setNotifications(JSON.parse(event.newValue));
            } catch (error) {
                 console.error("Failed to sync notifications from storage event:", error);
            }
        }
    }, []);

    useEffect(() => {
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [handleStorageChange]);

    const addNotification = (notificationData: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
        const newNotification: Notification = {
            ...notificationData,
            id: `notif-${Date.now()}`,
            timestamp: Date.now(),
            read: false,
        };
        
        // Add to the top of the list
        const updatedNotifications = [newNotification, ...notifications];

        // Trigger our own storage event for the current tab to react
        window.dispatchEvent(
            new StorageEvent('storage', {
                key: NOTIFICATION_STORAGE_KEY,
                newValue: JSON.stringify(updatedNotifications),
            })
        );
    };

    const markAsRead = (id: string) => {
        const updatedNotifications = notifications.map(n => n.id === id ? { ...n, read: true } : n);
        setNotifications(updatedNotifications);
    };
    
    const markAllAsRead = () => {
        const updatedNotifications = notifications.map(n => ({...n, read: true}));
        setNotifications(updatedNotifications);
    };

    const value = { notifications, addNotification, markAsRead, markAllAsRead, unreadCount };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};