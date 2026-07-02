import React, { useState } from 'react';
import { Service, RentalCar, HireDriver } from '../../types';
import Modal from '../../components/admin/Modal';
import { useDatabase } from '../../context/DatabaseContext';
import Spinner from '../../components/Spinner';
import { Car, UserCheck, Briefcase, Plus, Edit2, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';

export const parseEstimatedTime = (timeStr: string) => {
    const fallback = { value: 30, unit: 'mins' as const };
    if (!timeStr) return fallback;

    const regex = /^(\d+)\s*(min|mins|minute|minutes|hour|hours|hr|hrs|day|days)\b/i;
    const match = timeStr.trim().match(regex);

    if (!match) return fallback;

    const value = parseInt(match[1], 10);
    const unitRaw = match[2].toLowerCase();

    let unit: 'mins' | 'hours' | 'days' = 'mins';
    if (unitRaw.startsWith('min')) {
        unit = 'mins';
    } else if (unitRaw.startsWith('hour') || unitRaw.startsWith('hr')) {
        unit = 'hours';
    } else if (unitRaw.startsWith('day')) {
        unit = 'days';
    }

    return { value, unit };
};

// ─── SERVICE FORM ────────────────────────────────────────────────────────────
const ServiceForm: React.FC<{ service?: Service; onSave: (service: any) => void; onCancel: () => void; }> = ({ service, onSave, onCancel }) => {
    const parsedDuration = parseEstimatedTime(service?.estimatedTime || '');
    const [formData, setFormData] = useState({
        id: service?.id || '',
        name: service?.name || '',
        description: service?.description || '',
        price: service?.price ?? '',
        estimatedTime: service?.estimatedTime || `${parsedDuration.value} ${parsedDuration.unit}`,
        durationValue: parsedDuration.value,
        durationUnit: parsedDuration.unit,
        category: service?.category || '',
        imageUrl: service?.imageUrl || 'https://picsum.photos/seed/new/400/300',
        isCarRental: service?.isCarRental || false,
        carRentalClass: service?.carRentalClass || 'Sedan',
        carRentalTransmission: service?.carRentalTransmission || 'Automatic',
        carRentalFuel: service?.carRentalFuel || 'Full to Full',
        isDriverHire: service?.isDriverHire || false,
        driverLicenseType: service?.driverLicenseType || 'Professional',
        driverExperience: service?.driverExperience || '3-5 years',
        driverGeoLimits: service?.driverGeoLimits || 'Within City',
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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
        setFormData(prev => ({ ...prev, [name]: val }));
        if (errors[name]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const handleDurationChange = (value: number, unit: 'mins' | 'hours' | 'days') => {
        let timeStr = '';
        if (unit === 'mins') {
            timeStr = `${value} mins`;
        } else if (unit === 'hours') {
            timeStr = `${value} ${value === 1 ? 'hour' : 'hours'}`;
        } else if (unit === 'days') {
            timeStr = `${value} ${value === 1 ? 'day' : 'days'}`;
        }

        setFormData(prev => ({
            ...prev,
            durationValue: value,
            durationUnit: unit,
            estimatedTime: timeStr
        }));

        if (errors.estimatedTime) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors.estimatedTime;
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
                isCarRental: formData.isCarRental,
                carRentalClass: formData.isCarRental ? formData.carRentalClass : undefined,
                carRentalTransmission: formData.isCarRental ? formData.carRentalTransmission : undefined,
                carRentalFuel: formData.isCarRental ? formData.carRentalFuel : undefined,
                isDriverHire: formData.isDriverHire,
                driverLicenseType: formData.isDriverHire ? formData.driverLicenseType : undefined,
                driverExperience: formData.isDriverHire ? formData.driverExperience : undefined,
                driverGeoLimits: formData.isDriverHire ? formData.driverGeoLimits : undefined,
            });
        }
    };

    const isFormIncomplete = !formData.name || !formData.description || formData.price === '' || !formData.estimatedTime || !formData.category;

    return (
        <form onSubmit={handleSubmit} className="space-y-4 text-gray-800">
            <div>
                <input type="text" id="service-name" name="name" value={formData.name} onChange={handleChange} placeholder="Service Name" className={`w-full p-2 bg-gray-100 border rounded ${errors.name ? 'border-red-500' : 'border-gray-300'}`} />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>
            <div>
                <textarea id="service-description" name="description" value={formData.description} onChange={handleChange} placeholder="Description" className={`w-full p-2 bg-gray-100 border rounded ${errors.description ? 'border-red-500' : 'border-gray-300'}`} />
                {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
            </div>
            <div>
                <input type="number" id="service-price" name="price" value={formData.price} onChange={handleChange} placeholder="Price" className={`w-full p-2 bg-gray-100 border rounded ${errors.price ? 'border-red-500' : 'border-gray-300'}`} />
                {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
            </div>
            <div className="space-y-1">
                <div className="flex gap-2">
                    <input
                        type="number"
                        min="1"
                        step="1"
                        id="service-durationValue"
                        name="durationValue"
                        value={formData.durationValue}
                        onChange={(e) => handleDurationChange(parseInt(e.target.value) || 1, formData.durationUnit)}
                        placeholder="Duration"
                        className={`w-2/3 p-2 bg-gray-100 border rounded ${errors.estimatedTime ? 'border-red-500' : 'border-gray-300'}`}
                    />
                    <select
                        id="service-durationUnit"
                        name="durationUnit"
                        value={formData.durationUnit}
                        onChange={(e) => handleDurationChange(formData.durationValue, e.target.value as any)}
                        className={`w-1/3 p-2 bg-gray-100 border rounded ${errors.estimatedTime ? 'border-red-500' : 'border-gray-300'}`}
                    >
                        <option value="mins">Minutes</option>
                        <option value="hours">Hours</option>
                        <option value="days">Days</option>
                    </select>
                </div>
                {errors.estimatedTime && <p className="text-red-500 text-xs mt-1">{errors.estimatedTime}</p>}
            </div>
            <div>
                <input type="text" id="service-category" name="category" value={formData.category} onChange={handleChange} placeholder="Category" className={`w-full p-2 bg-gray-100 border rounded ${errors.category ? 'border-red-500' : 'border-gray-300'}`} />
                {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
            </div>

            <div className="p-4 rounded border border-gray-300 bg-gray-50 space-y-4">
                <div className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                    <span>🔑</span> Rental & Driver Hire Settings
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label htmlFor="is-car-rental" className="flex items-center gap-3 cursor-pointer p-3 bg-white border border-gray-200 rounded hover:bg-gray-100 transition-all select-none">
                        <input
                            id="is-car-rental"
                            type="checkbox"
                            name="isCarRental"
                            checked={formData.isCarRental}
                            onChange={handleChange}
                            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary bg-white"
                        />
                        <div className="flex flex-col">
                            <span className="text-sm font-semibold text-gray-800">Car Rental Service</span>
                            <span className="text-xs text-gray-500">Enable car renting options for this service</span>
                        </div>
                    </label>

                    <label htmlFor="is-driver-hire" className="flex items-center gap-3 cursor-pointer p-3 bg-white border border-gray-200 rounded hover:bg-gray-100 transition-all select-none">
                        <input
                            id="is-driver-hire"
                            type="checkbox"
                            name="isDriverHire"
                            checked={formData.isDriverHire}
                            onChange={handleChange}
                            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary bg-white"
                        />
                        <div className="flex flex-col">
                            <span className="text-sm font-semibold text-gray-800">Driver Hire Service</span>
                            <span className="text-xs text-gray-500">Enable driver hire settings for this service</span>
                        </div>
                    </label>
                </div>

                {formData.isCarRental && (
                    <div className="p-4 rounded border border-gray-200 bg-white space-y-4 animate-fadeIn">
                        <div className="text-xs font-bold text-gray-600 tracking-wider uppercase">Car Rental Options</div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="car-rental-class" className="text-xs font-bold text-gray-600 tracking-wider">Vehicle Class</label>
                                <select
                                    id="car-rental-class"
                                    name="carRentalClass"
                                    value={formData.carRentalClass}
                                    onChange={handleChange}
                                    className="w-full p-2 bg-gray-100 border border-gray-300 rounded text-gray-800 focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                >
                                    <option value="Sedan">Sedan</option>
                                    <option value="SUV">SUV</option>
                                    <option value="Van">Van</option>
                                    <option value="Hatchback">Hatchback</option>
                                    <option value="Pickup">Pickup</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="car-rental-transmission" className="text-xs font-bold text-gray-600 tracking-wider">Transmission</label>
                                <select
                                    id="car-rental-transmission"
                                    name="carRentalTransmission"
                                    value={formData.carRentalTransmission}
                                    onChange={handleChange}
                                    className="w-full p-2 bg-gray-100 border border-gray-300 rounded text-gray-800 focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                >
                                    <option value="Automatic">Automatic</option>
                                    <option value="Manual">Manual</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="car-rental-fuel" className="text-xs font-bold text-gray-600 tracking-wider">Fuel Policy</label>
                                <select
                                    id="car-rental-fuel"
                                    name="carRentalFuel"
                                    value={formData.carRentalFuel}
                                    onChange={handleChange}
                                    className="w-full p-2 bg-gray-100 border border-gray-300 rounded text-gray-800 focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                >
                                    <option value="Full to Full">Full to Full</option>
                                    <option value="Same to Same">Same to Same</option>
                                    <option value="Free Fuel">Free Fuel</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {formData.isDriverHire && (
                    <div className="p-4 rounded border border-gray-200 bg-white space-y-4 animate-fadeIn">
                        <div className="text-xs font-bold text-gray-600 tracking-wider uppercase">Driver Hire Options</div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="driver-license-type" className="text-xs font-bold text-gray-600 tracking-wider">License Type Required</label>
                                <select
                                    id="driver-license-type"
                                    name="driverLicenseType"
                                    value={formData.driverLicenseType}
                                    onChange={handleChange}
                                    className="w-full p-2 bg-gray-100 border border-gray-300 rounded text-gray-800 focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                >
                                    <option value="Professional">Professional</option>
                                    <option value="Non-Professional">Non-Professional</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="driver-experience" className="text-xs font-bold text-gray-600 tracking-wider">Required Experience</label>
                                <select
                                    id="driver-experience"
                                    name="driverExperience"
                                    value={formData.driverExperience}
                                    onChange={handleChange}
                                    className="w-full p-2 bg-gray-100 border border-gray-300 rounded text-gray-800 focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                >
                                    <option value="1-2 years">1-2 years</option>
                                    <option value="3-5 years">3-5 years</option>
                                    <option value="5+ years">5+ years</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="driver-geo-limits" className="text-xs font-bold text-gray-600 tracking-wider">Geographic Limits</label>
                                <select
                                    id="driver-geo-limits"
                                    name="driverGeoLimits"
                                    value={formData.driverGeoLimits}
                                    onChange={handleChange}
                                    className="w-full p-2 bg-gray-100 border border-gray-300 rounded text-gray-800 focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                >
                                    <option value="Within City">Within City</option>
                                    <option value="Province Wide">Province Wide</option>
                                    <option value="Nationwide">Nationwide</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex justify-end gap-4 mt-6">
                <button type="button" onClick={onCancel} className="bg-gray-200 text-gray-700 py-2 px-4 rounded hover:bg-gray-300">Cancel</button>
                <button type="submit" className="bg-primary text-white py-2 px-4 rounded hover:bg-orange-600 disabled:opacity-50" disabled={isFormIncomplete}>Save</button>
            </div>
        </form>
    );
};

// ─── RENTAL CAR FORM ──────────────────────────────────────────────────────────
const RentalCarForm: React.FC<{ car?: RentalCar; onSave: (car: any) => void; onCancel: () => void; }> = ({ car, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        make: car?.make || '',
        model: car?.model || '',
        year: car?.year || new Date().getFullYear(),
        type: car?.type || 'Sedan',
        seats: car?.seats || 5,
        pricePerDay: car?.pricePerDay || '',
        transmission: car?.transmission || 'Automatic',
        fuelPolicy: car?.fuelPolicy || 'Full to Full',
        color: car?.color || '',
        plateNumber: car?.plateNumber || '',
        isAvailable: car?.isAvailable ?? true,
        imageUrl: car?.imageUrl || 'https://picsum.photos/seed/car/400/300',
        description: car?.description || '',
        features: (car?.features || []).join(', '),
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [saving, setSaving] = useState(false);

    const validate = () => {
        const e: { [key: string]: string } = {};
        if (!formData.make.trim()) e.make = 'Make is required.';
        if (!formData.model.trim()) e.model = 'Model is required.';
        if (!formData.year || formData.year < 1990) e.year = 'Valid year required.';
        if (!formData.pricePerDay || Number(formData.pricePerDay) <= 0) e.pricePerDay = 'Price per day required.';
        return e;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
        setFormData(prev => ({ ...prev, [name]: val }));
        if (errors[name]) setErrors(prev => { const n = { ...prev }; delete n[name]; return n; });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const v = validate();
        setErrors(v);
        if (Object.keys(v).length > 0) return;
        setSaving(true);
        onSave({
            ...formData,
            year: Number(formData.year),
            seats: Number(formData.seats),
            pricePerDay: Number(formData.pricePerDay),
            features: formData.features ? formData.features.split(',').map(f => f.trim()).filter(Boolean) : [],
            ...(car?.id ? { id: car.id } : {}),
        });
        setSaving(false);
    };

    const inputCls = (field: string) => `w-full p-2.5 bg-field border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary/60 transition-all ${errors[field] ? 'border-red-500' : 'border-white/10'}`;
    const labelCls = 'block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5';

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            {/* Make & Model */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="car-make" className={labelCls}>Make / Brand *</label>
                    <input type="text" id="car-make" name="make" value={formData.make} onChange={handleChange} placeholder="e.g. Toyota" className={inputCls('make')} />
                    {errors.make && <p className="text-red-400 text-xs mt-1">{errors.make}</p>}
                </div>
                <div>
                    <label htmlFor="car-model" className={labelCls}>Model *</label>
                    <input type="text" id="car-model" name="model" value={formData.model} onChange={handleChange} placeholder="e.g. Vios" className={inputCls('model')} />
                    {errors.model && <p className="text-red-400 text-xs mt-1">{errors.model}</p>}
                </div>
            </div>

            {/* Year, Type, Seats */}
            <div className="grid grid-cols-3 gap-4">
                <div>
                    <label htmlFor="car-year" className={labelCls}>Year *</label>
                    <input type="number" id="car-year" name="year" value={formData.year} onChange={handleChange} min="1990" max="2030" className={inputCls('year')} />
                    {errors.year && <p className="text-red-400 text-xs mt-1">{errors.year}</p>}
                </div>
                <div>
                    <label htmlFor="car-type" className={labelCls}>Vehicle Type</label>
                    <select id="car-type" name="type" value={formData.type} onChange={handleChange} className={inputCls('type')}>
                        <option value="Sedan">Sedan</option>
                        <option value="SUV">SUV</option>
                        <option value="Van">Van</option>
                        <option value="Hatchback">Hatchback</option>
                        <option value="Pickup">Pickup</option>
                        <option value="Coupe">Coupe</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="car-seats" className={labelCls}>Seats</label>
                    <input type="number" id="car-seats" name="seats" value={formData.seats} onChange={handleChange} min="2" max="20" className={inputCls('seats')} />
                </div>
            </div>

            {/* Price, Transmission, Fuel */}
            <div className="grid grid-cols-3 gap-4">
                <div>
                    <label htmlFor="car-pricePerDay" className={labelCls}>Price / Day (₱) *</label>
                    <input type="number" id="car-pricePerDay" name="pricePerDay" value={formData.pricePerDay} onChange={handleChange} placeholder="0.00" min="0" className={inputCls('pricePerDay')} />
                    {errors.pricePerDay && <p className="text-red-400 text-xs mt-1">{errors.pricePerDay}</p>}
                </div>
                <div>
                    <label htmlFor="car-transmission" className={labelCls}>Transmission</label>
                    <select id="car-transmission" name="transmission" value={formData.transmission} onChange={handleChange} className={inputCls('transmission')}>
                        <option value="Automatic">Automatic</option>
                        <option value="Manual">Manual</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="car-fuelPolicy" className={labelCls}>Fuel Policy</label>
                    <select id="car-fuelPolicy" name="fuelPolicy" value={formData.fuelPolicy} onChange={handleChange} className={inputCls('fuelPolicy')}>
                        <option value="Full to Full">Full to Full</option>
                        <option value="Same to Same">Same to Same</option>
                        <option value="Free Fuel">Free Fuel</option>
                    </select>
                </div>
            </div>

            {/* Color, Plate, Availability */}
            <div className="grid grid-cols-3 gap-4">
                <div>
                    <label htmlFor="car-color" className={labelCls}>Color</label>
                    <input type="text" id="car-color" name="color" value={formData.color} onChange={handleChange} placeholder="e.g. White" className={inputCls('color')} />
                </div>
                <div>
                    <label htmlFor="car-plateNumber" className={labelCls}>Plate Number</label>
                    <input type="text" id="car-plateNumber" name="plateNumber" value={formData.plateNumber} onChange={handleChange} placeholder="e.g. ABC-1234" className={inputCls('plateNumber')} />
                </div>
                <div className="flex flex-col justify-end pb-1">
                    <label className={labelCls}>Availability</label>
                    <label className="flex items-center gap-2 cursor-pointer mt-1">
                        <div
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${formData.isAvailable ? 'bg-green-500' : 'bg-gray-600'}`}
                            onClick={() => setFormData(p => ({ ...p, isAvailable: !p.isAvailable }))}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${formData.isAvailable ? 'translate-x-6' : 'translate-x-1'}`} />
                        </div>
                        <span className="text-sm text-white">{formData.isAvailable ? 'Available' : 'Unavailable'}</span>
                    </label>
                </div>
            </div>

            {/* Image URL */}
            <div>
                <label htmlFor="car-imageUrl" className={labelCls}>Image URL</label>
                <input type="text" id="car-imageUrl" name="imageUrl" value={formData.imageUrl} onChange={handleChange} placeholder="https://..." className={inputCls('imageUrl')} />
                {formData.imageUrl && (
                    <img src={formData.imageUrl} alt="Preview" className="mt-2 h-24 w-full object-cover rounded-lg border border-white/10" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                )}
            </div>

            {/* Features */}
            <div>
                <label htmlFor="car-features" className={labelCls}>Features (comma-separated)</label>
                <input type="text" id="car-features" name="features" value={formData.features} onChange={handleChange} placeholder="e.g. GPS, Bluetooth, Air Conditioning" className={inputCls('features')} />
            </div>

            {/* Description */}
            <div>
                <label htmlFor="car-description" className={labelCls}>Description</label>
                <textarea id="car-description" name="description" value={formData.description} onChange={handleChange} rows={3} placeholder="Brief description of the vehicle..." className={inputCls('description')} />
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-white/5">
                <button type="button" onClick={onCancel} className="px-5 py-2.5 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 font-semibold transition-all">Cancel</button>
                <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-xl bg-primary text-white font-bold hover:bg-orange-600 transition-all disabled:opacity-50 flex items-center gap-2">
                    {saving ? <Spinner size="sm" /> : <Car size={16} />}
                    {car ? 'Update Car' : 'Add Car'}
                </button>
            </div>
        </form>
    );
};

// ─── HIRE DRIVER FORM ─────────────────────────────────────────────────────────
const HireDriverForm: React.FC<{ driver?: HireDriver; onSave: (driver: any) => void; onCancel: () => void; }> = ({ driver, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        name: driver?.name || '',
        phone: driver?.phone || '',
        licenseType: driver?.licenseType || 'Professional',
        licenseNumber: driver?.licenseNumber || '',
        experience: driver?.experience || '3-5 years',
        geoLimit: driver?.geoLimit || 'Within City',
        pricePerHour: driver?.pricePerHour || '',
        pricePerDay: driver?.pricePerDay || '',
        isAvailable: driver?.isAvailable ?? true,
        imageUrl: driver?.imageUrl || 'https://picsum.photos/seed/driver/400/400',
        rating: driver?.rating || 5.0,
        totalTrips: driver?.totalTrips || 0,
        languages: (driver?.languages || ['Filipino', 'English']).join(', '),
        description: driver?.description || '',
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [saving, setSaving] = useState(false);

    const validate = () => {
        const e: { [key: string]: string } = {};
        if (!formData.name.trim()) e.name = 'Driver name is required.';
        if (!formData.phone.trim()) e.phone = 'Phone number is required.';
        if (!formData.pricePerHour || Number(formData.pricePerHour) <= 0) e.pricePerHour = 'Hourly rate required.';
        if (!formData.pricePerDay || Number(formData.pricePerDay) <= 0) e.pricePerDay = 'Daily rate required.';
        return e;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
        setFormData(prev => ({ ...prev, [name]: val }));
        if (errors[name]) setErrors(prev => { const n = { ...prev }; delete n[name]; return n; });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const v = validate();
        setErrors(v);
        if (Object.keys(v).length > 0) return;
        setSaving(true);
        onSave({
            ...formData,
            pricePerHour: Number(formData.pricePerHour),
            pricePerDay: Number(formData.pricePerDay),
            rating: Number(formData.rating),
            totalTrips: Number(formData.totalTrips),
            languages: formData.languages ? formData.languages.split(',').map(l => l.trim()).filter(Boolean) : [],
            ...(driver?.id ? { id: driver.id } : {}),
        });
        setSaving(false);
    };

    const inputCls = (field: string) => `w-full p-2.5 bg-field border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary/60 transition-all ${errors[field] ? 'border-red-500' : 'border-white/10'}`;
    const labelCls = 'block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5';

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name & Phone */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="driver-name" className={labelCls}>Full Name *</label>
                    <input type="text" id="driver-name" name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Juan dela Cruz" className={inputCls('name')} />
                    {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
                </div>
                <div>
                    <label htmlFor="driver-phone" className={labelCls}>Phone Number *</label>
                    <input type="text" id="driver-phone" name="phone" value={formData.phone} onChange={handleChange} placeholder="e.g. 09xx-xxx-xxxx" className={inputCls('phone')} />
                    {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
                </div>
            </div>

            {/* License Type, License Number */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="driver-licenseType" className={labelCls}>License Type</label>
                    <select id="driver-licenseType" name="licenseType" value={formData.licenseType} onChange={handleChange} className={inputCls('licenseType')}>
                        <option value="Professional">Professional</option>
                        <option value="Non-Professional">Non-Professional</option>
                        <option value="Restriction 1">Restriction 1 (Motorcycle)</option>
                        <option value="Restriction 2">Restriction 2 (Light vehicles)</option>
                        <option value="Restriction 3">Restriction 3 (Heavy vehicles)</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="driver-licenseNumber" className={labelCls}>License Number</label>
                    <input type="text" id="driver-licenseNumber" name="licenseNumber" value={formData.licenseNumber} onChange={handleChange} placeholder="License plate/ID number" className={inputCls('licenseNumber')} />
                </div>
            </div>

            {/* Experience & Geo Limit */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="driver-experience" className={labelCls}>Experience</label>
                    <select id="driver-experience" name="experience" value={formData.experience} onChange={handleChange} className={inputCls('experience')}>
                        <option value="Less than 1 year">Less than 1 year</option>
                        <option value="1-2 years">1-2 years</option>
                        <option value="3-5 years">3-5 years</option>
                        <option value="5+ years">5+ years</option>
                        <option value="10+ years">10+ years</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="driver-geoLimit" className={labelCls}>Geographic Coverage</label>
                    <select id="driver-geoLimit" name="geoLimit" value={formData.geoLimit} onChange={handleChange} className={inputCls('geoLimit')}>
                        <option value="Within City">Within City</option>
                        <option value="Province Wide">Province Wide</option>
                        <option value="Region Wide">Region Wide</option>
                        <option value="Nationwide">Nationwide</option>
                    </select>
                </div>
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="driver-pricePerHour" className={labelCls}>Rate / Hour (₱) *</label>
                    <input type="number" id="driver-pricePerHour" name="pricePerHour" value={formData.pricePerHour} onChange={handleChange} placeholder="0.00" min="0" className={inputCls('pricePerHour')} />
                    {errors.pricePerHour && <p className="text-red-400 text-xs mt-1">{errors.pricePerHour}</p>}
                </div>
                <div>
                    <label htmlFor="driver-pricePerDay" className={labelCls}>Rate / Day (₱) *</label>
                    <input type="number" id="driver-pricePerDay" name="pricePerDay" value={formData.pricePerDay} onChange={handleChange} placeholder="0.00" min="0" className={inputCls('pricePerDay')} />
                    {errors.pricePerDay && <p className="text-red-400 text-xs mt-1">{errors.pricePerDay}</p>}
                </div>
            </div>

            {/* Rating, Trips, Availability */}
            <div className="grid grid-cols-3 gap-4">
                <div>
                    <label htmlFor="driver-rating" className={labelCls}>Rating (1-5)</label>
                    <input type="number" id="driver-rating" name="rating" value={formData.rating} onChange={handleChange} min="1" max="5" step="0.1" className={inputCls('rating')} />
                </div>
                <div>
                    <label htmlFor="driver-totalTrips" className={labelCls}>Total Trips</label>
                    <input type="number" id="driver-totalTrips" name="totalTrips" value={formData.totalTrips} onChange={handleChange} min="0" className={inputCls('totalTrips')} />
                </div>
                <div className="flex flex-col justify-end pb-1">
                    <label className={labelCls}>Availability</label>
                    <label className="flex items-center gap-2 cursor-pointer mt-1">
                        <div
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${formData.isAvailable ? 'bg-green-500' : 'bg-gray-600'}`}
                            onClick={() => setFormData(p => ({ ...p, isAvailable: !p.isAvailable }))}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${formData.isAvailable ? 'translate-x-6' : 'translate-x-1'}`} />
                        </div>
                        <span className="text-sm text-white">{formData.isAvailable ? 'Available' : 'Not Available'}</span>
                    </label>
                </div>
            </div>

            {/* Languages */}
            <div>
                <label htmlFor="driver-languages" className={labelCls}>Languages Spoken (comma-separated)</label>
                <input type="text" id="driver-languages" name="languages" value={formData.languages} onChange={handleChange} placeholder="e.g. Filipino, English" className={inputCls('languages')} />
            </div>

            {/* Photo URL */}
            <div>
                <label htmlFor="driver-imageUrl" className={labelCls}>Profile Photo URL</label>
                <input type="text" id="driver-imageUrl" name="imageUrl" value={formData.imageUrl} onChange={handleChange} placeholder="https://..." className={inputCls('imageUrl')} />
                {formData.imageUrl && (
                    <img src={formData.imageUrl} alt="Preview" className="mt-2 h-20 w-20 object-cover rounded-full border-2 border-primary/30" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                )}
            </div>

            {/* Description */}
            <div>
                <label htmlFor="driver-description" className={labelCls}>Bio / Description</label>
                <textarea id="driver-description" name="description" value={formData.description} onChange={handleChange} rows={3} placeholder="Brief driver introduction..." className={inputCls('description')} />
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-white/5">
                <button type="button" onClick={onCancel} className="px-5 py-2.5 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 font-semibold transition-all">Cancel</button>
                <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-xl bg-primary text-white font-bold hover:bg-orange-600 transition-all disabled:opacity-50 flex items-center gap-2">
                    {saving ? <Spinner size="sm" /> : <UserCheck size={16} />}
                    {driver ? 'Update Driver' : 'Add Driver'}
                </button>
            </div>
        </form>
    );
};

// ─── MAIN ADMIN SERVICES SCREEN ───────────────────────────────────────────────
type TabType = 'services' | 'fleet' | 'drivers';

const AdminServicesScreen: React.FC = () => {
    const { db, addService, updateService, deleteService, addRentalCar, updateRentalCar, deleteRentalCar, addHireDriver, updateHireDriver, deleteHireDriver, loading } = useDatabase();
    const [activeTab, setActiveTab] = useState<TabType>('services');

    // Service modal state
    const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<Service | undefined>(undefined);

    // Rental car modal state
    const [isCarModalOpen, setIsCarModalOpen] = useState(false);
    const [editingCar, setEditingCar] = useState<RentalCar | undefined>(undefined);

    // Hire driver modal state
    const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
    const [editingDriver, setEditingDriver] = useState<HireDriver | undefined>(undefined);

    if (loading || !db) {
        return <div className="flex items-center justify-center h-full"><Spinner size="lg" color="text-secondary" /></div>;
    }

    // ── Service handlers ──
    const handleOpenServiceModal = (service?: Service) => { setEditingService(service); setIsServiceModalOpen(true); };
    const handleCloseServiceModal = () => { setEditingService(undefined); setIsServiceModalOpen(false); };
    const handleSaveService = (service: Service) => {
        if (service.id) { updateService(service); } else { addService(service); }
        handleCloseServiceModal();
    };
    const handleDeleteService = (id: string) => {
        if (window.confirm('Delete this service?')) deleteService(id);
    };

    // ── Car handlers ──
    const handleOpenCarModal = (car?: RentalCar) => { setEditingCar(car); setIsCarModalOpen(true); };
    const handleCloseCarModal = () => { setEditingCar(undefined); setIsCarModalOpen(false); };
    const handleSaveCar = (car: RentalCar) => {
        if (car.id) { updateRentalCar(car); } else { addRentalCar(car); }
        handleCloseCarModal();
    };
    const handleDeleteCar = (id: string) => {
        if (window.confirm('Remove this car from the fleet?')) deleteRentalCar(id);
    };
    const handleToggleCarAvailability = (car: RentalCar) => {
        updateRentalCar({ ...car, isAvailable: !car.isAvailable });
    };

    // ── Driver handlers ──
    const handleOpenDriverModal = (driver?: HireDriver) => { setEditingDriver(driver); setIsDriverModalOpen(true); };
    const handleCloseDriverModal = () => { setEditingDriver(undefined); setIsDriverModalOpen(false); };
    const handleSaveDriver = (driver: HireDriver) => {
        if (driver.id) { updateHireDriver(driver); } else { addHireDriver(driver); }
        handleCloseDriverModal();
    };
    const handleDeleteDriver = (id: string) => {
        if (window.confirm('Remove this driver from the pool?')) deleteHireDriver(id);
    };
    const handleToggleDriverAvailability = (driver: HireDriver) => {
        updateHireDriver({ ...driver, isAvailable: !driver.isAvailable });
    };

    const tabs = [
        { id: 'services' as TabType, label: 'Services', icon: <Briefcase size={15} />, count: db.services.length },
        { id: 'fleet' as TabType, label: 'Rental Fleet', icon: <Car size={15} />, count: db.rentalCars.length },
        { id: 'drivers' as TabType, label: 'Hire Drivers', icon: <UserCheck size={15} />, count: (db.hireDrivers || []).length },
    ];

    return (
        <div className="bg-secondary text-white flex flex-col h-full p-4 sm:p-6 lg:p-8 overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 flex-shrink-0">
                <div>
                    <h1 className="text-3xl font-bold">Manage Services</h1>
                    <p className="text-gray-400 text-sm mt-0.5">Services, rental fleet & hire driver pool</p>
                </div>
                {activeTab === 'services' && (
                    <button onClick={() => handleOpenServiceModal()} className="flex items-center gap-2 bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-orange-600 transition">
                        <Plus size={16} /> Add Service
                    </button>
                )}
                {activeTab === 'fleet' && (
                    <button onClick={() => handleOpenCarModal()} className="flex items-center gap-2 bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-orange-600 transition">
                        <Plus size={16} /> Add Car
                    </button>
                )}
                {activeTab === 'drivers' && (
                    <button onClick={() => handleOpenDriverModal()} className="flex items-center gap-2 bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-orange-600 transition">
                        <Plus size={16} /> Add Driver
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-5 flex-shrink-0 bg-dark-gray p-1 rounded-xl w-fit">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                            activeTab === tab.id
                                ? 'bg-primary text-white shadow-md shadow-primary/30'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        {tab.icon}
                        {tab.label}
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-white/20' : 'bg-white/10'}`}>
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            {/* ── SERVICES TAB ── */}
            {activeTab === 'services' && (
                <div className="bg-dark-gray rounded-lg shadow flex-1 overflow-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-secondary">
                                <th className="p-4 font-bold text-light-gray sticky top-0 bg-dark-gray">Name</th>
                                <th className="p-4 font-bold text-light-gray sticky top-0 bg-dark-gray">Category</th>
                                <th className="p-4 font-bold text-light-gray sticky top-0 bg-dark-gray">Price</th>
                                <th className="p-4 font-bold text-light-gray sticky top-0 bg-dark-gray">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {db.services.map((service, index) => (
                                <tr key={service.id} className={`border-b border-secondary last:border-b-0 transition-colors duration-200 ${index % 2 !== 0 ? 'bg-field' : 'bg-dark-gray'} hover:bg-secondary`}>
                                    <td className="p-4 text-gray-200">{service.name}</td>
                                    <td className="p-4 text-gray-200">{service.category}</td>
                                    <td className="p-4 text-gray-200">₱{(service.price || 0).toFixed(2)}</td>
                                    <td className="p-4">
                                        <button onClick={() => handleOpenServiceModal(service)} className="font-semibold text-blue-400 hover:text-blue-300 mr-4">Edit</button>
                                        <button onClick={() => handleDeleteService(service.id)} className="font-semibold text-red-400 hover:text-red-300">Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── RENTAL FLEET TAB ── */}
            {activeTab === 'fleet' && (
                <div className="flex-1 overflow-auto">
                    {db.rentalCars.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                            <Car size={48} className="mb-3 opacity-30" />
                            <p className="text-lg font-semibold">No cars in the fleet yet</p>
                            <p className="text-sm">Click "Add Car" to add your first rental vehicle.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {db.rentalCars.map((car: RentalCar) => (
                                <div key={car.id} className="bg-dark-gray rounded-xl overflow-hidden border border-white/5 hover:border-primary/40 transition-all duration-300 group">
                                    <div className="relative">
                                        <img
                                            src={car.imageUrl}
                                            alt={`${car.make} ${car.model}`}
                                            className="w-full h-36 object-cover group-hover:scale-105 transition-transform duration-300"
                                            onError={(e) => { (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/car/400/300'; }}
                                        />
                                        <div className="absolute top-2 right-2">
                                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${car.isAvailable ? 'bg-green-500/90 text-white' : 'bg-red-500/90 text-white'}`}>
                                                {car.isAvailable ? '● Available' : '● Unavailable'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <h3 className="font-bold text-white text-base">{car.year} {car.make} {car.model}</h3>
                                        <p className="text-xs text-gray-400 mt-0.5">{car.type} · {car.seats} seats · {car.transmission}</p>
                                        {car.plateNumber && <p className="text-xs text-gray-500 mt-0.5">Plate: {car.plateNumber}</p>}
                                        <p className="text-primary font-bold text-lg mt-2">₱{(car.pricePerDay || 0).toLocaleString()}<span className="text-xs font-normal text-gray-400">/day</span></p>

                                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
                                            <button
                                                onClick={() => handleToggleCarAvailability(car)}
                                                className={`flex-1 text-xs py-1.5 rounded-lg font-semibold transition-all ${car.isAvailable ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'}`}
                                            >
                                                {car.isAvailable ? <ToggleRight size={14} className="inline mr-1" /> : <ToggleLeft size={14} className="inline mr-1" />}
                                                {car.isAvailable ? 'Available' : 'Unavailable'}
                                            </button>
                                            <button onClick={() => handleOpenCarModal(car)} className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all">
                                                <Edit2 size={14} />
                                            </button>
                                            <button onClick={() => handleDeleteCar(car.id)} className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── HIRE DRIVERS TAB ── */}
            {activeTab === 'drivers' && (
                <div className="flex-1 overflow-auto">
                    {(db.hireDrivers || []).length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                            <UserCheck size={48} className="mb-3 opacity-30" />
                            <p className="text-lg font-semibold">No drivers in the pool yet</p>
                            <p className="text-sm">Click "Add Driver" to add your first hire driver.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {(db.hireDrivers || []).map((driver: HireDriver) => (
                                <div key={driver.id} className="bg-dark-gray rounded-xl overflow-hidden border border-white/5 hover:border-primary/40 transition-all duration-300 group">
                                    <div className="relative">
                                        <div className="w-full h-36 bg-field flex items-center justify-center overflow-hidden">
                                            <img
                                                src={driver.imageUrl}
                                                alt={driver.name}
                                                className="w-24 h-24 rounded-full object-cover border-4 border-primary/30 group-hover:scale-105 transition-transform duration-300"
                                                onError={(e) => { (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/driver/200/200'; }}
                                            />
                                        </div>
                                        <div className="absolute top-2 right-2">
                                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${driver.isAvailable ? 'bg-green-500/90 text-white' : 'bg-gray-500/90 text-white'}`}>
                                                {driver.isAvailable ? '● Available' : '● Not Available'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <h3 className="font-bold text-white text-base">{driver.name}</h3>
                                        <p className="text-xs text-gray-400 mt-0.5">{driver.licenseType} · {driver.experience}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">📍 {driver.geoLimit}</p>
                                        {driver.rating && (
                                            <p className="text-xs text-yellow-400 mt-0.5">⭐ {driver.rating.toFixed(1)} · {driver.totalTrips || 0} trips</p>
                                        )}
                                        <div className="flex gap-2 mt-1">
                                            <p className="text-primary font-bold text-sm">₱{(driver.pricePerHour || 0).toLocaleString()}<span className="text-xs font-normal text-gray-400">/hr</span></p>
                                            <span className="text-gray-600">·</span>
                                            <p className="text-primary font-bold text-sm">₱{(driver.pricePerDay || 0).toLocaleString()}<span className="text-xs font-normal text-gray-400">/day</span></p>
                                        </div>

                                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
                                            <button
                                                onClick={() => handleToggleDriverAvailability(driver)}
                                                className={`flex-1 text-xs py-1.5 rounded-lg font-semibold transition-all ${driver.isAvailable ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' : 'bg-gray-500/10 text-gray-400 hover:bg-gray-500/20'}`}
                                            >
                                                {driver.isAvailable ? <ToggleRight size={14} className="inline mr-1" /> : <ToggleLeft size={14} className="inline mr-1" />}
                                                {driver.isAvailable ? 'Available' : 'Not Available'}
                                            </button>
                                            <button onClick={() => handleOpenDriverModal(driver)} className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all">
                                                <Edit2 size={14} />
                                            </button>
                                            <button onClick={() => handleDeleteDriver(driver.id)} className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── MODALS ── */}
            <Modal title={editingService ? 'Edit Service' : 'Add Service'} isOpen={isServiceModalOpen} onClose={handleCloseServiceModal} compact={true}>
                <ServiceForm service={editingService} onSave={handleSaveService} onCancel={handleCloseServiceModal} />
            </Modal>

            <Modal
                title={
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/15 rounded-xl"><Car size={20} className="text-primary" /></div>
                        <div>
                            <h2 className="text-xl font-black text-white">{editingCar ? 'Edit Car' : 'Add New Car'}</h2>
                            <p className="text-xs text-gray-400 font-normal">Rental Fleet Management</p>
                        </div>
                    </div>
                }
                isOpen={isCarModalOpen}
                onClose={handleCloseCarModal}
                sizeClass="max-w-2xl"
            >
                <RentalCarForm car={editingCar} onSave={handleSaveCar} onCancel={handleCloseCarModal} />
            </Modal>

            <Modal
                title={
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/15 rounded-xl"><UserCheck size={20} className="text-primary" /></div>
                        <div>
                            <h2 className="text-xl font-black text-white">{editingDriver ? 'Edit Driver' : 'Add New Driver'}</h2>
                            <p className="text-xs text-gray-400 font-normal">Hire Driver Pool Management</p>
                        </div>
                    </div>
                }
                isOpen={isDriverModalOpen}
                onClose={handleCloseDriverModal}
                sizeClass="max-w-2xl"
            >
                <HireDriverForm driver={editingDriver} onSave={handleSaveDriver} onCancel={handleCloseDriverModal} />
            </Modal>
        </div>
    );
};

export default AdminServicesScreen;
