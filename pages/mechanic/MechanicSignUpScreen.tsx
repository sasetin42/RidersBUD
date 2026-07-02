import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Spinner from '../../components/Spinner';
import { useMechanicAuth } from '../../context/MechanicAuthContext';
import { fileToBase64 } from '../../utils/fileUtils';

const MechanicSignUpScreen: React.FC = () => {
    const { register, loading: authLoading } = useMechanicAuth();
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        bio: '',
        specializations: '',
        basePrice: '',
    });
    const [portfolioFiles, setPortfolioFiles] = useState<File[]>([]);
    const [portfolioPreviews, setPortfolioPreviews] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files) as File[];
            setPortfolioFiles(prev => [...prev, ...files]);
            
            const newPreviews = await Promise.all(files.map(f => fileToBase64(f)));
            setPortfolioPreviews(prev => [...prev, ...newPreviews]);
        }
    };

    const removePortfolioImage = (index: number) => {
        setPortfolioFiles(prev => prev.filter((_, i) => i !== index));
        setPortfolioPreviews(prev => prev.filter((_, i) => i !== index));
    };
    
    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!formData.name || !formData.email || !formData.phone || !formData.password) {
            setError("Please fill in all required fields.");
            return;
        }
        
        setIsLoading(true);
        try {
            await register({
                ...formData,
                basePrice: formData.basePrice ? Number(formData.basePrice) : undefined,
                specializations: formData.specializations.split(',').map(s => s.trim()).filter(Boolean),
                portfolioImages: [],
                imageUrl: 'https://picsum.photos/seed/newmech/200/200',
                lat: 14.55 + (Math.random() - 0.5) * 0.1,
                lng: 121.02 + (Math.random() - 0.5) * 0.1,
                registrationDate: new Date().toISOString().split('T')[0],
                birthday: '',
            }, undefined, undefined, portfolioFiles);
            setIsSuccess(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    if (isSuccess) {
        return (
             <div className="flex flex-col items-center justify-center h-full bg-secondary p-8 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-green-400 mb-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <h1 className="text-3xl font-bold text-white mb-4">Application Submitted!</h1>
                <p className="text-light-gray mb-8">Thank you for registering. Your profile is now under review by our admin team. You will be notified via email once your account is approved.</p>
                <button onClick={() => navigate('/login', { state: { from: 'mechanic' } })} className="w-full max-w-sm bg-primary text-white font-bold py-3 rounded-lg hover:bg-orange-600 transition">
                    Back to Login
                </button>
            </div>
        );
    }

    const anyLoading = isLoading;

    return (
        <div className="flex flex-col h-full bg-secondary p-8 overflow-y-auto">
            <div className="w-full max-w-md mx-auto">
                <div className="text-center mb-10">
                    <h1 className="text-5xl font-bold text-primary mb-4">Become a Partner</h1>
                    <p className="text-light-gray">Join our network of professional mechanics.</p>
                </div>
            
                <form onSubmit={handleSignUp} className="space-y-4">
                    <input id="mechanic-signup-name" name="mechanic-signup-name" type="text" placeholder="Full Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 bg-field border border-dark-gray rounded-lg text-white placeholder-light-gray focus:outline-none focus:border-white/20 transition-all" required />
                    <input id="mechanic-signup-email" name="mechanic-signup-email" type="email" placeholder="Email Address" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-3 bg-field border border-dark-gray rounded-lg text-white placeholder-light-gray focus:outline-none focus:border-white/20 transition-all" required />
                    <input id="mechanic-signup-phone" name="mechanic-signup-phone" type="tel" placeholder="Phone Number" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-3 bg-field border border-dark-gray rounded-lg text-white placeholder-light-gray focus:outline-none focus:border-white/20 transition-all" required />
                    <div className="relative">
                        <input id="mechanic-signup-password" name="mechanic-signup-password" type={showPassword ? 'text' : 'password'} placeholder="Password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full px-4 py-3 pr-12 bg-field border border-dark-gray rounded-lg text-white placeholder-light-gray focus:outline-none focus:border-white/20 transition-all" required />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-primary transition-colors">
                            {showPassword ? <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
                        </button>
                    </div>
                    <textarea id="mechanic-signup-bio" name="mechanic-signup-bio" placeholder="Short Bio (Tell customers about yourself)" value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} rows={3} className="w-full px-4 py-3 bg-field border border-dark-gray rounded-lg text-white placeholder-light-gray focus:outline-none focus:border-white/20 transition-all" />
                    <input id="mechanic-signup-specializations" name="mechanic-signup-specializations" type="text" placeholder="Specializations (comma-separated, e.g., Brakes, Toyota)" value={formData.specializations} onChange={e => setFormData({...formData, specializations: e.target.value})} className="w-full px-4 py-3 bg-field border border-dark-gray rounded-lg text-white placeholder-light-gray focus:outline-none focus:border-white/20 transition-all" />
                    <input id="mechanic-signup-price" name="mechanic-signup-price" type="number" placeholder="Base Service Price (optional)" value={formData.basePrice} onChange={e => setFormData({...formData, basePrice: e.target.value})} className="w-full px-4 py-3 bg-field border border-dark-gray rounded-lg text-white placeholder-light-gray focus:outline-none focus:border-white/20 transition-all" />
                    <div>
                        <label className="block text-sm font-medium text-light-gray mb-2">Portfolio/Work Images (optional)</label>
                        <input 
                            type="file" 
                            ref={fileInputRef}
                            onChange={handleFileChange} 
                            multiple 
                            accept="image/*" 
                            className="w-full text-sm text-light-gray file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" 
                        />
                        <div className="mt-2 flex flex-wrap gap-2">
                            {portfolioPreviews.map((img, i) => (
                                <div key={i} className="relative">
                                    <img src={img} className="h-16 w-16 rounded-md object-cover" alt="portfolio preview"/>
                                    <button
                                        type="button"
                                        onClick={() => removePortfolioImage(i)}
                                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {error && <p className="text-red-400 text-center text-sm">{error}</p>}
                    
                    <button type="submit" disabled={anyLoading} className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-orange-600 transition duration-300 flex items-center justify-center disabled:opacity-70">
                        {anyLoading ? <Spinner size="sm" color="text-white"/> : 'Submit Application'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-light-gray">
                        Already have an account?{' '}
                        <button onClick={() => navigate('/login', { state: { from: 'mechanic' } })} className="text-primary font-semibold hover:underline">
                            Sign In
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default MechanicSignUpScreen;
