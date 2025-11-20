import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../../components/Header';
import Spinner from '../../components/Spinner';
import { useDatabase } from '../../context/DatabaseContext';
import { BookingStatus, Customer, Vehicle, Booking } from '../../types';
import MechanicCustomerChatModal from '../../components/mechanic/MechanicCustomerChatModal';
import DirectionsModal from '../../components/mechanic/DirectionsModal';
import { fileToBase64 } from '../../utils/fileUtils';

declare const L: any;

const DetailRow: React.FC<{ label: string, value: string, icon?: React.ReactNode }> = ({ label, value, icon }) => (
    <div className="flex items-start justify-between py-2">
        <div className="flex items-center text-light-gray">
            {icon && <span className="mr-2">{icon}</span>}
            <span>{label}</span>
        </div>
        <span className="font-semibold text-white text-right">{value}</span>
    </div>
);

const ImageUploadSection: React.FC<{
    title: string;
    images: string[];
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onDelete: (index: number) => void;
}> = ({ title, images, onUpload, onDelete }) => (
    <div>
        <h4 className="font-semibold text-primary mb-2">{title}</h4>
        <div className="grid grid-cols-2 gap-2 mb-2">
            {images.map((img, i) => (
                <div key={i} className="relative group">
                    <img src={img} className="w-full h-24 object-cover rounded-md" alt={`${title} ${i + 1}`} />
                    <button onClick={() => onDelete(i)} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">&times;</button>
                </div>
            ))}
        </div>
        {images.length < 2 && (
            <div className="bg-field p-4 rounded-lg border-2 border-dashed border-dark-gray text-center">
                <label htmlFor={`${title}-upload`} className="cursor-pointer text-sm text-light-gray">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-auto mb-1 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    Add Photo ({images.length}/2)
                </label>
                <input id={`${title}-upload`} type="file" multiple accept="image/*" onChange={onUpload} className="hidden" />
            </div>
        )}
    </div>
);

const AwaitingPaymentModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fadeIn">
        <div className="bg-dark-gray rounded-xl p-6 shadow-2xl animate-scaleUp border border-primary/30 w-full max-w-sm text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-primary mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-xl font-bold text-white">Job Complete!</h2>
            <p className="text-light-gray mt-2 mb-4">
                The customer has been notified and sent an invoice. You will be notified once payment is confirmed.
            </p>
            <button onClick={onClose} className="w-full bg-primary text-white font-bold py-2 rounded-lg hover:bg-orange-600 transition">
                Okay
            </button>
        </div>
    </div>
);

