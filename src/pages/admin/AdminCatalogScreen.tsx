import React, { useState, useMemo } from 'react';
import { Service, Part } from '../../types';
import Modal from '../../components/admin/Modal';
import { useDatabase } from '../../context/DatabaseContext';
import Spinner from '../../components/Spinner';
import { fileToBase64 } from '../../utils/fileUtils';
import { SERVICE_ICONS } from '../../utils/serviceIcons';

// --- Reusable Components ---

const StatCard: React.FC<{ title: string; value: number | string; icon: React.ReactNode; subtitle?: string; prefix?: string }> = ({ title, value, icon, subtitle, prefix }) => (
    <div className="glass-card p-6 flex items-center gap-4 group hover:scale-[1.02] transition-all duration-300">
        <div className="w-12 h-12 rounded-xl bg-admin-accent/20 flex items-center justify-center text-admin-accent group-hover:scale-110 transition-transform duration-300 shadow-glow-sm">
            {icon}
        </div>
        <div>
            <div className="flex items-baseline gap-1">
                {prefix && <span className="text-lg font-semibold text-gray-400">{prefix}</span>}
                <p className="text-3xl font-bold text-white mb-1 tracking-tight">{value}</p>
            </div>
            <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">{title}</p>
            {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
    </div>
);

const CategoryManagerModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { db, updateSettings } = useDatabase();
    const [newServiceCategory, setNewServiceCategory] = useState('');
    const [newPartCategory, setNewPartCategory] = useState('');

    if (!db) return null;

    const handleAddServiceCategory = () => {
        if (newServiceCategory.trim()) {
            updateSettings({ serviceCategories: [...db.settings.serviceCategories, newServiceCategory.trim()] });
            setNewServiceCategory('');
        }
    };

    const handleAddPartCategory = () => {
        if (newPartCategory.trim()) {
            updateSettings({ partCategories: [...db.settings.partCategories, newPartCategory.trim()] });
            setNewPartCategory('');
        }
    };

    const handleDeleteServiceCategory = (cat: string) => {
        updateSettings({ serviceCategories: db.settings.serviceCategories.filter(c => c !== cat) });
    };

    const handleDeletePartCategory = (cat: string) => {
        updateSettings({ partCategories: db.settings.partCategories.filter(c => c !== cat) });
    };

    return (
        <Modal title="Manage Categories" isOpen={true} onClose={onClose}>
            <div className="space-y-8">
                {/* Service Categories */}
                <div>
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <span className="w-2 h-6 bg-admin-accent rounded-full"></span>
                        Service Categories
                    </h3>
                    <div className="flex gap-2 mb-4">
                        <input
                            type="text"
                            value={newServiceCategory}
                            onChange={e => setNewServiceCategory(e.target.value)}
                            placeholder="New Service Category"
                            className="flex-1 p-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-admin-accent/50 transition-all"
                        />
                        <button onClick={handleAddServiceCategory} className="px-4 py-2 bg-admin-accent text-white rounded-xl font-bold hover:bg-orange-600 transition-all">Add</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {db.settings.serviceCategories.map(cat => (
                            <span key={cat} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-sm text-gray-300 flex items-center gap-2 group hover:border-red-500/50 hover:bg-red-500/10 transition-all">
                                {cat}
                                <button onClick={() => handleDeleteServiceCategory(cat)} className="text-gray-500 hover:text-red-400">&times;</button>
                            </span>
                        ))}
                    </div>
                </div>

                {/* Part Categories */}
                <div>
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <span className="w-2 h-6 bg-blue-500 rounded-full"></span>
                        Part Categories
                    </h3>
                    <div className="flex gap-2 mb-4">
                        <input
                            type="text"
                            value={newPartCategory}
                            onChange={e => setNewPartCategory(e.target.value)}
                            placeholder="New Part Category"
                            className="flex-1 p-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                        />
                        <button onClick={handleAddPartCategory} className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all">Add</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {db.settings.partCategories.map(cat => (
                            <span key={cat} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-sm text-gray-300 flex items-center gap-2 group hover:border-red-500/50 hover:bg-red-500/10 transition-all">
                                {cat}
                                <button onClick={() => handleDeletePartCategory(cat)} className="text-gray-500 hover:text-red-400">&times;</button>
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </Modal>
    );
};

