import React, { useState, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import CustomerHeader from '../components/CustomerHeader';
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
    const { bookingId: routeBookingId } = useParams<{ bookingId?: string }>();
    const queryParams = new URLSearchParams(location.search);
    const bookingIdParam = routeBookingId || queryParams.get('bookingId');
    const isRentalParam = queryParams.get('isRental') === 'true';
    const bookingState = (location.state as { booking?: Booking })?.booking;
    const { db, updateBookingPayment, updateRentalBooking, cancelBooking } = useDatabase();
    const { user } = useAuth();

    const bookingFromQuery = useMemo(() => {
        if (!bookingIdParam || !db) return undefined;
        if (isRentalParam) {
            const rental = db.rentalBookings?.find(b => b.id === bookingIdParam);
            if (rental) {
                return {
                    ...rental,
                    isRental: true,
                    totalAmount: rental.totalPrice,
                    services: [{ name: `Rent a Car: ${rental.carId}`, price: rental.totalPrice }]
                } as any;
            }
        }
        return db.bookings.find(b => b.id === bookingIdParam);
    }, [bookingIdParam, db, isRentalParam]);

    const bookingFromSession = useMemo(() => {
        const pendingTx = sessionStorage.getItem('pendingHitPayServiceTx');
        if (pendingTx) {
            try {
                const parsed = JSON.parse(pendingTx);
                return parsed.fullBooking as Booking;
            } catch (e) {
                return undefined;
            }
        }
        return undefined;
    }, []);

    const booking = bookingState || bookingFromQuery || bookingFromSession;

    const services = useMemo(() => {
        if (!booking) return [];
        return booking.services && booking.services.length > 0 ? booking.services : booking.service ? [booking.service] : [];
    }, [booking]);

    const total = useMemo(() => {
        return services.reduce((sum: number, s: any) => sum + (s.price || 0), 0);
    }, [services]);

    const paid = useMemo(() => {
        if (!booking) return 0;
        return booking.paidAmount || 0;
    }, [booking]);

    const serviceNames = useMemo(() => {
        return services.map((s: any) => s.name).join(', ');
    }, [services]);

    const isDeposit = useMemo(() => {
        return booking?.paymentStatus === 'deposit' || (paid === 0 && !booking?.isRental);
    }, [booking, paid]);

    const amountToPay = useMemo(() => {
        if (isDeposit) {
            return total / 2;
        }
        return total - paid;
    }, [total, paid, isDeposit]);

    const [showGCashModal, setShowGCashModal] = useState(false);
    const [selectedMethod, setSelectedMethod] = useState('');
    const [cardDetails, setCardDetails] = useState({ number: '', expiry: '', cvc: '' });
    const [cardErrors, setCardErrors] = useState<{ [key: string]: string }>({});
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');

    const finalizeRun = React.useRef(false);

    React.useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search);
        const status = queryParams.get('status') || queryParams.get('hitpay');

        if ((status === 'completed' || status === 'success') && !isProcessing && !finalizeRun.current) {
            const pendingTx = sessionStorage.getItem('pendingHitPayServiceTx');
            const sessionData = pendingTx ? JSON.parse(pendingTx) : null;
            const targetBookingId = sessionData?.bookingId || bookingIdParam || booking?.id;

            if (targetBookingId) {
                finalizeRun.current = true;
                const amount = sessionData?.amount || amountToPay || total;
                const totalAmount = sessionData?.totalAmount || total;
                const currentPaid = sessionData?.currentPaid !== undefined ? sessionData.currentPaid : paid;
                const fullBooking = sessionData?.fullBooking || booking;
                const isRental = sessionData?.isRental || isRentalParam || fullBooking?.isRental;

                const finalizePayment = async () => {
                    try {
                        setIsProcessing(true);
                        const newPaidAmount = currentPaid + amount;
                        const isFullyPaid = newPaidAmount >= (totalAmount - 1);
                        const newPaymentStatus = isFullyPaid ? 'paid' : 'partial';
                        const isRentalBooking = fullBooking?.isRental || isRental;
                        const hitpayRef = queryParams.get('reference') || queryParams.get('payment_request_id') || `HITPAY-${Date.now()}`;
                        const requestId = queryParams.get('payment_request_id') || '';

                        if (isRentalBooking && updateRentalBooking) {
                            await updateRentalBooking(targetBookingId, {
                                paidAmount: newPaidAmount,
                                paymentStatus: newPaymentStatus,
                                isPaid: isFullyPaid,
                                isVerified: true,
                                paymentMethod: 'HitPay (Online)',
                                status: 'Confirmed',
                                ...(isFullyPaid ? {
                                    balancePaymentRef: hitpayRef,
                                    balancePaidAt: new Date().toISOString(),
                                    balancePaid: true
                                } : {
                                    downpaymentRef: hitpayRef,
                                    downpaymentPaidAt: new Date().toISOString(),
                                    downpaymentAmount: amount
                                })
                            });
                        } else if (updateBookingPayment) {
                            await updateBookingPayment(targetBookingId, amount, newPaymentStatus, {
                                paidAmount: newPaidAmount,
                                remainingBalance: Math.max(0, totalAmount - newPaidAmount),
                                isPaid: isFullyPaid,
                                isVerified: true,
                                paymentMethod: 'HitPay (Online)',
                                hitpayPaymentRequestId: requestId,
                                hitpayReference: hitpayRef,
                                hitpayStatus: 'completed',
                                ...(isFullyPaid ? {
                                    balancePaymentRef: hitpayRef,
                                    balancePaidAt: new Date().toISOString(),
                                    balancePaid: true,
                                    status: fullBooking?.status === 'Work Done' ? 'Completed' : (fullBooking?.status || 'Upcoming')
                                } : {
                                    downpaymentRef: hitpayRef,
                                    downpaymentPaidAt: new Date().toISOString(),
                                    downpaymentAmount: amount,
                                    status: fullBooking?.status === 'Pending' ? 'Upcoming' : (fullBooking?.status || 'Upcoming')
                                })
                            });
                        }
                        sessionStorage.removeItem('pendingHitPayServiceTx');

                        const updatedBooking = { 
                            ...fullBooking, 
                            paidAmount: newPaidAmount, 
                            paymentStatus: newPaymentStatus, 
                            isPaid: isFullyPaid,
                            isVerified: true,
                            paymentMethod: 'HitPay (Online)',
                            isRental: isRentalBooking,
                            status: isRentalBooking ? 'Confirmed' : (isFullyPaid && fullBooking?.status === 'Work Done' ? 'Completed' : (fullBooking?.status || 'Upcoming')),
                            ...(isFullyPaid ? {
                                balancePaymentRef: hitpayRef,
                                balancePaidAt: new Date().toISOString(),
                                balancePaid: true,
                                remainingBalance: 0
                            } : {
                                downpaymentRef: hitpayRef,
                                downpaymentPaidAt: new Date().toISOString(),
                                downpaymentAmount: amount,
                                remainingBalance: Math.max(0, totalAmount - newPaidAmount)
                            })
                        };
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
            const pendingTx = sessionStorage.getItem('pendingHitPayServiceTx');
            const sessionData = pendingTx ? JSON.parse(pendingTx) : null;
            sessionStorage.removeItem('pendingHitPayServiceTx');

            const targetBookingId = sessionData?.bookingId || bookingIdParam || booking?.id;
            const isRental = sessionData?.isRental || isRentalParam || booking?.isRental;
            const cancelAmount = sessionData?.amount || amountToPay || total;
            const itemNames = (services && services.length > 0) ? services.map((s: any) => ({ name: s.name, price: s.price })) : [{ name: serviceNames || 'Vehicle Service', price: cancelAmount }];

            // Cancel the booking in the database
            if (targetBookingId) {
                if (isRental && updateRentalBooking) {
                    updateRentalBooking(targetBookingId, { status: 'Cancelled' }).catch(console.warn);
                } else if (cancelBooking) {
                    cancelBooking(targetBookingId, 'Payment process was cancelled by customer at payment gateway.').catch(console.warn);
                }
            }

            const cancellationInfo = {
                type: isRental ? ('Car Rental' as const) : ('Service Booking' as const),
                referenceId: targetBookingId ? `BOK-${targetBookingId}` : 'BOK-CANCELLED',
                amount: cancelAmount,
                date: new Date().toLocaleString(),
                reason: 'Payment process was cancelled by the user at the payment gateway.',
                items: itemNames,
                retryPath: `/customer-portal/service-payment?bookingId=${targetBookingId || ''}`
            };

            window.history.replaceState({}, document.title, window.location.pathname);

            navigate('/customer-portal/', {
                state: { cancelledTransaction: cancellationInfo },
                replace: true
            });
        }

        if (!booking && !isProcessing && !status) {
            navigate('/customer-portal/booking-history');
        }
    }, [booking, isProcessing, navigate, updateBookingPayment, updateRentalBooking, cancelBooking, bookingIdParam, isRentalParam, services, serviceNames, amountToPay, total]);

    if (isProcessing) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-secondary space-y-4">
                <Spinner size="lg" />
                <p className="text-white font-medium">Verifying your payment, please wait...</p>
            </div>
        );
    }

    if (!booking) {
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

        if (selectedMethod === 'Manual GCash' || selectedMethod === 'GCash') {
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
                fullBooking: booking,
                isRental: booking.isRental // Explicitly serialize isRental flag
            }));

            const returnUrl = `${window.location.origin}${window.location.pathname}?bookingId=${booking.id}`;
            const appTitle = db?.settings?.appName || 'RidersBUD';
            const purpose = isDeposit
                ? `${appTitle} — 50% Initial DP (Booking #${booking.id.slice(-6).toUpperCase()})`
                : `${appTitle} — 50% Balance Settlement (Booking #${booking.id.slice(-6).toUpperCase()})`;

            const { url } = await hitPay.createPaymentRequest({
                amount: amountToPay,
                currency: db?.settings?.currency || 'PHP',
                reference_number: `BOK-${booking.id}-${isDeposit ? 'DP' : 'BAL'}-${Date.now()}`,
                webhook: 'https://ridersbud-10806.web.app/payment/webhook',
                redirect_url: returnUrl,
                email: user.email || 'customer@example.com',
                name: user.name || 'Customer',
                purpose: purpose
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

    const isManualGcashEnabled = db?.settings?.gcashEnabled ?? false;
    const isHitPayActive = HitPayService.isGatewayActive(db?.settings);

    const paymentOptions = useMemo(() => {
        const options: { name: string; icon: string; subtitle?: string }[] = [];
        if (isHitPayActive) {
            options.push({ name: 'HitPay Online (Cards, GCash, Maya, QRPH)', icon: '💳', subtitle: 'Instant Automated Processing' });
        }
        if (isManualGcashEnabled) {
            options.push({ name: 'Manual GCash', icon: '🇬', subtitle: 'Scan QR & Upload Receipt' });
        }
        if (options.length === 0) {
            options.push({ name: 'HitPay Online', icon: '💳', subtitle: 'Online Gateway' });
        }
        return options;
    }, [isHitPayActive, isManualGcashEnabled]);

    return (
        <div className="flex flex-col h-full bg-secondary">
            <CustomerHeader title={isDeposit ? "Pay Deposit (50%)" : "Pay Remaining Balance"} showBackButton icon={<CreditCard size={22} />} />
            <div className="flex-grow p-4 pb-32 space-y-4 overflow-y-auto">
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
            <div className="p-4 bg-gradient-to-t from-secondary via-secondary/95 to-transparent shrink-0 z-30 pb-[calc(1rem+env(safe-area-inset-bottom))] space-y-3">
                {error && <p className="text-red-400 text-xs text-center">{error}</p>}
                <div className="flex justify-between items-center text-lg">
                    <span className="text-light-gray">Amount to Pay:</span>
                    <span className="font-bold text-2xl text-primary">₱{amountToPay.toFixed(2)}</span>
                </div>
                <button onClick={handleProcessPayment} disabled={isProcessing || !selectedMethod} className="w-full bg-primary text-white font-bold py-4 rounded-2xl hover:bg-orange-600 transition flex items-center justify-center disabled:opacity-50 shadow-lg shadow-primary/20">
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
                    onPaymentVerified={async () => {
                        setShowGCashModal(false);
                        const newPaidAmount = paid + amountToPay;
                        const newPaymentStatus = isDeposit ? 'partial' : 'paid';
                        const isFullyPaid = !isDeposit;

                        if (booking.isRental && updateRentalBooking) {
                            await updateRentalBooking(booking.id, {
                                paidAmount: newPaidAmount,
                                paymentStatus: newPaymentStatus,
                                isPaid: isFullyPaid,
                                status: 'Confirmed'
                            });
                        }

                        const updatedBooking = {
                            ...booking,
                            paidAmount: newPaidAmount,
                            paymentStatus: newPaymentStatus,
                            isPaid: isFullyPaid,
                            status: booking.isRental ? 'Confirmed' : booking.status
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
