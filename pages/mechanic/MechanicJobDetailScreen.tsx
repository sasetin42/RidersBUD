import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../../components/Header';
import Spinner from '../../components/Spinner';
import { useDatabase } from '../../context/DatabaseContext';
import { BookingStatus, Customer, Vehicle } from '../../types';
import MechanicCustomerChatModal from '../../components/mechanic/MechanicCustomerChatModal';
import DirectionsModal from '../../components/mechanic/DirectionsModal';

const DetailRow: React.FC<{ label: string, value: string, icon?: React.ReactNode }> = ({ label, value, icon }) => (
    <div className="flex items-start justify-between py-2">
        <div className="flex items-center text-light-gray">
            {icon && <span className="mr-2">{icon}</span>}
            <span>{label}</span>
        </div>
        <span className="font-semibold text-white text-right">{value}</span>
    </div>
);

const MechanicJobDetailScreen: React.FC = () => {
    const { bookingId } = useParams<{ bookingId: string }>();
    const { db, updateBookingStatus, updateBookingNotes, loading } = useDatabase();
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isDirectionsOpen, setIsDirectionsOpen] = useState(false);
    
    const booking = db?.bookings.find(b => b.id === bookingId);
    const customer = db?.customers.find(c => c.name === booking?.customerName);
    const vehicle = booking?.vehicle;
    
    const [notes, setNotes] = useState(booking?.notes || '');
    const [isSavingNotes, setIsSavingNotes] = useState(false);
    const [notesSuccess, setNotesSuccess] = useState(false);
    
    if (loading || !db) {
        return <div className="flex items-center justify-center h-full"><Spinner size="lg" /></div>;
    }

    if (!booking || !customer || !vehicle) {
        return (
            <div className="flex flex-col h-full bg-secondary">
                <Header title="Job Not Found" showBackButton />
                <div className="flex-grow flex items-center justify-center p-4 text-center">
                    <p>The requested job details could not be found. It may have been cancelled or reassigned.</p>
                </div>
            </div>
        );
    }
    
    const handleSaveNotes = async () => {
        setIsSavingNotes(true);
        await updateBookingNotes(booking.id, notes);
        setIsSavingNotes(false);
        setNotesSuccess(true);
        setTimeout(() => setNotesSuccess(false), 2000);
    };
    
    const handleGetDirections = () => {
        if (customer?.lat && customer?.lng) {
            setIsDirectionsOpen(true);
        } else {
            alert("Customer location data is not available for navigation.");
        }
    };

    const statusOptions: BookingStatus[] = ['Upcoming', 'En Route', 'In Progress', 'Completed'];

    return (
        <div className="flex flex-col h-full bg-secondary">
            <Header title={`Job #${booking.id.toUpperCase().slice(-6)}`} showBackButton />
            <div className="flex-grow p-4 space-y-4 overflow-y-auto">
                {/* Service Info */}
                <div className="bg-dark-gray p-4 rounded-lg">
                    <h2 className="text-xl font-bold text-primary mb-2">{booking.service.name}</h2>
                    <DetailRow label="Date" value={new Date(booking.date.replace(/-/g, '/')).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} />
                    <DetailRow label="Time" value={booking.time} />
                </div>


                {/* Customer & Vehicle Info */}
                <div className="bg-dark-gray p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-white mb-2">Customer & Vehicle</h3>
                    <DetailRow label="Customer" value={customer.name} />
                    <DetailRow label="Phone" value={customer.phone} />
                    <DetailRow label="Vehicle" value={`${vehicle.year} ${vehicle.make} ${vehicle.model}`} />
                    <DetailRow label="Plate No." value={vehicle.plateNumber} />
                </div>

                {/* Status History */}
                {booking.statusHistory && booking.statusHistory.length > 0 && (
                    <div className="bg-dark-gray p-4 rounded-lg">
                        <h3 className="text-lg font-semibold text-white mb-3">Status History</h3>
                        <div className="space-y-3">
                            {booking.statusHistory.map((s, i) => (
                                <div key={i} className="flex items-center text-sm">
                                    <div className="w-2.5 h-2.5 bg-primary rounded-full mr-3"></div>
                                    <div className="flex-grow flex justify-between">
                                        <span className="text-light-gray">{s.status}</span>
                                        <span className="text-xs text-gray-500">{new Date(s.timestamp).toLocaleString()}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Job Notes */}
                <div className="bg-dark-gray p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-white mb-2">Job Notes</h3>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add details about work performed, parts used, or customer requests..."
                        rows={5}
                        className="w-full p-2 bg-field border border-secondary rounded-md text-sm placeholder-light-gray focus:ring-primary focus:border-primary"
                    />
                    <button
                        onClick={handleSaveNotes}
                        disabled={isSavingNotes}
                        className={`w-full font-bold py-2 px-4 rounded-lg transition mt-3 text-sm flex items-center justify-center ${
                            notesSuccess
                            ? 'bg-green-600 text-white'
                            : 'bg-primary text-white hover:bg-orange-600 disabled:opacity-50'
                        }`}
                    >
                        {isSavingNotes ? <Spinner size="sm" /> : notesSuccess ? '✓ Saved' : 'Save Notes'}
                    </button>
                </div>

                {/* Actions */}
                <div className="bg-dark-gray p-4 rounded-lg space-y-3">
                     <button onClick={() => setIsChatOpen(true)} className="w-full bg-field text-white font-bold py-3 rounded-lg hover:bg-gray-600 transition">
                        Chat with {customer.name.split(' ')[0]}
                     </button>
                     <button onClick={handleGetDirections} className="w-full bg-field text-white font-bold py-3 rounded-lg hover:bg-gray-600 transition">
                        Get Directions
                     </button>
                </div>
                
                {/* Status Management */}
                <div className="bg-dark-gray p-4 rounded-lg">
                     <h3 className="text-lg font-semibold text-white mb-2">Manage Status</h3>
                     <select
                        value={booking.status}
                        onChange={(e) => updateBookingStatus(booking.id, e.target.value as BookingStatus)}
                        className="w-full p-3 bg-field border border-secondary rounded-md"
                    >
                        {statusOptions.map(status => (
                            <option key={status} value={status}>{status}</option>
                        ))}
                    </select>
                     {booking.status === 'In Progress' && (
                        <button 
                            onClick={() => updateBookingStatus(booking.id, 'Completed')}
                            className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition mt-3"
                        >
                            Mark as Complete
                        </button>
                    )}
                </div>

            </div>
            {isChatOpen && booking.mechanic && (
                <MechanicCustomerChatModal
                    booking={booking}
                    customer={customer}
                    mechanic={booking.mechanic}
                    onClose={() => setIsChatOpen(false)}
                />
            )}
             {isDirectionsOpen && customer && (
                <DirectionsModal 
                    booking={booking}
                    customer={customer}
                    onClose={() => setIsDirectionsOpen(false)}
                />
            )}
        </div>
    );
};

export default MechanicJobDetailScreen;