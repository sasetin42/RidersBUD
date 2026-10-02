import { isSpecialServiceEnabled, isSpecialServiceSlugOrNameEnabled } from '../utils/specialServicesHelper';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Search, X, Wrench, Car, Settings, ChevronRight } from 'lucide-react';
import { useDatabase } from '../context/DatabaseContext';
import { UpcomingStoreModal } from './UpcomingStoreModal';

interface CustomerSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const CustomerSearchModal: React.FC<CustomerSearchModalProps> = ({ isOpen, onClose }) => {
    const { db } = useDatabase();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [showUpcomingModal, setShowUpcomingModal] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const partsModule = db?.settings?.modules?.find(m => m.id === 'parts-store');
    const isStoreDisabled = partsModule ? !partsModule.enabled : false;

    const handlePartSearchClick = (partName: string) => {
        if (isStoreDisabled) {
            setShowUpcomingModal(true);
        } else {
            navigate(`/customer-portal/parts-store?q=${encodeURIComponent(partName)}`);
            onClose();
        }
    };

    // Auto-focus input when opened
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                inputRef.current?.focus();
            }, 50);
        } else {
            setSearchQuery('');
        }
    }, [isOpen]);

    // Close on Escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Filter results
    const searchResults = useMemo(() => {
        if (!searchQuery.trim() || !db) {
            return { services: [], products: [], tools: [] };
        }

        const query = searchQuery.toLowerCase().trim();

        // 1. Services (filter out disabled special services)
        const matchedServices = (db.services || []).filter(s => {
            if (!isSpecialServiceSlugOrNameEnabled(s.name, db?.settings)) return false;
            return (
                s.name.toLowerCase().includes(query) ||
                (s.description && s.description.toLowerCase().includes(query)) ||
                (s.category && s.category.toLowerCase().includes(query))
            );
        }).slice(0, 5);

        // 2. Parts / Products & Tools
        const matchedParts = (db.parts || []).filter(p =>
            p.name.toLowerCase().includes(query) ||
            (p.description && p.description.toLowerCase().includes(query)) ||
            (p.brand && p.brand.toLowerCase().includes(query)) ||
            (p.category && p.category.toLowerCase().includes(query))
        );

        const matchedTools = matchedParts.filter(p =>
            p.category?.toLowerCase().includes('tool') ||
            p.category?.toLowerCase().includes('equipment') ||
            p.name.toLowerCase().includes('tool') ||
            p.name.toLowerCase().includes('wrench') ||
            p.name.toLowerCase().includes('driver') ||
            p.name.toLowerCase().includes('pliers') ||
            p.name.toLowerCase().includes('kit')
        ).slice(0, 5);

        const matchedProducts = matchedParts.filter(p =>
            !matchedTools.some(t => t.id === p.id)
        ).slice(0, 5);

        return {
            services: matchedServices,
            products: matchedProducts,
            tools: matchedTools
        };
    }, [searchQuery, db]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && searchQuery.trim()) {
            navigate(`/customer-portal/services?q=${encodeURIComponent(searchQuery.trim())}`);
            onClose();
        }
    };

    if (!isOpen) return null;

    const hasResults =
        searchResults.services.length > 0 ||
        searchResults.products.length > 0 ||
        searchResults.tools.length > 0;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-start justify-center p-3 sm:p-6 sm:pt-16">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-fadeIn"
                onClick={onClose}
            />

            {/* Modal Dialog */}
            <div
                className="relative w-full max-w-2xl bg-[#141416] border border-white/15 rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.95),0_0_35px_rgba(254,120,3,0.1)] overflow-hidden z-10 flex flex-col max-h-[85vh] animate-scaleUp origin-top"
                onClick={e => e.stopPropagation()}
            >
                {/* Search Header */}
                <div className="p-4 sm:p-5 border-b border-white/10 bg-[#16161D]/90 backdrop-blur-xl flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#FE7803]/10 border border-[#FE7803]/30 flex items-center justify-center text-[#FE7803] shrink-0">
                        <Search className="h-5 w-5" />
                    </div>

                    <div className="flex-1 relative flex items-center">
                        <input
                            ref={inputRef}
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Search services, products, and tools..."
                            className="w-full bg-white/5 border border-white/10 focus:border-[#FE7803] rounded-xl pl-3.5 pr-10 py-2.5 text-sm sm:text-base text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FE7803]/20 transition-all font-medium"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 p-1 rounded-full bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white transition-all"
                                title="Clear search"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 active:scale-95 transition-all shrink-0"
                        title="Close search"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Quick Shortcuts / Suggested queries when empty */}
                {!searchQuery.trim() && (
                    <div className="p-5 overflow-y-auto">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3">Popular Searches</p>
                        <div className="flex flex-wrap gap-2">
                            {[
                                'Change Oil',
                                'Brake Repair',
                                ...(isSpecialServiceEnabled('towing', db?.settings) ? ['Towing'] : []),
                                'Engine Diagnostics',
                                'Battery Replacement',
                                'Tire Alignment'
                            ].map((term) => (
                                <button
                                    key={term}
                                    onClick={() => setSearchQuery(term)}
                                    className="px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-[#FE7803]/15 border border-white/10 hover:border-[#FE7803]/40 text-xs text-gray-300 hover:text-white transition-all active:scale-95 flex items-center gap-1.5"
                                >
                                    <Search size={12} className="text-[#FE7803]" />
                                    <span>{term}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Results Container */}
                {searchQuery.trim() && (
                    <div className="overflow-y-auto divide-y divide-white/10 p-2 sm:p-3 custom-scrollbar flex-1">
                        {/* Services Section */}
                        {searchResults.services.length > 0 && (
                            <div className="p-2">
                                <div className="flex items-center justify-between mb-2.5 px-2">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#FE7803] shadow-sm shadow-[#FE7803] animate-pulse" />
                                        <h4 className="text-[10px] font-black text-[#FE7803] tracking-widest uppercase">Services</h4>
                                    </div>
                                    <span className="text-[9px] font-black text-[#FE7803]/80 bg-[#FE7803]/10 border border-[#FE7803]/20 px-2 py-0.5 rounded-full">
                                        {searchResults.services.length}
                                    </span>
                                </div>
                                <div className="space-y-1.5">
                                    {searchResults.services.map(s => (
                                        <button
                                            key={s.id}
                                            onClick={() => {
                                                navigate(`/customer-portal/services?q=${encodeURIComponent(s.name)}`);
                                                onClose();
                                            }}
                                            className="w-full text-left p-2.5 bg-white/[0.03] hover:bg-white/[0.08] active:bg-white/[0.12] border border-white/5 hover:border-[#FE7803]/40 rounded-xl transition-all flex items-center justify-between group shadow-sm"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FE7803]/20 to-[#FE7803]/5 flex items-center justify-center text-[#FE7803] border border-[#FE7803]/25 shrink-0 group-hover:scale-105 group-hover:border-[#FE7803]/50 transition-all shadow-inner">
                                                    <Wrench size={15} />
                                                </div>
                                                <div className="min-w-0 pr-2">
                                                    <p className="text-xs font-black text-white group-hover:text-[#FE7803] transition-colors truncate">
                                                        {s.name}
                                                    </p>
                                                    <p className="text-[11px] text-gray-300 font-medium truncate mt-0.5 leading-snug">
                                                        {s.description || 'Professional automotive maintenance & repair'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {s.price && (
                                                    <span className="text-[11px] font-black text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-lg">
                                                        ₱{Number(s.price).toLocaleString()}
                                                    </span>
                                                )}
                                                <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-[#FE7803] group-hover:bg-[#FE7803]/15 transition-all">
                                                    <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Products Section */}
                        {searchResults.products.length > 0 && (
                            <div className="p-2">
                                <div className="flex items-center justify-between mb-2.5 px-2">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400 animate-pulse" />
                                        <h4 className="text-[10px] font-black text-cyan-400 tracking-widest uppercase">Products & Parts</h4>
                                    </div>
                                    <span className="text-[9px] font-black text-cyan-400/80 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full">
                                        {searchResults.products.length}
                                    </span>
                                </div>
                                <div className="space-y-1.5">
                                    {searchResults.products.map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => handlePartSearchClick(p.name)}
                                            className="w-full text-left p-2.5 bg-white/[0.03] hover:bg-white/[0.08] active:bg-white/[0.12] border border-white/5 hover:border-cyan-400/40 rounded-xl transition-all flex items-center justify-between group shadow-sm"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-9 h-9 rounded-xl overflow-hidden bg-black/40 border border-white/10 shrink-0 flex items-center justify-center p-1 group-hover:scale-105 group-hover:border-cyan-400/40 transition-all shadow-inner">
                                                    {p.imageUrls?.[0] ? (
                                                        <img src={p.imageUrls[0]} alt={p.name} className="w-full h-full object-contain" />
                                                    ) : (
                                                        <Car size={15} className="text-cyan-400" />
                                                    )}
                                                </div>
                                                <div className="min-w-0 pr-2">
                                                    <p className="text-xs font-black text-white group-hover:text-cyan-400 transition-colors truncate">
                                                        {p.name}
                                                    </p>
                                                    <p className="text-[11px] text-gray-300 font-medium truncate mt-0.5 leading-snug">
                                                        {p.brand ? `${p.brand} • ` : ''}{p.description || 'Genuine replacement part'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="text-[11px] font-black text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-lg">
                                                    ₱{Number(p.price).toLocaleString()}
                                                </span>
                                                <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-cyan-400 group-hover:bg-cyan-500/15 transition-all">
                                                    <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Tools Section */}
                        {searchResults.tools.length > 0 && (
                            <div className="p-2">
                                <div className="flex items-center justify-between mb-2.5 px-2">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400 animate-pulse" />
                                        <h4 className="text-[10px] font-black text-emerald-400 tracking-widest uppercase">Tools & Equipment</h4>
                                    </div>
                                    <span className="text-[9px] font-black text-emerald-400/80 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                        {searchResults.tools.length}
                                    </span>
                                </div>
                                <div className="space-y-1.5">
                                    {searchResults.tools.map(t => (
                                        <button
                                            key={t.id}
                                            onClick={() => handlePartSearchClick(t.name)}
                                            className="w-full text-left p-2.5 bg-white/[0.03] hover:bg-white/[0.08] active:bg-white/[0.12] border border-white/5 hover:border-emerald-400/40 rounded-xl transition-all flex items-center justify-between group shadow-sm"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-9 h-9 rounded-xl overflow-hidden bg-black/40 border border-white/10 shrink-0 flex items-center justify-center p-1 group-hover:scale-105 group-hover:border-emerald-400/40 transition-all shadow-inner">
                                                    {t.imageUrls?.[0] ? (
                                                        <img src={t.imageUrls[0]} alt={t.name} className="w-full h-full object-contain" />
                                                    ) : (
                                                        <Settings size={15} className="text-emerald-400" />
                                                    )}
                                                </div>
                                                <div className="min-w-0 pr-2">
                                                    <p className="text-xs font-black text-white group-hover:text-emerald-400 transition-colors truncate">
                                                        {t.name}
                                                    </p>
                                                    <p className="text-[11px] text-gray-300 font-medium truncate mt-0.5 leading-snug">
                                                        {t.brand ? `${t.brand} • ` : ''}{t.description || 'Professional garage equipment'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="text-[11px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg">
                                                    ₱{Number(t.price).toLocaleString()}
                                                </span>
                                                <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-emerald-400 group-hover:bg-emerald-500/15 transition-all">
                                                    <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* No Results Found */}
                        {!hasResults && (
                            <div className="p-8 text-center bg-white/[0.01]">
                                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3 text-gray-400 shadow-inner">
                                    <Search size={22} className="text-gray-400" />
                                </div>
                                <p className="text-xs font-black text-white tracking-wide">No results found for "{searchQuery}"</p>
                                <p className="text-[11px] text-gray-400 mt-1 font-medium">Try searching for "towing", "change oil", "brake", or "battery"</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Footer instructions */}
                <div className="px-4 py-2.5 bg-black/40 border-t border-white/5 flex items-center justify-between text-[11px] text-gray-400">
                    <span>Press <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-gray-300 text-[10px] font-mono">ENTER</kbd> to see full service results</span>
                    <span>Press <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-gray-300 text-[10px] font-mono">ESC</kbd> to exit</span>
                </div>
            </div>

            <UpcomingStoreModal 
                isOpen={showUpcomingModal}
                onClose={() => setShowUpcomingModal(false)}
            />
        </div>,
        document.body
    );
};

export default CustomerSearchModal;
