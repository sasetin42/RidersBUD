import React, { useState, useEffect, useRef } from 'react';
import { getSettings, updateSettings } from '../../data/mockData';
import { Settings } from '../../types';

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

const ToggleSwitch: React.FC<{ label: string; enabled: boolean; onChange: (enabled: boolean) => void; }> = ({ label, enabled, onChange }) => {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-700">{label}</span>
      <button
        type="button"
        className={`${
          enabled ? 'bg-primary' : 'bg-gray-300'
        } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2`}
        onClick={() => onChange(!enabled)}
      >
        <span
          className={`${
            enabled ? 'translate-x-6' : 'translate-x-1'
          } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
        />
      </button>
    </div>
  );
};

const AdminSettingsScreen: React.FC = () => {
    const [settings, setSettings] = useState<Settings | null>(null);
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved');
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const debounceTimeoutRef = useRef<number | null>(null);
    const isInitialMount = useRef(true);

    useEffect(() => {
        const initialSettings = getSettings();
        setSettings(initialSettings);
    }, []);

    // The auto-saving effect
    useEffect(() => {
        if (isInitialMount.current || !settings) {
            isInitialMount.current = false;
            return;
        }

        setSaveStatus('unsaved');
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }

        debounceTimeoutRef.current = window.setTimeout(() => {
            if (validate(settings)) {
                setSaveStatus('saving');
                setTimeout(() => { // Simulate API call
                    updateSettings(settings);
                    setSaveStatus('saved');
                }, 1000);
            } else {
                setSaveStatus('error');
            }
        }, 1500); // 1.5 second debounce time

        return () => {
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
        };
    }, [settings]);

    const validate = (data: Settings): boolean => {
        const newErrors: { [key: string]: string } = {};

        if (!data.appName.trim()) newErrors.appName = "Application name is required.";
        if (!data.contactEmail) newErrors.contactEmail = "Email is required.";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contactEmail)) newErrors.contactEmail = "Invalid email format.";
        
        if (data.bookingSlotDuration <= 0) newErrors.bookingSlotDuration = "Duration must be a positive number.";
        if (data.maxBookingsPerSlot <= 0) newErrors.maxBookingsPerSlot = "Must be a positive number.";
        if (data.bookingStartTime && data.bookingEndTime && data.bookingStartTime >= data.bookingEndTime) {
            newErrors.bookingEndTime = "End time must be after start time.";
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSettingsChange = (updatedFields: Partial<Settings>) => {
        setSettings(prev => prev ? { ...prev, ...updatedFields } : null);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const processedValue = type === 'number' ? (value ? parseInt(value, 10) : '') : value;
        handleSettingsChange({ [name]: processedValue });
    };

    const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name } = e.target;
        const file = e.target.files?.[0];
        if (file) {
            try {
                const base64 = await fileToBase64(file);
                handleSettingsChange({ [name]: base64 });
            } catch (error) {
                console.error("Error converting file to base64:", error);
                alert("Could not upload logo. Please try again.");
            }
        }
    };
    
    const StatusIndicator = () => {
        switch (saveStatus) {
            case 'saving':
                return <p className="text-gray-500 font-medium">Saving...</p>;
            case 'saved':
                return <p className="text-green-600 font-medium">All changes saved!</p>;
            case 'error':
                 return <p className="text-red-500 font-medium">Please fix the validation errors.</p>;
            case 'unsaved':
                 return <p className="text-gray-500 font-medium">Unsaved changes...</p>;
            default:
                return null;
        }
    };

    if (!settings) {
        return <div>Loading settings...</div>;
    }

    return (
        <div className="text-gray-800">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Application Settings</h1>
                <div className="min-w-[200px] text-right">
                    <StatusIndicator />
                </div>
            </div>
            
            <div className="space-y-8">
                {/* General Settings Card */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-bold mb-4">General Settings</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Application Name</label>
                            <input type="text" name="appName" value={settings.appName} onChange={handleChange} className={`w-full p-2 bg-gray-100 border rounded ${errors.appName ? 'border-red-500' : 'border-gray-300'}`} />
                            {errors.appName && <p className="text-red-500 text-xs mt-1">{errors.appName}</p>}
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                            <input type="email" name="contactEmail" value={settings.contactEmail} onChange={handleChange} className={`w-full p-2 bg-gray-100 border rounded ${errors.contactEmail ? 'border-red-500' : 'border-gray-300'}`} />
                            {errors.contactEmail && <p className="text-red-500 text-xs mt-1">{errors.contactEmail}</p>}
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                            <input type="tel" name="contactPhone" value={settings.contactPhone} onChange={handleChange} className="w-full p-2 bg-gray-100 border border-gray-300 rounded" />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Business Address</label>
                            <input type="text" name="address" value={settings.address} onChange={handleChange} className="w-full p-2 bg-gray-100 border border-gray-300 rounded" />
                        </div>
                    </div>
                </div>

                {/* Branding & Appearance Card */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-bold mb-4">Branding & Appearance</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Logo Uploads */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Splash Screen Logo</label>
                            <input type="file" name="splashLogoUrl" onChange={handleLogoChange} accept="image/*" className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
                            {settings.splashLogoUrl && <img src={settings.splashLogoUrl} alt="Splash Preview" className="mt-2 h-16 w-auto object-contain bg-gray-200 p-2 rounded" />}
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Login/Sign Up Logo</label>
                            <input type="file" name="authLogoUrl" onChange={handleLogoChange} accept="image/*" className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
                            {settings.authLogoUrl && <img src={settings.authLogoUrl} alt="Auth Preview" className="mt-2 h-16 w-auto object-contain bg-gray-200 p-2 rounded" />}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Admin Sidebar Logo</label>
                            <input type="file" name="sidebarLogoUrl" onChange={handleLogoChange} accept="image/*" className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
                            {settings.sidebarLogoUrl && <img src={settings.sidebarLogoUrl} alt="Sidebar Preview" className="mt-2 h-16 w-auto object-contain bg-gray-700 p-2 rounded" />}
                        </div>
                        <div></div>
                        {/* Text Fields */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Login Title</label>
                            <input type="text" name="loginTitle" value={settings.loginTitle || ''} onChange={handleChange} className="w-full p-2 bg-gray-100 border border-gray-300 rounded" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Login Subtitle</label>
                            <input type="text" name="loginSubtitle" value={settings.loginSubtitle || ''} onChange={handleChange} className="w-full p-2 bg-gray-100 border border-gray-300 rounded" />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Sign Up Title</label>
                            <input type="text" name="signupTitle" value={settings.signupTitle || ''} onChange={handleChange} className="w-full p-2 bg-gray-100 border border-gray-300 rounded" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Sign Up Subtitle</label>
                            <input type="text" name="signupSubtitle" value={settings.signupSubtitle || ''} onChange={handleChange} className="w-full p-2 bg-gray-100 border border-gray-300 rounded" />
                        </div>
                    </div>
                </div>


                {/* Booking Settings Card */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-bold mb-4">Booking Settings</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Operating Hours Start</label>
                            <input type="time" name="bookingStartTime" value={settings.bookingStartTime} onChange={handleChange} className="w-full p-2 bg-gray-100 border border-gray-300 rounded" />
                        </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Operating Hours End</label>
                            <input type="time" name="bookingEndTime" value={settings.bookingEndTime} onChange={handleChange} className={`w-full p-2 bg-gray-100 border rounded ${errors.bookingEndTime ? 'border-red-500' : 'border-gray-300'}`} />
                            {errors.bookingEndTime && <p className="text-red-500 text-xs mt-1">{errors.bookingEndTime}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Slot Duration (mins)</label>
                            <input type="number" name="bookingSlotDuration" value={settings.bookingSlotDuration} onChange={handleChange} className={`w-full p-2 bg-gray-100 border rounded ${errors.bookingSlotDuration ? 'border-red-500' : 'border-gray-300'}`} />
                            {errors.bookingSlotDuration && <p className="text-red-500 text-xs mt-1">{errors.bookingSlotDuration}</p>}
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Max Bookings per Slot</label>
                            <input type="number" name="maxBookingsPerSlot" value={settings.maxBookingsPerSlot} onChange={handleChange} className={`w-full p-2 bg-gray-100 border rounded ${errors.maxBookingsPerSlot ? 'border-red-500' : 'border-gray-300'}`} />
                            {errors.maxBookingsPerSlot && <p className="text-red-500 text-xs mt-1">{errors.maxBookingsPerSlot}</p>}
                        </div>
                    </div>
                </div>
                
                {/* Notification Settings Card */}
                <div className="bg-white p-6 rounded-lg shadow">
                     <h2 className="text-xl font-bold mb-4">Notification Settings</h2>
                     <div className="space-y-4 max-w-md">
                         <ToggleSwitch label="Email on New Booking" enabled={settings.emailOnNewBooking} onChange={(val) => handleSettingsChange({ emailOnNewBooking: val })} />
                         <ToggleSwitch label="Email on Cancellation" enabled={settings.emailOnCancellation} onChange={(val) => handleSettingsChange({ emailOnCancellation: val })} />
                     </div>
                </div>
            </div>
        </div>
    );
};

export default AdminSettingsScreen;
