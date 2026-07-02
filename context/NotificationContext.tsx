import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { Notification } from '../types';
import { useDatabase } from './DatabaseContext';

import { useAuth } from './AuthContext';
import { useMechanicAuth } from './MechanicAuthContext';

interface NotificationContextType {
    notifications: Notification[];
    addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'createdBy' | 'status'> & { date?: string }) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: (recipientId?: string) => void;
    deleteNotification: (id: string) => void;
    clearAllNotifications: (recipientId: string) => Promise<void>;
    unreadCount: number;
}

const globalContext = (globalThis as any)._NotificationContext;
const NotificationContext = globalContext || createContext<NotificationContextType | undefined>(undefined);
if (!globalContext) {
    (globalThis as any)._NotificationContext = NotificationContext;
}

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
        ? mechanic.id
        : isAuthenticated && user
        ? user.id
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

    // Live notifications from Firestore, sorted newest first, filtered strictly by active UID to prevent leakage.
    // Each user ONLY sees notifications that belong to them — NEVER cross-user notifications.
    const notifications = [...(db?.notifications || [])]
        .filter(n => {
            // Hide notifications that were cleared (by timestamp)
            if (clearedAt > 0 && (n.timestamp ?? 0) <= clearedAt) return false;

            // Strict filtering by recipientId
            if (n.recipientId === 'all') return true;
            if (activeRecipientId && n.recipientId === activeRecipientId) return true;

            return false;
        })
        .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));

    const unreadCount = notifications.filter(n => n.status === 'unread' || n.read === false).length;

    const addNotification = (notificationData: Omit<Notification, 'id' | 'createdAt' | 'createdBy' | 'status'> & { date?: string }) => {
        let recipientId = notificationData.recipientId || 'all';
        let recipientRole: 'customer' | 'mechanic' | 'admin' | undefined;

        if (recipientId.startsWith('mechanic-')) {
            recipientId = recipientId.replace('mechanic-', '');
            recipientRole = 'mechanic';
        } else if (recipientId.startsWith('customer-')) {
            recipientId = recipientId.replace('customer-', '');
            recipientRole = 'customer';
        } else if (recipientId === 'admin') {
            recipientRole = 'admin';
        }

        dbAddNotification({
            ...notificationData,
            recipientId,
            recipientRole,
            timestamp: Date.now(),
            status: 'unread',
            read: false, // Legacy
            date: notificationData.date || new Date().toISOString()
        } as any);
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

    // --- Sound and Voice Announcements ---
    const [lastNotifiedId, setLastNotifiedId] = useState<string | null>(null);

    const playNotificationChime = useCallback(() => {
        try {
            if (navigator.userActivation && !navigator.userActivation.hasBeenActive) {
                return; // Prevent warning/error if user has not interacted with the page yet
            }
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioCtx) return;
            const ctx = new AudioCtx();
            const now = ctx.currentTime;

            const playTone = (freq: number, start: number, duration: number) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(0, start);
                gain.gain.linearRampToValueAtTime(0.15, start + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
                osc.start(start);
                osc.stop(start + duration);
            };

            // Pleasant double chime (D5 -> A5)
            playTone(587.33, now, 0.3);      
            playTone(880.00, now + 0.08, 0.5);  
        } catch (e) {
            console.warn('[NotificationContext] Failed to play chime:', e);
        }
    }, []);

    const speakNotification = useCallback((title: string, message: string) => {
        try {
            if (navigator.userActivation && !navigator.userActivation.hasBeenActive) {
                return; // Prevent warning/error if user has not interacted with the page yet
            }
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel(); // Clear any ongoing speaking queue

                let speechText = `${title}. ${message}`;
                const lowerTitle = title.toLowerCase();
                const lowerMsg = message.toLowerCase();

                // Lookup extra details (Customer & Mechanic) from DB bookings to enhance spoken message
                let bookingDetails = '';
                if (db?.bookings) {
                    const matchedBooking = db.bookings.find(b => 
                        (b.id && message.includes(b.id.slice(-6))) || 
                        (b.customerName && message.toLowerCase().includes(b.customerName.toLowerCase()))
                    );
                    if (matchedBooking) {
                        const customerName = matchedBooking.customerName || 'Customer';
                        const mechanicName = matchedBooking.mechanic?.name || matchedBooking.mechanicName || 'unassigned';
                        bookingDetails = ` Customer name is ${customerName}. Assigned mechanic is ${mechanicName}.`;
                    }
                }

                // Check event category and construct clear spoken report
                if (lowerTitle.includes('payment') || lowerMsg.includes('payment') || lowerTitle.includes('gcash') || lowerMsg.includes('gcash')) {
                    if (lowerMsg.includes('deposit') || lowerMsg.includes('downpayment') || lowerMsg.includes('down payment')) {
                        speechText = `Attention Admin. Downpayment verified. ${message}.${bookingDetails}`;
                    } else if (lowerMsg.includes('balance') || lowerMsg.includes('completion') || lowerMsg.includes('full payment') || lowerMsg.includes('marked as paid')) {
                        speechText = `Attention Admin. Balance payment for completion verified. ${message}.${bookingDetails}`;
                    } else {
                        speechText = `Attention Admin. Payment notification. ${message}.${bookingDetails}`;
                    }
                } else if (lowerTitle.includes('booking') || lowerMsg.includes('booking')) {
                    speechText = `Attention Admin. New service booking. ${message}.${bookingDetails}`;
                } else if (lowerTitle.includes('order') || lowerMsg.includes('order')) {
                    speechText = `Attention Admin. New store order placed. ${message}`;
                } else if (lowerTitle.includes('onboarding') || lowerTitle.includes('onboard') || lowerTitle.includes('registration') || lowerMsg.includes('registered')) {
                    if (lowerMsg.includes('mechanic') || lowerTitle.includes('mechanic')) {
                        speechText = `Attention Admin. New mechanic account created. ${message}`;
                    } else {
                        speechText = `Attention Admin. New customer account created. ${message}`;
                    }
                }

                const utterance = new SpeechSynthesisUtterance(speechText);
                utterance.rate = 0.95;
                utterance.pitch = 1.0;

                const voices = window.speechSynthesis.getVoices();
                const preferredVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Microsoft')));
                if (preferredVoice) {
                    utterance.voice = preferredVoice;
                }

                window.speechSynthesis.speak(utterance);
            }
        } catch (e) {
            console.warn('[NotificationContext] Speech synthesis error:', e);
        }
    }, [db?.bookings]);

    useEffect(() => {
        if (!isAdminAuthenticated || notifications.length === 0) return;

        const latestNotif = notifications[0];
        if (latestNotif && latestNotif.id && latestNotif.id !== lastNotifiedId) {
            setLastNotifiedId(latestNotif.id);

            if (latestNotif.status === 'unread' || latestNotif.read === false) {
                playNotificationChime();
                speakNotification(latestNotif.title || 'Notification', latestNotif.message || '');
            }
        }
    }, [notifications, isAdminAuthenticated, lastNotifiedId, playNotificationChime, speakNotification]);

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