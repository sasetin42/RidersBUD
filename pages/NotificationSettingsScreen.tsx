

import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { getNotificationSettings, saveNotificationSettings, NotificationSettings, requestNotificationPermission } from '../utils/notificationManager';

const ToggleSwitch: React.FC<{ label: string; description: string; enabled: boolean; onChange: (enabled: boolean) => void; }> = ({ label, description, enabled, onChange }) => {
  return (
    <div className="flex items-center justify-between bg-dark-gray p-4 rounded-lg">
      <div>
        <h4 className="font-semibold text-white">{label}</h4>
        <p className="text-sm text-light-gray">{description}</p>
      </div>
      <button
        type="button"
        className={`${enabled ? 'bg-primary' : 'bg-field'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-secondary`}
        onClick={() => onChange(!enabled)}
        aria-pressed={enabled}
      >
        <span
          className={`${enabled ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
        />
      </button>
    </div>
  );
};

const NotificationSettingsScreen: React.FC = () => {
    const [settings, setSettings] = useState<NotificationSettings>(getNotificationSettings());
    const [permissionStatus, setPermissionStatus] = useState(Notification.permission);

    useEffect(() => {
        saveNotificationSettings(settings);
    }, [settings]);

    const handleSettingChange = (key: keyof NotificationSettings, value: any) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleChannelChange = (channel: keyof NotificationSettings['notificationChannels'], value: boolean) => {
        setSettings(prev => ({
            ...prev,
            notificationChannels: {
                ...prev.notificationChannels,
                [channel]: value
            }
        }));
    };

    const handleRequestPermission = async () => {
        await requestNotificationPermission();
        // After the request, update the status to reflect the user's choice.
        setPermissionStatus(Notification.permission);
    };

    return (
        <div className="flex flex-col h-full bg-secondary">
            <Header title="Notification Settings" showBackButton />
            <div className="flex-grow p-6 space-y-6">
                <div>
                    <h3 className="text-lg font-semibold mb-3 text-primary">General Notifications</h3>
                    <div className="space-y-4">
                        <ToggleSwitch
                            label="Booking Updates"
                            description="Confirmations and when your mechanic is en route."
                            enabled={settings.bookingUpdates}
                            onChange={(value) => handleSettingChange('bookingUpdates', value)}
                        />
                        <ToggleSwitch
                            label="Service Reminders"
                            description="Alerts for upcoming maintenance you've set."
                            enabled={settings.serviceReminders}
                            onChange={(value) => handleSettingChange('serviceReminders', value)}
                        />
                        <ToggleSwitch
                            label="Promotions & Offers"
                            description="Stay informed about our latest deals."
                            enabled={settings.promotions}
                            onChange={(value) => handleSettingChange('promotions', value)}
                        />
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-semibold mb-3 text-primary">Reminder Preferences</h3>
                    <div className="bg-dark-gray p-4 rounded-lg space-y-4">
                        <div>
                            <label htmlFor="reminder-time" className="block text-sm font-medium text-light-gray mb-1">Remind Me Before</label>
                            <select
                                id="reminder-time"
                                value={settings.reminderLeadTime}
                                onChange={(e) => handleSettingChange('reminderLeadTime', e.target.value as NotificationSettings['reminderLeadTime'])}
                                className="w-full px-4 py-2 bg-field border border-dark-gray rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                                <option value="1-hour">1 Hour Before</option>
                                <option value="1-day">1 Day Before</option>
                                <option value="2-days">2 Days Before</option>
                            </select>
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-light-gray mb-2">Notification Channels</label>
                             <div className="space-y-2">
                                <label className="flex items-center gap-3"><input type="checkbox" checked={settings.notificationChannels.inApp} onChange={e => handleChannelChange('inApp', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" /> In-App Notification</label>
                                <label className="flex items-center gap-3"><input type="checkbox" checked={settings.notificationChannels.email} onChange={e => handleChannelChange('email', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" /> Email</label>
                                <label className="flex items-center gap-3"><input type="checkbox" checked={settings.notificationChannels.sms} onChange={e => handleChannelChange('sms', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" /> SMS</label>
                             </div>
                        </div>
                    </div>
                </div>

                <div className="bg-dark-gray p-4 rounded-lg">
                    <h4 className="font-semibold text-white mb-2">Browser Permissions</h4>
                    {permissionStatus === 'granted' && (
                        <p className="text-sm text-green-400">✓ Notifications are enabled for this site.</p>
                    )}
                    {permissionStatus === 'denied' && (
                        <p className="text-sm text-red-400">Notifications are blocked. You must enable them in your browser settings to receive alerts.</p>
                    )}
                    {permissionStatus === 'default' && (
                        <div>
                            <p className="text-sm text-light-gray mb-3">To receive notifications, you need to grant permission.</p>
                            <button onClick={handleRequestPermission} className="w-full bg-primary text-white font-bold py-2 rounded-lg hover:bg-orange-600 transition">
                                Request Notification Permission
                            </button>
                        </div>
                    )}
                </div>
            </div>
             <div className="p-4 bg-[#1D1D1D] border-t border-dark-gray">
                <p className="text-xs text-light-gray text-center">
                    Note: You may need to grant notification permissions in your browser or device settings for these preferences to take effect.
                </p>
            </div>
        </div>
    );
};

export default NotificationSettingsScreen;