import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Spinner from '../components/Spinner';
import { useAuth } from '../context/AuthContext';
import { useDatabase } from '../context/DatabaseContext';
import { Service, Mechanic, Booking, Vehicle, Settings } from '../types';
import { getNotificationSettings, showNotification } from '../utils/notificationManager';

const ServiceSelectionCard: React.FC<{ service: Service, isSelected: boolean, onSelect: () => void }> = ({ service, isSelected, onSelect }) => (
    <div
        onClick={onSelect}
        className={`bg-dark-gray p-4 rounded-lg flex items-center gap-4 cursor-pointer transition-all duration-200 border-2 ${isSelected ? 'border-primary' : 'border-transparent hover:border-primary/50'}`}
    >
        <div className="text-primary flex-shrink-0" dangerouslySetInnerHTML={{ __html: service.icon }} />
        <div className="flex-grow text-left">
            <p className="font-semibold text-white">{service.name}</p>
            <p className="text-xs text-light-gray mt-1">
                {service.price > 0 ? `from ₱${service.price.toLocaleString()}` : 'Request Quote'}
            </p>
        </div>
        {isSelected && (
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
            </div>
        )}
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
        <div className="bg-dark-gray rounded-xl overflow-hidden border border-transparent hover:border-primary/30 transition-all duration-300 shadow-lg animate-fadeIn">
            {/* Top Section: Profile Info */}
            <div className="p-4 flex items-center gap-4">
                <img src={mechanic.imageUrl} alt={mechanic.name} className="w-24 h-24 rounded-full object-cover border-4 border-primary/20"/>
                <div className="flex-grow">
                    <p className="text-xl font-bold text-white">{mechanic.name}</p>
                    <div className="flex items-center gap-1.5 text-sm text-yellow-400 mt-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
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
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </button>
            </div>
            
            {/* Bottom Section: Time Slots */}
            <div className="p-4 bg-secondary/30 border-t border-field">
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
                                    className={`py-3 px-2 rounded-lg text-sm font-semibold transition-all duration-200 transform focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-dark-gray ${
                                        isBooked 
                                        ? 'bg-black/40 text-gray-600 cursor-not-allowed line-through' 
                                        : 'bg-field text-white hover:bg-primary hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/30'
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

const getInitialState = (serviceIdFromUrl?: string) => {
    try {
        const savedStateJSON = sessionStorage.getItem(BOOKING_STATE_KEY);
        if (savedStateJSON) {
            const savedState = JSON.parse(savedStateJSON);
            
            // If a new booking flow is started via URL, invalidate the old state.
            if (serviceIdFromUrl && savedState.selectedServiceId && savedState.selectedServiceId !== serviceIdFromUrl) {
                sessionStorage.removeItem(BOOKING_STATE_KEY);
                return null;
            }

            if (savedState.selectedDate) {
                savedState.selectedDate = new Date(savedState.selectedDate);
            }
            return savedState;
        }
    } catch (error) {
        console.error("Could not parse booking state from sessionStorage", error);
        sessionStorage.removeItem(BOOKING_STATE_KEY);
    }
    return null;
};


const BookingScreen: React.FC = () => {
    const { serviceId: initialServiceId } = useParams<{ serviceId: string }>();
    const { db, addBooking } = useDatabase();
    const navigate = useNavigate();
    const { user } = useAuth();
    const location = useLocation();

    const rebookingState = location.state as { vehiclePlateNumber?: string; } | undefined;

    // Use a lazy initializer to read from sessionStorage only on the first render
    const [step, setStep] = useState(() => getInitialState(initialServiceId)?.step || 1);
    const [error, setError] = useState('');

    // Step 1 State
    const [selectedServiceId, setSelectedServiceId] = useState<string | undefined>(() => getInitialState(initialServiceId)?.selectedServiceId || initialServiceId);
    const [selectedVehiclePlate, setSelectedVehiclePlate] = useState(() => 
        rebookingState?.vehiclePlateNumber || 
        getInitialState(initialServiceId)?.selectedVehiclePlate || 
        ''
    );
    
    // Step 2 State
    const [selectedDate, setSelectedDate] = useState(() => getInitialState(initialServiceId)?.selectedDate || new Date(new Date().setDate(new Date().getDate() + 1)));
    
    // Step 3 State
    const [mechanicSearch, setMechanicSearch] = useState(() => getInitialState(initialServiceId)?.mechanicSearch || '');
    const [specializationFilter, setSpecializationFilter] = useState(() => getInitialState(initialServiceId)?.specializationFilter || 'all');
    const [sortOption, setSortOption] = useState<'rating' | 'jobs' | 'name'>(() => getInitialState(initialServiceId)?.sortOption || 'rating');
    const [availableNowFilter, setAvailableNowFilter] = useState(() => getInitialState(initialServiceId)?.availableNowFilter || false);
    const [selectedTime, setSelectedTime] = useState('');
    const [selectedMechanic, setSelectedMechanic] = useState<Mechanic | null>(null);

    // Step 4 State
    const [notes, setNotes] = useState('');
    const [isBooking, setIsBooking] = useState(false);

    // Effect to set initial vehicle if one isn't already selected from session/rebooking state
    useEffect(() => {
        if (user && user.vehicles.length > 0 && !selectedVehiclePlate) {
            const primaryVehicle = user.vehicles.find(v => v.isPrimary);
            // Default to primary, or fallback to the first vehicle if none is primary.
            setSelectedVehiclePlate(primaryVehicle?.plateNumber || user.vehicles[0].plateNumber);
        }
    }, [user, selectedVehiclePlate]);

    // Effect to save state to sessionStorage whenever it changes
    useEffect(() => {
        const stateToSave = {
            step,
            selectedServiceId,
            selectedVehiclePlate,
            selectedDate: selectedDate.toISOString(),
            mechanicSearch,
            specializationFilter,
            sortOption,
            availableNowFilter,
        };
        sessionStorage.setItem(BOOKING_STATE_KEY, JSON.stringify(stateToSave));
    }, [step, selectedServiceId, selectedVehiclePlate, selectedDate, mechanicSearch, specializationFilter, sortOption, availableNowFilter]);


    const handleBack = () => {
        if (step > 1) {
            setStep(s => s - 1);
        } else {
            sessionStorage.removeItem(BOOKING_STATE_KEY);
            navigate(-1);
        }
    };

    const getHeaderTitle = () => {
        switch(step) {
            case 1: return 'Select Service & Vehicle';
            case 2: return 'Select a Date';
            case 3: return 'Select Mechanic & Time';
            case 4: return 'Confirm Booking';
            default: return 'Book a Service';
        }
    };

    if (!db) {
        return <div className="flex items-center justify-center h-full"><Spinner size="lg" /></div>;
    }

    const { services, bookings, mechanics } = db;

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

        const selectedService = services.find(s => s.id === selectedServiceId);

        let availableMechanics = mechanics.filter(mechanic => {
            if (mechanic.status !== 'Active') return false;

            // Check specific unavailable dates first
            if (mechanic.unavailableDates?.some(d => {
                const start = new Date(d.startDate.replace(/-/g, '/'));
                const end = new Date(d.endDate.replace(/-/g, '/'));
                start.setHours(0, 0, 0, 0);
                end.setHours(0, 0, 0, 0);
                return selectedDateWithoutTime >= start && selectedDateWithoutTime <= end;
            })) {
                return false;
            }

            // Check weekly availability
            if (!mechanic.availability?.[selectedDayOfWeek]?.isAvailable) return false;
            
            // Implicitly filter by service specialization
            if (selectedService) {
                const serviceNameLower = selectedService.name.toLowerCase();
                const serviceCategoryLower = selectedService.category.toLowerCase();
                
                const hasSpecializationMatch = mechanic.specializations.some(specRaw => {
                    const spec = specRaw.toLowerCase();
                    const serviceWords = serviceNameLower.split(' ');
                    return serviceWords.some(word => word.length > 2 && spec.includes(word));
                });
                
                const hasCategoryMatch = mechanic.specializations.some(specRaw => {
                    const spec = specRaw.toLowerCase();
                    return spec.includes(serviceCategoryLower);
                });

                if (!hasSpecializationMatch && !hasCategoryMatch) return false;
            }

            // Apply manual specialization filter from dropdown
            if (specializationFilter !== 'all' && !mechanic.specializations.includes(specializationFilter)) return false;

            // Apply "Available Now" filter
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
            
            // Apply search filter
            if (mechanicSearch && !mechanic.name.toLowerCase().includes(mechanicSearch.toLowerCase())) return false;

            return true;
        });

        // Apply sorting
        availableMechanics.sort((a, b) => {
            switch (sortOption) {
                case 'rating': return b.rating - a.rating;
                case 'jobs': return b.reviews - a.reviews;
                case 'name': return a.name.localeCompare(b.name);
                default: return 0;
            }
        });

        return availableMechanics;
    }, [mechanics, services, selectedServiceId, selectedDate, specializationFilter, availableNowFilter, mechanicSearch, sortOption, db.bookings]);


    const handleStep1Continue = () => {
        if (!selectedServiceId) setError('Please select a service.');
        else if (!selectedVehiclePlate) setError('Please select a vehicle.');
        else { setError(''); setStep(2); }
    };
    
    const handleStep2Continue = () => {
        if (!selectedDate) setError('Please select a date.');
        else { setError(''); setStep(3); }
    };

    const handleSelectTimeSlot = (mechanic: Mechanic, time: string) => {
        setSelectedMechanic(mechanic);
        setSelectedTime(time);
        setStep(4);
    };
    
    const handleBooking = async () => {
        const selectedService = services.find(s => s.id === selectedServiceId);
        const selectedVehicle = user?.vehicles.find(v => v.plateNumber === selectedVehiclePlate);
        if (!selectedService || !user || !selectedMechanic || !selectedVehicle) {
            setError('Missing booking information. Please start over.');
            return;
        }

        setIsBooking(true);
        setError('');
        
        try {
            const newBookingData = {
                customerName: user.name,
                service: selectedService,
                date: selectedDate.toISOString().split('T')[0],
                time: selectedTime,
                status: 'Upcoming' as const,
                vehicle: selectedVehicle,
                mechanic: selectedMechanic,
                notes,
            };
            const newlyCreatedBooking = await addBooking(newBookingData);
            
            if (newlyCreatedBooking) {
                sessionStorage.removeItem(BOOKING_STATE_KEY);
                const settings = getNotificationSettings();
                if (settings.bookingUpdates) {
                    showNotification('Booking Confirmed!', {
                        body: `Your appointment for ${selectedService.name} on ${selectedDate.toLocaleDateString()} is set.`
                    });
                }
                navigate('/booking-confirmation', { state: { booking: newlyCreatedBooking } });
            } else {
                 setError('Failed to create booking. Please try again.');
            }
        } catch(err) {
            setError(err instanceof Error ? err.message : "An error occurred.");
        } finally {
            setIsBooking(false);
        }
    };


    const renderStep1 = () => (
        <>
            <div className="p-6 space-y-6 flex-grow overflow-y-auto">
                <div>
                     {user?.vehicles && user.vehicles.length > 0 ? (
                        <div className="bg-dark-gray p-3 rounded-lg">
                             <label className="text-xs text-light-gray block mb-1">Your Vehicle</label>
                             <select value={selectedVehiclePlate} onChange={e => setSelectedVehiclePlate(e.target.value)} className="w-full bg-transparent font-semibold text-white focus:outline-none">
                                {user.vehicles.map(v => <option key={v.plateNumber} value={v.plateNumber}>{v.year} {v.make} {v.model}</option>)}
                            </select>
                        </div>
                    ) : (
                        <div className="bg-dark-gray p-6 rounded-lg text-center flex flex-col items-center border border-dashed border-field">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-primary mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                            </svg>
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
                        <ServiceSelectionCard key={service.id} service={service} isSelected={selectedServiceId === service.id} onSelect={() => setSelectedServiceId(service.id)} />
                    ))}
                </div>
            </div>
            <div className="p-4 bg-[#1D1D1D] border-t border-dark-gray">
                 {error && <p className="text-red-400 text-center text-sm mb-2">{error}</p>}
                 <button onClick={handleStep1Continue} disabled={!selectedServiceId || !selectedVehiclePlate} className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-orange-600 transition disabled:opacity-50">
                    Continue
                </button>
            </div>
        </>
    );
    
    const renderStep2 = () => {
        const today = new Date();
        today.setHours(0,0,0,0);
        const year = selectedDate.getFullYear();
        const month = selectedDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        return (
             <>
                <div className="p-6 space-y-6 flex-grow overflow-y-auto">
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Choose a Date</h3>
                        <div className="bg-dark-gray p-4 rounded-lg">
                            <div className="flex justify-between items-center mb-4">
                               <button onClick={() => setSelectedDate(new Date(year, month - 1))} className="text-primary">&lt;</button>
                                <p className="font-bold">{selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
                                <button onClick={() => setSelectedDate(new Date(year, month + 1))} className="text-primary">&gt;</button>
                            </div>
                            <div className="grid grid-cols-7 text-center text-xs text-light-gray mb-2">{['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <div key={d}>{d}</div>)}</div>
                            <div className="grid grid-cols-7 text-center text-sm">
                                {Array.from({ length: firstDay }).map((_, i) => <div key={`b-${i}`}></div>)}
                                {Array.from({ length: daysInMonth }).map((_, dayIndex) => {
                                    const day = dayIndex + 1;
                                    const date = new Date(year, month, day);
                                    date.setHours(0,0,0,0);
                                    const isSelected = day === selectedDate.getDate() && month === selectedDate.getMonth() && year === selectedDate.getFullYear();
                                    const isPast = date < today;
                                    return (
                                        <div key={day} className="p-1">
                                            <button 
                                                onClick={() => !isPast && setSelectedDate(date)} 
                                                disabled={isPast} 
                                                className={`w-8 h-8 rounded-full transition-colors ${
                                                    isPast 
                                                        ? 'text-gray-600 cursor-not-allowed' 
                                                        : isSelected 
                                                            ? 'bg-primary text-white ring-2 ring-primary ring-offset-2 ring-offset-dark-gray' 
                                                            : 'hover:bg-primary/20'
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
                <div className="p-4 bg-[#1D1D1D] border-t border-dark-gray">
                     {error && <p className="text-red-400 text-center text-sm mb-2">{error}</p>}
                    <button onClick={handleStep2Continue} disabled={!selectedDate} className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-orange-600 transition disabled:opacity-50">
                        See Available Mechanics
                    </button>
                </div>
            </>
        )
    };

    const renderStep3 = () => {
        const isToday = selectedDate.toDateString() === new Date().toDateString();
        const selectedService = services.find(s => s.id === selectedServiceId);

        return (
             <div className="p-4 space-y-4 flex-grow flex flex-col overflow-hidden">
                {selectedService && (
                    <div className="text-center text-sm text-light-gray -mt-2 mb-2 flex-shrink-0 bg-field p-2 rounded-md border border-dark-gray">
                        <p>Showing mechanics specializing in <strong>{selectedService.name}</strong>.</p>
                    </div>
                )}
                
                <div className="bg-field p-3 rounded-lg border border-dark-gray flex-shrink-0">
                    <h4 className="text-sm font-semibold text-light-gray mb-3">Refine Your Search</h4>
                    <div className="space-y-3">
                        {isToday && (
                            <div className="flex items-center gap-2 bg-dark-gray p-2 rounded-lg">
                                <input
                                    type="checkbox"
                                    id="available-now"
                                    checked={availableNowFilter}
                                    onChange={(e) => setAvailableNowFilter(e.target.checked)}
                                    className="w-5 h-5 text-primary bg-secondary rounded border-gray-500 focus:ring-primary"
                                />
                                <label htmlFor="available-now" className="text-white font-semibold">Available Now</label>
                            </div>
                        )}
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-light-gray" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </span>
                            <input
                                type="text"
                                placeholder="Search by name..."
                                value={mechanicSearch}
                                onChange={(e) => setMechanicSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-dark-gray border border-secondary rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <select
                                value={specializationFilter}
                                onChange={e => setSpecializationFilter(e.target.value)}
                                className="w-full px-3 py-2 bg-dark-gray border border-secondary rounded-lg text-white text-sm"
                            >
                                {allSpecializations.map(spec => (
                                    <option key={spec} value={spec} className="capitalize">
                                        {spec === 'all' ? 'Any Specialization' : spec}
                                    </option>
                                ))}
                            </select>
                             <select
                                value={sortOption}
                                onChange={e => setSortOption(e.target.value as any)}
                                className="w-full px-3 py-2 bg-dark-gray border border-secondary rounded-lg text-white text-sm"
                            >
                                <option value="rating">Sort by: Rating (High to Low)</option>
                                <option value="jobs">Sort by: Jobs Completed</option>
                                <option value="name">Sort by: Name (A-Z)</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto space-y-4 pt-2">
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

    const renderStep4 = () => {
        const selectedService = services.find(s => s.id === selectedServiceId);
        const selectedVehicle = user?.vehicles.find(v => v.plateNumber === selectedVehiclePlate);
        
        if (!selectedService || !selectedVehicle || !selectedMechanic) {
            return <div className="p-8 text-center">Something went wrong. Please start over.</div>
        }

        return (
            <>
                <div className="p-6 space-y-4 flex-grow overflow-y-auto">
                    <div className="bg-dark-gray p-4 rounded-lg">
                        <h3 className="font-bold text-primary mb-2">Service Details</h3>
                        <p className="font-semibold text-white">{selectedService.name}</p>
                        <p className="text-sm text-light-gray">{selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model} ({selectedVehicle.plateNumber})</p>
                    </div>
                     <div className="bg-dark-gray p-4 rounded-lg">
                        <h3 className="font-bold text-primary mb-2">Schedule</h3>
                        <p className="font-semibold text-white">{selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                        <p className="text-sm text-light-gray">{selectedTime}</p>
                    </div>
                     <div className="bg-dark-gray p-4 rounded-lg">
                        <h3 className="font-bold text-primary mb-2">Your Mechanic</h3>
                        <p className="font-semibold text-white">{selectedMechanic.name}</p>
                        <p className="text-sm text-yellow-400">⭐ {selectedMechanic.rating.toFixed(1)} ({selectedMechanic.reviews} jobs)</p>
                    </div>
                    <div className="bg-dark-gray p-4 rounded-lg">
                        <h3 className="font-bold text-primary mb-2">Additional Notes</h3>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="e.g., The doorbell is broken, please call upon arrival."
                            rows={3}
                            className="w-full p-2 bg-field border border-secondary rounded-md text-sm placeholder-light-gray focus:ring-primary focus:border-primary"
                        />
                    </div>
                </div>
                <div className="p-4 bg-[#1D1D1D] border-t border-dark-gray">
                     {error && <p className="text-red-400 text-center text-sm mb-2">{error}</p>}
                    <button onClick={handleBooking} disabled={isBooking} className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-orange-600 transition flex items-center justify-center disabled:opacity-50">
                        {isBooking ? <Spinner size="sm" /> : 'Confirm & Book Now'}
                    </button>
                </div>
            </>
        );
    };


    return (
        <div className="flex flex-col h-full bg-secondary">
            <div className="relative flex items-center justify-center p-4 bg-[#1D1D1D] border-b border-dark-gray flex-shrink-0">
                <button onClick={handleBack} className="absolute left-4 text-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <h1 className="text-xl font-bold text-white">{getHeaderTitle()}</h1>
            </div>
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            {step === 4 && renderStep4()}
        </div>
    );
};

export default BookingScreen;