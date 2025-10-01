import React, { useState, useMemo } from 'react';
import { mockBookings, updateBookingStatus, mockMechanics } from '../../data/mockData';
import { BookingStatus } from '../../types';

const AdminBookingsScreen: React.FC = () => {
    const [dataVersion, setDataVersion] = useState(0);
    const [selectedMechanicId, setSelectedMechanicId] = useState<string>('all');

    const handleStatusChange = (bookingId: string, newStatus: BookingStatus) => {
        updateBookingStatus(bookingId, newStatus);
        setDataVersion(v => v + 1);
    };

    const filteredBookings = useMemo(() => {
        if (selectedMechanicId === 'all') {
            return mockBookings;
        }
        return mockBookings.filter(booking => booking.mechanic?.id === selectedMechanicId);
    }, [selectedMechanicId, dataVersion]);

    const statusColors: { [key in BookingStatus]: string } = {
        Upcoming: 'bg-blue-100 text-blue-800',
        Completed: 'bg-green-100 text-green-800',
        Cancelled: 'bg-red-100 text-red-800',
    };

    return (
        <div className="text-gray-800">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Manage Bookings</h1>
            </div>

            <div className="mb-4">
                <label htmlFor="mechanic-filter" className="block text-sm font-medium text-gray-700 mb-1">
                    Filter by Mechanic:
                </label>
                <select
                    id="mechanic-filter"
                    value={selectedMechanicId}
                    onChange={(e) => setSelectedMechanicId(e.target.value)}
                    className="w-full max-w-xs p-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 focus:ring-primary focus:border-primary"
                    aria-label="Filter bookings by mechanic"
                >
                    <option value="all">All Mechanics</option>
                    {mockMechanics.map(mechanic => (
                        <option key={mechanic.id} value={mechanic.id}>
                            {mechanic.name}
                        </option>
                    ))}
                </select>
            </div>

            <div className="bg-white p-6 rounded-lg shadow overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-gray-200">
                            <th className="p-3 font-bold text-gray-600">Customer</th>
                            <th className="p-3 font-bold text-gray-600">Service</th>
                            <th className="p-3 font-bold text-gray-600">Mechanic</th>
                            <th className="p-3 font-bold text-gray-600">Date & Time</th>
                            <th className="p-3 font-bold text-gray-600">Status</th>
                            <th className="p-3 font-bold text-gray-600">Update Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredBookings.map((booking, index) => (
                             <tr key={booking.id} className={`border-b border-gray-200 last:border-b-0 transition-colors duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100`}>
                                <td className="p-3">{booking.customerName}</td>
                                <td className="p-3">{booking.service.name}</td>
                                <td className="p-3">{booking.mechanic?.name || <span className="text-gray-400">Not Assigned</span>}</td>
                                <td className="p-3">{booking.date} at {booking.time}</td>
                                <td className="p-3">
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[booking.status]}`}>
                                        {booking.status}
                                    </span>
                                </td>
                                <td className="p-3">
                                    <select 
                                        value={booking.status} 
                                        onChange={(e) => handleStatusChange(booking.id, e.target.value as BookingStatus)}
                                        className="bg-gray-200 border border-gray-300 p-1 rounded text-sm"
                                    >
                                        <option value="Upcoming">Upcoming</option>
                                        <option value="Completed">Completed</option>
                                        <option value="Cancelled">Cancelled</option>
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminBookingsScreen;