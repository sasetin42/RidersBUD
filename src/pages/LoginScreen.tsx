
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
        return <div className="flex items-center justify-center h-screen bg-secondary"><Spinner size="lg" /></div>;
    }

    // Set the default logo as a fallback to ensure it's always available.
    const defaultLogo = "https://storage.googleapis.com/aistudio-hosting/generative-ai/e499715a-a38f-4d32-80f2-9b2512f7a6b2/assets/RidersBUD_logo.png";
    const appLogo = db?.settings?.appLogoUrl || defaultLogo;
    const logoUrl = activeTab === 'mechanic'
        ? (db?.settings?.brandingAssets?.mechanicAuthLogoUrl || appLogo)
        : (db?.settings?.brandingAssets?.customerAuthLogoUrl || appLogo);

    // Helper validation
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
    const appName = db?.settings?.appName || 'RidersBUD';
    const appTagline = db?.settings?.appTagline || 'Sign in to continue';

    return (
        <div className="relative flex flex-col items-center justify-center min-h-screen bg-secondary overflow-hidden p-4">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/20 rounded-full blur-[100px] animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] animate-pulse delay-1000"></div>

            <div className="relative w-full max-w-md glass-heavy p-8 rounded-3xl shadow-2xl animate-slideInUp">
                <div className="text-center mb-8">
                    {logoUrl ? (
                        <img src={logoUrl} alt="Logo" className="w-48 mb-6 max-h-24 object-contain mx-auto drop-shadow-lg" />
                    ) : (
                        <h1 className="text-5xl font-bold text-primary mb-4 tracking-tight">{appName}</h1>
                    )}
                    <p className="text-light-gray text-sm font-medium tracking-wide uppercase">{appTagline}</p>
                </div>

                <div className="mb-8 p-1 bg-black/20 backdrop-blur-sm rounded-xl flex relative overflow-hidden">
                    <div
                        className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-primary rounded-lg transition-all duration-300 ease-out shadow-lg ${activeTab === 'customer' ? 'left-1' : 'left-[calc(50%+4px)]'}`}
                    ></div>
                    <button
                        onClick={() => setActiveTab('customer')}
                        className={`flex-1 py-2.5 text-center text-sm font-semibold rounded-lg transition-colors relative z-10 ${activeTab === 'customer' ? 'text-white' : 'text-light-gray hover:text-white'}`}
                    >
                        Customer
                    </button>
                    <button
                        onClick={() => setActiveTab('mechanic')}
                        className={`flex-1 py-2.5 text-center text-sm font-semibold rounded-lg transition-colors relative z-10 ${activeTab === 'mechanic' ? 'text-white' : 'text-light-gray hover:text-white'}`}
                    >
                        Mechanic
                    </button>
                </div>

                {activeTab === 'customer' ? (
                    <div className="animate-fadeIn">
                        <form onSubmit={handleCustomerLogin} noValidate className="space-y-5">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-light-gray ml-1">Email Address</label>
                                <input
                                    type="email"
                                    name="email"
                                    placeholder="name@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className={`w-full px-4 py-3.5 glass-input rounded-xl focus:outline-none focus:ring-2 ${errors.email ? 'border-red-500 ring-red-500/20' : 'focus:border-primary/50 focus:ring-primary/20'}`}
                                />
                                {errors.email && <p className="text-red-400 text-xs ml-1">{errors.email}</p>}
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-light-gray ml-1">Password</label>
                                <input
                                    type="password"
                                    name="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className={`w-full px-4 py-3.5 glass-input rounded-xl focus:outline-none focus:ring-2 ${errors.password ? 'border-red-500 ring-red-500/20' : 'focus:border-primary/50 focus:ring-primary/20'}`}
                                />
                                {errors.password && <p className="text-red-400 text-xs ml-1">{errors.password}</p>}
                            </div>

                            {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-center text-sm">{error}</div>}

                            <button
                                type="submit"
                                disabled={anyLoading}
                                className="w-full bg-gradient-to-r from-primary to-orange-600 text-white font-bold py-3.5 rounded-xl hover:shadow-lg hover:shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {anyLoading ? <Spinner size="sm" color="text-white" /> : 'Sign In'}
                            </button>
                        </form>

                        <div className="relative flex py-6 items-center">
                            <div className="flex-grow border-t border-white/10"></div>
                            <span className="flex-shrink mx-4 text-gray-500 text-xs font-medium uppercase tracking-wider">Or continue with</span>
                            <div className="flex-grow border-t border-white/10"></div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={handleGoogleLogin} disabled={anyLoading} className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/5 text-white font-medium py-3 rounded-xl transition-all duration-200 disabled:opacity-50">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C42.022,35.244,44,30.036,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path></svg>
                                Google
                            </button>
                            <button onClick={handleFacebookLogin} disabled={anyLoading} className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/5 text-white font-medium py-3 rounded-xl transition-all duration-200 disabled:opacity-50">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5"><path fill="#039be5" d="M24 5A19 19 0 1 0 24 43A19 19 0 1 0 24 5Z"></path><path fill="#fff" d="M26.572,29.036h4.917l0.772-4.995h-5.69v-2.73c0-2.075,0.678-3.915,2.619-3.915h3.119v-4.359c-0.548-0.074-1.707-0.236-3.897-0.236c-4.573,0-7.254,2.415-7.254,7.917v3.323h-4.701v4.995h4.701v13.729C22.089,42.905,23.032,43,24,43c0.875,0,1.729-0.08,2.572-0.194V29.036z"></path></svg>
                                Facebook
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="animate-fadeIn">
                        <form onSubmit={handleMechanicLogin} className="space-y-5">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-light-gray ml-1">Mechanic Email</label>
                                <input
                                    type="email"
                                    placeholder="mechanic@ridersbud.com"
                                    value={mechanicEmail}
                                    onChange={(e) => setMechanicEmail(e.target.value)}
                                    className="w-full px-4 py-3.5 bg-field/50 border border-white/5 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 focus:bg-field transition-all duration-200"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-light-gray ml-1">Password</label>
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    value={mechanicPassword}
                                    onChange={(e) => setMechanicPassword(e.target.value)}
                                    className="w-full px-4 py-3.5 bg-field/50 border border-white/5 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 focus:bg-field transition-all duration-200"
                                />
                            </div>

                            {mechanicError && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-center text-sm">{mechanicError}</div>}

                            <button
                                type="submit"
                                disabled={anyLoading}
                                className="w-full bg-gradient-to-r from-primary to-orange-600 text-white font-bold py-3.5 rounded-xl hover:shadow-lg hover:shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center disabled:opacity-70"
                            >
                                {anyLoading ? <Spinner size="sm" color="text-white" /> : 'Login as Mechanic'}
                            </button>
                        </form>
                    </div>
                )}

                <div className="mt-8 text-center">
                    <p className="text-light-gray text-sm">
                        Don't have an account?{' '}
                        <button onClick={() => navigate('/signup')} className="text-primary font-semibold hover:text-orange-400 transition-colors">
                            Sign up now
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginScreen;
