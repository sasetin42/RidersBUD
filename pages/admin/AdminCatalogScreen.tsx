import React, { useState, useMemo } from 'react';
import { Service, Part } from '../../types';
import Modal from '../../components/admin/Modal';
import { useDatabase } from '../../context/DatabaseContext';
import Spinner from '../../components/Spinner';

const ServiceForm: React.FC<{ service?: Service; onSave: (service: any) => void; onCancel: () => void; categories: string[] }> = ({ service, onSave, onCancel, categories }) => {
    const [formData, setFormData] = useState({
        id: service?.id || '', name: service?.name || '', description: service?.description || '', price: service?.price ?? '', estimatedTime: service?.estimatedTime || '', category: service?.category || (categories[0] || ''), imageUrl: service?.imageUrl || 'https://picsum.photos/seed/new/400/300', icon: service?.icon || '',
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const validate = (data = formData) => {
        const newErrors: { [key: string]: string } = {};
        if (!data.name.trim()) newErrors.name = "Service name is required.";
        if (!data.description.trim()) newErrors.description = "Description is required.";
        if (data.price === '' || Number(data.price) < 0) newErrors.price = "Price must be a positive number.";
        if (!data.estimatedTime.trim()) newErrors.estimatedTime = "Estimated time is required.";
        if (!data.category.trim()) newErrors.category = "Category is required.";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const newData = { ...formData, [name]: value };
        setFormData(newData);
        validate(newData);
    };

    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (validate()) { onSave({ ...formData, price: Number(formData.price) }); } };
    const isSaveDisabled = Object.keys(errors).length > 0 || !formData.name || !formData.description || formData.price === '' || !formData.estimatedTime || !formData.category;

    return (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Service Name" className={`w-full p-3 bg-field border rounded placeholder-light-gray ${errors.name ? 'border-red-500' : 'border-gray-600 focus:ring-primary focus:border-primary'}`} />
            <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Description" className={`w-full p-3 bg-field border rounded placeholder-light-gray ${errors.description ? 'border-red-500' : 'border-gray-600 focus:ring-primary focus:border-primary'}`} />
            <input type="number" name="price" value={formData.price} onChange={handleChange} placeholder="Price" className={`w-full p-3 bg-field border rounded placeholder-light-gray ${errors.price ? 'border-red-500' : 'border-gray-600 focus:ring-primary focus:border-primary'}`} />
            <input type="text" name="estimatedTime" value={formData.estimatedTime} onChange={handleChange} placeholder="Estimated Time" className={`w-full p-3 bg-field border rounded placeholder-light-gray ${errors.estimatedTime ? 'border-red-500' : 'border-gray-600 focus:ring-primary focus:border-primary'}`} />
            <select name="category" value={formData.category} onChange={handleChange} className={`w-full p-3 bg-field border rounded ${errors.category ? 'border-red-500' : 'border-gray-600 focus:ring-primary focus:border-primary'}`}><option value="" disabled>Select a category</option>{categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select>
            <textarea name="icon" value={formData.icon} onChange={handleChange} placeholder="SVG Icon Code" rows={3} className="w-full p-3 bg-field border rounded border-gray-600 placeholder-light-gray font-mono text-sm" />
            <div className="flex justify-end gap-4 mt-6"><button type="button" onClick={onCancel} className="bg-field text-white py-2 px-4 rounded-lg hover:bg-gray-600">Cancel</button><button type="submit" className="bg-primary text-white py-2 px-4 rounded-lg hover:bg-orange-600 disabled:opacity-50" disabled={isSaveDisabled}>Save</button></div>
        </form>
    );
};

const PartForm: React.FC<{ part?: Part; onSave: (part: any) => void; onCancel: () => void; categories: string[] }> = ({ part, onSave, onCancel, categories }) => {
    const [formData, setFormData] = useState({ id: part?.id || '', name: part?.name || '', description: part?.description || '', price: part?.price ?? '', category: part?.category || (categories[0] || ''), sku: part?.sku || '', imageUrl: part?.imageUrl || 'https://picsum.photos/seed/newpart/400/300', stock: part?.stock ?? 0 });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const validate = (data = formData) => {
        const newErrors: { [key: string]: string } = {};
        if (!data.name.trim()) newErrors.name = "Part name is required.";
        if (data.price === '' || Number(data.price) < 0) newErrors.price = "Price must be a positive number.";
        if (data.stock === null || Number(data.stock) < 0) newErrors.stock = "Stock must be a non-negative number.";
        if (!data.category.trim()) newErrors.category = "Category is required.";
        if (!data.sku.trim()) newErrors.sku = "SKU is required.";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => { const { name, value } = e.target; const newData = { ...formData, [name]: value }; setFormData(newData); validate(newData); };
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (validate()) { onSave({ ...formData, price: Number(formData.price), stock: Number(formData.stock) }); } };
    const isSaveDisabled = Object.keys(errors).length > 0 || !formData.name || formData.price === '' || formData.stock === null || !formData.category || !formData.sku;

    return (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Part Name" className={`w-full p-3 bg-field border rounded placeholder-light-gray ${errors.name ? 'border-red-500' : 'border-gray-600 focus:ring-primary focus:border-primary'}`} />
            <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Description" className="w-full p-3 bg-field border rounded placeholder-light-gray border-gray-600 focus:ring-primary focus:border-primary" />
            <div className="grid grid-cols-2 gap-4">
                <input type="number" name="price" value={formData.price} onChange={handleChange} placeholder="Price" className={`w-full p-3 bg-field border rounded placeholder-light-gray ${errors.price ? 'border-red-500' : 'border-gray-600 focus:ring-primary focus:border-primary'}`} />
                <input type="number" name="stock" value={formData.stock} onChange={handleChange} placeholder="Stock Quantity" className={`w-full p-3 bg-field border rounded placeholder-light-gray ${errors.stock ? 'border-red-500' : 'border-gray-600 focus:ring-primary focus:border-primary'}`} />
            </div>
            <select name="category" value={formData.category} onChange={handleChange} className={`w-full p-3 bg-field border rounded ${errors.category ? 'border-red-500' : 'border-gray-600 focus:ring-primary focus:border-primary'}`}><option value="" disabled>Select a category</option>{categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select>
            <input type="text" name="sku" value={formData.sku} onChange={handleChange} placeholder="SKU" className={`w-full p-3 bg-field border rounded placeholder-light-gray ${errors.sku ? 'border-red-500' : 'border-gray-600 focus:ring-primary focus:border-primary'}`} />
            <div className="flex justify-end gap-4 mt-6"><button type="button" onClick={onCancel} className="bg-field text-white py-2 px-4 rounded-lg hover:bg-gray-600">Cancel</button><button type="submit" className="bg-primary text-white py-2 px-4 rounded-lg hover:bg-orange-600 disabled:opacity-50" disabled={isSaveDisabled}>Save</button></div>
        </form>
    );
};

const ItemCard: React.FC<{ item: Service | Part, onEdit: () => void, onDelete: () => void }> = ({ item, onEdit, onDelete }) => (
    <div className="bg-secondary rounded-lg overflow-hidden group relative flex flex-col">
        <img src={item.imageUrl} alt={item.name} className="h-40 w-full object-cover" />
        <div className="absolute top-0 right-0 p-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onEdit} className="bg-black/50 p-2 rounded-full hover:bg-blue-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg></button>
            <button onClick={onDelete} className="bg-black/50 p-2 rounded-full hover:bg-red-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
        </div>
        <div className="p-4 flex-grow flex flex-col">
            <h3 className="font-bold text-white text-lg">{item.name}</h3>
            <p className="text-sm text-primary font-semibold">₱{item.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            <div className="text-xs text-light-gray mt-2 flex-grow">
                {'sku' in item ? `SKU: ${item.sku} | Stock: ${item.stock}` : `Time: ${item.estimatedTime}`}
            </div>
        </div>
    </div>
);

const AdminCatalogScreen: React.FC = () => {
    const { db, addService, updateService, deleteService, addPart, updatePart, deletePart, loading } = useDatabase();
    const [activeTab, setActiveTab] = useState<'services' | 'parts'>('services');
    const [view, setView] = useState<'grid' | 'list'>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<Service | undefined>(undefined);
    const [isPartModalOpen, setIsPartModalOpen] = useState(false);
    const [editingPart, setEditingPart] = useState<Part | undefined>(undefined);

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

    if (loading || !db) return <div className="flex items-center justify-center h-full bg-dark-gray"><Spinner size="lg" color="text-white" /></div>;

    const handleOpenServiceModal = (service?: Service) => { setEditingService(service); setIsServiceModalOpen(true); };
    const handleCloseServiceModal = () => { setEditingService(undefined); setIsServiceModalOpen(false); };
    const handleSaveService = (service: Service) => { service.id ? updateService(service) : addService(service); handleCloseServiceModal(); };
    const handleDeleteService = (id: string) => { if (window.confirm('Are you sure?')) deleteService(id); };

    const handleOpenPartModal = (part?: Part) => { setEditingPart(part); setIsPartModalOpen(true); };
    const handleClosePartModal = () => { setEditingPart(undefined); setIsPartModalOpen(false); };
    const handleSavePart = (part: Part) => { part.id ? updatePart(part) : addPart(part); handleClosePartModal(); };
    const handleDeletePart = (id: string) => { if (window.confirm('Are you sure?')) deletePart(id); };

    return (
        <div className="text-white flex flex-col h-full overflow-hidden bg-dark-gray">
            <div className="flex-shrink-0 px-6 lg:px-8 py-6">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-3xl font-bold">Catalog Management</h1>
                    <button onClick={activeTab === 'services' ? () => handleOpenServiceModal() : () => handleOpenPartModal()} className="bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-orange-600 transition">+ Add {activeTab === 'services' ? 'Service' : 'Part'}</button>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input type="text" placeholder={activeTab === 'services' ? "Search name or category..." : "Search name or SKU..."} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="md:col-span-2 w-full p-2 bg-field border border-secondary rounded-lg" />
                    <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="w-full p-2 bg-field border border-secondary rounded-lg">{(activeTab === 'services' ? serviceCategories : partCategories).map(cat => <option key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</option>)}</select>
                </div>
            </div>
            <div className="border-b border-secondary flex-shrink-0 px-6 lg:px-8 flex justify-between items-center">
                <nav className="-mb-px flex space-x-8">
                    <button onClick={() => handleTabChange('services')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'services' ? 'border-primary text-primary' : 'border-transparent text-light-gray hover:text-white hover:border-gray-500'}`}>Services</button>
                    <button onClick={() => handleTabChange('parts')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'parts' ? 'border-primary text-primary' : 'border-transparent text-light-gray hover:text-white hover:border-gray-500'}`}>Parts & Tools</button>
                </nav>
            </div>
            <div className="flex-1 overflow-y-auto p-6 lg:p-8">
                {activeTab === 'services' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {filteredServices.map(service => <ItemCard key={service.id} item={service} onEdit={() => handleOpenServiceModal(service)} onDelete={() => handleDeleteService(service.id)} />)}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {filteredParts.map(part => <ItemCard key={part.id} item={part} onEdit={() => handleOpenPartModal(part)} onDelete={() => handleDeletePart(part.id)} />)}
                    </div>
                )}
            </div>
            
            <Modal title={editingService ? 'Edit Service' : 'Add Service'} isOpen={isServiceModalOpen} onClose={handleCloseServiceModal}>
                <ServiceForm service={editingService} onSave={handleSaveService} onCancel={handleCloseServiceModal} categories={db.settings.serviceCategories} />
            </Modal>
            
            <Modal title={editingPart ? 'Edit Part' : 'Add Part'} isOpen={isPartModalOpen} onClose={handleClosePartModal}>
                <PartForm part={editingPart} onSave={handleSavePart} onCancel={handleClosePartModal} categories={db.settings.partCategories} />
            </Modal>
        </div>
    );
};

export default AdminCatalogScreen;
