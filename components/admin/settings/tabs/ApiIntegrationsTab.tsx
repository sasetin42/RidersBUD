import React, { useState } from 'react';
import { Layers, CheckCircle2, AlertTriangle, Eye, EyeOff, Key, ExternalLink, RefreshCw } from 'lucide-react';
import { Settings } from '../../../../types';

interface ApiIntegrationsTabProps {
    settings: Settings;
    onChange: (field: keyof Settings, value: any) => void;
}

export const ApiIntegrationsTab: React.FC<ApiIntegrationsTabProps> = ({
    settings,
    onChange
}) => {
    const [showSmsKey, setShowSmsKey] = useState(false);

    const integrations = [
        {
            id: 'hitpay',
            name: 'HitPay Payment Gateway',
            category: 'Payments & Checkout',
            desc: 'Automated QRPH, Cards, GCash, Maya API processor.',
            status: settings.hitpayEnabled ? 'Active' : 'Configured',
            badgeColor: settings.hitpayEnabled ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-gray-400 bg-white/5 border-white/10'
        },
        {
            id: 'googleMaps',
            name: 'Google Maps Directions & Places',
            category: 'Geolocation & Routing',
            desc: 'Turn-by-turn routing, distance matrices, and reverse geocoding.',
            status: settings.googleMapsApiKey ? 'Key Injected' : 'Inactive',
            badgeColor: settings.googleMapsApiKey ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
        },
        {
            id: 'smtp',
            name: 'SMTP Email Delivery',
            category: 'Communications',
            desc: 'Outbound relay for transactional invoices and dispatch receipts.',
            status: settings.smtpHost ? 'Configured' : 'Missing Host',
            badgeColor: settings.smtpHost ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-rose-400 bg-rose-500/10 border-rose-500/20'
        },
        {
            id: 'firebase',
            name: 'Firebase Cloud Storage & Auth',
            category: 'Infrastructure',
            desc: 'Real-time database sync, user security rules, and media asset storage.',
            status: 'Connected Live',
            badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
        }
    ];

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Third-Party Service Cards */}
            <div className="space-y-5 bg-[#121212]/70 border border-white/5 p-6 rounded-3xl">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                        <Layers size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-white tracking-tight">API & Third-Party Service Integrations</h3>
                        <p className="text-xs text-gray-500">Centralized status overview of connected external infrastructure and API tokens.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {integrations.map((item) => (
                        <div
                            key={item.id}
                            className="p-5 rounded-2xl bg-black/40 border border-white/5 flex flex-col justify-between gap-4"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">{item.category}</span>
                                    <h4 className="text-sm font-bold text-white mt-0.5">{item.name}</h4>
                                    <p className="text-xs text-gray-400 mt-1">{item.desc}</p>
                                </div>
                                <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${item.badgeColor} flex-shrink-0`}>
                                    {item.status}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* SMS Gateway API Configuration */}
            <div className="space-y-5 bg-[#121212]/70 border border-white/5 p-6 rounded-3xl">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                        <Key size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-white tracking-tight">SMS Gateway API Provider</h3>
                        <p className="text-xs text-gray-500">Provider credentials for sending customer arrival OTPs and driver dispatches.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                        <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">SMS Gateway Provider</label>
                        <select
                            value={settings.smsGatewayProvider || 'semaphore'}
                            onChange={(e) => onChange('smsGatewayProvider', e.target.value)}
                            className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none"
                        >
                            <option value="semaphore">Semaphore SMS (Philippines)</option>
                            <option value="twilio">Twilio Global API</option>
                            <option value="infobip">Infobip Enterprise</option>
                            <option value="custom">Custom Webhook Gateway</option>
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">SMS API Secret Key</label>
                        <div className="relative">
                            <input
                                type={showSmsKey ? 'text' : 'password'}
                                value={settings.smsApiKey || ''}
                                onChange={(e) => onChange('smsApiKey', e.target.value)}
                                placeholder="sk_live_..."
                                className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white pr-10 outline-none font-mono"
                            />
                            <button
                                type="button"
                                onClick={() => setShowSmsKey(!showSmsKey)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                            >
                                {showSmsKey ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
