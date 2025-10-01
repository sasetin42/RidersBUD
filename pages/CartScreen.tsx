
import React from 'react';
import Header from '../components/Header';
import { useCart } from '../context/CartContext';

const CartScreen: React.FC = () => {
    const { cartItems, removeFromCart, addToCart, clearCart } = useCart();

    const total = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

    return (
        <div className="flex flex-col h-full bg-secondary">
            <Header title="My Cart" />
            <div className="flex-grow overflow-y-auto p-4">
                {cartItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-light-gray">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                        <p className="text-xl">Your cart is empty</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {cartItems.map(item => (
                            <div key={item.id} className="flex items-center bg-dark-gray p-3 rounded-lg">
                                <img src={item.imageUrl} alt={item.name} className="w-16 h-16 rounded-lg object-cover mr-4" />
                                <div className="flex-grow">
                                    <h4 className="font-bold">{item.name}</h4>
                                    <p className="text-primary font-semibold">${item.price.toFixed(2)}</p>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <button onClick={() => removeFromCart(item.id)} className="w-6 h-6 bg-field rounded-full">-</button>
                                    <span>{item.quantity}</span>
                                    <button onClick={() => addToCart(item)} className="w-6 h-6 bg-field rounded-full">+</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            {cartItems.length > 0 && (
                 <div className="p-4 bg-[#1D1D1D] border-t border-dark-gray space-y-4">
                    <div className="flex justify-between text-lg">
                        <span className="text-light-gray">Total:</span>
                        <span className="font-bold text-primary">${total.toFixed(2)}</span>
                    </div>
                     <button onClick={() => alert('Proceeding to checkout!')} className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-orange-600 transition">
                         Proceed to Checkout
                     </button>
                     <button onClick={clearCart} className="w-full text-center text-sm text-light-gray">Clear Cart</button>
                 </div>
            )}
        </div>
    );
};

export default CartScreen;
