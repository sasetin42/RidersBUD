import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Booking, BookingStatus } from '../types';
import { useDatabase } from '../context/DatabaseContext';
import { useAuth } from '../context/AuthContext';
import CustomerMechanicChatModal from './customer/CustomerMechanicChatModal';

const RescheduleModal: React.FC<{
    booking: Booking;
    onClose: () => void;
    onConfirm: (newDate: string, newTime: string, reason: string) => void;
}> = ({ booking, onClose, onConfirm }) => {

    // ... (Keep logic same, just styling if needed)
    const [newDate, setNewDate] = useState('');
    const [newTime, setNewTime] = useState('');
    const [reason, setReason] = useState('');
    const [error, setError] = useState('');

    const handleConfirm = () => {
        if (!newDate || !newTime || !reason.trim()) {
            setError('Please fill out all fields to request a reschedule.');
            return;
        }
        setError('');
        onConfirm(newDate, newTime, reason);
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn" role="dialog" aria-modal="true">
            <div className="bg-[#181818] border border-white/10 rounded-2xl p-6 w-full max-w-sm animate-scaleUp shadow-2xl">
                <h2 className="text-xl font-bold text-white mb-2">Request Reschedule</h2>
                <p className="text-sm text-gray-400 mb-6">Propose a new date and time for your '{booking.services && booking.services.length > 0 ? booking.services.map(s => s.name).join(', ') : booking.service?.name || 'Service'}' service.</p>
                <div className="space-y-4">
                    <div>
                        <label className="text-xs text-gray-500 font-bold  tracking-wider mb-1 block">New Date</label>
                        <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className="w-full p-3 bg-[#242424] border border-white/5 rounded-xl text-white outline-none focus:border-primary/50" />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 font-bold  tracking-wider mb-1 block">New Time</label>
                        <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} className="w-full p-3 bg-[#242424] border border-white/5 rounded-xl text-white outline-none focus:border-primary/50" />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 font-bold  tracking-wider mb-1 block">Reason</label>
                        <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason for request..." rows={3} className="w-full p-3 bg-[#242424] border border-white/5 rounded-xl text-white outline-none focus:border-primary/50" />
                    </div>
                    {error && <p className="text-red-400 text-xs text-center">{error}</p>}
                </div>
                <div className="mt-8 flex gap-3">
                    <button onClick={onClose} className="flex-1 bg-white/5 text-white font-bold py-3 rounded-xl hover:bg-white/10 transition">Cancel</button>
                    <button onClick={handleConfirm} className="flex-1 bg-primary text-white font-bold py-3 rounded-xl hover:bg-orange-600 transition shadow-lg shadow-primary/25">Submit</button>
                </div>
            </div>
        </div>
    );
};


