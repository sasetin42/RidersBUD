import React, { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { CreditCard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDatabase } from '../context/DatabaseContext';
import Spinner from '../components/Spinner';
import { Booking } from '../types';

import { HitPayService } from '../services/HitPayService';
import GCashPaymentModal from '../components/GCashPaymentModal';

const ServicePaymentScreen: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(location.search);
    const bookingIdParam = queryParams.get('bookingId');
    const bookingState = (location.state as { booking?: Booking })?.booking;
    const { db, updateBookingPayment } = useDatabase();
    const { user } = useAuth();

    const bookingFromQuery = useMemo(() => {
        if (!bookingIdParam || !db) return undefined;
        return db.bookings.find(b => b.id === bookingIdParam);
    }, [bookingIdParam, db]);

    const booking = bookingState || bookingFromQuery;
    const [showGCashModal, setShowGCashModal] = useState(false);
    const [selectedMethod, setSelectedMethod] = useState('');
    const [cardDetails, setCardDetails] = useState({ number: '', expiry: '', cvc: '' });
    const [cardErrors, setCardErrors] = useState<{ [key: string]: string }>({});
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');

    React.useEffect(() => {
        if (!booking && !isProcessing) {
            navigate('/customer-portal/booking-history');
        }
    }, [booking, isProcessing, navigate]);

    if (!booking) {
        return <div className="flex items-center justify-center h-full bg-secondary"><Spinner size="lg" /></div>;
    }

    const services = booking.services || (booking.service ? [booking.service] : []);
    const serviceNames = services.map(s => s.name).join(', ') || 'Unknown Service';
    const basePrice = services.reduce((total, s) => total + (s.price || 0), 0);
    const total = booking.totalAmount || basePrice;
    const paid = booking.paidAmount || 0;
    const isDeposit = booking?.paymentStatus === 'pending' || !booking?.paymentStatus;
    const amountToPay = isDeposit ? total * 0.5 : (total - paid);

    React.useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search);
        const status = queryParams.get('status');

        if (status === 'completed' && !isProcessing) {
            const pendingTx = sessionStorage.getItem('pendingHitPayServiceTx');
            if (pendingTx) {
                const { bookingId, amount, totalAmount, currentPaid, fullBooking } = JSON.parse(pendingTx);

                const finalizePayment = async () => {
                    try {
                        setIsProcessing(true);
                        const newPaidAmount = currentPaid + amount;
                        const newPaymentStatus = newPaidAmount >= totalAmount ? 'paid' : 'partial';
                        const isFullyPaid = newPaymentStatus === 'paid';

                        await updateBookingPayment(bookingId, amount, newPaymentStatus);
                        sessionStorage.removeItem('pendingHitPayServiceTx');

                        const updatedBooking = { ...fullBooking, paidAmount: newPaidAmount, paymentStatus: newPaymentStatus, isPaid: isFullyPaid };
                        navigate('/customer-portal/service-payment-confirmation', { state: { booking: updatedBooking }, replace: true });
                    } catch (err) {
                        setError("Failed to verify payment status.");
                        setIsProcessing(false);
                    }
                };
                finalizePayment();
                return;
            }
        } else if ((status === 'canceled' || status === 'failed') && !isProcessing) {
            setError(`Payment was ${status}. Please try again.`);
            window.history.replaceState({}, document.title, window.location.pathname);
            sessionStorage.removeItem('pendingHitPayServiceTx');
        }

        if (!booking && !isProcessing && !status) {
            navigate('/customer-portal/booking-history');
        }
    }, [booking, isProcessing, navigate, updateBookingPayment]);

    if (!booking && !isProcessing && !sessionStorage.getItem('pendingHitPayServiceTx')) {
        return <div className="flex items-center justify-center h-full bg-secondary"><Spinner size="lg" /></div>;
    }

    const formatCardNumber = (value: string) => value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
    const formatExpiryDate = (value: string) => value.replace(/\//g, '').replace(/(\d{2})(\d{1,2})/, '$1/$2').trim();

    const handleCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let { name, value } = e.target;
        if (name === 'number' && value.length > 19) return;
        if (name === 'expiry' && value.length > 5) return;
        if (name === 'cvc' && value.length > 4) return;

        if (name === 'number') value = formatCardNumber(value.replace(/[^\d]/g, ''));
        if (name === 'expiry') value = formatExpiryDate(value.replace(/[^\d]/g, ''));
        if (name === 'cvc') value = value.replace(/[^\d]/g, '');

        setCardDetails(prev => ({ ...prev, [name]: value }));
        setCardErrors(prev => ({ ...prev, [name]: '' }));
    };

    const validateCard = () => {
        const errors: { [key: string]: string } = {};
        if (cardDetails.number.replace(/\s/g, '').length !== 16) errors.number = 'Card number must be 16 digits.';
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
        if (cardDetails.cvc.length < 3 || cardDetails.cvc.length > 4) errors.cvc = 'CVC must be 3-4 digits.';
        setCardErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleProcessPayment = async () => {
        if (!user) { setError("User not found. Please log in again."); return; }
        if (!selectedMethod) { setError("Please select a payment method."); return; }

        if (selectedMethod === 'GCash') {
            setShowGCashModal(true);
            return;
        }

        setIsProcessing(true);
        setError('');

        try {
            const hitPay = HitPayService.fromSettings(db?.settings);

            // Save state before redirect
            sessionStorage.setItem('pendingHitPayServiceTx', JSON.stringify({
                bookingId: booking.id,
                amount: amountToPay,
                totalAmount: total,
                currentPaid: paid,
                fullBooking: booking
            }));

            const returnUrl = `${window.location.origin}${window.location.pathname}`;

            const { url } = await hitPay.createPaymentRequest({
                amount: amountToPay,
                currency: db?.settings?.currency || 'PHP',
                reference_number: `BOK-${booking.id}-${Date.now()}`,
                webhook: 'https://ridersbud-10806.web.app/payment/webhook',
                redirect_url: returnUrl,
                email: user.email || 'customer@example.com',
                name: user.name || 'Customer'
            });

            // Genuine redirect
            window.location.href = url;
            return;
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unexpected error occurred.");
            setIsProcessing(false);
            sessionStorage.removeItem('pendingHitPayServiceTx');
        }
    };

    const paymentOptions = [
        { name: 'Credit Card', icon: '💳' },
        { name: 'GCash', icon: '🇬' },
        { name: 'Paymaya', icon: '🇵' }
    ];

    return (
        <div className="flex flex-col h-full bg-secondary">
            <Header title={isDeposit ? "Pay Deposit (50%)" : "Pay Remaining Balance"} showBackButton icon={<CreditCard size={22} />} />
            <div className="flex-grow p-4 space-y-4 overflow-y-auto">
                {/* Service Summary */}
                <div className="bg-dark-gray p-4 rounded-lg">
                    <h3 className="font-semibold text-lg text-white mb-2">Service Summary</h3>
                    <div className="flex justify-between items-center text-sm mb-1">
                        <span className="text-light-gray">{serviceNames}</span>
                        <span className="text-white font-semibold">Total: ₱{total.toFixed(2)}</span>
                    </div>
                    {paid > 0 && (
                        <div className="flex justify-between items-center text-sm mb-1 text-green-400">
                            <span>Already Paid</span>
                            <span>-₱{paid.toFixed(2)}</span>
                        </div>
                    )}
                    <div className="flex justify-between items-center text-sm pt-2 border-t border-white/10 mt-2">
                        <span className="text-light-gray font-bold">{isDeposit ? "Deposit Due (50%)" : "Balance Due"}</span>
                        <span className="text-primary font-bold text-lg">₱{amountToPay.toFixed(2)}</span>
                    </div>
                </div>

                {/* Info Box */}
                <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg flex items-start gap-3">
                    <div className="p-2 bg-primary/20 rounded-full">
                        <span className="text-lg">🔒</span>
                    </div>
                    <div>
                        <h4 className="font-bold text-primary text-sm mb-1">Secure Payment via HitPay</h4>
                        <p className="text-xs text-gray-300">You will be redirected to HitPay's secure gateway to complete your payment using GCash, PayMaya, or Cards.</p>
                    </div>
                </div>

                {/* Payment Methods */}
                <div>
                    <h3 className="font-semibold text-lg text-white mb-3">Payment Method</h3>
                    <div className="space-y-3">
                        {paymentOptions.map(option => (
                            <button key={option.name} onClick={() => setSelectedMethod(option.name)} className={`w-full flex items-center p-4 bg-dark-gray rounded-lg transition-all duration-200 border-2 ${selectedMethod === option.name ? 'border-primary' : 'border-transparent hover:border-primary/50'}`}>
                                <span className="text-2xl mr-4">{option.icon}</span>
                                <span className="font-semibold text-white">{option.name}</span>
                                <div className={`w-5 h-5 rounded-full border-2 ml-auto flex-shrink-0 ${selectedMethod === option.name ? 'border-primary bg-primary' : 'border-light-gray'}`}></div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Removed Inline Credit Card Form - using Hosted Redirect instead for better security simulation */}
            </div>

            {/* Footer */}
            <div className="p-4 bg-[#1D1D1D] border-t border-dark-gray space-y-3">
                {error && <p className="text-red-400 text-xs text-center">{error}</p>}
                <div className="flex justify-between items-center text-lg">
                    <span className="text-light-gray">Amount to Pay:</span>
                    <span className="font-bold text-2xl text-primary">₱{amountToPay.toFixed(2)}</span>
                </div>
                <button onClick={handleProcessPayment} disabled={isProcessing || !selectedMethod} className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-orange-600 transition flex items-center justify-center disabled:opacity-50">
                    {isProcessing ? <Spinner size="sm" /> : `Pay with HitPay`}
                </button>
            </div>

            {showGCashModal && booking && (
                <GCashPaymentModal
                    bookingId={booking.id}
                    totalAmount={total}
                    paymentAmount={amountToPay}
                    paymentLabel={isDeposit ? 'Deposit (50%)' : 'Remaining Balance'}
                    customerName={user?.name || 'Customer'}
                    services={services.map(s => ({ name: s.name, price: s.price }))}
                    onPaymentVerified={() => {
                        setShowGCashModal(false);
                        const updatedBooking: Booking = {
                            ...booking,
                            paidAmount: paid + amountToPay,
                            paymentStatus: isDeposit ? 'partial' : 'paid',
                            isPaid: !isDeposit
                        };
                        navigate('/customer-portal/service-payment-confirmation', { state: { booking: updatedBooking }, replace: true });
                    }}
                    onClose={() => setShowGCashModal(false)}
                />
            )}
        </div>
    );
};

export default ServicePaymentScreen;
