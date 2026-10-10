import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, ActionPerformed, PushNotificationSchema } from '@capacitor/push-notifications';
import { db } from '../firebase';
import { doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';

export interface FCMUserRegistration {
    userId: string;
    role: 'customer' | 'mechanic' | 'admin';
}

class FCMService {
    private registered = false;
    private currentToken: string | null = null;
    private onNotificationTapCallback: ((data: Record<string, any>) => void) | null = null;

    /**
     * Set a custom callback handler when a user taps on a push notification
     */
    public setNotificationTapHandler(callback: (data: Record<string, any>) => void) {
        this.onNotificationTapCallback = callback;
    }

    /**
     * Initializes push notifications on native devices (Android / iOS).
     * Requests permissions, creates Android notification channel, and syncs device token to Firestore.
     */
    public async initialize(userInfo?: FCMUserRegistration): Promise<string | null> {
        if (!Capacitor.isNativePlatform()) {
            // Web / PWA fallback: native push plugins are only executed on Android / iOS
            return null;
        }

        if (this.registered && this.currentToken) {
            if (userInfo) {
                await this.syncTokenToUser(this.currentToken, userInfo);
            }
            return this.currentToken;
        }

        try {
            // 1. Check or request notification permissions (required on Android 13+ and iOS)
            let permStatus = await PushNotifications.checkPermissions();
            if (permStatus.receive === 'prompt' || permStatus.receive === 'prompt-with-rationale') {
                permStatus = await PushNotifications.requestPermissions();
            }

            if (permStatus.receive !== 'granted') {
                console.warn('[FCMService] Push notification permission not granted:', permStatus.receive);
                return null;
            }

            // 2. Create Android Notification Channel with sound & vibration
            if (Capacitor.getPlatform() === 'android') {
                await PushNotifications.createChannel({
                    id: 'ridersbud_notifications',
                    name: 'RidersBUD Alerts',
                    description: 'Real-time updates for bookings, mechanic status, and chat messages',
                    importance: 5, // High importance (heads-up notification)
                    visibility: 1,
                    sound: 'default',
                    vibration: true,
                    lights: true,
                    lightColor: '#FE7803' // RidersBUD primary brand orange
                });
            }

            // 3. Setup Push Listeners
            this.setupListeners(userInfo);

            // 4. Register with Apple APNS / Google FCM
            await PushNotifications.register();
            this.registered = true;

            return this.currentToken;
        } catch (error) {
            console.error('[FCMService] Failed to initialize push notifications:', error);
            return null;
        }
    }

    private setupListeners(userInfo?: FCMUserRegistration) {
        // Remove existing listeners to prevent duplicates
        PushNotifications.removeAllListeners();

        // On registration success: Token received from FCM
        PushNotifications.addListener('registration', async (token: Token) => {
            this.currentToken = token.value;
            console.log('[FCMService] Push registration successful, FCM Token:', token.value);
            if (userInfo) {
                await this.syncTokenToUser(token.value, userInfo);
            }
        });

        // On registration error
        PushNotifications.addListener('registrationError', (error: any) => {
            console.error('[FCMService] Push registration error:', error);
        });

        // On notification received while app is in foreground
        PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
            console.log('[FCMService] Push notification received in foreground:', notification);
        });

        // On notification action performed (user tapped the notification)
        PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
            console.log('[FCMService] Push action performed:', action);
            const notificationData = action.notification.data || {};
            if (this.onNotificationTapCallback) {
                this.onNotificationTapCallback(notificationData);
            }
        });
    }

    /**
     * Saves the device FCM token into the user's Firestore document.
     * Uses arrayUnion to preserve multiple logged-in devices without overwriting.
     */
    public async syncTokenToUser(token: string, userInfo: FCMUserRegistration): Promise<void> {
        if (!token || !userInfo?.userId) return;

        try {
            const collectionName = userInfo.role === 'mechanic' ? 'mechanics' : 'users';
            const userRef = doc(db, collectionName, userInfo.userId);

            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                await updateDoc(userRef, {
                    fcmTokens: arrayUnion(token),
                    lastFcmUpdate: new Date().toISOString(),
                    platform: Capacitor.getPlatform()
                });
                console.log(`[FCMService] Synced FCM token to ${collectionName}/${userInfo.userId}`);
            }
        } catch (err) {
            console.warn('[FCMService] Could not sync FCM token to Firestore:', err);
        }
    }
}

export const fcmService = new FCMService();
