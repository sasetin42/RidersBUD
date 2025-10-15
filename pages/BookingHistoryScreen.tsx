import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '../components/Header';
import { Booking, BookingStatus } from '../types';
import Spinner from '../components/Spinner';
import { useDatabase } from '../context/DatabaseContext';
import { useAuth } from '../context/AuthContext';
import BookingStatusCard from '../components/BookingStatusCard';

const StarRatingInput: React.FC<{ rating: number; setRating: (rating: number) => void; }> = ({ rating, setRating }) => {
    const [hoverRating, setHoverRating] = useState(0);
    return (
        <div className="flex justify-center" onMouseLeave={() => setHoverRating(0)}>
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    className="text-4xl focus:outline-none"
                >
                    <span className={star <= (hoverRating || rating) ? 'text-yellow-400' : 'text-gray-600'}>
                        ★
                    </span>
                </button>
            ))}
        </div>
    );
};


const ReviewModal: React.FC<{
    booking: Booking;
    onClose: () => void;
    onSubmit: (review: { rating: number; comment: string }) => void;
}> = ({ booking, onClose, onSubmit }) => {
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = () => {
        if (rating === 0) {
            setError('Please select a star rating before submitting.');
            return;
        }
        setError('');
        onSubmit({ rating, comment });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fadeIn" role="dialog" aria-modal="true">
            <div className="bg-dark-gray rounded-lg p-6 w-full max-w-sm animate-scaleUp">
                <h2 className="text-xl font-bold mb-2">Rate Your Service</h2>
                <p className="text-light-gray mb-4">How was your experience with <span className="font-semibold text-primary">{booking.mechanic?.name}</span> for the {booking.service.name} service?</p>
                
                <StarRatingInput rating={rating} setRating={setRating} />
                {error && <p className="text-red-400 text-xs mt-2 text-center">{error}</p>}

                <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Share your experience... (optional)"
                    rows={4}
                    className="w-full px-4 py-3 mt-4 bg-field border border-dark-gray rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <div className="mt-6 flex gap-4">
                    <button onClick={onClose} className="w-1/2 bg-field text-white font-bold py-3 rounded-lg hover:bg-gray-600 transition">Cancel</button>
                    <button onClick={handleSubmit} className="w-1/2 bg-primary text-white font-bold py-3 rounded-lg hover:bg-orange-600 transition disabled:opacity-50" disabled={rating === 0}>Submit Review</button>
                </div>
            </div>
        </div>
    );
};


