import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomerHeader from '../components/CustomerHeader';
import { useCart } from '../context/CartContext';
import { Part } from '../types';
import { useWishlist } from '../context/WishlistContext';
import Spinner from '../components/Spinner';
import { useDatabase } from '../context/DatabaseContext';
import { useAuth } from '../context/AuthContext';
import { Package, Search, X, ChevronDown, ShoppingBag, Check } from 'lucide-react';
import UnifiedProductCard from '../components/ui/UnifiedProductCard';
import { getPartImage } from '../utils/fallbackImages';

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
    const hasSale = typeof part.salesPrice === 'number' && part.salesPrice > 0 && part.salesPrice < part.price;
    const discountPercent = hasSale ? Math.round(((part.price - part.salesPrice!) / part.price) * 100) : 0;
    const stockStatus = part.stock > 10 ? 'in-stock' : part.stock > 0 ? 'low-stock' : 'out-of-stock';
    const canAddToCart = stockStatus !== 'out-of-stock';

    const partImageUrl = getPartImage(part);

    const handleAddToCart = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!canAddToCart || isAdded) return;
        addToCart(part);
        setIsAdded(true);
        setTimeout(() => setIsAdded(false), 1800);
    };

    const handleToggleWishlist = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isWishlisted) removeFromWishlist(part.id);
        else addToWishlist(part);
    };

    return (
        <div
            onClick={() => navigate(`/customer-portal/part/${part.id}`)}
            className="bg-[#1E1E1E] rounded-2xl overflow-hidden group border border-white/5 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 flex flex-col h-full cursor-pointer relative"
        >
            {/* Image Container - Square Aspect Ratio for crisp real display */}
            <UnifiedProductCard
                imageUrl={partImageUrl}
                fallbackImageUrl={partImageUrl}
                alt={part.name}
                aspectRatio="square"
                className="group relative"
            >
                {/* Subtle dark gradient overlay for image depth & text contrast */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent pointer-events-none" />

                {/* Glow border ring on hover */}
                <div className="absolute inset-0 ring-1 ring-white/5 group-hover:ring-primary/40 rounded-t-2xl transition-all duration-500 pointer-events-none" />

                {/* Dynamic Sale & Discount Badges */}
                {hasSale && (
                    <div className="absolute top-3 left-3 flex flex-col gap-1 pointer-events-auto z-10">
                        <span className="bg-gradient-to-r from-red-600 to-rose-500 text-white text-[10px] font-black tracking-wider px-2 py-0.5 rounded-full shadow-lg shadow-red-500/20 uppercase">
                            Sale
                        </span>
                        {discountPercent > 0 && (
                            <span className="bg-primary/95 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-md backdrop-blur-xs">
                                -{discountPercent}% OFF
                            </span>
                        )}
                    </div>
                )}

                {/* Wishlist & Compare Floating Action Buttons */}
                <div className="absolute top-3 right-3 flex flex-col gap-1.5 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-1 group-hover:translate-x-0 pointer-events-auto z-10">
                    <button
                        onClick={handleToggleWishlist}
                        title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
                        className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-all ${
                            isWishlisted
                                ? 'bg-red-500 text-white shadow-red-500/40 scale-105'
                                : 'bg-black/60 text-white/90 hover:bg-red-500 hover:text-white backdrop-blur-md border border-white/10'
                        }`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill={isWishlisted ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 016.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z" />
                        </svg>
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onToggleCompare(part); }}
                        title={isComparing ? 'Remove from comparison' : 'Compare part'}
                        className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-all ${
                            isComparing
                                ? 'bg-primary text-white shadow-primary/40 scale-105'
                                : 'bg-black/60 text-white/90 hover:bg-primary hover:text-white backdrop-blur-md border border-white/10'
                        }`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                    </button>
                </div>

                {/* Out of Stock Overlay */}
                {stockStatus === 'out-of-stock' && (
                    <div className="absolute inset-0 bg-black/75 backdrop-blur-[2px] flex items-center justify-center pointer-events-none z-10">
                        <span className="text-rose-400 font-black text-xs sm:text-sm tracking-wider border-2 border-rose-500/80 px-3 py-1 rounded bg-black/60 -rotate-6 shadow-xl">
                            ✕ Out of Stock
                        </span>
                    </div>
                )}
            </UnifiedProductCard>

            {/* Part Details Body */}
            <div className="p-2.5 sm:p-3 flex flex-col flex-grow justify-between bg-[#1E1E1E]">
                <div>
                    {/* Single Compact Line: Category & Stock Status */}
                    <div className="mb-1.5 flex items-center justify-between gap-1.5 flex-nowrap">
                        <span className="text-[9px] uppercase font-bold tracking-wider text-orange-400 bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5 rounded shrink-0">
                            {part.category || 'General'}
                        </span>

                        {stockStatus === 'in-stock' && (
                            <span className="text-[9px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded inline-flex items-center gap-1 shrink-0">
                                <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse"></span>
                                In Stock ({part.stock})
                            </span>
                        )}
                        {stockStatus === 'low-stock' && (
                            <span className="text-[9px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded inline-flex items-center gap-1 shrink-0">
                                <span className="w-1 h-1 rounded-full bg-amber-400"></span>
                                Low ({part.stock})
                            </span>
                        )}
                        {stockStatus === 'out-of-stock' && (
                            <span className="text-[9px] font-medium text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded inline-flex items-center gap-1 shrink-0">
                                ✕ Out of Stock
                            </span>
                        )}
                    </div>

                    {/* Product Title: 2-line clamped bold white title with hover transition */}
                    <h3 className="text-xs sm:text-sm font-bold text-white leading-snug line-clamp-2 min-h-[2rem] group-hover:text-primary transition-colors mb-1.5">
                        {part.name}
                    </h3>
                </div>

                {/* Bottom Section: Pricing, Stock Progress & Quick-Add Button */}
                <div className="mt-2 pt-2 border-t border-white/5">
                    {/* Pricing Row */}
                    <div className="flex items-baseline justify-between gap-1 mb-2">
                        <div className="flex items-baseline gap-1.5 flex-wrap">
                            {hasSale ? (
                                <>
                                    <span className="text-base sm:text-lg font-black text-primary">
                                        ₱{part.salesPrice!.toLocaleString()}
                                    </span>
                                    <span className="text-[11px] font-semibold text-gray-500 line-through">
                                        ₱{part.price.toLocaleString()}
                                    </span>
                                </>
                            ) : (
                                <span className="text-base sm:text-lg font-black text-white">
                                    ₱{part.price.toLocaleString()}
                                </span>
                            )}
                        </div>

                        {/* Interactive Quick Add Button */}
                        <button
                            onClick={handleAddToCart}
                            disabled={!canAddToCart}
                            title={canAddToCart ? (isAdded ? 'Added to Cart' : 'Quick Add to Cart') : 'Out of Stock'}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 select-none ${
                                isAdded
                                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-105'
                                    : !canAddToCart
                                    ? 'bg-white/5 text-gray-600 border border-white/5 cursor-not-allowed'
                                    : 'bg-primary hover:bg-orange-600 text-white shadow-md shadow-primary/20 active:scale-95'
                            }`}
                        >
                            {isAdded ? (
                                <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Added</span>
                                </>
                            ) : (
                                <>
                                    <ShoppingBag className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Add</span>
                                </>
                            )}
                        </button>
                    </div>

                    {/* Stock progress indicator: Clean glowing bar */}
                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${
                                stockStatus === 'in-stock'
                                    ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50'
                                    : stockStatus === 'low-stock'
                                    ? 'bg-amber-500 shadow-sm shadow-amber-500/50'
                                    : 'bg-rose-500/50'
                            }`}
                            style={{
                                width: stockStatus === 'in-stock'
                                    ? '100%'
                                    : stockStatus === 'low-stock'
                                    ? `${Math.max(10, Math.min(100, (part.stock / 10) * 100))}%`
                                    : '0%'
                            }}
                        />
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
