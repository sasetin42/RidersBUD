
import React, { useState, useMemo } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import Spinner from '../../components/Spinner';
import Modal from '../../components/admin/Modal';
import { fileToBase64 } from '../../utils/fileUtils';
import { Banner } from '../../types';

const StatCard: React.FC<{ title: string; value: number | string; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-admin-card p-5 rounded-xl shadow-lg flex items-center gap-4 border border-admin-border">
        <div className="bg-admin-bg p-3 rounded-full text-admin-accent">{icon}</div>
        <div>
            <p className="text-2xl font-bold text-admin-text-primary">{value}</p>
            <p className="text-sm text-admin-text-secondary">{title}</p>
        </div>
    </div>
);

const BannerForm: React.FC<{
    banner?: Banner;
    onSave: (banner: Omit<Banner, 'id'> | Banner) => void,
    onCancel: () => void
}> = ({ banner, onSave, onCancel }) => {
    const [formData, setFormData] = useState({ name: banner?.name || '', description: banner?.description || '', imageUrl: banner?.imageUrl || '', link: banner?.link || '/services', category: banner?.category || 'Services' as Banner['category'], startDate: banner?.startDate || '', endDate: banner?.endDate || '', });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const validate = (data = formData) => {
        const newErrors: { [key: string]: string } = {};
        if (!data.name.trim()) newErrors.name = "Banner name is required.";
        if (!data.imageUrl) newErrors.imageUrl = "Please upload an image for the banner.";
        if (!data.startDate) newErrors.startDate = "Start date is required.";
        if (!data.endDate) { newErrors.endDate = "End date is required."; } else if (data.startDate && data.endDate < data.startDate) { newErrors.endDate = "End date cannot be before the start date."; }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'category') {
            const categoryLinks: Record<Banner['category'], string> = { Services: '/services', Booking: '/booking/1', Reminders: '/reminders', Store: '/parts-store', };
            const newLink = categoryLinks[value as Banner['category']];
            const newData = { ...formData, category: value as Banner['category'], link: newLink };
            setFormData(newData); validate(newData);
        } else { const newData = { ...formData, [name]: value }; setFormData(newData); validate(newData); }
    };
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try { const base64 = await fileToBase64(file); const newData = { ...formData, imageUrl: base64 }; setFormData(newData); validate(newData); } 
            catch (err) { setErrors(prev => ({ ...prev, imageUrl: 'Failed to process image.'})); }
        }
    };
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (validate()) { if (banner) onSave({ ...banner, ...formData }); else onSave(formData); } };
    const isSaveDisabled = Object.keys(errors).length > 0 || !formData.name || !formData.imageUrl || !formData.startDate || !formData.endDate;

    return (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
             <div>
                <label className="block text-sm font-medium text-admin-text-secondary mb-1">Banner Name</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} className={`w-full p-3 bg-admin-bg border rounded placeholder-admin-text-secondary ${errors.name ? 'border-red-500' : 'border-admin-border focus:ring-admin-accent focus:border-admin-accent'}`} />
                {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
            </div>
             <div>
                <label className="block text-sm font-medium text-admin-text-secondary mb-1">Description</label>
                <textarea name="description" value={formData.description} onChange={handleChange} rows={3} className="w-full p-3 bg-admin-bg border rounded placeholder-admin-text-secondary border-admin-border focus:ring-admin-accent focus:border-admin-accent" />
            </div>
            <div>
                <label className="block text-sm font-medium text-admin-text-secondary mb-1">Banner Image</label>
                <input type="file" onChange={handleFileChange} accept="image/*" className="w-full text-sm text-admin-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-admin-accent/10 file:text-admin-accent hover:file:bg-admin-accent/20" />
                {formData.imageUrl && <img src={formData.imageUrl} alt="Banner preview" className="mt-4 rounded-lg max-h-40 w-auto" />}
                {errors.imageUrl && <p className="text-red-400 text-xs mt-1">{errors.imageUrl}</p>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-admin-border pt-4">
                 <div>
                    <label className="block text-sm font-medium text-admin-text-secondary mb-1">Category</label>
                    <select name="category" value={formData.category} onChange={handleChange} className="w-full p-3 bg-admin-bg border rounded border-admin-border focus:ring-admin-accent focus:border-admin-accent">
                        <option>Services</option> <option>Booking</option> <option>Reminders</option> <option>Store</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-admin-text-secondary mb-1">Link URL</label>
                    <input type="text" name="link" value={formData.link} onChange={handleChange} placeholder="e.g., /services" className="w-full p-3 bg-admin-bg border rounded border-admin-border placeholder-admin-text-secondary focus:ring-admin-accent focus:border-admin-accent" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-admin-text-secondary mb-1">Start Date</label>
                    <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} className={`w-full p-3 bg-admin-bg border rounded ${errors.startDate ? 'border-red-500' : 'border-admin-border'}`} />
                    {errors.startDate && <p className="text-red-400 text-xs mt-1">{errors.startDate}</p>}
                </div>
                <div>
                    <label className="block text-sm font-medium text-admin-text-secondary mb-1">End Date</label>
                    <input type="date" name="endDate" value={formData.endDate} onChange={handleChange} className={`w-full p-3 bg-admin-bg border rounded ${errors.endDate ? 'border-red-500' : 'border-admin-border'}`} />
                    {errors.endDate && <p className="text-red-400 text-xs mt-1">{errors.endDate}</p>}
                </div>
            </div>
            <div className="flex justify-end gap-4 pt-4">
                <button type="button" onClick={onCancel} className="bg-admin-border text-white py-2 px-4 rounded-lg hover:bg-gray-600">Cancel</button>
                <button type="submit" className="bg-admin-accent text-white py-2 px-4 rounded-lg hover:bg-orange-600" disabled={isSaveDisabled}>Save Banner</button>
            </div>
        </form>
    );
};

