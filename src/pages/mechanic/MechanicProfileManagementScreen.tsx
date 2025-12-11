import React, { useState, useEffect, useMemo } from 'react';
import { useMechanicAuth } from '../../context/MechanicAuthContext';
import { useDatabase } from '../../context/DatabaseContext';
import Spinner from '../../components/Spinner';
import { Availability, Mechanic, PayoutDetails, Review } from '../../types';
import { fileToBase64 } from '../../utils/fileUtils';
import Modal from '../../components/admin/Modal';
import { useNavigate } from 'react-router-dom';

// --- Reusable Components ---
const StatCard = ({ title, value, icon }: { title: string, value: string | number, icon: React.ReactNode }) => (
    <div className="bg-[#1A1A1A] p-4 rounded-2xl flex flex-col items-center justify-center border border-white/5 hover:border-orange-500/30 hover:bg-[#202020] transition-all duration-300 group">
        <div className="text-orange-500 mx-auto w-12 h-12 mb-3 flex items-center justify-center bg-orange-500/10 rounded-full group-hover:scale-110 transition-transform">
            {React.cloneElement(icon as React.ReactElement, { className: "w-6 h-6" })}
        </div>
        <p className="text-3xl font-bold text-white mb-1">{value}</p>
        <p className="text-xs text-gray-500 font-medium">{title}</p>
    </div>
);

const MenuItem = ({ label, icon, onClick, isDestructive = false }: { label: string, icon: React.ReactNode, onClick: () => void, isDestructive?: boolean }) => (
    <button onClick={onClick} className="w-full text-left p-4 flex justify-between items-center border-b border-white/5 hover:bg-white/5 transition last:border-b-0 group">
        <div className="flex items-center gap-4">
            <span className={`w-8 flex justify-center ${isDestructive ? 'text-red-500' : 'text-orange-500'}`}>
                {React.cloneElement(icon as React.ReactElement, { className: "w-5 h-5" })}
            </span>
            <span className={`font-semibold text-sm ${isDestructive ? 'text-red-400' : 'text-white'}`}>{label}</span>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
    </button>
);

// --- Modal Components ---

