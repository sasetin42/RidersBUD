import React, { useState } from 'react';
import Header from '../components/Header';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';
import { useWishlist } from '../context/WishlistContext';
import { CartItem } from '../types';

const CartScreen: React.FC = () => {
    const { cartItems, removeFromCart, addToCart, clearCart, removeAllFromCart, itemCount } = useCart();
    const { addToWishlist } = useWishlist();
    const navigate = useNavigate();

    const [promoCode, setPromoCode] = useState('');
    const [discount, setDiscount] = useState(0);
    const [promoError, setPromoError] = useState('');
    
    const subtotal = cartItems.reduce((acc, item) => acc + (item.salesPrice || item.price) * item.quantity, 0);
    const shippingFee = subtotal > 0 ? 150.00 : 0;
    const total = subtotal - discount + shippingFee;

    const handleMoveToWishlist = (item: CartItem) => {
        addToWishlist(item);
        removeAllFromCart(item.id);
    };

    const handleApplyPromo = () => {
        setPromoError('');
        if (promoCode.trim().toUpperCase() === 'SAVE10') {
            setDiscount(subtotal * 0.10);
        } else {
            setDiscount(0);
            setPromoError('Invalid promotional code.');
        }
    };

    return (
        <div className="flex flex-col h-full bg-secondary">
            <Header title="My Cart" />
            <div className="flex-grow overflow-y-auto p-4">
                {cartItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-light-gray text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 mb-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <p className="text-xl font-semibold text-white">Your Cart is Empty</p>
                        <p className="mt-2">Looks like you haven't added anything to your cart yet.</p>
                        <button onClick={() => navigate('/parts-store')} className="mt-6 bg-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-orange-600 transition">
                            Shop for Parts
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <button onClick={() => navigate('/order-history')} className="w-full text-sm text-primary text-right font-semibold hover:underline">View Order History</button>
                        {cartItems.map(item => (
                            <div key={item.id} className="flex items-start bg-dark-gray p-3 rounded-lg animate-fadeIn">
                                <img src={item.imageUrls[0]} alt={item.name} className="w-20 h-20 rounded-lg object-cover mr-4" />
                                <div className="flex-grow">
                                    <h4 className="font-bold text-white text-sm leading-tight">{item.name}</h4>
                                    <p className="text-primary font-semibold text-sm">₱{(item.salesPrice || item.price).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                                    <div className="flex items-center mt-2 flex-wrap gap-x-4 gap-y-2">
                                        <div className="flex items-center space-x-3">
                                            <button onClick={() => removeFromCart(item.id)} className="w-7 h-7 bg-field rounded-full font-bold text-lg flex items-center justify-center">-</button>
                                            <span className="font-bold w-4 text-center">{item.quantity}</span>
                                            <button onClick={() => addToCart(item)} className="w-7 h-7 bg-field rounded-full font-bold text-lg flex items-center justify-center">+</button>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => handleMoveToWishlist(item)} className="text-xs text-light-gray hover:text-white underline">
                                                Save for later
                                            </button>
                                            <span className="text-gray-600">|</span>
                                            <button onClick={() => removeAllFromCart(item.id)} className="text-xs text-red-400 hover:text-red-300 underline">
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <p className="font-bold text-lg text-white">₱{((item.salesPrice || item.price) * item.quantity).toFixed(2)}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            {cartItems.length > 0 && (
                 <div className="p-4 bg-[#1D1D1D] border-t border-dark-gray space-y-4">
                    <div className="flex gap-2">
                        <input 
                            type="text"
                            value={promoCode}
                            onChange={(e) => { setPromoCode(e.target.value); setPromoError(''); }}
                            placeholder="Enter Promo Code"
                            className="flex-grow px-3 py-2 bg-field border border-dark-gray rounded-lg text-white text-sm"
                        />
                        <button onClick={handleApplyPromo} className="bg-primary text-white font-bold py-2 px-4 rounded-lg text-sm">Apply</button>
                    </div>
                    {promoError && <p className="text-red-400 text-xs text-center -mt-2">{promoError}</p>}
                    
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between text-light-gray"><span>Subtotal</span><span>₱{subtotal.toFixed(2)}</span></div>
                        {discount > 0 && <div className="flex justify-between text-green-400"><span>Discount (10%)</span><span>- ₱{discount.toFixed(2)}</span></div>}
                        <div className="flex justify-between text-light-gray"><span>Shipping Fee</span><span>₱{shippingFee.toFixed(2)}</span></div>
                        <div className="flex justify-between text-lg font-bold border-t border-dark-gray pt-2 mt-2">
                            <span className="text-white">Grand Total:</span>
                            <span className="text-primary">₱{total.toFixed(2)}</span>
                        </div>
                    </div>
                     <button 
                        onClick={() => navigate('/payment', { state: { total } })} 
                        className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-orange-600 transition"
                    >
                         Proceed to Checkout ({itemCount} {itemCount > 1 ? 'items' : 'item'})
                     </button>
                     <button onClick={clearCart} className="w-full text-center text-sm text-light-gray hover:text-red-400">Clear Cart</button>
                 </div>
            )}
        </div>
    );
};

export default CartScreen;