import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDatabase } from '../../context/DatabaseContext';
import { useNotification } from '../../context/NotificationContext';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { Settings, EmailTemplate, AppUpdateSettings } from '../../types';
import Spinner from '../../components/Spinner';
import { storageService } from '../../services/StorageService';
import { sendEmailWithDiagnostics } from '../../services/emailService';
import { DEFAULT_EMAIL_TEMPLATES, renderEmailTemplate } from '../../data/defaultEmailTemplates';
import { safeGetCurrentPosition, RIDERSBUD_STORE_LOCATION } from '../../utils/locationHelper';
import { DEFAULT_LATEST_APK_URL } from '../../services/AppUpdateService';
import { settingsService } from '../../services/settingsService';

import { SettingsDashboardHeader } from '../../components/admin/settings/SettingsOverviewHeader';
import { SettingsToolbar } from '../../components/admin/settings/SettingsToolbar';

import { GeneralSettingsTab } from '../../components/admin/settings/tabs/GeneralSettingsTab';
import { AppearanceSettingsTab } from '../../components/admin/settings/tabs/AppearanceSettingsTab';
import { PwaSettingsTab } from '../../components/admin/settings/tabs/PwaSettingsTab';
import { OperationsSettingsTab } from '../../components/admin/settings/tabs/OperationsSettingsTab';
import { ServicesSettingsTab } from '../../components/admin/settings/tabs/ServicesSettingsTab';
import { FinancialsSettingsTab } from '../../components/admin/settings/tabs/FinancialsSettingsTab';
import { NotificationsSettingsTab } from '../../components/admin/settings/tabs/NotificationsSettingsTab';
import { SmtpSettingsTab } from '../../components/admin/settings/tabs/SmtpSettingsTab';
import { EmailTemplatesTab } from '../../components/admin/settings/tabs/EmailTemplatesTab';
import { MapLocationSettingsTab } from '../../components/admin/settings/tabs/MapLocationSettingsTab';
import { VerificationSettingsTab } from '../../components/admin/settings/tabs/VerificationSettingsTab';
import { SupportSettingsTab } from '../../components/admin/settings/tabs/SupportSettingsTab';
import { SystemSettingsTab } from '../../components/admin/settings/tabs/SystemSettingsTab';
import { SecuritySettingsTab } from '../../components/admin/settings/tabs/SecuritySettingsTab';
import { AuditLogsTab } from '../../components/admin/settings/tabs/AuditLogsTab';
import { FilesMediaSettingsTab } from '../../components/admin/settings/tabs/FilesMediaSettingsTab';
import { BackupRestoreTab } from '../../components/admin/settings/tabs/BackupRestoreTab';
import { ApiIntegrationsTab } from '../../components/admin/settings/tabs/ApiIntegrationsTab';
import { WebhooksTab } from '../../components/admin/settings/tabs/WebhooksTab';
import { DataManagementTab } from '../../components/admin/settings/tabs/DataManagementTab';

import {
    Globe, Layout, Smartphone, Clock, DollarSign, Bell, Server, Sparkles, MapPin, 
    FileCheck, MessageSquare, Shield, Lock, History, HardDrive, 
    Download, Layers, Webhook, Database, ChevronRight, CheckCircle2, SlidersHorizontal
} from 'lucide-react';

type SettingsTab = 
    | 'general' 
    | 'appearance' 
    | 'pwa' 
    | 'operations' 
    | 'services'
    | 'financials' 
    | 'notifications' 
    | 'smtp' 
    | 'emailTemplates' 
    | 'maps' 
    | 'verification' 
    | 'support' 
    | 'system'
    | 'security'
    | 'auditLogs'
    | 'filesMedia'
    | 'backupRestore'
    | 'apiIntegrations'
    | 'webhooks'
    | 'dataManagement';

interface TabConfig {
    id: SettingsTab;
    label: string;
    icon: React.ReactNode;
    description: string;
    keywords: string[];
}

