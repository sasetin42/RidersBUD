
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { Part } from '../types';

interface WishlistContextType {
    wishlistItems: Part[];
    addToWishlist: (part: Part) => void;
    removeFromWishlist: (partId: string) => void;
    isInWishlist: (partId: string) => boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [wishlistItems, setWishlistItems] = useState<Part[]>([]);

    useEffect(() => {
        try {
            const storedWishlist = localStorage.getItem('wishlist');
            if (storedWishlist) {
                setWishlistItems(JSON.parse(storedWishlist));
            }
        } catch (error) {
            console.error("Failed to load wishlist from localStorage", error);
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('wishlist', JSON.stringify(wishlistItems));
    }, [wishlistItems]);

    const addToWishlist = (part: Part) => {
        setWishlistItems(prevItems => {
            if (prevItems.find(item => item.id === part.id)) {
                return prevItems; // Already in wishlist
            }
            return [...prevItems, part];
        });
    };

    const removeFromWishlist = (partId: string) => {
        setWishlistItems(prevItems => prevItems.filter(item => item.id !== partId));
    };

    const isInWishlist = (partId: string): boolean => {
        return wishlistItems.some(item => item.id === partId);
    };

    return (
        <WishlistContext.Provider value={{ wishlistItems, addToWishlist, removeFromWishlist, isInWishlist }}>
            {children}
        </WishlistContext.Provider>
    );
};

export const useWishlist = () => {
    const context = useContext(WishlistContext);
    if (context === undefined) {
        throw new Error('useWishlist must be used within a WishlistProvider');
    }
    return context;
};
