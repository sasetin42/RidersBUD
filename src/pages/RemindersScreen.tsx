import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { Reminder } from '../types';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';
import { SupabaseDatabaseService } from '../services/supabaseDatabaseService';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

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
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fadeIn" role="dialog" aria-modal="true" aria-labelledby="reminder-form-title">
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
                                className={`w-full px-4 py-3 bg-field border rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-2 ${errors.serviceName ? 'border-red-500 ring-red-500' : 'border-dark-gray focus:ring-primary'}`}
                                required
                                aria-label="Service Name"
                            />
                            {errors.serviceName && <p className="text-red-400 text-xs mt-1">{errors.serviceName}</p>}
                        </div>
                        <div>
                            <select
                                value={vehicle}
                                onChange={(e) => setVehicle(e.target.value)}
                                className={`w-full px-4 py-3 bg-field border rounded-lg text-white focus:outline-none focus:ring-2 ${errors.vehicle ? 'border-red-500 ring-red-500' : 'border-dark-gray focus:ring-primary'}`}
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
                                className={`w-full px-4 py-3 bg-field border rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-2 ${errors.date ? 'border-red-500 ring-red-500' : 'border-dark-gray focus:ring-primary'}`}
                                required
                                aria-label="Reminder Date"
                            />
                            {errors.date && <p className="text-red-400 text-xs mt-1">{errors.date}</p>}
                        </div>
                        <textarea
                            placeholder="Notes (optional)"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            className="w-full px-4 py-3 bg-field border border-dark-gray rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-2 focus:ring-primary"
                            aria-label="Optional Notes"
                        />
                    </div>
                    <div className="mt-6 flex gap-4">
                        <button type="button" onClick={onClose} className="w-1/2 bg-field text-white font-bold py-3 rounded-lg hover:bg-gray-600 transition">
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
        if (window.confirm('Are you sure you want to delete this reminder?')) {
            const updatedReminders = reminders.filter(r => r.id !== id);
            saveReminders(updatedReminders);
        }
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

    const sortedReminders = [...reminders].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return (
        <div className="flex flex-col h-full bg-secondary">
            <Header title="Service Reminders" showBackButton />

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
                            <div key={reminder.id} className="bg-dark-gray p-4 rounded-lg" role="listitem">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-lg font-bold text-primary pr-6">{reminder.serviceName}</h3>
                                        <p className="text-sm text-white font-medium">{reminder.vehicle}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleEditReminder(reminder)} className="text-light-gray hover:text-blue-400 transition-colors" aria-label={`Edit reminder for ${reminder.serviceName}`}>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                                        </button>
                                        <button onClick={() => handleDeleteReminder(reminder.id)} className="text-light-gray hover:text-red-500 transition-colors" aria-label={`Delete reminder for ${reminder.serviceName}`}>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                                        </button>
                                    </div>
                                </div>
                                <p className="text-sm text-light-gray mt-1">
                                    Due: {new Date(reminder.date.replace(/-/g, '/')).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                </p>
                                {reminder.notes && <p className="text-sm text-light-gray mt-2 pt-2 border-t border-field">Notes: {reminder.notes}</p>}
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