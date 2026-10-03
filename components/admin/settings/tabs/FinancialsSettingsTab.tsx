import React, { useEffect, useState } from 'react';
import { DollarSign, CreditCard, Shield, Eye, EyeOff, CheckCircle2, AlertTriangle, Upload, FileText, QrCode } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db as firestoreDb } from '../../../../firebase';
import { Settings } from '../../../../types';

/**
 * HitPay credentials live ONLY in the admin-only settings/hitpaySecrets document
 * (firestore.rules: settings/** is publicly readable, hitpaySecrets is not).
 * They are never stored in settings/main, never shipped in the client bundle,
 * and never read by the app at runtime — the Cloud Functions resolve them
 * server-side (settings/hitpaySecrets → env fallback).
 */
const SECRET_FIELDS = ['hitpayApiKey', 'hitpaySalt', 'hitpaySandboxApiKey', 'hitpaySandboxSalt'] as const;
type SecretField = (typeof SECRET_FIELDS)[number];

interface FinancialsSettingsTabProps {
    settings: Settings;
    onChange: (field: keyof Settings, value: any) => void;
    onUploadAsset: (e: React.ChangeEvent<HTMLInputElement>, field: keyof Settings) => void;
}

export const FinancialsSettingsTab: React.FC<FinancialsSettingsTabProps> = ({
    settings,
    onChange,
    onUploadAsset
}) => {
    const [showLiveKey, setShowLiveKey] = useState(false);
    const [showLiveSalt, setShowLiveSalt] = useState(false);
    const [showSandboxKey, setShowSandboxKey] = useState(false);
    const [showSandboxSalt, setShowSandboxSalt] = useState(false);

    // Credential fields bind to the admin-only hitpaySecrets document
    const [secrets, setSecrets] = useState<Partial<Record<SecretField, string>>>({});

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const snap = await getDoc(doc(firestoreDb, 'settings', 'hitpaySecrets'));
                if (!cancelled && snap.exists()) {
                    const d: any = snap.data() || {};
                    setSecrets({
                        hitpayApiKey: d.hitpayApiKey || d.liveApiKey || '',
                        hitpaySalt: d.hitpaySalt || d.liveSalt || '',
                        hitpaySandboxApiKey: d.hitpaySandboxApiKey || d.sandboxApiKey || '',
                        hitpaySandboxSalt: d.hitpaySandboxSalt || d.sandboxSalt || ''
                    });
                }
            } catch (e) {
                console.warn('[FinancialsSettingsTab] hitpaySecrets read failed:', e);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const updateSecret = (field: SecretField, value: string) => {
        setSecrets(prev => ({ ...prev, [field]: value }));
        setDoc(doc(firestoreDb, 'settings', 'hitpaySecrets'), { [field]: value }, { merge: true })
            .catch(e => console.warn('[FinancialsSettingsTab] hitpaySecrets write failed:', e));
    };

    const secretValue = (field: SecretField): string =>
        secrets[field] ?? ((settings as any)[field] as string) ?? '';

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Currency, Commissions & Tax */}
            <div className="space-y-5 bg-[#121212]/70 border border-white/5 p-6 rounded-3xl">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                        <DollarSign size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-white tracking-tight">Currency, Commissions & Taxes</h3>
                        <p className="text-xs text-gray-500">Define fee structures, platform commission cuts, and tax compliance.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">System Currency</label>
                        <select
                            value={settings.currency || 'PHP'}
                            onChange={(e) => onChange('currency', e.target.value)}
                            className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none"
                        >
                            <option value="PHP">PHP - Philippine Peso (₱)</option>
                            <option value="USD">USD - US Dollar ($)</option>
                            <option value="EUR">EUR - Euro (€)</option>
                            <option value="SGD">SGD - Singapore Dollar (S$)</option>
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Platform Service Fee (%)</label>
                        <input
                            type="number"
                            min={0}
                            max={100}
                            step={0.5}
                            value={settings.serviceFeePercentage ?? 30}
                            onChange={(e) => onChange('serviceFeePercentage', parseFloat(e.target.value) || 0)}
                            className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">VAT / Tax Rate (%)</label>
                        <input
                            type="number"
                            min={0}
                            max={100}
                            step={0.5}
                            value={settings.taxRatePercentage ?? 12}
                            onChange={(e) => onChange('taxRatePercentage', parseFloat(e.target.value) || 0)}
                            className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Minimum Payout (₱)</label>
                        <input
                            type="number"
                            min={100}
                            value={settings.minimumPayout ?? 500}
                            onChange={(e) => onChange('minimumPayout', parseFloat(e.target.value) || 0)}
                            className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    <div className="space-y-1.5">
                        <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Tax ID / TIN Number</label>
                        <input
                            type="text"
                            value={settings.taxIdentificationNumber || ''}
                            onChange={(e) => onChange('taxIdentificationNumber', e.target.value)}
                            placeholder="000-123-456-000"
                            className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Invoice Prefix</label>
                        <input
                            type="text"
                            value={settings.invoicePrefix || 'INV-RB-'}
                            onChange={(e) => onChange('invoicePrefix', e.target.value)}
                            placeholder="INV-RB-"
                            className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Receipt Prefix</label>
                        <input
                            type="text"
                            value={settings.receiptPrefix || 'REC-RB-'}
                            onChange={(e) => onChange('receiptPrefix', e.target.value)}
                            placeholder="REC-RB-"
                            className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* HitPay Gateway Integration */}
            <div className="space-y-5 bg-[#121212]/70 border border-white/5 p-6 rounded-3xl">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary">
                            <CreditCard size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white tracking-tight">HitPay Payment Gateway</h3>
                            <p className="text-xs text-gray-500">Automated checkout for GCash, Maya, Cards, and QRPH payments.</p>
                        </div>
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer">
                        <span className="text-xs text-gray-300 font-bold">Enable HitPay Gateway</span>
                        <input
                            type="checkbox"
                            checked={settings.hitpayEnabled ?? false}
                            onChange={(e) => onChange('hitpayEnabled', e.target.checked)}
                            className="w-5 h-5 rounded text-primary accent-primary"
                        />
                    </label>
                </div>

                {/* Gateway Mode Status Banner */}
                {(() => {
                    const isSandbox = settings.hitpaySandboxMode ?? true;
                    return (
                        <>
                            <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all ${
                                isSandbox
                                    ? 'bg-amber-500/10 border-amber-500/30'
                                    : 'bg-emerald-500/10 border-emerald-500/30'
                            }`}>
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl ${isSandbox ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                        <AlertTriangle size={18} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-black uppercase tracking-wider text-white">
                                                Active Environment:
                                            </span>
                                            <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                                                isSandbox
                                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                                                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                            }`}>
                                                ● {isSandbox ? 'Sandbox Test Mode Active' : 'Live Production Mode Active'}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-gray-400 mt-0.5">
                                            {isSandbox
                                                ? 'Transactions are simulated using test credentials. Live Production credentials are automatically locked and deactivated.'
                                                : 'Real payments and actual monetary transactions are enabled. Sandbox test credentials are deactivated.'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 self-end sm:self-center bg-black/40 px-3.5 py-2 rounded-xl border border-white/5">
                                    <span className="text-[11px] font-bold text-gray-300">Sandbox Test Mode</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={isSandbox}
                                            onChange={(e) => onChange('hitpaySandboxMode', e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-emerald-600/60 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                                    </label>
                                </div>
                            </div>

                            {/* API Credentials — stored in admin-only settings/hitpaySecrets */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {/* Live Keys Card */}
                                <div className={`space-y-4 p-5 rounded-2xl border transition-all ${
                                    isSandbox
                                        ? 'bg-black/20 border-white/5 opacity-50'
                                        : 'bg-black/50 border-emerald-500/40 shadow-lg shadow-emerald-500/5'
                                }`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400">
                                                Live Production Credentials
                                            </h4>
                                            {!isSandbox && (
                                                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                                    ● Active
                                                </span>
                                            )}
                                        </div>
                                        {isSandbox && (
                                            <span className="text-[10px] font-bold text-gray-500 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                                                🔒 Auto-Disabled (Sandbox Active)
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-gray-400">
                                        Endpoint: <code className="text-emerald-400/80 font-mono">https://api.hit-pay.com/v1</code>
                                    </p>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Live API Key</label>
                                        <div className="relative">
                                            <input
                                                type={showLiveKey ? 'text' : 'password'}
                                                value={secretValue('hitpayApiKey')}
                                                onChange={(e) => updateSecret('hitpayApiKey', e.target.value)}
                                                disabled={isSandbox}
                                                placeholder={isSandbox ? 'Disabled in Sandbox Mode' : 'Live API Key...'}
                                                className={`w-full border rounded-xl px-4 py-2.5 text-xs text-white pr-10 font-mono transition-all ${
                                                    isSandbox
                                                        ? 'bg-black/30 border-white/5 text-gray-500 cursor-not-allowed'
                                                        : 'bg-black/60 border-white/10 focus:border-emerald-500'
                                                }`}
                                            />
                                            <button
                                                type="button"
                                                disabled={isSandbox}
                                                onClick={() => setShowLiveKey(!showLiveKey)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                                            >
                                                {showLiveKey ? <EyeOff size={14} /> : <Eye size={14} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Live Salt Secret</label>
                                        <div className="relative">
                                            <input
                                                type={showLiveSalt ? 'text' : 'password'}
                                                value={secretValue('hitpaySalt')}
                                                onChange={(e) => updateSecret('hitpaySalt', e.target.value)}
                                                disabled={isSandbox}
                                                placeholder={isSandbox ? 'Disabled in Sandbox Mode' : 'Live Webhook Salt...'}
                                                className={`w-full border rounded-xl px-4 py-2.5 text-xs text-white pr-10 font-mono transition-all ${
                                                    isSandbox
                                                        ? 'bg-black/30 border-white/5 text-gray-500 cursor-not-allowed'
                                                        : 'bg-black/60 border-white/10 focus:border-emerald-500'
                                                }`}
                                            />
                                            <button
                                                type="button"
                                                disabled={isSandbox}
                                                onClick={() => setShowLiveSalt(!showLiveSalt)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                                            >
                                                {showLiveSalt ? <EyeOff size={14} /> : <Eye size={14} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Sandbox Keys Card */}
                                <div className={`space-y-4 p-5 rounded-2xl border transition-all ${
                                    !isSandbox
                                        ? 'bg-black/20 border-white/5 opacity-50'
                                        : 'bg-black/50 border-amber-500/40 shadow-lg shadow-amber-500/5'
                                }`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-xs font-black uppercase tracking-wider text-amber-400">
                                                Sandbox Test Credentials
                                            </h4>
                                            {isSandbox && (
                                                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                                    ● Active
                                                </span>
                                            )}
                                        </div>
                                        {!isSandbox && (
                                            <span className="text-[10px] font-bold text-gray-500 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                                                🔒 Auto-Disabled (Live Active)
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-gray-400">
                                        Endpoint: <code className="text-amber-400/80 font-mono">https://api.sandbox.hit-pay.com/v1</code>
                                    </p>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Sandbox API Key</label>
                                        <div className="relative">
                                            <input
                                                type={showSandboxKey ? 'text' : 'password'}
                                                value={secretValue('hitpaySandboxApiKey')}
                                                onChange={(e) => updateSecret('hitpaySandboxApiKey', e.target.value)}
                                                disabled={!isSandbox}
                                                placeholder={!isSandbox ? 'Disabled in Live Production Mode' : 'Sandbox API Key...'}
                                                className={`w-full border rounded-xl px-4 py-2.5 text-xs text-white pr-10 font-mono transition-all ${
                                                    !isSandbox
                                                        ? 'bg-black/30 border-white/5 text-gray-500 cursor-not-allowed'
                                                        : 'bg-black/60 border-white/10 focus:border-amber-500'
                                                }`}
                                            />
                                            <button
                                                type="button"
                                                disabled={!isSandbox}
                                                onClick={() => setShowSandboxKey(!showSandboxKey)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                                            >
                                                {showSandboxKey ? <EyeOff size={14} /> : <Eye size={14} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Sandbox Salt Secret</label>
                                        <div className="relative">
                                            <input
                                                type={showSandboxSalt ? 'text' : 'password'}
                                                value={secretValue('hitpaySandboxSalt')}
                                                onChange={(e) => updateSecret('hitpaySandboxSalt', e.target.value)}
                                                disabled={!isSandbox}
                                                placeholder={!isSandbox ? 'Disabled in Live Production Mode' : 'Sandbox Salt...'}
                                                className={`w-full border rounded-xl px-4 py-2.5 text-xs text-white pr-10 font-mono transition-all ${
                                                    !isSandbox
                                                        ? 'bg-black/30 border-white/5 text-gray-500 cursor-not-allowed'
                                                        : 'bg-black/60 border-white/10 focus:border-amber-500'
                                                }`}
                                            />
                                            <button
                                                type="button"
                                                disabled={!isSandbox}
                                                onClick={() => setShowSandboxSalt(!showSandboxSalt)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                                            >
                                                {showSandboxSalt ? <EyeOff size={14} /> : <Eye size={14} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    );
                })()}
            </div>

            {/* Manual GCash Direct Transfer */}
            <div className="space-y-5 bg-[#121212]/70 border border-white/5 p-6 rounded-3xl">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                            <QrCode size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white tracking-tight">Manual GCash / QR Direct Transfer</h3>
                            <p className="text-xs text-gray-500">Provides customers a direct GCash QR code with manual receipt verification.</p>
                        </div>
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer">
                        <span className="text-xs text-gray-300 font-bold">Enable Manual GCash</span>
                        <input
                            type="checkbox"
                            checked={settings.gcashEnabled ?? false}
                            onChange={(e) => onChange('gcashEnabled', e.target.checked)}
                            className="w-5 h-5 rounded text-primary accent-primary"
                        />
                    </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">GCash Account Name</label>
                            <input
                                type="text"
                                value={settings.gcashAccountName || ''}
                                onChange={(e) => onChange('gcashAccountName', e.target.value)}
                                placeholder="e.g. RidersBUD Auto Care Inc."
                                className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">GCash Registered Mobile Number</label>
                            <input
                                type="text"
                                value={settings.gcashNumber || ''}
                                onChange={(e) => onChange('gcashNumber', e.target.value)}
                                placeholder="0917-xxx-xxxx"
                                className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none"
                            />
                        </div>
                    </div>

                    {/* QR Code Upload Card */}
                    <div className="p-4 bg-black/40 border border-white/10 rounded-2xl flex items-center gap-4">
                        <div className="w-24 h-24 bg-black/60 rounded-xl border border-white/5 flex items-center justify-center overflow-hidden p-1 flex-shrink-0">
                            {settings.gcashQrCodeUrl ? (
                                <img src={settings.gcashQrCodeUrl} alt="GCash QR" className="max-w-full max-h-full object-contain" />
                            ) : (
                                <QrCode size={28} className="text-gray-600" />
                            )}
                        </div>
                        <div className="flex-1 space-y-2">
                            <h5 className="text-xs font-bold text-white">GCash Official Standee QR</h5>
                            <p className="text-[10px] text-gray-400">Displayed in booking checkout for instant customer scan & pay.</p>
                            <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-bold text-white transition">
                                <Upload size={12} className="text-primary" />
                                <span>Upload QR Asset</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => onUploadAsset(e, 'gcashQrCodeUrl')}
                                />
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
