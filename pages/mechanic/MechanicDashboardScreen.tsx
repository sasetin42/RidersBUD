
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import Spinner from '../../components/Spinner';
import { useMechanicAuth } from '../../context/MechanicAuthContext';
import { useDatabase } from '../../context/DatabaseContext';
import { Booking } from '../../types';
import { useNavigate } from 'react-router-dom';
import MechanicCalendar from '../../components/mechanic/MechanicCalendar';
import AssignedJobNotificationModal from '../../components/mechanic/AssignedJobNotificationModal';
import MechanicVerificationModal from '../../components/MechanicVerificationModal';
import NotificationBell from '../../components/NotificationBell';
import Header from '../../components/Header';
import Tooltip from '../../components/ui/Tooltip';
import { Phone, MapPin, MessageSquare, User, Car } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db as firestore } from '../../firebase';
import { CallButton } from '../../components/CallUI';



const StatCard = React.memo<{ title: string; value: string | number; icon: React.ReactNode; color?: string; tooltip?: string; className?: string }>(({ title, value, icon, color = "text-primary", tooltip, className = "" }) => {
    const card = (
        <div className="w-full bg-[#1A1A1A] p-3 sm:p-5 rounded-3xl border border-white/5 flex items-center gap-3 sm:gap-4 hover:border-white/10 transition-all hover:bg-[#202020] group">
            <div className={`p-2 sm:p-3 rounded-2xl bg-white/5 ${color} group-hover:scale-110 transition-transform shadow-inner`}>
                {icon}
            </div>
            <div>
                <p className="text-lg sm:text-2xl font-black text-white tracking-tighter leading-none">{value}</p>
                <p className="text-[10px] sm:text-xs text-gray-400 font-bold  tracking-widest mt-1 opacity-60">{title}</p>
            </div>
        </div>
    );
    if (tooltip) {
        return <Tooltip content={tooltip} className={`w-full ${className}`}>{card}</Tooltip>;
    }
    return <div className={`w-full ${className}`}>{card}</div>;
});

const NewJobRequestModal: React.FC<{
    booking: Booking;
    onAccept: () => void;
    onDecline: () => void;
}> = ({ booking, onAccept, onDecline }) => {
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-2xl z-[100] flex items-center justify-center p-6 animate-fadeIn">
            <div className="bg-[#121212] border border-white/10 rounded-[3rem] p-10 shadow-2xl w-full max-w-sm text-center animate-scaleUp relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary/50 via-primary to-primary/50"></div>

                <div className="w-20 h-20 rounded-[2.5rem] bg-primary/10 flex items-center justify-center text-primary mx-auto mb-8 shadow-inner animate-pulse">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                </div>

                <h2 className="text-2xl font-black text-white  tracking-tighter mb-2 leading-none">New Job Request</h2>
                <p className="text-[10px] text-gray-500 font-bold  tracking-[0.3em] mb-8">Ready for Action?</p>

                <div className="bg-white/5 rounded-3xl p-6 mb-8 border border-white/5 space-y-4 text-left">
                    <div className="flex justify-between items-end">
                        <span className="text-[9px] font-black text-gray-500  tracking-widest leading-none">Service</span>
                        <span className="text-sm font-black text-white leading-none tracking-tight">{booking.service?.name || booking.services?.[0]?.name || 'Service'}</span>
                    </div>
                    <div className="flex justify-between items-end">
                        <span className="text-[9px] font-black text-gray-500  tracking-widest leading-none">Vehicle</span>
                        <span className="text-xs font-bold text-gray-300 leading-none tracking-tight">{booking.vehicle?.make || ''} {booking.vehicle?.model || ''}</span>
                    </div>
                    <div className="pt-4 border-t border-white/5 flex justify-between items-baseline">
                        <span className="text-[9px] font-black text-gray-500  tracking-widest leading-none">Potential Payout</span>
                        <span className="text-2xl font-black text-green-400 leading-none tracking-tighter">₱{(booking.service?.price || booking.services?.[0]?.price || 0).toLocaleString()}</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Tooltip content="Decline this job request">
                        <button onClick={onDecline} className="bg-white/5 hover:bg-white/10 text-white font-black py-5 rounded-[1.5rem] text-[10px]  tracking-widest border border-white/5 transition-all active:scale-95">Decline</button>
                    </Tooltip>
                    <Tooltip content="Accept this job and start working">
                        <button onClick={onAccept} className="bg-primary text-white font-black py-5 rounded-[1.5rem] text-[10px]  tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.05] active:scale-95 transition-all">Accept Job</button>
                    </Tooltip>
                </div>
            </div>
        </div>
    );
};