const ProfileDetailsModal: React.FC<{
    mechanic: Mechanic;
    onClose: () => void;
    onSave: (mechanic: Mechanic) => void;
}> = ({ mechanic, onClose, onSave }) => {
    const [formData, setFormData] = useState(mechanic);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const base64Image = await fileToBase64(file);
                setFormData(prev => ({ ...prev, imageUrl: base64Image }));
            } catch (error) { console.error("Image upload failed:", error); }
        }
    };

    const handlePortfolioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            const base64Promises = files.map((file: File) => fileToBase64(file));
            try {
                const base64Images = await Promise.all(base64Promises);
                setFormData(prev => ({ ...prev, portfolioImages: [...(prev.portfolioImages || []), ...base64Images] }));
            } catch (err) {
                console.error("Portfolio upload failed:", err);
            }
        }
    };

    const handleRemovePortfolioImage = (index: number) => {
        setFormData(prev => ({ ...prev, portfolioImages: prev.portfolioImages?.filter((_, i) => i !== index) }));
    };

    const handleSpecializationsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target;
        setFormData(prev => ({ ...prev, specializations: value.split(',').map(s => s.trim()) }));
    };

    return (
        <Modal title="Edit Profile Details" isOpen={true} onClose={onClose}>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                <div className="flex flex-col items-center gap-4">
                    <img src={formData.imageUrl} alt={formData.name} className="w-24 h-24 rounded-full object-cover border-4 border-primary" />
                    <div className="w-full">
                        <label className="block text-xs text-light-gray mb-1">Upload New Image</label>
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full text-sm text-light-gray file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
                    </div>
                </div>
                <div>
                    <label className="text-xs text-light-gray">Full Name</label>
                    <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full p-2 bg-field border border-secondary rounded-md" />
                </div>
                <div>
                    <label className="text-xs text-light-gray">Phone Number</label>
                    <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className="w-full p-2 bg-field border border-secondary rounded-md" />
                </div>
                <div>
                    <label className="text-xs text-light-gray">My Bio</label>
                    <textarea name="bio" value={formData.bio} onChange={handleInputChange} rows={4} className="w-full p-2 bg-field border border-secondary rounded-md" />
                </div>
                <div>
                    <label className="text-xs text-light-gray">Specializations (comma-separated)</label>
                    <input type="text" value={formData.specializations.join(', ')} onChange={handleSpecializationsChange} className="w-full p-2 bg-field border border-secondary rounded-md" />
                </div>
                <div>
                    <label className="text-xs text-light-gray">Portfolio Images</label>
                    <input type="file" multiple accept="image/*" onChange={handlePortfolioUpload} className="w-full text-sm text-light-gray file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
                    <div className="mt-2 flex flex-wrap gap-2">
                        {formData.portfolioImages?.map((img, i) => (
                            <div key={i} className="relative">
                                <img src={img} className="h-16 w-16 rounded-md object-cover" alt="Portfolio item" />
                                <button onClick={() => handleRemovePortfolioImage(i)} className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full p-0.5 w-5 h-5 flex items-center justify-center text-xs">&times;</button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="mt-6 flex justify-end gap-4">
                <button onClick={onClose} className="bg-field text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-600 transition">Cancel</button>
                <button onClick={() => onSave(formData)} className="bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-orange-600 transition">Save Changes</button>
            </div>
        </Modal>
    );
};

const AvailabilityEditorModal: React.FC<{
    availability: Mechanic['availability'];
    onClose: () => void;
    onSave: (availability: Required<Mechanic>['availability']) => void;
}> = ({ availability, onClose, onSave }) => {
    const DEFAULT_AVAILABILITY: Required<Mechanic>['availability'] = {
        monday: { isAvailable: true, startTime: '09:00', endTime: '17:00' },
        tuesday: { isAvailable: true, startTime: '09:00', endTime: '17:00' },
        wednesday: { isAvailable: true, startTime: '09:00', endTime: '17:00' },
        thursday: { isAvailable: true, startTime: '09:00', endTime: '17:00' },
        friday: { isAvailable: true, startTime: '09:00', endTime: '17:00' },
        saturday: { isAvailable: false, startTime: '09:00', endTime: '17:00' },
        sunday: { isAvailable: false, startTime: '09:00', endTime: '17:00' },
    };

    const [currentAvailability, setCurrentAvailability] = useState(availability || DEFAULT_AVAILABILITY);

    const handleChange = (day: keyof Required<Mechanic>['availability'], newAvailability: Availability) => {
        setCurrentAvailability(prev => ({ ...prev, [day]: newAvailability }));
    };

    const daysOfWeek: (keyof Required<Mechanic>['availability'])[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    return (
        <Modal title="Manage My Weekly Availability" isOpen={true} onClose={onClose}>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {daysOfWeek.map(day => {
                    const dayAvailability = currentAvailability[day];
                    return (
                        <div key={day} className="grid grid-cols-3 gap-3 items-center">
                            <div className="flex items-center">
                                <input type="checkbox" checked={dayAvailability.isAvailable} onChange={e => handleChange(day, { ...dayAvailability, isAvailable: e.target.checked })} className="w-5 h-5 text-primary bg-field rounded border-gray-500 focus:ring-primary" />
                                <label className="ml-3 capitalize text-white flex items-center gap-2">
                                    <span className={`h-2 w-2 rounded-full ${dayAvailability.isAvailable ? 'bg-green-400' : 'bg-gray-500'}`}></span>
                                    {day}
                                </label>
                            </div>
                            <div className="col-span-2 grid grid-cols-2 gap-2">
                                <input type="time" value={dayAvailability.startTime} disabled={!dayAvailability.isAvailable} onChange={e => handleChange(day, { ...dayAvailability, startTime: e.target.value })} className="w-full p-2 bg-field border border-secondary rounded-md text-sm disabled:opacity-50" />
                                <input type="time" value={dayAvailability.endTime} disabled={!dayAvailability.isAvailable} onChange={e => handleChange(day, { ...dayAvailability, endTime: e.target.value })} className="w-full p-2 bg-field border border-secondary rounded-md text-sm disabled:opacity-50" />
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="mt-6 flex justify-end gap-4">
                <button onClick={onClose} className="bg-field text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-600 transition">Cancel</button>
                <button onClick={() => onSave(currentAvailability)} className="bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-orange-600 transition">Save Availability</button>
            </div>
        </Modal>
    );
};

const TimeOffModal: React.FC<{
    unavailableDates: Array<{ startDate: string; endDate: string; reason?: string }>;
    onClose: () => void;
    onSave: (dates: Array<{ startDate: string; endDate: string; reason?: string }>) => void;
}> = ({ unavailableDates, onClose, onSave }) => {
    const [dates, setDates] = useState(unavailableDates || []);
    const [isRange, setIsRange] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');
    const [error, setError] = useState('');

    const handleAdd = () => {
        setError('');
        if (!startDate) {
            setError('Please select a start date.');
            return;
        }
        const finalEndDate = isRange ? endDate : startDate;
        if (!finalEndDate) {
            setError('Please select an end date for the range.');
            return;
        }
        if (new Date(finalEndDate.replace(/-/g, '/')) < new Date(startDate.replace(/-/g, '/'))) {
            setError('End date cannot be before the start date.');
            return;
        }

        const newEntry = { startDate, endDate: finalEndDate, reason };
        setDates(prev => [...prev, newEntry].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()));

        setStartDate('');
        setEndDate('');
        setReason('');
        setIsRange(false);
    };

    const handleDelete = (index: number) => {
        setDates(prev => prev.filter((_, i) => i !== index));
    };

    const todayStr = new Date().toISOString().split('T')[0];

    return (
        <Modal title="Set Time Off" isOpen={true} onClose={onClose}>
            <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                <div className="bg-field p-4 rounded-lg border border-secondary">
                    <h4 className="font-semibold text-white mb-3">Add Unavailability</h4>
                    <div className="space-y-3">
                        <div className="flex items-center justify-center gap-2 p-1 bg-dark-gray rounded-full">
                            <button onClick={() => setIsRange(false)} className={`w-1/2 py-1.5 text-sm font-semibold rounded-full transition-colors ${!isRange ? 'bg-primary text-white' : 'text-light-gray'}`}>Single Day</button>
                            <button onClick={() => setIsRange(true)} className={`w-1/2 py-1.5 text-sm font-semibold rounded-full transition-colors ${isRange ? 'bg-primary text-white' : 'text-light-gray'}`}>Date Range</button>
                        </div>
                        <div className={`grid grid-cols-1 ${isRange ? 'sm:grid-cols-2' : ''} gap-3`}>
                            <div>
                                <label className="text-xs text-light-gray">{isRange ? 'Start Date' : 'Date'}</label>
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} min={todayStr} className="w-full p-2 bg-dark-gray border border-secondary rounded-md" />
                            </div>
                            {isRange && (
                                <div>
                                    <label className="text-xs text-light-gray">End Date</label>
                                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate || todayStr} className="w-full p-2 bg-dark-gray border border-secondary rounded-md" />
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="text-xs text-light-gray">Reason (Optional)</label>
                            <input type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g., Vacation" className="w-full p-2 bg-dark-gray border border-secondary rounded-md" />
                        </div>
                        {error && <p className="text-red-400 text-xs text-center">{error}</p>}
                        <button onClick={handleAdd} className="w-full bg-primary/20 text-primary font-bold py-2 rounded-lg hover:bg-primary/40 transition">Add to List</button>
                    </div>
                </div>
                <div className="space-y-2">
                    <h4 className="font-semibold text-white mb-2">Scheduled Time Off</h4>
                    {dates.length > 0 ? dates.map((d, i) => (
                        <div key={i} className="bg-field p-3 rounded-md flex justify-between items-center">
                            <div>
                                <p className="font-semibold text-sm">{d.startDate === d.endDate ? new Date(d.startDate.replace(/-/g, '/')).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : `${new Date(d.startDate.replace(/-/g, '/')).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(d.endDate.replace(/-/g, '/')).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}</p>
                                {d.reason && <p className="text-xs text-light-gray">{d.reason}</p>}
                            </div>
                            <button onClick={() => handleDelete(i)} className="text-red-400 hover:text-red-300 p-1 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg></button>
                        </div>
                    )) : <p className="text-xs text-light-gray text-center py-4">No time off scheduled.</p>}
                </div>
            </div>
            <div className="mt-6 flex justify-end gap-4 border-t border-field pt-4">
                <button onClick={onClose} className="bg-field text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-600 transition">Cancel</button>
                <button onClick={() => onSave(dates)} className="bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-orange-600 transition">Save Changes</button>
            </div>
        </Modal>
    );
};

const ChangePasswordModal: React.FC<{
    currentPass: string;
    onClose: () => void;
    onSave: (newPass: string) => void;
}> = ({ currentPass, onClose, onSave }) => {
    const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });

    const handlePasswordInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({ ...prev, [name]: value }));
        setPasswordMessage({ type: '', text: '' });
    };

    const handleChangePassword = (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordData.currentPassword !== currentPass) {
            setPasswordMessage({ type: 'error', text: 'Current password is incorrect.' });
            return;
        }
        if (!passwordData.newPassword || passwordData.newPassword.length < 6) {
            setPasswordMessage({ type: 'error', text: 'New password must be at least 6 characters.' });
            return;
        }
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setPasswordMessage({ type: 'error', text: 'New passwords do not match.' });
            return;
        }
        onSave(passwordData.newPassword);
        setPasswordMessage({ type: 'success', text: 'Password changed successfully!' });
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setTimeout(onClose, 1500); // Close after success message
    };

    return (
        <Modal title="Change Password" isOpen={true} onClose={onClose}>
            <form onSubmit={handleChangePassword} className="space-y-3">
                <input type="password" name="currentPassword" placeholder="Current Password" value={passwordData.currentPassword} onChange={handlePasswordInputChange} className="w-full p-2 bg-field border border-secondary rounded-md text-sm placeholder-light-gray" />
                <input type="password" name="newPassword" placeholder="New Password" value={passwordData.newPassword} onChange={handlePasswordInputChange} className="w-full p-2 bg-field border border-secondary rounded-md text-sm placeholder-light-gray" />
                <input type="password" name="confirmPassword" placeholder="Confirm New Password" value={passwordData.confirmPassword} onChange={handlePasswordInputChange} className="w-full p-2 bg-field border border-secondary rounded-md text-sm placeholder-light-gray" />
                {passwordMessage.text && <p className={`text-xs text-center pt-1 ${passwordMessage.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>{passwordMessage.text}</p>}
                <div className="mt-6 flex justify-end gap-4">
                    <button type="button" onClick={onClose} className="bg-field text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-700 transition">Cancel</button>
                    <button type="submit" className="bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-orange-600 transition">Update Password</button>
                </div>
            </form>
        </Modal>
    );
};

// [MODALS_PLACEHOLDER_2]

const ReviewsModal: React.FC<{
    reviews: Review[];
    onClose: () => void;
}> = ({ reviews, onClose }) => (
    <Modal title="My Reviews" isOpen={true} onClose={onClose}>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            {reviews && reviews.length > 0 ? reviews.map(review => (
                <div key={review.id} className="bg-field p-4 rounded-lg border border-secondary">
                    <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-white">{review.customerName}</h4>
                        <div className="flex items-center text-yellow-500">
                            <span className="font-bold mr-1">{review.rating}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8-2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                        </div>
                    </div>
                    <p className="text-gray-300 text-sm mb-2">{review.comment}</p>
                    <p className="text-xs text-light-gray">{new Date(review.date).toLocaleDateString()}</p>
                </div>
            )) : <p className="text-light-gray text-center py-4">No reviews yet.</p>}
        </div>
        <div className="mt-6 flex justify-end">
            <button onClick={onClose} className="bg-field text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-600 transition">Close</button>
        </div>
    </Modal>
);

const PayoutRequestModal: React.FC<{
    mechanic: Mechanic;
    availableBalance: number;
    onClose: () => void;
}> = ({ mechanic, availableBalance, onClose }) => {
    const { requestPayout } = useMechanicAuth();
    const [amount, setAmount] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        const val = parseFloat(amount);
        if (isNaN(val) || val <= 0) {
            setError('Please enter a valid amount.');
            return;
        }
        if (val > availableBalance) {
            setError('Amount exceeds available balance.');
            return;
        }
        if (!mechanic.payoutDetails || !mechanic.payoutDetails.accountNumber) {
            setError('Please set up your payout details first.');
            return;
        }

        try {
            await requestPayout(val);
            setSuccess('Payout request submitted successfully!');
            setTimeout(onClose, 2000);
        } catch (err) {
            setError('Failed to submit payout request.');
        }
    };

    return (
        <Modal title="Request Payout" isOpen={true} onClose={onClose}>
            <div className="space-y-4">
                <div className="bg-field p-4 rounded-lg border border-secondary text-center">
                    <p className="text-light-gray text-sm">Available for Payout</p>
                    <p className="text-3xl font-bold text-primary mt-1">₱{availableBalance.toFixed(2)}</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-xs text-light-gray">Amount to Withdraw</label>
                        <div className="relative mt-1">
                            <span className="absolute left-3 top-2.5 text-light-gray">₱</span>
                            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full pl-8 p-2 bg-field border border-secondary rounded-md text-white placeholder-light-gray" placeholder="0.00" />
                        </div>
                    </div>
                    {error && <p className="text-red-400 text-xs text-center">{error}</p>}
                    {success && <p className="text-green-400 text-xs text-center">{success}</p>}
                    <div className="mt-6 flex justify-end gap-4">
                        <button type="button" onClick={onClose} className="bg-field text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-700 transition">Cancel</button>
                        <button type="submit" disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > availableBalance} className="bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed">Submit Request</button>
                    </div>
                </form>
            </div>
        </Modal>
    );
};

const PayoutDetailsModal: React.FC<{
    payoutDetails?: PayoutDetails;
    onClose: () => void;
    onSave: (details: PayoutDetails) => void;
}> = ({ payoutDetails, onClose, onSave }) => {
    const [details, setDetails] = useState<PayoutDetails>(payoutDetails || { provider: '', accountNumber: '', accountName: '' });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setDetails(prev => ({ ...prev, [name]: value }));
    };

    return (
        <Modal title="Payout Details" isOpen={true} onClose={onClose}>
            <div className="space-y-4">
                <div>
                    <label className="text-xs text-light-gray">Bank / E-Wallet Provider</label>
                    <select name="provider" value={details.provider} onChange={handleChange} className="w-full p-2 bg-field border border-secondary rounded-md text-white">
                        <option value="">Select Provider</option>
                        <option value="GCash">GCash</option>
                        <option value="Maya">Maya</option>
                        <option value="BDO">BDO</option>
                        <option value="BPI">BPI</option>
                        <option value="UnionBank">UnionBank</option>
                    </select>
                </div>
                <div>
                    <label className="text-xs text-light-gray">Account Name</label>
                    <input type="text" name="accountName" value={details.accountName} onChange={handleChange} className="w-full p-2 bg-field border border-secondary rounded-md text-white" />
                </div>
                <div>
                    <label className="text-xs text-light-gray">Account Number</label>
                    <input type="text" name="accountNumber" value={details.accountNumber} onChange={handleChange} className="w-full p-2 bg-field border border-secondary rounded-md text-white" />
                </div>
            </div>
            <div className="mt-6 flex justify-end gap-4">
                <button onClick={onClose} className="bg-field text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-700 transition">Cancel</button>
                <button onClick={() => onSave(details)} className="bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-orange-600 transition">Save Details</button>
            </div>
        </Modal>
    );
};

const HelpSupportModal: React.FC<{
    contactEmail: string;
    contactPhone: string;
    onClose: () => void;
}> = ({ contactEmail, contactPhone, onClose }) => (
    <Modal title="Help & Support" isOpen={true} onClose={onClose}>
        <div className="space-y-6 text-center py-4">
            <p className="text-gray-300">If you have any questions or need assistance, please contact our support team.</p>
            <div className="space-y-2">
                <div className="flex flex-col items-center p-3 bg-field rounded-lg border border-secondary">
                    <span className="text-xs text-light-gray uppercase tracking-wider mb-1">Email Support</span>
                    <a href={`mailto:${contactEmail}`} className="text-primary font-bold text-lg hover:underline">{contactEmail}</a>
                </div>
                <div className="flex flex-col items-center p-3 bg-field rounded-lg border border-secondary">
                    <span className="text-xs text-light-gray uppercase tracking-wider mb-1">Phone Support</span>
                    <a href={`tel:${contactPhone}`} className="text-primary font-bold text-lg hover:underline">{contactPhone}</a>
                </div>
            </div>
        </div>
        <div className="mt-6 flex justify-end">
            <button onClick={onClose} className="bg-field text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-600 transition">Close</button>
        </div>
    </Modal>
);

const LegalDocsModal: React.FC<{
    mechanic: Mechanic;
    onClose: () => void;
    onSave: (mechanic: Mechanic) => void;
}> = ({ mechanic, onClose, onSave }) => {
    const [businessLicense, setBusinessLicense] = useState<string | null>(mechanic.businessLicense || null);
    const [certifications, setCertifications] = useState<Array<{ name: string; fileUrl: string }>>(mechanic.certifications || []);
    const [insurance, setInsurance] = useState<Array<{ type: string; provider: string; policyNumber: string; expiryDate: string; fileUrl?: string }>>(mechanic.insurance || []);
    const [newCertName, setNewCertName] = useState('');
    const [newCertFile, setNewCertFile] = useState<string | null>(null);
    const [newIns, setNewIns] = useState({ type: '', provider: '', policyNumber: '', expiryDate: '', fileUrl: '' });

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const base64 = await fileToBase64(file);
                setter(base64);
            } catch (err) { console.error("Upload failed", err); }
        }
    };

    const handleAddCertification = () => {
        if (newCertName && newCertFile) {
            setCertifications(prev => [...prev, { name: newCertName, fileUrl: newCertFile }]);
            setNewCertName('');
            setNewCertFile(null);
        }
    };

    const handleAddInsurance = () => {
        if (newIns.type && newIns.provider && newIns.policyNumber && newIns.expiryDate) {
            setInsurance(prev => [...prev, newIns]);
            setNewIns({ type: '', provider: '', policyNumber: '', expiryDate: '', fileUrl: '' });
        }
    };

    const CustomFileInput = ({ label, showPreview, onFileSelect, previewText }: { label: string, showPreview?: boolean, onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void, previewText?: string }) => (
        <div className="flex flex-col gap-2">
            <label className="text-xs text-light-gray hidden">{label}</label>
            <div className="flex items-center gap-4">
                <label className="cursor-pointer bg-[#2A2A2A] hover:bg-[#333] text-orange-500 font-bold py-2 px-4 rounded-lg border border-orange-500/30 transition shadow-lg shadow-orange-900/10 flex items-center gap-2 text-sm">
                    <span>Choose File</span>
                    <input type="file" className="hidden" accept="image/*,application/pdf" onChange={onFileSelect} />
                </label>
                {showPreview && previewText && <span className="text-xs text-gray-400 italic">{previewText}</span>}
            </div>
        </div>
    );

    return (
        <Modal title="Legal & Insurance" isOpen={true} onClose={onClose}>
            <div className="space-y-8 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {/* Business License Section */}
                <div className="space-y-3">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        Business License
                    </h3>
                    <div className="p-4 rounded-xl border border-white/10 bg-[#1A1A1A]">
                        <div className="flex items-center justify-between">
                            <CustomFileInput
                                label="Upload License"
                                showPreview={!!businessLicense}
                                previewText={businessLicense ? "File Selected" : ""}
                                onFileSelect={(e) => handleFileUpload(e, setBusinessLicense)}
                            />
                            {businessLicense && (
                                <a href={businessLicense} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-sm hover:underline flex items-center gap-1 font-medium">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>
                                    View Current License
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                <div className="h-px bg-white/10 w-full"></div>

                {/* Certifications Section */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-white">Certifications</h3>

                    {/* List */}
                    <div className="space-y-3">
                        {certifications.map((cert, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-[#252525] border border-white/5">
                                <div>
                                    <p className="font-semibold text-white">{cert.name}</p>
                                    <a href={cert.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300">View File</a>
                                </div>
                                <button onClick={() => setCertifications(prev => prev.filter((_, idx) => idx !== i))} className="text-white/40 hover:text-red-400 transition">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Add New */}
                    <div className="p-4 rounded-xl border border-white/10 bg-[#1A1A1A] space-y-4 relative">
                        <button className="absolute top-2 right-2 text-gray-500 hover:text-white" onClick={() => { setNewCertName(''); setNewCertFile(null); }}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                        </button>
                        <div>
                            <label className="text-xs text-light-gray mb-1 block">Name</label>
                            <input type="text" value={newCertName} onChange={e => setNewCertName(e.target.value)} placeholder="ASE Certified Master Technician" className="w-full p-3 bg-[#252525] border border-white/10 rounded-lg text-white focus:ring-1 focus:ring-primary focus:border-primary/50 transition-all placeholder-white/20" />
                        </div>
                        <div className="flex items-center justify-between">
                            <CustomFileInput
                                label="Upload Certificate"
                                showPreview={!!newCertFile}
                                previewText={newCertFile ? "File Selected" : ""}
                                onFileSelect={(e) => handleFileUpload(e, setNewCertFile)}
                            />
                            {newCertFile && <span className="text-xs text-blue-400 font-bold">View File</span>}
                        </div>
                    </div>
                    <button onClick={handleAddCertification} disabled={!newCertName || !newCertFile} className="flex items-center gap-2 text-orange-400 font-bold hover:text-orange-300 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>
                        Add Certification
                    </button>
                </div>

                <div className="h-px bg-white/10 w-full"></div>

                {/* Insurance Section */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-white">Insurance Policies</h3>

                    <div className="space-y-3">
                        {insurance.map((ins, i) => (
                            <div key={i} className="p-3 rounded-lg bg-[#252525] border border-white/5 relative">
                                <button onClick={() => setInsurance(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-2 right-2 text-white/40 hover:text-red-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                                </button>
                                <p className="font-bold text-white">{ins.type} - {ins.provider}</p>
                                <p className="text-sm text-gray-400">Policy #: {ins.policyNumber}</p>
                                <p className="text-xs text-gray-500">Expires: {new Date(ins.expiryDate).toLocaleDateString()}</p>
                            </div>
                        ))}
                    </div>

                    <div className="p-4 rounded-xl border border-white/10 bg-[#1A1A1A] space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-light-gray mb-1 block">Type</label>
                                <input type="text" value={newIns.type} onChange={e => setNewIns({ ...newIns, type: e.target.value })} placeholder="Liability" className="w-full p-3 bg-[#252525] border border-white/10 rounded-lg text-white focus:ring-1 focus:ring-primary focus:border-primary/50" />
                            </div>
                            <div>
                                <label className="text-xs text-light-gray mb-1 block">Provider</label>
                                <input type="text" value={newIns.provider} onChange={e => setNewIns({ ...newIns, provider: e.target.value })} placeholder="Provider Name" className="w-full p-3 bg-[#252525] border border-white/10 rounded-lg text-white focus:ring-1 focus:ring-primary focus:border-primary/50" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-light-gray mb-1 block">Policy #</label>
                                <input type="text" value={newIns.policyNumber} onChange={e => setNewIns({ ...newIns, policyNumber: e.target.value })} className="w-full p-3 bg-[#252525] border border-white/10 rounded-lg text-white focus:ring-1 focus:ring-primary focus:border-primary/50" />
                            </div>
                            <div>
                                <label className="text-xs text-light-gray mb-1 block">Expires</label>
                                <input type="date" value={newIns.expiryDate} onChange={e => setNewIns({ ...newIns, expiryDate: e.target.value })} className="w-full p-3 bg-[#252525] border border-white/10 rounded-lg text-white focus:ring-1 focus:ring-primary focus:border-primary/50" />
                            </div>
                        </div>
                        <CustomFileInput
                            label="Upload Policy Doc"
                            showPreview={!!newIns.fileUrl}
                            previewText={newIns.fileUrl ? "File Selected" : ""}
                            onFileSelect={(e) => handleFileUpload(e, (url) => setNewIns({ ...newIns, fileUrl: url }))}
                        />
                    </div>
                    <button onClick={handleAddInsurance} disabled={!newIns.type || !newIns.provider} className="flex items-center gap-2 text-orange-400 font-bold hover:text-orange-300 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>
                        Add Policy
                    </button>
                </div>
            </div>
            <div className="mt-6 flex justify-end gap-4">
                <button onClick={onClose} className="glass-button px-6 py-3 border border-red-500/20 rounded-xl text-red-300 hover:bg-red-500/10 transition">Cancel</button>
                <button onClick={() => onSave({ ...mechanic, businessLicense, certifications, insurance })} className="bg-primary text-white font-bold py-3 px-8 rounded-xl hover:bg-orange-600 transition shadow-lg shadow-primary/20">Save Updates</button>
            </div>
        </Modal>
    );
};

// --- Main Screen Component ---
const MechanicProfileManagementScreen: React.FC = () => {
    const { mechanic, logout, loading, updateMechanicProfile } = useMechanicAuth();
    const { db } = useDatabase();
    const [activeModal, setActiveModal] = useState<string | null>(null);
    const navigate = useNavigate();

    const { totalJobs, lifetimeEarnings, availableForPayout } = useMemo(() => {
        if (!mechanic || !db) return { totalJobs: 0, lifetimeEarnings: 0, availableForPayout: 0 };

        const completedJobs = db.bookings.filter(b => b.mechanic?.id === mechanic.id && b.status === 'Completed');
        const lifetimeEarnings = completedJobs.reduce((sum, job) => sum + job.service.price, 0);

        const paidJobs = completedJobs.filter(b => b.isPaid !== false);
        const totalEarnedAndPaid = paidJobs.reduce((sum, job) => sum + job.service.price, 0);

        const totalPaidOut = db.payouts
            .filter(p => p.mechanicId === mechanic.id && (p.status === 'Approved' || p.status === 'Pending'))
            .reduce((sum, p) => sum + p.amount, 0);

        const availableForPayout = totalEarnedAndPaid - totalPaidOut;

        return {
            totalJobs: completedJobs.length,
            lifetimeEarnings,
            availableForPayout,
        };
    }, [db, mechanic]);

    if (loading || !db || !mechanic) {
        return (
            <div className="flex flex-col h-full bg-[#121212]">
                <div className="p-4 bg-[#1A1A1A] border-b border-white/5"><h1 className="text-2xl font-bold text-white text-center">My Profile</h1></div>
                <div className="flex-grow flex items-center justify-center"><Spinner size="lg" /></div>
            </div>
        );
    }

    const handleProfileSave = (updatedMechanic: Mechanic) => {
        updateMechanicProfile(updatedMechanic);
        setActiveModal(null);
    };

    const handleAvailabilitySave = (availability: Required<Mechanic>['availability']) => {
        updateMechanicProfile({ ...mechanic, availability });
        setActiveModal(null);
    };

    const handleTimeOffSave = (dates: Array<{ startDate: string; endDate: string; reason?: string }>) => {
        updateMechanicProfile({ ...mechanic, unavailableDates: dates });
        setActiveModal(null);
    };

    const handlePasswordSave = (newPass: string) => {
        updateMechanicProfile({ ...mechanic, password: newPass });
    };

    const handlePayoutDetailsSave = (payoutDetails: PayoutDetails) => {
        updateMechanicProfile({ ...mechanic, payoutDetails });
        setActiveModal(null);
    };

    return (
        <div className="flex flex-col h-full bg-[#121212]">
            {/* Header */}
            <div className="p-5 bg-[#121212] flex items-center justify-center">
                <h1 className="text-2xl font-extrabold text-white tracking-wide">My Profile</h1>
            </div>

            <div className="flex-grow p-5 space-y-6 overflow-y-auto pb-24">
                {/* Profile Card */}
                <div className="bg-[#1A1A1A] rounded-2xl p-6 flex items-center gap-5 border border-white/5 relative overflow-hidden group">
                    {/* Gradient Glow */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-orange-500/20 transition-all duration-500"></div>

                    <div className="relative">
                        <img src={mechanic.imageUrl} alt={mechanic.name} className="w-20 h-20 rounded-full object-cover border-2 border-orange-500/50 shadow-lg shadow-orange-500/20" />
                    </div>

                    <div className="relative z-10">
                        <h2 className="text-xl font-bold text-white mb-0.5">{mechanic.name}</h2>
                        <p className="text-sm text-gray-400 font-medium mb-1">{mechanic.email}</p>
                        {mechanic.registrationDate && <p className="text-xs text-gray-600">Member since {new Date(mechanic.registrationDate.replace(/-/g, '/')).toLocaleDateString()}</p>}
                    </div>
                </div>

                {/* KPI Section */}
                <div>
                    <h3 className="text-base font-bold mb-3 text-orange-500 uppercase tracking-wider">Performance Snapshot</h3>
                    <div className="grid grid-cols-3 gap-3">
                        <StatCard title="Total Jobs" value={totalJobs} icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>} />
                        <StatCard title="Lifetime Earnings" value={`₱${(lifetimeEarnings / 1000).toFixed(1)}k`} icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
                        <StatCard title="Overall Rating" value={mechanic.rating.toFixed(1)} icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8-2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>} />
                    </div>
                </div>

                {/* Menu Section */}
                <div className="bg-[#1A1A1A] rounded-2xl overflow-hidden border border-white/5">
                    <MenuItem label="Edit Profile Details" onClick={() => setActiveModal('profile')} icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>} />
                    <MenuItem label="My Reviews" onClick={() => setActiveModal('reviews')} icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>} />
                    <MenuItem label="My Weekly Availability" onClick={() => setActiveModal('availability')} icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>} />
                    <MenuItem label="Set Time Off" onClick={() => setActiveModal('timeOff')} icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>} />
                    <MenuItem label="Request Payout" onClick={() => setActiveModal('payoutRequest')} icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.736 6.979C9.208 6.193 9.963 6 10 6c.045 0 .09.003.132.008l.322-1.768A2.5 2.5 0 007.41 5.952l1.326 1.027zm-1.854 1.708l1.378-1.066a2.5 2.5 0 00-1.293-1.378l-1.066 1.378.981 1.066zM5.5 10c0 .654.12 1.26.335 1.812L4.06 13.06A6 6 0 0110 4v2a4 4 0 00-3.328 1.54l-1.127 2.222.955.238zM14.5 10a4 4 0 00-3.328-1.54l1.127-2.222-.955-.238A6 6 0 0110 16v-2a4 4 0 003.328-1.54l1.127 2.222-.955.238z" clipRule="evenodd" /></svg>} />
                    <MenuItem label="Payout Details" onClick={() => setActiveModal('payouts')} icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" /><path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" /></svg>} />
                    <MenuItem label="Legal & Insurance" onClick={() => setActiveModal('legal')} icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>} />
                    <MenuItem label="Notification Settings" onClick={() => navigate('/mechanic/notification-settings')} icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" /></svg>} />
                    <MenuItem label="Help & Support" onClick={() => setActiveModal('support')} icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>} />
                    <MenuItem label="Change Password" onClick={() => setActiveModal('password')} icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd" /></svg>} />
                </div>

                <button onClick={logout} className="w-full bg-[#EA580C] text-white font-bold py-4 rounded-xl hover:bg-[#C2410C] transition shadow-lg shadow-orange-900/40 text-lg uppercase tracking-wide">Logout</button>
            </div>

            {activeModal === 'profile' && <ProfileDetailsModal mechanic={mechanic} onClose={() => setActiveModal(null)} onSave={handleProfileSave} />}
            {activeModal === 'availability' && <AvailabilityEditorModal availability={mechanic.availability} onClose={() => setActiveModal(null)} onSave={handleAvailabilitySave} />}
            {activeModal === 'timeOff' && <TimeOffModal unavailableDates={mechanic.unavailableDates || []} onClose={() => setActiveModal(null)} onSave={handleTimeOffSave} />}
            {activeModal === 'password' && <ChangePasswordModal currentPass={mechanic.password} onClose={() => setActiveModal(null)} onSave={handlePasswordSave} />}
            {activeModal === 'reviews' && <ReviewsModal reviews={mechanic.reviewsList || []} onClose={() => setActiveModal(null)} />}
            {activeModal === 'payoutRequest' && <PayoutRequestModal mechanic={mechanic} availableBalance={availableForPayout} onClose={() => setActiveModal(null)} />}
            {activeModal === 'payouts' && <PayoutDetailsModal payoutDetails={mechanic.payoutDetails} onClose={() => setActiveModal(null)} onSave={handlePayoutDetailsSave} />}
            {activeModal === 'support' && <HelpSupportModal contactEmail={db.settings.contactEmail} contactPhone={db.settings.contactPhone} onClose={() => setActiveModal(null)} />}
            {activeModal === 'legal' && <LegalDocsModal mechanic={mechanic} onClose={() => setActiveModal(null)} onSave={handleProfileSave} />}
        </div>
    );
};

export default MechanicProfileManagementScreen;