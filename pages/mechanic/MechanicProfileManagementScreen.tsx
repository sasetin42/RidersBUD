import React, { useState, useEffect, useMemo } from 'react';
import { useMechanicAuth } from '../../context/MechanicAuthContext';
import { useDatabase } from '../../context/DatabaseContext';
import Spinner from '../../components/Spinner';
import { DayAvailability, Mechanic, PayoutDetails, Review } from '../../types';
import { fileToBase64, compressAndEncodeImage } from '../../utils/fileUtils';
import { storageService } from '../../services/StorageService';
import Modal from '../../components/admin/Modal';
import { useNavigate } from 'react-router-dom';
import NotificationBell from '../../components/NotificationBell';
import Header from '../../components/Header';
import { getProfileImage, STORAGE_PATHS } from '../../utils/imageConstants';
import { Bell, CheckCircle, Smartphone, Volume2, VolumeX, Clock, Sparkles, Star, User, Building2, CreditCard, DollarSign, Wallet, Lock, MessageSquare, Hash } from 'lucide-react';
import {
    getMechanicNotificationSettings,
    saveMechanicNotificationSettings,
    MechanicNotificationSettings,
    requestNotificationPermission,
    hasNotificationAPI,
    getNotificationPermission,
    showNotification,
} from '../../utils/notificationManager';

// --- Reusable Components ---
// --- Reusable Components ---
const StatCard = ({ title, value, icon, color = "text-primary" }: { title: string, value: string | number, icon: React.ReactNode, color?: string }) => (
    <div className="bg-[#1A1A1A] p-4 rounded-3xl border border-white/5 flex flex-col items-center justify-center gap-2 hover:border-white/20 transition-all group overflow-hidden relative">
        <div className="absolute inset-0 bg-white/[0.02] opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div className={`p-2 rounded-xl bg-white/5 ${color} group-hover:scale-110 transition-transform shadow-inner`}>
            {icon}
        </div>
        <span className="text-lg font-bold text-white">{value}</span>
        <span className="text-[10px] font-medium text-gray-500 text-center leading-none px-1">{title}</span>
    </div>
);

