import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useDatabase } from '../context/DatabaseContext';
import Spinner from '../components/Spinner';
import {
    CreditCard, Wallet, Banknote, MapPin, ChevronRight,
    Ticket, FileText, ShoppingBag, Truck, ShieldCheck,
    AlertCircle, CheckCircle2
} from 'lucide-react';

const PaymentScreen: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { total } = (location.state as { total: number }) || { total: 0 };
    const { cartItems, clearCart } = useCart();
    const { addOrder } = useDatabase();
    const { user } = useAuth();

    const [selectedMethod, setSelectedMethod] = useState('');
    const [cardDetails, setCardDetails] = useState({ number: '', expiry: '', cvc: '' });
    const [cardErrors, setCardErrors] = useState<{ [key: string]: string }>({});
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');
    const [promoCode, setPromoCode] = useState('');
    const [note, setNote] = useState('');
    const [deliveryFee] = useState(150); // Flat delivery fee
    const [discount, setDiscount] = useState(0);

    const grandTotal = total + deliveryFee - discount;

    // Use user's lat/lng to "reverse geocode" or just show a default for now if missing
    // In a real app, we'd use a geocoding API. Here we mock it.
    const userAddress = "1234 Makati Ave, Makati City, Metro Manila";

    useEffect(() => {
        if (total <= 0 && !isProcessing) {
            navigate('/cart');
        }
    }, [total, isProcessing, navigate]);

    // Validation & Formatting Logic (kept similar to before but refined)
    const formatCardNumber = (value: string) => value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
    const formatExpiryDate = (value: string) => value.replace(/\//g, '').replace(/(\d{2})(\d{1,2})/, '$1/$2').trim();

    const handleCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let { name, value } = e.target;
        if (name === 'number') { if (value.length > 19) return; value = formatCardNumber(value.replace(/[^\d]/g, '')); }
        if (name === 'expiry') { if (value.length > 5) return; value = formatExpiryDate(value.replace(/[^\d]/g, '')); }
        if (name === 'cvc') { if (value.length > 4) return; value = value.replace(/[^\d]/g, ''); }
        setCardDetails(prev => ({ ...prev, [name]: value }));
        setCardErrors(prev => ({ ...prev, [name]: '' }));
    };

    const validateCard = () => {
        const errors: { [key: string]: string } = {};
        if (cardDetails.number.replace(/\s/g, '').length !== 16) errors.number = 'Invalid card number.';
        if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(cardDetails.expiry)) errors.expiry = 'Invalid expiry.';
        if (cardDetails.cvc.length < 3) errors.cvc = 'Invalid CVC.';
        setCardErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleProcessPayment = async () => {
        if (!user) { setError("User not found."); return; }
        if (!selectedMethod) { setError("Please select a payment method."); return; }
        if (selectedMethod === 'Credit Card' && !validateCard()) return;

        setIsProcessing(true);
        setError('');

        setTimeout(async () => {
            try {
                // Pass order details including note
                const newOrder = await addOrder(user.name, cartItems, grandTotal, selectedMethod);
                if (newOrder) {
                    clearCart();
                    navigate('/order-confirmation', { state: { order: newOrder }, replace: true });
                } else {
                    throw new Error("Transaction failed. Please try again.");
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : "Payment failed.");
                setIsProcessing(false);
            }
        }, 2000);
    };

    const handleApplyPromo = () => {
        if (promoCode.toUpperCase() === 'RIDER100') {
            setDiscount(100);
            alert('Promo applied: -₱100.00');
        } else {
            alert('Invalid promo code');
        }
    };

    return (
        <div className="min-h-screen relative pb-40">
            {/* Header */}
            <Header title="Checkout" showBackButton transparent />

            <div className="flex-grow p-5 space-y-6 overflow-y-auto">

                {/* Delivery Details */}
                <section className="animate-slideInUp">
                    <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Truck className="w-4 h-4" /> Delivery Address
                    </h3>
                    <div className="bg-[#1A1A1A] p-4 rounded-2xl border border-white/5 shadow-lg flex items-center justify-between group cursor-pointer hover:border-primary/50 transition-all">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                                <MapPin className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-white text-sm">Home</h4>
                                <p className="text-gray-400 text-xs mt-0.5">{userAddress}</p>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
                    </div>
                </section>

                {/* Order Items */}
                <section className="animate-slideInUp delay-100">
                    <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                        <ShoppingBag className="w-4 h-4" /> Order Summary
                    </h3>
                    <div className="bg-[#1A1A1A] rounded-2xl border border-white/5 shadow-lg overflow-hidden">
                        {cartItems.map((item, idx) => (
                            <div key={item.id} className={`p-4 flex gap-4 ${idx !== cartItems.length - 1 ? 'border-b border-white/5' : ''}`}>
                                <div className="w-16 h-16 bg-white/5 rounded-xl overflow-hidden flex-shrink-0">
                                    {item.imageUrls && item.imageUrls[0] ? (
                                        <img src={item.imageUrls[0]} alt={item.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <ShoppingBag className="w-6 h-6 text-gray-600" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-white font-semibold text-sm truncate">{item.name}</h4>
                                    <p className="text-gray-500 text-xs mt-1">{item.brand}</p>
                                    <div className="flex justify-between items-center mt-2">
                                        <p className="text-gray-400 text-xs">Qty: {item.quantity}</p>
                                        <p className="text-primary font-bold text-sm">₱{(item.price * item.quantity).toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Extras: Promo & Notes */}
                <section className="grid grid-cols-1 gap-4 animate-slideInUp delay-200">
                    {/* Promo Code */}
                    <div className="bg-[#1A1A1A] p-4 rounded-2xl border border-white/5 shadow-lg">
                        <label className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                            <Ticket className="w-4 h-4" /> Promo Code
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Enter code"
                                value={promoCode}
                                onChange={(e) => setPromoCode(e.target.value)}
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-primary transition-colors"
                            />
                            <button
                                onClick={handleApplyPromo}
                                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all"
                            >
                                Apply
                            </button>
                        </div>
                    </div>

                    {/* Note */}
                    <div className="bg-[#1A1A1A] p-4 rounded-2xl border border-white/5 shadow-lg">
                        <label className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                            <FileText className="w-4 h-4" /> Order Note
                        </label>
                        <textarea
                            placeholder="Instructions for rider/seller..."
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm h-20 focus:outline-none focus:border-primary transition-colors resize-none"
                        />
                    </div>
                </section>

                {/* Payment Methods */}
                <section className="animate-slideInUp delay-300">
                    <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                        <CreditCard className="w-4 h-4" /> Payment Method
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { name: 'Credit Card', icon: CreditCard, color: 'text-blue-400' },
                            { name: 'GCash', icon: Wallet, color: 'text-blue-500' }, // Using available icon
                            { name: 'Paymaya', icon: Wallet, color: 'text-green-500' }, // Using available icon
                            { name: 'Cash on Delivery', icon: Banknote, color: 'text-green-400' }
                        ].map((m) => (
                            <button
                                key={m.name}
                                onClick={() => setSelectedMethod(m.name)}
                                className={`relative p-4 rounded-2xl border transition-all duration-300 flex flex-col items-center justify-center gap-2 ${selectedMethod === m.name ? 'bg-primary/20 border-primary shadow-[0_0_15px_rgba(234,88,12,0.3)]' : 'bg-[#1A1A1A] border-white/5 hover:bg-white/5'}`}
                            >
                                <m.icon className={`w-6 h-6 ${m.color}`} />
                                <span className={`text-xs font-bold ${selectedMethod === m.name ? 'text-white' : 'text-gray-400'}`}>{m.name}</span>
                                {selectedMethod === m.name && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary animate-pulse" />}
                            </button>
                        ))}
                    </div>

                    {/* Credit Card Fields */}
                    {selectedMethod === 'Credit Card' && (
                        <div className="mt-4 bg-[#1A1A1A] p-4 rounded-2xl border border-white/5 animate-fadeIn">
                            <div className="space-y-3">
                                <div>
                                    <input type="text" name="number" placeholder="Card Number" value={cardDetails.number} onChange={handleCardChange} className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-1 focus:ring-primary ${cardErrors.number ? 'border-red-500' : 'border-white/10'}`} />
                                    {cardErrors.number && <p className="text-red-500 text-[10px] mt-1 ml-1">{cardErrors.number}</p>}
                                </div>
                                <div className="flex gap-3">
                                    <div className="flex-1">
                                        <input type="text" name="expiry" placeholder="MM/YY" value={cardDetails.expiry} onChange={handleCardChange} className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-1 focus:ring-primary ${cardErrors.expiry ? 'border-red-500' : 'border-white/10'}`} />
                                        {cardErrors.expiry && <p className="text-red-500 text-[10px] mt-1 ml-1">{cardErrors.expiry}</p>}
                                    </div>
                                    <div className="flex-1">
                                        <input type="text" name="cvc" placeholder="CVC" value={cardDetails.cvc} onChange={handleCardChange} className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-1 focus:ring-primary ${cardErrors.cvc ? 'border-red-500' : 'border-white/10'}`} />
                                        {cardErrors.cvc && <p className="text-red-500 text-[10px] mt-1 ml-1">{cardErrors.cvc}</p>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </section>
            </div>

            {/* Sticky Footer */}
            <div className="fixed bottom-0 left-0 right-0 bg-[#121212]/90 backdrop-blur-xl border-t border-white/10 p-5 space-y-4 z-40 animate-slideInUp pb-8">
                <div className="space-y-1">
                    <div className="flex justify-between text-gray-400 text-xs">
                        <span>Subtotal</span>
                        <span>₱{total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-400 text-xs">
                        <span>Delivery Fee</span>
                        <span>₱{deliveryFee.toFixed(2)}</span>
                    </div>
                    {discount > 0 && (
                        <div className="flex justify-between text-green-400 text-xs">
                            <span className="flex items-center gap-1"><Ticket className="w-3 h-3" /> Discount</span>
                            <span>-₱{discount.toFixed(2)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-white font-bold text-lg pt-2 border-t border-white/5">
                        <span>Total</span>
                        <span className="text-primary">₱{grandTotal.toFixed(2)}</span>
                    </div>
                </div>

                <button
                    onClick={handleProcessPayment}
                    disabled={isProcessing || !selectedMethod}
                    className="w-full bg-gradient-to-r from-primary to-orange-600 hover:from-orange-600 hover:to-primary text-white font-bold py-4 rounded-2xl shadow-lg shadow-orange-900/30 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isProcessing ? (
                        <>
                            <Spinner size="sm" color="text-white" /> Processing...
                        </>
                    ) : (
                        <>
                            Place Order
                        </>
                    )}
                </button>
                {error && <p className="text-red-500 text-xs text-center">{error}</p>}
            </div>
        </div>
    );
};

export default PaymentScreen;
