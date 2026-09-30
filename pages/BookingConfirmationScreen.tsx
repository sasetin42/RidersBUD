import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import CustomerHeader from '../components/CustomerHeader';
import { CheckCircle2, Clock, ShieldCheck, Star, Calendar, Car, Wrench, CreditCard, Sparkles, ChevronRight, AlertCircle } from 'lucide-react';
import { Booking } from '../types';
import { useAuth } from '../context/AuthContext';
import { useDatabase } from '../context/DatabaseContext';
import CustomerMechanicChatModal from '../components/customer/CustomerMechanicChatModal';
import MapComponent from '../components/MapComponent';
import { db as firestore } from '../firebase';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { normalizeServiceImage } from '../utils/fallbackImages';
import { seedServices } from '../data/mockData';

declare const L: any;

const BookingConfirmationScreen: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user: customer } = useAuth();
    const { db: database, cancelBooking } = useDatabase();
    const locationState = (location.state as { bookings?: Booking[]; bookingId?: string }) || {};
    const [bookings, setBookings] = useState<Booking[]>(locationState.bookings || []);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [showRedirectNotification, setShowRedirectNotification] = useState(false);
    const [isLoading, setIsLoading] = useState(!locationState.bookings?.length && !!locationState.bookingId);

    // If return from payment with status=canceled or status=failed, cancel and redirect with modal
    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const status = queryParams.get('status') || queryParams.get('hitpay');
        const bookingId = queryParams.get('bookingId') || locationState.bookingId;

        if (status === 'canceled' || status === 'cancelled' || status === 'failed' || status === 'expired' || status === 'abort') {
            const pendingTx = sessionStorage.getItem('pendingHitPayBookingTx') || localStorage.getItem('last_hitpay_booking_tx');
            let parsedBookingId = bookingId;
            let cancelAmount = 0;
            let cancelledItems: Array<{ name: string; quantity?: number; price?: number }> = [];

            if (pendingTx) {
                try {
                    const parsed = JSON.parse(pendingTx);
                    parsedBookingId = parsed.bookingId || parsedBookingId;
                    cancelAmount = parsed.amount || parsed.totalAmount || 0;
                    if (parsed.items && Array.isArray(parsed.items) && parsed.items.length > 0) {
                        cancelledItems = parsed.items;
                    } else if (parsed.services && Array.isArray(parsed.services)) {
                        cancelledItems = parsed.services.map((s: any) => ({
                            name: s.name || 'Vehicle Service',
                            price: s.price || 0
                        }));
                    }
                } catch (e) {}
            }

            const existingBooking = database?.bookings?.find(b => b.id === parsedBookingId);
            if (existingBooking) {
                if (cancelAmount === 0) {
                    cancelAmount = existingBooking.totalAmount || existingBooking.price || 0;
                }
                if (cancelledItems.length === 0 && existingBooking.services && existingBooking.services.length > 0) {
                    cancelledItems = existingBooking.services.map((s: any) => ({
                        name: s.name || 'Vehicle Service',
                        price: s.price || 0
                    }));
                } else if (cancelledItems.length === 0 && (existingBooking as any).service) {
                    cancelledItems = [{
                        name: (existingBooking as any).service.name || 'Vehicle Service',
                        price: (existingBooking as any).service.price || cancelAmount
                    }];
                }
            }

            sessionStorage.removeItem('pendingHitPayBookingTx');
            sessionStorage.removeItem('pendingHitPayServiceTx');
            sessionStorage.removeItem('pendingHitPayTx');
            try {
                localStorage.removeItem('last_hitpay_booking_tx');
                localStorage.removeItem('last_hitpay_service_tx');
            } catch (e) {}

            if (parsedBookingId && cancelBooking) {
                cancelBooking(parsedBookingId, 'Payment process was cancelled by customer at payment gateway.').catch(console.warn);
            }

            const cancellationInfo = {
                type: 'Service Booking' as const,
                referenceId: parsedBookingId ? (parsedBookingId.startsWith('#') ? parsedBookingId : `#${parsedBookingId.slice(-8).toUpperCase()}`) : '#TXN-CANCELLED',
                amount: cancelAmount,
                date: new Date().toLocaleString(),
                reason: 'Payment process was cancelled by the user at the payment gateway.',
                items: cancelledItems,
                retryPath: '/customer-portal/booking'
            };

            window.history.replaceState({}, document.title, window.location.pathname);
            navigate('/customer-portal/', {
                state: { cancelledTransaction: cancellationInfo },
                replace: true
            });
            return;
        }

        if (locationState.bookings?.length) {
            setBookings(locationState.bookings);
            setIsLoading(false);
            return;
        }
        const targetBookingId = bookingId || locationState.bookingId;
        if (!targetBookingId) {
            navigate('/customer-portal/');
            return;
        }

        const isLocalhost = typeof window !== 'undefined' && (
            window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1'
        );

        // 1. Check in-memory/context cache first
        const cachedBooking = database?.bookings?.find(b => b.id === targetBookingId);
        if (cachedBooking) {
            if (['Mechanic Assigned', 'En Route', 'In Progress', 'Completed'].includes(cachedBooking.status)) {
                navigate(`/customer-portal/booking-detail/${cachedBooking.id}`, { replace: true });
                return;
            }
            setBookings([cachedBooking]);
            setIsLoading(false);
            return;
        }

        // 2. Fetch the booking from Firestore using the bookingId
        setIsLoading(true);
        const bookingRef = doc(firestore, 'bookings', targetBookingId);
        getDoc(bookingRef).then(async (snapshot) => {
            if (snapshot.exists()) {
                const fetchedBooking = { id: snapshot.id, ...snapshot.data() } as Booking;
                if (['Mechanic Assigned', 'En Route', 'In Progress', 'Completed'].includes(fetchedBooking.status)) {
                    navigate(`/customer-portal/booking-detail/${fetchedBooking.id}`, { replace: true });
                } else {
                    setBookings([fetchedBooking]);
                }
            } else {
                // Check if in database.bookings after potential context sync
                const syncBooking = database?.bookings?.find(b => b.id === targetBookingId);
                if (syncBooking) {
                    setBookings([syncBooking]);
                    return;
                }
                if (isLocalhost) {
                    try {
                        const liveDataMod = await import('../data/liveData.json');
                        const localBooking = liveDataMod.default.bookings.find((b: any) => b.id === targetBookingId);
                        if (localBooking) {
                            if (['Mechanic Assigned', 'En Route', 'In Progress', 'Completed'].includes(localBooking.status)) {
                                navigate(`/customer-portal/booking-detail/${localBooking.id}`, { replace: true });
                            } else {
                                setBookings([localBooking as unknown as Booking]);
                            }
                            return;
                        }
                    } catch (_) {}
                }
                navigate('/customer-portal/');
            }
        }).catch((err) => {
            console.warn('[BookingConfirmationScreen] Firestore fetch failed:', err);
            const fallback = database?.bookings?.find(b => b.id === targetBookingId);
            if (fallback) {
                setBookings([fallback]);
            } else {
                navigate('/customer-portal/');
            }
        }).finally(() => setIsLoading(false));
    }, [database?.bookings]);

    // Real-time listener for booking status changes
    useEffect(() => {
        if (!bookings || bookings.length === 0) return;

        console.log('🔔 Setting up real-time booking listeners for', bookings.length, 'booking(s)');

        const unsubscribers = bookings.map((booking) => {
            const bookingRef = doc(firestore, 'bookings', booking.id);

            const isLocalhost = typeof window !== 'undefined' && (
                window.location.hostname === 'localhost' ||
                window.location.hostname === '127.0.0.1'
            );

            return onSnapshot(bookingRef, (snapshot) => {
                if (snapshot.exists()) {
                    const updatedBooking = { id: snapshot.id, ...snapshot.data() } as Booking;
                    const previousStatus = booking.status;
                    const newStatus = updatedBooking.status;
                    const wasVerified = booking.isVerified;
                    const isNowVerified = updatedBooking.isVerified;

                    // Keep bookings in sync with Firestore
                    setBookings(prev => prev.map(b => b.id === updatedBooking.id ? updatedBooking : b));

                    console.log(`📊 Booking ${booking.id} update:`, {
                        previous: previousStatus,
                        current: newStatus,
                        wasVerified,
                        isNowVerified,
                        mechanicAssigned: !!updatedBooking.mechanic
                    });

                    // Payment just got verified — update UI in real-time
                    if (!wasVerified && isNowVerified) {
                        console.log('✅ Payment verified in real-time! Updating confirmation screen...');
                        // UI updates via setBookings above — no navigation needed
                    }

                    if (updatedBooking.gcashPaymentStatus === 'declined' || updatedBooking.status === 'Cancelled') {
                        console.log('❌ Downpayment declined! Redirecting customer to home page...');
                        navigate('/customer-portal/', { replace: true });
                    }

                    if (
                        previousStatus !== newStatus &&
                        (newStatus === 'Mechanic Assigned' ||
                            newStatus === 'En Route' ||
                            newStatus === 'In Progress' ||
                            newStatus === 'Completed')
                    ) {
                        console.log('✅ Mechanic accepted! Auto-redirecting to track status...');
                        setShowRedirectNotification(true);
                        setTimeout(() => {
                            navigate(`/customer-portal/booking-detail/${booking.id}`, {
                                replace: true,
                                state: {
                                    message: 'Your mechanic has accepted the job!'
                                }
                            });
                        }, 2000);
                    }
                }
            }, async (error) => {
                if (error?.code === 'permission-denied' && isLocalhost) {
                    const liveDataMod = await import('../data/liveData.json');
                    const localBooking = liveDataMod.default.bookings.find((b: any) => b.id === booking.id);
                    if (localBooking) {
                        setBookings(prev => prev.map(b => b.id === booking.id ? localBooking as unknown as Booking : b));
                    }
                } else {
                    console.error('❌ Error listening to booking updates:', error);
                }
            });
        });

        return () => {
            unsubscribers.forEach(unsubscribe => { try { unsubscribe(); } catch (_) {} });
        };
    }, [bookings.length, navigate]);

    const primaryBooking = bookings[0] || {} as any;
    const { mechanic, vehicle } = primaryBooking;

    // Derive the effective service list — bookings may use `services[]` (new) or `service` (legacy)
    const getServiceList = (b: Booking) => {
        if (!b) return [];
        if (b.services && b.services.length > 0) return b.services;
        if ((b as any).service) return [(b as any).service];
        return [];
    };

    const totalCost = primaryBooking.totalAmount ??
        bookings.reduce((sum, b) => sum + getServiceList(b).reduce((s, svc) => s + (svc.price || 0), 0), 0);
    const totalDuration = bookings.reduce(
        (sum, b) => sum + getServiceList(b).reduce((s, svc) => s + (svc.duration || 60), 0), 0
    );

    // Compute 50% Initial Downpayment and remaining Balance
    const downpaymentAmount = primaryBooking.paidAmount != null && Number(primaryBooking.paidAmount) > 0
        ? Number(primaryBooking.paidAmount)
        : (totalCost * 0.5);
    const balanceAmount = Math.max(0, totalCost - downpaymentAmount);

    const getServiceImage = (svc: any) => {
        const matchedService = database?.services?.find(s => s.id === svc.id || s.name?.toLowerCase() === svc.name?.toLowerCase()) ||
                               seedServices.find(s => s.id === svc.id || s.name?.toLowerCase() === svc.name?.toLowerCase());
        const rawImage = svc.imageUrl || svc.image || matchedService?.imageUrl;
        return normalizeServiceImage(rawImage, svc.name, svc.category || matchedService?.category);
    };

    const serviceLocation = primaryBooking.location;
    const notes = primaryBooking.notes;

    const mapMarkers = useMemo(() => serviceLocation && typeof L !== 'undefined' ? [{
        id: 'service-location',
        position: [serviceLocation.lat, serviceLocation.lng] as [number, number],
        popupContent: 'Service Location',
        icon: L.divIcon({
            html: `<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-primary animate-pulse" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 21l-4.95-6.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" /></svg>`,
            className: 'bg-transparent border-0',
            iconSize: [32, 32],
            iconAnchor: [16, 32]
        })
    }] : [], [serviceLocation]);

    const googleMapsLink = serviceLocation
        ? `https://www.google.com/maps/search/?api=1&query=${serviceLocation.lat},${serviceLocation.lng}`
        : '';

    const handleSetReminder = () => {
        const firstService = getServiceList(primaryBooking)[0];
        navigate('/customer-portal/reminders', {
            state: {
                serviceName: firstService?.name || 'Service',
                date: primaryBooking.date,
                vehicle: primaryBooking.vehicle ? `${primaryBooking.vehicle.make} ${primaryBooking.vehicle.model}` : ''
            }
        });
    };

    const handleBookAgain = () => {
        const allServices = bookings.flatMap(b => getServiceList(b));
        const serviceIds = allServices.map(s => s.id).filter(Boolean);
        navigate(`/customer-portal/booking/${serviceIds[0] || ''}`, {
            state: {
                vehiclePlateNumber: primaryBooking.vehicle?.plateNumber || '',
                initialServiceIds: serviceIds
            }
        });
    };

    // Conditional early returns placed after all Hook declarations to comply with React standards
    if (isLoading || !customer) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-secondary">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-3"></div>
                <p className="text-gray-400 text-sm font-medium">Loading booking details...</p>
            </div>
        );
    }

    if (!bookings || bookings.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-secondary">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-3"></div>
                <p className="text-gray-400 text-sm font-medium">Loading booking details...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#121212] text-white">
            <CustomerHeader title={`Booking #${primaryBooking.id ? primaryBooking.id.slice(-6).toUpperCase() : 'DETAILS'}`} icon={<CheckCircle2 size={20} className="text-green-400" />} />
            
            <div className="flex-grow flex flex-col p-3.5 sm:p-5 space-y-4 overflow-y-auto pb-8 max-w-lg mx-auto w-full">

                {/* Mechanic Accepted - Auto Redirect Notification */}
                {showRedirectNotification && (
                    <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-3.5 border border-green-400/50 shadow-xl shadow-green-500/20 animate-pulse">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                                <CheckCircle2 size={22} className="text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-white font-bold text-sm">🎉 Mechanic Accepted!</h3>
                                <p className="text-white/90 text-xs truncate">Redirecting to status tracker...</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Compact Success / Verification Hero Banner */}
                <div className="text-center pt-1 pb-2">
                    {primaryBooking.paymentMethod === 'GCash' && !primaryBooking.isVerified ? (
                        <>
                            <div className="w-14 h-14 bg-yellow-500/10 rounded-2xl flex items-center justify-center mx-auto mb-2.5 border border-yellow-500/30">
                                <Clock size={28} className="text-yellow-400 animate-pulse" />
                            </div>
                            <h2 className="text-xl font-black text-white tracking-tight">Awaiting Payment Verification</h2>
                            <p className="text-gray-400 mt-1 max-w-xs mx-auto text-xs leading-relaxed">
                                Your GCash receipt was submitted. Admin will verify your downpayment shortly.
                            </p>
                            <div className="mt-2 inline-flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-0.5 rounded-full">
                                <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-ping" />
                                <span className="text-yellow-400 text-[10px] font-bold uppercase tracking-wider">Verification in Progress</span>
                            </div>
                        </>
                    ) : primaryBooking.paymentMethod === 'GCash' && primaryBooking.isVerified ? (
                        <>
                            <div className="w-14 h-14 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-2.5 border border-green-500/30 shadow-lg shadow-green-500/10">
                                <ShieldCheck size={30} className="text-green-400" />
                            </div>
                            <h2 className="text-xl font-black text-white tracking-tight">🎉 Payment Verified!</h2>
                            <p className="text-gray-400 mt-1 max-w-xs mx-auto text-xs leading-relaxed">
                                Your GCash downpayment has been confirmed. Your booking is active!
                            </p>
                            <p className="text-primary mt-2 text-xs font-bold animate-pulse flex items-center justify-center gap-1">
                                <span>⏳</span> Waiting for mechanic to accept...
                            </p>
                        </>
                    ) : (
                        <>
                            <div className="w-14 h-14 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-2.5 border border-green-500/30 shadow-lg shadow-green-500/10">
                                <CheckCircle2 size={30} className="text-green-400" />
                            </div>
                            <h2 className="text-xl font-black text-white tracking-tight">Appointment Set!</h2>
                            <p className="text-gray-400 mt-1 max-w-xs mx-auto text-xs leading-relaxed">
                                Your booking has been confirmed. You can track status in real-time.
                            </p>
                            <p className="text-primary mt-2 text-xs font-bold animate-pulse flex items-center justify-center gap-1">
                                <span>⏳</span> Waiting for mechanic to accept...
                            </p>
                        </>
                    )}
                </div>

                {/* Main Compact Content Container */}
                <div className="bg-[#181818] rounded-2xl overflow-hidden shadow-xl border border-white/5 space-y-3.5 p-3.5 sm:p-4">
                    <div className="-mt-3.5 -mx-3.5 sm:-mt-4 sm:-mx-4 h-1 bg-gradient-to-r from-green-500 via-primary to-green-500"></div>

                    {/* 1. Services Summary with Uploaded Image Preview */}
                    <div className="bg-[#141414] rounded-xl p-3 sm:p-3.5 border border-white/5 space-y-2.5">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-1.5">
                                <Wrench size={13} className="text-primary" />
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Booked Services</span>
                            </div>
                            <span className="text-[11px] bg-white/5 px-2 py-0.5 rounded-md text-gray-300 flex items-center gap-1 font-medium">
                                <Clock size={11} className="text-gray-400" />
                                ~{totalDuration} mins
                            </span>
                        </div>

                        <div className="divide-y divide-white/5">
                            {bookings.flatMap(book => getServiceList(book)).map((svc, idx) => {
                                const svcImage = getServiceImage(svc);
                                return (
                                    <div key={`${svc.id}-${idx}`} className="py-2.5 first:pt-1 last:pb-0 flex items-center gap-3">
                                        <img
                                            src={svcImage}
                                            alt={svc.name}
                                            className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover border border-white/10 flex-shrink-0 bg-neutral-900 shadow-sm"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = '/riders-logo.png';
                                            }}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white font-bold text-sm truncate leading-tight">{svc.name}</p>
                                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                {svc.category && (
                                                    <span className="text-[10px] font-semibold text-orange-400/90 bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/20">
                                                        {svc.category}
                                                    </span>
                                                )}
                                                <span className="text-[11px] text-gray-400">
                                                    {svc.duration || svc.estimatedTime || 'Standard'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-primary font-black text-sm">
                                                {svc.price > 0 ? `₱${svc.price.toLocaleString()}` : <span className="bg-blue-500/20 text-blue-400 text-[10px] px-1.5 py-0.5 rounded font-bold">QUOTE</span>}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* 2. Financial Breakdown: Total, 50% Initial Downpayment & Balance */}
                    <div className="bg-[#141414] rounded-xl p-3 sm:p-3.5 border border-white/5 space-y-2.5">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-1.5">
                                <CreditCard size={13} className="text-green-400" />
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Payment Breakdown</span>
                            </div>
                            <span className="text-[10px] font-semibold text-gray-400 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                                {primaryBooking.paymentMethod || 'GCash'}
                            </span>
                        </div>

                        <div className="space-y-2 pt-0.5">
                            {/* Total Estimated Cost */}
                            <div className="flex justify-between items-center text-xs text-gray-300 px-1">
                                <span className="text-gray-400 font-medium">Estimated Total</span>
                                <span className="font-black text-white text-base">₱{totalCost.toLocaleString()}</span>
                            </div>

                            {/* 50% Initial Downpayment Card */}
                            <div className="flex justify-between items-center text-xs bg-orange-500/[0.04] p-2.5 rounded-xl border border-orange-500/20">
                                <div className="space-y-0.5">
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-bold text-orange-400 text-xs">50% Initial DP</span>
                                        {primaryBooking.isVerified || primaryBooking.paymentStatus === 'downpayment_paid' || (primaryBooking.paidAmount && primaryBooking.paidAmount > 0) ? (
                                            <span className="text-[9px] font-bold text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20 flex items-center gap-0.5">
                                                <CheckCircle2 size={10} /> Paid {primaryBooking.paymentMethod?.includes('HitPay') ? '(HitPay Verified)' : ''}
                                            </span>
                                        ) : primaryBooking.paymentMethod === 'GCash' ? (
                                            <span className="text-[9px] font-bold text-yellow-400 bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20 flex items-center gap-0.5">
                                                <Clock size={10} /> Submitted
                                            </span>
                                        ) : (
                                            <span className="text-[9px] font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                                                Required
                                            </span>
                                        )}
                                    </div>
                                    {primaryBooking.downpaymentRef || primaryBooking.hitpayReference || primaryBooking.gcashDownpaymentReference ? (
                                        <p className="text-[10px] text-gray-400 font-mono">
                                            Ref: {primaryBooking.downpaymentRef || primaryBooking.hitpayReference || primaryBooking.gcashDownpaymentReference}
                                        </p>
                                    ) : (
                                        <p className="text-[10px] text-gray-400">Reservation deposit</p>
                                    )}
                                </div>
                                <span className="font-black text-orange-400 text-sm">₱{downpaymentAmount.toLocaleString()}</span>
                            </div>

                            {/* Remaining Balance Card */}
                            <div className="flex justify-between items-center text-xs bg-black/30 p-2.5 rounded-xl border border-white/5">
                                <div className="space-y-0.5">
                                    <span className="font-bold text-gray-200 text-xs">Balance Payment</span>
                                    <p className="text-[10px] text-gray-400">Payable upon job completion</p>
                                </div>
                                <span className="font-bold text-gray-200 text-sm">₱{balanceAmount.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* 3. Schedule & Vehicle Details (Compact 2-Item Responsive Grid) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {/* Schedule Card */}
                        <div className="bg-[#141414] rounded-xl p-3 border border-white/5 flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 flex-shrink-0 border border-blue-500/20">
                                <Calendar size={18} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Schedule</p>
                                <p className="text-white font-bold text-xs truncate">
                                    {primaryBooking.date ? new Date(primaryBooking.date.replace(/-/g, '/')).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date Pending'}
                                </p>
                                <p className="text-blue-400 text-xs font-semibold">{primaryBooking.time || 'Time Pending'}</p>
                            </div>
                        </div>

                        {/* Vehicle Card */}
                        <div className="bg-[#141414] rounded-xl p-3 border border-white/5 flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-xl bg-gray-800/60 flex items-center justify-center text-gray-400 flex-shrink-0 overflow-hidden border border-white/10">
                                {vehicle?.imageUrls && vehicle.imageUrls.length > 0 ? (
                                    <img
                                        src={vehicle.imageUrls[0]}
                                        alt={`${vehicle.make} ${vehicle.model}`}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = "/assets/car_mockup.png";
                                        }}
                                    />
                                ) : (
                                    <Car size={18} className="text-gray-400" />
                                )}
                            </div>
                            <div className="min-w-0">
                                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Vehicle</p>
                                <p className="text-white font-bold text-xs truncate">
                                    {vehicle ? `${vehicle.year || ''} ${vehicle.make || ''} ${vehicle.model || ''}`.trim() : 'Vehicle Assigned'}
                                </p>
                                <span className="text-[10px] text-gray-400 font-mono bg-black/40 px-1.5 py-0.5 rounded inline-block mt-0.5 border border-white/5">
                                    {vehicle?.plateNumber || 'No Plate'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* 4. Mechanic Card (Compact) */}
                    {mechanic && (
                        <div className="bg-[#141414] rounded-xl p-3 sm:p-3.5 border border-white/5 space-y-2.5">
                            <div className="flex items-center justify-between">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Assigned Mechanic</p>
                                <div className="flex items-center gap-1 text-yellow-400 text-xs">
                                    <Star size={11} className="fill-yellow-400 text-yellow-400" />
                                    <span className="font-bold text-[11px]">{(mechanic.rating || 0).toFixed(1)}</span>
                                    <span className="text-gray-500 text-[10px]">({mechanic.reviews || mechanic.totalJobs || 0} jobs)</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <img 
                                        src={mechanic.imageUrl || '/riders-logo.png'} 
                                        alt={mechanic.name} 
                                        className="w-10 h-10 rounded-xl object-cover border border-primary/30 flex-shrink-0 bg-neutral-900" 
                                        onError={(e) => { (e.target as HTMLImageElement).src = '/riders-logo.png'; }}
                                    />
                                    <div className="min-w-0">
                                        <p className="font-bold text-white text-xs truncate">{mechanic.name}</p>
                                        <p className="text-[10px] text-gray-400 truncate">{mechanic.phone || 'Verified Mechanic'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <button 
                                        onClick={() => navigate(`/customer-portal/mechanic-profile/${mechanic.id}`)} 
                                        className="bg-white/5 hover:bg-white/10 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition border border-white/10"
                                    >
                                        Profile
                                    </button>
                                    <button 
                                        onClick={() => setIsChatOpen(true)} 
                                        className="bg-primary/15 hover:bg-primary/25 text-primary text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition border border-primary/30"
                                    >
                                        Chat
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 5. Notes (Read Only - if provided) */}
                    {notes && (
                        <div className="bg-[#141414] rounded-xl p-3 border border-white/5 space-y-1">
                            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Customer Notes</span>
                            <p className="text-xs text-gray-300 italic bg-black/20 p-2 rounded-lg border border-white/5">
                                "{notes}"
                            </p>
                        </div>
                    )}

                    {/* 6. Important Notice (Compact) */}
                    <div className="bg-yellow-500/[0.06] border border-yellow-500/20 rounded-xl p-2.5 flex items-start gap-2.5">
                        <AlertCircle size={15} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                        <p className="text-[11px] text-gray-300 leading-snug">
                            <strong className="text-yellow-400 font-semibold mr-1">Reminder:</strong>
                            Please be available at the scheduled time. You will receive live notifications once the mechanic is on the way.
                        </p>
                    </div>
                </div>

                {/* Bottom Sticky-ready Action Buttons */}
                <div className="pt-2 space-y-2">
                    <button
                        onClick={() => navigate(`/customer-portal/booking-detail/${primaryBooking.id}`)}
                        className="w-full bg-primary hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition text-sm shadow-lg shadow-primary/25 flex items-center justify-center gap-2"
                    >
                        <span>Track Status</span>
                        <ChevronRight size={16} />
                    </button>
                    <button
                        onClick={() => navigate('/customer-portal/')}
                        className="w-full bg-white/5 hover:bg-white/10 text-gray-300 font-semibold py-2.5 rounded-xl transition text-xs border border-white/5"
                    >
                        Back to Home
                    </button>
                </div>
            </div>

            {isChatOpen && mechanic && (
                <CustomerMechanicChatModal
                    booking={primaryBooking}
                    customer={customer}
                    mechanic={mechanic}
                    onClose={() => setIsChatOpen(false)}
                />
            )}
        </div>
    );
};

export default BookingConfirmationScreen;

