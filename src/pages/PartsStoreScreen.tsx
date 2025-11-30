
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useCart } from '../context/CartContext';
import { Part } from '../types';
import { useWishlist } from '../context/WishlistContext';
import Spinner from '../components/Spinner';
import { useDatabase } from '../context/DatabaseContext';
import { useAuth } from '../context/AuthContext';
import { getAIPartSuggestions } from '../services/geminiService';

// FIX: Changed 'interface' to 'const' to define a functional component.
const ComparisonModal: React.FC<{ items: Part[]; onClose: () => void }> = ({ items, onClose }) => {
    const features = ['price', 'category', 'description'];
    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fadeIn" onClick={onClose}>
            <div className="glass border border-white/10 rounded-xl w-full max-w-3xl animate-scaleUp shadow-2xl shadow-primary/10" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b border-field flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">Compare Products</h2>
                    <button onClick={onClose} className="text-2xl text-light-gray">&times;</button>
                </header>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-field">
                                <th className="p-3 text-sm font-semibold text-light-gray w-1/4">Feature</th>
                                {items.map(item => (
                                    <th key={item.id} className="p-3 w-1/4">
                                        <p className="font-bold text-primary">{item.name}</p>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {features.map(feature => (
                                <tr key={feature} className="border-b border-field last:border-b-0">
                                    <td className="p-3 text-sm font-semibold text-light-gray capitalize">{feature}</td>
                                    {items.map(item => (
                                        <td key={item.id} className="p-3 text-sm text-white">
                                            {feature === 'price' ? `₱${item.price.toFixed(2)}` : item[feature as keyof Part]}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};


const PartCard: React.FC<{ part: Part; onToggleCompare: (part: Part) => void; isComparing: boolean; }> = React.memo(({ part, onToggleCompare, isComparing }) => {
    const { addToCart } = useCart();
    const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
    const [isAdded, setIsAdded] = useState(false);
    const navigate = useNavigate();

    const isWishlisted = isInWishlist(part.id);
    const hasSale = part.salesPrice && part.salesPrice < part.price;
    const stockStatus = part.stock > 10 ? 'in-stock' : part.stock > 0 ? 'low-stock' : 'out-of-stock';
    const canAddToCart = stockStatus !== 'out-of-stock';


    const handleAddToCart = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!canAddToCart) return;
        addToCart(part);
        setIsAdded(true);
        setTimeout(() => setIsAdded(false), 2000);
    };

    const handleToggleWishlist = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isWishlisted) removeFromWishlist(part.id);
        else addToWishlist(part);
    };

    return (
        <div
            onClick={() => navigate(`/part/${part.id}`)}
            className="glass border border-white/10 rounded-xl overflow-hidden flex flex-col relative group transition-all duration-300 hover:shadow-glow-sm hover:-translate-y-2 cursor-pointer hover:border-primary/30"
        >
            <div className="relative">
                <img src={part.imageUrls[0]} alt={part.name} className="w-full h-32 object-cover" />

                {hasSale && (
                    <div className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">SALE</div>
                )}

                <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button onClick={(e) => { e.stopPropagation(); onToggleCompare(part); }} className={`bg-black/40 backdrop-blur-sm rounded-full p-2 z-10 transition-all duration-200 hover:scale-110 ${isComparing ? 'bg-primary/80 text-white' : 'text-white'}`} aria-label="Compare">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                    </button>
                </div>
            </div>
            <div className="p-3 flex-grow flex flex-col">
                <h3 className="text-sm font-semibold text-white leading-tight flex-grow group-hover:text-primary transition-colors">{part.name}</h3>

                <div className="mt-2">
                    {hasSale ? (
                        <div className="flex items-baseline gap-2">
                            <p className="text-primary font-bold text-lg">₱{part.salesPrice!.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                            <p className="text-light-gray font-semibold text-sm line-through">₱{part.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                        </div>
                    ) : (
                        <p className="text-primary font-bold text-lg">₱{part.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    )}

                    <div className="mt-1">
                        {stockStatus === 'in-stock' && <p className="text-[10px] text-green-400 font-semibold">In Stock</p>}
                        {stockStatus === 'low-stock' && <p className="text-[10px] text-orange-400 font-semibold">Low Stock ({part.stock} left)</p>}
                        {stockStatus === 'out-of-stock' && <p className="text-[10px] text-red-400 font-semibold">Out of Stock</p>}
                    </div>
                </div>

                <div className="mt-3 pt-2 border-t border-field flex items-center gap-2">
                    <button onClick={handleToggleWishlist} className="flex-shrink-0 glass-light rounded-md p-2 transition-all duration-300 hover:scale-110 hover:shadow-glow-sm" aria-label="Toggle Wishlist">
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isWishlisted ? 'text-red-500' : 'text-white'}`} fill={isWishlisted ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 016.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z" /></svg>
                    </button>
                    <button
                        onClick={handleAddToCart}
                        className={`flex-grow text-white font-medium py-1.5 px-3 rounded-md text-xs transition-colors duration-300 ${isAdded ? 'bg-green-600' : 'bg-primary hover:bg-orange-600 disabled:bg-gray-700 disabled:cursor-not-allowed'}`}
                        disabled={isAdded || !canAddToCart}
                    >
                        {isAdded ? 'Added ✓' : 'Add to Cart'}
                    </button>
                </div>
            </div>
        </div>
    );
});

const PartsStoreScreen: React.FC = () => {
    const { db, loading } = useDatabase();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    const [brandFilter, setBrandFilter] = useState('all');
    const [comparisonItems, setComparisonItems] = useState<Part[]>([]);
    const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

    const parts = db?.parts || [];

    const handleToggleCompare = useCallback((part: Part) => {
        setComparisonItems(prev => {
            if (prev.find(p => p.id === part.id)) {
                return prev.filter(p => p.id !== part.id);
            }
            if (prev.length >= 3) {
                alert("You can compare a maximum of 3 items.");
                return prev;
            }
            return [...prev, part];
        });
    }, []);

    const partCategories = useMemo(() => ['all', ...Array.from(new Set(parts.map(p => p.category)))], [parts]);
    const partBrands = useMemo(() => ['all', ...Array.from(new Set(parts.map(p => p.brand)))], [parts]);

    const displayedParts = useMemo(() => {
        let filteredParts = [...parts];

        const lowercasedQuery = searchQuery.toLowerCase();
        if (searchQuery) {
            filteredParts = filteredParts.filter(p =>
                p.name.toLowerCase().includes(lowercasedQuery) ||
                p.sku.toLowerCase().includes(lowercasedQuery) ||
                p.category.toLowerCase().includes(lowercasedQuery) ||
                p.brand.toLowerCase().includes(lowercasedQuery)
            );
        }
        if (filterCategory !== 'all') {
            filteredParts = filteredParts.filter(p => p.category === filterCategory);
        }
        if (brandFilter !== 'all') {
            filteredParts = filteredParts.filter(p => p.brand === brandFilter);
        }

        filteredParts.sort((a, b) => a.name.localeCompare(b.name));

        return filteredParts;
    }, [parts, searchQuery, filterCategory, brandFilter]);

    const resetFilters = () => {
        setSearchQuery('');
        setFilterCategory('all');
        setBrandFilter('all');
    };

    const areFiltersActive = searchQuery || filterCategory !== 'all' || brandFilter !== 'all';

    return (
        <div className="flex flex-col h-full bg-secondary">
            <Header title="Parts & Tools" />
            <div className="p-4 border-b border-dark-gray space-y-4">
                <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-light-gray" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg></span>
                    <input type="text" placeholder="Search name, SKU, brand..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 glass border border-white/10 rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/30 transition-all duration-300" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="category-filter" className="block text-xs font-medium text-light-gray mb-1">Category</label>
                        <select id="category-filter" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="w-full px-4 py-2 glass border border-white/10 rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/30 h-[42px] text-sm transition-all duration-300">{partCategories.map(c => <option key={c} value={c} className="capitalize">{c === 'all' ? 'All Categories' : c}</option>)}</select>
                    </div>
                    <div>
                        <label htmlFor="brand-filter" className="block text-xs font-medium text-light-gray mb-1">Brand</label>
                        <select id="brand-filter" value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)} className="w-full px-4 py-2 bg-field border border-dark-gray rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-1 focus:ring-primary h-[42px] text-sm">{partBrands.map(b => <option key={b} value={b}>{b === 'all' ? 'All Brands' : b}</option>)}</select>
                    </div>
                </div>
                {areFiltersActive && (
                    <button onClick={resetFilters} className="w-full text-center text-xs text-primary hover:underline">
                        Reset All Filters
                    </button>
                )}
            </div>

            <div className="flex-grow overflow-y-auto">
                <div className="p-4 grid grid-cols-2 gap-4">
                    {loading ? <div className="col-span-2 flex justify-center pt-10"><Spinner size="lg" /></div>
                        : displayedParts.length > 0 ? displayedParts.map(part => <PartCard key={part.id} part={part} onToggleCompare={handleToggleCompare} isComparing={comparisonItems.some(p => p.id === part.id)} />)
                            : <div className="col-span-2 flex flex-col items-center justify-center text-center h-full text-light-gray p-8"><svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-gray-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg><h3 className="text-xl font-semibold text-white">No Parts Found</h3><p className="mt-2 text-sm">Try checking your spelling or adjusting your filters.</p></div>}
                </div>
            </div>

            {comparisonItems.length > 0 && (
                <button
                    onClick={() => setIsCompareModalOpen(true)}
                    className="fixed bottom-20 left-5 glass text-white w-16 h-16 rounded-full flex flex-col items-center justify-center shadow-glow hover:shadow-glow-lg transition-all duration-300 hover:scale-110 active:scale-95 z-40 animate-scaleUp border border-white/20"
                    aria-label={`Compare ${comparisonItems.length} items`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-xs font-bold">{comparisonItems.length}/3</span>
                </button>
            )}
            {isCompareModalOpen && <ComparisonModal items={comparisonItems} onClose={() => setIsCompareModalOpen(false)} />}
        </div>
    );
};

export default PartsStoreScreen;
