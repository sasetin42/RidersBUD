
import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { Part } from '../types';
import Spinner from '../components/Spinner';

const WishlistItem: React.FC<{ item: Part }> = ({ item }) => {
    const { removeFromWishlist } = useWishlist();
    const { addToCart } = useCart();

    const handleAddToCart = () => {
        addToCart(item);
        removeFromWishlist(item.id);
        alert(`${item.name} moved to cart!`);
    };

    return (
        <div className="flex items-center bg-dark-gray p-3 rounded-lg">
            <img src={item.imageUrl} alt={item.name} className="w-20 h-20 rounded-lg object-cover mr-4" />
            <div className="flex-grow">
                <h4 className="font-bold">{item.name}</h4>
                <p className="text-primary font-semibold">${item.price.toFixed(2)}</p>
                <div className="mt-2 flex gap-2">
                    <button onClick={handleAddToCart} className="bg-primary text-white text-xs font-bold py-1 px-3 rounded-md hover:bg-orange-600 transition">
                        Move to Cart
                    </button>
                     <button onClick={() => removeFromWishlist(item.id)} className="bg-field text-white text-xs font-bold py-1 px-3 rounded-md hover:bg-gray-600 transition">
                        Remove
                    </button>
                </div>
            </div>
        </div>
    );
};

const WishlistScreen: React.FC = () => {
    const { wishlistItems } = useWishlist();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setLoading(false);
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="flex flex-col h-full bg-secondary">
            <Header title="My Wishlist" showBackButton />
            <main className="flex-grow overflow-y-auto p-4">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <Spinner size="lg" />
                    </div>
                ) : wishlistItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-light-gray px-6">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 016.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z" />
                        </svg>
                        <p className="text-xl font-semibold mb-2">Your Wishlist is Empty</p>
                        <p>Tap the heart icon on any part in the store to save it for later.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {wishlistItems.map(item => (
                            <WishlistItem key={item.id} item={item} />
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default WishlistScreen;
