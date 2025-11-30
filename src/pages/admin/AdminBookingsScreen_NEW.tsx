import React, { useState, useMemo } from 'react';
import { Booking, BookingStatus, Customer, Service, Vehicle, Mechanic } from '../../types';
import { useDatabase } from '../../context/DatabaseContext';
import Spinner from '../../components/Spinner';
import Modal from '../../components/admin/Modal';
import { useNotification } from '../../context/NotificationContext';

type SortableKeys = 'customerName' | 'mechanicName' | 'date' | 'price';

const StatCard: React.FC<{ title: string; value: number | string; change?: number; icon: React.ReactNode; prefix?: string }> = ({ title, value, change, icon, prefix }) => (
    <div className="bg-white/5 p-5 rounded-xl shadow-lg border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
        <div className="flex items-center justify-between mb-2">
            <div className="bg-admin-accent/20 p-3 rounded-full text-admin-accent">{icon}</div>
            {change !== undefined && !isNaN(change) && (
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${change >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                </span>
            )}
        </div>
        <p className="text-3xl font-extrabold text-white tracking-tight">{prefix}{value}</p>
        <p className="text-sm text-gray-400 mt-1 uppercase tracking-wider">{title}</p>
    </div>
);

const AddBookingModal: React.FC<{ onClose: () => void; onSave: (booking: Partial<Booking>) => void }> = ({ onClose, onSave }) => {
    const { db } = useDatabase();
    const [formData, setFormData] = useState({
        customerId: '',
        serviceId: '',
        vehicleId: '',
        mechanicId: '',
        date: '',
        time: '',
        location: '',
        notes: ''
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const customers = db?.customers || [];
    const services = db?.services || [];
    const mechanics = db?.mechanics.filter(m => m.status === 'Active') || [];

    const selectedCustomer = customers.find(c => c.id === formData.customerId);
    const vehicles = selectedCustomer?.vehicles || [];
    const selectedService = services.find(s => s.id === formData.serviceId);

    const validate = () => {
        const newErrors: { [key: string]: string } = {};
        if (!formData.customerId) newErrors.customerId = 'Customer is required';
        if (!formData.serviceId) newErrors.serviceId = 'Service is required';
        if (!formData.vehicleId) newErrors.vehicleId = 'Vehicle is required';
        if (!formData.date) newErrors.date = 'Date is required';
        if (!formData.time) newErrors.time = 'Time is required';
        if (!formData.location.trim()) newErrors.location = 'Location is required';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (!validate()) return;

        const customer = customers.find(c => c.id === formData.customerId)!;
        const service = services.find(s => s.id === formData.serviceId)!;
        const vehicle = vehicles.find(v => v.id === formData.vehicleId)!;
        const mechanic = mechanics.find(m => m.id === formData.mechanicId);

        const newBooking: Partial<Booking> = {
            customerName: customer.name,
            service: { id: service.id, name: service.name, price: service.price },
            vehicle: { make: vehicle.make, model: vehicle.model, year: vehicle.year, plateNumber: vehicle.plateNumber },
            mechanic: mechanic ? { id: mechanic.id, name: mechanic.name, email: mechanic.email, rating: mechanic.rating, reviews: mechanic.reviews, imageUrl: mechanic.imageUrl } : undefined,
            date: formData.date,
            time: formData.time,
            location: formData.location,
            notes: formData.notes,
            status: 'Upcoming' as BookingStatus,
            isPaid: false
        };

        onSave(newBooking);
    };

    return (
        <Modal title="Create New Booking" isOpen={true} onClose={onClose}>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Customer *</label>
                        <select
                            value={formData.customerId}
                            onChange={(e) => setFormData({ ...formData, customerId: e.target.value, vehicleId: '' })}
                            className={`w-full p-3 bg-white/5 border rounded-xl text-white focus:ring-2 focus:ring-admin-accent transition-all ${errors.customerId ? 'border-red-500' : 'border-white/10'}`}
                        >
                            <option value="">Select Customer</option>
                            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        {errors.customerId && <p className="text-red-400 text-xs mt-1">{errors.customerId}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Service *</label>
                        <select
                            value={formData.serviceId}
                            onChange={(e) => setFormData({ ...formData, serviceId: e.target.value })}
                            className={`w-full p-3 bg-white/5 border rounded-xl text-white focus:ring-2 focus:ring-admin-accent transition-all ${errors.serviceId ? 'border-red-500' : 'border-white/10'}`}
                        >
                            <option value="">Select Service</option>
                            {services.map(s => <option key={s.id} value={s.id}>{s.name} - ₱{s.price}</option>)}
                        </select>
                        {errors.serviceId && <p className="text-red-400 text-xs mt-1">{errors.serviceId}</p>}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Vehicle *</label>
                        <select
                            value={formData.vehicleId}
                            onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                            disabled={!formData.customerId}
                            className={`w-full p-3 bg-white/5 border rounded-xl text-white focus:ring-2 focus:ring-admin-accent transition-all disabled:opacity-50 ${errors.vehicleId ? 'border-red-500' : 'border-white/10'}`}
                        >
                            <option value="">Select Vehicle</option>
                            {vehicles.map(v => <option key={v.id} value={v.id}>{v.year} {v.make} {v.model} ({v.plateNumber})</option>)}
                        </select>
                        {errors.vehicleId && <p className="text-red-400 text-xs mt-1">{errors.vehicleId}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Mechanic (Optional)</label>
                        <select
                            value={formData.mechanicId}
                            onChange={(e) => setFormData({ ...formData, mechanicId: e.target.value })}
                            className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-admin-accent transition-all"
                        >
                            <option value="">Assign Later</option>
                            {mechanics.map(m => <option key={m.id} value={m.id}>{m.name} (⭐ {m.rating})</option>)}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Date *</label>
                        <input
                            type="date"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            className={`w-full p-3 bg-white/5 border rounded-xl text-white focus:ring-2 focus:ring-admin-accent transition-all ${errors.date ? 'border-red-500' : 'border-white/10'}`}
                        />
                        {errors.date && <p className="text-red-400 text-xs mt-1">{errors.date}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Time *</label>
                        <input
                            type="time"
                            value={formData.time}
                            onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                            className={`w-full p-3 bg-white/5 border rounded-xl text-white focus:ring-2 focus:ring-admin-accent transition-all ${errors.time ? 'border-red-500' : 'border-white/10'}`}
                        />
                        {errors.time && <p className="text-red-400 text-xs mt-1">{errors.time}</p>}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Location *</label>
                    <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        placeholder="Enter service location address"
                        className={`w-full p-3 bg-white/5 border rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-admin-accent transition-all ${errors.location ? 'border-red-500' : 'border-white/10'}`}
                    />
                    {errors.location && <p className="text-red-400 text-xs mt-1">{errors.location}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Notes</label>
                    <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Additional notes or special instructions..."
                        rows={3}
                        className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-admin-accent transition-all resize-none"
                    />
                </div>

                {selectedService && (
                    <div className="bg-admin-accent/10 border border-admin-accent/30 p-4 rounded-xl">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-300">Total Price:</span>
                            <span className="text-2xl font-bold text-admin-accent">₱{selectedService.price.toLocaleString()}</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-white/10">
                <button onClick={onClose} className="px-6 py-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-all font-medium">Cancel</button>
                <button onClick={handleSubmit} className="bg-admin-accent hover:bg-orange-600 text-white font-bold py-2 px-6 rounded-xl shadow-lg transform hover:scale-105 transition-all">Create Booking</button>
            </div>
        </Modal>
    );
};

// Continue with rest of the file...
