import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import { Booking, BookingStatus } from '../../types';
import Spinner from '../../components/Spinner';
import { useDatabase } from '../../context/DatabaseContext';
import { useMechanicAuth } from '../../context/MechanicAuthContext';
import NotificationBell from '../../components/NotificationBell';
import EnhancedKPICard from '../../components/admin/EnhancedKPICard';
import { LucideClock, LucideCheckCircle2, LucideLayout, LucideSearch, LucideCalendar, LucideUser, LucideChevronRight, Briefcase } from 'lucide-react';

const JobCard: React.FC<{ booking: Booking }> = ({ booking }) => {
    const navigate = useNavigate();

    const statusColors: { [key in BookingStatus]: string } = {
        Upcoming: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        'En Route': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
        'In Progress': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
        Completed: 'bg-green-500/10 text-green-400 border-green-500/20',
        Cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
        'Booking Confirmed': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
        'Mechanic Assigned': 'bg-sky-500/10 text-sky-400 border-sky-500/20',
        'Reschedule Requested': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
        'Work Done': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        'On Hold': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    };

    const services = booking.services || (booking.service ? [booking.service] : []);
    const serviceNames = services.map(s => s.name).join(', ') || 'Unknown Service';
    const basePrice = services.reduce((total, s) => total + (s.price || 0), 0);

    const bookingDate = new Date(booking.date.replace(/-/g, '/'));
    const day = bookingDate.getDate();
    const month = bookingDate.toLocaleDateString('en-US', { month: 'short' });

    // Use service image from first service if available, else a premium fallback
    const serviceImage = services[0]?.imageUrl || booking.service?.imageUrl || '/assets/maintenance.png';

    return (
        <div
            className="bg-[#1A1A1A] p-4 rounded-[2rem] border border-white/5 cursor-pointer hover:bg-[#222] transition-all group relative overflow-hidden shadow-2xl flex gap-4 items-center animate-fadeIn"
            onClick={() => navigate(`/mechanic-portal/job/${booking.id}`)}
        >
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[60px] rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/10 transition-all"></div>

            {/* Left: Service Image with Date Overlay */}
            <div className="relative w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 bg-[#2A2A2A] border border-white/10 shadow-md">
                <img
                    src={serviceImage}
                    alt={serviceNames}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                        (e.target as HTMLImageElement).src = '/assets/maintenance.png';
                    }}
                />
                <div className="absolute top-1 left-1 bg-black/75 backdrop-blur-md px-1.5 py-0.5 rounded-lg text-[9px] font-black text-primary uppercase tracking-wider leading-none shadow-sm">
                    {month} {day}
                </div>
            </div>

            {/* Middle: Complete Details */}
            <div className="flex-grow min-w-0 pr-1">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className={`px-2 py-0.5 text-[8px] font-black rounded-full border uppercase tracking-widest leading-none ${statusColors[booking.status]}`}>
                        {booking.status}
                    </span>
                    <span className="text-[10px] font-bold text-gray-500 tracking-tight flex items-center gap-1 leading-none">
                        <LucideClock size={10} /> {booking.time}
                    </span>
                </div>

                <h3 className="text-sm font-black text-white tracking-tight leading-snug group-hover:text-primary transition-colors line-clamp-1">
                    {serviceNames}
                </h3>

                <div className="flex items-center gap-1.5 mt-1 text-gray-400 flex-wrap">
                    <span className="text-xs font-bold text-gray-300 truncate max-w-[120px]">{booking.customerName}</span>
                    <span className="text-gray-700 font-extrabold">•</span>
                    <span className="text-[11px] font-medium text-gray-500 truncate">
                        {booking.vehicle.year} {booking.vehicle.make} {booking.vehicle.model}
                    </span>
                </div>

                {booking.location?.address && (
                    <p className="text-[9px] text-gray-500 font-black tracking-wider mt-1 line-clamp-1 uppercase">
                        📍 {booking.location.address}
                    </p>
                )}
            </div>

            {/* Right: Action Arrow & Price */}
            <div className="flex flex-col items-end justify-between self-stretch flex-shrink-0 text-right min-h-[80px]">
                <div className="p-1.5 rounded-full bg-white/5 border border-white/5 text-gray-500 group-hover:text-white group-hover:bg-primary transition-all">
                    <LucideChevronRight size={14} />
                </div>
                
                <div>
                    {booking.status === 'Completed' ? (
                        <p className="font-black text-base text-green-400 tracking-tighter">
                            + ₱{(booking.totalAmount || basePrice || 0).toLocaleString()}
                        </p>
                    ) : (
                        <p className="font-black text-sm text-white/55 tracking-tighter italic">
                            ₱{(booking.totalAmount || basePrice || 0).toLocaleString()}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

const PerformanceCard: React.FC<{
    value: string | number;
    icon: React.ReactNode;
    description: string;
    gradient: string;
}> = ({ value, icon, description, gradient }) => {
    return (
        <div className="relative overflow-hidden rounded-2xl p-3 bg-[#1A1A1A] border border-white/5 shadow-xl transition-all duration-300 group flex flex-col justify-between h-24">
            <div className={`absolute inset-0 opacity-10 ${gradient}`}></div>
            <div className="absolute -right-3 -top-3 h-14 w-14 rounded-full bg-white/5 blur-2xl group-hover:bg-white/10 transition-all"></div>

            <div className="relative z-10 flex flex-col justify-between h-full">
                {/* Inline Icon & Data */}
                <div className="flex items-center gap-1.5">
                    <div className="p-1 bg-white/10 rounded-lg backdrop-blur-md border border-white/10 text-primary flex items-center justify-center flex-shrink-0">
                        {icon}
                    </div>
                    <p className="text-lg font-black text-white tracking-tighter leading-none">{value}</p>
                </div>

                {/* Description below */}
                <p className="text-[9px] text-gray-400 font-bold leading-tight tracking-wide group-hover:text-gray-300 transition-colors uppercase">
                    {description}
                </p>
            </div>
        </div>
    );
};


const MechanicJobsScreen: React.FC = () => {
    const { db, loading } = useDatabase();
    const { mechanic } = useMechanicAuth();
    const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'cancelled'>('active');
    const [searchTerm, setSearchTerm] = useState('');

    const {
        activeJobs,
        completedJobs,
        cancelledJobs,
        stats
    } = useMemo(() => {
        if (!mechanic || !db) {
            return { activeJobs: [], completedJobs: [], cancelledJobs: [], stats: { total: 0, completionRate: 0, activeCount: 0 } };
        }

        const modules = db?.settings?.modules;

        const allMyBookings = db.bookings.filter(b => {
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

        // Categorize
        const active = allMyBookings
            .filter(b => ['Upcoming', 'En Route', 'In Progress', 'Booking Confirmed', 'Mechanic Assigned', 'Reschedule Requested'].includes(b.status))
            .sort((a, b) => new Date(a.date + ' ' + a.time).getTime() - new Date(b.date + ' ' + b.time).getTime()); // Closest first

        const completed = allMyBookings
            .filter(b => b.status === 'Completed')
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Newest first

        const cancelled = allMyBookings
            .filter(b => b.status === 'Cancelled')
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // Stats
        const total = allMyBookings.length;
        const completionRate = total > 0 ? (completed.length / (total - cancelled.length || 1)) * 100 : 0;

        return {
            activeJobs: active,
            completedJobs: completed,
            cancelledJobs: cancelled,
            stats: {
                total,
                completionRate: Math.round(completionRate),
                activeCount: active.length,
                completedCount: completed.length,
                cancelledCount: cancelled.length
            }
        };
    }, [db, mechanic, db?.settings?.modules]);

    const displayedJobs = useMemo(() => {
        let list: Booking[] = [];
        if (activeTab === 'active') list = activeJobs;
        else if (activeTab === 'completed') list = completedJobs;
        else list = cancelledJobs;

        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            return list.filter(b =>
                b.customerName.toLowerCase().includes(lowerTerm) ||
                (b.services?.some(s => s.name.toLowerCase().includes(lowerTerm)) || b.service?.name.toLowerCase().includes(lowerTerm)) ||
                b.vehicle.model.toLowerCase().includes(lowerTerm)
            );
        }
        return list;
    }, [activeTab, activeJobs, completedJobs, cancelledJobs, searchTerm]);


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

            <main className="flex-grow overflow-y-auto p-5 space-y-8 pb-32">
                {/* Performance Snapshot */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-[10px] font-black text-gray-500 tracking-[0.3em] uppercase">Performance Snapshot</h3>
                        <div className="flex items-center gap-2 bg-green-500/5 px-2 py-1 rounded-full border border-green-500/10">
                            <span className="text-[8px] font-black text-green-500/70 uppercase tracking-widest">Live System</span>
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                        <PerformanceCard
                            value={stats.activeCount}
                            icon={<LucideClock size={12} />}
                            description="Active"
                            gradient="bg-gradient-to-br from-sky-500 to-blue-700"
                        />
                        <PerformanceCard
                            value={stats.total}
                            icon={<LucideLayout size={12} />}
                            description="Total"
                            gradient="bg-gradient-to-br from-purple-500 to-fuchsia-700"
                        />
                        <PerformanceCard
                            value={`${stats.completionRate}%`}
                            icon={<LucideCheckCircle2 size={12} />}
                            description="Rate"
                            gradient="bg-gradient-to-br from-emerald-500 to-teal-700"
                        />
                    </div>
                </div>

                {/* Search & Tabs */}
                <div className="sticky top-0 bg-secondary/80 backdrop-blur-xl pt-2 pb-4 z-20 space-y-4 -mx-1 px-1">
                    <div className="relative group">
                        <input
                            type="text"
                            placeholder="Search client, bike, or service..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-[#1A1A1A] border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-primary/30 transition-all placeholder-gray-600 font-bold shadow-2xl"
                        />
                        <LucideSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-primary transition-colors" size={20} />
                    </div>

                    <div className="flex p-1.5 bg-[#1A1A1A] rounded-[1.5rem] border border-white/5 shadow-2xl">
                        {(['active', 'completed', 'cancelled'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`flex-1 py-3 rounded-[1rem] text-[10px] font-black tracking-[0.2em] uppercase transition-all duration-300 ${activeTab === tab ? 'bg-white text-black shadow-[0_8px_16px_rgba(255,255,255,0.1)] scale-[1.02]' : 'text-gray-500 hover:text-white'}`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                {/* List */}
                <div className="space-y-5 min-h-[400px]">
                    {displayedJobs.length > 0 ? (
                        displayedJobs.map(job => <JobCard key={job.id} booking={job} />)
                    ) : (
                        <div className="flex flex-col items-center justify-center py-24 text-gray-700 space-y-4">
                            <div className="w-24 h-24 rounded-full bg-white/2 flex items-center justify-center border border-white/5">
                                <LucideCalendar size={40} strokeWidth={1.5} className="opacity-20" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-black tracking-widest uppercase opacity-40">No entries found</p>
                                <p className="text-[10px] font-bold text-gray-800 mt-1 uppercase tracking-tight">Try adjusting your filters or search term</p>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};


export default MechanicJobsScreen;

