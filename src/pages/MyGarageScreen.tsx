import React, { useState, useMemo } from 'react';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Vehicle } from '../types';
import Spinner from '../components/Spinner';
import { compressAndEncodeImage } from '../utils/fileUtils';
import { useDatabase } from '../context/DatabaseContext';
import { Image as ImageIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';

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
        imageUrls: vehicle?.imageUrls || []
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        if ((formData.imageUrls.length + files.length) > 5) {
            setErrors(prev => ({ ...prev, imageUrls: 'You can upload a maximum of 5 images.' }));
            return;
        }

        try {
            const base64Images = await Promise.all(files.map((file: File) => compressAndEncodeImage(file)));
            setFormData(prev => ({
                ...prev,
                imageUrls: [...prev.imageUrls, ...base64Images as string[]]
            }));
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors.imageUrls;
                return newErrors;
            });
        } catch (error) {
            console.error("Error converting files to base64:", error);
            setErrors(prev => ({ ...prev, imageUrls: 'Failed to upload one or more images.' }));
        }
    };

    const handleDeleteImage = (indexToDelete: number) => {
        setFormData(prev => ({
            ...prev,
            imageUrls: prev.imageUrls.filter((_, index) => index !== indexToDelete)
        }));
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
                    <h3 className="text-sm font-semibold text-primary border-b border-primary/20 pb-1">Vehicle Images</h3>
                    <div>
                        {formData.imageUrls.length > 0 ? (
                            <div className="grid grid-cols-3 gap-2 mb-2">
                                {formData.imageUrls.map((img, index) => (
                                    <div key={index} className="relative group">
                                        <img src={img} alt="Vehicle preview" className="w-full h-20 object-cover rounded-md bg-field border border-field" />
                                        <button type="button" onClick={() => handleDeleteImage(index)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="w-full h-40 bg-field rounded-lg mb-2 border border-dashed border-dark-gray flex items-center justify-center">
                                <ImageIcon className="h-16 w-16 text-gray-500" />
                            </div>
                        )}
                        {formData.imageUrls.length < 5 && (
                            <div>
                                <label className="block text-xs text-light-gray mb-1">Upload Images (up to 5)</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handleImageUpload}
                                    className="w-full text-sm text-light-gray file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                                />
                            </div>
                        )}
                        {errors.imageUrls && <p className="text-red-400 text-xs mt-1">{errors.imageUrls}</p>}
                    </div>

                    <h3 className="text-sm font-semibold text-primary border-b border-primary/20 pb-1 pt-2">Core Information</h3>
                    <input type="text" placeholder="Make (e.g., Toyota)" value={formData.make} onChange={e => setFormData({ ...formData, make: e.target.value })} className={`w-full px-4 py-3 bg-field border rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-2 ${errors.make ? 'border-red-500' : 'border-dark-gray focus:ring-primary'}`} />
                    <input type="text" placeholder="Model (e.g., Camry)" value={formData.model} onChange={e => setFormData({ ...formData, model: e.target.value })} className={`w-full px-4 py-3 bg-field border rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-2 ${errors.model ? 'border-red-500' : 'border-dark-gray focus:ring-primary'}`} />
                    <input type="number" placeholder="Year (e.g., 2021)" value={formData.year} onChange={e => setFormData({ ...formData, year: e.target.value ? parseInt(e.target.value) : new Date().getFullYear() })} className={`w-full px-4 py-3 bg-field border rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-2 ${errors.year ? 'border-red-500' : 'border-dark-gray focus:ring-primary'}`} />
                    <input type="text" placeholder="Plate Number" value={formData.plateNumber} onChange={e => setFormData({ ...formData, plateNumber: e.target.value.toUpperCase() })} readOnly={!!vehicle} className={`w-full px-4 py-3 bg-field border rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-2 ${errors.plateNumber ? 'border-red-500' : 'border-dark-gray focus:ring-primary'} ${!!vehicle ? 'bg-gray-700 cursor-not-allowed' : ''}`} />

                    <h3 className="text-sm font-semibold text-primary border-b border-primary/20 pb-1 pt-2">Additional Details (Optional)</h3>
                    <input type="text" placeholder="VIN" value={formData.vin} onChange={e => setFormData({ ...formData, vin: e.target.value })} className="w-full px-4 py-3 bg-field border border-dark-gray rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-2 focus:ring-primary" />
                    <input type="number" placeholder="Current Mileage" value={formData.mileage} onChange={e => setFormData({ ...formData, mileage: e.target.value })} className={`w-full px-4 py-3 bg-field border rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-2 ${errors.mileage ? 'border-red-500' : 'border-dark-gray focus:ring-primary'}`} />
                    <input type="text" placeholder="Insurance Provider" value={formData.insuranceProvider} onChange={e => setFormData({ ...formData, insuranceProvider: e.target.value })} className="w-full px-4 py-3 bg-field border border-dark-gray rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-2 focus:ring-primary" />
                    <input type="text" placeholder="Insurance Policy #" value={formData.insurancePolicyNumber} onChange={e => setFormData({ ...formData, insurancePolicyNumber: e.target.value })} className="w-full px-4 py-3 bg-field border border-dark-gray rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-2 focus:ring-primary" />

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
    const navigate = useNavigate();
    const history = useMemo(() => {
        if (!db) return [];
        return db.bookings
            .filter(b => b.vehicle.plateNumber === vehicle.plateNumber && b.status === 'Completed')
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [db, vehicle.plateNumber]);

    return (
        <div className="mt-4 pt-4 border-t border-field animate-fadeIn space-y-3">
            <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold text-primary">Maintenance History</h4>
                <button
                    onClick={() => navigate(`/booking-history/${vehicle.plateNumber}`)}
                    className="text-xs text-primary font-semibold hover:underline"
                >
                    View All
                </button>
            </div>
            {history.length > 0 ? (
                history.slice(0, 3).map(item => (
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

const VehicleImageCarousel: React.FC<{ images: string[] }> = ({ images }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    const goToPrevious = (e: React.MouseEvent) => {
        e.stopPropagation();
        const isFirstSlide = currentIndex === 0;
        const newIndex = isFirstSlide ? images.length - 1 : currentIndex - 1;
        setCurrentIndex(newIndex);
    };

    const goToNext = (e: React.MouseEvent) => {
        e.stopPropagation();
        const isLastSlide = currentIndex === images.length - 1;
        const newIndex = isLastSlide ? 0 : currentIndex + 1;
        setCurrentIndex(newIndex);
    };

    if (!images || images.length === 0) {
        return (
            <div className="w-28 h-20 object-cover rounded-md flex-shrink-0 bg-secondary flex items-center justify-center">
                <ImageIcon className="h-10 w-10 text-gray-500" />
            </div>
        );
    }

    return (
        <div className="w-28 h-20 relative group flex-shrink-0">
            <img src={images[currentIndex]} alt="Vehicle" className="w-full h-full object-cover rounded-md bg-secondary" />
            {images.length > 1 && (
                <>
                    <button onClick={goToPrevious} className="absolute top-1/2 left-1 transform -translate-y-1/2 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button onClick={goToNext} className="absolute top-1/2 right-1 transform -translate-y-1/2 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <ChevronRight className="h-4 w-4" />
                    </button>
                    <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-1">
                        {images.map((_, index) => (
                            <div key={index} className={`w-1.5 h-1.5 rounded-full ${currentIndex === index ? 'bg-white' : 'bg-white/50'}`}></div>
                        ))}
                    </div>
                </>
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
                                    <VehicleImageCarousel images={v.imageUrls} />
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