import React, { useState } from 'react';
import { useDatabase } from '../../../context/DatabaseContext';
import { AppService } from '../../../types';
import { FaEdit, FaTrash, FaPlus } from 'react-icons/fa';

export const AdminManageServicesScreen: React.FC = () => {
    const { db, addAppService, updateAppService, deleteAppService } = useDatabase();
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<AppService | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    
    const [formData, setFormData] = useState<Partial<AppService>>({
        name: '',
        description: '',
        category: '',
        isActive: true,
    });

    const services = db?.appServices || [];

    const handleOpenModal = (service?: AppService) => {
        if (service) {
            setEditingService(service);
            setFormData({
                name: service.name,
                description: service.description,
                category: service.category || '',
                isActive: service.isActive
            });
        } else {
            setEditingService(null);
            setFormData({
                name: '',
                description: '',
                category: '',
                isActive: true
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingService(null);
    };

    const handleSave = async () => {
        if (!formData.name || !formData.description) return alert('Name and Description are required');
        
        setIsSaving(true);
        try {
            if (editingService) {
                await updateAppService({ ...editingService, ...formData } as AppService);
            } else {
                await addAppService({ ...formData } as Omit<AppService, 'id'>);
            }
            handleCloseModal();
        } catch (error) {
            console.error('Failed to save service:', error);
            alert('Failed to save service');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this service?')) {
            try {
                await deleteAppService(id);
            } catch (error) {
                console.error('Failed to delete:', error);
                alert('Failed to delete service');
            }
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Manage Services</h1>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                    <FaPlus size={14} /> Add Service
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.map(service => (
                    <div key={service.id} className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg font-bold">{service.name}</h3>
                            <span className={`px-2 py-1 text-xs rounded-full font-medium ${service.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {service.isActive ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                        <p className="text-gray-600 text-sm mb-4 line-clamp-3 h-12">
                            {service.description}
                        </p>
                        <div className="text-sm text-gray-500 mb-4">
                            <strong>Category:</strong> {service.category || 'N/A'}
                        </div>
                        <div className="flex justify-end gap-2 border-t pt-4">
                            <button
                                onClick={() => handleOpenModal(service)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                                <FaEdit size={16} />
                            </button>
                            <button
                                onClick={() => handleDelete(service.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                <FaTrash size={16} />
                            </button>
                        </div>
                    </div>
                ))}
                {services.length === 0 && (
                    <div className="col-span-full text-center py-12 text-gray-500 bg-white rounded-lg border border-gray-100">
                        No services configured yet.
                    </div>
                )}
            </div>

            {/* Manage Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                        <div className="px-6 py-4 border-b flex justify-between items-center">
                            <h3 className="text-lg font-bold">{editingService ? 'Edit Service' : 'Add Service'}</h3>
                            <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">&times;</button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label htmlFor="svc-name" className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                                <input
                                    id="svc-name" name="svc-name"
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    className="w-full border rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                />
                            </div>
                            
                            <div>
                                <label htmlFor="svc-category" className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                <input
                                    id="svc-category" name="svc-category"
                                    type="text"
                                    value={formData.category}
                                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                                    className="w-full border rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    placeholder="e.g. Towing, Battery"
                                />
                            </div>

                            <div>
                                <label htmlFor="svc-description" className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                                <textarea
                                    id="svc-description" name="svc-description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                                    className="w-full border rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    rows={4}
                                />
                            </div>

                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="isActive"
                                    checked={formData.isActive}
                                    onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                                    className="h-4 w-4 text-blue-600 rounded"
                                />
                                <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                                    Service is Active
                                </label>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end gap-3">
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

export default AdminManageServicesScreen;
