import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Car, Tag, Calendar, Hash, Settings, Gauge, 
    ShieldCheck, AlertTriangle, X, Camera, Trash2, 
    Edit2, Plus, Star, Wrench, FileText, ChevronUp, 
    ChevronDown, CheckCircle, Shield, Search, Filter, 
    Activity, DollarSign, Bell, PenSquare, BookOpen, Clock,
    Sparkles, ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge, Button } from '../components/ui';
import CustomerHeader from '../components/CustomerHeader';
import Spinner from '../components/Spinner';
import { useAuth } from '../context/AuthContext';
import { useDatabase } from '../context/DatabaseContext';
import { storageService } from '../services/StorageService';
import { Vehicle, Reminder } from '../types';
import { STORAGE_PATHS, getVehicleImage } from '../utils/imageConstants';
import { fileToBase64 } from '../utils/fileUtils';

// Interface for Custom Self-Maintenance Logs
interface SelfLog {
    id: string;
    date: string;
    mileage: number;
    action: string;
    cost: number;
    notes?: string;
}

// Category & Sub-Category Options Definition (4-Wheel Drive Private Hire)
export const VEHICLE_CATEGORIES = {
    'Sedans': [
        'Toyota Vios',
        'Toyota Corolla Altis',
        'Honda City',
        'Honda Civic'
    ],
    'SUVs': [
        'Toyota Fortuner',
        'Mitsubishi Montero Sport',
        'Ford Everest',
        'Toyota Land Cruiser'
    ],
    'Vans / MPVs': [
        'Toyota HiAce',
        'Hyundai Staria',
        'Toyota Innova',
        'Nissan Urvan'
    ],
    'Luxury Vehicles': [
        'Mercedes-Benz E-Class',
        'BMW 5 Series',
        'Lexus ES',
        'Toyota Alphard'
    ]
};

// Autoparse Make/Model from subCategory choice
export const parseMakeModel = (subCategory: string) => {
    if (subCategory.startsWith('Toyota ')) {
        return { make: 'Toyota', model: subCategory.substring(7) };
    }
    if (subCategory.startsWith('Honda ')) {
        return { make: 'Honda', model: subCategory.substring(6) };
    }
    if (subCategory.startsWith('Mitsubishi ')) {
        return { make: 'Mitsubishi', model: subCategory.substring(11) };
    }
    if (subCategory.startsWith('Ford ')) {
        return { make: 'Ford', model: subCategory.substring(5) };
    }
    if (subCategory.startsWith('Hyundai ')) {
        return { make: 'Hyundai', model: subCategory.substring(8) };
    }
    if (subCategory.startsWith('Nissan ')) {
        return { make: 'Nissan', model: subCategory.substring(7) };
    }
    if (subCategory.startsWith('Mercedes-Benz ')) {
        return { make: 'Mercedes-Benz', model: subCategory.substring(14) };
    }
    if (subCategory.startsWith('BMW ')) {
        return { make: 'BMW', model: subCategory.substring(4) };
    }
    if (subCategory.startsWith('Lexus ')) {
        return { make: 'Lexus', model: subCategory.substring(6) };
    }
    return { make: '', model: '' };
};

