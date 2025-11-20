import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useDatabase } from '../context/DatabaseContext';
import Spinner from '../components/Spinner';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';

const PartDetailScreen: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { db } = useDatabase();
    const { cartItems, addToCart } = useCart();
    const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
    const [isAdded, setIsAdded] = useState(false);

    const part = db?.parts.find(p => p.id === id);
    const [mainImage, setMainImage] = useState(part?.imageUrls[0] || '');

    if (!db) {
        return <div className="flex items-center justify-center h-full bg-secondary"><Spinner size="lg" /></div>;
    }

    if (!part) {
        return (
            <div className="flex flex-col h-full bg-secondary">
                <Header title="Not Found" showBackButton />
                <div className="flex-grow flex items-center justify-center"><p>Part not found.</p></div>
            </div>
        );
    }
    
    if (part && !mainImage) {
        setMainImage(part.imageUrls[0]);
    }

    const isWishlisted = isInWishlist(part.id);
    const hasSale = part.salesPrice && part.salesPrice < part.price;

    const handleToggleWishlist = () => {
        if (isWishlisted) {
            removeFromWishlist(part.id);
        } else {
            addToWishlist(part);
        }
    };

    const handleAddToCart = () => {
        if (part.stock > 0) {
            addToCart(part);
            setIsAdded(true);
            setTimeout(() => setIsAdded(false), 2000);
        }
    };

    const handleBuyNow = () => {
        if (part.stock <= 0) return;
        addToCart(part);
        navigate('/cart');
    };

    const canAddToCart = part.stock > 0;

    return (
        <div className="flex flex-col h-full bg-secondary">
            <Header title={part.name} showBackButton />
            <div className="flex-grow overflow-y-auto">
                <div className="relative bg-dark-gray">
                    <img src={mainImage} alt={part.name} className="w-full h-64 object-contain" />
                    {part.imageUrls.length > 1 && (
                        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2">
                            {part.imageUrls.map((img, index) => (
                                <button key={index} onClick={() => setMainImage(img)} className={`w-14 h-14 rounded-md overflow-hidden border-2 transition-all ${mainImage === img ? 'border-primary scale-110' : 'border-transparent opacity-70 hover:opacity-100'}`}>
                                    <img src={img} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover"/>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <div className="p-6">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <h1 className="text-2xl font-bold text-white pr-4">{part.name}</h1>
                             {hasSale ? (
                                <div className="flex items-baseline gap-2 mt-1">
                                    <p className="text-primary font-bold text-2xl">₱{part.salesPrice!.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                                    <p className="text-light-gray font-semibold text-lg line-through">₱{part.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                                </div>
                            ) : (
                                <p className="text-primary font-bold text-2xl mt-1">₱{part.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                            )}
                        </div>
                        <button 
                            onClick={handleToggleWishlist} 
                            className="bg-dark-gray/50 backdrop-blur-sm rounded-full p-3 z-10 transition-transform duration-200 hover:scale-110 flex-shrink-0" 
                            aria-label="Toggle Wishlist"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transition-colors ${isWishlisted ? 'text-red-500' : 'text-white'}`} fill={isWishlisted ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 016.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z" />
                            </svg>
                        </button>
                    </div>
                    
                    <div className="mt-2">
                        {part.stock > 10 && <span className="inline-block bg-green-500/20 text-green-300 text-xs font-semibold px-2 py-1 rounded-full">In Stock</span>}
                        {part.stock > 0 && part.stock <= 10 && <span className="inline-block bg-orange-500/20 text-orange-300 text-xs font-semibold px-2 py-1 rounded-full">Hurry, only {part.stock} left!</span>}
                        {part.stock <= 0 && <span className="inline-block bg-red-500/20 text-red-400 text-xs font-semibold px-2 py-1 rounded-full">Out of Stock</span>}
                    </div>


                    <p className="text-light-gray mt-4">{part.description}</p>
                    
                    <div className="mt-6 bg-dark-gray p-4 rounded-lg space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-light-gray">SKU:</span>
                            <span className="font-mono text-white">{part.sku}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-light-gray">Category:</span>
                            <span className="font-medium text-white">{part.category}</span>
                        </div>
                    </div>
                </div>
            </div>
            <div className="p-4 bg-[#1D1D1D] border-t border-dark-gray flex gap-4">
                <button 
                    onClick={handleAddToCart}
                    disabled={!canAddToCart || isAdded}
                    className={`w-1/2 font-bold py-3 rounded-lg transition flex items-center justify-center ${
                        isAdded ? 'bg-green-600 text-white' : 'bg-field text-white hover:bg-gray-600 disabled:bg-gray-700 disabled:text-gray-500'
                    }`}
                >
                    {isAdded ? 'Added ✓' : 'Add to Cart'}
                </button>
                <button 
                    onClick={handleBuyNow} 
                    disabled={!canAddToCart}
                    className="w-1/2 bg-primary text-white font-bold py-3 rounded-lg hover:bg-orange-600 transition disabled:opacity-50"
                >
                    Buy Now
                </button>
            </div>
        </div>
    );
};

export default PartDetailScreen;