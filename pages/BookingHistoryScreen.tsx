import React, { useState, useMemo, useEffect, useCallback } from 'react';
import CustomerHeader from '../components/CustomerHeader';
import { 
    History, Calendar, Clock, User, Wrench, Eye, ClipboardList, Star,
    TrendingUp, Award, DollarSign, ArrowRight, ShieldCheck, XCircle, FileText, Phone, CreditCard,
    Car, Truck, UserCheck, Layers, MapPin, ExternalLink, X, Check, Copy, AlertCircle, Sparkles,
    Navigation, Package, Mail, Info, Compass, Receipt
} from 'lucide-react';
import { useDatabase } from '../context/DatabaseContext';
import { useAuth } from '../context/AuthContext';
import BookingStatusCard from '../components/BookingStatusCard';
import { useNavigate, useLocation } from 'react-router-dom';
import { Booking, BookingStatus, Review } from '../types';
import Spinner from '../components/Spinner';
import ReviewModal from '../components/ReviewModal';

// Helper function for date validation
const isValidDate = (dateString: string): boolean => {
    if (!dateString) return false;
    const date = new Date(dateString);
    return !isNaN(date.getTime());
};

const getStatusBadgeClass = (status: string) => {
    switch (status) {
        case 'Upcoming': return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
        case 'Mechanic Assigned': return 'bg-purple-500/20 text-purple-400 border border-purple-500/30';
        case 'En Route': return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
        case 'In Progress': return 'bg-orange-500/20 text-orange-400 border border-orange-500/30';
        case 'Work Done': return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
        case 'Completed': return 'bg-green-500/20 text-green-400 border border-green-500/30';
        case 'Cancelled': return 'bg-red-500/20 text-red-400 border border-red-500/30';
        
        // Driver for Hire Custom Statuses
        case 'Pending Admin Review': return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
        case 'For Verification': return 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30';
        case 'Awaiting Driver Availability': return 'bg-pink-500/20 text-pink-400 border border-pink-500/30';
        case 'Driver Assigned': return 'bg-teal-500/20 text-teal-400 border border-teal-500/30';
        case 'Confirmed': return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
        default: return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
    }
};

