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
    <div className="bg-field p-4 rounded-lg text-center flex flex-col items-center justify-center">
        <div className="text-primary mx-auto w-10 h-10 mb-2 flex items-center justify-center">{icon}</div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-light-gray">{title}</p>
    </div>
);

const MenuItem = ({ label, icon, onClick }: { label: string, icon: React.ReactNode, onClick: () => void }) => (
    <button onClick={onClick} className="w-full text-left p-4 flex justify-between items-center border-b border-field hover:bg-field transition last:border-b-0">
        <div className="flex items-center">
            <span className="text-primary mr-3 w-5 text-center">{icon}</span>
            <span className="text-white">{label}</span>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-light-gray" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
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
                    <button type="button" onClick={onClose} className="bg-field text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-600 transition">Cancel</button>
                    <button type="submit" className="bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-orange-600 transition">Update Password</button>
                </div>
            </form>
        </Modal>
    );
};

const ReviewsModal: React.FC<{ reviews: Review[], onClose: () => void }> = ({ reviews, onClose }) => (
    <Modal title="All My Reviews" isOpen={true} onClose={onClose}>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {reviews.length > 0 ? (
                reviews.map(review => (
                    <div key={review.id} className="bg-field p-3 rounded-lg">
                        <div className="flex justify-between items-center mb-1">
                            <p className="font-semibold text-sm text-white">{review.customerName}</p>
                            <div className="flex items-center text-yellow-400">
                                {[...Array(5)].map((_, i) => <svg key={i} xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${i < review.rating ? 'fill-current' : 'text-gray-600'}`} viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>)}
                            </div>
                        </div>
                        <p className="text-xs text-light-gray">{review.comment}</p>
                        <p className="text-[10px] text-gray-500 mt-2 text-right">{new Date(review.date).toLocaleDateString()}</p>
                    </div>
                ))
            ) : (
                <p className="text-center text-light-gray py-8">You have no reviews yet.</p>
            )}
        </div>
    </Modal>
);

const PayoutDetailsModal: React.FC<{
    payoutDetails: Mechanic['payoutDetails'];
    onClose: () => void;
    onSave: (details: PayoutDetails) => void;
}> = ({ payoutDetails, onClose, onSave }) => {
    const [details, setDetails] = useState<PayoutDetails>(payoutDetails || {
        method: 'Bank Transfer',
        accountName: '',
        accountNumber: '',
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setDetails(prev => ({ ...prev, [name as keyof PayoutDetails]: value }));
    };

    const handleMethodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newMethod = e.target.value as 'Bank Transfer' | 'E-Wallet';
        setDetails(prev => {
            const newDetails: PayoutDetails = {
                method: newMethod,
                accountName: prev.accountName || '',
                accountNumber: '',
            };
            if (newMethod === 'Bank Transfer') {
                newDetails.bankName = '';
            } else {
                newDetails.walletName = 'GCash';
            }
            return newDetails;
        });
    };
    
    return (
        <Modal title="Payout Details" isOpen={true} onClose={onClose}>
            <div className="space-y-4">
                <div>
                    <label className="text-xs text-light-gray">Payout Method</label>
                    <select name="method" value={details.method} onChange={handleMethodChange} className="w-full p-2 bg-field border border-secondary rounded-md">
                        <option>Bank Transfer</option>
                        <option>E-Wallet</option>
                    </select>
                </div>
                 <div>
                    <label className="text-xs text-light-gray">Account Name</label>
                    <input type="text" name="accountName" value={details.accountName} onChange={handleInputChange} placeholder="As it appears on your account" className="w-full p-2 bg-field border border-secondary rounded-md" />
                </div>
                {details.method === 'Bank Transfer' ? (
                    <>
                        <div>
                            <label className="text-xs text-light-gray">Bank Name</label>
                            <input type="text" name="bankName" value={details.bankName || ''} onChange={handleInputChange} placeholder="e.g., BDO Unibank" className="w-full p-2 bg-field border border-secondary rounded-md" />
                        </div>
                        <div>
                            <label className="text-xs text-light-gray">Account Number</label>
                            <input type="text" name="accountNumber" value={details.accountNumber} onChange={handleInputChange} placeholder="Bank account number" className="w-full p-2 bg-field border border-secondary rounded-md" />
                        </div>
                    </>
                ) : (
                    <>
                        <div>
                            <label className="text-xs text-light-gray">E-Wallet</label>
                            <select name="walletName" value={details.walletName || 'GCash'} onChange={handleInputChange} className="w-full p-2 bg-field border border-secondary rounded-md">
                                <option>GCash</option>
                                <option>Paymaya</option>
                                <option>GrabPay</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-light-gray">Account Number (Phone)</label>
                            <input type="tel" name="accountNumber" value={details.accountNumber} onChange={handleInputChange} placeholder="e.g., 09171234567" className="w-full p-2 bg-field border border-secondary rounded-md" />
                        </div>
                    </>
                )}
            </div>
             <div className="mt-6 flex justify-end gap-4">
                <button onClick={onClose} className="bg-field text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-600 transition">Cancel</button>
                <button onClick={() => onSave(details)} className="bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-orange-600 transition">Save Details</button>
            </div>
        </Modal>
    );
};

const HelpSupportModal: React.FC<{
    contactEmail: string;
    contactPhone: string;
    onClose: () => void;
}> = ({ contactEmail, contactPhone, onClose }) => {
    const navigate = useNavigate();
    return (
        <Modal title="Help & Support" isOpen={true} onClose={onClose}>
            <div className="space-y-4">
                <p className="text-sm text-light-gray">If you have any issues with the app or a booking, please contact our support team.</p>
                <div className="bg-field p-3 rounded-lg space-y-2">
                    <p><span className="font-semibold text-primary">Email:</span> <a href={`mailto:${contactEmail}`} className="text-white hover:underline">{contactEmail}</a></p>
                    <p><span className="font-semibold text-primary">Phone:</span> <a href={`tel:${contactPhone}`} className="text-white hover:underline">{contactPhone}</a></p>
                </div>
                <button onClick={() => { navigate('/faq'); onClose(); }} className="w-full bg-field text-white font-bold py-3 rounded-lg hover:bg-gray-600 transition">
                    Go to FAQ
                </button>
            </div>
        </Modal>
    );
};

const LegalDocsModal: React.FC<{
    mechanic: Mechanic;
    onClose: () => void;
    onSave: (mechanic: Mechanic) => void;
}> = ({ mechanic, onClose, onSave }) => {
    const [formData, setFormData] = useState(mechanic);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'businessLicenseUrl' | 'certification', index?: number) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const base64 = await fileToBase64(file);
            if (fieldName === 'businessLicenseUrl') {
                setFormData(prev => ({ ...prev, businessLicenseUrl: base64 }));
            } else if (fieldName === 'certification' && index !== undefined) {
                handleCertChange(index, 'fileUrl', base64);
            }
        } catch (error) {
            alert('File upload failed. Please try again.');
        }
    };

    // Certifications handlers
    const handleCertChange = (index: number, field: 'name' | 'fileUrl', value: string) => {
        const newCerts = [...(formData.certifications || [])];
        newCerts[index] = { ...newCerts[index], [field]: value };
        setFormData(prev => ({ ...prev, certifications: newCerts }));
    };

    const handleAddCert = () => {
        setFormData(prev => ({ ...prev, certifications: [...(prev.certifications || []), { name: '', fileUrl: '' }] }));
    };

    const handleRemoveCert = (index: number) => {
        setFormData(prev => ({ ...prev, certifications: formData.certifications?.filter((_, i) => i !== index) }));
    };

    // Insurance handlers
    const handleInsuranceChange = (index: number, field: keyof NonNullable<Mechanic['insurances']>[0], value: string) => {
        const newInsurances = [...(formData.insurances || [])];
        newInsurances[index] = { ...newInsurances[index], [field]: value };
        setFormData(prev => ({ ...prev, insurances: newInsurances }));
    };

    const handleAddInsurance = () => {
        setFormData(prev => ({ ...prev, insurances: [...(prev.insurances || []), { type: '', provider: '', policyNumber: '' }] }));
    };

    const handleRemoveInsurance = (index: number) => {
        setFormData(prev => ({ ...prev, insurances: formData.insurances?.filter((_, i) => i !== index) }));
    };
    
    return (
        <Modal title="Legal & Insurance" isOpen={true} onClose={onClose}>
            <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                <div>
                    <h3 className="text-lg font-bold mb-2">Business License</h3>
                    <input type="file" accept="image/*,application/pdf" onChange={(e) => handleFileChange(e, 'businessLicenseUrl')} className="w-full text-sm text-light-gray file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
                    {formData.businessLicenseUrl && <a href={formData.businessLicenseUrl} target="_blank" rel="noreferrer" className="text-blue-400 text-sm hover:underline mt-2 inline-block">View Current License</a>}
                </div>
                
                <div className="border-t border-field pt-4">
                    <h3 className="text-lg font-bold mb-2">Certifications</h3>
                    <div className="space-y-3">
                        {formData.certifications?.map((cert, index) => (
                            <div key={index} className="bg-field p-3 rounded-md space-y-2 relative">
                                <button onClick={() => handleRemoveCert(index)} className="absolute top-2 right-2 text-red-400 hover:text-red-300 text-xl">&times;</button>
                                <input type="text" value={cert.name} onChange={(e) => handleCertChange(index, 'name', e.target.value)} placeholder="Certification Name" className="w-full p-2 bg-dark-gray border border-secondary rounded-md text-sm" />
                                <input type="file" onChange={(e) => handleFileChange(e, 'certification', index)} className="w-full text-xs text-light-gray file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary" />
                                {cert.fileUrl && <a href={cert.fileUrl} target="_blank" rel="noreferrer" className="text-blue-400 text-xs hover:underline">View File</a>}
                            </div>
                        ))}
                        <button onClick={handleAddCert} className="text-sm text-primary font-semibold">+ Add Certification</button>
                    </div>
                </div>

                 <div className="border-t border-field pt-4">
                    <h3 className="text-lg font-bold mb-2">Insurance Policies</h3>
                    <div className="space-y-3">
                        {formData.insurances?.map((ins, index) => (
                            <div key={index} className="bg-field p-3 rounded-md space-y-2 relative">
                                 <button onClick={() => handleRemoveInsurance(index)} className="absolute top-2 right-2 text-red-400 hover:text-red-300 text-xl">&times;</button>
                                <input type="text" value={ins.type} onChange={(e) => handleInsuranceChange(index, 'type', e.target.value)} placeholder="Insurance Type (e.g., General Liability)" className="w-full p-2 bg-dark-gray border border-secondary rounded-md text-sm" />
                                <input type="text" value={ins.provider} onChange={(e) => handleInsuranceChange(index, 'provider', e.target.value)} placeholder="Provider (e.g., AXA)" className="w-full p-2 bg-dark-gray border border-secondary rounded-md text-sm" />
                                <input type="text" value={ins.policyNumber} onChange={(e) => handleInsuranceChange(index, 'policyNumber', e.target.value)} placeholder="Policy Number" className="w-full p-2 bg-dark-gray border border-secondary rounded-md text-sm" />
                            </div>
                        ))}
                         <button onClick={handleAddInsurance} className="text-sm text-primary font-semibold">+ Add Insurance</button>
                    </div>
                </div>
            </div>
             <div className="mt-6 flex justify-end gap-4 border-t border-field pt-4">
                <button onClick={onClose} className="bg-field text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-600 transition">Cancel</button>
                <button onClick={() => onSave(formData)} className="bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-orange-600 transition">Save Documents</button>
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

    const kpiData = useMemo(() => {
        if (!mechanic || !db) return { totalJobs: 0, lifetimeEarnings: 0 };
        const completedJobs = db.bookings.filter(b => b.mechanic?.id === mechanic.id && b.status === 'Completed');
        const lifetimeEarnings = completedJobs.reduce((sum, job) => sum + job.service.price, 0);
        return {
            totalJobs: completedJobs.length,
            lifetimeEarnings,
        };
    }, [db, mechanic]);

    if (loading || !db || !mechanic) {
        return (
            <div className="flex flex-col h-full bg-secondary">
                <div className="p-4 bg-[#1D1D1D] border-b border-dark-gray"><h1 className="text-2xl font-bold text-white text-center">My Profile</h1></div>
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
        <div className="flex flex-col h-full bg-secondary">
            <div className="p-4 bg-[#1D1D1D] border-b border-dark-gray"><h1 className="text-2xl font-bold text-white text-center">My Profile</h1></div>
            
            <div className="flex-grow p-4 space-y-4 overflow-y-auto">
                {/* Profile Card */}
                <div className="bg-dark-gray rounded-lg p-4 flex items-center gap-4">
                    <img src={mechanic.imageUrl} alt={mechanic.name} className="w-20 h-20 rounded-full object-cover border-4 border-primary" />
                    <div>
                        <h2 className="text-xl font-bold">{mechanic.name}</h2>
                        <p className="text-sm text-light-gray">{mechanic.email}</p>
                        {mechanic.registrationDate && <p className="text-xs text-gray-400 mt-1">Member since {new Date(mechanic.registrationDate.replace(/-/g, '/')).toLocaleDateString()}</p>}
                    </div>
                </div>

                {/* KPI Section */}
                <div>
                    <h3 className="text-lg font-semibold mb-2 text-primary">Performance Snapshot</h3>
                    <div className="grid grid-cols-3 gap-3">
                        <StatCard title="Total Jobs" value={kpiData.totalJobs} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6-6H3.5A2.5 2.5 0 001 4.5v15A2.5 2.5 0 003.5 22h17a2.5 2.5 0 002.5-2.5v-15A2.5 2.5 0 0020.5 2H15" /></svg>} />
                        <StatCard title="Lifetime Earnings" value={`₱${(kpiData.lifetimeEarnings/1000).toFixed(1)}k`} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} />
                        <StatCard title="Overall Rating" value={mechanic.rating.toFixed(1)} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>} />
                    </div>
                </div>

                {/* Menu Section */}
                <div className="bg-dark-gray rounded-lg">
                    <MenuItem label="Edit Profile Details" onClick={() => setActiveModal('profile')} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>} />
                    <MenuItem label="My Reviews" onClick={() => setActiveModal('reviews')} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>} />
                    <MenuItem label="My Weekly Availability" onClick={() => setActiveModal('availability')} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>} />
                    <MenuItem label="Set Time Off" onClick={() => setActiveModal('timeOff')} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>} />
                    <MenuItem label="Legal & Insurance" onClick={() => setActiveModal('legal')} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h2a2 2 0 002-2V4a2 2 0 00-2-2H9z" /><path d="M4 12a2 2 0 012-2h10a2 2 0 012 2v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5z" /></svg>} />
                    <MenuItem label="Payout Details" onClick={() => setActiveModal('payouts')} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" /><path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" /></svg>} />
                    <MenuItem label="Notification Settings" onClick={() => navigate('/mechanic/notification-settings')} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" /></svg>} />
                    <MenuItem label="Help & Support" onClick={() => setActiveModal('support')} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>} />
                    <MenuItem label="Change Password" onClick={() => setActiveModal('password')} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd" /></svg>} />
                </div>
                
                <button onClick={logout} className="w-full bg-red-600/20 text-red-400 font-bold py-3 rounded-lg hover:bg-red-600/40 transition">Logout</button>
            </div>

            {activeModal === 'profile' && <ProfileDetailsModal mechanic={mechanic} onClose={() => setActiveModal(null)} onSave={handleProfileSave} />}
            {activeModal === 'availability' && <AvailabilityEditorModal availability={mechanic.availability} onClose={() => setActiveModal(null)} onSave={handleAvailabilitySave} />}
            {activeModal === 'timeOff' && <TimeOffModal unavailableDates={mechanic.unavailableDates || []} onClose={() => setActiveModal(null)} onSave={handleTimeOffSave} />}
            {activeModal === 'password' && <ChangePasswordModal currentPass={mechanic.password} onClose={() => setActiveModal(null)} onSave={handlePasswordSave} />}
            {activeModal === 'reviews' && <ReviewsModal reviews={mechanic.reviewsList || []} onClose={() => setActiveModal(null)} />}
            {activeModal === 'payouts' && <PayoutDetailsModal payoutDetails={mechanic.payoutDetails} onClose={() => setActiveModal(null)} onSave={handlePayoutDetailsSave} />}
            {activeModal === 'support' && <HelpSupportModal contactEmail={db.settings.contactEmail} contactPhone={db.settings.contactPhone} onClose={() => setActiveModal(null)} />}
            {activeModal === 'legal' && <LegalDocsModal mechanic={mechanic} onClose={() => setActiveModal(null)} onSave={handleProfileSave} />}
        </div>
    );
};

export default MechanicProfileManagementScreen;