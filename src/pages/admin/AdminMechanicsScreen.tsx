import React, { useState, useMemo, useEffect } from 'react';
import { Mechanic } from '../../types';
import Modal from '../../components/admin/Modal';
import { useDatabase } from '../../context/DatabaseContext';
import Spinner from '../../components/Spinner';
import LocationMap from '../../components/admin/LocationMap';

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
        // Simulate async operation
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (mechanic) {
            onSave({ 
                ...mechanic, 
                ...formData, 
                password: formData.password || mechanic.password // Keep old password if new one is not provided
            });
        } else {
            // Fix: Added missing registrationDate and birthday properties to satisfy the type constraints of the onSave function parameter.
             onSave({
                ...formData,
                password: formData.password || 'password123', // Default password for new mechanics
                lat: 14.55 + (Math.random() - 0.5) * 0.1, // Randomize location
                lng: 121.02 + (Math.random() - 0.5) * 0.1,
                registrationDate: new Date().toISOString().split('T')[0],
                birthday: '',
            });
        }
        setIsSaving(false);
    };
    
    return (
        <Modal title={mechanic ? "Edit Mechanic" : "Add New Mechanic"} isOpen={true} onClose={onClose}>
             <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                <input type="text" placeholder="Full Name" value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} className="w-full p-2 bg-admin-bg border border-admin-border rounded-md" />
                <input type="email" placeholder="Email" value={formData.email} onChange={e => setFormData(p => ({...p, email: e.target.value}))} className="w-full p-2 bg-admin-bg border border-admin-border rounded-md" />
                <input type="password" placeholder={mechanic ? "New Password (optional)" : "Password"} value={formData.password} onChange={e => setFormData(p => ({...p, password: e.target.value}))} className="w-full p-2 bg-admin-bg border border-admin-border rounded-md" />
                <input type="tel" placeholder="Phone" value={formData.phone} onChange={e => setFormData(p => ({...p, phone: e.target.value}))} className="w-full p-2 bg-admin-bg border border-admin-border rounded-md" />
                <textarea placeholder="Bio" value={formData.bio} onChange={e => setFormData(p => ({...p, bio: e.target.value}))} className="w-full p-2 bg-admin-bg border border-admin-border rounded-md" />
                <input type="text" placeholder="Specializations (comma-separated)" value={formData.specializations.join(', ')} onChange={e => setFormData(p => ({...p, specializations: e.target.value.split(',').map(s=>s.trim())}))} className="w-full p-2 bg-admin-bg border border-admin-border rounded-md" />
            </div>
             <div className="mt-6 flex justify-end gap-4 border-t border-admin-border pt-4">
                <button onClick={onClose} className="bg-admin-border font-bold py-2 px-4 rounded-lg">Cancel</button>
                <button onClick={handleSave} disabled={isSaving} className="bg-admin-accent font-bold py-2 px-4 rounded-lg flex items-center justify-center min-w-[80px]">
                    {isSaving ? <Spinner size="sm"/> : 'Save'}
                </button>
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
    
    const handleSaveMechanic = (mechanicData: Mechanic | Omit<Mechanic, 'id' | 'status' | 'rating' | 'reviews'>) => {
        if ('id' in mechanicData) {
            updateMechanic(mechanicData);
        } else {
            // Fix: Add missing properties for new mechanics.
            addMechanic({
                ...mechanicData,
                status: 'Pending',
                rating: 0,
                reviews: 0,
                registrationDate: new Date().toISOString().split('T')[0],
                birthday: ''
            });
        }
        setIsFormModalOpen(false);
        setEditingMechanic(undefined);
    };

    const handleDeleteMechanic = (mechanic: Mechanic) => {
        if (window.confirm(`Are you sure you want to permanently delete ${mechanic.name}? This action cannot be undone.`)) {
            deleteMechanic(mechanic.id);
        }
    }
    
    const stats = useMemo(() => ({
        total: db.mechanics.length,
        active: db.mechanics.filter(m => m.status === 'Active').length,
        pending: db.mechanics.filter(m => m.status === 'Pending').length,
        inactive: db.mechanics.filter(m => m.status === 'Inactive').length,
    }), [db.mechanics]);
    
    const statusColors: { [key: string]: string } = { Active: 'bg-green-500/20 text-green-300', Pending: 'bg-yellow-500/20 text-yellow-300', Inactive: 'bg-red-500/20 text-red-300' };
    
    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex-shrink-0 px-6 lg:px-8 pt-6">
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
            <div className="flex-1 overflow-auto px-6 lg:px-8 mt-4">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-admin-bg z-10">
                        <tr>
                            <th className="py-3 font-semibold text-admin-text-secondary uppercase text-xs border-b border-admin-border">Name</th>
                            <th className="py-3 font-semibold text-admin-text-secondary uppercase text-xs border-b border-admin-border">Contact</th>
                            <th className="py-3 font-semibold text-admin-text-secondary uppercase text-xs border-b border-admin-border">Rating</th>
                            <th className="py-3 font-semibold text-admin-text-secondary uppercase text-xs border-b border-admin-border">Joined</th>
                            <th className="py-3 font-semibold text-admin-text-secondary uppercase text-xs border-b border-admin-border">Status</th>
                            <th className="py-3 font-semibold text-admin-text-secondary uppercase text-xs border-b border-admin-border">Actions</th>
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
                                         {mechanic.status === 'Pending' && <button onClick={() => updateMechanicStatus(mechanic.id, 'Active')} className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-md">Approve</button>}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {isFormModalOpen && <MechanicFormModal mechanic={editingMechanic} onClose={() => setIsFormModalOpen(false)} onSave={handleSaveMechanic} />}
        </div>
    );
};

export default AdminMechanicsScreen;