import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { Booking } from '../types';
import { useAuth } from '../context/AuthContext';
import CustomerMechanicChatModal from '../components/customer/CustomerMechanicChatModal';
import MapComponent from '../components/MapComponent';

declare const L: any; // Declare Leaflet global

const BookingConfirmationScreen: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user: customer } = useAuth();
    const { bookings } = (location.state as { bookings: Booking[] }) || {};
    const [isChatOpen, setIsChatOpen] = useState(false);

    React.useEffect(() => {
        if (!bookings || bookings.length === 0) {
            navigate('/');
        }
    }, [bookings, navigate]);

    if (!bookings || bookings.length === 0 || !customer) {
        return null;
    }

    // Use the first booking for common details
    const primaryBooking = bookings[0];
    const { mechanic, vehicle } = primaryBooking;
    const totalCost = bookings.reduce((sum, b) => sum + b.service.price, 0);
    const serviceLocation = primaryBooking.location;

    // Prepare marker for the map
    const mapMarkers = serviceLocation && typeof L !== 'undefined' ? [{
        id: 'service-location', // Add a unique ID for the marker
        position: [serviceLocation.lat, serviceLocation.lng] as [number, number],
        popupContent: 'Service Location',
        icon: L.divIcon({
            html: `<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-primary animate-pulse" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 21l-4.95-6.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" /></svg>`,
            className: 'bg-transparent border-0',
            iconSize: [32, 32],
            iconAnchor: [16, 32]
        })
    }] : [];
    
    const handleSetReminder = () => {
        // Just set a reminder for the first service in the bundle
        navigate('/reminders', {
            state: {
                serviceName: primaryBooking.service.name,
                date: primaryBooking.date,
                vehicle: `${primaryBooking.vehicle.make} ${primaryBooking.vehicle.model}`
            }
        });
    };

    const handleBookAgain = () => {
        const serviceIds = bookings.map(b => b.service.id);
        navigate(`/booking/${serviceIds[0]}`, { 
            state: { 
                vehiclePlateNumber: primaryBooking.vehicle.plateNumber,
                initialServiceIds: serviceIds
            } 
        });
    };

    return (
        <div className="flex flex-col h-full bg-secondary">
            <Header title={`Booking #${primaryBooking.id.toUpperCase().slice(-6)}`} />
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
                            <div className="mt-2 space-y-2">
                                {bookings.map(b => (
                                    <div key={b.id} className="flex justify-between items-center text-white">
                                        <span className="text-sm">{b.service.name}</span>
                                        <span className="text-sm font-semibold">₱{b.service.price.toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between items-baseline mt-3 pt-3 border-t border-field">
                                <span className="text-lg font-bold text-primary">Total</span>
                                <span className="text-lg font-bold text-primary">₱{totalCost.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-start mt-4 text-left">
                                <div>
                                    <p className="text-sm text-light-gray mb-1">Date</p>
                                    <p className="font-semibold text-white">{new Date(primaryBooking.date.replace(/-/g, '/')).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-light-gray mb-1">Time</p>
                                    <p className="font-semibold text-white">{primaryBooking.time}</p>
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
                                    <img src={vehicle.imageUrls[0]} alt={`${vehicle.make} ${vehicle.model}`} className="w-24 h-16 object-cover rounded-md flex-shrink-0 bg-secondary" />
                                    <div>
                                        <p className="font-bold text-white">{vehicle.make} {vehicle.model} ({vehicle.year})</p>
                                        <p className="text-sm bg-field inline-block px-2 py-0.5 mt-1 rounded font-mono tracking-wider text-white">{vehicle.plateNumber}</p>
                                    </div>
                                </div>
                            </div>
                        </>

                        {/* Service Location Map */}
                        {serviceLocation && (
                            <>
                                <hr className="border-field mx-5" />
                                <div className="p-5">
                                    <p className="text-sm font-bold text-primary tracking-wider uppercase mb-3">Service Location</p>
                                    <div className="h-48 w-full rounded-lg overflow-hidden bg-field">
                                        <MapComponent
                                            center={[serviceLocation.lat, serviceLocation.lng]}
                                            zoom={15}
                                            markers={mapMarkers}
                                            disableScrollZoom={true}
                                        />
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
             <div className="p-4 bg-[#1D1D1D] border-t border-dark-gray flex flex-col gap-3">
                 <button
                    onClick={handleBookAgain}
                    className="w-full bg-field text-white font-bold py-3 rounded-lg hover:bg-gray-600 transition"
                >
                    Book Again
                </button>
                <button
                    onClick={handleSetReminder}
                    className="w-full bg-blue-500/20 text-blue-300 font-bold py-3 rounded-lg hover:bg-blue-500/40 transition"
                >
                    Set Maintenance Reminder
                </button>
                <div className="flex gap-3">
                    <button 
                        onClick={() => navigate('/booking-history')} 
                        className="w-1/2 bg-field text-white font-bold py-3 rounded-lg hover:bg-gray-700 transition"
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
                    booking={primaryBooking}
                    customer={customer}
                    mechanic={mechanic}
                    onClose={() => setIsChatOpen(false)}
                />
            )}
        </div>
    );
};

export default BookingConfirmationScreen;