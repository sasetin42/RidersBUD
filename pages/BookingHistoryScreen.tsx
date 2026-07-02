import React, { useState, useMemo, useEffect, useCallback } from 'react';
import CustomerHeader from '../components/CustomerHeader';
import { 
    History, Calendar, Clock, User, Wrench, Eye, ClipboardList, Star,
    TrendingUp, Award, DollarSign, ArrowRight, ShieldCheck, XCircle, FileText, Phone
} from 'lucide-react';
import { useDatabase } from '../context/DatabaseContext';
import { useAuth } from '../context/AuthContext';
import BookingStatusCard from '../components/BookingStatusCard';
import { useNavigate, useLocation } from 'react-router-dom';
import { Booking, BookingStatus, Review } from '../types';
import Spinner from '../components/Spinner';
import ReviewModal from '../components/ReviewModal';

// Helper function for date validation
const isValidDate = (dateString: string): boolean => {
    if (!dateString) return false;
    const date = new Date(dateString);
    return !isNaN(date.getTime());
};

const getStatusBadgeClass = (status: string) => {
    switch (status) {
        case 'Upcoming': return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
        case 'Mechanic Assigned': return 'bg-purple-500/20 text-purple-400 border border-purple-500/30';
        case 'En Route': return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
        case 'In Progress': return 'bg-orange-500/20 text-orange-400 border border-orange-500/30';
        case 'Work Done': return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
        case 'Completed': return 'bg-green-500/20 text-green-400 border border-green-500/30';
        case 'Cancelled': return 'bg-red-500/20 text-red-400 border border-red-500/30';
        default: return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
    }
};

