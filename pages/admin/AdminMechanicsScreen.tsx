import React, { useState, useMemo, useEffect } from 'react';
import { Mechanic } from '../../types';
import Modal from '../../components/admin/Modal';
import { useDatabase } from '../../context/DatabaseContext';
import Spinner from '../../components/Spinner';
import LocationMap from '../../components/admin/LocationMap';

const MechanicDetailsModal: React.FC<{
    mechanic: Mechanic;
    onClose: () => void;
    onStatusChange: (mechanicId: string, status: 'Active' | 'Inactive' | 'Pending') => void;
    onUpdate: (mechanic: Mechanic) => void;
    onDelete: (mechanicId: string) => void;
}> = ({ mechanic, onClose, onStatusChange, onUpdate, onDelete }) => {
    const [formData, setFormData] = useState<Mechanic>(mechanic);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setFormData(mechanic);
    }, [mechanic]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleSpecializationsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target;
        setFormData(prev => ({ ...prev, specializations: value.split(',').map(s => s.trim()).filter(Boolean) }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        // Simulate API delay for better UX
        await new Promise(resolve => setTimeout(resolve, 750));
        await onUpdate(formData);
        setIsSaving(false);
        onClose(); // Close modal on save
    };


    const statusColors: { [key: string]: string } = {
        Active: 'bg-green-500/20 text-green-300',
        Pending: 'bg-yellow-500/20 text-yellow-300',
        Inactive: 'bg-red-500/20 text-red-300',
    };
    
    const handleDelete = () => {
        if (window.confirm(`Are you sure you want to permanently delete ${mechanic.name}? This action cannot be undone.`)) {
            onDelete(mechanic.id);
            onClose();
        }
    }

    return (
        <Modal title="Edit Mechanic Details" isOpen={!!mechanic} onClose={onClose}>
            <div className="text-white space-y-4 max-h-[75vh] overflow-y-auto pr-2">
                <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                    <img src={formData.imageUrl} alt={formData.name} className="w-24 h-24 rounded-full object-cover flex-shrink-0" />
                    <div>
                        <h3 className="text-2xl font-bold">{mechanic.name}</h3>
                        <p className="text-yellow-400">⭐ {formData.rating.toFixed(1)} ({formData.reviews} jobs)</p>
                        <span className={`px-2 py-1 mt-2 inline-block text-xs font-semibold rounded-full ${statusColors[formData.status]}`}>
                            {formData.status}
                        </span>
                    </div>
                </div>
                
                 <div className="space-y-4 pt-4 border-t border-field">
                    <div>
                        <label className="block text-sm font-medium text-light-gray mb-1">Name</label>
                        <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full p-2 bg-field border border-secondary rounded" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-light-gray mb-1">Email</label>
                            <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full p-2 bg-field border border-secondary rounded" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-light-gray mb-1">Phone</label>
                            <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full p-2 bg-field border border-secondary rounded" />
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-light-gray mb-1">Bio</label>
                        <textarea name="bio" value={formData.bio} onChange={handleChange} rows={3} className="w-full p-2 bg-field border border-secondary rounded" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-light-gray mb-1">Specializations (comma-separated)</label>
                        <input type="text" value={formData.specializations.join(', ')} onChange={handleSpecializationsChange} className="w-full p-2 bg-field border border-secondary rounded" />
                    </div>
                </div>

                <div className="border-t border-field pt-4">
                    <h4 className="font-semibold text-primary text-sm mb-2">Last Known Location</h4>
                    {mechanic.lat && mechanic.lng ? (
                        <LocationMap latitude={mechanic.lat} longitude={mechanic.lng} popupText={mechanic.name} />
                    ) : (
                         <p className="text-xs text-light-gray">Location data not available.</p>
                    )}
                 </div>

                <div className="border-t border-field pt-4">
                    <h4 className="font-semibold text-primary text-sm mb-2">Actions</h4>
                    <div className="flex justify-between items-center flex-wrap gap-2">
                        <div className="flex flex-wrap gap-2">
                            {mechanic.status === 'Pending' && <button onClick={() => onStatusChange(mechanic.id, 'Active')} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg text-sm">Approve</button>}
                            {mechanic.status === 'Active' && <button onClick={() => onStatusChange(mechanic.id, 'Inactive')} className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-lg text-sm">Deactivate</button>}
                            {mechanic.status === 'Inactive' && <button onClick={() => onStatusChange(mechanic.id, 'Active')} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg text-sm">Re-activate</button>}
                        </div>
                        <div className="flex gap-2">
                             <button onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg text-sm">Delete</button>
                             <button onClick={handleSave} disabled={isSaving} className="bg-primary hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-lg text-sm min-w-[120px] flex items-center justify-center">
                                {isSaving ? <Spinner size="sm" color="text-white" /> : 'Save Changes'}
                             </button>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

const AdminMechanicsScreen: React.FC = () => {
    const { db, updateMechanicStatus, deleteMechanic, updateMechanic, loading } = useDatabase();
    const [viewingMechanic, setViewingMechanic] = useState<Mechanic | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredMechanics = useMemo(() => {
        if (!db) return [];
        return db.mechanics.filter(mechanic =>
            mechanic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            mechanic.email.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [db, searchQuery]);

    if (loading || !db) {
        return <div className="flex items-center justify-center h-full bg-dark-gray"><Spinner size="lg" color="text-white" /></div>
    }
    
    const statusColors: { [key: string]: string } = {
        Active: 'bg-green-500/20 text-green-300',
        Pending: 'bg-yellow-500/20 text-yellow-300',
        Inactive: 'bg-red-500/20 text-red-300',
    };
    
    return (
        <div className="text-white flex flex-col h-full overflow-hidden bg-dark-gray">
            <div className="flex-shrink-0 px-6 lg:px-8 py-6">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-3xl font-bold">Manage Mechanics</h1>
                </div>
                <div className="relative">
                     <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-field border border-secondary rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                     <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-light-gray" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </span>
                </div>
            </div>
            <div className="flex-1 overflow-auto px-6 lg:px-8">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-dark-gray z-10">
                        <tr>
                            <th className="py-4 font-bold text-light-gray uppercase tracking-wider text-sm border-b border-secondary">Name</th>
                            <th className="py-4 font-bold text-light-gray uppercase tracking-wider text-sm border-b border-secondary">Email</th>
                            <th className="py-4 font-bold text-light-gray uppercase tracking-wider text-sm border-b border-secondary">Status</th>
                            <th className="py-4 font-bold text-light-gray uppercase tracking-wider text-sm border-b border-secondary">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredMechanics.map((mechanic) => (
                             <tr key={mechanic.id} className="hover:bg-secondary">
                                <td className="py-4 px-2 text-gray-200 border-b border-secondary">
                                    <div className="flex items-center gap-3">
                                        <img src={mechanic.imageUrl} alt={mechanic.name} className="w-10 h-10 rounded-full object-cover" />
                                        <span>{mechanic.name}</span>
                                    </div>
                                </td>
                                <td className="py-4 px-2 text-gray-200 border-b border-secondary">{mechanic.email}</td>
                                <td className="py-4 px-2 border-b border-secondary">
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[mechanic.status]}`}>
                                        {mechanic.status}
                                    </span>
                                </td>
                                <td className="py-4 px-2 text-sm border-b border-secondary whitespace-nowrap">
                                    <button onClick={() => setViewingMechanic(mechanic)} className="font-semibold text-blue-400 hover:text-blue-300 mr-4">View/Edit</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {viewingMechanic && (
                <MechanicDetailsModal 
                    mechanic={viewingMechanic}
                    onClose={() => setViewingMechanic(null)}
                    onStatusChange={updateMechanicStatus}
                    onUpdate={updateMechanic}
                    onDelete={deleteMechanic}
                />
            )}
        </div>
    );
};

export default AdminMechanicsScreen;
