import React, { useState } from 'react';
import { Service } from '../types';
import { fileToBase64 } from './fileUtils';
import { SERVICE_ICONS } from './serviceIcons';

interface ServiceFormProps {
    service?: Service;
    onSave: (service: any) => void;
    onCancel: () => void;
    categories: string[];
}

export const EnhancedServiceForm: React.FC<ServiceFormProps> = ({ service, onSave, onCancel, categories }) => {
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
        validate(newData);
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
            const serviceData = {
                ...formData,
                price: Number(formData.price)
            };
            console.log('Submitting service data:', serviceData);
            onSave(serviceData);
        }
    };

    const isSaveDisabled = Object.keys(errors).length > 0 || !formData.name || !formData.description || formData.price === '' || !formData.estimatedTime || !formData.category || !formData.imageUrl;

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
                    {service?.id ? 'Update Service' : 'Create Service'}
                </button>
            </div>
        </form>
    );
};