const JobTimeline: React.FC<{ booking: Booking }> = ({ booking }) => {
    const timelineSteps: BookingStatus[] = ['Booking Confirmed', 'Mechanic Assigned', 'En Route', 'In Progress', 'Completed'];

    const currentStatusIndex = useMemo(() => {
        if (!booking) return -1;
        
        let highestIndex = -1;
        const allStatuses = [...(booking.statusHistory?.map(h => h.status) || []), booking.status];
        
        for (const status of allStatuses) {
            const index = timelineSteps.indexOf(status as BookingStatus);
            if (index > highestIndex) {
                highestIndex = index;
            }
        }
        return highestIndex;
    }, [booking]);

    return (
        <div className="bg-dark-gray p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-4">Job Timeline</h3>
            <div className="relative pl-5">
                {timelineSteps.map((step, index) => {
                    const isCompleted = index < currentStatusIndex;
                    const isActive = index === currentStatusIndex;

                    return (
                        <div key={step} className={`relative pb-8 ${index === timelineSteps.length - 1 ? 'pb-0' : ''}`}>
                            {index < timelineSteps.length - 1 && (
                                <div className={`absolute top-2.5 left-[7px] w-0.5 h-full ${isCompleted ? 'bg-primary' : 'bg-field'}`}></div>
                            )}
                            <div className="flex items-center">
                                <div className={`-left-3.5 absolute w-4 h-4 rounded-full flex items-center justify-center ${
                                    isActive ? 'bg-primary ring-4 ring-primary/30' : isCompleted ? 'bg-primary' : 'bg-field'
                                }`}>
                                    {isCompleted && <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                </div>
                                <p className={`font-semibold text-sm ml-4 ${
                                    isActive ? 'text-primary' : isCompleted ? 'text-white' : 'text-gray-500'
                                }`}>{step}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};


const MechanicJobProgressModal: React.FC<{
    booking: Booking;
    customer: Customer;
    onClose: () => void;
}> = ({ booking, customer, onClose }) => {
    const { updateBookingNotes, updateBookingImages } = useDatabase();
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);

    const [notes, setNotes] = useState(booking?.notes || '');
    const [isSavingNotes, setIsSavingNotes] = useState(false);
    const [notesSuccess, setNotesSuccess] = useState(false);
    
    const [beforeImages, setBeforeImages] = useState<string[]>(booking?.beforeImages || []);
    const [afterImages, setAfterImages] = useState<string[]>(booking?.afterImages || []);
    const [isSavingImages, setIsSavingImages] = useState(false);
    const [imagesSuccess, setImagesSuccess] = useState(false);

    useEffect(() => {
        if (!mapRef.current || !customer.lat || !customer.lng || mapInstanceRef.current || typeof L === 'undefined') return;

        mapInstanceRef.current = L.map(mapRef.current).setView([customer.lat, customer.lng], 15);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: '&copy; CARTO' }).addTo(mapInstanceRef.current);
        const workIcon = L.divIcon({
            html: `<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-primary" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.532 1.532 0 012.287-.947c1.372.836 2.942-.734-2.106-2.106a1.532 1.532 0 01.947-2.287c1.561-.379-1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" /></svg>`,
            className: 'bg-transparent border-0', iconSize: [32, 32], iconAnchor: [16, 16]
        });
        L.marker([customer.lat, customer.lng], { icon: workIcon }).addTo(mapInstanceRef.current).bindPopup("Service Location");
        setTimeout(() => mapInstanceRef.current?.invalidateSize(), 100);
        return () => { mapInstanceRef.current?.remove(); mapInstanceRef.current = null; };
    }, [customer]);

    const handleSaveNotes = async () => {
        setIsSavingNotes(true);
        await updateBookingNotes(booking.id, notes);
        setIsSavingNotes(false);
        setNotesSuccess(true);
        setTimeout(() => setNotesSuccess(false), 2000);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        const targetArray = type === 'before' ? beforeImages : afterImages;
        const filesToProcess = files.slice(0, 2 - targetArray.length);
        if (filesToProcess.length === 0) { alert(`You can only upload a maximum of 2 ${type} images.`); return; }
        const base64Promises = filesToProcess.map((file: File) => fileToBase64(file));
        const newImages = await Promise.all(base64Promises);
        if (type === 'before') setBeforeImages(prev => [...prev, ...newImages]);
        else setAfterImages(prev => [...prev, ...newImages]);
    };

    const handleDeleteImage = (index: number, type: 'before' | 'after') => {
        if (type === 'before') setBeforeImages(prev => prev.filter((_, i) => i !== index));
        else setAfterImages(prev => prev.filter((_, i) => i !== index));
    };
    
    const handleSaveImages = async () => {
        setIsSavingImages(true);
        await updateBookingImages(booking.id, beforeImages, afterImages);
        setIsSavingImages(false);
        setImagesSuccess(true);
        setTimeout(() => setImagesSuccess(false), 2000);
    };

    return (
        <div className="fixed inset-0 bg-secondary/90 backdrop-blur-sm flex flex-col z-50 p-0 sm:p-4 animate-slideInUp" role="dialog" aria-modal="true">
            <div className="relative bg-secondary rounded-t-2xl sm:rounded-2xl flex flex-col h-full max-w-2xl mx-auto w-full">
                <header className="flex-shrink-0 p-4 border-b border-dark-gray flex items-center justify-center">
                    <h2 className="text-xl font-bold text-white">Job Progress</h2>
                    <button onClick={onClose} className="absolute right-4 text-white text-3xl">&times;</button>
                </header>
                 <main className="flex-grow overflow-y-auto p-4 space-y-4">
                    {/* Job Documentation */}
                     <div className="bg-dark-gray p-4 rounded-lg">
                        <h3 className="text-lg font-semibold text-white mb-3">Job Documentation</h3>
                        <div className="space-y-4">
                            <ImageUploadSection title="Before Service" images={beforeImages} onUpload={(e) => handleImageUpload(e, 'before')} onDelete={(i) => handleDeleteImage(i, 'before')} />
                            <ImageUploadSection title="After Service" images={afterImages} onUpload={(e) => handleImageUpload(e, 'after')} onDelete={(i) => handleDeleteImage(i, 'after')} />
                        </div>
                         <button onClick={handleSaveImages} disabled={isSavingImages} className={`w-full font-bold py-2 px-4 rounded-lg transition mt-4 text-sm flex items-center justify-center ${imagesSuccess ? 'bg-green-600 text-white' : 'bg-primary text-white hover:bg-orange-600 disabled:opacity-50'}`}>
                            {isSavingImages ? <Spinner size="sm" /> : imagesSuccess ? '✓ Images Saved' : 'Save Documentation'}
                        </button>
                    </div>

                    {/* Job Notes */}
                    <div className="bg-dark-gray p-4 rounded-lg">
                        <h3 className="text-lg font-semibold text-white mb-2">Job Notes</h3>
                        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add details about work performed, parts used, or customer requests..." rows={5} className="w-full p-2 bg-field border border-secondary rounded-md text-sm placeholder-light-gray focus:ring-primary focus:border-primary" />
                        <button onClick={handleSaveNotes} disabled={isSavingNotes} className={`w-full font-bold py-2 px-4 rounded-lg transition mt-3 text-sm flex items-center justify-center ${notesSuccess ? 'bg-green-600 text-white' : 'bg-primary text-white hover:bg-orange-600 disabled:opacity-50'}`}>
                            {isSavingNotes ? <Spinner size="sm" /> : notesSuccess ? '✓ Notes Saved' : 'Save Notes'}
                        </button>
                    </div>
                    
                     {/* Service Location */}
                     <div className="bg-dark-gray p-4 rounded-lg">
                        <h3 className="text-lg font-semibold text-white mb-2">Service Location</h3>
                        <div ref={mapRef} className="h-40 w-full rounded-lg" />
                    </div>
                </main>
            </div>
        </div>
    );
};

const MechanicJobDetailScreen: React.FC = () => {
    const { bookingId } = useParams<{ bookingId: string }>();
    const { db, updateBookingStatus, loading } = useDatabase();
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isDirectionsOpen, setIsDirectionsOpen] = useState(false);
    const [showAwaitingPaymentModal, setShowAwaitingPaymentModal] = useState(false);
    const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
    
    const booking = db?.bookings.find(b => b.id === bookingId);
    const customer = db?.customers.find(c => c.name === booking?.customerName);
    const vehicle = booking?.vehicle;
    
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
    
    const handleGetDirections = () => {
        if (customer?.lat && customer?.lng) {
            setIsDirectionsOpen(true);
        } else {
            alert("Customer location data is not available for navigation.");
        }
    };

    // Fix: Changed parameter type from BookingStatus to string to match event value type.
    const handleStatusChange = (newStatus: string) => {
        // Fix: Cast the string to BookingStatus before calling the update function.
        updateBookingStatus(booking.id, newStatus as BookingStatus);
        if (newStatus === 'Completed') {
            setShowAwaitingPaymentModal(true);
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

                <JobTimeline booking={booking} />
                
                 {(booking.status === 'In Progress' || booking.status === 'Completed') && (
                    <div className="bg-dark-gray p-4 rounded-lg">
                        <button 
                            onClick={() => setIsProgressModalOpen(true)}
                            className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-orange-600 transition flex items-center justify-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>
                            View / Edit Job Progress
                        </button>
                    </div>
                )}


                {/* Actions */}
                <div className="bg-dark-gray p-4 rounded-lg">
                     <div className="flex gap-3">
                         <button onClick={() => setIsChatOpen(true)} className="flex-1 bg-field text-white font-bold py-3 rounded-lg hover:bg-gray-600 transition">
                            Chat
                         </button>
                         <a href={`tel:${customer.phone}`} className="flex-1 bg-field text-white font-bold py-3 rounded-lg hover:bg-gray-600 transition text-center flex items-center justify-center">
                            Call
                        </a>
                         <button onClick={handleGetDirections} className="flex-1 bg-field text-white font-bold py-3 rounded-lg hover:bg-gray-600 transition">
                            Directions
                         </button>
                     </div>
                </div>
                
                {/* Status Management */}
                {booking.status !== 'Completed' && (
                    <div className="bg-dark-gray p-4 rounded-lg">
                        <h3 className="text-lg font-semibold text-white mb-2">Manage Status</h3>
                        <select
                            value={booking.status}
                            onChange={(e) => handleStatusChange(e.target.value)}
                            className="w-full p-3 bg-field border border-secondary rounded-md"
                        >
                            {statusOptions.map(status => (
                                <option key={status} value={status}>{status}</option>
                            ))}
                        </select>
                        {booking.status === 'In Progress' && (
                            <button 
                                onClick={() => handleStatusChange('Completed')}
                                className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition mt-3"
                            >
                                Mark as Complete
                            </button>
                        )}
                    </div>
                )}
            </div>

            {isProgressModalOpen && (
                <MechanicJobProgressModal
                    booking={booking}
                    customer={customer}
                    onClose={() => setIsProgressModalOpen(false)}
                />
            )}
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
            {showAwaitingPaymentModal && <AwaitingPaymentModal onClose={() => setShowAwaitingPaymentModal(false)} />}
        </div>
    );
};

export default MechanicJobDetailScreen;