const DeleteConfirmationModal: React.FC<{ itemName: string; itemType: 'service' | 'part'; onClose: () => void; onConfirm: () => void; impactCount: number }> = ({ itemName, itemType, onClose, onConfirm, impactCount }) => (
    <Modal title={`Delete ${itemType === 'service' ? 'Service' : 'Part'}`} isOpen={true} onClose={onClose}>
        <div className="space-y-4 text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h3 className="text-xl font-bold text-white">Delete "{itemName}"?</h3>
            <p className="text-gray-400">Are you sure you want to delete this {itemType}? This action cannot be undone.</p>
            {impactCount > 0 && (
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-left">
                    <p className="text-red-400 font-bold text-sm mb-1">Warning: Active Dependencies</p>
                    <p className="text-red-300/80 text-xs">This item is linked to <strong>{impactCount}</strong> existing booking(s). Deleting it may affect historical records.</p>
                </div>
            )}
            <div className="flex justify-center gap-4 pt-4">
                <button onClick={onClose} className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all">Cancel</button>
                <button onClick={onConfirm} className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg hover:shadow-red-500/20 transition-all">Delete Forever</button>
            </div>
        </div>
    </Modal>
);

const ServiceForm: React.FC<{ service?: Service; onSave: (service: any) => void; onCancel: () => void; categories: string[] }> = ({ service, onSave, onCancel, categories }) => {
    const [formData, setFormData] = useState({
        id: service?.id || '',
        name: service?.name || '',
        description: service?.description || '',
        price: service?.price ?? '',
        estimatedTime: service?.estimatedTime || '',
        category: service?.category || (categories[0] || ''),
        imageUrl: service?.imageUrl || '',
        icon: service?.icon || ''
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [isUploading, setIsUploading] = useState(false);
    const [showIconPicker, setShowIconPicker] = useState(false);

    const validate = (data = formData) => {
        const newErrors: { [key: string]: string } = {};
        if (!data.name.trim()) newErrors.name = "Service name is required.";
        if (!data.description.trim()) newErrors.description = "Description is required.";
        if (data.price === '' || Number(data.price) < 0) newErrors.price = "Price must be a positive number.";
        if (!data.estimatedTime.trim()) newErrors.estimatedTime = "Estimated time is required.";
        if (!data.category.trim()) newErrors.category = "Category is required.";
        if (!data.imageUrl) newErrors.imageUrl = "Please upload an image for the service.";
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
            setIsUploading(true);
            try {
                const base64 = await fileToBase64(file);
                const newData = { ...formData, imageUrl: base64 };
                setFormData(newData);
                validate(newData);
            } catch (err) {
                setErrors(prev => ({ ...prev, imageUrl: 'Failed to process image.' }));
            } finally {
                setIsUploading(false);
            }
        }
    };

    const handleIconSelect = (iconSvg: string) => {
        const newData = { ...formData, icon: iconSvg };
        setFormData(newData);
        setShowIconPicker(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            const serviceData: any = {
                name: formData.name,
                description: formData.description,
                price: Number(formData.price),
                estimatedTime: formData.estimatedTime,
                category: formData.category,
                imageUrl: formData.imageUrl,
                icon: formData.icon
            };

            if (service?.id) {
                serviceData.id = service.id;
            }

            console.log('Saving service:', serviceData);
            onSave(serviceData);
        }
    };

    const isSaveDisabled = isUploading;

    return (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Service Image - MOVED TO TOP */}
            <div>
                <label className="block text-sm font-semibold text-white mb-2">Service Image *</label>
                <div className="glass-light border border-white/10 rounded-xl p-4">
                    <input
                        type="file"
                        onChange={handleFileChange}
                        accept="image/*"
                        disabled={isUploading}
                        className="w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-admin-accent file:text-white hover:file:bg-orange-600 file:transition-all file:cursor-pointer disabled:opacity-50"
                    />
                    {isUploading && <p className="text-admin-accent text-sm mt-2">Uploading...</p>}
                    {formData.imageUrl && (
                        <div className="mt-4 flex justify-center">
                            <img src={formData.imageUrl} alt="Service preview" className="rounded-lg max-h-40 w-auto border border-white/10" />
                        </div>
                    )}
                    {errors.imageUrl && <p className="text-red-400 text-xs mt-2">{errors.imageUrl}</p>}
                </div>
            </div>

            {/* Service Name */}
            <div>
                <label className="block text-sm font-semibold text-white mb-2">Service Name *</label>
                <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g., Oil Change, Brake Repair"
                    className={`w-full p-3 glass-light border rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-admin-accent transition-all ${errors.name ? 'border-red-500' : 'border-white/10'}`}
                />
                {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
            </div>

            {/* Description */}
            <div>
                <label className="block text-sm font-semibold text-white mb-2">Description *</label>
                <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Describe the service in detail..."
                    rows={3}
                    className={`w-full p-3 glass-light border rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-admin-accent transition-all resize-none ${errors.description ? 'border-red-500' : 'border-white/10'}`}
                />
                {errors.description && <p className="text-red-400 text-xs mt-1">{errors.description}</p>}
            </div>

            {/* Price and Estimated Time */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-semibold text-white mb-2">Price (₱) *</label>
                    <input
                        type="number"
                        name="price"
                        value={formData.price}
                        onChange={handleChange}
                        placeholder="0.00"
                        step="0.01"
                        className={`w-full p-3 glass-light border rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-admin-accent transition-all ${errors.price ? 'border-red-500' : 'border-white/10'}`}
                    />
                    {errors.price && <p className="text-red-400 text-xs mt-1">{errors.price}</p>}
                </div>
                <div>
                    <label className="block text-sm font-semibold text-white mb-2">Estimated Time *</label>
                    <input
                        type="text"
                        name="estimatedTime"
                        value={formData.estimatedTime}
                        onChange={handleChange}
                        placeholder="e.g., 30 mins, 1-2 hours"
                        className={`w-full p-3 glass-light border rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-admin-accent transition-all ${errors.estimatedTime ? 'border-red-500' : 'border-white/10'}`}
                    />
                    {errors.estimatedTime && <p className="text-red-400 text-xs mt-1">{errors.estimatedTime}</p>}
                </div>
            </div>

            {/* Category - ENHANCED DROPDOWN */}
            <div>
                <label className="block text-sm font-semibold text-white mb-2">Category *</label>
                <div className="relative">
                    <select
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        className={`w-full p-3 glass-light border rounded-xl text-white bg-transparent focus:ring-2 focus:ring-admin-accent transition-all appearance-none cursor-pointer pr-10 ${errors.category ? 'border-red-500' : 'border-white/10'}`}
                    >
                        <option value="" disabled className="bg-gray-800 text-gray-400">Select a category</option>
                        {categories.map(cat => (
                            <option key={cat} value={cat} className="bg-gray-800 text-white py-2">
                                {cat}
                            </option>
                        ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>
                {errors.category && <p className="text-red-400 text-xs mt-1">{errors.category}</p>}
            </div>


            {/* SVG Icon Selector - ENHANCED */}
            <div>
                <label className="block text-sm font-semibold text-white mb-2">Service Icon</label>
                <div className="glass-light border border-white/10 rounded-xl p-4">
                    {formData.icon && (
                        <div className="mb-3 flex items-center gap-3">
                            <div className="w-12 h-12 flex items-center justify-center glass-dark rounded-lg border border-white/10" dangerouslySetInnerHTML={{ __html: formData.icon }} />
                            <span className="text-sm text-gray-300">Selected Icon</span>
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={() => setShowIconPicker(!showIconPicker)}
                        className="w-full px-4 py-2 glass-light border border-white/10 rounded-lg text-white hover:bg-white/10 transition-all text-sm font-medium"
                    >
                        {showIconPicker ? 'Hide Icon Library' : 'Choose Icon from Library'}
                    </button>

                    {showIconPicker && (
                        <div className="mt-4 grid grid-cols-4 gap-3 max-h-64 overflow-y-auto custom-scrollbar p-2">
                            {SERVICE_ICONS.map((item, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => handleIconSelect(item.icon)}
                                    className={`p-3 glass-light border rounded-lg hover:border-admin-accent hover:bg-admin-accent/10 transition-all group ${formData.icon === item.icon ? 'border-admin-accent bg-admin-accent/20' : 'border-white/10'}`}
                                    title={item.name}
                                >
                                    <div className="w-8 h-8 mx-auto text-white group-hover:text-admin-accent transition-colors" dangerouslySetInnerHTML={{ __html: item.icon }} />
                                    <p className="text-xs text-gray-400 mt-1 truncate">{item.name}</p>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4 mt-6 pt-4 border-t border-white/10">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-6 py-2.5 glass-light border border-white/10 text-white rounded-xl hover:bg-white/10 transition-all font-medium"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="px-6 py-2.5 bg-gradient-to-r from-admin-accent to-orange-600 text-white rounded-xl hover:shadow-glow transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isSaveDisabled || isUploading}
                >
                    {service ? 'Update Service' : 'Create Service'}
                </button>
            </div>
        </form>
    );
};

const PartForm: React.FC<{ part?: Part; onSave: (part: any) => void; onCancel: () => void; categories: string[] }> = ({ part, onSave, onCancel, categories }) => {
    const [formData, setFormData] = useState({
        id: part?.id || '',
        name: part?.name || '',
        description: part?.description || '',
        price: part?.price ?? '',
        salesPrice: part?.salesPrice ?? '',
        category: part?.category || (categories[0] || ''),
        sku: part?.sku || '',
        imageUrl: part?.imageUrls?.[0] || '',
        stock: part?.stock ?? 0,
        brand: part?.brand || ''
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [isUploading, setIsUploading] = useState(false);

    const validate = (data = formData) => {
        const newErrors: { [key: string]: string } = {};
        if (!data.name.trim()) newErrors.name = "Part name is required.";
        if (data.price === '' || Number(data.price) < 0) newErrors.price = "Price must be a positive number.";
        if (data.salesPrice !== '' && Number(data.salesPrice) < 0) newErrors.salesPrice = "Sales price cannot be negative.";
        if (data.salesPrice !== '' && Number(data.salesPrice) >= Number(data.price)) newErrors.salesPrice = "Sales price must be less than the regular price.";
        if (data.stock === null || Number(data.stock) < 0) newErrors.stock = "Stock must be a non-negative number.";
        if (!data.category.trim()) newErrors.category = "Category is required.";
        if (!data.sku.trim()) newErrors.sku = "SKU is required.";
        if (!data.imageUrl) newErrors.imageUrl = "Please upload an image for the part.";
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
            setIsUploading(true);
            try {
                const base64 = await fileToBase64(file);
                const newData = { ...formData, imageUrl: base64 };
                setFormData(newData);
                validate(newData);
            } catch (err) {
                setErrors(prev => ({ ...prev, imageUrl: 'Failed to process image.' }));
            } finally {
                setIsUploading(false);
            }
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            const { imageUrl, ...rest } = formData;
            const partData: any = {
                ...rest,
                price: Number(formData.price),
                salesPrice: formData.salesPrice ? Number(formData.salesPrice) : undefined,
                stock: Number(formData.stock),
                imageUrls: [imageUrl]
            };

            if (part?.id) {
                partData.id = part.id;
            }

            console.log('Saving part:', partData);
            onSave(partData);
        }
    };

    const isSaveDisabled = isUploading;

    return (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Part Image - Top */}
            <div>
                <label className="block text-sm font-semibold text-white mb-2">Part Image *</label>
                <div className="glass-light border border-white/10 rounded-xl p-4">
                    <input
                        type="file"
                        onChange={handleFileChange}
                        accept="image/*"
                        disabled={isUploading}
                        className="w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-admin-accent file:text-white hover:file:bg-orange-600 file:transition-all file:cursor-pointer disabled:opacity-50"
                    />
                    {isUploading && <p className="text-admin-accent text-sm mt-2">Uploading...</p>}
                    {formData.imageUrl && (
                        <div className="mt-4 flex justify-center">
                            <img src={formData.imageUrl} alt="Part preview" className="rounded-lg max-h-40 w-auto border border-white/10" />
                        </div>
                    )}
                    {errors.imageUrl && <p className="text-red-400 text-xs mt-2">{errors.imageUrl}</p>}
                </div>
            </div>

            {/* Name */}
            <div>
                <label className="block text-sm font-semibold text-white mb-2">Part Name *</label>
                <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Part Name"
                    className={`w-full p-3 glass-light border rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-admin-accent transition-all ${errors.name ? 'border-red-500' : 'border-white/10'}`}
                />
                {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
            </div>

            {/* Description */}
            <div>
                <label className="block text-sm font-semibold text-white mb-2">Description</label>
                <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Description"
                    rows={3}
                    className="w-full p-3 glass-light border border-white/10 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-admin-accent transition-all resize-none"
                />
            </div>

            {/* Price & Sales Price */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-semibold text-white mb-2">Price (₱) *</label>
                    <input
                        type="number"
                        name="price"
                        value={formData.price}
                        onChange={handleChange}
                        placeholder="0.00"
                        className={`w-full p-3 glass-light border rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-admin-accent transition-all ${errors.price ? 'border-red-500' : 'border-white/10'}`}
                    />
                    {errors.price && <p className="text-red-400 text-xs mt-1">{errors.price}</p>}
                </div>
                <div>
                    <label className="block text-sm font-semibold text-white mb-2">Sales Price (Optional)</label>
                    <input
                        type="number"
                        name="salesPrice"
                        value={formData.salesPrice}
                        onChange={handleChange}
                        placeholder="0.00"
                        className={`w-full p-3 glass-light border rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-admin-accent transition-all ${errors.salesPrice ? 'border-red-500' : 'border-white/10'}`}
                    />
                    {errors.salesPrice && <p className="text-red-400 text-xs mt-1">{errors.salesPrice}</p>}
                </div>
            </div>

            {/* Category & Stock */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-semibold text-white mb-2">Category *</label>
                    <div className="relative">
                        <select
                            name="category"
                            value={formData.category}
                            onChange={handleChange}
                            className={`w-full p-3 glass-light border rounded-xl text-white bg-transparent focus:ring-2 focus:ring-admin-accent transition-all appearance-none cursor-pointer pr-10 ${errors.category ? 'border-red-500' : 'border-white/10'}`}
                        >
                            <option value="" disabled className="bg-gray-800 text-gray-400">Select a category</option>
                            {categories.map(cat => <option key={cat} value={cat} className="bg-gray-800 text-white py-2">{cat}</option>)}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                    {errors.category && <p className="text-red-400 text-xs mt-1">{errors.category}</p>}
                </div>
                <div>
                    <label className="block text-sm font-semibold text-white mb-2">Stock *</label>
                    <input
                        type="number"
                        name="stock"
                        value={formData.stock}
                        onChange={handleChange}
                        placeholder="0"
                        className={`w-full p-3 glass-light border rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-admin-accent transition-all ${errors.stock ? 'border-red-500' : 'border-white/10'}`}
                    />
                    {errors.stock && <p className="text-red-400 text-xs mt-1">{errors.stock}</p>}
                </div>
            </div>

            {/* SKU & Brand */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-semibold text-white mb-2">SKU *</label>
                    <input
                        type="text"
                        name="sku"
                        value={formData.sku}
                        onChange={handleChange}
                        placeholder="SKU"
                        className={`w-full p-3 glass-light border rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-admin-accent transition-all ${errors.sku ? 'border-red-500' : 'border-white/10'}`}
                    />
                    {errors.sku && <p className="text-red-400 text-xs mt-1">{errors.sku}</p>}
                </div>
                <div>
                    <label className="block text-sm font-semibold text-white mb-2">Brand</label>
                    <input
                        type="text"
                        name="brand"
                        value={formData.brand}
                        onChange={handleChange}
                        placeholder="Brand"
                        className="w-full p-3 glass-light border border-white/10 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-admin-accent transition-all"
                    />
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4 mt-6 pt-4 border-t border-white/10">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-6 py-2.5 glass-light border border-white/10 text-white rounded-xl hover:bg-white/10 transition-all font-medium"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="px-6 py-2.5 bg-gradient-to-r from-admin-accent to-orange-600 text-white rounded-xl hover:shadow-glow transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isSaveDisabled || isUploading}
                >
                    {part ? 'Update Part' : 'Create Part'}
                </button>
            </div>
        </form>
    );
};

const ItemCard: React.FC<{ item: Service | Part, onEdit: () => void, onDelete: () => void }> = ({ item, onEdit, onDelete }) => {
    const hasSalesPrice = 'salesPrice' in item && item.salesPrice && item.salesPrice > 0;
    const imageUrl = 'sku' in item ? item.imageUrls[0] : item.imageUrl;

    return (
        <div className="glass-card rounded-2xl overflow-hidden group relative flex flex-col border border-white/10 hover:shadow-glow transition-all duration-300 bg-black/20 backdrop-blur-md">
            <div className="relative h-48 overflow-hidden">
                <img src={imageUrl} alt={item.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />

                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-[-10px] group-hover:translate-y-0">
                    <button onClick={onEdit} className="p-2 rounded-full bg-white/10 hover:bg-blue-500/80 text-white backdrop-blur-md border border-white/20 shadow-lg transition-all transform hover:scale-110">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                            <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                        </svg>
                    </button>
                    <button onClick={onDelete} className="p-2 rounded-full bg-white/10 hover:bg-red-500/80 text-white backdrop-blur-md border border-white/20 shadow-lg transition-all transform hover:scale-110">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>

                {'sku' in item && (item as Part).stock <= 5 && (
                    <div className={`absolute bottom-2 left-2 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border ${(item as Part).stock === 0
                            ? 'bg-red-500/20 border-red-500/30 text-red-400'
                            : 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400'
                        }`}>
                        {(item as Part).stock === 0 ? 'Out of Stock' : 'Low Stock'}
                    </div>
                )}
            </div>

            <div className="p-5 flex-grow flex flex-col relative">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-white text-lg leading-tight line-clamp-2">{item.name}</h3>
                </div>

                <div className="mb-4">
                    {hasSalesPrice ? (
                        <div className="flex items-baseline gap-2">
                            <p className="text-admin-accent font-bold text-xl">₱{(item as Part).salesPrice!.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                            <p className="text-gray-500 font-medium text-sm line-through decoration-red-500/50">₱{item.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                        </div>
                    ) : (
                        <p className="text-admin-accent font-bold text-xl">₱{item.price > 0 ? item.price.toLocaleString('en-US', { minimumFractionDigits: 2 }) : 'Quote'}</p>
                    )}
                </div>

                <div className="mt-auto pt-4 border-t border-white/5 flex justify-between items-center text-xs text-gray-400 font-medium uppercase tracking-wider">
                    <span>{'sku' in item ? `SKU: ${item.sku}` : item.estimatedTime}</span>
                    <span>{'sku' in item ? `Stock: ${item.stock}` : item.category}</span>
                </div>
            </div>
        </div>
    );
};

const AdminCatalogScreen: React.FC = () => {
    const { db, addService, updateService, deleteService, addPart, updatePart, deletePart, loading } = useDatabase();
    const [activeTab, setActiveTab] = useState<'services' | 'parts'>('services');
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<Service | undefined>(undefined);
    const [isPartModalOpen, setIsPartModalOpen] = useState(false);
    const [editingPart, setEditingPart] = useState<Part | undefined>(undefined);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [itemTypeToDelete, setItemTypeToDelete] = useState<'service' | 'part'>('service');

    const serviceCategories = useMemo(() => ['all', ...(db?.settings.serviceCategories || [])], [db]);
    const partCategories = useMemo(() => ['all', ...(db?.settings.partCategories || [])], [db]);

    const filteredServices = useMemo(() => {
        if (!db) return [];
        return db.services.filter(s => (categoryFilter === 'all' || s.category === categoryFilter) && (s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.category.toLowerCase().includes(searchQuery.toLowerCase())));
    }, [db, searchQuery, categoryFilter]);

    const filteredParts = useMemo(() => {
        if (!db) return [];
        return db.parts.filter(p => (categoryFilter === 'all' || p.category === categoryFilter) && (p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase())));
    }, [db, searchQuery, categoryFilter]);

    const handleTabChange = (tab: 'services' | 'parts') => { setActiveTab(tab); setSearchQuery(''); setCategoryFilter('all'); };

    if (loading || !db) return <div className="flex items-center justify-center h-full"><Spinner size="lg" color="text-white" /></div>;

    const handleOpenServiceModal = (service?: Service) => { setEditingService(service); setIsServiceModalOpen(true); };
    const handleCloseServiceModal = () => { setEditingService(undefined); setIsServiceModalOpen(false); };

    const handleOpenPartModal = (part?: Part) => { setEditingPart(part); setIsPartModalOpen(true); };
    const handleClosePartModal = () => { setEditingPart(undefined); setIsPartModalOpen(false); };
    const handleSaveService = async (service: Service) => {
        try {
            if (service.id) {
                await updateService(service);
            } else {
                await addService(service);
            }
            handleCloseServiceModal();
        } catch (error) {
            console.error("Failed to save service:", error);
            alert("Failed to save service. Please try again.");
        }
    };

    const handleSavePart = async (part: Part) => {
        try {
            if (part.id) {
                await updatePart(part);
            } else {
                await addPart(part);
            }
            handleClosePartModal();
        } catch (error) {
            console.error("Failed to save part:", error);
            alert("Failed to save part. Please try again.");
        }
    };

    const handleDeleteService = async () => {
        if (itemToDelete) {
            try {
                await deleteService(itemToDelete);
                setItemToDelete(null);
                setDeleteModalOpen(false);
            } catch (error) {
                console.error("Failed to delete service:", error);
                alert("Failed to delete service. Please try again.");
            }
        }
    };

    const handleDeletePart = async () => {
        if (itemToDelete) {
            try {
                await deletePart(itemToDelete);
                setItemToDelete(null);
                setDeleteModalOpen(false);
            } catch (error) {
                console.error("Failed to delete part:", error);
                alert("Failed to delete part. Please try again.");
            }
        }
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex-shrink-0">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Services & Catalog Management</h1>
                    <p className="mt-2 text-gray-400">Manage your services and parts inventory with real-time insights.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 my-6">
                    {activeTab === 'services' ? (
                        <>
                            <StatCard title="Total Services" value={db.services.length} icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>} />
                            <StatCard
                                title="Most Popular"
                                value={(() => {
                                    const counts = db.bookings.reduce((acc, b) => { acc[b.service.id] = (acc[b.service.id] || 0) + 1; return acc; }, {} as Record<string, number>);
                                    const entries = Object.entries(counts);
                                    if (entries.length === 0) return 'N/A';
                                    const topServiceId = entries.sort((a, b) => (b[1] as number) - (a[1] as number))[0]?.[0];
                                    return db.services.find(s => s.id === topServiceId)?.name.slice(0, 15) || 'N/A';
                                })()}
                                subtitle={`${(() => {
                                    const counts = db.bookings.reduce((acc, b) => { acc[b.service.id] = (acc[b.service.id] || 0) + 1; return acc; }, {} as Record<string, number>);
                                    const values = Object.values(counts);
                                    if (values.length === 0) return 0;
                                    return values.sort((a, b) => (b as number) - (a as number))[0] || 0;
                                })()} bookings`}
                                icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
                            />
                            <StatCard
                                title="Total Revenue"
                                value={(db.bookings.filter(b => b.status === 'Completed').reduce((sum, b) => sum + b.service.price, 0) / 1000).toFixed(1)}
                                prefix="₱"
                                icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                            />
                            <StatCard
                                title="Avg Service Price"
                                value={(db.services.reduce((sum, s) => sum + s.price, 0) / db.services.length || 0).toFixed(0)}
                                prefix="₱"
                                icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>}
                            />
                            <StatCard
                                title="Categories"
                                value={db.settings.serviceCategories.length}
                                subtitle={`${db.settings.serviceCategories[0] || 'None'}`}
                                icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>}
                            />
                        </>
                    ) : (
                        <>
                            <StatCard title="Total Parts" value={db.parts.length} icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>} />
                            <StatCard title="In Stock" value={db.parts.filter(p => p.stock > 0).length} icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
                            <StatCard title="Low Stock" value={db.parts.filter(p => p.stock > 0 && p.stock < 10).length} icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>} />
                            <StatCard title="Out of Stock" value={db.parts.filter(p => p.stock === 0).length} icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
                            <StatCard title="Categories" value={db.settings.partCategories.length} subtitle={`${db.settings.partCategories[0] || 'None'}`} icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>} />
                        </>
                    )}
                </div>
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4">
                    <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                        <div className="relative w-full sm:w-64">
                            <input
                                type="text"
                                placeholder={activeTab === 'services' ? "Search name or category..." : "Search name or SKU..."}
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-admin-accent/50 transition-all"
                            />
                            <svg className="w-5 h-5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <div className="relative w-full sm:w-auto">
                            <select
                                value={categoryFilter}
                                onChange={e => setCategoryFilter(e.target.value)}
                                className="w-full sm:w-48 pl-4 pr-10 py-2.5 bg-black/20 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-admin-accent/50 transition-all appearance-none cursor-pointer"
                            >
                                {(activeTab === 'services' ? serviceCategories : partCategories).map(cat => <option key={cat} value={cat} className="bg-gray-900 text-white">{cat === 'all' ? 'All Categories' : cat}</option>)}
                            </select>
                            <svg className="w-5 h-5 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                        <button
                            onClick={() => setIsCategoryModalOpen(true)}
                            className="px-4 py-2.5 bg-white/5 border border-white/10 text-white rounded-xl hover:bg-white/10 transition-all font-bold text-sm whitespace-nowrap"
                        >
                            Manage Categories
                        </button>
                        <button
                            onClick={activeTab === 'services' ? () => handleOpenServiceModal() : () => handleOpenPartModal()}
                            className="px-6 py-2.5 bg-gradient-to-r from-admin-accent to-orange-600 text-white rounded-xl hover:shadow-glow transition-all font-bold text-sm whitespace-nowrap flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add {activeTab === 'services' ? 'Service' : 'Part'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-white/10 flex-shrink-0 mb-6">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => handleTabChange('services')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-bold text-sm transition-all ${activeTab === 'services' ? 'border-admin-accent text-admin-accent' : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'}`}
                    >
                        Services
                    </button>
                    <button
                        onClick={() => handleTabChange('parts')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-bold text-sm transition-all ${activeTab === 'parts' ? 'border-admin-accent text-admin-accent' : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'}`}
                    >
                        Parts & Tools
                    </button>
                </nav>
            </div>

            {/* Content Grid */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                {activeTab === 'services' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-6">
                        {filteredServices.map(service => <ItemCard key={service.id} item={service} onEdit={() => handleOpenServiceModal(service)} onDelete={() => { setItemToDelete(service.id); setItemTypeToDelete('service'); setDeleteModalOpen(true); }} />)}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-6">
                        {filteredParts.map(part => <ItemCard key={part.id} item={part} onEdit={() => handleOpenPartModal(part)} onDelete={() => { setItemToDelete(part.id); setItemTypeToDelete('part'); setDeleteModalOpen(true); }} />)}
                    </div>
                )}

                {/* Empty States */}
                {activeTab === 'services' && filteredServices.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                        <svg className="w-16 h-16 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <p className="text-lg font-medium">No services found</p>
                        <p className="text-sm">Try adjusting your search or filters</p>
                    </div>
                )}
                {activeTab === 'parts' && filteredParts.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                        <svg className="w-16 h-16 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <p className="text-lg font-medium">No parts found</p>
                        <p className="text-sm">Try adjusting your search or filters</p>
                    </div>
                )}
            </div>

            {/* Modals */}
            {isServiceModalOpen && (
                <Modal title={editingService ? "Edit Service" : "Add New Service"} isOpen={true} onClose={handleCloseServiceModal}>
                    <ServiceForm service={editingService} onSave={handleSaveService} onCancel={handleCloseServiceModal} categories={serviceCategories.filter(c => c !== 'all')} />
                </Modal>
            )}

            {isPartModalOpen && (
                <Modal title={editingPart ? "Edit Part" : "Add New Part"} isOpen={true} onClose={handleClosePartModal}>
                    <PartForm part={editingPart} onSave={handleSavePart} onCancel={handleClosePartModal} categories={partCategories.filter(c => c !== 'all')} />
                </Modal>
            )}

            {isCategoryModalOpen && <CategoryManagerModal onClose={() => setIsCategoryModalOpen(false)} />}

            {deleteModalOpen && itemToDelete && (
                <DeleteConfirmationModal
                    itemName={itemTypeToDelete === 'service' ? db.services.find(s => s.id === itemToDelete)?.name || 'Item' : db.parts.find(p => p.id === itemToDelete)?.name || 'Item'}
                    itemType={itemTypeToDelete}
                    onClose={() => setDeleteModalOpen(false)}
                    onConfirm={itemTypeToDelete === 'service' ? handleDeleteService : handleDeletePart}
                    impactCount={db.bookings.filter(b => itemTypeToDelete === 'service' ? b.service.id === itemToDelete : false).length} // Simplified impact check
                />
            )}
        </div>
    );
};

export default AdminCatalogScreen;