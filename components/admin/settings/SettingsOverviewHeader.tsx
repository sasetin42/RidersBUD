import React from 'react';
import { 
    Activity, Server, Database, HardDrive, Mail, MapPin, 
    Webhook, Shield, Search, ArrowRight, CheckCircle2, AlertTriangle, XCircle
} from 'lucide-react';
import { Settings } from '../../../types';

interface SettingsDashboardHeaderProps {
    settings: Settings;
    searchQuery: string;
    onSearchChange: (q: string) => void;
    onNavigateTab: (tabId: string) => void;
    hasChanges: boolean;
}

export const SettingsDashboardHeader: React.FC<SettingsDashboardHeaderProps> = ({
    settings,
    searchQuery,
    onSearchChange,
    onNavigateTab,
    hasChanges
}) => {
    const isMapsConfigured = !!settings.googleMapsApiKey;
    const isSmtpConfigured = !!settings.smtpHost && !!settings.smtpUsername;
    const isMaintenance = !!settings.maintenanceMode;

    const healthItems = [
        {
            id: 'system',
            label: 'System Status',
            status: isMaintenance ? 'warning' : 'healthy',
            text: isMaintenance ? 'Maintenance Active' : 'Online & Healthy',
            icon: <Activity size={15} />,
            tab: 'system'
        },
        {
            id: 'database',
            label: 'Firestore DB',
            status: 'healthy',
            text: 'Synchronized Real-Time',
            icon: <Database size={15} />,
            tab: 'system'
        },
        {
            id: 'smtp',
            label: 'Email / SMTP',
            status: isSmtpConfigured ? 'healthy' : 'attention',
            text: isSmtpConfigured ? 'Connected' : 'Credentials Needed',
            icon: <Mail size={15} />,
            tab: 'smtp'
        },
        {
            id: 'maps',
            label: 'Maps & Geofence',
            status: isMapsConfigured ? 'healthy' : 'warning',
            text: isMapsConfigured ? 'Google Maps Active' : 'Using OSM Tile Fallback',
            icon: <MapPin size={15} />,
            tab: 'maps'
        },
        {
            id: 'webhooks',
            label: 'Integrations',
            status: (settings.webhooks?.length ?? 0) > 0 ? 'healthy' : 'neutral',
            text: `${settings.webhooks?.length ?? 0} Endpoints Active`,
            icon: <Webhook size={15} />,
            tab: 'webhooks'
        },
        {
            id: 'security',
            label: 'Security & Auth',
            status: settings.twoFactorAuthRequired ? 'healthy' : 'warning',
            text: settings.twoFactorAuthRequired ? 'Strict 2FA Enforced' : 'Standard Protection',
            icon: <Shield size={15} />,
            tab: 'security'
        }
    ];

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'healthy':
                return {
                    border: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
                    dot: 'bg-emerald-400'
                };
            case 'warning':
                return {
                    border: 'border-amber-500/20 bg-amber-500/10 text-amber-400',
                    dot: 'bg-amber-400'
                };
            case 'attention':
                return {
                    border: 'border-rose-500/20 bg-rose-500/10 text-rose-400',
                    dot: 'bg-rose-400'
                };
            default:
                return {
                    border: 'border-white/10 bg-white/5 text-gray-400',
                    dot: 'bg-gray-400'
                };
        }
    };

    return (
        <div className="space-y-6">
            {/* Top Search & Live Quick Health Bar */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-[#141414] border border-white/10 p-4 sm:p-5 rounded-3xl backdrop-blur-xl">
                {/* Global Settings Search */}
                <div className="relative flex-1 max-w-xl">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Search settings, keys, permissions, webhooks (e.g. SMTP, HitPay, OTP, radius)..."
                        className="w-full bg-black/60 border border-white/10 focus:border-primary rounded-2xl pl-12 pr-4 py-3 text-xs sm:text-sm text-white placeholder-gray-500 outline-none transition-all shadow-inner"
                    />
                    {searchQuery && (
                        <button 
                            onClick={() => onSearchChange('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-xs px-2 py-1 bg-white/10 rounded-lg"
                        >
                            Esc
                        </button>
                    )}
                </div>

                {/* System Tagline & Active Notification */}
                <div className="flex items-center gap-3 self-end xl:self-auto">
                    {hasChanges && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/20 border border-primary/40 text-primary text-[11px] font-bold animate-pulse">
                            <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                            Unsaved Configuration Changes Pending
                        </div>
                    )}
                    <div className="text-right hidden sm:block">
                        <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold block">Centralized Control</span>
                        <span className="text-xs text-gray-300 font-semibold">{settings.appName || 'RidersBUD'} SaaS Suite</span>
                    </div>
                </div>
            </div>

            {/* Micro Health Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
                {healthItems.map((item) => {
                    const badge = getStatusBadge(item.status);
                    return (
                        <button
                            key={item.id}
                            onClick={() => onNavigateTab(item.tab)}
                            className="group flex flex-col justify-between p-3.5 rounded-2xl bg-[#121212]/90 hover:bg-[#181818] border border-white/5 hover:border-primary/40 transition-all text-left shadow-lg"
                        >
                            <div className="flex items-center justify-between gap-2 mb-2">
                                <span className="text-gray-400 group-hover:text-primary transition-colors">
                                    {item.icon}
                                </span>
                                <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black tracking-wide border ${badge.border}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                                    {item.status.toUpperCase()}
                                </span>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold leading-tight">{item.label}</p>
                                <p className="text-xs font-bold text-gray-200 group-hover:text-white truncate mt-0.5">{item.text}</p>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
