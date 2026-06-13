
export interface NotificationSettings {
    bookingUpdates: boolean;
    serviceReminders: boolean;
    promotions: boolean;
    reminderLeadTime: '1-hour' | '1-day' | '2-days';
    notificationChannels: {
        inApp: boolean;
        email: boolean;
        sms: boolean;
    };
    soundEnabled: boolean;
    soundTheme: 'hud' | 'chime' | 'beep';
    quietHoursEnabled: boolean;
    quietHoursStart: string;
    quietHoursEnd: string;
}

const DEFAULT_SETTINGS: NotificationSettings = {
    bookingUpdates: true,
    serviceReminders: true,
    promotions: true,
    reminderLeadTime: '1-day',
    notificationChannels: {
        inApp: true,
        email: true,
        sms: false,
    },
    soundEnabled: true,
    soundTheme: 'hud',
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
};

export interface MechanicNotificationSettings {
    newJobAlerts: boolean;
    jobStatusChanges: boolean;
    paymentConfirmations: boolean;
    soundEnabled: boolean;
    soundTheme: 'engine' | 'brake' | 'chime';
    quietHoursEnabled: boolean;
    quietHoursStart: string;
    quietHoursEnd: string;
    maxJobDistance: '5km' | '15km' | '30km' | 'any';
}

const DEFAULT_MECHANIC_SETTINGS: MechanicNotificationSettings = {
    newJobAlerts: true,
    jobStatusChanges: true,
    paymentConfirmations: true,
    soundEnabled: true,
    soundTheme: 'chime',
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
    maxJobDistance: 'any',
};

/** Safely checks if the Web Notification API is available (not available in Android WebViews). */
export const hasNotificationAPI = (): boolean => {
    return typeof window !== 'undefined' && 'Notification' in window;
};

/** Safely gets the current notification permission without crashing on mobile. */
export const getNotificationPermission = (): NotificationPermission => {
    if (!hasNotificationAPI()) return 'default';
    return Notification.permission;
};

export const getNotificationSettings = (): NotificationSettings => {
    try {
        const stored = localStorage.getItem('notificationSettings');
        if (stored) {
            return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
        }
    } catch (e) {
        console.error('Failed to parse notification settings', e);
    }
    return DEFAULT_SETTINGS;
};

export const saveNotificationSettings = (settings: NotificationSettings) => {
    try {
        localStorage.setItem('notificationSettings', JSON.stringify(settings));
    } catch (e) {
        console.error('Failed to save notification settings', e);
    }
};

export const getMechanicNotificationSettings = (): MechanicNotificationSettings => {
    try {
        const stored = localStorage.getItem('mechanicNotificationSettings');
        if (stored) {
            return { ...DEFAULT_MECHANIC_SETTINGS, ...JSON.parse(stored) };
        }
    } catch (e) {
        console.error('Failed to parse mechanic notification settings', e);
    }
    return DEFAULT_MECHANIC_SETTINGS;
};

export const saveMechanicNotificationSettings = (settings: MechanicNotificationSettings) => {
    try {
        localStorage.setItem('mechanicNotificationSettings', JSON.stringify(settings));
    } catch (e) {
        console.error('Failed to save mechanic notification settings', e);
    }
};

export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
    if (!hasNotificationAPI()) {
        console.log('Notification API not supported on this platform.');
        return 'default';
    }
    if (Notification.permission === 'default') {
        try {
            const result = await Notification.requestPermission();
            return result;
        } catch (error) {
            console.error('Error requesting notification permission:', error);
        }
    }
    return Notification.permission;
};

export const showNotification = (title: string, options: NotificationOptions) => {
    if (hasNotificationAPI() && Notification.permission === 'granted') {
        new Notification(title, {
            ...options,
            icon: '/riders-logo.png',
            badge: '/riders-logo.png',
        });
    }
};