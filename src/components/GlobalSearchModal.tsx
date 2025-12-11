import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDatabase } from '../context/DatabaseContext';
import { Search, X, Wrench, Package, ChevronRight } from 'lucide-react';
import { Service, Part } from '../types';

interface GlobalSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
    const { db } = useDatabase();
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<{ type: 'service' | 'part', item: Service | Part }[]>([]);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            // Auto-focus input could be added here with a ref
        } else {
            document.body.style.overflow = 'unset';
            setQuery(''); // Reset query on close
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    useEffect(() => {
        if (!query.trim() || !db) {
            setResults([]);
            return;
        }

        const lowerQuery = query.toLowerCase();

        const matchingServices = db.services
            .filter(s => s.name.toLowerCase().includes(lowerQuery) || s.description.toLowerCase().includes(lowerQuery))
            .map(s => ({ type: 'service' as const, item: s }));

        const matchingParts = db.parts
            .filter(p => p.name.toLowerCase().includes(lowerQuery) || p.brand.toLowerCase().includes(lowerQuery) || p.category.toLowerCase().includes(lowerQuery))
            .map(p => ({ type: 'part' as const, item: p }));

        setResults([...matchingServices, ...matchingParts]);
    }, [query, db]);

    const handleNavigate = (result: { type: 'service' | 'part', item: Service | Part }) => {
        onClose();
        if (result.type === 'service') {
            navigate(`/service/${result.item.id}`);
        } else {
            navigate(`/part/${result.item.id}`);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[60] animate-fadeIn flex flex-col p-4 sm:p-6" onClick={onClose}>
            {/* Search Container */}
            <div
                className="w-full max-w-3xl mx-auto bg-[#1A1A1A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-scaleUp"
                onClick={e => e.stopPropagation()}
            >
                {/* Header / Input */}
                <div className="p-4 border-b border-white/10 flex items-center gap-3 bg-white/5">
                    <Search className="text-gray-400 w-6 h-6" />
                    <input
                        type="text"
                        placeholder="Search services, parts, tools..."
                        className="flex-1 bg-transparent border-none outline-none text-white text-lg placeholder-gray-500 font-medium"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        autoFocus
                    />
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Results List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                    {query.trim() === '' ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                            <Search className="w-12 h-12 mb-4 opacity-20" />
                            <p className="text-sm">Start typing to search...</p>
                        </div>
                    ) : results.length > 0 ? (
                        <div className="space-y-1">
                            {results.map((result) => (
                                <div
                                    key={`${result.type}-${result.item.id}`}
                                    onClick={() => handleNavigate(result)}
                                    className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-colors group"
                                >
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${result.type === 'service' ? 'bg-primary/20 text-primary' : 'bg-blue-500/20 text-blue-400'}`}>
                                        {result.type === 'service' ? <Wrench className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-white font-semibold truncate group-hover:text-primary transition-colors">{result.item.name}</h4>
                                        <p className="text-xs text-gray-400 truncate">
                                            {result.type === 'service' ? 'Service' : 'Part'} • {result.type === 'part' ? (result.item as Part).brand : (result.item as Service).category}
                                        </p>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                            <p className="text-sm">No matches found for "{query}"</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GlobalSearchModal;
