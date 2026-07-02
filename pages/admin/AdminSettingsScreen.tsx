import React, { useState, useEffect } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { useNotification } from '../../context/NotificationContext';
import { Settings } from '../../types';
import Spinner from '../../components/Spinner';
import { storageService } from '../../services/StorageService';
import { sendEmail } from '../../services/emailService';
import {
    Save, Globe, Clock, DollarSign, Bell, Shield, Upload, Image as ImageIcon,
    Layout, Smartphone, Wrench, CreditCard, Mail, FileCheck, Plus, Trash2, User,
    AlertTriangle, Check, RefreshCw, Facebook, Twitter, Instagram, ChevronRight, MessageSquare, HelpCircle
} from 'lucide-react';

type SettingsTab = 'general' | 'appearance' | 'bookings' | 'financials' | 'notifications' | 'system' | 'verification' | 'support';

interface TabConfig {
    id: SettingsTab;
    label: string;
    icon: React.ReactNode;
    description: string;
}

const tabs: TabConfig[] = [
    { id: 'general', label: 'General', icon: <Globe size={18} />, description: 'App identity & contacts' },
    { id: 'appearance', label: 'Appearance', icon: <Layout size={18} />, description: 'Logos & Branding' },
    { id: 'bookings', label: 'Operations', icon: <Clock size={18} />, description: 'Booking logic & mechanics' },
    { id: 'financials', label: 'Financials', icon: <DollarSign size={18} />, description: 'Currency, fees & HitPay' },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={18} />, description: 'Email alerts & preferences' },
    { id: 'verification', label: 'Verification', icon: <FileCheck size={18} />, description: 'Mechanic onboard docs' },
    { id: 'support', label: 'Support', icon: <MessageSquare size={18} />, description: 'Live Chat & FAQ' },
    { id: 'system', label: 'System', icon: <Shield size={18} />, description: 'Maintenance & configuration' },
];

