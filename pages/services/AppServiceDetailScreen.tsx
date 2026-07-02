import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDatabase } from '../../context/DatabaseContext';
import { ChevronLeft, CheckCircle2, ArrowRight } from 'lucide-react';
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

    const service = db?.appServices?.find(s => s.id === slug);

    if (!service) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#0A0A0A] text-white">
                <h1 className="text-2xl font-black">Service Not Found</h1>
                <button 
                    onClick={() => navigate('/customer-portal/app-services')}
                    className="mt-6 text-[#E62E00] font-bold flex items-center gap-2"
                >
                    <ChevronLeft size={16} /> Back to Services
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white font-sans pb-32">
            {/* Hero Image Section */}
            <div className="relative w-full h-[50vh] min-h-[400px]">
                <div className="absolute inset-0 bg-[#E62E00]/10 mix-blend-overlay z-10"></div>
                <img 
                    src={service.imageUrl || '/assets/logo.png'} 
                    alt={service.name} 
                    className="w-full h-full object-cover grayscale-[0.3]"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/assets/logo.png'; }}
                />
                
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/60 to-transparent z-10"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A]/80 to-transparent z-10 h-32"></div>

                <button 
                    onClick={() => navigate(-1)}
                    className="absolute top-6 left-6 w-10 h-10 border border-white/20 bg-black/50 backdrop-blur-md flex items-center justify-center hover:bg-white/10 transition-colors z-20"
                >
                    <ChevronLeft size={20} />
                </button>

                <div className="absolute bottom-0 left-0 w-full p-6 z-20 max-w-4xl mx-auto flex flex-col items-start">
                    {service.category && (
                        <span className="text-[10px] bg-[#E62E00] text-white font-black px-3 py-1 uppercase tracking-widest mb-4 inline-block">
                            {service.category}
                        </span>
                    )}
                    <h1 className="text-4xl sm:text-6xl font-black uppercase tracking-tighter leading-[0.9]">
                        {service.name}
                    </h1>
                </div>
            </div>

            {/* Content Section */}
            <div className="max-w-4xl mx-auto px-6 mt-12 grid grid-cols-1 md:grid-cols-3 gap-12">
                <div className="md:col-span-2 space-y-8">
                    <div>
                        <h2 className="text-[#E62E00] font-black text-xs uppercase tracking-widest mb-3">
                            // Overview
                        </h2>
                        <p className="text-gray-300 text-sm leading-relaxed border-l-2 border-white/10 pl-4">
                            {service.description}
                        </p>
                    </div>

                    {service.features && service.features.length > 0 && (
                        <div>
                            <h2 className="text-[#E62E00] font-black text-xs uppercase tracking-widest mb-4">
                                // Key Features
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {service.features.map((feature, i) => (
                                    <div key={i} className="flex items-start gap-3 bg-[#111111] border border-white/5 p-4 group hover:border-[#E62E00]/30 transition-colors">
                                        <CheckCircle2 size={16} className="text-[#E62E00] shrink-0 mt-0.5" />
                                        <span className="text-xs text-gray-300 font-medium leading-relaxed group-hover:text-white transition-colors">
                                            {feature}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                 <div className="md:col-span-1">
                    <div className="bg-[#111111] border border-white/10 p-6 sticky top-24 shadow-2xl">
                        <div 
                            className="w-12 h-1 mb-6"
                            style={{ backgroundColor: accentColor }}
                        ></div>
                        <h3 className="text-xl font-black uppercase tracking-tight mb-2">
                            Ready to start?
                        </h3>
                        <p className="text-xs text-gray-400 mb-8">
                            Book your specialized service now and let our experts handle the rest.
                        </p>
                        <button
                            onClick={() => {
                                if (service.name.toLowerCase().includes('registration')) {
                                    navigate(`/customer-portal/app-services/liaison-book/${service.id}`);
                                } else {
                                    navigate(`/customer-portal/app-services/book/${service.id}`);
                                }
                            }}
                            className="w-full text-white font-black uppercase tracking-widest text-xs py-4 flex items-center justify-center gap-3 transition-colors active:scale-[0.98]"
                            style={{ backgroundColor: accentColor }}
                        >
                            Book Now <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AppServiceDetailScreen;
