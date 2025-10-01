import React, { useState, useEffect } from 'react';
import { mockCustomers, addCustomer, updateCustomer, deleteCustomer } from '../../data/mockData';
import { Customer } from '../../types';
import Modal from '../../components/admin/Modal';

// Form with real-time validation
const CustomerForm: React.FC<{ customer?: Customer; onSave: (customer: any) => void; onCancel: () => void; }> = ({ customer, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        id: customer?.id || '',
        name: customer?.name || '',
        email: customer?.email || '',
        phone: customer?.phone || '',
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        validate(formData); // Initial validation check for the save button
    }, []);

    const validate = (data: typeof formData) => {
        const newErrors: { [key: string]: string } = {};
        
        // Name validation
        if (!data.name.trim()) {
            newErrors.name = "Customer name is required.";
        }

        // Email validation
        if (!data.email) {
            newErrors.email = "Email is required.";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
            newErrors.email = "Email is invalid.";
        }

        // Phone validation
        if (!data.phone) {
            newErrors.phone = "Phone number is required.";
        } else if (!/^\d{3}-\d{3}-\d{4}$/.test(data.phone)) {
            newErrors.phone = "Phone must be in XXX-XXX-XXXX format.";
        }

        setErrors(newErrors);
        return newErrors;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const newFormData = { ...formData, [name]: value };
        setFormData(newFormData);
        validate(newFormData);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const validationErrors = validate(formData);
        if (Object.keys(validationErrors).length === 0) {
            onSave(formData);
        }
    };
    
    const isSaveDisabled = Object.keys(errors).length > 0 || !formData.name || !formData.email || !formData.phone;

    return (
        <form onSubmit={handleSubmit} className="space-y-4 text-gray-800">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="e.g., John Doe" className={`w-full p-2 bg-gray-100 border rounded ${errors.name ? 'border-red-500' : 'border-gray-300'}`} />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="e.g., john.doe@example.com" className={`w-full p-2 bg-gray-100 border rounded ${errors.email ? 'border-red-500' : 'border-gray-300'}`} />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="e.g., 555-123-4567" className={`w-full p-2 bg-gray-100 border rounded ${errors.phone ? 'border-red-500' : 'border-gray-300'}`} />
                {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
            </div>

            <div className="flex justify-end gap-4 mt-6">
                <button type="button" onClick={onCancel} className="bg-gray-200 text-gray-700 py-2 px-4 rounded hover:bg-gray-300">Cancel</button>
                <button type="submit" className="bg-primary text-white py-2 px-4 rounded hover:bg-orange-600 disabled:opacity-50" disabled={isSaveDisabled}>
                    Save
                </button>
            </div>
        </form>
    );
};

// Main Screen Component
const AdminCustomersScreen: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | undefined>(undefined);
    const [dataVersion, setDataVersion] = useState(0);

    const forceRerender = () => setDataVersion(v => v + 1);

    const handleOpenModal = (customer?: Customer) => {
        setEditingCustomer(customer);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingCustomer(undefined);
        setIsModalOpen(false);
    };

    const handleSave = (customer: Customer) => {
        if (customer.id) {
            updateCustomer(customer);
        } else {
            addCustomer(customer);
        }
        forceRerender();
        handleCloseModal();
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Are you sure you want to delete this customer?')) {
            deleteCustomer(id);
            forceRerender();
        }
    };
    
    return (
        <div className="text-gray-800">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Manage Customers</h1>
                <button onClick={() => handleOpenModal()} className="bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-orange-600 transition">Add Customer</button>
            </div>
            <div className="bg-white p-6 rounded-lg shadow overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-gray-200">
                            <th className="p-3 font-bold text-gray-600">Name</th>
                            <th className="p-3 font-bold text-gray-600">Email</th>
                            <th className="p-3 font-bold text-gray-600">Phone</th>
                            <th className="p-3 font-bold text-gray-600">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {mockCustomers.map((customer, index) => (
                             <tr key={customer.id} className={`border-b border-gray-200 last:border-b-0 transition-colors duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100`}>
                                <td className="p-3">{customer.name}</td>
                                <td className="p-3">{customer.email}</td>
                                <td className="p-3">{customer.phone}</td>
                                <td className="p-3">
                                    <button onClick={() => handleOpenModal(customer)} className="font-semibold text-blue-500 hover:text-blue-700 mr-4">Edit</button>
                                    <button onClick={() => handleDelete(customer.id)} className="font-semibold text-red-500 hover:text-red-700">Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal title={editingCustomer ? 'Edit Customer' : 'Add Customer'} isOpen={isModalOpen} onClose={handleCloseModal}>
                <CustomerForm customer={editingCustomer} onSave={handleSave} onCancel={handleCloseModal} />
            </Modal>
        </div>
    );
};

export default AdminCustomersScreen;