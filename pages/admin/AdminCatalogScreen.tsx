import React, { useState, useMemo, useEffect } from 'react';
import { Service, Part } from '../../types';
import Modal from '../../components/admin/Modal';
import { useDatabase } from '../../context/DatabaseContext';
import Spinner from '../../components/Spinner';
import { fileToBase64 } from '../../utils/fileUtils';
import EnhancedKPICard from '../../components/admin/EnhancedKPICard';
import { Plus, Search, Package, Table as WrenchPen, TrendingUp, AlertCircle, ShoppingBag, Edit, Trash2, Camera, User, BadgeCheck, Clock, Shield, Tag, Star, DollarSign, ArrowUpDown, ChevronDown, Wrench, Download, Upload, Filter, Edit2, Check, X, Copy, Grid, List, ToggleLeft, ToggleRight, Eye, Image as ImageIcon, MoreVertical } from 'lucide-react';
import { getFallbackImageForCategory } from '../../utils/fallbackImages';

type SortableKeys = 'name' | 'price' | 'category' | 'stock' | 'sku';
import { compressAndEncodeImage } from '../../utils/fileUtils';
import { storageService } from '../../services/StorageService';

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
    
    const [newServiceCategory, setNewServiceCategory] = useState('');
    const [newPartCategory, setNewPartCategory] = useState('');

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
        <Modal title="Manage Catalog Categories" isOpen={true} onClose={onClose}>
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
                                return (
                                    <div key={cat} className="flex items-center justify-between bg-white/5 border border-white/5 px-4 py-2.5 rounded-xl hover:bg-white/10 transition-colors group">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-white font-bold">{cat}</span>
                                            <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider ${count > 0 ? 'bg-primary/20 text-primary border border-orange-500/20' : 'bg-white/5 text-gray-500 border border-white/5'}`}>
                                                {count} {count === 1 ? 'service' : 'services'}
                                            </span>
                                        </div>
                                        <button 
                                            onClick={() => handleDelete('service', cat)} 
                                            className="text-gray-500 hover:text-red-400 p-1.5 hover:bg-red-500/10 rounded-lg transition-all"
                                            title="Delete Category"
                                        >
                                            <Trash2 size={14} />
                                        </button>
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
                                return (
                                    <div key={cat} className="flex items-center justify-between bg-white/5 border border-white/5 px-4 py-2.5 rounded-xl hover:bg-white/10 transition-colors group">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-white font-bold">{cat}</span>
                                            <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider ${count > 0 ? 'bg-primary/20 text-primary border border-orange-500/20' : 'bg-white/5 text-gray-500 border border-white/5'}`}>
                                                {count} {count === 1 ? 'item' : 'items'}
                                            </span>
                                        </div>
                                        <button 
                                            onClick={() => handleDelete('part', cat)} 
                                            className="text-gray-500 hover:text-red-400 p-1.5 hover:bg-red-500/10 rounded-lg transition-all"
                                            title="Delete Category"
                                        >
                                            <Trash2 size={14} />
                                        </button>
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
            
            <div className="flex justify-end gap-3 mt-8 border-t border-white/5 pt-5">
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

