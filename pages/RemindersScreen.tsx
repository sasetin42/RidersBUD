
import React, { useState, useEffect, useRef } from 'react';
import Header from '../components/Header';
import { Reminder } from '../types';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';

const AddReminderModal: React.FC<{
    onClose: () => void;
    onSave: (reminder: Omit<Reminder, 'id'>) => void;
}> = ({ onClose, onSave }) => {
    const { user } = useAuth();
    const [serviceName, setServiceName] = useState('');
    const [date, setDate] = useState('');
    const [vehicle, setVehicle] = useState(user?.vehicles[0] ? `${user.vehicles[0].make} ${user.vehicles[0].model}` : '');
    const [notes, setNotes] = useState('');

    const handleSave = () => {
        if (!serviceName || !date || !vehicle) {
            alert('Please fill in all required fields.');
            return;
        }
        onSave({ serviceName, date, vehicle, notes });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="add-reminder-title">
            <div className="bg-dark-gray rounded-lg p-6 w-full max-w-sm">
                <h2 id="add-reminder-title" className="text-xl font-bold mb-4">Add Service Reminder</h2>
                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                    <div className="space-y-4">
                        <input
                            type="text"
                            placeholder="Service Name (e.g., Oil Change)"
                            value={serviceName}
                            onChange={(e) => setServiceName(e.target.value)}
                            className="w-full px-4 py-3 bg-field border border-dark-gray rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-2 focus:ring-primary"
                            required
                            aria-label="Service Name"
                        />
                         <select
                            value={vehicle}
                            onChange={(e) => setVehicle(e.target.value)}
                            className="w-full px-4 py-3 bg-field border border-dark-gray rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                            required
                            aria-label="Select Vehicle"
                        >
                            {user?.vehicles.map((v, i) => (
                                <option key={i} value={`${v.make} ${v.model}`}>{v.make} {v.model}</option>
                            ))}
                        </select>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full px-4 py-3 bg-field border border-dark-gray rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-2 focus:ring-primary"
                            required
                            aria-label="Reminder Date"
                        />
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
                        <button type="submit" className="w-1/2 bg-primary text-white font-bold py-3 rounded-lg hover:bg-orange-600 transition">
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
    const [loading, setLoading] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    const saveReminders = (newReminders: Reminder[]) => {
        setReminders(newReminders);
        localStorage.setItem('serviceReminders', JSON.stringify(newReminders));
    };

    const handleAddReminder = (newReminderData: Omit<Reminder, 'id'>) => {
        const newReminder: Reminder = {
            id: new Date().toISOString() + Math.random(), // simple unique id
            ...newReminderData,
        };
        saveReminders([...reminders, newReminder]);
        setIsModalOpen(false);
    };

    const handleDeleteReminder = (id: string) => {
        if(window.confirm('Are you sure you want to delete this reminder?')) {
            const updatedReminders = reminders.filter(r => r.id !== id);
            saveReminders(updatedReminders);
        }
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

                // Basic validation
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
        // Reset file input value to allow importing the same file again
        event.target.value = '';
    };

    // Sort reminders by date, soonest first
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
                            <div key={reminder.id} className="bg-dark-gray p-4 rounded-lg relative" role="listitem">
                                <button onClick={() => handleDeleteReminder(reminder.id)} className="absolute top-2 right-2 text-light-gray hover:text-red-500 transition-colors" aria-label={`Delete reminder for ${reminder.serviceName}`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                                <h3 className="text-lg font-bold text-primary pr-6">{reminder.serviceName}</h3>
                                <p className="text-sm text-white font-medium">{reminder.vehicle}</p>
                                <p className="text-sm text-light-gray mt-1">
                                    Due: {(() => {
                                        // Parse 'YYYY-MM-DD' string as local date to prevent timezone issues.
                                        const dateParts = reminder.date.split('-');
                                        const localDate = new Date(
                                            parseInt(dateParts[0]),
                                            parseInt(dateParts[1]) - 1,
                                            parseInt(dateParts[2])
                                        );
                                        return localDate.toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                        });
                                    })()}
                                </p>
                                {reminder.notes && <p className="text-sm text-light-gray mt-2 pt-2 border-t border-field">Notes: {reminder.notes}</p>}
                            </div>
                        ))}
                    </div>
                )}
            </main>
            
            <button
                onClick={() => setIsModalOpen(true)}
                className="absolute bottom-20 right-6 bg-primary text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:bg-orange-600 transition"
                aria-label="Add new reminder"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
            </button>

            {isModalOpen && <AddReminderModal onClose={() => setIsModalOpen(false)} onSave={handleAddReminder} />}
        </div>
    );
};

export default RemindersScreen;
