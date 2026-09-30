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
import { Camera, Plus, Trash2, MapPin, Gauge, Palette, Shield, Info, Car, User, UserCheck, Sparkles } from 'lucide-react';
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
        type: 'Car',
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
            // Immediate check of local storage to avoid redundant screen display if already completed
            try {
                const cachedUserStr = localStorage.getItem('ridersbud_customer_user_data');
                if (cachedUserStr) {
                    const cached = JSON.parse(cachedUserStr);
                    if (cached?.profileCompleted || (cached?.phone && cached?.vehicles?.length > 0)) {
                        navigate('/customer-portal/', { replace: true });
                        return;
                    }
                }
            } catch (_) {}

            // Check if current user in useAuth context already has profile completed
            if (customer && (customer.profileCompleted || (customer.phone && customer.vehicles && customer.vehicles.length > 0))) {
                localStorage.setItem(`ridersbud_profile_completed_${customer.id}`, 'true');
                navigate('/customer-portal/', { replace: true });
                return;
            }

            const fbUser = auth.currentUser;
            if (!fbUser) {
                navigate('/login');
                return;
            }

            // Check if explicit completion flag is set for this UID
            if (localStorage.getItem(`ridersbud_profile_completed_${fbUser.uid}`) === 'true') {
                navigate('/customer-portal/', { replace: true });
                return;
            }

            // Check if already a customer
            try {
                const customerDoc = await getDoc(doc(firestore, 'customers', fbUser.uid));
                if (customerDoc.exists()) {
                    const data = customerDoc.data() as Customer;
                    if (data.profileCompleted || (data.phone && data.vehicles && data.vehicles.length > 0)) {
                        localStorage.setItem(`ridersbud_profile_completed_${fbUser.uid}`, 'true');
                        localStorage.setItem('ridersbud_customer_session', 'true');
                        localStorage.setItem('ridersbud_customer_user_data', JSON.stringify({ id: fbUser.uid, ...data }));
                        navigate('/customer-portal/', { replace: true });
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
            } catch (custErr) {
                console.warn("Could not query customers collection:", custErr);
            }

            // Check if already a mechanic
            try {
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
            } catch (mechErr) {
                console.warn("Could not query mechanics collection:", mechErr);
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
    }, [navigate, customer]);

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
                try {
                    pictureUrl = await storageService.uploadFile(`customers/profiles/${fbUser.uid}_avatar_${Date.now()}`, profilePicFile);
                } catch (uploadErr) {
                    console.warn("Avatar upload failed, continuing without custom avatar:", uploadErr);
                }
            } else if (profilePicPreview && !profilePicPreview.startsWith('data:') && !profilePicPreview.startsWith('blob:') && !profilePicPreview.startsWith('file:')) {
                pictureUrl = profilePicPreview;
            } else if (fbUser.photoURL && !fbUser.photoURL.startsWith('blob:') && !fbUser.photoURL.startsWith('file:')) {
                pictureUrl = fbUser.photoURL;
            }

            // Upload vehicle images safely
            const imageUrls: string[] = [];
            for (let i = 0; i < vehicleImages.length; i++) {
                const file = vehicleImages[i];
                try {
                    const path = `users/${fbUser.uid}/vehicles/${vehicle.plateNumber.trim().toUpperCase()}/image_${Date.now()}_${i}.jpg`;
                    const url = await storageService.uploadFile(path, file);
                    imageUrls.push(url);
                } catch (vErr) {
                    console.warn(`Vehicle image ${i} upload failed:`, vErr);
                }
            }

            // Fetch existing customer document to preserve any prior attributes (e.g. notifications, settings)
            let existingData: Partial<Customer> = {};
            try {
                const existingDocSnap = await getDoc(doc(firestore, 'customers', fbUser.uid));
                if (existingDocSnap.exists()) {
                    existingData = existingDocSnap.data() as Partial<Customer>;
                }
            } catch (readErr) {
                console.warn("Could not read prior customer data:", readErr);
            }

            const primaryVehicle: Vehicle = {
                plateNumber: vehicle.plateNumber.trim().toUpperCase(),
                make: vehicle.make.trim(),
                model: vehicle.model.trim(),
                year: Number(vehicle.year) || new Date().getFullYear(),
                type: vehicle.category === 'Sedans' ? 'Sedan' : (vehicle.category === 'SUVs' ? 'SUV' : (vehicle.category === 'Vans / MPVs' ? 'Van' : (vehicle.category === 'Pickup Trucks' ? 'Pickup' : 'Car'))),
                imageUrls: imageUrls,
                mileage: Number(vehicle.mileage) || 0,
                color: (vehicle.color || '').trim(),
                category: vehicle.category || 'Sedans',
                subCategory: vehicle.subCategory || `${vehicle.make.trim()} ${vehicle.model.trim()}`,
                isPrimary: true,
                id: Date.now().toString()
            };

            const updatedCustomer: Customer = {
                id: fbUser.uid,
                name: fullName.trim(),
                email: (fbUser.email || existingData.email || '').trim().toLowerCase(),
                phone: phone.trim(),
                address: (address || existingData.address || '').trim(),
                vehicles: [primaryVehicle],
                picture: pictureUrl || existingData.picture || '',
                registrationDate: existingData.registrationDate || new Date().toISOString(),
                status: 'Active',
                profileCompleted: true,
                profileCompletedAt: new Date().toISOString(),
                ...(existingData.favoriteMechanicIds ? { favoriteMechanicIds: existingData.favoriteMechanicIds } : {}),
                ...(existingData.subscribedMechanicIds ? { subscribedMechanicIds: existingData.subscribedMechanicIds } : {}),
                ...(existingData.notificationSettings ? { notificationSettings: existingData.notificationSettings } : {}),
                ...(existingData.lat ? { lat: existingData.lat } : {}),
                ...(existingData.lng ? { lng: existingData.lng } : {})
            };

            // Remove any undefined keys to avoid Firestore rejection
            const sanitizedCustomer = Object.fromEntries(
                Object.entries(updatedCustomer).filter(([, v]) => v !== undefined)
            );

            // Save to Firestore with merge: true to avoid deleting any concurrent nested fields
            await setDoc(doc(firestore, 'customers', fbUser.uid), sanitizedCustomer, { merge: true });

            // Synchronously sync localStorage customer session cache so App.tsx isProfileIncomplete immediately evaluates to false
            try {
                localStorage.setItem(`ridersbud_profile_completed_${fbUser.uid}`, 'true');
                localStorage.setItem('ridersbud_customer_session', 'true');
                localStorage.setItem('ridersbud_customer_bypass', 'false');
                localStorage.setItem('ridersbud_customer_user_data', JSON.stringify(updatedCustomer));
                localStorage.setItem(`ridersbud_tour_seen_${fbUser.uid}`, 'true');
                localStorage.setItem('ridersbud_tour_seen', 'true');
                window.dispatchEvent(new Event('customerAuthChange'));
            } catch (storageErr) {
                console.warn("Could not sync customer local storage session:", storageErr);
            }

            // Navigate to Customer Portal home with replace to prevent back button from returning to /complete-profile
            navigate('/customer-portal/', { replace: true });
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
        <div className="min-h-screen bg-[#0A0A0A] text-white selection:bg-primary selection:text-black">
            <CustomerHeader title="Complete Profile" showBack={false} icon={<UserCheck size={22} />} />
            
            <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
                {/* Header Welcome Banner */}
                <div className="text-center mb-8 sm:mb-12">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-bold uppercase tracking-wider mb-3">
                        <Sparkles size={13} />
                        <span>Account Setup</span>
                    </div>
                    <h1 className="text-2xl sm:text-4xl font-black tracking-tight mb-2 sm:mb-3">Almost There!</h1>
                    <p className="text-gray-400 text-xs sm:text-sm max-w-md mx-auto">
                        We just need a few more details to set up your {userType === 'mechanic' ? 'specialist service' : 'customer'} profile.
                    </p>
                </div>

                {userType === 'customer' ? (
                    <form onSubmit={handleCustomerSubmit} className="space-y-6 sm:space-y-8 animate-fadeIn">
                        {/* Section 1: Personal Info */}
                        <div className="space-y-3 sm:space-y-4">
                            <div className="flex items-center gap-2.5 px-1">
                                <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center justify-center text-xs font-black">
                                    1
                                </span>
                                <h2 className="text-base sm:text-lg font-black tracking-wide text-white">
                                    Personal Information
                                </h2>
                            </div>

                            <div className="bg-[#141416] sm:bg-[#1C1C1E] border border-white/[0.08] rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 space-y-5 shadow-xl shadow-black/40">
                                {/* Profile Picture Selector */}
                                <div className="flex flex-col items-center gap-2.5 py-1">
                                    <label 
                                        htmlFor="profilePic" 
                                        className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-black/40 border-2 border-white/10 overflow-hidden cursor-pointer hover:border-primary focus-within:ring-2 focus-within:ring-primary/50 group transition-all shadow-inner"
                                    >
                                        {profilePicPreview ? (
                                            <img 
                                                src={profilePicPreview} 
                                                alt="Avatar" 
                                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                                                onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${fullName || 'User'}&background=FE7803&color=fff&size=256`; }} 
                                            />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 bg-white/5">
                                                <User size={30} />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                            <Camera size={20} className="text-white drop-shadow" />
                                        </div>
                                        <input id="profilePic" name="profilePic" type="file" className="hidden" accept="image/*" onChange={handleProfilePicChange} />
                                    </label>
                                    <div className="text-center">
                                        <span className="text-[10px] font-black uppercase text-primary tracking-wider inline-flex items-center gap-1.5 hover:underline cursor-pointer">
                                            <Camera size={12} />
                                            Tap to upload Profile Photo
                                        </span>
                                    </div>
                                </div>

                                {/* Full Name Field */}
                                <div className="space-y-1.5">
                                    <label htmlFor="fullName" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                        <User size={12} className="text-primary" />
                                        Full Name <span className="text-primary">*</span>
                                    </label>
                                    <input 
                                        id="fullName"
                                        name="fullName"
                                        type="text" 
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="w-full bg-white/[0.04] border border-white/10 rounded-xl sm:rounded-2xl px-4 py-3 sm:px-5 sm:py-3.5 text-sm sm:text-base outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-all font-bold placeholder:text-gray-600"
                                        placeholder="e.g. Juan Dela Cruz"
                                        required
                                    />
                                </div>

                                {/* Phone & Address Responsive Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label htmlFor="phone" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                            <span>Phone Number</span> <span className="text-primary">*</span>
                                        </label>
                                        <input 
                                            id="phone"
                                            name="phone"
                                            type="tel" 
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            className="w-full bg-white/[0.04] border border-white/10 rounded-xl sm:rounded-2xl px-4 py-3 sm:px-5 sm:py-3.5 text-sm sm:text-base outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-all font-bold placeholder:text-gray-600"
                                            placeholder="+63 9xx xxx xxxx"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label htmlFor="address" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                            <MapPin size={12} className="text-primary" />
                                            <span>Complete Address</span>
                                        </label>
                                        <div className="relative">
                                            <input 
                                                id="address"
                                                name="address"
                                                type="text" 
                                                value={address}
                                                onChange={(e) => setAddress(e.target.value)}
                                                className="w-full bg-white/[0.04] border border-white/10 rounded-xl sm:rounded-2xl pl-10 pr-4 py-3 sm:pl-11 sm:pr-5 sm:py-3.5 text-sm sm:text-base outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-all font-bold placeholder:text-gray-600"
                                                placeholder="Street, City, Province"
                                            />
                                            <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Vehicle Info */}
                        <div className="space-y-3 sm:space-y-4">
                            <div className="flex items-center gap-2.5 px-1">
                                <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center justify-center text-xs font-black">
                                    2
                                </span>
                                <h2 className="text-base sm:text-lg font-black tracking-wide text-white flex items-center gap-2">
                                    <span>Your Primary Vehicle</span>
                                    <Car size={16} className="text-primary" />
                                </h2>
                            </div>

                            <div className="bg-[#141416] sm:bg-[#1C1C1E] border border-white/[0.08] rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 space-y-5 shadow-xl shadow-black/40">
                                {/* Vehicle Category Selector */}
                                <div className="space-y-1.5">
                                    <label htmlFor="vehicleCategory" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                                        Vehicle Category
                                    </label>
                                    <div className="relative">
                                        <select 
                                            id="vehicleCategory"
                                            name="vehicleCategory"
                                            value={vehicle.category} 
                                            onChange={(e) => setVehicle({...vehicle, category: e.target.value, make: '', model: '', subCategory: ''})}
                                            className="w-full appearance-none bg-white/[0.04] border border-white/10 rounded-xl sm:rounded-2xl px-4 py-3 sm:px-5 sm:py-3.5 text-sm sm:text-base outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-all font-bold pr-10 cursor-pointer text-white"
                                        >
                                            <option value="Sedans" className="bg-[#1C1C1E] text-white">Sedans</option>
                                            <option value="SUVs" className="bg-[#1C1C1E] text-white">SUVs</option>
                                            <option value="Vans / MPVs" className="bg-[#1C1C1E] text-white">Vans / MPVs</option>
                                            <option value="Luxury Vehicles" className="bg-[#1C1C1E] text-white">Luxury Vehicles</option>
                                            <option value="Pickup Trucks" className="bg-[#1C1C1E] text-white">Pickup Trucks</option>
                                        </select>
                                        <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                                            <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                                                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/>
                                            </svg>
                                        </div>
                                    </div>
                                </div>

                                {/* Popular Presets Chips based on Category */}
                                {vehicle.category && popularVehicles[vehicle.category] && (
                                    <div className="space-y-2 pt-1">
                                        <span className="text-[9px] font-black text-primary uppercase tracking-widest block ml-1">
                                            Popular Models Quick Select
                                        </span>
                                        <div className="flex flex-wrap gap-2">
                                            {popularVehicles[vehicle.category].map(preset => {
                                                const isSelected = vehicle.subCategory === preset || (vehicle.make && vehicle.model && `${vehicle.make} ${vehicle.model}`.toLowerCase() === preset.toLowerCase());
                                                return (
                                                    <button
                                                        key={preset}
                                                        type="button"
                                                        onClick={() => handleSelectPresetModel(preset)}
                                                        className={`px-3 py-2 rounded-xl text-[10px] sm:text-[11px] font-black transition-all uppercase tracking-wider active:scale-95 ${
                                                            isSelected 
                                                                ? 'bg-primary text-black shadow-md shadow-primary/20 scale-[1.02]' 
                                                                : 'bg-white/[0.04] text-gray-300 hover:text-white border border-white/10 hover:border-white/20'
                                                        }`}
                                                    >
                                                        {preset}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Make & Model */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                    <div className="space-y-1.5">
                                        <label htmlFor="vehicleMake" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                                            Make <span className="text-primary">*</span>
                                        </label>
                                        <input 
                                            id="vehicleMake"
                                            name="vehicleMake"
                                            type="text" 
                                            value={vehicle.make}
                                            onChange={(e) => setVehicle({...vehicle, make: e.target.value})}
                                            className="w-full bg-white/[0.04] border border-white/10 rounded-xl sm:rounded-2xl px-4 py-3 sm:px-5 sm:py-3.5 text-sm sm:text-base outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-all font-bold placeholder:text-gray-600"
                                            placeholder="e.g. Toyota"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label htmlFor="vehicleModel" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                                            Model <span className="text-primary">*</span>
                                        </label>
                                        <input 
                                            id="vehicleModel"
                                            name="vehicleModel"
                                            type="text" 
                                            value={vehicle.model}
                                            onChange={(e) => setVehicle({...vehicle, model: e.target.value})}
                                            className="w-full bg-white/[0.04] border border-white/10 rounded-xl sm:rounded-2xl px-4 py-3 sm:px-5 sm:py-3.5 text-sm sm:text-base outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-all font-bold placeholder:text-gray-600"
                                            placeholder="e.g. Fortuner"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Year & Plate Number */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                    <div className="space-y-1.5">
                                        <label htmlFor="vehicleYear" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                                            Year <span className="text-primary">*</span>
                                        </label>
                                        <input 
                                            id="vehicleYear"
                                            name="vehicleYear"
                                            type="number" 
                                            value={vehicle.year}
                                            onChange={(e) => setVehicle({...vehicle, year: parseInt(e.target.value) || new Date().getFullYear()})}
                                            className="w-full bg-white/[0.04] border border-white/10 rounded-xl sm:rounded-2xl px-4 py-3 sm:px-5 sm:py-3.5 text-sm sm:text-base outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-all font-bold placeholder:text-gray-600"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label htmlFor="vehiclePlateNumber" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                                            Plate Number <span className="text-primary">*</span>
                                        </label>
                                        <input 
                                            id="vehiclePlateNumber"
                                            name="vehiclePlateNumber"
                                            type="text" 
                                            value={vehicle.plateNumber}
                                            onChange={(e) => setVehicle({...vehicle, plateNumber: e.target.value.toUpperCase()})}
                                            className="w-full bg-white/[0.04] border border-white/10 rounded-xl sm:rounded-2xl px-4 py-3 sm:px-5 sm:py-3.5 text-sm sm:text-base outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-all font-bold uppercase tracking-wider placeholder:text-gray-600"
                                            placeholder="ABC 1234"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Color & Mileage */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                    <div className="space-y-1.5">
                                        <label htmlFor="vehicleColor" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                            <Palette size={12} className="text-primary" />
                                            <span>Color</span>
                                        </label>
                                        <div className="relative">
                                            <input 
                                                id="vehicleColor"
                                                name="vehicleColor"
                                                type="text" 
                                                value={vehicle.color}
                                                onChange={(e) => setVehicle({...vehicle, color: e.target.value})}
                                                className="w-full bg-white/[0.04] border border-white/10 rounded-xl sm:rounded-2xl pl-10 pr-4 py-3 sm:pl-11 sm:pr-5 sm:py-3.5 text-sm sm:text-base outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-all font-bold placeholder:text-gray-600"
                                                placeholder="e.g. Matte Black"
                                            />
                                            <Palette size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary" />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label htmlFor="vehicleMileage" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                            <Gauge size={12} className="text-primary" />
                                            <span>Mileage (km)</span>
                                        </label>
                                        <div className="relative">
                                            <input 
                                                id="vehicleMileage"
                                                name="vehicleMileage"
                                                type="number" 
                                                value={vehicle.mileage || ''}
                                                onChange={(e) => setVehicle({...vehicle, mileage: parseInt(e.target.value) || 0})}
                                                className="w-full bg-white/[0.04] border border-white/10 rounded-xl sm:rounded-2xl pl-10 pr-4 py-3 sm:pl-11 sm:pr-5 sm:py-3.5 text-sm sm:text-base outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-all font-bold placeholder:text-gray-600"
                                                placeholder="e.g. 5000"
                                            />
                                            <Gauge size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary" />
                                        </div>
                                    </div>
                                </div>

                                {/* Vehicle Photos Uploader Grid */}
                                <div className="space-y-2.5 pt-1">
                                    <div className="flex items-center justify-between ml-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            Vehicle Photos
                                        </label>
                                        <span className="text-[10px] font-bold text-gray-500">
                                            {vehicleImagePreviews.length}/5 photos
                                        </span>
                                    </div>
                                    
                                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5 sm:gap-3">
                                        {vehicleImagePreviews.map((preview, idx) => (
                                            <div key={preview} className="aspect-square rounded-xl sm:rounded-2xl border border-white/10 overflow-hidden bg-black/40 relative group shadow-sm">
                                                <img src={preview} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteVehicleImage(idx)}
                                                    className="absolute inset-0 bg-red-600/80 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity duration-200 rounded-xl sm:rounded-2xl"
                                                    title="Delete photo"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        ))}

                                        {vehicleImagePreviews.length < 5 && (
                                            <label 
                                                htmlFor="vehicleImages" 
                                                className="aspect-square rounded-xl sm:rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.02] hover:border-primary/50 hover:bg-white/[0.04] flex flex-col items-center justify-center text-gray-400 hover:text-white cursor-pointer transition-all group active:scale-[0.97]"
                                            >
                                                <Plus size={20} className="group-hover:scale-110 text-primary transition-transform" />
                                                <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider mt-1 block">Add Photo</span>
                                                <input id="vehicleImages" name="vehicleImages" type="file" className="hidden" multiple accept="image/*" onChange={handleVehicleImagesChange} />
                                            </label>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Submit Action */}
                        <div className="pt-2">
                            <button 
                                type="submit"
                                disabled={isSaving}
                                className="w-full min-h-[52px] sm:min-h-[56px] py-4 sm:py-4.5 bg-primary hover:bg-orange-600 rounded-2xl sm:rounded-[2rem] font-black text-sm sm:text-base uppercase tracking-widest shadow-xl shadow-primary/25 transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50 text-white"
                            >
                                {isSaving ? <Spinner size="sm" color="text-white" /> : 'Complete Setup'}
                            </button>
                        </div>
                    </form>
                ) : (
                    <form onSubmit={handleMechanicSubmit} className="space-y-6 sm:space-y-8 animate-fadeIn">
                        {/* Section 1: Basic Info */}
                        <div className="space-y-3 sm:space-y-4">
                            <div className="flex items-center gap-2.5 px-1">
                                <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center justify-center text-xs font-black">
                                    1
                                </span>
                                <h2 className="text-base sm:text-lg font-black tracking-wide text-white">
                                    Contact & Bio
                                </h2>
                            </div>

                            <div className="bg-[#141416] sm:bg-[#1C1C1E] border border-white/[0.08] rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 space-y-4 shadow-xl shadow-black/40">
                                <div className="space-y-1.5">
                                    <label htmlFor="mechanicPhone" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                                        Phone Number <span className="text-primary">*</span>
                                    </label>
                                    <input 
                                        id="mechanicPhone"
                                        name="mechanicPhone"
                                        type="tel" 
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className="w-full bg-white/[0.04] border border-white/10 rounded-xl sm:rounded-2xl px-4 py-3 sm:px-5 sm:py-3.5 text-sm sm:text-base outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-all font-bold placeholder:text-gray-600"
                                        placeholder="+63 9xx xxx xxxx"
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label htmlFor="mechanicBio" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                                        Professional Bio <span className="text-primary">*</span>
                                    </label>
                                    <textarea 
                                        id="mechanicBio"
                                        name="mechanicBio"
                                        value={mechanicData.bio}
                                        onChange={(e) => setMechanicData({...mechanicData, bio: e.target.value})}
                                        rows={4}
                                        className="w-full bg-white/[0.04] border border-white/10 rounded-xl sm:rounded-2xl px-4 py-3 sm:px-5 sm:py-3.5 text-sm sm:text-base outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-all font-medium resize-none placeholder:text-gray-600"
                                        placeholder="Tell us about your experience..."
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Specializations */}
                        <div className="space-y-3 sm:space-y-4">
                            <div className="flex items-center gap-2.5 px-1">
                                <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center justify-center text-xs font-black">
                                    2
                                </span>
                                <h2 className="text-base sm:text-lg font-black tracking-wide text-white">
                                    Specializations
                                </h2>
                            </div>

                            <div className="bg-[#141416] sm:bg-[#1C1C1E] border border-white/[0.08] rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 shadow-xl shadow-black/40">
                                <div className="flex flex-wrap gap-2">
                                    {predefinedSpecializations.map(spec => (
                                        <button
                                            key={spec}
                                            type="button"
                                            onClick={() => toggleSpecialization(spec)}
                                            className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                                                mechanicData.specializations.includes(spec) 
                                                    ? 'bg-primary border-primary text-white shadow-sm shadow-primary/20' 
                                                    : 'bg-white/[0.04] border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                                            }`}
                                        >
                                            {spec}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Section 3: Documents */}
                        <div className="space-y-3 sm:space-y-4">
                            <div className="flex items-center gap-2.5 px-1">
                                <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center justify-center text-xs font-black">
                                    3
                                </span>
                                <h2 className="text-base sm:text-lg font-black tracking-wide text-white">
                                    Verification Documents
                                </h2>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                <label htmlFor="licenseFile" className="bg-[#141416] sm:bg-[#1C1C1E] border-2 border-dashed border-white/10 rounded-2xl sm:rounded-[2rem] p-5 sm:p-6 text-center cursor-pointer hover:border-primary/50 transition-all group shadow-md shadow-black/30">
                                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-2.5 sm:mb-3 group-hover:scale-105 transition-transform">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    </div>
                                    <span className="text-[11px] sm:text-xs font-black uppercase tracking-widest text-gray-300 block truncate">{licenseFile ? licenseFile.name : 'Business License'}</span>
                                    <span className="text-[9px] text-gray-500 font-medium mt-1 block">Tap to upload PDF or image</span>
                                    <input id="licenseFile" name="licenseFile" type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => setLicenseFile(e.target.files?.[0] || null)} />
                                </label>
                                
                                <label htmlFor="idFile" className="bg-[#141416] sm:bg-[#1C1C1E] border-2 border-dashed border-white/10 rounded-2xl sm:rounded-[2rem] p-5 sm:p-6 text-center cursor-pointer hover:border-primary/50 transition-all group shadow-md shadow-black/30">
                                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-2.5 sm:mb-3 group-hover:scale-105 transition-transform">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" /></svg>
                                    </div>
                                    <span className="text-[11px] sm:text-xs font-black uppercase tracking-widest text-gray-300 block truncate">{idFile ? idFile.name : 'Valid ID'}</span>
                                    <span className="text-[9px] text-gray-500 font-medium mt-1 block">Tap to upload PDF or image</span>
                                    <input id="idFile" name="idFile" type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => setIdFile(e.target.files?.[0] || null)} />
                                </label>
                            </div>
                        </div>

                        {/* Submit Action */}
                        <div className="pt-2">
                            <button 
                                type="submit"
                                disabled={isSaving}
                                className="w-full min-h-[52px] sm:min-h-[56px] py-4 sm:py-4.5 bg-primary hover:bg-orange-600 rounded-2xl sm:rounded-[2rem] font-black text-sm sm:text-base uppercase tracking-widest shadow-xl shadow-primary/25 transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50 text-white"
                            >
                                {isSaving ? <Spinner size="sm" color="text-white" /> : 'Submit for Approval'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default CompleteProfileScreen;
