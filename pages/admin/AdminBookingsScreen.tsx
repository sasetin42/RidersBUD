
import React, { useState, useMemo } from 'react';
import { Booking, BookingStatus } from '../../types';
import { useDatabase } from '../../context/DatabaseContext';
import Spinner from '../../components/Spinner';
import Modal from '../../components/admin/Modal';

type SortableKeys = 'customerName' | 'mechanicName' | 'date';

const CancellationModal: React.FC<{
    booking: Booking;
    onClose: () => void;
    onConfirm: (reason: string) => void;
}> = ({ booking, onClose, onConfirm }) => {
    const [reason, setReason] = useState('');
    const [error, setError] = useState('');

    const handleConfirm = () => {
        if (!reason.trim()) {
            setError('Please provide a reason for cancellation.');
            return;
        }
        setError('');
        onConfirm(reason);
    };

    return (
        <Modal title={`Cancel Booking #${booking.id.slice(-6)}`} isOpen={true} onClose={onClose}>
            <div className="space-y-4">
                <p>Please provide a reason for cancelling the booking for <span className="font-bold text-primary">{booking.customerName}</span>.</p>
                <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g., Customer request, mechanic unavailable..."
                    rows={4}
                    className={`w-full p-3 bg-field border rounded placeholder-light-gray ${error ? 'border-red-500' : 'border-gray-600 focus:ring-primary focus:border-primary'}`}
                />
                {error && <p className="text-red-400 text-xs">{error}</p>}
                <div className="flex justify-end gap-4">
                    <button onClick={onClose} className="bg-field text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-600 transition">Go Back</button>
                    <button onClick={handleConfirm} className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 transition">Confirm Cancellation</button>
                </div>
            </div>
        </Modal>
    );
};


