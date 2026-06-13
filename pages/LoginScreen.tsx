
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useMechanicAuth } from '../context/MechanicAuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import Spinner from '../components/Spinner';
import { useDatabase } from '../context/DatabaseContext';
import { Eye, EyeOff, Mail, Lock, User, Wrench, ArrowRight } from 'lucide-react';
import SecurityDetailsModal from '../components/SecurityDetailsModal';


const LoginScreen: React.FC = () => {
    const { loginWithCredentials, loginWithGoogle, loginWithFacebook, loading: authLoading, isAuthenticated } = useAuth();
    const mechAuth = useMechanicAuth();
    const mechanicLogin = mechAuth?.login || (async () => {});
    const mechanicLoginWithGoogle = mechAuth?.loginWithGoogle || (async () => {});
    const mechanicAuthLoading = mechAuth?.loading ?? false;
    const isMechanicAuthenticated = mechAuth?.isMechanicAuthenticated ?? false;
    const navigate = useNavigate();
    const location = useLocation();
    const { db } = useDatabase();

    const [activeTab, setActiveTab] = useState<'customer' | 'mechanic'>('customer');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Customer state
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

    // Mechanic state
    const [mechanicEmail, setMechanicEmail] = useState('');
    const [mechanicPassword, setMechanicPassword] = useState('');
    const [mechanicError, setMechanicError] = useState('');

    useEffect(() => {
        if (location.state?.from === 'mechanic') {
            setActiveTab('mechanic');
            if (location.state.email) setMechanicEmail(location.state.email);
            if (location.state.password) setMechanicPassword(location.state.password);
        }
    }, [location.state]);

    useEffect(() => {
        if (isMechanicAuthenticated && !mechanicAuthLoading) {
            navigate('/mechanic-portal/dashboard', { replace: true });
        } else if (isAuthenticated && !authLoading) {
            navigate('/customer-portal/', { replace: true });
        }
    }, [isMechanicAuthenticated, isAuthenticated, mechanicAuthLoading, authLoading, navigate]);

    if (!db) {
        return <div className="flex items-center justify-center h-screen bg-gradient-to-br from-[#0A0A0A] via-[#121212] to-[#1A1A1A]"><Spinner size="lg" /></div>;
    }

    const { settings } = db;
    const logoUrl = settings.authLogoUrl || "/riders-logo.png";

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
            showSecurityModalFor('Customer');
        } catch (err) {
            // If a customer tries to login but the credentials belong to a mechanic,
            // show the MECHANIC security details modal.
            if (isLikelyCustomerToMechanicError(err)) {
                showSecurityModalFor('Mechanic');
            }
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
            showSecurityModalFor('Mechanic');
        } catch (err) {
            // If a mechanic-tab login is actually a customer account,
            // still show the SAME security details that the mechanic role uses.
            // (Required behavior: Customer credentials navigating to Mechanic portal
            // uses the mechanic security notification security modal.)
            if (isLikelyCustomerToMechanicError(err)) {
                // same modal (Mechanic)
                showSecurityModalFor('Mechanic');
            }
            setMechanicError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };


    const handleGoogleLogin = async () => {
        setError('');
        setIsLoading(true);
        sessionStorage.setItem('auth_type_hint', activeTab);
        try {
            if (activeTab === 'mechanic') {
                await mechanicLoginWithGoogle();
            } else {
                await loginWithGoogle();
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleFacebookLogin = async () => {
        setError('');
        setIsLoading(true);
        sessionStorage.setItem('auth_type_hint', activeTab);
        try {
            await loginWithFacebook();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    const [securityModalOpen, setSecurityModalOpen] = useState(false);
    const [securityModalRole, setSecurityModalRole] = useState<'Customer' | 'Mechanic'>('Customer');

    const shouldShowSecurityModal = (role: 'Customer' | 'Mechanic') => {
        const key = `security_modal_dismissed_${role.toLowerCase()}`;
        return !localStorage.getItem(key);
    };

    const showSecurityModalFor = (role: 'Customer' | 'Mechanic') => {
        setSecurityModalRole(role);
        setSecurityModalOpen(shouldShowSecurityModal(role));
    };

    const closeSecurityModal = () => {
        setSecurityModalOpen(false);
        localStorage.setItem(`security_modal_dismissed_${securityModalRole.toLowerCase()}`, 'true');
    };

    const isLikelyCustomerToMechanicError = (err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        return /mechanic/i.test(msg) || /account not found|invalid mechanic credentials|not found in mechanics/i.test(msg);
    };

    // Only use action-specific isLoading — auth context loading states can stay true during
    // initial Firebase Auth resolution and would permanently lock the UI.
    const anyLoading = isLoading;

    return (

        <div className="flex-1 w-full flex flex-col items-center justify-center bg-gradient-to-br from-[#0A0A0A] via-[#121212] to-[#1A1A1A] p-6 relative overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
            </div>

            <SecurityDetailsModal
                open={securityModalOpen}
                roleLabel={securityModalRole}
                onClose={closeSecurityModal}
            />

            <div className="w-full max-w-md relative z-10 py-8 flex flex-col">

                {/* Logo & Header */}
                <div className="text-center mb-8 animate-fadeIn">
                    {logoUrl ? (
                        <img src={logoUrl} alt="Riders Logo" className="w-64 mb-2 max-h-32 object-contain mx-auto mix-blend-screen" />
                    ) : (
                        <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-orange-600 bg-clip-text text-transparent mb-2">{settings.appName || 'Riders'}</h1>
                    )}
                    <p className="text-gray-400 text-lg">{settings.appTagline || 'Trusted Car Care Wherever You Are'}</p>
                </div>

                {/* Tab Switcher */}
                <div className="bg-[#1A1A1A]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-1.5 mb-6 flex gap-1 animate-slideUp">
                    <button
                        onClick={() => setActiveTab('customer')}
                        className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === 'customer'
                            ? 'bg-gradient-to-r from-primary to-orange-600 text-white shadow-lg shadow-primary/20'
                            : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        <User className="w-4 h-4" />
                        Customer
                    </button>
                    <button
                        onClick={() => setActiveTab('mechanic')}
                        className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === 'mechanic'
                            ? 'bg-gradient-to-r from-primary to-orange-600 text-white shadow-lg shadow-primary/20'
                            : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        <Wrench className="w-4 h-4" />
                        Mechanic
                    </button>
                </div>

                {/* Login Card */}
                <div className="bg-[#1A1A1A]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl animate-slideUp">
                    {activeTab === 'customer' ? (
                        <div>
                            <form onSubmit={handleCustomerLogin} noValidate className="space-y-5">
                                {/* Email Field */}
                                <div className="space-y-2">
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-300">Email Address</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Mail className="w-5 h-5 text-gray-500 group-focus-within:text-primary transition-colors" />
                                        </div>
                                        <input
                                            id="email"
                                            type="email"
                                            name="email"
                                            placeholder="you@example.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className={`w-full pl-12 pr-4 py-3.5 bg-[#0A0A0A]/50 border rounded-xl text-white placeholder-gray-500 outline-none transition-all focus:border-white/20 ${errors.email ? 'border-red-500' : 'border-white/10'}`}
                                        />
                                    </div>
                                    {errors.email && <p className="text-red-400 text-xs mt-1 animate-shake">{errors.email}</p>}
                                </div>

                                {/* Password Field */}
                                <div className="space-y-2">
                                    <label htmlFor="password" className="block text-sm font-medium text-gray-300">Password</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Lock className="w-5 h-5 text-gray-500 group-focus-within:text-primary transition-colors" />
                                        </div>
                                        <input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            name="password"
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className={`w-full pl-12 pr-12 py-3.5 bg-[#0A0A0A]/50 border rounded-xl text-white placeholder-gray-500 outline-none transition-all focus:border-white/20 ${errors.password ? 'border-red-500' : 'border-white/10'}`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-primary transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                    {errors.password && <p className="text-red-400 text-xs mt-1 animate-shake">{errors.password}</p>}
                                </div>

                                {/* Error Message */}
                                {error && (
                                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg animate-shake">
                                        <p className="text-red-400 text-sm text-center">{error}</p>
                                    </div>
                                )}

                                {/* Login Button */}
                                <button
                                    type="submit"
                                    disabled={anyLoading}
                                    className="w-full bg-gradient-to-r from-primary to-orange-600 text-white font-semibold py-3.5 rounded-xl hover:shadow-lg hover:shadow-primary/30 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center group"
                                >
                                    {anyLoading ? (
                                        <Spinner size="sm" color="text-white" />
                                    ) : (
                                        <>
                                            <span>Sign In</span>
                                            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </form>

                            {/* Divider */}
                            <div className="relative flex py-6 items-center">
                                <div className="flex-grow border-t border-white/10"></div>
                                <span className="flex-shrink mx-4 text-gray-500 text-xs font-medium">OR CONTINUE WITH</span>
                                <div className="flex-grow border-t border-white/10"></div>
                            </div>

                            {/* Social Login */}
                            <div className="grid grid-cols-2 gap-3">
                                <button
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
                        </div>
                    ) : (
                        <div>
                            <form onSubmit={handleMechanicLogin} className="space-y-5">
                                {/* Mechanic Email */}
                                <div className="space-y-2">
                                    <label htmlFor="mechanicEmail" className="block text-sm font-medium text-gray-300">Mechanic Email</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Mail className="w-5 h-5 text-gray-500 group-focus-within:text-primary transition-colors" />
                                        </div>
                                        <input
                                            id="mechanicEmail"
                                            type="email"
                                            placeholder="mechanic@example.com"
                                            value={mechanicEmail}
                                            onChange={(e) => setMechanicEmail(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3.5 bg-[#0A0A0A]/50 border border-white/10 rounded-xl text-white placeholder-gray-500 outline-none transition-all focus:border-white/20"
                                        />
                                    </div>
                                </div>

                                {/* Mechanic Password */}
                                <div className="space-y-2">
                                    <label htmlFor="mechanicPassword" className="block text-sm font-medium text-gray-300">Password</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Lock className="w-5 h-5 text-gray-500 group-focus-within:text-primary transition-colors" />
                                        </div>
                                        <input
                                            id="mechanicPassword"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            value={mechanicPassword}
                                            onChange={(e) => setMechanicPassword(e.target.value)}
                                            className="w-full pl-12 pr-12 py-3.5 bg-[#0A0A0A]/50 border border-white/10 rounded-xl text-white placeholder-gray-500 outline-none transition-all focus:border-white/20"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-primary transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Error Message */}
                                {mechanicError && (
                                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg animate-shake">
                                        <p className="text-red-400 text-sm text-center">{mechanicError}</p>
                                    </div>
                                )}

                                {/* Login Button */}
                                <button
                                    type="submit"
                                    disabled={anyLoading}
                                    className="w-full bg-gradient-to-r from-primary to-orange-600 text-white font-semibold py-3.5 rounded-xl hover:shadow-lg hover:shadow-primary/30 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center group"
                                >
                                    {anyLoading ? (
                                        <Spinner size="sm" color="text-white" />
                                    ) : (
                                        <>
                                            <Wrench className="w-5 h-5 mr-2" />
                                            <span>Sign In as Mechanic</span>
                                            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    )}
                </div>

                {/* Sign Up Link */}
                <div className="mt-4 text-center space-y-2">
                    <p className="text-gray-400">
                        Don't have an account?{' '}
                        <button onClick={() => navigate('/customer-portal/signup')} className="text-primary font-semibold hover:underline transition-all">
                            Create Account
                        </button>
                    </p>

                </div>
            </div>
        </div>
    );
};

export default LoginScreen;
