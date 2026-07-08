

import React, { createContext, useState, useContext, ReactNode, useEffect, useRef } from 'react';
import { Product } from '../types';
import { useAuth } from './AuthContext';

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

const WISHLIST_STORAGE_KEY = 'wishlist';

export const WishlistProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const loadedUserIdRef = useRef<string | undefined>(undefined);
    const [wishlistItems, setWishlistItems] = useState<Product[]>([]);

    useEffect(() => {
        const currentUserId = user?.id;
        const key = currentUserId ? `${WISHLIST_STORAGE_KEY}_${currentUserId}` : WISHLIST_STORAGE_KEY;
        try {
            const storedWishlist = localStorage.getItem(key);
            setWishlistItems(storedWishlist ? JSON.parse(storedWishlist) : []);
            loadedUserIdRef.current = currentUserId;
        } catch (error) {
            console.error("Failed to load wishlist from localStorage", error);
            setWishlistItems([]);
            loadedUserIdRef.current = currentUserId;
        }
    }, [user?.id]);

    useEffect(() => {
        const currentUserId = user?.id;
        if (loadedUserIdRef.current !== currentUserId) {
            return;
        }
        try {
            const key = currentUserId ? `${WISHLIST_STORAGE_KEY}_${currentUserId}` : WISHLIST_STORAGE_KEY;
            localStorage.setItem(key, JSON.stringify(wishlistItems));
        } catch (error) {
            console.error("Failed to save wishlist to localStorage", error);
        }
    }, [wishlistItems, user?.id]);

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
