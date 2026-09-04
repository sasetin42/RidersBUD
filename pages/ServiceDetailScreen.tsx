import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDatabase } from '../context/DatabaseContext';
import { 
    ArrowLeft, 
    Clock, 
    Star, 
    ShieldCheck, 
    CheckCircle2, 
    ChevronRight, 
    Wrench,
    Car, 
    Key, 
    UserCheck, 
    MapPin, 
    AlertCircle, 
    FileText, 
    BadgeCheck 
} from 'lucide-react';
import { Button, Card, Badge } from '../components/ui';
import { getFallbackImageForCategory, normalizeServiceImage } from '../utils/fallbackImages';
import { seedServices } from '../data/mockData';

const getServiceIncludes = (serviceName: string): string[] => {
    const lower = serviceName.toLowerCase();
    if (lower.includes('towing') || lower.includes('roadside') || lower.includes('wrecker')) {
        return [
            "24/7 Dispatch & Roadside Safety Setup",
            "Professional Vehicle Hook-up & Loading",
            "Secure Transport to Destination",
            "Comprehensive Damage-Free Guarantee",
            "Real-time ETA Updates & Tracking"
        ];
    }
    if (lower.includes('driver') || lower.includes('hire') || lower.includes('chauffeur')) {
        return [
            "Licensed & Vetted Professional Driver",
            "Flexible Hourly/Daily Service Options",
            "Route Planning & Real-time Navigation",
            "Safe, Comfortable & Insured Ride",
            "Vehicle Inspection Pre & Post Trip"
        ];
    }
    if (lower.includes('brake')) {
        return [
            "Full Brake Pad & Rotor Inspection",
            "Premium Quality Brake Component Replacement",
            "Brake Fluid Level & Quality Check",
            "Caliper and Hardware Lubrication",
            "Road Test & Braking Performance Verification"
        ];
    }
    if (lower.includes('oil') || lower.includes('change') || lower.includes('maintenance') || lower.includes('tune')) {
        return [
            "Multi-Point Vehicle Health Inspection",
            "Fluid Levels Check & Top-Up",
            "Filters & Core Component Inspection",
            "Battery Health & Charging System Test",
            "Detailed Service Report & Recommendations"
        ];
    }
    if (lower.includes('clean') || lower.includes('detail') || lower.includes('wash') || lower.includes('paint')) {
        return [
            "Thorough Exterior Wash & Paint Protection",
            "Deep Interior Vacuuming & Dusting",
            "Window, Mirror & Glass Polish",
            "Tire Shines & Wheel Detailing",
            "Deodorizing & Sanitization treatment"
        ];
    }
    if (lower.includes('diagnost') || lower.includes('scanner') || lower.includes('inspect')) {
        return [
            "Full System OBD-II Diagnostic Scan",
            "Trouble Code (DTC) Retrieval & Analysis",
            "Sensor & Actuator Real-time Data Check",
            "Visual Under-Hood Component Verification",
            "Actionable Diagnostic Report & Repair Quote"
        ];
    }
    return [
        `Professional ${serviceName} Inspection`,
        `Standard ${serviceName} Procedure Setup`,
        `Quality Parts/Tools Verification`,
        `Post-${serviceName} System Testing`,
        `Worksite Cleanup & Standard Disposal`
    ];
};

