import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDatabase } from '../context/DatabaseContext';
import { getAIServiceSuggestions } from '../services/geminiService';
import Spinner from '../components/Spinner';
import { Booking, BookingStatus, Mechanic } from '../types';
import HomeLiveMap from '../components/HomeLiveMap';
import NotificationBell from '../components/NotificationBell';
import TrackMechanicModal from '../components/TrackMechanicModal';
import {
    Car,
    ChevronRight,
    Share2,
    Sparkles,
    ChevronDown,
    Check,
    MapPin,
    Calendar,
    Clock,
    X,
    Image as ImageIcon,
    Filter,
    Star,
    Plus
} from 'lucide-react';

declare const L: any;

interface AISuggestion {
    serviceName: string;
    reason: string;
}

const getDistanceInKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const JobProgressModal: React.FC<{
    booking: Booking;
    onClose: () => void;
    customerLocation: { lat: number, lng: number } | null;
}> = ({ booking, onClose, customerLocation }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

    const timelineSteps: BookingStatus[] = ['Booking Confirmed', 'Mechanic Assigned', 'En Route', 'In Progress', 'Completed'];
    const currentStatusIndex = useMemo(() => {
        const historyStatuses = booking.statusHistory?.map(h => h.status) || [];
        const allStatuses = [...historyStatuses, booking.status];

        let highestIndex = -1;
        allStatuses.forEach(status => {
            const indexInTimeline = timelineSteps.indexOf(status as BookingStatus);
            if (indexInTimeline > highestIndex) {
                highestIndex = indexInTimeline;
            }
        });
        return highestIndex;
    }, [booking.status, booking.statusHistory]);

    useEffect(() => {
        if (!mapRef.current || !customerLocation || mapInstanceRef.current || typeof L === 'undefined') return;

        mapInstanceRef.current = L.map(mapRef.current).setView([customerLocation.lat, customerLocation.lng], 15);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: '&copy; CARTO' }).addTo(mapInstanceRef.current);
        const workIcon = L.divIcon({
            html: `<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-primary" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.532 1.532 0 012.287-.947c1.372.836 2.942-.734-2.106-2.106a1.532 1.532 0 01.947-2.287c1.561-.379-1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" /></svg>`,
            className: 'bg-transparent border-0', iconSize: [32, 32], iconAnchor: [16, 16]
        });
        L.marker([customerLocation.lat, customerLocation.lng], { icon: workIcon }).addTo(mapInstanceRef.current).bindPopup("Service Location");
        setTimeout(() => mapInstanceRef.current?.invalidateSize(), 100);
        return () => { mapInstanceRef.current?.remove(); mapInstanceRef.current = null; };
    }, [customerLocation]);

    const ImagePlaceholder = () => (
        <div className="w-full h-28 bg-field/50 border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center text-center p-2">
            <ImageIcon className="h-6 w-6 text-gray-500" />
            <p className="text-xs text-gray-500 mt-1">No Photo Uploaded</p>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xl flex flex-col z-50 p-0 sm:p-4 animate-fade-in" role="dialog" aria-modal="true">
            {fullScreenImage && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in" onClick={() => setFullScreenImage(null)}>
                    <img src={fullScreenImage} alt="Full screen view" className="max-w-full max-h-full object-contain rounded-2xl shadow-glass" />
                </div>
            )}
            <div className="relative glass-modal rounded-t-2xl sm:rounded-2xl flex flex-col h-full max-w-2xl mx-auto w-full shadow-glass overflow-hidden animate-slide-up">
                <header className="flex-shrink-0 p-4 border-b border-glass-light flex items-center justify-center relative">
                    <div className="absolute inset-0 gradient-radial opacity-20 pointer-events-none" />
                    <h2 className="text-xl font-bold gradient-text relative z-10">Job Progress</h2>
                    <button onClick={onClose} className="absolute right-4 z-10 btn-glass p-2 rounded-xl hover:scale-110 transition-all"><X className="w-6 h-6" /></button>
                </header>
                <main className="flex-grow overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
                    <div className="glass-card p-4 flex items-center gap-4 glass-hover">
                        <img src={booking.mechanic?.imageUrl} alt={booking.mechanic?.name} className="w-16 h-16 rounded-full object-cover border-2 border-primary shadow-glow" />
                        <div>
                            <p className="font-bold text-lg gradient-text">{booking.mechanic?.name}</p>
                            <p className="font-semibold text-primary drop-shadow-glow">{booking.service.name}</p>
                            <p className="text-sm text-light-gray">{booking.vehicle.make} {booking.vehicle.model}</p>
                        </div>
                    </div>

                    <div className="glass-light p-4 rounded-xl border border-white/10">
                        <h3 className="font-semibold text-white mb-4">Timeline</h3>
                        <div className="relative pl-5">
                            {timelineSteps.map((step, index) => {
                                const isCompleted = index <= currentStatusIndex;
                                const historyEntry = booking.statusHistory?.find(h => h.status === step);
                                return (
                                    <div key={step} className={`relative pb-6 ${index === timelineSteps.length - 1 ? 'pb-0' : ''}`}>
                                        {index < timelineSteps.length - 1 && <div className={`absolute top-2.5 left-[3px] w-0.5 h-full ${isCompleted && index < currentStatusIndex ? 'bg-primary' : 'bg-white/10'}`}></div>}
                                        <div className="flex items-start">
                                            <div className={`-left-2 absolute w-2 h-2 rounded-full mt-[7px] transition-all duration-500 ${isCompleted ? 'bg-primary ring-4 ring-primary/20' : 'bg-white/20'}`}></div>
                                            <div className="ml-4">
                                                <p className={`font-semibold text-sm transition-colors ${isCompleted ? 'text-white' : 'text-gray-500'}`}>{step}</p>
                                                <p className="text-xs text-gray-400">{historyEntry ? new Date(historyEntry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending'}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="bg-field/30 p-4 rounded-xl border border-white/5">
                        <h3 className="font-semibold text-white mb-3">Job Documentation</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <h4 className="text-sm font-medium text-light-gray mb-2">Before Service</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    {(booking.beforeImages && booking.beforeImages.length > 0) ? booking.beforeImages.map((img, i) => <img key={i} src={img} onClick={() => setFullScreenImage(img)} className="w-full h-28 object-cover rounded-xl cursor-pointer hover:opacity-90 transition" alt={`Before ${i + 1}`} />) : <><ImagePlaceholder /><ImagePlaceholder /></>}
                                </div>
                            </div>
                            <div>
                                <h4 className="text-sm font-medium text-light-gray mb-2">After Service</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    {(booking.afterImages && booking.afterImages.length > 0) ? booking.afterImages.map((img, i) => <img key={i} src={img} onClick={() => setFullScreenImage(img)} className="w-full h-28 object-cover rounded-xl cursor-pointer hover:opacity-90 transition" alt={`After ${i + 1}`} />) : <><ImagePlaceholder /><ImagePlaceholder /></>}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-field/30 p-4 rounded-xl border border-white/5">
                        <h3 className="font-semibold text-white mb-2">Mechanic's Notes</h3>
                        <p className="text-sm text-light-gray bg-black/20 p-3 rounded-xl min-h-[50px] border border-white/5">{booking.notes || 'No notes added by mechanic yet.'}</p>
                    </div>

                    <div className="bg-field/30 p-4 rounded-xl border border-white/5">
                        <h3 className="font-semibold text-white mb-2">Service Location</h3>
                        <div ref={mapRef} className="h-40 w-full rounded-xl overflow-hidden shadow-inner" />
                    </div>
                </main>
            </div>
        </div>
    );
};

const HomeScreen: React.FC = () => {
    const { user } = useAuth();
    const { db, updateBookingStatus } = useDatabase();
    const navigate = useNavigate();

    const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
    const [isLoadingAI, setIsLoadingAI] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    const [trackingBooking, setTrackingBooking] = useState<Booking | null>(null);
    const [progressModalBooking, setProgressModalBooking] = useState<Booking | null>(null);
    const [currentBanner, setCurrentBanner] = useState(0);
    const [isBannerPaused, setIsBannerPaused] = useState(false);
    const bannerIntervalRef = useRef<any>(null);

    // New filter states
    const [specFilterOpen, setSpecFilterOpen] = useState(false);
    const [selectedSpecs, setSelectedSpecs] = useState<string[]>([]);
    const [ratingFilter, setRatingFilter] = useState(0);
    const [availableNowFilter, setAvailableNowFilter] = useState(false);
    const [selectedMechanicId, setSelectedMechanicId] = useState<string | null>(null);

    const customerLocation = (user && user.lat && user.lng) ? { lat: user.lat, lng: user.lng } : null;

    const upcomingAppointment = db?.bookings
        .filter(b => b.customerName === user?.name && (['Upcoming', 'Booking Confirmed', 'Mechanic Assigned', 'En Route', 'In Progress'].includes(b.status)))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

    const allSpecializations = useMemo(() => {
        if (!db) return [];
        const specSet = new Set<string>();
        db.mechanics.forEach(mechanic => {
            if (mechanic.status === 'Active') {
                mechanic.specializations.forEach(spec => specSet.add(spec));
            }
        });
        return Array.from(specSet).sort();
    }, [db]);

    const handleSpecToggle = (spec: string) => {
        setSelectedSpecs(prev =>
            prev.includes(spec) ? prev.filter(s => s !== spec) : [...prev, spec]
        );
    };

    const handleMapClickToBook = useCallback((latlng: { lat: number, lng: number }) => {
        if (window.confirm(`Book a diagnostic service at this location? A nearby mechanic will be assigned.`)) {
            // serviceId for Diagnostics is '3'
            navigate(`/booking/3`, { state: { serviceLocation: latlng } });
        }
    }, [navigate]);

    const handleBookMechanic = useCallback((mechanic: Mechanic) => {
        if (window.confirm(`Book a diagnostic service with ${mechanic.name}? This will use their current location as the service address.`)) {
            // Service ID '3' is for Diagnostics
            navigate('/booking/3', {
                state: {
                    serviceLocation: { lat: mechanic.lat, lng: mechanic.lng },
                    preselectedMechanicId: mechanic.id
                }
            });
        }
    }, [navigate]);

    const mechanicsWithAvailability = useMemo(() => {
        if (!db) return [];
        const { bookings, mechanics } = db;
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const todayDayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as keyof Required<Mechanic>['availability'];

        const busyMechanicIds = new Set(
            bookings
                .filter(booking => (booking.status === 'Upcoming' || booking.status === 'En Route' || booking.status === 'In Progress') && booking.mechanic && booking.date === todayStr)
                .map(booking => booking.mechanic!.id)
        );

        let filteredMechanics = mechanics
            .filter(mechanic => {
                const isActive = mechanic.status === 'Active' && mechanic.isOnline;
                if (!isActive) return false;

                const isAvailableForWork = (mechanic.availability?.[todayDayOfWeek]?.isAvailable ?? false) && !busyMechanicIds.has(mechanic.id);
                if (availableNowFilter && !isAvailableForWork) {
                    return false;
                }

                const hasSelectedSpec = selectedSpecs.length === 0 || selectedSpecs.some(spec => mechanic.specializations.includes(spec));
                const meetsRating = mechanic.rating >= ratingFilter;
                return hasSelectedSpec && meetsRating;
            });

        // Sort by proximity if customer location is available
        if (customerLocation) {
            filteredMechanics.sort((a, b) => {
                const distA = getDistanceInKm(customerLocation.lat, customerLocation.lng, a.lat, a.lng);
                const distB = getDistanceInKm(customerLocation.lat, customerLocation.lng, b.lat, b.lng);
                return distA - distB;
            });
        }

        return filteredMechanics.map(mechanic => ({ ...mechanic, isAvailable: (mechanic.availability?.[todayDayOfWeek]?.isAvailable ?? false) && !busyMechanicIds.has(mechanic.id) }));
    }, [db, selectedSpecs, ratingFilter, availableNowFilter, customerLocation]);


    useEffect(() => {
        if (!db || db.banners.length === 0 || isBannerPaused) {
            if (bannerIntervalRef.current) clearTimeout(bannerIntervalRef.current);
            return;
        }

        bannerIntervalRef.current = setTimeout(() => {
            setCurrentBanner((prevBanner) => (prevBanner + 1) % db.banners.length);
        }, 5000);

        return () => {
            if (bannerIntervalRef.current) clearTimeout(bannerIntervalRef.current);
        };
    }, [currentBanner, db, isBannerPaused]);

    const handleNextBanner = () => {
        if (!db) return;
        setCurrentBanner((prev) => (prev + 1) % db.banners.length);
    };

    const handlePrevBanner = () => {
        if (!db) return;
        setCurrentBanner((prev) => (prev - 1 + db.banners.length) % db.banners.length);
    };

    const handleGetSuggestions = async () => {
        if (!user || user.vehicles.length === 0) {
            setAiError("Please add a vehicle to your profile to get AI suggestions.");
            return;
        }
        setIsLoadingAI(true);
        setAiSuggestions([]);
        setAiError(null);
        try {
            const primaryVehicle = user.vehicles.find(v => v.isPrimary) || user.vehicles[0];
            const serviceHistory = db?.bookings
                .filter(b => b.customerName === user.name && b.status === 'Completed' && b.vehicle.plateNumber === primaryVehicle.plateNumber)
                .map(b => b.service.name) || [];
            const suggestions = await getAIServiceSuggestions(primaryVehicle, serviceHistory);
            setAiSuggestions(suggestions);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred. Please check your network connection and try again.";
            setAiError(errorMessage);
        } finally {
            setIsLoadingAI(false);
        }
    };

    if (!db) {
        return <div className="flex items-center justify-center h-full"><Spinner size="lg" /></div>;
    }

    const handleShare = async () => {
        if (!upcomingAppointment) return;
        const shareData = {
            title: 'RidersBUD Booking Update',
            text: `Here are the details for my upcoming RidersBUD appointment: ${upcomingAppointment.service.name} with ${upcomingAppointment.mechanic?.name} on ${new Date(upcomingAppointment.date.replace(/-/g, '/')).toLocaleDateString()}.`,
            url: 'https://ridersbud.app', // Use a valid placeholder URL
        };
        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(`${shareData.text} View status here: ${shareData.url}`);
                alert('Booking details copied to clipboard!');
            }
        } catch (err) {
            console.error('Error sharing:', err);
            // Don't alert if the user cancels the share dialog
            if (err instanceof Error && err.name !== 'AbortError') {
                alert('Could not share booking details.');
            }
        }
    };

    const handleAppointmentAction = () => {
        if (!upcomingAppointment) return;
        if (upcomingAppointment.status === 'En Route') {
            setTrackingBooking(upcomingAppointment);
        } else if (upcomingAppointment.status === 'In Progress') {
            setProgressModalBooking(upcomingAppointment);
        } else {
            navigate('/booking-history');
        }
    };

    const handleLearnMore = (serviceName: string) => {
        const service = db?.services.find(s => s.name.trim().toLowerCase() === serviceName.trim().toLowerCase());
        if (service) {
            setAiSuggestions([]);
            navigate(`/service/${service.id}`);
        } else {
            alert(`Could not find the service "${serviceName}". Please browse our services list.`);
            navigate('/services');
        }
    };

    const handleBookNow = (serviceName: string) => {
        const service = db?.services.find(s => s.name.trim().toLowerCase() === serviceName.trim().toLowerCase());
        if (service) {
            setAiSuggestions([]);
            navigate(`/booking/${service.id}`);
        } else {
            alert(`Could not find the service "${serviceName}". Please browse our services list.`);
            navigate('/services');
        }
    };

    const getStatusWidth = () => {
        if (!upcomingAppointment) return '0%';
        const statusOrder: BookingStatus[] = ['Booking Confirmed', 'Mechanic Assigned', 'En Route', 'In Progress'];
        const currentIndex = statusOrder.indexOf(upcomingAppointment.status);
        if (currentIndex === -1) return '25%'; // Default for 'Upcoming' or other initial states
        return `${((currentIndex + 2) / 5) * 100}%`;
    };

    const getAppointmentActionText = () => {
        if (!upcomingAppointment) return '';
        switch (upcomingAppointment.status) {
            case 'En Route': return 'Track Mechanic';
            case 'In Progress': return 'View Progress';
            default: return 'View Booking';
        }
    };

    return (
        <div className="bg-secondary min-h-full pb-48 font-sans relative overflow-hidden">
            {/* Background Blobs */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] animate-pulse-slow"></div>
                <div className="absolute bottom-[10%] right-[-10%] w-[400px] h-[400px] bg-orange-600/10 rounded-full blur-[100px] animate-pulse-slow delay-700"></div>
            </div>

            <div className="relative z-10">
                <div className="flex justify-between items-start p-6 animate-slideInUp">
                    <div>
                        <p className="text-light-gray text-lg">Welcome back,</p>
                        <h1 className="text-4xl font-bold text-white tracking-tight">{user?.name.split(' ')[0]}!</h1>
                    </div>
                    <NotificationBell />
                </div>

                {!user?.vehicles || user.vehicles.length === 0 ? (
                    <div className="px-6 mb-8 animate-slide-up delay-100">
                        <div className="glass-card border-primary-glow p-6 flex flex-col items-center text-center shadow-glass glass-hover group">
                            <div className="w-16 h-16 gradient-radial rounded-full flex items-center justify-center mb-4 animate-glow-pulse">
                                <Plus className="h-8 w-8 text-primary drop-shadow-glow" />
                            </div>
                            <h3 className="font-bold gradient-text text-xl">Add a Vehicle</h3>
                            <p className="text-sm text-light-gray mt-2 mb-6 max-w-xs">Add a vehicle to your garage to get personalized AI suggestions and faster bookings.</p>
                            <button onClick={() => navigate('/my-garage')} className="gradient-primary text-white font-bold py-3 px-8 rounded-xl shadow-glow hover:shadow-glow-lg hover:scale-105 transition-all duration-300">
                                Go to My Garage
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="px-6 mb-8 animate-slide-up delay-100">
                        <div className="glass-card glass-hover cursor-pointer group" onClick={() => navigate('/my-garage')}>
                            <div className="flex items-center justify-between p-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 gradient-radial rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                        <Car className="h-7 w-7 text-primary drop-shadow-glow" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-white text-lg group-hover:text-primary transition-colors">{(user.vehicles.find(v => v.isPrimary) || user.vehicles[0]).year} {(user.vehicles.find(v => v.isPrimary) || user.vehicles[0]).make} {(user.vehicles.find(v => v.isPrimary) || user.vehicles[0]).model}</p>
                                        <p className="text-sm text-light-gray font-mono opacity-80">{(user.vehicles.find(v => v.isPrimary) || user.vehicles[0]).plateNumber}</p>
                                    </div>
                                </div>
                                <div className="w-8 h-8 rounded-full btn-glass flex items-center justify-center">
                                    <ChevronRight className="h-5 w-5 text-light-gray group-hover:text-primary transition-colors" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {upcomingAppointment && (
                    <div className="px-6 mb-8 animate-slideInUp delay-200">
                        <h2 className="text-xl font-semibold mb-3 text-white flex items-center gap-2">
                            <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                            Upcoming Appointment
                        </h2>
                        <div className="glass border border-white/10 p-5 rounded-2xl shadow-xl shadow-primary/5 relative overflow-hidden group hover:border-white/20 transition-all duration-300">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16"></div>

                            <div
                                className="flex items-center gap-4 cursor-pointer group relative z-10"
                                onClick={() => upcomingAppointment?.mechanic && navigate(`/mechanic-profile/${upcomingAppointment.mechanic.id}`)}
                                onKeyDown={(e) => {
                                    if ((e.key === 'Enter' || e.key === ' ') && upcomingAppointment?.mechanic) {
                                        e.preventDefault();
                                        navigate(`/mechanic-profile/${upcomingAppointment.mechanic.id}`);
                                    }
                                }}
                                role="button"
                                tabIndex={0}
                                aria-label={`View profile for ${upcomingAppointment.mechanic?.name}`}
                            >
                                <div className="w-14 h-14 bg-gradient-to-br from-primary to-orange-600 rounded-full flex items-center justify-center text-xl font-bold text-white flex-shrink-0 shadow-lg group-hover:scale-105 transition-transform duration-300 border-2 border-white/10">
                                    {upcomingAppointment.mechanic?.name.split(' ').map(n => n[0]).join('')}
                                </div>
                                <div>
                                    <p className="font-bold text-white text-lg group-hover:text-primary transition-colors">{upcomingAppointment.mechanic?.name}</p>
                                    <p className="text-sm text-light-gray">{upcomingAppointment.service.name}</p>
                                    <p className="text-xs font-medium text-white/70 mt-0.5 bg-white/10 px-2 py-0.5 rounded-full inline-block">{`${upcomingAppointment.vehicle.make} ${upcomingAppointment.vehicle.model}`}</p>
                                </div>
                            </div>

                            <div className="mt-5 relative z-10">
                                <div className="flex justify-between items-center text-sm mb-2">
                                    <span className="font-medium text-light-gray">Status</span>
                                    <span className="font-bold text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">{upcomingAppointment.status}</span>
                                </div>
                                {upcomingAppointment.status === 'En Route' && upcomingAppointment.eta != null && (
                                    <div className="flex justify-between items-center text-sm mb-3">
                                        <span className="font-medium text-light-gray">ETA</span>
                                        <span className="font-bold text-yellow-400 animate-pulse flex items-center gap-1">
                                            <Clock className="h-4 w-4" />
                                            ~{upcomingAppointment.eta} min
                                        </span>
                                    </div>
                                )}
                                <div className="w-full bg-black/40 rounded-full h-2 overflow-hidden"><div className="bg-gradient-to-r from-primary to-orange-500 h-2 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(254,120,3,0.5)]" style={{ width: getStatusWidth() }}></div></div>
                            </div>

                            <div className="mt-5 flex gap-3 relative z-10">
                                <button onClick={handleAppointmentAction} className="flex-1 bg-gradient-to-r from-primary to-orange-600 text-white font-bold py-3 rounded-xl hover:shadow-lg hover:shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300">
                                    {getAppointmentActionText()}
                                </button>
                                <button onClick={handleShare} className="w-14 flex-shrink-0 bg-white/10 text-white p-3 rounded-xl hover:bg-white/20 transition-colors border border-white/5" aria-label="Share booking details">
                                    <Share2 className="h-6 w-6" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div
                    className="relative w-full overflow-hidden mb-8 group animate-slideInUp delay-300"
                    onMouseEnter={() => setIsBannerPaused(true)}
                    onMouseLeave={() => setIsBannerPaused(false)}
                >
                    <div className="flex transition-transform duration-700 ease-in-out" style={{ transform: `translateX(-${currentBanner * 100}%)` }}>
                        {db.banners.map((banner) => (
                            <div key={banner.id} className="w-full flex-shrink-0 px-6" onClick={() => navigate(banner.link)}>
                                <div className="relative rounded-2xl overflow-hidden shadow-lg group-hover:shadow-2xl transition-shadow duration-300 h-40">
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10"></div>
                                    <img src={banner.imageUrl} alt="Ad Banner" className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" />
                                    <div className="absolute bottom-4 left-4 z-20">
                                        <span className="bg-primary text-white text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wider mb-1 inline-block">Featured</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2 z-20">
                        {db.banners.map((_, index) => (
                            <button key={index} onClick={() => setCurrentBanner(index)} className={`w-2 h-2 rounded-full transition-all duration-300 ${currentBanner === index ? 'bg-primary w-6' : 'bg-white/50 hover:bg-white'}`} aria-label={`Go to banner ${index + 1}`} />
                        ))}
                    </div>
                </div>

                <div className="px-6 mb-8 animate-slideInUp delay-400">
                    <h2 className="text-xl font-semibold mb-3 text-white flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                        AI Service Suggestions
                    </h2>
                    <div className="glass-card shadow-glass">
                        {isLoadingAI ? <div className="flex justify-center items-center py-8"><Spinner size="md" /></div>
                            : aiError ? (
                                <div className="p-4 glass-card border-red-500/50 text-red-400 text-sm text-center shadow-[0_0_20px_rgba(239,68,68,0.3)]">
                                    <p className="font-semibold">Oops! Something went wrong.</p>
                                    <p className="mt-1 opacity-80">{aiError}</p>
                                    <button onClick={handleGetSuggestions} className="mt-3 btn-glass text-red-400 font-semibold py-1.5 px-4 rounded-lg text-xs">Try Again</button>
                                </div>
                            ) : aiSuggestions.length > 0 ? (
                                <div className="space-y-4">
                                    {aiSuggestions.map((suggestion, index) => (
                                        <div key={index} className="glass-card glass-hover group animate-scale-in" style={{ animationDelay: `${index * 100}ms` }}>
                                            <div className="p-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Sparkles className="h-5 w-5 text-primary drop-shadow-glow" />
                                                    <h4 className="font-bold gradient-text">{suggestion.serviceName}</h4>
                                                </div>
                                                <p className="text-sm text-light-gray mb-4 leading-relaxed">{suggestion.reason}</p>
                                                <div className="flex gap-3 w-full">
                                                    <button onClick={() => handleLearnMore(suggestion.serviceName)} className="flex-1 btn-glass text-white font-semibold py-2 px-4 rounded-lg text-sm">Learn More</button>
                                                    <button onClick={() => handleBookNow(suggestion.serviceName)} className="flex-1 gradient-primary text-white font-semibold py-2 px-4 rounded-lg shadow-glow hover:shadow-glow-lg transition-all text-sm">Book Now</button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-6">
                                    <div className="w-12 h-12 gradient-radial rounded-full flex items-center justify-center mx-auto mb-3 animate-glow-pulse">
                                        <Sparkles className="h-6 w-6 text-primary drop-shadow-glow" />
                                    </div>
                                    <p className="text-light-gray mb-5 max-w-xs mx-auto">Get personalized service recommendations for your vehicle powered by AI.</p>
                                    <button onClick={handleGetSuggestions} className="btn-glass text-white font-bold py-2.5 px-6 rounded-xl">Get Suggestions</button>
                                </div>
                            )}
                    </div>
                </div>

                <div className="px-6 animate-slideInUp delay-500">
                    <h2 className="text-xl font-semibold mb-3 text-white flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                        Nearby Mechanics
                    </h2>
                    <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="relative z-20">
                            <button onClick={() => setSpecFilterOpen(!specFilterOpen)} className="w-full px-4 py-3 glass border border-white/10 rounded-xl text-white text-left flex justify-between items-center hover:border-primary/30 hover:shadow-glow-sm transition-all duration-300">
                                <span className="truncate text-sm font-medium">{selectedSpecs.length > 0 ? `${selectedSpecs.length} spec${selectedSpecs.length > 1 ? 's' : ''} selected` : 'All Specializations'}</span>
                                <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${specFilterOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {specFilterOpen && (
                                <div className="absolute top-full left-0 w-full mt-2 glass-dark border border-white/10 rounded-xl shadow-2xl shadow-primary/10 max-h-60 overflow-y-auto z-30 animate-scaleUp scrollbar-thin">
                                    {allSpecializations.map(spec => (
                                        <label key={spec} className="flex items-center gap-3 p-3 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-0 transition-colors">
                                            <div className="relative flex items-center">
                                                <input type="checkbox" checked={selectedSpecs.includes(spec)} onChange={() => handleSpecToggle(spec)} className="peer h-5 w-5 rounded border-gray-500 bg-transparent text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer appearance-none border-2 checked:bg-primary checked:border-primary transition-all" />
                                                <Check className="absolute w-3.5 h-3.5 pointer-events-none hidden peer-checked:block text-white left-1 top-1" />
                                            </div>
                                            <span className="text-sm text-light-gray">{spec}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="relative">
                            <select
                                value={ratingFilter}
                                onChange={(e) => setRatingFilter(Number(e.target.value))}
                                className="w-full px-4 py-3 glass border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/30 appearance-none cursor-pointer text-sm font-medium transition-all duration-300"
                            >
                                <option value={0}>All Ratings</option>
                                <option value={4}>4 ★ & Up</option>
                                <option value={3}>3 ★ & Up</option>
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>

                        <div className="flex items-center glass rounded-xl px-4 py-3 border border-white/10 col-span-1 sm:col-span-2 cursor-pointer hover:border-primary/30 hover:shadow-glow-sm transition-all duration-300" onClick={() => setAvailableNowFilter(!availableNowFilter)}>
                            <div className="relative flex items-center">
                                <input
                                    id="availability-filter"
                                    type="checkbox"
                                    checked={availableNowFilter}
                                    onChange={e => setAvailableNowFilter(e.target.checked)}
                                    className="peer h-5 w-5 rounded border-gray-500 bg-transparent text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer appearance-none border-2 checked:bg-primary checked:border-primary transition-all"
                                />
                                <Check className="absolute w-3.5 h-3.5 pointer-events-none hidden peer-checked:block text-white left-1 top-1" />
                            </div>
                            <label htmlFor="availability-filter" className="ml-3 text-sm font-medium text-white select-none cursor-pointer flex-grow">Available Today</label>
                        </div>
                    </div>

                    <div className="h-96 w-full rounded-2xl shadow-2xl overflow-hidden relative z-0 border border-white/10">
                        <HomeLiveMap
                            mechanics={mechanicsWithAvailability}
                            customerLocation={customerLocation}
                            selectedMechanicId={selectedMechanicId}
                            onMarkerClick={setSelectedMechanicId}
                            onMapClickToBook={handleMapClickToBook}
                            onBookMechanic={handleBookMechanic}
                        />
                    </div>

                    <div className="mt-6">
                        <div className="flex overflow-x-auto scrollbar-hide gap-4 pb-4 -mx-6 px-6 snap-x">
                            {mechanicsWithAvailability.length > 0 ? (
                                mechanicsWithAvailability.map(mechanic => (
                                    <div
                                        key={mechanic.id}
                                        onClick={() => setSelectedMechanicId(mechanic.id === selectedMechanicId ? null : mechanic.id)}
                                        className={`snap-center flex-shrink-0 w-80 glass p-4 rounded-2xl cursor-pointer border-2 transition-all duration-300 shadow-lg group ${selectedMechanicId === mechanic.id ? 'border-primary scale-[1.02] shadow-glow' : 'border-white/10 hover:border-white/20 hover:shadow-glow-sm hover:-translate-y-1'}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="relative">
                                                <img src={mechanic.imageUrl} alt={mechanic.name} className="w-16 h-16 rounded-full object-cover flex-shrink-0 border-2 border-white/10 group-hover:border-primary/50 transition-colors" />
                                                {mechanic.isAvailable && <span className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-dark-gray rounded-full"></span>}
                                            </div>
                                            <div className="flex-grow overflow-hidden">
                                                <p className="font-bold text-white truncate text-lg group-hover:text-primary transition-colors">{mechanic.name}</p>
                                                <div className="flex items-center gap-1">
                                                    <svg className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                                                    <p className="text-sm text-white font-medium">{mechanic.rating.toFixed(1)} <span className="text-gray-500 font-normal">({mechanic.reviews} jobs)</span></p>
                                                </div>
                                                {mechanic.isAvailable ? (
                                                    <p className="text-xs text-green-400 font-medium mt-0.5">Available Today</p>
                                                ) : (
                                                    <p className="text-xs text-gray-500 font-medium mt-0.5">Unavailable Today</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="mt-3 pt-3 border-t border-white/5">
                                            <p className="text-xs text-light-gray truncate">
                                                <span className="font-medium text-white/70">Specializes in:</span> {mechanic.specializations.join(', ')}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="w-full text-center text-light-gray py-8 glass-light border border-dashed border-white/10 rounded-2xl">
                                    <p>No mechanics found matching your filters.</p>
                                    <button onClick={() => { setSelectedSpecs([]); setRatingFilter(0); setAvailableNowFilter(false); }} className="mt-2 text-primary text-sm font-semibold hover:underline">Clear Filters</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {trackingBooking && <TrackMechanicModal booking={trackingBooking} customerLocation={customerLocation} onClose={() => setTrackingBooking(null)} onShare={handleShare} />}
            {progressModalBooking && <JobProgressModal booking={progressModalBooking} customerLocation={customerLocation} onClose={() => setProgressModalBooking(null)} />}
        </div>
    );
};

export default HomeScreen;