const TABS: TabConfig[] = [
    { id: 'general', label: 'General', icon: <Globe size={17} />, description: 'App identity & contacts', keywords: ['name', 'logo', 'favicon', 'address', 'timezone', 'language', 'avatar', 'social'] },
    { id: 'appearance', label: 'Appearance', icon: <Layout size={17} />, description: 'Logos & Branding', keywords: ['theme', 'dark', 'light', 'color', 'accent', 'css', 'radius', 'density'] },
    { id: 'pwa', label: 'Mobile Application', icon: <Smartphone size={17} />, description: 'App Icon, APK & Mobile System', keywords: ['pwa', 'install', 'splash', 'logo', 'mobile', 'apk', 'manifest', 'download', 'icon'] },
    { id: 'operations', label: 'Operations', icon: <Clock size={17} />, description: 'Booking logic & mechanics', keywords: ['booking', 'hours', 'slot', 'cancellation', 'radius', 'dispatch', 'modules'] },
    { id: 'services', label: 'Services Config', icon: <SlidersHorizontal size={17} />, description: 'Rental, Driver, Liaison & Towing', keywords: ['rental', 'driver', 'liaison', 'towing', 'rates', 'fees', 'car rental', 'driver for hire'] },
    { id: 'financials', label: 'Financials', icon: <DollarSign size={17} />, description: 'Currency, fees & HitPay', keywords: ['currency', 'vat', 'tax', 'hitpay', 'gcash', 'payout', 'fee', 'invoice'] },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={17} />, description: 'Alert preferences & triggers', keywords: ['email', 'sms', 'push', 'alert', 'chime', 'sound', 'channel'] },
    { id: 'smtp', label: 'SMTP Server', icon: <Server size={17} />, description: 'Email host & credentials', keywords: ['smtp', 'mail', 'port', 'host', 'tls', 'ssl', 'password'] },
    { id: 'emailTemplates', label: 'Email Templates', icon: <Sparkles size={17} />, description: 'Notification layouts & preview', keywords: ['template', 'html', 'variables', 'preview', 'subject'] },
    { id: 'maps', label: 'Map & Location', icon: <MapPin size={17} />, description: 'Google Maps API & routing', keywords: ['google', 'maps', 'key', 'gps', 'store', 'carmona', 'leaflet', 'tile'] },
    { id: 'verification', label: 'Verification', icon: <FileCheck size={17} />, description: 'Mechanic onboard docs', keywords: ['kyc', 'id', 'license', 'approval', 'otp', 'expiration'] },
    { id: 'support', label: 'Support', icon: <MessageSquare size={17} />, description: 'Live Chat & FAQ', keywords: ['faq', 'chat', 'sla', 'helpdesk', 'concierge', 'buddy'] },
    { id: 'system', label: 'System', icon: <Shield size={17} />, description: 'Maintenance & configuration', keywords: ['maintenance', 'cache', 'apk', 'ota', 'environment', 'debug', 'rate'] },
    { id: 'security', label: 'Security', icon: <Lock size={17} />, description: 'Access control & passwords', keywords: ['password', '2fa', 'lockout', 'session', 'logout', 'timeout'] },
    { id: 'auditLogs', label: 'Audit Logs', icon: <History size={17} />, description: 'Activity & change history', keywords: ['audit', 'history', 'log', 'changes', 'diff', 'trail'] },
    { id: 'filesMedia', label: 'Files & Media', icon: <HardDrive size={17} />, description: 'Upload size & compression', keywords: ['upload', 'size', 'webp', 'compression', 'cdn', 'storage'] },
    { id: 'backupRestore', label: 'Backup & Restore', icon: <Download size={17} />, description: 'Snapshots & recovery', keywords: ['backup', 'restore', 'snapshot', 'json', 'export', 'cron'] },
    { id: 'apiIntegrations', label: 'API & Integrations', icon: <Layers size={17} />, description: 'External cloud services', keywords: ['api', 'keys', 'semaphore', 'sms', 'thirdparty'] },
    { id: 'webhooks', label: 'Webhooks', icon: <Webhook size={17} />, description: 'Real-time event delivery', keywords: ['webhook', 'ping', 'endpoint', 'retry', 'http', 'events'] },
    { id: 'dataManagement', label: 'Data Management', icon: <Database size={17} />, description: 'CSV & JSON data exports', keywords: ['export', 'csv', 'json', 'data', 'mechanics', 'bookings'] },
];

