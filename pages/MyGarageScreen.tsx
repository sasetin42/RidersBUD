import React, { useState, useMemo } from 'react';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Vehicle } from '../types';
import Spinner from '../components/Spinner';
import { fileToBase64 } from '../utils/fileUtils';
import { useDatabase } from '../context/DatabaseContext';

const VehicleFormModal: React.FC<{
    vehicle?: Vehicle;
    onClose: () => void;
    onSave: (vehicle: Vehicle) => void;
}> = ({ vehicle, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        make: vehicle?.make || '',
        model: vehicle?.model || '',
        year: vehicle?.year || new Date().getFullYear(),
        plateNumber: vehicle?.plateNumber || '',
        vin: vehicle?.vin || '',
        mileage: vehicle?.mileage?.toString() || '',
        insuranceProvider: vehicle?.insuranceProvider || '',
        insurancePolicyNumber: vehicle?.insurancePolicyNumber || '',
        imageUrl: vehicle?.imageUrl || ''
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const base64Image = await fileToBase64(file);
                setFormData(prev => ({ ...prev, imageUrl: base64Image }));
            } catch (error) {
                console.error("Error converting file to base64:", error);
                setErrors(prev => ({ ...prev, imageUrl: 'Failed to upload image.' }));
            }
        }
    };

    const validate = () => {
        const newErrors: { [key: string]: string } = {};
        if (!formData.make.trim()) newErrors.make = "Make is required.";
        if (!formData.model.trim()) newErrors.model = "Model is required.";
        if (!formData.year) {
            newErrors.year = "Year is required.";
        } else if (Number(formData.year) > new Date().getFullYear() + 1 || Number(formData.year) < 1900) {
            newErrors.year = "Please enter a valid year.";
        }
        if (!formData.plateNumber.trim()) newErrors.plateNumber = "Plate number is required.";
        if (formData.mileage && isNaN(Number(formData.mileage))) {
            newErrors.mileage = "Mileage must be a number.";
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            onSave({
                ...formData,
                year: Number(formData.year),
                mileage: formData.mileage ? Number(formData.mileage) : undefined,
                isPrimary: vehicle?.isPrimary // Preserve primary status
            });
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fadeIn" role="dialog" aria-modal="true">
            <div className="bg-dark-gray rounded-lg p-6 w-full max-w-sm animate-scaleUp max-h-[90vh] overflow-y-auto scrollbar-hide">
                <h2 className="text-xl font-bold mb-4">{vehicle ? 'Edit Vehicle' : 'Add New Vehicle'}</h2>
                <form onSubmit={handleSave} noValidate className="space-y-4">
                    <h3 className="text-sm font-semibold text-primary border-b border-primary/20 pb-1">Vehicle Image</h3>
                    <div>
                        {formData.imageUrl ? (
                            <img src={formData.imageUrl} alt="Vehicle preview" className="w-full h-40 object-cover rounded-lg bg-field mb-2 border border-field" />
                        ) : (
                            <div className="w-full h-40 bg-field rounded-lg mb-2 border border-dashed border-dark-gray flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-500" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
                                </svg>
                            </div>
                        )}
                        <label className="block text-xs text-light-gray mb-1">Upload Image</label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="w-full text-sm text-light-gray file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                        />
                         {errors.imageUrl && <p className="text-red-400 text-xs mt-1">{errors.imageUrl}</p>}
                    </div>
                    
                    <h3 className="text-sm font-semibold text-primary border-b border-primary/20 pb-1 pt-2">Core Information</h3>
                    <input type="text" placeholder="Make (e.g., Toyota)" value={formData.make} onChange={e => setFormData({...formData, make: e.target.value})} className={`w-full px-4 py-3 bg-field border rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-2 ${errors.make ? 'border-red-500' : 'border-dark-gray focus:ring-primary'}`} />
                    <input type="text" placeholder="Model (e.g., Camry)" value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} className={`w-full px-4 py-3 bg-field border rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-2 ${errors.model ? 'border-red-500' : 'border-dark-gray focus:ring-primary'}`} />
                    <input type="number" placeholder="Year (e.g., 2021)" value={formData.year} onChange={e => setFormData({...formData, year: e.target.value ? parseInt(e.target.value) : new Date().getFullYear()})} className={`w-full px-4 py-3 bg-field border rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-2 ${errors.year ? 'border-red-500' : 'border-dark-gray focus:ring-primary'}`} />
                    <input type="text" placeholder="Plate Number" value={formData.plateNumber} onChange={e => setFormData({...formData, plateNumber: e.target.value.toUpperCase()})} readOnly={!!vehicle} className={`w-full px-4 py-3 bg-field border rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-2 ${errors.plateNumber ? 'border-red-500' : 'border-dark-gray focus:ring-primary'} ${!!vehicle ? 'bg-gray-700 cursor-not-allowed' : ''}`} />

                    <h3 className="text-sm font-semibold text-primary border-b border-primary/20 pb-1 pt-2">Additional Details (Optional)</h3>
                    <input type="text" placeholder="VIN" value={formData.vin} onChange={e => setFormData({...formData, vin: e.target.value})} className="w-full px-4 py-3 bg-field border border-dark-gray rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-2 focus:ring-primary" />
                    <input type="number" placeholder="Current Mileage" value={formData.mileage} onChange={e => setFormData({...formData, mileage: e.target.value})} className={`w-full px-4 py-3 bg-field border rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-2 ${errors.mileage ? 'border-red-500' : 'border-dark-gray focus:ring-primary'}`} />
                    <input type="text" placeholder="Insurance Provider" value={formData.insuranceProvider} onChange={e => setFormData({...formData, insuranceProvider: e.target.value})} className="w-full px-4 py-3 bg-field border border-dark-gray rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-2 focus:ring-primary" />
                    <input type="text" placeholder="Insurance Policy #" value={formData.insurancePolicyNumber} onChange={e => setFormData({...formData, insurancePolicyNumber: e.target.value})} className="w-full px-4 py-3 bg-field border border-dark-gray rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-2 focus:ring-primary" />
                    
                    <div className="mt-6 flex gap-4">
                        <button type="button" onClick={onClose} className="w-1/2 bg-field text-white font-bold py-3 rounded-lg hover:bg-gray-600 transition">Cancel</button>
                        <button type="submit" className="w-1/2 bg-primary text-white font-bold py-3 rounded-lg hover:bg-orange-600 transition">Save Vehicle</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const VehicleDetailRow: React.FC<{ label: string, value?: string | number }> = ({ label, value }) => (
    <div className="flex justify-between text-sm py-1">
        <span className="text-light-gray">{label}:</span>
        <span className="font-semibold text-white">{value || 'N/A'}</span>
    </div>
);

const MaintenanceHistory: React.FC<{ vehicle: Vehicle }> = ({ vehicle }) => {
    const { db } = useDatabase();
    const history = useMemo(() => {
        if (!db) return [];
        return db.bookings
            .filter(b => b.vehicle.plateNumber === vehicle.plateNumber && b.status === 'Completed')
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [db, vehicle.plateNumber]);

    return (
        <div className="mt-4 pt-4 border-t border-field animate-fadeIn space-y-3">
            <h4 className="font-semibold text-primary mb-2">Maintenance History</h4>
            {history.length > 0 ? (
                history.map(item => (
                    <div key={item.id} className="bg-field p-3 rounded-md">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="font-bold text-white text-sm">{item.service.name}</p>
                                <p className="text-xs text-light-gray">
                                    {new Date(item.date.replace(/-/g, '/')).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                </p>
                            </div>
                            <p className="font-semibold text-green-400 text-sm">₱{item.service.price.toLocaleString()}</p>
                        </div>
                        <p className="text-xs text-light-gray mt-1">Serviced by: {item.mechanic?.name || 'N/A'}</p>
                        {item.notes && <p className="text-xs mt-2 pt-2 border-t border-dark-gray text-gray-400">Notes: {item.notes}</p>}
                    </div>
                ))
            ) : (
                <p className="text-sm text-light-gray text-center py-4">No completed service history for this vehicle.</p>
            )}
        </div>
    );
};


const MyGarageScreen: React.FC = () => {
    const { user, addUserVehicle, updateUserVehicle, deleteUserVehicle, setPrimaryVehicle, loading } = useAuth();
    const navigate = useNavigate();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState<Vehicle | undefined>(undefined);
    const [expandedPlate, setExpandedPlate] = useState<string | null>(null);

    const handleOpenModal = (vehicle?: Vehicle) => {
        setEditingVehicle(vehicle);
        setIsModalOpen(true);
    };

    const handleSaveVehicle = (vehicle: Vehicle) => {
        if (editingVehicle) {
            updateUserVehicle(vehicle);
        } else {
            addUserVehicle(vehicle);
        }
        setIsModalOpen(false);
        setEditingVehicle(undefined);
    };
    
    const handleDeleteVehicle = (plateNumber: string) => {
        if (window.confirm(`Are you sure you want to remove vehicle ${plateNumber}? This action cannot be undone.`)) {
            deleteUserVehicle(plateNumber);
        }
    };
    
    const handleSetPrimary = (plateNumber: string) => {
        setPrimaryVehicle(plateNumber);
    };

    if (loading) {
        return <div className="flex items-center justify-center h-full bg-secondary"><Spinner size="lg" /></div>;
    }

    if (!user) {
        return <div className="text-center p-8">Could not load user data.</div>;
    }

    return (
        <div className="flex flex-col h-full bg-secondary">
            <Header title="My Garage" showBackButton />
            <div className="flex-grow p-4 space-y-4 overflow-y-auto">
                {user.vehicles.length > 0 ? (
                    user.vehicles.map(v => (
                        <div key={v.plateNumber} className={`bg-dark-gray rounded-lg shadow-sm relative transition-all duration-300 ${v.isPrimary ? 'border-2 border-primary' : 'border-2 border-transparent'}`}>
                            <div className="p-4">
                                {v.isPrimary && (
                                    <span className="absolute top-3 right-3 bg-primary text-white text-xs font-bold px-2 py-1 rounded-full z-10">
                                        PRIMARY
                                    </span>
                                )}
                                <div className="flex items-center gap-4">
                                    <img src={v.imageUrl || 'https://storage.googleapis.com/aistudio-hosting/generative-ai/e499715a-a38f-4d32-80f2-9b2512f7a6b2/assets/vehicle_sedan_gray.png'} alt={`${v.make} ${v.model}`} className="w-28 h-20 object-cover rounded-md flex-shrink-0 bg-secondary" />
                                    <div>
                                        <p className="font-bold text-white text-lg">{v.make} {v.model}</p>
                                        <p className="text-sm text-light-gray">{v.year}</p>
                                        <p className="text-sm bg-secondary inline-block px-3 py-1 mt-1 rounded-md font-mono tracking-wider text-white">{v.plateNumber}</p>
                                    </div>
                                </div>

                                {expandedPlate === v.plateNumber && (
                                     <div className="mt-4 pt-4 border-t border-field animate-fadeIn space-y-1">
                                         <h4 className="font-semibold text-primary mb-2">Vehicle Details</h4>
                                         <VehicleDetailRow label="VIN" value={v.vin} />
                                         <VehicleDetailRow label="Mileage" value={v.mileage ? `${v.mileage.toLocaleString()} km` : undefined} />
                                         <VehicleDetailRow label="Insurance" value={v.insuranceProvider} />
                                         <VehicleDetailRow label="Policy #" value={v.insurancePolicyNumber} />
                                         <MaintenanceHistory vehicle={v} />
                                     </div>
                                )}
                                
                                <div className="flex flex-wrap justify-end items-center mt-4 gap-x-4 gap-y-2 text-sm">
                                    <button onClick={() => setExpandedPlate(p => p === v.plateNumber ? null : v.plateNumber)} className="text-primary font-semibold hover:underline">
                                        {expandedPlate === v.plateNumber ? 'Hide Details & History' : 'View Details & History'}
                                    </button>
                                    <button onClick={() => handleOpenModal(v)} className="text-green-400 font-semibold hover:underline">Edit</button>
                                    {!v.isPrimary && (
                                        <button onClick={() => handleSetPrimary(v.plateNumber)} className="text-yellow-400 font-semibold hover:underline">Set Primary</button>
                                    )}
                                    <button onClick={() => handleDeleteVehicle(v.plateNumber)} className="text-red-400 font-semibold hover:underline">Delete</button>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-16 text-light-gray">
                        <p>Your garage is empty. Add a vehicle to get started!</p>
                    </div>
                )}
            </div>
            <div className="p-4 bg-[#1D1D1D] border-t border-dark-gray">
                <button onClick={() => handleOpenModal()} className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-orange-600 transition">
                    + Add New Vehicle
                </button>
            </div>
            {isModalOpen && <VehicleFormModal vehicle={editingVehicle} onClose={() => { setIsModalOpen(false); setEditingVehicle(undefined); }} onSave={handleSaveVehicle} />}
        </div>
    );
};

export default MyGarageScreen;