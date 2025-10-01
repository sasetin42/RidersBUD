import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Spinner from '../components/Spinner';
import { getSettings } from '../data/mockData';

const LoginScreen: React.FC = () => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const settings = getSettings();

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        // In a real app, you'd validate credentials
        if (email && password) {
            setIsLoading(true);
            setTimeout(() => {
                login();
                // No need to set isLoading to false as we navigate away
            }, 1000);
        } else {
            alert("Please enter email and password.");
        }
    };
    
    const handleSocialLogin = () => {
        setIsLoading(true);
        setTimeout(() => {
            login();
        }, 1000);
    };

    return (
        <div className="flex flex-col items-center justify-center h-full bg-secondary p-8">
            {settings.authLogoUrl ? (
                <img src={settings.authLogoUrl} alt="Logo" className="w-48 mb-8 max-h-24 object-contain" />
            ) : (
                <h1 className="text-5xl font-bold text-primary mb-4">{settings.loginTitle || 'RidersBUD'}</h1>
            )}
            <p className="text-light-gray mb-12">{settings.loginSubtitle || 'Sign in to continue'}</p>
            
            <div className="w-full max-w-sm">
                <form onSubmit={handleLogin}>
                    <div className="mb-4">
                        <input 
                            type="email" 
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 bg-field border border-dark-gray rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                    <div className="mb-6">
                        <input 
                            type="password" 
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 bg-field border border-dark-gray rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                    
                    <button 
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-orange-600 transition duration-300 flex items-center justify-center disabled:opacity-70"
                    >
                        {isLoading ? <Spinner size="sm" color="text-white"/> : 'Login'}
                    </button>
                </form>

                <div className="relative flex py-5 items-center">
                    <div className="flex-grow border-t border-dark-gray"></div>
                    <span className="flex-shrink mx-4 text-light-gray text-xs">OR</span>
                    <div className="flex-grow border-t border-dark-gray"></div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                     <button
                        onClick={handleSocialLogin}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-2 bg-field text-white font-bold py-3 rounded-lg hover:bg-gray-700 transition duration-300 disabled:opacity-70"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-6 h-6">
                            <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
                            <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
                            <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
                            <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C42.022,35.244,44,30.036,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
                        </svg>
                        Google
                    </button>
                     <button
                        onClick={handleSocialLogin}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-2 bg-field text-white font-bold py-3 rounded-lg hover:bg-gray-700 transition duration-300 disabled:opacity-70"
                    >
                         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-6 h-6">
                            <path fill="#039be5" d="M24 5A19 19 0 1 0 24 43A19 19 0 1 0 24 5Z"></path>
                            <path fill="#fff" d="M26.572,29.036h4.917l0.772-4.995h-5.69v-2.73c0-2.075,0.678-3.915,2.619-3.915h3.119v-4.359c-0.548-0.074-1.707-0.236-3.897-0.236c-4.573,0-7.254,2.415-7.254,7.917v3.323h-4.701v4.995h4.701v13.729C22.089,42.905,23.032,43,24,43c0.875,0,1.729-0.08,2.572-0.194V29.036z"></path>
                        </svg>
                        Facebook
                    </button>
                </div>
            </div>

            <div className="mt-8 text-center">
                <p className="text-light-gray">
                    Don't have an account?{' '}
                    <button onClick={() => navigate('/signup')} className="text-primary font-semibold hover:underline">
                        Sign up
                    </button>
                </p>
            </div>
        </div>
    );
};

export default LoginScreen;