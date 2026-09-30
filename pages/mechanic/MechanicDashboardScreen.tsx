
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
import { Phone, MapPin, MessageSquare, User, Car, Radio, Wifi, WifiOff, AlertTriangle, X } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db as firestore } from '../../firebase';
import { CallButton } from '../../components/CallUI';
import { calculateMechanicWalletLedger, getJobTotalAmount } from '../../utils/mechanicLedger';



const StatCard = React.memo<{ title: string; value: string | number; icon: React.ReactNode; color?: string; tooltip?: string; className?: string; onClick?: () => void }>(({ title, value, icon, color = "text-primary", tooltip, className = "", onClick }) => {
    const cardClass = `w-full bg-[#1A1A1A] p-3 sm:p-5 rounded-3xl border border-white/5 flex items-center gap-3 sm:gap-4 transition-all group ${onClick ? 'cursor-pointer hover:border-white/20 hover:bg-[#252525] active:scale-[0.98]' : 'hover:border-white/10 hover:bg-[#202020]'}`;
    const card = (
        <div className={cardClass} onClick={onClick}>
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
    const { mechanic, updateOnlineStatus, autoOfflineNotice, clearAutoOfflineNotice } = useMechanicAuth();
    const { db, loading, acceptJobRequest } = useDatabase();
    const navigate = useNavigate();

    const isOnline = mechanic?.isOnline ?? false;
    const [newJobRequest, setNewJobRequest] = useState<Booking | null>(null);
    const [newAssignedJob, setNewAssignedJob] = useState<Booking | null>(null);
    const [customerProfile, setCustomerProfile] = useState<any>(null);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    const handleToggleStatus = async () => {
        if (isUpdatingStatus) return;
        setIsUpdatingStatus(true);
        try {
            await updateOnlineStatus(!isOnline);
        } catch (error) {
            console.error("Failed to update status:", error);
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const isBookingApprovedForMechanicView = useCallback((booking: Booking) => {
        const modules = db?.settings?.modules;
        if (modules) {
            const services = booking.services || (booking.service ? [booking.service] : []);
            for (const s of services) {
                const nameLower = (s.name || '').toLowerCase();
                const catLower = (s.category || '').toLowerCase();
                
                if (nameLower.includes('rent a car') || catLower.includes('rentals') || catLower.includes('rent a car')) {
                    if (modules.find(m => m.id === 'rent-a-car')?.enabled === false) return false;
                }
                if (nameLower.includes('driver for hire') || catLower.includes('driver')) {
                    if (modules.find(m => m.id === 'driver-for-hire')?.enabled === false) return false;
                }
                if (nameLower.includes('registration') || nameLower.includes('liaison') || catLower.includes('liaison') || catLower.includes('registration')) {
                    if (modules.find(m => m.id === 'liaison-assistance')?.enabled === false) return false;
                }
                if (nameLower.includes('towing') || catLower.includes('towing')) {
                    if (modules.find(m => m.id === 'towing')?.enabled === false) return false;
                }
            }
        }

        const paymentMethod = (booking.paymentMethod || '').toLowerCase();
        const isGCashBooking = paymentMethod === 'gcash' || !!booking.gcashReceiptUrl || !!booking.gcashPaymentStatus;
        const isHitPayBooking = paymentMethod.includes('hitpay') || paymentMethod.includes('online') || !!booking.hitpayReference || !!booking.hitpayPaymentRequestId;

        if (isGCashBooking) {
            return booking.isVerified === true || booking.gcashPaymentStatus === 'verified';
        }

        if (isHitPayBooking) {
            // Require 50% initial downpayment verification for HitPay bookings
            return booking.isVerified === true || booking.hitpayStatus === 'completed' || booking.paymentStatus === 'downpayment_paid' || booking.paymentStatus === 'partial' || booking.isPaid === true || ((booking.paidAmount || 0) > 0);
        }

        // For other methods, if paymentStatus is pending or unpaid, gate behind verification
        return booking.isVerified === true || booking.isPaid === true || booking.paymentStatus === 'paid' || booking.paymentStatus === 'downpayment_paid' || booking.paymentStatus === 'partial';
    }, [db?.settings?.modules]);

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

        return () => { try { unsubscribe(); } catch (_) {} };
    }, [ongoingJob?.customerId]);

    const myBookings = useMemo(() => {
        if (!mechanic || !db) return [];
        return db.bookings.filter(b => 
            (b.mechanic?.id === mechanic.id || b.mechanicId === mechanic.id) &&
            isBookingApprovedForMechanicView(b) &&
            b.status !== 'Cancelled'
        );
    }, [db, mechanic, isBookingApprovedForMechanicView]);

    const [jobsTab, setJobsTab] = useState<'accepted' | 'completed'>('accepted');

    const acceptedJobs = useMemo(() => {
        return myBookings.filter(b => ['Accepted', 'Upcoming', 'En Route', 'In Progress'].includes(b.status));
    }, [myBookings]);

    const completedJobs = useMemo(() => {
        return myBookings.filter(b => b.status === 'Completed');
    }, [myBookings]);



    const walletLedger = useMemo(() => {
        if (!mechanic || !db) {
            return {
                lifetimeEarnings: 0,
                availableBalance: 0,
                lockedBalance: 0,
                pendingPayoutsTotal: 0,
                approvedPayoutsTotal: 0,
                paidPayoutsTotal: 0,
                completedJobsCount: 0
            };
        }
        const currentMechanicDoc = db.mechanics.find(m => m.id === mechanic.id) || mechanic;
        const serviceFeePercentage = db?.settings?.serviceFeePercentage ?? 10;
        return calculateMechanicWalletLedger(mechanic.id, currentMechanicDoc, db.bookings || [], db.payouts || [], serviceFeePercentage);
    }, [db, mechanic]);

    const analyticsData = useMemo(() => {
        if (!mechanic || !db) return null;

        const todayStr = new Date().toLocaleDateString('en-CA');

        const myJobsToday = db.bookings.filter(b => {
            if (!(b.mechanic?.id === mechanic.id || b.mechanicId === mechanic.id)) return false;
            if (!isBookingApprovedForMechanicView(b)) return false;
            
            let jobDateStr = b.date;
            if (jobDateStr && jobDateStr.includes('T')) {
                jobDateStr = new Date(jobDateStr).toLocaleDateString('en-CA');
            }
            return jobDateStr === todayStr;
        });

        const jobsCompletedToday = myJobsToday.filter(b => b.status === 'Completed' && b.isPaid !== false && b.paymentStatus !== 'failed');
        const earningsToday = jobsCompletedToday.reduce((sum, job) => sum + getJobTotalAmount(job), 0);

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
    }, [db, mechanic, isBookingApprovedForMechanicView]);

    const lifetimeStats = useMemo(() => {
        if (!mechanic || !db) return { averageJobValue: 0 };

        const completedJobs = db.bookings.filter(b => 
            (b.mechanic?.id === mechanic.id || b.mechanicId === mechanic.id) && 
            isBookingApprovedForMechanicView(b) && 
            b.status === 'Completed' && b.isPaid !== false && b.paymentStatus !== 'failed'
        );
        if (completedJobs.length === 0) return { averageJobValue: 0 };

        const totalEarnings = completedJobs.reduce((sum, job) => sum + getJobTotalAmount(job), 0);
        const averageJobValue = totalEarnings / completedJobs.length;

        return { averageJobValue };
    }, [db, mechanic, isBookingApprovedForMechanicView]);

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
            .filter(b => b.status === 'Upcoming' && !b.mechanic && isBookingApprovedForMechanicView(b) && !declinedJobIds.includes(b.id))
            .sort((a, b) => b.id.localeCompare(a.id))[0]; // Get the newest one

        if (latestUnassignedJob && latestUnassignedJob.id !== newJobRequest?.id) {
            setNewJobRequest(latestUnassignedJob);
        } else if (!latestUnassignedJob && newJobRequest) {
            // If no job is found, but we are displaying one, it might have been taken. Clear it.
            setNewJobRequest(null);
        }

    }, [db, isOnline, ongoingJob, mechanic, newJobRequest, isBookingApprovedForMechanicView]);

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
                            <Tooltip content={
                                mechanic.verificationDocuments?.verificationStatus !== 'Approved'
                                    ? 'Account pending verification. Cannot go online yet.'
                                    : isOnline
                                        ? 'Status: LIVE & ONLINE. Ready for new jobs. Tap to switch to Offline.'
                                        : 'Status: OFFLINE. New requests paused. Tap to switch to Online.'
                            }>
                                <button
                                    type="button"
                                    disabled={mechanic.verificationDocuments?.verificationStatus !== 'Approved' || isUpdatingStatus}
                                    onClick={handleToggleStatus}
                                    aria-label={isOnline ? "Switch to offline mode" : "Switch to online mode"}
                                    className={`group relative flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-full border transition-all duration-300 select-none shadow-sm ${
                                        isOnline 
                                            ? 'bg-emerald-950/40 hover:bg-emerald-900/50 border-emerald-500/40 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]' 
                                            : 'bg-[#1e1e1e] hover:bg-[#252525] border-white/10 text-gray-400 hover:text-gray-200'
                                    } ${
                                        mechanic.verificationDocuments?.verificationStatus !== 'Approved' 
                                            ? 'opacity-40 cursor-not-allowed' 
                                            : 'cursor-pointer active:scale-95'
                                    } ${isUpdatingStatus ? 'opacity-80 pointer-events-none' : ''}`}
                                >
                                    {/* Status Dot / Ping or Spinner */}
                                    <span className="relative flex h-3 w-3 items-center justify-center shrink-0">
                                        {isUpdatingStatus ? (
                                            <span className="w-2.5 h-2.5 rounded-full border-2 border-current border-t-transparent animate-spin"></span>
                                        ) : isOnline ? (
                                            <>
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 shadow-[0_0_8px_#34d399]"></span>
                                            </>
                                        ) : (
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-gray-500 group-hover:bg-gray-400 transition-colors"></span>
                                        )}
                                    </span>

                                    {/* Status Text & Live details */}
                                    <span className="text-[10.5px] sm:text-[11px] font-black tracking-[0.14em] uppercase transition-colors flex items-center gap-1.5 leading-none">
                                        {isUpdatingStatus ? (
                                            'Syncing...'
                                        ) : isOnline ? (
                                            <>
                                                <span>Online</span>
                                                <span className="hidden sm:inline-block w-1.5 h-1.5 rounded-full bg-emerald-400/40"></span>
                                                <span className="hidden sm:inline-block text-[9px] text-emerald-400/80 font-bold lowercase tracking-normal">live</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>Offline</span>
                                            </>
                                        )}
                                    </span>
                                </button>
                            </Tooltip>
                        </div>
                    </div>
                }
            />

            <div className="flex-grow p-4 space-y-6 overflow-y-auto">
                {/* Inactivity Auto-Offline Alert Notice */}
                {autoOfflineNotice && (
                    <div className="bg-amber-950/40 border border-amber-500/40 rounded-2xl p-4 flex items-start justify-between gap-3 text-amber-200 animate-fadeIn shadow-lg shadow-amber-950/20">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-xs font-black uppercase tracking-wider text-amber-400">Status Changed to Offline</h4>
                                <p className="text-xs text-amber-200/90 mt-0.5 leading-relaxed font-medium">{autoOfflineNotice}</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={clearAutoOfflineNotice}
                            className="p-1 text-amber-400/80 hover:text-amber-200 hover:bg-white/5 rounded-lg transition-colors"
                            aria-label="Dismiss notice"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

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
                                    <h2 className="text-[8px] font-black text-primary tracking-[0.25em] uppercase">Active Assignment</h2>
                                </div>
                                <span className="px-3.5 py-1 bg-primary/10 text-primary text-[8px] font-black tracking-widest rounded-full border border-primary/20 flex items-center gap-1.5 shadow-sm">
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
                                                <p className="text-[12px] font-black text-white tracking-tight leading-tight">{ongoingJob.customerName || 'Customer'}</p>
                                            </div>
                                            <p className="text-[8px] text-gray-400 font-medium mt-0.5">{customer?.phone || ongoingJob.phone || 'No phone'}</p>
                                        </div>
                                    </div>

                                    {/* Action dial/navigate items */}
                                    <div className="flex gap-2 items-center">
                                        {customer?.id && (
                                            <Tooltip content="Call Customer">
                                                <div>
                                                    <CallButton targetId={customer.id} targetRole="customer" targetName={customer.name || 'Customer'} targetImage={customer.picture} size="md" />
                                                </div>
                                            </Tooltip>
                                        )}
                                        {ongoingJob.id && (
                                            <Tooltip content="Live Chat">
                                                <button 
                                                    onClick={() => navigate(`/mechanic-portal/job/${ongoingJob.id}?chat=true`)}
                                                    className="w-10 h-10 flex items-center justify-center bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-full border border-primary/20 hover:border-primary transition-all shadow-md active:scale-90"
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
                                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-white/5 to-white/10 border-2 border-white/20 overflow-hidden flex-shrink-0 shadow-lg relative">
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
                                            <p className="text-[10px] font-extrabold text-white tracking-tight leading-none">
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
                                    {((ongoingJob.location?.lat && ongoingJob.location?.lng) || (customer?.lat && customer?.lng) || ongoingJob.location?.address) && (
                                        <Tooltip content="Navigate to Customer">
                                            <button
                                                onClick={() => {
                                                    const lat = ongoingJob.location?.lat || customer?.lat;
                                                    const lng = ongoingJob.location?.lng || customer?.lng;
                                                    if (lat && lng) {
                                                        window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
                                                    } else if (ongoingJob.location?.address) {
                                                        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ongoingJob.location.address)}`, '_blank');
                                                    }
                                                }}
                                                className="w-10 h-10 flex items-center justify-center bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-full border border-primary/20 hover:border-primary transition-all active:scale-95 shadow-md"
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
                                    onClick={() => navigate('/mechanic-portal/earnings')}
                                />
                                <StatCard
                                    title="Wallet"
                                    value={`₱${walletLedger.availableBalance.toLocaleString()}`}
                                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>}
                                    color="text-primary"
                                    tooltip="Your current wallet balance"
                                    onClick={() => navigate('/mechanic-portal/earnings')}
                                />
                                <StatCard
                                    title="Success"
                                    value={analyticsData.jobsCompletedTodayCount}
                                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>}
                                    color="text-blue-400"
                                    tooltip="Jobs completed today"
                                    onClick={() => navigate('/mechanic-portal/earnings')}
                                />
                                <StatCard
                                    title="Agenda"
                                    value={analyticsData.agendaCount}
                                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                                    color="text-purple-400"
                                    tooltip="Upcoming jobs scheduled"
                                    onClick={() => navigate('/mechanic-portal/calendar')}
                                />
                                <StatCard
                                    title="Rate"
                                    value={`₱${Math.round(lifetimeStats.averageJobValue).toLocaleString()}`}
                                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
                                    color="text-orange-400"
                                    tooltip="Average payout per job"
                                    onClick={() => navigate('/mechanic-portal/earnings')}
                                />
                            </div>
                        </div>



                    </div>
                )}
            </div>
        </div>
    );
};

export default MechanicDashboardScreen;
