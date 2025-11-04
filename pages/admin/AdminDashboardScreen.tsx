

import React, { useMemo, useState, useEffect } from 'react';
import { Booking, Mechanic } from '../../types';
import LiveMap from '../../components/admin/LiveMap';
import { useDatabase } from '../../context/DatabaseContext';
import Spinner from '../../components/Spinner';
import Modal from '../../components/admin/Modal';
import { useNavigate } from 'react-router-dom';

const StatCard: React.FC<{ title: string; value: number | string; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-admin-card p-5 rounded-xl shadow-lg flex items-center gap-4 border border-admin-border">
        <div className="bg-admin-bg p-3 rounded-full text-admin-accent">
            {icon}
        </div>
        <div>
            <p className="text-3xl font-bold text-admin-text-primary">{value}</p>
            <p className="text-sm text-admin-text-secondary">{title}</p>
        </div>
    </div>
);

const UnassignedBookingRow: React.FC<{ booking: Booking }> = ({ booking }) => (
    <div className="flex items-center justify-between py-3">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-admin-bg rounded-full flex items-center justify-center text-admin-accent font-bold">
                {booking.customerName.charAt(0)}
            </div>
            <div>
                <p className="font-semibold text-admin-text-primary text-sm">{booking.customerName}</p>
                <p className="text-xs text-admin-text-secondary">{booking.service.name}</p>
            </div>
        </div>
        <button className="text-xs font-semibold text-white bg-admin-accent hover:bg-orange-600 transition-colors py-2 px-4 rounded-full">
            Assign
        </button>
    </div>
);

