import React, { useState, useMemo, useEffect } from 'react';
import { Service, Part, RentalCar, HireDriver, LiaisonStaff } from '../../types';
import Modal from '../../components/admin/Modal';
import { useDatabase } from '../../context/DatabaseContext';
import Spinner from '../../components/Spinner';
import { fileToBase64 } from '../../utils/fileUtils';
import EnhancedKPICard from '../../components/admin/EnhancedKPICard';
import { Plus, Search, Package, Table as WrenchPen, TrendingUp, AlertCircle, ShoppingBag, Edit, Trash2, Camera, User, BadgeCheck, Clock, Shield, Tag, Star, DollarSign, ArrowUpDown, ChevronDown, Wrench, Download, Upload, Filter, Edit2, Check, X, Copy, Grid, List, ToggleLeft, ToggleRight, Eye, Image as ImageIcon, MoreVertical, Car, UserCheck, Users, MapPin, FileText } from 'lucide-react';
import { getFallbackImageForCategory } from '../../utils/fallbackImages';
import { doc, setDoc, addDoc, collection, updateDoc, deleteDoc } from 'firebase/firestore';
import { db as firestore } from '../../firebase';
import { LiaisonStaffForm } from '../../components/admin/LiaisonStaffForm';

type SortableKeys = 'name' | 'price' | 'category' | 'stock' | 'sku';
import { compressAndEncodeImage } from '../../utils/fileUtils';
import { storageService } from '../../services/StorageService';

const getPresetDescription = (name: string): string => {
    const lower = name.toLowerCase();
    if (lower.includes('towing') || lower.includes('roadside') || lower.includes('wrecker')) {
        return "Professional 24/7 towing and roadside assistance service to securely transport your vehicle to the nearest service center or designated location.";
    }
    if (lower.includes('driver') || lower.includes('hire') || lower.includes('chauffeur') || lower.includes('driver for hire')) {
        return "Hire an experienced, professional driver for safe and reliable transportation. Licensed for professional driving with excellent local route knowledge.";
    }
    if (lower.includes('emergency') || lower.includes('rescue') || lower.includes('battery')) {
        return "Rapid-response emergency assistance service for critical vehicle breakdowns, flat tires, or battery jumps.";
    }
    if (lower.includes('liaison') || lower.includes('lto') || lower.includes('registration') || lower.includes('liason')) {
        return "Dedicated liaison and document handling services for vehicle registration, LTO compliance, and other vehicular administrative processes.";
    }
    return "Specialized professional service tailored to your vehicle's specific needs, handled by certified experts.";
};

