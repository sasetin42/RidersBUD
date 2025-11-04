import React, { useState, useMemo } from 'react';
import { Service, Part } from '../../types';
import Modal from '../../components/admin/Modal';
import { useDatabase } from '../../context/DatabaseContext';
import Spinner from '../../components/Spinner';
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

const CategoryManagerModal: React.FC<{
    onClose: () => void;
}> = ({ onClose }) => {
    const { db, updateSettings } = useDatabase();
    const [serviceCategories, setServiceCategories] = useState(db?.settings.serviceCategories || []);
    const [partCategories, setPartCategories] = useState(db?.settings.partCategories || []);
    const [newServiceCategory, setNewServiceCategory] = useState('');
    const [newPartCategory, setNewPartCategory] = useState('');

    const handleSave = () => {
        updateSettings({ serviceCategories, partCategories });
        onClose();
    };

    const handleAdd = (type: 'service' | 'part') => {
        if (type === 'service' && newServiceCategory.trim()) {
            setServiceCategories(prev => [...prev, newServiceCategory.trim()]);
            setNewServiceCategory('');
        } else if (type === 'part' && newPartCategory.trim()) {
            setPartCategories(prev => [...prev, newPartCategory.trim()]);
            setNewPartCategory('');
        }
    };
    
    const handleDelete = (type: 'service' | 'part', categoryToDelete: string) => {
        if (type === 'service') {
            setServiceCategories(prev => prev.filter(c => c !== categoryToDelete));
        } else {
            setPartCategories(prev => prev.filter(c => c !== categoryToDelete));
        }
    };

    return (
        <Modal title="Manage Categories" isOpen={true} onClose={onClose}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[60vh] overflow-y-auto pr-2">
                <div>
                    <h3 className="text-lg font-bold text-admin-text-primary mb-3">Service Categories</h3>
                    <div className="space-y-2 mb-3 max-h-48 overflow-y-auto bg-admin-bg p-2 rounded-md">
                        {serviceCategories.map(cat => (
                            <div key={cat} className="flex items-center justify-between bg-admin-card p-2 rounded">
                                <span className="text-sm">{cat}</span>
                                <button onClick={() => handleDelete('service', cat)} className="text-red-400 hover:text-red-300">&times;</button>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input type="text" value={newServiceCategory} onChange={e => setNewServiceCategory(e.target.value)} placeholder="New category..." className="flex-grow p-2 bg-admin-bg border border-admin-border rounded" />
                        <button onClick={() => handleAdd('service')} className="bg-admin-accent text-white font-bold py-2 px-4 rounded">Add</button>
                    </div>
                </div>
                <div>
                     <h3 className="text-lg font-bold text-admin-text-primary mb-3">Part Categories</h3>
                    <div className="space-y-2 mb-3 max-h-48 overflow-y-auto bg-admin-bg p-2 rounded-md">
                        {partCategories.map(cat => (
                            <div key={cat} className="flex items-center justify-between bg-admin-card p-2 rounded">
                                <span className="text-sm">{cat}</span>
                                <button onClick={() => handleDelete('part', cat)} className="text-red-400 hover:text-red-300">&times;</button>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input type="text" value={newPartCategory} onChange={e => setNewPartCategory(e.target.value)} placeholder="New category..." className="flex-grow p-2 bg-admin-bg border border-admin-border rounded" />
                        <button onClick={() => handleAdd('part')} className="bg-admin-accent text-white font-bold py-2 px-4 rounded">Add</button>
                    </div>
                </div>
            </div>
            <div className="flex justify-end gap-4 mt-6 border-t border-admin-border pt-4">
                <button onClick={onClose} className="bg-admin-border font-bold py-2 px-4 rounded-lg">Cancel</button>
                <button onClick={handleSave} className="bg-admin-accent font-bold py-2 px-4 rounded-lg">Save Categories</button>
            </div>
        </Modal>
    );
};

const ServiceForm: React.FC<{ service?: Service; onSave: (service: any) => void; onCancel: () => void; categories: string[] }> = ({ service, onSave, onCancel, categories }) => {
    const [formData, setFormData] = useState({ id: service?.id || '', name: service?.name || '', description: service?.description || '', price: service?.price ?? '', estimatedTime: service?.estimatedTime || '', category: service?.category || (categories[0] || ''), imageUrl: service?.imageUrl || '', icon: service?.icon || '', });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
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
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => { const { name, value } = e.target; const newData = { ...formData, [name]: value }; setFormData(newData); validate(newData); };
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try { const base64 = await fileToBase64(file); const newData = { ...formData, imageUrl: base64 }; setFormData(newData); validate(newData); } 
            catch (err) { setErrors(prev => ({ ...prev, imageUrl: 'Failed to process image.'})); }
        }
    };
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (validate()) { onSave({ ...formData, price: Number(formData.price) }); } };
    const isSaveDisabled = Object.keys(errors).length > 0 || !formData.name || !formData.description || formData.price === '' || !formData.estimatedTime || !formData.category || !formData.imageUrl;

    return (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Service Name" className={`w-full p-3 bg-admin-bg border rounded placeholder-admin-text-secondary ${errors.name ? 'border-red-500' : 'border-admin-border focus:ring-admin-accent focus:border-admin-accent'}`} />
            <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Description" className={`w-full p-3 bg-admin-bg border rounded placeholder-admin-text-secondary ${errors.description ? 'border-red-500' : 'border-admin-border focus:ring-admin-accent focus:border-admin-accent'}`} />
            <input type="number" name="price" value={formData.price} onChange={handleChange} placeholder="Price" className={`w-full p-3 bg-admin-bg border rounded placeholder-admin-text-secondary ${errors.price ? 'border-red-500' : 'border-admin-border focus:ring-admin-accent focus:border-admin-accent'}`} />
            <input type="text" name="estimatedTime" value={formData.estimatedTime} onChange={handleChange} placeholder="Estimated Time" className={`w-full p-3 bg-admin-bg border rounded placeholder-admin-text-secondary ${errors.estimatedTime ? 'border-red-500' : 'border-admin-border focus:ring-admin-accent focus:border-admin-accent'}`} />
            <select name="category" value={formData.category} onChange={handleChange} className={`w-full p-3 bg-admin-bg border rounded ${errors.category ? 'border-red-500' : 'border-admin-border focus:ring-admin-accent focus:border-admin-accent'}`}><option value="" disabled>Select a category</option>{categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select>
            <div>
                <label className="block text-sm font-medium text-admin-text-secondary mb-1">Service Image</label>
                <input type="file" onChange={handleFileChange} accept="image/*" className="w-full text-sm text-admin-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-admin-accent/10 file:text-admin-accent hover:file:bg-admin-accent/20" />
                {formData.imageUrl && <img src={formData.imageUrl} alt="Service preview" className="mt-4 rounded-lg max-h-40 w-auto" />}
                {errors.imageUrl && <p className="text-red-400 text-xs mt-1">{errors.imageUrl}</p>}
            </div>
            <textarea name="icon" value={formData.icon} onChange={handleChange} placeholder="SVG Icon Code" rows={3} className="w-full p-3 bg-admin-bg border rounded border-admin-border placeholder-admin-text-secondary font-mono text-sm" />
            <div className="flex justify-end gap-4 mt-6"><button type="button" onClick={onCancel} className="bg-admin-border text-white py-2 px-4 rounded-lg hover:bg-gray-600">Cancel</button><button type="submit" className="bg-admin-accent text-white py-2 px-4 rounded-lg hover:bg-orange-600 disabled:opacity-50" disabled={isSaveDisabled}>Save</button></div>
        </form>
    );
};

const PartForm: React.FC<{ part?: Part; onSave: (part: any) => void; onCancel: () => void; categories: string[] }> = ({ part, onSave, onCancel, categories }) => {
    const [formData, setFormData] = useState({ id: part?.id || '', name: part?.name || '', description: part?.description || '', price: part?.price ?? '', salesPrice: part?.salesPrice ?? '', category: part?.category || (categories[0] || ''), sku: part?.sku || '', imageUrl: part?.imageUrls?.[0] || '', stock: part?.stock ?? 0, brand: part?.brand || '' });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => { const { name, value } = e.target; const newData = { ...formData, [name]: value }; setFormData(newData); validate(newData); };
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try { const base64 = await fileToBase64(file); const newData = { ...formData, imageUrl: base64 }; setFormData(newData); validate(newData); } 
            catch (err) { setErrors(prev => ({ ...prev, imageUrl: 'Failed to process image.'})); }
        }
    };
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            const { imageUrl, ...rest } = formData;
            onSave({ ...rest, price: Number(formData.price), salesPrice: formData.salesPrice ? Number(formData.salesPrice) : undefined, stock: Number(formData.stock), imageUrls: [imageUrl] });
        }
    };
    const isSaveDisabled = Object.keys(errors).length > 0 || !formData.name || formData.price === '' || formData.stock === null || !formData.category || !formData.sku || !formData.imageUrl;

    return (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Part Name" className={`w-full p-3 bg-admin-bg border rounded placeholder-admin-text-secondary ${errors.name ? 'border-red-500' : 'border-admin-border focus:ring-admin-accent focus:border-admin-accent'}`} />
            <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Description" className="w-full p-3 bg-admin-bg border rounded placeholder-admin-text-secondary border-admin-border focus:ring-admin-accent focus:border-admin-accent" />
            <div className="grid grid-cols-2 gap-4">
                <input type="number" name="price" value={formData.price} onChange={handleChange} placeholder="Price" className={`w-full p-3 bg-admin-bg border rounded placeholder-admin-text-secondary ${errors.price ? 'border-red-500' : 'border-admin-border focus:ring-admin-accent focus:border-admin-accent'}`} />
                <input type="number" name="salesPrice" value={formData.salesPrice} onChange={handleChange} placeholder="Sales Price (optional)" className={`w-full p-3 bg-admin-bg border rounded placeholder-admin-text-secondary ${errors.salesPrice ? 'border-red-500' : 'border-admin-border focus:ring-admin-accent focus:border-admin-accent'}`} />
            </div>
            {errors.salesPrice && <p className="text-red-400 text-xs -mt-3 pl-1">{errors.salesPrice}</p>}
             <div className="grid grid-cols-2 gap-4">
                <select name="category" value={formData.category} onChange={handleChange} className={`w-full p-3 bg-admin-bg border rounded ${errors.category ? 'border-red-500' : 'border-admin-border focus:ring-admin-accent focus:border-admin-accent'}`}><option value="" disabled>Select a category</option>{categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select>
                <input type="number" name="stock" value={formData.stock} onChange={handleChange} placeholder="Stock Quantity" className={`w-full p-3 bg-admin-bg border rounded placeholder-admin-text-secondary ${errors.stock ? 'border-red-500' : 'border-admin-border focus:ring-admin-accent focus:border-admin-accent'}`} />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <input type="text" name="sku" value={formData.sku} onChange={handleChange} placeholder="SKU" className={`w-full p-3 bg-admin-bg border rounded placeholder-admin-text-secondary ${errors.sku ? 'border-red-500' : 'border-admin-border focus:ring-admin-accent focus:border-admin-accent'}`} />
                 <input type="text" name="brand" value={formData.brand} onChange={handleChange} placeholder="Brand" className="w-full p-3 bg-admin-bg border rounded placeholder-admin-text-secondary border-admin-border focus:ring-admin-accent focus:border-admin-accent" />
            </div>
            <div>
                <label className="block text-sm font-medium text-admin-text-secondary mb-1">Part Image</label>
                <input type="file" onChange={handleFileChange} accept="image/*" className="w-full text-sm text-admin-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-admin-accent/10 file:text-admin-accent hover:file:bg-admin-accent/20" />
                {formData.imageUrl && <img src={formData.imageUrl} alt="Part preview" className="mt-4 rounded-lg max-h-40 w-auto" />}
                {errors.imageUrl && <p className="text-red-400 text-xs mt-1">{errors.imageUrl}</p>}
            </div>
            <div className="flex justify-end gap-4 mt-6"><button type="button" onClick={onCancel} className="bg-admin-border text-white py-2 px-4 rounded-lg hover:bg-gray-600">Cancel</button><button type="submit" className="bg-admin-accent text-white py-2 px-4 rounded-lg hover:bg-orange-600 disabled:opacity-50" disabled={isSaveDisabled}>Save</button></div>
        </form>
    );
};

const ItemCard: React.FC<{ item: Service | Part, onEdit: () => void, onDelete: () => void }> = ({ item, onEdit, onDelete }) => {
    const hasSalesPrice = 'salesPrice' in item && item.salesPrice && item.salesPrice > 0;
    const imageUrl = 'sku' in item ? item.imageUrls[0] : item.imageUrl;
    
    return (
        <div className="bg-admin-card rounded-lg overflow-hidden group relative flex flex-col border border-admin-border">
            <img src={imageUrl} alt={item.name} className="h-40 w-full object-cover" />
            <div className="absolute top-0 right-0 p-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={onEdit} className="bg-black/50 p-2 rounded-full hover:bg-blue-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg></button>
                <button onClick={onDelete} className="bg-black/50 p-2 rounded-full hover:bg-red-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
            </div>
            <div className="p-4 flex-grow flex flex-col">
                <h3 className="font-bold text-admin-text-primary text-lg">{item.name}</h3>
                {hasSalesPrice ? (
                    <div className="flex items-baseline gap-2">
                        <p className="text-primary font-semibold text-lg">₱{(item as Part).salesPrice!.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                        <p className="text-admin-text-secondary font-semibold text-sm line-through">₱{item.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    </div>
                ) : (
                    <p className="text-primary font-semibold text-lg">₱{item.price > 0 ? item.price.toLocaleString('en-US', { minimumFractionDigits: 2 }) : 'Quote'}</p>
                )}
                <div className="text-xs text-admin-text-secondary mt-2 flex-grow">
                    {'sku' in item ? `SKU: ${item.sku} | Stock: ${item.stock}` : `Time: ${item.estimatedTime}`}
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
    const handleSaveService = (service: Service) => { service.id ? updateService(service) : addService(service); handleCloseServiceModal(); };
    const handleDeleteService = (id: string) => { if (window.confirm('Are you sure?')) deleteService(id); };

    const handleOpenPartModal = (part?: Part) => { setEditingPart(part); setIsPartModalOpen(true); };
    const handleClosePartModal = () => { setEditingPart(undefined); setIsPartModalOpen(false); };
    const handleSavePart = (part: Part) => { part.id ? updatePart(part) : addPart(part); handleClosePartModal(); };
    const handleDeletePart = (id: string) => { if (window.confirm('Are you sure?')) deletePart(id); };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex-shrink-0">
                <h1 className="text-3xl font-bold">Catalog Management</h1>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
                    <StatCard title="Total Services" value={db.services.length} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>} />
                    <StatCard title="Total Parts & Tools" value={db.parts.length} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>} />
                </div>
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4">
                     <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                        <input type="text" placeholder={activeTab === 'services' ? "Search name or category..." : "Search name or SKU..."} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full sm:w-64 p-2 bg-admin-card border border-admin-border rounded-lg" />
                        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="w-full sm:w-auto p-2 bg-admin-card border border-admin-border rounded-lg">{(activeTab === 'services' ? serviceCategories : partCategories).map(cat => <option key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</option>)}</select>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <button onClick={() => setIsCategoryModalOpen(true)} className="bg-admin-card text-white font-bold py-2 px-4 rounded-lg hover:bg-admin-border transition whitespace-nowrap">Manage Categories</button>
                        <button onClick={activeTab === 'services' ? () => handleOpenServiceModal() : () => handleOpenPartModal()} className="bg-admin-accent text-white font-bold py-2 px-4 rounded-lg hover:bg-orange-600 transition w-full whitespace-nowrap">+ Add {activeTab === 'services' ? 'Service' : 'Part'}</button>
                    </div>
                </div>
            </div>
            <div className="border-b border-admin-border flex-shrink-0">
                <nav className="-mb-px flex space-x-8">
                    <button onClick={() => handleTabChange('services')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'services' ? 'border-admin-accent text-admin-accent' : 'border-transparent text-admin-text-secondary hover:text-white hover:border-gray-500'}`}>Services</button>
                    <button onClick={() => handleTabChange('parts')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'parts' ? 'border-admin-accent text-admin-accent' : 'border-transparent text-admin-text-secondary hover:text-white hover:border-gray-500'}`}>Parts & Tools</button>
                </nav>
            </div>
            <div className="flex-1 overflow-y-auto pt-6">
                {activeTab === 'services' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredServices.map(service => <ItemCard key={service.id} item={service} onEdit={() => handleOpenServiceModal(service)} onDelete={() => handleDeleteService(service.id)} />)}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredParts.map(part => <ItemCard key={part.id} item={part} onEdit={() => handleOpenPartModal(part)} onDelete={() => handleDeletePart(part.id)} />)}
                    </div>
                )}
            </div>
            {isCategoryModalOpen && <CategoryManagerModal onClose={() => setIsCategoryModalOpen(false)} />}
            <Modal title={editingService ? 'Edit Service' : 'Add Service'} isOpen={isServiceModalOpen} onClose={handleCloseServiceModal}>
                <ServiceForm service={editingService} onSave={handleSaveService} onCancel={handleCloseServiceModal} categories={db.settings.serviceCategories.filter(c => c !== 'all')} />
            </Modal>
            <Modal title={editingPart ? 'Edit Part' : 'Add Part'} isOpen={isPartModalOpen} onClose={handleClosePartModal}>
                <PartForm part={editingPart} onSave={handleSavePart} onCancel={handleClosePartModal} categories={db.settings.partCategories.filter(c => c !== 'all')} />
            </Modal>
        </div>
    );
};

export default AdminCatalogScreen;