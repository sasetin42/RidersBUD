
import React, { useState, useEffect } from 'react';
import Header from '../../components/Header';
import { getMechanicNotificationSettings, saveMechanicNotificationSettings, MechanicNotificationSettings, requestNotificationPermission } from '../../utils/notificationManager';

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

const MechanicNotificationSettingsScreen: React.FC = () => {
    const [settings, setSettings] = useState<MechanicNotificationSettings>(getMechanicNotificationSettings());
    const [permissionStatus, setPermissionStatus] = useState(Notification.permission);

    useEffect(() => {
        saveMechanicNotificationSettings(settings);
    }, [settings]);

    const handleSettingChange = (key: keyof MechanicNotificationSettings, value: boolean) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleRequestPermission = async () => {
        await requestNotificationPermission();
        setPermissionStatus(Notification.permission);
    };

    return (
        <div className="flex flex-col h-full bg-secondary">
            <Header title="Notification Settings" showBackButton />
            <div className="flex-grow p-6 space-y-4">
                <ToggleSwitch
                    label="New Job Alerts"
                    description="Get notified when a new, unassigned job is posted."
                    enabled={settings.newJobAlerts}
                    onChange={(value) => handleSettingChange('newJobAlerts', value)}
                />
                <ToggleSwitch
                    label="Job Status Changes"
                    description="Receive alerts when a customer cancels a job you've accepted."
                    enabled={settings.jobStatusChanges}
                    onChange={(value) => handleSettingChange('jobStatusChanges', value)}
                />
                <ToggleSwitch
                    label="Payment Confirmations"
                    description="Get notified when a payment for a completed job has been processed."
                    enabled={settings.paymentConfirmations}
                    onChange={(value) => handleSettingChange('paymentConfirmations', value)}
                />

                <div className="bg-dark-gray p-4 rounded-lg mt-6">
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
                                Enable Notifications
                            </button>
                        </div>
                    )}
                </div>
            </div>
             <div className="p-4 bg-[#1D1D1D] border-t border-dark-gray">
                <p className="text-xs text-light-gray text-center">
                    Note: These settings control what notifications are sent from our system. You may also need to manage permissions in your browser.
                </p>
            </div>
        </div>
    );
};

export default MechanicNotificationSettingsScreen;