const MenuItem = ({ label, subtitle, badge, icon, onClick, variant = "default" }: { label: string, subtitle?: string, badge?: React.ReactNode, icon: React.ReactNode, onClick: () => void, variant?: "default" | "danger" }) => (
    <button
        onClick={onClick}
        type="button"
        className={`w-full text-left p-4 sm:p-5 flex justify-between items-center border-b border-white/5 transition-all last:border-b-0 group ${variant === 'danger' ? 'hover:bg-red-500/10' : 'hover:bg-white/5'}`}
    >
        <div className="flex items-center text-left">
            <span className={`mr-4 w-11 h-11 rounded-2xl bg-white/5 flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0 ${variant === 'danger' ? 'text-red-500 bg-red-500/5' : 'text-primary bg-primary/5'}`}>
                {icon}
            </span>
            <div className="flex flex-col text-left">
                <div className="flex items-center gap-2">
                    <span className={`text-sm font-black tracking-tight ${variant === 'danger' ? 'text-red-400' : 'text-white'}`}>
                        {label}
                    </span>
                    {badge && <div className="flex-shrink-0">{badge}</div>}
                </div>
                {subtitle && (
                    <span className="text-[10px] text-gray-500 font-bold tracking-wide mt-0.5 group-hover:text-gray-400 transition-colors">
                        {subtitle}
                    </span>
                )}
            </div>
        </div>
        <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl bg-white/5 transition-all group-hover:translate-x-1 ${variant === 'danger' ? 'group-hover:bg-red-500/20 group-hover:text-red-500' : 'group-hover:bg-primary/20 group-hover:text-primary'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </div>
        </div>
    </button>
);

// --- Modal Components ---
const ProfileDetailsModal: React.FC<{
    mechanic: Mechanic;
    onClose: () => void;
    onSave: (mechanic: Mechanic) => void;
}> = ({ mechanic, onClose, onSave }) => {
    const { db } = useDatabase();
    const [formData, setFormData] = useState({
        ...mechanic,
        name: mechanic.name || '',
        phone: mechanic.phone || '',
        birthday: mechanic.birthday || '',
        bio: mechanic.bio || '',
        basePrice: (mechanic as any).basePrice || 0,
        specializations: mechanic.specializations || [],
    });
    const [activeTab, setActiveTab] = useState<'basic' | 'skills' | 'portfolio' | 'verification'>('basic');
    const [isSaving, setIsSaving] = useState(false);
    const [newSkill, setNewSkill] = useState('');
    const [viewingDocument, setViewingDocument] = useState<{ url: string; label: string } | null>(null);

    // Predefined specializations matching Admin Panel
    const predefinedSpecializations = [
        'Engine Repair', 'Brake Systems', 'Electrical Systems', 'Transmission',
        'Air Conditioning', 'Suspension', 'Exhaust Systems', 'Diagnostics',
        'Oil Change', 'Tire Service', 'Battery Service', 'Wheel Alignment',
        'Paint & Body', 'Detailing', 'Welding'
    ];

    // Get verification requirements from settings
    const verificationRequirements = useMemo(() => {
        const defaultReqs = [
            { id: 'nbi', label: 'NBI Clearance', description: 'National Bureau of Investigation clearance', isRequired: true },
            { id: 'license', label: "Driver's License", description: 'Valid driver\'s license', isRequired: true },
            { id: 'certificate', label: 'Technical Certification', description: 'Technical certification', isRequired: true }
        ];
        return db?.settings?.verificationRequirements || defaultReqs;
    }, [db?.settings]);

    // Get all submitted documents with metadata
    const submittedDocuments = useMemo(() => {
        const docMap = new Map<string, { id: string; label: string; url: string; isRequired: boolean; submittedAt?: string }>();

        // Legacy documents
        if (mechanic.verificationDocuments?.nbiClearanceUrl) {
            docMap.set('nbi', { id: 'nbi', label: 'NBI Clearance', url: mechanic.verificationDocuments.nbiClearanceUrl, isRequired: true, submittedAt: mechanic.registrationDate });
        }
        if (mechanic.verificationDocuments?.driversLicenseUrl) {
            docMap.set('license', { id: 'license', label: "Driver's License", url: mechanic.verificationDocuments.driversLicenseUrl, isRequired: true, submittedAt: mechanic.registrationDate });
        }
        if (mechanic.verificationDocuments?.certificateOfTrainingsUrl) {
            docMap.set('certificate', { id: 'certificate', label: 'Technical Certification', url: mechanic.verificationDocuments.certificateOfTrainingsUrl, isRequired: true, submittedAt: mechanic.registrationDate });
        }

        // Dynamic documents (skip if already added via legacy)
        if (mechanic.verificationDocuments?.uploads) {
            Object.entries(mechanic.verificationDocuments.uploads).forEach(([key, url]) => {
                if (!docMap.has(key)) {
                    const req = verificationRequirements.find(r => r.id === key);
                    if (req && url) {
                        docMap.set(key, { id: key, label: req.label, url: url as string, isRequired: req.isRequired, submittedAt: mechanic.registrationDate });
                    }
                }
            });
        }

        return Array.from(docMap.values());
    }, [mechanic, verificationRequirements]);

    const verificationStatus = mechanic.verificationDocuments?.verificationStatus || 'Pending';

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Approved': return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'Rejected': return 'bg-red-500/20 text-red-400 border-red-500/30';
            case 'Submitted': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
            default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !mechanic) return;

        setIsSaving(true);
        try {
            const path = STORAGE_PATHS.MECHANICS(mechanic.id);
            const url = await storageService.uploadFile(path, file);
            setFormData(prev => ({ ...prev, imageUrl: url }));
        } catch (error) {
            console.error("Profile Image Upload Error:", error);
            alert("Failed to upload profile image.");
        } finally {
            setIsSaving(false);
        }
    };

    const handlePortfolioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0 || !mechanic) return;

        setIsSaving(true);
        try {
            const uploadPromises = Array.from(files).map(file => {
                const f = file as File;
                const path = STORAGE_PATHS.PORTFOLIO(mechanic.id);
                return storageService.uploadFile(path, f);
            });
            const urls = await Promise.all(uploadPromises);
            setFormData(prev => ({ 
                ...prev, 
                portfolioImages: [...(prev.portfolioImages || []), ...urls] 
            }));
        } catch (error) {
            console.error("Portfolio Upload Error:", error);
            alert("Failed to upload portfolio images.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleVerificationUpload = async (file: File, docType: string) => {
        if (!mechanic) return;
        setIsSaving(true);
        try {
            const isPdf = file.type === 'application/pdf';
            const path = STORAGE_PATHS.VERIFICATION(mechanic.id, docType);
            const url = await storageService.uploadFile(path, file, !isPdf);
            
            setFormData(prev => ({
                ...prev,
                verificationDocuments: {
                    ...(prev.verificationDocuments || {}),
                    [docType]: url,
                    verificationStatus: 'Pending' // Reset to pending if they re-upload
                }
            }));
        } catch (error) {
            console.error("Verification Upload Error:", error);
            alert("Failed to upload verification document.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleRemovePortfolioImage = (index: number) => {
        setFormData(prev => ({ ...prev, portfolioImages: prev.portfolioImages?.filter((_, i) => i !== index) }));
    };

    const toggleSpecialization = (spec: string) => {
        setFormData(prev => ({
            ...prev,
            specializations: prev.specializations.includes(spec)
                ? prev.specializations.filter(s => s !== spec)
                : [...prev.specializations, spec]
        }));
    };

    const addCustomSkill = () => {
        if (newSkill.trim() && !formData.specializations.includes(newSkill.trim())) {
            setFormData(prev => ({
                ...prev,
                specializations: [...prev.specializations, newSkill.trim()]
            }));
            setNewSkill('');
        }
    };

    const removeSpecialization = (spec: string) => {
        setFormData(prev => ({
            ...prev,
            specializations: prev.specializations.filter(s => s !== spec)
        }));
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-xl animate-fadeIn">
            <div className="bg-[#121212] border border-white/10 rounded-[2rem] sm:rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[85vh]">
                {/* Header */}
                <div className="relative bg-gradient-to-r from-primary/20 via-orange-500/10 to-transparent p-4 sm:p-5 border-b border-white/5">
                    <button onClick={onClose} className="absolute top-3 right-3 sm:top-5 sm:right-5 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full transition-colors z-10">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="relative group">
                            <div className="w-16 h-16 rounded-2xl bg-[#1A1A1A] border-4 border-[#121212] flex items-center justify-center overflow-hidden shadow-2xl">
                                <img src={getProfileImage(formData.imageUrl, formData.name)} alt="Profile" className="w-full h-full object-cover" />
                            </div>
                            <label htmlFor="profile-image-input" className="absolute -bottom-2 -right-2 p-1.5 bg-primary hover:bg-orange-600 text-white rounded-xl shadow-lg cursor-pointer transition-all transform hover:scale-110 active:scale-95">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                                <input type="file" id="profile-image-input" name="profileImage" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isSaving} />
                            </label>
                        </div>
                        <div>
                            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Edit Profile</h2>
                            <p className="text-xs text-gray-400 font-medium mt-0.5">Update your professional information</p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-[#0a0a0a] px-4 sm:px-6 pt-3 border-b border-white/5">
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                        <button
                            onClick={() => setActiveTab('basic')}
                            className={`profile-tab flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-extrabold transition-all whitespace-nowrap flex-shrink-0 border ${activeTab === 'basic' ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-[#1a1a1a] text-gray-400 border-white/5 hover:text-white hover:border-white/10 hover:bg-[#222]'}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                            <span>Basic</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('skills')}
                            className={`profile-tab flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-extrabold transition-all whitespace-nowrap flex-shrink-0 border ${activeTab === 'skills' ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-[#1a1a1a] text-gray-400 border-white/5 hover:text-white hover:border-white/10 hover:bg-[#222]'}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" /></svg>
                            <span>Skills</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('portfolio')}
                            className={`profile-tab flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-extrabold transition-all whitespace-nowrap flex-shrink-0 border ${activeTab === 'portfolio' ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-[#1a1a1a] text-gray-400 border-white/5 hover:text-white hover:border-white/10 hover:bg-[#222]'}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" /></svg>
                            <span>Work</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('verification')}
                            className={`profile-tab flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-extrabold transition-all whitespace-nowrap flex-shrink-0 border relative ${activeTab === 'verification' ? 'bg-primary text-white border-primary shadow-lg shadow-primary/30' : 'bg-[#1a1a1a] text-gray-400 border-white/5 hover:text-white hover:border-white/10 hover:bg-[#222]'}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                            <span>Docs</span>
                            {verificationStatus === 'Submitted' && (
                                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-yellow-500"></span>
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 custom-scrollbar">
                    {activeTab === 'basic' && (
                        <div className="space-y-4 sm:space-y-6 animate-fadeIn">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                <div className="space-y-2">
                                    <label htmlFor="mechanic-full-name" className="text-[10px] font-bold text-gray-500 ml-1">Full Name</label>
                                    <input
                                        id="mechanic-full-name"
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-white outline-none transition-all placeholder-gray-700 font-bold focus:border-white/20"
                                        placeholder="Full Name"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="mechanic-phone" className="text-[10px] font-bold text-gray-500 ml-1">Phone Number</label>
                                    <input
                                        id="mechanic-phone"
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleInputChange}
                                        className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-white outline-none transition-all placeholder-gray-700 font-bold focus:border-white/20"
                                        placeholder="+63 9xx xxx xxxx"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="mechanic-birthday" className="text-[10px] font-bold text-gray-500 ml-1">Birthday</label>
                                    <input
                                        id="mechanic-birthday"
                                        type={formData.birthday ? "date" : "text"}
                                        name="birthday"
                                        value={formData.birthday}
                                        onChange={handleInputChange}
                                        onFocus={(e) => e.target.type = "date"}
                                        onBlur={(e) => { if (!formData.birthday) e.target.type = "text"; }}
                                        className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-white outline-none transition-all placeholder-gray-500 font-bold focus:border-white/20"
                                        placeholder="Select your birthday"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="mechanic-base-price" className="text-[10px] font-bold text-gray-500 ml-1">Base Payout Price (₱)</label>
                                    <input
                                        id="mechanic-base-price"
                                        type="number"
                                        name="basePrice"
                                        value={formData.basePrice || 0}
                                        onChange={handleInputChange}
                                        className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-white outline-none transition-all placeholder-gray-700 font-bold focus:border-white/20"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="mechanic-bio" className="text-[10px]  tracking-widest font-black text-gray-500 ml-1">Professional Bio</label>
                                <textarea
                                    id="mechanic-bio"
                                    name="bio"
                                    value={formData.bio}
                                    onChange={handleInputChange}
                                    rows={4}
                                    className="w-full bg-white/5 border border-white/5 rounded-2xl px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base text-white outline-none transition-all placeholder-gray-700 font-medium resize-none focus:border-white/20"
                                    placeholder="Tell customers about your experience and expertise..."
                                />
                                <p className="text-xs text-gray-600 ml-1">{formData.bio.length}/500 characters</p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'skills' && (
                        <div className="space-y-6 animate-fadeIn">
                            <div>
                                <h3 className="text-sm font-bold text-white tracking-tight mb-3">Select Your Specializations</h3>
                                <div className="space-y-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                                    {[
                                        {
                                            title: 'Engine & Powertrain',
                                            items: ['Engine Repair', 'Transmission', 'Exhaust Systems', 'Diagnostics']
                                        },
                                        {
                                            title: 'Chassis & Braking',
                                            items: ['Brake Systems', 'Suspension', 'Wheel Alignment']
                                        },
                                        {
                                            title: 'Electrical & Electronics',
                                            items: ['Electrical Systems', 'Battery Service']
                                        },
                                        {
                                            title: 'Maintenance & Utility',
                                            items: ['Oil Change', 'Air Conditioning', 'Tire Service']
                                        },
                                        {
                                            title: 'Body & Detailing',
                                            items: ['Paint & Body', 'Detailing', 'Welding']
                                        }
                                    ].map((category) => (
                                        <div key={category.title} className="space-y-2">
                                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest border-b border-white/5 pb-1">{category.title}</p>
                                            <div className="flex flex-wrap gap-2">
                                                {category.items.map(spec => (
                                                    <button
                                                        key={spec}
                                                        type="button"
                                                        onClick={() => toggleSpecialization(spec)}
                                                        className={`spec-btn px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${formData.specializations.includes(spec) ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-white/5 text-gray-400 border-white/5 hover:text-white hover:border-white/10'}`}
                                                    >
                                                        {spec}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-bold text-white tracking-tight mb-3">Add Custom Skill</h3>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <input
                                        type="text"
                                        id="custom-skill-input"
                                        name="customSkill"
                                        value={newSkill}
                                        onChange={(e) => setNewSkill(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && addCustomSkill()}
                                        className="flex-1 bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-white outline-none transition-all placeholder-gray-700 font-bold text-xs focus:border-white/20"
                                        placeholder="e.g. Hybrid Systems"
                                    />
                                    <button
                                        onClick={addCustomSkill}
                                        className="px-5 py-3 bg-primary/20 hover:bg-primary text-primary hover:text-white rounded-xl font-bold text-xs transition-all w-full sm:w-auto"
                                    >
                                        Add
                                    </button>
                                </div>
                            </div>
                            {formData.specializations.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-bold text-white tracking-tight mb-3">Your Skills ({formData.specializations.length})</h3>
                                    <div className="space-y-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                                        {[
                                            {
                                                title: 'Engine & Powertrain',
                                                items: ['Engine Repair', 'Transmission', 'Exhaust Systems', 'Diagnostics']
                                            },
                                            {
                                                title: 'Chassis & Braking',
                                                items: ['Brake Systems', 'Suspension', 'Wheel Alignment']
                                            },
                                            {
                                                title: 'Electrical & Electronics',
                                                items: ['Electrical Systems', 'Battery Service']
                                            },
                                            {
                                                title: 'Maintenance & Utility',
                                                items: ['Oil Change', 'Air Conditioning', 'Tire Service']
                                            },
                                            {
                                                title: 'Body & Detailing',
                                                items: ['Paint & Body', 'Detailing', 'Welding']
                                            }
                                        ].map((category) => {
                                            const selectedInCat = formData.specializations.filter(spec => category.items.includes(spec));
                                            if (selectedInCat.length === 0) return null;
                                            return (
                                                <div key={category.title} className="space-y-2">
                                                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest border-b border-white/5 pb-1">{category.title}</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {selectedInCat.map(spec => (
                                                            <div key={spec} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-lg border border-primary/20">
                                                                <span className="text-[10px] font-bold">{spec}</span>
                                                                <button
                                                                    onClick={() => removeSpecialization(spec)}
                                                                    className="hover:text-red-400 transition-colors"
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {/* Handle Custom Skills (skills not in predefined categories) */}
                                        {(() => {
                                            const predefined = ['Engine Repair', 'Transmission', 'Exhaust Systems', 'Diagnostics', 'Brake Systems', 'Suspension', 'Wheel Alignment', 'Electrical Systems', 'Battery Service', 'Oil Change', 'Air Conditioning', 'Tire Service', 'Paint & Body', 'Detailing', 'Welding'];
                                            const customSkills = formData.specializations.filter(spec => !predefined.includes(spec));
                                            if (customSkills.length === 0) return null;
                                            return (
                                                <div className="space-y-2">
                                                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest border-b border-white/5 pb-1">Custom Skills</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {customSkills.map(spec => (
                                                            <div key={spec} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-lg border border-primary/20">
                                                                <span className="text-[10px] font-bold">{spec}</span>
                                                                <button
                                                                    onClick={() => removeSpecialization(spec)}
                                                                    className="hover:text-red-400 transition-colors"
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'portfolio' && (
                        <div className="space-y-4 sm:space-y-6 animate-fadeIn">
                            <div>
                                <h3 className="text-base sm:text-lg font-black text-white  tracking-tight mb-3 sm:mb-4">Portfolio Gallery</h3>
                                <label className="block w-full p-6 sm:p-8 border-2 border-dashed border-white/10 rounded-[1.5rem] sm:rounded-[2rem] text-center cursor-pointer hover:border-primary/30 hover:bg-white/5 transition-all group">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-white  tracking-widest">Upload Portfolio Images</p>
                                            <p className="text-xs text-gray-500 mt-1">Max 10 images • PNG, JPG up to 5MB each</p>
                                        </div>
                                    </div>
                                    <input
                                        type="file"
                                        id="portfolio-upload-input"
                                        name="portfolioImages"
                                        multiple
                                        accept="image/*"
                                        onChange={handlePortfolioUpload}
                                        className="hidden"
                                        disabled={isSaving}
                                    />
                                </label>
                            </div>

                            {formData.portfolioImages && formData.portfolioImages.length > 0 && (
                                <div>
                                    <h4 className="text-xs sm:text-sm font-black text-gray-400  tracking-widest mb-3 sm:mb-4">{formData.portfolioImages.length} Images</h4>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                                        {formData.portfolioImages.map((img, i) => (
                                            <div key={i} className="relative group aspect-square">
                                                <img src={img} className="w-full h-full rounded-2xl object-cover border border-white/5" alt={`Portfolio ${i + 1}`} />
                                                <button
                                                    onClick={() => handleRemovePortfolioImage(i)}
                                                    className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-all transform scale-90 group-hover:scale-100"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'verification' && (
                        <div className="space-y-6 animate-fadeIn">
                            {/* Status Banner */}
                            <div className={`p-6 rounded-[2rem] border ${getStatusColor(verificationStatus)}`}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-bold tracking-tight">Verification Status</h3>
                                        <p className="text-sm mt-1 opacity-80">
                                            {verificationStatus === 'Approved' && 'Your account has been verified and approved'}
                                            {verificationStatus === 'Rejected' && 'Your verification was rejected. Please contact support.'}
                                            {verificationStatus === 'Submitted' && 'Your documents are under review'}
                                            {verificationStatus === 'Pending' && 'Please submit your verification documents'}
                                        </p>
                                    </div>
                                    <span className={`px-4 py-2 rounded-xl text-xs font-black  tracking-widest border ${getStatusColor(verificationStatus)}`}>
                                        {verificationStatus}
                                    </span>
                                </div>
                            </div>

                                {submittedDocuments.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                        {submittedDocuments.map((doc) => (
                                            <div key={doc.id} className="bg-[#18181b] border border-white/5 rounded-[1.5rem] p-5 hover:border-primary/30 transition-all group">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div>
                                                        <h4 className="text-sm font-black text-white  tracking-wide">{doc.label}</h4>
                                                        {doc.isRequired && (
                                                            <span className="text-[9px] font-black text-primary  tracking-widest bg-primary/10 px-2 py-0.5 rounded mt-1 inline-block">Required</span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Document Preview */}
                                                <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-black/40 border border-white/5 mb-3">
                                                    <img src={doc.url} alt={doc.label} className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-3">
                                                        <button
                                                            onClick={() => setViewingDocument({ url: doc.url, label: doc.label })}
                                                            className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-black  tracking-widest flex items-center gap-2 backdrop-blur-sm"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>
                                                            View
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Submission Info */}
                                                {doc.submittedAt && (
                                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
                                                        <span className="font-mono">
                                                            {new Date(doc.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(doc.submittedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-[2rem]">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                        <p className="text-sm font-black text-gray-500  tracking-widest">No documents submitted yet</p>
                                        <p className="text-xs text-gray-600 mt-2">Upload your verification documents to get approved</p>
                                    </div>
                                )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 sm:px-6 py-2.5 sm:py-3 bg-[#1A1A1A]/80 border-t border-white/5">
                    <div className="grid grid-cols-2 gap-3 mb-1 sm:mb-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 active:bg-white/15 text-white rounded-xl font-bold transition-all border border-white/5 text-xs tracking-wider"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => onSave(formData)}
                            disabled={isSaving}
                            className="px-4 py-2.5 bg-primary hover:bg-orange-600 active:bg-orange-700 text-white rounded-xl font-bold transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                        >
                            {isSaving ? (
                                <>
                                    <Spinner size="sm" color="text-white" />
                                    <span className="hidden sm:inline">Uploading...</span>
                                    <span className="sm:hidden">...</span>
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                    <span className="hidden sm:inline">Save Changes</span>
                                    <span className="sm:hidden">Save</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Document Viewer Modal */}
            {viewingDocument && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-fadeIn" onClick={() => setViewingDocument(null)}>
                    <div className="relative max-w-5xl max-h-[90vh] w-full" onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={() => setViewingDocument(null)}
                            className="absolute -top-12 right-0 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                        </button>
                        <div className="bg-[#121212] border border-white/10 rounded-[2rem] p-4 overflow-hidden">
                            <h3 className="text-xl font-black text-white mb-4 px-4">{viewingDocument.label}</h3>
                            <div className="max-h-[70vh] overflow-auto custom-scrollbar">
                                <img src={viewingDocument.url} alt={viewingDocument.label} className="w-full h-auto" />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
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

    const handleChange = (day: keyof Required<Mechanic>['availability'], newAvailability: DayAvailability) => {
        setCurrentAvailability(prev => ({ ...prev, [day]: newAvailability }));
    };

    const daysOfWeek: (keyof Required<Mechanic>['availability'])[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    const applyPreset = (start: string, end: string) => {
        setCurrentAvailability(prev => {
            const updated = { ...prev };
            daysOfWeek.forEach(d => {
                if (updated[d].isAvailable) {
                    updated[d] = { ...updated[d], startTime: start, endTime: end };
                }
            });
            return updated;
        });
    };

    const toggleAllDays = () => {
        const anyChecked = daysOfWeek.some(d => currentAvailability[d].isAvailable);
        setCurrentAvailability(prev => {
            const updated = { ...prev };
            daysOfWeek.forEach(d => {
                updated[d] = { ...updated[d], isAvailable: !anyChecked };
            });
            return updated;
        });
    };

    const isAllChecked = daysOfWeek.every(d => currentAvailability[d].isAvailable);

    return (
        <Modal title="Manage My Weekly Availability" isOpen={true} onClose={onClose}>
            {/* Quick Presets & Controls */}
            <div className="bg-field/40 p-4 rounded-2xl border border-secondary mb-4 space-y-3">
                <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Quick Presets (Active Days)</div>
                <div className="flex flex-wrap gap-2">
                    <button 
                        type="button" 
                        onClick={() => applyPreset('09:00', '17:00')} 
                        className="text-xs bg-[#25160D] text-primary border border-primary/20 hover:bg-primary hover:text-white px-3 py-1.5 rounded-lg transition font-medium"
                    >
                        Standard (9AM-5PM)
                    </button>
                    <button 
                        type="button" 
                        onClick={() => applyPreset('08:00', '17:00')} 
                        className="text-xs bg-[#25160D] text-primary border border-primary/20 hover:bg-primary hover:text-white px-3 py-1.5 rounded-lg transition font-medium"
                    >
                        8AM-5PM
                    </button>
                    <button 
                        type="button" 
                        onClick={() => applyPreset('08:00', '22:00')} 
                        className="text-xs bg-[#25160D] text-primary border border-primary/20 hover:bg-primary hover:text-white px-3 py-1.5 rounded-lg transition font-medium"
                    >
                        8AM-10PM
                    </button>
                    <button 
                        type="button" 
                        onClick={() => applyPreset('00:00', '23:59')} 
                        className="text-xs bg-[#25160D] text-primary border border-primary/20 hover:bg-primary hover:text-white px-3 py-1.5 rounded-lg transition font-medium"
                    >
                        24 Hours
                    </button>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-white/5">
                    <span className="text-xs text-gray-400">Enable/disable days below</span>
                    <button 
                        type="button"
                        onClick={toggleAllDays}
                        className="text-xs text-primary hover:underline transition font-bold"
                    >
                        {isAllChecked ? 'Deselect All Days' : 'Select All Days'}
                    </button>
                </div>
            </div>

            {/* Days Scroll Area */}
            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1.5 custom-scrollbar">
                {daysOfWeek.map(day => {
                    const dayAvailability = currentAvailability[day];
                    return (
                        <div 
                            key={day} 
                            className={`p-3.5 rounded-2xl border transition-all duration-300 ${
                                dayAvailability.isAvailable 
                                    ? 'bg-[#1E1E1E] border-primary/20 hover:border-primary/40 shadow-md shadow-primary/5' 
                                    : 'bg-[#181818] border-white/5 opacity-60 hover:opacity-80'
                            }`}
                        >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                {/* Day Switch Toggle & Name */}
                                <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
                                    <div className="flex items-center gap-3">
                                        <label htmlFor={`availability-${day}`} className="flex items-center cursor-pointer group">
                                            <div className="relative">
                                                <input 
                                                    type="checkbox" 
                                                    id={`availability-${day}`}
                                                    name={`availability-${day}`}
                                                    checked={dayAvailability.isAvailable} 
                                                    onChange={e => handleChange(day, { ...dayAvailability, isAvailable: e.target.checked })} 
                                                    className="sr-only" 
                                                />
                                                {/* Custom toggle track */}
                                                <div className={`w-10 h-6 rounded-full transition-colors ${dayAvailability.isAvailable ? 'bg-primary' : 'bg-white/10'}`}></div>
                                                {/* Custom toggle handle */}
                                                <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${dayAvailability.isAvailable ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                            </div>
                                            <span className="ml-3 capitalize text-sm font-black text-white select-none tracking-wide group-hover:text-primary transition-colors">
                                                {day}
                                            </span>
                                        </label>
                                        <span className={`h-2 w-2 rounded-full ${dayAvailability.isAvailable ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
                                    </div>
                                </div>

                                {/* Start & End Time Inputs */}
                                <div className="flex items-center w-full sm:w-auto mt-1 sm:mt-0">
                                    <div className="flex items-center gap-2 w-full">
                                        <div className="flex flex-col gap-1 flex-1 min-w-0">
                                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider shrink-0 pl-1">In</span>
                                            <input 
                                                type="time" 
                                                id={`startTime-${day}`}
                                                name={`startTime-${day}`}
                                                value={dayAvailability.startTime} 
                                                disabled={!dayAvailability.isAvailable} 
                                                onChange={e => handleChange(day, { ...dayAvailability, startTime: e.target.value })} 
                                                className="w-full min-w-0 px-1.5 sm:px-2.5 py-2 bg-field border border-secondary rounded-xl text-xs sm:text-sm font-bold text-white disabled:opacity-30 disabled:cursor-not-allowed outline-none transition-all focus:border-primary/50 time-picker-primary-icon" 
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1 flex-1 min-w-0">
                                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider shrink-0 pl-1">Out</span>
                                            <input 
                                                type="time" 
                                                id={`endTime-${day}`}
                                                name={`endTime-${day}`}
                                                value={dayAvailability.endTime} 
                                                disabled={!dayAvailability.isAvailable} 
                                                onChange={e => handleChange(day, { ...dayAvailability, endTime: e.target.value })} 
                                                className="w-full min-w-0 px-1.5 sm:px-2.5 py-2 bg-field border border-secondary rounded-xl text-xs sm:text-sm font-bold text-white disabled:opacity-30 disabled:cursor-not-allowed outline-none transition-all focus:border-primary/50 time-picker-primary-icon" 
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="mt-6 flex justify-end gap-3 border-t border-field pt-4">
                <button onClick={onClose} className="bg-field text-white font-bold py-2.5 px-5 rounded-xl hover:bg-gray-600 transition text-sm">Cancel</button>
                <button onClick={() => onSave(currentAvailability)} className="bg-primary text-white font-bold py-2.5 px-5 rounded-xl hover:bg-orange-600 transition text-sm shadow-lg shadow-primary/20">Save Availability</button>
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

    const reasonPresets = ['Vacation', 'Personal Leave', 'Sick Leave', 'Equipment Repair', 'Family Event'];

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

        const startMs = new Date(startDate.replace(/-/g, '/')).getTime();
        const endMs = new Date(finalEndDate.replace(/-/g, '/')).getTime();

        if (endMs < startMs) {
            setError('End date cannot be before the start date.');
            return;
        }

        // Check for overlaps with existing scheduled dates
        const hasOverlap = dates.some(d => {
            const currentStart = new Date(d.startDate.replace(/-/g, '/')).getTime();
            const currentEnd = new Date(d.endDate.replace(/-/g, '/')).getTime();
            return (startMs <= currentEnd && endMs >= currentStart);
        });

        if (hasOverlap) {
            setError('This date/range overlaps with an existing time off.');
            return;
        }

        const newEntry = { startDate, endDate: finalEndDate, reason: reason.trim() || 'Not specified' };
        setDates(prev => [...prev, newEntry].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()));

        setStartDate('');
        setEndDate('');
        setReason('');
        setIsRange(false);
    };

    const handleDelete = (index: number) => {
        setDates(prev => prev.filter((_, i) => i !== index));
    };

    const calculateDays = (start: string, end: string) => {
        const diffTime = Math.abs(new Date(end.replace(/-/g, '/')).getTime() - new Date(start.replace(/-/g, '/')).getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return diffDays === 1 ? '1 Day' : `${diffDays} Days`;
    };

    const todayStr = new Date().toISOString().split('T')[0];

    return (
        <Modal title="Set Time Off" isOpen={true} onClose={onClose}>
            <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
                {/* Unavailability Form Card */}
                <div className="bg-[#18181b] p-5 rounded-2xl border border-white/5 space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="font-bold text-white text-sm">Add Unavailability</h4>
                        <span className="text-[10px] bg-primary/10 text-primary px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">New</span>
                    </div>

                    <div className="space-y-4">
                        {/* Selector */}
                        <div className="flex p-1 bg-[#27272a]/60 rounded-xl">
                            <button 
                                type="button"
                                onClick={() => { setIsRange(false); setError(''); }} 
                                className={`w-1/2 py-2 text-xs font-bold rounded-lg transition-all ${!isRange ? 'bg-[#FE7803] text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                            >
                                Single Day
                            </button>
                            <button 
                                type="button"
                                onClick={() => { setIsRange(true); setError(''); }} 
                                className={`w-1/2 py-2 text-xs font-bold rounded-lg transition-all ${isRange ? 'bg-[#FE7803] text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                            >
                                Date Range
                            </button>
                        </div>

                        {/* Date Inputs */}
                        <div className={`grid grid-cols-1 ${isRange ? 'sm:grid-cols-2' : ''} gap-3`}>
                            <div>
                                <label htmlFor="time-off-start" className="block text-[11px] font-bold text-gray-400 mb-1.5 ml-1">{isRange ? 'Start Date' : 'Date'}</label>
                                <input 
                                    id="time-off-start"
                                    name="timeOffStart"
                                    type="date" 
                                    value={startDate} 
                                    onChange={e => { setStartDate(e.target.value); setError(''); }} 
                                    min={todayStr} 
                                    className={`w-full p-3 bg-field border border-secondary rounded-xl text-sm font-bold outline-none transition-all focus:border-primary/50 date-picker-primary-icon ${!startDate ? 'text-gray-500' : 'text-white'}`} 
                                />
                            </div>
                            {isRange && (
                                <div>
                                    <label htmlFor="time-off-end" className="block text-[11px] font-bold text-gray-400 mb-1.5 ml-1">End Date</label>
                                    <input 
                                        id="time-off-end"
                                        name="timeOffEnd"
                                        type="date" 
                                        value={endDate} 
                                        onChange={e => { setEndDate(e.target.value); setError(''); }} 
                                        min={startDate || todayStr} 
                                        className={`w-full p-3 bg-field border border-secondary rounded-xl text-sm font-bold outline-none transition-all focus:border-primary/50 date-picker-primary-icon ${!endDate ? 'text-gray-500' : 'text-white'}`} 
                                    />
                                </div>
                            )}
                        </div>

                        {/* Custom Reason or presets */}
                        <div className="space-y-2">
                            <label htmlFor="time-off-reason" className="block text-[11px] font-bold text-gray-400 ml-1">Reason</label>
                            <input 
                                id="time-off-reason"
                                name="timeOffReason"
                                type="text" 
                                value={reason} 
                                onChange={e => { setReason(e.target.value); setError(''); }} 
                                placeholder="e.g., Bike maintenance, Vacation" 
                                className="w-full p-3 bg-field border border-secondary rounded-xl text-sm font-bold text-white outline-none transition-all placeholder-gray-600 focus:border-primary/50" 
                            />
                            
                            {/* Preset Buttons */}
                            <div className="flex flex-wrap gap-1.5 pt-1">
                                {reasonPresets.map((preset) => (
                                    <button
                                        key={preset}
                                        type="button"
                                        onClick={() => { setReason(preset); setError(''); }}
                                        className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all ${
                                            reason === preset
                                                ? 'bg-primary/20 text-primary border-primary/40'
                                                : 'bg-field text-gray-400 border-secondary hover:text-white hover:border-gray-600'
                                        }`}
                                    >
                                        {preset}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold text-center rounded-xl">
                                {error}
                            </div>
                        )}

                        <button 
                            type="button" 
                            onClick={handleAdd} 
                            className="w-full bg-primary text-white font-bold py-3 rounded-xl hover:bg-orange-600 shadow-lg shadow-primary/10 transition text-sm"
                        >
                            Add Unavailability
                        </button>
                    </div>
                </div>

                {/* List Container */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                        <h4 className="font-bold text-white text-sm">Scheduled Time Off</h4>
                        {dates.length > 0 && (
                            <span className="text-[10px] bg-[#27272a] text-gray-300 font-bold px-2.5 py-1 rounded-full">
                                {dates.length} {dates.length === 1 ? 'Period' : 'Periods'}
                            </span>
                        )}
                    </div>

                    {dates.length > 0 ? (
                        <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                            {dates.map((d, i) => (
                                <div key={i} className="bg-[#18181b] p-4 rounded-2xl border border-white/5 flex justify-between items-center hover:border-white/10 transition">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-sm text-white">
                                                {d.startDate === d.endDate 
                                                    ? new Date(d.startDate.replace(/-/g, '/')).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) 
                                                    : `${new Date(d.startDate.replace(/-/g, '/')).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(d.endDate.replace(/-/g, '/')).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                                            </p>
                                            <span className="text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                                {calculateDays(d.startDate, d.endDate)}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-400 font-medium">Reason: {d.reason}</p>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => handleDelete(i)} 
                                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-2 rounded-xl transition"
                                        aria-label="Remove scheduling"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-[#18181b]/50 p-8 rounded-2xl border border-dashed border-white/5 text-center">
                            <p className="text-xs text-gray-500 font-medium">No time off currently scheduled.</p>
                        </div>
                    )}
                </div>
            </div>
            <div className="mt-6 flex justify-end gap-3 border-t border-white/5 pt-5">
                <button type="button" onClick={onClose} className="bg-[#1E1E1E] text-white font-bold py-3 px-6 rounded-xl hover:bg-gray-800 transition text-sm">Cancel</button>
                <button type="button" onClick={() => onSave(dates)} className="bg-primary text-white font-bold py-3 px-6 rounded-xl hover:bg-orange-600 transition text-sm shadow-lg shadow-primary/20">Save Changes</button>
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
    const [showCurrentPw, setShowCurrentPw] = useState(false);
    const [showNewPw, setShowNewPw] = useState(false);
    const [showConfirmPw, setShowConfirmPw] = useState(false);

    const handlePasswordInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({ ...prev, [name]: value }));
        setPasswordMessage({ type: '', text: '' });
    };

    const isMinLength = passwordData.newPassword.length >= 6;
    const hasNumber = /\d/.test(passwordData.newPassword);
    const hasUppercase = /[A-Z]/.test(passwordData.newPassword);
    const isMatching = passwordData.newPassword.length > 0 && passwordData.newPassword === passwordData.confirmPassword;
    const isAllValid = isMinLength && hasNumber && hasUppercase && isMatching;

    const handleChangePassword = (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordData.currentPassword !== currentPass) {
            setPasswordMessage({ type: 'error', text: 'Current password is incorrect.' });
            return;
        }
        if (!isMinLength) {
            setPasswordMessage({ type: 'error', text: 'New password must be at least 6 characters.' });
            return;
        }
        if (!hasNumber || !hasUppercase) {
            setPasswordMessage({ type: 'error', text: 'Password requirements are not met.' });
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
            <form onSubmit={handleChangePassword} className="space-y-5">
                {/* Current Password */}
                <div className="space-y-2">
                    <label htmlFor="mechanic-current-password" className="text-xs font-bold text-gray-400">Current Password</label>
                    <div className="relative flex items-center">
                        <input 
                            id="mechanic-current-password"
                            type={showCurrentPw ? "text" : "password"} 
                            name="currentPassword" 
                            placeholder="Enter current password" 
                            value={passwordData.currentPassword} 
                            onChange={handlePasswordInputChange} 
                            className="w-full px-4 pr-12 py-3.5 bg-field border border-secondary rounded-xl text-sm font-bold text-white outline-none transition-all placeholder-gray-600 focus:border-primary/50 focus:ring-1 focus:ring-primary/20" 
                        />
                        <button
                            type="button"
                            onClick={() => setShowCurrentPw(!showCurrentPw)}
                            className="absolute right-4 text-gray-500 hover:text-white transition-colors"
                        >
                            {showCurrentPw ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            )}
                        </button>
                    </div>
                </div>

                {/* New Password */}
                <div className="space-y-2">
                    <label htmlFor="mechanic-new-password" className="text-xs font-bold text-gray-400">New Password</label>
                    <div className="relative flex items-center">
                        <input 
                            id="mechanic-new-password"
                            type={showNewPw ? "text" : "password"} 
                            name="newPassword" 
                            placeholder="Enter new password" 
                            value={passwordData.newPassword} 
                            onChange={handlePasswordInputChange} 
                            className="w-full px-4 pr-12 py-3.5 bg-field border border-secondary rounded-xl text-sm font-bold text-white outline-none transition-all placeholder-gray-600 focus:border-primary/50 focus:ring-1 focus:ring-primary/20" 
                        />
                        <button
                            type="button"
                            onClick={() => setShowNewPw(!showNewPw)}
                            className="absolute right-4 text-gray-500 hover:text-white transition-colors"
                        >
                            {showNewPw ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            )}
                        </button>
                    </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                    <label htmlFor="mechanic-confirm-password" className="text-xs font-bold text-gray-400">Confirm New Password</label>
                    <div className="relative flex items-center">
                        <input 
                            id="mechanic-confirm-password"
                            type={showConfirmPw ? "text" : "password"} 
                            name="confirmPassword" 
                            placeholder="Confirm new password" 
                            value={passwordData.confirmPassword} 
                            onChange={handlePasswordInputChange} 
                            className="w-full px-4 pr-12 py-3.5 bg-field border border-secondary rounded-xl text-sm font-bold text-white outline-none transition-all placeholder-gray-700 focus:border-primary/50 focus:ring-1 focus:ring-primary/20" 
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPw(!showConfirmPw)}
                            className="absolute right-4 text-gray-500 hover:text-white transition-colors"
                        >
                            {showConfirmPw ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            )}
                        </button>
                    </div>
                </div>

                {/* Validation checklist */}
                {passwordData.newPassword && (
                    <div className="bg-[#1A1A1A] p-4 rounded-xl border border-white/5 space-y-2.5 mt-2">
                        <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-1">Password Requirements</p>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="flex items-center gap-2 text-xs">
                                <span className={`h-1.5 w-1.5 rounded-full transition-colors ${isMinLength ? 'bg-green-400' : 'bg-gray-600'}`} />
                                <span className={isMinLength ? 'text-green-400/90 font-medium' : 'text-gray-500'}>
                                    At least 6 characters
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                                <span className={`h-1.5 w-1.5 rounded-full transition-colors ${hasNumber ? 'bg-green-400' : 'bg-gray-600'}`} />
                                <span className={hasNumber ? 'text-green-400/90 font-medium' : 'text-gray-500'}>
                                    Contains a number
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                                <span className={`h-1.5 w-1.5 rounded-full transition-colors ${hasUppercase ? 'bg-green-400' : 'bg-gray-600'}`} />
                                <span className={hasUppercase ? 'text-green-400/90 font-medium' : 'text-gray-500'}>
                                    Uppercase letter
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                                <span className={`h-1.5 w-1.5 rounded-full transition-colors ${isMatching ? 'bg-green-400' : 'bg-gray-600'}`} />
                                <span className={isMatching ? 'text-green-400/90 font-medium' : 'text-gray-500'}>
                                    Passwords match
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {passwordMessage.text && (
                    <div className={`p-3 rounded-xl text-xs font-bold text-center border ${
                        passwordMessage.type === 'error' 
                            ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                            : 'bg-green-500/10 text-green-400 border-green-500/20'
                    }`}>
                        {passwordMessage.text}
                    </div>
                )}
                
                <div className="mt-6 flex justify-end gap-3 border-t border-white/5 pt-5">
                    <button type="button" onClick={onClose} className="bg-[#1E1E1E] text-white font-bold py-3 px-6 rounded-xl hover:bg-gray-800 transition text-sm">Cancel</button>
                    <button 
                        type="submit" 
                        disabled={passwordData.newPassword ? !isAllValid : false}
                        className={`font-bold py-3 px-6 rounded-xl transition text-sm shadow-lg ${
                            passwordData.newPassword && !isAllValid
                                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                : 'bg-primary text-white hover:bg-orange-600 shadow-primary/20'
                        }`}
                    >
                        Update Password
                    </button>
                </div>
            </form>
        </Modal>
    );
};

const ReviewsModal: React.FC<{ reviews: Review[], onClose: () => void }> = ({ reviews, onClose }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [filterRating, setFilterRating] = useState<number | 0>(0);
    const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');
    const [visibleCount, setVisibleCount] = useState(8);

    const getRelativeTime = (isoDate: string) => {
        const now = new Date().getTime();
        const then = new Date(isoDate).getTime();
        const diffMs = now - then;
        const minute = 60 * 1000;
        const hour = 60 * minute;
        const day = 24 * hour;

        if (diffMs < hour) return `${Math.max(1, Math.floor(diffMs / minute))}m ago`;
        if (diffMs < day) return `${Math.floor(diffMs / hour)}h ago`;
        if (diffMs < day * 7) return `${Math.floor(diffMs / day)}d ago`;
        return new Date(isoDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const sentimentFromComment = (comment: string) => {
        const text = comment.toLowerCase();
        const positiveWords = ['excellent', 'great', 'good', 'fast', 'recommend', 'amazing', 'professional', 'friendly', 'satisfied', 'thank'];
        const negativeWords = ['bad', 'poor', 'late', 'slow', 'rude', 'expensive', 'disappointed', 'worst', 'issue', 'problem'];

        const hasPositive = positiveWords.some(w => text.includes(w));
        const hasNegative = negativeWords.some(w => text.includes(w));

        if (hasPositive && !hasNegative) return { label: 'Positive', className: 'bg-green-500/10 text-green-400 border-green-500/20' };
        if (hasNegative && !hasPositive) return { label: 'Needs Attention', className: 'bg-red-500/10 text-red-400 border-red-500/20' };
        return { label: 'Neutral', className: 'bg-gray-500/10 text-gray-400 border-gray-500/20' };
    };

    const ratingCounts = useMemo(() => {
        return [5, 4, 3, 2, 1].map(star => ({
            star,
            count: reviews.filter(r => r.rating === star).length
        }));
    }, [reviews]);

    const averageRating = useMemo(() => {
        if (!reviews.length) return 0;
        const total = reviews.reduce((sum, r) => sum + r.rating, 0);
        return total / reviews.length;
    }, [reviews]);

    const filteredAndSorted = useMemo(() => {
        let data = [...reviews];

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            data = data.filter(r =>
                (r.customerName || '').toLowerCase().includes(q) ||
                (r.comment || '').toLowerCase().includes(q) ||
                (r.bookingId || '').toLowerCase().includes(q)
            );
        }

        if (filterRating > 0) {
            data = data.filter(r => r.rating === filterRating);
        }

        data.sort((a, b) => {
            if (sortBy === 'newest') return new Date(b.date).getTime() - new Date(a.date).getTime();
            if (sortBy === 'oldest') return new Date(a.date).getTime() - new Date(b.date).getTime();
            if (sortBy === 'highest') return b.rating - a.rating || (new Date(b.date).getTime() - new Date(a.date).getTime());
            return a.rating - b.rating || (new Date(b.date).getTime() - new Date(a.date).getTime());
        });

        return data;
    }, [reviews, searchQuery, filterRating, sortBy]);

    const visibleReviews = filteredAndSorted.slice(0, visibleCount);
    const hasMore = visibleCount < filteredAndSorted.length;

    return (
        <Modal title="All My Reviews" isOpen={true} onClose={onClose}>
            <div className="space-y-4 sm:space-y-5 max-h-[72vh] overflow-y-auto pr-1 sm:pr-2">
                {/* Summary */}
                <div className="bg-gradient-to-br from-[#1E1E1E] to-[#151515] border border-white/10 rounded-2xl p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                        <div>
                            <p className="text-[10px] tracking-widest text-gray-500 font-black uppercase">Review Overview</p>
                            <h3 className="text-2xl font-black text-white leading-none mt-1">{averageRating.toFixed(1)} <span className="text-sm text-gray-400 font-bold">/ 5.0</span></h3>
                            <p className="text-xs text-gray-400 mt-1">{reviews.length} total review{reviews.length !== 1 ? 's' : ''}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                            {[1, 2, 3, 4, 5].map(i => (
                                <Star
                                    key={i}
                                    size={20}
                                    className={i <= Math.round(averageRating) ? 'fill-yellow-400 text-yellow-400 filter drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]' : 'text-gray-600'}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        {ratingCounts.map(({ star, count }) => {
                            const percent = reviews.length ? (count / reviews.length) * 100 : 0;
                            return (
                                <div key={star} className="flex items-center gap-2">
                                    <span className="text-[11px] text-gray-400 w-10">{star}★</span>
                                    <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                                        <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${percent}%` }} />
                                    </div>
                                    <span className="text-[11px] text-gray-500 w-8 text-right">{count}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                    <input
                        id="review-search"
                        name="reviewSearch"
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setVisibleCount(8); }}
                        placeholder="Search customer, comment, booking ID..."
                        className="sm:col-span-2 bg-[#181818] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-gray-600 outline-none focus:border-primary/40"
                    />
                    <select
                        id="review-sort"
                        name="reviewSort"
                        value={sortBy}
                        onChange={(e) => { setSortBy(e.target.value as any); setVisibleCount(8); }}
                        className="bg-[#181818] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-primary/40"
                    >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="highest">Highest Rating</option>
                        <option value="lowest">Lowest Rating</option>
                    </select>
                </div>

                <div className="flex flex-wrap gap-2">
                    {[0, 5, 4, 3, 2, 1].map(star => (
                        <button
                            key={star}
                            onClick={() => { setFilterRating(star as number | 0); setVisibleCount(8); }}
                            className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                                filterRating === star
                                    ? 'bg-primary/20 text-primary border-primary/30'
                                    : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
                            }`}
                        >
                            {star === 0 ? 'All Ratings' : `${star} Stars`}
                        </button>
                    ))}
                </div>

                {/* List */}
                {visibleReviews.length > 0 ? (
                    <div className="space-y-3">
                        {visibleReviews.map(review => {
                            const sentiment = sentimentFromComment(review.comment || '');
                            const initials = (review.customerName || 'C')
                                .split(' ')
                                .map(s => s.charAt(0))
                                .join('')
                                .slice(0, 2)
                                .toUpperCase();

                            return (
                                <div key={review.id} className="bg-[#171717] border border-white/10 rounded-2xl p-4 hover:border-white/20 transition-all">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center font-black text-xs shrink-0">
                                                {initials}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold text-sm text-white truncate">{review.customerName || 'Customer'}</p>
                                                <p className="text-[10px] text-gray-500">
                                                    {getRelativeTime(review.date)} • {new Date(review.date).toLocaleString()}
                                                    {review.updatedAt ? ' • edited' : ''}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center shrink-0">
                                            {[...Array(5)].map((_, i) => (
                                                <Star
                                                    key={i}
                                                    size={16}
                                                    className={i < review.rating ? 'fill-yellow-400 text-yellow-400 filter drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]' : 'text-gray-600'}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    <p className="text-sm text-gray-300 mt-3 leading-relaxed">{review.comment}</p>

                                    <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${sentiment.className}`}>
                                            {sentiment.label}
                                        </span>
                                        {review.bookingId && (
                                            <span className="text-[10px] text-gray-500 font-mono bg-white/5 border border-white/10 px-2 py-1 rounded-lg">
                                                Booking #{review.bookingId.slice(-6).toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {hasMore && (
                            <button
                                onClick={() => setVisibleCount(prev => prev + 8)}
                                className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-2.5 rounded-xl transition-all text-sm"
                            >
                                Load More Reviews
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-10 border border-dashed border-white/10 rounded-2xl bg-[#141414]">
                        <div className="w-14 h-14 rounded-2xl bg-white/5 mx-auto mb-3 flex items-center justify-center text-gray-500">
                            <Star size={28} className="text-gray-500 fill-transparent" />
                        </div>
                        <p className="text-white font-bold">No matching reviews found</p>
                        <p className="text-xs text-gray-500 mt-1">
                            {reviews.length === 0 ? 'You have no reviews yet. Complete more jobs to receive feedback.' : 'Try changing search, filter, or sort options.'}
                        </p>
                        <button
                            onClick={onClose}
                            className="mt-4 px-4 py-2 text-xs font-bold bg-primary/20 text-primary rounded-lg border border-primary/30 hover:bg-primary/30 transition"
                        >
                            Close
                        </button>
                    </div>
                )}
            </div>
        </Modal>
    );
};

const PayoutRequestModal: React.FC<{
    mechanic: Mechanic;
    availableBalance: number;
    onClose: () => void;
    onEditPayoutDetails: () => void;
}> = ({ mechanic, availableBalance, onClose, onEditPayoutDetails }) => {
    const { addPayoutRequest, db } = useDatabase();
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [error, setError] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const settings = db!.settings;

    const pendingRequestsAmount = useMemo(() => {
        if (!db?.payouts || !mechanic?.id) return 0;
        return db.payouts
            .filter((p: any) => p.mechanicId === mechanic.id && p.status === 'Pending')
            .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
    }, [db?.payouts, mechanic?.id]);

    const lifetimeEarnings = useMemo(() => {
        if (!mechanic || !db) return 0;
        const completedJobs = db.bookings.filter(b => (b.mechanic?.id === mechanic.id || b.mechanicId === mechanic.id) && b.status === 'Completed');
        const calculatedEarnings = completedJobs.reduce((sum, job) => sum + (job.service?.price || job.services?.[0]?.price || 0), 0);
        const grossEarnings = mechanic.totalEarnings || calculatedEarnings;
        
        const approvedPayoutsAmount = db.payouts
            .filter((p: any) => p.mechanicId === mechanic.id && (p.status === 'Approved' || p.status === 'Paid' || p.status === 'Completed'))
            .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
            
        return Math.max(0, grossEarnings - approvedPayoutsAmount);
    }, [db?.bookings, db?.payouts, mechanic.totalEarnings, mechanic.id]);

    const effectiveAvailableBalance = availableBalance || lifetimeEarnings;
    const safeWithdrawable = Math.max(0, (effectiveAvailableBalance || 0) - pendingRequestsAmount);
    const requestAmount = parseFloat(amount || '0');
    const initialHasPayoutDetails = mechanic.payoutDetails && mechanic.payoutDetails.accountName && mechanic.payoutDetails.accountNumber;

    const processingTimeline = settings.payoutSchedule || 'Processed within 3–5 business days';
    const minPayout = settings.minimumPayout || 0;
    const maxPayout = settings.maximumPayout || Number.MAX_SAFE_INTEGER;

    const estimatedRemaining = Math.max(0, safeWithdrawable - (isNaN(requestAmount) ? 0 : requestAmount));
    const [selectedDestinationIndex, setSelectedDestinationIndex] = useState(0);

    const payoutDestinations = useMemo<PayoutDetails[]>(() => {
        const list: PayoutDetails[] = [];
        if (mechanic.payoutDetails && mechanic.payoutDetails.accountName) {
            list.push(mechanic.payoutDetails);
            // Mock secondary destinations for demo purposes since schema is single destination
            list.push({
                method: 'Bank Transfer',
                accountName: mechanic.payoutDetails.accountName,
                accountNumber: mechanic.payoutDetails.accountNumber + '9999',
                bankName: 'BDO Unibank',
            });
            list.push({
                method: 'E-Wallet',
                accountName: mechanic.payoutDetails.accountName,
                accountNumber: mechanic.payoutDetails.accountNumber + '8888',
                walletName: 'Maya',
            });
        }
        return list;
    }, [mechanic.payoutDetails]);

    const activeDestination = payoutDestinations[selectedDestinationIndex] || mechanic.payoutDetails;

    const hasPayoutDetails = !!activeDestination;

    const validationError = useMemo(() => {
        if (!hasPayoutDetails) return 'Please set up payout details first.';
        if (requestAmount <= 0) return 'Please enter a valid request amount.';
        if (requestAmount < minPayout) return `Minimum payout request is ₱${minPayout.toLocaleString()}.`;
        if (requestAmount > maxPayout) return `Maximum payout request is ₱${maxPayout.toLocaleString()}.`;
        if (requestAmount > safeWithdrawable) return 'Requested amount exceeds your safe withdrawable balance.';
        return '';
    }, [hasPayoutDetails, requestAmount, minPayout, maxPayout, safeWithdrawable]);

    const applyQuickAmount = (ratio: number) => {
        const computed = Math.floor((safeWithdrawable * ratio) * 100) / 100;
        setAmount(computed > 0 ? computed.toFixed(2) : '0');
        setError('');
    };

    const handleRequest = async () => {
        setError('');
        if (validationError) {
            setError(validationError);
            return;
        }

        setIsProcessing(true);
        try {
            const method = activeDestination?.method === 'Bank Transfer'
                ? `${activeDestination?.bankName} (Bank)`
                : `${activeDestination?.walletName} (E-Wallet)`;

            await addPayoutRequest({
                mechanicId: mechanic.id,
                mechanicName: mechanic.name,
                amount: requestAmount,
                paymentMethod: method,
                accountDetails: `${activeDestination?.accountName} - ${activeDestination?.accountNumber}`,
                notes: note.trim() || 'Standard payout request from profile.'
            });
            setIsSuccess(true);
        } catch (e) {
            setError("Failed to submit request. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    if (isSuccess) {
        return (
            <Modal title={<h3 className="text-base font-black text-white tracking-tight">Payout Request Submitted</h3>} isOpen={true} onClose={onClose} compact>
                <div className="text-center space-y-4">
                    <div className="w-20 h-20 rounded-3xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-black text-white">Request Sent Successfully</h3>
                    <div className="bg-field rounded-xl p-4 border border-white/10 text-left space-y-3.5">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center text-green-400 shrink-0">
                                <DollarSign size={16} />
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Amount Requested</p>
                                <p className="text-xl font-black text-green-400 mt-0.5">₱{requestAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-3 border-t border-white/5 pt-3">
                            <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400 shrink-0">
                                {activeDestination?.method === 'Bank Transfer' ? <Building2 size={16} /> : <Smartphone size={16} />}
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Destination</p>
                                <p className="text-sm text-white font-bold mt-0.5">
                                    {activeDestination?.accountName} • {activeDestination?.method === 'Bank Transfer' ? activeDestination?.bankName : activeDestination?.walletName} ({activeDestination?.accountNumber.slice(-4)})
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 border-t border-white/5 pt-3">
                            <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-primary shrink-0">
                                <Clock size={16} />
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Expected Timeline</p>
                                <p className="text-xs font-bold text-primary mt-0.5">{processingTimeline}</p>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="mt-2 w-full bg-primary text-white font-black py-3 rounded-xl hover:bg-orange-600 transition">
                        Done
                    </button>
                </div>
            </Modal>
        );
    }

    return (
        <Modal title={<h2 className="text-base font-black text-white tracking-tight">Request a Payout</h2>} isOpen={true} onClose={onClose} compact>
            <div className="space-y-4">
                {/* Finance Summary - Total Earnings and Pending/Locked */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#132535] border border-sky-500/10 rounded-xl p-3 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] text-gray-400 font-bold tracking-wider">Total Earnings</p>
                            <p className="text-base font-black text-sky-400 mt-1">₱{lifetimeEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400 shrink-0">
                            <Wallet size={16} />
                        </div>
                    </div>
                    <div className="bg-[#1f1b2e] border border-yellow-500/10 rounded-xl p-3 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] text-gray-400 font-bold tracking-wider">Pending/Locked</p>
                            <p className="text-base font-black text-yellow-400 mt-1">₱{pendingRequestsAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center text-yellow-400 shrink-0">
                            <Lock size={16} />
                        </div>
                    </div>
                </div>

                {!hasPayoutDetails ? (
                    <div className="p-4 bg-red-900/50 border border-red-500/50 rounded-xl text-center">
                        <p className="text-red-300 font-semibold">No Payout Details Found</p>
                        <p className="text-xs text-red-200 mt-1">Please set up payout details before requesting a payout.</p>
                        <button
                            type="button"
                            onClick={onEditPayoutDetails}
                            className="mt-3 bg-primary text-white text-xs font-black px-4 py-2 rounded-lg hover:bg-orange-600 transition"
                        >
                            Set Up Details
                        </button>
                    </div>
                ) : (
                    <div className="bg-field p-4 rounded-xl border border-white/10 space-y-3">
                        <div className="flex items-center justify-between mb-1">
                            <h4 className="font-black text-white text-xs">Payout Destination</h4>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={onEditPayoutDetails}
                                    className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wider"
                                >
                                    Edit
                                </button>
                                <span className="text-[10px] bg-green-500/10 border border-green-500/20 text-green-400 font-bold px-2 py-0.5 rounded-full">Verified</span>
                            </div>
                        </div>
                        
                        <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-primary">
                                {activeDestination?.method === 'Bank Transfer' ? <Building2 size={15} /> : <Smartphone size={15} />}
                            </div>
                            <select
                                id="payout-destination"
                                name="payoutDestination"
                                value={selectedDestinationIndex}
                                onChange={(e) => setSelectedDestinationIndex(Number(e.target.value))}
                                className="w-full p-2.5 pl-9 bg-black/40 border border-secondary rounded-xl text-xs text-white outline-none focus:border-white/20 cursor-pointer appearance-none"
                            >
                                {payoutDestinations.map((dest, idx) => (
                                    <option key={idx} value={idx}>
                                        {dest.method} — {dest.method === 'Bank Transfer' ? dest.bankName : dest.walletName} ({dest.accountNumber.slice(-4)})
                                    </option>
                                ))}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>

                        <div className="space-y-2 pt-2 border-t border-white/5">
                            <div className="flex items-center gap-2.5 text-xs text-light-gray">
                                <User size={13} className="text-sky-400 shrink-0" />
                                <span>Account: <span className="text-white font-bold">{activeDestination?.accountName}</span></span>
                            </div>
                            <div className="flex items-center gap-2.5 text-xs text-light-gray">
                                <Hash size={13} className="text-orange-400 shrink-0" />
                                <span>Number: <span className="text-white font-bold">{activeDestination?.accountNumber}</span></span>
                            </div>
                            <div className="flex items-center gap-2.5 text-xs text-light-gray">
                                <CreditCard size={13} className="text-emerald-400 shrink-0" />
                                <span>Method: <span className="text-white font-bold">{activeDestination?.method} ({activeDestination?.method === 'Bank Transfer' ? activeDestination?.bankName : activeDestination?.walletName})</span></span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label htmlFor="payout-amount" className="text-xs text-light-gray">Amount to Withdraw</label>
                        <button
                            type="button"
                            onClick={() => setAmount(safeWithdrawable.toFixed(2))}
                            className="text-[10px] font-bold text-primary hover:underline"
                        >
                            MAX
                        </button>
                    </div>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary font-bold text-sm">₱</span>
                        <input
                            id="payout-amount"
                            name="payoutAmount"
                            type="number"
                            value={amount}
                            onChange={e => { setAmount(e.target.value); setError(''); }}
                            disabled={!hasPayoutDetails}
                            className="w-full p-3 pl-8 bg-field border border-secondary rounded-xl disabled:opacity-50 outline-none transition-all focus:border-white/20 text-sm font-semibold text-white"
                            placeholder="0.00"
                        />
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => applyQuickAmount(0.25)} className="px-3 py-1.5 text-xs rounded-lg bg-white/5 border border-white/10 hover:bg-white/10">25%</button>
                        <button type="button" onClick={() => applyQuickAmount(0.50)} className="px-3 py-1.5 text-xs rounded-lg bg-white/5 border border-white/10 hover:bg-white/10">50%</button>
                        <button type="button" onClick={() => applyQuickAmount(0.75)} className="px-3 py-1.5 text-xs rounded-lg bg-white/5 border border-white/10 hover:bg-white/10">75%</button>
                        <button type="button" onClick={() => applyQuickAmount(1)} className="px-3 py-1.5 text-xs rounded-lg bg-primary/15 border border-primary/30 text-primary hover:bg-primary/25">100%</button>
                    </div>

                    <p className="text-[11px] text-gray-500">
                        Limits: {minPayout ? `Min ₱${minPayout.toLocaleString()}` : 'No minimum'} • {maxPayout !== Number.MAX_SAFE_INTEGER ? `Max ₱${maxPayout.toLocaleString()}` : 'No maximum'}
                    </p>
                    <p className="text-[11px] text-gray-500">After request, estimated safe balance: <span className="text-white font-semibold">₱{estimatedRemaining.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></p>
                </div>

                <div>
                    <label htmlFor="payout-notes" className="text-xs text-light-gray mb-1.5 block flex items-center gap-1.5">
                        <MessageSquare size={13} className="text-primary" />
                        Notes (Optional)
                    </label>
                    <textarea
                        id="payout-notes"
                        name="payoutNotes"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={2}
                        className="w-full p-3 bg-field border border-secondary rounded-xl outline-none transition-all focus:border-white/20 resize-none text-xs"
                        placeholder="Add notes for admin (e.g., urgent payout for utilities)"
                    />
                </div>

                <div className="bg-[#1A1A1A] border border-white/10 rounded-xl p-3 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-primary mt-0.5 shrink-0">
                        <Clock size={16} />
                    </div>
                    <div>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Processing Timeline</p>
                        <p className="text-xs font-bold text-primary mt-1">{processingTimeline}</p>
                    </div>
                </div>

                {(error || validationError) && (
                    <p className="text-red-400 text-xs mt-1">{error || validationError}</p>

                )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
                <button onClick={onClose} className="bg-field text-white font-bold py-2.5 px-4 rounded-xl hover:bg-gray-600 transition text-xs">
                    Cancel
                </button>
                <button
                    onClick={handleRequest}
                    disabled={!!validationError || isProcessing}
                    className="bg-primary text-white font-black py-2.5 px-5 rounded-xl hover:bg-orange-600 transition disabled:opacity-50 min-w-[160px] flex justify-center items-center gap-2 text-xs"
                >
                    {isProcessing ? (
                        <>
                            <Spinner size="sm" />
                            <span>Submitting...</span>
                        </>
                    ) : 'Request Payout'}
                </button>
            </div>
        </Modal>
    );
};
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
    const [error, setError] = useState('');

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setDetails(prev => ({ ...prev, [name]: value }));
        setError('');
    };

    const handleMethodSelect = (method: 'Bank Transfer' | 'E-Wallet') => {
        setDetails(prev => {
            const newDetails: PayoutDetails = {
                method,
                accountName: prev.accountName || '',
                accountNumber: '',
            };
            if (method === 'Bank Transfer') {
                newDetails.bankName = 'BDO';
            } else {
                newDetails.walletName = 'GCash';
            }
            return newDetails;
        });
        setError('');
    };

    const handlePresetClick = (name: string) => {
        setDetails(prev => {
            if (prev.method === 'Bank Transfer') {
                return { ...prev, bankName: name };
            } else {
                return { ...prev, walletName: name as 'GCash' | 'Paymaya' };
            }
        });
        setError('');
    };

    const handleSave = () => {
        if (!details.accountName.trim()) {
            setError('Account name is required.');
            return;
        }
        if (details.method === 'Bank Transfer' && !details.bankName?.trim()) {
            setError('Bank name is required.');
            return;
        }
        if (!details.accountNumber.trim()) {
            setError('Account or phone number is required.');
            return;
        }

        // Numerical format check
        const cleanNumber = details.accountNumber.replace(/\s+/g, '');
        if (!/^\d+$/.test(cleanNumber)) {
            setError('Account number must contain digits only.');
            return;
        }

        if (details.method === 'E-Wallet') {
            if (cleanNumber.length < 10 || cleanNumber.length > 12) {
                setError('Please enter a valid mobile number (e.g. 09171234567).');
                return;
            }
        }

        onSave(details);
    };

    return (
        <Modal title="Payout Details" isOpen={true} onClose={onClose}>
            <div className="space-y-5">
                {/* Method Card Selector */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400">Payout Method</label>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => handleMethodSelect('Bank Transfer')}
                            className={`p-4 rounded-2xl border text-left transition-all flex flex-col gap-1.5 ${
                                details.method === 'Bank Transfer'
                                    ? 'bg-primary/10 border-primary text-white'
                                    : 'bg-[#18181b] border-white/5 text-gray-400 hover:border-white/10 hover:text-white'
                            }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            <span className="font-bold text-sm">Bank Transfer</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleMethodSelect('E-Wallet')}
                            className={`p-4 rounded-2xl border text-left transition-all flex flex-col gap-1.5 ${
                                details.method === 'E-Wallet'
                                    ? 'bg-primary/10 border-primary text-white'
                                    : 'bg-[#18181b] border-white/5 text-gray-400 hover:border-white/10 hover:text-white'
                            }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            <span className="font-bold text-sm">E-Wallet</span>
                        </button>
                    </div>
                </div>

                {/* Account Name */}
                <div className="space-y-2">
                    <label htmlFor="mechanic-account-name" className="text-xs font-bold text-gray-400">Account Name</label>
                    <input 
                        id="mechanic-account-name"
                        type="text" 
                        name="accountName" 
                        value={details.accountName} 
                        onChange={handleInputChange} 
                        placeholder="As it appears on your account" 
                        className="w-full px-4 py-3.5 bg-field border border-secondary rounded-xl text-sm font-bold text-white outline-none transition-all placeholder-gray-600 focus:border-primary/50 focus:ring-1 focus:ring-primary/20" 
                    />
                </div>

                {details.method === 'Bank Transfer' ? (
                    <>
                        {/* Bank Selector / Name */}
                        <div className="space-y-2">
                            <label htmlFor="mechanic-bank-name" className="text-xs font-bold text-gray-400">Bank Name</label>
                            <input 
                                id="mechanic-bank-name"
                                type="text" 
                                name="bankName" 
                                value={details.bankName || ''} 
                                onChange={handleInputChange} 
                                placeholder="Enter bank name" 
                                className="w-full px-4 py-3.5 bg-field border border-secondary rounded-xl text-sm font-bold text-white outline-none transition-all placeholder-gray-600 focus:border-primary/50 focus:ring-1 focus:ring-primary/20" 
                            />
                            {/* Preset Banks */}
                            <div className="flex flex-wrap gap-1.5 pt-1">
                                {['BDO', 'BPI', 'Metrobank', 'Unionbank'].map((bank) => (
                                    <button
                                        key={bank}
                                        type="button"
                                        onClick={() => handlePresetClick(bank)}
                                        className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all ${
                                            details.bankName === bank
                                                ? 'bg-primary/20 text-primary border-primary/40'
                                                : 'bg-[#18181b] text-gray-400 border-white/5 hover:text-white hover:border-gray-600'
                                        }`}
                                    >
                                        {bank}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Account Number */}
                        <div className="space-y-2">
                            <label htmlFor="mechanic-account-number" className="text-xs font-bold text-gray-400">Account Number</label>
                            <input 
                                id="mechanic-account-number"
                                type="text" 
                                name="accountNumber" 
                                value={details.accountNumber} 
                                onChange={handleInputChange} 
                                placeholder="Bank account number" 
                                className="w-full px-4 py-3.5 bg-field border border-secondary rounded-xl text-sm font-bold text-white outline-none transition-all placeholder-gray-600 focus:border-primary/50 focus:ring-1 focus:ring-primary/20" 
                            />
                        </div>
                    </>
                ) : (
                    <>
                        {/* Wallet Selector */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400">E-Wallet Provider</label>
                            <div className="flex gap-2">
                                {['GCash', 'Paymaya'].map((wallet) => (
                                    <button
                                        key={wallet}
                                        type="button"
                                        onClick={() => handlePresetClick(wallet)}
                                        className={`w-1/2 py-3.5 text-center font-bold text-sm rounded-xl border transition-all ${
                                            details.walletName === wallet
                                                ? 'bg-primary/20 text-primary border-primary/40 shadow-lg shadow-primary/5'
                                                : 'bg-[#18181b] text-gray-400 border-white/5 hover:text-white hover:border-gray-600'
                                        }`}
                                    >
                                        {wallet === 'Paymaya' ? 'Maya' : wallet}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Phone Number */}
                        <div className="space-y-2">
                            <label htmlFor="mechanic-wallet-number" className="text-xs font-bold text-gray-400">Account Number (Mobile Phone)</label>
                            <input 
                                id="mechanic-wallet-number"
                                type="tel" 
                                name="accountNumber" 
                                value={details.accountNumber} 
                                onChange={handleInputChange} 
                                placeholder="e.g., 09171234567" 
                                className="w-full px-4 py-3.5 bg-field border border-secondary rounded-xl text-sm font-bold text-white outline-none transition-all placeholder-gray-600 focus:border-primary/50 focus:ring-1 focus:ring-primary/20" 
                            />
                        </div>
                    </>
                )}

                {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold text-center rounded-xl">
                        {error}
                    </div>
                )}
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-white/5 pt-5">
                <button type="button" onClick={onClose} className="bg-[#1E1E1E] text-white font-bold py-3 px-6 rounded-xl hover:bg-gray-800 transition text-sm">Cancel</button>
                <button type="button" onClick={handleSave} className="bg-primary text-white font-bold py-3 px-6 rounded-xl hover:bg-orange-600 transition text-sm shadow-lg shadow-primary/20">Save Details</button>
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
    
    // Fallback to explicitly requested email and phone number if the database values are empty
    const email = contactEmail || 'support@ridersbud.com';
    const phone = contactPhone || '+63 947 9975 969';

    return (
        <Modal title="Help & Support" isOpen={true} onClose={onClose}>
            <div className="space-y-6">
                <div className="text-center">
                    <h3 className="text-lg font-black text-white mb-1">Still need help?</h3>
                    <p className="text-xs text-gray-500">Our support team is available 24/7</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <a
                        href={`mailto:${email}`}
                        className="flex flex-col items-center justify-center gap-2 p-4 bg-[#121212] rounded-xl hover:bg-primary/10 hover:border-primary/30 border border-white/5 transition-all group"
                    >
                        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                        </div>
                        <span className="text-xs font-bold text-white">Email Us</span>
                    </a>
                    <a
                        href={`tel:${phone.replace(/\s+/g, '')}`}
                        className="flex flex-col items-center justify-center gap-2 p-4 bg-[#121212] rounded-xl hover:bg-primary/10 hover:border-primary/30 border border-white/5 transition-all group"
                    >
                        <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-400 group-hover:scale-110 transition-transform">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                        </div>
                        <span className="text-xs font-bold text-white">Call Us</span>
                    </a>
                </div>

                <button 
                    onClick={() => { navigate('/mechanic-portal/support-chat'); onClose(); }}
                    className="w-full flex items-center justify-center gap-2 p-4 bg-primary rounded-xl hover:bg-orange-600 transition-colors shadow-lg shadow-primary/20 group"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    <span className="text-sm font-bold text-white">Start Live Chat</span>
                </button>

                <div className="bg-[#1A1A1A] p-4 rounded-xl border border-white/5 flex items-center gap-3 text-xs leading-relaxed text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-500 shrink-0"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                    <a href="https://maps.app.goo.gl/SiwnU4GKyUCM4ThQ7" target="_blank" rel="noopener noreferrer" className="hover:text-white hover:underline transition-colors">
                        Unit 3201-C Tektite East Tower, Ortigas Center, Pasig City, Philippines 1605
                    </a>
                </div>

                <button onClick={() => { navigate('/customer-portal/faq'); onClose(); }} className="w-full bg-[#1A1A1A] border border-white/10 text-white font-bold py-3 rounded-xl hover:bg-white/5 transition-colors text-sm tracking-wide">
                    View FAQ
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
    const [isUploading, setIsUploading] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'businessLicenseUrl' | 'certification', index?: number) => {
        const file = e.target.files?.[0];
        if (!file || !mechanic) return;

        setIsUploading(true);
        try {
            const isPdf = file.type === 'application/pdf';
            const url = await storageService.uploadFile(`mechanics/${mechanic.id}/legal/${fieldName}_${Date.now()}.${isPdf ? 'pdf' : 'jpg'}`, file, !isPdf);
            
            if (fieldName === 'businessLicenseUrl') {
                setFormData(prev => ({ ...prev, businessLicenseUrl: url }));
            } else if (fieldName === 'certification' && index !== undefined) {
                handleCertChange(index, 'fileUrl', url);
            }
        } catch (error) {
            console.error("Legal Doc Upload Error:", error);
            alert('File upload failed. Please try again.');
        } finally {
            setIsUploading(false);
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
            {isUploading && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-[100] flex flex-col items-center justify-center rounded-3xl">
                    <Spinner />
                    <p className="text-white mt-4 font-bold animate-pulse">Uploading Document...</p>
                </div>
            )}
            <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                <div>
                    <h3 className="text-lg font-bold mb-2">Business License</h3>
                    <input type="file" id="business-license" name="businessLicense" accept="image/*,application/pdf" onChange={(e) => handleFileChange(e, 'businessLicenseUrl')} className="w-full text-sm text-light-gray file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
                    {formData.businessLicenseUrl && <a href={formData.businessLicenseUrl} target="_blank" rel="noreferrer" className="text-blue-400 text-sm hover:underline mt-2 inline-block">View Current License</a>}
                </div>

                <div className="border-t border-field pt-4">
                    <h3 className="text-lg font-bold mb-2">Certifications</h3>
                    <div className="space-y-3">
                        {formData.certifications?.map((cert, index) => (
                            <div key={index} className="bg-field p-3 rounded-md space-y-2 relative">
                                <button onClick={() => handleRemoveCert(index)} className="absolute top-2 right-2 text-red-400 hover:text-red-300 text-xl">&times;</button>
                                <input type="text" name={`cert-name-${index}`} value={cert.name} onChange={(e) => handleCertChange(index, 'name', e.target.value)} placeholder="Certification Name" className="w-full p-2 bg-dark-gray border border-secondary rounded-md text-sm outline-none transition-all focus:border-white/20" />
                                <input type="file" name={`cert-file-${index}`} onChange={(e) => handleFileChange(e, 'certification', index)} className="w-full text-xs text-light-gray file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary" />
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
                                <input type="text" name={`ins-type-${index}`} value={ins.type} onChange={(e) => handleInsuranceChange(index, 'type', e.target.value)} placeholder="Insurance Type (e.g., General Liability)" className="w-full p-2 bg-dark-gray border border-secondary rounded-md text-sm outline-none transition-all focus:border-white/20" />
                                <input type="text" name={`ins-provider-${index}`} value={ins.provider} onChange={(e) => handleInsuranceChange(index, 'provider', e.target.value)} placeholder="Provider (e.g., AXA)" className="w-full p-2 bg-dark-gray border border-secondary rounded-md text-sm outline-none transition-all focus:border-white/20" />
                                <input type="text" name={`ins-policy-${index}`} value={ins.policyNumber} onChange={(e) => handleInsuranceChange(index, 'policyNumber', e.target.value)} placeholder="Policy Number" className="w-full p-2 bg-dark-gray border border-secondary rounded-md text-sm outline-none transition-all focus:border-white/20" />
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
const MechanicToggleSwitch: React.FC<{
    label: string;
    description: string;
    enabled: boolean;
    onChange: (enabled: boolean) => void;
    id: string;
}> = ({ label, description, enabled, onChange, id }) => (
    <div className="flex items-center justify-between bg-[#1A1A1A] border border-white/5 p-4 rounded-xl transition-colors hover:border-white/10">
        <div className="pr-4 flex-1 min-w-0">
            <h4 className="font-bold text-white text-xs mb-0.5">{label}</h4>
            <p className="text-[10px] text-gray-500 leading-snug">{description}</p>
        </div>
        <button
            id={id}
            type="button"
            role="switch"
            aria-checked={enabled}
            className={`${enabled ? 'bg-primary' : 'bg-[#333]'} relative inline-flex flex-shrink-0 items-center rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-primary/50`}
            style={{ width: '44px', height: '24px' }}
            onClick={() => onChange(!enabled)}
        >
            <span
                className="absolute rounded-full bg-white transition-all duration-200 shadow-sm shrink-0"
                style={{
                    width: '16px',
                    height: '16px',
                    top: '4px',
                    left: enabled ? '24px' : '4px'
                }}
            />
        </button>
    </div>
);

interface ExtendedMechanic extends Mechanic {
    notificationSettings?: MechanicNotificationSettings;
}

const MechanicNotificationSettingsModal: React.FC<{
    user: any;
    onClose: () => void;
    onSave: (settings: MechanicNotificationSettings) => Promise<void>;
}> = ({ user, onClose, onSave }) => {
    const [settings, setSettings] = useState<MechanicNotificationSettings>(() => {
        const mech = user as ExtendedMechanic;
        if (mech?.notificationSettings) {
            return { ...getMechanicNotificationSettings(), ...mech.notificationSettings };
        }
        return getMechanicNotificationSettings();
    });

    const webNotifSupported = hasNotificationAPI();
    const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(getNotificationPermission);
    const [isSaving, setIsSaving] = useState(false);
    const [savedFlash, setSavedFlash] = useState(false);
    const [activeTab, setActiveTab] = useState<'alerts' | 'dnd' | 'audio'>('alerts');
    const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    // Auto-save with debounce
    useEffect(() => {
        const save = async () => {
            setIsSaving(true);
            try {
                saveMechanicNotificationSettings(settings);
                await onSave(settings);
                setSavedFlash(true);
                setTimeout(() => setSavedFlash(false), 2000);
            } catch (error) {
                console.error('Failed to save mechanic settings:', error);
            } finally {
                setIsSaving(false);
            }
        };

        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(save, 1000);
        return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
    }, [settings]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleSettingChange = (key: keyof MechanicNotificationSettings, value: any) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleRequestPermission = async () => {
        const result = await requestNotificationPermission();
        setPermissionStatus(result);
    };

    const playSynthSound = (theme: 'engine' | 'brake' | 'chime') => {
        try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            if (theme === 'chime') {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(880, audioCtx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.15);
                gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
                osc.start(audioCtx.currentTime);
                osc.stop(audioCtx.currentTime + 0.35);
            } else if (theme === 'engine') {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(60, audioCtx.currentTime);
                osc.frequency.linearRampToValueAtTime(220, audioCtx.currentTime + 0.15);
                osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.4);
                gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.45);
                osc.start(audioCtx.currentTime);
                osc.stop(audioCtx.currentTime + 0.5);
            } else if (theme === 'brake') {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(3000, audioCtx.currentTime);
                osc.frequency.linearRampToValueAtTime(2500, audioCtx.currentTime + 0.25);
                gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
                osc.start(audioCtx.currentTime);
                osc.stop(audioCtx.currentTime + 0.35);
            }
        } catch (e) {
            console.error('Audio synthesis failed', e);
        }
    };

    const handleTestNotification = () => {
        if (settings.soundEnabled) {
            playSynthSound(settings.soundTheme);
        }
        if (webNotifSupported && permissionStatus === 'granted') {
            showNotification('RidersBUD Mechanic Alert', {
                body: 'New job alert simulated successfully. Connection is fully working.',
                tag: 'ridersbud-mech-test',
            });
        } else {
            alert('Mechanic Test Alert Triggered!\n(Engine/Chime HUD sound simulated successfully)');
        }
    };

    return (
        <Modal title="Mechanic Notification Hub" isOpen={true} onClose={onClose}>
            {/* Tab navigation */}
            <div className="flex border-b border-white/5 mb-6">
                {(['alerts', 'dnd', 'audio'] as const).map(tab => (
                    <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 pb-3 text-xs font-black uppercase tracking-wider transition-colors border-b-2 text-center ${activeTab === tab ? 'text-primary border-primary' : 'text-gray-500 border-transparent hover:text-white'}`}
                    >
                        {tab === 'alerts' ? 'Job Alerts' : tab === 'dnd' ? 'Off-Duty / DND' : 'Alert Sound / Push'}
                    </button>
                ))}
            </div>

            <div className="space-y-6">
                {activeTab === 'alerts' && (
                    <div className="space-y-4">
                        <MechanicToggleSwitch
                            id="modal-toggle-new-job"
                            label="New Job Alerts"
                            description="Get notified when a new, unassigned job is posted near you."
                            enabled={settings.newJobAlerts}
                            onChange={(v) => handleSettingChange('newJobAlerts', v)}
                        />
                        <MechanicToggleSwitch
                            id="modal-toggle-job-status"
                            label="Job Status Changes"
                            description="Receive alerts when a customer cancels or modifies a job you've accepted."
                            enabled={settings.jobStatusChanges}
                            onChange={(v) => handleSettingChange('jobStatusChanges', v)}
                        />
                        <MechanicToggleSwitch
                            id="modal-toggle-payment-confirm"
                            label="Payment Confirmations"
                            description="Get notified when a payment for a completed job has been processed."
                            enabled={settings.paymentConfirmations}
                            onChange={(v) => handleSettingChange('paymentConfirmations', v)}
                        />

                        {/* Job Radius range dropdown */}
                        <div className="bg-[#1A1A1A] p-4 rounded-xl border border-white/5">
                            <label htmlFor="modal-job-radius" className="block text-xs font-bold text-gray-400 mb-2">
                                Max Job Dispatch Distance
                            </label>
                            <div className="relative">
                                <select
                                    id="modal-job-radius"
                                    value={settings.maxJobDistance ?? 'any'}
                                    onChange={(e) => handleSettingChange('maxJobDistance', e.target.value)}
                                    className="w-full px-4 py-3 bg-[#121212] border border-white/10 rounded-xl text-white focus:outline-none focus:border-primary/50 transition-all text-xs"
                                >
                                    <option value="5km">Within 5 Kilometers</option>
                                    <option value="15km">Within 15 Kilometers</option>
                                    <option value="30km">Within 30 Kilometers</option>
                                    <option value="any">Anywhere / No Limits</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'dnd' && (
                    <div className="space-y-4">
                        <MechanicToggleSwitch
                            id="modal-toggle-quiet-hours"
                            label="Off-Duty DND Mode"
                            description="Block all dispatched notifications when you are off-duty."
                            enabled={settings.quietHoursEnabled || false}
                            onChange={(v) => handleSettingChange('quietHoursEnabled', v)}
                        />

                        {settings.quietHoursEnabled && (
                            <div className="grid grid-cols-2 gap-3 p-4 bg-[#1A1A1A] rounded-xl border border-white/5 animate-fadeIn">
                                <div>
                                    <label htmlFor="quiet-hours-start" className="block text-[10px] font-bold text-gray-500 uppercase mb-2">Start Muting</label>
                                    <input
                                        id="quiet-hours-start"
                                        type="time"
                                        value={settings.quietHoursStart || '22:00'}
                                        onChange={(e) => handleSettingChange('quietHoursStart', e.target.value)}
                                        className="w-full bg-[#121212] border border-white/10 rounded-xl py-2 px-3 text-white text-xs outline-none focus:border-primary"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="quiet-hours-end" className="block text-[10px] font-bold text-gray-500 uppercase mb-2">End Muting</label>
                                    <input
                                        id="quiet-hours-end"
                                        type="time"
                                        value={settings.quietHoursEnd || '07:00'}
                                        onChange={(e) => handleSettingChange('quietHoursEnd', e.target.value)}
                                        className="w-full bg-[#121212] border border-white/10 rounded-xl py-2 px-3 text-white text-xs outline-none focus:border-primary"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'audio' && (
                    <div className="space-y-4">
                        <div className="bg-[#1A1A1A] p-4 rounded-xl border border-white/5 space-y-4">
                            <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                                <Volume2 size={16} className="text-primary" /> Warning Audio Themes
                            </h4>
                            <MechanicToggleSwitch
                                id="modal-toggle-sounds"
                                label="Alert Sound Effects"
                                description="Play custom sounds when jobs are dispatched or updated."
                                enabled={settings.soundEnabled ?? true}
                                onChange={(v) => handleSettingChange('soundEnabled', v)}
                            />

                            {settings.soundEnabled && (
                                <div className="flex gap-2 items-end animate-fadeIn">
                                    <div className="flex-1">
                                        <label htmlFor="sound-theme" className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Alert Sound</label>
                                        <select
                                            id="sound-theme"
                                            value={settings.soundTheme ?? 'chime'}
                                            onChange={(e) => {
                                                const newTheme = e.target.value as 'engine' | 'brake' | 'chime';
                                                handleSettingChange('soundTheme', newTheme);
                                                playSynthSound(newTheme);
                                            }}
                                            className="w-full px-3 py-2 bg-[#121212] border border-white/10 rounded-xl text-white appearance-none focus:outline-none focus:border-primary/50 text-xs"
                                        >
                                            <option value="chime">HUD Digital Chime</option>
                                            <option value="engine">Engine Crank Synth</option>
                                            <option value="brake">Squeal Brake Alert</option>
                                        </select>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => playSynthSound(settings.soundTheme ?? 'chime')}
                                        className="py-2.5 px-4 bg-[#252525] hover:bg-white/10 text-white rounded-xl font-bold text-xs border border-white/5 transition-all"
                                    >
                                        Test
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Push Notification Panel */}
                        <div className="bg-[#1A1A1A] p-4 rounded-xl border border-white/5">
                            <h4 className="text-xs font-black text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                                <Smartphone size={16} className="text-primary" /> Browser Alerts
                            </h4>
                            {webNotifSupported ? (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between bg-[#121212] p-3 rounded-xl border border-white/5">
                                        <div className="flex items-center gap-2.5">
                                            <div className={`w-3.5 h-3.5 rounded-full ${permissionStatus === 'granted' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                                            <div>
                                                <p className="text-xs font-bold text-white">
                                                    {permissionStatus === 'granted' ? 'System Enabled' : 'Action Required'}
                                                </p>
                                                <p className="text-[10px] text-gray-500 mt-0.5">
                                                    {permissionStatus === 'granted' ? 'Receive background alerts' : 'Push notifications blocked'}
                                                </p>
                                            </div>
                                        </div>
                                        {permissionStatus === 'default' && (
                                            <button
                                                type="button"
                                                onClick={handleRequestPermission}
                                                className="px-3 py-1.5 bg-primary text-white text-[10px] font-black uppercase tracking-wider rounded-lg hover:bg-orange-600 transition-colors"
                                            >
                                                Grant
                                            </button>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleTestNotification}
                                        className="w-full flex items-center justify-center gap-2 py-3 bg-[#1E1E1E] hover:bg-white/5 text-white font-bold text-xs rounded-xl border border-white/5 transition-colors"
                                    >
                                        <Sparkles size={14} className="text-primary" /> Dispatch Test Alert
                                    </button>
                                </div>
                            ) : (
                                <p className="text-[11px] leading-relaxed text-gray-500">
                                    Mobile status is managed through OS settings.
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                    {isSaving ? (
                        <span className="text-primary animate-pulse font-bold">Saving settings...</span>
                    ) : savedFlash ? (
                        <span className="text-green-400 font-bold flex items-center gap-1"><CheckCircle size={11} /> Saved successfully</span>
                    ) : (
                        <span>Auto-saves changes automatically</span>
                    )}
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="py-2.5 px-6 bg-primary text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-primary/25 hover:bg-orange-600 transition-colors"
                >
                    Done
                </button>
            </div>
        </Modal>
    );
};

// --- Main Screen Component ---
const MechanicProfileManagementScreen: React.FC = () => {
    const { mechanic, logout, loading, updateMechanicProfile } = useMechanicAuth();
    const { db, updateMechanicNotificationSettings } = useDatabase();
    const [activeModal, setActiveModal] = useState<string | null>(null);
    const [previousModal, setPreviousModal] = useState<string | null>(null);
    const navigate = useNavigate();

    const { totalJobs, lifetimeEarnings, availableForPayout } = useMemo(() => {
        if (!mechanic || !db) return { totalJobs: 0, lifetimeEarnings: 0, availableForPayout: 0 };

        const completedJobs = db.bookings.filter(b => 
            (b.mechanic?.id === mechanic.id || b.mechanicId === mechanic.id) && 
            b.status === 'Completed'
        );
        
        // Sum prices from completed jobs as robust real-time fallback
        const calculatedEarnings = completedJobs.reduce((sum, job) => sum + (job.service?.price || job.services?.[0]?.price || 0), 0);
        
        const grossEarnings = mechanic.totalEarnings || calculatedEarnings;

        const approvedPayoutsAmount = db.payouts
            .filter((p: any) => p.mechanicId === mechanic.id && (p.status === 'Approved' || p.status === 'Paid' || p.status === 'Completed'))
            .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
            
        const lifetimeEarnings = Math.max(0, grossEarnings - approvedPayoutsAmount);
        const availableForPayout = mechanic.walletBalance || 0;

        return {
            totalJobs: completedJobs.length,
            lifetimeEarnings,
            availableForPayout,
        };
    }, [db.bookings, db.payouts, mechanic.totalEarnings, mechanic.walletBalance, mechanic.id]);

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
        if (previousModal) {
            setActiveModal(previousModal);
            setPreviousModal(null);
        } else {
            setActiveModal(null);
        }
    };

    return (
        <div className="flex flex-col h-full bg-secondary">
            {/* Header */}
            {/* Header */}
            <Header
                title="My Profile"
                rightAction={<NotificationBell />}
                icon={<User size={22} />}
            />

            <div className="flex-grow p-4 sm:p-8 space-y-8 overflow-y-auto pb-10">
                {/* Profile Card */}
                <div className="bg-gradient-to-br from-[#1A1A1A] to-[#121212] rounded-[2.5rem] p-6 border border-white/5 shadow-2xl flex items-center gap-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[50px] rounded-full translate-x-10 -translate-y-10 group-hover:bg-primary/20 transition-all duration-700"></div>
                    <div className="relative shrink-0">
                        <img src={mechanic.imageUrl} alt={mechanic.name} className="w-20 sm:w-24 h-20 sm:h-24 rounded-3xl object-cover border-4 border-white/5 shadow-2xl group-hover:scale-105 transition-transform duration-500" />
                        {mechanic.verificationDocuments?.verificationStatus === 'approved' && (
                            <div className="absolute -bottom-2 -right-2 bg-green-500 text-white p-1.5 rounded-xl shadow-lg border-2 border-[#121212]">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                            </div>
                        )}
                    </div>
                    <div className="relative z-10 min-w-0">
                        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tighter leading-none truncate">{mechanic.name}</h2>
                        <p className="text-[10px] sm:text-xs text-gray-500 font-bold  tracking-widest mt-1 opacity-70 truncate">{mechanic.email}</p>
                        {mechanic.registrationDate && (
                            <div className="flex items-center gap-1.5 mt-3 opacity-50">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                <p className="text-[9px] font-black  tracking-widest">Since {new Date(mechanic.registrationDate.replace(/-/g, '/')).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* KPI Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-[10px] font-black text-gray-500  tracking-[0.3em]">Performance Snapshot</h3>
                        <div className="w-1.5 h-1.5 bg-primary rounded-full animate-ping"></div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 sm:gap-6">
                        <StatCard
                            title="Total Jobs"
                            value={totalJobs}
                            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6-6H3.5A2.5 2.5 0 001 4.5v15A2.5 2.5 0 003.5 22h17a2.5 2.5 0 002.5-2.5v-15A2.5 2.5 0 0020.5 2H15" /></svg>}
                        />
                        <StatCard
                            title="Earnings"
                            value={lifetimeEarnings >= 10000 ? `₱${(lifetimeEarnings / 1000).toFixed(1)}k` : `₱${lifetimeEarnings.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
                            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
                            color="text-green-400"
                        />
                        <StatCard
                            title="Rating"
                            value={(mechanic.rating || 0).toFixed(1)}
                            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 15.27L16.18 19l-1.64-7.03L20 7.24l-7.19-.61L10 0 7.19 6.63 0 7.24l5.46 4.73L3.82 19z" /></svg>}
                            color="text-orange-400"
                        />
                    </div>
                </div>

                {/* Menu Section */}
                <div className="bg-[#1A1A1A] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                    <MenuItem 
                        label="Edit Profile Details" 
                        subtitle="Update name, contact info, and specialized skills"
                        onClick={() => setActiveModal('profile')} 
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>} 
                    />
                    <MenuItem 
                        label="My Reviews" 
                        subtitle="View customer feedback and ratings log"
                        badge={
                            <span className="text-[10px] bg-yellow-500/10 text-yellow-500 font-extrabold border border-yellow-500/20 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                                <Star size={10} className="fill-yellow-500 text-yellow-500" />
                                {(mechanic.rating || 0).toFixed(1)}
                            </span>
                        }
                        onClick={() => setActiveModal('reviews')} 
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>} 
                    />
                    <MenuItem 
                        label="My Weekly Availability" 
                        subtitle="Set default working days and hours schema"
                        onClick={() => setActiveModal('availability')} 
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>} 
                    />
                    <MenuItem 
                        label="Set Time Off" 
                        subtitle="Schedule upcoming holiday leaves or time off"
                        onClick={() => setActiveModal('timeOff')} 
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>} 
                    />
                    <MenuItem 
                        label="Request Payout" 
                        subtitle="Withdraw wallet earnings directly to payout method"
                        badge={
                            <span className="text-[10px] bg-green-500/10 text-green-400 font-extrabold border border-green-500/20 px-2.5 py-0.5 rounded-full">
                                ₱{availableForPayout.toLocaleString()}
                            </span>
                        }
                        onClick={() => setActiveModal('payoutRequest')} 
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M4 10a2 2 0 002-2V4.414l1.586 1.586a1 1 0 001.414-1.414l-4-4a1 1 0 00-1.414 0l-4 4a1 1 0 101.414 1.414L5 4.414V8a2 2 0 002 2zM14 10a2 2 0 00-2 2v3.586l-1.586-1.586a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0l4-4a1 1 0 00-1.414-1.414L15 15.586V12a2 2 0 00-2-2z" /></svg>} 
                    />
                    <MenuItem 
                        label="Payout Details" 
                        subtitle="Manage GCash details, account info, and routing"
                        onClick={() => setActiveModal('payouts')} 
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" /><path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" /></svg>} 
                    />
                    <MenuItem 
                        label="Legal & Insurance" 
                        subtitle="Certifications, government verification status, and insurance"
                        badge={
                            <span className="text-[9px] bg-green-500/15 text-green-400 font-black border border-green-500/25 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                {mechanic.verificationDocuments?.verificationStatus || 'Pending'}
                            </span>
                        }
                        onClick={() => setActiveModal('legal')} 
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h2a2 2 0 002-2V4a2 2 0 00-2-2H9z" /><path d="M4 12a2 2 0 012-2h10a2 2 0 012 2v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5z" /></svg>} 
                    />
                    <MenuItem 
                        label="Notification Settings" 
                        subtitle="Configure in-app alert schema and notification channels"
                        onClick={() => setActiveModal('notifications')} 
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" /></svg>} 
                    />
                    <MenuItem 
                        label="Help & Support" 
                        subtitle="Access RidersBUD FAQ and support agent direct links"
                        onClick={() => setActiveModal('support')} 
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>} 
                    />
                    <MenuItem 
                        label="Change Password" 
                        subtitle="Update account password and security credentials"
                        onClick={() => setActiveModal('password')} 
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd" /></svg>} 
                    />
                    <MenuItem 
                        label="Logout" 
                        subtitle="Log out of active session securely"
                        onClick={logout} 
                        variant="danger" 
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>} 
                    />
                </div>
            </div>

            {activeModal === 'profile' && <ProfileDetailsModal mechanic={mechanic} onClose={() => setActiveModal(null)} onSave={handleProfileSave} />}
            {activeModal === 'availability' && <AvailabilityEditorModal availability={mechanic.availability} onClose={() => setActiveModal(null)} onSave={handleAvailabilitySave} />}
            {activeModal === 'timeOff' && <TimeOffModal unavailableDates={mechanic.unavailableDates || []} onClose={() => setActiveModal(null)} onSave={handleTimeOffSave} />}
            {activeModal === 'password' && <ChangePasswordModal currentPass={mechanic.password} onClose={() => setActiveModal(null)} onSave={handlePasswordSave} />}
            {activeModal === 'reviews' && <ReviewsModal reviews={mechanic.reviewsList || []} onClose={() => setActiveModal(null)} />}
            {activeModal === 'payoutRequest' && (
                <PayoutRequestModal 
                    mechanic={mechanic} 
                    availableBalance={availableForPayout} 
                    onClose={() => setActiveModal(null)} 
                    onEditPayoutDetails={() => {
                        setPreviousModal('payoutRequest');
                        setActiveModal('payouts');
                    }} 
                />
            )}
            {activeModal === 'payouts' && (
                <PayoutDetailsModal 
                    payoutDetails={mechanic.payoutDetails} 
                    onClose={() => {
                        if (previousModal) {
                            setActiveModal(previousModal);
                            setPreviousModal(null);
                        } else {
                            setActiveModal(null);
                        }
                    }} 
                    onSave={handlePayoutDetailsSave} 
                />
            )}
            {activeModal === 'support' && <HelpSupportModal contactEmail={db.settings.contactEmail} contactPhone={db.settings.contactPhone} onClose={() => setActiveModal(null)} />}
            {activeModal === 'legal' && <LegalDocsModal mechanic={mechanic} onClose={() => setActiveModal(null)} onSave={handleProfileSave} />}
            {activeModal === 'notifications' && mechanic && <MechanicNotificationSettingsModal user={mechanic} onClose={() => setActiveModal(null)} onSave={(s) => updateMechanicNotificationSettings(mechanic.id, s)} />}
        </div>
    );
};

export default MechanicProfileManagementScreen;
