import React, { useState } from 'react';
import { Shield, Lock, Key, Users, AlertTriangle, CheckCircle2, LogOut, Smartphone, Eye } from 'lucide-react';
import { Settings } from '../../../../types';

interface SecuritySettingsTabProps {
    settings: Settings;
    onChange: (field: keyof Settings, value: any) => void;
    onForceLogoutAll: () => Promise<void>;
}

export const SecuritySettingsTab: React.FC<SecuritySettingsTabProps> = ({
    settings,
    onChange,
    onForceLogoutAll
}) => {
    const [isTerminating, setIsTerminating] = useState(false);
    const [statusNote, setStatusNote] = useState<string | null>(null);

    const handleTerminate = async () => {
        if (!window.confirm('Are you sure you want to terminate all active sessions across all devices? All administrators will be required to re-authenticate.')) {
            return;
        }

        setIsTerminating(true);
        setStatusNote(null);
        try {
            await onForceLogoutAll();
            setStatusNote('All active user and administrator sessions have been terminated.');
        } finally {
            setIsTerminating(false);
        }
    };

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Password Policy & Complexity */}
            <div className="space-y-5 bg-[#121212]/70 border border-white/5 p-6 rounded-3xl">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                        <Lock size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-white tracking-tight">Password Security & Complexity Policy</h3>
                        <p className="text-xs text-gray-500">Enforce enterprise credential standards for all administrative and mechanic accounts.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Minimum Password Length</label>
                        <input
                            type="number"
                            min={6}
                            max={32}
                            value={settings.passwordMinLength ?? 8}
                            onChange={(e) => onChange('passwordMinLength', parseInt(e.target.value) || 8)}
                            className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Max Failed Logins (Lockout)</label>
                        <input
                            type="number"
                            min={3}
                            max={10}
                            value={settings.accountLockoutAttempts ?? 5}
                            onChange={(e) => onChange('accountLockoutAttempts', parseInt(e.target.value) || 5)}
                            className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Lockout Duration (Minutes)</label>
                        <input
                            type="number"
                            min={5}
                            max={1440}
                            value={settings.accountLockoutMinutes ?? 15}
                            onChange={(e) => onChange('accountLockoutMinutes', parseInt(e.target.value) || 15)}
                            className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="p-4 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-between">
                        <div>
                            <h4 className="text-xs font-bold text-white">Require Special Characters & Numbers</h4>
                            <p className="text-[10px] text-gray-400">Requires at least one uppercase letter, number, and symbol.</p>
                        </div>
                        <input
                            type="checkbox"
                            checked={settings.passwordRequireSpecialChar ?? true}
                            onChange={(e) => onChange('passwordRequireSpecialChar', e.target.checked)}
                            className="w-4 h-4 rounded text-primary accent-primary cursor-pointer"
                        />
                    </div>

                    <div className="p-4 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-between">
                        <div>
                            <h4 className="text-xs font-bold text-white">Two-Factor Authentication (2FA)</h4>
                            <p className="text-[10px] text-gray-400">Enforce OTP verification upon admin dashboard access.</p>
                        </div>
                        <input
                            type="checkbox"
                            checked={settings.twoFactorAuthRequired ?? false}
                            onChange={(e) => onChange('twoFactorAuthRequired', e.target.checked)}
                            className="w-4 h-4 rounded text-primary accent-primary cursor-pointer"
                        />
                    </div>
                </div>
            </div>

            {/* Active Sessions & Global Revocation */}
            <div className="space-y-5 bg-[#121212]/70 border border-white/5 p-6 rounded-3xl">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                        <Users size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-white tracking-tight">Session Governance & Active Devices</h3>
                        <p className="text-xs text-gray-500">Monitor active administrator sessions and trigger instant credential revoking.</p>
                    </div>
                </div>

                {statusNote && (
                    <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-2">
                        <CheckCircle2 size={16} />
                        <span>{statusNote}</span>
                    </div>
                )}

                <div className="p-5 rounded-2xl bg-black/40 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h4 className="text-xs font-bold text-white flex items-center gap-2">
                            <LogOut size={15} className="text-rose-400" />
                            <span>Global Session Termination</span>
                        </h4>
                        <p className="text-[11px] text-gray-400 mt-1 max-w-lg">
                            Immediately invalidate all saved JWT and session tokens on mobile and desktop devices.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={handleTerminate}
                        disabled={isTerminating}
                        className="px-5 py-2.5 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-black uppercase tracking-wider transition disabled:opacity-50"
                    >
                        {isTerminating ? 'Revoking Sessions...' : 'Force Logout All Users'}
                    </button>
                </div>
            </div>
        </div>
    );
};
