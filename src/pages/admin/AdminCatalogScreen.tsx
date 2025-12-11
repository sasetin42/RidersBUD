import React, { useState, useMemo } from 'react';
import { Service, Part } from '../../types';
import Modal from '../../components/admin/Modal';
import { useDatabase } from '../../context/DatabaseContext';
import Spinner from '../../components/Spinner';
import { fileToBase64 } from '../../utils/fileUtils';
import { Search, Plus, Package, Wrench, Trash2, Edit2, Tag, Image as ImageIcon, Box, DollarSign, Clock, Layers } from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*                                SUBCOMPONENTS                               */
/* -------------------------------------------------------------------------- */

const StatCard: React.FC<{ title: string; value: number | string; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => (
    <div className="glass-panel p-5 rounded-2xl flex items-center gap-4 border border-white/5 relative overflow-hidden group">
        <div className={`p-3 rounded-xl ${color} bg-opacity-10 text-white shadow-inner ring-1 ring-white/10`}>
            {icon}
        </div>
        <div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{title}</p>
        </div>
    </div>
);

const CategoryManagerModal: React.FC<{ onClose: () => void; }> = ({ onClose }) => {
    const { db, updateSettings } = useDatabase();
    const [serviceCategories, setServiceCategories] = useState(db?.settings.serviceCategories || []);
    const [partCategories, setPartCategories] = useState(db?.settings.partCategories || []);
    const [newServiceCategory, setNewServiceCategory] = useState('');
    const [newPartCategory, setNewPartCategory] = useState('');

    const handleSave = () => {
        updateSettings({ serviceCategories, partCategories });
        onClose();
    };

    return (
        <Modal title="Manage Categories" isOpen={true} onClose={onClose}>
            <div className="flex flex-col md:flex-row gap-6 min-w-[600px] text-white">
                <div className="flex-1 space-y-4">
                    <h3 className="font-bold text-primary flex items-center gap-2 border-b border-white/10 pb-2">
                        <Wrench size={16} /> Service Categories
                    </h3>
                    <div className="flex gap-2">
                        <input type="text" value={newServiceCategory} onChange={e => setNewServiceCategory(e.target.value)} placeholder="New category..." className="flex-grow bg-[#0a0a0a] border border-white/10 rounded-lg p-2 text-sm focus:border-primary outline-none" />
                        <button onClick={() => { if (newServiceCategory) setServiceCategories(p => [...p, newServiceCategory]); setNewServiceCategory(''); }} className="bg-white/10 hover:bg-white/20 p-2 rounded-lg text-white font-bold">+</button>
                    </div>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {serviceCategories.map(cat => (
                            <div key={cat} className="flex justify-between items-center bg-white/5 p-2 rounded-lg text-sm border border-white/5">
                                <span>{cat}</span>
                                <button onClick={() => setServiceCategories(p => p.filter(c => c !== cat))} className="text-gray-500 hover:text-red-400 hover:bg-red-500/10 p-1 rounded transition-colors"><Trash2 size={14} /></button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex-1 space-y-4">
                    <h3 className="font-bold text-primary flex items-center gap-2 border-b border-white/10 pb-2">
                        <Package size={16} /> Part Categories
                    </h3>
                    <div className="flex gap-2">
                        <input type="text" value={newPartCategory} onChange={e => setNewPartCategory(e.target.value)} placeholder="New category..." className="flex-grow bg-[#0a0a0a] border border-white/10 rounded-lg p-2 text-sm focus:border-primary outline-none" />
                        <button onClick={() => { if (newPartCategory) setPartCategories(p => [...p, newPartCategory]); setNewPartCategory(''); }} className="bg-white/10 hover:bg-white/20 p-2 rounded-lg text-white font-bold">+</button>
                    </div>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {partCategories.map(cat => (
                            <div key={cat} className="flex justify-between items-center bg-white/5 p-2 rounded-lg text-sm border border-white/5">
                                <span>{cat}</span>
                                <button onClick={() => setPartCategories(p => p.filter(c => c !== cat))} className="text-gray-500 hover:text-red-400 hover:bg-red-500/10 p-1 rounded transition-colors"><Trash2 size={14} /></button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10 text-white">
                <button onClick={onClose} className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 font-bold text-sm text-gray-400">Cancel</button>
                <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-primary hover:bg-orange-600 font-bold text-sm shadow-lg shadow-orange-500/20">Save Changes</button>
            </div>
        </Modal>
    );
};

const ServiceForm: React.FC<{ service?: Service; onSave: (service: any) => void; onCancel: () => void; categories: string[] }> = ({ service, onSave, onCancel, categories }) => {
    const [formData, setFormData] = useState({ id: service?.id || '', name: service?.name || '', description: service?.description || '', price: service?.price ?? '', estimatedTime: service?.estimatedTime || '', category: service?.category || (categories[0] || ''), imageUrl: service?.imageUrl || '', icon: service?.icon || '', });

    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSave({ ...formData, price: Number(formData.price) }); };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 text-white min-w-[500px]">
            <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Service Name</label>
                    <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-2.5 focus:border-primary outline-none mt-1" required />
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Price (₱)</label>
                    <input type="number" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-2.5 focus:border-primary outline-none mt-1" required />
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Est. Time</label>
                    <input type="text" value={formData.estimatedTime} onChange={e => setFormData({ ...formData, estimatedTime: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-2.5 focus:border-primary outline-none mt-1" placeholder="e.g. 2 hours" required />
                </div>
                <div className="col-span-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Category</label>
                    <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-2.5 focus:border-primary outline-none mt-1">
                        <option value="" disabled>Select Category</option>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div className="col-span-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Description</label>
                    <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-2.5 focus:border-primary outline-none mt-1 h-24" required />
                </div>
                <div className="col-span-2">
                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Cover Image</label>
                    <div className="flex items-center gap-4">
                        {formData.imageUrl && <img src={formData.imageUrl} className="w-20 h-20 rounded-lg object-cover border border-white/10" />}
                        <input type="file" onChange={async (e) => {
                            if (e.target.files?.[0]) setFormData({ ...formData, imageUrl: await fileToBase64(e.target.files[0]) });
                        }} className="text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20" />
                    </div>
                </div>
            </div>
            <div className="flex justify-end gap-3 pt-6 border-t border-white/10">
                <button type="button" onClick={onCancel} className="px-5 py-2 rounded-xl border border-white/10 font-bold text-gray-400 hover:text-white">Cancel</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-primary hover:bg-orange-600 font-bold text-white shadow-lg shadow-orange-500/20">Save Service</button>
            </div>
        </form>
    );
};

const PartForm: React.FC<{ part?: Part; onSave: (part: any) => void; onCancel: () => void; categories: string[] }> = ({ part, onSave, onCancel, categories }) => {
    const [formData, setFormData] = useState({ id: part?.id || '', name: part?.name || '', description: part?.description || '', price: part?.price ?? '', salesPrice: part?.salesPrice ?? '', category: part?.category || (categories[0] || ''), sku: part?.sku || '', imageUrl: part?.imageUrls?.[0] || '', stock: part?.stock ?? 0, brand: part?.brand || '' });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const { imageUrl, ...rest } = formData;
        onSave({ ...rest, price: Number(formData.price), salesPrice: formData.salesPrice ? Number(formData.salesPrice) : undefined, stock: Number(formData.stock), imageUrls: [imageUrl] });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 text-white min-w-[500px]">
            <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Part Name</label>
                    <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-2.5 focus:border-primary outline-none mt-1" required />
                </div>
                <div className="col-span-2 grid grid-cols-2 gap-4 bg-white/5 p-3 rounded-xl border border-white/5">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Regular Price (₱)</label>
                        <input type="number" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-2.5 focus:border-primary outline-none mt-1" required />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-green-500/80 uppercase">Sale Price (Optional)</label>
                        <input type="number" value={formData.salesPrice} onChange={e => setFormData({ ...formData, salesPrice: e.target.value })} className="w-full bg-[#0a0a0a] border border-green-500/30 text-green-400 rounded-lg p-2.5 focus:border-green-500 outline-none mt-1" />
                    </div>
                </div>

                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">SKU</label>
                    <input type="text" value={formData.sku} onChange={e => setFormData({ ...formData, sku: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-2.5 focus:border-primary outline-none mt-1 font-mono uppercase" required />
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">In Stock</label>
                    <input type="number" value={formData.stock} onChange={e => setFormData({ ...formData, stock: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-2.5 focus:border-primary outline-none mt-1" required />
                </div>

                <div className="col-span-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Brand & Category</label>
                    <div className="flex gap-4 mt-1">
                        <input type="text" value={formData.brand} onChange={e => setFormData({ ...formData, brand: e.target.value })} placeholder="Brand" className="flex-1 bg-[#0a0a0a] border border-white/10 rounded-lg p-2.5 focus:border-primary outline-none" />
                        <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="flex-1 bg-[#0a0a0a] border border-white/10 rounded-lg p-2.5 focus:border-primary outline-none">
                            <option value="" disabled>Select Category</option>
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                </div>

                <div className="col-span-2">
                    <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Product Image</label>
                    <div className="flex items-center gap-4 bg-white/5 p-3 rounded-xl border border-dashed border-white/20">
                        {formData.imageUrl ? (
                            <img src={formData.imageUrl} className="w-16 h-16 rounded object-cover border border-white/10" />
                        ) : (
                            <div className="w-16 h-16 rounded bg-white/10 flex items-center justify-center text-gray-500"><ImageIcon size={24} /></div>
                        )}
                        <input type="file" onChange={async (e) => {
                            if (e.target.files?.[0]) setFormData({ ...formData, imageUrl: await fileToBase64(e.target.files[0]) });
                        }} className="text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-white hover:file:bg-orange-600 cursor-pointer" />
                    </div>
                </div>
            </div>
            <div className="flex justify-end gap-3 pt-6 border-t border-white/10">
                <button type="button" onClick={onCancel} className="px-5 py-2 rounded-xl border border-white/10 font-bold text-gray-400 hover:text-white">Cancel</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-primary hover:bg-orange-600 font-bold text-white shadow-lg shadow-orange-500/20">Save Product</button>
            </div>
        </form>
    )
}

/* -------------------------------------------------------------------------- */
/*                               MAIN COMPONENT                               */
/* -------------------------------------------------------------------------- */

const AdminCatalogScreen: React.FC = () => {
    const { db, addService, updateService, deleteService, addPart, updatePart, deletePart, loading } = useDatabase();

    // State
    const [activeTab, setActiveTab] = useState<'services' | 'parts'>('services');
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');

    // Modals
    const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<Service | undefined>(undefined);
    const [isPartModalOpen, setIsPartModalOpen] = useState(false);
    const [editingPart, setEditingPart] = useState<Part | undefined>(undefined);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

    const serviceCategories = useMemo(() => ['all', ...(db?.settings.serviceCategories || [])], [db]);
    const partCategories = useMemo(() => ['all', ...(db?.settings.partCategories || [])], [db]);

    const filteredServices = useMemo(() => {
        if (!db) return [];
        return db.services.filter(s => (categoryFilter === 'all' || s.category === categoryFilter) && (s.name.toLowerCase().includes(searchQuery.toLowerCase())));
    }, [db, searchQuery, categoryFilter]);

    const filteredParts = useMemo(() => {
        if (!db) return [];
        return db.parts.filter(p => (categoryFilter === 'all' || p.category === categoryFilter) && (p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase())));
    }, [db, searchQuery, categoryFilter]);

    if (loading || !db) return <div className="flex items-center justify-center h-full"><Spinner size="lg" color="text-white" /></div>;

    // Handlers
    const handleServiceSave = (service: Service) => { service.id ? updateService(service) : addService(service); setEditingService(undefined); setIsServiceModalOpen(false); };
    const handlePartSave = (part: Part) => { part.id ? updatePart(part) : addPart(part); setEditingPart(undefined); setIsPartModalOpen(false); };

    return (
        <div className="space-y-8 animate-slideInUp">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-white mb-6">Catalog Management</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <StatCard title="Active Services" value={db.services.length} icon={<Wrench size={24} />} color="bg-blue-500" />
                    <StatCard title="Products in Inventory" value={db.parts.length} icon={<Package size={24} />} color="bg-purple-500" />
                </div>
            </div>

            {/* Tab Switcher */}
            <div className="flex justify-center">
                <div className="bg-white/5 p-1 rounded-xl inline-flex border border-white/5">
                    <button
                        onClick={() => { setActiveTab('services'); setSearchQuery(''); setCategoryFilter('all'); }}
                        className={`px-8 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'services' ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                        Services
                    </button>
                    <button
                        onClick={() => { setActiveTab('parts'); setSearchQuery(''); setCategoryFilter('all'); }}
                        className={`px-8 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'parts' ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                        Parts & Inventory
                    </button>
                </div>
            </div>

            {/* Content Panel */}
            <div className="flex flex-col gap-6">
                {/* Toolbar */}
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5">
                    <div className="relative w-full md:w-1/3 group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder={activeTab === 'services' ? "Search services..." : "Search parts..."}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all placeholder-gray-600"
                        />
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="bg-[#0a0a0a] text-white border border-white/10 rounded-xl px-4 py-2.5 focus:border-primary/50 focus:ring-1 outline-none text-sm cursor-pointer hover:bg-white/5 flex-grow md:flex-grow-0">
                            {(activeTab === 'services' ? serviceCategories : partCategories).map(cat => <option key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</option>)}
                        </select>
                        <button onClick={() => setIsCategoryModalOpen(true)} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors" title="Manage Categories">
                            <Layers size={20} />
                        </button>
                        <button
                            onClick={activeTab === 'services' ? () => { setEditingService(undefined); setIsServiceModalOpen(true) } : () => { setEditingPart(undefined); setIsPartModalOpen(true) }}
                            className="bg-primary hover:bg-orange-600 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-lg shadow-orange-500/20 flex items-center gap-2 whitespace-nowrap"
                        >
                            <Plus size={20} /> <span className="hidden sm:inline">Add Item</span>
                        </button>
                    </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {(activeTab === 'services' ? filteredServices : filteredParts).map((item: any) => (
                        <div key={item.id} className="glass-panel p-4 rounded-xl border border-white/5 group hover:border-primary/30 transition-all flex flex-col h-full relative">
                            {/* Image Badge */}
                            <div className="relative h-48 mb-4 rounded-lg overflow-hidden bg-black/40">
                                <img src={item.imageUrl || item.imageUrls?.[0]} alt={item.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <button
                                        onClick={() => activeTab === 'services' ? (setEditingService(item), setIsServiceModalOpen(true)) : (setEditingPart(item), setIsPartModalOpen(true))}
                                        className="p-2 bg-white rounded-full text-black hover:bg-gray-200 transition"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => { if (window.confirm('Delete this item?')) activeTab === 'services' ? deleteService(item.id) : deletePart(item.id) }}
                                        className="p-2 bg-red-500 rounded-full text-white hover:bg-red-600 transition"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                {item.salesPrice && item.salesPrice < item.price && (
                                    <div className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded">SALE</div>
                                )}
                            </div>

                            {/* Content */}
                            <div className="flex-grow">
                                <p className="text-xs text-primary font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Tag size={10} /> {item.category}</p>
                                <h3 className="font-bold text-white text-lg leading-tight mb-2">{item.name}</h3>
                                <div className="text-sm text-gray-400 mb-4 line-clamp-2">{item.description}</div>
                            </div>

                            {/* Footer */}
                            <div className="pt-4 border-t border-white/5 flex items-center justify-between mt-auto">
                                <div>
                                    {item.salesPrice ? (
                                        <div className="flex flex-col">
                                            <span className="text-xs text-gray-500 line-through">₱{item.price.toLocaleString()}</span>
                                            <span className="text-lg font-bold text-green-400">₱{item.salesPrice.toLocaleString()}</span>
                                        </div>
                                    ) : (
                                        <span className="text-lg font-bold text-white">₱{item.price.toLocaleString()}</span>
                                    )}
                                </div>
                                <div className="text-right">
                                    {activeTab === 'services' ? (
                                        <span className="text-xs text-gray-400 flex items-center gap-1"><Clock size={12} /> {item.estimatedTime}</span>
                                    ) : (
                                        <span className={`text-xs font-bold px-2 py-1 rounded ${item.stock > 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                            {item.stock} in stock
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                {(activeTab === 'services' ? filteredServices : filteredParts).length === 0 && (
                    <div className="text-center py-20 opacity-50">
                        <Box size={48} className="mx-auto mb-4" />
                        <p>No items found in this category.</p>
                    </div>
                )}
            </div>

            {isCategoryModalOpen && <CategoryManagerModal onClose={() => setIsCategoryModalOpen(false)} />}

            {isServiceModalOpen && (
                <Modal title={editingService ? 'Edit Service' : 'Add New Service'} isOpen={true} onClose={() => setIsServiceModalOpen(false)}>
                    <ServiceForm
                        service={editingService}
                        onSave={handleServiceSave}
                        onCancel={() => setIsServiceModalOpen(false)}
                        categories={serviceCategories.filter(c => c !== 'all')}
                    />
                </Modal>
            )}

            {isPartModalOpen && (
                <Modal title={editingPart ? 'Edit Product' : 'Add New Product'} isOpen={true} onClose={() => setIsPartModalOpen(false)}>
                    <PartForm
                        part={editingPart}
                        onSave={handlePartSave}
                        onCancel={() => setIsPartModalOpen(false)}
                        categories={partCategories.filter(c => c !== 'all')}
                    />
                </Modal>
            )}
        </div>
    );
};

export default AdminCatalogScreen;