const getDynamicAboutDetails = (serviceName: string, description: string): string => {
    // 1. Sanitize description: strip "Redirects to the rental page." (and any trailing spaces or punctuation)
    const sanitizedDescription = description.replace(/Redirects to the rental page\.[ \t\r\n\.]*/g, '').trim();

    // 2. Check if the sanitized description contains keywords corresponding to serviceName categories
    const descLower = sanitizedDescription.toLowerCase();
    const nameLower = serviceName.toLowerCase();
    
    // Determine category based on serviceName:
    const isRental = nameLower.includes('rental') || nameLower.includes('rent');
    const isDriver = nameLower.includes('driver') || nameLower.includes('hire') || nameLower.includes('chauffeur');
    const isTowing = nameLower.includes('towing') || nameLower.includes('roadside') || nameLower.includes('wrecker');
    const isRepair = nameLower.includes('brake') || nameLower.includes('mechanic') || nameLower.includes('repair') || nameLower.includes('maintenance');

    // Check if the corresponding keywords are already present in the description:
    let skipSuffix = false;
    if (isRental && (descLower.includes('rent') || descLower.includes('fleet'))) {
        skipSuffix = true;
    } else if (isDriver && (descLower.includes('driver') || descLower.includes('hire'))) {
        skipSuffix = true;
    } else if (isTowing && (descLower.includes('towing') || descLower.includes('roadside'))) {
        skipSuffix = true;
    } else if (isRepair && (descLower.includes('mechanic') || descLower.includes('repair'))) {
        skipSuffix = true;
    }

    if (skipSuffix) {
        return sanitizedDescription;
    }

    let suffix = '';
    if (isTowing) {
        suffix = "\n\nOur professional roadside assistance and towing service is designed for emergency situations and general transport. We prioritize quick dispatch, safety setups, and secure vehicle transport to ensure a damage-free experience.";
    } else if (isDriver) {
        suffix = "\n\nThis service provides you with a professional, vetted driver to handle your transit needs. Whether for daily commutes, intercity trips, or event transport, our drivers guarantee safe and efficient navigation.";
    } else if (isRental) {
        suffix = "\n\nChoose from our well-maintained fleet for your personal or business travel. Our rental options provide flexible durations, comprehensive insurance coverage, and reliable vehicle performance.";
    } else if (isRepair) {
        suffix = "\n\nOur experienced mechanics utilize advanced diagnostics and high-quality parts to perform thorough repairs. We focus on restoring your vehicle to optimal working condition with verified safety checks.";
    } else {
        suffix = `\n\nThis professional ${serviceName} is tailored to meet your specific vehicle requirements. Standard procedures, quality-verified equipment, and expert attention ensure high service standards.`;
    }
    return `${sanitizedDescription}${suffix}`;
};

