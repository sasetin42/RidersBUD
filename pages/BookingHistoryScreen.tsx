
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { Booking } from '../types';
import { mockBookings } from '../data/mockData';
import Spinner from '../components/Spinner';

const BookingCard: React.FC<{ booking: Booking }> = ({ booking }) => {
    const navigate = useNavigate();

    const statusColors: { [key: string]: string } = {
        Upcoming: 'text-blue-400 bg-blue-500/10 border border-blue-500/30',
        Completed: 'text-green-400 bg-green-500/10 border border-green-500/30',
        Cancelled: 'text-red-400 bg-red-500/10 border border-red-500/30',
    };

    const handleReschedule = () => {
        // Mock action
        alert(`Reschedule functionality for "${booking.service.name}" is not yet implemented.`);
    };

    const handleCancel = () => {
        // Mock action
        if (window.confirm(`Are you sure you want to cancel your appointment for "${booking.service.name}"?`)) {
            alert("Your booking has been cancelled.");
            // In a real app, you would update the booking status here.
        }
    };
    
    // Parse 'YYYY-MM-DD' string as local date to prevent timezone issues.
    const dateParts = booking.date.split('-');
    const localDate = new Date(
        parseInt(dateParts[0]),
        parseInt(dateParts[1]) - 1,
        parseInt(dateParts[2])
    );

    return (
        <div className="bg-dark-gray p-4 rounded-lg">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-lg font-bold text-primary">{booking.service.name}</h3>
                    <p className="text-sm text-light-gray">with {booking.mechanic.name}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusColors[booking.status]}`}>
                    {booking.status}
                </span>
            </div>
            <div className="mt-3 pt-3 border-t border-field text-sm text-light-gray space-y-1">
                <p><strong>Date:</strong> {localDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p><strong>Time:</strong> {booking.time}</p>
            </div>
            <div className="mt-4 flex gap-2">
                {booking.status === 'Upcoming' && (
                    <>
                        <button onClick={handleReschedule} className="flex-1 bg-field text-white py-2 rounded-lg text-sm hover:bg-gray-600 transition">Reschedule</button>
                        <button onClick={handleCancel} className="flex-1 bg-red-600/20 text-red-400 py-2 rounded-lg text-sm hover:bg-red-600/40 transition">Cancel</button>
                    </>
                )}
                {booking.status === 'Completed' && (
                     <button onClick={() => navigate(`/booking/${booking.service.id}`)} className="flex-1 bg-primary text-white py-2 rounded-lg text-sm hover:bg-orange-600 transition">Book Again</button>
                )}
            </div>
        </div>
    );
};


const BookingHistoryScreen: React.FC = () => {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        // Simulate API call
        const timer = setTimeout(() => {
            setBookings(mockBookings);
            setLoading(false);
        }, 1000);

        return () => clearTimeout(timer);
    }, []);

    const { upcomingBookings, pastBookings } = useMemo(() => {
        const upcoming = bookings.filter(b => b.status === 'Upcoming').sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const past = bookings.filter(b => b.status !== 'Upcoming').sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return { upcomingBookings: upcoming, pastBookings: past };
    }, [bookings]);

    if (loading) {
        return (
            <div className="flex flex-col h-full bg-secondary">
                <Header title="Booking History" showBackButton />
                <div className="flex-grow flex items-center justify-center">
                    <Spinner size="lg" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-secondary">
            <Header title="Booking History" showBackButton />
            <div className="flex-grow overflow-y-auto p-4 space-y-6">
                <section>
                    <h2 className="text-xl font-semibold mb-3 text-white">Upcoming</h2>
                    {upcomingBookings.length > 0 ? (
                        <div className="space-y-4">
                            {upcomingBookings.map(booking => <BookingCard key={booking.id} booking={booking} />)}
                        </div>
                    ) : (
                        <div className="text-center py-8 px-4 bg-dark-gray rounded-lg">
                            <p className="text-light-gray">You have no upcoming bookings.</p>
                        </div>
                    )}
                </section>
                <section>
                    <h2 className="text-xl font-semibold mb-3 text-white">Past</h2>
                     {pastBookings.length > 0 ? (
                        <div className="space-y-4">
                            {pastBookings.map(booking => <BookingCard key={booking.id} booking={booking} />)}
                        </div>
                    ) : (
                         <div className="text-center py-8 px-4 bg-dark-gray rounded-lg">
                            <p className="text-light-gray">Your service history is empty.</p>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

export default BookingHistoryScreen;
