import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMechanicAuth } from '../context/MechanicAuthContext';
import { auth, db as firestore } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { storageService } from '../services/StorageService';
import Spinner from '../components/Spinner';
import CustomerHeader from '../components/CustomerHeader';
import { Customer, Mechanic, Vehicle } from '../types';
import { Camera, Plus, Trash2, MapPin, Gauge, Palette, Shield, Info, Car, User, UserCheck } from 'lucide-react';
import { fileToBase64 } from '../utils/fileUtils';

const CompleteProfileScreen: React.FC = () => {
    const navigate = useNavigate();
    const { user: customer } = useAuth();
    const { register: registerMechanic } = useMechanicAuth();
    const [userType, setUserType] = useState<'customer' | 'mechanic' | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    // Form States - Personal Info
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [profilePicFile, setProfilePicFile] = useState<File | null>(null);
    const [profilePicPreview, setProfilePicPreview] = useState('');
    
    // Customer - Vehicle State
    const [vehicle, setVehicle] = useState<Omit<Vehicle, 'id'>>({
        make: '',
        model: '',
        year: new Date().getFullYear(),
        plateNumber: '',
        type: 'Motorcycle',
        isPrimary: true,
        category: 'Sedans',
        subCategory: '',
        color: '',
        mileage: 0,
        imageUrls: []
    });

    const [vehicleImages, setVehicleImages] = useState<File[]>([]);
    const [vehicleImagePreviews, setVehicleImagePreviews] = useState<string[]>([]);

    // Mechanic State
    const [mechanicData, setMechanicData] = useState({
        bio: '',
        specializations: [] as string[],
        address: '',
        birthday: ''
    });
    const [licenseFile, setLicenseFile] = useState<File | null>(null);
    const [idFile, setIdFile] = useState<File | null>(null);

    const predefinedSpecializations = [
        'Engine Repair', 'Brake Systems', 'Electrical Systems', 'Transmission',
        'Air Conditioning', 'Suspension', 'Exhaust Systems', 'Diagnostics',
        'Oil Change', 'Tire Service', 'Battery Service', 'Wheel Alignment',
        'Paint & Body', 'Detailing', 'Welding'
    ];

    const popularVehicles: Record<string, string[]> = {
        'Sedans': ['Toyota Vios', 'Toyota Corolla Altis', 'Honda City', 'Honda Civic'],
        'SUVs': ['Toyota Fortuner', 'Mitsubishi Montero Sport', 'Ford Everest', 'Toyota Land Cruiser'],
        'Vans / MPVs': ['Toyota HiAce', 'Hyundai Staria', 'Toyota Innova', 'Nissan Urvan'],
        'Luxury Vehicles': ['Mercedes-Benz E-Class', 'BMW 5 Series', 'Lexus ES', 'Toyota Alphard'],
        'Pickup Trucks': ['Toyota Hilux', 'Ford Ranger', 'Mitsubishi Triton']
    };

    useEffect(() => {
        const checkUserType = async () => {
            const fbUser = auth.currentUser;
            if (!fbUser) {
                navigate('/login');
                return;
            }

            // Check if already a customer
            const customerDoc = await getDoc(doc(firestore, 'customers', fbUser.uid));
            if (customerDoc.exists()) {
                const data = customerDoc.data() as Customer;
                if (data.phone && data.vehicles && data.vehicles.length > 0) {
                    navigate('/home');
                    return;
                }
                setUserType('customer');
                setPhone(data.phone || '');
                setFullName(data.name || fbUser.displayName || '');
                setAddress(data.address || '');
                setProfilePicPreview(data.picture || fbUser.photoURL || '');
                setLoading(false);
                return;
            }

            // Check if already a mechanic
            const mechanicDoc = await getDoc(doc(firestore, 'mechanics', fbUser.uid));
            if (mechanicDoc.exists()) {
                const data = mechanicDoc.data() as Mechanic;
                if (data.bio && data.specializations && data.specializations.length > 0) {
                    navigate('/mechanic-portal/dashboard');
                    return;
                }
                setUserType('mechanic');
                setPhone(data.phone || '');
                setMechanicData({
                    bio: data.bio || '',
                    specializations: data.specializations || [],
                    address: data.address || '',
                    birthday: data.birthday || ''
                });
                setLoading(false);
                return;
            }

            const hint = sessionStorage.getItem('auth_type_hint');
            if (hint === 'mechanic') {
                setUserType('mechanic');
            } else {
                setUserType('customer');
                setFullName(fbUser.displayName || '');
                setProfilePicPreview(fbUser.photoURL || '');
            }
            setLoading(false);
        };

        checkUserType();
    }, [navigate]);

    const handleProfilePicChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = await fileToBase64(file);
            setProfilePicFile(file);
            setProfilePicPreview(url);
        }
    };

    const handleVehicleImagesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        const remainingSlots = 5 - vehicleImages.length;
        const filesToAdd = files.slice(0, remainingSlots);

        const newFiles = [...vehicleImages, ...filesToAdd];
        setVehicleImages(newFiles);

        const newPreviews = await Promise.all(filesToAdd.map(f => fileToBase64(f as File)));
        setVehicleImagePreviews([...vehicleImagePreviews, ...newPreviews]);
    };

    const handleDeleteVehicleImage = (indexToDelete: number) => {
        setVehicleImages(prev => prev.filter((_, i) => i !== indexToDelete));
        setVehicleImagePreviews(prev => prev.filter((_, i) => i !== indexToDelete));
    };

    const handleSelectPresetModel = (presetName: string) => {
        const [make, ...modelParts] = presetName.split(' ');
        const model = modelParts.join(' ');
        setVehicle(prev => ({
            ...prev,
            make,
            model,
            subCategory: presetName
        }));
    };

    const handleCustomerSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!fullName || !phone || !vehicle.make || !vehicle.model || !vehicle.plateNumber) {
            alert("Please fill in all mandatory fields.");
            return;
        }

        setIsSaving(true);
        try {
            const fbUser = auth.currentUser;
            if (!fbUser) return;

            let pictureUrl = '';
            if (profilePicFile) {
                pictureUrl = await storageService.uploadFile(`customers/profiles/${fbUser.uid}_avatar_${Date.now()}`, profilePicFile);
            } else if (profilePicPreview && !profilePicPreview.startsWith('data:') && !profilePicPreview.startsWith('blob:') && !profilePicPreview.startsWith('file:')) {
                pictureUrl = profilePicPreview;
            } else if (fbUser.photoURL && !fbUser.photoURL.startsWith('blob:') && !fbUser.photoURL.startsWith('file:')) {
                pictureUrl = fbUser.photoURL;
            }

            // Upload vehicle images
            const imageUrls: string[] = [];
            for (let i = 0; i < vehicleImages.length; i++) {
                const file = vehicleImages[i];
                const path = `users/${fbUser.uid}/vehicles/${vehicle.plateNumber.trim().toUpperCase()}/image_${Date.now()}_${i}.jpg`;
                const url = await storageService.uploadFile(path, file);
                imageUrls.push(url);
            }

            const updatedCustomer: Customer = {
                id: fbUser.uid,
                name: fullName,
                email: fbUser.email || '',
                phone: phone,
                address: address,
                vehicles: [{ 
                    ...vehicle, 
                    id: Date.now().toString(),
                    imageUrls: imageUrls,
                    mileage: vehicle.mileage || 0,
                    color: vehicle.color || '',
                    category: vehicle.category || 'Sedans',
                    subCategory: vehicle.subCategory || ''
                }],
                picture: pictureUrl,
                registrationDate: new Date().toISOString(),
                status: 'Active'
            };

            await setDoc(doc(firestore, 'customers', fbUser.uid), updatedCustomer);
            navigate('/home');
        } catch (error) {
            console.error("Error completing customer profile:", error);
            alert("Failed to save profile. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleMechanicSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!phone || !mechanicData.bio || mechanicData.specializations.length === 0 || !licenseFile || !idFile) {
            alert("Please fill in all fields and upload required documents.");
            return;
        }

        setIsSaving(true);
        try {
            const fbUser = auth.currentUser;
            if (!fbUser) return;

            const fullMechanicData = {
                name: fbUser.displayName || 'Mechanic',
                email: fbUser.email || '',
                phone: phone,
                ...mechanicData,
                imageUrl: fbUser.photoURL || 'https://via.placeholder.com/150',
            };

            await registerMechanic(fullMechanicData, licenseFile, idFile);
            navigate('/mechanic-portal/dashboard');
        } catch (error) {
            console.error("Error completing mechanic profile:", error);
            alert("Failed to save profile. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const toggleSpecialization = (spec: string) => {
        setMechanicData(prev => ({
            ...prev,
            specializations: prev.specializations.includes(spec)
                ? prev.specializations.filter(s => s !== spec)
                : [...prev.specializations, spec]
        }));
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
                <Spinner size="lg" color="text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white">
            <CustomerHeader title="Complete Profile" showBack={false} icon={<UserCheck size={22} />} />
            
            <div className="max-w-2xl mx-auto px-6 py-12">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-black tracking-tight mb-4">Almost There!</h1>
                    <p className="text-gray-400">We just need a few more details to set up your {userType} account.</p>
                </div>

                {userType === 'customer' ? (
                    <form onSubmit={handleCustomerSubmit} className="space-y-8 animate-fadeIn">
                        {/* Personal Info */}
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold flex items-center gap-3">
                                <span className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-black">1</span>
                                Personal Information
                            </h2>
                            <div className="bg-[#1C1C1E] border border-white/5 rounded-[2rem] p-6 space-y-6">
                                {/* Profile Picture Selector */}
                                <div className="flex flex-col items-center gap-3 py-2">
                                    <label htmlFor="profilePic" className="relative w-28 h-28 rounded-full bg-black/40 border border-white/10 overflow-hidden cursor-pointer hover:border-primary/50 group transition-all">
                                        {profilePicPreview ? (
                                            <img src={profilePicPreview} alt="Avatar" className="w-full h-full object-cover transition-transform group-hover:scale-105" onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${fullName || 'User'}&background=FE7803&color=fff&size=256`; }} />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 bg-white/5">
                                                <User size={32} />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                            <Camera size={20} className="text-white animate-pulse" />
                                        </div>
                                        <input id="profilePic" name="profilePic" type="file" className="hidden" accept="image/*" onChange={handleProfilePicChange} />
                                    </label>
                                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Tap to upload Profile Photo</span>
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="fullName" className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Full Name</label>
                                    <input 
                                        id="fullName"
                                        name="fullName"
                                        type="text" 
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 outline-none focus:border-primary/50 transition-all font-bold"
                                        placeholder="e.g. John Doe"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label htmlFor="phone" className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Phone Number</label>
                                        <input 
                                            id="phone"
                                            name="phone"
                                            type="tel" 
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 outline-none focus:border-primary/50 transition-all font-bold"
                                            placeholder="+63 9xx xxx xxxx"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="address" className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Complete Address</label>
                                        <div className="relative">
                                            <input 
                                                id="address"
                                                name="address"
                                                type="text" 
                                                value={address}
                                                onChange={(e) => setAddress(e.target.value)}
                                                className="w-full bg-white/5 border border-white/5 rounded-2xl pl-12 pr-6 py-4 outline-none focus:border-primary/50 transition-all font-bold"
                                                placeholder="City, Province, Zip"
                                            />
                                            <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Vehicle Info */}
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold flex items-center gap-3">
                                <span className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-black">2</span>
                                Your Primary Vehicle
                            </h2>
                            <div className="bg-[#1C1C1E] border border-white/5 rounded-[2rem] p-6 space-y-6">
                                {/* Vehicle Category Selector */}
                                <div className="space-y-2">
                                    <label htmlFor="vehicleCategory" className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Vehicle Category</label>
                                    <select 
                                        id="vehicleCategory"
                                        name="vehicleCategory"
                                        value={vehicle.category} 
                                        onChange={(e) => setVehicle({...vehicle, category: e.target.value, make: '', model: '', subCategory: ''})}
                                        className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 outline-none focus:border-primary/50 transition-all font-bold"
                                    >
                                        <option value="Sedans">Sedans</option>
                                        <option value="SUVs">SUVs</option>
                                        <option value="Vans / MPVs">Vans / MPVs</option>
                                        <option value="Luxury Vehicles">Luxury Vehicles</option>
                                        <option value="Pickup Trucks">Pickup Trucks</option>
                                    </select>
                                </div>

                                {/* Popular Presets Chips based on Category */}
                                {vehicle.category && popularVehicles[vehicle.category] && (
                                    <div className="space-y-2">
                                        <span className="text-[9px] font-black text-primary uppercase tracking-widest block ml-2">Popular Models</span>
                                        <div className="flex flex-wrap gap-2">
                                            {popularVehicles[vehicle.category].map(preset => (
                                                <button
                                                    key={preset}
                                                    type="button"
                                                    onClick={() => handleSelectPresetModel(preset)}
                                                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest ${vehicle.subCategory === preset ? 'bg-primary text-black' : 'bg-black/30 text-gray-400 hover:text-white border border-white/5'}`}
                                                >
                                                    {preset}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label htmlFor="vehicleMake" className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Make</label>
                                        <input 
                                            id="vehicleMake"
                                            name="vehicleMake"
                                            type="text" 
                                            value={vehicle.make}
                                            onChange={(e) => setVehicle({...vehicle, make: e.target.value})}
                                            className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 outline-none focus:border-primary/50 transition-all font-bold"
                                            placeholder="e.g. Toyota"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="vehicleModel" className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Model</label>
                                        <input 
                                            id="vehicleModel"
                                            name="vehicleModel"
                                            type="text" 
                                            value={vehicle.model}
                                            onChange={(e) => setVehicle({...vehicle, model: e.target.value})}
                                            className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 outline-none focus:border-primary/50 transition-all font-bold"
                                            placeholder="e.g. Fortuner"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label htmlFor="vehicleYear" className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Year</label>
                                        <input 
                                            id="vehicleYear"
                                            name="vehicleYear"
                                            type="number" 
                                            value={vehicle.year}
                                            onChange={(e) => setVehicle({...vehicle, year: parseInt(e.target.value) || new Date().getFullYear()})}
                                            className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 outline-none focus:border-primary/50 transition-all font-bold"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="vehiclePlateNumber" className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Plate Number</label>
                                        <input 
                                            id="vehiclePlateNumber"
                                            name="vehiclePlateNumber"
                                            type="text" 
                                            value={vehicle.plateNumber}
                                            onChange={(e) => setVehicle({...vehicle, plateNumber: e.target.value})}
                                            className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 outline-none focus:border-primary/50 transition-all font-bold"
                                            placeholder="ABC 1234"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label htmlFor="vehicleColor" className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Color</label>
                                        <div className="relative">
                                            <input 
                                                id="vehicleColor"
                                                name="vehicleColor"
                                                type="text" 
                                                value={vehicle.color}
                                                onChange={(e) => setVehicle({...vehicle, color: e.target.value})}
                                                className="w-full bg-white/5 border border-white/5 rounded-2xl pl-12 pr-6 py-4 outline-none focus:border-primary/50 transition-all font-bold"
                                                placeholder="e.g. Matte Black"
                                            />
                                            <Palette size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="vehicleMileage" className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Mileage (km)</label>
                                        <div className="relative">
                                            <input 
                                                id="vehicleMileage"
                                                name="vehicleMileage"
                                                type="number" 
                                                value={vehicle.mileage || ''}
                                                onChange={(e) => setVehicle({...vehicle, mileage: parseInt(e.target.value) || 0})}
                                                className="w-full bg-white/5 border border-white/5 rounded-2xl pl-12 pr-6 py-4 outline-none focus:border-primary/50 transition-all font-bold"
                                                placeholder="e.g. 5000"
                                            />
                                            <Gauge size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" />
                                        </div>
                                    </div>
                                </div>

                                {/* Vehicle Photos Uploader Grid */}
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Vehicle Photos (Max 5)</label>
                                    
                                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                                        {vehicleImagePreviews.map((preview, idx) => (
                                            <div key={preview} className="aspect-square rounded-2xl border border-white/5 overflow-hidden bg-black/40 relative group">
                                                <img src={preview} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteVehicleImage(idx)}
                                                    className="absolute inset-0 bg-red-600/80 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity duration-200 rounded-2xl"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}

                                        {vehicleImagePreviews.length < 5 && (
                                            <label htmlFor="vehicleImages" className="aspect-square rounded-2xl border border-dashed border-white/10 bg-white/5 hover:border-primary/50 flex flex-col items-center justify-center text-gray-400 hover:text-white cursor-pointer transition-all group active:scale-[0.98]">
                                                <Plus size={20} className="group-hover:scale-110 transition-transform" />
                                                <span className="text-[8px] font-black uppercase tracking-wider mt-1 block">Add Photo</span>
                                                <input id="vehicleImages" name="vehicleImages" type="file" className="hidden" multiple accept="image/*" onChange={handleVehicleImagesChange} />
                                            </label>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button 
                            disabled={isSaving}
                            className="w-full py-5 bg-primary hover:bg-orange-600 rounded-[2rem] font-black text-lg shadow-xl shadow-primary/20 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                        >
                            {isSaving ? <Spinner size="sm" color="text-white" /> : 'Complete Setup'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleMechanicSubmit} className="space-y-8 animate-fadeIn">
                        {/* Basic Info */}
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold flex items-center gap-3">
                                <span className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-black">1</span>
                                Contact & Bio
                            </h2>
                            <div className="bg-[#1C1C1E] border border-white/5 rounded-[2rem] p-6 space-y-4">
                                <div className="space-y-2">
                                    <label htmlFor="mechanicPhone" className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Phone Number</label>
                                    <input 
                                        id="mechanicPhone"
                                        name="mechanicPhone"
                                        type="tel" 
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 outline-none focus:border-primary/50 transition-all font-bold"
                                        placeholder="+63 9xx xxx xxxx"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="mechanicBio" className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Professional Bio</label>
                                    <textarea 
                                        id="mechanicBio"
                                        name="mechanicBio"
                                        value={mechanicData.bio}
                                        onChange={(e) => setMechanicData({...mechanicData, bio: e.target.value})}
                                        rows={4}
                                        className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 outline-none focus:border-primary/50 transition-all font-medium resize-none"
                                        placeholder="Tell us about your experience..."
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Specializations */}
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold flex items-center gap-3">
                                <span className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-black">2</span>
                                Specializations
                            </h2>
                            <div className="bg-[#1C1C1E] border border-white/5 rounded-[2rem] p-6">
                                <div className="flex flex-wrap gap-2">
                                    {predefinedSpecializations.map(spec => (
                                        <button
                                            key={spec}
                                            type="button"
                                            onClick={() => toggleSpecialization(spec)}
                                            className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${mechanicData.specializations.includes(spec) ? 'bg-primary border-primary text-white' : 'bg-white/5 border-white/5 text-gray-400 hover:text-white'}`}
                                        >
                                            {spec}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Documents */}
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold flex items-center gap-3">
                                <span className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-black">3</span>
                                Verification Documents
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <label htmlFor="licenseFile" className="bg-white/5 border border-dashed border-white/10 rounded-[2rem] p-6 text-center cursor-pointer hover:border-primary/50 transition-all group">
                                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    </div>
                                    <span className="text-xs font-black uppercase tracking-widest text-gray-400 block">{licenseFile ? licenseFile.name : 'Business License'}</span>
                                    <input id="licenseFile" name="licenseFile" type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => setLicenseFile(e.target.files?.[0] || null)} />
                                </label>
                                <label htmlFor="idFile" className="bg-white/5 border border-dashed border-white/10 rounded-[2rem] p-6 text-center cursor-pointer hover:border-primary/50 transition-all group">
                                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" /></svg>
                                    </div>
                                    <span className="text-xs font-black uppercase tracking-widest text-gray-400 block">{idFile ? idFile.name : 'Valid ID'}</span>
                                    <input id="idFile" name="idFile" type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => setIdFile(e.target.files?.[0] || null)} />
                                </label>
                            </div>
                        </div>

                        <button 
                            disabled={isSaving}
                            className="w-full py-5 bg-primary hover:bg-orange-600 rounded-[2rem] font-black text-lg shadow-xl shadow-primary/20 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                        >
                            {isSaving ? <Spinner size="sm" color="text-white" /> : 'Submit for Approval'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default CompleteProfileScreen;
