import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Spinner from '../components/Spinner';
import { useAuth } from '../context/AuthContext';
import { useDatabase } from '../context/DatabaseContext';
import { Service, Mechanic, Booking, Vehicle, Settings } from '../types';
import { getNotificationSettings, showNotification } from '../utils/notificationManager';
import GCashPaymentModal from '../components/GCashPaymentModal';
import { Clock, Star } from 'lucide-react';
import { getFallbackImageForCategory } from '../utils/fallbackImages';
import Tooltip from '../components/ui/Tooltip';

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
                <img src={service.imageUrl || getFallbackImageForCategory(service.category)} alt={service.name} className={`w-full h-full object-cover transition-transform duration-500 ${isSelected ? 'scale-110 opacity-90' : 'group-hover:scale-110 opacity-70'}`} onError={(e) => { (e.target as HTMLImageElement).src = getFallbackImageForCategory(service.category); }} />
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
                    {service.price > 0 ? `₱${service.price.toLocaleString()}` : 'Request Quote'}
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
                label: 'Currently Busy',
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
            
            <div className="relative p-5 flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div className="flex items-start gap-4 flex-1 min-w-0">
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
                                <span className="text-xs font-black text-white">{mechanic.rating.toFixed(1)}</span>
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

                        {/* Bio snippet */}
                        {mechanic.bio && (
                            <p className="text-[11px] text-gray-500 line-clamp-1 font-medium group-hover:text-gray-400 transition-colors">
                                {mechanic.bio}
                            </p>
                        )}

                        {/* Specializations list */}
                        <div className="pt-1 flex flex-wrap gap-1.5">
                            {mechanic.specializations.slice(0, 3).map(spec => (
                                <span key={spec} className="bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-[9px] font-extrabold px-2.5 py-1 rounded-lg border border-white/5 transition-colors">
                                    {spec}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Side Actions Panel */}
                <div className="flex sm:flex-row md:flex-col items-center md:items-stretch gap-2 flex-shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-white/5 md:justify-center">
                    {/* View Profile Shortcut */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/customer-portal/mechanic-profile/${mechanic.id}`);
                        }}
                        className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-bold py-2.5 px-4 rounded-xl text-[10px] tracking-wider uppercase border border-white/5 transition-all duration-200 active:scale-95"
                    >
                        Info Profile
                    </button>

                    {/* Selection Action */}
                    {!isBusy && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onSelect(mechanic);
                            }}
                            className="flex-[2] md:flex-none flex items-center justify-center gap-1.5 bg-gradient-to-r from-primary to-orange-600 hover:from-orange-600 hover:to-primary text-white font-black py-2.5 px-5 rounded-xl text-[10px] tracking-wider uppercase transition-all duration-300 active:scale-95 shadow-md shadow-primary/10 hover:shadow-primary/20"
                        >
                            Select Mechanic
                        </button>
                    )}
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
    const { db, addBooking } = useDatabase();
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
    const [selectedMechanic, setSelectedMechanic] = useState<Mechanic | null>(initialState?.selectedMechanic || null);

    const [isSpecializationOpen, setIsSpecializationOpen] = useState(false);
    const [isSortOpen, setIsSortOpen] = useState(false);

    const [notes, setNotes] = useState(initialState?.notes || '');
    const [isBooking, setIsBooking] = useState(false);
    const [userHasGoneBack, setUserHasGoneBack] = useState(false);
    const [showGCashModal, setShowGCashModal] = useState(false);
    const [pendingBookingId, setPendingBookingId] = useState<string | null>(null);
    const [gcashReferenceNumber, setGcashReferenceNumber] = useState('');

    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const markerRef = useRef<any>(null);
    const confirmationMapRef = useRef<HTMLDivElement>(null);
    const confirmationMapInstanceRef = useRef<any>(null);

    useEffect(() => {
        if (user && user.vehicles.length > 0 && !selectedVehiclePlate) {
            const primaryVehicle = user.vehicles.find(v => v.isPrimary);
            setSelectedVehiclePlate(primaryVehicle?.plateNumber || user.vehicles[0].plateNumber);
        }
    }, [user, selectedVehiclePlate]);

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
            selectedTime,
            selectedMechanic,
            serviceLocation,
            mechanicSearch,
            specializationFilter,
            sortOption,
            notes,
        };
        sessionStorage.setItem(BOOKING_STATE_KEY, JSON.stringify(stateToSave));
    }, [step, selectedServiceIds, selectedVehiclePlate, selectedDate, selectedTime, selectedMechanic, serviceLocation, mechanicSearch, specializationFilter, sortOption, notes]);

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
                console.warn("High accuracy geolocation error (falling back to standard):", error.message);
                
                // Fallback to lower accuracy if high accuracy times out/fails
                navigator.geolocation.getCurrentPosition(
                    handleSuccess,
                    (fallbackError) => {
                        console.warn("Standard accuracy geolocation also failed:", fallbackError.message);
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

            // Subscribe to real-time location updates (high accuracy, fast responsiveness)
            const watchId = navigator.geolocation.watchPosition(
                handleSuccess, 
                () => {}, 
                {
                    enableHighAccuracy: true, 
                    timeout: 15000, 
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
        }).setView([lat, lng], 17);

        // Primary: CartoDB dark tiles — Fallback: OSM
        const cartoTile = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20,
            crossOrigin: true,
        });

        const osmTile = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19,
            crossOrigin: true,
        });

        // Try CARTO first, fall back to OSM if tiles fail to load
        cartoTile.addTo(mapInstanceRef.current);
        let tilesLoaded = false;
        cartoTile.on('tileload', () => { tilesLoaded = true; });
        setTimeout(() => {
            if (!tilesLoaded && mapInstanceRef.current) {
                mapInstanceRef.current.removeLayer(cartoTile);
                osmTile.addTo(mapInstanceRef.current);
            }
        }, 5000);

        // Branded draggable location pin
        const locationIcon = L.divIcon({
            html: `<div class="rb-location-pin-wrapper">
                <div class="rb-location-circle">
                    <img src="/favicon.png" alt="Location" onerror="this.style.display='none'" style="width:28px;height:28px;object-fit:contain;" />
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
        });
        markerRef.current.on('dragend', (e: any) => {
            const { lat: newLat, lng: newLng } = e.target.getLatLng();
            setServiceLocation({ lat: newLat, lng: newLng });
            setIsTrackingLive(false);
        });

        // Map click also repositions pin
        mapInstanceRef.current.on('click', (e: any) => {
            const { lat: newLat, lng: newLng } = e.latlng;
            setServiceLocation({ lat: newLat, lng: newLng });
            setIsTrackingLive(false);
            if (markerRef.current) {
                markerRef.current.setLatLng([newLat, newLng]);
            }
        });

        // Force size calculation after tiles paint
        const inv = () => { if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize(true); };
        inv();
        setTimeout(inv, 100);
        setTimeout(inv, 400);
        setTimeout(inv, 1000);

        return () => {
            if (step !== 3 && mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
                markerRef.current = null;
                accuracyCircleRef.current = null;
            }
        };
    }, [step, serviceLocation === null]); // eslint-disable-line

    // Live updater: smoothly follow GPS when tracking is active
    useEffect(() => {
        if (step === 3 && mapInstanceRef.current && serviceLocation) {
            if (markerRef.current) {
                markerRef.current.setLatLng([serviceLocation.lat, serviceLocation.lng]);
            }
            if (isTrackingLive) {
                mapInstanceRef.current.setView(
                    [serviceLocation.lat, serviceLocation.lng],
                    mapInstanceRef.current.getZoom() || 17,
                    { animate: true, duration: 0.5 }
                );
            }
        }
    }, [serviceLocation, isTrackingLive, step]);



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

            // Add tile layer (CartoDB Dark Matter)
            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>',
                subdomains: 'abcd',
                maxZoom: 20
            }).addTo(confirmationMapInstanceRef.current);

            // Add marker
            const locationIcon = L.divIcon({
                html: `<div class="rb-location-pin-wrapper">
                    <div class="rb-location-circle">
                        <img src="/favicon.png" alt="Location" style="width:28px;height:28px;object-fit:contain;" />
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
            if (step !== 5 && confirmationMapInstanceRef.current) {
                confirmationMapInstanceRef.current.remove();
                confirmationMapInstanceRef.current = null;
            }
        };
    }, [step, serviceLocation]);


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

    const getHeaderTitle = () => {
        switch (step) {
            case 1: return 'Select Service & Vehicle';
            case 2: return 'Select a Date';
            case 3: return 'Confirm Service Location';
            case 4: return 'Select Mechanic';
            case 5: return 'Confirm Booking';
            default: return 'Book a Service';
        }
    };

    if (!db || authLoading) {
        return <div className="flex items-center justify-center h-full"><Spinner size="lg" /></div>;
    }

    const { services, bookings, mechanics } = db;

    const totalPrice = useMemo(() => {
        return services
            .filter(s => selectedServiceIds.has(s.id))
            .reduce((sum, s) => sum + s.price, 0);
    }, [selectedServiceIds, services]);

    const isQuoteRequest = useMemo(() => {
        if (selectedServiceIds.size === 0) return false;
        const selectedServicesList = services.filter(s => selectedServiceIds.has(s.id));
        return selectedServicesList.some(s => s.price === 0);
    }, [selectedServiceIds, services]);


    const allSpecializations = useMemo(() => {
        if (!mechanics) return [];
        const specSet = new Set<string>();
        mechanics.forEach(m => {
            if (m.status === 'Active') {
                m.specializations.forEach(s => specSet.add(s))
            }
        });
        return ['all', ...Array.from(specSet).sort()];
    }, [mechanics]);

    // Helper function to calculate distance between two coordinates (Haversine formula)
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371; // Radius of the Earth in kilometers
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distance in kilometers
    };

    const filteredAndSortedMechanics = useMemo(() => {
        const selectedDayOfWeek = selectedDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as keyof Required<Mechanic>['availability'];
        const selectedDateWithoutTime = new Date(selectedDate);
        selectedDateWithoutTime.setHours(0, 0, 0, 0);

        const selectedServices = services.filter(s => selectedServiceIds.has(s.id));

        // Filter mechanics
        let availableMechanics = mechanics.filter(mechanic => {
            // Must be Active status and Online (Realtime & Live)
            if (mechanic.status !== 'Active') return false;
            if (!mechanic.isOnline) return false;

            // Check if mechanic has an active booking (is currently busy)
            const hasBusyBooking = bookings.some(b =>
                b.mechanic?.id === mechanic.id &&
                (b.status === 'En Route' || b.status === 'In Progress' || b.status === 'Mechanic Assigned')
            );
            if (hasBusyBooking) return false;

            // Check unavailable dates
            if (mechanic.unavailableDates?.some(d => {
                const start = new Date(d.startDate.replace(/-/g, '/'));
                const end = new Date(d.endDate.replace(/-/g, '/'));
                start.setHours(0, 0, 0, 0);
                end.setHours(0, 0, 0, 0);
                return selectedDateWithoutTime >= start && selectedDateWithoutTime <= end;
            })) {
                return false;
            }

            // Check day of week availability: if booking is for today and mechanic is online, they are available.
            const isToday = selectedDateWithoutTime.getTime() === new Date().setHours(0, 0, 0, 0);
            if (!(isToday && mechanic.isOnline) && !mechanic.availability?.[selectedDayOfWeek]?.isAvailable) return false;

            // Check specialization match
            if (selectedServices.length > 0) {
                const hasSpecializationMatch = selectedServices.some(selectedService => {
                    const serviceNameLower = selectedService.name.toLowerCase();
                    const serviceCategoryLower = selectedService.category.toLowerCase();

                    return mechanic.specializations.some(specRaw => {
                        const spec = specRaw.toLowerCase();
                        
                        // 1. Match category
                        if (spec.includes(serviceCategoryLower) || serviceCategoryLower.includes(spec)) return true;
                        
                        // 2. Match service name
                        if (spec.includes(serviceNameLower) || serviceNameLower.includes(spec)) return true;

                        // 3. Word-by-word matching
                        const serviceWords = serviceNameLower.split(' ');
                        return serviceWords.some(word => word.length > 2 && (spec.includes(word) || word.includes(spec)));
                    });
                });
                if (!hasSpecializationMatch) return false;
            }

            // Optional filters
            if (specializationFilter !== 'all' && !mechanic.specializations.includes(specializationFilter)) return false;
            if (mechanicSearch && !mechanic.name.toLowerCase().includes(mechanicSearch.toLowerCase())) return false;

            return true;
        });

        // Calculate distances and sort by proximity if service location is available
        if (serviceLocation) {
            const mechanicsWithDistance = availableMechanics.map(mechanic => ({
                mechanic,
                distance: mechanic.lat && mechanic.lng
                    ? calculateDistance(serviceLocation.lat, serviceLocation.lng, mechanic.lat, mechanic.lng)
                    : 999999 // Put mechanics without location at the end
            }));

            // Sort by distance (nearest first)
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

        // Fallback: sort based on option if no location available
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
    }, [mechanics, services, selectedServiceIds, selectedDate, specializationFilter, mechanicSearch, sortOption, bookings, serviceLocation]);


    const handleStep1Continue = () => {
        if (selectedServiceIds.size === 0) setError('Please select at least one service.');
        else if (!selectedVehiclePlate) setError('Please select a vehicle.');
        else { setError(''); setStep(2); }
    };

    const handleStep2Continue = () => {
        if (!selectedDate) setError('Please select a date.');
        else { setError(''); setStep(3); }
    };

    const handleStep3Continue = () => {
        if (!serviceLocation) setError('Please confirm your location.');
        else { setError(''); setStep(4); }
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
        if (selectedServices.length === 0 || !user || !selectedMechanic || !selectedVehicle || !serviceLocation) {
            setError('Missing booking information. Please start over.');
            return;
        }
        setError('');
        setIsBooking(true);
        try {
            const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
            const downPayment = Math.ceil(totalPrice * 0.5);
            const newBookingData = {
                customerId: user.id,
                customerName: user.name,
                services: selectedServices,
                date: selectedDate.toISOString().split('T')[0],
                time: selectedTime,
                status: 'Upcoming' as const,
                vehicle: selectedVehicle,
                mechanic: selectedMechanic,
                mechanicId: selectedMechanic.id,
                mechanicName: selectedMechanic.name,
                location: serviceLocation,
                notes,
                paymentStatus: 'pending' as const,
                paidAmount: 0,
                totalAmount: totalPrice,
                paymentMethod: 'GCash' as const,
                gcashPaymentStatus: 'awaiting_payment' as const,
                isVerified: false,
            };
            const created = await addBooking(newBookingData);
            if (!created) throw new Error('Could not create booking.');
            sessionStorage.removeItem(BOOKING_STATE_KEY);
            setPendingBookingId(created.id);
            setShowGCashModal(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred.');
        } finally {
            setIsBooking(false);
        }
    };

    // Called by the modal when the Firestore listener detects isVerified=true
    const handlePaymentVerified = () => {
        setShowGCashModal(false);
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
    };

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
            <div className="p-6 space-y-6 flex-grow overflow-y-auto">
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
                            placeholder="Search services (e.g. Oil Change, Tires...)"
                            value={serviceSearch}
                            onChange={(e) => setServiceSearch(e.target.value)}
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
            <div className="p-0 bg-transparent shrink-0 z-30">
                {error && <p className="text-red-400 text-center text-xs mb-3 bg-red-500/10 py-2 mx-4 rounded-lg border border-red-500/20">{error}</p>}
                {totalPrice > 0 && (
                    <div className="flex justify-between items-center mb-3 mx-4 p-3 bg-white/5 rounded-xl border border-white/5">
                        <span className="text-gray-400 text-xs font-bold">Total for {selectedServiceIds.size} service(s)</span>
                        <span className="font-black text-lg text-primary">₱{totalPrice.toLocaleString()}</span>
                    </div>
                )}
                <Tooltip content="Proceed to date selection" className="w-full">
                    <button onClick={handleStep1Continue} disabled={selectedServiceIds.size === 0 || !selectedVehiclePlate} className="w-full bg-primary text-white font-black py-3.5 hover:bg-orange-600 transition disabled:opacity-50 rounded-none uppercase tracking-wider text-base">
                        Continue
                    </button>
                </Tooltip>
            </div>
        </>
    );

    const renderStep2 = () => {
        const todayStr = new Date().toISOString().split('T')[0];

        const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            if (e.target.value) {
                setSelectedDate(new Date(e.target.value));
            }
        };

        const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            setSelectedTime(e.target.value);
        };

        return (
            <>
                <div className="p-6 space-y-8 flex-grow overflow-y-auto">
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-white">Select Date & Time</h3>
                        <p className="text-sm text-gray-400">Choose your preferred schedule for the service.</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                            {/* Date Picker */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500  tracking-widest">Date</label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        min={todayStr}
                                        value={selectedDate.toISOString().split('T')[0]}
                                        onChange={handleDateChange}
                                        className="w-full bg-[#1E1E1E] border border-white/10 rounded-xl px-4 py-4 text-white font-bold outline-none transition-all focus:border-white/20 custom-date-input"
                                        style={{ colorScheme: 'dark' }}
                                    />
                                </div>
                            </div>

                            {/* Time Picker */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500  tracking-widest">Time</label>
                                <div className="relative">
                                    <input
                                        type="time"
                                        value={selectedTime}
                                        onChange={handleTimeChange}
                                        className="w-full bg-[#1E1E1E] border border-white/10 rounded-xl px-4 py-4 text-white font-bold outline-none transition-all focus:border-white/20 custom-time-input"
                                        style={{ colorScheme: 'dark' }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex gap-3 items-start mt-6">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-xs text-gray-300 leading-relaxed">
                                Please note that the actual arrival time may vary slightly depending on traffic conditions and the mechanic's previous job status. We will keep you updated.
                            </p>
                        </div>
                    </div>
                </div>
                <div className="p-0 bg-transparent shrink-0 z-30">
                    {error && <p className="text-red-400 text-center text-xs mb-3 bg-red-500/10 py-2 mx-4 rounded-lg border border-red-500/20">{error}</p>}
                    <Tooltip content="Proceed to location confirmation" className="w-full">
                        <button onClick={handleStep2Continue} disabled={!selectedDate || !selectedTime} className="w-full bg-primary text-white font-black py-3.5 hover:bg-orange-600 transition disabled:opacity-50 rounded-none uppercase tracking-wider text-base">
                            Continue
                        </button>
                    </Tooltip>
                </div>
            </>
        )
    };

    const renderStep3 = () => {
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
                            className="p-2.5 bg-[#1E1E1E]/90 hover:bg-[#252525] rounded-full transition-all text-white border border-white/10 pointer-events-auto shadow-lg"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                                <div className="absolute top-24 left-4 z-[400] bg-[#1a1a1ae0] backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10 flex items-center gap-3 shadow-2xl transition-all duration-300 animate-slideDown">
                                    <span className={`w-3 h-3 rounded-full ${isTrackingLive ? 'bg-green-500 animate-pulse shadow-md shadow-green-500/50' : 'bg-amber-500 animate-ping'}`} />
                                    <div className="flex flex-col">
                                        <span className="text-xs text-white font-extrabold tracking-wider leading-none">
                                            {isTrackingLive ? 'LIVE GPS ACTIVE' : 'MANUAL PIN PLACEMENT'}
                                        </span>
                                        <span className="text-[10px] text-gray-400 font-bold mt-1.5 leading-none">
                                            {isTrackingLive ? `Accurate to ±${Math.round(locationAccuracy)}m` : 'Live tracking paused'}
                                        </span>
                                    </div>
                                    {!isTrackingLive && (
                                        <Tooltip content="Resume live tracking">
                                            <button
                                                onClick={() => setIsTrackingLive(true)}
                                                className="border border-primary hover:bg-primary hover:text-white text-primary text-[10px] font-bold px-3 py-1.5 rounded-lg ml-3 transition-all uppercase"
                                            >
                                                Resume
                                            </button>
                                        </Tooltip>
                                    )}
                                </div>
                            )}

                            {/* Recenter & Zoom Controls */}
                            <div className="absolute bottom-6 right-4 z-[400] flex flex-col gap-3">
                                <Tooltip content="Zoom In">
                                    <button
                                        onClick={() => {
                                            if (mapInstanceRef.current) {
                                                mapInstanceRef.current.zoomIn();
                                            }
                                        }}
                                        className="w-12 h-12 flex items-center justify-center backdrop-blur-md border border-white/20 bg-[#1E1E1E]/80 text-white rounded-full shadow-2xl transition-all duration-300 hover:bg-primary hover:border-primary hover:text-white"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                                        </svg>
                                    </button>
                                </Tooltip>

                                <Tooltip content="Zoom Out">
                                    <button
                                        onClick={() => {
                                            if (mapInstanceRef.current) {
                                                mapInstanceRef.current.zoomOut();
                                            }
                                        }}
                                        className="w-12 h-12 flex items-center justify-center backdrop-blur-md border border-white/20 bg-[#1E1E1E]/80 text-white rounded-full shadow-2xl transition-all duration-300 hover:bg-primary hover:border-primary hover:text-white"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" />
                                        </svg>
                                    </button>
                                </Tooltip>

                                <Tooltip content="Recenter on your location">
                                    <button
                                        onClick={() => {
                                            setIsTrackingLive(true);
                                            if (navigator.geolocation) {
                                                const onRefreshSuccess = (position: GeolocationPosition) => {
                                                    const { latitude, longitude, accuracy } = position.coords;
                                                    setServiceLocation({ lat: latitude, lng: longitude });
                                                    setLocationAccuracy(accuracy);
                                                    if (mapInstanceRef.current) {
                                                        mapInstanceRef.current.setView([latitude, longitude], 18);
                                                    }
                                                };
                                                navigator.geolocation.getCurrentPosition(
                                                    onRefreshSuccess,
                                                    () => {},
                                                    { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
                                                );
                                            }
                                        }}
                                        className={`w-12 h-12 flex items-center justify-center backdrop-blur-md border rounded-full shadow-2xl transition-all duration-300 ${
                                            isTrackingLive
                                                ? 'bg-primary border-primary text-white scale-110 shadow-primary/30'
                                                : 'bg-[#1E1E1E]/80 border-white/20 text-white hover:bg-primary hover:border-primary'
                                        }`}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </button>
                                </Tooltip>
                            </div>

                            {/* Tap-to-move hint */}
                            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-[400] pointer-events-none">
                                <div className="bg-black/60 backdrop-blur-md px-3.5 py-2 rounded-full border border-white/10 flex items-center gap-1.5">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-primary animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                                    </svg>
                                    <span className="text-[9px] font-black text-white tracking-widest">DRAG PIN OR TAP MAP TO MOVE</span>
                                </div>
                            </div>
                        </>
                    )}
                </div>
                <div className="p-0 bg-[#1D1D1D] border-t border-dark-gray z-30 relative w-full shrink-0">
                    <Tooltip content="Confirm your service location" className="w-full">
                        <button onClick={handleStep3Continue} disabled={locationStatus !== 'success'} className="w-full bg-primary text-white font-black py-3.5 hover:bg-orange-600 transition disabled:opacity-50 flex items-center justify-center gap-2 text-base uppercase tracking-wider">
                            {locationStatus === 'success' ? (
                                <>Confirm Location <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg></>
                            ) : 'Determining Location...'}
                        </button>
                    </Tooltip>
                </div>
            </div>
        );
    };


    const renderStep4 = () => {
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
                            type="text"
                            placeholder="Search by name..."
                            value={mechanicSearch}
                            onChange={(e) => setMechanicSearch(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-[#151515] border border-white/10 rounded-xl text-white placeholder-gray-600 outline-none transition-all focus:border-white/20"
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

        // Calculate estimated duration and price
        const estimatedDuration = selectedServices.reduce((total, service) => total + (service.duration || 60), 0);
        const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
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

        if (selectedServices.length === 0 || !selectedVehicle || !selectedMechanic) {
            return (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-4">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    </div>
                    <p className="text-white font-bold text-lg">Incomplete Booking Details</p>
                    <p className="text-gray-400 text-sm">
                        {!selectedVehicle ? "Please select a vehicle. " : ""}
                        {selectedServices.length === 0 ? "Please select at least one service. " : ""}
                        {!selectedMechanic ? "Please select a mechanic. " : ""}
                    </p>
                    <Tooltip content="Start over from the beginning">
                        <button onClick={() => setStep(1)} className="px-6 py-2 bg-white/10 text-white rounded-lg font-bold hover:bg-white/20 transition">Restart Booking</button>
                    </Tooltip>
                </div>
            );
        }

        return (
            <div className="flex flex-col h-full bg-secondary overflow-hidden">
                <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar pb-24">
                    {/* Header Info */}
                    <div className="space-y-1">
                        <h3 className="text-2xl font-bold text-white tracking-tight">Booking Summary</h3>
                        <p className="text-sm text-gray-400 mt-1">Please review your appointment details before confirming.</p>
                    </div>

                    {/* Main Summary Card */}
                    <div className="bg-[#1E1E1E] rounded-2xl border border-white/5 overflow-hidden shadow-2xl relative">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-orange-400 to-primary"></div>
                        <div className="p-6 space-y-6">
                            <div>
                                <h4 className="text-[10px] font-black text-gray-500 tracking-widest mb-4 uppercase">Selected Services</h4>
                                <div className="space-y-3">
                                    {selectedServices.map(service => (
                                        <div key={service.id} className="flex justify-between items-start group">
                                            <div className="flex-1">
                                                <p className="font-bold text-white text-base group-hover:text-primary transition-colors">{service.name}</p>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-xs text-gray-500">{service.category}</span>
                                                    {service.duration && (
                                                        <span className="text-[10px] text-gray-600 flex items-center gap-1">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                            {service.duration} mins
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {service.price > 0 ? (
                                                <p className="font-bold text-white ml-4">₱{service.price.toLocaleString()}</p>
                                            ) : (
                                                <span className="px-2 py-1 bg-yellow-500/10 text-yellow-400 text-[10px] font-bold rounded ml-4 uppercase">Quote</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-6 pt-6 border-t border-white/10 space-y-4">
                                    <div className="flex justify-between items-center text-gray-400">
                                        <p className="font-bold text-xs tracking-widest uppercase">Total Estimated Price</p>
                                        <p className="font-black text-xl text-white">₱{totalPrice.toLocaleString()}</p>
                                    </div>
                                    <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 space-y-4 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -translate-y-16 translate-x-16 blur-3xl group-hover:bg-primary/20 transition-all duration-700"></div>
                                        <div className="flex justify-between items-center relative z-10">
                                            <div>
                                                <p className="text-[10px] font-black text-primary tracking-widest leading-none mb-1 uppercase">Initial Downpayment</p>
                                                <p className="text-white font-black text-2xl tracking-tight leading-none inline-flex items-baseline gap-1">
                                                    ₱{Math.ceil(totalPrice * 0.5).toLocaleString()}
                                                    <span className="text-[10px] text-gray-400 normal-case font-medium tracking-normal">(50%)</span>
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-black text-gray-500 tracking-widest mb-1 leading-none uppercase">Final Balance</p>
                                                <p className="text-gray-400 font-black text-lg leading-none">₱{Math.floor(totalPrice * 0.5).toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[10px] font-black tracking-widest relative z-10">
                                            <span className="text-gray-500 uppercase">Secured via GCash</span>
                                            <span className="text-primary tracking-tighter uppercase">Payable on Completion</span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center pt-2">
                                        <p className="font-bold text-gray-500 text-xs tracking-widest uppercase">Estimated Duration</p>
                                        <p className="font-bold text-white text-sm">{estimatedDuration} minutes</p>
                                    </div>
                                </div>
                            </div>

                            {/* Appointment Info */}
                            <div className="bg-[#151515] rounded-xl p-4 border border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[10px] font-bold text-gray-500 tracking-widest uppercase">Appointment</p>
                                        <p className="text-white font-bold text-base">{selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                                        <p className="text-gray-400 text-sm">{selectedTime}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Map & Location */}
                            {serviceLocation && (
                                <div className="bg-[#151515] rounded-xl overflow-hidden border border-white/5">
                                    <div className="relative h-48 bg-gray-900">
                                        <div ref={confirmationMapRef} className="absolute inset-0"></div>
                                        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-3 z-10">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center text-green-400">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                </div>
                                                <span className="text-white font-bold text-sm">Service Location</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-4 space-y-3">
                                        <div>
                                            <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">Coordinates</p>
                                            <p className="text-white font-mono text-sm font-bold">{serviceLocation.lat.toFixed(6)}, {serviceLocation.lng.toFixed(6)}</p>
                                        </div>
                                        <Tooltip content="View location in Google Maps">
                                            <a href={googleMapsLink} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white border border-blue-500/30 hover:border-blue-500 font-bold py-3 px-4 rounded-xl transition-all group">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                <span className="text-sm">Open in Google Maps</span>
                                            </a>
                                        </Tooltip>
                                    </div>
                                </div>
                            )}

                            {/* Vehicle & Mechanic Details */}
                            <div className="space-y-4">
                                <div className="bg-[#151515] rounded-xl p-4 border border-white/5">
                                    <p className="text-[10px] font-bold text-gray-500 tracking-widest mb-3 uppercase">Your Vehicle</p>
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-gray-700/30 flex items-center justify-center overflow-hidden">
                                            {selectedVehicle.imageUrls && selectedVehicle.imageUrls.length > 0 ? (
                                                <img src={selectedVehicle.imageUrls[0]} alt={`${selectedVehicle.make} ${selectedVehicle.model}`} className="w-full h-full object-cover" />
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 17l4 4 4-4m-4-5v9" /></svg>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-base font-bold text-white">{selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}</p>
                                            <p className="text-xs text-gray-400 mt-0.5">Plate: {selectedVehicle.plateNumber}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-[#151515] rounded-xl p-4 border border-white/5">
                                    <p className="text-[10px] font-bold text-gray-500 tracking-widest mb-3 uppercase">Your Mechanic</p>
                                    <div className="flex items-center gap-3">
                                        {selectedMechanic.imageUrl ? (
                                            <img src={selectedMechanic.imageUrl} alt={selectedMechanic.name} className="w-12 h-12 rounded-xl object-cover border-2 border-primary/20" />
                                        ) : (
                                            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-bold text-lg">{selectedMechanic.name.charAt(0)}</div>
                                        )}
                                        <div className="flex-1">
                                            <p className="text-base font-bold text-white">{selectedMechanic.name}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <div className="flex items-center gap-1 text-yellow-400"><svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784-.57-1.838.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg><span className="text-xs font-bold">{selectedMechanic.rating.toFixed(1)}</span></div>
                                                <span className="text-xs text-gray-500">• {selectedMechanic.reviews} jobs</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Notes Section */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 tracking-widest ml-1 flex items-center gap-2 uppercase">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            Notes for Mechanic (Optional)
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add special instructions, access codes, or specific details about the issue..."
                            rows={3}
                            className="w-full p-4 bg-[#1E1E1E] border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 outline-none focus:border-white/20 transition-all resize-none"
                        />
                    </div>

                    {/* Important Notice */}
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <div>
                            <p className="text-yellow-400 font-bold text-xs uppercase">Important Information</p>
                            <p className="text-gray-300 text-xs mt-1 leading-relaxed">
                                Please ensure you're available at the scheduled time and location. The mechanic will arrive within the estimated time frame.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Bottom Action */}
                <div className="p-0 bg-transparent shrink-0 z-30">
                    {error && <p className="text-red-400 text-center text-xs mb-3 bg-red-500/10 py-2 mx-4 rounded-lg border border-red-500/20">{error}</p>}
                    <Tooltip content={isQuoteRequest ? 'Submit a quote request' : 'Create booking and proceed to payment'} className="w-full">
                        <button
                            onClick={handleBooking}
                            disabled={isBooking}
                            className="w-full bg-gradient-to-r from-primary to-orange-600 text-white font-black py-3.5 hover:shadow-xl hover:shadow-primary/30 transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3 rounded-none uppercase tracking-wider text-base"
                        >
                            {isBooking ? (
                                <>
                                    <Spinner size="sm" color="text-white" />
                                    <span>Processing...</span>
                                </>
                            ) : (
                                <>
                                    <span>{isQuoteRequest ? 'Request Quote' : 'Confirm & Book Now'}</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                </>
                            )}
                        </button>
                    </Tooltip>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-screen h-[100dvh] bg-secondary overflow-hidden">
            {/* Main Header — hidden on step 3 for full-screen map */}
            {step !== 3 && (
                <div className="flex items-center gap-4 p-4 border-b border-dark-gray bg-secondary shrink-0 z-50">
                    <Tooltip content="Go back">
                        <button
                            onClick={handleBack}
                            className="p-2 hover:bg-dark-gray rounded-full transition-colors text-gray-400"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                    </Tooltip>
                    <h1 className="text-xl font-bold text-white">{getHeaderTitle()}</h1>
                </div>
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
                const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
                return (
                    <GCashPaymentModal
                        bookingId={pendingBookingId}
                        totalAmount={totalPrice}
                        customerName={user?.name || 'Customer'}
                        services={selectedServices.map(s => ({ name: s.name, price: s.price }))}
                        onPaymentVerified={handlePaymentVerified}
                        onClose={() => setShowGCashModal(false)}
                    />
                );
            })()}

            {/* Real-time Payment Verification Overlay */}
            {verifyingPayment && (
                <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
                    <div className="relative w-24 h-24 mb-8">
                        <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <img src="/gcash-logo.png" alt="GCash" className="w-12 h-12 object-contain animate-pulse" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2 italic">Verifying GCash Payment...</h2>
                    <p className="text-gray-400 max-w-xs mx-auto mb-8">
                        We're waiting for GCash to confirm your transaction. This usually takes a few seconds.
                    </p>
                    <div className="w-full max-w-xs bg-white/5 h-1.5 rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: '100%', animation: 'loading 5s ease-in-out infinite' }}></div>
                    </div>
                    <div className="mt-8 flex items-center gap-2 text-primary font-bold text-sm animate-pulse">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        REAL-TIME SYNC ACTIVE
                    </div>
                </div>
            )}
        </div>
    );
};

export default BookingScreen;