const AdminSettingsScreen: React.FC = () => {
    const [searchParams] = useSearchParams();
    const { db, updateSettings, loading } = useDatabase();
    const { addNotification } = useNotification();
    const { adminUser, logout } = useAdminAuth();

    const paramTab = searchParams.get('tab') as SettingsTab | null;
    const initialTab: SettingsTab = paramTab && TABS.some(t => t.id === paramTab) ? paramTab : 'general';
    const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
    const [localSettings, setLocalSettings] = useState<Settings | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Update active tab if URL tab param changes
    useEffect(() => {
        const currentParamTab = searchParams.get('tab') as SettingsTab | null;
        if (currentParamTab && TABS.some(t => t.id === currentParamTab)) {
            setActiveTab(currentParamTab);
        }
    }, [searchParams]);

    const initialSettingsSnapshot = useRef<string>('');
    const contentTopRef = useRef<HTMLDivElement>(null);

    // Scroll smoothly to top on tab switch
    useEffect(() => {
        if (contentTopRef.current) {
            contentTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [activeTab]);

    // Synchronize local state with remote db
    useEffect(() => {
        if (db?.settings) {
            setLocalSettings((current) => {
                if (!current) {
                    initialSettingsSnapshot.current = JSON.stringify(db.settings);
                    return db.settings;
                }
                if (hasChanges) return current;
                initialSettingsSnapshot.current = JSON.stringify(db.settings);
                return db.settings;
            });
        }
    }, [db?.settings, hasChanges]);

    // Warn on navigation with unsaved changes
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasChanges]);

    // Global field update handler
    const handleFieldChange = (field: keyof Settings, value: any) => {
        if (!localSettings) return;
        setLocalSettings((prev) => (prev ? { ...prev, [field]: value } : null));
        setHasChanges(true);
    };

    const handleSocialChange = (network: 'facebook' | 'twitter' | 'instagram', url: string) => {
        if (!localSettings) return;
        const currentLinks = localSettings.socialLinks || {};
        setLocalSettings((prev) =>
            prev
                ? {
                      ...prev,
                      socialLinks: { ...currentLinks, [network]: url }
                  }
                : null
        );
        setHasChanges(true);
    };

    const defaultOperationalModules = [
        { id: 'rent-a-car', name: 'Rent a Car', enabled: true, bannerMessage: '' },
        { id: 'driver-for-hire', name: 'Driver for Hire', enabled: true, bannerMessage: '' },
        { id: 'liaison-assistance', name: 'Liaison Registration Assistance', enabled: true, bannerMessage: '' },
        { id: 'towing', name: 'Emergency Towing Service', enabled: true, bannerMessage: '' },
        { id: 'parts-store', name: 'Parts & Tools Store', enabled: true, bannerMessage: '' }
    ];

    const handleToggleModule = (moduleId: string) => {
        if (!localSettings) return;
        const currentSaved = localSettings.modules || [];
        const fullModules = defaultOperationalModules.map(defMod => {
            const match = currentSaved.find(m => m.id === defMod.id);
            return match ? { ...defMod, ...match } : defMod;
        });
        const updatedModules = fullModules.map((m) =>
            m.id === moduleId ? { ...m, enabled: !m.enabled } : m
        );
        setLocalSettings((prev) => (prev ? { ...prev, modules: updatedModules } : null));
        setHasChanges(true);
    };

    const handleModuleBannerChange = (moduleId: string, bannerMessage: string) => {
        if (!localSettings) return;
        const currentSaved = localSettings.modules || [];
        const fullModules = defaultOperationalModules.map(defMod => {
            const match = currentSaved.find(m => m.id === defMod.id);
            return match ? { ...defMod, ...match } : defMod;
        });
        const updatedModules = fullModules.map((m) =>
            m.id === moduleId ? { ...m, bannerMessage } : m
        );
        setLocalSettings((prev) => (prev ? { ...prev, modules: updatedModules } : null));
        setHasChanges(true);
    };

    // Asset Upload Handler
    const handleUploadAsset = async (e: React.ChangeEvent<HTMLInputElement>, field: keyof Settings) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const uploadPath = `settings/${field}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
            const downloadUrl = await storageService.uploadFile(uploadPath, file, true);

            setLocalSettings((prev) => (prev ? { ...prev, [field]: downloadUrl } : null));
            setHasChanges(true);
            await updateSettings({ [field]: downloadUrl });

            await settingsService.recordAuditLog({
                user: adminUser?.name || 'Super Admin',
                userEmail: adminUser?.email || 'admin@ridersbud.com',
                userRole: adminUser?.role || 'Super Admin',
                action: 'Updated',
                module: 'Appearance',
                details: `Uploaded new branding asset for ${String(field)}`,
                status: 'Success'
            });

            addNotification({
                type: 'success',
                title: 'Asset Uploaded',
                message: `Successfully uploaded and synchronized ${String(field)}.`,
                recipientId: 'admin'
            });
        } catch (err: any) {
            addNotification({
                type: 'error',
                title: 'Upload Failed',
                message: err.message || 'Could not upload file.',
                recipientId: 'admin'
            });
        }
    };

    const handleRemoveAsset = async (field: keyof Settings) => {
        setLocalSettings((prev) => (prev ? { ...prev, [field]: '' } : null));
        setHasChanges(true);
        await updateSettings({ [field]: '' });
        addNotification({
            type: 'info',
            title: 'Asset Removed',
            message: `Removed ${String(field)}. Default fallback will be displayed.`,
            recipientId: 'admin'
        });
    };

    // Store Location Actions
    const handleLocateStorePosition = () => {
        safeGetCurrentPosition(
            (pos) => {
                const lat = parseFloat(pos.coords.latitude.toFixed(6));
                const lng = parseFloat(pos.coords.longitude.toFixed(6));
                setLocalSettings((prev) => (prev ? { ...prev, storeLatitude: lat, storeLongitude: lng } : null));
                setHasChanges(true);
                addNotification({
                    type: 'success',
                    title: 'GPS Coordinates Captured',
                    message: `Store Hub origin locked at (${lat}, ${lng}).`,
                    recipientId: 'admin'
                });
            },
            (err) => {
                alert('Could not acquire GPS: ' + (err.message || 'Permission denied'));
            },
            { enableHighAccuracy: true }
        );
    };

    const handleResetStoreToDefault = () => {
        setLocalSettings((prev) =>
            prev
                ? {
                      ...prev,
                      address: RIDERSBUD_STORE_LOCATION.address,
                      storeName: RIDERSBUD_STORE_LOCATION.name,
                      storeAddress: RIDERSBUD_STORE_LOCATION.address,
                      storeLatitude: RIDERSBUD_STORE_LOCATION.lat,
                      storeLongitude: RIDERSBUD_STORE_LOCATION.lng,
                      storePhone: RIDERSBUD_STORE_LOCATION.phone
                  }
                : null
        );
        setHasChanges(true);
        addNotification({
            type: 'info',
            title: 'Store Hub Reset',
            message: 'Reset Parts & Tools Store to Carmona Commercial Center.',
            recipientId: 'admin'
        });
    };

    // App Update Handlers
    const handleUpdateAppConfigField = (field: keyof AppUpdateSettings, value: any) => {
        if (!localSettings) return;
        const current = localSettings.appUpdateConfig || {
            versionCode: 2,
            versionName: '1.0.1',
            apkUrl: DEFAULT_LATEST_APK_URL,
            releaseNotes: '',
            mandatory: false
        };
        const updated = { ...current, [field]: value, lastUpdated: new Date().toISOString() };
        setLocalSettings((prev) => (prev ? { ...prev, appUpdateConfig: updated } : null));
        setHasChanges(true);
    };

    const handleApkUploaded = async (downloadUrl: string, fileSizeMb: string) => {
        if (!localSettings) return;
        const current = localSettings.appUpdateConfig || {
            versionCode: 2,
            versionName: '1.0.1',
            apkUrl: DEFAULT_LATEST_APK_URL,
            releaseNotes: '',
            mandatory: false
        };
        const updated: AppUpdateSettings = {
            ...current,
            apkUrl: downloadUrl,
            fileSizeMb,
            lastUpdated: new Date().toISOString()
        };
        setLocalSettings((prev) => (prev ? { ...prev, appUpdateConfig: updated } : null));
        setHasChanges(true);
        await updateSettings({ appUpdateConfig: updated });
        addNotification({
            type: 'success',
            title: 'APK Published Live',
            message: `Over-the-air package update synchronized (${fileSizeMb}).`,
            recipientId: 'admin'
        });
    };

    // Save Changes Action
    const handleSave = async () => {
        if (!localSettings) return;
        setIsSaving(true);
        try {
            await updateSettings(localSettings);

            // Audit log the save
            await settingsService.recordAuditLog({
                user: adminUser?.name || 'Super Admin',
                userEmail: adminUser?.email || 'admin@ridersbud.com',
                userRole: adminUser?.role || 'Super Admin',
                action: 'Configuration Changed',
                module: 'Settings Center',
                details: 'Committed global system configuration update.',
                status: 'Success'
            });

            // Record Version safely
            try {
                settingsService.recordConfigVersion(
                    adminUser?.name || 'Super Admin',
                    Object.keys(localSettings),
                    localSettings
                );
            } catch (verErr) {
                console.warn('Could not record config version history:', verErr);
            }

            initialSettingsSnapshot.current = JSON.stringify(localSettings);
            setHasChanges(false);

            addNotification({
                type: 'success',
                title: 'Settings Saved',
                message: 'All system configurations successfully written to Firestore database.',
                recipientId: 'admin'
            });
        } catch (err: any) {
            addNotification({
                type: 'error',
                title: 'Save Failed',
                message: err.message || 'Error saving settings.',
                recipientId: 'admin'
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveAndContinue = async () => {
        await handleSave();
        const currentIndex = TABS.findIndex((t) => t.id === activeTab);
        if (currentIndex < TABS.length - 1) {
            setActiveTab(TABS[currentIndex + 1].id);
        }
    };

    const handleResetSection = () => {
        if (initialSettingsSnapshot.current) {
            setLocalSettings(JSON.parse(initialSettingsSnapshot.current));
            setHasChanges(false);
            addNotification({
                type: 'info',
                title: 'Changes Reverted',
                message: 'Discarded unsaved edits in current session.',
                recipientId: 'admin'
            });
        }
    };

    const handleRestoreDefaults = () => {
        if (!window.confirm('Restore system defaults? Current custom values will be reset.')) return;
        if (db?.settings) {
            setLocalSettings(db.settings);
            setHasChanges(false);
        }
    };

    // Send Live Test Email
    const handleSendTestEmail = async (templateId: string, targetEmail: string) => {
        if (!localSettings) return;
        
        // Dynamically render actual template subject & body
        let subject = `[RidersBUD Test] Preview: ${templateId}`;
        let htmlBody = `<p>Test email dispatched from RidersBUD Admin Control Center.</p>`;
        
        try {
            const template = localSettings.emailTemplates?.[templateId] || DEFAULT_EMAIL_TEMPLATES[templateId];
            if (template) {
                const sampleData = {
                    customerName: 'Juan Dela Cruz',
                    customerPhone: '0917-555-0199',
                    customerEmail: targetEmail,
                    bookingId: 'RB-TEST-8801',
                    serviceName: 'Comprehensive Auto Care Inspection',
                    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                    time: '10:00 AM',
                    totalAmount: '2,500.00',
                    paymentMethod: 'HitPay (GCash / Card)',
                    pickupLocation: 'BGC, Taguig City, Metro Manila',
                    mechanicName: 'Master Tech Carlo Santos',
                    vehicleName: 'Toyota Fortuner 2.8 V'
                };
                const rendered = renderEmailTemplate(template, sampleData, localSettings);
                subject = rendered.subject;
                htmlBody = rendered.html;
            }
        } catch (_) {}

        const res = await sendEmailWithDiagnostics(
            targetEmail,
            subject,
            htmlBody,
            localSettings
        );
        if (res.success) {
            addNotification({
                type: 'success',
                title: 'Test Email Delivered',
                message: `Delivered test to ${targetEmail}`,
                recipientId: 'admin'
            });
        } else {
            addNotification({
                type: 'error',
                title: 'Test Email Failed',
                message: res.message || 'Check SMTP configuration.',
                recipientId: 'admin'
            });
        }
    };

    // Filtered tabs based on global search
    const filteredTabs = useMemo(() => {
        if (!searchQuery.trim()) return TABS;
        const q = searchQuery.toLowerCase();
        return TABS.filter(
            (t) =>
                t.label.toLowerCase().includes(q) ||
                t.description.toLowerCase().includes(q) ||
                t.keywords.some((k) => k.includes(q))
        );
    }, [searchQuery]);

    if (loading || !localSettings) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] space-y-4">
                <Spinner size="lg" color="text-primary" />
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest animate-pulse">
                    Synchronizing Enterprise Settings...
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full space-y-6 animate-fadeIn pb-16">
            <div ref={contentTopRef} />

            {/* Top Title & Configuration Dashboard */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0">
                <div>
                    <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tighter leading-none">
                        Settings
                    </h1>
                    <div className="flex items-center gap-2 mt-3">
                        <div className="h-1 w-12 bg-primary rounded-full" />
                        <p className="text-gray-500 font-black tracking-[0.3em] text-[10px] uppercase">
                            Central SaaS Control Center
                        </p>
                    </div>
                </div>
            </div>

            {/* Settings Overview Status Header & Global Search */}
            <SettingsDashboardHeader
                settings={localSettings}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onNavigateTab={(tab) => setActiveTab(tab as SettingsTab)}
                hasChanges={hasChanges}
            />

            {/* Main Navigation & Workspace Layout */}
            <div className="flex flex-col lg:flex-row gap-6 h-full min-h-0 items-start">
                {/* Responsive Sticky Sidebar Navigation */}
                <div className="w-full lg:w-80 flex-shrink-0 space-y-2 lg:sticky lg:top-6 max-h-[85vh] overflow-y-auto pr-1 custom-scrollbar">
                    {filteredTabs.length === 0 ? (
                        <div className="p-5 text-center text-xs text-gray-500 bg-black/40 rounded-2xl border border-white/5">
                            No matching settings tabs found.
                        </div>
                    ) : (
                        filteredTabs.map((tab) => {
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center gap-3.5 p-4 rounded-2xl transition-all duration-200 border text-left group relative overflow-hidden ${
                                        isActive
                                            ? 'bg-primary/10 border-primary/30 text-white shadow-lg shadow-primary/10'
                                            : 'bg-[#121212]/50 border-white/5 text-gray-400 hover:bg-[#161616] hover:text-white'
                                    }`}
                                >
                                    <div
                                        className={`p-2.5 rounded-xl transition-colors ${
                                            isActive
                                                ? 'bg-primary text-white shadow-md shadow-primary/40'
                                                : 'bg-black/50 text-gray-400 group-hover:text-white group-hover:bg-white/10'
                                        }`}
                                    >
                                        {tab.icon}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3
                                            className={`font-black text-xs uppercase tracking-wider ${
                                                isActive ? 'text-white' : 'text-gray-300 group-hover:text-white'
                                            }`}
                                        >
                                            {tab.label}
                                        </h3>
                                        <p className="text-[10px] text-gray-500 truncate font-medium mt-0.5">
                                            {tab.description}
                                        </p>
                                    </div>
                                    {isActive && (
                                        <ChevronRight size={15} className="text-primary flex-shrink-0 ml-1" />
                                    )}
                                </button>
                            );
                        })
                    )}
                </div>

                {/* Content Area */}
                <div className="flex-1 w-full bg-[#121212]/80 backdrop-blur-xl border border-white/10 rounded-[2.5rem] shadow-2xl p-5 sm:p-8 min-h-[600px]">
                    {/* Active Tab Header */}
                    <div className="mb-6 pb-4 border-b border-white/10 flex items-center justify-between gap-4">
                        <div>
                            <span className="text-[10px] uppercase font-black tracking-widest text-primary">Configuration Domain</span>
                            <h2 className="text-2xl font-black text-white tracking-tight capitalize">
                                {TABS.find((t) => t.id === activeTab)?.label} Settings
                            </h2>
                        </div>

                        <span className="text-xs font-mono text-gray-500 hidden sm:inline">
                            [{activeTab}]
                        </span>
                    </div>

                    {/* Modular Tab Content Rendering */}
                    {activeTab === 'general' && (
                        <GeneralSettingsTab
                            settings={localSettings}
                            onChange={handleFieldChange}
                            onSocialChange={handleSocialChange}
                            onUploadAsset={handleUploadAsset}
                            onRemoveAsset={handleRemoveAsset}
                            onLocateStorePosition={handleLocateStorePosition}
                            onResetStoreToDefault={handleResetStoreToDefault}
                        />
                    )}

                    {activeTab === 'appearance' && (
                        <AppearanceSettingsTab
                            settings={localSettings}
                            onChange={handleFieldChange}
                            onUploadAsset={handleUploadAsset}
                            onRemoveAsset={handleRemoveAsset}
                        />
                    )}

                    {activeTab === 'pwa' && (
                        <PwaSettingsTab
                            settings={localSettings}
                            onChange={handleFieldChange}
                            onUploadAsset={handleUploadAsset}
                            onRemoveAsset={handleRemoveAsset}
                        />
                    )}

                    {activeTab === 'operations' && (
                        <OperationsSettingsTab
                            settings={localSettings}
                            onChange={handleFieldChange}
                            onToggleModule={handleToggleModule}
                            onModuleBannerChange={handleModuleBannerChange}
                        />
                    )}

                    {activeTab === 'services' && (
                        <ServicesSettingsTab
                            settings={localSettings}
                            onChange={handleFieldChange}
                            initialService={(searchParams.get('service') as any) || undefined}
                        />
                    )}

                    {activeTab === 'financials' && (
                        <FinancialsSettingsTab
                            settings={localSettings}
                            onChange={handleFieldChange}
                            onUploadAsset={handleUploadAsset}
                        />
                    )}

                    {activeTab === 'notifications' && (
                        <NotificationsSettingsTab
                            settings={localSettings}
                            onChange={handleFieldChange}
                        />
                    )}

                    {activeTab === 'smtp' && (
                        <SmtpSettingsTab
                            settings={localSettings}
                            onChange={handleFieldChange}
                            onSave={handleSave}
                        />
                    )}


                    {activeTab === 'emailTemplates' && (
                        <EmailTemplatesTab
                            settings={localSettings}
                            onChange={handleFieldChange}
                            onSendTest={handleSendTestEmail}
                        />
                    )}

                    {activeTab === 'maps' && (
                        <MapLocationSettingsTab
                            settings={localSettings}
                            onChange={handleFieldChange}
                            onLocateStorePosition={handleLocateStorePosition}
                            onResetStoreToDefault={handleResetStoreToDefault}
                        />
                    )}

                    {activeTab === 'verification' && (
                        <VerificationSettingsTab
                            settings={localSettings}
                            onChange={handleFieldChange}
                        />
                    )}

                    {activeTab === 'support' && (
                        <SupportSettingsTab
                            settings={localSettings}
                            onChange={handleFieldChange}
                        />
                    )}

                    {activeTab === 'system' && (
                        <SystemSettingsTab
                            settings={localSettings}
                            onChange={handleFieldChange}
                            onUpdateAppConfigField={handleUpdateAppConfigField}
                            onApkUploaded={handleApkUploaded}
                        />
                    )}

                    {activeTab === 'security' && (
                        <SecuritySettingsTab
                            settings={localSettings}
                            onChange={handleFieldChange}
                            onForceLogoutAll={async () => {
                                logout();
                            }}
                        />
                    )}

                    {activeTab === 'auditLogs' && (
                        <AuditLogsTab adminEmail={adminUser?.email || 'admin@ridersbud.com'} />
                    )}

                    {activeTab === 'filesMedia' && (
                        <FilesMediaSettingsTab
                            settings={localSettings}
                            onChange={handleFieldChange}
                        />
                    )}

                    {activeTab === 'backupRestore' && (
                        <BackupRestoreTab
                            settings={localSettings}
                            onChange={handleFieldChange}
                            adminEmail={adminUser?.email || 'admin@ridersbud.com'}
                            onSettingsRestored={async (newSettings) => {
                                setLocalSettings((prev) => (prev ? { ...prev, ...newSettings } : (newSettings as Settings)));
                                setHasChanges(true);
                                await updateSettings(newSettings);
                            }}
                        />
                    )}

                    {activeTab === 'apiIntegrations' && (
                        <ApiIntegrationsTab
                            settings={localSettings}
                            onChange={handleFieldChange}
                        />
                    )}

                    {activeTab === 'webhooks' && (
                        <WebhooksTab
                            settings={localSettings}
                            onChange={handleFieldChange}
                        />
                    )}

                    {activeTab === 'dataManagement' && (
                        <DataManagementTab adminEmail={adminUser?.email || 'admin@ridersbud.com'} />
                    )}

                    {/* Sticky Save & Action Toolbar */}
                    <SettingsToolbar
                        hasChanges={hasChanges}
                        isSaving={isSaving}
                        onSave={handleSave}
                        onSaveAndContinue={handleSaveAndContinue}
                        onResetSection={handleResetSection}
                        onRestoreDefaults={handleRestoreDefaults}
                    />
                </div>
            </div>
        </div>
    );
};

export default AdminSettingsScreen;
