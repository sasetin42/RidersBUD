
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { mockServices } from '../data/mockData';
import { getAIServiceSuggestions } from '../services/geminiService';
import Spinner from '../components/Spinner';

interface AISuggestion {
    serviceName: string;
    reason: string;
}

const HomeScreen: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const featuredServices = mockServices.slice(0, 4);
    
    const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
    const [isLoadingAI, setIsLoadingAI] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);

    const handleGetSuggestions = async () => {
        if (!user || !user.vehicles[0]) return;
        setIsLoadingAI(true);
        setAiSuggestions([]);
        setAiError(null);
        try {
            // Mock service history
            const serviceHistory = ['Oil Change (6 months ago)', 'Tire Rotation (1 year ago)'];
            const suggestions = await getAIServiceSuggestions(user.vehicles[0], serviceHistory);
            setAiSuggestions(suggestions);
        } catch (error) {
             if (error instanceof Error) {
                setAiError(error.message);
            } else {
                setAiError("An unknown error occurred while fetching suggestions.");
            }
        } finally {
            setIsLoadingAI(false);
        }
    };

    return (
        <div className="bg-secondary min-h-full">
            <div className="p-6">
                <h1 className="text-3xl font-bold text-white">Welcome, {user?.name.split(' ')[0]}!</h1>
                <p className="text-light-gray">How can we help your vehicle today?</p>
            </div>

            <div className="px-6 mb-6">
                <button onClick={() => navigate('/services')} className="w-full bg-primary text-white font-bold py-4 rounded-lg text-lg hover:bg-orange-600 transition duration-300">
                    Book a Service
                </button>
            </div>

            <div className="px-6">
                <h2 className="text-xl font-semibold mb-4">Featured Services</h2>
                <div className="grid grid-cols-2 gap-4">
                    {featuredServices.map(service => (
                        <div key={service.id} onClick={() => navigate(`/service/${service.id}`)} className="bg-dark-gray rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-700 transition">
                            <img src={service.imageUrl} alt={service.name} className="w-16 h-16 rounded-full mb-2 object-cover" />
                            <p className="text-sm font-medium text-center">{service.name}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="px-6 mt-8">
                 <h2 className="text-xl font-semibold mb-4">AI Service Suggestions</h2>
                 <button 
                    onClick={handleGetSuggestions} 
                    disabled={isLoadingAI}
                    className="w-full bg-field text-white font-bold py-3 rounded-lg hover:bg-gray-600 transition duration-300 disabled:opacity-50 flex items-center justify-center"
                >
                    {isLoadingAI ? <Spinner size="sm" color="text-white" /> : 'Get AI Suggestions'}
                </button>
                {aiError && (
                    <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                        <p className="font-semibold">Oops! Something went wrong.</p>
                        <p>{aiError}</p>
                    </div>
                )}
                {aiSuggestions && aiSuggestions.length > 0 && (
                     <div className="mt-4 space-y-3">
                        {aiSuggestions.map((suggestion, index) => (
                            <div key={index} className="bg-dark-gray p-4 rounded-lg">
                                <h4 className="font-bold text-primary">{suggestion.serviceName}</h4>
                                <p className="text-sm text-light-gray">{suggestion.reason}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default HomeScreen;
