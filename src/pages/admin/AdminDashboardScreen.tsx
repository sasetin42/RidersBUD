

import React, { useMemo, useState, useEffect } from 'react';
import { Booking, Mechanic } from '../../types';
import LiveMap from '../../components/admin/LiveMap';
import { useDatabase } from '../../context/DatabaseContext';
import Spinner from '../../components/Spinner';
import Modal from '../../components/admin/Modal';
import { useNavigate } from 'react-router-dom';

const StatCard: React.FC<{ title: string; value: number | string; icon: React.ReactNode; trend?: string; color?: string }> = ({ title, value, icon, trend, color = "admin-accent" }) => (
    <div className="glass-card p-6 relative overflow-hidden group hover:scale-[1.02] transition-all duration-300">
        <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-${color}`}>
            {React.cloneElement(icon as React.ReactElement, { className: "w-24 h-24" })}
        </div>
        <div className="relative z-10 flex flex-col h-full justify-between">
            <div className={`w-12 h-12 rounded-xl bg-${color}/20 flex items-center justify-center text-${color} mb-4 group-hover:scale-110 transition-transform duration-300 shadow-glow-sm`}>
                {icon}
            </div>
            <div>
                <p className="text-4xl font-bold text-white mb-1 tracking-tight">{value}</p>
                <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">{title}</p>
            </div>
            {trend && (
                <div className="mt-4 flex items-center gap-2 text-xs font-medium text-green-400 bg-green-400/10 py-1 px-2 rounded-lg w-fit">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                    {trend}
                </div>
            )}
        </div>
    </div>
);

const UnassignedBookingRow: React.FC<{ booking: Booking }> = ({ booking }) => (
    <div className="flex items-center justify-between p-4 glass-light rounded-xl border border-white/5 hover:border-admin-accent/30 hover:bg-white/5 transition-all group">
        <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-gray-700 to-gray-900 rounded-full flex items-center justify-center text-white font-bold shadow-lg border border-white/10">
                {booking.customerName.charAt(0)}
            </div>
            <div>
                <p className="font-bold text-white text-sm group-hover:text-admin-accent transition-colors">{booking.customerName}</p>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide">{booking.service.name}</span>
                    <span>• {booking.time}</span>
                </div>
            </div>
        </div>
        <button className="text-xs font-bold text-white bg-admin-accent hover:bg-orange-600 hover:shadow-glow transition-all py-2 px-4 rounded-lg shadow-lg shadow-admin-accent/20">
            Assign
        </button>
    </div>
);

const DynamicActivityFeed: React.FC = () => {
    const { db } = useDatabase();
    const navigate = useNavigate();

    const activities = useMemo(() => {
        if (!db) return [];
        const { bookings, mechanics } = db;

        const feed = [
            ...bookings.map(b => ({
                id: `b-${b.id}`,
                timestamp: new Date(b.date + ' ' + b.time).getTime(),
                type: 'booking' as const,
                data: b
            })),
            ...mechanics.filter(m => m.registrationDate).map(m => ({
                id: `m-${m.id}`,
                timestamp: new Date(m.registrationDate!).getTime(),
                type: 'mechanic' as const,
                data: m
            }))
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
        return "Just now";
    };

    const icons: { [key: string]: React.ReactNode } = {
        booking: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>,
        completed: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>,
        mechanic: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 11a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1v-1z" /></svg>,
    };

    const getActivityText = (activity: any) => {
        if (activity.type === 'booking') {
            const booking = activity.data as Booking;
            if (booking.status === 'Completed' && booking.mechanic) {
                return (
                    <>
                        <button onClick={() => navigate('/admin/mechanics', { state: { viewMechanicId: booking.mechanic!.id } })} className="font-bold text-white hover:text-admin-accent transition-colors">{booking.mechanic.name}</button>
                        <span className="text-gray-400"> completed job for </span>
                        <span className="text-gray-300">{booking.customerName}</span>
                    </>
                );
            }
            return <><span className="font-bold text-white">{booking.customerName}</span> <span className="text-gray-400">booked</span> <span className="text-admin-accent">{booking.service.name}</span></>;
        }
        if (activity.type === 'mechanic') {
            const mechanic = activity.data as Mechanic;
            return (
                <>
                    <span className="text-gray-400">New mechanic application: </span>
                    <button onClick={() => navigate('/admin/mechanics', { state: { viewMechanicId: mechanic.id } })} className="font-bold text-white hover:text-admin-accent transition-colors">{mechanic.name}</button>
                </>
            );
        }
        return <span className="text-gray-400">Unknown activity</span>;
    };

    const getActivityIcon = (activity: any) => {
        if (activity.type === 'booking' && activity.data.status === 'Completed') return icons.completed;
        return icons[activity.type];
    };

    return (
        <div className="glass-card p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    Recent Activity
                </h3>
                <button className="text-xs font-bold text-admin-accent hover:text-white transition-colors">View All</button>
            </div>

            {activities.length > 0 ? (
                <div className="relative flex-1 overflow-y-auto custom-scrollbar pr-2">
                    <div className="absolute left-4 top-2 bottom-2 w-px bg-gradient-to-b from-white/20 via-white/5 to-transparent"></div>
                    <div className="space-y-6">
                        {activities.map(activity => (
                            <div key={activity.id} className="flex items-start pl-10 relative group">
                                <div className="absolute left-[11px] top-1 w-2.5 h-2.5 bg-admin-bg rounded-full border-2 border-admin-accent z-10 group-hover:scale-125 transition-transform"></div>
                                <div className="glass-light p-3 rounded-xl border border-white/5 w-full hover:bg-white/5 transition-colors">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="text-admin-accent">{getActivityIcon(activity)}</div>
                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{timeSince(activity.timestamp)}</p>
                                    </div>
                                    <p className="text-sm leading-relaxed">{getActivityText(activity)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">No recent activity</div>}
        </div>
    );
};


const AdminDashboardScreen: React.FC = () => {
    const { db, loading } = useDatabase();
    const navigate = useNavigate();
    const [viewingMechanic, setViewingMechanic] = useState<Mechanic | null>(null);
    const [lastUpdated, setLastUpdated] = useState(Date.now());

    useEffect(() => {
        const handleStorageChange = (event: StorageEvent) => {
            if (event.key === 'ridersbud_database') {
                setLastUpdated(Date.now());
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const mechanicsWithAvailability = useMemo(() => {
        if (!db) return [];
        const { bookings, mechanics } = db;
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const todayDayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as keyof Required<Mechanic>['availability'];
        const busyMechanicIds = new Set(bookings.filter(b => (b.status === 'Upcoming' || b.status === 'En Route' || b.status === 'In Progress') && b.mechanic && b.date === todayStr).map(b => b.mechanic!.id));
        return mechanics.map(mechanic => ({ ...mechanic, isAvailable: mechanic.status === 'Active' && (mechanic.availability?.[todayDayOfWeek]?.isAvailable ?? false) && !busyMechanicIds.has(mechanic.id) }));
    }, [db, lastUpdated]);


    if (loading || !db) {
        return <div className="flex items-center justify-center h-full"><Spinner size="lg" color="text-white" /></div>
    }

    const { bookings, mechanics, settings } = db;

    const totalBookings = bookings.length;
    const unassignedBookings = bookings.filter(b => b.status === 'Upcoming' && !b.mechanic);
    const activeMechanics = mechanics.filter(m => m.status === 'Active').length;
    const pendingApprovals = mechanics.filter(m => m.status === 'Pending').length;

    const handleViewProfile = (mechanicId: string) => {
        const mechanic = db?.mechanics.find(m => m.id === mechanicId);
        if (mechanic) setViewingMechanic(mechanic);
    };

    const statusColors: { [key: string]: string } = {
        Active: 'bg-green-500/20 text-green-300 border-green-500/30',
        Pending: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
        Inactive: 'bg-red-500/20 text-red-300 border-red-500/30',
    };

    return (
        <div className="space-y-8 pb-8">
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-admin-accent to-orange-600 p-8 shadow-2xl">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-black/10 rounded-full blur-2xl"></div>
                <div className="relative z-10">
                    <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Admin Dashboard</h1>
                    <p className="text-white/80 text-lg font-medium">Welcome back! Here's what's happening in your platform today.</p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Bookings"
                    value={totalBookings.toLocaleString()}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                    trend="+12% this week"
                    color="blue-500"
                />
                <StatCard
                    title="Unassigned"
                    value={unassignedBookings.length}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                    color="yellow-500"
                />
                <StatCard
                    title="Active Mechanics"
                    value={activeMechanics}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
                    color="green-500"
                />
                <StatCard
                    title="Pending Approvals"
                    value={pendingApprovals}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                    color="purple-500"
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Live Map Section */}
                <div className="xl:col-span-2 glass-card p-1 rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col h-[600px]">
                    <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/20 backdrop-blur-md">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                            </span>
                            Live Mechanic Locations
                        </h3>
                        <div className="flex gap-2">
                            <span className="text-xs font-medium text-gray-400 bg-white/5 px-2 py-1 rounded-lg border border-white/5">Auto-refreshing</span>
                        </div>
                    </div>
                    <div className="flex-grow relative bg-gray-900">
                        <LiveMap mechanics={mechanicsWithAvailability} settings={settings} onViewProfile={handleViewProfile} />
                    </div>
                </div>

                {/* Sidebar Column */}
                <div className="flex flex-col gap-8 h-[600px]">
                    {/* Unassigned Bookings */}
                    <div className="glass-card p-6 flex flex-col h-1/2">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-white">Unassigned Bookings</h3>
                            <span className="bg-yellow-500/20 text-yellow-400 text-xs font-bold px-2 py-1 rounded-lg border border-yellow-500/20">{unassignedBookings.length} Pending</span>
                        </div>
                        <div className="overflow-y-auto custom-scrollbar -mr-2 pr-2 space-y-3 flex-1">
                            {unassignedBookings.length > 0 ? (
                                unassignedBookings.slice(0, 10).map(booking => <UnassignedBookingRow key={booking.id} booking={booking} />)
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-2">
                                    <svg className="w-12 h-12 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    <p className="text-sm">All bookings assigned!</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Activity Feed */}
                    <div className="h-1/2">
                        <DynamicActivityFeed />
                    </div>
                </div>
            </div>

            {/* Mechanic Details Modal */}
            <Modal title="Mechanic Details" isOpen={!!viewingMechanic} onClose={() => setViewingMechanic(null)}>
                {viewingMechanic && (
                    <div className="text-white p-2">
                        <div className="flex flex-col sm:flex-row items-center gap-6 mb-6">
                            <div className="relative">
                                <img src={viewingMechanic.imageUrl} alt={viewingMechanic.name} className="w-28 h-28 rounded-full object-cover border-4 border-admin-accent shadow-glow" />
                                <div className={`absolute bottom-1 right-1 w-6 h-6 rounded-full border-4 border-gray-900 ${viewingMechanic.status === 'Active' ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                            </div>
                            <div className="text-center sm:text-left flex-1">
                                <h3 className="text-3xl font-bold mb-1">{viewingMechanic.name}</h3>
                                <div className="flex items-center justify-center sm:justify-start gap-3 mb-3">
                                    <span className="text-yellow-400 font-bold flex items-center gap-1"><span className="text-lg">⭐</span> {viewingMechanic.rating.toFixed(1)}</span>
                                    <span className="text-gray-400">•</span>
                                    <span className="text-gray-300">{viewingMechanic.reviews} jobs completed</span>
                                </div>
                                <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full border ${statusColors[viewingMechanic.status]}`}>
                                    {viewingMechanic.status}
                                </span>
                            </div>
                        </div>

                        <div className="glass-light p-4 rounded-xl border border-white/5 mb-6">
                            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Bio</h4>
                            <p className="text-gray-300 italic">"{viewingMechanic.bio}"</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            <div className="glass-light p-3 rounded-lg border border-white/5">
                                <p className="text-gray-500 text-xs uppercase font-bold mb-1">Contact Email</p>
                                <p className="text-white font-medium truncate">{viewingMechanic.email}</p>
                            </div>
                            <div className="glass-light p-3 rounded-lg border border-white/5">
                                <p className="text-gray-500 text-xs uppercase font-bold mb-1">Phone Number</p>
                                <p className="text-white font-medium">{viewingMechanic.phone}</p>
                            </div>
                            <div className="glass-light p-3 rounded-lg border border-white/5 sm:col-span-2">
                                <p className="text-gray-500 text-xs uppercase font-bold mb-1">Specializations</p>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {viewingMechanic.specializations.map(spec => (
                                        <span key={spec} className="bg-admin-accent/20 text-admin-accent px-2 py-1 rounded text-xs font-bold border border-admin-accent/20">{spec}</span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 flex justify-end pt-6 border-t border-white/10">
                            <button onClick={() => { setViewingMechanic(null); navigate('/admin/mechanics'); }} className="bg-gradient-to-r from-admin-accent to-orange-600 text-white font-bold py-3 px-8 rounded-xl hover:shadow-glow hover:scale-[1.02] transition-all shadow-lg">
                                View Full Profile
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default AdminDashboardScreen;
