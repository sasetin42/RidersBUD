import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useDatabase } from '../../context/DatabaseContext';
import CustomerHeader from '../../components/CustomerHeader';
import { ChevronLeft, ChevronRight, Calendar, MapPin, Clock, Car, Phone, Info, Check, CheckCircle, CheckCircle2, User, FileText, AlertCircle, Award, Navigation, Loader2, Radio, Receipt, ShieldCheck, Sparkles, CreditCard } from 'lucide-react';
import Spinner from '../../components/Spinner';
import { safeGetCurrentPosition, getAccurateLivePosition, startPreciseWatch, safeClearWatch, reverseGeocodeCoordinates } from '../../utils/locationHelper';
import { getLeafletTileConfig } from '../../utils/mapTileProviders';
import { HitPayService, getLiveAppOrigin } from '../../services/HitPayService';
import { HitPayEmbeddedService } from '../../services/HitPayEmbeddedService';
import { startPaymentWatcher, openPaymentUrl, setPendingPaymentMarker } from '../../utils/paymentRedirect';
import GCashPaymentModal from '../../components/GCashPaymentModal';

declare const L: any;

interface FormState {
    pickupLocation: string;
    destination: string;
    purposeOfHire: string;
    customPurpose: string;
    date: string;
    time: string;
    duration: string;
    vehicleType: string;
    driveCustomerCar: boolean;
    vehicleBrand: string;
    vehicleModel: string;
    plateNumber: string;
    contactNumber: string;
    specialInstructions: string;
    selectedDriverId?: string;
    selectedDriverName?: string;
}

const DriverLocationModal: React.FC<{
    targetType: 'pickup' | 'destination';
    initialCoords?: [number, number] | null;
    initialAddress?: string;
    onClose: () => void;
    onConfirmLocation: (loc: { lat: number; lng: number; address: string }) => void;
    accentColor: string;
    mapLogoUrl?: string;
    appLogoUrl?: string;
    settings?: any;
}> = ({ targetType, initialCoords, initialAddress, onClose, onConfirmLocation, accentColor, mapLogoUrl, appLogoUrl, settings }) => {
    const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
        initialCoords ? { lat: initialCoords[0], lng: initialCoords[1] } : null
    );
    const [address, setAddress] = useState<string>(initialAddress || '');
    const [isAddressLoading, setIsAddressLoading] = useState<boolean>(false);
    const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
    const [isTrackingLive, setIsTrackingLive] = useState<boolean>(!initialCoords);
    const [locationStatus, setLocationStatus] = useState<'idle' | 'fetching' | 'success' | 'error'>(initialCoords ? 'success' : 'fetching');
    const [locationError, setLocationError] = useState<string>('');

    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const markerRef = useRef<any>(null);
    const watchIdRef = useRef<number | null>(null);
    const geocodeTimeoutRef = useRef<any>(null);

    const [leafletLoaded, setLeafletLoaded] = useState(typeof window !== 'undefined' && !!(window as any).L);

    useEffect(() => {
        if (leafletLoaded) return;
        const interval = setInterval(() => {
            if ((window as any).L) {
                setLeafletLoaded(true);
                clearInterval(interval);
            }
        }, 100);
        return () => clearInterval(interval);
    }, [leafletLoaded]);

    const fetchAddress = useCallback((lat: number, lng: number) => {
        if (geocodeTimeoutRef.current) clearTimeout(geocodeTimeoutRef.current);
        setIsAddressLoading(true);
        geocodeTimeoutRef.current = setTimeout(async () => {
            try {
                const addr = await reverseGeocodeCoordinates(lat, lng);
                if (addr) {
                    setAddress(addr);
                } else {
                    setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
                }
            } catch (e) {
                setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
            } finally {
                setIsAddressLoading(false);
            }
        }, 300);
    }, []);

    // Initial Live Location Acquisition if coords not preset
    useEffect(() => {
        let isMounted = true;

        if (initialCoords) {
            setCoords({ lat: initialCoords[0], lng: initialCoords[1] });
            setLocationStatus('success');
            if (!initialAddress) fetchAddress(initialCoords[0], initialCoords[1]);
            return;
        }

        setLocationStatus('fetching');

        getAccurateLivePosition(
            (accurate) => {
                if (!isMounted) return;
                const newPos = { lat: accurate.latitude, lng: accurate.longitude };
                setCoords(newPos);
                setLocationAccuracy(accurate.accuracy);
                setLocationStatus('success');
                setLocationError('');
                fetchAddress(accurate.latitude, accurate.longitude);
            },
            { timeoutMs: 9000, targetAccuracy: 12 }
        ).catch((err) => {
            console.warn("[DriverLocationModal] GPS fallback to default:", err);
            if (!isMounted) return;
            const fallback = { lat: 14.5995, lng: 120.9842 };
            setCoords(fallback);
            setLocationStatus('success');
            setLocationError('');
            fetchAddress(fallback.lat, fallback.lng);
        });

        // Live Watch Position stream (unified precise stream: native GPS first, degraded readings filtered)
        startPreciseWatch(
            (fix) => {
                if (!isMounted) return;
                const { lat: latitude, lng: longitude, accuracy } = fix;
                setLocationAccuracy(prev => (prev !== null && accuracy > prev * 2.0 && accuracy > 35 ? prev : accuracy));
                setCoords(prev => {
                    if (prev !== null) {
                        const dLat = (latitude - prev.lat) * 111320;
                        const dLng = (longitude - prev.lng) * (111320 * Math.cos(prev.lat * (Math.PI / 180)));
                        const distanceMoved = Math.sqrt(dLat * dLat + dLng * dLng);
                        if (distanceMoved < 1.0) return prev;
                    }
                    if (isTrackingLive || prev === null) {
                        fetchAddress(latitude, longitude);
                        return { lat: latitude, lng: longitude };
                    }
                    return prev;
                });
                setLocationStatus('success');
            },
            () => {},
            { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
        ).then(watchId => {
            if (isMounted) watchIdRef.current = watchId;
            else safeClearWatch(watchId);
        });

        return () => {
            isMounted = false;
            if (watchIdRef.current !== null) {
                safeClearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }
            if (geocodeTimeoutRef.current) clearTimeout(geocodeTimeoutRef.current);
        };
    }, [fetchAddress, isTrackingLive, initialCoords, initialAddress]);

    // Initialize Leaflet Map
    useEffect(() => {
        if (!coords || !mapRef.current || mapInstanceRef.current || typeof L === 'undefined') return;

        const map = L.map(mapRef.current, {
            zoomControl: false,
            preferCanvas: false,
            scrollWheelZoom: true,
            doubleClickZoom: true,
            touchZoom: true,
            dragging: true
        }).setView([coords.lat, coords.lng], 18);

        const tileConfig = getLeafletTileConfig(settings);
        L.tileLayer(tileConfig.url, tileConfig.options).addTo(map);

        const isPickup = targetType === 'pickup';
        const pinColor = isPickup ? '#10B981' : '#EF4444';

        const locationIcon = L.divIcon({
            html: `<div class="rb-location-pin-wrapper">
                <div class="rb-location-circle" style="border: 3px solid ${pinColor};">
                    <img src="${mapLogoUrl || appLogoUrl || '/favicon.png'}" alt="Location" onerror="this.style.display='none'" style="width:28px;height:28px;object-fit:contain;border-radius:50%;" />
                </div>
                <div class="rb-location-stem" style="background: ${pinColor};"></div>
                <div class="rb-location-dot" style="background: ${pinColor};"></div>
            </div>`,
            className: 'rb-leaflet-icon',
            iconSize: [56, 72],
            iconAnchor: [28, 72],
        });

        const marker = L.marker([coords.lat, coords.lng], {
            icon: locationIcon,
            draggable: true,
            autoPan: true,
            autoPanSpeed: 10,
        }).addTo(map);

        marker.on('drag', (e: any) => {
            const { lat, lng } = e.target.getLatLng();
            setCoords({ lat, lng });
            setIsTrackingLive(false);
        });

        marker.on('dragend', (e: any) => {
            const { lat, lng } = e.target.getLatLng();
            setCoords({ lat, lng });
            setIsTrackingLive(false);
            fetchAddress(lat, lng);
        });

        map.on('click', (e: any) => {
            const { lat, lng } = e.latlng;
            setCoords({ lat, lng });
            setIsTrackingLive(false);
            if (markerRef.current) {
                markerRef.current.setLatLng([lat, lng]);
            }
            fetchAddress(lat, lng);
        });

        mapInstanceRef.current = map;
        markerRef.current = marker;

        const inv = () => { if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize(true); };
        inv();
        setTimeout(inv, 100);
        setTimeout(inv, 400);
        setTimeout(inv, 1000);

        return () => {
            if (mapInstanceRef.current) {
                try {
                    mapInstanceRef.current.remove();
                } catch (e) {
                    console.warn('Map cleanup error:', e);
                }
                mapInstanceRef.current = null;
                markerRef.current = null;
            }
        };
    }, [coords !== null, leafletLoaded, settings, fetchAddress, targetType, mapLogoUrl, appLogoUrl]); // eslint-disable-line

    // Follow GPS when live tracking is active
    useEffect(() => {
        if (mapInstanceRef.current && coords) {
            if (markerRef.current) {
                markerRef.current.setLatLng([coords.lat, coords.lng]);
            }
            if (isTrackingLive) {
                mapInstanceRef.current.panTo([coords.lat, coords.lng], {
                    animate: true,
                    duration: 0.6,
                    easeLinearity: 0.25
                });
            }
        }
    }, [coords, isTrackingLive]);

    const handleRecenter = () => {
        setIsTrackingLive(true);
        getAccurateLivePosition(
            (accurate) => {
                const newPos = { lat: accurate.latitude, lng: accurate.longitude };
                setCoords(newPos);
                setLocationAccuracy(accurate.accuracy);
                if (mapInstanceRef.current) {
                    mapInstanceRef.current.setView([accurate.latitude, accurate.longitude], 18, { animate: true, duration: 0.6 });
                }
                if (markerRef.current) {
                    markerRef.current.setLatLng([accurate.latitude, accurate.longitude]);
                }
                fetchAddress(accurate.latitude, accurate.longitude);
            },
            { timeoutMs: 6000, targetAccuracy: 10 }
        ).catch(() => {});
    };

    const isPickup = targetType === 'pickup';

    return (
        <div className="fixed inset-0 z-[9990] bg-[#121215] overflow-hidden animate-fadeIn">
            {/* Full-bleed Map Canvas covering whole page */}
            <div ref={mapRef} className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }} />

            {/* Top Header Overlay */}
            <div className="absolute top-0 left-0 right-0 p-4 pb-8 z-[500] bg-gradient-to-b from-black/95 via-black/80 to-transparent flex items-center justify-between gap-3 pointer-events-none">
                <div className="flex items-center gap-3 pointer-events-auto">
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2.5 bg-[#1E1E1E]/90 hover:bg-[#2A2A2E] rounded-full transition-all text-white border border-white/10 shadow-xl active:scale-95 flex items-center justify-center"
                        title="Back"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div className="flex flex-col">
                        <h3 className="text-base sm:text-lg font-black text-white leading-tight drop-shadow-md flex items-center gap-2">
                            <span>{isPickup ? 'Confirm Pick-Up Location' : 'Confirm Drop-Off Destination'}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${isPickup ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
                                {isPickup ? 'Pick-Up' : 'Destination'}
                            </span>
                        </h3>
                        <p className="text-[10px] text-gray-300 font-bold tracking-wide leading-none mt-1 drop-shadow-md">
                            {isPickup ? 'Driver will report and meet you at this exact pin.' : 'Drop-off endpoint for navigation and route estimate.'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Loading state */}
            {locationStatus === 'fetching' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#121215]/90 backdrop-blur-sm z-[300]">
                    <div className="relative">
                        <div className="absolute inset-0 rounded-full animate-ping opacity-25" style={{ backgroundColor: accentColor }} />
                        <Spinner size="lg" />
                    </div>
                    <p className="mt-6 text-white font-bold tracking-widest text-xs animate-pulse">
                        Acquiring precise GPS location...
                    </p>
                </div>
            )}

            {/* Error overlay */}
            {locationStatus === 'error' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#121215]/95 backdrop-blur-md z-[300] p-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
                        <MapPin className="w-8 h-8 text-red-400" />
                    </div>
                    <p className="text-white font-bold mb-2">Location Detection Error</p>
                    <p className="text-gray-400 text-xs mb-6 max-w-xs">{locationError || 'Unable to retrieve location.'}</p>
                    <button
                        type="button"
                        onClick={handleRecenter}
                        className="bg-white/10 hover:bg-white/20 text-white font-bold py-2.5 px-6 rounded-xl text-xs transition-all border border-white/10"
                    >
                        Try Again
                    </button>
                </div>
            )}

            {/* Map Interactive Overlays */}
            {locationStatus === 'success' && (
                <>
                    {/* GPS Accuracy Pill */}
                    {locationAccuracy !== null && (
                        <div className="absolute top-24 left-4 z-[400] bg-[#1a1a1ae0] backdrop-blur-md px-3 py-2 rounded-xl border border-white/10 flex items-center gap-2.5 shadow-2xl transition-all duration-300 animate-slideDown">
                            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                                !isTrackingLive 
                                    ? 'bg-amber-500' 
                                    : locationAccuracy <= 25 
                                    ? 'bg-emerald-500 animate-pulse shadow-md shadow-emerald-500/50' 
                                    : 'bg-yellow-400 animate-ping'
                            }`} />
                            <div className="flex flex-col">
                                <span className="text-[10px] text-white font-extrabold tracking-wider leading-none">
                                    {!isTrackingLive 
                                        ? 'MANUAL PIN PLACEMENT' 
                                        : locationAccuracy <= 25 
                                        ? 'LIVE GPS ACTIVE' 
                                        : 'REFINING GPS ACCURACY...'}
                                </span>
                                <span className="text-[8px] text-gray-400 font-bold mt-1 leading-none">
                                    {isTrackingLive 
                                        ? (locationAccuracy <= 25 
                                            ? `Accurate to ±${Math.round(locationAccuracy)}m (Pinpoint)` 
                                            : `Satellite calibrating: ±${Math.round(locationAccuracy)}m`)
                                        : 'Tap recenter to resume GPS'}
                                </span>
                            </div>
                            {!isTrackingLive && (
                                <button
                                    type="button"
                                    onClick={handleRecenter}
                                    style={{ borderColor: accentColor, color: accentColor }}
                                    className="border hover:bg-primary hover:text-white text-[8px] font-black px-2 py-1 rounded-md ml-0.5 transition-all uppercase tracking-wide"
                                >
                                    Resume
                                </button>
                            )}
                        </div>
                    )}

                    {/* Zoom + Recenter Controls */}
                    <div className="absolute top-1/2 -translate-y-1/2 right-4 z-[400] flex flex-col gap-2.5">
                        {/* Zoom In */}
                        <button
                            type="button"
                            onClick={() => { if (mapInstanceRef.current) mapInstanceRef.current.zoomIn(); }}
                            className="w-11 h-11 flex items-center justify-center backdrop-blur-md border border-white/20 bg-[#1E1E1E]/90 text-white rounded-full shadow-xl transition-all duration-200 hover:bg-white/20 hover:border-white/40 active:scale-90"
                            title="Zoom In"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                        </button>

                        {/* Zoom Out */}
                        <button
                            type="button"
                            onClick={() => { if (mapInstanceRef.current) mapInstanceRef.current.zoomOut(); }}
                            className="w-11 h-11 flex items-center justify-center backdrop-blur-md border border-white/20 bg-[#1E1E1E]/90 text-white rounded-full shadow-xl transition-all duration-200 hover:bg-white/20 hover:border-white/40 active:scale-90"
                            title="Zoom Out"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                        </button>

                        {/* Recenter / GPS button */}
                        <button
                            type="button"
                            onClick={handleRecenter}
                            style={{ backgroundColor: accentColor }}
                            className={`w-11 h-11 flex items-center justify-center rounded-full shadow-2xl transition-all duration-300 active:scale-90 relative overflow-hidden ${
                                isTrackingLive
                                    ? 'border-2 border-white/30 shadow-[0_0_24px_rgba(254,120,3,0.5)]'
                                    : 'border-2 border-white/20 hover:brightness-110'
                            }`}
                            title="Recenter on my location"
                        >
                            {isTrackingLive && (
                                <span className="absolute inset-0 rounded-full border-2 border-white/40 animate-ping opacity-60" />
                            )}
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="3" fill="white" fillOpacity="0.3" />
                                <line x1="12" y1="2" x2="12" y2="6" />
                                <line x1="12" y1="18" x2="12" y2="22" />
                                <line x1="2" y1="12" x2="6" y2="12" />
                                <line x1="18" y1="12" x2="22" y2="12" />
                                <circle cx="12" cy="12" r="6" />
                            </svg>
                        </button>
                    </div>

                    {/* Drag-pin hint pill positioned above bottom floating card */}
                    <div className="absolute bottom-48 sm:bottom-44 left-1/2 -translate-x-1/2 z-[400] pointer-events-none">
                        <div className="bg-black/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/15 flex items-center gap-2 shadow-2xl">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-bounce flex-shrink-0">
                                <path d="M12 2a2 2 0 0 1 2 2v6.5l1.5-.9A2 2 0 0 1 18 11.5v1a7 7 0 0 1-14 0v-2a2 2 0 0 1 3-1.8V4a2 2 0 0 1 2-2z" />
                            </svg>
                            <span className="text-[9px] font-black text-white tracking-widest whitespace-nowrap">
                                DRAG PIN OR TAP MAP TO MOVE
                            </span>
                        </div>
                    </div>
                </>
            )}

            {/* Bottom Floating Confirmation Card & Action (Over Map) */}
            <div className="absolute bottom-0 left-0 right-0 p-4 pt-10 bg-gradient-to-t from-black via-black/80 to-transparent z-[500] pointer-events-none pb-[calc(1rem+env(safe-area-inset-bottom))]">
                <div className="max-w-md mx-auto w-full space-y-2.5 pointer-events-auto">
                    {/* Geocoded Address Box */}
                    <div className="bg-[#18181C]/90 backdrop-blur-md border border-white/15 rounded-2xl p-3.5 flex items-start gap-2.5 shadow-2xl">
                        <div 
                            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 shadow-md" 
                            style={{ backgroundColor: isPickup ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', color: isPickup ? '#10B981' : '#EF4444' }}
                        >
                            <MapPin size={15} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <span className="text-[10px] font-black text-light-gray/60 uppercase tracking-wider block">
                                {isPickup ? 'Confirmed Pick-Up Location' : 'Confirmed Drop-Off Location'}
                            </span>
                            <p className="text-xs font-semibold text-white truncate mt-0.5">
                                {isAddressLoading 
                                    ? 'Resolving street address...' 
                                    : (address || (coords ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : 'Determining position...'))}
                            </p>
                        </div>
                    </div>

                    {/* Prominent Confirm Location Button */}
                    <button
                        type="button"
                        onClick={() => {
                            if (coords) {
                                onConfirmLocation({
                                    lat: coords.lat,
                                    lng: coords.lng,
                                    address: address || `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
                                });
                            }
                        }}
                        disabled={locationStatus !== 'success' || !coords}
                        style={{ backgroundColor: locationStatus === 'success' && coords ? accentColor : 'rgba(255,255,255,0.1)' }}
                        className="w-full h-12 flex items-center justify-center gap-2 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-primary/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {locationStatus === 'success' && coords ? (
                            <>
                                <span>Confirm {isPickup ? 'Pick-Up' : 'Destination'} Pin</span>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                            </>
                        ) : (
                            'Determining Location...'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

const DriverBookingFlow: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const [searchParams] = useSearchParams();
    const queryDriverId = searchParams.get('driverId') || '';
    const queryDriverName = searchParams.get('driverName') || '';

    const { user } = useAuth();
    const { db, addServiceRequest, updateServiceRequestStatus, updateServiceRequest } = useDatabase();
    const navigate = useNavigate();

    const accentColor = db?.settings?.accentColor || '#FE7803';

    // State Variables
    const [currentStep, setCurrentStep] = useState(1);
    const [submitting, setSubmitting] = useState(false);
    const [showCalendar, setShowCalendar] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());

    // Interactive Full-Bleed Map Modal State for Location Confirmation
    const [locationModalTarget, setLocationModalTarget] = useState<'pickup' | 'destination' | null>(null);

    // Payment Gateway & GCash States
    const [paymentMethod, setPaymentMethod] = useState<'hitpay' | 'gcash'>('hitpay');
    const [showGCashModal, setShowGCashModal] = useState(false);
    const [gcashBookingId, setGcashBookingId] = useState('');
    const [gcashTotalAmount, setGcashTotalAmount] = useState(0);
    const [gcashPaymentAmount, setGcashPaymentAmount] = useState(0);
    const [gcashBookingData, setGcashBookingData] = useState<any>(null);
    const [showSuccessView, setShowSuccessView] = useState(false);

    // Note: Do not abort or cancel bookings on background page load/refresh during normal flow


    // Step 1: Real-time Live Location Map States & Refs
    const step1MapRef = useRef<HTMLDivElement>(null);
    const step1MapInstanceRef = useRef<any>(null);
    const step1MarkerRef = useRef<any>(null);
    const step1WatchIdRef = useRef<number | null>(null);
    const step1GeocodeTimeoutRef = useRef<any>(null);
    // Ref mirror so the watch callback can read tracking state without being a dep
    const step1IsTrackingLiveRef = useRef<boolean>(true);

    const [step1LocationAccuracy, setStep1LocationAccuracy] = useState<number | null>(null);
    const [step1IsTrackingLive, setStep1IsTrackingLive] = useState<boolean>(true);
    const [step1LocationStatus, setStep1LocationStatus] = useState<'idle' | 'fetching' | 'success' | 'error'>('fetching');
    const [step1LocationError, setStep1LocationError] = useState<string>('');
    const [step1AddressLoading, setStep1AddressLoading] = useState<boolean>(false);

    // Map & Geolocation States
    const routeMapRef = useRef<HTMLDivElement>(null);
    const routeMapInstanceRef = useRef<any>(null);
    const routeStartMarkerRef = useRef<any>(null);
    const routeEndMarkerRef = useRef<any>(null);
    const routePolylineRef = useRef<any>(null);

    const [leafletLoaded, setLeafletLoaded] = useState(typeof window !== 'undefined' && !!(window as any).L);
    const [isLocating, setIsLocating] = useState(false);
    const [startCoords, setStartCoords] = useState<[number, number] | null>(null);
    const [endCoords, setEndCoords] = useState<[number, number] | null>(null);

    // Reverse geocode helper for Step 1 map
    const fetchStep1Address = useCallback((lat: number, lng: number) => {
        if (step1GeocodeTimeoutRef.current) clearTimeout(step1GeocodeTimeoutRef.current);
        setStep1AddressLoading(true);
        step1GeocodeTimeoutRef.current = setTimeout(async () => {
            try {
                const addr = await reverseGeocodeCoordinates(lat, lng);
                if (addr) {
                    setForm(f => ({ ...f, pickupLocation: addr }));
                } else {
                    setForm(f => ({ ...f, pickupLocation: `${lat.toFixed(5)}, ${lng.toFixed(5)}` }));
                }
            } catch (e) {
                setForm(f => ({ ...f, pickupLocation: `${lat.toFixed(5)}, ${lng.toFixed(5)}` }));
            } finally {
                setStep1AddressLoading(false);
            }
        }, 300);
    }, []);


    // Sync ref mirror whenever state changes (so watch callback reads latest value without re-running effects)
    useEffect(() => { step1IsTrackingLiveRef.current = step1IsTrackingLive; }, [step1IsTrackingLive]);

    // Step 1: One-shot GPS acquisition — runs ONCE on mount only
    useEffect(() => {
        let isMounted = true;
        setStep1LocationStatus('fetching');

        getAccurateLivePosition(
            (accurate) => {
                if (!isMounted) return;
                setStartCoords([accurate.latitude, accurate.longitude]);
                setStep1LocationAccuracy(accurate.accuracy);
                setStep1LocationStatus('success');
                setStep1LocationError('');
                fetchStep1Address(accurate.latitude, accurate.longitude);
            },
            { timeoutMs: 9000, targetAccuracy: 12 }
        ).catch((err) => {
            // Expected on desktop/non-GPS browsers — fall back silently to default coords
            console.debug('[DriverBookingFlow] GPS fallback to default:', err);
            if (!isMounted) return;
            const fallback = { lat: 14.5995, lng: 120.9842 };
            setStartCoords([fallback.lat, fallback.lng]);
            setStep1LocationStatus('success');
            setStep1LocationError('');
            fetchStep1Address(fallback.lat, fallback.lng);
        });

        return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Mount-once: fetchStep1Address is stable (useCallback with [])

    // Step 1: Continuous GPS watch — runs ONCE on mount, cleans up on unmount
    useEffect(() => {
        let isMounted = true;

        // Live Watch Position stream for Step 1 (unified precise stream)
        startPreciseWatch(
            (fix) => {
                if (!isMounted) return;
                const { lat: latitude, lng: longitude, accuracy } = fix;
                setStep1LocationAccuracy(prev => (prev !== null && accuracy > prev * 2.0 && accuracy > 35 ? prev : accuracy));
                setStartCoords(prev => {
                    if (prev !== null) {
                        const dLat = (latitude - prev[0]) * 111320;
                        const dLng = (longitude - prev[1]) * (111320 * Math.cos(prev[0] * (Math.PI / 180)));
                        const distanceMoved = Math.sqrt(dLat * dLat + dLng * dLng);
                        if (distanceMoved < 1.0) return prev;
                    }
                    // Read tracking state from ref — avoids adding state to deps and re-running effect
                    if (step1IsTrackingLiveRef.current || prev === null) {
                        fetchStep1Address(latitude, longitude);
                        return [latitude, longitude];
                    }
                    return prev;
                });
                setStep1LocationStatus('success');
            },
            () => {},
            { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
        ).then(watchId => {
            if (isMounted) step1WatchIdRef.current = watchId;
            else safeClearWatch(watchId);
        });

        return () => {
            isMounted = false;
            if (step1WatchIdRef.current !== null) {
                safeClearWatch(step1WatchIdRef.current);
                step1WatchIdRef.current = null;
            }
            if (step1GeocodeTimeoutRef.current) clearTimeout(step1GeocodeTimeoutRef.current);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Mount-once: fetchStep1Address & step1IsTrackingLiveRef are stable references


    // Recenter handler for Step 1 map
    const handleStep1Recenter = useCallback(() => {
        setStep1IsTrackingLive(true);
        getAccurateLivePosition(
            (accurate) => {
                setStartCoords([accurate.latitude, accurate.longitude]);
                setStep1LocationAccuracy(accurate.accuracy);
                if (step1MapInstanceRef.current) {
                    step1MapInstanceRef.current.setView([accurate.latitude, accurate.longitude], 18, { animate: true, duration: 0.6 });
                }
                if (step1MarkerRef.current) {
                    step1MarkerRef.current.setLatLng([accurate.latitude, accurate.longitude]);
                }
                fetchStep1Address(accurate.latitude, accurate.longitude);
            },
            { timeoutMs: 6000, targetAccuracy: 10 }
        ).catch(() => {});
    }, [fetchStep1Address]);

    // Initialize and maintain Step 1 Leaflet Map
    useEffect(() => {
        if (currentStep !== 1 || !startCoords || !step1MapRef.current || typeof L === 'undefined') return;

        if (step1MapInstanceRef.current) {
            try {
                const container = step1MapInstanceRef.current.getContainer();
                if (container !== step1MapRef.current) {
                    step1MapInstanceRef.current.remove();
                    step1MapInstanceRef.current = null;
                    step1MarkerRef.current = null;
                }
            } catch (e) {
                step1MapInstanceRef.current = null;
                step1MarkerRef.current = null;
            }
        }

        if (!step1MapInstanceRef.current) {
            const map = L.map(step1MapRef.current, {
                zoomControl: false,
                preferCanvas: false,
                scrollWheelZoom: true,
                doubleClickZoom: true,
                touchZoom: true,
                dragging: true
            }).setView([startCoords[0], startCoords[1]], 18);

            const tileConfig = getLeafletTileConfig(db?.settings);
            L.tileLayer(tileConfig.url, tileConfig.options).addTo(map);

            const pinColor = '#10B981'; // Pick-Up Pin Color

            const locationIcon = L.divIcon({
                html: `<div class="rb-location-pin-wrapper">
                    <div class="rb-location-circle" style="border: 3px solid ${pinColor};">
                        <img src="${db?.settings?.mapLogoUrl || db?.settings?.appLogoUrl || '/favicon.png'}" alt="Location" onerror="this.style.display='none'" style="width:28px;height:28px;object-fit:contain;border-radius:50%;" />
                    </div>
                    <div class="rb-location-stem" style="background: ${pinColor};"></div>
                    <div class="rb-location-dot" style="background: ${pinColor};"></div>
                </div>`,
                className: 'rb-leaflet-icon',
                iconSize: [56, 72],
                iconAnchor: [28, 72],
            });

            const marker = L.marker([startCoords[0], startCoords[1]], {
                icon: locationIcon,
                draggable: true,
                autoPan: true,
                autoPanSpeed: 10,
            }).addTo(map);

            marker.on('drag', (e: any) => {
                const { lat, lng } = e.target.getLatLng();
                setStartCoords([lat, lng]);
                setStep1IsTrackingLive(false);
            });

            marker.on('dragend', (e: any) => {
                const { lat, lng } = e.target.getLatLng();
                setStartCoords([lat, lng]);
                setStep1IsTrackingLive(false);
                fetchStep1Address(lat, lng);
            });

            map.on('click', (e: any) => {
                const { lat, lng } = e.latlng;
                setStartCoords([lat, lng]);
                setStep1IsTrackingLive(false);
                if (step1MarkerRef.current) {
                    step1MarkerRef.current.setLatLng([lat, lng]);
                }
                fetchStep1Address(lat, lng);
            });

            step1MapInstanceRef.current = map;
            step1MarkerRef.current = marker;

            const inv = () => { if (step1MapInstanceRef.current) step1MapInstanceRef.current.invalidateSize(true); };
            inv();
            setTimeout(inv, 100);
            setTimeout(inv, 400);
            setTimeout(inv, 1000);
        } else {
            if (step1MarkerRef.current) {
                step1MarkerRef.current.setLatLng([startCoords[0], startCoords[1]]);
            }
            if (step1IsTrackingLive) {
                step1MapInstanceRef.current.panTo([startCoords[0], startCoords[1]], {
                    animate: true,
                    duration: 0.6,
                    easeLinearity: 0.25
                });
            }
        }
    }, [currentStep, startCoords, leafletLoaded, db?.settings, fetchStep1Address, step1IsTrackingLive]);

    // Autocomplete Suggestions
    const [startSuggestions, setStartSuggestions] = useState<any[]>([]);
    const [endSuggestions, setEndSuggestions] = useState<any[]>([]);
    const [showStartSuggestions, setShowStartSuggestions] = useState(false);
    const [showEndSuggestions, setShowEndSuggestions] = useState(false);

    useEffect(() => {
        if (leafletLoaded) return;
        const interval = setInterval(() => {
            if ((window as any).L) {
                setLeafletLoaded(true);
                clearInterval(interval);
            }
        }, 100);
        return () => clearInterval(interval);
    }, [leafletLoaded]);

    const [form, setForm] = useState<FormState>({
        pickupLocation: '',
        destination: '',
        purposeOfHire: 'Personal Travel / Errands',
        customPurpose: '',
        date: '',
        time: '08:00 AM',
        duration: '8 Hours (Full Day)',
        vehicleType: user?.vehicles?.[0]?.type || 'Sedan',
        driveCustomerCar: true,
        vehicleBrand: user?.vehicles?.[0]?.make || '',
        vehicleModel: user?.vehicles?.[0]?.model || '',
        plateNumber: user?.vehicles?.[0]?.plateNumber || '',
        contactNumber: user?.phone || '',
        specialInstructions: '',
        selectedDriverId: queryDriverId,
        selectedDriverName: queryDriverName,
    });

    const [selectedVehicleId, setSelectedVehicleId] = useState<string>(user?.vehicles?.[0]?.plateNumber || '');

    useEffect(() => {
        if (user) {
            setForm(prev => {
                const primary = user.vehicles?.find(v => v.isPrimary) || user.vehicles?.[0];
                return {
                    ...prev,
                    contactNumber: user.phone || prev.contactNumber,
                    vehicleBrand: prev.vehicleBrand || primary?.make || '',
                    vehicleModel: prev.vehicleModel || primary?.model || '',
                    plateNumber: prev.plateNumber || primary?.plateNumber || '',
                    vehicleType: prev.vehicleType || primary?.type || 'Sedan',
                };
            });
            if (user.vehicles?.length && !selectedVehicleId) {
                const primary = user.vehicles.find(v => v.isPrimary) || user.vehicles[0];
                setSelectedVehicleId(primary.plateNumber);
            }
        }
    }, [user]);

    const totalSteps = 3;

    // Helper: Form validation per step
    const isStepValid = () => {
        if (currentStep === 1) {
            return Boolean(startCoords && form.pickupLocation && form.pickupLocation.trim() !== '');
        }
        if (currentStep === 2) {
            const hasBasic = form.date !== '' &&
                             form.contactNumber.trim() !== '';
            
            if (form.driveCustomerCar) {
                return hasBasic && form.vehicleBrand.trim() !== '' && form.vehicleModel.trim() !== '' && form.plateNumber.trim() !== '';
            }
            return hasBasic;
        }
        return true;
    };

    const handleNext = () => {
        if (isStepValid() && currentStep < totalSteps) {
            setCurrentStep(prev => prev + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(prev => prev - 1);
        } else {
            navigate(-1);
        }
    };

    // Dynamic Pricing read from Admin Settings with resilient fallbacks
    const driverCustomization = db?.settings?.serviceCustomizations?.driverHire;

    const calculateEstimatedFee = () => {
        const twoHours = driverCustomization?.twoHoursRate || 1600;
        const fourHours = driverCustomization?.fourHoursRate || 3200;
        const eightHours = driverCustomization?.eightHoursRate || 4500;
        const airportTransfer = driverCustomization?.airportTransferRate || 2500;

        let base = eightHours;
        if (form.duration.includes('Hourly') || form.duration.includes('2 Hours')) {
            base = twoHours;
        } else if (form.duration.includes('4 Hours')) {
            base = fourHours;
        } else if (form.duration.includes('8 Hours') || form.duration.includes('Full Day')) {
            base = eightHours;
        } else if (form.purposeOfHire === 'Airport Transfer') {
            base = airportTransfer;
        } else {
            base = 5500; // Out-of-town or Multiple Days
        }

        // Apply customer car discount if operating own vehicle
        if (form.driveCustomerCar && driverCustomization?.customerCarDiscount) {
            base = Math.max(800, base - driverCustomization.customerCarDiscount);
        }

        return base;
    };

    const depositPercentage = (driverCustomization?.depositPercentage || 50) / 100;

    const handleSubmit = async () => {
        if (!user) return;
        setSubmitting(true);
        try {
            const estimatedTotal = calculateEstimatedFee();
            const downpayment = Math.ceil(estimatedTotal * depositPercentage);
            const remainingBalance = Math.max(0, estimatedTotal - downpayment);

            const effectivePurpose = form.purposeOfHire === 'Other' && form.customPurpose.trim() 
                ? form.customPurpose.trim() 
                : form.purposeOfHire;

            const requestPayload = {
                customerId: user.uid || user.id,
                userId: user.uid || user.id,
                customerName: user.name || 'Customer',
                customerPhone: form.contactNumber || user.phone || '',
                customerEmail: user.email || '',
                serviceId: '7',
                serviceName: 'Driver for Hire',
                purposeOfHire: effectivePurpose,
                status: 'Pending Admin Review',
                scheduledDate: form.date,
                notes: form.specialInstructions,
                totalAmount: estimatedTotal,
                downpaymentAmount: downpayment,
                paidAmount: 0,
                remainingBalance: estimatedTotal,
                paymentStatus: 'pending',
                paymentMethod: paymentMethod === 'gcash' ? 'GCash (Manual Upload)' : 'Online (HitPay)',
                driverName: form.selectedDriverName || undefined,
                location: startCoords ? {
                    latitude: startCoords[0],
                    longitude: startCoords[1],
                    address: form.pickupLocation
                } : undefined,
                vehicleDetails: form.driveCustomerCar ? {
                    brand: form.vehicleBrand,
                    model: form.vehicleModel,
                    plateNumber: form.plateNumber,
                    type: form.vehicleType
                } : null,
                details: {
                    pickupLocation: form.pickupLocation,
                    destination: form.destination,
                    startCoords: startCoords ? { lat: startCoords[0], lng: startCoords[1] } : null,
                    endCoords: endCoords ? { lat: endCoords[0], lng: endCoords[1] } : null,
                    purposeOfHire: effectivePurpose,
                    time: form.time,
                    duration: form.duration,
                    vehicleType: form.vehicleType,
                    driveCustomerCar: form.driveCustomerCar,
                    selectedDriverId: form.selectedDriverId,
                    selectedDriverName: form.selectedDriverName,
                },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            const isHitPayActive = HitPayService.isGatewayActive(db?.settings);

            // Manual GCash Modal Flow
            if (paymentMethod === 'gcash') {
                const createdRequest = await addServiceRequest(requestPayload);
                const reqId = createdRequest?.id || `DRV-${Date.now()}`;
                setGcashBookingId(reqId);
                setGcashTotalAmount(estimatedTotal);
                setGcashPaymentAmount(downpayment);
                setGcashBookingData(requestPayload);
                setShowGCashModal(true);
                return;
            }

            // HitPay Online Payment Gateway Flow
            if (isHitPayActive) {
                const createdRequest = await addServiceRequest(requestPayload);
                const reqId = createdRequest?.id || `DRV-${Date.now()}`;
                const isSandbox = db?.settings?.hitpaySandboxMode === true;
                const refNumber = `DRV-${reqId}-${Date.now()}`;

                sessionStorage.setItem('pendingHitPayServiceTx', JSON.stringify({
                    bookingId: reqId,
                    amount: downpayment,
                    totalAmount: estimatedTotal,
                    currentPaid: 0,
                    isDriver: true,
                    leavingTimestamp: Date.now(),
                    fullBooking: {
                        ...requestPayload,
                        id: reqId,
                        isDriver: true,
                        isDriverHire: true,
                        totalAmount: estimatedTotal,
                        paidAmount: 0,
                        services: [{ name: `Driver for Hire: ${effectivePurpose}`, price: estimatedTotal }]
                    }
                }));

                const result = await HitPayEmbeddedService.startCheckout({
                    entityKind: 'service-request',
                    entityId: reqId,
                    amount: downpayment,
                    currency: db?.settings?.currency || 'PHP',
                    referenceNumber: refNumber,
                    purpose: `RidersBUD — Driver for Hire ${Math.round(depositPercentage * 100)}% Deposit (${effectivePurpose})`,
                    customerEmail: user.email || 'customer@example.com',
                    customerName: user.name || 'Customer',
                    customerPhone: form.contactNumber || user.phone || undefined,
                    returnRoute: `/customer-portal/?bookingId=${reqId}&isDriver=true`,
                    isSandbox,
                    settings: db?.settings
                });

                if (result.redirected) {
                    // The browser is already opening the official HitPay checkout URL
                    // in an in-app Custom Tab — do not SPA-navigate over it.
                    return;
                }

                if (result.success) {
                    // Route through the verification overlay (webhook-driven) before celebrating.
                    const params = new URLSearchParams({
                        bookingId: reqId,
                        isDriver: 'true',
                        status: 'completed'
                    });
                    if (result.paymentRequestId) params.set('payment_request_id', result.paymentRequestId);
                    if (result.referenceNumber) params.set('reference', result.referenceNumber);
                    navigate(`/customer-portal/?${params.toString()}`, { state: { paymentSuccess: true } });
                } else if (result.paymentState !== 'CANCELLED') {
                    alert(result.errorMessage || 'Failed to complete payment.');
                }
                return;
            }

            // Fallback if HitPay not active: save and route directly
            const created = await addServiceRequest(requestPayload);
            const fallbackId = created?.id || `DRV-${Date.now()}`;
            navigate(`/customer-portal/?bookedService=driver&ref=${fallbackId}`);
        } catch (error) {
            console.error('Failed to submit Driver for Hire request:', error);
            alert(error instanceof Error ? error.message : 'Failed to submit Driver for Hire request.');
        } finally {
            setSubmitting(false);
        }
    };

    // Live Geocoding and Location Helper with progressive precision and reverse geocoding
    const handleUseLiveLocation = async () => {
        setIsLocating(true);

        try {
            const accurate = await getAccurateLivePosition(
                (pos) => {
                    setStartCoords([pos.latitude, pos.longitude]);
                },
                { timeoutMs: 6000, targetAccuracy: 12 }
            );

            setStartCoords([accurate.latitude, accurate.longitude]);
            const address = await reverseGeocodeCoordinates(accurate.latitude, accurate.longitude);
            setForm(f => ({ ...f, pickupLocation: address }));
        } catch (err) {
            console.warn("[DriverBookingFlow] High-accuracy lock error:", err);
            safeGetCurrentPosition(
                async (pos) => {
                    setStartCoords([pos.coords.latitude, pos.coords.longitude]);
                    const address = await reverseGeocodeCoordinates(pos.coords.latitude, pos.coords.longitude);
                    setForm(f => ({ ...f, pickupLocation: address }));
                },
                () => {
                    alert('Unable to retrieve location. Please check your device GPS permissions.');
                },
                { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
            );
        } finally {
            setIsLocating(false);
        }
    };

    // Fetch suggestions for Start / Pick-Up Location (Philippines only)
    useEffect(() => {
        if (!form.pickupLocation || form.pickupLocation.startsWith('My Location') || form.pickupLocation.length < 2) {
            setStartSuggestions([]);
            return;
        }
        const timer = setTimeout(async () => {
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&countrycodes=ph&q=${encodeURIComponent(form.pickupLocation)}&limit=5`);
                const data = await res.json();
                if (data) {
                    setStartSuggestions(data);
                }
            } catch (e) {
                console.warn("Start suggestions fetch failed", e);
            }
        }, 200);
        return () => clearTimeout(timer);
    }, [form.pickupLocation]);

    // Fetch suggestions for Destination / End Location (Philippines only)
    useEffect(() => {
        if (!form.destination || form.destination.length < 2) {
            setEndSuggestions([]);
            return;
        }
        const timer = setTimeout(async () => {
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&countrycodes=ph&q=${encodeURIComponent(form.destination)}&limit=5`);
                const data = await res.json();
                if (data) {
                    setEndSuggestions(data);
                }
            } catch (e) {
                console.warn("End suggestions fetch failed", e);
            }
        }, 200);
        return () => clearTimeout(timer);
    }, [form.destination]);

    const handleSelectStartSuggestion = (suggestion: any) => {
        setForm(f => ({ ...f, pickupLocation: suggestion.display_name }));
        setStartCoords([parseFloat(suggestion.lat), parseFloat(suggestion.lon)]);
        setStartSuggestions([]);
        setShowStartSuggestions(false);
    };

    const handleSelectEndSuggestion = (suggestion: any) => {
        setForm(f => ({ ...f, destination: suggestion.display_name }));
        setEndCoords([parseFloat(suggestion.lat), parseFloat(suggestion.lon)]);
        setEndSuggestions([]);
        setShowEndSuggestions(false);
    };

    // Instantiate and update Route Map in Step 1
    useEffect(() => {
        if (currentStep !== 1 || !routeMapRef.current || typeof L === 'undefined') return;

        // Clean up map instance if the container DOM element was unmounted and remounted
        if (routeMapInstanceRef.current) {
            try {
                const container = routeMapInstanceRef.current.getContainer();
                if (container !== routeMapRef.current) {
                    routeMapInstanceRef.current.remove();
                    routeMapInstanceRef.current = null;
                    routeStartMarkerRef.current = null;
                    routeEndMarkerRef.current = null;
                    routePolylineRef.current = null;
                }
            } catch (e) {
                routeMapInstanceRef.current = null;
                routeStartMarkerRef.current = null;
                routeEndMarkerRef.current = null;
                routePolylineRef.current = null;
            }
        }

        if (!routeMapInstanceRef.current) {
            routeMapInstanceRef.current = L.map(routeMapRef.current, {
                zoomControl: false,
                attributionControl: false
            }).setView([14.5995, 120.9842], 12);

            const osmTile = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                subdomains: 'abc',
                crossOrigin: true,
                attribution: '&copy; OpenStreetMap contributors'
            });

            osmTile.addTo(routeMapInstanceRef.current);
        }

        const map = routeMapInstanceRef.current;

        if (startCoords) {
            if (routeStartMarkerRef.current) {
                routeStartMarkerRef.current.setLatLng(startCoords);
            } else {
                const greenIcon = L.divIcon({
                    html: `<div class="rb-location-pin-wrapper start-pin small-pin">
                        <div class="rb-location-circle" style="border: 3px solid #10B981;">
                            <img src="${db?.settings?.mapLogoUrl || db?.settings?.appLogoUrl || '/favicon.png'}" alt="Pickup" onerror="this.style.display='none'" style="width:34px;height:34px;object-fit:contain;border-radius:50%;" />
                        </div>
                        <div class="rb-location-stem" style="background: #10B981;"></div>
                        <div class="rb-location-dot" style="background: #10B981;"></div>
                    </div>`,
                    className: 'rb-leaflet-icon',
                    iconSize: [34, 46],
                    iconAnchor: [17, 46]
                });
                routeStartMarkerRef.current = L.marker(startCoords, { icon: greenIcon }).addTo(map);
            }
        } else if (routeStartMarkerRef.current) {
            routeStartMarkerRef.current.remove();
            routeStartMarkerRef.current = null;
        }

        if (endCoords) {
            if (routeEndMarkerRef.current) {
                routeEndMarkerRef.current.setLatLng(endCoords);
            } else {
                const redIcon = L.divIcon({
                    html: `<div class="rb-location-pin-wrapper end-pin small-pin">
                        <div class="rb-location-circle" style="border: 3px solid #EF4444;">
                            <img src="${db?.settings?.mapLogoUrl || db?.settings?.appLogoUrl || '/favicon.png'}" alt="Destination" onerror="this.style.display='none'" style="width:34px;height:34px;object-fit:contain;border-radius:50%;" />
                        </div>
                        <div class="rb-location-stem" style="background: #EF4444;"></div>
                        <div class="rb-location-dot" style="background: #EF4444;"></div>
                    </div>`,
                    className: 'rb-leaflet-icon',
                    iconSize: [34, 46],
                    iconAnchor: [17, 46]
                });
                routeEndMarkerRef.current = L.marker(endCoords, { icon: redIcon }).addTo(map);
            }
        } else if (routeEndMarkerRef.current) {
            routeEndMarkerRef.current.remove();
            routeEndMarkerRef.current = null;
        }

        if (startCoords && endCoords) {
            const drawStraightLine = () => {
                if (routePolylineRef.current) {
                    routePolylineRef.current.setLatLngs([startCoords, endCoords]);
                    routePolylineRef.current.setStyle({ dashArray: '5, 10', weight: 4 });
                } else {
                    routePolylineRef.current = L.polyline([startCoords, endCoords], {
                        color: accentColor,
                        weight: 4,
                        opacity: 0.8,
                        dashArray: '5, 10'
                    }).addTo(map);
                }
                const bounds = L.latLngBounds([startCoords, endCoords]);
                map.fitBounds(bounds, { padding: [50, 50] });
            };

            // Fetch real road route geometry from OpenStreetMap OSRM API
            fetch(`https://routing.openstreetmap.de/routed-car/route/v1/driving/${startCoords[1]},${startCoords[0]};${endCoords[1]},${endCoords[0]}?overview=full&geometries=geojson`)
                .then(res => res.json())
                .then(data => {
                    if (data && data.routes && data.routes.length > 0) {
                        const routePoints = data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]]);
                        if (routePolylineRef.current) {
                            routePolylineRef.current.setLatLngs(routePoints);
                            routePolylineRef.current.setStyle({ dashArray: '', weight: 5 });
                        } else {
                            routePolylineRef.current = L.polyline(routePoints, {
                                color: accentColor,
                                weight: 5,
                                opacity: 0.9,
                                lineJoin: 'round'
                            }).addTo(map);
                        }
                        const bounds = L.latLngBounds(routePoints);
                        map.fitBounds(bounds, { padding: [40, 40] });
                    } else {
                        drawStraightLine();
                    }
                })
                .catch(err => {
                    console.warn("OSRM routing failed, using fallback:", err);
                    drawStraightLine();
                });
        } else {
            if (routePolylineRef.current) {
                routePolylineRef.current.remove();
                routePolylineRef.current = null;
            }
            if (startCoords) {
                map.setView(startCoords, 14);
            } else if (endCoords) {
                map.setView(endCoords, 14);
            }
        }

        setTimeout(() => {
            if (map) map.invalidateSize(true);
        }, 300);

    }, [currentStep, startCoords, endCoords, leafletLoaded, accentColor, db?.settings]);

    // Custom Calendar Date Selection Helpers
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        const daysArray = [];
        for (let i = 1; i <= days; i++) {
            daysArray.push(new Date(year, month, i));
        }
        return daysArray;
    };

    const isPastDate = (date: Date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date < today;
    };

    const isWeekend = (date: Date) => {
        const day = date.getDay();
        return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
    };

    const formatReadableDate = (dateString: string) => {
        if (!dateString) return '';
        const d = new Date(dateString);
        return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    };

    const days = getDaysInMonth(currentMonth);
    const startDayOffset = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col font-sans">
            {/* Header */}
            <header className="px-6 py-4 border-b border-white/5 flex items-center gap-4 bg-[#111113]">
                <button onClick={handleBack} className="w-8 h-8 flex items-center justify-center border border-white/10 hover:bg-white/10 transition-colors">
                    <ChevronLeft size={18} />
                </button>
                <div className="flex-1">
                    <h1 className="text-sm font-black uppercase tracking-wider">Driver for Hire</h1>
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mt-0.5">Flow Wizard • Step {currentStep} of {totalSteps}</p>
                </div>
            </header>

            {/* Stepper Progress Bar */}
            <div className="w-full bg-[#111113] px-6 py-2 border-b border-white/5 flex items-center gap-2">
                {Array.from({ length: totalSteps }).map((_, i) => (
                    <div 
                        key={i} 
                        className="h-1 flex-1 rounded-full transition-all duration-300"
                        style={{ 
                            backgroundColor: i + 1 <= currentStep ? accentColor : 'rgba(255,255,255,0.05)' 
                        }}
                    />
                ))}
            </div>

            {/* Content Area */}
            {currentStep === 1 ? (
                <div className="relative flex-grow w-full h-[calc(100vh-110px)] overflow-hidden">
                    {/* Full-bleed Map Canvas */}
                    <div ref={step1MapRef} className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }} />

                    {/* GPS Accuracy Pill */}
                    {step1LocationAccuracy !== null && (
                        <div className="absolute top-4 left-4 z-[400] bg-[#1a1a1ae0] backdrop-blur-md px-3 py-2 rounded-xl border border-white/10 flex items-center gap-2.5 shadow-2xl transition-all duration-300 animate-slideDown">
                            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                                !step1IsTrackingLive 
                                    ? 'bg-amber-500' 
                                    : step1LocationAccuracy <= 25 
                                    ? 'bg-emerald-500 animate-pulse shadow-md shadow-emerald-500/50' 
                                    : 'bg-yellow-400 animate-ping'
                            }`} />
                            <div className="flex flex-col">
                                <span className="text-[10px] text-white font-extrabold tracking-wider leading-none">
                                    {!step1IsTrackingLive 
                                        ? 'MANUAL PIN PLACEMENT' 
                                        : step1LocationAccuracy <= 25 
                                        ? 'LIVE GPS ACTIVE' 
                                        : 'REFINING GPS ACCURACY...'}
                                </span>
                                <span className="text-[8px] text-gray-400 font-bold mt-1 leading-none">
                                    {step1IsTrackingLive 
                                        ? (step1LocationAccuracy <= 25 
                                            ? `Accurate to ±${Math.round(step1LocationAccuracy)}m (Pinpoint)` 
                                            : `Satellite calibrating: ±${Math.round(step1LocationAccuracy)}m`)
                                        : 'Tap recenter to resume GPS'}
                                </span>
                            </div>
                            {!step1IsTrackingLive && (
                                <button
                                    type="button"
                                    onClick={handleStep1Recenter}
                                    style={{ borderColor: accentColor, color: accentColor }}
                                    className="border hover:bg-primary hover:text-white text-[8px] font-black px-2 py-1 rounded-md ml-0.5 transition-all uppercase tracking-wide"
                                >
                                    Resume
                                </button>
                            )}
                        </div>
                    )}

                    {/* Zoom + Recenter Controls */}
                    <div className="absolute top-1/2 -translate-y-1/2 right-4 z-[400] flex flex-col gap-2.5">
                        <button
                            type="button"
                            onClick={() => { if (step1MapInstanceRef.current) step1MapInstanceRef.current.zoomIn(); }}
                            className="w-11 h-11 flex items-center justify-center backdrop-blur-md border border-white/20 bg-[#1E1E1E]/90 text-white rounded-full shadow-xl transition-all duration-200 hover:bg-white/20 hover:border-white/40 active:scale-90"
                            title="Zoom In"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                        </button>

                        <button
                            type="button"
                            onClick={() => { if (step1MapInstanceRef.current) step1MapInstanceRef.current.zoomOut(); }}
                            className="w-11 h-11 flex items-center justify-center backdrop-blur-md border border-white/20 bg-[#1E1E1E]/90 text-white rounded-full shadow-xl transition-all duration-200 hover:bg-white/20 hover:border-white/40 active:scale-90"
                            title="Zoom Out"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                        </button>

                        <button
                            type="button"
                            onClick={handleStep1Recenter}
                            style={{ backgroundColor: accentColor }}
                            className={`w-11 h-11 flex items-center justify-center rounded-full shadow-2xl transition-all duration-300 active:scale-90 relative overflow-hidden ${
                                step1IsTrackingLive
                                    ? 'border-2 border-white/30 shadow-[0_0_24px_rgba(254,120,3,0.5)]'
                                    : 'border-2 border-white/20 hover:brightness-110'
                            }`}
                            title="Recenter on my location"
                        >
                            {step1IsTrackingLive && (
                                <span className="absolute inset-0 rounded-full border-2 border-white/40 animate-ping opacity-60" />
                            )}
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="3" fill="white" fillOpacity="0.3" />
                                <line x1="12" y1="2" x2="12" y2="6" />
                                <line x1="12" y1="18" x2="12" y2="22" />
                                <line x1="2" y1="12" x2="6" y2="12" />
                                <line x1="18" y1="12" x2="22" y2="12" />
                                <circle cx="12" cy="12" r="6" />
                            </svg>
                        </button>
                    </div>

                    {/* Drag-pin hint pill */}
                    <div className="absolute bottom-48 sm:bottom-44 left-1/2 -translate-x-1/2 z-[400] pointer-events-none">
                        <div className="bg-black/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/15 flex items-center gap-2 shadow-2xl">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-bounce flex-shrink-0">
                                <path d="M12 2a2 2 0 0 1 2 2v6.5l1.5-.9A2 2 0 0 1 18 11.5v1a7 7 0 0 1-14 0v-2a2 2 0 0 1 3-1.8V4a2 2 0 0 1 2-2z" />
                            </svg>
                            <span className="text-[9px] font-black text-white tracking-widest whitespace-nowrap">
                                DRAG PIN OR TAP MAP TO MOVE
                            </span>
                        </div>
                    </div>

                    {/* Bottom Floating Confirmation Card & Action */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 pt-10 bg-gradient-to-t from-black via-black/80 to-transparent z-[500] pointer-events-none pb-[calc(1rem+env(safe-area-inset-bottom))]">
                        <div className="max-w-md mx-auto w-full space-y-2.5 pointer-events-auto">
                            {/* Geocoded Address Box */}
                            <div className="bg-[#18181C]/90 backdrop-blur-md border border-white/15 rounded-2xl p-3.5 flex items-start gap-2.5 shadow-2xl">
                                <div 
                                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 shadow-md" 
                                    style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#10B981' }}
                                >
                                    <MapPin size={15} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className="text-[10px] font-black text-light-gray/60 uppercase tracking-wider block">
                                        Confirmed Pick-Up Location
                                    </span>
                                    <p className="text-xs font-semibold text-white truncate mt-0.5">
                                        {step1AddressLoading 
                                            ? 'Resolving street address...' 
                                            : (form.pickupLocation || (startCoords ? `${startCoords[0].toFixed(5)}, ${startCoords[1].toFixed(5)}` : 'Determining position...'))}
                                    </p>
                                </div>
                            </div>

                            {/* Prominent Confirm Location Button */}
                            <button
                                type="button"
                                onClick={() => {
                                    if (startCoords && form.pickupLocation) {
                                        setCurrentStep(2);
                                    }
                                }}
                                disabled={!startCoords || !form.pickupLocation || step1AddressLoading}
                                style={{ backgroundColor: startCoords && form.pickupLocation ? accentColor : 'rgba(255,255,255,0.1)' }}
                                className="w-full h-12 flex items-center justify-center gap-2 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-primary/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span>CONFIRM LOCATION</span>
                                <Check size={18} strokeWidth={3} />
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <main className="flex-grow p-6 pb-24 overflow-y-auto max-w-lg mx-auto w-full">
                    {/* Step 2: Trip & Vehicle Details */}
                    {currentStep === 2 && (
                        <div className="space-y-5 animate-fadeIn">
                            {/* Selected Driver Banner */}
                            <div className="p-3.5 bg-gradient-to-r from-[#16161A] to-[#121215] border border-white/10 rounded-2xl flex items-center justify-between gap-3 shadow-lg">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold shrink-0" style={{ color: accentColor }}>
                                        <Award size={20} />
                                    </div>
                                    <div className="min-w-0">
                                        <span className="text-[9px] text-light-gray/60 uppercase font-black tracking-widest block">
                                            {form.selectedDriverName ? 'Assigned Driver' : 'Booking Mode'}
                                        </span>
                                        <h3 className="text-sm font-black text-white truncate">
                                            {form.selectedDriverName ? form.selectedDriverName : 'Auto-Assign Best Available Driver'}
                                        </h3>
                                    </div>
                                </div>
                                <span className="text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2.5 py-1 rounded-full whitespace-nowrap shrink-0 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    {form.selectedDriverName ? 'Selected' : 'Auto-Assign'}
                                </span>
                            </div>

                            {/* Confirmed Pick-Up Location Card with Change Pin Option */}
                            <div className="p-3.5 bg-[#141418] border border-emerald-500/30 rounded-2xl flex items-center justify-between gap-3 shadow-md">
                                <div className="flex items-start gap-3 min-w-0">
                                    <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                                        <MapPin size={16} />
                                    </div>
                                    <div className="min-w-0">
                                        <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wider block">
                                            Confirmed Pick-Up Pin
                                        </span>
                                        <p className="text-xs font-bold text-white truncate mt-0.5">
                                            {form.pickupLocation || 'Location Selected'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setCurrentStep(1)}
                                    style={{ color: accentColor, borderColor: `${accentColor}40` }}
                                    className="px-2.5 py-1 border rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-white/5 transition-all shrink-0"
                                >
                                    Change Pin
                                </button>
                            </div>

                            <div>
                                <h2 className="text-xl font-black uppercase tracking-tight mb-1">Trip Details</h2>
                                <p className="text-xs text-gray-400">Please provide schedule and vehicle information for your driver.</p>
                            </div>

                            <div className="space-y-4">
                                {/* Date Picker trigger */}
                                <div className="space-y-1.5 relative">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Preferred Appointment Date *</label>
                                    <button
                                        onClick={() => setShowCalendar(!showCalendar)}
                                        className="w-full bg-[#111113] border border-white/10 rounded-xl py-3.5 px-4 text-xs font-medium text-white flex items-center justify-between text-left focus:border-primary/50 transition-colors"
                                    >
                                        <span className={form.date ? 'text-white font-bold' : 'text-gray-500'}>
                                            {form.date ? formatReadableDate(form.date) : 'Choose date from calendar'}
                                        </span>
                                        <Calendar className="text-gray-400" size={16} />
                                    </button>

                                    {/* Custom Calendar Picker Overlay */}
                                    {showCalendar && (
                                        <div className="absolute top-full left-0 w-full mt-2 bg-[#151518] border border-white/10 rounded-2xl p-4 z-50 shadow-2xl animate-scaleUp">
                                            <div className="flex justify-between items-center mb-3">
                                                <button 
                                                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                                                    className="p-1 hover:bg-white/5 rounded"
                                                >
                                                    <ChevronLeft size={16} />
                                                </button>
                                                <h4 className="text-xs font-black uppercase text-white tracking-wider">
                                                    {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                                                </h4>
                                                <button 
                                                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                                                    className="p-1 hover:bg-white/5 rounded"
                                                >
                                                    <ChevronRight size={16} />
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-gray-500 font-bold uppercase mb-2">
                                                <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
                                            </div>

                                            <div className="grid grid-cols-7 gap-1">
                                                {Array.from({ length: startDayOffset }).map((_, idx) => (
                                                    <div key={`offset-${idx}`} />
                                                ))}
                                                {days.map((day, idx) => {
                                                    const formatted = day.toISOString().split('T')[0];
                                                    const active = form.date === formatted;
                                                    const past = isPastDate(day);
                                                    const weekend = isWeekend(day);
                                                    const disabled = past || weekend;

                                                    return (
                                                        <button
                                                            key={idx}
                                                            disabled={disabled}
                                                            onClick={() => {
                                                                setForm(f => ({ ...f, date: formatted }));
                                                                setShowCalendar(false);
                                                            }}
                                                            className={`py-2 rounded-lg text-xs font-bold transition-colors ${
                                                                active 
                                                                    ? 'bg-primary text-white font-black' 
                                                                    : disabled 
                                                                        ? 'text-white/10 cursor-not-allowed' 
                                                                        : 'text-white hover:bg-white/5'
                                                            }`}
                                                            style={{ backgroundColor: active ? accentColor : undefined }}
                                                        >
                                                            {day.getDate()}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            <div className="mt-3.5 pt-2.5 border-t border-white/5 flex gap-4 text-[9px] text-gray-500 justify-center">
                                                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-[#FE7803]" style={{ backgroundColor: accentColor }} /> Selected</span>
                                                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-white/10" /> Weekend (Rest)</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Purpose of Hire Selector */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-primary" style={{ backgroundColor: accentColor }}></span>
                                            Purpose of Hire *
                                        </label>
                                        <span className="text-[9px] text-gray-500 font-medium">Select or specify trip intent</span>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {[
                                            { id: 'Personal Travel / Errands', label: 'Personal Travel / Errands', icon: '🛍️' },
                                            { id: 'Business / Corporate', label: 'Business / Corporate', icon: '💼' },
                                            { id: 'Out-of-Town Trip', label: 'Out-of-Town Trip', icon: '🚗' },
                                            { id: 'Airport Transfer', label: 'Airport Transfer', icon: '✈️' },
                                            { id: 'Special Event / Wedding', label: 'Event / Wedding', icon: '🎉' },
                                            { id: 'Other', label: 'Other Purpose', icon: '✍️' },
                                        ].map(purpose => {
                                            const isSelected = form.purposeOfHire === purpose.id;
                                            return (
                                                <button
                                                    key={purpose.id}
                                                    type="button"
                                                    onClick={() => setForm(f => ({ ...f, purposeOfHire: purpose.id }))}
                                                    className={`p-2.5 rounded-xl text-left border transition-all flex items-center gap-2 ${
                                                        isSelected
                                                            ? 'bg-primary/15 text-white border-primary shadow-sm shadow-primary/20'
                                                            : 'bg-[#111113] text-gray-400 border-white/5 hover:border-white/20 hover:text-gray-200'
                                                    }`}
                                                    style={{
                                                        borderColor: isSelected ? accentColor : undefined
                                                    }}
                                                >
                                                    <span className="text-sm shrink-0">{purpose.icon}</span>
                                                    <span className="text-[11px] font-bold leading-tight line-clamp-1">{purpose.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {form.purposeOfHire === 'Other' && (
                                        <div className="pt-1.5 animate-fadeIn">
                                            <input
                                                type="text"
                                                value={form.customPurpose}
                                                onChange={e => setForm(f => ({ ...f, customPurpose: e.target.value }))}
                                                placeholder="Specify the specific purpose of hire (e.g. VIP Escort, Medical Appointment)..."
                                                className="w-full bg-[#111113] border border-primary/40 rounded-xl py-2.5 px-3.5 text-xs text-white placeholder-gray-500 focus:border-primary outline-none transition-colors"
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Duration & Time */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Departure Time *</label>
                                        <select
                                            value={form.time}
                                            onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                                            className="w-full bg-[#111113] border border-white/10 rounded-xl py-3 px-4 text-xs font-medium text-white focus:border-primary/50 transition-colors"
                                        >
                                            <option value="06:00 AM">06:00 AM</option>
                                            <option value="08:00 AM">08:00 AM</option>
                                            <option value="10:00 AM">10:00 AM</option>
                                            <option value="12:00 PM">12:00 PM</option>
                                            <option value="02:00 PM">02:00 PM</option>
                                            <option value="04:00 PM">04:00 PM</option>
                                            <option value="06:00 PM">06:00 PM</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Estimated Duration *</label>
                                        <select
                                            value={form.duration}
                                            onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
                                            className="w-full bg-[#111113] border border-white/10 rounded-xl py-3 px-4 text-xs font-medium text-white focus:border-primary/50 transition-colors"
                                        >
                                            <option value="2 Hours (Minimum)">2 Hours (Minimum)</option>
                                            <option value="4 Hours">4 Hours</option>
                                            <option value="8 Hours (Full Day)">8 Hours (Full Day)</option>
                                            <option value="Multiple Days">Multiple Days</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Drive Customer Car Toggle */}
                                <div className="p-4 bg-[#111113] border border-white/5 rounded-2xl flex items-center justify-between">
                                    <div className="flex gap-3 items-center">
                                        <Car size={16} className="text-gray-400" />
                                        <div>
                                            <h4 className="text-xs font-bold text-white">Drive My Own Vehicle</h4>
                                            <p className="text-[10px] text-gray-400 mt-0.5">The driver will operate your vehicle.</p>
                                        </div>
                                    </div>
                                    <input 
                                        type="checkbox"
                                        checked={form.driveCustomerCar}
                                        onChange={e => setForm(f => ({ ...f, driveCustomerCar: e.target.checked }))}
                                        className="accent-primary w-4 h-4 rounded border-white/10"
                                        style={{ accentColor }}
                                    />
                                </div>

                                {/* Customer Vehicle Inputs */}
                                {form.driveCustomerCar && (
                                    <div className="p-4 bg-black/20 border border-white/5 rounded-2xl space-y-3.5 animate-fadeIn">
                                        {/* Saved Vehicles Quick Selection */}
                                        {user?.vehicles && user.vehicles.length > 0 && (
                                             <div className="space-y-1.5 pb-2 border-b border-white/5">
                                                 <label className="text-[10px] font-black text-light-gray/60 uppercase tracking-widest flex items-center justify-between">
                                                     <span>// Saved Garage Vehicles</span>
                                                     <span className="text-[9px] text-emerald-400 font-bold">Auto-Detected</span>
                                                 </label>
                                                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                     {user.vehicles.map((v) => {
                                                         const isSelected = form.plateNumber === v.plateNumber;
                                                         return (
                                                             <button
                                                                 key={v.plateNumber}
                                                                 type="button"
                                                                 onClick={() => {
                                                                     setSelectedVehicleId(v.plateNumber);
                                                                     setForm(f => ({
                                                                         ...f,
                                                                         vehicleBrand: v.make || '',
                                                                         vehicleModel: v.model || '',
                                                                         plateNumber: v.plateNumber || '',
                                                                         vehicleType: v.type || f.vehicleType || 'Sedan'
                                                                     }));
                                                                 }}
                                                                 className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                                                                     isSelected 
                                                                         ? 'bg-primary/10 border-primary text-white shadow-md' 
                                                                         : 'bg-[#111113] border-white/5 text-light-gray/70 hover:text-white hover:border-white/20'
                                                                 }`}
                                                                 style={isSelected ? { borderColor: accentColor } : undefined}
                                                             >
                                                                 <div className="flex items-center gap-2">
                                                                     <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-primary shrink-0" style={{ color: accentColor }}>
                                                                         <Car size={13} />
                                                                     </div>
                                                                     <div>
                                                                         <p className="text-xs font-bold text-white leading-tight">
                                                                             {v.make} {v.model}
                                                                         </p>
                                                                         <p className="text-[10px] font-mono text-light-gray/50 uppercase">
                                                                             {v.plateNumber}
                                                                         </p>
                                                                     </div>
                                                                 </div>
                                                                 {isSelected && (
                                                                     <Check size={14} className="text-primary shrink-0" style={{ color: accentColor }} />
                                                                 )}
                                                             </button>
                                                         );
                                                     })}
                                                 </div>
                                             </div>
                                        )}

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Vehicle Brand *</label>
                                                <input 
                                                    type="text"
                                                    value={form.vehicleBrand}
                                                    onChange={e => setForm(f => ({ ...f, vehicleBrand: e.target.value }))}
                                                    placeholder="e.g. Toyota"
                                                    className="w-full bg-[#111113] border border-white/10 rounded-xl py-2.5 px-3.5 text-xs text-white focus:border-primary/50 transition-colors"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Vehicle Model *</label>
                                                <input 
                                                    type="text"
                                                    value={form.vehicleModel}
                                                    onChange={e => setForm(f => ({ ...f, vehicleModel: e.target.value }))}
                                                    placeholder="e.g. Vios"
                                                    className="w-full bg-[#111113] border border-white/10 rounded-xl py-2.5 px-3.5 text-xs text-white focus:border-primary/50 transition-colors"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Plate Number *</label>
                                                <input 
                                                    type="text"
                                                    value={form.plateNumber}
                                                    onChange={e => setForm(f => ({ ...f, plateNumber: e.target.value }))}
                                                    placeholder="e.g. ABC 123"
                                                    className="w-full bg-[#111113] border border-white/10 rounded-xl py-2.5 px-3.5 text-xs text-white uppercase focus:border-primary/50 transition-colors"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Vehicle Type *</label>
                                                <select
                                                    value={form.vehicleType}
                                                    onChange={e => setForm(f => ({ ...f, vehicleType: e.target.value }))}
                                                    className="w-full bg-[#111113] border border-white/10 rounded-xl py-2.5 px-3.5 text-xs text-white focus:border-primary/50 transition-colors"
                                                >
                                                    <option value="Sedan">Sedan</option>
                                                    <option value="SUV">SUV</option>
                                                    <option value="Van">Van</option>
                                                    <option value="Pickup">Pickup</option>
                                                    <option value="Motorcycle">Motorcycle</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Contact Number */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Contact Number *</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3.5 top-3.5 text-gray-500" size={16} />
                                        <input 
                                            type="tel"
                                            value={form.contactNumber}
                                            onChange={e => setForm(f => ({ ...f, contactNumber: e.target.value }))}
                                            placeholder="Enter active phone number"
                                            className="w-full bg-[#111113] border border-white/10 rounded-xl py-3 pl-11 pr-4 text-xs font-medium text-white focus:border-primary/50 transition-colors"
                                        />
                                    </div>
                                </div>

                                {/* Special Instructions */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Special Instructions / Remarks</label>
                                    <textarea
                                        value={form.specialInstructions}
                                        onChange={e => setForm(f => ({ ...f, specialInstructions: e.target.value }))}
                                        placeholder="Enter trip schedule specifics, extra requests, or driving preferences..."
                                        rows={3}
                                        className="w-full bg-[#111113] border border-white/10 rounded-xl py-3 px-4 text-xs font-medium text-white focus:border-primary/50 transition-colors"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Review Details & Payment */}
                    {currentStep === 3 && (
                        <div className="space-y-6 animate-fadeIn">
                            <div>
                                <h2 className="text-xl font-black uppercase tracking-tight mb-2">Review Summary</h2>
                                <p className="text-xs text-gray-400">Ensure all details are correct before final submission.</p>
                            </div>

                            <div className="bg-[#111113] border border-white/5 p-5 rounded-2xl space-y-4">
                                {/* Assigned Chauffeur Summary */}
                                <div className="p-3.5 bg-black/30 border border-white/5 rounded-xl flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold shrink-0" style={{ color: accentColor }}>
                                            <Award size={16} />
                                        </div>
                                        <div className="min-w-0">
                                            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Assigned Driver</span>
                                            <h4 className="font-bold text-[12px] text-white leading-tight truncate">{form.selectedDriverName || 'Auto-Assign Best Available Driver'}</h4>
                                        </div>
                                    </div>
                                    <span className="text-[9px] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">
                                        {form.selectedDriverName ? 'Selected' : 'Auto-Assign'}
                                    </span>
                                </div>

                                {/* Purpose of Hire */}
                                <div className="p-3.5 bg-black/30 border border-white/5 rounded-xl flex items-start gap-3.5">
                                    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                                        <FileText size={15} style={{ color: accentColor }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Purpose of Hire</span>
                                        <h4 className="font-bold text-[12px] text-white leading-tight">
                                            {form.purposeOfHire === 'Other' && form.customPurpose.trim() ? form.customPurpose.trim() : form.purposeOfHire}
                                        </h4>
                                    </div>
                                </div>

                                {/* Confirmed Pick-Up Location */}
                                {form.pickupLocation && (
                                    <div className="p-3.5 bg-black/30 border border-white/5 rounded-xl flex items-start gap-3.5">
                                        <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                                            <MapPin size={15} style={{ color: accentColor }} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2 mb-0.5">
                                                <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest block">Confirmed Pick-Up Location</span>
                                                <button 
                                                    type="button" 
                                                    onClick={() => setCurrentStep(1)} 
                                                    className="text-[9px] font-bold hover:underline"
                                                    style={{ color: accentColor }}
                                                >
                                                    Edit
                                                </button>
                                            </div>
                                            <h4 className="font-bold text-[12px] text-white leading-tight">{form.pickupLocation}</h4>
                                            {form.destination && (
                                                <p className="text-[11px] text-gray-400 mt-1">Destination: {form.destination}</p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Schedule & Duration */}
                                <div className="p-3.5 bg-black/30 border border-white/5 rounded-xl flex items-start gap-3.5">
                                    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                                        <Calendar size={15} style={{ color: accentColor }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Schedule Details</span>
                                        <h4 className="font-bold text-[12px] text-white leading-tight">{formatReadableDate(form.date)}</h4>
                                        <p className="text-[10px] text-gray-500 mt-1">Time: {form.time} · Duration: {form.duration}</p>
                                    </div>
                                </div>

                                {/* Vehicle details */}
                                <div className="p-3.5 bg-black/30 border border-white/5 rounded-xl flex items-start gap-3.5">
                                    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                                        <Car size={15} style={{ color: accentColor }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Operating Vehicle</span>
                                        {form.driveCustomerCar ? (
                                            <>
                                                <h4 className="font-bold text-[12px] text-white leading-tight">{form.vehicleBrand} {form.vehicleModel}</h4>
                                                <p className="text-[10px] text-gray-500 mt-1">Plate No: <span className="font-mono bg-white/5 px-1 rounded text-white">{form.plateNumber}</span> · Type: {form.vehicleType}</p>
                                            </>
                                        ) : (
                                            <h4 className="font-bold text-[12px] text-white leading-tight">Driver will provide vehicle ({form.vehicleType})</h4>
                                        )}
                                    </div>
                                </div>

                                {/* Contact Details */}
                                <div className="p-3.5 bg-black/30 border border-white/5 rounded-xl flex items-start gap-3.5">
                                    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                                        <Phone size={15} style={{ color: accentColor }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Customer Contact</span>
                                        <h4 className="font-bold text-[12px] text-white leading-tight">{user?.name}</h4>
                                        <p className="text-[10px] text-gray-500 mt-1">Phone: {form.contactNumber}</p>
                                    </div>
                                </div>

                                {/* Notes */}
                                {form.specialInstructions && (
                                    <div className="p-3.5 bg-black/30 border border-white/5 rounded-xl flex items-start gap-3.5">
                                        <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                                            <Info size={15} style={{ color: accentColor }} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Remarks / Instructions</span>
                                            <p className="text-[10px] text-gray-400 leading-normal mt-1" style={{ wordBreak: 'break-all', overflowWrap: 'break-word' }}>{form.specialInstructions}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Segmented Pricing & Deposit Breakdown Card (50% Split matching Main Services) */}
                                <div className="bg-gradient-to-b from-[#24170E] via-[#1A140F] to-[#12100E] border-2 border-[#FE7803]/40 rounded-xl p-3.5 sm:p-4 space-y-3 relative overflow-hidden shadow-xl shadow-black/60 group">
                                    {/* Glowing Ambient Backdrop */}
                                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#FE7803]/15 rounded-full blur-2xl pointer-events-none group-hover:bg-[#FE7803]/20 transition-all duration-700"></div>

                                    {/* Card Header & Badge */}
                                    <div className="flex items-center justify-between gap-2 relative z-10 pb-2 border-b border-white/5">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <CreditCard size={14} className="text-[#FE7803] flex-shrink-0" />
                                            <span className="text-[11px] sm:text-xs font-black text-[#FE7803] tracking-wider uppercase leading-none whitespace-nowrap truncate">
                                                Payment Breakdown
                                            </span>
                                        </div>
                                        <span className="bg-[#FE7803]/20 border border-[#FE7803]/40 text-[#FE7803] text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-sm whitespace-nowrap flex-shrink-0">
                                            <Sparkles size={9} className="flex-shrink-0" /> {Math.round(depositPercentage * 100)}% Split
                                        </span>
                                    </div>

                                    {/* Cost Line Items */}
                                    <div className="space-y-1.5 text-xs relative z-10">
                                        <div className="flex justify-between text-light-gray/80">
                                            <span>Base Package ({form.duration}):</span>
                                            <span className="font-semibold text-white">₱{calculateEstimatedFee().toLocaleString()}</span>
                                        </div>

                                        {form.driveCustomerCar && driverCustomization?.customerCarDiscount ? (
                                            <div className="flex justify-between text-emerald-400 text-[11px]">
                                                <span>Customer Vehicle Discount:</span>
                                                <span>-₱{driverCustomization.customerCarDiscount.toLocaleString()}</span>
                                            </div>
                                        ) : null}

                                        <div className="flex justify-between text-light-gray/80">
                                            <span>Fuel & Toll Fees:</span>
                                            <span className="text-amber-400 text-[11px] font-semibold">Client Responsible</span>
                                        </div>

                                        <div className="pt-2 border-t border-white/5 flex justify-between items-baseline">
                                            <span className="font-bold text-white">Total Estimated Fee:</span>
                                            <span className="text-base font-black text-white">₱{calculateEstimatedFee().toLocaleString()}</span>
                                        </div>
                                    </div>

                                    {/* 2-Tier Split Amount Grid */}
                                    <div className="grid grid-cols-2 gap-2 items-center relative z-10 pt-1">
                                        {/* Initial DP (50%) - Highlighted */}
                                        <div className="bg-[#2A1A0F]/80 border border-[#FE7803]/40 rounded-lg p-2.5 shadow-inner">
                                            <div className="flex items-center gap-1 mb-0.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-[#FE7803] animate-ping"></span>
                                                <p className="text-[8px] font-black text-[#FE7803] tracking-wider uppercase leading-none">
                                                    Initial DP
                                                </p>
                                            </div>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-white font-black text-lg tracking-tight leading-none">
                                                    ₱{Math.ceil(calculateEstimatedFee() * depositPercentage).toLocaleString()}
                                                </span>
                                                <span className="text-[9px] font-black text-[#FE7803] bg-[#FE7803]/15 px-1 py-0.2 rounded">
                                                    {Math.round(depositPercentage * 100)}%
                                                </span>
                                            </div>
                                            <p className="text-[8px] font-bold text-gray-400 mt-1.5 flex items-center gap-1 leading-none">
                                                <ShieldCheck size={10} className="text-emerald-400" /> Pay Upfront
                                            </p>
                                        </div>

                                        {/* Final Balance (50%) */}
                                        <div className="bg-black/30 border border-white/5 rounded-lg p-2.5">
                                            <p className="text-[8px] font-black text-gray-400 tracking-wider uppercase mb-0.5 leading-none">
                                                Final Balance
                                            </p>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-gray-300 font-black text-base tracking-tight leading-none">
                                                    ₱{Math.floor(calculateEstimatedFee() * (1 - depositPercentage)).toLocaleString()}
                                                </span>
                                                <span className="text-[9px] font-bold text-gray-500">
                                                    {Math.round((1 - depositPercentage) * 100)}%
                                                </span>
                                            </div>
                                            <p className="text-[8px] font-bold text-gray-400 mt-1.5 flex items-center gap-1 leading-none">
                                                <CheckCircle2 size={10} className="text-[#FE7803]" /> Upon Completion
                                            </p>
                                        </div>
                                    </div>

                                    {/* Concise English Explanation Box */}
                                    <div className="bg-black/40 border border-white/5 rounded-lg px-2.5 py-2 relative z-10 flex items-center gap-2 overflow-hidden">
                                        <Info size={13} className="text-[#FE7803] flex-shrink-0" />
                                        <p className="text-[9px] font-medium text-gray-300 leading-none truncate whitespace-nowrap">
                                            Pay <strong className="text-white font-bold">{Math.round(depositPercentage * 100)}% Initial DP</strong> upfront • Remaining <strong className="text-white font-bold">{Math.round((1 - depositPercentage) * 100)}% balance</strong> settled upon completion
                                        </p>
                                    </div>

                                    {/* Footer Trust Bar */}
                                    <div className="pt-1.5 border-t border-white/5 flex items-center justify-between text-[8px] font-black tracking-wider relative z-10">
                                        <span className="text-gray-400 uppercase flex items-center gap-1">
                                            <ShieldCheck size={11} className="text-emerald-400" /> 100% Secure Payment
                                        </span>
                                        <span className="text-[#FE7803] uppercase flex items-center gap-1">
                                            <CheckCircle2 size={11} className="text-[#FE7803]" /> Protected Completion
                                        </span>
                                    </div>
                                </div>

                                {/* Payment Method Selector (HitPay Online vs GCash Manual Receipt) */}
                                <div className="space-y-2">
                                    <span className="text-xs font-bold text-light-gray/90 block">Select Payment Method</span>
                                    <div className="grid grid-cols-2 gap-2.5">
                                        <button
                                            type="button"
                                            onClick={() => setPaymentMethod('hitpay')}
                                            className={`p-3 rounded-xl border text-left transition-all duration-200 relative flex flex-col justify-between ${
                                                paymentMethod === 'hitpay'
                                                    ? 'text-white border-primary bg-primary/10 shadow-lg shadow-primary/5'
                                                    : 'border-white/5 bg-[#17171A] text-light-gray/60 hover:border-white/15'
                                            }`}
                                            style={paymentMethod === 'hitpay' ? { borderColor: accentColor, backgroundColor: `${accentColor}12` } : {}}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/5 text-white">
                                                    <ShieldCheck size={14} style={{ color: accentColor }} />
                                                </div>
                                                {paymentMethod === 'hitpay' && (
                                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                                )}
                                            </div>
                                            <div>
                                                <span className="text-xs font-black block text-white">Online Payment</span>
                                                <span className="text-[10px] font-semibold text-emerald-400 block mt-0.5">HitPay Gateway</span>
                                                <span className="text-[9px] text-light-gray/50 block mt-0.5">Cards, QR Ph, E-Wallets</span>
                                            </div>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setPaymentMethod('gcash')}
                                            className={`p-3 rounded-xl border text-left transition-all duration-200 relative flex flex-col justify-between ${
                                                paymentMethod === 'gcash'
                                                    ? 'text-white border-primary bg-primary/10 shadow-lg shadow-primary/5'
                                                    : 'border-white/5 bg-[#17171A] text-light-gray/60 hover:border-white/15'
                                            }`}
                                            style={paymentMethod === 'gcash' ? { borderColor: accentColor, backgroundColor: `${accentColor}12` } : {}}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#0055EE] text-white">
                                                    <span className="text-xs font-black">G</span>
                                                </div>
                                                {paymentMethod === 'gcash' && (
                                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                                )}
                                            </div>
                                            <div>
                                                <span className="text-xs font-black block text-white">GCash Direct</span>
                                                <span className="text-[10px] font-semibold text-blue-400 block mt-0.5">Direct QR / Number</span>
                                                <span className="text-[9px] text-light-gray/50 block mt-0.5">Upload Receipt Proof</span>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            )}

            {/* Bottom Actions Sticky bar (Steps 2 & 3) */}
            {currentStep > 1 && (
                <div className="fixed bottom-0 left-0 w-full bg-[#111113] border-t border-white/5 p-4 z-50">
                    <div className="max-w-lg mx-auto flex gap-4">
                        {currentStep < totalSteps ? (
                            <button 
                                onClick={handleNext}
                                disabled={!isStepValid()}
                                className="flex-1 hover:opacity-90 disabled:bg-white/5 disabled:text-white/30 text-white font-black uppercase tracking-widest text-[11px] py-4 flex items-center justify-center gap-2 transition-colors rounded-xl"
                                style={{ backgroundColor: isStepValid() ? accentColor : undefined }}
                            >
                                Next Step <ChevronRight size={16} />
                            </button>
                        ) : (
                            <button 
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="flex-1 hover:opacity-90 disabled:opacity-50 text-white font-black uppercase tracking-widest text-[11px] py-4 flex items-center justify-center gap-2 transition-colors rounded-xl shadow-lg"
                                style={{ backgroundColor: accentColor }}
                            >
                                {submitting ? (
                                    <Spinner size="sm" />
                                ) : paymentMethod === 'gcash' ? (
                                    `Pay ₱${Math.ceil(calculateEstimatedFee() * depositPercentage).toLocaleString()} Deposit (GCash)`
                                ) : (
                                    `Pay ₱${Math.ceil(calculateEstimatedFee() * depositPercentage).toLocaleString()} Deposit (HitPay)`
                                )}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Full-bleed Real-Time Map Location Picker Modal */}
            {locationModalTarget && (
                <DriverLocationModal
                    targetType={locationModalTarget}
                    initialCoords={locationModalTarget === 'pickup' ? startCoords : endCoords}
                    initialAddress={locationModalTarget === 'pickup' ? form.pickupLocation : form.destination}
                    accentColor={accentColor}
                    mapLogoUrl={db?.settings?.mapLogoUrl}
                    appLogoUrl={db?.settings?.appLogoUrl}
                    settings={db?.settings}
                    onClose={() => setLocationModalTarget(null)}
                    onConfirmLocation={(loc) => {
                        if (locationModalTarget === 'pickup') {
                            setStartCoords([loc.lat, loc.lng]);
                            setForm(f => ({ ...f, pickupLocation: loc.address }));
                        } else {
                            setEndCoords([loc.lat, loc.lng]);
                            setForm(f => ({ ...f, destination: loc.address }));
                        }
                        setLocationModalTarget(null);
                    }}
                />
            )}

            {/* GCash Manual Receipt Upload Modal */}
            {showGCashModal && user && (
                <GCashPaymentModal
                    bookingId={gcashBookingId}
                    totalAmount={gcashTotalAmount}
                    paymentAmount={gcashPaymentAmount}
                    customerName={user.name || 'Customer'}
                    isServiceRequest={true}
                    newBookingData={gcashBookingData}
                    services={[{ name: `Driver for Hire: ${form.purposeOfHire}`, price: gcashTotalAmount }]}
                    onPaymentVerified={() => {
                        setShowGCashModal(false);
                        setShowSuccessView(true);
                    }}
                    onClose={() => setShowGCashModal(false)}
                />
            )}

            {/* Booking Payment Success Confirmation Modal */}
            {showSuccessView && (
                <div 
                    className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4 animate-fadeIn"
                    onClick={() => {
                        setShowSuccessView(false);
                        navigate('/customer-portal/');
                    }}
                >
                    <div 
                        className="bg-[#15151A] border border-white/10 rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="w-8 h-8 text-green-400" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Driver Booking Confirmed!</h3>
                        <p className="text-xs text-light-gray/70 mb-6 leading-relaxed">
                            Your reservation deposit for Driver for Hire has been verified. The assigned driver will contact and coordinate with you shortly.
                        </p>
                        <button
                            onClick={() => {
                                setShowSuccessView(false);
                                navigate('/customer-portal/');
                            }}
                            className="w-full py-3 bg-primary hover:brightness-110 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition shadow-lg shadow-primary/25"
                            style={{ backgroundColor: accentColor }}
                        >
                            View My Bookings
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DriverBookingFlow;
