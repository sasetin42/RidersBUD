import React from 'react';
import { Bell, Mail, MessageSquare, Smartphone, CheckCircle2, Sliders, Shield } from 'lucide-react';
import { Settings } from '../../../../types';

interface NotificationsSettingsTabProps {
    settings: Settings;
    onChange: (field: keyof Settings, value: any) => void;
}

export const NotificationsSettingsTab: React.FC<NotificationsSettingsTabProps> = ({
    settings,
    onChange
}) => {
    const channels = [
        {
            id: 'email',
            label: 'Email Notifications (Outbound SMTP)',
            desc: 'Formal invoice delivery, registration receipts, and dispatch itineraries.',
            enabled: true,
            icon: <Mail size={18} className="text-primary" />
        },
        {
            id: 'sms',
            label: 'SMS Text Messaging Gateway',
            desc: 'Real-time SMS booking confirmation and OTP access codes.',
            enabled: settings.smsNotificationsEnabled ?? false,
            field: 'smsNotificationsEnabled' as keyof Settings,
            icon: <Smartphone size={18} className="text-emerald-400" />
        },
        {
            id: 'push',
            label: 'Mobile Push Notifications (FCM / APNs)',
            desc: 'Live vehicle arrival alerts, chat pings, and mechanic proximity triggers.',
            enabled: settings.pushNotificationsEnabled ?? true,
            field: 'pushNotificationsEnabled' as keyof Settings,
            icon: <Bell size={18} className="text-blue-400" />
        },
        {
            id: 'inApp',
            label: 'In-App Real-Time Audio / Banner Alerts',
            desc: 'Interactive audio chimes and top notification center drawers.',
            enabled: settings.inAppNotificationsEnabled ?? true,
            field: 'inAppNotificationsEnabled' as keyof Settings,
            icon: <MessageSquare size={18} className="text-purple-400" />
        }
    ];

    const triggers = [
        {
            title: 'New Customer Booking Created',
            desc: 'Alert admin dispatchers and send instant acknowledgment to customer.',
            field: 'emailOnNewBooking' as keyof Settings
        },
        {
            title: 'Booking Cancellation or Refund Requested',
            desc: 'Immediate notification to mechanic to abort route and admin for review.',
            field: 'emailOnCancellation' as keyof Settings
        }
    ];

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Primary Delivery Channels Matrix */}
            <div className="space-y-5 bg-[#121212]/70 border border-white/5 p-6 rounded-3xl">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                        <Sliders size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-white tracking-tight">Notification Channels</h3>
                        <p className="text-xs text-gray-500">Enable or disable delivery pipelines at the global platform level.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {channels.map((ch) => (
                        <div
                            key={ch.id}
                            className="p-5 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-between gap-4"
                        >
                            <div className="flex items-start gap-3.5">
                                <div className="p-2.5 rounded-xl bg-white/5 mt-0.5">
                                    {ch.icon}
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-white">{ch.label}</h4>
                                    <p className="text-[10px] text-gray-500 mt-1 max-w-xs">{ch.desc}</p>
                                </div>
                            </div>

                            {ch.field && (
                                <button
                                    type="button"
                                    onClick={() => onChange(ch.field!, !ch.enabled)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                        ch.enabled ? 'bg-primary' : 'bg-gray-700'
                                    }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                            ch.enabled ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                    />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Lifecycle Event Triggers */}
            <div className="space-y-5 bg-[#121212]/70 border border-white/5 p-6 rounded-3xl">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                        <Bell size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-white tracking-tight">Operational Event Triggers</h3>
                        <p className="text-xs text-gray-500">Configure automated dispatch criteria for critical customer and mechanic interactions.</p>
                    </div>
                </div>

                <div className="space-y-3">
                    {triggers.map((tr) => (
                        <div
                            key={tr.title}
                            className="p-4 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-between gap-4"
                        >
                            <div>
                                <h4 className="text-xs font-bold text-white">{tr.title}</h4>
                                <p className="text-[10px] text-gray-400 mt-0.5">{tr.desc}</p>
                            </div>

                            <button
                                type="button"
                                onClick={() => onChange(tr.field, !settings[tr.field])}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                    settings[tr.field] ? 'bg-primary' : 'bg-gray-700'
                                }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                        settings[tr.field] ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                                />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
