import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useNavigate } from 'react-router-dom';
import Spinner from '../../components/Spinner';
import { useDatabase } from '../../context/DatabaseContext';
import { Shield, Lock, Mail, ArrowRight, AlertCircle, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

const AdminLoginScreen: React.FC = () => {
    const { login } = useAdminAuth();
    const navigate = useNavigate();
    const { db } = useDatabase();
    const [email, setEmail] = useState('admin@ridersbud.com');
    const [password, setPassword] = useState('password');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isFocused, setIsFocused] = useState<string | null>(null);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        // Simulate network delay for a more "robust" feel
        setTimeout(() => {
            if (email === 'admin@ridersbud.com' && password === 'password') {
                login();
                navigate('/admin/dashboard');
            } else {
                setIsLoading(false);
                setError('Invalid credentials. Access denied.');
            }
        }, 1500);
    };

    if (!db) {
        return <div className="flex items-center justify-center h-screen bg-[#0a0a0a]"><Spinner size="lg" /></div>;
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-primary/30 selection:text-white">
            {/* Background Ambience & Grid */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Grid Pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

                {/* Radial Gradients */}
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] opacity-50 animate-pulse"></div>
                <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] opacity-50 animate-pulse delay-1000"></div>

                {/* Vignette */}
                <div className="absolute inset-0 bg-radial-gradient-to-t from-[#0a0a0a] via-transparent to-[#0a0a0a]/80"></div>
            </div>

            <div className="w-full max-w-[420px] z-10 relative">

                {/* Logo Section */}
                <div className="text-center mb-10 space-y-4 animate-slideInUp">
                    <div className="relative inline-block">
                        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full"></div>
                        <div className="relative w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-white/10 flex items-center justify-center shadow-2xl shadow-black/50 overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <Shield className="w-10 h-10 text-primary drop-shadow-[0_0_8px_rgba(254,120,3,0.5)]" />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-3xl font-bold text-white tracking-tight">Admin Portal</h1>
                        <p className="text-gray-500 text-sm font-medium">Verify your identity to proceed</p>
                    </div>
                </div>

                {/* Login Card */}
                <div className="relative bg-[#121212]/80 backdrop-blur-2xl rounded-2xl border border-white/5 shadow-2xl overflow-hidden animate-fadeIn">

                    {/* Top Accent Line */}
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-70"></div>

                    <div className="p-8 space-y-6">

                        {/* Error Notification */}
                        {error && (
                            <div className="animate-fadeIn relative overflow-hidden rounded-lg bg-red-500/5 border border-red-500/20 p-4 mb-6">
                                <div className="flex items-start gap-4">
                                    <div className="p-2 bg-red-500/10 rounded-full">
                                        <AlertCircle size={18} className="text-red-500" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-red-500 font-semibold text-sm mb-1">Authentication Failed</h4>
                                        <p className="text-red-400/80 text-xs">{error}</p>
                                    </div>
                                </div>
                                <div className="absolute bottom-0 left-0 h-[2px] bg-red-500/50 animate-[shrink_2s_linear_forwards]" style={{ width: '100%' }}></div>
                            </div>
                        )}

                        <form onSubmit={handleLogin} className="space-y-6">

                            {/* Email Input */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-400 ml-1 uppercase tracking-wider">Email Address</label>
                                <div className={`relative group transition-all duration-300 ${isFocused === 'email' ? 'scale-[1.01]' : ''}`}>
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Mail className={`h-5 w-5 transition-colors duration-300 ${isFocused === 'email' ? 'text-primary' : 'text-gray-500'}`} />
                                    </div>
                                    <input
                                        type="email"
                                        placeholder="admin@ridersbud.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        onFocus={() => setIsFocused('email')}
                                        onBlur={() => setIsFocused(null)}
                                        className="block w-full pl-12 pr-4 py-4 bg-[#0a0a0a]/50 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all font-medium sm:text-sm shadow-inner"
                                    />
                                </div>
                            </div>

                            {/* Password Input */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-400 ml-1 uppercase tracking-wider">Password</label>
                                <div className={`relative group transition-all duration-300 ${isFocused === 'password' ? 'scale-[1.01]' : ''}`}>
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock className={`h-5 w-5 transition-colors duration-300 ${isFocused === 'password' ? 'text-primary' : 'text-gray-500'}`} />
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        onFocus={() => setIsFocused('password')}
                                        onBlur={() => setIsFocused(null)}
                                        className="block w-full pl-12 pr-12 py-4 bg-[#0a0a0a]/50 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all font-medium sm:text-sm shadow-inner"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-white transition-colors cursor-pointer"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full relative overflow-hidden group bg-gradient-to-r from-primary to-orange-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed border border-white/10"
                                >
                                    <div className="absolute inset-0 bg-white/20 translate-y-[100%] group-hover:translate-y-[0%] transition-transform duration-500 ease-out origin-bottom skew-y-12"></div>
                                    <div className="relative flex items-center justify-center gap-2">
                                        {isLoading ? (
                                            <>
                                                <Spinner size="sm" color="text-white" />
                                                <span>Verifying Credentials...</span>
                                            </  >
                                        ) : (
                                            <>
                                                <span>Access Dashboard</span>
                                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                            </>
                                        )}
                                    </div>
                                </button>
                            </div>

                        </form>
                    </div>

                    {/* Footer / Ambient Detail */}
                    <div className="bg-[#0a0a0a]/30 p-4 text-center border-t border-white/5 backdrop-blur-sm">
                        <p className="text-xs text-gray-600 flex items-center justify-center gap-2">
                            <Lock size={12} />
                            Encrypted & Secure Connection
                        </p>
                    </div>
                </div>

                <div className="text-center mt-8 opacity-60">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">
                        {new Date().getFullYear()} {db.settings.appName || 'RidersBud'} Admin System
                    </p>
                </div>

            </div>
        </div>
    );
};

export default AdminLoginScreen;