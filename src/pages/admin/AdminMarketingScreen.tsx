import React, { useState, useMemo } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import Spinner from '../../components/Spinner';
import Modal from '../../components/admin/Modal';
import { fileToBase64 } from '../../utils/fileUtils';
import { Banner } from '../../types';
import { Plus, Megaphone, Calendar, Link as LinkIcon, Image as ImageIcon, Trash2, Edit2, Eye, Layout } from 'lucide-react';

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

const BannerCard: React.FC<{ banner: Banner, onEdit: () => void, onDelete: () => void }> = ({ banner, onEdit, onDelete }) => {
    const isActive = useMemo(() => {
        const now = new Date();
        const start = new Date(banner.startDate);
        const end = new Date(banner.endDate);
        end.setHours(23, 59, 59, 999);
        return now >= start && now <= end;
    }, [banner]);

    const categoryColors: Record<Banner['category'], string> = {
        Services: 'bg-blue-500',
        Booking: 'bg-green-500',
        Reminders: 'bg-yellow-500',
        Store: 'bg-purple-500'
    };

    return (
        <div className="group relative h-64 rounded-2xl overflow-hidden border border-white/5 shadow-2xl transition-all hover:scale-[1.02] hover:shadow-primary/20">
            {/* Background Image */}
            <div className="absolute inset-0">
                <img src={banner.imageUrl} alt={banner.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-90" />
            </div>

            {/* Status Badge */}
            <div className="absolute top-4 left-4 z-10 flex gap-2">
                <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider text-white shadow-lg ${isActive ? 'bg-green-500' : 'bg-gray-500'}`}>
                    {isActive ? 'Active' : 'Inactive'}
                </span>
                <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider text-white shadow-lg ${categoryColors[banner.category] || 'bg-gray-500'}`}>
                    {banner.category}
                </span>
            </div>

            {/* Actions */}
            <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0 duration-300">
                <button onClick={onEdit} className="p-2 bg-white/10 hover:bg-white text-white hover:text-black rounded-full backdrop-blur-md transition-colors shadow-lg">
                    <Edit2 size={16} />
                </button>
                <button onClick={onDelete} className="p-2 bg-red-500/80 hover:bg-red-500 text-white rounded-full backdrop-blur-md transition-colors shadow-lg">
                    <Trash2 size={16} />
                </button>
            </div>

            {/* Content */}
            <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
                <h3 className="text-xl font-bold text-white mb-1 line-clamp-1">{banner.name}</h3>
                <p className="text-sm text-gray-300 line-clamp-2 mb-3">{banner.description}</p>

                <div className="flex items-center justify-between text-xs text-gray-400 border-t border-white/10 pt-3">
                    <span className="flex items-center gap-1">
                        <Calendar size={12} /> {new Date(banner.startDate).toLocaleDateString()} - {new Date(banner.endDate).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer" title={banner.link}>
                        <LinkIcon size={12} /> Link
                    </span>
                </div>
            </div>
        </div>
    );
};

const BannerForm: React.FC<{
    banner?: Banner;
    onSave: (banner: Omit<Banner, 'id'> | Banner) => void,
    onCancel: () => void
}> = ({ banner, onSave, onCancel }) => {
    const [formData, setFormData] = useState({ name: banner?.name || '', description: banner?.description || '', imageUrl: banner?.imageUrl || '', link: banner?.link || '/services', category: banner?.category || 'Services' as Banner['category'], startDate: banner?.startDate || '', endDate: banner?.endDate || '', });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (banner) onSave({ ...banner, ...formData }); else onSave(formData);
    };

    const handleCategoryChange = (val: string) => {
        const categoryLinks: Record<string, string> = { Services: '/services', Booking: '/booking/1', Reminders: '/reminders', Store: '/parts-store' };
        setFormData({ ...formData, category: val as any, link: categoryLinks[val] || '' });
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5 text-white min-w-[600px]">
            <div className="flex gap-6">
                {/* Image Upload Area */}
                <div className="w-1/3">
                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Banner Image</label>
                    <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-white/5 border-2 border-dashed border-white/20 group hover:border-primary/50 transition-colors">
                        {formData.imageUrl ? (
                            <img src={formData.imageUrl} className="w-full h-full object-cover" />
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
                                <ImageIcon size={32} className="mb-2" />
                                <span className="text-xs text-center px-4">Click to upload</span>
                            </div>
                        )}
                        <input type="file" onChange={async (e) => {
                            if (e.target.files?.[0]) setFormData({ ...formData, imageUrl: await fileToBase64(e.target.files[0]) });
                        }} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />

                        {/* Overlay for change */}
                        {formData.imageUrl && (
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-xs">
                                Change Image
                            </div>
                        )}
                    </div>
                </div>

                {/* Form Fields */}
                <div className="flex-1 space-y-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Campaign Name</label>
                        <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-2.5 focus:border-primary outline-none mt-1" placeholder="Summer Sale" required />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Description</label>
                        <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-2.5 focus:border-primary outline-none mt-1 h-20 resize-none" placeholder="Details about this promotion..." required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Category</label>
                            <select value={formData.category} onChange={e => handleCategoryChange(e.target.value)} className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-2.5 focus:border-primary outline-none mt-1">
                                <option>Services</option> <option>Booking</option> <option>Reminders</option> <option>Store</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Link Destination</label>
                            <input type="text" value={formData.link} onChange={e => setFormData({ ...formData, link: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-2.5 focus:border-primary outline-none mt-1" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Start Date</label>
                            <input type="date" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-2.5 focus:border-primary outline-none mt-1 text-gray-300" required />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">End Date</label>
                            <input type="date" value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-2.5 focus:border-primary outline-none mt-1 text-gray-300" required />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button type="button" onClick={onCancel} className="px-5 py-2 rounded-xl border border-white/10 font-bold text-gray-400 hover:text-white transition-colors">Cancel</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-primary hover:bg-orange-600 font-bold text-white shadow-lg shadow-orange-500/20 transition-colors disabled:opacity-50" disabled={!formData.imageUrl || !formData.name}>Save Campaign</button>
            </div>
        </form>
    );
};

/* -------------------------------------------------------------------------- */
/*                               MAIN COMPONENT                               */
/* -------------------------------------------------------------------------- */

const AdminMarketingScreen: React.FC = () => {
    const { db, addBanner, updateBanner, deleteBanner, loading } = useDatabase();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBanner, setEditingBanner] = useState<Banner | undefined>(undefined);

    const stats = useMemo(() => {
        if (!db) return { total: 0, active: 0 };
        const now = new Date();
        const active = db.banners.filter(b => {
            const start = new Date(b.startDate);
            const end = new Date(b.endDate);
            end.setHours(23, 59, 59, 999);
            return now >= start && now <= end;
        }).length;
        return { total: db.banners.length, active };
    }, [db]);

    if (loading || !db) return <div className="flex items-center justify-center h-full"><Spinner size="lg" color="text-white" /></div>;

    const handleSaveBanner = (banner: Omit<Banner, 'id'> | Banner) => {
        'id' in banner ? updateBanner(banner) : addBanner(banner);
        setEditingBanner(undefined); setIsModalOpen(false);
    };

    return (
        <div className="space-y-8 animate-slideInUp">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-white mb-6">Marketing & Promotions</h1>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <StatCard title="Total Campaigns" value={stats.total} icon={<Megaphone size={24} />} color="bg-purple-500" />
                    <StatCard title="Active Now" value={stats.active} icon={<Eye size={24} />} color="bg-green-500" />
                    <div className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col justify-center items-start gap-2 bg-gradient-to-br from-primary/20 to-transparent">
                        <button
                            onClick={() => { setEditingBanner(undefined); setIsModalOpen(true); }}
                            className="bg-white text-primary font-bold py-2 px-6 rounded-xl hover:bg-gray-100 transition shadow-lg w-full flex items-center justify-center gap-2"
                        >
                            <Plus size={20} /> Create New Campaign
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="space-y-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Layout size={18} /> Active Banners
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {db.banners.map(banner => (
                        <BannerCard
                            key={banner.id}
                            banner={banner}
                            onEdit={() => { setEditingBanner(banner); setIsModalOpen(true); }}
                            onDelete={() => { if (window.confirm('Delete this banner?')) deleteBanner(banner.id); }}
                        />
                    ))}
                    {db.banners.length === 0 && (
                        <div className="col-span-full py-20 text-center border-2 border-dashed border-white/10 rounded-2xl bg-white/5">
                            <Megaphone className="mx-auto text-gray-600 mb-4" size={48} />
                            <h3 className="text-gray-400 font-bold mb-2">No Active Campaigns</h3>
                            <button onClick={() => setIsModalOpen(true)} className="text-primary hover:text-white underline">Create your first banner</button>
                        </div>
                    )}
                </div>
            </div>

            <Modal title={editingBanner ? "Edit Campaign" : "New Marketing Campaign"} isOpen={isModalOpen} onClose={() => { setEditingBanner(undefined); setIsModalOpen(false); }}>
                <BannerForm banner={editingBanner} onSave={handleSaveBanner} onCancel={() => { setEditingBanner(undefined); setIsModalOpen(false); }} />
            </Modal>
        </div>
    );
};

export default AdminMarketingScreen;
