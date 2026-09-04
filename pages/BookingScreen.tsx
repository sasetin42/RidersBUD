import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Spinner from '../components/Spinner';
import { useAuth } from '../context/AuthContext';
import { useDatabase } from '../context/DatabaseContext';
import { Service, Mechanic, Booking, Vehicle, Settings } from '../types';
import { getNotificationSettings, showNotification } from '../utils/notificationManager';
import GCashPaymentModal from '../components/GCashPaymentModal';
import { Clock, Star, CalendarRange, ShieldCheck, CheckCircle2, AlertCircle, Sparkles, Info, CreditCard, Navigation } from 'lucide-react';
import CustomerHeader from '../components/CustomerHeader';
import { getFallbackImageForCategory, normalizeServiceImage } from '../utils/fallbackImages';
import Tooltip from '../components/ui/Tooltip';
import { doc, collection } from 'firebase/firestore';
import { db as firestore } from '../firebase';
import { HitPayService } from '../services/HitPayService';
import { seedRentalCars as mockCars, seedHireDrivers as mockDrivers } from '../data/mockData';
import LiveRouteMapModal from '../components/LiveRouteMapModal';
import BookingPaymentBreakdownModal from '../components/BookingPaymentBreakdownModal';


declare const L: any;

const ServiceSelectionCard: React.FC<{ service: Service, isSelected: boolean, onSelect: (serviceId: string) => void }> = ({ service, isSelected, onSelect }) => (
    <div
        onClick={() => onSelect(service.id)}
        className={`relative bg-[#1E1E1E] rounded-xl p-3 cursor-pointer transition-all duration-200 border-2 group hover:shadow-lg ${isSelected
            ? 'border-primary shadow-lg shadow-primary/20 scale-[1.01]'
            : 'border-white/5 hover:border-primary/50'
            }`}
    >
        <div className="flex items-center gap-4">
            {/* Image / Icon Section */}
            <div className={`w-20 h-20 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors overflow-hidden relative ${isSelected ? 'bg-primary/10' : 'bg-white/5 group-hover:bg-primary/5'}`}>
                {(() => {
                    const normalized = normalizeServiceImage(service.imageUrl, service.category);
                    return (
                        <img src={normalized} alt={service.name} className={`w-full h-full object-cover transition-transform duration-500 ${isSelected ? 'scale-110 opacity-90' : 'group-hover:scale-110 opacity-70'}`} onError={(e) => { (e.target as HTMLImageElement).src = getFallbackImageForCategory(service.category); }} />
                    );
                })()}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#1E1E1E]/20" />
            </div>

            {/* Content Section */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] font-bold text-gray-500  tracking-wider bg-white/5 px-1.5 py-0.5 rounded">{service.category}</span>
                    {service.estimatedTime && (
                        <span className="text-[9px] font-bold text-gray-500  tracking-wider flex items-center gap-1">
                            <Clock size={10} className="text-primary" /> {service.estimatedTime}
                        </span>
                    )}
                </div>
                
                <h4 className="font-bold text-white truncate text-sm mb-1 group-hover:text-primary transition-colors">
                    {service.name}
                </h4>
                
                <p className="text-xs font-black" style={{ color: isSelected ? '#FF6B00' : '#9CA3AF' }}>
                    ₱{(service.price || 0).toLocaleString()}
                </p>
            </div>

            {/* Selection Indicator */}
            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 shadow-md ${isSelected
                ? 'bg-primary scale-100'
                : 'bg-black/40 border border-white/20 scale-0 group-hover:scale-100'
                }`}>
                {isSelected && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                )}
            </div>
        </div>
    </div>
);

const MechanicAvailabilityCard: React.FC<{
    mechanic: Mechanic;
    distance?: number;
    isBusy: boolean;
    onSelect: (mechanic: Mechanic) => void;
}> = ({ mechanic, distance, isBusy, onSelect }) => {
    const navigate = useNavigate();

    const getStatusInfo = () => {
        if (isBusy) {
            return {
                label: 'ON A JOB',
                color: 'bg-red-500/10 text-red-400 border-red-500/20',
                dotColor: 'bg-red-500'
            };
        }
        return {
            label: 'Available Now',
            color: 'bg-green-500/10 text-green-400 border-green-500/20',
            dotColor: 'bg-green-500'
        };
    };

    const status = getStatusInfo();

    return (
        <div
            onClick={() => !isBusy && onSelect(mechanic)}
            className={`relative group bg-[#141414] rounded-2xl border-2 overflow-hidden transition-all duration-300 shadow-md ${
                isBusy
                    ? 'border-white/5 opacity-60 cursor-not-allowed'
                    : 'border-white/10 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 hover:scale-[1.01] cursor-pointer'
            }`}
        >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/10 to-orange-600/10 rounded-2xl opacity-0 group-hover:opacity-100 transition duration-300 blur-sm pointer-events-none"></div>
            
            <div className="relative p-5 flex flex-col gap-4">
                {/* Top Row: Profile Image + Name & Ratings */}
                <div className="flex items-start gap-4">
                    {/* Profile Image with Pulsing Status Indicator */}
                    <div className="relative flex-shrink-0">
                        <img
                            src={mechanic.imageUrl}
                            alt={mechanic.name}
                            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border border-white/10 group-hover:border-primary/40 transition-colors"
                        />
                        <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#141414] border border-white/5">
                            <span className={`relative flex h-2.5 w-2.5 rounded-full ${status.dotColor}`}>
                                {!isBusy && (
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                )}
                            </span>
                        </div>
                    </div>

                    {/* Details Column */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base sm:text-lg font-black text-white truncate group-hover:text-primary transition-colors">
                                {mechanic.name}
                            </h3>
                            {mechanic.verificationStatus === 'verified' && (
                                <span className="flex items-center gap-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">
                                    Verified Pro
                                </span>
                            )}
                        </div>

                        {/* Rating, Distance and Status overview */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                            <div className="flex items-center gap-1">
                                <Star size={13} className="fill-yellow-400 text-yellow-400 filter drop-shadow-[0_0_4px_rgba(250,204,21,0.4)]" />
                                <span className="text-xs font-black text-white">{(mechanic.rating || 0).toFixed(1)}</span>
                                <span className="text-[10px] text-gray-500">({mechanic.reviews || 0} jobs)</span>
                            </div>

                            <div className="w-1 h-1 bg-gray-700 rounded-full hidden sm:block"></div>

                            {distance !== undefined && (
                                <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold">
                                    <span className="text-primary">📍</span>
                                    <span>{distance.toFixed(1)} km away</span>
                                </div>
                            )}

                            <div className="w-1 h-1 bg-gray-700 rounded-full hidden sm:block"></div>

                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${status.color}`}>
                                {status.label}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Middle Row: Bio Snippet & Skills tags below profile image */}
                <div className="space-y-2">
                    {/* Bio snippet */}
                    {mechanic.bio && (
                        <p className="text-xs text-gray-400 font-medium group-hover:text-gray-300 transition-colors">
                            {mechanic.bio.split(' ').length > 15 
                                ? mechanic.bio.split(' ').slice(0, 15).join(' ') + '...'
                                : mechanic.bio}
                        </p>
                    )}

                    {/* Specializations list */}
                    <div className="flex flex-wrap gap-1.5">
                        {mechanic.specializations.slice(0, 3).map(spec => (
                            <span key={spec} className="bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-[9px] font-extrabold px-2.5 py-1 rounded-lg border border-white/5 transition-colors">
                                {spec}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Divider Line */}
                <div className="border-t border-white/5 my-0.5"></div>

                {/* Right Side Actions Panel */}
                <div className="flex items-center gap-3 w-full">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/customer-portal/mechanic-profile/${mechanic.id}`);
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-[#2A2A32] hover:bg-[#3A3A42] text-white font-bold py-3 px-3 rounded-xl text-[10px] tracking-wider uppercase border border-white/5 transition-all duration-200 active:scale-95 whitespace-nowrap mechanic-card-btn"
                    >
                        Info Profile
                    </button>

                    {/* Selection Action */}
                    <button
                        disabled={isBusy}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (!isBusy) onSelect(mechanic);
                        }}
                        className={`flex-[2] flex items-center justify-center gap-1.5 bg-gradient-to-r from-primary to-orange-600 text-white font-black py-3 px-4 rounded-xl text-[10px] tracking-wider uppercase transition-all duration-300 shadow-md whitespace-nowrap mechanic-card-btn ${
                            isBusy
                                ? 'opacity-50 cursor-not-allowed pointer-events-none grayscale'
                                : 'hover:from-orange-600 hover:to-primary active:scale-95 shadow-primary/10 hover:shadow-primary/20'
                        }`}
                    >
                        Select Mechanic
                    </button>
                </div>
            </div>
        </div>
    );
};

const BOOKING_STATE_KEY = 'ridersbud_booking_state';

const getInitialState = (serviceIdFromUrl?: string, locationState?: any) => {
    let state: any = {}; // Start with an empty object
    try {
        const savedStateJSON = sessionStorage.getItem(BOOKING_STATE_KEY);
        if (savedStateJSON) {
            const parsedState = JSON.parse(savedStateJSON);
            if (serviceIdFromUrl && parsedState.selectedServiceIds && !parsedState.selectedServiceIds.includes(serviceIdFromUrl)) {
                // If URL ID doesn't match saved state, clear the state
                sessionStorage.removeItem(BOOKING_STATE_KEY);
            } else {
                state = parsedState;
                if (state.selectedDate) {
                    state.selectedDate = new Date(state.selectedDate);
                }
                if (state.selectedEndDate) {
                    state.selectedEndDate = new Date(state.selectedEndDate);
                }
                //selectedMechanic and selectedTime don't need special parsing as they are plain objects/strings
            }
        }
    } catch (error) {
        console.error("Could not parse booking state from sessionStorage", error);
        sessionStorage.removeItem(BOOKING_STATE_KEY);
    }

    if (locationState?.serviceLocation) {
        state.serviceLocation = locationState.serviceLocation;
    }

    return Object.keys(state).length > 0 ? state : null;
};


const BookingScreen: React.FC = () => {
    const { serviceId: initialServiceId } = useParams<{ serviceId: string }>();
    const { db, addBooking, cancelBooking, updateBookingPayment } = useDatabase();
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const location = useLocation();

    const locationState = location.state as {
        vehiclePlateNumber?: string;
        initialServiceIds?: string[];
        serviceLocation?: { lat: number, lng: number };
        preselectedMechanicId?: string;
    } | undefined;

    const rebookingState = locationState;
    const initialState = getInitialState(initialServiceId, location.state);

    const [step, setStep] = useState(initialState?.step || 1);
    const [error, setError] = useState('');
    const [verifyingPayment, setVerifyingPayment] = useState(false);
    const [waitingBookingId, setWaitingBookingId] = useState<string | null>(null);

    // Handle return from HitPay redirect (Booking flow)
    useEffect(() => {
        const query = new URLSearchParams(location.search);
        const statusParam = query.get('status');
        const hitpayParam = query.get('hitpay');

        if (statusParam === 'completed' || hitpayParam === 'completed' || statusParam === 'success') {
            const pendingTx = sessionStorage.getItem('pendingHitPayBookingTx');
            const targetBookingId = pendingTx ? (JSON.parse(pendingTx).bookingId) : query.get('bookingId');
            
            if (targetBookingId) {
                try {
                    let dpAmount = 0;
                    let totAmount = 0;
                    if (pendingTx) {
                        const parsed = JSON.parse(pendingTx);
                        dpAmount = parsed.amount || 0;
                        totAmount = parsed.totalAmount || (dpAmount * 2);
                    } else {
                        const existingB = db?.bookings.find(b => b.id === targetBookingId);
                        totAmount = existingB?.totalAmount || existingB?.price || 0;
                        dpAmount = totAmount > 0 ? Math.round(totAmount * 0.5) : Number(query.get('amount')) || 0;
                    }

                    sessionStorage.removeItem('pendingHitPayBookingTx');
                    sessionStorage.removeItem(BOOKING_STATE_KEY);

                    const dpRef = query.get('reference') || query.get('payment_request_id') || `HITPAY-${Date.now()}`;
                    const requestId = query.get('payment_request_id') || '';
                    const remBalance = Math.max(0, totAmount - dpAmount);

                    if (updateBookingPayment) {
                        updateBookingPayment(targetBookingId, dpAmount, 'downpayment_paid', {
                            paidAmount: dpAmount,
                            downpaymentAmount: dpAmount,
                            remainingBalance: remBalance,
                            isVerified: true,
                            isPaid: false,
                            paymentMethod: 'HitPay (Online)',
                            downpaymentRef: dpRef,
                            downpaymentPaidAt: new Date().toISOString(),
                            hitpayPaymentRequestId: requestId,
                            hitpayReference: dpRef,
                            hitpayStatus: 'completed',
                            status: 'Upcoming'
                        }).catch(console.warn);
                    }

                    const booking = db?.bookings.find(b => b.id === targetBookingId);
                    const updatedBooking = booking ? {
                        ...booking,
                        paidAmount: dpAmount,
                        downpaymentAmount: dpAmount,
                        remainingBalance: remBalance,
                        paymentStatus: 'downpayment_paid' as const,
                        isVerified: true,
                        isPaid: false,
                        paymentMethod: 'HitPay (Online)',
                        downpaymentRef: dpRef,
                        downpaymentPaidAt: new Date().toISOString(),
                        hitpayPaymentRequestId: requestId,
                        hitpayReference: dpRef,
                        hitpayStatus: 'completed',
                        status: 'Upcoming' as const
                    } : null;

                    navigate('/customer-portal/booking-confirmation', {
                        state: { bookings: updatedBooking ? [updatedBooking] : (booking ? [booking] : []), bookingId: targetBookingId },
                        replace: true
                    });
                } catch (e) {
                    console.error("Error processing return from HitPay", e);
                }
            }
        } else if (statusParam === 'canceled' || statusParam === 'failed' || hitpayParam === 'canceled') {
            const pendingTx = sessionStorage.getItem('pendingHitPayBookingTx');
            let parsedBookingId = '';
            let cancelAmount = 0;
            if (pendingTx) {
                try {
                    const parsed = JSON.parse(pendingTx);
                    parsedBookingId = parsed.bookingId;
                    cancelAmount = parsed.amount || parsed.totalAmount || 0;
                } catch (e) {}
            }
            sessionStorage.removeItem('pendingHitPayBookingTx');
            sessionStorage.removeItem(BOOKING_STATE_KEY);

            const targetBookingId = parsedBookingId || query.get('bookingId') || '';

            if (targetBookingId && cancelBooking) {
                cancelBooking(targetBookingId, 'Payment process was cancelled by customer at payment gateway.').catch(console.warn);
            }

            const cancellationInfo = {
                type: 'Service Booking' as const,
                referenceId: targetBookingId ? `BOK-${targetBookingId}` : 'BOK-CANCELLED',
                amount: cancelAmount,
                date: new Date().toLocaleString(),
                reason: 'Payment process was cancelled by the user at the payment gateway.',
                retryPath: '/customer-portal/services'
            };

            window.history.replaceState({}, document.title, window.location.pathname);

            navigate('/customer-portal/', {
                state: { cancelledTransaction: cancellationInfo },
                replace: true
            });
        }
    }, [location.search, db?.bookings, navigate, cancelBooking]);

    const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(
        new Set(
            rebookingState?.initialServiceIds ||
            initialState?.selectedServiceIds ||
            (initialServiceId ? [initialServiceId] : [])
        )
    );
    const [selectedVehiclePlate, setSelectedVehiclePlate] = useState(() =>
        rebookingState?.vehiclePlateNumber ||
        initialState?.selectedVehiclePlate ||
        ''
    );

    const [selectedDate, setSelectedDate] = useState(() => {
        const now = new Date();
        // If we have a saved date from initialState, we check if it's specifically "today" or "tomorrow"
        // To satisfy the "realtime" request, we default to "today" (now) for new sessions.
        if (initialState?.selectedDate) {
            const savedDate = new Date(initialState.selectedDate);
            // If the saved date is in the past, reset to today
            if (savedDate < new Date(now.setHours(0,0,0,0))) {
                return new Date();
            }
            return savedDate;
        }
        return now;
    });

    const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(() => {
        if (initialState?.selectedEndDate) {
            return new Date(initialState.selectedEndDate);
        }
        return null;
    });

    const [serviceLocation, setServiceLocation] = useState<{ lat: number; lng: number } | null>(initialState?.serviceLocation || null);
    const [locationStatus, setLocationStatus] = useState<'idle' | 'fetching' | 'success' | 'error'>('idle');
    const [locationError, setLocationError] = useState('');
    const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
    const [isTrackingLive, setIsTrackingLive] = useState(true);
    const watchIdRef = useRef<number | null>(null);
    const accuracyCircleRef = useRef<any>(null);

    const [serviceSearch, setServiceSearch] = useState('');
    const [mechanicSearch, setMechanicSearch] = useState(initialState?.mechanicSearch || '');
    const [specializationFilter, setSpecializationFilter] = useState(initialState?.specializationFilter || 'all');
    const [sortOption, setSortOption] = useState<string>(initialState?.sortOption || 'rating_desc');
    const [selectedTime, setSelectedTime] = useState(() => {
        if (initialState?.selectedTime) return initialState.selectedTime;
        const now = new Date();
        return now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    });
    const [selectedEndTime, setSelectedEndTime] = useState(() => {
        if (initialState?.selectedEndTime) return initialState.selectedEndTime;
        // Default end time = start time + 1 hour
        const now = new Date();
        now.setHours(now.getHours() + 1);
        return now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    });
    const [selectedMechanic, setSelectedMechanic] = useState<Mechanic | null>(initialState?.selectedMechanic || null);

    const [isSpecializationOpen, setIsSpecializationOpen] = useState(false);
    const [isSortOpen, setIsSortOpen] = useState(false);

    const [notes, setNotes] = useState(initialState?.notes || '');
    const [isBooking, setIsBooking] = useState(false);
    const [userHasGoneBack, setUserHasGoneBack] = useState(false);
    const [showGCashModal, setShowGCashModal] = useState(false);
    const [showLiveRouteModal, setShowLiveRouteModal] = useState(false);
    const [showPaymentBreakdownModal, setShowPaymentBreakdownModal] = useState(false);
    const [pendingBookingId, setPendingBookingId] = useState<string | null>(null);
    const [temporaryBookingData, setTemporaryBookingData] = useState<any>(null);
    const [gcashReferenceNumber, setGcashReferenceNumber] = useState('');

    const [selectedCar, setSelectedCar] = useState<any | null>(initialState?.selectedCar || null);
    const [selectedDriver, setSelectedDriver] = useState<any | null>(initialState?.selectedDriver || null);
    const [startLocation, setStartLocation] = useState<string>(initialState?.startLocation || '');
    const [endLocation, setEndLocation] = useState<string>(initialState?.endLocation || '');

    const cars = useMemo(() => {
        return (db?.rentalCars && db.rentalCars.length > 0) ? db.rentalCars : mockCars;
    }, [db?.rentalCars, mockCars]);

    const drivers = useMemo(() => {
        return (db?.hireDrivers && db.hireDrivers.length > 0) ? db.hireDrivers : mockDrivers;
    }, [db?.hireDrivers, mockDrivers]);


    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const markerRef = useRef<any>(null);
    const confirmationMapRef = useRef<HTMLDivElement>(null);
    const confirmationMapInstanceRef = useRef<any>(null);

    // Live Route Map Refs & States
    const routeMapRef = useRef<HTMLDivElement>(null);
    const routeMapInstanceRef = useRef<any>(null);
    const routeStartMarkerRef = useRef<any>(null);
    const routeEndMarkerRef = useRef<any>(null);
    const routePolylineRef = useRef<any>(null);

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

    const [isLocating, setIsLocating] = useState(false);
    const [startCoords, setStartCoords] = useState<[number, number] | null>(null);
    const [endCoords, setEndCoords] = useState<[number, number] | null>(null);

    // Auto-suggestions states
    const [startSuggestions, setStartSuggestions] = useState<any[]>([]);
    const [endSuggestions, setEndSuggestions] = useState<any[]>([]);
    const [showStartSuggestions, setShowStartSuggestions] = useState(false);
    const [showEndSuggestions, setShowEndSuggestions] = useState(false);

    useEffect(() => {
        if (user && user.vehicles.length > 0 && !selectedVehiclePlate) {
            const primaryVehicle = user.vehicles.find(v => v.isPrimary);
            setSelectedVehiclePlate(primaryVehicle?.plateNumber || user.vehicles[0].plateNumber);
        }
    }, [user, selectedVehiclePlate]);

     // Live Geocoding and Location Helper with fallback
    const handleUseLiveLocation = () => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser.');
            return;
        }
        setIsLocating(true);

        const onGeoSuccess = async (position: GeolocationPosition) => {
            const { latitude, longitude } = position.coords;
            setStartCoords([latitude, longitude]);
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 6000);
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
                    { signal: controller.signal }
                );
                clearTimeout(timeoutId);
                const data = await res.json();
                if (data && data.display_name) {
                    setStartLocation(data.display_name);
                } else {
                    setStartLocation(`Live Location (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`);
                }
            } catch (e) {
                setStartLocation(`Live Location (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`);
            } finally {
                setIsLocating(false);
            }
        };

        const onGeoError = (error: GeolocationPositionError) => {
            console.warn('High accuracy location timeout, trying low accuracy fallback...', error);
            navigator.geolocation.getCurrentPosition(
                onGeoSuccess,
                (fallbackErr) => {
                    console.error('Geolocation failed completely:', fallbackErr);
                    setIsLocating(false);
                    let errMsg = 'Unable to retrieve your location.';
                    if (fallbackErr.code === 1) {
                        errMsg = 'Location access denied. Please enable location permissions in your browser or device settings.';
                    } else if (fallbackErr.code === 2) {
                        errMsg = 'Location position unavailable. Please ensure your device GPS is turned on.';
                    } else if (fallbackErr.code === 3) {
                        errMsg = 'Location request timed out. Please try again.';
                    }
                    alert(errMsg);
                },
                { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
            );
        };

        navigator.geolocation.getCurrentPosition(
            onGeoSuccess,
            onGeoError,
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
        );
    };

    // Fetch suggestions for Start Location (Philippines only)
    useEffect(() => {
        if (!startLocation || startLocation.startsWith('My Location') || startLocation.length < 2) {
            setStartSuggestions([]);
            return;
        }
        const timer = setTimeout(async () => {
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&countrycodes=ph&q=${encodeURIComponent(startLocation)}&limit=5`);
                const data = await res.json();
                if (data) {
                    setStartSuggestions(data);
                }
            } catch (e) {
                console.warn("Start suggestions fetch failed", e);
            }
        }, 200);
        return () => clearTimeout(timer);
    }, [startLocation]);

    // Fetch suggestions for End Location (Philippines only)
    useEffect(() => {
        if (!endLocation || endLocation.length < 2) {
            setEndSuggestions([]);
            return;
        }
        const timer = setTimeout(async () => {
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&countrycodes=ph&q=${encodeURIComponent(endLocation)}&limit=5`);
                const data = await res.json();
                if (data) {
                    setEndSuggestions(data);
                }
            } catch (e) {
                console.warn("End suggestions fetch failed", e);
            }
        }, 200);
        return () => clearTimeout(timer);
    }, [endLocation]);

    const handleSelectStartSuggestion = (suggestion: any) => {
        setStartLocation(suggestion.display_name);
        setStartCoords([parseFloat(suggestion.lat), parseFloat(suggestion.lon)]);
        setStartSuggestions([]);
        setShowStartSuggestions(false);
    };

    const handleSelectEndSuggestion = (suggestion: any) => {
        setEndLocation(suggestion.display_name);
        setEndCoords([parseFloat(suggestion.lat), parseFloat(suggestion.lon)]);
        setEndSuggestions([]);
        setShowEndSuggestions(false);
    };

    // Instantiate and update Route Map
    useEffect(() => {
        if (step !== 4 || !routeMapRef.current || typeof L === 'undefined') return;

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

            const osmTile = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
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
                            <img src="${db?.settings?.mapLogoUrl || db?.settings?.appLogoUrl || '/favicon.png'}" alt="Start" onerror="this.style.display='none'" style="width:36px;height:36px;object-fit:contain;border-radius:50%;" />
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
                            <img src="${db?.settings?.mapLogoUrl || db?.settings?.appLogoUrl || '/favicon.png'}" alt="End" onerror="this.style.display='none'" style="width:36px;height:36px;object-fit:contain;border-radius:50%;" />
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
                        color: '#FE7803',
                        weight: 4,
                        opacity: 0.8,
                        dashArray: '5, 10'
                    }).addTo(map);
                }
                const bounds = L.latLngBounds([startCoords, endCoords]);
                map.fitBounds(bounds, { padding: [50, 50] });
            };

            // Fetch real road route geometry from OpenStreetMap OSRM API (OSM Germany server)
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
                                color: '#FE7803',
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

    }, [step, startCoords, endCoords, leafletLoaded]);

    useEffect(() => {
        if (step !== 4 && routeMapInstanceRef.current) {
            routeMapInstanceRef.current.remove();
            routeMapInstanceRef.current = null;
            routeStartMarkerRef.current = null;
            routeEndMarkerRef.current = null;
            routePolylineRef.current = null;
        }
    }, [step]);

    // Real-time listener for booking status change (Sync)
    useEffect(() => {
        if (!waitingBookingId || !db?.bookings) return;

        // Find the booking we're waiting for in the real-time synced bookings array
        const booking = db.bookings.find(b => b.id === waitingBookingId);
        
        // If booking is verified or paid, proceed to confirmation
        if (booking && (booking.isVerified || booking.paymentStatus === 'paid' || booking.status === 'Booking Confirmed')) {
            const settings = getNotificationSettings();
            if (settings.bookingUpdates) {
                showNotification('Booking Confirmed!', {
                    body: `Your appointment for ${booking.services.length} service(s) on ${new Date(booking.date).toLocaleDateString()} is set.`
                });
            }
            
            setVerifyingPayment(false);
            setWaitingBookingId(null);
            
            // Short delay for UX transition
            setTimeout(() => {
                navigate('/customer-portal/booking-confirmation', { state: { bookings: [booking] } });
            }, 800);
        }

        // If booking is cancelled or declined, redirect to customer portal home
        if (booking && (booking.status === 'Cancelled' || booking.gcashPaymentStatus === 'declined')) {
            setVerifyingPayment(false);
            setWaitingBookingId(null);
            navigate('/customer-portal/', { replace: true });
        }
    }, [waitingBookingId, db?.bookings, navigate]);

    // Bypass Step 1 if service is pre-selected and vehicle is auto-selected
    useEffect(() => {
        if (step === 1 && selectedServiceIds.size > 0 && selectedVehiclePlate && !userHasGoneBack) {
            setStep(2);
        }
    }, [step, selectedServiceIds.size, selectedVehiclePlate, userHasGoneBack]);

    // Reset the manually-backed flag if they move forward past step 1 again
    useEffect(() => {
        if (step > 1) {
            setUserHasGoneBack(false);
        }
    }, [step]);

    useEffect(() => {
        const stateToSave = {
            step,
            selectedServiceIds: Array.from(selectedServiceIds),
            selectedVehiclePlate,
            selectedDate: selectedDate.toISOString(),
            selectedEndDate: selectedEndDate ? selectedEndDate.toISOString() : null,
            selectedTime,
            selectedEndTime,
            selectedMechanic,
            serviceLocation,
            mechanicSearch,
            specializationFilter,
            sortOption,
            notes,
            selectedCar,
            selectedDriver,
            startLocation,
            endLocation
        };
        sessionStorage.setItem(BOOKING_STATE_KEY, JSON.stringify(stateToSave));
    }, [step, selectedServiceIds, selectedVehiclePlate, selectedDate, selectedEndDate, selectedTime, selectedEndTime, selectedMechanic, serviceLocation, mechanicSearch, specializationFilter, sortOption, notes, selectedCar, selectedDriver, startLocation, endLocation]);

    useEffect(() => {
        if (step === 3) {
            setLocationStatus('fetching');

            const handleSuccess = (position: GeolocationPosition) => {
                const { latitude, longitude, accuracy } = position.coords;
                setServiceLocation(prev => {
                    // Update location if live tracking is enabled, or if it is our first read
                    if (isTrackingLive || prev === null) {
                        return { lat: latitude, lng: longitude };
                    }
                    return prev;
                });
                setLocationAccuracy(accuracy);
                setLocationStatus('success');
                setLocationError('');
            };

            const handleError = (error: GeolocationPositionError) => {
                // Fallback to lower accuracy if high accuracy times out/fails
                navigator.geolocation.getCurrentPosition(
                    handleSuccess,
                    (fallbackError) => {
                        setServiceLocation(prev => {
                            if (prev === null) {
                                // Default fallback to Manila, Philippines if GPS is completely unavailable/timed out
                                setLocationStatus('success'); // allow map to load instead of failing
                                return { lat: 14.5995, lng: 120.9842 };
                            }
                            return prev;
                        });
                    },
                    { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
                );
            };

            const options = {
                enableHighAccuracy: true,
                timeout: 8000,
                maximumAge: 0
            };

            // Get initial highly accurate position
            navigator.geolocation.getCurrentPosition(handleSuccess, handleError, options);

            // Subscribe to real-time location updates (high accuracy, fast responsiveness, zero caching)
            const watchId = navigator.geolocation.watchPosition(
                handleSuccess, 
                () => {}, 
                {
                    enableHighAccuracy: true, 
                    timeout: 10000, 
                    maximumAge: 0
                }
            );
            watchIdRef.current = watchId;

            return () => {
                if (watchIdRef.current !== null) {
                    navigator.geolocation.clearWatch(watchIdRef.current);
                    watchIdRef.current = null;
                }
            };
        }
    }, [step, isTrackingLive]);

    // Map initialization: Run once when step === 3 and serviceLocation is available
    useEffect(() => {
        if (step !== 3 || !serviceLocation || !mapRef.current || mapInstanceRef.current || typeof L === 'undefined') return;

        const { lat, lng } = serviceLocation;

        mapInstanceRef.current = L.map(mapRef.current, {
            zoomControl: false,
            preferCanvas: false,
            scrollWheelZoom: true,
            doubleClickZoom: true,
            touchZoom: true,
            dragging: true
        }).setView([lat, lng], 18);

        const osmTile = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19,
            crossOrigin: true,
        });

        osmTile.addTo(mapInstanceRef.current);

        // Accuracy Halo Circle for Live GPS accuracy feedback
        if (locationAccuracy && locationAccuracy > 0) {
            accuracyCircleRef.current = L.circle([lat, lng], {
                radius: Math.max(8, locationAccuracy),
                color: '#FE7803',
                fillColor: '#FE7803',
                fillOpacity: 0.15,
                weight: 1.5,
                dashArray: '4, 4'
            }).addTo(mapInstanceRef.current);
        }

        // Branded draggable location pin
        const locationIcon = L.divIcon({
            html: `<div class="rb-location-pin-wrapper">
                <div class="rb-location-circle">
                    <img src="${db?.settings?.mapLogoUrl || db?.settings?.appLogoUrl || '/favicon.png'}" alt="Location" onerror="this.style.display='none'" style="width:28px;height:28px;object-fit:contain;border-radius:50%;" />
                </div>
                <div class="rb-location-stem"></div>
                <div class="rb-location-dot"></div>
            </div>`,
            className: 'rb-leaflet-icon',
            iconSize: [56, 76],
            iconAnchor: [28, 76],
        });

        markerRef.current = L.marker([lat, lng], {
            icon: locationIcon,
            draggable: true,
            autoPan: true,
            autoPanSpeed: 10,
        }).addTo(mapInstanceRef.current);

        // Drag events — live update location state
        markerRef.current.on('drag', (e: any) => {
            const { lat: newLat, lng: newLng } = e.target.getLatLng();
            setServiceLocation({ lat: newLat, lng: newLng });
            setIsTrackingLive(false);
            if (accuracyCircleRef.current) {
                accuracyCircleRef.current.setLatLng([newLat, newLng]);
            }
        });
        markerRef.current.on('dragend', (e: any) => {
            const { lat: newLat, lng: newLng } = e.target.getLatLng();
            setServiceLocation({ lat: newLat, lng: newLng });
            setIsTrackingLive(false);
            if (accuracyCircleRef.current) {
                accuracyCircleRef.current.setLatLng([newLat, newLng]);
            }
        });

        // Map click also repositions pin
        mapInstanceRef.current.on('click', (e: any) => {
            const { lat: newLat, lng: newLng } = e.latlng;
            setServiceLocation({ lat: newLat, lng: newLng });
            setIsTrackingLive(false);
            if (markerRef.current) {
                markerRef.current.setLatLng([newLat, newLng]);
            }
            if (accuracyCircleRef.current) {
                accuracyCircleRef.current.setLatLng([newLat, newLng]);
            }
        });

        // Force size calculation after tiles paint
        const inv = () => { if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize(true); };
        inv();
        setTimeout(inv, 100);
        setTimeout(inv, 400);
        setTimeout(inv, 1000);

        return () => {
            if (mapInstanceRef.current) {
                try {
                    mapInstanceRef.current.remove();
                } catch (error) {
                    console.warn('Map cleanup warning (ignored):', error);
                }
                mapInstanceRef.current = null;
                markerRef.current = null;
                accuracyCircleRef.current = null;
            }
        };
    }, [step, serviceLocation === null, leafletLoaded]); // eslint-disable-line

    // Live updater: smoothly follow GPS and update accuracy halo when tracking is active
    useEffect(() => {
        if (step === 3 && mapInstanceRef.current && serviceLocation) {
            if (markerRef.current) {
                markerRef.current.setLatLng([serviceLocation.lat, serviceLocation.lng]);
            }
            if (accuracyCircleRef.current) {
                accuracyCircleRef.current.setLatLng([serviceLocation.lat, serviceLocation.lng]);
                if (locationAccuracy && locationAccuracy > 0) {
                    accuracyCircleRef.current.setRadius(Math.max(8, locationAccuracy));
                }
            } else if (locationAccuracy && locationAccuracy > 0 && typeof L !== 'undefined') {
                accuracyCircleRef.current = L.circle([serviceLocation.lat, serviceLocation.lng], {
                    radius: Math.max(8, locationAccuracy),
                    color: '#FE7803',
                    fillColor: '#FE7803',
                    fillOpacity: 0.15,
                    weight: 1.5,
                    dashArray: '4, 4'
                }).addTo(mapInstanceRef.current);
            }

            if (isTrackingLive) {
                mapInstanceRef.current.setView(
                    [serviceLocation.lat, serviceLocation.lng],
                    mapInstanceRef.current.getZoom() || 18,
                    { animate: true, duration: 0.5 }
                );
            }
        }
    }, [serviceLocation, isTrackingLive, locationAccuracy, step]);



    // Ensure map resizes correctly when step 3 renders or when location loads
    useEffect(() => {
        if (step === 3) {
            const inv = () => { if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize(true); };
            // Fire repeatedly to handle late renders
            inv();
            const t1 = setTimeout(inv, 150);
            const t2 = setTimeout(inv, 500);
            const t3 = setTimeout(inv, 1200);
            return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
        }
    }, [step, locationStatus]);


    // Initialize map for Step 5 (Confirmation)
    useEffect(() => {
        if (step === 5 && serviceLocation && confirmationMapRef.current && !confirmationMapInstanceRef.current && typeof L !== 'undefined') {
            // Initialize map
            confirmationMapInstanceRef.current = L.map(confirmationMapRef.current, {
                center: [serviceLocation.lat, serviceLocation.lng],
                zoom: 15,
                zoomControl: false,
                attributionControl: false,
                dragging: false,
                scrollWheelZoom: false,
                doubleClickZoom: false,
                touchZoom: false
            });

            // Add free OpenStreetMap tile layer
            L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors',
                maxZoom: 19,
                crossOrigin: true
            }).addTo(confirmationMapInstanceRef.current);

            // Add marker
            const locationIcon = L.divIcon({
                html: `<div class="rb-location-pin-wrapper">
                    <div class="rb-location-circle">
                        <img src="${db?.settings?.mapLogoUrl || db?.settings?.appLogoUrl || '/favicon.png'}" alt="Location" onerror="this.style.display='none'" style="width:36px;height:36px;object-fit:contain;border-radius:50%;" />
                    </div>
                    <div class="rb-location-stem"></div>
                    <div class="rb-location-dot"></div>
                </div>`,
                className: 'rb-leaflet-icon',
                iconSize: [56, 76],
                iconAnchor: [28, 76],
            });
            L.marker([serviceLocation.lat, serviceLocation.lng], { icon: locationIcon }).addTo(confirmationMapInstanceRef.current);


            // Invalidate size to ensure correct rendering
            setTimeout(() => {
                confirmationMapInstanceRef.current?.invalidateSize();
            }, 100);
        }

        return () => {
            if (confirmationMapInstanceRef.current) {
                try {
                    confirmationMapInstanceRef.current.remove();
                } catch (error) {
                    console.warn('Confirmation map cleanup warning (ignored):', error);
                }
                confirmationMapInstanceRef.current = null;
            }
        };
    }, [step, serviceLocation, leafletLoaded]);


    const handleBack = () => {
        if (step > 1) {
            if (step === 2) {
                setUserHasGoneBack(true);
            }
            setStep(s => s - 1);
        } else {
            sessionStorage.removeItem(BOOKING_STATE_KEY);
            navigate(-1);
        }
    };

    const { services, bookings, mechanics } = db || { services: [], bookings: [], mechanics: [] };

    const selectedServices = useMemo(() => {
        return services.filter(s => selectedServiceIds.has(s.id));
    }, [services, selectedServiceIds]);
    const isCarRental = selectedServices.some(s => s.isCarRental);
    const isDriverHire = selectedServices.some(s => s.isDriverHire);
    const isSpecialRentalOrDriver = isCarRental || isDriverHire;

    const getHeaderTitle = () => {
        switch (step) {
            case 1: return 'Select Service & Vehicle';
            case 2: return 'Select a Date and Time';
            case 3:
                if (isSpecialRentalOrDriver) {
                    if (isCarRental && isDriverHire) return 'Select Car & Driver';
                    return isCarRental ? 'Select Car' : 'Select Driver';
                }
                return 'Confirm Service Location';
            case 4: return isSpecialRentalOrDriver ? 'Enter Route Locations' : 'Select Mechanic';
            case 5: return 'Confirm Booking';
            default: return 'Book a Service';
        }
    };

    const rentalDays = useMemo(() => {
        if (!isSpecialRentalOrDriver || !selectedEndDate) return 1;
        const start = new Date(selectedDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(selectedEndDate);
        end.setHours(0, 0, 0, 0);
        const diffTime = end.getTime() - start.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return Math.max(1, diffDays);
    }, [isSpecialRentalOrDriver, selectedDate, selectedEndDate]);

    const totalPrice = useMemo(() => {
        if (!db) return 0;
        let price = services
            .filter(s => selectedServiceIds.has(s.id))
            .reduce((sum, s) => sum + s.price, 0);
        if (isCarRental && selectedCar) {
            price += selectedCar.pricePerDay * rentalDays;
        }
        if (isDriverHire && selectedDriver) {
            price += selectedDriver.pricePerDay * rentalDays;
        }
        return price;
    }, [selectedServiceIds, services, db, isCarRental, selectedCar, isDriverHire, selectedDriver, rentalDays]);

    const isQuoteRequest = useMemo(() => {
        if (!db || selectedServiceIds.size === 0) return false;
        const selectedServicesList = services.filter(s => selectedServiceIds.has(s.id));
        return selectedServicesList.some(s => s.price === 0);
    }, [selectedServiceIds, services, db]);


    const allSpecializations = useMemo(() => {
        if (!db || !mechanics) return ['all'];
        const specSet = new Set<string>();
        mechanics.forEach(m => {
            if (m.status === 'Active') {
                m.specializations.forEach(s => specSet.add(s))
            }
        });
        return ['all', ...Array.from(specSet).sort()];
    }, [mechanics, db]);

    // Helper function to calculate distance between two coordinates (Haversine formula)
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const filteredAndSortedMechanics = useMemo(() => {
        if (!db || !mechanics) return [];
        const selectedDayOfWeek = selectedDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as keyof Required<Mechanic>['availability'];
        const selectedDateWithoutTime = new Date(selectedDate);
        selectedDateWithoutTime.setHours(0, 0, 0, 0);
        const isToday = selectedDateWithoutTime.getTime() === new Date().setHours(0, 0, 0, 0);

        const selectedServices = services.filter(s => selectedServiceIds.has(s.id));

        let availableMechanics = mechanics.filter(mechanic => {
            if (mechanic.status !== 'Active') return false;
            if (isToday && !mechanic.isOnline) return false;

            const hasBusyBooking = bookings.some(b =>
                b.mechanic?.id === mechanic.id &&
                (b.status === 'En Route' || b.status === 'In Progress' || b.status === 'Mechanic Assigned')
            );
            // Removed: if (hasBusyBooking) return false; so busy mechanics still show up

            if (mechanic.unavailableDates?.some(d => {
                const start = new Date(d.startDate.replace(/-/g, '/'));
                const end = new Date(d.endDate.replace(/-/g, '/'));
                start.setHours(0, 0, 0, 0);
                end.setHours(0, 0, 0, 0);
                return selectedDateWithoutTime >= start && selectedDateWithoutTime <= end;
            })) {
                return false;
            }

            if (!(isToday && mechanic.isOnline) && !mechanic.availability?.[selectedDayOfWeek]?.isAvailable) return false;

            if (selectedServices.length > 0) {
                const hasSpecializationMatch = selectedServices.some(selectedService => {
                    const serviceNameLower = selectedService.name.toLowerCase();
                    const serviceCategoryLower = selectedService.category.toLowerCase();
                    return mechanic.specializations.some(specRaw => {
                        const spec = specRaw.toLowerCase();
                        if (spec.includes(serviceCategoryLower) || serviceCategoryLower.includes(spec)) return true;
                        if (spec.includes(serviceNameLower) || serviceNameLower.includes(spec)) return true;
                        const serviceWords = serviceNameLower.split(' ');
                        return serviceWords.some(word => word.length > 2 && (spec.includes(word) || word.includes(spec)));
                    });
                });
                if (!hasSpecializationMatch) return false;
            }

            if (specializationFilter !== 'all' && !mechanic.specializations.includes(specializationFilter)) return false;
            if (mechanicSearch && !mechanic.name.toLowerCase().includes(mechanicSearch.toLowerCase())) return false;

            return true;
        });

        if (serviceLocation) {
            const mechanicsWithDistance = availableMechanics.map(mechanic => ({
                mechanic,
                distance: mechanic.lat && mechanic.lng
                    ? calculateDistance(serviceLocation.lat, serviceLocation.lng, mechanic.lat, mechanic.lng)
                    : 999999
            }));

            mechanicsWithDistance.sort((a, b) => {
                if (a.distance === b.distance) {
                    switch (sortOption) {
                        case 'rating_desc': return b.mechanic.rating - a.mechanic.rating;
                        case 'rating_asc': return a.mechanic.rating - b.mechanic.rating;
                        case 'jobs_desc': return b.mechanic.reviews - a.mechanic.reviews;
                        case 'jobs_asc': return a.mechanic.reviews - b.mechanic.reviews;
                        case 'name_asc': return a.mechanic.name.localeCompare(b.mechanic.name);
                        case 'name_desc': return b.mechanic.name.localeCompare(a.mechanic.name);
                        default: return 0;
                    }
                }
                return a.distance - b.distance;
            });

            return mechanicsWithDistance;
        }

        availableMechanics.sort((a, b) => {
            switch (sortOption) {
                case 'rating_desc': return b.rating - a.rating;
                case 'rating_asc': return a.rating - b.rating;
                case 'jobs_desc': return b.reviews - a.reviews;
                case 'jobs_asc': return a.reviews - b.reviews;
                case 'name_asc': return a.name.localeCompare(b.name);
                case 'name_desc': return b.name.localeCompare(a.name);
                default: return 0;
            }
        });

        return availableMechanics.map(mechanic => ({ mechanic, distance: undefined }));
    }, [mechanics, services, selectedServiceIds, selectedDate, specializationFilter, mechanicSearch, sortOption, bookings, serviceLocation, db]);


    const handleStep1Continue = () => {
        if (selectedServiceIds.size === 0) setError('Please select at least one service.');
        else if (!selectedVehiclePlate) setError('Please select a vehicle.');
        else { setError(''); setStep(2); }
    };

    const handleStep2Continue = () => {
        if (!selectedDate) { setError('Please select a start date.'); return; }
        if (isSpecialRentalOrDriver) {
            if (!selectedTime) { setError('Please select a start time.'); return; }
            if (!selectedEndDate) { setError('Please select a return / end date.'); return; }
            if (selectedEndDate < selectedDate) { setError('End date must be on or after the start date.'); return; }
            if (!selectedEndTime) { setError('Please select a return / end time.'); return; }
        }
        setError('');
        setStep(3);
    };

    const handleStep3Continue = () => {
        if (isSpecialRentalOrDriver) {
            if (isCarRental && !selectedCar) {
                setError('Please select a car.');
            } else if (isDriverHire && !selectedDriver) {
                setError('Please select a driver.');
            } else {
                setError('');
                setStep(4);
            }
        } else {
            if (!serviceLocation) setError('Please confirm your location.');
            else { setError(''); setStep(4); }
        }
    };

    const handleStep4Continue = () => {
        if (isSpecialRentalOrDriver) {
            if (!startLocation.trim()) {
                setError('Please enter a start location.');
            } else if (!endLocation.trim()) {
                setError('Please enter an end location.');
            } else {
                setError('');
                setStep(5);
            }
        }
    };

    const handleSelectTimeSlot = (mechanic: Mechanic, time: string) => {
        setSelectedMechanic(mechanic);
        setSelectedTime(time);
        setStep(5);
    };

    // Create booking first (awaiting_payment), then open modal with real Firestore ID
    const handleBooking = async () => {
        const selectedServices = services.filter(s => selectedServiceIds.has(s.id));
        const selectedVehicle = user?.vehicles.find(v => v.plateNumber === selectedVehiclePlate);
        if (selectedServices.length === 0 || !user || (!isSpecialRentalOrDriver && !selectedMechanic) || !selectedVehicle || (!isSpecialRentalOrDriver && !serviceLocation)) {
            setError('Missing booking information. Please start over.');
            return;
        }
        setError('');
        setIsBooking(true);
        try {
            let computedTotalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
            if (isSpecialRentalOrDriver) {
                if (isCarRental && selectedCar) computedTotalPrice += selectedCar.pricePerDay * rentalDays;
                if (isDriverHire && selectedDriver) computedTotalPrice += selectedDriver.pricePerDay * rentalDays;
            }

            const newBookingData: any = {
                customerId: user.id,
                customerName: user.name,
                services: selectedServices,
                service: selectedServices[0] || null,
                date: selectedDate.toISOString().split('T')[0],
                time: selectedTime,
                status: 'Upcoming' as const,
                vehicle: selectedVehicle,
                notes,
                paymentStatus: 'pending' as const,
                paidAmount: 0,
                totalAmount: computedTotalPrice,
                paymentMethod: 'GCash' as const,
                gcashPaymentStatus: 'awaiting_payment' as const,
                isVerified: false,
            };

            if (isSpecialRentalOrDriver) {
                newBookingData.isSpecialRentalOrDriver = true;
                newBookingData.startLocation = startLocation;
                newBookingData.endLocation = endLocation;
                newBookingData.endDate = selectedEndDate ? selectedEndDate.toISOString().split('T')[0] : null;
                newBookingData.rentalDays = rentalDays;
                newBookingData.startTime = selectedTime;
                newBookingData.endTime = selectedEndTime;
                if (isCarRental) {
                    newBookingData.selectedCar = selectedCar;
                    newBookingData.rentalCarDetails = selectedCar;
                }
                if (isDriverHire) {
                    newBookingData.selectedDriver = selectedDriver;
                    newBookingData.driverDetails = selectedDriver;
                }
            } else {
                newBookingData.mechanic = selectedMechanic;
                newBookingData.mechanicId = selectedMechanic?.id || '';
                newBookingData.mechanicName = selectedMechanic?.name || '';
                newBookingData.location = serviceLocation;
            }

            if (computedTotalPrice === 0) {
                const createdBooking = await addBooking(newBookingData);
                sessionStorage.removeItem(BOOKING_STATE_KEY);
                navigate('/customer-portal/booking-confirmation', {
                    state: { bookings: [createdBooking], bookingId: createdBooking.id }
                });
                return;
            }
            const isHitPayActive = HitPayService.isGatewayActive(db?.settings);
            const downpaymentAmount = Math.round(computedTotalPrice * 0.5);

            if (!isHitPayActive) {
                throw new Error("Online Payment Gateway (HitPay) is required for checkout but currently inactive in system settings. Please contact the administrator.");
            }

            const createdBooking = await addBooking({
                ...newBookingData,
                status: 'Pending',
                paymentStatus: 'pending',
                isPaid: false,
                paymentMethod: 'Online (HitPay)'
            });

            if (!createdBooking) {
                throw new Error("Failed to create booking for payment.");
            }

            sessionStorage.removeItem(BOOKING_STATE_KEY);
            sessionStorage.setItem('pendingHitPayBookingTx', JSON.stringify({
                bookingId: createdBooking.id,
                amount: downpaymentAmount,
                totalAmount: computedTotalPrice
            }));

            const hitPay = HitPayService.fromSettings(db?.settings);
            const returnUrl = `${window.location.origin}${window.location.pathname}?bookingId=${createdBooking.id}`;
            const appTitle = db?.settings?.appName || 'RidersBUD';

            const { url } = await hitPay.createPaymentRequest({
                amount: downpaymentAmount,
                currency: db?.settings?.currency || 'PHP',
                reference_number: `BOK-${createdBooking.id}-${Date.now()}`,
                webhook: 'https://ridersbud-10806.web.app/payment/webhook',
                redirect_url: returnUrl,
                email: user.email || 'customer@example.com',
                name: user.name || 'Customer',
                phone: user.phone || undefined,
                purpose: `${appTitle} — 50% Initial DP (Booking #${createdBooking.id.slice(-6).toUpperCase()})`
            });

            window.location.href = url;
            return;
        } catch (err: any) {
            setShowPaymentBreakdownModal(false);
            const msg = err?.message || 'An error occurred while connecting to HitPay Gateway.';
            setError(msg);
            console.error('HitPay checkout error:', err);
        } finally {
            setIsBooking(false);
        }
    };

    // Called by the modal when the Firestore listener detects isVerified=true
    const handlePaymentVerified = useCallback(() => {
        setShowGCashModal(false);
        setWaitingBookingId(null);
        setVerifyingPayment(false);
        const booking = pendingBookingId ? db?.bookings.find(b => b.id === pendingBookingId) : null;
        const settings = getNotificationSettings();
        if (settings.bookingUpdates) {
            showNotification('Booking Confirmed!', {
                body: `Your GCash payment has been verified. Your booking is confirmed!`
            });
        }
        navigate('/customer-portal/booking-confirmation', {
            state: { bookings: booking ? [booking] : [], bookingId: pendingBookingId }
        });
    }, [pendingBookingId, db?.bookings, navigate]);

    const handleServiceSelect = (serviceId: string) => {
        setSelectedServiceIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(serviceId)) {
                newSet.delete(serviceId);
            } else {
                newSet.add(serviceId);
            }
            return newSet;
        });
    };

    const renderStep1 = () => (
        <>
            <div className="p-6 pb-32 space-y-6 flex-grow overflow-y-auto">
                <div>
                    <h3 className="text-sm font-bold text-gray-400  tracking-wider mb-3">Select Your Vehicle</h3>
                    {user?.vehicles && user.vehicles.length > 0 ? (
                        <div className="space-y-3">
                            {user.vehicles.map(vehicle => {
                                const isSelected = selectedVehiclePlate === vehicle.plateNumber;
                                return (
                                    <div
                                        key={vehicle.plateNumber}
                                        onClick={() => setSelectedVehiclePlate(vehicle.plateNumber)}
                                        className={`relative bg-[#1E1E1E] rounded-xl p-4 cursor-pointer transition-all duration-200 border-2 group ${isSelected
                                            ? 'border-primary shadow-lg shadow-primary/20'
                                            : 'border-white/5 hover:border-primary/50'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            {/* Vehicle Icon */}
                                            <div className={`w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors overflow-hidden relative ${isSelected ? 'bg-primary/20' : 'bg-white/5 group-hover:bg-primary/10'
                                                }`}>
                                                {vehicle.imageUrls && vehicle.imageUrls.length > 0 ? (
                                                    <img
                                                        src={vehicle.imageUrls[0]}
                                                        alt={`${vehicle.make} ${vehicle.model}`}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src = "/assets/car_mockup.png";
                                                        }}
                                                    />
                                                ) : (
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        className={`h-8 w-8 transition-colors ${isSelected ? 'text-primary' : 'text-gray-400 group-hover:text-primary'}`}
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                        strokeWidth={1.5}
                                                    >
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                                    </svg>
                                                )}
                                            </div>

                                            {/* Vehicle Details */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className="font-bold text-white truncate" style={{ fontSize: '15px' }}>
                                                        {vehicle.year} {vehicle.make} {vehicle.model}
                                                    </h4>
                                                    {vehicle.isPrimary && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/20 text-primary border border-primary/30">
                                                            PRIMARY
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 text-xs text-gray-400">
                                                    <span className="flex items-center gap-1">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                                        </svg>
                                                        {vehicle.plateNumber}
                                                    </span>
                                                    {vehicle.color && (
                                                        <span className="flex items-center gap-1">
                                                            <div className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: vehicle.color.toLowerCase() }}></div>
                                                            {vehicle.color}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Selection Indicator */}
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 ${isSelected
                                                ? 'bg-primary scale-100'
                                                : 'bg-white/10 border-2 border-white/20'
                                                }`}>
                                                {isSelected && (
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Add Vehicle Button */}
                            <Tooltip content="Add a new vehicle to your garage">
                                <button
                                    onClick={() => navigate('/customer-portal/my-garage')}
                                    className="w-full bg-white/5 border-2 border-dashed border-white/10 rounded-xl p-4 text-gray-400 hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all duration-200 flex items-center justify-center gap-2"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                    </svg>
                                    <span className="font-semibold text-sm">Add Another Vehicle</span>
                                </button>
                            </Tooltip>
                        </div>
                    ) : (
                        <div className="bg-[#1E1E1E] p-6 rounded-xl text-center flex flex-col items-center border-2 border-dashed border-white/10">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-primary mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                            </svg>
                            <h3 className="text-lg font-bold text-white">Add a Vehicle to Your Garage</h3>
                            <p className="text-sm text-gray-400 my-2">You need to have at least one vehicle registered before you can book a service.</p>
                            <Tooltip content="Manage your vehicles">
                                <button
                                    onClick={() => navigate('/customer-portal/my-garage')}
                                    className="mt-4 bg-primary text-white font-bold py-2.5 px-6 rounded-lg hover:bg-primary/90 transition-colors"
                                >
                                    Go to My Garage
                                </button>
                            </Tooltip>
                        </div>
                    )}
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-bold text-gray-400 tracking-wider">Select Services</h3>
                        {serviceSearch && (
                            <button 
                                onClick={() => setServiceSearch('')}
                                className="text-[10px] font-bold text-primary hover:text-orange-400 transition-colors"
                            >
                                CLEAR
                            </button>
                        )}
                    </div>

                    {/* Service Search Input */}
                    <div className="relative mb-4">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </span>
                        <input
                            type="text"
                            id="service-search"
                            name="serviceSearch"
                            placeholder="Search services (e.g. Oil Change, Tires...)"
                            value={serviceSearch}
                            onChange={(e) => setServiceSearch(e.target.value)}
                            autoComplete="off"
                            className="w-full pl-10 pr-4 py-2.5 bg-[#1E1E1E] border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 outline-none transition-all focus:border-primary/30 focus:bg-[#252525]"
                        />
                    </div>

                    <div className="space-y-3">
                        {services
                            .filter(service => 
                                service.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
                                service.category.toLowerCase().includes(serviceSearch.toLowerCase())
                            )
                            .map(service => (
                                <ServiceSelectionCard 
                                    key={service.id} 
                                    service={service} 
                                    isSelected={selectedServiceIds.has(service.id)} 
                                    onSelect={handleServiceSelect} 
                                />
                            ))
                        }
                        {services.filter(service => 
                            service.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
                            service.category.toLowerCase().includes(serviceSearch.toLowerCase())
                        ).length === 0 && (
                            <div className="py-8 text-center bg-[#1E1E1E] rounded-xl border border-dashed border-white/10">
                                <p className="text-gray-500 text-sm">No services found matching "{serviceSearch}"</p>
                                <button 
                                    onClick={() => setServiceSearch('')}
                                    className="mt-2 text-primary text-xs font-bold hover:underline"
                                >
                                    Show all services
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className="p-4 bg-gradient-to-t from-secondary via-secondary/95 to-transparent shrink-0 z-30 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                <div className="max-w-md mx-auto w-full">
                    {error && <p className="text-red-400 text-center text-xs mb-3 bg-red-500/10 py-2 mx-4 rounded-lg border border-red-500/20">{error}</p>}
                    {selectedServiceIds.size > 0 && (
                        <div className="flex justify-between items-center mb-3 mx-4 p-3 bg-white/5 rounded-xl border border-white/5">
                            <span className="text-gray-400 text-xs font-bold">Total for {selectedServiceIds.size} service(s)</span>
                            <span className="font-black text-lg text-primary">₱{totalPrice.toLocaleString()}</span>
                        </div>
                    )}
                    <Tooltip content="Proceed to date selection" className="w-full">
                        <button onClick={handleStep1Continue} disabled={selectedServiceIds.size === 0 || !selectedVehiclePlate} className="w-full bg-primary text-white font-black h-12 flex items-center justify-center hover:bg-orange-600 transition disabled:opacity-50 rounded-2xl uppercase tracking-wider text-base shadow-lg shadow-primary/20">
                            Continue
                        </button>
                    </Tooltip>
                </div>
            </div>
        </>
    );

    const renderStep2 = () => {
        const todayStr = new Date().toISOString().split('T')[0];
        const startDateStr = selectedDate.toISOString().split('T')[0];

        const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            if (e.target.value) {
                const newStart = new Date(e.target.value);
                setSelectedDate(newStart);
                // Reset end date if it's now before the new start
                if (selectedEndDate && selectedEndDate < newStart) {
                    setSelectedEndDate(null);
                }
            }
        };

        const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            if (e.target.value) {
                setSelectedEndDate(new Date(e.target.value));
            } else {
                setSelectedEndDate(null);
            }
        };

        const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            setSelectedTime(e.target.value);
        };

        const handleEndTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            setSelectedEndTime(e.target.value);
        };

        const selectedServicesList = services.filter(s => selectedServiceIds.has(s.id));

        return (
            <>
                <div className="px-6 py-4 pb-32 space-y-4 flex-grow overflow-y-auto">
                    <div className="space-y-3">

                        {isSpecialRentalOrDriver ? (
                            /* ── Rental / Driver for Hire: 2-row grid ── */
                            <>
                                {/* Row 1: Start Date + Start Time */}
                                <div className="grid grid-cols-2 gap-4 mt-1">
                                    <div className="space-y-1.5">
                                        <label htmlFor="booking-date" className="text-xs font-bold text-gray-500 tracking-widest uppercase">Start Date</label>
                                        <div className="relative">
                                            <input
                                                id="booking-date"
                                                name="bookingDate"
                                                type="date"
                                                min={todayStr}
                                                value={selectedDate.toISOString().split('T')[0]}
                                                onChange={handleDateChange}
                                                autoComplete="off"
                                                className="w-full bg-[#1E1E1E] border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none transition-all focus:border-primary/50 custom-date-input date-picker-primary-icon"
                                                style={{ colorScheme: 'dark' }}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label htmlFor="booking-start-time" className="text-xs font-bold text-gray-500 tracking-widest uppercase">Start Time</label>
                                        <div className="relative">
                                            <input
                                                id="booking-start-time"
                                                name="bookingStartTime"
                                                type="time"
                                                value={selectedTime}
                                                onChange={handleTimeChange}
                                                autoComplete="off"
                                                className="w-full bg-[#1E1E1E] border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none transition-all focus:border-primary/50 custom-time-input time-picker-primary-icon"
                                                style={{ colorScheme: 'dark' }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Row 2: End Date + End Time */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label htmlFor="booking-end-date" className="text-xs font-bold text-gray-500 tracking-widest uppercase">Return Date</label>
                                        <div className="relative">
                                            <input
                                                id="booking-end-date"
                                                name="bookingEndDate"
                                                type="date"
                                                min={startDateStr}
                                                value={selectedEndDate ? selectedEndDate.toISOString().split('T')[0] : ''}
                                                onChange={handleEndDateChange}
                                                autoComplete="off"
                                                className="w-full bg-[#1E1E1E] border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none transition-all focus:border-primary/50 custom-date-input date-picker-primary-icon"
                                                style={{ colorScheme: 'dark' }}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label htmlFor="booking-end-time" className="text-xs font-bold text-gray-500 tracking-widest uppercase">Return Time</label>
                                        <div className="relative">
                                            <input
                                                id="booking-end-time"
                                                name="bookingEndTime"
                                                type="time"
                                                value={selectedEndTime}
                                                onChange={handleEndTimeChange}
                                                autoComplete="off"
                                                className="w-full bg-[#1E1E1E] border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none transition-all focus:border-primary/50 custom-time-input time-picker-primary-icon"
                                                style={{ colorScheme: 'dark' }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Duration badge */}
                                {selectedEndDate && (
                                    <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-xl px-4 py-2.5">
                                        <span className="text-primary text-lg">📅</span>
                                        <div>
                                            <p className="text-primary font-black text-sm">
                                                {rentalDays} day{rentalDays !== 1 ? 's' : ''} selected
                                            </p>
                                            <p className="text-gray-500 text-[10px]">
                                                {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} {selectedTime}
                                                {' → '}
                                                {selectedEndDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} {selectedEndTime}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            /* ── Standard service: Date + Time ── */
                            <div className="grid grid-cols-2 gap-4 mt-1">
                                <div className="space-y-1.5">
                                    <label htmlFor="booking-date" className="text-xs font-bold text-gray-500 tracking-widest uppercase">Date</label>
                                    <div className="relative">
                                        <input
                                            id="booking-date"
                                            name="bookingDate"
                                            type="date"
                                            min={todayStr}
                                            value={selectedDate.toISOString().split('T')[0]}
                                            onChange={handleDateChange}
                                            autoComplete="off"
                                            className="w-full bg-[#1E1E1E] border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none transition-all focus:border-white/20 custom-date-input date-picker-primary-icon"
                                            style={{ colorScheme: 'dark' }}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label htmlFor="booking-time" className="text-xs font-bold text-gray-500 tracking-widest uppercase">Time</label>
                                    <div className="relative">
                                        <input
                                            id="booking-time"
                                            name="bookingTime"
                                            type="time"
                                            value={selectedTime}
                                            onChange={handleTimeChange}
                                            autoComplete="off"
                                            className="w-full bg-[#1E1E1E] border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none transition-all focus:border-white/20 custom-time-input time-picker-primary-icon"
                                            style={{ colorScheme: 'dark' }}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Selected Services Summary */}
                        <div className="border border-white/5 bg-[#151515] rounded-xl p-4 mt-4 space-y-3">
                            <div className="flex justify-between items-center border-b border-white/5 pb-3">
                                <div>
                                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">Services Summary</h4>
                                    <p className="text-xs text-gray-500">{selectedServicesList.length} service(s) selected</p>
                                </div>
                            </div>

                            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                                {selectedServicesList.map(service => (
                                    <div key={service.id} className="flex gap-3 bg-[#1A1A1E] border border-white/5 p-3 rounded-lg">
                                        <div className="w-20 h-20 rounded-lg bg-[#222] border border-white/5 overflow-hidden flex-shrink-0 relative">
                                            {(() => {
                                                const normalized = normalizeServiceImage(service.imageUrl, service.category);
                                                return (
                                                    <img
                                                        src={normalized}
                                                        alt={service.name}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => { (e.target as HTMLImageElement).src = getFallbackImageForCategory(service.category); }}
                                                    />
                                                );
                                            })()}
                                        </div>
                                        <div className="flex-grow min-w-0">
                                            <div className="flex justify-between items-start gap-2">
                                                <h5 className="text-xs font-bold text-white truncate">{service.name}</h5>
                                                <span className="text-xs font-black text-primary flex-shrink-0">₱{(service.price || 0).toLocaleString()}</span>
                                            </div>
                                            <p className="text-[10px] text-gray-500 truncate mt-0.5">{service.category}</p>
                                            <p className="text-[10px] text-gray-400 mt-1 line-clamp-2 leading-relaxed">{service.description}</p>
                                            {service.estimatedTime && (
                                                <div className="bg-primary/20 border border-primary/20 text-primary text-[9px] font-black rounded-lg inline-flex items-center gap-1.5 px-2.5 py-1 mt-1.5">
                                                    <Clock size={10} />
                                                    <span>Est: {service.estimatedTime}</span>
                                                </div>
                                            )}
                                            {service.features && service.features.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {service.features.map((feat, idx) => (
                                                        <span key={idx} className="px-1.5 py-0.5 rounded bg-white/5 text-[8px] text-gray-400 border border-white/5">
                                                            {feat}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-between items-center border-t border-white/5 pt-3">
                                <span className="text-xs font-bold text-gray-400">
                                    {isSpecialRentalOrDriver && rentalDays > 1 ? `Total (${rentalDays} days):` : 'Total Price:'}
                                </span>
                                <span className="text-base font-black text-primary">₱{totalPrice.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex gap-3 items-start mt-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-xs text-gray-300 leading-relaxed">
                                {isSpecialRentalOrDriver
                                    ? 'Select your rental start and return dates. Pricing is calculated per day based on the duration selected.'
                                    : 'Please note that the actual arrival time may vary slightly depending on traffic conditions and the mechanic\'s previous job status. We will keep you updated.'}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="p-4 bg-gradient-to-t from-secondary via-secondary/95 to-transparent shrink-0 z-30 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                    <div className="max-w-md mx-auto w-full">
                        {error && <p className="text-red-400 text-center text-xs mb-3 bg-red-500/10 py-2 mx-4 rounded-lg border border-red-500/20">{error}</p>}
                        <Tooltip content={isSpecialRentalOrDriver ? "Proceed to vehicle / driver selection" : "Proceed to location confirmation"} className="w-full">
                            <button
                                onClick={handleStep2Continue}
                                disabled={!selectedDate || !selectedTime || (isSpecialRentalOrDriver && (!selectedEndDate || !selectedEndTime))}
                                className="w-full bg-primary text-white font-black h-12 flex items-center justify-center hover:bg-orange-600 transition disabled:opacity-50 rounded-2xl uppercase tracking-wider text-base shadow-lg shadow-primary/20"
                            >
                                Continue
                            </button>
                        </Tooltip>
                    </div>
                </div>
            </>
        )
    };

    const renderStep3 = () => {
        if (isSpecialRentalOrDriver) {
            const totalItems = (isCarRental ? cars.filter(c => c.isAvailable !== false).length : 0) + (isDriverHire ? drivers.filter(d => d.isAvailable !== false).length : 0);
            const selectedCount = (isCarRental && selectedCar ? 1 : 0) + (isDriverHire && selectedDriver ? 1 : 0);

            return (
                <div className="flex flex-col h-full">
                    {/* ── Sticky Header ── */}
                    <div className="shrink-0 px-5 pt-4 pb-3 bg-[#121212] border-b border-white/5 z-20">
                        <div className="flex items-center justify-between gap-3">
                            {/* Back button */}
                            <button
                                onClick={handleBack}
                                className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 active:scale-95 transition-all"
                                aria-label="Go back"
                            >
                                <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>

                            {/* Title + subtitle */}
                            <div className="flex-1 min-w-0">
                                <h2 className="text-lg font-black text-white tracking-tight leading-tight">
                                    {isCarRental && isDriverHire ? 'Select Car & Driver' : isCarRental ? 'Select a Car' : 'Select a Driver'}
                                </h2>
                                <p className="text-xs text-gray-500 mt-0.5 truncate">
                                    {isCarRental && isDriverHire
                                        ? 'Choose one car and one driver for your trip'
                                        : isCarRental
                                        ? 'Choose a vehicle for your rental'
                                        : 'Choose a professional driver for your trip'}
                                </p>
                            </div>

                            {/* Available count badge */}
                            <div className="bg-primary/10 border border-primary/20 rounded-xl px-3 py-1.5 text-right flex-shrink-0">
                                <p className="text-[9px] font-black text-primary tracking-widest uppercase">Available</p>
                                <p className="text-base font-black text-white">{totalItems}</p>
                            </div>
                        </div>

                        {/* Selection status pills */}
                        {(isCarRental || isDriverHire) && (
                            <div className="flex gap-2 mt-3">
                                {isCarRental && (
                                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black border transition-all ${selectedCar ? 'bg-primary/20 border-primary/40 text-primary' : 'bg-white/5 border-white/10 text-gray-500'}`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${selectedCar ? 'bg-primary' : 'bg-gray-600'}`} />
                                        {selectedCar ? `${(selectedCar.name || `${selectedCar.make} ${selectedCar.model}`).split(' ').slice(0,2).join(' ')} selected` : 'No car selected'}
                                    </div>
                                )}
                                {isDriverHire && (
                                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black border transition-all ${selectedDriver ? 'bg-primary/20 border-primary/40 text-primary' : 'bg-white/5 border-white/10 text-gray-500'}`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${selectedDriver ? 'bg-primary' : 'bg-gray-600'}`} />
                                        {selectedDriver ? `${selectedDriver.name.split(' ')[0]} selected` : 'No driver selected'}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ── Scrollable List ── */}
                    <div className="flex-1 overflow-y-auto pb-32 px-4 pt-4 space-y-6">

                        {/* ── Car List ── */}
                        {isCarRental && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">🚗</span>
                                    <h3 className="text-xs font-black text-gray-400 tracking-widest uppercase">Available Vehicles ({cars.filter(c => c.isAvailable !== false).length})</h3>
                                </div>
                                {cars.map(car => {
                                    const isSelected = selectedCar?.id === car.id;
                                    const isAvailable = car.isAvailable !== false;
                                    const carName = car.name || `${car.make} ${car.model}`;
                                    return (
                                        <div
                                            key={car.id}
                                            onClick={() => {
                                                if (isAvailable) {
                                                    setSelectedCar(car);
                                                }
                                            }}
                                            className={`relative bg-[#1A1A1A] rounded-2xl overflow-hidden transition-all duration-200 border-2 ${
                                                isSelected
                                                    ? 'border-primary shadow-xl shadow-primary/20'
                                                    : 'border-white/5 hover:border-primary/40 hover:shadow-lg'
                                            } ${!isAvailable ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                                        >
                                            {/* Selected glow strip */}
                                            {isSelected && <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent" />}

                                            <div className="flex gap-0">
                                                {/* Left: Image */}
                                                <div className="relative w-28 flex-shrink-0">
                                                    <img
                                                        src={car.imageUrl}
                                                        alt={carName}
                                                        className="w-full h-full object-cover"
                                                        style={{ minHeight: '130px' }}
                                                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=400'; }}
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#1A1A1A]/60" />
                                                    {/* Type badge on image */}
                                                    <span className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                                                        {car.type}
                                                    </span>
                                                </div>

                                                {/* Right: Details */}
                                                <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                                                    <div>
                                                        <div className="flex items-start justify-between gap-2 mb-1">
                                                            <h4 className={`font-black text-sm leading-tight transition-colors ${isSelected ? 'text-primary' : 'text-white'}`}>
                                                                {carName}
                                                            </h4>
                                                            {/* Selection circle */}
                                                            <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center transition-all ${isSelected ? 'bg-primary' : 'bg-white/10 border border-white/20'}`}>
                                                                {isSelected && <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                                            </div>
                                                        </div>

                                                        {/* Specs row */}
                                                        <div className="flex items-center gap-1.5 flex-wrap mb-2">
                                                            <span className="text-[9px] text-gray-500 flex items-center gap-0.5">⚙️ {car.transmission || 'Automatic'}</span>
                                                            <span className="text-gray-700">•</span>
                                                            <span className="text-[9px] text-gray-500 flex items-center gap-0.5">⛽ {car.fuelPolicy || 'Full to Full'}</span>
                                                        </div>

                                                        {/* Feature tags */}
                                                        <div className="flex flex-wrap gap-1 mb-2">
                                                            {(car.features || []).slice(0, 3).map(f => (
                                                                <span key={f} className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium ${isSelected ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-white/5 border-white/10 text-gray-500'}`}>
                                                                    {f}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Price + rental total */}
                                                    <div className="flex items-end justify-between mt-1">
                                                        <div>
                                                            <p className="text-primary font-black text-base leading-none">₱{car.pricePerDay.toLocaleString()}</p>
                                                            <p className="text-gray-600 text-[9px] mt-0.5">per day</p>
                                                        </div>
                                                        {rentalDays > 1 && (
                                                            <div className="text-right">
                                                                <p className="text-white font-black text-xs">₱{(car.pricePerDay * rentalDays).toLocaleString()}</p>
                                                                <p className="text-gray-600 text-[9px]">{rentalDays} days total</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* ── Driver List ── */}
                        {isDriverHire && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">👨‍✈️</span>
                                    <h3 className="text-xs font-black text-gray-400 tracking-widest uppercase">Available Drivers ({drivers.filter(d => d.isAvailable !== false).length})</h3>
                                </div>
                                {drivers.map(driver => {
                                    const isSelected = selectedDriver?.id === driver.id;
                                    const isAvailable = driver.isAvailable !== false;
                                    const coverage = driver.coverage || driver.geoLimit || 'Province Wide';
                                    return (
                                        <div
                                            key={driver.id}
                                            onClick={() => {
                                                if (isAvailable) {
                                                    setSelectedDriver(driver);
                                                }
                                            }}
                                            className={`relative bg-[#1A1A1A] rounded-2xl overflow-hidden transition-all duration-200 border-2 ${
                                                isSelected
                                                    ? 'border-primary shadow-xl shadow-primary/20'
                                                    : 'border-white/5 hover:border-primary/40 hover:shadow-lg'
                                            } ${!isAvailable ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                                        >
                                            {isSelected && <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent" />}

                                            <div className="flex gap-0">
                                                {/* Left: Photo */}
                                                <div className="relative w-28 flex-shrink-0">
                                                    <img
                                                        src={driver.imageUrl}
                                                        alt={driver.name}
                                                        className="w-full h-full object-cover object-top"
                                                        style={{ minHeight: '150px' }}
                                                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400'; }}
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#1A1A1A]/60" />
                                                    {/* Duty status badge */}
                                                    <span className={`absolute top-2 left-2 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider backdrop-blur-sm ${isAvailable ? 'bg-green-500/90 text-white' : 'bg-gray-600/90 text-white'}`}>
                                                        {isAvailable ? 'Available' : 'Not Available'}
                                                    </span>
                                                    {/* Rating badge on photo */}
                                                    <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/70 backdrop-blur-sm rounded-lg px-1.5 py-0.5">
                                                        <span className="text-yellow-400 text-[10px]">★</span>
                                                        <span className="text-white font-black text-[10px]">{driver.rating || 5.0}</span>
                                                    </div>
                                                </div>

                                                {/* Right: Details */}
                                                <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                                                    <div>
                                                        <div className="flex items-start justify-between gap-2 mb-1">
                                                            <h4 className={`font-black text-sm leading-tight transition-colors ${isSelected ? 'text-primary' : 'text-white'}`}>
                                                                {driver.name}
                                                            </h4>
                                                            <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center transition-all ${isSelected ? 'bg-primary' : 'bg-white/10 border border-white/20'}`}>
                                                                {isSelected && <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                                            </div>
                                                        </div>

                                                        {/* Type + experience + coverage */}
                                                        <div className="flex items-center gap-1.5 flex-wrap mb-2">
                                                            <span className="text-[9px] text-gray-500">{driver.type || 'Professional'}</span>
                                                            <span className="text-gray-700">•</span>
                                                            <span className="text-[9px] text-gray-500">🕐 {driver.experience}</span>
                                                            <span className="text-gray-700">•</span>
                                                            <span className={`text-[9px] font-bold ${coverage === 'Province Wide' ? 'text-blue-400' : 'text-green-400'}`}>
                                                                📍 {coverage}
                                                            </span>
                                                        </div>

                                                        {/* Phone & License badges */}
                                                        <div className="flex flex-wrap gap-2 mb-2">
                                                            {driver.phone && (
                                                                <span className={`text-[9px] px-1.5 py-0.5 rounded-md border font-medium flex items-center gap-1 ${isSelected ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-white/5 border-white/10 text-gray-400'}`}>
                                                                    📞 {driver.phone}
                                                                </span>
                                                            )}
                                                            {driver.licenseType && (
                                                                <span className={`text-[9px] px-1.5 py-0.5 rounded-md border font-medium flex items-center gap-1 ${isSelected ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-white/5 border-white/10 text-gray-400'}`}>
                                                                    🪪 {driver.licenseType}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Price + rental total */}
                                                    <div className="flex items-end justify-between mt-1">
                                                        <div>
                                                            <p className="text-primary font-black text-base leading-none">₱{driver.pricePerDay.toLocaleString()}</p>
                                                            <p className="text-gray-600 text-[9px] mt-0.5">per day</p>
                                                        </div>
                                                        {rentalDays > 1 && (
                                                            <div className="text-right">
                                                                <p className="text-white font-black text-xs">₱{(driver.pricePerDay * rentalDays).toLocaleString()}</p>
                                                                <p className="text-gray-600 text-[9px]">{rentalDays} days total</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                    </div>

                    {/* ── Sticky Footer ── */}
                    <div className="shrink-0 border-t border-white/5 bg-[#121212] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] z-20">
                        {/* Selection summary */}
                        {selectedCount > 0 && (
                            <div className="flex items-center justify-between mb-3 bg-white/5 rounded-xl px-4 py-2.5">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                    <span className="text-xs font-bold text-gray-300">
                                        {isCarRental && selectedCar && `${selectedCar.name}`}
                                        {isCarRental && selectedCar && isDriverHire && selectedDriver && ' + '}
                                        {isDriverHire && selectedDriver && `${selectedDriver.name}`}
                                    </span>
                                </div>
                                <span className="text-primary font-black text-sm">
                                    ₱{(
                                        (isCarRental && selectedCar ? selectedCar.pricePerDay * rentalDays : 0) +
                                        (isDriverHire && selectedDriver ? selectedDriver.pricePerDay * rentalDays : 0)
                                    ).toLocaleString()}
                                </span>
                            </div>
                        )}
                        {error && <p className="text-red-400 text-center text-xs mb-3 bg-red-500/10 py-2 rounded-lg border border-red-500/20">{error}</p>}
                        <button
                            onClick={handleStep3Continue}
                            className="w-full bg-primary text-white font-black h-12 flex items-center justify-center gap-2 hover:bg-orange-600 transition rounded-2xl uppercase tracking-wider text-base shadow-lg shadow-primary/20 disabled:opacity-50"
                            disabled={
                                (isCarRental && !selectedCar) ||
                                (isDriverHire && !selectedDriver)
                            }
                        >
                            <span>Continue</span>
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                        </button>
                    </div>
                </div>
            );
        }

        const retryLocation = () => {
            setLocationStatus('idle');
            setServiceLocation(null);
            // Destroy old map so it re-initializes at the right time
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
                markerRef.current = null;
            }
        };

        return (
            <div className="flex-grow flex flex-col relative h-full w-full" style={{ minHeight: 0 }}>
                {/* Map always rendered so Leaflet can calculate dimensions */}
                <div className="flex-grow w-full relative" style={{ minHeight: 0, zIndex: 1 }}>
                    {/* Header Overlay */}
                    <div className="absolute top-0 left-0 right-0 p-4 pb-8 z-[500] bg-gradient-to-b from-black/95 via-black/75 to-transparent flex items-center gap-3 pointer-events-none">
                        <button
                            onClick={handleBack}
                            className="p-2 bg-[#1E1E1E]/90 hover:bg-[#252525] rounded-full transition-all text-white border border-white/10 pointer-events-auto shadow-lg"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <div className="flex flex-col">
                            <h3 className="text-lg font-black text-white leading-tight drop-shadow-md">Confirm Service Location</h3>
                            <p className="text-[10px] text-gray-300 font-bold tracking-wide leading-none mt-1 drop-shadow-md">Your mechanic will be dispatched here.</p>
                        </div>
                    </div>

                    <div
                        ref={mapRef}
                        className="absolute inset-0 w-full h-full"
                        style={{ zIndex: 1 }}
                    />

                    {/* Loading overlay — on top of map */}
                    {locationStatus === 'fetching' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#121212] z-[300]">
                            <div className="relative">
                                <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping"></div>
                                <Spinner size="lg" />
                            </div>
                            <p className="mt-6 text-white font-bold tracking-widest text-xs animate-pulse">Locating you...</p>
                        </div>
                    )}

                    {/* Error overlay */}
                    {locationStatus === 'error' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#121212] z-[300] p-6 text-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <p className="text-white font-bold mb-2">Location Error</p>
                            <p className="text-gray-400 text-sm mb-6">{locationError}</p>
                            <Tooltip content="Retry location detection">
                                <button onClick={retryLocation} className="bg-white/10 hover:bg-white/20 text-white font-bold py-3 px-8 rounded-xl transition-all">
                                    Try Again
                                </button>
                            </Tooltip>
                        </div>
                    )}

                    {/* Map controls overlay */}
                    {locationStatus === 'success' && (
                        <>
                            {/* GPS Accuracy Pill */}
                            {locationAccuracy !== null && (
                                <div className="absolute top-24 left-4 z-[400] bg-[#1a1a1ae0] backdrop-blur-md px-3 py-2 rounded-xl border border-white/10 flex items-center gap-2 shadow-2xl transition-all duration-300 animate-slideDown">
                                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isTrackingLive ? 'bg-green-500 animate-pulse shadow-md shadow-green-500/50' : 'bg-amber-500'}`} />
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-white font-extrabold tracking-wider leading-none">
                                            {isTrackingLive ? 'LIVE GPS ACTIVE' : 'MANUAL PIN PLACEMENT'}
                                        </span>
                                        <span className="text-[8px] text-gray-400 font-bold mt-1 leading-none">
                                            {isTrackingLive ? `Accurate to ±${Math.round(locationAccuracy)}m` : 'Tap recenter to resume'}
                                        </span>
                                    </div>
                                    {!isTrackingLive && (
                                        <button
                                            onClick={() => setIsTrackingLive(true)}
                                            className="border border-[#FE7803] hover:bg-[#FE7803] hover:text-white text-[#FE7803] text-[8px] font-bold px-2 py-1 rounded-md ml-0.5 transition-all uppercase tracking-wide"
                                        >
                                            Resume
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Zoom + Recenter Controls — right side */}
                            <div className="absolute top-1/2 -translate-y-1/2 right-4 z-[400] flex flex-col gap-2.5">
                                {/* Zoom In */}
                                <button
                                    onClick={() => { if (mapInstanceRef.current) mapInstanceRef.current.zoomIn(); }}
                                    className="w-11 h-11 flex items-center justify-center backdrop-blur-md border border-white/20 bg-[#1E1E1E]/90 text-white rounded-full shadow-xl transition-all duration-200 hover:bg-white/20 hover:border-white/40 active:scale-90"
                                    title="Zoom In"
                                >
                                    {/* Plus icon */}
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="12" y1="5" x2="12" y2="19" />
                                        <line x1="5" y1="12" x2="19" y2="12" />
                                    </svg>
                                </button>

                                {/* Zoom Out */}
                                <button
                                    onClick={() => { if (mapInstanceRef.current) mapInstanceRef.current.zoomOut(); }}
                                    className="w-11 h-11 flex items-center justify-center backdrop-blur-md border border-white/20 bg-[#1E1E1E]/90 text-white rounded-full shadow-xl transition-all duration-200 hover:bg-white/20 hover:border-white/40 active:scale-90"
                                    title="Zoom Out"
                                >
                                    {/* Minus icon */}
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="5" y1="12" x2="19" y2="12" />
                                    </svg>
                                </button>

                                {/* Recenter / GPS button */}
                                <button
                                    onClick={() => {
                                        setIsTrackingLive(true);
                                        if (navigator.geolocation) {
                                            navigator.geolocation.getCurrentPosition(
                                                (position) => {
                                                    const { latitude, longitude, accuracy } = position.coords;
                                                    setServiceLocation({ lat: latitude, lng: longitude });
                                                    setLocationAccuracy(accuracy);
                                                    if (mapInstanceRef.current) {
                                                        mapInstanceRef.current.setView([latitude, longitude], 18, { animate: true, duration: 0.8 });
                                                    }
                                                    if (markerRef.current) {
                                                        markerRef.current.setLatLng([latitude, longitude]);
                                                    }
                                                },
                                                () => {},
                                                { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
                                            );
                                        }
                                    }}
                                    className={`w-11 h-11 flex items-center justify-center rounded-full shadow-2xl transition-all duration-300 active:scale-90 relative overflow-hidden ${
                                        isTrackingLive
                                            ? 'bg-[#FE7803] border-2 border-white/30 shadow-[0_0_24px_rgba(254,120,3,0.5)]'
                                            : 'bg-[#FE7803]/90 border-2 border-[#FE7803]/60 hover:bg-[#FE7803] hover:shadow-[0_0_20px_rgba(254,120,3,0.4)]'
                                    }`}
                                    title="Recenter on my location"
                                >
                                    {/* Animated ping ring when active */}
                                    {isTrackingLive && (
                                        <span className="absolute inset-0 rounded-full border-2 border-white/40 animate-ping opacity-60" />
                                    )}
                                    {/* Crosshair / GPS target icon */}
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

                            {/* Drag-pin hint — bottom center */}
                            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[400] pointer-events-none">
                                <div className="bg-black/70 backdrop-blur-md px-4 py-2 rounded-full border border-white/15 flex items-center gap-2 shadow-xl">
                                    {/* Touch / drag finger icon */}
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FE7803" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-bounce flex-shrink-0">
                                        <path d="M12 2a2 2 0 0 1 2 2v6.5l1.5-.9A2 2 0 0 1 18 11.5v1a7 7 0 0 1-14 0v-2a2 2 0 0 1 3-1.8V4a2 2 0 0 1 2-2z" />
                                    </svg>
                                    <span className="text-[9px] font-black text-white tracking-widest whitespace-nowrap">DRAG PIN OR TAP MAP TO MOVE</span>
                                </div>
                            </div>
                        </>
                    )}

                </div>
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-[500] pointer-events-none flex justify-center pb-[calc(1rem+env(safe-area-inset-bottom))]">
                    <div className="w-full max-w-md pointer-events-auto">
                        <Tooltip content="Confirm your service location" className="w-full">
                            <button onClick={handleStep3Continue} disabled={locationStatus !== 'success'} className="w-full bg-primary text-white font-black h-12 flex items-center justify-center hover:bg-orange-600 transition disabled:opacity-50 gap-2 text-base uppercase tracking-wider rounded-2xl shadow-lg shadow-primary/20">
                                {locationStatus === 'success' ? (
                                    <>Confirm Location <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg></>
                                ) : 'Determining Location...'}
                            </button>
                        </Tooltip>
                    </div>
                </div>
            </div>
        );
    };


    const renderStep4 = () => {
        if (isSpecialRentalOrDriver) {
            return (
                <div className="p-6 pb-32 space-y-6 flex-grow overflow-y-auto relative">
                    {/* Click outside backdrop for suggestions */}
                    {(showStartSuggestions || showEndSuggestions) && (
                        <div
                            className="fixed inset-0 z-[9990] bg-transparent"
                            onClick={() => { setShowStartSuggestions(false); setShowEndSuggestions(false); }}
                        />
                    )}

                    <div className="space-y-5 relative z-[9995]">
                        <h3 className="text-sm font-bold text-gray-400 tracking-wider">Enter Route Locations</h3>
                        <div className="space-y-4 bg-[#1E1E1E] p-4 rounded-xl border border-white/5 relative">
                            <div className="space-y-2 relative">
                                <label htmlFor="start-location" className="text-xs font-bold text-gray-500 tracking-widest uppercase">Start Point Location</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        id="start-location"
                                        name="startLocation"
                                        placeholder="Enter pickup address / start point..."
                                        value={startLocation}
                                        onChange={(e) => setStartLocation(e.target.value)}
                                        onFocus={() => { setShowStartSuggestions(true); setShowEndSuggestions(false); }}
                                        autoComplete="off"
                                        className="w-full pl-4 pr-12 py-3 bg-[#151515] border border-white/10 rounded-xl text-white placeholder-gray-600 outline-none focus:border-primary/50 transition-all text-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleUseLiveLocation}
                                        disabled={isLocating}
                                        className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-primary/10 border border-primary/25 text-primary hover:bg-primary/20 transition-all ${isLocating ? 'animate-pulse' : ''}`}
                                        title="Use your real-time live location"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                                            <circle cx="12" cy="10" r="3" />
                                        </svg>
                                    </button>

                                    {/* Suggestions dropdown */}
                                    {showStartSuggestions && startSuggestions.length > 0 && (
                                        <div className="absolute left-0 right-0 top-full bg-[#1a1a1a] border border-white/10 rounded-xl mt-1.5 z-[9999] overflow-y-auto max-h-48 shadow-2xl">
                                            {startSuggestions.map((s: any) => (
                                                <button
                                                    key={s.place_id}
                                                    type="button"
                                                    onClick={() => handleSelectStartSuggestion(s)}
                                                    className="w-full text-left px-4 py-2.5 text-xs text-gray-300 hover:bg-white/5 border-b border-white/5 last:border-b-0 truncate transition-colors flex items-center gap-2"
                                                >
                                                    <span className="text-primary text-[10px]">📍</span>
                                                    <span className="truncate">{s.display_name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-2 relative">
                                <label htmlFor="end-location" className="text-xs font-bold text-gray-500 tracking-widest uppercase">End Point Location</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        id="end-location"
                                        name="endLocation"
                                        placeholder="Enter drop-off address / destination..."
                                        value={endLocation}
                                        onChange={(e) => setEndLocation(e.target.value)}
                                        onFocus={() => { setShowEndSuggestions(true); setShowStartSuggestions(false); }}
                                        autoComplete="off"
                                        className="w-full px-4 py-3 bg-[#151515] border border-white/10 rounded-xl text-white placeholder-gray-600 outline-none focus:border-primary/50 transition-all text-sm"
                                    />

                                    {/* Suggestions dropdown */}
                                    {showEndSuggestions && endSuggestions.length > 0 && (
                                        <div className="absolute left-0 right-0 top-full bg-[#1a1a1a] border border-white/10 rounded-xl mt-1.5 z-[9999] overflow-y-auto max-h-48 shadow-2xl">
                                            {endSuggestions.map((s: any) => (
                                                <button
                                                    key={s.place_id}
                                                    type="button"
                                                    onClick={() => handleSelectEndSuggestion(s)}
                                                    className="w-full text-left px-4 py-2.5 text-xs text-gray-300 hover:bg-white/5 border-b border-white/5 last:border-b-0 truncate transition-colors flex items-center gap-2"
                                                >
                                                    <span className="text-primary text-[10px]">📍</span>
                                                    <span className="truncate">{s.display_name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Interactive Route Map */}
                        <div className="space-y-2">
                            <div className="text-xs font-bold text-gray-500 tracking-widest uppercase flex items-center justify-between">
                                <span>Route Preview Map</span>
                                {startCoords && endCoords && <span className="text-[10px] text-green-400 font-black animate-pulse">● Live routing active</span>}
                            </div>
                            <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-lg shadow-black/40">
                                <div ref={routeMapRef} className="relative w-full h-[240px] bg-[#121212] z-[1]" />
                                {/* Custom Premium Overlay Map Controls */}
                                <div className="absolute right-3 top-3 flex flex-col gap-2 z-20">
                                    <button
                                        type="button"
                                        onClick={() => { if (routeMapInstanceRef.current) routeMapInstanceRef.current.zoomIn(); }}
                                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#1a1a1a]/95 border border-white/10 text-white hover:bg-white/10 active:scale-95 transition-all text-lg font-black"
                                    >
                                        +
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { if (routeMapInstanceRef.current) routeMapInstanceRef.current.zoomOut(); }}
                                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#1a1a1a]/95 border border-white/10 text-white hover:bg-white/10 active:scale-95 transition-all text-lg font-black"
                                    >
                                        −
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-gradient-to-t from-secondary via-secondary/95 to-transparent shrink-0 z-30 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                        <div className="max-w-md mx-auto w-full">
                            {error && <p className="text-red-400 text-center text-xs mb-3 bg-red-500/10 py-2 mx-4 rounded-lg border border-red-500/20">{error}</p>}
                            <button onClick={handleStep4Continue} className="w-full bg-primary text-white font-black h-12 flex items-center justify-center hover:bg-orange-600 transition rounded-2xl uppercase tracking-wider text-base shadow-lg shadow-primary/20">
                                Continue to Summary
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        const selectedServices = services.filter(s => selectedServiceIds.has(s.id));

        // Check which mechanics are currently busy
        const isMechanicBusy = (mechanicId: string) => {
            return bookings.some(b =>
                b.mechanic?.id === mechanicId &&
                (b.status === 'En Route' || b.status === 'In Progress' || b.status === 'Mechanic Assigned')
            );
        };

        const handleSelectMechanic = (mechanic: Mechanic) => {
            setSelectedMechanic(mechanic);
            setStep(5);
        };

        return (
            <div className="p-6 space-y-5 flex-grow overflow-y-auto">
                {/* Search & Filters */}
                <div className="bg-[#1E1E1E] p-4 rounded-2xl border border-white/10 space-y-3">

                    {/* Search Input */}
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </span>
                        <input
                            id="mechanic-search"
                            name="mechanic-search"
                            type="text"
                            placeholder="Search by name..."
                            value={mechanicSearch}
                            onChange={(e) => setMechanicSearch(e.target.value)}
                            className="w-full pr-4 py-3 bg-[#151515] border border-white/10 rounded-xl text-white placeholder-gray-600 outline-none transition-all focus:border-white/20"
                            style={{ paddingLeft: '3rem' }}
                        />
                    </div>

                    {/* Filters */}
                    <div className="grid grid-cols-2 gap-3 relative">
                        {/* Overlay backdrop shield to dismiss dropdowns on click */}
                        {(isSpecializationOpen || isSortOpen) && (
                            <div 
                                className="fixed inset-0 z-30 bg-transparent" 
                                onClick={() => {
                                    setIsSpecializationOpen(false);
                                    setIsSortOpen(false);
                                }}
                            />
                        )}

                        {/* Specialization Filter Dropdown */}
                        <div className="relative z-40">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsSpecializationOpen(!isSpecializationOpen);
                                    setIsSortOpen(false);
                                }}
                                className="w-full flex items-center justify-between px-3 py-2 bg-[#151515] border border-white/10 hover:border-white/20 rounded-xl text-white text-xs font-bold transition-all text-left outline-none min-h-[50px]"
                            >
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[8px] text-gray-500 font-extrabold uppercase tracking-wider">Specialization</span>
                                    <span className="truncate capitalize text-xs font-bold text-white mt-0.5">
                                        {specializationFilter === 'all' ? 'Any Specialization' : specializationFilter}
                                    </span>
                                </div>
                                <svg 
                                    xmlns="http://www.w3.org/2000/svg" 
                                    className={`h-4 w-4 text-gray-500 transition-transform duration-300 flex-shrink-0 ml-1 ${isSpecializationOpen ? 'rotate-180' : ''}`} 
                                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {/* Dropdown Menu */}
                            {isSpecializationOpen && (
                                <div className="absolute right-0 left-0 mt-1.5 max-h-60 overflow-y-auto bg-[#1E1E1E]/95 backdrop-blur-md border border-white/15 rounded-xl shadow-2xl z-50 py-1 divide-y divide-white/5 animate-in fade-in slide-in-from-top-1 duration-200">
                                    {allSpecializations.map(spec => (
                                        <button
                                            key={spec}
                                            type="button"
                                            onClick={() => {
                                                setSpecializationFilter(spec);
                                                setIsSpecializationOpen(false);
                                            }}
                                            className={`w-full text-left px-4 py-2.5 text-xs transition-colors capitalize hover:bg-primary/10 hover:text-primary ${
                                                specializationFilter === spec ? 'text-primary font-black bg-primary/5' : 'text-gray-300 font-bold'
                                            }`}
                                        >
                                            {spec === 'all' ? 'Any Specialization' : spec}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Sort Option Dropdown */}
                        <div className="relative z-40">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsSortOpen(!isSortOpen);
                                    setIsSpecializationOpen(false);
                                }}
                                className="w-full flex items-center justify-between px-3 py-2 bg-[#151515] border border-white/10 hover:border-white/20 rounded-xl text-white text-xs font-bold transition-all text-left outline-none min-h-[50px]"
                            >
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[8px] text-gray-500 font-extrabold uppercase tracking-wider">Sort By</span>
                                    <span className="truncate text-xs font-bold text-white mt-0.5">
                                        {sortOption === 'rating_desc' && '★ Highest Rating'}
                                        {sortOption === 'rating_asc' && '★ Lowest Rating'}
                                        {sortOption === 'jobs_desc' && '🛠 Most Jobs Done'}
                                        {sortOption === 'jobs_asc' && '🛠 Least Jobs Done'}
                                        {sortOption === 'name_asc' && '🔤 Name: A to Z'}
                                        {sortOption === 'name_desc' && '🔤 Name: Z to A'}
                                    </span>
                                </div>
                                <svg 
                                    xmlns="http://www.w3.org/2000/svg" 
                                    className={`h-4 w-4 text-gray-500 transition-transform duration-300 flex-shrink-0 ml-1 ${isSortOpen ? 'rotate-180' : ''}`} 
                                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {/* Dropdown Menu */}
                            {isSortOpen && (
                                <div className="absolute right-0 left-0 mt-1.5 bg-[#1E1E1E]/95 backdrop-blur-md border border-white/15 rounded-xl shadow-2xl z-50 py-1 divide-y divide-white/5 animate-in fade-in slide-in-from-top-1 duration-200">
                                    {[
                                        { value: 'rating_desc', label: '★ Highest Rating' },
                                        { value: 'rating_asc', label: '★ Lowest Rating' },
                                        { value: 'jobs_desc', label: '🛠 Most Jobs Done' },
                                        { value: 'jobs_asc', label: '🛠 Least Jobs Done' },
                                        { value: 'name_asc', label: '🔤 Name: A to Z' },
                                        { value: 'name_desc', label: '🔤 Name: Z to A' }
                                    ].map(opt => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => {
                                                setSortOption(opt.value);
                                                setIsSortOpen(false);
                                            }}
                                            className={`w-full text-left px-4 py-2.5 text-xs transition-colors hover:bg-primary/10 hover:text-primary ${
                                                sortOption === opt.value ? 'text-primary font-black bg-primary/5' : 'text-gray-300 font-bold'
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {selectedServices.length > 0 && (
                    <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 flex items-start gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-xs text-gray-300">Showing mechanics specializing in: <span className="font-bold text-primary">{selectedServices.map(s => s.category).join(', ')}</span></p>
                    </div>
                )}

                {/* Mechanics List */}
                <div className="space-y-4">
                    {filteredAndSortedMechanics.length === 0 ? (
                        <div className="flex   flex-col items-center justify-center py-12 text-center">
                            <div className="w-16 h-16 bg-gray-700/20 rounded-full flex items-center justify-center mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            </div>
                            <p className="text-gray-400 font-bold">No Available Mechanics</p>
                            <p className="text-gray-600 text-sm mt-1">Try adjusting your filters or selecting a different date</p>
                        </div>
                    ) : (
                        filteredAndSortedMechanics.map(({ mechanic, distance }) => (
                            <MechanicAvailabilityCard
                                key={mechanic.id}
                                mechanic={mechanic}
                                distance={distance}
                                isBusy={isMechanicBusy(mechanic.id)}
                                onSelect={handleSelectMechanic}
                            />
                        ))
                    )}
                </div>
            </div>
        );
    };

    const renderStep5 = () => {
        const selectedServices = services.filter(s => selectedServiceIds.has(s.id));
        const selectedVehicle = user?.vehicles.find(v => v.plateNumber === selectedVehiclePlate);

        // Calculate estimated duration
        const estimatedDuration = selectedServices.reduce((total, service) => total + (service.duration || 60), 0);
        const isQuoteRequest = selectedServices.some(s => s.price === 0);

        // Generate Google Maps link
        const googleMapsLink = serviceLocation
            ? `https://www.google.com/maps/search/?api=1&query=${serviceLocation.lat},${serviceLocation.lng}`
            : '';

        if (authLoading) {
            return (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-400">Loading your profile...</p>
                </div>
            );
        }

        if (selectedServices.length === 0 || !selectedVehicle || (!isSpecialRentalOrDriver && !selectedMechanic)) {
            return (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-4">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    </div>
                    <p className="text-white font-bold text-lg">Incomplete Booking Details</p>
                    <p className="text-gray-400 text-sm">
                        {!selectedVehicle ? "Please select a vehicle. " : ""}
                        {selectedServices.length === 0 ? "Please select at least one service. " : ""}
                        {(!isSpecialRentalOrDriver && !selectedMechanic) ? "Please select a mechanic. " : ""}
                    </p>
                    <Tooltip content="Start over from the beginning">
                        <button onClick={() => setStep(1)} className="px-6 py-2 bg-white/10 text-white rounded-lg font-bold hover:bg-white/20 transition">Restart Booking</button>
                    </Tooltip>
                </div>
            );
        }

        return (
            <div className="flex flex-col h-full bg-secondary overflow-hidden">
                <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3.5 custom-scrollbar pb-28">
                    {/* Header Info */}
                    <div className="space-y-0.5">
                        <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">Booking Summary</h3>
                        <p className="text-xs text-gray-400">Please review your appointment details before confirming.</p>
                    </div>

                    {/* Main Summary Card */}
                    <div className="bg-[#1E1E1E] rounded-xl border border-white/5 overflow-hidden shadow-xl relative">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-orange-400 to-primary"></div>
                        <div className="p-4 sm:p-5 space-y-4">
                            <div>
                                <h4 className="text-[10px] font-black text-gray-500 tracking-widest mb-2.5 uppercase">Selected Services</h4>
                                <div className="space-y-2">
                                    {selectedServices.map(service => (
                                        <div key={service.id} className="flex justify-between items-start group">
                                            <div className="flex-1">
                                                <p className="font-bold text-white text-sm group-hover:text-primary transition-colors">{service.name}</p>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-[10px] text-gray-500">{service.category}</span>
                                                    {service.duration && (
                                                        <span className="text-[9px] text-gray-600 flex items-center gap-1">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                            {service.duration} mins
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {service.price > 0 ? (
                                                <p className="font-bold text-white text-sm ml-4">₱{service.price.toLocaleString()}</p>
                                            ) : (
                                                <span className="px-2 py-1 bg-yellow-500/10 text-yellow-400 text-[9px] font-bold rounded ml-4 uppercase">Quote</span>
                                            )}
                                        </div>
                                    ))}
                                    {isCarRental && selectedCar && (
                                        <div className="flex justify-between items-start group border-t border-white/5 pt-2">
                                            <div className="flex-1">
                                                <p className="font-bold text-white text-sm group-hover:text-primary transition-colors">{selectedCar.name} (Car Rental)</p>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-[10px] text-gray-500">{selectedCar.type} • {selectedCar.transmission}</span>
                                                    {rentalDays > 1 && <span className="text-[9px] text-primary font-bold">{rentalDays} days</span>}
                                                </div>
                                            </div>
                                            <div className="text-right ml-4">
                                                <p className="font-bold text-white text-sm">₱{(selectedCar.pricePerDay * rentalDays).toLocaleString()}</p>
                                                {rentalDays > 1 && <p className="text-[9px] text-gray-500">₱{selectedCar.pricePerDay.toLocaleString()}/day</p>}
                                            </div>
                                        </div>
                                    )}
                                    {isDriverHire && selectedDriver && (
                                        <div className="flex justify-between items-start group border-t border-white/5 pt-2">
                                            <div className="flex-1">
                                                <p className="font-bold text-white text-sm group-hover:text-primary transition-colors">{selectedDriver.name} (Driver for Hire)</p>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-[10px] text-gray-500">{selectedDriver.experience}</span>
                                                    {rentalDays > 1 && <span className="text-[9px] text-primary font-bold">{rentalDays} days</span>}
                                                </div>
                                            </div>
                                            <div className="text-right ml-4">
                                                <p className="font-bold text-white text-sm">₱{(selectedDriver.pricePerDay * rentalDays).toLocaleString()}</p>
                                                {rentalDays > 1 && <p className="text-[9px] text-gray-500">₱{selectedDriver.pricePerDay.toLocaleString()}/day</p>}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="mt-3.5 pt-3.5 border-t border-white/10 space-y-2.5">
                                    <div className="flex justify-between items-center text-gray-400">
                                        <p className="font-bold text-[10px] tracking-widest uppercase">Total Estimated Price</p>
                                        <p className="font-black text-base text-white">₱{totalPrice.toLocaleString()}</p>
                                    </div>
                                    {totalPrice > 0 && (
                                        <div className="bg-gradient-to-b from-[#24170E] via-[#1A140F] to-[#12100E] border-2 border-[#FE7803]/40 rounded-xl p-3 sm:p-3.5 space-y-2.5 relative overflow-hidden shadow-xl shadow-black/60 group">
                                            {/* Glowing Ambient Backdrop */}
                                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#FE7803]/15 rounded-full blur-2xl pointer-events-none group-hover:bg-[#FE7803]/20 transition-all duration-700"></div>

                                            {/* Card Header & Badge */}
                                            <div className="flex items-center justify-between gap-2 relative z-10">
                                                <div className="flex items-center gap-1.5">
                                                    <CreditCard size={13} className="text-[#FE7803]" />
                                                    <p className="text-[10px] font-black text-[#FE7803] tracking-wider leading-none uppercase">
                                                        Payment Breakdown
                                                    </p>
                                                </div>
                                                <span className="bg-[#FE7803]/20 border border-[#FE7803]/40 text-[#FE7803] text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                                                    <Sparkles size={9} /> 50% Split
                                                </span>
                                            </div>

                                            {/* Amount Summary Row */}
                                            <div className="grid grid-cols-2 gap-2 items-center relative z-10">
                                                {/* Initial DP (Highlighted) */}
                                                <div className="bg-[#2A1A0F]/80 border border-[#FE7803]/40 rounded-lg p-2.5 shadow-inner">
                                                    <div className="flex items-center gap-1 mb-0.5">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-[#FE7803] animate-ping"></span>
                                                        <p className="text-[8px] font-black text-[#FE7803] tracking-wider uppercase leading-none">
                                                            Initial DP
                                                        </p>
                                                    </div>
                                                    <div className="flex items-baseline gap-1">
                                                        <span className="text-white font-black text-lg tracking-tight leading-none">
                                                            ₱{Math.ceil(totalPrice * 0.5).toLocaleString()}
                                                        </span>
                                                        <span className="text-[9px] font-black text-[#FE7803] bg-[#FE7803]/15 px-1 py-0.2 rounded">
                                                            50%
                                                        </span>
                                                    </div>
                                                    <p className="text-[8px] font-bold text-gray-400 mt-1 flex items-center gap-1 leading-none">
                                                        <ShieldCheck size={10} className="text-emerald-400" /> Pay Upfront
                                                    </p>
                                                </div>

                                                {/* Final Balance */}
                                                <div className="bg-black/30 border border-white/5 rounded-lg p-2.5">
                                                    <p className="text-[8px] font-black text-gray-400 tracking-wider uppercase mb-0.5 leading-none">
                                                        Final Balance
                                                    </p>
                                                    <div className="flex items-baseline gap-1">
                                                        <span className="text-gray-300 font-black text-base tracking-tight leading-none">
                                                            ₱{Math.floor(totalPrice * 0.5).toLocaleString()}
                                                        </span>
                                                        <span className="text-[9px] font-bold text-gray-500">
                                                            50%
                                                        </span>
                                                    </div>
                                                    <p className="text-[8px] font-bold text-gray-400 mt-1 flex items-center gap-1 leading-none">
                                                        <CheckCircle2 size={10} className="text-primary" /> Upon Completion
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Concise English Explanation Box */}
                                            <div className="bg-black/40 border border-white/5 rounded-lg p-2 relative z-10 flex items-center gap-2">
                                                <Info size={13} className="text-[#FE7803] flex-shrink-0" />
                                                <p className="text-[9px] font-medium text-gray-300 leading-snug">
                                                    Pay <strong className="text-white font-bold">50% Initial DP</strong> now to confirm. The remaining <strong className="text-white font-bold">50% balance</strong> is settled <span className="text-[#FE7803] font-bold">after service completion</span>.
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
                                    )}
                                    <div className="flex justify-between items-center pt-0.5">
                                        <p className="font-bold text-gray-500 text-[10px] tracking-widest uppercase">Estimated Duration</p>
                                        <p className="font-bold text-white text-xs">{estimatedDuration} minutes</p>
                                    </div>
                                </div>
                            </div>

                            {/* Appointment Info Card - Modern Branded */}
                            <div className="relative overflow-hidden bg-gradient-to-br from-[#1A1A22] to-[#121217] rounded-2xl p-4 border border-white/10 shadow-lg group hover:border-primary/40 transition-all">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-xl pointer-events-none" />
                                <div className="flex items-center gap-3.5 relative z-10">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-orange-600/10 border border-primary/30 flex items-center justify-center text-primary shadow-inner">
                                        <CalendarRange size={22} className="text-[#FE7803]" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Scheduled Appointment</p>
                                            <span className="text-[#FE7803] font-mono text-xs font-black bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-xl">
                                                {selectedTime}
                                            </span>
                                        </div>
                                        {isSpecialRentalOrDriver ? (
                                            <div className="mt-1.5 space-y-1">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-gray-400 text-[11px]">Pickup:</span>
                                                    <span className="text-white font-black">{selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} at {selectedTime}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-gray-400 text-[11px]">Return:</span>
                                                    <span className="text-white font-black">{selectedEndDate ? selectedEndDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : '—'} at {selectedEndTime}</span>
                                                </div>
                                                <p className="text-primary text-[10px] font-black text-right pt-0.5">{rentalDays} day{rentalDays !== 1 ? 's' : ''} rental</p>
                                            </div>
                                        ) : (
                                            <div className="mt-1">
                                                <p className="text-white font-black text-sm sm:text-base tracking-tight">
                                                    {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Dedicated Realtime & Live Route MAP Preview Card */}
                            {!isSpecialRentalOrDriver && serviceLocation && (
                                <div className="relative overflow-hidden bg-gray-950 rounded-2xl border border-white/10 shadow-xl group hover:border-[#FE7803]/50 transition-all">
                                    <div className="relative h-64 sm:h-72 bg-gray-950 overflow-hidden cursor-pointer" onClick={() => setShowLiveRouteModal(true)}>
                                        <div ref={confirmationMapRef} className="absolute inset-0 z-0"></div>
                                        <div className="absolute inset-0 bg-gradient-to-t from-[#121217]/40 via-transparent to-black/20 z-10 pointer-events-none"></div>

                                        {/* Interactive Bottom Click Prompt Overlay */}
                                        <div className="absolute bottom-3 inset-x-0 flex items-center justify-center z-20 pointer-events-none group-hover:scale-105 transition-transform duration-300">
                                            <div className="flex items-center gap-1.5 bg-gradient-to-r from-[#FE7803] to-orange-600 text-white font-black text-[11px] px-3 py-1.5 rounded-xl shadow-lg shadow-primary/30 border border-white/20">
                                                <Navigation size={13} className="animate-pulse" />
                                                <span>View Live Route</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Special Rental/Driver Route & Profile Details */}
                            {isSpecialRentalOrDriver && (
                                <div className="space-y-3.5">
                                    <div className="bg-[#151515] rounded-xl p-3.5 border border-white/5">
                                        <p className="text-[9px] font-bold text-gray-500 tracking-widest mb-2.5 uppercase">Route Details</p>
                                        <div className="space-y-2">
                                            <div>
                                                <p className="text-[9px] text-gray-500 font-bold uppercase">Start Point</p>
                                                <p className="text-white text-xs font-semibold">{startLocation}</p>
                                            </div>
                                            <div className="pt-2 border-t border-white/5">
                                                <p className="text-[9px] text-gray-500 font-bold uppercase">End Point</p>
                                                <p className="text-white text-xs font-semibold">{endLocation}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Vehicle & Mechanic Details - Modern Branded */}
                            {!isSpecialRentalOrDriver ? (
                                <div className="space-y-3">
                                    {/* Your Vehicle Card */}
                                    <div className="relative overflow-hidden bg-gradient-to-br from-[#1A1A22] to-[#121217] rounded-2xl p-4 border border-white/10 shadow-lg group hover:border-white/20 transition-all">
                                        <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/5">
                                            <p className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Your Selected Vehicle</p>
                                            <span className="text-[9px] font-black text-primary uppercase bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                                                Registered
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3.5">
                                            <div className="w-14 h-14 rounded-2xl bg-[#22222A] border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-md">
                                                {selectedVehicle?.imageUrls && selectedVehicle.imageUrls.length > 0 ? (
                                                    <img
                                                        src={selectedVehicle.imageUrls[0]}
                                                        alt={`${selectedVehicle.make} ${selectedVehicle.model}`}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src = "/assets/car_mockup.png";
                                                        }}
                                                    />
                                                ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 17l4 4 4-4m-4-5v9" /></svg>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm sm:text-base font-black text-white truncate tracking-tight">
                                                    {selectedVehicle ? `${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model}` : 'Selected Vehicle'}
                                                </h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="bg-[#121215] text-gray-300 font-mono text-[10px] font-black px-2 py-0.5 rounded-md border border-white/10 tracking-wider">
                                                        PLATE: {selectedVehicle?.plateNumber || 'N/A'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Your Mechanic Card */}
                                    {selectedMechanic && (
                                        <div className="relative overflow-hidden bg-gradient-to-br from-[#1A1A22] to-[#121217] rounded-2xl p-4 border border-white/10 shadow-lg group hover:border-[#FE7803]/40 transition-all">
                                            <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/5">
                                                <p className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Assigned Mechanic Specialist</p>
                                                <span className="text-[9px] font-black text-emerald-400 uppercase bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                                    Ready on Schedule
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3.5">
                                                <div className="relative w-14 h-14 rounded-2xl bg-[#22222A] border-2 border-primary/30 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-md">
                                                    {selectedMechanic.imageUrl ? (
                                                        <img src={selectedMechanic.imageUrl} alt={selectedMechanic.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                                    ) : (
                                                        <div className="w-full h-full bg-primary/20 flex items-center justify-center text-primary font-black text-lg">{selectedMechanic.name.charAt(0)}</div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="text-sm sm:text-base font-black text-white truncate tracking-tight">
                                                            {selectedMechanic.name}
                                                        </h4>
                                                        <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[8px] font-black uppercase px-1.5 py-0.5 rounded">
                                                            Pro
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <div className="flex items-center gap-1 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-md text-yellow-400 font-black text-[10px]">
                                                            <Star size={11} className="fill-yellow-400 text-yellow-400" />
                                                            <span>{(selectedMechanic.rating || 5.0).toFixed(1)}</span>
                                                        </div>
                                                        <span className="text-[10px] text-gray-400 font-bold">({selectedMechanic.reviews || 0} completed jobs)</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-3.5">
                                    {selectedVehicle && (
                                        <div className="bg-[#151515] rounded-xl p-3.5 border border-white/5">
                                            <p className="text-[9px] font-bold text-gray-500 tracking-widest mb-2.5 uppercase">Your Vehicle</p>
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-gray-700/30 flex items-center justify-center overflow-hidden">
                                                    {selectedVehicle.imageUrls && selectedVehicle.imageUrls.length > 0 ? (
                                                        <img
                                                            src={selectedVehicle.imageUrls[0]}
                                                            alt={`${selectedVehicle.make} ${selectedVehicle.model}`}
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).src = "/assets/car_mockup.png";
                                                            }}
                                                        />
                                                    ) : (
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 17l4 4 4-4m-4-5v9" /></svg>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-white">{selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}</p>
                                                    <p className="text-[10px] text-gray-400 mt-0.5">Plate: {selectedVehicle.plateNumber}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Notes Section */}
                    <div className="space-y-1.5">
                        <label htmlFor="booking-notes" className="text-[11px] font-bold text-gray-500 tracking-wider ml-1 flex items-center gap-1.5 uppercase">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            Notes for Mechanic (Optional)
                        </label>
                        <textarea
                            id="booking-notes"
                            name="bookingNotes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add special instructions, access codes, or specific details..."
                            rows={2}
                            className="w-full p-3 bg-[#1E1E1E] border border-white/10 rounded-xl text-xs text-white placeholder-gray-600 outline-none focus:border-white/20 transition-all resize-none"
                        />
                    </div>

                    {/* Important Notice */}
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 flex gap-2.5 items-start">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <div>
                            <p className="text-yellow-400 font-bold text-[10px] uppercase">Important Information</p>
                            <p className="text-gray-300 text-[11px] mt-0.5 leading-snug">
                                Please ensure you're available at the scheduled time and location. The mechanic will arrive within the estimated time frame.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Bottom Action */}
                <div className="p-4 bg-gradient-to-t from-secondary via-secondary/95 to-transparent shrink-0 z-30 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                    <div className="max-w-md mx-auto w-full">
                        {error && <p className="text-red-400 text-center text-xs mb-3 bg-red-500/10 py-2 mx-4 rounded-lg border border-red-500/20">{error}</p>}
                        <Tooltip content={isQuoteRequest ? 'Submit a quote request' : 'Review payment breakdown & proceed to payment'} className="w-full">
                            <button
                                onClick={() => {
                                    const selectedServices = services.filter(s => selectedServiceIds.has(s.id));
                                    const selectedVehicle = user?.vehicles.find(v => v.plateNumber === selectedVehiclePlate);
                                    if (selectedServices.length === 0 || !user || (!isSpecialRentalOrDriver && !selectedMechanic) || !selectedVehicle || (!isSpecialRentalOrDriver && !serviceLocation)) {
                                        setError('Missing booking information. Please complete all required steps.');
                                        return;
                                    }
                                    setError('');
                                    setShowPaymentBreakdownModal(true);
                                }}
                                disabled={isBooking}
                                className="w-full bg-gradient-to-r from-primary to-orange-600 text-white font-black h-14 flex items-center justify-center hover:shadow-xl hover:shadow-primary/30 transition-all disabled:opacity-50 disabled:grayscale gap-3 rounded-2xl uppercase tracking-wider text-[18px] shadow-lg shadow-primary/20"
                            >
                                {isBooking ? (
                                    <>
                                        <Spinner size="md" color="text-white" />
                                        <span>Processing...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>{isQuoteRequest ? 'Proceed for Payment' : 'Confirm & Book Now'}</span>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 sm:h-8 sm:w-8 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                    </>
                                )}
                            </button>
                        </Tooltip>
                    </div>
                </div>
            </div>
        );
    };

    if (!db || authLoading) {
        return <div className="flex items-center justify-center h-full"><Spinner size="lg" /></div>;
    }

    return (
        <div className="flex flex-col h-full bg-secondary overflow-hidden">
            {/* Main Header — hidden on step 3 for full-screen map */}
            {step !== 3 && (
                <CustomerHeader
                    title={getHeaderTitle()}
                    showBackButton={true}
                    onBack={handleBack}
                    icon={<CalendarRange size={22} />}
                />
            )}

            {/* Step Content */}
            <div className="flex-grow overflow-hidden flex flex-col min-h-0 relative">
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
                {step === 4 && renderStep4()}
                {step === 5 && renderStep5()}
            </div>

            {/* GCash Payment Modal */}
            {showGCashModal && pendingBookingId && (() => {
                const selectedServices = services.filter(s => selectedServiceIds.has(s.id));
                const displayServices = selectedServices.map(s => ({ name: s.name, price: s.price }));
                if (isCarRental && selectedCar) {
                    displayServices.push({ name: `${selectedCar.name} (Rental)`, price: selectedCar.pricePerDay });
                }
                if (isDriverHire && selectedDriver) {
                    displayServices.push({ name: `${selectedDriver.name} (Driver)`, price: selectedDriver.pricePerDay });
                }
                return (
                    <GCashPaymentModal
                        bookingId={pendingBookingId}
                        totalAmount={totalPrice}
                        customerName={user?.name || 'Customer'}
                        services={displayServices}
                        onPaymentVerified={handlePaymentVerified}
                        onClose={() => setShowGCashModal(false)}
                        newBookingData={temporaryBookingData}
                    />
                );
            })()}

            {/* Real-time Live Route Map Modal */}
            <LiveRouteMapModal
                isOpen={showLiveRouteModal}
                onClose={() => setShowLiveRouteModal(false)}
                customerLocation={serviceLocation}
                mechanicLocation={selectedMechanic?.lat && selectedMechanic?.lng ? { lat: selectedMechanic.lat, lng: selectedMechanic.lng } : null}
                mechanic={selectedMechanic}
                customerImageUrl={user?.picture || null}
                customerName={user?.name || 'Customer'}
                title="Service Route"
                appLogoUrl={db?.settings?.mapLogoUrl || db?.settings?.appLogoUrl || '/favicon.png'}
            />

            {/* Complete Payment Breakdown Awareness Modal */}
            {(() => {
                const selectedServices = services.filter(s => selectedServiceIds.has(s.id));
                const selectedVehicle = user?.vehicles.find(v => v.plateNumber === selectedVehiclePlate);
                const computedTotalPrice = totalPrice;
                const downpayment = Math.round(computedTotalPrice * 0.5);
                const remaining = Math.max(0, computedTotalPrice - downpayment);

                return (
                    <BookingPaymentBreakdownModal
                        isOpen={showPaymentBreakdownModal}
                        onClose={() => setShowPaymentBreakdownModal(false)}
                        onProceed={async () => {
                            setShowPaymentBreakdownModal(false);
                            await handleBooking();
                        }}
                        isProcessing={isBooking}
                        services={selectedServices.map(s => ({
                            id: s.id,
                            name: s.name,
                            price: s.price,
                            category: s.category
                        }))}
                        totalAmount={computedTotalPrice}
                        downpaymentAmount={downpayment}
                        remainingBalance={remaining}
                        customerName={user?.name || 'Customer'}
                        scheduledDate={selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                        scheduledTime={selectedTime}
                        vehicleDetails={selectedVehicle ? `${selectedVehicle.year || ''} ${selectedVehicle.make} ${selectedVehicle.model} (${selectedVehicle.plateNumber})`.trim() : undefined}
                        mechanicName={selectedMechanic?.name}
                        isSpecialRentalOrDriver={isSpecialRentalOrDriver}
                        rentalDetails={isSpecialRentalOrDriver ? {
                            type: isCarRental && isDriverHire ? 'both' : isCarRental ? 'car' : 'driver',
                            days: rentalDays,
                            carName: selectedCar?.name,
                            driverName: selectedDriver?.name
                        } : undefined}
                    />
                );
            })()}
        </div>
    );
};

export default BookingScreen;
