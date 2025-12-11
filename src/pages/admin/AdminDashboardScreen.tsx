import React, { useMemo, useState, useEffect } from 'react';
import { Booking, Mechanic } from '../../types';
import LiveMap from '../../components/admin/LiveMap';
import { useDatabase } from '../../context/DatabaseContext';
import Spinner from '../../components/Spinner';
import Modal from '../../components/admin/Modal';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, Wrench, Clock, Activity, MapPin, Search, ChevronRight, User } from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*                                 COMPONENTS                                 */
/* -------------------------------------------------------------------------- */

const StatCard: React.FC<{ title: string; value: number | string; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => (
    <div className="glass-panel p-6 rounded-2xl flex items-center justify-between group hover:scale-[1.02] transition-transform duration-300 relative overflow-hidden">
        {/* Background Glow */}
        <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 group-hover:opacity-20 transition-opacity blur-2xl ${color}`}></div>

        <div>
            <p className="text-3xl font-bold text-white mb-1 group-hover:translate-x-1 transition-transform">{value}</p>
            <p className="text-sm font-medium text-gray-400 uppercase tracking-wide">{title}</p>
        </div>
        <div className={`p-4 rounded-xl ${color} bg-opacity-10 text-white shadow-inner ring-1 ring-white/10 group-hover:rotate-12 transition-transform`}>
            {icon}
        </div>
    </div>
);

const UnassignedBookingRow: React.FC<{ booking: Booking }> = ({ booking }) => {
    const navigate = useNavigate();
    return (
        <div className="group flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5 cursor-pointer">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-sm font-bold text-gray-300 ring-2 ring-[#0a0a0a]">
                    {booking.customerName.charAt(0)}
                </div>
                <div>
                    <h4 className="text-sm font-bold text-white group-hover:text-primary transition-colors">{booking.service.name}</h4>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        <User size={10} />
                        <span>{booking.customerName}</span>
                        <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                        <Clock size={10} />
                        <span>{booking.date} @ {booking.time}</span>
                    </div>
                </div>
            </div>
            <button
                onClick={(e) => { e.stopPropagation(); navigate('/admin/bookings'); }}
                className="px-4 py-1.5 rounded-lg bg-admin-accent/10 border border-admin-accent/20 text-admin-accent text-xs font-bold hover:bg-admin-accent hover:text-white transition-all shadow-sm"
            >
                Assign
            </button>
        </div>
    );
}

const ActivityFeedItem: React.FC<{ activity: any, timeSince: (date: number) => string }> = ({ activity, timeSince }) => {
    const navigate = useNavigate();

    // Determine icon and color based on activity type
    let Icon = Activity;
    let bgColor = 'bg-gray-500';
    let iconColor = 'text-gray-300';

    if (activity.type === 'booking') {
        Icon = Calendar;
        bgColor = 'bg-blue-500';
        iconColor = 'text-blue-300';
        if (activity.data.status === 'Completed') {
            bgColor = 'bg-green-500';
            iconColor = 'text-green-300';
        }
    } else if (activity.type === 'mechanic') {
        Icon = Wrench;
        bgColor = 'bg-orange-500';
        iconColor = 'text-orange-300';
    }

    const renderContent = () => {
        if (activity.type === 'booking') {
            const booking = activity.data as Booking;
            if (booking.status === 'Completed' && booking.mechanic) {
                return (
                    <span className="text-sm text-gray-300">
                        <span className="font-bold text-white cursor-pointer hover:underline hover:text-primary" onClick={() => navigate('/admin/mechanics')}>{booking.mechanic.name}</span> completed a job for <span className="text-white">{booking.customerName}</span>.
                    </span>
                );
            }
            return (
                <span className="text-sm text-gray-300">
                    <span className="font-bold text-white">{booking.customerName}</span> booked a <span className="text-white bg-white/5 px-1.5 py-0.5 rounded text-xs border border-white/5">{booking.service.name}</span>.
                </span>
            );
        }
        if (activity.type === 'mechanic') {
            const mechanic = activity.data as Mechanic;
            return (
                <span className="text-sm text-gray-300">
                    New mechanic application: <span className="font-bold text-white cursor-pointer hover:underline hover:text-primary" onClick={() => navigate('/admin/mechanics')}>{mechanic.name}</span>.
                </span>
            );
        }
    };

    return (
        <div className="flex gap-4 relative pl-2 group">
            {/* Timeline Line */}
            <div className="absolute left-[19px] top-8 bottom-[-16px] w-[2px] bg-white/5 group-last:hidden"></div>

            <div className={`relative z-10 w-10 h-10 rounded-xl ${bgColor}/10 border border-${iconColor}/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                <Icon size={18} className={iconColor} />
            </div>
            <div className="flex-1 pb-4 border-b border-white/5 group-last:border-0 pt-0.5">
                {renderContent()}
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <Clock size={10} />
                    {timeSince(activity.timestamp)}
                </p>
            </div>
        </div>
    );
};