const AdminBookingsScreen: React.FC = () => {
    const { db, updateBookingStatus, cancelBooking, loading } = useDatabase();
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [selectedMechanicId, setSelectedMechanicId] = useState<string>('all');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedStatus, setSelectedStatus] = useState<BookingStatus | 'all'>('all');
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' }>({ key: 'date', direction: 'descending' });
    const [cancellingBooking, setCancellingBooking] = useState<Booking | null>(null);

    if (loading || !db) {
        return <div className="flex items-center justify-center h-full bg-dark-gray"><Spinner size="lg" color="text-white" /></div>
    }

    const { bookings, mechanics, settings } = db;

    const serviceCategories = useMemo(() => {
        return ['all', ...settings.serviceCategories];
    }, [settings.serviceCategories]);

    const bookingStatuses: Array<BookingStatus | 'all'> = ['all', 'Upcoming', 'En Route', 'In Progress', 'Completed', 'Cancelled'];

    const handleStatusChange = (booking: Booking, newStatus: BookingStatus) => {
        if (newStatus === 'Cancelled') {
            setCancellingBooking(booking);
        } else {
            updateBookingStatus(booking.id, newStatus);
        }
    };
    
    const handleConfirmCancellation = (reason: string) => {
        if (cancellingBooking) {
            cancelBooking(cancellingBooking.id, reason);
            setCancellingBooking(null);
        }
    };

    const requestSort = (key: SortableKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const sortedAndFilteredBookings = useMemo(() => {
        let filteredBookings = bookings.filter(booking => {
            const mechanicMatch = selectedMechanicId === 'all' || booking.mechanic?.id === selectedMechanicId;
            const categoryMatch = selectedCategory === 'all' || booking.service.category === selectedCategory;
            const statusMatch = selectedStatus === 'all' || booking.status === selectedStatus;
             const searchMatch = searchQuery === '' || 
                booking.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                booking.service.name.toLowerCase().includes(searchQuery.toLowerCase());
            return mechanicMatch && categoryMatch && statusMatch && searchMatch;
        });

        if (sortConfig.key) {
            filteredBookings.sort((a, b) => {
                let aValue: string | number;
                let bValue: string | number;

                if (sortConfig.key === 'mechanicName') {
                    aValue = a.mechanic?.name || '';
                    bValue = b.mechanic?.name || '';
                } else if (sortConfig.key === 'date') {
                    aValue = new Date(`${a.date} ${a.time}`).getTime();
                    bValue = new Date(`${b.date} ${b.time}`).getTime();
                } else {
                    aValue = a[sortConfig.key as 'customerName'] as string;
                    bValue = b[sortConfig.key as 'customerName'] as string;
                }

                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return filteredBookings;
    }, [selectedMechanicId, selectedCategory, selectedStatus, searchQuery, bookings, sortConfig]);
    
    const getSortIndicator = (key: SortableKeys) => {
        if (sortConfig.key !== key) return null;
        return sortConfig.direction === 'ascending' ? '▲' : '▼';
    };

    const statusColors: { [key in BookingStatus]: string } = {
        Upcoming: 'bg-blue-900/50 text-blue-300 border border-blue-500/30',
        Completed: 'bg-green-900/50 text-green-300 border border-green-500/30',
        Cancelled: 'bg-red-900/50 text-red-300 border border-red-500/30',
        'En Route': 'bg-yellow-900/50 text-yellow-300 border border-yellow-500/30',
        'In Progress': 'bg-purple-900/50 text-purple-300 border border-purple-500/30',
    };

    return (
        <div className="text-white flex flex-col h-full overflow-hidden bg-dark-gray">
            <div className="flex-shrink-0 px-6 lg:px-8 py-6">
                <h1 className="text-3xl font-bold mb-6">Manage Bookings</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
                    <div>
                        <label htmlFor="search-filter" className="block text-sm font-medium text-light-gray mb-1">
                            Search Customer/Service:
                        </label>
                        <input
                            id="search-filter"
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="e.g., Juan or Change Oil"
                            className="w-full p-2 bg-field border border-secondary text-gray-200 rounded-lg focus:ring-primary focus:border-primary"
                            aria-label="Search bookings by customer or service"
                        />
                    </div>
                    <div>
                        <label htmlFor="mechanic-filter" className="block text-sm font-medium text-light-gray mb-1">
                            Filter by Mechanic:
                        </label>
                        <select
                            id="mechanic-filter"
                            value={selectedMechanicId}
                            onChange={(e) => setSelectedMechanicId(e.target.value)}
                            className="w-full p-2 bg-field border border-secondary text-gray-200 rounded-lg focus:ring-primary focus:border-primary"
                            aria-label="Filter bookings by mechanic"
                        >
                            <option value="all">All Mechanics</option>
                            {mechanics.filter(m => m.status === 'Active').map(mechanic => (
                                <option key={mechanic.id} value={mechanic.id}>
                                    {mechanic.name}
                                </option>
                            ))}
                        </select>
                    </div>
                     <div>
                        <label htmlFor="category-filter" className="block text-sm font-medium text-light-gray mb-1">
                            Filter by Service Category:
                        </label>
                        <select
                            id="category-filter"
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="w-full p-2 bg-field border border-secondary text-gray-200 rounded-lg focus:ring-primary focus:border-primary"
                            aria-label="Filter bookings by service category"
                        >
                            {serviceCategories.map(category => (
                                <option key={category} value={category} className="capitalize">{category === 'all' ? 'All Categories' : category}</option>
                            ))}
                        </select>
                    </div>
                     <div>
                        <label htmlFor="status-filter" className="block text-sm font-medium text-light-gray mb-1">
                            Filter by Booking Status:
                        </label>
                        <select
                            id="status-filter"
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value as any)}
                            className="w-full p-2 bg-field border border-secondary text-gray-200 rounded-lg focus:ring-primary focus:border-primary"
                            aria-label="Filter bookings by status"
                        >
                            {bookingStatuses.map(status => (
                                <option key={status} value={status} className="capitalize">{status === 'all' ? 'All Statuses' : status}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-auto px-6 lg:px-8">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-dark-gray z-10">
                        <tr>
                            <th className="py-4 font-bold text-light-gray uppercase tracking-wider text-sm border-b border-secondary">
                                 <button onClick={() => requestSort('customerName')} className="flex items-center gap-2 hover:text-white">Customer {getSortIndicator('customerName')}</button>
                            </th>
                            <th className="py-4 font-bold text-light-gray uppercase tracking-wider text-sm border-b border-secondary">Service</th>
                            <th className="py-4 font-bold text-light-gray uppercase tracking-wider text-sm border-b border-secondary">
                                 <button onClick={() => requestSort('mechanicName')} className="flex items-center gap-2 hover:text-white">Mechanic {getSortIndicator('mechanicName')}</button>
                            </th>
                            <th className="py-4 font-bold text-light-gray uppercase tracking-wider text-sm border-b border-secondary">
                                 <button onClick={() => requestSort('date')} className="flex items-center gap-2 hover:text-white">Date & Time {getSortIndicator('date')}</button>
                            </th>
                            <th className="py-4 font-bold text-light-gray uppercase tracking-wider text-sm border-b border-secondary">Status</th>
                            <th className="py-4 font-bold text-light-gray uppercase tracking-wider text-sm border-b border-secondary">Update Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedAndFilteredBookings.length > 0 ? sortedAndFilteredBookings.map((booking) => (
                             <tr key={booking.id} className="hover:bg-secondary">
                                <td className="py-4 px-2 text-gray-200 border-b border-secondary">
                                    <div>
                                        <p className="font-semibold">{booking.customerName}</p>
                                        <p className="text-xs text-gray-400">{`${booking.vehicle.make} ${booking.vehicle.model} (${booking.vehicle.plateNumber})`}</p>
                                    </div>
                                    {booking.status === 'Cancelled' && booking.cancellationReason && (
                                        <p 
                                            className="text-xs text-red-400/80 mt-1 italic max-w-xs truncate" 
                                            title={booking.cancellationReason}
                                        >
                                            Reason: {booking.cancellationReason}
                                        </p>
                                    )}
                                </td>
                                <td className="py-4 px-2 text-gray-200 border-b border-secondary">{booking.service.name}</td>
                                <td className="py-4 px-2 text-gray-200 border-b border-secondary">{booking.mechanic?.name || <span className="text-gray-400">Not Assigned</span>}</td>
                                <td className="py-4 px-2 text-gray-200 border-b border-secondary">{booking.date} at {booking.time}</td>
                                <td className="py-4 px-2 border-b border-secondary">
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[booking.status]}`}>
                                        {booking.status}
                                    </span>
                                </td>
                                <td className="py-4 px-2 border-b border-secondary">
                                    <select 
                                        value={booking.status} 
                                        onChange={(e) => handleStatusChange(booking, e.target.value as BookingStatus)}
                                        className="bg-field border border-secondary p-1 rounded text-sm text-gray-200"
                                    >
                                        <option value="Upcoming">Upcoming</option>
                                        <option value="En Route">En Route</option>
                                        <option value="In Progress">In Progress</option>
                                        <option value="Completed">Completed</option>
                                        <option value="Cancelled">Cancelled</option>
                                    </select>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={6} className="text-center py-10 text-light-gray border-b border-secondary">
                                    No bookings match the current filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
                 {cancellingBooking && (
                    <CancellationModal 
                        booking={cancellingBooking}
                        onClose={() => setCancellingBooking(null)}
                        onConfirm={handleConfirmCancellation}
                    />
                )}
            </div>
        </div>
    );
};

export default AdminBookingsScreen;
