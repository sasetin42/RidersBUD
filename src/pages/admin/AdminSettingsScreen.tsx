import React, { useState, useEffect, useMemo } from 'react';
import { Settings, Role, AdminModule, PermissionLevel } from '../../types';
import { useDatabase } from '../../context/DatabaseContext';
import Spinner from '../../components/Spinner';
import { fileToBase64, compressAndEncodeImage } from '../../utils/fileUtils';
import Modal from '../../components/admin/Modal';
import {
    Settings as SettingsIcon,
    Calendar,
    Users,
    Bot,
    Image as ImageIcon,
    Map as MapIcon,
    Bell,
    Save,
    RotateCcw,
    Shield,
    Upload,
    Check
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*                                SUBCOMPONENTS                               */
/* -------------------------------------------------------------------------- */

const ToggleSwitch: React.FC<{ label: string; enabled: boolean; onChange: (enabled: boolean) => void; subLabel?: string }> = ({ label, enabled, onChange, subLabel }) => (
    <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
        <div>
            <span className="block font-bold text-sm text-white">{label}</span>
            {subLabel && <span className="text-xs text-gray-400 mt-0.5 block">{subLabel}</span>}
        </div>
        <button
            type="button"
            className={`${enabled ? 'bg-primary' : 'bg-gray-600'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-[#0a0a0a]`}
            onClick={() => onChange(!enabled)}
        >
            <span className={`${enabled ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
        </button>
    </div>
);

const SectionHeader: React.FC<{ title: string; description?: string }> = ({ title, description }) => (
    <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-1">{title}</h2>
        {description && <p className="text-sm text-gray-400">{description}</p>}
    </div>
);

/* -------------------------------------------------------------------------- */
/*                               MAIN COMPONENT                               */
/* -------------------------------------------------------------------------- */

const AdminSettingsScreen: React.FC = () => {
    const { db, updateSettings, loading } = useDatabase();

    // State
    const [settings, setSettings] = useState<Settings | null>(null);
    const [initialSettings, setInitialSettings] = useState<Settings | null>(null);
    const [activeTab, setActiveTab] = useState<'general' | 'booking' | 'ai' | 'branding' | 'map' | 'roles'>('general');
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');

    useEffect(() => {
        if (db?.settings) {
            // Ensure nested objects exist to prevent crashes and ensure proper editing
            // We use spread to ensure even if the parent object exists, missing keys are filled with defaults
            const safeSettings: Settings = {
                ...db.settings,
                // Enhanced General Information
                supportEmail: db.settings.supportEmail ?? 'support@ridersbud.com',
                businessHoursDisplay: db.settings.businessHoursDisplay ?? 'Mon-Fri: 8AM-6PM, Sat: 9AM-3PM',
                timezone: db.settings.timezone ?? 'Asia/Manila',
                currency: db.settings.currency ?? 'PHP',
                language: db.settings.language ?? 'en',
                // Social Links
                socialLinks: {
                    facebook: '',
                    twitter: '',
                    instagram: '',
                    website: '',
                    ...db.settings.socialLinks
                },
                // Branding Assets
                brandingAssets: {
                    splashLogoUrl: '',
                    customerAuthLogoUrl: '',
                    mechanicAuthLogoUrl: '',
                    ...db.settings.brandingAssets
                },
                // Booking Configuration
                bookingBufferTime: db.settings.bookingBufferTime ?? 15,
                maxAdvanceBookingDays: db.settings.maxAdvanceBookingDays ?? 30,
                cancellationPolicyWindow: db.settings.cancellationPolicyWindow ?? 24,
                autoAssignMechanic: db.settings.autoAssignMechanic ?? false,
                emergencyBookingEnabled: db.settings.emergencyBookingEnabled ?? true,
                weekendBookingEnabled: db.settings.weekendBookingEnabled ?? true,
                holidayDates: db.settings.holidayDates ?? [],
                minimumBookingNotice: db.settings.minimumBookingNotice ?? 2,
            };
            setSettings(safeSettings);
            setInitialSettings(safeSettings);
        }
    }, [db?.settings]);

    const isDirty = useMemo(() => JSON.stringify(settings) !== JSON.stringify(initialSettings), [settings, initialSettings]);

    const handleSave = async () => {
        if (!settings) return;
        setSaveStatus('saving');
        try {
            await updateSettings(settings);
            // Updating local state happens via the useEffect dependency on db.settings
            setSaveStatus('success');
            setTimeout(() => setSaveStatus('idle'), 3000);
        } catch (error) {
            console.error("Failed to save settings:", error);
            setSaveStatus('idle'); // Or error state
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: keyof Settings) => {
        if (e.target.files?.[0]) {
            // Updated to use compression to prevent large payload issues
            const base64 = await compressAndEncodeImage(e.target.files[0], 800, 0.8);
            setSettings(prev => prev ? ({ ...prev, [field]: base64 }) : null);
        }
    };

    if (loading || !settings) return <div className="flex items-center justify-center h-full"><Spinner size="lg" color="text-white" /></div>;

    const tabs = [
        { id: 'general', label: 'General', icon: SettingsIcon },
        { id: 'booking', label: 'Bookings', icon: Calendar },
        { id: 'ai', label: 'AI Assistant', icon: Bot },
        { id: 'branding', label: 'Branding', icon: ImageIcon },
        { id: 'map', label: 'Maps', icon: MapIcon },
    ];

    return (
        <div className="flex flex-col h-full overflow-hidden animate-slideInUp">
            {/* Header */}
            <div className="flex-shrink-0 flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-white">System Configuration</h1>
                <div className="flex items-center gap-3">
                    {saveStatus === 'success' && <span className="text-green-400 font-bold flex items-center gap-2 animate-fadeIn"><Check size={16} /> Saved</span>}

                    {isDirty && (
                        <button
                            onClick={() => setSettings(initialSettings)}
                            className="px-4 py-2 rounded-xl text-gray-400 hover:text-white font-bold transition-colors"
                        >
                            Discard
                        </button>
                    )}

                    <button
                        onClick={handleSave}
                        disabled={!isDirty || saveStatus === 'saving'}
                        className={`px-6 py-2 rounded-xl font-bold text-white shadow-lg transition-all flex items-center gap-2 ${!isDirty || saveStatus === 'saving'
                            ? 'bg-gray-700 opacity-50 cursor-not-allowed shadow-none'
                            : 'bg-primary hover:bg-orange-600 shadow-orange-500/20'
                            }`}
                    >
                        {saveStatus === 'saving' ? <Spinner size="sm" color="text-white" /> : <><Save size={18} /> Save Changes</>}
                    </button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row flex-1 overflow-hidden gap-6">
                {/* Sidebar Navigation */}
                <div className="w-full lg:w-64 flex-shrink-0 flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === tab.id
                                ? 'bg-white/10 text-white shadow-lg border border-white/5'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <tab.icon size={18} /> {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto pr-2">
                    <div className="max-w-4xl space-y-6 pb-10">
                        {/* GENERAL SETTINGS */}
                        {activeTab === 'general' && (
                            <div className="space-y-6">
                                <SectionHeader title="General Information" description="Basic details about your application and business." />
                                <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase">Application Name</label>
                                            <input type="text" value={settings.appName} onChange={e => setSettings({ ...settings!, appName: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-3 text-white focus:border-primary outline-none mt-1" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase">Contact Email</label>
                                            <input type="email" value={settings.contactEmail} onChange={e => setSettings({ ...settings!, contactEmail: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-3 text-white focus:border-primary outline-none mt-1" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase">Support Email</label>
                                            <input type="email" value={settings.supportEmail || ''} onChange={e => setSettings({ ...settings!, supportEmail: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-3 text-white focus:border-primary outline-none mt-1" placeholder="support@example.com" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase">Business Phone</label>
                                            <input type="tel" value={settings.contactPhone} onChange={e => setSettings({ ...settings!, contactPhone: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-3 text-white focus:border-primary outline-none mt-1" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase">Business Address</label>
                                            <input type="text" value={settings.address} onChange={e => setSettings({ ...settings!, address: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-3 text-white focus:border-primary outline-none mt-1" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase">Business Hours Display</label>
                                            <textarea value={settings.businessHoursDisplay || ''} onChange={e => setSettings({ ...settings!, businessHoursDisplay: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-3 text-white focus:border-primary outline-none mt-1 h-20 resize-none" placeholder="e.g., Mon-Fri: 8AM-6PM, Sat: 9AM-3PM" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase">Timezone</label>
                                            <select value={settings.timezone || 'Asia/Manila'} onChange={e => setSettings({ ...settings!, timezone: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-3 text-white focus:border-primary outline-none mt-1">
                                                <option value="Asia/Manila">Asia/Manila (GMT+8)</option>
                                                <option value="Asia/Singapore">Asia/Singapore (GMT+8)</option>
                                                <option value="Asia/Tokyo">Asia/Tokyo (GMT+9)</option>
                                                <option value="Asia/Hong_Kong">Asia/Hong Kong (GMT+8)</option>
                                                <option value="UTC">UTC (GMT+0)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase">Currency</label>
                                            <select value={settings.currency || 'PHP'} onChange={e => setSettings({ ...settings!, currency: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-3 text-white focus:border-primary outline-none mt-1">
                                                <option value="PHP">PHP - Philippine Peso</option>
                                                <option value="USD">USD - US Dollar</option>
                                                <option value="EUR">EUR - Euro</option>
                                                <option value="GBP">GBP - British Pound</option>
                                                <option value="JPY">JPY - Japanese Yen</option>
                                                <option value="SGD">SGD - Singapore Dollar</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase">Language</label>
                                            <select value={settings.language || 'en'} onChange={e => setSettings({ ...settings!, language: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-3 text-white focus:border-primary outline-none mt-1">
                                                <option value="en">English</option>
                                                <option value="fil">Filipino</option>
                                                <option value="es">Spanish</option>
                                                <option value="zh">Chinese</option>
                                                <option value="ja">Japanese</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="pt-4 mt-2 border-t border-white/5">
                                        <h3 className="text-sm font-bold text-white mb-4">Social Media Links</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 uppercase">Facebook</label>
                                                <input type="text" value={settings.socialLinks?.facebook || ''} onChange={e => setSettings({ ...settings!, socialLinks: { ...settings!.socialLinks, facebook: e.target.value } })} className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-3 text-white focus:border-primary outline-none mt-1" placeholder="https://facebook.com/..." />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 uppercase">Twitter / X</label>
                                                <input type="text" value={settings.socialLinks?.twitter || ''} onChange={e => setSettings({ ...settings!, socialLinks: { ...settings!.socialLinks, twitter: e.target.value } })} className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-3 text-white focus:border-primary outline-none mt-1" placeholder="https://x.com/..." />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 uppercase">Instagram</label>
                                                <input type="text" value={settings.socialLinks?.instagram || ''} onChange={e => setSettings({ ...settings!, socialLinks: { ...settings!.socialLinks, instagram: e.target.value } })} className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-3 text-white focus:border-primary outline-none mt-1" placeholder="https://instagram.com/..." />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 uppercase">Website</label>
                                                <input type="text" value={settings.socialLinks?.website || ''} onChange={e => setSettings({ ...settings!, socialLinks: { ...settings!.socialLinks, website: e.target.value } })} className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-3 text-white focus:border-primary outline-none mt-1" placeholder="https://yourwebsite.com" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-white/5">
                                        <ToggleSwitch label="Email Notifications" subLabel="Receive emails for critical system alerts" enabled={settings.emailOnCancellation} onChange={val => setSettings({ ...settings!, emailOnCancellation: val })} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* BOOKING SETTINGS */}
                        {activeTab === 'booking' && (
                            <div className="space-y-6">
                                <SectionHeader title="Booking Configuration" description="Manage slots, timings, and scheduling rules." />
                                <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase">Operating Hours (Start)</label>
                                            <input type="time" value={settings.bookingStartTime} onChange={e => setSettings({ ...settings!, bookingStartTime: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-3 text-white focus:border-primary outline-none mt-1" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase">Operating Hours (End)</label>
                                            <input type="time" value={settings.bookingEndTime} onChange={e => setSettings({ ...settings!, bookingEndTime: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-3 text-white focus:border-primary outline-none mt-1" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase">Slot Duration (Minutes)</label>
                                            <input type="number" value={settings.bookingSlotDuration} onChange={e => setSettings({ ...settings!, bookingSlotDuration: Number(e.target.value) })} className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-3 text-white focus:border-primary outline-none mt-1" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase">Max Concurrent Bookings</label>
                                            <input type="number" value={settings.maxBookingsPerSlot} onChange={e => setSettings({ ...settings!, maxBookingsPerSlot: Number(e.target.value) })} className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-3 text-white focus:border-primary outline-none mt-1" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase">Buffer Between Slots (Minutes)</label>
                                            <input type="number" value={settings.bookingBufferTime || 0} onChange={e => setSettings({ ...settings!, bookingBufferTime: Number(e.target.value) })} className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-3 text-white focus:border-primary outline-none mt-1" placeholder="e.g. 15" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase">Max Advance Booking (Days)</label>
                                            <input type="number" value={settings.maxAdvanceBookingDays || 30} onChange={e => setSettings({ ...settings!, maxAdvanceBookingDays: Number(e.target.value) })} className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-3 text-white focus:border-primary outline-none mt-1" placeholder="e.g. 30" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase">Cancellation Policy (Hours Before)</label>
                                            <input type="number" value={settings.cancellationPolicyWindow || 24} onChange={e => setSettings({ ...settings!, cancellationPolicyWindow: Number(e.target.value) })} className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-3 text-white focus:border-primary outline-none mt-1" placeholder="e.g. 24" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase">Minimum Booking Notice (Hours)</label>
                                            <input type="number" value={settings.minimumBookingNotice || 2} onChange={e => setSettings({ ...settings!, minimumBookingNotice: Number(e.target.value) })} className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-3 text-white focus:border-primary outline-none mt-1" placeholder="e.g. 2" />
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-white/5 space-y-4">
                                        <h3 className="text-sm font-bold text-white mb-4">Booking Options</h3>
                                        <ToggleSwitch label="Auto-Assign Mechanic" subLabel="Automatically assign available mechanics to new bookings" enabled={settings.autoAssignMechanic || false} onChange={val => setSettings({ ...settings!, autoAssignMechanic: val })} />
                                        <ToggleSwitch label="Emergency Bookings" subLabel="Allow customers to book emergency services" enabled={settings.emergencyBookingEnabled || false} onChange={val => setSettings({ ...settings!, emergencyBookingEnabled: val })} />
                                        <ToggleSwitch label="Weekend Bookings" subLabel="Accept bookings on weekends" enabled={settings.weekendBookingEnabled || false} onChange={val => setSettings({ ...settings!, weekendBookingEnabled: val })} />
                                    </div>

                                    <div className="pt-4 border-t border-white/5">
                                        <h3 className="text-sm font-bold text-white mb-4">Holiday Management</h3>
                                        <div className="space-y-4">
                                            <div className="flex gap-3">
                                                <input
                                                    type="date"
                                                    id="holiday-date-input"
                                                    className="flex-1 bg-[#0a0a0a] border border-white/10 rounded-lg p-3 text-white focus:border-primary outline-none"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const input = document.getElementById('holiday-date-input') as HTMLInputElement;
                                                        if (input?.value && !settings.holidayDates?.includes(input.value)) {
                                                            setSettings({
                                                                ...settings!,
                                                                holidayDates: [...(settings.holidayDates || []), input.value].sort()
                                                            });
                                                            input.value = '';
                                                        }
                                                    }}
                                                    className="px-6 py-3 bg-primary hover:bg-orange-600 text-white font-bold rounded-lg transition-colors"
                                                >
                                                    Add Holiday
                                                </button>
                                            </div>
                                            {settings.holidayDates && settings.holidayDates.length > 0 && (
                                                <div className="bg-white/5 rounded-xl p-4 space-y-2">
                                                    <p className="text-xs font-bold text-gray-400 uppercase mb-3">Scheduled Holidays</p>
                                                    {settings.holidayDates.map(date => (
                                                        <div key={date} className="flex items-center justify-between bg-[#0a0a0a] rounded-lg p-3 border border-white/10">
                                                            <span className="text-white font-medium">{new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => setSettings({
                                                                    ...settings!,
                                                                    holidayDates: settings.holidayDates?.filter(d => d !== date)
                                                                })}
                                                                className="text-red-400 hover:text-red-300 font-bold text-sm transition-colors"
                                                            >
                                                                Remove
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-white/5">
                                        <ToggleSwitch label="New Booking Alerts" subLabel="Send email when a new booking is created" enabled={settings.emailOnNewBooking} onChange={val => setSettings({ ...settings!, emailOnNewBooking: val })} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* AI ASSISTANT */}
                        {activeTab === 'ai' && (
                            <div className="space-y-6">
                                <SectionHeader title="Virtual Assistant" description="Configure the AI personality and knowledge base." />
                                <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-6">
                                    <div className="flex items-center gap-6">
                                        <div className="relative group w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                                            {settings.virtualMechanicImageUrl ? (
                                                <img src={settings.virtualMechanicImageUrl} className="w-full h-full object-cover" />
                                            ) : (
                                                <Bot size={32} className="text-gray-500" />
                                            )}
                                            <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity text-xs font-bold text-white">
                                                Change
                                                <input type="file" className="hidden" onChange={e => handleFileUpload(e, 'virtualMechanicImageUrl')} accept="image/*" />
                                            </label>
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-xs font-bold text-gray-500 uppercase">Assistant Name</label>
                                            <input type="text" value={settings.virtualMechanicName} onChange={e => setSettings({ ...settings!, virtualMechanicName: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-3 text-white focus:border-primary outline-none mt-1" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase">System Instructions</label>
                                        <textarea value={settings.virtualMechanicSystemInstruction} onChange={e => setSettings({ ...settings!, virtualMechanicSystemInstruction: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-3 text-white focus:border-primary outline-none mt-1 h-32 font-mono text-xs" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* BRANDING */}
                        {activeTab === 'branding' && (
                            <div className="space-y-6">
                                <SectionHeader title="Branding & Assets" description="Manage logos and visual identity." />
                                <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                        {/* Main App Logo */}
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">App Logo (General)</label>
                                            <div className="bg-[#0a0a0a] p-4 rounded-xl border border-white/10 flex items-center justify-between">
                                                <img src={settings.appLogoUrl} className="h-12 object-contain" alt="App Logo" />
                                                <label className="cursor-pointer bg-white/5 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-white/10 transition">
                                                    Upload
                                                    <input type="file" className="hidden" onChange={e => handleFileUpload(e, 'appLogoUrl')} accept="image/*" />
                                                </label>
                                            </div>
                                        </div>

                                        {/* Admin Sidebar Logo */}
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Sidebar Logo (Admin)</label>
                                            <div className="bg-[#0a0a0a] p-4 rounded-xl border border-white/10 flex items-center justify-between">
                                                <img src={settings.adminSidebarLogoUrl} className="h-12 object-contain" alt="Sidebar Logo" />
                                                <label className="cursor-pointer bg-white/5 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-white/10 transition">
                                                    Upload
                                                    <input type="file" className="hidden" onChange={e => handleFileUpload(e, 'adminSidebarLogoUrl')} accept="image/*" />
                                                </label>
                                            </div>
                                        </div>

                                        {/* Splash Screen Logo */}
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Splash Screen Logo</label>
                                            <div className="bg-[#0a0a0a] p-4 rounded-xl border border-white/10 flex items-center justify-between">
                                                <img src={settings.brandingAssets?.splashLogoUrl || settings.appLogoUrl} className="h-12 object-contain" alt="Splash Logo" />
                                                <label className="cursor-pointer bg-white/5 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-white/10 transition">
                                                    Upload
                                                    <input type="file" className="hidden" onChange={async (e) => {
                                                        if (e.target.files?.[0]) {
                                                            const base64 = await compressAndEncodeImage(e.target.files[0], 800, 0.8);
                                                            setSettings(s => s ? ({ ...s, brandingAssets: { ...s.brandingAssets, splashLogoUrl: base64 } }) : null);
                                                        }
                                                    }} accept="image/*" />
                                                </label>
                                            </div>
                                        </div>

                                        {/* Customer Auth Logo */}
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Customer Sign In/Up Logo</label>
                                            <div className="bg-[#0a0a0a] p-4 rounded-xl border border-white/10 flex items-center justify-between">
                                                <img src={settings.brandingAssets?.customerAuthLogoUrl || settings.appLogoUrl} className="h-12 object-contain" alt="Customer Logo" />
                                                <label className="cursor-pointer bg-white/5 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-white/10 transition">
                                                    Upload
                                                    <input type="file" className="hidden" onChange={async (e) => {
                                                        if (e.target.files?.[0]) {
                                                            const base64 = await compressAndEncodeImage(e.target.files[0], 800, 0.8);
                                                            setSettings(s => s ? ({ ...s, brandingAssets: { ...s.brandingAssets, customerAuthLogoUrl: base64 } }) : null);
                                                        }
                                                    }} accept="image/*" />
                                                </label>
                                            </div>
                                        </div>

                                        {/* Mechanic Auth Logo */}
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Mechanic Sign In/Up Logo</label>
                                            <div className="bg-[#0a0a0a] p-4 rounded-xl border border-white/10 flex items-center justify-between">
                                                <img src={settings.brandingAssets?.mechanicAuthLogoUrl || settings.appLogoUrl} className="h-12 object-contain" alt="Mechanic Logo" />
                                                <label className="cursor-pointer bg-white/5 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-white/10 transition">
                                                    Upload
                                                    <input type="file" className="hidden" onChange={async (e) => {
                                                        if (e.target.files?.[0]) {
                                                            const base64 = await compressAndEncodeImage(e.target.files[0], 800, 0.8);
                                                            setSettings(s => s ? ({ ...s, brandingAssets: { ...s.brandingAssets, mechanicAuthLogoUrl: base64 } }) : null);
                                                        }
                                                    }} accept="image/*" />
                                                </label>
                                            </div>
                                        </div>

                                        <div className="col-span-1 md:col-span-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase">App Tagline</label>
                                            <input type="text" value={settings.appTagline} onChange={e => setSettings({ ...settings!, appTagline: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-3 text-white focus:border-primary outline-none mt-1" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* MAPS */}
                        {activeTab === 'map' && (
                            <div className="space-y-6">
                                <SectionHeader title="Map Configuration" description="Customize map markers and default locations." />
                                <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-6">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Google Maps API Key</label>
                                        <input
                                            type="text"
                                            value={settings.googleMapsApiKey || ''}
                                            onChange={e => setSettings({ ...settings!, googleMapsApiKey: e.target.value })}
                                            className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-3 text-white focus:border-primary outline-none font-mono text-sm"
                                            placeholder="AIzaSy..."
                                        />
                                        <p className="text-xs text-gray-400 mt-2">Enter your Google Maps API key for map functionality.</p>
                                    </div>

                                    <div className="pt-4 border-t border-white/5">
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Mechanic Marker Icon</label>
                                        <div className="bg-[#0a0a0a] p-4 rounded-xl border border-white/10 flex items-center justify-between">
                                            <img src={settings.mechanicMarkerUrl} className="h-10 object-contain" alt="Marker" />
                                            <label className="cursor-pointer bg-white/5 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-white/10 transition">
                                                Upload
                                                <input type="file" className="hidden" onChange={e => handleFileUpload(e, 'mechanicMarkerUrl')} accept="image/*" />
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminSettingsScreen;
