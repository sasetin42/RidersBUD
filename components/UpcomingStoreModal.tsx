import React, { useState, useEffect } from 'react';
import { 
    ShoppingBag, 
    Sparkles, 
    ShieldCheck, 
    Truck, 
    Wrench, 
    Bell, 
    CheckCircle2, 
    X, 
    ArrowRight,
    Flame
} from 'lucide-react';
import { useDatabase } from '../context/DatabaseContext';

interface UpcomingStoreModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const UpcomingStoreModal: React.FC<UpcomingStoreModalProps> = ({ isOpen, onClose }) => {
    const { db } = useDatabase();
    const partsModule = db?.settings?.modules?.find(m => m.id === 'parts-store');
    const [isNotified, setIsNotified] = useState(false);

    useEffect(() => {
        try {
            const saved = localStorage.getItem('ridersbud_parts_store_notify');
            if (saved === 'true') {
                setIsNotified(true);
            }
        } catch (_) {}
    }, []);

    const handleToggleNotification = () => {
        const nextState = !isNotified;
        setIsNotified(nextState);
        try {
            localStorage.setItem('ridersbud_parts_store_notify', nextState ? 'true' : 'false');
        } catch (_) {}
    };

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="upcoming-store-title"
        >
            <div 
                className="w-full sm:max-w-lg bg-[#141417] border border-white/10 rounded-t-[2.2rem] sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-slideUp sm:animate-scaleUp relative"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Visual Top Glow Accent */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-80" />

                {/* Header Banner */}
                <div className="relative p-6 pb-4 sm:p-7 sm:pb-5 bg-gradient-to-b from-white/[0.04] to-transparent border-b border-white/5">
                    <button
                        onClick={onClose}
                        className="absolute top-5 right-5 p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all active:scale-95"
                        aria-label="Close modal"
                    >
                        <X size={18} />
                    </button>

                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-[0_0_20px_rgba(255,107,0,0.2)]">
                            <ShoppingBag className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-wider mb-1">
                                <Sparkles size={11} className="animate-spin text-amber-400" />
                                Upcoming Feature
                            </div>
                            <h3 id="upcoming-store-title" className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
                                Parts & Tools Store
                            </h3>
                        </div>
                    </div>

                    {/* Admin Announcement if provided */}
                    {partsModule?.bannerMessage ? (
                        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5">
                            <Flame className="text-amber-400 shrink-0 mt-0.5" size={16} />
                            <p className="text-xs text-amber-200/90 font-medium leading-relaxed">
                                {partsModule.bannerMessage}
                            </p>
                        </div>
                    ) : (
                        <p className="text-xs text-gray-400 leading-relaxed">
                            We're currently preparing our curated automotive catalog to bring you genuine parts, verified tools, and seamless doorstep delivery.
                        </p>
                    )}
                </div>

                {/* Content / Feature Highlights */}
                <div className="p-6 sm:p-7 space-y-4 overflow-y-auto custom-scrollbar">
                    <div className="text-[11px] font-black uppercase tracking-widest text-gray-400">
                        What to Expect at Launch
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 flex items-start gap-3.5 hover:border-white/10 transition-colors">
                            <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
                                <ShieldCheck size={18} />
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-white mb-0.5">100% Genuine OEM & Certified Aftermarket</h4>
                                <p className="text-[11px] text-gray-400 leading-normal">
                                    Quality-guaranteed parts sourced directly from authorized manufacturers with warranty certificates.
                                </p>
                            </div>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 flex items-start gap-3.5 hover:border-white/10 transition-colors">
                            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 shrink-0 mt-0.5">
                                <Truck size={18} />
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-white mb-0.5">Express Dispatch & Real-Time Tracking</h4>
                                <p className="text-[11px] text-gray-400 leading-normal">
                                    Order parts on-demand with live courier tracking straight to your home or preferred workshop.
                                </p>
                            </div>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 flex items-start gap-3.5 hover:border-white/10 transition-colors">
                            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0 mt-0.5">
                                <Wrench size={18} />
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-white mb-0.5">Instant Professional Installation Add-on</h4>
                                <p className="text-[11px] text-gray-400 leading-normal">
                                    Pair any purchased parts with our certified mobile mechanics for seamless on-site installation.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="p-5 sm:p-6 bg-[#0E0E10] border-t border-white/5 flex flex-col sm:flex-row items-center gap-3">
                    <button
                        onClick={handleToggleNotification}
                        className={`w-full sm:flex-1 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 border ${
                            isNotified 
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                                : 'bg-primary text-white border-primary/40 shadow-lg shadow-primary/20 hover:bg-primary/90'
                        }`}
                    >
                        {isNotified ? (
                            <>
                                <CheckCircle2 size={16} />
                                <span>You're on the Launch List!</span>
                            </>
                        ) : (
                            <>
                                <Bell size={16} />
                                <span>Notify Me When Live</span>
                            </>
                        )}
                    </button>

                    <button
                        onClick={onClose}
                        className="w-full sm:w-auto py-3 px-6 rounded-xl font-bold text-xs bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition-all active:scale-95"
                    >
                        Got it, Explore Services
                    </button>
                </div>
            </div>
        </div>
    );
};
