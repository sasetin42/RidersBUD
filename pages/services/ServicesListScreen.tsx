import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDatabase } from '../../context/DatabaseContext';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Spinner from '../../components/Spinner';

const AppServicesListScreen: React.FC = () => {
    const { db, loading } = useDatabase();
    const navigate = useNavigate();
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#121212]">
                <Spinner size="lg" />
            </div>
        );
    }

    const services = (db?.appServices?.filter(s => s.isActive) || []).slice().sort((a: any, b: any) => (a.order || 99) - (b.order || 99));
    const accentColor = db?.settings?.accentColor || '#FE7803';

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col font-sans overflow-x-hidden pb-24">
            {/* Header - Geometric & Sharp */}
            <header className="relative w-full pt-10 pb-6 px-6 overflow-hidden border-b border-white/5">
                <div 
                    className="absolute inset-0 transform -skew-y-3 origin-top-left -z-10 opacity-10"
                    style={{ backgroundColor: accentColor }}
                ></div>
                
                <button 
                    onClick={() => navigate(-1)}
                    className="absolute top-6 left-6 w-10 h-10 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors z-20"
                >
                    <ChevronLeft size={20} />
                </button>

                <div className="max-w-5xl mx-auto relative z-10 mt-4">
                    <span 
                        className="font-black tracking-widest text-[10px] uppercase mb-4 block"
                        style={{ color: accentColor }}
                    >
                        // Expert Solutions
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-black uppercase leading-[0.9] tracking-tighter">
                        Specialized<br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">
                            Auto Services
                        </span>
                    </h1>
                    <p 
                        className="mt-6 text-gray-400 text-sm max-w-md font-medium border-l-2 pl-4"
                        style={{ borderLeftColor: accentColor }}
                    >
                        Premium care, precise diagnostics, and dedicated support for every aspect of your vehicle's journey.
                    </p>
                </div>
            </header>

            {/* Premium Vertical Card Stack */}
            <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 mt-6 space-y-4">
                {services.length === 0 ? (
                    <div className="text-center py-20 text-gray-500 font-medium">
                        No active services found.
                    </div>
                ) : (
                    services.map((service) => {
                        const isHovered = hoveredId === service.id;
                        return (
                            <div 
                                key={service.id}
                                className="bg-[#111113] border border-white/5 rounded-2xl overflow-hidden flex flex-col md:flex-row hover:border-white/20 transition-all duration-300 group cursor-pointer shadow-xl"
                                onClick={() => navigate(`/customer-portal/app-services/${service.id}`)}
                                onMouseEnter={() => setHoveredId(service.id)}
                                onMouseLeave={() => setHoveredId(null)}
                            >
                                {/* Image container */}
                                <div className="w-full md:w-[28%] relative min-h-[140px] md:min-h-[160px] overflow-hidden bg-[#151517]">
                                    <img 
                                        src={service.imageUrl || '/assets/logo.png'} 
                                        alt={service.name} 
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black/80 via-transparent to-transparent"></div>
                                    
                                    {service.category && (
                                        <div 
                                            className="absolute top-4 left-4 text-white text-[9px] font-black px-2.5 py-1 uppercase tracking-widest rounded shadow-md"
                                            style={{ backgroundColor: accentColor }}
                                        >
                                            {service.category}
                                        </div>
                                    )}
                                </div>

                                {/* Content / Details */}
                                <div className="flex-1 p-4 md:p-5 flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-black">
                                                // Premium Service
                                            </span>
                                        </div>
                                        
                                        <h2 
                                            className="text-base md:text-lg font-black text-white uppercase tracking-tight mb-2 transition-colors duration-300"
                                            style={{ color: isHovered ? accentColor : '#ffffff' }}
                                        >
                                            {service.name}
                                        </h2>
                                        
                                        <p className="text-gray-400 text-[11px] md:text-xs leading-relaxed mb-4 font-medium line-clamp-2">
                                            {service.description}
                                        </p>

                                        {/* Features Badges */}
                                        {service.features && service.features.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mb-6">
                                                {service.features.map((feat: string, i: number) => (
                                                    <span 
                                                        key={i} 
                                                        className="text-[9px] text-gray-300 bg-white/5 border border-white/5 px-2.5 py-1 rounded-md font-medium tracking-wide flex items-center gap-1.5"
                                                    >
                                                        <span 
                                                            className="w-1 h-1 rounded-full"
                                                            style={{ backgroundColor: accentColor }}
                                                        ></span>
                                                        {feat}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Footer Section */}
                                    <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-auto">
                                        <span 
                                            className="text-[10px] font-black uppercase tracking-widest transition-colors duration-300"
                                            style={{ color: isHovered ? '#ffffff' : accentColor }}
                                        >
                                            Book / Details
                                        </span>
                                        <div 
                                            className="w-8 h-8 rounded-lg border flex items-center justify-center transition-all duration-300"
                                            style={{ 
                                                borderColor: isHovered ? accentColor : 'rgba(255,255,255,0.1)',
                                                backgroundColor: isHovered ? accentColor : 'transparent'
                                            }}
                                        >
                                            <ChevronRight size={14} className={isHovered ? 'text-white' : 'text-gray-400'} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </main>
        </div>
    );
};

export default AppServicesListScreen;
