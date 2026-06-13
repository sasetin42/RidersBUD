import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useDatabase } from '../context/DatabaseContext';
import Spinner from '../components/Spinner';
import { CreditCard, Wallet, Banknote, Truck, CheckCircle2, Circle, ChevronRight, ShieldCheck, Lock } from 'lucide-react';
import { Card } from '../components/ui';

import { HitPayService } from '../services/HitPayService';
import GCashPaymentModal from '../components/GCashPaymentModal';

const PaymentScreen: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { total } = (location.state as { total: number }) || { total: 0 };
    const { cartItems, clearCart } = useCart();
    const { db, addOrder } = useDatabase();
    const { user } = useAuth();

    const [selectedMethod, setSelectedMethod] = useState('');
    const [cardDetails, setCardDetails] = useState({ number: '', expiry: '', cvc: '' });
    const [cardErrors, setCardErrors] = useState<{ [key: string]: string }>({});
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');
    const [showGCashModal, setShowGCashModal] = useState(false);
    const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);

    // Enhanced Checkout Fields
    const [deliveryDetails, setDeliveryDetails] = useState({
        fullName: user?.name || '',
        phone: user?.phone || '',
        addressLine1: user?.address || '',
        city: '',
        zipCode: ''
    });
    const [orderNotes, setOrderNotes] = useState('');

    React.useEffect(() => {
        if ((total <= 0 || cartItems.length === 0) && !isProcessing) {
            // navigate('/customer-portal/parts-store'); // Redirect if invalid
        }
    }, [total, isProcessing, navigate, cartItems]);

    const formatCardNumber = (value: string) => {
        return value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
    };

    const formatExpiryDate = (value: string) => {
        return value.replace(/\//g, '').replace(/(\d{2})(\d{1,2})/, '$1/$2').trim();
    };

    const handleCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let { name, value } = e.target;

        if (name === 'number') {
            if (value.length > 19) return;
            value = formatCardNumber(value.replace(/[^\d]/g, ''));
        }
        if (name === 'expiry') {
            if (value.length > 5) return;
            value = formatExpiryDate(value.replace(/[^\d]/g, ''));
        }
        if (name === 'cvc') {
            if (value.length > 4) return;
            value = value.replace(/[^\d]/g, '');
        }

        setCardDetails(prev => ({ ...prev, [name]: value }));
        setCardErrors(prev => ({ ...prev, [name]: '' }));
    };

    const validateCard = () => {
        const errors: { [key: string]: string } = {};
        if (cardDetails.number.replace(/\s/g, '').length !== 16) {
            errors.number = 'Card number must be 16 digits.';
        }
        const [month, year] = cardDetails.expiry.split('/');
        if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(cardDetails.expiry) || !month || !year) {
            errors.expiry = 'Invalid format. Use MM/YY.';
        } else {
            const currentYear = new Date().getFullYear() % 100;
            const currentMonth = new Date().getMonth() + 1;
            if (Number(year) < currentYear || (Number(year) === currentYear && Number(month) < currentMonth)) {
                errors.expiry = 'Card has expired.';
            }
        }
        if (cardDetails.cvc.length < 3 || cardDetails.cvc.length > 4) {
            errors.cvc = 'CVC must be 3-4 digits.';
        }
        setCardErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const [processingStep, setProcessingStep] = useState<string>('');
    const [isSuccess, setIsSuccess] = useState(false);

    // Handle return from HitPay redirect (Credit Card flow)
    React.useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search);
        const status = queryParams.get('status');
        const reference = queryParams.get('reference');

        if (status === 'completed' && reference && !isSuccess) {
            const pendingTx = sessionStorage.getItem('pendingHitPayTx');
            const sessionData = pendingTx ? JSON.parse(pendingTx) : null;

            // Ensure this effect only finalizes Credit Card orders created before redirect
            if (sessionData?.paymentMethod !== 'Credit Card' || !sessionData?.orderId) {
                window.history.replaceState({}, document.title, window.location.pathname);
                return;
            }

            const finalizeOrder = async () => {
                try {
                    setProcessingStep('Finalizing Order...');
                    setIsProcessing(true);
                    setIsSuccess(true);
                    sessionStorage.removeItem('pendingHitPayTx');
                    window.history.replaceState({}, document.title, window.location.pathname + '?success=true');
                } catch (err) {
                    setError("Failed to finalize order after payment.");
                } finally {
                    setIsProcessing(false);
                }
            };
            finalizeOrder();
        } else if (status === 'canceled' || status === 'failed') {
            setError(`Payment was ${status}. Please try again.`);
            window.history.replaceState({}, document.title, window.location.pathname);
            sessionStorage.removeItem('pendingHitPayTx');
        }
    }, [isSuccess]);

    const buildSafeOrderData = (paymentMethod: string, status: 'Pending' | 'Processing') => {
        const resolvedCustomerId = (user as any)?.uid || (user as any)?.id || '';

        const safeOrderData: any = {
            customerId: resolvedCustomerId,
            customerName: deliveryDetails.fullName || (user as any)?.name || 'Customer',
            items: cartItems,
            total: total,
            paymentMethod,
            date: new Date().toISOString(),
            status,
            statusHistory: [{ status, timestamp: new Date().toISOString() }],
            paymentStatus: 'Unpaid',
            transactionId: paymentMethod === 'Credit Card'
                ? `ORD-${Date.now()}`
                : `TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
            shippingAddress: deliveryDetails,
            contactPhone: deliveryDetails.phone,
            orderNotes: orderNotes
        };

        Object.keys(safeOrderData).forEach((key) => {
            if (safeOrderData[key] === undefined) {
                delete safeOrderData[key];
            }
        });

        return safeOrderData;
    };

    const handleProcessPayment = async () => {
        if (!user) {
            setError("User not found. Please log in again.");
            return;
        }

        const resolvedCustomerId = (user as any)?.uid || (user as any)?.id;
        if (!resolvedCustomerId) {
            setError("Unable to determine customer account. Please log in again.");
            return;
        }
        if (!selectedMethod) {
            setError("Please select a payment method.");
            return;
        }
        if (!deliveryDetails.fullName || !deliveryDetails.phone || !deliveryDetails.addressLine1 || !deliveryDetails.city) {
            setError("Please fill in all required delivery details.");
            return;
        }

        const isOnlinePayment = selectedMethod !== 'Cash on Delivery';

        setIsProcessing(true);
        setError('');

        try {
            if (selectedMethod === 'GCash') {
                setProcessingStep('Initializing GCash checkout...');

                const newOrderData = buildSafeOrderData('GCash', 'Pending');

                const newOrder = await addOrder(newOrderData);
                if (!newOrder) {
                    throw new Error("Order creation failed.");
                }

                setPendingOrderId(newOrder.id);
                setShowGCashModal(true);
                setIsProcessing(false);
                setProcessingStep('');
                return;
            }

            if (selectedMethod === 'Credit Card') {
                const hitPay = HitPayService.fromSettings(db?.settings);
                const isSandbox = db?.settings?.hitpaySandboxMode ?? true;
                setProcessingStep(isSandbox ? 'Connecting to HitPay Sandbox...' : 'Connecting to HitPay...');

                const returnUrl = `${window.location.origin}${window.location.pathname}`;
                const newOrderData = buildSafeOrderData('Credit Card', 'Processing');
                const reference = newOrderData.transactionId;

                const newOrder = await addOrder(newOrderData);
                if (!newOrder) {
                    throw new Error("Order creation failed.");
                }

                sessionStorage.setItem('pendingHitPayTx', JSON.stringify({
                    paymentMethod: 'Credit Card',
                    orderId: newOrder.id
                }));

                const { url } = await hitPay.createPaymentRequest({
                    amount: total,
                    currency: db?.settings?.currency || 'PHP',
                    reference_number: reference,
                    webhook: 'https://ridersbud-10806.web.app/payment/webhook',
                    redirect_url: returnUrl, // Return exactly to this page
                    email: user.email,
                    name: deliveryDetails.fullName,
                    phone: deliveryDetails.phone,
                    address: {
                        line1: deliveryDetails.addressLine1,
                        city: deliveryDetails.city,
                        postal_code: deliveryDetails.zipCode,
                        country: 'PH'
                    }
                });

                window.location.href = url;
                return; // Stop execution here, user is leaving the page
            }

                const newOrderData = buildSafeOrderData(selectedMethod, 'Pending');

                const newOrder = await addOrder(newOrderData);

                if (newOrder) {
                    setProcessingStep('Order Placed!');
                    setIsSuccess(true);
                    navigate('?success=true', { replace: true });
                } else {
                    throw new Error("Order creation failed.");
                }
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unexpected error occurred.");
            setIsProcessing(false);
            setProcessingStep('');
        }
    };

    const paymentMethods = [
        { id: 'Credit Card', name: 'Credit Card', icon: <CreditCard size={20} />, description: 'Pay securely via HitPay' },
        { id: 'GCash', name: 'GCash', icon: <Wallet size={20} />, description: 'Pay via HitPay (GCash)' },
    ];


    return (
        <div className="flex flex-col h-screen h-[100dvh] bg-[#0F0F0F] text-white font-sans overflow-hidden">
            <Header title="CHECKOUT" showBackButton icon={<CreditCard size={22} />} />

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pb-64">
                {/* Order Summary */}
                <section className="mb-8 animate-slideUp">
                    <h2 className="text-[11px] font-bold text-gray-400  tracking-widest mb-3 flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-gray-400" /> ORDER SUMMARY
                    </h2>
                    <div className="bg-[#1A1A1A] rounded-[1.25rem] p-5 shadow-lg space-y-4">
                        {cartItems.map((item, idx) => (
                            <div key={item.id} className={`flex justify-between items-center py-1 ${idx !== cartItems.length - 1 ? 'border-b border-white/5 pb-4' : ''}`}>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-[#222222] overflow-hidden flex items-center justify-center">
                                        {item.imageUrls?.[0] ? (
                                            <img
                                                src={item.imageUrls[0]}
                                                alt={item.name}
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    const target = e.currentTarget;
                                                    target.style.display = 'none';
                                                    const fallback = target.nextElementSibling as HTMLElement | null;
                                                    if (fallback) fallback.style.display = 'flex';
                                                }}
                                            />
                                        ) : null}
                                        <div
                                            className="w-full h-full items-center justify-center text-xl"
                                            style={{ display: item.imageUrls?.[0] ? 'none' : 'flex' }}
                                        >
                                            📦
                                        </div>
                                    </div>
                                    <div className="flex flex-col">
                                        <p className="font-bold text-sm text-white">{item.name}</p>
                                        <p className="text-[11px] font-medium text-gray-500 mt-0.5">Quantity: {item.quantity}</p>
                                    </div>
                                </div>
                                <p className="font-black text-sm text-primary">₱{(item.price * item.quantity).toLocaleString()}</p>
                            </div>
                        ))}
                        <div className="pt-3 mt-1 border-t border-white/5 flex justify-between items-center">
                            <span className="text-xs font-medium text-gray-500">Total Items</span>
                            <span className="text-xs font-bold text-white">{cartItems.reduce((acc, item) => acc + item.quantity, 0)} items</span>
                        </div>
                    </div>
                </section>

                {/* Delivery Information Form */}
                <section className="mb-8 animate-slideUp" style={{ animationDelay: '0.05s' }}>
                    <h2 className="text-[11px] font-bold text-gray-400  tracking-widest mb-3 flex items-center gap-2">
                        <svg viewBox="0 0 24 24" fill="none" className="w-[14px] h-[14px] text-gray-400" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                            <circle cx="12" cy="10" r="3"></circle>
                        </svg>
                        DELIVERY DETAILS
                    </h2>
                    <div className="bg-[#1A1A1A] rounded-[1.25rem] p-5 shadow-lg space-y-4">
                        <div>
                            <label className="text-xs text-gray-400 font-bold  tracking-wider mb-2 block">Full Name *</label>
                            <input
                                type="text"
                                className="w-full bg-[#0F0F0F] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-colors"
                                placeholder="Recipient's Name"
                                value={deliveryDetails.fullName}
                                onChange={e => setDeliveryDetails({ ...deliveryDetails, fullName: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 font-bold  tracking-wider mb-2 block">Phone Number *</label>
                            <input
                                type="tel"
                                className="w-full bg-[#0F0F0F] border border-white/10 rounded-xl px-4 py-3 text-sm text-white transition-colors"
                                placeholder="e.g. 0917 123 4567"
                                value={deliveryDetails.phone}
                                onChange={e => setDeliveryDetails({ ...deliveryDetails, phone: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 font-bold  tracking-wider mb-2 block">Address Line 1 *</label>
                            <input
                                type="text"
                                className="w-full bg-[#0F0F0F] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors"
                                placeholder="House Number, Street Name"
                                value={deliveryDetails.addressLine1}
                                onChange={e => setDeliveryDetails({ ...deliveryDetails, addressLine1: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-gray-400 font-bold  tracking-wider mb-2 block">City *</label>
                                <input
                                    type="text"
                                    className="w-full bg-[#0F0F0F] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-colors"
                                    placeholder="City"
                                    value={deliveryDetails.city}
                                    onChange={e => setDeliveryDetails({ ...deliveryDetails, city: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 font-bold  tracking-wider mb-2 block">Zip Code</label>
                                <input
                                    type="text"
                                    className="w-full bg-[#0F0F0F] border border-white/10 rounded-xl px-4 py-3 text-sm text-white transition-colors"
                                    placeholder="Optional"
                                    value={deliveryDetails.zipCode}
                                    onChange={e => setDeliveryDetails({ ...deliveryDetails, zipCode: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Order Notes */}
                <section className="mb-8 animate-slideUp" style={{ animationDelay: '0.08s' }}>
                    <h2 className="text-[11px] font-bold text-gray-400  tracking-widest mb-3 flex items-center gap-2">
                        <svg viewBox="0 0 24 24" fill="none" className="w-[14px] h-[14px] text-gray-400" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                            <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                        ORDER NOTES
                    </h2>
                    <div className="bg-[#1A1A1A] rounded-[1.25rem] p-5 shadow-lg">
                        <textarea
                            className="w-full bg-[#0F0F0F] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-colors resize-none h-24"
                            placeholder="Optional instructions for delivery or rider..."
                            value={orderNotes}
                            onChange={e => setOrderNotes(e.target.value)}
                        />
                    </div>
                </section>

                {/* Payment Method */}
                <section className="mb-8 animate-slideUp" style={{ animationDelay: '0.1s' }}>
                    <h2 className="text-[11px] font-bold text-gray-400  tracking-widest mb-3 flex items-center gap-2">
                        <svg viewBox="0 0 24 24" fill="none" className="w-[14px] h-[14px] text-gray-400" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                        PAYMENT METHOD
                    </h2>
                    <div className="grid grid-cols-2 gap-3">
                        {paymentMethods.map(method => (
                            <div
                                key={method.id}
                                onClick={() => !isProcessing && setSelectedMethod(method.id)}
                                className={`group relative p-5 rounded-[1.25rem] transition-all cursor-pointer flex flex-col items-center justify-center text-center h-[110px]
                                    ${selectedMethod === method.id
                                        ? 'bg-[#222222] border border-primary/30 shadow-[0_4px_20px_rgba(254,120,3,0.1)]'
                                        : 'bg-[#1A1A1A] border border-transparent hover:bg-[#222222]'
                                    } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <div className={`mb-3 transition-colors ${selectedMethod === method.id ? 'text-primary' : 'text-gray-300'}`}>
                                    {method.icon}
                                </div>
                                <h3 className={`font-bold text-[13px] ${selectedMethod === method.id ? 'text-white' : 'text-gray-300'}`}>{method.name}</h3>
                                <p className="text-[9px] text-gray-500 font-medium mt-1 leading-tight">{method.description}</p>

                                <div className={`absolute top-3 right-3 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all
                                    ${selectedMethod === method.id ? 'border-primary' : 'border-[#333333]'}`}>
                                    {selectedMethod === method.id && <div className="w-2 h-2 bg-primary rounded-full" />}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Credit Card Form - Hidden if redirected, but kept for future use if needed */}
                {selectedMethod === 'Credit Card' && (
                    <section className="mb-6 animate-fadeIn">
                        {/* ... existing card form ... (keeping hidden via HitPay redirect flow anyway) */}
                    </section>
                )}
            </div>

            {/* Sticky Bottom Bar */}
            <div className="fixed bottom-0 left-0 right-0 px-6 py-5 bg-[#121212] border-t border-white/5 z-50 animate-slideUp">
                <div className="max-w-2xl mx-auto w-full space-y-4">
                    {/* Error Message */}
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2 animate-shake">
                            <span className="font-bold">Error:</span> {error}
                        </div>
                    )}

                    <div>
                        <p className="text-[10px] text-gray-500 font-black  tracking-widest mb-1">TOTAL AMOUNT</p>
                        <div className="text-3xl font-black text-white flex items-baseline gap-1">
                            <span className="text-primary text-xl tracking-tight">₱</span>
                            {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>

                    {isProcessing ? (
                        <div className="w-full bg-[#1A1A1A] rounded-[1.25rem] p-4 text-center space-y-3">
                            <Spinner size="md" />
                            <p className="font-bold text-sm text-gray-300">
                                {processingStep}
                            </p>
                        </div>
                    ) : (
                        <button
                            onClick={handleProcessPayment}
                            disabled={isProcessing || !selectedMethod}
                            className={`w-full py-4 rounded-[1.25rem] font-bold text-sm transition-all flex items-center justify-center gap-2
                                ${!selectedMethod
                                    ? 'bg-[#2A2A2A] text-gray-500'
                                    : 'bg-[#333333] hover:bg-[#404040] text-white shadow-lg'}`}
                        >
                            Pay Now <ChevronRight size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* Success Modal */}
            {isSuccess && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-[#1A1A1A] w-full max-w-sm rounded-[2rem] border border-white/5 p-8 flex flex-col items-center text-center shadow-2xl animate-scaleUp">
                        <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-6">
                            <CheckCircle2 size={40} className="text-green-500" />
                        </div>

                        <h2 className="text-2xl font-black text-white mb-2  tracking-wide">Success!</h2>
                        <p className="text-gray-400 text-sm mb-8">Your payment has been processed.</p>

                        <div className="w-full space-y-3">
                            <button
                                onClick={() => {
                                    clearCart();
                                    navigate('/customer-portal/order-history');
                                }}
                                className="w-full py-4 bg-primary hover:bg-orange-600 text-white font-bold rounded-2xl shadow-lg transition-all"
                            >
                                View Order
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* GCash Payment Modal */}
            {showGCashModal && pendingOrderId && (
                <GCashPaymentModal
                    bookingId={pendingOrderId}
                    totalAmount={total}
                    customerName={user?.name || 'Customer'}
                    isOrder={true}
                    services={cartItems.map(item => ({ name: `${item.name} (x${item.quantity})`, price: item.price * item.quantity }))}
                    onPaymentVerified={() => {
                        setShowGCashModal(false);
                        setIsSuccess(true);
                    }}
                    onClose={() => {
                        setShowGCashModal(false);
                        // Redirect to order history so they can pay/view later if they close
                        clearCart();
                        navigate('/customer-portal/order-history');
                    }}
                />
            )}
        </div>
    );
};

export default PaymentScreen;