const BookingHistoryScreen: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { db, loading } = useDatabase();
    const { user } = useAuth();
    const [filterStatus, setFilterStatus] = useState<BookingStatus | 'All'>('All');
    const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    // Review Modal State
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [selectedBookingForReview, setSelectedBookingForReview] = useState<Booking | null>(null);
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);

    const { addReview, updateReview } = useDatabase();

    // Handle redirect from booking confirmation
    useEffect(() => {
        const state = location.state as { message?: string; highlightBookingId?: string } | null;
        if (state?.message) {
            setSuccessMessage(state.message);
            setShowSuccessMessage(true);

            // Clear the message after 5 seconds
            setTimeout(() => {
                setShowSuccessMessage(false);
            }, 5000);

            // Clear location state to prevent showing message on refresh
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location, navigate]);

    // Separate active vs past bookings for better UX
    const { activeBookings, pastBookings } = useMemo(() => {
        if (!db?.bookings || !user) {
            return { activeBookings: [], pastBookings: [] };
        }

        let userBookings = db.bookings
            .filter(b => {
                const idMatch = b.customerId === user.id;
                const nameMatch = b.customerName === user.name;
                return idMatch || nameMatch;
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Newest first

        // Apply filters
        if (filterStatus !== 'All') {
            userBookings = userBookings.filter(b => b.status === filterStatus);
        }

        if (dateRange.start) {
            userBookings = userBookings.filter(b => b.date >= dateRange.start);
        }
        if (dateRange.end) {
            userBookings = userBookings.filter(b => b.date <= dateRange.end);
        }

        const active = [];
        const past = [];

        for (const booking of userBookings) {
            if (['Completed', 'Cancelled'].includes(booking.status)) {
                past.push(booking);
            } else {
                active.push(booking);
            }
        }

        return { activeBookings: active, pastBookings: past };
    }, [db?.bookings, user, filterStatus, dateRange]);

    const handleDownloadInvoice = useCallback((booking: Booking) => {
        // Mock invoice download
        alert(`Downloading invoice for Booking #${booking.id.toUpperCase()}...`);
    }, []);

    const resetFilters = useCallback(() => {
        setFilterStatus('All');
        setDateRange({ start: '', end: '' });
    }, []);

    const handleOpenReviewModal = (booking: Booking) => {
        setSelectedBookingForReview(booking);
        setIsReviewModalOpen(true);
    };

    const handleSubmitReview = async (rating: number, comment: string) => {
        if (!selectedBookingForReview) return;
        setIsSubmittingReview(true);
        try {
            if (selectedBookingForReview.review) {
                // Update existing
                await updateReview(selectedBookingForReview.id, {
                    ...selectedBookingForReview.review,
                    rating,
                    comment
                });
                setSuccessMessage('Review updated successfully!');
            } else {
                // Add new
                await addReview(selectedBookingForReview.id, {
                    bookingId: selectedBookingForReview.id,
                    customerId: user?.id || selectedBookingForReview.customerId || '',
                    customerName: user?.name || selectedBookingForReview.customerName || 'Customer',
                    mechanicId: selectedBookingForReview.mechanic?.id || selectedBookingForReview.mechanicId || '',
                    mechanicName: selectedBookingForReview.mechanic?.name || selectedBookingForReview.mechanicName || '',
                    rating,
                    comment
                });
                setSuccessMessage('Review submitted successfully!');
            }
            setShowSuccessMessage(true);
            setTimeout(() => setShowSuccessMessage(false), 5000);
        } catch (e) {
            console.error('Review submission error:', e);
            throw e; // Propagate to ReviewModal for error display
        } finally {
            setIsSubmittingReview(false);
        }
    };

    const isReviewEditable = (booking: Booking) => {
        if (!booking.review) return true; // Can create
        const reviewDate = new Date(booking.review.date).getTime();
        const now = Date.now();
        const hoursDiff = (now - reviewDate) / (1000 * 60 * 60);
        return hoursDiff < 24;
    };

    const getBookingSequenceId = useCallback((bId: string) => {
        if (!db?.bookings) return bId.slice(-6).toUpperCase();
        const sortedBookings = [...db.bookings].sort((a, b) => {
            const timeA = new Date(a.date).getTime();
            const timeB = new Date(b.date).getTime();
            if (timeA !== timeB) return timeA - timeB;
            return a.id.localeCompare(b.id);
        });

        const yearCounters: Record<string, number> = {};
        let seqId = '';

        for (const bk of sortedBookings) {
            const getYear = (bk: any) => {
                if (bk.date) {
                    const match = bk.date.match(/\b\d{4}\b/);
                    if (match) return match[0];
                    const d = new Date(bk.date.replace(/-/g, '/'));
                    if (!isNaN(d.getTime())) return String(d.getFullYear());
                }
                return '2026';
            };
            const year = getYear(bk);
            yearCounters[year] = (yearCounters[year] || 0) + 1;
            if (bk.id === bId) {
                seqId = `RB-${year}-${String(yearCounters[year]).padStart(4, '0')}`;
                break;
            }
        }
        return seqId || bId.slice(-6).toUpperCase();
    }, [db?.bookings]);

    const statsSummary = useMemo(() => {
        if (!db?.bookings || !user) {
            return { activeCount: 0, completedCount: 0, totalSpent: 0 };
        }
        const userBookings = db.bookings.filter(b => b.customerId === user.id || b.customerName === user.name);
        const active = userBookings.filter(b => !['Completed', 'Cancelled'].includes(b.status));
        const completed = userBookings.filter(b => b.status === 'Completed');
        const totalSpent = completed.reduce((sum, b) => {
            const base = b.totalAmount || b.service?.price || 0;
            const extra = b.additionalCosts ? b.additionalCosts.reduce((s: number, c: any) => s + (Number(c.price) || 0), 0) : 0;
            return sum + base + extra;
        }, 0);
        return {
            activeCount: active.length,
            completedCount: completed.length,
            totalSpent
        };
    }, [db?.bookings, user]);

    if (loading) return <Spinner />;

    return (
        <div className="flex flex-col min-h-screen bg-[#121212] text-white select-none">
            <CustomerHeader title="Booking History" icon={<History size={22} />} />

            <div className="flex-1 overflow-y-auto custom-scrollbar pb-20">
                <main className="p-4 space-y-6 max-w-5xl mx-auto w-full">

                    {/* Success Notification Banner */}
                    {showSuccessMessage && (
                        <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-5 border border-green-400/30 shadow-2xl shadow-green-500/20 animate-fadeIn">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-white font-black text-base mb-1">{successMessage}</h3>
                                    <p className="text-white/80 text-sm">Your booking request has been processed successfully.</p>
                                </div>
                                <button
                                    onClick={() => setShowSuccessMessage(false)}
                                    className="text-white/60 hover:text-white transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Booking KPI Analytics Section */}
                    <div className="grid grid-cols-3 gap-2.5">
                        <div className="bg-[#15151A]/80 backdrop-blur-md border border-white/5 p-4 rounded-2xl flex flex-col justify-between shadow-lg">
                            <div className="flex items-center justify-between">
                                <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest font-mono">Active Bookings</span>
                                <TrendingUp size={12} className="text-blue-400" />
                            </div>
                            <div className="flex items-baseline gap-1 mt-2">
                                <span className="text-xl font-black text-blue-400">{statsSummary.activeCount}</span>
                                <span className="text-[9px] text-gray-600 font-bold font-mono">active</span>
                            </div>
                        </div>
                        <div className="bg-[#15151A]/80 backdrop-blur-md border border-white/5 p-4 rounded-2xl flex flex-col justify-between shadow-lg">
                            <div className="flex items-center justify-between">
                                <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest font-mono">Completed</span>
                                <Award size={12} className="text-emerald-400" />
                            </div>
                            <div className="flex items-baseline gap-1 mt-2">
                                <span className="text-xl font-black text-emerald-400">{statsSummary.completedCount}</span>
                                <span className="text-[9px] text-gray-600 font-bold font-mono">done</span>
                            </div>
                        </div>
                        <div className="bg-[#15151A]/80 backdrop-blur-md border border-white/5 p-4 rounded-2xl flex flex-col justify-between shadow-lg">
                            <div className="flex items-center justify-between">
                                <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest font-mono">Total Spent</span>
                                <DollarSign size={12} className="text-primary" />
                            </div>
                            <div className="mt-2">
                                <span className="text-sm font-black text-white">₱{statsSummary.totalSpent.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Active Bookings */}
                    {activeBookings.length > 0 && (
                        <section className="animate-slideUp space-y-3">
                            <h2 className="text-sm font-black text-white flex items-center gap-2 uppercase tracking-wider pl-1">
                                <span className="w-1.5 h-4 bg-primary rounded-full"></span>
                                Active Services ({activeBookings.length})
                            </h2>
                            <div className="flex flex-col gap-3.5">
                                {activeBookings.map(booking => {
                                    const seqId = getBookingSequenceId(booking.id);
                                    const mechanicName = booking.mechanic?.name || booking.mechanicName || 'Assigned Mechanic';
                                    const mechanicImage = booking.mechanic?.imageUrl || booking.mechanicImageUrl;
                                    const serviceNames = booking.services?.map(s => s.name).join(', ') || booking.service?.name || 'Unknown Service';
                                    const vehicleInfo = booking.vehicle ? `${booking.vehicle.year} ${booking.vehicle.make} ${booking.vehicle.model}` : booking.vehicleType || 'Vehicle';
                                    
                                    return (
                                        <div key={booking.id} className="relative group">
                                            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-orange-600 rounded-2xl opacity-5 group-hover:opacity-10 transition duration-300 blur"></div>
                                            <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#15151A]/85 backdrop-blur-xl border border-white/5 hover:border-primary/25 rounded-2xl p-4.5 transition-all duration-300 shadow-xl">
                                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                                    {/* Mechanic Profile Image */}
                                                    <div className="w-12 h-12 rounded-xl border border-white/10 overflow-hidden flex-shrink-0 bg-neutral-950 flex items-center justify-center relative shadow-inner">
                                                        {mechanicImage ? (
                                                            <img src={mechanicImage} alt={mechanicName} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center font-black text-sm text-white font-sans">
                                                                {mechanicName.charAt(0).toUpperCase()}
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    {/* Details */}
                                                    <div className="flex-1 min-w-0 space-y-1">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="text-[10px] font-black text-primary font-mono tracking-wider">
                                                                JOB ID #{seqId}
                                                            </span>
                                                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black tracking-wider uppercase ${getStatusBadgeClass(booking.status)}`}>
                                                                {booking.status}
                                                            </span>
                                                        </div>
                                                        <h3 className="text-sm font-bold text-white truncate tracking-tight">
                                                            {serviceNames}
                                                        </h3>
                                                        <p className="text-[10px] text-gray-400 font-bold truncate flex items-center gap-1.5">
                                                            <Wrench size={10} className="text-primary flex-shrink-0" />
                                                            {vehicleInfo}
                                                        </p>
                                                        <p className="text-[10px] text-gray-500 font-bold truncate flex items-center gap-3">
                                                            <span className="flex items-center gap-1">
                                                                <Calendar size={10} className="text-gray-600 flex-shrink-0" />
                                                                {new Date(booking.date.replace(/-/g, '/')).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                            </span>
                                                            <span className="flex items-center gap-1">
                                                                <Clock size={10} className="text-gray-600 flex-shrink-0" />
                                                                {booking.time}
                                                            </span>
                                                        </p>
                                                    </div>
                                                </div>
                                                
                                                {/* Booking Summary Button */}
                                                <button
                                                    onClick={() => navigate(`/customer-portal/booking-detail/${booking.id}`)}
                                                    className="w-full sm:w-auto bg-primary hover:bg-orange-600 text-white font-black py-3 px-5 rounded-xl text-[10px] tracking-wider uppercase transition-all duration-300 active:scale-95 flex items-center justify-center gap-2 flex-shrink-0 shadow-lg shadow-primary/20"
                                                >
                                                    <ClipboardList size={13} />
                                                    View Details
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {/* Filters Section */}
                    <section className="bg-[#15151A]/80 backdrop-blur-md border border-white/5 p-6 rounded-3xl shadow-xl animate-fadeIn relative overflow-hidden">
                        {/* Decorative background element */}
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
                        
                        <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-4.5 flex items-center gap-2 relative z-10 whitespace-nowrap">
                            <span className="w-1.5 h-4 bg-primary rounded-full"></span>
                            Filter Booking Status
                        </h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 relative z-10">
                            <div className="flex flex-col group pt-4">
                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value as any)}
                                    className="w-full bg-[#101014] border border-white/5 hover:border-white/10 text-white rounded-xl px-4 py-3 text-xs font-bold outline-none transition-all duration-300 focus:border-primary/50 focus:ring-2 focus:ring-primary/10 cursor-pointer shadow-inner"
                                >
                                    <option value="All">All Statuses</option>
                                    <option value="Upcoming">Upcoming</option>
                                    <option value="Booking Confirmed">Confirmed</option>
                                    <option value="Mechanic Assigned">Assigned</option>
                                    <option value="En Route">En Route</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Completed">Completed</option>
                                    <option value="Cancelled">Cancelled</option>
                                </select>
                            </div>
                            
                            <div className="md:col-span-2 grid grid-cols-2 gap-3.5">
                                <div className="flex flex-col group">
                                    <label htmlFor="history-start-date" className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-1.5 pl-1 group-focus-within:text-primary transition-colors">Start Date</label>
                                    <input
                                        id="history-start-date"
                                        name="history-start-date"
                                        type="date"
                                        value={dateRange.start}
                                        onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                        className="w-full bg-[#101014] border border-white/5 hover:border-white/10 text-white rounded-xl px-4 py-3 text-xs font-bold outline-none transition-all duration-300 focus:border-primary/50 focus:ring-2 focus:ring-primary/10 cursor-pointer [color-scheme:dark] shadow-inner"
                                    />
                                </div>
                                
                                <div className="flex flex-col group">
                                    <label htmlFor="history-end-date" className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-1.5 pl-1 group-focus-within:text-primary transition-colors">End Date</label>
                                    <input
                                        id="history-end-date"
                                        name="history-end-date"
                                        type="date"
                                        value={dateRange.end}
                                        onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                        className="w-full bg-[#101014] border border-white/5 hover:border-white/10 text-white rounded-xl px-4 py-3 text-xs font-bold outline-none transition-all duration-300 focus:border-primary/50 focus:ring-2 focus:ring-primary/10 cursor-pointer [color-scheme:dark] shadow-inner"
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Past Bookings */}
                    <section className="animate-slideUp space-y-4" style={{ animationDelay: '0.1s' }}>
                        <h2 className="text-sm font-black text-white flex items-center gap-2 uppercase tracking-wider pl-1">
                            <span className="w-1.5 h-4 bg-gray-600 rounded-full"></span>
                            Past Bookings ({pastBookings.length})
                        </h2>

                        {pastBookings.length === 0 ? (
                            <div className="text-center py-16 bg-[#15151A]/60 rounded-3xl border border-white/5 flex flex-col items-center justify-center p-6 space-y-3">
                                <XCircle size={32} className="text-gray-600" />
                                <p className="text-gray-500 text-xs font-bold">No past bookings found matching your filters.</p>
                                <button
                                    onClick={resetFilters}
                                    className="text-primary hover:underline font-black text-xs uppercase tracking-wider"
                                >
                                    Clear Filters
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                {pastBookings.map(booking => {
                                    const seqId = getBookingSequenceId(booking.id);
                                    const mechanicName = booking.mechanic?.name || booking.mechanicName || 'Assigned Mechanic';
                                    const mechanicImage = booking.mechanic?.imageUrl || booking.mechanicImageUrl;
                                    const serviceNames = booking.services?.map(s => s.name).join(', ') || booking.service?.name || 'Unknown Service';
                                    const vehicleInfo = booking.vehicle ? `${booking.vehicle.year} ${booking.vehicle.make} ${booking.vehicle.model}` : booking.vehicleType || 'Vehicle';
                                    const totalAmount = booking.totalAmount || booking.service?.price || 0;
                                    
                                    return (
                                        <div key={booking.id} className="relative group">
                                            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-orange-600 rounded-2xl opacity-5 group-hover:opacity-10 transition duration-300 blur"></div>
                                            <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#15151A]/85 backdrop-blur-xl border border-white/5 hover:border-primary/25 rounded-2xl p-5 transition-all duration-300 shadow-xl">
                                                <div className="flex items-start gap-4 flex-1 min-w-0">
                                                    {/* Mechanic Profile Image */}
                                                    <div className="w-12 h-12 rounded-xl border border-white/10 overflow-hidden flex-shrink-0 bg-neutral-950 flex items-center justify-center relative shadow-inner">
                                                        {mechanicImage ? (
                                                            <img src={mechanicImage} alt={mechanicName} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full bg-gradient-to-br from-neutral-800 to-neutral-900 flex items-center justify-center font-black text-sm text-gray-400 font-sans">
                                                                {mechanicName.charAt(0).toUpperCase()}
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    {/* Details */}
                                                    <div className="flex-1 min-w-0 space-y-1.5">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="text-[10px] font-black text-primary font-mono tracking-wider">
                                                                JOB ID #{seqId}
                                                            </span>
                                                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black tracking-wider uppercase ${booking.status === 'Completed' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                                                                {booking.status}
                                                            </span>
                                                            <span className="text-sm font-black text-primary ml-auto lg:ml-0">
                                                                {totalAmount > 0 ? `₱${totalAmount.toLocaleString()}` : 'For Quotation'}
                                                            </span>
                                                        </div>
                                                        <h3 className="text-sm font-bold text-white truncate tracking-tight">
                                                            {serviceNames}
                                                        </h3>
                                                        <p className="text-[10px] text-gray-400 font-bold truncate flex items-center gap-1.5">
                                                            <Wrench size={10} className="text-primary flex-shrink-0" />
                                                            {vehicleInfo}
                                                        </p>
                                                        <p className="text-[10px] text-gray-500 font-bold truncate flex items-center gap-3 pb-1">
                                                            <span className="flex items-center gap-1">
                                                                <Calendar size={10} className="text-gray-600 flex-shrink-0" />
                                                                {new Date(booking.date.replace(/-/g, '/')).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                            </span>
                                                            <span className="flex items-center gap-1">
                                                                <Clock size={10} className="text-gray-600 flex-shrink-0" />
                                                                {booking.time}
                                                            </span>
                                                        </p>
 
                                                        {booking.additionalCosts && booking.additionalCosts.length > 0 && (() => {
                                                            const additionalCostsTotal = booking.additionalCosts.reduce((sum: number, cost: any) => sum + (Number(cost.price) || 0), 0);
                                                            return (
                                                                <div className="mt-2.5 p-3 bg-black/40 border border-white/5 rounded-xl space-y-1.5 text-[10px] max-w-sm">
                                                                    <p className="font-black text-primary tracking-wider uppercase text-[8px] font-mono flex items-center gap-1">
                                                                        <Wrench size={9} /> Additional Costs Details:
                                                                    </p>
                                                                    {booking.additionalCosts.map((cost: any, idx: number) => (
                                                                        <div key={idx} className="flex justify-between items-center text-gray-400">
                                                                            <span>• {cost.description || cost.item}</span>
                                                                            <span className="font-bold text-white font-mono">₱{Number(cost.price).toLocaleString()}</span>
                                                                        </div>
                                                                    ))}
                                                                    <div className="h-px bg-white/5 my-1"></div>
                                                                    <div className="flex justify-between items-center font-black text-emerald-400 text-[9px] uppercase tracking-wider font-mono">
                                                                        <span>Total Service Amount</span>
                                                                        <span>{(totalAmount + additionalCostsTotal) > 0 ? `₱${(totalAmount + additionalCostsTotal).toLocaleString()}` : 'For Quotation'}</span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>
 
                                                {/* Actions Section */}
                                                <div className="flex flex-wrap items-center gap-2 lg:justify-end flex-shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-white/5">
                                                    {/* Booking Summary Button */}
                                                    <button
                                                        onClick={() => navigate(`/customer-portal/booking-detail/${booking.id}`)}
                                                        className="bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-bold py-2.5 px-3.5 rounded-xl text-[10px] tracking-wider uppercase transition-all duration-300 active:scale-95 flex items-center gap-1.5 border border-white/5"
                                                    >
                                                        <ClipboardList size={12} />
                                                        Summary
                                                    </button>
 
                                                    {/* Appointment Button */}
                                                    <button
                                                        onClick={() => navigate(`/customer-portal/booking-confirmation`, { state: { bookings: [booking] } })}
                                                        className="bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-bold py-2.5 px-3.5 rounded-xl text-[10px] tracking-wider uppercase transition-all duration-300 active:scale-95 flex items-center gap-1.5 border border-white/5"
                                                    >
                                                        <Calendar size={12} />
                                                        Appointment
                                                    </button>
 
                                                    {booking.status === 'Completed' && (
                                                        <button
                                                            onClick={() => handleDownloadInvoice(booking)}
                                                            className="bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-bold py-2.5 px-3.5 rounded-xl text-[10px] tracking-wider uppercase transition-all duration-300 active:scale-95 flex items-center gap-1.5 border border-white/5"
                                                        >
                                                            <FileText size={12} />
                                                            Invoice
                                                        </button>
                                                    )}
 
                                                    <button
                                                        onClick={() => {
                                                            const serviceId = booking.services && booking.services.length > 0 ? booking.services[0].id : booking.service?.id;
                                                            if (serviceId) {
                                                                navigate(`/customer-portal/booking/${serviceId}`);
                                                            } else {
                                                                 navigate(`/customer-portal/booking`);
                                                            }
                                                        }}
                                                        className="bg-primary/10 hover:bg-primary text-primary hover:text-black font-black py-2.5 px-4 rounded-xl text-[10px] tracking-wider uppercase transition-all duration-300 active:scale-95 border border-primary/20 hover:border-primary"
                                                    >
                                                        Book Again
                                                    </button>
 
                                                    {/* Rate / Edit Review Button */}
                                                    {booking.status === 'Completed' && booking.mechanic && (
                                                        <div className="flex-shrink-0">
                                                            {!booking.review ? (
                                                                <button
                                                                    onClick={() => handleOpenReviewModal(booking)}
                                                                    className="bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 font-bold py-2 px-3 rounded-lg text-[10px] tracking-wider uppercase border border-yellow-500/20 transition-all flex items-center gap-1"
                                                                >
                                                                    <Star size={12} className="fill-yellow-500 text-yellow-500" />
                                                                    Rate
                                                                </button>
                                                            ) : (
                                                                isReviewEditable(booking) ? (
                                                                    <button
                                                                        onClick={() => handleOpenReviewModal(booking)}
                                                                        className="bg-gray-700/50 hover:bg-gray-700 text-white font-bold py-2 px-3 rounded-lg text-[10px] tracking-wider uppercase border border-gray-600 transition-all"
                                                                    >
                                                                        Edit Review
                                                                    </button>
                                                                ) : (
                                                                    <div className="flex items-center gap-1 text-yellow-500 font-bold px-2 py-1.5 text-[10px]">
                                                                        <span>★ {booking.review.rating}</span>
                                                                        <span className="text-gray-500 font-normal">Reviewed</span>
                                                                    </div>
                                                                )
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                </main>
            </div>
            {/* Review Modal */}
            <ReviewModal
                isOpen={isReviewModalOpen}
                onClose={() => setIsReviewModalOpen(false)}
                onSubmit={handleSubmitReview}
                existingReview={selectedBookingForReview?.review}
                isSubmitting={isSubmittingReview}
                mechanicName={selectedBookingForReview?.mechanicName || selectedBookingForReview?.mechanic?.name}
                mechanicImageUrl={selectedBookingForReview?.mechanic?.imageUrl}
            />
        </div >
    );
};

export default BookingHistoryScreen;
