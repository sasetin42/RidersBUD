import React, { useState, useMemo, useEffect } from 'react';
import { Mechanic } from '../../types';
import Modal from '../../components/admin/Modal';
import { useDatabase } from '../../context/DatabaseContext';
import Spinner from '../../components/Spinner';
import LocationMap from '../../components/admin/LocationMap';

import { useNotification } from '../../context/NotificationContext';

const StatCard: React.FC<{ title: string; value: number | string; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-admin-card p-5 rounded-xl shadow-lg flex items-center gap-4 border border-admin-border">
        <div className="bg-admin-bg p-3 rounded-full text-admin-accent">{icon}</div>
        <div>
            <p className="text-2xl font-bold text-admin-text-primary">{value}</p>
            <p className="text-sm text-admin-text-secondary">{title}</p>
        </div>
    </div>
);

const MechanicFormModal: React.FC<{
    mechanic?: Mechanic;
    onClose: () => void;
    onSave: (mechanic: Mechanic | Omit<Mechanic, 'id' | 'status' | 'rating' | 'reviews'>) => Promise<void>;
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
        try {
            if (mechanic) {
                await onSave({
                    ...mechanic,
                    ...formData,
                    password: formData.password || mechanic.password
                });
            } else {
                await onSave({
                    ...formData,
                    password: formData.password || 'password123',
                    lat: 14.55 + (Math.random() - 0.5) * 0.1, // Randomize location
                    lng: 121.02 + (Math.random() - 0.5) * 0.1,
                    registrationDate: new Date().toISOString().split('T')[0],
                    birthday: '',
                });
            }
            onClose();
        } catch (error) {
            console.error("Failed to save mechanic:", error);
        } finally {
            setIsSaving(false);
        }
<<<<<<< HEAD
        setIsSaving(false);
=======
>>>>>>> f51b410 (feat: Implement real-time Admin Panel Settings with database persistence)
    };

    return (
        <Modal title={mechanic ? "Edit Mechanic" : "Add New Mechanic"} isOpen={true} onClose={onClose}>
            <div className="text-white space-y-6 max-h-[75vh] overflow-y-auto pr-2 custom-scrollbar">
                <div className="grid grid-cols-1 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Full Name</label>
                        <input type="text" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} className="w-full p-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-admin-accent focus:border-transparent transition-all outline-none" placeholder="Jane Smith" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Email Address</label>
                        <input type="email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} className="w-full p-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-admin-accent focus:border-transparent transition-all outline-none" placeholder="jane@example.com" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">{mechanic ? "New Password (optional)" : "Password"}</label>
                        <input type="password" value={formData.password} onChange={e => setFormData(p => ({ ...p, password: e.target.value }))} className="w-full p-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-admin-accent focus:border-transparent transition-all outline-none" placeholder="••••••••" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Phone Number</label>
                        <input type="tel" value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} className="w-full p-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-admin-accent focus:border-transparent transition-all outline-none" placeholder="+1 234 567 890" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Bio</label>
                        <textarea value={formData.bio} onChange={e => setFormData(p => ({ ...p, bio: e.target.value }))} className="w-full p-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-admin-accent focus:border-transparent transition-all outline-none min-h-[100px]" placeholder="Experienced mechanic..." />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Specializations (comma-separated)</label>
                        <input type="text" value={formData.specializations.join(', ')} onChange={e => setFormData(p => ({ ...p, specializations: e.target.value.split(',').map(s => s.trim()) }))} className="w-full p-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-admin-accent focus:border-transparent transition-all outline-none" placeholder="Engine, Brakes, Transmission" />
                    </div>
                </div>

                <div className="border-t border-white/10 pt-6 flex justify-end gap-3">
                    <button onClick={onClose} disabled={isSaving} className="px-4 py-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-all font-medium">Cancel</button>
                    <button onClick={handleSave} disabled={isSaving} className="bg-gradient-to-r from-admin-accent to-orange-600 hover:from-orange-600 hover:to-admin-accent text-white font-bold py-2 px-6 rounded-xl shadow-lg shadow-orange-900/20 transform hover:scale-105 transition-all flex items-center justify-center min-w-[100px]">
                        {isSaving ? <Spinner size="sm" /> : 'Save Changes'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};


