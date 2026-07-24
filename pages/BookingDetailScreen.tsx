import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDatabase } from '../context/DatabaseContext';
import { useAuth } from '../context/AuthContext';
import { Booking } from '../types';
import CustomerHeader from '../components/CustomerHeader';
import CustomerMechanicChatModal from '../components/customer/CustomerMechanicChatModal';
import Spinner from '../components/Spinner';
import ReviewModal from '../components/ReviewModal';
import ReviewDeclinedModal from '../components/ReviewDeclinedModal';
import GCashPaymentModal from '../components/GCashPaymentModal';
import { CallButton } from '../components/CallUI';
import { useCall } from '../context/CallContext';
import {
    MapPin, Phone, MessageSquare, Navigation, CheckCircle, Clock,
    Calendar, User, Car, Shield, ChevronRight, AlertCircle, Info,
    ArrowRight, Map as MapIcon, Mail, Hash, Palette, Gauge,
    FileText, Wrench, DollarSign, Timer, Upload, X, Image as ImageIcon, Bell,
    CreditCard, Eye, ClipboardList, Star, Copy, ExternalLink
} from 'lucide-react';

import { ref, onValue, set } from 'firebase/database';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db as firestore, rtdb } from '../firebase';
import { Geolocation } from '@capacitor/geolocation';

declare const L: any;

// Default currency configuration
const DEFAULT_CURRENCY = 'PHP';
const CURRENCY_SYMBOL = '₱';

// Currency formatter utility - No decimals for cleaner display
const formatCurrency = (amount: number | string, currency: string = DEFAULT_CURRENCY): string => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) return `${CURRENCY_SYMBOL}0`;

    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(numAmount);
};

const getStatusColor = (status: string) => {
    switch (status) {
        case 'Upcoming': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
        case 'Mechanic Assigned': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
        case 'En Route': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
        case 'In Progress': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
        case 'Work Done': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
        case 'Completed': return 'bg-green-500/20 text-green-400 border-green-500/30';
        case 'Cancelled': return 'bg-red-500/20 text-red-400 border-red-500/30';
        
        // Driver for Hire Custom Statuses
        case 'Pending Admin Review': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
        case 'For Verification': return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30';
        case 'Awaiting Driver Availability': return 'bg-pink-500/20 text-pink-400 border-pink-500/30';
        case 'Driver Assigned': return 'bg-teal-500/20 text-teal-400 border-teal-500/30';
        case 'Confirmed': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
        default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
};

const MiniMap: React.FC<{ lat: number, lng: number }> = React.memo(({ lat, lng }) => {
    const mapRef = React.useRef<HTMLDivElement>(null);
    const mapInstance = React.useRef<any>(null);

    React.useEffect(() => {
        if (!mapRef.current || !lat || !lng || typeof L === 'undefined') return;

        if (!mapInstance.current) {
            mapInstance.current = L.map(mapRef.current, {
                zoomControl: false,
                attributionControl: false,
                dragging: true,
                scrollWheelZoom: false,
                doubleClickZoom: false,
                boxZoom: false,
                keyboard: false
            }).setView([lat, lng], 15);

            // Dark Mode Tile Layer
            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
                subdomains: 'abcd',
                maxZoom: 20
            }).addTo(mapInstance.current);

        } else {
            mapInstance.current.setView([lat, lng]);
        }

        return () => {
            if (mapInstance.current) {
                mapInstance.current.remove();
                mapInstance.current = null;
            }
        };
    }, [lat, lng]);

    return <div ref={mapRef} className="absolute inset-0 z-0 bg-[#121212] opacity-60" />;
});

const parseDateTime = (dateStr: string, timeStr: string): number => {
    if (!dateStr) return 0;
    
    // Check if dateStr is a full ISO date-time string
    if (dateStr.includes('T') || (dateStr.includes(':') && dateStr.includes('-'))) {
        const parsed = Date.parse(dateStr);
        if (!isNaN(parsed)) return parsed;
    }
    
    // Normalize date string (expected: YYYY-MM-DD or MM/DD/YYYY)
    let year = 2026, month = 0, day = 1;
    if (dateStr.includes('-')) {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            year = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10) - 1; // 0-indexed
            day = parseInt(parts[2], 10);
        }
    } else if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            if (parts[0].length === 4) {
                year = parseInt(parts[0], 10);
                month = parseInt(parts[1], 10) - 1;
                day = parseInt(parts[2], 10);
            } else {
                month = parseInt(parts[0], 10) - 1;
                day = parseInt(parts[1], 10);
                year = parseInt(parts[2], 10);
            }
        }
    } else {
        const parsed = Date.parse(dateStr);
        if (!isNaN(parsed)) {
            const d = new Date(parsed);
            year = d.getFullYear();
            month = d.getMonth();
            day = d.getDate();
        }
    }
    
    // Normalize time string (expected: HH:mm or HH:mm AM/PM or H:mm)
    let hours = 0, minutes = 0;
    const cleanTime = (timeStr || '00:00').trim().toUpperCase();
    const match12 = cleanTime.match(/^(\d+):(\d+)\s*(AM|PM)$/);
    const match24 = cleanTime.match(/^(\d+):(\d+)$/);
    
    if (match12) {
        hours = parseInt(match12[1], 10);
        minutes = parseInt(match12[2], 10);
        const ampm = match12[3];
        if (ampm === 'PM' && hours < 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;
    } else if (match24) {
        hours = parseInt(match24[1], 10);
        minutes = parseInt(match24[2], 10);
    }
    
    return new Date(year, month, day, hours, minutes).getTime();
};

