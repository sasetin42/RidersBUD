import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import NotificationBell from '../../components/NotificationBell';
import { useDatabase } from '../../context/DatabaseContext';
import { useMechanicAuth } from '../../context/MechanicAuthContext';
import Spinner from '../../components/Spinner';
import Tooltip from '../../components/ui/Tooltip';
import {
    MapPin, Phone, MessageSquare, Navigation, CheckCircle, Clock,
    Calendar, User, Car, Shield, ChevronRight, AlertCircle,
    ArrowRight, Map as MapIcon, Mail, Hash, Palette, Gauge,
    FileText, Wrench, DollarSign, Timer, Upload, X, Image as ImageIcon, Bell,
    CreditCard, Eye, Copy, ChevronDown, ChevronUp, Star, Info, ExternalLink
} from 'lucide-react';
import { BookingStatus } from '../../types';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { ref, set } from 'firebase/database';
import { db as firestore, rtdb } from '../../firebase';
import MechanicCustomerChatModal from '../../components/mechanic/MechanicCustomerChatModal';
import DirectionsModal from '../../components/mechanic/DirectionsModal';
import LiveRouteMapModal from '../../components/LiveRouteMapModal';
import { CallButton } from '../../components/CallUI';
import { getFallbackImageForCategory } from '../../utils/fallbackImages';
import { useCall } from '../../context/CallContext';
import { Geolocation } from '@capacitor/geolocation';
import { safeGetCurrentPosition, safeWatchPosition, safeClearWatch, isGeolocationPermissionDenied } from '../../utils/locationHelper';
import { getJobTotalAmount, getJobMechanicShare } from '../../utils/mechanicLedger';

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

