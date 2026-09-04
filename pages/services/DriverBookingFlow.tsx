import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useDatabase } from '../../context/DatabaseContext';
import CustomerHeader from '../../components/CustomerHeader';
import { ChevronLeft, ChevronRight, Calendar, MapPin, Clock, Car, Phone, Info, Check, CheckCircle2, User, FileText, AlertCircle, Award, Navigation, Loader2, Radio } from 'lucide-react';
import Spinner from '../../components/Spinner';
import { safeGetCurrentPosition } from '../../utils/locationHelper';

declare const L: any;

interface FormState {
    pickupLocation: string;
    destination: string;
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

const DriverBookingFlow: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const [searchParams] = useSearchParams();
    const queryDriverId = searchParams.get('driverId') || '';
    const queryDriverName = searchParams.get('driverName') || '';

    const { user } = useAuth();
    const { db, addServiceRequest } = useDatabase();
    const navigate = useNavigate();

    const accentColor = db?.settings?.accentColor || '#FE7803';

    // State Variables
    const [currentStep, setCurrentStep] = useState(1);
    const [submitting, setSubmitting] = useState(false);
    const [showCalendar, setShowCalendar] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());

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

    const totalSteps = 2;

    // Helper: Form validation per step
    const isStepValid = () => {
        if (currentStep === 1) {
            const hasBasic = form.pickupLocation.trim() !== '' &&
                             form.destination.trim() !== '' &&
                             form.date !== '' &&
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

    const calculateEstimatedFee = () => {
        if (form.duration.includes('Hourly') || form.duration.includes('2 Hours')) {
            return 1600; // 2 hrs minimum * 800
        } else if (form.duration.includes('4 Hours')) {
            return 3200;
        } else if (form.duration.includes('8 Hours') || form.duration.includes('Full Day')) {
            return 4500;
        } else {
            return 5500; // Airport transfer or out-of-town
        }
    };

    const handleSubmit = async () => {
        if (!user) return;
        setSubmitting(true);
        try {
            const requestPayload = {
                customerId: user.id,
                customerName: user.name,
                customerPhone: form.contactNumber,
                customerEmail: user.email || '',
                serviceId: '7',
                serviceName: 'Driver for Hire',
                status: 'Pending Admin Review',
                scheduledDate: form.date,
                notes: form.specialInstructions,
                totalAmount: calculateEstimatedFee(),
                driverName: form.selectedDriverName || undefined,
                vehicleDetails: form.driveCustomerCar ? {
                    brand: form.vehicleBrand,
                    model: form.vehicleModel,
                    plateNumber: form.plateNumber,
                    type: form.vehicleType
                } : null,
                details: {
                    pickupLocation: form.pickupLocation,
                    destination: form.destination,
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

            await addServiceRequest(requestPayload);
            navigate('/');
        } catch (error) {
            console.error('Failed to submit Driver for Hire request:', error);
        } finally {
            setSubmitting(false);
        }
    };

    // Live Geocoding and Location Helper with robust fallback and loading state
    const handleUseLiveLocation = () => {
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
                    setForm(f => ({ ...f, pickupLocation: data.display_name }));
                } else {
                    setForm(f => ({ ...f, pickupLocation: `Live Location (${latitude.toFixed(5)}, ${longitude.toFixed(5)})` }));
                }
            } catch (e) {
                setForm(f => ({ ...f, pickupLocation: `Live Location (${latitude.toFixed(5)}, ${longitude.toFixed(5)})` }));
            } finally {
                setIsLocating(false);
            }
        };

        const onGeoError = (error: GeolocationPositionError) => {
            if (error.code === 1) {
                setIsLocating(false);
                alert('Location access denied. Please enable location permissions in your browser or device settings.');
                return;
            }
            safeGetCurrentPosition(
                onGeoSuccess,
                (fallbackErr) => {
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

        safeGetCurrentPosition(
            onGeoSuccess,
            onGeoError,
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
        );
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
            <main className="flex-grow p-6 pb-24 overflow-y-auto max-w-lg mx-auto w-full">
                {/* Step 1: Trip & Vehicle Details */}
                {currentStep === 1 && (
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

                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tight mb-1">Trip Details</h2>
                            <p className="text-xs text-gray-400">Please provide precise schedule and location information.</p>
                        </div>

                        <div className="space-y-4">
                            {/* Click outside backdrop for suggestions */}
                            {(showStartSuggestions || showEndSuggestions) && (
                                <div
                                    className="fixed inset-0 z-[9990] bg-transparent"
                                    onClick={() => { setShowStartSuggestions(false); setShowEndSuggestions(false); }}
                                />
                            )}

                            {/* Pick up & Destination Locations Card */}
                            <div className="bg-[#141417] p-4 rounded-2xl border border-white/[0.08] space-y-3.5 relative shadow-xl">
                                <div className="space-y-1.5 relative z-[9995]">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                                            <span className={`w-2 h-2 rounded-full ${isLocating ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`}></span>
                                            Pick-Up Location *
                                        </label>
                                        <button
                                            type="button"
                                            onClick={handleUseLiveLocation}
                                            disabled={isLocating}
                                            className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                                                isLocating 
                                                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 cursor-wait' 
                                                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/50 active:scale-95'
                                            }`}
                                            title="Use your real-time live location"
                                        >
                                            {isLocating ? (
                                                <>
                                                    <Loader2 size={11} className="animate-spin text-amber-400" />
                                                    <span>Locating...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Navigation size={11} />
                                                    <span>Live GPS</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <MapPin className={`absolute left-3.5 top-3.5 transition-colors ${isLocating ? 'text-amber-400 animate-bounce' : 'text-emerald-400'}`} size={16} />
                                        <input 
                                            type="text"
                                            value={isLocating && !form.pickupLocation ? "Locating your real-time coordinates..." : form.pickupLocation}
                                            onChange={e => setForm(f => ({ ...f, pickupLocation: e.target.value }))}
                                            onFocus={() => { setShowStartSuggestions(true); setShowEndSuggestions(false); }}
                                            placeholder="Enter pick-up address or use GPS..."
                                            autoComplete="off"
                                            disabled={isLocating}
                                            className={`w-full bg-[#0C0C0E] border rounded-xl py-3 pl-11 pr-4 text-xs font-medium text-white placeholder-gray-500 transition-all ${
                                                isLocating 
                                                    ? 'border-amber-500/60 bg-amber-500/[0.03] text-amber-200' 
                                                    : 'border-white/10 focus:border-emerald-500/50'
                                            }`}
                                        />

                                        {/* Suggestions dropdown */}
                                        {showStartSuggestions && startSuggestions.length > 0 && (
                                            <div className="absolute left-0 right-0 top-full bg-[#16161A] border border-white/10 rounded-xl mt-1.5 z-[9999] overflow-y-auto max-h-48 shadow-2xl">
                                                {startSuggestions.map((s: any) => (
                                                    <button
                                                        key={s.place_id}
                                                        type="button"
                                                        onClick={() => handleSelectStartSuggestion(s)}
                                                        className="w-full text-left px-3.5 py-2.5 text-xs text-gray-200 hover:bg-white/10 border-b border-white/5 last:border-b-0 truncate transition-colors flex items-center gap-2"
                                                    >
                                                        <span className="text-emerald-400 text-xs shrink-0">📍</span>
                                                        <span className="truncate">{s.display_name}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-1.5 relative z-[9994]">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                                            Destination *
                                        </label>
                                    </div>
                                    <div className="relative">
                                        <MapPin className="absolute left-3.5 top-3.5 text-rose-500" size={16} />
                                        <input 
                                            type="text"
                                            value={form.destination}
                                            onChange={e => setForm(f => ({ ...f, destination: e.target.value }))}
                                            onFocus={() => { setShowEndSuggestions(true); setShowStartSuggestions(false); }}
                                            placeholder="Enter drop-off destination address..."
                                            autoComplete="off"
                                            className="w-full bg-[#0C0C0E] border border-white/10 rounded-xl py-3 pl-11 pr-4 text-xs font-medium text-white placeholder-gray-500 focus:border-rose-500/50 transition-colors"
                                        />

                                        {/* Suggestions dropdown */}
                                        {showEndSuggestions && endSuggestions.length > 0 && (
                                            <div className="absolute left-0 right-0 top-full bg-[#16161A] border border-white/10 rounded-xl mt-1.5 z-[9999] overflow-y-auto max-h-48 shadow-2xl">
                                                {endSuggestions.map((s: any) => (
                                                    <button
                                                        key={s.place_id}
                                                        type="button"
                                                        onClick={() => handleSelectEndSuggestion(s)}
                                                        className="w-full text-left px-3.5 py-2.5 text-xs text-gray-200 hover:bg-white/10 border-b border-white/5 last:border-b-0 truncate transition-colors flex items-center gap-2"
                                                    >
                                                        <span className="text-rose-500 text-xs shrink-0">📍</span>
                                                        <span className="truncate">{s.display_name}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Real-time Live Interactive Route Map */}
                                <div className="space-y-1.5 pt-1">
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                                        <span>Route Live Map Preview</span>
                                        {startCoords && endCoords && (
                                            <span className="text-[9px] text-emerald-400 font-black animate-pulse flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                                Live Route Active
                                            </span>
                                        )}
                                    </div>
                                    <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-lg shadow-black/40">
                                        <div ref={routeMapRef} className="relative w-full h-[220px] bg-[#0C0C0E] z-[1]" />
                                        {/* Custom Overlay Zoom Controls */}
                                        <div className="absolute right-3 top-3 flex flex-col gap-1.5 z-20">
                                            <button
                                                type="button"
                                                onClick={() => { if (routeMapInstanceRef.current) routeMapInstanceRef.current.zoomIn(); }}
                                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#16161A]/95 border border-white/15 text-white hover:bg-white/10 active:scale-95 transition-all text-sm font-black shadow-md"
                                            >
                                                +
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => { if (routeMapInstanceRef.current) routeMapInstanceRef.current.zoomOut(); }}
                                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#16161A]/95 border border-white/15 text-white hover:bg-white/10 active:scale-95 transition-all text-sm font-black shadow-md"
                                            >
                                                −
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

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

                {/* Step 2: Review Details */}
                {currentStep === 2 && (
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

                            {/* Trip Locations */}
                            <div className="p-3.5 bg-black/30 border border-white/5 rounded-xl flex items-start gap-3.5">
                                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                                    <MapPin size={15} style={{ color: accentColor }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Route Information</span>
                                    <h4 className="font-bold text-[12px] text-white leading-tight">{form.pickupLocation}</h4>
                                    <span className="text-[9px] text-gray-500 block my-1">to</span>
                                    <h4 className="font-bold text-[12px] text-white leading-tight">{form.destination}</h4>
                                </div>
                            </div>

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

                            {/* Estimated Fee */}
                            <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                                <span className="text-xs text-gray-400 font-medium">Estimated Service Fee</span>
                                <span className="text-lg font-black text-white">₱{calculateEstimatedFee().toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Bottom Actions Sticky bar */}
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
                            className="flex-1 hover:opacity-90 disabled:opacity-50 text-white font-black uppercase tracking-widest text-[11px] py-4 flex items-center justify-center gap-2 transition-colors rounded-xl"
                            style={{ backgroundColor: accentColor }}
                        >
                            {submitting ? <Spinner size="sm" /> : 'Confirm Booking'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DriverBookingFlow;