const DynamicActivityFeed: React.FC = () => {
    const { db } = useDatabase();
    const navigate = useNavigate();

    const activities = useMemo(() => {
        if (!db) return [];
        const { bookings, mechanics, orders } = db;
        
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
        if (interval > 1) return Math.floor(interval) + " years ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " months ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " days ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " hours ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " minutes ago";
        return Math.floor(seconds) + " seconds ago";
    };

    const icons: { [key: string]: React.ReactNode } = {
        booking: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>,
        completed: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>,
        mechanic: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 11a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1v-1z" /></svg>,
    };
    
    const getActivityText = (activity: any) => {
        if (activity.type === 'booking') {
            const booking = activity.data as Booking;
            if (booking.status === 'Completed' && booking.mechanic) {
                return (
                    <>
                        <button
                            onClick={() => navigate('/admin/mechanics', { state: { viewMechanicId: booking.mechanic!.id } })}
                            className="font-semibold text-admin-accent hover:underline focus:outline-none"
                        >
                            {booking.mechanic.name}
                        </button>
                        <span> completed a job for {booking.customerName}.</span>
                    </>
                );
            }
            return <span>{booking.customerName} booked a {booking.service.name}.</span>;
        }
        if (activity.type === 'mechanic') {
             const mechanic = activity.data as Mechanic;
             return (
                 <>
                    <span>New mechanic application from </span>
                    <button
                        onClick={() => navigate('/admin/mechanics', { state: { viewMechanicId: mechanic.id } })}
                        className="font-semibold text-admin-accent hover:underline focus:outline-none"
                    >
                        {mechanic.name}
                    </button>
                    <span>.</span>
                 </>
             );
        }
        return <span>An unknown activity occurred.</span>;
    };
    
     const getActivityIcon = (activity: any) => {
        if (activity.type === 'booking' && activity.data.status === 'Completed') return icons.completed;
        return icons[activity.type];
    };

    return (
        <div className="bg-admin-card p-6 rounded-xl shadow-lg border border-admin-border">
            <h3 className="text-lg font-bold text-admin-text-primary mb-4">Recent Activity</h3>
            {activities.length > 0 ? (
                 <div className="relative">
                    <div className="absolute left-4 top-1 bottom-1 w-0.5 bg-admin-border"></div>
                    <div className="space-y-6">
                        {activities.map(activity => (
                            <div key={activity.id} className="flex items-start pl-10 relative">
                                <div className="absolute left-0 top-0 w-8 h-8 bg-admin-bg rounded-full flex items-center justify-center text-admin-accent ring-4 ring-admin-card">
                                    {getActivityIcon(activity)}
                                </div>
                                <div>
                                    <p className="text-sm text-admin-text-primary">{getActivityText(activity)}</p>
                                    <p className="text-xs text-admin-text-secondary">{timeSince(activity.timestamp)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : <p className="text-xs text-center text-light-gray">No recent activity.</p>}
        </div>
    );
};


const AdminDashboardScreen: React.FC = () => {
    const { db, loading } = useDatabase();
    const navigate = useNavigate();
    const [viewingMechanic, setViewingMechanic] = useState<Mechanic | null>(null);
    const [lastUpdated, setLastUpdated] = useState(Date.now()); // State to trigger re-render

    // Effect to listen for database changes and force a re-render
    useEffect(() => {
        const handleStorageChange = (event: StorageEvent) => {
            if (event.key === 'ridersbud_database') {
                setLastUpdated(Date.now()); // Trigger re-render
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
        Active: 'bg-green-500/20 text-green-300', Pending: 'bg-yellow-500/20 text-yellow-300', Inactive: 'bg-red-500/20 text-red-300',
    };
    
    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-admin-accent to-orange-500 text-white p-6 rounded-xl shadow-lg">
                <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                <p className="mt-1 opacity-90">Welcome back, here’s a live summary of your platform.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Bookings" value={totalBookings.toLocaleString()} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>} />
                <StatCard title="Unassigned Bookings" value={unassignedBookings.length} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>} />
                <StatCard title="Active Mechanics" value={activeMechanics} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21V9a4 4 0 00-4-4H9" /></svg>} />
                <StatCard title="Pending Approvals" value={pendingApprovals} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 bg-admin-card p-4 sm:p-6 rounded-xl shadow-lg flex flex-col border border-admin-border">
                    <h3 className="text-lg font-bold text-admin-text-primary mb-4 flex-shrink-0">Live Mechanic Locations</h3>
                    <div className="flex-grow rounded-lg overflow-hidden min-h-[450px]">
                        <LiveMap mechanics={mechanicsWithAvailability} settings={settings} onViewProfile={handleViewProfile} />
                    </div>
                </div>

                <div className="flex flex-col gap-6">
                    <div className="bg-admin-card p-4 sm:p-6 rounded-xl shadow-lg flex flex-col border border-admin-border">
                        <h3 className="text-lg font-bold text-admin-text-primary mb-2 flex-shrink-0">Unassigned Bookings</h3>
                        <div className="overflow-y-auto -mr-3 pr-3 divide-y divide-admin-border">
                            {unassignedBookings.length > 0 ? (
                                unassignedBookings.slice(0, 10).map(booking => <UnassignedBookingRow key={booking.id} booking={booking} />)
                            ) : (
                                <div className="flex items-center justify-center h-full py-10">
                                    <p className="text-center text-sm text-admin-text-secondary">No unassigned bookings.</p>
                                </div>
                            )}
                        </div>
                    </div>
                    <DynamicActivityFeed />
                </div>
            </div>
            
            <Modal title="Mechanic Details" isOpen={!!viewingMechanic} onClose={() => setViewingMechanic(null)}>
                {viewingMechanic && (
                    <div className="text-white">
                        <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
                            <img src={viewingMechanic.imageUrl} alt={viewingMechanic.name} className="w-24 h-24 rounded-full object-cover flex-shrink-0" />
                            <div className="text-center sm:text-left">
                                <h3 className="text-2xl font-bold">{viewingMechanic.name}</h3>
                                <p className="text-yellow-400">⭐ {viewingMechanic.rating.toFixed(1)} ({viewingMechanic.reviews} jobs)</p>
                                <span className={`px-2 py-1 mt-2 inline-block text-xs font-semibold rounded-full ${statusColors[viewingMechanic.status]}`}>
                                    {viewingMechanic.status}
                                </span>
                            </div>
                        </div>
                        <p className="text-sm text-admin-text-secondary mb-4">{viewingMechanic.bio}</p>
                        <div className="border-t border-admin-border pt-4 space-y-1 text-sm">
                            <p><span className="font-semibold text-admin-text-secondary w-28 inline-block">Email:</span> {viewingMechanic.email}</p>
                            <p><span className="font-semibold text-admin-text-secondary w-28 inline-block">Phone:</span> {viewingMechanic.phone}</p>
                            <p className="mt-2"><span className="font-semibold text-admin-text-secondary w-28 inline-block">Specializations:</span> {viewingMechanic.specializations.join(', ')}</p>
                        </div>
                        <div className="mt-4 pt-4 border-t border-admin-border flex justify-end">
                            <button onClick={() => { setViewingMechanic(null); navigate('/admin/mechanics'); }} className="bg-admin-accent text-white font-bold py-2 px-4 rounded-lg hover:bg-orange-600 transition">Go to Full Profile</button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default AdminDashboardScreen;
