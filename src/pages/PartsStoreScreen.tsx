import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useCart } from '../context/CartContext';
import { Part } from '../types';
import { useWishlist } from '../context/WishlistContext';
import Spinner from '../components/Spinner';
import { useDatabase } from '../context/DatabaseContext';
import {
    Search, Filter, ShoppingCart, Heart, ArrowLeftRight,
    Check, AlertCircle, X, ChevronDown, Package
} from 'lucide-react';

const ComparisonModal: React.FC<{ items: Part[]; onClose: () => void }> = ({ items, onClose }) => {
    const features = ['price', 'category', 'brand', 'stock', 'description'];
    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-fadeIn" onClick={onClose}>
            <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden animate-scaleUp" onClick={e => e.stopPropagation()}>
                <header className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <ArrowLeftRight className="text-primary" /> Compare Products
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </header>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5">
                                <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider w-1/5 border-b border-white/10 sticky left-0 bg-[#1A1A1A] z-10">Feature</th>
                                {items.map(item => (
                                    <th key={item.id} className="p-4 w-1/4 border-b border-white/10 min-w-[200px]">
                                        <div className="flex flex-col items-center gap-2">
                                            <img src={item.imageUrls[0]} alt={item.name} className="w-16 h-16 object-cover rounded-lg border border-white/10" />
                                            <p className="font-bold text-white text-center text-sm leading-tight">{item.name}</p>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {features.map((feature, idx) => (
                                <tr key={feature} className={idx % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.02]'}>
                                    <td className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-white/10 sticky left-0 bg-[#1A1A1A] z-10">{feature}</td>
                                    {items.map(item => (
                                        <td key={item.id} className="p-4 text-sm text-gray-300 border-b border-white/10 text-center">
                                            {feature === 'price' ? (
                                                <span className="text-primary font-bold text-lg">₱{item.price.toLocaleString()}</span>
                                            ) : feature === 'stock' ? (
                                                <span className={`${item.stock > 10 ? 'text-green-400' : 'text-orange-400'} font-medium`}>
                                                    {item.stock > 0 ? `${item.stock} units` : 'Out of Stock'}
                                                </span>
                                            ) : (
                                                <span className="capitalize">{item[feature as keyof Part]}</span>
                                            )}
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
            className="group relative bg-[#1A1A1A] rounded-2xl overflow-hidden border border-white/5 shadow-lg transition-all duration-300 hover:border-primary/50 hover:shadow-[0_0_20px_rgba(234,88,12,0.15)] hover:-translate-y-1 cursor-pointer flex flex-col h-full"
        >
            {/* Image Container */}
            <div className="relative aspect-square overflow-hidden bg-[#121212]">
                <img
                    src={part.imageUrls[0]}
                    alt={part.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />

                {/* Badges */}
                <div className="absolute top-3 left-3 flex flex-col gap-2">
                    {hasSale && (
                        <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg animate-pulse">
                            SALE
                        </span>
                    )}
                    {stockStatus === 'low-stock' && (
                        <span className="bg-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg">
                            LOW STOCK
                        </span>
                    )}
                </div>

                {/* Quick Actions Overlay */}
                <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-x-2 group-hover:translate-x-0">
                    <button
                        onClick={handleToggleWishlist}
                        className={`p-2 rounded-full backdrop-blur-md transition-all duration-200 shadow-lg ${isWishlisted ? 'bg-red-500 text-white' : 'bg-black/50 text-white hover:bg-primary'}`}
                    >
                        <Heart size={16} className={isWishlisted ? 'fill-current' : ''} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onToggleCompare(part); }}
                        className={`p-2 rounded-full backdrop-blur-md transition-all duration-200 shadow-lg ${isComparing ? 'bg-primary text-white' : 'bg-black/50 text-white hover:bg-primary'}`}
                    >
                        <ArrowLeftRight size={16} />
                    </button>
                </div>

                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A] via-transparent to-transparent opacity-60" />
            </div>

            {/* Content */}
            <div className="p-4 flex flex-col flex-grow">
                <div className="mb-1 flex justify-between items-start">
                    <p className="text-xs text-primary font-bold uppercase tracking-wider truncate max-w-[70%]">{part.brand}</p>
                    {stockStatus === 'out-of-stock' && <span className="text-[10px] text-red-500 font-bold">Sold Out</span>}
                </div>

                <h3 className="text-white font-bold text-base leading-tight mb-2 line-clamp-2 min-h-[40px] group-hover:text-primary transition-colors">
                    {part.name}
                </h3>

                <div className="mt-auto pt-3 border-t border-white/5 flex items-center justify-between">
                    <div>
                        {hasSale ? (
                            <div className="flex flex-col">
                                <span className="text-xs text-gray-500 line-through">₱{part.price.toLocaleString()}</span>
                                <span className="text-lg font-bold text-white">₱{part.salesPrice!.toLocaleString()}</span>
                            </div>
                        ) : (
                            <span className="text-lg font-bold text-white">₱{part.price.toLocaleString()}</span>
                        )}
                    </div>

                    <button
                        onClick={handleAddToCart}
                        disabled={isAdded || !canAddToCart}
                        className={`p-2.5 rounded-xl transition-all duration-300 shadow-lg ${!canAddToCart ? 'bg-gray-700 cursor-not-allowed opacity-50' :
                            isAdded ? 'bg-green-500 text-white' :
                                'bg-white/10 text-white hover:bg-primary hover:shadow-orange-500/20'
                            }`}
                    >
                        {isAdded ? <Check size={18} /> : <ShoppingCart size={18} />}
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
    const [isFilterOpen, setIsFilterOpen] = useState(false); // Mobile filter toggle

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

    if (loading) return <div className="flex h-screen bg-secondary items-center justify-center"><Spinner size="lg" /></div>;

    return (
        <div className="bg-[#121212] min-h-screen text-gray-100 pb-24 font-sans selection:bg-primary/30">
            <Header title="Parts & Tools" showBackButton showCart />

            {/* Search & Filter Bar */}
            <div className="sticky top-[60px] z-30 bg-[#121212]/80 backdrop-blur-md border-b border-white/5 py-4 px-4 space-y-3">
                <div className="flex gap-3">
                    <div className="relative flex-grow group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Search parts, tools, brands..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-[#1A1A1A] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all shadow-inner"
                        />
                    </div>
                    <button
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className={`p-3 rounded-xl border border-white/10 transition-all ${isFilterOpen ? 'bg-primary text-white border-primary' : 'bg-[#1A1A1A] text-gray-400 hover:text-white'}`}
                    >
                        <Filter size={20} />
                    </button>
                </div>

                {/* Expandable Filters */}
                <div className={`grid grid-cols-2 gap-3 overflow-hidden transition-all duration-300 ${isFilterOpen ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="relative">
                        <select
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            className="w-full pl-4 pr-8 py-2.5 bg-[#1A1A1A] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-primary/50 appearance-none"
                        >
                            {partCategories.map(c => <option key={c} value={c} className="capitalize">{c === 'all' ? 'All Categories' : c}</option>)}
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                    </div>
                    <div className="relative">
                        <select
                            value={brandFilter}
                            onChange={(e) => setBrandFilter(e.target.value)}
                            className="w-full pl-4 pr-8 py-2.5 bg-[#1A1A1A] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-primary/50 appearance-none"
                        >
                            {partBrands.map(b => <option key={b} value={b}>{b === 'all' ? 'All Brands' : b}</option>)}
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                    </div>
                </div>

                {/* Active Filters Summary */}
                {(filterCategory !== 'all' || brandFilter !== 'all') && (
                    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                        <span className="text-xs text-gray-500 font-medium">Active:</span>
                        {filterCategory !== 'all' && (
                            <span className="px-2 py-1 bg-primary/10 border border-primary/20 rounded-md text-primary text-xs font-bold whitespace-nowrap capitalize">
                                {filterCategory}
                            </span>
                        )}
                        {brandFilter !== 'all' && (
                            <span className="px-2 py-1 bg-primary/10 border border-primary/20 rounded-md text-primary text-xs font-bold whitespace-nowrap">
                                {brandFilter}
                            </span>
                        )}
                        <button onClick={resetFilters} className="text-xs text-red-400 hover:text-red-300 ml-auto font-medium">Clear All</button>
                    </div>
                )}
            </div>

            {/* Product Grid */}
            <div className="flex-grow overflow-y-auto px-4 pb-24 pt-4">
                {displayedParts.length > 0 ? (
                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-8">
                        {displayedParts.map((part, index) => (
                            <div key={part.id} className="animate-fadeIn" style={{ animationDelay: `${index * 50}ms` }}>
                                <PartCard
                                    part={part}
                                    onToggleCompare={handleToggleCompare}
                                    isComparing={comparisonItems.some(p => p.id === part.id)}
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-0 animate-fadeIn forwards">
                        <div className="w-24 h-24 bg-[#1A1A1A] rounded-full flex items-center justify-center mb-6 shadow-2xl relative">
                            <Package size={40} className="text-gray-600" />
                            <div className="absolute top-0 right-0 w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center animate-bounce">
                                <AlertCircle size={16} className="text-red-500" />
                            </div>
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">No Parts Found</h3>
                        <p className="text-gray-400 max-w-xs mx-auto mb-6">We couldn't find any items matching your filters. Try checking your spelling or using different keywords.</p>
                        <button onClick={resetFilters} className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold hover:bg-white/10 transition">
                            Clear Filters
                        </button>
                    </div>
                )}
            </div>

            {/* Compare Floating Button */}
            {comparisonItems.length > 0 && (
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 animate-slideInUp">
                    <button
                        onClick={() => setIsCompareModalOpen(true)}
                        className="bg-primary/90 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-[0_8px_30px_rgb(234,88,12,0.4)] flex items-center gap-3 hover:bg-orange-600 transition-all hover:scale-105 active:scale-95 border border-white/20"
                    >
                        <ArrowLeftRight size={20} />
                        <span className="font-bold">Compare ({comparisonItems.length})</span>
                    </button>
                </div>
            )}

            {isCompareModalOpen && <ComparisonModal items={comparisonItems} onClose={() => setIsCompareModalOpen(false)} />}
        </div>
    );
};

export default PartsStoreScreen;
