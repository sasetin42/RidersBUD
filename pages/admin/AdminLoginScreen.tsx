
import React, { useState } from 'react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useNavigate } from 'react-router-dom';
import Spinner from '../../components/Spinner';

const AdminLoginScreen: React.FC = () => {
    const { login } = useAdminAuth();
    const navigate = useNavigate();
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

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-secondary p-8">
            <h1 className="text-5xl font-bold text-primary mb-4">RidersBUD</h1>
            <p className="text-light-gray mb-12">Admin Panel Login</p>
            
            <div className="w-full max-w-sm bg-dark-gray p-8 rounded-lg shadow-lg">
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
                            className="w-full px-4 py-3 bg-field border border-dark-gray rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-2 focus:ring-primary"
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
                            className="w-full px-4 py-3 bg-field border border-dark-gray rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-2 focus:ring-primary"
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
    );
};

export default AdminLoginScreen;
