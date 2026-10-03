import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useDatabase } from '../context/DatabaseContext';
import { useAuth } from '../context/AuthContext';
import { Booking } from '../types';
import CustomerHeader from '../components/CustomerHeader';
import CustomerMechanicChatModal from '../components/customer/CustomerMechanicChatModal';
import Spinner from '../components/Spinner';
import ReviewModal from '../components/ReviewModal';
import ReviewDeclinedModal from '../components/ReviewDeclinedModal';
import GCashPaymentModal from '../components/GCashPaymentModal';
import { HitPayService, getLiveAppOrigin } from '../services/HitPayService';
import { startPaymentWatcher, openPaymentUrl, setPendingPaymentMarker, resumePendingPaymentVerification, isNativePlatform as isNative, PaymentEntityKind } from '../utils/paymentRedirect';
import { CallButton } from '../components/CallUI';
import { useCall } from '../context/CallContext';
import {
    MapPin, Phone, MessageSquare, Navigation, CheckCircle, Clock,
    Calendar, User, Car, Shield, ChevronRight, ChevronDown, AlertCircle, Info,
    ArrowRight, Map as MapIcon, Mail, Hash, Palette, Gauge,
    FileText, Wrench, DollarSign, Timer, Upload, X, Image as ImageIcon, Bell,
    CreditCard, Eye, ClipboardList, Star, Copy, ExternalLink, Check, Wallet,
    Navigation2, Building2, Lock, Loader2
} from 'lucide-react';

import { ref, onValue, set, get } from 'firebase/database';
import { doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db as firestore, rtdb } from '../firebase';
import LiveRouteMapModal from '../components/LiveRouteMapModal';
import { startPreciseWatch, safeClearWatch, isGeolocationPermissionDenied, RIDERSBUD_STORE_LOCATION } from '../utils/locationHelper';

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
        case 'Trip Ongoing': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
        case 'Confirmed': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
        case 'Received': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
        case 'Ready for Pickup': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
        case 'Active Rental': return 'bg-[#FE7803]/20 text-[#FE7803] border-[#FE7803]/30';
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

            // Free OpenStreetMap Tile Layer
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                subdomains: 'abc',
                crossOrigin: true,
                attribution: '&copy; OpenStreetMap contributors'
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

// Defensive date formatting utility ensuring NO unhandled replace() null errors
const safeFormatDate = (rawDate: any): string => {
    if (!rawDate) return new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    const str = String(rawDate).trim();
    if (str.includes('to')) {
        return str; // e.g., "2026-09-24 to 2026-09-26"
    }
    try {
        const d = new Date(str.replace(/-/g, '/'));
        return isNaN(d.getTime()) ? str : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
        return str;
    }
};

// Normalizer utility to convert a rentalBooking into a unified Booking object
const normalizeRentalBookingToBooking = (data: any, id: string): Booking => {
    const totalAmt = Number(data?.totalAmount || data?.totalPrice) || 0;
    const paidAmt = Number(data?.paidAmount) || 0;
    const downpaymentAmt = Number(data?.downpaymentAmount) || (totalAmt * 0.5);
    const vehicleModel = data?.vehicleModel || data?.carName || 'Rental Vehicle';
    const pickupLoc = data?.pickupLocation || data?.location?.address || 'Main Rental Hub, Cavite';

    let rawLat: any = data?.location?.lat ?? data?.location?.latitude;
    let rawLng: any = data?.location?.lng ?? data?.location?.longitude;
    const numLat = Number(rawLat);
    const numLng = Number(rawLng);

    const locationObj = (!isNaN(numLat) && !isNaN(numLng) && (numLat !== 0 || numLng !== 0))
        ? {
            lat: numLat,
            lng: numLng,
            address: pickupLoc
        }
        : {
            lat: 14.3149,
            lng: 121.0583,
            address: pickupLoc
        };

    const dateStr = data?.startDate && data?.endDate
        ? `${data.startDate} to ${data.endDate}`
        : (data?.startDate || data?.date || new Date().toISOString().split('T')[0]);

    return {
        id,
        customerId: data?.customerId || '',
        customerName: data?.customerName || 'Valued Customer',
        customerPhone: data?.customerPhone || '',
        customerEmail: data?.customerEmail || '',
        serviceId: 'rental',
        serviceName: `Car Rental: ${vehicleModel}`,
        services: [{
            id: 'rental',
            name: `Car Rental: ${vehicleModel}`,
            price: totalAmt,
            category: 'Car Rental',
            description: data?.includeDriver ? 'Rental with Professional Driver' : 'Self-Drive Vehicle Reservation'
        }],
        vehicle: {
            make: vehicleModel,
            model: '',
            plateNumber: data?.plateNumber || 'Reserved Fleet',
            type: data?.carType || 'SUV / Sedan',
            color: 'Fleet White / Silver'
        },
        vehicleDetails: {
            make: vehicleModel,
            model: '',
            plateNumber: data?.plateNumber || 'Reserved Fleet',
            type: data?.carType || 'SUV / Sedan',
            color: 'Fleet White / Silver'
        },
        date: dateStr,
        time: data?.time || '10:00 AM',
        status: data?.status || 'Received',
        location: locationObj,
        totalAmount: totalAmt,
        paidAmount: paidAmt,
        downpaymentAmount: downpaymentAmt,
        remainingBalance: Math.max(0, totalAmt - paidAmt),
        isPaid: data?.isPaid ?? (paidAmt >= (totalAmt - 0.5) && totalAmt > 0),
        paymentStatus: data?.paymentStatus || (paidAmt >= (totalAmt - 0.5) && totalAmt > 0 ? 'paid' : (paidAmt > 0 ? 'partial' : 'pending')),
        paymentMethod: data?.paymentMethod || 'HitPay (Online)',
        isVerified: data?.isVerified ?? true,
        downpaymentRef: data?.downpaymentRef || '',
        downpaymentPaidAt: data?.downpaymentPaidAt || '',
        balancePaymentRef: data?.balancePaymentRef || '',
        balancePaidAt: data?.balancePaidAt || '',
        balancePaid: data?.balancePaid ?? false,
        hitpayReference: data?.hitpayReference || '',
        hitpayPaymentRequestId: data?.hitpayPaymentRequestId || '',
        hitpayStatus: data?.hitpayStatus || '',
        notes: data?.notes || (data?.includeDriver ? 'With Professional Chauffeur Service' : 'Self-Drive Rental Agreement'),
        pickupLocation: pickupLoc,
        destination: data?.destination || '',
        isRental: true,
        isServiceRequest: false,
        isDriverHire: false,
        isLiaison: false
    } as any;
};

// Normalizer utility to convert a liaisonBooking into a unified Booking object with full real-time details
const normalizeLiaisonBookingToBooking = (data: any, id: string): Booking => {
    const fees = data?.fees || {};
    const totalAmt = Number(data?.totalAmount) || Number(fees?.total) || Number(data?.price) || 1500;
    const paidAmt = Number(data?.paidAmount) || 0;
    const downpaymentAmt = Number(data?.downpaymentAmount) || Math.round(totalAmt * 0.5);
    const serviceType = data?.serviceType || 'Registration Assistance';
    const branchName = data?.branchName || 'LTO District Office';
    const officerName = data?.liaisonName || 'Assigned Liaison Officer';
    const veh = data?.vehicleDetails || {};
    const pickupLoc = data?.pickupAddress || (data?.pickupOption === 'Customer brings documents' ? `Customer Walk-in (${branchName})` : 'Home/Office Pickup');

    const vehicleTitle = veh.brand || veh.model 
        ? `${veh.year || ''} ${veh.brand || ''} ${veh.model || ''}`.trim()
        : 'Registered Vehicle';

    const locationObj = {
        lat: 14.5995,
        lng: 120.9842,
        address: branchName
    };

    return {
        id,
        customerId: data?.customerId || '',
        customerName: data?.customerName || 'Valued Client',
        customerPhone: data?.customerPhone || '',
        customerEmail: data?.customerEmail || '',
        serviceId: 'liaison',
        serviceName: `LTO Liaison: ${serviceType}`,
        services: [{
            id: 'liaison',
            name: `LTO Liaison: ${serviceType}`,
            price: totalAmt,
            category: 'Liaison Services',
            description: `Branch: ${branchName} • Liaison Officer: ${officerName}`
        }],
        vehicle: {
            make: veh.brand || 'Vehicle',
            model: veh.model || '',
            plateNumber: veh.plateNumber || 'No Plate / New Reg',
            type: veh.type || 'Automobile / Motorcycle',
            color: veh.color || 'Standard',
            year: veh.year || 2026
        },
        vehicleDetails: {
            plateNumber: veh.plateNumber || 'No Plate / New Reg',
            brand: veh.brand || '',
            model: veh.model || '',
            year: veh.year || 2026,
            color: veh.color || '',
            type: veh.type || 'Sedan',
            engineNumber: veh.engineNumber || 'N/A',
            chassisNumber: veh.chassisNumber || 'N/A',
            currentOrNumber: veh.currentOrNumber || 'N/A',
            currentCrNumber: veh.currentCrNumber || 'N/A',
            province: veh.province || ''
        },
        date: data?.appointmentDate || new Date().toISOString().split('T')[0],
        time: data?.appointmentTime || '08:00 AM - 10:00 AM',
        status: data?.status || 'Booking Received',
        location: locationObj,
        totalAmount: totalAmt,
        paidAmount: paidAmt,
        downpaymentAmount: downpaymentAmt,
        remainingBalance: Math.max(0, totalAmt - paidAmt),
        isPaid: data?.isPaid ?? (paidAmt >= (totalAmt - 0.5) && totalAmt > 0),
        paymentStatus: data?.paymentStatus || (paidAmt >= (totalAmt - 0.5) && totalAmt > 0 ? 'paid' : (paidAmt > 0 ? 'partial' : 'pending')),
        paymentMethod: data?.paymentMethod || 'HitPay (Online)',
        isVerified: data?.isVerified ?? (paidAmt > 0 || data?.paymentStatus === 'Paid'),
        downpaymentRef: data?.downpaymentRef || data?.hitpayReference || '',
        downpaymentPaidAt: data?.downpaymentPaidAt || '',
        balancePaymentRef: data?.balancePaymentRef || '',
        balancePaidAt: data?.balancePaidAt || '',
        balancePaid: data?.balancePaid ?? false,
        hitpayReference: data?.hitpayReference || '',
        hitpayPaymentRequestId: data?.hitpayPaymentRequestId || '',
        hitpayStatus: data?.hitpayStatus || '',
        notes: data?.notes || (data?.pickupOption ? `Pickup: ${data.pickupOption}` : 'LTO Liaison Document Processing'),
        pickupLocation: pickupLoc,
        destination: branchName,
        isRental: false,
        isServiceRequest: false,
        isDriverHire: false,
        isLiaison: true,
        branchName: branchName,
        liaisonName: officerName,
        liaisonId: data?.liaisonId || '',
        pickupOption: data?.pickupOption || 'Customer brings documents',
        pickupAddress: data?.pickupAddress || '',
        documents: data?.documents || [],
        fees: {
            serviceFee: Number(fees.serviceFee) || 1000,
            governmentFee: Number(fees.governmentFee) || 500,
            pickupFee: Number(fees.pickupFee) || 0,
            discount: Number(fees.discount) || 0,
            total: totalAmt
        },
        statusHistory: data?.statusHistory || []
    } as any;
};

// Normalizer utility to convert a serviceRequest (e.g. Driver for Hire, Towing) into a unified Booking object
const normalizeServiceRequestToBooking = (data: any, id: string): Booking => {
    const details = data?.details || {};
    const serviceName = data?.serviceName || details?.serviceName || 'Driver for Hire';
    const totalAmt = Number(data?.totalAmount) || Number(details?.totalAmount) || 0;
    const paidAmt = Number(data?.paidAmount) || Number(details?.paidAmount) || 0;
    const downpaymentAmt = Number(data?.downpaymentAmount) || Number(details?.downpaymentAmount) || (totalAmt * 0.5);

    // Vehicle details: customer car or driver-provided car
    let vehicleData = data?.vehicleDetails || details?.vehicleDetails || null;
    if (!vehicleData && (details?.driveCustomerCar || details?.vehicleBrand)) {
        vehicleData = {
            make: details?.vehicleBrand || 'Vehicle',
            model: details?.vehicleModel || '',
            plateNumber: details?.plateNumber || '',
            type: details?.vehicleType || 'Sedan',
            year: details?.vehicleYear || ''
        };
    }

    // Determine pickup & destination address
    const pickupAddress = details?.pickupLocation || data?.pickupLocation || data?.location?.address || '';
    const destinationAddress = details?.destination || data?.destination || '';

    // Coordinates - Robust extraction from latitude/longitude or lat/lng, startCoords, or customer coords
    let rawLat: any = data?.location?.lat ?? data?.location?.latitude ?? details?.startCoords?.lat ?? details?.startCoords?.latitude;
    let rawLng: any = data?.location?.lng ?? data?.location?.longitude ?? details?.startCoords?.lng ?? details?.startCoords?.longitude;

    if (rawLat == null && Array.isArray(details?.startCoords) && details.startCoords.length >= 2) {
        rawLat = details.startCoords[0];
        rawLng = details.startCoords[1];
    } else if (rawLat == null && Array.isArray(data?.location) && data.location.length >= 2) {
        rawLat = data.location[0];
        rawLng = data.location[1];
    }

    const numLat = Number(rawLat);
    const numLng = Number(rawLng);

    const locationObj = (!isNaN(numLat) && !isNaN(numLng) && (numLat !== 0 || numLng !== 0))
        ? {
            lat: numLat,
            lng: numLng,
            address: pickupAddress || data?.location?.address || 'Pickup Location'
        }
        : {
            lat: 14.3149,
            lng: 121.0583,
            address: pickupAddress || 'Carmona Commercial Center, Governor\'s Drive, Cavite'
        };

    // Format date & time
    const schedDate = data?.scheduledDate || details?.scheduledDate || data?.date || new Date().toISOString().split('T')[0];
    const schedTime = data?.scheduledTime || details?.scheduledTime || data?.time || '10:00 AM';

    const driverName = data?.driverName || details?.selectedDriverName || data?.providerName || 'Pending Assignment';
    const driverPhone = data?.driverPhone || details?.selectedDriverPhone || data?.providerPhone || '';

    return {
        id,
        customerId: data?.customerId || '',
        customerName: data?.customerName || details?.customerName || 'Customer',
        customerPhone: data?.customerPhone || details?.customerPhone || '',
        customerEmail: data?.customerEmail || details?.customerEmail || '',
        serviceId: data?.serviceId || '7',
        serviceName: serviceName,
        services: [{
            id: data?.serviceId || '7',
            name: serviceName,
            price: totalAmt,
            category: 'Driver for Hire',
            description: details?.purposeOfHire ? `Purpose: ${details.purposeOfHire}` : 'Professional Chauffeur'
        }],
        vehicle: vehicleData,
        vehicleDetails: vehicleData,
        date: schedDate,
        time: schedTime,
        status: data?.status || 'Pending Admin Review',
        location: locationObj || { lat: 14.5995, lng: 120.9842, address: pickupAddress || 'Manila, Philippines' },
        totalAmount: totalAmt,
        paidAmount: paidAmt,
        downpaymentAmount: downpaymentAmt,
        remainingBalance: Math.max(0, totalAmt - paidAmt),
        isPaid: data?.isPaid ?? (paidAmt >= totalAmt && totalAmt > 0),
        paymentStatus: data?.paymentStatus || (paidAmt >= totalAmt && totalAmt > 0 ? 'paid' : (paidAmt > 0 ? 'partial' : 'pending')),
        paymentMethod: data?.paymentMethod || 'HitPay (Online)',
        isVerified: data?.isVerified ?? false,
        downpaymentRef: data?.downpaymentRef || details?.downpaymentRef || '',
        downpaymentPaidAt: data?.downpaymentPaidAt || details?.downpaymentPaidAt || '',
        balancePaymentRef: data?.balancePaymentRef || details?.balancePaymentRef || '',
        balancePaidAt: data?.balancePaidAt || details?.balancePaidAt || '',
        balancePaid: data?.balancePaid ?? false,
        hitpayReference: data?.hitpayReference || '',
        hitpayPaymentRequestId: data?.hitpayPaymentRequestId || '',
        hitpayStatus: data?.hitpayStatus || '',
        gcashReceiptUrl: data?.gcashReceiptUrl || '',
        gcashDownpaymentReceiptUrl: data?.gcashDownpaymentReceiptUrl || '',
        gcashBalanceReceiptUrl: data?.gcashBalanceReceiptUrl || '',
        notes: data?.notes || details?.specialInstructions || '',
        driverName: driverName,
        driverPhone: driverPhone,
        pickupLocation: pickupAddress,
        destination: destinationAddress,
        details: details,
        isServiceRequest: true,
        isDriverHire: true,
        estimatedArrivalTime: data?.estimatedArrivalTime || details?.estimatedArrivalTime || '',
        remarks: data?.remarks || details?.remarks || ''
    } as any;
};

