import React, { useState, useEffect, useMemo } from 'react';
import { Settings } from '../../types';
import { useDatabase } from '../../context/DatabaseContext';
import Spinner from '../../components/Spinner';
import { fileToBase64 } from '../../utils/fileUtils';

const ToggleSwitch: React.FC<{ label: string; enabled: boolean; onChange: (enabled: boolean) => void; }> = ({ label, enabled, onChange }) => {
  return (
    <div className="flex items-center justify-between">
      <span className="text-light-gray">{label}</span>
      <button
        type="button"
        className={`${
          enabled ? 'bg-primary' : 'bg-gray-500'
        } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-dark-gray`}
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

const CategoryManager: React.FC<{
    title: string;
    categories: string[];
    onAdd: (category: string) => void;
    onDelete: (category: string) => void;
}> = ({ title, categories, onAdd, onDelete }) => {
    const [newCategory, setNewCategory] = useState('');

    const handleAdd = () => {
        if (newCategory.trim() && !categories.includes(newCategory.trim())) {
            onAdd(newCategory.trim());
            setNewCategory('');
        }
    };

    return (
        <div>
            <h3 className="text-lg font-bold mb-3">{title}</h3>
            <div className="space-y-2 mb-3">
                {categories.map(cat => (
                    <div key={cat} className="flex items-center justify-between bg-field p-2 rounded">
                        <span className="text-sm">{cat}</span>
                        <button onClick={() => onDelete(cat)} className="text-red-400 hover:text-red-300">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                ))}
            </div>
            <div className="flex gap-2">
                <input
                    type="text"
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                    placeholder="Add new category"
                    className="flex-grow p-2 bg-field border border-gray-600 rounded placeholder-light-gray"
                />
                <button onClick={handleAdd} className="bg-primary text-white font-bold py-2 px-4 rounded hover:bg-orange-600">Add</button>
            </div>
        </div>
    );
};

const AdminSettingsScreen: React.FC = () => {
    const { db, updateSettings: updateGlobalSettings, loading } = useDatabase();
    
    const [settings, setSettings] = useState<Settings | null>(null);
    const [initialSettings, setInitialSettings] = useState<Settings | null>(null);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        if (db) {
            setSettings(db.settings);
            setInitialSettings(db.settings);
        }
    }, [db]);

    const validate = (data: Settings | null) => {
        if (!data) return false;
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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        
        setSettings(prev => {
            if (!prev) return null;
            const processedValue = type === 'number' ? (value ? parseInt(value, 10) : '') : value;
            const newSettings = { ...prev, [name]: processedValue };
            validate(newSettings);
            return newSettings;
        });
    };

    const handleLocalSettingsChange = (updatedFields: Partial<Settings>) => {
        setSettings(prev => {
            if (!prev) return null;
            const newSettings = { ...prev, ...updatedFields };
            validate(newSettings);
            return newSettings;
        });
    };
    
    const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name } = e.target;
        const file = e.target.files?.[0];
        if (file) {
            try {
                const base64 = await fileToBase64(file);
                handleLocalSettingsChange({ [name]: base64 });
            } catch (error) {
                console.error("Error converting file to base64:", error);
                alert("Could not upload logo. Please try again.");
            }
        }
    };

    const isDirty = useMemo(() => {
        return JSON.stringify(settings) !== JSON.stringify(initialSettings);
    }, [settings, initialSettings]);

    const canSave = isDirty && Object.keys(errors).length === 0;

    const handleSave = () => {
        if (!settings || !canSave) return;
        
        setSaveStatus('saving');
        setTimeout(() => { // Simulate API latency
            updateGlobalSettings(settings);
            setInitialSettings(settings); // Reset baseline for dirty check
            setSaveStatus('success');
            setTimeout(() => setSaveStatus('idle'), 3000); // Hide success message after 3s
        }, 1000);
    };

    const handleReset = () => {
        setSettings(initialSettings);
        setErrors({});
    };

    if (loading || !settings) {
        return <div className="flex items-center justify-center h-full bg-dark-gray"><Spinner size="lg" color="text-white" /></div>;
    }

    return (
        <div className="text-white flex flex-col h-full overflow-hidden bg-dark-gray">
            <div className="p-6 lg:p-8 flex-shrink-0 flex justify-between items-center border-b border-secondary">
                <h1 className="text-3xl font-bold">Application Settings</h1>
                 <div className="flex items-center gap-4">
                    {saveStatus === 'success' && (
                        <p className="text-green-400 font-semibold animate-fadeIn">✓ Saved!</p>
                    )}
                    {isDirty && (
                        <div className="flex items-center gap-4 animate-fadeIn">
                            <button
                                onClick={handleReset}
                                disabled={saveStatus === 'saving'}
                                className="bg-field text-white font-bold py-2 px-6 rounded-lg hover:bg-gray-600 transition-colors"
                            >
                                Discard
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={!canSave || saveStatus === 'saving'}
                                className="bg-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px]"
                            >
                                {saveStatus === 'saving' ? <Spinner size="sm" color="text-white" /> : 'Save Changes'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 lg:p-8">
                 <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    {/* --- LEFT COLUMN (2/3) --- */}
                    <div className="xl:col-span-2 space-y-6">
                        {/* General Settings Card */}
                        <div className="bg-secondary p-6 rounded-lg shadow">
                            <h2 className="text-xl font-bold mb-4">General Settings</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-light-gray mb-1">Application Name</label>
                                    <input type="text" name="appName" value={settings.appName} onChange={handleChange} className={`w-full p-3 bg-field border rounded placeholder-light-gray ${errors.appName ? 'border-red-500' : 'border-gray-600 focus:ring-primary focus:border-primary'}`} />
                                    {errors.appName && <p className="text-red-400 text-xs mt-1">{errors.appName}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-light-gray mb-1">Contact Email</label>
                                    <input type="email" name="contactEmail" value={settings.contactEmail} onChange={handleChange} className={`w-full p-3 bg-field border rounded placeholder-light-gray ${errors.contactEmail ? 'border-red-500' : 'border-gray-600 focus:ring-primary focus:border-primary'}`} />
                                    {errors.contactEmail && <p className="text-red-400 text-xs mt-1">{errors.contactEmail}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-light-gray mb-1">Contact Phone</label>
                                    <input type="tel" name="contactPhone" value={settings.contactPhone} onChange={handleChange} className="w-full p-3 bg-field border border-gray-600 rounded placeholder-light-gray focus:ring-primary focus:border-primary" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-light-gray mb-1">Business Address</label>
                                    <input type="text" name="address" value={settings.address} onChange={handleChange} className="w-full p-3 bg-field border border-gray-600 rounded placeholder-light-gray focus:ring-primary focus:border-primary" />
                                </div>
                            </div>
                        </div>

                        {/* Branding & Appearance Card */}
                        <div className="bg-secondary p-6 rounded-lg shadow">
                            <h2 className="text-xl font-bold mb-4">Branding & Appearance</h2>
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-light-gray mb-1">Application Logo</label>
                                    <p className="text-xs text-gray-400 mb-2">The primary logo for the customer-facing application. Used on the splash screen, login/signup pages, and admin login.</p>
                                    <div className="flex items-center gap-4">
                                        <input type="file" name="appLogoUrl" onChange={handleLogoChange} accept="image/*" className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
                                        {settings.appLogoUrl && <img src={settings.appLogoUrl} alt="App Logo Preview" className="h-16 w-auto object-contain bg-field p-2 rounded" />}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-light-gray mb-1">Admin Sidebar Logo</label>
                                    <p className="text-xs text-gray-400 mb-2">A distinct logo for the admin panel sidebar. Falls back to the Application Logo if not set.</p>
                                    <div className="flex items-center gap-4">
                                        <input type="file" name="adminSidebarLogoUrl" onChange={handleLogoChange} accept="image/*" className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
                                        {settings.adminSidebarLogoUrl && <img src={settings.adminSidebarLogoUrl} alt="Admin Sidebar Logo Preview" className="h-16 w-auto object-contain bg-field p-2 rounded" />}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-light-gray mb-1">Application Tagline</label>
                                    <input type="text" name="appTagline" value={settings.appTagline || ''} onChange={handleChange} className="w-full p-3 bg-field border border-gray-600 rounded placeholder-light-gray focus:ring-primary focus:border-primary" />
                                    <p className="text-xs text-gray-400 mt-1">This tagline appears below the logo on the splash, login, and signup screens.</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-light-gray mb-1">Admin Panel Title</label>
                                    <input type="text" name="adminPanelTitle" value={settings.adminPanelTitle || ''} onChange={handleChange} className="w-full p-3 bg-field border border-gray-600 rounded placeholder-light-gray focus:ring-primary focus:border-primary" />
                                </div>
                            </div>
                        </div>

                         {/* Booking Settings Card */}
                        <div className="bg-secondary p-6 rounded-lg shadow">
                            <h2 className="text-xl font-bold mb-4">Booking Settings</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-light-gray mb-1">Operating Hours Start</label>
                                    <input type="time" name="bookingStartTime" value={settings.bookingStartTime} onChange={handleChange} className="w-full p-3 bg-field border border-gray-600 rounded placeholder-light-gray focus:ring-primary focus:border-primary" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-light-gray mb-1">Operating Hours End</label>
                                    <input type="time" name="bookingEndTime" value={settings.bookingEndTime} onChange={handleChange} className={`w-full p-3 bg-field border rounded placeholder-light-gray ${errors.bookingEndTime ? 'border-red-500' : 'border-gray-600 focus:ring-primary focus:border-primary'}`} />
                                    {errors.bookingEndTime && <p className="text-red-400 text-xs mt-1">{errors.bookingEndTime}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-light-gray mb-1">Slot Duration (mins)</label>
                                    <input type="number" name="bookingSlotDuration" value={settings.bookingSlotDuration} onChange={handleChange} className={`w-full p-3 bg-field border rounded placeholder-light-gray ${errors.bookingSlotDuration ? 'border-red-500' : 'border-gray-600 focus:ring-primary focus:border-primary'}`} />
                                    {errors.bookingSlotDuration && <p className="text-red-400 text-xs mt-1">{errors.bookingSlotDuration}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-light-gray mb-1">Max Bookings per Slot</label>
                                    <input type="number" name="maxBookingsPerSlot" value={settings.maxBookingsPerSlot} onChange={handleChange} className={`w-full p-3 bg-field border rounded placeholder-light-gray ${errors.maxBookingsPerSlot ? 'border-red-500' : 'border-gray-600 focus:ring-primary focus:border-primary'}`} />
                                    {errors.maxBookingsPerSlot && <p className="text-red-400 text-xs mt-1">{errors.maxBookingsPerSlot}</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* --- RIGHT COLUMN (1/3) --- */}
                    <div className="space-y-6">
                        {/* Catalog Settings */}
                        <div className="bg-secondary p-6 rounded-lg shadow">
                            <h2 className="text-xl font-bold mb-4">Catalog Settings</h2>
                            <div className="grid grid-cols-1 gap-6">
                                <CategoryManager
                                    title="Service Categories"
                                    categories={settings.serviceCategories}
                                    onAdd={(cat) => handleLocalSettingsChange({ serviceCategories: [...settings.serviceCategories, cat] })}
                                    onDelete={(cat) => handleLocalSettingsChange({ serviceCategories: settings.serviceCategories.filter(c => c !== cat) })}
                                />
                                <CategoryManager
                                    title="Part Categories"
                                    categories={settings.partCategories}
                                    onAdd={(cat) => handleLocalSettingsChange({ partCategories: [...settings.partCategories, cat] })}
                                    onDelete={(cat) => handleLocalSettingsChange({ partCategories: settings.partCategories.filter(c => c !== cat) })}
                                />
                            </div>
                        </div>

                         {/* AI & Map Settings */}
                        <div className="bg-secondary p-6 rounded-lg shadow">
                            <h2 className="text-xl font-bold mb-4">AI & Map Settings</h2>
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-bold mb-3">Virtual Mechanic</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-light-gray mb-1">Virtual Mechanic Name</label>
                                            <input type="text" name="virtualMechanicName" value={settings.virtualMechanicName || ''} onChange={handleChange} className="w-full p-3 bg-field border border-gray-600 rounded placeholder-light-gray focus:ring-primary focus:border-primary" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-light-gray mb-1">Virtual Mechanic Avatar</label>
                                            <input type="file" name="virtualMechanicImageUrl" onChange={handleLogoChange} accept="image/*" className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
                                            {settings.virtualMechanicImageUrl && <img src={settings.virtualMechanicImageUrl} alt="Virtual Mechanic Preview" className="mt-2 h-16 w-16 object-cover rounded-full bg-field p-1" />}
                                        </div>
                                    </div>
                                </div>
                                <div className="border-t border-field pt-6">
                                    <h3 className="text-lg font-bold mb-3">Map Settings</h3>
                                     <div>
                                        <label className="block text-sm font-medium text-light-gray mb-1">Mechanic Map Marker Logo</label>
                                        <input type="file" name="mechanicMarkerUrl" onChange={handleLogoChange} accept="image/*" className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
                                        {settings.mechanicMarkerUrl && <img src={settings.mechanicMarkerUrl} alt="Mechanic Marker Preview" className="mt-2 h-10 w-10 object-contain bg-field p-1 rounded-full border-2 border-primary" />}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Notification Settings Card */}
                        <div className="bg-secondary p-6 rounded-lg shadow">
                            <h2 className="text-xl font-bold mb-4">Notification Settings</h2>
                            <div className="space-y-4">
                                <ToggleSwitch label="Email on New Booking" enabled={settings.emailOnNewBooking} onChange={(val) => handleLocalSettingsChange({ emailOnNewBooking: val })} />
                                <ToggleSwitch label="Email on Cancellation" enabled={settings.emailOnCancellation} onChange={(val) => handleLocalSettingsChange({ emailOnCancellation: val })} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminSettingsScreen;