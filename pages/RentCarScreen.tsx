import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomerHeader from '../components/CustomerHeader';
import { Car, Users, Fuel, Settings, Briefcase, Calendar, UserCheck, ShieldCheck, Receipt, CheckCircle, MapPin } from 'lucide-react';
import { useDatabase } from '../context/DatabaseContext';
import Spinner from '../components/Spinner';
import FilterSelect from '../components/FilterSelect';
import { RentalCar } from '../types';
import { useAuth } from '../context/AuthContext';
import GCashPaymentModal from '../components/GCashPaymentModal';
import { HitPayService, getLiveAppOrigin } from '../services/HitPayService';
import { HitPayEmbeddedService } from '../services/HitPayEmbeddedService';
import { startPaymentWatcher, openPaymentUrl, setPendingPaymentMarker, resumePendingPaymentVerification, isNativePlatform as isNative } from '../utils/paymentRedirect';
import { doc, collection } from 'firebase/firestore';
import { db as firestore } from '../firebase';
import { getAccurateLivePosition, startPreciseWatch, safeClearWatch, reverseGeocodeCoordinates } from '../utils/locationHelper';
import { getLeafletTileConfig } from '../utils/mapTileProviders';

declare const L: any;

const RentalBookingModal: React.FC<{
    car: RentalCar;
    confirmedLocation?: { lat: number; lng: number; address: string } | null;
    onClose: () => void;
    onConfirm: (bookingDetails: { startDate: string; endDate: string; totalPrice: number; includeDriver: boolean; newId: string }) => Promise<any> | void;
    accentColor: string;
}> = ({ car, confirmedLocation, onClose, onConfirm, accentColor }) => {
    const navigate = useNavigate();
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [includeDriver, setIncludeDriver] = useState(false);
    const [error, setError] = useState('');
    const [isConfirming, setIsConfirming] = useState(false);

    const carImgUrl = useMemo(() => {
        let url = car?.imageUrl || '';
        const modelLower = (car?.model || car?.name || '').toLowerCase();
        if (!url || url.includes('placehold.co') || url.includes('picsum.photos') || url.includes('/placeholder.svg')) {
            if (modelLower.includes('montero')) return '/images/cars/montero.jpg';
            if (modelLower.includes('vios')) return '/images/cars/vios.jpg';
            if (modelLower.includes('mustang')) return '/images/cars/mustang.jpg';
            if (modelLower.includes('hiace')) return '/images/cars/hiace.jpg';
            return '/images/cars/montero.jpg';
        }
        if (url && url.endsWith('.png')) {
            return url.replace(/\.png$/, '.jpg');
        }
        return url;
    }, [car?.imageUrl, car?.model, car?.name]);

    const specs = useMemo(() => {
        const modelLower = (car?.model || car?.name || '').toLowerCase();
        
        let seats = car?.seats || 5;
        let fuelType = 'Gasoline';
        let transmission = car?.transmission || 'Automatic';
        let baggage = 2;
        
        if (modelLower.includes('montero') || modelLower.includes('fortuner')) {
            seats = 7;
            fuelType = 'Diesel';
            transmission = 'Automatic';
            baggage = 3;
        } else if (modelLower.includes('mustang') || modelLower.includes('challenger') || modelLower.includes('camaro')) {
            seats = 4;
            fuelType = 'Gas';
            transmission = 'Automatic';
            baggage = 2;
        } else if (modelLower.includes('hiace') || modelLower.includes('urvan') || modelLower.includes('starex')) {
            seats = 12;
            fuelType = 'Diesel';
            transmission = 'Manual';
            baggage = 4;
        } else if (modelLower.includes('vios') || modelLower.includes('civic') || modelLower.includes('altis') || modelLower.includes('accent') || modelLower.includes('city') || modelLower.includes('sedan')) {
            seats = 5;
            fuelType = 'Gas';
            transmission = 'Automatic';
            baggage = 2;
        } else if (modelLower.includes('mirage') || modelLower.includes('wigo') || modelLower.includes('brio') || modelLower.includes('hatchback')) {
            seats = 5;
            fuelType = 'Gas';
            transmission = 'Automatic';
            baggage = 1;
        }
        
        if (car.seats) seats = car.seats;
        if (car.transmission) transmission = car.transmission;
        if (car.fuelPolicy) {
            if (car.fuelPolicy.toLowerCase().includes('diesel')) {
                fuelType = 'Diesel';
            } else if (car.fuelPolicy.toLowerCase().includes('gas')) {
                fuelType = 'Gas';
            }
        }
        
        return { seats, fuelType, transmission, baggage };
    }, [car]);

    const validationError = useMemo(() => {
        if (!startDate || !endDate) return '';
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return 'Invalid date format.';
        if (end < start) {
            return 'End date cannot be before start date.';
        }
        return '';
    }, [startDate, endDate]);

    const { duration, basePrice, driverFee, securityDeposit, totalPrice } = useMemo(() => {
        if (!startDate || !endDate || validationError) {
            return { duration: 0, basePrice: 0, driverFee: 0, securityDeposit: 3000, totalPrice: 3000 };
        }
        const start = new Date(startDate);
        const end = new Date(endDate);
        const timeDiff = end.getTime() - start.getTime();
        const duration = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
        const basePrice = duration * car.pricePerDay;
        const driverFee = includeDriver ? (duration * 1500) : 0;
        const securityDeposit = 3000;
        const totalPrice = basePrice + driverFee + securityDeposit;
        return { duration, basePrice, driverFee, securityDeposit, totalPrice };
    }, [startDate, endDate, car.pricePerDay, includeDriver, validationError]);

    const handleConfirm = async () => {
        setError('');
        if (!startDate || !endDate) {
            setError('Please select both a start and end date.');
            return;
        }
        if (validationError) {
            setError(validationError);
            return;
        }

        setIsConfirming(true);
        try {
            const newId = doc(collection(firestore, 'rentalBookings')).id;
            await onConfirm({ startDate, endDate, totalPrice, includeDriver, newId });
            onClose();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to create booking. Please try again.');
        } finally {
            setIsConfirming(false);
        }
    };
    
    const isFormInvalid = !startDate || !endDate || !!validationError;
    
    return (
        <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-4 animate-fadeIn cursor-pointer"
            onClick={onClose}
        >
            <div 
                className="bg-[#121215] border border-white/10 rounded-2xl p-5 sm:p-6 w-full max-w-md animate-scaleUp max-h-[92vh] overflow-y-auto cursor-default shadow-2xl space-y-4"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="flex items-start justify-between gap-3 border-b border-white/5 pb-3">
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary block" style={{ color: accentColor }}>
                            Rental Booking
                        </span>
                        <h2 className="text-lg sm:text-xl font-black text-white leading-tight">
                            {car.make} {car.model}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 text-light-gray hover:text-white flex items-center justify-center text-xs font-bold transition"
                    >
                        ✕
                    </button>
                </div>

                {/* Car Hero Preview Banner */}
                <div className="relative rounded-xl overflow-hidden border border-white/10 bg-[#0A0A0C] aspect-[16/9] w-full shrink-0">
                    <img 
                        src={carImgUrl} 
                        alt={`${car.make} ${car.model}`} 
                        className="w-full h-full object-cover" 
                        width={360}
                        height={200}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-3">
                        <div className="flex items-baseline justify-between">
                            <p className="text-base sm:text-lg font-black text-white" style={{ color: accentColor }}>
                                ₱{car.pricePerDay.toLocaleString()}
                                <span className="text-[11px] text-light-gray/80 font-normal ml-1">/ day</span>
                            </p>
                            <span className="text-[10px] font-bold bg-white/10 backdrop-blur-md px-2 py-0.5 rounded text-white border border-white/10">
                                {car.year || '2024'} Model
                            </span>
                        </div>
                    </div>
                </div>

                {/* Car Specs Badges */}
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className="flex items-center gap-1 text-[10px] bg-white/5 border border-white/5 text-light-gray/90 px-2.5 py-1 rounded-lg font-semibold">
                        <Users size={11} className="text-primary" />
                        {specs.seats} Seats
                    </span>
                    <span className="flex items-center gap-1 text-[10px] bg-white/5 border border-white/5 text-light-gray/90 px-2.5 py-1 rounded-lg font-semibold">
                        <Fuel size={11} className="text-primary" />
                        {specs.fuelType}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] bg-white/5 border border-white/5 text-light-gray/90 px-2.5 py-1 rounded-lg font-semibold">
                        <Settings size={11} className="text-primary" />
                        {specs.transmission}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] bg-white/5 border border-white/5 text-light-gray/90 px-2.5 py-1 rounded-lg font-semibold">
                        <Briefcase size={11} className="text-primary" />
                        {specs.baggage} Bags
                    </span>
                </div>

                {/* Confirmed Service Location Banner */}
                {confirmedLocation && (
                    <div className="bg-[#151518] border border-white/10 rounded-xl p-2.5 flex items-start gap-2.5">
                        <div 
                            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" 
                            style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
                        >
                            <MapPin size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                                <span className="text-[10px] font-black uppercase tracking-wider text-light-gray/60">
                                    Confirmed Service / Pick-up Location
                                </span>
                                <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                                    ✓ Live GPS
                                </span>
                            </div>
                            <p className="text-xs font-semibold text-white truncate mt-0.5">
                                {confirmedLocation.address || `${confirmedLocation.lat.toFixed(5)}, ${confirmedLocation.lng.toFixed(5)}`}
                            </p>
                        </div>
                    </div>
                )}

                {/* Modern Date Selection Section */}
                <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-light-gray/90 flex items-center gap-1.5">
                            <Calendar size={13} className="text-primary" />
                            Rental Duration
                        </label>
                        {duration > 0 && !validationError && (
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary" style={{ color: accentColor, borderColor: `${accentColor}40` }}>
                                {duration} {duration === 1 ? 'Day' : 'Days'} Total
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                        <div className="relative">
                            <span className="text-[10px] font-semibold text-light-gray/60 block mb-1">Pick-up Date</span>
                            <div className="relative flex items-center">
                                <Calendar size={13} className="absolute left-3 pointer-events-none text-light-gray/60" style={{ color: startDate ? accentColor : undefined }} />
                                <input 
                                    id="rent-start-date" 
                                    name="rent-start-date" 
                                    type="date" 
                                    value={startDate} 
                                    onChange={e => {
                                        const newStart = e.target.value;
                                        setStartDate(newStart);
                                        setError('');
                                        if (endDate && endDate < newStart) {
                                            setEndDate(newStart);
                                        }
                                    }} 
                                    min={new Date().toISOString().split('T')[0]} 
                                    className={`w-full py-2.5 pl-8 pr-2 bg-[#1A1A1E] border rounded-xl outline-none transition-all text-white text-xs font-medium [color-scheme:dark] ${
                                        validationError ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-primary'
                                    }`} 
                                />
                            </div>
                        </div>

                        <div className="relative">
                            <span className="text-[10px] font-semibold text-light-gray/60 block mb-1">Return Date</span>
                            <div className="relative flex items-center">
                                <Calendar size={13} className="absolute left-3 pointer-events-none text-light-gray/60" style={{ color: endDate ? accentColor : undefined }} />
                                <input 
                                    id="rent-end-date" 
                                    name="rent-end-date" 
                                    type="date" 
                                    value={endDate} 
                                    onChange={e => {
                                        setEndDate(e.target.value);
                                        setError('');
                                    }} 
                                    min={startDate || new Date().toISOString().split('T')[0]} 
                                    className={`w-full py-2.5 pl-8 pr-2 bg-[#1A1A1E] border rounded-xl outline-none transition-all text-white text-xs font-medium [color-scheme:dark] ${
                                        validationError ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-primary'
                                    }`} 
                                />
                            </div>
                        </div>
                    </div>

                    {validationError && (
                        <p className="text-red-400 text-xs font-semibold animate-fadeIn pl-1">
                            {validationError}
                        </p>
                    )}
                </div>

                {/* Enhanced Driver Option Cards */}
                <div className="space-y-2 pt-1">
                    <span className="text-xs font-bold text-light-gray/90 block">Select Driving Mode</span>
                    <div className="grid grid-cols-2 gap-2.5">
                        <button
                            type="button"
                            onClick={() => setIncludeDriver(false)}
                            className={`p-3 rounded-xl border text-left transition-all duration-200 relative flex flex-col justify-between ${
                                !includeDriver 
                                    ? 'text-white border-primary bg-primary/10 shadow-lg shadow-primary/5' 
                                    : 'border-white/5 bg-[#17171A] text-light-gray/60 hover:border-white/15'
                            }`}
                            style={!includeDriver ? { borderColor: accentColor, backgroundColor: `${accentColor}12` } : {}}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${!includeDriver ? 'bg-primary text-white' : 'bg-white/5 text-light-gray/60'}`} style={!includeDriver ? { backgroundColor: accentColor } : {}}>
                                    <Car size={14} />
                                </div>
                                {!includeDriver && (
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                )}
                            </div>
                            <div>
                                <span className="text-xs font-black block text-white">Self Drive</span>
                                <span className="text-[10px] font-semibold text-emerald-400 block mt-0.5">No Extra Fee</span>
                                <span className="text-[9px] text-light-gray/50 block mt-0.5">Valid License Required</span>
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => setIncludeDriver(true)}
                            className={`p-3 rounded-xl border text-left transition-all duration-200 relative flex flex-col justify-between ${
                                includeDriver 
                                    ? 'text-white border-primary bg-primary/10 shadow-lg shadow-primary/5' 
                                    : 'border-white/5 bg-[#17171A] text-light-gray/60 hover:border-white/15'
                            }`}
                            style={includeDriver ? { borderColor: accentColor, backgroundColor: `${accentColor}12` } : {}}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${includeDriver ? 'bg-primary text-white' : 'bg-white/5 text-light-gray/60'}`} style={includeDriver ? { backgroundColor: accentColor } : {}}>
                                    <UserCheck size={14} />
                                </div>
                                {includeDriver && (
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                )}
                            </div>
                            <div>
                                <span className="text-xs font-black block text-white">With Driver</span>
                                <span className="text-[10px] font-semibold text-amber-400 block mt-0.5">+₱1,500 / day</span>
                                <span className="text-[9px] text-light-gray/50 block mt-0.5">Vetted Professional</span>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Segmented Receipt Breakdown Card */}
                <div 
                    className={`overflow-hidden transition-all duration-300 ease-out bg-[#0D0D10] rounded-xl border border-white/5 ${
                        duration > 0 && !validationError 
                            ? 'max-h-[350px] opacity-100 p-3.5 mt-2' 
                            : 'max-h-0 opacity-0 p-0 border-transparent m-0'
                    }`}
                >
                    <div className="space-y-2.5 divide-y divide-white/5">
                        <div className="space-y-2 text-xs">
                            <div className="flex justify-between items-center text-light-gray/80">
                                <span className="flex items-center gap-2 font-medium">
                                    <Car size={12} className="text-primary" />
                                    Base Vehicle Rent ({duration} {duration > 1 ? 'days' : 'day'})
                                </span>
                                <span className="font-bold text-white">₱{basePrice.toLocaleString()}</span>
                            </div>

                            {includeDriver && (
                                <div className="flex justify-between items-center text-light-gray/80 animate-fadeIn">
                                    <span className="flex items-center gap-2 font-medium">
                                        <UserCheck size={12} className="text-teal-400" />
                                        Professional Driver Fee
                                    </span>
                                    <span className="font-bold text-white">₱{driverFee.toLocaleString()}</span>
                                </div>
                            )}

                            <div className="flex justify-between items-center text-light-gray/80">
                                <span className="flex items-center gap-2 font-medium">
                                    <ShieldCheck size={12} className="text-emerald-400" />
                                    Security Deposit <span className="text-[9px] text-emerald-400 font-bold">(Refundable)</span>
                                </span>
                                <span className="font-bold text-white">₱{securityDeposit.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="pt-2.5 flex justify-between items-baseline">
                            <span className="flex items-center gap-1.5 text-xs font-black text-white uppercase tracking-wider">
                                <Receipt size={13} className="text-primary" />
                                Total Estimated
                            </span>
                            <span className="text-lg sm:text-xl font-black" style={{ color: accentColor }}>
                                ₱{totalPrice.toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>

                {error && <p className="text-red-400 text-xs text-center font-semibold">{error}</p>}

                {/* Modal Actions */}
                <div className="flex items-center gap-3 pt-2">
                    <button 
                        type="button"
                        onClick={onClose} 
                        className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition border border-white/5"
                    >
                        Cancel
                    </button>
                    <button 
                        type="button"
                        onClick={handleConfirm} 
                        disabled={isConfirming || isFormInvalid} 
                        style={{ backgroundColor: isFormInvalid ? 'rgba(255,255,255,0.05)' : accentColor }}
                        className="flex-1 py-3 text-white text-xs font-black uppercase tracking-wider rounded-xl hover:brightness-110 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shadow-lg shadow-primary/20"
                    >
                        {isConfirming ? <Spinner size="sm" /> : 'Confirm Booking'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const RentCarLocationModal: React.FC<{
    car: RentalCar;
    accentColor: string;
    onClose: () => void;
    onConfirmLocation: (location: { lat: number; lng: number; address: string }) => void;
}> = ({ car, accentColor, onClose, onConfirmLocation }) => {
    const { db } = useDatabase();
    const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [address, setAddress] = useState<string>('');
    const [isAddressLoading, setIsAddressLoading] = useState<boolean>(false);
    const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
    const [isTrackingLive, setIsTrackingLive] = useState<boolean>(true);
    const [locationStatus, setLocationStatus] = useState<'idle' | 'fetching' | 'success' | 'error'>('fetching');
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

    // Initial Live Location Acquisition
    useEffect(() => {
        let isMounted = true;
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
            console.warn("[RentCarLocationModal] GPS fallback to default:", err);
            if (!isMounted) return;
            const fallback = { lat: 14.3149, lng: 121.0583 };
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
    }, [fetchAddress, isTrackingLive]);

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

        const tileConfig = getLeafletTileConfig(db?.settings);
        L.tileLayer(tileConfig.url, tileConfig.options).addTo(map);

        const locationIcon = L.divIcon({
            html: `<div class="rb-location-pin-wrapper">
                <div class="rb-location-circle">
                    <img src="${db?.settings?.mapLogoUrl || db?.settings?.appLogoUrl || '/favicon.png'}" alt="Location" onerror="this.style.display='none'" style="width:28px;height:28px;object-fit:contain;border-radius:50%;" />
                </div>
                <div class="rb-location-stem"></div>
                <div class="rb-location-dot"></div>
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
    }, [coords !== null, leafletLoaded, db?.settings, fetchAddress]); // eslint-disable-line

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

    const carImgUrl = useMemo(() => {
        let url = car?.imageUrl || '';
        const modelLower = (car?.model || car?.name || '').toLowerCase();
        if (!url || url.includes('placehold.co') || url.includes('picsum.photos') || url.includes('/placeholder.svg')) {
            if (modelLower.includes('montero')) return '/images/cars/montero.jpg';
            if (modelLower.includes('vios')) return '/images/cars/vios.jpg';
            if (modelLower.includes('mustang')) return '/images/cars/mustang.jpg';
            if (modelLower.includes('hiace')) return '/images/cars/hiace.jpg';
            return '/images/cars/montero.jpg';
        }
        return url;
    }, [car?.imageUrl, car?.model, car?.name]);

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
                        <h3 className="text-base sm:text-lg font-black text-white leading-tight drop-shadow-md">
                            Confirm Service Location
                        </h3>
                        <p className="text-[10px] text-gray-300 font-bold tracking-wide leading-none mt-1 drop-shadow-md">
                            Your rental vehicle will be dispatched or prepared here.
                        </p>
                    </div>
                </div>

                {/* Selected vehicle mini-chip */}
                <div className="hidden sm:flex items-center gap-2 bg-[#1A1A1E]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 shadow-lg pointer-events-auto shrink-0">
                    <img src={carImgUrl} alt={car.name} className="w-8 h-6 object-cover rounded-md" />
                    <div className="text-left">
                        <span className="text-[11px] font-bold text-white block leading-tight truncate max-w-[120px]">
                            {car.brand || ''} {car.model || car.name}
                        </span>
                        <span className="text-[9px] font-semibold text-primary block leading-none" style={{ color: accentColor }}>
                            ₱{car.pricePerDay.toLocaleString()}/day
                        </span>
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
                            style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
                        >
                            <MapPin size={15} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <span className="text-[10px] font-black text-light-gray/60 uppercase tracking-wider block">
                                Selected Location
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
                                <span>Confirm Location</span>
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

const RentalCarCard: React.FC<{
    car: RentalCar;
    onRent: (car: RentalCar) => void;
    accentColor: string;
}> = ({ car, onRent, accentColor }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const carImgUrl = useMemo(() => {
        let url = car?.imageUrl || '';
        const modelLower = (car?.model || car?.name || '').toLowerCase();
        if (!url || url.includes('placehold.co') || url.includes('picsum.photos') || url.includes('/placeholder.svg')) {
            if (modelLower.includes('montero')) return '/images/cars/montero.jpg';
            if (modelLower.includes('vios')) return '/images/cars/vios.jpg';
            if (modelLower.includes('mustang')) return '/images/cars/mustang.jpg';
            if (modelLower.includes('hiace')) return '/images/cars/hiace.jpg';
            return '/images/cars/montero.jpg';
        }
        if (url && url.endsWith('.png')) {
            return url.replace(/\.png$/, '.jpg');
        }
        return url;
    }, [car?.imageUrl, car?.model, car?.name]);

    const specs = useMemo(() => {
        const modelLower = (car?.model || car?.name || '').toLowerCase();
        
        let seats = car?.seats || 5;
        let fuelType = car?.engineType || 'Gasoline';
        let transmission = car?.transmission || 'Automatic';
        let baggage = car?.baggageCapacity || 2;
        let mileage = car?.mileageLimit || 'Unlimited Mileage';
        let insurance = car?.insuranceIncluded || 'Comprehensive Insurance';
        let deposit = car?.depositAmount || 3000;
        let fuelPolicy = car?.fuelPolicy || 'Full to Full';
        
        if (modelLower.includes('montero') || modelLower.includes('fortuner')) {
            seats = car.seats || 7;
            fuelType = 'Diesel';
            transmission = car.transmission || 'Automatic';
            baggage = car.baggageCapacity || 3;
        } else if (modelLower.includes('mustang') || modelLower.includes('challenger') || modelLower.includes('camaro')) {
            seats = car.seats || 4;
            fuelType = 'Gasoline';
            transmission = car.transmission || 'Automatic';
            baggage = car.baggageCapacity || 2;
        } else if (modelLower.includes('hiace') || modelLower.includes('urvan') || modelLower.includes('starex')) {
            seats = car.seats || 12;
            fuelType = 'Diesel';
            transmission = car.transmission || 'Manual';
            baggage = car.baggageCapacity || 4;
        } else if (modelLower.includes('vios') || modelLower.includes('civic') || modelLower.includes('altis') || modelLower.includes('city') || modelLower.includes('sedan')) {
            seats = car.seats || 5;
            fuelType = 'Gasoline';
            transmission = car.transmission || 'Automatic';
            baggage = car.baggageCapacity || 2;
        } else if (modelLower.includes('mirage') || modelLower.includes('wigo') || modelLower.includes('brio') || modelLower.includes('hatchback')) {
            seats = car.seats || 5;
            fuelType = 'Gasoline';
            transmission = car.transmission || 'Automatic';
            baggage = car.baggageCapacity || 1;
        }
        
        if (car.seats) seats = car.seats;
        if (car.transmission) transmission = car.transmission;
        if (car.fuelPolicy) {
            if (car.fuelPolicy.toLowerCase().includes('diesel')) {
                fuelType = 'Diesel';
            } else if (car.fuelPolicy.toLowerCase().includes('gas')) {
                fuelType = 'Gasoline';
            }
        }
        
        return { seats, fuelType, transmission, baggage, mileage, insurance, deposit, fuelPolicy };
    }, [car]);

    const defaultFeatures = useMemo(() => {
        if (car.features && car.features.length > 0) return car.features;
        return ['Air Conditioning', 'Bluetooth Audio', 'Touchscreen Infotainment', 'Reverse Camera / Sensors', 'Dual Front Airbags', '24/7 Roadside Assistance'];
    }, [car.features]);

    return (
        <div className="bg-[#141416] rounded-2xl overflow-hidden shadow-lg border border-white/5 hover:border-white/15 transition-all duration-300 animate-fadeIn">
            {/* Top Main Card Section */}
            <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row gap-3.5">
                {/* Left side: Vehicle Image */}
                <div className="w-full sm:w-36 h-32 sm:h-28 rounded-xl overflow-hidden shrink-0 bg-[#0B0B0C] relative border border-white/5">
                    <img 
                        src={carImgUrl} 
                        alt={`${car.make} ${car.model}`} 
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" 
                        loading="lazy"
                    />
                    <div className="absolute top-2 left-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-black/75 backdrop-blur-md text-white/90 px-2 py-0.5 rounded border border-white/10">
                            {car.type}
                        </span>
                    </div>
                </div>
                
                {/* Right side: Summary Details */}
                <div className="flex-grow flex flex-col justify-between min-w-0">
                    <div>
                        {/* Header: Name & Availability */}
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div>
                                <h3 className="text-base sm:text-lg font-black text-white truncate tracking-tight">
                                    {car.year} {car.make} {car.model}
                                </h3>
                                {car.plateNumber && (
                                    <span className="text-[10px] font-mono text-light-gray/60 tracking-wider">
                                        Plate: {car.plateNumber}
                                    </span>
                                )}
                            </div>
                            
                            {car.isAvailable ? (
                                <span className="shrink-0 text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded-full flex items-center gap-1.5 shadow-sm shadow-emerald-950">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    Available
                                </span>
                            ) : (
                                <span className="shrink-0 text-[10px] font-bold bg-rose-500/10 border border-rose-500/30 text-rose-400 px-2 py-0.5 rounded-full flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                                    Booked
                                </span>
                            )}
                        </div>
                        
                        {/* Primary Specs Badges */}
                        <div className="flex flex-wrap gap-1.5 mb-2.5">
                            <span className="flex items-center gap-1 text-[11px] bg-white/5 border border-white/5 text-light-gray/90 px-2 py-0.5 rounded-md font-medium">
                                <Users size={11} className="text-primary" />
                                {specs.seats} Seats
                            </span>
                            <span className="flex items-center gap-1 text-[11px] bg-white/5 border border-white/5 text-light-gray/90 px-2 py-0.5 rounded-md font-medium">
                                <Fuel size={11} className="text-primary" />
                                {specs.fuelType}
                            </span>
                            <span className="flex items-center gap-1 text-[11px] bg-white/5 border border-white/5 text-light-gray/90 px-2 py-0.5 rounded-md font-medium">
                                <Settings size={11} className="text-primary" />
                                {specs.transmission}
                            </span>
                            <span className="flex items-center gap-1 text-[11px] bg-white/5 border border-white/5 text-light-gray/90 px-2 py-0.5 rounded-md font-medium">
                                <Briefcase size={11} className="text-primary" />
                                {specs.baggage} Bags
                            </span>
                        </div>
                    </div>
                    
                    {/* Action Bar: Price + Dropdown Toggle + Rent Button */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5 mt-auto">
                        <div>
                            <span className="text-[10px] text-light-gray/60 uppercase font-bold tracking-wider block">Daily Rate</span>
                            <p className="text-lg sm:text-xl font-black leading-none" style={{ color: accentColor }}>
                                ₱{car.pricePerDay.toLocaleString()}
                                <span className="text-[10px] font-normal text-light-gray/70 ml-1">/ day</span>
                            </p>
                        </div>
                        
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                                type="button"
                                onClick={() => setIsExpanded(prev => !prev)}
                                className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all duration-200 ${
                                    isExpanded 
                                        ? 'bg-white/10 border-white/20 text-white' 
                                        : 'bg-white/5 border-white/5 text-light-gray hover:text-white hover:bg-white/10'
                                }`}
                            >
                                <span className="whitespace-nowrap">{isExpanded ? 'Hide' : 'Details'}</span>
                                <div className={`transform transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </button>

                            <button 
                                onClick={() => onRent(car)}
                                disabled={!car.isAvailable}
                                style={car.isAvailable ? { backgroundColor: accentColor } : undefined}
                                className="px-4 py-2 bg-primary text-white text-xs font-black uppercase tracking-wider rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-md shadow-primary/20 disabled:bg-white/10 disabled:text-white/30 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none whitespace-nowrap shrink-0"
                            >
                                Rent Now
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Expandable Dropdown Details Section */}
            <div 
                className={`overflow-hidden transition-all duration-300 ease-in-out border-t ${
                    isExpanded 
                        ? 'max-h-[600px] opacity-100 border-white/10 bg-[#0E0E10] p-4' 
                        : 'max-h-0 opacity-0 border-transparent p-0'
                }`}
            >
                <div className="space-y-4">
                    {/* Vehicle Description */}
                    {car.description && (
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-light-gray/50 block mb-1">
                                // Overview
                            </span>
                            <p className="text-xs text-light-gray/90 leading-relaxed font-medium">
                                {car.description}
                            </p>
                        </div>
                    )}

                    {/* Extended Technical Specifications Grid */}
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-light-gray/50 block mb-2">
                            // Specifications & Policy
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                                <span className="text-[10px] text-light-gray/60 block">Fuel Policy</span>
                                <span className="font-bold text-white mt-0.5 block">{specs.fuelPolicy}</span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                                <span className="text-[10px] text-light-gray/60 block">Mileage Limit</span>
                                <span className="font-bold text-white mt-0.5 block">{specs.mileage}</span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                                <span className="text-[10px] text-light-gray/60 block">Insurance</span>
                                <span className="font-bold text-white mt-0.5 block">{specs.insurance}</span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                                <span className="text-[10px] text-light-gray/60 block">Security Deposit</span>
                                <span className="font-bold text-white mt-0.5 block">₱{specs.deposit.toLocaleString()} (Refundable)</span>
                            </div>
                        </div>
                    </div>

                    {/* Features & Inclusions */}
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-light-gray/50 block mb-2">
                            // Key Features & Equipment
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                            {defaultFeatures.map((feat, idx) => (
                                <div key={idx} className="flex items-center gap-1.5 text-[11px] text-light-gray/90 font-medium">
                                    <CheckCircle size={12} className="text-emerald-400 shrink-0" />
                                    <span className="truncate">{feat}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quick Rent Action Inside Dropdown */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-white/5">
                        <span className="text-[11px] text-light-gray/70">
                            Available with Optional Professional Driver (+₱1,500/day)
                        </span>
                        <button
                            type="button"
                            onClick={() => onRent(car)}
                            disabled={!car.isAvailable}
                            style={car.isAvailable ? { backgroundColor: accentColor } : undefined}
                            className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 whitespace-nowrap shrink-0 inline-flex items-center justify-center"
                        >
                            Proceed to Booking
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const RentCarScreen: React.FC = () => {
    const { db, addRentalBooking, updateRentalBooking, loading } = useDatabase();
    const { user } = useAuth();
    const navigate = useNavigate();

    // Native: resume pending payment watch (custom tab re-entry / process death)
    useEffect(() => {
        if (!isNative()) return;
        const stop = resumePendingPaymentVerification(
            (marker) => navigate(marker.returnRoute, { state: { payment_completed: '1' } }),
            () => {}
        );
        return () => { stop?.(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const [selectedCar, setSelectedCar] = useState<RentalCar | null>(null);
    const [locatingCar, setLocatingCar] = useState<RentalCar | null>(null);
    const [confirmedLocation, setConfirmedLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
    const [activeCategory, setActiveCategory] = useState<string>('All');
    const [sortBy, setSortBy] = useState<string>('Featured');

    // GCash payment modal states
    const [showGCashModal, setShowGCashModal] = useState(false);
    const [gcashBookingData, setGcashBookingData] = useState<any>(null);
    const [bookingId, setBookingId] = useState<string>('');
    const [totalPriceState, setTotalPriceState] = useState<number>(0);
    const [showSuccessView, setShowSuccessView] = useState(false);

    const accentColor = db?.settings?.accentColor || '#FE7803';

    // Note: Do not abort or cancel bookings on background page load/refresh during normal flow


    const handleConfirmBooking = async (bookingDetails: { startDate: string; endDate: string; totalPrice: number; includeDriver: boolean; newId: string }) => {
        if (!user) {
            throw new Error('User session not found. Please log in.');
        }
        if (!selectedCar) {
            throw new Error('No car selected.');
        }

        const isManualGcashEnabled = db?.settings?.gcashEnabled ?? false;
        const isHitPayActive = HitPayService.isGatewayActive(db?.settings);

        const pendingBookingData = {
            carId: selectedCar.id,
            customerId: user.uid || user.id,
            userId: user.uid || user.id,
            customerName: user.name || 'Customer',
            customerEmail: user.email || '',
            carName: `${selectedCar.brand || ''} ${selectedCar.model || selectedCar.name || ''}`.trim(),
            vehicleModel: selectedCar.model || selectedCar.name || '',
            carImage: selectedCar.imageUrl || '',
            startDate: bookingDetails.startDate,
            endDate: bookingDetails.endDate,
            totalPrice: bookingDetails.totalPrice,
            totalAmount: bookingDetails.totalPrice,
            downpaymentAmount: bookingDetails.totalPrice * 0.5,
            remainingBalance: bookingDetails.totalPrice * 0.5,
            paidAmount: 0,
            includeDriver: bookingDetails.includeDriver,
            location: confirmedLocation ? {
                latitude: confirmedLocation.lat,
                longitude: confirmedLocation.lng,
                address: confirmedLocation.address
            } : undefined,
            pickupLocation: confirmedLocation?.address || '',
            status: 'Pending',
            paymentStatus: 'pending',
            isPaid: false,
            isRental: true
        };

        if (!isHitPayActive) {
            throw new Error("Online Payment Gateway (HitPay) is required for rental reservations but currently inactive in system settings. Please contact the administrator.");
        }

        const createdRental = await addRentalBooking(pendingBookingData);
        if (!createdRental) throw new Error("Failed to save rental booking.");

        const isSandbox = db?.settings?.hitpaySandboxMode === true;
        const downpayment = bookingDetails.totalPrice * 0.5;
        const refNumber = `RNT-${createdRental.id}-DP`;

        sessionStorage.setItem('pendingHitPayServiceTx', JSON.stringify({
            bookingId: createdRental.id,
            amount: downpayment,
            totalAmount: bookingDetails.totalPrice,
            currentPaid: 0,
            isRental: true,
            fullBooking: {
                ...pendingBookingData,
                id: createdRental.id,
                totalAmount: bookingDetails.totalPrice,
                downpaymentAmount: downpayment,
                remainingBalance: downpayment,
                paidAmount: 0
            },
            leavingTimestamp: Date.now()
        }));

        const result = await HitPayEmbeddedService.startCheckout({
            entityKind: 'rental',
            entityId: createdRental.id,
            amount: downpayment,
            currency: db?.settings?.currency || 'PHP',
            referenceNumber: refNumber,
            purpose: `RidersBUD — Car Rental 50% Deposit (${selectedCar.make} ${selectedCar.model})`,
            customerEmail: user.email || 'customer@example.com',
            customerName: user.name || 'Customer',
            customerPhone: user.phone || undefined,
            returnRoute: `/customer-portal/?bookingId=${createdRental.id}&isRental=true`,
            isSandbox,
            settings: db?.settings
        });

        if (result.redirected) {
            return;
        }

        if (result.paymentState === 'PAID') {
            const params = new URLSearchParams({
                bookingId: createdRental.id,
                isRental: 'true'
            });
            if (result.paymentRequestId) params.set('payment_request_id', result.paymentRequestId);
            if (result.referenceNumber) params.set('reference', result.referenceNumber);
            navigate(`/customer-portal/?${params.toString()}`, { state: { rentalSuccess: true } });
        } else if (result.paymentState !== 'CANCELLED' && !result.success) {
            alert(result.errorMessage || 'Failed to complete payment.');
        }
        return;
    };

    const filteredCars = useMemo(() => {
        if (!db?.rentalCars) return [];
        let result = [...db.rentalCars];
        
        // Category Filter
        if (activeCategory !== 'All') {
            const catLower = activeCategory.toLowerCase();
            result = result.filter(car => {
                const typeLower = car.type.toLowerCase();
                if (catLower === 'sports/luxury') {
                    return typeLower.includes('sports') || typeLower.includes('luxury');
                }
                return typeLower.includes(catLower);
            });
        }
        
        // Sort Filter
        if (sortBy === 'Price: Low to High') {
            result.sort((a, b) => a.pricePerDay - b.pricePerDay);
        } else if (sortBy === 'Price: High to Low') {
            result.sort((a, b) => b.pricePerDay - a.pricePerDay);
        } else if (sortBy === 'Seats: Most to Least') {
            result.sort((a, b) => b.seats - a.seats);
        }
        
        return result;
    }, [db, activeCategory, sortBy]);

    if (loading || !db) {
        return (
            <div className="flex flex-col h-full bg-secondary">
                <CustomerHeader title="Rent a Car" showBackButton icon={<Car size={22} />} />
                <div className="flex-grow flex items-center justify-center">
                    <Spinner size="lg" />
                </div>
            </div>
        );
    }
    
    return (
        <div className="flex flex-col h-full bg-secondary">
            <CustomerHeader title="Rent a Car" showBackButton icon={<Car size={22} />} />
            
            {/* Filter and Sorting Bar */}
            <div className="bg-[#0F172A] px-3 sm:px-4 py-2.5 sm:py-3 border-b border-[rgba(255,255,255,0.06)] shrink-0">
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <FilterSelect
                        label="Category"
                        options={[
                            { value: 'All', label: 'All' },
                            { value: 'SUV', label: 'SUV' },
                            { value: 'Sedan', label: 'Sedan' },
                            { value: 'Van', label: 'Van' },
                            { value: 'Hatchback', label: 'Hatchback' },
                            { value: 'Sports/Luxury', label: 'Sports/Luxury' },
                        ]}
                        value={activeCategory}
                        onChange={setActiveCategory}
                        accentColor={accentColor}
                    />
                    <FilterSelect
                        label="Sort By"
                        options={[
                            { value: 'Featured', label: 'Featured' },
                            { value: 'Price: Low to High', label: 'Price: Low to High' },
                            { value: 'Price: High to Low', label: 'Price: High to Low' },
                            { value: 'Seats: Most to Least', label: 'Seats: Most to Least' },
                        ]}
                        value={sortBy}
                        onChange={setSortBy}
                        accentColor={accentColor}
                    />
                </div>
                <div className="mt-2.5 sm:mt-3 text-[10px] sm:text-[11px] font-medium text-[rgba(255,255,255,0.4)] tracking-wide">
                    {filteredCars.length} vehicle{filteredCars.length !== 1 ? 's' : ''} found
                </div>
            </div>

            <main className="flex-grow overflow-y-auto p-4 space-y-3">
                {filteredCars.length > 0 ? (
                    filteredCars.map(car => (
                        <RentalCarCard 
                            key={car.id} 
                            car={car} 
                            onRent={(car) => {
                                setLocatingCar(car);
                                setConfirmedLocation(null);
                            }} 
                            accentColor={accentColor}
                        />
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Car size={40} className="text-light-gray/30 mb-2" />
                        <p className="text-sm text-light-gray">No vehicles available in this category.</p>
                    </div>
                )}
            </main>

            {/* Step 1: Real-time Live Location Confirmation Modal */}
            {locatingCar && (
                <RentCarLocationModal
                    car={locatingCar}
                    accentColor={accentColor}
                    onClose={() => setLocatingCar(null)}
                    onConfirmLocation={(loc) => {
                        setConfirmedLocation(loc);
                        setSelectedCar(locatingCar);
                        setLocatingCar(null);
                    }}
                />
            )}

            {/* Step 2: Rental Booking Details Modal */}
            {selectedCar && (
                <RentalBookingModal 
                    car={selectedCar}
                    confirmedLocation={confirmedLocation}
                    onClose={() => setSelectedCar(null)}
                    onConfirm={handleConfirmBooking}
                    accentColor={accentColor}
                />
            )}

            {showGCashModal && user && (
                <GCashPaymentModal
                    bookingId={bookingId}
                    totalAmount={totalPriceState}
                    paymentAmount={totalPriceState * 0.5}
                    customerName={user.name}
                    isRental={true}
                    newBookingData={gcashBookingData}
                    services={[{ name: `Rent a Car: ${selectedCar?.make || ''} ${selectedCar?.model || ''}`, price: totalPriceState }]}
                    onPaymentVerified={() => {
                        setShowGCashModal(false);
                        setShowSuccessView(true);
                    }}
                    onClose={() => setShowGCashModal(false)}
                />
            )}

            {showSuccessView && (
                <div 
                    className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4"
                    onClick={() => {
                        setShowSuccessView(false);
                        navigate('/customer-portal/');
                    }}
                >
                    <div 
                        className="bg-[#15151A] border border-white/10 rounded-2xl p-6 w-full max-w-sm text-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="w-8 h-8 text-green-400" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Booking Payment Confirmed!</h3>
                        <p className="text-xs text-light-gray mb-6">
                            Your downpayment for the car rental has been verified. You can check the status in your bookings.
                        </p>
                        <button
                            onClick={() => {
                                setShowSuccessView(false);
                                navigate('/customer-portal/');
                            }}
                            className="w-full py-2.5 bg-primary hover:bg-orange-600 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition"
                            style={{ backgroundColor: accentColor }}
                        >
                            View Bookings
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RentCarScreen;
