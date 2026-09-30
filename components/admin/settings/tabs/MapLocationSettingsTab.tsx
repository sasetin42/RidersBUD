import React, { useState } from 'react';
import { MapPin, Navigation, Compass, Globe, Crosshair, CheckCircle2, AlertTriangle, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { Settings } from '../../../../types';
import { settingsService } from '../../../../services/settingsService';

interface MapLocationSettingsTabProps {
    settings: Settings;
    onChange: (field: keyof Settings, value: any) => void;
    onLocateStorePosition: () => void;
    onResetStoreToDefault: () => void;
}

export const MapLocationSettingsTab: React.FC<MapLocationSettingsTabProps> = ({
    settings,
    onChange,
    onLocateStorePosition,
    onResetStoreToDefault
}) => {
    const [showKey, setShowKey] = useState(false);
    const [isTestingKey, setIsTestingKey] = useState(false);
    const [keyResult, setKeyResult] = useState<{ success: boolean; message: string } | null>(null);

    const handleTestKey = async () => {
        setIsTestingKey(true);
        setKeyResult(null);
        try {
            const result = await settingsService.testGoogleMapsKey(settings.googleMapsApiKey);
            setKeyResult(result);
        } finally {
            setIsTestingKey(false);
        }
    };

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Google Maps & Navigation API */}
            <div className="space-y-6 bg-[#121212]/70 border border-white/5 p-6 rounded-3xl">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary">
                            <MapPin size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white tracking-tight">Map Providers & API Routing</h3>
                            <p className="text-xs text-gray-500">Configure Google Maps JavaScript & Directions API, or switch to Leaflet OSM dark tiles.</p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleTestKey}
                        disabled={isTestingKey || !settings.googleMapsApiKey}
                        className="px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white flex items-center gap-2 transition disabled:opacity-50"
                    >
                        {isTestingKey ? <RefreshCw size={14} className="animate-spin text-primary" /> : <Navigation size={14} className="text-primary" />}
                        <span>{isTestingKey ? 'Verifying...' : 'Validate Key'}</span>
                    </button>
                </div>

                {keyResult && (
                    <div className={`p-4 rounded-2xl border flex items-center gap-3 ${
                        keyResult.success
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    }`}>
                        {keyResult.success ? <CheckCircle2 size={18} className="text-emerald-400" /> : <AlertTriangle size={18} className="text-rose-400" />}
                        <span className="text-xs font-bold">{keyResult.message}</span>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                        <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Google Maps API Key</label>
                        <div className="relative">
                            <input
                                type={showKey ? 'text' : 'password'}
                                value={settings.googleMapsApiKey || ''}
                                onChange={(e) => onChange('googleMapsApiKey', e.target.value)}
                                placeholder="AIzaSy..."
                                className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white pr-10 outline-none font-mono"
                            />
                            <button
                                type="button"
                                onClick={() => setShowKey(!showKey)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                            >
                                {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Map Tile Provider (Leaflet Fallback)</label>
                        <select
                            value={settings.leafletTileProvider || 'osm-dark'}
                            onChange={(e) => onChange('leafletTileProvider', e.target.value)}
                            className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none"
                        >
                            <option value="osm-dark">OpenStreetMap Dark Mode (Recommended)</option>
                            <option value="osm">Standard OpenStreetMap</option>
                            <option value="esri-dark">ESRI Dark Gray Canvas</option>
                            <option value="esri-satellite">ESRI Satellite World Imagery</option>
                            <option value="esri-streets">ESRI World Street Map</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Central Store Hub Origin Pin */}
            <div className="space-y-5 bg-[#121212]/70 border border-white/5 p-6 rounded-3xl">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                            <Compass size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white tracking-tight">Parts & Tools Store Hub GPS Anchor</h3>
                            <p className="text-xs text-gray-500">Origin coordinates used by customers for tracking distance and calculating delivery ETAs.</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onLocateStorePosition}
                            className="px-3.5 py-2 rounded-xl bg-primary/20 hover:bg-primary/30 text-primary text-xs font-bold flex items-center gap-1.5 transition"
                        >
                            <Crosshair size={13} />
                            <span>Detect GPS</span>
                        </button>
                        <button
                            type="button"
                            onClick={onResetStoreToDefault}
                            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-xs font-bold transition"
                        >
                            Reset Carmona
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Store Name</label>
                        <input
                            type="text"
                            value={settings.storeName || ''}
                            onChange={(e) => onChange('storeName', e.target.value)}
                            placeholder="RidersBUD Central Commercial Hub"
                            className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Latitude</label>
                        <input
                            type="number"
                            step="0.000001"
                            value={settings.storeLatitude ?? 14.3168}
                            onChange={(e) => onChange('storeLatitude', parseFloat(e.target.value))}
                            className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none font-mono"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Longitude</label>
                        <input
                            type="number"
                            step="0.000001"
                            value={settings.storeLongitude ?? 121.0543}
                            onChange={(e) => onChange('storeLongitude', parseFloat(e.target.value))}
                            className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none font-mono"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Default Zoom Level</label>
                        <input
                            type="number"
                            min={5}
                            max={20}
                            value={settings.defaultMapZoom ?? 13}
                            onChange={(e) => onChange('defaultMapZoom', parseInt(e.target.value) || 13)}
                            className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none font-mono"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