const ServiceDetailScreen: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { db } = useDatabase();

    const service = useMemo(() => {
        return db?.services.find(s => s.id === id) || seedServices.find(s => s.id === id);
    }, [db, id]);

    const includes = useMemo(() => {
        return service ? getServiceIncludes(service.name) : [];
    }, [service]);

    const enrichedDescription = useMemo(() => {
        if (!service) return '';
        return getDynamicAboutDetails(service.name, service.description);
    }, [service]);

    if (!service) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#121212] text-white p-6">
                <Wrench size={48} className="text-gray-600 mb-4" />
                <h2 className="text-xl font-bold mb-2">Service Not Found</h2>
                <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
            </div>
        );
    }


    return (
        <div className="flex flex-col min-h-screen bg-[#121212] text-white font-sans">
            {/* Hero Image Section */}
            <div className="relative h-72 w-full">
                <img
                    src={normalizeServiceImage(service.imageUrl, service.category, service.name)}
                    alt={service.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = getFallbackImageForCategory(service.category, service.name); }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-[#121212]" />

                {/* Back Button */}
                <button
                    onClick={() => navigate(-1)}
                    className="absolute top-6 left-6 p-2 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-black/60 transition-colors z-20"
                >
                    <ArrowLeft size={20} />
                </button>
            </div>

            {/* Content Container */}
            <div className="px-6 -mt-10 relative z-10 pb-28">
                {/* Title Card */}
                <div className="bg-gradient-to-br from-[#1E1E1E] to-[#151515] rounded-2xl p-5 border border-white/10 shadow-xl mb-6 backdrop-blur-xl relative overflow-hidden">
                    <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/20 rounded-full blur-3xl pointer-events-none"></div>

                    <div className="flex items-center justify-between mb-3 relative z-10">
                        <Badge variant="primary" size="sm" className="!text-[10px] tracking-wider">{service.category}</Badge>
                        <div className="flex items-center gap-1 text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded-full border border-yellow-500/20">
                            <Star size={10} fill="currentColor" />
                            <span className="text-[10px] font-bold">4.9</span>
                        </div>
                    </div>

                    <h1 className="text-xl font-bold text-white leading-snug mb-3 relative z-10">{service.name}</h1>

                    <div className="flex items-center justify-between border-t border-white/5 pt-3 relative z-10">
                        <div className="flex items-center gap-1.5 text-gray-400">
                            <Clock size={14} className="text-primary/80" />
                            <span className="text-xs font-semibold">{service.estimatedTime}</span>
                        </div>
                        <div className="text-right">
                            <span className="text-xl font-black text-primary drop-shadow-md">
                                ₱{(service.price || 0).toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Specifications Section */}
                {(service.isCarRental || service.isDriverHire) && (
                    <section className="mb-8">
                        <h3 className="text-sm font-bold text-gray-400 tracking-widest mb-3 flex items-center gap-2">
                            <FileText size={14} /> Service Specifications
                        </h3>
                        {service.isCarRental && (
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-[#1E1E1E] p-3 rounded-xl border border-white/5 flex flex-col items-center text-center">
                                    <Car className="text-primary mb-1" size={20} />
                                    <span className="text-[10px] text-gray-400 uppercase font-bold">Class</span>
                                    <span className="text-xs font-semibold text-white mt-0.5">{service.carRentalClass || 'N/A'}</span>
                                </div>
                                <div className="bg-[#1E1E1E] p-3 rounded-xl border border-white/5 flex flex-col items-center text-center">
                                    <Key className="text-primary mb-1" size={20} />
                                    <span className="text-[10px] text-gray-400 uppercase font-bold">Transmission</span>
                                    <span className="text-xs font-semibold text-white mt-0.5">{service.carRentalTransmission || 'N/A'}</span>
                                </div>
                                <div className="bg-[#1E1E1E] p-3 rounded-xl border border-white/5 flex flex-col items-center text-center">
                                    <AlertCircle className="text-primary mb-1" size={20} />
                                    <span className="text-[10px] text-gray-400 uppercase font-bold">Fuel Policy</span>
                                    <span className="text-xs font-semibold text-white mt-0.5">{service.carRentalFuel || 'N/A'}</span>
                                </div>
                            </div>
                        )}
                        {service.isDriverHire && (
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-[#1E1E1E] p-3 rounded-xl border border-white/5 flex flex-col items-center text-center">
                                    <ShieldCheck className="text-primary mb-1" size={20} />
                                    <span className="text-[10px] text-gray-400 uppercase font-bold">License</span>
                                    <span className="text-xs font-semibold text-white mt-0.5">{service.driverLicenseType || 'N/A'}</span>
                                </div>
                                <div className="bg-[#1E1E1E] p-3 rounded-xl border border-white/5 flex flex-col items-center text-center">
                                    <UserCheck className="text-primary mb-1" size={20} />
                                    <span className="text-[10px] text-gray-400 uppercase font-bold">Experience</span>
                                    <span className="text-xs font-semibold text-white mt-0.5">{service.driverExperience || 'N/A'}</span>
                                </div>
                                <div className="bg-[#1E1E1E] p-3 rounded-xl border border-white/5 flex flex-col items-center text-center">
                                    <MapPin className="text-primary mb-1" size={20} />
                                    <span className="text-[10px] text-gray-400 uppercase font-bold">Limits</span>
                                    <span className="text-xs font-semibold text-white mt-0.5">{service.driverGeoLimits || 'N/A'}</span>
                                </div>
                            </div>
                        )}
                    </section>
                )}

                {/* Description */}
                <section className="mb-8">
                    <h3 className="text-sm font-bold text-gray-400 tracking-widest mb-3 flex items-center gap-2">
                        <BadgeCheck size={14} /> About Service
                    </h3>
                    <p className="text-gray-300 leading-relaxed text-sm">
                        {enrichedDescription}
                    </p>
                </section>

                {/* What's Included */}
                <section className="mb-8">
                    <h3 className="text-sm font-bold text-gray-400 tracking-widest mb-3 flex items-center gap-2">
                        <CheckCircle2 size={14} /> What's Included
                    </h3>
                    <div className="space-y-3">
                        {includes.map((item, index) => (
                            <div key={index} className="flex items-center gap-3 bg-[#1E1E1E] p-3 rounded-xl border border-white/5">
                                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                                    <CheckCircle2 size={12} className="text-primary" />
                                </div>
                                <span className="text-sm font-medium text-gray-200">{item}</span>
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            {/* Sticky Action Footer */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#121212]/90 backdrop-blur-xl border-t border-white/10 z-50 animate-slideUp">
                <div className="max-w-2xl mx-auto w-full flex gap-3 items-center">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex-1 h-12 flex items-center justify-center bg-white hover:bg-gray-100 text-black font-bold rounded-xl transition-colors text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => navigate(`/customer-portal/booking/${service.id}`)}
                        className="flex-[2] h-12 bg-primary hover:bg-orange-600 text-white font-bold rounded-xl shadow-lg shadow-primary/25 transition-all flex items-center justify-center gap-2 group text-sm"
                    >
                        Book Now
                        <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ServiceDetailScreen;
