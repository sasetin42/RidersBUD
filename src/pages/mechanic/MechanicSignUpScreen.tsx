import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Spinner from '../../components/Spinner';
import { useMechanicAuth } from '../../context/MechanicAuthContext';
import { compressAndEncodeImage } from '../../utils/fileUtils';
import { Eye, EyeOff, ChevronRight, ChevronLeft, Check, X } from 'lucide-react';

const MechanicSignUpScreen: React.FC = () => {
    const { register, loading: authLoading } = useMechanicAuth();
    const navigate = useNavigate();

    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        bio: '',
        specializations: [] as string[],
        basePrice: '',
    });
    const [specializationInput, setSpecializationInput] = useState('');
    const [portfolioImages, setPortfolioImages] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [error, setError] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Password strength calculation
    const getPasswordStrength = (password: string): { strength: number; label: string; color: string } => {
        if (!password) return { strength: 0, label: '', color: '' };
        let strength = 0;
        if (password.length >= 8) strength++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
        if (/\d/.test(password)) strength++;
        if (/[^a-zA-Z\d]/.test(password)) strength++;

        if (strength <= 1) return { strength: 25, label: 'Weak', color: 'bg-red-500' };
        if (strength === 2) return { strength: 50, label: 'Fair', color: 'bg-yellow-500' };
        if (strength === 3) return { strength: 75, label: 'Good', color: 'bg-blue-500' };
        return { strength: 100, label: 'Strong', color: 'bg-green-500' };
    };

    const passwordStrength = getPasswordStrength(formData.password);

    // Email validation
    const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    // Phone validation
    const isValidPhone = (phone: string) => /^\d{10,15}$/.test(phone.replace(/[\s-]/g, ''));

    // Step validation
    const isStep1Valid = () => {
        return formData.name.trim() &&
            isValidEmail(formData.email) &&
            isValidPhone(formData.phone) &&
            formData.password.length >= 8;
    };

    const isStep2Valid = () => {
        return formData.bio.trim() && formData.specializations.length > 0;
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            setUploadingImage(true);
            setError('');

            try {
                const compressedImages = await Promise.all(
                    files.map(file => compressAndEncodeImage(file, 800, 0.8))
                );
                setPortfolioImages(prev => [...prev, ...compressedImages]);
            } catch (err) {
                setError("Failed to upload images. Please try again.");
            } finally {
                setUploadingImage(false);
            }
        }
    };

    const removeImage = (index: number) => {
        setPortfolioImages(prev => prev.filter((_, i) => i !== index));
    };

    const addSpecialization = () => {
        const trimmed = specializationInput.trim();
        if (trimmed && !formData.specializations.includes(trimmed)) {
            setFormData({ ...formData, specializations: [...formData.specializations, trimmed] });
            setSpecializationInput('');
        }
    };

    const removeSpecialization = (spec: string) => {
        setFormData({ ...formData, specializations: formData.specializations.filter(s => s !== spec) });
    };

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        setIsLoading(true);
        try {
            await register({
                ...formData,
                basePrice: formData.basePrice ? Number(formData.basePrice) : undefined,
                portfolioImages,
                imageUrl: 'https://picsum.photos/seed/newmech/200/200',
                lat: 14.55 + (Math.random() - 0.5) * 0.1,
                lng: 121.02 + (Math.random() - 0.5) * 0.1,
                registrationDate: new Date().toISOString().split('T')[0],
                birthday: '',
            });
            setIsSuccess(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-secondary p-8 text-center animate-fade-in">
                <div className="relative mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-green-400 animate-scale-in" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                </div>
                <h1 className="text-4xl font-bold text-white mb-4">Application Submitted!</h1>
                <p className="text-light-gray mb-8 max-w-md">Thank you for registering. Your profile is now under review by our admin team. You will be notified via email once your account is approved.</p>
                <button onClick={() => navigate('/login', { state: { from: 'mechanic' } })} className="w-full max-w-sm bg-primary text-white font-bold py-3.5 rounded-xl hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20">
                    Back to Login
                </button>
            </div>
        );
    }

    const anyLoading = isLoading || authLoading;

    return (
        <div className="flex flex-col h-full bg-secondary p-8 overflow-y-auto">
            <div className="w-full max-w-2xl mx-auto glass-heavy p-8 rounded-3xl shadow-2xl animate-fade-in-up">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-primary mb-2">Become a Partner</h1>
                    <p className="text-light-gray text-sm uppercase tracking-wide">Join our network of professional mechanics</p>
                </div>

                {/* Progress Indicator */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-2">
                        {[1, 2, 3].map(step => (
                            <div key={step} className="flex items-center flex-1">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${currentStep >= step ? 'bg-primary text-white' : 'bg-white/10 text-gray-500'
                                    }`}>
                                    {currentStep > step ? <Check size={20} /> : step}
                                </div>
                                {step < 3 && (
                                    <div className={`flex-1 h-1 mx-2 rounded transition-all ${currentStep > step ? 'bg-primary' : 'bg-white/10'
                                        }`} />
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 px-2">
                        <span>Basic Info</span>
                        <span>Professional</span>
                        <span>Portfolio</span>
                    </div>
                </div>

                <form onSubmit={handleSignUp} className="space-y-6">
                    {/* Step 1: Basic Info */}
                    {currentStep === 1 && (
                        <div className="space-y-4 animate-fade-in">
                            <div>
                                <input
                                    type="text"
                                    placeholder="Full Name *"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-3.5 glass-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                    required
                                />
                            </div>
                            <div>
                                <input
                                    type="email"
                                    placeholder="Email Address *"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    className={`w-full px-4 py-3.5 glass-input rounded-xl focus:outline-none focus:ring-2 transition-all ${formData.email && !isValidEmail(formData.email) ? 'ring-2 ring-red-500/50' : 'focus:ring-primary/50'
                                        }`}
                                    required
                                />
                                {formData.email && !isValidEmail(formData.email) && (
                                    <p className="text-red-400 text-xs mt-1 ml-1">Please enter a valid email address</p>
                                )}
                            </div>
                            <div>
                                <input
                                    type="tel"
                                    placeholder="Phone Number *"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    className={`w-full px-4 py-3.5 glass-input rounded-xl focus:outline-none focus:ring-2 transition-all ${formData.phone && !isValidPhone(formData.phone) ? 'ring-2 ring-red-500/50' : 'focus:ring-primary/50'
                                        }`}
                                    required
                                />
                                {formData.phone && !isValidPhone(formData.phone) && (
                                    <p className="text-red-400 text-xs mt-1 ml-1">Please enter a valid phone number (10-15 digits)</p>
                                )}
                            </div>
                            <div>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Password *"
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full px-4 py-3.5 glass-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all pr-12"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                                {formData.password && (
                                    <div className="mt-2">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs text-gray-400">Password Strength:</span>
                                            <span className={`text-xs font-bold ${passwordStrength.label === 'Weak' ? 'text-red-400' :
                                                    passwordStrength.label === 'Fair' ? 'text-yellow-400' :
                                                        passwordStrength.label === 'Good' ? 'text-blue-400' : 'text-green-400'
                                                }`}>{passwordStrength.label}</span>
                                        </div>
                                        <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                                            <div
                                                className={`h-full ${passwordStrength.color} transition-all duration-300`}
                                                style={{ width: `${passwordStrength.strength}%` }}
                                            />
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">Use 8+ characters with mix of letters, numbers & symbols</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Step 2: Professional Details */}
                    {currentStep === 2 && (
                        <div className="space-y-4 animate-fade-in">
                            <div>
                                <textarea
                                    placeholder="Short Bio (Tell customers about yourself) *"
                                    value={formData.bio}
                                    onChange={e => setFormData({ ...formData, bio: e.target.value })}
                                    rows={4}
                                    className="w-full px-4 py-3.5 glass-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-1">{formData.bio.length}/500 characters</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-light-gray mb-2">Specializations *</label>
                                <div className="flex gap-2 mb-2">
                                    <input
                                        type="text"
                                        placeholder="e.g., Brake Systems, Toyota Expert"
                                        value={specializationInput}
                                        onChange={e => setSpecializationInput(e.target.value)}
                                        onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addSpecialization())}
                                        className="flex-1 px-4 py-3 glass-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={addSpecialization}
                                        className="px-6 py-3 bg-primary/20 text-primary rounded-xl hover:bg-primary/30 transition-all font-bold"
                                    >
                                        Add
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {formData.specializations.map((spec, i) => (
                                        <span key={i} className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm border border-primary/20">
                                            {spec}
                                            <button type="button" onClick={() => removeSpecialization(spec)} className="hover:text-white transition-colors">
                                                <X size={14} />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                                {formData.specializations.length === 0 && (
                                    <p className="text-xs text-gray-500 mt-2">Add at least one specialization</p>
                                )}
                            </div>
                            <div>
                                <input
                                    type="number"
                                    placeholder="Base Service Price (optional)"
                                    value={formData.basePrice}
                                    onChange={e => setFormData({ ...formData, basePrice: e.target.value })}
                                    className="w-full px-4 py-3.5 glass-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 3: Portfolio */}
                    {currentStep === 3 && (
                        <div className="space-y-4 animate-fade-in">
                            <div>
                                <label className="block text-sm font-medium text-light-gray mb-3">Portfolio/Work Images (optional)</label>
                                <input
                                    type="file"
                                    onChange={handleFileChange}
                                    multiple
                                    accept="image/*"
                                    disabled={uploadingImage}
                                    className="w-full text-sm text-light-gray file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition-colors cursor-pointer disabled:opacity-50"
                                />
                                {uploadingImage && (
                                    <div className="flex items-center gap-2 mt-2 text-sm text-primary">
                                        <Spinner size="sm" color="text-primary" />
                                        <span>Compressing images...</span>
                                    </div>
                                )}
                                <div className="mt-4 grid grid-cols-3 gap-3">
                                    {portfolioImages.map((img, i) => (
                                        <div key={i} className="relative group">
                                            <img src={img} className="h-24 w-full rounded-xl object-cover border border-white/10" alt="portfolio preview" />
                                            <button
                                                type="button"
                                                onClick={() => removeImage(i)}
                                                className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {error && <p className="text-red-400 text-center text-sm bg-red-500/10 p-3 rounded-xl border border-red-500/20 animate-shake">{error}</p>}

                    {/* Navigation Buttons */}
                    <div className="flex gap-3 pt-4">
                        {currentStep > 1 && (
                            <button
                                type="button"
                                onClick={() => setCurrentStep(currentStep - 1)}
                                className="flex-1 glass-button font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-white/10 transition-all"
                            >
                                <ChevronLeft size={20} /> Previous
                            </button>
                        )}
                        {currentStep < 3 ? (
                            <button
                                type="button"
                                onClick={() => setCurrentStep(currentStep + 1)}
                                disabled={currentStep === 1 ? !isStep1Valid() : !isStep2Valid()}
                                className="flex-1 bg-primary text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20"
                            >
                                Next <ChevronRight size={20} />
                            </button>
                        ) : (
                            <button
                                type="submit"
                                disabled={anyLoading}
                                className="flex-1 bg-primary text-white font-bold py-3.5 rounded-xl flex items-center justify-center disabled:opacity-70 hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20"
                            >
                                {anyLoading ? <Spinner size="sm" color="text-white" /> : 'Submit Application'}
                            </button>
                        )}
                    </div>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-light-gray">
                        Already have an account?{' '}
                        <button onClick={() => navigate('/login', { state: { from: 'mechanic' } })} className="text-primary font-semibold hover:underline transition-all">
                            Sign In
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default MechanicSignUpScreen;