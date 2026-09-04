import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDatabase } from '../../context/DatabaseContext';
import { ChevronLeft, ChevronRight, Clock, Tag, ShieldCheck, CreditCard, LifeBuoy, CheckCircle2, ChevronDown } from 'lucide-react';
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
                        const isExpanded = hoveredId === `expanded-${service.id}`;

                        const isRentACar = service.slug === 'rent-a-car' || service.name.toLowerCase().includes('rent a car');
                        const isDriverForHire = service.slug === 'driver-for-hire' || service.name.toLowerCase().includes('driver for hire');
                        const isLiaison = service.slug === 'registration-assistance' || service.name.toLowerCase().includes('registration') || service.name.toLowerCase().includes('liaison');

                        const handleDirectBook = (e: React.MouseEvent) => {
                            e.stopPropagation();
                            if (isRentACar) {
                                navigate('/customer-portal/rent-a-car');
                            } else if (isDriverForHire) {
                                navigate('/customer-portal/hire-a-driver');
                            } else if (isLiaison) {
                                navigate(`/customer-portal/app-services/liaison-book/${service.id}`);
                            } else {
                                navigate(`/customer-portal/app-services/book/${service.id}`);
                            }
                        };

                        const toggleExpand = (e: React.MouseEvent) => {
                            e.stopPropagation();
                            setHoveredId(prev => prev === `expanded-${service.id}` ? null : `expanded-${service.id}`);
                        };

                        return (
                            <div 
                                key={service.id}
                                className="bg-[#111113] border border-white/5 rounded-2xl overflow-hidden flex flex-col hover:border-white/20 transition-all duration-300 group shadow-xl"
                            >
                                <div 
                                    className="flex flex-col md:flex-row cursor-pointer"
                                    onClick={() => navigate(`/customer-portal/app-services/${service.id}`)}
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
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-black">
                                                    // Specialized Solution
                                                </span>
                                            </div>
                                            
                                            <h2 
                                                className="text-base md:text-lg font-black text-white uppercase tracking-tight mb-2 group-hover:text-primary transition-colors duration-300"
                                            >
                                                {service.name}
                                            </h2>
                                            
                                            <p className="text-gray-400 text-[11px] md:text-xs leading-relaxed mb-3 font-medium line-clamp-2">
                                                {service.description}
                                            </p>

                                            {/* Features Badges */}
                                            {service.features && service.features.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 mb-4">
                                                    {service.features.map((feat: string, i: number) => (
                                                        <span 
                                                            key={i} 
                                                            className="text-[9px] text-gray-300 bg-white/5 border border-white/5 px-2.5 py-0.5 rounded-md font-medium tracking-wide flex items-center gap-1.5"
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
                                        <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-auto">
                                            <button
                                                type="button"
                                                onClick={toggleExpand}
                                                className="text-[10px] font-bold uppercase tracking-wider text-light-gray/70 hover:text-white px-2.5 py-1 rounded bg-white/5 border border-white/5 flex items-center gap-1"
                                            >
                                                <span>{isExpanded ? 'Hide Specs' : 'Quick Details'}</span>
                                                <span className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                                            </button>
                                            
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={handleDirectBook}
                                                    style={{ backgroundColor: accentColor }}
                                                    className="px-3.5 py-1.5 rounded-lg text-white font-bold text-xs hover:brightness-110 active:scale-95 transition-all shadow-md shadow-primary/20"
                                                >
                                                    {isRentACar ? 'Rent Now' : isDriverForHire ? 'Hire Driver' : 'Book Service'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Expandable Details Drawer */}
                                <div 
                                     className={`overflow-hidden transition-all duration-300 ease-in-out border-t bg-[#0C0C0E] ${
                                         isExpanded ? 'max-h-[500px] opacity-100 border-white/10 p-4 sm:p-5' : 'max-h-0 opacity-0 border-transparent p-0'
                                     }`}
                                 >
                                     <div className="space-y-4 text-xs">
                                         {/* 3 Modern Specs Cards - Responsive Row Cards */}
                                         <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                                             <div className="bg-[#141417] border border-white/10 p-3 sm:p-3.5 rounded-2xl flex sm:flex-col items-center sm:items-start justify-between gap-2 shadow-sm">
                                                 <div className="flex items-center gap-2 text-[10px] text-light-gray/60 font-black uppercase tracking-wider shrink-0">
                                                     <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-primary shrink-0" style={{ color: accentColor }}>
                                                         <Clock size={13} />
                                                     </div>
                                                     <span className="whitespace-nowrap">Duration</span>
                                                 </div>
                                                 <span className="text-xs sm:text-sm font-black text-white whitespace-nowrap text-right sm:text-left">
                                                     {isRentACar ? 'Per Day' : isDriverForHire ? 'Hourly / Shift' : '1-2 Days'}
                                                 </span>
                                             </div>

                                             <div className="bg-[#141417] border border-white/10 p-3 sm:p-3.5 rounded-2xl flex sm:flex-col items-center sm:items-start justify-between gap-2 shadow-sm">
                                                 <div className="flex items-center gap-2 text-[10px] text-light-gray/60 font-black uppercase tracking-wider shrink-0">
                                                     <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-primary shrink-0" style={{ color: accentColor }}>
                                                         <Tag size={13} />
                                                     </div>
                                                     <span className="whitespace-nowrap">Service Type</span>
                                                 </div>
                                                 <span className="text-xs sm:text-sm font-black text-white whitespace-nowrap text-right sm:text-left">
                                                     {isRentACar ? 'Self-Drive / With Driver' : isDriverForHire ? 'Personal Driver' : 'Assistance'}
                                                 </span>
                                             </div>

                                             <div className="bg-[#141417] border border-white/10 p-3 sm:p-3.5 rounded-2xl flex sm:flex-col items-center sm:items-start justify-between gap-2 shadow-sm">
                                                 <div className="flex items-center gap-2 text-[10px] text-light-gray/60 font-black uppercase tracking-wider shrink-0">
                                                     <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
                                                         <ShieldCheck size={13} />
                                                     </div>
                                                     <span className="whitespace-nowrap">Guarantee</span>
                                                 </div>
                                                 <span className="text-xs sm:text-sm font-black text-white whitespace-nowrap text-right sm:text-left">
                                                     {isRentACar ? 'Fully Insured' : isDriverForHire ? '100% Certified' : 'Verified'}
                                                 </span>
                                             </div>
                                         </div>

                                         <div className="flex flex-wrap gap-4 pt-1 text-light-gray/80">
                                             <div className="flex items-center gap-1.5 text-[11px]">
                                                 <LifeBuoy size={13} className="text-primary" />
                                                 <span className="text-gray-400 font-semibold">24/7 Roadside & Dispatch Support</span>
                                             </div>
                                             <div className="flex items-center gap-1.5 text-[11px]">
                                                 <CreditCard size={13} className="text-emerald-400" />
                                                 <span className="text-gray-400 font-semibold">Instant GCash / HitPay Checkout</span>
                                             </div>
                                         </div>

                                         <p className="text-[11px] text-gray-400 leading-relaxed pt-1 border-t border-white/5">
                                             {service.description}
                                         </p>
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
