import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDatabase } from '../context/DatabaseContext';
import { getAIServiceSuggestions } from '../services/geminiService';
import Spinner from '../components/Spinner';
import { Booking, BookingStatus, Mechanic } from '../types';
import HomeLiveMap from '../components/HomeLiveMap';
import NotificationBell from '../components/NotificationBell';

declare const L: any;

interface AISuggestion {
    serviceName: string;
    reason: string;
}

const CompletedInvoiceModal: React.FC<{ booking: Booking; onClose: () => void; db: any; }> = ({ booking, onClose, db }) => {
    const navigate = useNavigate();
    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fadeIn" onClick={onClose}>
            <div className="bg-dark-gray rounded-xl p-6 shadow-2xl animate-scaleUp border border-green-500/30 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                <div className="text-center mb-4">
                    <img src={db.settings.appLogoUrl} alt="Logo" className="w-24 mx-auto mb-2" />
                    <h2 className="text-2xl font-bold text-white">Service Complete!</h2>
                    <p className="text-sm text-green-400">Please review your invoice.</p>
                </div>
                <div className="space-y-3 bg-field p-4 rounded-lg">
                    <div className="flex justify-between items-center text-sm border-b border-dark-gray pb-2">
                        <span className="text-light-gray">Service:</span>
                        <span className="font-semibold text-white">{booking.service.name}</span>
                    </div>
                     <div className="flex justify-between items-center text-sm">
                        <span className="text-light-gray">Mechanic:</span>
                        <span className="font-semibold text-white">{booking.mechanic?.name}</span>
                    </div>
                </div>
                <div className="mt-4 pt-4 border-t border-dark-gray text-right">
                    <p className="text-light-gray">Total Amount Due:</p>
                    <p className="text-4xl font-bold text-primary">₱{booking.service.price.toLocaleString()}</p>
                </div>
                <div className="mt-6 flex flex-col gap-3">
                     <button onClick={() => { onClose(); navigate('/booking-history'); }} className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-orange-600 transition">
                        Proceed to Pay
                    </button>
                    <button onClick={onClose} className="w-full text-sm text-light-gray hover:text-white transition">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};


