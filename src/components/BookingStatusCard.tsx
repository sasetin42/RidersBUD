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
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fadeIn" role="dialog" aria-modal="true">
            <div className="bg-dark-gray rounded-lg p-6 w-full max-w-sm animate-scaleUp">
                <h2 className="text-xl font-bold mb-2">Request Reschedule</h2>
                <p className="text-sm text-light-gray mb-4">Propose a new date and time for your '{booking.service.name}' service.</p>
                <div className="space-y-4">
                    <div>
                        <label className="text-xs text-light-gray">New Date</label>
                        <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className="w-full p-2 bg-field border border-secondary rounded-md" />
                    </div>
                    <div>
                        <label className="text-xs text-light-gray">New Time</label>
                        <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} className="w-full p-2 bg-field border border-secondary rounded-md" />
                    </div>
                    <div>
                        <label className="text-xs text-light-gray">Reason for Request</label>
                        <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g., I have a conflict at that time." rows={3} className="w-full p-2 bg-field border border-secondary rounded-md" />
                    </div>
                    {error && <p className="text-red-400 text-xs text-center">{error}</p>}
                </div>
                <div className="mt-6 flex gap-4">
                    <button onClick={onClose} className="w-1/2 bg-field text-white font-bold py-3 rounded-lg hover:bg-gray-700 transition">Cancel</button>
                    <button onClick={handleConfirm} className="w-1/2 bg-primary text-white font-bold py-3 rounded-lg hover:bg-orange-600 transition">Submit Request</button>
                </div>
            </div>
        </div>
    );
};


const StatusStep: React.FC<{ icon: React.ReactNode; title: string; subtitle: string; isCompleted: boolean; isLast?: boolean; }> = ({ icon, title, subtitle, isCompleted, isLast = false }) => (
    <div className="flex items-start">
        <div className="flex flex-col items-center mr-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isCompleted ? 'bg-primary' : 'bg-dark-gray border-2 border-field'}`}>
                {icon}
            </div>
            {!isLast && <div className={`w-0.5 flex-grow ${isCompleted ? 'bg-primary' : 'bg-field'}`} style={{ minHeight: '2.5rem' }}></div>}
        </div>
        <div>
            <h4 className={`font-bold ${isCompleted ? 'text-white' : 'text-light-gray'}`}>{title}</h4>
            <p className="text-xs text-light-gray">{subtitle}</p>
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

    const handleConfirm = () => {
        if (!reason.trim()) {
            setError('Please provide a reason for cancellation.');
            return;
        }
        setError('');
        onConfirm(reason);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fadeIn" role="dialog" aria-modal="true">
            <div className="bg-dark-gray rounded-lg p-6 w-full max-w-sm animate-scaleUp">
                <h2 className="text-xl font-bold mb-2">Cancel Booking</h2>
                <p className="text-light-gray mb-4">You are about to cancel your booking for <span className="font-semibold text-primary">{booking.service.name}</span>. This cannot be undone.</p>
                <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Reason for cancellation..."
                    rows={4}
                    className={`w-full px-4 py-3 bg-field border rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-2 ${error ? 'border-red-500 ring-red-500' : 'border-dark-gray focus:ring-primary'}`}
                />
                {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
                <div className="mt-6 flex gap-4">
                    <button onClick={onClose} className="w-1/2 bg-field text-white font-bold py-3 rounded-lg hover:bg-gray-600 transition">Go Back</button>
                    <button onClick={handleConfirm} className="w-1/2 bg-red-600 text-white font-bold py-3 rounded-lg hover:bg-red-700 transition">Confirm Cancellation</button>
                </div>
            </div>
        </div>
    );
};

const statusColors: { [key in BookingStatus]: string } = {
    Upcoming: 'bg-blue-500/20 text-blue-300',
    'Booking Confirmed': 'bg-cyan-500/20 text-cyan-300',
    'Mechanic Assigned': 'bg-sky-500/20 text-sky-300',
    'En Route': 'bg-yellow-500/20 text-yellow-300',
    'In Progress': 'bg-purple-500/20 text-purple-300',
    Completed: 'bg-green-500/20 text-green-300',
    Cancelled: 'bg-red-500/20 text-red-300',
    'Reschedule Requested': 'bg-orange-500/20 text-orange-300',
};

const getDistanceInKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};


