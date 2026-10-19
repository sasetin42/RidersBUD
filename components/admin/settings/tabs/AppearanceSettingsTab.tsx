import React, { useState } from 'react';
import { 
    Layout, 
    Palette, 
    Sun, 
    Moon, 
    Monitor, 
    Upload, 
    Trash2, 
    Image as ImageIcon, 
    Sparkles, 
    Bell, 
    Volume2, 
    Sliders, 
    Send, 
    CheckCircle2, 
    AlertCircle, 
    Smartphone, 
    Tag, 
    Compass, 
    ShieldCheck 
} from 'lucide-react';
import { Settings } from '../../../../types';
import { showNotification, requestNotificationPermission, hasNotificationAPI } from '../../../../utils/notificationManager';
import { db } from '../../../../firebase';
import { addDoc, collection } from 'firebase/firestore';

interface AppearanceSettingsTabProps {
    settings: Settings;
    onChange: (field: keyof Settings, value: any) => void;
    onUploadAsset: (e: React.ChangeEvent<HTMLInputElement>, field: keyof Settings) => void;
    onRemoveAsset: (field: keyof Settings) => void;
}

export const AppearanceSettingsTab: React.FC<AppearanceSettingsTabProps> = ({
    settings,
    onChange,
    onUploadAsset,
    onRemoveAsset
}) => {
    const [testPushStatus, setTestPushStatus] = useState<string | null>(null);
    const [isSendingTest, setIsSendingTest] = useState(false);

    const brandColors = [
        { label: 'RidersBUD Orange', hex: '#FE7803' },
        { label: 'Flame Crimson', hex: '#E11D48' },
        { label: 'Electric Amber', hex: '#F59E0B' },
        { label: 'Emerald Speed', hex: '#10B981' },
        { label: 'Cyan Cyber', hex: '#06B6D4' }
    ];

    const currentFcmLogo = settings.fcmLogoUrl || settings.pushNotificationLogoUrl || settings.appLogoUrl || '/riders-logo.png';
    const currentFcmBadge = settings.fcmBadgeUrl || settings.pushNotificationBadgeUrl || '/riders-logo.png';
    const currentChannelName = settings.fcmChannelName || 'RidersBUD Alerts';
    const currentChannelId = settings.fcmChannelId || 'ridersbud_notifications';
    const currentTitlePrefix = settings.fcmTitlePrefix || 'RidersBUD';
    const currentAccentColor = settings.fcmAccentColor || settings.accentColor || '#FE7803';
    const currentSoundTheme = settings.fcmSoundTheme || 'default';
    const currentActionRoute = settings.fcmDefaultActionRoute || '/customer/bookings';

    const handleSendTestNotification = async () => {
        setIsSendingTest(true);
        setTestPushStatus(null);
        try {
            if (hasNotificationAPI()) {
                const perm = await requestNotificationPermission();
                if (perm !== 'granted') {
                    setTestPushStatus('Notification permission was blocked or denied in browser.');
                    setIsSendingTest(false);
                    return;
                }
            }

            const title = `${currentTitlePrefix ? `[${currentTitlePrefix}] ` : ''}Mechanic En Route!`;
            const options: NotificationOptions = {
                body: `Master Tech Carlo Santos is 4 mins away. Tap to open ${currentActionRoute}.`,
                icon: currentFcmLogo,
                badge: currentFcmBadge,
                tag: 'fcm-preview-test',
                data: {
                    channelId: currentChannelId,
                    channelName: currentChannelName,
                    soundTheme: currentSoundTheme,
                    accentColor: currentAccentColor,
                    route: currentActionRoute,
                    timestamp: new Date().toISOString()
                }
            };

            showNotification(title, options, currentFcmLogo, currentFcmBadge);

            // Dispatch live FCM push notification document to Firestore for real-time mobile push delivery
            try {
                await addDoc(collection(db, 'notifications'), {
                    title: 'Mechanic En Route!',
                    message: `Master Tech Carlo Santos is 4 mins away. Tap to open ${currentActionRoute}.`,
                    recipientId: 'all',
                    recipientRole: 'customer',
                    type: 'booking_status',
                    link: currentActionRoute,
                    createdAt: new Date().toISOString(),
                    status: 'unread',
                    read: false
                });
            } catch (fireErr) {
                console.warn('[FCM Test] Firestore push notification trigger warning:', fireErr);
            }

            setTestPushStatus('Live FCM test push notification dispatched to connected mobile devices!');
        } catch (err: any) {
            setTestPushStatus(`Test dispatch error: ${err.message || 'Unknown error'}`);
        } finally {
            setIsSendingTest(false);
            setTimeout(() => setTestPushStatus(null), 5000);
        }
    };

    const renderAssetSlot = (title: string, field: keyof Settings, hint: string) => (
        <div className="p-4 bg-black/40 border border-white/10 rounded-2xl flex flex-col justify-between gap-3 group">
            <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-gray-300 uppercase tracking-wider">{title}</span>
                {settings[field] && (
                    <button
                        type="button"
                        onClick={() => onRemoveAsset(field)}
                        className="p-1 rounded-lg text-rose-400 hover:bg-rose-500/20 text-xs transition"
                        title="Delete asset"
                    >
                        <Trash2 size={13} />
                    </button>
                )}
            </div>

            <div className="h-20 bg-black/60 rounded-xl border border-white/5 flex items-center justify-center overflow-hidden p-2 relative">
                {settings[field] ? (
                    <img
                        src={settings[field] as string}
                        alt={title}
                        className="max-h-full max-w-full object-contain"
                    />
                ) : (
                    <div className="text-center">
                        <ImageIcon size={20} className="text-gray-600 mx-auto mb-1" />
                        <span className="text-[10px] text-gray-500 font-medium">Default Fallback</span>
                    </div>
                )}
            </div>

            <p className="text-[10px] text-gray-500 leading-tight line-clamp-2">{hint}</p>

            <label className="cursor-pointer w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-bold text-center text-white flex items-center justify-center gap-1.5 transition">
                <Upload size={12} className="text-primary" />
                <span>Replace Asset</span>
                <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => onUploadAsset(e, field)}
                />
            </label>
        </div>
    );

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Theme & Palette */}
            <div className="space-y-6 bg-[#121212]/70 border border-white/5 p-6 rounded-3xl">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                        <Palette size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-white tracking-tight">Theme & Color Archetype</h3>
                        <p className="text-xs text-gray-500">Customize the visual identity, tone, and system accents.</p>
                    </div>
                </div>

                {/* Theme Mode Selector */}
                <div className="space-y-2">
                    <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Color Scheme Mode</label>
                    <div className="grid grid-cols-3 gap-3 max-w-md">
                        {[
                            { id: 'dark', label: 'Dark Mode', icon: <Moon size={15} /> },
                            { id: 'light', label: 'Light Mode', icon: <Sun size={15} /> },
                            { id: 'system', label: 'System Auto', icon: <Monitor size={15} /> }
                        ].map((m) => (
                            <button
                                key={m.id}
                                type="button"
                                onClick={() => onChange('themeMode', m.id)}
                                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs font-bold transition-all border ${
                                    (settings.themeMode || 'dark') === m.id
                                        ? 'bg-primary/20 border-primary text-white shadow-lg shadow-primary/20'
                                        : 'bg-black/40 border-white/5 text-gray-400 hover:text-white'
                                }`}
                            >
                                {m.icon}
                                <span>{m.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Primary Accent Color */}
                <div className="space-y-2 pt-2">
                    <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Brand Accent Color</label>
                    <div className="flex flex-wrap items-center gap-3">
                        {brandColors.map((c) => (
                            <button
                                key={c.hex}
                                type="button"
                                onClick={() => onChange('accentColor', c.hex)}
                                className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl border text-xs font-bold transition-all ${
                                    (settings.accentColor || '#FE7803').toLowerCase() === c.hex.toLowerCase()
                                        ? 'border-white bg-white/10 text-white scale-105'
                                        : 'border-white/5 bg-black/40 text-gray-400 hover:border-white/20'
                                }`}
                            >
                                <span className="w-3.5 h-3.5 rounded-full border border-black/40" style={{ backgroundColor: c.hex }} />
                                <span>{c.label}</span>
                            </button>
                        ))}

                        {/* Custom Hex Picker */}
                        <div className="flex items-center gap-2 pl-2">
                            <input
                                type="color"
                                value={settings.accentColor || '#FE7803'}
                                onChange={(e) => onChange('accentColor', e.target.value)}
                                className="w-8 h-8 rounded-xl bg-transparent border-0 cursor-pointer"
                            />
                            <input
                                type="text"
                                value={settings.accentColor || '#FE7803'}
                                onChange={(e) => onChange('accentColor', e.target.value)}
                                className="w-24 bg-black/50 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white uppercase font-mono"
                            />
                        </div>
                    </div>
                </div>

                {/* UI Density & Radius */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3">
                    <div className="space-y-1.5">
                        <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Component Border Radius</label>
                        <select
                            value={settings.borderRadius || 'rounded-2xl'}
                            onChange={(e) => onChange('borderRadius', e.target.value)}
                            className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none"
                        >
                            <option value="rounded-lg">Subtle (8px)</option>
                            <option value="rounded-xl">Standard (12px)</option>
                            <option value="rounded-2xl">Modern Soft (16px)</option>
                            <option value="rounded-3xl">Pill / Ultra Soft (24px)</option>
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Layout Density</label>
                        <select
                            value={settings.density || 'comfortable'}
                            onChange={(e) => onChange('density', e.target.value)}
                            className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none"
                        >
                            <option value="compact">Compact (High Information Density)</option>
                            <option value="comfortable">Comfortable (Balanced)</option>
                            <option value="spacious">Spacious (Open Air)</option>
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Header Presentation</label>
                        <select
                            value={settings.headerStyle || 'glass'}
                            onChange={(e) => onChange('headerStyle', e.target.value)}
                            className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none"
                        >
                            <option value="glass">Backdrop Blur Glass</option>
                            <option value="solid">Solid Black Charcoal</option>
                            <option value="minimal">Minimal Flat Borderless</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Portal Specific Logos Grid */}
            <div className="space-y-5 bg-[#121212]/70 border border-white/5 p-6 rounded-3xl">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                        <Layout size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-white tracking-tight">Portal & Surface Branding Logos</h3>
                        <p className="text-xs text-gray-500">Fine-tune distinct logos per surface across Customer, Mechanic, Admin, and Notification push channels.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {renderAssetSlot('Splash / Launch Screen', 'splashLogoUrl', 'Visible on mobile splash load and initial boot.')}
                    {renderAssetSlot('Customer Auth Screen', 'authLogoUrl', 'Prominently rendered on Customer login & registration.')}
                    {renderAssetSlot('Admin Portal Login', 'adminLoginLogoUrl', 'Rendered on the isolated Admin Gateway.')}
                    {renderAssetSlot('Customer Header Logo', 'customerHeaderLogoUrl', 'Appears in top customer navigation bar.')}
                    {renderAssetSlot('Mechanic Portal Header', 'mechanicHeaderLogoUrl', 'Displayed on the active specialist workstation.')}
                    {renderAssetSlot('Map Marker Brand Icon', 'mapLogoUrl', 'Center icon used for store origin pins on dispatch maps.')}
                    {renderAssetSlot('Invoice & PDF Logo', 'invoiceLogoUrl', 'Embedded in generated billing receipts and invoices.')}
                    {renderAssetSlot('Email Template Header', 'emailLogoUrl', 'Included at the top of all outbound SMTP notices.')}
                    {renderAssetSlot('Loading Screen Badge', 'loadingLogoUrl', 'Displayed during background data transitions.')}
                    {renderAssetSlot('FCM Notification Large Logo', 'fcmLogoUrl', 'Rich preview & thumbnail displayed on Android & iOS heads-up banners.')}
                    {renderAssetSlot('FCM Status Bar Badge Icon', 'fcmBadgeUrl', 'Monochrome alpha badge rendered in Android system notification tray.')}
                </div>
            </div>

            {/* FCM Push Notification Data Details & Live Customizer */}
            <div className="space-y-6 bg-[#121212]/70 border border-blue-500/20 p-6 rounded-3xl relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            <Bell size={22} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-black text-white tracking-tight">FCM Push Notification Branding & Data Details</h3>
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                    Live Sync
                                </span>
                            </div>
                            <p className="text-xs text-gray-400">Configure notification title prefixes, Android notification channel, sound profile, and badge accents.</p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleSendTestNotification}
                        disabled={isSendingTest}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
                    >
                        <Send size={14} className={isSendingTest ? 'animate-bounce' : ''} />
                        <span>{isSendingTest ? 'Triggering...' : 'Send Live Test Push'}</span>
                    </button>
                </div>

                {testPushStatus && (
                    <div className={`p-4 rounded-2xl border text-xs flex items-center gap-3 ${
                        testPushStatus.includes('error') || testPushStatus.includes('blocked')
                            ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    }`}>
                        {testPushStatus.includes('error') || testPushStatus.includes('blocked') ? (
                            <AlertCircle size={16} className="flex-shrink-0" />
                        ) : (
                            <CheckCircle2 size={16} className="flex-shrink-0" />
                        )}
                        <span>{testPushStatus}</span>
                    </div>
                )}

                {/* Real-time Preview Banner vs Form Settings Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left: Input Details Form (7 cols) */}
                    <div className="lg:col-span-7 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase flex items-center gap-1.5">
                                    <Tag size={12} className="text-blue-400" />
                                    <span>Brand Title Prefix</span>
                                </label>
                                <input
                                    type="text"
                                    value={settings.fcmTitlePrefix || ''}
                                    onChange={(e) => {
                                        onChange('fcmTitlePrefix', e.target.value);
                                    }}
                                    placeholder="RidersBUD"
                                    className="w-full bg-black/50 border border-white/10 focus:border-blue-500 rounded-2xl px-4 py-3 text-xs text-white outline-none transition"
                                />
                                <span className="text-[10px] text-gray-500">Prepended to outgoing message titles (e.g. [RidersBUD])</span>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase flex items-center gap-1.5">
                                    <Sliders size={12} className="text-blue-400" />
                                    <span>Android Channel Name</span>
                                </label>
                                <input
                                    type="text"
                                    value={settings.fcmChannelName || ''}
                                    onChange={(e) => onChange('fcmChannelName', e.target.value)}
                                    placeholder="RidersBUD Alerts"
                                    className="w-full bg-black/50 border border-white/10 focus:border-blue-500 rounded-2xl px-4 py-3 text-xs text-white outline-none transition"
                                />
                                <span className="text-[10px] text-gray-500">Android System notification channel category label</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase flex items-center gap-1.5">
                                    <Smartphone size={12} className="text-blue-400" />
                                    <span>Android Channel ID</span>
                                </label>
                                <input
                                    type="text"
                                    value={settings.fcmChannelId || ''}
                                    onChange={(e) => onChange('fcmChannelId', e.target.value)}
                                    placeholder="ridersbud_notifications"
                                    className="w-full bg-black/50 border border-white/10 focus:border-blue-500 rounded-2xl px-4 py-3 text-xs text-white outline-none font-mono transition"
                                />
                                <span className="text-[10px] text-gray-500">Unique internal identifier for Android notification manager</span>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase flex items-center gap-1.5">
                                    <Volume2 size={12} className="text-blue-400" />
                                    <span>Audio Chime / Sound Preset</span>
                                </label>
                                <select
                                    value={settings.fcmSoundTheme || 'default'}
                                    onChange={(e) => onChange('fcmSoundTheme', e.target.value)}
                                    className="w-full bg-black/50 border border-white/10 focus:border-blue-500 rounded-2xl px-4 py-3 text-xs text-white outline-none transition"
                                >
                                    <option value="default">System Default Chime</option>
                                    <option value="chime">Subtle Soft Bell Chime</option>
                                    <option value="hud">High-Tech HUD Ping</option>
                                    <option value="engine">Automotive Engine Rev</option>
                                </select>
                                <span className="text-[10px] text-gray-500">Sound preset triggered on device wake</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase flex items-center gap-1.5">
                                    <Palette size={12} className="text-blue-400" />
                                    <span>LED / Accent Highlight Color</span>
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={settings.fcmAccentColor || settings.accentColor || '#FE7803'}
                                        onChange={(e) => onChange('fcmAccentColor', e.target.value)}
                                        className="w-9 h-9 rounded-xl bg-transparent border-0 cursor-pointer"
                                    />
                                    <input
                                        type="text"
                                        value={settings.fcmAccentColor || settings.accentColor || '#FE7803'}
                                        onChange={(e) => onChange('fcmAccentColor', e.target.value)}
                                        placeholder="#FE7803"
                                        className="flex-1 bg-black/50 border border-white/10 focus:border-blue-500 rounded-2xl px-4 py-3 text-xs text-white outline-none font-mono uppercase transition"
                                    />
                                </div>
                                <span className="text-[10px] text-gray-500">Android icon badge tint and notification LED color</span>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase flex items-center gap-1.5">
                                    <Compass size={12} className="text-blue-400" />
                                    <span>Default Tap Destination Route</span>
                                </label>
                                <input
                                    type="text"
                                    value={settings.fcmDefaultActionRoute || ''}
                                    onChange={(e) => onChange('fcmDefaultActionRoute', e.target.value)}
                                    placeholder="/customer/bookings"
                                    className="w-full bg-black/50 border border-white/10 focus:border-blue-500 rounded-2xl px-4 py-3 text-xs text-white outline-none font-mono transition"
                                />
                                <span className="text-[10px] text-gray-500">Deep link route when user taps the notification banner</span>
                            </div>
                        </div>

                        {/* Direct URL input option */}
                        <div className="space-y-1.5 pt-2">
                            <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">
                                Direct FCM Logo Asset URL (Optional CDN Override)
                            </label>
                            <input
                                type="url"
                                value={settings.fcmLogoUrl || ''}
                                onChange={(e) => {
                                    onChange('fcmLogoUrl', e.target.value);
                                    onChange('pushNotificationLogoUrl', e.target.value);
                                }}
                                placeholder="https://storage.googleapis.com/.../push-logo.png"
                                className="w-full bg-black/50 border border-white/10 focus:border-blue-500 rounded-2xl px-4 py-3 text-xs text-white outline-none font-mono transition"
                            />
                            <span className="text-[10px] text-gray-500">Directly enter an external image URL, or use the "Replace Asset" button in the Branding Logos grid above.</span>
                        </div>
                    </div>

                    {/* Right: Real-Time Mobile Push Notification Preview (5 cols) */}
                    <div className="lg:col-span-5 bg-black/60 border border-white/10 rounded-2xl p-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                                <Smartphone size={13} className="text-primary" />
                                <span>Live Mobile Banner Preview</span>
                            </span>
                            <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                                <ShieldCheck size={12} /> Active Preview
                            </span>
                        </div>

                        {/* Mock Android/iOS Notification Card */}
                        <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl p-4 shadow-2xl relative overflow-hidden">
                            {/* Accent stripe */}
                            <div 
                                className="absolute top-0 left-0 bottom-0 w-1" 
                                style={{ backgroundColor: currentAccentColor }} 
                            />

                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-md bg-black/60 border border-white/10 flex items-center justify-center overflow-hidden">
                                        <img 
                                            src={currentFcmBadge || currentFcmLogo} 
                                            alt="App Icon" 
                                            className="w-full h-full object-contain"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = '/riders-logo.png';
                                            }}
                                        />
                                    </div>
                                    <span className="text-[11px] font-black text-white uppercase tracking-wider">
                                        {currentTitlePrefix}
                                    </span>
                                    <span className="text-[9px] text-gray-400">• Now</span>
                                </div>

                                <span className="text-[9px] font-mono text-gray-500 truncate max-w-[100px]">
                                    {currentChannelName}
                                </span>
                            </div>

                            <div className="flex items-start gap-3 mt-1">
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-xs font-bold text-white tracking-tight">
                                        Mechanic En Route!
                                    </h4>
                                    <p className="text-[11px] text-gray-400 mt-0.5 leading-snug line-clamp-2">
                                        Master Tech Carlo Santos is 4 mins away. Tap to open {currentActionRoute}.
                                    </p>
                                </div>

                                <div className="w-12 h-12 rounded-xl bg-black/80 border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0 p-1">
                                    <img 
                                        src={currentFcmLogo} 
                                        alt="FCM Push Logo" 
                                        className="max-h-full max-w-full object-contain"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = '/riders-logo.png';
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[10px]">
                                <span className="text-gray-500 font-mono">Tap Action: {currentActionRoute}</span>
                                <span 
                                    className="px-2 py-0.5 rounded-md font-bold text-[9px]"
                                    style={{ 
                                        backgroundColor: `${currentAccentColor}20`, 
                                        color: currentAccentColor 
                                    }}
                                >
                                    {currentSoundTheme.toUpperCase()}
                                </span>
                            </div>
                        </div>

                        <div className="text-[11px] text-gray-400 space-y-1">
                            <p className="font-semibold text-gray-300">💡 Customization Tip:</p>
                            <p className="text-[10px] leading-relaxed">
                                Uploading a transparent PNG square logo provides the crispest appearance on both high-DPI smartphone display locks and browser banners.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Custom CSS Injection */}
            <div className="space-y-4 bg-[#121212]/70 border border-white/5 p-6 rounded-3xl">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                        <Sparkles size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-white tracking-tight">Custom CSS Overrides</h3>
                        <p className="text-xs text-gray-500">Inject scoped rules for enterprise dashboard white-labeling.</p>
                    </div>
                </div>

                <textarea
                    rows={4}
                    value={settings.customCss || ''}
                    onChange={(e) => onChange('customCss', e.target.value)}
                    placeholder="/* Custom CSS rules for buttons, card gradients or brand scrollbars */&#10;:root { --custom-accent-glow: rgba(254, 120, 3, 0.35); }"
                    className="w-full bg-black/60 text-emerald-400 font-mono text-xs border border-white/10 focus:border-primary rounded-2xl p-4 outline-none transition"
                />
            </div>
        </div>
    );
};
