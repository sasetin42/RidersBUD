import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '../components/Header';
import { Booking, BookingStatus, Customer } from '../types';
import Spinner from '../components/Spinner';
import { useDatabase } from '../context/DatabaseContext';
import { useAuth } from '../context/AuthContext';
import {
    Calendar, MapPin, Wrench, User, Clock, Star,
    ChevronRight, Filter, X, MessageCircle, Navigation,
    AlertCircle, CheckCircle2, XCircle
} from 'lucide-react';
import TrackMechanicModal from '../components/TrackMechanicModal';
import { getAIServiceSuggestions } from '../services/geminiService';

declare const L: any;

// --- Sub-Components ---

const StarRatingInput: React.FC<{ rating: number; setRating: (rating: number) => void; }> = ({ rating, setRating }) => {
    const [hoverRating, setHoverRating] = useState(0);
    return (
        <div className="flex justify-center gap-2" onMouseLeave={() => setHoverRating(0)}>
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    className="focus:outline-none transition-transform hover:scale-110"
                >
                    <Star
                        size={32}
                        className={`${star <= (hoverRating || rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'} transition-colors`}
                    />
                </button>
            ))}
        </div>
    );
};

const ReviewModal: React.FC<{
    booking: Booking;
    onClose: () => void;
    onSubmit: (review: { rating: number; comment: string }) => void;
}> = ({ booking, onClose, onSubmit }) => {
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = () => {
        if (rating === 0) {
            setError('Please select a star rating before submitting.');
            return;
        }
        setError('');
        onSubmit({ rating, comment });
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[60] p-4 animate-fadeIn">
            <div className="glass-panel w-full max-w-sm rounded-2xl overflow-hidden border border-white/10 shadow-2xl animate-scaleUp">
                <div className="p-6 border-b border-white/5 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">Rate Experience</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={24} /></button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-3 text-primary">
                            <User size={32} />
                        </div>
                        <p className="text-gray-300">How was <span className="text-white font-semibold">{booking.mechanic?.name}</span>?</p>
                        <p className="text-sm text-gray-500">{booking.service.name}</p>
                    </div>

                    <StarRatingInput rating={rating} setRating={setRating} />
                    {error && <p className="text-red-400 text-xs text-center">{error}</p>}

                    <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Write a review... (optional)"
                        rows={3}
                        className="w-full px-4 py-3 bg-[#1A1A1A] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
                    />

                    <button
                        onClick={handleSubmit}
                        disabled={rating === 0}
                        className="w-full py-3 bg-gradient-to-r from-primary to-orange-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-orange-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Submit Review
                    </button>
                </div>
            </div>
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

    const timelineSteps = ['Booking Confirmed', 'Mechanic Assigned', 'En Route', 'In Progress', 'Completed'];
    const currentStatusIndex = useMemo(() => {
        const historyStatuses = booking.statusHistory?.map(h => h.status) || [];
        const allStatuses = [...historyStatuses, booking.status];
        let highestIndex = -1;
        allStatuses.forEach(status => {
            const index = timelineSteps.indexOf(status as BookingStatus);
            if (index > highestIndex) highestIndex = index;
        });
        return highestIndex;
    }, [booking.status, booking.statusHistory]);

    useEffect(() => {
        if (!mapRef.current || !customerLocation || mapInstanceRef.current || typeof L === 'undefined') return;
        mapInstanceRef.current = L.map(mapRef.current).setView([customerLocation.lat, customerLocation.lng], 15);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: '&copy; CARTO' }).addTo(mapInstanceRef.current);
        const markerIcon = L.divIcon({
            html: `<div class="w-4 h-4 bg-primary rounded-full border-2 border-white shadow-lg pulse-ring"></div>`,
            className: 'bg-transparent border-0', iconSize: [16, 16], iconAnchor: [8, 8]
        });
        L.marker([customerLocation.lat, customerLocation.lng], { icon: markerIcon }).addTo(mapInstanceRef.current);
        setTimeout(() => mapInstanceRef.current?.invalidateSize(), 100);
        return () => { mapInstanceRef.current?.remove(); mapInstanceRef.current = null; };
    }, [customerLocation]);

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex flex-col z-[60] animate-fadeIn">
            {fullScreenImage && (
                <div className="fixed inset-0 bg-black z-[70] flex items-center justify-center p-4 animate-scaleUp" onClick={() => setFullScreenImage(null)}>
                    <img src={fullScreenImage} alt="Full screen" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
                    <button className="absolute top-4 right-4 text-white hover:text-primary"><X size={32} /></button>
                </div>
            )}

            <div className="flex-1 overflow-y-auto pb-safe">
                {/* Header */}
                <div className="sticky top-0 bg-black/80 backdrop-blur-md border-b border-white/10 z-10 p-4 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white">Job Progress</h2>
                    <button onClick={onClose} className="p-2 bg-white/5 rounded-full hover:bg-white/10 text-white"><X size={20} /></button>
                </div>

                <div className="p-4 space-y-6 max-w-2xl mx-auto">
                    {/* Mechanic Card */}
                    <div className="glass-panel p-4 rounded-2xl border border-white/5 flex items-center gap-4">
                        <img src={booking.mechanic?.imageUrl || `https://ui-avatars.com/api/?name=${booking.mechanic?.name}&background=EA580C&color=fff`} alt={booking.mechanic?.name} className="w-14 h-14 rounded-full object-cover border-2 border-primary shadow-lg" />
                        <div>
                            <p className="font-bold text-white text-lg">{booking.mechanic?.name}</p>
                            <div className="flex items-center gap-2 text-primary text-sm font-medium">
                                <Wrench size={14} />
                                <span>{booking.service.name}</span>
                            </div>
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="glass-panel p-6 rounded-2xl border border-white/5">
                        <h3 className="text-white font-bold mb-6 flex items-center gap-2"><Clock size={18} className="text-primary" /> Timeline</h3>
                        <div className="relative pl-4 space-y-8 border-l border-white/10 ml-2">
                            {timelineSteps.map((step, index) => {
                                const isCompleted = index <= currentStatusIndex;
                                const historyEntry = booking.statusHistory?.find(h => h.status === step);
                                return (
                                    <div key={step} className="relative">
                                        <div className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 ${isCompleted ? 'bg-primary border-primary shadow-[0_0_10px_rgba(234,88,12,0.5)]' : 'bg-[#121212] border-gray-600'}`} />
                                        <div>
                                            <p className={`font-semibold text-sm ${isCompleted ? 'text-white' : 'text-gray-500'}`}>{step}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">{historyEntry ? new Date(historyEntry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending'}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Photos */}
                    <div className="space-y-4">
                        <h3 className="text-white font-bold px-2">Job Photos</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="glass-panel p-3 rounded-2xl border border-white/5">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-3">Before</span>
                                {booking.beforeImages?.length ? (
                                    <div className="grid grid-cols-2 gap-2">
                                        {booking.beforeImages.map((img, i) => <img key={i} src={img} onClick={() => setFullScreenImage(img)} className="w-full aspect-square object-cover rounded-lg cursor-pointer hover:opacity-80 transition" alt="Before" />)}
                                    </div>
                                ) : (
                                    <div className="h-24 flex items-center justify-center text-gray-600 text-xs italic bg-white/5 rounded-lg">No photos</div>
                                )}
                            </div>
                            <div className="glass-panel p-3 rounded-2xl border border-white/5">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-3">After</span>
                                {booking.afterImages?.length ? (
                                    <div className="grid grid-cols-2 gap-2">
                                        {booking.afterImages.map((img, i) => <img key={i} src={img} onClick={() => setFullScreenImage(img)} className="w-full aspect-square object-cover rounded-lg cursor-pointer hover:opacity-80 transition" alt="After" />)}
                                    </div>
                                ) : (
                                    <div className="h-24 flex items-center justify-center text-gray-600 text-xs italic bg-white/5 rounded-lg">No photos</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    {booking.notes && (
                        <div className="glass-panel p-4 rounded-2xl border border-white/5">
                            <h3 className="text-white font-bold mb-2 text-sm">Mechanic Notes</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">{booking.notes}</p>
                        </div>
                    )}

                    {/* Map */}
                    <div className="h-48 rounded-2xl overflow-hidden border border-white/10 shadow-lg relative z-0">
                        <div ref={mapRef} className="w-full h-full" />
                    </div>
                </div>
            </div>
        </div>
    );
};

const BookingListItem: React.FC<{
    booking: Booking;
    onAction: (type: 'track' | 'progress' | 'review' | 'pay' | 'book_again', booking: Booking) => void;
}> = ({ booking, onAction }) => {
    const statusConfig: Record<string, { color: string, icon: React.ReactNode }> = {
        'Completed': { color: 'text-green-400 bg-green-400/10 border-green-400/20', icon: <CheckCircle2 size={12} /> },
        'Cancelled': { color: 'text-red-400 bg-red-400/10 border-red-400/20', icon: <XCircle size={12} /> },
        'In Progress': { color: 'text-blue-400 bg-blue-400/10 border-blue-400/20', icon: <Wrench size={12} /> },
        'En Route': { color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20', icon: <Navigation size={12} /> },
        'Upcoming': { color: 'text-gray-300 bg-gray-500/10 border-gray-500/20', icon: <Calendar size={12} /> },
    };

    const statusStyle = statusConfig[booking.status] || statusConfig['Upcoming'];
    const dateObj = new Date(booking.date);

    return (
        <div className="glass-card p-0 rounded-2xl overflow-hidden group hover:bg-white/5 transition-colors duration-300">
            <div className="p-4 sm:p-5 flex flex-col sm:flex-row gap-5">
                {/* Left: Image */}
                <div className="w-full sm:w-24 h-32 sm:h-24 bg-[#1A1A1A] rounded-xl flex-shrink-0 relative overflow-hidden">
                    <img
                        src={booking.service.imageUrl || 'default_service.png'}
                        alt={booking.service.name}
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent sm:hidden" />
                    <div className="absolute bottom-2 left-2 sm:hidden text-white font-bold text-lg">{booking.service.name}</div>
                </div>

                {/* Center: Details */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-lg text-white hidden sm:block truncate">{booking.service.name}</h3>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${statusStyle.color}`}>
                            {statusStyle.icon}
                            {booking.status}
                        </span>
                    </div>

                    <div className="space-y-1.5 mb-3">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                            <Calendar size={14} className="text-primary/70" />
                            <span>{dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            <span className="w-1 h-1 rounded-full bg-gray-700" />
                            <span>{booking.time}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                            <MessageCircle size={14} className="text-primary/70" />
                            <span>{Math.floor(Math.random() * 59) + 10} km away</span> {/* Mock distance if needed */}
                        </div>
                        {booking.mechanic && (
                            <div className="flex items-center gap-2 text-sm text-gray-300">
                                <User size={14} className="text-primary/70" />
                                <span className="font-medium text-white">{booking.mechanic.name}</span>
                            </div>
                        )}
                    </div>

                    {/* Price Tag Mockup - If you have real price, use it */}
                    <div className="flex items-center gap-1 text-white font-bold">
                        <span className="text-xs text-gray-500 font-normal">Total</span>
                        <span>$120.00</span>
                    </div>
                </div>
            </div>

            {/* Actions Footer */}
            <div className="bg-white/5 px-4 py-3 flex gap-3 border-t border-white/5">
                {['Upcoming', 'En Route', 'In Progress', 'Mechanic Assigned', 'Booking Confirmed'].includes(booking.status) && (
                    <button onClick={() => onAction('track', booking)} className="flex-1 py-2 rounded-lg bg-primary/20 text-primary border border-primary/20 font-semibold text-sm hover:bg-primary/30 transition">
                        Track Status
                    </button>
                )}
                {booking.status === 'Completed' && (
                    <>
                        <button onClick={() => onAction('progress', booking)} className="flex-1 py-2 rounded-lg bg-[#2A2A2A] text-gray-300 border border-white/10 font-semibold text-sm hover:bg-white/10 transition">
                            View Progress
                        </button>
                        {!booking.isReviewed && (
                            <button onClick={() => onAction('review', booking)} className="flex-1 py-2 rounded-lg bg-primary text-white font-bold text-sm shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition">
                                Rate
                            </button>
                        )}
                        <button onClick={() => onAction('book_again', booking)} className="flex-1 py-2 rounded-lg bg-[#2A2A2A] text-white border border-white/10 font-semibold text-sm hover:bg-white/10 transition">
                            Book Again
                        </button>
                    </>
                )}
                {booking.status === 'Cancelled' && (
                    <button onClick={() => onAction('book_again', booking)} className="flex-1 py-2 rounded-lg bg-primary/10 text-primary border border-primary/20 font-semibold text-sm hover:bg-primary/20 transition">
                        Book Again
                    </button>
                )}
            </div>
        </div>
    );
};


// --- Main Screen ---

const BookingHistoryScreen: React.FC = () => {
    const { plateNumber } = useParams<{ plateNumber?: string }>();
    const { db, addReviewToMechanic, loading: dbLoading } = useDatabase();
    const { user } = useAuth();
    const navigate = useNavigate();

    // State
    const [selectedTab, setSelectedTab] = useState<'upcoming' | 'past'>('upcoming');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [dateFilter, setDateFilter] = useState<string>(''); // Single date

    // Modals
    const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
    const [progressBooking, setProgressBooking] = useState<Booking | null>(null);
    const [trackBooking, setTrackBooking] = useState<Booking | null>(null);

    // AI Suggestions
    useEffect(() => {
        const fetchSuggestions = async () => {
            if (plateNumber && user && db && !sessionStorage.getItem('ai_suggestions')) {
                const vehicle = user.vehicles.find(v => v.plateNumber === plateNumber);
                if (vehicle) {
                    const history = db.bookings
                        .filter(b => b.customerName === user.name && b.status === 'Completed' && b.vehicle.plateNumber === vehicle.plateNumber)
                        .map(b => b.service.name) || [];
                    try {
                        const suggestions = await getAIServiceSuggestions(vehicle, history);
                        sessionStorage.setItem('ai_suggestions', JSON.stringify(suggestions));
                    } catch (e) { console.error(e); }
                }
            }
        };
        fetchSuggestions();
    }, [plateNumber, user, db]);

    // Derived Data
    const { upcoming, past } = useMemo(() => {
        if (!user || !db) return { upcoming: [], past: [] };

        let all = db.bookings.filter(b => b.customerName === user.name);

        // Filter Logic
        if (statusFilter !== 'all') {
            all = all.filter(b => b.status === statusFilter);
        }
        if (dateFilter) {
            const filterDate = new Date(dateFilter).toDateString();
            all = all.filter(b => new Date(b.date).toDateString() === filterDate);
        }

        const upcomingStatus = ['Upcoming', 'En Route', 'In Progress', 'Mechanic Assigned', 'Booking Confirmed', 'Reschedule Requested'];

        const up = all
            .filter(b => upcomingStatus.includes(b.status))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const p = all
            .filter(b => b.status === 'Completed' || b.status === 'Cancelled')
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return { upcoming: up, past: p };
    }, [db, user, statusFilter, dateFilter]);

    // Handlers
    const handleAction = (type: string, booking: Booking) => {
        switch (type) {
            case 'review': setReviewBooking(booking); break;
            case 'progress': setProgressBooking(booking); break;
            case 'track': setTrackBooking(booking); break;
            case 'book_again':
                navigate(`/booking/${booking.service.id}`, { state: { vehiclePlateNumber: booking.vehicle.plateNumber } });
                break;
            case 'pay': navigate('/service-payment', { state: { booking } }); break;
        }
    };

    const handleSubmitReview = (review: { rating: number; comment: string }) => {
        if (reviewBooking && reviewBooking.mechanic && user) {
            addReviewToMechanic(reviewBooking.mechanic.id, reviewBooking.id, review, user.name);
            setReviewBooking(null);
        }
    };

    if (dbLoading || !user) {
        return <div className="flex h-screen bg-secondary items-center justify-center"><Spinner size="lg" /></div>;
    }

    const displayedBookings = selectedTab === 'upcoming' ? upcoming : past;

    return (
        <div className="flex flex-col min-h-screen bg-secondary pb-24">
            <Header title={plateNumber ? `History: ${plateNumber}` : "Booking History"} showBackButton />

            {/* Filter Header */}
            <div className="px-4 py-4 space-y-4 bg-[#1F1F1F]/50 backdrop-blur-sm border-b border-white/5 sticky top-[60px] z-30">
                {/* Tabs */}
                <div className="flex p-1 bg-black/40 rounded-xl">
                    <button
                        onClick={() => setSelectedTab('upcoming')}
                        className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${selectedTab === 'upcoming' ? 'bg-primary text-white shadow-lg shadow-orange-500/20' : 'text-gray-400 hover:text-white'}`}
                    >
                        Upcoming ({upcoming.length})
                    </button>
                    <button
                        onClick={() => setSelectedTab('past')}
                        className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${selectedTab === 'past' ? 'bg-primary text-white shadow-lg shadow-orange-500/20' : 'text-gray-400 hover:text-white'}`}
                    >
                        History
                    </button>
                </div>

                {/* Simplified Filters */}
                <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
                    <div className="relative min-w-[140px]">
                        <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full pl-10 pr-8 py-2.5 bg-[#2A2A2A] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-primary/50 appearance-none"
                        >
                            <option value="all">All Statuses</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled</option>
                            <option value="In Progress">In Progress</option>
                        </select>
                        <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 rotate-90" />
                    </div>

                    <div className="relative flex-1 min-w-[140px]">
                        <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="date"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="w-full pl-10 pr-3 py-2.5 bg-[#2A2A2A] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-primary/50 placeholder-gray-500"
                            placeholder="Filter by Date"
                        />
                        {dateFilter && (
                            <button onClick={() => setDateFilter('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white">
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Content List */}
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                {displayedBookings.length > 0 ? (
                    displayedBookings.map(booking => (
                        <BookingListItem
                            key={booking.id}
                            booking={booking}
                            onAction={handleAction}
                        />
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4">
                            <Calendar size={32} className="text-gray-600" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">No Bookings Found</h3>
                        <p className="text-gray-400 max-w-xs mx-auto">
                            {selectedTab === 'upcoming'
                                ? "You don't have any upcoming appointments scheduled."
                                : "No past service history matches your filters."}
                        </p>
                        {selectedTab === 'upcoming' && (
                            <button onClick={() => navigate('/services')} className="mt-6 px-6 py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition">
                                Book a Service
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Modals */}
            {reviewBooking && <ReviewModal booking={reviewBooking} onClose={() => setReviewBooking(null)} onSubmit={handleSubmitReview} />}
            {progressBooking && <JobProgressModal booking={progressBooking} customerLocation={user ? { lat: user.lat!, lng: user.lng! } : null} onClose={() => setProgressBooking(null)} />}
            {trackBooking && <TrackMechanicModal booking={trackBooking} customerLocation={user ? { lat: user.lat!, lng: user.lng! } : null} onClose={() => setTrackBooking(null)} onShare={() => { }} />}
        </div>
    );
};

export default BookingHistoryScreen;