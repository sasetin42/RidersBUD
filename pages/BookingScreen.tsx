import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { mockServices, mockMechanics, mockBookings } from '../data/mockData';
import Spinner from '../components/Spinner';
import { useAuth } from '../context/AuthContext';

// --- Stepper Components ---

const StepperStep: React.FC<{ step: number; label: string; isActive: boolean; isCompleted: boolean; }> = ({ step, label, isActive, isCompleted }) => {
    const circleClasses = isCompleted
        ? 'bg-primary text-white'
        : isActive
        ? 'border-2 border-primary text-primary'
        : 'border-2 border-dark-gray text-light-gray';
    const textClasses = isCompleted || isActive ? 'text-primary' : 'text-light-gray';

    return (
        <div className="flex flex-col items-center flex-shrink-0 text-center" style={{ minWidth: '60px' }}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${circleClasses}`}>
                {isCompleted ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                ) : step}
            </div>
            <p className={`text-xs mt-1 font-semibold transition-colors duration-300 ${textClasses}`}>{label}</p>
        </div>
    );
};

const StepperConnector: React.FC<{ isCompleted: boolean; }> = ({ isCompleted }) => (
    <div className={`flex-grow h-0.5 mx-2 rounded transition-colors duration-300 ${isCompleted ? 'bg-primary' : 'bg-dark-gray'}`}></div>
);


const BookingScreen: React.FC = () => {
    const { serviceId } = useParams<{ serviceId: string }>();
    const service = mockServices.find(s => s.id === serviceId);
    const navigate = useNavigate();
    const { user } = useAuth();

    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedTime, setSelectedTime] = useState('');
    const [selectedMechanic, setSelectedMechanic] = useState('');
    const [isBooking, setIsBooking] = useState(false);

    const timeSlots = ['09:00 AM', '11:00 AM', '01:00 PM', '03:00 PM', '05:00 PM'];

    // Stepper State Logic
    const isDateComplete = true; // Always has a default value
    const isTimeComplete = selectedTime !== '';
    const isMechanicComplete = selectedMechanic !== '';
    const allStepsComplete = isDateComplete && isTimeComplete && isMechanicComplete;

    const handleBooking = () => {
        if (!allStepsComplete) {
            alert('Please select a time and mechanic.');
            return;
        }
        
        const mechanicDetails = mockMechanics.find(m => m.id === selectedMechanic);
        if (!service || !mechanicDetails) {
            alert('An error occurred. Could not find service or mechanic details.');
            return;
        }

        if (!user) {
            alert('You must be logged in to make a booking.');
            return;
        }

        setIsBooking(true);

        // Simulate API call
        setTimeout(() => {
            const newBooking = {
                id: `b-${Date.now()}`,
                customerName: user.name,
                service,
                mechanic: mechanicDetails,
                date: selectedDate.toISOString().split('T')[0],
                time: selectedTime,
                status: 'Upcoming' as const,
            };

            mockBookings.unshift(newBooking);
            navigate('/booking-confirmation', { state: { booking: newBooking } });
        }, 1500);
    };

    return (
        <div className="flex flex-col h-full bg-secondary">
            <Header title={`Book: ${service?.name}`} showBackButton />
            <div className="flex-grow overflow-y-auto p-6 space-y-6">

                {/* --- Stepper UI --- */}
                <div className="flex items-center w-full mb-4">
                    <StepperStep step={1} label="Date" isCompleted={isDateComplete} isActive={!isDateComplete} />
                    <StepperConnector isCompleted={isTimeComplete} />
                    <StepperStep step={2} label="Time" isCompleted={isTimeComplete} isActive={isDateComplete && !isTimeComplete} />
                    <StepperConnector isCompleted={isMechanicComplete} />
                    <StepperStep step={3} label="Mechanic" isCompleted={isMechanicComplete} isActive={isTimeComplete && !isMechanicComplete} />
                </div>

                <div>
                    <h3 className="text-lg font-semibold mb-2">Select Date</h3>
                    <input 
                        type="date"
                        value={selectedDate.toISOString().split('T')[0]}
                        onChange={(e) => setSelectedDate(new Date(e.target.value))}
                        className="w-full p-3 bg-field rounded-lg text-white"
                    />
                </div>
                <div>
                    <h3 className="text-lg font-semibold mb-2">Select Time</h3>
                    <div className="grid grid-cols-3 gap-2">
                        {timeSlots.map(time => (
                            <button 
                                key={time}
                                onClick={() => setSelectedTime(time)}
                                className={`p-2 rounded-lg text-sm transition-colors ${selectedTime === time ? 'bg-primary text-white' : 'bg-dark-gray text-light-gray hover:bg-gray-700'}`}
                            >
                                {time}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <h3 className="text-lg font-semibold mb-2">Select Mechanic</h3>
                    <div className="space-y-3">
                        {mockMechanics.map(mechanic => (
                            <div 
                                key={mechanic.id}
                                onClick={() => setSelectedMechanic(mechanic.id)}
                                className={`flex items-center p-3 rounded-lg cursor-pointer transition ${selectedMechanic === mechanic.id ? 'bg-primary/20 border-2 border-primary' : 'bg-dark-gray border-2 border-transparent'}`}
                            >
                                <img src={mechanic.imageUrl} alt={mechanic.name} className="w-12 h-12 rounded-full mr-4" />
                                <div>
                                    <p className="font-bold">{mechanic.name}</p>
                                    <p className="text-sm text-yellow-400">⭐ {mechanic.rating} ({mechanic.reviews} reviews)</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="p-4 bg-[#1D1D1D] border-t border-dark-gray">
                <button 
                    onClick={handleBooking} 
                    disabled={!allStepsComplete || isBooking}
                    className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-orange-600 transition flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isBooking ? <Spinner size="sm" color="text-white" /> : 'Confirm Booking'}
                </button>
            </div>
        </div>
    );
};

export default BookingScreen;