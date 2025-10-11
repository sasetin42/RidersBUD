

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDatabase } from '../context/DatabaseContext';
import { getAIServiceSuggestions } from '../services/geminiService';
import Spinner from '../components/Spinner';
import { Booking, Mechanic } from '../types';
import HomeLiveMap from '../components/HomeLiveMap';

declare const L: any;

interface AISuggestion {
    serviceName: string;
    reason: string;
}

interface Notification {
    id: string;
    title: string;
    message: string;
    timestamp: string;
    read: boolean;
    link?: string;
}

const mockNotifications: Notification[] = [
    { id: '1', title: 'Mechanic En Route!', message: 'Ricardo Reyes is on the way for your Change Oil service.', timestamp: '5m ago', read: false, link: '/booking-history' },
    { id: '2', title: 'Order Shipped', message: 'Your order #A4B6C8 for Ceramic Brake Pads has been shipped.', timestamp: '2h ago', read: false, link: '/order-history' },
    { id: '3', title: 'Service Reminder', message: 'Your Battery check for Toyota Camry is due in 3 days.', timestamp: '1d ago', read: true, link: '/reminders' },
];

const newMockNotification: Notification = {
    id: '4', title: 'New Booking!', message: 'You have a new booking for Aircon service tomorrow.', timestamp: '1m ago', read: false, link: '/booking-history' 
};

const NotificationPanel: React.FC<{
    notifications: Notification[];
    onClose: () => void;
    onNotificationClick: (notification: Notification) => void;
}> = ({ notifications, onClose, onNotificationClick }) => {
    const navigate = useNavigate();
    const handleClick = (notification: Notification) => {
        onNotificationClick(notification);
        if (notification.link) {
            navigate(notification.link);
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 animate-fadeIn" onClick={onClose}>
            <div
                className="absolute top-16 right-6 w-80 max-w-[calc(100%-3rem)] bg-dark-gray rounded-lg shadow-2xl animate-scaleUp origin-top-right"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-3 border-b border-field">
                    <h3 className="font-bold text-white">Notifications</h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                    {notifications.length > 0 ? (
                        notifications.map(notif => (
                            <div
                                key={notif.id}
                                onClick={() => handleClick(notif)}
                                className={`p-3 border-b border-field hover:bg-field cursor-pointer ${!notif.read ? 'bg-primary/10' : ''}`}
                            >
                                <p className="font-semibold text-white text-sm">{notif.title}</p>
                                <p className="text-xs text-light-gray">{notif.message}</p>
                                <p className="text-[10px] text-gray-500 mt-1">{notif.timestamp}</p>
                            </div>
                        ))
                    ) : (
                        <p className="p-4 text-center text-sm text-light-gray">No new notifications.</p>
                    )}
                </div>
            </div>
        </div>
    );
};


const TrackMechanicModal: React.FC<{ booking: Booking; onClose: () => void; onShare: () => void; }> = ({ booking, onClose, onShare }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const mechanicMarkerRef = useRef<any>(null);
    const mechanic = booking.mechanic;

    const destination = { lat: (mechanic?.lat || 0) + 0.02, lng: (mechanic?.lng || 0) + 0.02 };

    useEffect(() => {
        if (!mapRef.current || !mechanic || mapInstanceRef.current || typeof L === 'undefined') return;

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
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            if (!mechanicMarkerRef.current || !mechanic) return;
            const currentPos = mechanicMarkerRef.current.getLatLng();
            const distance = Math.sqrt(Math.pow(destination.lat - currentPos.lat, 2) + Math.pow(destination.lng - currentPos.lng, 2));

            if (distance < 0.0001) {
                clearInterval(interval);
                return;
            }

            const newLat = currentPos.lat + (destination.lat - currentPos.lat) * 0.1;
            const newLng = currentPos.lng + (destination.lng - currentPos.lng) * 0.1;

            mechanicMarkerRef.current.setLatLng([newLat, newLng]);
        }, 2000);
        return () => clearInterval(interval);
    }, [mechanic]);

    if (!mechanic) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex flex-col z-50 p-4 animate-fadeIn" role="dialog" aria-modal="true">
            <header className="flex items-center justify-between pb-4 flex-shrink-0">
                <h2 className="text-xl font-bold text-white">Track Mechanic</h2>
                <button onClick={onClose} className="text-white text-3xl">&times;</button>
            </header>
            <div ref={mapRef} className="flex-grow rounded-lg" />
            <footer className="bg-field mt-4 p-4 rounded-lg flex-shrink-0">
                <p className="text-center text-lg text-primary font-bold">Arriving in 12 mins</p>
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


