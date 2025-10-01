import React, { useState } from 'react';
import { mockMechanics, addMechanic, updateMechanic, deleteMechanic } from '../../data/mockData';
import { Mechanic } from '../../types';
import Modal from '../../components/admin/Modal';

const MechanicForm: React.FC<{ mechanic?: Mechanic; onSave: (mechanic: any) => void; onCancel: () => void; }> = ({ mechanic, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        id: mechanic?.id || '',
        name: mechanic?.name || '',
        rating: mechanic?.rating ?? '',
        reviews: mechanic?.reviews ?? '',
        certifications: mechanic?.certifications?.join(', ') || '',
        imageUrl: mechanic?.imageUrl || 'https://picsum.photos/seed/newmech/200/200',
        lat: mechanic?.lat || 14.55,
        lng: mechanic?.lng || 121.02,
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const validate = () => {
        const newErrors: { [key: string]: string } = {};
        const ratingNum = Number(formData.rating);
        const reviewsNum = Number(formData.reviews);

        if (!formData.name.trim()) newErrors.name = "Mechanic name is required.";
        
        if (formData.rating === '') {
            newErrors.rating = "Rating is required.";
        } else if (isNaN(ratingNum) || ratingNum < 0 || ratingNum > 5) {
            newErrors.rating = "Rating must be a number between 0 and 5.";
        }
        
        if (formData.reviews === '') {
            newErrors.reviews = "Reviews count is required.";
        } else if (isNaN(reviewsNum) || reviewsNum < 0 || !Number.isInteger(reviewsNum)) {
            newErrors.reviews = "Reviews count must be a non-negative integer.";
        }
        
        return newErrors;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
                rating: Number(formData.rating),
                reviews: Number(formData.reviews),
                certifications: formData.certifications.split(',').map(c => c.trim()).filter(c => c),
            });
        }
    };
    
    const isFormIncomplete = !formData.name || formData.rating === '' || formData.reviews === '';

    return (
        <form onSubmit={handleSubmit} className="space-y-4 text-gray-800">
            <div>
                <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Mechanic Name" className={`w-full p-2 bg-gray-100 border rounded ${errors.name ? 'border-red-500' : 'border-gray-300'}`} />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>
            <div>
                <input type="number" step="0.1" name="rating" value={formData.rating} onChange={handleChange} placeholder="Rating (0.0 - 5.0)" className={`w-full p-2 bg-gray-100 border rounded ${errors.rating ? 'border-red-500' : 'border-gray-300'}`} />
                {errors.rating && <p className="text-red-500 text-xs mt-1">{errors.rating}</p>}
            </div>
            <div>
                <input type="number" name="reviews" value={formData.reviews} onChange={handleChange} placeholder="Reviews Count" className={`w-full p-2 bg-gray-100 border rounded ${errors.reviews ? 'border-red-500' : 'border-gray-300'}`} />
                {errors.reviews && <p className="text-red-500 text-xs mt-1">{errors.reviews}</p>}
            </div>
            <div>
                <input type="text" name="certifications" value={formData.certifications} onChange={handleChange} placeholder="Certifications (comma-separated)" className="w-full p-2 bg-gray-100 border border-gray-300 rounded" />
            </div>
            <div className="flex justify-end gap-4 mt-6">
                <button type="button" onClick={onCancel} className="bg-gray-200 text-gray-700 py-2 px-4 rounded hover:bg-gray-300">Cancel</button>
                <button type="submit" className="bg-primary text-white py-2 px-4 rounded hover:bg-orange-600 disabled:opacity-50" disabled={isFormIncomplete}>Save</button>
            </div>
        </form>
    );
};

const AdminMechanicsScreen: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMechanic, setEditingMechanic] = useState<Mechanic | undefined>(undefined);
    const [dataVersion, setDataVersion] = useState(0);

    const handleOpenModal = (mechanic?: Mechanic) => {
        setEditingMechanic(mechanic);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingMechanic(undefined);
        setIsModalOpen(false);
    };

    const handleSave = (mechanic: Mechanic) => {
        if (mechanic.id) {
            updateMechanic(mechanic);
        } else {
            addMechanic(mechanic);
        }
        setDataVersion(v => v + 1);
        handleCloseModal();
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Are you sure you want to delete this mechanic?')) {
            deleteMechanic(id);
            setDataVersion(v => v + 1);
        }
    };
    
    return (
        <div className="text-gray-800">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Manage Mechanics</h1>
                <button onClick={() => handleOpenModal()} className="bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-orange-600 transition">Add Mechanic</button>
            </div>
            <div className="bg-white p-6 rounded-lg shadow overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-gray-200">
                            <th className="p-3 font-bold text-gray-600">Name</th>
                            <th className="p-3 font-bold text-gray-600">Rating</th>
                            <th className="p-3 font-bold text-gray-600">Reviews</th>
                            <th className="p-3 font-bold text-gray-600">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {mockMechanics.map((mechanic, index) => (
                             <tr key={mechanic.id} className={`border-b border-gray-200 last:border-b-0 transition-colors duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100`}>
                                <td className="p-3">{mechanic.name}</td>
                                <td className="p-3">{mechanic.rating.toFixed(1)}</td>
                                <td className="p-3">{mechanic.reviews}</td>
                                <td className="p-3">
                                    <button onClick={() => handleOpenModal(mechanic)} className="font-semibold text-blue-500 hover:text-blue-700 mr-4">Edit</button>
                                    <button onClick={() => handleDelete(mechanic.id)} className="font-semibold text-red-500 hover:text-red-700">Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal title={editingMechanic ? 'Edit Mechanic' : 'Add Mechanic'} isOpen={isModalOpen} onClose={handleCloseModal}>
                <MechanicForm mechanic={editingMechanic} onSave={handleSave} onCancel={handleCloseModal} />
            </Modal>
        </div>
    );
};

export default AdminMechanicsScreen;
