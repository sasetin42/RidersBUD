import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { Booking } from '../types';
import { useAuth } from '../context/AuthContext';
import CustomerMechanicChatModal from '../components/customer/CustomerMechanicChatModal';

const BookingConfirmationScreen: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user: customer } = useAuth();
    const { booking } = (location.state as { booking: Booking }) || {};
    const [isChatOpen, setIsChatOpen] = useState(false);

    React.useEffect(() => {
        if (!booking) {
            navigate('/');
        }
    }, [booking, navigate]);

    if (!booking || !customer) {
        return null;
    }

    const { mechanic, vehicle } = booking;
    
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
        <div className="flex flex-col h-full bg-secondary">
            <Header title={`Booking #${booking.id.toUpperCase().slice(-6)}`} />
            <div className="flex-grow flex flex-col items-center justify-start p-4 space-y-4 overflow-y-auto">
                 <div className="w-full max-w-md">
                     <div className="text-center my-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-green-400 mx-auto" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <h2 className="text-3xl font-bold text-white mt-4">Appointment Set!</h2>
                        <p className="text-base text-light-gray leading-relaxed max-w-sm mx-auto mt-2">
                           Your booking summary is below. You can track its status in your booking history.
                        </p>
                     </div>
                    
                    <div className="bg-dark-gray rounded-xl w-full">
                        {/* Appointment Details */}
                        <div className="p-5">
                            <p className="text-sm font-bold text-primary tracking-wider uppercase">Appointment Details</p>
                            <p className="text-2xl font-bold text-white mt-2">{booking.service.name}</p>
                            <div className="flex justify-between items-start mt-4 text-left">
                                <div>
                                    <p className="text-sm text-light-gray mb-1">Date</p>
                                    <p className="font-semibold text-white">{new Date(booking.date.replace(/-/g, '/')).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-light-gray mb-1">Time</p>
                                    <p className="font-semibold text-white">{booking.time}</p>
                                </div>
                            </div>
                        </div>

                        {/* Mechanic Details */}
                        {mechanic && (
                            <>
                                <hr className="border-field mx-5" />
                                <div className="p-5">
                                    <p className="text-sm font-bold text-primary tracking-wider uppercase mb-3">Your Mechanic</p>
                                    <div className="flex items-center gap-4">
                                        <img src={mechanic.imageUrl} alt={mechanic.name} className="w-16 h-16 rounded-full object-cover" />
                                        <div className="flex-grow">
                                            <p className="font-bold text-white text-lg">{mechanic.name}</p>
                                            <p className="text-sm text-yellow-400 font-semibold">⭐ {mechanic.rating.toFixed(1)} ({mechanic.reviews} jobs)</p>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex gap-3">
                                        <button onClick={() => navigate(`/mechanic-profile/${mechanic.id}`)} className="flex-1 bg-field text-white font-bold py-2 rounded-lg hover:bg-gray-700 transition text-sm">View Profile</button>
                                        <button onClick={() => setIsChatOpen(true)} className="flex-1 bg-field text-white font-bold py-2 rounded-lg hover:bg-gray-700 transition text-sm">Chat</button>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Vehicle Details */}
                        <>
                            <hr className="border-field mx-5" />
                            <div className="p-5">
                                <p className="text-sm font-bold text-primary tracking-wider uppercase mb-3">Vehicle</p>
                                <div className="flex items-center gap-4">
                                    <img src={vehicle.imageUrl} alt={`${vehicle.make} ${vehicle.model}`} className="w-24 h-16 object-cover rounded-md flex-shrink-0 bg-secondary" />
                                    <div>
                                        <p className="font-bold text-white">{vehicle.make} {vehicle.model} ({vehicle.year})</p>
                                        <p className="text-sm bg-field inline-block px-2 py-0.5 mt-1 rounded font-mono tracking-wider text-white">{vehicle.plateNumber}</p>
                                    </div>
                                </div>
                            </div>
                        </>
                    </div>
                </div>
            </div>
             <div className="p-4 bg-[#1D1D1D] border-t border-dark-gray flex flex-col gap-4">
                <button
                    onClick={handleSetReminder}
                    className="w-full bg-blue-500/20 text-blue-300 font-bold py-3 rounded-lg hover:bg-blue-500/40 transition"
                >
                    Set Reminder for this Appointment
                </button>
                <div className="flex gap-4">
                    <button 
                        onClick={() => navigate('/booking-history')} 
                        className="w-1/2 bg-field text-white font-bold py-3 rounded-lg hover:bg-gray-600 transition"
                    >
                        View History
                    </button>
                    <button 
                        onClick={() => navigate('/')} 
                        className="w-1/2 bg-primary text-white font-bold py-3 rounded-lg hover:bg-orange-600 transition"
                    >
                        Done
                    </button>
                </div>
            </div>

            {isChatOpen && mechanic && (
                <CustomerMechanicChatModal
                    booking={booking}
                    customer={customer}
                    mechanic={mechanic}
                    onClose={() => setIsChatOpen(false)}
                />
            )}
        </div>
    );
};

export default BookingConfirmationScreen;