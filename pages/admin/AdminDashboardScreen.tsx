import React, { useMemo } from 'react';
import { mockMechanics, mockBookings } from '../../data/mockData';
import { Booking } from '../../types';
import LiveMap from '../../components/admin/LiveMap';

const StatCard: React.FC<{ title: string; value: number | string }> = ({ title, value }) => (
    <div className="bg-white p-6 rounded-lg shadow">
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-4xl font-bold text-gray-800 mt-1">{value}</p>
    </div>
);

const UnassignedBookingRow: React.FC<{ booking: Booking }> = ({ booking }) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-200 last:border-b-0">
        <div>
            <p className="font-semibold text-gray-700">{booking.customerName}</p>
            <p className="text-xs text-gray-500">{booking.service.name}</p>
        </div>
        <button className="text-sm font-semibold text-primary hover:text-orange-600 transition-colors">
            Assign
        </button>
    </div>
);


const AdminDashboardScreen: React.FC = () => {
    const totalBookings = mockBookings.length;
    const unassignedBookings = mockBookings.filter(b => !b.mechanic).length;
    const activeMechanics = mockMechanics.length;
    const pendingApprovals = 1; // Mock data from image

    const unassignedBookingsList = mockBookings.filter(b => !b.mechanic).slice(0, 4);
    
    const mechanicsWithAvailability = useMemo(() => {
        // Find all mechanic IDs that have an upcoming booking
        const busyMechanicIds = new Set(
            mockBookings
                .filter(booking => booking.status === 'Upcoming' && booking.mechanic)
                .map(booking => booking.mechanic!.id)
        );

        // Map over mechanics to add an 'isAvailable' flag
        return mockMechanics.map(mechanic => ({
            ...mechanic,
            isAvailable: !busyMechanicIds.has(mechanic.id),
        }));
    }, []); // Empty dependency array because mock data is static for the session

    return (
        <div className="text-gray-800">
            {/* Page Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-gray-800">Admin Dashboard</h1>
            </div>
            
            <div className="mb-8">
                 <h2 className="text-2xl font-bold text-gray-800">Dashboard Overview</h2>
                 <p className="text-gray-500 mt-1">Welcome back, here’s a live summary of your platform.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard title="Total Bookings" value={totalBookings.toLocaleString()} />
                <StatCard title="Unassigned Bookings" value={unassignedBookings} />
                <StatCard title="Active Mechanics" value={activeMechanics} />
                <StatCard title="Pending Approvals" value={pendingApprovals} />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Live Mechanic Locations */}
                <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Live Mechanic Locations</h3>
                    <LiveMap mechanics={mechanicsWithAvailability} />
                </div>

                {/* Unassigned Bookings */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Unassigned Bookings</h3>
                    <div>
                        <div className="flex items-center justify-between pb-2 border-b border-gray-200 text-xs text-gray-400 font-bold uppercase tracking-wider">
                            <span>Customer</span>
                            <span>Service</span>
                            <span>Action</span>
                        </div>
                        {unassignedBookingsList.length > 0 ? (
                            unassignedBookingsList.map(booking => <UnassignedBookingRow key={booking.id} booking={booking} />)
                        ) : (
                            <p className="text-center text-gray-500 py-8">No unassigned bookings.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboardScreen;