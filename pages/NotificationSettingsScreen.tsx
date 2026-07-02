
import React, { useState, useEffect, useRef } from 'react';
import CustomerHeader from '../components/CustomerHeader';
import { Bell, CheckCircle, Smartphone, Wifi } from 'lucide-react';
import {
    getNotificationSettings,
    saveNotificationSettings,
    NotificationSettings,
    requestNotificationPermission,
    hasNotificationAPI,
    getNotificationPermission,
} from '../utils/notificationManager';
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
    const [isSaving, setIsSaving] = useState(false);
    const [savedFlash, setSavedFlash] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

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
        const result = await requestNotificationPermission();
        setPermissionStatus(result);
    };

    if (!user) return (
        <div className="flex items-center justify-center h-screen bg-[#121212]">
            <Spinner size="lg" />
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-[#121212] text-white font-sans">
            <CustomerHeader title="Notification Settings" showBackButton icon={<Bell size={22} />} />

            <div className="flex-grow p-5 space-y-7 overflow-y-auto pb-8">

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

                {/* Platform Notification Status */}
                <div>
                    <SectionHeader title="Push Notifications" />
                    {webNotifSupported ? (
                        // Web/Desktop: show real permission control
                        <div className="bg-[#1A1A1A] p-4 rounded-2xl border border-white/5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${permissionStatus === 'granted' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            {permissionStatus === 'granted' ? (
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            ) : (
                                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                            )}
                                        </svg>
                                    </div>
                                    <div>
                                        <p className={`text-sm font-bold ${permissionStatus === 'granted' ? 'text-green-400' : 'text-red-400'}`}>
                                            {permissionStatus === 'granted' ? 'Notifications Enabled' : 'Notifications Blocked'}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {permissionStatus === 'granted' ? 'You will receive desktop alerts.' : 'Enable in browser settings.'}
                                        </p>
                                    </div>
                                </div>
                                {permissionStatus === 'default' && (
                                    <button
                                        id="btn-enable-notifications"
                                        onClick={handleRequestPermission}
                                        className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-orange-600 transition-colors"
                                    >
                                        Enable
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        // Mobile WebView: informational card
                        <div className="bg-[#1A1A1A] p-4 rounded-2xl border border-white/5">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-primary/10 text-primary mt-0.5">
                                    <Smartphone size={18} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white">Mobile Push Notifications</p>
                                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                        In-app notifications are always active. Push notifications are managed through your device's system settings for the RidersBUD app.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
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