const CategoryManagerModal: React.FC<{
    onClose: () => void;
}> = ({ onClose }) => {
    const { db, updateSettings } = useDatabase();
    
    // Auto-populate default categories if settings collections are empty or missing
    const defaultServices = ['Maintenance', 'Repair', 'Emergency', 'Diagnostics', 'Specialty Services', 'Cleaning & Detailing', 'Liason Services'];
    const defaultParts = ['Tires', 'Engine', 'Brakes', 'Filters', 'Suspension', 'Electrical', 'Tools'];
    
    const [serviceCategories, setServiceCategories] = useState<string[]>(
        db?.settings?.serviceCategories && db.settings.serviceCategories.length > 0
            ? db.settings.serviceCategories
            : defaultServices
    );
    const [partCategories, setPartCategories] = useState<string[]>(
        db?.settings?.partCategories && db.settings.partCategories.length > 0
            ? db.settings.partCategories
            : defaultParts
    );
    
    const [editingCategory, setEditingCategory] = useState<{ type: 'service' | 'part', originalName: string, currentName: string } | null>(null);
    const [newServiceCategory, setNewServiceCategory] = useState('');
    const [newPartCategory, setNewPartCategory] = useState('');

    const handleEditSave = () => {
        if (!editingCategory || !editingCategory.currentName.trim()) return;
        const { type, originalName, currentName } = editingCategory;
        const newName = currentName.trim();
        if (originalName === 'SPECIAL Services') {
            alert('The "SPECIAL Services" category is protected and cannot be modified.');
            return;
        }
        if (newName === 'SPECIAL Services' && newName !== originalName) {
            alert('Cannot rename to "SPECIAL Services". This is a protected category name.');
            return;
        }
        if (newName === originalName) {
            setEditingCategory(null);
            return;
        }

        if (type === 'service') {
            if (serviceCategories.includes(newName)) {
                alert('Category already exists.');
                return;
            }
            setServiceCategories(prev => prev.map(c => c === originalName ? newName : c));
        } else {
            if (partCategories.includes(newName)) {
                alert('Category already exists.');
                return;
            }
            setPartCategories(prev => prev.map(c => c === originalName ? newName : c));
        }
        setEditingCategory(null);
    };

    // Real-time catalog association count helpers
    const getServiceCount = (catName: string) => {
        if (!db?.services) return 0;
        return db.services.filter(s => s.category?.toLowerCase() === catName.toLowerCase()).length;
    };

    const getPartCount = (catName: string) => {
        if (!db?.parts) return 0;
        return db.parts.filter(p => p.category?.toLowerCase() === catName.toLowerCase()).length;
    };

    const handleSave = () => {
        updateSettings({ serviceCategories, partCategories });
        onClose();
    };

    const handleAdd = (type: 'service' | 'part') => {
        if (type === 'service' && newServiceCategory.trim()) {
            const val = newServiceCategory.trim();
            if (!serviceCategories.includes(val)) {
                setServiceCategories(prev => [...prev, val]);
            }
            setNewServiceCategory('');
        } else if (type === 'part' && newPartCategory.trim()) {
            const val = newPartCategory.trim();
            if (!partCategories.includes(val)) {
                setPartCategories(prev => [...prev, val]);
            }
            setNewPartCategory('');
        }
    };

    const handleDelete = (type: 'service' | 'part', categoryToDelete: string) => {
        if (categoryToDelete === 'SPECIAL Services') {
            alert('The "SPECIAL Services" category is protected and cannot be deleted.');
            return;
        }
        const itemCount = type === 'service' ? getServiceCount(categoryToDelete) : getPartCount(categoryToDelete);
        
        if (itemCount > 0) {
            const confirmDelete = window.confirm(
                `Warning: There are ${itemCount} ${type === 'service' ? 'services' : 'parts/tools'} registered under "${categoryToDelete}". \n\nDeleting this category will leave them uncategorized. Proceed?`
            );
            if (!confirmDelete) return;
        }

        if (type === 'service') {
            setServiceCategories(prev => prev.filter(c => c !== categoryToDelete));
        } else {
            setPartCategories(prev => prev.filter(c => c !== categoryToDelete));
        }
    };

    return (
        <Modal title="Manage Catalog Categories" isOpen={true} onClose={onClose} sizeClass="max-w-4xl" compact={true}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {/* Service Categories Panel */}
                <div className="space-y-4">
                    <h3 className="text-sm font-black text-white flex items-center gap-2 tracking-widest uppercase">
                        <Wrench size={16} className="text-primary" />
                        Service Categories
                    </h3>
                    
                    <div className="space-y-2 mb-3 min-h-[160px] max-h-56 overflow-y-auto bg-black/45 p-4 rounded-2xl border border-white/5 custom-scrollbar">
                        {serviceCategories.length > 0 ? (
                            serviceCategories.map(cat => {
                                const count = getServiceCount(cat);
                                const isEditing = editingCategory && editingCategory.type === 'service' && editingCategory.originalName === cat;
                                return (
                                    <div key={cat} className="flex items-center justify-between bg-white/5 border border-white/5 px-4 py-2.5 rounded-xl hover:bg-white/10 transition-colors group">
                                        {isEditing ? (
                                            <div className="flex items-center gap-2 flex-grow mr-2">
                                                <input 
                                                    type="text" 
                                                    id="edit-cat-name"
                                                    name="edit-cat-name"
                                                    value={editingCategory.currentName} 
                                                    onChange={e => setEditingCategory({ ...editingCategory, currentName: e.target.value })}
                                                    className="flex-grow bg-[#121212] border border-primary/50 rounded-lg px-2.5 py-1 text-white outline-none text-xs font-bold"
                                                    autoFocus
                                                />
                                                <button 
                                                    onClick={handleEditSave}
                                                    className="text-green-400 hover:text-green-300 p-1 hover:bg-green-500/10 rounded-md transition-all shrink-0"
                                                    title="Save Name"
                                                >
                                                    <Check size={14} />
                                                </button>
                                                <button 
                                                    onClick={() => setEditingCategory(null)}
                                                    className="text-red-400 hover:text-red-300 p-1 hover:bg-red-500/10 rounded-md transition-all shrink-0"
                                                    title="Cancel"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-white font-bold">{cat}</span>
                                                    <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider ${count > 0 ? 'bg-primary/20 text-primary border border-orange-500/20' : 'bg-white/5 text-gray-500 border border-white/5'}`}>
                                                        {count} {count === 1 ? 'service' : 'services'}
                                                    </span>
                                                </div>
                                                {cat !== 'SPECIAL Services' && (
                                                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button 
                                                            onClick={() => setEditingCategory({ type: 'service', originalName: cat, currentName: cat })} 
                                                            className="text-gray-500 hover:text-primary p-1.5 hover:bg-primary/10 rounded-lg transition-all"
                                                            title="Edit Category Name"
                                                        >
                                                            <Edit2 size={12} />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDelete('service', cat)} 
                                                            className="text-gray-500 hover:text-red-400 p-1.5 hover:bg-red-500/10 rounded-lg transition-all"
                                                            title="Delete Category"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="flex items-center justify-center min-h-[120px] text-gray-600 text-xs italic">
                                No service categories configured
                            </div>
                        )}
                    </div>
                    
                    <div className="flex gap-2">
                        <input
                            type="text"
                            id="add-service-category"
                            name="addServiceCategory"
                            value={newServiceCategory}
                            onChange={e => setNewServiceCategory(e.target.value)}
                            placeholder="Add Service Category..."
                            className="flex-grow bg-[#121212] border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none transition-all placeholder-gray-600 text-xs font-bold focus:border-primary/50"
                        />
                        <button
                            onClick={() => handleAdd('service')}
                            className="bg-primary hover:bg-orange-600 text-white font-black px-6 rounded-xl transition-all text-xs uppercase tracking-wider active:scale-95"
                        >
                            Add
                        </button>
                    </div>
                </div>

                {/* Part Categories Panel */}
                <div className="space-y-4">
                    <h3 className="text-sm font-black text-white flex items-center gap-2 tracking-widest uppercase">
                        <Package size={16} className="text-primary" />
                        Part Categories
                    </h3>
                    
                    <div className="space-y-2 mb-3 min-h-[160px] max-h-56 overflow-y-auto bg-black/45 p-4 rounded-2xl border border-white/5 custom-scrollbar">
                        {partCategories.length > 0 ? (
                            partCategories.map(cat => {
                                const count = getPartCount(cat);
                                const isEditing = editingCategory && editingCategory.type === 'part' && editingCategory.originalName === cat;
                                return (
                                    <div key={cat} className="flex items-center justify-between bg-white/5 border border-white/5 px-4 py-2.5 rounded-xl hover:bg-white/10 transition-colors group">
                                        {isEditing ? (
                                            <div className="flex items-center gap-2 flex-grow mr-2">
                                                <input 
                                                    type="text" 
                                                    id="edit-part-cat-name"
                                                    name="edit-part-cat-name"
                                                    value={editingCategory.currentName} 
                                                    onChange={e => setEditingCategory({ ...editingCategory, currentName: e.target.value })}
                                                    className="flex-grow bg-[#121212] border border-primary/50 rounded-lg px-2.5 py-1 text-white outline-none text-xs font-bold"
                                                    autoFocus
                                                />
                                                <button 
                                                    onClick={handleEditSave}
                                                    className="text-green-400 hover:text-green-300 p-1 hover:bg-green-500/10 rounded-md transition-all shrink-0"
                                                    title="Save Name"
                                                >
                                                    <Check size={14} />
                                                </button>
                                                <button 
                                                    onClick={() => setEditingCategory(null)}
                                                    className="text-red-400 hover:text-red-300 p-1 hover:bg-red-500/10 rounded-md transition-all shrink-0"
                                                    title="Cancel"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-white font-bold">{cat}</span>
                                                    <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider ${count > 0 ? 'bg-primary/20 text-primary border border-orange-500/20' : 'bg-white/5 text-gray-500 border border-white/5'}`}>
                                                        {count} {count === 1 ? 'item' : 'items'}
                                                    </span>
                                                </div>
                                                {cat !== 'SPECIAL Services' && (
                                                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button 
                                                            onClick={() => setEditingCategory({ type: 'part', originalName: cat, currentName: cat })} 
                                                            className="text-gray-500 hover:text-primary p-1.5 hover:bg-primary/10 rounded-lg transition-all"
                                                            title="Edit Category Name"
                                                        >
                                                            <Edit2 size={12} />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDelete('part', cat)} 
                                                            className="text-gray-500 hover:text-red-400 p-1.5 hover:bg-red-500/10 rounded-lg transition-all"
                                                            title="Delete Category"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="flex items-center justify-center min-h-[120px] text-gray-600 text-xs italic">
                                No part categories configured
                            </div>
                        )}
                    </div>
                    
                    <div className="flex gap-2">
                        <input
                            type="text"
                            id="add-part-category"
                            name="addPartCategory"
                            value={newPartCategory}
                            onChange={e => setNewPartCategory(e.target.value)}
                            placeholder="Add Part Category..."
                            className="flex-grow bg-[#121212] border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none transition-all placeholder-gray-600 text-xs font-bold focus:border-primary/50"
                        />
                        <button
                            onClick={() => handleAdd('part')}
                            className="bg-primary hover:bg-orange-600 text-white font-black px-6 rounded-xl transition-all text-xs uppercase tracking-wider active:scale-95"
                        >
                            Add
                        </button>
                    </div>
                </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-4 border-t border-white/5 pt-3">
                <button 
                    onClick={onClose} 
                    className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white border border-white/5 rounded-xl font-bold transition-all text-xs uppercase tracking-wider active:scale-95"
                >
                    Cancel
                </button>
                <button 
                    onClick={handleSave} 
                    className="px-6 py-3 bg-primary hover:bg-orange-600 text-white rounded-xl font-black transition-all shadow-xl shadow-primary/20 text-xs uppercase tracking-widest active:scale-95"
                >
                    Save Categories
                </button>
            </div>
        </Modal>
    );
};

export const parseEstimatedTime = (timeStr: string) => {
    const fallback = { value: 30, unit: 'mins' as const };
    if (!timeStr) return fallback;

    const regex = /^(\d+)\s*(min|mins|minute|minutes|hour|hours|hr|hrs|day|days)\b/i;
    const match = timeStr.trim().match(regex);

    if (!match) return fallback;

    const value = parseInt(match[1], 10);
    const unitRaw = match[2].toLowerCase();

    let unit: 'mins' | 'hours' | 'days' = 'mins';
    if (unitRaw.startsWith('min')) {
        unit = 'mins';
    } else if (unitRaw.startsWith('hour') || unitRaw.startsWith('hr')) {
        unit = 'hours';
    } else if (unitRaw.startsWith('day')) {
        unit = 'days';
    }

    return { value, unit };
};

const ServiceForm: React.FC<{ service?: Service; onSave: (service: any) => void; onCancel: () => void; categories: string[] }> = ({ service, onSave, onCancel, categories }) => {
    const { db, updateSettings } = useDatabase();
    const defaultServices = ['Maintenance', 'Repair', 'Emergency', 'Diagnostics', 'Specialty Services', 'Cleaning & Detailing', 'Liason Services'];
    
    // Realtime synced categories with fallback default list
    const activeCategories = useMemo(() => {
        const list = (db?.settings?.serviceCategories || categories).filter(c => c !== 'all');
        return list.length > 0 ? list : defaultServices;
    }, [db?.settings?.serviceCategories, categories]);

    const parsedDuration = parseEstimatedTime(service?.estimatedTime || '');
    const [formData, setFormData] = useState({ 
        id: service?.id, 
        name: service?.name || '', 
        description: service?.description || '', 
        price: service?.price ?? '', 
        estimatedTime: service?.estimatedTime || `${parsedDuration.value} ${parsedDuration.unit}`, 
        durationValue: parsedDuration.value,
        durationUnit: parsedDuration.unit,
        category: service?.category || (activeCategories[0] || ''), 
        imageUrl: service?.imageUrl || '', 
        icon: service?.icon || '', 
        requiresDownpayment: service?.requiresDownpayment || false,
        downpaymentPercentage: service?.downpaymentPercentage ?? 50,
        requiresApproval: service?.requiresApproval || false,
        bookingNoticeHours: service?.bookingNoticeHours ?? 24,
        isCarRental: service?.isCarRental || false,
        carRentalClass: service?.carRentalClass || 'Sedan',
        carRentalTransmission: service?.carRentalTransmission || 'Automatic',
        carRentalFuel: service?.carRentalFuel || 'Full to Full',
        isDriverHire: service?.isDriverHire || false,
        driverLicenseType: service?.driverLicenseType || 'Professional',
        driverExperience: service?.driverExperience || '3-5 years',
        driverGeoLimits: service?.driverGeoLimits || 'Within City',
    });
    
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [isUploading, setIsUploading] = useState(false);
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');

    useEffect(() => {
        if (formData.category === 'SPECIAL Services') {
            const presets = [
                "Professional 24/7 towing and roadside assistance service to securely transport your vehicle to the nearest service center or designated location.",
                "Hire an experienced, professional driver for safe and reliable transportation. Licensed for professional driving with excellent local route knowledge.",
                "Rapid-response emergency assistance service for critical vehicle breakdowns, flat tires, or battery jumps.",
                "Dedicated liaison and document handling services for vehicle registration, LTO compliance, and other vehicular administrative processes.",
                "Specialized professional service tailored to your vehicle's specific needs, handled by certified experts."
            ];
            const isPresetOrEmpty = !formData.description.trim() || presets.includes(formData.description);

            if (isPresetOrEmpty) {
                const newDesc = getPresetDescription(formData.name);
                if (formData.description !== newDesc) {
                    setFormData(prev => ({ ...prev, description: newDesc }));
                    if (errors.description) {
                        setErrors(prev => {
                            const next = { ...prev };
                            delete next.description;
                            return next;
                        });
                    }
                }
            }
        }
    }, [formData.name, formData.category, formData.description, errors.description]);

    const validate = (data = formData) => {
        const newErrors: { [key: string]: string } = {};
        if (!data.name.trim()) newErrors.name = "Service name is required.";
        if (!data.description.trim()) newErrors.description = "Description is required.";
        
        const isSpecialService = data.category === 'SPECIAL Services';
        if (isSpecialService) {
            if (data.price !== '' && Number(data.price) < 0) {
                newErrors.price = "Price must be positive or 0.";
            }
        } else {
            if (data.price === '' || Number(data.price) < 0) {
                newErrors.price = "Price is required.";
            }
        }
        if (!data.estimatedTime.trim()) newErrors.estimatedTime = "Estimated time is required.";
        if (!data.category.trim()) newErrors.category = "Category is required.";
        if (!data.imageUrl) newErrors.imageUrl = "Image is required.";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
        const newData = { ...formData, [name]: val };
        setFormData(newData);
        if (name === 'category' || name === 'price' || errors[name]) {
            validate(newData);
        }
    };

    const handleDurationChange = (value: number, unit: 'mins' | 'hours' | 'days') => {
        let timeStr = '';
        if (unit === 'mins') {
            timeStr = `${value} mins`;
        } else if (unit === 'hours') {
            timeStr = `${value} ${value === 1 ? 'hour' : 'hours'}`;
        } else if (unit === 'days') {
            timeStr = `${value} ${value === 1 ? 'day' : 'days'}`;
        }

        const nextData = {
            ...formData,
            durationValue: value,
            durationUnit: unit,
            estimatedTime: timeStr
        };
        setFormData(nextData);
        if (errors.estimatedTime) {
            validate(nextData);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                setIsUploading(true);
                const downloadURL = await storageService.uploadFile(`catalog/services/${Date.now()}_${file.name}`, file);
                const newData = { ...formData, imageUrl: downloadURL };
                setFormData(newData);
                validate(newData);
            } catch (err) {
                console.error("Service image upload failed:", err);
                setErrors(prev => ({ ...prev, imageUrl: 'Failed to upload image.' }));
            } finally {
                setIsUploading(false);
            }
        }
    };

    const handleQuickAddCategory = async () => {
        const trimmed = newCategoryName.trim();
        if (!trimmed) return;

        const exists = activeCategories.some(c => c.toLowerCase() === trimmed.toLowerCase());
        if (exists) {
            const existingName = activeCategories.find(c => c.toLowerCase() === trimmed.toLowerCase()) || trimmed;
            const newData = { ...formData, category: existingName };
            setFormData(newData);
            setIsAddingCategory(false);
            setNewCategoryName('');
            validate(newData);
            return;
        }

        const currentSettingsCategories = db?.settings?.serviceCategories || [...defaultServices];
        const updated = [...currentSettingsCategories, trimmed];
        try {
            await updateSettings({ serviceCategories: updated });
            const newData = { ...formData, category: trimmed };
            setFormData(newData);
            setIsAddingCategory(false);
            setNewCategoryName('');
            validate(newData);
        } catch (err) {
            console.error("Failed to quick add service category:", err);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            onSave({ 
                ...formData, 
                price: formData.price === '' ? 0 : Number(formData.price),
                downpaymentPercentage: Number(formData.downpaymentPercentage),
                bookingNoticeHours: Number(formData.bookingNoticeHours),
                isCarRental: formData.isCarRental,
                carRentalClass: formData.isCarRental ? formData.carRentalClass : undefined,
                carRentalTransmission: formData.isCarRental ? formData.carRentalTransmission : undefined,
                carRentalFuel: formData.isCarRental ? formData.carRentalFuel : undefined,
                isDriverHire: formData.isDriverHire,
                driverLicenseType: formData.isDriverHire ? formData.driverLicenseType : undefined,
                driverExperience: formData.isDriverHire ? formData.driverExperience : undefined,
                driverGeoLimits: formData.isDriverHire ? formData.driverGeoLimits : undefined,
            });
        }
    };

    const isSaveDisabled = !formData.name || !formData.description || (formData.price === '' && formData.category !== 'SPECIAL Services') || !formData.estimatedTime || !formData.category || !formData.imageUrl || isUploading;

    return (
        <form onSubmit={handleSubmit} className="space-y-6 animate-fadeIn" noValidate>
            {/* Header Image Upload */}
            <div className="relative group">
                <div className="w-full h-48 rounded-2xl bg-black/40 border-2 border-dashed border-white/10 overflow-hidden flex items-center justify-center transition-all group-hover:border-primary/50">
                    {isUploading ? (
                        <div className="text-center space-y-2">
                            <Spinner size="md" color="text-primary" />
                            <p className="text-sm text-gray-500 font-medium">Uploading...</p>
                        </div>
                    ) : formData.imageUrl ? (
                        <div className="relative w-full h-full">
                            <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Camera className="text-white" size={32} />
                            </div>
                        </div>
                    ) : (
                        <div className="text-center space-y-2">
                            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                                <ImageIcon className="text-gray-500" size={24} />
                            </div>
                            <p className="text-sm text-gray-500 font-medium">Click to upload service image</p>
                        </div>
                    )}
                    <input
                        id="service-image"
                        name="serviceImage"
                        type="file"
                        onChange={handleFileChange}
                        accept="image/*"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                </div>
                {errors.imageUrl && <p className="text-red-400 text-xs mt-2 flex items-center gap-1"><X size={12} /> {errors.imageUrl}</p>}
            </div>

            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label htmlFor="service-name" className="text-xs font-bold text-gray-400  tracking-wider flex items-center gap-2">
                            <Tag size={14} /> Service Name
                        </label>
                        <input
                            type="text"
                            id="service-name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="e.g. Full Synthetic Oil Change"
                            autoComplete="off"
                            className={`w-full py-2 px-3 bg-black/40 border rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-primary focus:border-transparent transition-all ${errors.name ? 'border-red-500/50' : 'border-white/10'}`}
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label htmlFor="service-category" className="text-xs font-bold text-gray-400 tracking-wider flex items-center gap-2">
                                <Package size={14} /> Category
                            </label>
                            {!isAddingCategory ? (
                                <button
                                    type="button"
                                    onClick={() => setIsAddingCategory(true)}
                                    className="text-[10px] font-black text-primary hover:text-orange-400 transition-colors uppercase tracking-wider flex items-center gap-0.5"
                                >
                                    <Plus size={10} /> Add Category
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setIsAddingCategory(false)}
                                    className="text-[10px] font-black text-gray-500 hover:text-gray-400 transition-colors uppercase tracking-wider"
                                >
                                    Cancel
                                </button>
                            )}
                        </div>

                        {!isAddingCategory ? (
                            <div className="relative">
                                <select
                                    id="service-category"
                                    name="category"
                                    value={formData.category}
                                    onChange={handleChange}
                                    className={`w-full py-2 px-3 bg-black/40 border rounded-xl text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all appearance-none pr-10 ${errors.category ? 'border-red-500/50' : 'border-white/10'}`}
                                >
                                    <option value="" disabled>Select Category</option>
                                    {activeCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                    <ChevronDown size={18} />
                                </div>
                            </div>
                        ) : (
                            <div className="flex gap-2 animate-fadeIn">
                                <input
                                    type="text"
                                    id="new-category-name"
                                    name="newCategoryName"
                                    value={newCategoryName}
                                    onChange={e => setNewCategoryName(e.target.value)}
                                    placeholder="Enter new category name..."
                                    className="flex-grow py-2 px-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-xs"
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleQuickAddCategory();
                                        }
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={handleQuickAddCategory}
                                    className="bg-primary hover:bg-orange-600 text-white px-4 rounded-xl transition-all flex items-center justify-center active:scale-95"
                                >
                                    <Check size={18} />
                                </button>
                            </div>
                        )}
                        {errors.category && <p className="text-red-400 text-xs mt-1">{errors.category}</p>}
                    </div>
                </div>

                <div className="space-y-2">
                    <label htmlFor="service-description" className="text-xs font-bold text-gray-400  tracking-wider flex items-center gap-2">
                        <Package size={14} /> Description
                    </label>
                    <textarea
                        id="service-description"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="Describe the service details, what's included, and any prerequisites..."
                        rows={3}
                        className={`w-full py-2 px-3 bg-black/40 border rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-primary focus:border-transparent resize-none transition-all ${errors.description ? 'border-red-500/50' : 'border-white/10'}`}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label htmlFor="service-price" className="text-xs font-bold text-gray-400  tracking-wider flex items-center gap-2">
                            <DollarSign size={14} /> Base Price (₱)
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                id="service-price"
                                name="price"
                                value={formData.price}
                                onChange={handleChange}
                                placeholder="1500"
                                autoComplete="off"
                                className={`w-full py-2 px-3 bg-black/40 border rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-primary focus:border-transparent transition-all ${errors.price ? 'border-red-500/50' : 'border-white/10'}`}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="service-duration" className="text-xs font-bold text-gray-400  tracking-wider flex items-center gap-2">
                            <Wrench size={14} /> Est. Duration
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="number"
                                min="1"
                                step="1"
                                id="service-duration-value"
                                name="durationValue"
                                value={formData.durationValue}
                                onChange={(e) => handleDurationChange(parseInt(e.target.value) || 1, formData.durationUnit)}
                                placeholder="30"
                                autoComplete="off"
                                className={`w-2/3 py-2 px-3 bg-black/40 border rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-primary focus:border-transparent transition-all ${errors.estimatedTime ? 'border-red-500/50' : 'border-white/10'}`}
                            />
                            <select
                                id="service-duration-unit"
                                name="durationUnit"
                                value={formData.durationUnit}
                                onChange={(e) => handleDurationChange(formData.durationValue, e.target.value as any)}
                                className={`w-1/3 py-2 px-3 bg-black/40 border rounded-xl text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all ${errors.estimatedTime ? 'border-red-500/50' : 'border-white/10'} [&>option]:bg-dark-gray [&>option]:text-white`}
                            >
                                <option value="mins">Minutes</option>
                                <option value="hours">Hours</option>
                                <option value="days">Days</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {formData.category === 'SPECIAL Services' && (
                <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-4 animate-fadeIn">
                    <div className="text-xs font-bold text-primary tracking-wider uppercase flex items-center gap-2">
                        <Shield size={14} /> Booking & Policy Rules (SPECIAL Services)
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label htmlFor="requires-approval" className="flex items-center gap-3 cursor-pointer p-3 bg-black/20 border border-white/5 rounded-xl hover:bg-black/30 transition-all select-none">
                            <input
                                id="requires-approval"
                                type="checkbox"
                                name="requiresApproval"
                                checked={formData.requiresApproval}
                                onChange={handleChange}
                                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary bg-black/40"
                            />
                            <div className="flex flex-col">
                                <span className="text-sm font-semibold text-white">Manual Assignment Approval</span>
                                <span className="text-xs text-gray-500">Requires admin confirmation before booking is scheduled</span>
                            </div>
                        </label>

                        <label htmlFor="requires-downpayment" className="flex items-center gap-3 cursor-pointer p-3 bg-black/20 border border-white/5 rounded-xl hover:bg-black/30 transition-all select-none">
                            <input
                                id="requires-downpayment"
                                type="checkbox"
                                name="requiresDownpayment"
                                checked={formData.requiresDownpayment}
                                onChange={handleChange}
                                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary bg-black/40"
                            />
                            <div className="flex flex-col">
                                <span className="text-sm font-semibold text-white">Require Deposit/Downpayment</span>
                                <span className="text-xs text-gray-500">Enable upfront payment for booking validation</span>
                            </div>
                        </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label htmlFor="booking-notice-hours" className="text-xs font-bold text-gray-400 tracking-wider flex items-center gap-2">
                                <Clock size={14} /> Booking Notice (Hours)
                            </label>
                            <input
                                type="number"
                                id="booking-notice-hours"
                                name="bookingNoticeHours"
                                value={formData.bookingNoticeHours}
                                onChange={handleChange}
                                placeholder="24"
                                autoComplete="off"
                                className="w-full py-2 px-3 bg-black/40 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                            />
                        </div>

                        {formData.requiresDownpayment && (
                            <div className="space-y-2 animate-fadeIn">
                                <label htmlFor="downpayment-rate" className="text-xs font-bold text-gray-400 tracking-wider flex items-center gap-2">
                                    <DollarSign size={14} /> Downpayment Rate (%)
                                </label>
                                <input
                                    type="number"
                                    id="downpayment-rate"
                                    name="downpaymentPercentage"
                                    value={formData.downpaymentPercentage}
                                    onChange={handleChange}
                                    placeholder="50"
                                    autoComplete="off"
                                    className="w-full py-2 px-3 bg-black/40 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-4">
                <div className="text-xs font-bold text-white tracking-wider uppercase flex items-center gap-2">
                    <Wrench size={14} className="text-primary" /> Rental & Driver Hire Settings
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label htmlFor="is-car-rental" className="flex items-center gap-3 cursor-pointer p-3 bg-black/20 border border-white/5 rounded-xl hover:bg-black/30 transition-all select-none">
                        <input
                            id="is-car-rental"
                            type="checkbox"
                            name="isCarRental"
                            checked={formData.isCarRental}
                            onChange={handleChange}
                            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary bg-black/40"
                        />
                        <div className="flex flex-col">
                            <span className="text-sm font-semibold text-white">Car Rental Service</span>
                            <span className="text-xs text-gray-500">Enable car renting options for this service</span>
                        </div>
                    </label>

                    <label htmlFor="is-driver-hire" className="flex items-center gap-3 cursor-pointer p-3 bg-black/20 border border-white/5 rounded-xl hover:bg-black/30 transition-all select-none">
                        <input
                            id="is-driver-hire"
                            type="checkbox"
                            name="isDriverHire"
                            checked={formData.isDriverHire}
                            onChange={handleChange}
                            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary bg-black/40"
                        />
                        <div className="flex flex-col">
                            <span className="text-sm font-semibold text-white">Driver Hire Service</span>
                            <span className="text-xs text-gray-500">Enable driver hire settings for this service</span>
                        </div>
                    </label>
                </div>

                {formData.isCarRental && (
                    <div className="p-4 rounded-xl border border-white/5 bg-black/20 space-y-4 animate-fadeIn">
                        <div className="text-xs font-bold text-gray-400 tracking-wider uppercase">Car Rental Options</div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="car-rental-class" className="text-xs font-bold text-gray-400 tracking-wider">Vehicle Class</label>
                                <div className="relative">
                                    <select
                                        id="car-rental-class"
                                        name="carRentalClass"
                                        value={formData.carRentalClass}
                                        onChange={handleChange}
                                        className="w-full py-2 px-3 bg-black/40 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all appearance-none pr-10"
                                    >
                                        <option value="Sedan">Sedan</option>
                                        <option value="SUV">SUV</option>
                                        <option value="Van">Van</option>
                                        <option value="Hatchback">Hatchback</option>
                                        <option value="Pickup">Pickup</option>
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                        <ChevronDown size={18} />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="car-rental-transmission" className="text-xs font-bold text-gray-400 tracking-wider">Transmission</label>
                                <div className="relative">
                                    <select
                                        id="car-rental-transmission"
                                        name="carRentalTransmission"
                                        value={formData.carRentalTransmission}
                                        onChange={handleChange}
                                        className="w-full py-2 px-3 bg-black/40 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all appearance-none pr-10"
                                    >
                                        <option value="Automatic">Automatic</option>
                                        <option value="Manual">Manual</option>
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                        <ChevronDown size={18} />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="car-rental-fuel" className="text-xs font-bold text-gray-400 tracking-wider">Fuel Policy</label>
                                <div className="relative">
                                    <select
                                        id="car-rental-fuel"
                                        name="carRentalFuel"
                                        value={formData.carRentalFuel}
                                        onChange={handleChange}
                                        className="w-full py-2 px-3 bg-black/40 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all appearance-none pr-10"
                                    >
                                        <option value="Full to Full">Full to Full</option>
                                        <option value="Same to Same">Same to Same</option>
                                        <option value="Free Fuel">Free Fuel</option>
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                        <ChevronDown size={18} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {formData.isDriverHire && (
                    <div className="p-4 rounded-xl border border-white/5 bg-black/20 space-y-4 animate-fadeIn">
                        <div className="text-xs font-bold text-gray-400 tracking-wider uppercase">Driver Hire Options</div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="driver-license-type" className="text-xs font-bold text-gray-400 tracking-wider">License Type Required</label>
                                <div className="relative">
                                    <select
                                        id="driver-license-type"
                                        name="driverLicenseType"
                                        value={formData.driverLicenseType}
                                        onChange={handleChange}
                                        className="w-full py-2 px-3 bg-black/40 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all appearance-none pr-10"
                                    >
                                        <option value="Professional">Professional</option>
                                        <option value="Non-Professional">Non-Professional</option>
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                        <ChevronDown size={18} />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="driver-experience" className="text-xs font-bold text-gray-400 tracking-wider">Required Experience</label>
                                <div className="relative">
                                    <select
                                        id="driver-experience"
                                        name="driverExperience"
                                        value={formData.driverExperience}
                                        onChange={handleChange}
                                        className="w-full py-2 px-3 bg-black/40 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all appearance-none pr-10"
                                    >
                                        <option value="1-2 years">1-2 years</option>
                                        <option value="3-5 years">3-5 years</option>
                                        <option value="5+ years">5+ years</option>
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                        <ChevronDown size={18} />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="driver-geo-limits" className="text-xs font-bold text-gray-400 tracking-wider">Geographic Limits</label>
                                <div className="relative">
                                    <select
                                        id="driver-geo-limits"
                                        name="driverGeoLimits"
                                        value={formData.driverGeoLimits}
                                        onChange={handleChange}
                                        className="w-full py-2 px-3 bg-black/40 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all appearance-none pr-10"
                                    >
                                        <option value="Within City">Within City</option>
                                        <option value="Province Wide">Province Wide</option>
                                        <option value="Nationwide">Nationwide</option>
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                        <ChevronDown size={18} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-6 py-3 rounded-xl bg-white/5 text-gray-400 font-bold hover:bg-white/10 hover:text-white transition-all"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isSaveDisabled}
                    className="px-8 py-3 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:grayscale disabled:scale-100 flex items-center gap-2"
                >
                    {isUploading ? <Spinner size="sm" color="text-white" /> : <Check size={18} />}
                    {service ? 'Update Service' : 'Create Service'}
                </button>
            </div>
        </form>
    );
};

const PartForm: React.FC<{ part?: Part; onSave: (part: any) => void; onCancel: () => void; categories: string[] }> = ({ part, onSave, onCancel, categories }) => {
    const { db, updateSettings } = useDatabase();
    const defaultParts = ['Tires', 'Engine', 'Brakes', 'Filters', 'Suspension', 'Electrical', 'Tools'];

    // Realtime synced categories with fallback default list
    const activeCategories = useMemo(() => {
        const list = (db?.settings?.partCategories || categories).filter(c => c !== 'all');
        return list.length > 0 ? list : defaultParts;
    }, [db?.settings?.partCategories, categories]);

    const [formData, setFormData] = useState({ 
        id: part?.id, 
        name: part?.name || '', 
        description: part?.description || '', 
        price: part?.price ?? '', 
        salesPrice: part?.salesPrice ?? '', 
        category: part?.category || (activeCategories[0] || ''), 
        sku: part?.sku || '', 
        imageUrl: part?.imageUrls?.[0] || '', 
        stock: part?.stock ?? '', 
        brand: part?.brand || '' 
    });

    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [isUploading, setIsUploading] = useState(false);
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');

    const validate = (data = formData) => {
        const newErrors: { [key: string]: string } = {};
        if (!data.name.trim()) newErrors.name = "Part name is required.";
        if (data.price === '' || Number(data.price) < 0) newErrors.price = "Price is required.";
        if (data.salesPrice !== '' && Number(data.salesPrice) >= Number(data.price)) newErrors.salesPrice = "Sale must be lower than price.";
        if (data.stock === '' || Number(data.stock) < 0) newErrors.stock = "Stock is required.";
        if (!data.category.trim()) newErrors.category = "Category is required.";
        if (!data.sku.trim()) newErrors.sku = "SKU is required.";
        if (!data.imageUrl) newErrors.imageUrl = "Image is required.";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const newData = { ...formData, [name]: value };
        setFormData(newData);
        if (errors[name]) validate(newData);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                setIsUploading(true);
                const downloadURL = await storageService.uploadFile(`catalog/parts/${Date.now()}_${file.name}`, file);
                const newData = { ...formData, imageUrl: downloadURL };
                setFormData(newData);
                validate(newData);
            } catch (err) {
                console.error("Part image upload failed:", err);
                setErrors(prev => ({ ...prev, imageUrl: 'Failed to upload image.' }));
            } finally {
                setIsUploading(false);
            }
        }
    };

    const handleQuickAddCategory = async () => {
        const trimmed = newCategoryName.trim();
        if (!trimmed) return;

        const exists = activeCategories.some(c => c.toLowerCase() === trimmed.toLowerCase());
        if (exists) {
            const existingName = activeCategories.find(c => c.toLowerCase() === trimmed.toLowerCase()) || trimmed;
            const newData = { ...formData, category: existingName };
            setFormData(newData);
            setIsAddingCategory(false);
            setNewCategoryName('');
            validate(newData);
            return;
        }

        const currentSettingsCategories = db?.settings?.partCategories || [...defaultParts];
        const updated = [...currentSettingsCategories, trimmed];
        try {
            await updateSettings({ partCategories: updated });
            const newData = { ...formData, category: trimmed };
            setFormData(newData);
            setIsAddingCategory(false);
            setNewCategoryName('');
            validate(newData);
        } catch (err) {
            console.error("Failed to quick add part category:", err);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            const { imageUrl, ...rest } = formData;
            onSave({ ...rest, price: Number(formData.price), salesPrice: formData.salesPrice ? Number(formData.salesPrice) : undefined, stock: Number(formData.stock), imageUrls: [imageUrl] });
        }
    };

    const isSaveDisabled = !formData.name || formData.price === '' || formData.stock === '' || !formData.category || !formData.sku || !formData.imageUrl || isUploading;

    return (
        <form onSubmit={handleSubmit} className="space-y-6 animate-fadeIn" noValidate>
            {/* Header Image Upload */}
            <div className="relative group">
                <div className="w-full h-48 rounded-2xl bg-black/40 border-2 border-dashed border-white/10 overflow-hidden flex items-center justify-center transition-all group-hover:border-primary/50">
                    {isUploading ? (
                        <div className="text-center space-y-2">
                            <Spinner size="md" color="text-primary" />
                            <p className="text-sm text-gray-500 font-medium">Uploading...</p>
                        </div>
                    ) : formData.imageUrl ? (
                        <div className="relative w-full h-full">
                            <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Camera className="text-white" size={32} />
                            </div>
                        </div>
                    ) : (
                        <div className="text-center space-y-2">
                            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                                <ImageIcon className="text-gray-500" size={24} />
                            </div>
                            <p className="text-sm text-gray-500 font-medium">Click to upload part image</p>
                        </div>
                    )}
                    <input
                        id="part-image"
                        name="partImage"
                        type="file"
                        onChange={handleFileChange}
                        accept="image/*"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                </div>
                {errors.imageUrl && <p className="text-red-400 text-xs mt-2 flex items-center gap-1"><X size={12} /> {errors.imageUrl}</p>}
            </div>

            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label htmlFor="part-name" className="text-xs font-bold text-gray-400  tracking-wider flex items-center gap-2">
                            <Package size={14} /> Part Name
                        </label>
                        <input
                            type="text"
                            id="part-name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="e.g. Premium Brake Pads"
                            autoComplete="off"
                            className={`w-full py-2 px-3 bg-black/40 border rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-primary focus:border-transparent transition-all ${errors.name ? 'border-red-500/50' : 'border-white/10'}`}
                        />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="part-sku" className="text-xs font-bold text-gray-400  tracking-wider flex items-center gap-2">
                            <Tag size={14} /> SKU
                        </label>
                        <input
                            type="text"
                            id="part-sku"
                            name="sku"
                            value={formData.sku}
                            onChange={handleChange}
                            placeholder="SKU-XXXX-X"
                            autoComplete="off"
                            className={`w-full py-2 px-3 bg-black/40 border rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-primary focus:border-transparent transition-all ${errors.sku ? 'border-red-500/50' : 'border-white/10'}`}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label htmlFor="part-category" className="text-xs font-bold text-gray-400 tracking-wider flex items-center gap-2">
                                <Package size={14} /> Category
                            </label>
                            {!isAddingCategory ? (
                                <button
                                    type="button"
                                    onClick={() => setIsAddingCategory(true)}
                                    className="text-[10px] font-black text-primary hover:text-orange-400 transition-colors uppercase tracking-wider flex items-center gap-0.5"
                                >
                                    <Plus size={10} /> Add Category
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setIsAddingCategory(false)}
                                    className="text-[10px] font-black text-gray-500 hover:text-gray-400 transition-colors uppercase tracking-wider"
                                >
                                    Cancel
                                </button>
                            )}
                        </div>

                        {!isAddingCategory ? (
                            <div className="relative">
                                <select
                                    id="part-category"
                                    name="category"
                                    value={formData.category}
                                    onChange={handleChange}
                                    className={`w-full py-2 px-3 bg-black/40 border rounded-xl text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all appearance-none pr-10 ${errors.category ? 'border-red-500/50' : 'border-white/10'}`}
                                >
                                    <option value="" disabled>Select Category</option>
                                    {activeCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                    <ChevronDown size={18} />
                                </div>
                            </div>
                        ) : (
                            <div className="flex gap-2 animate-fadeIn">
                                <input
                                    type="text"
                                    id="part-new-category"
                                    name="newPartCategoryName"
                                    value={newCategoryName}
                                    onChange={e => setNewCategoryName(e.target.value)}
                                    placeholder="Enter new category name..."
                                    className="flex-grow py-2 px-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-xs"
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleQuickAddCategory();
                                        }
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={handleQuickAddCategory}
                                    className="bg-primary hover:bg-orange-600 text-white px-4 rounded-xl transition-all flex items-center justify-center active:scale-95"
                                >
                                    <Check size={18} />
                                </button>
                            </div>
                        )}
                        {errors.category && <p className="text-red-400 text-xs mt-1">{errors.category}</p>}
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="part-brand" className="text-xs font-bold text-gray-400  tracking-wider flex items-center gap-2">
                            <Check size={14} /> Brand/Manufacturer
                        </label>
                        <input
                            type="text"
                            id="part-brand"
                            name="brand"
                            value={formData.brand}
                            onChange={handleChange}
                            placeholder="e.g. Brembo, Bosch"
                            autoComplete="off"
                            className="w-full py-2 px-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label htmlFor="part-description" className="text-xs font-bold text-gray-400  tracking-wider flex items-center gap-2">
                        <Package size={14} /> Description
                    </label>
                    <textarea
                        id="part-description"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="Key features, compatibility, and specifications..."
                        rows={2}
                        className="w-full py-2 px-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-primary focus:border-transparent resize-none transition-all"
                    />
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <label htmlFor="part-price" className="text-xs font-bold text-gray-400  tracking-wider flex items-center gap-2">
                            <DollarSign size={14} /> Price (₱)
                        </label>
                        <input
                            type="number"
                            id="part-price"
                            name="price"
                            value={formData.price}
                            onChange={handleChange}
                            placeholder="0.00"
                            autoComplete="off"
                            className={`w-full py-2 px-3 bg-black/40 border rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-primary focus:border-transparent transition-all ${errors.price ? 'border-red-500/50' : 'border-white/10'}`}
                        />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="part-sale-price" className="text-xs font-bold text-orange-400  tracking-wider flex items-center gap-2">
                            <TrendingUp size={14} /> Sale (₱)
                        </label>
                        <input
                            type="number"
                            id="part-sale-price"
                            name="salesPrice"
                            value={formData.salesPrice}
                            onChange={handleChange}
                            placeholder="Optional"
                            autoComplete="off"
                            className={`w-full py-2 px-3 bg-black/40 border rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all ${errors.salesPrice ? 'border-red-500/50' : 'border-white/10'}`}
                        />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="part-stock" className="text-xs font-bold text-gray-400  tracking-wider flex items-center gap-2">
                            <Package size={14} /> Stock
                        </label>
                        <input
                            type="number"
                            id="part-stock"
                            name="stock"
                            value={formData.stock}
                            onChange={handleChange}
                            placeholder="Qty"
                            autoComplete="off"
                            className={`w-full py-2 px-3 bg-black/40 border rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-primary focus:border-transparent transition-all ${errors.stock ? 'border-red-500/50' : 'border-white/10'}`}
                        />
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-6 py-3 rounded-xl bg-white/5 text-gray-400 font-bold hover:bg-white/10 hover:text-white transition-all"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isSaveDisabled}
                    className="px-8 py-3 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:grayscale disabled:scale-100 flex items-center gap-2"
                >
                    {isUploading ? <Spinner size="sm" color="text-white" /> : <Check size={18} />}
                    {part ? 'Update Part' : 'Create Part'}
                </button>
            </div>
        </form>
    );
};

const ItemCard: React.FC<{ item: Service | Part, onEdit: () => void, onDelete: () => void }> = ({ item, onEdit, onDelete }) => {
    const hasSalesPrice = 'salesPrice' in item && item.salesPrice && item.salesPrice > 0;
    const imageUrl = 'sku' in item ? item.imageUrls[0] : item.imageUrl;
    const isLowStock = 'stock' in item && item.stock < 10;

    return (
        <div className="bg-[#121212]/60 backdrop-blur-xl rounded-[2rem] overflow-hidden group relative flex flex-col border border-white/10 hover:border-primary/50 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1">
            <div className="relative h-40 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-[#121212] to-transparent opacity-60 z-10" />
                <img 
                    src={imageUrl} 
                    alt={item.name} 
                    className="h-full w-full object-cover transform group-hover:scale-110 transition-transform duration-700" 
                    onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        const name = item.name.toLowerCase();
                        let fallback = 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=400&q=80'; // default car repair
                        if ('sku' in item) {
                            fallback = 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=400&q=80'; // part default
                        } else {
                            if (name.includes('oil')) {
                                fallback = 'https://images.unsplash.com/photo-1517524206127-48bbd363f3d7?auto=format&fit=crop&w=400&q=80';
                            } else if (name.includes('brake')) {
                                fallback = 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=400&q=80';
                            } else if (name.includes('diagnost') || name.includes('check')) {
                                fallback = 'https://images.unsplash.com/photo-1507136566006-cfc505b114fc?auto=format&fit=crop&w=400&q=80';
                            } else if (name.includes('tire') || name.includes('wheel')) {
                                fallback = 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=400&q=80';
                            } else if (name.includes('rent')) {
                                fallback = 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=400&q=80';
                            }
                        }
                        target.src = fallback;
                    }}
                />

                {isLowStock && (
                    <span className="absolute top-4 left-4 px-3 py-1 bg-red-500 text-white text-[10px] font-black  tracking-widest rounded-full z-20 shadow-lg shadow-red-500/20">
                        Low Stock
                    </span>
                )}

                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 z-20">
                    <button onClick={onEdit} className="h-10 w-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-blue-500 transition-colors border border-white/10 text-white">
                        <Edit size={16} />
                    </button>
                    <button onClick={onDelete} className="h-10 w-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-red-500 transition-colors border border-white/10 text-white">
                        <Trash2 size={16} />
                    </button>
                </div>

                <div className="absolute bottom-4 left-4 z-20">
                    <span className="inline-block px-3 py-1 bg-primary/20 border border-primary/30 text-primary text-[9px] font-black  tracking-widest rounded-lg mb-2 backdrop-blur-md">
                        {item.category}
                    </span>
                </div>
            </div>

            <div className="p-4 flex-grow flex flex-col relative">
                <h3 className="font-bold text-white text-sm mb-2 leading-tight group-hover:text-primary transition-colors">{item.name}</h3>
                <p className="text-xs text-gray-400 mb-2 line-clamp-1">{item.description}</p>

                <div className="mt-auto pt-4 border-t border-white/5">
                    <div className="flex items-end justify-between">
                        <div>
                            {hasSalesPrice ? (
                                <div className="flex flex-col">
                                    <span className="text-gray-500 text-xs font-bold line-through">₱{item.price.toLocaleString()}</span>
                                    <span className="text-base font-black text-white">₱{(item as Part).salesPrice!.toLocaleString()}</span>
                                </div>
                            ) : (
                                <span className="text-base font-black text-white">₱{item.price.toLocaleString()}</span>
                            )}
                        </div>

                        {'sku' in item ? (
                            <div className="text-right">
                                <p className="text-[10px] text-gray-500 font-bold  tracking-widest mb-1">Stock Level</p>
                                <span className={`text-sm font-black ${isLowStock ? 'text-red-500' : 'text-green-500'}`}>
                                    {item.stock} Units
                                </span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-gray-400 bg-white/5 px-3 py-1 rounded-lg">
                                <Clock size={14} />
                                <span className="text-xs font-bold">{item.estimatedTime}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── CUSTOM CHIP MULTI-SELECT DROPDOWN ────────────────────────────────────────
interface MultiSelectDropdownProps {
    label: string;
    items: string[];
    onChange: (items: string[]) => void;
    placeholder: string;
    presets: string[];
}

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({ label, items, onChange, placeholder, presets }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editingValue, setEditingValue] = useState('');

    const toggleOpen = () => setIsOpen(p => !isOpen);
    const addItem = (item: string) => {
        const trimmed = item.trim();
        if (trimmed && !items.includes(trimmed)) {
            onChange([...items, trimmed]);
        }
        setInputValue('');
    };

    const deleteItem = (index: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const next = [...items];
        next.splice(index, 1);
        onChange(next);
    };

    const startEdit = (index: number, value: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingIndex(index);
        setEditingValue(value);
    };

    const saveEdit = (index: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const trimmed = editingValue.trim();
        if (trimmed) {
            const next = [...items];
            next[index] = trimmed;
            onChange(next);
        }
        setEditingIndex(null);
    };

    const cancelEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingIndex(null);
    };

    return (
        <div className="space-y-1.5 relative">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</label>
            
            {/* Field Container (Scrollable horizontally/vertically when chips populate) */}
            <div 
                onClick={toggleOpen}
                className="max-h-24 overflow-y-auto w-full p-1.5 bg-white/5 border border-white/10 rounded-lg cursor-pointer flex flex-wrap gap-1 items-center transition-all hover:bg-white/10 custom-scrollbar"
            >
                {items.length === 0 ? (
                    <span className="text-gray-500 text-xs px-2 py-1">{placeholder}</span>
                ) : (
                    items.map((item, idx) => (
                        <div 
                            key={idx} 
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 bg-primary/20 border border-primary/30 rounded-md px-2 py-0.5 text-xs text-primary"
                        >
                            {editingIndex === idx ? (
                                <input
                                    type="text"
                                    value={editingValue}
                                    onChange={(e) => setEditingValue(e.target.value)}
                                    className="bg-transparent text-white outline-none w-20 text-xs"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveEdit(idx, e as any);
                                        if (e.key === 'Escape') cancelEdit(e as any);
                                    }}
                                />
                            ) : (
                                <span className="font-semibold text-white">{item}</span>
                            )}
                            
                            <div className="flex items-center gap-0.5 ml-1">
                                {editingIndex === idx ? (
                                    <>
                                        <Check size={12} className="text-green-400 cursor-pointer hover:text-green-300" onClick={(e) => saveEdit(idx, e)} />
                                        <X size={12} className="text-red-400 cursor-pointer hover:text-red-300" onClick={cancelEdit} />
                                    </>
                                ) : (
                                    <>
                                        <Edit size={10} className="text-gray-400 cursor-pointer hover:text-white" onClick={(e) => startEdit(idx, item, e)} />
                                        <X size={12} className="text-gray-400 cursor-pointer hover:text-red-400" onClick={(e) => deleteItem(idx, e)} />
                                    </>
                                )}
                            </div>
                        </div>
                    ))
                )}
                
                <ChevronDown size={14} className="text-gray-500 ml-auto mr-1 flex-shrink-0" />
            </div>

            {/* Dropdown Options */}
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute left-0 right-0 top-full mt-1 bg-[#1A1A1A] border border-white/10 rounded-lg p-2.5 z-50 shadow-2xl max-h-56 overflow-y-auto space-y-2">
                        {/* Custom Add Input */}
                        <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder="Add custom item..."
                                className="flex-1 bg-white/5 border border-white/10 rounded px-2.5 py-1 text-xs text-white placeholder-gray-600 outline-none focus:border-primary/50"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        addItem(inputValue);
                                    }
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => addItem(inputValue)}
                                className="bg-primary hover:bg-orange-600 text-white rounded px-2 text-xs font-bold transition-all"
                            >
                                Add
                            </button>
                        </div>
                        
                        {/* Preset Presets List */}
                        <div className="pt-1.5 border-t border-white/5 space-y-1">
                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-1">Presets</p>
                            <div className="flex flex-wrap gap-1">
                                {presets.map(p => {
                                    const selected = items.includes(p);
                                    return (
                                        <button
                                            type="button"
                                            key={p}
                                            disabled={selected}
                                            onClick={() => addItem(p)}
                                            className={`text-[10px] px-2 py-0.5 rounded transition-all ${selected ? 'bg-white/5 text-gray-600 cursor-not-allowed' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
                                        >
                                            + {p}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

// ─── RENTAL CAR FORM (inline in catalog) ─────────────────────────────────────
const RentalCarForm: React.FC<{ car?: RentalCar; onSave: (car: any) => void; onCancel: () => void }> = ({ car, onSave, onCancel }) => {
    const [form, setForm] = useState({
        make: car?.make || '', model: car?.model || '', year: car?.year || new Date().getFullYear(),
        type: car?.type || 'Sedan', seats: car?.seats || 5, pricePerDay: car?.pricePerDay || '',
        transmission: car?.transmission || 'Automatic', fuelPolicy: car?.fuelPolicy || 'Full to Full',
        color: car?.color || '', plateNumber: car?.plateNumber || '', isAvailable: car?.isAvailable ?? true,
        imageUrl: car?.imageUrl || '', description: car?.description || '',
    });
    const [features, setFeatures] = useState<string[]>(car?.features || []);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [uploading, setUploading] = useState(false);

    const carPresets = ['GPS', 'Bluetooth', 'Air Conditioning', 'Leather Seats', 'USB Port', 'Backup Camera', '4WD', 'Sunroof', 'Roof Rack', 'Spacious Cargo', 'Child Seats Available'];

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.make.trim()) e.make = 'Make is required.';
        if (!form.model.trim()) e.model = 'Model is required.';
        if (!form.pricePerDay || Number(form.pricePerDay) <= 0) e.pricePerDay = 'Price per day required.';
        if (!form.imageUrl) e.imageUrl = 'Image is required.';
        return e;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
        setForm(p => ({ ...p, [name]: val }));
        if (errors[name]) setErrors(p => { const n = { ...p }; delete n[name]; return n; });
    };

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            setUploading(true);
            const url = await storageService.uploadFile(`catalog/rentals/${Date.now()}_${file.name}`, file);
            setForm(p => ({ ...p, imageUrl: url }));
            setErrors(p => { const n = { ...p }; delete n.imageUrl; return n; });
        } catch { setErrors(p => ({ ...p, imageUrl: 'Upload failed.' })); }
        finally { setUploading(false); }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const v = validate(); setErrors(v);
        if (Object.keys(v).length > 0) return;
        onSave({ ...form, year: Number(form.year), seats: Number(form.seats), pricePerDay: Number(form.pricePerDay),
            features,
            ...(car?.id ? { id: car.id } : {}) });
    };

    const inp = (f: string) => `w-full p-2 bg-white/5 border rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-primary/60 transition-all text-xs ${errors[f] ? 'border-red-500' : 'border-white/10'}`;
    const lbl = 'block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1';

    return (
        <form onSubmit={handleSubmit} className="space-y-3.5 animate-fadeIn">
            {/* Image upload */}
            <div className="relative group cursor-pointer" onClick={() => document.getElementById('car-img-upload')?.click()}>
                <div className={`w-full h-32 rounded-xl border border-dashed overflow-hidden flex items-center justify-center transition-all ${errors.imageUrl ? 'border-red-500' : 'border-white/10 group-hover:border-primary/50'}`}>
                    {uploading ? <div className="text-center"><Spinner size="sm" color="text-primary" /><p className="text-[10px] text-gray-500 mt-1">Uploading...</p></div>
                        : form.imageUrl ? <div className="relative w-full h-full"><img src={form.imageUrl} alt="Preview" className="w-full h-full object-cover" /><div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><Camera size={20} className="text-white" /></div></div>
                        : <div className="text-center space-y-1"><Car size={24} className="text-gray-600 mx-auto" /><p className="text-[10px] text-gray-500">Click to upload car photo</p></div>}
                </div>
                <input id="car-img-upload" type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </div>
            {errors.imageUrl && <p className="text-red-400 text-xs -mt-2">{errors.imageUrl}</p>}

            <MultiSelectDropdown
                label="Features"
                items={features}
                onChange={setFeatures}
                placeholder="Select or add vehicle features..."
                presets={carPresets}
            />

            <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Make / Brand *</label><input type="text" id="car-make" name="make" value={form.make} onChange={handleChange} placeholder="e.g. Toyota" className={inp('make')} />{errors.make && <p className="text-red-400 text-xs mt-1">{errors.make}</p>}</div>
                <div><label className={lbl}>Model *</label><input type="text" id="car-model" name="model" value={form.model} onChange={handleChange} placeholder="e.g. Vios" className={inp('model')} />{errors.model && <p className="text-red-400 text-xs mt-1">{errors.model}</p>}</div>
            </div>
            <div className="grid grid-cols-3 gap-3">
                <div><label className={lbl}>Year</label><input type="number" id="car-year" name="year" value={form.year} onChange={handleChange} min="1990" max="2030" className={inp('year')} /></div>
                <div><label className={lbl}>Type</label><select id="car-type" name="type" value={form.type} onChange={handleChange} className={inp('type')}><option>Sedan</option><option>SUV</option><option>Van</option><option>Hatchback</option><option>Pickup</option><option>Coupe</option></select></div>
                <div><label className={lbl}>Seats</label><input type="number" id="car-seats" name="seats" value={form.seats} onChange={handleChange} min="2" max="20" className={inp('seats')} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
                <div><label className={lbl}>Price / Day (₱) *</label><input type="number" id="car-pricePerDay" name="pricePerDay" value={form.pricePerDay} onChange={handleChange} placeholder="0.00" min="0" className={inp('pricePerDay')} />{errors.pricePerDay && <p className="text-red-400 text-xs mt-1">{errors.pricePerDay}</p>}</div>
                <div><label className={lbl}>Transmission</label><select id="car-transmission" name="transmission" value={form.transmission} onChange={handleChange} className={inp('transmission')}><option>Automatic</option><option>Manual</option></select></div>
                <div><label className={lbl}>Fuel Policy</label><select id="car-fuelPolicy" name="fuelPolicy" value={form.fuelPolicy} onChange={handleChange} className={inp('fuelPolicy')}><option>Full to Full</option><option>Same to Same</option><option>Free Fuel</option></select></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
                <div><label className={lbl}>Color</label><input type="text" id="car-color" name="color" value={form.color} onChange={handleChange} placeholder="e.g. White" className={inp('color')} /></div>
                <div><label className={lbl}>Plate Number</label><input type="text" id="car-plateNumber" name="plateNumber" value={form.plateNumber} onChange={handleChange} placeholder="ABC-1234" className={inp('plateNumber')} /></div>
                <div className="flex flex-col justify-end pb-0.5"><label className={lbl}>Availability</label>
                    <div className="flex items-center gap-2 mt-1 cursor-pointer" onClick={() => setForm(p => ({ ...p, isAvailable: !p.isAvailable }))}>
                        <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.isAvailable ? 'bg-green-500' : 'bg-gray-600'}`}><span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${form.isAvailable ? 'translate-x-5' : 'translate-x-0.5'}`} /></div>
                        <span className="text-xs text-white">{form.isAvailable ? 'Available' : 'Unavailable'}</span>
                    </div>
                </div>
            </div>
            <div><label className={lbl}>Description</label><textarea id="car-description" name="description" value={form.description} onChange={handleChange} rows={2} placeholder="Brief description of the vehicle..." className={inp('description')} /></div>
            
            <div className="flex justify-end gap-2.5 pt-2.5 border-t border-white/5">
                <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 font-bold transition-all text-xs">Cancel</button>
                <button type="submit" disabled={uploading} className="px-5 py-2 rounded-xl bg-primary text-white font-black hover:bg-orange-600 transition-all disabled:opacity-50 flex items-center gap-1.5 text-xs shadow-lg shadow-primary/20">
                    <Car size={14} />{car ? 'Update Car' : 'Add to Fleet'}
                </button>
            </div>
        </form>
    );
};

// ─── HIRE DRIVER FORM (inline in catalog) ─────────────────────────────────────
const HireDriverForm: React.FC<{ driver?: HireDriver; onSave: (d: any) => void; onCancel: () => void }> = ({ driver, onSave, onCancel }) => {
    const [form, setForm] = useState({
        name: driver?.name || '', phone: driver?.phone || '', licenseType: driver?.licenseType || 'Professional',
        licenseNumber: driver?.licenseNumber || '', experience: driver?.experience || '3-5 years',
        geoLimit: driver?.geoLimit || 'Within City', pricePerHour: driver?.pricePerHour || '',
        pricePerDay: driver?.pricePerDay || '', isAvailable: driver?.isAvailable ?? true,
        imageUrl: driver?.imageUrl || '', rating: driver?.rating || 5.0, totalTrips: driver?.totalTrips || 0,
        description: driver?.description || '',
    });
    const [languages, setLanguages] = useState<string[]>(driver?.languages || ['Filipino', 'English']);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [uploading, setUploading] = useState(false);

    const languagePresets = ['Filipino', 'English', 'Cebuano', 'Ilocano', 'Hiligaynon', 'Spanish', 'Mandarin', 'Japanese'];

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.name.trim()) e.name = 'Name is required.';
        if (!form.phone.trim()) e.phone = 'Phone is required.';
        if (!form.pricePerHour || Number(form.pricePerHour) <= 0) e.pricePerHour = 'Hourly rate required.';
        if (!form.pricePerDay || Number(form.pricePerDay) <= 0) e.pricePerDay = 'Daily rate required.';
        if (!form.imageUrl) e.imageUrl = 'Profile photo is required.';
        return e;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
        setForm(p => ({ ...p, [name]: val }));
        if (errors[name]) setErrors(p => { const n = { ...p }; delete n[name]; return n; });
    };

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            setUploading(true);
            const url = await storageService.uploadFile(`catalog/drivers/${Date.now()}_${file.name}`, file);
            setForm(p => ({ ...p, imageUrl: url }));
            setErrors(p => { const n = { ...p }; delete n.imageUrl; return n; });
        } catch { setErrors(p => ({ ...p, imageUrl: 'Upload failed.' })); }
        finally { setUploading(false); }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const v = validate(); setErrors(v);
        if (Object.keys(v).length > 0) return;
        onSave({ ...form, pricePerHour: Number(form.pricePerHour), pricePerDay: Number(form.pricePerDay),
            rating: Number(form.rating), totalTrips: Number(form.totalTrips),
            languages: [],
            ...(driver?.id ? { id: driver.id } : {}) });
    };

    const inp = (f: string) => `w-full p-2 bg-white/5 border rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-primary/60 transition-all text-xs ${errors[f] ? 'border-red-500' : 'border-white/10'}`;
    const lbl = 'block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1';

    return (
        <form onSubmit={handleSubmit} className="space-y-3.5 animate-fadeIn">
            {/* Photo upload */}
            <div className="flex items-center gap-4">
                <div className="relative group cursor-pointer flex-shrink-0" onClick={() => document.getElementById('driver-img-upload')?.click()}>
                    <div className={`w-16 h-16 rounded-full border border-dashed overflow-hidden flex items-center justify-center transition-all ${errors.imageUrl ? 'border-red-500' : 'border-white/10 group-hover:border-primary/50'}`}>
                        {uploading ? <Spinner size="sm" color="text-primary" />
                            : form.imageUrl ? <div className="relative w-full h-full"><img src={form.imageUrl} alt="Preview" className="w-full h-full object-cover" /><div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full"><Camera size={14} className="text-white" /></div></div>
                            : <UserCheck size={20} className="text-gray-600" />}
                    </div>
                    <input id="driver-img-upload" type="file" accept="image/*" className="hidden" onChange={handleFile} />
                </div>
                <div className="flex-1">
                    <p className="text-xs font-bold text-gray-400 mb-0.5">Profile Photo *</p>
                    <p className="text-[10px] text-gray-600">Click to upload photo.</p>
                    {errors.imageUrl && <p className="text-red-400 text-xs mt-0.5">{errors.imageUrl}</p>}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Full Name *</label><input type="text" id="driver-name" name="name" value={form.name} onChange={handleChange} placeholder="Juan dela Cruz" className={inp('name')} />{errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}</div>
                <div><label className={lbl}>Phone Number *</label><input type="text" id="driver-phone" name="phone" value={form.phone} onChange={handleChange} placeholder="09xx-xxx-xxxx" className={inp('phone')} />{errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>License Type</label><select id="driver-licenseType" name="licenseType" value={form.licenseType} onChange={handleChange} className={inp('licenseType')}><option>Professional</option><option>Non-Professional</option><option>Restriction 1</option><option>Restriction 2</option><option>Restriction 3</option></select></div>
                <div><label className={lbl}>License Number</label><input type="text" id="driver-licenseNumber" name="licenseNumber" value={form.licenseNumber} onChange={handleChange} placeholder="License ID" className={inp('licenseNumber')} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Experience</label><select id="driver-experience" name="experience" value={form.experience} onChange={handleChange} className={inp('experience')}><option>Less than 1 year</option><option>1-2 years</option><option>3-5 years</option><option>5+ years</option><option>10+ years</option></select></div>
                <div><label className={lbl}>Geographic Coverage</label><select id="driver-geoLimit" name="geoLimit" value={form.geoLimit} onChange={handleChange} className={inp('geoLimit')}><option>Within City</option><option>Province Wide</option><option>Region Wide</option><option>Nationwide</option></select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Rate / Hour (₱) *</label><input type="number" id="driver-pricePerHour" name="pricePerHour" value={form.pricePerHour} onChange={handleChange} placeholder="0.00" min="0" className={inp('pricePerHour')} />{errors.pricePerHour && <p className="text-red-400 text-xs mt-1">{errors.pricePerHour}</p>}</div>
                <div><label className={lbl}>Rate / Day (₱) *</label><input type="number" id="driver-pricePerDay" name="pricePerDay" value={form.pricePerDay} onChange={handleChange} placeholder="0.00" min="0" className={inp('pricePerDay')} />{errors.pricePerDay && <p className="text-red-400 text-xs mt-1">{errors.pricePerDay}</p>}</div>
            </div>
            <div className="grid grid-cols-3 gap-3">
                <div><label className={lbl}>Rating (1-5)</label><input type="number" id="driver-rating" name="rating" value={form.rating} onChange={handleChange} min="1" max="5" step="0.1" className={inp('rating')} /></div>
                <div><label className={lbl}>Total Trips</label><input type="number" id="driver-totalTrips" name="totalTrips" value={form.totalTrips} onChange={handleChange} min="0" className={inp('totalTrips')} /></div>
                <div className="flex flex-col justify-end pb-0.5"><label className={lbl}>Status</label>
                    <div className="flex items-center gap-2 mt-1 cursor-pointer" onClick={() => setForm(p => ({ ...p, isAvailable: !p.isAvailable }))}>
                        <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.isAvailable ? 'bg-green-500' : 'bg-gray-600'}`}><span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${form.isAvailable ? 'translate-x-5' : 'translate-x-0.5'}`} /></div>
                        <span className="text-xs text-white">{form.isAvailable ? 'Available' : 'Not Available'}</span>
                    </div>
                </div>
            </div>
            <div><label className={lbl}>Bio / Description</label><textarea id="driver-description" name="description" value={form.description} onChange={handleChange} rows={2} placeholder="Brief driver intro..." className={inp('description')} /></div>
            
            <div className="flex justify-end gap-2.5 pt-2.5 border-t border-white/5">
                <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 font-bold transition-all text-xs">Cancel</button>
                <button type="submit" disabled={uploading} className="px-5 py-2 rounded-xl bg-primary text-white font-black hover:bg-orange-600 transition-all disabled:opacity-50 flex items-center gap-1.5 text-xs shadow-lg shadow-primary/20">
                    <UserCheck size={14} />{driver ? 'Update Driver' : 'Add Driver'}
                </button>
            </div>
        </form>
    );
};

const defaultLiaisonAgents: LiaisonStaff[] = [
    { id: 'liaison-juan', name: 'Juan Dela Cruz', phone: '09181234567', imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200', rating: 4.8, assignedBranches: ['lto-qc', 'lto-pasay'], assignedServices: ['Vehicle Registration Renewal', 'Transfer of Ownership'], isAvailable: true, description: 'Experienced Liaison Officer specializing in registration and license renewals.', totalJobs: 24 },
    { id: 'liaison-maria', name: 'Maria Santos', phone: '09182345678', imageUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200', rating: 4.9, assignedBranches: ['lto-makati', 'lto-pasay', 'lto-manila'], assignedServices: ['Vehicle Registration Renewal', 'Duplicate OR', 'Duplicate CR'], isAvailable: true, description: 'Efficient and professional, handling LTO documents with care.', totalJobs: 18 },
    { id: 'liaison-ramon', name: 'Ramon Valenzuela', phone: '09183456789', imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200', rating: 4.7, assignedBranches: ['lto-angeles', 'lto-pampanga', 'lto-dagupan'], assignedServices: ['Vehicle Registration Renewal', 'Lost Plate', 'Replacement Plate'], isAvailable: true, description: 'Dedicated officer with deep knowledge of LTO policies and procedures.', totalJobs: 15 },
    { id: 'liaison-sarah', name: 'Sarah Geronimo', phone: '09184567890', imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200', rating: 4.95, assignedBranches: ['lto-cebu', 'lto-mandaue', 'lto-lapulapu'], assignedServices: ['Vehicle Registration Renewal', 'Transfer of Ownership', 'Change Engine', 'Change Color'], isAvailable: true, description: 'Visayas regional coordinator, handles all document liaisons with premium efficiency.', totalJobs: 32 },
    { id: 'liaison-michael', name: 'Michael Dinglasan', phone: '09185678901', imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200', rating: 4.85, assignedBranches: ['lto-davao', 'lto-gensan'], assignedServices: ['Vehicle Registration Renewal', 'New Registration', 'Other'], isAvailable: true, description: 'Mindanao document handling specialist, fast processing speed and highly reliable.', totalJobs: 21 }
];

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const AdminCatalogScreen: React.FC = () => {
    const { db, addService, updateService, deleteService, addPart, updatePart, deletePart, addRentalCar, updateRentalCar, deleteRentalCar, addHireDriver, updateHireDriver, deleteHireDriver, loading } = useDatabase();
    const [activeTab, setActiveTab] = useState<'services' | 'parts' | 'rental-cars' | 'drivers' | 'liaison-agents'>('services');
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' }>({ key: 'name', direction: 'ascending' });
    const [isLiaisonModalOpen, setIsLiaisonModalOpen] = useState(false);
    const [editingLiaison, setEditingLiaison] = useState<LiaisonStaff | undefined>(undefined);
    const [viewingLiaison, setViewingLiaison] = useState<LiaisonStaff | undefined>(undefined);
    const [liaisonSearch, setLiaisonSearch] = useState('');

    const requestSort = (key: SortableKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key: SortableKeys) => {
        if (sortConfig.key !== key) return <ArrowUpDown size={14} className="text-gray-600" />;
        return sortConfig.direction === 'ascending' ? <ArrowUpDown size={14} className="text-primary rotate-180" /> : <ArrowUpDown size={14} className="text-primary" />;
    };
    const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<Service | undefined>(undefined);
    const [isPartModalOpen, setIsPartModalOpen] = useState(false);
    const [editingPart, setEditingPart] = useState<Part | undefined>(undefined);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    // Car & Driver modal state
    const [isCarModalOpen, setIsCarModalOpen] = useState(false);
    const [editingCar, setEditingCar] = useState<RentalCar | undefined>(undefined);
    const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
    const [editingDriver, setEditingDriver] = useState<HireDriver | undefined>(undefined);
    // Enhanced features
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
    const [carSearch, setCarSearch] = useState('');
    const [driverSearch, setDriverSearch] = useState('');

    useEffect(() => {
        // Outside click dropdown close disabled per user request
    }, []);

    const serviceCategories = useMemo(() => {
        const configured = db?.settings?.serviceCategories || [];
        const used = db?.services ? db.services.map(s => s.category).filter(Boolean) : [];
        const uniqueCategories = Array.from(new Set([...configured, ...used]));
        return ['all', ...uniqueCategories];
    }, [db]);

    const partCategories = useMemo(() => {
        const configured = db?.settings?.partCategories || [];
        const used = db?.parts ? db.parts.map(p => p.category).filter(Boolean) : [];
        const uniqueCategories = Array.from(new Set([...configured, ...used]));
        return ['all', ...uniqueCategories];
    }, [db]);

    const filteredServices = useMemo(() => {
        if (!db) return [];
        let filtered = db.services.filter(s =>
            (categoryFilter === 'all' || s.category === categoryFilter) &&
            ((s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (s.category || '').toLowerCase().includes(searchQuery.toLowerCase())) &&
            (statusFilter === 'all' || (statusFilter === 'active' ? s.isActive !== false : s.isActive === false))
        );

        filtered.sort((a, b) => {
            let aValue: any = a[sortConfig.key as keyof typeof a];
            let bValue: any = b[sortConfig.key as keyof typeof b];

            // Handle undefined or null values for sorting
            if (aValue === undefined || aValue === null) aValue = '';
            if (bValue === undefined || bValue === null) bValue = '';

            if (typeof aValue === 'string' && typeof bValue === 'string') {
                return sortConfig.direction === 'ascending' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
            }
            if (typeof aValue === 'number' && typeof bValue === 'number') {
                return sortConfig.direction === 'ascending' ? aValue - bValue : bValue - aValue;
            }
            // Fallback for mixed types or other cases
            if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });

        return filtered;
    }, [db, searchQuery, categoryFilter, sortConfig, statusFilter]);

    const filteredParts = useMemo(() => {
        if (!db) return [];
        let filtered = db.parts.filter(p =>
            (categoryFilter === 'all' || p.category === categoryFilter) &&
            ((p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (p.sku || '').toLowerCase().includes(searchQuery.toLowerCase())) &&
            (statusFilter === 'all' || (statusFilter === 'active' ? p.isActive !== false : p.isActive === false))
        );

        filtered.sort((a, b) => {
            let aValue: any = a[sortConfig.key as keyof typeof a];
            let bValue: any = b[sortConfig.key as keyof typeof b];

            // Handle undefined or null values for sorting
            if (aValue === undefined || aValue === null) aValue = '';
            if (bValue === undefined || bValue === null) bValue = '';

            if (typeof aValue === 'string' && typeof bValue === 'string') {
                return sortConfig.direction === 'ascending' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
            }
            if (typeof aValue === 'number' && typeof bValue === 'number') {
                return sortConfig.direction === 'ascending' ? aValue - bValue : bValue - aValue;
            }
            // Fallback for mixed types or other cases
            if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });

        return filtered;
    }, [db, searchQuery, categoryFilter, sortConfig, statusFilter]);

    const filteredCars = useMemo(() => {
        if (!db) return [];
        return (db.rentalCars || []).filter(c =>
            (c.make || '').toLowerCase().includes(carSearch.toLowerCase()) ||
            (c.model || '').toLowerCase().includes(carSearch.toLowerCase()) ||
            (c.plateNumber || '').toLowerCase().includes(carSearch.toLowerCase())
        );
    }, [db, carSearch]);

    const filteredDrivers = useMemo(() => {
        if (!db) return [];
        return (db.hireDrivers || []).filter(d =>
            (d.name || '').toLowerCase().includes(driverSearch.toLowerCase()) ||
            (d.phone || '').toLowerCase().includes(driverSearch.toLowerCase())
        );
    }, [db, driverSearch]);

    const liaisonAgentsList = useMemo(() => {
        if (!db) return [];
        return db.liaisonStaff && db.liaisonStaff.length > 0 ? db.liaisonStaff : defaultLiaisonAgents;
    }, [db]);

    const filteredLiaison = useMemo(() => {
        return liaisonAgentsList.filter(s =>
            (s.name || '').toLowerCase().includes(liaisonSearch.toLowerCase()) ||
            (s.phone || '').toLowerCase().includes(liaisonSearch.toLowerCase())
        );
    }, [liaisonAgentsList, liaisonSearch]);

    const stats = useMemo(() => {
        if (!db) return { totalServices: 0, totalParts: 0, totalValue: 0, lowStock: 0, totalCars: 0, availableCars: 0, totalDrivers: 0, availableDrivers: 0, totalLiaisonAgents: 0, availableLiaisonAgents: 0 };

        const totalServices = db.services.length;
        const totalParts = db.parts.length;
        const totalValue = db.parts.reduce((sum, part) => sum + (part.price * part.stock), 0);
        const lowStock = db.parts.filter(p => p.stock < 10).length;
        const totalCars = (db.rentalCars || []).length;
        const availableCars = (db.rentalCars || []).filter(c => c.isAvailable).length;
        const totalDrivers = (db.hireDrivers || []).length;
        const availableDrivers = (db.hireDrivers || []).filter(d => d.isAvailable).length;
        const totalLiaisonAgents = liaisonAgentsList.length;
        const availableLiaisonAgents = liaisonAgentsList.filter(s => s.isAvailable).length;

        return { totalServices, totalParts, totalValue, lowStock, totalCars, availableCars, totalDrivers, availableDrivers, totalLiaisonAgents, availableLiaisonAgents };
    }, [db, liaisonAgentsList]);

    // Export to CSV
    const exportToCSV = () => {
        const items = activeTab === 'services' ? filteredServices : filteredParts;
        const headers = activeTab === 'services'
            ? ['Name', 'Category', 'Price', 'Estimated Time', 'Description']
            : ['Name', 'SKU', 'Category', 'Price', 'Sales Price', 'Stock', 'Brand'];

        const rows = items.map(item => {
            if (activeTab === 'services') {
                const s = item as Service;
                return [s.name, s.category, s.price, s.estimatedTime, s.description];
            } else {
                const p = item as Part;
                return [p.name, p.sku, p.category, p.price, p.salesPrice || '', p.stock, p.brand || ''];
            }
        });

        const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${activeTab}-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const handleTabChange = (tab: 'services' | 'parts' | 'rental-cars' | 'drivers' | 'liaison-agents') => { setActiveTab(tab); setSearchQuery(''); setCategoryFilter('all'); };

    if (loading || !db) return <div className="flex items-center justify-center h-full"><Spinner size="lg" color="text-white" /></div>;

    const handleOpenServiceModal = (service?: Service) => { setEditingService(service); setIsServiceModalOpen(true); };
    const handleCloseServiceModal = () => { setEditingService(undefined); setIsServiceModalOpen(false); };
    const handleSaveService = (service: any) => {
        if (service.id && typeof service.id === 'string' && service.id.trim()) {
            // Update existing service
            updateService(service as Service);
        } else {
            // Create new service - remove id field if present
            const { id, ...serviceData } = service;
            addService(serviceData);
        }
        handleCloseServiceModal();
    };
    const handleDeleteService = (id: string) => {
        if (window.confirm('Are you sure you want to delete this service? This action cannot be undone.')) {
            deleteService(id);
        }
    };

    const handleOpenPartModal = (part?: Part) => { setEditingPart(part); setIsPartModalOpen(true); };
    const handleClosePartModal = () => { setEditingPart(undefined); setIsPartModalOpen(false); };
    const handleSavePart = (part: any) => {
        if (part.id && typeof part.id === 'string' && part.id.trim()) {
            // Update existing part
            updatePart(part as Part);
        } else {
            // Create new part - remove id field if present
            const { id, ...partData } = part;
            addPart(partData);
        }
        handleClosePartModal();
    };
    const handleDeletePart = (id: string) => {
        if (window.confirm('Are you sure you want to delete this part? This action cannot be undone.')) {
            deletePart(id);
        }
    };

    // Car handlers
    const handleOpenCarModal = (car?: RentalCar) => { setEditingCar(car); setIsCarModalOpen(true); };
    const handleCloseCarModal = () => { setEditingCar(undefined); setIsCarModalOpen(false); };
    const handleSaveCar = (car: any) => {
        if (car.id) { updateRentalCar(car as RentalCar); } else { const { id, ...d } = car; addRentalCar(d); }
        handleCloseCarModal();
    };
    const handleDeleteCar = (id: string) => { if (window.confirm('Remove this car from the fleet?')) deleteRentalCar(id); };
    const handleToggleCar = (car: RentalCar) => updateRentalCar({ ...car, isAvailable: !car.isAvailable });

    // Driver handlers
    const handleOpenDriverModal = (driver?: HireDriver) => { setEditingDriver(driver); setIsDriverModalOpen(true); };
    const handleCloseDriverModal = () => { setEditingDriver(undefined); setIsDriverModalOpen(false); };
    const handleSaveDriver = (driver: any) => {
        if (driver.id) { updateHireDriver(driver as HireDriver); } else { const { id, ...d } = driver; addHireDriver(d); }
        handleCloseDriverModal();
    };
    const handleDeleteDriver = (id: string) => { if (window.confirm('Remove this driver from the pool?')) deleteHireDriver(id); };
    const handleToggleDriver = (driver: HireDriver) => updateHireDriver({ ...driver, isAvailable: !driver.isAvailable });

    // Liaison handlers
    const handleOpenLiaisonModal = (liaison?: LiaisonStaff) => { setEditingLiaison(liaison); setIsLiaisonModalOpen(true); };
    const handleCloseLiaisonModal = () => { setEditingLiaison(undefined); setIsLiaisonModalOpen(false); };
    const handleSaveLiaison = async (liaison: any) => {
        try {
            if (liaison.id) {
                await updateDoc(doc(firestore, 'liaisonStaff', liaison.id), liaison);
            } else {
                await addDoc(collection(firestore, 'liaisonStaff'), {
                    ...liaison,
                    rating: 5.0,
                    totalJobs: 0
                });
            }
        } catch (err) {
            console.error("Error saving liaison staff:", err);
        }
        handleCloseLiaisonModal();
    };
    const handleDeleteLiaison = async (id: string) => {
        if (window.confirm('Remove this liaison officer from the pool?')) {
            try {
                await deleteDoc(doc(firestore, 'liaisonStaff', id));
            } catch (err) {
                console.error("Error deleting liaison staff:", err);
            }
        }
    };
    const handleToggleLiaison = async (s: LiaisonStaff) => {
        try {
            await updateDoc(doc(firestore, 'liaisonStaff', s.id), { isAvailable: !s.isAvailable });
        } catch (err) {
            console.error("Error toggling availability:", err);
        }
    };

    // New handlers for enhanced features
    const handleDuplicateService = (service: Service) => {
        const duplicated = {
            ...service,
            name: `${service.name} (Copy)`,
            id: undefined
        };
        const { id, ...serviceData } = duplicated;
        addService(serviceData);
    };

    const handleDuplicatePart = (part: Part) => {
        const duplicated = {
            ...part,
            name: `${part.name} (Copy)`,
            sku: `${part.sku}-COPY`,
            id: undefined
        };
        const { id, ...partData } = duplicated;
        addPart(partData);
    };

    const handleToggleServiceStatus = async (service: Service) => {
        const updated = { ...service, isActive: !service.isActive };
        updateService(updated);
    };

    const handleTogglePartStatus = async (part: Part) => {
        const updated = { ...part, isActive: !part.isActive };
        updatePart(updated);
    };

    const handleSelectItem = (id: string) => {
        setSelectedItems(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        const items = activeTab === 'services' ? filteredServices : filteredParts;
        if (selectedItems.length === items.length) {
            setSelectedItems([]);
        } else {
            setSelectedItems(items.map(i => i.id));
        }
    };

    const handleBulkDelete = () => {
        if (selectedItems.length === 0) return;
        if (window.confirm(`Are you sure you want to delete ${selectedItems.length} items? This action cannot be undone.`)) {
            selectedItems.forEach(id => {
                if (activeTab === 'services') {
                    deleteService(id);
                } else {
                    deletePart(id);
                }
            });
            setSelectedItems([]);
        }
    };

    const clearFilters = () => {
        setSearchQuery('');
        setCategoryFilter('all');
        setStatusFilter('all');
    };

    const activeFiltersCount = (searchQuery ? 1 : 0) + (categoryFilter !== 'all' ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0);

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-4">
                <div>
                    <h1 className="text-2xl font-black text-white tracking-tighter  leading-none">Catalog Management</h1>
                    <div className="flex items-center gap-2 mt-4">
                        <div className="h-1 w-12 bg-primary rounded-full"></div>
                        <p className="text-gray-500 font-bold  tracking-[0.3em] text-[9px]">Inventory & Services Control</p>
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-10 gap-3">
                <div className="col-span-1 md:col-span-1 lg:col-span-2">
                    <EnhancedKPICard title="Total Services" value={stats.totalServices} icon={<Wrench size={24} className="text-white" />} gradient="bg-gradient-to-br from-blue-600 to-blue-800" trend={{ value: 12, isPositive: true }} subtitle="Active offerings" />
                </div>
                <div className="col-span-1 md:col-span-1 lg:col-span-2">
                    <EnhancedKPICard title="Total Parts" value={stats.totalParts} icon={<Package size={24} className="text-white" />} gradient="bg-gradient-to-br from-green-600 to-green-800" trend={{ value: 8, isPositive: true }} subtitle="In inventory" />
                </div>
                <div className="col-span-1 md:col-span-1 lg:col-span-2">
                    <EnhancedKPICard title="Rental Fleet" value={`${stats.availableCars}/${stats.totalCars}`} icon={<Car size={24} className="text-white" />} gradient="bg-gradient-to-br from-cyan-600 to-cyan-800" subtitle="Cars available" />
                </div>
                <div className="col-span-1 md:col-span-1 lg:col-span-2">
                    <EnhancedKPICard title="Hire Drivers" value={`${stats.availableDrivers}/${stats.totalDrivers}`} icon={<UserCheck size={24} className="text-white" />} gradient="bg-gradient-to-br from-violet-600 to-violet-800" subtitle="Drivers on duty" />
                </div>
                <div className="col-span-1 md:col-span-1 lg:col-span-2">
                    <EnhancedKPICard title="Liaison Agent" value={`${stats.availableLiaisonAgents}/${stats.totalLiaisonAgents}`} icon={<Users size={24} className="text-white" />} gradient="bg-gradient-to-br from-emerald-600 to-emerald-800" subtitle="Agents available" />
                </div>
            </div>

            {/* Tabs and Action Buttons */}
            <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
                {/* Tabs */}
                <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => handleTabChange('services')} className={`px-4 py-2 rounded-xl font-black tracking-widest text-[10px] transition-all flex items-center gap-2 ${activeTab === 'services' ? 'bg-primary text-white shadow-lg shadow-primary/25 scale-105' : 'bg-white/5 text-gray-500 hover:text-white hover:bg-white/10'}`}>
                        <Wrench size={16} />Services ({db.services.length})
                    </button>
                    <button onClick={() => handleTabChange('parts')} className={`px-4 py-2 rounded-xl font-black tracking-widest text-[10px] transition-all flex items-center gap-2 ${activeTab === 'parts' ? 'bg-primary text-white shadow-lg shadow-primary/25 scale-105' : 'bg-white/5 text-gray-500 hover:text-white hover:bg-white/10'}`}>
                        <Package size={16} />Parts & Tools ({db.parts.length})
                    </button>
                    <button onClick={() => handleTabChange('rental-cars')} className={`px-4 py-2 rounded-xl font-black tracking-widest text-[10px] transition-all flex items-center gap-2 ${activeTab === 'rental-cars' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/25 scale-105' : 'bg-white/5 text-gray-500 hover:text-white hover:bg-white/10'}`}>
                        <Car size={16} />Car Rent ({(db.rentalCars || []).length})
                    </button>
                    <button onClick={() => handleTabChange('drivers')} className={`px-4 py-2 rounded-xl font-black tracking-widest text-[10px] transition-all flex items-center gap-2 ${activeTab === 'drivers' ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/25 scale-105' : 'bg-white/5 text-gray-500 hover:text-white hover:bg-white/10'}`}>
                        <UserCheck size={16} />Drivers ({(db.hireDrivers || []).length})
                    </button>
                    <button onClick={() => handleTabChange('liaison-agents')} className={`px-4 py-2 rounded-xl font-black tracking-widest text-[10px] transition-all flex items-center gap-2 ${activeTab === 'liaison-agents' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25 scale-105' : 'bg-white/5 text-gray-500 hover:text-white hover:bg-white/10'}`}>
                        <Users size={16} />Liaison Agent ({liaisonAgentsList.length})
                    </button>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                    {(activeTab === 'services' || activeTab === 'parts') && (
                        <>
                            <button onClick={exportToCSV} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl font-black tracking-widest text-[10px] border border-white/5 transition-all flex items-center gap-2 active:scale-95"><Download size={16} />Export CSV</button>
                            <button onClick={() => setIsCategoryModalOpen(true)} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl font-black tracking-widest text-[10px] border border-white/5 transition-all flex items-center gap-2 active:scale-95"><Tag size={16} />Categories</button>
                        </>
                    )}
                    {activeTab === 'services' && <button onClick={() => handleOpenServiceModal()} className="px-4 py-2 bg-primary hover:bg-orange-600 text-white rounded-xl font-black tracking-widest text-[10px] transition-all shadow-2xl shadow-primary/20 flex items-center gap-2 active:scale-95 hover:scale-105"><Plus size={16} strokeWidth={3} />Add Service</button>}
                    {activeTab === 'parts' && <button onClick={() => handleOpenPartModal()} className="px-4 py-2 bg-primary hover:bg-orange-600 text-white rounded-xl font-black tracking-widest text-[10px] transition-all shadow-2xl shadow-primary/20 flex items-center gap-2 active:scale-95 hover:scale-105"><Plus size={16} strokeWidth={3} />Add Part</button>}
                    {activeTab === 'rental-cars' && <button onClick={() => handleOpenCarModal()} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-black tracking-widest text-[10px] transition-all shadow-2xl shadow-cyan-600/20 flex items-center gap-2 active:scale-95 hover:scale-105"><Plus size={16} strokeWidth={3} />Add Car</button>}
                    {activeTab === 'drivers' && <button onClick={() => handleOpenDriverModal()} className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-black tracking-widest text-[10px] transition-all shadow-2xl shadow-violet-600/20 flex items-center gap-2 active:scale-95 hover:scale-105"><Plus size={16} strokeWidth={3} />Add Driver</button>}
                    {activeTab === 'liaison-agents' && <button onClick={() => handleOpenLiaisonModal()} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black tracking-widest text-[10px] transition-all shadow-2xl shadow-emerald-600/20 flex items-center gap-2 active:scale-95 hover:scale-105"><Plus size={16} strokeWidth={3} />Add Liaison</button>}
                </div>
            </div>

            {/* Car Rent Tab Content */}
            {activeTab === 'rental-cars' && (
                <div className="animate-fadeIn">
                    {/* Car Search */}
                    <div className="bg-[#121212]/80 border border-white/10 p-2.5 rounded-2xl mb-4">
                        <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                            <input type="text" id="car-search" name="car-search" placeholder="Search by make, model, plate..." value={carSearch} onChange={e => setCarSearch(e.target.value)} className="w-full h-10 pl-10 pr-4 bg-white/5 border border-white/5 rounded-xl text-white text-xs font-bold placeholder-gray-600 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all" />
                        </div>
                    </div>
                    {filteredCars.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-gray-600">
                            <Car size={56} className="mb-4 opacity-20" />
                            <p className="text-lg font-bold">No rental cars yet</p>
                            <p className="text-sm mt-1">Click "Add Car" to add your first vehicle to the fleet.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                            {filteredCars.map((car: RentalCar) => (
                                <div key={car.id} className="bg-[#121212] rounded-2xl overflow-hidden border border-white/5 hover:border-cyan-500/40 transition-all duration-300 group shadow-xl">
                                    <div className="relative h-40 overflow-hidden">
                                        <img src={car.imageUrl || '/placeholder.svg'} alt={`${car.make} ${car.model}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }} />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                                        <div className="absolute top-2.5 right-2.5">
                                            <span className={`text-[10px] font-black px-2.5 py-1 rounded-full backdrop-blur-sm ${car.isAvailable ? 'bg-green-500/90 text-white' : 'bg-red-500/80 text-white'}`}>{car.isAvailable ? '● Available' : '● Unavailable'}</span>
                                        </div>
                                        <div className="absolute bottom-2.5 left-3">
                                            <p className="font-black text-white text-sm drop-shadow">{car.year} {car.make} {car.model}</p>
                                            <p className="text-[10px] text-gray-300">{car.type} · {car.seats} seats · {car.transmission || 'Auto'}</p>
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <div>
                                                <p className="text-cyan-400 font-black text-xl">₱{(car.pricePerDay || 0).toLocaleString()}<span className="text-xs font-normal text-gray-500">/day</span></p>
                                                {car.plateNumber && <p className="text-[10px] text-gray-500 mt-0.5">🚗 {car.plateNumber}</p>}
                                            </div>
                                            {car.color && <span className="text-xs px-2 py-1 bg-white/5 text-gray-400 rounded-lg border border-white/5">{car.color}</span>}
                                        </div>
                                        {car.features && car.features.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mb-3">
                                                {car.features.slice(0, 3).map((f, i) => <span key={i} className="text-[9px] px-2 py-0.5 bg-cyan-500/10 text-cyan-400 rounded-full border border-cyan-500/20">{f}</span>)}
                                                {car.features.length > 3 && <span className="text-[9px] px-2 py-0.5 bg-white/5 text-gray-500 rounded-full">+{car.features.length - 3}</span>}
                                            </div>
                                        )}
                                        <div className="flex items-center gap-1.5 pt-2.5 border-t border-white/5">
                                            <button onClick={() => handleToggleCar(car)} className={`flex-1 text-[10px] py-1.5 rounded-lg font-bold transition-all ${car.isAvailable ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'}`}>
                                                {car.isAvailable ? <ToggleRight size={12} className="inline mr-1" /> : <ToggleLeft size={12} className="inline mr-1" />}{car.isAvailable ? 'Mark Unavailable' : 'Mark Available'}
                                            </button>
                                            <button onClick={() => handleOpenCarModal(car)} className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all" title="Edit"><Edit2 size={13} /></button>
                                            <button onClick={() => handleDeleteCar(car.id)} className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all" title="Delete"><Trash2 size={13} /></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Drivers Tab Content */}
            {activeTab === 'drivers' && (
                <div className="animate-fadeIn">
                    {/* Driver Search */}
                    <div className="bg-[#121212]/80 border border-white/10 p-2.5 rounded-2xl mb-4">
                        <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                            <input type="text" id="driver-search" name="driver-search" placeholder="Search by name or phone..." value={driverSearch} onChange={e => setDriverSearch(e.target.value)} className="w-full h-10 pl-10 pr-4 bg-white/5 border border-white/5 rounded-xl text-white text-xs font-bold placeholder-gray-600 focus:ring-1 focus:ring-violet-500 focus:border-violet-500 outline-none transition-all" />
                        </div>
                    </div>
                    {filteredDrivers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-gray-600">
                            <UserCheck size={56} className="mb-4 opacity-20" />
                            <p className="text-lg font-bold">No hire drivers yet</p>
                            <p className="text-sm mt-1">Click "Add Driver" to add your first driver to the pool.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                            {filteredDrivers.map((driver: HireDriver) => (
                                <div key={driver.id} className="bg-[#121212] rounded-2xl overflow-hidden border border-white/5 hover:border-violet-500/40 transition-all duration-300 group shadow-xl">
                                    <div className="relative h-36 bg-gradient-to-br from-violet-900/40 to-black flex items-center justify-center overflow-hidden">
                                        <img src={driver.imageUrl || '/placeholder.svg'} alt={driver.name} className="w-20 h-20 rounded-full object-cover border-4 border-violet-500/30 group-hover:scale-105 transition-transform duration-500 shadow-xl" onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }} />
                                        <div className="absolute top-2.5 right-2.5">
                                            <span className={`text-[10px] font-black px-2.5 py-1 rounded-full backdrop-blur-sm ${driver.isAvailable ? 'bg-green-500/90 text-white' : 'bg-gray-600/90 text-white'}`}>{driver.isAvailable ? '● Available' : '● Not Available'}</span>
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <div className="mb-2">
                                            <p className="font-black text-white text-base">{driver.name}</p>
                                            <p className="text-[10px] text-gray-400 mt-0.5">{driver.licenseType} · {driver.experience}</p>
                                            <p className="text-[10px] text-gray-500">📍 {driver.geoLimit}</p>
                                        </div>
                                        {(driver.rating || driver.totalTrips) && (
                                            <div className="flex gap-3 mb-2">
                                                {driver.rating && <span className="text-[10px] text-yellow-400">⭐ {Number(driver.rating).toFixed(1)}</span>}
                                                {driver.totalTrips ? <span className="text-[10px] text-gray-500">{driver.totalTrips} trips</span> : null}
                                            </div>
                                        )}
                                        <div className="flex gap-2 mb-3">
                                            <div className="flex-1 bg-violet-500/10 border border-violet-500/20 rounded-xl p-2 text-center">
                                                <p className="text-violet-400 font-black text-sm">₱{(driver.pricePerHour || 0).toLocaleString()}</p>
                                                <p className="text-[9px] text-gray-500">/hour</p>
                                            </div>
                                            <div className="flex-1 bg-violet-500/10 border border-violet-500/20 rounded-xl p-2 text-center">
                                                <p className="text-violet-400 font-black text-sm">₱{(driver.pricePerDay || 0).toLocaleString()}</p>
                                                <p className="text-[9px] text-gray-500">/day</p>
                                            </div>
                                        </div>
                                        {driver.phone && <p className="text-[10px] text-gray-500 mb-3">📞 {driver.phone}</p>}
                                        <div className="flex items-center gap-1.5 pt-2.5 border-t border-white/5">
                                            <button onClick={() => handleToggleDriver(driver)} className={`flex-1 text-[10px] py-1.5 rounded-lg font-bold transition-all ${driver.isAvailable ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' : 'bg-gray-500/10 text-gray-400 hover:bg-gray-500/20'}`}>
                                                {driver.isAvailable ? <ToggleRight size={12} className="inline mr-1" /> : <ToggleLeft size={12} className="inline mr-1" />}{driver.isAvailable ? 'Available' : 'Not Available'}
                                            </button>
                                            <button onClick={() => handleOpenDriverModal(driver)} className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all" title="Edit"><Edit2 size={13} /></button>
                                            <button onClick={() => handleDeleteDriver(driver.id)} className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all" title="Delete"><Trash2 size={13} /></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'liaison-agents' && (
                <div className="animate-fadeIn">
                    {/* Liaison Search */}
                    <div className="bg-[#121212]/80 border border-white/10 p-2.5 rounded-2xl mb-4">
                        <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                            <input type="text" placeholder="Search by name or phone..." value={liaisonSearch} onChange={e => setLiaisonSearch(e.target.value)} className="w-full h-10 pl-10 pr-4 bg-white/5 border border-white/5 rounded-xl text-white text-xs font-bold placeholder-gray-600 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" />
                        </div>
                    </div>
                    {filteredLiaison.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-gray-600">
                            <UserCheck size={56} className="mb-4 opacity-20 text-emerald-500" />
                            <p className="text-lg font-bold">No liaison agents yet</p>
                            <p className="text-sm mt-1">Click "Add Liaison" to add your first liaison agent.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                            {filteredLiaison.map((staff: LiaisonStaff) => {
                                return (
                                    <div 
                                        key={staff.id} 
                                        onClick={() => setViewingLiaison(staff)}
                                        className="bg-[#121212] rounded-2xl overflow-hidden border border-white/5 hover:border-emerald-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 group shadow-xl flex flex-col justify-between cursor-pointer"
                                    >
                                        <div className="relative h-32 bg-gradient-to-br from-emerald-950/40 to-black flex items-center justify-center overflow-hidden">
                                            <img src={staff.imageUrl || '/placeholder.svg'} alt={staff.name} className="w-16 h-16 rounded-full object-cover border-4 border-emerald-500/30 group-hover:scale-105 transition-transform duration-500 shadow-xl" onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }} />
                                            <div className="absolute top-2.5 right-2.5">
                                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full backdrop-blur-sm ${staff.isAvailable ? 'bg-green-500/90 text-white animate-pulse' : 'bg-gray-600/90 text-white'}`}>
                                                    {staff.isAvailable ? '● Available' : '● Inactive'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="p-4 flex-1 flex flex-col justify-between">
                                            <div className="mb-3">
                                                <p className="font-black text-white text-sm group-hover:text-emerald-400 transition-colors truncate">{staff.name}</p>
                                                {staff.description && <p className="text-[10px] text-gray-400 mt-1 line-clamp-2 leading-relaxed">{staff.description}</p>}
                                                
                                                {staff.assignedServices && staff.assignedServices.length > 0 && (
                                                    <div className="mt-2.5">
                                                        <p className="text-[8px] font-black text-gray-500 uppercase tracking-wider mb-1">Service Areas</p>
                                                        <div className="flex flex-wrap gap-1">
                                                            {staff.assignedServices.slice(0, 2).map((svc, i) => (
                                                                <span key={i} className="text-[8px] bg-emerald-500/10 border border-emerald-500/10 rounded px-1.5 py-0.5 text-emerald-400 font-bold truncate max-w-[120px]">{svc}</span>
                                                            ))}
                                                            {staff.assignedServices.length > 2 && (
                                                                <span className="text-[8px] bg-white/5 border border-white/5 rounded px-1.5 py-0.5 text-gray-400 font-bold">+{staff.assignedServices.length - 2} more</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <div className="flex items-center justify-between text-[10px] mb-2 text-gray-500 border-t border-white/5 pt-2.5">
                                                    <div className="flex gap-2">
                                                        <span className="text-yellow-400 font-bold">⭐ {Number(staff.rating || 5.0).toFixed(1)}</span>
                                                        <span>•</span>
                                                        <span>{staff.totalJobs || 0} jobs</span>
                                                    </div>
                                                    {staff.phone && <span className="font-mono">{staff.phone}</span>}
                                                </div>
                                                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                                    <button onClick={() => handleToggleLiaison(staff)} className={`flex-1 text-[9px] py-1.5 rounded-lg font-black transition-all ${staff.isAvailable ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' : 'bg-gray-500/10 text-gray-400 hover:bg-gray-500/20'}`}>
                                                        {staff.isAvailable ? <ToggleRight size={12} className="inline mr-1" /> : <ToggleLeft size={12} className="inline mr-1" />}{staff.isAvailable ? 'Available' : 'Unavailable'}
                                                    </button>
                                                    <button onClick={() => handleOpenLiaisonModal(staff)} className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all" title="Edit"><Edit2 size={12} /></button>
                                                    <button onClick={() => handleDeleteLiaison(staff.id)} className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all" title="Delete"><Trash2 size={12} /></button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Filters — only for services/parts tabs */}
            {(activeTab === 'services' || activeTab === 'parts') && (
            <div className="bg-[#121212]/80 backdrop-blur-2xl border border-white/10 p-2.5 rounded-2xl mb-4 relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur opacity-5 group-hover:opacity-10 transition duration-1000"></div>
                <div className="flex flex-col lg:flex-row gap-2.5 relative z-10">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                        <input
                            type="text"
                            id="catalog-search"
                            name="catalogSearch"
                            placeholder={activeTab === 'services' ? "Search services..." : "Search parts or SKU..."}
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            autoComplete="off"
                            className="w-full h-10 pl-10 pr-4 bg-white/5 border border-white/5 rounded-xl text-white text-xs font-bold placeholder-gray-600 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                        />
                    </div>
                    <div className="relative">
                        <select
                            id="catalog-category-filter"
                            name="catalogCategoryFilter"
                            value={categoryFilter}
                            onChange={e => setCategoryFilter(e.target.value)}
                            className="w-full bg-white/5 border border-white/5 rounded-xl pl-3 pr-10 h-10 text-white text-xs font-bold outline-none focus:border-primary appearance-none cursor-pointer hover:bg-white/10 transition-colors"
                        >
                            <option value="all">All Categories</option>
                            {activeTab === 'services'
                                ? serviceCategories.map(cat => cat !== 'all' && <option key={cat} value={cat}>{cat}</option>)
                                : partCategories.map(cat => cat !== 'all' && <option key={cat} value={cat}>{cat}</option>)
                            }
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                    </div>

                    {/* Status Filter */}
                    <div className="relative">
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                            className="w-full bg-white/5 border border-white/5 rounded-xl pl-3 pr-10 h-10 text-white text-xs font-bold outline-none focus:border-primary appearance-none cursor-pointer hover:bg-white/10 transition-colors"
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active Only</option>
                            <option value="inactive">Inactive Only</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                    </div>

                    {/* View Mode Toggle */}
                    <div className="flex items-center bg-white/5 rounded-xl p-1 border border-white/5 h-10">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-primary text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                            title="List View"
                        >
                            <List size={16} />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-primary text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                            title="Grid View"
                        >
                            <Grid size={16} />
                        </button>
                    </div>

                    <div className="flex items-center bg-white/5 rounded-xl p-1 border border-white/5 h-10">
                        <button onClick={() => requestSort('name')} className={`p-1.5 rounded-lg transition-all ${sortConfig.key === 'name' ? 'bg-primary text-white shadow-lg' : 'text-gray-500 hover:text-white'}`} title="Sort by Name">
                            <ArrowUpDown size={16} />
                        </button>
                        <button onClick={() => requestSort('price')} className={`p-1.5 rounded-lg transition-all ${sortConfig.key === 'price' ? 'bg-primary text-white shadow-lg' : 'text-gray-500 hover:text-white'}`} title="Sort by Price">
                            <DollarSign size={16} />
                        </button>
                    </div>

                    {activeFiltersCount > 0 && (
                        <button
                            onClick={clearFilters}
                            className="px-4 h-10 bg-red-500/10 text-red-500 rounded-xl font-black  tracking-widest text-[10px] hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>
            )}

            {/* Content Area — only for services/parts */}
            {(activeTab === 'services' || activeTab === 'parts') && (
            <div className="flex-1 overflow-auto custom-scrollbar">
                {/* Bulk Actions Bar */}
                <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20">
                    <div className="flex items-center gap-4">
                        {selectedItems.length > 0 && (
                            <>
                                <span className="text-sm font-bold text-primary">
                                    {selectedItems.length} selected
                                </span>
                                <button
                                    onClick={handleBulkDelete}
                                    className="px-4 py-2 bg-red-500/10 text-red-500 rounded-lg font-bold text-xs  tracking-wider hover:bg-red-500 hover:text-white transition-all border border-red-500/20 flex items-center gap-2"
                                >
                                    <Trash2 size={14} />
                                    Delete Selected
                                </button>
                                <button
                                    onClick={() => setSelectedItems([])}
                                    className="px-4 py-2 bg-white/5 text-gray-400 rounded-lg font-bold text-xs  tracking-wider hover:bg-white/10 hover:text-white transition-all"
                                >
                                    Clear Selection
                                </button>
                            </>
                        )}
                    </div>
                    <p className="text-xs font-bold text-gray-500  tracking-widest">
                        Showing {activeTab === 'services' ? filteredServices.length : filteredParts.length} {activeTab}
                    </p>
                </div>

                {/* Table/Grid View Content */}
                {viewMode === 'list' ? (
                    // TABLE/LIST VIEW
                    <div className="overflow-x-auto min-h-[260px]">
                        {activeTab === 'services' ? (
                            filteredServices.length > 0 ? (
                                <table className="w-full">
                                    <thead className="bg-black/40 sticky top-0 z-10">
                                        <tr>
                                            <th className="py-2 px-3 text-left">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedItems.length === filteredServices.length}
                                                    onChange={handleSelectAll}
                                                    className="w-4 h-4 rounded border-white/20 bg-white/5 checked:bg-primary"
                                                />
                                            </th>
                                            <th className="py-2 px-3 text-left text-xs font-black text-gray-400  tracking-wider">Image</th>
                                            <th className="py-2 px-3 text-left text-xs font-black text-gray-400  tracking-wider cursor-pointer hover:text-primary" onClick={() => requestSort('name')}>
                                                <div className="flex items-center gap-1.5">Name {getSortIndicator('name')}</div>
                                            </th>
                                            <th className="py-2 px-3 text-left text-xs font-black text-gray-400  tracking-wider cursor-pointer hover:text-primary" onClick={() => requestSort('category')}>
                                                <div className="flex items-center gap-1.5">Category {getSortIndicator('category')}</div>
                                            </th>
                                            <th className="py-2 px-3 text-left text-xs font-black text-gray-400  tracking-wider cursor-pointer hover:text-primary" onClick={() => requestSort('price')}>
                                                <div className="flex items-center gap-1.5">Price {getSortIndicator('price')}</div>
                                            </th>
                                            <th className="py-2 px-3 text-left text-xs font-black text-gray-400  tracking-wider">Duration</th>
                                            <th className="py-2 px-3 text-left text-xs font-black text-gray-400  tracking-wider">Status</th>
                                            <th className="py-2 px-3 text-right text-xs font-black text-gray-400  tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredServices.map((service, idx) => (
                                            <tr
                                                key={service.id}
                                                className={`border-b border-white/5 hover:bg-white/5 transition-colors ${idx % 2 === 0 ? 'bg-black/20' : 'bg-transparent'}`}
                                            >
                                                <td className="py-2 px-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedItems.includes(service.id)}
                                                        onChange={() => handleSelectItem(service.id)}
                                                        className="w-4 h-4 rounded border-white/20 bg-white/5 checked:bg-primary"
                                                    />
                                                </td>
                                                <td className="py-2 px-3">
                                                    <img src={service.imageUrl || getFallbackImageForCategory(service.category)} alt={service.name} className="w-10 h-10 object-cover rounded-lg" onError={(e) => { (e.target as HTMLImageElement).src = getFallbackImageForCategory(service.category); }} />
                                                </td>
                                                <td className="py-2 px-3">
                                                    <div className="font-bold text-white text-sm">{service.name}</div>
                                                    <div className="text-[10px] text-gray-500 max-w-[240px] truncate">{service.description}</div>
                                                </td>
                                                <td className="py-2 px-3">
                                                    <span className="px-2 py-0.5 bg-primary/20 border border-primary/30 text-primary text-[10px] font-bold rounded-lg whitespace-nowrap inline-block">
                                                        {service.category}
                                                    </span>
                                                </td>
                                                <td className="py-2 px-3 font-bold text-white text-sm">₱{service.price.toLocaleString()}</td>
                                                <td className="py-2 px-3 text-gray-400 text-xs">{service.estimatedTime}</td>
                                                <td className="py-2 px-3">
                                                    <button
                                                        onClick={() => handleToggleServiceStatus(service)}
                                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1.5 transition-all ${service.isActive !== false
                                                            ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                                            : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
                                                            }`}
                                                    >
                                                        {service.isActive !== false ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
                                                        {service.isActive !== false ? 'Active' : 'Inactive'}
                                                    </button>
                                                </td>
                                                <td className="py-2 px-3 relative">
                                                    <div className="flex items-center justify-end">
                                                        <div className="relative inline-block text-left">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setActiveDropdownId(activeDropdownId === `service-${service.id}` ? null : `service-${service.id}`);
                                                                }}
                                                                className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all focus:outline-none"
                                                                title="Actions"
                                                            >
                                                                <MoreVertical size={14} />
                                                            </button>

                                                            {activeDropdownId === `service-${service.id}` && (
                                                                <div 
                                                                    className="absolute right-0 mt-2 w-40 rounded-xl bg-[#121212] border border-white/10 shadow-2xl z-50 py-2 animate-fadeIn"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <button
                                                                        onClick={() => {
                                                                            handleOpenServiceModal(service);
                                                                            setActiveDropdownId(null);
                                                                        }}
                                                                        className="w-full text-left px-4 py-2.5 text-sm text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 flex items-center gap-2 transition-colors"
                                                                    >
                                                                        <Edit size={14} />
                                                                        Edit
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            handleDuplicateService(service);
                                                                            setActiveDropdownId(null);
                                                                        }}
                                                                        className="w-full text-left px-4 py-2.5 text-sm text-orange-400 hover:bg-orange-500/10 hover:text-orange-300 flex items-center gap-2 transition-colors"
                                                                    >
                                                                        <Copy size={14} />
                                                                        Duplicate
                                                                    </button>
                                                                    <div className="border-t border-white/5 my-1"></div>
                                                                    <button
                                                                        onClick={() => {
                                                                            handleDeleteService(service.id);
                                                                            setActiveDropdownId(null);
                                                                        }}
                                                                        className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center gap-2 transition-colors"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                        Delete
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="text-center py-16">
                                    <Wrench size={64} className="text-gray-600 mx-auto mb-4" />
                                    <p className="text-xl font-semibold text-gray-400">No services found</p>
                                    <p className="text-sm text-gray-500 mt-1">Try adjusting your filters or add a new service</p>
                                </div>
                            )
                        ) : (
                            filteredParts.length > 0 ? (
                                <table className="w-full">
                                    <thead className="bg-black/40 sticky top-0 z-10">
                                        <tr>
                                            <th className="py-2 px-3 text-left">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedItems.length === filteredParts.length}
                                                    onChange={handleSelectAll}
                                                    className="w-4 h-4 rounded border-white/20 bg-white/5 checked:bg-primary"
                                                />
                                            </th>
                                            <th className="py-2 px-3 text-left text-xs font-black text-gray-400  tracking-wider">Image</th>
                                            <th className="py-2 px-3 text-left text-xs font-black text-gray-400  tracking-wider cursor-pointer hover:text-primary" onClick={() => requestSort('name')}>
                                                <div className="flex items-center gap-1.5">Name {getSortIndicator('name')}</div>
                                            </th>
                                            <th className="py-2 px-3 text-left text-xs font-black text-gray-400  tracking-wider cursor-pointer hover:text-primary" onClick={() => requestSort('sku')}>
                                                <div className="flex items-center gap-1.5">SKU {getSortIndicator('sku')}</div>
                                            </th>
                                            <th className="py-2 px-3 text-left text-xs font-black text-gray-400  tracking-wider cursor-pointer hover:text-primary" onClick={() => requestSort('category')}>
                                                <div className="flex items-center gap-1.5">Category {getSortIndicator('category')}</div>
                                            </th>
                                            <th className="py-2 px-3 text-left text-xs font-black text-gray-400  tracking-wider cursor-pointer hover:text-primary" onClick={() => requestSort('price')}>
                                                <div className="flex items-center gap-1.5">Price {getSortIndicator('price')}</div>
                                            </th>
                                            <th className="py-2 px-3 text-left text-xs font-black text-gray-400  tracking-wider cursor-pointer hover:text-primary" onClick={() => requestSort('stock')}>
                                                <div className="flex items-center gap-1.5">Stock {getSortIndicator('stock')}</div>
                                            </th>
                                            <th className="py-2 px-3 text-left text-xs font-black text-gray-400  tracking-wider">Brand</th>
                                            <th className="py-2 px-3 text-left text-xs font-black text-gray-400  tracking-wider">Status</th>
                                            <th className="py-2 px-3 text-right text-xs font-black text-gray-400  tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredParts.map((part, idx) => {
                                            const isLowStock = part.stock < (part.lowStockThreshold || 10);
                                            return (
                                                <tr
                                                    key={part.id}
                                                    className={`border-b border-white/5 hover:bg-white/5 transition-colors ${idx % 2 === 0 ? 'bg-black/20' : 'bg-transparent'}`}
                                                >
                                                    <td className="py-2 px-3">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedItems.includes(part.id)}
                                                            onChange={() => handleSelectItem(part.id)}
                                                            className="w-4 h-4 rounded border-white/20 bg-white/5 checked:bg-primary"
                                                        />
                                                    </td>
                                                    <td className="py-2 px-3">
                                                        <img src={part.imageUrls[0]} alt={part.name} className="w-10 h-10 object-cover rounded-lg" />
                                                    </td>
                                                    <td className="py-2 px-3">
                                                        <div className="font-bold text-white text-sm">{part.name}</div>
                                                        {part.salesPrice && (
                                                            <span className="text-[10px] text-orange-400 font-bold">SALE!</span>
                                                        )}
                                                    </td>
                                                    <td className="py-2 px-3 text-gray-400 font-mono text-xs">{part.sku}</td>
                                                    <td className="py-2 px-3">
                                                        <span className="px-2 py-0.5 bg-primary/20 border border-primary/30 text-primary text-[10px] font-bold rounded-lg whitespace-nowrap inline-block">
                                                            {part.category}
                                                        </span>
                                                    </td>
                                                    <td className="py-2 px-3">
                                                        <div className="font-bold text-white text-sm">₱{part.price.toLocaleString()}</div>
                                                        {part.salesPrice && (
                                                            <div className="text-[10px] text-orange-400 font-bold">₱{part.salesPrice.toLocaleString()}</div>
                                                        )}
                                                    </td>
                                                    <td className="py-2 px-3">
                                                        <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${isLowStock
                                                            ? 'bg-red-500/20 text-red-400'
                                                            : 'bg-green-500/20 text-green-400'
                                                            }`}>
                                                            {part.stock} units
                                                        </span>
                                                    </td>
                                                    <td className="py-2 px-3 text-gray-400 text-xs">{part.brand || '—'}</td>
                                                    <td className="py-2 px-3">
                                                        <button
                                                            onClick={() => handleTogglePartStatus(part)}
                                                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1.5 transition-all ${part.isActive !== false
                                                                ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                                                : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
                                                                }`}
                                                        >
                                                            {part.isActive !== false ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
                                                            {part.isActive !== false ? 'Active' : 'Inactive'}
                                                        </button>
                                                    </td>
                                                    <td className="py-2 px-3 relative">
                                                         <div className="flex items-center justify-end">
                                                             <div className="relative inline-block text-left">
                                                                 <button
                                                                     onClick={(e) => {
                                                                         e.stopPropagation();
                                                                         setActiveDropdownId(activeDropdownId === `part-${part.id}` ? null : `part-${part.id}`);
                                                                     }}
                                                                     className="p-1 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all focus:outline-none"
                                                                     title="Actions"
                                                                 >
                                                                     <MoreVertical size={14} />
                                                                 </button>
                                                                 
                                                                 {activeDropdownId === `part-${part.id}` && (
                                                                     <div 
                                                                         className="absolute right-0 mt-2 w-40 rounded-xl bg-[#121212] border border-white/10 shadow-2xl z-50 py-2 animate-fadeIn"
                                                                         onClick={(e) => e.stopPropagation()}
                                                                     >
                                                                         <button
                                                                             onClick={() => {
                                                                                 handleOpenPartModal(part);
                                                                                 setActiveDropdownId(null);
                                                                             }}
                                                                             className="w-full text-left px-4 py-2.5 text-sm text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 flex items-center gap-2 transition-colors"
                                                                         >
                                                                             <Edit size={14} />
                                                                             Edit
                                                                         </button>
                                                                         <button
                                                                             onClick={() => {
                                                                                 handleDuplicatePart(part);
                                                                                 setActiveDropdownId(null);
                                                                             }}
                                                                             className="w-full text-left px-4 py-2.5 text-sm text-orange-400 hover:bg-orange-500/10 hover:text-orange-300 flex items-center gap-2 transition-colors"
                                                                         >
                                                                             <Copy size={14} />
                                                                             Duplicate
                                                                         </button>
                                                                         <div className="border-t border-white/5 my-1"></div>
                                                                         <button
                                                                             onClick={() => {
                                                                                 handleDeletePart(part.id);
                                                                                 setActiveDropdownId(null);
                                                                             }}
                                                                             className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center gap-2 transition-colors"
                                                                         >
                                                                             <Trash2 size={14} />
                                                                             Delete
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
                                <div className="text-center py-16">
                                    <Package size={64} className="text-gray-600 mx-auto mb-4" />
                                    <p className="text-xl font-semibold text-gray-400">No parts found</p>
                                    <p className="text-sm text-gray-500 mt-1">Try adjusting your filters or add a new part</p>
                                </div>
                            )
                        )}
                    </div>
                ) : (
                    // GRID VIEW (Original Card Layout)
                    <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fadeIn transition-all">
                        {activeTab === 'services' ? (
                            filteredServices.length > 0 ? (
                                filteredServices.map(service =>
                                    <ItemCard
                                        key={service.id}
                                        item={service}
                                        onEdit={() => handleOpenServiceModal(service)}
                                        onDelete={() => handleDeleteService(service.id)}
                                    />
                                )
                            ) : (
                                <div className="col-span-full text-center py-16">
                                    <Wrench size={64} className="text-gray-600 mx-auto mb-4" />
                                    <p className="text-xl font-semibold text-gray-400">No services found</p>
                                    <p className="text-sm text-gray-500 mt-1">Try adjusting your filters or add a new service</p>
                                </div>
                            )
                        ) : (
                            filteredParts.length > 0 ? (
                                filteredParts.map(part =>
                                    <ItemCard
                                        key={part.id}
                                        item={part}
                                        onEdit={() => handleOpenPartModal(part)}
                                        onDelete={() => handleDeletePart(part.id)}
                                    />
                                )
                            ) : (
                                <div className="col-span-full text-center py-16">
                                    <Package size={64} className="text-gray-600 mx-auto mb-4" />
                                    <p className="text-xl font-semibold text-gray-400">No parts found</p>
                                    <p className="text-sm text-gray-500 mt-1">Try adjusting your filters or add a new part</p>
                                </div>
                            )
                        )}
                    </div>
                )}
            </div>
            )}

            {isCategoryModalOpen && <CategoryManagerModal onClose={() => setIsCategoryModalOpen(false)} />}
            <Modal title={editingService ? 'Edit Service' : 'Add Service'} isOpen={isServiceModalOpen} onClose={handleCloseServiceModal} compact={true}>
                <ServiceForm service={editingService} onSave={handleSaveService} onCancel={handleCloseServiceModal} categories={(db?.settings?.serviceCategories || []).filter(c => c !== 'all')} />
            </Modal>
            <Modal title={editingPart ? 'Edit Part' : 'Add Part'} isOpen={isPartModalOpen} onClose={handleClosePartModal} compact={true}>
                <PartForm part={editingPart} onSave={handleSavePart} onCancel={handleClosePartModal} categories={(db?.settings?.partCategories || []).filter(c => c !== 'all')} />
            </Modal>
            <Modal
                title={<div className="flex items-center gap-3"><div className="p-2 bg-cyan-500/15 rounded-xl"><Car size={20} className="text-cyan-400" /></div><div><h2 className="text-xl font-black text-white">{editingCar ? 'Edit Car' : 'Add Car to Fleet'}</h2><p className="text-xs text-gray-400 font-normal">Rental Fleet — fully bookable by customers</p></div></div>}
                isOpen={isCarModalOpen} onClose={handleCloseCarModal} sizeClass="max-w-2xl"
            >
                <RentalCarForm car={editingCar} onSave={handleSaveCar} onCancel={handleCloseCarModal} />
            </Modal>
            <Modal
                title={<div className="flex items-center gap-3"><div className="p-2 bg-violet-500/15 rounded-xl"><UserCheck size={20} className="text-violet-400" /></div><div><h2 className="text-xl font-black text-white">{editingDriver ? 'Edit Driver' : 'Add Driver to Pool'}</h2><p className="text-xs text-gray-400 font-normal">Hire Driver Pool — fully bookable by customers</p></div></div>}
                isOpen={isDriverModalOpen} onClose={handleCloseDriverModal} sizeClass="max-w-2xl"
            >
                <HireDriverForm driver={editingDriver} onSave={handleSaveDriver} onCancel={handleCloseDriverModal} />
            </Modal>
            <Modal
                title={<div className="flex items-center gap-3"><div className="p-2 bg-emerald-500/15 rounded-xl"><UserCheck size={20} className="text-emerald-400" /></div><div><h2 className="text-xl font-black text-white">{editingLiaison ? 'Edit Liaison' : 'Add Liaison Agent'}</h2><p className="text-xs text-gray-400 font-normal">Liaison Agent — document renewal & handling</p></div></div>}
                isOpen={isLiaisonModalOpen} onClose={handleCloseLiaisonModal} sizeClass="max-w-2xl"
            >
                <LiaisonStaffForm liaison={editingLiaison} onSave={handleSaveLiaison} onCancel={handleCloseLiaisonModal} branches={db?.liaisonBranches || []} />
            </Modal>
            <Modal
                title={<div className="flex items-center gap-3"><div className="p-2 bg-emerald-500/15 rounded-xl"><UserCheck size={20} className="text-emerald-400" /></div><div><h2 className="text-xl font-black text-white">Liaison Agent Profile</h2><p className="text-xs text-gray-400 font-normal">Complete profile & service details</p></div></div>}
                isOpen={!!viewingLiaison} onClose={() => setViewingLiaison(undefined)} sizeClass="max-w-xl"
            >
                {viewingLiaison && (
                    <div className="space-y-5 text-white animate-fadeIn">
                        <div className="flex flex-col sm:flex-row items-center gap-5 bg-white/[0.02] p-4.5 rounded-2xl border border-white/5">
                            <img src={viewingLiaison.imageUrl || '/placeholder.svg'} alt={viewingLiaison.name} className="w-24 h-24 rounded-full object-cover border-4 border-emerald-500/25 shadow-xl" onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }} />
                            <div className="text-center sm:text-left space-y-1.5">
                                <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2.5">
                                    <h3 className="text-lg font-black text-white leading-none">{viewingLiaison.name}</h3>
                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${viewingLiaison.isAvailable ? 'bg-green-500/15 text-green-400 border border-green-500/25' : 'bg-white/5 text-gray-400 border border-white/10'}`}>
                                        {viewingLiaison.isAvailable ? '● Available' : '● Inactive'}
                                    </span>
                                </div>
                                <div className="flex justify-center sm:justify-start items-center gap-3 text-xs text-gray-400">
                                    <span className="text-yellow-400 font-bold">⭐ {Number(viewingLiaison.rating || 5.0).toFixed(1)} Rating</span>
                                    <span>•</span>
                                    <span>{viewingLiaison.totalJobs || 0} Jobs Done</span>
                                </div>
                                {viewingLiaison.phone && <p className="text-xs font-bold text-gray-400">📞 Phone: <span className="font-mono text-white ml-1">{viewingLiaison.phone}</span></p>}
                            </div>
                        </div>

                        {viewingLiaison.description && (
                            <div className="space-y-1.5">
                                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5"><UserCheck size={10} className="text-emerald-400" /> Bio / Professional Summary</h4>
                                <p className="text-xs text-gray-300 leading-relaxed bg-white/[0.01] border border-white/5 p-3.5 rounded-xl">{viewingLiaison.description}</p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5"><MapPin size={10} className="text-emerald-400" /> Assigned LTO Branches</h4>
                                <div className="bg-white/[0.01] border border-white/5 p-3.5 rounded-xl min-h-[100px] max-h-48 overflow-y-auto space-y-1.5">
                                    {viewingLiaison.assignedBranches && viewingLiaison.assignedBranches.length > 0 ? (
                                        viewingLiaison.assignedBranches.map(bId => {
                                            const b = (db?.liaisonBranches || []).find(x => x.id === bId);
                                            const name = b ? b.name : bId;
                                            return (
                                                <div key={bId} className="text-xs text-white flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                                    <span className="truncate">{name}</span>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <p className="text-xs text-gray-600 italic">No branches assigned</p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5"><FileText size={10} className="text-emerald-400" /> Service Capabilities</h4>
                                <div className="bg-white/[0.01] border border-white/5 p-3.5 rounded-xl min-h-[100px] max-h-48 overflow-y-auto flex flex-wrap gap-1.5 items-start content-start">
                                    {viewingLiaison.assignedServices && viewingLiaison.assignedServices.length > 0 ? (
                                        viewingLiaison.assignedServices.map((svc, i) => (
                                            <span key={i} className="text-[10px] bg-emerald-500/10 border border-emerald-500/15 rounded-lg px-2.5 py-1 text-emerald-400 font-bold">{svc}</span>
                                        ))
                                    ) : (
                                        <p className="text-xs text-gray-600 italic w-full">No services assigned</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-3 border-t border-white/5">
                            <button type="button" onClick={() => setViewingLiaison(undefined)} className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-black hover:bg-emerald-500 transition-all text-xs shadow-lg shadow-emerald-600/20">Close Profile</button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default AdminCatalogScreen;
