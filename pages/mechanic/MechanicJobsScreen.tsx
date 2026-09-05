import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import { Booking, BookingStatus, Customer } from '../../types';
import Spinner from '../../components/Spinner';
import { useDatabase } from '../../context/DatabaseContext';
import { useMechanicAuth } from '../../context/MechanicAuthContext';
import NotificationBell from '../../components/NotificationBell';
import { 
    Clock, 
    CheckCircle2, 
    Search, 
    Calendar, 
    User, 
    ChevronRight, 
    Briefcase,
    Phone,
    MessageSquare,
    Navigation,
    DollarSign,
    Car,
    ShieldCheck,
    AlertCircle,
    Play,
    Zap,
    Filter,
    MapPin
} from 'lucide-react';
import MechanicCustomerChatModal from '../../components/mechanic/MechanicCustomerChatModal';
import LiveRouteMapModal from '../../components/LiveRouteMapModal';

const JobCard: React.FC<{ 
    booking: Booking;
    onOpenChat: (booking: Booking, customer: Customer) => void;
    onOpenDirections: (booking: Booking) => void;
    onQuickStatusUpdate: (bookingId: string, nextStatus: BookingStatus) => void;
    isUpdating?: boolean;
}> = ({ 
    booking, 
    onOpenChat, 
    onOpenDirections, 
    onQuickStatusUpdate,
    isUpdating 
}) => {
    const navigate = useNavigate();
    const { db } = useDatabase();

    const statusColors: { [key in BookingStatus]: string } = {
        Upcoming: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
        'En Route': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        'In Progress': 'bg-orange-500/15 text-orange-400 border-orange-500/30',
        Completed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        Cancelled: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
        'Booking Confirmed': 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
        'Mechanic Assigned': 'bg-sky-500/15 text-sky-400 border-sky-500/30',
        'Reschedule Requested': 'bg-amber-600/15 text-amber-400 border-amber-600/30',
        'Work Done': 'bg-emerald-600/15 text-emerald-400 border-emerald-600/30',
        'On Hold': 'bg-neutral-600/15 text-neutral-300 border-neutral-600/30',
    };

    const services = booking.services || (booking.service ? [booking.service] : []);
    const serviceNames = services.map(s => s.name).join(', ') || 'General Repair & Inspection';
    const basePrice = services.reduce((total, s) => total + (s.price || 0), 0);
    const totalPrice = booking.totalAmount || basePrice || 0;

    // Normalizing and formatting date
    const bookingDateStr = booking.date.replace(/-/g, '/');
    const bookingDate = new Date(bookingDateStr);
    const isToday = useMemo(() => {
        const today = new Date();
        return bookingDate.toDateString() === today.toDateString();
    }, [bookingDate]);

    const isTomorrow = useMemo(() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return bookingDate.toDateString() === tomorrow.toDateString();
    }, [bookingDate]);

    const day = isNaN(bookingDate.getDate()) ? '--' : bookingDate.getDate();
    const month = isNaN(bookingDate.getTime()) ? 'DATE' : bookingDate.toLocaleDateString('en-US', { month: 'short' });

    // Payment state badges
    const isPaid = booking.isPaid || booking.paymentStatus === 'paid';
    const isDownpaymentPaid = booking.paymentStatus === 'downpayment_paid' || booking.paymentStatus === 'partial';

    // Linked Customer resolution
    const customerObj = useMemo<Customer>(() => {
        const found = db?.customers?.find(c => c.id === booking.customerId || c.name === booking.customerName);
        if (found) return found;
        return {
            id: booking.customerId || 'temp-cust',
            name: booking.customerName || 'Customer',
            email: booking.customerEmail || '',
            phone: booking.customerPhone || '',
            vehicles: [booking.vehicle]
        };
    }, [db?.customers, booking]);

    // Service image fallback
    const serviceImage = services[0]?.imageUrl || booking.service?.imageUrl || '/assets/maintenance.png';

    // Handle Quick Action Clicks without triggering card navigation
    const handleCallCustomer = (e: React.MouseEvent) => {
        e.stopPropagation();
        const phone = booking.customerPhone || customerObj.phone;
        if (phone) {
            window.location.href = `tel:${phone.replace(/\s+/g, '')}`;
        } else {
            navigate(`/mechanic-portal/job/${booking.id}`);
        }
    };

    const handleChatClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onOpenChat(booking, customerObj);
    };

    const handleDirectionsClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onOpenDirections(booking);
    };

    const handleAdvanceStatus = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (booking.status === 'Upcoming' || booking.status === 'Booking Confirmed' || booking.status === 'Mechanic Assigned') {
            onQuickStatusUpdate(booking.id, 'En Route');
        } else if (booking.status === 'En Route') {
            onQuickStatusUpdate(booking.id, 'In Progress');
        } else {
            navigate(`/mechanic-portal/job/${booking.id}`);
        }
    };

    return (
        <div
            onClick={() => navigate(`/mechanic-portal/job/${booking.id}`)}
            className="group relative bg-[#151518] hover:bg-[#1A1A1E] border border-white/5 hover:border-primary/20 rounded-2xl p-3 sm:p-3.5 transition-all duration-200 shadow-lg overflow-hidden cursor-pointer active:scale-[0.99]"
        >
            {/* Ambient Background Accent Glow */}
            <div className="absolute top-0 right-0 w-28 h-28 bg-primary/5 blur-[40px] rounded-full pointer-events-none group-hover:bg-primary/10 transition-all duration-300" />

            {/* Top Row: Date/Urgency Pill, Status Tag, Payment Tag, and Price */}
            <div className="flex items-center justify-between gap-1.5 mb-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Urgency/Timeline pill */}
                    {isToday && (
                        <span className="inline-flex items-center gap-1 bg-amber-500/20 border border-amber-500/30 text-amber-400 font-black text-[8.5px] px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                            <Zap size={9} className="fill-amber-400" /> Today
                        </span>
                    )}
                    {isTomorrow && (
                        <span className="bg-sky-500/15 border border-sky-500/25 text-sky-400 font-black text-[8.5px] px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                            Tomorrow
                        </span>
                    )}
                    {/* Status Badge */}
                    <span className={`px-2 py-0.5 text-[8px] font-black rounded-md border uppercase tracking-wider leading-none ${statusColors[booking.status] || 'bg-white/10 text-gray-400 border-white/10'}`}>
                        {booking.status}
                    </span>
                    {/* Payment Tag */}
                    {isPaid ? (
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                            <ShieldCheck size={9} /> Fully Paid
                        </span>
                    ) : isDownpaymentPaid ? (
                        <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[8px] font-bold px-1.5 py-0.5 rounded-md">
                            Deposit Paid
                        </span>
                    ) : (
                        <span className="bg-neutral-800 text-neutral-400 border border-neutral-700 text-[8px] font-bold px-1.5 py-0.5 rounded-md">
                            Pay on Service
                        </span>
                    )}
                </div>

                {/* Amount */}
                <div className="text-right shrink-0">
                    <span className={`font-black text-sm sm:text-base tracking-tight leading-none ${booking.status === 'Completed' ? 'text-emerald-400' : 'text-white'}`}>
                        ₱{totalPrice.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                    <span className="text-[7.5px] font-bold text-gray-500 uppercase tracking-tight block -mt-0.5">Est. Payout</span>
                </div>
            </div>

            {/* Middle Section: Compact Thumbnail + Multi-Data Details */}
            <div className="flex gap-3 items-center">
                {/* Service Image / Date Thumbnail */}
                <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden shrink-0 bg-[#222226] border border-white/10 shadow-sm">
                    <img
                        src={serviceImage}
                        alt={serviceNames}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = '/assets/maintenance.png';
                        }}
                    />
                    <div className="absolute bottom-0 inset-x-0 bg-black/85 backdrop-blur-xs py-0.2 text-center shadow-xs">
                        <span className="text-[7px] font-black text-primary uppercase tracking-wider block leading-tight">
                            {month} {day}
                        </span>
                    </div>
                </div>

                {/* Content Breakdown */}
                <div className="flex-grow min-w-0">
                    {/* Time & Service Title in 1 Compact Line */}
                    <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1 shrink-0">
                            <Clock size={10} className="text-primary" />
                            {booking.time || 'Flexible'}
                        </span>
                        <span className="text-gray-600 font-bold">•</span>
                        <h4 className="font-black text-white tracking-tight leading-tight group-hover:text-primary transition-colors truncate">
                            {serviceNames}
                        </h4>
                    </div>

                    {/* Compact Customer & Vehicle Details */}
                    <div className="mt-1 flex items-center gap-1.5 text-[10px] flex-wrap">
                        <div className="inline-flex items-center gap-1 text-gray-300 bg-white/5 px-1.5 py-0.5 rounded font-bold truncate max-w-[130px]">
                            <User size={9} className="text-gray-400 shrink-0" />
                            <span className="truncate">{booking.customerName}</span>
                        </div>
                        <div className="inline-flex items-center gap-1 text-gray-400 bg-white/5 px-1.5 py-0.5 rounded font-medium truncate max-w-[150px]">
                            <Car size={9} className="text-gray-500 shrink-0" />
                            <span className="truncate">{booking.vehicle?.year} {booking.vehicle?.make} {booking.vehicle?.model}</span>
                        </div>
                        {booking.vehicle?.plateNumber && (
                            <span className="font-mono font-black text-[8.5px] bg-neutral-800 text-amber-300 px-1 py-0.5 rounded border border-neutral-700 leading-none shrink-0">
                                {booking.vehicle.plateNumber}
                            </span>
                        )}
                    </div>

                    {/* Location Snippet */}
                    {booking.location?.address && (
                        <div className="mt-1 text-[9px] text-gray-400 font-medium truncate flex items-center gap-1">
                            <MapPin size={9} className="text-primary shrink-0" />
                            <span className="truncate">{booking.location.address}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Quick-Action Toolbar (Compact & Ergonomic) */}
            <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                    {/* Quick Call */}
                    <button
                        type="button"
                        onClick={handleCallCustomer}
                        title="Call Customer"
                        className="p-2 bg-white/5 hover:bg-emerald-500/20 active:scale-95 text-gray-300 hover:text-emerald-400 rounded-lg border border-white/5 transition-all"
                    >
                        <Phone size={13} />
                    </button>

                    {/* Quick Chat */}
                    <button
                        type="button"
                        onClick={handleChatClick}
                        title="Chat with Customer"
                        className="p-2 bg-white/5 hover:bg-primary/20 active:scale-95 text-gray-300 hover:text-primary rounded-lg border border-white/5 transition-all"
                    >
                        <MessageSquare size={13} />
                    </button>

                    {/* Quick Navigate */}
                    <button
                        type="button"
                        onClick={handleDirectionsClick}
                        title="Open Route Navigation"
                        className="p-2 bg-white/5 hover:bg-sky-500/20 active:scale-95 text-gray-300 hover:text-sky-400 rounded-lg border border-white/5 transition-all"
                    >
                        <Navigation size={13} />
                    </button>
                </div>

                {/* Primary Progression / Detail Button */}
                <div>
                    {['Upcoming', 'Booking Confirmed', 'Mechanic Assigned'].includes(booking.status) ? (
                        <button
                            type="button"
                            disabled={isUpdating}
                            onClick={handleAdvanceStatus}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary hover:bg-orange-600 active:scale-95 text-white text-[9.5px] font-black uppercase tracking-wider rounded-lg shadow-sm shadow-primary/25 transition-all disabled:opacity-50"
                        >
                            <Play size={10} className="fill-white" />
                            <span>Start Trip</span>
                        </button>
                    ) : booking.status === 'En Route' ? (
                        <button
                            type="button"
                            disabled={isUpdating}
                            onClick={handleAdvanceStatus}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-[9.5px] font-black uppercase tracking-wider rounded-lg shadow-sm shadow-emerald-500/25 transition-all disabled:opacity-50"
                        >
                            <CheckCircle2 size={10} />
                            <span>Start Work</span>
                        </button>
                    ) : (
                        <div className="flex items-center gap-0.5 text-gray-400 font-bold text-[9.5px] uppercase tracking-wider group-hover:text-primary transition-colors">
                            <span>Details</span>
                            <ChevronRight size={13} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const MetricCard: React.FC<{
    value: string | number;
    icon: React.ReactNode;
    label: string;
    subtitle: string;
    accentColor: string;
    glowClass: string;
}> = ({ value, icon, label, subtitle, accentColor, glowClass }) => {
    return (
        <div className="relative overflow-hidden rounded-xl p-2.5 bg-[#151518] border border-white/5 shadow-md flex flex-col justify-between h-20 sm:h-22 group transition-all duration-200">
            <div className={`absolute top-0 right-0 w-14 h-14 rounded-full blur-xl opacity-20 pointer-events-none group-hover:opacity-30 transition-opacity ${glowClass}`} />

            <div className="flex items-center justify-between">
                <span className="text-[8.5px] font-black text-gray-500 uppercase tracking-wider">{label}</span>
                <div className={`p-1 rounded-md bg-white/5 border border-white/5 ${accentColor}`}>
                    {icon}
                </div>
            </div>

            <div>
                <p className="text-lg sm:text-xl font-black text-white tracking-tight leading-none mb-0.5">
                    {value}
                </p>
                <p className="text-[8.5px] font-semibold text-gray-400 leading-none truncate">
                    {subtitle}
                </p>
            </div>
        </div>
    );
};

const MechanicJobsScreen: React.FC = () => {
    const { db, loading, updateBookingStatus } = useDatabase();
    const { mechanic } = useMechanicAuth();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'cancelled'>('active');
    const [subFilter, setSubFilter] = useState<'all' | 'today' | 'enroute'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [isStatusUpdating, setIsStatusUpdating] = useState(false);

    // Modal States for Quick Actions
    const [activeChatBooking, setActiveChatBooking] = useState<{ booking: Booking; customer: Customer } | null>(null);
    const [activeDirectionsBooking, setActiveDirectionsBooking] = useState<Booking | null>(null);

    const {
        activeJobs,
        completedJobs,
        cancelledJobs,
        stats
    } = useMemo(() => {
        if (!mechanic || !db) {
            return { 
                activeJobs: [], 
                completedJobs: [], 
                cancelledJobs: [], 
                stats: { total: 0, completionRate: 100, activeCount: 0, todayCount: 0, totalRevenue: 0 } 
            };
        }

        const modules = db?.settings?.modules;

        const allMyBookings = (db.bookings || []).filter(b => {
            const isMatch = (b.mechanic?.id === mechanic.id || b.mechanicId === mechanic.id);
            if (!isMatch) return false;

            const paymentMethod = (b.paymentMethod || '').toLowerCase();
            const isGCashBooking = paymentMethod === 'gcash' || !!b.gcashReceiptUrl || !!b.gcashPaymentStatus;
            const isHitPayBooking = paymentMethod.includes('hitpay') || paymentMethod.includes('online') || !!b.hitpayReference || !!b.hitpayPaymentRequestId;

            if (isGCashBooking) {
                if (!(b.isVerified === true || b.gcashPaymentStatus === 'verified')) return false;
            } else if (isHitPayBooking) {
                if (!(b.isVerified === true || b.hitpayStatus === 'completed' || b.paymentStatus === 'downpayment_paid' || b.paymentStatus === 'partial' || b.isPaid === true || ((b.paidAmount || 0) > 0))) return false;
            } else {
                if (!(b.isVerified === true || b.isPaid === true || b.paymentStatus === 'paid' || b.paymentStatus === 'downpayment_paid' || b.paymentStatus === 'partial')) return false;
            }

            if (modules) {
                const services = b.services || (b.service ? [b.service] : []);
                for (const s of services) {
                    const nameLower = (s.name || '').toLowerCase();
                    const catLower = (s.category || '').toLowerCase();
                    
                    if (nameLower.includes('rent a car') || catLower.includes('rentals') || catLower.includes('rent a car')) {
                        if (modules.find(m => m.id === 'rent-a-car')?.enabled === false) return false;
                    }
                    if (nameLower.includes('driver for hire') || catLower.includes('driver')) {
                        if (modules.find(m => m.id === 'driver-for-hire')?.enabled === false) return false;
                    }
                    if (nameLower.includes('registration') || nameLower.includes('liaison') || catLower.includes('liaison') || catLower.includes('registration')) {
                        if (modules.find(m => m.id === 'liaison-assistance')?.enabled === false) return false;
                    }
                    if (nameLower.includes('towing') || catLower.includes('towing')) {
                        if (modules.find(m => m.id === 'towing')?.enabled === false) return false;
                    }
                }
            }
            return true;
        });

        // Categorize jobs
        const active = allMyBookings
            .filter(b => ['Upcoming', 'En Route', 'In Progress', 'Booking Confirmed', 'Mechanic Assigned', 'Reschedule Requested', 'On Hold'].includes(b.status))
            .sort((a, b) => new Date(a.date + ' ' + a.time).getTime() - new Date(b.date + ' ' + b.time).getTime());

        const completed = allMyBookings
            .filter(b => b.status === 'Completed' || b.status === 'Work Done')
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const cancelled = allMyBookings
            .filter(b => b.status === 'Cancelled')
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // Count jobs scheduled for today
        const todayStr = new Date().toDateString();
        const todayJobsCount = allMyBookings.filter(b => {
            const d = new Date(b.date.replace(/-/g, '/'));
            return d.toDateString() === todayStr && b.status !== 'Cancelled';
        }).length;

        // Total revenue realized from completed jobs
        const totalRevenue = completed.reduce((sum, b) => {
            const price = b.totalAmount || (b.services?.reduce((s, x) => s + (x.price || 0), 0)) || b.service?.price || 0;
            return sum + price;
        }, 0);

        // Completion Rate
        const totalConsidered = completed.length + cancelled.length;
        const completionRate = totalConsidered > 0 
            ? Math.round((completed.length / totalConsidered) * 100) 
            : 100;

        return {
            activeJobs: active,
            completedJobs: completed,
            cancelledJobs: cancelled,
            stats: {
                total: allMyBookings.length,
                completionRate,
                activeCount: active.length,
                todayCount: todayJobsCount,
                totalRevenue
            }
        };
    }, [db, mechanic, db?.settings?.modules]);

    // Sub-filtered and searched list
    const displayedJobs = useMemo(() => {
        let list: Booking[] = [];
        if (activeTab === 'active') {
            list = activeJobs;
            if (subFilter === 'today') {
                const todayStr = new Date().toDateString();
                list = list.filter(b => new Date(b.date.replace(/-/g, '/')).toDateString() === todayStr);
            } else if (subFilter === 'enroute') {
                list = list.filter(b => b.status === 'En Route' || b.status === 'In Progress');
            }
        } else if (activeTab === 'completed') {
            list = completedJobs;
        } else {
            list = cancelledJobs;
        }

        if (searchTerm.trim()) {
            const lower = searchTerm.toLowerCase();
            return list.filter(b => {
                const customer = b.customerName?.toLowerCase() || '';
                const phone = b.customerPhone?.toLowerCase() || '';
                const plate = b.vehicle?.plateNumber?.toLowerCase() || '';
                const model = `${b.vehicle?.make || ''} ${b.vehicle?.model || ''}`.toLowerCase();
                const serviceList = (b.services || (b.service ? [b.service] : [])).map(s => s.name.toLowerCase()).join(' ');
                const address = b.location?.address?.toLowerCase() || '';

                return (
                    customer.includes(lower) ||
                    phone.includes(lower) ||
                    plate.includes(lower) ||
                    model.includes(lower) ||
                    serviceList.includes(lower) ||
                    address.includes(lower)
                );
            });
        }
        return list;
    }, [activeTab, subFilter, activeJobs, completedJobs, cancelledJobs, searchTerm]);

    // Handle 1-tap quick status transition from card
    const handleQuickStatusUpdate = async (bookingId: string, nextStatus: BookingStatus) => {
        if (isStatusUpdating) return;
        setIsStatusUpdating(true);
        try {
            await updateBookingStatus(bookingId, nextStatus);
        } catch (err) {
            console.error('Failed to update booking status:', err);
        } finally {
            setIsStatusUpdating(false);
        }
    };

    if (loading || !db || !mechanic) {
        return (
            <div className="flex flex-col h-full bg-secondary">
                <Header title="My Jobs" rightAction={<NotificationBell />} icon={<Briefcase size={22} />} />
                <div className="flex-grow flex items-center justify-center">
                    <Spinner size="lg" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-secondary">
            <Header title="My Jobs" rightAction={<NotificationBell />} icon={<Briefcase size={22} />} />

            <main className="flex-grow overflow-y-auto p-3 sm:p-5 space-y-4 pb-28">
                {/* 1. Header Performance Snapshot (Responsive 4-Grid) */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-black text-gray-500 tracking-[0.2em] uppercase">Operations Overview</span>
                            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
                        </div>
                        <div className="flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            <span className="text-[8px] font-black text-emerald-400 uppercase tracking-wider">Live System</span>
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <MetricCard
                            value={stats.activeCount}
                            icon={<Clock size={14} />}
                            label="Active Jobs"
                            subtitle="In-flight work orders"
                            accentColor="text-sky-400"
                            glowClass="bg-sky-500"
                        />
                        <MetricCard
                            value={stats.todayCount}
                            icon={<Calendar size={14} />}
                            label="Today's Tasks"
                            subtitle="Scheduled for today"
                            accentColor="text-primary"
                            glowClass="bg-primary"
                        />
                        <MetricCard
                            value={`₱${stats.totalRevenue >= 1000 ? (stats.totalRevenue / 1000).toFixed(1) + 'k' : stats.totalRevenue.toLocaleString()}`}
                            icon={<DollarSign size={14} />}
                            label="Earned Profit"
                            subtitle="Completed work total"
                            accentColor="text-emerald-400"
                            glowClass="bg-emerald-500"
                        />
                        <MetricCard
                            value={`${stats.completionRate}%`}
                            icon={<CheckCircle2 size={14} />}
                            label="Success Rate"
                            subtitle="Completed vs Cancelled"
                            accentColor="text-amber-400"
                            glowClass="bg-amber-500"
                        />
                    </div>
                </div>

                {/* 2. Search & Filter Bar */}
                <div className="sticky top-0 bg-secondary/95 backdrop-blur-xl pt-1 pb-2.5 z-20 space-y-2.5 -mx-1 px-1">
                    {/* Live Search Input */}
                    <div className="relative group">
                        <input
                            type="text"
                            placeholder="Search client, plate number, bike, or service..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-[#151518] border border-white/5 focus:border-primary/40 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white focus:outline-none transition-all placeholder-gray-500 font-bold shadow-md"
                        />
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors" size={16} />
                        {searchTerm && (
                            <button 
                                onClick={() => setSearchTerm('')} 
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase text-gray-400 hover:text-white bg-white/5 px-1.5 py-0.5 rounded"
                            >
                                Clear
                            </button>
                        )}
                    </div>

                    {/* Primary Tab Switcher */}
                    <div className="flex p-1 bg-[#151518] rounded-xl border border-white/5 shadow-md">
                        {(['active', 'completed', 'cancelled'] as const).map((tab) => {
                            const count = tab === 'active' ? stats.activeCount : tab === 'completed' ? completedJobs.length : cancelledJobs.length;
                            const isActive = activeTab === tab;
                            return (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`flex-1 py-2 rounded-lg text-[9.5px] font-black tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-1.5 ${
                                        isActive 
                                            ? 'bg-primary text-white shadow-md shadow-primary/25 scale-[1.01]' 
                                            : 'text-gray-400 hover:text-white'
                                    }`}
                                >
                                    <span>{tab}</span>
                                    <span className={`text-[8.5px] px-1.5 py-0.2 rounded-full font-bold ${isActive ? 'bg-black/20 text-white' : 'bg-white/5 text-gray-500'}`}>
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Secondary Quick Sub-Filter Chips (Active Tab Only) */}
                    {activeTab === 'active' && (
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                            <span className="text-[9px] font-black text-gray-500 uppercase tracking-wider shrink-0 flex items-center gap-1">
                                <Filter size={10} /> Filter:
                            </span>
                            <button
                                type="button"
                                onClick={() => setSubFilter('all')}
                                className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider shrink-0 border transition-all ${
                                    subFilter === 'all'
                                        ? 'bg-white text-black border-white shadow-sm'
                                        : 'bg-white/5 text-gray-400 border-white/5 hover:text-white'
                                }`}
                            >
                                All Active ({activeJobs.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setSubFilter('today')}
                                className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider shrink-0 border transition-all ${
                                    subFilter === 'today'
                                        ? 'bg-primary text-white border-primary shadow-sm'
                                        : 'bg-white/5 text-gray-400 border-white/5 hover:text-white'
                                }`}
                            >
                                Today's Schedule
                            </button>
                            <button
                                type="button"
                                onClick={() => setSubFilter('enroute')}
                                className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider shrink-0 border transition-all ${
                                    subFilter === 'enroute'
                                        ? 'bg-amber-500 text-black border-amber-500 shadow-sm'
                                        : 'bg-white/5 text-gray-400 border-white/5 hover:text-white'
                                }`}
                            >
                                En Route / In Progress
                            </button>
                        </div>
                    )}
                </div>

                {/* 3. Job Cards List */}
                <div className="space-y-4 min-h-[420px]">
                    {displayedJobs.length > 0 ? (
                        displayedJobs.map(job => (
                            <JobCard
                                key={job.id}
                                booking={job}
                                onOpenChat={(b, c) => setActiveChatBooking({ booking: b, customer: c })}
                                onOpenDirections={(b) => setActiveDirectionsBooking(b)}
                                onQuickStatusUpdate={handleQuickStatusUpdate}
                                isUpdating={isStatusUpdating}
                            />
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-500 space-y-4 text-center px-4 bg-[#151518]/50 rounded-3xl border border-white/5">
                            <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center border border-white/5">
                                <Calendar size={32} className="text-gray-600" />
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-white uppercase tracking-wider">No Work Orders Found</h4>
                                <p className="text-[11px] font-medium text-gray-400 mt-1 max-w-xs mx-auto">
                                    {searchTerm 
                                        ? `No results matched "${searchTerm}". Try searching by customer name, plate number, or vehicle model.` 
                                        : activeTab === 'active' 
                                            ? "You have no active tasks currently. Set your status to Online in your Dashboard to receive new incoming job requests."
                                            : `No ${activeTab} jobs recorded in your history.`
                                    }
                                </p>
                            </div>
                            {activeTab === 'active' && !searchTerm && (
                                <button
                                    onClick={() => navigate('/mechanic-portal')}
                                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-primary border border-primary/20 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                                >
                                    Go to Dashboard
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* Quick Chat Modal */}
            {activeChatBooking && (
                <MechanicCustomerChatModal
                    booking={activeChatBooking.booking}
                    customer={activeChatBooking.customer}
                    mechanic={mechanic}
                    onClose={() => setActiveChatBooking(null)}
                />
            )}

            {/* Quick Live Directions / Route Modal */}
            {activeDirectionsBooking && (
                <LiveRouteMapModal
                    isOpen={true}
                    onClose={() => setActiveDirectionsBooking(null)}
                    customerLocation={activeDirectionsBooking.location ? {
                        lat: activeDirectionsBooking.location.lat,
                        lng: activeDirectionsBooking.location.lng,
                        address: activeDirectionsBooking.location.address
                    } : null}
                    mechanicLocation={mechanic.location ? {
                        lat: mechanic.location.latitude || mechanic.location.lat || 14.5995,
                        lng: mechanic.location.longitude || mechanic.location.lng || 120.9842,
                        address: 'Current Location'
                    } : null}
                    customerName={activeDirectionsBooking.customerName}
                    customerPhone={activeDirectionsBooking.customerPhone}
                    customerVehicle={`${activeDirectionsBooking.vehicle?.year || ''} ${activeDirectionsBooking.vehicle?.make || ''} ${activeDirectionsBooking.vehicle?.model || ''}`}
                    customerAddress={activeDirectionsBooking.location?.address}
                    title={activeDirectionsBooking.service?.name || activeDirectionsBooking.services?.[0]?.name || 'Job Route'}
                    status={activeDirectionsBooking.status}
                    viewMode="mechanic"
                    onCallCustomer={() => {
                        if (activeDirectionsBooking.customerPhone) {
                            window.location.href = `tel:${activeDirectionsBooking.customerPhone.replace(/\s+/g, '')}`;
                        }
                    }}
                />
            )}
        </div>
    );
};

export default MechanicJobsScreen;

