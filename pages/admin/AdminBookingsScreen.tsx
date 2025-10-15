import React, { useState, useMemo } from 'react';
import { Booking, BookingStatus, Customer } from '../../types';
import { useDatabase } from '../../context/DatabaseContext';
import Spinner from '../../components/Spinner';
import Modal from '../../components/admin/Modal';

type SortableKeys = 'customerName' | 'mechanicName' | 'date' | 'price';

const BookingDetailsModal: React.FC<{ booking: Booking; customer?: Customer, onClose: () => void; }> = ({ booking, customer, onClose }) => {
    return (
        <Modal title={`Booking Details #${booking.id.toUpperCase().slice(-6)}`} isOpen={true} onClose={onClose}>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                <div className="bg-field p-4 rounded-lg">
                    <h3 className="font-bold text-primary mb-2">Service &amp; Price</h3>
                    <p className="font-semibold text-white">{booking.service.name}</p>
                    <p className="text-lg font-bold text-primary">₱{booking.service.price.toLocaleString()}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-field p-4 rounded-lg">
                        <h3 className="font-bold text-primary mb-2">Customer</h3>
                        <p className="font-semibold text-white">{customer?.name}</p>
                        <p className="text-sm text-light-gray">{customer?.email}</p>
                        <p className="text-sm text-light-gray">{customer?.phone}</p>
                    </div>
                    <div className="bg-field p-4 rounded-lg">
                        <h3 className="font-bold text-primary mb-2">Vehicle</h3>
                        <p className="font-semibold text-white">{`${booking.vehicle.year} ${booking.vehicle.make} ${booking.vehicle.model}`}</p>
                        <p className="text-sm text-light-gray font-mono">{booking.vehicle.plateNumber}</p>
                    </div>
                </div>
                 <div className="bg-field p-4 rounded-lg">
                    <h3 className="font-bold text-primary mb-2">Mechanic</h3>
                    {booking.mechanic ? (
                        <>
                            <p className="font-semibold text-white">{booking.mechanic.name}</p>
                            <p className="text-sm text-light-gray">{booking.mechanic.email}</p>
                            <p className="text-yellow-400 text-sm">⭐ {booking.mechanic.rating} ({booking.mechanic.reviews} reviews)</p>
                        </>
                    ) : (
                        <p className="text-light-gray">Not yet assigned.</p>
                    )}
                </div>
                {booking.statusHistory && (
                    <div className="bg-field p-4 rounded-lg">
                        <h3 className="font-bold text-primary mb-2">Status History</h3>
                        <ul className="space-y-2">
                            {booking.statusHistory.map((s, i) => (
                                <li key={i} className="text-sm flex justify-between">
                                    <span className="text-light-gray">{s.status}</span>
                                    <span className="text-gray-400">{new Date(s.timestamp).toLocaleString()}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </Modal>
    )
}

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
    const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' }>({ key: 'date', direction: 'descending' });
    const [cancellingBooking, setCancellingBooking] = useState<Booking | null>(null);
    const [viewingBooking, setViewingBooking] = useState<Booking | null>(null);

    if (loading || !db) {
        return <div className="flex items-center justify-center h-full bg-dark-gray"><Spinner size="lg" color="text-white" /></div>
    }

    const { bookings, mechanics, settings } = db;

    const viewingCustomer = useMemo(() => {
        if (!viewingBooking || !db) return undefined;
        return db.customers.find(c => c.name === viewingBooking.customerName);
    }, [viewingBooking, db]);

    const serviceCategories = useMemo(() => {
        return ['all', ...settings.serviceCategories];
    }, [settings.serviceCategories]);

    const bookingStatuses: Array<BookingStatus | 'all'> = ['all', 'Upcoming', 'Booking Confirmed', 'Mechanic Assigned', 'En Route', 'In Progress', 'Completed', 'Cancelled'];

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
            
            let dateMatch = true;
            if (dateFilter.start && dateFilter.end) {
                const startDate = new Date(dateFilter.start.replace(/-/g, '/')).getTime();
                const endDateObj = new Date(dateFilter.end.replace(/-/g, '/'));
                endDateObj.setDate(endDateObj.getDate() + 1);
                const endDate = endDateObj.getTime();
                const bookingDate = new Date(booking.date.replace(/-/g, '/')).getTime();
                dateMatch = bookingDate >= startDate && bookingDate < endDate;
            }

            return mechanicMatch && categoryMatch && statusMatch && searchMatch && dateMatch;
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
                } else if (sortConfig.key === 'price') {
                    aValue = a.service.price;
                    bValue = b.service.price;
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
    }, [selectedMechanicId, selectedCategory, selectedStatus, searchQuery, bookings, sortConfig, dateFilter]);
    
    const getSortIndicator = (key: SortableKeys) => {
        if (sortConfig.key !== key) return null;
        return sortConfig.direction === 'ascending' ? '▲' : '▼';
    };

    const statusColors: { [key in BookingStatus]: string } = {
        Upcoming: 'bg-blue-900/50 text-blue-300 border border-blue-500/30',
        'Booking Confirmed': 'bg-cyan-900/50 text-cyan-300 border border-cyan-500/30',
        'Mechanic Assigned': 'bg-sky-900/50 text-sky-300 border border-sky-500/30',
        Completed: 'bg-green-900/50 text-green-300 border border-green-500/30',
        Cancelled: 'bg-red-900/50 text-red-300 border border-red-500/30',
        'En Route': 'bg-yellow-900/50 text-yellow-300 border border-yellow-500/30',
        'In Progress': 'bg-purple-900/50 text-purple-300 border border-purple-500/30',
    };

    return (
        <div className="text-white flex flex-col h-full overflow-hidden bg-dark-gray">
            <div className="flex-shrink-0 px-6 lg:px-8 py-6">
                <h1 className="text-3xl font-bold mb-6">Manage Bookings</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-4">
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search Customer/Service..." className="w-full p-2 bg-field border border-secondary text-gray-200 rounded-lg focus:ring-primary focus:border-primary" />
                    <select value={selectedMechanicId} onChange={(e) => setSelectedMechanicId(e.target.value)} className="w-full p-2 bg-field border border-secondary text-gray-200 rounded-lg focus:ring-primary focus:border-primary">
                        <option value="all">All Mechanics</option>
                        {mechanics.filter(m => m.status === 'Active').map(mechanic => (<option key={mechanic.id} value={mechanic.id}>{mechanic.name}</option>))}
                    </select>
                    <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-full p-2 bg-field border border-secondary text-gray-200 rounded-lg focus:ring-primary focus:border-primary">
                        {serviceCategories.map(category => (<option key={category} value={category} className="capitalize">{category === 'all' ? 'All Categories' : category}</option>))}
                    </select>
                    <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value as any)} className="w-full p-2 bg-field border border-secondary text-gray-200 rounded-lg focus:ring-primary focus:border-primary">
                        {bookingStatuses.map(status => (<option key={status} value={status} className="capitalize">{status === 'all' ? 'All Statuses' : status}</option>))}
                    </select>
                    <input type="date" value={dateFilter.start} onChange={e => setDateFilter(prev => ({ ...prev, start: e.target.value }))} className="w-full p-2 bg-field border border-secondary text-gray-200 rounded-lg focus:ring-primary focus:border-primary" />
                     <input type="date" value={dateFilter.end} min={dateFilter.start} onChange={e => setDateFilter(prev => ({ ...prev, end: e.target.value }))} className="w-full p-2 bg-field border border-secondary text-gray-200 rounded-lg focus:ring-primary focus:border-primary" />
                </div>
            </div>

            <div className="flex-1 overflow-auto px-6 lg:px-8">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-dark-gray z-10">
                        <tr>
                            <th className="py-4 font-bold text-light-gray uppercase tracking-wider text-sm border-b border-secondary"><button onClick={() => requestSort('customerName')} className="flex items-center gap-2 hover:text-white">Customer {getSortIndicator('customerName')}</button></th>
                            <th className="py-4 font-bold text-light-gray uppercase tracking-wider text-sm border-b border-secondary">Service</th>
                             <th className="py-4 font-bold text-light-gray uppercase tracking-wider text-sm border-b border-secondary">Vehicle</th>
                            <th className="py-4 font-bold text-light-gray uppercase tracking-wider text-sm border-b border-secondary"><button onClick={() => requestSort('mechanicName')} className="flex items-center gap-2 hover:text-white">Mechanic {getSortIndicator('mechanicName')}</button></th>
                            <th className="py-4 font-bold text-light-gray uppercase tracking-wider text-sm border-b border-secondary"><button onClick={() => requestSort('date')} className="flex items-center gap-2 hover:text-white">Date {getSortIndicator('date')}</button></th>
                            <th className="py-4 font-bold text-light-gray uppercase tracking-wider text-sm border-b border-secondary"><button onClick={() => requestSort('price')} className="flex items-center gap-2 hover:text-white">Price {getSortIndicator('price')}</button></th>
                            <th className="py-4 font-bold text-light-gray uppercase tracking-wider text-sm border-b border-secondary">Status</th>
                            <th className="py-4 font-bold text-light-gray uppercase tracking-wider text-sm border-b border-secondary">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedAndFilteredBookings.length > 0 ? sortedAndFilteredBookings.map((booking) => (
                             <tr key={booking.id} className="hover:bg-secondary">
                                <td className="py-4 px-2 text-gray-200 border-b border-secondary">{booking.customerName}</td>
                                <td className="py-4 px-2 text-gray-200 border-b border-secondary">{booking.service.name}</td>
                                <td className="py-4 px-2 text-gray-200 border-b border-secondary text-xs">{booking.vehicle.make} {booking.vehicle.model}</td>
                                <td className="py-4 px-2 text-gray-200 border-b border-secondary">{booking.mechanic?.name || <span className="text-gray-400">Not Assigned</span>}</td>
                                <td className="py-4 px-2 text-gray-200 border-b border-secondary text-xs">{booking.date} at {booking.time}</td>
                                <td className="py-4 px-2 text-gray-200 border-b border-secondary">₱{booking.service.price.toLocaleString()}</td>
                                <td className="py-4 px-2 border-b border-secondary"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[booking.status]}`}>{booking.status}</span></td>
                                <td className="py-4 px-2 border-b border-secondary">
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => setViewingBooking(booking)} className="font-semibold text-blue-400 hover:text-blue-300 text-sm">View</button>
                                        <select value={booking.status} onChange={(e) => handleStatusChange(booking, e.target.value as BookingStatus)} className="bg-field border border-secondary p-1 rounded text-xs text-gray-200">
                                            {bookingStatuses.slice(1).map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan={8} className="text-center py-10 text-light-gray border-b border-secondary">No bookings match the current filters.</td></tr>
                        )}
                    </tbody>
                </table>
                 {cancellingBooking && (<CancellationModal booking={cancellingBooking} onClose={() => setCancellingBooking(null)} onConfirm={handleConfirmCancellation} />)}
                 {viewingBooking && (<BookingDetailsModal booking={viewingBooking} customer={viewingCustomer} onClose={() => setViewingBooking(null)} />)}
            </div>
        </div>
    );
};

export default AdminBookingsScreen;