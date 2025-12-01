import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useNavigate } from 'react-router-dom';
import Spinner from '../../components/Spinner';
import { useDatabase } from '../../context/DatabaseContext';
import { Lock, Mail, ArrowRight, Eye, EyeOff, Shield, Sparkles } from 'lucide-react';

const AdminLoginScreen: React.FC = () => {
    const { login } = useAdminAuth();
    const navigate = useNavigate();
    const { db } = useDatabase();
    const [email, setEmail] = useState('admin@ridersbud.com');
    const [password, setPassword] = useState('password');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    // Track mouse position for interactive glow effect
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setMousePosition({ x: e.clientX, y: e.clientY });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (email === 'admin@ridersbud.com' && password === 'password') {
            setIsLoading(true);
            setTimeout(() => {
                login();
                navigate('/admin/dashboard');
            }, 1500);
        } else {
            setError('Invalid credentials. Please try again.');
        }
    };

    if (!db) {
        return (
            <div className="flex items-center justify-center h-screen bg-gradient-to-br from-[#0a0a0a] via-[#111] to-[#0a0a0a]">
                <Spinner size="lg" color="text-admin-accent" />
            </div>
        );
    }

    return (
        <div className="relative flex items-center justify-center min-h-screen overflow-hidden bg-gradient-to-br from-[#0a0a0a] via-[#111] to-[#0a0a0a]">
            {/* Animated Background Grid */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute inset-0" style={{
                    backgroundImage: `
                        linear-gradient(rgba(249, 115, 22, 0.03) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(249, 115, 22, 0.03) 1px, transparent 1px)
                    `,
                    backgroundSize: '50px 50px',
                    maskImage: 'radial-gradient(ellipse at center, black 20%, transparent 70%)',
                    WebkitMaskImage: 'radial-gradient(ellipse at center, black 20%, transparent 70%)'
                }} />
            </div>

            {/* Dynamic Glow Orbs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div
                    className="absolute w-[600px] h-[600px] rounded-full blur-[120px] opacity-20 transition-all duration-1000 ease-out"
                    style={{
                        background: 'radial-gradient(circle, rgba(249, 115, 22, 0.4) 0%, transparent 70%)',
                        left: `${mousePosition.x - 300}px`,
                        top: `${mousePosition.y - 300}px`,
                    }}
                />
                <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-admin-accent/20 to-orange-600/10 blur-[100px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-blue-600/15 to-purple-600/10 blur-[100px] animate-pulse" style={{ animationDelay: '1.5s' }} />
                <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] rounded-full bg-gradient-to-br from-orange-500/10 to-red-600/5 blur-[80px] animate-pulse" style={{ animationDelay: '3s' }} />
            </div>

            {/* Floating Particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(20)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-1 h-1 bg-admin-accent/30 rounded-full animate-float"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 5}s`,
                            animationDuration: `${3 + Math.random() * 4}s`,
                        }}
                    />
                ))}
            </div>

            {/* Main Content */}
            <div className="relative z-10 w-full max-w-md px-6">
                {/* Logo & Branding */}
                <div className="text-center mb-10 animate-fadeIn">
                    <div className="inline-flex items-center justify-center w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-admin-accent to-orange-600 shadow-glow-lg relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <Shield className="w-10 h-10 text-white relative z-10" />
                        <Sparkles className="absolute top-1 right-1 w-4 h-4 text-yellow-300 animate-pulse" />
                    </div>

                    {db.settings.appLogoUrl ? (
                        <img src={db.settings.appLogoUrl} alt="Logo" className="w-48 mb-4 max-h-24 object-contain mx-auto drop-shadow-glow" />
                    ) : (
                        <h1 className="text-5xl font-bold text-white mb-3 tracking-tight bg-gradient-to-r from-white via-gray-100 to-white bg-clip-text text-transparent">
                            {db.settings.appName}
                        </h1>
                    )}
                    <p className="text-gray-400 font-semibold tracking-widest uppercase text-xs flex items-center justify-center gap-2">
                        <span className="w-8 h-px bg-gradient-to-r from-transparent to-admin-accent" />
                        Admin Panel Access
                        <span className="w-8 h-px bg-gradient-to-l from-transparent to-admin-accent" />
                    </p>
                </div>

                {/* Login Card */}
                <div className="relative group animate-scaleUp">
                    {/* Card Glow Effect */}
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-admin-accent to-orange-600 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-500" />

                    <div className="relative glass-card p-8 rounded-3xl border border-white/10 backdrop-blur-2xl shadow-2xl">
                        {/* Header */}
                        <div className="mb-8 text-center">
                            <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Welcome Back</h2>
                            <p className="text-gray-400 text-sm font-medium">Sign in to access your dashboard</p>
                        </div>

                        {/* Login Form */}
                        <form onSubmit={handleLogin} className="space-y-6">
                            {/* Email Field */}
                            <div className="space-y-2">
                                <label className="block text-gray-300 text-xs font-bold uppercase tracking-wider ml-1" htmlFor="email">
                                    Email Address
                                </label>
                                <div className="relative group/input">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                                        <Mail className={`h-5 w-5 transition-all duration-300 ${focusedField === 'email' ? 'text-admin-accent scale-110' : 'text-gray-500'
                                            }`} />
                                    </div>
                                    <input
                                        type="email"
                                        id="email"
                                        placeholder="admin@ridersbud.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        onFocus={() => setFocusedField('email')}
                                        onBlur={() => setFocusedField(null)}
                                        className="w-full pl-12 pr-4 py-4 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-admin-accent/50 focus:border-admin-accent/50 focus:bg-black/60 transition-all duration-300 hover:border-white/20"
                                    />
                                    {focusedField === 'email' && (
                                        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-admin-accent/10 to-orange-600/10 -z-10 blur-sm" />
                                    )}
                                </div>
                            </div>

                            {/* Password Field */}
                            <div className="space-y-2">
                                <label className="block text-gray-300 text-xs font-bold uppercase tracking-wider ml-1" htmlFor="password">
                                    Password
                                </label>
                                <div className="relative group/input">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                                        <Lock className={`h-5 w-5 transition-all duration-300 ${focusedField === 'password' ? 'text-admin-accent scale-110' : 'text-gray-500'
                                            }`} />
                                    </div>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        id="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        onFocus={() => setFocusedField('password')}
                                        onBlur={() => setFocusedField(null)}
                                        className="w-full pl-12 pr-12 py-4 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-admin-accent/50 focus:border-admin-accent/50 focus:bg-black/60 transition-all duration-300 hover:border-white/20"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center z-10 text-gray-500 hover:text-admin-accent transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                    {focusedField === 'password' && (
                                        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-admin-accent/10 to-orange-600/10 -z-10 blur-sm" />
                                    )}
                                </div>
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3 animate-fadeIn backdrop-blur-sm">
                                    <div className="w-2 h-2 rounded-full bg-red-500 mt-1 animate-pulse" />
                                    <p className="text-red-400 text-sm font-medium flex-1">{error}</p>
                                </div>
                            )}

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="relative w-full group/button overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-admin-accent via-orange-600 to-admin-accent bg-[length:200%_100%] animate-shimmer rounded-xl" />
                                <div className="relative bg-gradient-to-r from-admin-accent to-orange-600 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-glow transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-70 disabled:hover:scale-100 disabled:cursor-not-allowed">
                                    {isLoading ? (
                                        <>
                                            <Spinner size="sm" color="text-white" />
                                            <span>Signing In...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="text-lg">Sign In</span>
                                            <ArrowRight className="w-5 h-5 group-hover/button:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </div>
                            </button>
                        </form>

                        {/* Additional Info */}
                        <div className="mt-6 pt-6 border-t border-white/10">
                            <p className="text-center text-gray-500 text-xs">
                                Protected by enterprise-grade security
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-8 text-center animate-fadeIn" style={{ animationDelay: '0.2s' }}>
                    <p className="text-gray-600 text-xs font-medium">
                        &copy; {new Date().getFullYear()} {db.settings.appName}. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AdminLoginScreen;