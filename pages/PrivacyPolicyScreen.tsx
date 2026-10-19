import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { Shield, ArrowLeft, Calendar, FileText, CheckCircle, ChevronDown, ChevronUp, Lock } from 'lucide-react';

export const PrivacyPolicyScreen: React.FC = () => {
    const navigate = useNavigate();
    const [expandedSection, setExpandedSection] = useState<string | null>(null);

    const toggleSection = (id: string) => {
        setExpandedSection(prev => prev === id ? null : id);
    };

    const sections = [
        {
            id: 'info-collection',
            title: '1. Information We Collect',
            content: `We collect information necessary to provide on-demand vehicle assistance, booking coordination, parts purchasing, and mechanic dispatch:
• Personal Identifiers: Full name, email address, phone number, and physical billing/service addresses.
• Vehicle Details: Vehicle make, model, year, vehicle identification number (VIN/chassis if provided), license plate number, and maintenance logs.
• Precise Geolocation Data: With your explicit permission, real-time GPS coordinates are collected while using the app to dispatch nearby mechanics, calculate travel distance, track on-the-road assistance, and facilitate emergency roadside support.
• Payment & Transaction Records: HitPay reference numbers, payment timestamps, transaction IDs, service fees, and invoices. We do not store raw credit card numbers or banking secrets directly on our servers; payments are processed securely through certified PCI-DSS payment gateways.
• Communications: In-app chat messages, audio call metadata, voice notes, and customer support correspondence.`
        },
        {
            id: 'how-we-use',
            title: '2. How We Use Your Information',
            content: `Your data is utilized strictly for service delivery, system reliability, and trust:
• Connecting vehicle owners with certified mobile mechanics in nearby service zones.
• Processing secure payments, service guarantees, and mechanic commission disbursements.
• Sending critical real-time alerts regarding appointment confirmations, mechanic arrival times, and job completion.
• Continuously improving service quality, route optimization, fraud prevention, and platform safety.
• Fulfilling legal obligations under Republic Act No. 10173 (Philippine Data Privacy Act of 2012) and applicable municipal transportation guidelines.`
        },
        {
            id: 'data-sharing',
            title: '3. Data Sharing & Third Parties',
            content: `We respect your privacy and will never sell your personal information. Data is shared exclusively under strict safeguards:
• Service Mechanics & Partners: Only the necessary contact details, service location, and vehicle symptoms are revealed to the mechanic assigned to your booking.
• Secure Infrastructure: Google Firebase / Firestore for encrypted data persistence, Google Cloud for serverless cloud execution, and HitPay Payment Solutions for checkout processing.
• Law Enforcement & Legal Compliance: Only when required by Philippine legal process, court subpoenas, or bona fide safety emergencies.`
        },
        {
            id: 'security-retention',
            title: '4. Data Security & Storage',
            content: `We implement modern technical and administrative safeguards:
• End-to-end HTTPS/TLS 1.3 encryption in transit for all network traffic.
• Granular Firestore security rules preventing unauthorized access across user roles.
• Tokenized credential storage and automatic session expiration.
• Regular security scans, dependency updates, and automated audit checks.`
        },
        {
            id: 'your-rights',
            title: '5. Your Rights as a Data Subject',
            content: `Under the Philippine Data Privacy Act of 2012, you possess the right to:
• Access your personal data held within RidersBUD.
• Rectify inaccurate, outdated, or incomplete profile records.
• Erase or block your data upon termination of your account (subject to statutory financial auditing requirements).
• Withdraw consent for non-essential location tracking or promotional notifications at any time via Profile Settings.`
        },
        {
            id: 'contact-privacy',
            title: '6. Data Protection Officer Contact',
            content: `If you have questions, inquiries, or requests regarding this Privacy Policy or wish to exercise your statutory rights, please contact our Data Protection Office:
• Organization: RidersBUD Philippines
• Address: Unit 3201-C Tektite East Tower, Ortigas Center, Pasig City, Philippines 1605
• Email: privacy@ridersbud.com / support@ridersbud.com
• Phone: +63 947 9975 969`
        }
    ];

    return (
        <div className="flex flex-col min-h-screen bg-[#0A0A0A] text-white font-sans">
            <Header
                title="Privacy Policy"
                subtitle="Data Privacy & Protection"
                showBack={true}
                showLogo={false}
                icon={<Shield size={20} className="text-primary" />}
            />

            <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6 space-y-6 pb-20">
                {/* Hero Card */}
                <div className="relative overflow-hidden bg-gradient-to-br from-[#1C1C1E] to-[#121212] border border-white/10 rounded-3xl p-6 shadow-2xl">
                    <div className="absolute top-0 right-0 w-36 h-36 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shrink-0 shadow-lg shadow-primary/20">
                            <Lock size={20} />
                        </div>
                        <div>
                            <span className="text-[10px] font-black tracking-widest uppercase text-primary">RidersBUD Trust & Safety</span>
                            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Privacy Policy</h2>
                        </div>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                        At RidersBUD, we take your trust and privacy seriously. This policy describes how we collect, store, process, and protect your personal information when using our mobile application and related web services.
                    </p>
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/5 text-[11px] text-gray-400 font-medium">
                        <Calendar size={14} className="text-primary" />
                        <span>Last Updated: October 2026 • Compliant with Republic Act No. 10173</span>
                    </div>
                </div>

                {/* Policy Highlights Cards */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#141416] border border-white/5 p-4 rounded-2xl flex flex-col justify-between">
                        <div className="w-8 h-8 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 flex items-center justify-center mb-2">
                            <CheckCircle size={16} />
                        </div>
                        <div>
                            <h3 className="text-xs font-bold text-white mb-0.5">Zero Data Selling</h3>
                            <p className="text-[10px] text-gray-400 leading-snug">We never sell your contacts, locations, or vehicle history to third-party ad networks.</p>
                        </div>
                    </div>
                    <div className="bg-[#141416] border border-white/5 p-4 rounded-2xl flex flex-col justify-between">
                        <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mb-2">
                            <Shield size={16} />
                        </div>
                        <div>
                            <h3 className="text-xs font-bold text-white mb-0.5">Encrypted at Rest</h3>
                            <p className="text-[10px] text-gray-400 leading-snug">All financial tokens and sensitive user information are strongly encrypted.</p>
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
                                        <FileText size={16} className={isExpanded ? 'text-primary' : 'text-gray-500'} />
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

                {/* Footer Assurance */}
                <div className="bg-[#141416] border border-white/5 rounded-2xl p-4 text-center space-y-2">
                    <p className="text-xs text-gray-400">
                        Need immediate assistance with privacy concerns or data removal?
                    </p>
                    <a
                        href="mailto:privacy@ridersbud.com"
                        className="inline-block text-xs font-bold text-primary hover:text-orange-400 transition"
                    >
                        privacy@ridersbud.com
                    </a>
                </div>
            </main>
        </div>
    );
};

export default PrivacyPolicyScreen;