const HomeScreen: React.FC = () => {
    const { user } = useAuth();
    const { db } = useDatabase();
    const navigate = useNavigate();

    const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
    const [isLoadingAI, setIsLoadingAI] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    const [trackingBooking, setTrackingBooking] = useState<Booking | null>(null);
    const [currentBanner, setCurrentBanner] = useState(0);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
    const [isBannerPaused, setIsBannerPaused] = useState(false);
    const bannerIntervalRef = useRef<any>(null);

    const unreadCount = notifications.filter(n => !n.read).length;

    const upcomingAppointment = db?.bookings
        .filter(b => b.customerName === user?.name && (b.status === 'Upcoming' || b.status === 'En Route'))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

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
            .filter(mechanic => mechanic.status === 'Active')
            .map(mechanic => ({ ...mechanic, isAvailable: (mechanic.availability?.[todayDayOfWeek]?.isAvailable ?? false) && !busyMechanicIds.has(mechanic.id) }));
    }, [db]);

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

    useEffect(() => {
        const timer = setTimeout(() => {
            setNotifications(prev => {
                if (prev.find(n => n.id === newMockNotification.id)) return prev;
                return [newMockNotification, ...prev];
            });
        }, 8000); // Add after 8 seconds

        return () => clearTimeout(timer);
    }, []);

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
            const primaryVehicle = user.vehicles[0];
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

    const handleNotificationClick = (notification: Notification) => {
        setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, read: true } : n));
    };

    if (!db) {
        return <div className="flex items-center justify-center h-full"><Spinner size="lg" /></div>;
    }
    
    const handleShare = async () => {
        if (!upcomingAppointment) return;
        const isTrackingView = !!trackingBooking;
        const shareData = {
            title: 'RidersBUD Booking Update',
            text: isTrackingView
                ? `Track my RidersBUD mechanic, ${upcomingAppointment.mechanic?.name}, in real-time for my ${upcomingAppointment.service.name} appointment!`
                : `Here are the details for my upcoming RidersBUD appointment: ${upcomingAppointment.service.name} on ${new Date(upcomingAppointment.date.replace(/-/g, '/')).toLocaleDateString()}.`,
            url: window.location.href, // This could be a specific tracking URL in a real app
        };
        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                // Fallback for browsers that don't support Web Share API
                await navigator.clipboard.writeText(`${shareData.text} View status here: ${shareData.url}`);
                alert('Booking details copied to clipboard!');
            }
        } catch (err) {
            console.error('Error sharing:', err);
            alert('Could not share booking details.');
        }
    };

    const handleAppointmentAction = () => {
        if (!upcomingAppointment) return;
        if (upcomingAppointment.status === 'En Route') {
            setTrackingBooking(upcomingAppointment);
        } else {
            navigate('/booking-history');
        }
    };
    
    const handleBookSuggestion = (serviceName: string) => {
        const service = db?.services.find(s => s.name.trim().toLowerCase() === serviceName.trim().toLowerCase());
        if (service) {
            navigate(`/booking/${service.id}`);
        } else {
            alert(`Could not directly find the service "${serviceName}". Please browse our services list.`);
            navigate('/services');
        }
    };

    const getStatusWidth = () => {
        if (!upcomingAppointment) return '0%';
        switch(upcomingAppointment.status) {
            case 'Upcoming': return '50%';
            case 'En Route': return '75%';
            default: return '25%';
        }
    };

    return (
        <div className="bg-secondary min-h-full pb-48 font-sans">
            <div className="flex justify-between items-start p-6">
                <div>
                    <p className="text-light-gray">Welcome back,</p>
                    <h1 className="text-4xl font-bold text-white">{user?.name.split(' ')[0]}!</h1>
                </div>
                <button onClick={() => setIsNotificationsOpen(true)} className="relative text-light-gray hover:text-white mt-2" aria-label={`Notifications (${unreadCount} unread)`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                    </svg>
                    {unreadCount > 0 && (
                        <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
                            {unreadCount}
                        </span>
                    )}
                </button>
            </div>

            {user?.vehicles && user.vehicles.length > 0 && (
                <div className="px-6 mb-8">
                    <div className="bg-dark-gray border border-primary p-4 rounded-xl flex items-center justify-between shadow-lg">
                        <div className="flex items-center gap-4">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-primary flex-shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>
                            <div>
                                <p className="font-bold text-white">{user.vehicles[0].year} {user.vehicles[0].make} {user.vehicles[0].model}</p>
                                <p className="text-sm text-light-gray font-mono">{user.vehicles[0].plateNumber}</p>
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
                                <p className="font-bold text-white group-hover:text-primary transition-colors">{upcomingAppointment.mechanic?.name}</p>
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
                                {upcomingAppointment.status === 'En Route' ? 'Track Mechanic' : 'View Booking'}
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
                                    <button onClick={() => handleBookSuggestion(suggestion.serviceName)} className="bg-primary/80 text-white font-bold py-2 px-5 rounded-lg hover:bg-primary transition text-sm self-end">Book Now</button>
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
                <div className="h-96 w-full rounded-xl shadow-lg overflow-hidden">
                   <HomeLiveMap mechanics={mechanicsWithAvailability} />
                </div>
            </div>

            {trackingBooking && <TrackMechanicModal booking={trackingBooking} onClose={() => setTrackingBooking(null)} onShare={handleShare} />}
            {isNotificationsOpen && <NotificationPanel notifications={notifications} onClose={() => setIsNotificationsOpen(false)} onNotificationClick={handleNotificationClick} />}
        </div>
    );
};

export default HomeScreen;