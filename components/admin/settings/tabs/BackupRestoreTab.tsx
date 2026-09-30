import React, { useState, useRef } from 'react';
import { HardDrive, Download, UploadCloud, RefreshCw, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Settings, BackupRecord } from '../../../../types';
import { settingsService } from '../../../../services/settingsService';

interface BackupRestoreTabProps {
    settings: Settings;
    onChange: (field: keyof Settings, value: any) => void;
    adminEmail: string;
    onSettingsRestored: (newSettings: Partial<Settings>) => Promise<void>;
}

export const BackupRestoreTab: React.FC<BackupRestoreTabProps> = ({
    settings,
    onChange,
    adminEmail,
    onSettingsRestored
}) => {
    const [backups, setBackups] = useState<BackupRecord[]>(() => settingsService.getBackupRecords());
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleCreateBackup = async () => {
        setIsBackingUp(true);
        setFeedback(null);
        try {
            const record = await settingsService.generateFullBackup(settings, adminEmail);
            setBackups(settingsService.getBackupRecords());
            setFeedback({
                success: true,
                message: `Full system backup generated and downloaded: ${record.fileName} (${record.sizeFormatted})`
            });
        } catch (err: any) {
            setFeedback({
                success: false,
                message: err.message || 'Failed to generate backup.'
            });
        } finally {
            setIsBackingUp(false);
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!window.confirm(`Are you sure you want to restore settings from "${file.name}"? Existing configuration fields will be overwritten.`)) {
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        setIsRestoring(true);
        setFeedback(null);
        try {
            const restored = await settingsService.restoreFromBackupFile(file, adminEmail);
            await onSettingsRestored(restored);
            setFeedback({
                success: true,
                message: `Settings restored successfully from ${file.name}.`
            });
        } catch (err: any) {
            setFeedback({
                success: false,
                message: 'Restore failed: ' + (err.message || 'Invalid backup structure')
            });
        } finally {
            setIsRestoring(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Backup Generator & Schedule */}
            <div className="space-y-5 bg-[#121212]/70 border border-white/5 p-6 rounded-3xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary">
                            <HardDrive size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white tracking-tight">Database & Configuration Backup</h3>
                            <p className="text-xs text-gray-500">Create verified full JSON snapshots of system parameters, services, and accounts.</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleCreateBackup}
                            disabled={isBackingUp}
                            className="px-4 py-2.5 rounded-2xl bg-primary hover:bg-orange-600 text-white text-xs font-bold flex items-center gap-2 transition shadow-lg shadow-primary/20 disabled:opacity-50"
                        >
                            {isBackingUp ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                            <span>{isBackingUp ? 'Generating Snapshot...' : 'Create Full Backup'}</span>
                        </button>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json,application/json"
                            onChange={handleFileSelect}
                            className="hidden"
                            id="restore-file-input"
                            disabled={isRestoring}
                        />
                        <label
                            htmlFor="restore-file-input"
                            className={`px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold flex items-center gap-2 cursor-pointer transition ${
                                isRestoring ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                        >
                            {isRestoring ? <RefreshCw size={14} className="animate-spin text-amber-400" /> : <UploadCloud size={14} className="text-amber-400" />}
                            <span>{isRestoring ? 'Restoring...' : 'Restore from JSON'}</span>
                        </label>
                    </div>
                </div>

                {feedback && (
                    <div className={`p-4 rounded-2xl border flex items-center gap-3 ${
                        feedback.success
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    }`}>
                        {feedback.success ? <CheckCircle2 size={18} className="text-emerald-400" /> : <AlertTriangle size={18} className="text-rose-400" />}
                        <span className="text-xs font-bold">{feedback.message}</span>
                    </div>
                )}

                {/* Automated Schedule */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    <div className="space-y-1.5">
                        <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Automatic Snapshot Schedule</label>
                        <select
                            value={settings.autoBackupSchedule || 'daily'}
                            onChange={(e) => onChange('autoBackupSchedule', e.target.value)}
                            className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none"
                        >
                            <option value="daily">Daily Midnight Snapshot</option>
                            <option value="weekly">Weekly Every Sunday</option>
                            <option value="monthly">Monthly 1st of Month</option>
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Retention Window (Days)</label>
                        <input
                            type="number"
                            min={7}
                            max={365}
                            value={settings.backupRetentionDays ?? 30}
                            onChange={(e) => onChange('backupRetentionDays', parseInt(e.target.value) || 30)}
                            className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Enable Background Cron</label>
                        <div className="pt-2">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.autoBackupEnabled ?? true}
                                    onChange={(e) => onChange('autoBackupEnabled', e.target.checked)}
                                    className="w-4 h-4 rounded text-primary accent-primary"
                                />
                                <span className="text-xs text-gray-300 font-bold">Enabled</span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            {/* Past Backup Snapshots */}
            <div className="space-y-4 bg-[#121212]/70 border border-white/5 p-6 rounded-3xl">
                <h4 className="text-sm font-black text-white tracking-tight">Recent Backup Snapshots</h4>
                <div className="space-y-2">
                    {backups.map((b) => (
                        <div
                            key={b.id}
                            className="p-3.5 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-between gap-4"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="p-2 rounded-xl bg-white/5 text-primary">
                                    <HardDrive size={16} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-white truncate">{b.fileName}</p>
                                    <p className="text-[10px] text-gray-400">
                                        {b.sizeFormatted} &bull; Created by {b.createdBy} &bull; {new Date(b.createdAt).toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                {b.status}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
