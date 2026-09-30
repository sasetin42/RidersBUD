import React from 'react';
import { HardDrive, UploadCloud, Shield, CheckCircle2, Sliders } from 'lucide-react';
import { Settings } from '../../../../types';

interface FilesMediaSettingsTabProps {
    settings: Settings;
    onChange: (field: keyof Settings, value: any) => void;
}

export const FilesMediaSettingsTab: React.FC<FilesMediaSettingsTabProps> = ({
    settings,
    onChange
}) => {
    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Storage Limits & Optimization */}
            <div className="space-y-5 bg-[#121212]/70 border border-white/5 p-6 rounded-3xl">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                        <HardDrive size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-white tracking-tight">Media Upload & Storage Optimization</h3>
                        <p className="text-xs text-gray-500">Govern asset size limits, automatic WebP compression, and bucket storage.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Maximum Upload File Size (MB)</label>
                        <input
                            type="number"
                            min={1}
                            max={50}
                            value={settings.maxUploadSizeMb ?? 10}
                            onChange={(e) => onChange('maxUploadSizeMb', parseInt(e.target.value) || 10)}
                            className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">CDN Custom Base URL</label>
                        <input
                            type="url"
                            value={settings.cdnBaseUrl || ''}
                            onChange={(e) => onChange('cdnBaseUrl', e.target.value)}
                            placeholder="https://cdn.ridersbud.com"
                            className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="p-4 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-between">
                        <div>
                            <h4 className="text-xs font-bold text-white">Automated Client-Side Image Compression</h4>
                            <p className="text-[10px] text-gray-400">Pre-compresses photos before uploading to save mobile user data.</p>
                        </div>
                        <input
                            type="checkbox"
                            checked={settings.enableImageCompression ?? true}
                            onChange={(e) => onChange('enableImageCompression', e.target.checked)}
                            className="w-4 h-4 rounded text-primary accent-primary cursor-pointer"
                        />
                    </div>

                    <div className="p-4 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-between">
                        <div>
                            <h4 className="text-xs font-bold text-white">Next-Gen WebP Conversion</h4>
                            <p className="text-[10px] text-gray-400">Convert standard PNG and JPEG uploads into efficient WebP assets.</p>
                        </div>
                        <input
                            type="checkbox"
                            checked={settings.enableWebpConversion ?? true}
                            onChange={(e) => onChange('enableWebpConversion', e.target.checked)}
                            className="w-4 h-4 rounded text-primary accent-primary cursor-pointer"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
