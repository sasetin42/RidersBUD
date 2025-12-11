import React, { useState, useMemo } from 'react';
import { Mechanic } from '../../types';
import Modal from '../../components/admin/Modal';
import { useDatabase } from '../../context/DatabaseContext';
import Spinner from '../../components/Spinner';
import { Search, Plus, MapPin, Star, Mail, Phone, Calendar, CheckCircle, XCircle, AlertCircle, Wrench, FileText, Shield, Award, ExternalLink, Car } from 'lucide-react';

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

const MechanicDetailsModal: React.FC<{ mechanic: Mechanic; onClose: () => void; }> = ({ mechanic, onClose }) => {
    const { db } = useDatabase();
    const [activeTab, setActiveTab] = useState<'profile' | 'bookings' | 'financials'>('profile');

    // Memoized Stats & Data
    const { bookings, financials, stats } = useMemo(() => {
        if (!db) return { bookings: [], financials: { income: 0, payouts: 0, wallet: 0, history: [] }, stats: { completed: 0, rating: 0 } };

        const mechBookings = db.bookings
            .filter(b => b.mechanic?.id === mechanic.id)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const totalIncome = mechBookings
            .filter(b => b.status === 'Completed')
            .reduce((acc, b) => acc + b.service.price, 0);

        const mechPayouts = db.payouts
            .filter(p => p.mechanicId === mechanic.id)
            .sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());

        const totalPaidOut = mechPayouts
            .filter(p => p.status === 'Approved')
            .reduce((acc, p) => acc + p.amount, 0);

        return {
            bookings: mechBookings,
            financials: {
                income: totalIncome,
                payouts: totalPaidOut,
                wallet: totalIncome - totalPaidOut,
                history: mechPayouts
            },
            stats: {
                completed: mechBookings.filter(b => b.status === 'Completed').length,
                rating: mechanic.rating
            }
        };
    }, [db, mechanic.id, mechanic.rating]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Completed': return 'text-green-400 bg-green-500/10 border-green-500/20';
            case 'In Progress': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
            case 'En Route': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
            case 'Upcoming': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
            case 'Cancelled': return 'text-red-400 bg-red-500/10 border-red-500/20';
            case 'Approved': return 'text-green-400 bg-green-500/10 border-green-500/20';
            case 'Pending': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
            case 'Rejected': return 'text-red-400 bg-red-500/10 border-red-500/20';
            default: return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
        }
    };

    return (
        <Modal title="Mechanic Profile" isOpen={true} onClose={onClose} maxWidth="max-w-4xl">
            <div className="space-y-6 text-white h-[600px] flex flex-col">
                {/* Header Section */}
                <div className="flex items-center gap-6 pb-6 border-b border-white/10 shrink-0">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white/10 shadow-2xl shrink-0 bg-white/5">
                        <img src={mechanic.imageUrl} alt={mechanic.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <h1 className="text-2xl font-bold truncate">{mechanic.name}</h1>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-400 mt-1">
                                    <span className="flex items-center gap-1"><Mail size={14} /> {mechanic.email}</span>
                                    <span className="flex items-center gap-1"><Phone size={14} /> {mechanic.phone}</span>
                                </div>
                            </div>
                            <span className={`px-3 py-1 text-xs font-bold uppercase rounded-full border ${getStatusColor(mechanic.status)}`}>
                                {mechanic.status}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-6 border-b border-white/10 shrink-0">
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`pb-3 text-sm font-bold transition-all relative ${activeTab === 'profile' ? 'text-primary' : 'text-gray-500 hover:text-white'}`}
                    >
                        Profile Overview
                        {activeTab === 'profile' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></div>}
                    </button>
                    <button
                        onClick={() => setActiveTab('bookings')}
                        className={`pb-3 text-sm font-bold transition-all relative ${activeTab === 'bookings' ? 'text-primary' : 'text-gray-500 hover:text-white'}`}
                    >
                        Booking History <span className="ml-1 text-xs bg-white/10 px-1.5 py-0.5 rounded-full">{bookings.length}</span>
                        {activeTab === 'bookings' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></div>}
                    </button>
                    <button
                        onClick={() => setActiveTab('financials')}
                        className={`pb-3 text-sm font-bold transition-all relative ${activeTab === 'financials' ? 'text-primary' : 'text-gray-500 hover:text-white'}`}
                    >
                        Financials
                        {activeTab === 'financials' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></div>}
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">

                    {/* PROFILE TAB */}
                    {activeTab === 'profile' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn">
                            {/* Bio & Specs */}
                            <div className="md:col-span-2 space-y-6">
                                <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">About</h3>
                                    <p className="text-gray-300 italic text-sm leading-relaxed">"{mechanic.bio || 'No bio provided.'}"</p>

                                    <div className="flex flex-wrap gap-2 mt-4">
                                        {mechanic.specializations.map((spec, i) => (
                                            <span key={i} className="px-3 py-1 rounded-lg bg-black/20 border border-white/5 text-xs text-gray-300">
                                                {spec}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <Shield size={14} /> Documents & Verification
                                    </h3>
                                    <div className="grid gap-3">
                                        <div className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/5">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg"><FileText size={18} /></div>
                                                <div>
                                                    <p className="text-sm font-bold text-white">Business License</p>
                                                    <p className="text-[10px] text-gray-500">{mechanic.businessLicenseUrl ? 'Verified' : 'Missing'}</p>
                                                </div>
                                            </div>
                                            {mechanic.businessLicenseUrl && (
                                                <a href={mechanic.businessLicenseUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">View <ExternalLink size={10} /></a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Sidebar Key Stats */}
                            <div className="space-y-4">
                                <div className="bg-gradient-to-br from-white/10 to-white/5 p-5 rounded-2xl border border-white/10 text-center">
                                    <div className="inline-flex items-center justify-center p-3 rounded-full bg-yellow-500/20 text-yellow-400 mb-2">
                                        <Star size={24} fill="currentColor" />
                                    </div>
                                    <p className="text-3xl font-bold text-white">{stats.rating.toFixed(1)}</p>
                                    <p className="text-xs text-gray-400 uppercase tracking-wider">Average Rating</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white/5 p-4 rounded-xl border border-white/5 text-center">
                                        <p className="text-2xl font-bold text-white">{stats.completed}</p>
                                        <p className="text-[10px] text-gray-500 uppercase">Jobs Done</p>
                                    </div>
                                    <div className="bg-white/5 p-4 rounded-xl border border-white/5 text-center">
                                        <p className="text-2xl font-bold text-white">{mechanic.reviews}</p>
                                        <p className="text-[10px] text-gray-500 uppercase">Reviews</p>
                                    </div>
                                </div>

                                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                    <p className="text-xs text-gray-500 mb-1">Date Joined</p>
                                    <p className="text-sm font-bold text-white flex items-center gap-2">
                                        <Calendar size={14} /> {new Date(mechanic.registrationDate).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* BOOKINGS TAB */}
                    {activeTab === 'bookings' && (
                        <div className="space-y-4 animate-fadeIn">
                            {bookings.length > 0 ? (
                                bookings.map((booking) => (
                                    <div key={booking.id} className="flex flex-col sm:flex-row gap-4 bg-white/5 p-4 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                                        <div className="flex-1 space-y-1">
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-bold text-white">{booking.service.name}</h4>
                                                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${getStatusColor(booking.status)}`}>{booking.status}</span>
                                            </div>
                                            <p className="text-sm text-gray-400">Customer: <span className="text-white">{booking.customerName}</span></p>
                                            <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                                                <span className="flex items-center gap-1"><Calendar size={12} /> {booking.date}</span>
                                                <span className="flex items-center gap-1"><Car size={12} /> {booking.vehicle.year} {booking.vehicle.model}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-end border-t sm:border-t-0 sm:border-l border-white/10 pt-3 sm:pt-0 sm:pl-4">
                                            <p className="text-xl font-bold text-primary">₱{booking.service.price.toLocaleString()}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-20 text-gray-500">
                                    <p>No booking history available.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* FINANCIALS TAB */}
                    {activeTab === 'financials' && (
                        <div className="space-y-6 animate-fadeIn">

                            {/* Financial Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-gradient-to-br from-green-500/20 to-green-600/5 p-5 rounded-2xl border border-green-500/20">
                                    <p className="text-xs font-bold text-green-400 uppercase">Total Income</p>
                                    <p className="text-2xl font-bold text-white mt-1">₱{financials.income.toLocaleString()}</p>
                                    <p className="text-[10px] text-gray-400 mt-2">Gross from completed jobs</p>
                                </div>
                                <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/5 p-5 rounded-2xl border border-orange-500/20">
                                    <p className="text-xs font-bold text-orange-400 uppercase">Paid Out</p>
                                    <p className="text-2xl font-bold text-white mt-1">₱{financials.payouts.toLocaleString()}</p>
                                    <p className="text-[10px] text-gray-400 mt-2">Transferred to mechanic</p>
                                </div>
                                <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/5 p-5 rounded-2xl border border-blue-500/20">
                                    <p className="text-xs font-bold text-blue-400 uppercase">Current Wallet</p>
                                    <p className="text-2xl font-bold text-white mt-1">₱{financials.wallet.toLocaleString()}</p>
                                    <p className="text-[10px] text-gray-400 mt-2">Available for withdrawal</p>
                                </div>
                            </div>

                            {/* Payout History */}
                            <div>
                                <h3 className="text-sm font-bold text-white mb-4">Payout History</h3>
                                <div className="bg-white/5 rounded-xl border border-white/5 overflow-hidden">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-black/20 text-gray-400 text-xs uppercase font-bold">
                                            <tr>
                                                <th className="p-3">Reference ID</th>
                                                <th className="p-3">Date</th>
                                                <th className="p-3">Status</th>
                                                <th className="p-3 text-right">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {financials.history.length > 0 ? (
                                                financials.history.map(payout => (
                                                    <tr key={payout.id} className="hover:bg-white/5">
                                                        <td className="p-3 font-mono text-gray-300">{payout.id}</td>
                                                        <td className="p-3 text-gray-300">{payout.requestDate}</td>
                                                        <td className="p-3">
                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getStatusColor(payout.status)}`}>
                                                                {payout.status}
                                                            </span>
                                                        </td>
                                                        <td className="p-3 text-right font-bold text-white">₱{payout.amount.toLocaleString()}</td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={4} className="p-8 text-center text-gray-500">No payout records found.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </Modal>
    );
};

const MechanicFormModal: React.FC<{
    mechanic?: Mechanic;
    onClose: () => void;
    onSave: (mechanic: Mechanic | Omit<Mechanic, 'id' | 'status' | 'rating' | 'reviews'>) => void;
}> = ({ mechanic, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        name: mechanic?.name || '',
        email: mechanic?.email || '',
        password: '',
        phone: mechanic?.phone || '',
        bio: mechanic?.bio || '',
        specializations: mechanic?.specializations || [],
        imageUrl: mechanic?.imageUrl || 'https://picsum.photos/seed/newmech/200/200',
    });
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        await new Promise(resolve => setTimeout(resolve, 500));

        const dataToSave = mechanic
            ? { ...mechanic, ...formData, password: formData.password || mechanic.password }
            : {
                ...formData,
                password: formData.password || 'password123',
                lat: 14.55 + (Math.random() - 0.5) * 0.1,
                lng: 121.02 + (Math.random() - 0.5) * 0.1,
                registrationDate: new Date().toISOString().split('T')[0],
                birthday: '',
            };

        onSave(dataToSave);
        setIsSaving(false);
    };

    return (
        <Modal title={mechanic ? "Edit Mechanic Profile" : "Register New Mechanic"} isOpen={true} onClose={onClose}>
            <div className="space-y-6 text-white min-w-[500px]">
                <div className="flex gap-6">
                    {/* Image Preview */}
                    <div className="w-1/3 flex flex-col items-center gap-2">
                        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white/10 shadow-xl">
                            <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                        <button className="text-xs text-primary hover:text-white underline">Change Photo</button>
                    </div>

                    {/* Inputs */}
                    <div className="w-2/3 space-y-4">
                        <div>
                            <label className="text-xs text-gray-400 uppercase font-bold">Full Name</label>
                            <input type="text" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-2.5 focus:border-primary focus:ring-1 focus:ring-primary outline-none" placeholder="e.g. John Doe" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 uppercase font-bold">Email Address</label>
                            <input type="email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-2.5 focus:border-primary focus:ring-1 focus:ring-primary outline-none" placeholder="e.g. john@example.com" />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs text-gray-400 uppercase font-bold">Phone Number</label>
                        <input type="tel" value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-2.5 focus:border-primary focus:ring-1 focus:ring-primary outline-none" placeholder="e.g. 09123456789" />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 uppercase font-bold">Password</label>
                        <input type="password" value={formData.password} onChange={e => setFormData(p => ({ ...p, password: e.target.value }))} className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-2.5 focus:border-primary focus:ring-1 focus:ring-primary outline-none" placeholder={mechanic ? "Unchanged" : "Set Password"} />
                    </div>
                </div>

                <div>
                    <label className="text-xs text-gray-400 uppercase font-bold">Bio</label>
                    <textarea value={formData.bio} onChange={e => setFormData(p => ({ ...p, bio: e.target.value }))} className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-2.5 focus:border-primary focus:ring-1 focus:ring-primary outline-none h-24" placeholder="Brief description of the mechanic..." />
                </div>

                <div>
                    <label className="text-xs text-gray-400 uppercase font-bold">Specializations</label>
                    <div className="flex flex-wrap gap-2 mb-2 p-2 bg-[#0a0a0a] border border-white/10 rounded-lg min-h-[42px]">
                        {formData.specializations.map((spec, i) => (
                            <span key={i} className="bg-white/10 px-2 py-0.5 rounded text-xs flex items-center gap-1">
                                {spec} <button onClick={() => setFormData(p => ({ ...p, specializations: p.specializations.filter((_, idx) => idx !== i) }))} className="hover:text-red-400">×</button>
                            </span>
                        ))}
                        <input
                            type="text"
                            className="bg-transparent outline-none text-sm flex-grow min-w-[100px]"
                            placeholder={formData.specializations.length === 0 ? "Type and press comma..." : ""}
                            onKeyDown={(e) => {
                                if (e.key === ',' || e.key === 'Enter') {
                                    e.preventDefault();
                                    const val = (e.target as HTMLInputElement).value.trim();
                                    if (val) {
                                        setFormData(p => ({ ...p, specializations: [...p.specializations, val] }));
                                        (e.target as HTMLInputElement).value = '';
                                    }
                                }
                            }}
                        />
                    </div>
                    <p className="text-[10px] text-gray-500 text-right">Press Enter or Comma to add specialization</p>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                    <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 transition-colors font-bold text-gray-300">Cancel</button>
                    <button onClick={handleSave} disabled={isSaving} className="px-5 py-2.5 rounded-xl bg-primary hover:bg-orange-600 transition-colors font-bold text-white shadow-lg shadow-orange-500/20 flex items-center gap-2">
                        {isSaving ? <Spinner size="sm" color="text-white" /> : 'Save Mechanic'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

/* -------------------------------------------------------------------------- */
/*                               MAIN COMPONENT                               */
/* -------------------------------------------------------------------------- */

const AdminMechanicsScreen: React.FC = () => {
    const { db, updateMechanicStatus, deleteMechanic, updateMechanic, addMechanic, loading } = useDatabase();

    // State
    const [editingMechanic, setEditingMechanic] = useState<Mechanic | undefined>(undefined);
    const [viewingMechanic, setViewingMechanic] = useState<Mechanic | null>(null);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Inactive' | 'Pending'>('all');

    if (loading || !db) return <div className="flex items-center justify-center h-full"><Spinner size="lg" color="text-white" /></div>

    // Derived Data
    const filteredMechanics = useMemo(() => {
        return db.mechanics.filter(mechanic => {
            const searchMatch = mechanic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                mechanic.email.toLowerCase().includes(searchQuery.toLowerCase());
            const statusMatch = statusFilter === 'all' || mechanic.status === statusFilter;
            return searchMatch && statusMatch;
        });
    }, [db.mechanics, searchQuery, statusFilter]);

    const stats = useMemo(() => ({
        total: db.mechanics.length,
        active: db.mechanics.filter(m => m.status === 'Active').length,
        pending: db.mechanics.filter(m => m.status === 'Pending').length,
        rating: (db.mechanics.reduce((acc, m) => acc + m.rating, 0) / db.mechanics.length).toFixed(1),
    }), [db.mechanics]);

    // Handlers
    const handleSaveMechanic = (mechanicData: Mechanic | Omit<Mechanic, 'id' | 'status' | 'rating' | 'reviews'>) => {
        if ('id' in mechanicData) updateMechanic(mechanicData);
        else addMechanic({ ...mechanicData, status: 'Pending', rating: 0, reviews: 0, registrationDate: new Date().toISOString().split('T')[0], birthday: '' });
        setIsFormModalOpen(false);
        setEditingMechanic(undefined);
    };

    const handleDeleteMechanic = (mechanic: Mechanic) => {
        if (window.confirm(`Are you sure you want to delete ${mechanic.name}?`)) deleteMechanic(mechanic.id);
    }

    return (
        <div className="space-y-8 animate-slideInUp">
            {/* Header & Stats */}
            <div>
                <h1 className="text-3xl font-bold text-white mb-6">Manage Mechanics</h1>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard title="Total Mechanics" value={stats.total} icon={<Wrench size={24} />} color="bg-blue-500" />
                    <StatCard title="Active Now" value={stats.active} icon={<CheckCircle size={24} />} color="bg-green-500" />
                    <StatCard title="Pending Approval" value={stats.pending} icon={<AlertCircle size={24} />} color="bg-yellow-500" />
                    <StatCard title="Avg. Rating" value={stats.rating} icon={<Star size={24} />} color="bg-orange-500" />
                </div>
            </div>

            {/* Content Area */}
            <div className="flex flex-col gap-6">
                {/* Toolbar */}
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5">
                    <div className="relative w-full md:w-1/3 group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Search mechanics..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all placeholder-gray-600"
                        />
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                            className="bg-[#0a0a0a] text-white border border-white/10 rounded-xl px-4 py-2.5 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 cursor-pointer hover:bg-white/5 transition-colors flex-grow md:flex-grow-0"
                        >
                            <option value="all">All Statuses</option> <option value="Active">Active</option> <option value="Inactive">Inactive</option> <option value="Pending">Pending</option>
                        </select>
                        <button
                            onClick={() => { setEditingMechanic(undefined); setIsFormModalOpen(true); }}
                            className="bg-primary hover:bg-orange-600 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-lg shadow-orange-500/20 flex items-center gap-2 whitespace-nowrap"
                        >
                            <Plus size={20} /> <span className="hidden sm:inline">Add Mechanic</span>
                        </button>
                    </div>
                </div>

                {/* Grid View */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredMechanics.map(mechanic => (
                        <div
                            key={mechanic.id}
                            onClick={() => setViewingMechanic(mechanic)}
                            className="glass-panel rounded-2xl p-5 border border-white/5 relative group hover:border-primary/30 transition-all duration-300 cursor-pointer"
                        >
                            {/* Status Badge */}
                            <div className="absolute top-4 right-4 z-10">
                                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border ${mechanic.status === 'Active' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                    mechanic.status === 'Pending' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                        'bg-red-500/10 text-red-400 border-red-500/20'
                                    }`}>
                                    {mechanic.status}
                                </span>
                            </div>

                            {/* Profile Header */}
                            <div className="flex items-center gap-4 mb-4">
                                <div className="relative">
                                    <img src={mechanic.imageUrl} alt={mechanic.name} className="w-16 h-16 rounded-full object-cover ring-2 ring-white/10 group-hover:ring-primary transition-colors" />
                                    <div className="absolute -bottom-1 -right-1 bg-[#0a0a0a] rounded-full p-1">
                                        <div className="bg-yellow-400 text-black text-[10px] font-bold px-1.5 rounded-full flex items-center gap-0.5">
                                            <Star size={8} fill="currentColor" /> {mechanic.rating.toFixed(1)}
                                        </div>
                                    </div>
                                </div>
                                <div className="overflow-hidden">
                                    <h3 className="font-bold text-lg text-white truncate">{mechanic.name}</h3>
                                    <p className="text-xs text-gray-400 truncate flex items-center gap-1"><Mail size={10} /> {mechanic.email}</p>
                                    <p className="text-xs text-gray-400 truncate flex items-center gap-1"><Phone size={10} /> {mechanic.phone}</p>
                                </div>
                            </div>

                            {/* Tags */}
                            <div className="flex flex-wrap gap-2 mb-4 h-14 overflow-hidden content-start">
                                {mechanic.specializations.slice(0, 4).map((spec, i) => (
                                    <span key={i} className="text-[10px] bg-white/5 text-gray-300 px-2 py-1 rounded border border-white/5">{spec}</span>
                                ))}
                                {mechanic.specializations.length > 4 && <span className="text-[10px] bg-white/5 text-gray-300 px-2 py-1 rounded border border-white/5">+{mechanic.specializations.length - 4}</span>}
                            </div>

                            {/* Footer Actions */}
                            <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                <span className="text-xs text-gray-600 flex items-center gap-1">
                                    <Calendar size={12} /> Joined {new Date(mechanic.registrationDate).toLocaleDateString()}
                                </span>
                                <div className="flex gap-2">
                                    {mechanic.status === 'Pending' && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); updateMechanicStatus(mechanic.id, 'Active'); }}
                                            className="p-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition"
                                            title="Approve"
                                        >
                                            <CheckCircle size={16} />
                                        </button>
                                    )}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setEditingMechanic(mechanic); setIsFormModalOpen(true); }}
                                        className="p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition"
                                        title="Edit"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteMechanic(mechanic); }}
                                        className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition"
                                        title="Delete"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                {filteredMechanics.length === 0 && <p className="text-center py-20 text-gray-500 text-lg">No mechanics found.</p>}
            </div>

            {isFormModalOpen && <MechanicFormModal mechanic={editingMechanic} onClose={() => setIsFormModalOpen(false)} onSave={handleSaveMechanic} />}

            {viewingMechanic && (
                <MechanicDetailsModal
                    mechanic={viewingMechanic}
                    onClose={() => setViewingMechanic(null)}
                />
            )}
        </div>
    );
};

export default AdminMechanicsScreen;