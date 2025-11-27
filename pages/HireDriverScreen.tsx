import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';

const TierCard: React.FC<{ title: string; price: string; description: string; }> = ({ title, price, description }) => (
    <div className="bg-dark-gray p-4 rounded-lg border border-field">
        <h3 className="font-bold text-white text-lg">{title}</h3>
        <p className="text-primary font-bold text-2xl my-2">{price}</p>
        <p className="text-sm text-light-gray">{description}</p>
    </div>
);

const Feature: React.FC<{ icon: React.ReactNode; title: string; description: string; }> = ({ icon, title, description }) => (
    <div className="flex items-start gap-4">
        <div className="bg-primary/20 text-primary p-3 rounded-full flex-shrink-0">{icon}</div>
        <div>
            <h4 className="font-semibold text-white">{title}</h4>
            <p className="text-sm text-light-gray">{description}</p>
        </div>
    </div>
);

const HowItWorksStep: React.FC<{ step: number; title: string; description: string; }> = ({ step, title, description }) => (
    <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-field text-primary font-bold flex items-center justify-center flex-shrink-0">{step}</div>
        <div>
            <h4 className="font-semibold text-white">{title}</h4>
            <p className="text-sm text-light-gray">{description}</p>
        </div>
    </div>
);

const HireDriverScreen: React.FC = () => {
    const navigate = useNavigate();

    const handleBookNow = () => {
        // The service ID for "Driver for Hire" is '7'
        navigate('/booking/7');
    };

    return (
        <div className="flex flex-col h-full bg-secondary">
            <Header title="Hire a Driver" showBackButton />
            <div className="flex-grow overflow-y-auto">
                <div className="relative">
                    <img 
                        src="https://storage.googleapis.com/aistudio-hosting/generative-ai/e499715a-a38f-4d32-80f2-9b2512f7a6b2/assets/driver_hero.png" 
                        alt="Professional driver" 
                        className="w-full h-48 object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-secondary to-transparent"></div>
                </div>

                <div className="p-6 -mt-10 relative z-10 space-y-6">
                    <div className="text-center">
                        <h1 className="text-3xl font-bold text-white">Your Professional Driver on Demand</h1>
                        <p className="text-light-gray mt-2">Safe, reliable, and professional drivers for any occasion. Sit back and relax, we'll handle the driving.</p>
                    </div>

                    {/* Pricing Tiers */}
                    <div className="space-y-4">
                        <TierCard 
                            title="Hourly Rate"
                            price="₱800/hr"
                            description="Perfect for quick errands, business meetings, or short trips around the city. Minimum of 2 hours."
                        />
                         <TierCard 
                            title="Daily Rate (8 Hours)"
                            price="₱4,500"
                            description="Ideal for a full day of activities, out-of-town trips, or when you need a driver on standby."
                        />
                         <TierCard 
                            title="Airport Transfer"
                            price="₱2,500"
                            description="Fixed-rate travel to or from the airport. Avoid surge pricing and travel with peace of mind."
                        />
                    </div>
                    
                    {/* Why Choose Us */}
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-4">Why Choose Our Drivers?</h2>
                        <div className="space-y-4">
                             <Feature 
                                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>}
                                title="Vetted & Professional"
                                description="All our drivers undergo rigorous background checks and training to ensure your safety and comfort."
                            />
                            <Feature 
                                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                                title="Safe & Reliable"
                                description="Punctuality and defensive driving are our top priorities. You'll always get to your destination safely and on time."
                            />
                            <Feature 
                                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                                title="All-Occasion Service"
                                description="Whether it's a business trip, a family outing, a special event, or just a designated driver for a night out."
                            />
                        </div>
                    </div>

                    {/* How It Works */}
                     <div>
                        <h2 className="text-xl font-semibold text-white mb-4">How It Works</h2>
                        <div className="space-y-4">
                            <HowItWorksStep 
                                step={1}
                                title="Select Your Service"
                                description="Choose the pricing plan that best fits your needs for the day."
                            />
                             <HowItWorksStep 
                                step={2}
                                title="Provide Details"
                                description="Set your desired date, time, and pick-up location through our easy booking form."
                            />
                             <HowItWorksStep 
                                step={3}
                                title="Confirm & Relax"
                                description="Your professional driver is booked. We'll handle the rest, just be ready at your pick-up time!"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-4 bg-[#1D1D1D] border-t border-dark-gray flex-shrink-0">
                <button 
                    onClick={handleBookNow} 
                    className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-orange-600 transition-all duration-300 ease-in-out transform hover:scale-[1.03] hover:shadow-lg hover:shadow-primary/40 active:scale-100"
                >
                    Book a Driver Now
                </button>
            </div>
        </div>
    );
};

export default HireDriverScreen;