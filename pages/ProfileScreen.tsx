import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Reminder, Customer } from '../types';
import Spinner from '../components/Spinner';

const EditProfileModal: React.FC<{
    user: Customer;
    onClose: () => void;
    onSave: (data: { name: string; email: string; phone: string }) => Promise<void>;
}> = ({ user, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        name: user.name,
        email: user.email,
        phone: user.phone,
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [isSaving, setIsSaving] = useState(false);

    const validate = () => {
        const newErrors: { [key: string]: string } = {};
        if (!formData.name.trim()) newErrors.name = "Name cannot be empty.";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = "Invalid email format.";
        if (!/^\d{10,15}$/.test(formData.phone.replace(/\D/g, ''))) newErrors.phone = "Phone must be 10-15 digits.";
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            setIsSaving(true);
            try {
                await onSave(formData);
                onClose(); // Close modal on successful save
            } catch (error) {
                console.error("Failed to save profile:", error);
                setErrors({ general: "Failed to save profile. Please try again." });
            } finally {
                setIsSaving(false);
            }
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fadeIn" role="dialog" aria-modal="true" aria-labelledby="edit-profile-title">
            <div className="bg-dark-gray rounded-lg p-6 w-full max-w-sm animate-scaleUp">
                <h2 id="edit-profile-title" className="text-xl font-bold mb-4">Edit Profile</h2>
                <form onSubmit={handleSave} noValidate>
                    <div className="space-y-4">
                        <div>
                             <label className="text-sm text-light-gray mb-1 block">Full Name</label>
                            <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className={`w-full px-4 py-3 bg-field border rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-2 ${errors.name ? 'border-red-500 ring-red-500' : 'border-dark-gray focus:ring-primary'}`} required />
                            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
                        </div>
                        <div>
                             <label className="text-sm text-light-gray mb-1 block">Email</label>
                            <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className={`w-full px-4 py-3 bg-field border rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-2 ${errors.email ? 'border-red-500 ring-red-500' : 'border-dark-gray focus:ring-primary'}`} required />
                            {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
                        </div>
                        <div>
                             <label className="text-sm text-light-gray mb-1 block">Phone</label>
                            <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className={`w-full px-4 py-3 bg-field border rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-2 ${errors.phone ? 'border-red-500 ring-red-500' : 'border-dark-gray focus:ring-primary'}`} required />
                            {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
                        </div>
                    </div>
                    {errors.general && <p className="text-red-400 text-xs mt-4 text-center">{errors.general}</p>}
                    <div className="mt-6 flex gap-4">
                        <button type="button" onClick={onClose} className="w-1/2 bg-field text-white font-bold py-3 rounded-lg hover:bg-gray-600 transition">Cancel</button>
                        <button type="submit" disabled={isSaving} className="w-1/2 bg-primary text-white font-bold py-3 rounded-lg hover:bg-orange-600 transition flex items-center justify-center disabled:opacity-50">
                            {isSaving ? <Spinner size="sm" /> : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const ChevronRightIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-light-gray" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
);

const ProfileScreen: React.FC = () => {
    const { user, logout, updateUserProfile, loading } = useAuth();
    const navigate = useNavigate();
    const [hasUpcomingReminder, setHasUpcomingReminder] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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
    }, []);

    const handleSaveProfile = async (updatedData: { name: string; email: string; phone: string }) => {
        await updateUserProfile(updatedData);
        setIsEditModalOpen(false);
    };

    if (loading) {
        return (
            <div className="flex flex-col h-full bg-secondary">
                <Header title="My Profile" />
                <div className="flex-grow flex items-center justify-center">
                    <Spinner size="lg" />
                </div>
            </div>
        );
    }
    
    if (!user) {
         return (
             <div className="flex flex-col h-full bg-secondary">
                <Header title="My Profile" />
                <div className="flex-grow flex items-center justify-center">
                    <p>Could not load user profile. Please try logging in again.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full bg-secondary">
            <Header title="My Profile" />
            <div className="flex-grow p-6 space-y-8 overflow-y-auto">
                <div className="flex flex-col items-center text-center p-4 bg-dark-gray rounded-lg">
                    {user.picture ? (
                        <img src={user.picture} alt={user.name} className="w-24 h-24 rounded-full object-cover mb-4" />
                    ) : (
                        <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center text-4xl font-bold mb-4">
                            {user.name.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <h2 className="text-2xl font-bold">{user.name}</h2>
                    <p className="text-light-gray">{user.email}</p>
                    <p className="text-light-gray text-sm">{user.phone}</p>
                    <button onClick={() => setIsEditModalOpen(true)} className="mt-4 bg-field text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-600 transition text-sm">
                        Edit Profile
                    </button>
                </div>

                 <div>
                    <h3 className="text-lg font-semibold mb-3 text-primary">My Account & Activity</h3>
                    <div className="bg-dark-gray rounded-lg overflow-hidden">
                        <button onClick={() => navigate('/my-garage')} className="w-full text-left p-4 flex justify-between items-center border-b border-field hover:bg-field transition">
                            <span>My Garage</span>
                            <ChevronRightIcon />
                        </button>
                        <button onClick={() => navigate('/favorite-mechanics')} className="w-full text-left p-4 flex justify-between items-center border-b border-field hover:bg-field transition">
                            <span>Favorite Mechanics</span>
                            <ChevronRightIcon />
                        </button>
                        <button onClick={() => navigate('/booking-history')} className="w-full text-left p-4 flex justify-between items-center border-b border-field hover:bg-field transition">
                            <span>Booking History</span>
                            <ChevronRightIcon />
                        </button>
                        <button onClick={() => navigate('/order-history')} className="w-full text-left p-4 flex justify-between items-center border-b border-field hover:bg-field transition">
                            <span>Order History</span>
                            <ChevronRightIcon />
                        </button>
                        <button onClick={() => navigate('/warranties')} className="w-full text-left p-4 flex justify-between items-center border-b border-field hover:bg-field transition">
                            <span>Warranty Tracking</span>
                            <ChevronRightIcon />
                        </button>
                         <button onClick={() => navigate('/wishlist')} className="w-full text-left p-4 flex justify-between items-center border-b border-field hover:bg-field transition">
                            <span>My Wishlist</span>
                            <ChevronRightIcon />
                        </button>
                        <button onClick={() => navigate('/reminders')} className="w-full text-left p-4 flex justify-between items-center hover:bg-field transition">
                            <span className="flex items-center">
                                Service Reminders
                                {hasUpcomingReminder && (
                                   <span className="relative flex h-3 w-3 ml-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                                    </span>
                                )}
                            </span>
                            <ChevronRightIcon />
                        </button>
                    </div>
                </div>
                
                 <div>
                    <h3 className="text-lg font-semibold mb-3 text-primary">Settings & Support</h3>
                    <div className="bg-dark-gray rounded-lg overflow-hidden">
                        <button onClick={() => navigate('/notification-settings')} className="w-full text-left p-4 flex justify-between items-center border-b border-field hover:bg-field transition">
                            <span>Notification Settings</span>
                            <ChevronRightIcon />
                        </button>
                        <button onClick={() => navigate('/faq')} className="w-full text-left p-4 flex justify-between items-center border-b border-field hover:bg-field transition">
                            <span>FAQ</span>
                            <ChevronRightIcon />
                        </button>
                        <button className="w-full text-left p-4 flex justify-between items-center hover:bg-field transition">
                            <span>Contact Support</span>
                            <ChevronRightIcon />
                        </button>
                    </div>
                </div>

                <div className="pt-4">
                    <button onClick={() => navigate('/admin')} className="w-full text-left p-3 bg-dark-gray rounded-lg text-light-gray hover:bg-gray-700 hover:text-white transition flex justify-between items-center text-sm">
                        <span>Switch to Admin Panel</span>
                        <ChevronRightIcon />
                    </button>
                </div>

                <button 
                    onClick={logout}
                    className="w-full bg-red-600/20 text-red-400 font-bold py-3 rounded-lg hover:bg-red-600/40 transition"
                >
                    Logout
                </button>
            </div>
            {isEditModalOpen && user && <EditProfileModal user={user} onClose={() => setIsEditModalOpen(false)} onSave={handleSaveProfile} />}
        </div>
    );
};

export default ProfileScreen;