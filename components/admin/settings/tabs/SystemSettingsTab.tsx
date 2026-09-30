import React, { useState, useRef } from 'react';
import { 
    Activity, Server, Database, Trash2, RefreshCw, Upload, Download, 
    AlertTriangle, CheckCircle2, ShieldAlert, Smartphone, HardDrive,
    Eye, EyeOff, Globe, Link2, Users
} from 'lucide-react';
import { Settings, AppUpdateSettings } from '../../../../types';
import { DEFAULT_LATEST_APK_URL } from '../../../../services/AppUpdateService';
import { storageService } from '../../../../services/StorageService';

interface SystemSettingsTabProps {
    settings: Settings;
    onChange: (field: keyof Settings, value: any) => void;
    onUpdateAppConfigField: (field: keyof AppUpdateSettings, value: any) => void;
    onApkUploaded: (downloadUrl: string, fileSizeMb: string) => Promise<void>;
}

export const SystemSettingsTab: React.FC<SystemSettingsTabProps> = ({
    settings,
    onChange,
    onUpdateAppConfigField,
    onApkUploaded
}) => {
    const [isPurgingCache, setIsPurgingCache] = useState(false);
    const [cacheMessage, setCacheMessage] = useState<string | null>(null);

    const [isUploadingApk, setIsUploadingApk] = useState(false);
    const [apkProgress, setApkProgress] = useState<number | null>(null);
    const apkFileInputRef = useRef<HTMLInputElement>(null);

    const handleClearCache = async (type: 'all' | 'config' | 'storage') => {
        setIsPurgingCache(true);
        setCacheMessage(null);
        try {
            await new Promise((res) => setTimeout(res, 600));
            if (type === 'all' || type === 'config') {
                sessionStorage.clear();
            }
            setCacheMessage(`System ${type.toUpperCase()} cache successfully invalidated and cleared.`);
        } finally {
            setIsPurgingCache(false);
        }
    };

    const handleApkFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !file.name.endsWith('.apk')) {
            alert('Please select a valid .apk Android package file.');
            return;
        }

        setIsUploadingApk(true);
        setApkProgress(20);
        try {
            const sizeInMb = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
            setApkProgress(50);
            const uploadPath = `releases/RidersBUD-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
            const downloadUrl = await storageService.uploadFile(uploadPath, file, false);
            setApkProgress(100);
            await onApkUploaded(downloadUrl, sizeInMb);
        } catch (err: any) {
            alert('Upload failed: ' + (err.message || 'Unknown error'));
        } finally {
            setIsUploadingApk(false);
            setApkProgress(null);
            if (apkFileInputRef.current) apkFileInputRef.current.value = '';
        }
    };

    const appUpdate = settings.appUpdateConfig || {
        versionCode: 2,
        versionName: '1.0.1',
        apkUrl: DEFAULT_LATEST_APK_URL,
        releaseNotes: '• Auto updates added\n• High precision GPS fix\n• Improved driver dispatching',
        mandatory: false,
        fileSizeMb: '27.3 MB',
        showUpdateModal: true,
        targetAudience: 'all',
        externalDownloadUrl: '',
        allowRemindLater: true
    };

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Maintenance & Core Environment */}
            <div className="space-y-5 bg-[#121212]/70 border border-white/5 p-6 rounded-3xl">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                        <Activity size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-white tracking-tight">System Environment & Maintenance Mode</h3>
                        <p className="text-xs text-gray-500">Lock down customer operations for scheduled maintenance or upgrades.</p>
                    </div>
                </div>

                <div className="p-5 rounded-2xl bg-black/40 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                            <ShieldAlert size={16} className={settings.maintenanceMode ? 'text-rose-400' : 'text-emerald-400'} />
                            <span>Maintenance Mode</span>
                        </h4>
                        <p className="text-xs text-gray-400 mt-1 max-w-lg">
                            When enabled, mobile users will be shown a maintenance announcement dialog. Only administrators will have active access.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => onChange('maintenanceMode', !settings.maintenanceMode)}
                        className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition ${
                            settings.maintenanceMode
                                ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/20'
                                : 'bg-white/10 hover:bg-white/20 text-gray-300'
                        }`}
                    >
                        {settings.maintenanceMode ? 'Maintenance ACTIVE' : 'Normal Operation'}
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    <div className="space-y-1.5">
                        <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Deployment Environment</label>
                        <select
                            value={settings.environment || 'production'}
                            onChange={(e) => onChange('environment', e.target.value)}
                            className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none"
                        >
                            <option value="production">Production (Live)</option>
                            <option value="staging">Staging (Pre-Release)</option>
                            <option value="development">Development (Local)</option>
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">API Rate Limit (Req/Min)</label>
                        <input
                            type="number"
                            min={30}
                            max={600}
                            value={settings.apiRateLimitPerMinute ?? 120}
                            onChange={(e) => onChange('apiRateLimitPerMinute', parseInt(e.target.value) || 120)}
                            className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none font-mono"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Debug Mode Logging</label>
                        <div className="pt-2">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.debugMode ?? false}
                                    onChange={(e) => onChange('debugMode', e.target.checked)}
                                    className="w-4 h-4 rounded text-primary accent-primary"
                                />
                                <span className="text-xs text-gray-300 font-bold">Verbose Telemetry</span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            {/* Cache & Temporary Storage Management */}
            <div className="space-y-5 bg-[#121212]/70 border border-white/5 p-6 rounded-3xl">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                            <Trash2 size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white tracking-tight">Cache & Ephemeral Data Control</h3>
                            <p className="text-xs text-gray-500">Purge cached state, dynamic configurations, and stale session buffers.</p>
                        </div>
                    </div>
                </div>

                {cacheMessage && (
                    <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-2">
                        <CheckCircle2 size={16} />
                        <span>{cacheMessage}</span>
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                        type="button"
                        onClick={() => handleClearCache('config')}
                        disabled={isPurgingCache}
                        className="p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-amber-500/40 text-left transition"
                    >
                        <h5 className="text-xs font-bold text-white">Clear Config Cache</h5>
                        <p className="text-[10px] text-gray-400 mt-1">Force real-time reloading of all system settings from Firestore.</p>
                    </button>

                    <button
                        type="button"
                        onClick={() => handleClearCache('storage')}
                        disabled={isPurgingCache}
                        className="p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-amber-500/40 text-left transition"
                    >
                        <h5 className="text-xs font-bold text-white">Purge Session Buffers</h5>
                        <p className="text-[10px] text-gray-400 mt-1">Clear deduplication notification keys & transient states.</p>
                    </button>

                    <button
                        type="button"
                        onClick={() => handleClearCache('all')}
                        disabled={isPurgingCache}
                        className="p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-rose-500/40 text-left transition"
                    >
                        <h5 className="text-xs font-bold text-white">Flush All Caches</h5>
                        <p className="text-[10px] text-gray-400 mt-1">Perform a complete clean wipe of local and session cache.</p>
                    </button>
                </div>
            </div>

            {/* Android APK Live Updates & OTA */}
            <div className="space-y-5 bg-[#121212]/70 border border-white/5 p-6 rounded-3xl">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                        <Smartphone size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-white tracking-tight">Android App & APK Live Updates</h3>
                        <p className="text-xs text-gray-500">Publish over-the-air binary releases directly to all active mobile installations.</p>
                    </div>
                </div>

                {/* In-App Update Modal Policy & Visibility Controls */}
                <div className="p-5 rounded-2xl bg-black/40 border border-white/5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-white/5">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                    {appUpdate.showUpdateModal !== false ? (
                                        <Eye size={16} className="text-emerald-400" />
                                    ) : (
                                        <EyeOff size={16} className="text-amber-400" />
                                    )}
                                    <span>In-App APK Download Modal Visibility</span>
                                </h4>
                                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                                    appUpdate.showUpdateModal !== false && appUpdate.targetAudience !== 'none'
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                        : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                }`}>
                                    {appUpdate.showUpdateModal !== false && appUpdate.targetAudience !== 'none' ? 'MODAL ACTIVE' : 'MODAL HIDDEN'}
                                </span>
                            </div>
                            <p className="text-xs text-gray-400 max-w-xl">
                                Toggle whether mobile users see the in-app popup dialog to download the latest APK update, or suppress/hide it completely.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => onUpdateAppConfigField('showUpdateModal', appUpdate.showUpdateModal === false)}
                            className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition shrink-0 ${
                                appUpdate.showUpdateModal !== false
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                                    : 'bg-white/10 text-gray-400 border border-white/10 hover:bg-white/20'
                            }`}
                        >
                            {appUpdate.showUpdateModal !== false ? 'Modal Display: ENABLED' : 'Modal Display: HIDDEN'}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
                        {/* Target Audience */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase flex items-center gap-1.5">
                                <Users size={12} className="text-primary" />
                                <span>Who Can Download (Target Audience)</span>
                            </label>
                            <select
                                value={appUpdate.targetAudience || 'all'}
                                onChange={(e) => onUpdateAppConfigField('targetAudience', e.target.value)}
                                className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none"
                            >
                                <option value="all">Everyone (All Mobile Users)</option>
                                <option value="customers">Customers Only</option>
                                <option value="mechanics">Mechanics & Drivers Only</option>
                                <option value="none">Disabled / Hidden for All</option>
                            </select>
                            <p className="text-[10px] text-gray-500">Controls which user role gets prompted with the update dialog.</p>
                        </div>

                        {/* Allow Remind Later */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">User Dismissal Option</label>
                            <div className="pt-2">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={appUpdate.allowRemindLater !== false}
                                        onChange={(e) => onUpdateAppConfigField('allowRemindLater', e.target.checked)}
                                        className="w-4 h-4 rounded text-primary accent-primary"
                                    />
                                    <span className="text-xs text-gray-300 font-bold">Show "Remind Me Later" button</span>
                                </label>
                            </div>
                            <p className="text-[10px] text-gray-500 mt-1">If unchecked, users cannot close or dismiss the dialog.</p>
                        </div>

                        {/* Mandatory Flag */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Enforce Mandatory Update</label>
                            <div className="pt-2">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={appUpdate.mandatory}
                                        onChange={(e) => onUpdateAppConfigField('mandatory', e.target.checked)}
                                        className="w-4 h-4 rounded text-primary accent-primary"
                                    />
                                    <span className="text-xs text-gray-300 font-bold">Block older versions</span>
                                </label>
                            </div>
                            <p className="text-[10px] text-gray-500 mt-1">Hides close icon and forces immediate installation.</p>
                        </div>
                    </div>

                    {/* Where to download: Custom/Direct APK URL */}
                    <div className="space-y-1.5 pt-1 border-t border-white/5">
                        <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase flex items-center gap-1.5">
                            <Link2 size={12} className="text-primary" />
                            <span>Latest APK Download Destination URL ("Where to Download")</span>
                        </label>
                        <div className="relative">
                            <input
                                type="url"
                                value={appUpdate.apkUrl || ''}
                                onChange={(e) => onUpdateAppConfigField('apkUrl', e.target.value)}
                                placeholder="https://ridersbud-10806.web.app/releases/RidersBUD-latest.apk"
                                className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none font-mono pr-24"
                            />
                            <button
                                type="button"
                                onClick={() => onUpdateAppConfigField('apkUrl', DEFAULT_LATEST_APK_URL)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-[10px] font-bold text-gray-400 hover:text-white transition border border-white/5"
                            >
                                Default URL
                            </button>
                        </div>
                        <p className="text-[10px] text-gray-500">
                            Configure where the mobile application downloads the latest APK from (Firebase Storage, direct CDN, Google Drive, or Web server).
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Version Code (Numeric)</label>
                        <input
                            type="number"
                            min={1}
                            value={appUpdate.versionCode}
                            onChange={(e) => onUpdateAppConfigField('versionCode', parseInt(e.target.value) || 1)}
                            className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none font-mono"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Semantic Version Name</label>
                        <input
                            type="text"
                            value={appUpdate.versionName}
                            onChange={(e) => onUpdateAppConfigField('versionName', e.target.value)}
                            placeholder="1.0.2"
                            className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none font-mono"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">File Size Metric</label>
                        <input
                            type="text"
                            value={appUpdate.fileSizeMb || ''}
                            onChange={(e) => onUpdateAppConfigField('fileSizeMb', e.target.value)}
                            placeholder="27.3 MB"
                            className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none font-mono"
                        />
                    </div>
                </div>

                <div className="space-y-1.5 pt-2">
                    <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Release Notes (Displayed in Modal)</label>
                    <textarea
                        rows={3}
                        value={appUpdate.releaseNotes}
                        onChange={(e) => onUpdateAppConfigField('releaseNotes', e.target.value)}
                        placeholder="• Bullet points of new features and fixes..."
                        className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl p-4 text-xs text-gray-200 outline-none"
                    />
                </div>

                {/* Upload Binary Card */}
                <div className="p-5 rounded-2xl bg-black/40 border border-dashed border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
                            <Upload size={22} />
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-white">Upload New Android APK Package</h4>
                            <p className="text-[10px] text-gray-400 mt-0.5">
                                Current size: {appUpdate.fileSizeMb || '27.3 MB'} &bull; Uploading directly updates live devices.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <input
                            ref={apkFileInputRef}
                            type="file"
                            accept=".apk,application/vnd.android.package-archive"
                            onChange={handleApkFileChange}
                            className="hidden"
                            id="apk-upload-file-picker"
                            disabled={isUploadingApk}
                        />
                        <label
                            htmlFor="apk-upload-file-picker"
                            className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition ${
                                isUploadingApk
                                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                    : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30'
                            }`}
                        >
                            {isUploadingApk ? (
                                <>
                                    <RefreshCw size={13} className="animate-spin" />
                                    <span>Uploading ({apkProgress}%)...</span>
                                </>
                            ) : (
                                <>
                                    <Upload size={13} />
                                    <span>Select & Publish APK</span>
                                </>
                            )}
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
};