const BookingDetailScreen: React.FC = () => {
    const { bookingId } = useParams<{ bookingId: string }>();
    const navigate = useNavigate();
    const { db, updateBookingStatus, cancelBooking, addReview, loading: dbLoading } = useDatabase();
    const { user } = useAuth();
    const { startCall, callStatus } = useCall();
    
    // Modal & Review States
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [isCancelling, setIsCancelling] = useState(false);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [showDeclineModal, setShowDeclineModal] = useState(false);
    const [reviewSubmitted, setReviewSubmitted] = useState(false);
    const [showReleaseFundsModal, setShowReleaseFundsModal] = useState(false);
    const [showGCashPaymentModal, setShowGCashPaymentModal] = useState(false);
    const [showCompleteTransactionModal, setShowCompleteTransactionModal] = useState(false);
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [copiedReference, setCopiedReference] = useState(false);
    const [activeReceiptTab, setActiveReceiptTab] = useState<'downpayment' | 'balance'>('downpayment');
    const [confettiPieces, setConfettiPieces] = useState<any[]>([]);
    const [showMechanicDetailsModal, setShowMechanicDetailsModal] = useState(false);
    const [activeModalTab, setActiveModalTab] = useState<'info' | 'reviews'>('info');
    
    // Live Location & ETA Tracking States
    const [mechanicLiveLocation, setMechanicLiveLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [eta, setEta] = useState<string | null>(null);
    const [distance, setDistance] = useState<number | null>(null);

    const [fetchedBooking, setFetchedBooking] = useState<Booking | null>(null);
    const [isFetching, setIsFetching] = useState(true);

    useEffect(() => {
        if (!bookingId) {
            setIsFetching(false);
            return;
        }

        // Real-time document subscription to ensure live updates
        const unsubscribe = onSnapshot(
            doc(firestore, 'bookings', bookingId),
            (docSnap) => {
                if (docSnap.exists()) {
                    setFetchedBooking({ id: docSnap.id, ...docSnap.data() } as Booking);
                } else {
                    setFetchedBooking(null);
                }
                setIsFetching(false);
            },
            (err) => {
                console.error("Error listening to booking details in real-time:", err);
                setIsFetching(false);
            }
        );

        return () => { try { unsubscribe(); } catch (_) {} };
    }, [bookingId]);

    const booking = fetchedBooking;

    const bookingSequenceId = useMemo(() => {
        if (!db?.bookings || !bookingId) return '';
        const sortedBookings = [...db.bookings].sort((a, b) => {
            const timeA = parseDateTime(a.date, a.time);
            const timeB = parseDateTime(b.date, b.time);
            if (timeA !== timeB) return timeA - timeB;
            return a.id.localeCompare(b.id);
        });

        const yearCounters: Record<string, number> = {};
        let seqId = '';

        for (const bk of sortedBookings) {
            const getYear = (b: any) => {
                if (b.date) {
                    const match = b.date.match(/\b\d{4}\b/);
                    if (match) return match[0];
                    const d = new Date(b.date.replace(/-/g, '/'));
                    if (!isNaN(d.getTime())) return String(d.getFullYear());
                }
                return '2026';
            };
            const year = getYear(bk);
            yearCounters[year] = (yearCounters[year] || 0) + 1;
            if (bk.id === bookingId) {
                seqId = `RB-${year}-${String(yearCounters[year]).padStart(4, '0')}`;
                break;
            }
        }
    }, [db?.bookings, bookingId]);

    const mechanic = useMemo(() => {
        if (!booking) return null;
        const staticMechanic = booking.mechanic;
        if (!db?.mechanics) return staticMechanic;
        const targetId = booking.mechanicId || staticMechanic?.id;
        return db.mechanics.find(m => m.id === targetId || m.name === booking.mechanicName || m.name === staticMechanic?.name) || staticMechanic;
    }, [db?.mechanics, booking]);

    const isMechanicAssigned = useMemo(() => {
        if (!booking) return false;
        const hasAssignedStatus = ['Mechanic Assigned', 'En Route', 'In Progress', 'Completed'].includes(booking.status);
        const hasMechanicInfo = !!(booking.mechanicId || booking.mechanicName || booking.mechanic?.id || booking.mechanic?.name);
        return hasAssignedStatus && hasMechanicInfo;
    }, [booking]);

    useEffect(() => {
        if (!booking || (user && booking.customerName !== user.name)) {
            // navigate('/customer-portal/booking-history'); 
        }
    }, [booking, user, navigate]);

    useEffect(() => {
        if (booking && (booking.status === 'Cancelled' || booking.gcashPaymentStatus === 'declined')) {
            navigate('/customer-portal/', { replace: true });
        }
    }, [booking, navigate]);

    // Haversine formula to calculate distance between two points in km
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371; // Radius of the earth in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    };

    // Live Tracking Listener — moved before early return to comply with Rules of Hooks
    useEffect(() => {
        const currentStatus = booking?.status;
        const currentLocation = booking?.location;
        if (!bookingId || currentStatus !== 'En Route') {
            setMechanicLiveLocation(null);
            setEta(null);
            setDistance(null);
            return;
        }

        const trackingRef = ref(rtdb, `tracking/${bookingId}/mechanicLocation`);
        const unsubscribe = onValue(trackingRef, (snapshot) => {
            const data = snapshot.val();
            if (data && data.lat && data.lng) {
                setMechanicLiveLocation({ lat: data.lat, lng: data.lng });
                
                if (currentLocation) {
                    const dist = calculateDistance(data.lat, data.lng, currentLocation.lat, currentLocation.lng);
                    setDistance(dist);
                    
                    const timeInMinutes = Math.round(dist / (30 / 60));
                    if (timeInMinutes < 1) {
                        setEta('Arriving now');
                    } else {
                        setEta(`${timeInMinutes} mins away`);
                    }
                }
            }
        });

        return () => { try { unsubscribe(); } catch (_) {} };
    }, [bookingId, booking?.status, booking?.location]);

    // Customer live location tracking — writes to RTDB for admin map
    useEffect(() => {
        let nativeWatchId: string | null = null;
        let webWatchId: number | null = null;

        const isNative = (window as any).Capacitor !== undefined;

        if (booking?.status === 'En Route' && bookingId) {
            const handleSuccess = (lat: number, lng: number) => {
                const trackingRef = ref(rtdb, `tracking/${bookingId}/customerLocation`);
                set(trackingRef, {
                    lat,
                    lng,
                    timestamp: Date.now()
                }).catch(() => {});
            };

            if (isNative) {
                Geolocation.watchPosition(
                    { enableHighAccuracy: true, timeout: 10000, maximumAge: 3000 },
                    (position) => {
                        if (position) {
                            handleSuccess(position.coords.latitude, position.coords.longitude);
                        }
                    }
                ).then((id) => {
                    nativeWatchId = id;
                }).catch((err) => {
                    console.warn('[Customer Location] Native watch failed, falling back to web watch:', err);
                    if ('geolocation' in navigator) {
                        webWatchId = navigator.geolocation.watchPosition(
                            (position) => handleSuccess(position.coords.latitude, position.coords.longitude),
                            () => {},
                            { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
                        );
                    }
                });
            } else if ('geolocation' in navigator) {
                webWatchId = navigator.geolocation.watchPosition(
                    (position) => handleSuccess(position.coords.latitude, position.coords.longitude),
                    () => {},
                    { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
                );
            }
        }

        return () => {
            if (nativeWatchId !== null) {
                Geolocation.clearWatch({ id: nativeWatchId }).catch(() => {});
            }
            if (webWatchId !== null) {
                navigator.geolocation.clearWatch(webWatchId);
            }
            // Clean up RTDB location when leaving the page
            if (bookingId) {
                const trackingRef = ref(rtdb, `tracking/${bookingId}/customerLocation`);
                set(trackingRef, null).catch(() => {});
            }
        };
    }, [bookingId, booking?.status]);

    useEffect(() => {
        if (!booking) return;

        const shouldAutoPop =
            (booking.status === 'Work Done' && !booking.isPaid && booking.paymentMethod === 'GCash') ||
            (booking.paymentStatus === 'partial' && booking.gcashPaymentStatus === 'awaiting_payment');

        if (shouldAutoPop) {
            setShowGCashPaymentModal(true);
        }
    }, [booking?.status, booking?.paymentStatus, booking?.gcashPaymentStatus, booking?.isPaid, booking?.paymentMethod]);

    // Monitor for Completed status to trigger success modal with confetti
    useEffect(() => {
        if (!booking) return;
        if (booking.status === 'Completed') {
            const key = `ridersbud_completed_modal_shown_${booking.id}`;
            const shown = localStorage.getItem(key);
            if (!shown && !booking.isReviewed) {
                setShowCompleteTransactionModal(true);
                localStorage.setItem(key, 'true');
            }
        }
    }, [booking?.status, booking?.id, booking?.isReviewed]);

    // Confetti pieces generator for Completed success modal
    useEffect(() => {
        if (showCompleteTransactionModal) {
            const colors = ['#FE7803', '#22C55E', '#3B82F6', '#EAB308', '#EC4899', '#A855F7', '#14B8A6'];
            const shapes = ['circle', 'square', 'triangle'];
            const pieces = Array.from({ length: 85 }).map((_, i) => ({
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
    }, [showCompleteTransactionModal]);

    if (dbLoading || isFetching) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-[#0a0a0a]">
                <Spinner size="lg" color="text-primary" />
                <p className="text-gray-400 mt-4 font-bold tracking-wide animate-pulse">Loading booking details...</p>
            </div>
        );
    }

    if (!booking || !user) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-[#0a0a0a] p-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4 border border-red-500/20">
                    <Calendar size={28} className="text-red-500" />
                </div>
                <h3 className="text-white font-extrabold text-lg">Booking Not Found</h3>
                <p className="text-xs text-gray-400 mt-2 max-w-xs leading-relaxed">
                    We couldn't find this booking. It may have been cancelled, deleted, or you might not have access to view it.
                </p>
                <button
                    onClick={() => navigate('/customer-portal/', { replace: true })}
                    className="mt-6 bg-primary hover:bg-primary/90 text-black font-black text-xs px-6 py-3 rounded-2xl transition shadow-lg shadow-primary/10 hover:scale-105 duration-200"
                >
                    Back to Home
                </button>
            </div>
        );
    }

    const { vehicle, status, date, time, location, notes } = booking;
    const services = booking.services || (booking.service ? [booking.service] : []);
    const serviceNames = services.map(s => s.name).join(', ') || 'Unknown Service';
    const serviceCategories = [...new Set(services.map(s => s.category))].filter(Boolean).join(', ');
    const totalDuration = services.reduce((total, s) => {
        const durationStr = String(s.duration || '0');
        const durationNum = parseInt(durationStr.replace(/\D/g, ''), 10) || 0;
        return total + durationNum;
    }, 0);
    const basePrice = services.reduce((total, s) => total + (s.price || 0), 0);

    const timelineSteps = [
        { label: 'Booked', status: 'Upcoming', completed: true },
        { label: 'Assigned', status: 'Mechanic Assigned', completed: ['Mechanic Assigned', 'En Route', 'In Progress', 'Work Done', 'Completed'].includes(status) },
        { label: 'En Route', status: 'En Route', completed: ['En Route', 'In Progress', 'Work Done', 'Completed'].includes(status) },
        { label: 'In Progress', status: 'In Progress', completed: ['In Progress', 'Work Done', 'Completed'].includes(status) },
        { label: 'Work Done', status: 'Work Done', completed: ['Work Done', 'Completed'].includes(status) },
        { label: 'Completed', status: 'Completed', completed: status === 'Completed' }
    ];

    const currentStepIndex = timelineSteps.findIndex(s => s.status === status);

    const googleMapsLink = location
        ? `https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`
        : '';

    const handleCancelBooking = async () => {
        if (!booking || !cancelReason.trim()) return;
        setIsCancelling(true);
        try {
            await cancelBooking(booking.id, cancelReason.trim());
            setShowCancelModal(false);
            setCancelReason('');
            navigate('/customer-portal/booking-history');
        } catch (error) {
            console.error('Error cancelling booking:', error);
            alert('Failed to cancel booking. Please try again.');
        } finally {
            setIsCancelling(false);
        }
    };

    const handleConfirmCompletion = () => {
        setShowReleaseFundsModal(true);
    };

    const executeConfirmCompletion = async () => {
        if (!booking) return;

        try {
            await updateBookingStatus(booking.id, 'Completed');
            // Show review modal immediately after completion
            setShowReviewModal(true);
        } catch (error) {
            console.error('Error confirming completion:', error);
            alert('Failed to confirm completion. Please try again.');
        }
    };

    const getRedirectRoute = () => {
        if (!db || !user?.uid) return '/customer-portal';
        // Find other completed bookings for this customer that have not been reviewed yet
        const unreviewed = db.bookings.filter(b => 
            b.customerId === user.uid && 
            b.status === 'Completed' && 
            !b.isReviewed &&
            b.id !== booking?.id
        );
        return unreviewed.length > 0 ? '/customer-portal/booking-history' : '/customer-portal';
    };

    const handleReviewSubmit = async (rating: number, comment: string) => {
        if (!booking) throw new Error('No booking data available');
        try {
            await addReview(booking.id, {
                bookingId: booking.id,
                customerId: booking.customerId || user?.uid || user?.id || '',
                customerName: booking.customerName || user?.name || 'Customer',
                rating,
                comment,
                mechanicId: booking.mechanic?.id || booking.mechanicId || '',
                mechanicName: booking.mechanic?.name || booking.mechanicName || '',
            });
            console.log('Review submitted successfully');
            setReviewSubmitted(true);
            setShowReviewModal(false);
            
            // Redirect based on remaining unreviewed bookings
            navigate(getRedirectRoute());
        } catch (error) {
            console.error('Error submitting review:', error);
            throw error; // Propagate to ReviewModal to trigger its own error banner
        }
    };

    const handleReviewClose = () => {
        if (!reviewSubmitted) {
            setShowReviewModal(false);
            setShowDeclineModal(true);
        } else {
            setShowReviewModal(false);
            navigate(getRedirectRoute());
        }
    };

    const handleDeclineSubmit = async (reason: string, details?: string) => {
        console.log('Review declined reason:', { reason, details });
        setShowDeclineModal(false);
        navigate(getRedirectRoute());
    };

    const handleCallMechanic = () => {
        if (!isMechanicAssigned) {
            alert('Calling is disabled. A mechanic has not been assigned to this booking yet.');
            return;
        }

        if (mechanic && callStatus === 'idle') {
            startCall({
                targetId: mechanic.id || booking.mechanicId || 'support-mechanic',
                targetRole: 'mechanic',
                targetName: mechanic.name || booking.mechanicName || 'Mechanic',
                targetImage: mechanic.picture || mechanic.imageUrl || booking.mechanic?.picture,
                type: 'audio'
            });
        } else if (callStatus !== 'idle') {
            alert('A call is already active.');
        } else {
            alert('No mechanic information available to start a call.');
        }
    };

    const handleDirectNavigation = () => {
        const lat = mechanicLiveLocation?.lat || mechanic?.lat || booking.location?.lat;
        const lng = mechanicLiveLocation?.lng || mechanic?.lng || booking.location?.lng;
        const address = booking.location?.address;

        if (lat && lng) {
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
        } else if (address) {
            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
        } else {
            alert('Location information is not available for this booking.');
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#0a0a0a] text-white overflow-hidden font-sans">
            <CustomerHeader title={`JOB ID #${bookingSequenceId || booking.id.slice(-6)}`} icon={<ClipboardList size={22} />} />

            <main className="flex-grow overflow-y-auto p-4 space-y-4 pb-32">

                {/* Service Card */}
                <div className="relative overflow-hidden rounded-[2rem] p-6 glass-card border border-primary/20 shadow-[0_8px_32px_rgba(0,0,0,0.3)] animate-slideInUp">
                    {/* Background overlay image based on the Services primary image */}
                    <img
                        src={booking.services?.[0]?.imageUrl || booking.service?.imageUrl || booking.services?.[0]?.image || booking.service?.image || '/images/mockups/parts_placeholder.png'}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover opacity-35 pointer-events-none z-0"
                    />
                    {/* Dark contrast tint */}
                    <div className="absolute inset-0 bg-black/65 pointer-events-none z-0" />
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-16 translate-x-16 blur-2xl opacity-50 pointer-events-none z-0" />
                    <div className="relative z-10">
                        {/* Top Row: Service Name and Price */}
                        <div className="flex items-start justify-between mb-4">
                            {/* Left: Service Name and Status */}
                            <div className="flex-1 flex flex-col items-start gap-2">
                                <h1 className="text-2xl font-black tracking-tight text-gradient-primary leading-tight">
                                    {serviceNames}
                                </h1>
                                <div className={`inline-block px-2.5 py-1 rounded-xl text-[9px] font-black tracking-widest border shadow-lg shadow-black/20 ${getStatusColor(status)}`}>
                                    {status}
                                </div>
                            </div>

                            {/* Right: Price */}
                            <div className="text-right ml-4">
                                <span className="text-2xl font-black text-white drop-shadow-sm">
                                    {formatCurrency(booking.totalAmount || basePrice || 0)}
                                </span>
                                <p className="text-[8px] font-bold text-gray-500 tracking-widest mt-0.5 font-mono">Total service fee</p>
                            </div>
                        </div>

                        {/* Bottom Row: Date, Time, and Duration - forced one-line layout */}
                        <div className="flex flex-row items-center gap-1.5 flex-nowrap whitespace-nowrap w-full overflow-hidden">
                            <div className="flex items-center gap-1 glass px-2 py-1 rounded-xl border border-white/5 flex-shrink-0">
                                <Calendar size={11} className="text-primary" />
                                <span className="text-[10px] font-bold text-gray-200">
                                    {new Date(date.replace(/-/g, '/')).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                            </div>
                            <div className="flex items-center gap-1 glass px-2 py-1 rounded-xl border border-white/5 flex-shrink-0">
                                <Clock size={11} className="text-primary" />
                                <span className="text-[10px] font-bold text-gray-200">{time}</span>
                            </div>
                            {totalDuration > 0 && (
                                <div className="flex items-center gap-1 bg-blue-500/10 px-2 py-1 rounded-xl border border-blue-500/20 flex-shrink-0">
                                    <Timer size={10} className="text-blue-400" />
                                    <span className="text-[9px] font-black text-blue-400 tracking-tighter">~{totalDuration} mins</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Status Explanation Alert banner */}
                <div className={`rounded-[1.5rem] p-4 border flex items-start gap-3 bg-[#151515] border-white/5`}>
                    <div className="mt-0.5 text-primary">
                        <AlertCircle size={18} />
                    </div>
                    <div className="flex-grow">
                        <p className="font-bold text-xs text-white">Status Status Update</p>
                        <p className="text-[11px] text-gray-400 mt-1">
                            {status === 'Upcoming' && 'Your booking is confirmed and scheduled.'}
                            {status === 'Mechanic Assigned' && 'A professional mechanic has been assigned to your service.'}
                            {status === 'En Route' && 'Your mechanic is on the way to your location. Watch live below!'}
                            {status === 'In Progress' && 'Service is currently being performed on your vehicle.'}
                            {status === 'Work Done' && 'Mechanic has finished work. Please confirm & release funds below.'}
                            {status === 'Completed' && 'Service has been completed successfully. Thank you!'}
                            {status === 'Cancelled' && 'This booking has been cancelled.'}
                        </p>
                    </div>
                </div>

                {/* Payment Information Card (GCash 50% downpayment) */}
                {(booking.paymentMethod === 'GCash' || booking.gcashReference || booking.isVerified || booking.gcashDeclineReason) && (
                    <div className="bg-[#151515] rounded-[1.5rem] p-5 border border-primary/20 shadow-[0_0_20px_rgba(249,115,22,0.1)] overflow-hidden relative group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full -translate-y-12 translate-x-12 blur-3xl opacity-50" />
                        <h2 className="text-[10px] font-bold tracking-widest text-primary mb-4 flex items-center justify-between relative z-10">
                            <span className="flex items-center gap-2">
                                <CreditCard size={14} />
                                Payment Details
                            </span>
                            {booking.isVerified ? (
                                <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded text-[8px] font-black border border-green-500/20">Verified</span>
                            ) : booking.gcashDeclineReason ? (
                                <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-[8px] font-black border border-red-500/20">Declined</span>
                            ) : (
                                <span className="bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded text-[8px] font-black border border-yellow-500/20">Pending Verification</span>
                            )}
                        </h2>

                        {booking.gcashDeclineReason && (
                            <div className="mb-4 p-3 bg-red-500/5 border border-red-500/20 rounded-xl relative z-10">
                                <p className="text-[10px] font-black text-red-400 tracking-widest mb-1 flex items-center gap-1">
                                    <AlertCircle size={12} />
                                    Reason for Decline
                                </p>
                                <p className="text-xs text-gray-300 italic">"{booking.gcashDeclineReason}"</p>
                                <button 
                                    onClick={() => navigate('/customer-portal/service-payment', { state: { booking } })}
                                    className="mt-3 w-full py-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 text-[10px] font-black tracking-widest rounded-lg transition-all"
                                >
                                    Submit New Proof of Payment
                                </button>
                            </div>
                        )}

                        <div className="space-y-4 relative z-10">
                            {(() => {
                                const originalServicesFee = booking.services && booking.services.length > 0
                                    ? booking.services.reduce((sum: number, svc: any) => sum + (Number(svc.price) || 0), 0)
                                    : (Number(booking.service?.price) || Number(booking.totalAmount) || 0);
                                const paidDownpayment = Number(booking.paidAmount) || (originalServicesFee * 0.5);
                                const serviceBalance = Math.max(0, originalServicesFee - paidDownpayment);
                                const additionalCostsTotal = (booking.additionalCosts || []).reduce((sum: number, cost: any) => sum + (Number(cost.price) || 0), 0);
                                const totalBalanceToPay = serviceBalance + additionalCostsTotal;

                                return (
                                    <>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-[10px] text-gray-500 font-bold mb-1 tracking-tight font-mono">Amount Paid (50% Deposit)</p>
                                                <p className="text-xl font-black text-white">{paidDownpayment > 0 ? `₱${paidDownpayment.toLocaleString()}` : '—'}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] text-gray-500 font-bold mb-1 tracking-tight font-mono">Remaining Balance</p>
                                                <p className="text-lg font-bold text-gray-400">{serviceBalance > 0 ? `₱${serviceBalance.toLocaleString()}` : 'For Quotation'}</p>
                                            </div>
                                        </div>

                                        {booking.additionalCosts && booking.additionalCosts.length > 0 && (
                                            <div className="p-3.5 bg-white/[0.02] border border-white/5 rounded-xl space-y-2">
                                                <h4 className="text-[9px] font-bold text-primary tracking-widest uppercase flex items-center gap-1.5 mb-2 font-mono">
                                                    <Wrench size={10} />
                                                    Additional Costs Added by Mechanic
                                                </h4>
                                                <div className="space-y-1.5">
                                                    {booking.additionalCosts.map((cost: any, index: number) => (
                                                        <div key={index} className="flex justify-between items-center text-xs">
                                                            <span className="text-gray-400 font-medium">{cost.description}</span>
                                                            <span className="text-white font-bold">₱{Number(cost.price).toLocaleString()}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="h-px bg-white/5 my-2"></div>
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="text-gray-400 font-medium font-mono">Additional Total</span>
                                                    <span className="text-primary font-bold">+{formatCurrency(additionalCostsTotal)}</span>
                                                </div>
                                                <div className="flex justify-between items-center pt-1">
                                                    <span className="text-[10px] font-black text-white uppercase tracking-wider font-mono">Total Balance to Pay</span>
                                                    <span className="text-sm font-black text-emerald-400">{totalBalanceToPay > 0 ? `₱${totalBalanceToPay.toLocaleString()}` : 'For Quotation'}</span>
                                                </div>
                                            </div>
                                        )}

                                        {booking.gcashReceiptUrl && (
                                            <button 
                                                onClick={() => setShowReceiptModal(true)}
                                                className="flex items-center justify-center gap-3 w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-xl py-4 text-xs font-black tracking-widest leading-none transition-all group"
                                            >
                                                <Eye size={16} className="group-hover:scale-110 transition-transform" />
                                                View GCash Receipt
                                            </button>
                                        )}
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                )}

                {/* Mechanic Information Card */}
                {mechanic && (
                    <div className="bg-[#151515] rounded-[1.5rem] p-5 border border-white/5">
                        <h2 className="text-[10px] font-bold tracking-widest text-gray-500 mb-4 flex items-center gap-2">
                            <Wrench size={14} />
                            Your Assigned Mechanic
                        </h2>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                {/* Mechanic Image */}
                                <div className="w-14 h-14 rounded-full bg-[#151515] border border-white/10 overflow-hidden relative flex-shrink-0">
                                    <img
                                        src={mechanic.imageUrl || '/riders-logo.png'}
                                        alt={mechanic.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => { (e.target as HTMLImageElement).src = '/riders-logo.png'; }}
                                    />
                                </div>

                                {/* Mechanic Info Details */}
                                <div className="flex flex-col gap-1">
                                    <h3 className="text-[12px] font-bold text-white leading-none">
                                        {mechanic.name}
                                    </h3>
                                    <div className="flex flex-col gap-1 items-start">
                                        <div className="flex items-center gap-1 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold w-fit">
                                            <Star size={10} className="fill-yellow-400 text-yellow-400" />
                                            <span>{mechanic.rating ? mechanic.rating.toFixed(1) : '5.0'}</span>
                                        </div>
                                        <span className="text-gray-500 text-[10px] font-normal pl-1">({mechanic.reviews || 0} reviews)</span>
                                    </div>
                                </div>
                            </div>

                            {/* Contact Action */}
                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={() => { setShowMechanicDetailsModal(true); setActiveModalTab('info'); }}
                                    className="bg-primary hover:bg-orange-600 active:scale-95 transition-all text-white px-4 py-2 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-primary/10 whitespace-nowrap mechanic-card-btn"
                                >
                                    <User size={13} />
                                    Details
                                </button>
                                {booking.status === 'Completed' && !booking.isReviewed && !booking.review && (
                                    <button
                                        onClick={() => setShowReviewModal(true)}
                                        className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all text-white px-4 py-2 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/10 whitespace-nowrap mechanic-card-btn"
                                    >
                                        <Star size={13} className="fill-white" />
                                        Review
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Driver Details Card (Driver for Hire Service Only) */}
                {(booking?.serviceName === 'Driver for Hire' || booking?.serviceId === '7') && (
                    <div className="bg-[#151515] rounded-[1.5rem] p-5 border border-white/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-[30px] rounded-full translate-x-5 -translate-y-5"></div>
                        
                        <h2 className="text-[10px] font-bold tracking-widest text-gray-500 mb-4 flex items-center gap-2">
                            <User size={14} className="text-primary" />
                            Assigned Driver Details
                        </h2>

                        <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 overflow-hidden relative flex-shrink-0 flex items-center justify-center shadow-lg">
                                    <User size={26} className="text-gray-400" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <h3 className="text-[14px] font-black text-white leading-none">
                                        {booking.driverName || 'Pending Assignment'}
                                    </h3>
                                    <p className="text-[9px] font-bold text-primary uppercase tracking-wider mt-0.5">Professional Driver</p>
                                    
                                    {booking.estimatedArrivalTime && (
                                        <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-400">
                                            <Clock size={11} className="text-primary shrink-0" />
                                            <span>ETA: <span className="text-white font-bold">{booking.estimatedArrivalTime}</span></span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {booking.driverPhone && (
                                <a 
                                    href={`tel:${booking.driverPhone}`}
                                    className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center hover:bg-primary/40 transition-all duration-300 group shadow-md shadow-primary/10"
                                    title={`Call ${booking.driverName}`}
                                >
                                    <Phone size={18} className="text-primary group-hover:scale-110 transition-transform" />
                                </a>
                            )}
                        </div>

                        {booking.remarks && (
                            <div className="mt-4 p-3 bg-black/30 border border-white/5 rounded-xl flex items-start gap-2.5">
                                <Info size={13} className="text-primary shrink-0 mt-0.5" />
                                <div>
                                    <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest block">Remarks & Instructions</span>
                                    <p className="text-[10px] text-gray-300 mt-0.5 leading-relaxed">{booking.remarks}</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Vehicle Information Card */}
                <div className="bg-[#151515] rounded-[1.5rem] p-5 border border-white/5">
                    <h2 className="text-[10px] font-bold tracking-widest text-gray-500 mb-4 flex items-center gap-2">
                        <Car size={14} />
                        Vehicle Information
                    </h2>

                    {(booking?.serviceName === 'Driver for Hire' || booking?.serviceId === '7') ? (
                        booking.vehicleDetails ? (
                            <>
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-14 h-14 rounded-full bg-[#151515] border border-white/10 overflow-hidden relative flex-shrink-0 flex items-center justify-center shadow-lg">
                                        <Car size={24} className="text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="text-[12px] font-bold text-white leading-tight">
                                            {booking.vehicleDetails.brand} {booking.vehicleDetails.model}
                                        </h3>
                                        <div className="flex items-center gap-1.5 mt-1.5">
                                            <FileText size={12} className="text-primary" />
                                            <span className="text-[10px] text-gray-400 tracking-wide font-medium">
                                                Plate No: {booking.vehicleDetails.plateNumber || 'N/A'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-black/30 rounded-xl p-2.5 border border-white/5 flex flex-col justify-center hover:border-white/10 transition-colors">
                                        <span className="text-[9px] text-gray-500 font-semibold mb-1">Vehicle Type</span>
                                        <p className="text-xs font-bold text-white tracking-wide">{booking.vehicleDetails.type || 'Sedan'}</p>
                                    </div>
                                    <div className="bg-black/30 rounded-xl p-2.5 border border-white/5 flex flex-col justify-center hover:border-white/10 transition-colors">
                                        <span className="text-[9px] text-gray-500 font-semibold mb-1">Owner Driven</span>
                                        <p className="text-xs font-bold text-emerald-400">Yes (Customer's Car)</p>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="p-4 bg-black/30 border border-white/5 rounded-xl text-center">
                                <p className="text-xs text-gray-400">Driver will provide the vehicle.</p>
                                <p className="text-[10px] text-primary font-bold uppercase tracking-wider mt-1">Vehicle Type: {booking.details?.vehicleType || 'Sedan'}</p>
                            </div>
                        )
                    ) : (
                        <>
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-14 h-14 rounded-full bg-[#151515] border border-white/10 overflow-hidden relative flex-shrink-0 group shadow-lg">
                                    {vehicle?.imageUrls && vehicle?.imageUrls.length > 0 ? (
                                        <img
                                            src={vehicle.imageUrls[0]}
                                            alt={`${vehicle.make} ${vehicle.model}`}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = "/assets/car_mockup.png";
                                            }}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gray-900">
                                            <img src="/assets/car_mockup.png" alt="Car Mockup" className="w-full h-full object-cover opacity-50" />
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-[12px] font-bold text-white leading-tight">
                                        {vehicle?.year} {vehicle?.make} {vehicle?.model}
                                    </h3>
                                    <div className="flex items-center gap-1.5 mt-1.5">
                                        <FileText size={12} className="text-primary" />
                                        <span className="text-[10px] text-gray-400 tracking-wide font-medium">
                                            Plate No: {vehicle?.plateNumber || 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-black/30 rounded-xl p-2.5 border border-white/5 flex flex-col justify-center hover:border-white/10 transition-colors">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <Hash size={10} className="text-primary" />
                                        <span className="text-[9px] text-gray-500 font-semibold">Plate No.</span>
                                    </div>
                                    <p className="text-xs font-bold text-white tracking-wide">
                                        {vehicle?.plateNumber || 'N/A'}
                                    </p>
                                </div>

                                <div className="bg-black/30 rounded-xl p-2.5 border border-white/5 flex flex-col justify-center hover:border-white/10 transition-colors">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <Palette size={10} className="text-primary" />
                                        <span className="text-[9px] text-gray-500 font-semibold">Color</span>
                                    </div>
                                    <p className="text-xs font-bold text-white capitalize">
                                        {vehicle?.color || 'N/A'}
                                    </p>
                                </div>

                                <div className="bg-black/30 rounded-xl p-2.5 border border-white/5 flex flex-col justify-center hover:border-white/10 transition-colors">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <Gauge size={10} className="text-primary" />
                                        <span className="text-[9px] text-gray-500 font-semibold">Mileage</span>
                                    </div>
                                    <p className="text-xs font-bold text-white">
                                        {vehicle?.mileage ? `${vehicle.mileage.toLocaleString()} mi` : 'N/A'}
                                    </p>
                                </div>

                                <div className="bg-black/30 rounded-xl p-2.5 border border-white/5 flex flex-col justify-center hover:border-white/10 transition-colors">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <Car size={10} className="text-primary" />
                                        <span className="text-[9px] text-gray-500 font-semibold">Vehicle Type</span>
                                    </div>
                                    <p className="text-xs font-bold text-white capitalize">
                                        {vehicle?.type || 'Sedan'}
                                    </p>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Split Timeline and Controls Section */}
                <div className="bg-[#151515] rounded-[1.5rem] p-5 border border-white/5 flex flex-col min-h-[300px]">
                    <h2 className="text-[10px] font-bold tracking-widest text-gray-500 mb-4 flex items-center gap-2">
                        <Clock size={14} />
                        Progress Timeline
                    </h2>

                    <div className="flex gap-4 flex-grow">
                        {/* Timeline Column */}
                        <div className="w-[45%] relative pt-1 pb-1 flex flex-col justify-between">
                            <div className="absolute left-[9px] top-3 bottom-3 w-[2px] bg-white/5"></div>
                            {timelineSteps.map((step, idx) => {
                                const isCompleted = idx <= currentStepIndex;
                                const isCurrent = idx === currentStepIndex;
                                return (
                                    <div key={step.status} className="relative flex items-center gap-3">
                                        <div className={`w-5 h-5 rounded-full border-[3px] flex-shrink-0 z-10 transition-all ${isCompleted ? 'bg-primary border-[#151515] shadow-[0_0_10px_rgba(249,115,22,0.6)]' : 'bg-[#222] border-[#333]'}`}>
                                            {isCompleted && <div className="hidden"></div>}
                                        </div>
                                        <div className="flex-1">
                                            <p className={`text-[10px] font-bold leading-tight ${isCurrent ? 'text-primary' : isCompleted ? 'text-white' : 'text-gray-600'}`}>
                                                {step.label}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Actions Grid */}
                        <div className="flex-1 flex flex-col gap-3 justify-center">
                            {/* PIN LOCATION - Interactive Mini Map */}
                            <button
                                onClick={handleDirectNavigation}
                                disabled={!location?.lat && !location?.lng}
                                className="w-full h-24 bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] rounded-xl border-2 border-primary/30 relative overflow-hidden flex-shrink-0 group cursor-pointer hover:border-primary hover:shadow-lg hover:shadow-primary/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                title={location?.lat ? "Open in Google Maps" : "Location not available"}
                            >
                                {location?.lat && location?.lng ? (
                                    <>
                                        <MiniMap lat={mechanicLiveLocation?.lat || location.lat} lng={mechanicLiveLocation?.lng || location.lng} />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent"></div>
                                        <div className="relative h-full flex flex-col items-center justify-center p-3">
                                            <div className="relative mb-1">
                                                <MapPin size={24} className="text-primary drop-shadow-[0_2px_8px_rgba(249,115,22,0.6)] animate-bounce" />
                                                <div className="absolute inset-0 bg-primary/30 blur-xl animate-pulse"></div>
                                            </div>
                                            <span className="text-[10px] font-black text-center leading-tight text-white tracking-wider drop-shadow-lg font-mono">
                                                {status === 'En Route' && eta ? `EN ROUTE: ${eta.toUpperCase()}` : 'PIN LOCATION'}
                                            </span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="relative h-full flex flex-col items-center justify-center p-3">
                                        <MapPin size={20} className="text-gray-500 mb-1" />
                                        <span className="text-[9px] font-bold text-center leading-tight text-gray-500 tracking-wide font-mono">
                                            Location Unavailable
                                        </span>
                                    </div>
                                )}
                            </button>

                            {mechanic && (
                                <button
                                    onClick={handleCallMechanic}
                                    disabled={callStatus !== 'idle' || !isMechanicAssigned}
                                    className={`w-full rounded-xl border flex items-center justify-center gap-2 py-2.5 transition-all text-[12px] font-bold tracking-wide uppercase disabled:opacity-40 disabled:cursor-not-allowed ${
                                        isMechanicAssigned 
                                            ? 'bg-white/5 hover:bg-white/10 border-white/5 text-primary active:scale-95' 
                                            : 'bg-white/5 border-white/5 text-gray-500'
                                    }`}
                                >
                                    <Phone size={16} />
                                    Call Mechanic
                                </button>
                            )}

                            <button
                                onClick={() => {
                                    if (!isMechanicAssigned) {
                                        alert('Chat is disabled. A mechanic has not been assigned to this booking yet.');
                                        return;
                                    }
                                    setIsChatOpen(true);
                                }}
                                disabled={!isMechanicAssigned}
                                className={`w-full transition text-white font-bold py-2.5 rounded-xl text-[12px] tracking-wider uppercase flex items-center justify-center gap-2 whitespace-nowrap min-w-0 disabled:opacity-40 disabled:cursor-not-allowed ${
                                    isMechanicAssigned
                                        ? 'bg-primary hover:bg-orange-600 active:scale-95 shadow-lg shadow-primary/20'
                                        : 'bg-white/5 border border-white/5 text-gray-500 shadow-none'
                                }`}
                            >
                                <MessageSquare size={16} className="flex-shrink-0" />
                                <span className="truncate whitespace-nowrap">Chat Mechanic</span>
                            </button>

                            {/* Review Service & Mechanic persistent button for Completed Status */}
                            {status === 'Completed' && !booking.isReviewed && (
                                <button
                                    onClick={() => setShowReviewModal(true)}
                                    className="w-full bg-primary text-white font-black py-2.5 rounded-xl hover:bg-orange-600 transition text-[12px] tracking-widest uppercase shadow-lg shadow-primary/20 active:scale-95"
                                >
                                    Review Service & Mechanic
                                </button>
                            )}

                            {/* Pay Balance Action (PAY THE BALANCE / PAY NOW) */}
                            {status !== 'Completed' && !booking.isPaid && (
                                !booking.isVerified && !booking.gcashReceiptUrl ? (
                                    <button
                                        onClick={() => {
                                            setShowGCashPaymentModal(true);
                                        }}
                                        className="w-full bg-primary text-white hover:bg-orange-600 transition font-black py-2.5 rounded-xl text-[12px] tracking-widest uppercase flex items-center justify-center gap-2 shadow-lg shadow-primary/20 cursor-pointer active:scale-95"
                                    >
                                        PAY NOW
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => {
                                            if (booking.gcashPaymentStatus === 'awaiting_payment') {
                                                setShowGCashPaymentModal(true);
                                            }
                                        }}
                                        disabled={booking.gcashPaymentStatus !== 'awaiting_payment'}
                                        className={`w-full font-black py-2.5 rounded-xl transition text-[12px] tracking-widest uppercase flex items-center justify-center gap-2 ${
                                            booking.gcashPaymentStatus === 'awaiting_payment'
                                                ? 'bg-primary text-white hover:bg-orange-600 shadow-lg shadow-primary/20 cursor-pointer active:scale-95'
                                                : 'bg-white/5 border border-white/5 text-gray-500 cursor-not-allowed'
                                        }`}
                                    >
                                        PAY THE BALANCE
                                    </button>
                                )
                            )}
                        </div>
                    </div>
                </div>

                {/* View All Bookings & Cancel Booking placed inline in one line below the section */}
                <div className="flex gap-3 w-full mt-4">
                    <button
                        onClick={() => navigate('/customer-portal/booking-history')}
                        className="flex-1 bg-[#151515] border border-white/10 text-white font-bold py-3.5 rounded-xl hover:bg-white/5 transition text-xs tracking-wider uppercase active:scale-95 flex items-center justify-center gap-2"
                    >
                        <ClipboardList size={16} className="text-primary" />
                        View All Bookings
                    </button>
                    {status === 'Upcoming' && (
                        <button
                            onClick={() => setShowCancelModal(true)}
                            className="flex-1 bg-red-500/10 text-red-400 border border-red-500/20 font-bold py-3.5 rounded-xl hover:bg-red-500/20 transition text-xs tracking-wider uppercase active:scale-95 flex items-center justify-center gap-2"
                        >
                            <AlertCircle size={16} />
                            Cancel Booking
                        </button>
                    )}
                </div>

                {/* Additional Details & Notes Section */}
                {notes && (
                    <div className="bg-[#151515] rounded-[1.5rem] p-5 border border-white/5">
                        <h2 className="text-[10px] font-bold tracking-widest text-gray-500 mb-2 flex items-center gap-2">
                            <FileText size={14} />
                            Your Booking Notes
                        </h2>
                        <div className="p-3.5 bg-black/30 border border-white/5 rounded-xl text-xs text-gray-300 italic">
                            "{notes}"
                        </div>
                    </div>
                )}



            </main>

            {/* Cancel Modal */}
            {showCancelModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
                    <div className="bg-[#1C1C1E] border border-white/10 rounded-3xl max-w-sm w-full p-6 animate-zoomIn relative">
                        <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
                            <Calendar size={24} className="text-red-500" />
                        </div>
                        <h3 className="text-white font-extrabold text-lg">Cancel Appointment?</h3>
                        <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                            Are you sure you want to cancel this booking? This will cancel the service schedule and notify the admin immediately.
                        </p>

                        <div className="mt-4 space-y-3.5">
                            <label className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block">Quick Reasons</label>
                            <div className="flex flex-wrap gap-1.5">
                                {[
                                    'Change of plans',
                                    'Schedule conflict',
                                    'Not needed anymore',
                                    'Incorrect details'
                                ].map((template) => (
                                    <button
                                        key={template}
                                        type="button"
                                        onClick={() => setCancelReason(template)}
                                        className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all duration-200 active:scale-95 ${
                                            cancelReason === template
                                                ? 'bg-primary/20 border-primary text-primary'
                                                : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'
                                        }`}
                                    >
                                        {template}
                                    </button>
                                ))}
                            </div>
                            
                            <div className="flex flex-col group">
                                <label htmlFor="detail-specify-reason" className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-1.5 group-focus-within:text-primary transition-colors">Specify Reason *</label>
                                <textarea
                                    id="detail-specify-reason"
                                    name="detail-specify-reason"
                                    required
                                    value={cancelReason}
                                    onChange={(e) => setCancelReason(e.target.value)}
                                    placeholder="Please tell us why you want to cancel..."
                                    rows={3}
                                    className="w-full bg-black/40 border border-white/5 hover:border-white/10 focus:border-red-500/50 text-white text-xs font-bold rounded-xl p-3 outline-none resize-none transition-all focus:ring-2 focus:ring-red-500/10 shadow-inner"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                disabled={isCancelling}
                                onClick={() => { setShowCancelModal(false); setCancelReason(''); }}
                                className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-2.5 rounded-xl border border-white/5 transition-all text-xs"
                            >
                                No, Keep It
                            </button>
                            <button
                                disabled={isCancelling || !cancelReason.trim()}
                                onClick={handleCancelBooking}
                                className={`flex-1 font-bold py-2.5 rounded-xl transition-all text-xs flex items-center justify-center gap-1.5 ${
                                    cancelReason.trim()
                                        ? 'bg-red-500 hover:bg-red-600 text-white cursor-pointer'
                                        : 'bg-red-500/30 text-white/50 cursor-not-allowed'
                                }`}
                            >
                                {isCancelling ? <Spinner size="sm" /> : 'Yes, Cancel'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Chat Modal */}
            {isChatOpen && mechanic && (
                <CustomerMechanicChatModal
                    booking={booking}
                    customer={user}
                    mechanic={mechanic}
                    onClose={() => setIsChatOpen(false)}
                />
            )}
            
            {/* Mechanic Details Modal */}
            {showMechanicDetailsModal && mechanic && (
                <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[150] p-4 animate-fadeIn">
                    <div className="bg-[#15151C]/90 border border-white/10 rounded-[2.5rem] p-6 max-w-sm w-full animate-scaleUp relative overflow-hidden shadow-2xl">
                        {/* Header Glow */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[50px] rounded-full translate-x-10 -translate-y-10"></div>
                        
                        {/* Close button */}
                        <button 
                            onClick={() => setShowMechanicDetailsModal(false)}
                            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all active:scale-90 z-20"
                        >
                            <X size={14} />
                        </button>

                        <div className="relative z-10">
                            {/* Avatar & Title */}
                            <div className="flex flex-col items-center text-center mb-4">
                                <div className="w-20 h-20 rounded-full bg-[#1A1A1F] border-2 border-primary/30 p-1 mb-2 relative shadow-xl">
                                    <div className="w-full h-full rounded-full overflow-hidden">
                                        <img
                                            src={mechanic.imageUrl || '/riders-logo.png'}
                                            alt={mechanic.name}
                                            className="w-full h-full object-cover"
                                            onError={(e) => { (e.target as HTMLImageElement).src = '/riders-logo.png'; }}
                                        />
                                    </div>
                                    {mechanic.isOnline && (
                                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-[#15151C]" />
                                    )}
                                </div>
                                <h3 className="text-lg font-black text-white tracking-tight leading-none mb-1">{mechanic.name}</h3>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <div className="flex items-center gap-1 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                        <Star size={9} className="fill-yellow-400 text-yellow-400" />
                                        <span>{mechanic.rating ? mechanic.rating.toFixed(1) : '5.0'}</span>
                                    </div>
                                    <span className="text-gray-500 text-[11px]">({mechanic.reviews || 0} jobs completed)</span>
                                </div>
                            </div>

                            {/* Tab controls - Pill Style (More Compact) */}
                            <div className="flex bg-white/5 border border-white/5 rounded-xl p-0.5 mb-4 max-w-[240px] mx-auto relative z-10">
                                <button
                                    type="button"
                                    onClick={() => setActiveModalTab('info')}
                                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${
                                        activeModalTab === 'info'
                                            ? 'bg-primary text-white shadow-md shadow-primary/20'
                                            : 'text-gray-400 hover:text-white'
                                    }`}
                                >
                                    Overview
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveModalTab('reviews')}
                                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${
                                        activeModalTab === 'reviews'
                                            ? 'bg-primary text-white shadow-md shadow-primary/20'
                                            : 'text-gray-400 hover:text-white'
                                    }`}
                                >
                                    Reviews ({mechanic.reviewsList?.length || 0})
                                </button>
                            </div>

                            {/* Details section scrollable panel (Reduced max-h for compactness) */}
                            <div className="max-h-[220px] overflow-y-auto pr-1 mb-5 scrollbar-thin">
                                {activeModalTab === 'info' ? (
                                    <div className="space-y-3">
                                        <div className="space-y-3 bg-white/5 rounded-2xl p-3.5 border border-white/5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                                                    <Phone size={13} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[8px] text-gray-500 font-bold uppercase tracking-wider">Contact Phone</p>
                                                    <p className="text-xs font-bold text-white truncate">{mechanic.phone || 'Not provided'}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                                                    <Mail size={13} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[8px] text-gray-500 font-bold uppercase tracking-wider">Email Address</p>
                                                    <p className="text-xs font-bold text-white truncate">{mechanic.email || 'Not provided'}</p>
                                                </div>
                                            </div>

                                            {mechanic.address && (
                                                <div className="flex items-center gap-3">
                                                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                                                        <MapPin size={13} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[8px] text-gray-500 font-bold uppercase tracking-wider">Service Hub / Location</p>
                                                        <p className="text-xs font-bold text-white truncate">{mechanic.address}</p>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex items-center gap-3">
                                                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                                                    <Shield size={13} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[8px] text-gray-500 font-bold uppercase tracking-wider">Verification Status</p>
                                                    <p className="text-xs font-bold text-green-400 capitalize">{mechanic.verificationStatus || 'Verified Partner'}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-white/5 rounded-2xl p-3.5 border border-white/5">
                                            <p className="text-[8px] text-gray-500 font-bold uppercase tracking-wider mb-1.5">Specializations</p>
                                            <div className="flex flex-wrap gap-1">
                                                {(mechanic.specializations || mechanic.specialties || ['General Maintenance', 'Engine Tuning']).map((spec: string) => (
                                                    <span 
                                                        key={spec}
                                                        className="text-[9px] font-bold bg-white/5 border border-white/10 text-gray-300 px-2 py-0.5 rounded-md"
                                                    >
                                                        {spec}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-2.5">
                                        {(!mechanic.reviewsList || mechanic.reviewsList.length === 0) ? (
                                            <div className="text-center py-8 text-gray-500 text-xs">
                                                No reviews completed yet.
                                            </div>
                                        ) : (
                                            mechanic.reviewsList.map((rev) => (
                                                <div key={rev.id || Math.random().toString()} className="bg-white/5 rounded-xl p-3 border border-white/5">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <div>
                                                            <h5 className="text-white text-xs font-bold leading-tight">{rev.customerName}</h5>
                                                            <div className="flex items-center gap-0.5 mt-0.5">
                                                                {[...Array(5)].map((_, i) => (
                                                                    <Star
                                                                        key={i}
                                                                        size={9}
                                                                        className={i < rev.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'}
                                                                    />
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <span className="text-[8px] text-gray-500 font-mono">
                                                            {rev.date ? new Date(rev.date).toLocaleDateString() : 'Recent'}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-gray-400 leading-relaxed italic">
                                                        "{rev.comment || 'No comment provided'}"
                                                    </p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Actions inside modal: Chat & Call option (With strict assignment validation) */}
                            <div className="flex gap-2.5">
                                <button
                                    onClick={() => {
                                        if (!isMechanicAssigned) {
                                            alert('Chat is disabled. A mechanic has not been assigned to this booking yet.');
                                            return;
                                        }
                                        setShowMechanicDetailsModal(false);
                                        setIsChatOpen(true);
                                    }}
                                    disabled={!isMechanicAssigned}
                                    className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                                        isMechanicAssigned
                                            ? 'bg-primary hover:bg-orange-600 active:scale-95 text-white shadow-lg shadow-primary/20'
                                            : 'bg-white/5 border border-white/5 text-gray-500'
                                    }`}
                                >
                                    <MessageSquare size={14} />
                                    Open Chat
                                </button>
                                <button
                                    onClick={() => {
                                        if (!isMechanicAssigned) {
                                            alert('Calling is disabled. A mechanic has not been assigned to this booking yet.');
                                            return;
                                        }
                                        setShowMechanicDetailsModal(false);
                                        handleCallMechanic();
                                    }}
                                    disabled={!isMechanicAssigned}
                                    className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                                        isMechanicAssigned
                                            ? 'bg-white/5 hover:bg-white/10 border-white/5 text-primary active:scale-95'
                                            : 'bg-white/5 border-white/5 text-gray-500'
                                    }`}
                                >
                                    <Phone size={14} />
                                    Call Now
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Review Modal */}
            <ReviewModal
                isOpen={showReviewModal}
                onClose={handleReviewClose}
                onSubmit={handleReviewSubmit}
                mechanicName={mechanic?.name || booking?.mechanicName}
                mechanicImageUrl={mechanic?.imageUrl || booking?.mechanic?.imageUrl}
            />

            {/* Review Declined Modal */}
            <ReviewDeclinedModal
                isOpen={showDeclineModal}
                onClose={() => {
                    setShowDeclineModal(false);
                    navigate(getRedirectRoute());
                }}
                onSubmit={handleDeclineSubmit}
            />

            {/* Release Funds Confirmation Modal */}
            {showReleaseFundsModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[110] p-4 animate-fadeIn">
                    <div className="bg-[#121212] border border-white/10 rounded-[2.5rem] p-8 max-w-sm w-full text-center animate-scaleUp relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 blur-[50px] rounded-full translate-x-10 -translate-y-10"></div>
                        
                        <div className="relative z-10">
                            <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-400 mx-auto mb-6 shadow-inner animate-pulse">
                                <CheckCircle size={32} />
                            </div>
                            
                            <h3 className="text-xl font-black text-white tracking-tight leading-none mb-3">Release Funds?</h3>
                            <p className="text-xs text-gray-400 leading-relaxed mb-8">
                                Are you satisfied with the service and ready to release the funds to the mechanic?
                            </p>
                            
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={() => {
                                        setShowReleaseFundsModal(false);
                                        executeConfirmCompletion();
                                    }}
                                    className="w-full bg-green-500 hover:bg-green-600 text-white font-black py-4 rounded-xl text-xs tracking-widest uppercase transition-all shadow-lg shadow-green-500/20 active:scale-95"
                                >
                                    Yes, Release Funds
                                </button>
                                <button
                                    onClick={() => setShowReleaseFundsModal(false)}
                                    className="w-full bg-white/5 hover:bg-white/10 text-gray-300 font-black py-4 rounded-xl text-xs tracking-widest uppercase border border-white/5 transition-all active:scale-95"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showGCashPaymentModal && (
                <GCashPaymentModal
                    bookingId={booking.id}
                    totalAmount={booking.totalAmount || booking.service?.price || 0}
                    paymentAmount={
                        (!booking.isVerified && !booking.gcashReceiptUrl)
                            ? Math.ceil((booking.totalAmount || booking.service?.price || 0) * 0.5)
                            : (booking.totalAmount || booking.service?.price || 0) - (booking.paidAmount || 0)
                    }
                    paymentLabel={
                        (!booking.isVerified && !booking.gcashReceiptUrl)
                            ? "DOWN PAYMENT (50%)"
                            : "REMAINING BALANCE (50%)"
                    }
                    customerName={booking.customerName}
                    services={services}
                    onPaymentVerified={() => {
                        setShowGCashPaymentModal(false);
                    }}
                    onClose={() => setShowGCashPaymentModal(false)}
                />
            )}

            {/* Complete Transaction Success Modal with Confetti Overlay */}
            {showCompleteTransactionModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn text-center">
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
                            @keyframes modal-scale-up {
                                0% {
                                    transform: scale(0.9);
                                    opacity: 0;
                                }
                                100% {
                                    transform: scale(1);
                                    opacity: 1;
                                }
                            }
                            @keyframes checkmark-pulse {
                                0%, 100% {
                                    transform: scale(1);
                                    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4);
                                }
                                50% {
                                    transform: scale(1.05);
                                    box-shadow: 0 0 20px 10px rgba(34, 197, 94, 0);
                                }
                            }
                            .animate-modal-scale-up {
                                animation: modal-scale-up 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                            }
                            .animate-checkmark-pulse {
                                animation: checkmark-pulse 2s infinite ease-in-out;
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

                    {/* Premium Dark Modal Container */}
                    <div className="relative w-full max-w-md bg-[#171617] rounded-3xl p-6 border border-white/10 shadow-2xl animate-modal-scale-up z-20 text-center">
                        <div className="mx-auto w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20 mb-6 animate-checkmark-pulse">
                            <CheckCircle size={44} className="text-emerald-400" />
                        </div>

                        <h3 className="text-2xl font-black text-white tracking-tight mb-2">
                            Payment Verified Successfully!
                        </h3>
                        <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                            Your payment has been received and verified by the mechanic. The transaction is complete!
                        </p>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => {
                                    setShowCompleteTransactionModal(false);
                                    setShowReviewModal(true);
                                }}
                                className="w-full bg-primary hover:bg-orange-600 text-white font-black py-4 rounded-xl text-xs tracking-widest uppercase transition-all shadow-lg shadow-primary/20 active:scale-95"
                            >
                                Review Service & Mechanic
                            </button>
                            <button
                                onClick={() => setShowCompleteTransactionModal(false)}
                                className="w-full bg-white/5 hover:bg-white/10 text-gray-300 font-black py-4 rounded-xl text-xs tracking-widest uppercase border border-white/5 transition-all active:scale-95"
                            >
                                Got it, Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showReceiptModal && (() => {
                const originalServicesFee = booking.services && booking.services.length > 0
                    ? booking.services.reduce((sum: number, svc: any) => sum + (Number(svc.price) || 0), 0)
                    : (Number(booking.service?.price) || Number(booking.totalAmount) || 0);
                const paidDownpayment = Number(booking.paidAmount) || 0;
                const serviceBalance = Math.max(0, originalServicesFee - paidDownpayment);
                const additionalCostsTotal = (booking.additionalCosts || []).reduce((sum: number, cost: any) => sum + (Number(cost.price) || 0), 0);
                const totalBalanceToPay = serviceBalance + additionalCostsTotal;
                
                const activeReferenceNo = activeReceiptTab === 'downpayment'
                    ? (booking.gcashReference || 'N/A')
                    : (booking.gcashBalanceReference || booking.gcashReference || 'N/A');

                return (
                    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[150] flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
                        <div className="bg-[#121214]/95 border border-white/10 rounded-[1.5rem] p-4 max-w-sm w-full shadow-2xl animate-scaleUp relative overflow-hidden backdrop-blur-xl">
                            {/* Orange decorative glow background */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[50px] rounded-full translate-x-10 -translate-y-10"></div>
                            
                            <div className="relative z-10">
                                {/* Header */}
                                <div className="flex items-center justify-between mb-3.5">
                                    <h3 className="text-[15px] font-black text-white flex items-center gap-2 tracking-tight">
                                        <FileText className="text-primary" size={16} />
                                        GCash Receipt Details
                                    </h3>
                                    <button 
                                        onClick={() => setShowReceiptModal(false)}
                                        className="text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 p-1.5 rounded-lg transition-all"
                                    >
                                        <X size={15} />
                                    </button>
                                </div>

                                {/* Reference and Status section */}
                                <div className="grid grid-cols-2 gap-3 mb-3.5 p-3.5 bg-white/[0.02] border border-white/5 rounded-xl">
                                    <div>
                                        <p className="text-[8px] text-gray-500 font-bold uppercase tracking-wider mb-0.5 font-mono">Status</p>
                                        {booking.isVerified ? (
                                            <span className="inline-flex items-center bg-green-500/20 text-green-400 px-2 py-0.5 rounded text-[10px] font-black border border-green-500/20">
                                                Verified
                                            </span>
                                        ) : booking.gcashDeclineReason ? (
                                            <span className="inline-flex items-center bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-[10px] font-black border border-red-500/20">
                                                Declined
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded text-[10px] font-black border border-yellow-500/20">
                                                Pending
                                            </span>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-[8px] text-gray-500 font-bold uppercase tracking-wider mb-0.5 font-mono">Reference No.</p>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-white text-xs font-extrabold font-mono tracking-tight truncate max-w-[110px]">
                                                {activeReferenceNo}
                                            </span>
                                            {activeReferenceNo !== 'N/A' && (
                                                <button
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(activeReferenceNo);
                                                        setCopiedReference(true);
                                                        setTimeout(() => setCopiedReference(false), 2000);
                                                    }}
                                                    className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-all"
                                                    title="Copy Reference Number"
                                                >
                                                    {copiedReference ? (
                                                        <span className="text-[8px] font-black text-primary uppercase font-sans">Copied!</span>
                                                    ) : (
                                                        <Copy size={11} />
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Billing Breakdown */}
                                <div className="space-y-1.5 mb-3.5 p-3.5 bg-white/[0.02] border border-white/5 rounded-xl text-[11px]">
                                    <h4 className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                                        <DollarSign size={11} className="text-primary" />
                                        Payment Calculation
                                    </h4>
                                    
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-400">Total Services Fee</span>
                                        <span className="text-white font-extrabold">{originalServicesFee > 0 ? `₱${originalServicesFee.toLocaleString()}` : 'For Quotation'}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-400">Paid Downpayment (50%)</span>
                                        <span className="text-emerald-400 font-extrabold">{paidDownpayment > 0 ? `-₱${paidDownpayment.toLocaleString()}` : '—'}</span>
                                    </div>
                                    
                                    <div className="h-px bg-white/5 my-1.5"></div>
                                    
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-400 font-medium">Service Balance</span>
                                        <span className="text-white font-extrabold">{serviceBalance > 0 ? `₱${serviceBalance.toLocaleString()}` : 'For Quotation'}</span>
                                    </div>
                                    
                                    {additionalCostsTotal > 0 && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-400">Additional Costs</span>
                                            <span className="text-primary font-bold">+{formatCurrency(additionalCostsTotal)}</span>
                                        </div>
                                    )}

                                    <div className="h-px bg-white/10 my-1.5"></div>

                                    <div className="flex justify-between items-center">
                                        <span className="font-black text-white uppercase tracking-wider text-[10px]">Total Balance to Pay</span>
                                        <span className="text-base font-black text-emerald-400">{totalBalanceToPay > 0 ? `₱${totalBalanceToPay.toLocaleString()}` : 'For Quotation'}</span>
                                    </div>
                                </div>

                                {/* Tabs Header */}
                                <div className="flex border-b border-white/10 mb-3">
                                    <button
                                        onClick={() => setActiveReceiptTab('downpayment')}
                                        className={`flex-1 pb-1.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 text-center ${
                                            activeReceiptTab === 'downpayment'
                                                ? 'border-primary text-primary font-black'
                                                : 'border-transparent text-gray-500 hover:text-white'
                                        }`}
                                    >
                                        1st Payment
                                    </button>
                                    {booking.gcashBalanceReceiptUrl && (
                                        <button
                                            onClick={() => setActiveReceiptTab('balance')}
                                            className={`flex-1 pb-1.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 text-center ${
                                                activeReceiptTab === 'balance'
                                                    ? 'border-primary text-primary font-black'
                                                    : 'border-transparent text-gray-500 hover:text-white'
                                            }`}
                                        >
                                            2nd Payment
                                        </button>
                                    )}
                                </div>

                                {/* Tab Content */}
                                {(() => {
                                    const activeReceiptUrl = activeReceiptTab === 'downpayment'
                                        ? (booking.gcashDownpaymentReceiptUrl || booking.gcashReceiptUrl)
                                        : (booking.gcashBalanceReceiptUrl || booking.gcashReceiptUrl);

                                    return (
                                        <>
                                            <div className="mb-3.5">
                                                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-1 font-mono">
                                                    {activeReceiptTab === 'downpayment' ? '1st Payment / Downpayment Receipt' : 'Final / Balance Payment Receipt'}
                                                </p>
                                                <div className="relative rounded-xl overflow-hidden border border-white/10 bg-neutral-950 p-1 flex items-center justify-center group min-h-[100px]">
                                                    <img 
                                                        src={activeReceiptUrl} 
                                                        alt="GCash Receipt" 
                                                        className="max-h-[150px] w-auto object-contain rounded-lg transition-all duration-300 group-hover:opacity-90"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src = '/assets/receipt_mockup.png';
                                                        }}
                                                    />
                                                    
                                                    {/* Hover Overlay */}
                                                    <a 
                                                        href={activeReceiptUrl} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 gap-2 text-white font-black text-[10px] tracking-widest uppercase font-mono"
                                                    >
                                                        <ExternalLink size={12} />
                                                        Open Image
                                                    </a>
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex flex-col gap-2">
                                                <a 
                                                    href={activeReceiptUrl} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/10 font-black py-2.5 rounded-xl text-[10px] tracking-widest uppercase transition-all flex items-center justify-center gap-1.5 active:scale-95"
                                                >
                                                    <ExternalLink size={12} />
                                                    Open Original URL
                                                </a>
                                                <button
                                                    onClick={() => setShowReceiptModal(false)}
                                                    className="w-full bg-primary hover:bg-orange-600 text-white font-black py-3 rounded-xl text-xs tracking-widest uppercase transition-all shadow-lg shadow-primary/20 active:scale-95"
                                                >
                                                    Close Details
                                                </button>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default BookingDetailScreen;
