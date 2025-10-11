import React, { useState, useMemo } from 'react';
import { Service, Part } from '../../types';
import Modal from '../../components/admin/Modal';
import { useDatabase } from '../../context/DatabaseContext';
import Spinner from '../../components/Spinner';

// --- Service Form Component ---
const ServiceForm: React.FC<{ service?: Service; onSave: (service: any) => void; onCancel: () => void; categories: string[] }> = ({ service, onSave, onCancel, categories }) => {
    const [formData, setFormData] = useState({
        id: service?.id || '',
        name: service?.name || '',
        description: service?.description || '',
        price: service?.price ?? '',
        estimatedTime: service?.estimatedTime || '',
        category: service?.category || (categories[0] || ''),
        imageUrl: service?.imageUrl || 'https://picsum.photos/seed/new/400/300',
        icon: service?.icon || '',
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            onSave({ ...formData, price: Number(formData.price) });
        }
    };
    
    const isSaveDisabled = Object.keys(errors).length > 0 || !formData.name || !formData.description || formData.price === '' || !formData.estimatedTime || !formData.category;

    return (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
                <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Service Name" className={`w-full p-3 bg-field border rounded placeholder-light-gray ${errors.name ? 'border-red-500' : 'border-gray-600 focus:ring-primary focus:border-primary'}`} />
                {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
            </div>
            <div>
                <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Description" className={`w-full p-3 bg-field border rounded placeholder-light-gray ${errors.description ? 'border-red-500' : 'border-gray-600 focus:ring-primary focus:border-primary'}`} />
                {errors.description && <p className="text-red-400 text-xs mt-1">{errors.description}</p>}
            </div>
            <div>
                <input type="number" name="price" value={formData.price} onChange={handleChange} placeholder="Price" className={`w-full p-3 bg-field border rounded placeholder-light-gray ${errors.price ? 'border-red-500' : 'border-gray-600 focus:ring-primary focus:border-primary'}`} />
                {errors.price && <p className="text-red-400 text-xs mt-1">{errors.price}</p>}
            </div>
            <div>
                <input type="text" name="estimatedTime" value={formData.estimatedTime} onChange={handleChange} placeholder="Estimated Time" className={`w-full p-3 bg-field border rounded placeholder-light-gray ${errors.estimatedTime ? 'border-red-500' : 'border-gray-600 focus:ring-primary focus:border-primary'}`} />
                {errors.estimatedTime && <p className="text-red-400 text-xs mt-1">{errors.estimatedTime}</p>}
            </div>
            <div>
                <select name="category" value={formData.category} onChange={handleChange} className={`w-full p-3 bg-field border rounded ${errors.category ? 'border-red-500' : 'border-gray-600 focus:ring-primary focus:border-primary'}`}>
                    <option value="" disabled>Select a category</option>
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                {errors.category && <p className="text-red-400 text-xs mt-1">{errors.category}</p>}
            </div>
            <div>
                <textarea name="icon" value={formData.icon} onChange={handleChange} placeholder="SVG Icon Code" rows={3} className="w-full p-3 bg-field border rounded border-gray-600 placeholder-light-gray font-mono text-sm" />
            </div>
            <div className="flex justify-end gap-4 mt-6">
                <button type="button" onClick={onCancel} className="bg-field text-white py-2 px-4 rounded-lg hover:bg-gray-600">Cancel</button>
                <button type="submit" className="bg-primary text-white py-2 px-4 rounded-lg hover:bg-orange-600 disabled:opacity-50" disabled={isSaveDisabled}>Save</button>
            </div>
        </form>
    );
};

// --- Part Form Component ---
const PartForm: React.FC<{ part?: Part; onSave: (part: any) => void; onCancel: () => void; categories: string[] }> = ({ part, onSave, onCancel, categories }) => {
    const [formData, setFormData] = useState({
        id: part?.id || '',
        name: part?.name || '',
        description: part?.description || '',
        price: part?.price ?? '',
        category: part?.category || (categories[0] || ''),
        sku: part?.sku || '',
        imageUrl: part?.imageUrl || 'https://picsum.photos/seed/newpart/400/300',
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const validate = (data = formData) => {
        const newErrors: { [key: string]: string } = {};
        if (!data.name.trim()) newErrors.name = "Part name is required.";
        if (!data.description.trim()) newErrors.description = "Description is required.";
        if (data.price === '' || Number(data.price) < 0) newErrors.price = "Price must be a positive number.";
        if (!data.category.trim()) newErrors.category = "Category is required.";
        if (!data.sku.trim()) newErrors.sku = "SKU is required.";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const newData = { ...formData, [name]: value };
        setFormData(newData);
        validate(newData);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            onSave({ ...formData, price: Number(formData.price) });
        }
    };

    const isSaveDisabled = Object.keys(errors).length > 0 || !formData.name || !formData.description || formData.price === '' || !formData.category || !formData.sku;

    return (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
                <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Part Name" className={`w-full p-3 bg-field border rounded placeholder-light-gray ${errors.name ? 'border-red-500' : 'border-gray-600 focus:ring-primary focus:border-primary'}`} />
                {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
            </div>
            <div>
                <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Description" className={`w-full p-3 bg-field border rounded placeholder-light-gray ${errors.description ? 'border-red-500' : 'border-gray-600 focus:ring-primary focus:border-primary'}`} />
                {errors.description && <p className="text-red-400 text-xs mt-1">{errors.description}</p>}
            </div>
            <div>
                <input type="number" name="price" value={formData.price} onChange={handleChange} placeholder="Price" className={`w-full p-3 bg-field border rounded placeholder-light-gray ${errors.price ? 'border-red-500' : 'border-gray-600 focus:ring-primary focus:border-primary'}`} />
                {errors.price && <p className="text-red-400 text-xs mt-1">{errors.price}</p>}
            </div>
            <div>
                <select name="category" value={formData.category} onChange={handleChange} className={`w-full p-3 bg-field border rounded ${errors.category ? 'border-red-500' : 'border-gray-600 focus:ring-primary focus:border-primary'}`}>
                    <option value="" disabled>Select a category</option>
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                {errors.category && <p className="text-red-400 text-xs mt-1">{errors.category}</p>}
            </div>
            <div>
                <input type="text" name="sku" value={formData.sku} onChange={handleChange} placeholder="SKU" className={`w-full p-3 bg-field border rounded placeholder-light-gray ${errors.sku ? 'border-red-500' : 'border-gray-600 focus:ring-primary focus:border-primary'}`} />
                {errors.sku && <p className="text-red-400 text-xs mt-1">{errors.sku}</p>}
            </div>
            <div className="flex justify-end gap-4 mt-6">
                <button type="button" onClick={onCancel} className="bg-field text-white py-2 px-4 rounded-lg hover:bg-gray-600">Cancel</button>
                <button type="submit" className="bg-primary text-white py-2 px-4 rounded-lg hover:bg-orange-600 disabled:opacity-50" disabled={isSaveDisabled}>Save</button>
            </div>
        </form>
    );
};


const AdminCatalogScreen: React.FC = () => {
    const { db, addService, updateService, deleteService, addPart, updatePart, deletePart, loading } = useDatabase();
    const [activeTab, setActiveTab] = useState<'services' | 'parts'>('services');
    
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'ascending' | 'descending' } | null>({ key: 'name', direction: 'ascending' });

    const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<Service | undefined>(undefined);
    const [isPartModalOpen, setIsPartModalOpen] = useState(false);
    const [editingPart, setEditingPart] = useState<Part | undefined>(undefined);

    const serviceCategories = useMemo(() => ['all', ...(db?.settings.serviceCategories || [])], [db]);
    const partCategories = useMemo(() => ['all', ...(db?.settings.partCategories || [])], [db]);

    const requestSort = (key: string) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key: string) => {
        if (!sortConfig || sortConfig.key !== key) return null;
        return sortConfig.direction === 'ascending' ? '▲' : '▼';
    };

    const filteredAndSortedServices = useMemo(() => {
        if (!db) return [];
        let items = [...db.services];
        if (categoryFilter !== 'all') {
            items = items.filter(s => s.category === categoryFilter);
        }
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            items = items.filter(s => s.name.toLowerCase().includes(lowerQuery) || s.category.toLowerCase().includes(lowerQuery));
        }
        if (sortConfig) {
            items.sort((a, b) => {
                const aValue = a[sortConfig.key as keyof Service];
                const bValue = b[sortConfig.key as keyof Service];
                if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return items;
    }, [db, searchQuery, categoryFilter, sortConfig]);

    const filteredAndSortedParts = useMemo(() => {
        if (!db) return [];
        let items = [...db.parts];
        if (categoryFilter !== 'all') {
            items = items.filter(p => p.category === categoryFilter);
        }
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            items = items.filter(p => p.name.toLowerCase().includes(lowerQuery) || p.sku.toLowerCase().includes(lowerQuery));
        }
        if (sortConfig) {
            items.sort((a, b) => {
                const aValue = a[sortConfig.key as keyof Part];
                const bValue = b[sortConfig.key as keyof Part];
                if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return items;
    }, [db, searchQuery, categoryFilter, sortConfig]);

    const handleTabChange = (tab: 'services' | 'parts') => {
        setActiveTab(tab);
        setSearchQuery('');
        setCategoryFilter('all');
        setSortConfig({ key: 'name', direction: 'ascending' });
    };

    if (loading || !db) {
        return <div className="flex items-center justify-center h-full bg-dark-gray"><Spinner size="lg" color="text-white" /></div>;
    }

    // Handlers for Services
    const handleOpenServiceModal = (service?: Service) => { setEditingService(service); setIsServiceModalOpen(true); };
    const handleCloseServiceModal = () => { setEditingService(undefined); setIsServiceModalOpen(false); };
    const handleSaveService = (service: Service) => { service.id ? updateService(service) : addService(service); handleCloseServiceModal(); };
    const handleDeleteService = (id: string) => { if (window.confirm('Are you sure?')) deleteService(id); };

    // Handlers for Parts
    const handleOpenPartModal = (part?: Part) => { setEditingPart(part); setIsPartModalOpen(true); };
    const handleClosePartModal = () => { setEditingPart(undefined); setIsPartModalOpen(false); };
    const handleSavePart = (part: Part) => { part.id ? updatePart(part) : addPart(part); handleClosePartModal(); };
    const handleDeletePart = (id: string) => { if (window.confirm('Are you sure?')) deletePart(id); };

    return (
        <div className="text-white flex flex-col h-full overflow-hidden bg-dark-gray">
            <div className="flex-shrink-0 px-6 lg:px-8 py-6">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-3xl font-bold">Catalog Management</h1>
                    <button onClick={activeTab === 'services' ? () => handleOpenServiceModal() : () => handleOpenPartModal()} className="bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-orange-600 transition">
                        {activeTab === 'services' ? '+ Add Service' : '+ Add Part'}
                    </button>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" placeholder={activeTab === 'services' ? "Search name or category..." : "Search name or SKU..."} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full p-2 bg-field border border-secondary rounded-lg" />
                    <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="w-full p-2 bg-field border border-secondary rounded-lg">
                        {(activeTab === 'services' ? serviceCategories : partCategories).map(cat => <option key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</option>)}
                    </select>
                </div>
            </div>

            <div className="border-b border-secondary flex-shrink-0 px-6 lg:px-8">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button onClick={() => handleTabChange('services')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'services' ? 'border-primary text-primary' : 'border-transparent text-light-gray hover:text-white hover:border-gray-500'}`}>Services</button>
                    <button onClick={() => handleTabChange('parts')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'parts' ? 'border-primary text-primary' : 'border-transparent text-light-gray hover:text-white hover:border-gray-500'}`}>Parts & Tools</button>
                </nav>
            </div>

            <div className="flex-1 overflow-auto px-6 lg:px-8">
                {activeTab === 'services' && (
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-dark-gray z-10">
                            <tr>
                                <th className="py-4 font-bold text-light-gray uppercase tracking-wider text-sm border-b border-secondary"><button onClick={() => requestSort('name')} className="hover:text-white">Name {getSortIndicator('name')}</button></th>
                                <th className="py-4 font-bold text-light-gray uppercase tracking-wider text-sm border-b border-secondary"><button onClick={() => requestSort('category')} className="hover:text-white">Category {getSortIndicator('category')}</button></th>
                                <th className="py-4 font-bold text-light-gray uppercase tracking-wider text-sm border-b border-secondary"><button onClick={() => requestSort('price')} className="hover:text-white">Price {getSortIndicator('price')}</button></th>
                                <th className="py-4 font-bold text-light-gray uppercase tracking-wider text-sm border-b border-secondary">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAndSortedServices.map((service) => <tr key={service.id} className="hover:bg-secondary"><td className="py-4 px-2 text-gray-200 border-b border-secondary">{service.name}</td><td className="py-4 px-2 text-gray-200 border-b border-secondary">{service.category}</td><td className="py-4 px-2 text-gray-200 border-b border-secondary">₱{service.price.toLocaleString()}</td><td className="py-4 px-2 text-sm border-b border-secondary"><button onClick={() => handleOpenServiceModal(service)} className="font-semibold text-blue-400 hover:text-blue-300 mr-4">Edit</button><button onClick={() => handleDeleteService(service.id)} className="font-semibold text-red-400 hover:text-red-300">Delete</button></td></tr>)}
                        </tbody>
                    </table>
                )}
                {activeTab === 'parts' && (
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-dark-gray z-10">
                            <tr>
                                <th className="py-4 font-bold text-light-gray uppercase tracking-wider text-sm border-b border-secondary"><button onClick={() => requestSort('name')} className="hover:text-white">Name {getSortIndicator('name')}</button></th>
                                <th className="py-4 font-bold text-light-gray uppercase tracking-wider text-sm border-b border-secondary"><button onClick={() => requestSort('sku')} className="hover:text-white">SKU {getSortIndicator('sku')}</button></th>
                                <th className="py-4 font-bold text-light-gray uppercase tracking-wider text-sm border-b border-secondary"><button onClick={() => requestSort('price')} className="hover:text-white">Price {getSortIndicator('price')}</button></th>
                                <th className="py-4 font-bold text-light-gray uppercase tracking-wider text-sm border-b border-secondary">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAndSortedParts.map((part) => <tr key={part.id} className="hover:bg-secondary"><td className="py-4 px-2 text-gray-200 border-b border-secondary">{part.name}</td><td className="py-4 px-2 text-gray-200 border-b border-secondary">{part.sku}</td><td className="py-4 px-2 text-gray-200 border-b border-secondary">₱{part.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td><td className="py-4 px-2 text-sm border-b border-secondary"><button onClick={() => handleOpenPartModal(part)} className="font-semibold text-blue-400 hover:text-blue-300 mr-4">Edit</button><button onClick={() => handleDeletePart(part.id)} className="font-semibold text-red-400 hover:text-red-300">Delete</button></td></tr>)}
                        </tbody>
                    </table>
                )}
            </div>

            <Modal title={editingService ? 'Edit Service' : 'Add Service'} isOpen={isServiceModalOpen} onClose={handleCloseServiceModal}><ServiceForm service={editingService} onSave={handleSaveService} onCancel={handleCloseServiceModal} categories={db.settings.serviceCategories} /></Modal>
            <Modal title={editingPart ? 'Edit Part' : 'Add Part'} isOpen={isPartModalOpen} onClose={handleClosePartModal}><PartForm part={editingPart} onSave={handleSavePart} onCancel={handleClosePartModal} categories={db.settings.partCategories} /></Modal>
        </div>
    );
};

export default AdminCatalogScreen;