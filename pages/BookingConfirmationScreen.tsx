import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { Booking } from '../types';
import BookingStatusCard from '../components/BookingStatusCard';

const BookingConfirmationScreen: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { booking } = (location.state as { booking: Booking }) || {};

    React.useEffect(() => {
        if (!booking) {
            navigate('/');
        }
    }, [booking, navigate]);

    if (!booking) {
        return null;
    }
    
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
            <div className="flex-grow flex flex-col items-center justify-start p-4 space-y-6 overflow-y-auto">
                 <div className="w-full max-w-md">
                     <div className="text-center my-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-green-400 mx-auto" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <h2 className="text-3xl font-bold text-white mt-4">Appointment Set!</h2>
                        <p className="text-base text-light-gray leading-relaxed max-w-sm mx-auto mt-2">
                           Your booking has been successfully confirmed. You can track its status in your booking history.
                        </p>
                     </div>

                    <BookingStatusCard booking={booking} showHeader={false} />
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
        </div>
    );
};

export default BookingConfirmationScreen;