// Haversine distance formula to calculate distance between two lat/lng points
const getDistanceInKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const TrackMechanicModal: React.FC<{ 
    booking: Booking; 
    onClose: () => void; 
    onShare: () => void;
    customerLocation: { lat: number; lng: number } | null 
}> = ({ booking, onClose, onShare, customerLocation }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const mechanicMarkerRef = useRef<any>(null);
    const [routeInfo, setRouteInfo] = useState({ distance: '...', eta: '...' });
    const mechanic = booking.mechanic;
    const destination = customerLocation;

    useEffect(() => {
        if (!mapRef.current || !mechanic || !destination || mapInstanceRef.current || typeof L === 'undefined') return;

        mapInstanceRef.current = L.map(mapRef.current).setView([mechanic.lat, mechanic.lng], 13);
        
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        }).addTo(mapInstanceRef.current);

        const homeIcon = L.divIcon({
            html: `<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-white" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>`,
            className: '', iconSize: [32, 32], iconAnchor: [16, 32]
        });
        L.marker([destination.lat, destination.lng], { icon: homeIcon }).addTo(mapInstanceRef.current).bindPopup("Your Location");

        const mechanicIcon = L.divIcon({
            html: `<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-primary" viewBox="0 0 24 24" fill="currentColor"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>`,
            className: '', iconSize: [32, 32], iconAnchor: [16, 32]
        });
        mechanicMarkerRef.current = L.marker([mechanic.lat, mechanic.lng], { icon: mechanicIcon }).addTo(mapInstanceRef.current).bindPopup(`<b>${mechanic.name}</b>`);
        
        const bounds = L.latLngBounds([destination, { lat: mechanic.lat, lng: mechanic.lng }]);
        mapInstanceRef.current.fitBounds(bounds.pad(0.25));

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [mechanic, destination]);

    useEffect(() => {
        if (!mechanic || !destination) return;
        const interval = setInterval(() => {
            if (!mechanicMarkerRef.current) return;
            const currentPos = mechanicMarkerRef.current.getLatLng();
            const distKm = getDistanceInKm(currentPos.lat, currentPos.lng, destination.lat, destination.lng);
            
            // Assuming average speed of 40 km/h for ETA calculation
            const etaMins = Math.ceil((distKm / 40) * 60);

             if (distKm < 0.1) { // 100 meters threshold
                clearInterval(interval);
                mechanicMarkerRef.current.setLatLng([destination.lat, destination.lng]);
                setRouteInfo({ distance: '0 km', eta: 'Arrived' });
                return;
            }

            setRouteInfo({
                distance: `${distKm.toFixed(1)} km`,
                eta: `${etaMins} min`
            });

            // Simulate movement
            const newLat = currentPos.lat + (destination.lat - currentPos.lat) * 0.1;
            const newLng = currentPos.lng + (destination.lng - currentPos.lng) * 0.1;

            mechanicMarkerRef.current.setLatLng([newLat, newLng]);
        }, 2000);
        return () => clearInterval(interval);
    }, [mechanic, destination]);

    if (!mechanic) return null;

    if (!destination) {
         return (
             <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex flex-col z-50 p-4 animate-fadeIn" role="dialog" aria-modal="true">
                <header className="flex items-center justify-between pb-4 flex-shrink-0">
                    <h2 className="text-xl font-bold text-white">Track Mechanic</h2>
                    <button onClick={onClose} className="text-white text-3xl">&times;</button>
                </header>
                <div className="flex-grow rounded-lg bg-field flex items-center justify-center text-center p-4">
                    <p className="text-light-gray">Customer location data is not available for tracking.</p>
                </div>
                 <footer className="bg-field mt-4 p-4 rounded-lg flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <img src={mechanic.imageUrl} alt={mechanic.name} className="w-12 h-12 rounded-full object-cover" />
                        <div>
                            <p className="font-bold text-white">{mechanic.name}</p>
                            <p className="text-sm text-yellow-400">⭐ {mechanic.rating} ({mechanic.reviews} jobs)</p>
                        </div>
                    </div>
                </footer>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex flex-col z-50 p-4 animate-fadeIn" role="dialog" aria-modal="true">
            <header className="flex items-center justify-between pb-4 flex-shrink-0">
                <h2 className="text-xl font-bold text-white">Track Mechanic</h2>
                <button onClick={onClose} className="text-white text-3xl">&times;</button>
            </header>
            <div ref={mapRef} className="flex-grow rounded-lg" />
            <footer className="bg-field mt-4 p-4 rounded-lg flex-shrink-0">
                 <div className="flex justify-between items-center text-center mb-3">
                    <div>
                        <p className="text-xs text-light-gray">ETA</p>
                        <p className="text-lg text-primary font-bold">{routeInfo.eta}</p>
                    </div>
                    <div>
                        <p className="text-xs text-light-gray">DISTANCE</p>
                        <p className="text-lg text-white font-bold">{routeInfo.distance}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 mt-3 border-t border-dark-gray pt-3">
                    <img src={mechanic.imageUrl} alt={mechanic.name} className="w-12 h-12 rounded-full object-cover" />
                    <div className="flex-grow">
                        <p className="font-bold text-white">{mechanic.name}</p>
                        <p className="text-sm text-yellow-400">⭐ {mechanic.rating} ({mechanic.reviews} jobs)</p>
                    </div>
                     <button onClick={onShare} className="bg-secondary text-white p-3 rounded-full hover:bg-gray-600 transition" aria-label="Share tracking link">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.368a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                        </svg>
                    </button>
                </div>
            </footer>
        </div>
    );
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
        <div className="w-full h-28 bg-field border-2 border-dashed border-dark-gray rounded-md flex flex-col items-center justify-center text-center p-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <p className="text-xs text-gray-500 mt-1">No Photo Uploaded</p>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-secondary/90 backdrop-blur-sm flex flex-col z-50 p-0 sm:p-4 animate-slideInUp" role="dialog" aria-modal="true">
            {fullScreenImage && (
                <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 animate-fadeIn" onClick={() => setFullScreenImage(null)}>
                    <img src={fullScreenImage} alt="Full screen view" className="max-w-full max-h-full object-contain rounded-lg" />
                </div>
            )}
            <div className="relative bg-secondary rounded-t-2xl sm:rounded-2xl flex flex-col h-full max-w-2xl mx-auto w-full">
                <header className="flex-shrink-0 p-4 border-b border-dark-gray flex items-center justify-center">
                    <h2 className="text-xl font-bold text-white">Job Progress</h2>
                    <button onClick={onClose} className="absolute right-4 text-white text-3xl">&times;</button>
                </header>
                <main className="flex-grow overflow-y-auto p-4 space-y-4">
                    <div className="bg-dark-gray p-4 rounded-lg flex items-center gap-4">
                        <img src={booking.mechanic?.imageUrl} alt={booking.mechanic?.name} className="w-16 h-16 rounded-full object-cover border-2 border-primary" />
                        <div>
                            <p className="font-bold text-lg text-white">{booking.mechanic?.name}</p>
                            <p className="font-semibold text-primary">{booking.service.name}</p>
                            <p className="text-sm text-light-gray">{booking.vehicle.make} {booking.vehicle.model}</p>
                        </div>
                    </div>

                    <div className="bg-dark-gray p-4 rounded-lg">
                        <h3 className="font-semibold text-white mb-4">Timeline</h3>
                        <div className="relative pl-5">
                            {timelineSteps.map((step, index) => {
                                const isCompleted = index <= currentStatusIndex;
                                const historyEntry = booking.statusHistory?.find(h => h.status === step);
                                return (
                                    <div key={step} className={`relative pb-6 ${index === timelineSteps.length - 1 ? 'pb-0' : ''}`}>
                                        {index < timelineSteps.length - 1 && <div className={`absolute top-2.5 left-[3px] w-0.5 h-full ${isCompleted && index < currentStatusIndex ? 'bg-primary' : 'bg-field'}`}></div>}
                                        <div className="flex items-start">
                                            <div className={`-left-2 absolute w-2 h-2 rounded-full mt-[7px] ${isCompleted ? 'bg-primary ring-4 ring-primary/20' : 'bg-field'}`}></div>
                                            <div className="ml-4">
                                                <p className={`font-semibold text-sm ${isCompleted ? 'text-white' : 'text-gray-500'}`}>{step}</p>
                                                <p className="text-xs text-gray-400">{historyEntry ? new Date(historyEntry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending'}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="bg-dark-gray p-4 rounded-lg">
                        <h3 className="font-semibold text-white mb-3">Job Documentation</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <h4 className="text-sm font-medium text-light-gray mb-2">Before Service</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    {(booking.beforeImages && booking.beforeImages.length > 0) ? booking.beforeImages.map((img, i) => <img key={i} src={img} onClick={() => setFullScreenImage(img)} className="w-full h-28 object-cover rounded-md cursor-pointer" alt={`Before ${i + 1}`} />) : <><ImagePlaceholder /><ImagePlaceholder /></>}
                                </div>
                            </div>
                            <div>
                                <h4 className="text-sm font-medium text-light-gray mb-2">After Service</h4>
                                <div className="grid grid-cols-2 gap-2">
                                     {(booking.afterImages && booking.afterImages.length > 0) ? booking.afterImages.map((img, i) => <img key={i} src={img} onClick={() => setFullScreenImage(img)} className="w-full h-28 object-cover rounded-md cursor-pointer" alt={`After ${i + 1}`} />) : <><ImagePlaceholder /><ImagePlaceholder /></>}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-dark-gray p-4 rounded-lg">
                        <h3 className="font-semibold text-white mb-2">Mechanic's Notes</h3>
                        <p className="text-sm text-light-gray bg-field p-3 rounded-md min-h-[50px]">{booking.notes || 'No notes added by mechanic yet.'}</p>
                    </div>

                    <div className="bg-dark-gray p-4 rounded-lg">
                        <h3 className="font-semibold text-white mb-2">Service Location</h3>
                        <div ref={mapRef} className="h-40 w-full rounded-lg" />
                    </div>
                </main>
            </div>
        </div>
    );
};

const HomeScreen: React.FC = () => {
    const { user } = useAuth();
    const { db } = useDatabase();
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
    
    // State for notification modals
    const [completedBooking, setCompletedBooking] = useState<Booking | null>(null);
    const shownNotifications = useRef(new Set<string>());
    
    const customerLocation = (user && user.lat && user.lng) ? { lat: user.lat, lng: user.lng } : null;

    const upcomingAppointment = db?.bookings
        .filter(b => b.customerName === user?.name && (b.status === 'Upcoming' || b.status === 'En Route' || b.status === 'In Progress'))
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

        return mechanics
            .filter(mechanic => {
                const isActive = mechanic.status === 'Active';
                const hasSelectedSpec = selectedSpecs.length === 0 || selectedSpecs.some(spec => mechanic.specializations.includes(spec));
                const meetsRating = mechanic.rating >= ratingFilter;
                return isActive && hasSelectedSpec && meetsRating;
            })
            .map(mechanic => ({ ...mechanic, isAvailable: (mechanic.availability?.[todayDayOfWeek]?.isAvailable ?? false) && !busyMechanicIds.has(mechanic.id) }));
    }, [db, selectedSpecs, ratingFilter]);

    useEffect(() => {
        if (!db || !user) return;
    
        const myBookings = db.bookings.filter(b => b.customerName === user.name);
    
        const inProgressNotif = myBookings.find(b => 
            b.status === 'In Progress' && 
            !shownNotifications.current.has(`${b.id}-in-progress`)
        );
    
        if (inProgressNotif) {
            setProgressModalBooking(inProgressNotif);
            shownNotifications.current.add(`${inProgressNotif.id}-in-progress`);
        }
        
        const completedNotif = myBookings.find(b => 
            b.status === 'Completed' && 
            !shownNotifications.current.has(`${b.id}-completed`)
        );
        
        if (completedNotif) {
            setCompletedBooking(completedNotif);
            shownNotifications.current.add(`${completedNotif.id}-completed`);
        }
    
    }, [db, user]);

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
        switch(upcomingAppointment.status) {
            case 'Upcoming': return '50%';
            case 'En Route': return '75%';
            case 'In Progress': return '90%';
            default: return '25%';
        }
    };

    const getAppointmentActionText = () => {
        if (!upcomingAppointment) return '';
        switch(upcomingAppointment.status) {
            case 'En Route': return 'Track Mechanic';
            case 'In Progress': return 'View Progress';
            default: return 'View Booking';
        }
    };

    return (
        <div className="bg-secondary min-h-full pb-48 font-sans">
            <div className="flex justify-between items-start p-6">
                <div>
                    <p className="text-light-gray">Welcome back,</p>
                    <h1 className="text-4xl font-bold text-white">{user?.name.split(' ')[0]}!</h1>
                </div>
                <NotificationBell />
            </div>

            {!user?.vehicles || user.vehicles.length === 0 ? (
                <div className="px-6 mb-8">
                    <div className="bg-dark-gray border border-dashed border-primary/50 p-6 rounded-xl flex flex-col items-center text-center shadow-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-primary mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                        <h3 className="font-bold text-white text-lg">Add a Vehicle</h3>
                        <p className="text-sm text-light-gray mt-1 mb-4">Add a vehicle to your garage to get personalized AI suggestions and faster bookings.</p>
                        <button onClick={() => navigate('/my-garage')} className="bg-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-orange-600 transition">
                            Go to My Garage
                        </button>
                    </div>
                </div>
            ) : (
                 <div className="px-6 mb-8">
                    <div className="bg-dark-gray border border-primary p-4 rounded-xl flex items-center justify-between shadow-lg">
                        <div className="flex items-center gap-4">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-primary flex-shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>
                            <div>
                                <p className="font-bold text-white">{(user.vehicles.find(v => v.isPrimary) || user.vehicles[0]).year} {(user.vehicles.find(v => v.isPrimary) || user.vehicles[0]).make} {(user.vehicles.find(v => v.isPrimary) || user.vehicles[0]).model}</p>
                                <p className="text-sm text-light-gray font-mono">{(user.vehicles.find(v => v.isPrimary) || user.vehicles[0]).plateNumber}</p>
                            </div>
                        </div>
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-light-gray" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                    </div>
                </div>
            )}
            
            {upcomingAppointment && (
                <div className="px-6 mb-8">
                    <h2 className="text-xl font-semibold mb-3 text-white">Upcoming Appointment</h2>
                    <div className="bg-field p-4 rounded-xl shadow-lg">
                        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => upcomingAppointment?.mechanic && navigate(`/mechanic-profile/${upcomingAppointment.mechanic.id}`)} role="button" tabIndex={0}>
                            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-xl font-bold text-white flex-shrink-0 group-hover:bg-orange-600 transition-colors">{upcomingAppointment.mechanic?.name.split(' ').map(n => n[0]).join('')}</div>
                            <div>
                                <p className="font-bold text-white group-hover:text-primary group-hover:underline transition-colors">{upcomingAppointment.mechanic?.name}</p>
                                <p className="text-sm text-light-gray">{upcomingAppointment.service.name} for</p>
                                <p className="text-sm font-semibold text-white">{`${upcomingAppointment.vehicle.make} ${upcomingAppointment.vehicle.model}`}</p>
                            </div>
                        </div>
                        <div className="mt-4">
                            <div className="flex justify-between items-center text-sm mb-1">
                                <span className="font-medium text-light-gray">Status:</span>
                                <span className="font-bold text-orange-400">{upcomingAppointment.status}</span>
                            </div>
                            <div className="w-full bg-black/30 rounded-full h-2.5"><div className="bg-primary h-2.5 rounded-full transition-all duration-500 ease-in-out" style={{width: getStatusWidth()}}></div></div>
                        </div>
                        <div className="mt-4 flex gap-2">
                            <button onClick={handleAppointmentAction} className="flex-1 bg-primary text-white font-bold py-3 rounded-lg hover:bg-orange-600 transition duration-300">
                                {getAppointmentActionText()}
                            </button>
                             <button onClick={handleShare} className="w-14 flex-shrink-0 bg-dark-gray text-white p-3 rounded-lg hover:bg-gray-600 transition" aria-label="Share booking details">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.368a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            <div
                className="relative w-full overflow-hidden mb-8 group"
                onMouseEnter={() => setIsBannerPaused(true)}
                onMouseLeave={() => setIsBannerPaused(false)}
            >
                <div className="flex transition-transform duration-500 ease-in-out" style={{ transform: `translateX(-${currentBanner * 100}%)` }}>
                    {db.banners.map((banner) => (
                        <div key={banner.id} className="w-full flex-shrink-0 px-6" onClick={() => navigate(banner.link)}>
                            <img src={banner.imageUrl} alt="Ad Banner" className="w-full h-32 rounded-xl object-cover cursor-pointer" />
                        </div>
                    ))}
                </div>
                <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2">
                    {db.banners.map((_, index) => (
                        <button key={index} onClick={() => setCurrentBanner(index)} className={`w-2 h-2 rounded-full transition-colors ${currentBanner === index ? 'bg-primary' : 'bg-white/50'}`} aria-label={`Go to banner ${index + 1}`}/>
                    ))}
                </div>
                 <button onClick={handlePrevBanner} className="absolute top-1/2 left-7 -translate-y-1/2 bg-black/40 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Previous banner">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <button onClick={handleNextBanner} className="absolute top-1/2 right-7 -translate-y-1/2 bg-black/40 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Next banner">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
            </div>

            <div className="px-6 mb-8">
                 <h2 className="text-xl font-semibold mb-3 text-white">AI Service Suggestions</h2>
                 <div className="bg-dark-gray p-4 rounded-lg">
                    {isLoadingAI ? <div className="flex justify-center items-center py-8"><Spinner size="md" color="text-white" /></div>
                    : aiError ? (
                        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm text-center">
                            <p className="font-semibold">Oops! Something went wrong.</p>
                            <p className="mt-1">{aiError}</p>
                            <button onClick={handleGetSuggestions} className="mt-3 bg-primary/20 text-primary font-semibold py-1 px-4 rounded-md text-xs hover:bg-primary/30">Try Again</button>
                        </div>
                    ) : aiSuggestions.length > 0 ? (
                        <div className="space-y-4">
                            {aiSuggestions.map((suggestion, index) => (
                                <div key={index} className="bg-field p-4 rounded-lg flex flex-col items-start shadow-md">
                                    <h4 className="font-bold text-primary">{suggestion.serviceName}</h4>
                                    <p className="text-sm text-light-gray mt-1 mb-3 flex-grow">{suggestion.reason}</p>
                                    <div className="flex gap-2 self-end">
                                        <button onClick={() => handleLearnMore(suggestion.serviceName)} className="bg-field text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-600 transition text-sm">Learn More</button>
                                        <button onClick={() => handleBookNow(suggestion.serviceName)} className="bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-orange-600 transition text-sm">Book Now</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-4">
                            <p className="text-light-gray mb-4">Get personalized service recommendations for your vehicle.</p>
                            <button onClick={handleGetSuggestions} className="bg-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-orange-600 transition">Get Suggestions</button>
                        </div>
                    )}
                 </div>
            </div>

            <div className="px-6">
                <h2 className="text-xl font-semibold mb-3 text-white">Nearby Mechanics</h2>
                <div className="mb-3 grid grid-cols-2 gap-3">
                    <div className="relative">
                        <button onClick={() => setSpecFilterOpen(!specFilterOpen)} className="w-full px-4 py-2 bg-field border border-dark-gray rounded-lg text-white text-left flex justify-between items-center">
                            <span className="truncate">{selectedSpecs.length > 0 ? `${selectedSpecs.length} spec${selectedSpecs.length > 1 ? 's' : ''} selected` : 'All Specializations'}</span>
                            <svg className={`w-4 h-4 transition-transform ${specFilterOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        {specFilterOpen && (
                            <div className="absolute top-full left-0 w-full mt-1 bg-field border border-dark-gray rounded-lg z-10 max-h-48 overflow-y-auto">
                                {allSpecializations.map(spec => (
                                    <label key={spec} className="flex items-center gap-2 p-2 hover:bg-dark-gray cursor-pointer">
                                        <input type="checkbox" checked={selectedSpecs.includes(spec)} onChange={() => handleSpecToggle(spec)} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
                                        <span>{spec}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                    <select
                        value={ratingFilter}
                        onChange={(e) => setRatingFilter(Number(e.target.value))}
                        className="w-full px-4 py-2 bg-field border border-dark-gray rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                        <option value={0}>All Ratings</option>
                        <option value={4}>4 ★ & Up</option>
                        <option value={3}>3 ★ & Up</option>
                    </select>
                </div>
                <div className="h-96 w-full rounded-xl shadow-lg overflow-hidden">
                   <HomeLiveMap mechanics={mechanicsWithAvailability} />
                </div>
            </div>

            {trackingBooking && <TrackMechanicModal booking={trackingBooking} customerLocation={customerLocation} onClose={() => setTrackingBooking(null)} onShare={handleShare} />}
            {progressModalBooking && <JobProgressModal booking={progressModalBooking} customerLocation={customerLocation} onClose={() => setProgressModalBooking(null)} />}
            {completedBooking && <CompletedInvoiceModal booking={completedBooking} onClose={() => setCompletedBooking(null)} db={db} />}
        </div>
    );
};

export default HomeScreen;
