import React, { useState, useEffect, useRef } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { useNotification } from '../../context/NotificationContext';
import { Settings, EmailTemplate } from '../../types';
import Spinner from '../../components/Spinner';
import { storageService } from '../../services/StorageService';
import { sendEmail } from '../../services/emailService';
import { DEFAULT_EMAIL_TEMPLATES, renderEmailTemplate } from '../../data/defaultEmailTemplates';
import { LEAFLET_TILE_PROVIDERS, getLeafletTileConfig } from '../../utils/mapTileProviders';
import { safeGetCurrentPosition } from '../../utils/locationHelper';
import {
    Save, Globe, Clock, DollarSign, Bell, Shield, Upload, Image as ImageIcon,
    Layout, Smartphone, Wrench, CreditCard, Mail, FileCheck, Plus, Trash2, User,
    AlertTriangle, Check, RefreshCw, Facebook, Twitter, Instagram, ChevronRight, MessageSquare, HelpCircle,
    MapPin, Map, Navigation, Eye, EyeOff, Code, Send, FileText, Sparkles, Copy, RotateCcw, ExternalLink,
    Server, Layers, Compass, Crosshair, Activity, Sliders, Maximize2, LocateFixed
} from 'lucide-react';

declare const L: any;

type SettingsTab = 'general' | 'appearance' | 'bookings' | 'financials' | 'notifications' | 'smtp' | 'emailTemplates' | 'maps' | 'verification' | 'support' | 'system';

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
    { id: 'notifications', label: 'Notifications', icon: <Bell size={18} />, description: 'Alert preferences & triggers' },
    { id: 'smtp', label: 'SMTP Server', icon: <Server size={18} />, description: 'Email host & credentials' },
    { id: 'emailTemplates', label: 'Email Templates', icon: <Sparkles size={18} />, description: 'Notification layouts & preview' },
    { id: 'maps', label: 'Map & Location', icon: <MapPin size={18} />, description: 'Google Maps API & routing' },
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

    const [showGoogleMapsApiKey, setShowGoogleMapsApiKey] = useState(false);
    const [isTestingGoogleMaps, setIsTestingGoogleMaps] = useState(false);
    const [googleMapsTestResult, setGoogleMapsTestResult] = useState<{success: boolean, message: string} | null>(null);

    // Email Templates State
    const [selectedEmailTemplateId, setSelectedEmailTemplateId] = useState<string>('booking_confirmed');
    const [emailTemplateFilter, setEmailTemplateFilter] = useState<string>('All');
    const [templateTabMode, setTemplateTabMode] = useState<'edit' | 'preview'>('edit');
    const [templateTestEmail, setTemplateTestEmail] = useState<string>('');
    const [isTestingTemplate, setIsTestingTemplate] = useState<boolean>(false);
    const [templateTestFeedback, setTemplateTestFeedback] = useState<{ success: boolean; message: string } | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const getEffectiveTemplate = (templateId: string): EmailTemplate => {
        if (localSettings?.emailTemplates?.[templateId]) {
            return localSettings.emailTemplates[templateId];
        }
        return DEFAULT_EMAIL_TEMPLATES[templateId] || {
            id: templateId,
            name: 'Custom Template',
            category: 'Operations',
            subject: '',
            body: '',
            enabled: true,
            variables: [],
            description: ''
        };
    };

    const handleTemplateSubjectChange = (templateId: string, subject: string) => {
        if (!localSettings) return;
        const currentTemplate = getEffectiveTemplate(templateId);
        const updatedTemplate: EmailTemplate = {
            ...currentTemplate,
            subject,
            updatedAt: new Date().toISOString()
        };
        const updatedTemplates = {
            ...(localSettings.emailTemplates || {}),
            [templateId]: updatedTemplate
        };
        setLocalSettings(prev => prev ? { ...prev, emailTemplates: updatedTemplates } : null);
        setHasChanges(true);
    };

    const handleTemplateBodyChange = (templateId: string, body: string) => {
        if (!localSettings) return;
        const currentTemplate = getEffectiveTemplate(templateId);
        const updatedTemplate: EmailTemplate = {
            ...currentTemplate,
            body,
            updatedAt: new Date().toISOString()
        };
        const updatedTemplates = {
            ...(localSettings.emailTemplates || {}),
            [templateId]: updatedTemplate
        };
        setLocalSettings(prev => prev ? { ...prev, emailTemplates: updatedTemplates } : null);
        setHasChanges(true);
    };

    const handleTemplateToggle = (templateId: string) => {
        if (!localSettings) return;
        const currentTemplate = getEffectiveTemplate(templateId);
        const updatedTemplate: EmailTemplate = {
            ...currentTemplate,
            enabled: !currentTemplate.enabled,
            updatedAt: new Date().toISOString()
        };
        const updatedTemplates = {
            ...(localSettings.emailTemplates || {}),
            [templateId]: updatedTemplate
        };
        setLocalSettings(prev => prev ? { ...prev, emailTemplates: updatedTemplates } : null);
        setHasChanges(true);
    };

    const handleInsertVariable = (variableTag: string) => {
        if (!textareaRef.current || !localSettings) return;
        const textarea = textareaRef.current;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const currentTemplate = getEffectiveTemplate(selectedEmailTemplateId);
        const currentBody = currentTemplate.body;
        const placeholder = `{{${variableTag}}}`;
        const newBody = currentBody.substring(0, start) + placeholder + currentBody.substring(end);
        
        handleTemplateBodyChange(selectedEmailTemplateId, newBody);

        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
        }, 50);
    };

    const handleResetTemplateToDefault = (templateId: string) => {
        if (!localSettings) return;
        const defaultTpl = DEFAULT_EMAIL_TEMPLATES[templateId];
        if (!defaultTpl) return;
        const updatedTemplates = {
            ...(localSettings.emailTemplates || {}),
            [templateId]: { ...defaultTpl }
        };
        setLocalSettings(prev => prev ? { ...prev, emailTemplates: updatedTemplates } : null);
        setHasChanges(true);
        addNotification({
            type: 'info',
            title: 'Template Reset',
            message: `"${defaultTpl.name}" has been restored to factory default settings.`,
            recipientId: 'admin'
        });
    };

    const handleSendTemplateTest = async (templateId: string) => {
        if (!localSettings) return;
        const targetEmail = templateTestEmail.trim() || localSettings.contactEmail || localSettings.smtpUsername;
        if (!targetEmail) {
            setTemplateTestFeedback({ success: false, message: 'Please provide a valid recipient email address.' });
            return;
        }

        setIsTestingTemplate(true);
        setTemplateTestFeedback(null);

        const activeTemplate = getEffectiveTemplate(templateId);

        const sampleData: Record<string, any> = {
            customerName: 'Juan Dela Cruz',
            customerPhone: '0917-888-9999',
            customerEmail: targetEmail,
            bookingId: 'BK-8942',
            serviceName: 'Comprehensive PMS & Engine Checkup',
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            time: '10:00 AM',
            totalAmount: '4,500.00',
            totalPaid: '4,500.00',
            paymentMethod: 'Online Payment (HitPay)',
            pickupLocation: 'BGC Taguig, Metro Manila',
            destination: 'Makati Central Business District',
            driverName: 'Ricardo Dalisay',
            driverPhone: '0918-555-1234',
            mechanicName: 'Master Tech Roberto',
            mechanicPhone: '0919-444-5678',
            vehicleInfo: 'Toyota Vios 2022 (Plate: ABC 1234)',
            eta: '25 mins',
            status: 'Mechanic En Route',
            reason: 'Customer requested schedule adjustment',
            refundStatus: 'Full Refund Initiated (₱4,500.00)',
            orderId: 'ORD-7721',
            itemsList: 'Synthetic Motor Oil 4L (x1), Oil Filter (x1), Brake Pads Set (x1)',
            deliveryAddress: 'Unit 402, Tower 1, Fort Victoria, BGC Taguig',
            loginUrl: `${window.location.origin}/mechanic-portal`,
            onboardingNotes: 'Your submitted LTO license and mechanic certifications have passed our compliance verification.',
            userEmail: targetEmail,
            feedbackUrl: `${window.location.origin}/customer-portal/booking-history`,
            completionDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        };

        try {
            const { subject, html } = renderEmailTemplate(activeTemplate, sampleData, localSettings);
            const success = await sendEmail(targetEmail, subject, html, localSettings);
            if (success) {
                setTemplateTestFeedback({ success: true, message: `Test email for "${activeTemplate.name}" sent to ${targetEmail}!` });
                addNotification({
                    type: 'success',
                    title: 'Test Email Sent',
                    message: `Test email for "${activeTemplate.name}" successfully sent to ${targetEmail}.`,
                    recipientId: 'admin'
                });
            } else {
                setTemplateTestFeedback({ success: false, message: 'Failed to send test email. Please check your SMTP settings.' });
            }
        } catch (err: any) {
            setTemplateTestFeedback({ success: false, message: err?.message || 'Error occurred while sending test email.' });
        } finally {
            setIsTestingTemplate(false);
        }
    };

    const adminMapRef = useRef<HTMLDivElement>(null);
    const adminMapInstanceRef = useRef<any>(null);
    const adminTileLayerRef = useRef<any>(null);
    const adminMarkerRef = useRef<any>(null);
    const adminLiveMarkersLayerRef = useRef<any>(null);

    // Initialize or update Admin Leaflet Dispatch Map
    useEffect(() => {
        if (activeTab !== 'maps' || !adminMapRef.current || typeof L === 'undefined') return;

        const centerLat = localSettings?.defaultMapCenterLat ?? 14.5995;
        const centerLng = localSettings?.defaultMapCenterLng ?? 120.9842;
        const zoom = localSettings?.defaultMapZoom ?? 13;
        const provider = localSettings?.leafletTileProvider || 'osm-dark';

        if (!adminMapInstanceRef.current) {
            const map = L.map(adminMapRef.current, {
                center: [centerLat, centerLng],
                zoom: zoom,
                zoomControl: true,
                scrollWheelZoom: true,
            });

            if (provider === 'osm-dark') {
                adminMapRef.current.classList.add('leaflet-dark-tiles');
            } else {
                adminMapRef.current.classList.remove('leaflet-dark-tiles');
            }

            const tileConfig = getLeafletTileConfig(localSettings);
            adminTileLayerRef.current = L.tileLayer(tileConfig.url, tileConfig.options).addTo(map);

            adminLiveMarkersLayerRef.current = L.layerGroup().addTo(map);

            const pinIcon = L.divIcon({
                html: `
                    <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
                        <div style="position: absolute; inset: 0; border-radius: 9999px; background: rgba(255, 107, 0, 0.35); animation: rb-ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                        <div style="position: relative; width: 34px; height: 34px; border-radius: 9999px; background: #FF6B00; border: 3px solid #ffffff; box-shadow: 0 4px 16px rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; color: #ffffff;">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                        </div>
                    </div>
                `,
                className: 'rb-leaflet-icon',
                iconSize: [44, 44],
                iconAnchor: [22, 22],
            });

            const marker = L.marker([centerLat, centerLng], {
                draggable: true,
                icon: pinIcon
            }).addTo(map);

            marker.bindPopup(`
                <div style="padding: 10px; font-family: sans-serif; color: #fff; min-width: 180px;">
                    <div style="font-weight: 800; font-size: 13px; color: #FE7803; margin-bottom: 4px;">📍 Central Dispatch Hub</div>
                    <div style="font-size: 11px; color: #9ca3af; margin-bottom: 6px;">Default Regional Anchor</div>
                    <div style="font-size: 10px; font-mono: monospace; color: #e5e7eb;">Lat: ${centerLat.toFixed(4)}, Lng: ${centerLng.toFixed(4)}</div>
                </div>
            `);

            marker.on('dragend', (e: any) => {
                const pos = e.target.getLatLng();
                const lat = parseFloat(pos.lat.toFixed(6));
                const lng = parseFloat(pos.lng.toFixed(6));
                setLocalSettings(prev => prev ? {
                    ...prev,
                    defaultMapCenterLat: lat,
                    defaultMapCenterLng: lng
                } : null);
                setHasChanges(true);
            });

            map.on('click', (e: any) => {
                const pos = e.latlng;
                const lat = parseFloat(pos.lat.toFixed(6));
                const lng = parseFloat(pos.lng.toFixed(6));
                marker.setLatLng([lat, lng]);
                setLocalSettings(prev => prev ? {
                    ...prev,
                    defaultMapCenterLat: lat,
                    defaultMapCenterLng: lng
                } : null);
                setHasChanges(true);
            });

            map.on('zoomend', () => {
                const newZoom = map.getZoom();
                setLocalSettings(prev => prev ? { ...prev, defaultMapZoom: newZoom } : null);
                setHasChanges(true);
            });

            adminMapInstanceRef.current = map;
            adminMarkerRef.current = marker;

            setTimeout(() => {
                if (adminMapInstanceRef.current) {
                    adminMapInstanceRef.current.invalidateSize();
                }
            }, 250);
        } else {
            if (provider === 'osm-dark') {
                adminMapRef.current.classList.add('leaflet-dark-tiles');
            } else {
                adminMapRef.current.classList.remove('leaflet-dark-tiles');
            }

            if (adminTileLayerRef.current) {
                adminMapInstanceRef.current.removeLayer(adminTileLayerRef.current);
            }
            const tileConfig = getLeafletTileConfig(localSettings);
            adminTileLayerRef.current = L.tileLayer(tileConfig.url, tileConfig.options).addTo(adminMapInstanceRef.current);
            
            setTimeout(() => {
                if (adminMapInstanceRef.current) {
                    adminMapInstanceRef.current.invalidateSize();
                }
            }, 200);
        }

        // Render Real-Time Mechanics & Active Bookings on the Dispatch Map
        if (adminLiveMarkersLayerRef.current && db?.mechanics) {
            adminLiveMarkersLayerRef.current.clearLayers();

            db.mechanics.forEach(mechanic => {
                const isOnline = mechanic.status === 'Active';
                const mechIcon = L.divIcon({
                    html: `
                        <div class="rb-map-pin-wrapper ${isOnline ? 'pulse-available' : ''}">
                            <div class="rb-pin-circle ${isOnline ? '' : 'unavailable'}">
                                <img src="${mechanic.imageUrl || '/riders-logo.png'}" alt="${mechanic.name}" />
                            </div>
                            <div class="rb-pin-stem"></div>
                            <div class="rb-pin-dot"></div>
                        </div>
                    `,
                    className: 'rb-leaflet-icon',
                    iconSize: [44, 60],
                    iconAnchor: [22, 60],
                    popupAnchor: [0, -62],
                });

                const mechPopup = `
                    <div style="padding: 12px; font-family: sans-serif; color: #fff; min-width: 200px;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                            <img src="${mechanic.imageUrl || '/riders-logo.png'}" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover; border: 1.5px solid #FE7803;" />
                            <div>
                                <div style="font-weight: 800; font-size: 12px; color: #fff;">${mechanic.name}</div>
                                <span style="font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 99px; background: ${isOnline ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.1)'}; color: ${isOnline ? '#4ade80' : '#9ca3af'};">
                                    ${isOnline ? '● ONLINE' : 'OFFLINE'}
                                </span>
                            </div>
                        </div>
                        <div style="font-size: 11px; color: #9ca3af; margin-bottom: 4px;">★ ${mechanic.rating.toFixed(1)} &bull; ${mechanic.specializations?.slice(0, 2).join(', ') || 'General'}</div>
                        <div style="font-size: 10px; font-mono: monospace; color: #6b7280;">GPS: ${mechanic.lat.toFixed(4)}, ${mechanic.lng.toFixed(4)}</div>
                    </div>
                `;

                const mMarker = L.marker([mechanic.lat, mechanic.lng], { icon: mechIcon });
                mMarker.bindPopup(mechPopup);
                adminLiveMarkersLayerRef.current.addLayer(mMarker);
            });

            // Render Active Bookings
            if (db.bookings) {
                db.bookings.filter(b => b.status === 'In Progress' || b.status === 'Upcoming').forEach(booking => {
                    const bLat = booking.location?.lat || booking.customerCoordinates?.lat;
                    const bLng = booking.location?.lng || booking.customerCoordinates?.lng;
                    if (bLat && bLng) {
                        const bookIcon = L.divIcon({
                            html: `
                                <div class="rb-location-pin-wrapper">
                                    <div class="rb-location-circle">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                    </div>
                                    <div class="rb-location-stem"></div>
                                    <div class="rb-location-dot"></div>
                                </div>
                            `,
                            className: 'rb-leaflet-icon',
                            iconSize: [36, 54],
                            iconAnchor: [18, 54],
                            popupAnchor: [0, -56],
                        });

                        const bMarker = L.marker([bLat, bLng], { icon: bookIcon });
                        bMarker.bindPopup(`
                            <div style="padding: 10px; color: #fff; min-width: 180px;">
                                <div style="font-weight: 800; font-size: 12px; color: #60a5fa;">📋 Booking: ${booking.serviceType || 'Emergency Repair'}</div>
                                <div style="font-size: 11px; color: #d1d5db; margin-top: 4px;">Customer: ${booking.customerName || 'Direct Booking'}</div>
                                <div style="font-size: 10px; color: #9ca3af; margin-top: 2px;">Status: <span style="color:#fbbf24;font-weight:bold;">${booking.status}</span></div>
                            </div>
                        `);
                        adminLiveMarkersLayerRef.current.addLayer(bMarker);
                    }
                });
            }
        }
    }, [activeTab, localSettings?.leafletTileProvider, localSettings?.leafletCustomTileUrl, localSettings?.leafletCustomAttribution, db?.mechanics, db?.bookings]);

    const handleLocateCurrentPosition = () => {
        safeGetCurrentPosition(
            (pos) => {
                const lat = parseFloat(pos.coords.latitude.toFixed(6));
                const lng = parseFloat(pos.coords.longitude.toFixed(6));
                setLocalSettings(prev => prev ? { ...prev, defaultMapCenterLat: lat, defaultMapCenterLng: lng } : null);
                setHasChanges(true);
                if (adminMarkerRef.current) adminMarkerRef.current.setLatLng([lat, lng]);
                if (adminMapInstanceRef.current) adminMapInstanceRef.current.setView([lat, lng], 15);
            },
            (err) => {
                console.warn('Geolocation error:', err?.message || 'Access denied');
            },
            { enableHighAccuracy: true }
        );
    };

    const handleTestGoogleMapsKey = async () => {
        if (!localSettings?.googleMapsApiKey) {
            setGoogleMapsTestResult({ success: false, message: 'Please enter a Google Maps API Key first.' });
            return;
        }
        setIsTestingGoogleMaps(true);
        setGoogleMapsTestResult(null);

        try {
            const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=Manila&key=${localSettings.googleMapsApiKey}`);
            const data = await res.json();
            if (data.status === 'OK' || data.status === 'ZERO_RESULTS') {
                setGoogleMapsTestResult({ success: true, message: 'Google Maps API Key is VALID and connected!' });
            } else {
                setGoogleMapsTestResult({ success: false, message: `Google Maps API Error: ${data.error_message || data.status}` });
            }
        } catch (err: any) {
            setGoogleMapsTestResult({ success: false, message: err.message || 'Failed to connect to Google Maps API server.' });
        } finally {
            setIsTestingGoogleMaps(false);
        }
    };

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

    const handleModuleToggle = (moduleId: string) => {
        if (!localSettings) return;
        const currentModules = localSettings.modules || [
            { id: 'rent-a-car', name: 'Rent a Car', enabled: true, bannerMessage: '' },
            { id: 'driver-for-hire', name: 'Driver for Hire', enabled: true, bannerMessage: '' },
            { id: 'liaison-assistance', name: 'Liaison Registration Assistance', enabled: true, bannerMessage: '' },
            { id: 'towing', name: 'Towing Service', enabled: true, bannerMessage: '' }
        ];
        const updatedModules = currentModules.map(m => 
            m.id === moduleId ? { ...m, enabled: !m.enabled } : m
        );
        setLocalSettings(prev => prev ? { ...prev, modules: updatedModules } : null);
        setHasChanges(true);
    };

    const handleModuleBannerChange = (moduleId: string, bannerMessage: string) => {
        if (!localSettings) return;
        const currentModules = localSettings.modules || [
            { id: 'rent-a-car', name: 'Rent a Car', enabled: true, bannerMessage: '' },
            { id: 'driver-for-hire', name: 'Driver for Hire', enabled: true, bannerMessage: '' },
            { id: 'liaison-assistance', name: 'Liaison Registration Assistance', enabled: true, bannerMessage: '' },
            { id: 'towing', name: 'Towing Service', enabled: true, bannerMessage: '' }
        ];
        const updatedModules = currentModules.map(m => 
            m.id === moduleId ? { ...m, bannerMessage } : m
        );
        setLocalSettings(prev => prev ? { ...prev, modules: updatedModules } : null);
        setHasChanges(true);
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
                addNotification({
                    type: 'success',
                    title: 'SMTP Test Successful',
                    message: 'Test email sent successfully to ' + (localSettings.contactEmail || 'your email') + '.',
                    recipientId: 'admin',
                });
            } else {
                setSmtpTestResult({ success: false, message: 'Failed to send test email. Please check your settings.' });
                addNotification({
                    type: 'error',
                    title: 'SMTP Test Failed',
                    message: 'Failed to send test email. Please check your host and credentials.',
                    recipientId: 'admin',
                });
            }
        } catch (error: any) {
            setSmtpTestResult({ success: false, message: error.message || 'An error occurred while sending the email.' });
            addNotification({
                type: 'error',
                title: 'SMTP Connection Error',
                message: error.message || 'An error occurred while sending test email.',
                recipientId: 'admin',
            });
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
                                         'Customer Header Logo',
                                         'customerHeaderLogoUrl',
                                         'Logo displayed in the top header bar for all Client/Customer screens.'
                                     )}
                                     {renderImageUpload(
                                         'Mechanic Header Logo',
                                         'mechanicHeaderLogoUrl',
                                         'Logo displayed in the top header bar for all Mechanic portal screens.'
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
                                    {renderImageUpload(
                                        'Email Template Logo',
                                        'emailLogoUrl',
                                        'Branded logo displayed prominently in all automated customer and admin email templates.'
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

                                    {/* Master HitPay Enable Switch */}
                                    {renderSwitch(
                                        'Enable HitPay Gateway',
                                        'hitpayEnabled',
                                        'Activate HitPay online payment gateway globally for bookings, orders, rentals, and services.'
                                    )}

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
                                <div>
                                    <h2 className="text-2xl font-black text-white flex items-center gap-3 tracking-tighter">
                                        <Bell className="text-primary" size={24} /> Notifications & Alerts
                                    </h2>
                                    <p className="text-gray-400 text-sm mt-1">
                                        Manage automated triggers and notification preferences across the platform.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-sm font-black uppercase tracking-wider text-gray-400">
                                        Operational Email Triggers
                                    </h3>
                                    <div className="grid grid-cols-1 gap-4">
                                        {renderSwitch('New Booking Alerts', 'emailOnNewBooking', 'Receive an email notification whenever a customer places a new service booking.')}
                                        {renderSwitch('Cancellation Alerts', 'emailOnCancellation', 'Receive an email notification when a booking is cancelled by a customer or mechanic.')}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/10">
                                    <div 
                                        onClick={() => setActiveTab('smtp')}
                                        className="p-5 rounded-2xl bg-[#16161A] border border-white/10 hover:border-primary/40 hover:bg-[#1A1A22] transition-all cursor-pointer group"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                                                    <Server size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="text-white font-bold text-base group-hover:text-primary transition-colors">SMTP Server Setup</h4>
                                                    <p className="text-xs text-gray-400">Host, ports, credentials & testing</p>
                                                </div>
                                            </div>
                                            <ChevronRight size={18} className="text-gray-500 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                        </div>
                                    </div>

                                    <div 
                                        onClick={() => setActiveTab('emailTemplates')}
                                        className="p-5 rounded-2xl bg-[#16161A] border border-white/10 hover:border-primary/40 hover:bg-[#1A1A22] transition-all cursor-pointer group"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                                                    <Sparkles size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="text-white font-bold text-base group-hover:text-primary transition-colors">Email Templates</h4>
                                                    <p className="text-xs text-gray-400">Customize layouts, variables & preview</p>
                                                </div>
                                            </div>
                                            <ChevronRight size={18} className="text-gray-500 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* SMTP SERVER SETTINGS */}
                        {activeTab === 'smtp' && (
                            <div className="space-y-8 animate-fadeIn">
                                <div>
                                    <h2 className="text-2xl font-black text-white flex items-center gap-3 tracking-tighter">
                                        <Server className="text-primary" size={24} /> SMTP Server Configuration
                                    </h2>
                                    <p className="text-gray-400 text-sm mt-1">
                                        Configure your SMTP settings to enable the system to send emails. These credentials are used to securely route emails through an HTTPS bridge.
                                    </p>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#16161A] border border-white/10 p-6 rounded-2xl">
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
                                                {showSmtpPassword ? <EyeOff size={18} /> : <Eye size={18} />}
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
                                
                                <div className="flex flex-col sm:flex-row items-center gap-4 bg-[#16161A] border border-white/10 p-6 rounded-2xl">
                                    <button 
                                        onClick={handleTestSmtp}
                                        disabled={isTestingSmtp || !localSettings?.smtpHost || !localSettings?.smtpUsername || !localSettings?.smtpPassword}
                                        className="px-6 py-3 bg-primary hover:bg-orange-600 text-white rounded-xl font-bold transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-primary/20"
                                    >
                                        {isTestingSmtp ? <Spinner size="sm" /> : <Mail size={18} />}
                                        Test SMTP Connection
                                    </button>
                                    {smtpTestResult && (
                                        <div className={`text-sm px-4 py-2.5 rounded-xl ${smtpTestResult.success ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                            {smtpTestResult.message}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* EMAIL NOTIFICATION TEMPLATES SETTINGS */}
                        {activeTab === 'emailTemplates' && (
                            <div className="space-y-8 animate-fadeIn">
                                <div>
                                    <h2 className="text-2xl font-black text-white flex items-center gap-3 tracking-tighter">
                                        <Sparkles className="text-primary" size={24} /> Email Notification Templates
                                    </h2>
                                    <p className="text-gray-400 text-sm mt-1">
                                        Customize, preview, and test-send dynamic system email notifications for all user lifecycle and operational events.
                                    </p>
                                </div>

                                {/* Category Filter Tabs */}
                                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                                    {['All', 'Bookings', 'Drivers & Fleet', 'E-Commerce', 'Accounts', 'Operations'].map((category) => (
                                        <button
                                            key={category}
                                            type="button"
                                            onClick={() => setEmailTemplateFilter(category)}
                                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
                                                emailTemplateFilter === category
                                                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                                                    : 'bg-[#16161A] text-gray-400 hover:text-white border border-white/5 hover:border-white/15'
                                            }`}
                                        >
                                            {category}
                                        </button>
                                    ))}
                                </div>

                                {/* Template Master-Detail Layout */}
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                                    {/* Left: Template List */}
                                    <div className="lg:col-span-4 space-y-2 max-h-[580px] overflow-y-auto pr-1 custom-scrollbar">
                                        {Object.keys(DEFAULT_EMAIL_TEMPLATES)
                                            .filter((key) => {
                                                const tpl = getEffectiveTemplate(key);
                                                if (emailTemplateFilter === 'All') return true;
                                                return tpl.category === emailTemplateFilter;
                                            })
                                            .map((key) => {
                                                const tpl = getEffectiveTemplate(key);
                                                const isSelected = selectedEmailTemplateId === key;
                                                return (
                                                    <div
                                                        key={key}
                                                        onClick={() => {
                                                            setSelectedEmailTemplateId(key);
                                                            setTemplateTestFeedback(null);
                                                        }}
                                                        className={`p-3 rounded-xl cursor-pointer transition-all border ${
                                                            isSelected
                                                                ? 'bg-[#1E1E24] border-primary/60 shadow-md shadow-primary/10 ring-1 ring-primary/40'
                                                                : 'bg-[#131317] border-white/5 hover:border-white/15 hover:bg-[#18181E]'
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between gap-1.5 mb-1.5">
                                                            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/5 text-gray-400 border border-white/5">
                                                                {tpl.category}
                                                            </span>
                                                            <span
                                                                className={`text-[9px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-1 ${
                                                                    tpl.enabled
                                                                        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                                                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                                                }`}
                                                            >
                                                                <span className={`w-1.5 h-1.5 rounded-full ${tpl.enabled ? 'bg-green-400' : 'bg-red-400'}`} />
                                                                {tpl.enabled ? 'Active' : 'Disabled'}
                                                            </span>
                                                        </div>
                                                        <h4 className="text-white font-bold text-xs tracking-tight mb-0.5">{tpl.name}</h4>
                                                        <p className="text-gray-400 text-[11px] line-clamp-2 leading-relaxed">{tpl.description}</p>
                                                    </div>
                                                );
                                            })}
                                    </div>

                                    {/* Right: Selected Template Editor & Preview */}
                                    {(() => {
                                        const activeTpl = getEffectiveTemplate(selectedEmailTemplateId);
                                        const sampleData = {
                                            customerName: 'Juan Dela Cruz',
                                            customerPhone: '0917-888-9999',
                                            customerEmail: templateTestEmail.trim() || localSettings?.contactEmail || 'customer@example.com',
                                            bookingId: 'BK-8942',
                                            serviceName: 'Comprehensive PMS & Engine Checkup',
                                            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                                            time: '10:00 AM',
                                            totalAmount: '4,500.00',
                                            totalPaid: '4,500.00',
                                            paymentMethod: 'Online Payment (HitPay)',
                                            pickupLocation: 'BGC Taguig, Metro Manila',
                                            destination: 'Makati Central Business District',
                                            driverName: 'Ricardo Dalisay',
                                            driverPhone: '0918-555-1234',
                                            mechanicName: 'Master Tech Roberto',
                                            mechanicPhone: '0919-444-5678',
                                            vehicleInfo: 'Toyota Vios 2022 (Plate: ABC 1234)',
                                            eta: '25 mins',
                                            status: 'Mechanic En Route',
                                            reason: 'Customer requested schedule adjustment',
                                            refundStatus: 'Full Refund Initiated (₱4,500.00)',
                                            orderId: 'ORD-7721',
                                            itemsList: 'Synthetic Motor Oil 4L (x1), Oil Filter (x1), Brake Pads Set (x1)',
                                            deliveryAddress: 'Unit 402, Tower 1, Fort Victoria, BGC Taguig',
                                            loginUrl: `${typeof window !== 'undefined' ? window.location.origin : 'https://ridersbud.com'}/mechanic-portal`,
                                            onboardingNotes: 'Your submitted LTO license and mechanic certifications have passed our compliance verification.',
                                            userEmail: 'customer@example.com',
                                            feedbackUrl: `${typeof window !== 'undefined' ? window.location.origin : 'https://ridersbud.com'}/customer-portal/booking-history`,
                                            completionDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                        };

                                        const previewRender = renderEmailTemplate(activeTpl, sampleData, localSettings || undefined);

                                        return (
                                            <div className="lg:col-span-8 bg-[#131317] border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
                                                {/* Template Header & Mode Toggle */}
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h3 className="text-base font-black text-white">{activeTpl.name}</h3>
                                                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                                                                {activeTpl.category}
                                                            </span>
                                                        </div>
                                                        <p className="text-[11px] text-gray-400 mt-0.5">{activeTpl.description}</p>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        {/* Enable / Disable Switch */}
                                                        <button
                                                            type="button"
                                                            onClick={() => handleTemplateToggle(selectedEmailTemplateId)}
                                                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 border ${
                                                                activeTpl.enabled
                                                                    ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                                                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                                                            }`}
                                                        >
                                                            <span className={`w-1.5 h-1.5 rounded-full ${activeTpl.enabled ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                                                            {activeTpl.enabled ? 'Enabled' : 'Disabled'}
                                                        </button>

                                                        {/* Edit / Preview Tabs */}
                                                        <div className="flex bg-[#0D0D10] p-0.5 rounded-lg border border-white/10">
                                                            <button
                                                                type="button"
                                                                onClick={() => setTemplateTabMode('edit')}
                                                                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                                                                    templateTabMode === 'edit'
                                                                        ? 'bg-primary text-white shadow-sm'
                                                                        : 'text-gray-400 hover:text-white'
                                                                }`}
                                                            >
                                                                <Code size={13} /> Editor
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setTemplateTabMode('preview')}
                                                                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                                                                    templateTabMode === 'preview'
                                                                        ? 'bg-primary text-white shadow-sm'
                                                                        : 'text-gray-400 hover:text-white'
                                                                }`}
                                                            >
                                                                <Eye size={13} /> Live Preview
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Mode 1: Editor */}
                                                {templateTabMode === 'edit' && (
                                                    <div className="space-y-3.5 animate-fadeIn">
                                                        {/* Subject Line */}
                                                        <div className="space-y-1">
                                                            <label htmlFor="template-subject" className="text-[9px] uppercase tracking-wider font-black text-gray-400 block">
                                                                Email Subject Line
                                                            </label>
                                                            <input
                                                                id="template-subject"
                                                                type="text"
                                                                value={activeTpl.subject}
                                                                onChange={(e) => handleTemplateSubjectChange(selectedEmailTemplateId, e.target.value)}
                                                                className="w-full bg-[#0D0D10] border border-white/10 rounded-xl px-3.5 py-2 text-white placeholder-gray-600 focus:border-primary outline-none transition-colors text-xs font-medium"
                                                                placeholder="Enter email subject line..."
                                                            />
                                                        </div>

                                                        {/* Available Variables Helper */}
                                                        <div className="bg-[#0D0D10] p-3 rounded-xl border border-white/5 space-y-1.5">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[9px] uppercase tracking-wider font-black text-gray-400 flex items-center gap-1">
                                                                    <Sparkles size={11} className="text-primary" /> Dynamic Variable Tags (Click to insert):
                                                                </span>
                                                                <span className="text-[9px] text-gray-500 font-medium">Inserts at cursor</span>
                                                            </div>
                                                            <div className="flex flex-wrap gap-1">
                                                                {activeTpl.variables.map((tag) => (
                                                                    <button
                                                                        key={tag}
                                                                        type="button"
                                                                        onClick={() => handleInsertVariable(tag)}
                                                                        className="px-2 py-0.5 bg-white/5 hover:bg-primary/20 text-gray-300 hover:text-primary rounded text-[11px] font-mono border border-white/5 hover:border-primary/20 transition-all flex items-center gap-0.5 active:scale-95"
                                                                        title={`Insert {{${tag}}}`}
                                                                    >
                                                                        <code>&#123;&#123;{tag}&#125;&#125;</code>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* Template Body */}
                                                        <div className="space-y-1">
                                                            <div className="flex items-center justify-between">
                                                                <label htmlFor="template-body" className="text-[9px] uppercase tracking-wider font-black text-gray-400 block">
                                                                    Email Body (HTML / Formatted Content)
                                                                </label>
                                                                <span className="text-[9px] text-gray-500">Auto-wrapped in responsive RidersBUD layout</span>
                                                            </div>
                                                            <textarea
                                                                id="template-body"
                                                                ref={textareaRef}
                                                                rows={8}
                                                                value={activeTpl.body}
                                                                onChange={(e) => handleTemplateBodyChange(selectedEmailTemplateId, e.target.value)}
                                                                className="w-full bg-[#0D0D10] border border-white/10 rounded-xl p-3 text-gray-200 font-mono text-[11px] leading-relaxed focus:border-primary outline-none transition-colors resize-y custom-scrollbar"
                                                                placeholder="Enter HTML template content..."
                                                            />
                                                        </div>

                                                        {/* Action Footer & Test Dispatch */}
                                                        <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleResetTemplateToDefault(selectedEmailTemplateId)}
                                                                className="px-3 py-2 bg-[#1A1A20] hover:bg-red-500/10 text-gray-400 hover:text-red-400 border border-white/5 hover:border-red-500/20 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1.5"
                                                            >
                                                                <RotateCcw size={12} /> Reset to Default
                                                            </button>

                                                            <div className="flex items-center gap-2 flex-1 max-w-sm">
                                                                <input
                                                                    type="email"
                                                                    value={templateTestEmail}
                                                                    onChange={(e) => setTemplateTestEmail(e.target.value)}
                                                                    placeholder={localSettings?.contactEmail || 'Enter email for test...'}
                                                                    className="flex-1 bg-[#0D0D10] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:border-primary outline-none"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleSendTemplateTest(selectedEmailTemplateId)}
                                                                    disabled={isTestingTemplate || !localSettings?.smtpHost || !localSettings?.smtpUsername}
                                                                    className="px-3.5 py-1.5 bg-primary hover:bg-orange-600 active:scale-95 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1 shadow-md shadow-primary/20 whitespace-nowrap"
                                                                >
                                                                    {isTestingTemplate ? <Spinner size="sm" /> : <Send size={13} />}
                                                                    Test Send
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Test Feedback */}
                                                        {templateTestFeedback && (
                                                            <div
                                                                className={`text-xs px-3 py-2 rounded-xl border flex items-center gap-2 ${
                                                                    templateTestFeedback.success
                                                                        ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                                                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                                                                }`}
                                                            >
                                                                {templateTestFeedback.success ? <Check size={14} /> : <AlertTriangle size={14} />}
                                                                {templateTestFeedback.message}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Mode 2: Live Preview */}
                                                {templateTabMode === 'preview' && (
                                                    <div className="space-y-3 animate-fadeIn">
                                                        {/* Simulated Email Client Header */}
                                                        <div className="bg-[#0D0D10] border border-white/10 rounded-xl p-3 space-y-1.5 text-[11px]">
                                                            <div className="text-gray-400 flex items-center gap-2">
                                                                <span className="font-bold text-gray-300 w-14">Subject:</span>
                                                                <span className="text-white font-semibold">{previewRender.subject}</span>
                                                            </div>
                                                            <div className="text-gray-400 flex items-center gap-2">
                                                                <span className="font-bold text-gray-300 w-14">From:</span>
                                                                <span className="text-gray-300">
                                                                    {localSettings?.smtpFromName || 'RidersBUD'} &lt;{localSettings?.smtpFromEmail || 'noreply@ridersbud.com'}&gt;
                                                                </span>
                                                            </div>
                                                            <div className="text-gray-400 flex items-center gap-2">
                                                                <span className="font-bold text-gray-300 w-14">To:</span>
                                                                <span className="text-gray-300">Juan Dela Cruz &lt;customer@example.com&gt;</span>
                                                            </div>
                                                        </div>

                                                        {/* Embedded Responsive HTML Email Preview */}
                                                        <div className="rounded-xl overflow-hidden border border-white/10 bg-black">
                                                            <iframe
                                                                title="Email Live Preview"
                                                                srcDoc={previewRender.html}
                                                                className="w-full h-[460px] border-0"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
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

                        {/* MAP & LOCATION SETTINGS */}
                        {activeTab === 'maps' && (
                            <div className="space-y-10 animate-fadeIn">
                                <div>
                                    <h2 className="text-2xl font-black text-white flex items-center gap-3 tracking-tighter mb-2">
                                        <MapPin className="text-primary" size={24} /> Real-Time Central Dispatch Map & Operations Hub
                                    </h2>
                                    <p className="text-gray-400 text-xs font-medium">
                                        Real-time operational dispatch map with live mechanics, active bookings, GPS telemetry controls, and central regional dispatch calibration across RidersBUD.
                                    </p>
                                </div>

                                {/* REALTIME DISPATCH METRICS STRIP */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-black">
                                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                                        </div>
                                        <div>
                                            <div className="text-lg font-black text-white">{db?.mechanics?.filter(m => m.status === 'Active').length ?? 0}</div>
                                            <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Online Mechanics</div>
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-black">
                                            <Activity size={18} />
                                        </div>
                                        <div>
                                            <div className="text-lg font-black text-white">{db?.mechanics?.filter(m => m.status !== 'Active').length ?? 0}</div>
                                            <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">On Mission / Busy</div>
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-black">
                                            <MapPin size={18} />
                                        </div>
                                        <div>
                                            <div className="text-lg font-black text-white">{db?.bookings?.filter(b => b.status === 'In Progress' || b.status === 'Upcoming').length ?? 0}</div>
                                            <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Active Bookings</div>
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black">
                                            <Compass size={18} />
                                        </div>
                                        <div>
                                            <div className="text-xs font-mono font-bold text-white">{(localSettings?.defaultMapCenterLat ?? 14.5995).toFixed(2)}, {(localSettings?.defaultMapCenterLng ?? 120.9842).toFixed(2)}</div>
                                            <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Central Anchor</div>
                                        </div>
                                    </div>
                                </div>

                                {/* LEAFLET TILE THEMES & PROVIDER SELECTOR */}
                                <div className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-primary/10 text-primary rounded-2xl">
                                                <Layers size={24} />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black text-white tracking-tight">Leaflet Map Tile Provider & Theme</h3>
                                                <p className="text-xs text-gray-400">Select map graphics layer theme with 100% watermark-free live tile providers.</p>
                                            </div>
                                        </div>
                                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                                            {LEAFLET_TILE_PROVIDERS[localSettings?.leafletTileProvider || 'osm-dark']?.badge || 'Custom Tile'}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {Object.values(LEAFLET_TILE_PROVIDERS).map((provider) => {
                                            const isSelected = (localSettings?.leafletTileProvider || 'osm-dark') === provider.id;
                                            return (
                                                <div
                                                    key={provider.id}
                                                    onClick={() => handleInputChange('leafletTileProvider', provider.id)}
                                                    className={`p-5 rounded-2xl cursor-pointer border transition-all ${
                                                        isSelected
                                                            ? 'bg-primary/10 border-primary shadow-lg shadow-primary/10'
                                                            : 'bg-[#121216] border-white/5 hover:border-white/20 hover:bg-[#181820]'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-[10px] font-black uppercase tracking-wider text-primary">
                                                            {provider.badge}
                                                        </span>
                                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-primary bg-primary' : 'border-gray-600'}`}>
                                                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                                        </div>
                                                    </div>
                                                    <h4 className="text-white font-bold text-sm mb-1">{provider.name}</h4>
                                                    <p className="text-gray-400 text-xs leading-relaxed">{provider.description}</p>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Custom Tile URL Configuration if custom selected */}
                                    {localSettings?.leafletTileProvider === 'custom' && (
                                        <div className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-4 animate-fadeIn">
                                            <div className="space-y-2">
                                                <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Custom Tile URL Template</label>
                                                <input
                                                    type="text"
                                                    value={localSettings.leafletCustomTileUrl || ''}
                                                    onChange={(e) => handleInputChange('leafletCustomTileUrl', e.target.value)}
                                                    placeholder="https://{s}.tile.example.com/{z}/{x}/{y}.png"
                                                    className="w-full bg-black/60 text-white font-mono text-xs border border-white/10 focus:border-primary rounded-xl px-4 py-3 outline-none"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Custom Tile Attribution</label>
                                                <input
                                                    type="text"
                                                    value={localSettings.leafletCustomAttribution || ''}
                                                    onChange={(e) => handleInputChange('leafletCustomAttribution', e.target.value)}
                                                    placeholder="&copy; Custom Tile Contributors"
                                                    className="w-full bg-black/60 text-white font-mono text-xs border border-white/10 focus:border-primary rounded-xl px-4 py-3 outline-none"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* REALTIME CENTRAL DISPATCH MAP CANVAS & PIN CALIBRATOR */}
                                <div className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] space-y-6">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-primary/10 text-primary rounded-2xl">
                                                <LocateFixed size={24} />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black text-white tracking-tight">Real-Time Central Dispatch Map & Operations Hub</h3>
                                                <p className="text-xs text-gray-400">Live mechanic positions and active bookings. Drag orange hub marker to calibrate default regional launch center.</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleLocateCurrentPosition}
                                            className="px-4 py-2.5 bg-[#1A1A1A] hover:bg-primary/20 text-gray-300 hover:text-primary border border-white/10 hover:border-primary/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                                        >
                                            <Crosshair size={14} className="text-primary" />
                                            Locate My GPS Coordinates
                                        </button>
                                    </div>

                                    {/* Map Preview Canvas */}
                                    <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black">
                                        <div 
                                            ref={adminMapRef} 
                                            className="w-full h-[360px] z-0" 
                                            style={{ background: '#0a0a0d' }}
                                        />
                                        <div className="absolute top-3 left-3 z-[1000] bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-[11px] font-mono text-gray-300 pointer-events-none flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                            <span>Lat: {(localSettings?.defaultMapCenterLat ?? 14.5995).toFixed(4)}, Lng: {(localSettings?.defaultMapCenterLng ?? 120.9842).toFixed(4)}</span>
                                            <span className="text-gray-500">|</span>
                                            <span className="text-primary font-bold">Zoom {localSettings?.defaultMapZoom ?? 13}</span>
                                        </div>
                                    </div>

                                    {/* Coordinate Inputs */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Default Center Lat</label>
                                            <input
                                                type="number"
                                                step="0.0001"
                                                value={localSettings.defaultMapCenterLat ?? 14.5995}
                                                onChange={(e) => handleInputChange('defaultMapCenterLat', parseFloat(e.target.value) || 0)}
                                                className="w-full bg-black/40 text-white font-mono text-sm border border-white/10 focus:border-primary rounded-xl outline-none px-4 py-3"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Default Center Lng</label>
                                            <input
                                                type="number"
                                                step="0.0001"
                                                value={localSettings.defaultMapCenterLng ?? 120.9842}
                                                onChange={(e) => handleInputChange('defaultMapCenterLng', parseFloat(e.target.value) || 0)}
                                                className="w-full bg-black/40 text-white font-mono text-sm border border-white/10 focus:border-primary rounded-xl outline-none px-4 py-3"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Default Zoom Level (1-20)</label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="20"
                                                value={localSettings.defaultMapZoom ?? 13}
                                                onChange={(e) => handleInputChange('defaultMapZoom', parseInt(e.target.value, 10) || 13)}
                                                className="w-full bg-black/40 text-white font-mono text-sm border border-white/10 focus:border-primary rounded-xl outline-none px-4 py-3"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* REALTIME TELEMETRY & LIVE TRACKING OPTIMIZATIONS */}
                                <div className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] space-y-6">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-primary/10 text-primary rounded-2xl">
                                            <Activity size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-white tracking-tight">Realtime Live GPS Telemetry & Enhancements</h3>
                                            <p className="text-xs text-gray-400">Configure visual telemetry elements, directional heading, and tracking fidelity.</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="p-6 bg-black/40 border border-white/10 rounded-2xl space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h4 className="text-sm font-black text-white flex items-center gap-2">
                                                        <Compass size={16} className="text-primary" /> Heading Direction Compass
                                                    </h4>
                                                    <p className="text-xs text-gray-400 mt-1">Rotate moving mechanic and driver markers according to live travel heading bearing.</p>
                                                </div>
                                                <button
                                                    onClick={() => handleInputChange('leafletShowHeadingCompass', localSettings.leafletShowHeadingCompass !== false)}
                                                    className={`relative w-14 h-8 rounded-full transition-all duration-300 shadow-inner ${localSettings.leafletShowHeadingCompass !== false ? 'bg-primary' : 'bg-gray-800'}`}
                                                >
                                                    <span className={`absolute top-0.5 left-0.5 w-7 h-7 bg-white rounded-full transition-all duration-300 shadow-md ${localSettings.leafletShowHeadingCompass !== false ? 'translate-x-6' : 'translate-x-0'}`} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="p-6 bg-black/40 border border-white/10 rounded-2xl space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h4 className="text-sm font-black text-white flex items-center gap-2">
                                                        <Crosshair size={16} className="text-primary" /> GPS Accuracy Halo Circle
                                                    </h4>
                                                    <p className="text-xs text-gray-400 mt-1">Render subtle accuracy radius halo around live GPS locations.</p>
                                                </div>
                                                <button
                                                    onClick={() => handleInputChange('leafletShowAccuracyCircle', localSettings.leafletShowAccuracyCircle !== false)}
                                                    className={`relative w-14 h-8 rounded-full transition-all duration-300 shadow-inner ${localSettings.leafletShowAccuracyCircle !== false ? 'bg-primary' : 'bg-gray-800'}`}
                                                >
                                                    <span className={`absolute top-0.5 left-0.5 w-7 h-7 bg-white rounded-full transition-all duration-300 shadow-md ${localSettings.leafletShowAccuracyCircle !== false ? 'translate-x-6' : 'translate-x-0'}`} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="p-6 bg-black/40 border border-white/10 rounded-2xl space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h4 className="text-sm font-black text-white flex items-center gap-2">
                                                        <Activity size={16} className="text-primary" /> Live Movement Trail Polylines
                                                    </h4>
                                                    <p className="text-xs text-gray-400 mt-1">Display dynamic breadcrumbs for active mechanic and customer dispatches.</p>
                                                </div>
                                                <button
                                                    onClick={() => handleInputChange('leafletShowLiveTrail', localSettings.leafletShowLiveTrail !== false)}
                                                    className={`relative w-14 h-8 rounded-full transition-all duration-300 shadow-inner ${localSettings.leafletShowLiveTrail !== false ? 'bg-primary' : 'bg-gray-800'}`}
                                                >
                                                    <span className={`absolute top-0.5 left-0.5 w-7 h-7 bg-white rounded-full transition-all duration-300 shadow-md ${localSettings.leafletShowLiveTrail !== false ? 'translate-x-6' : 'translate-x-0'}`} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="p-6 bg-black/40 border border-white/10 rounded-2xl space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h4 className="text-sm font-black text-white flex items-center gap-2">
                                                        <Layers size={16} className="text-primary" /> Marker Clustering
                                                    </h4>
                                                    <p className="text-xs text-gray-400 mt-1">Cluster nearby mechanics/drivers when zoomed out to improve rendering speed.</p>
                                                </div>
                                                <button
                                                    onClick={() => handleInputChange('leafletEnableClustering', localSettings.leafletEnableClustering !== false)}
                                                    className={`relative w-14 h-8 rounded-full transition-all duration-300 shadow-inner ${localSettings.leafletEnableClustering !== false ? 'bg-primary' : 'bg-gray-800'}`}
                                                >
                                                    <span className={`absolute top-0.5 left-0.5 w-7 h-7 bg-white rounded-full transition-all duration-300 shadow-md ${localSettings.leafletEnableClustering !== false ? 'translate-x-6' : 'translate-x-0'}`} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* GOOGLE MAPS API & NAVIGATION INTEGRATION */}
                                <div className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-primary/10 text-primary rounded-2xl">
                                                <Map size={24} />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black text-white tracking-tight">Google Maps API & Distance Matrix (Optional Fallback)</h3>
                                                <p className="text-xs text-gray-400">Used for live distance matrix highway ETA calculations and optional Google Maps tile fallback.</p>
                                            </div>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${localSettings.googleMapsApiKey ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                                            {localSettings.googleMapsApiKey ? 'Key Configured' : 'Key Missing'}
                                        </span>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Google API Key</label>
                                        <div className="relative">
                                            <input
                                                type={showGoogleMapsApiKey ? 'text' : 'password'}
                                                value={localSettings.googleMapsApiKey || ''}
                                                onChange={(e) => handleInputChange('googleMapsApiKey', e.target.value)}
                                                placeholder="AIzaSy..."
                                                className="w-full bg-black/40 text-white font-mono text-sm border border-white/10 focus:border-primary rounded-2xl outline-none px-4 py-3.5 pr-12 transition-all"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowGoogleMapsApiKey(!showGoogleMapsApiKey)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                                            >
                                                {showGoogleMapsApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-2">
                                        <button
                                            type="button"
                                            onClick={handleTestGoogleMapsKey}
                                            disabled={isTestingGoogleMaps || !localSettings.googleMapsApiKey}
                                            className="flex items-center gap-2 px-5 py-2.5 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-xl font-bold text-xs transition-all disabled:opacity-50"
                                        >
                                            {isTestingGoogleMaps ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                                            {isTestingGoogleMaps ? 'Testing Connection...' : 'Test API Connection'}
                                        </button>
                                    </div>

                                    {googleMapsTestResult && (
                                        <div className={`p-4 rounded-xl text-xs font-bold flex items-center gap-3 ${googleMapsTestResult.success ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                                            {googleMapsTestResult.success ? <Check size={18} /> : <AlertTriangle size={18} />}
                                            <span>{googleMapsTestResult.message}</span>
                                        </div>
                                    )}
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
                                        <Layout className="text-primary" size={24} /> System Modules
                                    </h2>
                                    <p className="text-gray-400 text-sm leading-relaxed -mt-4 font-medium font-bold">
                                        Enable or disable application modules. Disabling a module hides it from customer navigation and prevents providers from managing bookings for it.
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {(localSettings.modules || [
                                            { id: 'rent-a-car', name: 'Rent a Car', enabled: true, bannerMessage: '' },
                                            { id: 'driver-for-hire', name: 'Driver for Hire', enabled: true, bannerMessage: '' },
                                            { id: 'liaison-assistance', name: 'Liaison Registration Assistance', enabled: true, bannerMessage: '' },
                                            { id: 'towing', name: 'Towing Service', enabled: true, bannerMessage: '' }
                                        ]).map((mod) => (
                                            <div key={mod.id} className="p-6 bg-white/5 border border-white/10 rounded-[2rem] flex flex-col justify-between space-y-4 transition-all hover:bg-white/10">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <h3 className="text-lg font-black text-white tracking-tight">{mod.name}</h3>
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold mt-1 ${mod.enabled ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${mod.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                                                            {mod.enabled ? 'Active' : 'Disabled'}
                                                        </span>
                                                    </div>
                                                    <button
                                                        onClick={() => handleModuleToggle(mod.id)}
                                                        className={`relative w-14 h-8 rounded-full transition-all duration-300 shadow-inner ${mod.enabled ? 'bg-emerald-500' : 'bg-gray-800'}`}
                                                    >
                                                        <span className={`absolute top-0.5 left-0.5 w-7 h-7 bg-white rounded-full transition-all duration-300 shadow-md ${mod.enabled ? 'translate-x-6' : 'translate-x-0'}`} />
                                                    </button>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] tracking-widest font-black text-gray-500 block uppercase">Custom Alert / Warning Banner</label>
                                                    <input
                                                        type="text"
                                                        value={mod.bannerMessage || ''}
                                                        onChange={(e) => handleModuleBannerChange(mod.id, e.target.value)}
                                                        placeholder="e.g. Undergoing maintenance until 3 PM..."
                                                        className="w-full bg-black/25 text-gray-300 text-xs border border-white/5 focus:border-primary rounded-xl outline-none px-4 py-2 transition-all"
                                                    />
                                                </div>
                                            </div>
                                        ))}
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
