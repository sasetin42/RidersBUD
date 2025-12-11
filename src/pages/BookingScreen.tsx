import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Spinner from '../components/Spinner';
import { useAuth } from '../context/AuthContext';
import { useDatabase } from '../context/DatabaseContext';
import { Service, Mechanic, Booking, Vehicle, Settings } from '../types';
import { getNotificationSettings, showNotification } from '../utils/notificationManager';
import { Check, Star, User, PlusCircle, Search, ChevronLeft } from 'lucide-react';

declare const L: any;

const ServiceSelectionCard: React.FC<{ service: Service, isSelected: boolean, onSelect: (serviceId: string) => void }> = ({ service, isSelected, onSelect }) => (
    <div
        onClick={() => onSelect(service.id)}
        className={`glass-card p-4 rounded-xl flex items-center gap-4 cursor-pointer transition-all duration-200 ${isSelected ? 'border-[1.5px] border-primary/50 ring-1 ring-primary/20' : 'border border-white/5 hover:border-primary/30 hover:-translate-y-1'}`}
    >
        <div className="text-primary flex-shrink-0" dangerouslySetInnerHTML={{ __html: service.icon }} />
        <div className="flex-grow text-left">
            <p className="font-semibold text-white">{service.name}</p>
            <p className="text-xs text-light-gray mt-1">
                {service.price > 0 ? `from ₱${service.price.toLocaleString()}` : 'Request Quote'}
            </p>
        </div>
        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all duration-200 ${isSelected ? 'bg-primary border-primary' : 'bg-field border-dark-gray'}`}>
            {isSelected && (
                <Check className="h-4 w-4 text-white" strokeWidth={3} />
            )}
        </div>
    </div>
);

const MechanicAvailabilityCard: React.FC<{
    mechanic: Mechanic;
    selectedDate: Date;
    settings: Settings;
    bookings: Booking[];
    onSelectTimeSlot: (mechanic: Mechanic, time: string) => void;
}> = ({ mechanic, selectedDate, settings, bookings, onSelectTimeSlot }) => {
    const navigate = useNavigate();

    const availableTimeSlots = useMemo(() => {
        const dayOfWeek = selectedDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as keyof Required<Mechanic>['availability'];
        const daySchedule = mechanic.availability?.[dayOfWeek];

        if (!daySchedule || !daySchedule.isAvailable) {
            return [];
        }

        const slots = [];
        const { bookingSlotDuration } = settings;
        const start = new Date(`1970-01-01T${daySchedule.startTime}:00`);
        const end = new Date(`1970-01-01T${daySchedule.endTime}:00`);

        let current = start;
        while (current < end) {
            slots.push(current.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }));
            current = new Date(current.getTime() + bookingSlotDuration * 60 * 1000);
        }
        return slots;
    }, [mechanic, selectedDate, settings]);


    const bookedSlots = useMemo(() => {
        const selectedDateISO = selectedDate.toISOString().split('T')[0];
        return new Set(
            bookings
                .filter(b => b.mechanic?.id === mechanic.id && b.date === selectedDateISO && (b.status === 'Upcoming' || b.status === 'En Route' || b.status === 'In Progress'))
                .map(b => b.time)
        );
    }, [bookings, mechanic.id, selectedDate]);

    return (
        <div className="glass-card rounded-2xl overflow-hidden hover:border-primary/30 transition-all duration-300 shadow-lg animate-fadeIn">
            {/* Top Section: Profile Info */}
            <div className="p-4 flex items-center gap-4">
                <img src={mechanic.imageUrl} alt={mechanic.name} className="w-24 h-24 rounded-full object-cover border-4 border-primary/20" />
                <div className="flex-grow">
                    <p className="text-xl font-bold text-white">{mechanic.name}</p>
                    <div className="flex items-center gap-1.5 text-sm text-yellow-400 mt-1">
                        <Star className="h-4 w-4 fill-current" />
                        <span className="font-semibold">{mechanic.rating.toFixed(1)}</span>
                        <span className="text-xs text-light-gray">({mechanic.reviews} jobs)</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {mechanic.specializations.slice(0, 2).map(spec => (
                            <span key={spec} className="bg-secondary text-light-gray text-[11px] font-medium px-2 py-0.5 rounded-full">{spec}</span>
                        ))}
                    </div>
                </div>
                <button
                    onClick={() => navigate(`/mechanic-profile/${mechanic.id}`)}
                    className="text-primary p-2 rounded-full hover:bg-primary/10 transition-colors self-start"
                    aria-label={`View profile for ${mechanic.name}`}
                >
                    <User className="h-6 w-6" />
                </button>
            </div>

            {/* Bottom Section: Time Slots */}
            <div className="p-4 bg-white/5 border-t border-white/10">
                <h4 className="text-sm font-semibold text-light-gray mb-3">Available Slots:</h4>
                {availableTimeSlots.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                        {availableTimeSlots.map(time => {
                            const isBooked = bookedSlots.has(time);
                            return (
                                <button
                                    key={time}
                                    disabled={isBooked}
                                    onClick={() => onSelectTimeSlot(mechanic, time)}
                                    className={`py-3 px-2 rounded-lg text-sm font-semibold transition-all duration-200 transform focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-dark-gray ${isBooked
                                        ? 'bg-black/40 text-gray-600 cursor-not-allowed line-through'
                                        : 'glass-button text-white hover:bg-primary hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/30'
                                        }`}
                                >
                                    {time}
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-xs text-center text-gray-400">No available slots for this day.</p>
                )}
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
    const { user } = useAuth();
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

    const [selectedDate, setSelectedDate] = useState(initialState?.selectedDate || new Date(new Date().setDate(new Date().getDate() + 1)));

    const [serviceLocation, setServiceLocation] = useState<{ lat: number; lng: number } | null>(initialState?.serviceLocation || null);
    const [locationStatus, setLocationStatus] = useState<'idle' | 'fetching' | 'success' | 'error'>('idle');
    const [locationError, setLocationError] = useState('');

    const [mechanicSearch, setMechanicSearch] = useState(initialState?.mechanicSearch || '');
    const [specializationFilter, setSpecializationFilter] = useState(initialState?.specializationFilter || 'all');
    const [sortOption, setSortOption] = useState<'rating' | 'jobs' | 'name'>(initialState?.sortOption || 'rating');
    const [availableNowFilter, setAvailableNowFilter] = useState(initialState?.availableNowFilter || false);
    const [selectedTime, setSelectedTime] = useState('');
    const [selectedMechanic, setSelectedMechanic] = useState<Mechanic | null>(null);

    const [notes, setNotes] = useState(initialState?.notes || '');
    const [isBooking, setIsBooking] = useState(false);

    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const markerRef = useRef<any>(null);

    useEffect(() => {
        if (user && user.vehicles.length > 0 && !selectedVehiclePlate) {
            const primaryVehicle = user.vehicles.find(v => v.isPrimary);
            setSelectedVehiclePlate(primaryVehicle?.plateNumber || user.vehicles[0].plateNumber);
        }
    }, [user, selectedVehiclePlate]);

    useEffect(() => {
        const stateToSave = {
            step,
            selectedServiceIds: Array.from(selectedServiceIds),
            selectedVehiclePlate,
            selectedDate: selectedDate.toISOString(),
            serviceLocation,
            mechanicSearch,
            specializationFilter,
            sortOption,
            availableNowFilter,
            notes,
        };
        sessionStorage.setItem(BOOKING_STATE_KEY, JSON.stringify(stateToSave));
    }, [step, selectedServiceIds, selectedVehiclePlate, selectedDate, serviceLocation, mechanicSearch, specializationFilter, sortOption, availableNowFilter, notes]);

    useEffect(() => {
        if (step === 3) {
            if (serviceLocation) {
                setLocationStatus('success');
                return;
            }
            if (locationStatus === 'idle') {
                setLocationStatus('fetching');
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const { latitude, longitude } = position.coords;
                        setServiceLocation({ lat: latitude, lng: longitude });
                        setLocationStatus('success');
                        setLocationError('');
                    },
                    (error) => {
                        console.error("Geolocation error:", error);
                        setLocationStatus('error');
                        setLocationError('Could not get your location. Please enable location services and try again.');
                    }
                );
            }
        }
    }, [step, locationStatus, serviceLocation]);

    useEffect(() => {
        if (step === 3 && serviceLocation && mapRef.current && !mapInstanceRef.current && typeof L !== 'undefined') {
            mapInstanceRef.current = L.map(mapRef.current).setView([serviceLocation.lat, serviceLocation.lng], 16);
            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: '&copy; CARTO' }).addTo(mapInstanceRef.current);

            const locationIcon = L.divIcon({
                html: `<svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-primary animate-pulse" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 21l-4.95-6.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" /></svg>`,
                className: 'bg-transparent border-0',
                iconSize: [40, 40],
                iconAnchor: [20, 40]
            });

            markerRef.current = L.marker([serviceLocation.lat, serviceLocation.lng], { icon: locationIcon, draggable: true }).addTo(mapInstanceRef.current);
            markerRef.current.on('dragend', (e: any) => {
                const { lat, lng } = e.target.getLatLng();
                setServiceLocation({ lat, lng });
            });
        }

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [step, serviceLocation]);


    const handleBack = () => {
        if (step > 1) {
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
            case 4: return 'Select Mechanic & Time';
            case 5: return 'Confirm Booking';
            default: return 'Book a Service';
        }
    };

    if (!db) {
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

    const filteredAndSortedMechanics = useMemo(() => {
        const selectedDayOfWeek = selectedDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as keyof Required<Mechanic>['availability'];
        const selectedDateWithoutTime = new Date(selectedDate);
        selectedDateWithoutTime.setHours(0, 0, 0, 0);
        const isToday = selectedDate.toDateString() === new Date().toDateString();

        const selectedServices = services.filter(s => selectedServiceIds.has(s.id));

        let availableMechanics = mechanics.filter(mechanic => {
            if (mechanic.status !== 'Active') return false;

            if (mechanic.unavailableDates?.some(d => {
                const start = new Date(d.startDate.replace(/-/g, '/'));
                const end = new Date(d.endDate.replace(/-/g, '/'));
                start.setHours(0, 0, 0, 0);
                end.setHours(0, 0, 0, 0);
                return selectedDateWithoutTime >= start && selectedDateWithoutTime <= end;
            })) {
                return false;
            }

            if (!mechanic.availability?.[selectedDayOfWeek]?.isAvailable) return false;

            if (selectedServices.length > 0) {
                const hasSpecializationMatch = selectedServices.some(selectedService => {
                    const serviceNameLower = selectedService.name.toLowerCase();
                    const serviceCategoryLower = selectedService.category.toLowerCase();

                    return mechanic.specializations.some(specRaw => {
                        const spec = specRaw.toLowerCase();
                        if (spec.includes(serviceCategoryLower)) return true;

                        const serviceWords = serviceNameLower.split(' ');
                        return serviceWords.some(word => word.length > 2 && spec.includes(word));
                    });
                });
                if (!hasSpecializationMatch) return false;
            }

            if (specializationFilter !== 'all' && !mechanic.specializations.includes(specializationFilter)) return false;

            if (availableNowFilter && isToday) {
                const schedule = mechanic.availability?.[selectedDayOfWeek];
                if (!schedule?.isAvailable) return false;
                const now = new Date();
                const startTime = new Date(`${selectedDate.toISOString().split('T')[0]}T${schedule.startTime}`);
                const endTime = new Date(`${selectedDate.toISOString().split('T')[0]}T${schedule.endTime}`);
                if (now < startTime || now > endTime || db.bookings.some(b => b.mechanic?.id === mechanic.id && (b.status === 'En Route' || b.status === 'In Progress'))) {
                    return false;
                }
            }

            if (mechanicSearch && !mechanic.name.toLowerCase().includes(mechanicSearch.toLowerCase())) return false;

            return true;
        });

        availableMechanics.sort((a, b) => {
            switch (sortOption) {
                case 'rating': return b.rating - a.rating;
                case 'jobs': return b.reviews - a.reviews;
                case 'name': return a.name.localeCompare(b.name);
                default: return 0;
            }
        });

        if (locationState?.preselectedMechanicId) {
            const preselectedMechanic = availableMechanics.find(m => m.id === locationState.preselectedMechanicId);
            if (preselectedMechanic) {
                const otherMechanics = availableMechanics.filter(m => m.id !== locationState.preselectedMechanicId);
                return [preselectedMechanic, ...otherMechanics];
            }
        }

        return availableMechanics;
    }, [mechanics, services, selectedServiceIds, selectedDate, specializationFilter, availableNowFilter, mechanicSearch, sortOption, db.bookings, locationState]);


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

    const handleBooking = async () => {
        const selectedServices = services.filter(s => selectedServiceIds.has(s.id));
        const selectedVehicle = user?.vehicles.find(v => v.plateNumber === selectedVehiclePlate);
        if (selectedServices.length === 0 || !user || !selectedMechanic || !selectedVehicle || !serviceLocation) {
            setError('Missing booking information. Please start over.');
            return;
        }

        setIsBooking(true);
        setError('');

        try {
            const bookingPromises = selectedServices.map(service => {
                const newBookingData = {
                    customerName: user.name,
                    service: service,
                    date: selectedDate.toISOString().split('T')[0],
                    time: selectedTime,
                    status: 'Upcoming' as const,
                    vehicle: selectedVehicle,
                    mechanic: selectedMechanic,
                    location: serviceLocation,
                    notes,
                };
                return addBooking(newBookingData);
            });

            const newlyCreatedBookings = (await Promise.all(bookingPromises)).filter(b => b !== null) as Booking[];

            if (newlyCreatedBookings.length === selectedServices.length) {
                sessionStorage.removeItem(BOOKING_STATE_KEY);
                const settings = getNotificationSettings();
                if (settings.bookingUpdates) {
                    showNotification('Booking Confirmed!', {
                        body: `Your appointment for ${newlyCreatedBookings.length} service(s) on ${selectedDate.toLocaleDateString()} is set.`
                    });
                }
                navigate('/booking-confirmation', { state: { bookings: newlyCreatedBookings } });
            } else {
                setError('Failed to create one or more bookings. Please try again.');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred.");
        } finally {
            setIsBooking(false);
        }
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
                    {user?.vehicles && user.vehicles.length > 0 ? (
                        <div className="glass-panel p-4 rounded-xl">
                            <label className="text-xs text-light-gray block mb-1 uppercase tracking-wider">Your Vehicle</label>
                            <select value={selectedVehiclePlate} onChange={e => setSelectedVehiclePlate(e.target.value)} className="w-full bg-transparent font-semibold text-white focus:outline-none border-b border-white/10 pb-2">
                                {user.vehicles.map(v => <option key={v.plateNumber} value={v.plateNumber} className="bg-secondary text-white">{v.year} {v.make} {v.model}</option>)}
                            </select>
                        </div>
                    ) : (
                        <div className="bg-dark-gray p-6 rounded-lg text-center flex flex-col items-center border border-dashed border-field">
                            <PlusCircle className="h-12 w-12 text-primary mb-3" strokeWidth={1} />
                            <h3 className="text-lg font-bold text-white">Add a Vehicle to Your Garage</h3>
                            <p className="text-sm text-light-gray my-2">You need to have at least one vehicle registered before you can book a service.</p>
                            <button
                                onClick={() => navigate('/my-garage')}
                                className="mt-4 bg-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-orange-600 transition"
                            >
                                Go to My Garage
                            </button>
                        </div>
                    )}
                </div>

                <div className="space-y-3">
                    {services.map(service => (
                        <ServiceSelectionCard key={service.id} service={service} isSelected={selectedServiceIds.has(service.id)} onSelect={handleServiceSelect} />
                    ))}
                </div>
            </div>
            <div className="p-4 glass-heavy border-t border-white/5 z-10">
                {error && <p className="text-red-400 text-center text-sm mb-2 p-2 bg-red-500/10 rounded-lg">{error}</p>}
                {totalPrice > 0 && (
                    <div className="flex justify-between items-center mb-2 px-1">
                        <span className="text-light-gray">Total for {selectedServiceIds.size} service(s):</span>
                        <span className="font-bold text-xl text-primary">₱{totalPrice.toLocaleString()}</span>
                    </div>
                )}
                <button onClick={handleStep1Continue} disabled={selectedServiceIds.size === 0 || !selectedVehiclePlate} className="glass-button w-full font-bold py-3.5 rounded-xl transition disabled:opacity-50 flex items-center justify-center">
                    Continue
                </button>
            </div>
        </>
    );

    const renderStep2 = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const year = selectedDate.getFullYear();
        const month = selectedDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        return (
            <>
                <div className="p-6 space-y-6 flex-grow overflow-y-auto">
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Choose a Date</h3>
                        <div className="glass-panel p-4 rounded-xl">
                            <div className="flex justify-between items-center mb-4">
                                <button onClick={() => setSelectedDate(new Date(year, month - 1))} className="text-primary hover:bg-white/10 p-1 rounded-full text-xl leading-none">&lt;</button>
                                <p className="font-bold">{selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
                                <button onClick={() => setSelectedDate(new Date(year, month + 1))} className="text-primary hover:bg-white/10 p-1 rounded-full text-xl leading-none">&gt;</button>
                            </div>
                            <div className="grid grid-cols-7 text-center text-xs text-light-gray mb-2 font-medium">{['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <div key={d}>{d}</div>)}</div>
                            <div className="grid grid-cols-7 text-center text-sm">
                                {Array.from({ length: firstDay }).map((_, i) => <div key={`b-${i}`}></div>)}
                                {Array.from({ length: daysInMonth }).map((_, dayIndex) => {
                                    const day = dayIndex + 1;
                                    const date = new Date(year, month, day);
                                    date.setHours(0, 0, 0, 0);
                                    const isSelected = day === selectedDate.getDate() && month === selectedDate.getMonth() && year === selectedDate.getFullYear();
                                    const isPast = date < today;
                                    return (
                                        <div key={day} className="p-1">
                                            <button
                                                onClick={() => !isPast && setSelectedDate(date)}
                                                disabled={isPast}
                                                className={`w-9 h-9 rounded-full transition-all duration-200 flex items-center justify-center ${isPast
                                                    ? 'text-gray-600 cursor-not-allowed'
                                                    : isSelected
                                                        ? 'bg-primary text-white shadow-lg shadow-primary/30 font-bold'
                                                        : 'hover:bg-white/10'
                                                    }`}
                                            >
                                                {day}
                                            </button>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="p-4 glass-heavy border-t border-white/5">
                    {error && <p className="text-red-400 text-center text-sm mb-2">{error}</p>}
                    <button onClick={handleStep2Continue} disabled={!selectedDate} className="glass-button w-full font-bold py-3.5 rounded-xl transition disabled:opacity-50">
                        Continue
                    </button>
                </div>
            </>
        )
    };

    const renderStep3 = () => {
        const retryLocation = () => {
            setLocationStatus('idle');
            setServiceLocation(null);
        };

        return (
            <>
                <div className="p-6 flex-grow flex flex-col">
                    <h3 className="text-lg font-semibold text-white">Confirm Service Location</h3>
                    <p className="text-sm text-light-gray mb-4">Your mechanic will be dispatched here. Drag the pin to adjust if needed.</p>
                    <div className="flex-grow bg-dark-gray rounded-lg relative overflow-hidden">
                        {locationStatus === 'fetching' && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-dark-gray z-10">
                                <Spinner size="lg" />
                                <p className="mt-4 text-light-gray">Getting your location...</p>
                            </div>
                        )}
                        {locationStatus === 'error' && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-dark-gray z-10 p-4 text-center">
                                <p className="text-red-400">{locationError}</p>
                                <button onClick={retryLocation} className="mt-4 bg-primary text-white font-semibold py-2 px-4 rounded-lg">Try Again</button>
                            </div>
                        )}
                        <div ref={mapRef} className={`h-full w-full transition-opacity ${locationStatus === 'success' ? 'opacity-100' : 'opacity-0'}`} />
                    </div>
                </div>
                <div className="p-4 glass-heavy border-t border-white/5">
                    <button onClick={handleStep3Continue} disabled={locationStatus !== 'success'} className="glass-button w-full font-bold py-3.5 rounded-xl transition disabled:opacity-50">
                        Confirm Location & See Mechanics
                    </button>
                </div>
            </>
        );
    };

    const renderStep4 = () => {
        const isToday = selectedDate.toDateString() === new Date().toDateString();
        const selectedServices = services.filter(s => selectedServiceIds.has(s.id));

        return (
            <div className="p-4 space-y-4 flex-grow overflow-y-auto">
                {selectedServices.length > 0 && (
                    <div className="text-center text-sm text-light-gray -mt-2 mb-2 glass-panel p-2 rounded-md border border-white/10">
                        <p>Showing mechanics specializing in your selected services.</p>
                    </div>
                )}

                <div className="glass-panel p-4 rounded-xl border border-white/10">
                    <h4 className="text-sm font-semibold text-light-gray mb-3">Refine Your Search</h4>
                    <div className="space-y-3">
                        {isToday && (
                            <div className="flex items-center gap-2 bg-black/20 p-2 rounded-lg">
                                <input
                                    type="checkbox"
                                    id="available-now"
                                    checked={availableNowFilter}
                                    onChange={(e) => setAvailableNowFilter(e.target.checked)}
                                    className="w-5 h-5 text-primary bg-transparent rounded border-gray-500 focus:ring-primary"
                                />
                                <label htmlFor="available-now" className="text-white font-semibold cursor-pointer">Available Now</label>
                            </div>
                        )}
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                <Search className="h-5 w-5 text-light-gray" />
                            </span>
                            <input
                                type="text"
                                placeholder="Search by name..."
                                value={mechanicSearch}
                                onChange={(e) => setMechanicSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 glass-input rounded-xl focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <select
                                value={specializationFilter}
                                onChange={e => setSpecializationFilter(e.target.value)}
                                className="w-full px-3 py-2.5 glass-input rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                                {allSpecializations.map(spec => (
                                    <option key={spec} value={spec} className="bg-secondary capitalize">
                                        {spec === 'all' ? 'Any Specialization' : spec}
                                    </option>
                                ))}
                            </select>
                            <select
                                value={sortOption}
                                onChange={e => setSortOption(e.target.value as any)}
                                className="w-full px-3 py-2.5 glass-input rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                                <option value="rating" className="bg-secondary">Sort by: Rating</option>
                                <option value="jobs" className="bg-secondary">Sort by: Jobs</option>
                                <option value="name" className="bg-secondary">Sort by: Name</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="space-y-4 pt-2">
                    {filteredAndSortedMechanics.length === 0 ? (
                        <p className="text-center text-light-gray pt-8">No mechanics found matching your criteria for this day.</p>
                    ) : (
                        filteredAndSortedMechanics.map(mechanic => (
                            <MechanicAvailabilityCard
                                key={mechanic.id}
                                mechanic={mechanic}
                                selectedDate={selectedDate}
                                settings={db.settings}
                                bookings={bookings}
                                onSelectTimeSlot={handleSelectTimeSlot}
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

        if (selectedServices.length === 0 || !selectedVehicle || !selectedMechanic) {
            return <div className="p-8 text-center">Something went wrong. Please start over.</div>
        }

        return (
            <>
                <div className="p-6 space-y-4 flex-grow overflow-y-auto">
                    <div className="glass-panel p-4 rounded-xl">
                        <h3 className="font-bold text-primary mb-2">Service Details</h3>
                        {selectedServices.map(service => (
                            <div key={service.id} className="flex justify-between items-center py-1 border-b border-white/5 last:border-0">
                                <p className="font-semibold text-white">{service.name}</p>
                                {service.price > 0 ? (
                                    <p className="font-semibold text-white">₱{service.price.toLocaleString()}</p>
                                ) : (
                                    <p className="font-semibold text-yellow-400">Quote Required</p>
                                )}
                            </div>
                        ))}
                        <div className="flex justify-between items-center pt-2 mt-2 border-t border-white/10">
                            <p className="font-bold text-primary">Total</p>
                            <p className="font-bold text-primary text-lg">{totalPrice > 0 ? `₱${totalPrice.toLocaleString()}` : 'For Quotation'}</p>
                        </div>
                        <p className="text-sm text-light-gray mt-3">{selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model} ({selectedVehicle.plateNumber})</p>
                    </div>
                    <div className="glass-panel p-4 rounded-xl">
                        <h3 className="font-bold text-primary mb-2">Schedule</h3>
                        <p className="font-semibold text-white">{selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                        <p className="text-sm text-light-gray">{selectedTime}</p>
                    </div>
                    <div className="glass-panel p-4 rounded-xl">
                        <h3 className="font-bold text-primary mb-2">Your Mechanic</h3>
                        <p className="font-semibold text-white">{selectedMechanic.name}</p>
                        <p className="text-sm text-yellow-400">⭐ {selectedMechanic.rating.toFixed(1)} ({selectedMechanic.reviews} jobs)</p>
                    </div>
                    <div className="glass-panel p-4 rounded-xl">
                        <h3 className="font-bold text-primary mb-2">Notes for Mechanic</h3>
                        <p className="text-xs text-light-gray mb-2">Please provide any specific details about the issue or instructions for the mechanic.</p>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="e.g., 'There's a rattling noise...' or 'Doorbell is broken, please call.'"
                            rows={3}
                            className="w-full p-3 glass-input rounded-xl text-sm placeholder-light-gray focus:ring-primary focus:border-primary focus:outline-none"
                        />
                    </div>
                </div>
                <div className="p-4 glass-heavy border-t border-white/5">
                    {error && <p className="text-red-400 text-center text-sm mb-2 p-2 bg-red-500/10 rounded-lg">{error}</p>}
                    <button onClick={handleBooking} disabled={isBooking} className="glass-button w-full font-bold py-3.5 rounded-xl transition flex items-center justify-center disabled:opacity-50">
                        {isBooking ? <Spinner size="sm" /> : isQuoteRequest ? 'Confirm & Request Quote' : 'Confirm & Book Now'}
                    </button>
                </div>
            </>
        );
    };


    return (
        <div className="flex flex-col h-full bg-secondary">
            <div className="relative flex items-center justify-center p-4 glass-heavy border-b border-white/5 flex-shrink-0 z-10">
                <button onClick={handleBack} className="absolute left-4 text-primary">
                    <ChevronLeft className="h-6 w-6" />
                </button>
                <h1 className="text-xl font-bold text-white">{getHeaderTitle()}</h1>
            </div>
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            {step === 4 && renderStep4()}
            {step === 5 && renderStep5()}
        </div>
    );
};

export default BookingScreen;