const PastBookingCard: React.FC<{ booking: Booking, onReview: (booking: Booking) => void }> = ({ booking, onReview }) => {
    const navigate = useNavigate();

    const statusClasses: { [key: string]: string } = {
        Completed: 'bg-green-500/10 text-green-400',
        Cancelled: 'bg-red-500/10 text-red-400',
    };

    const handleBookAgain = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigate(`/booking/${booking.service.id}`, { 
            state: { vehiclePlateNumber: booking.vehicle.plateNumber } 
        });
    };

    const dateParts = booking.date.split('-');
    const localDate = new Date(
        parseInt(dateParts[0]),
        parseInt(dateParts[1]) - 1,
        parseInt(dateParts[2])
    );

    return (
        <div className="bg-dark-gray p-4 rounded-lg flex flex-col gap-3">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-lg font-bold text-white">{booking.service.name}</h3>
                    <p className="text-sm text-light-gray">{localDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                </div>
                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${statusClasses[booking.status] || ''}`}>
                    {booking.status}
                </span>
            </div>
            
            {/* Details */}
            <div className="border-t border-field pt-3 space-y-2 text-sm">
                 <div className="flex items-center gap-2 text-light-gray">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" /></svg>
                    <span>Mechanic:</span>
                    <span className="font-medium text-white ml-auto">{booking.mechanic?.name || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2 text-light-gray">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 2a2 2 0 00-2 2v1H6V5a2 2 0 00-4 0v1H1a1 1 0 00-1 1v8a1 1 0 001 1h18a1 1 0 001-1V7a1 1 0 00-1-1h-1V5a2 2 0 00-4 0v1h-2V4a2 2 0 00-2-2h-2zM4 9a1 1 0 100-2 1 1 0 000 2zm12 0a1 1 0 100-2 1 1 0 000 2zM4 13a1 1 0 100-2 1 1 0 000 2zm12 0a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
                    <span>Vehicle:</span>
                    <span className="font-medium text-white ml-auto">{booking.vehicle.make} {booking.vehicle.model}</span>
                </div>
            </div>

            {/* Conditional Content */}
            {booking.status === 'Completed' && (
                <div className="border-t border-field pt-3 flex gap-2">
                    <button onClick={handleBookAgain} className="flex-1 bg-field text-white font-bold py-2 rounded-lg hover:bg-gray-600 transition text-sm">
                        Book Again
                    </button>
                    {!booking.isReviewed && (
                         <button onClick={() => onReview(booking)} className="flex-1 bg-primary text-white font-bold py-2 rounded-lg hover:bg-orange-600 transition text-sm">
                            Rate & Review
                        </button>
                    )}
                </div>
            )}
            {booking.status === 'Cancelled' && booking.cancellationReason && (
                 <div className="border-t border-field pt-3">
                    <p className="text-sm text-red-400">
                        <span className="font-semibold">Cancellation Reason:</span> {booking.cancellationReason}
                    </p>
                </div>
            )}
        </div>
    );
};


const BookingHistoryScreen: React.FC = () => {
    const { plateNumber } = useParams<{ plateNumber?: string }>();
    const { db, addReviewToMechanic, loading } = useDatabase();
    const { user } = useAuth();
    
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [reviewingBooking, setReviewingBooking] = useState<Booking | null>(null);
    const [statusFilter, setStatusFilter] = useState<BookingStatus | 'all'>('all');
    const [mechanicFilter, setMechanicFilter] = useState<string>('all');
    const [vehicleFilter, setVehicleFilter] = useState<string>(plateNumber || 'all');
    const [dateFilter, setDateFilter] = useState({ start: '', end: '' });

    const { upcomingBookings, pastBookings } = useMemo(() => {
        if (!user || !db) {
            return { upcomingBookings: [], pastBookings: [] };
        }

        let bookingsToFilter = db.bookings.filter(b => b.customerName === user.name);

        const upcoming = bookingsToFilter
            .filter(b => b.status === 'Upcoming' || b.status === 'En Route' || b.status === 'In Progress' || b.status === 'Mechanic Assigned' || b.status === 'Booking Confirmed' )
            .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            
        let past = bookingsToFilter.filter(b => b.status === 'Completed' || b.status === 'Cancelled');

        // Apply filters to past bookings
        if (statusFilter !== 'all') {
            past = past.filter(b => b.status === statusFilter);
        }
        if (mechanicFilter !== 'all') {
            past = past.filter(b => b.mechanic?.id === mechanicFilter);
        }
        if (vehicleFilter !== 'all') {
            past = past.filter(b => b.vehicle.plateNumber === vehicleFilter);
        }
        if (dateFilter.start && dateFilter.end) {
            const startDate = new Date(dateFilter.start.replace(/-/g, '/')).getTime();
            const endDateObj = new Date(dateFilter.end.replace(/-/g, '/'));
            endDateObj.setDate(endDateObj.getDate() + 1);
            const endDate = endDateObj.getTime();

            past = past.filter(b => {
                const bookingDate = new Date(b.date.replace(/-/g, '/')).getTime();
                return bookingDate >= startDate && bookingDate < endDate;
            });
        }
        
        past.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return { upcomingBookings: upcoming, pastBookings: past };
    }, [db, user, statusFilter, mechanicFilter, vehicleFilter, dateFilter]);

    const handleOpenReviewModal = (booking: Booking) => {
        setReviewingBooking(booking);
        setIsReviewModalOpen(true);
    };

    const handleCloseReviewModal = () => {
        setReviewingBooking(null);
        setIsReviewModalOpen(false);
    };

    const handleSubmitReview = (review: { rating: number; comment: string }) => {
        if (reviewingBooking && reviewingBooking.mechanic && user) {
            addReviewToMechanic(reviewingBooking.mechanic.id, reviewingBooking.id, review, user.name);
            handleCloseReviewModal();
        } else {
            alert("Could not submit review. Mechanic or user information is missing.");
        }
    };


    if (loading || !db || !user) {
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
            <Header title={plateNumber ? `History for ${plateNumber}` : "Booking History"} showBackButton />
            
             <div className="p-4 border-b border-dark-gray space-y-3">
                <h3 className="text-sm font-semibold text-light-gray">Filter Past Bookings</h3>
                <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
                     <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="w-full px-3 py-2 bg-field border border-dark-gray rounded-lg text-white text-sm"
                    >
                        <option value="all">All Statuses</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                    </select>
                     <select
                        value={vehicleFilter}
                        onChange={(e) => setVehicleFilter(e.target.value)}
                        className="w-full px-3 py-2 bg-field border border-dark-gray rounded-lg text-white text-sm"
                    >
                        <option value="all">All Vehicles</option>
                        {user.vehicles.map(v => <option key={v.plateNumber} value={v.plateNumber}>{v.make} {v.model}</option>)}
                    </select>
                     <select
                        value={mechanicFilter}
                        onChange={(e) => setMechanicFilter(e.target.value)}
                        className="w-full px-3 py-2 bg-field border border-dark-gray rounded-lg text-white text-sm col-span-2"
                    >
                        <option value="all">All Mechanics</option>
                        {db.mechanics.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                    <input
                        type="date"
                        value={dateFilter.start}
                        onChange={e => setDateFilter(prev => ({ ...prev, start: e.target.value }))}
                        className="w-full px-3 py-2 bg-field border border-dark-gray rounded-lg text-white text-sm"
                        aria-label="Start date for filtering"
                        placeholder="Start Date"
                    />
                    <input
                        type="date"
                        value={dateFilter.end}
                        min={dateFilter.start}
                        onChange={e => setDateFilter(prev => ({ ...prev, end: e.target.value }))}
                        className="w-full px-3 py-2 bg-field border border-dark-gray rounded-lg text-white text-sm"
                        aria-label="End date for filtering"
                        placeholder="End Date"
                    />
                </div>
            </div>

            <div className="flex-grow overflow-y-auto p-4 space-y-8">
                <section>
                    <h2 className="text-xl font-semibold mb-3 text-white px-2">Upcoming</h2>
                    {upcomingBookings.length > 0 ? (
                        <div className="space-y-4">
                            {upcomingBookings.map(booking => <BookingStatusCard key={booking.id} booking={booking} />)}
                        </div>
                    ) : (
                        <div className="text-center py-8 px-4 bg-dark-gray rounded-lg">
                            <p className="text-light-gray">You have no upcoming bookings.</p>
                        </div>
                    )}
                </section>
                <section>
                    <h2 className="text-xl font-semibold mb-3 text-white px-2">Past</h2>
                     {pastBookings.length > 0 ? (
                        <div className="space-y-4">
                            {pastBookings.map(booking => <PastBookingCard key={booking.id} booking={booking} onReview={handleOpenReviewModal} />)}
                        </div>
                    ) : (
                         <div className="text-center py-8 px-4 bg-dark-gray rounded-lg">
                            <p className="text-light-gray">No past bookings match the current filters.</p>
                        </div>
                    )}
                </section>
            </div>
            {isReviewModalOpen && reviewingBooking && (
                <ReviewModal 
                    booking={reviewingBooking}
                    onClose={handleCloseReviewModal}
                    onSubmit={handleSubmitReview}
                />
            )}
        </div>
    );
};

export default BookingHistoryScreen;