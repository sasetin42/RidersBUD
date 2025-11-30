import React, { useState, useEffect, useMemo } from 'react';
import { Settings, Role, AdminModule, PermissionLevel } from '../../types';
import { useDatabase } from '../../context/DatabaseContext';
import Spinner from '../../components/Spinner';
import { fileToBase64 } from '../../utils/fileUtils';
import Modal from '../../components/admin/Modal';
import { seedDatabase } from '../../utils/seedSupabase';
import { Settings as SettingsIcon, Calendar, Bell, Users, Bot, Palette, Map, Save, RotateCcw, Database } from 'lucide-react';

const modules: AdminModule[] = ['dashboard', 'analytics', 'bookings', 'services', 'mechanics', 'customers', 'marketing', 'users', 'settings'];

const RoleFormModal: React.FC<{
    role?: Role;
    onClose: () => void;
    onSave: (role: Role | Omit<Role, 'isEditable'>) => void;
    existingRoleNames: string[];
}> = ({ role, onClose, onSave, existingRoleNames }) => {
    const { db } = useDatabase();
    const [formData, setFormData] = useState({
        name: role?.name || '',
        description: role?.description || '',
        defaultPermissions: role?.defaultPermissions || {},
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const validate = () => {
        const newErrors: { [key: string]: string } = {};
        if (!formData.name.trim()) {
            newErrors.name = 'Role name cannot be empty.';
        } else if (!role && existingRoleNames.map(n => n.toLowerCase()).includes(formData.name.trim().toLowerCase())) {
            newErrors.name = 'A role with this name already exists.';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handlePermissionChange = (module: AdminModule, level: PermissionLevel) => {
        setFormData(prev => ({ ...prev, defaultPermissions: { ...prev.defaultPermissions, [module]: level } }));
    };

    const handleSave = () => {
        if (validate()) {
            if (role) {
                onSave({ ...role, ...formData });
            } else {
                onSave(formData);
            }
        }
    };

    return (
        <Modal title={role ? `Edit Role: ${role.name}` : "Add New Role"} isOpen={true} onClose={onClose}>
            <div className="space-y-4">
                <div>
                    <label className="text-sm font-semibold text-white mb-1 block">Role Name</label>
                    <input
                        type="text"
                        value={formData.name}
                        readOnly={!!role?.isEditable === false}
                        onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className={`w-full p-3 glass-light border rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-admin-accent transition-all ${errors.name ? 'border-red-500' : 'border-white/10'} ${!!role?.isEditable === false ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                    {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
                </div>
                <div>
                    <label className="text-sm font-semibold text-white mb-1 block">Description</label>
                    <input
                        type="text"
                        value={formData.description}
                        onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full p-3 glass-light border border-white/10 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-admin-accent transition-all"
                    />
                </div>

                <div className="border-t border-white/10 pt-4">
                    <h3 className="text-lg font-bold text-white mb-3">Default Permissions</h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                        {modules.map(module => (
                            <div key={module} className="grid grid-cols-2 items-center glass-dark p-2 rounded-lg border border-white/5">
                                <label className="text-sm capitalize text-gray-300 pl-2">{module}</label>
                                <select
                                    value={formData.defaultPermissions[module] || 'none'}
                                    onChange={e => handlePermissionChange(module, e.target.value as PermissionLevel)}
                                    className="w-full p-1 bg-black/40 border border-white/10 rounded text-sm text-white focus:ring-1 focus:ring-admin-accent"
                                >
                                    <option value="none" className="bg-gray-800">No Access</option>
                                    <option value="view" className="bg-gray-800">View Only</option>
                                    <option value="edit" className="bg-gray-800">View & Edit</option>
                                </select>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="mt-6 flex justify-end gap-4 border-t border-white/10 pt-4">
                <button onClick={onClose} className="px-6 py-2.5 glass-light border border-white/10 text-white rounded-xl hover:bg-white/10 transition-all font-medium">Cancel</button>
                <button onClick={handleSave} className="px-6 py-2.5 bg-gradient-to-r from-admin-accent to-orange-600 text-white rounded-xl hover:shadow-glow transition-all font-medium">Save Role</button>
            </div>
        </Modal>
    );
};


const ToggleSwitch: React.FC<{ label: string; enabled: boolean; onChange: (enabled: boolean) => void; }> = ({ label, enabled, onChange }) => {
    return (
        <div className="flex items-center justify-between glass-dark p-3 rounded-xl border border-white/5">
            <span className="text-gray-300 font-medium">{label}</span>
            <button
                type="button"
                className={`${enabled ? 'bg-admin-accent' : 'bg-gray-600'
                    } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-admin-accent focus:ring-offset-2 focus:ring-offset-gray-800`}
                onClick={() => onChange(!enabled)}
            >
                <span
                    className={`${enabled ? 'translate-x-6' : 'translate-x-1'
                        } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                />
            </button>
        </div>
    );
};

const AdminSettingsScreen: React.FC = () => {
    const { db, updateSettings: updateGlobalSettings, addRole, updateRole, deleteRole, loading } = useDatabase();

    const [settings, setSettings] = useState<Settings | null>(null);
    const [initialSettings, setInitialSettings] = useState<Settings | null>(null);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [seeding, setSeeding] = useState(false);
    const [activeTab, setActiveTab] = useState('general');

    // State for role management
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | undefined>(undefined);

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
        if (data.bookingBufferTime !== undefined && data.bookingBufferTime < 0) newErrors.bookingBufferTime = "Buffer time cannot be negative.";
        if (data.advanceBookingDays !== undefined && data.advanceBookingDays < 0) newErrors.advanceBookingDays = "Days cannot be negative.";
        if (data.bookingBufferTime !== undefined && data.bookingBufferTime < 0) newErrors.bookingBufferTime = "Buffer time cannot be negative.";
        if (data.advanceBookingDays !== undefined && data.advanceBookingDays < 0) newErrors.advanceBookingDays = "Days cannot be negative.";
        if (data.bookingBufferTime !== undefined && data.bookingBufferTime < 0) newErrors.bookingBufferTime = "Buffer time cannot be negative.";
        if (data.advanceBookingDays !== undefined && data.advanceBookingDays < 0) newErrors.advanceBookingDays = "Days cannot be negative.";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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

    const handleSaveRole = async (roleData: Role | Omit<Role, 'isEditable'>) => {
        try {
            if ('isEditable' in roleData) {
                await updateRole(roleData as Role);
            } else {
                await addRole(roleData);
            }
            setIsRoleModalOpen(false);
            setEditingRole(undefined);
        } catch (error) {
            alert(error instanceof Error ? error.message : 'An unknown error occurred.');
        }
    };

    const handleDeleteRole = async (roleName: string) => {
        if (window.confirm(`Are you sure you want to delete the "${roleName}" role? This action cannot be undone.`)) {
            try {
                await deleteRole(roleName);
            } catch (error) {
                alert(error instanceof Error ? error.message : 'An unknown error occurred.');
            }
        }
    };

    const handleSeedDatabase = async () => {
        if (window.confirm("Are you sure you want to seed the database? This may create duplicate entries if data already exists.")) {
            setSeeding(true);
            try {
                await seedDatabase();
                alert("Database seeding completed successfully!");
            } catch (error) {
                console.error("Seeding failed:", error);
                alert("Seeding failed. Check console for details.");
            } finally {
                setSeeding(false);
            }
        }
    };

    if (loading || !settings || !db) {
        return <div className="flex items-center justify-center h-full"><Spinner size="lg" color="text-white" /></div>;
    }

    const tabs = [
        { id: 'general', label: 'General', icon: SettingsIcon },
        { id: 'branding', label: 'Branding', icon: Palette },
        { id: 'booking', label: 'Booking', icon: Calendar },
        { id: 'roles', label: 'Roles & Permissions', icon: Users },
        { id: 'ai', label: 'AI Assistant', icon: Bot },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'map', label: 'Map', icon: Map },
    ];

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="p-6 flex-shrink-0 flex flex-col sm:flex-row gap-4 justify-between sm:items-center border-b border-white/10 bg-black/20 backdrop-blur-sm">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Settings</h1>
                    <p className="text-gray-400 text-sm mt-1">Manage your application configuration</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleSeedDatabase}
                        disabled={seeding}
                        className="glass-light border border-white/10 text-white font-medium py-2 px-4 rounded-xl hover:bg-white/10 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                        {seeding ? <Spinner size="sm" color="text-white" /> : <Database className="w-4 h-4" />}
                        <span>Seed DB</span>
                    </button>
                    {saveStatus === 'success' && (
                        <div className="bg-green-500/20 border border-green-500/30 text-green-400 px-4 py-2 rounded-xl flex items-center gap-2 animate-fadeIn">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            <span className="font-medium">Saved!</span>
                        </div>
                    )}
                    {isDirty && (
                        <div className="flex items-center gap-3 animate-fadeIn">
                            <button
                                onClick={handleReset}
                                disabled={saveStatus === 'saving'}
                                className="glass-light border border-white/10 text-white font-medium py-2 px-4 rounded-xl hover:bg-white/10 transition-all flex items-center gap-2"
                            >
                                <RotateCcw className="w-4 h-4" />
                                <span>Discard</span>
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={!canSave || saveStatus === 'saving'}
                                className="bg-gradient-to-r from-admin-accent to-orange-600 text-white font-bold py-2 px-6 rounded-xl hover:shadow-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {saveStatus === 'saving' ? <Spinner size="sm" color="text-white" /> : <Save className="w-4 h-4" />}
                                <span>Save Changes</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar Tabs */}
                <div className="w-64 flex-shrink-0 border-r border-white/10 bg-black/20 overflow-y-auto custom-scrollbar p-4 space-y-2">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${activeTab === tab.id ? 'bg-admin-accent text-white shadow-glow' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                        >
                            <tab.icon className="w-5 h-5" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    <div className="max-w-4xl mx-auto space-y-6">

                        {/* General Settings */}
                        {activeTab === 'general' && (
                            <div className="glass-dark p-6 rounded-2xl border border-white/10 space-y-6 animate-fadeIn">
                                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <SettingsIcon className="w-5 h-5 text-admin-accent" /> General Information
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-white mb-2">Application Name</label>
                                        <input type="text" name="appName" value={settings.appName} onChange={handleChange} className={`w-full p-3 glass-light border rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-admin-accent transition-all ${errors.appName ? 'border-red-500' : 'border-white/10'}`} />
                                        {errors.appName && <p className="text-red-400 text-xs mt-1">{errors.appName}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-white mb-2">Contact Email</label>
                                        <input type="email" name="contactEmail" value={settings.contactEmail} onChange={handleChange} className={`w-full p-3 glass-light border rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-admin-accent transition-all ${errors.contactEmail ? 'border-red-500' : 'border-white/10'}`} />
                                        {errors.contactEmail && <p className="text-red-400 text-xs mt-1">{errors.contactEmail}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-white mb-2">Contact Phone</label>
                                        <input type="tel" name="contactPhone" value={settings.contactPhone} onChange={handleChange} className="w-full p-3 glass-light border border-white/10 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-admin-accent transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-white mb-2">Business Address</label>
                                        <input type="text" name="address" value={settings.address} onChange={handleChange} className="w-full p-3 glass-light border border-white/10 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-admin-accent transition-all" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Branding Settings */}
                        {activeTab === 'branding' && (
                            <div className="glass-dark p-6 rounded-2xl border border-white/10 space-y-6 animate-fadeIn">
                                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <Palette className="w-5 h-5 text-admin-accent" /> Branding & Appearance
                                </h2>
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-white mb-2">Primary Application Logo</label>
                                        <p className="text-xs text-gray-400 mb-3">Used on Splash, Login screens (Customer, Mechanic, Admin), and Invoices.</p>
                                        <div className="flex items-center gap-4 p-4 glass-light rounded-xl border border-white/5">
                                            {settings.appLogoUrl && <img src={settings.appLogoUrl} alt="App Logo Preview" className="h-16 w-auto object-contain bg-black/40 p-2 rounded-lg border border-white/10" />}
                                            <input type="file" name="appLogoUrl" onChange={handleLogoChange} accept="image/*" className="text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-admin-accent file:text-white hover:file:bg-orange-600 transition-all cursor-pointer" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-white mb-2">Admin Sidebar Logo</label>
                                        <div className="flex items-center gap-4 p-4 glass-light rounded-xl border border-white/5">
                                            {settings.adminSidebarLogoUrl && <img src={settings.adminSidebarLogoUrl} alt="Admin Logo Preview" className="h-16 w-auto object-contain bg-black/40 p-2 rounded-lg border border-white/10" />}
                                            <input type="file" name="adminSidebarLogoUrl" onChange={handleLogoChange} accept="image/*" className="text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-admin-accent file:text-white hover:file:bg-orange-600 transition-all cursor-pointer" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-white mb-2">Application Tagline</label>
                                        <input type="text" name="appTagline" value={settings.appTagline || ''} onChange={handleChange} className="w-full p-3 glass-light border border-white/10 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-admin-accent transition-all" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Booking Settings */}
                        {activeTab === 'booking' && (
                            <div className="glass-dark p-6 rounded-2xl border border-white/10 space-y-6 animate-fadeIn">
                                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-admin-accent" /> Booking Configuration
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-white mb-2">Operating Hours Start</label>
                                        <input type="time" name="bookingStartTime" value={settings.bookingStartTime} onChange={handleChange} className="w-full p-3 glass-light border border-white/10 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-admin-accent transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-white mb-2">Operating Hours End</label>
                                        <input type="time" name="bookingEndTime" value={settings.bookingEndTime} onChange={handleChange} className={`w-full p-3 glass-light border rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-admin-accent transition-all ${errors.bookingEndTime ? 'border-red-500' : 'border-white/10'}`} />
                                        {errors.bookingEndTime && <p className="text-red-400 text-xs mt-1">{errors.bookingEndTime}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-white mb-2">Slot Duration (mins)</label>
                                        <input type="number" name="bookingSlotDuration" value={settings.bookingSlotDuration} onChange={handleChange} className={`w-full p-3 glass-light border rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-admin-accent transition-all ${errors.bookingSlotDuration ? 'border-red-500' : 'border-white/10'}`} />
                                        {errors.bookingSlotDuration && <p className="text-red-400 text-xs mt-1">{errors.bookingSlotDuration}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-white mb-2">Max Bookings per Slot</label>
                                        <input type="number" name="maxBookingsPerSlot" value={settings.maxBookingsPerSlot} onChange={handleChange} className={`w-full p-3 glass-light border rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-admin-accent transition-all ${errors.maxBookingsPerSlot ? 'border-red-500' : 'border-white/10'}`} />
                                        {errors.maxBookingsPerSlot && <p className="text-red-400 text-xs mt-1">{errors.maxBookingsPerSlot}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-white mb-2">Buffer Time (mins)</label>
                                        <input type="number" name="bookingBufferTime" value={settings.bookingBufferTime || 0} onChange={handleChange} className={`w-full p-3 glass-light border rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-admin-accent transition-all ${errors.bookingBufferTime ? 'border-red-500' : 'border-white/10'}`} />
                                        {errors.bookingBufferTime && <p className="text-red-400 text-xs mt-1">{errors.bookingBufferTime}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-white mb-2">Advance Booking (Days)</label>
                                        <input type="number" name="advanceBookingDays" value={settings.advanceBookingDays || 0} onChange={handleChange} className={`w-full p-3 glass-light border rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-admin-accent transition-all ${errors.advanceBookingDays ? 'border-red-500' : 'border-white/10'}`} />
                                        {errors.advanceBookingDays && <p className="text-red-400 text-xs mt-1">{errors.advanceBookingDays}</p>}
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-semibold text-white mb-2">Cancellation Policy</label>
                                        <textarea name="cancellationPolicy" value={settings.cancellationPolicy || ''} onChange={handleChange} rows={3} className="w-full p-3 glass-light border border-white/10 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-admin-accent transition-all" placeholder="Enter cancellation policy details..." />
                                    </div>
                                </div>
                                <div className="mt-6 border-t border-white/10 pt-6">
                                    <ToggleSwitch label="Email on New Booking" enabled={settings.emailOnNewBooking} onChange={(val) => handleLocalSettingsChange({ emailOnNewBooking: val })} />
                                </div>
                            </div>
                        )}

                        {/* Roles & Permissions */}
                        {activeTab === 'roles' && (
                            <div className="glass-dark p-6 rounded-2xl border border-white/10 space-y-6 animate-fadeIn">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                        <Users className="w-5 h-5 text-admin-accent" /> Role Management
                                    </h2>
                                    <button onClick={() => { setEditingRole(undefined); setIsRoleModalOpen(true); }} className="px-4 py-2 bg-admin-accent/20 text-admin-accent border border-admin-accent/50 rounded-lg hover:bg-admin-accent hover:text-white transition-all text-sm font-semibold">+ Add Role</button>
                                </div>
                                <p className="text-sm text-gray-400 mb-4">Define roles and their default permissions for the admin panel.</p>
                                <div className="space-y-3">
                                    {db.roles.map(role => (
                                        <div key={role.name} className="glass-light p-4 rounded-xl flex items-center justify-between border border-white/5 hover:border-white/10 transition-all">
                                            <div>
                                                <h4 className="font-bold text-white text-lg">{role.name}</h4>
                                                <p className="text-sm text-gray-400">{role.description}</p>
                                            </div>
                                            {role.isEditable ? (
                                                <div className="flex gap-3">
                                                    <button onClick={() => { setEditingRole(role); setIsRoleModalOpen(true); }} className="text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors">Edit</button>
                                                    <button onClick={() => handleDeleteRole(role.name)} className="text-sm font-semibold text-red-400 hover:text-red-300 transition-colors">Delete</button>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-500 italic bg-white/5 px-2 py-1 rounded">System Role</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* AI Assistant */}
                        {activeTab === 'ai' && (
                            <div className="glass-dark p-6 rounded-2xl border border-white/10 space-y-6 animate-fadeIn">
                                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <Bot className="w-5 h-5 text-admin-accent" /> AI Assistant Configuration
                                </h2>
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-white mb-2">Assistant Name</label>
                                        <input type="text" name="virtualMechanicName" value={settings.virtualMechanicName || ''} onChange={handleChange} className="w-full p-3 glass-light border border-white/10 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-admin-accent transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-white mb-2">Assistant Avatar</label>
                                        <div className="flex items-center gap-4 p-4 glass-light rounded-xl border border-white/5">
                                            {settings.virtualMechanicImageUrl && <img src={settings.virtualMechanicImageUrl} alt="AI Avatar Preview" className="h-16 w-16 object-cover rounded-full border-2 border-admin-accent" />}
                                            <input type="file" name="virtualMechanicImageUrl" onChange={handleLogoChange} accept="image/*" className="text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-admin-accent file:text-white hover:file:bg-orange-600 transition-all cursor-pointer" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-white mb-2">System Instruction</label>
                                        <p className="text-xs text-gray-400 mb-2">Define the AI's personality and knowledge base.</p>
                                        <textarea name="virtualMechanicSystemInstruction" value={settings.virtualMechanicSystemInstruction || ''} onChange={handleChange} rows={8} className="w-full p-3 glass-light border border-white/10 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-admin-accent transition-all font-mono text-xs" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Notifications */}
                        {activeTab === 'notifications' && (
                            <div className="glass-dark p-6 rounded-2xl border border-white/10 space-y-6 animate-fadeIn">
                                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <Bell className="w-5 h-5 text-admin-accent" /> Notification Preferences
                                </h2>
                                <div className="space-y-4">
                                    <ToggleSwitch label="Email on Cancellation" enabled={settings.emailOnCancellation} onChange={(val) => handleLocalSettingsChange({ emailOnCancellation: val })} />
                                    <ToggleSwitch label="Email on New Booking" enabled={settings.emailOnNewBooking} onChange={(val) => handleLocalSettingsChange({ emailOnNewBooking: val })} />
                                </div>
                            </div>
                        )}

                        {/* Map Settings */}
                        {activeTab === 'map' && (
                            <div className="glass-dark p-6 rounded-2xl border border-white/10 space-y-6 animate-fadeIn">
                                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <Map className="w-5 h-5 text-admin-accent" /> Map Configuration
                                </h2>
                                <div>
                                    <label className="block text-sm font-semibold text-white mb-2">Default Mechanic Map Pin</label>
                                    <div className="flex items-center gap-4 p-4 glass-light rounded-xl border border-white/5">
                                        {settings.mechanicMarkerUrl && <img src={settings.mechanicMarkerUrl} alt="Map Pin Preview" className="h-10 w-auto object-contain" />}
                                        <input type="file" name="mechanicMarkerUrl" onChange={handleLogoChange} accept="image/*" className="text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-admin-accent file:text-white hover:file:bg-orange-600 transition-all cursor-pointer" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-white mb-2">Google Maps API Key</label>
                                    <input type="password" name="googleMapsApiKey" value={settings.googleMapsApiKey || ''} onChange={handleChange} className="w-full p-3 glass-light border border-white/10 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-admin-accent transition-all" placeholder="AIzaSy..." />
                                    <p className="text-xs text-gray-400 mt-1">Required for map functionality and address autocomplete.</p>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>

            {
                isRoleModalOpen && (
                    <RoleFormModal
                        role={editingRole}
                        onClose={() => setIsRoleModalOpen(false)}
                        onSave={handleSaveRole}
                        existingRoleNames={db.roles.map(r => r.name)}
                    />
                )
            }
        </div >
    );
};

export default AdminSettingsScreen;
