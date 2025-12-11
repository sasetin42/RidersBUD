import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDatabase } from '../context/DatabaseContext';
import Spinner from '../components/Spinner';
import { Booking, BookingStatus, Mechanic } from '../types';
import HomeLiveMap from '../components/HomeLiveMap';
import NotificationBell from '../components/NotificationBell';
import TrackMechanicModal from '../components/TrackMechanicModal';
import GlobalSearchModal from '../components/GlobalSearchModal';
import {
    Car, ChevronRight, Share2, Sparkles, ChevronDown, Check,
    MapPin, Calendar, Clock, X, Image as ImageIcon, Filter,
    Star, Plus, Wrench, Battery, Droplet, Truck, AlertTriangle, Shield,
    CloudSun, Search, Bell
} from 'lucide-react';

declare const L: any;

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
        <div className="w-full h-28 bg-white/5 border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center text-center p-2">
            <ImageIcon className="h-6 w-6 text-gray-500" />
            <p className="text-xs text-gray-500 mt-1">No Photo Uploaded</p>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex flex-col z-50 p-0 sm:p-4 animate-fadeIn" role="dialog" aria-modal="true">
            {fullScreenImage && (
                <div className="fixed inset-0 bg-black/95 z-[60] flex items-center justify-center p-4 animate-fadeIn" onClick={() => setFullScreenImage(null)}>
                    <img src={fullScreenImage} alt="Full screen view" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
                </div>
            )}
            <div className="relative bg-[#1A1A1A] border border-white/10 rounded-t-2xl sm:rounded-2xl flex flex-col h-full max-w-2xl mx-auto w-full shadow-2xl overflow-hidden animate-slideInUp">
                <header className="flex-shrink-0 p-4 border-b border-white/10 flex items-center justify-center bg-white/5">
                    <h2 className="text-xl font-bold text-white">Job Progress</h2>
                    <button onClick={onClose} className="absolute right-4 text-white/70 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
                </header>
                <main className="flex-grow overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    <div className="bg-white/5 p-4 rounded-xl flex items-center gap-4 border border-white/5">
                        <img src={booking.mechanic?.imageUrl} alt={booking.mechanic?.name} className="w-16 h-16 rounded-full object-cover border-2 border-primary shadow-lg" />
                        <div>
                            <p className="font-bold text-lg text-white">{booking.mechanic?.name}</p>
                            <p className="font-semibold text-primary">{booking.service.name}</p>
                            <p className="text-sm text-gray-400">{booking.vehicle.make} {booking.vehicle.model}</p>
                        </div>
                    </div>

                    <div className="bg-white/5 p-4 rounded-xl border border-white/5">
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

                    <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                        <h3 className="font-semibold text-white mb-3">Job Documentation</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <h4 className="text-sm font-medium text-gray-400 mb-2">Before Service</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    {(booking.beforeImages && booking.beforeImages.length > 0) ? booking.beforeImages.map((img, i) => <img key={i} src={img} onClick={() => setFullScreenImage(img)} className="w-full h-28 object-cover rounded-xl cursor-pointer hover:opacity-90 transition" alt={`Before ${i + 1}`} />) : <><ImagePlaceholder /><ImagePlaceholder /></>}
                                </div>
                            </div>
                            <div>
                                <h4 className="text-sm font-medium text-gray-400 mb-2">After Service</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    {(booking.afterImages && booking.afterImages.length > 0) ? booking.afterImages.map((img, i) => <img key={i} src={img} onClick={() => setFullScreenImage(img)} className="w-full h-28 object-cover rounded-xl cursor-pointer hover:opacity-90 transition" alt={`After ${i + 1}`} />) : <><ImagePlaceholder /><ImagePlaceholder /></>}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                        <h3 className="font-semibold text-white mb-2">Mechanic's Notes</h3>
                        <p className="text-sm text-gray-300 bg-black/20 p-3 rounded-xl min-h-[50px] border border-white/5">{booking.notes || 'No notes added by mechanic yet.'}</p>
                    </div>

                    <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                        <h3 className="font-semibold text-white mb-2">Service Location</h3>
                        <div ref={mapRef} className="h-40 w-full rounded-xl overflow-hidden shadow-inner grayscale opacity-80 hover:grayscale-0 hover:opacity-100 transition-all duration-500" />
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

    const [trackingBooking, setTrackingBooking] = useState<Booking | null>(null);
    const [progressModalBooking, setProgressModalBooking] = useState<Booking | null>(null);
    const [currentBanner, setCurrentBanner] = useState(0);
    const [isBannerPaused, setIsBannerPaused] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    // Header Mock Data
    const mockWeather = { temp: 28, condition: 'Cloudy', location: 'Makati City' };
    const bannerIntervalRef = useRef<any>(null);

    // New filter states
    const [specFilterOpen, setSpecFilterOpen] = useState(false);
    const [selectedSpecs, setSelectedSpecs] = useState<string[]>([]);
    const [ratingFilter, setRatingFilter] = useState(0);
    const [availableNowFilter, setAvailableNowFilter] = useState(false);
    const [selectedMechanicId, setSelectedMechanicId] = useState<string | null>(null);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

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
            navigate(`/booking/3`, { state: { serviceLocation: latlng } });
        }
    }, [navigate]);

    const handleBookMechanic = useCallback((mechanic: Mechanic) => {
        if (window.confirm(`Book a diagnostic service with ${mechanic.name}? This will use their current location as the service address.`)) {
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

    if (!db) {
        return <div className="flex items-center justify-center h-full bg-[#121212]"><Spinner size="lg" /></div>;
    }

    const handleShare = async () => {
        if (!upcomingAppointment) return;
        const shareData = {
            title: 'RidersBUD Booking Update',
            text: `Here are the details for my upcoming appointment: ${upcomingAppointment.service.name} with ${upcomingAppointment.mechanic?.name}.`,
            url: 'https://ridersbud.app',
        };
        try {
            if (navigator.share) await navigator.share(shareData);
            else {
                await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
                alert('Copied to clipboard!');
            }
        } catch (err) { }
    };

    const shortcuts = [
        { name: 'Oil Change', icon: Droplet, color: 'text-yellow-400', bg: 'bg-yellow-400/10', link: '/service/1' },
        { name: 'Battery', icon: Battery, color: 'text-green-400', bg: 'bg-green-400/10', link: '/service/4' },
        { name: 'Towing', icon: Truck, color: 'text-red-400', bg: 'bg-red-400/10', link: '/service/2' },
        { name: 'SOS', icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-500/10', link: '/sos' },
        { name: 'Warranties', icon: Shield, color: 'text-blue-400', bg: 'bg-blue-400/10', link: '/warranties' },
    ];

    const getAppointmentActionText = () => {
        if (!upcomingAppointment) return '';
        switch (upcomingAppointment.status) {
            case 'En Route': return 'Track Mechanic';
            case 'In Progress': return 'View Progress';
            default: return 'View Booking';
        }
    };

    const handleAppointmentAction = () => {
        if (!upcomingAppointment) return;
        if (upcomingAppointment.status === 'En Route') {
            setTrackingBooking(upcomingAppointment);
        } else {
            setProgressModalBooking(upcomingAppointment);
        }
    };

    // Helper to extract first name
    const firstName = user?.name.split(' ')[0] || 'Rider';

    return (
        <div className="bg-[#121212] min-h-screen pb-32 font-sans relative overflow-x-hidden text-white">

            {/* Global Search Modal */}
            <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

            {/* Background Gradients */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-20%] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] opacity-40"></div>
                <div className="absolute bottom-[20%] right-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] opacity-30"></div>
            </div>

            {/* Sticky Glass Header */}
            <div className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-[#121212]/80 backdrop-blur-xl border-b border-white/5 py-3' : 'py-6 bg-transparent'}`}>
                <div className="px-6 flex justify-between items-center">

                    {/* Left: Weather & Location (Visible only when scrolled or simply always there but styled comfortably) */}
                    <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                            {/* Weather Widget (Mock) */}
                            <div className="flex items-center gap-2 text-gray-400 text-xs font-semibold mb-0.5">
                                <CloudSun className="w-4 h-4 text-yellow-500" />
                                <span>{mockWeather.temp}°C {mockWeather.condition}</span>
                            </div>
                            {/* Location */}
                            <div className="flex items-center gap-1 text-white text-xs font-bold">
                                <MapPin className="w-3.5 h-3.5 text-primary" />
                                <span className="truncate max-w-[120px]">{mockWeather.location}</span>
                            </div>
                        </div>
                    </div>

                    {/* Center (Title only shows on scroll to save space, or we remove it) */}
                    {/* <div className={`absolute left-1/2 -translate-x-1/2 transition-opacity duration-300 ${isScrolled ? 'opacity-100' : 'opacity-0'}`}>
                         <h1 className="text-lg font-bold text-white">RidersBUD</h1>
                     </div> */}

                    {/* Right: Actions */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsSearchOpen(true)}
                            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors text-white relative group"
                        >
                            <Search className="w-5 h-5 group-hover:text-primary transition-colors" />
                        </button>
                        <div className="relative">
                            <NotificationBell />
                        </div>
                        <button onClick={() => navigate('/profile')} className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/10 hover:border-primary transition-all">
                            <img
                                src={`https://ui-avatars.com/api/?name=${user?.name}&background=random`}
                                alt="Profile"
                                className="w-full h-full object-cover"
                            />
                        </button>
                    </div>
                </div>
            </div>

            <div className="relative z-10 pt-28"> {/* Adjusted pt for sticky header */}

                {/* Hero / Welcome (Large Title that disappears on scroll naturally) */}
                <div className="px-6 mb-6">
                    <p className="text-gray-400 text-sm font-medium mb-1">Good Day,</p>
                    <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                        {firstName}
                    </h1>
                </div>

                {/* Hero Banner Carousel */}
                <div
                    className="relative w-full overflow-hidden mb-8 group animate-slideInUp"
                    onMouseEnter={() => setIsBannerPaused(true)}
                    onMouseLeave={() => setIsBannerPaused(false)}
                >
                    <div className="flex transition-transform duration-700 ease-out" style={{ transform: `translateX(-${currentBanner * 100}%)` }}>
                        {db.banners.map((banner) => (
                            <div key={banner.id} className="w-full flex-shrink-0 px-6 box-border">
                                <div
                                    className="relative rounded-3xl overflow-hidden shadow-2xl h-48 cursor-pointer transform transition-all duration-500 hover:scale-[1.01]"
                                    onClick={() => navigate(banner.link)}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent z-10"></div>
                                    <img src={banner.imageUrl} alt="Ad Banner" className="w-full h-full object-cover" />
                                    <div className="absolute bottom-5 left-5 z-20 max-w-[80%]">
                                        <span className="bg-primary/90 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider mb-2 inline-block shadow-lg">Featured</span>
                                        <h3 className="text-xl font-bold text-white leading-tight drop-shadow-md">Professional Service <br /> Guaranteed.</h3>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Digital Garage Card (Primary Vehicle) */}
                <div className="px-6 mb-8 animate-slideInUp delay-100">
                    <div className="flex justify-between items-center mb-3">
                        <h2 className="text-lg font-bold">My Garage</h2>
                        <button onClick={() => navigate('/my-garage')} className="text-primary text-xs font-bold hover:underline">View All</button>
                    </div>

                    {!user?.vehicles || user.vehicles.length === 0 ? (
                        <div onClick={() => navigate('/my-garage')} className="bg-[#1A1A1A] border border-dashed border-white/20 rounded-3xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-white/5 transition-colors group">
                            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <Plus className="text-gray-400" />
                            </div>
                            <p className="text-sm text-gray-400 font-medium">Add your first vehicle</p>
                        </div>
                    ) : (
                        <div
                            onClick={() => navigate('/my-garage')}
                            className="relative bg-gradient-to-br from-[#1E1E1E] to-[#121212] rounded-3xl p-5 border border-white/5 shadow-2xl overflow-hidden group cursor-pointer"
                        >
                            {/* Decorative circles */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10"></div>

                            <div className="relative z-10 flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">PRIMARY</span>
                                        <span className="text-xs text-gray-500 tracking-wider font-mono">{(user.vehicles.find(v => v.isPrimary) || user.vehicles[0]).plateNumber}</span>
                                    </div>
                                    <h3 className="text-2xl font-bold text-white tracking-wide">{(user.vehicles.find(v => v.isPrimary) || user.vehicles[0]).model}</h3>
                                    <p className="text-sm text-gray-400">{(user.vehicles.find(v => v.isPrimary) || user.vehicles[0]).year} {(user.vehicles.find(v => v.isPrimary) || user.vehicles[0]).make}</p>
                                </div>
                                <div className="w-14 h-14 bg-black/40 rounded-full flex items-center justify-center border border-white/5 group-hover:border-primary/50 transition-colors">
                                    <Car className="text-gray-300 w-7 h-7" />
                                </div>
                            </div>

                            <div className="mt-6 flex gap-3">
                                <div className="flex-1 bg-black/20 rounded-xl p-2 flex flex-col items-center justify-center border border-white/5">
                                    <span className="text-[10px] text-gray-500 uppercase">Mileage</span>
                                    <span className="text-sm font-bold text-white">42k km</span>
                                </div>
                                <div className="flex-1 bg-black/20 rounded-xl p-2 flex flex-col items-center justify-center border border-white/5">
                                    <span className="text-[10px] text-gray-500 uppercase">Health</span>
                                    <span className="text-sm font-bold text-green-400">Good</span>
                                </div>
                                <div className="flex-1 bg-black/20 rounded-xl p-2 flex flex-col items-center justify-center border border-white/5">
                                    <span className="text-[10px] text-gray-500 uppercase">Service</span>
                                    <span className="text-sm font-bold text-orange-400">Due Soon</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Service Shortcuts (Horizontal Scroll) */}
                <div className="mb-8 animate-slideInUp delay-200">
                    <div className="flex overflow-x-auto scrollbar-hide px-6 gap-4 snap-x">
                        {shortcuts.map((shortcut, index) => {
                            const Icon = shortcut.icon;
                            return (
                                <div key={index} className="snap-center flex flex-col items-center gap-2 group cursor-pointer" onClick={() => navigate(shortcut.link)}>
                                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${shortcut.bg} border border-white/5 group-hover:scale-105 transition-transform shadow-lg`}>
                                        <Icon className={`w-7 h-7 ${shortcut.color}`} />
                                    </div>
                                    <span className="text-xs font-medium text-gray-400 group-hover:text-white transition-colors">{shortcut.name}</span>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Upcoming Booking (Compact) */}
                {upcomingAppointment && (
                    <div className="px-6 mb-8 animate-slideInUp delay-200">
                        <h2 className="text-lg font-bold mb-3">Live Activity</h2>
                        <div className="bg-[#1A1A1A] p-1 rounded-3xl border border-white/5 shadow-2xl">
                            <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-[20px] p-5 relative overflow-hidden cursor-pointer" onClick={handleAppointmentAction}>
                                {/* Pulse Effect */}
                                {upcomingAppointment.status === 'En Route' && (
                                    <div className="absolute top-3 right-3 flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                    </div>
                                )}

                                <div className="flex items-center gap-4 relative z-10">
                                    <div className="w-12 h-12 rounded-full border-2 border-white/10 overflow-hidden">
                                        <img src={upcomingAppointment.mechanic?.imageUrl || `https://ui-avatars.com/api/?name=${upcomingAppointment.mechanic?.name}&background=random`} alt="Mech" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-grow">
                                        <h4 className="font-bold text-white">{upcomingAppointment.status}</h4>
                                        <p className="text-xs text-gray-400">{upcomingAppointment.service.name} • {upcomingAppointment.mechanic?.name}</p>
                                    </div>
                                    <ChevronRight className="text-gray-500" size={20} />
                                </div>

                                {/* Progress Bar */}
                                <div className="mt-4 w-full bg-black/50 rounded-full h-1.5 overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-primary to-orange-400 rounded-full relative"
                                        style={{ width: upcomingAppointment.status === 'Completed' ? '100%' : upcomingAppointment.status === 'In Progress' ? '75%' : upcomingAppointment.status === 'En Route' ? '50%' : '25%' }}
                                    >
                                        <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/50 blur-[2px]"></div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-1 mt-1">
                                <button onClick={handleAppointmentAction} className="py-3 text-sm font-bold text-white hover:bg-white/5 rounded-xl transition-colors">{getAppointmentActionText()}</button>
                                <button onClick={handleShare} className="py-3 text-sm font-bold text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors">Share Details</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Nearby Mechanics Map & List */}
                <div className="px-6 mb-8 animate-slideInUp delay-400">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-bold">Nearby Mechanics</h2>
                        <div className="flex bg-[#1A1A1A] rounded-lg p-1 border border-white/10">
                            <button onClick={() => setAvailableNowFilter(!availableNowFilter)} className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${availableNowFilter ? 'bg-primary text-white shadow' : 'text-gray-500 hover:text-white'}`}>
                                Now
                            </button>
                            <div className="w-[1px] bg-white/10 mx-1 my-0.5"></div>
                            <button onClick={() => setSpecFilterOpen(!specFilterOpen)} className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${specFilterOpen ? 'bg-white/20 text-white' : 'text-gray-500 hover:text-white'}`}>
                                Filter
                            </button>
                        </div>
                    </div>

                    {specFilterOpen && (
                        <div className="mb-4 bg-[#1A1A1A] p-3 rounded-2xl border border-white/10 grid grid-cols-2 gap-2 animate-fadeIn">
                            {allSpecializations.map(spec => (
                                <button
                                    key={spec}
                                    onClick={() => handleSpecToggle(spec)}
                                    className={`px-3 py-2 rounded-xl text-xs font-medium text-left transition-colors ${selectedSpecs.includes(spec) ? 'bg-primary text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                                >
                                    {spec}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="h-48 w-full rounded-3xl overflow-hidden shadow-2xl relative z-0 border border-white/10 mb-5 grayscale-[30%] hover:grayscale-0 transition-all duration-700">
                        <HomeLiveMap
                            mechanics={mechanicsWithAvailability}
                            customerLocation={customerLocation}
                            selectedMechanicId={selectedMechanicId}
                            onMarkerClick={setSelectedMechanicId}
                            onMapClickToBook={handleMapClickToBook}
                            onBookMechanic={handleBookMechanic}
                        />
                    </div>

                    <div className="space-y-4">
                        {mechanicsWithAvailability.slice(0, 3).map(mechanic => (
                            <div
                                key={mechanic.id}
                                onClick={() => {
                                    setSelectedMechanicId(mechanic.id);
                                    navigate(`/mechanic-profile/${mechanic.id}`);
                                }}
                                className="bg-[#1A1A1A] p-4 rounded-2xl flex items-center gap-4 border border-white/5 hover:border-primary/50 transition-all cursor-pointer group active:scale-[0.98]"
                            >
                                <div className="relative">
                                    <img src={mechanic.imageUrl} alt={mechanic.name} className="w-14 h-14 rounded-full object-cover border-2 border-white/10 group-hover:border-primary transition-colors" />
                                    {mechanic.isAvailable && <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-[#1A1A1A] rounded-full"></div>}
                                </div>
                                <div className="flex-grow">
                                    <div className="flex justify-between items-start">
                                        <h4 className="font-bold text-white text-base group-hover:text-primary transition-colors">{mechanic.name}</h4>
                                        <div className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-md">
                                            <Star className="w-3 h-3 text-yellow-400 fill-current" />
                                            <span className="text-xs font-bold text-white">{mechanic.rating}</span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{mechanic.specializations.join(', ')}</p>
                                </div>
                                <ChevronRight className="text-gray-600 group-hover:text-white transition-colors" size={20} />
                            </div>
                        ))}
                    </div>

                    <button onClick={() => navigate('/favorite-mechanics')} className="w-full mt-4 py-3 text-xs font-bold text-gray-500 hover:text-white transition uppercase tracking-widest border border-dashed border-white/10 rounded-xl hover:border-white/30">
                        View All Mechanics
                    </button>
                </div>
            </div>

            {trackingBooking && <TrackMechanicModal booking={trackingBooking} customerLocation={customerLocation} onClose={() => setTrackingBooking(null)} onShare={handleShare} />}
            {progressModalBooking && <JobProgressModal booking={progressModalBooking} customerLocation={customerLocation} onClose={() => setProgressModalBooking(null)} />}
        </div>
    );
};

export default HomeScreen;