const BookingHistoryScreen: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { db, loading } = useDatabase();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'all' | 'maintenance' | 'rental' | 'driver' | 'liaison' | 'towing'>('all');
    const [filterStatus, setFilterStatus] = useState<string>('All');
    const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    // Selected Details Modal State
    const [selectedDetailsBooking, setSelectedDetailsBooking] = useState<any | null>(null);
    const [isCopiedRef, setIsCopiedRef] = useState(false);
    const [viewingDocumentUrl, setViewingDocumentUrl] = useState<string | null>(null);
    const [viewingDocumentName, setViewingDocumentName] = useState<string>('Document');

    // Review Modal State
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [selectedBookingForReview, setSelectedBookingForReview] = useState<Booking | null>(null);
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);

    const { addReview, updateReview } = useDatabase();

    // User-matching helper for robust filtering across all transaction collections
    const isUserMatch = useCallback((record: any) => {
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
    }, [user]);

    // Handle redirect from booking confirmation
    useEffect(() => {
        const state = location.state as { message?: string; highlightBookingId?: string } | null;
        if (state?.message) {
            setSuccessMessage(state.message);
            setShowSuccessMessage(true);

            // Clear the message after 5 seconds
            setTimeout(() => {
                setShowSuccessMessage(false);
            }, 5000);

            // Clear location state to prevent showing message on refresh
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location, navigate]);

    // Format RB sequence ID for maintenance
    const getBookingSequenceId = useCallback((bId: string) => {
        if (!db?.bookings) return bId.slice(-6).toUpperCase();
        const sortedBookings = [...db.bookings].sort((a, b) => {
            const timeA = new Date(a.date).getTime();
            const timeB = new Date(b.date).getTime();
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
            if (bk.id === bId) {
                seqId = `RB-${year}-${String(yearCounters[year]).padStart(4, '0')}`;
                break;
            }
        }
        return seqId || bId.slice(-6).toUpperCase();
    }, [db?.bookings]);

    // UNIFIED TRANSACTION AGGREGATOR (All 5 Customer Service Streams)
    const allUnifiedBookings = useMemo(() => {
        const list: any[] = [];
        if (!user || !db) return list;

        // 1. Vehicle Service & Repair Bookings
        if (db.bookings && Array.isArray(db.bookings)) {
            db.bookings.filter(isUserMatch).forEach(b => {
                const mechanic = db?.mechanics?.find(m => m.id === b.mechanicId || m.id === b.mechanic?.id) || b.mechanic;
                const statusLower = (b.status || '').toString().trim().toLowerCase();
                const isOngoing = ['mechanic assigned', 'en route', 'in progress', 'upcoming', 'booking confirmed'].includes(statusLower);
                const isCompleted = ['completed', 'work done'].includes(statusLower);
                const isCancelled = ['cancelled', 'canceled', 'rejected', 'declined'].includes(statusLower);

                let statusBadgeColor = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
                if (isOngoing) statusBadgeColor = 'text-primary bg-primary/10 border-primary/30';
                else if (isCompleted) statusBadgeColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
                else if (isCancelled) statusBadgeColor = 'text-rose-400 bg-rose-500/10 border-rose-500/20';

                const dateStr = b.date ? (b.time ? `${b.date} · ${b.time}` : b.date) : (b.createdAt?.split('T')[0] || 'Scheduled');
                const parsedDate = b.date && b.time ? new Date(`${b.date.replace(/-/g, '/')} ${b.time}`) : new Date(b.date || b.createdAt || Date.now());

                const servicesList = Array.isArray(b.services) && b.services.length > 0 
                    ? b.services 
                    : (b.service ? [b.service] : (b.serviceName ? [{ name: b.serviceName, price: b.totalAmount || 0, category: b.category || 'Diagnostics' }] : []));

                const subtotal = servicesList.reduce((acc: number, s: any) => acc + (s.price || 0), 0) || (b.totalAmount || 0);
                const laborFee = b.laborFee || 0;
                const platformFee = b.platformFee || 0;
                const discount = b.discount || 0;
                const additionalCostsTotal = b.additionalCosts ? b.additionalCosts.reduce((s: number, c: any) => s + (Number(c.price) || 0), 0) : 0;
                const calculatedTotal = (b.totalAmount || subtotal + laborFee + platformFee - discount) + additionalCostsTotal;

                list.push({
                    id: b.id,
                    type: 'maintenance',
                    typeLabel: 'Service Booking',
                    title: servicesList.map((s: any) => s.name).join(', ') || b.serviceName || b.service?.name || 'Vehicle Service',
                    refCode: getBookingSequenceId(b.id),
                    status: b.status || 'Booking Confirmed',
                    statusBadgeColor,
                    isActive: isOngoing && !isCompleted && !isCancelled,
                    isCompleted,
                    isCancelled,
                    dateOnly: b.date || (b.createdAt ? b.createdAt.split('T')[0] : ''),
                    timeStr: b.time || 'Scheduled',
                    dateTimeStr: dateStr,
                    dateObj: isNaN(parsedDate.getTime()) ? new Date() : parsedDate,
                    detailsUrl: `/customer-portal/booking-detail/${b.id}`,
                    image: servicesList[0]?.imageUrl || b.service?.imageUrl || '',
                    category: servicesList[0]?.category || b.service?.category || 'General Repair',
                    vehicleDesc: b.vehicle ? `${b.vehicle.year || ''} ${b.vehicle.make || ''} ${b.vehicle.model || ''}`.trim() : (b.vehicleType || 'Registered Vehicle'),
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
                    specialistImageUrl: mechanic?.imageUrl || b.mechanicImageUrl,
                    specialistIsOnline: mechanic?.isOnline !== false,
                    specialistExperience: mechanic?.experience || '5+ Years Certified',
                    specialistLocation: mechanic?.currentLocation || 'Manila Hub',
                    totalAmount: calculatedTotal,
                    downpaymentAmount: b.downpaymentAmount || b.paidAmount || (calculatedTotal * 0.5),
                    paidAmount: b.paidAmount || 0,
                    subtotal,
                    laborFee,
                    platformFee,
                    discount,
                    paymentMethod: b.paymentMethod || 'HitPay / GCash',
                    paymentStatus: (() => {
                        const paidAmt = b.paidAmount || 0;
                        const isFullyPaid = (b.paymentStatus === 'paid' || b.isPaid) && (paidAmt >= calculatedTotal || calculatedTotal === 0);
                        if (isCancelled) return paidAmt > 0 ? 'Cancelled (DP Paid)' : 'Cancelled';
                        if (isFullyPaid) return 'Fully Paid';
                        if (b.paymentStatus === 'downpayment_paid' || b.paymentStatus === 'partial' || b.isVerified || paidAmt > 0) {
                            return '50% DP PAID';
                        }
                        return b.paymentStatus || 'Pending DP';
                    })(),
                    remainingBalance: isCancelled ? 0 : Math.max(0, calculatedTotal - (b.paidAmount || (b.paymentStatus === 'downpayment_paid' || b.paymentStatus === 'partial' || b.isVerified ? (b.downpaymentAmount || calculatedTotal * 0.5) : 0))),
                    isVerified: !isCancelled && !!b.isVerified,
                    rawBooking: b,
                    review: b.review
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
                const isPending = ['pending', 'received', 'for review'].includes(statusLower);

                let statusBadgeColor = 'text-blue-400 bg-blue-500/10 border-blue-500/20';
                if (statusLower === 'active rental' || statusLower === 'in use') {
                    statusBadgeColor = 'text-[#FE7803] bg-[#FE7803]/15 border-[#FE7803]/30 font-bold';
                } else if (isApproved) {
                    statusBadgeColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
                } else if (isCancelled) {
                    statusBadgeColor = 'text-rose-400 bg-rose-500/10 border-rose-500/20';
                } else if (isCompleted) {
                    statusBadgeColor = 'text-green-400 bg-green-500/10 border-green-500/20';
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
                    isActive: (isApproved || isPending) && !isCompleted && !isCancelled,
                    isCompleted,
                    isCancelled,
                    dateOnly: b.startDate || (b.createdAt ? b.createdAt.split('T')[0] : ''),
                    timeStr: `${days} Day(s)`,
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
                    rawBooking: { ...b, car }
                });
            });
        }

        // 3. Driver for Hire & Towing Requests
        if (db.serviceRequests && Array.isArray(db.serviceRequests)) {
            db.serviceRequests.filter(isUserMatch).forEach(req => {
                const name = req.serviceName || req.category || 'Special Service';
                const isTowing = name.toLowerCase().includes('towing') || req.slug === 'towing';
                const type: 'towing' | 'driver' = isTowing ? 'towing' : 'driver';

                const statusLower = (req.status || '').toString().trim().toLowerCase();
                const isCompleted = ['completed', 'done'].includes(statusLower);
                const isCancelled = ['cancelled', 'canceled', 'rejected', 'declined'].includes(statusLower);
                const isOngoing = ['in progress', 'assigned', 'driver assigned', 'dispatched', 'en route', 'pending', 'pending admin review', 'for verification', 'awaiting driver availability'].includes(statusLower);

                let statusBadgeColor = isTowing ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
                if (isOngoing && !['pending', 'pending admin review'].includes(statusLower)) statusBadgeColor = 'text-primary bg-primary/10 border-primary/30';
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
                    isActive: isOngoing && !isCompleted && !isCancelled,
                    isCompleted,
                    isCancelled,
                    dateOnly: req.scheduledDate || (req.createdAt ? req.createdAt.split('T')[0] : ''),
                    timeStr: req.scheduledTime || req.pickupTime || 'Standard Service',
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
                const isOngoing = ['assigned', 'in progress', 'processing at lto', 'for processing', 'processing', 'received', 'pending'].includes(statusLower);

                let statusBadgeColor = 'text-purple-400 bg-purple-500/10 border-purple-500/20';
                if (isOngoing && !['received', 'pending'].includes(statusLower)) statusBadgeColor = 'text-primary bg-primary/10 border-primary/30';
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
                const isPaidFull = b.paymentStatus === 'Paid' || b.paymentStatus === 'Paid in Full' || b.status === 'Completed';
                const paidAmount = isPaidFull ? total : (b.paidAmount || (b.paymentStatus === 'Downpayment Paid' ? downpaymentAmount : 0));
                const remainingBalance = Math.max(0, total - paidAmount);

                list.push({
                    id: b.id,
                    type: 'liaison',
                    typeLabel: 'LTO Liaison',
                    title: `LTO: ${b.serviceType || 'Registration Assistance'}`,
                    refCode: `LIA-${b.id.slice(-6).toUpperCase()}`,
                    status: b.status || 'Received',
                    statusBadgeColor,
                    isActive: isOngoing && !isCompleted && !isCancelled,
                    isCompleted,
                    isCancelled,
                    dateOnly: b.appointmentDate || (b.createdAt ? b.createdAt.split('T')[0] : ''),
                    timeStr: b.appointmentTime || '08:00 AM',
                    dateTimeStr: dateStr,
                    dateObj: isNaN(parsedDate.getTime()) ? new Date() : parsedDate,
                    detailsUrl: `/customer-portal/booking-detail/${b.id}`,
                    image: uploadedImg || staff?.imageUrl || '/images/services/liaison.png',
                    category: 'LTO Liaison Assistance',
                    vehicleDesc: b.vehicleDetails ? `${b.vehicleDetails.year || ''} ${b.vehicleDetails.brand || ''} ${b.vehicleDetails.model || ''}`.trim() : 'Document Registration',
                    plateNumber: b.vehicleDetails?.plateNumber || b.plateNumber || '',
                    vehicleDetails: b.vehicleDetails || null,
                    branchName: b.branchName || 'LTO District Office',
                    customerName: b.customerName || b.applicantName || user?.name || 'Customer',
                    customerPhone: b.customerPhone || b.contactNumber || user?.phone || '',
                    customerEmail: b.customerEmail || b.email || user?.email || '',
                    notes: b.notes || b.specialInstructions || '',
                    pickupOption: b.pickupOption || 'Customer brings documents to branch',
                    pickupAddress: b.pickupAddress || '',
                    documents: b.documents || [],
                    hitpayReference: b.hitpayReference || '',
                    serviceFee,
                    governmentFee,
                    pickupFee,
                    discount,
                    downpaymentAmount,
                    paidAmount,
                    remainingBalance,
                    specialistName: staff?.name || b.liaisonName || 'LTO Liaison Officer',
                    specialistRole: 'Assigned Liaison Officer',
                    specialistPhone: staff?.phone,
                    specialistRating: staff?.rating || 4.95,
                    specialistImageUrl: staff?.imageUrl,
                    specialistIsOnline: staff?.isAvailable !== false,
                    specialistExperience: 'Accredited Liaison',
                    specialistLocation: b.branchName || 'LTO Main Branch',
                    totalAmount: total,
                    subtotal: total,
                    laborFee: serviceFee,
                    platformFee: 0,
                    paymentMethod: b.paymentMethod || 'HitPay Online (GCash / Cards / Maya)',
                    paymentStatus: isPaidFull ? 'Paid in Full' : (b.paymentStatus === 'Downpayment Paid' ? 'Downpayment Paid (50%)' : (b.paymentStatus || 'Pending Payment')),
                    isVerified: isPaidFull || b.paymentStatus === 'Downpayment Paid',
                    rawBooking: { ...b, staff }
                });
            });
        }

        return list.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
    }, [db?.bookings, db?.rentalBookings, db?.rentalCars, db?.serviceRequests, db?.hireDrivers, db?.liaisonBookings, db?.liaisonStaff, db?.mechanics, user, isUserMatch, getBookingSequenceId]);

    // Active vs Past Bookings with Filter Application
    const { activeBookings, pastBookings } = useMemo(() => {
        let items = [...allUnifiedBookings];

        // 1. Tab Filter
        if (activeTab !== 'all') {
            items = items.filter(it => it.type === activeTab);
        }

        // 2. Status Filter
        if (filterStatus !== 'All') {
            const fLower = filterStatus.toLowerCase();
            items = items.filter(it => {
                const sLower = (it.status || '').toLowerCase();
                if (fLower === 'completed') return it.isCompleted || sLower === 'completed';
                if (fLower === 'cancelled') return it.isCancelled || sLower === 'cancelled' || sLower === 'canceled';
                if (fLower === 'in progress' || fLower === 'en route') return sLower.includes('progress') || sLower.includes('route');
                if (fLower === 'confirmed' || fLower === 'assigned') return sLower.includes('confirmed') || sLower.includes('assigned');
                if (fLower === 'upcoming' || fLower === 'pending') return sLower.includes('upcoming') || sLower.includes('pending') || sLower.includes('received');
                return sLower.includes(fLower);
            });
        }

        // 3. Date Range Filter
        if (dateRange.start && dateRange.start.trim()) {
            items = items.filter(it => it.dateOnly >= dateRange.start);
        }
        if (dateRange.end && dateRange.end.trim()) {
            items = items.filter(it => it.dateOnly <= dateRange.end);
        }

        const active = items.filter(it => it.isActive);
        const past = items.filter(it => !it.isActive);

        return { activeBookings: active, pastBookings: past };
    }, [allUnifiedBookings, activeTab, filterStatus, dateRange]);

    // Accurate Multi-Stream KPI Summary
    const statsSummary = useMemo(() => {
        const activeCount = allUnifiedBookings.filter(b => b.isActive).length;
        const completedCount = allUnifiedBookings.filter(b => b.isCompleted).length;
        const totalSpent = allUnifiedBookings.reduce((sum, b) => {
            if (b.isCancelled) {
                return sum + (b.paidAmount || 0);
            }
            if (b.isCompleted) {
                return sum + (b.totalAmount || 0);
            }
            return sum + (b.paidAmount || 0);
        }, 0);

        return { activeCount, completedCount, totalSpent };
    }, [allUnifiedBookings]);

    const resetFilters = useCallback(() => {
        setActiveTab('all');
        setFilterStatus('All');
        setDateRange({ start: '', end: '' });
    }, []);

    // Card Click Handler
    const handleCardClick = (item: any) => {
        if (!item) return;
        if (item.type === 'maintenance' || item.type === 'driver' || item.type === 'towing' || item.type === 'rental') {
            navigate(`/customer-portal/booking-detail/${item.id}`, { state: { booking: item.rawBooking } });
        } else {
            // For liaison and other types, display the rich details modal
            setSelectedDetailsBooking(item);
        }
    };

    const handleOpenReviewModal = (booking: any) => {
        setSelectedBookingForReview(booking.rawBooking || booking);
        setIsReviewModalOpen(true);
    };

    const handleSubmitReview = async (rating: number, comment: string) => {
        if (!selectedBookingForReview) return;
        setIsSubmittingReview(true);
        try {
            const isDriver = selectedBookingForReview.isDriverHire || (selectedBookingForReview as any).type === 'driver' || selectedBookingForReview.serviceName === 'Driver for Hire';
            const driverStaff = (selectedBookingForReview as any).driverStaff;
            const targetProviderId = isDriver
                ? (driverStaff?.id || (selectedBookingForReview as any).driverId || selectedBookingForReview.mechanicId || 'driver-assigned')
                : (selectedBookingForReview.mechanic?.id || selectedBookingForReview.mechanicId || '');
            const targetProviderName = isDriver
                ? (driverStaff?.name || (selectedBookingForReview as any).driverName || (selectedBookingForReview as any).assignedDriverName || 'Professional Driver')
                : (selectedBookingForReview.mechanic?.name || selectedBookingForReview.mechanicName || '');

            if (selectedBookingForReview.review) {
                const updated = {
                    ...selectedBookingForReview.review,
                    rating,
                    comment
                };
                await updateReview(selectedBookingForReview.id, updated);
                setSelectedBookingForReview(prev => prev ? ({ ...prev, review: updated } as any) : null);
                setSuccessMessage('Review updated successfully!');
            } else {
                const newRev = {
                    bookingId: selectedBookingForReview.id,
                    customerId: user?.id || selectedBookingForReview.customerId || '',
                    customerName: user?.name || selectedBookingForReview.customerName || 'Customer',
                    mechanicId: targetProviderId,
                    mechanicName: targetProviderName,
                    rating,
                    comment
                };
                await addReview(selectedBookingForReview.id, newRev);
                setSelectedBookingForReview(prev => prev ? ({ ...prev, review: { ...newRev, id: `review-${Date.now()}`, date: new Date().toISOString() }, isReviewed: true } as any) : null);
                setSuccessMessage('Review submitted successfully!');
            }
            setShowSuccessMessage(true);
            setTimeout(() => setShowSuccessMessage(false), 5000);
        } catch (e) {
            console.error('Review submission error:', e);
            throw e;
        } finally {
            setIsSubmittingReview(false);
        }
    };

    if (loading) return <Spinner />;

    return (
        <div className="flex flex-col min-h-screen bg-[#121212] text-white select-none">
            <CustomerHeader title="Booking History" icon={<History size={22} />} />

            <div className="flex-1 overflow-y-auto custom-scrollbar pb-20">
                <main className="p-4 space-y-6 max-w-5xl mx-auto w-full">

                    {/* Success Notification Banner */}
                    {showSuccessMessage && (
                        <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-5 border border-green-400/30 shadow-2xl shadow-green-500/20 animate-fadeIn">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                                    <Check className="h-7 w-7 text-white" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-white font-black text-base mb-1">{successMessage}</h3>
                                    <p className="text-white/80 text-sm">Your booking request has been processed successfully.</p>
                                </div>
                                <button
                                    onClick={() => setShowSuccessMessage(false)}
                                    className="text-white/60 hover:text-white transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Booking KPI Analytics Section (All Streams) */}
                    <div className="grid grid-cols-3 gap-2.5">
                        <div className="bg-[#15151A]/80 backdrop-blur-md border border-white/5 p-4 rounded-2xl flex flex-col justify-between shadow-lg">
                            <div className="flex items-center justify-between">
                                <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest font-mono">Active Bookings</span>
                                <TrendingUp size={12} className="text-blue-400" />
                            </div>
                            <div className="flex items-baseline gap-1 mt-2">
                                <span className="text-xl font-black text-blue-400">{statsSummary.activeCount}</span>
                                <span className="text-[9px] text-gray-600 font-bold font-mono">active</span>
                            </div>
                        </div>
                        <div className="bg-[#15151A]/80 backdrop-blur-md border border-white/5 p-4 rounded-2xl flex flex-col justify-between shadow-lg">
                            <div className="flex items-center justify-between">
                                <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest font-mono">Completed</span>
                                <Award size={12} className="text-emerald-400" />
                            </div>
                            <div className="flex items-baseline gap-1 mt-2">
                                <span className="text-xl font-black text-emerald-400">{statsSummary.completedCount}</span>
                                <span className="text-[9px] text-gray-600 font-bold font-mono">done</span>
                            </div>
                        </div>
                        <div className="bg-[#15151A]/80 backdrop-blur-md border border-white/5 p-4 rounded-2xl flex flex-col justify-between shadow-lg">
                            <div className="flex items-center justify-between">
                                <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest font-mono">Total Spent</span>
                                <DollarSign size={12} className="text-primary" />
                            </div>
                            <div className="mt-2">
                                <span className="text-sm font-black text-white">₱{statsSummary.totalSpent.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Horizontal Stream Category Tabs */}
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
                        {[
                            { id: 'all', label: 'All', icon: Layers, count: allUnifiedBookings.length },
                            { id: 'maintenance', label: 'Services', icon: Wrench, count: allUnifiedBookings.filter(t => t.type === 'maintenance').length },
                            { id: 'rental', label: 'Rent a Car', icon: Car, count: allUnifiedBookings.filter(t => t.type === 'rental').length },
                            { id: 'driver', label: 'Driver for Hire', icon: UserCheck, count: allUnifiedBookings.filter(t => t.type === 'driver').length },
                            { id: 'liaison', label: 'LTO Liaison', icon: FileText, count: allUnifiedBookings.filter(t => t.type === 'liaison').length },
                            { id: 'towing', label: 'Towing', icon: Truck, count: allUnifiedBookings.filter(t => t.type === 'towing').length },
                        ].map(tab => {
                            const TabIcon = tab.icon;
                            const isSelected = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
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

                    {/* Active Bookings (All Streams) */}
                    {activeBookings.length > 0 && (
                        <section className="animate-slideUp space-y-3">
                            <h2 className="text-sm font-black text-white flex items-center gap-2 uppercase tracking-wider pl-1">
                                <span className="w-1.5 h-4 bg-primary rounded-full"></span>
                                Active Services ({activeBookings.length})
                            </h2>
                            <div className="flex flex-col gap-3.5">
                                {activeBookings.map(booking => {
                                    const isMaint = booking.type === 'maintenance';
                                    const isRent = booking.type === 'rental';
                                    const isLiaison = booking.type === 'liaison';
                                    const isDrive = booking.type === 'driver';
                                    const isTow = booking.type === 'towing';

                                    const typeBadgeStyle = isMaint 
                                        ? 'bg-orange-500/15 text-orange-400 border-orange-500/30' 
                                        : isRent 
                                        ? 'bg-blue-500/15 text-blue-400 border-blue-500/30' 
                                        : isLiaison 
                                        ? 'bg-purple-500/15 text-purple-400 border-purple-500/30' 
                                        : isDrive 
                                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
                                        : 'bg-rose-500/15 text-rose-400 border-rose-500/30';

                                    return (
                                        <div 
                                            key={`${booking.type}-${booking.id}`} 
                                            onClick={() => handleCardClick(booking)}
                                            className="relative group cursor-pointer"
                                        >
                                            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/30 to-orange-500/20 rounded-2xl opacity-10 group-hover:opacity-25 transition duration-300 blur-sm"></div>
                                            <div className="relative bg-[#16161C] border border-white/10 hover:border-primary/40 rounded-2xl p-4 sm:p-5 transition-all duration-300 shadow-2xl space-y-3.5">
                                                
                                                {/* Top Row: Type Tag, Job Ref Code & Status Badge */}
                                                <div className="flex items-center justify-between gap-3 border-b border-white/5 pb-2.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border shrink-0 ${typeBadgeStyle}`}>
                                                            {booking.typeLabel}
                                                        </span>
                                                        <span className="text-[11px] font-black text-primary font-mono tracking-wider">
                                                            #{booking.refCode}
                                                        </span>
                                                    </div>
                                                    <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black tracking-wider uppercase border shadow-sm ${getStatusBadgeClass(booking.status)}`}>
                                                        {booking.status}
                                                    </span>
                                                </div>

                                                {/* Middle Section: Avatar/Thumbnail + Details */}
                                                <div className="flex items-center gap-3.5">
                                                    <div className="w-13 h-13 rounded-xl border border-white/10 overflow-hidden flex-shrink-0 bg-neutral-900 flex items-center justify-center relative shadow-md">
                                                        {booking.specialistImageUrl || booking.image ? (
                                                            <img 
                                                                src={booking.specialistImageUrl || booking.image} 
                                                                alt="" 
                                                                className="w-full h-full object-cover" 
                                                                onError={(e) => { (e.target as HTMLImageElement).src = '/riders-logo.png'; }}
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center font-black text-base text-white">
                                                                {(booking.specialistName || booking.title || 'R').charAt(0).toUpperCase()}
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    {/* Details */}
                                                    <div className="flex-1 min-w-0 space-y-1">
                                                        <h3 className="text-sm sm:text-base font-black text-white truncate tracking-tight">
                                                            {booking.title}
                                                        </h3>
                                                        <p className="text-[11px] text-gray-300 font-bold truncate flex items-center gap-1.5">
                                                            {isMaint ? <Wrench size={12} className="text-primary flex-shrink-0" /> :
                                                             isRent ? <Car size={12} className="text-blue-400 flex-shrink-0" /> :
                                                             isDrive ? <UserCheck size={12} className="text-emerald-400 flex-shrink-0" /> :
                                                             isTow ? <Truck size={12} className="text-rose-400 flex-shrink-0" /> :
                                                             <FileText size={12} className="text-purple-400 flex-shrink-0" />}
                                                            {booking.vehicleDesc}
                                                            {booking.plateNumber && (
                                                                <span className="font-mono bg-white/5 border border-white/10 px-1 rounded text-[9px] text-gray-300 ml-1">
                                                                    {booking.plateNumber}
                                                                </span>
                                                            )}
                                                        </p>
                                                        <p className="text-[10px] text-gray-400 font-bold truncate flex items-center gap-3">
                                                            <span className="flex items-center gap-1">
                                                                <Calendar size={11} className="text-gray-500 flex-shrink-0" />
                                                                {booking.dateTimeStr}
                                                            </span>
                                                            {booking.specialistName && (
                                                                <span className="text-primary/90 truncate">
                                                                    • {booking.specialistName}
                                                                </span>
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                                
                                                {/* Bottom Action: Price & View Details Button */}
                                                <div className="pt-1 flex items-center justify-between gap-2 border-t border-white/5">
                                                    <div className="flex items-baseline gap-1.5">
                                                        <span className="text-xs sm:text-sm font-black text-white">
                                                            ₱{(booking.totalAmount || 0).toLocaleString()}
                                                        </span>
                                                        <span className="text-[9px] text-emerald-400 font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/20">
                                                            {booking.paymentStatus}
                                                        </span>
                                                    </div>

                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleCardClick(booking);
                                                        }}
                                                        className="bg-gradient-to-r from-[#FF7903] to-[#FF5500] hover:from-[#e06800] hover:to-[#e04500] text-white font-black py-2 px-3.5 rounded-xl text-xs tracking-wider uppercase transition-all duration-300 active:scale-[0.99] flex items-center justify-center gap-1.5 shadow-lg shadow-primary/25 cursor-pointer"
                                                    >
                                                        <ClipboardList size={13} />
                                                        <span>VIEW DETAILS</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {/* Filters Section */}
                    <section className="bg-[#15151A]/80 backdrop-blur-md border border-white/5 p-5 rounded-3xl shadow-xl animate-fadeIn relative overflow-hidden">
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
                        
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
                                <span className="w-1.5 h-4 bg-primary rounded-full"></span>
                                Filter Booking Status &amp; Dates
                            </h2>
                            {(filterStatus !== 'All' || dateRange.start || dateRange.end || activeTab !== 'all') && (
                                <button
                                    onClick={resetFilters}
                                    className="text-[10px] text-primary hover:underline font-bold uppercase tracking-wider cursor-pointer"
                                >
                                    Reset Filters
                                </button>
                            )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 relative z-10">
                            <div className="flex flex-col group">
                                <label className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-1.5 pl-1">Booking Status</label>
                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    className="w-full bg-[#101014] border border-white/5 hover:border-white/10 text-white rounded-xl px-4 py-3 text-xs font-bold outline-none transition-all duration-300 focus:border-primary/50 focus:ring-2 focus:ring-primary/10 cursor-pointer shadow-inner"
                                >
                                    <option value="All">All Statuses</option>
                                    <option value="Upcoming">Upcoming / Pending</option>
                                    <option value="Confirmed">Confirmed / Assigned</option>
                                    <option value="In Progress">In Progress / En Route</option>
                                    <option value="Completed">Completed</option>
                                    <option value="Cancelled">Cancelled</option>
                                </select>
                            </div>
                            
                            <div className="md:col-span-2 grid grid-cols-2 gap-3.5">
                                <div className="flex flex-col group">
                                    <label htmlFor="history-start-date" className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-1.5 pl-1">Start Date</label>
                                    <input
                                        id="history-start-date"
                                        name="history-start-date"
                                        type="date"
                                        value={dateRange.start}
                                        onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                        className="w-full bg-[#101014] border border-white/5 hover:border-white/10 text-white rounded-xl px-4 py-3 text-xs font-bold outline-none transition-all duration-300 focus:border-primary/50 focus:ring-2 focus:ring-primary/10 cursor-pointer [color-scheme:dark] shadow-inner"
                                    />
                                </div>
                                
                                <div className="flex flex-col group">
                                    <label htmlFor="history-end-date" className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-1.5 pl-1">End Date</label>
                                    <input
                                        id="history-end-date"
                                        name="history-end-date"
                                        type="date"
                                        value={dateRange.end}
                                        onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                        className="w-full bg-[#101014] border border-white/5 hover:border-white/10 text-white rounded-xl px-4 py-3 text-xs font-bold outline-none transition-all duration-300 focus:border-primary/50 focus:ring-2 focus:ring-primary/10 cursor-pointer [color-scheme:dark] shadow-inner"
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Past Bookings (All Streams) */}
                    <section className="animate-slideUp space-y-4" style={{ animationDelay: '0.1s' }}>
                        <h2 className="text-sm font-black text-white flex items-center gap-2 uppercase tracking-wider pl-1">
                            <span className="w-1.5 h-4 bg-gray-600 rounded-full"></span>
                            Past Bookings ({pastBookings.length})
                        </h2>

                        {pastBookings.length === 0 ? (
                            <div className="text-center py-16 bg-[#15151A]/60 rounded-3xl border border-white/5 flex flex-col items-center justify-center p-6 space-y-3">
                                <XCircle size={32} className="text-gray-600" />
                                <p className="text-gray-500 text-xs font-bold">No past bookings found matching your filters.</p>
                                <button
                                    onClick={resetFilters}
                                    className="text-primary hover:underline font-black text-xs uppercase tracking-wider cursor-pointer"
                                >
                                    Clear Filters
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {pastBookings.map(booking => {
                                    const isMaint = booking.type === 'maintenance';
                                    const isRent = booking.type === 'rental';
                                    const isLiaison = booking.type === 'liaison';
                                    const isDrive = booking.type === 'driver';
                                    const isTow = booking.type === 'towing';

                                    const typeBadgeStyle = isMaint 
                                        ? 'bg-orange-500/15 text-orange-400 border-orange-500/30' 
                                        : isRent 
                                        ? 'bg-blue-500/15 text-blue-400 border-blue-500/30' 
                                        : isLiaison 
                                        ? 'bg-purple-500/15 text-purple-400 border-purple-500/30' 
                                        : isDrive 
                                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
                                        : 'bg-rose-500/15 text-rose-400 border-rose-500/30';

                                    return (
                                        <div
                                            key={`${booking.type}-${booking.id}`}
                                            onClick={() => handleCardClick(booking)}
                                            className="group relative cursor-pointer overflow-hidden rounded-xl bg-[#16161C] border border-white/10 hover:border-primary/40 transition-all duration-200 active:scale-[0.99] shadow-md p-3 sm:p-3.5"
                                        >
                                            <div className="flex items-center gap-3">
                                                {/* Avatar / Thumbnail */}
                                                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg border border-white/10 overflow-hidden flex-shrink-0 bg-neutral-900 flex items-center justify-center shadow-inner">
                                                    {booking.specialistImageUrl || booking.image ? (
                                                        <img 
                                                            src={booking.specialistImageUrl || booking.image} 
                                                            alt="" 
                                                            className="w-full h-full object-cover" 
                                                            onError={(e) => { (e.target as HTMLImageElement).src = '/riders-logo.png'; }}
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full bg-gradient-to-br from-neutral-800 to-neutral-900 flex items-center justify-center font-black text-xs text-gray-400">
                                                            {(booking.specialistName || booking.title || 'R').charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Core Details */}
                                                <div className="flex-1 min-w-0">
                                                    {/* Top Row: Stream Badge, Job ID, Status Badge & Price */}
                                                    <div className="flex items-center justify-between gap-2 mb-0.5">
                                                        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                                                            <span className={`px-1.5 py-0.2 rounded text-[8px] font-black uppercase tracking-wider border shrink-0 ${typeBadgeStyle}`}>
                                                                {booking.typeLabel}
                                                            </span>
                                                            <span className="text-[10px] font-black text-primary font-mono tracking-tight shrink-0">
                                                                #{booking.refCode}
                                                            </span>
                                                            <span className={`px-1.5 py-0.2 rounded text-[8px] font-black tracking-wider uppercase shrink-0 ${booking.isCompleted ? 'bg-green-500/15 text-green-400 border border-green-500/30' : 'bg-red-500/15 text-red-400 border border-red-500/30'}`}>
                                                                {booking.status}
                                                            </span>
                                                            {booking.review && (
                                                                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-yellow-400 bg-yellow-500/10 px-1 rounded border border-yellow-500/20">
                                                                    <Star size={8} className="fill-yellow-400" />
                                                                    {booking.review.rating}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className="text-xs sm:text-sm font-black text-primary font-mono shrink-0">
                                                            {booking.totalAmount > 0 ? `₱${booking.totalAmount.toLocaleString()}` : 'Quotation'}
                                                        </span>
                                                    </div>

                                                    {/* Middle Row: Title */}
                                                    <h3 className="text-xs sm:text-sm font-bold text-white truncate leading-snug group-hover:text-primary transition-colors">
                                                        {booking.title}
                                                    </h3>

                                                    {/* Bottom Row: Vehicle & Date / Time */}
                                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-[9px] sm:text-[10px] text-gray-400 font-medium">
                                                        <span className="flex items-center gap-1 text-gray-300 truncate max-w-[150px] sm:max-w-none">
                                                            {isMaint ? <Wrench size={10} className="text-primary/70 shrink-0" /> :
                                                             isRent ? <Car size={10} className="text-blue-400/70 shrink-0" /> :
                                                             isDrive ? <UserCheck size={10} className="text-emerald-400/70 shrink-0" /> :
                                                             isTow ? <Truck size={10} className="text-rose-400/70 shrink-0" /> :
                                                             <FileText size={10} className="text-purple-400/70 shrink-0" />}
                                                            {booking.vehicleDesc}
                                                        </span>
                                                        <span className="text-gray-600 hidden xs:inline">•</span>
                                                        <span className="flex items-center gap-1 text-gray-500 shrink-0">
                                                            <Calendar size={10} className="text-gray-600 shrink-0" />
                                                            {booking.dateTimeStr}
                                                        </span>
                                                        {booking.specialistName && (
                                                            <span className="text-gray-400 truncate">
                                                                • {booking.specialistName}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Compact Right Chevron Indicator */}
                                                <div className="flex-shrink-0 text-gray-600 group-hover:text-primary transition-transform duration-200 group-hover:translate-x-0.5 pl-1">
                                                    <ArrowRight size={14} />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                </main>
            </div>

            {/* Complete Data Details Modal (For Rental & Liaison Streams) */}
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
                                        'bg-rose-500/20 text-rose-400 border-rose-500/30'
                                    }`}>
                                        {selectedDetailsBooking.typeLabel || 'Booking Details'}
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
                            {/* Live Status & Schedule Strip */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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

                                <div className="bg-white/5 p-2.5 rounded-xl border border-white/5 flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-yellow-500/10 border border-yellow-500/20 shrink-0">
                                        <Calendar size={13} className="text-yellow-500" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Date &amp; Schedule</p>
                                        <p className="font-bold text-white text-xs truncate">{selectedDetailsBooking.dateTimeStr}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Vehicle Specification / LTO Target */}
                            <div className="bg-white/5 p-2.5 sm:p-3 rounded-xl border border-white/5 flex items-start gap-2.5">
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-blue-500/10 border border-blue-500/20 shrink-0 mt-0.5">
                                    <Car size={13} className="text-blue-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-1 mb-0.5">
                                        <h4 className="text-gray-400 font-bold uppercase text-[9px] tracking-wider">
                                            {selectedDetailsBooking.type === 'rental' ? 'Rental Fleet Specification' :
                                             selectedDetailsBooking.type === 'driver' ? 'Driver for Hire Details' :
                                             selectedDetailsBooking.type === 'liaison' ? 'LTO Vehicle Technical Specs' : 'Vehicle Specification'}
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

                                    {/* Liaison Specific Technical Specs (OR/CR, Engine, Chassis) */}
                                    {selectedDetailsBooking.type === 'liaison' && selectedDetailsBooking.vehicleDetails && (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mt-2 pt-2 border-t border-white/5 text-[10px] font-mono">
                                            <div className="bg-black/30 p-1.5 rounded border border-white/5">
                                                <p className="text-[8px] text-gray-500 uppercase font-sans font-bold">OR Number</p>
                                                <p className="text-gray-200 truncate font-bold">{selectedDetailsBooking.vehicleDetails.currentOrNumber || 'Pending / N/A'}</p>
                                            </div>
                                            <div className="bg-black/30 p-1.5 rounded border border-white/5">
                                                <p className="text-[8px] text-gray-500 uppercase font-sans font-bold">CR Number</p>
                                                <p className="text-gray-200 truncate font-bold">{selectedDetailsBooking.vehicleDetails.currentCrNumber || 'Pending / N/A'}</p>
                                            </div>
                                            <div className="bg-black/30 p-1.5 rounded border border-white/5">
                                                <p className="text-[8px] text-gray-500 uppercase font-sans font-bold">Engine No.</p>
                                                <p className="text-gray-200 truncate font-bold">{selectedDetailsBooking.vehicleDetails.engineNumber || 'N/A'}</p>
                                            </div>
                                            <div className="bg-black/30 p-1.5 rounded border border-white/5 col-span-2 sm:col-span-3">
                                                <p className="text-[8px] text-gray-500 uppercase font-sans font-bold">Chassis No.</p>
                                                <p className="text-gray-200 truncate font-bold">{selectedDetailsBooking.vehicleDetails.chassisNumber || 'N/A'}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Customer Details */}
                            <div className="bg-white/5 p-2.5 sm:p-3 rounded-xl border border-white/5 space-y-2">
                                <h4 className="text-gray-400 font-bold uppercase text-[9px] tracking-wider flex items-center justify-between">
                                    <span className="flex items-center gap-1.5">
                                        <User size={11} className="text-primary" />
                                        Customer Information
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
                                {selectedDetailsBooking.pickupLocation && (
                                    <div className="flex items-start gap-1.5 bg-black/30 p-1.5 rounded-lg border border-white/5 text-[11px]">
                                        <MapPin size={12} className="text-rose-400 shrink-0 mt-0.5" />
                                        <div className="min-w-0 flex-1">
                                            <span className="text-[9px] font-bold text-gray-400 uppercase mr-1">Pickup / Origin:</span>
                                            <span className="text-gray-200">{selectedDetailsBooking.pickupLocation}</span>
                                        </div>
                                    </div>
                                )}
                                {selectedDetailsBooking.dropoffLocation && (
                                    <div className="flex items-start gap-1.5 bg-black/30 p-1.5 rounded-lg border border-white/5 text-[11px]">
                                        <Compass size={12} className="text-cyan-400 shrink-0 mt-0.5" />
                                        <div className="min-w-0 flex-1">
                                            <span className="text-[9px] font-bold text-gray-400 uppercase mr-1">Return / Destination:</span>
                                            <span className="text-gray-200">{selectedDetailsBooking.dropoffLocation}</span>
                                        </div>
                                    </div>
                                )}
                                {selectedDetailsBooking.type === 'liaison' && (
                                    <div className="bg-black/30 p-2 rounded-lg border border-white/5 space-y-1 text-[11px]">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[9px] font-bold text-gray-400 uppercase">LTO Branch Office</span>
                                            <span className="text-primary font-bold">{selectedDetailsBooking.branchName || 'LTO District Office'}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[9px] font-bold text-gray-400 uppercase">Documents Pickup / Delivery</span>
                                            <span className="text-gray-200">{selectedDetailsBooking.pickupOption || 'Customer delivery'}</span>
                                        </div>
                                        {selectedDetailsBooking.pickupAddress && (
                                            <p className="text-[10px] text-gray-400 italic">Address: {selectedDetailsBooking.pickupAddress}</p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Specialist Details if present */}
                            {selectedDetailsBooking.specialistName && (
                                <div className="bg-gradient-to-r from-orange-500/10 via-[#18181B] to-white/5 p-2.5 sm:p-3 rounded-xl border border-orange-500/20 flex items-center justify-between gap-2.5">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-[#2A1C15] border border-white/10 flex items-center justify-center shrink-0">
                                            {selectedDetailsBooking.specialistImageUrl ? (
                                                <img 
                                                    src={selectedDetailsBooking.specialistImageUrl} 
                                                    alt={selectedDetailsBooking.specialistName} 
                                                    className="w-full h-full object-cover" 
                                                    onError={(e) => { (e.target as HTMLImageElement).src = '/riders-logo.png'; }}
                                                />
                                            ) : (
                                                <User size={16} className="text-primary" />
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-xs text-primary truncate">{selectedDetailsBooking.specialistName}</p>
                                            <p className="text-[10px] text-gray-400 truncate">{selectedDetailsBooking.specialistRole || 'Assigned Specialist'}</p>
                                        </div>
                                    </div>
                                    {selectedDetailsBooking.specialistPhone && (
                                        <a 
                                            href={`tel:${selectedDetailsBooking.specialistPhone}`}
                                            className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/20 transition-all shrink-0"
                                            title="Call Specialist"
                                        >
                                            <Phone size={13} />
                                        </a>
                                    )}
                                </div>
                            )}

                            {/* Financial Details */}
                            <div className="bg-gradient-to-br from-white/5 via-[#18181A] to-emerald-950/20 p-3 rounded-xl border border-emerald-500/20 space-y-2">
                                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                    <div className="flex items-center gap-2">
                                        <Receipt size={13} className="text-emerald-400" />
                                        <span className="text-gray-300 font-bold uppercase text-[9px] tracking-wider">Payment Status</span>
                                    </div>
                                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                                        {selectedDetailsBooking.paymentStatus}
                                    </span>
                                </div>

                                {selectedDetailsBooking.type === 'liaison' && (
                                    <div className="space-y-1 text-[11px] py-1 border-b border-white/5">
                                        <div className="flex justify-between text-gray-400">
                                            <span>LTO Liaison Professional Fee</span>
                                            <span className="font-mono text-gray-200">₱{(selectedDetailsBooking.serviceFee || selectedDetailsBooking.totalAmount || 0).toLocaleString()}</span>
                                        </div>
                                        {selectedDetailsBooking.governmentFee > 0 && (
                                            <div className="flex justify-between text-gray-400">
                                                <span>Estimated LTO Govt Fee / Assessment</span>
                                                <span className="font-mono text-gray-200">₱{(selectedDetailsBooking.governmentFee).toLocaleString()}</span>
                                            </div>
                                        )}
                                        {selectedDetailsBooking.pickupFee > 0 && (
                                            <div className="flex justify-between text-gray-400">
                                                <span>Document Door-to-Door Pickup</span>
                                                <span className="font-mono text-gray-200">₱{(selectedDetailsBooking.pickupFee).toLocaleString()}</span>
                                            </div>
                                        )}
                                        {selectedDetailsBooking.remainingBalance > 0 && (
                                            <div className="flex justify-between text-amber-400 font-bold pt-1">
                                                <span>Balance Payable Upon Release</span>
                                                <span className="font-mono">₱{(selectedDetailsBooking.remainingBalance).toLocaleString()}</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="flex items-center justify-between text-white font-bold text-xs sm:text-sm pt-1">
                                    <span className="font-sans font-black text-gray-200">Total Amount</span>
                                    <span className="text-white font-black">
                                        ₱{(selectedDetailsBooking.totalAmount || 0).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Modal Action Bar - Sticky Footer */}
                        <div className="shrink-0 pt-3 pb-1 border-t border-white/10 bg-[#141416] flex items-center justify-between gap-2">
                            {selectedDetailsBooking.type === 'liaison' ? (
                                <button
                                    onClick={() => {
                                        const bId = selectedDetailsBooking.id;
                                        const target = selectedDetailsBooking;
                                        setSelectedDetailsBooking(null);
                                        navigate(`/customer-portal/booking-detail/${bId}`, { state: { booking: target } });
                                    }}
                                    className="bg-primary hover:bg-[#e06800] text-white font-black py-2 px-3 sm:px-4 rounded-xl shadow-lg shadow-primary/20 transition-all text-xs flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
                                >
                                    <span>Track Live Status & Pay</span>
                                    <ArrowRight size={13} />
                                </button>
                            ) : (
                                <div />
                            )}
                            <button
                                onClick={() => setSelectedDetailsBooking(null)}
                                className="bg-white/10 hover:bg-white/20 text-white font-bold py-2 px-4 rounded-xl border border-white/10 transition-all text-xs cursor-pointer"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Review Modal */}
            <ReviewModal
                isOpen={isReviewModalOpen}
                onClose={() => setIsReviewModalOpen(false)}
                onSubmit={handleSubmitReview}
                existingReview={selectedBookingForReview?.review}
                isSubmitting={isSubmittingReview}
                mechanicName={
                    (selectedBookingForReview as any)?.driverStaff?.name ||
                    (selectedBookingForReview as any)?.driverName ||
                    selectedBookingForReview?.mechanicName ||
                    selectedBookingForReview?.mechanic?.name
                }
                mechanicImageUrl={
                    (selectedBookingForReview as any)?.driverStaff?.imageUrl ||
                    selectedBookingForReview?.mechanic?.imageUrl ||
                    selectedBookingForReview?.mechanic?.picture
                }
            />
        </div>
    );
};

export default BookingHistoryScreen;