/* -------------------------------------------------------------------------- */
/*                               MAIN COMPONENT                               */
/* -------------------------------------------------------------------------- */

const AdminDashboardScreen: React.FC = () => {
    const { db, loading } = useDatabase();
    const navigate = useNavigate();
    const [viewingMechanic, setViewingMechanic] = useState<Mechanic | null>(null);
    const [lastUpdated, setLastUpdated] = useState(Date.now());

    // Listen for database changes
    useEffect(() => {
        const handleStorageChange = (event: StorageEvent) => {
            if (event.key === 'ridersbud_database') {
                setLastUpdated(Date.now());
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    // Derived Data
    const mechanicsWithAvailability = useMemo(() => {
        if (!db) return [];
        const { bookings, mechanics } = db;
        const today = new Date().toISOString().split('T')[0];
        const todayDayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as keyof Required<Mechanic>['availability'];
        const busyMechanicIds = new Set(bookings.filter(b => (b.status === 'Upcoming' || b.status === 'En Route' || b.status === 'In Progress') && b.mechanic && b.date === today && b.mechanic.id).map(b => b.mechanic!.id));
        return mechanics.map(mechanic => ({ ...mechanic, isAvailable: mechanic.status === 'Active' && (mechanic.availability?.[todayDayOfWeek]?.isAvailable ?? false) && !busyMechanicIds.has(mechanic.id) }));
    }, [db, lastUpdated]);

    const activities = useMemo(() => {
        if (!db) return [];
        const { bookings, mechanics } = db;
        const feed = [
            ...bookings.map(b => ({ id: `b-${b.id}`, timestamp: new Date(b.date + ' ' + b.time).getTime(), type: 'booking', data: b })),
            ...mechanics.filter(m => m.registrationDate).map(m => ({ id: `m-${m.id}`, timestamp: new Date(m.registrationDate!).getTime(), type: 'mechanic', data: m }))
        ];
        return feed.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
    }, [db]);


    const timeSince = (date: number) => {
        const seconds = Math.floor((new Date().getTime() - date) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + "y ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + "mo ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + "d ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + "h ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + "m ago";
        return Math.floor(seconds) + "s ago";
    };

    if (loading || !db) return <div className="flex items-center justify-center h-full"><Spinner size="lg" color="text-white" /></div>;

    const { bookings, mechanics, settings } = db;
    const totalBookings = bookings.length;
    const unassignedBookings = bookings.filter(b => b.status === 'Upcoming' && !b.mechanic);
    const activeMechanics = mechanics.filter(m => m.status === 'Active').length;
    const pendingApprovals = mechanics.filter(m => m.status === 'Pending').length;

    return (
        <div className="space-y-8">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard Overview</h1>
                    <p className="text-gray-400 mt-1">Real-time platform insights and activity monitor.</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 font-mono bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                        Last Updated: {new Date().toLocaleTimeString()}
                    </span>
                    <button className="bg-primary hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-xl shadow-lg shadow-orange-900/20 transition-all active:scale-95 flex items-center gap-2">
                        <Search size={18} />
                        <span>Find Booking</span>
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Bookings" value={totalBookings.toLocaleString()} icon={<Calendar size={24} />} color="bg-blue-500" />
                <StatCard title="Unassigned Ops" value={unassignedBookings.length} icon={<Activity size={24} />} color="bg-red-500" />
                <StatCard title="Active Mechanics" value={activeMechanics} icon={<Wrench size={24} />} color="bg-green-500" />
                <StatCard title="Pending Review" value={pendingApprovals} icon={<Clock size={24} />} color="bg-yellow-500" />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

                {/* Live Map Section (Takes up 2 cols) */}
                <div className="xl:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <MapPin size={20} className="text-primary" />
                            Live Fleet Map
                        </h3>
                        <button className="text-xs text-primary font-bold hover:underline">View Full Map</button>
                    </div>

                    <div className="glass-panel p-1 rounded-2xl border border-white/10 h-[500px] overflow-hidden relative group">
                        <div className="absolute inset-0 z-0">
                            <LiveMap mechanics={mechanicsWithAvailability} settings={settings} onViewProfile={(id) => {
                                const m = db.mechanics.find(mech => mech.id === id);
                                if (m) setViewingMechanic(m);
                            }} />
                        </div>
                        {/* Overlay Controls (Mock) */}
                        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
                            <div className="bg-[#0a0a0a]/80 backdrop-blur text-white p-2 rounded-lg border border-white/10 shadow-lg cursor-pointer hover:bg-white/10">
                                <Users size={18} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Unassigned & Activity */}
                <div className="flex flex-col gap-8">

                    {/* Unassigned Bookings */}
                    <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col max-h-[400px]">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-white">Action Required</h3>
                            <span className="text-xs font-bold bg-red-500/20 text-red-400 px-2 py-1 rounded-md">{unassignedBookings.length} Pending</span>
                        </div>

                        <div className="overflow-y-auto custom-scrollbar -mr-2 pr-2 space-y-2 flex-1">
                            {unassignedBookings.length > 0 ? (
                                unassignedBookings.map(booking => <UnassignedBookingRow key={booking.id} booking={booking} />)
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-2 opacity-50">
                                    <CheckCircle size={40} />
                                    <p className="text-sm">All operations clear</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Activity Feed */}
                    <div className="glass-panel p-6 rounded-2xl border border-white/5">
                        <h3 className="text-lg font-bold text-white mb-6">Recent Activity</h3>
                        <div className="space-y-2">
                            {activities.map(activity => (
                                <ActivityFeedItem key={activity.id} activity={activity} timeSince={timeSince} />
                            ))}
                            {activities.length === 0 && <p className="text-gray-500 text-sm text-center">No recent activity.</p>}
                        </div>
                        <button className="w-full mt-6 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all flex items-center justify-center gap-1">
                            View Activity Log <ChevronRight size={14} />
                        </button>
                    </div>

                </div>
            </div>

            {/* Mechanic Detail Modal */}
            <Modal title="Mechanic Details" isOpen={!!viewingMechanic} onClose={() => setViewingMechanic(null)}>
                {viewingMechanic && (
                    <div className="text-white">
                        <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
                            <img src={viewingMechanic.imageUrl} alt={viewingMechanic.name} className="w-24 h-24 rounded-full object-cover flex-shrink-0 ring-4 ring-white/10" />
                            <div className="text-center sm:text-left">
                                <h3 className="text-2xl font-bold">{viewingMechanic.name}</h3>
                                <p className="text-yellow-400 font-bold">⭐ {viewingMechanic.rating.toFixed(1)} <span className="text-gray-500 font-normal">({viewingMechanic.reviews} jobs)</span></p>
                                <span className={`px-3 py-1 mt-2 inline-block text-xs font-bold rounded-full ${viewingMechanic.status === 'Active' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                                    {viewingMechanic.status}
                                </span>
                            </div>
                        </div>
                        <p className="text-sm text-gray-300 mb-6 bg-white/5 p-4 rounded-xl italic">"{viewingMechanic.bio}"</p>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="p-3 bg-white/5 rounded-xl">
                                <p className="text-xs text-gray-500">Email Address</p>
                                <p className="font-semibold truncate">{viewingMechanic.email}</p>
                            </div>
                            <div className="p-3 bg-white/5 rounded-xl">
                                <p className="text-xs text-gray-500">Phone</p>
                                <p className="font-semibold truncate">{viewingMechanic.phone}</p>
                            </div>
                        </div>

                        <div className="mt-6 pt-6 border-t border-white/10 flex justify-end gap-3">
                            <button onClick={() => setViewingMechanic(null)} className="px-4 py-2 text-gray-400 hover:text-white font-bold transition-colors">Close</button>
                            <button onClick={() => { setViewingMechanic(null); navigate('/admin/mechanics'); }} className="bg-primary hover:bg-orange-600 text-white font-bold py-2 px-6 rounded-xl transition-all shadow-lg shadow-orange-900/20">
                                Full Profile
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default AdminDashboardScreen;

// Simple CheckCircle Icon component for when empty state
const CheckCircle = ({ size }: { size: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
);
