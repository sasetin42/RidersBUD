

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { Product } from '../types';
import { SupabaseDatabaseService } from '../services/supabaseDatabaseService';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useDatabase } from './DatabaseContext';

interface WishlistContextType {
    wishlistItems: Product[];
    addToWishlist: (product: Product) => void;
    removeFromWishlist: (productId: string) => void;
    isInWishlist: (productId: string) => boolean;
    itemCount: number;
    loading: boolean;
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
    const { currentUser } = useAuth();
    const { db } = useDatabase();
    const [wishlistItems, setWishlistItems] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    // Load wishlist from Supabase
    useEffect(() => {
        const loadWishlist = async () => {
            if (currentUser && isSupabaseConfigured() && db) {
                try {
                    const items = await SupabaseDatabaseService.getWishlistItems(currentUser.id);
                    const wishlist: Product[] = items.map((item: any) => {
                        if (item.product_type === 'service') {
                            return db.services.find(s => s.id === item.product_id);
                        } else {
                            return db.parts.find(p => p.id === item.product_id);
                        }
                    }).filter(Boolean) as Product[];
                    setWishlistItems(wishlist);
                } catch (error) {
                    console.error('Failed to load wishlist from Supabase:', error);
                    loadFromLocalStorage();
                }
            } else {
                loadFromLocalStorage();
            }
            setLoading(false);
        };

        loadWishlist();
    }, [currentUser, db]);

    // Setup realtime subscription
    useEffect(() => {
        if (!currentUser || !isSupabaseConfigured() || !supabase || !db) return;

        const channel = supabase
            .channel('wishlist-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'wishlist_items',
                    filter: `customer_id=eq.${currentUser.id}`
                },
                async () => {
                    console.log('[Wishlist] Realtime update detected');
                    const items = await SupabaseDatabaseService.getWishlistItems(currentUser.id);
                    const wishlist: Product[] = items.map((item: any) => {
                        if (item.product_type === 'service') {
                            return db.services.find(s => s.id === item.product_id);
                        } else {
                            return db.parts.find(p => p.id === item.product_id);
                        }
                    }).filter(Boolean) as Product[];
                    setWishlistItems(wishlist);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUser, db]);

    const loadFromLocalStorage = () => {
        try {
            const storedWishlist = localStorage.getItem('wishlist');
            if (storedWishlist) {
                setWishlistItems(JSON.parse(storedWishlist));
            }
        } catch (error) {
            console.error('Failed to load wishlist from localStorage:', error);
        }
    };

    // Save to localStorage as backup
    useEffect(() => {
        if (!loading) {
            localStorage.setItem('wishlist', JSON.stringify(wishlistItems));
        }
    }, [wishlistItems, loading]);

    const addToWishlist = async (product: Product) => {
        // Optimistic update
        setWishlistItems(prevItems => {
            if (prevItems.find(item => item.id === product.id)) {
                return prevItems;
            }
            return [...prevItems, product];
        });

        // Sync to database
        if (currentUser && isSupabaseConfigured()) {
            try {
                const productType = 'category' in product ? 'service' : 'part';
                await SupabaseDatabaseService.addToWishlist(currentUser.id, product.id, productType);
            } catch (error) {
                console.error('Failed to add to wishlist in database:', error);
            }
        }
    };

    const removeFromWishlist = async (productId: string) => {
        // Optimistic update
        setWishlistItems(prevItems => prevItems.filter(item => item.id !== productId));

        // Sync to database
        if (currentUser && isSupabaseConfigured()) {
            try {
                await SupabaseDatabaseService.removeFromWishlist(currentUser.id, productId);
            } catch (error) {
                console.error('Failed to remove from wishlist in database:', error);
            }
        }
    };

    const isInWishlist = (productId: string): boolean => {
        return wishlistItems.some(item => item.id === productId);
    };

    const itemCount = wishlistItems.length;

    return (
        <WishlistContext.Provider value={{ wishlistItems, addToWishlist, removeFromWishlist, isInWishlist, itemCount, loading }}>
            {children}
        </WishlistContext.Provider>
    );
};