const AdminSettingsScreen: React.FC = () => {
    const { db, updateSettings, loading } = useDatabase();
    const { addNotification } = useNotification();

    const [activeTab, setActiveTab] = useState<SettingsTab>('general');
    const [localSettings, setLocalSettings] = useState<Settings | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [showLiveApiKey, setShowLiveApiKey] = useState(false);
    const [showLiveSalt, setShowLiveSalt] = useState(false);
    const [showSandboxApiKey, setShowSandboxApiKey] = useState(false);
    const [showSandboxSalt, setShowSandboxSalt] = useState(false);
    
    const [showSmtpPassword, setShowSmtpPassword] = useState(false);
    const [isTestingSmtp, setIsTestingSmtp] = useState(false);
    const [smtpTestResult, setSmtpTestResult] = useState<{success: boolean, message: string} | null>(null);

    useEffect(() => {
        if (db?.settings) {
            setLocalSettings(current => {
                // Initial load: set local settings to DB settings
                if (!current) return db.settings;
                // If user has unsaved changes, don't overwrite them with DB updates
                if (hasChanges) return current;
                // Otherwise, keep synchronized with DB
                return db.settings;
            });
        }
    }, [db?.settings, hasChanges]);

    const handleInputChange = (field: keyof Settings, value: any) => {
        if (!localSettings) return;
        setLocalSettings(prev => prev ? { ...prev, [field]: value } : null);
        setHasChanges(true); // Keep this for "manual" save button if needed, although we do realtime for images
    };

    const handleSocialChange = (network: 'facebook' | 'twitter' | 'instagram', value: string) => {
        if (!localSettings) return;
        setLocalSettings(prev => prev ? {
            ...prev,
            socialLinks: { ...(prev.socialLinks || {}), [network]: value }
        } : null);
        setHasChanges(true);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: keyof Settings) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                // Upload image to Firebase Storage
                const downloadUrl = await storageService.uploadFile(`settings/${field}_${Date.now()}_${file.name}`, file);

                // Update local state for immediate visual feedback
                setLocalSettings(prev => prev ? { ...prev, [field]: downloadUrl } : null);

                // Realtime Save: Persist the image immediately as requested
                await updateSettings({ [field]: downloadUrl });

                addNotification({
                    type: 'success',
                    title: 'Asset Optimized & Saved',
                    message: 'Branding asset has been updated live.',
                    recipientId: 'admin',
                });
            } catch (error: any) {
                console.error("Branding asset upload failed:", error);
                addNotification({
                    type: 'error',
                    title: 'Upload Failed',
                    message: error?.message || 'Failed to process or save the image.',
                    recipientId: 'admin',
                });
            }
        }
    };

    const handleTestSmtp = async () => {
        if (!localSettings) return;
        setIsTestingSmtp(true);
        setSmtpTestResult(null);
        try {
            const success = await sendEmail(
                localSettings.contactEmail || 'admin@ridersbud.com',
                'Test Email from RidersBUD',
                'This is a test email to verify your SMTP configuration is working correctly.',
                localSettings
            );
            if (success) {
                setSmtpTestResult({ success: true, message: 'Test email sent successfully!' });
                addNotification('Success', 'Test email sent successfully.', 'success');
            } else {
                setSmtpTestResult({ success: false, message: 'Failed to send test email. Please check your settings.' });
                addNotification('Error', 'Failed to send test email.', 'error');
            }
        } catch (error: any) {
            setSmtpTestResult({ success: false, message: error.message || 'An error occurred while sending the email.' });
            addNotification('Error', 'An error occurred while sending test email.', 'error');
        } finally {
            setIsTestingSmtp(false);
        }
    };

    const handleSave = async () => {
        if (!localSettings) return;
        setIsSaving(true);
        try {
            await updateSettings(localSettings);
            addNotification({
                type: 'success',
                title: 'Settings Saved',
                message: 'System configuration has been updated successfully.',
                recipientId: 'admin',
            });
            setHasChanges(false);
        } catch (error: any) {
            console.error("ACTUAL DATABASE ERROR:", error);
            addNotification({
                type: 'error',
                title: 'Save Failed',
                message: error?.message || 'Failed to save settings. Please try again.',
                recipientId: 'admin',
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleRequirementChange = (index: number, field: string, value: any) => {
        if (!localSettings) return;
        const currentReqs = localSettings.verificationRequirements || [];
        const newReqs = [...currentReqs];
        newReqs[index] = { ...newReqs[index], [field]: value };
        setLocalSettings({ ...localSettings, verificationRequirements: newReqs });
        setHasChanges(true);
    };

    const addRequirement = () => {
        if (!localSettings) return;
        const newReq = { id: `doc_${Date.now()}`, label: 'New Document', description: 'Upload a PDF or Image', isRequired: true };
        const newReqs = localSettings.verificationRequirements ? [...localSettings.verificationRequirements, newReq] : [newReq];
        setLocalSettings({ ...localSettings, verificationRequirements: newReqs });
        setHasChanges(true);
    };

    const removeRequirement = (index: number) => {
        if (!localSettings) return;
        const currentReqs = localSettings.verificationRequirements || [];
        const newReqs = currentReqs.filter((_, i) => i !== index);
        setLocalSettings({ ...localSettings, verificationRequirements: newReqs });
        setHasChanges(true);
    };

    const handleFAQChange = (index: number, field: string, value: any) => {
        if (!localSettings) return;
        const currentFaqs = localSettings.faqs || [];
        const newFaqs = [...currentFaqs];
        newFaqs[index] = { ...newFaqs[index], [field]: value };
        setLocalSettings({ ...localSettings, faqs: newFaqs });
        setHasChanges(true);
    };

    const addFAQ = () => {
        if (!localSettings) return;
        const newFAQ = { id: `faq_${Date.now()}`, question: 'Question?', answer: 'Answer here...', category: 'General' };
        const newFaqs = localSettings.faqs ? [...localSettings.faqs, newFAQ] : [newFAQ];
        setLocalSettings({ ...localSettings, faqs: newFaqs });
        setHasChanges(true);
    };

    const removeFAQ = (index: number) => {
        if (!localSettings) return;
        const currentFaqs = localSettings.faqs || [];
        const newFaqs = currentFaqs.filter((_, i) => i !== index);
        setLocalSettings({ ...localSettings, faqs: newFaqs });
        setHasChanges(true);
    };

    if (loading || !localSettings) {
        return <div className="flex items-center justify-center h-full"><Spinner size="lg" color="text-white" /></div>;
    }

    const renderInput = (label: string, field: keyof Settings, type: string = 'text', placeholder?: string, description?: string) => (
        <div className="space-y-2">
            <label className="text-[10px]  tracking-widest font-black text-gray-500 ml-1 block">{label}</label>
            <input
                type={type}
                value={localSettings[field] as string || ''}
                onChange={(e) => handleInputChange(field, type === 'number' ? Number(e.target.value) : e.target.value)}
                placeholder={placeholder}
                className="w-full bg-[#121212] border border-white/10 rounded-2xl px-5 py-4 text-white outline-none transition-all placeholder-gray-700 font-bold text-sm"
            />
            {description && <p className="text-[10px] text-gray-500 font-medium ml-1">{description}</p>}
        </div>
    );

    const renderSwitch = (label: string, field: keyof Settings, description: string) => (
        <div className="flex items-center justify-between p-6 bg-[#121212] rounded-3xl border border-white/5 group hover:border-white/10 transition-all">
            <div>
                <h4 className="font-bold text-white text-sm  tracking-wide group-hover:text-primary transition-colors">{label}</h4>
                <p className="text-xs text-gray-500 mt-1">{description}</p>
            </div>
            <button
                onClick={() => handleInputChange(field, !localSettings[field])}
                className={`relative w-14 h-8 rounded-full transition-all duration-300 ease-out border-2 ${localSettings[field] ? 'bg-primary/20 border-primary' : 'bg-transparent border-gray-700'}`}
            >
                <span className={`absolute top-1 left-1 w-5 h-5 rounded-full transition-all duration-300 shadow-sm ${localSettings[field] ? 'translate-x-6 bg-primary shadow-[0_0_10px_rgba(249,115,22,0.5)]' : 'translate-x-0 bg-gray-500'}`} />
            </button>
        </div>
    );

    const handleRemoveLogo = async (field: keyof Settings) => {
        if (!localSettings) return;

        const confirmDelete = window.confirm('Are you sure you want to remove this logo? This action cannot be undone.');
        if (!confirmDelete) return;

        try {
            // Update local state
            setLocalSettings(prev => prev ? { ...prev, [field]: '' } : null);

            // Persist the removal immediately
            await updateSettings({ [field]: '' });

            addNotification({
                type: 'success',
                title: 'Logo Removed',
                message: 'The branding asset has been removed successfully.',
                recipientId: 'admin',
            });
        } catch (error: any) {
            console.error("Logo removal failed:", error);
            addNotification({
                type: 'error',
                title: 'Removal Failed',
                message: error?.message || 'Failed to remove the logo.',
                recipientId: 'admin',
            });
        }
    };

    const renderImageUpload = (label: string, field: keyof Settings, description: string) => (
        <div className="space-y-3">
            <label className="text-[10px]  tracking-widest font-black text-gray-500 ml-1 block">{label}</label>
            <div className="p-1 bg-[#121212] border border-white/10 rounded-[2rem] flex items-center gap-6 group hover:border-white/20 transition-all shadow-inner">
                <div className="w-24 h-24 bg-black/40 rounded-[1.5rem] flex items-center justify-center overflow-hidden border border-white/5 relative m-1">
                    {localSettings[field] ? (
                        <>
                            <img
                                src={localSettings[field] as string}
                                alt={label}
                                className="max-w-full max-h-full object-contain p-2 mix-blend-screen"
                            />
                            <button
                                onClick={() => handleRemoveLogo(field)}
                                className="absolute top-1 right-1 p-1.5 bg-red-500/90 hover:bg-red-500 rounded-lg transition-all opacity-0 group-hover:opacity-100 z-10"
                                title="Remove logo"
                            >
                                <Trash2 size={12} className="text-white" />
                            </button>
                        </>
                    ) : (
                        <ImageIcon className="text-gray-700" size={24} />
                    )}
                </div>

                <div className="flex-1 py-4 pr-6">
                    <p className="text-xs text-gray-400 mb-4 leading-relaxed font-medium">{description}</p>
                    <label className="cursor-pointer inline-flex items-center gap-2 px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-[10px]  tracking-widest font-black text-white transition-all hover:scale-105 active:scale-95 text-center">
                        <Upload size={14} className="text-primary" />
                        <span>Upload Asset</span>
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleFileUpload(e, field)}
                        />
                    </label>
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-full space-y-8 animate-fadeIn pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 flex-shrink-0">
                <div>
                    <h1 className="text-5xl font-black text-white tracking-tighter  leading-none">Settings</h1>
                    <div className="flex items-center gap-2 mt-4">
                        <div className="h-1 w-12 bg-primary rounded-full"></div>
                        <p className="text-gray-500 font-bold  tracking-[0.3em] text-[10px]">Configuration</p>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={!hasChanges || isSaving}
                    className={`flex items-center gap-3 px-8 py-5 rounded-[1.5rem] font-black  tracking-widest text-xs transition-all shadow-xl ${hasChanges
                        ? 'bg-primary text-white hover:bg-orange-600 hover:scale-105 shadow-primary/25'
                        : 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/5'
                        }`}
                >
                    {isSaving ? <Spinner size="sm" color="text-white" /> : <Save size={18} />}
                    {hasChanges ? 'Save Changes' : 'No Changes'}
                </button>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 h-full min-h-0">
                {/* Sidebar Navigation */}
                <div className="lg:w-80 flex-shrink-0 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center gap-4 p-5 rounded-[1.5rem] transition-all duration-300 border text-left group relative overflow-hidden ${activeTab === tab.id
                                ? 'bg-primary/10 border-primary/20 text-white shadow-lg shadow-primary/10'
                                : 'bg-[#121212]/40 border-transparent text-gray-500 hover:bg-[#121212]/80 hover:text-gray-200'
                                }`}
                        >
                            <div className={`p-3 rounded-xl transition-colors ${activeTab === tab.id ? 'bg-primary text-white shadow-lg shadow-primary/40' : 'bg-gray-800/50 text-gray-500 group-hover:text-white'}`}>
                                {tab.icon}
                            </div>
                            <div className="z-10 relative">
                                <h3 className={`font-black  tracking-wider text-xs ${activeTab === tab.id ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>{tab.label}</h3>
                                <p className="text-[10px] opacity-60 truncate max-w-[140px] font-medium mt-1">{tab.description}</p>
                            </div>
                            {activeTab === tab.id && (
                                <ChevronRight className="absolute right-4 text-primary opacity-50" size={16} />
                            )}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 bg-[#121212]/60 backdrop-blur-xl border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col p-2">
                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
                        {/* GENERAL SETTINGS */}
                        {activeTab === 'general' && (
                            <div className="space-y-10 animate-fadeIn">
                                <div className="space-y-8">
                                    <h2 className="text-2xl font-black text-white flex items-center gap-3  tracking-tighter">
                                        <Globe className="text-primary" size={24} /> App Identity
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {renderInput('App Name', 'appName', 'text', 'Riders')}
                                        {renderInput('Tagline', 'appTagline', 'text', 'Your trusted companion')}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {renderImageUpload(
                                            'App Logo',
                                            'appLogoUrl',
                                            'Main branding logo used on the website and public pages.'
                                        )}
                                        {renderImageUpload(
                                            'App Favicon',
                                            'faviconUrl',
                                            'The small icon displayed in browser tabs.'
                                        )}
                                    </div>
                                </div>

                                <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                                <div className="space-y-8">
                                    <h2 className="text-2xl font-black text-white flex items-center gap-3  tracking-tighter">
                                        <User className="text-primary" size={24} /> Default Profile Images
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {renderImageUpload(
                                            'Default Customer Image',
                                            'defaultCustomerImageUrl',
                                            'Shown as the default profile picture for new customer accounts.'
                                        )}
                                        {renderImageUpload(
                                            'Default Mechanic Image',
                                            'defaultMechanicImageUrl',
                                            'Shown as the default profile picture for new mechanic accounts.'
                                        )}
                                    </div>
                                </div>

                                <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                                <div className="space-y-8">
                                    <h2 className="text-2xl font-black text-white flex items-center gap-3  tracking-tighter">
                                        <Smartphone className="text-primary" size={24} /> Contact Information
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {renderInput('Contact Email', 'contactEmail', 'email')}
                                        {renderInput('Contact Phone', 'contactPhone', 'tel')}
                                        {renderInput('Support Email', 'supportEmail', 'email')}
                                        {renderInput('Support Phone', 'supportPhone', 'tel')}
                                    </div>
                                    {renderInput('Physical Address', 'address')}
                                </div>

                                <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                                <div className="space-y-8">
                                    <h2 className="text-2xl font-black text-white flex items-center gap-3  tracking-tighter">
                                        <Layout className="text-primary" size={24} /> Social Media
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="space-y-2">
                                            <label htmlFor="social-facebook" className="text-[10px] font-black text-gray-500  tracking-widest flex items-center gap-2"><Facebook size={14} /> Facebook</label>
                                            <input
                                                id="social-facebook"
                                                name="social-facebook"
                                                value={localSettings.socialLinks?.facebook || ''}
                                                onChange={(e) => handleSocialChange('facebook', e.target.value)}
                                                className="w-full bg-[#121212] border border-white/10 rounded-2xl px-5 py-4 text-white outline-none transition-all text-sm font-bold"
                                                placeholder="Profile URL"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label htmlFor="social-twitter" className="text-[10px] font-black text-gray-500  tracking-widest flex items-center gap-2"><Twitter size={14} /> Twitter (X)</label>
                                            <input
                                                id="social-twitter"
                                                name="social-twitter"
                                                value={localSettings.socialLinks?.twitter || ''}
                                                onChange={(e) => handleSocialChange('twitter', e.target.value)}
                                                className="w-full bg-[#121212] border border-white/10 rounded-2xl px-5 py-4 text-white outline-none transition-all text-sm font-bold"
                                                placeholder="Profile URL"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label htmlFor="social-instagram" className="text-[10px] font-black text-gray-500  tracking-widest flex items-center gap-2"><Instagram size={14} /> Instagram</label>
                                            <input
                                                id="social-instagram"
                                                name="social-instagram"
                                                value={localSettings.socialLinks?.instagram || ''}
                                                onChange={(e) => handleSocialChange('instagram', e.target.value)}
                                                className="w-full bg-[#121212] border border-white/10 rounded-2xl px-5 py-4 text-white outline-none transition-all text-sm font-bold"
                                                placeholder="Profile URL"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* APPEARANCE SETTINGS */}
                        {activeTab === 'appearance' && (
                            <div className="space-y-8 animate-fadeIn">
                                <div>
                                    <h2 className="text-2xl font-black text-white flex items-center gap-3  tracking-tighter">
                                        <Layout className="text-primary" size={24} /> Logo Configuration
                                    </h2>
                                    <p className="text-gray-500 text-sm font-medium mt-2">Upload branding assets for various parts of the application. <strong>Live Preview supported.</strong></p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {renderImageUpload(
                                        'Splash Screen Logo',
                                        'splashLogoUrl',
                                        'Displayed centered on the initial loading screen when the app starts.'
                                    )}
                                    {renderImageUpload(
                                        'Loading Screen Logo',
                                        'loadingLogoUrl',
                                        'Displayed centered on the application loading screens.'
                                    )}
                                    {renderImageUpload(
                                        'Authentication Logo (Sign In/Up)',
                                        'authLogoUrl',
                                        'Shown above the login and registration forms. Should be clear and recognizable.'
                                    )}
                                    {renderImageUpload(
                                        'Admin Login Logo',
                                        'adminLoginLogoUrl',
                                        'Logo displayed specifically on the Admin authentication/login page.'
                                    )}
                                    {renderImageUpload(
                                        'Admin Panel Header Logo',
                                        'adminPanelLogoUrl',
                                        'Logo displayed at the top of the Admin sidebars.'
                                    )}
                                    {renderImageUpload(
                                        'Sidebar Logo (Compact)',
                                        'sidebarLogoUrl',
                                        'Compact icon used in collapsed sidebars. White version recommended.'
                                    )}
                                    {renderImageUpload(
                                        'Map Marker/Logo',
                                        'mapLogoUrl',
                                        'Used as the custom pin or overlay on the interactive map.'
                                    )}
                                    {renderImageUpload(
                                        'Invoice Logo',
                                        'invoiceLogoUrl',
                                        'High-resolution logo included in PDF invoices and receipts sent to customers.'
                                    )}
                                </div>
                            </div>
                        )}

                        {/* OPERATIONS SETTINGS */}
                        {activeTab === 'bookings' && (
                            <div className="space-y-10 animate-fadeIn">
                                <div className="space-y-8">
                                    <h2 className="text-2xl font-black text-white flex items-center gap-3  tracking-tighter">
                                        <Clock className="text-primary" size={24} /> Operating Hours
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {renderInput('Start Time', 'bookingStartTime', 'time')}
                                        {renderInput('End Time', 'bookingEndTime', 'time')}
                                        {renderInput('Slot Duration (mins)', 'bookingSlotDuration', 'number')}
                                        {renderInput('Max Bookings per Slot', 'maxBookingsPerSlot', 'number')}
                                    </div>
                                </div>

                            </div>
                        )}

                        {/* FINANCIAL SETTINGS */}
                        {activeTab === 'financials' && (
                            <div className="space-y-10 animate-fadeIn">
                                <div className="space-y-8">
                                    <h2 className="text-2xl font-black text-white flex items-center gap-3  tracking-tighter">
                                        <DollarSign className="text-primary" size={24} /> Currency & Fees
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {renderInput('Currency Code', 'currency', 'text', 'PHP')}
                                        {renderInput('Service Fee (%)', 'serviceFeePercentage', 'number', '5')}
                                    </div>
                                </div>

                                <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                                <div className="space-y-8">
                                    <h2 className="text-2xl font-black text-white flex items-center gap-3  tracking-tighter">
                                        <CreditCard className="text-primary" size={24} /> Payout Configurations
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                        {renderInput('Min Payout', 'minimumPayout', 'number')}
                                        {renderInput('Max Payout', 'maximumPayout', 'number')}

                                        <div className="space-y-2">
                                            <label htmlFor="settings-payout-schedule" className="text-[10px]  tracking-widest font-black text-gray-500 ml-1 block">Payout Schedule</label>
                                            <div className="relative">
                                                <select
                                                    id="settings-payout-schedule"
                                                    name="settings-payout-schedule"
                                                    value={localSettings.payoutSchedule || 'Manual'}
                                                    onChange={(e) => handleInputChange('payoutSchedule', e.target.value)}
                                                    className="w-full bg-[#121212] border border-white/10 rounded-2xl px-5 py-4 text-white outline-none transition-all appearance-none cursor-pointer font-bold text-sm"
                                                >
                                                    <option value="Manual">Manual</option>
                                                    <option value="Weekly">Weekly</option>
                                                    <option value="Bi-weekly">Bi-weekly</option>
                                                    <option value="Monthly">Monthly</option>
                                                </select>
                                                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 rotate-90 pointer-events-none" size={16} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                                {/* HitPay Payment Gateway Section */}
                                <div className="space-y-8">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-2xl font-black text-white flex items-center gap-3  tracking-tighter">
                                            <CreditCard className="text-primary" size={24} /> HitPay Payment Gateway
                                        </h2>
                                        {/* Connection Status Badge */}
                                        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black  tracking-widest border ${(localSettings.hitpaySandboxMode
                                            ? localSettings.hitpaySandboxApiKey && localSettings.hitpaySandboxSalt
                                            : localSettings.hitpayApiKey && localSettings.hitpaySalt)
                                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                            : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                                            }`}>
                                            <span className={`w-2 h-2 rounded-full ${(localSettings.hitpaySandboxMode
                                                ? localSettings.hitpaySandboxApiKey && localSettings.hitpaySandboxSalt
                                                : localSettings.hitpayApiKey && localSettings.hitpaySalt)
                                                ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)] animate-pulse'
                                                : 'bg-rose-400'
                                                }`} />
                                            {(localSettings.hitpaySandboxMode
                                                ? localSettings.hitpaySandboxApiKey && localSettings.hitpaySandboxSalt
                                                : localSettings.hitpayApiKey && localSettings.hitpaySalt)
                                                ? 'Connected'
                                                : 'Not Configured'}
                                        </div>
                                    </div>
                                    <p className="text-gray-500 text-sm font-medium">
                                        Configure your HitPay payment gateway credentials for online payments. Toggle <strong>Sandbox Mode</strong> for testing before going live.
                                    </p>

                                    {/* Sandbox Mode Toggle */}
                                    <div className="flex items-center justify-between p-6 bg-[#121212] rounded-3xl border border-white/5 group hover:border-white/10 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-3 rounded-xl transition-colors ${localSettings.hitpaySandboxMode ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                                {localSettings.hitpaySandboxMode ? <Wrench size={18} /> : <Check size={18} />}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-white text-sm  tracking-wide">
                                                    {localSettings.hitpaySandboxMode ? '🧪 Sandbox Mode (Testing)' : '🟢 Live Mode (Production)'}
                                                </h4>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {localSettings.hitpaySandboxMode
                                                        ? 'Using sandbox credentials. No real charges will be made.'
                                                        : 'Using live credentials. Real transactions will be processed.'}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleInputChange('hitpaySandboxMode', !localSettings.hitpaySandboxMode)}
                                            className={`relative w-14 h-8 rounded-full transition-all duration-300 ease-out border-2 ${localSettings.hitpaySandboxMode ? 'bg-amber-500/20 border-amber-500' : 'bg-emerald-500/20 border-emerald-500'}`}
                                        >
                                            <span className={`absolute top-1 left-1 w-5 h-5 rounded-full transition-all duration-300 shadow-sm ${localSettings.hitpaySandboxMode ? 'translate-x-6 bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]' : 'translate-x-0 bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]'}`} />
                                        </button>
                                    </div>

                                    {/* Live Credentials */}
                                    <div className={`space-y-6 p-6 rounded-[2rem] border transition-all duration-300 ${localSettings.hitpaySandboxMode ? 'bg-[#0a0a0a] border-white/5 opacity-50' : 'bg-[#151515] border-emerald-500/20'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 rounded-lg bg-emerald-500/10">
                                                <Shield size={16} className="text-emerald-400" />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-black text-white  tracking-wider">Live Credentials</h3>
                                                <p className="text-[10px] text-gray-500 font-medium mt-0.5">Production API keys from your HitPay dashboard</p>
                                            </div>
                                            {!localSettings.hitpaySandboxMode && (
                                                <span className="ml-auto text-[9px] font-black  tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">Active</span>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px]  tracking-widest font-black text-gray-500 ml-1 block">Live API Key</label>
                                                <div className="relative">
                                                    <input
                                                        type={showLiveApiKey ? 'text' : 'password'}
                                                        value={localSettings.hitpayApiKey || ''}
                                                        onChange={(e) => handleInputChange('hitpayApiKey', e.target.value)}
                                                        placeholder="live_xxxxxxxxxxxxxxxx"
                                                        className="w-full bg-[#121212] border border-white/10 rounded-2xl px-5 py-4 pr-14 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder-gray-700 font-bold text-sm font-mono"
                                                    />
                                                    <button type="button" onClick={() => setShowLiveApiKey(!showLiveApiKey)} className="absolute inset-y-0 right-0 pr-5 flex items-center text-gray-500 hover:text-primary transition-colors">
                                                        {showLiveApiKey ? <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px]  tracking-widest font-black text-gray-500 ml-1 block">Live Salt</label>
                                                <div className="relative">
                                                    <input
                                                        type={showLiveSalt ? 'text' : 'password'}
                                                        value={localSettings.hitpaySalt || ''}
                                                        onChange={(e) => handleInputChange('hitpaySalt', e.target.value)}
                                                        placeholder="xxxxxxxxxxxxxxxx"
                                                        className="w-full bg-[#121212] border border-white/10 rounded-2xl px-5 py-4 pr-14 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder-gray-700 font-bold text-sm font-mono"
                                                    />
                                                    <button type="button" onClick={() => setShowLiveSalt(!showLiveSalt)} className="absolute inset-y-0 right-0 pr-5 flex items-center text-gray-500 hover:text-primary transition-colors">
                                                        {showLiveSalt ? <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Sandbox Credentials */}
                                    <div className={`space-y-6 p-6 rounded-[2rem] border transition-all duration-300 ${localSettings.hitpaySandboxMode ? 'bg-[#151515] border-amber-500/20' : 'bg-[#0a0a0a] border-white/5 opacity-50'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 rounded-lg bg-amber-500/10">
                                                <Wrench size={16} className="text-amber-400" />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-black text-white  tracking-wider">Sandbox Credentials</h3>
                                                <p className="text-[10px] text-gray-500 font-medium mt-0.5">Test API keys for sandbox environment</p>
                                            </div>
                                            {localSettings.hitpaySandboxMode && (
                                                <span className="ml-auto text-[9px] font-black  tracking-widest text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">Active</span>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px]  tracking-widest font-black text-gray-500 ml-1 block">Sandbox API Key</label>
                                                <div className="relative">
                                                    <input
                                                        type={showSandboxApiKey ? 'text' : 'password'}
                                                        value={localSettings.hitpaySandboxApiKey || ''}
                                                        onChange={(e) => handleInputChange('hitpaySandboxApiKey', e.target.value)}
                                                        placeholder="sandbox_xxxxxxxxxxxxxxxx"
                                                        className="w-full bg-[#121212] border border-white/10 rounded-2xl px-5 py-4 pr-14 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder-gray-700 font-bold text-sm font-mono"
                                                    />
                                                    <button type="button" onClick={() => setShowSandboxApiKey(!showSandboxApiKey)} className="absolute inset-y-0 right-0 pr-5 flex items-center text-gray-500 hover:text-primary transition-colors">
                                                        {showSandboxApiKey ? <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px]  tracking-widest font-black text-gray-500 ml-1 block">Sandbox Salt</label>
                                                <div className="relative">
                                                    <input
                                                        type={showSandboxSalt ? 'text' : 'password'}
                                                        value={localSettings.hitpaySandboxSalt || ''}
                                                        onChange={(e) => handleInputChange('hitpaySandboxSalt', e.target.value)}
                                                        placeholder="xxxxxxxxxxxxxxxx"
                                                        className="w-full bg-[#121212] border border-white/10 rounded-2xl px-5 py-4 pr-14 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder-gray-700 font-bold text-sm font-mono"
                                                    />
                                                    <button type="button" onClick={() => setShowSandboxSalt(!showSandboxSalt)} className="absolute inset-y-0 right-0 pr-5 flex items-center text-gray-500 hover:text-primary transition-colors">
                                                        {showSandboxSalt ? <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Info Box */}
                                    <div className="p-5 bg-blue-500/5 border border-blue-500/15 rounded-2xl flex items-start gap-4">
                                        <div className="p-2 bg-blue-500/10 rounded-lg flex-shrink-0 mt-0.5">
                                            <HelpCircle size={14} className="text-blue-400" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs text-blue-300 font-bold">Where to find your API Keys?</p>
                                            <p className="text-[11px] text-gray-400 leading-relaxed">
                                                Log in to your <strong className="text-white">HitPay Dashboard</strong> → Navigate to <strong className="text-white">Developers</strong> → <strong className="text-white">API Keys</strong>. Copy both the API Key and Salt values.
                                                For sandbox keys, use the HitPay Sandbox Dashboard at <span className="text-blue-400 font-mono text-[10px]">sandbox.hit-pay.com</span>.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                                    {/* Manual GCash Payment Section */}
                                    <div className="space-y-8">
                                        <h2 className="text-2xl font-black text-white flex items-center gap-3  tracking-tighter">
                                            <CreditCard className="text-[#007DFE]" size={24} /> Manual GCash Payment
                                        </h2>
                                        <p className="text-gray-500 text-sm font-medium">
                                            Set up your GCash account details for manual payments. Customers will see these details and upload their transaction receipts.
                                        </p>

                                        {renderSwitch('Enable GCash Payments', 'gcashEnabled', 'Allow customers to pay manually via GCash.')}

                                        {localSettings.gcashEnabled && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fadeIn">
                                                {renderInput('GCash Number', 'gcashNumber', 'text', '09123456789')}
                                                {renderInput('Account Name', 'gcashAccountName', 'text', 'John Doe')}
                                                <div className="md:col-span-2">
                                                    {renderImageUpload(
                                                        'GCash QR Code',
                                                        'gcashQrCodeUrl',
                                                        'Upload your GCash QR code image for customers to scan.'
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* NOTIFICATIONS SETTINGS */}
                        {activeTab === 'notifications' && (
                            <div className="space-y-8 animate-fadeIn">
                                <h2 className="text-2xl font-black text-white flex items-center gap-3  tracking-tighter">
                                    <Mail className="text-primary" size={24} /> Email Alerts
                                </h2>
                                <div className="grid grid-cols-1 gap-6">
                                    {renderSwitch('New Booking Alerts', 'emailOnNewBooking', 'Receive an email whenever a customer places a new booking.')}
                                    {renderSwitch('Cancellation Alerts', 'emailOnCancellation', 'Receive an email when a booking is cancelled by a customer or mechanic.')}
                                </div>

                                <div className="mt-8 pt-8 border-t border-white/10">
                                    <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
                                        <Globe className="text-primary" size={20} /> SMTP Server Configuration
                                    </h2>
                                    <p className="text-gray-400 text-sm mb-6">Configure your SMTP settings to enable the system to send emails. These credentials are used to securely route emails through an HTTPS bridge.</p>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                        <label htmlFor="smtp-host" className="text-[10px] uppercase tracking-widest font-black text-gray-500 block">SMTP Host</label>
                                        <input
                                            id="smtp-host"
                                            name="smtp-host"
                                            type="text"
                                            value={localSettings?.smtpHost || ''}
                                            onChange={(e) => handleInputChange('smtpHost', e.target.value)}
                                            className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:border-primary outline-none transition-colors"
                                            placeholder="e.g., smtp.gmail.com"
                                        />
                                        </div>
                                        <div className="space-y-2">
                                        <label htmlFor="smtp-port" className="text-[10px] uppercase tracking-widest font-black text-gray-500 block">SMTP Port</label>
                                        <input
                                            id="smtp-port"
                                            name="smtp-port"
                                            type="text"
                                            value={localSettings?.smtpPort || ''}
                                            onChange={(e) => handleInputChange('smtpPort', e.target.value)}
                                            className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:border-primary outline-none transition-colors"
                                            placeholder="e.g., 587 or 465"
                                        />
                                        </div>
                                        <div className="space-y-2">
                                        <label htmlFor="smtp-username" className="text-[10px] uppercase tracking-widest font-black text-gray-500 block">SMTP Username</label>
                                        <input
                                            id="smtp-username"
                                            name="smtp-username"
                                            type="text"
                                            value={localSettings?.smtpUsername || ''}
                                            onChange={(e) => handleInputChange('smtpUsername', e.target.value)}
                                            className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:border-primary outline-none transition-colors"
                                            placeholder="Your email address"
                                        />
                                        </div>
                                        <div className="space-y-2">
                                        <label htmlFor="smtp-password" className="text-[10px] uppercase tracking-widest font-black text-gray-500 block">SMTP Password</label>
                                        <div className="relative">
                                            <input
                                                id="smtp-password"
                                                name="smtp-password"
                                                type={showSmtpPassword ? 'text' : 'password'}
                                                value={localSettings?.smtpPassword || ''}
                                                onChange={(e) => handleInputChange('smtpPassword', e.target.value)}
                                                className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl pl-4 pr-12 py-3 text-white placeholder-gray-600 focus:border-primary outline-none transition-colors"
                                                placeholder="App password or SMTP password"
                                            />
                                                <button type="button" onClick={() => setShowSmtpPassword(!showSmtpPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-primary transition-colors">
                                                    {showSmtpPassword ? <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                        <label htmlFor="smtp-sender-name" className="text-[10px] uppercase tracking-widest font-black text-gray-500 block">Sender Name</label>
                                        <input
                                            id="smtp-sender-name"
                                            name="smtp-sender-name"
                                            type="text"
                                            value={localSettings?.smtpFromName || ''}
                                            onChange={(e) => handleInputChange('smtpFromName', e.target.value)}
                                            className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:border-primary outline-none transition-colors"
                                            placeholder="e.g., RidersBUD Notifications"
                                        />
                                        </div>
                                        <div className="space-y-2">
                                        <label htmlFor="smtp-sender-email" className="text-[10px] uppercase tracking-widest font-black text-gray-500 block">Sender Email</label>
                                        <input
                                            id="smtp-sender-email"
                                            name="smtp-sender-email"
                                            type="email"
                                            value={localSettings?.smtpFromEmail || ''}
                                            onChange={(e) => handleInputChange('smtpFromEmail', e.target.value)}
                                            className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:border-primary outline-none transition-colors"
                                            placeholder="e.g., noreply@ridersbud.com"
                                        />
                                        </div>
                                    </div>
                                    
                                    <div className="mt-6 flex flex-col sm:flex-row items-center gap-4">
                                        <button 
                                            onClick={handleTestSmtp}
                                            disabled={isTestingSmtp || !localSettings?.smtpHost || !localSettings?.smtpUsername || !localSettings?.smtpPassword}
                                            className="px-6 py-3 bg-[#1A1A1A] border border-white/10 hover:border-primary/50 text-white rounded-xl font-bold transition-all disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {isTestingSmtp ? <Spinner size="sm" /> : <Mail size={18} />}
                                            Test Connection
                                        </button>
                                        {smtpTestResult && (
                                            <div className={`text-sm px-4 py-2 rounded-lg ${smtpTestResult.success ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                                {smtpTestResult.message}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* VERIFICATION SETTINGS */}
                        {activeTab === 'verification' && (
                            <div className="space-y-8 animate-fadeIn">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-black text-white flex items-center gap-3  tracking-tighter">
                                        <FileCheck className="text-primary" size={24} /> Document Requirements
                                    </h2>
                                    <button
                                        onClick={addRequirement}
                                        className="flex items-center gap-2 px-4 py-2 bg-primary/20 text-primary rounded-xl font-black  tracking-widest text-[10px] hover:bg-primary hover:text-white transition-all border border-primary/20"
                                    >
                                        <Plus size={14} /> Add Document
                                    </button>
                                </div>
                                <p className="text-gray-500 text-sm font-medium">Define which documents mechanics must upload to be verified. <br /> These fields will appear dynamically in the Mechanic Registration flow.</p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {localSettings.verificationRequirements?.map((req, index) => (
                                        <div key={req.id} className="bg-[#151515] border border-white/5 p-6 rounded-[2rem] space-y-4 group hover:border-primary/30 transition-all relative">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1 space-y-4">
                                                    <div className="space-y-1">
                                                        <label htmlFor="faq-label" className="text-[9px]  tracking-widest font-black text-gray-600 block">Label</label>
                                                        <input
                                                            id="faq-label"
                                                            name="faq-label"
                                                            value={req.label}
                                                            onChange={(e) => handleRequirementChange(index, 'label', e.target.value)}
                                                            className="w-full bg-transparent text-white font-bold text-lg border-b border-white/10 focus:border-primary outline-none py-1"
                                                            placeholder="Document Name"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label htmlFor="faq-description" className="text-[9px]  tracking-widest font-black text-gray-600 block">Description (Hint)</label>
                                                        <input
                                                            id="faq-description"
                                                            name="faq-description"
                                                            value={req.description}
                                                            onChange={(e) => handleRequirementChange(index, 'description', e.target.value)}
                                                            className="w-full bg-transparent text-gray-400 text-xs border-b border-white/10 focus:border-primary outline-none py-1"
                                                            placeholder="e.g. Upload PDF or Image"
                                                        />
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => removeRequirement(index)}
                                                    className="p-2 ml-4 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>

                                            <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                                <span className="text-xs font-bold text-gray-500  tracking-wide">Required</span>
                                                <button
                                                    onClick={() => handleRequirementChange(index, 'isRequired', !req.isRequired)}
                                                    className={`relative w-10 h-6 rounded-full transition-all duration-300 ease-out border-2 ${req.isRequired ? 'bg-primary/20 border-primary' : 'bg-transparent border-gray-700'}`}
                                                >
                                                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-all duration-300 shadow-sm ${req.isRequired ? 'translate-x-4 bg-primary' : 'translate-x-0 bg-gray-500'}`} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {(!localSettings.verificationRequirements || localSettings.verificationRequirements.length === 0) && (
                                        <div className="col-span-1 md:col-span-2 py-12 border-2 border-dashed border-white/5 rounded-[2rem] flex flex-col items-center justify-center text-gray-600">
                                            <FileCheck size={48} className="mb-4 opacity-20" />
                                            <p className="text-sm font-black  tracking-widest opacity-50">No requirements defined</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* SUPPORT SETTINGS */}
                        {activeTab === 'support' && (
                            <div className="space-y-10 animate-fadeIn">
                                {/* Chat Feature Section */}
                                <div className="space-y-8">
                                    <h2 className="text-2xl font-black text-white flex items-center gap-3  tracking-tighter">
                                        <MessageSquare className="text-primary" size={24} /> Live Support
                                    </h2>

                                    <div className="bg-[#151515] border border-white/5 p-8 rounded-[2rem] space-y-8 relative overflow-hidden">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="text-xl font-bold text-white">Enable Live Chat</h3>
                                                <p className="text-gray-500 text-sm mt-1">Allow customers to chat with support.</p>
                                            </div>
                                            <button
                                                onClick={() => handleInputChange('chatEnabled', !localSettings.chatEnabled)}
                                                className={`relative w-14 h-8 rounded-full transition-all duration-300 ease-out border-2 ${localSettings.chatEnabled ? 'bg-primary/20 border-primary' : 'bg-transparent border-gray-700'}`}
                                            >
                                                <span className={`absolute top-1 left-1 w-5 h-5 rounded-full transition-all duration-300 shadow-sm ${localSettings.chatEnabled ? 'translate-x-6 bg-primary' : 'translate-x-0 bg-gray-500'}`} />
                                            </button>
                                        </div>

                                        {localSettings.chatEnabled && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-white/5 animate-fadeIn">
                                                {renderInput('Virtual Mechanic Name', 'virtualMechanicName', 'text', 'Support Bot')}
                                                {renderImageUpload(
                                                    'Support Avatar',
                                                    'virtualMechanicImageUrl',
                                                    'The avatar displayed to customers in the chat.'
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                                {/* FAQ Management Section */}
                                <div className="space-y-8">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-2xl font-black text-white flex items-center gap-3  tracking-tighter">
                                            <HelpCircle className="text-primary" size={24} /> FAQ Management
                                        </h2>
                                        <button
                                            onClick={addFAQ}
                                            className="flex items-center gap-2 px-4 py-2 bg-primary/20 text-primary rounded-xl font-black  tracking-widest text-[10px] hover:bg-primary hover:text-white transition-all border border-primary/20"
                                        >
                                            <Plus size={14} /> Add Question
                                        </button>
                                    </div>

                                    <div className="space-y-6">
                                        {localSettings.faqs?.map((faq, index) => (
                                            <div key={faq.id} className="bg-[#151515] border border-white/5 p-6 rounded-[2rem] space-y-4 group hover:border-primary/30 transition-all relative">
                                                <div className="flex justify-between items-start gap-4">
                                                    <div className="flex-1 space-y-4">
                                                        <div className="space-y-1">
                                                        <label htmlFor="faq-question" className="text-[9px]  tracking-widest font-black text-gray-600 block">Question</label>
                                                        <input
                                                            id="faq-question"
                                                            name="faq-question"
                                                            value={faq.question}
                                                            onChange={(e) => handleFAQChange(index, 'question', e.target.value)}
                                                            className="w-full bg-transparent text-white font-bold text-lg border-b border-white/10 focus:border-primary outline-none py-1"
                                                            placeholder="e.g. How do I book?"
                                                        />
                                                        </div>
                                                        <div className="space-y-1">
                                                        <label htmlFor="faq-answer" className="text-[9px]  tracking-widest font-black text-gray-600 block">Answer</label>
                                                        <textarea
                                                            id="faq-answer"
                                                            name="faq-answer"
                                                            value={faq.answer}
                                                            onChange={(e) => handleFAQChange(index, 'answer', e.target.value)}
                                                            className="w-full bg-transparent text-gray-400 text-sm border-b border-white/10 focus:border-primary outline-none py-1 min-h-[60px] resize-none"
                                                            placeholder="Enter the detailed answer here..."
                                                        />
                                                        </div>
                                                        <div className="space-y-1 w-1/3">
                                                        <label htmlFor="faq-category" className="text-[9px]  tracking-widest font-black text-gray-600 block">Category</label>
                                                        <input
                                                            id="faq-category"
                                                            name="faq-category"
                                                            value={faq.category}
                                                            onChange={(e) => handleFAQChange(index, 'category', e.target.value)}
                                                            className="w-full bg-transparent text-gray-400 text-xs border-b border-white/10 focus:border-primary outline-none py-1"
                                                            placeholder="General"
                                                        />
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => removeFAQ(index)}
                                                        className="p-2 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}

                                        {(!localSettings.faqs || localSettings.faqs.length === 0) && (
                                            <div className="py-12 border-2 border-dashed border-white/5 rounded-[2rem] flex flex-col items-center justify-center text-gray-600">
                                                <HelpCircle size={48} className="mb-4 opacity-20" />
                                                <p className="text-sm font-black  tracking-widest opacity-50">No FAQs Added Yet</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* SYSTEM SETTINGS */}
                        {activeTab === 'system' && (
                            <div className="space-y-10 animate-fadeIn">
                                <div>
                                    <h2 className="text-2xl font-black text-white flex items-center gap-3  tracking-tighter mb-8">
                                        <AlertTriangle className="text-rose-500" size={24} /> Danger Zone
                                    </h2>
                                    <div className="p-8 bg-rose-500/5 border border-rose-500/20 rounded-[2.5rem] relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-8 opacity-10">
                                            <AlertTriangle size={120} className="text-rose-500" />
                                        </div>

                                        <div className="flex items-start gap-6 relative z-10">
                                            <div className="p-4 bg-rose-500/20 rounded-2xl shadow-lg shadow-rose-500/20">
                                                <AlertTriangle className="text-rose-500 fill-rose-500/20" size={32} />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div>
                                                        <h3 className="text-xl font-black text-white  tracking-tight">Maintenance Mode</h3>
                                                        <p className="text-rose-400 font-bold text-xs  tracking-wider mt-1">Critical System Control</p>
                                                    </div>
                                                    <button
                                                        onClick={() => handleInputChange('maintenanceMode', !localSettings.maintenanceMode)}
                                                        className={`relative w-16 h-9 rounded-full transition-all duration-300 shadow-inner ${localSettings.maintenanceMode ? 'bg-rose-500' : 'bg-gray-800'}`}
                                                    >
                                                        <span className={`absolute top-1 left-1 w-7 h-7 bg-white rounded-full transition-all duration-300 shadow-md ${localSettings.maintenanceMode ? 'translate-x-7' : 'translate-x-0'}`} />
                                                    </button>
                                                </div>
                                                <p className="text-gray-400 text-sm leading-relaxed mb-6 font-medium">
                                                    When enabled, the customer application will display a maintenance message and prevent new bookings. <br />
                                                    <span className="text-rose-400">The Admin Panel remains accessible to administrators.</span>
                                                </p>

                                                {localSettings.maintenanceMode && (
                                                    <div className="flex items-center gap-3 text-white text-xs font-black  tracking-widest bg-rose-500 px-6 py-4 rounded-xl shadow-lg shadow-rose-500/40 animate-pulse">
                                                        <AlertTriangle size={16} className="fill-white" />
                                                        System is currently in maintenance mode
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    <h2 className="text-2xl font-black text-white flex items-center gap-3  tracking-tighter">
                                        <Shield className="text-primary" size={24} /> Admin Interface
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {renderInput('Admin Panel Title', 'adminPanelTitle', 'text')}
                                        {renderInput('Sidebar Logo URL', 'adminSidebarLogoUrl', 'text')}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div >
    );
};

export default AdminSettingsScreen;
