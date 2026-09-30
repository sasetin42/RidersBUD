import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import CustomerHeader from '../components/CustomerHeader';
import { Bell, Calendar, MapPin, Activity, Clock, Tag } from 'lucide-react';
import { Reminder } from '../types';
import { useAuth } from '../context/AuthContext';
import { useDatabase } from '../context/DatabaseContext';
import Spinner from '../components/Spinner';

const ReminderFormModal: React.FC<{
    reminderToEdit?: Reminder | null;
    onClose: () => void;
    onSave: (reminder: Omit<Reminder, 'id'>, id?: string) => void;
}> = ({ reminderToEdit, onClose, onSave }) => {
    const { user } = useAuth();
    const [serviceName, setServiceName] = useState(reminderToEdit?.serviceName || '');
    const [date, setDate] = useState(reminderToEdit?.date || '');
    const [vehicle, setVehicle] = useState(reminderToEdit?.vehicle || (user?.vehicles[0] ? `${user.vehicles[0].make} ${user.vehicles[0].model}` : ''));
    const [notes, setNotes] = useState(reminderToEdit?.notes || '');
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const validate = () => {
        const newErrors: { [key: string]: string } = {};
        if (!serviceName.trim()) newErrors.serviceName = "Service name is required.";
        if (!date) {
            newErrors.date = "A date must be selected.";
        } else if (!reminderToEdit?.id && new Date(date) < new Date()) {
            newErrors.date = "Reminder date cannot be in the past.";
        }
        if (!vehicle) newErrors.vehicle = "A vehicle must be selected.";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };


    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            onSave({ serviceName, date, vehicle, notes }, reminderToEdit?.id);
        }
    };

    const isSaveDisabled = !serviceName || !date || !vehicle || Object.keys(errors).length > 0;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100] p-4 animate-fadeIn" role="dialog" aria-modal="true" aria-labelledby="reminder-form-title">
            <div className="bg-dark-gray rounded-lg p-6 w-full max-w-sm animate-scaleUp">
                <h2 id="reminder-form-title" className="text-xl font-bold mb-4">{reminderToEdit?.id ? 'Edit' : 'Add'} Service Reminder</h2>
                <form onSubmit={handleSave} noValidate>
                    <div className="space-y-4">
                        <div>
                            <input
                                type="text"
                                placeholder="Service Name (e.g., Oil Change)"
                                value={serviceName}
                                onChange={(e) => setServiceName(e.target.value)}
                                className={`w-full px-4 py-3 bg-field border rounded-lg text-white placeholder-light-gray focus:outline-none ${errors.serviceName ? 'border-red-500' : 'border-dark-gray'}`}
                                required
                                aria-label="Service Name"
                            />
                            {errors.serviceName && <p className="text-red-400 text-xs mt-1">{errors.serviceName}</p>}
                        </div>
                        <div>
                            <select
                                value={vehicle}
                                onChange={(e) => setVehicle(e.target.value)}
                                className={`w-full px-4 py-3 bg-field border rounded-lg text-white focus:outline-none ${errors.vehicle ? 'border-red-500' : 'border-dark-gray'}`}
                                required
                                aria-label="Select Vehicle"
                            >
                                <option value="" disabled>Select a vehicle</option>
                                {user?.vehicles.map((v, i) => (
                                    <option key={i} value={`${v.make} ${v.model}`}>{v.make} {v.model}</option>
                                ))}
                            </select>
                            {errors.vehicle && <p className="text-red-400 text-xs mt-1">{errors.vehicle}</p>}
                        </div>
                        <div>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                min={!reminderToEdit?.id ? new Date().toISOString().split("T")[0] : undefined}
                                className={`w-full px-4 py-3 bg-field border rounded-lg text-white placeholder-light-gray focus:outline-none ${errors.date ? 'border-red-500' : 'border-dark-gray'}`}
                                required
                                aria-label="Reminder Date"
                            />
                            {errors.date && <p className="text-red-400 text-xs mt-1">{errors.date}</p>}
                        </div>
                        <textarea
                            id="reminder-notes"
                            name="reminder-notes"
                            placeholder="Notes (optional)"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            className="w-full px-4 py-3 bg-field border border-dark-gray rounded-lg text-white placeholder-light-gray focus:outline-none"
                            aria-label="Optional Notes"
                        />
                    </div>
                    <div className="mt-6 flex gap-4">
                        <button type="button" onClick={onClose} className="w-1/2 py-3 btn-cancel text-xs font-black uppercase tracking-wider rounded-lg shadow-md">
                            Cancel
                        </button>
                        <button type="submit" disabled={isSaveDisabled} className="w-1/2 bg-primary text-white font-bold py-3 rounded-lg hover:bg-orange-600 transition disabled:opacity-50">
                            Save
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const RemindersScreen: React.FC = () => {
    const { db } = useDatabase();
    const { user } = useAuth();
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
    const [loading, setLoading] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const timer = setTimeout(() => {
            try {
                const storedReminders = localStorage.getItem('serviceReminders');
                if (storedReminders) {
                    setReminders(JSON.parse(storedReminders));
                }
            } catch (error) {
                console.error("Failed to parse reminders from localStorage", error);
            } finally {
                setLoading(false);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        // This effect handles pre-filling from navigation state
        const reminderDataFromNav = location.state as { serviceName: string; date: string; vehicle: string; } | null;
        if (reminderDataFromNav?.serviceName && reminderDataFromNav?.date) {
            const newReminderToCreate: Reminder = {
                id: '', // Empty id signifies a new reminder for the modal
                serviceName: reminderDataFromNav.serviceName,
                date: reminderDataFromNav.date,
                vehicle: reminderDataFromNav.vehicle || '',
                notes: 'Auto-created from booking.',
            };
            setEditingReminder(newReminderToCreate);
            setIsModalOpen(true);
            // Clear the state from location history to prevent the modal from re-opening on back navigation
            navigate(location.pathname, { replace: true, state: null });
        }
    }, [location.state, navigate, location.pathname]);


    const saveReminders = (newReminders: Reminder[]) => {
        setReminders(newReminders);
        localStorage.setItem('serviceReminders', JSON.stringify(newReminders));
    };

    const handleSaveReminder = (reminderData: Omit<Reminder, 'id'>, id?: string) => {
        if (id) { // Editing existing reminder
            saveReminders(reminders.map(r => r.id === id ? { ...r, ...reminderData } : r));
        } else { // Adding new reminder
            const newReminder: Reminder = {
                id: new Date().toISOString() + Math.random(),
                ...reminderData,
            };
            saveReminders([...reminders, newReminder]);
        }
        setIsModalOpen(false);
        setEditingReminder(null);
    };

    const handleDeleteReminder = (id: string) => {
        const updatedReminders = reminders.filter(r => r.id !== id);
        saveReminders(updatedReminders);
    };

    const handleEditReminder = (reminder: Reminder) => {
        setEditingReminder(reminder);
        setIsModalOpen(true);
    };

    const handleExportReminders = () => {
        if (reminders.length === 0) {
            alert("There are no reminders to export.");
            return;
        }
        const jsonString = JSON.stringify(reminders, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "ridersbud-reminders.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target?.result;
                if (typeof content !== 'string') throw new Error("File content is not readable.");

                const importedReminders = JSON.parse(content);

                if (!Array.isArray(importedReminders)) {
                    throw new Error("Invalid file format. Expected an array of reminders.");
                }

                if (window.confirm("This will replace all your current reminders. Are you sure you want to continue?")) {
                    saveReminders(importedReminders);
                    alert("Reminders imported successfully!");
                }
            } catch (error) {
                console.error("Failed to import reminders:", error);
                alert(`Failed to import reminders. Please ensure the file is a valid JSON. Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        };

        reader.readAsText(file);
        event.target.value = '';
    };

    // Real-time Firestore Live Bookings
    const liaisonBookings = db?.liaisonBookings?.filter(b => b.customerId === user?.id) || [];
    const rentalBookings = db?.rentalBookings?.filter(b => b.customerId === user?.id) || [];
    const serviceRequests = db?.serviceRequests?.filter(req => req.customerId === user?.id) || [];
    const accentColor = db?.settings?.accentColor || '#FE7803';

    // Map live bookings to Reminder format
    const liveReminders: (Reminder & { 
        isLive: boolean; 
        status: string; 
        bookingType: string;
        agentImageUrl?: string;
        agentName?: string;
        branchName?: string;
        latestRemarks?: string;
    })[] = [];

    // 1. Liaison Registration Assistance
    liaisonBookings.forEach(b => {
        const staff = db?.liaisonStaff?.find(s => s.id === b.liaisonId || s.name === b.liaisonName);
        liveReminders.push({
            id: `live-liaison-${b.id}`,
            serviceName: `LTO Liaison (${b.serviceType})`,
            date: b.appointmentDate,
            vehicle: b.vehicleDetails ? `${b.vehicleDetails.brand} ${b.vehicleDetails.model} (${b.vehicleDetails.plateNumber})` : 'Vehicle info unprovided',
            notes: `Agent: ${b.liaisonName || 'Unassigned'} • Branch: ${b.branchName}`,
            isLive: true,
            status: b.status,
            bookingType: 'Liaison',
            agentImageUrl: staff?.imageUrl || '',
            agentName: b.liaisonName || 'Unassigned Liaison',
            branchName: b.branchName,
            latestRemarks: b.notes || (b.statusHistory && b.statusHistory.length > 0 ? b.statusHistory[b.statusHistory.length - 1].notes : '')
        });
    });

    // 2. Rent a Car
    rentalBookings.forEach(b => {
        const car = db?.rentalCars?.find(c => c.id === b.carId);
        const carName = car ? `${car.brand} ${car.model}` : 'Car Rental';
        liveReminders.push({
            id: `live-rental-${b.id}`,
            serviceName: 'Car Rental Booking',
            date: b.startDate,
            vehicle: carName,
            notes: `Duration: ${b.startDate} to ${b.endDate}`,
            isLive: true,
            status: b.status || 'Received',
            bookingType: 'Car Rental'
        });
    });

    // 3. Driver for Hire & Towing (from serviceRequests)
    serviceRequests.forEach(req => {
        const name = req.serviceName || 'Special Service';
        const isTarget = ['Towing', 'Driver for Hire', 'Driver for hire'].some(t => name.toLowerCase().includes(t.toLowerCase()));
        if (isTarget) {
            liveReminders.push({
                id: `live-request-${req.id}`,
                serviceName: name,
                date: req.scheduledDate || req.createdAt.split('T')[0],
                vehicle: req.vehicleDetails ? `${req.vehicleDetails.brand} ${req.vehicleDetails.model} (${req.vehicleDetails.plateNumber})` : 'Driver provides vehicle',
                notes: req.notes || 'No notes provided',
                isLive: true,
                status: req.status,
                bookingType: name.includes('Towing') ? 'Towing' : 'Driver',
                driverName: req.driverName || '',
                driverPhone: req.driverPhone || '',
                estimatedArrivalTime: req.estimatedArrivalTime || '',
                remarks: req.remarks || ''
            } as any);
        }
    });

    // Combine local reminders and live reminders
    const combinedReminders = [
        ...reminders.map(r => ({ 
            ...r, 
            isLive: false, 
            status: '', 
            bookingType: 'Maintenance', 
            agentImageUrl: '', 
            agentName: '', 
            branchName: '' 
        })),
        ...liveReminders
    ];

    const sortedReminders = [...combinedReminders].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return (
        <div className="flex flex-col h-full bg-secondary">
            <CustomerHeader title="Service Reminders" showBackButton icon={<Bell size={22} />} />

            <div className="p-4 flex gap-4">
                <button
                    onClick={handleImportClick}
                    className="flex-1 bg-field text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-600 transition text-sm"
                >
                    Import from File
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileImport}
                    accept=".json"
                    className="hidden"
                />
                <button
                    onClick={handleExportReminders}
                    className="flex-1 bg-field text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-600 transition text-sm"
                >
                    Export to File
                </button>
            </div>

            <main className="flex-grow overflow-y-auto p-4 pt-0">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <Spinner size="lg" />
                    </div>
                ) : sortedReminders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-light-gray px-6">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-xl font-semibold mb-2">No Reminders Yet</p>
                        <p>Tap the '+' button to add a reminder for your vehicle's maintenance.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {sortedReminders.map(reminder => (
                            <div key={reminder.id} className="bg-dark-gray p-4 rounded-lg border border-white/5" role="listitem">
                                <div className="flex justify-between items-start gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                            <h3 className="text-base font-bold text-primary truncate">{reminder.serviceName}</h3>
                                            {reminder.isLive && (
                                                <span className="text-[8px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-black uppercase tracking-widest shrink-0">
                                                    Live: {reminder.status || 'Received'}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-white font-medium">{reminder.vehicle}</p>
                                    </div>
                                    <div className="flex items-center gap-3.5 shrink-0">
                                        {/* Real-time Agent Profile Photo */}
                                        {reminder.bookingType === 'Liaison' && (
                                            <div className="relative">
                                                {reminder.agentImageUrl ? (
                                                    <img 
                                                        src={reminder.agentImageUrl} 
                                                        alt={reminder.agentName} 
                                                        className="w-9 h-9 rounded-full border-2 border-emerald-500/30 object-cover shadow-sm bg-black/40"
                                                    />
                                                ) : (
                                                    <div className="w-9 h-9 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-[10px] font-black uppercase tracking-tighter text-gray-400">
                                                        {(reminder.agentName || 'A').charAt(0)}
                                                    </div>
                                                )}
                                                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border border-dark-gray rounded-full" title="Active Liaison Agent" />
                                            </div>
                                        )}
                                        
                                        <div className="flex gap-2">
                                            {!reminder.isLive ? (
                                                <>
                                                    <button onClick={() => handleEditReminder(reminder as any)} className="text-light-gray hover:text-blue-400 transition-colors" aria-label={`Edit reminder for ${reminder.serviceName}`}>
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                                                    </button>
                                                    <button onClick={() => handleDeleteReminder(reminder.id)} className="text-light-gray hover:text-red-500 transition-colors" aria-label={`Delete reminder for ${reminder.serviceName}`}>
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                                                    </button>
                                                </>
                                            ) : (
                                                <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center border border-white/10" title="Managed by Database">
                                                    <Activity size={10} className="text-emerald-400" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <p className="text-xs text-light-gray mt-2 flex items-center gap-1.5">
                                    <Calendar size={11} className="text-gray-400" />
                                    <span>Date: {new Date(reminder.date.replace(/-/g, '/')).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                </p>
                                {reminder.notes && (
                                    <p className="text-xs text-light-gray mt-2 pt-2 border-t border-field leading-relaxed flex items-start gap-1.5">
                                        <Clock size={11} className="text-gray-400 mt-0.5 shrink-0" />
                                        <span>{reminder.notes}</span>
                                    </p>
                                )}

                                {/* Real-time process tracking step visualization */}
                                {reminder.bookingType === 'Liaison' && (
                                    <div className="mt-4 pt-4 border-t border-white/5 space-y-3.5">
                                        <h4 className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5">// Live Processing Milestones</h4>
                                        <div className="flex justify-between items-center gap-1 overflow-x-auto py-1.5">
                                            {[
                                                { statusName: 'Pending Admin Review', short: 'Review' },
                                                { statusName: 'For Verification', short: 'Verify' },
                                                { statusName: 'For Processing', short: 'Process' },
                                                { statusName: 'Assigned', short: 'Assigned' },
                                                { statusName: 'In Progress', short: 'Active' },
                                                { statusName: 'Completed', short: 'Done' }
                                            ].map((step, idx, arr) => {
                                                const statuses = arr.map(a => a.statusName);
                                                const currentIdx = statuses.indexOf(reminder.status);
                                                
                                                // Map standard liaison states to nearest milestone if applicable
                                                let checkIdx = currentIdx;
                                                if (checkIdx === -1) {
                                                    if (reminder.status === 'Booking Received') checkIdx = 0;
                                                    else if (reminder.status === 'Documents Verified') checkIdx = 1;
                                                    else if (reminder.status === 'Payment Confirmed') checkIdx = 2;
                                                    else if (reminder.status === 'Liaison Assigned') checkIdx = 3;
                                                    else if (reminder.status === 'Processing at LTO') checkIdx = 4;
                                                    else if (reminder.status === 'Ready for Pickup' || reminder.status === 'Delivered') checkIdx = 5;
                                                }

                                                const isCompleted = checkIdx >= idx;
                                                const isActive = checkIdx === idx;
                                                const isCancelled = reminder.status === 'Cancelled';
                                                
                                                return (
                                                    <React.Fragment key={step.statusName}>
                                                        <div className="flex flex-col items-center shrink-0">
                                                            <div 
                                                                className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black border transition-all duration-300 ${
                                                                    isCancelled ? 'border-red-500/30 text-red-400 bg-red-950/20' :
                                                                    isActive ? 'border-primary bg-primary text-black scale-110 shadow-lg shadow-primary/25' : 
                                                                    isCompleted ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400' : 
                                                                    'border-white/10 text-gray-500 bg-white/5'
                                                                }`}
                                                            >
                                                                {isCancelled ? '✖' : isCompleted && !isActive ? '✓' : idx + 1}
                                                            </div>
                                                            <span className={`text-[8px] font-black uppercase tracking-wider mt-1.5 ${
                                                                isCancelled ? 'text-red-400' :
                                                                isActive ? 'text-primary' : 
                                                                isCompleted ? 'text-emerald-400' : 
                                                                'text-gray-600'
                                                            }`}>{step.short}</span>
                                                        </div>
                                                        {idx < arr.length - 1 && (
                                                            <div className={`flex-1 h-[2px] min-w-[8px] transition-all duration-300 ${
                                                                isCancelled ? 'bg-red-950/40' :
                                                                isCompleted && checkIdx > idx ? 'bg-emerald-500/50' : 
                                                                'bg-white/5'
                                                            }`} />
                                                        )}
                                                    </React.Fragment>
                                                );
                                            })}
                                        </div>
                                        {reminder.latestRemarks && (
                                            <p className="text-[10px] text-gray-400 bg-white/[0.02] p-2.5 rounded-lg border border-white/5 leading-normal mt-2">
                                                <span className="font-bold text-gray-300">Remarks: </span>{reminder.latestRemarks}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Real-time process tracking step visualization for Driver for Hire */}
                                {reminder.bookingType === 'Driver' && (
                                    <div className="mt-4 pt-4 border-t border-white/5 space-y-3.5 animate-fadeIn">
                                        <h4 className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5">// Driver Service Milestones</h4>
                                        <div className="flex justify-between items-center gap-1 overflow-x-auto py-1.5">
                                            {[
                                                { statusName: 'Pending Admin Review', short: 'Review' },
                                                { statusName: 'For Verification', short: 'Verify' },
                                                { statusName: 'Awaiting Driver Availability', short: 'Awaiting' },
                                                { statusName: 'Driver Assigned', short: 'Assigned' },
                                                { statusName: 'Confirmed', short: 'Confirm' },
                                                { statusName: 'In Progress', short: 'Active' },
                                                { statusName: 'Completed', short: 'Done' }
                                            ].map((step, idx, arr) => {
                                                const statuses = arr.map(a => a.statusName);
                                                const currentIdx = statuses.indexOf(reminder.status);
                                                
                                                let checkIdx = currentIdx;
                                                if (checkIdx === -1) {
                                                    // Fallback standard states to milestones
                                                    if (reminder.status === 'Pending') checkIdx = 0;
                                                    else if (reminder.status === 'Assigned') checkIdx = 3;
                                                    else if (reminder.status === 'In Progress') checkIdx = 5;
                                                }

                                                const isCompleted = checkIdx >= idx;
                                                const isActive = checkIdx === idx;
                                                const isCancelled = reminder.status === 'Cancelled';
                                                
                                                return (
                                                    <React.Fragment key={step.statusName}>
                                                        <div className="flex flex-col items-center shrink-0">
                                                            <div 
                                                                className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black border transition-all duration-300 ${
                                                                    isCancelled ? 'border-red-500/30 text-red-400 bg-red-950/20' :
                                                                    isActive ? 'border-primary bg-primary text-black scale-110 shadow-lg shadow-primary/25' : 
                                                                    isCompleted ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400' : 
                                                                    'border-white/10 text-gray-500 bg-white/5'
                                                                }`}
                                                                style={{ 
                                                                    backgroundColor: isActive ? accentColor : undefined,
                                                                    borderColor: isActive ? accentColor : undefined
                                                                }}
                                                            >
                                                                {isCancelled ? '✖' : isCompleted && !isActive ? '✓' : idx + 1}
                                                            </div>
                                                            <span className={`text-[8px] font-black uppercase tracking-wider mt-1.5 ${
                                                                isCancelled ? 'text-red-400' :
                                                                isActive ? 'text-primary' : 
                                                                isCompleted ? 'text-emerald-400' : 
                                                                'text-gray-600'
                                                            }`}
                                                            style={{ color: isActive ? accentColor : undefined }}
                                                            >{step.short}</span>
                                                        </div>
                                                        {idx < arr.length - 1 && (
                                                            <div className={`flex-1 h-[2px] min-w-[8px] transition-all duration-300 ${
                                                                isCancelled ? 'bg-red-950/40' :
                                                                isCompleted && checkIdx > idx ? 'bg-emerald-500/50' : 
                                                                'bg-white/5'
                                                            }`} />
                                                        )}
                                                    </React.Fragment>
                                                );
                                            })}
                                        </div>

                                        {/* Assigned Driver Details */}
                                        {((reminder as any).driverName || (reminder as any).estimatedArrivalTime || (reminder as any).remarks) && (
                                            <div className="mt-3.5 p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-2 text-xs">
                                                {/* Driver Name */}
                                                {(reminder as any).driverName && (
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Assigned Driver</span>
                                                        <span className="font-bold text-white">{(reminder as any).driverName}</span>
                                                    </div>
                                                )}
                                                {/* Driver Phone */}
                                                {(reminder as any).driverPhone && (
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Driver Contact</span>
                                                        <span className="font-mono text-gray-300">{(reminder as any).driverPhone}</span>
                                                    </div>
                                                )}
                                                {/* Estimated Arrival Time */}
                                                {(reminder as any).estimatedArrivalTime && (
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Est. Arrival Time</span>
                                                        <span className="font-bold text-primary" style={{ color: accentColor }}>{(reminder as any).estimatedArrivalTime}</span>
                                                    </div>
                                                )}
                                                {/* Remarks */}
                                                {(reminder as any).remarks && (
                                                    <div className="pt-2 border-t border-white/5">
                                                        <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Remarks / Remarks</span>
                                                        <p className="text-[10px] text-gray-300 leading-normal" style={{ wordBreak: 'break-all', overflowWrap: 'break-word' }}>{(reminder as any).remarks}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>

            <button
                onClick={() => { setEditingReminder(null); setIsModalOpen(true); }}
                className="absolute bottom-20 right-6 bg-primary text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:bg-orange-600 transition"
                aria-label="Add new reminder"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
            </button>

            {isModalOpen && <ReminderFormModal reminderToEdit={editingReminder} onClose={() => { setIsModalOpen(false); setEditingReminder(null); }} onSave={handleSaveReminder} />}
        </div>
    );
};

export default RemindersScreen;
