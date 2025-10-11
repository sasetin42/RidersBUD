

import React, { useMemo, useState } from 'react';
import { Booking, Mechanic } from '../../types';
import LiveMap from '../../components/admin/LiveMap';
import { useDatabase } from '../../context/DatabaseContext';
import Spinner from '../../components/Spinner';
import Modal from '../../components/admin/Modal';

const StatCard: React.FC<{ title: string; value: number | string }> = ({ title, value }) => (
    <div className="bg-secondary p-6 rounded-lg shadow">
        <p className="text-sm text-light-gray">{title}</p>
        <p className="text-4xl font-bold text-white mt-1">{value}</p>
    </div>
);

const UnassignedBookingRow: React.FC<{ booking: Booking }> = ({ booking }) => (
    <div className="flex items-center justify-between py-3 border-b border-field last:border-b-0">
        <div>
            <p className="font-semibold text-white">{booking.customerName}</p>
            <p className="text-xs text-light-gray">{booking.service.name}</p>
            <p className="text-xs text-gray-400">{`${booking.vehicle.make} ${booking.vehicle.model}`}</p>
        </div>
        <button className="text-sm font-semibold text-primary hover:text-orange-600 transition-colors">
            Assign
        </button>
    </div>
);


const AdminDashboardScreen: React.FC = () => {
    const { db, loading } = useDatabase();
    const [viewingMechanic, setViewingMechanic] = useState<Mechanic | null>(null);

    const mechanicsWithAvailability = useMemo(() => {
        if (!db) return [];

        const { bookings, mechanics } = db;
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const todayDayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as keyof Required<Mechanic>['availability'];

        // Find IDs of mechanics who are busy today
        const busyMechanicIds = new Set(
            bookings
                .filter(booking => 
                    (booking.status === 'Upcoming' || booking.status === 'En Route' || booking.status === 'In Progress') && 
                    booking.mechanic && 
                    booking.date === todayStr
                )
                .map(booking => booking.mechanic!.id)
        );

        // Map over all mechanics to pass them to the map, but set availability correctly
        return mechanics.map(mechanic => {
            const worksToday = mechanic.availability?.[todayDayOfWeek]?.isAvailable ?? false;
            
            return {
                ...mechanic,
                // A mechanic is only truly available if they are Active, scheduled to work today, AND not busy
                isAvailable: mechanic.status === 'Active' && worksToday && !busyMechanicIds.has(mechanic.id),
            };
        });
    }, [db]);


    if (loading || !db) {
        return <div className="flex items-center justify-center h-full bg-dark-gray"><Spinner size="lg" color="text-white" /></div>
    }

    const { bookings, mechanics, settings } = db;

    const totalBookings = bookings.length;
    const unassignedBookings = bookings.filter(b => !b.mechanic).length;
    const activeMechanics = mechanics.filter(m => m.status === 'Active').length;
    const pendingApprovals = mechanics.filter(m => m.status === 'Pending').length;

    const unassignedBookingsList = bookings.filter(b => !b.mechanic).slice(0, 4);

    const handleViewProfile = (mechanicId: string) => {
        const mechanic = db?.mechanics.find(m => m.id === mechanicId);
        if (mechanic) {
            setViewingMechanic(mechanic);
        }
    };
    
    const statusColors: { [key: string]: string } = {
        Active: 'bg-green-500/20 text-green-300',
        Pending: 'bg-yellow-500/20 text-yellow-300',
        Inactive: 'bg-red-500/20 text-red-300',
    };
    
    return (
        <div className="text-white h-full flex flex-col overflow-y-auto p-6 lg:p-8 bg-dark-gray">
            {/* Page Header */}
            <div className="flex-shrink-0">
                <h1 className="text-4xl font-bold">Admin Dashboard</h1>
                <p className="text-light-gray mt-1">Welcome back, here’s a live summary of your platform.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 my-6 flex-shrink-0">
                <StatCard title="Total Bookings" value={totalBookings.toLocaleString()} />
                <StatCard title="Unassigned Bookings" value={unassignedBookings} />
                <StatCard title="Active Mechanics" value={activeMechanics} />
                <StatCard title="Pending Approvals" value={pendingApprovals} />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow">
                
                {/* Live Mechanic Locations */}
                <div className="lg:col-span-2 bg-secondary p-6 rounded-lg shadow flex flex-col">
                    <h3 className="text-lg font-bold text-white mb-4 flex-shrink-0">Live Mechanic Locations</h3>
                    <div className="flex-grow min-h-[400px]">
                        <LiveMap mechanics={mechanicsWithAvailability} settings={settings} onViewProfile={handleViewProfile} />
                    </div>
                </div>

                {/* Unassigned Bookings */}
                <div className="bg-secondary p-6 rounded-lg shadow">
                    <h3 className="text-lg font-bold text-white mb-4">Unassigned Bookings</h3>
                    <div>
                        {unassignedBookingsList.length > 0 ? (
                            unassignedBookingsList.map(booking => <UnassignedBookingRow key={booking.id} booking={booking} />)
                        ) : (
                            <p className="text-center text-light-gray py-8">No unassigned bookings.</p>
                        )}
                    </div>
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
                        <p className="text-sm text-light-gray mb-4">{viewingMechanic.bio}</p>
                        <div className="border-t border-field pt-4 space-y-1 text-sm">
                            <p><span className="font-semibold text-light-gray w-28 inline-block">Email:</span> {viewingMechanic.email}</p>
                            <p><span className="font-semibold text-light-gray w-28 inline-block">Phone:</span> {viewingMechanic.phone}</p>
                            <p className="mt-2"><span className="font-semibold text-light-gray w-28 inline-block">Specializations:</span> {viewingMechanic.specializations.join(', ')}</p>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default AdminDashboardScreen;