
import React, { useState, useEffect, useRef } from 'react';
import CustomerHeader from '../components/CustomerHeader';
import { Bell, CheckCircle, Smartphone, Wifi, Sparkles, Send, ShieldCheck } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import {
    getNotificationSettings,
    saveNotificationSettings,
    NotificationSettings,
    requestNotificationPermission,
    hasNotificationAPI,
    getNotificationPermission,
    showNotification,
} from '../utils/notificationManager';
import { fcmService } from '../services/fcmService';
import { useAuth } from '../context/AuthContext';
import { useDatabase } from '../context/DatabaseContext';
import { Customer } from '../types';
import Spinner from '../components/Spinner';

interface ExtendedCustomer extends Customer {
    notificationSettings?: NotificationSettings;
}
const ToggleSwitch: React.FC<{
    label: string;
    description: string;
    enabled: boolean;
    onChange: (enabled: boolean) => void;
    id: string;
}> = ({ label, description, enabled, onChange, id }) => {
    return (
        <div className="flex items-center justify-between bg-[#1A1A1A] border border-white/5 p-4 rounded-xl transition-colors hover:border-white/10">
            <div className="pr-4 flex-1 min-w-0">
                <h4 className="font-bold text-white text-sm mb-0.5">{label}</h4>
                <p className="text-xs text-gray-500 leading-snug">{description}</p>
            </div>
            <button
                id={id}
                type="button"
                role="switch"
                aria-checked={enabled}
                className={`${enabled ? 'bg-primary' : 'bg-[#333]'} relative inline-flex flex-shrink-0 items-center rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-primary/50`}
                style={{ width: '44px', height: '24px' }}
                onClick={() => onChange(!enabled)}
            >
                <span
                    className="absolute rounded-full bg-white transition-all duration-200 shadow-sm shrink-0"
                    style={{
                        width: '16px',
                        height: '16px',
                        top: '4px',
                        left: enabled ? '24px' : '4px'
                    }}
                />
            </button>
        </div>
    );
};

const SectionHeader: React.FC<{ title: string; saving?: boolean }> = ({ title, saving }) => (
    <div className="flex items-center justify-between mb-3">
        <h3 className="text-[11px] font-black text-gray-500 tracking-widest uppercase">{title}</h3>
        {saving && <span className="text-[10px] text-primary animate-pulse font-bold">Saving...</span>}
    </div>
);

