import React, { useState, useMemo } from 'react';
import { Booking, BookingStatus, Customer } from '../../types';
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

const AddBookingModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { db, addBooking } = useDatabase();
    const { addNotification } = useNotification();
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
    const [isSubmitting, setIsSubmitting] = useState(false);

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

    const handleSubmit = async () => {
        if (!validate() || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const customer = customers.find(c => c.id === formData.customerId)!;
            const service = services.find(s => s.id === formData.serviceId)!;
            const vehicle = vehicles.find(v => v.id === formData.vehicleId)!;
            const mechanic = mechanics.find(m => m.id === formData.mechanicId);

            const newBooking: any = {
                customerId: customer.id,
                customerName: customer.name,
                service: { id: service.id, name: service.name, price: service.price },
                vehicle: { make: vehicle.make, model: vehicle.model, year: vehicle.year, plateNumber: vehicle.plateNumber },
                vehicleId: vehicle.id,
                mechanic: mechanic ? { id: mechanic.id, name: mechanic.name, email: mechanic.email, rating: mechanic.rating, reviews: mechanic.reviews, imageUrl: mechanic.imageUrl } : undefined,
                date: formData.date,
                time: formData.time,
                location: { address: formData.location },
                notes: formData.notes,
                status: 'Upcoming' as BookingStatus,
                isPaid: false,
                statusHistory: [{ status: 'Upcoming', timestamp: new Date().toISOString() }]
            };

            const result = await addBooking(newBooking);
            if (result) {
                addNotification({ type: 'success', title: 'Booking Created', message: `Booking for ${customer.name} has been created successfully.`, recipientId: 'all' });
                onClose();
            } else {
                throw new Error('Failed to create booking');
            }
        } catch (error) {
            addNotification({ type: 'error', title: 'Creation Failed', message: (error as Error).message, recipientId: 'all' });
        } finally {
            setIsSubmitting(false);
        }
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
                            {services.map(s => <option key={s.id} value={s.id}>{s.name} - ₱{s.price.toLocaleString()}</option>)}
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
                            min={new Date().toISOString().split('T')[0]}
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
                <button onClick={onClose} disabled={isSubmitting} className="px-6 py-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-all font-medium disabled:opacity-50">Cancel</button>
                <button onClick={handleSubmit} disabled={isSubmitting} className="bg-admin-accent hover:bg-orange-600 text-white font-bold py-2 px-6 rounded-xl shadow-lg transform hover:scale-105 transition-all disabled:opacity-50">
                    {isSubmitting ? 'Creating...' : 'Create Booking'}
                </button>
            </div>
        </Modal>
    );
};

