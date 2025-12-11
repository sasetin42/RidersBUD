import React, { useState, useEffect, useMemo } from 'react';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Reminder, Customer } from '../types';
import Spinner from '../components/Spinner';
import { compressAndEncodeImage } from '../utils/fileUtils';
import { useDatabase } from '../context/DatabaseContext';
import { useWishlist } from '../context/WishlistContext';
import {
    Car, Wrench, Calendar, Package, ShieldCheck, Heart, Bell,
    Settings, HelpCircle, MessageCircle, LogOut, ChevronRight,
    Camera, User, Mail, Phone, LayoutDashboard
} from 'lucide-react';

const EditProfileModal: React.FC<{
    user: Customer;
    onClose: () => void;
    onSave: (data: { name: string; email: string; phone: string; picture?: string; }) => Promise<void>;
}> = ({ user, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        name: user.name,
        email: user.email,
        phone: user.phone,
        picture: user.picture || '',
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [isSaving, setIsSaving] = useState(false);

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                setErrors(prev => ({ ...prev, picture: 'Image size cannot exceed 2MB.' }));
                return;
            }
            try {
                const base64 = await compressAndEncodeImage(file);
                setFormData(prev => ({ ...prev, picture: base64 as string }));
                setErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors.picture;
                    return newErrors;
                });
            } catch (error) {
                console.error("Error converting file:", error);
                setErrors(prev => ({ ...prev, picture: 'Failed to upload image.' }));
            }
        }
    };

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
                onClose();
            } catch (error) {
                console.error("Failed to save profile:", error);
                setErrors({ general: "Failed to save profile. Please try again." });
            } finally {
                setIsSaving(false);
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="glass-panel w-full max-w-md rounded-2xl overflow-hidden border border-white/10 shadow-2xl animate-scaleUp">
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <h2 className="text-xl font-bold text-white">Edit Profile</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <span className="sr-only">Close</span>
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSave} className="p-6 space-y-6">
                    <div className="flex flex-col items-center">
                        <div className="relative group">
                            <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white/10 shadow-lg bg-[#2A2A2A]">
                                <img
                                    src={formData.picture || `https://i.pravatar.cc/150?u=${user.id}`}
                                    alt="Profile Preview"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <label htmlFor="picture-upload" className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer backdrop-blur-sm">
                                <Camera className="w-8 h-8 text-white" />
                            </label>
                            <input id="picture-upload" type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                        </div>
                        {errors.picture && <p className="text-red-400 text-xs mt-2">{errors.picture}</p>}
                    </div>

                    <div className="space-y-4">
                        <div className="relative group">
                            <User className="absolute left-4 top-3.5 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                            <input
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className={`w-full pl-12 pr-4 py-3 bg-[#1A1A1A] border ${errors.name ? 'border-red-500' : 'border-white/10'} rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all`}
                                placeholder="Full Name"
                            />
                            {errors.name && <p className="text-red-400 text-xs mt-1 ml-1">{errors.name}</p>}
                        </div>

                        <div className="relative group">
                            <Mail className="absolute left-4 top-3.5 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                            <input
                                type="email"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                className={`w-full pl-12 pr-4 py-3 bg-[#1A1A1A] border ${errors.email ? 'border-red-500' : 'border-white/10'} rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all`}
                                placeholder="Email Address"
                            />
                            {errors.email && <p className="text-red-400 text-xs mt-1 ml-1">{errors.email}</p>}
                        </div>

                        <div className="relative group">
                            <Phone className="absolute left-4 top-3.5 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                className={`w-full pl-12 pr-4 py-3 bg-[#1A1A1A] border ${errors.phone ? 'border-red-500' : 'border-white/10'} rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all`}
                                placeholder="Phone Number"
                            />
                            {errors.phone && <p className="text-red-400 text-xs mt-1 ml-1">{errors.phone}</p>}
                        </div>
                    </div>

                    {errors.general && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">{errors.general}</div>}

                    <div className="flex gap-4 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-3 bg-[#2A2A2A] text-white font-semibold rounded-xl hover:bg-[#333] transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={isSaving} className="flex-1 px-4 py-3 bg-gradient-to-r from-primary to-orange-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-orange-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                            {isSaving && <Spinner size="sm" />}
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const ProfileStat: React.FC<{ label: string; value: string | number; icon: React.ReactNode }> = ({ label, value, icon }) => (
    <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-white/5 border border-white/5 backdrop-blur-sm">
        <div className="mb-1 text-primary">{icon}</div>
        <span className="text-lg font-bold text-white leading-none mb-1">{value}</span>
        <span className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">{label}</span>
    </div>
);

const MenuItem: React.FC<{
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    badge?: number | string | boolean;
    isDestructive?: boolean;
}> = ({ icon, label, onClick, badge, isDestructive }) => {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center justify-between p-4 group transition-colors duration-200 ${isDestructive
                    ? 'hover:bg-red-500/10 text-red-400'
                    : 'hover:bg-white/5 text-gray-200'
                } border-b border-white/5 last:border-0`}
        >
            <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${isDestructive ? 'bg-red-500/10 text-red-500' : 'bg-[#2A2A2A] text-primary group-hover:text-white group-hover:bg-primary transition-colors duration-300'}`}>
                    {icon}
                </div>
                <span className={`font-medium ${isDestructive ? 'text-red-400' : 'text-white'}`}>{label}</span>
            </div>

            <div className="flex items-center gap-3">
                {badge && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badge === true
                            ? 'w-2.5 h-2.5 bg-red-500'
                            : 'bg-primary/20 text-primary border border-primary/20'
                        }`}>
                        {badge === true ? '' : badge}
                    </span>
                )}
                {!isDestructive && <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />}
            </div>
        </button>
    );
};

const ProfileScreen: React.FC = () => {
    const { user, logout, updateUserProfile, loading: authLoading } = useAuth();
    const { db } = useDatabase();
    const { wishlist } = useWishlist();
    const navigate = useNavigate();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [hasUpcomingReminder, setHasUpcomingReminder] = useState(false);

    console.log("ProfileScreen Rendering. User:", user ? "Present" : "Missing", "AuthLoading:", authLoading);

    // Calculate Stats
    const stats = useMemo(() => {
        if (!user || !db || !db.bookings || !db.orders) return { bookings: 0, orders: 0, garage: 0 };
        const userBookings = db.bookings.filter(b => b.customerName === user.name).length;
        const userOrders = db.orders.filter(o => o.customerName === user.name).length;
        const userVehicles = user.vehicles?.length || 0;
        return { bookings: userBookings, orders: userOrders, garage: userVehicles };
    }, [user, db]);

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
                    const reminderDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
                    return reminderDate >= today && reminderDate <= cutOffDate;
                });
                setHasUpcomingReminder(upcoming);
            }
        } catch (error) {
            console.error("Failed check reminders", error);
        }
    }, []);

    const handleSaveProfile = async (updatedData: { name: string; email: string; phone: string; picture?: string; }) => {
        await updateUserProfile(updatedData);
        setIsEditModalOpen(false);
    };

    if (authLoading) return <div className="flex h-screen bg-secondary items-center justify-center"><Spinner size="lg" /></div>;
    if (!user) return <div className="flex flex-col h-screen bg-secondary"><Header title="My Profile" /><div className="flex-1 flex items-center justify-center text-gray-400">Please log in.</div></div>;

    return (
        <div className="flex flex-col min-h-screen bg-secondary pb-24">
            <Header title="My Profile" />

            <div className="flex-1 overflow-y-auto scrollbar-hide">
                {/* Profile Header */}
                <div className="relative pt-6 pb-8 px-6 bg-gradient-to-b from-[#1F1F1F] to-secondary border-b border-white/5">
                    <div className="flex flex-col items-center text-center relative z-10">
                        <div className="relative mb-4 group">
                            <div className="w-28 h-28 rounded-full p-1 bg-gradient-to-tr from-primary to-orange-600 shadow-2xl shadow-orange-500/20">
                                <img
                                    src={user.picture || `https://i.pravatar.cc/150?u=${user.id}`}
                                    alt={user.name}
                                    className="w-full h-full rounded-full object-cover border-4 border-[#1A1A1A]"
                                />
                            </div>
                            <button
                                onClick={() => setIsEditModalOpen(true)}
                                className="absolute bottom-0 right-1 p-2 bg-[#2A2A2A] border border-white/10 rounded-full text-white shadow-lg hover:scale-110 active:scale-95 transition-all duration-200"
                            >
                                <Camera className="w-4 h-4" />
                            </button>
                        </div>

                        <h2 className="text-2xl font-bold text-white mb-1">{user.name}</h2>
                        <p className="text-gray-400 text-sm mb-4">{user.email}</p>

                        {/* Quick Stats Grid */}
                        <div className="grid grid-cols-3 gap-3 w-full max-w-sm mt-2">
                            <ProfileStat icon={<Car size={18} />} label="Vehicles" value={stats.garage} />
                            <ProfileStat icon={<Calendar size={18} />} label="Bookings" value={stats.bookings} />
                            <ProfileStat icon={<Package size={18} />} label="Orders" value={stats.orders} />
                        </div>
                    </div>
                </div>

                {/* Menu Sections */}
                <div className="px-4 py-6 space-y-6">

                    {/* Account Section */}
                    <div className="space-y-3">
                        <h3 className="px-2 text-xs font-bold text-gray-500 uppercase tracking-widest">My Account & Activity</h3>
                        <div className="glass-panel overflow-hidden rounded-2xl border border-white/5 bg-[#1F1F1F]/50 backdrop-blur-md">
                            <MenuItem
                                icon={<Car size={18} />}
                                label="My Garage"
                                onClick={() => navigate('/my-garage')}
                                badge={stats.garage > 0 ? stats.garage : undefined}
                            />
                            <MenuItem
                                icon={<Wrench size={18} />}
                                label="Favorite Mechanics"
                                onClick={() => navigate('/favorite-mechanics')}
                            />
                            <MenuItem
                                icon={<Calendar size={18} />}
                                label="Booking History"
                                onClick={() => navigate('/booking-history')}
                            />
                            <MenuItem
                                icon={<Package size={18} />}
                                label="Order History"
                                onClick={() => navigate('/order-history')}
                            />
                            <MenuItem
                                icon={<ShieldCheck size={18} />}
                                label="Warranty Tracking"
                                onClick={() => navigate('/warranties')}
                            />
                            <MenuItem
                                icon={<Heart size={18} />}
                                label="My Wishlist"
                                onClick={() => navigate('/wishlist')}
                                badge={wishlist?.length > 0 ? wishlist.length : undefined}
                            />
                            <MenuItem
                                icon={<Bell size={18} />}
                                label="Service Reminders"
                                onClick={() => navigate('/reminders')}
                                badge={hasUpcomingReminder}
                            />
                        </div>
                    </div>

                    {/* Support Section */}
                    <div className="space-y-3">
                        <h3 className="px-2 text-xs font-bold text-gray-500 uppercase tracking-widest">Settings & Support</h3>
                        <div className="glass-panel overflow-hidden rounded-2xl border border-white/5 bg-[#1F1F1F]/50 backdrop-blur-md">
                            <MenuItem
                                icon={<Settings size={18} />}
                                label="Notification Settings"
                                onClick={() => navigate('/notification-settings')}
                            />
                            <MenuItem
                                icon={<HelpCircle size={18} />}
                                label="FAQ"
                                onClick={() => navigate('/faq')}
                            />
                            <MenuItem
                                icon={<MessageCircle size={18} />}
                                label="Contact Support"
                                onClick={() => console.log('Support clicked')}
                            />
                        </div>
                    </div>

                    {/* Admin & Logout Section */}
                    <div className="space-y-4 pt-2">
                        <button
                            onClick={() => navigate('/admin')}
                            className="w-full flex items-center justify-between p-4 rounded-xl border border-white/10 bg-gradient-to-r from-[#2A2A2A] to-[#1F1F1F] hover:border-primary/30 transition-all duration-300 group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-2 rounded-lg bg-white/5 text-gray-300 group-hover:bg-primary/20 group-hover:text-primary transition-colors">
                                    <LayoutDashboard size={20} />
                                </div>
                                <span className="font-medium text-white group-hover:text-primary transition-colors">Switch to Admin Panel</span>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
                        </button>

                        <button
                            onClick={logout}
                            className="w-full py-4 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-500 font-bold tracking-wide transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            <LogOut size={18} />
                            Log Out
                        </button>
                    </div>

                    <div className="text-center pb-8 pt-4">
                        <p className="text-xs text-gray-600">App Version 1.2.0 • Build 2405</p>
                    </div>
                </div>
            </div>

            {isEditModalOpen && user && <EditProfileModal user={user} onClose={() => setIsEditModalOpen(false)} onSave={handleSaveProfile} />}
        </div>
    );
};

export default ProfileScreen;