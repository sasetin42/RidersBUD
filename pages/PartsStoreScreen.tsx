
import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { useCart } from '../context/CartContext';
import { mockParts } from '../data/mockData';
import { Part } from '../types';
import { useWishlist } from '../context/WishlistContext';
import Spinner from '../components/Spinner';

const PartCard: React.FC<{ part: Part; }> = ({ part }) => {
    const { addToCart } = useCart();
    const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();

    const isWishlisted = isInWishlist(part.id);

    const handleAddToCart = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        addToCart(part);
        alert(`${part.name} added to cart!`);
    };

    const handleToggleWishlist = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        if (isWishlisted) {
            removeFromWishlist(part.id);
        } else {
            addToWishlist(part);
        }
    };

    return (
        <div className="bg-dark-gray rounded-lg overflow-hidden flex flex-col relative">
            <button onClick={handleToggleWishlist} className="absolute top-2 right-2 bg-black bg-opacity-40 rounded-full p-1.5 z-10" aria-label="Toggle Wishlist">
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transition-colors ${isWishlisted ? 'text-red-500' : 'text-white'}`} fill={isWishlisted ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 016.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z" />
                </svg>
            </button>
            <img src={part.imageUrl} alt={part.name} className="w-full h-32 object-cover" />
            <div className="p-4 flex-grow flex flex-col">
                <h3 className="text-lg font-bold text-white">{part.name}</h3>
                <p className="text-sm text-light-gray mt-1 flex-grow">{part.description.substring(0, 50)}...</p>
                <div className="mt-4 flex justify-between items-center">
                    <span className="text-primary font-bold text-lg">${part.price.toFixed(2)}</span>
                    <button onClick={handleAddToCart} className="bg-primary text-white font-bold py-2 px-4 rounded-md hover:bg-orange-600 transition">
                        Add to Cart
                    </button>
                </div>
            </div>
        </div>
    );
};

const PartsStoreScreen: React.FC = () => {
    const [parts, setParts] = useState<Part[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setParts(mockParts);
            setLoading(false);
        }, 800);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="flex flex-col h-full bg-secondary">
            <Header title="Parts & Tools" />
            {loading ? (
                <div className="flex-grow flex items-center justify-center">
                    <Spinner size="lg" />
                </div>
            ) : (
                <div className="flex-grow p-4 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto">
                    {parts.map(part => (
                        <PartCard key={part.id} part={part} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default PartsStoreScreen;
