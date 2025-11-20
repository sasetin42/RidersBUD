import React, { useState } from 'react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useNavigate } from 'react-router-dom';
import Spinner from '../../components/Spinner';
import { useDatabase } from '../../context/DatabaseContext';

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
        return <div className="flex items-center justify-center h-screen bg-secondary"><Spinner size="lg"/></div>;
    }

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-secondary p-8">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    {db.settings.appLogoUrl ? (
                        <img src={db.settings.appLogoUrl} alt="Logo" className="w-48 mb-4 max-h-24 object-contain mx-auto" />
                    ) : (
                        <h1 className="text-5xl font-bold text-primary mb-2">{db.settings.appName}</h1>
                    )}
                    <p className="text-light-gray">{db.settings.appTagline || 'Admin Panel Login'}</p>
                </div>
                
                <div className="bg-dark-gray p-8 rounded-lg shadow-lg">
                    <form onSubmit={handleLogin}>
                        <div className="mb-4">
                             <label className="block text-light-gray text-sm font-bold mb-2" htmlFor="email">
                                Email
                            </label>
                            <input 
                                type="email" 
                                id="email"
                                placeholder="admin@ridersbud.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 bg-field border border-gray-600 rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                        <div className="mb-6">
                            <label className="block text-light-gray text-sm font-bold mb-2" htmlFor="password">
                                Password
                            </label>
                            <input 
                                type="password" 
                                id="password"
                                placeholder="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-field border border-gray-600 rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                        
                        {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}

                        <button 
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-orange-600 transition duration-300 flex items-center justify-center disabled:opacity-70"
                        >
                            {isLoading ? <Spinner size="sm" color="text-white"/> : 'Login'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AdminLoginScreen;