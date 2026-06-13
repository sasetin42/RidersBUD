import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDatabase } from '../context/DatabaseContext';
import Header from '../components/Header';
import NotificationBell from '../components/NotificationBell';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/admin/Modal';
import { storageService } from '../services/StorageService';
import { uploadImageToStorage } from '../utils/storageUtils';
import { User, Phone, Mail, MapPin, Edit3, MessageCircle, CheckCircle, Smartphone, Volume2, VolumeX, Clock, Sparkles, Bell } from 'lucide-react';
import { getProfileImage, STORAGE_PATHS } from '../utils/imageConstants';
import Tooltip from '../components/ui/Tooltip';
import {
    getNotificationSettings,
    saveNotificationSettings,
    NotificationSettings,
    requestNotificationPermission,
    hasNotificationAPI,
    getNotificationPermission,
    showNotification,
} from '../utils/notificationManager';
import { Customer } from '../types';


// --- Local Components (copied for consistency) ---
const MenuItem = ({ label, subtitle, badge, icon, onClick, variant = "default" }: { label: string, subtitle?: string, badge?: React.ReactNode, icon: React.ReactNode, onClick: () => void, variant?: "default" | "danger" }) => (
    <button
        onClick={onClick}
        type="button"
        className={`w-full text-left p-4 sm:p-5 flex justify-between items-center border-b border-white/5 transition-all last:border-b-0 group ${variant === 'danger' ? 'hover:bg-red-500/10' : 'hover:bg-white/5'}`}
    >
        <div className="flex items-center text-left">
            <span className={`mr-4 w-11 h-11 rounded-2xl bg-white/5 flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0 ${variant === 'danger' ? 'text-red-500 bg-red-500/5' : 'text-primary bg-primary/5'}`}>
                {icon}
            </span>
            <div className="flex flex-col text-left">
                <span className={`text-sm font-black tracking-tight ${variant === 'danger' ? 'text-red-400' : 'text-white'}`}>
                    {label}
                </span>
                {subtitle && (
                    <span className="text-[10px] text-gray-500 font-bold tracking-wide mt-0.5 group-hover:text-gray-400 transition-colors">
                        {subtitle}
                    </span>
                )}
            </div>
        </div>
        <div className="flex items-center gap-3">
            {badge && <div className="flex-shrink-0">{badge}</div>}
            <div className={`p-2 rounded-xl bg-white/5 transition-all group-hover:translate-x-1 ${variant === 'danger' ? 'group-hover:bg-red-500/20 group-hover:text-red-500' : 'group-hover:bg-primary/20 group-hover:text-primary'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </div>
        </div>
    </button>
);

const HelpSupportModal: React.FC<{
    contactEmail: string;
    contactPhone: string;
    onClose: () => void;
}> = ({ contactEmail, contactPhone, onClose }) => {
    const navigate = useNavigate();
    
    // Fallback to explicitly requested email and phone number if the database values are empty
    const email = contactEmail || 'support@ridersbud.com';
    const phone = contactPhone || '+63 947 9975 969';

    return (
        <Modal title="Help & Support" isOpen={true} onClose={onClose}>
            <div className="space-y-6">
                <div className="text-center">
                    <h3 className="text-lg font-black text-white mb-1">Still need help?</h3>
                    <p className="text-xs text-gray-500">Our support team is available 24/7</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <a
                        href={`mailto:${email}`}
                        className="flex flex-col items-center justify-center gap-2 p-4 bg-[#121212] rounded-xl hover:bg-primary/10 hover:border-primary/30 border border-white/5 transition-all group"
                    >
                        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                            <Mail size={20} />
                        </div>
                        <span className="text-xs font-bold text-white">Email Us</span>
                    </a>
                    <a
                        href={`tel:${phone.replace(/\s+/g, '')}`}
                        className="flex flex-col items-center justify-center gap-2 p-4 bg-[#121212] rounded-xl hover:bg-primary/10 hover:border-primary/30 border border-white/5 transition-all group"
                    >
                        <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-400 group-hover:scale-110 transition-transform">
                            <Phone size={20} />
                        </div>
                        <span className="text-xs font-bold text-white">Call Us</span>
                    </a>
                </div>

                <button 
                    onClick={() => { navigate('/customer-portal/support-chat'); onClose(); }}
                    className="w-full flex items-center justify-center gap-2 p-4 bg-primary rounded-xl hover:bg-orange-600 transition-colors shadow-lg shadow-primary/20 group"
                >
                    <MessageCircle size={18} className="text-white" />
                    <span className="text-sm font-bold text-white">Start Live Chat</span>
                </button>

                <div className="bg-[#1A1A1A] p-4 rounded-xl border border-white/5 flex items-center gap-3 text-xs leading-relaxed text-gray-400">
                    <MapPin size={16} className="text-orange-500 shrink-0" />
                    <a href="https://maps.app.goo.gl/SiwnU4GKyUCM4ThQ7" target="_blank" rel="noopener noreferrer" className="hover:text-white hover:underline transition-colors">
                        Unit 3201-C Tektite East Tower, Ortigas Center, Pasig City, Philippines 1605
                    </a>
                </div>

                <button onClick={() => { navigate('/customer-portal/faq'); onClose(); }} className="w-full bg-[#1A1A1A] border border-white/10 text-white font-bold py-3 rounded-xl hover:bg-white/5 transition-colors text-sm tracking-wide">
                    View FAQ
                </button>
            </div>
        </Modal>
    );
};

const EditProfileModal: React.FC<{
    user: any;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
}> = ({ user, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        address: user?.address || '',
        picture: user?.picture || ''
    });
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const path = STORAGE_PATHS.AVATARS(user?.id || 'anonymous');
                const url = await storageService.uploadFile(path, file);
                setFormData({ ...formData, picture: url });
            } catch (error) {
                console.error("Image processing error:", error);
                alert("Failed to process image.");
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await onSave(formData);
            onClose();
        } catch (error) {
            console.error("Failed to update profile", error);
            alert("Failed to update profile");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal title="Edit Profile" isOpen={true} onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Image Upload in Modal */}
                <div className="flex justify-center mb-6">
                    <div className="relative group">
                        <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-br from-white/10 to-transparent border border-white/10 overflow-hidden">
                            <img
                                src={getProfileImage(formData.picture, formData.name)}
                                alt={formData.name}
                                className="w-full h-full rounded-full object-cover"
                            />
                        </div>

                        <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleImageChange}
                                disabled={isLoading}
                            />
                            <Edit3 className="text-white w-6 h-6" />
                        </label>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2">Full Name</label>
                    <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            className="w-full bg-[#121212] border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white outline-none transition-all focus:border-white/20"
                            required
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2">Email</label>
                    <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full bg-[#121212] border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white outline-none transition-all focus:border-white/20"
                            required
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2">Phone</label>
                    <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                        <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            className="w-full bg-[#121212] border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white outline-none transition-all focus:border-white/20"
                            required
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2">Address</label>
                    <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                        <input
                            type="text"
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            placeholder="Optional"
                            className="w-full bg-[#121212] border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white outline-none transition-all focus:border-white/20"
                        />
                    </div>
                </div>

                <div className="pt-4 flex gap-3">
                    <button type="button" onClick={onClose} className="flex-1 py-3 btn-cancel text-xs font-black uppercase tracking-wider rounded-xl shadow-md">Cancel</button>
                    <button type="submit" disabled={isLoading} className="flex-1 py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/25 hover:bg-orange-600 transition-colors disabled:opacity-50">
                        {isLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

const ToggleSwitch: React.FC<{
    label: string;
    description: string;
    enabled: boolean;
    onChange: (enabled: boolean) => void;
    id: string;
}> = ({ label, description, enabled, onChange, id }) => (
    <div className="flex items-center justify-between bg-[#1A1A1A] border border-white/5 p-4 rounded-xl transition-colors hover:border-white/10">
        <div className="pr-4 flex-1 min-w-0">
            <h4 className="font-bold text-white text-xs mb-0.5">{label}</h4>
            <p className="text-[10px] text-gray-500 leading-snug">{description}</p>
        </div>
        <button
            id={id}
            type="button"
            role="switch"
            aria-checked={enabled}
            className={`${enabled ? 'bg-primary' : 'bg-[#333]'} relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none`}
            onClick={() => onChange(!enabled)}
        >
            <span
                className={`${enabled ? 'translate-x-5' : 'translate-x-1'} inline-block h-3 w-3 transform rounded-full bg-white transition-transform shadow-sm`}
            />
        </button>
    </div>
);

interface ExtendedCustomer extends Customer {
    notificationSettings?: NotificationSettings;
}

const NotificationSettingsModal: React.FC<{
    user: any;
    onClose: () => void;
    onSave: (settings: NotificationSettings) => Promise<void>;
}> = ({ user, onClose, onSave }) => {
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
    const [activeTab, setActiveTab] = useState<'general' | 'dnd' | 'system'>('general');
    const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    // Auto-save with debounce
    useEffect(() => {
        const saveToFirestore = async () => {
            setIsSaving(true);
            try {
                saveNotificationSettings(settings);
                await onSave(settings);
                setSavedFlash(true);
                setTimeout(() => setSavedFlash(false), 2000);
            } catch (error) {
                console.error('Failed to save settings:', error);
            } finally {
                setIsSaving(false);
            }
        };

        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(saveToFirestore, 1000);
        return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
    }, [settings]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleSettingChange = (key: keyof NotificationSettings, value: any) => {
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

    const playSynthSound = (theme: 'hud' | 'chime' | 'beep') => {
        try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            if (theme === 'chime' || theme === 'hud') {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(theme === 'chime' ? 880 : 587.33, audioCtx.currentTime); // D5 or A5
                osc.frequency.exponentialRampToValueAtTime(theme === 'chime' ? 1320 : 880, audioCtx.currentTime + 0.15); // E6 or A5
                gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
                osc.start(audioCtx.currentTime);
                osc.stop(audioCtx.currentTime + 0.35);
            } else if (theme === 'beep') {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.type = 'square';
                osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
                gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
                osc.start(audioCtx.currentTime);
                osc.stop(audioCtx.currentTime + 0.12);
            }
        } catch (e) {
            console.error('Synth sound failure', e);
        }
    };

    const handleTestNotification = () => {
        if (settings.soundEnabled) {
            playSynthSound(settings.soundTheme);
        }
        if (webNotifSupported && permissionStatus === 'granted') {
            showNotification('RidersBUD Test Alert', {
                body: 'This is a test notification to verify your account connection is fully active.',
                tag: 'ridersbud-test',
            });
        } else {
            alert('Test Notification Triggered!\n(In-app HUD chime simulated successfully)');
        }
    };

    return (
        <Modal title="Notification Preferences" isOpen={true} onClose={onClose}>
            {/* Tab navigation */}
            <div className="flex border-b border-white/5 mb-6">
                {(['general', 'dnd', 'system'] as const).map(tab => (
                    <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 pb-3 text-xs font-black uppercase tracking-wider transition-colors border-b-2 text-center ${activeTab === tab ? 'text-primary border-primary' : 'text-gray-500 border-transparent hover:text-white'}`}
                    >
                        {tab === 'general' ? 'General Settings' : tab === 'dnd' ? 'Quiet Hours' : 'System Alerts'}
                    </button>
                ))}
            </div>

            <div className="space-y-6">
                {activeTab === 'general' && (
                    <div className="space-y-4">
                        <ToggleSwitch
                            id="modal-toggle-booking-updates"
                            label="Booking Updates"
                            description="Get notified when your mechanic is assigned, en route, or completes the job."
                            enabled={settings.bookingUpdates}
                            onChange={(v) => handleSettingChange('bookingUpdates', v)}
                        />
                        <ToggleSwitch
                            id="modal-toggle-service-reminders"
                            label="Service Reminders"
                            description="Receive alerts for upcoming maintenance due dates."
                            enabled={settings.serviceReminders}
                            onChange={(v) => handleSettingChange('serviceReminders', v)}
                        />
                        <ToggleSwitch
                            id="modal-toggle-promotions"
                            label="Promotions & Offers"
                            description="Stay informed about our latest exclusive deals."
                            enabled={settings.promotions}
                            onChange={(v) => handleSettingChange('promotions', v)}
                        />

                        {/* Reminder Lead Time dropdown */}
                        <div className="bg-[#1A1A1A] p-4 rounded-xl border border-white/5">
                            <label htmlFor="modal-reminder-lead-time" className="block text-xs font-bold text-gray-400 mb-2">
                                Service Reminder Timing
                            </label>
                            <div className="relative">
                                <select
                                    id="modal-reminder-lead-time"
                                    value={settings.reminderLeadTime}
                                    onChange={(e) => handleSettingChange('reminderLeadTime', e.target.value)}
                                    className="w-full px-4 py-3 bg-[#121212] border border-white/10 rounded-xl text-white appearance-none focus:outline-none focus:border-primary/50 transition-all text-xs"
                                >
                                    <option value="1-hour">1 Hour Before</option>
                                    <option value="1-day">1 Day Before</option>
                                    <option value="2-days">2 Days Before</option>
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'dnd' && (
                    <div className="space-y-4">
                        <ToggleSwitch
                            id="modal-toggle-quiet-hours"
                            label="Enable Quiet Hours"
                            description="Suppress push notifications and text alerts during designated hours."
                            enabled={settings.quietHoursEnabled || false}
                            onChange={(v) => handleSettingChange('quietHoursEnabled', v)}
                        />

                        {settings.quietHoursEnabled && (
                            <div className="grid grid-cols-2 gap-3 p-4 bg-[#1A1A1A] rounded-xl border border-white/5 animate-fadeIn">
                                <div>
                                    <label htmlFor="quiet-hours-start" className="block text-[10px] font-bold text-gray-500 uppercase mb-2">Start Time</label>
                                    <input
                                        id="quiet-hours-start"
                                        type="time"
                                        value={settings.quietHoursStart || '22:00'}
                                        onChange={(e) => handleSettingChange('quietHoursStart', e.target.value)}
                                        className="w-full bg-[#121212] border border-white/10 rounded-xl py-2 px-3 text-white text-xs outline-none focus:border-primary"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="quiet-hours-end" className="block text-[10px] font-bold text-gray-500 uppercase mb-2">End Time</label>
                                    <input
                                        id="quiet-hours-end"
                                        type="time"
                                        value={settings.quietHoursEnd || '07:00'}
                                        onChange={(e) => handleSettingChange('quietHoursEnd', e.target.value)}
                                        className="w-full bg-[#121212] border border-white/10 rounded-xl py-2 px-3 text-white text-xs outline-none focus:border-primary"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="bg-[#1A1A1A] p-4 rounded-xl border border-white/5 space-y-4">
                            <label className="block text-xs font-bold text-gray-400">Communication Channels</label>
                            <div className="space-y-2.5">
                                {[
                                    { key: 'inApp' as const, label: 'In-App Alerts' },
                                    { key: 'email' as const, label: 'Email Notifications' },
                                    { key: 'sms' as const, label: 'SMS Messages' },
                                ].map(({ key, label }) => (
                                    <label
                                        key={key}
                                        htmlFor={`modal-channel-${key}`}
                                        className="flex items-center gap-3 p-3 bg-[#121212] rounded-xl border border-white/5 hover:border-white/10 transition-colors cursor-pointer"
                                    >
                                        <input
                                            id={`modal-channel-${key}`}
                                            type="checkbox"
                                            checked={settings.notificationChannels?.[key]}
                                            onChange={e => handleChannelChange(key, e.target.checked)}
                                            className="h-4 w-4 rounded border-gray-600 text-primary focus:ring-primary bg-[#1E1E1E] accent-primary"
                                        />
                                        <span className="text-xs text-gray-200 font-bold">{label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'system' && (
                    <div className="space-y-4">
                        <div className="bg-[#1A1A1A] p-4 rounded-xl border border-white/5 space-y-4">
                            <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                                <Volume2 size={16} className="text-primary" /> Audio Warnings
                            </h4>
                            <ToggleSwitch
                                id="modal-toggle-sounds"
                                label="Alert Sounds"
                                description="Play HUD chime notification sound effects."
                                enabled={settings.soundEnabled ?? true}
                                onChange={(v) => handleSettingChange('soundEnabled', v)}
                            />

                            {settings.soundEnabled && (
                                <div className="flex gap-2 items-end animate-fadeIn">
                                    <div className="flex-1">
                                        <label htmlFor="sound-theme" className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Sound Theme</label>
                                        <select
                                            id="sound-theme"
                                            value={settings.soundTheme ?? 'hud'}
                                            onChange={(e) => {
                                                const newTheme = e.target.value as 'hud' | 'chime' | 'beep';
                                                handleSettingChange('soundTheme', newTheme);
                                                playSynthSound(newTheme);
                                            }}
                                            className="w-full px-3 py-2 bg-[#121212] border border-white/10 rounded-xl text-white appearance-none focus:outline-none focus:border-primary/50 text-xs"
                                        >
                                            <option value="hud">Cyber HUD Chime</option>
                                            <option value="chime">Gentle Bells</option>
                                            <option value="beep">Tactical Double Beep</option>
                                        </select>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => playSynthSound(settings.soundTheme ?? 'hud')}
                                        className="py-2.5 px-4 bg-[#252525] hover:bg-white/10 text-white rounded-xl font-bold text-xs border border-white/5 transition-all"
                                    >
                                        Test
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Push Notification Panel */}
                        <div className="bg-[#1A1A1A] p-4 rounded-xl border border-white/5">
                            <h4 className="text-xs font-black text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                                <Smartphone size={16} className="text-primary" /> Push Notifications
                            </h4>
                            {webNotifSupported ? (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between bg-[#121212] p-3 rounded-xl border border-white/5">
                                        <div className="flex items-center gap-2.5">
                                            <div className={`w-3.5 h-3.5 rounded-full ${permissionStatus === 'granted' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                                            <div>
                                                <p className="text-xs font-bold text-white">
                                                    {permissionStatus === 'granted' ? 'Enabled' : 'Blocked / Required'}
                                                </p>
                                                <p className="text-[10px] text-gray-500 mt-0.5">
                                                    {permissionStatus === 'granted' ? 'System alert channel is fully online' : 'Tap to unlock browser push settings'}
                                                </p>
                                            </div>
                                        </div>
                                        {permissionStatus === 'default' && (
                                            <button
                                                type="button"
                                                onClick={handleRequestPermission}
                                                className="px-3 py-1.5 bg-primary text-white text-[10px] font-black uppercase tracking-wider rounded-lg hover:bg-orange-600 transition-colors"
                                            >
                                                Grant
                                            </button>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleTestNotification}
                                        className="w-full flex items-center justify-center gap-2 py-3 bg-[#1E1E1E] hover:bg-white/5 text-white font-bold text-xs rounded-xl border border-white/5 transition-colors"
                                    >
                                        <Sparkles size={14} className="text-primary" /> Send Test Notification
                                    </button>
                                </div>
                            ) : (
                                <p className="text-[11px] leading-relaxed text-gray-500">
                                    Device system notifications are managed externally. RidersBUD in-app banner alerts are always active.
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                    {isSaving ? (
                        <span className="text-primary animate-pulse font-bold">Saving settings...</span>
                    ) : savedFlash ? (
                        <span className="text-green-400 font-bold flex items-center gap-1"><CheckCircle size={11} /> Saved successfully</span>
                    ) : (
                        <span>Auto-saves changes automatically</span>
                    )}
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="py-2.5 px-6 bg-primary text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-primary/25 hover:bg-orange-600 transition-colors"
                >
                    Done
                </button>
            </div>
        </Modal>
    );
};

const ProfileScreen: React.FC = () => {
    const { user, logout, updateUserProfile } = useAuth();
    const { db, updateCustomer, updateUserNotificationSettings } = useDatabase(); 
    const navigate = useNavigate();
    const customer = db?.customers?.find(c => c.id === user.id);
    const [activeModal, setActiveModal] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);


    if (!user) return null;

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIsUploading(true);
            try {
                const path = STORAGE_PATHS.AVATARS(user.id);
                const url = await storageService.uploadFile(path, file);
                await updateUserProfile(user.name, url);
            } catch (error) {

                console.error("Image upload failed:", error);
                alert("Failed to upload image. Please try again.");
            } finally {
                setIsUploading(false);
            }
        }
    };

    const handleSaveProfile = async (data: any) => {
        // We use updateCustomer to ensure we capture all fields including potentially new ones like 'address'
        // that might not be strictly typed in AuthContext's simplified updateProfile
        if (user) {
            await updateCustomer({ ...user, ...data });
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-secondary pb-24 font-sans">
            <Header title="My Profile" icon={<User size={22} />} />

            <div className="flex-grow p-6 space-y-6">
                {/* Profile Card */}
                <div className="bg-gradient-to-br from-[#1A1A1A] to-[#121212] rounded-[2.5rem] p-6 border border-white/5 shadow-2xl relative overflow-hidden group animate-fadeIn">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[50px] rounded-full translate-x-10 -translate-y-10 group-hover:bg-primary/20 transition-all duration-700"></div>

                    <div className="relative z-10 flex flex-col items-center text-center">
                        <div className="relative group/img mb-4">
                            <div className="w-24 h-24 rounded-3xl p-1 bg-gradient-to-br from-white/10 to-transparent overflow-hidden">
                                <img src={getProfileImage(user.picture, user.name)} alt={user.name} className="w-full h-full rounded-[1.25rem] object-cover shadow-2xl" />
                            </div>

                            <label className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity cursor-pointer rounded-3xl bg-black/50 backdrop-blur-sm">
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploading} />
                                <Edit3 className="text-white w-6 h-6" />
                            </label>
                            {isUploading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-3xl z-20">
                                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            )}
                        </div>

                        <h2 className="text-2xl font-bold text-white tracking-tight mb-1">{user.name}</h2>
                        <p className="text-xs text-gray-500 font-medium opacity-70 mb-4">{user.email}</p>

                        <Tooltip content="Edit profile">
                            <button
                                onClick={() => setActiveModal('edit')}
                                className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-full text-xs font-bold text-white transition-all flex items-center gap-2"
                            >
                                <Edit3 size={12} />
                                Edit Profile
                            </button>
                        </Tooltip>
                    </div>
                </div>

                {/* Menu */}
                <div className="bg-[#1A1A1A] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl animate-slideUp">
                    <Tooltip content="Manage your vehicles" className="w-full">
                        <MenuItem 
                            label="My Garage" 
                            subtitle="Manage registered vehicles and records"
                            badge={
                                <span className="text-[10px] bg-primary/10 text-primary font-black border border-primary/20 px-2 py-0.5 rounded-full">
                                    {customer?.vehicles?.length || 0} Cars
                                </span>
                            }
                            onClick={() => navigate('/customer-portal/my-garage')} 
                            icon={
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                                    <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1V8a1 1 0 00-1-1h-2z" />
                                </svg>
                            } 
                        />
                    </Tooltip>
                    <Tooltip content="View wishlist" className="w-full">
                        <MenuItem 
                            label="Wishlist" 
                            subtitle="Saved items and bookmarked parts"
                            onClick={() => navigate('/customer-portal/wishlist')} 
                            icon={
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                                </svg>
                            } 
                        />
                    </Tooltip>
                    <Tooltip content="View order history" className="w-full">
                        <MenuItem 
                            label="Order History" 
                            subtitle="Track and view parts store transactions"
                            onClick={() => navigate('/customer-portal/order-history')} 
                            icon={
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                                    <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                                </svg>
                            } 
                        />
                    </Tooltip>
                    <Tooltip content="View booking history" className="w-full">
                        <MenuItem 
                            label="Booking History" 
                            subtitle="Manage active or past service appointments"
                            badge={
                                <span className="text-[10px] bg-green-500/10 text-green-400 font-extrabold border border-green-500/20 px-2.5 py-0.5 rounded-full">
                                    {db?.bookings?.filter(b => b.customerId === user.id).length || 0} Bookings
                                </span>
                            }
                            onClick={() => navigate('/customer-portal/booking-history')} 
                            icon={
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                </svg>
                            } 
                        />
                    </Tooltip>
                    <Tooltip content="Notification settings" className="w-full">
                        <MenuItem 
                            label="Notification Settings" 
                            subtitle="Configure account updates and system alerts"
                            onClick={() => setActiveModal('notifications')} 
                            icon={
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                                </svg>
                            } 
                        />
                    </Tooltip>
                    <Tooltip content="Start live chat" className="w-full">
                        <MenuItem 
                            label="Start Live Chat" 
                            subtitle="Connect instantly with helpdesk support agents"
                            onClick={() => navigate('/customer-portal/support-chat')} 
                            icon={
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                                </svg>
                            } 
                        />
                    </Tooltip>
                    <Tooltip content="View FAQ" className="w-full">
                        <MenuItem 
                            label="FAQ" 
                            subtitle="Find answers to common questions"
                            onClick={() => navigate('/customer-portal/faq')} 
                            icon={
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                            } 
                        />
                    </Tooltip>
                    <Tooltip content="Help and support" className="w-full">
                        <MenuItem 
                            label="Help & Support" 
                            subtitle="Access hotline contact details and help links"
                            onClick={() => setActiveModal('support')} 
                            icon={
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                                </svg>
                            } 
                        />
                    </Tooltip>
                    <Tooltip content="Log out" className="w-full">
                        <MenuItem 
                            label="Logout" 
                            subtitle="Sign out of your active customer session"
                            onClick={logout} 
                            variant="danger" 
                            icon={
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                            } 
                        />
                    </Tooltip>
                </div>
            </div>

            {activeModal === 'support' && db && <HelpSupportModal contactEmail={db.settings.contactEmail} contactPhone={db.settings.contactPhone} onClose={() => setActiveModal(null)} />}
            {activeModal === 'edit' && user && <EditProfileModal user={user} onClose={() => setActiveModal(null)} onSave={handleSaveProfile} />}
            {activeModal === 'notifications' && user && <NotificationSettingsModal user={user} onClose={() => setActiveModal(null)} onSave={(s) => updateUserNotificationSettings(user.id, s)} />}
        </div>
    );
};

export default ProfileScreen;
