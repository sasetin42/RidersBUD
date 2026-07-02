
import React, { useState, useEffect, useRef } from 'react';
import Header from '../../components/Header';
import NotificationBell from '../../components/NotificationBell';
import { Bell, CheckCircle, Smartphone } from 'lucide-react';
import {
    getMechanicNotificationSettings,
    saveMechanicNotificationSettings,
    MechanicNotificationSettings,
    requestNotificationPermission,
    hasNotificationAPI,
    getNotificationPermission,
} from '../../utils/notificationManager';
import { useAuth } from '../../context/AuthContext';
import { useDatabase } from '../../context/DatabaseContext';
import { Mechanic } from '../../types';

interface ExtendedMechanic extends Mechanic {
    notificationSettings?: MechanicNotificationSettings;
}

const ToggleSwitch: React.FC<{
    id: string;
    label: string;
    description: string;
    enabled: boolean;
    onChange: (enabled: boolean) => void;
}> = ({ id, label, description, enabled, onChange }) => {
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

const MechanicNotificationSettingsScreen: React.FC = () => {
    const { user } = useAuth();
    const { updateMechanicNotificationSettings } = useDatabase();

    const [settings, setSettings] = useState<MechanicNotificationSettings>(() => {
        const mech = user as ExtendedMechanic;
        if (mech?.notificationSettings) {
            return { ...getMechanicNotificationSettings(), ...mech.notificationSettings };
        }
        return getMechanicNotificationSettings();
    });

    const webNotifSupported = hasNotificationAPI();
    // SAFE: uses getNotificationPermission() which guards against missing Notification API
    const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(getNotificationPermission);
    const [isSaving, setIsSaving] = useState(false);
    const [savedFlash, setSavedFlash] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Sync from user object when it loads from Firestore
    useEffect(() => {
        const mech = user as ExtendedMechanic;
        if (mech?.notificationSettings) {
            setSettings(prev => ({ ...prev, ...mech.notificationSettings }));
        }
    }, [user]);

    // Auto-save with debounce
    useEffect(() => {
        const save = async () => {
            setIsSaving(true);
            try {
                saveMechanicNotificationSettings(settings);
                if (user?.id) {
                    await updateMechanicNotificationSettings(user.id, settings);
                    setSavedFlash(true);
                    setTimeout(() => setSavedFlash(false), 2000);
                }
            } catch (error) {
                console.error('Failed to save mechanic notification settings:', error);
            } finally {
                setIsSaving(false);
            }
        };

        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(save, 1000);
        return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
    }, [settings]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleSettingChange = (key: keyof MechanicNotificationSettings, value: boolean) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleRequestPermission = async () => {
        const result = await requestNotificationPermission();
        setPermissionStatus(result);
    };

    return (
        <div className="flex flex-col h-full bg-[#121212] text-white font-sans">
            <Header title="Notification Settings" showBackButton rightAction={<NotificationBell />} icon={<Bell size={22} />} />

            <div className="flex-grow p-5 space-y-7 overflow-y-auto pb-8">

                {/* Alert Toggles */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-[11px] font-black text-gray-500 tracking-widest uppercase">Job Alerts</h3>
                        {isSaving && <span className="text-[10px] text-primary animate-pulse font-bold">Saving...</span>}
                    </div>
                    <div className="space-y-2.5">
                        <ToggleSwitch
                            id="toggle-new-job-alerts"
                            label="New Job Alerts"
                            description="Get notified when a new, unassigned job is posted near you."
                            enabled={settings.newJobAlerts}
                            onChange={(v) => handleSettingChange('newJobAlerts', v)}
                        />
                        <ToggleSwitch
                            id="toggle-job-status"
                            label="Job Status Changes"
                            description="Receive alerts when a customer cancels or modifies a job you've accepted."
                            enabled={settings.jobStatusChanges}
                            onChange={(v) => handleSettingChange('jobStatusChanges', v)}
                        />
                        <ToggleSwitch
                            id="toggle-payment-confirmations"
                            label="Payment Confirmations"
                            description="Get notified when a payment for a completed job has been processed."
                            enabled={settings.paymentConfirmations}
                            onChange={(v) => handleSettingChange('paymentConfirmations', v)}
                        />
                    </div>
                </div>

                {/* Push Notification Status */}
                <div>
                    <h3 className="text-[11px] font-black text-gray-500 tracking-widest uppercase mb-3">Push Notifications</h3>
                    {webNotifSupported ? (
                        // Web/Desktop: show real browser permission control
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
                                        <p className={`text-sm font-bold ${permissionStatus === 'granted' ? 'text-green-400' : permissionStatus === 'denied' ? 'text-red-400' : 'text-yellow-400'}`}>
                                            {permissionStatus === 'granted' ? 'Notifications Enabled' : permissionStatus === 'denied' ? 'Notifications Blocked' : 'Permission Required'}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {permissionStatus === 'granted'
                                                ? 'You will receive desktop alerts.'
                                                : permissionStatus === 'denied'
                                                    ? 'Enable in your browser settings.'
                                                    : 'Tap to grant notification access.'}
                                        </p>
                                    </div>
                                </div>
                                {permissionStatus === 'default' && (
                                    <button
                                        id="btn-enable-notif"
                                        onClick={handleRequestPermission}
                                        className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-orange-600 transition-colors"
                                    >
                                        Enable
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        // Mobile WebView: no Notification API — show informational card
                        <div className="bg-[#1A1A1A] p-4 rounded-2xl border border-white/5">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-primary/10 text-primary mt-0.5">
                                    <Smartphone size={18} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white">Mobile Push Notifications</p>
                                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                        In-app job alerts are always active. To manage push notifications, go to your device's <span className="text-white font-semibold">Settings → Apps → RidersBUD → Notifications</span>.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-[#121212] border-t border-white/5 flex items-center justify-center gap-2 h-14">
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

export default MechanicNotificationSettingsScreen;
