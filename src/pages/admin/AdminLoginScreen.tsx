import React, { useState } from 'react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useNavigate } from 'react-router-dom';
import Spinner from '../../components/Spinner';
import { useDatabase } from '../../context/DatabaseContext';
import { Lock, Mail, ArrowRight } from 'lucide-react';

const AdminLoginScreen: React.FC = () => {
    const { login } = useAdminAuth();
    const navigate = useNavigate();
    const { db } = useDatabase();
    const [email, setEmail] = useState('admin@ridersbud.com');
    const [password, setPassword] = useState('password');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (email === 'admin@ridersbud.com' && password === 'password') {
            setIsLoading(true);
            setTimeout(() => {
                login();
                navigate('/admin/dashboard');
            }, 1000);
        } else {
            setError('Invalid credentials. Please try again.');
        }
    };

    if (!db) {
        return <div className="flex items-center justify-center h-screen bg-[#111]"><Spinner size="lg" color="text-admin-accent" /></div>;
    }

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-[#111] relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-admin-accent/20 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>

            <div className="w-full max-w-md z-10 px-4">
                <div className="text-center mb-8">
                    {db.settings.appLogoUrl ? (
                        <img src={db.settings.appLogoUrl} alt="Logo" className="w-48 mb-6 max-h-24 object-contain mx-auto drop-shadow-glow" />
                    ) : (
                        <h1 className="text-5xl font-bold text-white mb-2 tracking-tight">{db.settings.appName}</h1>
                    )}
                    <p className="text-gray-400 font-medium tracking-wide uppercase text-sm">{db.settings.appTagline || 'Admin Panel Access'}</p>
                </div>

                <div className="glass-dark p-8 rounded-2xl shadow-2xl border border-white/10 backdrop-blur-xl">
                    <div className="mb-6 text-center">
                        <h2 className="text-2xl font-bold text-white mb-1">Welcome Back</h2>
                        <p className="text-gray-400 text-sm">Sign in to manage your platform</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-1">
                            <label className="block text-gray-300 text-xs font-bold uppercase tracking-wider ml-1" htmlFor="email">
                                Email Address
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-500 group-focus-within:text-admin-accent transition-colors" />
                                </div>
                                <input
                                    type="email"
                                    id="email"
                                    placeholder="admin@ridersbud.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-admin-accent/50 focus:border-admin-accent transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="block text-gray-300 text-xs font-bold uppercase tracking-wider ml-1" htmlFor="password">
                                Password
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-500 group-focus-within:text-admin-accent transition-colors" />
                                </div>
                                <input
                                    type="password"
                                    id="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-admin-accent/50 focus:border-admin-accent transition-all"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                                <p className="text-red-400 text-xs font-medium">{error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-admin-accent to-orange-600 text-white font-bold py-3.5 rounded-xl hover:shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-70 disabled:hover:scale-100 mt-2"
                        >
                            {isLoading ? <Spinner size="sm" color="text-white" /> : (
                                <>
                                    <span>Sign In</span>
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <div className="mt-8 text-center">
                    <p className="text-gray-600 text-xs">
                        &copy; {new Date().getFullYear()} {db.settings.appName}. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AdminLoginScreen;