const AdminMechanicsScreen: React.FC = () => {
    const { db, updateMechanicStatus, deleteMechanic, updateMechanic, addMechanic, loading } = useDatabase();
    const [editingMechanic, setEditingMechanic] = useState<Mechanic | undefined>(undefined);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Inactive' | 'Pending'>('all');

    const filteredMechanics = useMemo(() => {
        if (!db) return [];
        return db.mechanics.filter(mechanic => {
            const searchMatch = mechanic.name.toLowerCase().includes(searchQuery.toLowerCase()) || mechanic.email.toLowerCase().includes(searchQuery.toLowerCase());
            const statusMatch = statusFilter === 'all' || mechanic.status === statusFilter;
            return searchMatch && statusMatch;
        });
    }, [db, searchQuery, statusFilter]);

    if (loading || !db) {
        return <div className="flex items-center justify-center h-full"><Spinner size="lg" color="text-white" /></div>
    }
<<<<<<< HEAD

    const handleSaveMechanic = (mechanicData: Mechanic | Omit<Mechanic, 'id' | 'status' | 'rating' | 'reviews'>) => {
        if ('id' in mechanicData) {
            updateMechanic(mechanicData);
        } else {
            addMechanic({
                ...mechanicData,
                status: 'Pending',
                rating: 0,
                reviews: 0,
                registrationDate: new Date().toISOString().split('T')[0],
                birthday: ''
            });
=======

    const { addNotification } = useNotification();

    const handleSaveMechanic = async (mechanicData: Mechanic | Omit<Mechanic, 'id' | 'status' | 'rating' | 'reviews'>) => {
        try {
            if ('id' in mechanicData) {
                await updateMechanic(mechanicData);
                addNotification({ type: 'success', title: 'Mechanic Updated', message: `${mechanicData.name}'s profile has been saved.`, recipientId: 'all' });
            } else {
                await addMechanic({
                    ...mechanicData,
                    status: 'Pending',
                    rating: 0,
                    reviews: 0,
                });
                addNotification({ type: 'success', title: 'Mechanic Added', message: `${mechanicData.name} has been added and is pending approval.`, recipientId: 'all' });
            }
            setIsFormModalOpen(false);
            setEditingMechanic(undefined);
        } catch (e) {
            addNotification({ type: 'error', title: 'Save Failed', message: (e as Error).message, recipientId: 'all' });
>>>>>>> f51b410 (feat: Implement real-time Admin Panel Settings with database persistence)
        }
    };

    const handleDeleteMechanic = async (mechanic: Mechanic) => {
        if (window.confirm(`Are you sure you want to permanently delete ${mechanic.name}? This action cannot be undone.`)) {
            try {
                await deleteMechanic(mechanic.id);
                addNotification({ type: 'success', title: 'Mechanic Deleted', message: 'The mechanic profile has been removed.', recipientId: 'all' });
            } catch (e) {
                addNotification({ type: 'error', title: 'Deletion Failed', message: (e as Error).message, recipientId: 'all' });
            }
        }
    }

    const handleStatusUpdate = async (id: string, status: 'Active' | 'Inactive') => {
        try {
            await updateMechanicStatus(id, status);
            addNotification({
                type: 'success',
                title: status === 'Active' ? 'Mechanic Approved' : 'Mechanic Rejected',
                message: `Mechanic status updated to ${status}.`,
                recipientId: 'all'
            });
        } catch (e) {
            addNotification({ type: 'error', title: 'Update Failed', message: (e as Error).message, recipientId: 'all' });
        }
    };

    const stats = useMemo(() => ({
        total: db.mechanics.length,
        active: db.mechanics.filter(m => m.status === 'Active').length,
        pending: db.mechanics.filter(m => m.status === 'Pending').length,
        inactive: db.mechanics.filter(m => m.status === 'Inactive').length,
    }), [db.mechanics]);

    const statusColors: { [key: string]: string } = { Active: 'bg-green-500/20 text-green-300', Pending: 'bg-yellow-500/20 text-yellow-300', Inactive: 'bg-red-500/20 text-red-300' };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex-shrink-0">
                <h1 className="text-3xl font-bold">Manage Mechanics</h1>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 my-6">
                    <StatCard title="Total Mechanics" value={stats.total} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21V9a4 4 0 00-4-4H9" /></svg>} />
                    <StatCard title="Active" value={stats.active} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
                    <StatCard title="Pending Approval" value={stats.pending} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
                    <StatCard title="Inactive" value={stats.inactive} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
                </div>
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="relative w-full md:w-1/2">
                        <input type="text" placeholder="Search by name or email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-admin-card border border-admin-border rounded-lg placeholder-admin-text-secondary" />
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-admin-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg></span>
                    </div>
                    <div className="w-full md:w-auto flex gap-4">
                        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="w-full md:w-auto p-2 bg-admin-card border border-admin-border rounded-lg">
                            <option value="all">All Statuses</option> <option value="Active">Active</option> <option value="Inactive">Inactive</option> <option value="Pending">Pending</option>
                        </select>
                        <button onClick={() => { setEditingMechanic(undefined); setIsFormModalOpen(true); }} className="bg-admin-accent text-white font-bold py-2 px-4 rounded-lg hover:bg-orange-600 transition whitespace-nowrap">+ Add Mechanic</button>
                    </div>
                </div>
            </div>
            <div className="flex-1 overflow-auto mt-4">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead className="sticky top-0 bg-admin-bg z-10">
                            <tr>
                                <th className="py-3 px-2 font-semibold text-admin-text-secondary uppercase text-xs border-b border-admin-border">Name</th>
                                <th className="py-3 px-2 font-semibold text-admin-text-secondary uppercase text-xs border-b border-admin-border">Contact</th>
                                <th className="py-3 px-2 font-semibold text-admin-text-secondary uppercase text-xs border-b border-admin-border">Rating</th>
                                <th className="py-3 px-2 font-semibold text-admin-text-secondary uppercase text-xs border-b border-admin-border">Joined</th>
                                <th className="py-3 px-2 font-semibold text-admin-text-secondary uppercase text-xs border-b border-admin-border">Status</th>
                                <th className="py-3 px-2 font-semibold text-admin-text-secondary uppercase text-xs border-b border-admin-border">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-admin-border">
                            {filteredMechanics.map((mechanic) => (
                                <tr key={mechanic.id} className="hover:bg-admin-card">
                                    <td className="py-3 px-2 text-sm">
                                        <div className="flex items-center gap-3"><img src={mechanic.imageUrl} alt={mechanic.name} className="w-10 h-10 rounded-full object-cover" /><span>{mechanic.name}</span></div>
                                    </td>
                                    <td className="py-3 px-2 text-xs"><div>{mechanic.email}</div><div className="text-admin-text-secondary">{mechanic.phone}</div></td>
                                    <td className="py-3 px-2 text-sm">⭐ {mechanic.rating.toFixed(1)}</td>
                                    <td className="py-3 px-2 text-xs">{mechanic.registrationDate ? new Date(mechanic.registrationDate.replace(/-/g, '/')).toLocaleDateString() : 'N/A'}</td>
                                    <td className="py-3 px-2"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[mechanic.status]}`}>{mechanic.status}</span></td>
                                    <td className="py-3 px-2 text-sm whitespace-nowrap">
                                        <div className="flex items-center gap-4">
                                            <button onClick={() => { setEditingMechanic(mechanic); setIsFormModalOpen(true); }} className="font-semibold text-blue-400 hover:text-blue-300">Edit</button>
                                            <button onClick={() => handleDeleteMechanic(mechanic)} className="font-semibold text-red-400 hover:text-red-300">Delete</button>
                                            {mechanic.status === 'Pending' && (
                                                <>
                                                    <button onClick={() => handleStatusUpdate(mechanic.id, 'Active')} className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-md hover:bg-green-500/30">Approve</button>
                                                    <button onClick={() => handleStatusUpdate(mechanic.id, 'Inactive')} className="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded-md hover:bg-red-500/30">Reject</button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {isFormModalOpen && <MechanicFormModal mechanic={editingMechanic} onClose={() => setIsFormModalOpen(false)} onSave={handleSaveMechanic} />}
        </div>
    );
};

export default AdminMechanicsScreen;