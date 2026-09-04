import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import CustomerHeader from '../components/CustomerHeader';
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
    const { db, addOrder, updateOrderStatus } = useDatabase();
    const { user } = useAuth();

    const isManualGcashEnabled = db?.settings?.gcashEnabled ?? false;
    const isHitPayActive = HitPayService.isGatewayActive(db?.settings);

    const [selectedMethod, setSelectedMethod] = useState(() => {
        if (!isManualGcashEnabled && isHitPayActive) return 'Credit Card';
        if (isManualGcashEnabled) return 'GCash';
        return 'Credit Card';
    });

    React.useEffect(() => {
        if (!isManualGcashEnabled && selectedMethod === 'GCash') {
            setSelectedMethod('Credit Card');
        }
    }, [isManualGcashEnabled, selectedMethod]);

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
    const [confettiPieces, setConfettiPieces] = useState<any[]>([]);

    React.useEffect(() => {
        if (isSuccess) {
            const colors = ['#FE7803', '#22C55E', '#3B82F6', '#EAB308', '#EC4899', '#A855F7', '#14B8A6'];
            const shapes = ['circle', 'square', 'triangle'];
            const pieces = Array.from({ length: 150 }).map((_, i) => ({
                id: i,
                x: Math.random() * 100,
                y: -10 - Math.random() * 20,
                size: 6 + Math.random() * 8,
                color: colors[Math.floor(Math.random() * colors.length)],
                shape: shapes[Math.floor(Math.random() * shapes.length)],
                delay: Math.random() * 2.5,
                duration: 2.0 + Math.random() * 2.5,
                rotation: Math.random() * 360
            }));
            setConfettiPieces(pieces);
        } else {
            setConfettiPieces([]);
        }
    }, [isSuccess]);

    // Handle return from HitPay redirect (Credit Card flow)
    React.useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search);
        const status = queryParams.get('status');
        const reference = queryParams.get('reference');

        if (status === 'completed' && reference && !isSuccess) {
            const pendingTx = sessionStorage.getItem('pendingHitPayTx');
            const sessionData = pendingTx ? JSON.parse(pendingTx) : null;

            // Ensure this effect only finalizes HitPay orders created before redirect
            if (!sessionData?.orderId) {
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
            const pendingTx = sessionStorage.getItem('pendingHitPayTx');
            const sessionData = pendingTx ? JSON.parse(pendingTx) : null;
            sessionStorage.removeItem('pendingHitPayTx');

            const cancellationInfo = {
                type: 'Order',
                referenceId: sessionData?.orderId || reference || 'ORD-CANCELLED',
                amount: total,
                date: new Date().toLocaleString(),
                reason: 'Payment process was cancelled by the user at the payment gateway.',
                items: cartItems.map(item => ({ name: item.name, quantity: item.quantity, price: item.price * item.quantity })),
                retryPath: '/customer-portal/checkout'
            };

            // If order was created in DB, update status to Cancelled
            if (sessionData?.orderId && updateOrderStatus) {
                updateOrderStatus(sessionData.orderId, 'Cancelled').catch(console.warn);
            }
            window.history.replaceState({}, document.title, window.location.pathname);

            navigate('/customer-portal/', {
                state: { cancelledTransaction: cancellationInfo },
                replace: true
            });
        }
    }, [isSuccess, cartItems, total, navigate, db, updateOrderStatus]);

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

    const handlePayment = async (e: React.FormEvent) => {
        e.preventDefault();

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

        setIsProcessing(true);
        setError('');

        try {
            if (selectedMethod === 'GCash' && isManualGcashEnabled) {
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

            if (selectedMethod === 'Credit Card' || isHitPayActive) {
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

                try {
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
                } catch (hitpayErr) {
                    console.warn('HitPay online checkout unavailable. Falling back to GCash payment modal:', hitpayErr);
                    setPendingOrderId(newOrder.id);
                    setShowGCashModal(true);
                    setIsProcessing(false);
                    setProcessingStep('');
                    return;
                }
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


    return (
        <div className="flex flex-col h-screen h-[100dvh] bg-[#0F0F0F] text-white font-sans overflow-hidden">
            <CustomerHeader title="CHECKOUT" showBackButton icon={<CreditCard size={22} />} />

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
                            <label htmlFor="payment-fullname" className="text-xs text-gray-400 font-bold  tracking-wider mb-2 block">Full Name *</label>
                            <input
                                id="payment-fullname"
                                name="payment-fullname"
                                type="text"
                                className="w-full bg-[#0F0F0F] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-colors"
                                placeholder="Recipient's Name"
                                value={deliveryDetails.fullName}
                                onChange={e => setDeliveryDetails({ ...deliveryDetails, fullName: e.target.value })}
                            />
                        </div>
                        <div>
                            <label htmlFor="payment-phone" className="text-xs text-gray-400 font-bold  tracking-wider mb-2 block">Phone Number *</label>
                            <input
                                id="payment-phone"
                                name="payment-phone"
                                type="tel"
                                className="w-full bg-[#0F0F0F] border border-white/10 rounded-xl px-4 py-3 text-sm text-white transition-colors"
                                placeholder="e.g. 0917 123 4567"
                                value={deliveryDetails.phone}
                                onChange={e => setDeliveryDetails({ ...deliveryDetails, phone: e.target.value })}
                            />
                        </div>
                        <div>
                            <label htmlFor="payment-address" className="text-xs text-gray-400 font-bold  tracking-wider mb-2 block">Address Line 1 *</label>
                            <input
                                id="payment-address"
                                name="payment-address"
                                type="text"
                                className="w-full bg-[#0F0F0F] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors"
                                placeholder="House Number, Street Name"
                                value={deliveryDetails.addressLine1}
                                onChange={e => setDeliveryDetails({ ...deliveryDetails, addressLine1: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="payment-city" className="text-xs text-gray-400 font-bold  tracking-wider mb-2 block">City *</label>
                                <input
                                    id="payment-city"
                                    name="payment-city"
                                    type="text"
                                    className="w-full bg-[#0F0F0F] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-colors"
                                    placeholder="City"
                                    value={deliveryDetails.city}
                                    onChange={e => setDeliveryDetails({ ...deliveryDetails, city: e.target.value })}
                                />
                            </div>
                            <div>
                                <label htmlFor="payment-zip" className="text-xs text-gray-400 font-bold  tracking-wider mb-2 block">Zip Code</label>
                                <input
                                    id="payment-zip"
                                    name="payment-zip"
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
                    <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <svg viewBox="0 0 24 24" fill="none" className="w-[14px] h-[14px] text-gray-400" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                        PAYMENT METHOD
                    </h2>
                    <div className="space-y-3">
                        {isHitPayActive && (
                            <div 
                                onClick={() => setSelectedMethod('Credit Card')}
                                className={`border rounded-[1.25rem] p-5 flex items-center gap-4 cursor-pointer transition-all ${
                                    selectedMethod === 'Credit Card' 
                                        ? 'bg-[#1A1A1A] border-primary/40 shadow-lg shadow-primary/10' 
                                        : 'bg-[#141414] border-white/5 hover:border-white/10'
                                }`}
                            >
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                    <CreditCard size={20} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="font-bold text-[13px] text-white">HitPay Online Gateway</h3>
                                    <p className="text-[10px] text-gray-400 mt-0.5">GCash • Maya • QRPH • Credit & Debit Cards</p>
                                </div>
                                <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg px-2.5 py-1 text-[9px] font-black uppercase shrink-0">
                                    Instant
                                </div>
                            </div>
                        )}

                        {isManualGcashEnabled && (
                            <div 
                                onClick={() => setSelectedMethod('GCash')}
                                className={`border rounded-[1.25rem] p-5 flex items-center gap-4 cursor-pointer transition-all ${
                                    selectedMethod === 'GCash' 
                                        ? 'bg-[#1A1A1A] border-primary/40 shadow-lg shadow-primary/10' 
                                        : 'bg-[#141414] border-white/5 hover:border-white/10'
                                }`}
                            >
                                <div className="w-10 h-10 rounded-xl bg-[#007DFE]/10 flex items-center justify-center text-[#007DFE] shrink-0">
                                    <Wallet size={20} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="font-bold text-[13px] text-white">Manual GCash</h3>
                                    <p className="text-[10px] text-gray-400 mt-0.5">Scan QR code & upload receipt image</p>
                                </div>
                                <div className="bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg px-2.5 py-1 text-[9px] font-black uppercase shrink-0">
                                    Manual
                                </div>
                            </div>
                        )}
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
            <div className="fixed bottom-0 left-0 right-0 px-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-5 bg-gradient-to-t from-[#0F0F0F] via-[#0F0F0F]/95 to-transparent z-50 animate-slideUp">
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
                            onClick={handlePayment}
                            disabled={isProcessing || !selectedMethod}
                            className={`w-full py-4 rounded-[1.25rem] font-bold text-sm transition-all flex items-center justify-center gap-2
                                ${!selectedMethod
                                    ? 'bg-[#2A2A2A] text-gray-500 cursor-not-allowed'
                                    : 'bg-primary hover:bg-orange-600 active:scale-[0.98] text-white shadow-lg shadow-primary/20'}`}
                        >
                            Pay Now <ChevronRight size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* Success Modal */}
            {isSuccess && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
                    {/* CSS Confetti Rain Overlay */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        <style>{`
                            @keyframes confetti-fall {
                                0% {
                                    transform: translateY(0) rotate(0deg);
                                    opacity: 1;
                                }
                                80% {
                                    opacity: 1;
                                }
                                100% {
                                    transform: translateY(105vh) rotate(720deg);
                                    opacity: 0;
                                }
                            }
                        `}</style>
                        {confettiPieces.map((piece) => (
                            <div
                                key={piece.id}
                                style={{
                                    position: 'absolute',
                                    left: `${piece.x}%`,
                                    top: `${piece.y}%`,
                                    width: `${piece.size}px`,
                                    height: piece.shape === 'triangle' ? '0' : `${piece.size}px`,
                                    backgroundColor: piece.shape === 'triangle' ? 'transparent' : piece.color,
                                    borderLeft: piece.shape === 'triangle' ? `${piece.size / 2}px solid transparent` : undefined,
                                    borderRight: piece.shape === 'triangle' ? `${piece.size / 2}px solid transparent` : undefined,
                                    borderBottom: piece.shape === 'triangle' ? `${piece.size}px solid ${piece.color}` : undefined,
                                    borderRadius: piece.shape === 'circle' ? '50%' : undefined,
                                    transform: `rotate(${piece.rotation}deg)`,
                                    animation: `confetti-fall ${piece.duration}s linear ${piece.delay}s infinite`,
                                    zIndex: 10,
                                }}
                            />
                        ))}
                    </div>

                    <div className="bg-[#1A1A1A] w-full max-w-sm rounded-[2rem] border border-white/5 p-8 flex flex-col items-center text-center shadow-2xl animate-scaleUp z-20">
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
