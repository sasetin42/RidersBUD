
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../../components/Header';
import Spinner from '../../components/Spinner';
import { useDatabase } from '../../context/DatabaseContext';
import { BookingStatus, Customer, Vehicle, Booking } from '../../types';
import MechanicCustomerChatModal from '../../components/mechanic/MechanicCustomerChatModal';
import { fileToBase64 } from '../../utils/fileUtils';
import MapComponent, { MapMarker } from '../../components/MapComponent';
import Modal from '../../components/admin/Modal';

declare const L: any;

const UpdateEtaModal: React.FC<{
    booking: Booking;
    onClose: () => void;
    onSave: (eta: number) => void;
}> = ({ booking, onClose, onSave }) => {
    const [eta, setEta] = useState(booking.eta || '');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        const newEta = Number(eta);
        if (!isNaN(newEta) && newEta > 0) {
            setIsSaving(true);
            await onSave(newEta);
            setIsSaving(false);
        }
    };

    return (
        <Modal title="Update ETA" isOpen={true} onClose={onClose}>
            <div className="space-y-4">
                <p className="text-sm text-light-gray">
                    Enter your new estimated time of arrival in minutes. The customer will be notified.
                </p>
                <div>
                    <label className="text-xs text-light-gray">ETA (in minutes)</label>
                    <input
                        type="number"
                        value={eta}
                        onChange={e => setEta(e.target.value)}
                        placeholder="e.g., 25"
                        className="w-full p-2 bg-field border border-secondary rounded-md"
                    />
                </div>
            </div>
            <div className="mt-6 flex justify-end gap-4">
                <button onClick={onClose} className="bg-field text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-600 transition">Cancel</button>
                <button onClick={handleSave} disabled={isSaving || !eta} className="bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-orange-600 transition flex items-center justify-center min-w-[100px] disabled:opacity-50">
                    {isSaving ? <Spinner size="sm" /> : 'Save ETA'}
                </button>
            </div>
        </Modal>
    );
};


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
                    const historyEntry = booking.statusHistory?.find(s => s.status === step);

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
                                <div className="ml-4">
                                    <p className={`font-semibold text-sm ${
                                        isActive ? 'text-primary' : isCompleted ? 'text-white' : 'text-gray-500'
                                    }`}>{step}</p>
                                    {historyEntry && (
                                        <p className="text-xs text-gray-400">{new Date(historyEntry.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                    )}
                                </div>
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
    
    const [notes, setNotes] = useState(booking?.notes || '');
    const [isSavingNotes, setIsSavingNotes] = useState(false);
    const [notesSuccess, setNotesSuccess] = useState(false);
    
    const [beforeImages, setBeforeImages] = useState<string[]>(booking?.beforeImages || []);
    const [afterImages, setAfterImages] = useState<string[]>(booking?.afterImages || []);
    const [isSavingImages, setIsSavingImages] = useState(false);
    const [imagesSuccess, setImagesSuccess] = useState(false);

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
                </main>
            </div>
        </div>
    );
};

