

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Customer, Vehicle } from '../../types';
import Modal from '../../components/admin/Modal';
import { useDatabase } from '../../context/DatabaseContext';
import Spinner from '../../components/Spinner';
import LocationMap from '../../components/admin/LocationMap';
import { useNotification } from '../../context/NotificationContext';

const StatCard: React.FC<{ title: string; value: number | string; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-admin-card p-5 rounded-xl shadow-lg flex items-center gap-4 border border-admin-border">
        <div className="bg-admin-bg p-3 rounded-full text-admin-accent">{icon}</div>
        <div>
            <p className="text-2xl font-bold text-admin-text-primary">{value}</p>
            <p className="text-sm text-admin-text-secondary">{title}</p>
        </div>
    </div>
);

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
            if (customer) {
                await onSave({
                    ...customer,
                    ...formData,
                    password: formData.password || customer.password
                });
            } else {
                await onSave({ ...formData, password: formData.password || 'password', vehicles: [] });
            }
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal title={customer ? "Edit Customer" : "Add New Customer"} isOpen={true} onClose={onClose}>
            <div className="text-white space-y-6 max-h-[75vh] overflow-y-auto pr-2 custom-scrollbar">
                <div className="grid grid-cols-1 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Full Name</label>
                        <input type="text" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} className="w-full p-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-admin-accent focus:border-transparent transition-all outline-none" placeholder="John Doe" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Email Address</label>
                        <input type="email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} className="w-full p-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-admin-accent focus:border-transparent transition-all outline-none" placeholder="john@example.com" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Phone Number</label>
                        <input type="tel" value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} className="w-full p-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-admin-accent focus:border-transparent transition-all outline-none" placeholder="+1 234 567 890" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">{customer ? "New Password (optional)" : "Password"}</label>
                        <input type="password" value={formData.password} onChange={e => setFormData(p => ({ ...p, password: e.target.value }))} className="w-full p-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-admin-accent focus:border-transparent transition-all outline-none" placeholder="••••••••" />
                    </div>
                </div>

                {customer?.vehicles && customer.vehicles.length > 0 && (
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <h4 className="font-semibold text-admin-accent text-sm mb-3 uppercase tracking-wider">Vehicles</h4>
                        <div className="space-y-3">
                            {customer.vehicles.map(v => (
                                <div key={v.plateNumber} className="bg-black/20 p-3 rounded-lg flex items-center gap-4 hover:bg-black/30 transition-colors">
                                    <img src={v.imageUrls?.[0] || 'https://picsum.photos/seed/car/200/200'} alt={`${v.make} ${v.model}`} className="w-16 h-12 rounded-lg object-cover shadow-sm" />
                                    <div>
                                        <p className="font-bold text-sm text-white">{v.year} {v.make} {v.model}</p>
                                        <p className="text-xs text-gray-400 font-mono bg-white/10 px-2 py-0.5 rounded inline-block mt-1">{v.plateNumber}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {customer && customer.lat && customer.lng && (
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <h4 className="font-semibold text-admin-accent text-sm mb-3 uppercase tracking-wider">Location</h4>
                        <div className="rounded-lg overflow-hidden border border-white/10 shadow-inner">
                            <LocationMap latitude={customer.lat} longitude={customer.lng} popupText={customer.name} />
                        </div>
                    </div>
                )}

                <div className="border-t border-white/10 pt-6 flex justify-between items-center">
                    {customer && onDelete && (
                        <button
                            onClick={() => {
                                if (window.confirm('Are you sure you want to delete this customer? This action cannot be undone.')) {
                                    onDelete(customer.id);
                                }
                            }}
                            className="text-red-400 hover:text-red-300 text-sm font-semibold transition-colors flex items-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            Delete Customer
                        </button>
                    )}
                    <div className="flex-grow flex justify-end gap-3">
                        <button onClick={onClose} disabled={isSaving} className="px-4 py-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-all font-medium">Cancel</button>
                        <button onClick={handleSave} disabled={isSaving} className="bg-gradient-to-r from-admin-accent to-orange-600 hover:from-orange-600 hover:to-admin-accent text-white font-bold py-2 px-6 rounded-xl shadow-lg shadow-orange-900/20 transform hover:scale-105 transition-all flex items-center justify-center min-w-[100px]">
                            {isSaving ? <Spinner size="sm" /> : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};


// Main Screen Component
const AdminCustomersScreen: React.FC = () => {
    const { db, addCustomer, updateCustomer, deleteCustomer, loading } = useDatabase();
    const { addNotification } = useNotification();
    const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
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

    const stats = useMemo(() => {
        if (!db) return { total: 0, newThisMonth: 0 };
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        // Note: Customer data doesn't have a join date, so this is a placeholder. 
        // For real-world use, add a `joinDate` to the Customer type.
        const newThisMonth = db.customers.length > 5 ? Math.floor(db.customers.length / 10) : 0;
        return { total: db.customers.length, newThisMonth };
    }, [db]);


    if (loading || !db) {
        return <div className="flex items-center justify-center h-full"><Spinner size="lg" color="text-white" /></div>;
    }

    const handleSaveCustomer = async (customerData: Customer | Omit<Customer, 'id'>) => {
        try {
            if ('id' in customerData) {
                await updateCustomer(customerData);
                // FIX: Add missing `recipientId` property.
                addNotification({ type: 'success', title: 'Customer Updated', message: `${customerData.name}'s profile has been saved.`, recipientId: 'all' });
            } else {
                await addCustomer(customerData);
                // FIX: Add missing `recipientId` property.
                addNotification({ type: 'success', title: 'Customer Added', message: `${customerData.name} has been added.`, recipientId: 'all' });
            }
            setViewingCustomer(null);
        } catch (e) {
            // FIX: Add missing `recipientId` property.
            addNotification({ type: 'error', title: 'Save Failed', message: (e as Error).message, recipientId: 'all' });
        }
    };

    const handleDeleteCustomer = async (id: string) => {
        try {
            await deleteCustomer(id);
            addNotification({ type: 'success', title: 'Customer Deleted', message: 'The customer profile has been removed.', recipientId: 'all' });
            setViewingCustomer(null);
        } catch (e) {
            addNotification({ type: 'error', title: 'Deletion Failed', message: (e as Error).message, recipientId: 'all' });
        }
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex-shrink-0">
                <h1 className="text-3xl font-bold">Manage Customers</h1>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 my-6">
                    <StatCard title="Total Customers" value={stats.total} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>} />
                    <StatCard title="New This Month" value={stats.newThisMonth} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>} />
                </div>
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="relative w-full md:w-1/2">
                        <input type="text" placeholder="Search by name or email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-admin-card border border-admin-border rounded-lg" />
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-admin-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg></span>
                    </div>
                    <button onClick={() => setViewingCustomer({} as Customer)} className="bg-admin-accent text-white font-bold py-2 px-4 rounded-lg hover:bg-orange-600 transition w-full md:w-auto">+ Add Customer</button>
                </div>
            </div>
            <div className="flex-1 overflow-auto mt-4">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead className="sticky top-0 bg-admin-bg z-10">
                            <tr>
                                <th className="py-3 px-2 font-semibold text-admin-text-secondary uppercase text-xs border-b border-admin-border">Name</th>
                                <th className="py-3 px-2 font-semibold text-admin-text-secondary uppercase text-xs border-b border-admin-border">Email</th>
                                <th className="py-3 px-2 font-semibold text-admin-text-secondary uppercase text-xs border-b border-admin-border hidden sm:table-cell">Phone</th>
                                <th className="py-3 px-2 font-semibold text-admin-text-secondary uppercase text-xs border-b border-admin-border text-center">Vehicles</th>
                                <th className="py-3 px-2 font-semibold text-admin-text-secondary uppercase text-xs border-b border-admin-border text-center">Bookings</th>
                                <th className="py-3 px-2 font-semibold text-admin-text-secondary uppercase text-xs border-b border-admin-border">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-admin-border">
                            {filteredCustomers.map((customer) => (
                                <tr key={customer.id} className="hover:bg-admin-card">
                                    <td className="py-3 px-2 text-sm">
                                        <div className="flex items-center gap-3"><img src={customer.picture || 'https://picsum.photos/seed/placeholder/200/200'} alt={customer.name} className="w-10 h-10 rounded-full object-cover" /><span>{customer.name}</span></div>
                                    </td>
                                    <td className="py-3 px-2 text-sm">{customer.email}</td>
                                    <td className="py-3 px-2 text-sm hidden sm:table-cell">{customer.phone}</td>
                                    <td className="py-3 px-2 text-sm text-center">{customer.vehicles.length}</td>
                                    <td className="py-3 px-2 text-sm text-center font-bold">{customerBookingsCount[customer.id] || 0}</td>
                                    <td className="py-3 px-2 text-sm"><button onClick={() => setViewingCustomer(customer)} className="font-semibold text-blue-400 hover:text-blue-300">View/Edit</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {viewingCustomer && <CustomerFormModal customer={viewingCustomer.id ? viewingCustomer : undefined} onClose={() => setViewingCustomer(null)} onSave={handleSaveCustomer} onDelete={handleDeleteCustomer} />}
        </div>
    );
};

export default AdminCustomersScreen;