const BookingDetailScreen: React.FC = () => {
    const { bookingId } = useParams<{ bookingId: string }>();
    const navigate = useNavigate();
    const locationState = useLocation();
    const navPassedBooking = (locationState.state as any)?.booking;

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

    const { 
        db, 
        updateBookingStatus, 
        cancelBooking, 
        addReview, 
        updateBookingPayment, 
        updateRentalBooking,
        updateLiaisonBooking,
        updateServiceRequest,
        updateServiceRequestStatus,
        loading: dbLoading 
    } = useDatabase();
    const { user } = useAuth();
    const { startCall, callStatus } = useCall();
    
    // Modal & Review States
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [isCancelling, setIsCancelling] = useState(false);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);
    const [showDeclineModal, setShowDeclineModal] = useState(false);
    const [reviewSubmitted, setReviewSubmitted] = useState(false);
    const [showReleaseFundsModal, setShowReleaseFundsModal] = useState(false);
    const [showGCashPaymentModal, setShowGCashPaymentModal] = useState(false);
    const [isBalanceModalDismissed, setIsBalanceModalDismissed] = useState(false);
    const [showCompleteTransactionModal, setShowCompleteTransactionModal] = useState(false);
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [copiedReference, setCopiedReference] = useState(false);
    const [copiedRefKey, setCopiedRefKey] = useState<string | null>(null);

    const handleCopyReference = (text: string, key: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedRefKey(key);
        setTimeout(() => setCopiedRefKey(null), 2000);
    };
    const [activeReceiptTab, setActiveReceiptTab] = useState<'downpayment' | 'balance'>('downpayment');
    const [confettiPieces, setConfettiPieces] = useState<any[]>([]);
    const [showMechanicDetailsModal, setShowMechanicDetailsModal] = useState(false);
    const [showLiveRouteModal, setShowLiveRouteModal] = useState(false);
    const [activeModalTab, setActiveModalTab] = useState<'info' | 'reviews'>('info');
    const [isInitiatingHitPay, setIsInitiatingHitPay] = useState(false);
    const [hitPayLoadingStage, setHitPayLoadingStage] = useState<string>('Preparing Balance Settlement...');
    const [isVerifyingFinalPayment, setIsVerifyingFinalPayment] = useState(false);
    const [showVehicleDetails, setShowVehicleDetails] = useState(false);
    const [selectedProgressPhoto, setSelectedProgressPhoto] = useState<string | null>(null);
    
    // Live Location & ETA Tracking States
    const [mechanicLiveLocation, setMechanicLiveLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [eta, setEta] = useState<string | null>(null);
    const [distance, setDistance] = useState<number | null>(null);

    // Initial state: populate immediately from navigation state or cached DB to eliminate flicker
    const initialBookingSeed = useMemo(() => {
        if (!bookingId) return null;
        const cleanId = bookingId.replace(/^LIA-/, '').replace(/^RNT-/, '').replace(/^RN-/, '').replace(/^DRV-/, '').toLowerCase();

        if (navPassedBooking) {
            const passedId = String(navPassedBooking.id || navPassedBooking.bookingId || '').toLowerCase();
            const isMatch = !passedId || 
                passedId === bookingId.toLowerCase() || 
                passedId === cleanId ||
                bookingId.toLowerCase().includes(passedId) ||
                passedId.includes(cleanId) ||
                passedId.slice(-6) === bookingId.slice(-6).toLowerCase();

            if (isMatch || navPassedBooking.isLiaison || (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('isLiaison') === 'true')) {
                if (navPassedBooking.isRental || navPassedBooking.carId || navPassedBooking.serviceName?.includes('Rent')) {
                    return normalizeRentalBookingToBooking(navPassedBooking, bookingId);
                }
                if (
                    navPassedBooking.isLiaison || 
                    navPassedBooking.type === 'liaison' || 
                    navPassedBooking.serviceName?.toLowerCase().includes('liaison') ||
                    navPassedBooking.serviceType ||
                    navPassedBooking.branchName ||
                    (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('isLiaison') === 'true')
                ) {
                    return normalizeLiaisonBookingToBooking(navPassedBooking, bookingId);
                }
                return navPassedBooking.isServiceRequest || navPassedBooking.serviceName === 'Driver for Hire'
                    ? normalizeServiceRequestToBooking(navPassedBooking, bookingId)
                    : navPassedBooking;
            }
        }
        if (db?.liaisonBookings) {
            const foundL = db.liaisonBookings.find(l => 
                l.id === bookingId || 
                l.id?.slice(-6).toLowerCase() === cleanId ||
                l.id?.toLowerCase() === cleanId ||
                bookingId.toLowerCase().includes(l.id?.toLowerCase())
            );
            if (foundL) return normalizeLiaisonBookingToBooking(foundL, bookingId);
        }
        if (db?.rentalBookings) {
            const foundR = db.rentalBookings.find(r => r.id === bookingId || r.id?.slice(-6) === bookingId.slice(-6));
            if (foundR) return normalizeRentalBookingToBooking(foundR, bookingId);
        }
        if (db?.serviceRequests) {
            const foundS = db.serviceRequests.find(s => s.id === bookingId);
            if (foundS) return normalizeServiceRequestToBooking(foundS, bookingId);
        }
        if (db?.bookings) {
            const foundB = db.bookings.find(b => b.id === bookingId);
            if (foundB) return foundB;
        }
        return null;
    }, [bookingId, navPassedBooking, db?.bookings, db?.serviceRequests, db?.rentalBookings, db?.liaisonBookings]);

    const [fetchedBooking, setFetchedBooking] = useState<Booking | null>(initialBookingSeed);
    const [isFetching, setIsFetching] = useState(!initialBookingSeed);

    // Sync seed if initialBookingSeed becomes available
    useEffect(() => {
        if (initialBookingSeed && !fetchedBooking) {
            setFetchedBooking(initialBookingSeed);
            setIsFetching(false);
        }
    }, [initialBookingSeed, fetchedBooking]);

    // Monitor for HitPay return redirect directly on BookingDetailScreen
    const finalizeRun = React.useRef(false);
    useEffect(() => {
        const query = new URLSearchParams(window.location.search);
        const status = query.get('status') || query.get('hitpay');

        if ((status === 'completed' || status === 'success') && !finalizeRun.current) {
            const hitpayRef = query.get('reference') || query.get('payment_request_id') || `HITPAY-${Date.now()}`;
            const reqId = query.get('payment_request_id') || '';
            const targetBookingId = query.get('bookingId') || bookingId;

            // Reconcile booking source: use fetchedBooking, initialBookingSeed, navPassedBooking, or pendingHitPayServiceTx from sessionStorage
            let activeBooking: any = fetchedBooking || initialBookingSeed || navPassedBooking;
            let sessionBookingData: any = null;
            try {
                const storedSession = sessionStorage.getItem('pendingHitPayServiceTx');
                if (storedSession) {
                    sessionBookingData = JSON.parse(storedSession);
                    if (!activeBooking && sessionBookingData?.fullBooking) {
                        activeBooking = sessionBookingData.fullBooking;
                    }
                }
            } catch (_) {}

            if (targetBookingId && activeBooking && !activeBooking.isPaid) {
                finalizeRun.current = true;
                setIsVerifyingFinalPayment(true);
                const totalAmt = activeBooking.totalAmount || activeBooking.service?.price || sessionBookingData?.totalAmount || 0;
                const addCosts = (activeBooking.additionalCosts || []).reduce((sum: number, c: any) => sum + (Number(c.price) || 0), 0);
                const initialDp = activeBooking.downpaymentAmount 
                    ? Number(activeBooking.downpaymentAmount)
                    : (sessionBookingData?.currentPaid || (totalAmt * 0.5));
                const fullTotal = totalAmt + addCosts;
                const balanceAmt = Math.max(0, fullTotal - initialDp);

                const isRentalTarget = (activeBooking as any)?.isRental === true || 
                    (activeBooking as any)?.serviceName?.toLowerCase().includes('rental') ||
                    (targetBookingId?.startsWith('RNT-') ?? false) || 
                    (targetBookingId?.startsWith('RN-') ?? false) ||
                    query.get('isRental') === 'true' ||
                    Boolean(sessionBookingData?.isRental);

                const isLiaisonTarget = (activeBooking as any)?.isLiaison === true ||
                    (activeBooking as any)?.serviceName?.toLowerCase().includes('liaison') ||
                    (targetBookingId?.startsWith('LIA-') ?? false) ||
                    query.get('isLiaison') === 'true' ||
                    Boolean(sessionBookingData?.isLiaison);

                const isServiceReq = (activeBooking as any).isServiceRequest || targetBookingId.startsWith('DRV-') || Boolean(sessionBookingData?.isDriver);

                const finalPayload: any = {
                    isPaid: true,
                    isVerified: true,
                    paidAmount: fullTotal,
                    downpaymentAmount: initialDp,
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
                };

                const completeFinalization = () => {
                    sessionStorage.removeItem('pendingHitPayServiceTx');
                    window.history.replaceState({}, document.title, window.location.pathname);
                    setIsVerifyingFinalPayment(false);
                    setShowCompleteTransactionModal(true);
                    setFetchedBooking(prev => prev ? ({ ...prev, ...finalPayload } as Booking) : ({ ...activeBooking, ...finalPayload } as Booking));
                };

                if (isLiaisonTarget) {
                    if (updateLiaisonBooking) {
                        updateLiaisonBooking(targetBookingId, finalPayload)
                            .then(completeFinalization)
                            .catch(async (err) => {
                                console.warn("updateLiaisonBooking fallback to direct Firestore:", err);
                                try {
                                    await updateDoc(doc(firestore, 'liaisonBookings', targetBookingId), finalPayload);
                                } catch (_) {}
                                completeFinalization();
                            });
                    } else {
                        updateDoc(doc(firestore, 'liaisonBookings', targetBookingId), finalPayload)
                            .then(completeFinalization)
                            .catch(completeFinalization);
                    }
                } else if (isRentalTarget) {
                    if (updateRentalBooking) {
                        updateRentalBooking(targetBookingId, finalPayload)
                            .then(completeFinalization)
                            .catch(async (err) => {
                                console.warn("updateRentalBooking fallback to direct Firestore:", err);
                                try {
                                    await updateDoc(doc(firestore, 'rentalBookings', targetBookingId), finalPayload);
                                } catch (_) {}
                                completeFinalization();
                            });
                    } else {
                        updateDoc(doc(firestore, 'rentalBookings', targetBookingId), finalPayload)
                            .then(completeFinalization)
                            .catch(completeFinalization);
                    }
                } else if (isServiceReq) {
                    if (updateServiceRequest) {
                        updateServiceRequest(targetBookingId, finalPayload)
                            .then(completeFinalization)
                            .catch(async (err) => {
                                console.warn("updateServiceRequest fallback to direct Firestore:", err);
                                try {
                                    await updateDoc(doc(firestore, 'serviceRequests', targetBookingId), finalPayload);
                                } catch (_) {}
                                completeFinalization();
                            });
                    } else {
                        updateDoc(doc(firestore, 'serviceRequests', targetBookingId), finalPayload)
                            .then(completeFinalization)
                            .catch(completeFinalization);
                    }
                } else {
                    // Standard mechanic / maintenance booking
                    if (updateBookingPayment) {
                        updateBookingPayment(targetBookingId, balanceAmt, 'paid', finalPayload)
                            .then(completeFinalization)
                            .catch(async (err) => {
                                console.warn("updateBookingPayment fallback to direct Firestore:", err);
                                try {
                                    await updateDoc(doc(firestore, 'bookings', targetBookingId), finalPayload);
                                } catch (_) {}
                                completeFinalization();
                            });
                    } else {
                        updateDoc(doc(firestore, 'bookings', targetBookingId), finalPayload)
                            .then(completeFinalization)
                            .catch(completeFinalization);
                    }
                }
            } else if (activeBooking && (activeBooking.isPaid || activeBooking.paymentStatus === 'paid')) {
                // If activeBooking was already marked as paid (e.g. from realtime Firestore), clean up immediately
                finalizeRun.current = true;
                sessionStorage.removeItem('pendingHitPayServiceTx');
                window.history.replaceState({}, document.title, window.location.pathname);
                setIsVerifyingFinalPayment(false);
            }
        }
    }, [bookingId, fetchedBooking, initialBookingSeed, navPassedBooking, updateBookingPayment, updateServiceRequest, updateRentalBooking, updateLiaisonBooking]);

    // Safety watchdog: ensure verification loader is NEVER stuck on screen
    useEffect(() => {
        if (!isVerifyingFinalPayment) return;
        const safetyTimer = setTimeout(() => {
            console.log('[BookingDetailScreen] Safety auto-dismissing payment verification loader');
            setIsVerifyingFinalPayment(false);
            sessionStorage.removeItem('pendingHitPayServiceTx');
            window.history.replaceState({}, document.title, window.location.pathname);
        }, 4000);
        return () => clearTimeout(safetyTimer);
    }, [isVerifyingFinalPayment]);

    // Pre-warming ref for instant final balance payment checkout
    const prewarmedBalanceHitPayRef = useRef<{
        bookingId: string;
        amount: number;
        promise: Promise<{ url: string; reference_number: string }>;
        readyResult?: { url: string; reference_number: string };
    } | null>(null);

    // Pre-warm HitPay balance payment as soon as work is done and balance is unpaid
    useEffect(() => {
        const activeB = fetchedBooking || initialBookingSeed || navPassedBooking;
        if (!activeB || !user || !db?.settings) return;

        const isFinished = activeB.status === 'Work Done' || 
            activeB.status === 'Completed' ||
            (activeB as any).workStatus === 'completed' ||
            (activeB as any).status === 'Ready for Release';
        const isPaid = activeB.isPaid || activeB.paymentStatus === 'paid' || (activeB as any).balancePaid === true;

        if (!isFinished || isPaid) return;

        const originalServicesFee = activeB.services && activeB.services.length > 0
            ? activeB.services.reduce((sum: number, svc: any) => sum + (Number(svc.price) || 0), 0)
            : (Number(activeB.service?.price) || Number(activeB.totalAmount) || 0);
        const paidDownpayment = Number(activeB.paidAmount) || (originalServicesFee * 0.5);
        const serviceBalance = Math.max(0, originalServicesFee - paidDownpayment);
        const additionalCostsTotal = ((activeB as any).additionalCosts || []).reduce((sum: number, cost: any) => sum + (Number(cost.price) || 0), 0);
        const finalBalanceAmount = Math.max(0, serviceBalance + additionalCostsTotal);

        if (finalBalanceAmount <= 0) return;

        // If already pre-warmed for this exact booking & amount, avoid duplicates
        if (
            prewarmedBalanceHitPayRef.current &&
            prewarmedBalanceHitPayRef.current.bookingId === activeB.id &&
            prewarmedBalanceHitPayRef.current.amount === finalBalanceAmount
        ) {
            return;
        }

        const isRentalTarget = (activeB as any).isRental === true || 
            (activeB as any).serviceName?.toLowerCase().includes('rental') ||
            activeB.id.startsWith('RNT-') || 
            activeB.id.startsWith('RN-');
        const isDriverTarget = (activeB as any).isDriverHire || (activeB as any).serviceName === 'Driver for Hire';
        const isLiaisonTarget = (activeB as any).isLiaison || (activeB as any).serviceName?.toLowerCase().includes('liaison') || activeB.id.startsWith('LIA-');

        const hitPay = HitPayService.fromSettings(db?.settings);
        const returnUrl = `${getLiveAppOrigin()}${window.location.pathname}?bookingId=${activeB.id}${isRentalTarget ? '&isRental=true' : ''}${isDriverTarget ? '&isDriver=true' : ''}${isLiaisonTarget ? '&isLiaison=true' : ''}`;
        const appTitle = db?.settings?.appName || 'RidersBUD';
        const purposePrefix = isRentalTarget 
            ? 'Car Rental Balance Settlement' 
            : isDriverTarget 
            ? 'Driver for Hire Balance Settlement' 
            : isLiaisonTarget
            ? 'LTO Liaison Balance Settlement'
            : 'Final Balance Settlement';

        const paymentPromise = hitPay.createPaymentRequest({
            amount: finalBalanceAmount,
            currency: db?.settings?.currency || 'PHP',
            reference_number: `${isRentalTarget ? 'RNT' : isLiaisonTarget ? 'LIA' : 'BOK'}-${activeB.id}-BAL-${Date.now()}`,
            webhook: 'https://ridersbud-10806.web.app/api/hitpay-webhook',
            redirect_url: returnUrl,
            email: user.email || 'customer@example.com',
            name: user.name || 'Customer',
            purpose: `${appTitle} — ${purposePrefix} (#${activeB.id.slice(-6).toUpperCase()})`
        }).then(res => {
            if (prewarmedBalanceHitPayRef.current?.bookingId === activeB.id) {
                prewarmedBalanceHitPayRef.current.readyResult = res;
            }
            return res;
        }).catch(err => {
            console.warn('[Prewarm] HitPay balance pre-warm notice:', err?.message || err);
            throw err;
        });

        prewarmedBalanceHitPayRef.current = {
            bookingId: activeB.id,
            amount: finalBalanceAmount,
            promise: paymentPromise
        };
    }, [fetchedBooking?.status, fetchedBooking?.paidAmount, (fetchedBooking as any)?.additionalCosts, initialBookingSeed?.status, user?.email, db?.settings]);

    const handleInitiateHitPayBalance = async (targetBooking: Booking) => {
        if (!targetBooking || !user) return;
        try {
            setIsInitiatingHitPay(true);
            const originalServicesFee = targetBooking.services && targetBooking.services.length > 0
                ? targetBooking.services.reduce((sum: number, svc: any) => sum + (Number(svc.price) || 0), 0)
                : (Number(targetBooking.service?.price) || Number(targetBooking.totalAmount) || 0);
            const paidDownpayment = Number(targetBooking.paidAmount) || (originalServicesFee * 0.5);
            const serviceBalance = Math.max(0, originalServicesFee - paidDownpayment);
            const additionalCostsTotal = ((targetBooking as any).additionalCosts || []).reduce((sum: number, cost: any) => sum + (Number(cost.price) || 0), 0);
            const finalBalanceAmount = Math.max(0, serviceBalance + additionalCostsTotal);

            const isRentalTarget = (targetBooking as any).isRental === true || 
                (targetBooking as any).serviceName?.toLowerCase().includes('rental') ||
                targetBooking.id.startsWith('RNT-') || 
                targetBooking.id.startsWith('RN-');

            const isDriverTarget = (targetBooking as any).isDriverHire || (targetBooking as any).serviceName === 'Driver for Hire';
            const isLiaisonTarget = (targetBooking as any).isLiaison || (targetBooking as any).serviceName?.toLowerCase().includes('liaison') || targetBooking.id.startsWith('LIA-');

            const hitPay = HitPayService.fromSettings(db?.settings);
            const returnUrl = `${getLiveAppOrigin()}${window.location.pathname}?bookingId=${targetBooking.id}${isRentalTarget ? '&isRental=true' : ''}${isDriverTarget ? '&isDriver=true' : ''}${isLiaisonTarget ? '&isLiaison=true' : ''}`;
            const appTitle = db?.settings?.appName || 'RidersBUD';

            sessionStorage.setItem('pendingHitPayServiceTx', JSON.stringify({
                bookingId: targetBooking.id,
                amount: finalBalanceAmount,
                totalAmount: originalServicesFee + additionalCostsTotal,
                currentPaid: paidDownpayment,
                fullBooking: targetBooking,
                isRental: isRentalTarget,
                isDriver: isDriverTarget,
                isLiaison: isLiaisonTarget
            }));

            const purposePrefix = isRentalTarget 
                ? 'Car Rental Balance Settlement' 
                : isDriverTarget 
                ? 'Driver for Hire Balance Settlement' 
                : isLiaisonTarget
                ? 'LTO Liaison Balance Settlement'
                : 'Final Balance Settlement';

            setHitPayLoadingStage('Connecting to HitPay Gateway...');

            // Check if we have an active pre-warmed payment session for instant launch
            let paymentRes: { url: string; reference_number?: string } | null = null;
            const prewarmed = prewarmedBalanceHitPayRef.current;
            if (prewarmed && prewarmed.bookingId === targetBooking.id && prewarmed.amount === finalBalanceAmount) {
                if (prewarmed.readyResult?.url) {
                    paymentRes = prewarmed.readyResult;
                } else {
                    try {
                        paymentRes = await prewarmed.promise;
                    } catch (_) {
                        paymentRes = null;
                    }
                }
            }

            if (!paymentRes) {
                paymentRes = await hitPay.createPaymentRequest({
                    amount: finalBalanceAmount,
                    currency: db?.settings?.currency || 'PHP',
                    reference_number: `${isRentalTarget ? 'RNT' : isLiaisonTarget ? 'LIA' : 'BOK'}-${targetBooking.id}-BAL-${Date.now()}`,
                    webhook: 'https://ridersbud-10806.web.app/api/hitpay-webhook',
                    redirect_url: returnUrl,
                    email: user.email || 'customer@example.com',
                    name: user.name || 'Customer',
                    purpose: `${appTitle} — ${purposePrefix} (#${targetBooking.id.slice(-6).toUpperCase()})`
                });
            }

            const { url } = paymentRes;
            setHitPayLoadingStage('Opening Checkout...');

            if (url.startsWith('/')) {
                navigate(url);
            } else {
                const entityKind: PaymentEntityKind = isRentalTarget ? 'rental' : isLiaisonTarget ? 'liaison' : isDriverTarget ? 'service-request' : 'booking';
                setPendingPaymentMarker({
                    entityKind,
                    entityId: targetBooking.id,
                    returnRoute: `/customer-portal/booking-detail/${targetBooking.id}`,
                    startedAt: Date.now(),
                    purpose: 'balance-settlement'
                });
                startPaymentWatcher(entityKind, targetBooking.id, `/customer-portal/booking-detail/${targetBooking.id}`);
                await openPaymentUrl(url);
            }
        } catch (err: any) {
            console.info("ℹ️ Online gateway requires manual/service payment verification. Redirecting to payment screen.");
            const isRentalTarget = (targetBooking as any).isRental === true || targetBooking.id.startsWith('RNT-') || targetBooking.id.startsWith('RN-');
            const isLiaisonTarget = (targetBooking as any).isLiaison || (targetBooking as any).serviceName?.toLowerCase().includes('liaison') || targetBooking.id.startsWith('LIA-');
            navigate(`/customer-portal/service-payment/${targetBooking.id}${isRentalTarget ? '?isRental=true' : isLiaisonTarget ? '?isLiaison=true' : ''}`);
        } finally {
            setIsInitiatingHitPay(false);
            setHitPayLoadingStage('Preparing Balance Settlement...');
        }
    };

    useEffect(() => {
        if (!bookingId) {
            setIsFetching(false);
            return;
        }

        // Determine specialized booking type
        const cleanId = bookingId.replace(/^LIA-/, '').replace(/^RNT-/, '').replace(/^RN-/, '').replace(/^DRV-/, '').toLowerCase();
        const isRentalInDb = db?.rentalBookings?.some(r => r.id === bookingId || r.id?.slice(-6) === bookingId.slice(-6));
        const isLiaisonInDb = db?.liaisonBookings?.some(l => 
            l.id === bookingId || 
            l.id?.slice(-6).toLowerCase() === cleanId ||
            l.id?.toLowerCase() === cleanId ||
            bookingId.toLowerCase().includes(l.id?.toLowerCase() || '')
        );
        const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        const isRentalParam = urlParams?.get('isRental') === 'true' || urlParams?.get('service') === 'rental';
        const isLiaisonParam = urlParams?.get('isLiaison') === 'true' || urlParams?.get('service') === 'liaison';
        const isLikelyRental = bookingId.startsWith('RNT-') || bookingId.startsWith('RN-') || (navPassedBooking?.isRental) || isRentalInDb || isRentalParam;
        const isLikelyLiaison = bookingId.startsWith('LIA-') || (navPassedBooking?.isLiaison) || Boolean(navPassedBooking?.branchName) || Boolean(navPassedBooking?.serviceType) || isLiaisonInDb || isLiaisonParam;
        const isLikelyServiceReq = bookingId.startsWith('DRV-') || bookingId.startsWith('TOW-');

        let unsubServiceReq: (() => void) | null = null;
        let unsubBooking: (() => void) | null = null;
        let unsubRental: (() => void) | null = null;
        let unsubLiaison: (() => void) | null = null;

        if (isLikelyRental) {
            unsubRental = onSnapshot(
                doc(firestore, 'rentalBookings', bookingId),
                (docSnap) => {
                    if (docSnap.exists()) {
                        setFetchedBooking(normalizeRentalBookingToBooking(docSnap.data(), docSnap.id));
                        setIsFetching(false);
                    } else {
                        // Fallback check in local db if newly written
                        const localRental = db?.rentalBookings?.find(r => r.id === bookingId || r.id?.slice(-6) === bookingId.slice(-6));
                        if (localRental) {
                            setFetchedBooking(normalizeRentalBookingToBooking(localRental, bookingId));
                        } else if (navPassedBooking) {
                            setFetchedBooking(normalizeRentalBookingToBooking(navPassedBooking, bookingId));
                        }
                        setIsFetching(false);
                    }
                },
                (err) => {
                    console.error("Error listening to rentalBookings real-time:", err);
                    const localRental = db?.rentalBookings?.find(r => r.id === bookingId || r.id?.slice(-6) === bookingId.slice(-6));
                    if (localRental) {
                        setFetchedBooking(normalizeRentalBookingToBooking(localRental, bookingId));
                    }
                    setIsFetching(false);
                }
            );
        } else if (isLikelyLiaison) {
            // Subscribe directly to liaisonBookings collection (try bookingId or cleanId)
            const targetDocId = bookingId.startsWith('LIA-') ? bookingId : `LIA-${bookingId}`;
            const altDocId = bookingId.replace(/^LIA-/, '');

            unsubLiaison = onSnapshot(
                doc(firestore, 'liaisonBookings', targetDocId),
                (docSnap) => {
                    if (docSnap.exists()) {
                        setFetchedBooking(normalizeLiaisonBookingToBooking(docSnap.data(), docSnap.id));
                        setIsFetching(false);
                    } else {
                        // Try altDocId if targetDocId was not found
                        getDoc(doc(firestore, 'liaisonBookings', altDocId)).then((altSnap) => {
                            if (altSnap.exists()) {
                                setFetchedBooking(normalizeLiaisonBookingToBooking(altSnap.data(), altSnap.id));
                                setIsFetching(false);
                                return;
                            }
                            const cleanId = bookingId.replace(/^LIA-/, '').toLowerCase();
                            const localLiaison = db?.liaisonBookings?.find(l => 
                                l.id === bookingId || 
                                l.id?.slice(-6).toLowerCase() === cleanId ||
                                l.id?.toLowerCase() === cleanId ||
                                bookingId.toLowerCase().includes(l.id?.toLowerCase())
                            );
                            if (localLiaison) {
                                setFetchedBooking(normalizeLiaisonBookingToBooking(localLiaison, bookingId));
                            } else if (navPassedBooking) {
                                setFetchedBooking(normalizeLiaisonBookingToBooking(navPassedBooking, bookingId));
                            }
                            setIsFetching(false);
                        }).catch(() => {
                            if (navPassedBooking) {
                                setFetchedBooking(normalizeLiaisonBookingToBooking(navPassedBooking, bookingId));
                            }
                            setIsFetching(false);
                        });
                    }
                },
                (err) => {
                    console.error("Error listening to liaisonBookings real-time:", err);
                    const cleanId = bookingId.replace(/^LIA-/, '').toLowerCase();
                    const localLiaison = db?.liaisonBookings?.find(l => 
                        l.id === bookingId || 
                        l.id?.slice(-6).toLowerCase() === cleanId ||
                        l.id?.toLowerCase() === cleanId ||
                        bookingId.toLowerCase().includes(l.id?.toLowerCase())
                    );
                    if (localLiaison) {
                        setFetchedBooking(normalizeLiaisonBookingToBooking(localLiaison, bookingId));
                    } else if (navPassedBooking) {
                        setFetchedBooking(normalizeLiaisonBookingToBooking(navPassedBooking, bookingId));
                    }
                    setIsFetching(false);
                }
            );
        } else if (isLikelyServiceReq) {
            // Subscribe directly to serviceRequests collection
            unsubServiceReq = onSnapshot(
                doc(firestore, 'serviceRequests', bookingId),
                (docSnap) => {
                    if (docSnap.exists()) {
                        setFetchedBooking(normalizeServiceRequestToBooking(docSnap.data(), docSnap.id));
                        setIsFetching(false);
                    } else {
                        // Fallback check in bookings just in case
                        unsubBooking = onSnapshot(
                            doc(firestore, 'bookings', bookingId),
                            (bSnap) => {
                                if (bSnap.exists()) {
                                    setFetchedBooking({ id: bSnap.id, ...bSnap.data() } as Booking);
                                } else {
                                    setFetchedBooking(null);
                                }
                                setIsFetching(false);
                            },
                            () => setIsFetching(false)
                        );
                    }
                },
                (err) => {
                    console.error("Error listening to serviceRequests real-time:", err);
                    setIsFetching(false);
                }
            );
        } else {
            // Check bookings first, then fall back to rentalBookings, liaisonBookings, or serviceRequests
            unsubBooking = onSnapshot(
                doc(firestore, 'bookings', bookingId),
                (docSnap) => {
                    if (docSnap.exists()) {
                        setFetchedBooking({ id: docSnap.id, ...docSnap.data() } as Booking);
                        setIsFetching(false);
                    } else {
                        // Document doesn't exist in 'bookings' collection — check 'rentalBookings'
                        if (unsubRental) unsubRental();
                        unsubRental = onSnapshot(
                            doc(firestore, 'rentalBookings', bookingId),
                            (rSnap) => {
                                if (rSnap.exists()) {
                                    setFetchedBooking(normalizeRentalBookingToBooking(rSnap.data(), rSnap.id));
                                    setIsFetching(false);
                                } else {
                                    // Check 'liaisonBookings'
                                    if (unsubLiaison) unsubLiaison();
                                    unsubLiaison = onSnapshot(
                                        doc(firestore, 'liaisonBookings', bookingId),
                                        (lSnap) => {
                                            if (lSnap.exists()) {
                                                setFetchedBooking(normalizeLiaisonBookingToBooking(lSnap.data(), lSnap.id));
                                                setIsFetching(false);
                                            } else {
                                                // Check 'serviceRequests'
                                                if (unsubServiceReq) unsubServiceReq();
                                                unsubServiceReq = onSnapshot(
                                                    doc(firestore, 'serviceRequests', bookingId),
                                                    (sSnap) => {
                                                        if (sSnap.exists()) {
                                                            setFetchedBooking(normalizeServiceRequestToBooking(sSnap.data(), sSnap.id));
                                                        } else {
                                                            const localLiaison = db?.liaisonBookings?.find(l => l.id === bookingId || l.id?.slice(-6) === bookingId.slice(-6));
                                                            if (localLiaison) {
                                                                setFetchedBooking(normalizeLiaisonBookingToBooking(localLiaison, bookingId));
                                                            } else {
                                                                setFetchedBooking(null);
                                                            }
                                                        }
                                                        setIsFetching(false);
                                                    },
                                                    () => setIsFetching(false)
                                                );
                                            }
                                        },
                                        () => setIsFetching(false)
                                    );
                                }
                            },
                            () => setIsFetching(false)
                        );
                    }
                },
                (err) => {
                    console.error("Error listening to booking details in real-time:", err);
                    setIsFetching(false);
                }
            );
        }

        return () => {
            if (unsubBooking) { try { unsubBooking(); } catch (_) {} }
            if (unsubServiceReq) { try { unsubServiceReq(); } catch (_) {} }
            if (unsubRental) { try { unsubRental(); } catch (_) {} }
            if (unsubLiaison) { try { unsubLiaison(); } catch (_) {} }
        };
    }, [bookingId, db?.rentalBookings, db?.liaisonBookings, navPassedBooking]);

    // Seamless combination of realtime Firestore document with local database optimistic state
    const booking = useMemo(() => {
        if (!bookingId) return fetchedBooking;
        // Check if there is an updated liaisonBooking in db context
        const cleanId = bookingId.replace(/^LIA-/, '').toLowerCase();
        const localLiaison = db?.liaisonBookings?.find(l => 
            l.id === bookingId || 
            l.id?.slice(-6).toLowerCase() === cleanId ||
            l.id?.toLowerCase() === cleanId ||
            bookingId.toLowerCase().includes(l.id?.toLowerCase())
        );
        if (localLiaison) {
            const normalizedLiaison = normalizeLiaisonBookingToBooking(localLiaison, bookingId);
            if (!fetchedBooking) return normalizedLiaison;
            return {
                ...fetchedBooking,
                ...normalizedLiaison,
                status: localLiaison.status || fetchedBooking.status,
                paymentStatus: localLiaison.paymentStatus || fetchedBooking.paymentStatus,
                paidAmount: localLiaison.paidAmount != null ? localLiaison.paidAmount : fetchedBooking.paidAmount
            };
        }
        // Check if there is an updated serviceRequest in db context
        const localReq = db?.serviceRequests?.find(s => s.id === bookingId || s.id?.slice(-6) === bookingId.slice(-6));
        if (localReq) {
            const normalizedLocal = normalizeServiceRequestToBooking(localReq, bookingId);
            if (!fetchedBooking) return normalizedLocal;
            // Merge with priority on freshest updatedAt or status
            return {
                ...fetchedBooking,
                ...normalizedLocal,
                status: localReq.status || fetchedBooking.status,
                driverName: localReq.driverName || fetchedBooking.driverName,
                driverPhone: localReq.driverPhone || fetchedBooking.driverPhone,
                estimatedArrivalTime: localReq.estimatedArrivalTime || (fetchedBooking as any).estimatedArrivalTime,
                remarks: localReq.remarks || (fetchedBooking as any).remarks
            };
        }
        // Check if there is an updated rentalBooking in db context
        const localRental = db?.rentalBookings?.find(r => r.id === bookingId || r.id?.slice(-6) === bookingId.slice(-6));
        if (localRental) {
            const normalizedRental = normalizeRentalBookingToBooking(localRental, bookingId);
            if (!fetchedBooking) return normalizedRental;
            return {
                ...fetchedBooking,
                ...normalizedRental,
                status: localRental.status || fetchedBooking.status,
                paymentStatus: localRental.paymentStatus || fetchedBooking.paymentStatus,
                paidAmount: localRental.paidAmount != null ? localRental.paidAmount : fetchedBooking.paidAmount
            };
        }
        return fetchedBooking;
    }, [bookingId, fetchedBooking, db?.serviceRequests, db?.rentalBookings, db?.liaisonBookings]);

    const isRental = useMemo(() => {
        if (!booking) return false;
        return (
            (booking as any).isRental === true ||
            (booking as any).serviceName?.toLowerCase().includes('rental') ||
            (booking as any).serviceName?.toLowerCase().includes('rent a car') ||
            (bookingId?.startsWith('RNT-') ?? false) ||
            (bookingId?.startsWith('RN-') ?? false)
        );
    }, [booking, bookingId]);

    const isLiaison = useMemo(() => {
        if (!booking) return false;
        const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        return (
            (booking as any).isLiaison === true ||
            (booking as any).serviceName?.toLowerCase().includes('liaison') ||
            (booking as any).serviceName?.toLowerCase().includes('lto') ||
            Boolean((booking as any).branchName) ||
            Boolean((booking as any).serviceType) ||
            (bookingId?.startsWith('LIA-') ?? false) ||
            urlParams?.get('isLiaison') === 'true' ||
            urlParams?.get('service') === 'liaison'
        );
    }, [booking, bookingId]);

    const isDriverHire = useMemo(() => {
        if (!booking) return false;
        return (
            (booking as any).isDriverHire === true ||
            (booking as any).serviceName === 'Driver for Hire' ||
            (booking as any).serviceId === '7' ||
            (bookingId?.startsWith('DRV-') ?? false)
        );
    }, [booking, bookingId]);

    const bookingSequenceId = useMemo(() => {
        if (!bookingId) return '';
        if (isLiaison || bookingId.startsWith('LIA-') || (booking as any)?.referenceNumber?.startsWith('LIA-')) {
            return (booking as any)?.referenceNumber || (bookingId.startsWith('LIA-') ? bookingId : `LIA-${bookingId.slice(-6).toUpperCase()}`);
        }
        if (isRental || bookingId.startsWith('RNT-') || bookingId.startsWith('RN-')) {
            return bookingId.startsWith('RNT-') || bookingId.startsWith('RN-') ? bookingId : `RN-${bookingId.slice(-6).toUpperCase()}`;
        }
        if (isDriverHire || bookingId.startsWith('DRV-')) {
            return bookingId.startsWith('DRV-') ? bookingId : `DRV-${bookingId.slice(-6).toUpperCase()}`;
        }
        if (!db?.bookings) return '';
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
                    const match = String(b.date).match(/\b\d{4}\b/);
                    if (match) return match[0];
                    try {
                        const d = new Date(String(b.date).replace(/-/g, '/'));
                        if (!isNaN(d.getTime())) return String(d.getFullYear());
                    } catch {}
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
        return seqId;
    }, [db?.bookings, bookingId, isDriverHire, isRental]);

    const mechanic = useMemo(() => {
        if (!booking) return null;
        if (isDriverHire) {
            const assignedDriver = (db?.hireDrivers || []).find(d => 
                d.name === booking.driverName || 
                d.id === (booking as any).driverId ||
                d.name === (booking as any).details?.selectedDriverName
            );
            return {
                id: assignedDriver?.id || 'driver-assigned',
                name: booking.driverName || (booking as any).details?.selectedDriverName || 'Danilo Santos',
                phone: booking.driverPhone || assignedDriver?.phone || '0917-123-4567',
                imageUrl: assignedDriver?.imageUrl || '',
                rating: assignedDriver?.rating || 4.9,
                reviews: assignedDriver?.totalTrips || 120,
                specializations: ['Professional Chauffeur', assignedDriver?.geoLimit || 'NCR & Cavite Route'],
                isAvailable: true,
                lat: assignedDriver ? 14.3149 : undefined,
                lng: assignedDriver ? 121.0583 : undefined
            } as any;
        }
        const staticMechanic = booking.mechanic;
        if (!db?.mechanics) return staticMechanic;
        const targetId = booking.mechanicId || staticMechanic?.id;
        return db.mechanics.find(m => m.id === targetId || m.name === booking.mechanicName || m.name === staticMechanic?.name) || staticMechanic;
    }, [db?.mechanics, db?.hireDrivers, booking, isDriverHire]);

    const isMechanicAssigned = useMemo(() => {
        if (!booking) return false;
        if (isDriverHire) {
            const hasAssignedStatus = ['Driver Assigned', 'Confirmed', 'En Route', 'In Progress', 'Completed'].includes(booking.status);
            const hasDriverInfo = !!(booking.driverName || (booking as any).details?.selectedDriverName);
            return hasAssignedStatus && hasDriverInfo;
        }
        const hasAssignedStatus = ['Mechanic Assigned', 'En Route', 'In Progress', 'Completed'].includes(booking.status);
        const hasMechanicInfo = !!(booking.mechanicId || booking.mechanicName || booking.mechanic?.id || booking.mechanic?.name);
        return hasAssignedStatus && hasMechanicInfo;
    }, [booking, isDriverHire]);

    useEffect(() => {
        if (!booking || (user && booking.customerName !== user.name)) {
            // navigate('/customer-portal/booking-history'); 
        }
    }, [booking, user, navigate]);

    useEffect(() => {
        if (booking && booking.gcashPaymentStatus === 'declined') {
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

    // Live Tracking Listener — supports both mechanics and hire drivers
    useEffect(() => {
        const currentStatus = (booking?.status || '').trim();
        const currentLocation = booking?.location;
        
        const isTrackingActive = isDriverHire
            ? ['En Route', 'In Progress', 'Driver Assigned', 'Confirmed'].includes(currentStatus)
            : ['En Route', 'Mechanic Assigned'].includes(currentStatus);

        if (!bookingId || !isTrackingActive) {
            setMechanicLiveLocation(null);
            setEta(null);
            setDistance(null);
            return;
        }

        // 1. If custom ETA is directly on the booking document, respect it
        if (booking?.eta || (booking as any)?.estimatedArrivalTime) {
            const rawEta = booking?.eta || (booking as any)?.estimatedArrivalTime;
            setEta(typeof rawEta === 'number' ? `${rawEta} mins away` : String(rawEta));
        }

        const trackingPath = isDriverHire ? `tracking/${bookingId}/driverLocation` : `tracking/${bookingId}/mechanicLocation`;
        const trackingRef = ref(rtdb, trackingPath);
        const fallbackTrackingRef = isDriverHire ? ref(rtdb, `tracking/${bookingId}/mechanicLocation`) : null;

        const handleTrackingData = (data: any) => {
            if (data && data.lat && data.lng) {
                setMechanicLiveLocation({ lat: data.lat, lng: data.lng });
                
                if (currentLocation) {
                    const dist = calculateDistance(data.lat, data.lng, currentLocation.lat, currentLocation.lng);
                    setDistance(dist);
                    
                    if (!booking?.eta && !(booking as any)?.estimatedArrivalTime) {
                        const timeInMinutes = Math.round(dist / (30 / 60));
                        if (timeInMinutes < 1) {
                            setEta('Arriving now');
                        } else {
                            setEta(`${timeInMinutes} mins away`);
                        }
                    }
                }
            }
        };

        const unsubscribe = onValue(trackingRef, (snapshot) => {
            const data = snapshot.val();
            if (data && data.lat && data.lng) {
                handleTrackingData(data);
            } else if (fallbackTrackingRef) {
                // Check fallback mechanicLocation path if driverLocation isn't populated
                get(fallbackTrackingRef).then(snap => {
                    if (snap.exists()) handleTrackingData(snap.val());
                }).catch(() => {});
            }
        });

        return () => { try { unsubscribe(); } catch (_) {} };
    }, [bookingId, booking?.status, booking?.location, booking?.eta, isDriverHire, (booking as any)?.estimatedArrivalTime]);

    // Customer live location tracking — writes to RTDB for admin / tracking maps
    useEffect(() => {
        let watchHandle: number | null = null;

        if (booking?.status === 'En Route' && bookingId) {
            const handleSuccess = (lat: number, lng: number) => {
                const trackingRef = ref(rtdb, `tracking/${bookingId}/customerLocation`);
                set(trackingRef, {
                    lat,
                    lng,
                    timestamp: Date.now()
                }).catch(() => {});
            };

            isGeolocationPermissionDenied().then(isDenied => {
                if (isDenied) return;

                // Unified precise stream (native GPS first, degraded readings filtered,
                // jitter deadband) — identical to the mechanic side for consistent pins.
                startPreciseWatch(
                    (fix) => handleSuccess(fix.lat, fix.lng),
                    () => {},
                    { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
                ).then(id => {
                    watchHandle = id;
                });
            });
        }

        return () => {
            if (watchHandle !== null) {
                safeClearWatch(watchHandle);
                watchHandle = null;
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

    // Monitor for Completed status to trigger success modal with confetti ONLY AFTER complete fulfillment of payment
    useEffect(() => {
        if (!booking) return;
        const totalAmt = Number(booking.totalAmount) || Number(booking.service?.price) || 0;
        const paidAmt = Number(booking.paidAmount) || 0;
        const isFullyPaid = !!booking.isPaid || (totalAmt > 0 && paidAmt >= totalAmt - 0.5);

        if (booking.status === 'Completed' && isFullyPaid) {
            const key = `ridersbud_completed_modal_shown_${booking.id}`;
            const shown = localStorage.getItem(key);
            if (!shown && !booking.isReviewed) {
                setShowCompleteTransactionModal(true);
                localStorage.setItem(key, 'true');
            }
        }
    }, [booking?.status, booking?.id, booking?.isReviewed, booking?.isPaid, booking?.paidAmount, booking?.totalAmount, booking?.service?.price]);

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

    if (!booking) {
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

    const normalizedStatus = (status || '').trim();

    const timelineSteps = useMemo(() => {
        const sLower = normalizedStatus.toLowerCase();
        if (isRental) {
            return [
                { 
                    label: '50% DP Reserved', 
                    status: 'Reserved', 
                    completed: true 
                },
                { 
                    label: 'Confirmed', 
                    status: 'Confirmed', 
                    completed: ['confirmed', 'approved', 'ready', 'ready for pickup', 'active rental', 'active', 'in use', 'completed', 'returned', 'done'].includes(sLower) 
                },
                { 
                    label: 'Ready for Pickup', 
                    status: 'Ready for Pickup', 
                    completed: ['ready', 'ready for pickup', 'active rental', 'active', 'in use', 'completed', 'returned', 'done'].includes(sLower) 
                },
                { 
                    label: 'Active Rental', 
                    status: 'Active Rental', 
                    completed: ['active rental', 'active', 'in use', 'completed', 'returned', 'done'].includes(sLower) 
                },
                { 
                    label: 'Completed', 
                    status: 'Completed', 
                    completed: ['completed', 'returned', 'done'].includes(sLower)
                }
            ];
        }

        if (isDriverHire) {
            return [
                { 
                    label: 'Requested', 
                    status: 'Pending Admin Review', 
                    completed: true 
                },
                { 
                    label: 'Driver Assigned', 
                    status: 'Driver Assigned', 
                    completed: ['driver assigned', 'confirmed', 'assigned', 'en route', 'in progress', 'trip ongoing', 'completed', 'work done'].includes(sLower) 
                },
                { 
                    label: 'En Route', 
                    status: 'En Route', 
                    completed: ['en route', 'in progress', 'trip ongoing', 'completed', 'work done'].includes(sLower) 
                },
                { 
                    label: 'Trip Ongoing', 
                    status: 'In Progress', 
                    completed: ['in progress', 'trip ongoing', 'completed', 'work done'].includes(sLower) 
                },
                { 
                    label: 'Completed', 
                    status: 'Completed', 
                    completed: sLower === 'completed' || sLower === 'work done'
                }
            ];
        }

        if (isLiaison) {
            return [
                {
                    label: 'Booking Received',
                    status: 'Booking Received',
                    completed: true
                },
                {
                    label: 'Docs Verified',
                    status: 'Documents Verified',
                    completed: ['documents verified', 'payment confirmed', 'liaison assigned', 'assigned', 'processing at lto', 'for processing', 'processing', 'in progress', 'ready for pickup', 'delivered', 'completed'].includes(sLower)
                },
                {
                    label: 'DP Confirmed',
                    status: 'Payment Confirmed',
                    completed: ['payment confirmed', 'liaison assigned', 'assigned', 'processing at lto', 'for processing', 'processing', 'in progress', 'ready for pickup', 'delivered', 'completed'].includes(sLower)
                },
                {
                    label: 'Liaison Assigned',
                    status: 'Liaison Assigned',
                    completed: ['liaison assigned', 'assigned', 'processing at lto', 'for processing', 'processing', 'in progress', 'ready for pickup', 'delivered', 'completed'].includes(sLower)
                },
                {
                    label: 'LTO Processing',
                    status: 'Processing at LTO',
                    completed: ['processing at lto', 'for processing', 'processing', 'in progress', 'ready for pickup', 'delivered', 'completed'].includes(sLower)
                },
                {
                    label: 'Ready / Released',
                    status: 'Completed',
                    completed: ['completed', 'delivered', 'ready for pickup'].includes(sLower)
                }
            ];
        }

        return [
            { label: 'Booked', status: 'Upcoming', completed: true },
            { label: 'Assigned', status: 'Mechanic Assigned', completed: ['Mechanic Assigned', 'En Route', 'In Progress', 'Work Done', 'Completed'].includes(status) },
            { label: 'En Route', status: 'En Route', completed: ['En Route', 'In Progress', 'Work Done', 'Completed'].includes(status) },
            { label: 'In Progress', status: 'In Progress', completed: ['In Progress', 'Work Done', 'Completed'].includes(status) },
            { label: 'Work Done', status: 'Work Done', completed: ['Work Done', 'Completed'].includes(status) },
            { label: 'Completed', status: 'Completed', completed: status === 'Completed' }
        ];
    }, [isRental, isDriverHire, isLiaison, normalizedStatus, status]);

    const currentStepIndex = useMemo(() => {
        const sLower = normalizedStatus.toLowerCase();
        if (isLiaison) {
            if (['completed', 'delivered', 'ready for pickup'].includes(sLower)) return 5;
            if (['processing at lto', 'for processing', 'processing', 'in progress'].includes(sLower)) return 4;
            if (['liaison assigned', 'assigned'].includes(sLower)) return 3;
            if (['payment confirmed', 'downpayment_paid', 'paid'].includes(sLower)) return 2;
            if (['documents verified', 'verified'].includes(sLower)) return 1;
            return 0; // Booking Received / Pending
        }
        if (isRental) {
            if (['completed', 'returned', 'done'].includes(sLower)) return 4;
            if (['active rental', 'active', 'in use', 'ongoing'].includes(sLower)) return 3;
            if (['ready', 'ready for pickup', 'vehicle ready'].includes(sLower)) return 2;
            if (['confirmed', 'approved'].includes(sLower)) return 1;
            return 0; // Reserved / 50% DP Paid
        }
        if (isDriverHire) {
            if (sLower === 'completed' || sLower === 'work done') return 4;
            if (sLower === 'in progress' || sLower === 'trip ongoing') return 3;
            if (sLower === 'en route' || sLower === 'on the way') return 2;
            if (sLower === 'driver assigned' || sLower === 'confirmed' || sLower === 'assigned') return 1;
            return 0; // 'pending', 'pending admin review', 'for verification', etc.
        }
        return timelineSteps.findIndex(s => s.status === status);
    }, [isRental, isDriverHire, isLiaison, normalizedStatus, status, timelineSteps]);

    const googleMapsLink = location
        ? `https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`
        : '';

    const handleCancelBooking = async () => {
        if (!booking || !cancelReason.trim()) return;
        setIsCancelling(true);
        try {
            if ((booking as any).isServiceRequest || isDriverHire) {
                if (updateServiceRequest) {
                    await updateServiceRequest(booking.id, {
                        status: 'Cancelled',
                        notes: `Cancelled by customer: ${cancelReason.trim()}`
                    });
                }
            }
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
            if ((booking as any).isServiceRequest || isDriverHire) {
                if (updateServiceRequestStatus) {
                    await updateServiceRequestStatus(booking.id, 'Completed');
                } else if (updateServiceRequest) {
                    await updateServiceRequest(booking.id, { status: 'Completed' });
                }
            } else {
                await updateBookingStatus(booking.id, 'Completed');
            }
            // The complete transaction success modal will display only if fully paid; otherwise settle remaining balance displays
            const totalAmt = Number(booking.totalAmount) || Number(booking.service?.price) || 0;
            const paidAmt = Number(booking.paidAmount) || 0;
            const isFullyPaid = !!booking.isPaid || (totalAmt > 0 && paidAmt >= totalAmt - 0.5);
            if (isFullyPaid) {
                setShowCompleteTransactionModal(true);
            }
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
        setIsSubmittingReview(true);
        try {
            const targetProviderId = isDriverHire 
                ? (mechanic?.id || (booking as any).driverId || 'driver-assigned')
                : (booking.mechanic?.id || booking.mechanicId || mechanic?.id || '');
            const targetProviderName = isDriverHire
                ? (mechanic?.name || booking.driverName || (booking as any).details?.selectedDriverName || 'Professional Driver')
                : (booking.mechanic?.name || booking.mechanicName || mechanic?.name || 'Mechanic');

            const reviewPayload = {
                bookingId: booking.id,
                customerId: booking.customerId || user?.uid || user?.id || '',
                customerName: booking.customerName || user?.name || 'Customer',
                rating,
                comment,
                mechanicId: targetProviderId,
                mechanicName: targetProviderName,
            };

            // Optimistically update current screen booking state instantly
            setReviewSubmitted(true);
            setFetchedBooking(prev => prev ? ({
                ...prev,
                isReviewed: true,
                review: {
                    ...reviewPayload,
                    id: `review-${Date.now()}`,
                    date: new Date().toISOString()
                }
            } as Booking) : null);

            setShowReviewModal(false);
            setShowCompleteTransactionModal(false);
            setIsVerifyingFinalPayment(false);
            sessionStorage.removeItem('pendingHitPayServiceTx');
            window.history.replaceState({}, document.title, window.location.pathname);

            // Execute addReview asynchronously
            await addReview(booking.id, reviewPayload);
            console.log('Review submitted successfully');
            
            // Redirect smoothly
            navigate(getRedirectRoute());
        } catch (error) {
            console.error('Error submitting review:', error);
            throw error; // Propagate to ReviewModal to trigger its own error banner
        } finally {
            setIsSubmittingReview(false);
        }
    };

    const handleReviewClose = () => {
        setIsVerifyingFinalPayment(false);
        setShowCompleteTransactionModal(false);
        sessionStorage.removeItem('pendingHitPayServiceTx');
        window.history.replaceState({}, document.title, window.location.pathname);

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
        setIsVerifyingFinalPayment(false);
        setShowCompleteTransactionModal(false);
        setShowDeclineModal(false);
        sessionStorage.removeItem('pendingHitPayServiceTx');
        window.history.replaceState({}, document.title, window.location.pathname);
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

            <main className="flex-grow overflow-y-auto p-3.5 sm:p-5 space-y-3.5 pb-32 max-w-lg mx-auto w-full">

                {/* Cancelled Booking Banner */}
                {status === 'Cancelled' && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-center gap-3 animate-fadeIn">
                        <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                            <AlertCircle size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black uppercase tracking-widest text-red-400 font-mono">Notice</span>
                                <span className="px-2 py-0.2 rounded text-[9px] font-bold uppercase bg-red-500/20 text-red-300 border border-red-500/30">Cancelled</span>
                            </div>
                            <h3 className="text-xs sm:text-sm font-bold text-white mt-0.5">This booking has been cancelled</h3>
                            <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">
                                {isRental 
                                    ? 'Your car rental reservation was cancelled. If you paid a deposit, dispatch will process appropriate refund terms.'
                                    : 'This booking was cancelled and is no longer active.'}
                            </p>
                        </div>
                    </div>
                )}

                {/* Direct High-Priority Balance Settlement Banner */}
                {((status === 'Work Done' || status === 'Completed' || status === 'Processing at LTO' || status === 'Ready for Pickup' || status === 'Delivered') && (!booking.isPaid || (booking.remainingBalance !== undefined && booking.remainingBalance > 0))) && (() => {
                    const originalServicesFee = booking.services && booking.services.length > 0
                        ? booking.services.reduce((sum: number, svc: any) => sum + (Number(svc.price) || 0), 0)
                        : (Number(booking.service?.price) || Number(booking.totalAmount) || 0);
                    const paidDownpayment = Number(booking.paidAmount) || (originalServicesFee * 0.5);
                    const serviceBalance = Math.max(0, originalServicesFee - paidDownpayment);
                    const additionalCostsTotal = ((booking as any).additionalCosts || []).reduce((sum: number, cost: any) => sum + (Number(cost.price) || 0), 0);
                    const finalBalanceAmount = booking.remainingBalance !== undefined && booking.remainingBalance > 0
                        ? booking.remainingBalance
                        : Math.max(0, serviceBalance + additionalCostsTotal);
                    const isManualGcashEnabled = db?.settings?.gcashEnabled ?? false;
                    const isBalanceReceiptUnderReview = (booking as any).gcashPaymentStatus === 'balance_receipt_uploaded';

                    if (finalBalanceAmount <= 0) return null;

                    if (isBalanceReceiptUnderReview) {
                        return (
                            <div className="bg-gradient-to-br from-[#161618] via-[#1a1614] to-[#121214] border-2 border-amber-500/40 rounded-2xl p-4 sm:p-5 shadow-[0_0_30px_rgba(245,158,11,0.15)] relative overflow-hidden">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                                        <Clock size={20} className="animate-spin" />
                                    </div>
                                    <div>
                                        <span className="text-[9px] font-black uppercase tracking-widest text-amber-400 font-mono block">Under Review</span>
                                        <h3 className="text-sm sm:text-base font-black text-white leading-tight">Final Payment Receipt Uploaded</h3>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-300 mt-2 leading-relaxed">
                                    Your GCash balance payment receipt has been submitted and is currently being verified by admin. Once approved, your transaction will be marked as fully completed.
                                </p>
                            </div>
                        );
                    }

                    return (
                        <div className="bg-gradient-to-br from-[#161618] via-[#1a1614] to-[#121214] border-2 border-primary/50 rounded-2xl p-4 sm:p-5 shadow-[0_0_30px_rgba(254,120,3,0.2)] animate-bounce-short relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
                            <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shrink-0 animate-pulse">
                                        <CreditCard size={20} />
                                    </div>
                                    <div>
                                        <span className="text-[9px] font-black uppercase tracking-widest text-primary font-mono block">Action Required</span>
                                        <h3 className="text-sm sm:text-base font-black text-white leading-tight">Settle Final Payment</h3>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <span className="text-lg sm:text-xl font-black text-emerald-400 font-mono block leading-none">
                                        ₱{finalBalanceAmount.toLocaleString()}
                                    </span>
                                    <span className="text-[9px] text-gray-400 uppercase font-mono">Balance Due</span>
                                </div>
                            </div>
                            <p className="text-xs text-gray-300 mb-3.5 leading-relaxed">
                                {isRental 
                                    ? "Your car rental reservation is complete! Settle the remaining balance to finalize and release your booking."
                                    : isLiaison
                                    ? "Your LTO Liaison service documents are processed! Settle the remaining balance to complete the transaction and release documents."
                                    : isDriverHire 
                                    ? "Your driver hire trip is completed! Settle the remaining balance to finalize and close your trip."
                                    : "Work on your vehicle is finished! You can settle the remaining balance directly now without waiting for or checking notifications."}
                            </p>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <button
                                    onClick={() => handleInitiateHitPayBalance(booking)}
                                    disabled={isInitiatingHitPay}
                                    className="flex-1 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-black py-3 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-green-600/30 active:scale-95 transition-all cursor-pointer"
                                >
                                    <CreditCard size={15} />
                                    <span>{isInitiatingHitPay ? hitPayLoadingStage : 'Pay Balance (HitPay)'}</span>
                                </button>
                                {isManualGcashEnabled && (
                                    <button
                                        onClick={() => setShowGCashPaymentModal(true)}
                                        className="bg-white/5 hover:bg-white/10 text-gray-300 font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider border border-white/10 transition-all active:scale-95"
                                    >
                                        Manual GCash
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })()}

                {/* Service Card (Hero) */}
                <div className="relative overflow-hidden rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-[#1c1c1e] to-[#121214] border border-white/10 shadow-xl animate-slideInUp">
                    {/* Background subtle art */}
                    <img
                        src={booking.services?.[0]?.imageUrl || booking.service?.imageUrl || booking.services?.[0]?.image || booking.service?.image || '/images/mockups/parts_placeholder.png'}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none z-0 filter blur-[1px]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent pointer-events-none z-0" />
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl pointer-events-none z-0" />
                    
                    <div className="relative z-10 space-y-3">
                        {/* Top Row: Service Name & Total Price */}
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                                <h1 className="text-lg sm:text-xl font-black tracking-tight text-white leading-tight truncate">
                                    {serviceNames}
                                </h1>
                                <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(status)}`}>
                                        {status}
                                    </span>
                                    {booking.vehicle && (
                                        <span className="text-[10px] bg-white/5 border border-white/5 px-2 py-0.5 rounded-md text-gray-300 font-mono">
                                            {booking.vehicle.plateNumber || `${booking.vehicle.make} ${booking.vehicle.model}`}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="text-right flex-shrink-0">
                                <p className="text-xl sm:text-2xl font-black text-primary leading-none">
                                    {formatCurrency(booking.totalAmount || basePrice || 0)}
                                </p>
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-0.5 font-mono">Total Fee</p>
                            </div>
                        </div>

                        {/* Bottom Row: Date, Time & Duration Pills */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-white/10">
                            <div className="flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5 text-[11px] text-gray-300">
                                <Calendar size={12} className="text-primary" />
                                <span className="font-semibold">
                                    {safeFormatDate(date)}
                                </span>
                            </div>
                            <div className="flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5 text-[11px] text-gray-300">
                                <Clock size={12} className="text-primary" />
                                <span className="font-semibold">{time}</span>
                            </div>
                            {totalDuration > 0 && (
                                <div className="flex items-center gap-1 bg-blue-500/10 px-2 py-1 rounded-lg border border-blue-500/20 text-[10px] text-blue-400 font-bold ml-auto">
                                    <Timer size={11} />
                                    <span>~{totalDuration} mins</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Status Explanation Alert banner */}
                <div className="rounded-2xl p-3.5 bg-[#161618] border border-white/5 space-y-2.5">
                    <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-primary/10 rounded-lg text-primary flex-shrink-0">
                            <AlertCircle size={15} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-[11px] text-white">Status Update</p>
                            <p className="text-[10px] text-gray-400 truncate">
                                {isRental ? (
                                    status === 'Reserved' || status === 'Pending' ? '50% Downpayment received! Vehicle reserved and awaiting preparation.' :
                                    status === 'Confirmed' || status === 'Approved' ? 'Your car rental booking is confirmed by dispatch.' :
                                    status === 'Ready for Pickup' || status === 'Ready' ? 'Your rental vehicle is cleaned, inspected, and ready for pickup.' :
                                    status === 'Active Rental' || status === 'Active' || status === 'In Use' ? 'Rental is currently active. Drive safely!' :
                                    status === 'Completed' || status === 'Returned' ? 'Rental completed and vehicle successfully returned.' :
                                    status === 'Cancelled' ? 'This rental reservation has been cancelled.' :
                                    'Vehicle reservation is confirmed.'
                                ) : isLiaison ? (
                                    status === 'Booking Received' || status === 'Pending' ? 'Booking submitted! Our liaison team is reviewing your documents.' :
                                    status === 'Documents Verified' ? 'Your documents have been verified by our liaison officer.' :
                                    status === 'Payment Confirmed' ? 'Initial payment confirmed. Preparing documents for LTO filing.' :
                                    status === 'Liaison Assigned' ? 'A designated liaison officer is handling your transaction.' :
                                    status === 'Processing at LTO' ? 'Your documents are currently being processed at the LTO office.' :
                                    status === 'Completed' || status === 'Delivered' || status === 'Ready for Pickup' ? 'Your LTO Liaison documents are processed and released.' :
                                    status === 'Cancelled' ? 'This liaison request has been cancelled.' :
                                    'LTO Liaison document processing in progress.'
                                ) : isDriverHire ? (
                                    status === 'Pending Admin Review' ? 'Booking submitted! Our dispatch team is reviewing your driver request.' :
                                    status === 'For Verification' ? 'Your hire details and driver schedule are being verified.' :
                                    status === 'Driver Assigned' || status === 'Confirmed' ? 'A professional driver has been confirmed and assigned.' :
                                    status === 'En Route' ? 'Your driver is en route to your pickup location.' :
                                    status === 'In Progress' ? 'Your trip is currently in progress.' :
                                    status === 'Completed' ? 'Your trip has been completed successfully.' :
                                    status === 'Cancelled' ? 'This driver hire booking has been cancelled.' :
                                    'Your driver request is confirmed.'
                                ) : (
                                    status === 'Upcoming' ? 'Your booking is confirmed and scheduled.' :
                                    status === 'Mechanic Assigned' ? 'A professional mechanic has been assigned to your service.' :
                                    status === 'En Route' ? 'Your mechanic is on the way to your location.' :
                                    status === 'In Progress' ? 'Service is currently being performed.' :
                                    status === 'Work Done' ? 'Mechanic has finished work. Please confirm & release balance.' :
                                    status === 'Completed' ? 'Service has been completed successfully.' :
                                    status === 'Cancelled' ? 'This booking has been cancelled.' :
                                    'Service status update available.'
                                )}
                            </p>
                        </div>
                    </div>

                    {/* Live ETA Card when En Route or Assigned */}
                    {(status === 'En Route' || status === 'Mechanic Assigned') && (eta || (booking as any).eta) && (
                        <div className="p-3 bg-gradient-to-r from-primary/15 via-[#1E1E24] to-black/60 border border-primary/30 rounded-xl flex items-center justify-between gap-3 animate-fadeIn">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary flex-shrink-0 relative">
                                    <div className="absolute inset-0 bg-primary/20 rounded-lg animate-ping"></div>
                                    <Navigation size={16} className="relative z-10 animate-pulse" />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[9px] font-black uppercase text-primary tracking-wider font-mono">Live Travel ETA</span>
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                    </div>
                                    <p className="text-sm font-black text-white leading-tight">
                                        {eta || (booking as any).eta || 'En Route'}
                                    </p>
                                    {(booking as any).etaNote && (
                                        <p className="text-[10px] text-yellow-400 font-medium italic mt-0.5 truncate">
                                            "{(booking as any).etaNote}"
                                        </p>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => setShowLiveRouteModal(true)}
                                className="px-3 py-1.5 bg-primary hover:bg-orange-600 text-white font-black text-[10px] uppercase tracking-wider rounded-lg shadow-md shadow-primary/20 transition-all flex items-center gap-1 shrink-0"
                            >
                                Track Map
                            </button>
                        </div>
                    )}
                </div>

                {/* Payment Information Card (Online Gateway / HitPay / GCash) */}
                {(booking.paymentMethod?.includes('HitPay') || booking.paymentMethod === 'GCash' || booking.gcashReference || booking.downpaymentRef || booking.isVerified || booking.gcashDeclineReason || (booking.paidAmount && booking.paidAmount > 0)) && (
                    <div className="relative overflow-hidden bg-[#161618] rounded-2xl p-3.5 sm:p-4 border border-[#FE8008]/30 space-y-3 shadow-xl shadow-black/40">
                        {/* Top Accent Gradient Bar with #FE8008 */}
                        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#FE8008] via-[#FF9E3D] to-[#EA580C]" />

                        {/* Header with Title & Badge */}
                        <div className="flex items-center justify-between pt-0.5">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#FE8008] to-[#EA580C] p-[1px] flex items-center justify-center shadow-sm shadow-[#FE8008]/20">
                                    <div className="w-full h-full bg-[#161618] rounded-[7px] flex items-center justify-center">
                                        <CreditCard size={13} className="text-[#FE8008]" />
                                    </div>
                                </div>
                                <h3 className="text-xs font-black uppercase tracking-wider bg-gradient-to-r from-white via-orange-50 to-[#FE8008] bg-clip-text text-transparent">
                                    Payment Breakdown
                                </h3>
                            </div>
                            {booking.isPaid ? (
                                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[9px] font-black uppercase flex items-center gap-1">
                                    <CheckCircle size={10} /> Fully Paid
                                </span>
                            ) : booking.isVerified || booking.paymentStatus === 'downpayment_paid' || (booking.paidAmount && booking.paidAmount > 0) ? (
                                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[9px] font-black uppercase flex items-center gap-1">
                                    <CheckCircle size={10} /> 50% DP Verified
                                </span>
                            ) : booking.gcashDeclineReason ? (
                                <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full text-[9px] font-bold">Declined</span>
                            ) : (
                                <span className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded-full text-[9px] font-bold">Awaiting Verification</span>
                            )}
                        </div>

                        {booking.gcashDeclineReason && (
                            <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl space-y-2">
                                <p className="text-[10px] font-bold text-red-400 flex items-center gap-1">
                                    <AlertCircle size={12} /> Reason: "{booking.gcashDeclineReason}"
                                </p>
                                <button 
                                    onClick={() => navigate('/customer-portal/service-payment', { state: { booking } })}
                                    className="w-full py-1.5 bg-red-500 text-white text-[10px] font-bold rounded-lg transition-all"
                                >
                                    Resubmit Payment
                                </button>
                            </div>
                        )}

                        {/* Transaction Reference Box */}
                        {(booking.downpaymentRef || booking.hitpayReference || booking.gcashDownpaymentReference || booking.gcashReference || booking.balancePaymentRef || booking.paymentMethod) && (
                            <div className="p-2.5 bg-black/50 border border-[#FE8008]/20 rounded-xl space-y-2 text-[11px]">
                                {/* Payment Method with Icon & Dynamic Channel (GCash, Maya, QR PH, Card) */}
                                {(() => {
                                    const rawMethod = booking.paymentMethod || 'HitPay (Online Gateway)';
                                    const channel = (booking as any).paymentChannel || 
                                                    (booking as any).channel || 
                                                    (booking as any).hitpayChannel ||
                                                    (booking as any).paymentTransactions?.[0]?.method ||
                                                    (booking.downpaymentMethod && booking.downpaymentMethod !== rawMethod ? booking.downpaymentMethod : null);

                                    let displayMethod = rawMethod;
                                    if (rawMethod.toLowerCase().includes('hitpay') || rawMethod.toLowerCase().includes('online')) {
                                        if (channel) {
                                            const formattedChannel = channel.toUpperCase() === 'QRPH' ? 'QR PH' : 
                                                                    channel.toLowerCase() === 'credit_card' || channel.toLowerCase() === 'card' ? 'Credit/Debit Card' :
                                                                    channel.charAt(0).toUpperCase() + channel.slice(1);
                                            displayMethod = `HitPay • ${formattedChannel}`;
                                        } else if (booking.downpaymentRef?.startsWith('BOK-') || booking.hitpayReference) {
                                            displayMethod = 'HitPay (Online • Multi-Channel)';
                                        } else {
                                            displayMethod = 'HitPay (Online Gateway)';
                                        }
                                    }

                                    const dpRefVal = booking.downpaymentRef || booking.hitpayReference || booking.gcashDownpaymentReference || booking.gcashReference;
                                    const balRefVal = booking.balancePaymentRef;

                                    return (
                                        <>
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5">
                                                    <Wallet size={12} className="text-[#FE8008]" /> Method
                                                </span>
                                                <span className="text-white font-bold text-xs flex items-center gap-1">
                                                    {displayMethod}
                                                </span>
                                            </div>

                                            {dpRefVal && (
                                                <div className="flex justify-between items-center gap-2 pt-1.5 border-t border-white/5">
                                                    <span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider shrink-0 flex items-center gap-1.5">
                                                        <Hash size={12} className="text-[#FE8008]" /> DP Ref
                                                    </span>
                                                    <div className="flex items-center gap-1.5 min-w-0 max-w-[70%] justify-end">
                                                        <span className="text-[#FE8008] font-mono font-bold text-[11px] truncate whitespace-nowrap select-all text-right">
                                                            {dpRefVal}
                                                        </span>
                                                        <button
                                                            onClick={() => handleCopyReference(dpRefVal, 'dpRef')}
                                                            title="Copy DP Reference"
                                                            className="p-1 rounded bg-white/5 hover:bg-[#FE8008]/20 border border-white/10 text-gray-300 hover:text-[#FE8008] transition shrink-0 flex items-center justify-center active:scale-90"
                                                        >
                                                            {copiedRefKey === 'dpRef' ? (
                                                                <Check size={11} className="text-emerald-400" />
                                                            ) : (
                                                                <Copy size={11} />
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {booking.downpaymentPaidAt && (
                                                <div className="flex justify-between items-center text-[10px] text-gray-400 font-mono">
                                                    <span className="flex items-center gap-1.5 text-gray-500">
                                                        <Calendar size={11} className="text-gray-500" /> DP Paid At
                                                    </span>
                                                    <span>{new Date(booking.downpaymentPaidAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</span>
                                                </div>
                                            )}

                                            {balRefVal && (
                                                <div className="flex justify-between items-center gap-2 pt-1.5 border-t border-white/5">
                                                    <span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider shrink-0 flex items-center gap-1.5">
                                                        <Hash size={12} className="text-emerald-400" /> Balance Ref
                                                    </span>
                                                    <div className="flex items-center gap-1.5 min-w-0 max-w-[70%] justify-end">
                                                        <span className="text-emerald-400 font-mono font-bold text-[11px] truncate whitespace-nowrap select-all text-right">
                                                            {balRefVal}
                                                        </span>
                                                        <button
                                                            onClick={() => handleCopyReference(balRefVal, 'balRef')}
                                                            title="Copy Balance Reference"
                                                            className="p-1 rounded bg-white/5 hover:bg-emerald-500/20 border border-white/10 text-gray-300 hover:text-emerald-400 transition shrink-0 flex items-center justify-center active:scale-90"
                                                        >
                                                            {copiedRefKey === 'balRef' ? (
                                                                <Check size={11} className="text-emerald-400" />
                                                            ) : (
                                                                <Copy size={11} />
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {booking.balancePaidAt && (
                                                <div className="flex justify-between items-center text-[10px] text-gray-400 font-mono">
                                                    <span className="flex items-center gap-1.5 text-gray-500">
                                                        <Clock size={11} className="text-gray-500" /> Final Paid At
                                                    </span>
                                                    <span>{new Date(booking.balancePaidAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</span>
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                        )}

                        {/* Financial Amounts (Initial Downpayment vs Final Payment / Remaining Balance) */}
                        {(() => {
                            const originalServicesFee = booking.services && booking.services.length > 0
                                ? booking.services.reduce((sum: number, svc: any) => sum + (Number(svc.price) || 0), 0)
                                : (Number(booking.service?.price) || Number(booking.totalAmount) || 0);

                            // Initial 50% downpayment is fixed to 50% of the service cost or recorded downpaymentAmount
                            const initialDownpayment = booking.downpaymentAmount != null && Number(booking.downpaymentAmount) > 0
                                ? Number(booking.downpaymentAmount)
                                : (originalServicesFee * 0.5);

                            const additionalCostsTotal = (booking.additionalCosts || []).reduce((sum: number, cost: any) => sum + (Number(cost.price) || 0), 0);
                            const totalServiceAmount = originalServicesFee + additionalCostsTotal;

                            // Final / second payment: always recompute from live data so additional costs are included.
                            // stored balanceAmount is stale — it was set before mechanic added extra costs.
                            const computedFinalAmount = Math.max(0, totalServiceAmount - initialDownpayment);
                            const finalPaymentAmount = computedFinalAmount > 0
                                ? computedFinalAmount
                                : (booking.balanceAmount != null ? Number(booking.balanceAmount) : 0);

                            const isFullySettled = booking.isPaid === true || booking.balancePaid === true || booking.paymentStatus === 'paid';
                            const serviceBalance = Math.max(0, originalServicesFee - initialDownpayment);
                            const totalBalanceToPay = serviceBalance + additionalCostsTotal;

                            return (
                                <div className="space-y-2">
                                    <div className="grid grid-cols-2 gap-2">
                                        {/* 50% Initial Downpayment Card with Solid Gradient Accent */}
                                        <div className="bg-gradient-to-br from-emerald-500/[0.12] via-emerald-500/[0.05] to-black/30 border border-emerald-500/25 rounded-xl p-2.5 flex flex-col justify-between">
                                            <div>
                                                <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                                                    <CheckCircle size={10} className="text-emerald-400" />
                                                    50% Deposit Paid
                                                </p>
                                                <p className="text-base sm:text-lg font-black text-emerald-400 mt-0.5 font-mono">
                                                    {initialDownpayment > 0 ? `₱${initialDownpayment.toLocaleString()}` : '—'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Final Payment (if settled) OR Remaining Balance (if pending) */}
                                        {isFullySettled ? (
                                            <div className="bg-gradient-to-br from-emerald-500/[0.15] via-emerald-500/[0.06] to-black/30 border border-emerald-500/35 rounded-xl p-2.5 flex flex-col justify-between shadow-sm">
                                                <div>
                                                    <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                                                        <CheckCircle size={10} className="text-emerald-400" />
                                                        Final Payment
                                                    </p>
                                                    <p className="text-base sm:text-lg font-black text-emerald-300 mt-0.5 font-mono">
                                                        {finalPaymentAmount > 0 ? `₱${finalPaymentAmount.toLocaleString()}` : '₱0.00'}
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-gradient-to-br from-white/[0.05] via-white/[0.02] to-black/30 border border-white/10 rounded-xl p-2.5 flex flex-col justify-between">
                                                <div>
                                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                                        <Clock size={10} className="text-gray-400" />
                                                        Remaining Balance
                                                    </p>
                                                    <p className="text-base sm:text-lg font-black text-white mt-0.5 font-mono">
                                                        {totalBalanceToPay > 0 ? `₱${totalBalanceToPay.toLocaleString()}` : '₱0.00'}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Additional costs if any */}
                                    {booking.additionalCosts && booking.additionalCosts.length > 0 && (
                                        <div className="p-3 bg-black/40 border border-white/5 rounded-xl space-y-1.5">
                                            <h4 className="text-[9px] font-bold text-primary tracking-widest uppercase flex items-center gap-1.5 font-mono">
                                                <Wrench size={10} />
                                                Additional Costs Added by Mechanic
                                            </h4>
                                            <div className="space-y-1">
                                                {booking.additionalCosts.map((cost: any, index: number) => (
                                                    <div key={index} className="flex justify-between items-center text-xs">
                                                        <span className="text-gray-400 font-medium">{cost.description}</span>
                                                        <span className="text-white font-bold">₱{Number(cost.price).toLocaleString()}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="h-px bg-white/5 my-1.5"></div>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-gray-400 font-medium font-mono text-[10px]">Additional Total</span>
                                                <span className="text-primary font-bold">+{formatCurrency(additionalCostsTotal)}</span>
                                            </div>
                                            {!isFullySettled && (
                                                <div className="flex justify-between items-center pt-1 border-t border-white/5">
                                                    <span className="text-[10px] font-black text-white uppercase tracking-wider font-mono">Total Balance to Pay</span>
                                                    <span className="text-sm font-black text-emerald-400">{totalBalanceToPay > 0 ? `₱${totalBalanceToPay.toLocaleString()}` : 'For Quotation'}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

                            {booking.gcashReceiptUrl && (
                                <button 
                                    onClick={() => setShowReceiptModal(true)}
                                    className="flex items-center justify-center gap-2 w-full bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 rounded-xl py-2.5 text-xs font-bold transition-all"
                                >
                                    <Eye size={14} className="text-primary" />
                                    <span>View Receipt</span>
                                </button>
                            )}
                    </div>
                )}

                {/* Fleet Coordinator Card (Only for Car Rental bookings) */}
                {isRental && (
                    <div className="bg-[#161618] rounded-2xl p-3.5 sm:p-4 border border-white/5 space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-[10px] font-bold tracking-widest text-emerald-400 uppercase flex items-center gap-1.5 font-mono">
                                <Shield size={12} className="text-emerald-400" />
                                Fleet Coordinator & Dispatch
                            </h2>
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                                Active Reservation
                            </span>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-11 h-11 rounded-xl bg-black/40 border border-white/10 overflow-hidden relative flex-shrink-0 flex items-center justify-center text-primary">
                                    <Car size={22} className="text-primary" />
                                </div>

                                <div className="min-w-0">
                                    <h3 className="text-xs font-bold text-white leading-tight truncate">
                                        RidersBUD Rental Dispatch
                                    </h3>
                                    <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1 font-mono">
                                        <Phone size={10} className="text-primary" />
                                        {db?.settings?.contactPhone || '0917-123-4567'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-col items-stretch gap-1.5 flex-shrink-0 min-w-[90px]">
                                <a
                                    href={`tel:${db?.settings?.contactPhone || '0917-123-4567'}`}
                                    className="w-full bg-primary hover:bg-orange-600 active:scale-95 transition-all text-white px-3 py-1.5 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 shadow-sm"
                                >
                                    <Phone size={11} />
                                    Call Fleet
                                </a>
                            </div>
                        </div>
                    </div>
                )}

                {/* Mechanic Information Card (Only for vehicle maintenance bookings, not for Car Rental, Liaison or Driver for Hire) */}
                {!isRental && !isDriverHire && !isLiaison && mechanic && (
                    <div className="bg-[#161618] rounded-2xl p-3.5 sm:p-4 border border-white/5 space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-[10px] font-bold tracking-widest text-gray-400 uppercase flex items-center gap-1.5 font-mono">
                                <Wrench size={12} className="text-primary" />
                                Assigned Mechanic
                            </h2>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                                {/* Mechanic Image */}
                                <div className="w-11 h-11 rounded-xl bg-black/40 border border-white/10 overflow-hidden relative flex-shrink-0">
                                    <img
                                        src={mechanic.imageUrl || '/riders-logo.png'}
                                        alt={mechanic.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => { (e.target as HTMLImageElement).src = '/riders-logo.png'; }}
                                    />
                                </div>

                                {/* Mechanic Info Details */}
                                <div className="min-w-0">
                                    <h3 className="text-xs font-bold text-white leading-tight truncate">
                                        {mechanic.name}
                                    </h3>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <div className="flex items-center gap-0.5 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-1.5 py-0.2 rounded text-[9px] font-bold">
                                            <Star size={9} className="fill-yellow-400 text-yellow-400" />
                                            <span>{mechanic.rating ? mechanic.rating.toFixed(1) : '5.0'}</span>
                                        </div>
                                        <span className="text-gray-500 text-[9px]">({mechanic.reviews || 0} reviews)</span>
                                    </div>
                                </div>
                            </div>

                            {/* Contact Action */}
                            <div className="flex flex-col items-stretch gap-1.5 flex-shrink-0 min-w-[90px]">
                                <button
                                    onClick={() => { setShowMechanicDetailsModal(true); setActiveModalTab('info'); }}
                                    className="w-full bg-primary hover:bg-orange-600 active:scale-95 transition-all text-white px-3 py-1.5 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 shadow-sm"
                                >
                                    <User size={11} />
                                    Details
                                </button>
                                {booking.status === 'Completed' && !booking.isReviewed && !booking.review && (
                                    <button
                                        onClick={() => setShowReviewModal(true)}
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all text-white px-3 py-1.5 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 shadow-sm"
                                    >
                                        <Star size={11} className="fill-white" />
                                        Review
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Vehicle Information Card */}
                <div className="bg-[#161618] rounded-2xl p-3.5 sm:p-4 border border-white/5 space-y-3">
                    <button
                        onClick={() => setShowVehicleDetails(prev => !prev)}
                        className="w-full flex items-center justify-between text-left group"
                    >
                        <h2 className="text-[10px] font-bold tracking-widest text-gray-400 uppercase flex items-center gap-1.5 font-mono">
                            <Car size={12} className="text-primary" />
                            Vehicle Information
                        </h2>
                        <ChevronDown
                            size={14}
                            className={`text-gray-500 transition-transform duration-300 ${showVehicleDetails ? 'rotate-180' : ''}`}
                        />
                    </button>

                    {isLiaison ? (
                        <>
                            <div className="flex items-center gap-4">
                                <div className="w-11 h-11 rounded-xl bg-[#151515] border border-blue-500/20 overflow-hidden relative flex-shrink-0 flex items-center justify-center shadow-lg">
                                    <Car size={20} className="text-blue-400" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-[12px] font-bold text-white leading-tight truncate">
                                        {booking.vehicleDetails?.brand || booking.vehicle?.make || 'Vehicle'} {booking.vehicleDetails?.model || booking.vehicle?.model || ''} {booking.vehicleDetails?.year ? `(${booking.vehicleDetails.year})` : ''}
                                    </h3>
                                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                        <FileText size={12} className="text-primary shrink-0" />
                                        <span className="text-[10px] text-gray-300 font-mono font-bold tracking-wide">
                                            Plate / MV: {booking.vehicleDetails?.plateNumber || booking.vehicle?.plateNumber || 'No Plate'}
                                        </span>
                                        {booking.vehicleDetails?.type && (
                                            <span className="text-[9px] text-gray-500 font-bold bg-white/5 px-1.5 py-0.2 rounded border border-white/5">
                                                {booking.vehicleDetails.type}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {showVehicleDetails && (
                                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5">
                                    <div className="bg-black/30 rounded-xl p-2.5 border border-white/5 flex flex-col justify-center hover:border-white/10 transition-colors">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <Hash size={10} className="text-primary" />
                                            <span className="text-[9px] text-gray-500 font-semibold">Plate / MV File No.</span>
                                        </div>
                                        <p className="text-xs font-mono font-bold text-white tracking-wide truncate">{booking.vehicleDetails?.plateNumber || 'N/A'}</p>
                                    </div>
                                    <div className="bg-black/30 rounded-xl p-2.5 border border-white/5 flex flex-col justify-center hover:border-white/10 transition-colors">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <Palette size={10} className="text-primary" />
                                            <span className="text-[9px] text-gray-500 font-semibold">Vehicle Color</span>
                                        </div>
                                        <p className="text-xs font-bold text-white truncate">{booking.vehicleDetails?.color || 'Standard Factory'}</p>
                                    </div>
                                    <div className="bg-black/30 rounded-xl p-2.5 border border-white/5 flex flex-col justify-center hover:border-white/10 transition-colors">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <Shield size={10} className="text-blue-400" />
                                            <span className="text-[9px] text-gray-500 font-semibold">Current OR No.</span>
                                        </div>
                                        <p className="text-xs font-mono font-bold text-emerald-400 truncate">{booking.vehicleDetails?.currentOrNumber || 'Available in Docs'}</p>
                                    </div>
                                    <div className="bg-black/30 rounded-xl p-2.5 border border-white/5 flex flex-col justify-center hover:border-white/10 transition-colors">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <Shield size={10} className="text-blue-400" />
                                            <span className="text-[9px] text-gray-500 font-semibold">Current CR No.</span>
                                        </div>
                                        <p className="text-xs font-mono font-bold text-emerald-400 truncate">{booking.vehicleDetails?.currentCrNumber || 'Available in Docs'}</p>
                                    </div>
                                    <div className="bg-black/30 rounded-xl p-2.5 border border-white/5 flex flex-col justify-center hover:border-white/10 transition-colors">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <Wrench size={10} className="text-gray-400" />
                                            <span className="text-[9px] text-gray-500 font-semibold">Engine No.</span>
                                        </div>
                                        <p className="text-[11px] font-mono font-bold text-gray-300 truncate">{booking.vehicleDetails?.engineNumber || 'N/A'}</p>
                                    </div>
                                    <div className="bg-black/30 rounded-xl p-2.5 border border-white/5 flex flex-col justify-center hover:border-white/10 transition-colors">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <Wrench size={10} className="text-gray-400" />
                                            <span className="text-[9px] text-gray-500 font-semibold">Chassis No.</span>
                                        </div>
                                        <p className="text-[11px] font-mono font-bold text-gray-300 truncate">{booking.vehicleDetails?.chassisNumber || 'N/A'}</p>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : isRental ? (
                        <>
                            <div className="flex items-center gap-4">
                                <div className="w-11 h-11 rounded-xl bg-[#151515] border border-white/10 overflow-hidden relative flex-shrink-0 flex items-center justify-center shadow-lg">
                                    <Car size={20} className="text-primary" />
                                </div>
                                <div>
                                    <h3 className="text-[12px] font-bold text-white leading-tight">
                                        {booking.vehicle?.make || (booking as any).carName || (booking as any).vehicleModel || 'Rental Fleet Vehicle'}
                                    </h3>
                                    <div className="flex items-center gap-1.5 mt-1.5">
                                        <FileText size={12} className="text-primary" />
                                        <span className="text-[10px] text-gray-400 tracking-wide font-medium">
                                            Plate No: {booking.vehicle?.plateNumber || (booking as any).plateNumber || 'Reserved Fleet'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            {showVehicleDetails && (
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-black/30 rounded-xl p-2.5 border border-white/5 flex flex-col justify-center hover:border-white/10 transition-colors">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <Hash size={10} className="text-primary" />
                                            <span className="text-[9px] text-gray-500 font-semibold">Plate No.</span>
                                        </div>
                                        <p className="text-xs font-bold text-white tracking-wide">{booking.vehicle?.plateNumber || (booking as any).plateNumber || 'Reserved Fleet'}</p>
                                    </div>
                                    <div className="bg-black/30 rounded-xl p-2.5 border border-white/5 flex flex-col justify-center hover:border-white/10 transition-colors">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <Palette size={10} className="text-primary" />
                                            <span className="text-[9px] text-gray-500 font-semibold">Service Type</span>
                                        </div>
                                        <p className="text-xs font-bold text-emerald-400">{(booking as any).notes?.includes('Driver') ? 'Chauffeur Driven' : 'Self-Drive Rental'}</p>
                                    </div>
                                    <div className="bg-black/30 rounded-xl p-2.5 border border-white/5 flex flex-col justify-center hover:border-white/10 transition-colors col-span-2">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <MapPin size={10} className="text-primary" />
                                            <span className="text-[9px] text-gray-500 font-semibold">Pickup Hub</span>
                                        </div>
                                        <p className="text-xs font-bold text-white truncate">{booking.pickupLocation || booking.location?.address || 'Main Hub, Cavite'}</p>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (booking?.serviceName === 'Driver for Hire' || booking?.serviceId === '7' || isDriverHire) ? (
                        booking.vehicleDetails || (booking as any).vehicle ? (
                            <>
                                <div className="flex items-center gap-4">
                                    <div className="w-11 h-11 rounded-xl bg-[#151515] border border-white/10 overflow-hidden relative flex-shrink-0 flex items-center justify-center shadow-lg">
                                        <Car size={20} className="text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="text-[12px] font-bold text-white leading-tight">
                                            {(booking.vehicleDetails?.brand || booking.vehicleDetails?.make || booking.vehicle?.make || 'Vehicle')} {(booking.vehicleDetails?.model || booking.vehicle?.model || '')}
                                        </h3>
                                        <div className="flex items-center gap-1.5 mt-1.5">
                                            <FileText size={12} className="text-primary" />
                                            <span className="text-[10px] text-gray-400 tracking-wide font-medium">
                                                Plate No: {booking.vehicleDetails?.plateNumber || booking.vehicle?.plateNumber || (booking as any).details?.plateNumber || 'N/A'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                {showVehicleDetails && (
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="bg-black/30 rounded-xl p-2.5 border border-white/5 flex flex-col justify-center hover:border-white/10 transition-colors">
                                            <span className="text-[9px] text-gray-500 font-semibold mb-1">Vehicle Type</span>
                                            <p className="text-xs font-bold text-white tracking-wide">{booking.vehicleDetails?.type || booking.vehicle?.type || (booking as any).details?.vehicleType || 'Sedan'}</p>
                                        </div>
                                        <div className="bg-black/30 rounded-xl p-2.5 border border-white/5 flex flex-col justify-center hover:border-white/10 transition-colors">
                                            <span className="text-[9px] text-gray-500 font-semibold mb-1">Owner Driven</span>
                                            <p className="text-xs font-bold text-emerald-400">Yes (Customer's Car)</p>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="p-4 bg-black/30 border border-white/5 rounded-xl text-center">
                                <p className="text-xs text-gray-400">Driver will provide the vehicle.</p>
                                <p className="text-[10px] text-primary font-bold uppercase tracking-wider mt-1">Vehicle Type: {booking.details?.vehicleType || 'Sedan'}</p>
                            </div>
                        )
                    ) : (
                        <>
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-xl bg-[#151515] border border-white/10 overflow-hidden relative flex-shrink-0 group shadow-lg">
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

                            {showVehicleDetails && (
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
                            )}
                        </>
                    )}
                </div>

                {/* Driver & Trip Details Card (Driver for Hire Service Only) - Positioned before Progress Tracking */}
                {isDriverHire && (
                    <div className="bg-[#161618] rounded-2xl p-3.5 sm:p-4 border border-[#FE8008]/25 relative overflow-hidden shadow-xl space-y-3.5">
                        <div className="flex items-center justify-between">
                            <h2 className="text-[10px] font-bold tracking-widest text-[#FE8008] uppercase flex items-center gap-1.5 font-mono">
                                <User size={13} className="text-primary" />
                                Assigned Chauffeur & Trip
                            </h2>
                            <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-[#FE8008]/10 text-[#FE8008] border border-[#FE8008]/20 font-bold uppercase">
                                Driver for Hire
                            </span>
                        </div>

                        {/* Driver Profile */}
                        <div className="flex items-center justify-between relative z-10 bg-black/40 p-3 rounded-xl border border-white/5">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FE8008]/20 to-black border border-[#FE8008]/30 overflow-hidden relative flex-shrink-0 flex items-center justify-center shadow-md">
                                    {mechanic?.imageUrl ? (
                                        <img 
                                            src={mechanic.imageUrl} 
                                            alt={booking.driverName || 'Driver'} 
                                            className="w-full h-full object-cover" 
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                        />
                                    ) : (
                                        <User size={24} className="text-[#FE8008]" />
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-sm font-bold text-white leading-tight truncate">
                                        {booking.driverName || (booking as any).details?.selectedDriverName || 'Pending Assignment'}
                                    </h3>
                                    <p className="text-[10px] font-semibold text-[#FE8008] mt-0.5 flex items-center gap-1">
                                        <Shield size={10} /> Verified Professional Driver
                                    </p>
                                    
                                    {(booking.estimatedArrivalTime || (booking as any).eta) && (
                                        <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-400">
                                            <Clock size={11} className="text-primary shrink-0" />
                                            <span>ETA: <span className="text-white font-bold">{booking.estimatedArrivalTime || (booking as any).eta}</span></span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {booking.driverPhone && (
                                <a 
                                    href={`tel:${booking.driverPhone}`}
                                    className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center hover:bg-emerald-500/30 transition-all duration-300 shrink-0 shadow-lg shadow-emerald-500/10 active:scale-95"
                                    title={`Call ${booking.driverName || 'Driver'}`}
                                >
                                    <Phone size={16} className="text-emerald-400" />
                                </a>
                            )}
                        </div>

                        {/* Trip Route Points: Pickup & Destination */}
                        {((booking as any).pickupLocation || (booking as any).destination || (booking as any).details?.pickupLocation || (booking as any).details?.destination) && (
                            <div className="p-3 bg-black/30 border border-white/5 rounded-xl space-y-2.5">
                                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block font-mono">Trip Route Points</span>
                                
                                {((booking as any).pickupLocation || (booking as any).details?.pickupLocation) && (
                                    <div className="flex items-start gap-2.5">
                                        <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
                                            <MapPin size={11} className="text-emerald-400" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <span className="text-[8px] font-bold text-gray-500 uppercase tracking-wider block">Pickup Address</span>
                                            <p className="text-xs text-white font-semibold leading-snug">
                                                {(booking as any).pickupLocation || (booking as any).details?.pickupLocation}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {((booking as any).destination || (booking as any).details?.destination) && (
                                    <div className="flex items-start gap-2.5 pt-1.5 border-t border-white/5">
                                        <div className="w-5 h-5 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0 mt-0.5">
                                            <Navigation2 size={11} className="text-primary" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <span className="text-[8px] font-bold text-gray-500 uppercase tracking-wider block">Destination Address</span>
                                            <p className="text-xs text-white font-semibold leading-snug">
                                                {(booking as any).destination || (booking as any).details?.destination}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* LTO Liaison Officer & District Office Card (Liaison Service Only) */}
                {isLiaison && (
                    <div className="bg-[#161618] rounded-2xl p-3.5 sm:p-4 border border-blue-500/25 relative overflow-hidden shadow-xl space-y-3.5">
                        <div className="flex items-center justify-between">
                            <h2 className="text-[10px] font-bold tracking-widest text-blue-400 uppercase flex items-center gap-1.5 font-mono">
                                <Shield size={13} className="text-blue-400" />
                                Assigned LTO Liaison Officer
                            </h2>
                            <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold uppercase">
                                Accredited Liaison
                            </span>
                        </div>

                        {/* Liaison Officer Profile */}
                        <div className="flex items-center justify-between relative z-10 bg-black/40 p-3 rounded-xl border border-white/5">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-black border border-blue-500/30 overflow-hidden relative flex-shrink-0 flex items-center justify-center shadow-md">
                                    {((booking as any).liaisonStaff?.imageUrl || (booking as any).specialistImageUrl) ? (
                                        <img 
                                            src={(booking as any).liaisonStaff?.imageUrl || (booking as any).specialistImageUrl} 
                                            alt={(booking as any).liaisonName || 'Liaison Officer'} 
                                            className="w-full h-full object-cover" 
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                        />
                                    ) : (
                                        <User size={24} className="text-blue-400" />
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-sm font-bold text-white leading-tight truncate">
                                        {(booking as any).liaisonName || (booking as any).agentName || 'LTO Assigned Officer'}
                                    </h3>
                                    <p className="text-[10px] font-semibold text-blue-400 mt-0.5 flex items-center gap-1">
                                        <Building2 size={10} /> {(booking as any).branchName || 'LTO District Office'}
                                    </p>
                                    
                                    <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400">
                                        <span className="text-gray-300 font-mono">
                                            {(booking as any).appointmentDate || booking.date} • {(booking as any).appointmentTime || booking.time}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            {((booking as any).liaisonPhone || (booking as any).specialistPhone) && (
                                <a 
                                    href={`tel:${(booking as any).liaisonPhone || (booking as any).specialistPhone}`}
                                    className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center hover:bg-blue-500/30 transition-all duration-300 shrink-0 shadow-lg shadow-blue-500/10 active:scale-95"
                                    title="Call Liaison Officer"
                                >
                                    <Phone size={16} className="text-blue-400" />
                                </a>
                            )}
                        </div>

                        {/* Liaison Pickup & Processing Route */}
                        <div className="p-3 bg-black/30 border border-white/5 rounded-xl space-y-2.5">
                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block font-mono">Document Fulfillment Details</span>
                            
                            <div className="flex items-start gap-2.5">
                                <div className="w-5 h-5 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0 mt-0.5">
                                    <FileText size={11} className="text-blue-400" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <span className="text-[8px] font-bold text-gray-500 uppercase tracking-wider block">Pickup & Handover Option</span>
                                    <p className="text-xs text-white font-semibold leading-snug">
                                        {(booking as any).pickupOption || 'Customer brings documents to branch'}
                                    </p>
                                    {(booking as any).pickupAddress && (
                                        <p className="text-[10px] text-gray-400 mt-0.5">
                                            Address: {(booking as any).pickupAddress}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-start gap-2.5 pt-1.5 border-t border-white/5">
                                <div className="w-5 h-5 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0 mt-0.5">
                                    <MapPin size={11} className="text-primary" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <span className="text-[8px] font-bold text-gray-500 uppercase tracking-wider block">Designated LTO Branch</span>
                                    <p className="text-xs text-white font-semibold leading-snug">
                                        {(booking as any).branchName || 'LTO Angeles / Pampanga District Office'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Uploaded Documents List */}
                        {((booking as any).documents && (booking as any).documents.length > 0) && (
                            <div className="p-3 bg-black/30 border border-white/5 rounded-xl space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block font-mono">
                                        Submitted LTO Documents ({((booking as any).documents.length)})
                                    </span>
                                    <span className="text-[8px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                                        Verified
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                    {((booking as any).documents as any[]).map((d: any, idx: number) => (
                                        <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5 text-[10px]">
                                            <span className="text-gray-300 font-bold truncate pr-2">📄 {d.name || `Document #${idx + 1}`}</span>
                                            {d.url && (
                                                <a 
                                                    href={d.url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className="text-primary hover:underline text-[9px] font-bold shrink-0"
                                                >
                                                    View
                                                </a>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Live Repair Progress & Diagnostic Report Card (Customer View) */}
                {booking.progressHistory && booking.progressHistory.length > 0 && (
                    <div className="bg-[#161618] rounded-2xl p-3.5 sm:p-4 border border-primary/20 relative overflow-hidden shadow-xl space-y-3 animate-fadeIn">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center text-primary flex-shrink-0">
                                    <FileText size={15} />
                                </div>
                                <div>
                                    <h2 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5 leading-tight">
                                        Repair Progress & Diagnostics
                                        <span className="text-[9px] uppercase font-mono font-bold tracking-widest px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                            Live
                                        </span>
                                    </h2>
                                    <p className="text-[10px] text-gray-400">Inspected & logged directly by your assigned mechanic</p>
                                </div>
                            </div>
                            <span className="text-[10px] font-mono text-primary font-black bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                                {booking.progressHistory.length} Log{booking.progressHistory.length > 1 ? 's' : ''}
                            </span>
                        </div>

                        {/* Reports List */}
                        <div className="space-y-3">
                            {booking.progressHistory.map((report: any, idx: number) => (
                                <div key={idx} className="bg-black/40 rounded-xl p-3 border border-white/5 space-y-2.5">
                                    <div className="flex items-center justify-between text-[10px] pb-2 border-b border-white/5">
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                            <span className="font-bold text-white uppercase tracking-wider font-mono">Report #{idx + 1}</span>
                                            {report.mechanicName && (
                                                <span className="text-gray-400">by {report.mechanicName}</span>
                                            )}
                                        </div>
                                        <span className="font-mono text-gray-500 text-[9px]">{new Date(report.timestamp).toLocaleDateString()} {new Date(report.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>

                                    {/* Before / After Compare Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                        {/* Before Condition */}
                                        <div className="p-2.5 rounded-xl bg-red-500/5 border border-red-500/15">
                                            <div className="flex items-center gap-1 text-[10px] font-black text-red-400 uppercase tracking-wider font-mono mb-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                                Initial Issue / Before
                                            </div>
                                            <p className="text-gray-300 text-[11px] leading-relaxed">
                                                {report.before}
                                            </p>
                                            {report.beforeImages && report.beforeImages.length > 0 && (
                                                <div className="grid grid-cols-3 gap-1.5 mt-2 pt-2 border-t border-red-500/10">
                                                    {report.beforeImages.map((img: string, i: number) => (
                                                        <div 
                                                            key={i} 
                                                            onClick={() => setSelectedProgressPhoto(img)}
                                                            className="aspect-square rounded-lg overflow-hidden border border-red-500/20 cursor-pointer active:scale-95 transition-transform"
                                                        >
                                                            <img src={img} alt="Before" className="w-full h-full object-cover" />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* After Fix */}
                                        <div className="p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
                                            <div className="flex items-center gap-1 text-[10px] font-black text-emerald-400 uppercase tracking-wider font-mono mb-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                Completed Fix / After
                                            </div>
                                            <p className="text-gray-300 text-[11px] leading-relaxed">
                                                {report.after}
                                            </p>
                                            {report.afterImages && report.afterImages.length > 0 && (
                                                <div className="grid grid-cols-3 gap-1.5 mt-2 pt-2 border-t border-emerald-500/10">
                                                    {report.afterImages.map((img: string, i: number) => (
                                                        <div 
                                                            key={i} 
                                                            onClick={() => setSelectedProgressPhoto(img)}
                                                            className="aspect-square rounded-lg overflow-hidden border border-emerald-500/20 cursor-pointer active:scale-95 transition-transform"
                                                        >
                                                            <img src={img} alt="After" className="w-full h-full object-cover" />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Mechanic Notes */}
                                    {report.notes && (
                                        <div className="p-2 rounded-lg bg-white/5 border border-white/5 text-[11px] text-gray-300 flex items-start gap-1.5">
                                            <Wrench size={12} className="text-primary mt-0.5 flex-shrink-0" />
                                            <div>
                                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block font-mono">Mechanic Recommendation:</span>
                                                <span>{report.notes}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                <div className="bg-[#151515] rounded-[1.5rem] py-5 px-3.5 border border-white/5 flex flex-col min-h-[300px]">
                    <h2 className="text-[10px] font-bold tracking-widest text-gray-500 mb-4 flex items-center gap-2 px-1">
                        <Clock size={14} />
                        Progress Timeline
                    </h2>

                    <div className="flex gap-2.5 sm:gap-3 flex-grow">
                        {/* Timeline Column - Mathematically Centered & Modernized */}
                        <div className="w-[44%] relative py-1 flex flex-col justify-between">
                            {timelineSteps.map((step, idx) => {
                                const isCompleted = idx <= currentStepIndex;
                                const isCurrent = idx === currentStepIndex;
                                const isLast = idx === timelineSteps.length - 1;
                                const isNextCompleted = idx + 1 <= currentStepIndex;

                                return (
                                    <div key={step.status} className="relative flex items-center gap-2.5 group">
                                        {/* Node and Connecting Line Wrapper */}
                                        <div className="relative flex flex-col items-center justify-center w-5 h-5 flex-shrink-0">
                                            {/* Vertical Track Segment */}
                                            {!isLast && (
                                                <div 
                                                    className={`absolute top-1/2 left-1/2 -translate-x-1/2 w-[2px] pointer-events-none transition-colors duration-300 ${
                                                        isNextCompleted 
                                                            ? 'bg-gradient-to-b from-[#FE7803] to-[#FE7803]/60 shadow-[0_0_6px_rgba(254,120,3,0.5)]' 
                                                            : 'bg-white/10'
                                                    }`} 
                                                    style={{ height: 'calc(100% + 22px)' }}
                                                />
                                            )}

                                            {/* Circular Dot Indicator */}
                                            <div className={`relative z-10 w-4 h-4 rounded-full flex items-center justify-center transition-all duration-300 ${
                                                isCurrent 
                                                    ? 'bg-[#FE7803] ring-4 ring-[#FE7803]/25 shadow-[0_0_12px_rgba(254,120,3,0.8)] scale-110' 
                                                    : isCompleted 
                                                        ? 'bg-gradient-to-br from-[#FE7803] to-[#EA580C] shadow-[0_0_8px_rgba(254,120,3,0.5)]' 
                                                        : 'bg-[#18181D] border-2 border-white/15'
                                            }`}>
                                                {isCurrent && (
                                                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                                )}
                                                {isCompleted && !isCurrent && (
                                                    <div className="w-1 h-1 rounded-full bg-white/90" />
                                                )}
                                            </div>
                                        </div>

                                        {/* Step Details */}
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-[10px] font-black leading-tight tracking-tight truncate ${
                                                isCurrent 
                                                    ? 'text-[#FE7803] drop-shadow-[0_0_6px_rgba(254,120,3,0.4)]' 
                                                    : isCompleted 
                                                        ? 'text-white' 
                                                        : 'text-gray-500'
                                            }`}>
                                                {step.label}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Actions Grid */}
                        <div className="flex-1 flex flex-col gap-2 justify-center">
                            {/* PIN LOCATION - Interactive Mini Map */}
                            <button
                                onClick={() => setShowLiveRouteModal(true)}
                                disabled={!location?.lat && !location?.lng}
                                className="w-full h-24 bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] rounded-xl border-2 border-primary/30 relative overflow-hidden flex-shrink-0 group cursor-pointer hover:border-primary hover:shadow-lg hover:shadow-primary/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                title={location?.lat ? "View Live Route & Navigation" : "Location not available"}
                            >
                                {location?.lat && location?.lng ? (
                                    <>
                                        <MiniMap lat={mechanicLiveLocation?.lat || location.lat} lng={mechanicLiveLocation?.lng || location.lng} />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent"></div>
                                        <div className="relative h-full flex flex-col items-center justify-center p-3">
                                            <div className="relative mb-1">
                                                <Navigation size={22} className="text-primary drop-shadow-[0_2px_8px_rgba(249,115,22,0.6)] animate-pulse" />
                                                <div className="absolute inset-0 bg-primary/30 blur-xl animate-pulse"></div>
                                            </div>
                                            <span className="text-[10px] font-black text-center leading-tight text-white tracking-wider drop-shadow-lg font-mono">
                                                {isRental && (status === 'Active Rental' || status === 'Active' || status === 'In Use')
                                                    ? 'ACTIVE RENTAL - IN USE'
                                                    : isRental
                                                    ? 'PICKUP STATION'
                                                    : isLiaison
                                                    ? 'LTO DISTRICT OFFICE'
                                                    : status === 'En Route' && eta
                                                    ? `EN ROUTE: ${eta.toUpperCase()}`
                                                    : 'LIVE ROUTE MAP'}
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

                            {/* Live Chat / Liaison & Rental Support Button */}
                            <button
                                onClick={() => {
                                    if (isRental || isLiaison) {
                                        setIsChatOpen(true);
                                        return;
                                    }
                                    if (isDriverHire) {
                                        if (booking.driverPhone) {
                                            window.location.href = `sms:${booking.driverPhone}`;
                                        } else {
                                            alert('Your assigned chauffeur is currently being assigned by dispatch.');
                                        }
                                        return;
                                    }
                                    if (!isMechanicAssigned) {
                                        alert('Chat is disabled. A mechanic has not been assigned to this booking yet.');
                                        return;
                                    }
                                    setIsChatOpen(true);
                                }}
                                disabled={!isRental && !isLiaison && !isDriverHire && !isMechanicAssigned}
                                className="group relative w-full h-[38px] rounded-full px-2 sm:px-2.5 flex items-center justify-between transition-all duration-300 transform active:scale-[0.98] shadow-md shadow-blue-600/20 overflow-hidden border border-blue-400/30 bg-gradient-to-r from-[#2563EB] via-[#1D4ED8] to-[#1E40AF] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <div className="flex items-center gap-1.5">
                                    <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white shadow-inner flex-shrink-0">
                                        <MessageSquare size={12} className="text-white drop-shadow" />
                                    </div>
                                    <div className="w-[1px] h-3.5 bg-white/25 flex-shrink-0"></div>
                                    <span className="text-[10px] font-black text-white tracking-wider uppercase drop-shadow-sm whitespace-nowrap">
                                        {isRental ? 'Rental Support' : isLiaison ? 'Liaison Support' : isDriverHire ? 'Message Driver' : 'Live Chat'}
                                    </span>
                                </div>
                                <div className="w-5 h-5 rounded-full bg-white/15 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/90 group-hover:translate-x-0.5 transition-transform flex-shrink-0">
                                    <ChevronRight size={12} />
                                </div>
                            </button>

                            {/* Call Button / Hotline */}
                            {(isRental || isLiaison || mechanic || (isDriverHire && booking.driverPhone)) && (
                                <button
                                    onClick={() => {
                                        if (isRental) {
                                            const fleetPhone = db?.settings?.contactNumber || db?.settings?.emergencyNumber || '+639171234567';
                                            window.location.href = `tel:${fleetPhone}`;
                                            return;
                                        }
                                        if (isLiaison) {
                                            const ltoPhone = (booking as any).liaisonPhone || (booking as any).specialistPhone || db?.settings?.contactNumber || '+639171234567';
                                            window.location.href = `tel:${ltoPhone}`;
                                            return;
                                        }
                                        if (isDriverHire && booking.driverPhone) {
                                            window.location.href = `tel:${booking.driverPhone}`;
                                        } else {
                                            handleCallMechanic();
                                        }
                                    }}
                                    disabled={!isRental && !isLiaison && !isDriverHire && (callStatus !== 'idle' || !isMechanicAssigned)}
                                    className="group relative w-full h-[38px] rounded-full px-2 sm:px-2.5 flex items-center justify-between transition-all duration-300 transform active:scale-[0.98] shadow-md shadow-emerald-600/20 overflow-hidden border border-emerald-400/30 bg-gradient-to-r from-[#059669] via-[#047857] to-[#065F46] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white shadow-inner flex-shrink-0">
                                            <Phone size={12} className="text-white drop-shadow" />
                                        </div>
                                        <div className="w-[1px] h-3.5 bg-white/25 flex-shrink-0"></div>
                                        <span className="text-[10px] font-black text-white tracking-wider uppercase drop-shadow-sm whitespace-nowrap">
                                            {isRental && (status === 'Active Rental' || status === 'Active' || status === 'In Use')
                                                ? 'Roadside Assist'
                                                : isRental
                                                ? 'Call Fleet'
                                                : isLiaison
                                                ? 'Call Liaison'
                                                : isDriverHire
                                                ? 'Call Driver'
                                                : 'Call'}
                                        </span>
                                    </div>
                                    <div className="w-5 h-5 rounded-full bg-white/15 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/90 group-hover:translate-x-0.5 transition-transform flex-shrink-0">
                                        <ChevronRight size={12} />
                                    </div>
                                </button>
                            )}

                            {/* Review Service persistent button for Completed Status */}
                            {status === 'Completed' && !booking.isReviewed && (
                                <button
                                    onClick={() => setShowReviewModal(true)}
                                    className="group relative w-full h-[38px] rounded-full px-2 sm:px-2.5 flex items-center justify-between transition-all duration-300 transform active:scale-[0.98] shadow-md shadow-orange-600/25 overflow-hidden border border-orange-400/40 bg-gradient-to-r from-[#FE7803] via-[#EA580C] to-[#C2410C] hover:brightness-110"
                                >
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white shadow-inner flex-shrink-0">
                                            <Star size={12} className="text-white drop-shadow" />
                                        </div>
                                        <div className="w-[1px] h-3.5 bg-white/25 flex-shrink-0"></div>
                                        <span className="text-[10px] font-black text-white tracking-wider uppercase drop-shadow-sm whitespace-nowrap">
                                            Review Service
                                        </span>
                                    </div>
                                    <div className="w-5 h-5 rounded-full bg-white/15 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/90 group-hover:translate-x-0.5 transition-transform flex-shrink-0">
                                        <ChevronRight size={12} />
                                    </div>
                                </button>
                            )}

                            {/* Initial Downpayment or Remaining Balance Actions */}
                            {(!booking.isPaid || (booking.remainingBalance !== undefined && booking.remainingBalance > 0)) && (() => {
                                const isInitialDepositUnpaid = !booking.isPaid && !booking.isVerified && !booking.gcashReceiptUrl && (!booking.paidAmount || booking.paidAmount === 0);
                                const isServiceFinished = (status === 'Work Done' || status === 'Completed' || status === 'Processing at LTO' || status === 'Ready for Pickup' || status === 'Delivered') && (!booking.isPaid || (booking.remainingBalance !== undefined && booking.remainingBalance > 0));
                                const isHitPayActive = HitPayService.isGatewayActive(db?.settings);

                                if (isInitialDepositUnpaid) {
                                    return (
                                        <button
                                            onClick={() => navigate(`/customer-portal/service-payment/${booking.id}`)}
                                            className="group relative w-full h-[38px] rounded-full px-2 sm:px-2.5 flex items-center justify-between transition-all duration-300 transform active:scale-[0.98] shadow-md shadow-orange-600/25 overflow-hidden border border-orange-400/40 bg-gradient-to-r from-[#FE7803] via-[#EA580C] to-[#C2410C] hover:brightness-110 cursor-pointer animate-pulse"
                                        >
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white shadow-inner flex-shrink-0">
                                                    <CreditCard size={12} className="text-white drop-shadow" />
                                                </div>
                                                <div className="w-[1px] h-3.5 bg-white/25 flex-shrink-0"></div>
                                                <span className="text-[10px] font-black text-white tracking-wider uppercase drop-shadow-sm truncate whitespace-nowrap">
                                                    Pay 50% Deposit {isHitPayActive ? '(HitPay)' : ''}
                                                </span>
                                            </div>
                                            <div className="w-5 h-5 rounded-full bg-white/15 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/90 group-hover:translate-x-0.5 transition-transform flex-shrink-0">
                                                <ChevronRight size={12} />
                                            </div>
                                        </button>
                                    );
                                }

                                if (isServiceFinished) {
                                    return (
                                        <button
                                            onClick={() => handleInitiateHitPayBalance(booking)}
                                            className="group relative w-full h-[38px] rounded-full px-2 sm:px-2.5 flex items-center justify-between transition-all duration-300 transform active:scale-[0.98] shadow-md shadow-emerald-600/25 overflow-hidden border border-emerald-400/40 bg-gradient-to-r from-[#059669] via-[#047857] to-[#065F46] hover:brightness-110 cursor-pointer animate-pulse"
                                        >
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white shadow-inner flex-shrink-0">
                                                    <CheckCircle size={12} className="text-white drop-shadow" />
                                                </div>
                                                <div className="w-[1px] h-3.5 bg-white/25 flex-shrink-0"></div>
                                                <span className="text-[10px] font-black text-white tracking-wider uppercase drop-shadow-sm truncate whitespace-nowrap">
                                                    Settle Balance (HitPay)
                                                </span>
                                            </div>
                                            <div className="w-5 h-5 rounded-full bg-white/15 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/90 group-hover:translate-x-0.5 transition-transform flex-shrink-0">
                                                <ChevronRight size={12} />
                                            </div>
                                        </button>
                                    );
                                }

                                return null;
                            })()}
                        </div>
                    </div>

                    {/* Active Rental In-Progress Guidelines & Fuel Policy Card */}
                    {isRental && (status === 'Active Rental' || status === 'Active' || status === 'In Use') && (
                        <div className="mt-3.5 p-3 bg-gradient-to-r from-[#FE7803]/10 via-[#18181B] to-black/60 border border-[#FE7803]/30 rounded-xl flex items-center justify-between gap-3 animate-fadeIn">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-[#FE7803]/20 flex items-center justify-center text-[#FE7803] flex-shrink-0 relative">
                                    <div className="absolute inset-0 bg-[#FE7803]/20 rounded-lg animate-ping"></div>
                                    <Car size={16} className="relative z-10 animate-pulse text-[#FE7803]" />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[9px] font-black uppercase text-[#FE7803] tracking-wider font-mono">Active Self-Drive</span>
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                    </div>
                                    <p className="text-[11px] font-bold text-white leading-tight">
                                        Vehicle is in your possession. Return with same fuel level.
                                    </p>
                                    <p className="text-[9px] text-gray-400 font-medium mt-0.5">
                                        Drop-off Hub: <span className="text-gray-300 font-semibold">{booking.dropoffLocation || booking.pickupLocation || 'Main Rental Hub'}</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
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
                    {(status === 'Upcoming' || status === 'Pending Admin Review' || status === 'For Verification') && (
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
                isSubmitting={isSubmittingReview}
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

            {showGCashPaymentModal && (() => {
                const originalServicesFee = booking.services && booking.services.length > 0
                    ? booking.services.reduce((sum: number, svc: any) => sum + (Number(svc.price) || 0), 0)
                    : (Number(booking.service?.price) || Number(booking.totalAmount) || 0);
                const paidDownpayment = Number(booking.paidAmount) || (originalServicesFee * 0.5);
                const serviceBalance = Math.max(0, originalServicesFee - paidDownpayment);
                const additionalCostsTotal = (booking.additionalCosts || []).reduce((sum: number, cost: any) => sum + (Number(cost.price) || 0), 0);
                const finalBalanceAmount = booking.remainingBalance !== undefined && booking.remainingBalance > 0
                    ? booking.remainingBalance
                    : Math.max(0, serviceBalance + additionalCostsTotal);
                const isBalancePayment = (booking.status === 'Work Done' || booking.status === 'Completed' || booking.status === 'Processing at LTO' || booking.status === 'Ready for Pickup' || booking.status === 'Delivered') || Boolean(booking.paidAmount && booking.paidAmount > 0);

                return (
                    <GCashPaymentModal
                        bookingId={booking.id}
                        totalAmount={booking.totalAmount || booking.service?.price || 0}
                        paymentAmount={isBalancePayment ? finalBalanceAmount : Math.ceil((booking.totalAmount || booking.service?.price || 0) * 0.5)}
                        paymentLabel={isBalancePayment ? "REMAINING BALANCE" : "DOWN PAYMENT (50%)"}
                        customerName={booking.customerName}
                        services={services}
                        isRental={isRental}
                        isLiaison={isLiaison}
                        onPaymentVerified={() => {
                            setShowGCashPaymentModal(false);
                            setIsBalanceModalDismissed(true);
                        }}
                        onClose={() => setShowGCashPaymentModal(false)}
                    />
                );
            })()}

            {/* Mandatory Balance Settlement Modal (Auto Pop-up when Mechanic Completes Work or Liaison is Ready) */}
            {((booking.status === 'Work Done' || booking.status === 'Completed' || booking.status === 'Processing at LTO' || booking.status === 'Ready for Pickup' || booking.status === 'Delivered') && (!booking.isPaid || (booking.remainingBalance !== undefined && booking.remainingBalance > 0)) && (booking as any).gcashPaymentStatus !== 'balance_receipt_uploaded' && !showGCashPaymentModal && !isBalanceModalDismissed) && (() => {
                const originalServicesFee = booking.services && booking.services.length > 0
                    ? booking.services.reduce((sum: number, svc: any) => sum + (Number(svc.price) || 0), 0)
                    : (Number(booking.service?.price) || Number(booking.totalAmount) || 0);
                const paidDownpayment = Number(booking.paidAmount) || (originalServicesFee * 0.5);
                const serviceBalance = Math.max(0, originalServicesFee - paidDownpayment);
                const additionalCostsTotal = (booking.additionalCosts || []).reduce((sum: number, cost: any) => sum + (Number(cost.price) || 0), 0);
                const finalBalanceAmount = booking.remainingBalance !== undefined && booking.remainingBalance > 0
                    ? booking.remainingBalance
                    : Math.max(0, serviceBalance + additionalCostsTotal);
                const isManualGcashEnabled = db?.settings?.gcashEnabled ?? false;
                const isHitPayActive = HitPayService.isGatewayActive(db?.settings);

                if (finalBalanceAmount <= 0) return null;

                return (
                    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
                        <div className="relative w-full max-w-md bg-[#161618] rounded-3xl p-5 sm:p-6 border border-primary/30 shadow-[0_0_50px_rgba(249,115,22,0.15)] animate-modal-scale-up space-y-4 text-left">
                            
                            {/* Top Header Badge & Icon */}
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                                    <CheckCircle size={26} className="text-emerald-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    {isRental ? (
                                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full mb-1">
                                            <Car size={10} /> Rental Completed
                                        </span>
                                    ) : isLiaison ? (
                                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full mb-1">
                                            <Shield size={10} /> Liaison Completed
                                        </span>
                                    ) : isDriverHire ? (
                                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full mb-1">
                                            <Navigation size={10} /> Trip Completed
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full mb-1">
                                            <Wrench size={10} /> Service Completed
                                        </span>
                                    )}
                                    <h3 className="text-lg font-black text-white leading-tight">
                                        Settle Remaining Balance
                                    </h3>
                                </div>
                            </div>

                            <p className="text-xs text-gray-400 leading-relaxed">
                                {isRental ? (
                                    <>Your vehicle reservation for <strong className="text-white">{booking.vehicle?.make || (booking as any).carName || (booking as any).vehicleModel || 'Rental Fleet Vehicle'}</strong> is completed. Payment of the remaining balance is required to finalize and release your booking.</>
                                ) : isLiaison ? (
                                    <>Your LTO Liaison service documents for <strong className="text-white">{booking.vehicle?.plateNumber || 'your vehicle'}</strong> are processed. Payment of the remaining balance is required to finalize and release your documents.</>
                                ) : isDriverHire ? (
                                    <>Your driver <strong className="text-white">{booking.driverName || 'Driver'}</strong> has completed your trip. Payment of the remaining balance is required to finalize and release your booking.</>
                                ) : (
                                    <>Your mechanic <strong className="text-white">{mechanic?.name || 'Mechanic'}</strong> has finished work on your vehicle. Payment of the remaining balance is required to finalize and release your booking.</>
                                )}
                            </p>

                            {/* Financial Breakdown Card */}
                            <div className="bg-black/50 border border-white/5 rounded-2xl p-4 space-y-2.5">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-400">{isRental ? 'Rental Vehicle:' : isLiaison ? 'Liaison Service:' : isDriverHire ? 'Driver Service:' : 'Service Fee:'}</span>
                                    <span className="text-white font-bold">{serviceNames}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-400">{isRental ? 'Total Rental Amount:' : 'Total Service Amount:'}</span>
                                    <span className="text-white font-bold">₱{originalServicesFee.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs text-emerald-400">
                                    <span className="flex items-center gap-1">
                                        <CheckCircle size={11} /> 50% Downpayment Paid:
                                    </span>
                                    <span className="font-bold">-₱{paidDownpayment.toLocaleString()}</span>
                                </div>

                                {booking.additionalCosts && booking.additionalCosts.length > 0 && (
                                    <div className="pt-2 border-t border-white/5 space-y-1.5">
                                        <div className="flex justify-between items-center text-[11px] text-primary font-bold">
                                            <span>Mechanic Additional Costs:</span>
                                            <span>+₱{additionalCostsTotal.toLocaleString()}</span>
                                        </div>
                                        {booking.additionalCosts.map((cost: any, idx: number) => (
                                            <div key={idx} className="flex justify-between text-[10px] text-gray-400 pl-2">
                                                <span>• {cost.description}</span>
                                                <span>₱{Number(cost.price).toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="pt-2.5 border-t border-white/10 flex justify-between items-end">
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Balance Due</p>
                                        <p className="text-2xl font-black text-emerald-400 mt-0.5 leading-none">
                                            ₱{finalBalanceAmount.toLocaleString()}
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
                                    onClick={() => handleInitiateHitPayBalance(booking)}
                                    disabled={isInitiatingHitPay}
                                    className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-black py-3.5 rounded-xl text-xs tracking-widest uppercase flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 active:scale-95 transition-all disabled:opacity-50"
                                >
                                    {isInitiatingHitPay ? (
                                        <>
                                            <Spinner size="sm" color="text-white" />
                                            <span className="animate-pulse">{hitPayLoadingStage}</span>
                                        </>
                                    ) : (
                                        <>
                                            <CreditCard size={15} />
                                            <span>Pay Balance with HitPay Online</span>
                                        </>
                                    )}
                                </button>

                                {isManualGcashEnabled && (
                                    <button
                                        onClick={() => setShowGCashPaymentModal(true)}
                                        className="w-full bg-white/5 hover:bg-white/10 text-gray-300 font-bold py-2.5 rounded-xl text-xs tracking-wider transition-all border border-white/5"
                                    >
                                        Pay via Manual GCash QR & Upload
                                    </button>
                                )}

                                <button
                                    onClick={() => setIsBalanceModalDismissed(true)}
                                    className="w-full bg-transparent hover:bg-white/5 text-gray-400 hover:text-white font-semibold py-2 rounded-xl text-xs tracking-wider transition-all"
                                >
                                    Review Details First / Pay Later
                                </button>
                            </div>

                            {/* Balance Lock Notice Footer */}
                            <div className="p-2 bg-amber-500/5 border border-amber-500/10 rounded-xl text-center">
                                <p className="text-[10px] text-amber-400/90 font-medium">
                                    💡 <strong>Balance Settlement Required:</strong> Final release and receipt generation requires full settlement. You can also settle anytime from the booking screen.
                                </p>
                            </div>

                            {/* Simple Loading Sequence Overlay when connecting to payment gateway */}
                            {isInitiatingHitPay && (
                                <div className="absolute inset-0 bg-[#161618]/95 backdrop-blur-md rounded-3xl z-30 flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
                                    <div className="relative mb-4">
                                        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                            <CreditCard size={28} className="text-emerald-400 animate-pulse" />
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#161618] border border-emerald-500/40 flex items-center justify-center">
                                            <Loader2 size={13} className="text-emerald-400 animate-spin" />
                                        </div>
                                    </div>
                                    <h4 className="text-sm font-black text-white uppercase tracking-wider mb-1 animate-pulse">
                                        {hitPayLoadingStage}
                                    </h4>
                                    <p className="text-xs text-gray-300 max-w-xs leading-relaxed mb-4">
                                        Inihahanda ang inyong transaksyon. Huwag isara ang window na ito habang naglo-load ang HitPay checkout.
                                    </p>
                                    <div className="w-full max-w-xs bg-black/40 border border-white/5 rounded-xl p-3 text-left space-y-2">
                                        <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-semibold">
                                            <CheckCircle size={13} className="text-emerald-400 flex-shrink-0" />
                                            <span>Booking details & balance verified</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-[11px] font-semibold">
                                            {hitPayLoadingStage === 'Opening Checkout...' ? (
                                                <>
                                                    <CheckCircle size={13} className="text-emerald-400 flex-shrink-0" />
                                                    <span className="text-emerald-400">Gateway connection confirmed</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Loader2 size={13} className="text-amber-400 animate-spin flex-shrink-0" />
                                                    <span className="text-amber-400 animate-pulse">Securing HitPay payment channel...</span>
                                                </>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 text-[11px] font-semibold">
                                            {hitPayLoadingStage === 'Opening Checkout...' ? (
                                                <>
                                                    <Loader2 size={13} className="text-emerald-400 animate-spin flex-shrink-0" />
                                                    <span className="text-emerald-300 animate-pulse">Opening secure checkout window...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Clock size={13} className="text-gray-500 flex-shrink-0" />
                                                    <span className="text-gray-500">Redirecting to checkout</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })()}

            {/* Verifying Settlement Return Loading Sequence */}
            {isVerifyingFinalPayment && (
                <div className="fixed inset-0 z-[9995] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn text-center">
                    <div className="w-full max-w-sm bg-[#161618] border border-emerald-500/30 rounded-3xl p-6 shadow-2xl space-y-4">
                        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                            <Loader2 size={32} className="text-emerald-400 animate-spin" />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-white uppercase tracking-wider">
                                Kinukumpirma ang Bayad...
                            </h3>
                            <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                                Verifying your final balance settlement and updating records. Sandali lamang po...
                            </p>
                        </div>
                        <div className="p-3 bg-black/40 border border-white/5 rounded-xl text-left space-y-2 text-[11px]">
                            <div className="flex items-center gap-2 text-emerald-400">
                                <CheckCircle size={13} />
                                <span>Payment gateway confirmed</span>
                            </div>
                            <div className="flex items-center gap-2 text-amber-400 animate-pulse">
                                <Loader2 size={13} className="animate-spin" />
                                <span>Releasing completed booking status...</span>
                            </div>
                        </div>
                    </div>
                </div>
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
                            {isRental
                                ? "Your payment has been received and verified for your car rental reservation. The transaction is complete!"
                                : isLiaison
                                ? "Your payment has been received and verified for your LTO Liaison assistance. The transaction is complete!"
                                : isDriverHire
                                ? "Your payment has been received and verified for your driver hire trip. The transaction is complete!"
                                : "Your payment has been received and verified by the mechanic. The transaction is complete!"}
                        </p>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => {
                                    setShowCompleteTransactionModal(false);
                                    setShowReviewModal(true);
                                }}
                                className="w-full bg-primary hover:bg-orange-600 text-white font-black py-4 rounded-xl text-xs tracking-widest uppercase transition-all shadow-lg shadow-primary/20 active:scale-95"
                            >
                                {isRental ? "Review Car Rental" : isLiaison ? "Review Liaison Service" : isDriverHire ? "Review Driver Service" : "Review Service & Mechanic"}
                            </button>
                            <button
                                onClick={() => {
                                    setShowCompleteTransactionModal(false);
                                    setIsVerifyingFinalPayment(false);
                                    sessionStorage.removeItem('pendingHitPayServiceTx');
                                    window.history.replaceState({}, document.title, window.location.pathname);
                                }}
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

            {/* Realtime Live Route Map Modal */}
            <LiveRouteMapModal
                isOpen={showLiveRouteModal}
                onClose={() => setShowLiveRouteModal(false)}
                customerLocation={booking.location || null}
                customerImageUrl={booking.customerPhoto || (booking as any).customerImage || user?.picture || null}
                customerName={booking.customerName || user?.name || 'Customer'}
                mechanicLocation={mechanicLiveLocation || (mechanic?.lat && mechanic?.lng ? { lat: mechanic.lat, lng: mechanic.lng } : null)}
                mechanic={mechanic}
                serviceType={
                    (booking as any).isRental || booking.services?.[0]?.category === 'Car Rental' ? 'Car Rental' :
                    isDriverHire ? 'Driver for Hire' :
                    (booking as any).isTowing || booking.services?.[0]?.category === 'Towing' ? 'Towing' :
                    (booking as any).liaisonType || booking.services?.[0]?.category === 'Liaison' ? 'Liaison' :
                    booking.services?.[0]?.name || 'Service'
                }
                hqLocation={{
                    lat: Number(db?.settings?.storeLatitude ?? RIDERSBUD_STORE_LOCATION.lat),
                    lng: Number(db?.settings?.storeLongitude ?? RIDERSBUD_STORE_LOCATION.lng),
                    name: db?.settings?.storeName || RIDERSBUD_STORE_LOCATION.name,
                    address: db?.settings?.address || db?.settings?.storeAddress || RIDERSBUD_STORE_LOCATION.address
                }}
                destinationAddress={(booking as any).pickupLocation || booking.location?.address || 'Customer Location'}
                title={`Live Navigation — Job #${bookingSequenceId || booking.id.slice(-6)}`}
                status={booking.status}
                eta={eta || (booking as any).eta || null}
                etaNote={(booking as any).etaNote || null}
                onCallMechanic={handleCallMechanic}
                onChatMechanic={() => {
                    setShowLiveRouteModal(false);
                    setIsChatOpen(true);
                }}
                appLogoUrl={db?.settings?.mapLogoUrl || db?.settings?.appLogoUrl || '/favicon.png'}
            />

            {/* Progress Photo Zoom Modal */}
            {selectedProgressPhoto && (
                <div 
                    onClick={() => setSelectedProgressPhoto(null)}
                    className="fixed inset-0 z-[10000] bg-black/95 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn cursor-zoom-out"
                >
                    <div className="relative max-w-2xl w-full max-h-[90vh] flex flex-col items-center">
                        <button
                            onClick={() => setSelectedProgressPhoto(null)}
                            className="absolute -top-12 right-0 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
                            title="Close Preview"
                        >
                            <X size={20} />
                        </button>
                        <img 
                            src={selectedProgressPhoto} 
                            alt="Progress Photo Inspection" 
                            className="w-full h-auto max-h-[85vh] object-contain rounded-2xl border border-white/10 shadow-2xl"
                        />
                        <div className="mt-3 flex items-center gap-2">
                            <span className="text-[11px] text-gray-400 font-mono">Tap anywhere to close preview</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BookingDetailScreen;
