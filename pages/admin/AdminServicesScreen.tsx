import React, { useState } from 'react';
import { mockServices, addService, updateService, deleteService } from '../../data/mockData';
import { Service } from '../../types';
import Modal from '../../components/admin/Modal';

const ServiceForm: React.FC<{ service?: Service; onSave: (service: any) => void; onCancel: () => void; }> = ({ service, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        id: service?.id || '',
        name: service?.name || '',
        description: service?.description || '',
        price: service?.price ?? '',
        estimatedTime: service?.estimatedTime || '',
        category: service?.category || '',
        imageUrl: service?.imageUrl || 'https://picsum.photos/seed/new/400/300',
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const validate = () => {
        const newErrors: { [key: string]: string } = {};
        if (!formData.name.trim()) newErrors.name = "Service name is required.";
        if (!formData.description.trim()) newErrors.description = "Description is required.";
        if (formData.price === '' || Number(formData.price) <= 0) newErrors.price = "Price must be a positive number.";
        if (!formData.estimatedTime.trim()) newErrors.estimatedTime = "Estimated time is required.";
        if (!formData.category.trim()) newErrors.category = "Category is required.";
        return newErrors;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const validationErrors = validate();
        setErrors(validationErrors);
        if (Object.keys(validationErrors).length === 0) {
            onSave({
                ...formData,
                price: Number(formData.price)
            });
        }
    };

    const isFormIncomplete = !formData.name || !formData.description || formData.price === '' || !formData.estimatedTime || !formData.category;

    return (
        <form onSubmit={handleSubmit} className="space-y-4 text-gray-800">
            <div>
                <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Service Name" className={`w-full p-2 bg-gray-100 border rounded ${errors.name ? 'border-red-500' : 'border-gray-300'}`} />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>
            <div>
                <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Description" className={`w-full p-2 bg-gray-100 border rounded ${errors.description ? 'border-red-500' : 'border-gray-300'}`} />
                {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
            </div>
            <div>
                <input type="number" name="price" value={formData.price} onChange={handleChange} placeholder="Price" className={`w-full p-2 bg-gray-100 border rounded ${errors.price ? 'border-red-500' : 'border-gray-300'}`} />
                {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
            </div>
            <div>
                <input type="text" name="estimatedTime" value={formData.estimatedTime} onChange={handleChange} placeholder="Estimated Time (e.g., 1 hour)" className={`w-full p-2 bg-gray-100 border rounded ${errors.estimatedTime ? 'border-red-500' : 'border-gray-300'}`} />
                {errors.estimatedTime && <p className="text-red-500 text-xs mt-1">{errors.estimatedTime}</p>}
            </div>
            <div>
                <input type="text" name="category" value={formData.category} onChange={handleChange} placeholder="Category" className={`w-full p-2 bg-gray-100 border rounded ${errors.category ? 'border-red-500' : 'border-gray-300'}`} />
                {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
            </div>
            <div className="flex justify-end gap-4 mt-6">
                <button type="button" onClick={onCancel} className="bg-gray-200 text-gray-700 py-2 px-4 rounded hover:bg-gray-300">Cancel</button>
                <button type="submit" className="bg-primary text-white py-2 px-4 rounded hover:bg-orange-600 disabled:opacity-50" disabled={isFormIncomplete}>Save</button>
            </div>
        </form>
    );
};


const AdminServicesScreen: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<Service | undefined>(undefined);
    const [dataVersion, setDataVersion] = useState(0); // To force re-render on data change

    const handleOpenModal = (service?: Service) => {
        setEditingService(service);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingService(undefined);
        setIsModalOpen(false);
    };

    const handleSave = (service: Service) => {
        if (service.id) {
            updateService(service);
        } else {
            addService(service);
        }
        setDataVersion(v => v + 1);
        handleCloseModal();
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Are you sure you want to delete this service?')) {
            deleteService(id);
            setDataVersion(v => v + 1);
        }
    };
    
    return (
        <div className="text-gray-800">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Manage Services</h1>
                <button onClick={() => handleOpenModal()} className="bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-orange-600 transition">Add Service</button>
            </div>
            <div className="bg-white p-6 rounded-lg shadow overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-gray-200">
                            <th className="p-3 font-bold text-gray-600">Name</th>
                            <th className="p-3 font-bold text-gray-600">Category</th>
                            <th className="p-3 font-bold text-gray-600">Price</th>
                            <th className="p-3 font-bold text-gray-600">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {mockServices.map((service, index) => (
                            <tr key={service.id} className={`border-b border-gray-200 last:border-b-0 transition-colors duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100`}>
                                <td className="p-3">{service.name}</td>
                                <td className="p-3">{service.category}</td>
                                <td className="p-3">${service.price.toFixed(2)}</td>
                                <td className="p-3">
                                    <button onClick={() => handleOpenModal(service)} className="font-semibold text-blue-500 hover:text-blue-700 mr-4">Edit</button>
                                    <button onClick={() => handleDelete(service.id)} className="font-semibold text-red-500 hover:text-red-700">Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal title={editingService ? 'Edit Service' : 'Add Service'} isOpen={isModalOpen} onClose={handleCloseModal}>
                <ServiceForm service={editingService} onSave={handleSave} onCancel={handleCloseModal} />
            </Modal>
        </div>
    );
};

export default AdminServicesScreen;
