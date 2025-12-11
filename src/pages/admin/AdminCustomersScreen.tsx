import React, { useState, useMemo } from 'react';
import { Customer, Vehicle } from '../../types';
import Modal from '../../components/admin/Modal';
import { useDatabase } from '../../context/DatabaseContext';
import Spinner from '../../components/Spinner';
import LocationMap from '../../components/admin/LocationMap';
import { useNotification } from '../../context/NotificationContext';
import { Search, Plus, User, Phone, Mail, MapPin, Car, Calendar, History, Shield, Trash2, Edit2, MoreVertical, Eye } from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*                                SUBCOMPONENTS                               */
/* -------------------------------------------------------------------------- */

const StatCard: React.FC<{ title: string; value: number | string; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => (
    <div className="glass-panel p-5 rounded-2xl flex items-center gap-4 border border-white/5 relative overflow-hidden group">
        <div className={`p-3 rounded-xl ${color} bg-opacity-10 text-white shadow-inner ring-1 ring-white/10`}>
            {icon}
        </div>
        <div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{title}</p>
        </div>
    </div>
);

const CustomerDetailsModal: React.FC<{ customer: Customer; onClose: () => void }> = ({ customer, onClose }) => {
    const { db } = useDatabase();
    const [activeTab, setActiveTab] = useState<'details' | 'vehicles' | 'bookings' | 'orders'>('details');

    const customerBookings = useMemo(() => {
        if (!db?.bookings) return [];
        return db.bookings.filter(b => b.customerName === customer.name).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [db, customer.name]);

    const customerOrders = useMemo(() => {
        if (!db?.orders) return [];
        return db.orders.filter(o => o.customerName === customer.name).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [db, customer.name]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Completed': return 'text-green-400 bg-green-500/10 border-green-500/20';
            case 'In Progress': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
            case 'En Route': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
            case 'Upcoming': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
            case 'Cancelled': return 'text-red-400 bg-red-500/10 border-red-500/20';
            default: return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
        }
    };

    const getOrderStatusColor = (status: OrderStatus) => {
        switch (status) {
            case 'Delivered': return 'text-green-400 bg-green-500/10 border-green-500/20';
            case 'Shipped': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
            case 'Processing': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
            case 'Cancelled': return 'text-red-400 bg-red-500/10 border-red-500/20';
            default: return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
        }
    };

    return (
        <Modal title="Customer Profile" isOpen={true} onClose={onClose} maxWidth="max-w-4xl">
            <div className="space-y-6 text-white h-[600px] flex flex-col">
                {/* Header */}
                <div className="flex items-center gap-6 pb-6 border-b border-white/10 shrink-0">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white/10 shadow-xl bg-white/5">
                        <img
                            src={customer.picture || `https://ui-avatars.com/api/?name=${customer.name}&background=random`}
                            alt={customer.name}
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white">{customer.name}</h2>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-gray-400 text-sm mt-1">
                            <span className="flex items-center gap-1"><Mail size={14} /> {customer.email}</span>
                            <span className="hidden sm:block w-1 h-1 bg-gray-600 rounded-full"></span>
                            <span className="flex items-center gap-1"><Phone size={14} /> {customer.phone || 'No phone'}</span>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-6 border-b border-white/10 mb-4 shrink-0 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('details')}
                        className={`pb-3 text-sm font-bold transition-all relative whitespace-nowrap ${activeTab === 'details' ? 'text-primary' : 'text-gray-500 hover:text-white'}`}
                    >
                        Account Details
                        {activeTab === 'details' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></div>}
                    </button>
                    <button
                        onClick={() => setActiveTab('vehicles')}
                        className={`pb-3 text-sm font-bold transition-all relative whitespace-nowrap ${activeTab === 'vehicles' ? 'text-primary' : 'text-gray-500 hover:text-white'}`}
                    >
                        Vehicles ({customer.vehicles?.length || 0})
                        {activeTab === 'vehicles' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></div>}
                    </button>
                    <button
                        onClick={() => setActiveTab('bookings')}
                        className={`pb-3 text-sm font-bold transition-all relative whitespace-nowrap ${activeTab === 'bookings' ? 'text-primary' : 'text-gray-500 hover:text-white'}`}
                    >
                        Bookings ({customerBookings.length})
                        {activeTab === 'bookings' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></div>}
                    </button>
                    <button
                        onClick={() => setActiveTab('orders')}
                        className={`pb-3 text-sm font-bold transition-all relative whitespace-nowrap ${activeTab === 'orders' ? 'text-primary' : 'text-gray-500 hover:text-white'}`}
                    >
                        Orders ({customerOrders.length})
                        {activeTab === 'orders' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></div>}
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    {activeTab === 'details' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
                            <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-4">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Contact Information</h3>
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-xs text-gray-500">Full Name</p>
                                        <p className="text-sm font-medium text-white">{customer.name}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Email Address</p>
                                        <p className="text-sm font-medium text-white">{customer.email}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Phone Number</p>
                                        <p className="text-sm font-medium text-white">{customer.phone || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-4">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Location</h3>
                                {customer.lat && customer.lng ? (
                                    <div className="h-40 rounded-lg overflow-hidden border border-white/10 relative">
                                        <LocationMap latitude={customer.lat} longitude={customer.lng} popupText={customer.name} />
                                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm p-2 text-xs flex items-center justify-center gap-1 text-white">
                                            <MapPin size={12} className="text-primary" /> Registered Location
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-40 rounded-lg border border-white/10 bg-black/20 flex flex-col items-center justify-center text-gray-500">
                                        <MapPin size={32} className="opacity-20 mb-2" />
                                        <p className="text-sm">No location data</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'vehicles' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fadeIn">
                            {customer.vehicles && customer.vehicles.length > 0 ? (
                                customer.vehicles.map((v, i) => (
                                    <div key={i} className="bg-white/5 rounded-xl border border-white/5 overflow-hidden group hover:border-primary/30 transition-all">
                                        <div className="h-32 bg-black/40 relative">
                                            <img src={v.imageUrls?.[0] || 'https://picsum.photos/seed/car/300/200'} alt={v.model} className="w-full h-full object-cover" />
                                            <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-bold uppercase text-white border border-white/10">
                                                {v.type}
                                            </div>
                                        </div>
                                        <div className="p-4">
                                            <h4 className="font-bold text-white text-md">{v.year} {v.make} {v.model}</h4>
                                            <p className="text-xs text-gray-400 mt-1 font-mono">{v.plateNumber}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full py-12 text-center text-gray-500">
                                    <Car size={32} className="mx-auto mb-3 opacity-30" />
                                    <p>No vehicles registered.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'bookings' && (
                        <div className="space-y-4 animate-fadeIn">
                            {customerBookings.length > 0 ? (
                                customerBookings.map((booking) => (
                                    <div key={booking.id} className="bg-white/5 rounded-xl border border-white/5 p-4 flex flex-col sm:flex-row gap-4 hover:border-primary/20 transition-colors">
                                        <div className="flex-grow space-y-2">
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-bold text-white text-md">{booking.service.name}</h4>
                                                <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getStatusColor(booking.status)}`}>
                                                    {booking.status}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 text-xs text-gray-400">
                                                <span className="flex items-center gap-1"><Calendar size={12} /> {booking.date}</span>
                                                <span className="flex items-center gap-1"><History size={12} /> {booking.time}</span>
                                                {booking.mechanic && (
                                                    <span className="flex items-center gap-1 text-primary"><User size={12} /> {booking.mechanic.name}</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <Car size={12} /> {booking.vehicle.year} {booking.vehicle.make} {booking.vehicle.model}
                                            </div>
                                        </div>
                                        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 sm:border-l border-white/10 pt-3 sm:pt-0 sm:pl-4 min-w-[100px]">
                                            <p className="text-lg font-bold text-white">₱{booking.service.price.toLocaleString()}</p>
                                            <span className="text-[10px] text-gray-500 uppercase tracking-wider">{booking.isPaid ? 'Paid' : 'Unpaid'}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-20 text-gray-500">
                                    <History size={48} className="mx-auto mb-4 opacity-30" />
                                    <p>No booking history found.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'orders' && (
                        <div className="space-y-4 animate-fadeIn">
                            {customerOrders.length > 0 ? (
                                customerOrders.map((order) => (
                                    <div key={order.id} className="bg-white/5 rounded-xl border border-white/5 p-4 hover:border-primary/20 transition-colors">
                                        <div className="flex flex-col sm:flex-row justify-between gap-4 mb-3">
                                            <div>
                                                <div className="flex items-center gap-3">
                                                    <h4 className="font-bold text-white text-md">Order #{order.id.substring(0, 8)}</h4>
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getOrderStatusColor(order.status)}`}>
                                                        {order.status}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                                                    <Calendar size={12} /> {new Date(order.date).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-bold text-white">₱{order.total.toLocaleString()}</p>
                                                <span className="text-[10px] text-gray-500 uppercase">{order.items.length} items</span>
                                            </div>
                                        </div>

                                        <div className="space-y-2 border-t border-white/5 pt-3">
                                            {order.items.map((item, idx) => (
                                                <div key={idx} className="flex justify-between items-center text-sm">
                                                    <span className="text-gray-300 flex items-center gap-2">
                                                        <span className="text-xs bg-white/10 px-1.5 rounded text-gray-400">{item.quantity}x</span>
                                                        {item.name}
                                                    </span>
                                                    <span className="text-gray-400">₱{(item.price * item.quantity).toLocaleString()}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-20 text-gray-500">
                                    <p>No order history found.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};

const CustomerFormModal: React.FC<{
    customer?: Customer;
    onClose: () => void;
    onSave: (customer: Customer | Omit<Customer, 'id'>) => Promise<void>;
    onDelete?: (id: string) => Promise<void>;
}> = ({ customer, onClose, onSave, onDelete }) => {
    const [formData, setFormData] = useState({
        name: customer?.name || '',
        email: customer?.email || '',
        phone: customer?.phone || '',
        password: '',
    });
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            if (customer) await onSave({ ...customer, ...formData, password: formData.password || customer.password });
            else await onSave({ ...formData, password: formData.password || 'password', vehicles: [] });
        } finally { setIsSaving(false); }
    };

    return (
        <Modal title={customer ? "Edit Customer" : "New Customer"} isOpen={true} onClose={onClose} maxWidth="max-w-2xl">
            <div className="space-y-6 text-white">
                <div className="flex flex-col items-center gap-4 py-4">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white/10 bg-white/5 flex items-center justify-center shrink-0 relative group cursor-pointer hover:border-primary transition-colors">
                        {customer?.picture ? (
                            <img src={customer.picture} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <User size={32} className="text-gray-500" />
                        )}
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-xs font-bold">Change</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Full Name</label>
                        <input type="text" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-3 focus:border-primary outline-none mt-1" placeholder="e.g. Juan De La Cruz" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Email Address</label>
                        <input type="email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-3 focus:border-primary outline-none mt-1" placeholder="email@example.com" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Phone Number</label>
                        <input type="tel" value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-3 focus:border-primary outline-none mt-1" placeholder="09123456789" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Password</label>
                        <input type="password" placeholder={customer ? "Leave blank to keep current password" : "Set initial password"} value={formData.password} onChange={e => setFormData(p => ({ ...p, password: e.target.value }))} className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-3 focus:border-primary outline-none mt-1" />
                    </div>
                </div>

                <div className="border-t border-white/10 pt-6 flex justify-between items-center">
                    {customer && onDelete && (
                        <button onClick={() => onDelete(customer.id)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10 px-4 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2">
                            <Trash2 size={16} /> Delete
                        </button>
                    )}
                    <div className="flex gap-3 ml-auto">
                        <button onClick={onClose} disabled={isSaving} className="px-5 py-2.5 rounded-xl border border-white/10 font-bold text-gray-400 hover:text-white transition-colors">Cancel</button>
                        <button onClick={handleSave} disabled={isSaving} className="px-5 py-2.5 rounded-xl bg-primary hover:bg-orange-600 font-bold text-white shadow-lg shadow-orange-500/20 transition-colors flex items-center gap-2">
                            {isSaving ? <Spinner size="sm" color="text-white" /> : 'Save Customer'}
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

/* -------------------------------------------------------------------------- */
/*                               MAIN COMPONENT                               */
/* -------------------------------------------------------------------------- */

const AdminCustomersScreen: React.FC = () => {
    const { db, addCustomer, updateCustomer, deleteCustomer, loading } = useDatabase();
    const { addNotification } = useNotification();
    const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
    const [editingCustomer, setEditingCustomer] = useState<Customer | undefined>(undefined);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const customerBookingsCount = useMemo(() => {
        if (!db) return {};
        return db.bookings.reduce((acc, booking) => {
            const customer = db.customers.find(c => c.name === booking.customerName);
            if (customer) acc[customer.id] = (acc[customer.id] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
    }, [db]);

    const filteredCustomers = useMemo(() => {
        if (!db) return [];
        if (!searchQuery) return db.customers;
        const lowercasedQuery = searchQuery.toLowerCase();
        return db.customers.filter(customer => customer.name.toLowerCase().includes(lowercasedQuery) || customer.email.toLowerCase().includes(lowercasedQuery));
    }, [db, searchQuery]);

    const handleSaveCustomer = async (data: Customer | Omit<Customer, 'id'>) => {
        try {
            if ('id' in data) { await updateCustomer(data); addNotification({ type: 'success', title: 'Updated', message: 'Profile saved.', recipientId: 'all' }); }
            else { await addCustomer(data); addNotification({ type: 'success', title: 'Added', message: 'New customer added.', recipientId: 'all' }); }
            setIsFormOpen(false);
            setEditingCustomer(undefined);
        } catch (e) { addNotification({ type: 'error', title: 'Error', message: (e as Error).message, recipientId: 'all' }); }
    };

    const handleDeleteCustomer = async (id: string) => {
        if (!window.confirm("Are you sure? This action cannot be undone.")) return;
        try { await deleteCustomer(id); addNotification({ type: 'success', title: 'Deleted', message: 'Profile removed.', recipientId: 'all' }); setIsFormOpen(false); setEditingCustomer(undefined); }
        catch (e) { addNotification({ type: 'error', title: 'Error', message: (e as Error).message, recipientId: 'all' }); }
    };

    if (loading || !db) return <div className="flex items-center justify-center h-full"><Spinner size="lg" color="text-white" /></div>;

    return (
        <div className="space-y-8 animate-slideInUp">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-white mb-6">Customer Base</h1>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard title="Total Customers" value={db.customers.length} icon={<User size={24} />} color="bg-blue-500" />
                    <StatCard title="Active This Month" value={Math.floor(db.customers.length * 0.7)} icon={<Calendar size={24} />} color="bg-green-500" />
                    <StatCard title="Avg. Vehicles" value={(db.customers.reduce((acc, c) => acc + (c.vehicles?.length || 0), 0) / db.customers.length).toFixed(1)} icon={<Car size={24} />} color="bg-purple-500" />
                    <StatCard title="Total Bookings" value={db.bookings.length} icon={<History size={24} />} color="bg-orange-500" />
                </div>
            </div>

            {/* Content */}
            <div className="flex flex-col gap-6">
                {/* Toolbar */}
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5">
                    <div className="relative w-full md:w-1/3 group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Search name, email, or phone..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all placeholder-gray-600"
                        />
                    </div>
                    <button
                        onClick={() => { setEditingCustomer(undefined); setIsFormOpen(true); }}
                        className="bg-primary hover:bg-orange-600 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-lg shadow-orange-500/20 flex items-center gap-2 whitespace-nowrap w-full md:w-auto justify-center"
                    >
                        <Plus size={20} /> Add Customer
                    </button>
                </div>

                {/* Customer Table */}
                <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/[0.02] text-xs uppercase tracking-wider text-gray-400 font-medium">
                                    <th className="p-5 pl-6">Customer</th>
                                    <th className="p-5">Contact Info</th>
                                    <th className="p-5">Location</th>
                                    <th className="p-5">Vehicles</th>
                                    <th className="p-5">Bookings</th>
                                    <th className="p-5 text-right pr-6">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-sm">
                                {filteredCustomers.length > 0 ? filteredCustomers.map((customer) => (
                                    <tr
                                        key={customer.id}
                                        onClick={() => setViewingCustomer(customer)}
                                        className="group hover:bg-white/5 transition-colors cursor-pointer"
                                    >
                                        <td className="p-5 pl-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full overflow-hidden bg-white/10 flex items-center justify-center flex-shrink-0">
                                                    <img
                                                        src={customer.picture || `https://ui-avatars.com/api/?name=${customer.name}&background=random`}
                                                        alt={customer.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-white group-hover:text-primary transition-colors">{customer.name}</p>
                                                    <p className="text-xs text-gray-500">ID: {customer.id.substring(0, 6)}...</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2 text-gray-300">
                                                    <Mail size={12} className="text-gray-500" /> {customer.email}
                                                </div>
                                                <div className="flex items-center gap-2 text-gray-300">
                                                    <Phone size={12} className="text-gray-500" /> {customer.phone || 'N/A'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            {customer.lat && customer.lng ? (
                                                <div className="flex items-center gap-2 text-blue-400 bg-blue-500/10 px-2 py-1 rounded w-fit text-xs">
                                                    <MapPin size={12} /> Map Location
                                                </div>
                                            ) : (
                                                <span className="text-gray-600 text-xs italic">Not set</span>
                                            )}
                                        </td>
                                        <td className="p-5">
                                            <div className="flex items-center gap-2">
                                                <Car size={16} className="text-gray-500" />
                                                <span className="text-white font-medium">{customer.vehicles?.length || 0}</span>
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <div className="flex items-center gap-2">
                                                <History size={16} className="text-gray-500" />
                                                <span className="text-white font-medium">{customerBookingsCount[customer.id] || 0}</span>
                                            </div>
                                        </td>
                                        <td className="p-5 text-right pr-6" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => setViewingCustomer(customer)}
                                                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                                                    title="View Details"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                <button
                                                    onClick={() => { setEditingCustomer(customer); setIsFormOpen(true); }}
                                                    className="p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteCustomer(customer.id)}
                                                    className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={6} className="p-10 text-center text-gray-500">
                                            <User size={48} className="mx-auto mb-4 opacity-20" />
                                            No customers found matching your search.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {viewingCustomer && (
                <CustomerDetailsModal
                    customer={viewingCustomer}
                    onClose={() => setViewingCustomer(null)}
                />
            )}

            {isFormOpen && (
                <CustomerFormModal
                    customer={editingCustomer}
                    onClose={() => setIsFormOpen(false)}
                    onSave={handleSaveCustomer}
                    onDelete={handleDeleteCustomer}
                />
            )}
        </div>
    );
};

export default AdminCustomersScreen;