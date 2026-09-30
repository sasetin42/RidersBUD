import React, { useState } from 'react';
import { Webhook, Plus, Trash2, Send, CheckCircle2, AlertTriangle, RefreshCw, Eye } from 'lucide-react';
import { Settings, WebhookConfig, WebhookDeliveryLog } from '../../../../types';
import { settingsService } from '../../../../services/settingsService';

interface WebhooksTabProps {
    settings: Settings;
    onChange: (field: keyof Settings, value: any) => void;
}

export const WebhooksTab: React.FC<WebhooksTabProps> = ({
    settings,
    onChange
}) => {
    const [deliveryLogs, setDeliveryLogs] = useState<WebhookDeliveryLog[]>(() => settingsService.getWebhookLogs());
    const [testingId, setTestingId] = useState<string | null>(null);

    const [newName, setNewName] = useState('');
    const [newUrl, setNewUrl] = useState('');
    const [newEvent, setNewEvent] = useState('booking.created');

    const webhooks = settings.webhooks || [
        {
            id: 'wh_default_1',
            name: 'External ERP / Telemetry Sync',
            event: 'booking.confirmed',
            endpointUrl: 'https://webhook.site/ridersbud-sample-endpoint',
            isActive: true,
            retryCount: 3,
            timeoutSeconds: 10
        }
    ];

    const handleAddWebhook = () => {
        if (!newName.trim() || !newUrl.trim()) return;
        const newWebhook: WebhookConfig = {
            id: 'wh_' + Date.now(),
            name: newName.trim(),
            event: newEvent,
            endpointUrl: newUrl.trim(),
            isActive: true,
            retryCount: 3,
            timeoutSeconds: 10
        };
        onChange('webhooks', [...webhooks, newWebhook]);
        setNewName('');
        setNewUrl('');
    };

    const handleDeleteWebhook = (id: string) => {
        onChange('webhooks', webhooks.filter(w => w.id !== id));
    };

    const handleTestWebhook = async (webhook: WebhookConfig) => {
        setTestingId(webhook.id);
        try {
            const log = await settingsService.testWebhook(webhook);
            setDeliveryLogs(settingsService.getWebhookLogs());
        } finally {
            setTestingId(null);
        }
    };

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Webhook Endpoints List */}
            <div className="space-y-5 bg-[#121212]/70 border border-white/5 p-6 rounded-3xl">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary">
                            <Webhook size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white tracking-tight">Outbound Webhooks & Event Subscriptions</h3>
                            <p className="text-xs text-gray-500">Deliver instant JSON payloads to external systems upon key lifecycle triggers.</p>
                        </div>
                    </div>

                    <span className="text-xs font-bold text-gray-400">{webhooks.length} Active Endpoints</span>
                </div>

                {/* List of Registered Endpoints */}
                <div className="space-y-3">
                    {webhooks.map((wh) => (
                        <div
                            key={wh.id}
                            className="p-4 rounded-2xl bg-black/40 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                            <div className="space-y-1 flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h4 className="text-xs font-bold text-white">{wh.name}</h4>
                                    <span className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[9px] font-black uppercase text-primary font-mono">
                                        {wh.event}
                                    </span>
                                </div>
                                <p className="text-[11px] text-gray-400 font-mono truncate">{wh.endpointUrl}</p>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
                                <button
                                    type="button"
                                    onClick={() => handleTestWebhook(wh)}
                                    disabled={testingId === wh.id}
                                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-300 flex items-center gap-1.5 transition disabled:opacity-50"
                                >
                                    {testingId === wh.id ? <RefreshCw size={12} className="animate-spin text-primary" /> : <Send size={12} className="text-primary" />}
                                    <span>{testingId === wh.id ? 'Pinging...' : 'Send Test Ping'}</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleDeleteWebhook(wh.id)}
                                    className="p-1.5 rounded-xl text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                                    title="Delete webhook"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Register New Webhook */}
                <div className="p-4 rounded-2xl bg-black/60 border border-dashed border-white/10 space-y-3">
                    <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Plus size={14} className="text-primary" />
                        <span>Register New Webhook Endpoint</span>
                    </h5>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="Webhook Name / System"
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-primary"
                            />
                        </div>
                        <div>
                            <select
                                value={newEvent}
                                onChange={(e) => setNewEvent(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-primary"
                            >
                                <option value="booking.created">booking.created</option>
                                <option value="booking.confirmed">booking.confirmed</option>
                                <option value="booking.completed">booking.completed</option>
                                <option value="payment.verified">payment.verified</option>
                                <option value="customer.registered">customer.registered</option>
                                <option value="mechanic.verified">mechanic.verified</option>
                            </select>
                        </div>
                        <div>
                            <input
                                type="url"
                                value={newUrl}
                                onChange={(e) => setNewUrl(e.target.value)}
                                placeholder="https://api.yourdomain.com/webhook"
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-primary font-mono"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={handleAddWebhook}
                            disabled={!newName.trim() || !newUrl.trim()}
                            className="px-4 py-2 bg-primary hover:bg-orange-600 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                        >
                            <Plus size={13} />
                            <span>Save Endpoint</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Delivery History & Audit Logs */}
            <div className="space-y-4 bg-[#121212]/70 border border-white/5 p-6 rounded-3xl">
                <h4 className="text-sm font-black text-white tracking-tight">Recent Webhook Delivery Logs</h4>
                <div className="space-y-2">
                    {deliveryLogs.length === 0 ? (
                        <p className="text-xs text-gray-500 py-3">No test webhook deliveries performed yet.</p>
                    ) : (
                        deliveryLogs.map((log) => (
                            <div
                                key={log.id}
                                className="p-3 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-between gap-3 text-xs"
                            >
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <span className={`w-2 h-2 rounded-full ${log.status === 'success' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                                    <span className="font-bold text-white truncate">{log.webhookName}</span>
                                    <span className="text-[10px] text-gray-500 font-mono">[{log.event}]</span>
                                </div>

                                <div className="flex items-center gap-3 flex-shrink-0">
                                    <span className="font-mono text-[10px] text-gray-400">{log.durationMs}ms</span>
                                    <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold ${
                                        log.status === 'success' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                                    }`}>
                                        HTTP {log.statusCode}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
