import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { CheckCircle2, Clock, ShieldCheck, Star } from 'lucide-react';
import { Booking } from '../types';
import { useAuth } from '../context/AuthContext';
import CustomerMechanicChatModal from '../components/customer/CustomerMechanicChatModal';
import MapComponent from '../components/MapComponent';
import { db as firestore } from '../firebase';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import liveData from '../data/liveData.json';

declare const L: any;

const BookingConfirmationScreen: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user: customer } = useAuth();
    const locationState = (location.state as { bookings?: Booking[]; bookingId?: string }) || {};
    const [bookings, setBookings] = useState<Booking[]>(locationState.bookings || []);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [showRedirectNotification, setShowRedirectNotification] = useState(false);
    const [isLoading, setIsLoading] = useState(!locationState.bookings?.length && !!locationState.bookingId);

    // If no bookings passed but bookingId given, fetch from Firestore directly
    useEffect(() => {
        if (locationState.bookings?.length) {
            setBookings(locationState.bookings);
            setIsLoading(false);
            return;
        }
        if (!locationState.bookingId) {
            // No bookings and no bookingId — redirect home
            navigate('/customer-portal/');
            return;
        }
        const isLocalhost = typeof window !== 'undefined' && (
            window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1'
        );

        // Fetch the booking from Firestore using the bookingId
        setIsLoading(true);
        const bookingRef = doc(firestore, 'bookings', locationState.bookingId);
        getDoc(bookingRef).then(snapshot => {
            if (snapshot.exists()) {
                const fetchedBooking = { id: snapshot.id, ...snapshot.data() } as Booking;
                setBookings([fetchedBooking]);
            } else {
                if (isLocalhost) {
                    const localBooking = liveData.bookings.find(b => b.id === locationState.bookingId);
                    if (localBooking) {
                        setBookings([localBooking as unknown as Booking]);
                    } else {
                        navigate('/customer-portal/');
                    }
                } else {
                    navigate('/customer-portal/');
                }
            }
        }).catch((err) => {
            if (isLocalhost) {
                const localBooking = liveData.bookings.find(b => b.id === locationState.bookingId);
                if (localBooking) {
                    setBookings([localBooking as unknown as Booking]);
                } else {
                    navigate('/customer-portal/');
                }
            } else {
                navigate('/customer-portal/');
            }
        }).finally(() => setIsLoading(false));
    }, []);

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

                    if (
                        previousStatus === 'Upcoming' &&
                        (newStatus === 'Mechanic Assigned' ||
                            newStatus === 'En Route' ||
                            newStatus === 'In Progress' ||
                            newStatus === 'Completed')
                    ) {
                        console.log('✅ Mechanic accepted! Auto-redirecting to booking history...');
                        setShowRedirectNotification(true);
                        setTimeout(() => {
                            navigate('/customer-portal/booking-history', {
                                replace: true,
                                state: {
                                    highlightBookingId: booking.id,
                                    message: 'Your mechanic has accepted the job!'
                                }
                            });
                        }, 2000);
                    }
                }
            }, (error) => {
                if (error?.code === 'permission-denied' && isLocalhost) {
                    const localBooking = liveData.bookings.find(b => b.id === booking.id);
                    if (localBooking) {
                        setBookings(prev => prev.map(b => b.id === booking.id ? localBooking as unknown as Booking : b));
                    }
                } else {
                    console.error('❌ Error listening to booking updates:', error);
                }
            });
        });

        return () => {
            console.log('🧹 Cleaning up booking listeners');
            unsubscribers.forEach(unsubscribe => unsubscribe());
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
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <p className="text-gray-400">Loading booking details...</p>
            </div>
        );
    }

    if (!bookings || bookings.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-secondary">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <p className="text-gray-400">Loading booking details...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-secondary">
            <Header title={`Booking #${primaryBooking.id.slice(-6)}`} icon={<CheckCircle2 size={22} />} />
            <div className="flex-grow flex flex-col p-4 space-y-6 overflow-y-auto pb-6">

                {/* Mechanic Accepted - Auto Redirect Notification */}
                {showRedirectNotification && (
                    <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-5 border-2 border-green-400/50 shadow-2xl shadow-green-500/30 animate-pulse">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-white font-black text-lg mb-1">🎉 Mechanic Accepted!</h3>
                                <p className="text-white/90 text-sm">Redirecting you to booking history...</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Success Banner — adapts to GCash payment verification state */}
                <div className="text-center py-4">
                    {primaryBooking.paymentMethod === 'GCash' && !primaryBooking.isVerified ? (
                        // GCash not yet verified state
                        <>
                            <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-yellow-500/20">
                                <Clock size={40} className="text-yellow-400 animate-pulse" />
                            </div>
                            <h2 className="text-2xl font-bold text-white">Awaiting Payment Verification</h2>
                            <p className="text-gray-400 mt-2 max-w-xs mx-auto text-sm">
                                Your receipt has been submitted. Our admin will verify your GCash payment shortly.
                            </p>
                            <div className="mt-3 flex items-center justify-center gap-2">
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                <p className="text-green-400 text-xs font-bold">
                                    REAL-TIME SYNC ACTIVE
                                </p>
                            </div>
                        </>
                    ) : primaryBooking.paymentMethod === 'GCash' && primaryBooking.isVerified ? (
                        // GCash verified — confirmed
                        <>
                            <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/20">
                                <ShieldCheck size={40} className="text-green-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-white">🎉 Payment Verified!</h2>
                            <p className="text-gray-400 mt-2 max-w-xs mx-auto text-sm">
                                Your GCash down payment has been confirmed. Booking is active!
                            </p>
                            <p className="text-primary mt-3 text-xs font-bold animate-pulse">
                                ⏳ Waiting for mechanic to accept...
                            </p>
                        </>
                    ) : (
                        // Default non-GCash booking state
                        <>
                            <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/20">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-white">Appointment Set!</h2>
                            <p className="text-gray-400 mt-2 max-w-xs mx-auto text-sm">
                                Your booking has been confirmed. You can track the status in your history.
                            </p>
                            <p className="text-primary mt-3 text-xs font-bold animate-pulse">
                                ⏳ Waiting for mechanic to accept...
                            </p>
                        </>
                    )}
                </div>

                {/* Main Content Card */}
                <div className="bg-[#1D1D1D] rounded-xl overflow-hidden shadow-lg border border-white/5">
                    <div className="h-1 bg-gradient-to-r from-green-500 via-primary to-green-500"></div>

                    <div className="p-5 space-y-6">
                        {/* Services Summary */}
                        <div className="bg-[#151515] rounded-xl p-4 border border-white/5">
                            <div className="flex justify-between items-center mb-3">
                                <p className="text-[10px] font-bold text-gray-500  tracking-widest">Services</p>
                                <span className="text-xs bg-white/5 px-2 py-1 rounded text-gray-300 flex items-center gap-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    ~{totalDuration} mins
                                </span>
                            </div>
                            <div className="space-y-3">
                                {bookings.flatMap(book => getServiceList(book)).map((svc, idx) => (
                                    <div key={`${svc.id}-${idx}`} className="flex justify-between items-start">
                                        <div>
                                            <p className="text-white font-medium text-sm">{svc.name}</p>
                                            <p className="text-xs text-gray-500">{svc.category}</p>
                                        </div>
                                        <p className="text-primary font-bold text-sm">
                                            {svc.price > 0 ? `₱${svc.price.toLocaleString()}` : <span className="bg-blue-500/20 text-blue-400 text-[10px] px-1.5 py-0.5 rounded">QUOTE</span>}
                                        </p>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 pt-3 border-t border-white/10 flex justify-between items-end">
                                <span className="text-sm text-gray-400">Estimated Total</span>
                                <span className="text-xl font-bold text-white">₱{totalCost.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Date & Time */}
                        <div className="bg-[#151515] rounded-xl p-4 border border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-500  tracking-widest">Schedule</p>
                                    <p className="text-white font-bold text-sm">{new Date(primaryBooking.date.replace(/-/g, '/')).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
                                    <p className="text-blue-400 text-sm font-bold">{primaryBooking.time}</p>
                                </div>
                            </div>
                        </div>

                        {/* Location */}
                        {serviceLocation && (
                            <div className="bg-[#151515] rounded-xl overflow-hidden border border-white/5">
                                <div className="relative h-40 w-full bg-gray-800">
                                    <MapComponent
                                        center={[serviceLocation.lat, serviceLocation.lng]}
                                        zoom={15}
                                        markers={mapMarkers}
                                        disableScrollZoom={true}
                                    />
                                    <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-3 pointer-events-none z-[400]">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-md bg-green-500/20 flex items-center justify-center text-green-400">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                            </div>
                                            <span className="text-white font-bold text-xs">Service Location</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-3">
                                    <a
                                        href={googleMapsLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-2 w-full bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white border border-blue-500/30 hover:border-blue-500 font-bold py-2.5 rounded-lg transition-all"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        <span className="text-xs">Open in Google Maps</span>
                                    </a>
                                </div>
                            </div>
                        )}

                        {/* Mechanic */}
                        {mechanic && (
                            <div className="bg-[#151515] rounded-xl p-4 border border-white/5">
                                <p className="text-[10px] font-bold text-gray-500  tracking-widest mb-3">Your Mechanic</p>
                                <div className="flex items-center gap-3 mb-4">
                                    <img 
                                        src={mechanic.imageUrl || '/riders-logo.png'} 
                                        alt={mechanic.name} 
                                        className="w-12 h-12 rounded-xl object-cover border border-primary/30" 
                                        onError={(e) => { (e.target as HTMLImageElement).src = '/riders-logo.png'; }}
                                    />
                                    <div>
                                        <p className="font-bold text-white leading-tight">{mechanic.name}</p>
                                        <div className="flex items-center gap-1 text-yellow-400 text-xs mt-1">
                                            <Star size={12} className="fill-yellow-400 text-yellow-400" />
                                            <span className="font-bold">{(mechanic.rating || 0).toFixed(1)}</span>
                                            <span className="text-gray-500">({mechanic.reviews} jobs)</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => navigate(`/customer-portal/mechanic-profile/${mechanic.id}`)} className="flex-1 bg-white/5 hover:bg-white/10 text-white text-xs font-bold py-2 rounded-lg transition border border-white/10">View Profile</button>
                                    <button onClick={() => setIsChatOpen(true)} className="flex-1 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold py-2 rounded-lg transition border border-primary/20">Chat Now</button>
                                </div>
                            </div>
                        )}

                        {/* Vehicle */}
                        <div className="bg-[#151515] rounded-xl p-4 border border-white/5">
                            <p className="text-[10px] font-bold text-gray-500  tracking-widest mb-3">Vehicle Details</p>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-gray-700/30 flex items-center justify-center text-gray-400 overflow-hidden relative">
                                    {vehicle.imageUrls && vehicle.imageUrls.length > 0 ? (
                                        <img
                                            src={vehicle.imageUrls[0]}
                                            alt={`${vehicle.make} ${vehicle.model}`}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 17l4 4 4-4m-4-5v9" /></svg>
                                    )}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white">{vehicle.year} {vehicle.make} {vehicle.model}</p>
                                    <p className="text-xs text-gray-500 font-mono bg-black/30 inline-block px-1.5 py-0.5 rounded mt-1">{vehicle.plateNumber}</p>
                                </div>
                            </div>
                        </div>

                        {/* Notes (Read Only) */}
                        {notes && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-500  tracking-widest flex items-center gap-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                    Notes
                                </label>
                                <div className="p-3 bg-[#151515] rounded-xl border border-white/5 text-sm text-gray-300 ">
                                    "{notes}"
                                </div>
                            </div>
                        )}

                        {/* Important Notice */}
                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 flex gap-3">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-xs text-gray-300 leading-relaxed">
                                <span className="text-yellow-400 font-bold block mb-1">Important</span>
                                Please ensure you're available at the scheduled time. You'll receive real-time updates when the mechanic is on the way.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Bottom Actions */}
                <div className="grid grid-cols-2 gap-3 pb-8">
                    <button
                        onClick={() => navigate('/customer-portal/booking-history')}
                        className="col-span-1 bg-[#151515] border border-white/10 text-white font-bold py-3 rounded-xl hover:bg-white/5 transition text-sm"
                    >
                        View History
                    </button>
                    <button
                        onClick={() => navigate(`/customer-portal/booking-detail/${primaryBooking.id}`)}
                        className="col-span-1 bg-primary text-white font-bold py-3 rounded-xl hover:bg-orange-600 transition text-sm shadow-lg shadow-primary/20"
                    >
                        Track Status
                    </button>
                    <button
                        onClick={handleBookAgain}
                        className="col-span-2 bg-white/5 text-gray-300 font-bold py-3 rounded-xl hover:bg-white/10 transition text-sm border border-white/5"
                    >
                        Book Another Service
                    </button>
                    <button
                        onClick={handleSetReminder}
                        className="col-span-2 bg-blue-500/10 text-blue-400 font-bold py-3 rounded-xl hover:bg-blue-500/20 transition text-sm border border-blue-500/20"
                    >
                        Set Maintenance Reminder
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
