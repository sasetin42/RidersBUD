
import React, { createContext, useState, useContext, ReactNode } from 'react';
import { CartItem, Product } from '../types';

interface CartContextType {
    cartItems: CartItem[];
    addToCart: (product: Product) => void;
    removeFromCart: (productId: string) => void;
    clearCart: () => void;
    itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [cartItems, setCartItems] = useState<CartItem[]>([]);

    const addToCart = (product: Product) => {
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
    
    const clearCart = () => {
        setCartItems([]);
    };

    const itemCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

    return (
        <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, clearCart, itemCount }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};