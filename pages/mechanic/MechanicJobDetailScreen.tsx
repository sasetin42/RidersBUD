import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import { useDatabase } from '../../context/DatabaseContext';
import { useMechanicAuth } from '../../context/MechanicAuthContext';
import Spinner from '../../components/Spinner';
import Tooltip from '../../components/ui/Tooltip';
import {
    MapPin, Phone, MessageSquare, Navigation, CheckCircle, Clock,
    Calendar, User, Car, Shield, ChevronRight, AlertCircle,
    ArrowRight, Map as MapIcon, Mail, Hash, Palette, Gauge,
    FileText, Wrench, DollarSign, Timer, Upload, X, Image as ImageIcon, Bell,
    CreditCard, Eye, Copy, ChevronDown, ChevronUp, Star, Info
} from 'lucide-react';
import { BookingStatus } from '../../types';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { ref, set } from 'firebase/database';
import { db as firestore, rtdb } from '../../firebase';
import MechanicCustomerChatModal from '../../components/mechanic/MechanicCustomerChatModal';
import DirectionsModal from '../../components/mechanic/DirectionsModal';
import { CallButton } from '../../components/CallUI';

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
        default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
};

declare const L: any;

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

const MechanicJobDetailScreen: React.FC = () => {
    const { bookingId } = useParams<{ bookingId: string }>();
    const navigate = useNavigate();
    const { db, updateBookingStatus, assignMechanicToBooking, addNotification } = useDatabase();

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
        return seqId;
    }, [db?.bookings, bookingId]);
    const { mechanic } = useMechanicAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [booking, setBooking] = useState<any>(null);
    const [customer, setCustomer] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'info' }>({ show: false, message: '', type: 'success' });

    const showToastNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => {
            setToast(prev => ({ ...prev, show: false }));
        }, 3500);
    };

    // Modal States
    const [showChatModal, setShowChatModal] = useState(false);
    const [showDirectionsModal, setShowDirectionsModal] = useState(false);
    const [showProgressModal, setShowProgressModal] = useState(false);
    const [showETAModal, setShowETAModal] = useState(false);
    const [showPaymentReminderModal, setShowPaymentReminderModal] = useState(false);
    const [showWorkDoneModal, setShowWorkDoneModal] = useState(false);
    const [showPaymentSuccessModal, setShowPaymentSuccessModal] = useState(false);
    const [confettiPieces, setConfettiPieces] = useState<any[]>([]);
    const [showCustomerDetails, setShowCustomerDetails] = useState(false);

    // Progress Report State
    const [progressReport, setProgressReport] = useState({ before: '', after: '', notes: '' });
    const [beforeImages, setBeforeImages] = useState<string[]>([]);
    const [afterImages, setAfterImages] = useState<string[]>([]);
    const [etaMinutes, setEtaMinutes] = useState(30);

    // Additional Costs State
    const [showAdditionalCostsModal, setShowAdditionalCostsModal] = useState(false);
    const [newCostDescription, setNewCostDescription] = useState('');
    const [newCostPrice, setNewCostPrice] = useState('');

    // Confetti Generator Effect
    useEffect(() => {
        if (showWorkDoneModal) {
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
    }, [showWorkDoneModal]);

    // Real-time location tracking for "En Route" status
    useEffect(() => {
        let watchId: number | null = null;

        if (booking?.status === 'En Route' && bookingId && 'geolocation' in navigator) {
            console.log('📡 Starting live location tracking for En Route status...');
            
            watchId = navigator.geolocation.watchPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    
                    // 1. Update RTDB for high-performance live tracking
                    const trackingRef = ref(rtdb, `tracking/${bookingId}/mechanicLocation`);
                    set(trackingRef, {
                        lat: latitude,
                        lng: longitude,
                        timestamp: Date.now()
                    });

                    // 2. Also update Firestore for persistence
                    const bookingDoc = doc(firestore, 'bookings', bookingId as string);
                    updateDoc(bookingDoc, {
                        mechanicLocation: {
                            lat: latitude,
                            lng: longitude,
                            lastUpdated: new Date().toISOString()
                        }
                    }).catch(() => {});
                },
                () => {},
                {
                    enableHighAccuracy: false,
                    maximumAge: 10000,
                    timeout: 30000
                }
            );
        }

        return () => {
            if (watchId !== null) {
                console.log('📡 Stopping live location tracking...');
                navigator.geolocation.clearWatch(watchId);
            }
        };
    }, [booking?.status, bookingId]);

    // Real-time Firestore listener for booking
    useEffect(() => {
        if (!bookingId) return;

        const bookingRef = doc(firestore, 'bookings', bookingId);
        const unsubscribe = onSnapshot(bookingRef, (docSnap) => {
            if (docSnap.exists()) {
                const bookingData: any = { id: docSnap.id, ...docSnap.data() };
                
                // Edge Case: Handle customer cancellation while mechanic is on page
                if (bookingData.status === 'Cancelled' && booking?.status !== 'Cancelled') {
                    alert('This booking has been cancelled by the customer.');
                    navigate('/mechanic/bookings');
                    return;
                }

                setBooking(bookingData);
                console.log('📋 Booking Data:', bookingData);

                // Fetch customer data if available
                if (bookingData?.customerId) {
                    console.log('🔍 Fetching customer with ID:', bookingData.customerId);
                    const customerRef = doc(firestore, 'customers', bookingData.customerId);
                    onSnapshot(customerRef, (customerSnap) => {
                        if (customerSnap.exists()) {
                            const customerData = { id: customerSnap.id, ...customerSnap.data() };
                            console.log('✅ Customer Data from Firestore:', customerData);
                            setCustomer(customerData);
                        } else {
                            console.warn('⚠️ Customer not found in Firestore, using booking data');
                            // Fallback: Extract customer info from booking data
                            const fallbackCustomer = {
                                id: bookingData.customerId,
                                name: bookingData.customerName,
                                phone: bookingData.customerPhone,
                                email: bookingData.customerEmail,
                                picture: bookingData.customerAvatar || bookingData.customerImage
                            };
                            console.log('📦 Fallback Customer Data:', fallbackCustomer);
                            setCustomer(fallbackCustomer);
                        }
                        setLoading(false);
                    });
                } else {
                    console.warn('⚠️ No customerId in booking, extracting from booking data');
                    // No customerId - extract directly from booking
                    const fallbackCustomer = {
                        id: 'unknown',
                        name: bookingData.customerName,
                        phone: bookingData.customerPhone || bookingData.phone,
                        email: bookingData.customerEmail || bookingData.email,
                        picture: bookingData.customerAvatar || bookingData.customerImage
                    };
                    console.log('📦 Fallback Customer Data (no ID):', fallbackCustomer);
                    setCustomer(fallbackCustomer);
                    setLoading(false);
                }
            } else {
                console.error('❌ Booking not found');
                setLoading(false);
            }
        }, (error) => {
            console.error('❌ Error fetching booking:', error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [bookingId]);

    if (loading || !booking) {
        return (
            <div className="flex flex-col h-full bg-[#0a0a0a]">
                <Header title="Job Details" showBack icon={<Wrench size={22} />} />
                <div className="flex-grow flex items-center justify-center">
                    <Spinner size="lg" />
                </div>
            </div>
        );
    }

    const steps: { status: BookingStatus; label: string; time?: string }[] = [
        { status: booking.status === 'Booking Confirmed' ? 'Booking Confirmed' : 'Upcoming', label: 'Booking Confirmed', time: booking.createdAt ? new Date(booking.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined },
        { status: 'Mechanic Assigned', label: 'Mechanic Assigned' },
        { status: 'En Route', label: 'En Route' },
        { status: 'In Progress', label: 'In Progress' },
        { status: 'Completed', label: 'Completed' },
    ];

    const currentStepIndex = steps.findIndex(s => s.status === booking.status);

    // Status color logic
    const getStatusColor = (status: BookingStatus) => {
        switch (status) {
            case 'Completed': return 'text-green-400 bg-green-500/10 border-green-500/20';
            case 'In Progress': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
            case 'En Route': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
            case 'Cancelled': return 'text-red-400 bg-red-500/10 border-red-500/20';
            default: return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
        }
    };

    const handleUpdateStatus = async (newStatus: BookingStatus) => {
        if (!booking || !mechanic) {
            console.error('❌ No booking or mechanic found');
            return;
        }

        setIsLoading(true);
        console.log(`➡️ Updating status to: ${newStatus}`);

        try {
            if (newStatus === 'Mechanic Assigned') {
                // Use the specific assignment function to ensure mechanic details are saved
                await assignMechanicToBooking(booking.id, mechanic);
                console.log('✅ Mechanic successfully assigned');
            } else {
                // Use the standard status update function for other states
                await updateBookingStatus(booking.id, newStatus);
                console.log('✅ Status successfully updated');
            }
        } catch (error) {
            console.error('❌ Error updating status:', error);
            alert(`Error updating status: ${(error as Error).message}`);
        } finally {
            setIsLoading(false);
        }
    };

    // Image compression and WebP conversion utility
    const compressAndConvertToWebP = async (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // Resize if too large (max 1200px on longest side)
                    const maxSize = 1200;
                    if (width > maxSize || height > maxSize) {
                        if (width > height) {
                            height = (height / width) * maxSize;
                            width = maxSize;
                        } else {
                            width = (width / height) * maxSize;
                            height = maxSize;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);

                    // Convert to WebP with quality 0.8
                    canvas.toBlob(
                        (blob) => {
                            if (blob) {
                                const reader = new FileReader();
                                reader.onloadend = () => resolve(reader.result as string);
                                reader.onerror = reject;
                                reader.readAsDataURL(blob);
                            } else {
                                reject(new Error('Failed to convert image'));
                            }
                        },
                        'image/webp',
                        0.8
                    );
                };
                img.onerror = reject;
                img.src = e.target?.result as string;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const handleImageUpload = async (files: FileList | null, type: 'before' | 'after') => {
        if (!files || files.length === 0) return;

        const imageArray = type === 'before' ? [...beforeImages] : [...afterImages];

        for (let i = 0; i < files.length; i++) {
            try {
                const webpDataUrl = await compressAndConvertToWebP(files[i]);
                imageArray.push(webpDataUrl);
            } catch (error) {
                console.error('Error processing image:', error);
            }
        }

        if (type === 'before') {
            setBeforeImages(imageArray);
        } else {
            setAfterImages(imageArray);
        }
    };

    const removeImage = (index: number, type: 'before' | 'after') => {
        if (type === 'before') {
            setBeforeImages(beforeImages.filter((_, i) => i !== index));
        } else {
            setAfterImages(afterImages.filter((_, i) => i !== index));
        }
    };

    const handleSaveProgress = async () => {
        if (!booking || !progressReport.before || !progressReport.after) return;
        setIsLoading(true);
        try {
            const bookingRef = doc(firestore, 'bookings', booking.id);
            const progressEntry = {
                timestamp: new Date().toISOString(),
                before: progressReport.before,
                after: progressReport.after,
                notes: progressReport.notes,
                beforeImages: beforeImages,
                afterImages: afterImages,
                mechanicId: mechanic?.id,
                mechanicName: mechanic?.name
            };

            await updateDoc(bookingRef, {
                progressHistory: [...(booking.progressHistory || []), progressEntry],
                updatedAt: new Date().toISOString()
            });

            setProgressReport({ before: '', after: '', notes: '' });
            setBeforeImages([]);
            setAfterImages([]);
            setShowProgressModal(false);
            console.log('✅ Progress report saved');
        } catch (error) {
            console.error('❌ Error saving progress:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateETA = async () => {
        if (!booking) return;
        setIsLoading(true);
        try {
            const bookingRef = doc(firestore, 'bookings', booking.id);
            await updateDoc(bookingRef, {
                eta: etaMinutes,
                etaUpdatedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            setShowETAModal(false);
            console.log('✅ ETA updated to:', etaMinutes, 'minutes');
        } catch (error) {
            console.error('❌ Error updating ETA:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveAdditionalCosts = async (updatedCosts: any[]) => {
        if (!booking) return;
        setIsLoading(true);
        try {
            const servicePrice = booking.service?.price || 0;
            const additionalTotal = updatedCosts.reduce((sum, cost) => sum + (Number(cost.price) || 0), 0);
            const newTotal = servicePrice + additionalTotal;

            const bookingRef = doc(firestore, 'bookings', booking.id);
            await updateDoc(bookingRef, {
                additionalCosts: updatedCosts,
                totalAmount: newTotal,
                updatedAt: new Date().toISOString()
            });

            console.log('✅ Additional costs updated. New total:', newTotal);
            
            // Notify customer about price change
            await addNotification({
                title: 'Booking Price Updated',
                message: `Additional costs have been added to your booking. New total: ${formatCurrency(newTotal)}`,
                recipientId: `customer-${booking.customerId}`,
                type: 'info',
                read: false,
                timestamp: Date.now(),
                link: `/customer-portal/booking-detail/${booking.id}`
            });

        } catch (error) {
            console.error('❌ Error updating additional costs:', error);
            alert('Failed to update costs. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddCost = () => {
        if (!newCostDescription || !newCostPrice) return;
        const price = parseFloat(newCostPrice);
        if (isNaN(price)) return;

        const currentCosts = booking.additionalCosts || [];
        const updatedCosts = [...currentCosts, {
            id: Date.now().toString(),
            description: newCostDescription,
            price: price
        }];

        handleSaveAdditionalCosts(updatedCosts);
        setNewCostDescription('');
        setNewCostPrice('');
    };

    const handleRemoveCost = (costId: string) => {
        const currentCosts = booking.additionalCosts || [];
        const updatedCosts = currentCosts.filter((c: any) => c.id !== costId);
        handleSaveAdditionalCosts(updatedCosts);
    };

    const handleProcessPayment = async () => {
        if (!booking) return;

        // Check payment status first
        const paymentStatus = booking.paymentStatus || 'pending';

        // If payment is not fully paid, show reminder modal instead
        if (paymentStatus !== 'paid') {
            setShowPaymentReminderModal(true);
            return;
        }

        // Payment is confirmed, proceed with completion (Set to Work Done for Escrow)
        setIsLoading(true);
        try {
            const bookingRef = doc(firestore, 'bookings', booking.id);
            await updateDoc(bookingRef, {
                status: 'Work Done', // Changed from 'Completed' for Escrow
                paymentStatus: 'Paid',
                paymentMethod: 'Cash',
                paidAt: new Date().toISOString(),
                workDoneAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

            console.log('✅ Work marked as done, awaiting customer confirmation');
            setShowWorkDoneModal(true);
        } catch (error) {
            console.error('❌ Error processing completion:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendPaymentReminder = async () => {
        if (!booking || !customer) return;
        setIsLoading(true);
        try {
            // Calculate remaining amount
            const totalAmount = booking.totalAmount || booking.service?.price || 0;
            const paidAmount = booking.paidAmount || 0;
            const remainingAmount = totalAmount - paidAmount;

            // Update booking in Firestore to awaiting_payment
            const bookingRef = doc(firestore, 'bookings', booking.id);
            await updateDoc(bookingRef, {
                gcashPaymentStatus: 'awaiting_payment',
                updatedAt: new Date().toISOString()
            });

            // Send notification to customer
            await addNotification({
                title: 'Payment Required',
                message: `Your mechanic has completed the service. Please pay the remaining balance of ₱${remainingAmount.toLocaleString()} to complete your booking.`,
                recipientId: `customer-${booking.customerId}`,
                type: 'payment',
                read: false,
                timestamp: Date.now(),
                link: `/customer-portal/booking-detail/${booking.id}`
            });

            showToastNotification('Payment reminder sent to customer successfully!', 'success');
            console.log('✅ Payment reminder sent to customer');
        } catch (error) {
            console.error('❌ Error sending payment reminder:', error);
            showToastNotification('Failed to send payment reminder. Please try again.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyBalancePayment = async () => {
        if (!booking) return;
        setIsLoading(true);
        try {
            const bookingRef = doc(firestore, 'bookings', booking.id);
            await updateDoc(bookingRef, {
                paymentStatus: 'paid',
                gcashPaymentStatus: 'verified',
                isPaid: true,
                status: 'Completed',
                paidAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

            // Notify customer
            await addNotification({
                title: 'Payment Verified',
                message: `Your mechanic has verified your remaining balance GCash payment. The booking is now Completed.`,
                recipientId: `customer-${booking.customerId}`,
                type: 'info',
                read: false,
                timestamp: Date.now(),
                link: `/customer-portal/booking-detail/${booking.id}`
            });

            setShowPaymentReminderModal(false);
            setShowPaymentSuccessModal(true);
        } catch (error) {
            console.error('❌ Error verifying balance payment:', error);
            alert('Failed to verify balance payment. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Actions
    const handleCall = () => {
        const phone = customer?.phone || booking.customerPhone;
        if (phone) {
            window.location.href = `tel:${phone}`;
        } else {
            alert('No phone number available for this customer.');
        }
    };


    const handleNavigation = () => {
        // Prefer customer location if available, otherwise just search
        if (customer?.lat && customer?.lng) {
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${customer.lat},${customer.lng}`, '_blank');
        } else if (booking.location?.address) {
            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.location.address)}`, '_blank');
        } else {
            alert('No location details available.');
        }
    };

    const handleDirectNavigation = () => {
        const lat = customer?.lat || booking.location?.lat;
        const lng = customer?.lng || booking.location?.lng;
        const address = booking.location?.address;

        if (lat && lng) {
            // Direct Google Maps navigation with coordinates
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
        } else if (address) {
            // Fallback to address search
            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
        } else {
            alert('Location information is not available for this booking.');
        }
    };


    const handleCopyId = () => {
        navigator.clipboard.writeText(booking.id);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex flex-col h-full bg-[#0a0a0a] text-white overflow-hidden font-sans">
            <Header title={`JOB #${bookingSequenceId || booking.id.slice(-6)}`} showBack icon={<Wrench size={22} />} />

            <main className="flex-grow overflow-y-auto p-4 space-y-4 pb-32">

                {/* Service & Work Details Card */}
                <div className="relative overflow-hidden rounded-[2rem] p-6 bg-[#121212] border border-primary/20 shadow-[0_8px_32px_rgba(0,0,0,0.3)] animate-slideInUp">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-16 translate-x-16 blur-2xl opacity-50" />
                    
                    <div className="relative z-10">
                        {/* Copyable full booking ID */}
                        <div className="flex items-center justify-between bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 mb-5 text-xs font-semibold">
                            <span className="text-gray-400 truncate mr-2">
                                Booking Ref: <span className="text-white font-mono select-all font-bold">{booking.id}</span>
                            </span>
                            <button 
                                onClick={handleCopyId} 
                                className="text-primary hover:text-white transition-colors flex items-center gap-1 active:scale-95 shrink-0"
                            >
                                {copied ? (
                                    <span className="text-[9px] bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Copied!</span>
                                ) : (
                                    <>
                                        <Copy size={13} />
                                        <span>Copy</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Top Row: Service Name and Price */}
                        <div className="mb-4">
                            <h2 className="text-[10px] font-bold tracking-widest text-gray-500 uppercase mb-2">Requested Works</h2>
                            {booking.services && booking.services.length > 0 ? (
                                <div className="space-y-2.5">
                                    {booking.services.map((svc: any, idx: number) => (
                                        <div key={svc.id || idx} className="flex justify-between items-center bg-black/30 p-3.5 rounded-2xl border border-white/5">
                                            <div className="min-w-0">
                                                <p className="text-sm font-black text-white leading-tight truncate">{svc.name}</p>
                                                {svc.estimatedTime && (
                                                    <p className="text-[10px] text-gray-500 font-bold tracking-tight mt-0.5 flex items-center gap-1">
                                                        <Timer size={10} className="text-blue-400" />
                                                        {svc.estimatedTime}
                                                    </p>
                                                )}
                                            </div>
                                            <span className="text-base font-black text-white shrink-0 ml-4">{formatCurrency(svc.price || 0)}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex justify-between items-center bg-black/30 p-3.5 rounded-2xl border border-white/5">
                                    <div className="min-w-0">
                                        <p className="text-sm font-black text-white leading-tight truncate">{booking.service?.name || 'Service'}</p>
                                        {booking.service?.estimatedTime && (
                                            <p className="text-[10px] text-gray-500 font-bold tracking-tight mt-0.5 flex items-center gap-1">
                                                <Timer size={10} className="text-blue-400" />
                                                {booking.service.estimatedTime}
                                            </p>
                                        )}
                                    </div>
                                    <span className="text-base font-black text-white shrink-0 ml-4">{formatCurrency(booking.service?.price || 0)}</span>
                                </div>
                            )}
                        </div>

                        {/* Bottom Row: Date, Time, Status Badge */}
                        <div className="flex items-center gap-2 flex-wrap pt-3 border-t border-white/[0.05]">
                            <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
                                <Calendar size={13} className="text-primary" />
                                <span className="text-xs font-bold text-gray-200">
                                    {new Date(booking.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
                                <Clock size={13} className="text-primary" />
                                <span className="text-xs font-bold text-gray-200">{booking.time}</span>
                            </div>
                            <div className={`px-3 py-1.5 rounded-xl text-[10px] font-black tracking-widest border shadow-lg shadow-black/20 ${getStatusColor(booking.status)}`}>
                                {booking.status}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Customer Request / Notes Section */}
                {booking.notes && (
                    <div className="bg-[#151515] rounded-[1.5rem] p-5 border border-white/5 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                        <h2 className="text-[10px] font-bold tracking-widest text-gray-500 mb-2.5 uppercase flex items-center gap-1.5 pl-1">
                            <FileText size={14} className="text-primary" />
                            Customer Request Notes
                        </h2>
                        <p className="text-xs text-gray-300 italic pl-1 leading-relaxed">
                            "{booking.notes}"
                        </p>
                    </div>
                )}

                {/* Payment Information Card */}
                {(booking.paymentMethod === 'GCash' || booking.paymentStatus === 'partial') && (
                    <div className="bg-[#151515] rounded-[1.5rem] p-5 border border-primary/20 shadow-[0_0_20px_rgba(249,115,22,0.1)] overflow-hidden relative group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full -translate-y-12 translate-x-12 blur-3xl opacity-50" />
                        <h2 className="text-[10px] font-bold tracking-widest text-primary mb-4 flex items-center justify-between relative z-10">
                            <span className="flex items-center gap-2">
                                <CreditCard size={14} />
                                GCash Downpayment Detail
                            </span>
                            {booking.paymentMethod === 'GCash' && (
                                <span className="bg-primary/20 text-primary px-2 py-0.5 rounded text-[8px] font-black shadow-sm">Secured via GCash</span>
                            )}
                        </h2>

                        <div className="space-y-4 relative z-10">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] text-gray-500 font-bold mb-1 tracking-tight">Downpayment Received</p>
                                    <p className="text-xl font-black text-white">₱{(booking.paidAmount || 0).toLocaleString()}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-gray-500 font-bold mb-1 tracking-tight">Remaining Balance</p>
                                    <p className="text-lg font-bold text-gray-400">₱{((booking.totalAmount || booking.service?.price || 0) - (booking.paidAmount || 0)).toLocaleString()}</p>
                                </div>
                            </div>

                            {booking.gcashReceiptUrl && (
                                <a 
                                    href={booking.gcashReceiptUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-3 w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-xl py-4 text-xs font-black tracking-widest leading-none transition-all group"
                                >
                                    <Eye size={16} className="group-hover:scale-110 transition-transform" />
                                    View GCash Receipt
                                </a>
                            )}

                            {booking.paymentStatus === 'partial' && booking.gcashPaymentStatus === 'balance_receipt_uploaded' && (
                                <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
                                    <p className="text-[10px] text-yellow-500 font-bold tracking-widest uppercase">Remaining Balance Receipt</p>
                                    {booking.gcashReceiptUrl && (
                                        <div className="rounded-xl overflow-hidden border border-white/10 bg-black/40 p-2">
                                            <img
                                                src={booking.gcashReceiptUrl}
                                                alt="GCash Balance Receipt"
                                                className="w-full h-auto max-h-48 object-contain cursor-pointer rounded-lg animate-fadeIn"
                                                onClick={() => window.open(booking.gcashReceiptUrl, '_blank')}
                                            />
                                            <p className="text-[9px] text-gray-500 text-center mt-2 font-bold">Tap image to view in new tab</p>
                                        </div>
                                    )}
                                    <button
                                        onClick={handleVerifyBalancePayment}
                                        disabled={isLoading}
                                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white py-3.5 rounded-xl font-black transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-500/20 text-xs tracking-widest uppercase flex items-center justify-center gap-2"
                                    >
                                        {isLoading ? 'Verifying...' : (
                                            <>
                                                <CheckCircle size={14} />
                                                Verify Balance Payment
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Upgraded Tactical Customer Hub */}
                <div className="bg-[#151515] rounded-[2rem] p-6 border border-white/5 shadow-2xl relative overflow-hidden transition-all hover:border-white/10 group">
                    <div className="absolute -right-20 -top-20 w-44 h-44 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>

                    <div className="flex items-center justify-between mb-4 relative z-10">
                        <h2 className="text-[10px] font-black tracking-widest text-primary uppercase flex items-center gap-2">
                            <User size={13} className="stroke-[2.5]" />
                            Customer Profile
                        </h2>
                        
                        {/* Live Sync Status indicator */}
                        <div className="flex items-center gap-1.5 bg-black/40 px-2 py-0.5 rounded-full border border-white/5">
                            <span className={`w-1.5 h-1.5 rounded-full ${customer?.isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></span>
                            <span className="text-[8px] font-black tracking-wider text-gray-400">
                                {customer?.isOnline ? 'LIVE SYNC' : 'OFFLINE'}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between relative z-10 mb-4">
                        <div className="flex items-center gap-4">
                            {/* Profile Image with Online Pulsing border */}
                            <div className="relative">
                                <div className="w-16 h-16 rounded-full bg-[#151515] border-2 border-primary/40 overflow-hidden flex-shrink-0 shadow-lg">
                                    <img
                                        src={customer?.picture || customer?.profileImage || customer?.imageUrl || customer?.photoUrl || booking?.customerAvatar || booking?.customerImage || '/riders-logo.png'}
                                        alt={customer?.name || booking.customerName}
                                        className="w-full h-full object-cover"
                                        onError={(e) => { (e.target as HTMLImageElement).src = '/riders-logo.png'; }}
                                    />
                                </div>
                                <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-[#151515] ${customer?.isOnline ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                            </div>

                            <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-black text-white tracking-tight leading-none">
                                        {customer?.name || booking.customerName || 'Customer'}
                                    </h3>
                                </div>
                                <div className="flex items-center gap-1.5 mt-1.5 text-xs text-yellow-500">
                                    <Star size={11} className="fill-yellow-500 stroke-yellow-500" />
                                    <span className="font-extrabold">4.9</span>
                                    <span className="text-gray-500 text-[10px] font-bold">
                                        ({db?.bookings?.filter(b => (b.customerId === customer?.id || b.customerName === customer?.name) && b.status === 'Completed').length || 1} completed)
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Tactical Action Bar */}
                        <div className="flex flex-col gap-2">
                            {customer?.id && (
                                <Tooltip content="Call Customer">
                                    <div className="flex items-center gap-1.5 px-3 py-2 bg-green-500/10 hover:bg-green-500 text-green-400 hover:text-white rounded-xl border border-green-500/20 hover:border-green-500 transition-all active:scale-95 shadow-md">
                                        <CallButton targetId={customer.id} targetRole="customer" targetName={customer.name || 'Customer'} targetImage={customer.picture} size="sm" className="!w-5 !h-5 !bg-transparent !border-0 !p-0 !text-inherit" />
                                        {customer?.phone && (
                                            <a href={`tel:${customer.phone}`} className="flex items-center gap-1">
                                                <span className="text-[10px] font-black tracking-wider whitespace-nowrap">Call</span>
                                            </a>
                                        )}
                                    </div>
                                </Tooltip>
                            )}
                            <Tooltip content="Live Chat">
                                <button
                                    onClick={() => setShowChatModal(true)}
                                    disabled={!customer || !mechanic}
                                    className="px-3 py-2 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-xl border border-primary/20 hover:border-primary transition-all active:scale-95 disabled:opacity-50 shadow-md flex items-center gap-1.5"
                                >
                                    <MessageSquare size={14} className="stroke-[2.5] shrink-0" />
                                    <span className="text-[10px] font-black tracking-wider whitespace-nowrap">Chat</span>
                                </button>
                            </Tooltip>
                        </div>
                    </div>

                    {/* Expandable Details Switcher */}
                    <button
                        onClick={() => setShowCustomerDetails(!showCustomerDetails)}
                        className="w-full flex items-center justify-between py-2 border-t border-white/5 text-[10px] font-black tracking-widest text-gray-500 hover:text-white uppercase transition-colors relative z-10"
                    >
                        <span>{showCustomerDetails ? 'Hide Customer Details' : 'View Detailed Profile'}</span>
                        {showCustomerDetails ? <ChevronUp size={12} className="stroke-[2.5]" /> : <ChevronDown size={12} className="stroke-[2.5]" />}
                    </button>

                    {/* Collapsible details pane */}
                    {showCustomerDetails && (
                        <div className="mt-4 pt-4 border-t border-white/5 space-y-3.5 relative z-10 text-xs animate-slideDown">
                            {/* Contact information details */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-black/35 p-3 rounded-2xl border border-white/5">
                                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">Direct Email</p>
                                    <a
                                        href={`mailto:${customer?.email || booking?.customerEmail || booking?.email || ''}`}
                                        className="text-white hover:text-primary transition-colors font-semibold truncate block"
                                    >
                                        {customer?.email || booking?.customerEmail || booking?.email || 'N/A'}
                                    </a>
                                </div>
                                <div className="bg-black/35 p-3 rounded-2xl border border-white/5">
                                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">Member Since</p>
                                    <p className="text-white font-semibold">
                                        {customer?.registrationDate 
                                            ? new Date(customer.registrationDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                                            : 'Oct 2025'}
                                    </p>
                                </div>
                            </div>

                            {/* Location / Address Drawer */}
                            <div className="bg-black/35 p-3 rounded-2xl border border-white/5">
                                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">Service Location</p>
                                <p className="text-gray-300 font-semibold leading-relaxed mb-2">
                                    {customer?.address || booking?.location?.address || 'No address specified'}
                                </p>
                                {customer?.lat != null && customer?.lng != null && (
                                    <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-bold tracking-wide mt-1">
                                        <Info size={11} className="text-primary" />
                                        <span>Coordinates: {(customer.lat || 0).toFixed(6)}, {(customer.lng || 0).toFixed(6)}</span>
                                        <span className="ml-auto text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded font-black text-[8px] uppercase animate-pulse">
                                            Live Tracker Enabled
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Preferred Payment Method */}
                            <div className="bg-black/35 p-3 rounded-2xl border border-white/5 flex justify-between items-center">
                                <div>
                                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Preferred Payment Method</p>
                                    <p className="text-white font-extrabold capitalize">{booking?.paymentMethod || 'GCash Payment'}</p>
                                </div>
                                <span className="text-[9px] bg-green-500/10 text-green-400 font-black border border-green-500/20 px-2 py-1 rounded-full uppercase tracking-wider">
                                    {booking?.gcashPaymentStatus === 'verified' || booking?.isVerified ? 'Pre-Paid' : 'Pending'}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Vehicle Information Card */}
                <div className="bg-[#151515] rounded-[1.5rem] p-5 border border-white/5">
                    <h2 className="text-[10px] font-bold  tracking-widest text-gray-500 mb-4 flex items-center gap-2">
                        <Car size={14} />
                        Vehicle Information
                    </h2>

                    <div className="flex items-start gap-4 mb-4">
                        <div className="w-32 h-24 rounded-xl bg-gradient-to-br from-white/5 to-white/10 border-2 border-white/20 overflow-hidden relative flex-shrink-0 group shadow-lg">
                            {(() => {
                                // Real-time vehicle image from customer garage
                                const vehicleImage =
                                    booking.vehicle?.image ||
                                    booking.vehicle?.imageUrl ||
                                    booking.vehicle?.imageUrls?.[0] ||
                                    customer?.garage?.find((v: any) => v.id === booking.vehicleId)?.image ||
                                    customer?.garage?.find((v: any) => v.id === booking.vehicleId)?.imageUrl ||
                                    customer?.garage?.find((v: any) => v.id === booking.vehicleId)?.imageUrls?.[0] ||
                                    customer?.garage?.find((v: any) => v.plateNumber === booking.vehicle?.plateNumber)?.image ||
                                    customer?.garage?.find((v: any) => v.plateNumber === booking.vehicle?.plateNumber)?.imageUrl ||
                                    customer?.garage?.find((v: any) => v.plateNumber === booking.vehicle?.plateNumber)?.imageUrls?.[0] ||
                                    customer?.vehicles?.find((v: any) => v.id === booking.vehicleId)?.imageUrl ||
                                    customer?.vehicles?.find((v: any) => v.id === booking.vehicleId)?.imageUrls?.[0] ||
                                    booking.vehicleImage ||
                                    booking.imageUrl;

                                return vehicleImage ? (
                                    <>
                                        <img
                                            src={vehicleImage}
                                            alt="Vehicle"
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                            onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                            }}
                                        />
                                        <div className="hidden w-full h-full flex items-center justify-center bg-gray-900">
                                            <img src="/assets/car_mockup.png" alt="Car Mockup" className="w-full h-full object-cover opacity-50" />
                                        </div>
                                        {/* Live sync indicator */}
                                        {(customer?.garage?.find((v: any) => v.id === booking.vehicleId)?.image ||
                                            customer?.garage?.find((v: any) => v.id === booking.vehicleId)?.imageUrl ||
                                            customer?.garage?.find((v: any) => v.id === booking.vehicleId)?.imageUrls?.[0] ||
                                            customer?.garage?.find((v: any) => v.plateNumber === booking.vehicle?.plateNumber)?.image ||
                                            customer?.garage?.find((v: any) => v.plateNumber === booking.vehicle?.plateNumber)?.imageUrl ||
                                            customer?.garage?.find((v: any) => v.plateNumber === booking.vehicle?.plateNumber)?.imageUrls?.[0]) && (
                                                <div className="absolute top-1 right-1 bg-green-500/90 text-white text-[6px] font-bold px-1.5 py-0.5 rounded-full  tracking-wide shadow-lg">
                                                    Live
                                                </div>
                                            )}
                                    </>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-900">
                                        <img src="/assets/car_mockup.png" alt="Car Mockup" className="w-full h-full object-cover opacity-50" />
                                    </div>
                                );
                            })()}
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white leading-tight">
                                {booking.vehicle?.year || booking.year || ''} {booking.vehicle?.make || booking.make || ''} {booking.vehicle?.model || booking.model || 'Unknown Vehicle'}
                            </h3>
                            <div className="flex items-center gap-1.5 mt-1.5">
                                <FileText size={12} className="text-primary" />
                                <span className="text-[10px] text-gray-400  tracking-wide font-medium">
                                    VIN: {booking.vehicle?.vin || booking.vin || booking.vehicleVin || 'N/A'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        {/* Specs Grid */}
                        <div className="grid grid-cols-2 gap-2 flex-1">
                            <div className="bg-black/30 rounded-xl p-2.5 border border-white/5 flex flex-col justify-center hover:border-white/10 transition-colors">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <Hash size={10} className="text-primary" />
                                    <span className="text-[9px] text-gray-500  font-semibold">Plate No.</span>
                                </div>
                                <p className="text-xs font-bold text-white tracking-wide">
                                    {booking.vehicle?.plateNumber || booking.plateNumber || 'N/A'}
                                </p>
                            </div>

                            <div className="bg-black/30 rounded-xl p-2.5 border border-white/5 flex flex-col justify-center hover:border-white/10 transition-colors">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <Palette size={10} className="text-primary" />
                                    <span className="text-[9px] text-gray-500  font-semibold">Color</span>
                                </div>
                                <p className="text-xs font-bold text-white capitalize">
                                    {booking.vehicle?.color || booking.color || 'N/A'}
                                </p>
                            </div>

                            <div className="bg-black/30 rounded-xl p-2.5 border border-white/5 flex flex-col justify-center hover:border-white/10 transition-colors">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <Gauge size={10} className="text-primary" />
                                    <span className="text-[9px] text-gray-500  font-semibold">Mileage</span>
                                </div>
                                <p className="text-xs font-bold text-white">
                                    {(booking.vehicle?.mileage || booking.mileage)
                                        ? `${(booking.vehicle?.mileage || booking.mileage).toLocaleString()} mi`
                                        : 'N/A'}
                                </p>
                            </div>

                            <div className="bg-black/30 rounded-xl p-2.5 border border-white/5 flex flex-col justify-center hover:border-white/10 transition-colors">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <Car size={10} className="text-primary" />
                                    <span className="text-[9px] text-gray-500  font-semibold">Vehicle Type</span>
                                </div>
                                <p className="text-xs font-bold text-white capitalize">
                                    {booking.vehicle?.type || booking.vehicleType || booking.type || 'Sedan'}
                                </p>
                            </div>
                        </div>

                        {/* PIN LOCATION - Interactive Google Maps Button */}
                        <button
                            onClick={handleDirectNavigation}
                            disabled={!(customer?.lat && customer?.lng) && !(booking.location?.lat && booking.location?.lng) && !booking.location?.address}
                            className="w-32 bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] rounded-xl border-2 border-primary/30 relative overflow-hidden flex-shrink-0 group cursor-pointer hover:border-primary hover:shadow-lg hover:shadow-primary/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:border-white/10"
                            title={(customer?.lat && customer?.lng) || (booking.location?.lat && booking.location?.lng) ? "Open in Google Maps" : "Location not available"}
                        >
                            {(customer?.lat && customer?.lng) || (booking.location?.lat && booking.location?.lng) ? (
                                <>
                                    {/* Interactive Mini Map */}
                                    <MiniMap
                                        lat={customer?.lat || booking.location?.lat}
                                        lng={customer?.lng || booking.location?.lng}
                                    />

                                    {/* Gradient Overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent"></div>

                                    {/* Content */}
                                    <div className="relative h-full flex flex-col items-center justify-center p-3 py-4">
                                        {/* Animated Pin Icon */}
                                        <div className="relative mb-2">
                                            <MapPin size={28} className="text-primary drop-shadow-[0_2px_8px_rgba(249,115,22,0.6)] animate-bounce" />
                                            <div className="absolute inset-0 bg-primary/30 blur-xl animate-pulse"></div>
                                        </div>

                                        {/* Label */}
                                        <span className="text-[10px] font-black text-center leading-tight text-white  tracking-wider drop-shadow-lg">
                                            PIN<br />LOCATION
                                        </span>

                                        {/* Status Badge */}
                                        <div className="mt-1.5 px-2 py-0.5 bg-green-500/20 border border-green-500/30 rounded-full">
                                        <span className="text-[7px] font-bold text-green-400  tracking-wide">
                                                {customer?.lat ? 'LIVE' : 'ACTIVE'}
                                            </span>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* Default Map Background */}
                                    <div 
                                        className="absolute inset-0 bg-cover bg-center opacity-20"
                                        style={{ 
                                            backgroundImage: "url('https://api.mapbox.com/styles/v1/mapbox/dark-v10/static/121.05,14.58,12,0/260x200?access_token=" + 
                                                "pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ." + 
                                                "0_vEybvOf6uclH6S3S3XJA')" 
                                        }}
                                    ></div>

                                    {/* Content */}
                                    <div className="relative h-full flex flex-col items-center justify-center p-3 py-4">
                                        <MapPin size={24} className="text-gray-500 mb-2" />
                                        <span className="text-[9px] font-bold text-center leading-tight text-gray-500  tracking-wide">
                                            Location<br />Unavailable
                                        </span>
                                    </div>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Bottom Section: Split Layout */}
                <div className="bg-[#151515] rounded-[1.5rem] p-5 border border-white/5 flex flex-col h-full min-h-[300px]">
                    <h2 className="text-[10px] font-bold  tracking-widest text-gray-500 mb-4 flex items-center gap-2">
                        <Clock size={14} />
                        Job Timeline
                    </h2>

                    <div className="flex gap-4 flex-grow">
                        {/* Timeline Column */}
                        <div className="w-[45%] relative pt-1 pb-1 flex flex-col justify-between">
                            <div className="absolute left-[9px] top-3 bottom-3 w-[2px] bg-white/5"></div>
                            {steps.map((step, idx) => {
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
                        <div className="flex-1 flex flex-col gap-2">
                            <button onClick={() => setShowChatModal(true)} className="w-full bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 flex items-center justify-center gap-2 py-3 text-primary transition-all">
                                <MessageSquare size={16} />
                                <span className="text-[10px] font-black tracking-wider whitespace-nowrap">Live Chat</span>
                            </button>
                            <button onClick={handleCall} className="w-full bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 flex items-center justify-center gap-2 py-3 text-primary transition-all">
                                <Phone size={16} />
                                <span className="text-[10px] font-black tracking-wider whitespace-nowrap">Call</span>
                            </button>

                            <button
                                onClick={() => {
                                    console.log('🖱️ Update Status button clicked!');
                                    console.log('📊 Current status:', booking.status);

                                    if (booking.status === 'Upcoming' || booking.status === 'Booking Confirmed') {
                                        console.log('➡️ Updating to: Mechanic Assigned');
                                        handleUpdateStatus('Mechanic Assigned');
                                    }
                                    else if (booking.status === 'Mechanic Assigned') {
                                        console.log('➡️ Updating to: En Route');
                                        handleUpdateStatus('En Route');
                                    }
                                    else if (booking.status === 'En Route') {
                                        console.log('➡️ Updating to: In Progress');
                                        handleUpdateStatus('In Progress');
                                    }
                                    else if (booking.status === 'In Progress') {
                                        console.log('⚠️ Cannot complete job directly - use PROCESS PAYMENT & COMPLETE button instead');
                                        alert('Please use the "PROCESS PAYMENT & COMPLETE" button to finish this job.');
                                    }
                                    else {
                                        console.log('⚠️ Unknown status:', booking.status);
                                        alert(`Current status "${booking.status}" is not handled`);
                                    }
                                }}
                                disabled={isLoading || booking.status === 'Completed' || booking.status === 'In Progress'}
                                className="w-full bg-primary hover:bg-orange-600 rounded-xl flex flex-row items-center justify-center gap-3 shadow-lg shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[60px] p-2"
                            >
                                {isLoading ? <Spinner size="sm" color="text-white" /> : (
                                    <>
                                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                                            <CheckCircle size={16} className="text-white" />
                                        </div>
                                        <div className="flex flex-col items-start leading-none">
                                            <span className="text-xs font-black tracking-wider text-left whitespace-nowrap">
                                                {(booking.status === 'Upcoming' || booking.status === 'Booking Confirmed') && 'Accept Job'}
                                                {booking.status === 'Mechanic Assigned' && 'Start Travel'}
                                                {booking.status === 'En Route' && 'Arrived'}
                                                {booking.status === 'In Progress' && 'Complete Job'}
                                                {booking.status === 'Completed' && 'Completed'}
                                                {!['Upcoming', 'Booking Confirmed', 'Mechanic Assigned', 'En Route', 'In Progress', 'Completed'].includes(booking.status) && 'Update Status'}
                                            </span>
                                        </div>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Action Buttons Row */}
                    <div className="grid grid-cols-3 gap-2 mt-4">
                        <button
                            onClick={() => setShowProgressModal(true)}
                            disabled={booking.status !== 'In Progress'}
                            className="bg-[#1E1E1E] border border-white/10 hover:bg-[#252525] text-gray-300 hover:text-white py-3 rounded-xl text-[9px] font-bold  tracking-widest flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <FileText size={14} />
                            Progress
                        </button>
                        <button
                            onClick={() => setShowAdditionalCostsModal(true)}
                            disabled={booking.status !== 'In Progress'}
                            className="bg-[#1E1E1E] border border-white/10 hover:bg-[#252525] text-gray-300 hover:text-white py-3 rounded-xl text-[9px] font-bold  tracking-widest flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <DollarSign size={14} />
                            Costs
                        </button>
                        <button
                            onClick={() => setShowETAModal(true)}
                            disabled={['In Progress', 'Completed', 'Cancelled'].includes(booking.status)}
                            className="bg-[#1E1E1E] border border-white/10 hover:bg-[#252525] text-gray-300 hover:text-white py-3 rounded-xl text-[9px] font-bold  tracking-widest flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <Timer size={14} />
                            ETA
                        </button>
                    </div>

                    {/* Payment Button - Large and Prominent */}
                    {booking.status === 'In Progress' && (
                        <button
                            onClick={handleProcessPayment}
                            disabled={isLoading}
                            className="w-full mt-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white py-5 rounded-2xl text-base font-black  tracking-wider flex items-center justify-center gap-3 transition-all shadow-2xl shadow-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <DollarSign size={28} className="animate-pulse" />
                            <span>Process Payment & Complete</span>
                        </button>
                    )}
                </div>
            </main>

            {/* Modals */}
            {showChatModal && customer && mechanic && (
                <MechanicCustomerChatModal
                    booking={booking}
                    customer={customer}
                    mechanic={mechanic}
                    onClose={() => setShowChatModal(false)}
                />
            )}

            {showDirectionsModal && customer && (
                <DirectionsModal
                    booking={booking}
                    customer={customer}
                    onClose={() => setShowDirectionsModal(false)}
                />
            )}

            {/* ETA Update Modal */}
            {showETAModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fadeIn">
                    <div className="bg-[#1A1A1A] rounded-2xl p-6 max-w-md w-full border border-white/10 shadow-2xl animate-scaleUp">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <Timer className="text-primary" />
                            Update ETA
                        </h3>
                        <p className="text-gray-400 text-sm mb-4">Set estimated time of arrival in minutes</p>
                        <input
                            type="number"
                            value={etaMinutes}
                            onChange={(e) => setEtaMinutes(Number(e.target.value))}
                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-center text-2xl font-bold mb-6 focus:outline-none"
                            min="1"
                            max="180"
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowETAModal(false)}
                                className="flex-1 bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl font-bold transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdateETA}
                                disabled={isLoading}
                                className="flex-1 bg-primary hover:bg-orange-600 text-white py-3 rounded-xl font-bold transition-all disabled:opacity-50"
                            >
                                {isLoading ? 'Updating...' : 'Update'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Progress Report Modal */}
            {showProgressModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-start sm:items-center justify-center p-4 animate-fadeIn overflow-y-auto">
                    <div className="bg-[#1A1A1A] rounded-2xl p-6 max-w-lg w-full border border-white/10 shadow-2xl animate-scaleUp my-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <FileText className="text-primary" />
                            Progress Report
                        </h3>
                        <p className="text-gray-400 text-sm mb-6">Document the work accomplished</p>

                        <div className="space-y-4">
                            {/* Text Input Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-white font-bold text-sm mb-2 block">Before (Issue/Problem)</label>
                                    <textarea
                                        value={progressReport.before}
                                        onChange={(e) => setProgressReport({ ...progressReport, before: e.target.value })}
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white resize-none outline-none transition-all focus:border-white/20 text-sm"
                                        rows={4}
                                        placeholder="Describe the initial condition..."
                                    />
                                </div>
                                <div>
                                    <label className="text-white font-bold text-sm mb-2 block">After (Solution/Fix)</label>
                                    <textarea
                                        value={progressReport.after}
                                        onChange={(e) => setProgressReport({ ...progressReport, after: e.target.value })}
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white resize-none outline-none transition-all focus:border-white/20 text-sm"
                                        rows={4}
                                        placeholder="Describe what was done..."
                                    />
                                </div>
                            </div>

                            {/* Image Upload Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Before Images Upload */}
                                <div>
                                    <label className="text-white font-bold text-sm mb-2 block flex items-center gap-2">
                                        <ImageIcon size={16} className="text-red-400" />
                                        Before Photos
                                    </label>
                                    <div className="space-y-2">
                                        <label className="w-full bg-black/30 border-2 border-dashed border-white/20 hover:border-primary/50 rounded-xl px-2 py-4 flex flex-col items-center justify-center cursor-pointer transition-all group h-32">
                                            <Upload size={20} className="text-gray-400 group-hover:text-primary mb-1" />
                                            <span className="text-xs text-center text-gray-400 group-hover:text-white">Upload Images</span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                multiple
                                                onChange={(e) => handleImageUpload(e.target.files, 'before')}
                                                className="hidden"
                                            />
                                        </label>
                                        {beforeImages.length > 0 && (
                                            <div className="grid grid-cols-3 gap-1">
                                                {beforeImages.map((img, idx) => (
                                                    <div key={idx} className="relative group">
                                                        <img src={img} alt={`Before ${idx + 1}`} className="w-full h-16 object-cover rounded border border-white/10" />
                                                        <button
                                                            onClick={() => removeImage(idx, 'before')}
                                                            className="absolute top-0 right-0 bg-red-500 hover:bg-red-600 text-white rounded-bl p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <X size={10} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* After Images Upload */}
                                <div>
                                    <label className="text-white font-bold text-sm mb-2 block flex items-center gap-2">
                                        <ImageIcon size={16} className="text-green-400" />
                                        After Photos
                                    </label>
                                    <div className="space-y-2">
                                        <label className="w-full bg-black/30 border-2 border-dashed border-white/20 hover:border-primary/50 rounded-xl px-2 py-4 flex flex-col items-center justify-center cursor-pointer transition-all group h-32">
                                            <Upload size={20} className="text-gray-400 group-hover:text-primary mb-1" />
                                            <span className="text-xs text-center text-gray-400 group-hover:text-white">Upload Images</span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                multiple
                                                onChange={(e) => handleImageUpload(e.target.files, 'after')}
                                                className="hidden"
                                            />
                                        </label>
                                        {afterImages.length > 0 && (
                                            <div className="grid grid-cols-3 gap-1">
                                                {afterImages.map((img, idx) => (
                                                    <div key={idx} className="relative group">
                                                        <img src={img} alt={`After ${idx + 1}`} className="w-full h-16 object-cover rounded border border-white/10" />
                                                        <button
                                                            onClick={() => removeImage(idx, 'after')}
                                                            className="absolute top-0 right-0 bg-red-500 hover:bg-red-600 text-white rounded-bl p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <X size={10} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Notes - Full Width */}
                            <div>
                                <label className="text-white font-bold text-sm mb-2 block">Additional Notes</label>
                                <textarea
                                    value={progressReport.notes}
                                    onChange={(e) => setProgressReport({ ...progressReport, notes: e.target.value })}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white resize-none outline-none transition-all focus:border-white/20 text-xs"
                                    rows={2}
                                    placeholder="Any additional details..."
                                />
                            </div>
                        </div>

                        {/* Progress History */}
                        {booking.progressHistory && booking.progressHistory.length > 0 && (
                            <div className="mt-6 pt-6 border-t border-white/10">
                                <h4 className="text-white font-bold text-sm mb-3">Previous Reports</h4>
                                <div className="space-y-3 max-h-96 overflow-y-auto">
                                    {booking.progressHistory.map((entry: any, idx: number) => (
                                        <div key={idx} className="bg-black/30 rounded-lg p-3 border border-white/5">
                                            <div className="text-[10px] text-gray-500 mb-2">
                                                {new Date(entry.timestamp).toLocaleString()}
                                            </div>
                                            <div className="text-xs space-y-2">
                                                <p><span className="text-red-400 font-bold">Before:</span> <span className="text-gray-300">{entry.before}</span></p>
                                                <p><span className="text-green-400 font-bold">After:</span> <span className="text-gray-300">{entry.after}</span></p>
                                                {entry.notes && <p className="text-gray-400">{entry.notes}</p>}

                                                {/* Before Images */}
                                                {entry.beforeImages && entry.beforeImages.length > 0 && (
                                                    <div>
                                                        <p className="text-red-400 font-bold mb-1">Before Photos:</p>
                                                        <div className="grid grid-cols-3 gap-1">
                                                            {entry.beforeImages.map((img: string, imgIdx: number) => (
                                                                <img key={imgIdx} src={img} alt={`Before ${imgIdx + 1}`} className="w-full h-16 object-cover rounded border border-white/10" />
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* After Images */}
                                                {entry.afterImages && entry.afterImages.length > 0 && (
                                                    <div>
                                                        <p className="text-green-400 font-bold mb-1">After Photos:</p>
                                                        <div className="grid grid-cols-3 gap-1">
                                                            {entry.afterImages.map((img: string, imgIdx: number) => (
                                                                <img key={imgIdx} src={img} alt={`After ${imgIdx + 1}`} className="w-full h-16 object-cover rounded border border-white/10" />
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowProgressModal(false)}
                                className="flex-1 bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl font-bold transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveProgress}
                                disabled={isLoading || !progressReport.before || !progressReport.after}
                                className="flex-1 bg-primary hover:bg-orange-600 text-white py-3 rounded-xl font-bold transition-all disabled:opacity-50"
                            >
                                {isLoading ? 'Saving...' : 'Save Report'}
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* Payment Reminder Modal - Shown when customer hasn't paid */}
            {showPaymentReminderModal && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-3 animate-fadeIn">
                    <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-2xl p-4 max-w-sm w-full border-2 border-yellow-500/30 shadow-2xl shadow-yellow-500/10 animate-scaleUp">
                        {booking.gcashPaymentStatus === 'awaiting_payment' ? (
                            /* Awaiting Payment Screen */
                            <div>
                                {/* Header */}
                                <div className="flex flex-col items-center text-center gap-3 mb-4">
                                    <div className="w-16 h-16 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-full flex items-center justify-center relative">
                                        <div className="absolute inset-0 bg-yellow-500/20 rounded-full animate-ping"></div>
                                        <Clock size={32} className="text-yellow-400 animate-pulse" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-white leading-tight">
                                            Awaiting Final Payment
                                        </h3>
                                        <p className="text-gray-400 text-xs mt-1 leading-relaxed">
                                            The payment request notification has been sent. Waiting for the customer to confirm and upload the remaining balance receipt. This screen updates in real-time.
                                        </p>
                                    </div>
                                </div>

                                {/* Pricing Breakdown */}
                                <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-3 mb-4 space-y-1.5 text-xs">
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Total Amount:</span>
                                        <span className="text-white font-bold">{formatCurrency(booking.totalAmount || booking.service?.price || 0)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Paid Amount:</span>
                                        <span className="text-green-400 font-bold">{formatCurrency(booking.paidAmount || 0)}</span>
                                    </div>
                                    <div className="flex justify-between pt-1.5 border-t border-yellow-500/20">
                                        <span className="text-white font-bold">Remaining:</span>
                                        <span className="text-yellow-400 font-black text-sm">
                                            {formatCurrency((booking.totalAmount || booking.service?.price || 0) - (booking.paidAmount || 0))}
                                        </span>
                                    </div>
                                </div>

                                {/* Close Button */}
                                <button
                                    onClick={() => setShowPaymentReminderModal(false)}
                                    className="w-full bg-white/5 hover:bg-white/10 active:bg-white/15 text-white py-2.5 rounded-xl font-bold transition-all border border-white/10 text-xs tracking-wide"
                                >
                                    Close
                                </button>
                            </div>
                        ) : booking.gcashPaymentStatus === 'balance_receipt_uploaded' ? (
                            /* Verification Screen */
                            <div>
                                {/* Header */}
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                                        <CheckCircle size={20} className="text-green-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black text-white leading-tight">
                                            Verify Final Payment
                                        </h3>
                                        <p className="text-gray-400 text-xs">
                                            The customer has uploaded the final payment receipt. Please review and verify to complete the job.
                                        </p>
                                    </div>
                                </div>

                                {/* GCash receipt preview image */}
                                {booking.gcashReceiptUrl && (
                                    <div className="rounded-xl overflow-hidden border border-white/10 bg-black/40 p-2 mb-4">
                                        <img
                                            src={booking.gcashReceiptUrl}
                                            alt="GCash Balance Receipt"
                                            className="w-full h-auto max-h-48 object-contain cursor-pointer rounded-lg animate-fadeIn"
                                            onClick={() => window.open(booking.gcashReceiptUrl, '_blank')}
                                        />
                                        <p className="text-[9px] text-gray-500 text-center mt-2 font-bold">Tap image to view in new tab</p>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowPaymentReminderModal(false)}
                                        className="flex-1 bg-white/5 hover:bg-white/10 active:bg-white/15 text-white py-2.5 rounded-xl font-bold transition-all border border-white/10 text-xs tracking-wide"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleVerifyBalancePayment}
                                        disabled={isLoading}
                                        className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white py-2.5 rounded-xl font-black transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-500/20 text-xs tracking-wide flex items-center justify-center gap-1.5"
                                    >
                                        {isLoading ? (
                                            <>
                                                <Spinner size="sm" color="text-white" />
                                                Verifying...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle size={13} />
                                                Verify Balance Payment
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* Default / Pre-notification Screen */
                            <div>
                                {/* Header */}
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-full flex items-center justify-center flex-shrink-0 relative">
                                        <div className="absolute inset-0 bg-yellow-500/20 rounded-full animate-ping"></div>
                                        <AlertCircle size={20} className="text-yellow-400 relative z-10" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black text-white leading-tight">
                                            {booking.paymentMethod === 'GCash' ? 'GCash Verification' : 'Payment Required'}
                                        </h3>
                                        <p className="text-gray-400 text-xs">
                                            {booking.paymentMethod === 'GCash' ? 'Please verify the GCash receipt' : 'Customer must complete payment first'}
                                        </p>
                                    </div>
                                </div>

                                {/* Payment Status */}
                                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 mb-3">
                                    <div className="flex items-start gap-2">
                                        <DollarSign className="text-yellow-400 flex-shrink-0 mt-0.5" size={15} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-yellow-400 font-bold text-xs mb-1.5">Payment Status ({booking.paymentMethod || 'Cash'})</p>
                                            <div className="space-y-1 text-xs">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-400">Total Amount:</span>
                                                    <span className="text-white font-bold">{formatCurrency(booking.totalAmount || booking.service?.price || 0)}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-400">{booking.paymentMethod === 'GCash' ? 'Paid via GCash:' : 'Paid (Deposit):'}</span>
                                                    <span className="text-green-400 font-bold">{formatCurrency(booking.paidAmount || 0)}</span>
                                                </div>
                                                {booking.paymentMethod === 'GCash' && booking.gcashReference && (
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-400">GCash Ref:</span>
                                                        <span className="text-white font-mono font-bold truncate max-w-[120px]">{booking.gcashReference}</span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between pt-1.5 border-t border-yellow-500/20">
                                                    <span className="text-white font-bold">Remaining:</span>
                                                    <span className="text-yellow-400 font-black text-sm">
                                                        {formatCurrency((booking.totalAmount || booking.service?.price || 0) - (booking.paidAmount || 0))}
                                                    </span>
                                                </div>
                                            </div>

                                            {booking.paymentMethod === 'GCash' && booking.gcashReceiptUrl && (
                                                <div className="mt-2 rounded-lg border border-white/10 overflow-hidden bg-black/40">
                                                    <img
                                                        src={booking.gcashReceiptUrl}
                                                        alt="GCash Receipt"
                                                        className="w-full h-auto max-h-28 object-contain cursor-pointer"
                                                        onClick={() => window.open(booking.gcashReceiptUrl, '_blank')}
                                                    />
                                                    <p className="text-[8px] text-gray-500 text-center py-0.5 font-bold bg-black/60">Tap to enlarge receipt</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Info Message */}
                                <div className="bg-white/5 rounded-lg p-2.5 mb-3">
                                    <p className="text-gray-300 text-[11px] leading-relaxed">
                                        The customer needs to pay the <strong className="text-white">remaining balance</strong> before you can mark this booking as completed.
                                        You can send a payment reminder notification to the customer.
                                    </p>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowPaymentReminderModal(false)}
                                        className="flex-1 bg-white/5 hover:bg-white/10 active:bg-white/15 text-white py-2.5 rounded-xl font-bold transition-all border border-white/10 text-xs tracking-wide"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => {
                                            handleSendPaymentReminder();
                                        }}
                                        disabled={isLoading}
                                        className="flex-1 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white py-2.5 rounded-xl font-black transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-yellow-500/20 text-xs tracking-wide flex items-center justify-center gap-1.5"
                                    >
                                        {isLoading ? (
                                            <>
                                                <Spinner size="sm" color="text-white" />
                                                Sending...
                                            </>
                                        ) : (
                                            <>
                                                <Bell size={13} />
                                                Notify Customer
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}


            {/* Additional Costs Modal */}
            {showAdditionalCostsModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fadeIn">
                    <div className="bg-[#1A1A1A] rounded-2xl p-6 max-w-md w-full border border-white/10 shadow-2xl animate-scaleUp">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <DollarSign className="text-primary" />
                                Additional Costs
                            </h3>
                            <button 
                                onClick={() => setShowAdditionalCostsModal(false)}
                                className="text-gray-400 hover:text-white"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Add New Cost Form */}
                        <div className="space-y-4 mb-6 bg-black/30 p-4 rounded-xl border border-white/5">
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Add New Item</h4>
                            <div className="space-y-3">
                                <input
                                    type="text"
                                    placeholder="Item description (e.g., Brake Pads)"
                                    value={newCostDescription}
                                    onChange={(e) => setNewCostDescription(e.target.value)}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-primary/50 transition-all"
                                />
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">₱</span>
                                        <input
                                            type="number"
                                            placeholder="Price"
                                            value={newCostPrice}
                                            onChange={(e) => setNewCostPrice(e.target.value)}
                                            className="w-full bg-black/50 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-white text-sm outline-none focus:border-primary/50 transition-all"
                                        />
                                    </div>
                                    <button
                                        onClick={handleAddCost}
                                        disabled={isLoading || !newCostDescription || !newCostPrice}
                                        className="bg-primary hover:bg-orange-600 text-white px-6 rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center"
                                    >
                                        Add
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Costs List */}
                        <div className="space-y-3 max-h-60 overflow-y-auto mb-6 pr-2 custom-scrollbar">
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Itemized List</h4>
                            <div className="flex justify-between items-center text-xs py-2 px-3 bg-white/5 rounded-lg border border-white/5">
                                <span className="text-gray-400">Base Service Fee</span>
                                <span className="text-white font-bold">{formatCurrency(booking.service?.price || 0)}</span>
                            </div>
                            
                            {booking.additionalCosts && booking.additionalCosts.length > 0 ? (
                                booking.additionalCosts.map((cost: any) => (
                                    <div key={cost.id} className="flex justify-between items-center text-sm py-2 px-3 bg-black/20 rounded-lg group border border-white/5">
                                        <div className="flex flex-col">
                                            <span className="text-white font-medium">{cost.description}</span>
                                            <span className="text-primary font-bold text-xs">{formatCurrency(cost.price)}</span>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveCost(cost.id)}
                                            className="text-red-500 p-2 hover:bg-red-500/10 rounded-lg transition-all"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-gray-600 text-xs py-4">No additional costs added yet.</p>
                            )}
                        </div>

                        {/* Summary */}
                        <div className="border-t border-white/10 pt-4 mb-6">
                            <div className="flex justify-between items-center">
                                <span className="text-white font-bold">Total Job Cost</span>
                                <span className="text-green-400 font-black text-2xl">
                                    {formatCurrency(booking.totalAmount || booking.service?.price || 0)}
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowAdditionalCostsModal(false)}
                            className="w-full bg-white/5 hover:bg-white/10 text-white py-4 rounded-xl font-bold transition-all border border-white/10"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}

            {/* Custom Work Done Success celebration modal with confetti */}
            {showWorkDoneModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in text-center">
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
                        {/* Animated Checkmark Circle */}
                        <div className="mx-auto w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20 mb-6 animate-checkmark-pulse">
                            <CheckCircle size={44} className="text-emerald-400" />
                        </div>

                        {/* Title & Announcement */}
                        <h3 className="text-2xl font-black text-white tracking-tight mb-2">
                            Job Marked as Done!
                        </h3>
                        <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                            Awaiting customer confirmation to release the payment. The customer has been notified immediately.
                        </p>

                        {/* Booking Summary Box */}
                        {booking && (
                            <div className="bg-white/5 rounded-2xl border border-white/5 p-4 mb-6 text-left space-y-3">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-500 font-bold uppercase tracking-wider">Service Type</span>
                                    <span className="text-white font-semibold">{booking.service?.name || 'Motorcycle Repair'}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-500 font-bold uppercase tracking-wider">Vehicle</span>
                                    <span className="text-white font-semibold">
                                        {booking.vehicle?.year || booking.year || ''} {booking.vehicle?.make || booking.make || ''} {booking.vehicle?.model || booking.model || 'Vehicle'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-500 font-bold uppercase tracking-wider">Payment Method</span>
                                    <span className="text-primary font-bold uppercase">{booking.paymentMethod || 'Cash'}</span>
                                </div>
                                <div className="border-t border-white/5 pt-3 flex justify-between items-center">
                                    <span className="text-white font-bold text-sm">Total Price</span>
                                    <span className="text-emerald-400 font-black text-lg">
                                        {formatCurrency(booking.totalAmount || booking.service?.price || 0)}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <button
                            onClick={() => {
                                setShowWorkDoneModal(false);
                                navigate('/mechanic-portal/dashboard');
                            }}
                            className="w-full py-4 rounded-xl font-bold bg-[#FE7803] hover:bg-[#e06902] text-white transition-all shadow-lg shadow-orange-500/10 hover:shadow-orange-500/20 active:scale-[0.98]"
                        >
                            Got it, Close
                        </button>
                    </div>
                </div>
            )}

            {/* Custom Payment Success Modal */}
            {showPaymentSuccessModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in text-center">
                    <div className="relative w-full max-w-md bg-[#171617] rounded-3xl p-6 border border-white/10 shadow-2xl animate-modal-scale-up z-20 text-center">
                        {/* Animated Checkmark Circle */}
                        <div className="mx-auto w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20 mb-6 animate-checkmark-pulse">
                            <CheckCircle size={44} className="text-emerald-400" />
                        </div>

                        {/* Title & Announcement */}
                        <h3 className="text-2xl font-black text-white tracking-tight mb-2">
                            Payment Verified Successfully!
                        </h3>
                        <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                            The remaining balance has been verified and confirmed.
                        </p>

                        {/* Booking Summary Box */}
                        {booking && (
                            <div className="bg-white/5 rounded-2xl border border-white/5 p-4 mb-6 text-left space-y-3">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-500 font-bold uppercase tracking-wider">Booking ID</span>
                                    <span className="text-white font-mono font-semibold">{booking.id}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-500 font-bold uppercase tracking-wider">Service Type</span>
                                    <span className="text-white font-semibold">{booking.service?.name || 'Motorcycle Repair'}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-500 font-bold uppercase tracking-wider">Vehicle</span>
                                    <span className="text-white font-semibold">
                                        {booking.vehicle?.year || booking.year || ''} {booking.vehicle?.make || booking.make || ''} {booking.vehicle?.model || booking.model || 'Vehicle'}
                                    </span>
                                </div>
                                <div className="border-t border-white/5 pt-3 space-y-2">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-400">Total Paid</span>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-white font-bold">{formatCurrency(booking.totalAmount || booking.service?.price || 0)}</span>
                                            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider border border-emerald-500/30">fully paid</span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-400">Remaining Balance</span>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-emerald-400 font-bold">₱0</span>
                                            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider border border-emerald-500/30">Settled</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Action Button */}
                        <button
                            onClick={() => {
                                setShowPaymentSuccessModal(false);
                            }}
                            className="w-full py-4 rounded-xl font-bold bg-[#FE7803] hover:bg-[#e06902] text-white transition-all shadow-lg shadow-orange-500/10 hover:shadow-orange-500/20 active:scale-[0.98]"
                        >
                            Got it, Close
                        </button>
                    </div>
                </div>
            )}

            {/* Custom Toast Notification */}
            {toast.show && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] animate-toast-in-up">
                    <div className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border ${
                        toast.type === 'success'
                            ? 'bg-[#14C856]/10 border-[#14C856]/20 text-[#14C856]'
                            : toast.type === 'error'
                            ? 'bg-red-500/10 border-red-500/20 text-red-400'
                            : 'bg-primary/10 border-primary/20 text-primary'
                    }`}>
                        {toast.type === 'success' ? (
                            <div className="w-5 h-5 bg-[#14C856]/20 rounded-full flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                        ) : toast.type === 'error' ? (
                            <div className="w-5 h-5 bg-red-500/20 rounded-full flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                        ) : (
                            <div className="w-5 h-5 bg-primary/20 rounded-full flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        )}
                        <span className="font-bold text-xs leading-none tracking-wide text-white">{toast.message}</span>
                    </div>
                </div>
            )}
        </div >
    );
};

export default MechanicJobDetailScreen;
