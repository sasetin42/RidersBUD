import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Reminder, Vehicle } from '../types';

const AddVehicleModal: React.FC<{
    onClose: () => void;
    onSave: (vehicle: Vehicle) => void;
}> = ({ onClose, onSave }) => {
    const [make, setMake] = useState('');
    const [model, setModel] = useState('');
    const [year, setYear] = useState<number | ''>('');
    const [plateNumber, setPlateNumber] = useState('');

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!make || !model || !year || !plateNumber) {
            alert('Please fill in all fields.');
            return;
        }
        onSave({ make, model, year: Number(year), plateNumber });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="add-vehicle-title">
            <div className="bg-dark-gray rounded-lg p-6 w-full max-w-sm">
                <h2 id="add-vehicle-title" className="text-xl font-bold mb-4">Add New Vehicle</h2>
                <form onSubmit={handleSave}>
                    <div className="space-y-4">
                        <input type="text" placeholder="Make (e.g., Toyota)" value={make} onChange={e => setMake(e.target.value)} className="w-full px-4 py-3 bg-field border border-dark-gray rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-2 focus:ring-primary" required aria-label="Vehicle Make" />
                        <input type="text" placeholder="Model (e.g., Camry)" value={model} onChange={e => setModel(e.target.value)} className="w-full px-4 py-3 bg-field border border-dark-gray rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-2 focus:ring-primary" required aria-label="Vehicle Model" />
                        <input type="number" placeholder="Year (e.g., 2021)" value={year} onChange={e => setYear(e.target.value ? parseInt(e.target.value) : '')} className="w-full px-4 py-3 bg-field border border-dark-gray rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-2 focus:ring-primary" required aria-label="Vehicle Year" />
                        <input type="text" placeholder="Plate Number" value={plateNumber} onChange={e => setPlateNumber(e.target.value)} className="w-full px-4 py-3 bg-field border border-dark-gray rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-2 focus:ring-primary" required aria-label="Plate Number" />
                    </div>
                    <div className="mt-6 flex gap-4">
                        <button type="button" onClick={onClose} className="w-1/2 bg-field text-white font-bold py-3 rounded-lg hover:bg-gray-600 transition">Cancel</button>
                        <button type="submit" className="w-1/2 bg-primary text-white font-bold py-3 rounded-lg hover:bg-orange-600 transition">Save Vehicle</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const ProfileScreen: React.FC = () => {
    const { user, logout, addUserVehicle } = useAuth();
    const navigate = useNavigate();
    const [hasUpcomingReminder, setHasUpcomingReminder] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        try {
            const storedReminders = localStorage.getItem('serviceReminders');
            if (storedReminders) {
                const reminders: Reminder[] = JSON.parse(storedReminders);
                
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const cutOffDate = new Date(today);
                cutOffDate.setDate(today.getDate() + 6);
                
                const upcoming = reminders.some(reminder => {
                    const dateParts = reminder.date.split('-');
                    const reminderDate = new Date(
                        parseInt(dateParts[0]),
                        parseInt(dateParts[1]) - 1, 
                        parseInt(dateParts[2])
                    );
                    
                    return reminderDate >= today && reminderDate <= cutOffDate;
                });

                setHasUpcomingReminder(upcoming);
            }
        } catch (error) {
            console.error("Failed to check for upcoming reminders:", error);
        }
    }, [isModalOpen]); // Rerun effect when modal closes in case reminders changed

    const handleSaveVehicle = (vehicle: Vehicle) => {
        addUserVehicle(vehicle);
        setIsModalOpen(false);
    };

    if (!user) {
        return null;
    }

    return (
        <div className="flex flex-col h-full bg-secondary">
            <Header title="My Profile" />
            <div className="flex-grow p-6 space-y-8 overflow-y-auto">
                <div className="flex flex-col items-center">
                    <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center text-4xl font-bold mb-4">
                        {user.name.charAt(0)}
                    </div>
                    <h2 className="text-2xl font-bold">{user.name}</h2>
                    <p className="text-light-gray">{user.email}</p>
                </div>

                <div>
                    <h3 className="text-lg font-semibold mb-3 text-primary">My Vehicles</h3>
                    <div className="bg-dark-gray p-4 rounded-lg">
                       {user.vehicles.length > 0 ? (
                           <div className="space-y-3">
                                {user.vehicles.map((v) => (
                                     <div key={v.plateNumber} className="bg-field p-3 rounded-lg">
                                        <p className="font-bold text-white text-lg">{v.make} {v.model}</p>
                                        <p className="text-light-gray text-sm">{v.year} - {v.plateNumber}</p>
                                    </div>
                                ))}
                           </div>
                       ) : (
                           <p className="text-light-gray text-center py-4">You haven't added any vehicles yet.</p>
                       )}
                        <button onClick={() => setIsModalOpen(true)} className="w-full text-center mt-4 p-3 bg-field rounded-lg hover:bg-gray-600 transition font-semibold">
                            + Add New Vehicle
                        </button>
                    </div>
                </div>

                <div className="space-y-2">
                     <button onClick={() => navigate('/booking-history')} className="w-full text-left p-3 bg-dark-gray rounded-lg">Booking History</button>
                     <button onClick={() => navigate('/wishlist')} className="w-full text-left p-3 bg-dark-gray rounded-lg">My Wishlist</button>
                     <button onClick={() => navigate('/warranties')} className="w-full text-left p-3 bg-dark-gray rounded-lg">Warranty Tracking</button>
                     <button onClick={() => navigate('/admin')} className="w-full text-left p-3 bg-dark-gray rounded-lg text-primary font-semibold hover:bg-gray-700 transition">Admin Panel</button>
                     <button onClick={() => navigate('/reminders')} className="w-full text-left p-3 bg-dark-gray rounded-lg flex justify-between items-center">
                        <span>Service Reminders</span>
                        {hasUpcomingReminder && (
                           <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                            </span>
                        )}
                     </button>
                     <button className="w-full text-left p-3 bg-dark-gray rounded-lg">Settings</button>
                     <button className="w-full text-left p-3 bg-dark-gray rounded-lg">Support</button>
                </div>

                <button 
                    onClick={logout}
                    className="w-full bg-red-600/20 text-red-400 font-bold py-3 rounded-lg hover:bg-red-600/40 transition"
                >
                    Logout
                </button>
            </div>
            {isModalOpen && <AddVehicleModal onClose={() => setIsModalOpen(false)} onSave={handleSaveVehicle} />}
        </div>
    );
};

export default ProfileScreen;