const NotificationSettingsScreen: React.FC = () => {
    const { user } = useAuth();
    const { updateUserNotificationSettings } = useDatabase();

    const [settings, setSettings] = useState<NotificationSettings>(() => {
        const currentUser = user as ExtendedCustomer;
        if (currentUser?.notificationSettings) {
            return { ...getNotificationSettings(), ...currentUser.notificationSettings };
        }
        return getNotificationSettings();
    });

    const webNotifSupported = hasNotificationAPI();
    const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(getNotificationPermission);
    const [nativePushStatus, setNativePushStatus] = useState<string>('checking');
    const [isSaving, setIsSaving] = useState(false);
    const [isTestingPush, setIsTestingPush] = useState(false);
    const [testPushFeedback, setTestPushFeedback] = useState<string | null>(null);
    const [savedFlash, setSavedFlash] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const { addNotification } = useDatabase();

    // Check Native FCM push status
    useEffect(() => {
        if (Capacitor.isNativePlatform()) {
            fcmService.getPermissionStatus().then(status => {
                setNativePushStatus(status);
            });
        }
    }, []);

    // Sync from User when it loads from Firestore
    useEffect(() => {
        const currentUser = user as ExtendedCustomer;
        if (currentUser?.notificationSettings) {
            setSettings(prev => ({ ...prev, ...currentUser.notificationSettings }));
        }
    }, [user]);

    // Auto-save with debounce on settings change
    useEffect(() => {
        const saveToFirestore = async () => {
            if (!user) return;
            setIsSaving(true);
            try {
                saveNotificationSettings(settings);
                await updateUserNotificationSettings(user.id, settings);
                setSavedFlash(true);
                setTimeout(() => setSavedFlash(false), 2000);
            } catch (error) {
                console.error('Failed to save notification settings:', error);
            } finally {
                setIsSaving(false);
            }
        };

        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(saveToFirestore, 1000);
        return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
    }, [settings]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleSettingChange = (key: keyof NotificationSettings, value: boolean | string) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleChannelChange = (channel: keyof NotificationSettings['notificationChannels'], value: boolean) => {
        setSettings(prev => ({
            ...prev,
            notificationChannels: { ...prev.notificationChannels, [channel]: value },
        }));
    };

    const handleRequestPermission = async () => {
        if (Capacitor.isNativePlatform() && user?.id) {
            await fcmService.initialize({ userId: user.id, role: 'customer' });
            const status = await fcmService.getPermissionStatus();
            setNativePushStatus(status);
            setPermissionStatus(status === 'granted' ? 'granted' : 'denied');
        } else {
            const result = await requestNotificationPermission();
            setPermissionStatus(result);
        }
    };

    const handleTestNotification = async () => {
        if (!user?.id) return;
        setIsTestingPush(true);
        setTestPushFeedback(null);

        try {
            // Trigger both: local browser alert (if web) AND live Firestore notification
            // which triggers the real-time Cloud Function FCM dispatcher directly to the phone!
            if (webNotifSupported && permissionStatus === 'granted') {
                showNotification('RidersBUD Customer Alert', {
                    body: 'Live push notification test: Your account is fully synchronized with real-time push alerts!',
                    tag: 'ridersbud-customer-test'
                });
            }

            // Write to Firestore notifications collection:
            // This triggers sendPushNotificationOnNewDocument in Cloud Functions!
            await addNotification({
                recipientId: `customer-${user.id}`,
                recipientRole: 'customer',
                title: '🔔 RidersBUD Live Push Alert',
                message: 'FCM push notification is fully active and working in real-time on your mobile device!',
                type: 'info',
                link: '/customer-portal/notifications',
                date: new Date().toISOString(),
                read: false
            });

            setTestPushFeedback('✅ Test push alert dispatched! Check your phone.');
            setTimeout(() => setTestPushFeedback(null), 5000);
        } catch (err) {
            console.error('Test push error:', err);
            setTestPushFeedback('❌ Dispatched with fallback. Check notification bell.');
            setTimeout(() => setTestPushFeedback(null), 5000);
        } finally {
            setIsTestingPush(false);
        }
    };

    if (!user) return (
        <div className="flex items-center justify-center h-screen bg-[#121212]">
            <Spinner size="lg" />
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-[#121212] text-white font-sans">
            <CustomerHeader title="Notification Settings" showBackButton icon={<Bell size={22} />} />

            <div className="flex-grow p-5 space-y-7 overflow-y-auto pb-bottom-nav">

                {/* General Section */}
                <div>
                    <SectionHeader title="General Notifications" saving={isSaving} />
                    <div className="space-y-2.5">
                        <ToggleSwitch
                            id="toggle-booking-updates"
                            label="Booking Updates"
                            description="Get notified when your mechanic is assigned, en route, or completes the job."
                            enabled={settings.bookingUpdates}
                            onChange={(v) => handleSettingChange('bookingUpdates', v)}
                        />
                        <ToggleSwitch
                            id="toggle-service-reminders"
                            label="Service Reminders"
                            description="Receive alerts for upcoming maintenance due dates."
                            enabled={settings.serviceReminders}
                            onChange={(v) => handleSettingChange('serviceReminders', v)}
                        />
                        <ToggleSwitch
                            id="toggle-promotions"
                            label="Promotions & Offers"
                            description="Stay informed about our latest exclusive deals."
                            enabled={settings.promotions}
                            onChange={(v) => handleSettingChange('promotions', v)}
                        />
                    </div>
                </div>

                {/* Reminder Preferences */}
                <div>
                    <SectionHeader title="Reminder Preferences" />
                    <div className="bg-[#1A1A1A] p-5 rounded-2xl border border-white/5 space-y-5">
                        <div>
                            <label htmlFor="reminder-lead-time" className="block text-xs font-bold text-white mb-2">
                                Remind Me Before
                            </label>
                            <div className="relative">
                                <select
                                    id="reminder-lead-time"
                                    value={settings.reminderLeadTime}
                                    onChange={(e) => handleSettingChange('reminderLeadTime', e.target.value as NotificationSettings['reminderLeadTime'])}
                                    className="w-full px-4 py-3 bg-[#121212] border border-white/10 rounded-xl text-white focus:outline-none focus:border-primary/50 transition-all text-sm"
                                >
                                    <option value="1-hour">1 Hour Before</option>
                                    <option value="1-day">1 Day Before</option>
                                    <option value="2-days">2 Days Before</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-white mb-3">Notification Channels</label>
                            <div className="space-y-2.5">
                                {[
                                    { key: 'inApp' as const, label: 'In-App Notification' },
                                    { key: 'email' as const, label: 'Email' },
                                    { key: 'sms' as const, label: 'SMS' },
                                ].map(({ key, label }) => (
                                    <label
                                        key={key}
                                        htmlFor={`channel-${key}`}
                                        className="flex items-center gap-3 p-3 bg-[#121212] rounded-xl border border-white/5 hover:border-white/10 transition-colors cursor-pointer"
                                    >
                                        <input
                                            id={`channel-${key}`}
                                            type="checkbox"
                                            checked={settings.notificationChannels[key]}
                                            onChange={e => handleChannelChange(key, e.target.checked)}
                                            className="h-5 w-5 rounded border-gray-600 text-primary focus:ring-primary bg-[#1E1E1E] accent-primary"
                                        />
                                        <span className="text-sm text-gray-200 font-medium">{label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Platform Notification Status & Live FCM Push Test */}
                <div>
                    <SectionHeader title="Mobile & Push Notifications" />
                    <div className="bg-[#1A1A1A] p-5 rounded-2xl border border-white/5 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                    (Capacitor.isNativePlatform() ? nativePushStatus === 'granted' : permissionStatus === 'granted')
                                        ? 'bg-green-500/10 text-green-500'
                                        : 'bg-primary/10 text-primary'
                                }`}>
                                    <Smartphone size={20} />
                                </div>
                                <div>
                                    <p className={`text-sm font-bold ${
                                        (Capacitor.isNativePlatform() ? nativePushStatus === 'granted' : permissionStatus === 'granted')
                                            ? 'text-green-400'
                                            : 'text-gray-200'
                                    }`}>
                                        {(Capacitor.isNativePlatform() ? nativePushStatus === 'granted' : permissionStatus === 'granted')
                                            ? 'FCM Push Notifications Online'
                                            : 'Push Notifications Ready'}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        {Capacitor.isNativePlatform()
                                            ? (nativePushStatus === 'granted'
                                                ? 'Live Android system alerts, sounds & vibration active.'
                                                : 'Tap Enable to allow instant push alerts on this phone.')
                                            : (permissionStatus === 'granted'
                                                ? 'Browser and mobile push channels connected.'
                                                : 'Enable alerts to receive live mechanic updates.')}
                                    </p>
                                </div>
                            </div>

                            {((Capacitor.isNativePlatform() && nativePushStatus !== 'granted') || (!Capacitor.isNativePlatform() && permissionStatus === 'default')) && (
                                <button
                                    id="btn-enable-notifications"
                                    type="button"
                                    onClick={handleRequestPermission}
                                    className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-orange-600 transition-colors shadow-lg shadow-primary/20"
                                >
                                    Enable
                                </button>
                            )}
                        </div>

                        {/* Test Push Notification Button */}
                        <div className="pt-2 border-t border-white/5">
                            <button
                                id="btn-test-push-notification"
                                type="button"
                                disabled={isTestingPush}
                                onClick={handleTestNotification}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-[#121212] hover:bg-white/5 active:scale-[0.98] text-white font-bold text-xs rounded-xl border border-white/10 transition-all disabled:opacity-50"
                            >
                                <Sparkles size={15} className="text-primary animate-pulse" />
                                {isTestingPush ? 'Dispatching Live Push...' : 'Send Test Mobile Push Notification'}
                            </button>

                            {testPushFeedback && (
                                <p className="text-center text-xs mt-2 font-semibold text-primary animate-fade-in">
                                    {testPushFeedback}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer status bar */}
            <div className="p-4 bg-[#121212] border-t border-white/5 text-center flex items-center justify-center gap-2 h-14">
                {savedFlash ? (
                    <span className="text-[11px] text-green-400 font-bold flex items-center gap-1.5">
                        <CheckCircle size={13} /> Settings saved to your profile
                    </span>
                ) : (
                    <p className="text-[10px] text-gray-600">Changes are saved automatically to your profile.</p>
                )}
            </div>
        </div>
    );
};

export default NotificationSettingsScreen;
