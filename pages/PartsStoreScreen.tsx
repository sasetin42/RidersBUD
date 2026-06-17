
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomerHeader from '../components/CustomerHeader';
import { useCart } from '../context/CartContext';
import { Part } from '../types';
import { useWishlist } from '../context/WishlistContext';
import Spinner from '../components/Spinner';
import { useDatabase } from '../context/DatabaseContext';
import { useAuth } from '../context/AuthContext';
import { Package, Search, X, ChevronDown } from 'lucide-react';
import UnifiedProductCard from '../components/ui/UnifiedProductCard';

// FIX: Changed 'interface' to 'const' to define a functional component.
const ComparisonModal: React.FC<{ items: Part[]; onClose: () => void }> = ({ items, onClose }) => {
    const features = ['price', 'category', 'description'];
    return (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-dark-gray rounded-xl w-full max-w-3xl animate-scaleUp">
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
                                            {feature === 'price' ? `₱${(item.price || 0).toFixed(2)}` : item[feature as keyof Part]}
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
            onClick={() => navigate(`/customer-portal/part/${part.id}`)}
            className="bg-[#1E1E1E] rounded-xl overflow-hidden group border border-white/5 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 flex flex-col h-full"
        >
            {/* Image Container - Square Aspect Ratio for bigger display */}
            <UnifiedProductCard
                imageUrl={part.imageUrls[0]}
                alt={part.name}
                aspectRatio="square"
                className="group relative"
            >
                {/* Gradient overlay for depth */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

                {/* Image glow border on hover */}
                <div className="absolute inset-0 ring-1 ring-white/5 group-hover:ring-primary/30 rounded-xl transition-all duration-500 pointer-events-none" />

                {/* Badges */}
                <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-auto">
                    {hasSale && (
                        <span className="bg-red-500 text-white text-[10px] font-black tracking-wider px-2 py-1 rounded shadow-lg animate-pulse">Sale</span>
                    )}
                    <span className="bg-black/60 backdrop-blur-md text-white text-[10px] font-bold tracking-wider px-2 py-1 rounded border border-white/10">{part.brand}</span>
                </div>

                <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0 pointer-events-auto">
                    <button
                        onClick={handleToggleWishlist}
                        className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-all ${isWishlisted ? 'bg-red-500 text-white' : 'bg-white/90 text-gray-900 hover:bg-primary hover:text-white backdrop-blur-sm'}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill={isWishlisted ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 016.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z" /></svg>
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onToggleCompare(part); }}
                        className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-all ${isComparing ? 'bg-primary text-white' : 'bg-white/90 text-gray-900 hover:bg-primary hover:text-white backdrop-blur-sm'}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                    </button>
                </div>

                {stockStatus === 'out-of-stock' && (
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px] flex items-center justify-center pointer-events-none z-10">
                        <span className="text-white font-black text-xs sm:text-sm tracking-widest border-2 border-white/80 px-2 py-0.5 sm:px-3 sm:py-1 -rotate-12">Out of Stock</span>
                    </div>
                )}
            </UnifiedProductCard>

            <div className="p-3 sm:p-4 flex flex-col flex-grow">
                <div className="mb-1 flex items-center justify-between">
                    <p className="text-[10px] font-bold text-gray-500 tracking-widest truncate max-w-[65%]">{part.category}</p>
                    <p className="text-[10px] font-mono text-gray-600 hidden sm:inline">SKU: {part.sku}</p>
                </div>

                <h3 className="text-xs sm:text-sm font-bold text-white leading-snug line-clamp-2 h-8 sm:h-10 group-hover:text-primary transition-colors mb-2 sm:mb-3">
                    {part.name}
                </h3>

                <div className="mt-auto">
                    <div className="flex flex-wrap items-baseline gap-1 sm:gap-2 mb-2 sm:mb-3">
                        {hasSale ? (
                            <>
                                <span className="text-sm sm:text-lg font-black text-primary">₱{part.salesPrice!.toLocaleString()}</span>
                                <span className="text-[10px] sm:text-xs font-semibold text-gray-500 line-through">₱{part.price.toLocaleString()}</span>
                            </>
                        ) : (
                            <span className="text-sm sm:text-lg font-black text-white">₱{part.price.toLocaleString()}</span>
                        )}
                    </div>

                    {/* Stock Indicator Bar */}
                    <div className="w-full h-1 bg-white/10 rounded-full mb-1 sm:mb-3 overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${stockStatus === 'in-stock' ? 'bg-green-500' : stockStatus === 'low-stock' ? 'bg-orange-500' : 'bg-red-500'}`}
                            style={{ width: stockStatus === 'in-stock' ? '100%' : `${(part.stock / 20) * 100}%` }}
                        ></div>
                    </div>

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
    const [isCategoryOpen, setIsCategoryOpen] = useState(false);
    const [isBrandOpen, setIsBrandOpen] = useState(false);

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
            <CustomerHeader title="Parts & Tools" showBackButton={false} icon={<Package size={22} />} />
            {/* Enhanced Filter Section */}
            <div className="px-5 py-4 border-b border-white/5 bg-[#121212]/50 backdrop-blur-sm z-30">
                {/* Search Bar */}
                <div className="relative mb-3 flex gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search parts, tools, brands..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-10 py-3 bg-[#1E1E1E] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none transition-all text-sm font-medium"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/10 transition-colors"
                            >
                                <X size={16} className="text-gray-500" />
                            </button>
                        )}
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    {/* Category Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                            className={`w-full py-3 text-left pl-4 pr-10 bg-[#1E1E1E] border ${isCategoryOpen ? 'border-primary' : 'border-white/10'} rounded-xl text-white text-sm font-bold transition-all truncate cursor-pointer hover:bg-[#252525] flex items-center justify-between`}
                        >
                            <span className="truncate capitalize">{filterCategory === 'all' ? 'All Categories' : filterCategory}</span>
                            <ChevronDown size={16} className={`text-gray-400 transition-transform duration-300 absolute right-3 ${isCategoryOpen ? 'rotate-180 text-primary' : ''}`} />
                        </button>
                        
                        {isCategoryOpen && (
                            <>
                                <div className="fixed inset-0 z-40" />
                                <div className="absolute top-full left-0 mt-2 w-full bg-[#1A1A1A] border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50 animate-fadeIn origin-top">
                                    <div className="max-h-60 overflow-y-auto scrollbar-hide py-1">
                                        {partCategories.map(c => (
                                            <button
                                                key={c}
                                                onClick={() => { setFilterCategory(c); setIsCategoryOpen(false); }}
                                                className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors ${filterCategory === c ? 'bg-primary/20 text-primary font-bold' : 'text-gray-300 hover:bg-white/10 hover:text-white'} capitalize`}
                                            >
                                                {c === 'all' ? 'All Categories' : c}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Brand Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setIsBrandOpen(!isBrandOpen)}
                            className={`w-full py-3 text-left pl-4 pr-10 bg-[#1E1E1E] border ${isBrandOpen ? 'border-primary' : 'border-white/10'} rounded-xl text-white text-sm font-bold transition-all truncate cursor-pointer hover:bg-[#252525] flex items-center justify-between`}
                        >
                            <span className="truncate capitalize">{brandFilter === 'all' ? 'All Brands' : brandFilter}</span>
                            <ChevronDown size={16} className={`text-gray-400 transition-transform duration-300 absolute right-3 ${isBrandOpen ? 'rotate-180 text-primary' : ''}`} />
                        </button>
                        
                        {isBrandOpen && (
                            <>
                                <div className="fixed inset-0 z-40" />
                                <div className="absolute top-full left-0 mt-2 w-full bg-[#1A1A1A] border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50 animate-fadeIn origin-top">
                                    <div className="max-h-60 overflow-y-auto scrollbar-hide py-1">
                                        {partBrands.map(b => (
                                            <button
                                                key={b}
                                                onClick={() => { setBrandFilter(b); setIsBrandOpen(false); }}
                                                className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors ${brandFilter === b ? 'bg-primary/20 text-primary font-bold' : 'text-gray-300 hover:bg-white/10 hover:text-white'} capitalize`}
                                            >
                                                {b === 'all' ? 'All Brands' : b}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {areFiltersActive && (
                        <button onClick={resetFilters} className="col-span-2 px-3 py-2.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-xs font-bold hover:bg-red-500/20 whitespace-nowrap transition-colors mt-1">
                            Clear Filters
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-grow overflow-y-auto">
                <div className="p-4 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 sm:gap-5">
                    {loading ? <div className="col-span-1 sm:col-span-2 lg:col-span-3 flex justify-center pt-10"><Spinner size="lg" /></div>
                        : displayedParts.length > 0 ? displayedParts.map(part => <PartCard key={part.id} part={part} onToggleCompare={handleToggleCompare} isComparing={comparisonItems.some(p => p.id === part.id)} />)
                            : <div className="col-span-1 sm:col-span-2 lg:col-span-3 flex flex-col items-center justify-center text-center h-full text-light-gray p-8"><svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-gray-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg><h3 className="text-xl font-semibold text-white">No Parts Found</h3><p className="mt-2 text-sm">Try checking your spelling or adjusting your filters.</p></div>}
                </div>
            </div>

            {comparisonItems.length > 0 && (
                <button
                    onClick={() => setIsCompareModalOpen(true)}
                    className="fixed bottom-20 left-5 bg-field/80 backdrop-blur-md text-white w-16 h-16 rounded-full flex flex-col items-center justify-center shadow-lg hover:bg-field transition-transform transform hover:scale-110 active:scale-100 z-40 animate-scaleUp"
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
