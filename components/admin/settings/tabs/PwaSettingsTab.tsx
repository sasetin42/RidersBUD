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
    Maximize,
    Shield,
    RotateCcw,
    Radio,
    FileCheck,
    Navigation,
    HardDrive,
    Info,
    Check,
    AlertTriangle,
    SlidersHorizontal,
    Compass
} from 'lucide-react';
import { Settings } from '../../../../types';

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
    const [previewTab, setPreviewTab] = useState<'launcherIcon' | 'installModal' | 'splash'>('launcherIcon');
    const [iconShape, setIconShape] = useState<'squircle' | 'circle' | 'roundedSquare'>('squircle');

    // Values with fallbacks
    const effectiveAppName = settings.mobileAppName || settings.pwaAppName || settings.appName || 'RidersBUD';
    const effectiveShortName = settings.pwaShortName || 'RidersBUD';
    const effectiveAppIcon = settings.mobileAppIconUrl || settings.pwaIcon192Url || settings.appLogoUrl || '/icons/icon-192.png';
    const effectiveSplashIcon = settings.mobileSplashIconUrl || settings.pwaSplashLogoUrl || settings.pwaIcon512Url || effectiveAppIcon;
    const effectiveThemeColor = settings.mobilePrimaryColor || settings.pwaThemeColor || settings.accentColor || '#FE7803';
    const effectiveBgColor = settings.mobileSplashBgColor || settings.pwaBackgroundColor || '#0A0A0C';
    const effectiveOrientation = settings.mobileOrientation || settings.pwaOrientation || 'portrait';
    const isModalEnabled = settings.enableMobileInstallPrompt !== false;
    const isApkDownloadEnabled = settings.enableApkDownload ?? (settings.pwaShowApkDownloadOption !== false);
    const effectiveApkUrl = settings.apkDownloadUrl || settings.pwaApkDownloadUrl || '/releases/RidersBUD-latest.apk';
    const effectiveModalTitle = settings.pwaInstallModalTitle || 'Experience RidersBUD on Mobile';
    const effectiveModalSubtitle = settings.pwaInstallModalSubtitle || 'Install the mobile application for live GPS tracking, instant alerts, and offline access.';
    const effectiveSplashTagline = settings.pwaSplashTagline || settings.appTagline || 'Trusted Car Care Wherever You Are';

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
                <Upload size={12} className="text-[#FE7803]" />
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
            {/* Top Overview & Status Banner */}
            <div className="bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent border border-[#FE7803]/30 p-6 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-[#FE7803]/20 border border-[#FE7803]/40 flex items-center justify-center text-[#FE7803] flex-shrink-0 shadow-lg shadow-[#FE7803]/10">
                        <Smartphone size={28} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-black text-white">Mobile Application System Settings</h3>
                            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                Native Mobile Active
                            </span>
                        </div>
                        <p className="text-xs text-gray-400">
                            Configure mobile application identity, post-installation launcher icon, APK package distribution, splash screens, and hardware capabilities.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="px-3.5 py-2 bg-black/40 border border-white/10 rounded-xl flex items-center gap-2 text-xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-gray-300 font-mono text-[11px]">Build v{settings.mobileVersionName || '1.0.8'}</span>
                    </div>
                </div>
            </div>

            {/* Split layout: Configuration on Left, Live Mobile Device Preview on Right */}
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
                                <h4 className="text-base font-black text-white">Mobile Application Identity & Package</h4>
                                <p className="text-xs text-gray-500">Device homescreen label and native application attributes.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Application Name</label>
                                <input
                                    type="text"
                                    value={settings.mobileAppName ?? settings.pwaAppName ?? settings.appName ?? 'RidersBUD'}
                                    onChange={(e) => {
                                        onChange('mobileAppName', e.target.value);
                                        onChange('pwaAppName', e.target.value);
                                    }}
                                    placeholder="RidersBUD"
                                    className="w-full bg-black/50 border border-white/10 focus:border-[#FE7803] rounded-2xl px-4 py-3 text-xs text-white outline-none"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Short Name (Launcher Label)</label>
                                <input
                                    type="text"
                                    value={settings.pwaShortName ?? 'RidersBUD'}
                                    onChange={(e) => onChange('pwaShortName', e.target.value)}
                                    placeholder="RidersBUD"
                                    maxLength={15}
                                    className="w-full bg-black/50 border border-white/10 focus:border-[#FE7803] rounded-2xl px-4 py-3 text-xs text-white outline-none"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Android Package ID</label>
                                <input
                                    type="text"
                                    value={settings.mobilePackageName ?? 'com.ridersbud.app'}
                                    onChange={(e) => onChange('mobilePackageName', e.target.value)}
                                    placeholder="com.ridersbud.app"
                                    className="w-full bg-black/50 border border-white/10 focus:border-[#FE7803] rounded-2xl px-4 py-3 text-xs text-white outline-none font-mono"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Version Name</label>
                                <input
                                    type="text"
                                    value={settings.mobileVersionName ?? '1.0.8'}
                                    onChange={(e) => onChange('mobileVersionName', e.target.value)}
                                    placeholder="1.0.8"
                                    className="w-full bg-black/50 border border-white/10 focus:border-[#FE7803] rounded-2xl px-4 py-3 text-xs text-white outline-none font-mono"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Screen Orientation</label>
                                <select
                                    value={settings.mobileOrientation || settings.pwaOrientation || 'portrait'}
                                    onChange={(e) => {
                                        onChange('mobileOrientation', e.target.value);
                                        onChange('pwaOrientation', e.target.value);
                                    }}
                                    className="w-full bg-black/50 border border-white/10 focus:border-[#FE7803] rounded-2xl px-4 py-3 text-xs text-white outline-none"
                                >
                                    <option value="portrait">Portrait Locked (Recommended)</option>
                                    <option value="landscape">Landscape</option>
                                    <option value="any">Auto-Rotate (Any)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* 2. Post-Installation App Launcher Icon */}
                    <div className="space-y-5 bg-[#121212]/70 border border-white/5 p-6 rounded-3xl">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                                    <ImageIcon size={20} />
                                </div>
                                <div>
                                    <h4 className="text-base font-black text-white">App Icon (Post-Installation Display)</h4>
                                    <p className="text-xs text-gray-500">The icon that will appear on the user's phone home screen and app drawer after installation.</p>
                                </div>
                            </div>
                            <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                                Launcher Asset
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {renderAssetSlot('Mobile App Launcher Icon', 'mobileAppIconUrl', 'Main icon shown on device home screen after installation.')}
                            {renderAssetSlot('Splash Boot Logo', 'mobileSplashIconUrl', 'Icon displayed during application startup & boot screen.')}
                            {renderAssetSlot('Notification Tray Icon', 'pwaIcon192Url', 'Icon used for Android status bar push notifications.')}
                        </div>

                        <div className="bg-black/30 p-3.5 rounded-2xl border border-white/5 flex items-center gap-3 text-xs text-gray-400">
                            <Info size={18} className="text-[#FE7803] flex-shrink-0" />
                            <span>Recommended format: PNG, 512×512 pixels with square aspect ratio. This icon is rendered directly on device app drawers.</span>
                        </div>
                    </div>

                    {/* 3. APK Direct Download Control (Enable / Disable Feature) */}
                    <div className="space-y-5 bg-[#121212]/70 border border-[#FE7803]/20 p-6 rounded-3xl relative overflow-hidden">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-[#FE7803]/15 text-[#FE7803]">
                                    <Download size={20} />
                                </div>
                                <div>
                                    <h4 className="text-base font-black text-white">APK Direct Download Settings</h4>
                                    <p className="text-xs text-gray-500">Control standalone Android APK distribution on screen and install prompts.</p>
                                </div>
                            </div>

                            {/* Enable / Disable Toggle Switch */}
                            <label className="flex items-center gap-2 cursor-pointer bg-black/60 px-3 py-1.5 rounded-full border border-white/10 hover:border-white/20 transition">
                                <span className={`text-[11px] font-bold ${isApkDownloadEnabled ? 'text-emerald-400' : 'text-gray-500'}`}>
                                    {isApkDownloadEnabled ? 'APK Download Enabled' : 'APK Download Disabled'}
                                </span>
                                <input
                                    type="checkbox"
                                    checked={isApkDownloadEnabled}
                                    onChange={(e) => {
                                        onChange('enableApkDownload', e.target.checked);
                                        onChange('pwaShowApkDownloadOption', e.target.checked);
                                    }}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FE7803] relative" />
                            </label>
                        </div>

                        {/* Status notification */}
                        <div className={`p-3.5 rounded-2xl border text-xs flex items-center gap-3 transition ${
                            isApkDownloadEnabled 
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' 
                                : 'bg-zinc-900 border-zinc-700/50 text-zinc-400'
                        }`}>
                            {isApkDownloadEnabled ? (
                                <>
                                    <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                                    <span>APK Download is <strong>visible on screen</strong>. Android users will see direct APK download buttons.</span>
                                </>
                            ) : (
                                <>
                                    <AlertTriangle size={16} className="text-amber-400 flex-shrink-0" />
                                    <span>APK Download is <strong>hidden from screen</strong>. Users will only see instant direct mobile installation.</span>
                                </>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">APK Download URL Path</label>
                                <input
                                    type="text"
                                    value={settings.apkDownloadUrl ?? settings.pwaApkDownloadUrl ?? '/releases/RidersBUD-latest.apk'}
                                    onChange={(e) => {
                                        onChange('apkDownloadUrl', e.target.value);
                                        onChange('pwaApkDownloadUrl', e.target.value);
                                    }}
                                    placeholder="/releases/RidersBUD-latest.apk"
                                    className="w-full bg-black/50 border border-white/10 focus:border-[#FE7803] rounded-2xl px-4 py-3 text-xs text-white outline-none font-mono"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Estimated APK File Size</label>
                                <input
                                    type="text"
                                    value={settings.apkFileSizeMb ?? '28.4 MB'}
                                    onChange={(e) => onChange('apkFileSizeMb', e.target.value)}
                                    placeholder="28.4 MB"
                                    className="w-full bg-black/50 border border-white/10 focus:border-[#FE7803] rounded-2xl px-4 py-3 text-xs text-white outline-none font-mono"
                                />
                            </div>
                        </div>
                    </div>

                    {/* 4. Mobile System Features & Permissions */}
                    <div className="space-y-5 bg-[#121212]/70 border border-white/5 p-6 rounded-3xl">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                                <SlidersHorizontal size={20} />
                            </div>
                            <div>
                                <h4 className="text-base font-black text-white">Mobile System Features & Capabilities</h4>
                                <p className="text-xs text-gray-500">Hardware permissions, deep linking, and version control policies.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Deep Link URL Scheme</label>
                                <input
                                    type="text"
                                    value={settings.mobileDeepLinkScheme ?? 'ridersbud://'}
                                    onChange={(e) => onChange('mobileDeepLinkScheme', e.target.value)}
                                    placeholder="ridersbud://"
                                    className="w-full bg-black/50 border border-white/10 focus:border-[#FE7803] rounded-2xl px-4 py-3 text-xs text-white outline-none font-mono"
                                />
                                <p className="text-[10px] text-gray-500">Allows push notifications and SMS to open specific screens in the app.</p>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Minimum Supported App Version</label>
                                <input
                                    type="text"
                                    value={settings.mobileMinSupportedVersion ?? '1.0.0'}
                                    onChange={(e) => onChange('mobileMinSupportedVersion', e.target.value)}
                                    placeholder="1.0.0"
                                    className="w-full bg-black/50 border border-white/10 focus:border-[#FE7803] rounded-2xl px-4 py-3 text-xs text-white outline-none font-mono"
                                />
                                <p className="text-[10px] text-gray-500">Forces update prompt if device app version is below this value.</p>
                            </div>
                        </div>

                        <div className="pt-2 border-t border-white/5 space-y-3">
                            <label className="flex items-center gap-3 p-3 bg-black/40 border border-white/5 rounded-2xl cursor-pointer hover:border-white/10 transition">
                                <input
                                    type="checkbox"
                                    checked={settings.mobileRequireGpsHighAccuracy ?? true}
                                    onChange={(e) => onChange('mobileRequireGpsHighAccuracy', e.target.checked)}
                                    className="w-4 h-4 rounded text-primary focus:ring-0 bg-black/60 border-white/20"
                                />
                                <div>
                                    <span className="text-xs font-bold text-gray-200 block">Require High-Accuracy GPS on Mobile Launch</span>
                                    <span className="text-[10px] text-gray-500">Automatically requests fine GPS coordinates for precise mechanic dispatch and roadside assistance.</span>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 p-3 bg-black/40 border border-white/5 rounded-2xl cursor-pointer hover:border-white/10 transition">
                                <input
                                    type="checkbox"
                                    checked={settings.mobileForceUpdate ?? false}
                                    onChange={(e) => onChange('mobileForceUpdate', e.target.checked)}
                                    className="w-4 h-4 rounded text-primary focus:ring-0 bg-black/60 border-white/20"
                                />
                                <div>
                                    <span className="text-xs font-bold text-gray-200 block">Enforce In-App Critical Update Modal</span>
                                    <span className="text-[10px] text-gray-500">Prevents older versions from proceeding until updated to the latest mobile release.</span>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* 5. Mobile Palette & Splash Colors */}
                    <div className="space-y-5 bg-[#121212]/70 border border-white/5 p-6 rounded-3xl">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                                <Palette size={20} />
                            </div>
                            <div>
                                <h4 className="text-base font-black text-white">Mobile Splash & Status Bar Palette</h4>
                                <p className="text-xs text-gray-500">System status bar and background colors rendered on mobile start.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Status Bar Color</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={settings.mobilePrimaryColor || settings.pwaThemeColor || '#FE7803'}
                                        onChange={(e) => {
                                            onChange('mobilePrimaryColor', e.target.value);
                                            onChange('pwaThemeColor', e.target.value);
                                        }}
                                        className="w-10 h-10 rounded-xl bg-black/40 border border-white/10 p-1 cursor-pointer"
                                    />
                                    <input
                                        type="text"
                                        value={settings.mobilePrimaryColor || settings.pwaThemeColor || '#FE7803'}
                                        onChange={(e) => {
                                            onChange('mobilePrimaryColor', e.target.value);
                                            onChange('pwaThemeColor', e.target.value);
                                        }}
                                        placeholder="#FE7803"
                                        className="flex-1 bg-black/50 border border-white/10 focus:border-[#FE7803] rounded-2xl px-4 py-2.5 text-xs text-white outline-none font-mono"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Splash Background Color</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={settings.mobileSplashBgColor || settings.pwaBackgroundColor || '#0A0A0C'}
                                        onChange={(e) => {
                                            onChange('mobileSplashBgColor', e.target.value);
                                            onChange('pwaBackgroundColor', e.target.value);
                                        }}
                                        className="w-10 h-10 rounded-xl bg-black/40 border border-white/10 p-1 cursor-pointer"
                                    />
                                    <input
                                        type="text"
                                        value={settings.mobileSplashBgColor || settings.pwaBackgroundColor || '#0A0A0C'}
                                        onChange={(e) => {
                                            onChange('mobileSplashBgColor', e.target.value);
                                            onChange('pwaBackgroundColor', e.target.value);
                                        }}
                                        placeholder="#0A0A0C"
                                        className="flex-1 bg-black/50 border border-white/10 focus:border-[#FE7803] rounded-2xl px-4 py-2.5 text-xs text-white outline-none font-mono"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 6. Installation Pop-up Modal & Screen Controls */}
                    <div className="space-y-5 bg-[#121212]/70 border border-[#FE7803]/20 p-6 rounded-3xl relative overflow-hidden">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                                    <FileCheck size={20} />
                                </div>
                                <div>
                                    <h4 className="text-base font-black text-white">Mobile Installation Pop-up Modal</h4>
                                    <p className="text-xs text-gray-500">Control the automatic pop-up prompt that invites visitors to install the app.</p>
                                </div>
                            </div>

                            {/* Enable / Disable Modal Toggle Switch */}
                            <label className="flex items-center gap-2 cursor-pointer bg-black/60 px-3 py-1.5 rounded-full border border-white/10 hover:border-white/20 transition">
                                <span className={`text-[11px] font-bold ${isModalEnabled ? 'text-emerald-400' : 'text-gray-500'}`}>
                                    {isModalEnabled ? 'Modal Enabled' : 'Modal Disabled'}
                                </span>
                                <input
                                    type="checkbox"
                                    checked={isModalEnabled}
                                    onChange={(e) => onChange('enableMobileInstallPrompt', e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FE7803] relative" />
                            </label>
                        </div>

                        {/* Status notification banner */}
                        <div className={`p-3.5 rounded-2xl border text-xs flex items-center gap-3 transition ${
                            isModalEnabled 
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' 
                                : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                        }`}>
                            {isModalEnabled ? (
                                <>
                                    <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                                    <span>Mobile Installation Modal is <strong>ACTIVE</strong>. First-time mobile visitors will see the installation invitation dialog.</span>
                                </>
                            ) : (
                                <>
                                    <AlertTriangle size={16} className="text-rose-400 flex-shrink-0" />
                                    <span>Mobile Installation Modal is <strong>DISABLED</strong>. Visitors will not be prompted with the installation pop-up.</span>
                                </>
                            )}
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Screen Title</label>
                                <input
                                    type="text"
                                    value={settings.pwaInstallModalTitle ?? 'Experience RidersBUD on Mobile'}
                                    onChange={(e) => onChange('pwaInstallModalTitle', e.target.value)}
                                    placeholder="Experience RidersBUD on Mobile"
                                    className="w-full bg-black/50 border border-white/10 focus:border-[#FE7803] rounded-2xl px-4 py-3 text-xs text-white outline-none"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Screen Description</label>
                                <textarea
                                    rows={2}
                                    value={settings.pwaInstallModalSubtitle ?? 'Install the mobile application for live GPS tracking, instant alerts, and offline access.'}
                                    onChange={(e) => onChange('pwaInstallModalSubtitle', e.target.value)}
                                    placeholder="Install the mobile application for live GPS tracking..."
                                    className="w-full bg-black/50 border border-white/10 focus:border-[#FE7803] rounded-2xl px-4 py-3 text-xs text-white outline-none"
                                />
                            </div>
                        </div>
                    </div>

                </div>

                {/* Right Interactive Live Device Preview (5 cols) */}
                <div className="xl:col-span-5 sticky top-24 space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-2">
                            <Eye size={16} className="text-[#FE7803]" />
                            <span className="text-xs font-black text-white uppercase tracking-wider">Device Live Preview</span>
                        </div>

                        <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-white/10">
                            <button
                                type="button"
                                onClick={() => setPreviewTab('launcherIcon')}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${previewTab === 'launcherIcon' ? 'bg-[#FE7803] text-white shadow' : 'text-gray-400 hover:text-white'}`}
                            >
                                App Icon
                            </button>
                            <button
                                type="button"
                                onClick={() => setPreviewTab('installModal')}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${previewTab === 'installModal' ? 'bg-[#FE7803] text-white shadow' : 'text-gray-400 hover:text-white'}`}
                            >
                                Install Screen
                            </button>
                            <button
                                type="button"
                                onClick={() => setPreviewTab('splash')}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${previewTab === 'splash' ? 'bg-[#FE7803] text-white shadow' : 'text-gray-400 hover:text-white'}`}
                            >
                                Splash
                            </button>
                        </div>
                    </div>

                    {/* Simulated Phone Shell */}
                    <div className="w-full max-w-[340px] mx-auto bg-black rounded-[42px] p-3 border-4 border-zinc-800 shadow-2xl shadow-black relative overflow-hidden">
                        
                        {/* Status Bar */}
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

                        {/* Phone Screen Canvas */}
                        <div 
                            className="w-full h-[525px] rounded-[30px] overflow-hidden flex flex-col relative transition-colors"
                            style={{ backgroundColor: effectiveBgColor }}
                        >
                            {/* TAB 1: App Icon (Post-Installation Homescreen Display) */}
                            {previewTab === 'launcherIcon' && (
                                <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 via-black to-zinc-950 flex flex-col justify-between p-5 select-none">
                                    {/* Mock Top Widget */}
                                    <div className="pt-2 text-center">
                                        <div className="text-3xl font-light text-white tracking-tight">09:41</div>
                                        <div className="text-[11px] text-zinc-400 font-medium">Saturday, October 10</div>
                                    </div>

                                    {/* Installed App Icon Highlight Section */}
                                    <div className="space-y-4 py-4 text-center">
                                        <div className="inline-block px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider border border-emerald-500/30">
                                            Installed on Device
                                        </div>

                                        {/* Launcher Icon Frame */}
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <div className="relative group">
                                                <div className="absolute -inset-2 bg-gradient-to-r from-[#FE7803] to-amber-500 rounded-3xl blur-lg opacity-40 animate-pulse" />
                                                <div 
                                                    className={`w-20 h-20 bg-zinc-900 border-2 border-[#FE7803]/80 p-2 shadow-2xl flex items-center justify-center relative overflow-hidden transition-all duration-300 ${
                                                        iconShape === 'circle' 
                                                            ? 'rounded-full' 
                                                            : iconShape === 'squircle' 
                                                                ? 'rounded-[26px]' 
                                                                : 'rounded-2xl'
                                                    }`}
                                                >
                                                    <img
                                                        src={effectiveAppIcon}
                                                        alt="Installed App Icon"
                                                        className="w-full h-full object-contain"
                                                        onError={(e) => { (e.target as HTMLElement).setAttribute('src', '/favicon.png'); }}
                                                    />
                                                </div>
                                            </div>

                                            {/* App Launcher Label */}
                                            <span className="text-xs font-bold text-white tracking-wide truncate max-w-[120px] drop-shadow">
                                                {effectiveShortName}
                                            </span>
                                        </div>

                                        <p className="text-[10px] text-zinc-400 px-3">
                                            This is how the application icon appears on the mobile user's home screen after installation.
                                        </p>

                                        {/* Shape Preview Toggle */}
                                        <div className="inline-flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-white/10 text-[9px]">
                                            <button 
                                                type="button" 
                                                onClick={() => setIconShape('squircle')}
                                                className={`px-2 py-0.5 rounded-lg font-bold transition ${iconShape === 'squircle' ? 'bg-[#FE7803] text-white' : 'text-gray-400'}`}
                                            >
                                                Squircle
                                            </button>
                                            <button 
                                                type="button" 
                                                onClick={() => setIconShape('circle')}
                                                className={`px-2 py-0.5 rounded-lg font-bold transition ${iconShape === 'circle' ? 'bg-[#FE7803] text-white' : 'text-gray-400'}`}
                                            >
                                                Circle
                                            </button>
                                            <button 
                                                type="button" 
                                                onClick={() => setIconShape('roundedSquare')}
                                                className={`px-2 py-0.5 rounded-lg font-bold transition ${iconShape === 'roundedSquare' ? 'bg-[#FE7803] text-white' : 'text-gray-400'}`}
                                            >
                                                Square
                                            </button>
                                        </div>
                                    </div>

                                    {/* Mock Dock Icons */}
                                    <div className="bg-white/10 backdrop-blur-md rounded-3xl p-3 flex items-center justify-around">
                                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/80 flex items-center justify-center text-white text-xs">📞</div>
                                        <div className="w-10 h-10 rounded-2xl bg-blue-500/80 flex items-center justify-center text-white text-xs">💬</div>
                                        <div className="w-10 h-10 rounded-2xl bg-amber-500/80 flex items-center justify-center text-white text-xs">🧭</div>
                                        <div className="w-10 h-10 rounded-2xl bg-zinc-800 flex items-center justify-center text-white text-xs">⚙️</div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 2: Installation Screen / Modal */}
                            {previewTab === 'installModal' && (
                                <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
                                    {!isModalEnabled ? (
                                        <div className="w-full bg-[#141419]/90 border border-zinc-800 rounded-3xl p-6 text-center shadow-2xl flex flex-col items-center justify-center animate-in fade-in duration-200">
                                            <div className="w-12 h-12 rounded-2xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-400 mb-3 shadow-inner">
                                                <AlertTriangle size={22} className="text-amber-500" />
                                            </div>
                                            <div className="inline-block px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 text-[10px] font-bold uppercase tracking-wider mb-2 border border-rose-500/30">
                                                Modal Hidden (Disabled)
                                            </div>
                                            <h4 className="text-sm font-bold text-white mb-1">
                                                Installation Modal is Disabled
                                            </h4>
                                            <p className="text-zinc-400 text-[11px] leading-relaxed max-w-[220px]">
                                                Ang dialog prompt na ito ay <strong className="text-zinc-200">hindi lalabas</strong> sa mga mobile users dahil naka-disable ito sa settings.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="w-full bg-[#141419] border border-[#FE7803]/40 rounded-3xl p-5 text-center shadow-2xl animate-in zoom-in-95 duration-200">
                                            <div className="w-14 h-14 rounded-2xl bg-[#1E1E26] border-2 border-[#FE7803]/50 p-1.5 mx-auto mb-3 flex items-center justify-center shadow-lg">
                                                <img
                                                    src={effectiveAppIcon}
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

                                            {/* Main Install Button */}
                                            <button
                                                type="button"
                                                className="w-full py-2.5 bg-[#FE7803] text-white rounded-xl text-xs font-bold shadow-md shadow-[#FE7803]/30 flex items-center justify-center gap-1.5"
                                            >
                                                <Smartphone size={13} />
                                                <span>Install Mobile App</span>
                                            </button>

                                            {/* APK Button - Conditionally Rendered based on Toggle */}
                                            {isApkDownloadEnabled && (
                                                <button
                                                    type="button"
                                                    className="w-full mt-2 py-2 bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-xl text-[10px] font-semibold flex items-center justify-center gap-1.5"
                                                >
                                                    <Download size={11} className="text-[#FE7803]" />
                                                    <span>Direct APK ({settings.apkFileSizeMb || '28.4 MB'})</span>
                                                </button>
                                            )}

                                            <div className="text-[10px] text-zinc-500 mt-2 font-medium">Continue in Browser</div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* TAB 3: Splash Screen Simulation */}
                            {previewTab === 'splash' && (
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
                                                src={effectiveSplashIcon}
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