const EditBookingModal: React.FC<{ booking: Booking; onClose: () => void }> = ({ booking, onClose }) => {
    const { db, updateBooking } = useDatabase();
    const { addNotification } = useNotification();
    const [formData, setFormData] = useState({
        serviceId: booking.service.id,
        mechanicId: booking.mechanic?.id || '',
        date: booking.date,
        time: booking.time,
        status: booking.status,
        notes: booking.notes || ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const services = db?.services || [];
    const mechanics = db?.mechanics.filter(m => m.status === 'Active') || [];
    const selectedService = services.find(s => s.id === formData.serviceId);

    const handleSubmit = async () => {
        if (isSubmitting) return;

        setIsSubmitting(true);
        try {
            const service = services.find(s => s.id === formData.serviceId)!;
            const mechanic = mechanics.find(m => m.id === formData.mechanicId);

            const updates: Partial<Booking> = {
                service: { id: service.id, name: service.name, price: service.price },
                mechanic: mechanic ? { id: mechanic.id, name: mechanic.name, email: mechanic.email, rating: mechanic.rating, reviews: mechanic.reviews, imageUrl: mechanic.imageUrl } : undefined,
                date: formData.date,
                time: formData.time,
                status: formData.status,
                notes: formData.notes
            };

            await updateBooking(booking.id, updates);
            addNotification({ type: 'success', title: 'Booking Updated', message: `Booking #${booking.id.slice(-6)} has been updated.`, recipientId: 'all' });
            onClose();
        } catch (error) {
            addNotification({ type: 'error', title: 'Update Failed', message: (error as Error).message, recipientId: 'all' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal title={`Edit Booking #${booking.id.toUpperCase().slice(-6)}`} isOpen={true} onClose={onClose}>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                    <p className="text-sm text-gray-400">Customer</p>
                    <p className="text-lg font-bold text-white">{booking.customerName}</p>
                    <p className="text-sm text-gray-400 mt-2">Vehicle</p>
                    <p className="text-white">{booking.vehicle.year} {booking.vehicle.make} {booking.vehicle.model} ({booking.vehicle.plateNumber})</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Service</label>
                    <select
                        value={formData.serviceId}
                        onChange={(e) => setFormData({ ...formData, serviceId: e.target.value })}
                        className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-admin-accent transition-all"
                    >
                        {services.map(s => <option key={s.id} value={s.id}>{s.name} - ₱{s.price.toLocaleString()}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Mechanic</label>
                    <select
                        value={formData.mechanicId}
                        onChange={(e) => setFormData({ ...formData, mechanicId: e.target.value })}
                        className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-admin-accent transition-all"
                    >
                        <option value="">Unassigned</option>
                        {mechanics.map(m => <option key={m.id} value={m.id}>{m.name} (⭐ {m.rating})</option>)}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Date</label>
                        <input
                            type="date"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-admin-accent transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Time</label>
                        <input
                            type="time"
                            value={formData.time}
                            onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                            className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-admin-accent transition-all"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Status</label>
                    <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as BookingStatus })}
                        className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-admin-accent transition-all"
                    >
                        <option value="Upcoming">Upcoming</option>
                        <option value="Booking Confirmed">Booking Confirmed</option>
                        <option value="Mechanic Assigned">Mechanic Assigned</option>
                        <option value="En Route">En Route</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Notes</label>
                    <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        rows={3}
                        className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-admin-accent transition-all resize-none"
                    />
                </div>

                {selectedService && (
                    <div className="bg-admin-accent/10 border border-admin-accent/30 p-4 rounded-xl">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-300">Updated Price:</span>
                            <span className="text-2xl font-bold text-admin-accent">₱{selectedService.price.toLocaleString()}</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-white/10">
                <button onClick={onClose} disabled={isSubmitting} className="px-6 py-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-all font-medium disabled:opacity-50">Cancel</button>
                <button onClick={handleSubmit} disabled={isSubmitting} className="bg-admin-accent hover:bg-orange-600 text-white font-bold py-2 px-6 rounded-xl shadow-lg transform hover:scale-105 transition-all disabled:opacity-50">
                    {isSubmitting ? 'Updating...' : 'Update Booking'}
                </button>
            </div>
        </Modal>
    );
};

const BookingDetailsModal: React.FC<{ booking: Booking; customer?: Customer, onClose: () => void; }> = ({ booking, customer, onClose }) => (
    <Modal title={`Booking Details #${booking.id.toUpperCase().slice(-6)}`} isOpen={true} onClose={onClose}>
        <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-2 custom-scrollbar text-white">
            <div className="bg-gradient-to-r from-admin-accent/20 to-transparent p-6 rounded-xl border border-admin-accent/30">
                <h3 className="font-bold text-admin-accent mb-2 text-sm uppercase tracking-wider">Service & Price</h3>
                <p className="font-bold text-2xl text-white">{booking.service.name}</p>
                <p className="text-3xl font-extrabold text-admin-accent mt-2">₱{booking.service.price.toLocaleString()}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/5 p-5 rounded-xl border border-white/10">
                    <h3 className="font-bold text-gray-400 mb-3 text-xs uppercase tracking-wider">Customer Info</h3>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold">
                            {customer?.name.charAt(0) || 'C'}
                        </div>
                        <div>
                            <p className="font-semibold text-white">{customer?.name || booking.customerName}</p>
                            <p className="text-xs text-gray-400">Customer</p>
                        </div>
                    </div>
                    <div className="space-y-2 text-sm text-gray-300">
                        <p className="flex items-center gap-2"><span className="text-gray-500">📧</span> {customer?.email || 'N/A'}</p>
                        <p className="flex items-center gap-2"><span className="text-gray-500">📱</span> {customer?.phone || 'N/A'}</p>
                    </div>
                </div>

                <div className="bg-white/5 p-5 rounded-xl border border-white/10">
                    <h3 className="font-bold text-gray-400 mb-3 text-xs uppercase tracking-wider">Vehicle Details</h3>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 font-bold">🚗</div>
                        <div>
                            <p className="font-semibold text-white">{booking.vehicle.year} {booking.vehicle.make} {booking.vehicle.model}</p>
                            <p className="text-xs text-gray-400">Vehicle</p>
                        </div>
                    </div>
                    <div className="space-y-2 text-sm text-gray-300">
                        <p className="flex items-center gap-2"><span className="text-gray-500">🔢</span> <span className="font-mono bg-black/30 px-2 py-0.5 rounded">{booking.vehicle.plateNumber}</span></p>
                    </div>
                </div>
            </div>

            <div className="bg-white/5 p-5 rounded-xl border border-white/10">
                <h3 className="font-bold text-gray-400 mb-3 text-xs uppercase tracking-wider">Assigned Mechanic</h3>
                {booking.mechanic ? (
                    <div className="flex items-center gap-4">
                        <img src={booking.mechanic.imageUrl || 'https://picsum.photos/seed/mech/100/100'} alt={booking.mechanic.name} className="w-12 h-12 rounded-full object-cover border-2 border-admin-accent" />
                        <div>
                            <p className="font-semibold text-white text-lg">{booking.mechanic.name}</p>
                            <div className="flex items-center gap-3 text-sm text-gray-400">
                                <span>{booking.mechanic.email}</span>
                                <span className="text-yellow-400 flex items-center gap-1 bg-yellow-400/10 px-2 py-0.5 rounded-full">
                                    ⭐ {booking.mechanic.rating} <span className="text-gray-500">({booking.mechanic.reviews})</span>
                                </span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-3 text-gray-400 bg-black/20 p-3 rounded-lg border border-white/5 border-dashed">
                        <span className="text-2xl">⚠️</span>
                        <p>No mechanic assigned yet.</p>
                    </div>
                )}
            </div>

            {booking.statusHistory && (
                <div className="bg-white/5 p-5 rounded-xl border border-white/10">
                    <h3 className="font-bold text-gray-400 mb-4 text-xs uppercase tracking-wider">Timeline</h3>
                    <div className="relative pl-2">
                        <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-white/10"></div>
                        <ul className="space-y-6">
                            {booking.statusHistory.map((s, i) => (
                                <li key={i} className="text-sm flex justify-between items-center relative pl-6">
                                    <div className={`absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 ${i === booking.statusHistory!.length - 1 ? 'bg-admin-accent border-admin-accent shadow-[0_0_10px_rgba(249,115,22,0.5)]' : 'bg-admin-bg border-gray-600'}`}></div>
                                    <span className={`font-semibold ${i === booking.statusHistory!.length - 1 ? 'text-white' : 'text-gray-400'}`}>{s.status}</span>
                                    <span className="text-xs text-gray-500 font-mono">{new Date(s.timestamp).toLocaleString()}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    </Modal>
);

const CancellationModal: React.FC<{ booking: Booking; onClose: () => void; onConfirm: (reason: string) => void; }> = ({ booking, onClose, onConfirm }) => {
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
            <div className="space-y-6 text-white">
                <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                        <h4 className="font-bold text-red-400">Warning</h4>
                        <p className="text-sm text-gray-300 mt-1">You are about to cancel the booking for <span className="font-bold text-white">{booking.customerName}</span>. This action will notify the customer and mechanic.</p>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Cancellation Reason</label>
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="e.g., Customer request, mechanic unavailable, weather conditions..."
                        rows={4}
                        className={`w-full p-4 bg-white/5 border rounded-xl placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all outline-none resize-none ${error ? 'border-red-500' : 'border-white/10'}`}
                    />
                    {error && <p className="text-red-400 text-xs mt-2 flex items-center gap-1"><span>🚫</span> {error}</p>}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                    <button onClick={onClose} className="px-4 py-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-all font-medium">Keep Booking</button>
                    <button onClick={handleConfirm} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-xl shadow-lg shadow-red-900/20 transform hover:scale-105 transition-all">Confirm Cancellation</button>
                </div>
            </div>
        </Modal>
    );
};

const AdminBookingsScreen: React.FC = () => {
    const { db, updateBookingStatus, cancelBooking, loading } = useDatabase();
    const { addNotification } = useNotification();
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [selectedStatus, setSelectedStatus] = useState<BookingStatus | 'all'>('all');
    const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' }>({ key: 'date', direction: 'descending' });
    const [cancellingBooking, setCancellingBooking] = useState<Booking | null>(null);
    const [viewingBooking, setViewingBooking] = useState<Booking | null>(null);
    const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);

    if (loading || !db) {
        return <div className="flex items-center justify-center h-full"><Spinner size="lg" color="text-white" /></div>;
    }

    const { bookings } = db;

    const viewingCustomer = useMemo(() => {
        if (!viewingBooking || !db) return undefined;
        return db.customers.find(c => c.name === viewingBooking.customerName);
    }, [viewingBooking, db]);

    const bookingStatuses: Array<BookingStatus | 'all'> = ['all', 'Upcoming', 'Booking Confirmed', 'Mechanic Assigned', 'En Route', 'In Progress', 'Completed', 'Cancelled'];

    // Enhanced KPIs with real-time calculations
    const kpis = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

        const currentMonthBookings = bookings.filter(b => {
            const bookingDate = new Date(b.date.replace(/-/g, '/'));
            return bookingDate.getMonth() === currentMonth && bookingDate.getFullYear() === currentYear;
        });

        const lastMonthBookings = bookings.filter(b => {
            const bookingDate = new Date(b.date.replace(/-/g, '/'));
            return bookingDate.getMonth() === lastMonth && bookingDate.getFullYear() === lastMonthYear;
        });

        const currentMonthRevenue = currentMonthBookings.filter(b => b.status === 'Completed').reduce((sum, b) => sum + b.service.price, 0);
        const lastMonthRevenue = lastMonthBookings.filter(b => b.status === 'Completed').reduce((sum, b) => sum + b.service.price, 0);
        const revenueChange = lastMonthRevenue > 0 ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;

        const completedBookings = bookings.filter(b => b.status === 'Completed');
        const totalRevenue = completedBookings.reduce((sum, b) => sum + b.service.price, 0);
        const avgBookingValue = completedBookings.length > 0 ? totalRevenue / completedBookings.length : 0;
        const completionRate = bookings.length > 0 ? (completedBookings.length / bookings.length) * 100 : 0;
        const upcomingCount = bookings.filter(b => b.status === 'Upcoming' || b.status === 'Booking Confirmed').length;
        const cancelledCount = bookings.filter(b => b.status === 'Cancelled').length;

        const bookingChange = lastMonthBookings.length > 0 ? ((currentMonthBookings.length - lastMonthBookings.length) / lastMonthBookings.length) * 100 : 0;

        return {
            total: bookings.length,
            totalChange: bookingChange,
            revenue: currentMonthRevenue,
            revenueChange,
            avgValue: avgBookingValue,
            completionRate,
            upcoming: upcomingCount,
            cancelled: cancelledCount
        };
    }, [bookings]);

    const filteredAndSortedBookings = useMemo(() => {
        let filtered = bookings.filter(booking => {
            const matchesSearch = booking.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                booking.service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                booking.mechanic?.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = selectedStatus === 'all' || booking.status === selectedStatus;

            let matchesDate = true;
            if (dateFilter.start || dateFilter.end) {
                const bookingDate = new Date(booking.date.replace(/-/g, '/'));
                if (dateFilter.start) matchesDate = matchesDate && bookingDate >= new Date(dateFilter.start);
                if (dateFilter.end) matchesDate = matchesDate && bookingDate <= new Date(dateFilter.end);
            }

            return matchesSearch && matchesStatus && matchesDate;
        });

        filtered.sort((a, b) => {
            let aValue: any, bValue: any;
            switch (sortConfig.key) {
                case 'customerName': aValue = a.customerName; bValue = b.customerName; break;
                case 'mechanicName': aValue = a.mechanic?.name || ''; bValue = b.mechanic?.name || ''; break;
                case 'date': aValue = new Date(a.date + ' ' + a.time); bValue = new Date(b.date + ' ' + b.time); break;
                case 'price': aValue = a.service.price; bValue = b.service.price; break;
            }
            if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });

        return filtered;
    }, [bookings, searchQuery, selectedStatus, dateFilter, sortConfig]);

    const handleStatusChange = async (booking: Booking, newStatus: BookingStatus) => {
        if (newStatus === 'Cancelled') {
            setCancellingBooking(booking);
        } else {
            try {
                await updateBookingStatus(booking.id, newStatus);
                addNotification({ type: 'success', title: 'Status Updated', message: `Booking #${booking.id.slice(-6)} is now ${newStatus}.`, recipientId: 'all' });
            } catch (e) {
                addNotification({ type: 'error', title: 'Update Failed', message: (e as Error).message, recipientId: 'all' });
            }
        }
    };

    const handleCancelBooking = async (reason: string) => {
        if (!cancellingBooking) return;
        try {
            await cancelBooking(cancellingBooking.id, reason);
            addNotification({ type: 'success', title: 'Booking Cancelled', message: `Booking #${cancellingBooking.id.slice(-6)} has been cancelled.`, recipientId: 'all' });
            setCancellingBooking(null);
        } catch (e) {
            addNotification({ type: 'error', title: 'Cancellation Failed', message: (e as Error).message, recipientId: 'all' });
        }
    };

    const requestSort = (key: SortableKeys) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'ascending' ? 'descending' : 'ascending'
        }));
    };

    const statusColors: { [key in BookingStatus]: string } = {
        'Upcoming': 'bg-blue-500/20 text-blue-300',
        'Booking Confirmed': 'bg-green-500/20 text-green-300',
        'Mechanic Assigned': 'bg-purple-500/20 text-purple-300',
        'En Route': 'bg-yellow-500/20 text-yellow-300',
        'In Progress': 'bg-orange-500/20 text-orange-300',
        'Completed': 'bg-emerald-500/20 text-emerald-300',
        'Cancelled': 'bg-red-500/20 text-red-300',
        'Reschedule Requested': 'bg-pink-500/20 text-pink-300'
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Manage Bookings</h1>
                    <p className="mt-2 text-gray-400">Comprehensive booking management with real-time insights.</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-admin-accent hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg transform hover:scale-105 transition-all flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Booking
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <StatCard title="Total Bookings" value={kpis.total} change={kpis.totalChange} icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>} />
                <StatCard title="Revenue (Month)" value={(kpis.revenue / 1000).toFixed(1)} prefix="₱" change={kpis.revenueChange} icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
                <StatCard title="Avg Booking Value" value={kpis.avgValue.toFixed(0)} prefix="₱" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>} />
                <StatCard title="Completion Rate" value={`${kpis.completionRate.toFixed(1)}%`} icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
                <StatCard title="Upcoming" value={kpis.upcoming} icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
                <StatCard title="Cancelled" value={kpis.cancelled} icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
            </div>

            <div className="bg-white/5 p-6 rounded-xl shadow-lg border border-white/10">
                <div className="flex flex-col lg:flex-row gap-4 mb-6">
                    <input
                        type="text"
                        placeholder="Search by customer, service, or mechanic..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1 p-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-admin-accent transition-all"
                    />
                    <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value as BookingStatus | 'all')}
                        className="p-3 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-admin-accent transition-all"
                    >
                        {bookingStatuses.map(status => <option key={status} value={status}>{status === 'all' ? 'All Statuses' : status}</option>)}
                    </select>
                    <input
                        type="date"
                        value={dateFilter.start}
                        onChange={(e) => setDateFilter({ ...dateFilter, start: e.target.value })}
                        className="p-3 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-admin-accent transition-all"
                    />
                    <input
                        type="date"
                        value={dateFilter.end}
                        onChange={(e) => setDateFilter({ ...dateFilter, end: e.target.value })}
                        className="p-3 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-admin-accent transition-all"
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[900px]">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th onClick={() => requestSort('customerName')} className="p-3 cursor-pointer text-xs uppercase font-bold text-gray-400 hover:text-white transition-colors">Customer</th>
                                <th className="p-3 text-xs uppercase font-bold text-gray-400">Service</th>
                                <th onClick={() => requestSort('mechanicName')} className="p-3 cursor-pointer text-xs uppercase font-bold text-gray-400 hover:text-white transition-colors">Mechanic</th>
                                <th onClick={() => requestSort('date')} className="p-3 cursor-pointer text-xs uppercase font-bold text-gray-400 hover:text-white transition-colors">Date & Time</th>
                                <th onClick={() => requestSort('price')} className="p-3 cursor-pointer text-xs uppercase font-bold text-gray-400 hover:text-white transition-colors text-right">Price</th>
                                <th className="p-3 text-xs uppercase font-bold text-gray-400">Status</th>
                                <th className="p-3 text-xs uppercase font-bold text-gray-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredAndSortedBookings.map(booking => (
                                <tr key={booking.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="p-4">
                                        <p className="font-semibold text-sm text-gray-200 group-hover:text-white">{booking.customerName}</p>
                                        <p className="text-xs text-gray-500">{booking.vehicle.plateNumber}</p>
                                    </td>
                                    <td className="p-4">
                                        <p className="text-sm text-gray-300">{booking.service.name}</p>
                                    </td>
                                    <td className="p-4">
                                        <p className="text-sm text-gray-300">{booking.mechanic?.name || 'Unassigned'}</p>
                                    </td>
                                    <td className="p-4">
                                        <p className="text-sm font-mono text-gray-300">{booking.date}</p>
                                        <p className="text-xs text-gray-500">{booking.time}</p>
                                    </td>
                                    <td className="p-4 text-right font-mono text-sm font-bold text-admin-accent">₱{booking.service.price.toLocaleString()}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[booking.status]}`}>
                                            {booking.status}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => setViewingBooking(booking)} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white" title="View Details">
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                            </button>
                                            <button onClick={() => setEditingBooking(booking)} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white" title="Edit">
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                            </button>
                                            {booking.status !== 'Cancelled' && booking.status !== 'Completed' && (
                                                <button onClick={() => setCancellingBooking(booking)} className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-red-400 hover:text-red-300" title="Cancel">
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredAndSortedBookings.length === 0 && (
                                <tr><td colSpan={7} className="text-center py-12 text-sm text-gray-500 italic">No bookings found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showAddModal && <AddBookingModal onClose={() => setShowAddModal(false)} />}
            {editingBooking && <EditBookingModal booking={editingBooking} onClose={() => setEditingBooking(null)} />}
            {viewingBooking && <BookingDetailsModal booking={viewingBooking} customer={viewingCustomer} onClose={() => setViewingBooking(null)} />}
            {cancellingBooking && <CancellationModal booking={cancellingBooking} onClose={() => setCancellingBooking(null)} onConfirm={handleCancelBooking} />}
        </div>
    );
};

export default AdminBookingsScreen;