import React, { useState, useEffect, useRef } from 'react';
import { 
    Globe, 
    Smartphone, 
    User, 
    Layout, 
    Upload, 
    Trash2, 
    Image as ImageIcon, 
    Facebook, 
    Twitter, 
    Instagram, 
    HelpCircle,
    MapPin,
    Crosshair,
    RotateCcw,
    Search,
    Compass,
    Navigation,
    Loader2,
    CheckCircle2,
    ExternalLink
} from 'lucide-react';
import { Settings } from '../../../../types';
import { RIDERSBUD_STORE_LOCATION, forwardGeocodeAddress, reverseGeocodeCoordinates } from '../../../../utils/locationHelper';
import { getLeafletTileConfig } from '../../../../utils/mapTileProviders';

declare const L: any;

interface GeneralSettingsTabProps {
    settings: Settings;
    onChange: (field: keyof Settings, value: any) => void;
    onSocialChange: (network: 'facebook' | 'twitter' | 'instagram', url: string) => void;
    onUploadAsset: (e: React.ChangeEvent<HTMLInputElement>, field: keyof Settings) => void;
    onRemoveAsset: (field: keyof Settings) => void;
    onLocateStorePosition?: () => void;
    onResetStoreToDefault?: () => void;
}

export const GeneralSettingsTab: React.FC<GeneralSettingsTabProps> = ({
    settings,
    onChange,
    onSocialChange,
    onUploadAsset,
    onRemoveAsset,
    onLocateStorePosition,
    onResetStoreToDefault
}) => {
    const [showMap, setShowMap] = useState(true);
    const [isSearchingAddress, setIsSearchingAddress] = useState(false);
    const [isLocatingGPS, setIsLocatingGPS] = useState(false);
    const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
    const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapInstanceRef = useRef<any>(null);
    const markerRef = useRef<any>(null);

    // Active coordinates (default to Carmona Hub if unset)
    const currentLat = typeof settings.storeLatitude === 'number' && !isNaN(settings.storeLatitude) 
        ? settings.storeLatitude 
        : RIDERSBUD_STORE_LOCATION.lat;
    const currentLng = typeof settings.storeLongitude === 'number' && !isNaN(settings.storeLongitude) 
        ? settings.storeLongitude 
        : RIDERSBUD_STORE_LOCATION.lng;

    // Initialize or update Leaflet map whenever showMap is toggled or coordinates change
    useEffect(() => {
        if (!showMap || !mapContainerRef.current) return;
        if (typeof L === 'undefined') return;

        // Custom RidersBUD orange pin icon
        const storeIcon = L.divIcon({
            className: 'rb-store-hq-pin',
            html: `
                <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
                    <div style="position: absolute; width: 36px; height: 36px; background: rgba(249, 115, 22, 0.25); border-radius: 50%; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                    <div style="width: 28px; height: 28px; background: #f97316; border: 2.5px solid #ffffff; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.5); z-index: 10;">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
                            <circle cx="12" cy="10" r="3"></circle>
                        </svg>
                    </div>
                </div>
            `,
            iconSize: [36, 36],
            iconAnchor: [18, 18],
            popupAnchor: [0, -18]
        });

        // Instantiate map if not already present
        if (!mapInstanceRef.current) {
            const map = L.map(mapContainerRef.current, {
                center: [currentLat, currentLng],
                zoom: settings.defaultMapZoom || 15,
                zoomControl: true,
                scrollWheelZoom: true
            });

            const tileConfig = getLeafletTileConfig(settings);
            L.tileLayer(tileConfig.url, tileConfig.options).addTo(map);

            const marker = L.marker([currentLat, currentLng], {
                draggable: true,
                icon: storeIcon
            }).addTo(map);

            marker.bindPopup(`
                <div style="color: #111; font-family: sans-serif; font-size: 12px;">
                    <strong style="color: #f97316;">🏬 ${settings.storeName || 'RidersBUD Store HQ'}</strong><br/>
                    <span style="color: #555;">Drag pin to update store coordinates</span>
                </div>
            `);

            // Pin drag event -> update coordinates & reverse geocode
            marker.on('dragend', async (e: any) => {
                const pos = e.target.getLatLng();
                const lat = parseFloat(pos.lat.toFixed(6));
                const lng = parseFloat(pos.lng.toFixed(6));
                handleCoordinatesUpdated(lat, lng, true);
            });

            // Map click event -> relocate pin & reverse geocode
            map.on('click', async (e: any) => {
                const lat = parseFloat(e.latlng.lat.toFixed(6));
                const lng = parseFloat(e.latlng.lng.toFixed(6));
                marker.setLatLng([lat, lng]);
                handleCoordinatesUpdated(lat, lng, true);
            });

            mapInstanceRef.current = map;
            markerRef.current = marker;
        } else {
            // Update map view and marker if coordinates changed externally
            const map = mapInstanceRef.current;
            const marker = markerRef.current;
            if (marker) {
                marker.setLatLng([currentLat, currentLng]);
            }
            map.setView([currentLat, currentLng], map.getZoom() || 15);
        }

        // Delay invalidateSize to ensure correct rendering inside tabs
        const timer = setTimeout(() => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.invalidateSize();
            }
        }, 150);

        return () => {
            clearTimeout(timer);
        };
    }, [showMap, currentLat, currentLng]);

    // Cleanup map on unmount
    useEffect(() => {
        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
                markerRef.current = null;
            }
        };
    }, []);

    // Helper: update coordinates and optionally reverse geocode the street address
    const handleCoordinatesUpdated = async (lat: number, lng: number, shouldReverseGeocode: boolean = true) => {
        onChange('storeLatitude', lat);
        onChange('storeLongitude', lng);

        if (shouldReverseGeocode) {
            setIsReverseGeocoding(true);
            try {
                const resolvedAddr = await reverseGeocodeCoordinates(lat, lng);
                if (resolvedAddr) {
                    onChange('address', resolvedAddr);
                    onChange('storeAddress', resolvedAddr);
                    setStatusFeedback(`Location set: ${resolvedAddr}`);
                    setTimeout(() => setStatusFeedback(null), 3000);
                }
            } catch (_) {
                setStatusFeedback(`Coordinates locked: (${lat}, ${lng})`);
                setTimeout(() => setStatusFeedback(null), 3000);
            } finally {
                setIsReverseGeocoding(false);
            }
        }
    };

    // Helper: Geocode typed address and reposition map pin
    const handleSearchAddressOnMap = async () => {
        const query = settings.address?.trim();
        if (!query) return;
        setIsSearchingAddress(true);
        setStatusFeedback('Searching location on map...');
        try {
            const result = await forwardGeocodeAddress(query);
            if (result) {
                onChange('storeLatitude', result.lat);
                onChange('storeLongitude', result.lng);
                onChange('storeAddress', query);
                if (mapInstanceRef.current) {
                    mapInstanceRef.current.setView([result.lat, result.lng], 16);
                    if (markerRef.current) {
                        markerRef.current.setLatLng([result.lat, result.lng]);
                        markerRef.current.openPopup();
                    }
                }
                setStatusFeedback(`Pinned to: ${result.displayName.slice(0, 45)}...`);
                setTimeout(() => setStatusFeedback(null), 3000);
            }
        } catch (_) {
            setStatusFeedback('Could not pin address. Please click on the map directly.');
            setTimeout(() => setStatusFeedback(null), 3000);
        } finally {
            setIsSearchingAddress(false);
        }
    };

    // Helper: Capture device live GPS
    const handleLocateDeviceGPS = () => {
        if (onLocateStorePosition) {
            onLocateStorePosition();
            return;
        }

        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser.');
            return;
        }

        setIsLocatingGPS(true);
        setStatusFeedback('Detecting device GPS coordinates...');
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const lat = parseFloat(pos.coords.latitude.toFixed(6));
                const lng = parseFloat(pos.coords.longitude.toFixed(6));
                setIsLocatingGPS(false);
                handleCoordinatesUpdated(lat, lng, true);
                if (mapInstanceRef.current) {
                    mapInstanceRef.current.setView([lat, lng], 16);
                    if (markerRef.current) {
                        markerRef.current.setLatLng([lat, lng]);
                    }
                }
            },
            (err) => {
                setIsLocatingGPS(false);
                alert('Could not acquire GPS: ' + (err.message || 'Permission denied'));
                setStatusFeedback(null);
            },
            { enableHighAccuracy: true, timeout: 8000 }
        );
    };

    // Helper: Reset directly to official Carmona Commercial Center HQ
    const handleResetToCarmona = () => {
        if (onResetStoreToDefault) {
            onResetStoreToDefault();
        } else {
            onChange('address', RIDERSBUD_STORE_LOCATION.address);
            onChange('storeAddress', RIDERSBUD_STORE_LOCATION.address);
            onChange('storeLatitude', RIDERSBUD_STORE_LOCATION.lat);
            onChange('storeLongitude', RIDERSBUD_STORE_LOCATION.lng);
            onChange('storeName', RIDERSBUD_STORE_LOCATION.name);
        }
        if (mapInstanceRef.current) {
            mapInstanceRef.current.setView([RIDERSBUD_STORE_LOCATION.lat, RIDERSBUD_STORE_LOCATION.lng], 15);
            if (markerRef.current) {
                markerRef.current.setLatLng([RIDERSBUD_STORE_LOCATION.lat, RIDERSBUD_STORE_LOCATION.lng]);
            }
        }
        setStatusFeedback('Reset to official Carmona Commercial Center HQ.');
        setTimeout(() => setStatusFeedback(null), 3000);
    };
    const renderUploadCard = (label: string, field: keyof Settings, description: string) => (
        <div className="space-y-2">
            <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase ml-1 block">{label}</label>
            <div className="p-3 bg-[#121212] border border-white/10 rounded-2xl flex items-center gap-4 hover:border-white/20 transition-all shadow-inner">
                <div className="w-16 h-16 bg-black/50 rounded-xl flex items-center justify-center overflow-hidden border border-white/5 relative flex-shrink-0">
                    {settings[field] ? (
                        <>
                            <img
                                src={settings[field] as string}
                                alt={label}
                                className="max-w-full max-h-full object-contain p-1.5"
                            />
                            <button
                                type="button"
                                onClick={() => onRemoveAsset(field)}
                                className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 flex items-center justify-center text-rose-400 transition-opacity"
                                title="Remove asset"
                            >
                                <Trash2 size={16} />
                            </button>
                        </>
                    ) : (
                        <ImageIcon className="text-gray-600" size={20} />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-gray-400 font-medium truncate mb-2">{description}</p>
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] tracking-wider font-bold text-white transition-all">
                        <Upload size={12} className="text-primary" />
                        <span>Upload Asset</span>
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => onUploadAsset(e, field)}
                        />
                    </label>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* App Identity */}
            <div className="space-y-5 bg-[#121212]/70 border border-white/5 p-6 rounded-3xl">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                        <Globe size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-white tracking-tight">App Identity & Branding</h3>
                        <p className="text-xs text-gray-500">Core identification parameters displayed to users and crawlers.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                        <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Application Name</label>
                        <input
                            type="text"
                            value={settings.appName || ''}
                            onChange={(e) => onChange('appName', e.target.value)}
                            placeholder="RidersBUD"
                            className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-sm text-white outline-none transition-all"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">App Tagline</label>
                        <input
                            type="text"
                            value={settings.appTagline || ''}
                            onChange={(e) => onChange('appTagline', e.target.value)}
                            placeholder="Trusted Car Care Wherever You Are"
                            className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-sm text-white outline-none transition-all"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                    {renderUploadCard('App Logo', 'appLogoUrl', 'Primary vector/raster branding logo across web and app.')}
                    {renderUploadCard('App Favicon', 'faviconUrl', 'Square icon displayed in browser tabs (32x32 or 64x64).')}
                </div>
            </div>

            {/* Default Profile Images */}
            <div className="space-y-5 bg-[#121212]/70 border border-white/5 p-6 rounded-3xl">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                        <User size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-white tracking-tight">Default Account Avatars</h3>
                        <p className="text-xs text-gray-500">Placeholder images assigned to unverified or new user profiles.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {renderUploadCard('Default Customer Avatar', 'defaultCustomerImageUrl', 'Assigned automatically when a client registers.')}
                    {renderUploadCard('Default Mechanic Avatar', 'defaultMechanicImageUrl', 'Assigned to service specialists until custom avatar upload.')}
                </div>
            </div>

            {/* Localization & Region */}
            <div className="space-y-5 bg-[#121212]/70 border border-white/5 p-6 rounded-3xl">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                        <Globe size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-white tracking-tight">Localization & Regional Defaults</h3>
                        <p className="text-xs text-gray-500">Default timezones, languages, and date formats used throughout the system.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Default Language</label>
                        <select
                            value={settings.defaultLanguage || 'en'}
                            onChange={(e) => onChange('defaultLanguage', e.target.value)}
                            className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none"
                        >
                            <option value="en">English (US / Global)</option>
                            <option value="tl">Filipino (Tagalog)</option>
                            <option value="es">Spanish</option>
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Time Zone</label>
                        <select
                            value={settings.timeZone || 'Asia/Manila'}
                            onChange={(e) => onChange('timeZone', e.target.value)}
                            className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none"
                        >
                            <option value="Asia/Manila">Asia/Manila (GMT+8)</option>
                            <option value="Asia/Singapore">Asia/Singapore (GMT+8)</option>
                            <option value="America/New_York">America/New_York (EST)</option>
                            <option value="UTC">UTC (Coordinated Universal Time)</option>
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Date Format</label>
                        <select
                            value={settings.dateFormat || 'MM/DD/YYYY'}
                            onChange={(e) => onChange('dateFormat', e.target.value)}
                            className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none"
                        >
                            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                            <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Time Format</label>
                        <select
                            value={settings.timeFormat || '12h'}
                            onChange={(e) => onChange('timeFormat', e.target.value)}
                            className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none"
                        >
                            <option value="12h">12-Hour (10:30 PM)</option>
                            <option value="24h">24-Hour (22:30)</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Contact & Support Channels */}
            <div className="space-y-5 bg-[#121212]/70 border border-white/5 p-6 rounded-3xl">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                        <Smartphone size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-white tracking-tight">Public Contacts & Social Presence</h3>
                        <p className="text-xs text-gray-500">Official business channels shown on customer receipts, emails, and footers.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                        <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Contact Email</label>
                        <input
                            type="email"
                            value={settings.contactEmail || ''}
                            onChange={(e) => onChange('contactEmail', e.target.value)}
                            placeholder="hello@ridersbud.com"
                            className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-sm text-white outline-none"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Contact Phone / Hotline</label>
                        <input
                            type="text"
                            value={settings.contactPhone || ''}
                            onChange={(e) => onChange('contactPhone', e.target.value)}
                            placeholder="+63 917 123 4567"
                            className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-sm text-white outline-none"
                        />
                    </div>
                    <div className="space-y-3 md:col-span-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase flex items-center gap-1.5">
                                <MapPin size={12} className="text-primary" /> HQ / Store Physical Address & Live Map Location
                            </label>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowMap(!showMap)}
                                    className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-[11px] font-bold text-gray-300 flex items-center gap-1 transition border border-white/5"
                                >
                                    <Compass size={12} className="text-primary" />
                                    <span>{showMap ? 'Hide Live Map' : 'Show Live Map'}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleLocateDeviceGPS}
                                    disabled={isLocatingGPS}
                                    className="px-2.5 py-1 rounded-xl bg-primary/20 hover:bg-primary/30 text-primary text-[11px] font-bold flex items-center gap-1 transition border border-primary/20 disabled:opacity-50"
                                >
                                    {isLocatingGPS ? <Loader2 size={12} className="animate-spin" /> : <Crosshair size={12} />}
                                    <span>{isLocatingGPS ? 'Detecting...' : 'Detect GPS'}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleResetToCarmona}
                                    className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-[11px] font-bold flex items-center gap-1 transition border border-white/5"
                                    title="Reset to official Carmona Commercial Center HQ"
                                >
                                    <RotateCcw size={12} />
                                    <span>Reset Carmona</span>
                                </button>
                            </div>
                        </div>

                        {/* Address Input with Search Action */}
                        <div className="relative">
                            <input
                                type="text"
                                value={settings.address || ''}
                                onChange={(e) => {
                                    onChange('address', e.target.value);
                                    onChange('storeAddress', e.target.value);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleSearchAddressOnMap();
                                    }
                                }}
                                placeholder="Carmona Commercial Center, Governor's Drive, Cavite, Philippines"
                                className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl pl-4 pr-24 py-3 text-sm text-white outline-none"
                            />
                            <button
                                type="button"
                                onClick={handleSearchAddressOnMap}
                                disabled={isSearchingAddress || !settings.address?.trim()}
                                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl bg-primary/20 hover:bg-primary/30 text-primary text-xs font-bold flex items-center gap-1 transition border border-primary/30 disabled:opacity-40"
                            >
                                {isSearchingAddress ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
                                <span>Find Pin</span>
                            </button>
                        </div>

                        {/* Status feedback banner if any */}
                        {statusFeedback && (
                            <div className="text-[11px] text-primary flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 rounded-xl border border-primary/20 animate-fadeIn">
                                <CheckCircle2 size={13} className="flex-shrink-0" />
                                <span>{statusFeedback}</span>
                            </div>
                        )}

                        {/* Interactive Realtime Live Map Display */}
                        {showMap && (
                            <div className="mt-3 space-y-2 rounded-2xl overflow-hidden border border-white/10 bg-[#0d0d0d] p-3 shadow-xl">
                                <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                        <span className="font-bold text-white tracking-wide">Live HQ GPS Anchor:</span>
                                        <span className="font-mono text-gray-400 bg-black/60 px-2 py-0.5 rounded-lg border border-white/5">
                                            {currentLat.toFixed(5)}, {currentLng.toFixed(5)}
                                        </span>
                                    </div>
                                    <div className="text-[11px] text-gray-500 flex items-center gap-1">
                                        {isReverseGeocoding ? (
                                            <span className="text-amber-400 flex items-center gap-1">
                                                <Loader2 size={11} className="animate-spin" /> Resolving street address...
                                            </span>
                                        ) : (
                                            <span>💡 Click map or drag marker to set exact physical store coordinates</span>
                                        )}
                                    </div>
                                </div>

                                <div 
                                    ref={mapContainerRef} 
                                    className="w-full h-64 rounded-xl overflow-hidden border border-white/5 relative z-0" 
                                    style={{ minHeight: '260px' }}
                                />

                                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-gray-400 px-1">
                                    <div className="flex items-center gap-1.5">
                                        <Navigation size={12} className="text-primary" />
                                        <span>Used for customer distance tracking, delivery ETA, & roadside dispatch hub</span>
                                    </div>
                                    <a
                                        href={`https://www.google.com/maps/search/?api=1&query=${currentLat},${currentLng}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-gray-400 hover:text-white flex items-center gap-1 underline underline-offset-2"
                                    >
                                        <span>View on Google Maps</span>
                                        <ExternalLink size={10} />
                                    </a>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3">
                    <div className="space-y-1.5">
                        <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase flex items-center gap-1.5">
                            <Facebook size={12} className="text-blue-400" /> Facebook Page
                        </label>
                        <input
                            type="url"
                            value={settings.socialLinks?.facebook || ''}
                            onChange={(e) => onSocialChange('facebook', e.target.value)}
                            placeholder="https://facebook.com/ridersbud"
                            className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-2.5 text-xs text-white outline-none"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase flex items-center gap-1.5">
                            <Twitter size={12} className="text-sky-400" /> Twitter (X)
                        </label>
                        <input
                            type="url"
                            value={settings.socialLinks?.twitter || ''}
                            onChange={(e) => onSocialChange('twitter', e.target.value)}
                            placeholder="https://twitter.com/ridersbud"
                            className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-2.5 text-xs text-white outline-none"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase flex items-center gap-1.5">
                            <Instagram size={12} className="text-pink-400" /> Instagram Profile
                        </label>
                        <input
                            type="url"
                            value={settings.socialLinks?.instagram || ''}
                            onChange={(e) => onSocialChange('instagram', e.target.value)}
                            placeholder="https://instagram.com/ridersbud"
                            className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-2.5 text-xs text-white outline-none"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
