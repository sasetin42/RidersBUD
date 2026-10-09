import React, { useState } from 'react';
import { 
    Smartphone, 
    Upload, 
    Trash2, 
    Image as ImageIcon, 
    Palette, 
    Download, 
    Layers, 
    CheckCircle2, 
    Sparkles, 
    Eye,
    Zap,
    ExternalLink,
    Maximize,
    Compass,
    Tag,
    Globe,
    FileJson,
    Copy,
    Check
} from 'lucide-react';
import { Settings } from '../../../../types';
import { buildWebManifest } from '../../../../utils/pwaManifestHelper';

interface PwaSettingsTabProps {
    settings: Settings;
    onChange: (field: keyof Settings, value: any) => void;
    onUploadAsset: (e: React.ChangeEvent<HTMLInputElement>, field: keyof Settings) => void;
    onRemoveAsset: (field: keyof Settings) => void;
}

export const PwaSettingsTab: React.FC<PwaSettingsTabProps> = ({
    settings,
    onChange,
    onUploadAsset,
    onRemoveAsset
}) => {
    const [previewTab, setPreviewTab] = useState<'installModal' | 'splash' | 'appShell'>('installModal');
    const [showManifestInspector, setShowManifestInspector] = useState(false);
    const [copiedManifest, setCopiedManifest] = useState(false);

    // Default fallbacks matching current branding
    const effectiveAppName = settings.pwaAppName || settings.appName || 'RidersBUD';
    const effectiveShortName = settings.pwaShortName || 'RidersBUD';
    const effectiveDescription = settings.pwaDescription || 'RidersBUD mobile delivery and rider platform';
    const effectiveThemeColor = settings.pwaThemeColor || settings.accentColor || '#FE7803';
    const effectiveBgColor = settings.pwaBackgroundColor || '#0A0A0C';
    const effectiveDisplayMode = settings.pwaDisplayMode || 'standalone';
    const effectiveOrientation = settings.pwaOrientation || 'portrait';
    const effectiveLogo = settings.pwaLogoUrl || settings.pwaIcon192Url || settings.appLogoUrl || '/icons/icon-192.png';
    const effectiveSplashLogo = settings.pwaSplashLogoUrl || settings.splashLogoUrl || effectiveLogo;
    const effectiveModalTitle = settings.pwaInstallModalTitle || 'Experience RidersBUD on Mobile';
    const effectiveModalSubtitle = settings.pwaInstallModalSubtitle || 'Install the mobile application for live GPS tracking, instant alerts, and offline access.';
    const effectiveSplashTagline = settings.pwaSplashTagline || settings.appTagline || 'Trusted Car Care Wherever You Are';

    const currentLiveManifest = buildWebManifest(settings);

    const handleCopyManifest = () => {
        navigator.clipboard.writeText(JSON.stringify(currentLiveManifest, null, 2)).then(() => {
            setCopiedManifest(true);
            setTimeout(() => setCopiedManifest(false), 2000);
        });
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
                        <span className="text-[10px] text-gray-500 font-medium">Default App Icon</span>
                    </div>
                )}
            </div>

            <p className="text-[10px] text-gray-500 leading-tight line-clamp-2">{hint}</p>

            <label className="cursor-pointer w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-bold text-center text-white flex items-center justify-center gap-1.5 transition">
                <Upload size={12} className="text-primary" />
                <span>Upload Icon</span>
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
            {/* Top Overview & Status */}
            <div className="bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent border border-[#FE7803]/30 p-6 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-[#FE7803]/20 border border-[#FE7803]/40 flex items-center justify-center text-[#FE7803] flex-shrink-0 shadow-lg shadow-[#FE7803]/10">
                        <Smartphone size={28} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-black text-white">Progressive Web App (PWA) Customization</h3>
                            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Fully Active</span>
                        </div>
                        <p className="text-xs text-gray-400">
                            Configure how RidersBUD installs, launches, handles display modes, and renders across Android, iOS, and desktop web browsers.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setShowManifestInspector(!showManifestInspector)}
                        className="px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-300 rounded-xl flex items-center gap-1.5 transition"
                    >
                        <FileJson size={13} className="text-[#FE7803]" />
                        <span>Inspect Live Manifest</span>
                    </button>
                    <a
                        href="/manifest.webmanifest"
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-300 rounded-xl flex items-center gap-1.5 transition"
                    >
                        <span>Static Manifest</span>
                        <ExternalLink size={12} />
                    </a>
                </div>
            </div>

            {/* Live Manifest Inspector Drawer / Modal */}
            {showManifestInspector && (
                <div className="bg-[#101014] border border-[#FE7803]/30 rounded-3xl p-5 space-y-3 animate-fadeIn">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <FileJson className="text-[#FE7803]" size={16} />
                            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Dynamic Live Web Manifest (Runtime Injected)</h4>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleCopyManifest}
                                className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-[11px] font-medium flex items-center gap-1 transition"
                            >
                                {copiedManifest ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                                <span>{copiedManifest ? 'Copied' : 'Copy JSON'}</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowManifestInspector(false)}
                                className="text-gray-400 hover:text-white text-xs px-2 py-1"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                    <pre className="bg-black/70 p-4 rounded-2xl text-[11px] font-mono text-amber-300 overflow-x-auto max-h-60 border border-white/5">
                        {JSON.stringify(currentLiveManifest, null, 2)}
                    </pre>
                </div>
            )}

            {/* Split layout: Configuration on Left, Live Mobile Preview on Right */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                
                {/* Left Form Controls (7 cols) */}
                <div className="xl:col-span-7 space-y-8">
                    
                    {/* 1. App Installation Identity */}
                    <div className="space-y-5 bg-[#121212]/70 border border-white/5 p-6 rounded-3xl">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400">
                                <Layers size={20} />
                            </div>
                            <div>
                                <h4 className="text-base font-black text-white">Installation Identity & Web Manifest</h4>
                                <p className="text-xs text-gray-500">Parameters written to the application manifest and device homescreen.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Application Full Name</label>
                                <input
                                    type="text"
                                    value={settings.pwaAppName ?? settings.appName ?? 'RidersBUD'}
                                    onChange={(e) => onChange('pwaAppName', e.target.value)}
                                    placeholder="RidersBUD"
                                    className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Short Name (Home Screen Label)</label>
                                <input
                                    type="text"
                                    value={settings.pwaShortName ?? 'RidersBUD'}
                                    onChange={(e) => onChange('pwaShortName', e.target.value)}
                                    placeholder="RidersBUD"
                                    maxLength={15}
                                    className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">PWA Description</label>
                            <textarea
                                rows={2}
                                value={settings.pwaDescription ?? 'RidersBUD mobile delivery and rider platform'}
                                onChange={(e) => onChange('pwaDescription', e.target.value)}
                                placeholder="RidersBUD mobile delivery and rider platform"
                                className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none"
                            />
                        </div>

                        {/* Display Mode & Orientation */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Display Mode</label>
                                    <span className="text-[9px] font-bold text-[#FE7803] uppercase">Active Feature</span>
                                </div>
                                <select
                                    value={settings.pwaDisplayMode || 'standalone'}
                                    onChange={(e) => onChange('pwaDisplayMode', e.target.value)}
                                    className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none"
                                >
                                    <option value="standalone">Standalone (Native App Feel, No URL Bar)</option>
                                    <option value="fullscreen">Fullscreen (Immersive Game/Full Screen Display)</option>
                                    <option value="minimal-ui">Minimal UI (Simplified Controls)</option>
                                    <option value="browser">Browser Window (Standard Web Tab)</option>
                                </select>
                                <p className="text-[10px] text-gray-500">
                                    Controls OS window framing. Standalone hides the browser address bar entirely.
                                </p>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Screen Orientation</label>
                                <select
                                    value={settings.pwaOrientation || 'portrait'}
                                    onChange={(e) => onChange('pwaOrientation', e.target.value)}
                                    className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none"
                                >
                                    <option value="portrait">Portrait Locked (Recommended for Mobile)</option>
                                    <option value="landscape">Landscape Locked</option>
                                    <option value="any">Any (Auto-rotate)</option>
                                    <option value="natural">Device Natural Orientation</option>
                                </select>
                                <p className="text-[10px] text-gray-500">
                                    Locks device orientation upon launching from home screen icon.
                                </p>
                            </div>
                        </div>

                        {/* Start URL & Scope */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Start URL</label>
                                <input
                                    type="text"
                                    value={settings.pwaStartUrl || '/'}
                                    onChange={(e) => onChange('pwaStartUrl', e.target.value)}
                                    placeholder="/"
                                    className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none font-mono"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Application Scope</label>
                                <input
                                    type="text"
                                    value={settings.pwaScope || '/'}
                                    onChange={(e) => onChange('pwaScope', e.target.value)}
                                    placeholder="/"
                                    className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none font-mono"
                                />
                            </div>
                        </div>

                        {/* Fullscreen Behavior Options */}
                        <div className="pt-2 border-t border-white/5 space-y-3">
                            <label className="flex items-center gap-3 p-3 bg-black/40 border border-white/5 rounded-2xl cursor-pointer hover:border-white/10 transition">
                                <input
                                    type="checkbox"
                                    checked={settings.pwaForceFullscreenInStandalone ?? false}
                                    onChange={(e) => onChange('pwaForceFullscreenInStandalone', e.target.checked)}
                                    className="w-4 h-4 rounded text-primary focus:ring-0 bg-black/60 border-white/20"
                                />
                                <div>
                                    <span className="text-xs font-bold text-gray-200 block">Force Immersive Fullscreen on First Touch</span>
                                    <span className="text-[10px] text-gray-500">Automatically activates HTML5 Fullscreen API to eliminate remaining browser header bars.</span>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 p-3 bg-black/40 border border-white/5 rounded-2xl cursor-pointer hover:border-white/10 transition">
                                <input
                                    type="checkbox"
                                    checked={settings.pwaEnableLiveShortcuts !== false}
                                    onChange={(e) => onChange('pwaEnableLiveShortcuts', e.target.checked)}
                                    className="w-4 h-4 rounded text-primary focus:ring-0 bg-black/60 border-white/20"
                                />
                                <div>
                                    <span className="text-xs font-bold text-gray-200 block">Enable Quick Home Screen Shortcuts</span>
                                    <span className="text-[10px] text-gray-500">Adds long-press shortcuts on Android/iOS (Find Mechanic, My Garage, Parts Store, Active Bookings).</span>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* 2. Color Scheme & Theme */}
                    <div className="space-y-5 bg-[#121212]/70 border border-white/5 p-6 rounded-3xl">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                                <Palette size={20} />
                            </div>
                            <div>
                                <h4 className="text-base font-black text-white">Theme & Status Bar Colors</h4>
                                <p className="text-xs text-gray-500">Colors rendered on Android notification shade and splash screens.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Theme Color (Status Bar)</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={settings.pwaThemeColor || '#FE7803'}
                                        onChange={(e) => onChange('pwaThemeColor', e.target.value)}
                                        className="w-10 h-10 rounded-xl bg-black/40 border border-white/10 p-1 cursor-pointer"
                                    />
                                    <input
                                        type="text"
                                        value={settings.pwaThemeColor || '#FE7803'}
                                        onChange={(e) => onChange('pwaThemeColor', e.target.value)}
                                        placeholder="#FE7803"
                                        className="flex-1 bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-2.5 text-xs text-white outline-none font-mono"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Background Color (Splash Screen)</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={settings.pwaBackgroundColor || '#0A0A0C'}
                                        onChange={(e) => onChange('pwaBackgroundColor', e.target.value)}
                                        className="w-10 h-10 rounded-xl bg-black/40 border border-white/10 p-1 cursor-pointer"
                                    />
                                    <input
                                        type="text"
                                        value={settings.pwaBackgroundColor || '#0A0A0C'}
                                        onChange={(e) => onChange('pwaBackgroundColor', e.target.value)}
                                        placeholder="#0A0A0C"
                                        className="flex-1 bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-2.5 text-xs text-white outline-none font-mono"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 3. App Icons & Surface Graphics */}
                    <div className="space-y-5 bg-[#121212]/70 border border-white/5 p-6 rounded-3xl">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                                <ImageIcon size={20} />
                            </div>
                            <div>
                                <h4 className="text-base font-black text-white">App Icons & Surface Logos</h4>
                                <p className="text-xs text-gray-500">Upload customized PNG icons used for desktop, Android, and iOS.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {renderAssetSlot('192×192 App Icon', 'pwaIcon192Url', 'Home screen & task switcher icon on mobile.')}
                            {renderAssetSlot('512×512 Splash Icon', 'pwaIcon512Url', 'High-res icon used during splash booting.')}
                            {renderAssetSlot('Maskable Icon (Adaptive)', 'pwaMaskableIconUrl', 'Android adaptive squircle/circle icon.')}
                            {renderAssetSlot('Apple Touch Icon', 'pwaAppleTouchIconUrl', 'Rendered on iPhone & iPad home screens.')}
                        </div>

                        <div className="pt-2">
                            {renderAssetSlot('Splash Center Logo', 'pwaSplashLogoUrl', 'Displayed in center of mobile splash boot animation.')}
                        </div>
                    </div>

                    {/* 4. Installation Pop-up Modal Customization */}
                    <div className="space-y-5 bg-[#121212]/70 border border-white/5 p-6 rounded-3xl">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                                <Download size={20} />
                            </div>
                            <div>
                                <h4 className="text-base font-black text-white">Installation Pop-up Modal Behavior</h4>
                                <p className="text-xs text-gray-500">Customize the user-facing modal that prompts visitors to install the app.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Modal Title</label>
                                <input
                                    type="text"
                                    value={settings.pwaInstallModalTitle ?? 'Experience RidersBUD on Mobile'}
                                    onChange={(e) => onChange('pwaInstallModalTitle', e.target.value)}
                                    placeholder="Experience RidersBUD on Mobile"
                                    className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Auto-Prompt Delay (Seconds)</label>
                                <input
                                    type="number"
                                    min={0}
                                    max={60}
                                    value={settings.pwaAutoPromptDelaySeconds ?? 2}
                                    onChange={(e) => onChange('pwaAutoPromptDelaySeconds', Number(e.target.value))}
                                    className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Modal Description</label>
                            <textarea
                                rows={2}
                                value={settings.pwaInstallModalSubtitle ?? 'Install the mobile application for live GPS tracking, instant alerts, and offline access.'}
                                onChange={(e) => onChange('pwaInstallModalSubtitle', e.target.value)}
                                placeholder="Install the mobile application for live GPS tracking..."
                                className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Custom APK Download URL (Android Sideload)</label>
                                <input
                                    type="text"
                                    value={settings.pwaApkDownloadUrl ?? '/releases/RidersBUD-latest.apk'}
                                    onChange={(e) => onChange('pwaApkDownloadUrl', e.target.value)}
                                    placeholder="/releases/RidersBUD-latest.apk"
                                    className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none font-mono"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Dismissal Cooldown (Days)</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={30}
                                    value={settings.pwaPromptCooldownDays ?? 1}
                                    onChange={(e) => onChange('pwaPromptCooldownDays', Number(e.target.value))}
                                    placeholder="1"
                                    className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none font-mono"
                                />
                            </div>
                        </div>

                        <div className="pt-2">
                            <label className="flex items-center gap-3 p-3 bg-black/40 border border-white/5 rounded-2xl cursor-pointer hover:border-white/10 transition">
                                <input
                                    type="checkbox"
                                    checked={settings.pwaShowApkDownloadOption !== false}
                                    onChange={(e) => onChange('pwaShowApkDownloadOption', e.target.checked)}
                                    className="w-4 h-4 rounded text-primary focus:ring-0 bg-black/60 border-white/20"
                                />
                                <div>
                                    <span className="text-xs font-bold text-gray-200 block">Offer Android APK Download alongside PWA Install</span>
                                    <span className="text-[10px] text-gray-500">Provides visitors with a direct choice between instant Web App install or full standalone APK.</span>
                                </div>
                            </label>
                        </div>
                    </div>

                </div>

                {/* Right Interactive Live Device Preview (5 cols) */}
                <div className="xl:col-span-5 sticky top-24 space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-2">
                            <Eye size={16} className="text-primary" />
                            <span className="text-xs font-black text-white uppercase tracking-wider">Live Device Preview</span>
                        </div>

                        <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-white/10">
                            <button
                                type="button"
                                onClick={() => setPreviewTab('installModal')}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${previewTab === 'installModal' ? 'bg-[#FE7803] text-white shadow' : 'text-gray-400 hover:text-white'}`}
                            >
                                Modal
                            </button>
                            <button
                                type="button"
                                onClick={() => setPreviewTab('splash')}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${previewTab === 'splash' ? 'bg-[#FE7803] text-white shadow' : 'text-gray-400 hover:text-white'}`}
                            >
                                Splash
                            </button>
                            <button
                                type="button"
                                onClick={() => setPreviewTab('appShell')}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${previewTab === 'appShell' ? 'bg-[#FE7803] text-white shadow' : 'text-gray-400 hover:text-white'}`}
                            >
                                Display Mode
                            </button>
                        </div>
                    </div>

                    {/* Simulated Phone Shell */}
                    <div className="w-full max-w-[340px] mx-auto bg-black rounded-[42px] p-3 border-4 border-zinc-800 shadow-2xl shadow-black relative overflow-hidden">
                        
                        {/* Dynamic Status Bar - Hides in Fullscreen Mode */}
                        {effectiveDisplayMode !== 'fullscreen' ? (
                            <div 
                                className="h-7 w-full flex items-center justify-between px-5 text-[10px] font-bold text-white transition-colors"
                                style={{ backgroundColor: effectiveThemeColor }}
                            >
                                <span>9:41</span>
                                <div className="w-16 h-3.5 bg-black rounded-full mx-auto" />
                                <div className="flex items-center gap-1">
                                    <span>5G</span>
                                    <span>100%</span>
                                </div>
                            </div>
                        ) : (
                            <div className="h-2 w-full bg-black/40 flex items-center justify-center">
                                <div className="w-12 h-1 bg-zinc-700/60 rounded-full" />
                            </div>
                        )}

                        {/* Optional Browser Address Bar in "browser" display mode */}
                        {effectiveDisplayMode === 'browser' && (
                            <div className="bg-[#1C1C22] px-3 py-1.5 border-b border-white/10 flex items-center gap-2 text-[10px] text-gray-400">
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                                <div className="flex-1 bg-black/50 rounded-lg px-2 py-0.5 truncate text-[9px] text-gray-300 font-mono">
                                    https://ridersbud-10806.web.app
                                </div>
                            </div>
                        )}

                        {/* Optional Minimal UI Address/Title Bar */}
                        {effectiveDisplayMode === 'minimal-ui' && (
                            <div className="bg-[#18181D] px-3 py-1 border-b border-white/5 flex items-center justify-between text-[9px] text-gray-400">
                                <span>{effectiveShortName}</span>
                                <span className="text-zinc-600">● ● ●</span>
                            </div>
                        )}

                        {/* Phone Screen Canvas */}
                        <div 
                            className={`w-full ${effectiveDisplayMode === 'fullscreen' ? 'h-[555px]' : 'h-[520px]'} rounded-[30px] overflow-hidden flex flex-col relative transition-colors`}
                            style={{ backgroundColor: effectiveBgColor }}
                        >
                            {previewTab === 'installModal' ? (
                                /* Modal Simulation */
                                <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
                                    <div className="w-full bg-[#141419] border border-[#FE7803]/40 rounded-3xl p-5 text-center shadow-2xl">
                                        <div className="w-14 h-14 rounded-2xl bg-[#1E1E26] border-2 border-[#FE7803]/50 p-1.5 mx-auto mb-3 flex items-center justify-center shadow-lg">
                                            <img
                                                src={effectiveLogo}
                                                alt="App Icon"
                                                className="w-full h-full object-contain rounded-xl"
                                                onError={(e) => { (e.target as HTMLElement).setAttribute('src', '/favicon.png'); }}
                                            />
                                        </div>

                                        <div className="inline-block px-2.5 py-0.5 rounded-full bg-[#FE7803]/15 text-[#FE7803] text-[9px] font-bold uppercase tracking-wider mb-1.5 border border-[#FE7803]/30">
                                            Official Mobile App
                                        </div>

                                        <h4 className="text-sm font-extrabold text-white mb-1 leading-snug">
                                            {effectiveModalTitle}
                                        </h4>
                                        <p className="text-zinc-400 text-[10px] mb-3 leading-relaxed">
                                            {effectiveModalSubtitle}
                                        </p>

                                        <div className="grid grid-cols-2 gap-1.5 text-left bg-[#1B1B22] p-2 rounded-xl border border-[#2A2A35] mb-3 text-[9px] text-zinc-300">
                                            <div className="flex items-center gap-1">
                                                <CheckCircle2 size={10} className="text-[#FE7803]" />
                                                <span>Fast Booking</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Zap size={10} className="text-[#FE7803]" />
                                                <span>Live GPS</span>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            className="w-full py-2.5 bg-[#FE7803] text-white rounded-xl text-xs font-bold shadow-md shadow-[#FE7803]/30"
                                        >
                                            Install Mobile App
                                        </button>
                                        <div className="text-[10px] text-zinc-500 mt-2 font-medium">Continue in Browser</div>
                                    </div>
                                </div>
                            ) : previewTab === 'splash' ? (
                                /* Splash Screen Simulation */
                                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center select-none">
                                    <div className="relative flex items-center justify-center mb-6 w-32 h-32">
                                        <div className="absolute w-28 h-28 rounded-full bg-orange-500/15 blur-2xl animate-pulse" />
                                        <div className="absolute w-28 h-28 rounded-full border border-white/5" />
                                        <div 
                                            className="absolute w-24 h-24 rounded-full border-2 border-t-transparent border-r-transparent animate-spin"
                                            style={{ borderColor: effectiveThemeColor, borderTopColor: 'transparent' }}
                                        />
                                        <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center bg-black/60 border border-white/10 p-2 z-10">
                                            <img
                                                src={effectiveSplashLogo}
                                                alt="Splash Logo"
                                                className="w-full h-full object-contain"
                                                onError={(e) => { (e.target as HTMLElement).setAttribute('src', '/favicon.png'); }}
                                            />
                                        </div>
                                    </div>

                                    <h4 className="text-white font-extrabold text-base tracking-wider mb-1">
                                        {effectiveAppName}
                                    </h4>
                                    <p className="text-zinc-400 text-xs font-medium px-4 leading-relaxed">
                                        {effectiveSplashTagline}
                                    </p>
                                </div>
                            ) : (
                                /* App Shell & Display Mode Simulation */
                                <div className="absolute inset-0 flex flex-col justify-between p-4 select-none">
                                    <div className="space-y-3">
                                        {/* Mock App Header */}
                                        <div className="flex items-center justify-between pb-3 border-b border-white/10">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-lg bg-[#FE7803] flex items-center justify-center text-white text-xs font-black">
                                                    R
                                                </div>
                                                <span className="text-xs font-black text-white">{effectiveShortName}</span>
                                            </div>
                                            <span className="px-2 py-0.5 rounded-full bg-white/10 text-[9px] text-gray-300 font-bold uppercase tracking-wider">
                                                {effectiveDisplayMode}
                                            </span>
                                        </div>

                                        {/* Display Mode Indicator Card */}
                                        <div className="p-3 bg-white/5 border border-white/10 rounded-2xl space-y-1.5">
                                            <div className="flex items-center gap-1.5 text-[#FE7803] text-xs font-bold">
                                                <Maximize size={12} />
                                                <span>Active Display Mode: {effectiveDisplayMode}</span>
                                            </div>
                                            <p className="text-[10px] text-gray-400 leading-tight">
                                                {effectiveDisplayMode === 'standalone' && 'Standard App View: Launches with no browser address bar, custom title, and native splash screen.'}
                                                {effectiveDisplayMode === 'fullscreen' && 'Immersive Mode: All system UI and status bars are hidden for full-screen map & dispatch visualization.'}
                                                {effectiveDisplayMode === 'minimal-ui' && 'Minimal Controls: Minimal navigation bar kept for back/forward buttons.'}
                                                {effectiveDisplayMode === 'browser' && 'Standard Tab: Runs as standard web page within browser application.'}
                                            </p>
                                        </div>

                                        {/* Mock Content */}
                                        <div className="grid grid-cols-2 gap-2 pt-1">
                                            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-center">
                                                <div className="text-xs font-extrabold text-white">Roadside</div>
                                                <div className="text-[9px] text-gray-500">Live Dispatch</div>
                                            </div>
                                            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-center">
                                                <div className="text-xs font-extrabold text-white">Parts Hub</div>
                                                <div className="text-[9px] text-gray-500">Express Delivery</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Mock Bottom Navigation */}
                                    <div className="py-2 px-4 bg-black/80 border border-white/10 rounded-2xl flex items-center justify-around text-[9px] text-gray-400">
                                        <span className="text-[#FE7803] font-bold">Home</span>
                                        <span>Services</span>
                                        <span>Activity</span>
                                        <span>Profile</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Bottom Home Indicator Bar */}
                        <div className="h-4 flex items-center justify-center pt-1">
                            <div className="w-28 h-1 bg-zinc-600 rounded-full" />
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
