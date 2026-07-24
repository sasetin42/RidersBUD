import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDatabase } from '../../context/DatabaseContext';
import { ChevronLeft, CheckCircle2, ArrowRight, ShieldCheck, Clock, Tag, FileText, Info } from 'lucide-react';
import Spinner from '../../components/Spinner';

const AppServiceDetailScreen: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const { db, loading } = useDatabase();
    const navigate = useNavigate();

    const accentColor = db?.settings?.accentColor || '#FE7803';

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#0A0A0A]">
                <Spinner size="lg" />
            </div>
        );
    }

    const service = db?.appServices?.find(s => s.id === slug || s.slug === slug);

    if (!service) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#0A0A0A] text-white">
                <h1 className="text-2xl font-black">Service Not Found</h1>
                <button 
                    onClick={() => navigate('/customer-portal/app-services')}
                    className="mt-6 font-bold flex items-center gap-2"
                    style={{ color: accentColor }}
                >
                    <ChevronLeft size={16} /> Back to Services
                </button>
            </div>
        );
    }

    const isRentACar = service.id === 'rent-a-car' || service.slug === 'rent-a-car' || service.name.toLowerCase().includes('rent a car');
    const isDriverForHire = service.id === 'driver-for-hire' || service.slug === 'driver-for-hire' || service.name.toLowerCase().includes('driver for hire');

    const handleBookNow = () => {
        if (isRentACar) {
            navigate('/customer-portal/rent-a-car');
        } else if (isDriverForHire) {
            navigate('/customer-portal/hire-a-driver');
        } else if (service.name.toLowerCase().includes('registration')) {
            navigate(`/customer-portal/app-services/liaison-book/${service.id}`);
        } else {
            navigate(`/customer-portal/app-services/book/${service.id}`);
        }
    };

    // Dynamic mock details based on the service type
    const requirements = isRentACar
        ? ['Valid Driver\'s License (Philippine or International)', 'Two Valid Government-Issued IDs', 'Proof of Active Income / Employment', 'Refundable Security Deposit', 'Signed Rental Agreement']
        : isDriverForHire
        ? ['Valid Driver\'s License', 'Proof of Vehicle Ownership / Rental Agreement', 'Valid Government Issued ID']
        : service.name.toLowerCase().includes('registration')
        ? ['Original Certificate of Registration (CR)', 'Latest Official Receipt (OR) of Payment', 'Valid Government Issued ID', 'Compulsory Third Party Liability (CTPL) Insurance', 'Emission Test Certificate']
        : ['Valid Driver\'s License', 'Proof of Vehicle Ownership / Rental Agreement', 'Valid Government Issued ID'];

    const processSteps = isRentACar
        ? [
            { title: 'Select Vehicle', desc: 'Browse and choose your preferred car from our clean, premium fleet.' },
            { title: 'Submit Requirements', desc: 'Upload driver\'s license and required verification documents.' },
            { title: 'Dates & Confirmation', desc: 'Select pick-up/drop-off dates and secure payment.' },
            { title: 'Key Handover', desc: 'Inspect vehicle, collect the keys, and start your drive.' }
        ]
        : isDriverForHire
        ? [
            { title: 'Book a Driver', desc: 'Specify your pickup location, scheduled date, and shift duration.' },
            { title: 'Match Professional', desc: 'Our team assigns a certified, background-checked professional driver.' },
            { title: 'Driver Arrival', desc: 'Your designated driver arrives on time at your specified location.' },
            { title: 'Enjoy Your Ride', desc: 'Sit back and relax while our driver safely handles your vehicle.' }
        ]
        : [
            { title: 'Submit Documents', desc: 'Securely upload your requirements online.' },
            { title: 'Agent Assignment', desc: 'A verified liaison agent handles your request.' },
            { title: 'LTO Processing', desc: 'Direct submission and queuing at LTO branch.' },
            { title: 'Delivery & Release', desc: 'Get your official receipts and stickers.' }
        ];

    const serviceDuration = isRentACar ? 'Per Day' : isDriverForHire ? 'Hourly / Shift' : '1-2 Working Days';
    const serviceTypeDisplay = isRentACar ? 'Self-Drive / Chauffeur' : isDriverForHire ? 'Personal Chauffeur' : 'Full Assistance';
    const serviceGuarantee = isRentACar ? 'Fully Insured Fleet' : isDriverForHire ? '100% Certified Drivers' : '100% Safe Handling';
    const serviceDescription = isRentACar 
        ? 'Choose from our wide selection of clean, reliable, and fully-insured vehicles. Whether it is for a quick city errand, a weekend getaway, or long-term business use, we have the perfect ride for you. Complete with 24/7 roadside assistance.'
        : isDriverForHire
        ? 'Hire a professional, background-checked, and highly-trained driver to handle your vehicle. Perfect for long road trips, family events, medical appointments, business commutes, or when you just want to sit back and relax. Available for both hourly and full-day bookings.'
        : service.description;
    
    const serviceFeatures = isRentACar
        ? ['Insured Vehicles', 'Unlimited Mileage Option', 'Flexible Pick-up & Drop-off', '24/7 Roadside Assistance', 'Clean & Sanitized Fleet', 'No Hidden Fees']
        : isDriverForHire
        ? ['Background-Checked Drivers', 'Professional & Courteous Service', 'Flexible Shifts (Hourly/Daily)', 'GPS Monitored Trips', '24/7 Dispatch Support', 'Replacement Driver Guarantee']
        : service.features || [];

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white font-sans pb-32">
            {/* Hero Image Section (Compact Height) */}
            <div className="relative w-full h-[35vh] min-h-[280px]">
                <div 
                    className="absolute inset-0 mix-blend-overlay z-10"
                    style={{ backgroundColor: `${accentColor}1A` }}
                ></div>
                <img 
                    src={service.imageUrl || '/assets/logo.png'} 
                    alt={service.name} 
                    className="w-full h-full object-cover grayscale-[0.2] brightness-90"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/assets/logo.png'; }}
                />
                
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/50 to-transparent z-10"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A]/60 to-transparent z-10 h-24"></div>

                <button 
                    onClick={() => navigate(-1)}
                    className="absolute top-6 left-6 w-10 h-10 border border-white/10 bg-black/60 backdrop-blur-md flex items-center justify-center hover:bg-white/10 transition-colors z-20 rounded-xl"
                >
                    <ChevronLeft size={20} />
                </button>

                <div className="absolute bottom-0 left-0 w-full p-6 z-20 max-w-4xl mx-auto flex flex-col items-start">
                    {service.category && (
                        <span 
                            className="text-[9px] text-white font-black px-2.5 py-1 uppercase tracking-wider mb-2.5 inline-block rounded-md"
                            style={{ backgroundColor: accentColor }}
                        >
                            {service.category}
                        </span>
                    )}
                    <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-tight leading-[1.0] text-shadow">
                        {service.name}
                    </h1>
                </div>
            </div>

            {/* Content Section */}
            <div className="max-w-4xl mx-auto px-6 mt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-8">
                    {/* Quick Specs Cards */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-[#111113] border border-white/5 p-3 rounded-xl flex flex-col gap-1">
                            <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1"><Clock size={10} /> Duration</span>
                            <span className="text-xs font-bold text-white">{serviceDuration}</span>
                        </div>
                        <div className="bg-[#111113] border border-white/5 p-3 rounded-xl flex flex-col gap-1">
                            <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1"><Tag size={10} /> Service Type</span>
                            <span className="text-xs font-bold text-white">{serviceTypeDisplay}</span>
                        </div>
                        <div className="bg-[#111113] border border-white/5 p-3 rounded-xl flex flex-col gap-1">
                            <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1"><ShieldCheck size={10} /> Guarantee</span>
                            <span className="text-xs font-bold text-white">{serviceGuarantee}</span>
                        </div>
                    </div>

                    {/* Overview */}
                    <div>
                        <h2 
                            className="font-black text-xs uppercase tracking-widest mb-3 flex items-center gap-1.5"
                            style={{ color: accentColor }}
                        >
                            // Overview
                        </h2>
                        <p className="text-gray-300 text-xs leading-relaxed border-l-2 border-white/10 pl-4">
                            {serviceDescription}
                        </p>
                    </div>

                    {/* Key Features */}
                    {serviceFeatures && serviceFeatures.length > 0 && (
                        <div>
                            <h2 
                                className="font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-1.5"
                                style={{ color: accentColor }}
                            >
                                // Key Features
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                {serviceFeatures.map((feature, i) => (
                                    <div key={i} className="flex items-start gap-3 bg-[#111113] border border-white/5 p-3.5 rounded-xl group hover:border-white/10 transition-colors">
                                        <CheckCircle2 size={15} style={{ color: accentColor }} className="shrink-0 mt-0.5" />
                                        <span className="text-xs text-gray-300 font-medium leading-relaxed group-hover:text-white transition-colors">
                                            {feature}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Requirements Checklist */}
                    <div>
                        <h2 
                            className="font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-1.5"
                            style={{ color: accentColor }}
                        >
                            // Required Documents
                        </h2>
                        <div className="bg-[#111113]/50 border border-white/5 rounded-2xl p-4 space-y-3">
                            {requirements.map((req, i) => (
                                <div key={i} className="flex items-start gap-3 text-xs text-gray-300">
                                    <FileText size={14} className="text-gray-500 shrink-0 mt-0.5" />
                                    <span>{req}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Process Steps */}
                    <div>
                        <h2 
                            className="font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-1.5"
                            style={{ color: accentColor }}
                        >
                            // How It Works
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {processSteps.map((step, i) => (
                                <div key={i} className="bg-[#111113] border border-white/5 p-4 rounded-xl relative overflow-hidden">
                                    <div className="absolute right-3 top-2 text-2xl font-black text-white/5 select-none">0{i + 1}</div>
                                    <h4 className="text-xs font-bold text-white mb-1.5">{step.title}</h4>
                                    <p className="text-[11px] text-gray-400 leading-normal">{step.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Sticky Action Card */}
                <div className="md:col-span-1">
                    <div className="bg-[#111113] border border-white/5 p-6 sticky top-24 shadow-2xl rounded-2xl">
                        <div 
                            className="w-12 h-1 mb-5 rounded-full"
                            style={{ backgroundColor: accentColor }}
                        ></div>
                        <h3 className="text-lg font-black uppercase tracking-tight mb-2">
                            Ready to start?
                        </h3>
                        <p className="text-xs text-gray-400 mb-6 leading-relaxed">
                            {isRentACar 
                                ? "Rent your preferred vehicle now in just a few simple steps."
                                : isDriverForHire
                                ? "Hire a professional driver to steer your vehicle safely."
                                : "Book your specialized service now and let our experts handle the rest."}
                        </p>
                        
                        <div className="flex items-center gap-2 p-3 bg-white/5 border border-white/5 rounded-xl mb-6">
                            <Info size={14} style={{ color: accentColor }} className="shrink-0" />
                            <p className="text-[10px] text-gray-400 leading-normal">
                                {isRentACar 
                                    ? "Vehicles come with a full tank of fuel. Please return them fully refueled. Includes 24/7 emergency roadside assistance."
                                    : isDriverForHire
                                    ? "All drivers are fully vetted, background checked, and hold professional licenses. Standard rates cover trip hours."
                                    : "Realtime LTO branch scheduling and verified agent assignment included."}
                            </p>
                        </div>

                        <button
                            onClick={handleBookNow}
                            className="hidden md:flex w-full text-white font-black uppercase tracking-widest text-xs py-4 items-center justify-center gap-3 transition-all active:scale-[0.98] rounded-xl hover:shadow-lg hover:shadow-primary/20 hover:brightness-105"
                            style={{ backgroundColor: accentColor }}
                        >
                            Book Now <ArrowRight size={15} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Fixed Action Bar */}
            <div className="fixed bottom-0 left-0 w-full p-4 bg-[#0A0A0A]/90 backdrop-blur-md border-t border-white/5 md:hidden z-40 flex gap-4 shadow-xl">
                <button
                    onClick={handleBookNow}
                    className="w-full text-white font-black uppercase tracking-widest text-xs py-4 flex items-center justify-center gap-3 transition-all active:scale-[0.98] rounded-xl hover:shadow-lg hover:shadow-primary/20 hover:brightness-105"
                    style={{ backgroundColor: accentColor }}
                >
                    Book Now <ArrowRight size={15} />
                </button>
            </div>
        </div>
    );
};

export default AppServiceDetailScreen;
