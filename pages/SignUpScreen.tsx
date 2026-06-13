import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Spinner from '../components/Spinner';
import { useDatabase } from '../context/DatabaseContext';
import { useMechanicAuth } from '../context/MechanicAuthContext';
import { Wrench, Shield, Smartphone, Mail, Lock, User, MapPin, Upload, FileText, CheckCircle2, ArrowRight, ArrowLeft, Phone, Car, Eye, EyeOff, Image as ImageIcon } from 'lucide-react';


const SignUpScreen: React.FC = () => {
    const { register: registerCustomer, loginWithGoogle, loginWithFacebook, loading: authLoading } = useAuth();
    const { register: registerMechanic, loading: mechanicAuthLoading } = useMechanicAuth();
    const navigate = useNavigate();
    const { db } = useDatabase();

    const [userType, setUserType] = useState<'customer' | 'mechanic'>('customer');
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Customer Form State
    const [customerData, setCustomerData] = useState({ 
        name: '', 
        email: '', 
        phone: '', 
        password: '', 
        confirmPassword: '' 
    });
    const [vehicleData, setVehicleData] = useState({
        plateNumber: '',
        make: '',
        model: '',
        year: new Date().getFullYear(),
    });
    const [customerErrors, setCustomerErrors] = useState<{ [key: string]: string }>({});

    // Mechanic Form State
    const [mechanicData, setMechanicData] = useState({ 
        name: '', 
        email: '', 
        phone: '', 
        password: '', 
        confirmPassword: '',
        bio: '',
        specializations: [] as string[],
        documents: {
            nbi: '',
            license: '',
            certificate: ''
        }
    });
    const [mechanicErrors, setMechanicErrors] = useState<{ [key: string]: string }>({});
    const [rawFiles, setRawFiles] = useState<{ [key: string]: File }>({});
    const [isMechanicSuccess, setIsMechanicSuccess] = useState(false);

    if (!db) {
        return <div className="flex items-center justify-center h-screen bg-gradient-to-br from-[#0A0A0A] via-[#121212] to-[#1A1A1A]"><Spinner size="lg" /></div>;
    }

    const { settings } = db;
    const logoUrl = settings.authLogoUrl || "/riders-logo.png";

    // Validation
    const validateCustomerField = (fieldName: string, value: any) => {
        let fieldError = '';
        switch (fieldName) {
            case 'name': if (!value) fieldError = 'Full name is required.'; break;
            case 'email':
                if (!value) fieldError = 'Email is required.';
                else if (!/\S+@\S+\.\S+/.test(value)) fieldError = 'Please enter a valid email address.';
                break;
            case 'phone':
                if (!value) fieldError = 'Phone number is required.';
                else if (!/^\d{10,15}$/.test(value.replace(/\D/g, ''))) fieldError = 'Please enter a valid phone number (10-15 digits).';
                break;
            case 'password':
                if (!value) fieldError = 'Password is required.';
                else if (value.length < 6) fieldError = 'Password must be at least 6 characters.';
                break;
            case 'confirmPassword':
                if (value !== customerData.password) fieldError = 'Passwords do not match.';
                break;
            case 'plateNumber': if (!value) fieldError = 'Plate number is required.'; break;
            case 'make': if (!value) fieldError = 'Brand/Make is required.'; break;
            case 'model': if (!value) fieldError = 'Model is required.'; break;
            case 'year': if (!value) fieldError = 'Year is required.'; break;
        }
        return fieldError;
    };

    const validateMechanicField = (fieldName: string, value: any) => {
        let fieldError = '';
        switch (fieldName) {
            case 'name': if (!value) fieldError = 'Full name is required.'; break;
            case 'email':
                if (!value) fieldError = 'Email is required.';
                else if (!/\S+@\S+\.\S+/.test(value)) fieldError = 'Please enter a valid email address.';
                break;
            case 'phone':
                if (!value) fieldError = 'Phone number is required.';
                else if (!/^\d{10,15}$/.test(value.replace(/\D/g, ''))) fieldError = 'Please enter a valid phone number (10-15 digits).';
                break;
            case 'password':
                if (!value) fieldError = 'Password is required.';
                else if (value.length < 6) fieldError = 'Password must be at least 6 characters.';
                break;
            case 'confirmPassword':
                if (value !== mechanicData.password) fieldError = 'Passwords do not match.';
                break;
            case 'bio': if (!value) fieldError = 'Bio is required.'; break;
            case 'specializations': if (!value || value.length === 0) fieldError = 'Select at least one specialization.'; break;
            case 'license': if (!value) fieldError = 'Driver\'s License is mandatory.'; break;
        }
        return fieldError;
    };

    const handleCustomerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setCustomerData(prev => ({ ...prev, [name]: value }));
    };

    const handleVehicleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setVehicleData(prev => ({ ...prev, [name]: value }));
    };

    const handleMechanicChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setMechanicData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'nbi' | 'license' | 'certificate') => {
        const file = e.target.files?.[0];
        if (file) {
            setRawFiles(prev => ({ ...prev, [field]: file }));
            // We just store a flag in documents for UI feedback
            setMechanicData(prev => ({
                ...prev,
                documents: { ...prev.documents, [field]: true }
            }));
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

    const commonSpecializations = [
        'Engine Repair', 'Electrical Systems', 'Suspension', 'Brakes',
        'Tire Service', 'Oil & Maintenance', 'Body Work', 'Customization',
        'Transmission', 'Fuel System'
    ];

    const handleCustomerSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        if (step === 1) {
            const nameError = validateCustomerField('name', customerData.name);
            const emailError = validateCustomerField('email', customerData.email);
            const phoneError = validateCustomerField('phone', customerData.phone);
            const passwordError = validateCustomerField('password', customerData.password);
            const confirmError = validateCustomerField('confirmPassword', customerData.confirmPassword);

            const allErrors = { name: nameError, email: emailError, phone: phoneError, password: passwordError, confirmPassword: confirmError };
            setCustomerErrors(allErrors);

            if (Object.values(allErrors).some(Boolean)) return;
            setStep(2);
            return;
        }

        // Step 2: Vehicle Info
        const plateError = validateCustomerField('plateNumber', vehicleData.plateNumber);
        const makeError = validateCustomerField('make', vehicleData.make);
        const modelError = validateCustomerField('model', vehicleData.model);
        const yearError = validateCustomerField('year', vehicleData.year);

        const allErrors = { plateNumber: plateError, make: makeError, model: modelError, year: yearError };
        setCustomerErrors(prev => ({ ...prev, ...allErrors }));

        if (Object.values(allErrors).some(Boolean)) return;

        setIsLoading(true);
        try {
            await registerCustomer({
                name: customerData.name,
                email: customerData.email,
                phone: customerData.phone,
                password: customerData.password,
                vehicle: vehicleData
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleMechanicSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (step === 1) {
            const nameError = validateMechanicField('name', mechanicData.name);
            const emailError = validateMechanicField('email', mechanicData.email);
            const phoneError = validateMechanicField('phone', mechanicData.phone);
            const passwordError = validateMechanicField('password', mechanicData.password);
            const confirmError = validateMechanicField('confirmPassword', mechanicData.confirmPassword);

            const allErrors = { name: nameError, email: emailError, phone: phoneError, password: passwordError, confirmPassword: confirmError };
            setMechanicErrors(allErrors);

            if (Object.values(allErrors).some(Boolean)) return;
            setStep(2);
            return;
        }

        // Step 2: Bio, Specializations, and Documents
        const bioError = validateMechanicField('bio', mechanicData.bio);
        const specError = validateMechanicField('specializations', mechanicData.specializations);
        const licenseError = validateMechanicField('license', mechanicData.documents.license);

        const allErrors = { bio: bioError, specializations: specError, license: licenseError };
        setMechanicErrors(prev => ({ ...prev, ...allErrors }));

        if (Object.values(allErrors).some(Boolean)) return;

        setIsLoading(true);
        try {
            await registerMechanic(
                {
                    name: mechanicData.name,
                    email: mechanicData.email,
                    phone: mechanicData.phone,
                    password: mechanicData.password,
                    bio: mechanicData.bio,
                    specializations: mechanicData.specializations,
                    isOnline: false,
                    lat: 0,
                    lng: 0,
                },
                rawFiles['license'],
                rawFiles['nbi'] || rawFiles['certificate']
            );
            setIsMechanicSuccess(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setError('');
        setIsLoading(true);
        try {
            await loginWithGoogle();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleFacebookLogin = async () => {
        setError('');
        setIsLoading(true);
        try {
            await loginWithFacebook();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    const anyLoading = isLoading;

    return (
        <div className="flex-1 w-full flex flex-col items-center justify-center bg-gradient-to-br from-[#0A0A0A] via-[#121212] to-[#1A1A1A] p-6 relative overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
            </div>

            <div className="w-full max-w-md relative z-10 py-6">
                {/* Logo & Header */}
                <div className="text-center mb-8 animate-fadeIn">
                    {logoUrl ? (
                        <img src={logoUrl} alt="Riders Logo" className="w-48 mb-6 max-h-24 object-contain mx-auto mix-blend-screen" />
                    ) : (
                        <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-orange-600 bg-clip-text text-transparent mb-4">{settings.appName}</h1>
                    )}
                    <p className="text-gray-400 text-lg">{settings.appTagline}</p>
                </div>

                {/* Tab Switcher */}
                <div className="bg-[#1A1A1A]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-1.5 mb-6 flex gap-1 animate-slideUp">
                    <button
                        onClick={() => {
                            setUserType('customer');
                            setStep(1);
                        }}
                        className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${userType === 'customer'
                            ? 'bg-gradient-to-r from-primary to-orange-600 text-white shadow-lg shadow-primary/20'
                            : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        <User className="w-4 h-4" />
                        I'm a Customer
                    </button>
                    <button
                        onClick={() => {
                            setUserType('mechanic');
                            setStep(1);
                        }}
                        className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${userType === 'mechanic'
                            ? 'bg-gradient-to-r from-primary to-orange-600 text-white shadow-lg shadow-primary/20'
                            : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        <Wrench className="w-4 h-4" />
                        I'm a Mechanic
                    </button>
                </div>

                {/* Sign Up Card */}
                <div className="bg-[#1A1A1A]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl animate-slideUp">
                    {isMechanicSuccess ? (
                        <div className="text-center space-y-6 animate-fadeIn">
                            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto border border-green-500/30">
                                <CheckCircle2 className="w-10 h-10 text-green-500" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-3">Registration Received!</h2>
                                <p className="text-gray-400 text-sm leading-relaxed">
                                    Your account has been created and is now pending <strong>Admin Approval</strong>.
                                    Once our team verifies your application and submitted documents, you will be able to go online
                                    and access all professional features.
                                </p>
                            </div>
                            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-left">
                                <p className="text-xs text-primary font-bold  tracking-widest mb-1">Next Step</p>
                                <p className="text-xs text-gray-500 font-medium">Please log in to your new account to complete your profile and upload necessary identification documents.</p>
                            </div>
                            <button
                                onClick={() => navigate('/', {
                                    state: {
                                        from: 'mechanic',
                                        email: mechanicData.email,
                                        password: mechanicData.password
                                    }
                                })}
                                className="w-full bg-gradient-to-r from-primary to-orange-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                <Lock className="w-4 h-4" />
                                <span>Login Your Credentials</span>
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        error && (
                            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg animate-shake">
                                <p className="text-red-400 text-sm text-center">{error}</p>
                            </div>
                        )
                    )}

                    {!isMechanicSuccess && (
                        userType === 'customer' ? (
                            <form onSubmit={handleCustomerSignUp} noValidate className="space-y-4">
                                {step === 1 ? (
                                    <div className="space-y-4 animate-fadeIn">
                                        {/* Name */}
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-300">Full Name</label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                    <User className="w-5 h-5 text-gray-500 group-focus-within:text-primary transition-colors" />
                                                </div>
                                                <input
                                                    type="text"
                                                    name="name"
                                                    placeholder="John Doe"
                                                    value={customerData.name}
                                                    onChange={handleCustomerChange}
                                                    className={`w-full pl-12 pr-4 py-3.5 bg-[#0A0A0A]/50 border rounded-xl text-white placeholder-gray-500 outline-none transition-all focus:border-white/20 ${customerErrors.name ? 'border-red-500' : 'border-white/10'}`}
                                                />
                                            </div>
                                            {customerErrors.name && <p className="text-red-400 text-xs animate-shake">{customerErrors.name}</p>}
                                        </div>

                                        {/* Email */}
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-300">Email</label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                    <Mail className="w-5 h-5 text-gray-500 group-focus-within:text-primary transition-colors" />
                                                </div>
                                                <input
                                                    type="email"
                                                    name="email"
                                                    placeholder="you@example.com"
                                                    value={customerData.email}
                                                    onChange={handleCustomerChange}
                                                    className={`w-full pl-12 pr-4 py-3.5 bg-[#0A0A0A]/50 border rounded-xl text-white placeholder-gray-500 outline-none transition-all focus:border-white/20 ${customerErrors.email ? 'border-red-500' : 'border-white/10'}`}
                                                />
                                            </div>
                                            {customerErrors.email && <p className="text-red-400 text-xs animate-shake">{customerErrors.email}</p>}
                                        </div>

                                        {/* Phone */}
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-300">Phone Number</label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                    <Phone className="w-5 h-5 text-gray-500 group-focus-within:text-primary transition-colors" />
                                                </div>
                                                <input
                                                    type="tel"
                                                    name="phone"
                                                    placeholder="+1 (555) 000-0000"
                                                    value={customerData.phone}
                                                    onChange={handleCustomerChange}
                                                    className={`w-full pl-12 pr-4 py-3.5 bg-[#0A0A0A]/50 border rounded-xl text-white placeholder-gray-500 outline-none transition-all focus:border-white/20 ${customerErrors.phone ? 'border-red-500' : 'border-white/10'}`}
                                                />
                                            </div>
                                            {customerErrors.phone && <p className="text-red-400 text-xs animate-shake">{customerErrors.phone}</p>}
                                        </div>

                                        {/* Password */}
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-300">Password</label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                    <Lock className="w-5 h-5 text-gray-500 group-focus-within:text-primary transition-colors" />
                                                </div>
                                                <input
                                                    type={showPassword ? "text" : "password"}
                                                    name="password"
                                                    placeholder="••••••••"
                                                    value={customerData.password}
                                                    onChange={handleCustomerChange}
                                                    className={`w-full pl-12 pr-12 py-3.5 bg-[#0A0A0A]/50 border rounded-xl text-white placeholder-gray-500 outline-none transition-all focus:border-white/20 ${customerErrors.password ? 'border-red-500' : 'border-white/10'}`}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-primary transition-colors"
                                                >
                                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                                </button>
                                            </div>
                                            {customerErrors.password && <p className="text-red-400 text-xs animate-shake">{customerErrors.password}</p>}
                                        </div>

                                        {/* Confirm Password */}
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-300">Confirm Password</label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                    <CheckCircle2 className="w-5 h-5 text-gray-500 group-focus-within:text-primary transition-colors" />
                                                </div>
                                                <input
                                                    type={showConfirmPassword ? "text" : "password"}
                                                    name="confirmPassword"
                                                    placeholder="••••••••"
                                                    value={customerData.confirmPassword}
                                                    onChange={handleCustomerChange}
                                                    className={`w-full pl-12 pr-12 py-3.5 bg-[#0A0A0A]/50 border rounded-xl text-white placeholder-gray-500 outline-none transition-all focus:border-white/20 ${customerErrors.confirmPassword ? 'border-red-500' : 'border-white/10'}`}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-primary transition-colors"
                                                >
                                                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                                </button>
                                            </div>
                                            {customerErrors.confirmPassword && <p className="text-red-400 text-xs animate-shake">{customerErrors.confirmPassword}</p>}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4 animate-fadeIn">
                                        <div className="flex items-center gap-2 mb-4 text-primary">
                                            <Car className="w-5 h-5" />
                                            <h3 className="font-bold">Vehicle Details (Mandatory)</h3>
                                        </div>

                                        {/* Plate Number */}
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-300">Plate Number</label>
                                            <input
                                                type="text"
                                                name="plateNumber"
                                                placeholder="ABC-1234"
                                                value={vehicleData.plateNumber}
                                                onChange={handleVehicleChange}
                                                className={`w-full px-4 py-3.5 bg-[#0A0A0A]/50 border rounded-xl text-white placeholder-gray-500 outline-none transition-all focus:border-white/20 ${customerErrors.plateNumber ? 'border-red-500' : 'border-white/10'}`}
                                            />
                                            {customerErrors.plateNumber && <p className="text-red-400 text-xs animate-shake">{customerErrors.plateNumber}</p>}
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            {/* Make */}
                                            <div className="space-y-2">
                                                <label className="block text-sm font-medium text-gray-300">Brand / Make</label>
                                                <input
                                                    type="text"
                                                    name="make"
                                                    placeholder="Honda"
                                                    value={vehicleData.make}
                                                    onChange={handleVehicleChange}
                                                    className={`w-full px-4 py-3.5 bg-[#0A0A0A]/50 border rounded-xl text-white placeholder-gray-500 outline-none transition-all focus:border-white/20 ${customerErrors.make ? 'border-red-500' : 'border-white/10'}`}
                                                />
                                                {customerErrors.make && <p className="text-red-400 text-xs animate-shake">{customerErrors.make}</p>}
                                            </div>

                                            {/* Model */}
                                            <div className="space-y-2">
                                                <label className="block text-sm font-medium text-gray-300">Model</label>
                                                <input
                                                    type="text"
                                                    name="model"
                                                    placeholder="Civic"
                                                    value={vehicleData.model}
                                                    onChange={handleVehicleChange}
                                                    className={`w-full px-4 py-3.5 bg-[#0A0A0A]/50 border rounded-xl text-white placeholder-gray-500 outline-none transition-all focus:border-white/20 ${customerErrors.model ? 'border-red-500' : 'border-white/10'}`}
                                                />
                                                {customerErrors.model && <p className="text-red-400 text-xs animate-shake">{customerErrors.model}</p>}
                                            </div>
                                        </div>

                                        {/* Year */}
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-300">Year</label>
                                            <input
                                                type="number"
                                                name="year"
                                                placeholder="2024"
                                                value={vehicleData.year}
                                                onChange={handleVehicleChange}
                                                className={`w-full px-4 py-3.5 bg-[#0A0A0A]/50 border rounded-xl text-white placeholder-gray-500 outline-none transition-all focus:border-white/20 ${customerErrors.year ? 'border-red-500' : 'border-white/10'}`}
                                            />
                                            {customerErrors.year && <p className="text-red-400 text-xs animate-shake">{customerErrors.year}</p>}
                                        </div>
                                    </div>
                                )}

                                {/* Navigation Buttons */}
                                <div className="flex gap-3 pt-4">
                                    {step === 2 && (
                                        <button
                                            type="button"
                                            onClick={() => setStep(1)}
                                            className="flex-1 px-3 py-3.5 bg-white/5 border border-white/10 text-white font-semibold rounded-xl hover:bg-white/10 transition-all flex items-center justify-center gap-2 whitespace-nowrap text-sm sm:text-base"
                                        >
                                            <ArrowLeft className="w-4 h-4" />
                                            Back
                                        </button>
                                    )}
                                    <button
                                        type="submit"
                                        disabled={anyLoading}
                                        className="flex-[2] bg-gradient-to-r from-primary to-orange-600 text-white font-semibold py-3.5 rounded-xl hover:shadow-lg hover:shadow-primary/30 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center group whitespace-nowrap text-xs sm:text-sm px-2 sm:px-4"
                                    >
                                        {anyLoading ? (
                                            <Spinner size="sm" color="text-white" />
                                        ) : (
                                            <>
                                                <span>{step === 1 ? 'Next: Vehicle Info' : 'Create Account'}</span>
                                                <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-1 transition-transform" />
                                            </>
                                        )}
                                    </button>
                                </div>

                                {step === 1 && (
                                    <>
                                        {/* Divider */}
                                        <div className="relative flex py-4 items-center">
                                            <div className="flex-grow border-t border-white/10"></div>
                                            <span className="flex-shrink mx-4 text-gray-500 text-xs font-medium">OR</span>
                                            <div className="flex-grow border-t border-white/10"></div>
                                        </div>

                                        {/* Social Sign Up */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                onClick={handleGoogleLogin}
                                                disabled={anyLoading}
                                                className="flex items-center justify-center gap-2 bg-[#0A0A0A]/50 border border-white/10 text-white font-medium py-3 rounded-xl hover:bg-[#0A0A0A] hover:border-white/20 transition-all duration-300 disabled:opacity-70"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
                                                    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
                                                    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
                                                    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
                                                    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C42.022,35.244,44,30.036,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
                                                </svg>
                                                Google
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleFacebookLogin}
                                                disabled={anyLoading}
                                                className="flex items-center justify-center gap-2 bg-[#0A0A0A]/50 border border-white/10 text-white font-medium py-3 rounded-xl hover:bg-[#0A0A0A] hover:border-white/20 transition-all duration-300 disabled:opacity-70"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
                                                    <path fill="#039be5" d="M24 5A19 19 0 1 0 24 43A19 19 0 1 0 24 5Z"></path>
                                                    <path fill="#fff" d="M26.572,29.036h4.917l0.772-4.995h-5.69v-2.73c0-2.075,0.678-3.915,2.619-3.915h3.119v-4.359c-0.548-0.074-1.707-0.236-3.897-0.236c-4.573,0-7.254,2.415-7.254,7.917v3.323h-4.701v4.995h4.701v13.729C22.089,42.905,23.032,43,24,43c0.875,0,1.729-0.08,2.572-0.194V29.036z"></path>
                                                </svg>
                                                Facebook
                                            </button>
                                        </div>
                                    </>
                                )}
                            </form>
                        ) : (
                            <form onSubmit={handleMechanicSignUp} className="space-y-4">
                                {step === 1 ? (
                                    <div className="space-y-4 animate-fadeIn">
                                        {/* Mechanic Name */}
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-300">Full Name</label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                    <User className="w-5 h-5 text-gray-500 group-focus-within:text-primary transition-colors" />
                                                </div>
                                                <input
                                                    type="text"
                                                    name="name"
                                                    placeholder="John Mechanic"
                                                    value={mechanicData.name}
                                                    onChange={handleMechanicChange}
                                                    className={`w-full pl-12 pr-4 py-3.5 bg-[#0A0A0A]/50 border rounded-xl text-white placeholder-gray-500 outline-none transition-all focus:border-white/20 ${mechanicErrors.name ? 'border-red-500' : 'border-white/10'}`}
                                                    required
                                                />
                                            </div>
                                            {mechanicErrors.name && <p className="text-red-400 text-xs animate-shake">{mechanicErrors.name}</p>}
                                        </div>

                                        {/* Mechanic Email */}
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-300">Email Address</label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                    <Mail className="w-5 h-5 text-gray-500 group-focus-within:text-primary transition-colors" />
                                                </div>
                                                <input
                                                    type="email"
                                                    name="email"
                                                    placeholder="mechanic@example.com"
                                                    value={mechanicData.email}
                                                    onChange={handleMechanicChange}
                                                    className={`w-full pl-12 pr-4 py-3.5 bg-[#0A0A0A]/50 border rounded-xl text-white placeholder-gray-500 outline-none transition-all focus:border-white/20 ${mechanicErrors.email ? 'border-red-500' : 'border-white/10'}`}
                                                    required
                                                />
                                            </div>
                                            {mechanicErrors.email && <p className="text-red-400 text-xs animate-shake">{mechanicErrors.email}</p>}
                                        </div>

                                        {/* Mechanic Phone */}
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-300">Phone Number</label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                    <Phone className="w-5 h-5 text-gray-500 group-focus-within:text-primary transition-colors" />
                                                </div>
                                                <input
                                                    type="tel"
                                                    name="phone"
                                                    placeholder="+1 (555) 000-0000"
                                                    value={mechanicData.phone}
                                                    onChange={handleMechanicChange}
                                                    className={`w-full pl-12 pr-4 py-3.5 bg-[#0A0A0A]/50 border rounded-xl text-white placeholder-gray-500 outline-none transition-all focus:border-white/20 ${mechanicErrors.phone ? 'border-red-500' : 'border-white/10'}`}
                                                    required
                                                />
                                            </div>
                                            {mechanicErrors.phone && <p className="text-red-400 text-xs animate-shake">{mechanicErrors.phone}</p>}
                                        </div>

                                        {/* Mechanic Password */}
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-300">Password</label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                    <Lock className="w-5 h-5 text-gray-500 group-focus-within:text-primary transition-colors" />
                                                </div>
                                                <input
                                                    type={showPassword ? "text" : "password"}
                                                    name="password"
                                                    placeholder="••••••••"
                                                    value={mechanicData.password}
                                                    onChange={handleMechanicChange}
                                                    className={`w-full pl-12 pr-12 py-3.5 bg-[#0A0A0A]/50 border rounded-xl text-white placeholder-gray-500 outline-none transition-all focus:border-white/20 ${mechanicErrors.password ? 'border-red-500' : 'border-white/10'}`}
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-primary transition-colors"
                                                >
                                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                                </button>
                                            </div>
                                            {mechanicErrors.password && <p className="text-red-400 text-xs animate-shake">{mechanicErrors.password}</p>}
                                        </div>

                                        {/* Mechanic Confirm Password */}
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-300">Confirm Password</label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                    <CheckCircle2 className="w-5 h-5 text-gray-500 group-focus-within:text-primary transition-colors" />
                                                </div>
                                                <input
                                                    type={showConfirmPassword ? "text" : "password"}
                                                    name="confirmPassword"
                                                    placeholder="••••••••"
                                                    value={mechanicData.confirmPassword}
                                                    onChange={handleMechanicChange}
                                                    className={`w-full pl-12 pr-12 py-3.5 bg-[#0A0A0A]/50 border rounded-xl text-white placeholder-gray-500 outline-none transition-all focus:border-white/20 ${mechanicErrors.confirmPassword ? 'border-red-500' : 'border-white/10'}`}
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-primary transition-colors"
                                                >
                                                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                                </button>
                                            </div>
                                            {mechanicErrors.confirmPassword && <p className="text-red-400 text-xs animate-shake">{mechanicErrors.confirmPassword}</p>}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-6 animate-fadeIn">
                                        {/* Bio */}
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-300">Professional Bio</label>
                                            <textarea
                                                name="bio"
                                                rows={3}
                                                placeholder="Tell us about your experience..."
                                                value={mechanicData.bio}
                                                onChange={handleMechanicChange}
                                                className={`w-full px-4 py-3 bg-[#0A0A0A]/50 border rounded-xl text-white placeholder-gray-500 outline-none transition-all focus:border-white/20 resize-none ${mechanicErrors.bio ? 'border-red-500' : 'border-white/10'}`}
                                            />
                                            {mechanicErrors.bio && <p className="text-red-400 text-xs animate-shake">{mechanicErrors.bio}</p>}
                                        </div>

                                        {/* Specializations */}
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-300">Specializations</label>
                                            <div className="flex flex-wrap gap-2">
                                                {commonSpecializations.map(spec => (
                                                    <button
                                                        key={spec}
                                                        type="button"
                                                        onClick={() => toggleSpecialization(spec)}
                                                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${mechanicData.specializations.includes(spec)
                                                            ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                                                            : 'bg-white/5 text-gray-400 border border-white/10 hover:border-white/20'
                                                            }`}
                                                    >
                                                        {spec}
                                                    </button>
                                                ))}
                                            </div>
                                            {mechanicErrors.specializations && <p className="text-red-400 text-xs animate-shake">{mechanicErrors.specializations}</p>}
                                        </div>

                                        {/* Document Uploads */}
                                        <div className="space-y-4">
                                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Verification Documents</h4>

                                            {/* Driver's License */}
                                            <div className="space-y-2">
                                                <label className="block text-sm font-medium text-gray-300 flex items-center justify-between">
                                                    <span>Driver's License (Mandatory)</span>
                                                    {mechanicData.documents.license && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="file"
                                                        id="license-upload"
                                                        accept="image/*,.pdf"
                                                        onChange={(e) => handleFileChange(e, 'license')}
                                                        className="hidden"
                                                    />
                                                    <label
                                                        htmlFor="license-upload"
                                                        className={`w-full flex items-center justify-center gap-3 px-4 py-4 bg-[#0A0A0A]/50 border-2 border-dashed rounded-xl cursor-pointer hover:bg-[#0A0A0A] hover:border-primary/50 transition-all ${mechanicErrors.license ? 'border-red-500' : 'border-white/10'}`}
                                                    >
                                                        {mechanicData.documents.license ? (
                                                            <div className="flex items-center gap-2 text-green-500">
                                                                <FileText className="w-5 h-5" />
                                                                <span className="text-sm">License Uploaded</span>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <Upload className="w-5 h-5 text-gray-500" />
                                                                <span className="text-sm text-gray-400">Click to upload license</span>
                                                            </>
                                                        )}
                                                    </label>
                                                </div>
                                                {mechanicErrors.license && <p className="text-red-400 text-xs animate-shake">{mechanicErrors.license}</p>}
                                            </div>

                                            {/* NBI Clearance */}
                                            <div className="space-y-2">
                                                <label className="block text-sm font-medium text-gray-300 flex items-center justify-between">
                                                    <span>NBI Clearance (Optional)</span>
                                                    {mechanicData.documents.nbi && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="file"
                                                        id="nbi-upload"
                                                        accept="image/*,.pdf"
                                                        onChange={(e) => handleFileChange(e, 'nbi')}
                                                        className="hidden"
                                                    />
                                                    <label
                                                        htmlFor="nbi-upload"
                                                        className={`w-full flex items-center justify-center gap-3 px-4 py-4 bg-[#0A0A0A]/50 border-2 border-dashed rounded-xl cursor-pointer hover:bg-[#0A0A0A] hover:border-white/20 transition-all border-white/10`}
                                                    >
                                                        {mechanicData.documents.nbi ? (
                                                            <div className="flex items-center gap-2 text-green-500">
                                                                <FileText className="w-5 h-5" />
                                                                <span className="text-sm">NBI Clearance Uploaded</span>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <Upload className="w-5 h-5 text-gray-500" />
                                                                <span className="text-sm text-gray-400">Click to upload NBI</span>
                                                            </>
                                                        )}
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Mechanic Navigation Buttons */}
                                <div className="flex gap-3 pt-4">
                                    {step === 2 && (
                                        <button
                                            type="button"
                                            onClick={() => setStep(1)}
                                            className="flex-1 px-3 py-3.5 bg-white/5 border border-white/10 text-white font-semibold rounded-xl hover:bg-white/10 transition-all flex items-center justify-center gap-2 whitespace-nowrap text-sm sm:text-base"
                                        >
                                            <ArrowLeft className="w-4 h-4" />
                                            Back
                                        </button>
                                    )}
                                    <button
                                        type="submit"
                                        disabled={anyLoading}
                                        className="flex-[2] bg-gradient-to-r from-primary to-orange-600 text-white font-semibold py-3.5 rounded-xl hover:shadow-lg hover:shadow-primary/30 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center group whitespace-nowrap text-xs sm:text-sm px-2 sm:px-4"
                                    >
                                        {anyLoading ? (
                                            <Spinner size="sm" color="text-white" />
                                        ) : (
                                            <>
                                                {step === 1 ? (
                                                    <>
                                                        <span>Next: Bio & Verification</span>
                                                        <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-1 transition-transform" />
                                                    </>
                                                ) : (
                                                    <>
                                                        <Wrench className="w-4 h-4 mr-1.5" />
                                                        <span>Submit Application</span>
                                                        <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-1 transition-transform" />
                                                    </>
                                                )}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        )
                    )}
                </div>

                {/* Sign In Link */}
                <div className="mt-6 text-center">
                    <p className="text-gray-400">
                        Already have an account?{' '}
                        <button onClick={() => navigate('/')} className="text-primary font-semibold hover:underline transition-all">
                            Sign in
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SignUpScreen;
