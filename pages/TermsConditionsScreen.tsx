import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { FileCheck, Calendar, CheckCircle2, ChevronDown, AlertTriangle, Scale, ShieldAlert } from 'lucide-react';

export const TermsConditionsScreen: React.FC = () => {
    const navigate = useNavigate();
    const [expandedSection, setExpandedSection] = useState<string | null>(null);

    const toggleSection = (id: string) => {
        setExpandedSection(prev => prev === id ? null : id);
    };

    const sections = [
        {
            id: 'acceptance',
            title: '1. Acceptance of Terms',
            content: `By downloading, installing, registering, or accessing the RidersBUD mobile application or web portal, you agree to be bound by these Terms and Conditions and our Privacy Policy. If you do not agree to these terms in their entirety, you must discontinue using our services immediately.`
        },
        {
            id: 'services-overview',
            title: '2. Platform Services & Matching',
            content: `RidersBUD operates as a two-sided digital marketplace and dispatch platform connecting independent vehicle owners ("Customers") with accredited automotive technicians and emergency roadside mechanics ("Mechanics"):
• On-Demand Dispatch: Dispatches nearest available mechanics based on user-shared GPS location, vehicle type, and emergency condition.
• Special Services: Includes liaison services (LTO renewal, emissions testing assistance), scheduled maintenance, towing assistance, and driver-for-hire accommodations.
• Parts Store: Offers genuine replacement parts, fluids, and accessories fulfilled through accredited partner merchants.`
        },
        {
            id: 'customer-obligations',
            title: '3. Customer Obligations & Conduct',
            content: `As a Customer using RidersBUD, you agree to:
• Provide truthful, accurate vehicle details, ownership information, and issue descriptions.
• Ensure the service location is legally accessible and safe for the dispatched mechanic to operate.
• Inspect the mechanic’s completed work upon job handover before signing off on service completion.
• Refrain from any abusive, discriminatory, or unlawful conduct toward mechanics or support staff.`
        },
        {
            id: 'mechanic-obligations',
            title: '4. Mechanic Standards & Qualifications',
            content: `Mechanics providing services through RidersBUD must:
• Maintain valid government-issued licenses, technical certifications, and clear NBI background checks.
• Execute all vehicle repairs according to recognized automotive safety standards.
• Provide accurate diagnostics and transparent part replacements without unauthorized surcharges.
• Maintain valid insurance and comply with local road safety ordinances in the Philippines.`
        },
        {
            id: 'pricing-payments',
            title: '5. Fees, Pricing, & 70/30 Commission Model',
            content: `• Transparent Estimates: Diagnostic and estimated service fees are quoted before booking confirmation.
• Commission Structure: Service labor earnings are split according to our transparent platform structure (70% net to the certified Mechanic, 30% platform infrastructure and operations fee).
• Payment Gateways: All online payments are handled securely through HitPay (supporting GCash, Maya, QR Ph, GrabPay, and direct bank transfers).
• Cash-on-Service: Where permitted, cash payments must be acknowledged through the app's in-session job verification flow.`
        },
        {
            id: 'cancellations-refunds',
            title: '6. Cancellations & Refund Policy',
            content: `• Customer Cancellations: Cancellations made before a mechanic has been dispatched incur no penalty. If cancelled after the mechanic has travelled or arrived on site, a standardized call-out diagnostic fee may apply to compensate the technician.
• Mechanic Cancellations: If a mechanic cancels or fails to arrive, the system will re-assign the nearest available technician automatically or refund any pre-charged deposit.
• Warranty & Workmanship: Standard repair jobs carried out through the platform include our 30-day workmanship assurance, provided parts and installation are kept unaltered.`
        },
        {
            id: 'limitation-liability',
            title: '7. Limitation of Liability',
            content: `To the fullest extent permitted by Philippine law:
• RidersBUD acts as an intermediary platform and is not an automotive manufacturer or employer of independent contractor mechanics.
• RidersBUD shall not be liable for indirect, incidental, punitive, or consequential damages resulting from unauthorized third-party vehicle alterations, pre-existing catastrophic mechanical failures, or severe weather conditions.
• In all cases, maximum platform liability is limited to the total service fee paid for the specific booking in question.`
        },
        {
            id: 'modifications',
            title: '8. Governing Law & Dispute Resolution',
            content: `These Terms and Conditions shall be governed by and construed in accordance with the laws of the Republic of the Philippines. Any unresolved dispute arising out of or in connection with these terms shall be subject to the exclusive jurisdiction of the competent courts in Pasig City, Metro Manila, Philippines.`
        }
    ];

    return (
        <div className="flex flex-col min-h-screen bg-[#0A0A0A] text-white font-sans">
            <Header
                title="Terms & Conditions"
                subtitle="User Agreement & Platform Rules"
                showBack={true}
                showLogo={false}
                icon={<FileCheck size={20} className="text-primary" />}
            />

            <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6 space-y-6 pb-20">
                {/* Hero Card */}
                <div className="relative overflow-hidden bg-gradient-to-br from-[#1C1C1E] to-[#121212] border border-white/10 rounded-3xl p-6 shadow-2xl">
                    <div className="absolute top-0 right-0 w-36 h-36 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shrink-0 shadow-lg shadow-primary/20">
                            <Scale size={20} />
                        </div>
                        <div>
                            <span className="text-[10px] font-black tracking-widest uppercase text-primary">Legal Agreement</span>
                            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Terms of Service</h2>
                        </div>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                        Please read these terms carefully before engaging with the RidersBUD platform. These rules govern bookings, mechanic dispatch, parts purchases, warranty claims, and fair use.
                    </p>
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/5 text-[11px] text-gray-400 font-medium">
                        <Calendar size={14} className="text-primary" />
                        <span>Effective Date: October 2026 • Version 1.1</span>
                    </div>
                </div>

                {/* Quick Terms Summary */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#141416] border border-white/5 p-4 rounded-2xl flex flex-col justify-between">
                        <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mb-2">
                            <CheckCircle2 size={16} />
                        </div>
                        <div>
                            <h3 className="text-xs font-bold text-white mb-0.5">Fair 70/30 Split</h3>
                            <p className="text-[10px] text-gray-400 leading-snug">Mechanics receive 70% direct labor earnings, paid promptly via GCash/Banks.</p>
                        </div>
                    </div>
                    <div className="bg-[#141416] border border-white/5 p-4 rounded-2xl flex flex-col justify-between">
                        <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center mb-2">
                            <ShieldAlert size={16} />
                        </div>
                        <div>
                            <h3 className="text-xs font-bold text-white mb-0.5">30-Day Guarantee</h3>
                            <p className="text-[10px] text-gray-400 leading-snug">All completed workmanship through the app carries guaranteed warranty coverage.</p>
                        </div>
                    </div>
                </div>

                {/* Expandable Sections */}
                <div className="space-y-3">
                    {sections.map((section) => {
                        const isExpanded = expandedSection === section.id;
                        return (
                            <div
                                key={section.id}
                                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                                    isExpanded 
                                        ? 'bg-[#18181A] border-primary/40 shadow-lg shadow-primary/5' 
                                        : 'bg-[#141416] border-white/5 hover:border-white/15'
                                }`}
                            >
                                <button
                                    type="button"
                                    onClick={() => toggleSection(section.id)}
                                    className="w-full p-4 sm:p-5 flex items-center justify-between text-left gap-3 focus:outline-none"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <FileCheck size={16} className={isExpanded ? 'text-primary' : 'text-gray-500'} />
                                        <h3 className="text-sm font-bold text-white tracking-tight truncate">{section.title}</h3>
                                    </div>
                                    <div className={`p-1 rounded-lg bg-white/5 shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-primary' : 'text-gray-400'}`}>
                                        <ChevronDown size={16} />
                                    </div>
                                </button>
                                {isExpanded && (
                                    <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-gray-300 leading-relaxed border-t border-white/5 whitespace-pre-line animate-fadeIn">
                                        {section.content}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Questions Box */}
                <div className="bg-[#141416] border border-white/5 rounded-2xl p-4 text-center space-y-2">
                    <p className="text-xs text-gray-400">
                        Have legal inquiries or questions regarding our operational terms?
                    </p>
                    <a
                        href="mailto:legal@ridersbud.com"
                        className="inline-block text-xs font-bold text-primary hover:text-orange-400 transition"
                    >
                        legal@ridersbud.com
                    </a>
                </div>
            </main>
        </div>
    );
};

export default TermsConditionsScreen;
