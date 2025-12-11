
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
                    <label className="text-xs text-light-gray mb-1 block">ETA (in minutes)</label>
                    <div className="relative">
                        <input
                            type="number"
                            value={eta}
                            onChange={e => setEta(e.target.value)}
                            placeholder="e.g., 25"
                            className="w-full p-3 glass-input rounded-xl focus:ring-1 focus:ring-primary focus:border-primary/50 text-white placeholder-white/20"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-light-gray">min</span>
                    </div>
                </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
                <button onClick={onClose} className="glass-button px-4 py-2 border border-white/10 rounded-xl text-light-gray hover:text-white hover:bg-white/5 transition">Cancel</button>
                <button onClick={handleSave} disabled={isSaving || !eta} className="bg-primary text-white font-bold py-2 px-6 rounded-xl hover:bg-orange-600 transition flex items-center justify-center min-w-[100px] disabled:opacity-50 shadow-lg shadow-primary/20">
                    {isSaving ? <Spinner size="sm" /> : 'Save ETA'}
                </button>
            </div>
        </Modal>
    );
};


const DetailRow: React.FC<{ label: string, value: string, icon?: React.ReactNode }> = ({ label, value, icon }) => (
    <div className="flex items-start justify-between py-3 border-b border-white/5 last:border-0 group hover:bg-white/5 px-2 -mx-2 rounded-lg transition-colors">
        <div className="flex items-center text-light-gray">
            {icon && <span className="mr-3 text-primary/70 group-hover:text-primary transition-colors">{icon}</span>}
            <span className="font-medium text-sm">{label}</span>
        </div>
        <span className="font-bold text-white text-right text-sm">{value}</span>
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
        <div className="glass-panel rounded-2xl p-8 shadow-2xl animate-scaleUp border border-green-500/30 w-full max-w-sm text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-green-500/5 pointer-events-none"></div>
            <div className="bg-green-500/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_rgba(34,197,94,0.3)]">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Job Complete!</h2>
            <p className="text-light-gray mb-8 leading-relaxed">
                Great job! The customer has been notified. You will receive a notification once the payment is confirmed.
            </p>
            <button onClick={onClose} className="w-full bg-green-600 text-white font-bold py-3.5 rounded-xl hover:bg-green-500 transition shadow-lg shadow-green-600/20">
                Back to Dashboard
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
        <div className="glass-panel p-8 rounded-xl border border-white/5 mt-6">
            <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-orange-500">
                    <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" clipRule="evenodd" />
                </svg>
                Job Timeline
            </h3>
            <div className="relative pl-6 ml-1">
                {timelineSteps.map((step, index) => {
                    const isCompleted = index < currentStatusIndex;
                    const isActive = index === currentStatusIndex;
                    const historyEntry = booking.statusHistory?.find(s => s.status === step);

                    return (
                        <div key={step} className={`relative pb-12 ${index === timelineSteps.length - 1 ? 'pb-0' : ''}`}>
                            {index < timelineSteps.length - 1 && (
                                <div className={`absolute top-6 left-[7px] w-0.5 h-full -z-10 ${isCompleted ? 'bg-orange-500' : 'bg-gray-700/50'}`}></div>
                            )}

                            <div className="flex items-start group">
                                <div className={`relative z-10 w-4 h-4 rounded-full flex items-center justify-center transition-all duration-300 ${isActive ? 'bg-orange-500 ring-4 ring-orange-500/20 shadow-lg shadow-orange-500/40 scale-150' :
                                        isCompleted ? 'bg-orange-500 text-white' :
                                            'bg-transparent border-2 border-gray-600'
                                    }`}>
                                    {isCompleted && <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                                </div>

                                <div className={`ml-8 transition-all duration-300 ${isActive ? 'translate-x-1' : ''}`}>
                                    <p className={`font-bold text-base mb-1 ${isActive ? 'text-orange-500' : isCompleted ? 'text-white' : 'text-gray-500'
                                        }`}>{step}</p>

                                    {isActive ? (
                                        <p className="text-sm font-medium text-orange-400">Current Status</p>
                                    ) : historyEntry ? (
                                        <p className="text-xs uppercase tracking-wider font-semibold text-gray-500">
                                            {new Date(historyEntry.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).toUpperCase()}
                                        </p>
                                    ) : null}
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex flex-col z-50 p-0 sm:p-6 animate-slideInUp" role="dialog" aria-modal="true">
            <div className="relative glass-panel rounded-t-2xl sm:rounded-2xl flex flex-col h-full max-w-2xl mx-auto w-full border border-white/10 shadow-2xl overflow-hidden">
                <header className="flex-shrink-0 p-5 border-b border-white/5 flex items-center justify-center relative bg-white/5">
                    <h2 className="text-xl font-bold text-white">Job Progress</h2>
                    <button onClick={onClose} className="absolute right-5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition">&times;</button>
                </header>
                <main className="flex-grow overflow-y-auto p-5 space-y-6">
                    {/* Job Documentation */}
                    <div className="bg-white/5 p-5 rounded-xl border border-white/5">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 2H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>
                            Documentation
                        </h3>
                        <div className="space-y-6">
                            <ImageUploadSection title="Before Service" images={beforeImages} onUpload={(e) => handleImageUpload(e, 'before')} onDelete={(i) => handleDeleteImage(i, 'before')} />
                            <div className="h-px bg-white/5"></div>
                            <ImageUploadSection title="After Service" images={afterImages} onUpload={(e) => handleImageUpload(e, 'after')} onDelete={(i) => handleDeleteImage(i, 'after')} />
                        </div>
                        <button onClick={handleSaveImages} disabled={isSavingImages} className={`w-full font-bold py-3 px-4 rounded-xl transition mt-6 text-sm flex items-center justify-center shadow-lg ${imagesSuccess ? 'bg-green-600 text-white shadow-green-600/30' : 'bg-primary text-white hover:bg-orange-600 disabled:opacity-50 shadow-primary/30'}`}>
                            {isSavingImages ? <Spinner size="sm" /> : imagesSuccess ? '✓ Images Saved' : 'Save Documentation'}
                        </button>
                    </div>

                    {/* Job Notes */}
                    <div className="bg-white/5 p-5 rounded-xl border border-white/5">
                        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                            Job Notes
                        </h3>
                        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add details about work performed, parts used, or customer requests..." rows={5} className="w-full p-4 glass-input rounded-xl text-sm placeholder-light-gray/50 focus:ring-primary focus:border-primary/50 resize-none" />
                        <button onClick={handleSaveNotes} disabled={isSavingNotes} className={`w-full font-bold py-3 px-4 rounded-xl transition mt-4 text-sm flex items-center justify-center shadow-lg ${notesSuccess ? 'bg-green-600 text-white shadow-green-600/30' : 'bg-primary text-white hover:bg-orange-600 disabled:opacity-50 shadow-primary/30'}`}>
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
            <div className="p-4 glass-heavy border-b border-white/5 z-10 w-full">
                <Header title={`Job #${booking.id.toUpperCase().slice(-6)}`} showBackButton />
            </div>

            <div className="flex-grow p-4 space-y-4 overflow-y-auto">
                <div className="glass-panel p-6 rounded-xl border border-white/5">
                    <h2 className="text-2xl font-bold text-primary mb-4">{booking.service.name}</h2>
                    <DetailRow label="Date" value={new Date(booking.date.replace(/-/g, '/')).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>} />
                    <DetailRow label="Time" value={booking.time} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>} />
                    {booking.eta && booking.status === 'En Route' && (<DetailRow label="Current ETA" value={`${booking.eta} minutes`} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>} />)}
                </div>

                {booking.status === 'Reschedule Requested' && booking.rescheduleDetails && (
                    <div className="bg-orange-900/30 backdrop-blur-sm border border-orange-500/50 p-6 rounded-xl animate-pulse-glow shadow-[0_0_15px_rgba(234,88,12,0.2)]">
                        <h3 className="text-xl font-bold text-orange-300 mb-2 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            Reschedule Requested
                        </h3>
                        <p className="text-sm text-orange-100/90 mt-1 mb-4">The customer requested to move this appointment:</p>
                        <div className="bg-orange-950/50 p-4 rounded-lg my-2 border border-orange-500/30">
                            <p className="flex justify-between mb-1"><span className="font-semibold text-orange-200">New Date:</span> <span className="text-white">{new Date(booking.rescheduleDetails.newDate.replace(/-/g, '/')).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span></p>
                            <p className="flex justify-between"><span className="font-semibold text-orange-200">New Time:</span> <span className="text-white">{booking.rescheduleDetails.newTime}</span></p>
                        </div>
                        <p className="text-sm text-orange-200 mt-3 mb-4">Reason: <span className="italic text-white">"{booking.rescheduleDetails.reason}"</span></p>
                        <div className="flex gap-4">
                            <button onClick={() => handleRescheduleResponse('rejected')} className="flex-1 bg-red-600/80 text-white font-bold py-3 rounded-xl hover:bg-red-700 transition backdrop-blur-sm border border-red-500/20">Reject</button>
                            <button onClick={() => handleRescheduleResponse('accepted')} className="flex-1 bg-green-600/80 text-white font-bold py-3 rounded-xl hover:bg-green-700 transition backdrop-blur-sm border border-green-500/20 shadow-lg shadow-green-900/20">Accept</button>
                        </div>
                    </div>
                )}

                <div className="glass-panel p-6 rounded-xl border border-white/5">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                        Customer & Vehicle
                    </h3>
                    <DetailRow label="Customer" value={customer.name} />
                    <DetailRow label="Phone" value={customer.phone} />
                    <DetailRow label="Vehicle" value={`${vehicle.year} ${vehicle.make} ${vehicle.model}`} />
                    <DetailRow label="Plate No." value={vehicle.plateNumber} />
                </div>
                <JobTimeline booking={booking} />
            </div>

            <div className="p-4 glass-heavy border-t border-white/5 flex-shrink-0 space-y-4 shadow-lg z-20">
                <h3 className="text-xs font-bold text-light-gray uppercase tracking-widest text-center">Actions</h3>
                <div className="grid grid-cols-5 gap-2">
                    <button onClick={() => setIsChatOpen(true)} className="glass-button flex flex-col items-center justify-center py-2 rounded-xl hover:bg-white/10 transition border border-white/5 text-xs gap-1 group">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" /></svg>
                        Chat
                    </button>
                    <a href={`tel:${customer.phone}`} className="glass-button flex flex-col items-center justify-center py-2 rounded-xl hover:bg-white/10 transition border border-white/5 text-xs gap-1 group text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400 group-hover:scale-110 transition-transform" viewBox="0 0 20 20" fill="currentColor"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" /></svg>
                        Call
                    </a>
                    <button onClick={() => setIsLocationModalOpen(true)} className="glass-button flex flex-col items-center justify-center py-2 rounded-xl hover:bg-white/10 transition border border-white/5 text-xs gap-1 group">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400 group-hover:scale-110 transition-transform" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 21l-4.95-6.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                        Locate
                    </button>
                    <button onClick={() => setIsProgressModalOpen(true)} className="glass-button flex flex-col items-center justify-center py-2 rounded-xl hover:bg-white/10 transition border border-white/5 text-xs gap-1 group">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-400 group-hover:scale-110 transition-transform" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                        Edit
                    </button>
                    <button onClick={() => setIsEtaModalOpen(true)} className="glass-button flex flex-col items-center justify-center py-2 rounded-xl hover:bg-white/10 transition border border-white/5 text-xs gap-1 group disabled:opacity-30 disabled:hover:bg-transparent" disabled={booking.status !== 'En Route'}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400 group-hover:scale-110 transition-transform" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
                        ETA
                    </button>
                </div>
                <div className="pt-2"><PrimaryActionButton /></div>
            </div>

            {isProgressModalOpen && (<MechanicJobProgressModal booking={booking} customer={customer} onClose={() => setIsProgressModalOpen(false)} />)}
            {isChatOpen && mechanic && (<MechanicCustomerChatModal booking={booking} customer={customer} mechanic={mechanic} onClose={() => setIsChatOpen(false)} />)}
            {isLocationModalOpen && (
                <Modal title="Live Service Location" isOpen={true} onClose={() => setIsLocationModalOpen(false)}>
                    <div className="space-y-4">
                        <div className="h-72 w-full rounded-xl overflow-hidden shadow-inner border border-white/10 relative">
                            {mapMarkers.length > 0 ? (
                                <MapComponent center={mapMarkers[0].position} zoom={14} markers={mapMarkers} bounds={mapBounds} disableScrollZoom={false} />
                            ) : (
                                <div className="flex items-center justify-center h-full bg-black/40 text-light-gray backdrop-blur-sm">Location data not available.</div>
                            )}
                        </div>
                        <a href={`https://www.google.com/maps/dir/?api=1&destination=${customer.lat},${customer.lng}`} target="_blank" rel="noopener noreferrer" className="block w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition text-center shadow-lg shadow-blue-900/40 flex items-center justify-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 21l-4.95-6.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                            Navigate with Google Maps
                        </a>
                    </div>
                </Modal>
            )}
            {showAwaitingPaymentModal && <AwaitingPaymentModal onClose={() => setShowAwaitingPaymentModal(false)} />}
            {isEtaModalOpen && (<UpdateEtaModal booking={booking} onClose={() => setIsEtaModalOpen(false)} onSave={handleSaveEta} />)}
        </div>
    );
};

export default MechanicJobDetailScreen;
