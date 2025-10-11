import React, { useState } from 'react';
import { Part } from '../../types';
import Modal from '../../components/admin/Modal';
import { useDatabase } from '../../context/DatabaseContext';
import Spinner from '../../components/Spinner';

const PartForm: React.FC<{ part?: Part; onSave: (part: any) => void; onCancel: () => void; }> = ({ part, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        id: part?.id || '',
        name: part?.name || '',
        description: part?.description || '',
        price: part?.price ?? '',
        category: part?.category || '',
        sku: part?.sku || '',
        imageUrl: part?.imageUrl || 'https://picsum.photos/seed/newpart/400/300',
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const validate = () => {
        const newErrors: { [key: string]: string } = {};
        if (!formData.name.trim()) newErrors.name = "Part name is required.";
        if (!formData.description.trim()) newErrors.description = "Description is required.";
        if (formData.price === '' || Number(formData.price) <= 0) newErrors.price = "Price must be a positive number.";
        if (!formData.category.trim()) newErrors.category = "Category is required.";
        if (!formData.sku.trim()) newErrors.sku = "SKU is required.";
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
                price: Number(formData.price),
            });
        }
    };
    
    const isFormIncomplete = !formData.name || !formData.description || formData.price === '' || !formData.category || !formData.sku;

    return (
        <form onSubmit={handleSubmit} className="space-y-4 text-gray-800">
            <div>
                <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Part Name" className={`w-full p-2 bg-gray-100 border rounded ${errors.name ? 'border-red-500' : 'border-gray-300'}`} />
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
                <input type="text" name="category" value={formData.category} onChange={handleChange} placeholder="Category" className={`w-full p-2 bg-gray-100 border rounded ${errors.category ? 'border-red-500' : 'border-gray-300'}`} />
                {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
            </div>
            <div>
                <input type="text" name="sku" value={formData.sku} onChange={handleChange} placeholder="SKU" className={`w-full p-2 bg-gray-100 border rounded ${errors.sku ? 'border-red-500' : 'border-gray-300'}`} />
                {errors.sku && <p className="text-red-500 text-xs mt-1">{errors.sku}</p>}
            </div>
            <div className="flex justify-end gap-4 mt-6">
                <button type="button" onClick={onCancel} className="bg-gray-200 text-gray-700 py-2 px-4 rounded hover:bg-gray-300">Cancel</button>
                <button type="submit" className="bg-primary text-white py-2 px-4 rounded hover:bg-orange-600 disabled:opacity-50" disabled={isFormIncomplete}>Save</button>
            </div>
        </form>
    );
};


const AdminPartsScreen: React.FC = () => {
    const { db, addPart, updatePart, deletePart, loading } = useDatabase();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPart, setEditingPart] = useState<Part | undefined>(undefined);
    
    if (loading || !db) {
        return <div className="flex items-center justify-center h-full"><Spinner size="lg" color="text-secondary" /></div>
    }

    const handleOpenModal = (part?: Part) => {
        setEditingPart(part);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingPart(undefined);
        setIsModalOpen(false);
    };

    const handleSave = (part: Part) => {
        if (part.id) {
            updatePart(part);
        } else {
            addPart(part);
        }
        handleCloseModal();
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Are you sure you want to delete this part?')) {
            deletePart(id);
        }
    };
    
    return (
        <div className="bg-secondary text-white flex flex-col h-full p-4 sm:p-6 lg:p-8 overflow-hidden">
            <div className="flex justify-between items-center mb-6 flex-shrink-0">
                <h1 className="text-3xl font-bold">Manage Parts & Tools</h1>
                <button onClick={() => handleOpenModal()} className="bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-orange-600 transition">Add Part</button>
            </div>
            <div className="bg-dark-gray rounded-lg shadow flex-1 overflow-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-secondary">
                            <th className="p-4 font-bold text-light-gray sticky top-0 bg-dark-gray">Name</th>
                            <th className="p-4 font-bold text-light-gray sticky top-0 bg-dark-gray">SKU</th>
                            <th className="p-4 font-bold text-light-gray sticky top-0 bg-dark-gray">Price</th>
                            <th className="p-4 font-bold text-light-gray sticky top-0 bg-dark-gray">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {db.parts.map((part, index) => (
                             <tr key={part.id} className={`border-b border-secondary last:border-b-0 transition-colors duration-200 ${index % 2 !== 0 ? 'bg-field' : 'bg-dark-gray'} hover:bg-secondary`}>
                                <td className="p-4 text-gray-200">{part.name}</td>
                                <td className="p-4 text-gray-200">{part.sku}</td>
                                <td className="p-4 text-gray-200">${part.price.toFixed(2)}</td>
                                <td className="p-4">
                                    <button onClick={() => handleOpenModal(part)} className="font-semibold text-blue-400 hover:text-blue-300 mr-4">Edit</button>
                                    <button onClick={() => handleDelete(part.id)} className="font-semibold text-red-400 hover:text-red-300">Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal title={editingPart ? 'Edit Part' : 'Add Part'} isOpen={isModalOpen} onClose={handleCloseModal}>
                <PartForm part={editingPart} onSave={handleSave} onCancel={handleCloseModal} />
            </Modal>
        </div>
    );
};

export default AdminPartsScreen;
