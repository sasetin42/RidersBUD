import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Spinner from '../../components/Spinner';
import { useMechanicAuth } from '../../context/MechanicAuthContext';
import { fileToBase64 } from '../../utils/fileUtils';

const MechanicSignUpScreen: React.FC = () => {
    const { register, loading: authLoading } = useMechanicAuth();
    const navigate = useNavigate();
    
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        bio: '',
        specializations: '',
        basePrice: '',
    });
    const [portfolioImages, setPortfolioImages] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            const base64Promises = files.map((file: File) => fileToBase64(file));
            try {
                const base64Images = await Promise.all(base64Promises);
                setPortfolioImages(prev => [...prev, ...base64Images]);
            } catch (err) {
                setError("Failed to upload images. Please try again.");
            }
        }
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
            // Fix: Add missing 'registrationDate' and 'birthday' properties to satisfy the Mechanic type.
            await register({
                ...formData,
                basePrice: formData.basePrice ? Number(formData.basePrice) : undefined,
                specializations: formData.specializations.split(',').map(s => s.trim()).filter(Boolean),
                portfolioImages,
                // These are placeholders as they're not part of the form but required by the type
                imageUrl: 'https://picsum.photos/seed/newmech/200/200',
                lat: 14.55 + (Math.random() - 0.5) * 0.1,
                lng: 121.02 + (Math.random() - 0.5) * 0.1,
                registrationDate: new Date().toISOString().split('T')[0],
                birthday: '',
            });
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

    const anyLoading = isLoading || authLoading;

    return (
        <div className="flex flex-col h-full bg-secondary p-8 overflow-y-auto">
            <div className="w-full max-w-md mx-auto">
                <div className="text-center mb-10">
                    <h1 className="text-5xl font-bold text-primary mb-4">Become a Partner</h1>
                    <p className="text-light-gray">Join our network of professional mechanics.</p>
                </div>
            
                <form onSubmit={handleSignUp} className="space-y-4">
                    <input type="text" placeholder="Full Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 bg-field border border-dark-gray rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-2 focus:ring-primary" required />
                    <input type="email" placeholder="Email Address" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-3 bg-field border border-dark-gray rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-2 focus:ring-primary" required />
                    <input type="tel" placeholder="Phone Number" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-3 bg-field border border-dark-gray rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-2 focus:ring-primary" required />
                    <input type="password" placeholder="Password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full px-4 py-3 bg-field border border-dark-gray rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-2 focus:ring-primary" required />
                    <textarea placeholder="Short Bio (Tell customers about yourself)" value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} rows={3} className="w-full px-4 py-3 bg-field border border-dark-gray rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-2 focus:ring-primary" />
                    <input type="text" placeholder="Specializations (comma-separated, e.g., Brakes, Toyota)" value={formData.specializations} onChange={e => setFormData({...formData, specializations: e.target.value})} className="w-full px-4 py-3 bg-field border border-dark-gray rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-2 focus:ring-primary" />
                    <input type="number" placeholder="Base Service Price (optional)" value={formData.basePrice} onChange={e => setFormData({...formData, basePrice: e.target.value})} className="w-full px-4 py-3 bg-field border border-dark-gray rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-2 focus:ring-primary" />
                    <div>
                        <label className="block text-sm font-medium text-light-gray mb-2">Portfolio/Work Images (optional)</label>
                        <input type="file" onChange={handleFileChange} multiple accept="image/*" className="w-full text-sm text-light-gray file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
                        <div className="mt-2 flex flex-wrap gap-2">
                            {portfolioImages.map((img, i) => <img key={i} src={img} className="h-16 w-16 rounded-md object-cover" alt="portfolio preview"/>)}
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