const MechanicJobDetailScreen: React.FC = () => {
    const { bookingId } = useParams<{ bookingId: string }>();
    const navigate = useNavigate();
    const { db, updateBookingStatus, assignMechanicToBooking, addNotification, updateBooking } = useDatabase();
    const { startCall, callStatus } = useCall();

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
    const [showLiveRouteModal, setShowLiveRouteModal] = useState(false);
    const [mechanicCurrentLocation, setMechanicCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [showProgressModal, setShowProgressModal] = useState(false);
    const [showETAModal, setShowETAModal] = useState(false);
    const [showPaymentReminderModal, setShowPaymentReminderModal] = useState(false);
    const [showWorkDoneModal, setShowWorkDoneModal] = useState(false);
    const [showPaymentSuccessModal, setShowPaymentSuccessModal] = useState(false);
    const [confettiPieces, setConfettiPieces] = useState<any[]>([]);
    const [showCustomerDetails, setShowCustomerDetails] = useState(false);
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [activeReceiptTab, setActiveReceiptTab] = useState<'downpayment' | 'balance'>('downpayment');

    // Progress Report State
    const [progressReport, setProgressReport] = useState({ before: '', after: '', notes: '' });
    const [beforeImages, setBeforeImages] = useState<string[]>([]);
    const [afterImages, setAfterImages] = useState<string[]>([]);
    const [etaMinutes, setEtaMinutes] = useState(20);
    const [etaNote, setEtaNote] = useState('');

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
        let nativeWatchId: string | null = null;
        let webWatchId: number | null = null;

        const isNative = (window as any).Capacitor !== undefined;

        // Fetch immediate initial location with graceful fallback
        isGeolocationPermissionDenied().then(isDenied => {
            if (isDenied) return;

            if (isNative) {
                Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 5000 })
                    .then((pos) => {
                        if (pos?.coords) {
                            setMechanicCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                        }
                    })
                    .catch(() => {});
            } else {
                safeGetCurrentPosition(
                    (pos) => setMechanicCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                    () => {},
                    { enableHighAccuracy: true, timeout: 5000 }
                );
            }
        });

        if (booking?.status === 'En Route' && bookingId) {
            let lastReportedAccuracy = 999;
            const handleSuccess = (lat: number, lng: number, accuracy?: number) => {
                // If reading accuracy is severely degraded (> 45m) and we already have a reliable fix, suppress jitter
                if (typeof accuracy === 'number' && accuracy > 45 && lastReportedAccuracy <= 30) {
                    return;
                }
                if (typeof accuracy === 'number') {
                    lastReportedAccuracy = accuracy;
                }

                setMechanicCurrentLocation({ lat, lng });

                // 1. Update RTDB for high-performance live tracking
                const trackingRef = ref(rtdb, `tracking/${bookingId}/mechanicLocation`);
                set(trackingRef, {
                    lat,
                    lng,
                    accuracy: typeof accuracy === 'number' ? accuracy : null,
                    timestamp: Date.now()
                }).catch(() => {});

                // 2. Also update Firestore for persistence
                const bookingDoc = doc(firestore, 'bookings', bookingId as string);
                updateDoc(bookingDoc, {
                    mechanicLocation: {
                        lat,
                        lng,
                        accuracy: typeof accuracy === 'number' ? accuracy : null,
                        lastUpdated: new Date().toISOString()
                    }
                }).catch(() => {});
            };

            isGeolocationPermissionDenied().then(isDenied => {
                if (isDenied) return;

                if (isNative) {
                    Geolocation.watchPosition(
                        { enableHighAccuracy: true, timeout: 10000, maximumAge: 3000 },
                        (position) => {
                            if (position) {
                                handleSuccess(position.coords.latitude, position.coords.longitude, position.coords.accuracy);
                            }
                        }
                    ).then((id) => {
                        nativeWatchId = id;
                    }).catch(() => {
                        safeWatchPosition(
                            (position) => handleSuccess(position.coords.latitude, position.coords.longitude, position.coords.accuracy),
                            () => {},
                            { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
                        ).then(id => {
                            webWatchId = id;
                        });
                    });
                } else {
                    safeWatchPosition(
                        (position) => handleSuccess(position.coords.latitude, position.coords.longitude, position.coords.accuracy),
                        () => {},
                        { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
                    ).then(id => {
                        webWatchId = id;
                    });
                }
            });
        }

        return () => {
            if (nativeWatchId !== null) {
                Geolocation.clearWatch({ id: nativeWatchId }).catch(() => {});
            }
            if (webWatchId !== null) {
                safeClearWatch(webWatchId);
            }
        };
    }, [booking?.status, bookingId]);

    // Real-time Firestore listener for booking with fallback to db context
    useEffect(() => {
        if (!bookingId) return;

        const populateCustomer = (bData: any) => {
            if (bData?.customerId) {
                const customerRef = doc(firestore, 'customers', bData.customerId);
                onSnapshot(customerRef, (customerSnap) => {
                    if (customerSnap.exists()) {
                        setCustomer({ id: customerSnap.id, ...customerSnap.data() });
                    } else {
                        setCustomer({
                            id: bData.customerId,
                            name: bData.customerName,
                            phone: bData.customerPhone,
                            email: bData.customerEmail,
                            picture: bData.customerAvatar || bData.customerImage
                        });
                    }
                    setLoading(false);
                }, () => {
                    setCustomer({
                        id: bData.customerId,
                        name: bData.customerName,
                        phone: bData.customerPhone,
                        email: bData.customerEmail,
                        picture: bData.customerAvatar || bData.customerImage
                    });
                    setLoading(false);
                });
            } else {
                setCustomer({
                    id: 'unknown',
                    name: bData.customerName,
                    phone: bData.customerPhone || bData.phone,
                    email: bData.customerEmail || bData.email,
                    picture: bData.customerAvatar || bData.customerImage
                });
                setLoading(false);
            }
        };

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
                populateCustomer(bookingData);
            } else {
                // Check memory/db context fallback before marking not found
                const fallbackBooking = db?.bookings?.find((b: any) => b.id === bookingId);
                if (fallbackBooking) {
                    setBooking(fallbackBooking);
                    populateCustomer(fallbackBooking);
                } else {
                    setBooking(null);
                    setLoading(false);
                }
            }
        }, () => {
            const fallbackBooking = db?.bookings?.find((b: any) => b.id === bookingId);
            if (fallbackBooking) {
                setBooking(fallbackBooking);
                populateCustomer(fallbackBooking);
            } else {
                setBooking(null);
                setLoading(false);
            }
        });

        return () => { try { unsubscribe(); } catch (_) {} };
    }, [bookingId, db?.bookings]);

    if (loading) {
        return (
            <div className="flex flex-col h-full bg-[#0a0a0a]">
                <Header title="Job Details" showBack rightAction={<NotificationBell />} icon={<Wrench size={22} />} />
                <div className="flex-grow flex items-center justify-center">
                    <Spinner size="lg" />
                </div>
            </div>
        );
    }

    if (!booking) {
        return (
            <div className="flex flex-col h-full bg-[#0a0a0a] text-white">
                <Header title="Job Details" showBack rightAction={<NotificationBell />} icon={<Wrench size={22} />} />
                <div className="flex-grow flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4 border border-red-500/20">
                        <Calendar size={28} className="text-red-500" />
                    </div>
                    <h3 className="text-white font-extrabold text-lg">Job Not Found</h3>
                    <p className="text-xs text-gray-400 mt-2 max-w-xs leading-relaxed">
                        We couldn't find this booking. It may have been completed, cancelled, or re-assigned.
                    </p>
                    <button
                        onClick={() => navigate('/mechanic-portal/dashboard', { replace: true })}
                        className="mt-6 bg-primary hover:bg-primary/90 text-black font-black text-xs px-6 py-3 rounded-2xl transition shadow-lg shadow-primary/10 hover:scale-105 duration-200"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const getStepTime = (status: string) => {
        if (status === 'Booking Confirmed' || status === 'Upcoming') {
            const entry = booking.statusHistory?.find((h: any) => h.status === 'Booking Confirmed' || h.status === 'Upcoming' || h.status === 'Pending');
            if (entry) return new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return booking.createdAt ? new Date(booking.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined;
        }
        if (status === 'Completed') {
            const entry = booking.statusHistory?.find((h: any) => h.status === 'Completed' || h.status === 'Work Done');
            if (entry) return new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return booking.completedAt ? new Date(booking.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined;
        }
        const entry = booking.statusHistory?.find((h: any) => h.status === status);
        return entry ? new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined;
    };

    const steps: { status: BookingStatus; label: string; time?: string }[] = [
        { status: booking.status === 'Booking Confirmed' ? 'Booking Confirmed' : 'Upcoming', label: 'Booking Confirmed', time: getStepTime('Booking Confirmed') },
        { status: 'Mechanic Assigned', label: 'Mechanic Assigned', time: getStepTime('Mechanic Assigned') },
        { status: 'En Route', label: 'En Route', time: getStepTime('En Route') },
        { status: 'In Progress', label: 'In Progress', time: getStepTime('In Progress') },
        { status: 'Completed', label: 'Completed', time: getStepTime('Completed') },
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

            await updateBooking(booking.id, {
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
            const formattedEta = etaMinutes < 1 ? 'Arriving now' : `${etaMinutes} mins away`;
            const payload: any = {
                eta: formattedEta,
                etaMinutes: etaMinutes,
                etaUpdatedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            if (etaNote.trim()) {
                payload.etaNote = etaNote.trim();
            }

            await updateBooking(booking.id, payload);

            // Notify Customer in real-time
            if (booking.customerId || customer?.id) {
                const noteSuffix = etaNote.trim() ? ` (${etaNote.trim()})` : '';
                await addNotification({
                    title: '🚗 Mechanic ETA Updated',
                    message: `${mechanic?.name || 'Your mechanic'} updated arrival time: ${formattedEta}${noteSuffix}.`,
                    recipientId: `customer-${booking.customerId || customer?.id}`,
                    type: 'info',
                    read: false,
                    timestamp: Date.now(),
                    link: `/customer-portal/booking-detail/${booking.id}`
                });
            }

            showToastNotification(`ETA updated to ${formattedEta} and customer notified!`, 'success');
            setShowETAModal(false);
            console.log('✅ ETA updated to:', formattedEta, 'with note:', etaNote);
        } catch (error) {
            console.error('❌ Error updating ETA:', error);
            showToastNotification('Failed to update ETA. Please try again.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveAdditionalCosts = async (updatedCosts: any[]) => {
        if (!booking) return;
        setIsLoading(true);
        try {
            const servicePrice = booking.services && booking.services.length > 0
                ? booking.services.reduce((sum: number, svc: any) => sum + (Number(svc.price) || 0), 0)
                : (booking.service?.price || 0);
            const additionalTotal = updatedCosts.reduce((sum, cost) => sum + (Number(cost.price) || 0), 0);
            const newTotal = servicePrice + additionalTotal;

            await updateBooking(booking.id, {
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
            item: newCostDescription, // Support both Admin ('item') and Customer ('description')
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
            await updateBooking(booking.id, {
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
            await updateBooking(booking.id, {
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
            await updateBooking(booking.id, {
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

    const handleCall = () => {
        if (customer && callStatus === 'idle') {
            startCall({
                targetId: customer.id || booking.customerId || 'support-customer',
                targetRole: 'customer',
                targetName: customer.name || booking.customerName || 'Customer',
                targetImage: customer.picture || customer.imageUrl || booking.customerImage,
                type: 'audio'
            });
        } else if (callStatus !== 'idle') {
            alert('A call is already active.');
        } else {
            alert('No customer information available to start a call.');
        }
    };


    const handleNavigation = () => {
        const lat = booking.location?.lat || customer?.lat;
        const lng = booking.location?.lng || customer?.lng;
        if (lat && lng) {
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
        } else if (booking.location?.address || customer?.address) {
            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.location?.address || customer?.address || '')}`, '_blank');
        } else {
            alert('No location details available.');
        }
    };

    const handleDirectNavigation = () => {
        const lat = booking.location?.lat || customer?.lat;
        const lng = booking.location?.lng || customer?.lng;
        const address = booking.location?.address || customer?.address;

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
            <Header title={`JOB #${bookingSequenceId || booking.id.slice(-6)}`} showBack rightAction={<NotificationBell />} icon={<Wrench size={22} />} />

            <main className="flex-grow overflow-y-auto p-4 space-y-4 pb-32">

                {/* Service & Work Details Card */}
                <div className="relative overflow-hidden rounded-[2rem] p-6 bg-[#121212] border border-primary/20 shadow-[0_8px_32px_rgba(0,0,0,0.3)] animate-slideInUp">
                    {/* Background image overlay */}
                    {(() => {
                        const serviceImg = booking.services?.[0]?.imageUrl || booking.service?.imageUrl || getFallbackImageForCategory(booking.services?.[0]?.category || booking.service?.category || '');
                        return (
                            <div className="absolute inset-0 z-0 opacity-[0.07] pointer-events-none">
                                <img 
                                    src={serviceImg} 
                                    alt="" 
                                    className="w-full h-full object-cover filter blur-[1px]" 
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = getFallbackImageForCategory(booking.services?.[0]?.category || booking.service?.category || '');
                                    }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-[#121212]/80" />
                            </div>
                        );
                    })()}
                    
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
                                        <div key={svc.id || idx} className="flex justify-between items-center bg-black/35 p-3.5 rounded-2xl border border-white/5">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-10 h-10 rounded-full bg-[#1A1A1D] border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                                                    {svc.imageUrl || svc.image ? (
                                                        <img src={svc.imageUrl || svc.image} alt={svc.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Wrench size={16} className="text-gray-500" />
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-black text-white leading-tight truncate">{svc.name}</p>
                                                    {svc.estimatedTime && (
                                                        <p className="text-[10px] text-gray-500 font-bold tracking-tight mt-0.5 flex items-center gap-1">
                                                            <Timer size={10} className="text-blue-400" />
                                                            {svc.estimatedTime}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <span className="text-base font-black text-white shrink-0 ml-4">{formatCurrency(svc.price || 0)}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex justify-between items-center bg-black/35 p-3.5 rounded-2xl border border-white/5">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-10 h-10 rounded-full bg-[#1A1A1D] border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                                            {booking.service?.imageUrl || booking.service?.image ? (
                                                <img src={booking.service?.imageUrl || booking.service?.image} alt={booking.service?.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <Wrench size={16} className="text-gray-500" />
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-black text-white leading-tight truncate">{booking.service?.name || 'Service'}</p>
                                            {booking.service?.estimatedTime && (
                                                <p className="text-[10px] text-gray-500 font-bold tracking-tight mt-0.5 flex items-center gap-1">
                                                    <Timer size={10} className="text-blue-400" />
                                                    {booking.service.estimatedTime}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <span className="text-base font-black text-white shrink-0 ml-4">{formatCurrency(booking.service?.price || 0)}</span>
                                </div>
                            )}
                        </div>

                        {/* Bottom Row: Date, Time, Status Badge */}
                        <div className="flex items-center justify-between gap-1.5 pt-3 border-t border-white/[0.05] overflow-x-auto no-scrollbar flex-nowrap">
                            <div className="flex items-center gap-1 bg-white/5 px-2.5 py-1.5 rounded-xl border border-white/5 flex-shrink-0">
                                <Calendar size={11} className="text-primary" />
                                <span className="text-[10px] font-bold text-gray-200">
                                    {new Date(booking.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                            </div>
                            <div className="flex items-center gap-1 bg-white/5 px-2.5 py-1.5 rounded-xl border border-white/5 flex-shrink-0">
                                <Clock size={11} className="text-primary" />
                                <span className="text-[10px] font-bold text-gray-200">{booking.time}</span>
                            </div>
                            <div className={`px-2.5 py-1.5 rounded-xl text-[9px] font-black tracking-widest border shadow-lg shadow-black/20 flex-shrink-0 ${getStatusColor(booking.status)}`}>
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
                {(booking.paymentMethod?.includes('HitPay') || booking.paymentMethod === 'GCash' || booking.paymentStatus === 'partial' || booking.paymentStatus === 'downpayment_paid' || booking.isVerified || (booking.paidAmount && booking.paidAmount > 0)) && (
                    <div className="bg-[#151515] rounded-[1.5rem] p-5 border border-white/5 relative overflow-hidden group hover:border-white/10 transition-all shadow-xl">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-12 translate-x-12 blur-3xl pointer-events-none" />
                        
                        <div className="flex items-center justify-between mb-4 relative z-10">
                            <h2 className="text-[11px] font-black tracking-widest text-primary uppercase flex items-center gap-2">
                                <CreditCard size={14} className="text-primary" />
                                Payment Details
                            </h2>
                            <div className="flex items-center gap-1.5">
                                {(booking.paymentStatus === 'paid' || booking.isPaid) && (
                                    <span className="bg-emerald-500/15 text-emerald-400 px-2.5 py-1 rounded-full text-[9px] font-black border border-emerald-500/30 flex items-center gap-1 shadow-sm">
                                        <CheckCircle size={10} />
                                        Fully Paid
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="space-y-3.5 relative z-10">
                            {/* Reference Information Grid */}
                            <div className="p-3.5 bg-black/40 border border-white/5 rounded-2xl space-y-2 text-[11px]">
                                <div className="flex flex-wrap sm:flex-nowrap justify-between items-center gap-1">
                                    <span className="text-gray-400 font-medium shrink-0">Gateway / Method:</span>
                                    <span className="text-white font-bold tracking-wide text-right">{booking.paymentMethod || 'HitPay (Online)'}</span>
                                </div>
                                {(booking.downpaymentRef || booking.hitpayReference || booking.gcashDownpaymentReference || booking.gcashReference) && (
                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1.5 pt-1 border-t border-white/5">
                                        <span className="text-gray-400 font-medium shrink-0">Reference No:</span>
                                        <div className="flex items-center justify-between sm:justify-end gap-1.5 min-w-0 w-full sm:w-auto bg-white/[0.02] sm:bg-transparent p-1.5 sm:p-0 rounded-xl sm:rounded-none">
                                            <span className="text-primary font-mono font-bold text-[10px] sm:text-[11px] truncate max-w-[200px] sm:max-w-[240px]">
                                                {booking.downpaymentRef || booking.hitpayReference || booking.gcashDownpaymentReference || booking.gcashReference}
                                            </span>
                                            <button
                                                onClick={() => {
                                                    const refNo = booking.downpaymentRef || booking.hitpayReference || booking.gcashDownpaymentReference || booking.gcashReference;
                                                    if (refNo) {
                                                        navigator.clipboard.writeText(refNo);
                                                        alert('Reference number copied!');
                                                    }
                                                }}
                                                className="p-1.5 hover:bg-white/10 active:scale-95 rounded-lg text-gray-400 hover:text-white transition-all shrink-0"
                                                title="Copy Reference"
                                            >
                                                <Copy size={12} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {booking.downpaymentPaidAt && (
                                    <div className="flex flex-wrap sm:flex-nowrap justify-between items-center gap-1 pt-1 border-t border-white/5">
                                        <span className="text-gray-400 font-medium shrink-0">Paid Timestamp:</span>
                                        <span className="text-gray-300 font-medium font-mono text-[10px] sm:text-[11px] text-right">
                                            {new Date(booking.downpaymentPaidAt).toLocaleString()}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Payment Summary Cards */}
                            {(() => {
                                const totalRevenue = getJobTotalAmount(booking);
                                const isJobCompleted = booking.status === 'Completed' || booking.paymentStatus === 'paid' || booking.isPaid === true;

                                if (isJobCompleted) {
                                    return (
                                        <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-black/40 border border-emerald-500/25 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                                                    <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-emerald-400 truncate">
                                                        Total Amount Services (Kabuuan)
                                                    </p>
                                                </div>
                                                <p className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                                                    ₱{totalRevenue.toLocaleString()}
                                                </p>
                                                <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">
                                                    Buong serbisyo ay bayad na (Fully Settled)
                                                </p>
                                            </div>
                                            <div className="sm:text-right shrink-0">
                                                <span className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm">
                                                    <CheckCircle size={13} className="text-emerald-400 shrink-0" />
                                                    <span>100% Paid</span>
                                                </span>
                                            </div>
                                        </div>
                                    );
                                }

                                const initialDeposit = booking.paidAmount || (totalRevenue > 0 ? totalRevenue * 0.5 : 0);
                                const remainingBalance = Math.max(0, totalRevenue - initialDeposit);

                                return (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                        <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-2xl p-3.5 flex flex-col justify-center">
                                            <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-emerald-400/80 mb-1">50% Initial DP Paid</p>
                                            <p className="text-xl sm:text-2xl font-black text-white tracking-tight">₱{initialDeposit.toLocaleString()}</p>
                                        </div>
                                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3.5 flex flex-col justify-center text-left sm:text-right">
                                            <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Remaining Balance</p>
                                            <p className="text-xl sm:text-2xl font-black text-primary tracking-tight">₱{remainingBalance.toLocaleString()}</p>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Layman's Terms Payment Breakdown for Mechanic */}
                            {(() => {
                                const totalRevenue = getJobTotalAmount(booking);
                                const serviceFeePct = db?.settings?.serviceFeePercentage ?? 30;
                                const mechanicTakeHome = getJobMechanicShare(booking, serviceFeePct);
                                const adminCommission = Math.max(0, totalRevenue - mechanicTakeHome);
                                const mechanicPct = 100 - serviceFeePct;
                                const isJobCompleted = booking.status === 'Completed' || booking.paymentStatus === 'paid' || booking.isPaid === true;

                                return (
                                    <div className="p-4 sm:p-5 bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/10 rounded-2xl space-y-3.5 shadow-md">
                                        <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 pb-2.5 border-b border-white/10">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="w-7 h-7 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                                                    ₱
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-black text-white tracking-wide uppercase truncate">Payment Terms Breakdown</p>
                                                    <p className="text-[10px] text-gray-400 leading-tight">Malinaw na hatian sa bayad ng serbisyo</p>
                                                </div>
                                            </div>
                                            <span className="self-start xs:self-auto text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-primary/20 text-primary border border-primary/30 shrink-0">
                                                {mechanicPct}% / {serviceFeePct}% Share
                                            </span>
                                        </div>

                                        <div className="space-y-2.5 text-xs sm:text-[13px]">
                                            <div className="flex justify-between items-center gap-2 text-gray-300">
                                                <div className="flex flex-wrap items-baseline gap-x-1.5 min-w-0">
                                                    <span className="font-medium">Customer Total Paid</span>
                                                    <span className="text-[10px] sm:text-xs text-gray-500">(Kabuuang Bayad)</span>
                                                </div>
                                                <span className="font-black text-white tracking-tight shrink-0">
                                                    ₱{totalRevenue.toLocaleString()}
                                                </span>
                                            </div>

                                            <div className="flex justify-between items-center gap-2 text-red-400/90">
                                                <div className="flex flex-wrap items-baseline gap-x-1.5 min-w-0">
                                                    <span className="font-medium">Admin Platform Fee ({serviceFeePct}%)</span>
                                                    <span className="text-[10px] sm:text-xs text-red-500/70">(Bawas ng App)</span>
                                                </div>
                                                <span className="font-black tracking-tight shrink-0">
                                                    - ₱{adminCommission.toLocaleString()}
                                                </span>
                                            </div>

                                            <div className="pt-3 border-t border-dashed border-white/10 flex justify-between items-center gap-2">
                                                <div className="min-w-0">
                                                    <p className="text-xs sm:text-sm font-black text-emerald-400 uppercase tracking-wide">
                                                        Your Take-Home Pay ({mechanicPct}%)
                                                    </p>
                                                    <p className="text-[10px] text-gray-400 font-medium leading-tight mt-0.5">
                                                        {isJobCompleted ? 'Pumasok na sa iyong Wallet' : 'Iyong maiuuwi at papasok sa Wallet'}
                                                    </p>
                                                </div>
                                                <p className="text-lg sm:text-xl font-black text-emerald-400 tracking-tight shrink-0">
                                                    ₱{mechanicTakeHome.toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {booking.gcashReceiptUrl && (
                                <button 
                                    onClick={() => setShowReceiptModal(true)}
                                    className="flex items-center justify-center gap-3 w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-xl py-4 text-xs font-black tracking-widest leading-none transition-all group"
                                >
                                    <Eye size={16} className="group-hover:scale-110 transition-transform" />
                                    View GCash Receipt
                                </button>
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
                                    <h3 className="text-[12px] font-black text-white tracking-tight leading-none">
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
                            {customer && (
                                <Tooltip content="Call Customer">
                                    <button
                                        onClick={handleCall}
                                        disabled={callStatus !== 'idle'}
                                        className="flex items-center gap-1.5 px-3 py-2 bg-green-500/10 hover:bg-green-500 text-green-400 hover:text-white rounded-xl border border-green-500/20 hover:border-green-500 transition-all active:scale-95 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Phone size={14} className="stroke-[2.5] shrink-0" />
                                        <span className="text-[10px] font-black tracking-wider whitespace-nowrap">Call</span>
                                    </button>
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
                                    {booking?.location?.address || customer?.address || 'No address specified'}
                                </p>
                                {(booking.location?.lat || customer?.lat) != null && (booking.location?.lng || customer?.lng) != null && (
                                    <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-bold tracking-wide mt-1">
                                        <Info size={11} className="text-primary" />
                                        <span>Coordinates: {(booking.location?.lat || customer?.lat || 0).toFixed(6)}, {(booking.location?.lng || customer?.lng || 0).toFixed(6)}</span>
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

                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 rounded-full bg-[#151515] border-2 border-white/10 overflow-hidden relative flex-shrink-0 group shadow-lg">
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
                            <h3 className="text-[12px] font-bold text-white leading-tight">
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


                    </div>
                </div>

                {/* Bottom Section: Split Layout */}
                <div className="bg-[#151515] rounded-[1.5rem] py-5 px-3 sm:px-4 border border-white/5 flex flex-col h-full min-h-[300px]">
                    <h2 className="text-[10px] font-bold tracking-widest text-gray-500 mb-4 flex items-center gap-2 px-1">
                        <Clock size={14} />
                        Job Timeline {booking.date ? `• ${booking.date}` : ''}
                    </h2>

                    <div className="flex gap-2.5 sm:gap-3 flex-grow">
                        {/* Timeline Column - Mathematically Centered & Modernized */}
                        <div className="w-[44%] relative py-1 flex flex-col justify-between">
                            {steps.map((step, idx) => {
                                const isCompleted = idx <= currentStepIndex;
                                const isCurrent = idx === currentStepIndex;
                                const isLast = idx === steps.length - 1;
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
                                            {step.time && (
                                                <p className="text-[8px] text-gray-400 font-mono font-medium mt-0.5 leading-none">
                                                    {step.time}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Actions Grid */}
                        <div className="flex-1 flex flex-col gap-2 justify-center">
                            {/* Pin Location Button */}
                            <button 
                                onClick={() => setShowLiveRouteModal(true)}
                                className="group relative w-full h-[38px] rounded-full px-2 sm:px-2.5 flex items-center justify-between transition-all duration-300 transform active:scale-[0.98] shadow-md shadow-red-600/20 overflow-hidden border border-red-400/30 bg-gradient-to-r from-[#DC2626] via-[#B91C1C] to-[#991B1B] hover:brightness-110"
                            >
                                <div className="flex items-center gap-1.5">
                                    <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white shadow-inner flex-shrink-0">
                                        <MapPin size={12} className="text-white drop-shadow" />
                                    </div>
                                    <div className="w-[1px] h-3.5 bg-white/25 flex-shrink-0"></div>
                                    <span className="text-[10px] font-black text-white tracking-wider uppercase drop-shadow-sm whitespace-nowrap">
                                        Pin Location
                                    </span>
                                </div>
                                <div className="w-5 h-5 rounded-full bg-white/15 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/90 group-hover:translate-x-0.5 transition-transform flex-shrink-0">
                                    <ChevronRight size={12} />
                                </div>
                            </button>

                            {/* Live Chat Button */}
                            <button 
                                onClick={() => setShowChatModal(true)} 
                                className="group relative w-full h-[38px] rounded-full px-2 sm:px-2.5 flex items-center justify-between transition-all duration-300 transform active:scale-[0.98] shadow-md shadow-blue-600/20 overflow-hidden border border-blue-400/30 bg-gradient-to-r from-[#2563EB] via-[#1D4ED8] to-[#1E40AF] hover:brightness-110"
                            >
                                <div className="flex items-center gap-1.5">
                                    <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white shadow-inner flex-shrink-0">
                                        <MessageSquare size={12} className="text-white drop-shadow" />
                                    </div>
                                    <div className="w-[1px] h-3.5 bg-white/25 flex-shrink-0"></div>
                                    <span className="text-[10px] font-black text-white tracking-wider uppercase drop-shadow-sm whitespace-nowrap">
                                        Live Chat
                                    </span>
                                </div>
                                <div className="w-5 h-5 rounded-full bg-white/15 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/90 group-hover:translate-x-0.5 transition-transform flex-shrink-0">
                                    <ChevronRight size={12} />
                                </div>
                            </button>

                            {/* Call Button */}
                            <button 
                                onClick={handleCall} 
                                className="group relative w-full h-[38px] rounded-full px-2 sm:px-2.5 flex items-center justify-between transition-all duration-300 transform active:scale-[0.98] shadow-md shadow-emerald-600/20 overflow-hidden border border-emerald-400/30 bg-gradient-to-r from-[#059669] via-[#047857] to-[#065F46] hover:brightness-110"
                            >
                                <div className="flex items-center gap-1.5">
                                    <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white shadow-inner flex-shrink-0">
                                        <Phone size={12} className="text-white drop-shadow" />
                                    </div>
                                    <div className="w-[1px] h-3.5 bg-white/25 flex-shrink-0"></div>
                                    <span className="text-[10px] font-black text-white tracking-wider uppercase drop-shadow-sm whitespace-nowrap">
                                        Call
                                    </span>
                                </div>
                                <div className="w-5 h-5 rounded-full bg-white/15 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/90 group-hover:translate-x-0.5 transition-transform flex-shrink-0">
                                    <ChevronRight size={12} />
                                </div>
                            </button>

                            {/* Primary Status Update Action Button */}
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
                                        console.log('➡️ Updating to: Work Done');
                                        handleUpdateStatus('Work Done');
                                    }
                                    else if (booking.status === 'Work Done') {
                                        handleProcessPayment();
                                    }
                                    else {
                                        console.log('⚠️ Unknown status:', booking.status);
                                        alert(`Current status "${booking.status}" is not handled`);
                                    }
                                }}
                                disabled={isLoading || booking.status === 'Completed'}
                                className="group relative w-full h-[38px] rounded-full px-2 sm:px-2.5 flex items-center justify-between transition-all duration-300 transform active:scale-[0.98] shadow-md shadow-orange-600/25 overflow-hidden border border-orange-400/40 bg-gradient-to-r from-[#FE7803] via-[#EA580C] to-[#C2410C] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <div className="w-full flex items-center justify-center">
                                        <Spinner size="sm" color="text-white" />
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-1.5 overflow-hidden">
                                            <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm border border-white/20 flex-shrink-0 flex items-center justify-center text-white shadow-inner">
                                                <CheckCircle size={12} className="text-white drop-shadow" />
                                            </div>
                                            <div className="w-[1px] h-3.5 bg-white/25 flex-shrink-0"></div>
                                            <span className="text-[10px] font-black text-white tracking-wider uppercase drop-shadow-sm truncate">
                                                {(booking.status === 'Upcoming' || booking.status === 'Booking Confirmed') && 'Accept Job'}
                                                {booking.status === 'Mechanic Assigned' && 'Start Travel'}
                                                {booking.status === 'En Route' && 'Arrived'}
                                                {booking.status === 'In Progress' && 'Finish Work'}
                                                {booking.status === 'Work Done' && (booking.paymentStatus === 'paid' || booking.isPaid ? 'Complete' : 'Verify Balance')}
                                                {booking.status === 'Completed' && 'Completed'}
                                                {!['Upcoming', 'Booking Confirmed', 'Mechanic Assigned', 'En Route', 'In Progress', 'Work Done', 'Completed'].includes(booking.status) && 'Update'}
                                            </span>
                                        </div>
                                        <div className="w-5 h-5 rounded-full bg-white/15 backdrop-blur-sm border border-white/10 flex-shrink-0 flex items-center justify-center text-white/90 group-hover:translate-x-0.5 transition-transform">
                                            <ChevronRight size={12} />
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
                            disabled={booking.status !== 'In Progress' && booking.status !== 'Work Done'}
                            className="bg-[#26262F] hover:bg-[#32323D] text-white py-3 rounded-xl text-[9px] font-black tracking-widest flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-30 disabled:cursor-not-allowed border-0 shadow-sm"
                        >
                            <FileText size={14} className="text-blue-400" />
                            Progress
                        </button>
                        <button
                            onClick={() => setShowAdditionalCostsModal(true)}
                            disabled={booking.status !== 'In Progress' && booking.status !== 'Work Done'}
                            className="bg-[#26262F] hover:bg-[#32323D] text-white py-3 rounded-xl text-[9px] font-black tracking-widest flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-30 disabled:cursor-not-allowed border-0 shadow-sm"
                        >
                            <DollarSign size={14} className="text-primary" />
                            Costs
                        </button>
                        <button
                            onClick={() => setShowETAModal(true)}
                            disabled={['In Progress', 'Work Done', 'Completed', 'Cancelled'].includes(booking.status)}
                            className="bg-[#26262F] hover:bg-[#32323D] text-white py-3 rounded-xl text-[9px] font-black tracking-widest flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-30 disabled:cursor-not-allowed border-0 shadow-sm"
                        >
                            <Timer size={14} className="text-emerald-400" />
                            ETA
                        </button>
                    </div>

                    {/* Payment & Completion Button - Large, Prominent and Reactive */}
                    {(booking.status === 'In Progress' || booking.status === 'Work Done') && (
                        <button
                            onClick={booking.status === 'In Progress' ? () => handleUpdateStatus('Work Done') : handleProcessPayment}
                            disabled={isLoading}
                            className={`w-full mt-4 text-white py-5 rounded-2xl text-base font-black tracking-wider flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02] active:scale-[0.98] ${
                                booking.status === 'Work Done' && (booking.paymentStatus === 'paid' || booking.isPaid)
                                    ? 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 shadow-2xl shadow-green-500/30'
                                    : booking.status === 'Work Done'
                                    ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-2xl shadow-orange-500/30'
                                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-2xl shadow-blue-500/30'
                            }`}
                        >
                            <DollarSign size={28} className="animate-pulse" />
                            <span>
                                {booking.status === 'In Progress' && 'Complete Work & Request Balance'}
                                {booking.status === 'Work Done' && (booking.paymentStatus === 'paid' || booking.isPaid ? 'Finalize & Complete Job' : 'Awaiting Balance Payment / Verify')}
                            </span>
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

            {showReceiptModal && (booking.gcashReceiptUrl || booking.gcashDownpaymentReceiptUrl || booking.gcashBalanceReceiptUrl) && (
                <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
                    <div className="bg-[#15151A]/95 border border-white/10 rounded-3xl p-5 max-w-md w-full space-y-4 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] backdrop-blur-xl">
                        
                        {/* Orange decorative glow background */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[50px] rounded-full translate-x-10 -translate-y-10"></div>
                        
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-white/5 pb-3 relative z-10">
                            <h3 className="text-base font-black text-white tracking-tight flex items-center gap-2">
                                <span className="w-1.5 h-3.5 bg-primary rounded-full animate-pulse" />
                                GCash Receipt Details
                            </h3>
                            <button 
                                onClick={() => setShowReceiptModal(false)}
                                className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                            >
                                <X size={14} className="text-white/60 hover:text-white" />
                            </button>
                        </div>

                        {/* Content Body (Scrollable) */}
                        <div className="flex-1 overflow-y-auto space-y-4 pr-1 relative z-10 custom-scrollbar">
                            
                            {/* Calculation Details */}
                            <div className="bg-white/5 rounded-2xl p-3.5 space-y-2.5 text-[11px]">
                                <div className="flex justify-between">
                                    <span className="text-gray-400 font-bold">Booking ID</span>
                                    <span className="text-white font-mono font-bold uppercase">{bookingSequenceId || booking.id.slice(-6).toUpperCase()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400 font-bold">Customer</span>
                                    <span className="text-white font-bold">{customer?.name || booking.customerName}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400 font-bold">Date & Time</span>
                                    <span className="text-white font-bold">{booking.date} at {booking.time}</span>
                                </div>

                                <div className="h-px bg-white/5 my-2"></div>

                                {(() => {
                                    const originalServicesFee = booking.services && booking.services.length > 0
                                        ? booking.services.reduce((sum: number, svc: any) => sum + (Number(svc.price) || 0), 0)
                                        : (Number(booking.service?.price) || Number(booking.totalAmount) || 0);
                                    const paidDownpayment = Number(booking.paidAmount) || (originalServicesFee * 0.5);
                                    const serviceBalance = Math.max(0, originalServicesFee - paidDownpayment);
                                    const additionalCostsTotal = (booking.additionalCosts || []).reduce((sum: number, cost: any) => sum + (Number(cost.price) || 0), 0);
                                    const totalBalanceToPay = serviceBalance + additionalCostsTotal;

                                    return (
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-gray-400 font-bold">Base Service Fee</span>
                                                <span className="text-white font-bold">₱{originalServicesFee.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-400 font-bold">Downpayment (Paid)</span>
                                                <span className="text-primary font-black">₱{paidDownpayment.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-400 font-bold">Service Balance</span>
                                                <span className="text-white font-bold">₱{serviceBalance.toLocaleString()}</span>
                                            </div>

                                            {booking.additionalCosts && booking.additionalCosts.length > 0 && (
                                                <div className="mt-2 pt-2 border-t border-white/5 space-y-1.5">
                                                    <span className="text-primary font-bold uppercase tracking-wider text-[9px] block font-mono">Additional Cost Details:</span>
                                                    {booking.additionalCosts.map((cost: any, idx: number) => (
                                                        <div key={idx} className="flex justify-between text-[10px]">
                                                            <span className="text-gray-400 font-medium">• {cost.description}</span>
                                                            <span className="text-white font-bold">₱{Number(cost.price).toLocaleString()}</span>
                                                        </div>
                                                    ))}
                                                    <div className="flex justify-between font-bold text-[10px] pt-1">
                                                        <span className="text-gray-400 font-mono">Additional Total</span>
                                                        <span className="text-primary font-bold">+{formatCurrency(additionalCostsTotal)}</span>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="h-px bg-white/10 my-2"></div>

                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-white font-black uppercase">Grand Total Amount</span>
                                                <span className="text-sm font-black text-emerald-400">₱{(originalServicesFee + additionalCostsTotal).toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-white font-black uppercase">Final Balance to Pay</span>
                                                <span className="text-sm font-black text-emerald-400">₱{totalBalanceToPay.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Reference Display */}
                            {booking.gcashReference && (
                                <div className="bg-white/5 rounded-2xl p-3.5 flex justify-between items-center text-xs font-mono">
                                    <span className="text-gray-400 font-bold">Reference No.</span>
                                    <span className="text-white font-black">{booking.gcashReference}</span>
                                </div>
                            )}

                            {/* Tabs Header */}
                            <div className="flex border-b border-white/10 mb-4">
                                <button
                                    onClick={() => setActiveReceiptTab('downpayment')}
                                    className={`flex-1 pb-2 text-xs font-bold uppercase tracking-wider transition-all border-b-2 text-center ${
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
                                        className={`flex-1 pb-2 text-xs font-bold uppercase tracking-wider transition-all border-b-2 text-center ${
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
                            {activeReceiptTab === 'downpayment' ? (
                                <div className="space-y-2">
                                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono">1st Payment / 50% Downpayment</h4>
                                    {(booking.gcashDownpaymentReceiptUrl || booking.gcashReceiptUrl) ? (
                                        <div className="rounded-2xl overflow-hidden border border-white/10 bg-neutral-950 p-2 flex items-center justify-center group relative min-h-[120px]">
                                            <img
                                                src={booking.gcashDownpaymentReceiptUrl || booking.gcashReceiptUrl}
                                                alt="GCash Downpayment Receipt"
                                                className="max-h-[220px] w-auto object-contain rounded-xl transition-all duration-300 group-hover:opacity-95"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = '/assets/receipt_mockup.png';
                                                }}
                                            />
                                            <a
                                                href={booking.gcashDownpaymentReceiptUrl || booking.gcashReceiptUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 gap-1.5 text-white font-black text-[10px] tracking-widest uppercase font-mono"
                                            >
                                                <ExternalLink size={14} />
                                                Open Full Size
                                            </a>
                                        </div>
                                    ) : (
                                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center space-y-2">
                                            <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                                                <CheckCircle size={20} />
                                            </div>
                                            <p className="text-xs font-black text-white">HitPay Online Downpayment Verified</p>
                                            <p className="text-[10px] text-gray-400 font-mono">Ref: {booking.downpaymentRef || 'HITPAY-DP-PAID'}</p>
                                            <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase">
                                                50% DP Paid (₱{(Number(booking.downpaymentAmount || ((booking.totalAmount || 0) * 0.5))).toLocaleString()})
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <h4 className="text-[10px] font-bold text-primary uppercase tracking-widest font-mono">Final / 50% Balance Settlement</h4>
                                    {booking.gcashBalanceReceiptUrl ? (
                                        <div className="rounded-2xl overflow-hidden border border-white/10 bg-neutral-950 p-2 flex items-center justify-center group relative min-h-[120px]">
                                            <img
                                                src={booking.gcashBalanceReceiptUrl}
                                                alt="GCash Balance Receipt"
                                                className="max-h-[220px] w-auto object-contain rounded-xl transition-all duration-300 group-hover:opacity-95"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = '/assets/receipt_mockup.png';
                                                }}
                                            />
                                            <a
                                                href={booking.gcashBalanceReceiptUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 gap-1.5 text-white font-black text-[10px] tracking-widest uppercase font-mono"
                                            >
                                                <ExternalLink size={14} />
                                                Open Full Size
                                            </a>
                                        </div>
                                    ) : (
                                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center space-y-2">
                                            <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                                                <CheckCircle size={20} />
                                            </div>
                                            <p className="text-xs font-black text-white">HitPay Online Balance Verified</p>
                                            <p className="text-[10px] text-gray-400 font-mono">Ref: {booking.balancePaymentRef || 'HITPAY-BAL-PAID'}</p>
                                            <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase">
                                                50% Balance Settled (₱{(Number((booking.totalAmount || 0) * 0.5)).toLocaleString()})
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-2 pt-2 border-t border-white/5 relative z-10">
                            <button
                                onClick={() => setShowReceiptModal(false)}
                                className="w-full py-3.5 bg-primary hover:bg-orange-600 text-white font-black rounded-xl text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-orange-950/20 text-xs"
                            >
                                Close Details
                            </button>
                        </div>

                    </div>
                </div>
            )}

            {/* ETA Update Modal */}
            {showETAModal && (
                <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fadeIn">
                    <div className="bg-[#1A1A1E] rounded-3xl p-6 max-w-md w-full border border-white/10 shadow-2xl animate-scaleUp">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                                    <Timer size={20} />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-white leading-tight">
                                        Update Travel ETA
                                    </h3>
                                    <p className="text-gray-400 text-[11px]">Inform customer of real-time arrival</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowETAModal(false)}
                                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-all"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Quick Presets */}
                        <div className="mb-4">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2 font-mono">
                                Quick Presets
                            </label>
                            <div className="grid grid-cols-4 gap-2">
                                {[5, 10, 15, 30].map(mins => (
                                    <button
                                        key={mins}
                                        type="button"
                                        onClick={() => setEtaMinutes(mins)}
                                        className={`py-2 rounded-xl text-xs font-black transition-all border ${
                                            etaMinutes === mins
                                                ? 'bg-primary text-white border-primary shadow-lg shadow-primary/25 scale-[1.02]'
                                                : 'bg-white/5 text-gray-300 border-white/5 hover:bg-white/10'
                                        }`}
                                    >
                                        {mins}m
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Custom Minute Input */}
                        <div className="mb-4">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 font-mono">
                                Estimated Minutes
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={etaMinutes}
                                    onChange={(e) => setEtaMinutes(Math.max(1, Number(e.target.value)))}
                                    className="w-full bg-black/60 border border-white/10 rounded-2xl px-4 py-3 text-white text-center text-2xl font-black focus:outline-none focus:border-primary/50 transition-all font-mono"
                                    min="1"
                                    max="240"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-xs">
                                    mins
                                </span>
                            </div>
                        </div>

                        {/* Optional Traffic / Status Note */}
                        <div className="mb-6">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 font-mono">
                                Traffic / Travel Note (Optional)
                            </label>
                            <input
                                type="text"
                                value={etaNote}
                                onChange={(e) => setEtaNote(e.target.value)}
                                placeholder="e.g., Heavy traffic near intersection, preparing tools"
                                className="w-full bg-black/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 transition-all font-medium"
                            />
                        </div>

                        <div className="flex gap-2.5">
                            <button
                                onClick={() => setShowETAModal(false)}
                                className="flex-1 bg-white/5 hover:bg-white/10 text-white py-3 rounded-2xl font-bold transition-all text-xs"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdateETA}
                                disabled={isLoading}
                                className="flex-1 bg-gradient-to-r from-primary to-orange-600 hover:from-orange-600 hover:to-primary text-white py-3 rounded-2xl font-black transition-all disabled:opacity-50 text-xs shadow-lg shadow-primary/20 flex items-center justify-center gap-1.5"
                            >
                                {isLoading ? (
                                    <Spinner size="sm" color="text-white" />
                                ) : (
                                    <>
                                        <Bell size={14} />
                                        Save & Notify
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Progress Report Modal */}
            {showProgressModal && (
                <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[9999] flex items-center justify-center p-3 sm:p-5 animate-fadeIn overflow-y-auto">
                    <div className="bg-[#141416]/95 border border-white/10 rounded-3xl p-5 sm:p-7 max-w-xl w-full shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-xl animate-scaleUp my-auto max-h-[92vh] overflow-y-auto custom-scrollbar relative">
                        {/* Header */}
                        <div className="flex items-start justify-between pb-4 mb-5 border-b border-white/10">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/20 to-orange-600/10 border border-primary/30 flex items-center justify-center text-primary shadow-inner shadow-primary/20 flex-shrink-0">
                                    <FileText size={20} className="text-primary drop-shadow-[0_2px_8px_rgba(254,120,3,0.5)]" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-white tracking-wide flex items-center gap-2">
                                        Progress Report
                                        <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                                            Live Documentation
                                        </span>
                                    </h3>
                                    <p className="text-xs text-gray-400 mt-0.5">Document repair progress, notes, and photos for the customer</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowProgressModal(false)}
                                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-colors flex-shrink-0"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="space-y-5">
                            {/* Text Input Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Before / Issue Textarea */}
                                <div className="bg-[#0C0C0E]/70 border border-white/5 rounded-2xl p-3.5 focus-within:border-red-500/40 focus-within:ring-1 focus-within:ring-red-500/20 transition-all">
                                    <div className="flex items-center justify-between mb-2">
                                        <label htmlFor="job-before-issue" className="text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer">
                                            <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
                                            Before (Issue / Problem)
                                        </label>
                                        <span className="text-[10px] text-gray-500 font-mono">Initial Condition</span>
                                    </div>
                                    <textarea
                                        id="job-before-issue"
                                        name="job-before-issue"
                                        value={progressReport.before}
                                        onChange={(e) => setProgressReport({ ...progressReport, before: e.target.value })}
                                        className="w-full bg-transparent border-0 text-white placeholder-gray-500 resize-none outline-none text-xs sm:text-sm leading-relaxed p-1"
                                        rows={4}
                                        placeholder="Describe the initial condition, diagnostic findings, or parts damaged..."
                                    />
                                </div>

                                {/* After / Solution Textarea */}
                                <div className="bg-[#0C0C0E]/70 border border-white/5 rounded-2xl p-3.5 focus-within:border-emerald-500/40 focus-within:ring-1 focus-within:ring-emerald-500/20 transition-all">
                                    <div className="flex items-center justify-between mb-2">
                                        <label htmlFor="job-after-fix" className="text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                                            After (Solution / Fix)
                                        </label>
                                        <span className="text-[10px] text-gray-500 font-mono">Completed Work</span>
                                    </div>
                                    <textarea
                                        id="job-after-fix"
                                        name="job-after-fix"
                                        value={progressReport.after}
                                        onChange={(e) => setProgressReport({ ...progressReport, after: e.target.value })}
                                        className="w-full bg-transparent border-0 text-white placeholder-gray-500 resize-none outline-none text-xs sm:text-sm leading-relaxed p-1"
                                        rows={4}
                                        placeholder="Describe what was repaired, tuned, or replaced..."
                                    />
                                </div>
                            </div>

                            {/* Image Upload Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Before Images Upload */}
                                <div className="bg-[#0C0C0E]/50 border border-white/5 rounded-2xl p-3.5">
                                    <div className="flex items-center justify-between mb-2.5">
                                        <label className="text-xs font-bold text-white flex items-center gap-2">
                                            <div className="w-5 h-5 rounded-md bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                                                <ImageIcon size={12} />
                                            </div>
                                            Before Photos
                                        </label>
                                        <span className="text-[10px] text-gray-500">{beforeImages.length} uploaded</span>
                                    </div>
                                    
                                    <div className="space-y-2.5">
                                        <label className="w-full bg-[#161619] hover:bg-[#1D1D22] border-2 border-dashed border-white/10 hover:border-red-400/40 rounded-xl px-3 py-3 flex flex-col items-center justify-center cursor-pointer transition-all group min-h-[90px]">
                                            <div className="w-8 h-8 rounded-full bg-white/5 group-hover:bg-red-500/10 flex items-center justify-center text-gray-400 group-hover:text-red-400 mb-1.5 transition-colors">
                                                <Upload size={14} />
                                            </div>
                                            <span className="text-xs font-bold text-gray-300 group-hover:text-white">Upload Before Photos</span>
                                            <span className="text-[10px] text-gray-500">PNG, JPG up to 10MB</span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                multiple
                                                onChange={(e) => handleImageUpload(e.target.files, 'before')}
                                                className="hidden"
                                            />
                                        </label>

                                        {beforeImages.length > 0 && (
                                            <div className="grid grid-cols-3 gap-2 pt-1">
                                                {beforeImages.map((img, idx) => (
                                                    <div key={idx} className="relative group rounded-xl overflow-hidden border border-white/10 aspect-square shadow-sm">
                                                        <img src={img} alt={`Before ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <button
                                                                onClick={() => removeImage(idx, 'before')}
                                                                className="w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg transition-transform active:scale-90"
                                                                title="Remove Photo"
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* After Images Upload */}
                                <div className="bg-[#0C0C0E]/50 border border-white/5 rounded-2xl p-3.5">
                                    <div className="flex items-center justify-between mb-2.5">
                                        <label className="text-xs font-bold text-white flex items-center gap-2">
                                            <div className="w-5 h-5 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                                                <ImageIcon size={12} />
                                            </div>
                                            After Photos
                                        </label>
                                        <span className="text-[10px] text-gray-500">{afterImages.length} uploaded</span>
                                    </div>

                                    <div className="space-y-2.5">
                                        <label className="w-full bg-[#161619] hover:bg-[#1D1D22] border-2 border-dashed border-white/10 hover:border-emerald-400/40 rounded-xl px-3 py-3 flex flex-col items-center justify-center cursor-pointer transition-all group min-h-[90px]">
                                            <div className="w-8 h-8 rounded-full bg-white/5 group-hover:bg-emerald-500/10 flex items-center justify-center text-gray-400 group-hover:text-emerald-400 mb-1.5 transition-colors">
                                                <Upload size={14} />
                                            </div>
                                            <span className="text-xs font-bold text-gray-300 group-hover:text-white">Upload After Photos</span>
                                            <span className="text-[10px] text-gray-500">PNG, JPG up to 10MB</span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                multiple
                                                onChange={(e) => handleImageUpload(e.target.files, 'after')}
                                                className="hidden"
                                            />
                                        </label>

                                        {afterImages.length > 0 && (
                                            <div className="grid grid-cols-3 gap-2 pt-1">
                                                {afterImages.map((img, idx) => (
                                                    <div key={idx} className="relative group rounded-xl overflow-hidden border border-white/10 aspect-square shadow-sm">
                                                        <img src={img} alt={`After ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <button
                                                                onClick={() => removeImage(idx, 'after')}
                                                                className="w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg transition-transform active:scale-90"
                                                                title="Remove Photo"
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Notes - Full Width */}
                            <div className="bg-[#0C0C0E]/70 border border-white/5 rounded-2xl p-3.5 focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
                                <div className="flex items-center justify-between mb-1.5">
                                    <label htmlFor="job-notes" className="text-xs font-bold text-white flex items-center gap-1.5">
                                        <FileText size={12} className="text-primary" />
                                        Recommendation Notes
                                    </label>
                                </div>
                                <textarea
                                    id="job-notes"
                                    name="job-notes"
                                    value={progressReport.notes}
                                    onChange={(e) => setProgressReport({ ...progressReport, notes: e.target.value })}
                                    className="w-full bg-transparent border-0 text-white placeholder-gray-500 resize-none outline-none text-xs leading-relaxed p-1"
                                    rows={2}
                                    placeholder="Provide any maintenance tips, parts replaced warranty, or next inspection notes..."
                                />
                            </div>
                        </div>

                        {/* Progress History */}
                        {booking.progressHistory && booking.progressHistory.length > 0 && (
                            <div className="mt-6 pt-5 border-t border-white/10">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-xs font-black uppercase tracking-wider text-gray-300 flex items-center gap-2">
                                        <Clock size={13} className="text-primary" />
                                        Previous Reports ({booking.progressHistory.length})
                                    </h4>
                                </div>
                                <div className="space-y-3 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                                    {booking.progressHistory.map((entry: any, idx: number) => (
                                        <div key={idx} className="bg-[#0C0C0E] rounded-2xl p-3.5 border border-white/5 space-y-2.5">
                                            <div className="flex items-center justify-between text-[10px] text-gray-400 pb-2 border-b border-white/5">
                                                <span className="font-mono text-gray-500">{new Date(entry.timestamp).toLocaleString()}</span>
                                                <span className="px-2 py-0.5 rounded-full bg-white/5 text-gray-300 font-bold border border-white/5">Log #{idx + 1}</span>
                                            </div>
                                            <div className="text-xs space-y-2">
                                                <div className="p-2 rounded-xl bg-red-500/5 border border-red-500/10">
                                                    <p className="text-[11px] text-red-400 font-bold mb-0.5">Before Issue</p>
                                                    <p className="text-gray-300 text-xs leading-relaxed">{entry.before}</p>
                                                </div>
                                                <div className="p-2 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                                                    <p className="text-[11px] text-emerald-400 font-bold mb-0.5">After Fix</p>
                                                    <p className="text-gray-300 text-xs leading-relaxed">{entry.after}</p>
                                                </div>
                                                {entry.notes && (
                                                    <div className="p-2 rounded-xl bg-white/5 border border-white/5">
                                                        <p className="text-[11px] text-gray-400 font-bold mb-0.5">Notes</p>
                                                        <p className="text-gray-300 text-xs">{entry.notes}</p>
                                                    </div>
                                                )}

                                                {/* Before Images */}
                                                {entry.beforeImages && entry.beforeImages.length > 0 && (
                                                    <div>
                                                        <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1.5">Before Photos:</p>
                                                        <div className="grid grid-cols-4 gap-1.5">
                                                            {entry.beforeImages.map((img: string, imgIdx: number) => (
                                                                <img key={imgIdx} src={img} alt={`Before ${imgIdx + 1}`} className="w-full h-14 object-cover rounded-lg border border-white/10" />
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* After Images */}
                                                {entry.afterImages && entry.afterImages.length > 0 && (
                                                    <div>
                                                        <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1.5">After Photos:</p>
                                                        <div className="grid grid-cols-4 gap-1.5">
                                                            {entry.afterImages.map((img: string, imgIdx: number) => (
                                                                <img key={imgIdx} src={img} alt={`After ${imgIdx + 1}`} className="w-full h-14 object-cover rounded-lg border border-white/10" />
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

                        {/* Footer Action Buttons */}
                        <div className="flex items-center gap-3 pt-5 mt-5 border-t border-white/10">
                            <button
                                type="button"
                                onClick={() => setShowProgressModal(false)}
                                className="flex-1 h-[48px] bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl transition-all active:scale-98 text-xs tracking-wider uppercase border border-white/10 flex items-center justify-center"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveProgress}
                                disabled={isLoading || !progressReport.before || !progressReport.after}
                                className="flex-1 h-[48px] bg-gradient-to-r from-primary via-orange-500 to-orange-600 hover:brightness-110 text-white font-black rounded-2xl transition-all active:scale-98 text-xs tracking-wider uppercase shadow-lg shadow-primary/25 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-primary/40"
                            >
                                {isLoading ? (
                                    <>
                                        <Spinner size="sm" color="text-white" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle size={15} />
                                        Report Save
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* Payment Reminder Modal - Shown when customer hasn't paid */}
            {showPaymentReminderModal && (() => {
                const originalServicesFee = booking.services && booking.services.length > 0
                    ? booking.services.reduce((sum: number, svc: any) => sum + (Number(svc.price) || 0), 0)
                    : (Number(booking.service?.price) || 0);
                const paidDownpayment = Number(booking.paidAmount) || 0;
                const serviceBalance = Math.max(0, originalServicesFee - paidDownpayment);
                const additionalCostsTotal = (booking.additionalCosts || []).reduce((sum: number, cost: any) => sum + (Number(cost.price) || 0), 0);
                const totalBalanceToPay = serviceBalance + additionalCostsTotal;

                return (
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
                                            <span className="text-gray-400">Total Services Fee:</span>
                                            <span className="text-white font-bold">{formatCurrency(originalServicesFee)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Paid Downpayment (50%):</span>
                                            <span className="text-green-400 font-bold">-{formatCurrency(paidDownpayment)}</span>
                                        </div>
                                        <div className="flex justify-between pt-1 border-t border-white/5">
                                            <span className="text-gray-400 font-bold">Service Balance:</span>
                                            <span className="text-white font-bold">{formatCurrency(serviceBalance)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Additional Costs:</span>
                                            <span className="text-primary font-bold">+{formatCurrency(additionalCostsTotal)}</span>
                                        </div>
                                        <div className="flex justify-between pt-1.5 border-t border-yellow-500/20">
                                            <span className="text-white font-bold">Remaining Balance:</span>
                                            <span className="text-yellow-400 font-black text-sm">
                                                {formatCurrency(totalBalanceToPay)}
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

                                    {/* Pricing Breakdown */}
                                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 mb-3 space-y-1.5 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Total Services Fee:</span>
                                            <span className="text-white font-bold">{formatCurrency(originalServicesFee)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Paid Downpayment (50%):</span>
                                            <span className="text-green-400 font-bold">-{formatCurrency(paidDownpayment)}</span>
                                        </div>
                                        <div className="flex justify-between pt-1 border-t border-white/5">
                                            <span className="text-gray-400 font-bold">Service Balance:</span>
                                            <span className="text-white font-bold">{formatCurrency(serviceBalance)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Additional Costs:</span>
                                            <span className="text-primary font-bold">+{formatCurrency(additionalCostsTotal)}</span>
                                        </div>
                                        <div className="flex justify-between pt-1.5 border-t border-white/10">
                                            <span className="text-white font-bold">Remaining Balance:</span>
                                            <span className="text-green-400 font-black text-sm">
                                                {formatCurrency(totalBalanceToPay)}
                                            </span>
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
                                                <p className="text-yellow-400 font-bold text-xs mb-1.5 font-mono">Payment Status ({booking.paymentMethod || 'Cash'})</p>
                                                <div className="space-y-1 text-xs">
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-400">Total Services Fee:</span>
                                                        <span className="text-white font-bold">{formatCurrency(originalServicesFee)}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-400">Paid Downpayment (50%):</span>
                                                        <span className="text-green-400 font-bold">-{formatCurrency(paidDownpayment)}</span>
                                                    </div>
                                                    <div className="flex justify-between pt-1 border-t border-yellow-500/20">
                                                        <span className="text-gray-400 font-bold">Service Balance:</span>
                                                        <span className="text-white font-bold">{formatCurrency(serviceBalance)}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-400">Additional Costs:</span>
                                                        <span className="text-primary font-bold">+{formatCurrency(additionalCostsTotal)}</span>
                                                    </div>
                                                    {booking.paymentMethod === 'GCash' && booking.gcashReference && (
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-400 font-medium">GCash Ref:</span>
                                                            <span className="text-white font-mono font-bold truncate max-w-[120px]">{booking.gcashReference}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex justify-between pt-1.5 border-t border-yellow-500/20">
                                                        <span className="text-white font-bold">Remaining Balance:</span>
                                                        <span className="text-yellow-400 font-black text-sm">
                                                            {formatCurrency(totalBalanceToPay)}
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
                );
            })()}


            {/* Additional Costs Modal */}
            {showAdditionalCostsModal && (() => {
                const originalServicesFee = booking.services && booking.services.length > 0
                    ? booking.services.reduce((sum: number, svc: any) => sum + (Number(svc.price) || 0), 0)
                    : (Number(booking.service?.price) || 0);
                const paidDownpayment = Number(booking.paidAmount) || 0;
                const serviceBalance = Math.max(0, originalServicesFee - paidDownpayment);
                const additionalCostsTotal = (booking.additionalCosts || []).reduce((sum: number, cost: any) => sum + (Number(cost.price) || 0), 0);
                const totalBalanceToPay = serviceBalance + additionalCostsTotal;

                return (
                    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[100] flex items-center justify-center p-3 animate-fadeIn">
                        <div className="bg-[#15151A]/95 rounded-2xl p-4 max-w-sm w-full border border-white/10 shadow-2xl animate-scaleUp backdrop-blur-xl">
                            <div className="flex items-center justify-between mb-3.5">
                                <h3 className="text-lg font-bold text-white flex items-center gap-1.5">
                                    <DollarSign size={18} className="text-primary" />
                                    Additional Costs
                                </h3>
                                <button 
                                    onClick={() => setShowAdditionalCostsModal(false)}
                                    className="text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 p-1.5 rounded-lg transition-all"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            {/* Add New Cost Form */}
                            <div className="space-y-2 mb-3.5 bg-white/[0.02] p-3 rounded-xl border border-white/5">
                                <h4 className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Add New Item</h4>
                                <div className="space-y-2">
                                    <input
                                        type="text"
                                        placeholder="Item description (e.g., Brake Pads)"
                                        value={newCostDescription}
                                        onChange={(e) => setNewCostDescription(e.target.value)}
                                        className="w-full h-9 bg-black/40 border border-white/10 rounded-lg px-3 text-xs text-white outline-none focus:border-primary/50 transition-all font-medium"
                                    />
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-xs">₱</span>
                                            <input
                                                type="number"
                                                placeholder="Price"
                                                value={newCostPrice}
                                                onChange={(e) => setNewCostPrice(e.target.value)}
                                                className="w-full h-9 bg-black/40 border border-white/10 rounded-lg pl-6 pr-3 text-xs text-white outline-none focus:border-primary/50 transition-all font-bold"
                                            />
                                        </div>
                                        <button
                                            onClick={handleAddCost}
                                            disabled={isLoading || !newCostDescription || !newCostPrice}
                                            className="bg-primary hover:bg-orange-600 text-white px-5 h-9 rounded-lg font-bold text-xs transition-all disabled:opacity-50 flex items-center justify-center shadow-lg shadow-primary/10"
                                        >
                                            Add
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Costs List */}
                            <div className="space-y-1.5 max-h-36 overflow-y-auto mb-3.5 pr-1 custom-scrollbar">
                                <h4 className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">Itemized List</h4>
                                
                                {booking.services && booking.services.length > 0 ? (
                                    booking.services.map((svc: any, idx: number) => (
                                        <div key={svc.id || idx} className="flex justify-between items-center text-[11px] py-1.5 px-2.5 bg-white/5 rounded-lg border border-white/5">
                                            <span className="text-gray-400 font-medium">{svc.name}</span>
                                            <span className="text-white font-bold">{formatCurrency(svc.price || 0)}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex justify-between items-center text-[11px] py-1.5 px-2.5 bg-white/5 rounded-lg border border-white/5">
                                        <span className="text-gray-400 font-medium">{booking.service?.name || 'Base Service Fee'}</span>
                                        <span className="text-white font-bold">{formatCurrency(booking.service?.price || 0)}</span>
                                    </div>
                                )}
                                
                                {booking.additionalCosts && booking.additionalCosts.length > 0 ? (
                                    booking.additionalCosts.map((cost: any) => (
                                        <div key={cost.id} className="flex justify-between items-center text-xs py-1.5 px-2.5 bg-black/35 rounded-lg group border border-white/5">
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-white font-medium truncate text-xs">{cost.description}</span>
                                                <span className="text-primary font-bold text-[10px]">{formatCurrency(cost.price)}</span>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveCost(cost.id)}
                                                className="text-red-400 hover:text-red-500 p-1 hover:bg-red-500/10 rounded transition-all"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))
                                ) : null}
                            </div>

                            {/* Summary Calculation Breakdown */}
                            <div className="border-t border-white/10 pt-2.5 mb-3.5 space-y-1.5">
                                <div className="flex justify-between text-[11px]">
                                    <span className="text-gray-400 font-medium">Total Services Fee</span>
                                    <span className="text-white font-bold">{formatCurrency(originalServicesFee)}</span>
                                </div>
                                <div className="flex justify-between text-[11px]">
                                    <span className="text-gray-400 font-medium">Paid Downpayment (50%)</span>
                                    <span className="text-green-400 font-bold">-{formatCurrency(paidDownpayment)}</span>
                                </div>
                                <div className="flex justify-between text-[11px] border-t border-white/5 pt-1">
                                    <span className="text-gray-400 font-bold">Service Balance</span>
                                    <span className="text-white font-bold">{formatCurrency(serviceBalance)}</span>
                                </div>
                                <div className="flex justify-between text-[11px]">
                                    <span className="text-gray-400 font-medium">Additional Costs</span>
                                    <span className="text-primary font-bold">+{formatCurrency(additionalCostsTotal)}</span>
                                </div>
                                <div className="flex justify-between items-center border-t border-white/10 pt-2 mt-0.5">
                                    <span className="text-white font-bold text-xs">Total Balance to Pay</span>
                                    <span className="text-green-400 font-black text-xl">
                                        {formatCurrency(totalBalanceToPay)}
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={() => setShowAdditionalCostsModal(false)}
                                className="w-full bg-primary hover:bg-orange-600 text-white py-2.5 rounded-xl font-bold transition-all text-xs shadow-md shadow-primary/10 border-0"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                );
            })()}

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
                                {(() => {
                                    const totalRev = getJobTotalAmount(booking);
                                    const feePct = db?.settings?.serviceFeePercentage ?? 30;
                                    const mechanicNet = getJobMechanicShare(booking, feePct);
                                    const adminFee = Math.max(0, totalRev - mechanicNet);
                                    const mechanicPct = 100 - feePct;

                                    return (
                                        <div className="border-t border-white/10 pt-3 mt-2 space-y-2 bg-black/30 p-3 rounded-xl">
                                            <div className="flex justify-between items-center text-[11px] text-gray-300">
                                                <span>Customer Total / Kabuuan:</span>
                                                <span className="font-bold text-white">₱{totalRev.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-[11px] text-red-400/90">
                                                <span>Admin Platform Fee ({feePct}%):</span>
                                                <span className="font-bold">- ₱{adminFee.toLocaleString()}</span>
                                            </div>
                                            <div className="pt-2 border-t border-dashed border-white/10 flex justify-between items-center">
                                                <div>
                                                    <span className="text-xs font-black text-emerald-400">Your Take-Home Pay ({mechanicPct}%):</span>
                                                    <p className="text-[9px] text-gray-400">Papasok sa Wallet kapag kinumpirma</p>
                                                </div>
                                                <span className="text-base font-black text-emerald-400">₱{mechanicNet.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    );
                                })()}
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

                                {(() => {
                                    const totalRev = getJobTotalAmount(booking);
                                    const feePct = db?.settings?.serviceFeePercentage ?? 30;
                                    const mechanicNet = getJobMechanicShare(booking, feePct);
                                    const adminFee = Math.max(0, totalRev - mechanicNet);
                                    const mechanicPct = 100 - feePct;

                                    return (
                                        <div className="border-t border-white/10 pt-3 mt-2 space-y-2 bg-black/30 p-3 rounded-xl">
                                            <div className="flex justify-between items-center text-[11px] text-gray-300">
                                                <span>Customer Total / Kabuuan:</span>
                                                <span className="font-bold text-white">₱{totalRev.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-[11px] text-red-400/90">
                                                <span>Admin Platform Fee ({feePct}%):</span>
                                                <span className="font-bold">- ₱{adminFee.toLocaleString()}</span>
                                            </div>
                                            <div className="pt-2 border-t border-dashed border-white/10 flex justify-between items-center">
                                                <div>
                                                    <span className="text-xs font-black text-emerald-400">Your Take-Home Pay ({mechanicPct}%):</span>
                                                    <p className="text-[9px] text-gray-400">Pumasok na sa iyong Wallet</p>
                                                </div>
                                                <span className="text-base font-black text-emerald-400">₱{mechanicNet.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}

                        {/* Action Button */}
                        <button
                            onClick={() => {
                                setShowPaymentSuccessModal(false);
                                navigate('/mechanic-portal/dashboard');
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

            {/* Realtime Live Route Map Modal */}
            <LiveRouteMapModal
                isOpen={showLiveRouteModal}
                onClose={() => setShowLiveRouteModal(false)}
                customerLocation={booking.location || (customer?.lat && customer?.lng ? { lat: customer.lat, lng: customer.lng, address: customer.address } : null)}
                customerImageUrl={booking.customerPhoto || booking.customerImage || booking.customerAvatar || customer?.picture || customer?.imageUrl || null}
                customerName={booking.customerName || customer?.name || 'Customer'}
                customerPhone={booking.customerPhone || customer?.phone || ''}
                customerVehicle={booking.vehicle ? `${booking.vehicle.year || ''} ${booking.vehicle.make || ''} ${booking.vehicle.model || ''}`.trim() : customer?.vehicles?.[0] ? `${customer.vehicles[0].year || ''} ${customer.vehicles[0].make || ''} ${customer.vehicles[0].model || ''}`.trim() : ''}
                customerAddress={booking.location?.address || customer?.address || ''}
                mechanicLocation={mechanicCurrentLocation || (booking.mechanicLocation?.lat && booking.mechanicLocation?.lng ? { lat: booking.mechanicLocation.lat, lng: booking.mechanicLocation.lng } : null) || (mechanic?.lat && mechanic?.lng ? { lat: mechanic.lat, lng: mechanic.lng } : null)}
                mechanic={mechanic}
                viewMode="mechanic"
                title={`Live Navigation — Job #${bookingSequenceId || booking.id.slice(-6)}`}
                status={booking.status}
                eta={booking.eta || (etaMinutes ? `${etaMinutes} mins away` : null)}
                etaNote={booking.etaNote || etaNote || null}
                onCallCustomer={handleCall}
                onChatCustomer={() => {
                    setShowLiveRouteModal(false);
                    setShowChatModal(true);
                }}
                onOpenExternalNav={handleDirectNavigation}
                appLogoUrl={db?.settings?.mapLogoUrl || db?.settings?.appLogoUrl || '/favicon.png'}
            />
        </div >
    );
};

export default MechanicJobDetailScreen;
