import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { Notification } from '../types';
import { SupabaseDatabaseService } from '../services/supabaseDatabaseService';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useMechanicAuth } from './MechanicAuthContext';

interface NotificationContextType {
    notifications: Notification[];
    addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    deleteNotification: (id: string) => void;
    unreadCount: number;
    loading: boolean;
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
    // Get auth contexts - these hooks must be called unconditionally
    // We'll handle undefined contexts gracefully
    const authContext = useAuth();
    const mechanicAuthContext = useMechanicAuth();

    const currentUser = authContext?.currentUser || null;
    const mechanic = mechanicAuthContext?.mechanic || null;

    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    // Determine current user ID and type
    const userId = currentUser?.id || mechanic?.id;
    const userType = currentUser ? 'customer' : (mechanic ? 'mechanic' : null);

    // Load notifications from Supabase or localStorage
    useEffect(() => {
        const loadNotifications = async () => {
            if (userId && userType && isSupabaseConfigured()) {
                try {
                    const recipientId = `${userType}-${userId}`;
                    const data = await SupabaseDatabaseService.getNotifications(recipientId);

                    // Transform Supabase data to Notification format
                    const notifications: Notification[] = data.map((n: any) => ({
                        id: n.id,
                        type: n.type as 'booking' | 'job' | 'chat' | 'reminder' | 'general',
                        title: n.title,
                        message: n.message,
                        timestamp: new Date(n.created_at).getTime(),
                        read: n.is_read,
                        link: n.link_url,
                        recipientId: n.recipient_id
                    }));

                    setNotifications(notifications);
                } catch (error) {
                    console.error('Failed to load notifications from Supabase:', error);
                    // Fallback to localStorage
                    loadFromLocalStorage();
                }
            } else {
                // Fallback to localStorage
                loadFromLocalStorage();
            }
            setLoading(false);
        };

        loadNotifications();
    }, [userId, userType]);

    // Setup realtime subscription for notifications
    useEffect(() => {
        if (!userId || !userType || !isSupabaseConfigured() || !supabase) return;

        const recipientId = `${userType}-${userId}`;

        console.log('[Notifications] Setting up realtime subscription for:', recipientId);

        const channel = supabase
            .channel('notification-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notifications',
                    filter: `recipient_id=eq.${recipientId}`
                },
                async (payload) => {
                    console.log('[Notifications] Realtime update detected:', payload);

                    // Reload all notifications
                    const data = await SupabaseDatabaseService.getNotifications(recipientId);
                    const notifications: Notification[] = data.map((n: any) => ({
                        id: n.id,
                        type: n.type as 'booking' | 'job' | 'chat' | 'reminder' | 'general',
                        title: n.title,
                        message: n.message,
                        timestamp: new Date(n.created_at).getTime(),
                        read: n.is_read,
                        link: n.link_url,
                        recipientId: n.recipient_id
                    }));

                    setNotifications(notifications);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId, userType]);

    const loadFromLocalStorage = () => {
        try {
            const stored = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
            if (stored) {
                setNotifications(JSON.parse(stored));
            }
        } catch (error) {
            console.error("Failed to load notifications from localStorage", error);
        }
    };

    // Save to localStorage as backup
    useEffect(() => {
        if (!loading) {
            try {
                localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(notifications));
            } catch (error) {
                console.error("Failed to save notifications to localStorage", error);
            }
        }
    }, [notifications, loading]);

    const addNotification = async (notificationData: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
        // Optimistic update
        const newNotification: Notification = {
            ...notificationData,
            id: `notif-${Date.now()}`,
            timestamp: Date.now(),
            read: false,
        };

        setNotifications(prev => [newNotification, ...prev]);

        // Sync to database
        if (isSupabaseConfigured()) {
            try {
                await SupabaseDatabaseService.addNotification({
                    type: notificationData.type,
                    title: notificationData.title,
                    message: notificationData.message,
                    recipient_id: notificationData.recipientId,
                    link_url: notificationData.link
                });
            } catch (error) {
                console.error('Failed to add notification to database:', error);
            }
        }
    };

    const markAsRead = async (id: string) => {
        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));

        // Sync to database
        if (isSupabaseConfigured()) {
            try {
                await SupabaseDatabaseService.markNotificationAsRead(id);
            } catch (error) {
                console.error('Failed to mark notification as read in database:', error);
            }
        }
    };

    const markAllAsRead = async () => {
        // Optimistic update
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));

        // Sync to database
        if (userId && userType && isSupabaseConfigured()) {
            try {
                const recipientId = `${userType}-${userId}`;
                await SupabaseDatabaseService.markAllNotificationsAsRead(recipientId);
            } catch (error) {
                console.error('Failed to mark all notifications as read in database:', error);
            }
        }
    };

    const deleteNotification = async (id: string) => {
        // Optimistic update
        setNotifications(prev => prev.filter(n => n.id !== id));

        // Sync to database
        if (isSupabaseConfigured()) {
            try {
                await SupabaseDatabaseService.deleteNotification(id);
            } catch (error) {
                console.error('Failed to delete notification from database:', error);
            }
        }
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    const value = {
        notifications,
        addNotification,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        unreadCount,
        loading
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};