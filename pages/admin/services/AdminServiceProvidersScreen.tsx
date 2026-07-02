import React, { useState } from 'react';
import { useDatabase } from '../../../context/DatabaseContext';
import { ServiceProvider } from '../../../types';
import { FaEdit, FaTrash, FaPlus, FaStar } from 'react-icons/fa';

export const AdminServiceProvidersScreen: React.FC = () => {
    const { db, addServiceProvider, updateServiceProvider, deleteServiceProvider } = useDatabase();
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProvider, setEditingProvider] = useState<ServiceProvider | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    
    const [formData, setFormData] = useState<Partial<ServiceProvider>>({
        name: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: '',
        rating: 5.0,
        isActive: true,
    });

    const providers = db?.serviceProviders || [];

    const handleOpenModal = (provider?: ServiceProvider) => {
        if (provider) {
            setEditingProvider(provider);
            setFormData({
                name: provider.name,
                contactPerson: provider.contactPerson || '',
                email: provider.email || '',
                phone: provider.phone || '',
                address: provider.address || '',
                rating: provider.rating || 5.0,
                isActive: provider.isActive
            });
        } else {
            setEditingProvider(null);
            setFormData({
                name: '',
                contactPerson: '',
                email: '',
                phone: '',
                address: '',
                rating: 5.0,
                isActive: true
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingProvider(null);
    };

    const handleSave = async () => {
        if (!formData.name) return alert('Provider name is required');
        
        setIsSaving(true);
        try {
            if (editingProvider) {
                await updateServiceProvider({ ...editingProvider, ...formData } as ServiceProvider);
            } else {
                await addServiceProvider({ ...formData } as Omit<ServiceProvider, 'id'>);
            }
            handleCloseModal();
        } catch (error) {
            console.error('Failed to save provider:', error);
            alert('Failed to save provider');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this provider?')) {
            try {
                await deleteServiceProvider(id);
            } catch (error) {
                console.error('Failed to delete:', error);
                alert('Failed to delete provider');
            }
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Service Providers</h1>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                    <FaPlus size={14} /> Add Provider
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {providers.map(provider => (
                    <div key={provider.id} className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 flex flex-col h-full">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-lg font-bold">{provider.name}</h3>
                                {provider.contactPerson && <p className="text-sm text-gray-500">{provider.contactPerson}</p>}
                            </div>
                            <span className={`px-2 py-1 text-xs rounded-full font-medium ${provider.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {provider.isActive ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                        
                        <div className="flex-1 space-y-2 mb-4 text-sm text-gray-600">
                            {provider.email && <p>📧 {provider.email}</p>}
                            {provider.phone && <p>📞 {provider.phone}</p>}
                            {provider.address && <p>📍 {provider.address}</p>}
                            <div className="flex items-center gap-1 mt-2">
                                <span className="text-yellow-400"><FaStar /></span>
                                <span className="font-semibold text-gray-800">{provider.rating?.toFixed(1) || 'N/A'}</span>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 border-t pt-4 mt-auto">
                            <button
                                onClick={() => handleOpenModal(provider)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                                <FaEdit size={16} />
                            </button>
                            <button
                                onClick={() => handleDelete(provider.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                <FaTrash size={16} />
                            </button>
                        </div>
                    </div>
                ))}
                {providers.length === 0 && (
                    <div className="col-span-full text-center py-12 text-gray-500 bg-white rounded-lg border border-gray-100">
                        No service providers configured yet.
                    </div>
                )}
            </div>

            {/* Manage Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="px-6 py-4 border-b flex justify-between items-center sticky top-0 bg-white">
                            <h3 className="text-lg font-bold">{editingProvider ? 'Edit Provider' : 'Add Provider'}</h3>
                            <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">&times;</button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label htmlFor="provider-name" className="block text-sm font-medium text-gray-700 mb-1">Company / Provider Name *</label>
                                <input
                                    id="provider-name" name="provider-name"
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    className="w-full border rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                />
                            </div>
                            
                            <div>
                                <label htmlFor="provider-contact" className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                                <input
                                    id="provider-contact" name="provider-contact"
                                    type="text"
                                    value={formData.contactPerson}
                                    onChange={(e) => setFormData({...formData, contactPerson: e.target.value})}
                                    className="w-full border rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="provider-email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input
                                        id="provider-email" name="provider-email"
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                                        className="w-full border rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="provider-phone" className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                    <input
                                        id="provider-phone" name="provider-phone"
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                        className="w-full border rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="provider-address" className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                <textarea
                                    id="provider-address" name="provider-address"
                                    value={formData.address}
                                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                                    className="w-full border rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    rows={2}
                                />
                            </div>
                            
                            <div>
                                <label htmlFor="provider-rating" className="block text-sm font-medium text-gray-700 mb-1">Initial Rating</label>
                                <input
                                    id="provider-rating" name="provider-rating"
                                    type="number"
                                    min="1"
                                    max="5"
                                    step="0.1"
                                    value={formData.rating}
                                    onChange={(e) => setFormData({...formData, rating: parseFloat(e.target.value)})}
                                    className="w-full border rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                />
                            </div>

                            <div className="flex items-center pt-2">
                                <input
                                    type="checkbox"
                                    id="isActiveProvider"
                                    checked={formData.isActive}
                                    onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                                    className="h-4 w-4 text-blue-600 rounded"
                                />
                                <label htmlFor="isActiveProvider" className="ml-2 block text-sm text-gray-900">
                                    Provider is Active
                                </label>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end gap-3 sticky bottom-0">
                            <button
                                onClick={handleCloseModal}
                                className="px-4 py-2 border rounded-lg hover:bg-gray-100 text-sm font-medium"
                                disabled={isSaving}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
                            >
                                {isSaving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminServiceProvidersScreen;