const LogFormModal: React.FC<{
    plateNumber: string;
    onClose: () => void;
    onSave: () => void;
}> = ({ plateNumber, onClose, onSave }) => {
    const [action, setAction] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [mileage, setMileage] = useState('');
    const [cost, setCost] = useState('');
    const [notes, setNotes] = useState('');
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const validate = () => {
        const newErrors: { [key: string]: string } = {};
        if (!action.trim()) newErrors.action = "Action details are required";
        if (!date) newErrors.date = "Date is required";
        if (mileage && isNaN(Number(mileage))) newErrors.mileage = "Must be a valid number";
        if (cost && isNaN(Number(cost))) newErrors.cost = "Must be a valid number";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            const newLog: SelfLog = {
                id: Math.random().toString(36).substring(2, 9),
                date,
                action: action.trim(),
                mileage: mileage ? Number(mileage) : 0,
                cost: cost ? Number(cost) : 0,
                notes: notes.trim() || undefined
            };

            const existingLogs = localStorage.getItem(`garage_logs_${plateNumber}`);
            const logs: SelfLog[] = existingLogs ? JSON.parse(existingLogs) : [];
            localStorage.setItem(`garage_logs_${plateNumber}`, JSON.stringify([newLog, ...logs]));
            onSave();
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
            <div className="bg-[#1C1C1E] w-full max-w-md rounded-3xl border border-white/10 p-6 shadow-2xl relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
                    <X size={20} />
                </button>
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                        <PenSquare size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-white">Add Maintenance Log</h3>
                        <p className="text-xs text-gray-500">Record self-maintenance details</p>
                    </div>
                </div>

                <form onSubmit={handleSave} className="space-y-4">
                    <div className="space-y-1.5">
                        <label htmlFor="maint-action" className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Maintenance Action</label>
                        <input
                            id="maint-action"
                            name="maint-action"
                            type="text"
                            value={action}
                            onChange={e => setAction(e.target.value)}
                            placeholder="e.g., Oil Change, Spark Plugs Replacement"
                            className={`w-full px-4 py-3 bg-white/[0.03] border rounded-xl text-sm font-bold text-white outline-none ${errors.action ? 'border-red-500' : 'border-white/10 focus:border-primary/40'}`}
                        />
                        {errors.action && <p className="text-red-400 text-[10px]">{errors.action}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label htmlFor="maint-date" className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</label>
                            <input
                                id="maint-date"
                                name="maint-date"
                                type="date"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-sm font-bold text-white outline-none focus:border-primary/40"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor="maint-odometer" className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Odometer (km)</label>
                            <input
                                id="maint-odometer"
                                name="maint-odometer"
                                type="text"
                                value={mileage}
                                onChange={e => setMileage(e.target.value)}
                                placeholder="e.g., 15000"
                                className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-sm font-bold text-white outline-none focus:border-primary/40"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label htmlFor="maint-cost" className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cost (₱)</label>
                        <input
                            id="maint-cost"
                            name="maint-cost"
                            type="text"
                            value={cost}
                            onChange={e => setCost(e.target.value)}
                            placeholder="e.g., 450"
                            className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-sm font-bold text-white outline-none focus:border-primary/40"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label htmlFor="maint-notes" className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Additional Notes</label>
                        <textarea
                            id="maint-notes"
                            name="maint-notes"
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="Part brands, tools used, next interval details..."
                            rows={3}
                            className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-sm font-bold text-white outline-none focus:border-primary/40"
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 py-3 bg-white hover:bg-gray-100 rounded-xl text-xs font-black text-black uppercase tracking-wider transition-colors shadow-md">
                            Cancel
                        </button>
                        <button type="submit" className="flex-1 py-3 bg-primary hover:brightness-110 rounded-xl text-xs font-black text-black uppercase tracking-wider transition-colors">
                            Save Log
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export const VehicleFormModal: React.FC<{
    vehicle?: Vehicle;
    onClose: () => void;
    onSave: (vehicle: Vehicle) => Promise<void>;
}> = ({ vehicle, onClose, onSave }) => {
    const { user } = useAuth();
    
    // Core fields plus Category & Sub-category setup
    const [category, setCategory] = useState<string>(vehicle?.category || 'Sedans');
    const [subCategory, setSubCategory] = useState<string>(vehicle?.subCategory || 'Toyota Vios');
    
    const [formData, setFormData] = useState({
        make: vehicle?.make || 'Toyota',
        model: vehicle?.model || 'Vios',
        year: vehicle?.year || new Date().getFullYear(),
        plateNumber: vehicle?.plateNumber || '',
        vin: vehicle?.vin || '',
        mileage: vehicle?.mileage?.toString() || '',
        insuranceProvider: vehicle?.insuranceProvider || '',
        insurancePolicyNumber: vehicle?.insurancePolicyNumber || '',
        color: vehicle?.color || '',
        type: vehicle?.type || 'Sedan',
        imageUrls: vehicle?.imageUrls || []
    });

    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    // Watch category adjustments to refresh Sub-category selections
    const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newCat = e.target.value;
        setCategory(newCat);
        
        if (newCat !== 'Other') {
            const list = VEHICLE_CATEGORIES[newCat as keyof typeof VEHICLE_CATEGORIES] || [];
            const defaultSub = list[0] || 'Other';
            setSubCategory(defaultSub);
            
            const parsed = parseMakeModel(defaultSub);
            setFormData(prev => ({
                ...prev,
                make: parsed.make,
                model: parsed.model,
                type: newCat === 'Luxury Vehicles' ? 'Premium Sedan' : newCat.substring(0, newCat.length - 1)
            }));
        } else {
            setSubCategory('Other');
            setFormData(prev => ({
                ...prev,
                make: '',
                model: '',
                type: 'Special Purpose'
            }));
        }
    };

    // Watch subCategory changes to auto-fill Make & Model details
    const handleSubCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newSub = e.target.value;
        setSubCategory(newSub);
        
        if (newSub !== 'Other') {
            const parsed = parseMakeModel(newSub);
            setFormData(prev => ({
                ...prev,
                make: parsed.make,
                model: parsed.model
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                make: '',
                model: ''
            }));
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        // Plate number is no longer required before uploading images; we use a fallback if empty

        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        const remainingSlots = 5 - formData.imageUrls.length;
        if (files.length > remainingSlots) {
            setErrors(prev => ({ ...prev, imageUrls: `You can only add ${remainingSlots} more image${remainingSlots === 1 ? '' : 's'}.` }));
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);
        
        try {
            const safePlateNumber = formData.plateNumber.trim().toUpperCase() || vehicle?.id || `TEMP_${Date.now()}`;
            const newUrls: string[] = [];
            
            if (!user) {
                for (let i = 0; i < files.length; i++) {
                    const file = files[i] as File;
                    const dataUrl = await fileToBase64(file);
                    newUrls.push(dataUrl);
                    setUploadProgress(((i + 1) / files.length) * 100);
                }
            } else {
                for (let i = 0; i < files.length; i++) {
                    const file = files[i] as File;
                    const path = STORAGE_PATHS.VEHICLES(user.id, safePlateNumber);
                    const url = await storageService.uploadFile(path, file);
                    newUrls.push(url);
                    setUploadProgress(((i + 1) / files.length) * 100);
                }
            }
            
            setFormData(prev => ({
                ...prev,
                imageUrls: [...prev.imageUrls, ...newUrls]
            }));
            
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors.imageUrls;
                return newErrors;
            });
        } catch (error) {
            console.error("Error uploading images:", error);
            setErrors(prev => ({ ...prev, imageUrls: 'Failed to upload images. Check your connection.' }));
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
            if (e.target) e.target.value = '';
        }
    };

    const handleDeleteImage = (indexToDelete: number) => {
        setFormData(prev => ({
            ...prev,
            imageUrls: prev.imageUrls.filter((_, index) => index !== indexToDelete)
        }));
    };

    const validate = () => {
        const newErrors: { [key: string]: string } = {};
        if (!formData.make.trim()) newErrors.make = "Make/Brand is required";
        if (!formData.model.trim()) newErrors.model = "Model is required";
        if (!formData.year) {
            newErrors.year = "Year is required";
        } else if (Number(formData.year) > new Date().getFullYear() + 1 || Number(formData.year) < 1900) {
            newErrors.year = "Enter a valid year";
        }
        if (!formData.plateNumber.trim()) {
            newErrors.plateNumber = "Plate number is required";
        } else if (formData.plateNumber.length < 3) {
            newErrors.plateNumber = "Plate number too short";
        }
        
        if (!vehicle && user?.vehicles.some(v => v.plateNumber.toUpperCase() === formData.plateNumber.toUpperCase())) {
            newErrors.plateNumber = "This vehicle is already in your garage";
        }

        if (formData.mileage && isNaN(Number(formData.mileage))) {
            newErrors.mileage = "Must be a valid number";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (isSaving || isUploading || showSuccess) return;

        if (validate()) {
            setIsSaving(true);
            try {
                const vehicleToSave: Vehicle = {
                    id: vehicle?.id || Date.now().toString(),
                    plateNumber: formData.plateNumber.toUpperCase().trim(),
                    make: formData.make.trim(),
                    model: formData.model.trim(),
                    year: Number(formData.year),
                    type: formData.type,
                    color: formData.color?.trim() || '',
                    imageUrls: formData.imageUrls,
                    vin: formData.vin?.trim() || '',
                    category,
                    subCategory,
                    isPrimary: vehicle?.isPrimary ?? (user?.vehicles.length === 0),
                    ...(formData.mileage && { mileage: Number(formData.mileage) }),
                    ...(formData.insuranceProvider?.trim() && { insuranceProvider: formData.insuranceProvider.trim() }),
                    ...(formData.insurancePolicyNumber?.trim() && { insurancePolicyNumber: formData.insurancePolicyNumber.trim() }),
                    ...(vehicle?.servicesCount !== undefined && { servicesCount: vehicle.servicesCount }),
                    ...(vehicle?.totalSpent !== undefined && { totalSpent: vehicle.totalSpent }),
                };

                await onSave(vehicleToSave);
                setShowSuccess(true);
                setTimeout(() => {
                    onClose();
                }, 1500);
            } catch (error) {
                console.error("Save error:", error);
                setErrors(prev => ({ ...prev, submit: "Error saving to cloud. Please try again." }));
            } finally {
                setIsSaving(false);
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[100] p-4 overflow-y-auto custom-scrollbar animate-fadeIn" role="dialog" aria-modal="true">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-xl my-auto"
            >
                <div className="bg-[#1C1C1E]/80 backdrop-blur-2xl rounded-[2.5rem] overflow-hidden flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 relative">
                    <AnimatePresence>
                        {showSuccess && (
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="absolute inset-0 z-50 bg-[#1C1C1E] flex flex-col items-center justify-center text-center p-8"
                            >
                                <motion.div 
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center text-primary mb-6"
                                >
                                    <CheckCircle size={48} />
                                </motion.div>
                                <h3 className="text-2xl font-black text-white mb-2">
                                    {vehicle ? 'Update Confirmed!' : 'Enrollment Successful!'}
                                </h3>
                                <p className="text-gray-400 text-sm font-medium">
                                    Your garage records have been synchronized.
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-primary/10 blur-[100px] -z-10 pointer-events-none" />

                    <div className="p-4 sm:p-5 flex justify-between items-center relative border-b border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary border border-primary/20 shadow-md shrink-0">
                                {vehicle ? <Edit2 size={20} /> : <Car size={20} />}
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-white tracking-tight leading-none">
                                    {vehicle ? 'Configure Vehicle' : 'Register Vehicle'}
                                </h2>
                                <p className="text-[8px] text-primary font-black uppercase tracking-[0.2em] mt-1.5 opacity-70">
                                    Garage Entry System v3.0
                                </p>
                            </div>
                        </div>
                        <button 
                            onClick={onClose} 
                            className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:bg-white/10 hover:text-white transition-all shrink-0"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    <div className="flex-grow overflow-y-auto px-5 sm:px-8 pb-6 sm:pb-8 custom-scrollbar max-h-[65vh]">
                        <div className="space-y-6 sm:space-y-8 pt-5 sm:pt-6">
                            <div className="space-y-3 sm:space-y-4">
                                <div className="flex justify-between items-end px-1">
                                    <div>
                                        <h3 className="text-[10px] sm:text-xs font-black text-white/90 uppercase tracking-widest mb-0.5 sm:mb-1">Vehicle Gallery</h3>
                                        <p className="text-[9px] sm:text-[10px] text-gray-500 font-medium">Clear photos improve service accuracy</p>
                                    </div>
                                    <div className="text-[9px] sm:text-[10px] font-black text-primary bg-primary/10 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg border border-primary/20">
                                        {formData.imageUrls.length} / 5
                                    </div>
                                </div>
                                {errors.imageUrls && (
                                    <p className="text-red-400 text-[10px] px-1 animate-fadeIn">{errors.imageUrls}</p>
                                )}
                                
                                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                                    <AnimatePresence mode="popLayout">
                                        {formData.imageUrls.map((img, index) => (
                                            <div 
                                                key={`img-${index}`}
                                                className="relative group aspect-square rounded-2xl overflow-hidden border border-white/10 bg-black/40 shadow-inner"
                                            >
                                                <img src={getVehicleImage(img)} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-2">
                                                    <button 
                                                        type="button" 
                                                        onClick={() => handleDeleteImage(index)} 
                                                        className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </AnimatePresence>
                                    
                                    {formData.imageUrls.length < 5 && (
                                        <label className={`aspect-square rounded-[1.5rem] border-2 border-dashed flex flex-col items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer relative overflow-hidden group ${isUploading ? 'border-primary bg-primary/5 cursor-wait' : 'border-white/10 hover:border-primary/50 hover:bg-primary/5'}`}>
                                            {isUploading ? (
                                                <div className="flex flex-col items-center z-10">
                                                    <div className="w-6 h-6 sm:w-8 sm:h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mb-1.5 sm:mb-3" />
                                                    <span className="text-[8px] sm:text-[10px] font-black text-primary tracking-widest">{Math.round(uploadProgress)}%</span>
                                                </div>
                                            ) : (
                                                <>
                                                    <Camera size={18} className="text-gray-400 group-hover:text-primary transition-colors sm:hidden" />
                                                    <Camera size={20} className="text-gray-400 group-hover:text-primary transition-colors hidden sm:block" />
                                                    <span className="text-[8px] sm:text-[9px] font-black text-gray-500 group-hover:text-white uppercase tracking-widest transition-colors">Add Media</span>
                                                </>
                                            )}
                                            <input id="garage-image" name="garage-image" type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" disabled={isUploading} />
                                        </label>
                                    )}
                                </div>
                            </div>

                            {/* Intelligent Category & Subcategory setup (4-Wheel Drive) */}
                            <div className="grid grid-cols-2 gap-4 sm:gap-5 bg-white/[0.02] p-4 sm:p-5 rounded-[2rem] sm:rounded-3xl border border-white/5">
                                <div className="col-span-2 sm:col-span-1 space-y-2">
                                    <label htmlFor="vehicle-category" className="text-[10px] font-black text-primary uppercase tracking-widest ml-1">Category (4-Wheel Drive)</label>
                                    <select
                                        id="vehicle-category"
                                        name="vehicle-category"
                                        value={category}
                                        onChange={handleCategoryChange}
                                        className="w-full px-4 py-3 bg-[#1C1C1E] border border-white/10 rounded-2xl text-sm font-bold text-white outline-none focus:border-primary/40"
                                    >
                                        <option value="Sedans">Sedans</option>
                                        <option value="SUVs">SUVs</option>
                                        <option value="Vans / MPVs">Vans / MPVs</option>
                                        <option value="Luxury Vehicles">Luxury Vehicles</option>
                                        <option value="Other">Other Category</option>
                                    </select>
                                </div>

                                <div className="col-span-2 sm:col-span-1 space-y-2">
                                    <label htmlFor="vehicle-subcategory" className="text-[10px] font-black text-primary uppercase tracking-widest ml-1">Sub-Category (Model Group)</label>
                                    {category !== 'Other' ? (
                                        <select
                                            id="vehicle-subcategory"
                                            name="vehicle-subcategory"
                                            value={subCategory}
                                            onChange={handleSubCategoryChange}
                                            className="w-full px-4 py-3 bg-[#1C1C1E] border border-white/10 rounded-2xl text-sm font-bold text-white outline-none focus:border-primary/40"
                                        >
                                            {(VEHICLE_CATEGORIES[category as keyof typeof VEHICLE_CATEGORIES] || []).map(sub => (
                                                <option key={sub} value={sub}>{sub}</option>
                                            ))}
                                            <option value="Other">Other Model</option>
                                        </select>
                                    ) : (
                                        <input
                                            id="vehicle-subcategory-custom"
                                            name="vehicle-subcategory-custom"
                                            type="text"
                                            value={subCategory}
                                            onChange={e => setSubCategory(e.target.value)}
                                            placeholder="Enter sub-category"
                                            className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-2xl text-sm font-bold text-white outline-none focus:border-primary/40"
                                        />
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-x-4 sm:gap-x-5 gap-y-4 sm:gap-y-6">
                                <div className="col-span-2 sm:col-span-1 space-y-2">
                                    <label htmlFor="vehicle-make" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Brand / Make</label>
                                    <input
                                        id="vehicle-make"
                                        name="vehicle-make"
                                        type="text"
                                        value={formData.make}
                                        onChange={e => setFormData({ ...formData, make: e.target.value })}
                                        placeholder="e.g. Toyota"
                                        readOnly={subCategory !== 'Other' && category !== 'Other'}
                                        className={`w-full px-4 py-3 bg-white/[0.03] border rounded-2xl text-sm font-bold text-white outline-none focus:bg-white/[0.07] ${errors.make ? 'border-red-500/50' : 'border-white/10 focus:border-primary/40'} ${(subCategory !== 'Other' && category !== 'Other') ? 'opacity-55' : ''}`}
                                    />
                                    {errors.make && <p className="text-red-400 text-[10px] ml-1">{errors.make}</p>}
                                </div>

                                <div className="col-span-2 sm:col-span-1 space-y-2">
                                    <label htmlFor="vehicle-model" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Model Name</label>
                                    <input
                                        id="vehicle-model"
                                        name="vehicle-model"
                                        type="text"
                                        value={formData.model}
                                        onChange={e => setFormData({ ...formData, model: e.target.value })}
                                        placeholder="e.g. Fortuner"
                                        readOnly={subCategory !== 'Other' && category !== 'Other'}
                                        className={`w-full px-4 py-3 bg-white/[0.03] border rounded-2xl text-sm font-bold text-white outline-none focus:bg-white/[0.07] ${errors.model ? 'border-red-500/50' : 'border-white/10 focus:border-primary/40'} ${(subCategory !== 'Other' && category !== 'Other') ? 'opacity-55' : ''}`}
                                    />
                                    {errors.model && <p className="text-red-400 text-[10px] ml-1">{errors.model}</p>}
                                </div>

                                <div className="col-span-2 sm:col-span-1 space-y-2">
                                    <label htmlFor="vehicle-plate" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Plate Number</label>
                                    <input
                                        id="vehicle-plate"
                                        name="vehicle-plate"
                                        type="text"
                                        value={formData.plateNumber}
                                        onChange={e => setFormData({ ...formData, plateNumber: e.target.value.toUpperCase() })}
                                        placeholder="ABC 123"
                                        readOnly={!!vehicle}
                                        className={`w-full px-4 py-3 bg-white/[0.03] border rounded-2xl text-sm font-mono font-black text-white outline-none focus:bg-white/[0.07] ${errors.plateNumber ? 'border-red-500/50' : 'border-white/10 focus:border-primary/40'} ${!!vehicle ? 'opacity-40' : ''}`}
                                    />
                                    {errors.plateNumber && <p className="text-red-400 text-[10px] ml-1">{errors.plateNumber}</p>}
                                </div>

                                <div className="col-span-2 sm:col-span-1 space-y-2">
                                    <label htmlFor="vehicle-year" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Year</label>
                                    <input
                                        id="vehicle-year"
                                        name="vehicle-year"
                                        type="number"
                                        value={formData.year}
                                        onChange={e => setFormData({ ...formData, year: Number(e.target.value) })}
                                        placeholder="2024"
                                        className={`w-full px-4 py-3 bg-white/[0.03] border rounded-2xl text-sm font-bold text-white outline-none focus:bg-white/[0.07] ${errors.year ? 'border-red-500/50' : 'border-white/10 focus:border-primary/40'}`}
                                    />
                                    {errors.year && <p className="text-red-400 text-[10px] ml-1">{errors.year}</p>}
                                </div>

                                <div className="col-span-2 sm:col-span-1 space-y-2">
                                    <label htmlFor="vehicle-odometer" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Odometer (km)</label>
                                    <input
                                        id="vehicle-odometer"
                                        name="vehicle-odometer"
                                        type="number"
                                        value={formData.mileage}
                                        onChange={e => setFormData({ ...formData, mileage: e.target.value })}
                                        placeholder="0"
                                        className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-2xl text-sm font-bold text-white outline-none focus:border-primary/40"
                                    />
                                </div>

                                <div className="col-span-2 sm:col-span-1 space-y-2">
                                    <label htmlFor="vehicle-color" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Color Theme</label>
                                    <input
                                        id="vehicle-color"
                                        name="vehicle-color"
                                        type="text"
                                        value={formData.color}
                                        onChange={e => setFormData({ ...formData, color: e.target.value })}
                                        placeholder="e.g. Silver"
                                        className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-2xl text-sm font-bold text-white outline-none focus:border-primary/40"
                                    />
                                </div>

                                <div className="col-span-2 mt-4 space-y-4">
                                    <div className="flex items-center gap-2 px-1">
                                        <ShieldCheck size={14} className="text-primary" />
                                        <h4 className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em]">Security & Insurance</h4>
                                    </div>
                                    <div className="space-y-4 bg-white/[0.02] p-4 sm:p-5 rounded-[2rem] sm:rounded-3xl border border-white/5">
                                        <div className="space-y-2">
                                            <label htmlFor="vehicle-vin" className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">VIN / Chassis Number</label>
                                            <input
                                                id="vehicle-vin"
                                                name="vehicle-vin"
                                                type="text"
                                                value={formData.vin}
                                                onChange={e => setFormData({ ...formData, vin: e.target.value.toUpperCase() })}
                                                placeholder="17-Digit Vehicle Identification Number"
                                                className="w-full px-4 py-3 bg-black/20 border border-white/5 rounded-2xl text-xs sm:text-sm font-mono font-bold text-white outline-none focus:border-primary/30 tracking-widest"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label htmlFor="vehicle-insurance-provider" className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Provider</label>
                                                <input
                                                    id="vehicle-insurance-provider"
                                                    name="vehicle-insurance-provider"
                                                    type="text"
                                                    value={formData.insuranceProvider}
                                                    onChange={e => setFormData({ ...formData, insuranceProvider: e.target.value })}
                                                    placeholder="Insurance Co."
                                                    className="w-full px-4 py-3 bg-black/20 border border-white/5 rounded-xl text-xs font-bold text-white outline-none focus:border-primary/20"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label htmlFor="vehicle-insurance-policy" className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Policy Number</label>
                                                <input
                                                    id="vehicle-insurance-policy"
                                                    name="vehicle-insurance-policy"
                                                    type="text"
                                                    value={formData.insurancePolicyNumber}
                                                    onChange={e => setFormData({ ...formData, insurancePolicyNumber: e.target.value })}
                                                    placeholder="PN-XXXXXX"
                                                    className="w-full px-4 py-3 bg-black/20 border border-white/5 rounded-xl text-xs font-bold text-white outline-none focus:border-primary/20"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {errors.submit && (
                                <div className="bg-red-500/10 border border-red-500/20 p-4 sm:p-5 rounded-3xl flex items-center gap-4">
                                    <AlertTriangle size={20} className="text-red-500" />
                                    <p className="text-red-400 text-xs font-bold leading-relaxed">{errors.submit}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-4 sm:p-5 bg-[#1C1C1E] border-t border-white/10 flex flex-row gap-3 sm:gap-4">
                        <button 
                            type="button"
                            onClick={onClose} 
                            disabled={isSaving || isUploading}
                            className="flex-1 py-3 sm:py-3.5 bg-white hover:bg-gray-100 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest text-black shadow-md transition-all active:scale-[0.98]"
                        >
                            Cancel
                        </button>
                        <button 
                            type="button"
                            onClick={() => handleSave()} 
                            disabled={isSaving || isUploading || showSuccess}
                            className={`flex-[1.5] py-3 sm:py-3.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${showSuccess ? 'bg-green-500 text-white' : 'bg-primary text-black hover:brightness-110 shadow-lg shadow-primary/20'} disabled:opacity-50 active:scale-[0.98]`}
                        >
                            {isSaving ? 'Saving...' : showSuccess ? 'Success' : vehicle ? 'Commit Changes' : 'Enroll Vehicle'}
                        </button>
                    </div>

                </div>
            </motion.div>
        </div>
    );
};

const VehicleImageCarousel: React.FC<{ images: string[] }> = ({ images }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    const goToPrevious = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
    };

    const goToNext = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));
    };

    if (!images || images.length === 0) {
        return (
            <div className="w-full h-full bg-gradient-to-br from-[#1C1C1E] to-[#252528] flex flex-col items-center justify-center text-white/40">
                <Car size={32} className="mb-2 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-wider">No Image</span>
            </div>
        );
    }

    return (
        <div className="w-full h-full relative group overflow-hidden">
            <img src={getVehicleImage(images[currentIndex])} alt="Vehicle" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-65"></div>
            {images.length > 1 && (
                <>
                    <button onClick={goToPrevious} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white p-1 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all">
                        <ChevronDown size={14} className="rotate-90" />
                    </button>
                    <button onClick={goToNext} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white p-1 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all">
                        <ChevronDown size={14} className="-rotate-90" />
                    </button>
                </>
            )}
        </div>
    );
};

const MyGarageScreen: React.FC = () => {
    const { user, addUserVehicle, updateUserVehicle, deleteUserVehicle, setPrimaryVehicle, loading } = useAuth();
    const navigate = useNavigate();
    const { db } = useDatabase();
    
    // Core states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLogModalOpen, setIsLogModalOpen] = useState(false);
    const [activeLogPlate, setActiveLogPlate] = useState<string | null>(null);
    const [editingVehicle, setEditingVehicle] = useState<Vehicle | undefined>(undefined);
    const [expandedPlate, setExpandedPlate] = useState<string | null>(null);
    
    // Filters & Search states
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('All');

    // Filter categories to only show the "Realtime and Live available category" present in the user's vehicles!
    const liveCategories = useMemo(() => {
        if (!user || !user.vehicles) return ['All'];
        const cats = user.vehicles
            .map(v => v.category)
            .filter((cat): cat is string => !!cat);
        return ['All', ...Array.from(new Set(cats))];
    }, [user]);

    useEffect(() => {
        if (!liveCategories.includes(typeFilter)) {
            setTypeFilter('All');
        }
    }, [liveCategories, typeFilter]);

    // Self-maintenance logs state triggered on refresh
    const [refreshLogsCount, setRefreshLogsCount] = useState(0);
    const [reminders, setReminders] = useState<Reminder[]>([]);

    useEffect(() => {
        // Fetch active reminders to calculate vehicle statuses
        const stored = localStorage.getItem('serviceReminders');
        if (stored) {
            try {
                setReminders(JSON.parse(stored));
            } catch (e) {
                console.error(e);
            }
        }
    }, []);

    // Fetch self logs for specific vehicle
    const getSelfLogs = (plateNumber: string): SelfLog[] => {
        try {
            const logs = localStorage.getItem(`garage_logs_${plateNumber}`);
            return logs ? JSON.parse(logs) : [];
        } catch (e) {
            return [];
        }
    };

    // Calculate vehicle Health index & status indicators
    const calculateHealth = (vehicle: Vehicle) => {
        const vehicleName = `${vehicle.make} ${vehicle.model}`;
        const matchedReminders = reminders.filter(r => r.vehicle.toLowerCase() === vehicleName.toLowerCase());
        const hasOverdue = matchedReminders.some(r => {
            const isOverdueState = r.status === 'Overdue' || (r.status !== 'Completed' && new Date(r.date) < new Date());
            return isOverdueState;
        });

        // Basic intelligence logic based on mileage/odometer intervals
        const mileage = vehicle.mileage || 0;
        const needsServiceByMileage = mileage > 0 && mileage % 5000 >= 4500;

        let index = 100;
        let status = 'Excellent';
        let statusColor = 'text-green-400 bg-green-500/10 border-green-500/20';

        if (hasOverdue) {
            index = 65;
            status = 'Overdue Alert';
            statusColor = 'text-red-400 bg-red-500/10 border-red-500/20';
        } else if (needsServiceByMileage) {
            index = 80;
            status = 'Service Due';
            statusColor = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
        } else if (mileage > 15000 && !vehicle.servicesCount) {
            index = 75;
            status = 'Check-up Recommended';
            statusColor = 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
        }

        return { index, status, statusColor };
    };

    const handleOpenModal = (vehicle?: Vehicle) => {
        setEditingVehicle(vehicle);
        setIsModalOpen(true);
    };

    const handleOpenLogModal = (plateNumber: string) => {
        setActiveLogPlate(plateNumber);
        setIsLogModalOpen(true);
    };

    const handleSaveVehicle = async (vehicle: Vehicle) => {
        try {
            if (editingVehicle) {
                await updateUserVehicle(vehicle);
            } else {
                await addUserVehicle(vehicle);
            }
        } catch (error) {
            console.error("Save error:", error);
            throw error;
        }
    };

    const handleDeleteVehicle = async (plateNumber: string) => {
        try {
            await deleteUserVehicle(plateNumber);
        } catch (error) {
            console.error(error);
        }
    };

    const handleSetPrimary = async (plateNumber: string) => {
        try {
            await setPrimaryVehicle(plateNumber);
        } catch (error) {
            console.error(error);
        }
    };

    const handleDeleteLog = (plateNumber: string, logId: string) => {
        const logs = getSelfLogs(plateNumber);
        const filtered = logs.filter(l => l.id !== logId);
        localStorage.setItem(`garage_logs_${plateNumber}`, JSON.stringify(filtered));
        setRefreshLogsCount(c => c + 1);
    };

    // Filter vehicles (Category only: Sedans, SUVs, Vans / MPVs, Luxury Vehicles)
    const filteredVehicles = useMemo(() => {
        if (!user) return [];
        return user.vehicles.filter(v => {
            const matchSearch = 
                v.make.toLowerCase().includes(searchQuery.toLowerCase()) ||
                v.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
                v.plateNumber.toLowerCase().includes(searchQuery.toLowerCase());
            
            // Filter strictly by Category instead of generic type
            const matchCategory = typeFilter === 'All' || v.category === typeFilter;

            return matchSearch && matchCategory;
        });
    }, [user, searchQuery, typeFilter]);

    if (loading) {
        return <div className="flex items-center justify-center h-screen bg-[#121212]"><Spinner size="lg" /></div>;
    }

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#121212] text-white p-8">
                <Car size={48} className="text-gray-600 mb-4 animate-bounce" />
                <p className="text-center font-bold">Please log in to view your garage.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-[#0F0F10] font-sans text-white pb-24">
            <CustomerHeader title="My Garage" showBackButton icon={<Car size={22} />} />

            <main className="flex-1 p-4 sm:p-6 space-y-6">
                
                {/* Visual Garage Stats Board - COMPACT PREMIUM 4-COLUMN KPIs */}
                <div className="grid grid-cols-4 gap-2">
                    <div className="bg-gradient-to-br from-[#1C1C1E] to-[#121214] rounded-2xl p-3 border border-white/5 relative overflow-hidden group shadow-md transition-all duration-300 hover:border-primary/20">
                        <div className="absolute top-0 right-0 w-12 h-12 bg-primary/5 rounded-full blur-xl -translate-y-1/2 translate-x-1/2"></div>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[8px] font-black uppercase text-gray-500 tracking-wider">Fleet</span>
                            <Car size={12} className="text-primary opacity-80" />
                        </div>
                        <p className="text-lg font-black text-white leading-none tracking-tight">{user.vehicles.length}</p>
                    </div>

                    <div className="bg-gradient-to-br from-[#1C1C1E] to-[#121214] rounded-2xl p-3 border border-white/5 relative overflow-hidden group shadow-md transition-all duration-300 hover:border-yellow-500/20">
                        <div className="absolute top-0 right-0 w-12 h-12 bg-yellow-500/5 rounded-full blur-xl -translate-y-1/2 translate-x-1/2"></div>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[8px] font-black uppercase text-gray-500 tracking-wider">Primary</span>
                            <Star size={12} className="text-yellow-500 opacity-80" fill="currentColor" />
                        </div>
                        <p className="text-xs font-black text-white truncate leading-none mt-0.5">
                            {user.vehicles.find(v => v.isPrimary)?.model || 'None'}
                        </p>
                    </div>

                    <div className="bg-gradient-to-br from-[#1C1C1E] to-[#121214] rounded-2xl p-3 border border-white/5 relative overflow-hidden group shadow-md transition-all duration-300 hover:border-purple-500/20">
                        <div className="absolute top-0 right-0 w-12 h-12 bg-purple-500/5 rounded-full blur-xl -translate-y-1/2 translate-x-1/2"></div>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[8px] font-black uppercase text-gray-500 tracking-wider">Bookings</span>
                            <Wrench size={12} className="text-purple-400 opacity-80" />
                        </div>
                        <p className="text-lg font-black text-white leading-none tracking-tight">
                            {user.vehicles.reduce((acc, v) => acc + (v.servicesCount || 0), 0)}
                        </p>
                    </div>

                    <div className="bg-gradient-to-br from-[#1C1C1E] to-[#121214] rounded-2xl p-3 border border-white/5 relative overflow-hidden group shadow-md transition-all duration-300 hover:border-green-500/20">
                        <div className="absolute top-0 right-0 w-12 h-12 bg-green-500/5 rounded-full blur-xl -translate-y-1/2 translate-x-1/2"></div>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[8px] font-black uppercase text-gray-500 tracking-wider">Spent</span>
                            <DollarSign size={12} className="text-green-400 opacity-80" />
                        </div>
                        <p className="text-xs font-black text-green-400 leading-none tracking-tight mt-0.5 truncate">
                            ₱{user.vehicles.reduce((acc, v) => acc + (v.totalSpent || 0), 0).toLocaleString()}
                        </p>
                    </div>
                </div>

                {/* Filter and Search Panel - CATEGORIES STRICTLY 4WD */}
                <div className="bg-[#1C1C1E] p-4 rounded-3xl border border-white/5 space-y-4 shadow-2xl">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                        <input
                            id="garage-search"
                            name="garage-search"
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search by Make, Model, Plate..."
                            className="w-full pl-11 pr-4 py-3 bg-black/30 rounded-2xl text-sm font-bold placeholder-gray-600 text-white outline-none border border-white/5 focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all"
                        />
                    </div>
                    
                    <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                        <div className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-xl border border-white/5 shrink-0">
                            <Filter size={12} className="text-primary" />
                            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Live Category:</span>
                        </div>
                        {liveCategories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setTypeFilter(cat)}
                                className={`px-4 py-1.5 rounded-xl text-[10px] font-black transition-all shrink-0 uppercase tracking-widest ${typeFilter === cat ? 'bg-primary text-black' : 'bg-black/30 text-gray-400 hover:text-white border border-white/5'}`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Enroll vehicle premium banner */}
                <button
                    onClick={() => handleOpenModal()}
                    className="w-full py-4 rounded-3xl bg-gradient-to-r from-primary/10 to-transparent border border-dashed border-primary/20 text-primary font-black uppercase tracking-widest hover:brightness-110 transition-all flex items-center justify-center gap-2 group shadow-xl active:scale-[0.99]"
                >
                    <Plus size={18} />
                    Enroll Vehicle into Garage
                </button>

                {/* Vehicles Render */}
                <div className="grid grid-cols-1 gap-6">
                    {filteredVehicles.length > 0 ? (
                        filteredVehicles.map(v => {
                            const health = calculateHealth(v);
                            const vLogs = getSelfLogs(v.plateNumber);
                            const vehicleName = `${v.make} ${v.model}`;
                            const vehicleReminders = reminders.filter(r => r.vehicle.toLowerCase() === vehicleName.toLowerCase());

                            return (
                                <div
                                    key={v.plateNumber}
                                    className={`bg-[#1C1C1E] rounded-[2rem] overflow-hidden border transition-all duration-300 ${v.isPrimary ? 'border-primary/40 shadow-lg shadow-primary/5' : 'border-white/5'}`}
                                >
                                    {/* ------------------- DESKTOP GRID CARD LAYOUT ------------------- */}
                                    <div className="hidden md:flex flex-col lg:flex-row items-stretch min-h-[240px]">
                                        <div className="w-full lg:w-80 h-56 lg:h-auto relative shrink-0 border-b lg:border-b-0 lg:border-r border-white/5 bg-black/40 overflow-hidden">
                                            <VehicleImageCarousel images={v.imageUrls || []} />
                                            {v.isPrimary && (
                                                <div className="absolute top-3 left-3 bg-primary text-black text-[9px] font-black px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1 z-10">
                                                    <Star size={9} fill="currentColor" /> Primary
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 p-6 flex flex-col justify-between min-w-0">
                                            <div>
                                                <div className="flex justify-between items-start gap-4">
                                                    <div className="min-w-0 flex-1">
                                                        <h3 className="text-2xl font-black text-white truncate leading-tight">{v.year} {v.make}</h3>
                                                        <p className="text-base font-bold text-gray-400 truncate mt-0.5">{v.model}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <div className={`px-3 py-1 rounded-xl border text-[9px] font-black uppercase tracking-wider ${health.statusColor}`}>
                                                            {health.status}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Core Specs Dashboard Grid */}
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5">
                                                    <div className="bg-white/[0.02] p-3 rounded-2xl border border-white/5 flex flex-col justify-center">
                                                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-0.5">Category</span>
                                                        <span className="text-xs font-black text-primary uppercase truncate">{v.category || 'N/A'}</span>
                                                    </div>
                                                    <div className="bg-white/[0.02] p-3 rounded-2xl border border-white/5 flex flex-col justify-center">
                                                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-0.5">Sub Category</span>
                                                        <span className="text-xs font-bold text-white truncate">{v.subCategory || 'N/A'}</span>
                                                    </div>
                                                    <div className="bg-white/[0.02] p-3 rounded-2xl border border-white/5 flex flex-col justify-center">
                                                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-0.5">Plate Number</span>
                                                        <span className="text-xs font-mono font-black text-white truncate">{v.plateNumber}</span>
                                                    </div>
                                                    <div className="bg-white/[0.02] p-3 rounded-2xl border border-white/5 flex flex-col justify-center">
                                                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-0.5">Mileage</span>
                                                        <span className="text-xs font-black text-white flex items-center gap-1 truncate">
                                                            <Gauge size={12} className="text-blue-400 shrink-0" /> {v.mileage?.toLocaleString() || 0} km
                                                        </span>
                                                    </div>
                                                    <div className="bg-white/[0.02] p-3 rounded-2xl border border-white/5 flex flex-col justify-center">
                                                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-0.5">Bookings</span>
                                                        <span className="text-xs font-black text-white flex items-center gap-1 truncate">
                                                            <Wrench size={12} className="text-purple-400 shrink-0" /> {v.servicesCount || 0} bookings
                                                        </span>
                                                    </div>
                                                    <div className="bg-white/[0.02] p-3 rounded-2xl border border-white/5 flex flex-col justify-center">
                                                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-0.5">Color</span>
                                                        <span className="text-xs font-bold text-white truncate">{v.color || 'N/A'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex justify-between items-center border-t border-white/5 pt-4 mt-6">
                                                <button
                                                    onClick={() => setExpandedPlate(p => p === v.plateNumber ? null : v.plateNumber)}
                                                    className="text-xs font-bold text-gray-400 hover:text-white transition-colors flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/5"
                                                >
                                                    <FileText size={16} /> 
                                                    {expandedPlate === v.plateNumber ? 'Hide Details' : 'Full Board'}
                                                </button>
                                                
                                                <div className="flex gap-2">
                                                    <button onClick={() => navigate(`/book?vehicleId=${v.id}`)} className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-black text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-[0.98]">
                                                        Book
                                                    </button>
                                                    <button onClick={() => handleOpenLogModal(v.plateNumber)} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-colors border border-white/5" title="Add Log">
                                                        <PenSquare size={16} />
                                                    </button>
                                                    <button onClick={() => handleOpenModal(v)} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-colors border border-white/5" title="Edit Vehicle">
                                                        <Edit2 size={16} />
                                                    </button>
                                                    {!v.isPrimary && (
                                                        <button onClick={() => handleSetPrimary(v.plateNumber)} className="p-2.5 bg-white/5 hover:bg-yellow-500/15 rounded-xl text-gray-400 hover:text-yellow-500 transition-colors border border-white/5" title="Set Primary">
                                                            <Star size={16} />
                                                        </button>
                                                    )}
                                                    <button onClick={() => handleDeleteVehicle(v.plateNumber)} className="p-2.5 bg-white/5 hover:bg-red-500/10 rounded-xl text-gray-400 hover:text-red-500 transition-colors border border-white/5" title="Remove Vehicle">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ------------------- MOBILE DENSE LIST LAYOUT ------------------- */}
                                    <div className="md:hidden flex flex-col p-4 space-y-3">
                                        <div className="flex gap-3">
                                            {/* Micro Gallery / Thumbnail Icon */}
                                            <div className="w-20 h-24 rounded-2xl overflow-hidden bg-black/40 border border-white/10 shrink-0 relative">
                                                {v.imageUrls && v.imageUrls.length > 0 ? (
                                                    <img src={getVehicleImage(v.imageUrls[0])} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex flex-col items-center justify-center text-primary bg-primary/5">
                                                        <Car size={20} className="mb-1" />
                                                        <span className="text-[8px] font-black uppercase">No Pic</span>
                                                    </div>
                                                )}
                                                {v.isPrimary && (
                                                    <div className="absolute top-0 left-0 bg-primary text-black p-1 rounded-br-lg z-10 shadow-lg">
                                                        <Star size={10} fill="currentColor" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Core details list layout */}
                                            <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <h3 className="text-sm font-black text-white truncate leading-tight">{v.year} {v.make}</h3>
                                                        <p className="text-xs font-bold text-gray-400 truncate">{v.model}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => setExpandedPlate(p => p === v.plateNumber ? null : v.plateNumber)}
                                                        className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-gray-400 shrink-0 hover:bg-white/10 hover:text-white transition-colors border border-white/5"
                                                    >
                                                        {expandedPlate === v.plateNumber ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                    </button>
                                                </div>

                                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                    <span className="font-mono text-[9px] text-white font-bold bg-white/10 px-1.5 py-0.5 rounded border border-white/5 shadow-inner">
                                                        {v.plateNumber}
                                                    </span>
                                                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border shadow-sm ${health.statusColor}`}>
                                                        {health.status}
                                                    </span>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                                    <span className="text-[9px] font-bold text-gray-300 flex items-center gap-1 bg-black/20 px-1.5 py-0.5 rounded border border-white/5">
                                                        <Gauge size={9} className="text-primary" /> {v.mileage?.toLocaleString() || 0} km
                                                    </span>
                                                    <span className="text-[9px] font-bold text-gray-300 flex items-center gap-1 bg-black/20 px-1.5 py-0.5 rounded border border-white/5">
                                                        <Wrench size={9} className="text-purple-400" /> {v.servicesCount || 0} svc
                                                    </span>
                                                    {v.color && (
                                                        <span className="text-[9px] font-bold text-gray-300 bg-black/20 px-1.5 py-0.5 rounded border border-white/5">
                                                            {v.color}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action buttons immediately accessible */}
                                        <div className="flex gap-2 pt-2 border-t border-white/5">
                                            <button onClick={() => navigate(`/book?vehicleId=${v.id}`)} className="flex-[2] py-2.5 bg-primary hover:bg-primary-hover text-black text-[10px] font-black uppercase tracking-widest rounded-xl transition-all text-center shadow-lg shadow-primary/20">
                                                Book Service
                                            </button>
                                            <button onClick={() => handleOpenLogModal(v.plateNumber)} className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 text-[10px] font-bold rounded-xl transition-colors text-center border border-white/5">
                                                Add Log
                                            </button>
                                            <button onClick={() => handleOpenModal(v)} className="w-11 flex items-center justify-center bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl transition-colors border border-white/5">
                                                <Edit2 size={12} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* ------------------- EXPANDABLE MAINTENANCE BOARD (BOTH) ------------------- */}
                                    {expandedPlate === v.plateNumber && (
                                        <div className="p-4 sm:p-6 border-t border-white/5 bg-black/20 space-y-6 animate-scaleIn">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {/* Advanced specs panel */}
                                                <div className="bg-[#1C1C1E] p-4 rounded-2xl border border-white/5 space-y-3">
                                                    <h4 className="text-[10px] font-black text-primary tracking-widest uppercase flex items-center gap-1.5">
                                                        <Activity size={12} /> Vehicle Metadata
                                                    </h4>
                                                    <div className="space-y-2 text-xs">
                                                        <div className="flex justify-between py-1.5 border-b border-white/5">
                                                            <span className="text-gray-400">VIN</span>
                                                            <span className="font-mono text-white font-bold">{v.vin || 'N/A'}</span>
                                                        </div>
                                                        <div className="flex justify-between py-1.5 border-b border-white/5">
                                                            <span className="text-gray-400">Insurance Provider</span>
                                                            <span className="text-white font-bold">{v.insuranceProvider || 'N/A'}</span>
                                                        </div>
                                                        <div className="flex justify-between py-1.5 border-b border-white/5">
                                                            <span className="text-gray-400">Policy Number</span>
                                                            <span className="text-white font-bold">{v.insurancePolicyNumber || 'N/A'}</span>
                                                        </div>
                                                        <div className="flex justify-between py-1.5">
                                                            <span className="text-gray-400">Class Type</span>
                                                            <span className="text-white font-bold">{v.category} ({v.subCategory})</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Alerts & Reminders Panel */}
                                                <div className="bg-[#1C1C1E] p-4 rounded-2xl border border-white/5 space-y-3">
                                                    <h4 className="text-[10px] font-black text-primary tracking-widest uppercase flex items-center gap-1.5">
                                                        <Bell size={12} /> Pending Reminders ({vehicleReminders.length})
                                                    </h4>
                                                    {vehicleReminders.length > 0 ? (
                                                        <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                                                            {vehicleReminders.map(r => (
                                                                <div key={r.id} className="bg-black/25 p-2 rounded-xl flex justify-between items-center border border-white/5">
                                                                    <div>
                                                                        <p className="text-xs font-bold text-white">{r.serviceName}</p>
                                                                        <p className="text-[10px] text-gray-500">Due: {new Date(r.date).toLocaleDateString()}</p>
                                                                    </div>
                                                                    <Badge className="bg-amber-500/10 text-amber-500 border-none text-[8px] font-bold">Pending</Badge>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="text-center py-4 text-gray-500 border border-dashed border-white/10 rounded-xl">
                                                            <Clock size={16} className="mx-auto mb-1 opacity-40" />
                                                            <p className="text-[10px]">No active reminders scheduled</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Interactive Custom Self-Maintenance Logs */}
                                            <div className="bg-[#1C1C1E] p-4 rounded-2xl border border-white/5 space-y-4">
                                                <div className="flex justify-between items-center">
                                                    <h4 className="text-[10px] font-black text-primary tracking-widest uppercase flex items-center gap-1.5">
                                                        <BookOpen size={12} /> Self-Maintenance Logbook
                                                    </h4>
                                                    <button
                                                        onClick={() => handleOpenLogModal(v.plateNumber)}
                                                        className="px-3 py-1 bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-black rounded-lg transition-all flex items-center gap-1"
                                                    >
                                                        <Plus size={10} /> Add Record
                                                    </button>
                                                </div>

                                                {vLogs.length > 0 ? (
                                                    <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                                                        {vLogs.map(log => (
                                                            <div key={log.id} className="bg-black/20 p-3 rounded-xl border border-white/5 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                                                                <div>
                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                        <span className="text-xs font-black text-white">{log.action}</span>
                                                                        <span className="text-[9px] text-gray-400 font-bold bg-white/5 px-1.5 py-0.5 rounded">{new Date(log.date).toLocaleDateString()}</span>
                                                                    </div>
                                                                    {log.notes && <p className="text-[10px] text-gray-500 mt-1">{log.notes}</p>}
                                                                    <div className="flex gap-2 items-center mt-1.5 text-[9px] text-gray-400">
                                                                        <span className="flex items-center gap-0.5"><Gauge size={10} /> {log.mileage.toLocaleString()} km</span>
                                                                        <span>•</span>
                                                                        <span className="flex items-center gap-0.5 text-green-400 font-bold"><DollarSign size={10} /> ₱{log.cost.toLocaleString()}</span>
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    onClick={() => handleDeleteLog(v.plateNumber, log.id)}
                                                                    className="text-gray-500 hover:text-red-400 transition-colors p-1 self-end sm:self-center"
                                                                >
                                                                    <Trash2 size={12} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-6 text-gray-500 border border-dashed border-white/10 rounded-xl">
                                                        <PenSquare size={20} className="mx-auto mb-1.5 opacity-30 text-primary" />
                                                        <p className="text-xs font-bold text-gray-400">No self-maintenance records yet</p>
                                                        <p className="text-[10px] text-gray-600">Track oil changes, repairs, or additions manually</p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Expanded controls for mobile */}
                                            <div className="md:hidden flex flex-wrap gap-2 pt-2 border-t border-white/5">
                                                {!v.isPrimary && (
                                                    <button onClick={() => handleSetPrimary(v.plateNumber)} className="flex-[2] py-2.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 rounded-xl text-xs font-bold transition-colors border border-yellow-500/20 shadow-inner flex items-center justify-center gap-1.5">
                                                        <Star size={14} /> Set as Primary
                                                    </button>
                                                )}
                                                <button onClick={() => handleDeleteVehicle(v.plateNumber)} className="flex-1 flex items-center justify-center bg-red-500/5 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors border border-red-500/10 py-2.5 text-xs font-bold gap-1.5">
                                                    <Trash2 size={14} /> Remove
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center py-12 px-6 rounded-3xl border border-dashed border-white/10 bg-[#1C1C1E] max-w-sm mx-auto animate-fadeIn">
                            <Car size={36} className="text-gray-600 mx-auto mb-3" />
                            <h3 className="text-lg font-black text-white mb-2">No matching vehicles</h3>
                            <p className="text-gray-500 text-xs leading-relaxed max-w-[240px] mx-auto">Try resetting filters or registering a new 4WD vehicle in your garage.</p>
                        </div>
                    )}
                </div>
            </main>

            <AnimatePresence>
                {isModalOpen && (
                    <VehicleFormModal 
                        vehicle={editingVehicle} 
                        onClose={() => {
                            setIsModalOpen(false);
                            setEditingVehicle(undefined);
                        }} 
                        onSave={handleSaveVehicle} 
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isLogModalOpen && activeLogPlate && (
                    <LogFormModal
                        plateNumber={activeLogPlate}
                        onClose={() => {
                            setIsLogModalOpen(false);
                            setActiveLogPlate(null);
                        }}
                        onSave={() => setRefreshLogsCount(c => c + 1)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default MyGarageScreen;
