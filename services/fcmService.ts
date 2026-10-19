import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, ActionPerformed, PushNotificationSchema } from '@capacitor/push-notifications';
import { db } from '../firebase';
import { doc, setDoc, arrayUnion } from 'firebase/firestore';

export interface FCMUserRegistration {
    userId: string;
    role: 'customer' | 'mechanic' | 'admin';
}

class FCMService {
    private registered = false;
    private currentToken: string | null = null;
    private currentUserInfo: FCMUserRegistration | null = null;
    private onNotificationTapCallback: ((data: Record<string, any>) => void) | null = null;

    /**
     * Get the currently registered FCM token if available
     */
    public getToken(): string | null {
        return this.currentToken;
    }

    /**
     * Check current native push notification permission
     */
    public async getPermissionStatus(): Promise<string> {
        if (!Capacitor.isNativePlatform()) return 'not-native';
        try {
            const status = await PushNotifications.checkPermissions();
            return status.receive;
        } catch {
            return 'prompt';
        }
    }

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
    public async initialize(userInfo?: FCMUserRegistration, customSettings?: { channelId?: string; channelName?: string; accentColor?: string; soundTheme?: string }): Promise<string | null> {
        if (!Capacitor.isNativePlatform()) {
            // Web / PWA fallback: native push plugins are only executed on Android / iOS
            return null;
        }

        if (userInfo) {
            this.currentUserInfo = userInfo;
        }

        if (this.registered && this.currentToken) {
            if (this.currentUserInfo) {
                await this.syncTokenToUser(this.currentToken, this.currentUserInfo);
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

            // 2. Create Android Notification Channel with sound & vibration using dynamic settings
            if (Capacitor.getPlatform() === 'android') {
                await PushNotifications.createChannel({
                    id: customSettings?.channelId || 'ridersbud_notifications',
                    name: customSettings?.channelName || 'RidersBUD Alerts',
                    description: 'Real-time updates for bookings, mechanic status, and chat messages',
                    importance: 5, // High importance (heads-up notification)
                    visibility: 1,
                    sound: customSettings?.soundTheme || 'default',
                    vibration: true,
                    lights: true,
                    lightColor: customSettings?.accentColor || '#FE7803' // Configured FCM brand accent color
                });
            }

            // 3. Setup Push Listeners
            this.setupListeners();

            // 4. Register with Apple APNS / Google FCM
            await PushNotifications.register();
            this.registered = true;

            // If token was already obtained, sync immediately
            if (this.currentToken && this.currentUserInfo) {
                await this.syncTokenToUser(this.currentToken, this.currentUserInfo);
            }

            return this.currentToken;
        } catch (error) {
            console.error('[FCMService] Failed to initialize push notifications:', error);
            return null;
        }
    }

    private setupListeners() {
        // Remove existing listeners to prevent duplicates
        PushNotifications.removeAllListeners();

        // On registration success: Token received from FCM
        PushNotifications.addListener('registration', async (token: Token) => {
            this.currentToken = token.value;
            console.log('[FCMService] Push registration successful, FCM Token:', token.value);
            if (this.currentUserInfo) {
                await this.syncTokenToUser(token.value, this.currentUserInfo);
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
     * Saves the device FCM token into the user's Firestore document(s).
     * Uses arrayUnion with setDoc merge: true to preserve multiple logged-in devices reliably.
     */
    public async syncTokenToUser(token: string, userInfo: FCMUserRegistration): Promise<void> {
        if (!token || !userInfo?.userId) return;
        this.currentUserInfo = userInfo;

        const cleanId = userInfo.userId.replace(/^customer-/, '').replace(/^mechanic-/, '');

        try {
            const tokenData = {
                fcmTokens: [token],
                lastFcmUpdate: new Date().toISOString(),
                platform: Capacitor.getPlatform()
            };

            if (userInfo.role === 'mechanic') {
                const mechRef = doc(db, 'mechanics', cleanId);
                await setDoc(mechRef, tokenData, { merge: true });
                console.log(`[FCMService] Synced FCM token to mechanics/${cleanId}`);
            } else if (userInfo.role === 'customer') {
                const userRef = doc(db, 'users', cleanId);
                const custRef = doc(db, 'customers', cleanId);
                await Promise.all([
                    setDoc(userRef, tokenData, { merge: true }),
                    setDoc(custRef, tokenData, { merge: true })
                ]);
                console.log(`[FCMService] Synced FCM token to users/${cleanId} & customers/${cleanId}`);
            } else if (userInfo.role === 'admin') {
                const adminRef = doc(db, 'adminUsers', cleanId);
                await setDoc(adminRef, tokenData, { merge: true });
                console.log(`[FCMService] Synced FCM token to adminUsers/${cleanId}`);
            }
        } catch (err) {
            console.warn('[FCMService] Could not sync FCM token to Firestore:', err);
        }
    }
}

export const fcmService = new FCMService();
