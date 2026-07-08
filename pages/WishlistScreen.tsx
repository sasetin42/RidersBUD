import React from 'react';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { useDatabase } from '../context/DatabaseContext';
import { Link, useNavigate } from 'react-router-dom';
import { Part } from '../types';
import { getProductImage } from '../utils/imageConstants';
import CustomerHeader from '../components/CustomerHeader';
import { Heart, Trash2, Eye, ShoppingBag, ShoppingCart, Tag, CheckCircle2, ArrowRight } from 'lucide-react';
import Tooltip from '../components/ui/Tooltip';

const WishlistScreen: React.FC = () => {
    const { wishlistItems, removeFromWishlist, clearWishlist, addToWishlist, isInWishlist } = useWishlist();
    const { addToCart } = useCart();
    const { db } = useDatabase();
    const navigate = useNavigate();

    const handleAddToCart = (item: any) => {
        addToCart(item as Part);
    };

    const handleMoveAllToCart = () => {
        const inStockItems = wishlistItems.filter(item => (item.stock ?? 1) > 0);
        inStockItems.forEach(item => {
            addToCart(item as Part);
            removeFromWishlist(item.id);
        });
    };

    // Calculate metrics
    const totalValue = wishlistItems.reduce((sum, item) => sum + (item.price || 0), 0);
    const saleItemsCount = wishlistItems.filter(item => (item.salesPrice && item.salesPrice < item.price) || (item.originalPrice && item.originalPrice > item.price)).length;
    const inStockItemsCount = wishlistItems.filter(item => (item.stock ?? 1) > 0).length;

    // Get recommendations (excluding items already in wishlist)
    const recommendedParts = (db?.parts || [])
        .filter(part => !wishlistItems.some(item => item.id === part.id))
        .slice(0, 4);

    return (
        <div className="flex flex-col min-h-screen bg-secondary pb-24 text-white font-sans">
            <CustomerHeader 
                title="Wishlist" 
                subtitle={wishlistItems.length > 0 ? `${wishlistItems.length} saved item${wishlistItems.length !== 1 ? 's' : ''}` : "Save your favorite parts"} 
                showBackButton={true} 
                icon={<Heart size={18} className="text-primary fill-primary" />} 
            />

            {wishlistItems.length === 0 ? (
                <div className="flex-grow overflow-y-auto px-6 py-8 flex flex-col gap-10">
                    {/* Empty Glassmorphic Card */}
                    <div className="bg-[#141416] border border-white/5 rounded-3xl p-8 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl"></div>
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl"></div>
                        
                        <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 border border-primary/20 relative group">
                            <Heart size={36} className="text-primary fill-primary/20 group-hover:scale-110 transition-transform duration-300 animate-pulse" />
                            <div className="absolute inset-0 rounded-2xl border border-primary/40 animate-ping opacity-25"></div>
                        </div>
                        
                        <h2 className="text-xl font-black tracking-tight mb-2 uppercase">Your Wishlist is Empty</h2>
                        <p className="text-xs text-gray-400 max-w-xs mb-8 leading-relaxed">
                            Explore our premium selection of motorcycle and car parts, tools, and accessories to curate your garage essentials.
                        </p>
                        
                        <button
                            onClick={() => navigate('/customer-portal/parts-store')}
                            className="w-full sm:w-auto bg-primary hover:bg-orange-600 text-white font-black uppercase tracking-widest text-xs py-4 px-10 rounded-xl flex items-center justify-center gap-2 transition-all transform active:scale-98 shadow-lg shadow-primary/20"
                        >
                            Browse Parts Store <ArrowRight size={14} />
                        </button>
                    </div>

                    {/* Recommendations Section */}
                    {recommendedParts.length > 0 && (
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-black uppercase tracking-wider text-gray-500">// Recommended For You</span>
                                <Link to="/customer-portal/parts-store" className="text-[11px] font-black text-primary hover:underline uppercase tracking-wider">View All</Link>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                {recommendedParts.map((part) => {
                                    const partImg = part.imageUrls?.[0] || '';
                                    return (
                                        <div 
                                            key={part.id} 
                                            onClick={() => navigate(`/customer-portal/part/${part.id}`)}
                                            className="bg-[#141416] border border-white/5 hover:border-primary/20 rounded-2xl p-3 flex flex-col justify-between gap-3 cursor-pointer group transition-all"
                                        >
                                            <div className="w-full aspect-square rounded-xl bg-white/5 overflow-hidden relative">
                                                <img 
                                                    src={getProductImage(partImg)} 
                                                    alt={part.name} 
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                    onError={(e) => { (e.target as HTMLImageElement).src = getProductImage(''); }}
                                                />
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        addToWishlist(part);
                                                    }}
                                                    className="absolute top-2 right-2 w-7 h-7 bg-black/60 backdrop-blur-md rounded-lg flex items-center justify-center hover:bg-primary/20 transition-all border border-white/10 active:scale-90"
                                                >
                                                    <Heart size={13} className="text-gray-400 group-hover:text-primary transition-colors" />
                                                </button>
                                            </div>
                                            
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-[9px] font-black text-primary uppercase tracking-widest truncate">{part.brand || part.category}</span>
                                                <h4 className="text-xs font-bold text-white line-clamp-1 mt-0.5 group-hover:text-primary transition-colors">{part.name}</h4>
                                                <span className="text-xs font-black text-white mt-1.5">₱{part.price.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex-grow overflow-y-auto px-6 py-6 flex flex-col gap-6">
                    {/* Glassmorphic Metrics Summary Card */}
                    <div className="bg-[#141416] border border-white/5 rounded-3xl p-5 flex items-center justify-between shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl"></div>
                        <div className="flex items-center gap-4 divide-x divide-white/5 w-full">
                            <div className="flex flex-col gap-1 pr-4 flex-[1.6] min-w-0">
                                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Total Value</span>
                                <span className="text-base font-black text-white tracking-tight">₱{totalValue.toLocaleString()}</span>
                            </div>
                            <div className="flex flex-col gap-1 pl-4 flex-1 min-w-0">
                                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">On Sale</span>
                                <span className="text-base font-black text-primary tracking-tight">
                                    {saleItemsCount} <Tag size={11} className="inline-block ml-0.5 align-baseline" />
                                </span>
                            </div>
                            <div className="flex flex-col gap-1 pl-4 flex-1 min-w-0">
                                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">In Stock</span>
                                <span className="text-base font-black text-green-400 tracking-tight">
                                    {inStockItemsCount} <CheckCircle2 size={11} className="inline-block ml-0.5 align-baseline" />
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Actions Toolbar */}
                    <div className="flex items-center gap-2.5 w-full">
                            {inStockItemsCount > 0 && (
                                <button
                                    onClick={handleMoveAllToCart}
                                    className="flex-1 text-[10px] bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary font-black tracking-widest uppercase px-2.5 py-2 rounded-lg active:scale-95 transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"
                                >
                                    <ShoppingCart size={11} /> Move all to cart
                                </button>
                            )}
                            <button
                                onClick={clearWishlist}
                                className="flex-1 text-[10px] bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 font-black tracking-widest uppercase px-2.5 py-2 rounded-lg active:scale-95 transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"
                            >
                                <Trash2 size={11} /> Clear Wishlist
                            </button>
                        </div>

                    {/* Wishlist List Grid */}
                    <div className="flex flex-col gap-4">
                        {wishlistItems.map((item) => {
                            const imageUrl = item.imageUrls?.[0] || '';
                            const hasSale = (item.salesPrice && item.salesPrice < item.price) || (item.originalPrice && item.originalPrice > item.price);
                            const origPrice = item.originalPrice || item.price + 500; // safe original price display
                            return (
                                <div 
                                    key={item.id} 
                                    className="bg-[#141416] hover:bg-[#18181b] rounded-2xl p-3.5 flex gap-4 border border-white/5 hover:border-primary/20 transition-all duration-300 relative group"
                                >
                                    {/* Image */}
                                    <div className="w-24 h-24 bg-white/5 rounded-xl flex-shrink-0 overflow-hidden relative border border-white/5">
                                        <img
                                            src={getProductImage(imageUrl)}
                                            alt={item.name}
                                            onError={(event) => {
                                                const target = event.target as HTMLImageElement;
                                                target.onerror = null;
                                                target.src = getProductImage('');
                                            }}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                        />
                                        {hasSale && (
                                            <div className="absolute top-1.5 left-1.5 bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded tracking-wide uppercase">
                                                Sale
                                            </div>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 flex flex-col justify-between min-w-0">
                                        <div>
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-[9px] font-black text-primary uppercase tracking-widest truncate">
                                                    {item.brand || item.category || 'Spare Part'}
                                                </span>
                                                <span className={`text-[9px] font-black tracking-wider ${item.stock > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                    {item.stock > 0 ? '• In Stock' : '• Out of Stock'}
                                                </span>
                                            </div>
                                            <Link to={`/customer-portal/part/${item.id}`} className="block group/title mt-0.5">
                                                <h3 className="text-white font-black text-sm leading-snug line-clamp-1 group-hover/title:text-primary transition-colors uppercase tracking-tight">{item.name}</h3>
                                            </Link>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className="text-yellow-400 text-[10px]">★</span>
                                                <span className="text-white text-[9px] font-bold">4.8</span>
                                                <span className="text-gray-500 text-[9px]">({item.sku || 'SKU-001'})</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between mt-2.5">
                                            <div className="flex items-baseline gap-1.5">
                                                <span className="text-white font-black text-base">₱{item.price.toLocaleString()}</span>
                                                {hasSale && (
                                                    <span className="text-gray-600 text-[10px] line-through font-bold">₱{origPrice.toLocaleString()}</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Tooltip content="Remove">
                                                    <button
                                                        onClick={() => removeFromWishlist(item.id)}
                                                        className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg hover:text-red-300 transition-colors"
                                                    >
                                                        <Trash2 size={11.5} />
                                                    </button>
                                                </Tooltip>
                                                
                                                <Tooltip content="View">
                                                    <Link
                                                        to={`/customer-portal/part/${item.id}`}
                                                        className="p-1.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg transition-colors flex items-center justify-center border border-white/5"
                                                    >
                                                        <Eye size={11.5} />
                                                    </Link>
                                                </Tooltip>

                                                <button
                                                    onClick={() => handleAddToCart(item)}
                                                    disabled={item.stock === 0}
                                                    className="bg-white hover:bg-gray-200 disabled:bg-white/10 text-black disabled:text-gray-600 p-1.5 px-2.5 rounded-lg transition-colors shadow-lg active:scale-95 flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-wider disabled:shadow-none"
                                                >
                                                    <ShoppingCart size={11} /> Add
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default WishlistScreen;
