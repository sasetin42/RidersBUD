import React from 'react';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { Link } from 'react-router-dom';
import { Part } from '../types';
import { getProductImage } from '../utils/imageConstants';
import CustomerHeader from '../components/CustomerHeader';
import { Heart, Trash2 } from 'lucide-react';

const WishlistScreen: React.FC = () => {
    const { wishlistItems, removeFromWishlist, clearWishlist } = useWishlist();
    const { addToCart } = useCart();

    const handleAddToCart = (item: Part) => {
        addToCart(item);
    };

    if (wishlistItems.length === 0) {
        return (
            <div className="flex flex-col min-h-screen bg-secondary">
                <CustomerHeader title="Wishlist" subtitle="Save your favorite parts" showBackButton={true} icon={<Heart size={18} />} />
                <div className="flex-grow flex flex-col items-center justify-center p-4">
                    <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6 animate-bounce">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-black text-white tracking-tighter mb-2">Your Wishlist is Empty</h2>
                    <p className="text-gray-400 text-center max-w-xs mb-8">
                        Explore our parts store and save your favorite items here for later.
                    </p>
                    <Link to="/customer-portal/parts-store" className="px-8 py-4 bg-primary text-white rounded-2xl font-black tracking-widest shadow-lg shadow-primary/20 hover:bg-orange-600 transition-all transform hover:scale-105 active:scale-95">
                        Browse Parts
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-secondary pb-24">
            <CustomerHeader title="Wishlist" subtitle={`${wishlistItems.length} saved item${wishlistItems.length !== 1 ? 's' : ''}`} showBackButton={true} icon={<Heart size={18} />} />

            <div className="flex-grow overflow-y-auto p-4 space-y-4">
                {/* Clear all header */}
                <div className="flex justify-between items-center mb-2 px-1">
                    <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Favorites</span>
                    <button
                        onClick={clearWishlist}
                        className="text-xs text-red-500 font-black tracking-widest hover:text-red-400 active:scale-95 transition-all flex items-center gap-1.5"
                    >
                        <Trash2 size={12} /> Clear Wishlist
                    </button>
                </div>

                {wishlistItems.map((item) => {
                    const imageUrl = item.imageUrls?.[0] || '';
                    const hasSale = item.salesPrice && item.salesPrice < item.price;
                    return (
                        <div key={item.id} className="bg-[#1A1A1A] rounded-3xl p-4 flex gap-4 border border-white/5 overflow-hidden relative group hover:border-primary/30 transition-all">
                            {/* Image */}
                            <div className="w-24 h-24 sm:w-32 sm:h-32 bg-white/5 rounded-2xl flex-shrink-0 overflow-hidden relative">
                                <img
                                    src={getProductImage(imageUrl)}
                                    alt={item.name}
                                    onError={(event) => {
                                        const target = event.target as HTMLImageElement;
                                        target.onerror = null;
                                        target.src = getProductImage('');
                                    }}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                                {hasSale && (
                                    <div className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-md tracking-wide">
                                        Sale
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 flex flex-col justify-between py-1">
                                <div>
                                    <div className="flex justify-between items-start">
                                        <h3 className="text-white font-bold text-lg leading-tight line-clamp-2 pr-6">{item.name}</h3>
                                        <button
                                            onClick={() => removeFromWishlist(item.id)}
                                            className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors p-1"
                                            title="Remove item"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                    <p className="text-gray-500 text-xs mt-1 line-clamp-1">{item.description}</p>
                                </div>

                                <div className="flex items-end justify-between mt-3">
                                    <div>
                                        <p className="text-primary font-black text-xl">₱{item.price.toLocaleString()}</p>
                                        {item.originalPrice && item.originalPrice > item.price && (
                                            <p className="text-gray-600 text-xs line-through font-bold">₱{item.originalPrice.toLocaleString()}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => removeFromWishlist(item.id)}
                                            className="px-3 py-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-lg text-[10px] font-black tracking-widest transition-all uppercase"
                                        >
                                            Remove
                                        </button>
                                        <button
                                            onClick={() => handleAddToCart(item)}
                                            className="bg-white text-black p-3 rounded-xl hover:bg-gray-200 transition-colors shadow-lg active:scale-95"
                                            title="Add to Cart"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H6L5 9z" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default WishlistScreen;
