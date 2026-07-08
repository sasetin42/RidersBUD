

import React, { createContext, useState, useContext, ReactNode, useEffect, useRef } from 'react';
// Fix: Changed Product to Part to ensure only valid cart items are added.
import { CartItem, Part } from '../types';
import { useAuth } from './AuthContext';

interface CartContextType {
    cartItems: CartItem[];
    // Fix: Changed product type from Product to Part.
    addToCart: (product: Part) => void;
    removeFromCart: (productId: string) => void;
    removeAllFromCart: (productId: string) => void;
    clearCart: () => void;
    itemCount: number;
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
    const { user } = useAuth();
    const loadedUserIdRef = useRef<string | undefined>(undefined);
    const [cartItems, setCartItems] = useState<CartItem[]>([]);

    useEffect(() => {
        const currentUserId = user?.id;
        const key = currentUserId ? `${CART_STORAGE_KEY}_${currentUserId}` : CART_STORAGE_KEY;
        try {
            const storedCart = localStorage.getItem(key);
            setCartItems(storedCart ? JSON.parse(storedCart) : []);
            loadedUserIdRef.current = currentUserId;
        } catch (error) {
            console.error("Failed to load cart from localStorage", error);
            setCartItems([]);
            loadedUserIdRef.current = currentUserId;
        }
    }, [user?.id]);

    useEffect(() => {
        const currentUserId = user?.id;
        if (loadedUserIdRef.current !== currentUserId) {
            return;
        }
        try {
            const key = currentUserId ? `${CART_STORAGE_KEY}_${currentUserId}` : CART_STORAGE_KEY;
            localStorage.setItem(key, JSON.stringify(cartItems));
        } catch (error) {
            console.error("Failed to save cart to localStorage", error);
        }
    }, [cartItems, user?.id]);

    // Fix: Changed product type from Product to Part.
    const addToCart = (product: Part) => {
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
    };

    const removeFromCart = (productId: string) => {
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
    };

    const removeAllFromCart = (productId: string) => {
        setCartItems(prevItems => prevItems.filter(item => item.id !== productId));
    };
    
    const clearCart = () => {
        setCartItems([]);
    };

    const itemCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

    return (
        <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, removeAllFromCart, clearCart, itemCount }}>
            {children}
        </CartContext.Provider>
    );
};