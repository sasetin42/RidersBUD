import React, { useState } from 'react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useDatabase } from '../../context/DatabaseContext';
import { useNavigate } from 'react-router-dom';
import Spinner from '../../components/Spinner';
import { Eye, EyeOff, Lock, Mail, Shield } from 'lucide-react';

const AdminLoginScreen: React.FC = () => {
    const { login } = useAdminAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await login(email, password);
            navigate('/admin-portal/dashboard');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Invalid credentials. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const { db } = useDatabase();
    const logoUrl = db?.settings?.adminLoginLogoUrl || db?.settings?.appLogoUrl || '/riders-logo.png';

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0A0A0A] via-[#121212] to-[#1A1A1A] p-4 relative overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
            </div>

            <div className="w-full max-w-md relative z-10">
                {/* Logo & Header */}
                <div className="text-center mb-5 animate-fadeIn">
                    {logoUrl ? (
                        <img src={logoUrl} alt="RidersBUD Admin Logo" className="w-60 h-auto object-contain mx-auto mb-2 mix-blend-screen" />
                    ) : (
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary to-orange-600 rounded-2xl mb-4 shadow-lg shadow-primary/20">
                            <Shield className="w-10 h-10 text-white" />
                        </div>
                    )}
                    <h1 className="text-3xl font-bold text-white mb-1">Admin Portal</h1>
                    <p className="text-gray-400">Trusted Car Care Wherever You Are</p>
                </div>

                {/* Login Card */}
                <div className="bg-[#1A1A1A]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl animate-slideUp">
                    <form onSubmit={handleLogin} className="space-y-6">
                        {/* Email Field */}
                        <div className="space-y-2">
                            <label htmlFor="adminEmail" className="block text-sm font-medium text-gray-300">Email Address</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Mail className="w-5 h-5 text-gray-500 group-focus-within:text-primary transition-colors" />
                                </div>
                                <input
                                    id="adminEmail"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 bg-[#0A0A0A]/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                                    placeholder="admin@ridersbud.com"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div className="space-y-2">
                            <label htmlFor="adminPassword" className="block text-sm font-medium text-gray-300">Password</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="w-5 h-5 text-gray-500 group-focus-within:text-primary transition-colors" />
                                </div>
                                <input
                                    id="adminPassword"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-12 pr-12 py-3.5 bg-[#0A0A0A]/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                                    placeholder="••••••••"
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
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-primary to-orange-600 text-white font-semibold py-3.5 rounded-xl hover:shadow-lg hover:shadow-primary/30 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center group"
                        >
                            {isLoading ? (
                                <Spinner size="sm" color="text-white" />
                            ) : (
                                <>
                                    <span>Access Dashboard</span>
                                    <Shield className="w-5 h-5 ml-2 group-hover:scale-110 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="mt-6 pt-6 border-t border-white/5">
                        <p className="text-center text-xs text-gray-500">
                            Protected by enterprise-grade security
                        </p>
                    </div>
                </div>

                {/* Additional Info */}
                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-500">
                        Need help? Contact <span className="text-primary">support@ridersbud.com</span>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AdminLoginScreen;