const ServiceForm: React.FC<{ service?: Service; onSave: (service: any) => void; onCancel: () => void; categories: string[] }> = ({ service, onSave, onCancel, categories }) => {
    const { db, updateSettings } = useDatabase();
    const defaultServices = ['Maintenance', 'Repair', 'Emergency', 'Diagnostics', 'Specialty Services', 'Cleaning & Detailing', 'Liason Services'];
    
    // Realtime synced categories with fallback default list
    const activeCategories = useMemo(() => {
        const list = (db?.settings?.serviceCategories || categories).filter(c => c !== 'all');
        return list.length > 0 ? list : defaultServices;
    }, [db?.settings?.serviceCategories, categories]);

    const [formData, setFormData] = useState({ 
        id: service?.id, 
        name: service?.name || '', 
        description: service?.description || '', 
        price: service?.price ?? '', 
        estimatedTime: service?.estimatedTime || '', 
        category: service?.category || (activeCategories[0] || ''), 
        imageUrl: service?.imageUrl || '', 
        icon: service?.icon || '', 
    });
    
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [isUploading, setIsUploading] = useState(false);
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');

    const validate = (data = formData) => {
        const newErrors: { [key: string]: string } = {};
        if (!data.name.trim()) newErrors.name = "Service name is required.";
        if (!data.description.trim()) newErrors.description = "Description is required.";
        if (data.price === '' || Number(data.price) < 0) newErrors.price = "Price is required.";
        if (!data.estimatedTime.trim()) newErrors.estimatedTime = "Estimated time is required.";
        if (!data.category.trim()) newErrors.category = "Category is required.";
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
            onSave({ ...formData, price: Number(formData.price) });
        }
    };

    const isSaveDisabled = !formData.name || !formData.description || formData.price === '' || !formData.estimatedTime || !formData.category || !formData.imageUrl || isUploading;

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
                        <label className="text-xs font-bold text-gray-400  tracking-wider flex items-center gap-2">
                            <Tag size={14} /> Service Name
                        </label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="e.g. Full Synthetic Oil Change"
                            className={`w-full p-4 bg-black/40 border rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-primary focus:border-transparent transition-all ${errors.name ? 'border-red-500/50' : 'border-white/10'}`}
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-gray-400 tracking-wider flex items-center gap-2">
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
                                    name="category"
                                    value={formData.category}
                                    onChange={handleChange}
                                    className={`w-full p-4 bg-black/40 border rounded-xl text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all appearance-none pr-10 ${errors.category ? 'border-red-500/50' : 'border-white/10'}`}
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
                                    value={newCategoryName}
                                    onChange={e => setNewCategoryName(e.target.value)}
                                    placeholder="Enter new category name..."
                                    className="flex-grow p-4 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-xs"
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
                    <label className="text-xs font-bold text-gray-400  tracking-wider flex items-center gap-2">
                        <Package size={14} /> Description
                    </label>
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="Describe the service details, what's included, and any prerequisites..."
                        rows={3}
                        className={`w-full p-4 bg-black/40 border rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-primary focus:border-transparent resize-none transition-all ${errors.description ? 'border-red-500/50' : 'border-white/10'}`}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400  tracking-wider flex items-center gap-2">
                            <DollarSign size={14} /> Base Price (₱)
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                name="price"
                                value={formData.price}
                                onChange={handleChange}
                                placeholder="1500"
                                className={`w-full p-4 bg-black/40 border rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-primary focus:border-transparent transition-all ${errors.price ? 'border-red-500/50' : 'border-white/10'}`}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400  tracking-wider flex items-center gap-2">
                            <Wrench size={14} /> Est. Duration
                        </label>
                        <input
                            type="text"
                            name="estimatedTime"
                            value={formData.estimatedTime}
                            onChange={handleChange}
                            placeholder="e.g. 45-60 mins"
                            className={`w-full p-4 bg-black/40 border rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-primary focus:border-transparent transition-all ${errors.estimatedTime ? 'border-red-500/50' : 'border-white/10'}`}
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
                        <label className="text-xs font-bold text-gray-400  tracking-wider flex items-center gap-2">
                            <Package size={14} /> Part Name
                        </label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="e.g. Premium Brake Pads"
                            className={`w-full p-4 bg-black/40 border rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-primary focus:border-transparent transition-all ${errors.name ? 'border-red-500/50' : 'border-white/10'}`}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400  tracking-wider flex items-center gap-2">
                            <Tag size={14} /> SKU
                        </label>
                        <input
                            type="text"
                            name="sku"
                            value={formData.sku}
                            onChange={handleChange}
                            placeholder="SKU-XXXX-X"
                            className={`w-full p-4 bg-black/40 border rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-primary focus:border-transparent transition-all ${errors.sku ? 'border-red-500/50' : 'border-white/10'}`}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-gray-400 tracking-wider flex items-center gap-2">
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
                                    name="category"
                                    value={formData.category}
                                    onChange={handleChange}
                                    className={`w-full p-4 bg-black/40 border rounded-xl text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all appearance-none pr-10 ${errors.category ? 'border-red-500/50' : 'border-white/10'}`}
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
                                    value={newCategoryName}
                                    onChange={e => setNewCategoryName(e.target.value)}
                                    placeholder="Enter new category name..."
                                    className="flex-grow p-4 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-xs"
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
                        <label className="text-xs font-bold text-gray-400  tracking-wider flex items-center gap-2">
                            <Check size={14} /> Brand/Manufacturer
                        </label>
                        <input
                            type="text"
                            name="brand"
                            value={formData.brand}
                            onChange={handleChange}
                            placeholder="e.g. Brembo, Bosch"
                            className="w-full p-4 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400  tracking-wider flex items-center gap-2">
                        <Package size={14} /> Description
                    </label>
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="Key features, compatibility, and specifications..."
                        rows={2}
                        className="w-full p-4 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-primary focus:border-transparent resize-none transition-all"
                    />
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400  tracking-wider flex items-center gap-2">
                            <DollarSign size={14} /> Price (₱)
                        </label>
                        <input
                            type="number"
                            name="price"
                            value={formData.price}
                            onChange={handleChange}
                            placeholder="0.00"
                            className={`w-full p-4 bg-black/40 border rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-primary focus:border-transparent transition-all ${errors.price ? 'border-red-500/50' : 'border-white/10'}`}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-orange-400  tracking-wider flex items-center gap-2">
                            <TrendingUp size={14} /> Sale (₱)
                        </label>
                        <input
                            type="number"
                            name="salesPrice"
                            value={formData.salesPrice}
                            onChange={handleChange}
                            placeholder="Optional"
                            className={`w-full p-4 bg-black/40 border rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all ${errors.salesPrice ? 'border-red-500/50' : 'border-white/10'}`}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400  tracking-wider flex items-center gap-2">
                            <Package size={14} /> Stock
                        </label>
                        <input
                            type="number"
                            name="stock"
                            value={formData.stock}
                            onChange={handleChange}
                            placeholder="Qty"
                            className={`w-full p-4 bg-black/40 border rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-primary focus:border-transparent transition-all ${errors.stock ? 'border-red-500/50' : 'border-white/10'}`}
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
            <div className="relative h-56 overflow-hidden">
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

            <div className="p-6 flex-grow flex flex-col relative">
                <h3 className="font-bold text-white text-xl mb-2 leading-tight group-hover:text-primary transition-colors">{item.name}</h3>
                <p className="text-sm text-gray-400 mb-4 line-clamp-2">{item.description}</p>

                <div className="mt-auto pt-4 border-t border-white/5">
                    <div className="flex items-end justify-between">
                        <div>
                            {hasSalesPrice ? (
                                <div className="flex flex-col">
                                    <span className="text-gray-500 text-xs font-bold line-through">₱{item.price.toLocaleString()}</span>
                                    <span className="text-2xl font-black text-white">₱{(item as Part).salesPrice!.toLocaleString()}</span>
                                </div>
                            ) : (
                                <span className="text-2xl font-black text-white">₱{item.price.toLocaleString()}</span>
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

const AdminCatalogScreen: React.FC = () => {
    const { db, addService, updateService, deleteService, addPart, updatePart, deletePart, loading } = useDatabase();
    const [activeTab, setActiveTab] = useState<'services' | 'parts'>('services');
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' }>({ key: 'name', direction: 'ascending' });

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
    // New state for enhanced features
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

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

    const stats = useMemo(() => {
        if (!db) return { totalServices: 0, totalParts: 0, totalValue: 0, lowStock: 0 };

        const totalServices = db.services.length;
        const totalParts = db.parts.length;
        const totalValue = db.parts.reduce((sum, part) => sum + (part.price * part.stock), 0);
        const lowStock = db.parts.filter(p => p.stock < 10).length;

        return { totalServices, totalParts, totalValue, lowStock };
    }, [db]);

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

    const handleTabChange = (tab: 'services' | 'parts') => { setActiveTab(tab); setSearchQuery(''); setCategoryFilter('all'); };

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
            {/* Header */}
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                    <h1 className="text-5xl font-black text-white tracking-tighter  leading-none">Catalog Management</h1>
                    <div className="flex items-center gap-2 mt-4">
                        <div className="h-1 w-12 bg-primary rounded-full"></div>
                        <p className="text-gray-500 font-bold  tracking-[0.3em] text-[10px]">Inventory & Services Control</p>
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <EnhancedKPICard
                    title="Total Services"
                    value={stats.totalServices}
                    icon={<Wrench size={24} className="text-white" />}
                    gradient="bg-gradient-to-br from-blue-600 to-blue-800"
                    trend={{ value: 12, isPositive: true }}
                    subtitle="Active offerings"
                />
                <EnhancedKPICard
                    title="Total Parts"
                    value={stats.totalParts}
                    icon={<Package size={24} className="text-white" />}
                    gradient="bg-gradient-to-br from-green-600 to-green-800"
                    trend={{ value: 8, isPositive: true }}
                    subtitle="In inventory"
                />
                <EnhancedKPICard
                    title="Inventory Value"
                    value={`₱${stats.totalValue.toLocaleString()}`}
                    icon={<DollarSign size={24} className="text-white" />}
                    gradient="bg-gradient-to-br from-emerald-600 to-emerald-800"
                    trend={{ value: 15, isPositive: true }}
                    subtitle="Total stock value"
                />
                <EnhancedKPICard
                    title="Low Stock Items"
                    value={stats.lowStock}
                    icon={<TrendingUp size={24} className="text-white" />}
                    gradient="bg-gradient-to-br from-orange-600 to-orange-800"
                    subtitle="Need restock"
                />
            </div>

            {/* Tabs and Action Buttons */}
            <div className="flex items-center justify-between gap-4 mb-8">
                {/* Tabs */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => handleTabChange('services')}
                        className={`px-8 py-4 rounded-[1.5rem] font-black  tracking-widest text-[10px] transition-all flex items-center gap-3 ${activeTab === 'services'
                            ? 'bg-primary text-white shadow-lg shadow-primary/25 scale-105'
                            : 'bg-white/5 text-gray-500 hover:text-white hover:bg-white/10'
                            }`}
                    >
                        <Wrench size={18} />
                        Services ({db.services.length})
                    </button>
                    <button
                        onClick={() => handleTabChange('parts')}
                        className={`px-8 py-4 rounded-[1.5rem] font-black  tracking-widest text-[10px] transition-all flex items-center gap-3 ${activeTab === 'parts'
                            ? 'bg-primary text-white shadow-lg shadow-primary/25 scale-105'
                            : 'bg-white/5 text-gray-500 hover:text-white hover:bg-white/10'
                            }`}
                    >
                        <Package size={18} />
                        Parts & Tools ({db.parts.length})
                    </button>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4">
                    <button onClick={exportToCSV} className="px-6 py-4 bg-white/5 hover:bg-white/10 text-white rounded-[1.5rem] font-black  tracking-widest text-[10px] border border-white/5 transition-all flex items-center gap-3 active:scale-95">
                        <Download size={18} />
                        Export CSV
                    </button>
                    <button onClick={() => setIsCategoryModalOpen(true)} className="px-6 py-4 bg-white/5 hover:bg-white/10 text-white rounded-[1.5rem] font-black  tracking-widest text-[10px] border border-white/5 transition-all flex items-center gap-3 active:scale-95">
                        <Tag size={18} />
                        Categories
                    </button>
                    <button onClick={activeTab === 'services' ? () => handleOpenServiceModal() : () => handleOpenPartModal()} className="px-6 py-4 bg-primary hover:bg-orange-600 text-white rounded-[1.5rem] font-black  tracking-widest text-[10px] transition-all shadow-2xl shadow-primary/20 flex items-center gap-3 active:scale-95 hover:scale-105">
                        <Plus size={18} strokeWidth={3} />
                        Add {activeTab === 'services' ? 'Service' : 'Part'}
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-[#121212]/80 backdrop-blur-2xl border border-white/10 p-8 rounded-[2.5rem] mb-8 relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-[2.5rem] blur opacity-5 group-hover:opacity-10 transition duration-1000"></div>
                <div className="flex flex-col lg:flex-row gap-6 relative z-10">
                    <div className="flex-1 relative">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                        <input
                            type="text"
                            placeholder={activeTab === 'services' ? "Search services..." : "Search parts or SKU..."}
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-16 pr-6 py-4 bg-white/5 border border-white/5 rounded-2xl text-white font-bold placeholder-gray-600 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                        />
                    </div>
                    <select
                        value={categoryFilter}
                        onChange={e => setCategoryFilter(e.target.value)}
                        className="bg-white/5 border border-white/5 rounded-2xl px-8 py-4 text-white font-bold outline-none focus:border-primary appearance-none cursor-pointer hover:bg-white/10 transition-colors"
                    >
                        <option value="all">All Categories</option>
                        {activeTab === 'services'
                            ? serviceCategories.map(cat => cat !== 'all' && <option key={cat} value={cat}>{cat}</option>)
                            : partCategories.map(cat => cat !== 'all' && <option key={cat} value={cat}>{cat}</option>)
                        }
                    </select>

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                        className="bg-white/5 border border-white/5 rounded-2xl px-8 py-4 text-white font-bold outline-none focus:border-primary appearance-none cursor-pointer hover:bg-white/10 transition-colors"
                    >
                        <option value="all">All Status</option>
                        <option value="active">Active Only</option>
                        <option value="inactive">Inactive Only</option>
                    </select>

                    {/* View Mode Toggle */}
                    <div className="flex items-center bg-white/5 rounded-2xl p-1 border border-white/5">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-3 rounded-xl transition-all ${viewMode === 'list' ? 'bg-primary text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                            title="List View"
                        >
                            <List size={20} />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-3 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-primary text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                            title="Grid View"
                        >
                            <Grid size={20} />
                        </button>
                    </div>

                    <div className="flex items-center bg-white/5 rounded-2xl p-1 border border-white/5">
                        <button onClick={() => requestSort('name')} className={`p-3 rounded-xl transition-all ${sortConfig.key === 'name' ? 'bg-primary text-white shadow-lg' : 'text-gray-500 hover:text-white'}`} title="Sort by Name">
                            <ArrowUpDown size={20} />
                        </button>
                        <button onClick={() => requestSort('price')} className={`p-3 rounded-xl transition-all ${sortConfig.key === 'price' ? 'bg-primary text-white shadow-lg' : 'text-gray-500 hover:text-white'}`} title="Sort by Price">
                            <DollarSign size={20} />
                        </button>
                    </div>

                    {activeFiltersCount > 0 && (
                        <button
                            onClick={clearFilters}
                            className="px-6 py-4 bg-red-500/10 text-red-500 rounded-2xl font-black  tracking-widest text-[10px] hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {/* Content Area */}
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
                    <div className="overflow-x-auto">
                        {activeTab === 'services' ? (
                            filteredServices.length > 0 ? (
                                <table className="w-full">
                                    <thead className="bg-black/40 sticky top-0 z-10">
                                        <tr>
                                            <th className="p-4 text-left">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedItems.length === filteredServices.length}
                                                    onChange={handleSelectAll}
                                                    className="w-4 h-4 rounded border-white/20 bg-white/5 checked:bg-primary"
                                                />
                                            </th>
                                            <th className="p-4 text-left text-xs font-black text-gray-400  tracking-wider">Image</th>
                                            <th className="p-4 text-left text-xs font-black text-gray-400  tracking-wider cursor-pointer hover:text-primary" onClick={() => requestSort('name')}>
                                                Name {getSortIndicator('name')}
                                            </th>
                                            <th className="p-4 text-left text-xs font-black text-gray-400  tracking-wider cursor-pointer hover:text-primary" onClick={() => requestSort('category')}>
                                                Category {getSortIndicator('category')}
                                            </th>
                                            <th className="p-4 text-left text-xs font-black text-gray-400  tracking-wider cursor-pointer hover:text-primary" onClick={() => requestSort('price')}>
                                                Price {getSortIndicator('price')}
                                            </th>
                                            <th className="p-4 text-left text-xs font-black text-gray-400  tracking-wider">Duration</th>
                                            <th className="p-4 text-left text-xs font-black text-gray-400  tracking-wider">Status</th>
                                            <th className="p-4 text-right text-xs font-black text-gray-400  tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredServices.map((service, idx) => (
                                            <tr
                                                key={service.id}
                                                className={`border-b border-white/5 hover:bg-white/5 transition-colors ${idx % 2 === 0 ? 'bg-black/20' : 'bg-transparent'}`}
                                            >
                                                <td className="p-4">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedItems.includes(service.id)}
                                                        onChange={() => handleSelectItem(service.id)}
                                                        className="w-4 h-4 rounded border-white/20 bg-white/5 checked:bg-primary"
                                                    />
                                                </td>
                                                <td className="p-4">
                                                    <img src={service.imageUrl || getFallbackImageForCategory(service.category)} alt={service.name} className="w-16 h-16 object-cover rounded-full" onError={(e) => { (e.target as HTMLImageElement).src = getFallbackImageForCategory(service.category); }} />
                                                </td>
                                                <td className="p-4">
                                                    <div className="font-bold text-white">{service.name}</div>
                                                    <div className="text-xs text-gray-500 max-w-[240px] truncate">{service.description}</div>
                                                </td>
                                                <td className="p-4">
                                                    <span className="px-3 py-1 bg-primary/20 border border-primary/30 text-primary text-xs font-bold rounded-lg whitespace-nowrap inline-block">
                                                        {service.category}
                                                    </span>
                                                </td>
                                                <td className="p-4 font-bold text-white">₱{service.price.toLocaleString()}</td>
                                                <td className="p-4 text-gray-400 text-sm">{service.estimatedTime}</td>
                                                <td className="p-4">
                                                    <button
                                                        onClick={() => handleToggleServiceStatus(service)}
                                                        className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 transition-all ${service.isActive !== false
                                                            ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                                            : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
                                                            }`}
                                                    >
                                                        {service.isActive !== false ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                                                        {service.isActive !== false ? 'Active' : 'Inactive'}
                                                    </button>
                                                </td>
                                                <td className="p-4 relative">
                                                    <div className="flex items-center justify-end">
                                                        <div className="relative inline-block text-left">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setActiveDropdownId(activeDropdownId === `service-${service.id}` ? null : `service-${service.id}`);
                                                                }}
                                                                className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all focus:outline-none"
                                                                title="Actions"
                                                            >
                                                                <MoreVertical size={16} />
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
                                            <th className="p-4 text-left">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedItems.length === filteredParts.length}
                                                    onChange={handleSelectAll}
                                                    className="w-4 h-4 rounded border-white/20 bg-white/5 checked:bg-primary"
                                                />
                                            </th>
                                            <th className="p-4 text-left text-xs font-black text-gray-400  tracking-wider">Image</th>
                                            <th className="p-4 text-left text-xs font-black text-gray-400  tracking-wider cursor-pointer hover:text-primary" onClick={() => requestSort('name')}>
                                                Name {getSortIndicator('name')}
                                            </th>
                                            <th className="p-4 text-left text-xs font-black text-gray-400  tracking-wider cursor-pointer hover:text-primary" onClick={() => requestSort('sku')}>
                                                SKU {getSortIndicator('sku')}
                                            </th>
                                            <th className="p-4 text-left text-xs font-black text-gray-400  tracking-wider cursor-pointer hover:text-primary" onClick={() => requestSort('category')}>
                                                Category {getSortIndicator('category')}
                                            </th>
                                            <th className="p-4 text-left text-xs font-black text-gray-400  tracking-wider cursor-pointer hover:text-primary" onClick={() => requestSort('price')}>
                                                Price {getSortIndicator('price')}
                                            </th>
                                            <th className="p-4 text-left text-xs font-black text-gray-400  tracking-wider cursor-pointer hover:text-primary" onClick={() => requestSort('stock')}>
                                                Stock {getSortIndicator('stock')}
                                            </th>
                                            <th className="p-4 text-left text-xs font-black text-gray-400  tracking-wider">Brand</th>
                                            <th className="p-4 text-left text-xs font-black text-gray-400  tracking-wider">Status</th>
                                            <th className="p-4 text-right text-xs font-black text-gray-400  tracking-wider">Actions</th>
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
                                                    <td className="p-4">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedItems.includes(part.id)}
                                                            onChange={() => handleSelectItem(part.id)}
                                                            className="w-4 h-4 rounded border-white/20 bg-white/5 checked:bg-primary"
                                                        />
                                                    </td>
                                                    <td className="p-4">
                                                        <img src={part.imageUrls[0]} alt={part.name} className="w-16 h-16 object-cover rounded-full" />
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="font-bold text-white">{part.name}</div>
                                                        {part.salesPrice && (
                                                            <span className="text-xs text-orange-400 font-bold">SALE!</span>
                                                        )}
                                                    </td>
                                                    <td className="p-4 text-gray-400 font-mono text-sm">{part.sku}</td>
                                                    <td className="p-4">
                                                        <span className="px-3 py-1 bg-primary/20 border border-primary/30 text-primary text-xs font-bold rounded-lg whitespace-nowrap inline-block">
                                                            {part.category}
                                                        </span>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="font-bold text-white">₱{part.price.toLocaleString()}</div>
                                                        {part.salesPrice && (
                                                            <div className="text-xs text-orange-400 font-bold">₱{part.salesPrice.toLocaleString()}</div>
                                                        )}
                                                    </td>
                                                    <td className="p-4">
                                                        <span className={`px-3 py-1 rounded-lg text-xs font-bold ${isLowStock
                                                            ? 'bg-red-500/20 text-red-400'
                                                            : 'bg-green-500/20 text-green-400'
                                                            }`}>
                                                            {part.stock} units
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-gray-400 text-sm">{part.brand || '—'}</td>
                                                    <td className="p-4">
                                                        <button
                                                            onClick={() => handleTogglePartStatus(part)}
                                                            className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 transition-all ${part.isActive !== false
                                                                ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                                                : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
                                                                }`}
                                                        >
                                                            {part.isActive !== false ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                                                            {part.isActive !== false ? 'Active' : 'Inactive'}
                                                        </button>
                                                    </td>
                                                    <td className="p-4 relative">
                                                         <div className="flex items-center justify-end">
                                                             <div className="relative inline-block text-left">
                                                                 <button
                                                                     onClick={(e) => {
                                                                         e.stopPropagation();
                                                                         setActiveDropdownId(activeDropdownId === `part-${part.id}` ? null : `part-${part.id}`);
                                                                     }}
                                                                     className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all focus:outline-none"
                                                                     title="Actions"
                                                                 >
                                                                     <MoreVertical size={16} />
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

            {isCategoryModalOpen && <CategoryManagerModal onClose={() => setIsCategoryModalOpen(false)} />}
            <Modal title={editingService ? 'Edit Service' : 'Add Service'} isOpen={isServiceModalOpen} onClose={handleCloseServiceModal}>
                <ServiceForm service={editingService} onSave={handleSaveService} onCancel={handleCloseServiceModal} categories={(db?.settings?.serviceCategories || []).filter(c => c !== 'all')} />
            </Modal>
            <Modal title={editingPart ? 'Edit Part' : 'Add Part'} isOpen={isPartModalOpen} onClose={handleClosePartModal}>
                <PartForm part={editingPart} onSave={handleSavePart} onCancel={handleClosePartModal} categories={(db?.settings?.partCategories || []).filter(c => c !== 'all')} />
            </Modal>
        </div>
    );
};

export default AdminCatalogScreen;
