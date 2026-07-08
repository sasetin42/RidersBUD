import React, { useState } from 'react';
import CustomerHeader from '../components/CustomerHeader';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';
import { useWishlist } from '../context/WishlistContext';
import { CartItem, Part } from '../types';
import { ShoppingCart, Trash2, Heart, Tag, Truck, Sparkles, Check, ShoppingBag, Plus, Minus, Info, ChevronDown } from 'lucide-react';
import { useDatabase } from '../context/DatabaseContext';

const CartScreen: React.FC = () => {
    const { cartItems, removeFromCart, addToCart, clearCart, removeAllFromCart, itemCount } = useCart();
    const { addToWishlist } = useWishlist();
    const { db } = useDatabase();
    const navigate = useNavigate();

    const [promoCode, setPromoCode] = useState('');
    const [discount, setDiscount] = useState(0);
    const [promoError, setPromoError] = useState('');
    const [appliedCodeName, setAppliedCodeName] = useState('');
    const [shippingMethod, setShippingMethod] = useState<'standard' | 'express' | 'pickup'>('standard');

    const subtotal = cartItems.reduce((acc, item) => acc + (item.salesPrice || item.price) * item.quantity, 0);
    
    // Dynamic shipping fee calculation
    const shippingFee = subtotal > 0
        ? (shippingMethod === 'standard' ? 150.00 : shippingMethod === 'express' ? 250.00 : 0.00)
        : 0;
        
    const total = Math.max(0, subtotal - discount + shippingFee);

    // Get active coupons from database
    const availableCoupons = db?.promoCodes?.filter(p => p.isActive && new Date(p.expiryDate) > new Date()) || [];

    // Get recommended products
    const recommendedParts = (db?.parts || [])
        .filter(part => part.stock > 0 && !cartItems.some(item => item.id === part.id))
        .slice(0, 3);

    const handleMoveToWishlist = (item: CartItem) => {
        addToWishlist(item);
        removeAllFromCart(item.id);
    };

    const handleApplyPromo = (codeToApply?: string) => {
        setPromoError('');
        setDiscount(0);
        setAppliedCodeName('');

        const codeString = codeToApply || promoCode;
        if (!codeString.trim()) return;

        const code = db?.promoCodes.find(p => p.code.toUpperCase() === codeString.trim().toUpperCase() && p.isActive);

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

            let computedDiscount = 0;
            if (code.discountType === 'Percentage') {
                computedDiscount = subtotal * (code.discountValue / 100);
            } else {
                computedDiscount = code.discountValue;
            }
            
            setDiscount(computedDiscount);
            setAppliedCodeName(code.code);
            if (!codeToApply) {
                setPromoCode(code.code);
            }
        } else {
            setPromoError('Invalid or inactive promotional code.');
        }
    };

    const handleQuickAddRecommended = (part: Part) => {
        addToCart(part);
    };

    return (
        <div className="flex flex-col h-full bg-[#0D0D0E] pb-20 text-white font-sans">
            <CustomerHeader title="Cart" showBackButton={true} icon={<ShoppingCart className="text-primary animate-pulse" size={22} />} />
            
            <div className="flex-grow overflow-y-auto p-4 space-y-6">
                {cartItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-6">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-primary/10 to-primary/30 flex items-center justify-center border border-primary/20 shadow-[0_0_30px_rgba(255,122,0,0.15)] animate-bounce">
                            <ShoppingBag className="text-primary" size={40} />
                        </div>
                        <div>
                            <p className="text-xl font-black text-white tracking-tight">Your Cart is Empty</p>
                            <p className="text-xs text-gray-400 mt-2 max-w-xs mx-auto leading-relaxed">
                                Get your machine back on track. Explore high-performance replacement parts and premium motorcycle gear now.
                            </p>
                        </div>
                        <button 
                            onClick={() => navigate('/customer-portal/parts-store')} 
                            className="bg-gradient-to-r from-primary to-orange-600 text-white font-bold text-sm py-3.5 px-8 rounded-xl hover:opacity-95 transition shadow-lg shadow-primary/25 active:scale-95"
                        >
                            Browse Parts Store
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Cart Header */}
                        <div className="flex justify-between items-center bg-[#18181B] p-4 rounded-xl border border-white/5 shadow-inner">
                            <div className="flex items-center gap-2">
                                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
                                <h2 className="text-sm font-black tracking-wider uppercase text-gray-300">Items ({itemCount})</h2>
                            </div>
                            <button onClick={() => navigate('/customer-portal/order-history')} className="text-xs font-bold text-primary hover:text-white transition-colors flex items-center gap-1.5 bg-primary/10 py-1.5 px-3 rounded-lg border border-primary/20">
                                Order History <ChevronDown className="-rotate-90" size={14} />
                            </button>
                        </div>

                        {/* Cart Items List */}
                        <div className="space-y-3">
                            {cartItems.map(item => (
                                <div key={item.id} className="bg-[#18181B] p-4 rounded-xl border border-white/5 shadow-md flex gap-4 group hover:border-primary/20 transition-all duration-300">
                                    {/* Image Wrapper */}
                                    <div className="w-20 h-20 bg-[#0D0D0E] rounded-xl flex-shrink-0 p-1 flex items-center justify-center overflow-hidden border border-white/5 relative">
                                        <img src={item.imageUrls[0]} alt={item.name} className="w-full h-full object-contain mix-blend-normal group-hover:scale-105 transition-transform duration-500" />
                                    </div>

                                    {/* Details */}
                                    <div className="flex-grow flex flex-col justify-between">
                                        <div>
                                            <div className="flex justify-between items-start gap-2">
                                                <h4 className="font-bold text-white text-xs leading-tight line-clamp-2 pr-2">{item.name}</h4>
                                                <p className="font-black text-primary text-sm whitespace-nowrap">₱{((item.salesPrice || item.price) * item.quantity).toLocaleString()}</p>
                                            </div>
                                            <p className="text-[10px] text-gray-500 font-semibold mt-1">Unit Price: ₱{(item.salesPrice || item.price).toLocaleString()}</p>
                                            {item.stock < 5 && (
                                                <span className="inline-flex items-center gap-1 text-[9px] text-red-500 font-extrabold uppercase tracking-widest mt-1 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                                                    Low Stock: {item.stock} left
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between mt-2.5">
                                            {/* Quantity Selector */}
                                            <div className="flex items-center bg-[#0D0D0E] rounded-lg border border-white/10 h-7">
                                                <button
                                                    onClick={() => removeFromCart(item.id)}
                                                    className="w-7 h-full flex items-center justify-center text-gray-400 hover:text-white disabled:opacity-20 transition-colors"
                                                    disabled={item.quantity <= 1}
                                                >
                                                    <Minus size={12} />
                                                </button>
                                                <div className="w-7 flex items-center justify-center text-xs font-bold text-white border-x border-white/10 h-3/4">
                                                    {item.quantity}
                                                </div>
                                                <button
                                                    onClick={() => addToCart(item)}
                                                    className="w-7 h-full flex items-center justify-center text-gray-400 hover:text-white disabled:opacity-20 transition-colors"
                                                    disabled={item.quantity >= item.stock}
                                                >
                                                    <Plus size={12} />
                                                </button>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex items-center gap-3">
                                                <button 
                                                    onClick={() => handleMoveToWishlist(item)} 
                                                    className="text-[10px] font-bold text-amber-500 hover:text-amber-400 transition-colors flex items-center gap-1 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20"
                                                >
                                                    <Heart size={10} fill="currentColor" /> Save
                                                </button>
                                                <button 
                                                    onClick={() => removeAllFromCart(item.id)} 
                                                    className="text-[10px] font-bold text-red-500 hover:text-red-400 transition-colors flex items-center gap-1 bg-red-500/10 px-2 py-1 rounded border border-red-500/20"
                                                >
                                                    <Trash2 size={10} /> Remove
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Shipping Methods */}
                        <div className="bg-[#18181B] p-4 rounded-xl border border-white/5 space-y-3">
                            <h3 className="text-xs font-black tracking-wider uppercase text-gray-400 flex items-center gap-1.5">
                                <Truck size={14} className="text-emerald-500" /> Shipping Method
                            </h3>
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    onClick={() => setShippingMethod('standard')}
                                    className={`p-3 rounded-lg border text-center transition-all ${
                                        shippingMethod === 'standard'
                                            ? 'border-primary bg-primary/10 text-white'
                                            : 'border-white/5 bg-[#0D0D0E] text-gray-400'
                                    }`}
                                >
                                    <p className="text-[10px] font-bold">Standard</p>
                                    <p className="text-xs font-black mt-1">₱150</p>
                                    <p className="text-[8px] text-gray-500 mt-0.5">3-5 days</p>
                                </button>
                                <button
                                    onClick={() => setShippingMethod('express')}
                                    className={`p-3 rounded-lg border text-center transition-all ${
                                        shippingMethod === 'express'
                                            ? 'border-primary bg-primary/10 text-white'
                                            : 'border-white/5 bg-[#0D0D0E] text-gray-400'
                                    }`}
                                >
                                    <p className="text-[10px] font-bold">Express</p>
                                    <p className="text-xs font-black mt-1">₱250</p>
                                    <p className="text-[8px] text-gray-500 mt-0.5">1-2 days</p>
                                </button>
                                <button
                                    onClick={() => setShippingMethod('pickup')}
                                    className={`p-3 rounded-lg border text-center transition-all ${
                                        shippingMethod === 'pickup'
                                            ? 'border-primary bg-primary/10 text-white'
                                            : 'border-white/5 bg-[#0D0D0E] text-gray-400'
                                    }`}
                                >
                                    <p className="text-[10px] font-bold">Store Pickup</p>
                                    <p className="text-xs font-black mt-1">Free</p>
                                    <p className="text-[8px] text-gray-500 mt-0.5">Self-collect</p>
                                </button>
                            </div>
                        </div>

                        {/* Available Coupons Suggestions */}
                        {availableCoupons.length > 0 && (
                            <div className="bg-[#18181B] p-4 rounded-xl border border-white/5 space-y-2">
                                <h3 className="text-xs font-black tracking-wider uppercase text-gray-400 flex items-center gap-1.5">
                                    <Tag size={14} className="text-primary" /> Active Coupons
                                </h3>
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {availableCoupons.map(coupon => (
                                        <button
                                            key={coupon.id}
                                            onClick={() => handleApplyPromo(coupon.code)}
                                            className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all ${
                                                appliedCodeName === coupon.code
                                                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                                                    : 'bg-[#0D0D0E] border-white/5 text-gray-300 hover:border-primary/45'
                                            }`}
                                        >
                                            <Tag size={10} className={appliedCodeName === coupon.code ? 'text-emerald-400' : 'text-primary'} />
                                            {coupon.code} ({coupon.discountType === 'Percentage' ? `${coupon.discountValue}%` : `₱${coupon.discountValue}`} Off)
                                            {appliedCodeName === coupon.code && <Check size={10} />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Recommended Add-ons Carousel */}
                        {recommendedParts.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="text-xs font-black tracking-wider uppercase text-gray-400 flex items-center gap-1.5">
                                    <Sparkles size={14} className="text-amber-500" /> Recommended Add-ons
                                </h3>
                                <div className="grid grid-cols-3 gap-3">
                                    {recommendedParts.map(part => (
                                        <div key={part.id} className="bg-[#18181B] p-2 rounded-xl border border-white/5 flex flex-col justify-between group relative overflow-hidden">
                                            <div className="w-full h-16 bg-[#0D0D0E] rounded-lg p-1 flex items-center justify-center overflow-hidden border border-white/5">
                                                <img src={part.imageUrls[0]} alt={part.name} className="h-full object-contain group-hover:scale-105 transition-transform" />
                                            </div>
                                            <div className="mt-2 flex-grow flex flex-col justify-between">
                                                <p className="text-[10px] font-bold text-gray-200 line-clamp-1 leading-tight">{part.name}</p>
                                                <p className="text-xs font-black text-primary mt-1">₱{(part.salesPrice || part.price).toLocaleString()}</p>
                                            </div>
                                            <button
                                                onClick={() => handleQuickAddRecommended(part)}
                                                className="mt-2 w-full bg-primary/10 border border-primary/20 text-primary hover:bg-primary hover:text-white text-[9px] font-extrabold py-1 rounded-lg transition-all"
                                            >
                                                + Add
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Bottom Sticky Payment & Summary Card */}
            {cartItems.length > 0 && (
                <div className="p-4 bg-[#18181B] border-t border-white/5 shadow-[0_-10px_30px_rgba(0,0,0,0.7)] z-20 space-y-4">
                    {/* Promo Input Box */}
                    <div className="flex gap-2">
                        <div className="relative flex-grow">
                            <input
                                type="text"
                                value={promoCode}
                                onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromoError(''); }}
                                placeholder="PROMO CODE"
                                className="w-full pl-3.5 pr-3.5 py-2.5 bg-[#0D0D0E] border border-white/10 rounded-xl text-white text-xs font-bold uppercase tracking-widest placeholder-gray-700 focus:border-primary/50 focus:outline-none transition-all"
                            />
                        </div>
                        <button
                            onClick={() => handleApplyPromo()}
                            className="bg-[#27272A] hover:bg-primary text-white font-extrabold py-2.5 px-5 rounded-xl text-xs tracking-wider transition-colors border border-white/5 active:scale-95"
                        >
                            Apply
                        </button>
                    </div>
                    {promoError && <p className="text-red-500 text-[10px] font-bold text-center -mt-2">{promoError}</p>}
                    {appliedCodeName && <p className="text-emerald-500 text-[10px] font-bold text-center -mt-2">Code {appliedCodeName} applied successfully!</p>}

                    {/* Summary Lines */}
                    <div className="space-y-2 bg-[#0D0D0E] p-3 rounded-lg border border-white/5">
                        <div className="flex justify-between text-[11px] text-gray-400 font-semibold">
                            <span>Subtotal</span>
                            <span>₱{subtotal.toLocaleString()}</span>
                        </div>
                        {discount > 0 && (
                            <div className="flex justify-between text-[11px] text-emerald-500 font-black">
                                <span>Discount</span>
                                <span>- ₱{discount.toLocaleString()}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-[11px] text-gray-400 font-semibold">
                            <span>Shipping ({shippingMethod === 'pickup' ? 'Store Pickup' : shippingMethod})</span>
                            <span>₱{shippingFee.toLocaleString()}</span>
                        </div>

                        <div className="border-t border-dashed border-white/10 my-1.5" />

                        <div className="flex justify-between items-center">
                            <span className="text-gray-300 font-bold text-xs">Grand Total</span>
                            <span className="text-xl font-black text-primary tracking-tight">₱{total.toLocaleString()}</span>
                        </div>
                    </div>

                    {/* Check out CTA buttons */}
                    <div className="flex flex-col gap-2.5">
                        <button
                            onClick={() => navigate('/customer-portal/payment', { state: { total, items: cartItems, discount, shippingFee, shippingMethod } })}
                            className="w-full bg-gradient-to-r from-primary to-orange-600 text-white font-bold text-sm py-3.5 rounded-xl hover:opacity-95 transition shadow-lg shadow-primary/20 flex items-center justify-center gap-2 tracking-wide active:scale-[0.98]"
                        >
                            <span>Proceed to Checkout</span>
                            <span className="bg-black/25 px-2 py-0.5 rounded text-[10px]">{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
                        </button>
                        <button onClick={clearCart} className="w-full text-center text-[10px] font-bold text-gray-600 hover:text-red-400 transition-colors tracking-widest py-1">
                            Clear Cart
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CartScreen;

