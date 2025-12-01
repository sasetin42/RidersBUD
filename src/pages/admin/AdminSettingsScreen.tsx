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
            <div className="space-y-6 p-2">
                <div>
                    <label className="text-sm font-bold text-gray-300 mb-2 block uppercase tracking-wider">Role Name</label>
                    <input
                        type="text"
                        value={formData.name}
                        readOnly={!!role?.isEditable === false}
                        onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className={`w-full p-4 glass-light border rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-admin-accent focus:border-admin-accent/50 transition-all ${errors.name ? 'border-red-500/50 focus:ring-red-500' : 'border-white/5'} ${!!role?.isEditable === false ? 'opacity-50 cursor-not-allowed' : ''}`}
                        placeholder="e.g. Manager"
                    />
                    {errors.name && <p className="text-red-400 text-xs mt-2 ml-1 flex items-center gap-1">⚠ {errors.name}</p>}
                </div>
                <div>
                    <label className="text-sm font-bold text-gray-300 mb-2 block uppercase tracking-wider">Description</label>
                    <input
                        type="text"
                        value={formData.description}
                        onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full p-4 glass-light border border-white/5 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-admin-accent focus:border-admin-accent/50 transition-all"
                        placeholder="Brief description of the role..."
                    />
                </div>

                <div className="border-t border-white/10 pt-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <span className="w-1 h-6 bg-admin-accent rounded-full"></span>
                        Default Permissions
                    </h3>
                    <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                        {modules.map(module => (
                            <div key={module} className="flex items-center justify-between glass-dark p-3 rounded-xl border border-white/5 hover:border-white/10 transition-all group">
                                <label className="text-sm font-medium capitalize text-gray-300 group-hover:text-white transition-colors">{module}</label>
                                <select
                                    value={formData.defaultPermissions[module] || 'none'}
                                    onChange={e => handlePermissionChange(module, e.target.value as PermissionLevel)}
                                    className="p-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white focus:ring-2 focus:ring-admin-accent focus:border-transparent outline-none cursor-pointer hover:bg-black/60 transition-colors"
                                >
                                    <option value="none" className="bg-gray-900">No Access</option>
                                    <option value="view" className="bg-gray-900">View Only</option>
                                    <option value="edit" className="bg-gray-900">View & Edit</option>
                                </select>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="mt-8 flex justify-end gap-4 border-t border-white/10 pt-6">
                <button onClick={onClose} className="px-6 py-3 glass-light border border-white/10 text-gray-300 rounded-xl hover:bg-white/5 hover:text-white transition-all font-medium">Cancel</button>
                <button onClick={handleSave} className="px-8 py-3 bg-gradient-to-r from-admin-accent to-orange-600 text-white rounded-xl hover:shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-all font-bold shadow-lg shadow-admin-accent/20">Save Role</button>
            </div>
        </Modal>
    );
};


const ToggleSwitch: React.FC<{ label: string; enabled: boolean; onChange: (enabled: boolean) => void; }> = ({ label, enabled, onChange }) => {
    return (
        <div className="flex items-center justify-between glass-dark p-4 rounded-xl border border-white/5 hover:border-white/10 transition-all group cursor-pointer" onClick={() => onChange(!enabled)}>
            <span className="text-gray-300 font-medium group-hover:text-white transition-colors">{label}</span>
            <button
                type="button"
                className={`${enabled ? 'bg-gradient-to-r from-admin-accent to-orange-500' : 'bg-gray-700'
                    } relative inline-flex h-7 w-12 items-center rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-admin-accent focus:ring-offset-2 focus:ring-offset-gray-900 shadow-inner`}
            >
                <span
                    className={`${enabled ? 'translate-x-6' : 'translate-x-1'
                        } inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform`}
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
        <div className="flex flex-col h-full overflow-hidden bg-gradient-dark relative">
            {/* Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-admin-accent/10 blur-[100px]"></div>
                <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-blue-500/5 blur-[100px]"></div>
            </div>

            {/* Header */}
            <div className="p-6 flex-shrink-0 flex flex-col sm:flex-row gap-4 justify-between sm:items-center border-b border-white/5 bg-black/20 backdrop-blur-md z-10">
                <div>
                    <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 tracking-tight">Settings</h1>
                    <p className="text-gray-400 text-sm mt-1 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-admin-accent animate-pulse"></span>
                        Manage your application configuration
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleSeedDatabase}
                        disabled={seeding}
                        className="glass-light border border-white/10 text-gray-300 font-medium py-2.5 px-5 rounded-xl hover:bg-white/5 hover:text-white transition-all disabled:opacity-50 flex items-center gap-2 group"
                    >
                        {seeding ? <Spinner size="sm" color="text-white" /> : <Database className="w-4 h-4 group-hover:text-admin-accent transition-colors" />}
                        <span>Seed DB</span>
                    </button>
                    {saveStatus === 'success' && (
                        <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-2.5 rounded-xl flex items-center gap-2 animate-fade-in shadow-glow-sm">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            <span className="font-medium">Saved!</span>
                        </div>
                    )}
                    {isDirty && (
                        <div className="flex items-center gap-3 animate-fade-in">
                            <button
                                onClick={handleReset}
                                disabled={saveStatus === 'saving'}
                                className="glass-light border border-white/10 text-gray-300 font-medium py-2.5 px-5 rounded-xl hover:bg-white/5 hover:text-white transition-all flex items-center gap-2"
                            >
                                <RotateCcw className="w-4 h-4" />
                                <span>Discard</span>
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={!canSave || saveStatus === 'saving'}
                                className="bg-gradient-to-r from-admin-accent to-orange-600 text-white font-bold py-2.5 px-6 rounded-xl hover:shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-admin-accent/20"
                            >
                                {saveStatus === 'saving' ? <Spinner size="sm" color="text-white" /> : <Save className="w-4 h-4" />}
                                <span>Save Changes</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden z-10">
                {/* Sidebar Tabs */}
                <div className="w-72 flex-shrink-0 border-r border-white/5 bg-black/20 overflow-y-auto custom-scrollbar p-4 space-y-2">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 px-2">Configuration</div>
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-medium text-sm group relative overflow-hidden ${activeTab === tab.id ? 'bg-gradient-to-r from-admin-accent/20 to-transparent text-white border border-admin-accent/20' : 'text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'}`}
                        >
                            {activeTab === tab.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-admin-accent rounded-r-full"></div>}
                            <tab.icon className={`w-5 h-5 transition-colors ${activeTab === tab.id ? 'text-admin-accent' : 'text-gray-500 group-hover:text-gray-300'}`} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-black/10">
                    <div className="max-w-5xl mx-auto space-y-8">

                        {/* General Settings */}
                        {activeTab === 'general' && (
                            <div className="glass-card p-8 space-y-8 animate-slide-up">
                                <div className="border-b border-white/10 pb-6">
                                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                        <div className="p-2 bg-admin-accent/20 rounded-lg">
                                            <SettingsIcon className="w-6 h-6 text-admin-accent" />
                                        </div>
                                        General Information
                                    </h2>
                                    <p className="text-gray-400 mt-2 ml-14">Basic details about your application and business.</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-bold text-gray-300 uppercase tracking-wider">Application Name</label>
                                        <input type="text" name="appName" value={settings.appName} onChange={handleChange} className={`w-full p-4 glass-light border rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-admin-accent focus:border-admin-accent/50 transition-all ${errors.appName ? 'border-red-500/50 focus:ring-red-500' : 'border-white/5'}`} placeholder="e.g. RidersBUD" />
                                        {errors.appName && <p className="text-red-400 text-xs mt-1 flex items-center gap-1">⚠ {errors.appName}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-bold text-gray-300 uppercase tracking-wider">Contact Email</label>
                                        <input type="email" name="contactEmail" value={settings.contactEmail} onChange={handleChange} className={`w-full p-4 glass-light border rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-admin-accent focus:border-admin-accent/50 transition-all ${errors.contactEmail ? 'border-red-500/50 focus:ring-red-500' : 'border-white/5'}`} placeholder="support@example.com" />
                                        {errors.contactEmail && <p className="text-red-400 text-xs mt-1 flex items-center gap-1">⚠ {errors.contactEmail}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-bold text-gray-300 uppercase tracking-wider">Contact Phone</label>
                                        <input type="tel" name="contactPhone" value={settings.contactPhone} onChange={handleChange} className="w-full p-4 glass-light border border-white/5 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-admin-accent focus:border-admin-accent/50 transition-all" placeholder="+1 (555) 000-0000" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-bold text-gray-300 uppercase tracking-wider">Business Address</label>
                                        <input type="text" name="address" value={settings.address} onChange={handleChange} className="w-full p-4 glass-light border border-white/5 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-admin-accent focus:border-admin-accent/50 transition-all" placeholder="123 Main St, City, Country" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Branding Settings */}
                        {activeTab === 'branding' && (
                            <div className="glass-card p-8 space-y-8 animate-slide-up">
                                <div className="border-b border-white/10 pb-6">
                                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                        <div className="p-2 bg-purple-500/20 rounded-lg">
                                            <Palette className="w-6 h-6 text-purple-400" />
                                        </div>
                                        Branding & Appearance
                                    </h2>
                                    <p className="text-gray-400 mt-2 ml-14">Customize the look and feel of your application.</p>
                                </div>
                                <div className="space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <label className="block text-sm font-bold text-gray-300 uppercase tracking-wider">Primary Application Logo</label>
                                            <p className="text-xs text-gray-500">Used on Splash, Login screens, and Invoices.</p>
                                            <div className="flex items-center gap-6 p-6 glass-light rounded-2xl border border-white/5 border-dashed hover:border-admin-accent/50 transition-all group">
                                                {settings.appLogoUrl ? (
                                                    <div className="relative">
                                                        <img src={settings.appLogoUrl} alt="App Logo Preview" className="h-24 w-auto object-contain bg-black/40 p-3 rounded-xl border border-white/10 shadow-lg" />
                                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                                                            <span className="text-xs text-white font-medium">Change</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="h-24 w-24 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
                                                        <span className="text-xs text-gray-500">No Logo</span>
                                                    </div>
                                                )}
                                                <div className="flex-1">
                                                    <input type="file" name="appLogoUrl" onChange={handleLogoChange} accept="image/*" className="block w-full text-sm text-gray-400 file:mr-4 file:py-2.5 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-admin-accent file:text-white hover:file:bg-orange-600 hover:file:shadow-lg hover:file:scale-105 transition-all cursor-pointer" />
                                                    <p className="text-xs text-gray-500 mt-2">Recommended: PNG with transparent background.</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="block text-sm font-bold text-gray-300 uppercase tracking-wider">Admin Sidebar Logo</label>
                                            <p className="text-xs text-gray-500">Displayed at the top of the admin sidebar.</p>
                                            <div className="flex items-center gap-6 p-6 glass-light rounded-2xl border border-white/5 border-dashed hover:border-admin-accent/50 transition-all group">
                                                {settings.adminSidebarLogoUrl ? (
                                                    <img src={settings.adminSidebarLogoUrl} alt="Admin Logo Preview" className="h-24 w-auto object-contain bg-black/40 p-3 rounded-xl border border-white/10 shadow-lg" />
                                                ) : (
                                                    <div className="h-24 w-24 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
                                                        <span className="text-xs text-gray-500">No Logo</span>
                                                    </div>
                                                )}
                                                <div className="flex-1">
                                                    <input type="file" name="adminSidebarLogoUrl" onChange={handleLogoChange} accept="image/*" className="block w-full text-sm text-gray-400 file:mr-4 file:py-2.5 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-admin-accent file:text-white hover:file:bg-orange-600 hover:file:shadow-lg hover:file:scale-105 transition-all cursor-pointer" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-bold text-gray-300 uppercase tracking-wider">Application Tagline</label>
                                        <input type="text" name="appTagline" value={settings.appTagline || ''} onChange={handleChange} className="w-full p-4 glass-light border border-white/5 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-admin-accent focus:border-admin-accent/50 transition-all" placeholder="e.g. Your Ride, Our Passion" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Booking Settings */}
                        {activeTab === 'booking' && (
                            <div className="glass-card p-8 space-y-8 animate-slide-up">
                                <div className="border-b border-white/10 pb-6">
                                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                        <div className="p-2 bg-blue-500/20 rounded-lg">
                                            <Calendar className="w-6 h-6 text-blue-400" />
                                        </div>
                                        Booking Configuration
                                    </h2>
                                    <p className="text-gray-400 mt-2 ml-14">Manage scheduling, slots, and cancellation policies.</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-bold text-gray-300 uppercase tracking-wider">Operating Hours Start</label>
                                        <input type="time" name="bookingStartTime" value={settings.bookingStartTime} onChange={handleChange} className="w-full p-4 glass-light border border-white/5 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-admin-accent focus:border-admin-accent/50 transition-all" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-bold text-gray-300 uppercase tracking-wider">Operating Hours End</label>
                                        <input type="time" name="bookingEndTime" value={settings.bookingEndTime} onChange={handleChange} className={`w-full p-4 glass-light border rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-admin-accent focus:border-admin-accent/50 transition-all ${errors.bookingEndTime ? 'border-red-500/50 focus:ring-red-500' : 'border-white/5'}`} />
                                        {errors.bookingEndTime && <p className="text-red-400 text-xs mt-1 flex items-center gap-1">⚠ {errors.bookingEndTime}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-bold text-gray-300 uppercase tracking-wider">Slot Duration (mins)</label>
                                        <input type="number" name="bookingSlotDuration" value={settings.bookingSlotDuration} onChange={handleChange} className={`w-full p-4 glass-light border rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-admin-accent focus:border-admin-accent/50 transition-all ${errors.bookingSlotDuration ? 'border-red-500/50 focus:ring-red-500' : 'border-white/5'}`} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-bold text-gray-300 uppercase tracking-wider">Max Bookings per Slot</label>
                                        <input type="number" name="maxBookingsPerSlot" value={settings.maxBookingsPerSlot} onChange={handleChange} className={`w-full p-4 glass-light border rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-admin-accent focus:border-admin-accent/50 transition-all ${errors.maxBookingsPerSlot ? 'border-red-500/50 focus:ring-red-500' : 'border-white/5'}`} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-bold text-gray-300 uppercase tracking-wider">Buffer Time (mins)</label>
                                        <input type="number" name="bookingBufferTime" value={settings.bookingBufferTime || 0} onChange={handleChange} className={`w-full p-4 glass-light border rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-admin-accent focus:border-admin-accent/50 transition-all ${errors.bookingBufferTime ? 'border-red-500/50 focus:ring-red-500' : 'border-white/5'}`} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-bold text-gray-300 uppercase tracking-wider">Advance Booking (Days)</label>
                                        <input type="number" name="advanceBookingDays" value={settings.advanceBookingDays || 0} onChange={handleChange} className={`w-full p-4 glass-light border rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-admin-accent focus:border-admin-accent/50 transition-all ${errors.advanceBookingDays ? 'border-red-500/50 focus:ring-red-500' : 'border-white/5'}`} />
                                    </div>
                                    <div className="md:col-span-2 space-y-2">
                                        <label className="block text-sm font-bold text-gray-300 uppercase tracking-wider">Cancellation Policy</label>
                                        <textarea name="cancellationPolicy" value={settings.cancellationPolicy || ''} onChange={handleChange} rows={4} className="w-full p-4 glass-light border border-white/5 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-admin-accent focus:border-admin-accent/50 transition-all" placeholder="Enter cancellation policy details..." />
                                    </div>
                                </div>
                                <div className="mt-8 border-t border-white/10 pt-8">
                                    <ToggleSwitch label="Email on New Booking" enabled={settings.emailOnNewBooking} onChange={(val) => handleLocalSettingsChange({ emailOnNewBooking: val })} />
                                </div>
                            </div>
                        )}

                        {/* Roles & Permissions */}
                        {activeTab === 'roles' && (
                            <div className="glass-card p-8 space-y-8 animate-slide-up">
                                <div className="border-b border-white/10 pb-6 flex justify-between items-center">
                                    <div>
                                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                            <div className="p-2 bg-green-500/20 rounded-lg">
                                                <Users className="w-6 h-6 text-green-400" />
                                            </div>
                                            Role Management
                                        </h2>
                                        <p className="text-gray-400 mt-2 ml-14">Define roles and their default permissions.</p>
                                    </div>
                                    <button onClick={() => { setEditingRole(undefined); setIsRoleModalOpen(true); }} className="px-6 py-3 bg-admin-accent/10 text-admin-accent border border-admin-accent/30 rounded-xl hover:bg-admin-accent hover:text-white hover:shadow-glow transition-all text-sm font-bold flex items-center gap-2">
                                        <span className="text-lg leading-none">+</span> Add Role
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                    {db.roles.map(role => (
                                        <div key={role.name} className="glass-light p-6 rounded-2xl flex items-center justify-between border border-white/5 hover:border-admin-accent/30 hover:bg-white/5 transition-all group">
                                            <div>
                                                <div className="flex items-center gap-3">
                                                    <h4 className="font-bold text-white text-lg">{role.name}</h4>
                                                    {!role.isEditable && <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-white/10 px-2 py-1 rounded-md border border-white/5">System</span>}
                                                </div>
                                                <p className="text-sm text-gray-400 mt-1">{role.description}</p>
                                            </div>
                                            {role.isEditable ? (
                                                <div className="flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => { setEditingRole(role); setIsRoleModalOpen(true); }} className="text-sm font-bold text-blue-400 hover:text-blue-300 transition-colors hover:underline">Edit</button>
                                                    <button onClick={() => handleDeleteRole(role.name)} className="text-sm font-bold text-red-400 hover:text-red-300 transition-colors hover:underline">Delete</button>
                                                </div>
                                            ) : (
                                                <div className="text-xs text-gray-600 italic px-3 py-1">Protected</div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* AI Assistant */}
                        {activeTab === 'ai' && (
                            <div className="glass-card p-8 space-y-8 animate-slide-up">
                                <div className="border-b border-white/10 pb-6">
                                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                        <div className="p-2 bg-pink-500/20 rounded-lg">
                                            <Bot className="w-6 h-6 text-pink-400" />
                                        </div>
                                        AI Assistant Configuration
                                    </h2>
                                    <p className="text-gray-400 mt-2 ml-14">Customize your virtual mechanic's persona.</p>
                                </div>
                                <div className="space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-2">
                                            <label className="block text-sm font-bold text-gray-300 uppercase tracking-wider">Assistant Name</label>
                                            <input type="text" name="virtualMechanicName" value={settings.virtualMechanicName || ''} onChange={handleChange} className="w-full p-4 glass-light border border-white/5 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-admin-accent focus:border-admin-accent/50 transition-all" placeholder="e.g. RidersBUD Bot" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-sm font-bold text-gray-300 uppercase tracking-wider">Assistant Avatar</label>
                                            <div className="flex items-center gap-6 p-4 glass-light rounded-xl border border-white/5">
                                                {settings.virtualMechanicImageUrl ? (
                                                    <img src={settings.virtualMechanicImageUrl} alt="AI Avatar Preview" className="h-16 w-16 object-cover rounded-full border-2 border-admin-accent shadow-glow-sm" />
                                                ) : (
                                                    <div className="h-16 w-16 rounded-full bg-white/10 flex items-center justify-center border border-white/10">
                                                        <Bot className="w-8 h-8 text-gray-500" />
                                                    </div>
                                                )}
                                                <input type="file" name="virtualMechanicImageUrl" onChange={handleLogoChange} accept="image/*" className="text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-admin-accent file:text-white hover:file:bg-orange-600 transition-all cursor-pointer" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-bold text-gray-300 uppercase tracking-wider">System Instruction</label>
                                        <p className="text-xs text-gray-500 mb-2">Define the AI's personality, tone, and knowledge base.</p>
                                        <textarea name="virtualMechanicSystemInstruction" value={settings.virtualMechanicSystemInstruction || ''} onChange={handleChange} rows={10} className="w-full p-4 glass-light border border-white/5 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-admin-accent focus:border-admin-accent/50 transition-all font-mono text-sm leading-relaxed" placeholder="You are a helpful assistant..." />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Notifications */}
                        {activeTab === 'notifications' && (
                            <div className="glass-card p-8 space-y-8 animate-slide-up">
                                <div className="border-b border-white/10 pb-6">
                                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                        <div className="p-2 bg-yellow-500/20 rounded-lg">
                                            <Bell className="w-6 h-6 text-yellow-400" />
                                        </div>
                                        Notification Preferences
                                    </h2>
                                    <p className="text-gray-400 mt-2 ml-14">Control when and how you receive alerts.</p>
                                </div>
                                <div className="space-y-6">
                                    <ToggleSwitch label="Email on Cancellation" enabled={settings.emailOnCancellation} onChange={(val) => handleLocalSettingsChange({ emailOnCancellation: val })} />
                                    <ToggleSwitch label="Email on New Booking" enabled={settings.emailOnNewBooking} onChange={(val) => handleLocalSettingsChange({ emailOnNewBooking: val })} />
                                </div>
                            </div>
                        )}

                        {/* Map Settings */}
                        {activeTab === 'map' && (
                            <div className="glass-card p-8 space-y-8 animate-slide-up">
                                <div className="border-b border-white/10 pb-6">
                                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                        <div className="p-2 bg-cyan-500/20 rounded-lg">
                                            <Map className="w-6 h-6 text-cyan-400" />
                                        </div>
                                        Map Configuration
                                    </h2>
                                    <p className="text-gray-400 mt-2 ml-14">Settings for the interactive map and location services.</p>
                                </div>
                                <div className="space-y-8">
                                    <div className="space-y-3">
                                        <label className="block text-sm font-bold text-gray-300 uppercase tracking-wider">Default Mechanic Map Pin</label>
                                        <div className="flex items-center gap-6 p-6 glass-light rounded-2xl border border-white/5 border-dashed">
                                            {settings.mechanicMarkerUrl ? (
                                                <img src={settings.mechanicMarkerUrl} alt="Map Pin Preview" className="h-12 w-auto object-contain drop-shadow-lg" />
                                            ) : (
                                                <div className="h-12 w-12 bg-white/5 rounded-lg flex items-center justify-center">
                                                    <Map className="w-6 h-6 text-gray-500" />
                                                </div>
                                            )}
                                            <input type="file" name="mechanicMarkerUrl" onChange={handleLogoChange} accept="image/*" className="text-sm text-gray-400 file:mr-4 file:py-2.5 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-admin-accent file:text-white hover:file:bg-orange-600 transition-all cursor-pointer" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-bold text-gray-300 uppercase tracking-wider">Google Maps API Key</label>
                                        <div className="relative">
                                            <input type="password" name="googleMapsApiKey" value={settings.googleMapsApiKey || ''} onChange={handleChange} className="w-full p-4 pl-12 glass-light border border-white/5 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-admin-accent focus:border-admin-accent/50 transition-all font-mono" placeholder="AIzaSy..." />
                                            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                                            Required for map functionality and address autocomplete.
                                        </p>
                                    </div>
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
