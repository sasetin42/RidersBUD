import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Customer, Vehicle } from '../../types';
import Modal from '../../components/admin/Modal';
import { useDatabase } from '../../context/DatabaseContext';
import Spinner from '../../components/Spinner';
import { useNotification } from '../../context/NotificationContext';
import EnhancedKPICard from '../../components/admin/EnhancedKPICard';
import { Download, Edit, Trash2, Users, UserCheck, UserPlus, DollarSign, Car, ShoppingBag, Eye, Search, AlertCircle, TrendingUp, ChevronDown, ArrowUpDown, Calendar, Upload, Camera, User, Plus, X, Check, Filter, Grid, List, MoreVertical } from 'lucide-react';

type SortableKeys = 'name' | 'email' | 'vehicles' | 'bookings' | 'spent';
import { storageService } from '../../services/StorageService';

const CustomerFormModal: React.FC<{
    customer?: Customer;
    onClose: () => void;
    onSave: (customer: Customer | Omit<Customer, 'id'>) => Promise<void>;
    onDelete?: (id: string) => Promise<void>;
}> = ({ customer, onClose, onSave, onDelete }) => {
    const { db } = useDatabase();
    const [activeTab, setActiveTab] = useState<'profile' | 'vehicles' | 'history' | 'admin'>('profile');
    const [formData, setFormData] = useState({
        name: customer?.name || '',
        email: customer?.email || '',
        phone: customer?.phone || '',
        password: '',
        picture: customer?.picture || '/placeholder.svg',
        status: customer?.status || 'Active' as const,
        registrationDate: customer?.registrationDate || new Date().toISOString().split('T')[0],
        notes: customer?.notes || '',
        address: customer?.address || '',
    });
    const [vehicles, setVehicles] = useState<Vehicle[]>(customer?.vehicles || []);
    const [isSaving, setIsSaving] = useState(false);
    const [profileImagePreview, setProfileImagePreview] = useState(formData.picture);
    const [isAddingVehicle, setIsAddingVehicle] = useState(false);
    const [editingVehicleIndex, setEditingVehicleIndex] = useState<number | null>(null);
    const [showCustomerPassword, setShowCustomerPassword] = useState(false);
    const [vehicleForm, setVehicleForm] = useState<Partial<Vehicle>>({
        make: '', model: '', year: new Date().getFullYear(), plateNumber: '',
        category: 'Sedans', subCategory: 'Toyota Vios', vin: '', color: '', mileage: 0,
        insuranceProvider: '', insurancePolicyNumber: '', imageUrls: []
    });

    const customerBookings = useMemo(() => {
        if (!db || !customer) return [];
        return db.bookings.filter(b => b.customerName === customer.name);
    }, [db, customer]);

    const customerOrders = useMemo(() => {
        if (!db || !customer) return [];
        return db.orders.filter(o => o.customerName === customer.name);
    }, [db, customer]);

    const handleProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const url = await storageService.uploadFile(`customers/profiles/${Date.now()}_${file.name}`, file);
                setFormData(p => ({ ...p, picture: url }));
                setProfileImagePreview(url);
            } catch (error) {
                console.error("Profile image upload failed:", error);
            }
        }
    };

    const handleVehicleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const url = await storageService.uploadFile(`customers/vehicles/${Date.now()}_${file.name}`, file);
                setVehicleForm(p => ({ ...p, imageUrls: [...(p.imageUrls || []), url] }));
            } catch (error) {
                console.error("Vehicle image upload failed:", error);
            }
        }
    };

    const saveVehicle = () => {
        if (!vehicleForm.make || !vehicleForm.model || !vehicleForm.plateNumber) return;
        const newVehicle: Vehicle = {
            make: vehicleForm.make.trim(),
            model: vehicleForm.model.trim(),
            year: vehicleForm.year || new Date().getFullYear(),
            plateNumber: vehicleForm.plateNumber.toUpperCase().trim(),
            category: vehicleForm.category || 'Sedans',
            subCategory: vehicleForm.subCategory || 'Toyota Vios',
            vin: vehicleForm.vin?.trim() || '',
            color: vehicleForm.color?.trim() || '',
            mileage: vehicleForm.mileage || 0,
            insuranceProvider: vehicleForm.insuranceProvider?.trim() || '',
            insurancePolicyNumber: vehicleForm.insurancePolicyNumber?.trim() || '',
            imageUrls: vehicleForm.imageUrls && vehicleForm.imageUrls.length > 0 ? vehicleForm.imageUrls : ['/placeholder.svg']
        };
        if (editingVehicleIndex !== null) {
            const updated = [...vehicles]; updated[editingVehicleIndex] = newVehicle; setVehicles(updated);
        } else {
            setVehicles([...vehicles, newVehicle]);
        }
        resetVehicleForm();
    };

    const editVehicle = (index: number) => {
        setVehicleForm(vehicles[index]);
        setEditingVehicleIndex(index);
        setIsAddingVehicle(true);
    };

    const resetVehicleForm = () => {
        setVehicleForm({
            make: '', model: '', year: new Date().getFullYear(), plateNumber: '',
            category: 'Sedans', subCategory: 'Toyota Vios', vin: '', color: '', mileage: 0,
            insuranceProvider: '', insurancePolicyNumber: '', imageUrls: []
        });
        setIsAddingVehicle(false); setEditingVehicleIndex(null);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const finalData = {
                ...formData,
                vehicles,
                password: formData.password || (customer ? customer.password : 'password')
            };
            if (customer) {
                await onSave({ ...customer, ...finalData } as Customer);
            } else {
                await onSave(finalData as Omit<Customer, 'id'>);
            }
        } finally {
            setIsSaving(false);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
            <div className="bg-[#121212] border border-white/10 rounded-[2rem] w-full max-w-2xl shadow-2xl transform transition-all scale-100 overflow-hidden flex flex-col max-h-[90vh]">

                {/* ── Compact Header (matches Mechanic layout) ── */}
                <div className="px-6 py-4 bg-gradient-to-r from-primary/25 via-orange-500/5 to-transparent border-b border-white/5 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <div>
                            <h2 className="text-xl font-black text-white tracking-tighter leading-none">
                                {customer?.id ? 'Edit Customer' : 'New Customer'}
                            </h2>
                            <div className="flex gap-1.5 mt-2">
                                <button
                                    onClick={() => setActiveTab('profile')}
                                    className={`px-3 py-1 rounded-lg text-[9px] font-black tracking-widest transition-all uppercase ${activeTab === 'profile' ? 'bg-primary text-white shadow-lg' : 'bg-white/5 text-gray-500 hover:text-white'}`}
                                >
                                    Personal Profile
                                </button>
                                <button
                                    onClick={() => setActiveTab('vehicles')}
                                    className={`px-3 py-1 rounded-lg text-[9px] font-black tracking-widest transition-all uppercase ${activeTab === 'vehicles' ? 'bg-primary text-white shadow-lg' : 'bg-white/5 text-gray-500 hover:text-white'}`}
                                >
                                    Garage ({vehicles.length})
                                </button>
                                {customer?.id && (
                                    <button
                                        onClick={() => setActiveTab('admin')}
                                        className={`px-3 py-1 rounded-lg text-[9px] font-black tracking-widest transition-all uppercase ${activeTab === 'admin' ? 'bg-primary text-white shadow-lg' : 'bg-white/5 text-gray-500 hover:text-white'}`}
                                    >
                                        Logs
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 text-white rounded-full transition-colors z-10">
                        <X size={16} />
                    </button>
                </div>

                {/* ── Form Content ── */}
                <div className="px-6 py-4 overflow-y-auto custom-scrollbar flex-1">
                    {activeTab === 'profile' && (
                        <div className="space-y-4 animate-fadeIn">
                            {/* Inline avatar + name row (matches Mechanic card style) */}
                            <div className="flex flex-col sm:flex-row gap-4 items-center bg-white/5 p-4 rounded-2xl border border-white/5 mb-1">
                                <div className="relative group flex-shrink-0">
                                    <div className="w-16 h-16 rounded-2xl bg-[#1A1A1A] border border-white/10 flex items-center justify-center overflow-hidden shadow-md">
                                        <img src={profileImagePreview} alt="Profile" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }} />
                                    </div>
                                    <label className="absolute -bottom-1 -right-1 p-1.5 bg-primary hover:bg-orange-600 text-white rounded-lg shadow cursor-pointer transition-all transform hover:scale-105 active:scale-95">
                                        <Camera size={10} />
                                        <input id="customer-profile-image" name="customer-profile-image" type="file" accept="image/*" className="hidden" onChange={handleProfileImageUpload} />
                                    </label>
                                </div>
                                <div className="flex-grow w-full">
                                    <div className="space-y-1">
                                        <label className="text-[9px] tracking-widest font-black text-gray-500 ml-1 uppercase">Full Name</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                                            className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2 text-xs text-white outline-none transition-all placeholder-gray-700 font-bold focus:border-white/10"
                                            placeholder="e.g. Juan Dela Cruz"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[9px] tracking-widest font-black text-gray-500 ml-1 uppercase">Email Address</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                                        className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white outline-none transition-all placeholder-gray-700 font-bold focus:border-white/10"
                                        placeholder="juan@ridersbud.com"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] tracking-widest font-black text-gray-500 ml-1 uppercase">Mobile Number</label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                                        className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white outline-none transition-all placeholder-gray-700 font-bold focus:border-white/10"
                                        placeholder="+63 9xx xxx xxxx"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] tracking-widest font-black text-gray-500 ml-1 uppercase">Home Address</label>
                                    <input
                                        type="text"
                                        value={formData.address}
                                        onChange={e => setFormData(p => ({ ...p, address: e.target.value }))}
                                        className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white outline-none transition-all placeholder-gray-700 font-bold focus:border-white/10"
                                        placeholder="Street, City, Province"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] tracking-widest font-black text-gray-500 ml-1 uppercase">Security Key</label>
                                    <div className="relative">
                                        <input
                                            type={showCustomerPassword ? 'text' : 'password'}
                                            value={formData.password}
                                            onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                                            className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 pr-10 text-xs text-white outline-none transition-all font-bold focus:border-white/10"
                                            placeholder={customer ? '••••••••' : 'Leave blank for default'}
                                        />
                                        <button type="button" onClick={() => setShowCustomerPassword(!showCustomerPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-primary transition-colors">
                                            {showCustomerPassword ? <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[9px] tracking-widest font-black text-gray-500 ml-1 uppercase">Internal Notes</label>
                                <textarea
                                    value={formData.notes}
                                    onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                                    rows={3}
                                    className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white outline-none transition-all placeholder-gray-700 font-medium resize-none focus:border-white/10"
                                    placeholder="Add confidential notes about this customer..."
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === 'vehicles' && (
                        <div className="space-y-4 animate-fadeIn">
                            {isAddingVehicle ? (
                                <div className="bg-white/5 border border-white/5 rounded-2xl p-6 space-y-4 animate-fadeIn">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-black text-white tracking-tight">
                                            {editingVehicleIndex !== null ? 'Configure Vehicle' : 'Add To Garage'}
                                        </h3>
                                        <button onClick={resetVehicleForm} className="p-1.5 hover:bg-white/5 rounded-full transition-colors">
                                            <X size={16} className="text-gray-500" />
                                        </button>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[9px] tracking-widest font-black text-gray-500 ml-1 uppercase">Vehicle Gallery</label>
                                        <div className="grid grid-cols-5 gap-2">
                                            {(vehicleForm.imageUrls || []).map((img, idx) => (
                                                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-white/10 bg-black/40 group">
                                                    <img src={img} alt="" className="w-full h-full object-cover" />
                                                    <button 
                                                        type="button" 
                                                        onClick={() => setVehicleForm(p => ({ ...p, imageUrls: (p.imageUrls || []).filter((_, i) => i !== idx) }))}
                                                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-red-500 transition-opacity"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            ))}
                                            {(vehicleForm.imageUrls || []).length < 5 && (
                                                <label className="aspect-square rounded-xl border border-dashed border-white/10 hover:border-primary/50 flex flex-col items-center justify-center cursor-pointer bg-white/[0.02] hover:bg-white/5 transition-all">
                                                    <Camera size={16} className="text-gray-500" />
                                                    <input id="vehicle-image-upload" name="vehicle-image-upload" type="file" className="hidden" accept="image/*" onChange={handleVehicleImageUpload} />
                                                </label>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-[9px] tracking-widest font-black text-gray-500 ml-1 uppercase">Category</label>
                                            <select id="vehicle-category" name="vehicle-category" value={vehicleForm.category || 'Sedans'} onChange={e => setVehicleForm(p => ({ ...p, category: e.target.value }))} className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white font-bold outline-none focus:border-white/10 select-custom">
                                                <option value="Sedans">Sedans</option>
                                                <option value="SUVs">SUVs</option>
                                                <option value="Vans / MPVs">Vans / MPVs</option>
                                                <option value="Luxury Vehicles">Luxury Vehicles</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] tracking-widest font-black text-gray-500 ml-1 uppercase">Sub-Category</label>
                                            <input id="vehicle-subcategory" name="vehicle-subcategory" type="text" value={vehicleForm.subCategory || ''} onChange={e => setVehicleForm(p => ({ ...p, subCategory: e.target.value }))} className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white font-bold outline-none focus:border-white/10" placeholder="e.g. Toyota Vios" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] tracking-widest font-black text-gray-500 ml-1 uppercase">Make</label>
                                            <input id="vehicle-make" name="vehicle-make" type="text" value={vehicleForm.make} onChange={e => setVehicleForm(p => ({ ...p, make: e.target.value }))} className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white font-bold outline-none focus:border-white/10" placeholder="Toyota" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] tracking-widest font-black text-gray-500 ml-1 uppercase">Model</label>
                                            <input id="vehicle-model" name="vehicle-model" type="text" value={vehicleForm.model} onChange={e => setVehicleForm(p => ({ ...p, model: e.target.value }))} className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white font-bold outline-none focus:border-white/10" placeholder="Vios" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] tracking-widest font-black text-gray-500 ml-1 uppercase">Year</label>
                                            <input id="vehicle-year" name="vehicle-year" type="number" value={vehicleForm.year} onChange={e => setVehicleForm(p => ({ ...p, year: parseInt(e.target.value) }))} className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white font-bold outline-none focus:border-white/10" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] tracking-widest font-black text-gray-500 ml-1 uppercase">Plate #</label>
                                            <input id="vehicle-plate" name="vehicle-plate" type="text" value={vehicleForm.plateNumber} onChange={e => setVehicleForm(p => ({ ...p, plateNumber: e.target.value.toUpperCase() }))} className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white font-bold outline-none focus:border-white/10" placeholder="ABC 1234" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] tracking-widest font-black text-gray-500 ml-1 uppercase">Color</label>
                                            <input id="vehicle-color" name="vehicle-color" type="text" value={vehicleForm.color || ''} onChange={e => setVehicleForm(p => ({ ...p, color: e.target.value }))} className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white font-bold outline-none focus:border-white/10" placeholder="Silver" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] tracking-widest font-black text-gray-500 ml-1 uppercase">Odometer (km)</label>
                                            <input id="vehicle-mileage" name="vehicle-mileage" type="number" value={vehicleForm.mileage || ''} onChange={e => setVehicleForm(p => ({ ...p, mileage: parseInt(e.target.value) || 0 }))} className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white font-bold outline-none focus:border-white/10" placeholder="0" />
                                        </div>
                                        <div className="col-span-2 grid grid-cols-2 gap-3 bg-white/[0.02] p-3 rounded-2xl border border-white/5 mt-2">
                                            <div className="col-span-2"><h4 className="text-[9px] font-black text-primary tracking-widest uppercase ml-1">Security & Insurance</h4></div>
                                            <div className="col-span-2 space-y-1">
                                                <label className="text-[9px] tracking-widest font-black text-gray-500 ml-1 uppercase">VIN / Chassis Number</label>
                                                <input id="vehicle-vin" name="vehicle-vin" type="text" value={vehicleForm.vin || ''} onChange={e => setVehicleForm(p => ({ ...p, vin: e.target.value.toUpperCase() }))} className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white font-mono outline-none focus:border-white/10 focus:border-white/15" placeholder="17-Digit VIN" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] tracking-widest font-black text-gray-500 ml-1 uppercase">Provider</label>
                                                <input id="vehicle-insurance" name="vehicle-insurance" type="text" value={vehicleForm.insuranceProvider || ''} onChange={e => setVehicleForm(p => ({ ...p, insuranceProvider: e.target.value }))} className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white font-bold outline-none focus:border-white/10" placeholder="Insurance Co." />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] tracking-widest font-black text-gray-500 ml-1 uppercase">Policy Number</label>
                                                <input id="vehicle-policy" name="vehicle-policy" type="text" value={vehicleForm.insurancePolicyNumber || ''} onChange={e => setVehicleForm(p => ({ ...p, insurancePolicyNumber: e.target.value }))} className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white font-bold outline-none focus:border-white/10" placeholder="PN-XXXXXX" />
                                            </div>
                                        </div>
                                    </div>

                                    <button onClick={saveVehicle} className="w-full py-2.5 bg-primary hover:bg-orange-600 text-white rounded-xl font-black tracking-widest text-[9px] uppercase shadow-xl shadow-primary/20 transition-all active:scale-[0.98]">
                                        Confirm Vehicle
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {vehicles.map((v, i) => (
                                        <div key={i} className="group relative bg-[#1A1A1A] border border-white/5 rounded-2xl p-3 transition-all hover:bg-white/5 flex items-center gap-4">
                                            <div className="w-20 h-14 rounded-xl overflow-hidden border border-white/10 shrink-0">
                                                <img src={v.imageUrls?.[0]} alt={v.make || 'Vehicle'} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-black text-white text-xs tracking-tight">{v.year} {v.make} {v.model}</h4>
                                                <p className="text-[9px] font-mono text-primary tracking-widest mt-1">{v.plateNumber}</p>
                                            </div>
                                            <div className="flex gap-1.5">
                                                <button onClick={() => editVehicle(i)} className="p-2 bg-white/5 hover:bg-blue-500/20 text-gray-400 hover:text-blue-400 rounded-xl transition-all"><Edit size={14} /></button>
                                                <button onClick={() => setVehicles(vehicles.filter((_, idx) => idx !== i))} className="p-2 bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-xl transition-all"><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                    ))}
                                    <button onClick={() => setIsAddingVehicle(true)} className="w-full py-4 bg-white/5 border-2 border-dashed border-white/10 rounded-2xl text-gray-500 hover:text-white hover:bg-white/10 transition-all font-black tracking-widest text-[9px] uppercase flex items-center justify-center gap-2">
                                        <Plus size={14} /> Add New Vehicle
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="space-y-6 animate-fadeIn">
                            <div className="space-y-3">
                                <h3 className="text-[9px] font-black text-gray-500 tracking-[0.2em] ml-2 uppercase">Recent Bookings</h3>
                                {customerBookings.length > 0 ? customerBookings.slice(0, 5).map(b => (
                                    <div key={b.id} className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-primary/10 rounded-xl"><Car size={14} className="text-primary" /></div>
                                            <div>
                                                <p className="font-bold text-white text-xs">{b.service.name}</p>
                                                <p className="text-[9px] text-gray-500 tracking-widest mt-0.5">{b.date} • {b.time}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-white text-xs">₱{b.service.price.toLocaleString()}</p>
                                            <p className={`text-[9px] font-black ml-1 ${b.status === 'Completed' ? 'text-green-500' : 'text-primary'}`}>{b.status}</p>
                                        </div>
                                    </div>
                                )) : <div className="p-8 text-center bg-white/5 rounded-2xl border border-dashed border-white/10 text-gray-500 text-xs">No bookings recorded yet</div>}
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-[9px] font-black text-gray-500 tracking-[0.2em] ml-2 uppercase">Parts Orders</h3>
                                {customerOrders.length > 0 ? customerOrders.slice(0, 5).map(o => (
                                    <div key={o.id} className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-500/10 rounded-xl"><ShoppingBag size={14} className="text-blue-500" /></div>
                                            <div>
                                                <p className="font-bold text-white text-xs">Order #{o.id.slice(-6).toUpperCase()}</p>
                                                <p className="text-[9px] text-gray-500 tracking-widest mt-0.5">{o.date} • {o.items.length} Items</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-white text-xs">₱{o.total.toLocaleString()}</p>
                                            <p className="text-[9px] font-black text-blue-500 ml-1">{o.status}</p>
                                        </div>
                                    </div>
                                )) : <div className="p-8 text-center bg-white/5 rounded-2xl border border-dashed border-white/10 text-gray-500 text-xs">No orders recorded yet</div>}
                            </div>
                        </div>
                    )}

                    {activeTab === 'admin' && (
                        <div className="space-y-4 animate-fadeIn">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[9px] tracking-widest font-black text-gray-500 ml-1 uppercase">Account Status</label>
                                    <select
                                        value={formData.status}
                                        onChange={e => setFormData(p => ({ ...p, status: e.target.value as any }))}
                                        className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white font-bold outline-none focus:border-white/10"
                                    >
                                        <option value="Active">Operational (Active)</option>
                                        <option value="Inactive">On Hold (Inactive)</option>
                                        <option value="Banned">Revoked (Banned)</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] tracking-widest font-black text-gray-500 ml-1 uppercase">Registration Date</label>
                                    <input
                                        type="date"
                                        value={formData.registrationDate}
                                        onChange={e => setFormData(p => ({ ...p, registrationDate: e.target.value }))}
                                        className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white font-bold outline-none focus:border-white/10"
                                    />
                                </div>
                            </div>
                            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl space-y-2">
                                <h4 className="text-blue-500 font-black tracking-widest text-[9px] uppercase">Access Management</h4>
                                <p className="text-xs text-gray-400">Manage account status and internal logging for this customer.</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Footer (matches Mechanic footer) ── */}
                <div className="px-6 py-4 bg-[#1A1A1A]/80 border-t border-white/5 flex items-center justify-between flex-shrink-0">
                    {customer?.id && (
                        <button
                            onClick={() => onDelete?.(customer.id)}
                            className="px-5 py-2.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl font-black transition-all border border-red-500/20 text-[9px] tracking-widest uppercase"
                        >
                            Terminate
                        </button>
                    )}
                    <div className="flex gap-2 ml-auto">
                        <button onClick={onClose} className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all border border-white/5 text-[9px] tracking-widest uppercase">Discard</button>
                        <button onClick={handleSave} disabled={isSaving} className="px-6 py-2.5 bg-primary hover:bg-orange-600 text-white rounded-xl font-black transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-1.5 disabled:opacity-50 text-[9px] tracking-widest uppercase">
                            {isSaving ? <Spinner size="sm" color="text-white" /> : <Check size={14} />}
                            {customer?.id ? 'Update Profile' : 'Initialize Customer'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const AdminCustomersScreen: React.FC = () => {
    const { db, addCustomer, updateCustomer, deleteCustomer, loading } = useDatabase();
    const { addNotification } = useNotification();
    const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' }>({ key: 'name', direction: 'ascending' });
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [vehicleFilter, setVehicleFilter] = useState<string>('all');
    const [activityFilter, setActivityFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    const customerBookingsCount = useMemo(() => {
        if (!db) return {};
        return db.bookings.reduce((acc, booking) => {
            const customer = db.customers.find(c => c.name === booking.customerName);
            if (customer) acc[customer.id] = (acc[customer.id] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
    }, [db]);

    const customerTotalSpent = useMemo(() => {
        if (!db) return {};
        return db.bookings.reduce((acc, booking) => {
            const customer = db.customers.find(c => c.name === booking.customerName);
            if (customer && booking.status === 'Completed') {
                acc[customer.id] = (acc[customer.id] || 0) + (booking.service?.price || 0);
            }
            return acc;
        }, {} as Record<string, number>);
    }, [db]);

    const stats = useMemo(() => {
        if (!db) return { total: 0, active: 0, lifetimeValue: 0, newThisMonth: 0 };
        const total = db.customers.length;
        const active = db.customers.filter(c => (customerBookingsCount[c.id] || 0) > 0).length;
        const lifetimeValue = Object.values(customerTotalSpent).reduce((sum: number, val: number) => sum + (val || 0), 0);
        const thisMonth = new Date().getMonth();
        const newThisMonth = db.customers.filter(c => {
            const regDate = new Date(c.registrationDate || 0);
            return regDate.getMonth() === thisMonth && regDate.getFullYear() === new Date().getFullYear();
        }).length;
        return { total, active, lifetimeValue, newThisMonth };
    }, [db, customerBookingsCount, customerTotalSpent]);

    const filteredCustomers = useMemo(() => {
        if (!db?.customers) return [];
        let filtered = db.customers.filter(customer => {
            const searchMatch = !searchQuery ||
                (customer.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (customer.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (customer.phone || '').toLowerCase().includes(searchQuery.toLowerCase());
            const vehicleMatch = vehicleFilter === 'all' ||
                (vehicleFilter === '0' && (customer.vehicles || []).length === 0) ||
                (vehicleFilter === '1' && (customer.vehicles || []).length === 1) ||
                (vehicleFilter === '2+' && (customer.vehicles || []).length >= 2);
            const bookingCount = customerBookingsCount[customer.id] || 0;
            const activityMatch = activityFilter === 'all' ||
                (activityFilter === 'active' && bookingCount > 0) ||
                (activityFilter === 'inactive' && bookingCount === 0);
            const statusMatch = statusFilter === 'all' || customer.status === statusFilter;
            return searchMatch && vehicleMatch && activityMatch && statusMatch;
        });

        filtered.sort((a, b) => {
            let aVal, bVal;
            switch (sortConfig.key) {
                case 'name': aVal = (a.name || '').toLowerCase(); bVal = (b.name || '').toLowerCase(); break;
                case 'email': aVal = (a.email || '').toLowerCase(); bVal = (b.email || '').toLowerCase(); break;
                case 'vehicles': aVal = (a.vehicles || []).length; bVal = (b.vehicles || []).length; break;
                case 'bookings': aVal = customerBookingsCount[a.id] || 0; bVal = customerBookingsCount[b.id] || 0; break;
                case 'spent': aVal = customerTotalSpent[a.id] || 0; bVal = customerTotalSpent[b.id] || 0; break;
                default: aVal = a.name || ''; bVal = b.name || '';
            }
            if (aVal < bVal) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });
        return filtered;
    }, [db, searchQuery, vehicleFilter, activityFilter, statusFilter, customerBookingsCount, customerTotalSpent, sortConfig]);

    const requestSort = (key: SortableKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
        setSortConfig({ key, direction });
    };

    const handleSaveCustomer = async (data: Customer | Omit<Customer, 'id'>) => {
        try {
            if ('id' in data) {
                await updateCustomer(data);
                addNotification({ type: 'success', title: 'Operational Update', message: `${data.name}'s profile has been synchronized.`, recipientId: 'admin' });
            } else {
                await addCustomer(data);
                addNotification({ type: 'success', title: 'New Onboarding', message: `${data.name} is now registered in the system.`, recipientId: 'admin' });
            }
            setViewingCustomer(null);
        } catch (e) {
            addNotification({ type: 'error', title: 'Sync Error', message: (e as Error).message, recipientId: 'admin' });
        }
    };

    const handleDeleteCustomer = async (id: string) => {
        if (!window.confirm("FATAL ACTION: Are you absolutely sure you want to terminate this customer's account?")) return;
        try {
            await deleteCustomer(id);
            addNotification({ type: 'success', title: 'Account Terminated', message: 'The customer has been purged from the database.', recipientId: 'admin' });
            setViewingCustomer(null);
        } catch (e) {
            addNotification({ type: 'error', title: 'Purge Error', message: (e as Error).message, recipientId: 'admin' });
        }
    };

    const handleExportCSV = () => {
        if (!filteredCustomers.length) return;
        const headers = ['Name', 'Email', 'Phone', 'Status', 'Vehicles', 'Bookings', 'Total Spent'];
        const rows = filteredCustomers.map(c => [
            c.name,
            c.email,
            c.phone,
            c.status,
            (c.vehicles || []).length,
            customerBookingsCount[c.id] || 0,
            customerTotalSpent[c.id] || 0
        ]);
        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Customers_Intel_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        addNotification({ type: 'success', title: 'Export Intelligence', message: 'Customer database exported to CSV successfully.', recipientId: 'admin' });
    };

    if (loading || !db) return <div className="flex items-center justify-center h-full"><Spinner size="lg" color="text-white" /></div>;

    return (
        <div className="space-y-8 animate-fadeIn max-w-[1600px] mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-5xl font-black text-white tracking-tighter  leading-none">Manage Customers</h1>
                    <div className="flex items-center gap-2 mt-4">
                        <div className="h-1 w-12 bg-primary rounded-full"></div>
                        <p className="text-gray-500 font-bold  tracking-[0.3em] text-[10px]">Customer Accounts</p>
                    </div>
                </div>
                <div className="flex items-center gap-4 bg-white/5 p-2 rounded-[2rem] border border-white/5">
                    <div className="flex items-center bg-black/40 rounded-xl p-1 border border-white/5">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                            title="List View"
                        >
                            <List size={16} />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                            title="Grid View"
                        >
                            <Grid size={16} />
                        </button>
                    </div>
                    <button onClick={handleExportCSV} className="p-4 hover:bg-white/5 text-gray-400 transition-all rounded-2xl" title="Export CSV"><Download size={20} /></button>
                    <button onClick={() => setViewingCustomer({} as Customer)} className="px-8 py-4 bg-primary hover:bg-orange-600 text-white rounded-[1.5rem] font-black  tracking-widest text-xs shadow-2xl shadow-primary/20 transition-all active:scale-95 flex items-center gap-3">
                        <Plus size={20} strokeWidth={3} /> New Customer
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <EnhancedKPICard title="Total Customers" value={stats.total} icon={<Users />} gradient="bg-gradient-to-br from-blue-600 to-blue-900" trend={{ value: 12, isPositive: true }} subtitle="Registered Accounts" />
                <EnhancedKPICard title="Active Customers" value={stats.active} icon={<UserCheck />} gradient="bg-gradient-to-br from-green-600 to-green-900" trend={{ value: 8, isPositive: true }} subtitle="Currently Using the App" />
                <EnhancedKPICard title="Total Spending" value={`₱${stats.lifetimeValue.toLocaleString()}`} icon={<DollarSign />} gradient="bg-gradient-to-br from-orange-600 to-orange-900" trend={{ value: 18, isPositive: true }} subtitle="Money Spent by Customers" />
                <EnhancedKPICard title="New Customers" value={stats.newThisMonth} icon={<UserPlus />} gradient="bg-gradient-to-br from-purple-600 to-purple-900" trend={{ value: 5, isPositive: true }} subtitle="Joined This Month" />
            </div>

            <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary to-orange-600 rounded-[2rem] blur opacity-5 group-hover:opacity-10 transition duration-1000"></div>
                <div className="relative bg-[#121212]/80 backdrop-blur-xl border border-white/10 p-4 rounded-[2rem] flex flex-col lg:flex-row items-center gap-4">
                    <div className="flex-1 relative w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                        <input id="customer-search" name="customer-search" type="text" placeholder="Search by name, email, or phone..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-white/5 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white font-medium placeholder-gray-600 outline-none transition-all focus:border-primary/50 focus:bg-white/10" />
                    </div>
                    <div className="flex items-center gap-2">
                        <select id="customer-status-filter" name="customer-status-filter" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-white/5 border border-white/5 rounded-xl px-3 py-2 text-sm text-white font-medium outline-none focus:border-primary/50 cursor-pointer hover:bg-white/10">
                            <option value="all">All Status</option>
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                            <option value="Banned">Banned</option>
                        </select>
                        <select id="customer-vehicle-filter" name="customer-vehicle-filter" value={vehicleFilter} onChange={e => setVehicleFilter(e.target.value)} className="bg-white/5 border border-white/5 rounded-xl px-3 py-2 text-sm text-white font-medium outline-none focus:border-primary/50 cursor-pointer hover:bg-white/10 min-w-[120px]">
                            <option value="all">All Vehicles</option>
                            <option value="0">No Vehicles</option>
                            <option value="1">1 Vehicle</option>
                            <option value="2+">2+ Vehicles</option>
                        </select>
                        {(searchQuery || statusFilter !== 'all' || vehicleFilter !== 'all') && (
                            <button onClick={() => { setSearchQuery(''); setStatusFilter('all'); setVehicleFilter('all'); setActivityFilter('all'); }} className="px-3 py-2 bg-red-500/10 text-red-400 rounded-xl text-xs font-bold hover:bg-red-500 hover:text-white transition-all flex items-center gap-1">
                                <X size={12} /> Clear
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* List View vs Grid View Layout */}
            {viewMode === 'list' ? (
                <div className="bg-[#121212] border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl animate-fadeIn">
                    <div className="overflow-x-auto custom-scrollbar min-h-[280px] pb-32">
                        {filteredCustomers.length > 0 ? (
                            <table className="w-full border-collapse">
                                <thead className="bg-black/40 sticky top-0 z-10">
                                    <tr>
                                        <th className="p-4 text-left text-xs font-black text-gray-400 tracking-wider cursor-pointer select-none" onClick={() => requestSort('name')}>
                                            <div className="flex items-center gap-1">Customer <ArrowUpDown size={12} /></div>
                                        </th>
                                        <th className="p-4 text-left text-xs font-black text-gray-400 tracking-wider cursor-pointer select-none" onClick={() => requestSort('email')}>
                                            <div className="flex items-center gap-1">Contact Info <ArrowUpDown size={12} /></div>
                                        </th>
                                        <th className="p-4 text-left text-xs font-black text-gray-400 tracking-wider cursor-pointer select-none" onClick={() => requestSort('vehicles')}>
                                            <div className="flex items-center gap-1">Garage / Vehicles <ArrowUpDown size={12} /></div>
                                        </th>
                                        <th className="p-4 text-left text-xs font-black text-gray-400 tracking-wider">Status</th>
                                        <th className="p-4 text-center text-xs font-black text-gray-400 tracking-wider cursor-pointer select-none" onClick={() => requestSort('bookings')}>
                                            <div className="flex items-center justify-center gap-1">Bookings <ArrowUpDown size={12} /></div>
                                        </th>
                                        <th className="p-4 text-left text-xs font-black text-gray-400 tracking-wider cursor-pointer select-none" onClick={() => requestSort('spent')}>
                                            <div className="flex items-center gap-1">Total Spent <ArrowUpDown size={12} /></div>
                                        </th>
                                        <th className="p-4 text-right text-xs font-black text-gray-400 tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredCustomers.map((c, idx) => {
                                        const bookings = customerBookingsCount[c.id] || 0;
                                        const spent = customerTotalSpent[c.id] || 0;
                                        const statusColors: Record<string, string> = {
                                            Active: 'bg-green-500/20 text-green-300 border-green-500/30',
                                            Inactive: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
                                            Banned: 'bg-red-500/20 text-red-300 border-red-500/30'
                                        };
                                        return (
                                            <tr
                                                key={c.id}
                                                className={`border-b border-white/5 hover:bg-white/5 transition-colors ${idx % 2 === 0 ? 'bg-black/20' : 'bg-transparent'}`}
                                            >
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="relative flex-shrink-0">
                                                            <img src={c.picture || '/riders-logo.png'} alt={c.name} className="w-11 h-11 object-cover rounded-xl ring-1 ring-white/10" onError={(e) => { (e.target as HTMLImageElement).src = '/riders-logo.png'; }} />
                                                            <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#121212] ${c.isOnline ? 'bg-green-500' : c.status === 'Active' ? 'bg-gray-500' : c.status === 'Banned' ? 'bg-red-500' : 'bg-gray-400'}`} />
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-white text-sm">
                                                                {c.name}
                                                            </div>
                                                            <div className="text-[10px] text-gray-500 mt-0.5">
                                                                {c.registrationDate ? `Since ${new Date(c.registrationDate).getFullYear()}` : 'Customer'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-xs font-medium">
                                                    <div className="text-white flex items-center gap-1.5">
                                                        <span className="text-gray-400 truncate">{c.email}</span>
                                                    </div>
                                                    <div className="text-gray-400 flex items-center gap-1.5 mt-1">
                                                        <span className="text-gray-400">{c.phone}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex flex-wrap gap-1 max-w-[250px]">
                                                        {(c.vehicles || []).slice(0, 2).map((v, i) => (
                                                            <span key={i} className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded text-[9px] font-bold tracking-tight">
                                                                {v.make} {v.model}
                                                            </span>
                                                        ))}
                                                        {(c.vehicles || []).length > 2 && (
                                                            <span className="px-1.5 py-0.5 bg-white/5 text-gray-500 rounded text-[9px] font-medium">
                                                                +{(c.vehicles || []).length - 2} more
                                                            </span>
                                                        )}
                                                        {(c.vehicles || []).length === 0 && (
                                                            <span className="text-xs text-gray-600 italic">No vehicles</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusColors[c.status] || statusColors.Inactive}`}>
                                                        {c.status}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center text-xs font-bold text-white">
                                                    {bookings}
                                                </td>
                                                <td className="p-4 text-sm font-bold text-green-400">
                                                    ₱{spent.toLocaleString()}
                                                </td>
                                                <td className="p-4 text-right relative">
                                                    <div className="flex items-center justify-end">
                                                        <div className="relative inline-block text-left">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setActiveDropdownId(activeDropdownId === `customer-${c.id}` ? null : `customer-${c.id}`);
                                                                }}
                                                                className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all focus:outline-none"
                                                                title="Actions"
                                                            >
                                                                <MoreVertical size={16} />
                                                            </button>
                                                            {activeDropdownId === `customer-${c.id}` && (
                                                                <div
                                                                    className="absolute right-0 mt-2 w-44 rounded-xl bg-[#121212] border border-white/10 shadow-2xl z-50 py-2 animate-fadeIn"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <button
                                                                        onClick={() => {
                                                                            setViewingCustomer(c);
                                                                            setActiveDropdownId(null);
                                                                        }}
                                                                        className="w-full text-left px-4 py-2.5 text-sm text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 flex items-center gap-2 transition-colors"
                                                                    >
                                                                        <Edit size={14} />
                                                                        Edit / View
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            handleDeleteCustomer(c.id);
                                                                            setActiveDropdownId(null);
                                                                        }}
                                                                        className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center gap-2 transition-colors"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                        Purge Customer
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-16">
                                <Users size={32} className="text-gray-600 mb-3" />
                                <p className="text-sm font-medium text-gray-400">No customers found</p>
                                <p className="text-[10px] text-gray-600 mt-1">Try adjusting your filters</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                filteredCustomers.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-16 border-2 border-dashed border-white/10 rounded-2xl animate-fadeIn">
                        <Users size={32} className="text-gray-600 mb-3" />
                        <p className="text-sm font-medium text-gray-400">No customers found</p>
                        <p className="text-[10px] text-gray-600 mt-1">Try adjusting your filters</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-fadeIn">
                        {filteredCustomers.map((c) => {
                            const bookings = customerBookingsCount[c.id] || 0;
                            const spent = customerTotalSpent[c.id] || 0;
                            const statusColors: Record<string, string> = {
                                Active: 'bg-green-500/20 text-green-300 border-green-500/30',
                                Inactive: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
                                Banned: 'bg-red-500/20 text-red-300 border-red-500/30'
                            };
                            return (
                            <div key={c.id} className="group relative bg-[#1a1a1a] border border-white/10 rounded-2xl p-4 hover:border-primary/40 hover:bg-[#1e1e22] transition-all duration-200">
                                {/* Header */}
                                <div className="flex items-start gap-3 mb-3">
                                    <div className="relative flex-shrink-0">
                                        <img src={c.picture || '/riders-logo.png'} alt={c.name} className="w-12 h-12 rounded-xl object-cover ring-2 ring-white/5" onError={(e) => { (e.target as HTMLImageElement).src = '/riders-logo.png'; }} />
                                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#1a1a1a] ${c.isOnline ? 'bg-green-500' : c.status === 'Active' ? 'bg-gray-500' : c.status === 'Banned' ? 'bg-red-500' : 'bg-gray-400'}`}></div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-sm font-bold text-white truncate">{c.name}</h3>
                                        <p className="text-[10px] text-gray-500">{c.registrationDate ? `Since ${new Date(c.registrationDate).getFullYear()}` : 'Customer'}</p>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${statusColors[c.status] || statusColors.Inactive}`}>
                                        {c.status}
                                    </span>
                                </div>

                                {/* Contact */}
                                <div className="flex items-center gap-2 mb-2 text-[10px]">
                                    <span className="text-gray-400 truncate">{c.email}</span>
                                </div>
                                <div className="flex items-center gap-2 mb-3 text-[10px]">
                                    <span className="text-gray-400">{c.phone}</span>
                                </div>

                                {/* Stats */}
                                <div className="grid grid-cols-3 gap-2 mb-3">
                                    <div className="bg-white/5 rounded-lg p-2 text-center">
                                        <p className="text-[8px] text-gray-500 font-medium">Vehicles</p>
                                        <p className="text-xs font-bold text-blue-400 mt-0.5">{(c.vehicles || []).length}</p>
                                    </div>
                                    <div className="bg-white/5 rounded-lg p-2 text-center">
                                        <p className="text-[8px] text-gray-500 font-medium">Bookings</p>
                                        <p className="text-xs font-bold text-purple-400 mt-0.5">{bookings}</p>
                                    </div>
                                    <div className="bg-white/5 rounded-lg p-2 text-center">
                                        <p className="text-[8px] text-gray-500 font-medium">Spent</p>
                                        <p className="text-xs font-bold text-green-400 mt-0.5">₱{spent.toLocaleString()}</p>
                                    </div>
                                </div>

                                {/* Yield Tag */}
                                {spent > 5000 && (
                                    <div className="mb-3">
                                        <span className="px-2 py-0.5 bg-green-500/10 text-green-400 rounded text-[9px] font-bold">High Value Customer</span>
                                    </div>
                                )}

                                {/* Vehicles Preview */}
                                {(c.vehicles || []).length > 0 && (
                                    <div className="flex items-center gap-1 mb-3 overflow-hidden">
                                        <Car size={10} className="text-gray-500 flex-shrink-0" />
                                        <div className="flex gap-1 overflow-x-auto pb-1">
                                            {(c.vehicles || []).slice(0, 2).map((v, i) => (
                                                <span key={i} className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded text-[8px] whitespace-nowrap">
                                                    {v.make} {v.model}
                                                </span>
                                            ))}
                                            {(c.vehicles || []).length > 2 && (
                                                <span className="px-1.5 py-0.5 bg-white/5 text-gray-500 rounded text-[8px]">+{(c.vehicles || []).length - 2}</span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex items-center gap-1.5 pt-2 border-t border-white/5">
                                    <button onClick={() => setViewingCustomer(c)} className="flex-1 px-2 py-1.5 bg-white/5 hover:bg-primary text-gray-400 hover:text-white rounded-lg text-[10px] font-medium transition-all flex items-center justify-center gap-1">
                                        <Eye size={11} /> View
                                    </button>
                                    <button onClick={() => setViewingCustomer(c)} className="flex-1 px-2 py-1.5 bg-white/5 hover:bg-blue-600 text-gray-400 hover:text-white rounded-lg text-[10px] font-medium transition-all flex items-center justify-center gap-1">
                                        <Edit size={11} /> Edit
                                    </button>
                                </div>
                            </div>
                            );
                        })}
                    </div>
                )
            )}

            {viewingCustomer && <CustomerFormModal customer={viewingCustomer.id ? viewingCustomer : undefined} onClose={() => setViewingCustomer(null)} onSave={handleSaveCustomer} onDelete={handleDeleteCustomer} />}
        </div>
    );
};

export default AdminCustomersScreen;
