import React, { useState } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import Spinner from '../../components/Spinner';
import Modal from '../../components/admin/Modal';
import { fileToBase64 } from '../../utils/fileUtils';
import { Banner } from '../../types';

const BannerForm: React.FC<{ onSave: (banner: Omit<Banner, 'id'>) => void, onCancel: () => void }> = ({ onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        imageUrl: '',
        link: '/services',
        category: 'Services' as Banner['category'],
        startDate: '',
        endDate: '',
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const validate = (data = formData) => {
        const newErrors: { [key: string]: string } = {};
        if (!data.name.trim()) newErrors.name = "Banner name is required.";
        if (!data.imageUrl) newErrors.imageUrl = "Please upload an image for the banner.";
        if (!data.startDate) newErrors.startDate = "Start date is required.";
        if (!data.endDate) {
            newErrors.endDate = "End date is required.";
        } else if (data.startDate && data.endDate < data.startDate) {
            newErrors.endDate = "End date cannot be before the start date.";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        if (name === 'category') {
            const categoryLinks: Record<Banner['category'], string> = {
                Services: '/services',
                Booking: '/booking/1', // A sensible default link
                Reminders: '/reminders',
                Store: '/parts-store',
            };
            const newLink = categoryLinks[value as Banner['category']];
            const newData = { ...formData, category: value as Banner['category'], link: newLink };
            setFormData(newData);
            validate(newData);
        } else {
            const newData = { ...formData, [name]: value };
            setFormData(newData);
            validate(newData);
        }
    };
    
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const base64 = await fileToBase64(file);
                const newData = { ...formData, imageUrl: base64 };
                setFormData(newData);
                validate(newData);
            } catch (err) {
                 setErrors(prev => ({ ...prev, imageUrl: 'Failed to process image.'}));
            }
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            onSave(formData);
        }
    };

    const isSaveDisabled = Object.keys(errors).length > 0 || !formData.name || !formData.imageUrl || !formData.startDate || !formData.endDate;

    return (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
             <div>
                <label className="block text-sm font-medium text-light-gray mb-1">Banner Name</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} className={`w-full p-3 bg-field border rounded placeholder-light-gray ${errors.name ? 'border-red-500' : 'border-gray-600 focus:ring-primary focus:border-primary'}`} />
                {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
            </div>
             <div>
                <label className="block text-sm font-medium text-light-gray mb-1">Description</label>
                <textarea name="description" value={formData.description} onChange={handleChange} rows={3} className="w-full p-3 bg-field border rounded placeholder-light-gray border-gray-600 focus:ring-primary focus:border-primary" />
            </div>
            <div>
                <label className="block text-sm font-medium text-light-gray mb-1">Banner Image</label>
                <input type="file" onChange={handleFileChange} accept="image/*" className="w-full text-sm text-light-gray file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
                {formData.imageUrl && <img src={formData.imageUrl} alt="Banner preview" className="mt-4 rounded-lg max-h-40 w-auto" />}
                {errors.imageUrl && <p className="text-red-400 text-xs mt-1">{errors.imageUrl}</p>}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-field pt-4">
                 <div>
                    <label className="block text-sm font-medium text-light-gray mb-1">Category</label>
                    <select name="category" value={formData.category} onChange={handleChange} className="w-full p-3 bg-field border rounded border-gray-600 focus:ring-primary focus:border-primary">
                        <option>Services</option>
                        <option>Booking</option>
                        <option>Reminders</option>
                        <option>Store</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-light-gray mb-1">Link URL</label>
                    <input type="text" name="link" value={formData.link} onChange={handleChange} placeholder="e.g., /services" className="w-full p-3 bg-field border rounded border-gray-600 placeholder-light-gray focus:ring-primary focus:border-primary" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-light-gray mb-1">Start Date</label>
                    <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} className={`w-full p-3 bg-field border rounded ${errors.startDate ? 'border-red-500' : 'border-gray-600'}`} />
                    {errors.startDate && <p className="text-red-400 text-xs mt-1">{errors.startDate}</p>}
                </div>
                <div>
                    <label className="block text-sm font-medium text-light-gray mb-1">End Date</label>
                    <input type="date" name="endDate" value={formData.endDate} onChange={handleChange} className={`w-full p-3 bg-field border rounded ${errors.endDate ? 'border-red-500' : 'border-gray-600'}`} />
                    {errors.endDate && <p className="text-red-400 text-xs mt-1">{errors.endDate}</p>}
                </div>
            </div>

            <div className="flex justify-end gap-4 pt-4">
                <button type="button" onClick={onCancel} className="bg-field text-white py-2 px-4 rounded-lg hover:bg-gray-600">Cancel</button>
                <button type="submit" className="bg-primary text-white py-2 px-4 rounded-lg hover:bg-orange-600" disabled={isSaveDisabled}>Save Banner</button>
            </div>
        </form>
    );
};

const AdminMarketingScreen: React.FC = () => {
    const { db, addBanner, deleteBanner, loading } = useDatabase();
    const [isModalOpen, setIsModalOpen] = useState(false);

    if (loading || !db) {
        return <div className="flex items-center justify-center h-full bg-dark-gray"><Spinner size="lg" color="text-white" /></div>;
    }

    const handleSaveBanner = (banner: Omit<Banner, 'id'>) => {
        addBanner(banner);
        setIsModalOpen(false);
    };

    const handleDeleteBanner = (id: string) => {
        if (window.confirm('Are you sure you want to delete this banner?')) {
            deleteBanner(id);
        }
    };

    const categoryColors: { [key in Banner['category']]: string } = {
        Services: 'bg-blue-500/20 text-blue-300',
        Booking: 'bg-green-500/20 text-green-300',
        Reminders: 'bg-yellow-500/20 text-yellow-300',
        Store: 'bg-purple-500/20 text-purple-300',
    };

    return (
        <div className="text-white flex flex-col h-full overflow-hidden bg-dark-gray p-6 lg:p-8">
            <div className="flex justify-between items-center mb-6 flex-shrink-0">
                <h1 className="text-3xl font-bold">Marketing Banners</h1>
                <button onClick={() => setIsModalOpen(true)} className="bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-orange-600 transition">+ Add Banner</button>
            </div>

            <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {db.banners.map(banner => (
                        <div key={banner.id} className="bg-secondary rounded-lg overflow-hidden group relative flex flex-col">
                            <img src={banner.imageUrl} alt={banner.name} className="h-32 w-full object-cover" />
                             <div className="p-4 flex-grow flex flex-col">
                                <span className={`text-xs font-bold px-2 py-1 rounded-full self-start mb-2 ${categoryColors[banner.category]}`}>{banner.category}</span>
                                <h3 className="font-bold text-white text-lg">{banner.name}</h3>
                                <p className="text-sm text-light-gray flex-grow my-1">{banner.description}</p>
                                <div className="text-xs text-gray-400 border-t border-field pt-2 mt-2">
                                    <p>Active: {banner.startDate} to {banner.endDate}</p>
                                    <p className="truncate">Link: <span className="font-mono text-gray-300">{banner.link}</span></p>
                                </div>
                            </div>
                            <button 
                                onClick={() => handleDeleteBanner(banner.id)}
                                className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                    ))}
                    {db.banners.length === 0 && (
                        <div className="col-span-full text-center py-16 text-light-gray">
                            <p>No marketing banners have been added yet.</p>
                        </div>
                    )}
                </div>
            </div>

            <Modal title="Add New Banner" isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <BannerForm onSave={handleSaveBanner} onCancel={() => setIsModalOpen(false)} />
            </Modal>
        </div>
    );
};

export default AdminMarketingScreen;