const StatusStep: React.FC<{ icon: React.ReactNode; title: string; subtitle: string; isCompleted: boolean; isLast?: boolean; isActive?: boolean }> = ({ icon, title, subtitle, isCompleted, isLast = false, isActive = false }) => (
    <div className="flex group">
        <div className="flex flex-col items-center mr-6 relative">
            {/* Line */}
            {!isLast && (
                <div className={`absolute top-10 left-1/2 -translate-x-1/2 w-[2px] -z-10 ${isCompleted ? 'bg-gradient-to-b from-primary to-primary/50' : 'bg-white/20'}`} style={{ height: 'calc(100% + 8px)' }}></div>
            )}

            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 z-10 ${isCompleted || isActive ? 'bg-primary shadow-lg shadow-primary/40 ring-4 ring-primary/10 scale-110' : 'bg-[#242424] border-2 border-white/10 text-gray-600'
                }`}>
                {icon}
            </div>
        </div>
        <div className={`pb-8 ${isActive ? 'opacity-100' : isCompleted ? 'opacity-80' : 'opacity-40'}`}>
            <h4 className={`font-bold text-[15px] ${isCompleted || isActive ? 'text-white' : 'text-gray-400'}`}>{title}</h4>
            <p className="text-xs text-gray-500 font-medium mt-0.5">{subtitle}</p>
        </div>
    </div>
);


const CancellationModal: React.FC<{
    booking: Booking;
    onClose: () => void;
    onConfirm: (reason: string) => void;
}> = ({ booking, onClose, onConfirm }) => {
    const [reason, setReason] = useState('');
    const [error, setError] = useState('');
    // ... logic same
    const handleConfirm = () => {
        if (!reason.trim()) {
            setError('Please provide a reason.'); return;
        }
        setError(''); onConfirm(reason);
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn" role="dialog" aria-modal="true">
            <div className="bg-[#181818] border border-white/10 rounded-2xl p-6 w-full max-w-sm animate-scaleUp">
                <h2 className="text-xl font-bold text-white mb-2">Cancel Booking</h2>
                <p className="text-gray-400 text-sm mb-6">Are you sure you want to cancel <span className="text-white font-bold">{booking.services && booking.services.length > 0 ? booking.services.map(s => s.name).join(', ') : booking.service?.name || 'Service'}</span>?</p>
                <textarea
                    value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for cancellation..." rows={4}
                    className="w-full p-3 bg-[#242424] border border-white/5 rounded-xl text-white outline-none focus:border-red-500/50"
                />
                {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
                <div className="mt-6 flex gap-3">
                    <button onClick={onClose} className="flex-1 bg-white/5 text-white font-bold py-3 rounded-xl hover:bg-white/10 transition">Back</button>
                    <button onClick={handleConfirm} className="flex-1 bg-red-500/10 text-red-500 border border-red-500/20 font-bold py-3 rounded-xl hover:bg-red-500 hover:text-white transition">Confirm</button>
                </div>
            </div>
        </div>
    );
};

// ... keep helpers like getDistanceInKm, statusColors (though maybe unused in new design)

const getDistanceInKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    // ... keep same implementation
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const BookingStatusCard = React.memo<{
    booking: Booking;
    showHeader?: boolean;
    onTrack?: (booking: Booking) => void;
    onProgressView?: (booking: Booking) => void;
}>(({ booking, showHeader = true, onTrack, onProgressView }) => {
    const { db, cancelBooking, requestReschedule } = useDatabase();
    const { user: customer } = useAuth();
    const navigate = useNavigate();
    const [isCancelling, setIsCancelling] = useState(false);
    const [isRescheduling, setIsRescheduling] = useState(false);
    const [eta, setEta] = useState<number | null>(null);
    const [isChatOpen, setIsChatOpen] = useState(false);

    const formatTimestamp = (isoString: string) => {
        return new Date(isoString).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
        });
    };

    // Get live mechanic details for real-time updates (e.g. image changes)
    const liveMechanic = useMemo(() => {
        if (!booking.mechanic || !db?.mechanics) return booking.mechanic;
        return db.mechanics.find(m => m.id === booking.mechanic!.id) || booking.mechanic;
    }, [booking.mechanic, db?.mechanics]);

    // ... Keep ETA Effect
    useEffect(() => {
        let interval: any;
        if (booking.status === 'En Route' && booking.mechanic && booking.location && db?.mechanics) {
            if (booking.eta) { setEta(booking.eta); return; }
            const calculateEta = () => {
                const liveMechanic = db.mechanics.find(m => m.id === booking.mechanic!.id);
                if (liveMechanic) {
                    const dist = getDistanceInKm(liveMechanic.lat, liveMechanic.lng, booking.location!.lat, booking.location!.lng);
                    const etaMins = Math.ceil((dist / 40) * 60);
                    setEta(etaMins > 0 ? etaMins : 1);
                }
            };
            calculateEta();
            interval = setInterval(calculateEta, 15000);
        } else { setEta(null); }
        return () => clearInterval(interval);
    }, [booking, db?.mechanics]);


    const timelineSteps: BookingStatus[] = ['Booking Confirmed', 'Mechanic Assigned', 'En Route', 'In Progress', 'Completed'];

    // Updated Icons
    const statusIcons: Record<string, React.ReactNode> = {
        'Booking Confirmed': <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>,
        'Mechanic Assigned': <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
        'En Route': <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
        'In Progress': <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
        'Completed': <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    };

    const currentStatusIndex = useMemo(() => {
        if (!booking) return -1;
        let highestIndex = -1;
        const allStatuses = [...(booking.statusHistory?.map(h => h.status) || []), booking.status];
        for (const status of allStatuses) {
            const index = timelineSteps.indexOf(status as BookingStatus);
            if (index > highestIndex) { highestIndex = index; }
        }
        return highestIndex;
    }, [booking]);

    const handleConfirmCancellation = (reason: string) => { cancelBooking(booking.id, reason); setIsCancelling(false); };
    const handleConfirmReschedule = (newDate: string, newTime: string, reason: string) => { requestReschedule(booking.id, newDate, newTime, reason); setIsRescheduling(false); };

    return (
        <div className="bg-[#121212] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            {/* Header */}
            {showHeader && (
                <div className="p-5 bg-[#1A1A1A] border-b border-white/5 flex justify-between items-center">
                    <h3 className="font-black text-white text-lg">Booking #{booking.id.toUpperCase().slice(0, 6)}</h3>
                    <div className="flex items-center gap-3">
                        {eta !== null && <span className="text-xs font-bold text-yellow-400 animate-pulse bg-yellow-400/10 px-2 py-1 rounded">~{eta} min</span>}
                        <span className="px-3 py-1 text-[10px] font-black  tracking-wider rounded bg-[#2A2A2A] text-gray-400 border border-white/5">
                            {booking.status}
                        </span>
                    </div>
                </div>
            )}

            <div className="p-6">

                {/* Status Timeline */}
                <div className="mb-8 pl-2">
                    <h3 className="font-bold text-white mb-4 text-sm  tracking-wider border-b border-white/5 pb-2">Booking Status</h3>
                    <div className="space-y-0 relative">
                        {timelineSteps.map((step, index) => {
                            const isCompleted = index <= currentStatusIndex;
                            const isActive = index === currentStatusIndex;
                            const historyEntry = booking.statusHistory?.find(s => s.status === step);

                            // Determine subtitle based on step state
                            let subtitle = 'Pending';
                            if (historyEntry) {
                                // Step has a history entry - show timestamp
                                subtitle = formatTimestamp(historyEntry.timestamp);
                            } else if (isActive) {
                                // Current active step
                                subtitle = 'In Progress';
                            } else if (isCompleted) {
                                // Step was completed but no history entry (shouldn't happen normally)
                                subtitle = 'Completed';
                            }
                            // else remains 'Pending' for future steps

                            return <StatusStep key={step} title={step} subtitle={subtitle} isCompleted={isCompleted} isActive={isActive} icon={statusIcons[step]} isLast={index === timelineSteps.length - 1} />;
                        })}
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Mechanic Details Card */}
                    {booking.mechanic && (
                        <div className="bg-[#1A1A1A] p-5 rounded-2xl border border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full overflow-hidden shadow-lg border border-white/10 bg-[#1A1A1A]">
                                    <img
                                        src={liveMechanic?.imageUrl || '/riders-logo.png'}
                                        alt={booking.mechanic.name}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                        onError={(e) => { (e.target as HTMLImageElement).src = '/riders-logo.png'; }}
                                    />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 font-bold  tracking-wider mb-0.5">Your Mechanic</p>
                                    <p className="font-black text-white text-lg leading-none">{booking.mechanic.name}</p>
                                    <p className="text-xs text-yellow-500 font-bold mt-1">★ {booking.mechanic.rating} <span className="text-gray-600 font-normal">({booking.mechanic.reviews} jobs)</span></p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Service Details Card */}
                    <div className="bg-[#1A1A1A] p-5 rounded-2xl border border-white/5">
                        <h3 className="font-bold text-white mb-4 text-sm  tracking-wider border-b border-white/5 pb-2">Service Details</h3>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500 font-medium">Service:</span>
                                <span className="font-bold text-white">{booking.services && booking.services.length > 0 ? booking.services.map(s => s.name).join(', ') : booking.service?.name || 'Service'}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500 font-medium">Vehicle:</span>
                                <span className="font-bold text-white">{booking.vehicle.year} {booking.vehicle.make} {booking.vehicle.model}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500 font-medium">Plate No:</span>
                                <span className="font-mono text-gray-300 bg-[#242424] px-2 py-0.5 rounded text-xs">{booking.vehicle.plateNumber}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="mt-6 flex flex-col gap-3">
                    {/* Primary Action Button based on status */}
                    {booking.status === 'En Route' && onTrack && (
                        <button onClick={() => onTrack(booking)} className="w-full bg-primary text-white font-bold py-3.5 rounded-xl hover:bg-orange-600 transition shadow-lg shadow-primary/20 flex justify-center items-center gap-2">
                            <span className="w-2 h-2 bg-white rounded-full animate-ping"></span>
                            Track Live Location
                        </button>
                    )}

                    {booking.mechanic && (
                        <button onClick={() => setIsChatOpen(true)} className="w-full bg-[#1F2937] text-white font-bold py-3.5 rounded-xl hover:bg-gray-700 transition border border-white/10">
                            Chat with Mechanic
                        </button>
                    )}

                    <div className="flex gap-3">
                        {onProgressView && !['En Route', 'Completed', 'Cancelled'].includes(booking.status) && (
                            <button onClick={() => onProgressView(booking)} className="flex-1 bg-white/5 text-white/80 text-xs font-bold py-3 rounded-xl hover:bg-white/10 transition">View Progress</button>
                        )}
                        {['Upcoming', 'Booking Confirmed', 'Mechanic Assigned'].includes(booking.status) && (
                            <>
                                <button onClick={() => setIsRescheduling(true)} className="flex-1 bg-white/5 text-white/80 text-xs font-bold py-3 rounded-xl hover:bg-white/10 transition">Reschedule</button>
                                <button onClick={() => setIsCancelling(true)} className="flex-1 bg-red-500/10 text-red-500 text-xs font-bold py-3 rounded-xl hover:bg-red-500/20 transition">Cancel</button>
                            </>
                        )}
                    </div>

                    <div className="flex gap-3 pt-2 border-t border-white/5">
                        <button
                            onClick={() => navigate(`/customer-portal/booking-detail/${booking.id}`)}
                            className="flex-1 bg-primary/10 hover:bg-primary/20 text-primary hover:text-white text-xs font-bold py-3 rounded-xl transition-all border border-primary/20"
                        >
                            Booking Summary
                        </button>
                        <button
                            onClick={() => navigate(`/customer-portal/booking-confirmation`, { state: { bookings: [booking] } })}
                            className="flex-1 bg-white/5 hover:bg-white/10 text-white text-xs font-bold py-3 rounded-xl transition-all border border-white/10"
                        >
                            Appointment
                        </button>
                    </div>
                </div>

            </div>

            {/* Modals */}
            {isCancelling && <CancellationModal booking={booking} onClose={() => setIsCancelling(false)} onConfirm={handleConfirmCancellation} />}
            {isRescheduling && <RescheduleModal booking={booking} onClose={() => setIsRescheduling(false)} onConfirm={handleConfirmReschedule} />}
            {isChatOpen && booking.mechanic && customer && <CustomerMechanicChatModal booking={booking} customer={customer} mechanic={booking.mechanic} onClose={() => setIsChatOpen(false)} />}
        </div>
    );
});

export default BookingStatusCard;