const BookingStatusCard: React.FC<{
    booking: Booking;
    showHeader?: boolean;
    onTrack?: (booking: Booking) => void;
    onProgressView?: (booking: Booking) => void;
}> = ({ booking, showHeader = true, onTrack, onProgressView }) => {
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

    useEffect(() => {
        let interval: any;
        if (booking.status === 'En Route' && booking.mechanic && booking.location && db?.mechanics) {
            // Prioritize mechanic-set ETA
            if (booking.eta) {
                setEta(booking.eta);
                return; // Stop here if we have a manual ETA
            }

            const calculateEta = () => {
                const liveMechanic = db.mechanics.find(m => m.id === booking.mechanic!.id);
                if (liveMechanic) {
                    const dist = getDistanceInKm(liveMechanic.lat, liveMechanic.lng, booking.location!.lat, booking.location!.lng);
                    const etaMins = Math.ceil((dist / 40) * 60); // Assuming 40 km/h average speed
                    setEta(etaMins > 0 ? etaMins : 1);
                }
            };
            calculateEta();
            interval = setInterval(calculateEta, 15000);
        } else {
            setEta(null);
        }
        return () => clearInterval(interval);
    }, [booking, db?.mechanics]);


    const timelineSteps: BookingStatus[] = ['Booking Confirmed', 'Mechanic Assigned', 'En Route', 'In Progress', 'Completed'];

    const statusIcons: Record<string, React.ReactNode> = {
        'Booking Confirmed': <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>,
        'Mechanic Assigned': <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
        'En Route': <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.789-2.75 9.566-1.74 2.777-2.75 4.434-2.75 4.434H12M12 11c0-3.517 1.009-6.789 2.75-9.566 1.74-2.777 2.75-4.434 2.75-4.434H12M12 11v9M12 11V2" /></svg>,
        'In Progress': <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.532 1.532 0 012.287-.947c1.372.836 2.942-.734-2.106-2.106a1.532 1.532 0 01.947-2.287c1.561-.379-1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>,
        'Completed': <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    };

    const currentStatusIndex = useMemo(() => {
        if (!booking) return -1;

        let highestIndex = -1;
        const allStatuses = [...(booking.statusHistory?.map(h => h.status) || []), booking.status];

        for (const status of allStatuses) {
            const index = timelineSteps.indexOf(status as BookingStatus);
            if (index > highestIndex) {
                highestIndex = index;
            }
        }
        return highestIndex;
    }, [booking]);


    const handleConfirmCancellation = (reason: string) => {
        cancelBooking(booking.id, reason);
        setIsCancelling(false);
    };

    const handleConfirmReschedule = (newDate: string, newTime: string, reason: string) => {
        requestReschedule(booking.id, newDate, newTime, reason);
        setIsRescheduling(false);
    };

    return (
        <div className="glass-card overflow-hidden">
            {showHeader && (
                <div className="p-4 bg-white/5 flex justify-between items-center border-b border-white/5">
                    <h3 className="font-bold text-white">Booking #{booking.id.toUpperCase().slice(-6)}</h3>
                    <div className="flex items-center gap-2">
                        {eta !== null && <span className="text-xs font-semibold text-yellow-300 animate-pulse">ETA: ~{eta} min</span>}
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[booking.status]}`}>
                            {booking.status}
                        </span>
                    </div>
                </div>
            )}

            <div className="p-4 space-y-6">
                {/* Status Timeline */}
                <div>
                    <h3 className="font-semibold text-white mb-4">Booking Status</h3>
                    <div className="space-y-0">
                        {timelineSteps.map((step, index) => {
                            const isCompleted = index <= currentStatusIndex;
                            const historyEntry = booking.statusHistory?.find(s => s.status === step);

                            let subtitle = 'Pending';
                            if (historyEntry) {
                                subtitle = formatTimestamp(historyEntry.timestamp);
                            } else if (step === 'Mechanic Assigned' && !isCompleted) {
                                subtitle = 'Waiting for assignment';
                            }

                            return (
                                <StatusStep
                                    key={step}
                                    title={step}
                                    subtitle={subtitle}
                                    isCompleted={isCompleted}
                                    icon={statusIcons[step]}
                                    isLast={index === timelineSteps.length - 1}
                                />
                            );
                        })}
                    </div>
                </div>

                {/* Mechanic Details */}
                {booking.mechanic && (
                    <div className="bg-dark-gray p-4 rounded-lg">
                        <h3 className="font-semibold text-white mb-3">Your Mechanic</h3>
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-xl font-bold text-white flex-shrink-0">
                                {booking.mechanic.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                                <p className="font-bold text-white">{booking.mechanic.name}</p>
                                <p className="text-sm text-yellow-400">⭐ {booking.mechanic.rating} ({booking.mechanic.reviews} jobs)</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Service Details */}
                <div className="bg-dark-gray p-4 rounded-lg">
                    <h3 className="font-semibold text-white mb-2">Service Details</h3>
                    <div className="flex justify-between text-sm">
                        <span className="text-light-gray">Service:</span>
                        <span className="font-medium text-white">{booking.service.name}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                        <span className="text-light-gray">Vehicle:</span>
                        <span className="font-medium text-white text-right">{`${booking.vehicle.year} ${booking.vehicle.make} ${booking.vehicle.model}`}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                        <span className="text-light-gray">Plate No:</span>
                        <span className="font-medium text-white font-mono">{booking.vehicle.plateNumber}</span>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                    {onProgressView && !['En Route', 'Completed', 'Cancelled'].includes(booking.status) && (
                        <button onClick={() => onProgressView(booking)} className="flex-1 bg-field text-white font-bold py-3 rounded-lg hover:bg-gray-600 transition">View Progress</button>
                    )}
                    {booking.status === 'En Route' && onTrack && (
                        <button onClick={() => onTrack(booking)} className="flex-1 bg-primary text-white font-bold py-3 rounded-lg hover:bg-orange-600 transition">Track Live</button>
                    )}
                    {['Upcoming', 'Booking Confirmed', 'Mechanic Assigned'].includes(booking.status) && (
                        <button onClick={() => setIsRescheduling(true)} className="flex-1 bg-field text-white font-bold py-3 rounded-lg hover:bg-gray-600 transition">Reschedule</button>
                    )}
                    {booking.mechanic && (
                        <button onClick={() => setIsChatOpen(true)} className="flex-1 bg-field text-white font-bold py-3 rounded-lg hover:bg-gray-600 transition">Chat</button>
                    )}
                </div>

                {['Upcoming', 'Booking Confirmed', 'Mechanic Assigned'].includes(booking.status) && (
                    <button onClick={() => setIsCancelling(true)} className="w-full bg-red-500/10 text-red-400 font-bold py-3 rounded-lg hover:bg-red-500/20 transition">
                        Cancel Booking
                    </button>
                )}
            </div>
            {isCancelling && (
                <CancellationModal
                    booking={booking}
                    onClose={() => setIsCancelling(false)}
                    onConfirm={handleConfirmCancellation}
                />
            )}
            {isRescheduling && (
                <RescheduleModal
                    booking={booking}
                    onClose={() => setIsRescheduling(false)}
                    onConfirm={handleConfirmReschedule}
                />
            )}
            {isChatOpen && booking.mechanic && customer && (
                <CustomerMechanicChatModal
                    booking={booking}
                    customer={customer}
                    mechanic={booking.mechanic}
                    onClose={() => setIsChatOpen(false)}
                />
            )}
        </div>
    );
};

export default BookingStatusCard;