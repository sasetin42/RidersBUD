
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useMechanicAuth } from '../context/MechanicAuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import Spinner from '../components/Spinner';
import { useDatabase } from '../context/DatabaseContext';

const LoginScreen: React.FC = () => {
    const { loginWithCredentials, loginWithGoogle, loginWithFacebook, loading: authLoading } = useAuth();
    const { login: mechanicLogin, loading: mechanicAuthLoading } = useMechanicAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { db } = useDatabase();

    const [activeTab, setActiveTab] = useState<'customer' | 'mechanic'>('customer');
    const [isLoading, setIsLoading] = useState(false);

    // Customer state
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

    // Mechanic state
    const [mechanicEmail, setMechanicEmail] = useState('ricardo@ridersbud.com');
    const [mechanicPassword, setMechanicPassword] = useState('password123');
    const [mechanicError, setMechanicError] = useState('');

    useEffect(() => {
        // Pre-select mechanic tab if redirected from a mechanic-only route
        if (location.state?.from === 'mechanic') {
            setActiveTab('mechanic');
        }
    }, [location.state]);


    if (!db) {
        return <div className="flex items-center justify-center h-screen bg-secondary"><Spinner size="lg"/></div>;
    }
    const { settings } = db;
    // Set the default logo as a fallback to ensure it's always available.
    const defaultLogo = "https://storage.googleapis.com/aistudio-hosting/generative-ai/e499715a-a38f-4d32-80f2-9b2512f7a6b2/assets/RidersBUD_logo.png";
    const logoUrl = settings.appLogoUrl || defaultLogo;


    const validateCustomerField = (name: string, value: string) => {
        let fieldError = '';
        if (name === 'email') {
            if (!value) fieldError = 'Email is required.';
            else if (!/\S+@\S+\.\S+/.test(value)) fieldError = 'Please enter a valid email address.';
        }
        if (name === 'password') {
            if (!value) fieldError = 'Password is required.';
        }
        return fieldError;
    };

    const handleCustomerLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMechanicError('');
        const emailError = validateCustomerField('email', email);
        const passwordError = validateCustomerField('password', password);
        
        if (emailError || passwordError) {
            setErrors({ email: emailError, password: passwordError });
            return;
        }

        setIsLoading(true);
        try {
            await loginWithCredentials(email, password);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleMechanicLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMechanicError('');
        setIsLoading(true);
        try {
            await mechanicLogin(mechanicEmail, mechanicPassword);
            navigate('/mechanic/dashboard');
        } catch (err) {
            setMechanicError(err instanceof Error ? err.message : 'An unknown error occurred.');
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
    
    const anyLoading = isLoading || authLoading || mechanicAuthLoading;

    return (
        <div className="flex flex-col items-center justify-center h-full bg-secondary p-8">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    {logoUrl ? (
                        <img src={logoUrl} alt="Logo" className="w-48 mb-8 max-h-24 object-contain mx-auto" />
                    ) : (
                        <h1 className="text-5xl font-bold text-primary mb-4">{settings.appName || 'RidersBUD'}</h1>
                    )}
                    <p className="text-light-gray">{settings.appTagline || 'Sign in to continue'}</p>
                </div>

                <div className="mb-6 border-b border-dark-gray flex">
                    <button
                        onClick={() => setActiveTab('customer')}
                        className={`flex-1 py-3 text-center font-semibold transition-colors ${activeTab === 'customer' ? 'text-primary border-b-2 border-primary' : 'text-light-gray'}`}
                    >
                        Customer
                    </button>
                    <button
                        onClick={() => setActiveTab('mechanic')}
                        className={`flex-1 py-3 text-center font-semibold transition-colors ${activeTab === 'mechanic' ? 'text-primary border-b-2 border-primary' : 'text-light-gray'}`}
                    >
                        Mechanic
                    </button>
                </div>
                
                {activeTab === 'customer' ? (
                    <div>
                        <form onSubmit={handleCustomerLogin} noValidate>
                            <div className="mb-4">
                                <input 
                                    type="email"
                                    name="email"
                                    placeholder="Email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className={`w-full px-4 py-3 bg-field border rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-2 ${errors.email ? 'border-red-500 ring-red-500' : 'border-dark-gray focus:ring-primary'}`}
                                />
                                {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
                            </div>
                            <div className="mb-6">
                                <input 
                                    type="password"
                                    name="password" 
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className={`w-full px-4 py-3 bg-field border rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-2 ${errors.password ? 'border-red-500 ring-red-500' : 'border-dark-gray focus:ring-primary'}`}
                                />
                                {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
                            </div>

                            {error && <p className="text-red-400 text-center text-sm mb-4">{error}</p>}
                            
                            <button 
                                type="submit"
                                disabled={anyLoading}
                                className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-orange-600 transition duration-300 flex items-center justify-center disabled:opacity-70"
                            >
                                {anyLoading ? <Spinner size="sm" color="text-white"/> : 'Login'}
                            </button>
                        </form>

                        <div className="relative flex py-5 items-center">
                            <div className="flex-grow border-t border-dark-gray"></div>
                            <span className="flex-shrink mx-4 text-light-gray text-xs">OR</span>
                            <div className="flex-grow border-t border-dark-gray"></div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={handleGoogleLogin} disabled={anyLoading} className="w-full flex items-center justify-center gap-2 bg-field text-white font-bold py-3 rounded-lg hover:bg-gray-700 transition duration-300 disabled:opacity-70"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-6 h-6"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C42.022,35.244,44,30.036,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path></svg>Google</button>
                            <button onClick={handleFacebookLogin} disabled={anyLoading} className="w-full flex items-center justify-center gap-2 bg-field text-white font-bold py-3 rounded-lg hover:bg-gray-700 transition duration-300 disabled:opacity-70"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-6 h-6"><path fill="#039be5" d="M24 5A19 19 0 1 0 24 43A19 19 0 1 0 24 5Z"></path><path fill="#fff" d="M26.572,29.036h4.917l0.772-4.995h-5.69v-2.73c0-2.075,0.678-3.915,2.619-3.915h3.119v-4.359c-0.548-0.074-1.707-0.236-3.897-0.236c-4.573,0-7.254,2.415-7.254,7.917v3.323h-4.701v4.995h4.701v13.729C22.089,42.905,23.032,43,24,43c0.875,0,1.729-0.08,2.572-0.194V29.036z"></path></svg>Facebook</button>
                        </div>
                    </div>
                ) : (
                    <div>
                        <form onSubmit={handleMechanicLogin}>
                            <div className="mb-4">
                                <input 
                                    type="email" 
                                    placeholder="Mechanic Email"
                                    value={mechanicEmail}
                                    onChange={(e) => setMechanicEmail(e.target.value)}
                                    className="w-full px-4 py-3 bg-field border border-dark-gray rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>
                            <div className="mb-6">
                                <input 
                                    type="password" 
                                    placeholder="Password"
                                    value={mechanicPassword}
                                    onChange={(e) => setMechanicPassword(e.target.value)}
                                    className="w-full px-4 py-3 bg-field border border-dark-gray rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>

                            {mechanicError && <p className="text-red-400 text-center text-sm mb-4">{mechanicError}</p>}
                            
                            <button 
                                type="submit"
                                disabled={anyLoading}
                                className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-orange-600 transition duration-300 flex items-center justify-center disabled:opacity-70"
                            >
                                {anyLoading ? <Spinner size="sm" color="text-white"/> : 'Login as Mechanic'}
                            </button>
                        </form>
                    </div>
                )}

                <div className="mt-8 text-center">
                    <p className="text-light-gray">
                        Don't have an account?{' '}
                        <button onClick={() => navigate('/signup')} className="text-primary font-semibold hover:underline">
                            Sign up
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginScreen;