const MechanicDashboardScreen: React.FC = () => {
    const { mechanic, updateOnlineStatus } = useMechanicAuth();
    const { db, loading, acceptJobRequest } = useDatabase();
    const navigate = useNavigate();

    const isOnline = mechanic?.isOnline ?? false;
    const [newJobRequest, setNewJobRequest] = useState<Booking | null>(null);
    const [newAssignedJob, setNewAssignedJob] = useState<Booking | null>(null);
    const [customerProfile, setCustomerProfile] = useState<any>(null);

    const isBookingApprovedForMechanicView = useCallback((booking: Booking) => {
        const paymentMethod = (booking.paymentMethod || '').toLowerCase();
        const isGCashBooking = paymentMethod === 'gcash' || !!booking.gcashReceiptUrl || !!booking.gcashPaymentStatus;

        if (!isGCashBooking) return true;

        return booking.isVerified === true || booking.gcashPaymentStatus === 'verified';
    }, []);

    // Find the currently active job for the mechanic
    const ongoingJob = useMemo(() => {
        if (!mechanic || !db) return null;
        return db.bookings.find(b => 
            (b.mechanic?.id === mechanic.id || b.mechanicId === mechanic.id) &&
            isBookingApprovedForMechanicView(b) &&
            (b.status === 'En Route' || b.status === 'In Progress')
        );
    }, [mechanic, db, isBookingApprovedForMechanicView]);

    // Live customer profile tracking for active assignment
    useEffect(() => {
        if (!ongoingJob?.customerId) {
            setCustomerProfile(null);
            return;
        }

        const customerDocRef = doc(firestore, 'customers', ongoingJob.customerId);
        const unsubscribe = onSnapshot(customerDocRef, (docSnap) => {
            if (docSnap.exists()) {
                setCustomerProfile({ id: docSnap.id, ...docSnap.data() });
            } else {
                setCustomerProfile(null);
            }
        }, (error) => {
            console.warn("Failed to listen to customer profile:", error);
        });

        return () => unsubscribe();
    }, [ongoingJob?.customerId]);

    const myBookings = useMemo(() => {
        if (!mechanic || !db) return [];
        return db.bookings.filter(b => 
            (b.mechanic?.id === mechanic.id || b.mechanicId === mechanic.id) &&
            isBookingApprovedForMechanicView(b) &&
            b.status !== 'Cancelled'
        );
    }, [db, mechanic, isBookingApprovedForMechanicView]);



    const analyticsData = useMemo(() => {
        if (!mechanic || !db) return null;

        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        const myJobsToday = db.bookings.filter(b => 
            (b.mechanic?.id === mechanic.id || b.mechanicId === mechanic.id) && 
            b.date === todayStr
        );

        const jobsCompletedToday = myJobsToday.filter(b => b.status === 'Completed');
        const earningsToday = jobsCompletedToday.reduce((sum, job) => sum + (job.service?.price || job.services?.[0]?.price || 0), 0);

        const timeTo24h = (timeStr: string | undefined) => {
            if (!timeStr) return '00:00';
            try {
                const [time, modifier] = timeStr.split(' ');
                let [hours, minutes] = (time || '00:00').split(':');
                if (hours === '12') {
                    hours = '00';
                }
                if (modifier === 'PM') {
                    hours = (parseInt(hours || '0', 10) + 12).toString();
                }
                return `${(hours || '00').padStart(2, '0')}:${minutes || '00'}`;
            } catch (e) {
                return '00:00';
            }
        };

        const agendaJobs = myJobsToday
            .filter(b => b.status === 'Upcoming' || b.status === 'En Route')
            .sort((a, b) => timeTo24h(a.time).localeCompare(timeTo24h(b.time)));

        return {
            earningsToday,
            jobsCompletedTodayCount: jobsCompletedToday.length,
            agendaJobs,
            agendaCount: agendaJobs.length
        };
    }, [db, mechanic]);

    const lifetimeStats = useMemo(() => {
        if (!mechanic || !db) return { averageJobValue: 0 };

        const completedJobs = db.bookings.filter(b => 
            (b.mechanic?.id === mechanic.id || b.mechanicId === mechanic.id) && 
            b.status === 'Completed'
        );
        if (completedJobs.length === 0) return { averageJobValue: 0 };

        const totalEarnings = completedJobs.reduce((sum, job) => sum + (job.service?.price || job.services?.[0]?.price || 0), 0);
        const averageJobValue = totalEarnings / completedJobs.length;

        return { averageJobValue };
    }, [db, mechanic]);

    // Real-time check for new UNASSIGNED job requests
    useEffect(() => {
        if (!db || !isOnline || ongoingJob) {
            setNewJobRequest(null);
            return;
        };

        const declinedJobsJSON = sessionStorage.getItem(`declinedJobs_${mechanic?.id}`);
        const declinedJobIds: string[] = declinedJobsJSON ? JSON.parse(declinedJobsJSON) : [];

        // Find the latest unassigned job that hasn't been declined in this session
        const latestUnassignedJob = db.bookings
            .filter(b => b.status === 'Upcoming' && !b.mechanic && !declinedJobIds.includes(b.id))
            .sort((a, b) => b.id.localeCompare(a.id))[0]; // Get the newest one

        if (latestUnassignedJob && latestUnassignedJob.id !== newJobRequest?.id) {
            setNewJobRequest(latestUnassignedJob);
        } else if (!latestUnassignedJob && newJobRequest) {
            // If no job is found, but we are displaying one, it might have been taken. Clear it.
            setNewJobRequest(null);
        }

    }, [db, isOnline, ongoingJob, mechanic, newJobRequest]);

    // Real-time check for new ASSIGNED job requests
    useEffect(() => {
        if (!mechanic || !db) return;

        const sessionNotifiedKey = `notifiedBookings_${mechanic.id}`;
        const notifiedBookingIds: Set<string> = new Set(
            JSON.parse(sessionStorage.getItem(sessionNotifiedKey) || '[]')
        );

        const myUnseenBookings = db.bookings.filter(b =>
            (b.mechanic?.id === mechanic.id || b.mechanicId === mechanic.id) &&
            isBookingApprovedForMechanicView(b) &&
            b.status !== 'Completed' &&
            b.status !== 'Cancelled' &&
            b.status !== 'Work Done' &&
            !notifiedBookingIds.has(b.id)
        );

        if (myUnseenBookings.length > 0) {
            // Show the newest unseen booking.
            const newestUnseenBooking = myUnseenBookings.sort((a, b) => b.id.localeCompare(a.id))[0];
            if (newestUnseenBooking.id !== newAssignedJob?.id) {
                setNewAssignedJob(newestUnseenBooking);
            }

            // Update the session storage to mark all found unseen bookings as seen.
            myUnseenBookings.forEach(b => notifiedBookingIds.add(b.id));
            sessionStorage.setItem(sessionNotifiedKey, JSON.stringify(Array.from(notifiedBookingIds)));
        }
    }, [db, mechanic, newAssignedJob, isBookingApprovedForMechanicView]);

    const handleAcceptJob = useCallback(() => {
        if (newJobRequest && mechanic) {
            acceptJobRequest(newJobRequest.id, mechanic);
            setNewJobRequest(null);
        }
    }, [newJobRequest, mechanic, acceptJobRequest]);

    const handleDeclineJob = useCallback(() => {
        if (!newJobRequest || !mechanic) return;

        const declinedJobsJSON = sessionStorage.getItem(`declinedJobs_${mechanic.id}`);
        const declinedJobIds: string[] = declinedJobsJSON ? JSON.parse(declinedJobsJSON) : [];

        if (!declinedJobIds.includes(newJobRequest.id)) {
            declinedJobIds.push(newJobRequest.id);
            sessionStorage.setItem(`declinedJobs_${mechanic.id}`, JSON.stringify(declinedJobIds));
        }

        // Clear the current request. The useEffect will then find the next available one.
        setNewJobRequest(null);
    }, [newJobRequest, mechanic]);



    if (loading || !db || !mechanic) {
        return (
            <div className="flex flex-col h-full bg-secondary">
                <div className="p-4 bg-[#1D1D1D] border-b border-dark-gray">
                    <h1 className="text-2xl font-bold text-white">Dashboard</h1>
                </div>
                <div className="flex-grow flex items-center justify-center">
                    <Spinner size="lg" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-secondary">
            {/* Show Verification Modal if not approved */}
            {(mechanic?.verificationDocuments?.verificationStatus !== 'Approved') && (
                <MechanicVerificationModal />
            )}

            {isOnline && newJobRequest && !ongoingJob && (
                <NewJobRequestModal
                    booking={newJobRequest}
                    onAccept={handleAcceptJob}
                    onDecline={handleDeclineJob}
                />
            )}
            {newAssignedJob && (
                <AssignedJobNotificationModal
                    booking={newAssignedJob}
                    onClose={() => setNewAssignedJob(null)}
                />
            )}

            {/* Global Header */}
            <Header
                title="Dashboard"
                subtitle={`Hello, ${mechanic.name?.split(' ')[0] || 'Mechanic'}`}
                rightAction={
                    <div className="flex items-center gap-3">
                        <Tooltip content="View notifications">
                            <NotificationBell />
                        </Tooltip>
                        <div className="flex items-center">
                            <Tooltip content={isOnline ? 'Go offline' : 'Go online to receive jobs'}>
                                <button
                                    type="button"
                                    disabled={mechanic.verificationDocuments?.verificationStatus !== 'Approved'}
                                    onClick={() => updateOnlineStatus(!isOnline)}
                                    className={`relative flex items-center justify-between gap-2.5 px-3.5 py-2 rounded-full transition-all duration-300 active:scale-95 border select-none ${
                                        isOnline 
                                            ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-400 hover:from-emerald-500/30 hover:to-teal-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)] font-extrabold' 
                                            : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:border-white/10 font-bold'
                                    } ${mechanic.verificationDocuments?.verificationStatus !== 'Approved' ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
                                >
                                    <span className="relative flex h-2.5 w-2.5">
                                        {isOnline && (
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        )}
                                        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isOnline ? 'bg-emerald-500' : 'bg-gray-500'}`}></span>
                                    </span>
                                    <span className="text-[10px] font-black tracking-[0.18em] uppercase transition-colors leading-none">
                                        {isOnline ? 'Online' : 'Offline'}
                                    </span>
                                </button>
                            </Tooltip>
                        </div>
                    </div>
                }
            />

            <div className="flex-grow p-4 space-y-6 overflow-y-auto">
                {/* Ongoing Job - Enhanced */}
                {ongoingJob && (() => {
                    // Fetch customer data for enhanced display from live customerProfile state or local db fallback
                    const customer = customerProfile || db.customers.find(c => c.name === ongoingJob.customerName || c.id === ongoingJob.customerId);

                    // Get vehicle image with garage sync
                    const vehicleImage =
                        ongoingJob.vehicle?.image ||
                        ongoingJob.vehicle?.imageUrl ||
                        ongoingJob.vehicle?.imageUrls?.[0] ||
                        customer?.garage?.find((v: any) => v.id === ongoingJob.vehicleId)?.image ||
                        customer?.garage?.find((v: any) => v.id === ongoingJob.vehicleId)?.imageUrl ||
                        customer?.garage?.find((v: any) => v.id === ongoingJob.vehicleId)?.imageUrls?.[0] ||
                        customer?.garage?.find((v: any) => v.plateNumber === ongoingJob.vehicle?.plateNumber)?.image ||
                        customer?.garage?.find((v: any) => v.plateNumber === ongoingJob.vehicle?.plateNumber)?.imageUrl ||
                        customer?.garage?.find((v: any) => v.plateNumber === ongoingJob.vehicle?.plateNumber)?.imageUrls?.[0] ||
                        customer?.vehicles?.find((v: any) => v.id === ongoingJob.vehicleId)?.imageUrl ||
                        customer?.vehicles?.find((v: any) => v.id === ongoingJob.vehicleId)?.imageUrls?.[0] ||
                        ongoingJob.vehicleImage;

                    return (
                        <div className="bg-[#121212] p-6 rounded-[2.3rem] border-2 border-primary/30 shadow-2xl relative overflow-hidden group">
                            {/* Accent Glow Background */}
                            <div className="absolute -right-20 -top-20 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none group-hover:bg-primary/20 transition-all duration-500"></div>
                            
                            {/* Header */}
                            <div className="flex justify-between items-center mb-5 relative z-10">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
                                    <h2 className="text-[10px] font-black text-primary tracking-[0.25em] uppercase">Active Assignment</h2>
                                </div>
                                <span className="px-3.5 py-1 bg-primary/10 text-primary text-[10px] font-black tracking-widest rounded-full border border-primary/20 flex items-center gap-1.5 shadow-sm">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                                    {ongoingJob.status}
                                </span>
                            </div>

                            {/* Customer Profile Hub - Highly Interactive */}
                            <div className="bg-white/5 rounded-2.5xl p-5 border border-white/5 relative z-10 transition-all hover:border-white/10 hover:bg-white/[0.07] mb-4">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-4">
                                        {/* Customer Profile Image with Real-time pulsing online status */}
                                        <div className="relative">
                                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/30 to-orange-600/30 border-2 border-primary/40 overflow-hidden flex-shrink-0 shadow-inner">
                                                <img
                                                    src={customer?.picture || customer?.imageUrl || customer?.avatar || '/riders-logo.png'}
                                                    alt={ongoingJob.customerName}
                                                    className="w-full h-full object-cover"
                                                    loading="lazy"
                                                    onError={(e) => { (e.target as HTMLImageElement).src = '/riders-logo.png'; }}
                                                />
                                            </div>
                                            {/* Pulse Online Indicator */}
                                            <div className="absolute bottom-0 right-0 w-4 h-4 bg-[#121212] rounded-full flex items-center justify-center">
                                                <span className={`w-2.5 h-2.5 rounded-full ${customer?.isOnline ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-gray-500'} transition-all`} />
                                            </div>
                                        </div>
                                        
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className="text-lg font-black text-white tracking-tight leading-tight">{ongoingJob.customerName || 'Customer'}</p>
                                            </div>
                                            <p className="text-xs text-gray-400 font-medium mt-0.5">{customer?.phone || ongoingJob.phone || 'No phone'}</p>
                                        </div>
                                    </div>

                                    {/* Action dial/navigate items */}
                                    <div className="flex gap-2">
                                        {customer?.id && (
                                            <Tooltip content="Call Customer">
                                                <div className="flex items-center">
                                                    <CallButton targetId={customer.id} targetRole="customer" targetName={customer.name || 'Customer'} targetImage={customer.picture} size="sm" />
                                                    {customer?.phone && (
                                                        <a href={`tel:${customer.phone}`} className="p-2.5 bg-green-500/10 hover:bg-green-500 text-green-400 hover:text-white rounded-xl border border-green-500/20 hover:border-green-500 transition-all shadow-md active:scale-90 ml-1">
                                                            <Phone size={14} className="stroke-[2.5]" />
                                                        </a>
                                                    )}
                                                </div>
                                            </Tooltip>
                                        )}
                                        {ongoingJob.id && (
                                            <Tooltip content="Live Chat">
                                                <button 
                                                    onClick={() => navigate(`/mechanic-portal/job/${ongoingJob.id}?chat=true`)}
                                                    className="p-2.5 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-xl border border-primary/20 hover:border-primary transition-all shadow-md active:scale-90"
                                                >
                                                    <MessageSquare size={14} className="stroke-[2.5]" />
                                                </button>
                                            </Tooltip>
                                        )}
                                    </div>
                                </div>

                                {/* Service Details Grid */}
                                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/10 text-xs">
                                    <div className="bg-black/20 p-2.5 rounded-xl border border-white/5">
                                        <p className="text-gray-500 font-bold text-[9px] uppercase tracking-wider mb-0.5">Selected Service</p>
                                        <p className="text-white font-extrabold truncate">{ongoingJob.service?.name || ongoingJob.services?.[0]?.name || 'Service'}</p>
                                    </div>
                                    <div className="bg-black/20 p-2.5 rounded-xl border border-white/5">
                                        <p className="text-gray-500 font-bold text-[9px] uppercase tracking-wider mb-0.5">Est. Price</p>
                                        <p className="text-green-400 font-black">₱{(ongoingJob.service?.price || ongoingJob.services?.[0]?.price || 0).toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Vehicle Card - Premium Glass */}
                            <div className="bg-white/5 rounded-2.5xl p-4 border border-white/5 relative z-10 transition-all hover:border-white/10 hover:bg-white/[0.07] mb-5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3.5">
                                        {/* Vehicle Image */}
                                        <div className="w-20 h-14 rounded-xl bg-gradient-to-br from-white/5 to-white/10 border-2 border-white/20 overflow-hidden flex-shrink-0 shadow-lg relative">
                                            {vehicleImage ? (
                                                <img
                                                    src={vehicleImage}
                                                    alt="Vehicle"
                                                    className="w-full h-full object-cover"
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gray-900">
                                                    <Car className="h-6 w-6 text-gray-500" />
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm font-extrabold text-white tracking-tight leading-none">
                                                {ongoingJob.vehicle?.year || ''} {ongoingJob.vehicle?.make || ''} {ongoingJob.vehicle?.model || ''}
                                            </p>
                                            <div className="flex gap-2 mt-1.5 items-center">
                                                <span className="text-[9px] bg-white/5 text-gray-300 px-1.5 py-0.5 rounded font-black border border-white/5">
                                                    {ongoingJob.vehicle?.plateNumber || 'NO PLATE'}
                                                </span>
                                                {ongoingJob.vehicle?.color && (
                                                    <span className="text-[9px] text-gray-400 font-medium capitalize">
                                                        • {ongoingJob.vehicle.color}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Maps Navigation */}
                                    {((customer?.lat && customer?.lng) || (ongoingJob.location?.lat && ongoingJob.location?.lng) || ongoingJob.location?.address) && (
                                        <Tooltip content="Navigate to Customer">
                                            <button
                                                onClick={() => {
                                                    const lat = customer?.lat || ongoingJob.location?.lat;
                                                    const lng = customer?.lng || ongoingJob.location?.lng;
                                                    if (lat && lng) {
                                                        window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
                                                    } else if (ongoingJob.location?.address) {
                                                        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ongoingJob.location.address)}`, '_blank');
                                                    }
                                                }}
                                                className="p-3 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-xl border border-primary/20 hover:border-primary transition-all active:scale-95 shadow-md"
                                            >
                                                <MapPin size={16} className="stroke-[2.5]" />
                                            </button>
                                        </Tooltip>
                                    )}
                                </div>
                            </div>

                            {/* Service Status and Actions */}
                            <div className="flex gap-3 relative z-10">
                                <Tooltip content="Continue with this active job">
                                    <button
                                        onClick={() => navigate(`/mechanic-portal/job/${ongoingJob.id}`)}
                                        className="flex-1 bg-gradient-to-r from-primary to-orange-600 hover:from-orange-600 hover:to-primary text-white font-black py-4 rounded-2xl transition-all text-xs tracking-widest shadow-xl shadow-primary/20 active:scale-95 flex items-center justify-center gap-2 border border-primary/40"
                                    >
                                        Continue Service
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                </Tooltip>
                            </div>
                        </div>
                    );
                })()}

                {analyticsData && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-lg font-semibold text-white mb-3">My Calendar</h2>
                            <MechanicCalendar
                                bookings={myBookings}
                                unavailableDates={mechanic.unavailableDates || []}
                            />
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-4 px-1">
                                <h2 className="text-xs font-black text-gray-400  tracking-[0.25em]">Today's Summary</h2>
                                <span className="text-[10px] font-black text-white/40  tracking-widest bg-white/5 px-2 py-1 rounded-lg border border-white/5">
                                    {new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-3 sm:gap-6">
                                <StatCard
                                    title="Earnings"
                                    value={`₱${analyticsData.earningsToday.toLocaleString()}`}
                                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
                                    color="text-green-400"
                                    tooltip="Total earnings today"
                                    className="col-span-2"
                                />
                                <StatCard
                                    title="Wallet"
                                    value={`₱${(mechanic.walletBalance || 0).toLocaleString()}`}
                                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>}
                                    color="text-primary"
                                    tooltip="Your current wallet balance"
                                />
                                <StatCard
                                    title="Success"
                                    value={analyticsData.jobsCompletedTodayCount}
                                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>}
                                    color="text-blue-400"
                                    tooltip="Jobs completed today"
                                />
                                <StatCard
                                    title="Agenda"
                                    value={analyticsData.agendaCount}
                                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                                    color="text-purple-400"
                                    tooltip="Upcoming jobs scheduled"
                                />
                                <StatCard
                                    title="Rate"
                                    value={`₱${Math.round(lifetimeStats.averageJobValue).toLocaleString()}`}
                                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
                                    color="text-orange-400"
                                    tooltip="Average payout per job"
                                />
                            </div>
                        </div>



                        {analyticsData.agendaJobs.length > 0 && (
                            <div className="animate-fadeIn">
                                <h2 className="text-xs font-black text-gray-400  tracking-[0.25em] mb-4 px-1 leading-none">Up Next</h2>
                                <div className="bg-[#1A1A1A] rounded-[2rem] border border-white/5 overflow-hidden shadow-2xl">
                                    {analyticsData.agendaJobs.map((job, index) => (
                                        <div key={job.id} onClick={() => navigate(`/mechanic-portal/job/${job.id}`)} className={`flex items-center p-5 cursor-pointer hover:bg-white/5 transition-all ${index < analyticsData.agendaJobs.length - 1 ? 'border-b border-white/5' : ''} group`}>
                                            <div className="w-1/4 text-xs font-black text-primary  tracking-tighter leading-none">{job.time}</div>
                                            <div className="flex-grow">
                                                <p className="font-extrabold text-white text-sm tracking-tight">{job.service?.name || job.services?.[0]?.name || 'Service'}</p>
                                                <p className="text-[10px] text-gray-500 font-bold  tracking-widest mt-0.5">{job.customerName}</p>
                                            </div>
                                            <Tooltip content="View job details">
                                                <div className="p-2 rounded-xl bg-white/5 group-hover:bg-primary/20 group-hover:text-primary transition-all">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                                                </div>
                                            </Tooltip>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {!ongoingJob && (!newJobRequest || !isOnline) && analyticsData?.agendaJobs.length === 0 && (
                    <div className="text-center text-light-gray pt-16">
                        <p>{isOnline ? "You have no jobs on your agenda. Waiting for new requests..." : "You are offline. Go online to receive jobs."}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MechanicDashboardScreen;
