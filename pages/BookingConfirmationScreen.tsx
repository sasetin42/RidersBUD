
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { Booking } from '../types';

const BookingConfirmationScreen: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { booking } = (location.state as { booking: Booking }) || {};

    if (!booking) {
        // Redirect if accessed directly without booking data
        React.useEffect(() => {
            navigate('/');
        }, [navigate]);
        return null;
    }

    const handleAddToCalendar = () => {
        alert('Functionality to add to your calendar is not yet implemented.');
    };

    const formatDate = (dateString: string) => {
        const dateParts = dateString.split('-');
        const localDate = new Date(
            parseInt(dateParts[0]),
            parseInt(dateParts[1]) - 1,
            parseInt(dateParts[2])
        );
        return localDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    return (
        <div className="flex flex-col h-full bg-secondary">
            {/* Component-specific styles for the checkmark animation */}
            <style>
                {`
                @keyframes stroke {
                    100% {
                        stroke-dashoffset: 0;
                    }
                }
                @keyframes scaleUp {
                    0% { transform: scale(0.8); opacity: 0; }
                    80% { transform: scale(1.05); opacity: 1; }
                    100% { transform: scale(1); opacity: 1; }
                }
                .checkmark-container {
                    animation: scaleUp 0.4s ease-out 0.9s backwards;
                }
                .checkmark__circle {
                    stroke-dasharray: 166;
                    stroke-dashoffset: 166;
                    stroke-width: 3;
                    stroke: #4CAF50;
                    fill: rgba(76, 175, 80, 0.1);
                    animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
                }
                .checkmark__check {
                    transform-origin: 50% 50%;
                    stroke-dasharray: 48;
                    stroke-dashoffset: 48;
                    stroke-width: 4;
                    stroke-linecap: round;
                    stroke: #4CAF50;
                    animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.7s forwards;
                }
                `}
            </style>

            <Header title="Booking Confirmed" />
            <div className="flex-grow flex flex-col items-center justify-center text-center p-6 space-y-6">
                <div className="w-28 h-28 checkmark-container">
                    <svg viewBox="0 0 52 52" className="w-full h-full">
                        <circle className="checkmark__circle" cx="26" cy="26" r="25" />
                        <path className="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
                    </svg>
                </div>
                
                <div className="space-y-4">
                    <h2 className="text-3xl font-bold text-white">Appointment Set!</h2>
                    <p className="text-base text-light-gray leading-relaxed max-w-sm mx-auto">
                        Your booking has been successfully confirmed. We're looking forward to servicing your vehicle.
                    </p>
                </div>
                
                <div className="w-full max-w-sm bg-dark-gray p-6 rounded-lg text-left space-y-4 text-base">
                    <div className="flex justify-between items-center">
                        <span className="text-light-gray flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            Service:
                        </span>
                        <span className="font-semibold text-white">{booking.service.name}</span>
                    </div>
                     <div className="flex justify-between items-center">
                        <span className="text-light-gray flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            Mechanic:
                        </span>
                        <span className="font-semibold text-white">{booking.mechanic.name}</span>
                    </div>
                     <div className="flex justify-between items-center">
                        <span className="text-light-gray flex items-center">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            Date:
                        </span>
                        <span className="font-semibold text-white">{formatDate(booking.date)}</span>
                    </div>
                     <div className="flex justify-between items-center">
                        <span className="text-light-gray flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            Time:
                        </span>
                        <span className="font-semibold text-white">{booking.time}</span>
                    </div>
                     {booking.service.estimatedTime && (
                        <div className="flex justify-between items-center">
                            <span className="text-light-gray flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                Est. Time:
                            </span>
                            <span className="font-semibold text-white">{booking.service.estimatedTime}</span>
                        </div>
                     )}
                </div>

                <div className="w-full max-w-sm space-y-3 pt-4">
                     <button 
                        onClick={handleAddToCalendar} 
                        className="w-full bg-field text-white font-bold py-3 rounded-lg hover:bg-gray-600 transition"
                    >
                        Add to Calendar
                    </button>
                    <button 
                        onClick={() => navigate('/booking-history')} 
                        className="w-full bg-field text-white font-bold py-3 rounded-lg hover:bg-gray-600 transition"
                    >
                        View Booking History
                    </button>
                </div>
            </div>
             <div className="p-4 bg-[#1D1D1D] border-t border-dark-gray">
                <button 
                    onClick={() => navigate('/')} 
                    className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-orange-600 transition"
                >
                    Done
                </button>
            </div>
        </div>
    );
};

export default BookingConfirmationScreen;
