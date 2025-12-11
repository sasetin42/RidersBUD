import React, { useState, useMemo } from 'react';
import { Booking, BookingStatus, Customer } from '../../types';
import { useDatabase } from '../../context/DatabaseContext';
import Spinner from '../../components/Spinner';
import Modal from '../../components/admin/Modal';
import Pagination from '../../components/Pagination';
import { useNotification } from '../../context/NotificationContext';
import { Search, Filter, Calendar, User, Wrench, MoreVertical, CheckCircle, XCircle, Clock, MapPin, Phone, Mail, Star, ChevronDown, Eye, Edit, Trash2 } from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*                                SUBCOMPONENTS                               */
/* -------------------------------------------------------------------------- */

const StatCard: React.FC<{ title: string; value: number | string; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => (
    <div className="glass-panel p-6 rounded-2xl flex items-center gap-5 border border-white/5 relative overflow-hidden group">
        <div className={`p-4 rounded-xl ${color} bg-opacity-10 text-white shadow-inner ring-1 ring-white/10 group-hover:scale-110 transition-transform`}>
            {icon}
        </div>
        <div>
            <p className="text-3xl font-bold text-white mb-1">{value}</p>
            <p className="text-sm font-medium text-gray-400 uppercase tracking-wide">{title}</p>
        </div>
        {/* Decorative Glow */}
        <div className={`absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-10 blur-xl ${color}`}></div>
    </div>
);

const BookingDetailsModal: React.FC<{ booking: Booking; customer?: Customer, onClose: () => void; }> = ({ booking, customer, onClose }) => {
    return (
        <Modal title={`Booking #${booking.id.toUpperCase().slice(-6)}`} isOpen={true} onClose={onClose}>
            <div className="space-y-6 text-white">
                {/* Header Summary */}
                <div className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/10">
                    <div>
                        <p className="text-sm text-gray-400">Total Amount</p>
                        <p className="text-2xl font-bold text-primary">₱{booking.service.price.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                        <span className={`px-3 py-1 text-xs font-bold rounded-full border ${booking.status === 'Completed' ? 'bg-green-500/20 border-green-500/30 text-green-400' :
                            booking.status === 'Cancelled' ? 'bg-red-500/20 border-red-500/30 text-red-400' :
                                'bg-blue-500/20 border-blue-500/30 text-blue-400'
                            }`}>
                            {booking.status}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Customer Info */}
                    <div className="space-y-3">
                        <h4 className="flex items-center gap-2 text-sm font-bold text-gray-400 uppercase tracking-wider">
                            <User size={14} /> Customer
                        </h4>
                        <div className="bg-white/5 p-4 rounded-xl space-y-2 border border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center font-bold">
                                    {customer?.name.charAt(0)}
                                </div>
                                <div>
                                    <p className="font-bold">{customer?.name}</p>
                                    <p className="text-xs text-gray-400">Customer ID: {customer?.id.slice(0, 8)}</p>
                                </div>
                            </div>
                            <div className="pt-2 border-t border-white/10 space-y-1 text-sm text-gray-300">
                                <p>📧 {customer?.email}</p>
                                <p>📱 {customer?.phone}</p>
                            </div>
                        </div>
                    </div>

                    {/* Vehicle Info */}
                    <div className="space-y-3">
                        <h4 className="flex items-center gap-2 text-sm font-bold text-gray-400 uppercase tracking-wider">
                            <Wrench size={14} /> Vehicle & Service
                        </h4>
                        <div className="bg-white/5 p-4 rounded-xl space-y-2 border border-white/5 h-full">
                            <p className="text-lg font-bold">{booking.vehicle.year} {booking.vehicle.make} {booking.vehicle.model}</p>
                            <p className="text-sm font-mono bg-black/30 px-2 py-1 rounded inline-block text-gray-300">{booking.vehicle.plateNumber}</p>
                            <div className="pt-3 mt-2 border-t border-white/10">
                                <p className="text-sm text-primary font-bold">{booking.service.name}</p>
                                <p className="text-xs text-gray-500">{booking.service.category}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mechanic Assignment */}
                <div>
                    <h4 className="flex items-center gap-2 text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
                        <Wrench size={14} /> Assigned Mechanic
                    </h4>
                    {booking.mechanic ? (
                        <div className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/5">
                            <div className="flex items-center gap-4">
                                <img src={booking.mechanic.imageUrl} alt={booking.mechanic.name} className="w-12 h-12 rounded-full object-cover ring-2 ring-primary/50" />
                                <div>
                                    <p className="font-bold">{booking.mechanic.name}</p>
                                    <p className="text-xs text-gray-400">{booking.mechanic.specializations.join(', ')}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-yellow-400 font-bold">⭐ {booking.mechanic.rating.toFixed(1)}</p>
                                <p className="text-xs text-gray-500">{booking.mechanic.reviews} Reviews</p>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl text-yellow-200 text-sm flex items-center justify-center border-dashed">
                            ⚠️ No mechanic assigned yet.
                        </div>
                    )}
                </div>

                {/* Timeline */}
                {booking.statusHistory && (
                    <div className="pt-4 border-t border-white/10">
                        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Activity Log</h4>
                        <div className="space-y-4 relative pl-2">
                            <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-white/10"></div>
                            {booking.statusHistory.slice().reverse().map((s, i) => (
                                <div key={i} className="flex gap-4 relative">
                                    <div className={`w-4 h-4 rounded-full mt-1 flex-shrink-0 ring-4 ring-[#0a0a0a] ${i === 0 ? 'bg-primary' : 'bg-gray-600'}`}></div>
                                    <div>
                                        <p className={`text-sm font-bold ${i === 0 ? 'text-white' : 'text-gray-400'}`}>{s.status}</p>
                                        <p className="text-xs text-gray-500">{new Date(s.timestamp).toLocaleString()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    )
}

/* -------------------------------------------------------------------------- */
/*                               MAIN COMPONENT                               */
/* -------------------------------------------------------------------------- */

const AdminBookingsScreen: React.FC = () => {
    const { db, updateBookingStatus, cancelBooking, loading } = useDatabase();
    const { addNotification } = useNotification();

    // State
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<BookingStatus | 'all'>('all');
    const [viewingBooking, setViewingBooking] = useState<Booking | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [activeActionId, setActiveActionId] = useState<string | null>(null);

    if (loading || !db) return <div className="flex items-center justify-center h-full"><Spinner size="lg" color="text-white" /></div>;

    const { bookings, mechanics } = db;

    // Derived Data
    const bookingStats = useMemo(() => ({
        total: bookings.length,
        upcoming: bookings.filter(b => ['Upcoming', 'En Route', 'In Progress', 'Reschedule Requested'].includes(b.status)).length,
        completed: bookings.filter(b => b.status === 'Completed').length,
        cancelled: bookings.filter(b => b.status === 'Cancelled').length,
    }), [bookings]);

    const filteredBookings = useMemo(() => {
        return bookings.filter(b => {
            const matchesSearch = b.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                b.service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                b.id.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = selectedStatus === 'all' || b.status === selectedStatus;
            return matchesSearch && matchesStatus;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [bookings, searchQuery, selectedStatus]);

    const paginatedBookings = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredBookings.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredBookings, currentPage, itemsPerPage]);

    // Reset page on search/filter change
    useMemo(() => setCurrentPage(1), [searchQuery, selectedStatus]);

    const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>, booking: Booking) => {
        e.stopPropagation();
        const newStatus = e.target.value as BookingStatus;
        try {
            await updateBookingStatus(booking.id, newStatus);
            addNotification({ type: 'success', title: 'Status Updated', message: `Booking #${booking.id.slice(-6)} is now ${newStatus}.`, recipientId: 'all' });
        } catch (error) {
            console.error(error);
        }
    };

    const StatusBadge = ({ status }: { status: string }) => {
        const styles: Record<string, string> = {
            'Completed': 'bg-green-500/20 text-green-400 border-green-500/30',
            'Cancelled': 'bg-red-500/20 text-red-400 border-red-500/30',
            'Upcoming': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
            'In Progress': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
            'En Route': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
        };
        const defaultStyle = 'bg-gray-500/20 text-gray-400 border-gray-500/30';

        return (
            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${styles[status] || defaultStyle} whitespace-nowrap`}>
                {status}
            </span>
        );
    };

    return (
        <div className="space-y-8 animate-slideInUp">
            {/* Header & Stats */}
            <div>
                <h1 className="text-3xl font-bold text-white mb-6">Manage Bookings</h1>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard title="Total" value={bookingStats.total} icon={<Calendar size={24} />} color="bg-blue-500" />
                    <StatCard title="Active" value={bookingStats.upcoming} icon={<Clock size={24} />} color="bg-orange-500" />
                    <StatCard title="Completed" value={bookingStats.completed} icon={<CheckCircle size={24} />} color="bg-green-500" />
                    <StatCard title="Cancelled" value={bookingStats.cancelled} icon={<XCircle size={24} />} color="bg-red-500" />
                </div>
            </div>

            {/* Main Table Card */}
            <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden flex flex-col min-h-[600px]">
                {/* Toolbar */}
                <div className="p-5 border-b border-white/5 flex flex-col md:flex-row gap-4 justify-between bg-white/5">
                    <div className="relative group flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Search bookings..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all placeholder-gray-600"
                        />
                    </div>

                    <div className="flex gap-3">
                        <select
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value as BookingStatus | 'all')}
                            className="bg-[#0a0a0a] text-white border border-white/10 rounded-xl px-4 py-2.5 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 cursor-pointer hover:bg-white/5 transition-colors"
                        >
                            <option value="all">All Statuses</option>
                            <option value="Upcoming">Upcoming</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled</option>
                            <option value="In Progress">In Progress</option>
                        </select>
                        <button className="bg-[#0a0a0a] text-gray-400 hover:text-white border border-white/10 px-4 py-2.5 rounded-xl transition-all flex items-center gap-2">
                            <Filter size={18} />
                            <span className="hidden sm:inline">Filters</span>
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto flex-1 min-h-[400px] pb-32"> {/* Added padding bottom for dropdown space */}
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/[0.02] text-xs uppercase tracking-wider text-gray-400 font-medium">
                                <th className="p-5 pl-6">Customer Details</th>
                                <th className="p-5">Service Info</th>
                                <th className="p-5">Location & Time</th>
                                <th className="p-5">Mechanic</th>
                                <th className="p-5">Status</th>
                                <th className="p-5 text-right pr-6">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-sm">
                            {paginatedBookings.length > 0 ? paginatedBookings.map((booking) => {
                                const customer = db?.customers.find(c => c.name === booking.customerName);
                                return (
                                    <tr
                                        key={booking.id}
                                        className="group hover:bg-white/5 transition-colors"
                                    >
                                        <td className="p-5 pl-6">
                                            <div className="flex items-start gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center font-bold text-white shadow-inner flex-shrink-0">
                                                    {customer?.picture ? <img src={customer.picture} alt={customer.name} className="w-full h-full rounded-full object-cover" /> : booking.customerName.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-white mb-0.5">{booking.customerName}</p>
                                                    {customer && (
                                                        <div className="text-xs text-gray-400 space-y-0.5">
                                                            <div className="flex items-center gap-1.5"><Mail size={10} /> {customer.email}</div>
                                                            <div className="flex items-center gap-1.5"><Phone size={10} /> {customer.phone}</div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <div className="space-y-1">
                                                <p className="font-bold text-white group-hover:text-primary transition-colors">{booking.service.name}</p>
                                                <p className="text-xs text-gray-400">{booking.vehicle.year} {booking.vehicle.make} {booking.vehicle.model}</p>
                                                <span className="inline-block px-2 py-0.5 rounded bg-white/5 text-[10px] text-gray-400 border border-white/5 font-mono">
                                                    ID: #{booking.id.slice(-6).toUpperCase()}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-5 text-gray-300">
                                            <div className="space-y-1.5">
                                                <div className="flex items-center gap-2 text-xs">
                                                    <Calendar size={12} className="text-gray-500" />
                                                    <span className="font-medium text-gray-300">{booking.date}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs">
                                                    <Clock size={12} className="text-gray-500" />
                                                    <span>{booking.time}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs max-w-[180px]" title={booking.location.address}>
                                                    <MapPin size={12} className="text-gray-500 flex-shrink-0" />
                                                    <span className="truncate">{booking.location.address}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            {booking.mechanic ? (
                                                <div className="flex items-center gap-3">
                                                    <img src={booking.mechanic.imageUrl} className="w-9 h-9 rounded-full object-cover border border-white/10" />
                                                    <div>
                                                        <p className="font-bold text-sm text-white">{booking.mechanic.name}</p>
                                                        <div className="flex items-center gap-2 text-xs text-gray-400">
                                                            <span>{booking.mechanic.specializations[0]}</span>
                                                            <span className="flex items-center gap-0.5 text-yellow-500"><Star size={10} fill="currentColor" /> {booking.mechanic.rating}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-xs font-medium">
                                                    <Clock size={12} /> Pending Assign
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-5">
                                            <StatusBadge status={booking.status} />
                                        </td>
                                        <td className="p-5 text-right pr-6 relative">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveActionId(activeActionId === booking.id ? null : booking.id);
                                                }}
                                                className={`p-2 rounded-lg transition-all ${activeActionId === booking.id ? 'bg-primary text-white shadow-lg shadow-orange-500/20' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                                            >
                                                <MoreVertical size={18} />
                                            </button>

                                            {/* Custom Dropdown */}
                                            {activeActionId === booking.id && (
                                                <>
                                                    <div className="fixed inset-0 z-10" onClick={() => setActiveActionId(null)}></div>
                                                    <div className="absolute right-6 top-12 z-20 w-48 bg-[#1A1A1A] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-fadeIn origin-top-right">
                                                        <div className="p-1.5 space-y-0.5">
                                                            <button
                                                                onClick={() => { setViewingBooking(booking); setActiveActionId(null); }}
                                                                className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-sm text-gray-300 hover:text-white flex items-center gap-2 transition-colors"
                                                            >
                                                                <Eye size={14} className="text-blue-500" /> View Details
                                                            </button>

                                                            <div className="h-px bg-white/5 my-1 mx-2"></div>

                                                            <div className="px-3 py-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Update Status</div>
                                                            {['Upcoming', 'En Route', 'In Progress', 'Completed', 'Cancelled'].map((status) => (
                                                                <button
                                                                    key={status}
                                                                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 transition-colors ${booking.status === status ? 'bg-primary/10 text-primary font-bold' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                                                                    onClick={(e) => { // Using a synthetic event approach as handleStatusChange expects one
                                                                        handleStatusChange({ target: { value: status }, stopPropagation: () => { } } as any, booking);
                                                                        setActiveActionId(null);
                                                                    }}
                                                                >
                                                                    <div className={`w-1.5 h-1.5 rounded-full ${booking.status === status ? 'bg-primary' : 'bg-gray-600'}`}></div>
                                                                    {status}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={6} className="p-10 text-center text-gray-500">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                                                <Search size={24} className="opacity-50" />
                                            </div>
                                            <p>No bookings found matching your criteria.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <Pagination
                    currentPage={currentPage}
                    totalPages={Math.ceil(filteredBookings.length / itemsPerPage)}
                    itemsPerPage={itemsPerPage}
                    totalItems={filteredBookings.length}
                    onPageChange={setCurrentPage}
                    onItemsPerPageChange={setItemsPerPage}
                />
            </div>

            {/* Modals */}
            {viewingBooking && (
                <BookingDetailsModal
                    booking={viewingBooking}
                    customer={db?.customers.find(c => c.name === viewingBooking.customerName)}
                    onClose={() => setViewingBooking(null)}
                />
            )}
        </div>
    );
};

export default AdminBookingsScreen;