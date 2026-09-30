import React from 'react';
import { Layout, Palette, Sun, Moon, Monitor, Upload, Trash2, Image as ImageIcon, Sparkles } from 'lucide-react';
import { Settings } from '../../../../types';

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
    const brandColors = [
        { label: 'RidersBUD Orange', hex: '#FE7803' },
        { label: 'Flame Crimson', hex: '#E11D48' },
        { label: 'Electric Amber', hex: '#F59E0B' },
        { label: 'Emerald Speed', hex: '#10B981' },
        { label: 'Cyan Cyber', hex: '#06B6D4' }
    ];

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
                        <p className="text-xs text-gray-500">Fine-tune distinct logos per surface across Customer, Mechanic, and Admin portals.</p>
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
