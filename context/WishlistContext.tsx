

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { Product } from '../types';

interface WishlistContextType {
    wishlistItems: Product[];
    addToWishlist: (product: Product) => void;
    removeFromWishlist: (productId: string) => void;
    clearWishlist: () => void;
    isInWishlist: (productId: string) => boolean;
    itemCount: number;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const useWishlist = () => {
    const context = useContext(WishlistContext);
    if (context === undefined) {
        throw new Error('useWishlist must be used within a WishlistProvider');
    }
    return context;
};

export const WishlistProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [wishlistItems, setWishlistItems] = useState<Product[]>(() => {
        try {
            const storedWishlist = localStorage.getItem('wishlist');
            return storedWishlist ? JSON.parse(storedWishlist) : [];
        } catch (error) {
            console.error("Failed to load wishlist from localStorage", error);
            return [];
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem('wishlist', JSON.stringify(wishlistItems));
        } catch (error) {
            console.error("Failed to save wishlist to localStorage", error);
        }
    }, [wishlistItems]);

    const addToWishlist = (product: Product) => {
        setWishlistItems(prevItems => {
            if (prevItems.find(item => item.id === product.id)) {
                return prevItems; // Already in wishlist
            }
            return [...prevItems, product];
        });
    };

    const removeFromWishlist = (productId: string) => {
        setWishlistItems(prevItems => prevItems.filter(item => item.id !== productId));
    };

    const clearWishlist = () => {
        setWishlistItems([]);
    };

    const isInWishlist = (productId: string): boolean => {
        return wishlistItems.some(item => item.id === productId);
    };

    const itemCount = wishlistItems.length;

    return (
        <WishlistContext.Provider value={{ wishlistItems, addToWishlist, removeFromWishlist, clearWishlist, isInWishlist, itemCount }}>
            {children}
        </WishlistContext.Provider>
    );
};
