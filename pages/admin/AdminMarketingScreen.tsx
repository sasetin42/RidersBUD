import React, { useState, useMemo } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import Spinner from '../../components/Spinner';
import Modal from '../../components/admin/Modal';
import { fileToBase64 } from '../../utils/fileUtils';
import { Banner } from '../../types';
import EnhancedKPICard from '../../components/admin/EnhancedKPICard';
import { Megaphone, Eye, TrendingUp, Users, Edit, Trash2, Plus, Image as ImageIcon, Calendar, Target, CheckCircle, UserCheck, Shield, ArrowUpDown, ChevronDown } from 'lucide-react';

type SortableKeys = 'title' | 'startDate' | 'isActive' | 'targetAudience';

const BannerForm: React.FC<{
    banner?: Banner;
    onSave: (banner: Omit<Banner, 'id'> | Banner, imageFile?: File) => void;
    onCancel: () => void;
}> = ({ banner, onSave, onCancel }) => {
    const [activeTab, setActiveTab] = useState<'details' | 'design' | 'settings'>('details');
    const [formData, setFormData] = useState({
        title: banner?.title || '',
        description: banner?.description || '',
        imageUrl: banner?.imageUrl || '',
        link: banner?.link || '',
        isActive: banner?.isActive ?? true,
        startDate: banner?.startDate || new Date().toISOString().split('T')[0],
        endDate: banner?.endDate || '',
        targetAudience: banner?.targetAudience || 'All',
    });
    const [imageFile, setImageFile] = useState<File | undefined>(undefined);
    const [previewUrl, setPreviewUrl] = useState<string>(banner?.imageUrl || '');
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const validate = (data = formData) => {
        const newErrors: { [key: string]: string } = {};
        if (!data.title.trim()) newErrors.title = "Title is required.";
        if (!data.description.trim()) newErrors.description = "Description is required.";
        if (!previewUrl) newErrors.imageUrl = "Please upload a banner image.";
        if (data.endDate && new Date(data.endDate) < new Date(data.startDate)) {
            newErrors.endDate = "End date must be after start date.";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
        const newData = { ...formData, [name]: newValue };
        setFormData(newData);
        validate(newData);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setPreviewUrl(await fileToBase64(file));
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors.imageUrl;
                return newErrors;
            });
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            if (banner) {
                onSave({ ...banner, ...formData }, imageFile);
            } else {
                onSave(formData, imageFile);
            }
        }
    };

    const isSaveDisabled = Object.keys(errors).length > 0 || !formData.title || !formData.description || !previewUrl;

    return (
        <div className="flex flex-col h-[75vh]">
            {/* Tabs */}
            <div className="flex border-b border-white/5 mb-6 flex-shrink-0 bg-black/20 rounded-t-2xl p-2 gap-2">
                <button
                    onClick={() => setActiveTab('details')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold  tracking-widest text-xs transition-all ${activeTab === 'details'
                        ? 'bg-primary text-white shadow-lg shadow-primary/20'
                        : 'text-gray-500 hover:text-white hover:bg-white/5'
                        }`}
                >
                    <Megaphone size={16} />
                    Details
                </button>
                <button
                    onClick={() => setActiveTab('design')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold  tracking-widest text-xs transition-all ${activeTab === 'design'
                        ? 'bg-primary text-white shadow-lg shadow-primary/20'
                        : 'text-gray-500 hover:text-white hover:bg-white/5'
                        }`}
                >
                    <ImageIcon size={16} />
                    Design
                </button>
                <button
                    onClick={() => setActiveTab('settings')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold  tracking-widest text-xs transition-all ${activeTab === 'settings'
                        ? 'bg-primary text-white shadow-lg shadow-primary/20'
                        : 'text-gray-500 hover:text-white hover:bg-white/5'
                        }`}
                >
                    <Target size={16} />
                    Targeting
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-2">
                {activeTab === 'details' && (
                    <div className="space-y-6 animate-fadeIn">
                        <div>
                            <label htmlFor="campaign-title" className="block text-[10px] font-black  tracking-widest text-gray-500 mb-2">Campaign Title</label>
                            <input
                                type="text"
                                id="campaign-title"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                placeholder="e.g. Summer Sale 2024"
                                className="w-full px-4 py-3 bg-white/5 border border-white/5 rounded-xl text-white placeholder-gray-600 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all font-bold"
                            />
                            {errors.title && <p className="text-red-500 text-[10px] font-bold  tracking-widest mt-1">{errors.title}</p>}
                        </div>

                        <div>
                            <label htmlFor="campaign-description" className="block text-[10px] font-black  tracking-widest text-gray-500 mb-2">Description</label>
                            <textarea
                                id="campaign-description"
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                placeholder="Describe your campaign..."
                                rows={4}
                                className="w-full px-4 py-3 bg-white/5 border border-white/5 rounded-xl text-white placeholder-gray-600 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all font-medium resize-none"
                            />
                            {errors.description && <p className="text-red-500 text-[10px] font-bold  tracking-widest mt-1">{errors.description}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="campaign-start-date" className="block text-[10px] font-black  tracking-widest text-gray-500 mb-2">Start Date</label>
                                <input
                                    type="date"
                                    id="campaign-start-date"
                                    name="startDate"
                                    value={formData.startDate}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/5 rounded-xl text-white font-bold outline-none focus:border-primary transition-colors text-sm"
                                />
                            </div>
                            <div>
                                <label htmlFor="campaign-end-date" className="block text-[10px] font-black  tracking-widest text-gray-500 mb-2">End Date (Optional)</label>
                                <input
                                    type="date"
                                    id="campaign-end-date"
                                    name="endDate"
                                    value={formData.endDate}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/5 rounded-xl text-white font-bold outline-none focus:border-primary transition-colors text-sm"
                                />
                                {errors.endDate && <p className="text-red-500 text-[10px] font-bold  tracking-widest mt-1">{errors.endDate}</p>}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'design' && (
                    <div className="space-y-6 animate-fadeIn">
                        <div>
                            <label className="block text-[10px] font-black  tracking-widest text-gray-500 mb-2">Banner Image</label>
                            <div className="relative group">
                                <div className={`aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center transition-all overflow-hidden ${previewUrl ? 'border-primary/50' : 'border-white/10 hover:border-white/20 hover:bg-white/5'}`}>
                                    {previewUrl ? (
                                        <>
                                            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <p className="text-white font-black  tracking-widest text-xs">Click to Change Image</p>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-center p-8">
                                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                                <ImageIcon size={32} className="text-gray-400 group-hover:text-white" />
                                            </div>
                                            <p className="text-gray-300 font-bold  tracking-wide text-xs">Click to upload banner</p>
                                            <p className="text-gray-600 text-[10px] mt-1 font-mono">Recommended: 1200x600px</p>
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                </div>
                                {errors.imageUrl && <p className="text-red-500 text-[10px] font-bold  tracking-widest mt-2">{errors.imageUrl}</p>}
                            </div>
                        </div>

                        <div>
                            <label htmlFor="campaign-url" className="block text-[10px] font-black  tracking-widest text-gray-500 mb-2">Link / Action URL</label>
                            <input
                                type="text"
                                id="campaign-url"
                                name="link"
                                value={formData.link}
                                onChange={handleChange}
                                placeholder="/services/oil-change"
                                className="w-full px-4 py-3 bg-white/5 border border-white/5 rounded-xl text-white placeholder-gray-600 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all font-bold"
                            />
                            <p className="text-[10px] text-gray-500 mt-2 font-medium">Where should this banner link to when clicked?</p>
                        </div>
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="space-y-6 animate-fadeIn">
                        <div>
                            <label htmlFor="campaign-audience" className="block text-[10px] font-black  tracking-widest text-gray-500 mb-2">Target Audience</label>
                            <select
                                id="campaign-audience"
                                name="targetAudience"
                                value={formData.targetAudience}
                                onChange={handleChange}
                                className="w-full px-4 py-3 bg-white/5 border border-white/5 rounded-xl text-white font-bold outline-none focus:border-primary appearance-none cursor-pointer"
                            >
                                <option value="All" className="bg-[#121212]">All Users</option>
                                <option value="Customers" className="bg-[#121212]">Customers Only</option>
                                <option value="Mechanics" className="bg-[#121212]">Mechanics Only</option>
                                <option value="New Users" className="bg-[#121212]">New Users (Less than 30 days)</option>
                            </select>
                        </div>

                        <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-white font-bold  tracking-wide text-sm">Banner Status</h3>
                                    <p className="text-xs text-gray-500 mt-1">Control the visibility of this campaign.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name="isActive"
                                        checked={formData.isActive}
                                        onChange={handleChange}
                                        className="sr-only peer"
                                    />
                                    <div className="w-14 h-7 bg-black peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary border border-white/10"></div>
                                </label>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="pt-6 mt-6 border-t border-white/5 flex justify-end gap-3 flex-shrink-0">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-6 py-4 rounded-xl text-gray-500 font-black  tracking-widest text-xs hover:bg-white/5 hover:text-white transition-all"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={isSaveDisabled}
                    className={`px-8 py-4 rounded-xl font-black  tracking-widest text-xs text-white transition-all shadow-lg flex items-center gap-2 ${isSaveDisabled
                        ? 'bg-gray-800 cursor-not-allowed opacity-50 text-gray-500'
                        : 'bg-primary hover:bg-orange-600 shadow-primary/20 hover:shadow-glow-primary hover:-translate-y-1'
                        }`}
                >
                    {banner ? (
                        <>
                            <CheckCircle size={16} />
                            Save Changes
                        </>
                    ) : (
                        <>
                            <Plus size={16} />
                            Create Campaign
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

const AdminMarketingScreen: React.FC = () => {
    const { db, addBanner, updateBanner, deleteBanner, loading } = useDatabase();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBanner, setEditingBanner] = useState<Banner | undefined>(undefined);
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' }>({ key: 'title', direction: 'ascending' });

    const requestSort = (key: SortableKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key: SortableKeys) => {
        if (sortConfig.key !== key) return <ArrowUpDown size={14} className="text-gray-600 ml-1" />;
        return sortConfig.direction === 'ascending' ? <ChevronDown size={14} className="text-primary rotate-180 ml-1" /> : <ChevronDown size={14} className="text-primary ml-1" />;
    };

    const stats = useMemo(() => {
        if (!db) return { totalCampaigns: 0, activeCampaigns: 0, totalImpressions: 0, avgEngagement: 0 };

        const totalCampaigns = db.banners.length;
        const activeCampaigns = db.banners.filter(b => b.isActive).length;
        // Mock data for impressions and engagement
        const totalImpressions = totalCampaigns * 1250;
        const avgEngagement = 68; // percentage

        return { totalCampaigns, activeCampaigns, totalImpressions, avgEngagement };
    }, [db]);

    const filteredBanners = useMemo(() => {
        if (!db) return [];
        let filtered = db.banners.filter(banner => {
            if (filterStatus === 'active') return banner.isActive;
            if (filterStatus === 'inactive') return !banner.isActive;
            return true;
        });

        filtered.sort((a, b) => {
            let aValue: any;
            let bValue: any;

            switch (sortConfig.key) {
                case 'title':
                    aValue = (a.title || (a as any).name || '').toLowerCase();
                    bValue = (b.title || (b as any).name || '').toLowerCase();
                    break;
                case 'startDate':
                    aValue = new Date(a.startDate || 0).getTime();
                    bValue = new Date(b.startDate || 0).getTime();
                    break;
                case 'isActive':
                    aValue = a.isActive === undefined ? false : a.isActive;
                    bValue = b.isActive === undefined ? false : b.isActive;
                    break;
                case 'targetAudience':
                    aValue = (a.targetAudience || '').toLowerCase();
                    bValue = (b.targetAudience || '').toLowerCase();
                    break;
                default:
                    aValue = (a.title || '').toLowerCase();
                    bValue = (b.title || '').toLowerCase();
            }

            if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });

        return filtered;
    }, [db, filterStatus, sortConfig]);

    if (loading || !db) {
        return <div className="flex items-center justify-center h-full"><Spinner size="lg" color="text-white" /></div>;
    }

    const handleOpenModal = (banner?: Banner) => {
        setEditingBanner(banner);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingBanner(undefined);
        setIsModalOpen(false);
    };

    const handleSaveBanner = async (banner: Omit<Banner, 'id'> | Banner, imageFile?: File) => {
        try {
            if ('id' in banner) {
                await updateBanner(banner, imageFile);
            } else {
                await addBanner(banner, imageFile);
            }
            handleCloseModal();
        } catch (error) {
            console.error("Error saving banner:", error);
            alert("Failed to save banner. Please check your connection and try again.");
        }
    };

    const handleDeleteBanner = (id: string) => {
        deleteBanner(id);
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 animate-slideInUp">
                <div>
                    <h1 className="text-5xl font-black text-white tracking-tighter  leading-none">Marketing</h1>
                    <div className="flex items-center gap-2 mt-4">
                        <div className="h-1 w-12 bg-primary rounded-full"></div>
                        <p className="text-gray-500 font-bold  tracking-[0.3em] text-[10px]">Campaigns & Promotions</p>
                    </div>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="px-6 py-4 bg-primary hover:bg-orange-600 text-white rounded-[1.5rem] font-black  tracking-widest text-[10px] transition-all shadow-lg shadow-primary/20 hover:shadow-glow-primary flex items-center gap-3 active:scale-95 group"
                >
                    <Plus size={18} className="group-hover:rotate-90 transition-transform duration-500" />
                    New Campaign
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-slideInUp delay-100">
                <EnhancedKPICard
                    title="Total Campaigns"
                    value={stats.totalCampaigns}
                    icon={<Megaphone size={24} className="text-white" />}
                    gradient="bg-gradient-to-br from-blue-600 to-blue-800"
                    trend={{ value: 20, isPositive: true }}
                    subtitle="All time"
                />
                <EnhancedKPICard
                    title="Active Campaigns"
                    value={stats.activeCampaigns}
                    icon={<Target size={24} className="text-white" />}
                    gradient="bg-gradient-to-br from-green-600 to-green-800"
                    subtitle="Currently running"
                />
                <EnhancedKPICard
                    title="Total Impressions"
                    value={stats.totalImpressions.toLocaleString()}
                    icon={<Eye size={24} className="text-white" />}
                    gradient="bg-gradient-to-br from-purple-600 to-purple-800"
                    trend={{ value: 35, isPositive: true }}
                    subtitle="Views"
                />
                <EnhancedKPICard
                    title="Avg. Engagement"
                    value={`${stats.avgEngagement}%`}
                    icon={<TrendingUp size={24} className="text-white" />}
                    gradient="bg-gradient-to-br from-orange-600 to-orange-800"
                    trend={{ value: 12, isPositive: true }}
                    subtitle="Click-through rate"
                />
            </div>

            {/* Filter */}
            {/* Filter */}
            <div className="bg-[#121212]/80 backdrop-blur-2xl border border-white/10 p-8 rounded-[2.5rem] relative group mb-8 animate-slideInUp delay-200">
                <div className="absolute -inset-1 bg-gradient-to-r from-pink-600 to-purple-600 rounded-[2.5rem] blur opacity-5 group-hover:opacity-10 transition duration-1000"></div>
                <div className="flex flex-col lg:flex-row justify-between items-center gap-6 relative z-10">
                    <div className="flex items-center gap-4 w-full lg:w-auto">
                        <label htmlFor="campaign-filter" className="text-[10px] font-black  tracking-widest text-gray-500 whitespace-nowrap">Filter Status</label>
                        <select
                            id="campaign-filter"
                            name="campaign-filter"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value as any)}
                            className="w-full lg:w-64 px-6 py-4 bg-white/5 border border-white/5 rounded-2xl text-white font-bold outline-none focus:border-primary appearance-none cursor-pointer hover:bg-white/10 transition-colors"
                        >
                            <option value="all" className="bg-[#121212]">All Campaigns</option>
                            <option value="active" className="bg-[#121212]">Active Only</option>
                            <option value="inactive" className="bg-[#121212]">Inactive Only</option>
                        </select>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
                        <span className="text-[10px] font-black  tracking-widest text-gray-500 mr-2">Sort by</span>
                        <button
                            onClick={() => requestSort('title')}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black  tracking-widest border transition-all flex items-center gap-1 ${sortConfig.key === 'title' ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-white/5 text-gray-400 border-white/5 hover:text-white hover:bg-white/10'}`}
                        >
                            TITLE {getSortIndicator('title')}
                        </button>
                        <button
                            onClick={() => requestSort('startDate')}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black  tracking-widest border transition-all flex items-center gap-1 ${sortConfig.key === 'startDate' ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-white/5 text-gray-400 border-white/5 hover:text-white hover:bg-white/10'}`}
                        >
                            DATE {getSortIndicator('startDate')}
                        </button>
                        <button
                            onClick={() => requestSort('isActive')}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black  tracking-widest border transition-all flex items-center gap-1 ${sortConfig.key === 'isActive' ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-white/5 text-gray-400 border-white/5 hover:text-white hover:bg-white/10'}`}
                        >
                            STATUS {getSortIndicator('isActive')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Campaigns Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredBanners.length > 0 ? filteredBanners.map((banner, index) => (
                    <div key={banner.id} className="bg-[#121212] rounded-[2rem] overflow-hidden border border-white/5 hover:border-primary/50 transition-all duration-300 group shadow-2xl animate-fadeIn" style={{ animationDelay: `${index * 50}ms` }}>
                        <div className="relative h-56 overflow-hidden">
                            <img src={banner.imageUrl} alt={banner.title} className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>

                            {/* Status Badge */}
                            <div className="absolute top-4 left-4">
                                {banner.isActive ? (
                                    <span className="px-4 py-2 bg-green-500/90 backdrop-blur-md text-black text-[10px] font-black  tracking-widest rounded-xl shadow-lg flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse"></span>
                                        Active
                                    </span>
                                ) : (
                                    <span className="px-4 py-2 bg-black/60 backdrop-blur-md border border-white/10 text-gray-400 text-[10px] font-black  tracking-widest rounded-xl">
                                        Inactive
                                    </span>
                                )}
                            </div>

                            {/* Action Buttons Overlay */}
                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-[-10px] group-hover:translate-y-0">
                                <button
                                    onClick={() => handleOpenModal(banner)}
                                    className="p-3 bg-white text-black hover:bg-primary hover:text-white rounded-xl shadow-lg transition-all"
                                    title="Edit"
                                >
                                    <Edit size={16} />
                                </button>
                                <button
                                    onClick={() => handleDeleteBanner(banner.id)}
                                    className="p-3 bg-red-500 text-white hover:bg-red-600 rounded-xl shadow-lg transition-all"
                                    title="Delete"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="p-8">
                            <h3 className="font-black text-white text-xl mb-3 line-clamp-1 group-hover:text-primary transition-colors  tracking-tight">{banner.title}</h3>
                            <p className="text-sm text-gray-500 font-medium mb-6 line-clamp-2 h-10">{banner.description}</p>

                            <div className="pt-6 border-t border-white/5 space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white/5 rounded-lg text-primary">
                                        <Calendar size={14} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black  tracking-widest text-gray-600">Duration</span>
                                        <span className="text-xs font-bold text-gray-300">
                                            {new Date(banner.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            {banner.endDate && ` - ${new Date(banner.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white/5 rounded-lg text-purple-400">
                                        <Target size={14} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black  tracking-widest text-gray-600">Audience</span>
                                        <span className="text-xs font-bold text-white">{banner.targetAudience}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="col-span-full py-24 bg-[#121212] rounded-[2.5rem] border-2 border-dashed border-white/5 flex flex-col items-center justify-center text-center">
                        <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6">
                            <Megaphone size={40} className="text-gray-600" />
                        </div>
                        <h3 className="text-2xl font-black text-white  tracking-tight mb-2">No campaigns found</h3>
                        <p className="text-gray-500 font-medium max-w-md mx-auto mb-8">Create your first marketing campaign to engage with your customers and mechanics.</p>
                        <button
                            onClick={() => handleOpenModal()}
                            className="px-8 py-4 bg-primary hover:bg-orange-600 text-white rounded-[1.5rem] font-black  tracking-widest text-[10px] transition-all shadow-lg shadow-primary/20 flex items-center gap-3"
                        >
                            <Plus size={18} />
                            Create Campaign
                        </button>
                    </div>
                )}
            </div>

            <Modal title={editingBanner ? 'Edit Campaign' : 'Create Campaign'} isOpen={isModalOpen} onClose={handleCloseModal}>
                <BannerForm banner={editingBanner} onSave={handleSaveBanner} onCancel={handleCloseModal} />
            </Modal>
        </div>
    );
};

export default AdminMarketingScreen;
