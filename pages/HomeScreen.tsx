
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MarketingBanner from '../components/MarketingBanner';
import { useAuth } from '../context/AuthContext';
import { useDatabase } from '../context/DatabaseContext';
import { useNotification } from '../context/NotificationContext';
import CustomerHeader from '../components/CustomerHeader';
import { 
    Car, Calendar, FileText, Heart, ChevronRight, Wrench, Search, Bell, Settings, LogOut, 
    User, Phone, MessageSquare, MapPin, Star, Package, Activity, X, UserCheck, Truck, 
    Layers, Clock, ShieldCheck, CheckCircle2, AlertCircle, ShoppingBag, Eye, Navigation, 
    ArrowRight, Check, Sparkles, ExternalLink, KeyRound, AlertOctagon, Trash2,
    Copy, Receipt, CreditCard, Mail, Info, Award, Compass, CheckCircle, Shield
} from 'lucide-react';
import Spinner from '../components/Spinner';
import NotificationBell from '../components/NotificationBell';
import { MOCKUPS, getProfileImage } from '../utils/imageConstants';
import { getFallbackImageForCategory, normalizeServiceImage } from '../utils/fallbackImages';
import { seedServices } from '../data/mockData';
import Tooltip from '../components/ui/Tooltip';
import { CancellationDetailsModal, CancellationData } from '../components/CancellationDetailsModal';
import { useLocation } from 'react-router-dom';
import LiveRouteMapModal from '../components/LiveRouteMapModal';
import { geocodeAddressOrCity, resolveOrderTrackingLocations } from '../utils/locationHelper';
import { HitPayService } from '../services/HitPayService';
import { startPaymentWatcher, openPaymentUrl, setPendingPaymentMarker, resumePendingPaymentVerification, isNativePlatform as isNative, PaymentEntityKind } from '../utils/paymentRedirect';
import GCashPaymentModal from '../components/GCashPaymentModal';
import { doc, updateDoc } from 'firebase/firestore';
import { db as firestore } from '../firebase';

const BookingImage: React.FC<{ src?: string; alt?: string; type?: string }> = ({ src, alt, type }) => {
    const [error, setError] = useState(false);
    useEffect(() => {
        setError(false);
    }, [src]);

    if (error || !src) {
        return (
            <div className="w-full h-full bg-[#1e1e20] flex items-center justify-center">
                {type === 'rental' ? (
                    <Car className="w-6 h-6 text-blue-400/80" />
                ) : type === 'driver' ? (
                    <UserCheck className="w-6 h-6 text-emerald-400/80" />
                ) : type === 'towing' ? (
                    <Truck className="w-6 h-6 text-rose-400/80" />
                ) : type === 'liaison' ? (
                    <FileText className="w-6 h-6 text-purple-400/80" />
                ) : type === 'order' ? (
                    <Package className="w-6 h-6 text-cyan-400/80" />
                ) : (
                    <Wrench className="w-6 h-6 text-primary/80" />
                )}
            </div>
        );
    }
    return (
        <img
            src={src}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setError(true)}
        />
    );
};

