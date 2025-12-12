

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { CartItem, Part } from '../types';
import { SupabaseDatabaseService } from '../services/supabaseDatabaseService';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface CartContextType {
    cartItems: CartItem[];
    addToCart: (product: Part) => void;
    removeFromCart: (productId: string) => void;
    removeAllFromCart: (productId: string) => void;
    clearCart: () => void;
    itemCount: number;
    loading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};

const CART_STORAGE_KEY = 'ridersbud_cart';

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { currentUser } = useAuth();
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Load cart from Supabase or localStorage
    useEffect(() => {
        const loadCart = async () => {
            if (currentUser && isSupabaseConfigured()) {
                try {
                    const items = await SupabaseDatabaseService.getCartItems(currentUser.id);
                    const cartItems: CartItem[] = items.map((item: any) => ({
                        ...item.part,
                        quantity: item.quantity
                    }));
                    setCartItems(cartItems);
                } catch (error) {
                    console.error('Failed to load cart from Supabase:', error);
                    // Fallback to localStorage
                    loadFromLocalStorage();
                }
            } else {
                loadFromLocalStorage();
            }
            setLoading(false);
        };

        loadCart();
    }, [currentUser]);

    // Setup realtime subscription for cart updates
    useEffect(() => {
        if (!currentUser || !isSupabaseConfigured() || !supabase) return;

        const channel = supabase
            .channel('cart-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'cart_items',
                    filter: `customer_id=eq.${currentUser.id}`
                },
                async () => {
                    console.log('[Cart] Realtime update detected');
                    const items = await SupabaseDatabaseService.getCartItems(currentUser.id);
                    const cartItems: CartItem[] = items.map((item: any) => ({
                        ...item.part,
                        quantity: item.quantity
                    }));
                    setCartItems(cartItems);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUser]);

    const loadFromLocalStorage = () => {
        try {
            const storedCart = localStorage.getItem(CART_STORAGE_KEY);
            if (storedCart) {
                setCartItems(JSON.parse(storedCart));
            }
        } catch (error) {
            console.error('Failed to load cart from localStorage:', error);
        }
    };

    // Save to localStorage as backup
    useEffect(() => {
        if (!loading) {
            try {
                localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
            } catch (error) {
                console.error('Failed to save cart to localStorage:', error);
            }
        }
    }, [cartItems, loading]);

    const addToCart = async (product: Part) => {
        // Optimistic update
        setCartItems(prevItems => {
            const exist = prevItems.find(item => item.id === product.id);
            if (exist) {
                return prevItems.map(item =>
                    item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            } else {
                return [...prevItems, { ...product, quantity: 1 }];
            }
        });

        // Sync to database
        if (currentUser && isSupabaseConfigured()) {
            try {
                await SupabaseDatabaseService.addToCart(currentUser.id, product.id, 1);
            } catch (error) {
                console.error('Failed to add to cart in database:', error);
            }
        }
    };

    const removeFromCart = async (productId: string) => {
        const existingItem = cartItems.find(item => item.id === productId);

        // Optimistic update
        setCartItems(prevItems => {
            const exist = prevItems.find(item => item.id === productId);
            if (exist && exist.quantity > 1) {
                return prevItems.map(item =>
                    item.id === productId ? { ...item, quantity: item.quantity - 1 } : item
                );
            } else {
                return prevItems.filter(item => item.id !== productId);
            }
        });

        // Sync to database
        if (currentUser && isSupabaseConfigured() && existingItem) {
            try {
                if (existingItem.quantity > 1) {
                    // Get cart item ID from database
                    const items = await SupabaseDatabaseService.getCartItems(currentUser.id);
                    const dbItem = items.find((item: any) => item.part_id === productId);
                    if (dbItem) {
                        await SupabaseDatabaseService.updateCartItemQuantity(dbItem.id, existingItem.quantity - 1);
                    }
                } else {
                    const items = await SupabaseDatabaseService.getCartItems(currentUser.id);
                    const dbItem = items.find((item: any) => item.part_id === productId);
                    if (dbItem) {
                        await SupabaseDatabaseService.removeFromCart(dbItem.id);
                    }
                }
            } catch (error) {
                console.error('Failed to update cart in database:', error);
            }
        }
    };

    const removeAllFromCart = async (productId: string) => {
        // Optimistic update
        setCartItems(prevItems => prevItems.filter(item => item.id !== productId));

        // Sync to database
        if (currentUser && isSupabaseConfigured()) {
            try {
                const items = await SupabaseDatabaseService.getCartItems(currentUser.id);
                const dbItem = items.find((item: any) => item.part_id === productId);
                if (dbItem) {
                    await SupabaseDatabaseService.removeFromCart(dbItem.id);
                }
            } catch (error) {
                console.error('Failed to remove from cart in database:', error);
            }
        }
    };

    const clearCart = async () => {
        // Optimistic update
        setCartItems([]);

        // Sync to database
        if (currentUser && isSupabaseConfigured()) {
            try {
                await SupabaseDatabaseService.clearCart(currentUser.id);
            } catch (error) {
                console.error('Failed to clear cart in database:', error);
            }
        }
    };

    const itemCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

    return (
        <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, removeAllFromCart, clearCart, itemCount, loading }}>
            {children}
        </CartContext.Provider>
    );
};