import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Booking } from '../../types';

interface AssignedJobNotificationModalProps {
    booking: Booking;
    onClose: () => void;
}

const DetailRow: React.FC<{ label: string, value: string }> = ({ label, value }) => (
    <div className="flex justify-between items-center text-sm py-2 border-b border-primary/10">
        <span className="font-semibold text-gray-600">{label}:</span>
        <span className="font-bold text-gray-800 text-right">{value}</span>
    </div>
);


const AssignedJobNotificationModal: React.FC<AssignedJobNotificationModalProps> = ({ booking, onClose }) => {
    const navigate = useNavigate();

    const handleViewDetails = () => {
        onClose();
        navigate(`/mechanic/job/${booking.id}`);
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fadeIn">
            <div 
                className="bg-gradient-to-br from-white to-gray-200 rounded-2xl p-6 shadow-2xl w-full max-w-sm text-gray-800 animate-scaleUp relative overflow-hidden"
                role="alert"
                aria-modal="true"
                aria-labelledby="notification-title"
            >
                <div className="absolute -top-16 -right-16 w-40 h-40 bg-primary/20 rounded-full opacity-50"></div>
                <div className="absolute -bottom-20 -left-12 w-48 h-48 bg-primary/20 rounded-full opacity-50"></div>
                
                <div className="relative z-10">
                    <div className="text-center mb-4">
                         <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 border-4 border-primary/20 flex items-center justify-center mb-3">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                            </svg>
                         </div>
                        <h2 id="notification-title" className="font-bold text-2xl text-gray-900">New Assigned Job!</h2>
                        <p className="text-sm text-gray-600 mt-1">A customer has booked you for a service.</p>
                    </div>

                    <div className="space-y-1 bg-white/50 p-4 rounded-lg border border-primary/10 shadow-inner">
                        <DetailRow label="Service" value={booking.service.name} />
                        <DetailRow label="Customer" value={booking.customerName} />
                        <DetailRow label="Vehicle" value={`${booking.vehicle.make} ${booking.vehicle.model}`} />
                        <DetailRow label="Date" value={new Date(booking.date.replace(/-/g, '/')).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} />
                        <DetailRow label="Time" value={booking.time} />
                    </div>

                    <div className="mt-4 pt-4 border-t border-primary/20 text-center">
                        <p className="text-sm text-gray-600">Estimated Payout:</p>
                        <p className="font-bold text-3xl text-green-600">₱{booking.service.price.toLocaleString()}</p>
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-3">
                        <button onClick={onClose} className="bg-gray-600/10 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-600/20 transition">Dismiss</button>
                        <button onClick={handleViewDetails} className="bg-primary text-white font-bold py-3 rounded-lg hover:bg-orange-600 transition shadow-lg shadow-primary/40">View Details</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AssignedJobNotificationModal;
