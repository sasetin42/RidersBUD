import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import CustomerHeader from '../components/CustomerHeader';
import { CreditCard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDatabase } from '../context/DatabaseContext';
import Spinner from '../components/Spinner';
import { Booking } from '../types';

import { HitPayService, getLiveAppOrigin } from '../services/HitPayService';
import { HitPayEmbeddedService } from '../services/HitPayEmbeddedService';
import GCashPaymentModal from '../components/GCashPaymentModal';
import PaymentVerificationOverlay from '../components/PaymentVerificationOverlay';
import { resumePendingPaymentVerification, isNativePlatform as isNative, openPaymentUrl, getPendingPaymentMarker, PaymentEntityKind } from '../utils/paymentRedirect';
import { fetchPaymentEntitySnapshot } from '../utils/paymentReturn';
import { doc, updateDoc } from 'firebase/firestore';
import { db as firestore } from '../firebase';

/** Resolve the Firestore entity kind for a booking-like record. */
const entityKindForBooking = (b: any): PaymentEntityKind =>
    b?.isRental ? 'rental'
        : b?.isLiaison ? 'liaison'
            : (b?.isServiceRequest || b?.isDriver || b?.isDriverHire) ? 'service-request'
                : 'booking';

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
    // HitPay return → webhook-driven verification overlay (never trusted from redirect params)
    const [paymentReturnTarget, setPaymentReturnTarget] = useState<{
        entityKind: PaymentEntityKind;
        entityId: string;
        paymentRequestId?: string;
    } | null>(null);
    const [selectedMethod, setSelectedMethod] = useState('');
    const [cardDetails, setCardDetails] = useState({ number: '', expiry: '', cvc: '' });
    const [cardErrors, setCardErrors] = useState<{ [key: string]: string }>({});
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingStage, setProcessingStage] = useState('Connecting to HitPay...');
    const [error, setError] = useState('');

    const finalizeRun = React.useRef(false);
    // Stash filled by finalizeVerifiedPayment (post-webhook), consumed on overlay Close
    const verifiedReturnRef = React.useRef<{ entityKind: PaymentEntityKind; entityId: string; mergedBooking: any } | null>(null);
    const prewarmedSessionRef = React.useRef<{
        bookingId: string;
        amount: number;
        promise: Promise<{ url: string; id: string }>;
        readyResult?: { url: string; id: string };
    } | null>(null);

    // Automatic pre-warm removed: payment requests are created strictly on user payment intent.

    /**
     * Runs ONLY after the webhook's authoritative Firestore write is observed
     * (requirement #8): refreshes the record, applies lifecycle-only status
     * transitions, and stashes the confirmation payload for navigation.
     */
    const finalizeVerifiedPayment = async (entityKind: PaymentEntityKind, targetBookingId: string) => {
        try {
            const auth = await fetchPaymentEntitySnapshot(entityKind, targetBookingId);
            const paid = String(auth?.paymentStatus || '').toLowerCase() === 'paid';

            // Lifecycle-only updates — payment fields were written by the webhook.
            try {
                if (entityKind === 'rental' && updateRentalBooking) {
                    await updateRentalBooking(targetBookingId, { status: paid ? 'Completed' : 'Confirmed' } as any);
                } else if (entityKind === 'liaison' && updateLiaisonBooking) {
                    await updateLiaisonBooking(targetBookingId, { status: paid ? 'Completed' : 'Booking Received' } as any);
                } else if (entityKind === 'service-request' && updateServiceRequest) {
                    await updateServiceRequest(targetBookingId, { status: paid ? 'Completed' : 'Confirmed' } as any);
                } else if (entityKind === 'booking' && auth && !paid && auth.status === 'Pending') {
                    await updateDoc(doc(firestore, 'bookings', targetBookingId), { status: 'Upcoming' });
                }
            } catch (_) {
                // webhook data already authoritative — navigation still proceeds
            }

            sessionStorage.removeItem('pendingHitPayServiceTx');
            sessionStorage.removeItem('pendingHitPayBookingTx');
            window.history.replaceState({}, document.title, window.location.pathname);

            verifiedReturnRef.current = {
                entityKind,
                entityId: targetBookingId,
                mergedBooking: { ...(booking as any), ...(auth || {}) }
            };
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
                const fullBooking = sessionData?.fullBooking || booking;
                const requestId = queryParams.get('payment_request_id') || '';

                // The redirect is NOT proof of payment — the verification overlay
                // waits for the webhook's authoritative Firestore write (requirement #8).
                sessionStorage.removeItem('pendingHitPayServiceTx');
                setPaymentReturnTarget({
                    entityKind: entityKindForBooking(fullBooking || booking),
                    entityId: targetBookingId,
                    paymentRequestId: requestId || undefined
                });
                return;
            }
        } else if ((status === 'canceled' || status === 'cancelled' || status === 'failed' || status === 'expired' || status === 'abort') && !isProcessing) {
            // URL parameters are NOT proof of anything: only react to cancellation
            // when this app session actually started the payment (forged deep links no-op).
            const pendingTx = sessionStorage.getItem('pendingHitPayServiceTx');
            if (!pendingTx && !getPendingPaymentMarker()) return;
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

    // Verification overlay element (webhook-driven) — rendered in both return trees
    const overlayEl = paymentReturnTarget ? (
        <PaymentVerificationOverlay
            isOpen={true}
            entityKind={paymentReturnTarget.entityKind}
            entityId={paymentReturnTarget.entityId}
            paymentRequestId={paymentReturnTarget.paymentRequestId}
            isSandbox={db?.settings?.hitpaySandboxMode === true}
            amount={amountToPay}
            onVerified={() => {
                finalizeVerifiedPayment(paymentReturnTarget.entityKind, paymentReturnTarget.entityId);
            }}
            onClose={() => {
                const verified = verifiedReturnRef.current;
                verifiedReturnRef.current = null;
                setPaymentReturnTarget(null);
                setIsProcessing(false);
                setProcessingStage('');
                if (verified?.mergedBooking) {
                    navigate('/customer-portal/service-payment-confirmation', {
                        state: { booking: verified.mergedBooking },
                        replace: true
                    });
                }
            }}
        />
    ) : null;

    if (isProcessing) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-secondary space-y-4 px-4 text-center">
                {overlayEl}
                <Spinner size="lg" />
                <p className="text-white font-bold text-base tracking-wide animate-pulse">{processingStage || 'Processing payment...'}</p>
                <p className="text-emerald-300 text-xs font-bold tracking-wide">Secure HitPay Payment</p>
                <p className="text-gray-400 text-xs">You are securely completing your payment with HitPay.</p>
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
        setProcessingStage('Connecting to HitPay Gateway...');
        setError('');

        try {
            const isSandbox = db?.settings?.hitpaySandboxMode === true;

            // Save state before session
            sessionStorage.setItem('pendingHitPayServiceTx', JSON.stringify({
                bookingId: booking.id,
                amount: amountToPay,
                totalAmount: total,
                currentPaid: paid,
                fullBooking: booking,
                isRental: booking.isRental
            }));

            const purpose = isDeposit
                ? `RidersBUD — 50% Initial DP (Booking #${booking.id.slice(-6).toUpperCase()})`
                : `RidersBUD — 50% Balance Settlement (Booking #${booking.id.slice(-6).toUpperCase()})`;
            const refNumber = `BOK-${booking.id}-${isDeposit ? 'DP' : 'BAL'}`;

            const entityKind = entityKindForBooking(booking);

            const prewarmed = (prewarmedSessionRef.current?.readyResult?.url && prewarmedSessionRef.current?.bookingId === booking.id)
                ? prewarmedSessionRef.current.readyResult
                : null;

            const checkoutResult = await HitPayEmbeddedService.startCheckout({
                entityKind,
                entityId: booking.id,
                amount: amountToPay,
                currency: db?.settings?.currency || 'PHP',
                referenceNumber: refNumber,
                purpose,
                customerEmail: user.email || 'customer@ridersbud.com',
                customerName: user.name || 'Valued Customer',
                customerPhone: user.phone || '09171234567',
                returnRoute: `${window.location.pathname}?bookingId=${booking.id}`,
                isSandbox,
                settings: db?.settings,
                prewarmedSession: prewarmed,
                onStateChange: (state, msg) => {
                    if (msg) setProcessingStage(msg);
                }
            });

            if (checkoutResult.redirected) {
                // User is inside the native payment container or redirecting on web.
                // Do not open PaymentVerificationOverlay; return coordinator handles post-payment return.
                //
                // Reset processing state before yielding: on a gateway
                // cancellation/back the return coordinator brings the customer
                // straight back to this same mounted screen, where a stale
                // `isProcessing` + stage text would disable the Pay button
                // permanently (dead end).
                setIsProcessing(false);
                setProcessingStage('');
                return;
            }

            if (checkoutResult.paymentState === 'PAID') {
                setPaymentReturnTarget({
                    entityKind,
                    entityId: booking.id,
                    paymentRequestId: checkoutResult.paymentRequestId || undefined
                });
                setIsProcessing(false);
                setProcessingStage('');
                return;
            } else if (checkoutResult.paymentState === 'CANCELLED') {
                setIsProcessing(false);
                setProcessingStage('');
                sessionStorage.removeItem('pendingHitPayServiceTx');
                return;
            } else if (!checkoutResult.success) {
                throw new Error(checkoutResult.errorMessage || "Payment could not be completed.");
            }
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

            {/* Webhook-driven payment verification overlay (opened on HitPay return
                or after the in-app drop-in reports success) */}
            {overlayEl}
        </div>
    );
};

export default ServicePaymentScreen;
