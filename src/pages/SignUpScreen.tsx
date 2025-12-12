
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Spinner from '../components/Spinner';
import { useDatabase } from '../context/DatabaseContext';
import { useMechanicAuth } from '../context/MechanicAuthContext';
import { fileToBase64 } from '../utils/fileUtils';

const SignUpScreen: React.FC = () => {
    const { registerWithCredentials, loginWithGoogle, loginWithFacebook, loading: authLoading } = useAuth();
    const { register: registerMechanic, loading: mechanicAuthLoading } = useMechanicAuth();
    const navigate = useNavigate();
    const { db } = useDatabase();

    const [userType, setUserType] = useState<'customer' | 'mechanic'>('customer');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isMechanicSuccess, setIsMechanicSuccess] = useState(false);

    // Customer Form State
    const [customerData, setCustomerData] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
    const [customerErrors, setCustomerErrors] = useState<{ [key: string]: string }>({});

    // Mechanic Form State
    const [mechanicData, setMechanicData] = useState({ name: '', email: '', phone: '', password: '', bio: '', specializations: '', basePrice: '' });
    const [portfolioImages, setPortfolioImages] = useState<string[]>([]);
    const [mechanicErrors, setMechanicErrors] = useState<{ [key: string]: string }>({});

    if (!db) {
        return <div className="flex items-center justify-center h-screen bg-secondary"><Spinner size="lg" /></div>;
    }

    const { settings } = db;
    // Dynamically select logo based on user type and database settings
    const logoUrl = userType === 'mechanic'
        ? (settings?.brandingAssets?.mechanicAuthLogoUrl || settings?.appLogoUrl)
        : (settings?.brandingAssets?.customerAuthLogoUrl || settings?.appLogoUrl);

    // --- Validation ---
    const validateCustomerField = (fieldName: string, value: string) => {
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
        }
        return fieldError;
    };

    // --- Event Handlers ---
    const handleCustomerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setCustomerData(prev => ({ ...prev, [name]: value }));
    };

    const handleMechanicChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setMechanicData(prev => ({ ...prev, [name]: value }));
    };

    const handleCustomerSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const nameError = validateCustomerField('name', customerData.name);
        const emailError = validateCustomerField('email', customerData.email);
        const phoneError = validateCustomerField('phone', customerData.phone);
        const passwordError = validateCustomerField('password', customerData.password);
        const confirmError = validateCustomerField('confirmPassword', customerData.confirmPassword);

        const allErrors = { name: nameError, email: emailError, phone: phoneError, password: passwordError, confirmPassword: confirmError };
        setCustomerErrors(allErrors);

        if (Object.values(allErrors).some(Boolean)) return;

        setIsLoading(true);
        try {
            await registerWithCredentials(customerData.name, customerData.email, customerData.phone, customerData.password);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleMechanicSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!mechanicData.name || !mechanicData.email || !mechanicData.phone || !mechanicData.password) {
            setError("Please fill in all required fields.");
            return;
        }

        setIsLoading(true);
        try {
            // Fix: Add missing 'registrationDate' and 'birthday' properties to satisfy the Mechanic type.
            await registerMechanic({
                ...mechanicData,
                basePrice: mechanicData.basePrice ? Number(mechanicData.basePrice) : undefined,
                specializations: mechanicData.specializations.split(',').map(s => s.trim()).filter(Boolean),
                portfolioImages,
                imageUrl: 'https://picsum.photos/seed/newmech/200/200',
                lat: 14.55 + (Math.random() - 0.5) * 0.1,
                lng: 121.02 + (Math.random() - 0.5) * 0.1,
                registrationDate: new Date().toISOString().split('T')[0],
                birthday: '', // Birthday is not collected in this form
            });
            setIsMechanicSuccess(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            const base64Promises = files.map((file: File) => fileToBase64(file));
            try {
                const base64Images = await Promise.all(base64Promises);
                setPortfolioImages(prev => [...prev, ...base64Images]);
            } catch (err) {
                setError("Failed to upload images. Please try again.");
            }
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

    const anyLoading = isLoading || authLoading || mechanicAuthLoading;

    if (isMechanicSuccess) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-secondary p-8 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-green-400 mb-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <h1 className="text-3xl font-bold text-white mb-4">Application Submitted!</h1>
                <p className="text-light-gray mb-8">Thank you for registering. Your profile is now under review by our admin team. You will be notified via email once your account is approved.</p>
                <button onClick={() => navigate('/login', { state: { from: 'mechanic' } })} className="w-full max-w-sm bg-primary text-white font-bold py-3 rounded-lg hover:bg-orange-600 transition">
                    Back to Login
                </button>
            </div>
        );
    }


    return (
        <div className="relative flex flex-col items-center justify-center min-h-screen bg-secondary overflow-x-hidden p-4">
            {/* Background Decorative Elements */}
            <div className="fixed top-[-10%] left-[-10%] w-96 h-96 bg-primary/20 rounded-full blur-[100px] animate-pulse pointer-events-none"></div>
            <div className="fixed bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] animate-pulse delay-1000 pointer-events-none"></div>

            <div className="relative w-full max-w-md glass-heavy p-8 rounded-3xl shadow-2xl animate-slideInUp my-8">
                <div className="text-center mb-8">
                    {logoUrl ? (
                        <img src={logoUrl} alt="Logo" className="w-64 mb-4 max-h-24 object-contain mx-auto drop-shadow-lg" />
                    ) : (
                        <h1 className="text-4xl font-bold text-primary mb-2 tracking-tight">{settings.appName}</h1>
                    )}
                    <p className="text-light-gray text-sm font-medium tracking-wide uppercase">{settings.appTagline}</p>
                </div>

                <div className="mb-8 p-1 bg-black/20 backdrop-blur-sm rounded-xl flex relative overflow-hidden">
                    <div
                        className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-primary rounded-lg transition-all duration-300 ease-out shadow-lg ${userType === 'customer' ? 'left-1' : 'left-[calc(50%+4px)]'}`}
                    ></div>
                    <button
                        onClick={() => setUserType('customer')}
                        className={`flex-1 py-2.5 text-center text-sm font-semibold rounded-lg transition-colors relative z-10 ${userType === 'customer' ? 'text-white' : 'text-light-gray hover:text-white'}`}
                    >
                        I'm a Customer
                    </button>
                    <button
                        onClick={() => setUserType('mechanic')}
                        className={`flex-1 py-2.5 text-center text-sm font-semibold rounded-lg transition-colors relative z-10 ${userType === 'mechanic' ? 'text-white' : 'text-light-gray hover:text-white'}`}
                    >
                        I'm a Mechanic
                    </button>
                </div>

                {error && <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-center text-sm">{error}</div>}

                {userType === 'customer' ? (
                    <form onSubmit={handleCustomerSignUp} noValidate className="space-y-4 animate-fadeIn">
                        <div className="space-y-1">
                            <input type="text" name="name" placeholder="Full Name" value={customerData.name} onChange={handleCustomerChange} className={`w-full px-4 py-3.5 glass-input rounded-xl focus:outline-none focus:ring-2 ${customerErrors.name ? 'border-red-500 ring-red-500/20' : 'focus:border-primary/50 focus:ring-primary/20'}`} />
                            {customerErrors.name && <p className="text-red-400 text-xs ml-1">{customerErrors.name}</p>}
                        </div>
                        <div className="space-y-1">
                            <input type="email" name="email" placeholder="Email" value={customerData.email} onChange={handleCustomerChange} className={`w-full px-4 py-3.5 glass-input rounded-xl focus:outline-none focus:ring-2 ${customerErrors.email ? 'border-red-500 ring-red-500/20' : 'focus:border-primary/50 focus:ring-primary/20'}`} />
                            {customerErrors.email && <p className="text-red-400 text-xs ml-1">{customerErrors.email}</p>}
                        </div>
                        <div className="space-y-1">
                            <input type="tel" name="phone" placeholder="Phone Number" value={customerData.phone} onChange={handleCustomerChange} className={`w-full px-4 py-3.5 glass-input rounded-xl focus:outline-none focus:ring-2 ${customerErrors.phone ? 'border-red-500 ring-red-500/20' : 'focus:border-primary/50 focus:ring-primary/20'}`} />
                            {customerErrors.phone && <p className="text-red-400 text-xs ml-1">{customerErrors.phone}</p>}
                        </div>
                        <div className="space-y-1">
                            <input type="password" name="password" placeholder="Password" value={customerData.password} onChange={handleCustomerChange} className={`w-full px-4 py-3.5 glass-input rounded-xl focus:outline-none focus:ring-2 ${customerErrors.password ? 'border-red-500 ring-red-500/20' : 'focus:border-primary/50 focus:ring-primary/20'}`} />
                            {customerErrors.password && <p className="text-red-400 text-xs ml-1">{customerErrors.password}</p>}
                        </div>
                        <div className="space-y-1">
                            <input type="password" name="confirmPassword" placeholder="Confirm Password" value={customerData.confirmPassword} onChange={handleCustomerChange} className={`w-full px-4 py-3.5 glass-input rounded-xl focus:outline-none focus:ring-2 ${customerErrors.confirmPassword ? 'border-red-500 ring-red-500/20' : 'focus:border-primary/50 focus:ring-primary/20'}`} />
                            {customerErrors.confirmPassword && <p className="text-red-400 text-xs ml-1">{customerErrors.confirmPassword}</p>}
                        </div>

                        <button type="submit" disabled={anyLoading} className="w-full bg-gradient-to-r from-primary to-orange-600 text-white font-bold py-3.5 rounded-xl hover:shadow-lg hover:shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center disabled:opacity-70 mt-4">
                            {anyLoading ? <Spinner size="sm" color="text-white" /> : 'Create Account'}
                        </button>

                        <div className="relative flex py-6 items-center">
                            <div className="flex-grow border-t border-white/10"></div>
                            <span className="flex-shrink mx-4 text-gray-500 text-xs font-medium uppercase tracking-wider">Or sign up with</span>
                            <div className="flex-grow border-t border-white/10"></div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={handleGoogleLogin} disabled={anyLoading} className="w-full flex items-center justify-center gap-2 glass hover:bg-white/10 text-white font-medium py-3 rounded-xl transition-all duration-200 disabled:opacity-50">
                                {anyLoading ? <Spinner size="sm" /> : (<><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C42.022,35.244,44,30.036,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path></svg>Google</>)}
                            </button>
                            <button onClick={handleFacebookLogin} disabled={anyLoading} className="w-full flex items-center justify-center gap-2 glass hover:bg-white/10 text-white font-medium py-3 rounded-xl transition-all duration-200 disabled:opacity-50">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5"><path fill="#039be5" d="M24 5A19 19 0 1 0 24 43A19 19 0 1 0 24 5Z"></path><path fill="#fff" d="M26.572,29.036h4.917l0.772-4.995h-5.69v-2.73c0-2.075,0.678-3.915,2.619-3.915h3.119v-4.359c-0.548-0.074-1.707-0.236-3.897-0.236c-4.573,0-7.254,2.415-7.254,7.917v3.323h-4.701v4.995h4.701v13.729C22.089,42.905,23.032,43,24,43c0.875,0,1.729-0.08,2.572-0.194V29.036z"></path></svg>
                                Facebook
                            </button>
                        </div>
                    </form>
                ) : (
                    <form onSubmit={handleMechanicSignUp} className="space-y-4 animate-fadeIn">
                        <input type="text" name="name" placeholder="Full Name" value={mechanicData.name} onChange={handleMechanicChange} className="w-full px-4 py-3.5 glass-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 focus:bg-field transition-all duration-200" required />
                        <input type="email" name="email" placeholder="Email Address" value={mechanicData.email} onChange={handleMechanicChange} className="w-full px-4 py-3.5 glass-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 focus:bg-field transition-all duration-200" required />
                        <input type="tel" name="phone" placeholder="Phone Number" value={mechanicData.phone} onChange={handleMechanicChange} className="w-full px-4 py-3.5 glass-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 focus:bg-field transition-all duration-200" required />
                        <input type="password" name="password" placeholder="Password" value={mechanicData.password} onChange={handleMechanicChange} className="w-full px-4 py-3.5 glass-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 focus:bg-field transition-all duration-200" required />
                        <textarea name="bio" placeholder="Short Bio (Tell customers about yourself)" value={mechanicData.bio} onChange={handleMechanicChange} rows={3} className="w-full px-4 py-3.5 glass-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 focus:bg-field transition-all duration-200" />
                        <input type="text" name="specializations" placeholder="Specializations (comma-separated, e.g., Brakes)" value={mechanicData.specializations} onChange={handleMechanicChange} className="w-full px-4 py-3.5 glass-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 focus:bg-field transition-all duration-200" />

                        <div>
                            <label className="block text-xs font-medium text-light-gray mb-2 ml-1">Portfolio/Work Images (optional)</label>
                            <input type="file" onChange={handleFileChange} multiple accept="image/*" className="w-full text-sm text-light-gray file:mr-4 file:py-2.5 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition-colors cursor-pointer" />
                            <div className="mt-3 flex flex-wrap gap-2">
                                {portfolioImages.map((img, i) => <img key={i} src={img} className="h-16 w-16 rounded-lg object-cover border border-white/10" alt="portfolio preview" />)}
                            </div>
                        </div>

                        <button type="submit" disabled={anyLoading} className="w-full bg-gradient-to-r from-primary to-orange-600 text-white font-bold py-3.5 rounded-xl hover:shadow-lg hover:shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center disabled:opacity-70 mt-4">
                            {anyLoading ? <Spinner size="sm" color="text-white" /> : 'Submit Application'}
                        </button>
                    </form>
                )}

                <div className="mt-8 text-center">
                    <p className="text-light-gray text-sm">
                        Already have an account?{' '}
                        <button onClick={() => navigate('/')} className="text-primary font-semibold hover:text-orange-400 transition-colors">
                            Sign in
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SignUpScreen;
