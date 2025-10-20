import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useCart } from '../context/CartContext';
import { Part } from '../types';
import { useWishlist } from '../context/WishlistContext';
import Spinner from '../components/Spinner';
import { useDatabase } from '../context/DatabaseContext';

const ComparisonModal: React.FC<{ items: Part[]; onClose: () => void }> = ({ items, onClose }) => {
    const features = ['price', 'category', 'description'];
    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fadeIn" onClick={onClose}>
            <div className="bg-dark-gray rounded-xl w-full max-w-3xl animate-scaleUp" onClick={e => e.stopPropagation()}>
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


const PartCard: React.FC<{ part: Part; onToggleCompare: (part: Part) => void; isComparing: boolean; }> = ({ part, onToggleCompare, isComparing }) => {
    const { addToCart } = useCart();
    const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
    const [isAdded, setIsAdded] = useState(false);
    const navigate = useNavigate();

    const isWishlisted = isInWishlist(part.id);

    const handleAddToCart = (e: React.MouseEvent) => {
        e.stopPropagation();
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
            className="bg-dark-gray rounded-xl overflow-hidden flex flex-col relative group transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 cursor-pointer"
        >
            <div className="relative">
                <img src={part.imageUrl} alt={part.name} className="w-full h-28 object-cover" />
                {part.stock === 0 && (
                    <div className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full">OUT OF STOCK</div>
                )}
                 <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button onClick={(e) => { e.stopPropagation(); onToggleCompare(part); }} className={`bg-black/40 backdrop-blur-sm rounded-full p-2 z-10 transition-all duration-200 hover:scale-110 ${isComparing ? 'bg-primary/80 text-white' : 'text-white'}`} aria-label="Compare">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                    </button>
                </div>
            </div>
            <div className="p-3 flex-grow flex flex-col">
                <h3 className="text-[12px] font-medium text-white leading-tight flex-grow">{part.name}</h3>
                
                <div className="mt-2 pt-2 border-t border-field">
                    <p className="text-primary font-semibold text-base">₱{part.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <div className="flex items-center gap-2 mt-2">
                        <button
                            onClick={handleAddToCart}
                            className={`w-full text-white font-medium py-1.5 px-3 rounded-md text-xs transition-colors duration-300 ${
                                isAdded
                                    ? 'bg-green-600'
                                    : 'bg-primary hover:bg-orange-600 disabled:bg-gray-500 disabled:cursor-not-allowed'
                            }`}
                            aria-label={`Add ${part.name} to cart`}
                            disabled={isAdded || part.stock === 0}
                        >
                            {isAdded ? 'Added ✓' : (part.stock > 0 ? 'Add to Cart' : 'Out of Stock')}
                        </button>
                        <button onClick={handleToggleWishlist} className="flex-shrink-0 bg-field rounded-md p-2 transition-transform duration-200 hover:scale-110" aria-label="Toggle Wishlist">
                             <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isWishlisted ? 'text-red-500' : 'text-white'}`} fill={isWishlisted ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 016.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z" /></svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const PartsStoreScreen: React.FC = () => {
    const { db, loading } = useDatabase();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOption, setSortOption] = useState('name-asc');
    const [filterCategory, setFilterCategory] = useState('all');
    const [priceRange, setPriceRange] = useState('all');
    const [showInStock, setShowInStock] = useState(false);
    const [comparisonItems, setComparisonItems] = useState<Part[]>([]);
    const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

    const parts = db?.parts || [];

    // When the search query is cleared, if the user was sorting by relevance,
    // fall back to a default sort to avoid confusion.
    useEffect(() => {
        if (!searchQuery && sortOption === 'relevance') {
            setSortOption('name-asc');
        }
    }, [searchQuery, sortOption]);

    const handleToggleCompare = (part: Part) => {
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
    };

    const partCategories = useMemo(() => ['all', ...Array.from(new Set(parts.map(p => p.category)))], [parts]);
    
    const displayedParts = useMemo(() => {
        let filteredParts = [...parts];
        
        // --- FILTERING ---
        if (showInStock) {
            filteredParts = filteredParts.filter(p => p.stock > 0);
        }

        if (priceRange !== 'all') {
            const [min, max] = priceRange.split('-').map(Number);
            filteredParts = filteredParts.filter(p => {
                if (max) {
                    return p.price >= min && p.price <= max;
                }
                return p.price >= min;
            });
        }
        
        const lowercasedQuery = searchQuery.toLowerCase();
        if (searchQuery) {
            filteredParts = filteredParts.filter(p => 
                p.name.toLowerCase().includes(lowercasedQuery) || 
                p.sku.toLowerCase().includes(lowercasedQuery) ||
                p.category.toLowerCase().includes(lowercasedQuery)
            );
        }
        if (filterCategory !== 'all') {
            filteredParts = filteredParts.filter(p => p.category === filterCategory);
        }

        // --- SORTING ---
        filteredParts.sort((a, b) => {
            switch (sortOption) {
                case 'relevance':
                    // This case is only active when searchQuery is present
                    const getScore = (part: Part) => {
                        let score = 0;
                        if (part.name.toLowerCase().startsWith(lowercasedQuery)) score += 5;
                        else if (part.name.toLowerCase().includes(lowercasedQuery)) score += 3;
                        if (part.sku.toLowerCase().includes(lowercasedQuery)) score += 2;
                        if (part.category.toLowerCase().includes(lowercasedQuery)) score += 1;
                        if (part.description.toLowerCase().includes(lowercasedQuery)) score += 1;
                        return score;
                    };
                    return getScore(b) - getScore(a);
                case 'price-asc': return a.price - b.price;
                case 'price-desc': return b.price - a.price;
                case 'stock-desc': return b.stock - a.stock;
                case 'name-asc':
                default:
                    return a.name.localeCompare(b.name);
            }
        });

        return filteredParts;
    }, [parts, searchQuery, sortOption, filterCategory, priceRange, showInStock]);

    return (
        <div className="flex flex-col h-full bg-secondary">
            <Header title="Parts & Tools" />
            <div className="p-4 border-b border-dark-gray space-y-4">
                 <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-light-gray" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg></span>
                    <input type="text" placeholder="Search by name, SKU, or category..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-field border border-dark-gray rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div><label htmlFor="category-filter" className="block text-sm font-medium text-light-gray mb-1">Category</label><select id="category-filter" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="w-full px-4 py-2 bg-field border border-dark-gray rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-1 focus:ring-primary h-[42px]">{partCategories.map(c => <option key={c} value={c} className="capitalize">{c === 'all' ? 'All Categories' : c}</option>)}</select></div>
                    <div>
                        <label htmlFor="sort-order" className="block text-sm font-medium text-light-gray mb-1">Sort by</label>
                        <select id="sort-order" value={sortOption} onChange={(e) => setSortOption(e.target.value)} className="w-full px-4 py-2 bg-field border border-dark-gray rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-1 focus:ring-primary h-[42px]">
                            {searchQuery && <option value="relevance">Relevance</option>}
                            <option value="name-asc">Name (A-Z)</option>
                            <option value="price-asc">Price: Low to High</option>
                            <option value="price-desc">Price: High to Low</option>
                            <option value="stock-desc">Stock: High to Low</option>
                        </select>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="price-range-filter" className="block text-sm font-medium text-light-gray mb-1">Price Range</label>
                        <select id="price-range-filter" value={priceRange} onChange={e => setPriceRange(e.target.value)} className="w-full px-4 py-2 bg-field border border-dark-gray rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-1 focus:ring-primary h-[42px]">
                            <option value="all">All Prices</option>
                            <option value="0-500">Under ₱500</option>
                            <option value="500-1500">₱500 - ₱1500</option>
                            <option value="1500-3000">₱1500 - ₱3000</option>
                            <option value="3000">Over ₱3000</option>
                        </select>
                    </div>
                     <div className="flex items-end">
                        <div className="flex items-center bg-field rounded-lg px-4 py-2 w-full h-[42px]">
                            <input id="availability-filter" type="checkbox" checked={showInStock} onChange={e => setShowInStock(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
                            <label htmlFor="availability-filter" className="ml-2 text-sm font-medium text-white">In Stock Only</label>
                        </div>
                    </div>
                </div>
                 <button onClick={() => navigate('/wishlist')} className="w-full flex items-center justify-center gap-2 bg-dark-gray text-white font-bold py-2 rounded-lg hover:bg-field transition">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 016.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z" />
                    </svg>
                    My Wishlist
                </button>
            </div>

            {loading ? <div className="flex-grow flex items-center justify-center"><Spinner size="lg" /></div>
            : <div className="flex-grow p-4 grid grid-cols-2 gap-4 overflow-y-auto">
                {displayedParts.length > 0 ? displayedParts.map(part => <PartCard key={part.id} part={part} onToggleCompare={handleToggleCompare} isComparing={comparisonItems.some(p => p.id === part.id)} />)
                : <div className="col-span-2 flex flex-col items-center justify-center text-center h-full text-light-gray p-8"><svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-gray-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg><h3 className="text-xl font-semibold text-white">No Parts Found</h3><p className="mt-2 text-sm">Try checking your spelling or using a different keyword.</p></div>}
              </div>}

            {comparisonItems.length > 0 && (
                <button 
                    onClick={() => setIsCompareModalOpen(true)}
                    className="fixed bottom-20 left-5 bg-field/80 backdrop-blur-md text-white w-16 h-16 rounded-full flex flex-col items-center justify-center shadow-lg hover:bg-field transition-transform transform hover:scale-110 active:scale-100 z-40 animate-scaleUp"
                    aria-label={`Compare ${comparisonItems.length} items`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
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