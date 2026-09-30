import React from 'react';
import { Clock, Calendar, Wrench, ShieldAlert, CheckCircle2, Car, Navigation, DollarSign, UserX, UserCheck, Timer, AlertCircle } from 'lucide-react';
import { Settings, ModuleConfig } from '../../../../types';

interface OperationsSettingsTabProps {
    settings: Settings;
    onChange: (field: keyof Settings, value: any) => void;
    onToggleModule: (moduleId: string) => void;
    onModuleBannerChange: (moduleId: string, msg: string) => void;
}

export const OperationsSettingsTab: React.FC<OperationsSettingsTabProps> = ({
    settings,
    onChange,
    onToggleModule,
    onModuleBannerChange
}) => {
    const modules: ModuleConfig[] = settings.modules || [
        { id: 'rent-a-car', name: 'Rent a Car', enabled: true, bannerMessage: '' },
        { id: 'driver-for-hire', name: 'Driver for Hire', enabled: true, bannerMessage: '' },
        { id: 'liaison-assistance', name: 'Liaison Registration Assistance', enabled: true, bannerMessage: '' },
        { id: 'towing', name: 'Emergency Towing Service', enabled: true, bannerMessage: '' }
    ];

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Booking & Scheduling Rules */}
            <div className="space-y-5 bg-[#121212]/70 border border-white/5 p-6 rounded-3xl">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                        <Clock size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-white tracking-tight">Scheduling & Booking Rules</h3>
                        <p className="text-xs text-gray-500">Operating windows, service slot limits, and mechanic dispatch triggers.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Daily Service Start Time</label>
                        <input
                            type="time"
                            value={settings.bookingStartTime || '08:00'}
                            onChange={(e) => onChange('bookingStartTime', e.target.value)}
                            className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Daily Service End Time</label>
                        <input
                            type="time"
                            value={settings.bookingEndTime || '18:00'}
                            onChange={(e) => onChange('bookingEndTime', e.target.value)}
                            className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Slot Duration (Minutes)</label>
                        <input
                            type="number"
                            min={15}
                            step={15}
                            value={settings.bookingSlotDuration || 60}
                            onChange={(e) => onChange('bookingSlotDuration', parseInt(e.target.value) || 60)}
                            className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Max Concurrent Bookings/Slot</label>
                        <input
                            type="number"
                            min={1}
                            value={settings.maxBookingsPerSlot || 5}
                            onChange={(e) => onChange('maxBookingsPerSlot', parseInt(e.target.value) || 1)}
                            className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    <div className="space-y-1.5">
                        <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Advance Booking Notice (Hours)</label>
                        <input
                            type="number"
                            min={0}
                            value={settings.schedulingLeadTimeHours ?? 2}
                            onChange={(e) => onChange('schedulingLeadTimeHours', parseFloat(e.target.value) || 0)}
                            className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Max Dispatch Radius (KM)</label>
                        <input
                            type="number"
                            min={1}
                            value={settings.driverDispatchRadiusKm ?? 35}
                            onChange={(e) => onChange('driverDispatchRadiusKm', parseFloat(e.target.value) || 35)}
                            className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Auto-Assign Nearest Mechanic</label>
                        <div className="pt-2">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.autoAssignMechanics ?? true}
                                    onChange={(e) => onChange('autoAssignMechanics', e.target.checked)}
                                    className="w-4 h-4 rounded text-primary accent-primary"
                                />
                                <span className="text-xs text-gray-300 font-bold">Enabled (Proximity Matching)</span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mechanic Availability & Auto-Offline Rules */}
            <div className="space-y-5 bg-[#121212]/70 border border-white/5 p-6 rounded-3xl">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400">
                            <UserX size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-black text-white tracking-tight">Mechanic Auto-Offline on Inactivity</h3>
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-orange-500/20 text-orange-400 border border-orange-500/30">
                                    System Policy
                                </span>
                            </div>
                            <p className="text-xs text-gray-500">Automatically switch idle or unresponsive mechanics to Offline to prevent abandoned dispatch queues.</p>
                        </div>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                        <input
                            type="checkbox"
                            checked={settings.mechanicAutoOfflineEnabled ?? true}
                            onChange={(e) => onChange('mechanicAutoOfflineEnabled', e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                    <div className="space-y-2">
                        <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase flex items-center gap-1.5">
                            <Timer size={12} className="text-primary" /> Inactivity Timeout (Hours)
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                step="0.25"
                                min="0.25"
                                max="72"
                                disabled={!(settings.mechanicAutoOfflineEnabled ?? true)}
                                value={settings.mechanicInactivityThresholdHours ?? 1}
                                onChange={(e) => onChange('mechanicInactivityThresholdHours', parseFloat(e.target.value) || 1)}
                                className="w-full bg-black/50 border border-white/10 focus:border-primary disabled:opacity-40 rounded-2xl px-4 py-3 text-sm font-bold text-white outline-none"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-gray-500 uppercase">
                                Hour{(settings.mechanicInactivityThresholdHours ?? 1) === 1 ? '' : 's'}
                            </span>
                        </div>
                        <p className="text-[10px] text-gray-500 leading-relaxed">
                            Mechanics with no app interaction or active jobs for this duration are automatically set to <strong>Offline</strong>.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Quick Presets</label>
                        <div className="flex flex-wrap gap-2 pt-1">
                            {[
                                { label: '30 Mins (0.5h)', val: 0.5 },
                                { label: '1 Hour (Recommended)', val: 1 },
                                { label: '2 Hours', val: 2 },
                                { label: '4 Hours', val: 4 },
                                { label: '8 Hours', val: 8 },
                            ].map((preset) => {
                                const isSelected = (settings.mechanicInactivityThresholdHours ?? 1) === preset.val;
                                return (
                                    <button
                                        key={preset.val}
                                        type="button"
                                        disabled={!(settings.mechanicAutoOfflineEnabled ?? true)}
                                        onClick={() => onChange('mechanicInactivityThresholdHours', preset.val)}
                                        className={`px-3 py-2 rounded-xl text-xs font-extrabold transition-all border ${
                                            isSelected
                                                ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                                                : 'bg-black/40 text-gray-300 border-white/10 hover:border-white/20 hover:text-white'
                                        } disabled:opacity-40`}
                                    >
                                        {preset.label}
                                    </button>
                                );
                            })}
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                            <AlertCircle size={10} className="text-orange-400 inline" />
                            Default is 1 hour. Active ongoing jobs bypass auto-offline to protect ongoing work.
                        </p>
                    </div>
                </div>
            </div>

            {/* Cancellation & Penalty Policies */}
            <div className="space-y-5 bg-[#121212]/70 border border-white/5 p-6 rounded-3xl">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                        <ShieldAlert size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-white tracking-tight">Cancellation & Refund Terms</h3>
                        <p className="text-xs text-gray-500">Protect mechanics and service resources with structured cancellation rules.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                        <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Free Cancellation Window (Hours Before Slot)</label>
                        <input
                            type="number"
                            min={0}
                            value={settings.cancellationWindowHours ?? 4}
                            onChange={(e) => onChange('cancellationWindowHours', parseFloat(e.target.value) || 0)}
                            className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-sm text-white outline-none"
                        />
                        <p className="text-[10px] text-gray-500">Bookings cancelled within this window incur a cancellation fee.</p>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Late Cancellation Penalty (PHP)</label>
                        <input
                            type="number"
                            min={0}
                            value={settings.cancellationFee ?? 250}
                            onChange={(e) => onChange('cancellationFee', parseFloat(e.target.value) || 0)}
                            className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-sm text-white outline-none"
                        />
                        <p className="text-[10px] text-gray-500">Deducted automatically or added to customer's next invoice.</p>
                    </div>
                </div>
            </div>

            {/* Operational Modules Center */}
            <div className="space-y-5 bg-[#121212]/70 border border-white/5 p-6 rounded-3xl">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                        <Car size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-white tracking-tight">System Operational Modules</h3>
                        <p className="text-xs text-gray-500">Enable or disable entire service verticals with dynamic public notices.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {modules.map((mod) => (
                        <div
                            key={mod.id}
                            className={`p-5 rounded-2xl border transition-all ${
                                mod.enabled
                                    ? 'bg-black/50 border-emerald-500/30'
                                    : 'bg-black/20 border-white/5 opacity-70'
                            }`}
                        >
                            <div className="flex items-center justify-between gap-4 mb-3">
                                <div>
                                    <h4 className="text-sm font-bold text-white">{mod.name}</h4>
                                    <span className={`text-[10px] font-black uppercase tracking-wider ${mod.enabled ? 'text-emerald-400' : 'text-gray-500'}`}>
                                        {mod.enabled ? '● Active in Portal' : '○ Disabled'}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onToggleModule(mod.id)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                        mod.enabled ? 'bg-primary' : 'bg-gray-700'
                                    }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                            mod.enabled ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                    />
                                </button>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Announcement / Maintenance Note</label>
                                <input
                                    type="text"
                                    value={mod.bannerMessage || ''}
                                    onChange={(e) => onModuleBannerChange(mod.id, e.target.value)}
                                    placeholder="Optional banner message displayed to customers..."
                                    className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-300 outline-none focus:border-primary"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
