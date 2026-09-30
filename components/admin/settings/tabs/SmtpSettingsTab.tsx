import React, { useState, useEffect } from 'react';
import { 
    Server, 
    Mail, 
    Shield, 
    Eye, 
    EyeOff, 
    RefreshCw, 
    CheckCircle2, 
    AlertTriangle, 
    Send, 
    Save, 
    Clock, 
    Info, 
    Check, 
    XCircle,
    Activity,
    ExternalLink,
    Lock,
    Unlock
} from 'lucide-react';
import { Settings, SmtpLog } from '../../../../types';
import { settingsService } from '../../../../services/settingsService';
import { sendEmailWithDiagnostics } from '../../../../services/emailService';
import { db as firestore } from '../../../../firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

interface SmtpSettingsTabProps {
    settings: Settings;
    onChange: (field: keyof Settings, value: any) => void;
    onSave?: () => Promise<void>;
}

export const SmtpSettingsTab: React.FC<SmtpSettingsTabProps> = ({
    settings,
    onChange,
    onSave
}) => {
    // Form & UI States
    const [showPassword, setShowPassword] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Connection Test States
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<{
        success: boolean;
        message: string;
        latencyMs?: number;
        details?: string;
        rawError?: string;
    } | null>(null);

    // Send Test Email States
    const [recipientEmail, setRecipientEmail] = useState('');
    const [testSubject, setTestSubject] = useState('');
    const [testMessage, setTestMessage] = useState('');
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const [sendEmailResult, setSendEmailResult] = useState<{
        success: boolean;
        message: string;
        details?: string;
        timestamp?: string;
    } | null>(null);

    // Real-Time Transaction Logs
    const [logs, setLogs] = useState<SmtpLog[]>([]);
    const [selectedLog, setSelectedLog] = useState<SmtpLog | null>(null);
    const [lastSuccessfulEmailDate, setLastSuccessfulEmailDate] = useState<string | null>(null);
    const [lastTestDate, setLastTestDate] = useState<string | null>(null);

    // Derived Connection Status
    const [connectionStatus, setConnectionStatus] = useState<
        'Connected' | 'Testing Connection' | 'Sending Email' | 'Disconnected' | 'Authentication Failed' | 'Configuration Error' | 'Email Sending Failed'
    >(() => {
        if (!settings.smtpHost || !settings.smtpPort) return 'Disconnected';
        return 'Connected';
    });

    // Realtime Listener for SMTP Transaction Logs from Firestore
    useEffect(() => {
        try {
            const logsRef = collection(firestore, 'smtpLogs');
            const q = query(logsRef, orderBy('timestamp', 'desc'), limit(15));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const fetchedLogs: SmtpLog[] = [];
                snapshot.forEach((doc) => {
                    fetchedLogs.push({ id: doc.id, ...(doc.data() as any) });
                });
                setLogs(fetchedLogs);

                // Determine last successful sent email date
                const latestSuccess = fetchedLogs.find(l => l.status === 'Accepted by SMTP Server' || l.status === 'Delivered');
                if (latestSuccess) {
                    setLastSuccessfulEmailDate(new Date(latestSuccess.timestamp).toLocaleString());
                }
            }, (err) => {
                console.warn('Realtime SMTP logs listener notice:', err.message);
            });

            return () => unsubscribe();
        } catch (e) {
            console.warn('Could not attach smtpLogs realtime listener:', e);
        }
    }, []);

    // Action 1: Save SMTP Configuration
    const handleSaveConfig = async () => {
        setIsSaving(true);
        setSaveSuccess(false);
        try {
            if (onSave) {
                await onSave();
            }
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (e) {
            console.error('Save failed:', e);
        } finally {
            setIsSaving(false);
        }
    };

    // Action 2: Test Real SMTP Connection
    const handleTestConnection = async () => {
        setIsTesting(true);
        setTestResult(null);
        setConnectionStatus('Testing Connection');

        try {
            const result = await settingsService.testSmtpConnection(settings);
            setTestResult(result);
            setLastTestDate(new Date().toLocaleTimeString());

            if (result.success) {
                setConnectionStatus('Connected');
            } else {
                if (result.message.toLowerCase().includes('auth') || result.message.toLowerCase().includes('password') || result.message.toLowerCase().includes('535')) {
                    setConnectionStatus('Authentication Failed');
                } else if (result.message.toLowerCase().includes('incomplete') || result.message.toLowerCase().includes('required')) {
                    setConnectionStatus('Configuration Error');
                } else {
                    setConnectionStatus('Disconnected');
                }
            }
        } catch (err: any) {
            setTestResult({
                success: false,
                message: err.message || 'Fatal error contacting SMTP gateway.'
            });
            setConnectionStatus('Disconnected');
        } finally {
            setIsTesting(false);
        }
    };

    // Action 3: Send Real Test Email
    const handleSendTestEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        const targetTo = recipientEmail.trim();

        if (!targetTo || !targetTo.includes('@')) {
            alert('Please enter a valid recipient email address.');
            return;
        }

        setIsSendingEmail(true);
        setSendEmailResult(null);
        setConnectionStatus('Sending Email');

        const subject = testSubject.trim() || `[RidersBUD] SMTP Live Gateway Test`;
        const bodyContent = testMessage.trim() || `This is a live transactional test email dispatched from RidersBUD Production Gateway via ${settings.smtpHost || 'SMTP Server'}.\r\n\r\nIf you are reading this in your inbox, your SMTP server configuration and authentication credentials are fully working!`;

        const htmlBody = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; background: #121212; color: #ffffff; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); padding: 32px; box-sizing: border-box;">
                <div style="text-align: center; margin-bottom: 24px;">
                    <h2 style="color: #FE7803; margin: 0; font-size: 24px; font-weight: 900; letter-spacing: -0.5px;">RidersBUD</h2>
                    <p style="color: #888888; font-size: 12px; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 1px;">SMTP Integration Delivery Verification</p>
                </div>
                <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                    <p style="font-size: 14px; line-height: 1.6; color: #e0e0e0; margin: 0 0 16px 0;">${bodyContent.replace(/\r?\n/g, '<br/>')}</p>
                    <div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 14px; font-size: 11px; color: #999999; font-family: monospace;">
                        <div>Host: <span style="color: #ffffff;">${settings.smtpHost}</span></div>
                        <div>Port: <span style="color: #ffffff;">${settings.smtpPort} (${settings.smtpEncryption || 'SSL/TLS'})</span></div>
                        <div>Timestamp: <span style="color: #ffffff;">${new Date().toISOString()}</span></div>
                        <div>Recipient: <span style="color: #FE7803;">${targetTo}</span></div>
                    </div>
                </div>
                <p style="font-size: 11px; text-align: center; color: #666666; margin: 0;">Automated message sent from RidersBUD Control Center</p>
            </div>
        `;

        try {
            const res = await sendEmailWithDiagnostics(targetTo, subject, htmlBody, settings);
            const timestamp = new Date().toLocaleTimeString();

            setSendEmailResult({
                success: res.success,
                message: res.message,
                details: res.details,
                timestamp
            });

            if (res.success) {
                setConnectionStatus('Connected');
                setLastSuccessfulEmailDate(new Date().toLocaleString());
            } else {
                setConnectionStatus('Email Sending Failed');
            }
        } catch (err: any) {
            setSendEmailResult({
                success: false,
                message: err.message || 'Fatal error dispatching test email.'
            });
            setConnectionStatus('Email Sending Failed');
        } finally {
            setIsSendingEmail(false);
        }
    };

    const isEncryptionDefaultPort = (type: 'SSL/TLS' | 'STARTTLS' | 'None') => {
        if (type === 'SSL/TLS') return '465';
        if (type === 'STARTTLS') return '587';
        return '25';
    };

    const handleEncryptionChange = (enc: 'SSL/TLS' | 'STARTTLS' | 'None') => {
        onChange('smtpEncryption', enc);
        if (!settings.smtpPort || settings.smtpPort === '465' || settings.smtpPort === '587' || settings.smtpPort === '25') {
            onChange('smtpPort', isEncryptionDefaultPort(enc));
        }
    };

    return (
        <div className="space-y-8 animate-fadeIn text-white">
            {/* Header Title */}
            <div>
                <span className="text-[11px] font-black tracking-widest uppercase text-primary block mb-1">
                    CONFIGURATION DOMAIN
                </span>
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-black tracking-tight text-white">
                        SMTP Server Settings
                    </h2>
                    <span className="text-xs font-mono text-gray-500">[smtp]</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                    Manage and configure your real-time email delivery service with genuine authentication and server verification.
                </p>
            </div>

            {/* 1. REAL-TIME SMTP CONNECTION STATUS CARD */}
            <div className="bg-[#121212]/90 border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden backdrop-blur-md">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-white/5">
                    <div className="flex items-center gap-3.5">
                        <div className={`p-3 rounded-2xl ${
                            connectionStatus === 'Connected' 
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : connectionStatus === 'Testing Connection' || connectionStatus === 'Sending Email'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                            <Activity size={22} className={isTesting || isSendingEmail ? 'animate-pulse' : ''} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-black tracking-tight text-white">
                                    SMTP Connection Status
                                </h3>
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase border flex items-center gap-1.5 ${
                                    connectionStatus === 'Connected'
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                        : connectionStatus === 'Testing Connection' || connectionStatus === 'Sending Email'
                                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                        : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${
                                        connectionStatus === 'Connected'
                                            ? 'bg-emerald-400'
                                            : connectionStatus === 'Testing Connection' || connectionStatus === 'Sending Email'
                                            ? 'bg-amber-400 animate-ping'
                                            : 'bg-rose-400'
                                    }`} />
                                    {connectionStatus}
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Verified directly against backend SMTP socket handshakes. Never simulated.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleTestConnection}
                        disabled={isTesting || isSendingEmail || !settings.smtpHost}
                        className="px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 text-xs font-bold text-white flex items-center justify-center gap-2 transition disabled:opacity-40"
                    >
                        {isTesting ? <RefreshCw size={14} className="animate-spin text-primary" /> : <Send size={14} className="text-primary" />}
                        <span>{isTesting ? 'Testing Handshake...' : 'Test Connection'}</span>
                    </button>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 pt-5">
                    <div className="space-y-1">
                        <span className="text-[10px] tracking-widest uppercase font-black text-gray-500 block">SMTP Server</span>
                        <span className="text-xs font-mono font-bold text-white truncate block" title={settings.smtpHost || 'Not Set'}>
                            {settings.smtpHost || '—'}
                        </span>
                    </div>

                    <div className="space-y-1">
                        <span className="text-[10px] tracking-widest uppercase font-black text-gray-500 block">SMTP Port</span>
                        <span className="text-xs font-mono font-bold text-white block">
                            {settings.smtpPort || '587'}
                        </span>
                    </div>

                    <div className="space-y-1">
                        <span className="text-[10px] tracking-widest uppercase font-black text-gray-500 block">Encryption</span>
                        <span className="text-xs font-bold text-primary block">
                            {settings.smtpEncryption || (settings.smtpPort === '465' ? 'SSL/TLS' : 'STARTTLS')}
                        </span>
                    </div>

                    <div className="space-y-1">
                        <span className="text-[10px] tracking-widest uppercase font-black text-gray-500 block">Authentication</span>
                        <span className={`text-xs font-bold flex items-center gap-1 ${
                            settings.smtpAuthRequired !== false ? 'text-emerald-400' : 'text-gray-400'
                        }`}>
                            {settings.smtpAuthRequired !== false ? <Lock size={12} /> : <Unlock size={12} />}
                            {settings.smtpAuthRequired !== false ? 'Required' : 'Disabled'}
                        </span>
                    </div>

                    <div className="space-y-1">
                        <span className="text-[10px] tracking-widest uppercase font-black text-gray-500 block">Last Tested</span>
                        <span className="text-xs text-gray-400 font-mono block">
                            {lastTestDate || '—'}
                        </span>
                    </div>

                    <div className="space-y-1">
                        <span className="text-[10px] tracking-widest uppercase font-black text-gray-500 block">Last Email Sent</span>
                        <span className="text-xs text-gray-400 font-mono truncate block" title={lastSuccessfulEmailDate || 'None'}>
                            {lastSuccessfulEmailDate || '—'}
                        </span>
                    </div>
                </div>

                {/* Handshake Diagnostic Notice */}
                {testResult && (
                    <div className={`mt-5 p-4 rounded-2xl border flex items-start gap-3.5 transition-all ${
                        testResult.success
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    }`}>
                        {testResult.success ? (
                            <CheckCircle2 size={18} className="text-emerald-400 mt-0.5 shrink-0" />
                        ) : (
                            <AlertTriangle size={18} className="text-rose-400 mt-0.5 shrink-0" />
                        )}
                        <div className="space-y-1 min-w-0">
                            <p className="text-xs font-bold">{testResult.message}</p>
                            {testResult.details && (
                                <p className="text-[11px] font-mono opacity-80 break-all">{testResult.details}</p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* 2. SMTP SERVER CONFIGURATION & AUTHENTICATION (Clean card matching reference) */}
            <div className="bg-[#121212]/90 border border-white/10 rounded-3xl p-6 md:p-8 space-y-8 shadow-xl">
                {/* Section A: Host, Port, Encryption */}
                <div>
                    <div className="flex items-center gap-3 mb-5">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary">
                            <Server size={18} />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-white tracking-tight">SMTP Server Configuration</h3>
                            <p className="text-xs text-gray-500">Configure outbound email relay via Gmail, SendGrid, Amazon SES, Hostinger, or Custom SMTP.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                        <div className="md:col-span-6 space-y-1.5">
                            <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">
                                SMTP Server Host <span className="text-primary">*</span>
                            </label>
                            <input
                                type="text"
                                value={settings.smtpHost || ''}
                                onChange={(e) => onChange('smtpHost', e.target.value)}
                                placeholder="smtp.hostinger.com or smtp.gmail.com"
                                className="w-full bg-black/60 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none font-mono transition"
                            />
                        </div>

                        <div className="md:col-span-3 space-y-1.5">
                            <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">
                                SMTP Port <span className="text-primary">*</span>
                            </label>
                            <input
                                type="text"
                                value={settings.smtpPort || '587'}
                                onChange={(e) => onChange('smtpPort', e.target.value)}
                                placeholder="465 or 587"
                                className="w-full bg-black/60 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none font-mono transition"
                            />
                        </div>

                        <div className="md:col-span-3 space-y-1.5">
                            <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">
                                Encryption Type
                            </label>
                            <select
                                value={settings.smtpEncryption || (settings.smtpPort === '465' ? 'SSL/TLS' : 'STARTTLS')}
                                onChange={(e) => handleEncryptionChange(e.target.value as any)}
                                className="w-full bg-black/60 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none transition cursor-pointer"
                            >
                                <option value="SSL/TLS">SSL / TLS (Port 465)</option>
                                <option value="STARTTLS">STARTTLS (Port 587)</option>
                                <option value="None">None (Port 25)</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="h-px bg-white/5" />

                {/* Section B: Authentication */}
                <div>
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                <Shield size={18} />
                            </div>
                            <div>
                                <h3 className="text-base font-black text-white tracking-tight">Authentication</h3>
                                <p className="text-xs text-gray-500">Provide credentials authorized to transmit emails through your SMTP server.</p>
                            </div>
                        </div>

                        {/* Authentication Required Toggle */}
                        <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-2xl">
                            <span className="text-xs font-bold text-gray-300">Auth Required</span>
                            <button
                                type="button"
                                onClick={() => onChange('smtpAuthRequired', settings.smtpAuthRequired === false ? true : false)}
                                className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-300 ${
                                    settings.smtpAuthRequired !== false ? 'bg-primary' : 'bg-white/20'
                                }`}
                            >
                                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-300 ${
                                    settings.smtpAuthRequired !== false ? 'translate-x-5' : 'translate-x-0'
                                }`} />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                            <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">
                                SMTP Username / Email <span className="text-primary">*</span>
                            </label>
                            <input
                                type="text"
                                value={settings.smtpUsername || ''}
                                onChange={(e) => onChange('smtpUsername', e.target.value)}
                                placeholder="info@slimdoseph.com"
                                className="w-full bg-black/60 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none font-mono transition"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">
                                SMTP Password / App Secret <span className="text-primary">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={settings.smtpPassword || ''}
                                    onChange={(e) => onChange('smtpPassword', e.target.value)}
                                    placeholder="••••••••••••••••"
                                    className="w-full bg-black/60 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white pr-10 outline-none font-mono transition"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition"
                                >
                                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="h-px bg-white/5" />

                {/* Section C: Sender Information */}
                <div>
                    <div className="flex items-center gap-3 mb-5">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary">
                            <Mail size={18} />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-white tracking-tight">Sender Information</h3>
                            <p className="text-xs text-gray-500">Specify the outbound sender identity visible to clients and recipients.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div className="space-y-1.5">
                            <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">
                                From Display Name
                            </label>
                            <input
                                type="text"
                                value={settings.smtpFromName || ''}
                                onChange={(e) => onChange('smtpFromName', e.target.value)}
                                placeholder="RidersBUD"
                                className="w-full bg-black/60 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none transition"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">
                                From Email Address <span className="text-primary">*</span>
                            </label>
                            <input
                                type="email"
                                value={settings.smtpFromEmail || ''}
                                onChange={(e) => onChange('smtpFromEmail', e.target.value)}
                                placeholder="info@slimdoseph.com"
                                className="w-full bg-black/60 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none font-mono transition"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">
                                Reply-To Email Address
                            </label>
                            <input
                                type="email"
                                value={settings.smtpReplyTo || ''}
                                onChange={(e) => onChange('smtpReplyTo', e.target.value)}
                                placeholder="support@ridersbud.com"
                                className="w-full bg-black/60 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none font-mono transition"
                            />
                        </div>
                    </div>
                </div>

                {/* Main Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/5">
                    <div className="flex items-center gap-2">
                        {saveSuccess && (
                            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                                <Check size={14} />
                                <span>SMTP Configuration Saved</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={handleTestConnection}
                            disabled={isTesting || isSaving || !settings.smtpHost}
                            className="px-5 py-3 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 text-xs font-bold text-white flex items-center gap-2 transition disabled:opacity-50"
                        >
                            {isTesting ? <RefreshCw size={14} className="animate-spin text-primary" /> : <Send size={14} className="text-primary" />}
                            <span>{isTesting ? 'Testing Handshake...' : 'Test SMTP Connection'}</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleSaveConfig}
                            disabled={isSaving || isTesting}
                            className="px-6 py-3 rounded-2xl bg-primary hover:bg-primary/90 active:scale-95 text-black font-black text-xs flex items-center gap-2 transition shadow-lg shadow-primary/20 disabled:opacity-50"
                        >
                            {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                            <span>{isSaving ? 'Saving...' : 'Save SMTP Configuration'}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* 3. SEND TEST EMAIL (Direct real-world delivery test) */}
            <div className="bg-[#121212]/90 border border-white/10 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary">
                            <Send size={18} />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-white tracking-tight">Send Test Email</h3>
                            <p className="text-xs text-gray-500">
                                Send a live email through your configured SMTP server to verify actual inbox delivery.
                            </p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSendTestEmail} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                            <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">
                                Recipient Email Address <span className="text-primary">*</span>
                            </label>
                            <input
                                type="email"
                                required
                                value={recipientEmail}
                                onChange={(e) => setRecipientEmail(e.target.value)}
                                placeholder="cesartrongcoso@gmail.com"
                                className="w-full bg-black/60 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none font-mono transition"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">
                                Optional Subject
                            </label>
                            <input
                                type="text"
                                value={testSubject}
                                onChange={(e) => setTestSubject(e.target.value)}
                                placeholder="[RidersBUD] Live SMTP Verification"
                                className="w-full bg-black/60 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none transition"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">
                            Optional Test Message
                        </label>
                        <textarea
                            rows={3}
                            value={testMessage}
                            onChange={(e) => setTestMessage(e.target.value)}
                            placeholder="Testing live SMTP outbound relay to verify delivery to inbox."
                            className="w-full bg-black/60 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none transition"
                        />
                    </div>

                    {/* Result Banner */}
                    {sendEmailResult && (
                        <div className={`p-4 rounded-2xl border flex items-start gap-3.5 transition-all ${
                            sendEmailResult.success
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                        }`}>
                            {sendEmailResult.success ? (
                                <CheckCircle2 size={18} className="text-emerald-400 mt-0.5 shrink-0" />
                            ) : (
                                <XCircle size={18} className="text-rose-400 mt-0.5 shrink-0" />
                            )}
                            <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="text-xs font-bold">{sendEmailResult.message}</p>
                                    {sendEmailResult.timestamp && (
                                        <span className="text-[10px] opacity-60 font-mono">[{sendEmailResult.timestamp}]</span>
                                    )}
                                </div>
                                {sendEmailResult.details && (
                                    <p className="text-[11px] font-mono opacity-80 break-all">{sendEmailResult.details}</p>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            disabled={isSendingEmail || !recipientEmail || !settings.smtpHost}
                            className="px-6 py-3 rounded-2xl bg-white hover:bg-gray-100 active:scale-95 text-black font-black text-xs flex items-center gap-2 transition disabled:opacity-40"
                        >
                            {isSendingEmail ? <RefreshCw size={14} className="animate-spin text-primary" /> : <Send size={14} />}
                            <span>{isSendingEmail ? 'Sending Test Email...' : 'Send Test Email'}</span>
                        </button>
                    </div>
                </form>
            </div>

            {/* 4. RECENT EMAIL ACTIVITY & REAL-TIME SMTP LOGS */}
            <div className="bg-[#121212]/90 border border-white/10 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary">
                            <Activity size={18} />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-white tracking-tight">Recent Email Activity</h3>
                            <p className="text-xs text-gray-500">
                                Live transactions and delivery responses directly logged from the SMTP server.
                            </p>
                        </div>
                    </div>
                    <span className="text-[11px] font-mono text-gray-500">{logs.length} Transactions</span>
                </div>

                {logs.length === 0 ? (
                    <div className="text-center py-10 border border-white/5 rounded-2xl bg-black/30">
                        <Mail size={28} className="mx-auto text-gray-600 mb-2" />
                        <p className="text-xs text-gray-400 font-bold">No recent email transactions recorded</p>
                        <p className="text-[11px] text-gray-600 mt-0.5">Send a test email to generate genuine SMTP transaction logs.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-white/5 text-gray-500 font-mono text-[10px] tracking-wider uppercase">
                                    <th className="pb-3 pl-2">Date & Time</th>
                                    <th className="pb-3">Recipient</th>
                                    <th className="pb-3">Subject</th>
                                    <th className="pb-3">Status</th>
                                    <th className="pb-3 pr-2 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                                {logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-white/[0.02] transition">
                                        <td className="py-3 pl-2 text-gray-400 whitespace-nowrap">
                                            {new Date(log.timestamp).toLocaleString()}
                                        </td>
                                        <td className="py-3 text-white font-medium max-w-[180px] truncate" title={log.recipient}>
                                            {log.recipient}
                                        </td>
                                        <td className="py-3 text-gray-300 max-w-[200px] truncate font-sans" title={log.subject}>
                                            {log.subject}
                                        </td>
                                        <td className="py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase border inline-flex items-center gap-1 ${
                                                log.status === 'Accepted by SMTP Server' || log.status === 'Delivered'
                                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                    : log.status === 'Sending' || log.status === 'Submitted to SMTP Server'
                                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                            }`}>
                                                <span className={`w-1 h-1 rounded-full ${
                                                    log.status === 'Accepted by SMTP Server' || log.status === 'Delivered' ? 'bg-emerald-400' : 'bg-rose-400'
                                                }`} />
                                                {log.status}
                                            </span>
                                        </td>
                                        <td className="py-3 pr-2 text-right whitespace-nowrap">
                                            <button
                                                type="button"
                                                onClick={() => setSelectedLog(log)}
                                                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-bold text-gray-300 hover:text-white transition"
                                            >
                                                View Details
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* View Details Modal */}
            {selectedLog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-[#181818] border border-white/10 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
                        <div className="flex items-center justify-between pb-3 border-b border-white/10">
                            <h4 className="text-base font-black text-white">Email Transaction Receipt</h4>
                            <button
                                type="button"
                                onClick={() => setSelectedLog(null)}
                                className="p-1 rounded-lg text-gray-400 hover:text-white transition"
                            >
                                <XCircle size={18} />
                            </button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-white/5">
                                <span className="text-gray-500 uppercase font-mono text-[10px]">Status:</span>
                                <span className="col-span-2 font-bold text-white">{selectedLog.status}</span>
                            </div>

                            <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-white/5">
                                <span className="text-gray-500 uppercase font-mono text-[10px]">Recipient:</span>
                                <span className="col-span-2 font-mono text-white break-all">{selectedLog.recipient}</span>
                            </div>

                            <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-white/5">
                                <span className="text-gray-500 uppercase font-mono text-[10px]">Sender:</span>
                                <span className="col-span-2 font-mono text-white break-all">{selectedLog.sender}</span>
                            </div>

                            <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-white/5">
                                <span className="text-gray-500 uppercase font-mono text-[10px]">Subject:</span>
                                <span className="col-span-2 font-medium text-white">{selectedLog.subject}</span>
                            </div>

                            <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-white/5">
                                <span className="text-gray-500 uppercase font-mono text-[10px]">SMTP Relay:</span>
                                <span className="col-span-2 font-mono text-gray-300">{selectedLog.host}:{selectedLog.port} ({selectedLog.encryption})</span>
                            </div>

                            <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-white/5">
                                <span className="text-gray-500 uppercase font-mono text-[10px]">Timestamp:</span>
                                <span className="col-span-2 font-mono text-gray-400">{new Date(selectedLog.timestamp).toLocaleString()}</span>
                            </div>

                            {selectedLog.messageId && (
                                <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-white/5">
                                    <span className="text-gray-500 uppercase font-mono text-[10px]">Message ID:</span>
                                    <span className="col-span-2 font-mono text-primary break-all">{selectedLog.messageId}</span>
                                </div>
                            )}

                            {selectedLog.serverResponse && (
                                <div className="space-y-1 pt-1">
                                    <span className="text-gray-500 uppercase font-mono text-[10px] block">Server Response:</span>
                                    <div className="p-2.5 rounded-xl bg-black/60 border border-white/5 font-mono text-[11px] text-emerald-400 break-all">
                                        {selectedLog.serverResponse}
                                    </div>
                                </div>
                            )}

                            {selectedLog.errorMessage && (
                                <div className="space-y-1 pt-1">
                                    <span className="text-rose-400 uppercase font-mono text-[10px] block">Error Message:</span>
                                    <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 font-mono text-[11px] text-rose-300 break-all">
                                        {selectedLog.errorMessage}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                type="button"
                                onClick={() => setSelectedLog(null)}
                                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