const AdminMarketingScreen: React.FC = () => {
    const { db, addBanner, updateBanner, deleteBanner, loading } = useDatabase();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBanner, setEditingBanner] = useState<Banner | undefined>(undefined);

    const stats = useMemo(() => {
        if (!db) return { total: 0, active: 0 };
        const now = new Date();
        const active = db.banners.filter(b => {
            const start = new Date(b.startDate.replace(/-/g, '/'));
            const end = new Date(b.endDate.replace(/-/g, '/'));
            end.setHours(23, 59, 59, 999); // Include the whole end day
            return start <= now && now <= end;
        }).length;
        return { total: db.banners.length, active };
    }, [db]);

    if (loading || !db) {
        return <div className="flex items-center justify-center h-full"><Spinner size="lg" color="text-white" /></div>;
    }
    
    const handleOpenModal = (banner?: Banner) => { setEditingBanner(banner); setIsModalOpen(true); };
    const handleCloseModal = () => { setEditingBanner(undefined); setIsModalOpen(false); };
    const handleSaveBanner = (banner: Omit<Banner, 'id'> | Banner) => { 'id' in banner ? updateBanner(banner) : addBanner(banner); handleCloseModal(); };
    const handleDeleteBanner = (id: string) => { if (window.confirm('Are you sure?')) deleteBanner(id); };
    const categoryColors: { [key in Banner['category']]: string } = { Services: 'bg-blue-500/20 text-blue-300', Booking: 'bg-green-500/20 text-green-300', Reminders: 'bg-yellow-500/20 text-yellow-300', Store: 'bg-purple-500/20 text-purple-300' };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex-shrink-0">
                <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
                    <h1 className="text-3xl font-bold">Marketing Banners</h1>
                    <button onClick={() => handleOpenModal()} className="bg-admin-accent text-white font-bold py-2 px-4 rounded-lg hover:bg-orange-600 transition">+ Add Banner</button>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
                    <StatCard title="Total Banners" value={stats.total} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" /></svg>} />
                    <StatCard title="Currently Active" value={stats.active} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.522 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.478 0-8.268-2.943-9.542-7z" /></svg>} />
                </div>
            </div>
            <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {db.banners.map(banner => (
                        <div key={banner.id} className="bg-admin-card rounded-lg overflow-hidden group relative flex flex-col border border-admin-border">
                            <img src={banner.imageUrl} alt={banner.name} className="h-32 w-full object-cover" />
                             <div className="p-4 flex-grow flex flex-col">
                                <span className={`text-xs font-bold px-2 py-1 rounded-full self-start mb-2 ${categoryColors[banner.category]}`}>{banner.category}</span>
                                <h3 className="font-bold text-admin-text-primary text-lg">{banner.name}</h3>
                                <p className="text-sm text-admin-text-secondary flex-grow my-1">{banner.description}</p>
                                <div className="text-xs text-gray-400 border-t border-admin-border pt-2 mt-2">
                                    <p>Active: {banner.startDate} to {banner.endDate}</p>
                                    <p className="truncate">Link: <span className="font-mono text-gray-300">{banner.link}</span></p>
                                </div>
                            </div>
                            <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleOpenModal(banner)} className="bg-black/50 text-white rounded-full p-1.5 hover:bg-blue-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg></button>
                                <button onClick={() => handleDeleteBanner(banner.id)} className="bg-black/50 text-white rounded-full p-1.5 hover:bg-red-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                            </div>
                        </div>
                    ))}
                    {db.banners.length === 0 && (
                        <div className="col-span-full text-center py-16 text-admin-text-secondary">
                            <p>No marketing banners have been added yet.</p>
                        </div>
                    )}
                </div>
            </div>
            <Modal title={editingBanner ? "Edit Banner" : "Add New Banner"} isOpen={isModalOpen} onClose={handleCloseModal}>
                <BannerForm banner={editingBanner} onSave={handleSaveBanner} onCancel={handleCloseModal} />
            </Modal>
        </div>
    );
};

export default AdminMarketingScreen;
