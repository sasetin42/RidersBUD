import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import CustomerHeader from '../components/CustomerHeader';
import { CreditCard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDatabase } from '../context/DatabaseContext';
import Spinner from '../components/Spinner';
import { Booking } from '../types';

import { HitPayService } from '../services/HitPayService';
import GCashPaymentModal from '../components/GCashPaymentModal';
import HitPayInAppModal from '../components/HitPayInAppModal';
import { resumePendingPaymentVerification, isNativePlatform as isNative, openPaymentUrl } from '../utils/paymentRedirect';

const ServicePaymentScreen: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { bookingId: routeBookingId } = useParams<{ bookingId?: string }>();
    const queryParams = new URLSearchParams(location.search);
    const bookingIdParam = routeBookingId || queryParams.get('bookingId');
    const isRentalParam = queryParams.get('isRental') === 'true';
    const isDriverParam = queryParams.get('isDriver') === 'true' || queryParams.get('isDriverHire') === 'true';
    const isLiaisonParam = queryParams.get('isLiaison') === 'true';
    const bookingState = (location.state as { booking?: Booking })?.booking;
    const { db, updateBookingPayment, updateRentalBooking, updateServiceRequest, updateServiceRequestStatus, updateLiaisonBooking, updateLiaisonBookingStatus, cancelBooking } = useDatabase();
    const { user } = useAuth();

    // Native: resume pending payment watch (custom tab re-entry / process death)
    useEffect(() => {
        if (!isNative()) return;
        const stop = resumePendingPaymentVerification(
            (marker) => navigate(marker.returnRoute, { state: { payment_completed: '1' } }),
            () => {}
        );
        return () => { stop?.(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const bookingFromQuery = useMemo(() => {
        if (!bookingIdParam || !db) return undefined;
        if (isRentalParam) {
            const rental = db.rentalBookings?.find(b => b.id === bookingIdParam);
            if (rental) {
                const totalAmt = Number(rental.totalAmount || rental.totalPrice) || 0;
                const paidAmt = Number(rental.paidAmount) || 0;
                return {
                    ...rental,
                    isRental: true,
                    totalAmount: totalAmt,
                    paidAmount: paidAmt,
                    downpaymentAmount: rental.downpaymentAmount || (totalAmt * 0.5),
                    remainingBalance: Math.max(0, totalAmt - paidAmt),
                    services: [{ name: `Rent a Car: ${rental.vehicleModel || rental.carName || rental.carId || 'Reserved Vehicle'}`, price: totalAmt }]
                } as any;
            }
        }
        if (isDriverParam) {
            const drvReq = db.serviceRequests?.find(r => r.id === bookingIdParam);
            if (drvReq) {
                const totalAmt = Number(drvReq.totalAmount) || 0;
                return {
                    ...drvReq,
                    isDriver: true,
                    isDriverHire: true,
                    totalAmount: totalAmt,
                    paidAmount: drvReq.paidAmount || 0,
                    services: [{ name: `Driver for Hire: ${drvReq.details?.purposeOfHire || drvReq.purposeOfHire || 'Chauffeur'}`, price: totalAmt }]
                } as any;
            }
        }
        if (isLiaisonParam || bookingIdParam.startsWith('LIA-')) {
            const cleanId = bookingIdParam.replace(/^LIA-/, '').toLowerCase();
            const liaison = db.liaisonBookings?.find(l => 
                l.id === bookingIdParam || 
                l.id?.slice(-6).toLowerCase() === cleanId ||
                l.id?.toLowerCase() === cleanId ||
                bookingIdParam.toLowerCase().includes(l.id?.toLowerCase())
            );
            if (liaison) {
                const totalAmt = Number(liaison.totalAmount) || 0;
                const paidAmt = Number(liaison.paidAmount) || 0;
                return {
                    ...liaison,
                    isLiaison: true,
                    totalAmount: totalAmt,
                    paidAmount: paidAmt,
                    remainingBalance: Math.max(0, totalAmt - paidAmt),
                    services: [{ name: `Liaison Service: ${liaison.serviceType || 'Registration'}`, price: totalAmt }]
                } as any;
            }
        }
        // General Service Requests (Towing, Liaison, etc.)
        const genServiceReq = db.serviceRequests?.find(r => r.id === bookingIdParam);
        if (genServiceReq) {
            const totalAmt = Number(genServiceReq.totalAmount) || 0;
            return {
                ...genServiceReq,
                isServiceRequest: true,
                totalAmount: totalAmt,
                paidAmount: genServiceReq.paidAmount || 0,
                services: [{ name: genServiceReq.serviceName || 'Special Service Request', price: totalAmt }]
            } as any;
        }

        return db.bookings.find(b => b.id === bookingIdParam);
    }, [bookingIdParam, db, isRentalParam, isDriverParam]);

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
        // If booking is already marked as deposit or has 0 paid amount, it qualifies for 50% DP
        if (booking?.isRental) {
            return (paid === 0) || booking?.paymentStatus === 'deposit' || booking?.paymentStatus === 'partial';
        }
        return booking?.paymentStatus === 'deposit' || paid === 0;
    }, [booking, paid]);

    const amountToPay = useMemo(() => {
        if (isDeposit && paid === 0) {
            return total / 2;
        }
        return Math.max(0, total - paid);
    }, [total, paid, isDeposit]);

    const [showGCashModal, setShowGCashModal] = useState(false);
    const [inAppModalUrl, setInAppModalUrl] = useState<string | null>(null);
    const [selectedMethod, setSelectedMethod] = useState('');
    const [cardDetails, setCardDetails] = useState({ number: '', expiry: '', cvc: '' });
    const [cardErrors, setCardErrors] = useState<{ [key: string]: string }>({});
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');

    const finalizeRun = React.useRef(false);

    const processBookingPaymentSuccess = async (successData: {
        targetBookingId: string;
        amount: number;
        totalAmount: number;
        currentPaid: number;
        fullBooking: any;
        isRentalBooking: boolean;
        isLiaisonBooking: boolean;
        isDriverBooking: boolean;
        isServiceReqBooking: boolean;
        hitpayRef: string;
        requestId: string;
    }) => {
        try {
            setIsProcessing(true);
            const { targetBookingId, amount, totalAmount, currentPaid, fullBooking, isRentalBooking, isLiaisonBooking, isServiceReqBooking, hitpayRef, requestId } = successData;
            const newPaidAmount = currentPaid + amount;
            const isFullyPaid = newPaidAmount >= (totalAmount - 0.5);
            const newPaymentStatus = isFullyPaid ? 'paid' : 'partial';

            if (isRentalBooking && updateRentalBooking) {
                await updateRentalBooking(targetBookingId, {
                    paidAmount: newPaidAmount,
                    paymentStatus: newPaymentStatus,
                    isPaid: isFullyPaid,
                    isVerified: true,
                    paymentMethod: 'HitPay (Online)',
                    status: isFullyPaid ? 'Completed' : 'Confirmed',
                    remainingBalance: isFullyPaid ? 0 : Math.max(0, totalAmount - newPaidAmount),
                    balanceAmount: isFullyPaid ? 0 : Math.max(0, totalAmount - newPaidAmount),
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
            } else if (isLiaisonBooking && updateLiaisonBooking) {
                await updateLiaisonBooking(targetBookingId, {
                    paidAmount: newPaidAmount,
                    paymentStatus: newPaymentStatus,
                    paymentMethod: 'Online (HitPay)',
                    isPaid: isFullyPaid,
                    status: isFullyPaid ? 'Completed' : 'Booking Received',
                    ...(isFullyPaid ? {
                        balancePaymentRef: hitpayRef,
                        balancePaidAt: new Date().toISOString(),
                        remainingBalance: 0
                    } : {
                        downpaymentRef: hitpayRef,
                        downpaymentPaidAt: new Date().toISOString(),
                        downpaymentAmount: amount,
                        remainingBalance: Math.max(0, totalAmount - newPaidAmount)
                    })
                });
            } else if (isServiceReqBooking && updateServiceRequest) {
                await updateServiceRequest(targetBookingId, {
                    paidAmount: newPaidAmount,
                    paymentStatus: newPaymentStatus,
                    isPaid: isFullyPaid,
                    isVerified: true,
                    paymentMethod: 'HitPay (Online)',
                    status: isFullyPaid ? 'Completed' : 'Confirmed',
                    remainingBalance: isFullyPaid ? 0 : Math.max(0, totalAmount - newPaidAmount),
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
                totalAmount: totalAmount,
                paidAmount: newPaidAmount, 
                paymentStatus: newPaymentStatus, 
                isPaid: isFullyPaid,
                isVerified: true,
                paymentMethod: 'HitPay (Online)',
                isRental: isRentalBooking,
                isLiaison: isLiaisonBooking,
                status: isRentalBooking ? (isFullyPaid ? 'Completed' : 'Confirmed') : (isFullyPaid && fullBooking?.status === 'Work Done' ? 'Completed' : (fullBooking?.status || 'Upcoming')),
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
                const isRentalBooking = fullBooking?.isRental || isRental;
                const isDriverBooking = fullBooking?.isDriver || fullBooking?.isDriverHire || isDriverParam || sessionData?.isDriver;
                const isLiaisonBooking = fullBooking?.isLiaison || isLiaisonParam || sessionData?.isLiaison;
                const isServiceReqBooking = fullBooking?.isServiceRequest || sessionData?.isServiceRequest || isDriverBooking;
                const hitpayRef = queryParams.get('reference') || queryParams.get('payment_request_id') || `HITPAY-${Date.now()}`;
                const requestId = queryParams.get('payment_request_id') || '';

                processBookingPaymentSuccess({
                    targetBookingId,
                    amount,
                    totalAmount,
                    currentPaid,
                    fullBooking,
                    isRentalBooking,
                    isLiaisonBooking,
                    isDriverBooking,
                    isServiceReqBooking,
                    hitpayRef,
                    requestId
                });
                return;
            }
        } else if ((status === 'canceled' || status === 'cancelled' || status === 'failed' || status === 'expired' || status === 'abort') && !isProcessing) {
            const pendingTx = sessionStorage.getItem('pendingHitPayServiceTx');
            const sessionData = pendingTx ? JSON.parse(pendingTx) : null;
            sessionStorage.removeItem('pendingHitPayServiceTx');
            sessionStorage.removeItem('pendingHitPayBookingTx');
            sessionStorage.removeItem('pendingHitPayTx');
            try {
                localStorage.removeItem('last_hitpay_booking_tx');
                localStorage.removeItem('last_hitpay_service_tx');
            } catch (e) {}

            const targetBookingId = sessionData?.bookingId || bookingIdParam || booking?.id;
            const isRental = sessionData?.isRental || isRentalParam || booking?.isRental;
            const isDriver = sessionData?.isDriver || isDriverParam || (booking as any)?.isDriver || (booking as any)?.isDriverHire;
            const isLiaison = queryParams.get('isLiaison') === 'true' || sessionData?.isLiaison || (booking as any)?.isLiaison;
            const isServiceRequest = isDriver || isLiaison || sessionData?.fullBooking?.isServiceRequest || (booking as any)?.isServiceRequest;
            const cancelAmount = sessionData?.amount || amountToPay || total;
            
            // Check if this booking is already confirmed, partially paid, or paying remaining balance
            const currentPaidAmount = sessionData?.currentPaid ?? booking?.paidAmount ?? (booking as any)?.downpaymentAmount ?? 0;
            const isBalanceOrConfirmed = currentPaidAmount > 0 || booking?.status === 'Confirmed' || booking?.paymentStatus === 'deposit' || booking?.paymentStatus === 'partial';

            window.history.replaceState({}, document.title, window.location.pathname);

            if (isBalanceOrConfirmed) {
                // Do NOT cancel the confirmed booking or show cancellation popup during balance payment flow
                setError("Payment was not completed. Your booking remains active and confirmed.");
                setIsProcessing(false);
                return;
            }

            // Extract display items
            let itemNames: Array<{ name: string; quantity?: number; price?: number }> = [];
            if (sessionData?.fullBooking?.services && Array.isArray(sessionData.fullBooking.services)) {
                itemNames = sessionData.fullBooking.services.map((s: any) => ({ name: s.name, price: s.price }));
            } else if (services && services.length > 0) {
                itemNames = services.map((s: any) => ({ name: s.name, price: s.price }));
            } else {
                itemNames = [{ name: isDriver ? 'Driver for Hire Service' : (serviceNames || 'Vehicle Service'), price: sessionData?.totalAmount || total || cancelAmount }];
            }

            const cancelReason = 'Payment process was cancelled by the user at the payment gateway.';

            // Only cancel initial unpaid bookings
            if (targetBookingId) {
                if (isRental && updateRentalBooking) {
                    updateRentalBooking(targetBookingId, { status: 'Cancelled', cancellationReason: cancelReason }).catch(console.warn);
                } else if (isLiaison && updateLiaisonBookingStatus) {
                    updateLiaisonBookingStatus(targetBookingId, 'Cancelled', cancelReason).catch(console.warn);
                } else if (isServiceRequest) {
                    if (updateServiceRequestStatus) {
                        updateServiceRequestStatus(targetBookingId, 'Cancelled', cancelReason).catch(console.warn);
                    }
                    if (updateServiceRequest) {
                        updateServiceRequest(targetBookingId, { status: 'Cancelled', cancellationReason: cancelReason }).catch(console.warn);
                    }
                } else if (cancelBooking) {
                    cancelBooking(targetBookingId, cancelReason).catch(console.warn);
                }
            }

            const cancellationInfo = {
                type: isRental ? ('Car Rental' as const) : ('Service Booking' as const),
                referenceId: targetBookingId ? (targetBookingId.startsWith('#') ? targetBookingId : `#${targetBookingId.slice(-8).toUpperCase()}`) : '#TXN-CANCELLED',
                amount: cancelAmount,
                date: new Date().toLocaleString(),
                reason: cancelReason,
                items: itemNames,
                retryPath: isDriver ? '/customer-portal/services/driver' : (isRental ? '/customer-portal/rent-car' : (isLiaison ? '/customer-portal/services/liaison' : `/customer-portal/service-payment?bookingId=${targetBookingId || ''}`))
            };

            navigate('/customer-portal/', {
                state: { cancelledTransaction: cancellationInfo },
                replace: true
            });
        }

        if (!booking && !isProcessing && !status) {
            navigate('/customer-portal/booking-history');
        }
    }, [booking, isProcessing, navigate, updateBookingPayment, updateRentalBooking, updateServiceRequest, updateServiceRequestStatus, updateLiaisonBookingStatus, cancelBooking, bookingIdParam, isRentalParam, isDriverParam, services, serviceNames, amountToPay, total]);

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
            const isSandbox = db?.settings?.hitpaySandboxMode === true;
            const hitPay = HitPayService.fromSettings(db?.settings, isSandbox);

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
            const purpose = isDeposit
                ? `RidersBUD — 50% Initial DP (Booking #${booking.id.slice(-6).toUpperCase()})`
                : `RidersBUD — 50% Balance Settlement (Booking #${booking.id.slice(-6).toUpperCase()})`;
            const refNumber = `BOK-${booking.id}-${isDeposit ? 'DP' : 'BAL'}-${Date.now()}`;

            // Create official HitPay payment request directly (Sandbox or Live based on settings)
            const { url } = await hitPay.createPaymentRequest({
                amount: amountToPay,
                currency: db?.settings?.currency || 'PHP',
                reference_number: refNumber,
                webhook: 'https://ridersbud-10806.web.app/payment/webhook',
                redirect_url: returnUrl,
                email: user.email || 'customer@ridersbud.com',
                name: user.name || 'Valued Customer',
                phone: user.phone || '09171234567',
                purpose: purpose
            });

            if (url && (url.startsWith('https://') || url.startsWith('http://'))) {
                await openPaymentUrl(url);
                return;
            }

            if (url && url.startsWith('/')) {
                navigate(url);
                return;
            }

            throw new Error("Unable to obtain payment gateway URL.");
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unexpected error occurred.");
            setIsProcessing(false);
            sessionStorage.removeItem('pendingHitPayServiceTx');
        }
    };

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
                    {isProcessing ? <Spinner size="sm" /> : (selectedMethod === 'Manual GCash' || selectedMethod === 'GCash') ? `Proceed with GCash` : `Pay with HitPay`}
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
                        const isFullyPaid = newPaidAmount >= (total - 0.5);
                        const newPaymentStatus = isFullyPaid ? 'paid' : 'partial';

                        if (booking.isRental && updateRentalBooking) {
                            await updateRentalBooking(booking.id, {
                                paidAmount: newPaidAmount,
                                paymentStatus: newPaymentStatus,
                                isPaid: isFullyPaid,
                                isVerified: true,
                                paymentMethod: 'Manual GCash',
                                status: 'Confirmed',
                                ...(isFullyPaid ? {
                                    balancePaid: true,
                                    balancePaidAt: new Date().toISOString()
                                } : {
                                    downpaymentAmount: amountToPay,
                                    downpaymentPaidAt: new Date().toISOString()
                                })
                            });
                        } else if ((booking.isDriver || booking.isDriverHire || booking.isServiceRequest) && updateServiceRequest) {
                            await updateServiceRequest(booking.id, {
                                paidAmount: newPaidAmount,
                                paymentStatus: newPaymentStatus,
                                isPaid: isFullyPaid,
                                isVerified: true,
                                paymentMethod: 'Manual GCash',
                                status: 'Confirmed',
                                ...(isFullyPaid ? {
                                    balancePaid: true,
                                    balancePaidAt: new Date().toISOString()
                                } : {
                                    downpaymentAmount: amountToPay,
                                    downpaymentPaidAt: new Date().toISOString()
                                })
                            });
                        }

                        const updatedBooking = {
                            ...booking,
                            totalAmount: total,
                            paidAmount: newPaidAmount,
                            paymentStatus: newPaymentStatus,
                            isPaid: isFullyPaid,
                            isVerified: true,
                            paymentMethod: 'Manual GCash',
                            isRental: booking.isRental,
                            isLiaison: booking.isLiaison || isLiaisonParam,
                            status: booking.isRental ? 'Confirmed' : booking.status,
                            ...(isFullyPaid ? {
                                balancePaid: true,
                                balancePaidAt: new Date().toISOString(),
                                remainingBalance: 0
                            } : {
                                downpaymentAmount: amountToPay,
                                downpaymentPaidAt: new Date().toISOString(),
                                remainingBalance: Math.max(0, total - newPaidAmount)
                            })
                        };
                        navigate('/customer-portal/service-payment-confirmation', { state: { booking: updatedBooking }, replace: true });
                    }}
                    onClose={() => setShowGCashModal(false)}
                />
            )}

            {/* In-App HitPay Payment Sheet */}
            {inAppModalUrl && booking && (
                <HitPayInAppModal
                    isOpen={Boolean(inAppModalUrl)}
                    checkoutUrl={inAppModalUrl}
                    title={isDeposit ? "Pay Deposit (50%)" : "Pay Remaining Balance"}
                    amount={amountToPay}
                    onClose={() => setInAppModalUrl(null)}
                    onSuccess={(details) => {
                        setInAppModalUrl(null);
                        const isRental = booking?.isRental || isRentalParam;
                        const isDriver = booking?.isDriver || (booking as any)?.isDriverHire || isDriverParam;
                        const isLiaison = booking?.isLiaison || isLiaisonParam;
                        const isServiceReq = booking?.isServiceRequest || isDriver;

                        processBookingPaymentSuccess({
                            targetBookingId: booking.id,
                            amount: amountToPay,
                            totalAmount: total,
                            currentPaid: paid,
                            fullBooking: booking,
                            isRentalBooking: Boolean(isRental),
                            isLiaisonBooking: Boolean(isLiaison),
                            isDriverBooking: Boolean(isDriver),
                            isServiceReqBooking: Boolean(isServiceReq),
                            hitpayRef: details.reference || `HITPAY-${Date.now()}`,
                            requestId: details.paymentRequestId || ''
                        });
                    }}
                    onCancel={() => {
                        setInAppModalUrl(null);
                    }}
                />
            )}
        </div>
    );
};

export default ServicePaymentScreen;