const HomeScreen: React.FC = () => {
    const { user, logout } = useAuth();
    const { 
        db, 
        loading, 
        cancelBooking, 
        deleteBooking,
        updateBookingPayment,
        updateRentalBooking, 
        deleteRentalBooking,
        updateServiceRequest,
        updateServiceRequestStatus, 
        deleteServiceRequest,
        updateLiaisonBooking,
        updateLiaisonBookingStatus, 
        deleteLiaisonBooking,
        updateOrderStatus,
        deleteOrder
    } = useDatabase();
    const { addNotification } = useNotification();
    const navigate = useNavigate();
    const location = useLocation();
    const accentColor = db?.settings?.accentColor || '#FE7803';
    const [searchQuery, setSearchQuery] = useState('');
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [searchResults, setSearchResults] = useState<{
        services: any[];
        products: any[];
        tools: any[];
    }>({ services: [], products: [], tools: [] });
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);
    const [bookingToCancel, setBookingToCancel] = useState<any | null>(null);
    const [isCancelling, setIsCancelling] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [transactionToRemove, setTransactionToRemove] = useState<any | null>(null);
    const [isRemoving, setIsRemoving] = useState(false);
    const [dismissedTransactionIds, setDismissedTransactionIds] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('ridersbud_dismissed_transactions');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });
    const [selectedDetailsBooking, setSelectedDetailsBooking] = useState<any | null>(null);
    const [isCopiedRef, setIsCopiedRef] = useState(false);
    const [viewingDocumentUrl, setViewingDocumentUrl] = useState<string | null>(null);
    const [viewingDocumentName, setViewingDocumentName] = useState<string>('');
    const [cancelledData, setCancelledData] = useState<CancellationData | null>(null);
    const [activeTransactionTab, setActiveTransactionTab] = useState<'all' | 'maintenance' | 'rental' | 'driver' | 'liaison' | 'towing' | 'order'>('all');
    const [activeOrderForTracking, setActiveOrderForTracking] = useState<any | null>(null);
    const [balanceBookingForModal, setBalanceBookingForModal] = useState<any | null>(null);
    const [isInitiatingHitPayBalance, setIsInitiatingHitPayBalance] = useState(false);
    const [showBalanceGCashModal, setShowBalanceGCashModal] = useState(false);

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

    const popularServices = useMemo(() => {
        const targetKeys = [
            { query: 'diagnost', defaultName: 'Engine Diagnostics', id: '14', price: 1200, category: 'Diagnostics', imageUrl: 'https://images.unsplash.com/photo-1530046339160-ce3e530c7d2f?q=80&w=800&auto=format&fit=crop' },
            { query: 'pms', altQuery: 'periodic', defaultName: 'PMS', id: 'pms', price: 3500, category: 'Maintenance', imageUrl: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?q=80&w=800&auto=format&fit=crop' },
            { query: 'tune', defaultName: 'Engine Tune-Up', id: '13', price: 2800, category: 'Maintenance', imageUrl: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=800&auto=format&fit=crop' },
            { query: 'body', defaultName: 'Body Repair', id: '4', price: 2500, category: 'Repair', imageUrl: 'https://images.unsplash.com/photo-1601362840469-51e4d8d58785?q=80&w=800&auto=format&fit=crop' },
            { query: 'oil', defaultName: 'Change Oil', id: '1', price: 2500, category: 'Maintenance', imageUrl: 'https://images.unsplash.com/photo-1599540679758-00d86bd4fa9a?q=80&w=800&auto=format&fit=crop' },
            { query: 'aircon', altQuery: 'conditioning', defaultName: 'Aircon', id: '5', price: 1800, category: 'Maintenance', imageUrl: 'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?q=80&w=800&auto=format&fit=crop' },
        ];

        const allServices = (db?.services && db.services.length > 0) ? db.services : seedServices;

        return targetKeys.map(target => {
            const matched = allServices.find(s => {
                const nameLower = (s.name || '').toLowerCase();
                return nameLower.includes(target.query) || (target.altQuery && nameLower.includes(target.altQuery));
            });
            if (matched) return matched;
            return {
                id: target.id,
                name: target.defaultName,
                description: `${target.defaultName} service for your vehicle.`,
                price: target.price,
                estimatedTime: '1-2 hours',
                imageUrl: target.imageUrl,
                category: target.category,
                icon: ''
            };
        });
    }, [db?.services]);

    // Auto-detect and show Cancellation Details Modal if redirected after gateway cancellation
    useEffect(() => {
        const locationState = location.state as { cancelledTransaction?: CancellationData } | null;
        if (locationState?.cancelledTransaction) {
            setCancelledData(locationState.cancelledTransaction);
            // Clear history state so modal doesn't re-open on page refresh
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        // Auto-detect newly placed Driver for Hire booking and celebrate / notify
        const searchParams = new URLSearchParams(window.location.search);
        if (searchParams.get('bookedService') === 'driver') {
            const ref = searchParams.get('ref') || '';
            setActiveTransactionTab('driver');
            addNotification({
                recipientId: user?.id || 'all',
                recipientRole: 'customer',
                title: '🚗 Driver for Hire Request Confirmed',
                message: `Your booking request #${ref ? ref.slice(-6).toUpperCase() : 'DRV'} has been received and is pending admin dispatch!`,
                type: 'info'
            });
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        // Monitor for HitPay return redirect directly on HomeScreen for Rental, Liaison & Driver Balance settlement
        const gatewayStatus = searchParams.get('status') || searchParams.get('hitpay');
        const isRentalReturn = searchParams.get('isRental') === 'true' || searchParams.get('rental') === 'true';
        const isLiaisonReturn = searchParams.get('isLiaison') === 'true' || searchParams.get('liaison') === 'true';
        const isDriverReturn = searchParams.get('isDriver') === 'true' || searchParams.get('driver') === 'true';
        const targetBookingId = searchParams.get('bookingId') || searchParams.get('rentalId') || searchParams.get('liaisonId') || searchParams.get('driverId');

        if ((gatewayStatus === 'completed' || gatewayStatus === 'success') && targetBookingId && isRentalReturn) {
            const hitpayRef = searchParams.get('reference') || searchParams.get('payment_request_id') || `HITPAY-BAL-${Date.now()}`;
            const reqId = searchParams.get('payment_request_id') || '';

            const rental = db?.rentalBookings?.find(r => r.id === targetBookingId || r.id?.toLowerCase() === targetBookingId.toLowerCase());
            if (rental && !rental.isPaid && updateRentalBooking) {
                const totalAmt = rental.totalPrice || 0;
                updateRentalBooking(rental.id, {
                    isPaid: true,
                    isVerified: true,
                    paidAmount: totalAmt,
                    remainingBalance: 0,
                    balanceAmount: 0,
                    paymentStatus: 'paid',
                    balancePaid: true,
                    balancePaymentRef: hitpayRef,
                    balancePaidAt: new Date().toISOString(),
                    hitpayPaymentRequestId: reqId,
                    hitpayReference: hitpayRef,
                    hitpayStatus: 'completed',
                    paymentMethod: 'HitPay (Online)',
                    status: 'Completed'
                }).then(() => {
                    addNotification({
                        recipientId: user?.id || 'all',
                        recipientRole: 'customer',
                        title: '✅ Rental Balance Settled',
                        message: `Remaining balance for ${rental.carName || 'Rental Vehicle'} has been fully settled via HitPay online payment!`,
                        type: 'info'
                    });
                }).catch(console.error);

                sessionStorage.removeItem('pendingHitPayServiceTx');
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }

        if ((gatewayStatus === 'completed' || gatewayStatus === 'success') && targetBookingId && isLiaisonReturn) {
            const hitpayRef = searchParams.get('reference') || searchParams.get('payment_request_id') || `HITPAY-LIA-BAL-${Date.now()}`;
            const reqId = searchParams.get('payment_request_id') || '';

            const liaison = db?.liaisonBookings?.find(l => l.id === targetBookingId || l.id?.toLowerCase() === targetBookingId.toLowerCase());
            if (liaison && !liaison.balancePaid && updateLiaisonBooking) {
                const totalAmt = liaison.fees?.total || liaison.totalAmount || 0;
                updateLiaisonBooking(liaison.id, {
                    isPaid: true,
                    isVerified: true,
                    paidAmount: totalAmt,
                    remainingBalance: 0,
                    paymentStatus: 'paid',
                    balancePaid: true,
                    balancePaymentRef: hitpayRef,
                    balancePaidAt: new Date().toISOString(),
                    hitpayPaymentRequestId: reqId,
                    hitpayReference: hitpayRef,
                    hitpayStatus: 'completed',
                    paymentMethod: 'HitPay (Online)',
                    status: 'Completed'
                } as any).then(() => {
                    addNotification({
                        recipientId: user?.id || 'all',
                        recipientRole: 'customer',
                        title: '✅ Liaison Balance Settled',
                        message: `Remaining balance for LTO Liaison (${liaison.serviceType || 'Registration'}) has been fully settled via HitPay online payment!`,
                        type: 'info'
                    });
                }).catch(console.error);

                sessionStorage.removeItem('pendingHitPayServiceTx');
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }

        if ((gatewayStatus === 'completed' || gatewayStatus === 'success') && targetBookingId && isDriverReturn) {
            const hitpayRef = searchParams.get('reference') || searchParams.get('payment_request_id') || `HITPAY-DRV-BAL-${Date.now()}`;
            const reqId = searchParams.get('payment_request_id') || '';

            const driverReq = db?.serviceRequests?.find(s => s.id === targetBookingId || s.id?.toLowerCase() === targetBookingId.toLowerCase());
            if (driverReq && !driverReq.isPaid && updateServiceRequest) {
                const totalAmt = driverReq.totalAmount || driverReq.price || 0;
                updateServiceRequest(driverReq.id, {
                    isPaid: true,
                    isVerified: true,
                    paidAmount: totalAmt,
                    remainingBalance: 0,
                    paymentStatus: 'paid',
                    balancePaid: true,
                    balancePaymentRef: hitpayRef,
                    balancePaidAt: new Date().toISOString(),
                    hitpayPaymentRequestId: reqId,
                    hitpayReference: hitpayRef,
                    hitpayStatus: 'completed',
                    paymentMethod: 'HitPay (Online)',
                    status: 'Completed'
                } as any).then(() => {
                    addNotification({
                        recipientId: user?.id || 'all',
                        recipientRole: 'customer',
                        title: '✅ Driver Service Balance Settled',
                        message: `Remaining balance for Driver for Hire has been fully settled via HitPay online payment!`,
                        type: 'info'
                    });
                }).catch(console.error);

                sessionStorage.removeItem('pendingHitPayServiceTx');
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }

        // Standard Mechanic / Maintenance Booking Return
        if ((gatewayStatus === 'completed' || gatewayStatus === 'success') && targetBookingId && !isRentalReturn && !isLiaisonReturn && !isDriverReturn) {
            const hitpayRef = searchParams.get('reference') || searchParams.get('payment_request_id') || `HITPAY-BAL-${Date.now()}`;
            const reqId = searchParams.get('payment_request_id') || '';

            const booking = db?.bookings?.find(b => b.id === targetBookingId || b.id?.toLowerCase() === targetBookingId.toLowerCase());
            if (booking && !booking.isPaid) {
                const totalAmt = booking.totalAmount || booking.service?.price || 0;
                const addCosts = (booking.additionalCosts || []).reduce((sum: number, c: any) => sum + (Number(c.price) || 0), 0);
                const fullTotal = totalAmt + addCosts;
                const initialDp = booking.downpaymentAmount ? Number(booking.downpaymentAmount) : (totalAmt * 0.5);
                const balanceAmt = Math.max(0, fullTotal - initialDp);

                const servicePayload: any = {
                    isPaid: true,
                    isVerified: true,
                    paidAmount: fullTotal,
                    downpaymentAmount: initialDp,
                    balanceAmount: balanceAmt,
                    remainingBalance: 0,
                    paymentStatus: 'paid',
                    balancePaid: true,
                    balancePaymentRef: hitpayRef,
                    balancePaidAt: new Date().toISOString(),
                    hitpayPaymentRequestId: reqId,
                    hitpayReference: hitpayRef,
                    hitpayStatus: 'completed',
                    status: 'Completed'
                };

                const finishServiceReturn = () => {
                    addNotification({
                        recipientId: user?.id || 'all',
                        recipientRole: 'customer',
                        title: '✅ Service Balance Settled',
                        message: `Remaining balance for #${targetBookingId.slice(-6).toUpperCase()} has been settled via HitPay online payment!`,
                        type: 'info'
                    });
                    sessionStorage.removeItem('pendingHitPayServiceTx');
                    window.history.replaceState({}, document.title, window.location.pathname);
                };

                if (updateBookingPayment) {
                    updateBookingPayment(targetBookingId, balanceAmt, 'paid', servicePayload)
                        .then(finishServiceReturn)
                        .catch(async () => {
                            try {
                                await updateDoc(doc(firestore, 'bookings', targetBookingId), servicePayload);
                            } catch (_) {}
                            finishServiceReturn();
                        });
                } else {
                    updateDoc(doc(firestore, 'bookings', targetBookingId), servicePayload)
                        .then(finishServiceReturn)
                        .catch(finishServiceReturn);
                }
            }
        }
    }, [location.state, location.search, db?.bookings, db?.rentalBookings, db?.liaisonBookings, db?.serviceRequests, updateBookingPayment, updateRentalBooking, updateLiaisonBooking, updateServiceRequest, user?.id]);

    const handleInitiateHitPayBalance = async (targetTx: any) => {
        if (!targetTx || !user) return;
        try {
            setIsInitiatingHitPayBalance(true);
            const total = Number(targetTx.totalAmount) || 0;
            const paid = Number(targetTx.paidAmount) || Number(targetTx.downpaymentAmount) || Math.round(total * 0.5);
            const balanceDue = targetTx.remainingBalance !== undefined && targetTx.remainingBalance > 0
                ? targetTx.remainingBalance
                : Math.max(0, total - paid);

            const isRental = targetTx.type === 'rental';
            const isLiaison = targetTx.type === 'liaison';
            const isDriver = targetTx.type === 'driver';

            const isHitPayActive = HitPayService.isGatewayActive(db?.settings);
            if (!isHitPayActive) {
                // Fallback to service payment screen
                navigate(`/customer-portal/service-payment?bookingId=${targetTx.id}${isRental ? '&isRental=true' : ''}${isLiaison ? '&isLiaison=true' : ''}${isDriver ? '&isDriver=true' : ''}`);
                return;
            }

            const hitPay = HitPayService.fromSettings(db?.settings);
            const returnUrl = `${window.location.origin}/customer-portal/?bookingId=${targetTx.id}${isRental ? '&isRental=true' : ''}${isLiaison ? '&isLiaison=true' : ''}${isDriver ? '&isDriver=true' : ''}&status=completed`;
            const appTitle = db?.settings?.appName || 'RidersBUD';

            sessionStorage.setItem('pendingHitPayServiceTx', JSON.stringify({
                bookingId: targetTx.id,
                amount: balanceDue,
                totalAmount: total,
                currentPaid: paid,
                fullBooking: targetTx.rawBooking || targetTx,
                isRental,
                isLiaison,
                isDriver
            }));

            const purposeText = isRental
                ? `${appTitle} — Car Rental Balance Settlement (#${targetTx.id.slice(-6).toUpperCase()})`
                : isLiaison
                ? `${appTitle} — LTO Liaison Balance Settlement (#${targetTx.id.slice(-6).toUpperCase()})`
                : `${appTitle} — Driver for Hire Balance Settlement (#${targetTx.id.slice(-6).toUpperCase()})`;

            const refPrefix = isRental ? 'RNT' : isLiaison ? 'LIA' : 'DRV';

            const { url } = await hitPay.createPaymentRequest({
                amount: balanceDue,
                currency: db?.settings?.currency || 'PHP',
                reference_number: `${refPrefix}-${targetTx.id}-BAL-${Date.now()}`,
                webhook: 'https://ridersbud-10806.web.app/payment/webhook',
                redirect_url: returnUrl,
                email: user.email || 'customer@example.com',
                name: user.name || 'Customer',
                purpose: purposeText
            });

            if (url.startsWith('/')) {
                navigate(url);
            } else {
                const balKind: PaymentEntityKind = isRental ? 'rental' : isLiaison ? 'liaison' : isDriver ? 'service-request' : 'booking';
                setPendingPaymentMarker({
                    entityKind: balKind,
                    entityId: targetTx.id,
                    returnRoute: `/customer-portal/`,
                    startedAt: Date.now(),
                    purpose: 'balance-settlement'
                });
                startPaymentWatcher(balKind, targetTx.id, `/customer-portal/`);
                openPaymentUrl(url);
            }
        } catch (err) {
            console.error("Failed to initiate HitPay for balance, navigating to service payment screen:", err);
            const isRental = targetTx.type === 'rental';
            const isLiaison = targetTx.type === 'liaison';
            const isDriver = targetTx.type === 'driver';
            navigate(`/customer-portal/service-payment?bookingId=${targetTx.id}${isRental ? '&isRental=true' : ''}${isLiaison ? '&isLiaison=true' : ''}${isDriver ? '&isDriver=true' : ''}`);
        } finally {
            setIsInitiatingHitPayBalance(false);
        }
    };

    const handleCancelBooking = async (tx: any) => {
        if (!tx || !cancelReason.trim()) return;
        // Guard: Prevent re-cancelling an already cancelled service
        if (tx.isCancelled || tx.status === 'Cancelled' || tx.status === 'CANCELLED' || tx.status === 'Rejected') {
            console.warn(`Transaction #${tx.refCode} is already cancelled.`);
            setBookingToCancel(null);
            return;
        }
        setIsCancelling(true);
        const reason = cancelReason.trim();

        try {
            if (tx.type === 'maintenance') {
                await cancelBooking(tx.id, reason);
            } else if (tx.type === 'rental') {
                await updateRentalBooking(tx.id, { 
                    status: 'Cancelled', 
                    cancellationReason: reason,
                    updatedAt: new Date().toISOString()
                } as any);
                addNotification({
                    recipientId: 'admin',
                    recipientRole: 'admin',
                    title: '🚨 Rental Booking Cancelled',
                    message: `Car rental #${tx.refCode} for ${tx.title} was cancelled by ${user?.name || 'Customer'}. Reason: ${reason}`,
                    type: 'alert'
                });
                addNotification({
                    recipientId: user?.id || 'all',
                    recipientRole: 'customer',
                    title: '❌ Rental Reservation Cancelled',
                    message: `Your rental reservation for ${tx.title} has been cancelled.`,
                    type: 'info'
                });
            } else if (tx.type === 'driver' || tx.type === 'towing') {
                await updateServiceRequestStatus(tx.id, 'cancelled', reason);
                addNotification({
                    recipientId: 'admin',
                    recipientRole: 'admin',
                    title: `🚨 ${tx.typeLabel} Cancelled`,
                    message: `${tx.typeLabel} request #${tx.refCode} was cancelled by ${user?.name || 'Customer'}. Reason: ${reason}`,
                    type: 'alert'
                });
                addNotification({
                    recipientId: user?.id || 'all',
                    recipientRole: 'customer',
                    title: `❌ ${tx.typeLabel} Cancelled`,
                    message: `Your ${tx.typeLabel.toLowerCase()} request has been cancelled.`,
                    type: 'info'
                });
            } else if (tx.type === 'liaison') {
                await updateLiaisonBookingStatus(tx.id, 'cancelled', reason);
                addNotification({
                    recipientId: 'admin',
                    recipientRole: 'admin',
                    title: '🚨 LTO Liaison Booking Cancelled',
                    message: `LTO Liaison #${tx.refCode} (${tx.title}) was cancelled by ${user?.name || 'Customer'}. Reason: ${reason}`,
                    type: 'alert'
                });
                addNotification({
                    recipientId: user?.id || 'all',
                    recipientRole: 'customer',
                    title: '❌ Liaison Request Cancelled',
                    message: `Your LTO liaison appointment for ${tx.title} has been cancelled.`,
                    type: 'info'
                });
            } else if (tx.type === 'order') {
                await updateOrderStatus(tx.id, 'Cancelled');
                addNotification({
                    recipientId: 'admin',
                    recipientRole: 'admin',
                    title: '🚨 Store Order Cancelled',
                    message: `Order #${tx.refCode} was cancelled by ${user?.name || 'Customer'}. Reason: ${reason}`,
                    type: 'alert'
                });
                addNotification({
                    recipientId: user?.id || 'all',
                    recipientRole: 'customer',
                    title: '❌ Order Cancelled',
                    message: `Your parts order #${tx.refCode} has been cancelled.`,
                    type: 'info'
                });
            }

            setBookingToCancel(null);
            setCancelReason('');
        } catch (error) {
            console.error('Failed to cancel transaction:', error);
        } finally {
            setIsCancelling(false);
        }
    };

    const handleRemoveCancelledTransaction = async (tx: any) => {
        if (!tx || !tx.id) return;
        setIsRemoving(true);
        const targetId = String(tx.id);

        // 1. Immediately dismiss locally and persist to localStorage
        setDismissedTransactionIds(prev => {
            if (prev.includes(targetId)) return prev;
            const next = [...prev, targetId];
            try {
                localStorage.setItem('ridersbud_dismissed_transactions', JSON.stringify(next));
            } catch (e) {
                console.warn('Failed to save dismissed transaction to localStorage:', e);
            }
            return next;
        });

        // 2. Perform database and cloud deletion
        try {
            if (tx.type === 'maintenance') {
                await deleteBooking(targetId);
            } else if (tx.type === 'rental') {
                await deleteRentalBooking(targetId);
            } else if (tx.type === 'driver' || tx.type === 'towing') {
                await deleteServiceRequest(targetId);
            } else if (tx.type === 'liaison') {
                await deleteLiaisonBooking(targetId);
            } else if (tx.type === 'order') {
                await deleteOrder(targetId);
            }
        } catch (error) {
            console.error('Failed to remove cancelled transaction:', error);
        } finally {
            setIsRemoving(false);
            setTransactionToRemove(null);
        }
    };

    useEffect(() => {
        if (!searchQuery.trim() || !db) {
            setSearchResults({ services: [], products: [], tools: [] });
            setShowSearchDropdown(false);
            return;
        }

        const query = searchQuery.toLowerCase().trim();

        // 1. Filter Services
        const matchedServices = db.services.filter(s => 
            s.name.toLowerCase().includes(query) || 
            (s.description && s.description.toLowerCase().includes(query)) ||
            (s.category && s.category.toLowerCase().includes(query))
        ).slice(0, 5);

        // 2. Filter Parts/Products & Tools
        const matchedParts = db.parts.filter(p => 
            p.name.toLowerCase().includes(query) || 
            (p.description && p.description.toLowerCase().includes(query)) ||
            (p.brand && p.brand.toLowerCase().includes(query)) ||
            p.category.toLowerCase().includes(query)
        );

        // Classify parts into Products vs Tools
        const matchedTools = matchedParts.filter(p => 
            p.category.toLowerCase().includes('tool') || 
            p.category.toLowerCase().includes('equipment') ||
            p.name.toLowerCase().includes('tool') ||
            p.name.toLowerCase().includes('wrench') ||
            p.name.toLowerCase().includes('driver') ||
            p.name.toLowerCase().includes('pliers') ||
            p.name.toLowerCase().includes('kit')
        ).slice(0, 5);

        const matchedProducts = matchedParts.filter(p => 
            !matchedTools.some(t => t.id === p.id)
        ).slice(0, 5);

        setSearchResults({
            services: matchedServices,
            products: matchedProducts,
            tools: matchedTools
        });
        setShowSearchDropdown(true);
    }, [searchQuery, db]);

    const handleSearch = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && searchQuery.trim()) {
            navigate(`/customer-portal/services?q=${encodeURIComponent(searchQuery)}`);
            setShowSearchDropdown(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // User-matching helper for robust filtering across all transaction collections
    const isUserMatch = (record: any) => {
        if (!record || !user) return false;
        const uId = user.uid || user.id;
        if (record.customerId && uId && (record.customerId === uId || record.customerId === user.id || record.customerId === user.uid)) return true;
        if (record.userId && uId && (record.userId === uId || record.userId === user.id || record.userId === user.uid)) return true;
        if (record.customerEmail && user.email && record.customerEmail.toLowerCase() === user.email.toLowerCase()) return true;
        if (record.email && user.email && record.email.toLowerCase() === user.email.toLowerCase()) return true;
        if (record.customerPhone && user.phone && record.customerPhone.replace(/\D/g, '') === user.phone.replace(/\D/g, '')) return true;
        if (record.phone && user.phone && record.phone.replace(/\D/g, '') === user.phone.replace(/\D/g, '')) return true;
        if (record.customerName && user.name && record.customerName.trim().toLowerCase() === user.name.trim().toLowerCase()) return true;
        return false;
    };

    // Derived active booking for on-the-road mechanic service
    const activeBooking = db?.bookings?.find(b =>
        isUserMatch(b) &&
        ['En Route', 'In Progress', 'Mechanic Assigned'].includes(b.status)
    );

    // UNIFIED TRANSACTION AGGREGATOR (All 6 Streams)
    const allTransactions = React.useMemo(() => {
        const list: any[] = [];
        if (!user || !db) return list;

        // 1. Vehicle Service & Repair Bookings
        if (db.bookings && Array.isArray(db.bookings)) {
            db.bookings.filter(isUserMatch).forEach(b => {
                const mechanic = db?.mechanics?.find(m => m.id === b.mechanicId || m.id === b.mechanic?.id) || b.mechanic;
                const statusLower = (b.status || '').toString().trim().toLowerCase();
                const isOngoing = ['mechanic assigned', 'en route', 'in progress'].includes(statusLower);
                const isCompleted = ['completed', 'work done'].includes(statusLower);
                const isCancelled = ['cancelled', 'canceled', 'rejected', 'declined'].includes(statusLower);
                
                let statusBadgeColor = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
                if (isOngoing) statusBadgeColor = 'text-primary bg-primary/10 border-primary/30';
                else if (isCompleted) statusBadgeColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
                else if (isCancelled) statusBadgeColor = 'text-rose-400 bg-rose-500/10 border-rose-500/20';

                const dateStr = b.date ? (b.time ? `${b.date} · ${b.time}` : b.date) : (b.createdAt?.split('T')[0] || 'Scheduled');
                const parsedDate = b.date && b.time ? new Date(`${b.date.replace(/-/g, '/')} ${b.time}`) : new Date(b.createdAt || Date.now());

                const servicesList = Array.isArray(b.services) && b.services.length > 0 
                    ? b.services 
                    : (b.service ? [b.service] : (b.serviceName ? [{ name: b.serviceName, price: b.totalAmount || 0, category: b.category || 'Diagnostics' }] : []));

                const subtotal = servicesList.reduce((acc: number, s: any) => acc + (s.price || 0), 0) || (b.totalAmount || 0);
                const laborFee = b.laborFee || 0;
                const platformFee = b.platformFee || 0;
                const discount = b.discount || 0;

                list.push({
                    id: b.id,
                    type: 'maintenance',
                    typeLabel: 'Service Booking',
                    title: servicesList.map((s: any) => s.name).join(', ') || b.serviceName || b.service?.name || 'Vehicle Service',
                    refCode: `BK-${b.id.slice(-6).toUpperCase()}`,
                    status: b.status || 'Booking Confirmed',
                    statusBadgeColor,
                    isActive: isOngoing,
                    dateTimeStr: dateStr,
                    dateObj: isNaN(parsedDate.getTime()) ? new Date() : parsedDate,
                    detailsUrl: `/customer-portal/booking-detail/${b.id}`,
                    image: servicesList[0]?.imageUrl || b.service?.imageUrl || '',
                    category: servicesList[0]?.category || b.service?.category || 'General Repair',
                    vehicleDesc: b.vehicle ? `${b.vehicle.year || ''} ${b.vehicle.make || ''} ${b.vehicle.model || ''}`.trim() : 'Registered Vehicle',
                    plateNumber: b.vehicle?.plateNumber || b.plateNumber || '',
                    customerName: b.customerName || b.userName || user?.name || 'Customer',
                    customerPhone: b.customerPhone || b.phone || user?.phone || '',
                    customerEmail: b.customerEmail || b.email || user?.email || '',
                    pickupLocation: b.address || b.serviceLocation || b.pickupLocation || '',
                    notes: b.notes || b.additionalNotes || b.remarks || '',
                    servicesList,
                    specialistName: mechanic?.name || b.mechanicName,
                    specialistRole: mechanic?.specialty ? `Specialist: ${mechanic.specialty}` : 'Assigned Mechanic',
                    specialistPhone: mechanic?.phone || b.mechanicPhone,
                    specialistRating: mechanic?.rating || 4.9,
                    specialistImageUrl: mechanic?.imageUrl,
                    specialistIsOnline: mechanic?.isOnline !== false,
                    specialistExperience: mechanic?.experience || '5+ Years Certified',
                    specialistLocation: mechanic?.currentLocation || 'Manila Hub',
                    totalAmount: b.totalAmount || subtotal + laborFee + platformFee - discount,
                    downpaymentAmount: b.downpaymentAmount || b.paidAmount || (b.totalAmount ? b.totalAmount * 0.5 : (subtotal + laborFee + platformFee - discount) * 0.5),
                    paidAmount: b.paidAmount || 0,
                    subtotal,
                    laborFee,
                    platformFee,
                    discount,
                    paymentMethod: b.paymentMethod || 'HitPay / GCash',
                    paymentStatus: (() => {
                        const paidAmt = b.paidAmount || 0;
                        const totAmt = b.totalAmount || (subtotal + laborFee + platformFee - discount);
                        const isFullyPaid = (b.paymentStatus === 'paid' || b.isPaid) && (paidAmt >= totAmt || totAmt === 0);
                        if (isCancelled) return paidAmt > 0 ? 'Cancelled (DP Paid)' : 'Cancelled';
                        if (isFullyPaid) return 'Fully Paid';
                        if (b.paymentStatus === 'downpayment_paid' || b.paymentStatus === 'partial' || b.isVerified || paidAmt > 0) {
                            return '50% DP PAID';
                        }
                        return b.paymentStatus || 'Pending DP';
                    })(),
                    remainingBalance: isCancelled ? 0 : Math.max(0, (b.totalAmount || (subtotal + laborFee + platformFee - discount)) - (b.paidAmount || (b.paymentStatus === 'downpayment_paid' || b.paymentStatus === 'partial' || b.isVerified ? (b.downpaymentAmount || (b.totalAmount || (subtotal + laborFee + platformFee - discount)) * 0.5) : 0))),
                    isVerified: !isCancelled && !!b.isVerified,
                    isCancelable: !isCompleted && !isCancelled && !isOngoing,
                    isCancelled: isCancelled,
                    rawBooking: b
                });
            });
        }

        // 2. Rent a Car Bookings
        if (db.rentalBookings && Array.isArray(db.rentalBookings)) {
            db.rentalBookings.filter(isUserMatch).forEach(b => {
                const car = db?.rentalCars?.find(c => c.id === b.carId);
                const carBrand = car?.brand && car.brand !== 'undefined' ? car.brand : '';
                const carModel = car?.model && car.model !== 'undefined' ? car.model : (car?.name || b.carName || b.vehicleModel || 'Montero Sport');
                const carYear = car?.year && String(car.year) !== 'undefined' ? ` (${car.year})` : '';
                const carTitle = `${carBrand} ${carModel}${carYear}`.trim() || 'Rental Car Fleet';
                const statusLower = (b.status || '').toString().trim().toLowerCase();
                const isCompleted = ['completed', 'returned', 'done'].includes(statusLower);
                const isApproved = ['approved', 'active', 'in use', 'active rental'].includes(statusLower);
                const isCancelled = ['cancelled', 'canceled', 'rejected', 'declined'].includes(statusLower);

                let statusBadgeColor = 'text-blue-400 bg-blue-500/10 border-blue-500/20';
                if (statusLower === 'active rental' || statusLower === 'in use') {
                    statusBadgeColor = 'text-[#FE7803] bg-[#FE7803]/15 border-[#FE7803]/30 font-bold';
                } else if (isApproved) {
                    statusBadgeColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
                } else if (isCancelled) {
                    statusBadgeColor = 'text-rose-400 bg-rose-500/10 border-rose-500/20';
                }

                const dateStr = `${b.startDate || 'Start'} to ${b.endDate || 'End'}`;
                const parsedDate = b.startDate ? new Date(b.startDate.replace(/-/g, '/')) : new Date(b.createdAt || Date.now());
                const days = b.totalDays || 1;
                const dailyRate = car?.pricePerDay || 2500;
                const total = b.totalPrice || (dailyRate * days);

                const rawPaymentStatus = (b.paymentStatus || '').toString().trim().toLowerCase();
                const isPartialPayment = !isCancelled && (rawPaymentStatus === 'partial' || rawPaymentStatus === 'downpayment_paid' || rawPaymentStatus === '50% dp paid' || (!b.isPaid && (b.paidAmount || 0) > 0));
                const isFullyPaid = !isCancelled && ((b.isPaid === true || rawPaymentStatus === 'paid' || rawPaymentStatus === 'fully paid') && (b.paidAmount ? b.paidAmount >= total - 1 : true));

                const downpayment = b.downpaymentAmount || Math.round(total * 0.5);
                const paidAmt = isCancelled ? (b.paidAmount || 0) : (isFullyPaid ? total : (b.paidAmount || (isPartialPayment ? downpayment : 0)));
                const remainingBal = isCancelled ? 0 : Math.max(0, total - paidAmt);

                let formattedPaymentStatus = 'Pending Payment';
                if (isCancelled) {
                    formattedPaymentStatus = paidAmt > 0 ? 'Cancelled (DP Paid)' : 'Cancelled';
                } else if (isFullyPaid) {
                    formattedPaymentStatus = 'Fully Paid';
                } else if (isPartialPayment || paidAmt > 0) {
                    formattedPaymentStatus = '50% DP PAID';
                } else if (b.paymentStatus) {
                    formattedPaymentStatus = b.paymentStatus;
                }

                list.push({
                    id: b.id,
                    type: 'rental',
                    typeLabel: 'Car Rental',
                    title: `Rental: ${carTitle}`,
                    refCode: `RN-${b.id.slice(-6).toUpperCase()}`,
                    status: b.status || 'Received',
                    statusBadgeColor,
                    isActive: isApproved,
                    dateTimeStr: dateStr,
                    dateObj: isNaN(parsedDate.getTime()) ? new Date() : parsedDate,
                    detailsUrl: '/customer-portal/rent-a-car',
                    image: car?.imageUrl || b.carImage || '/images/services/rent_a_car.png',
                    category: 'Rent a Car',
                    vehicleDesc: car ? `${car.type || 'SUV'} · ${car.transmission || 'Automatic'} · ${car.seats || 7} Seats · ${car.fuelType || 'Diesel'}` : 'Standard Rental Fleet',
                    plateNumber: car?.plateNumber || b.plateNumber || '',
                    customerName: b.customerName || b.renterName || user?.name || 'Customer',
                    customerPhone: b.customerPhone || b.phone || user?.phone || '',
                    customerEmail: b.customerEmail || b.email || user?.email || '',
                    pickupLocation: b.pickupLocation || 'Main Rental Hub',
                    dropoffLocation: b.dropoffLocation || 'Main Hub Return',
                    notes: b.notes || (b.withDriver ? 'Includes Professional Driver' : 'Self-drive rental'),
                    totalAmount: total,
                    downpaymentAmount: downpayment,
                    paidAmount: paidAmt,
                    remainingBalance: remainingBal,
                    subtotal: total,
                    laborFee: 0,
                    platformFee: 0,
                    discount: 0,
                    paymentMethod: b.paymentMethod || 'HitPay / GCash',
                    paymentStatus: formattedPaymentStatus,
                    isVerified: isFullyPaid || isPartialPayment || !!b.isVerified,
                    isCancelable: !isCompleted && !isCancelled && !isApproved,
                    isCancelled: isCancelled,
                    rawBooking: { ...b, car }
                });
            });
        }

        // 3. Driver for Hire & Towing Requests
        if (db.serviceRequests && Array.isArray(db.serviceRequests)) {
            db.serviceRequests.filter(isUserMatch).forEach(req => {
                const name = req.serviceName || req.category || 'Special Service';
                const isTowing = name.toLowerCase().includes('towing') || req.slug === 'towing';
                const isDriver = name.toLowerCase().includes('driver') || req.slug === 'driver-for-hire';
                const type: 'towing' | 'driver' = isTowing ? 'towing' : 'driver';

                const statusLower = (req.status || '').toString().trim().toLowerCase();
                const isCompleted = ['completed', 'done'].includes(statusLower);
                const isCancelled = ['cancelled', 'canceled', 'rejected', 'declined'].includes(statusLower);
                const isOngoing = ['in progress', 'assigned', 'driver assigned', 'dispatched', 'en route'].includes(statusLower);

                let statusBadgeColor = isTowing ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
                if (isOngoing) statusBadgeColor = 'text-primary bg-primary/10 border-primary/30';
                else if (isCompleted) statusBadgeColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
                else if (isCancelled) statusBadgeColor = 'text-rose-400 bg-rose-500/10 border-rose-500/20';

                const driverStaff = db?.hireDrivers?.find(d => d.id === req.driverId || d.name === req.assignedDriverName || d.name === req.driverName);
                const dateStr = req.scheduledDate || (req.createdAt ? req.createdAt.split('T')[0] : 'Scheduled');
                const parsedDate = req.scheduledDate ? new Date(req.scheduledDate.replace(/-/g, '/')) : new Date(req.createdAt || Date.now());
                const total = req.totalAmount || req.price || (isTowing ? 1800 : 1200);
                const purpose = req.purposeOfHire || req.details?.purposeOfHire || (isTowing ? 'Emergency Towing Dispatch' : 'Personal Travel / Errands');

                list.push({
                    id: req.id,
                    type,
                    typeLabel: isTowing ? 'Towing Service' : 'Driver for Hire',
                    title: isTowing ? 'Towing Assistance' : (driverStaff?.name || req.driverName ? `Chauffeur: ${driverStaff?.name || req.driverName}` : 'Driver for Hire Service'),
                    refCode: isTowing ? `TW-${req.id.slice(-6).toUpperCase()}` : `DR-${req.id.slice(-6).toUpperCase()}`,
                    status: req.status || 'Pending',
                    statusBadgeColor,
                    isActive: isOngoing,
                    dateTimeStr: dateStr,
                    dateObj: isNaN(parsedDate.getTime()) ? new Date() : parsedDate,
                    detailsUrl: `/customer-portal/booking-detail/${req.id}`,
                    image: isTowing ? '/images/services/towing.png' : (driverStaff?.imageUrl || '/images/services/driver_for_hire.png'),
                    category: isTowing ? 'Towing & Rescue' : 'Chauffeur Services',
                    purposeOfHire: purpose,
                    vehicleDesc: req.vehicleDetails ? `${req.vehicleDetails.year || ''} ${req.vehicleDetails.make || req.vehicleDetails.brand || ''} ${req.vehicleDetails.model || ''}`.trim() : (req.notes || (isTowing ? 'Emergency Towing Dispatch' : `Driver Service (${purpose})`)),
                    plateNumber: req.plateNumber || req.vehicleDetails?.plateNumber || '',
                    customerName: req.customerName || req.userName || user?.name || 'Customer',
                    customerPhone: req.customerPhone || req.contactNumber || user?.phone || '',
                    customerEmail: req.customerEmail || req.email || user?.email || '',
                    pickupLocation: req.pickupLocation || req.details?.pickupLocation || req.pickupAddress || 'Customer Pickup Point',
                    dropoffLocation: req.dropoffLocation || req.destination || req.details?.destination || (isTowing ? 'Partner Service Center' : 'Drop-off Destination'),
                    notes: req.notes || req.instructions || '',
                    specialistName: driverStaff?.name || req.driverName || req.assignedDriverName,
                    specialistRole: isTowing ? 'Tow Truck Specialist' : 'Professional Driver',
                    specialistPhone: driverStaff?.phone || req.driverPhone,
                    specialistRating: driverStaff?.rating || 4.9,
                    specialistImageUrl: driverStaff?.imageUrl,
                    specialistIsOnline: driverStaff?.isAvailable !== false,
                    specialistExperience: driverStaff?.experience || '4+ Years Active',
                    specialistLocation: driverStaff?.location || 'Metro Dispatch',
                    totalAmount: total,
                    subtotal: total,
                    laborFee: 0,
                    platformFee: 0,
                    discount: 0,
                    paymentMethod: req.paymentMethod || 'Online (HitPay)',
                    paymentStatus: isCompleted ? 'Paid / Settled' : (req.paymentStatus || 'Pending Payment'),
                    isVerified: isCompleted || req.paymentStatus === 'paid',
                    isCancelable: !isCompleted && !isCancelled && !isOngoing,
                    isCancelled: isCancelled,
                    rawBooking: { ...req, driverStaff }
                });
            });
        }

        // 4. LTO Liaison Assistance Bookings
        if (db.liaisonBookings && Array.isArray(db.liaisonBookings)) {
            db.liaisonBookings.filter(isUserMatch).forEach(b => {
                const staff = db?.liaisonStaff?.find(s => s.id === b.liaisonId || s.name === b.liaisonName);
                const uploadedImg = b.documents?.[0]?.url || b.documentUrls?.[0] || b.uploadedDocuments?.[0];
                const statusLower = (b.status || '').toString().trim().toLowerCase();
                const isCompleted = ['completed', 'done'].includes(statusLower);
                const isCancelled = ['cancelled', 'canceled', 'rejected', 'declined'].includes(statusLower);
                const isOngoing = ['assigned', 'in progress', 'processing at lto', 'for processing', 'processing'].includes(statusLower);

                let statusBadgeColor = 'text-purple-400 bg-purple-500/10 border-purple-500/20';
                if (isOngoing) statusBadgeColor = 'text-primary bg-primary/10 border-primary/30';
                else if (isCompleted) statusBadgeColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
                else if (isCancelled) statusBadgeColor = 'text-rose-400 bg-rose-500/10 border-rose-500/20';

                const dateStr = b.appointmentDate ? (b.appointmentTime ? `${b.appointmentDate} · ${b.appointmentTime}` : b.appointmentDate) : (b.createdAt?.split('T')[0] || 'Scheduled');
                const parsedDate = b.appointmentDate ? new Date(`${b.appointmentDate.replace(/-/g, '/')} ${b.appointmentTime || '08:00 AM'}`) : new Date(b.createdAt || Date.now());
                const total = b.fees?.total || b.totalAmount || b.price || 1500;
                const serviceFee = b.fees?.serviceFee || 1500;
                const governmentFee = b.fees?.governmentFee || 0;
                const pickupFee = b.fees?.pickupFee || 0;
                const discount = b.fees?.discount || 0;
                const downpaymentAmount = b.downpaymentAmount || Math.round(total * 0.5);
                const isPaidFull = b.paymentStatus === 'Paid' || b.paymentStatus === 'Paid in Full' || b.paymentStatus === 'paid' || b.balancePaid === true || b.isPaid === true;
                const isPartial = !isPaidFull && (b.paymentStatus === 'Downpayment Paid' || b.paymentStatus === 'partial' || (b.paidAmount && b.paidAmount > 0 && b.paidAmount < total) || b.isVerified);
                const paidAmount = isPaidFull ? total : (b.paidAmount || (isPartial ? downpaymentAmount : 0));
                const remainingBalance = isPaidFull ? 0 : Math.max(0, total - paidAmount);

                let formattedPaymentStatus = 'Pending Payment';
                if (isPaidFull) formattedPaymentStatus = 'Paid in Full';
                else if (isPartial) formattedPaymentStatus = 'Downpayment Paid (50%)';
                else if (b.paymentStatus) formattedPaymentStatus = b.paymentStatus;

                list.push({
                    id: b.id,
                    type: 'liaison',
                    typeLabel: 'LTO Liaison',
                    title: `LTO: ${b.serviceType || 'Registration Assistance'}`,
                    refCode: `LIA-${b.id.slice(-6).toUpperCase()}`,
                    status: b.status || 'Received',
                    statusBadgeColor,
                    isActive: isOngoing,
                    dateTimeStr: dateStr,
                    dateObj: isNaN(parsedDate.getTime()) ? new Date() : parsedDate,
                    detailsUrl: `/customer-portal/booking-detail/${b.id}`,
                    image: uploadedImg || staff?.imageUrl || '/images/services/liaison.png',
                    category: 'LTO Liaison Assistance',
                    vehicleDesc: b.vehicleDetails ? `${b.vehicleDetails.year || ''} ${b.vehicleDetails.brand || ''} ${b.vehicleDetails.model || ''}`.trim() : 'Document Registration',
                    plateNumber: b.vehicleDetails?.plateNumber || b.plateNumber || '',
                    branchName: b.branchName || 'LTO District Office',
                    customerName: b.customerName || b.applicantName || user?.name || 'Customer',
                    customerPhone: b.customerPhone || b.contactNumber || user?.phone || '',
                    customerEmail: b.customerEmail || b.email || user?.email || '',
                    notes: b.notes || b.specialInstructions || '',
                    specialistName: staff?.name || b.liaisonName || 'LTO Liaison Officer',
                    specialistRole: 'Assigned Liaison Officer',
                    specialistPhone: staff?.phone,
                    specialistRating: staff?.rating || 4.95,
                    specialistImageUrl: staff?.imageUrl,
                    specialistIsOnline: staff?.isAvailable !== false,
                    specialistExperience: 'Accredited Liaison',
                    specialistLocation: b.branchName || 'LTO Main Branch',
                    totalAmount: total,
                    downpaymentAmount: downpaymentAmount,
                    paidAmount: paidAmount,
                    remainingBalance: remainingBalance,
                    serviceFee,
                    governmentFee,
                    pickupFee,
                    subtotal: total,
                    laborFee: serviceFee,
                    platformFee: 0,
                    discount: discount,
                    paymentMethod: b.paymentMethod || 'HitPay Online (GCash / Cards / Maya)',
                    paymentStatus: formattedPaymentStatus,
                    isVerified: isPaidFull || isPartial,
                    isCancelable: !isCompleted && !isCancelled && !isOngoing,
                    isCancelled: isCancelled,
                    rawBooking: { ...b, staff }
                });
            });
        }

        // 5. Product & Parts Orders
        if (db.orders && Array.isArray(db.orders)) {
            db.orders.filter(isUserMatch).forEach(o => {
                const items = o.items || [];
                const statusLower = (o.status || '').toString().trim().toLowerCase();
                const isCompleted = ['delivered', 'completed', 'done'].includes(statusLower);
                const isCancelled = ['cancelled', 'canceled', 'rejected', 'refunded'].includes(statusLower);
                const isOngoing = ['processing', 'shipped', 'out for delivery'].includes(statusLower);

                let statusBadgeColor = 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
                if (isOngoing) statusBadgeColor = o.status === 'Shipped' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' : 'text-blue-400 bg-blue-500/10 border-blue-500/20';
                else if (isCompleted) statusBadgeColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
                else if (isCancelled) statusBadgeColor = 'text-rose-400 bg-rose-500/10 border-rose-500/20';

                const dateStr = o.createdAt ? o.createdAt.split('T')[0] : (o.date || 'Recent Order');
                const parsedDate = o.createdAt ? new Date(o.createdAt) : new Date(o.date || Date.now());

                const firstItem = items[0];
                const itemTitle = items.length > 1 ? `${firstItem?.name || 'Auto Part'} (+${items.length - 1} more items)` : (firstItem?.name || 'Parts Order');
                const subtotal = items.reduce((acc: number, it: any) => acc + ((it.price || 0) * (it.quantity || 1)), 0);
                const shippingFee = o.shippingFee || (items.length > 0 ? 150 : 0);
                const total = o.total || o.totalAmount || (subtotal + shippingFee);

                list.push({
                    id: o.id,
                    type: 'order',
                    typeLabel: 'Parts Order',
                    title: itemTitle,
                    refCode: `ORD-${o.id.slice(-6).toUpperCase()}`,
                    status: o.status || 'Processing',
                    statusBadgeColor,
                    isActive: isOngoing,
                    dateTimeStr: dateStr,
                    dateObj: isNaN(parsedDate.getTime()) ? new Date() : parsedDate,
                    detailsUrl: `/customer-portal/order-history?id=${o.id}`,
                    image: firstItem?.imageUrl || firstItem?.image || MOCKUPS.PARTS_PLACEHOLDER,
                    category: 'Parts & Accessories',
                    vehicleDesc: `${items.length} item(s) · Delivery to ${o.shippingAddress?.city || o.city || 'Provided Address'}`,
                    items,
                    itemCount: items.length,
                    customerName: o.customerName || o.recipientName || user?.name || 'Customer',
                    customerPhone: o.customerPhone || o.shippingAddress?.phone || user?.phone || '',
                    customerEmail: o.customerEmail || o.email || user?.email || '',
                    dropoffLocation: o.shippingAddress?.address || o.deliveryAddress || 'Standard Delivery Address',
                    notes: o.notes || o.deliveryNotes || '',
                    totalAmount: total,
                    subtotal,
                    laborFee: 0,
                    platformFee: shippingFee,
                    discount: o.discount || 0,
                    paymentMethod: o.paymentMethod || 'COD / GCash',
                    paymentStatus: o.paymentStatus || (isCompleted ? 'Paid' : 'Payment on Delivery / Confirmed'),
                    isVerified: isCompleted || o.paymentStatus === 'Paid',
                    isCancelable: !isCompleted && !isCancelled && (o.status === 'Pending' || o.status === 'Processing'),
                    isCancelled: isCancelled,
                    rawBooking: o
                });
            });
        }

        // Filter out any dismissed transactions and sort: active/ongoing first, then newest
        return list
            .filter(item => !dismissedTransactionIds.includes(String(item.id)))
            .sort((a, b) => {
                if (a.isActive && !b.isActive) return -1;
                if (!a.isActive && b.isActive) return 1;
                return b.dateObj.getTime() - a.dateObj.getTime();
            });
    }, [db?.bookings, db?.liaisonBookings, db?.liaisonStaff, db?.rentalBookings, db?.rentalCars, db?.serviceRequests, db?.hireDrivers, db?.orders, db?.mechanics, user, dismissedTransactionIds]);

    // Filtered list based on selected category tab
    const filteredTransactions = React.useMemo(() => {
        if (activeTransactionTab === 'all') return allTransactions;
        return allTransactions.filter(t => t.type === activeTransactionTab);
    }, [allTransactions, activeTransactionTab]);

    // Handler to navigate or open complete details modal when card is clicked
    const handleTransactionCardClick = (tx: any) => {
        if (!tx) return;
        if (tx.type === 'maintenance' || tx.type === 'driver' || tx.type === 'towing' || tx.type === 'rental') {
            navigate(`/customer-portal/booking-detail/${tx.id}`, { state: { booking: tx.rawBooking } });
        } else if (tx.type === 'order') {
            navigate(`/customer-portal/order-history?id=${tx.id}`);
        } else {
            // For liaison and any other booking types, open the rich details modal
            setSelectedDetailsBooking(tx);
        }
    };

    // Live mechanic data lookup for top active banner
    const liveMechanic = activeBooking && db?.mechanics
        ? db.mechanics.find(m => m.id === activeBooking.mechanicId || m.id === activeBooking.mechanic?.id)
        : activeBooking?.mechanic;

    // Progress bar percent
    const progressPercent = activeBooking 
        ? activeBooking.status === 'Mechanic Assigned' ? '33%'
        : activeBooking.status === 'En Route' ? '66%'
        : '90%'
        : '0%';

    // Status title/subtitle descriptive texts
    const statusText = activeBooking
        ? activeBooking.status === 'Mechanic Assigned' ? 'Mechanic Assigned'
        : activeBooking.status === 'En Route' ? 'Mechanic En Route'
        : 'Service In Progress'
        : '';

    const statusDesc = activeBooking
        ? activeBooking.status === 'Mechanic Assigned' ? 'Preparing tools & heading your way'
        : activeBooking.status === 'En Route' ? `Arriving in ${activeBooking.eta || '15 mins'}`
        : 'Active service under maintenance'
        : '';

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-[#121212]">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-[#121212] text-white pb-24 font-sans">
            <CustomerHeader title={`Welcome, ${user?.name.split(' ')[0]}!`} icon={<Car size={22} />} />

            {/* Search Bar section */}
            <div className="px-6 py-4 bg-[#121212]/90 backdrop-blur-md sticky top-[53px] z-30 border-b border-white/5 w-full">
                {/* Search Bar & Live Dropdown - Ultra-Modern Glassmorphic Search Widget */}
                <div className="relative w-full z-40 max-w-5xl mx-auto">
                    <div className="relative flex items-center group w-full">
                        <label htmlFor="globalSearch" className="sr-only">Search services, products, and tools</label>
                        <div className="absolute left-3.5 flex items-center justify-center pointer-events-none text-gray-400 group-focus-within:text-primary transition-colors">
                            <Search className="h-5 w-5" />
                        </div>
                        <input
                            id="globalSearch"
                            name="globalSearch"
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={handleSearch}
                            onFocus={() => setShowSearchDropdown(true)}
                            placeholder="Search services, products, and tools..."
                            className="w-full bg-[#16161D]/80 backdrop-blur-xl border border-white/15 hover:border-white/25 rounded-2xl pl-11 pr-11 py-3.5 text-sm text-white placeholder-gray-400 shadow-[0_4px_20px_rgba(0,0,0,0.4)] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchQuery('');
                                    setShowSearchDropdown(false);
                                }}
                                className="absolute right-3.5 p-1 rounded-full bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white transition-all"
                                title="Clear search"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* Live Search Overlay Backdrop */}
                    {showSearchDropdown && (searchQuery.trim().length > 0) && (
                        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity" onClick={() => setShowSearchDropdown(false)} />
                    )}

                    {/* Live Search Results Dropdown - Glassmorphic Container */}
                    {showSearchDropdown && searchQuery.trim() && (
                        <div className="absolute top-full left-0 right-0 mt-2.5 bg-[#0e0f15]/90 border border-white/15 rounded-2xl shadow-[0_25px_60px_-10px_rgba(0,0,0,0.85),0_0_25px_rgba(254,120,3,0.06)] z-50 overflow-hidden max-h-[440px] overflow-y-auto divide-y divide-white/10 backdrop-blur-2xl custom-scrollbar animate-in fade-in-50 zoom-in-95 duration-200">
                            {/* Services Section */}
                            {searchResults.services.length > 0 && (
                                <div className="p-3">
                                    <div className="flex items-center justify-between mb-2.5 px-2">
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-sm shadow-primary animate-pulse" />
                                            <h4 className="text-[10px] font-black text-primary tracking-widest uppercase">Services</h4>
                                        </div>
                                        <span className="text-[9px] font-black text-primary/80 bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                                            {searchResults.services.length}
                                        </span>
                                    </div>
                                    <div className="space-y-1.5">
                                        {searchResults.services.map(s => (
                                            <button
                                                key={s.id}
                                                onClick={() => {
                                                    navigate(`/customer-portal/services?q=${encodeURIComponent(s.name)}`);
                                                    setShowSearchDropdown(false);
                                                }}
                                                className="w-full text-left p-2.5 bg-white/[0.03] hover:bg-white/[0.08] active:bg-white/[0.12] border border-white/5 hover:border-primary/40 rounded-xl transition-all flex items-center justify-between group shadow-sm"
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary border border-primary/25 shrink-0 group-hover:scale-105 group-hover:border-primary/50 transition-all shadow-inner">
                                                        <Wrench size={15} />
                                                    </div>
                                                    <div className="min-w-0 pr-2">
                                                        <p className="text-xs font-black text-white group-hover:text-primary transition-colors truncate">
                                                            {s.name}
                                                        </p>
                                                        <p className="text-[11px] text-gray-300 font-medium truncate mt-0.5 leading-snug">
                                                            {s.description || 'Professional automotive maintenance & repair'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    {s.price && (
                                                        <span className="text-[11px] font-black text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-lg">
                                                            ₱{Number(s.price).toLocaleString()}
                                                        </span>
                                                    )}
                                                    <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-primary group-hover:bg-primary/15 transition-all">
                                                        <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Products Section */}
                            {searchResults.products.length > 0 && (
                                <div className="p-3">
                                    <div className="flex items-center justify-between mb-2.5 px-2">
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400 animate-pulse" />
                                            <h4 className="text-[10px] font-black text-cyan-400 tracking-widest uppercase">Products & Parts</h4>
                                        </div>
                                        <span className="text-[9px] font-black text-cyan-400/80 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full">
                                            {searchResults.products.length}
                                        </span>
                                    </div>
                                    <div className="space-y-1.5">
                                        {searchResults.products.map(p => (
                                            <button
                                                key={p.id}
                                                onClick={() => {
                                                    navigate(`/customer-portal/parts-store?q=${encodeURIComponent(p.name)}`);
                                                    setShowSearchDropdown(false);
                                                }}
                                                className="w-full text-left p-2.5 bg-white/[0.03] hover:bg-white/[0.08] active:bg-white/[0.12] border border-white/5 hover:border-cyan-400/40 rounded-xl transition-all flex items-center justify-between group shadow-sm"
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-9 h-9 rounded-xl overflow-hidden bg-black/40 border border-white/10 shrink-0 flex items-center justify-center p-1 group-hover:scale-105 group-hover:border-cyan-400/40 transition-all shadow-inner">
                                                        {p.imageUrls?.[0] ? (
                                                            <img src={p.imageUrls[0]} alt={p.name} className="w-full h-full object-contain" />
                                                        ) : (
                                                            <Car size={15} className="text-cyan-400" />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 pr-2">
                                                        <p className="text-xs font-black text-white group-hover:text-cyan-400 transition-colors truncate">
                                                            {p.name}
                                                        </p>
                                                        <p className="text-[11px] text-gray-300 font-medium truncate mt-0.5 leading-snug">
                                                            {p.brand ? `${p.brand} • ` : ''}{p.description || 'Genuine replacement part'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className="text-[11px] font-black text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-lg">
                                                        ₱{Number(p.price).toLocaleString()}
                                                    </span>
                                                    <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-cyan-400 group-hover:bg-cyan-500/15 transition-all">
                                                        <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Tools Section */}
                            {searchResults.tools.length > 0 && (
                                <div className="p-3">
                                    <div className="flex items-center justify-between mb-2.5 px-2">
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400 animate-pulse" />
                                            <h4 className="text-[10px] font-black text-emerald-400 tracking-widest uppercase">Tools & Equipment</h4>
                                        </div>
                                        <span className="text-[9px] font-black text-emerald-400/80 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                            {searchResults.tools.length}
                                        </span>
                                    </div>
                                    <div className="space-y-1.5">
                                        {searchResults.tools.map(t => (
                                            <button
                                                key={t.id}
                                                onClick={() => {
                                                    navigate(`/customer-portal/parts-store?q=${encodeURIComponent(t.name)}`);
                                                    setShowSearchDropdown(false);
                                                }}
                                                className="w-full text-left p-2.5 bg-white/[0.03] hover:bg-white/[0.08] active:bg-white/[0.12] border border-white/5 hover:border-emerald-400/40 rounded-xl transition-all flex items-center justify-between group shadow-sm"
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-9 h-9 rounded-xl overflow-hidden bg-black/40 border border-white/10 shrink-0 flex items-center justify-center p-1 group-hover:scale-105 group-hover:border-emerald-400/40 transition-all shadow-inner">
                                                        {t.imageUrls?.[0] ? (
                                                            <img src={t.imageUrls[0]} alt={t.name} className="w-full h-full object-contain" />
                                                        ) : (
                                                            <Settings size={15} className="text-emerald-400" />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 pr-2">
                                                        <p className="text-xs font-black text-white group-hover:text-emerald-400 transition-colors truncate">
                                                            {t.name}
                                                        </p>
                                                        <p className="text-[11px] text-gray-300 font-medium truncate mt-0.5 leading-snug">
                                                            {t.brand ? `${t.brand} • ` : ''}{t.description || 'Professional garage equipment'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className="text-[11px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg">
                                                        ₱{Number(t.price).toLocaleString()}
                                                    </span>
                                                    <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-emerald-400 group-hover:bg-emerald-500/15 transition-all">
                                                        <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* No Results State */}
                            {searchResults.services.length === 0 && searchResults.products.length === 0 && searchResults.tools.length === 0 && (
                                <div className="p-8 text-center bg-white/[0.01]">
                                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3 text-gray-400 shadow-inner">
                                        <Search size={22} className="text-gray-400" />
                                    </div>
                                    <p className="text-xs font-black text-white tracking-wide">No results found for "{searchQuery}"</p>
                                    <p className="text-[11px] text-gray-400 mt-1 font-medium">Try searching for "towing", "change oil", "brake", or "battery"</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <main className="flex-grow w-full px-6 space-y-4 overflow-y-auto custom-scrollbar pt-2 max-w-5xl mx-auto">

                {/* Customer Account & Vehicle Banner - Compact & Full Responsive Mobile View */}
                {user?.vehicles && user.vehicles.length > 0 && (() => {
                    const primaryVehicle = user.vehicles.find(v => v.isPrimary) || user.vehicles[0];
                    return (
                        <div className="relative bg-[#1A1612]/90 bg-gradient-to-b from-[#2B1B0E]/60 via-[#181512] to-[#141210] rounded-[24px] sm:rounded-[28px] overflow-hidden border border-[#FE7803]/25 shadow-2xl animate-slideUp w-full backdrop-blur-md">
                            {/* Subtle Ambient Glow */}
                            <div className="absolute top-0 right-0 w-44 h-44 bg-[#FE7803]/10 rounded-full blur-3xl pointer-events-none"></div>

                            <div className="relative z-10 p-4 sm:p-6 w-full flex flex-col justify-between">
                                {/* Top Section: Info & Vehicle Graphic / Mockup */}
                                <div className="flex items-center justify-between gap-3 mb-4">
                                    <div className="flex-1 min-w-0 pr-1">
                                        <p className="text-[10px] font-black text-[#FE7803] tracking-wider uppercase mb-1">
                                            YOUR PRIMARY VEHICLE
                                        </p>
                                        <h2 className="text-xl sm:text-2xl font-black text-white leading-tight tracking-tight truncate">
                                            {primaryVehicle.year} {primaryVehicle.make}
                                        </h2>
                                        <p className="text-sm font-bold text-gray-400 -mt-0.5 mb-2.5 truncate">
                                            {primaryVehicle.model}
                                        </p>
                                        
                                        {/* Status Pill Badge */}
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#16291E] border border-emerald-500/30 text-emerald-400 text-[10px] font-black tracking-wider">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
                                            <span>VEHICLE ACTIVE &amp; READY</span>
                                        </div>
                                    </div>

                                    {/* Vehicle Graphic Thumbnail — strictly constrained */}
                                    <div className="w-20 h-20 sm:w-24 sm:h-24 max-w-[80px] max-h-[80px] sm:max-w-[96px] sm:max-h-[96px] flex-shrink-0 rounded-2xl bg-black/40 border border-white/10 p-1 overflow-hidden shadow-inner flex items-center justify-center relative">
                                        {primaryVehicle.imageUrls && primaryVehicle.imageUrls.length > 0 ? (
                                            <img
                                                src={primaryVehicle.imageUrls[0]}
                                                alt={`${primaryVehicle.make} ${primaryVehicle.model}`}
                                                className="w-full h-full object-cover rounded-xl block max-w-full max-h-full"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = "/assets/car_mockup.png";
                                                }}
                                            />
                                        ) : (
                                            <img 
                                                src="/assets/car_mockup.png" 
                                                alt="Vehicle Thumbnail" 
                                                className="w-full h-full object-cover rounded-xl block max-w-full max-h-full" 
                                            />
                                        )}
                                    </div>
                                </div>

                                {/* 3 Compact Spec Tiles (Plate, Color, Category) */}
                                <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
                                    <div className="bg-[#24211D]/80 border border-white/5 rounded-2xl p-2.5 sm:p-3 min-w-0">
                                        <span className="text-[10px] text-gray-400 font-bold block mb-0.5 truncate">Plate No.</span>
                                        <span className="text-xs sm:text-sm font-black text-white block truncate tracking-tight font-mono">
                                            {primaryVehicle.plateNumber || 'N/A'}
                                        </span>
                                    </div>

                                    <div className="bg-[#24211D]/80 border border-white/5 rounded-2xl p-2.5 sm:p-3 min-w-0">
                                        <span className="text-[10px] text-gray-400 font-bold block mb-0.5 truncate">Color</span>
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            {primaryVehicle.color && (
                                                <span 
                                                    className="w-2.5 h-2.5 rounded-full border border-white/30 flex-shrink-0" 
                                                    style={{ backgroundColor: primaryVehicle.color.toLowerCase() === 'matt' || primaryVehicle.color.toLowerCase().includes('matt') ? '#4B4B4B' : primaryVehicle.color.toLowerCase() }}
                                                />
                                            )}
                                            <span className="text-xs sm:text-sm font-black text-white truncate">
                                                {primaryVehicle.color || 'N/A'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="bg-[#24211D]/80 border border-white/5 rounded-2xl p-2.5 sm:p-3 min-w-0">
                                        <span className="text-[10px] text-gray-400 font-bold block mb-0.5 truncate">Category</span>
                                        <span className="text-xs sm:text-sm font-black text-primary block truncate">
                                            {primaryVehicle.category || primaryVehicle.type || '4WD'}
                                        </span>
                                    </div>
                                </div>

                                {/* Action Button */}
                                <Tooltip content="Manage your vehicles" className="w-full">
                                    <button
                                        onClick={() => navigate('/customer-portal/my-garage')}
                                        className="w-full bg-[#3D2512]/80 hover:bg-[#FE7803]/25 border border-[#FE7803]/40 hover:border-[#FE7803] text-[#FE7803] font-black py-3 px-4 rounded-2xl transition-all duration-200 flex items-center justify-center gap-2 group active:scale-[0.99] shadow-lg shadow-black/40"
                                    >
                                        <Car size={18} className="text-[#FE7803] group-hover:scale-110 transition-transform" />
                                        <span className="text-sm font-black text-[#FE7803]">Manage My Garage</span>
                                        <ChevronRight size={18} className="text-[#FE7803] group-hover:translate-x-1 transition-transform ml-0.5" />
                                    </button>
                                </Tooltip>
                            </div>
                        </div>
                    );
                })()}

                {/* Modern Unified Customer Activity & Transactions Hub */}
                <section className="space-y-4 w-full animate-slideUp">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                            <div className="flex items-center gap-2">
                                <Activity size={18} className="text-primary animate-pulse" />
                                <h2 className="text-lg font-black text-white tracking-wide">Activity & Transactions</h2>
                                {allTransactions.length > 0 && (
                                    <span className="bg-primary/20 text-primary text-[10px] font-black px-2.5 py-0.5 rounded-full border border-primary/30">
                                        {allTransactions.length} Total
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-gray-400 font-medium">Real-time status of all your bookings, rentals, services & orders</p>
                        </div>

                        {/* Quick Action to Book/Explore */}
                        <div className="flex items-center gap-2">
                            <Tooltip content="Schedule new service">
                                <button
                                    onClick={() => navigate('/customer-portal/services')}
                                    className="text-[11px] font-bold text-primary hover:text-white bg-primary/10 hover:bg-primary/20 border border-primary/20 px-3 py-1.5 rounded-xl transition flex items-center gap-1.5"
                                >
                                    <Wrench size={13} />
                                    <span>Book Service</span>
                                </button>
                            </Tooltip>
                        </div>
                    </div>

                    {/* Horizontal Category Filter Tabs */}
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
                        {[
                            { id: 'all', label: 'All', icon: Layers, count: allTransactions.length },
                            { id: 'maintenance', label: 'Services', icon: Wrench, count: allTransactions.filter(t => t.type === 'maintenance').length },
                            { id: 'rental', label: 'Rent a Car', icon: Car, count: allTransactions.filter(t => t.type === 'rental').length },
                            { id: 'driver', label: 'Driver for Hire', icon: UserCheck, count: allTransactions.filter(t => t.type === 'driver').length },
                            { id: 'liaison', label: 'LTO Liaison', icon: FileText, count: allTransactions.filter(t => t.type === 'liaison').length },
                            { id: 'towing', label: 'Towing', icon: Truck, count: allTransactions.filter(t => t.type === 'towing').length },
                            { id: 'order', label: 'Product Orders', icon: Package, count: allTransactions.filter(t => t.type === 'order').length },
                        ].map(tab => {
                            const TabIcon = tab.icon;
                            const isSelected = activeTransactionTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTransactionTab(tab.id as any)}
                                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all duration-200 shrink-0 border ${
                                        isSelected
                                            ? 'bg-primary text-black border-primary shadow-lg shadow-primary/20 scale-[1.02]'
                                            : 'bg-[#18181B] text-gray-400 hover:text-white border-white/5 hover:border-white/20'
                                    }`}
                                >
                                    <TabIcon size={14} className={isSelected ? 'text-black' : 'text-gray-400'} />
                                    <span>{tab.label}</span>
                                    {tab.count > 0 && (
                                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                                            isSelected ? 'bg-black/20 text-black' : 'bg-white/10 text-gray-300'
                                        }`}>
                                            {tab.count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Transaction List Feed */}
                    {filteredTransactions.length > 0 ? (
                        <div className="space-y-3.5 w-full">
                            {filteredTransactions.map((tx) => {
                                const isMaint = tx.type === 'maintenance';
                                const isRent = tx.type === 'rental';
                                const isLiaison = tx.type === 'liaison';
                                const isDrive = tx.type === 'driver';
                                const isTow = tx.type === 'towing';
                                const isOrd = tx.type === 'order';

                                const typeIcon = isMaint ? Wrench : isRent ? Car : isLiaison ? FileText : isDrive ? UserCheck : isTow ? Truck : Package;
                                const TypeIconComponent = typeIcon;

                                const typeBadgeStyle = isMaint 
                                    ? 'bg-orange-500/15 text-orange-400 border-orange-500/30' 
                                    : isRent 
                                    ? 'bg-blue-500/15 text-blue-400 border-blue-500/30' 
                                    : isLiaison 
                                    ? 'bg-purple-500/15 text-purple-400 border-purple-500/30' 
                                    : isDrive 
                                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
                                    : isTow 
                                    ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' 
                                    : 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';

                                const itemImage = normalizeServiceImage(tx.image, tx.category);

                                return (
                                    <div
                                        key={`${tx.type}-${tx.id}`}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => handleTransactionCardClick(tx)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                handleTransactionCardClick(tx);
                                            }
                                        }}
                                        className={`bg-gradient-to-br from-[#1C1C20] via-[#161618] to-[#121214] border rounded-2xl sm:rounded-3xl p-3.5 sm:p-4.5 relative overflow-hidden group shadow-lg hover:shadow-2xl transition-all duration-300 w-full cursor-pointer hover:border-primary/50 hover:bg-[#1D1D22] active:scale-[0.995] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
                                            tx.isActive ? 'border-primary/40 ring-1 ring-primary/20' : 'border-white/10 hover:border-white/25'
                                        }`}
                                    >
                                        {/* Ambient Glow Accent for Active Items */}
                                        {tx.isActive && (
                                            <div className="absolute top-0 right-0 w-36 h-36 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                                        )}

                                        <div className="relative z-10 flex flex-col gap-2.5 sm:gap-3">
                                            {/* Card Top Header */}
                                            <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                                                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider border shrink-0 ${typeBadgeStyle}`}>
                                                        <TypeIconComponent size={11} />
                                                        <span>{tx.typeLabel}</span>
                                                    </span>
                                                    <span className="text-[10px] sm:text-[11px] font-mono text-gray-400 font-bold truncate">#{tx.refCode}</span>
                                                    <ChevronRight size={13} className="text-gray-500 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 ml-0.5" />
                                                </div>

                                                {/* Live Status Pill */}
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black tracking-wider uppercase border shrink-0 ${tx.statusBadgeColor}`}>
                                                    {tx.isActive && (
                                                        <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
                                                    )}
                                                    <span>{tx.status}</span>
                                                </span>
                                            </div>

                                            {/* Card Main Body */}
                                            <div className="flex gap-3 sm:gap-3.5 items-start">
                                                {/* Media Thumbnail */}
                                                <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl overflow-hidden border border-white/10 flex-shrink-0 bg-[#1A1A1A] shadow-inner">
                                                    <BookingImage src={itemImage} type={tx.type} />
                                                </div>

                                                {/* Details Content */}
                                                <div className="flex-1 min-w-0 space-y-1">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <h3 className="text-white font-bold text-xs sm:text-sm leading-snug group-hover:text-primary transition-colors truncate">
                                                            {tx.title}
                                                        </h3>
                                                        <span className="text-xs sm:text-sm font-black text-white whitespace-nowrap shrink-0">
                                                            ₱{tx.totalAmount.toLocaleString()}
                                                        </span>
                                                    </div>

                                                    {/* Date & Schedule */}
                                                    <p className="text-[10px] sm:text-[11px] text-gray-300 font-medium flex items-center gap-1.5">
                                                        <Calendar size={11} className="text-primary shrink-0" />
                                                        <span className="truncate">{tx.dateTimeStr}</span>
                                                    </p>

                                                    {/* Vehicle / Destination / Route / Description */}
                                                    <div className="text-[10px] sm:text-[11px] text-gray-400 font-medium flex items-center flex-wrap gap-1 leading-tight">
                                                        <span className="text-gray-300 font-medium truncate">{tx.vehicleDesc}</span>
                                                        {tx.plateNumber && (
                                                            <span className="font-mono bg-white/5 border border-white/10 px-1.5 py-0.2 rounded text-[9px] sm:text-[10px] text-gray-200 whitespace-nowrap tracking-wider font-semibold">
                                                                {tx.plateNumber}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Assigned Specialist / Branch */}
                                                    {tx.specialistName && (
                                                        <div className="flex items-center gap-1.5 pt-0.5 min-w-0">
                                                            <div className="w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full overflow-hidden bg-white/10 border border-white/10 shrink-0 flex items-center justify-center">
                                                                {tx.specialistImageUrl ? (
                                                                    <img src={tx.specialistImageUrl} alt="" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <User size={9} className="text-primary" />
                                                                )}
                                                            </div>
                                                            <span className="text-[10px] sm:text-[11px] text-gray-300 font-medium truncate">
                                                                {tx.specialistRole ? `${tx.specialistRole}: ` : ''}<span className="text-primary font-bold">{tx.specialistName}</span>
                                                            </span>
                                                            {tx.specialistRating && (
                                                                <span className="text-[9px] text-yellow-400 font-black flex items-center gap-0.5 bg-yellow-500/10 px-1 py-0.2 rounded shrink-0">
                                                                    <Star size={8} className="fill-current" />
                                                                    {tx.specialistRating.toFixed(1)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Branch info for liaison */}
                                                    {isLiaison && tx.branchName && (
                                                        <p className="text-[10px] sm:text-[11px] text-gray-400 flex items-center gap-1">
                                                            <MapPin size={10} className="text-purple-400 shrink-0" />
                                                            <span className="truncate">{tx.branchName}</span>
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Card Bottom / Financial & Action Bar */}
                                            <div className="flex items-center justify-between gap-2 pt-2.5 sm:pt-3 border-t border-white/5">
                                                {/* Price & Payment Badge */}
                                                <div className="flex items-center gap-1.5 min-w-0 flex-wrap sm:flex-nowrap">
                                                    {(() => {
                                                        const pStatus = (tx.paymentStatus || '').toString().toLowerCase();
                                                        const isCancelledTx = tx.isCancelled || tx.status === 'Cancelled' || pStatus.includes('cancelled') || pStatus.includes('canceled');

                                                        if (isCancelledTx) {
                                                            return (
                                                                <>
                                                                    <span className="text-xs sm:text-sm font-black text-white/60 line-through whitespace-nowrap">
                                                                        ₱{(tx.totalAmount || 0).toLocaleString()}
                                                                    </span>
                                                                    <span className="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-lg border uppercase whitespace-nowrap truncate bg-rose-500/10 text-rose-400 border-rose-500/20">
                                                                        {tx.paidAmount > 0 ? 'Cancelled (DP Paid)' : 'Cancelled'}
                                                                    </span>
                                                                </>
                                                            );
                                                        }

                                                        const isPartial = pStatus.includes('dp') || pStatus.includes('partial') || pStatus.includes('downpayment') || ((tx.paidAmount || 0) > 0 && (tx.paidAmount || 0) < (tx.totalAmount || 0));
                                                        const displayAmount = isPartial
                                                            ? (tx.paidAmount || tx.downpaymentAmount || (tx.totalAmount ? tx.totalAmount * 0.5 : 0))
                                                            : tx.totalAmount;
                                                        const displayBalance = tx.remainingBalance !== undefined
                                                            ? tx.remainingBalance
                                                            : (isPartial ? Math.max(0, (tx.totalAmount || 0) - displayAmount) : 0);

                                                        return (
                                                            <>
                                                                <div className="flex items-baseline gap-1">
                                                                    <span className="text-xs sm:text-sm font-black text-white whitespace-nowrap">
                                                                        ₱{displayAmount.toLocaleString()}
                                                                    </span>
                                                                    {isPartial && displayBalance > 0 && (
                                                                        <span className="text-[9px] sm:text-[10px] text-amber-400 font-semibold whitespace-nowrap">
                                                                            (Bal: ₱{displayBalance.toLocaleString()})
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-lg border uppercase whitespace-nowrap truncate ${
                                                                    tx.isVerified || (typeof tx.paymentStatus === 'string' && tx.paymentStatus.toLowerCase().includes('paid'))
                                                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                                        : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                                                }`}>
                                                                    {tx.paymentStatus}
                                                                </span>
                              </>
                                                        );
                                                    })()}
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    {/* Direct Pay Balance button for Work Done service bookings */}
                                                    {isMaint && (tx.status === 'Work Done' || tx.status === 'Completed') && tx.rawBooking && !tx.rawBooking.isPaid && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                navigate(`/customer-portal/booking-detail/${tx.id}`);
                                                            }}
                                                            className="text-[10px] sm:text-xs font-black text-white bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 px-3 py-1.5 rounded-lg border border-emerald-400/40 transition-all flex items-center gap-1 shadow-md shadow-emerald-600/20 active:scale-95 animate-pulse cursor-pointer"
                                                        >
                                                            <CreditCard size={12} />
                                                            <span>Pay Balance</span>
                                                        </button>
                                                    )}

                                                    {/* Pay Balance button for Car Rentals, Liaison & Driver with remaining balance */}
                                                    {(tx.type === 'rental' || tx.type === 'liaison' || tx.type === 'driver') && (tx.remainingBalance || 0) > 0 && !tx.isCancelled && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setBalanceBookingForModal(tx);
                                                            }}
                                                            className="text-[10px] sm:text-xs font-black text-white bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 px-2.5 py-1.5 rounded-lg border border-emerald-400/40 transition-all flex items-center gap-1 shadow-md shadow-emerald-600/20 active:scale-95 cursor-pointer"
                                                            title="Settle remaining balance"
                                                        >
                                                            <CreditCard size={12} />
                                                            <span>Pay Bal</span>
                                                        </button>
                                                    )}

                                                    {/* Live Tracking button */}
                                                    {tx.isActive && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (isMaint && tx.id) {
                                                                    navigate(`/customer-portal/booking-detail/${tx.id}?track=true`);
                                                                } else if (tx.type === 'order') {
                                                                    setActiveOrderForTracking(tx);
                                                                } else {
                                                                    setSelectedDetailsBooking(tx);
                                                                }
                                                            }}
                                                            className="text-[9px] font-black text-white bg-primary hover:bg-orange-600 px-2 py-0.5 rounded-md transition flex items-center gap-1 shadow-sm shadow-primary/20"
                                                        >
                                                            <Navigation size={9} />
                                                            <span>Track</span>
                                                        </button>
                                                    )}

                                                    {/* Cancel option if cancelable AND NOT already cancelled */}
                                                    {tx.isCancelable && !tx.isCancelled && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setBookingToCancel(tx);
                                                            }}
                                                            className="text-[10px] sm:text-xs font-bold text-red-400 hover:bg-red-500/10 bg-red-500/5 px-2.5 py-1 rounded-lg border border-red-500/20 transition active:scale-95"
                                                        >
                                                            Cancel
                                                        </button>
                                                    )}

                                                    {/* Remove / Delete option if cancelled */}
                                                    {tx.isCancelled && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setTransactionToRemove(tx);
                                                            }}
                                                            className="text-[10px] sm:text-xs font-bold text-red-400 hover:bg-red-500/20 bg-red-500/10 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl border border-red-500/30 hover:border-red-500/50 transition flex items-center gap-1.5 active:scale-95 shadow-sm shadow-red-500/10"
                                                            title="Remove this cancelled record"
                                                        >
                                                            <Trash2 size={12} className="text-red-400" />
                                                            <span>Remove</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        /* Empty State when no transactions exist for current filter */
                        <div className="bg-[#18181B] border border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-7 text-center flex flex-col items-center justify-center animate-slideUp shadow-xl max-w-md mx-auto w-full">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3 text-gray-400">
                                <Layers size={20} className="sm:w-6 sm:h-6" />
                            </div>
                            <h3 className="text-white font-black text-sm sm:text-base leading-tight">
                                {activeTransactionTab === 'all' ? 'No Active Activity Found' : `No ${activeTransactionTab.toUpperCase()} Transactions`}
                            </h3>
                            <p className="text-[11px] sm:text-xs text-gray-400 max-w-xs sm:max-w-sm mt-1 mb-4 leading-relaxed">
                                {activeTransactionTab === 'all'
                                    ? 'You do not have any pending or ongoing bookings yet. Explore our automotive services, car rentals, or parts store below.'
                                    : `You currently have no ${activeTransactionTab} bookings or requests. Start a new transaction anytime.`}
                            </p>

                            {/* Compact Mobile Responsive Quick Service Grid */}
                            <div className="grid grid-cols-3 gap-1.5 sm:gap-2 w-full">
                                <button
                                    onClick={() => navigate('/customer-portal/services')}
                                    className="bg-primary hover:bg-orange-600 text-black font-black text-[10px] sm:text-xs py-2 sm:py-2.5 px-1.5 sm:px-2 rounded-xl transition border border-primary/20 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 shadow-md shadow-primary/10 active:scale-95 text-center"
                                >
                                    <Wrench size={13} className="shrink-0" />
                                    <span className="truncate">Services</span>
                                </button>
                                <button
                                    onClick={() => navigate('/customer-portal/rent-a-car')}
                                    className="bg-white/5 hover:bg-white/10 text-white font-bold text-[10px] sm:text-xs py-2 sm:py-2.5 px-1.5 sm:px-2 rounded-xl transition border border-white/10 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 active:scale-95 text-center"
                                >
                                    <Car size={13} className="text-blue-400 shrink-0" />
                                    <span className="truncate">Rent a Car</span>
                                </button>
                                <button
                                    onClick={() => navigate('/customer-portal/parts-store')}
                                    className="bg-white/5 hover:bg-white/10 text-white font-bold text-[10px] sm:text-xs py-2 sm:py-2.5 px-1.5 sm:px-2 rounded-xl transition border border-white/10 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 active:scale-95 text-center"
                                >
                                    <Package size={13} className="text-cyan-400 shrink-0" />
                                    <span className="truncate">Parts Store</span>
                                </button>
                            </div>
                        </div>
                    )}
                </section>

                {/* Marketing Banner - Random Slider */}
                <MarketingBanner />

                {/* Popular Services */}
                <section className="animate-slideUp" style={{ animationDelay: '0.1s' }}>
                    <div className="flex justify-between items-end mb-5">
                        <h2 className="text-lg font-black text-white tracking-wide">Popular Services</h2>
                        <Tooltip content="Browse all services">
                            <Link to="/customer-portal/services" className="text-xs text-primary font-bold hover:text-white transition-colors">View All</Link>
                        </Tooltip>
                    </div>

                    <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6 scrollbar-hide snap-x snap-mandatory">
                        {popularServices.map(service => (
                            <Tooltip key={service.id} content={service.name}>
                                <Link
                                    to={`/customer-portal/service/${service.id}`}
                                    className="flex-shrink-0 w-44 group relative snap-start"
                                >
                                    <div className="h-56 w-full rounded-2xl overflow-hidden relative shadow-lg bg-[#1E1E1E] group-hover:shadow-2xl group-hover:shadow-primary/20 transition-all duration-500">
                                        {(() => {
                                            const normalized = normalizeServiceImage(service.imageUrl, service.category, service.name);
                                            return (
                                                <img 
                                                    src={normalized} 
                                                    alt={service.name} 
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" 
                                                    onError={(e) => { (e.target as HTMLImageElement).src = getFallbackImageForCategory(service.category, service.name); }} 
                                                />
                                            );
                                        })()}
                                        {/* Enhanced Gradient Overlay */}
                                        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black via-black/90 to-transparent"></div>

                                        <div className="absolute bottom-4 left-4 right-4">
                                            <h3 className="text-[15px] font-black text-white leading-tight mb-1 group-hover:text-primary transition-colors duration-300">{service.name}</h3>
                                            <p className="text-[10px] font-bold text-primary group-hover:text-white transition-colors duration-300">
                                                {service.price && service.price > 0 ? `From ₱${service.price.toLocaleString()}` : 'Custom Quote'}
                                            </p>
                                        </div>
                                    </div>
                                </Link>
                            </Tooltip>
                        ))}
                    </div>
                </section>

                {/* Featured App Services */}
                <section className="animate-slideUp" style={{ animationDelay: '0.15s' }}>
                    <div className="flex justify-between items-end mb-5 mt-8">
                        <h2 className="text-lg font-black text-white tracking-wide">Featured Services</h2>
                        <Tooltip content="Browse all ridersbud services">
                            <Link to="/customer-portal/app-services" className="text-xs text-primary font-bold hover:text-white transition-colors">View All</Link>
                        </Tooltip>
                    </div>

                    <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6 scrollbar-hide snap-x snap-mandatory">
                        {db?.appServices?.filter((s: any) => {
                            if (s.category !== 'Special Services' || s.isActive === false) return false;
                            const modules = db?.settings?.modules;
                            if (!modules) return true;
                            if (s.slug === 'rent-a-car') return modules.find(m => m.id === 'rent-a-car')?.enabled !== false;
                            if (s.slug === 'driver-for-hire') return modules.find(m => m.id === 'driver-for-hire')?.enabled !== false;
                            if (s.slug === 'registration-assistance') return modules.find(m => m.id === 'liaison-assistance')?.enabled !== false;
                            if (s.slug === 'towing') return modules.find(m => m.id === 'towing')?.enabled !== false;
                            return true;
                        }).slice().sort((a: any, b: any) => (a.order || 99) - (b.order || 99)).map((service: any) => (
                            <Tooltip key={service.id} content={service.name}>
                                <Link
                                    to={`/customer-portal/app-services/${service.id}`}
                                    className="flex-shrink-0 w-48 group relative snap-start"
                                >
                                    <div className="h-60 w-full rounded-3xl overflow-hidden relative shadow-xl bg-[#141416] border border-white/10 group-hover:border-primary group-hover:shadow-primary/25 transition-all duration-300">
                                        {(() => {
                                            const normalized = normalizeServiceImage(service.imageUrl, service.category, service.name);
                                            return (
                                                <img src={normalized} alt={service.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out" onError={(e) => { (e.target as HTMLImageElement).src = getFallbackImageForCategory(service.category, service.name); }} />
                                            );
                                        })()}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent"></div>

                                        <div className="absolute bottom-5 left-5 right-5">
                                            <h3 className="text-base font-black text-white leading-tight mb-1.5 group-hover:text-primary transition-colors duration-300">{service.name}</h3>
                                            <p className="text-[11px] font-medium text-gray-400 line-clamp-2 leading-relaxed">{service.description}</p>
                                        </div>
                                    </div>
                                </Link>
                            </Tooltip>
                        ))}
                    </div>
                </section>

                {/* Genuine Parts Banner — Premium Redesign */}
                <section className="animate-slideUp space-y-4">
                    <div
                        className="w-full relative rounded-3xl overflow-hidden py-6 sm:py-8 min-h-[240px] bg-gradient-to-br from-[#1E1E22] via-[#121214] to-[#0A0A0C] border border-white/5 group cursor-pointer shadow-2xl hover:border-primary/30 hover:shadow-primary/5 transition-all duration-500 flex items-center"
                        onClick={() => navigate('/customer-portal/parts-store')}
                    >
                        {/* Background overlay image — proper dark industrial texture */}
                        <img
                            src={MOCKUPS.GENUINE_PARTS_TEXTURE}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover opacity-20 scale-105 group-hover:scale-100 group-hover:opacity-30 transition-all duration-1000"
                            loading="eager"
                        />
                        {/* Diagonal accent lines */}
                        <div className="absolute inset-0 opacity-[0.04] z-10" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0px, #fff 1px, transparent 1px, transparent 30px)' }} />
                        {/* Dark gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-transparent z-10" />

                        {/* Content */}
                        <div className="relative z-20 h-full flex flex-col justify-center pl-6 sm:pl-10 pr-2 w-[60%] sm:w-[55%]">
                            {/* Badge */}
                            <span className="inline-flex items-center gap-1.5 bg-primary/20 border border-primary/30 text-primary text-[10px] font-black tracking-widest px-3 py-1 rounded-full w-fit mb-3">
                                <Package size={12} /> PARTS & ACCESSORIES
                            </span>

                            <h3 className="text-[20px] font-black text-white tracking-tight leading-tight mb-1.5">Genuine Parts</h3>
                            <p className="text-[12px] text-gray-400 font-medium mb-2">Premium quality auto parts & tools. Upgrade your ride today.</p>
                            
                            {/* Parts count */}
                            <p className="text-[11px] text-gray-600 font-bold mb-3">
                                {db?.parts?.length || 0}+ parts available
                            </p>

                            {/* Category Chips */}
                            <div className="flex flex-wrap gap-1.5 mb-3.5">
                                {(() => {
                                    const cats: string[] = [...new Set((db?.parts || []).map((p: any) => p.category).filter(Boolean) as string[])];
                                    return cats.slice(0, 4).map(cat => (
                                        <span
                                            key={cat}
                                            onClick={(e) => { e.stopPropagation(); navigate(`/customer-portal/parts-store?category=${encodeURIComponent(cat)}`); }}
                                            className="text-[9px] sm:text-[10px] font-bold text-white/70 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full hover:bg-primary/20 hover:border-primary/30 hover:text-primary transition-all duration-300 cursor-pointer"
                                        >
                                            {cat}
                                        </span>
                                    ));
                                })()}
                            </div>

                            <span className="text-xs font-bold text-primary transition-all duration-300 flex items-center gap-1.5 group-hover:translate-x-2 w-fit">
                                <span className="bg-primary/20 px-3 py-1.5 rounded-full border border-primary/30 group-hover:bg-primary group-hover:text-white transition-all duration-300 flex items-center gap-1.5">
                                    Browse All Parts <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform duration-300" />
                                </span>
                            </span>
                        </div>
                        
                        {/* Floating Part Image — fixed display with screen blend to hide solid background */}
                        <div className="absolute right-4 sm:right-10 top-1/2 -translate-y-1/2 z-20">
                            <img
                                src={MOCKUPS.TURBO_PART}
                                alt="Brake Disc"
                                className="h-32 w-32 sm:h-40 sm:w-40 object-contain drop-shadow-[0_12px_35px_rgba(254,120,3,0.4)] group-hover:scale-110 group-hover:rotate-12 transition-all duration-700 ease-out animate-float mix-blend-screen"
                                loading="eager"
                            />
                            {/* Glow ring behind part */}
                            <div className="absolute inset-0 -z-10 h-32 w-32 sm:h-40 sm:w-40 rounded-full bg-primary/10 blur-3xl group-hover:bg-primary/20 transition-all duration-700" />
                        </div>

                        {/* Bottom gradient edge */}
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/0 via-primary/40 to-primary/0 z-20" />
                    </div>

                    {/* Expert Services Banner — Premium Redesign */}
                    <div
                        className="w-full relative rounded-3xl overflow-hidden py-6 sm:py-8 min-h-[240px] bg-gradient-to-br from-orange-950/40 via-[#121214] to-[#0A0A0C] border border-orange-500/20 group cursor-pointer shadow-2xl hover:border-primary/30 hover:shadow-orange-500/10 transition-all duration-500 flex items-center"
                        onClick={() => navigate('/customer-portal/services')}
                    >
                        {/* Sharp Background Image */}
                        <img
                            src={MOCKUPS.PREMIUM_SERVICE_BANNER}
                            alt="Services Garage"
                            className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:scale-105 group-hover:opacity-45 transition-all duration-1000 ease-out"
                            loading="eager"
                        />
                        {/* Diagonal accent lines */}
                        <div className="absolute inset-0 opacity-[0.04] z-10" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0px, #fff 1px, transparent 1px, transparent 30px)' }} />
                        {/* Dark Gradient Overlay to ensure text readability */}
                        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-transparent z-10"></div>

                        {/* Clean Text Container Overlay */}
                        <div className="relative z-20 h-full flex flex-col justify-center pl-6 sm:pl-10 pr-2 w-[80%] sm:w-[70%]">
                            {/* Badge */}
                            <span className="inline-flex items-center gap-1.5 bg-primary/20 border border-primary/30 text-primary text-[10px] font-black tracking-widest px-3 py-1 rounded-full w-fit mb-3 uppercase">
                                <Wrench size={12} /> EXPERT CARE
                            </span>
                            <h3 className="text-[20px] font-black text-white tracking-tight leading-tight mb-1.5 whitespace-nowrap">
                                Premium Service
                            </h3>
                            <p className="text-[12px] text-gray-400 font-medium mb-2 line-clamp-2 leading-relaxed">
                                Book certified mechanics for expert diagnostics, auto repairs, and maintenance.
                            </p>
                            
                            {/* Services count */}
                            <p className="text-[11px] text-gray-600 font-bold mb-3">
                                {db?.services?.length || 0}+ specialized services ready
                            </p>

                            {/* Service Categories Chips */}
                            <div className="flex flex-wrap items-center gap-1.5 mb-3.5 w-full">
                                {(() => {
                                    const cats: string[] = [...new Set((db?.services || []).map((s: any) => s.category).filter(Boolean) as string[])];
                                    return cats.slice(0, 4).map(cat => (
                                        <span
                                            key={cat}
                                            onClick={(e) => { e.stopPropagation(); navigate(`/customer-portal/services?category=${encodeURIComponent(cat)}`); }}
                                            className="text-[9px] sm:text-[10px] font-bold text-white/70 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full hover:bg-primary/20 hover:border-primary/30 hover:text-primary transition-all duration-300 cursor-pointer flex-shrink-0"
                                        >
                                            {cat}
                                        </span>
                                    ));
                                })()}
                            </div>

                            <span className="text-xs font-bold text-primary transition-all duration-300 flex items-center gap-1.5 group-hover:translate-x-2 w-fit">
                                <span className="bg-primary/20 px-3 py-1.5 rounded-full border border-primary/30 group-hover:bg-primary group-hover:text-white transition-all duration-300 flex items-center gap-1.5">
                                    Book Appointment <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform duration-300" />
                                </span>
                            </span>
                        </div>

                        {/* Floating visual detail indicator for services */}
                        <div className="absolute right-6 sm:right-12 top-1/2 -translate-y-1/2 z-20 pointer-events-none hidden xs:block">
                            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-2 border-primary/20 flex items-center justify-center bg-black/40 backdrop-blur-md relative animate-pulse">
                                <Calendar className="w-10 h-10 sm:w-14 sm:h-14 text-primary" />
                                <div className="absolute -inset-1 rounded-full border border-dashed border-primary/40 animate-spin-slow"></div>
                            </div>
                        </div>

                        {/* Bottom gradient edge */}
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/0 via-primary/40 to-primary/0 z-20" />
                    </div>
                </section>

            </main>

            {/* Contextual & Responsive Service Cancellation Modal */}
            {bookingToCancel && (
                <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
                    <div className="bg-[#18181B] border border-white/10 rounded-2xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl relative animate-scaleUp">
                        {/* Close button */}
                        <button
                            onClick={() => { setBookingToCancel(null); setCancelReason(''); }}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-full border border-white/5"
                        >
                            <X size={15} />
                        </button>

                        {/* Top Contextual Header Icon & Title */}
                        <div className="flex items-start gap-3.5 mb-3.5">
                            <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                                bookingToCancel.type === 'maintenance' ? 'bg-orange-500/15 border-orange-500/30 text-orange-400' :
                                bookingToCancel.type === 'rental' ? 'bg-blue-500/15 border-blue-500/30 text-blue-400' :
                                bookingToCancel.type === 'driver' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' :
                                bookingToCancel.type === 'liaison' ? 'bg-purple-500/15 border-purple-500/30 text-purple-400' :
                                bookingToCancel.type === 'towing' ? 'bg-rose-500/15 border-rose-500/30 text-rose-400' :
                                'bg-cyan-500/15 border-cyan-500/30 text-cyan-400'
                            }`}>
                                {bookingToCancel.type === 'maintenance' && <Wrench size={22} />}
                                {bookingToCancel.type === 'rental' && <Car size={22} />}
                                {bookingToCancel.type === 'driver' && <UserCheck size={22} />}
                                {bookingToCancel.type === 'liaison' && <FileText size={22} />}
                                {bookingToCancel.type === 'towing' && <Truck size={22} />}
                                {bookingToCancel.type === 'order' && <Package size={22} />}
                            </div>

                            <div className="flex-1 pr-6">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${
                                        bookingToCancel.type === 'maintenance' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                                        bookingToCancel.type === 'rental' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                                        bookingToCancel.type === 'driver' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                                        bookingToCancel.type === 'liaison' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
                                        bookingToCancel.type === 'towing' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' :
                                        'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                                    }`}>
                                        {bookingToCancel.typeLabel || 'Cancellation'}
                                    </span>
                                    <span className="text-[10px] font-mono text-gray-400 font-bold">#{bookingToCancel.refCode}</span>
                                </div>
                                <h3 className="text-white font-black text-base sm:text-lg leading-tight">
                                    {bookingToCancel.type === 'maintenance' ? 'Cancel Service Appointment?' :
                                     bookingToCancel.type === 'rental' ? 'Cancel Car Rental?' :
                                     bookingToCancel.type === 'driver' ? 'Cancel Driver for Hire?' :
                                     bookingToCancel.type === 'liaison' ? 'Cancel Liaison Request?' :
                                     bookingToCancel.type === 'towing' ? 'Cancel Roadside Towing?' :
                                     'Cancel Store Order?'}
                                </h3>
                            </div>
                        </div>

                        {/* Service Item Summary Card */}
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-3 sm:p-3.5 mb-4 space-y-1.5">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-white line-clamp-1">{bookingToCancel.title}</span>
                                <span className="text-xs font-black text-primary shrink-0 ml-2">{bookingToCancel.priceFormatted}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-gray-400 font-medium">
                                <span className="flex items-center gap-1">
                                    <Calendar size={11} className="text-gray-500" />
                                    <span>{bookingToCancel.dateTimeStr}</span>
                                </span>
                                {bookingToCancel.plateNumber && (
                                    <span className="font-mono bg-white/10 px-1.5 py-0.2 rounded text-[9px] text-gray-300">
                                        {bookingToCancel.plateNumber}
                                    </span>
                                )}
                            </div>
                            {bookingToCancel.vehicleDesc && bookingToCancel.type !== 'order' && (
                                <p className="text-[10px] text-gray-400 line-clamp-1 border-t border-white/5 pt-1 mt-1">
                                    {bookingToCancel.vehicleDesc}
                                </p>
                            )}
                        </div>

                        {/* Quick Reasons based on Service Type */}
                        <div className="space-y-3">
                            <div>
                                <label className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block mb-1.5">
                                    Quick Cancellation Reasons
                                </label>
                                <div className="flex flex-wrap gap-1.5">
                                    {(
                                        bookingToCancel.type === 'maintenance'
                                            ? ['Schedule conflict', 'Vehicle unavailable', 'Fixed myself', 'Change of plans', 'Found another shop']
                                            : bookingToCancel.type === 'rental'
                                            ? ['Travel plans changed', 'Found alternative transport', 'Incorrect dates', 'No longer needed', 'Budget adjustment']
                                            : bookingToCancel.type === 'driver'
                                            ? ['Trip cancelled', 'No longer need driver', 'Schedule conflict', 'Selected other ride', 'Personal emergency']
                                            : bookingToCancel.type === 'liaison'
                                            ? ['Documents not ready', 'Processing independently', 'Schedule conflict', 'Wrong service selected', 'Postponed']
                                            : bookingToCancel.type === 'towing'
                                            ? ['Vehicle is now drivable', 'Found other roadside help', 'Accidental booking', 'Assistance arrived', 'Tow not needed']
                                            : ['Ordered wrong item', 'Found better price', 'Delivery time too long', 'Changed mind', 'Payment adjustment']
                                    ).map((template) => (
                                        <button
                                            key={template}
                                            type="button"
                                            onClick={() => setCancelReason(template)}
                                            className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all duration-200 active:scale-95 ${
                                                cancelReason === template
                                                    ? 'bg-primary/20 border-primary text-primary'
                                                    : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200'
                                            }`}
                                        >
                                            {template}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="flex flex-col group">
                                <label htmlFor="home-cancel-reason" className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-1.5 group-focus-within:text-primary transition-colors">
                                    Specify Reason *
                                </label>
                                <textarea
                                    id="home-cancel-reason"
                                    name="home-cancel-reason"
                                    required
                                    value={cancelReason}
                                    onChange={(e) => setCancelReason(e.target.value)}
                                    placeholder={`Please state why you want to cancel this ${bookingToCancel.typeLabel.toLowerCase()}...`}
                                    rows={3}
                                    className="w-full bg-black/40 border border-white/10 hover:border-white/20 focus:border-red-500/50 text-white text-xs font-medium rounded-xl p-3 outline-none resize-none transition-all focus:ring-2 focus:ring-red-500/10 shadow-inner"
                                />
                            </div>
                        </div>

                        {/* Confirmation Actions */}
                        <div className="flex gap-2.5 sm:gap-3 mt-5">
                            <button
                                disabled={isCancelling}
                                onClick={() => { setBookingToCancel(null); setCancelReason(''); }}
                                className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-2.5 rounded-xl border border-white/5 transition-all text-xs active:scale-95"
                            >
                                No, Keep It
                            </button>
                            <button
                                disabled={isCancelling || !cancelReason.trim()}
                                onClick={() => handleCancelBooking(bookingToCancel)}
                                className={`flex-1 font-bold py-2.5 rounded-xl transition-all text-xs flex items-center justify-center gap-1.5 active:scale-95 ${
                                    cancelReason.trim()
                                        ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20 cursor-pointer'
                                        : 'bg-red-500/20 text-white/40 border border-red-500/10 cursor-not-allowed'
                                }`}
                            >
                                {isCancelling ? <Spinner size="sm" /> : 'Yes, Cancel'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {selectedDetailsBooking && (
                <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100] flex items-center justify-center p-2.5 sm:p-4 animate-fadeIn">
                    <div className="bg-[#141416] border border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-5 max-w-lg w-full max-h-[88vh] sm:max-h-[85vh] shadow-2xl relative text-white flex flex-col overflow-hidden">
                        {/* Modal Header Bar */}
                        <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3 shrink-0">
                            <div className="min-w-0 space-y-1">
                                <div className="flex items-center flex-wrap gap-1.5">
                                    <span className={`text-[9px] sm:text-[10px] font-black uppercase px-2 sm:px-2.5 py-0.5 rounded-full tracking-wider border ${
                                        selectedDetailsBooking.type === 'maintenance' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                                        selectedDetailsBooking.type === 'rental' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                                        selectedDetailsBooking.type === 'driver' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                                        selectedDetailsBooking.type === 'liaison' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
                                        selectedDetailsBooking.type === 'towing' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' :
                                        'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                                    }`}>
                                        {selectedDetailsBooking.typeLabel || 'Details'}
                                    </span>
                                    <button 
                                        onClick={() => {
                                            if (navigator?.clipboard) {
                                                navigator.clipboard.writeText(selectedDetailsBooking.refCode);
                                                setIsCopiedRef(true);
                                                setTimeout(() => setIsCopiedRef(false), 2000);
                                            }
                                        }}
                                        className="inline-flex items-center gap-1 bg-white/5 hover:bg-white/10 border border-white/10 px-2 py-0.5 rounded-full text-[10px] font-mono text-gray-300 transition-colors"
                                        title="Click to copy Reference Code"
                                    >
                                        <span>#{selectedDetailsBooking.refCode}</span>
                                        {isCopiedRef ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} className="text-gray-400" />}
                                    </button>
                                </div>
                                <h3 className="text-white font-black text-base sm:text-lg tracking-tight leading-snug truncate">
                                    {selectedDetailsBooking.title}
                                </h3>
                                <p className="text-[11px] text-gray-400 truncate flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary/70" />
                                    {selectedDetailsBooking.category || 'Automotive Service'}
                                </p>
                            </div>
                            
                            {/* Close button */}
                            <button
                                onClick={() => setSelectedDetailsBooking(null)}
                                className="text-gray-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-1.5 rounded-full border border-white/10 shrink-0"
                                title="Close"
                            >
                                <X size={15} />
                            </button>
                        </div>

                        {/* Content Body - Scrollable Container */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 py-3 space-y-2.5 text-xs">
                            {/* Live Status & Schedule Compact Strip */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {/* Status Card */}
                                <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
                                    selectedDetailsBooking.isActive ? 'bg-primary/10 border-primary/30' : 'bg-white/5 border-white/5'
                                }`}>
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className={`w-2 h-2 rounded-full shrink-0 ${selectedDetailsBooking.isActive ? 'bg-primary animate-ping' : 'bg-emerald-400'}`} />
                                        <div className="min-w-0">
                                            <p className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Status</p>
                                            <p className="font-bold text-white text-xs truncate">{selectedDetailsBooking.status}</p>
                                        </div>
                                    </div>
                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border shrink-0 ${selectedDetailsBooking.statusBadgeColor}`}>
                                        {selectedDetailsBooking.status}
                                    </span>
                                </div>

                                {/* Schedule Card */}
                                <div className="bg-white/5 p-2.5 rounded-xl border border-white/5 flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-yellow-500/10 border border-yellow-500/20 shrink-0">
                                        <Calendar size={13} className="text-yellow-500" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Date & Schedule</p>
                                        <p className="font-bold text-white text-xs truncate">{selectedDetailsBooking.dateTimeStr}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Vehicle & Target Fleet Information */}
                            <div className="bg-white/5 p-2.5 sm:p-3 rounded-xl border border-white/5 flex items-start gap-2.5">
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-blue-500/10 border border-blue-500/20 shrink-0 mt-0.5">
                                    {selectedDetailsBooking.type === 'order' ? <Package size={13} className="text-cyan-400" /> : <Car size={13} className="text-blue-400" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-1 mb-0.5">
                                        <h4 className="text-gray-400 font-bold uppercase text-[9px] tracking-wider">
                                            {selectedDetailsBooking.type === 'rental' ? 'Rental Fleet Specification' :
                                             selectedDetailsBooking.type === 'driver' ? 'Driver for Hire Details' :
                                             selectedDetailsBooking.type === 'order' ? 'Package Summary' : 'Vehicle Specification'}
                                        </h4>
                                        {selectedDetailsBooking.plateNumber && (
                                            <span className="font-mono bg-white/10 px-1.5 py-0.2 rounded font-bold text-[10px] text-white border border-white/10 shrink-0">
                                                {selectedDetailsBooking.plateNumber}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-white font-medium text-xs leading-snug">
                                        {selectedDetailsBooking.vehicleDesc}
                                    </p>
                                    {selectedDetailsBooking.purposeOfHire && selectedDetailsBooking.type === 'driver' && (
                                        <div className="mt-1.5 pt-1.5 border-t border-white/5 flex items-center gap-1.5">
                                            <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Purpose:</span>
                                            <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                                {selectedDetailsBooking.purposeOfHire}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Customer Information (Live Realtime Context) */}
                            <div className="bg-white/5 p-2.5 sm:p-3 rounded-xl border border-white/5 space-y-2">
                                <h4 className="text-gray-400 font-bold uppercase text-[9px] tracking-wider flex items-center justify-between">
                                    <span className="flex items-center gap-1.5">
                                        <User size={11} className="text-primary" />
                                        Customer Details
                                    </span>
                                    <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded font-bold">
                                        Verified Account
                                    </span>
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                                    <div className="flex items-center gap-1.5 bg-black/30 p-1.5 rounded-lg border border-white/5 min-w-0">
                                        <User size={12} className="text-gray-400 shrink-0" />
                                        <span className="text-gray-300 font-bold truncate">{selectedDetailsBooking.customerName || 'Customer'}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-black/30 p-1.5 rounded-lg border border-white/5 min-w-0">
                                        <Phone size={12} className="text-gray-400 shrink-0" />
                                        <span className="text-gray-300 font-mono truncate">{selectedDetailsBooking.customerPhone || '09940581029'}</span>
                                    </div>
                                </div>
                                {selectedDetailsBooking.customerEmail && (
                                    <div className="flex items-center gap-1.5 bg-black/30 p-1.5 rounded-lg border border-white/5 text-[11px] min-w-0">
                                        <Mail size={12} className="text-gray-400 shrink-0" />
                                        <span className="text-gray-300 truncate">{selectedDetailsBooking.customerEmail}</span>
                                    </div>
                                )}
                                {selectedDetailsBooking.pickupLocation && (
                                    <div className="flex items-start gap-1.5 bg-black/30 p-1.5 rounded-lg border border-white/5 text-[11px]">
                                        <MapPin size={12} className="text-rose-400 shrink-0 mt-0.5" />
                                        <div className="min-w-0 flex-1">
                                            <span className="text-[9px] font-bold text-gray-400 uppercase mr-1">Address:</span>
                                            <span className="text-gray-200">{selectedDetailsBooking.pickupLocation}</span>
                                        </div>
                                    </div>
                                )}
                                {selectedDetailsBooking.dropoffLocation && selectedDetailsBooking.type !== 'order' && (
                                    <div className="flex items-start gap-1.5 bg-black/30 p-1.5 rounded-lg border border-white/5 text-[11px]">
                                        <Compass size={12} className="text-cyan-400 shrink-0 mt-0.5" />
                                        <div className="min-w-0 flex-1">
                                            <span className="text-[9px] font-bold text-gray-400 uppercase mr-1">Destination:</span>
                                            <span className="text-gray-200">{selectedDetailsBooking.dropoffLocation}</span>
                                        </div>
                                    </div>
                                )}
                                {selectedDetailsBooking.notes && (
                                    <div className="flex items-start gap-1.5 bg-black/30 p-1.5 rounded-lg border border-white/5 text-[10px] text-gray-300">
                                        <Info size={11} className="text-yellow-400 shrink-0 mt-0.5" />
                                        <span className="italic leading-tight">{selectedDetailsBooking.notes}</span>
                                    </div>
                                )}
                            </div>

                            {/* Assigned Specialist / Mechanic Details */}
                            {selectedDetailsBooking.specialistName && (
                                <div className="bg-gradient-to-r from-orange-500/10 via-[#18181B] to-white/5 p-2.5 sm:p-3 rounded-xl border border-orange-500/20 flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-gray-400 font-bold uppercase text-[9px] tracking-wider flex items-center gap-1">
                                            <Wrench size={10} className="text-primary" />
                                            {selectedDetailsBooking.specialistRole || 'Assigned Mechanic'}
                                        </h4>
                                        <span className="text-[9px] font-bold text-emerald-400 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                            Active On Duty
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2.5">
                                        <div className="relative shrink-0">
                                            <div className="w-10 h-10 rounded-xl overflow-hidden bg-[#2A1C15] border border-white/10 flex items-center justify-center">
                                                {selectedDetailsBooking.specialistImageUrl ? (
                                                    <img 
                                                        src={selectedDetailsBooking.specialistImageUrl} 
                                                        alt={selectedDetailsBooking.specialistName} 
                                                        className="w-full h-full object-cover" 
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src = '/riders-logo.png';
                                                        }}
                                                    />
                                                ) : (
                                                    <User size={16} className="text-primary" />
                                                )}
                                            </div>
                                            {selectedDetailsBooking.specialistIsOnline && (
                                                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#18181B] rounded-full" />
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <p className="font-bold text-xs text-primary truncate">{selectedDetailsBooking.specialistName}</p>
                                                {selectedDetailsBooking.specialistRating && (
                                                    <span className="text-[9px] text-yellow-400 font-black flex items-center gap-0.5 bg-yellow-500/10 px-1.5 py-0.2 rounded shrink-0">
                                                        <Star size={8} className="fill-current" />
                                                        {selectedDetailsBooking.specialistRating.toFixed(1)}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                                                {selectedDetailsBooking.specialistExperience && (
                                                    <span className="truncate">{selectedDetailsBooking.specialistExperience}</span>
                                                )}
                                                {selectedDetailsBooking.specialistPhone && (
                                                    <span className="font-mono text-gray-300 truncate">· {selectedDetailsBooking.specialistPhone}</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Quick Mechanic Actions */}
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            {selectedDetailsBooking.specialistPhone && (
                                                <a 
                                                    href={`tel:${selectedDetailsBooking.specialistPhone}`}
                                                    className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/20 transition-all"
                                                    title="Call Specialist"
                                                >
                                                    <Phone size={13} />
                                                </a>
                                            )}
                                            <button
                                                onClick={() => {
                                                    const targetId = selectedDetailsBooking.id;
                                                    setSelectedDetailsBooking(null);
                                                    if (selectedDetailsBooking.type === 'maintenance' && targetId) {
                                                        navigate(`/customer-portal/booking-detail/${targetId}?chat=true`);
                                                    } else {
                                                        navigate('/customer-portal/support-chat');
                                                    }
                                                }}
                                                className="bg-primary/20 hover:bg-primary/30 text-primary p-2 rounded-lg border border-primary/30 transition-all"
                                                title="Chat with Specialist"
                                            >
                                                <MessageSquare size={13} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Services Breakdown (For Maintenance Bookings) */}
                            {selectedDetailsBooking.type === 'maintenance' && selectedDetailsBooking.servicesList && selectedDetailsBooking.servicesList.length > 0 && (
                                <div className="bg-white/5 p-2.5 sm:p-3 rounded-xl border border-white/5 space-y-2">
                                    <h4 className="text-gray-400 font-bold uppercase text-[9px] tracking-wider flex items-center justify-between">
                                        <span className="flex items-center gap-1.5">
                                            <Wrench size={11} className="text-amber-400" />
                                            Requested Services ({selectedDetailsBooking.servicesList.length})
                                        </span>
                                        <span className="text-gray-400 text-[9px] font-mono">Real-time Catalog</span>
                                    </h4>
                                    <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar pr-1">
                                        {selectedDetailsBooking.servicesList.map((svc: any, idx: number) => (
                                            <div key={idx} className="flex items-center justify-between gap-2 bg-black/30 p-2 rounded-lg border border-white/5">
                                                <div className="min-w-0 flex items-center gap-2">
                                                    <div className="w-5 h-5 rounded bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                                                        {idx + 1}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-white font-bold text-xs truncate">{svc.name || 'Vehicle Diagnostic'}</p>
                                                        <p className="text-[9px] text-gray-400">{svc.category || 'Maintenance'}</p>
                                                    </div>
                                                </div>
                                                <span className="text-xs font-bold text-white shrink-0 font-mono">
                                                    ₱{((svc.price || 0)).toLocaleString()}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Order Items Breakdown (For Parts Store Orders) */}
                            {selectedDetailsBooking.type === 'order' && selectedDetailsBooking.items && selectedDetailsBooking.items.length > 0 && (
                                <div className="bg-white/5 p-2.5 sm:p-3 rounded-xl border border-white/5 space-y-2">
                                    <h4 className="text-gray-400 font-bold uppercase text-[9px] tracking-wider flex items-center gap-1.5">
                                        <ShoppingBag size={11} className="text-cyan-400" />
                                        <span>Ordered Items ({selectedDetailsBooking.items.length})</span>
                                    </h4>
                                    <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar pr-1">
                                        {selectedDetailsBooking.items.map((item: any, idx: number) => (
                                            <div key={idx} className="flex items-center justify-between gap-2 bg-black/30 p-2 rounded-lg border border-white/5">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <img 
                                                        src={item.imageUrl || item.image || MOCKUPS.PARTS_PLACEHOLDER} 
                                                        alt={item.name} 
                                                        className="w-7 h-7 rounded object-cover bg-white/5 shrink-0" 
                                                        onError={(e) => { (e.target as HTMLImageElement).src = '/riders-logo.png'; }}
                                                    />
                                                    <div className="min-w-0">
                                                        <p className="text-white font-bold text-xs truncate">{item.name}</p>
                                                        <p className="text-[9px] text-gray-400">Qty: {item.quantity || 1}</p>
                                                    </div>
                                                </div>
                                                <span className="text-xs font-bold text-white shrink-0 font-mono">
                                                    ₱{((item.price || 0) * (item.quantity || 1)).toLocaleString()}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Documents Uploaded Section (For Liaison) */}
                            {selectedDetailsBooking.type === 'liaison' && selectedDetailsBooking.rawBooking?.documents && selectedDetailsBooking.rawBooking.documents.length > 0 && (
                                <div className="bg-white/5 p-2.5 sm:p-3 rounded-xl border border-white/5">
                                    <h4 className="text-gray-400 font-bold uppercase text-[9px] tracking-wider mb-2 flex items-center gap-1.5">
                                        <FileText size={11} className="text-purple-400" />
                                        <span>Uploaded Documents ({selectedDetailsBooking.rawBooking.documents.length})</span>
                                    </h4>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {selectedDetailsBooking.rawBooking.documents.map((doc: any, idx: number) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => {
                                                    setViewingDocumentUrl(doc.url);
                                                    setViewingDocumentName(doc.name);
                                                }}
                                                className="bg-black/40 border border-white/5 p-2 rounded-lg flex items-center gap-1.5 hover:border-primary/50 transition-colors text-left w-full focus:outline-none"
                                            >
                                                <FileText size={12} className="text-primary shrink-0" />
                                                <span className="text-[10px] font-medium text-gray-300 truncate flex-1">{doc.name}</span>
                                                <Eye size={11} className="text-gray-500 shrink-0" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Payment Breakdown & Financial Details */}
                            <div className="bg-gradient-to-br from-white/5 via-[#18181A] to-emerald-950/20 p-3 rounded-xl border border-emerald-500/20 space-y-2">
                                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                                            <Receipt size={13} className="text-emerald-400" />
                                        </div>
                                        <div>
                                            <h4 className="text-gray-300 font-bold uppercase text-[9px] tracking-wider">Payment Breakdown</h4>
                                            <p className="text-[10px] text-gray-400">Method: {selectedDetailsBooking.paymentMethod || 'HitPay (Online)'}</p>
                                        </div>
                                    </div>
                                    {(() => {
                                        const pStatus = (selectedDetailsBooking.paymentStatus || '').toString().toLowerCase();
                                        const isCancelledBooking = selectedDetailsBooking.isCancelled || selectedDetailsBooking.status === 'Cancelled' || pStatus.includes('cancelled') || pStatus.includes('canceled');
                                        const badgeText = isCancelledBooking
                                            ? (selectedDetailsBooking.paidAmount > 0 ? 'Cancelled (DP Paid)' : 'Cancelled')
                                            : selectedDetailsBooking.paymentStatus;
                                        const badgeStyle = isCancelledBooking
                                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                            : (selectedDetailsBooking.isVerified || (typeof selectedDetailsBooking.paymentStatus === 'string' && selectedDetailsBooking.paymentStatus.toLowerCase().includes('paid'))
                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20');

                                        return (
                                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${badgeStyle}`}>
                                                {badgeText}
                                            </span>
                                        );
                                    })()}
                                </div>

                                {/* Itemized Calculation */}
                                <div className="space-y-1 text-[11px] pt-1 font-mono">
                                    <div className="flex items-center justify-between text-gray-400">
                                        <span>Subtotal / Base Rate</span>
                                        <span>₱{(selectedDetailsBooking.subtotal || selectedDetailsBooking.totalAmount || 0).toLocaleString()}</span>
                                    </div>
                                    {selectedDetailsBooking.laborFee > 0 && (
                                        <div className="flex items-center justify-between text-gray-400">
                                            <span>Labor & Diagnostics Fee</span>
                                            <span>₱{selectedDetailsBooking.laborFee.toLocaleString()}</span>
                                        </div>
                                    )}
                                    {selectedDetailsBooking.platformFee > 0 && (
                                        <div className="flex items-center justify-between text-gray-400">
                                            <span>{selectedDetailsBooking.type === 'order' ? 'Shipping & Handling' : 'Platform & Convenience Fee'}</span>
                                            <span>₱{selectedDetailsBooking.platformFee.toLocaleString()}</span>
                                        </div>
                                    )}
                                    {selectedDetailsBooking.discount > 0 && (
                                        <div className="flex items-center justify-between text-emerald-400">
                                            <span>Promo Discount</span>
                                            <span>-₱{selectedDetailsBooking.discount.toLocaleString()}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between text-white font-bold text-xs sm:text-sm pt-1.5 border-t border-white/10">
                                        <span className="font-sans font-black text-gray-200">Total Amount</span>
                                        <span className={`${selectedDetailsBooking.isCancelled ? 'text-white/50 line-through' : 'text-white'} font-black`}>
                                            ₱{(selectedDetailsBooking.totalAmount || 0).toLocaleString()}
                                        </span>
                                    </div>

                                    {/* Breakdown for Partial / Downpayment Payments */}
                                    {(() => {
                                        const pStatus = (selectedDetailsBooking.paymentStatus || '').toString().toLowerCase();
                                        const isCancelledBooking = selectedDetailsBooking.isCancelled || selectedDetailsBooking.status === 'Cancelled' || pStatus.includes('cancelled') || pStatus.includes('canceled');

                                        if (isCancelledBooking) {
                                            if (selectedDetailsBooking.paidAmount > 0) {
                                                return (
                                                    <div className="pt-1.5 space-y-1 border-t border-dashed border-white/10 text-[10px]">
                                                        <div className="flex items-center justify-between text-gray-400 font-semibold">
                                                            <span>Downpayment Previously Paid</span>
                                                            <span>₱{(selectedDetailsBooking.paidAmount || 0).toLocaleString()}</span>
                                                        </div>
                                                        <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 font-sans text-[10px] leading-relaxed">
                                                            This booking has been cancelled. Remaining balance has been waived.
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return (
                                                <div className="pt-1.5 border-t border-dashed border-white/10 text-center">
                                                    <span className="text-[10px] text-rose-400 font-sans font-semibold">This booking has been cancelled.</span>
                                                </div>
                                            );
                                        }

                                        const isPartial = pStatus.includes('dp') || pStatus.includes('partial') || pStatus.includes('downpayment') || ((selectedDetailsBooking.paidAmount || 0) > 0 && (selectedDetailsBooking.paidAmount || 0) < (selectedDetailsBooking.totalAmount || 0));
                                        if (!isPartial) return null;

                                        const paidAmt = selectedDetailsBooking.paidAmount || selectedDetailsBooking.downpaymentAmount || ((selectedDetailsBooking.totalAmount || 0) * 0.5);
                                        const remainingDue = selectedDetailsBooking.remainingBalance !== undefined
                                            ? selectedDetailsBooking.remainingBalance
                                            : Math.max(0, (selectedDetailsBooking.totalAmount || 0) - paidAmt);

                                        return (
                                            <div className="pt-1.5 space-y-1 border-t border-dashed border-white/10">
                                                <div className="flex items-center justify-between text-emerald-400 font-semibold">
                                                    <span>Downpayment Paid (50%)</span>
                                                    <span>-₱{paidAmt.toLocaleString()}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-amber-400 font-bold">
                                                    <span>Remaining Balance Due</span>
                                                    <span>₱{remainingDue.toLocaleString()}</span>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons Bar - Sticky Footer */}
                        <div className="shrink-0 pt-3 pb-1 border-t border-white/10 bg-[#141416] flex flex-wrap sm:flex-nowrap gap-2 items-center justify-end">
                            {/* Pay Balance Action Button for Rental or Service Bookings with remaining balance */}
                            {(() => {
                                const pStatus = (selectedDetailsBooking.paymentStatus || '').toString().toLowerCase();
                                const isPartial = pStatus.includes('dp') || pStatus.includes('partial') || pStatus.includes('downpayment') || ((selectedDetailsBooking.paidAmount || 0) > 0 && (selectedDetailsBooking.paidAmount || 0) < (selectedDetailsBooking.totalAmount || 0));
                                const remainingDue = selectedDetailsBooking.remainingBalance !== undefined
                                    ? selectedDetailsBooking.remainingBalance
                                    : (isPartial ? Math.max(0, (selectedDetailsBooking.totalAmount || 0) - (selectedDetailsBooking.paidAmount || selectedDetailsBooking.downpaymentAmount || 0)) : 0);

                                if (remainingDue > 0 && !selectedDetailsBooking.isCancelled) {
                                    return (
                                        <button
                                            onClick={() => {
                                                const target = selectedDetailsBooking;
                                                setSelectedDetailsBooking(null);
                                                if (target.type === 'liaison' || target.type === 'rental' || target.type === 'driver') {
                                                    setBalanceBookingForModal(target);
                                                } else {
                                                    navigate(`/customer-portal/booking-detail/${target.id}`, { state: { booking: target } });
                                                }
                                            }}
                                            className="flex-1 min-w-[140px] bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-black py-2 px-3 rounded-xl border border-emerald-400/40 transition-all text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-95 cursor-pointer"
                                        >
                                            <CreditCard size={14} />
                                            <span>Pay Balance (₱{remainingDue.toLocaleString()})</span>
                                        </button>
                                    );
                                }
                                return null;
                            })()}
                            {(selectedDetailsBooking.type === 'maintenance' || selectedDetailsBooking.type === 'liaison' || selectedDetailsBooking.type === 'rental') && (
                                <button
                                    onClick={() => {
                                        const target = selectedDetailsBooking;
                                        const url = target.detailsUrl || `/customer-portal/booking-detail/${target.id}${target.type === 'liaison' ? '?service=liaison' : target.type === 'rental' ? '?service=rental' : ''}`;
                                        setSelectedDetailsBooking(null);
                                        navigate(url, { state: { booking: target } });
                                    }}
                                    className="flex-1 min-w-[120px] bg-primary hover:bg-orange-600 text-black font-black py-2 px-3 rounded-xl border border-primary/20 transition-all text-xs flex items-center justify-center gap-1.5 shadow-md shadow-primary/10 cursor-pointer"
                                >
                                    <ExternalLink size={12} />
                                    <span>Open Full Booking</span>
                                </button>
                            )}

                            {selectedDetailsBooking.type === 'order' && (
                                <button
                                    onClick={() => {
                                        setSelectedDetailsBooking(null);
                                        navigate(`/customer-portal/order-history?id=${selectedDetailsBooking.id}`);
                                    }}
                                    className="flex-1 min-w-[120px] bg-cyan-500 hover:bg-cyan-600 text-black font-black py-2 px-3 rounded-xl border border-cyan-400/20 transition-all text-xs flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/10"
                                >
                                    <Package size={12} />
                                    <span>Track Shipment</span>
                                </button>
                            )}

                            {selectedDetailsBooking.isActive && (
                                <button
                                    onClick={() => {
                                        const target = selectedDetailsBooking;
                                        setSelectedDetailsBooking(null);
                                        if (target.type === 'maintenance' && target.id) {
                                            navigate(`/customer-portal/booking-detail/${target.id}?track=true`);
                                        } else if (target.type === 'order') {
                                            setActiveOrderForTracking(target);
                                        } else {
                                            navigate('/customer-portal/support-chat');
                                        }
                                    }}
                                    className="bg-emerald-500 hover:bg-emerald-600 text-black font-black py-2 px-3 rounded-xl border border-emerald-400/20 transition-all text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/10"
                                >
                                    <Navigation size={12} />
                                    <span>Live Map</span>
                                </button>
                            )}

                            {selectedDetailsBooking.isCancelable && (
                                <button
                                    onClick={() => {
                                        const target = selectedDetailsBooking;
                                        setSelectedDetailsBooking(null);
                                        setBookingToCancel(target);
                                    }}
                                    className="bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold py-2 px-3 rounded-xl border border-red-500/20 transition-all text-xs flex items-center justify-center gap-1.5 active:scale-95"
                                >
                                    <X size={12} />
                                    <span>Cancel Booking</span>
                                </button>
                            )}

                            {selectedDetailsBooking.isCancelled && (
                                <button
                                    onClick={() => {
                                        const target = selectedDetailsBooking;
                                        setSelectedDetailsBooking(null);
                                        setTransactionToRemove(target);
                                    }}
                                    className="bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold py-2 px-3 rounded-xl border border-red-500/20 transition-all text-xs flex items-center justify-center gap-1.5 active:scale-95"
                                >
                                    <Trash2 size={12} />
                                    <span>Remove Record</span>
                                </button>
                            )}

                            <button
                                onClick={() => setSelectedDetailsBooking(null)}
                                className="bg-white/10 hover:bg-white/20 text-white font-bold py-2 px-4 rounded-xl border border-white/10 transition-all text-xs shrink-0"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Remove Cancelled Record Confirmation Modal */}
            {transactionToRemove && (
                <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
                    <div className="bg-[#18181B] border border-white/10 rounded-2xl sm:rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl relative animate-scaleUp">
                        {/* Close button */}
                        <button
                            onClick={() => setTransactionToRemove(null)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-full border border-white/5"
                        >
                            <X size={15} />
                        </button>

                        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center mb-4 text-red-400">
                            <Trash2 size={22} />
                        </div>

                        <h3 className="text-white font-black text-base sm:text-lg">Remove Cancelled Record?</h3>
                        <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                            This will permanently remove <span className="text-white font-bold">{transactionToRemove.title}</span> (#{transactionToRemove.refCode}) from your activity feed.
                        </p>

                        <div className="flex gap-2.5 sm:gap-3 mt-6">
                            <button
                                disabled={isRemoving}
                                onClick={() => setTransactionToRemove(null)}
                                className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-2.5 rounded-xl border border-white/5 transition-all text-xs active:scale-95"
                            >
                                Keep It
                            </button>
                            <button
                                disabled={isRemoving}
                                onClick={() => handleRemoveCancelledTransaction(transactionToRemove)}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl transition-all text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/20 active:scale-95"
                            >
                                {isRemoving ? <Spinner size="sm" /> : 'Yes, Remove'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Premium Document Viewer Modal */}
            {viewingDocumentUrl && (
                <div 
                    className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-fadeIn"
                    onClick={() => setViewingDocumentUrl(null)}
                >
                    <div 
                        className="relative max-w-3xl w-full bg-[#151517] border border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-2xl animate-scaleUp"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex justify-between items-center px-4 py-3 bg-white/[0.02] border-b border-white/5">
                            <div className="flex items-center gap-2 min-w-0">
                                <FileText size={14} className="text-primary" />
                                <span className="text-xs font-black text-white truncate max-w-[200px] sm:max-w-md">{viewingDocumentName}</span>
                            </div>
                            <button
                                onClick={() => setViewingDocumentUrl(null)}
                                className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                            >
                                <X size={14} />
                            </button>
                        </div>
                        
                        {/* Image/File Body */}
                        <div className="p-4 flex items-center justify-center min-h-[300px] max-h-[80vh] overflow-auto bg-black/20">
                            {viewingDocumentUrl.endsWith('.pdf') ? (
                                <iframe 
                                    src={viewingDocumentUrl} 
                                    className="w-full h-[60vh] border-none rounded-lg"
                                    title={viewingDocumentName}
                                />
                            ) : (
                                <img
                                    src={viewingDocumentUrl}
                                    alt={viewingDocumentName}
                                    className="max-w-full max-h-[70vh] object-contain rounded-lg border border-white/5"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = getFallbackImageForCategory('Liason Services');
                                    }}
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Transaction Cancellation Details Modal */}
            {cancelledData && (
                <CancellationDetailsModal
                    data={cancelledData}
                    onClose={() => setCancelledData(null)}
                />
            )}

            {/* Realtime Order Delivery Live Route Map Modal */}
            {activeOrderForTracking && (() => {
                const { store, customer } = resolveOrderTrackingLocations(activeOrderForTracking, user, db?.settings);
                const orderRef = activeOrderForTracking.refCode || (activeOrderForTracking.id ? `ORD-${activeOrderForTracking.id.slice(-6).toUpperCase()}` : 'ORDER');
                const orderData = activeOrderForTracking.rawBooking || activeOrderForTracking;

                return (
                    <LiveRouteMapModal
                        isOpen={true}
                        onClose={() => setActiveOrderForTracking(null)}
                        trackingType="order"
                        customerLocation={{
                            lat: customer.lat,
                            lng: customer.lng,
                            address: customer.address
                        }}
                        mechanicLocation={{
                            lat: store.lat,
                            lng: store.lng,
                            address: store.address
                        }}
                        deliveryRider={{
                            name: 'Carlos Mendoza',
                            phone: '+63 917 555 8921',
                            vehicle: 'Honda Click 150i (Store Courier)',
                            imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
                            plateNumber: 'RB-8821-EX'
                        }}
                        customerName={customer.name}
                        customerPhone={customer.phone || user?.phone || ''}
                        customerAddress={customer.address}
                        destinationAddress={customer.address}
                        originAddress={store.address}
                        title={`Store Delivery Route — #${orderRef}`}
                        status={activeOrderForTracking.status || 'En Route'}
                        eta="18 mins"
                        etaNote="Dispatched from RidersBUD Parts & Tools Store Hub"
                        orderNumber={orderRef}
                        onCallCustomer={() => {
                            if (customer.phone) window.open(`tel:${customer.phone}`);
                            else navigate('/customer-portal/support-chat');
                        }}
                        onChatCustomer={() => {
                            setActiveOrderForTracking(null);
                            navigate('/customer-portal/support-chat');
                        }}
                        appLogoUrl={db?.settings?.mapLogoUrl || db?.settings?.appLogoUrl || '/ridersbud_logo.png'}
                    />
                );
            })()}

            {/* Settle Remaining Balance Modal for Car Rental, Liaison & Driver Assistance */}
            {balanceBookingForModal && (() => {
                const targetBooking = balanceBookingForModal;
                const isRental = targetBooking.type === 'rental';
                const isLiaison = targetBooking.type === 'liaison';
                const isDriver = targetBooking.type === 'driver';
                const totalAmount = Number(targetBooking.totalAmount) || 0;
                const paidDownpayment = Number(targetBooking.paidAmount) || Number(targetBooking.downpaymentAmount) || Math.round(totalAmount * 0.5);
                const remainingBalance = targetBooking.remainingBalance !== undefined && targetBooking.remainingBalance > 0
                    ? targetBooking.remainingBalance
                    : Math.max(0, totalAmount - paidDownpayment);

                const isManualGcashEnabled = db?.settings?.gcashEnabled ?? false;
                const isHitPayActive = HitPayService.isGatewayActive(db?.settings);
                const itemTitle = isRental
                    ? (targetBooking.title ? targetBooking.title.replace(/^Rental:\s*/i, '') : (targetBooking.rawBooking?.carName || 'Rental Vehicle'))
                    : isLiaison
                    ? (targetBooking.title || `LTO: ${targetBooking.rawBooking?.serviceType || 'Registration Assistance'}`)
                    : (targetBooking.title || 'Driver for Hire Service');

                const vehicleIdentifier = targetBooking.plateNumber 
                    || targetBooking.rawBooking?.vehicleDetails?.plateNumber 
                    || targetBooking.rawBooking?.plateNumber 
                    || targetBooking.vehicleDesc 
                    || (isLiaison ? 'your registered vehicle' : isRental ? 'rental fleet vehicle' : 'assigned vehicle');

                return (
                    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
                        <div className="relative w-full max-w-md bg-[#161618] rounded-3xl p-5 sm:p-6 border border-primary/30 shadow-[0_0_50px_rgba(249,115,22,0.15)] animate-modal-scale-up space-y-4 text-left">
                            
                            {/* Close Modal Button (X) */}
                            <button
                                onClick={() => setBalanceBookingForModal(null)}
                                className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition"
                            >
                                <X size={18} />
                            </button>

                            {/* Top Header Badge & Icon */}
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                                    <CheckCircle size={26} className="text-emerald-400" />
                                </div>
                                <div className="flex-1 min-w-0 pr-6">
                                    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full mb-1">
                                        {isRental ? <><Car size={10} /> Rental Reservation</> : isLiaison ? <><Shield size={10} /> LTO Liaison Assistance</> : <><Navigation size={10} /> Driver for Hire</>}
                                    </span>
                                    <h3 className="text-lg font-black text-white leading-tight">
                                        Settle Remaining Balance
                                    </h3>
                                </div>
                            </div>

                            <p className="text-xs text-gray-400 leading-relaxed">
                                {isRental ? (
                                    <>Your vehicle reservation for <strong className="text-white">{itemTitle}</strong> is active. Payment of the remaining balance is required to finalize your car rental booking.</>
                                ) : isLiaison ? (
                                    <>Your registration documents for <strong className="text-white">{vehicleIdentifier}</strong> have been processed. Payment of the remaining balance is required to finalize and release your documents.</>
                                ) : (
                                    <>Your chauffeur service for <strong className="text-white">{itemTitle}</strong> is ready. Payment of the remaining balance is required to finalize your booking.</>
                                )}
                            </p>

                            {/* Financial Breakdown Card */}
                            <div className="bg-black/50 border border-white/5 rounded-2xl p-4 space-y-2.5 font-sans">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-400">{isRental ? 'Rental Vehicle:' : isLiaison ? 'Service:' : 'Service Type:'}</span>
                                    <span className="text-white font-bold truncate max-w-[200px] text-right">{itemTitle}</span>
                                </div>
                                {targetBooking.dateTimeStr && (
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-400">{isRental ? 'Duration / Dates:' : 'Schedule:'}</span>
                                        <span className="text-white font-bold">{targetBooking.dateTimeStr}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-400">{isRental ? 'Total Rental Amount:' : isLiaison ? 'Total Liaison Fee:' : 'Total Service Fee:'}</span>
                                    <span className="text-white font-bold">₱{totalAmount.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs text-emerald-400">
                                    <span className="flex items-center gap-1">
                                        <CheckCircle size={11} /> 50% Downpayment Paid:
                                    </span>
                                    <span className="font-bold">-₱{paidDownpayment.toLocaleString()}</span>
                                </div>

                                <div className="pt-2.5 border-t border-white/10 flex justify-between items-end">
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">TOTAL BALANCE DUE</p>
                                        <p className="text-2xl font-black text-emerald-400 mt-0.5 leading-none">
                                            ₱{remainingBalance.toLocaleString()}
                                        </p>
                                    </div>
                                    <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                                        Payment Required
                                    </span>
                                </div>
                            </div>

                            {/* Payment Actions */}
                            <div className="space-y-2 pt-1">
                                <button
                                    onClick={() => handleInitiateHitPayBalance(targetBooking)}
                                    disabled={isInitiatingHitPayBalance}
                                    className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-black py-3.5 rounded-xl text-xs tracking-widest uppercase flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                                >
                                    {isInitiatingHitPayBalance ? (
                                        <>
                                            <Spinner size="sm" color="text-white" />
                                            <span>Redirecting to Payment Gateway...</span>
                                        </>
                                    ) : (
                                        <>
                                            <CreditCard size={15} />
                                            <span>PAY BALANCE WITH HITPAY ONLINE</span>
                                        </>
                                    )}
                                </button>

                                {isManualGcashEnabled && (
                                    <button
                                        onClick={() => setShowBalanceGCashModal(true)}
                                        className="w-full bg-white/5 hover:bg-white/10 text-gray-300 font-bold py-2.5 rounded-xl text-xs tracking-wider transition-all border border-white/5 cursor-pointer"
                                    >
                                        Pay via Manual GCash QR & Upload
                                    </button>
                                )}
                            </div>

                            {/* Mandatory Lock Notice Footer */}
                            <div className="p-2 bg-amber-500/5 border border-amber-500/10 rounded-xl text-center">
                                <p className="text-[10px] text-amber-400/90 font-medium">
                                    🔒 <strong>Mandatory Payment:</strong> Balance payment is required to finalize and release your {isRental ? 'car rental booking' : isLiaison ? 'documents' : 'chauffeur booking'}.
                                </p>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Manual GCash Payment Modal for Rental, Liaison & Driver Balance */}
            {showBalanceGCashModal && balanceBookingForModal && (() => {
                const targetBooking = balanceBookingForModal;
                const isRental = targetBooking.type === 'rental';
                const isLiaison = targetBooking.type === 'liaison';
                const isDriver = targetBooking.type === 'driver';
                const totalAmount = Number(targetBooking.totalAmount) || 0;
                const paidDownpayment = Number(targetBooking.paidAmount) || Number(targetBooking.downpaymentAmount) || Math.round(totalAmount * 0.5);
                const balanceDue = targetBooking.remainingBalance !== undefined && targetBooking.remainingBalance > 0
                    ? targetBooking.remainingBalance
                    : Math.max(0, totalAmount - paidDownpayment);

                const paymentLabel = isRental 
                    ? "CAR RENTAL REMAINING BALANCE (50%)" 
                    : isLiaison 
                    ? "LTO LIAISON REMAINING BALANCE (50%)" 
                    : "DRIVER FOR HIRE REMAINING BALANCE (50%)";

                return (
                    <GCashPaymentModal
                        bookingId={targetBooking.id}
                        totalAmount={totalAmount}
                        paymentAmount={balanceDue}
                        paymentLabel={paymentLabel}
                        customerName={targetBooking.customerName || user?.name || 'Customer'}
                        isRental={isRental}
                        isLiaison={isLiaison}
                        isServiceRequest={isDriver}
                        services={[{ name: targetBooking.title || (isRental ? 'Car Rental Reservation' : isLiaison ? 'LTO Liaison Assistance' : 'Driver for Hire Service'), price: totalAmount }]}
                        onPaymentVerified={async () => {
                            setShowBalanceGCashModal(false);
                            if (isRental && updateRentalBooking) {
                                await updateRentalBooking(targetBooking.id, {
                                    paidAmount: totalAmount,
                                    paymentStatus: 'paid',
                                    isPaid: true,
                                    isVerified: true,
                                    remainingBalance: 0,
                                    balancePaid: true,
                                    balancePaidAt: new Date().toISOString(),
                                    paymentMethod: 'Manual GCash QR'
                                } as any);
                            } else if (isLiaison && updateLiaisonBooking) {
                                await updateLiaisonBooking(targetBooking.id, {
                                    paidAmount: totalAmount,
                                    paymentStatus: 'paid',
                                    isPaid: true,
                                    isVerified: true,
                                    remainingBalance: 0,
                                    balancePaid: true,
                                    balancePaidAt: new Date().toISOString(),
                                    paymentMethod: 'Manual GCash QR',
                                    status: 'Completed'
                                } as any);
                            } else if (isDriver && updateServiceRequest) {
                                await updateServiceRequest(targetBooking.id, {
                                    paidAmount: totalAmount,
                                    paymentStatus: 'paid',
                                    isPaid: true,
                                    isVerified: true,
                                    remainingBalance: 0,
                                    balancePaid: true,
                                    balancePaidAt: new Date().toISOString(),
                                    paymentMethod: 'Manual GCash QR',
                                    status: 'Completed'
                                } as any);
                            }
                            setBalanceBookingForModal(null);
                            addNotification({
                                recipientId: user?.id || 'all',
                                recipientRole: 'customer',
                                title: `✅ ${isRental ? 'Rental' : isLiaison ? 'Liaison' : 'Driver'} Balance Payment Received`,
                                message: `Your manual GCash balance receipt for ${targetBooking.title} was submitted and recorded!`,
                                type: 'info'
                            });
                        }}
                        onClose={() => setShowBalanceGCashModal(false)}
                    />
                );
            })()}
        </div>
    );
};

export default HomeScreen;
