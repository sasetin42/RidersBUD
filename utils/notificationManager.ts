
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
};

export interface MechanicNotificationSettings {
    newJobAlerts: boolean;
    jobStatusChanges: boolean;
    paymentConfirmations: boolean;
}

const DEFAULT_MECHANIC_SETTINGS: MechanicNotificationSettings = {
    newJobAlerts: true,
    jobStatusChanges: true,
    paymentConfirmations: true,
};


export const getNotificationSettings = (): NotificationSettings => {
    try {
        const stored = localStorage.getItem('notificationSettings');
        if (stored) {
            // Merge stored settings with defaults to handle cases where new settings are added
            return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
        }
    } catch (e) {
        console.error("Failed to parse notification settings", e);
    }
    return DEFAULT_SETTINGS;
};

export const saveNotificationSettings = (settings: NotificationSettings) => {
    try {
        localStorage.setItem('notificationSettings', JSON.stringify(settings));
    } catch (e) {
        console.error("Failed to save notification settings", e);
    }
};

export const getMechanicNotificationSettings = (): MechanicNotificationSettings => {
    try {
        const stored = localStorage.getItem('mechanicNotificationSettings');
        if (stored) {
            return { ...DEFAULT_MECHANIC_SETTINGS, ...JSON.parse(stored) };
        }
    } catch (e) {
        console.error("Failed to parse mechanic notification settings", e);
    }
    return DEFAULT_MECHANIC_SETTINGS;
};

export const saveMechanicNotificationSettings = (settings: MechanicNotificationSettings) => {
    try {
        localStorage.setItem('mechanicNotificationSettings', JSON.stringify(settings));
    } catch (e) {
        console.error("Failed to save mechanic notification settings", e);
    }
};


export const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
        console.log("This browser does not support desktop notification");
        return;
    }

    // Only request if the permission is not yet granted or denied
    if (Notification.permission === 'default') {
        try {
            await Notification.requestPermission();
        } catch (error) {
            console.error("Error requesting notification permission:", error);
        }
    }
};

export const showNotification = (title: string, options: NotificationOptions) => {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
            ...options,
            icon: 'https://storage.googleapis.com/aistudio-hosting/generative-ai/e499715a-a38f-4d32-80f2-9b2512f7a6b2/assets/RidersBUD_icon.png',
            badge: 'https://storage.googleapis.com/aistudio-hosting/generative-ai/e499715a-a38f-4d32-80f2-9b2512f7a6b2/assets/RidersBUD_icon.png'
        });
    }
};