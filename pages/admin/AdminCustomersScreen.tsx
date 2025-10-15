import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Customer, Vehicle } from '../../types';
import Modal from '../../components/admin/Modal';
import { useDatabase } from '../../context/DatabaseContext';
import Spinner from '../../components/Spinner';
import LocationMap from '../../components/admin/LocationMap';

const CustomerDetailsModal: React.FC<{ customer: Customer; onClose: () => void; onDelete: (id: string) => void; }> = ({ customer, onClose, onDelete }) => {
    
    const handleDelete = () => {
        if (window.confirm(`Are you sure you want to delete ${customer.name}? This will also remove their associated bookings.`)) {
            onDelete(customer.id);
            onClose();
        }
    };
    
    return (
        <Modal title="Customer Details" isOpen={!!customer} onClose={onClose}>
            <div className="text-white space-y-4 max-h-[75vh] overflow-y-auto pr-2">
                <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                    <img src={customer.picture || 'https://picsum.photos/seed/placeholder/200/200'} alt={customer.name} className="w-24 h-24 rounded-full object-cover flex-shrink-0" />
                    <div>
                        <h3 className="text-2xl font-bold">{customer.name}</h3>
                        <p className="text-light-gray">{customer.email}</p>
                        <p className="text-light-gray text-sm">{customer.phone}</p>
                    </div>
                </div>

                <div className="bg-field p-3 rounded-lg">
                    <h4 className="font-semibold text-primary text-sm mb-2">Login Credentials</h4>
                    <p className="text-xs"><span className="font-semibold text-light-gray w-20 inline-block">Email:</span> {customer.email}</p>
                    <p className="text-xs"><span className="font-semibold text-light-gray w-20 inline-block">Password:</span> password (default)</p>
                </div>

                <div>
                    <h4 className="font-semibold text-primary text-sm mb-2">Vehicles</h4>
                    <div className="space-y-2">
                        {customer.vehicles.length > 0 ? customer.vehicles.map(v => (
                            <div key={v.plateNumber} className="bg-field p-3 rounded-lg flex items-center gap-3">
                                <img src={v.imageUrl || 'https://picsum.photos/seed/car/200/200'} alt={`${v.make} ${v.model}`} className="w-16 h-12 rounded object-cover" />
                                <div>
                                    <p className="font-bold text-sm">{v.year} {v.make} {v.model}</p>
                                    <p className="text-xs text-light-gray font-mono">{v.plateNumber}</p>
                                </div>
                            </div>
                        )) : <p className="text-xs text-light-gray">No vehicles registered.</p>}
                    </div>
                </div>
                
                 <div>
                    <h4 className="font-semibold text-primary text-sm mb-2">Location</h4>
                    {customer.lat && customer.lng ? (
                        <LocationMap latitude={customer.lat} longitude={customer.lng} popupText={customer.name} />
                    ) : (
                         <p className="text-xs text-light-gray">Location data not available.</p>
                    )}
                 </div>
                
                 <div className="border-t border-field pt-4 flex justify-end">
                    <button onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg text-sm">Delete Customer</button>
                 </div>
            </div>
        </Modal>
    );
};


// Main Screen Component
const AdminCustomersScreen: React.FC = () => {
    const { db, deleteCustomer, loading } = useDatabase();
    const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const customerBookingsCount = useMemo(() => {
        if (!db) return {};
        return db.bookings.reduce((acc, booking) => {
            const customer = db.customers.find(c => c.name === booking.customerName);
            if (customer) {
                acc[customer.id] = (acc[customer.id] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);
    }, [db]);


    const filteredCustomers = useMemo(() => {
        if (!db) return [];
        if (!searchQuery) return db.customers;
        
        const lowercasedQuery = searchQuery.toLowerCase();
        return db.customers.filter(customer =>
            customer.name.toLowerCase().includes(lowercasedQuery) ||
            customer.email.toLowerCase().includes(lowercasedQuery)
        );
    }, [db, searchQuery]);


    if (loading || !db) {
        return <div className="flex items-center justify-center h-full bg-dark-gray"><Spinner size="lg" color="text-white" /></div>
    }
    
    return (
        <div className="text-white flex flex-col h-full overflow-hidden bg-dark-gray">
            <div className="flex-shrink-0 px-6 lg:px-8 py-6">
                <h1 className="text-3xl font-bold mb-4">Manage Customers</h1>
                <div className="relative">
                     <input type="text" placeholder="Search by name or email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-field border border-secondary rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-1 focus:ring-primary" />
                     <span className="absolute inset-y-0 left-0 flex items-center pl-3"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-light-gray" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg></span>
                </div>
            </div>
            <div className="flex-1 overflow-auto px-6 lg:px-8">
                <table className="w-full text-left border-collapse">
                     <thead className="sticky top-0 bg-dark-gray z-10">
                        <tr>
                            <th className="py-4 font-bold text-light-gray uppercase tracking-wider text-sm border-b border-secondary">Name</th>
                            <th className="py-4 font-bold text-light-gray uppercase tracking-wider text-sm border-b border-secondary">Email</th>
                            <th className="py-4 font-bold text-light-gray uppercase tracking-wider text-sm border-b border-secondary">Phone</th>
                            <th className="py-4 font-bold text-light-gray uppercase tracking-wider text-sm border-b border-secondary text-center">Vehicles</th>
                            <th className="py-4 font-bold text-light-gray uppercase tracking-wider text-sm border-b border-secondary text-center">Total Bookings</th>
                            <th className="py-4 font-bold text-light-gray uppercase tracking-wider text-sm border-b border-secondary">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredCustomers.map((customer) => (
                             <tr key={customer.id} className="hover:bg-secondary">
                                <td className="py-4 px-2 text-gray-200 border-b border-secondary">
                                    <div className="flex items-center gap-3"><img src={customer.picture || 'https://picsum.photos/seed/placeholder/200/200'} alt={customer.name} className="w-10 h-10 rounded-full object-cover" /><span>{customer.name}</span></div>
                                </td>
                                <td className="py-4 px-2 text-gray-200 border-b border-secondary">{customer.email}</td>
                                <td className="py-4 px-2 text-gray-200 border-b border-secondary">{customer.phone}</td>
                                <td className="py-4 px-2 text-gray-200 border-b border-secondary text-center">{customer.vehicles.length}</td>
                                <td className="py-4 px-2 text-gray-200 border-b border-secondary text-center font-bold">{customerBookingsCount[customer.id] || 0}</td>
                                <td className="py-4 px-2 text-sm border-b border-secondary"><button onClick={() => setViewingCustomer(customer)} className="font-semibold text-blue-400 hover:text-blue-300 mr-4">View Details</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {viewingCustomer && <CustomerDetailsModal customer={viewingCustomer} onClose={() => setViewingCustomer(null)} onDelete={deleteCustomer} />}
        </div>
    );
};

export default AdminCustomersScreen;