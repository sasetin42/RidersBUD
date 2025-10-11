import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { getNotificationSettings, saveNotificationSettings, NotificationSettings } from '../utils/notificationManager';

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

    useEffect(() => {
        saveNotificationSettings(settings);
    }, [settings]);

    const handleSettingChange = (key: keyof NotificationSettings, value: boolean) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    return (
        <div className="flex flex-col h-full bg-secondary">
            <Header title="Notification Settings" showBackButton />
            <div className="flex-grow p-6 space-y-4">
                <ToggleSwitch
                    label="Booking Updates"
                    description="Get notified about confirmations and when your mechanic is en route."
                    enabled={settings.bookingUpdates}
                    onChange={(value) => handleSettingChange('bookingUpdates', value)}
                />
                <ToggleSwitch
                    label="Service Reminders"
                    description="Receive alerts for upcoming maintenance due dates you've set."
                    enabled={settings.serviceReminders}
                    onChange={(value) => handleSettingChange('serviceReminders', value)}
                />
                <ToggleSwitch
                    label="Promotions & Offers"
                    description="Stay informed about our latest deals and special offers."
                    enabled={settings.promotions}
                    onChange={(value) => handleSettingChange('promotions', value)}
                />
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