const MechanicJobDetailScreen: React.FC = () => {
    const { bookingId } = useParams<{ bookingId: string }>();
    const { db, updateBooking, updateBookingStatus, updateMechanicLocation, respondToReschedule, loading } = useDatabase();
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [showAwaitingPaymentModal, setShowAwaitingPaymentModal] = useState(false);
    const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
    const [isEtaModalOpen, setIsEtaModalOpen] = useState(false);
    const watchIdRef = useRef<number | null>(null);
    
    const booking = db?.bookings.find(b => b.id === bookingId);
    const customer = db?.customers.find(c => c.name === booking?.customerName);
    const vehicle = booking?.vehicle;
    const mechanic = booking?.mechanic;
    
    useEffect(() => {
        if (booking?.status !== 'En Route' && watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }
        };
    }, [booking?.status]);

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
    
    const handleAcceptJob = () => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser.");
            return;
        }

        if (!mechanic) {
            alert("Cannot start job: mechanic data is missing.");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                updateBookingStatus(booking.id, 'En Route');
                const { latitude, longitude } = position.coords;
                updateMechanicLocation(mechanic.id, { lat: latitude, lng: longitude });
                
                // Open ETA Modal right after setting status to 'En Route'
                setIsEtaModalOpen(true);

                watchIdRef.current = navigator.geolocation.watchPosition(
                    (pos) => updateMechanicLocation(mechanic.id, { lat: pos.coords.latitude, lng: pos.coords.longitude }),
                    (err) => console.warn(`Geolocation watch error: ${err.message}`),
                    { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
                );
            },
            () => alert("Location access denied. You must enable location services to start this job.")
        );
    };

    const handleUpdateStatus = (newStatus: BookingStatus) => {
        if (newStatus === 'Completed') {
            // Validate documentation
            if ((!booking.afterImages || booking.afterImages.length === 0) || !booking.notes) {
                alert("Please add at least one 'After Service' photo and job notes before marking as complete.");
                setIsProgressModalOpen(true);
                return;
            }
            updateBookingStatus(booking.id, newStatus);
            setShowAwaitingPaymentModal(true);
        } else {
            updateBookingStatus(booking.id, newStatus);
        }
    };

    const handleSaveEta = async (eta: number) => {
        await updateBooking(booking.id, { eta });
        setIsEtaModalOpen(false);
    };

    const handleRescheduleResponse = (response: 'accepted' | 'rejected') => {
        respondToReschedule(booking.id, response);
    };
    
    const mapMarkers = useMemo((): MapMarker[] => {
        const markers: MapMarker[] = [];
        if (mechanic?.lat && mechanic.lng) {
            markers.push({
                id: 'mechanic',
                position: [mechanic.lat, mechanic.lng],
                popupContent: 'Your Location',
                icon: L.divIcon({ html: `<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-primary" viewBox="0 0 24 24" fill="currentColor"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>`, className: 'bg-transparent border-0', iconSize: [32, 32], iconAnchor: [16, 32] })
            });
        }
        if (customer?.lat && customer.lng) {
            markers.push({
                id: 'customer',
                position: [customer.lat, customer.lng],
                popupContent: 'Customer Location',
                icon: L.divIcon({ html: `<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-blue-400 animate-pulse" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 21l-4.95-6.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" /></svg>`, className: 'bg-transparent border-0', iconSize: [32, 32], iconAnchor: [16, 32] })
            });
        }
        return markers;
    }, [mechanic?.lat, mechanic?.lng, customer?.lat, customer?.lng]);

    const mapBounds = useMemo(() => {
        if (mapMarkers.length < 2 || typeof L === 'undefined') return undefined;
        return L.latLngBounds(mapMarkers.map(m => m.position));
    }, [mapMarkers]);

    const PrimaryActionButton: React.FC = () => {
        switch (booking.status) {
            case 'Upcoming':
            case 'Mechanic Assigned':
                return <button onClick={handleAcceptJob} className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition">Accept Job & Start Travel</button>;
            case 'En Route':
                return <button onClick={() => handleUpdateStatus('In Progress')} className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition">Arrived & Begin Service</button>;
            case 'In Progress':
                 return <button onClick={() => handleUpdateStatus('Completed')} className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-orange-600 transition">Mark as Complete</button>;
            default: return null;
        }
    };

    return (
        <div className="flex flex-col h-full bg-secondary">
            <Header title={`Job #${booking.id.toUpperCase().slice(-6)}`} showBackButton />
            <div className="flex-grow p-4 space-y-4 overflow-y-auto">
                <div className="bg-dark-gray p-4 rounded-lg">
                    <h2 className="text-xl font-bold text-primary mb-2">{booking.service.name}</h2>
                    <DetailRow label="Date" value={new Date(booking.date.replace(/-/g, '/')).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} />
                    <DetailRow label="Time" value={booking.time} />
                     {booking.eta && booking.status === 'En Route' && (<DetailRow label="Current ETA" value={`${booking.eta} minutes`} />)}
                </div>

                {booking.status === 'Reschedule Requested' && booking.rescheduleDetails && (
                    <div className="bg-orange-900/50 border border-orange-500/50 p-4 rounded-lg animate-pulse">
                        <h3 className="text-lg font-bold text-orange-300">Reschedule Requested</h3>
                        <p className="text-sm text-white mt-2">The customer requested to move this appointment to:</p>
                        <div className="bg-field p-3 rounded-md my-2">
                            <p><span className="font-semibold">New Date:</span> {new Date(booking.rescheduleDetails.newDate.replace(/-/g, '/')).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                            <p><span className="font-semibold">New Time:</span> {booking.rescheduleDetails.newTime}</p>
                        </div>
                        <p className="text-sm text-white">Reason: <span className="italic text-light-gray">"{booking.rescheduleDetails.reason}"</span></p>
                        <div className="flex gap-3 mt-4">
                            <button onClick={() => handleRescheduleResponse('rejected')} className="flex-1 bg-red-600 text-white font-bold py-2 rounded-lg hover:bg-red-700">Reject</button>
                            <button onClick={() => handleRescheduleResponse('accepted')} className="flex-1 bg-green-600 text-white font-bold py-2 rounded-lg hover:bg-green-700">Accept</button>
                        </div>
                    </div>
                )}

                <div className="bg-dark-gray p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-white mb-2">Customer & Vehicle</h3>
                    <DetailRow label="Customer" value={customer.name} />
                    <DetailRow label="Phone" value={customer.phone} />
                    <DetailRow label="Vehicle" value={`${vehicle.year} ${vehicle.make} ${vehicle.model}`} />
                    <DetailRow label="Plate No." value={vehicle.plateNumber} />
                </div>
                <JobTimeline booking={booking} />
            </div>

             <div className="p-4 bg-[#1D1D1D] border-t border-dark-gray flex-shrink-0 space-y-3">
                <h3 className="text-lg font-semibold text-white text-center">Actions</h3>
                <div className="grid grid-cols-3 gap-3">
                    <button onClick={() => setIsChatOpen(true)} className="bg-field text-white font-bold py-3 rounded-lg hover:bg-gray-600 transition text-sm">Chat</button>
                    <a href={`tel:${customer.phone}`} className="bg-field text-white font-bold py-3 rounded-lg hover:bg-gray-600 transition text-sm text-center flex items-center justify-center">Call</a>
                    <button onClick={() => setIsLocationModalOpen(true)} className="bg-field text-white font-bold py-3 rounded-lg hover:bg-gray-600 transition text-sm">View Location</button>
                    <button onClick={() => setIsProgressModalOpen(true)} className="bg-field text-white font-bold py-3 rounded-lg hover:bg-gray-600 transition text-sm">Edit Progress</button>
                    <button onClick={() => setIsEtaModalOpen(true)} className="bg-field text-white font-bold py-3 rounded-lg hover:bg-gray-600 transition text-sm disabled:opacity-50" disabled={booking.status !== 'En Route'}>Update ETA</button>
                </div>
                <div className="pt-3 border-t border-field"><PrimaryActionButton /></div>
            </div>

            {isProgressModalOpen && (<MechanicJobProgressModal booking={booking} customer={customer} onClose={() => setIsProgressModalOpen(false)} />)}
            {isChatOpen && mechanic && (<MechanicCustomerChatModal booking={booking} customer={customer} mechanic={mechanic} onClose={() => setIsChatOpen(false)} />)}
            {isLocationModalOpen && (
                <Modal title="Live Service Location" isOpen={true} onClose={() => setIsLocationModalOpen(false)}>
                    <div className="space-y-4">
                        <div className="h-72 w-full rounded-lg overflow-hidden">
                             {mapMarkers.length > 0 ? (
                                <MapComponent center={mapMarkers[0].position} zoom={14} markers={mapMarkers} bounds={mapBounds} disableScrollZoom={false} />
                            ) : (
                                <div className="flex items-center justify-center h-full bg-field text-light-gray">Location data not available.</div>
                            )}
                        </div>
                        <a href={`https://www.google.com/maps/dir/?api=1&destination=${customer.lat},${customer.lng}`} target="_blank" rel="noopener noreferrer" className="block w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition text-center">Navigate with Google Maps</a>
                    </div>
                </Modal>
            )}
            {showAwaitingPaymentModal && <AwaitingPaymentModal onClose={() => setShowAwaitingPaymentModal(false)} />}
            {isEtaModalOpen && (<UpdateEtaModal booking={booking} onClose={() => setIsEtaModalOpen(false)} onSave={handleSaveEta} />)}
        </div>
    );
};

export default MechanicJobDetailScreen;
