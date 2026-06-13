import React, { useState } from 'react';
import CustomerHeader from '../components/CustomerHeader';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';
import { useWishlist } from '../context/WishlistContext';
import { CartItem } from '../types';
import { ShoppingCart } from 'lucide-react';
import { useDatabase } from '../context/DatabaseContext';

const CartScreen: React.FC = () => {
    const { cartItems, removeFromCart, addToCart, clearCart, removeAllFromCart, itemCount } = useCart();
    const { addToWishlist } = useWishlist();
    const { db } = useDatabase();
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
        setDiscount(0);

        if (!promoCode.trim()) return;

        const code = db?.promoCodes.find(p => p.code.toUpperCase() === promoCode.trim().toUpperCase() && p.isActive);

        if (code) {
            // Check expiry
            if (new Date(code.expiryDate) < new Date()) {
                setPromoError('This promo code has expired.');
                return;
            }
            // Check usage limit
            if (code.usageLimit > 0 && code.usageCount >= code.usageLimit) {
                setPromoError('This promo code usage limit has been reached.');
                return;
            }

            if (code.discountType === 'Percentage') {
                setDiscount(subtotal * (code.discountValue / 100));
            } else {
                setDiscount(code.discountValue);
            }
        } else {
            setPromoError('Invalid or inactive promotional code.');
        }
    };

    return (
        <div className="flex flex-col h-full bg-secondary pb-20">
            <CustomerHeader title="Cart" showBackButton={true} icon={<ShoppingCart size={22} />} />
            <div className="flex-grow overflow-y-auto p-6 space-y-6">
                {cartItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-50">
                        <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                        </div>
                        <div>
                            <p className="text-xl font-black text-white tracking-tight">Your Cart is Empty</p>
                            <p className="text-sm text-gray-500 mt-1 max-w-xs mx-auto">Looks like you haven't added any parts or tools to your cart yet.</p>
                        </div>
                        <button onClick={() => navigate('/customer-portal/parts-store')} className="bg-primary text-white font-bold text-sm py-3 px-8 rounded-xl hover:bg-orange-600 transition shadow-lg shadow-primary/20">
                            Browse Store
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center pb-2">
                            <h2 className="text-lg font-black text-white">Items ({itemCount})</h2>
                            <button onClick={() => navigate('/customer-portal/order-history')} className="text-xs font-bold text-primary hover:text-white transition-colors flex items-center gap-1">
                                Order History <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </button>
                        </div>

                        {cartItems.map(item => (
                            <div key={item.id} className="bg-[#1E1E1E] p-4 rounded-2xl border border-white/5 shadow-sm animate-slideUp flex gap-4 group hover:border-white/10 transition-all">
                                {/* Image */}
                                <div className="w-24 h-24 bg-[#121212] rounded-xl flex-shrink-0 p-2 flex items-center justify-center overflow-hidden border border-white/5">
                                    <img src={item.imageUrls[0]} alt={item.name} className="w-full h-full object-contain mix-blend-normal group-hover:scale-110 transition-transform duration-500" />
                                </div>

                                {/* Details */}
                                <div className="flex-grow flex flex-col justify-between py-1">
                                    <div>
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className="font-bold text-white text-sm leading-tight line-clamp-2 pr-4">{item.name}</h4>
                                            <p className="font-black text-white whitespace-nowrap">₱{((item.salesPrice || item.price) * item.quantity).toLocaleString()}</p>
                                        </div>
                                        <p className="text-xs text-gray-500 font-medium">Unit Price: ₱{(item.salesPrice || item.price).toLocaleString()}</p>
                                        {item.stock < 5 && (
                                            <p className="text-[10px] text-orange-500 font-bold  tracking-wider mt-1">Low Stock: {item.stock} left</p>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between mt-3">
                                        {/* Quantity Control */}
                                        <div className="flex items-center bg-[#121212] rounded-lg border border-white/10 h-8">
                                            <button
                                                onClick={() => removeFromCart(item.id)}
                                                className="w-8 h-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 rounded-l-lg transition-colors"
                                                disabled={item.quantity <= 1}
                                            >−</button>
                                            <div className="w-8 flex items-center justify-center text-xs font-bold text-white border-x border-white/10 h-3/4">
                                                {item.quantity}
                                            </div>
                                            <button
                                                onClick={() => addToCart(item)}
                                                className="w-8 h-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 rounded-r-lg transition-colors"
                                                disabled={item.quantity >= item.stock}
                                            >+</button>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-4">
                                            <button onClick={() => handleMoveToWishlist(item)} className="text-[10px] font-bold text-gray-500 hover:text-primary transition-colors  tracking-wide">
                                                Save for later
                                            </button>
                                            <button onClick={() => removeAllFromCart(item.id)} className="text-[10px] font-bold text-red-500/70 hover:text-red-500 transition-colors  tracking-wide">
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            {cartItems.length > 0 && (
                <div className="p-6 bg-[#1E1E1E] border-t border-white/5 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-20">
                    {/* Promo Code */}
                    <div className="flex gap-3 mb-6">
                        <div className="relative flex-grow">
                            <input
                                type="text"
                                value={promoCode}
                                onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromoError(''); }}
                                placeholder="Enter Promo Code"
                                className="w-full pl-4 pr-4 py-3 bg-[#121212] border border-white/10 rounded-xl text-white text-sm font-bold placeholder-gray-600 focus:outline-none transition-colors "
                            />
                        </div>
                        <button
                            onClick={handleApplyPromo}
                            className="bg-[#2A2A2A] text-white font-bold py-3 px-6 rounded-xl text-xs  tracking-wider hover:bg-primary transition-colors border border-white/5"
                        >
                            Apply
                        </button>
                    </div>
                    {promoError && <p className="text-red-500 text-xs font-bold text-center -mt-4 mb-4 animate-shake">{promoError}</p>}

                    {/* Summary */}
                    <div className="space-y-3 mb-6">
                        <div className="flex justify-between text-sm text-gray-400 font-medium"><span>Subtotal</span><span>₱{subtotal.toLocaleString()}</span></div>
                        {discount > 0 && <div className="flex justify-between text-sm text-green-500 font-bold"><span>Discount Applied</span><span>- ₱{discount.toLocaleString()}</span></div>}
                        <div className="flex justify-between text-sm text-gray-400 font-medium"><span>Shipping Fee</span><span>₱{shippingFee.toLocaleString()}</span></div>

                        <div className="border-t border-dashed border-white/10 my-2"></div>

                        <div className="flex justify-between items-end">
                            <span className="text-gray-300 font-bold text-sm">Grand Total</span>
                            <span className="text-2xl font-black text-primary tracking-tight">₱{total.toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => navigate('/customer-portal/payment', { state: { total, items: cartItems, discount } })}
                            className="w-full bg-primary text-white font-bold text-sm py-4 rounded-xl hover:bg-orange-600 transition shadow-lg shadow-primary/25 flex items-center justify-center gap-2  tracking-wide"
                        >
                            <span>Proceed to Checkout</span>
                            <span className="bg-black/20 px-2 py-0.5 rounded text-[10px]">{itemCount} items</span>
                        </button>
                        <button onClick={clearCart} className="w-full text-center text-xs font-bold text-gray-600 hover:text-red-400 transition-colors  tracking-widest py-2">Clear Cart</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CartScreen;
