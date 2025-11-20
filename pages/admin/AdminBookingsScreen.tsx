import React, { useState, useMemo } from 'react';
import { Booking, BookingStatus, Customer } from '../../types';
import { useDatabase } from '../../context/DatabaseContext';
import Spinner from '../../components/Spinner';
import Modal from '../../components/admin/Modal';

type SortableKeys = 'customerName' | 'mechanicName' | 'date' | 'price';

const StatCard: React.FC<{ title: string; value: number | string; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-admin-card p-5 rounded-xl shadow-lg flex items-center gap-4 border border-admin-border">
        <div className="bg-admin-bg p-3 rounded-full text-admin-accent">{icon}</div>
        <div>
            <p className="text-2xl font-bold text-admin-text-primary">{value}</p>
            <p className="text-sm text-admin-text-secondary">{title}</p>
        </div>
    </div>
);

const BookingDetailsModal: React.FC<{ booking: Booking; customer?: Customer, onClose: () => void; }> = ({ booking, customer, onClose }) => {
    return (
        <Modal title={`Booking Details #${booking.id.toUpperCase().slice(-6)}`} isOpen={true} onClose={onClose}>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                <div className="bg-admin-bg p-4 rounded-lg">
                    <h3 className="font-bold text-admin-accent mb-2">Service &amp; Price</h3>
                    <p className="font-semibold text-admin-text-primary">{booking.service.name}</p>
                    <p className="text-lg font-bold text-admin-accent">₱{booking.service.price.toLocaleString()}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-admin-bg p-4 rounded-lg">
                        <h3 className="font-bold text-admin-accent mb-2">Customer</h3>
                        <p className="font-semibold text-admin-text-primary">{customer?.name}</p>
                        <p className="text-sm text-admin-text-secondary">{customer?.email}</p>
                        <p className="text-sm text-admin-text-secondary">{customer?.phone}</p>
                    </div>
                    <div className="bg-admin-bg p-4 rounded-lg">
                        <h3 className="font-bold text-admin-accent mb-2">Vehicle</h3>
                        <p className="font-semibold text-admin-text-primary">{`${booking.vehicle.year} ${booking.vehicle.make} ${booking.vehicle.model}`}</p>
                        <p className="text-sm text-admin-text-secondary font-mono">{booking.vehicle.plateNumber}</p>
                    </div>
                </div>
                 <div className="bg-admin-bg p-4 rounded-lg">
                    <h3 className="font-bold text-admin-accent mb-2">Mechanic</h3>
                    {booking.mechanic ? (
                        <>
                            <p className="font-semibold text-admin-text-primary">{booking.mechanic.name}</p>
                            <p className="text-sm text-admin-text-secondary">{booking.mechanic.email}</p>
                            <p className="text-yellow-400 text-sm">⭐ {booking.mechanic.rating} ({booking.mechanic.reviews} reviews)</p>
                        </>
                    ) : (
                        <p className="text-admin-text-secondary">Not yet assigned.</p>
                    )}
                </div>
                {booking.statusHistory && (
                    <div className="bg-admin-bg p-4 rounded-lg">
                        <h3 className="font-bold text-admin-accent mb-2">Status History</h3>
                        <ul className="space-y-2">
                            {booking.statusHistory.map((s, i) => (
                                <li key={i} className="text-sm flex justify-between">
                                    <span className="text-admin-text-secondary">{s.status}</span>
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
                <p>Please provide a reason for cancelling the booking for <span className="font-bold text-admin-accent">{booking.customerName}</span>.</p>
                <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g., Customer request, mechanic unavailable..."
                    rows={4}
                    className={`w-full p-3 bg-admin-bg border rounded placeholder-admin-text-secondary ${error ? 'border-red-500' : 'border-admin-border focus:ring-admin-accent focus:border-admin-accent'}`}
                />
                {error && <p className="text-red-400 text-xs">{error}</p>}
                <div className="flex justify-end gap-4">
                    <button onClick={onClose} className="bg-admin-border text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-600 transition">Go Back</button>
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
        return <div className="flex items-center justify-center h-full"><Spinner size="lg" color="text-white" /></div>
    }

    const { bookings, mechanics, settings } = db;

    const viewingCustomer = useMemo(() => {
        if (!viewingBooking || !db) return undefined;
        return db.customers.find(c => c.name === viewingBooking.customerName);
    }, [viewingBooking, db]);

    const serviceCategories = useMemo(() => ['all', ...settings.serviceCategories], [settings.serviceCategories]);
    const bookingStatuses: Array<BookingStatus | 'all'> = ['all', 'Upcoming', 'Booking Confirmed', 'Mechanic Assigned', 'En Route', 'In Progress', 'Completed', 'Cancelled'];

    const handleStatusChange = (booking: Booking, newStatus: BookingStatus) => {
        if (newStatus === 'Cancelled') setCancellingBooking(booking);
        else updateBookingStatus(booking.id, newStatus);
    };
    
    const handleConfirmCancellation = (reason: string) => {
        if (cancellingBooking) {
            cancelBooking(cancellingBooking.id, reason);
            setCancellingBooking(null);
        }
    };

    const requestSort = (key: SortableKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
        setSortConfig({ key, direction });
    };

    const sortedAndFilteredBookings = useMemo(() => {
        let filteredBookings = bookings.filter(booking => {
            const mechanicMatch = selectedMechanicId === 'all' || booking.mechanic?.id === selectedMechanicId;
            const categoryMatch = selectedCategory === 'all' || booking.service.category === selectedCategory;
            const statusMatch = selectedStatus === 'all' || booking.status === selectedStatus;
             const searchMatch = searchQuery === '' || booking.customerName.toLowerCase().includes(searchQuery.toLowerCase()) || booking.service.name.toLowerCase().includes(searchQuery.toLowerCase());
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
                let aValue: string | number; let bValue: string | number;
                if (sortConfig.key === 'mechanicName') { aValue = a.mechanic?.name || ''; bValue = b.mechanic?.name || ''; } 
                else if (sortConfig.key === 'date') { aValue = new Date(`${a.date} ${a.time}`).getTime(); bValue = new Date(`${b.date} ${b.time}`).getTime(); } 
                else if (sortConfig.key === 'price') { aValue = a.service.price; bValue = b.service.price; } 
                else { aValue = a[sortConfig.key as 'customerName'] as string; bValue = b[sortConfig.key as 'customerName'] as string; }
                if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return filteredBookings;
    }, [selectedMechanicId, selectedCategory, selectedStatus, searchQuery, bookings, sortConfig, dateFilter]);
    
    const getSortIndicator = (key: SortableKeys) => {
        if (sortConfig.key !== key) return '↕';
        return sortConfig.direction === 'ascending' ? '▲' : '▼';
    };

    const statusColors: { [key in BookingStatus]: string } = {
        Upcoming: 'bg-blue-900/50 text-blue-300 border border-blue-500/30', 'Booking Confirmed': 'bg-cyan-900/50 text-cyan-300 border border-cyan-500/30', 'Mechanic Assigned': 'bg-sky-900/50 text-sky-300 border border-sky-500/30', Completed: 'bg-green-900/50 text-green-300 border border-green-500/30', Cancelled: 'bg-red-900/50 text-red-300 border border-red-500/30', 'En Route': 'bg-yellow-900/50 text-yellow-300 border border-yellow-500/30', 'In Progress': 'bg-purple-900/50 text-purple-300 border border-purple-500/30',
    };

    const bookingStats = useMemo(() => ({
        total: bookings.length,
        upcoming: bookings.filter(b => b.status === 'Upcoming' || b.status === 'En Route' || b.status === 'In Progress').length,
        completed: bookings.filter(b => b.status === 'Completed').length,
        cancelled: bookings.filter(b => b.status === 'Cancelled').length,
    }), [bookings]);

    return (
        <div className="text-admin-text-primary flex flex-col h-full overflow-hidden">
            <div className="flex-shrink-0 px-6 lg:px-8 pt-6">
                <h1 className="text-3xl font-bold">Manage Bookings</h1>
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 my-6">
                    <StatCard title="Total Bookings" value={bookingStats.total} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>} />
                    <StatCard title="Upcoming/Active" value={bookingStats.upcoming} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
                    <StatCard title="Completed" value={bookingStats.completed} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
                    <StatCard title="Cancelled" value={bookingStats.cancelled} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-4">
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search Customer/Service..." className="w-full p-2 bg-admin-card border border-admin-border rounded-lg" />
                    <select value={selectedMechanicId} onChange={(e) => setSelectedMechanicId(e.target.value)} className="w-full p-2 bg-admin-card border border-admin-border rounded-lg"><option value="all">All Mechanics</option>{mechanics.filter(m => m.status === 'Active').map(mechanic => (<option key={mechanic.id} value={mechanic.id}>{mechanic.name}</option>))}</select>
                    <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-full p-2 bg-admin-card border border-admin-border rounded-lg">{serviceCategories.map(category => (<option key={category} value={category} className="capitalize">{category === 'all' ? 'All Categories' : category}</option>))}</select>
                    <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value as any)} className="w-full p-2 bg-admin-card border border-admin-border rounded-lg">{bookingStatuses.map(status => (<option key={status} value={status} className="capitalize">{status === 'all' ? 'All Statuses' : status}</option>))}</select>
                    <input type="date" value={dateFilter.start} onChange={e => setDateFilter(prev => ({ ...prev, start: e.target.value }))} className="w-full p-2 bg-admin-card border border-admin-border rounded-lg" />
                     <input type="date" value={dateFilter.end} min={dateFilter.start} onChange={e => setDateFilter(prev => ({ ...prev, end: e.target.value }))} className="w-full p-2 bg-admin-card border border-admin-border rounded-lg" />
                </div>
            </div>

            <div className="flex-1 overflow-auto px-6 lg:px-8">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-admin-bg z-10">
                        <tr>
                            <th className="py-3 font-semibold text-admin-text-secondary uppercase text-xs border-b border-admin-border"><button onClick={() => requestSort('customerName')} className="flex items-center gap-2 hover:text-white">Customer {getSortIndicator('customerName')}</button></th>
                            <th className="py-3 font-semibold text-admin-text-secondary uppercase text-xs border-b border-admin-border">Service</th>
                            <th className="py-3 font-semibold text-admin-text-secondary uppercase text-xs border-b border-admin-border">Vehicle</th>
                            <th className="py-3 font-semibold text-admin-text-secondary uppercase text-xs border-b border-admin-border"><button onClick={() => requestSort('mechanicName')} className="flex items-center gap-2 hover:text-white">Mechanic {getSortIndicator('mechanicName')}</button></th>
                            <th className="py-3 font-semibold text-admin-text-secondary uppercase text-xs border-b border-admin-border"><button onClick={() => requestSort('date')} className="flex items-center gap-2 hover:text-white">Date {getSortIndicator('date')}</button></th>
                            <th className="py-3 font-semibold text-admin-text-secondary uppercase text-xs border-b border-admin-border"><button onClick={() => requestSort('price')} className="flex items-center gap-2 hover:text-white">Price {getSortIndicator('price')}</button></th>
                            <th className="py-3 font-semibold text-admin-text-secondary uppercase text-xs border-b border-admin-border">Status</th>
                            <th className="py-3 font-semibold text-admin-text-secondary uppercase text-xs border-b border-admin-border">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-admin-border">
                        {sortedAndFilteredBookings.length > 0 ? sortedAndFilteredBookings.map((booking) => (
                             <tr key={booking.id} className="hover:bg-admin-card">
                                <td className="py-3 px-2 text-sm">{booking.customerName}</td>
                                <td className="py-3 px-2 text-sm">{booking.service.name}</td>
                                <td className="py-3 px-2 text-xs">{booking.vehicle.make} {booking.vehicle.model}</td>
                                <td className="py-3 px-2 text-sm">{booking.mechanic?.name || <span className="text-gray-400">Not Assigned</span>}</td>
                                <td className="py-3 px-2 text-xs">{booking.date} at {booking.time}</td>
                                <td className="py-3 px-2 text-sm">₱{booking.service.price.toLocaleString()}</td>
                                <td className="py-3 px-2"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[booking.status]}`}>{booking.status}</span></td>
                                <td className="py-3 px-2">
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => setViewingBooking(booking)} className="font-semibold text-blue-400 hover:text-blue-300 text-sm">View</button>
                                        <select value={booking.status} onChange={(e) => handleStatusChange(booking, e.target.value as BookingStatus)} className="bg-admin-card border border-admin-border p-1 rounded text-xs">
                                            {bookingStatuses.slice(1).map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan={8} className="text-center py-10 text-admin-text-secondary">No bookings match the current filters.</td></tr>
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