import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Booking, BookingStatus } from '../types';
import { useDatabase } from '../context/DatabaseContext';
import { useAuth } from '../context/AuthContext';
import CustomerMechanicChatModal from './customer/CustomerMechanicChatModal';

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
};


const BookingStatusCard: React.FC<{ booking: Booking; showHeader?: boolean }> = ({ booking, showHeader = true }) => {
    const { cancelBooking } = useDatabase();
    const { user: customer } = useAuth();
    const [isCancelling, setIsCancelling] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const navigate = useNavigate();

    const formatTimestamp = (isoString: string) => {
        return new Date(isoString).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
        });
    };

    const confirmedStep = booking.statusHistory?.find(s => s.status === 'Booking Confirmed');
    const assignedStep = booking.statusHistory?.find(s => s.status === 'Mechanic Assigned');
    const isEnRoute = booking.status === 'En Route' || booking.status === 'In Progress' || booking.status === 'Completed';

    const handleConfirmCancellation = (reason: string) => {
        cancelBooking(booking.id, reason);
        setIsCancelling(false);
    };
    
    const handleSetReminder = () => {
        navigate('/reminders', {
            state: {
                serviceName: booking.service.name,
                date: booking.date,
                vehicle: `${booking.vehicle.make} ${booking.vehicle.model}`
            }
        });
    };

    return (
        <div className="bg-secondary border border-dark-gray rounded-lg overflow-hidden">
            {showHeader && (
                <div className="p-4 bg-dark-gray flex justify-between items-center">
                    <h3 className="font-bold text-white">Booking #{booking.id.toUpperCase().slice(-6)}</h3>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[booking.status]}`}>
                        {booking.status}
                    </span>
                </div>
            )}
            
            <div className="p-4 space-y-6">
                {/* Status Timeline */}
                <div>
                    <h3 className="font-semibold text-white mb-4">Booking Status</h3>
                    <div className="space-y-0">
                        <StatusStep
                            title="Booking Confirmed"
                            subtitle={confirmedStep ? formatTimestamp(confirmedStep.timestamp) : 'Pending'}
                            isCompleted={!!confirmedStep}
                            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                        />
                         <StatusStep
                            title="Mechanic Assigned"
                            subtitle={assignedStep ? formatTimestamp(assignedStep.timestamp) : 'Waiting for assignment'}
                            isCompleted={!!assignedStep}
                            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
                        />
                         <StatusStep
                            title="En Route"
                            subtitle={isEnRoute ? 'Your mechanic is on the way!' : 'Pending'}
                            isCompleted={isEnRoute}
                            isLast
                            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.789-2.75 9.566-1.74 2.777-2.75 4.434-2.75 4.434H12M12 11c0-3.517 1.009-6.789 2.75-9.566 1.74-2.777 2.75-4.434 2.75-4.434H12M12 11v9M12 11V2" /></svg>}
                        />
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
                        <button onClick={() => setIsChatOpen(true)} className="w-full bg-secondary text-white font-bold py-2 mt-4 rounded-lg hover:bg-gray-600 transition text-sm">
                            Chat with {booking.mechanic.name.split(' ')[0]}
                        </button>
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
                
                {booking.status === 'Upcoming' && (
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setIsCancelling(true)}
                            className="flex-1 bg-red-500/10 text-red-400 font-bold py-3 rounded-lg hover:bg-red-500/20 transition"
                        >
                            Cancel Booking
                        </button>
                        <button 
                            onClick={handleSetReminder}
                            className="flex-1 bg-blue-500/10 text-blue-300 font-bold py-3 rounded-lg hover:bg-blue-500/20 transition"
                        >
                            Set Reminder
                        </button>
                    </div>
                )}
            </div>
             {isCancelling && (
                <CancellationModal 
                    booking={booking} 
                    onClose={() => setIsCancelling(false)} 
                    onConfirm={handleConfirmCancellation}
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