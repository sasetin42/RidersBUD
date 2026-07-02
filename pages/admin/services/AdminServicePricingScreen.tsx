import React, { useState } from 'react';
import { useDatabase } from '../../../context/DatabaseContext';
import { ServicePricing } from '../../../types';
import { FaEdit, FaTrash, FaPlus } from 'react-icons/fa';

export const AdminServicePricingScreen: React.FC = () => {
    const { db, addServicePricing, updateServicePricing, deleteServicePricing } = useDatabase();
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPricing, setEditingPricing] = useState<ServicePricing | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    
    const [formData, setFormData] = useState<Partial<ServicePricing>>({
        serviceId: '',
        name: '',
        description: '',
        price: 0,
        currency: 'PHP',
        isActive: true,
    });

    const pricingList = db?.servicePricing || [];
    const services = db?.appServices || [];

    const handleOpenModal = (pricing?: ServicePricing) => {
        if (pricing) {
            setEditingPricing(pricing);
            setFormData({
                serviceId: pricing.serviceId,
                name: pricing.name,
                description: pricing.description || '',
                price: pricing.price,
                currency: pricing.currency || 'PHP',
                isActive: pricing.isActive
            });
        } else {
            setEditingPricing(null);
            setFormData({
                serviceId: services.length > 0 ? services[0].id : '',
                name: '',
                description: '',
                price: 0,
                currency: 'PHP',
                isActive: true
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingPricing(null);
    };

    const handleSave = async () => {
        if (!formData.name || !formData.serviceId || formData.price === undefined) {
            return alert('Name, Service, and Price are required');
        }
        
        setIsSaving(true);
        try {
            if (editingPricing) {
                await updateServicePricing({ ...editingPricing, ...formData } as ServicePricing);
            } else {
                await addServicePricing({ ...formData } as Omit<ServicePricing, 'id'>);
            }
            handleCloseModal();
        } catch (error) {
            console.error('Failed to save pricing:', error);
            alert('Failed to save pricing');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this pricing?')) {
            try {
                await deleteServicePricing(id);
            } catch (error) {
                console.error('Failed to delete:', error);
                alert('Failed to delete pricing');
            }
        }
    };

    const getServiceName = (serviceId: string) => {
        const s = services.find(s => s.id === serviceId);
        return s ? s.name : 'Unknown Service';
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Service Pricing</h1>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                    <FaPlus size={14} /> Add Pricing Option
                </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        <tr>
                            <th className="px-6 py-4">Service</th>
                            <th className="px-6 py-4">Pricing Name</th>
                            <th className="px-6 py-4">Description</th>
                            <th className="px-6 py-4">Price</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {pricingList.map(pricing => (
                            <tr key={pricing.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 text-sm font-medium">{getServiceName(pricing.serviceId)}</td>
                                <td className="px-6 py-4 text-sm">{pricing.name}</td>
                                <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-xs">{pricing.description}</td>
                                <td className="px-6 py-4 text-sm font-bold text-gray-900">
                                    {pricing.currency} {pricing.price.toFixed(2)}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${pricing.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {pricing.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right text-sm font-medium">
                                    <button
                                        onClick={() => handleOpenModal(pricing)}
                                        className="text-blue-600 hover:text-blue-900 mr-4"
                                    >
                                        <FaEdit size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(pricing.id)}
                                        className="text-red-600 hover:text-red-900"
                                    >
                                        <FaTrash size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {pricingList.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                    No pricing options configured yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Manage Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                        <div className="px-6 py-4 border-b flex justify-between items-center">
                            <h3 className="text-lg font-bold">{editingPricing ? 'Edit Pricing' : 'Add Pricing'}</h3>
                            <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">&times;</button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label htmlFor="pricing-service" className="block text-sm font-medium text-gray-700 mb-1">Target Service *</label>
                                <select
                                    id="pricing-service" name="pricing-service"
                                    value={formData.serviceId}
                                    onChange={(e) => setFormData({...formData, serviceId: e.target.value})}
                                    className="w-full border rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                >
                                    <option value="" disabled>Select a service...</option>
                                    {services.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label htmlFor="pricing-tier" className="block text-sm font-medium text-gray-700 mb-1">Pricing Tier Name *</label>
                                <input
                                    id="pricing-tier" name="pricing-tier"
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    className="w-full border rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    placeholder="e.g. Base Rate, Premium"
                                />
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label htmlFor="pricing-price" className="block text-sm font-medium text-gray-700 mb-1">Price *</label>
                                    <input
                                        id="pricing-price" name="pricing-price"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formData.price}
                                        onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value)})}
                                        className="w-full border rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    />
                                </div>
                                <div className="w-1/3">
                                    <label htmlFor="pricing-currency" className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                                    <input
                                        id="pricing-currency" name="pricing-currency"
                                        type="text"
                                        value={formData.currency}
                                        onChange={(e) => setFormData({...formData, currency: e.target.value})}
                                        className="w-full border rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="pricing-description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    id="pricing-description" name="pricing-description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                                    className="w-full border rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    rows={2}
                                />
                            </div>

                            <div className="flex items-center mt-2">
                                <input
                                    type="checkbox"
                                    id="isActivePricing"
                                    checked={formData.isActive}
                                    onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                                    className="h-4 w-4 text-blue-600 rounded"
                                />
                                <label htmlFor="isActivePricing" className="ml-2 block text-sm text-gray-900">
                                    Pricing is Active
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

export default AdminServicePricingScreen;
