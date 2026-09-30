import React from 'react';
import { FileCheck, Shield, AlertTriangle, CheckCircle2, UserCheck, Clock } from 'lucide-react';
import { Settings } from '../../../../types';

interface VerificationSettingsTabProps {
    settings: Settings;
    onChange: (field: keyof Settings, value: any) => void;
}

export const VerificationSettingsTab: React.FC<VerificationSettingsTabProps> = ({
    settings,
    onChange
}) => {
    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Onboarding Requirements */}
            <div className="space-y-5 bg-[#121212]/70 border border-white/5 p-6 rounded-3xl">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                        <FileCheck size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-white tracking-tight">Specialist & Driver KYC Verification</h3>
                        <p className="text-xs text-gray-500">Enforce background checks, identity proof, and credential renewals.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                        { title: 'Email Address Verification', desc: 'Require confirmed email before booking or mechanic job dispatch.', field: 'emailVerificationRequired' as keyof Settings },
                        { title: 'Mobile Phone OTP Verification', desc: 'Enforce SMS code authentication for sensitive account updates.', field: 'otpVerificationRequired' as keyof Settings },
                        { title: 'Government ID & Selfie Check', desc: 'Require valid UMID, Passport, or Driver License upload for KYC.', field: 'identityVerificationRequired' as keyof Settings },
                        { title: 'Auto-Approve Certified Mechanics', desc: 'Instantly activate mechanics with verified pre-qualification IDs.', field: 'mechanicAutoApproval' as keyof Settings }
                    ].map((item) => (
                        <div
                            key={item.title}
                            className="p-5 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-between gap-4"
                        >
                            <div>
                                <h4 className="text-xs font-bold text-white">{item.title}</h4>
                                <p className="text-[10px] text-gray-400 mt-1 max-w-xs">{item.desc}</p>
                            </div>

                            <button
                                type="button"
                                onClick={() => onChange(item.field, !settings[item.field])}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                    settings[item.field] ? 'bg-primary' : 'bg-gray-700'
                                }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                        settings[item.field] ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                                />
                            </button>
                        </div>
                    ))}
                </div>

                <div className="pt-2 max-w-sm space-y-1.5">
                    <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Document Expiry Grace Period (Months)</label>
                    <input
                        type="number"
                        min={1}
                        max={36}
                        value={settings.verificationExpiryMonths ?? 12}
                        onChange={(e) => onChange('verificationExpiryMonths', parseInt(e.target.value) || 12)}
                        className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none"
                    />
                    <p className="text-[10px] text-gray-500">Service providers receive re-verification warnings prior to expiry.</p>
                </div>
            </div>
        </div>
    );
};
