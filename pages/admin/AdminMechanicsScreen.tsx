import React, { useState, useMemo, useEffect } from 'react';
import { Mechanic } from '../../types';
import Modal from '../../components/admin/Modal';
import { useDatabase } from '../../context/DatabaseContext';
import Spinner from '../../components/Spinner';
import { useLocation, useNavigate } from 'react-router-dom';
import EnhancedKPICard from '../../components/admin/EnhancedKPICard';
import { Plus, Users, Search, Filter, Edit, Trash2, Mail, Shield, User, Camera, Check, X, FileText, Briefcase, Star, MapPin, Calendar, Clock, DollarSign, Award, ChevronRight, Phone, MessageSquare, ExternalLink, Download, ArrowRight, Eye, BadgeCheck, Activity, CheckCircle, UserCheck, TrendingUp, ChevronDown, ArrowUpDown, FileCheck, XCircle, AlertCircle, ZoomIn, File, Image as ImageIcon, FileText as DocIcon, Upload, Grid, List, MoreVertical } from 'lucide-react';
import { storageService } from '../../services/StorageService';
import { calculateMechanicWalletLedger } from '../../utils/mechanicLedger';

type SortableKeys = 'name' | 'rating' | 'reviews' | 'registrationDate' | 'status';

const MechanicFormModal: React.FC<{
    mechanic?: Mechanic;
    onClose: () => void;
    onSave: (mechanic: Mechanic | Omit<Mechanic, 'id' | 'status' | 'rating' | 'reviews'>) => void;
    onDelete?: (id: string) => void;
}> = ({ mechanic, onClose, onSave, onDelete }) => {
    const { db } = useDatabase();
    const [activeTab, setActiveTab] = useState<'profile' | 'documents'>('profile');
    const [formData, setFormData] = useState({
        name: mechanic?.name || '',
        email: mechanic?.email || '',
        password: '',
        phone: mechanic?.phone || '',
        bio: mechanic?.bio || '',
        specializations: mechanic?.specializations || [],
        imageUrl: mechanic?.imageUrl || '/placeholder.svg',
        birthday: mechanic?.birthday || '',
    });
    const [documents, setDocuments] = useState<{ nbi: string; license: string; certificate: string; nbiType?: string; licenseType?: string; certificateType?: string }>({
        nbi: mechanic?.verificationDocuments?.nbiClearanceUrl || '',
        license: mechanic?.verificationDocuments?.driversLicenseUrl || '',
        certificate: mechanic?.verificationDocuments?.certificateOfTrainingsUrl || '',
        nbiType: mechanic?.verificationDocuments?.nbiClearanceUrl ? 'image' : undefined,
        licenseType: mechanic?.verificationDocuments?.driversLicenseUrl ? 'image' : undefined,
        certificateType: mechanic?.verificationDocuments?.certificateOfTrainingsUrl ? 'image' : undefined,
    });
    const [isSaving, setIsSaving] = useState(false);
    const [profileImagePreview, setProfileImagePreview] = useState(formData.imageUrl);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [isUploadingDoc, setIsUploadingDoc] = useState<string | null>(null);
    const [showMechPassword, setShowMechPassword] = useState(false);

    // Retrieve active catalog categories and services dynamically from live services
    const serviceCategories = useMemo(() => {
        if (!db?.services) return [];
        const liveCategories = db.services
            .filter(s => s.isActive !== false)
            .map(s => s.category)
            .filter(Boolean);
        return Array.from(new Set(liveCategories));
    }, [db]);

    const filteredServices = useMemo(() => {
        if (!selectedCategory) return [];
        return (db?.services || []).filter(s => s.category === selectedCategory && s.isActive !== false);
    }, [db, selectedCategory]);

    const predefinedSpecializations = [
        'Engine Repair', 'Brake Systems', 'Electrical Systems', 'Transmission',
        'Air Conditioning', 'Suspension', 'Exhaust Systems', 'Diagnostics',
        'Oil Change', 'Tire Service', 'Battery Service', 'Wheel Alignment',
        'Paint & Body', 'Detailing', 'Welding'
    ];

    const getFileExtension = (type: string): string => {
        if (type === 'application/pdf') return 'pdf';
        if (type.includes('word') || type.includes('document')) return 'docx';
        return 'jpg';
    };

    const getFileIcon = (type?: string) => {
        if (type === 'application/pdf') return <File size={20} className="text-red-400" />;
        if (type?.includes('word') || type?.includes('document')) return <DocIcon size={20} className="text-blue-400" />;
        return <ImageIcon size={20} className="text-green-400" />;
    };

    const handleProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const tempId = 'temp_' + Date.now();
                const url = await storageService.uploadFile(`mechanics/${tempId}/profile.${getFileExtension(file.type)}`, file, false);
                setFormData(p => ({ ...p, imageUrl: url }));
                setProfileImagePreview(url);
            } catch (error) {
                console.error("Profile image upload failed:", error);
                alert("Failed to upload image. Please try again.");
            }
        }
    };

    const handleDocumentUpload = (documentType: 'nbi' | 'license' | 'certificate') => async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIsUploadingDoc(documentType);
            try {
                const tempId = 'temp_' + Date.now();
                const ext = getFileExtension(file.type);
                const url = await storageService.uploadFile(`mechanics/${tempId}/${documentType}_${Date.now()}.${ext}`, file, false);
                setDocuments(p => ({ 
                    ...p, 
                    [documentType]: url,
                    [`${documentType}Type`]: file.type
                }));
            } catch (error) {
                console.error(`Document upload failed for ${documentType}:`, error);
                alert("Failed to upload document. Please try again.");
            } finally {
                setIsUploadingDoc(null);
            }
        }
    };

    const toggleSpecialization = (spec: string) => {
        setFormData(p => ({
            ...p,
            specializations: p.specializations.includes(spec)
                ? p.specializations.filter(s => s !== spec)
                : [...p.specializations, spec]
        }));
    };

    const handleSelectServiceSpec = (serviceName: string) => {
        if (!serviceName) return;
        if (!formData.specializations.includes(serviceName)) {
            setFormData(p => ({
                ...p,
                specializations: [...p.specializations, serviceName]
            }));
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        await new Promise(resolve => setTimeout(resolve, 800));

        const mechanicData = {
            ...formData,
            verificationDocuments: {
                nbiClearanceUrl: documents.nbi,
                driversLicenseUrl: documents.license,
                certificateOfTrainingsUrl: documents.certificate,
                nbiClearanceType: documents.nbiType,
                driversLicenseType: documents.licenseType,
                certificateOfTrainingsType: documents.certificateType,
                verificationStatus: mechanic?.verificationDocuments?.verificationStatus || 'Pending',
            }
        };

        if (mechanic) {
            onSave({ ...mechanic, ...mechanicData, password: formData.password || mechanic.password });
        } else {
            onSave({
                ...mechanicData,
                password: formData.password || 'password123',
                lat: 14.55 + (Math.random() - 0.5) * 0.1,
                lng: 121.02 + (Math.random() - 0.5) * 0.1,
                registrationDate: new Date().toISOString().split('T')[0],
            });
        }
        setIsSaving(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
            <div className="bg-[#121212] border border-white/10 rounded-[2rem] w-full max-w-2xl shadow-2xl transform transition-all scale-100 overflow-hidden flex flex-col max-h-[90vh]">
                {/* Compact Header Section */}
                <div className="px-6 py-4 bg-gradient-to-r from-primary/25 via-orange-500/5 to-transparent border-b border-white/5 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="pb-0">
                            <h2 className="text-xl font-black text-white tracking-tighter leading-none">
                                {mechanic ? 'Edit Mechanic' : 'New Mechanic'}
                            </h2>
                            <div className="flex gap-1.5 mt-2">
                                <button
                                    onClick={() => setActiveTab('profile')}
                                    className={`px-3 py-1 rounded-lg text-[9px] font-black tracking-widest transition-all uppercase ${activeTab === 'profile' ? 'bg-primary text-white shadow-lg' : 'bg-white/5 text-gray-500 hover:text-white'}`}
                                >
                                    Personal Profile
                                </button>
                                <button
                                    onClick={() => setActiveTab('documents')}
                                    className={`px-3 py-1 rounded-lg text-[9px] font-black tracking-widest transition-all uppercase ${activeTab === 'documents' ? 'bg-primary text-white shadow-lg' : 'bg-white/5 text-gray-500 hover:text-white'}`}
                                >
                                    Certifications
                                </button>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 text-white rounded-full transition-colors z-10">
                        <X size={16} />
                    </button>
                </div>

                {/* Form Content */}
                <div className="px-6 py-4 overflow-y-auto custom-scrollbar flex-1">
                    {activeTab === 'profile' ? (
                        <div className="space-y-4 animate-fadeIn">
                            {/* Inline avatar image and top info */}
                            <div className="flex flex-col sm:flex-row gap-4 items-center bg-white/5 p-4 rounded-2xl border border-white/5 mb-1">
                                <div className="relative group flex-shrink-0">
                                    <div className="w-16 h-16 rounded-2xl bg-[#1A1A1A] border border-white/10 flex items-center justify-center overflow-hidden shadow-md">
                                        <img src={profileImagePreview} alt="Profile" className="w-full h-full object-cover" />
                                    </div>
                                    <label className="absolute -bottom-1 -right-1 p-1.5 bg-primary hover:bg-orange-600 text-white rounded-lg shadow cursor-pointer transition-all transform hover:scale-105 active:scale-95">
                                        <Camera size={10} />
                                        <input type="file" id="mechanic-profile-image" name="mechanic-profile-image" accept="image/*" className="hidden" onChange={handleProfileImageUpload} />
                                    </label>
                                </div>
                                <div className="flex-grow w-full">
                                    <div className="space-y-1">
                                        <label htmlFor="mechanic-name" className="text-[9px] tracking-widest font-black text-gray-500 ml-1 uppercase">Technician Name</label>
                                        <input
                                            id="mechanic-name"
                                            name="mechanic-name"
                                            type="text"
                                            value={formData.name}
                                            onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                                            className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2 text-xs text-white outline-none transition-all placeholder-gray-700 font-bold focus:border-white/10"
                                            placeholder="e.g. Rico Blanco"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label htmlFor="mechanic-email" className="text-[9px] tracking-widest font-black text-gray-500 ml-1 uppercase">Professional Email</label>
                                    <input
                                        id="mechanic-email"
                                        name="mechanic-email"
                                        type="email"
                                        value={formData.email}
                                        onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                                        className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white outline-none transition-all placeholder-gray-700 font-bold focus:border-white/10"
                                        placeholder="rico@ridersbud.com"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label htmlFor="mechanic-phone" className="text-[9px] tracking-widest font-black text-gray-500 ml-1 uppercase">Contact Number</label>
                                    <input
                                        id="mechanic-phone"
                                        name="mechanic-phone"
                                        type="tel"
                                        value={formData.phone}
                                        onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                                        className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white outline-none transition-all placeholder-gray-700 font-bold focus:border-white/10"
                                        placeholder="+63 9xx xxx xxxx"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label htmlFor="mechanic-dob" className="text-[9px] tracking-widest font-black text-gray-500 ml-1 uppercase">Date of Birth</label>
                                    <input
                                        id="mechanic-dob"
                                        name="mechanic-dob"
                                        type="date"
                                        value={formData.birthday}
                                        onChange={e => setFormData(p => ({ ...p, birthday: e.target.value }))}
                                        className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white outline-none transition-all font-bold focus:border-white/10"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label htmlFor="mechanic-password" className="text-[9px] tracking-widest font-black text-gray-500 ml-1 uppercase">Password Hint</label>
                                    <div className="relative">
                                        <input
                                            id="mechanic-password"
                                            name="mechanic-password"
                                            type={showMechPassword ? 'text' : 'password'}
                                            value={formData.password}
                                            onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                                            className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 pr-10 text-xs text-white outline-none transition-all font-bold focus:border-white/10"
                                            placeholder={mechanic ? "••••••••" : "Leave blank for default"}
                                        />
                                        <button type="button" onClick={() => setShowMechPassword(!showMechPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-primary transition-colors">
                                            {showMechPassword ? <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Dropdown selectors for Category & Services */}
                            <div className="bg-white/5 rounded-2xl p-4 border border-white/5 space-y-3">
                                <h4 className="text-[9px] tracking-widest font-black text-primary uppercase">Quick Add Catalog Specializations</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label htmlFor="mechanic-catalog-category" className="text-[8px] tracking-widest font-black text-gray-400 ml-1 uppercase">Catalog Category</label>
                                        <select
                                            id="mechanic-catalog-category"
                                            name="mechanic-catalog-category"
                                            value={selectedCategory}
                                            onChange={e => setSelectedCategory(e.target.value)}
                                            className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none transition-all font-bold"
                                        >
                                            <option value="">-- Select Category --</option>
                                            {serviceCategories.map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label htmlFor="mechanic-catalog-service" className="text-[8px] tracking-widest font-black text-gray-400 ml-1 uppercase">Catalog Service</label>
                                        <select
                                            id="mechanic-catalog-service"
                                            name="mechanic-catalog-service"
                                            disabled={!selectedCategory}
                                            onChange={e => handleSelectServiceSpec(e.target.value)}
                                            defaultValue=""
                                            className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none transition-all font-bold disabled:opacity-40"
                                        >
                                            <option value="">-- Add Service Specialty --</option>
                                            {filteredServices.map(srv => (
                                                <option key={srv.id} value={srv.name}>{srv.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[9px] tracking-widest font-black text-gray-500 ml-1 uppercase">Expertise & Specializations</label>
                                <div className="flex flex-wrap gap-1.5 p-3 bg-white/5 rounded-2xl border border-white/5 max-h-36 overflow-y-auto">
                                    {formData.specializations.map(spec => (
                                        <button
                                            key={spec}
                                            type="button"
                                            onClick={() => toggleSpecialization(spec)}
                                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border bg-primary text-white border-primary shadow-sm hover:bg-orange-600 flex items-center gap-1"
                                        >
                                            {spec} <X size={10} />
                                        </button>
                                    ))}
                                    {predefinedSpecializations.filter(s => !formData.specializations.includes(s)).map(spec => (
                                        <button
                                            key={spec}
                                            type="button"
                                            onClick={() => toggleSpecialization(spec)}
                                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border bg-black/20 text-gray-500 border-white/5 hover:text-white hover:border-white/20"
                                        >
                                            + {spec}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label htmlFor="mechanic-bio" className="text-[9px] tracking-widest font-black text-gray-500 ml-1 uppercase">Professional Bio</label>
                                <textarea
                                    id="mechanic-bio"
                                    name="mechanic-bio"
                                    value={formData.bio}
                                    onChange={e => setFormData(p => ({ ...p, bio: e.target.value }))}
                                    rows={3}
                                    className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white outline-none transition-all placeholder-gray-700 font-medium resize-none focus:border-white/10"
                                    placeholder="Brief summary of experience..."
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-fadeIn">
                            {[
                                { id: 'nbi', label: 'NBI Clearance', desc: 'Required for background verification', icon: <Shield size={24} className="text-blue-400" /> },
                                { id: 'license', label: "Driver's License", desc: 'Proof of road competency', icon: <FileText size={24} className="text-green-400" /> },
                                { id: 'certificate', label: 'Technical Certification', desc: 'Valid automotive credentials', icon: <Briefcase size={24} className="text-purple-400" /> }
                            ].map(doc => {
                                const docType = documents[`${doc.id}Type` as keyof typeof documents] as string | undefined;
                                const isImage = !docType || docType.startsWith('image/');
                                return (
                                <div key={doc.id} className="group relative bg-white/5 border border-white/5 rounded-3xl p-6 transition-all hover:bg-white/10 hover:border-white/10">
                                    <div className="flex items-center gap-6">
                                        <div className="w-16 h-16 rounded-2xl bg-black/40 flex items-center justify-center border border-white/5">
                                            {doc.icon}
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-lg font-black text-white  tracking-tight">{doc.label}</h4>
                                            <p className="text-xs text-gray-500 font-bold  tracking-widest mt-1">{doc.desc}</p>
                                        </div>
                                        {documents[doc.id as keyof typeof documents] ? (
                                            <div className="flex items-center gap-3">
                                                {isImage ? (
                                                    <div className="relative group/img w-32 h-20 rounded-xl overflow-hidden shadow-2xl border border-white/10">
                                                        <img src={documents[doc.id as keyof typeof documents]} alt={doc.label} className="w-full h-full object-cover" />
                                                        <button
                                                            onClick={() => setDocuments(p => ({ ...p, [doc.id]: '', [`${doc.id}Type`]: undefined }))}
                                                            className="absolute inset-0 bg-red-600/80 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity"
                                                        >
                                                            <Trash2 size={24} className="text-white" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="relative group/img w-32 h-20 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center shadow-2xl">
                                                        <div className="text-center">
                                                            {getFileIcon(docType)}
                                                            <p className="text-[10px] text-gray-400 mt-1 font-bold">{docType === 'application/pdf' ? 'PDF' : 'DOCX'}</p>
                                                        </div>
                                                        <button
                                                            onClick={() => setDocuments(p => ({ ...p, [doc.id]: '', [`${doc.id}Type`]: undefined }))}
                                                            className="absolute inset-0 bg-red-600/80 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity"
                                                        >
                                                            <Trash2 size={24} className="text-white" />
                                                        </button>
                                                    </div>
                                                )}
                                                <a 
                                                    href={documents[doc.id as keyof typeof documents]} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="p-3 bg-white/5 hover:bg-primary text-gray-400 hover:text-white rounded-xl transition-all"
                                                    title="View Document"
                                                >
                                                    <ExternalLink size={18} />
                                                </a>
                                            </div>
                                        ) : (
                                            <label className="px-6 py-3 bg-white/5 hover:bg-primary text-[10px] font-black  tracking-widest text-white rounded-xl cursor-pointer transition-all active:scale-95 shadow-lg flex items-center gap-2">
                                                {isUploadingDoc === doc.id ? <Spinner size="sm" color="text-white" /> : <Upload size={16} />}
                                                Upload
                                                <input type="file" id="mechanic-document" name="mechanic-document" className="hidden" accept="image/*,.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={handleDocumentUpload(doc.id as any)} />
                                            </label>
                                        )}
                                    </div>
                                </div>
                            )})}
                        </div>
                    )}
                </div>

                {/* Footer Section */}
                <div className="px-6 py-4 bg-[#1A1A1A]/80 border-t border-white/5 flex items-center justify-between flex-shrink-0">
                    {mechanic && (
                        <button
                            onClick={() => onDelete?.(mechanic.id)}
                            className="px-5 py-2.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl font-black transition-all border border-red-500/20 text-[9px] tracking-widest uppercase"
                        >
                            Terminate
                        </button>
                    )}
                    <div className="flex gap-2 ml-auto">
                        <button onClick={onClose} className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all border border-white/5 text-[9px] tracking-widest uppercase">Discard</button>
                        <button onClick={handleSave} disabled={isSaving} className="px-6 py-2.5 bg-primary hover:bg-orange-600 text-white rounded-xl font-black transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-1.5 disabled:opacity-50 text-[9px] tracking-widest uppercase">
                            {isSaving ? <Spinner size="sm" color="text-white" /> : <Check size={14} />}
                            {mechanic ? 'Update Profile' : 'Register Mechanic'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const VerificationReviewModal: React.FC<{
    mechanic: Mechanic;
    onClose: () => void;
    onApprove: (mechanicId: string) => void;
    onReject: (mechanicId: string, reason: string) => void;
    requirements?: Array<{ id: string; label: string; description: string; isRequired: boolean }>;
}> = ({ mechanic, onClose, onApprove, onReject, requirements }) => {
    const [rejectionReason, setRejectionReason] = useState('');
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [viewingDocument, setViewingDocument] = useState<{ url: string; label: string } | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Get all uploaded documents
    const documents = useMemo(() => {
        const docMap = new Map<string, { id: string; label: string; url: string; isRequired: boolean; type?: string }>();

        const detectType = (url: string) => {
            const ext = url.split('.').pop()?.toLowerCase() || '';
            return ext === 'pdf' ? 'application/pdf' : ext === 'docx' || ext === 'doc' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'image/jpeg';
        };

        // Legacy documents with type detection
        if (mechanic.verificationDocuments?.nbiClearanceUrl) {
            docMap.set('nbi', { id: 'nbi', label: 'NBI Clearance', url: mechanic.verificationDocuments.nbiClearanceUrl, isRequired: true, type: detectType(mechanic.verificationDocuments.nbiClearanceUrl) });
        }
        if (mechanic.verificationDocuments?.driversLicenseUrl) {
            docMap.set('license', { id: 'license', label: "Driver's License", url: mechanic.verificationDocuments.driversLicenseUrl, isRequired: true, type: detectType(mechanic.verificationDocuments.driversLicenseUrl) });
        }
        if (mechanic.verificationDocuments?.certificateOfTrainingsUrl) {
            docMap.set('certificate', { id: 'certificate', label: 'Technical Certification', url: mechanic.verificationDocuments.certificateOfTrainingsUrl, isRequired: true, type: detectType(mechanic.verificationDocuments.certificateOfTrainingsUrl) });
        }

        // Dynamic documents (skip if already added via legacy)
        if (mechanic.verificationDocuments?.uploads) {
            Object.entries(mechanic.verificationDocuments.uploads).forEach(([key, url]) => {
                if (!docMap.has(key)) {
                    const req = requirements?.find(r => r.id === key);
                    if (req && url) {
                        const urlStr = url as string;
                        docMap.set(key, { id: key, label: req.label, url: urlStr, isRequired: req.isRequired, type: detectType(urlStr) });
                    }
                }
            });
        }

        return Array.from(docMap.values());
    }, [mechanic, requirements]);

    const getFileTypeIcon = (type?: string) => {
        if (type === 'application/pdf') return <File size={32} className="text-red-400" />;
        if (type?.includes('word') || type?.includes('document')) return <DocIcon size={32} className="text-blue-400" />;
        return null;
    };

    const isImageFile = (type?: string) => {
        return !type || type.startsWith('image/');
    };

    const handleApprove = async () => {
        setIsProcessing(true);
        await new Promise(resolve => setTimeout(resolve, 800));
        onApprove(mechanic.id);
        setIsProcessing(false);
        onClose();
    };

    const handleReject = async () => {
        if (!rejectionReason.trim()) {
            alert('Please provide a reason for rejection');
            return;
        }
        setIsProcessing(true);
        await new Promise(resolve => setTimeout(resolve, 800));
        onReject(mechanic.id, rejectionReason);
        setIsProcessing(false);
        onClose();
    };

    const verificationStatus = mechanic.verificationDocuments?.verificationStatus || 'Pending';

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-fadeIn">
                <div className="bg-[#121212] border border-white/10 rounded-[2.5rem] w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                    {/* Header */}
                    <div className="relative bg-gradient-to-r from-primary/20 via-orange-500/10 to-transparent p-8 border-b border-white/5">
                        <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full transition-colors">
                            <X size={20} />
                        </button>
                        <div className="flex items-center gap-6">
                            <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                                <FileCheck size={32} className="text-primary" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black text-white  tracking-tighter">Verification Review</h2>
                                <p className="text-sm text-gray-400 font-bold mt-2">Review and approve documents for <span className="text-white">{mechanic.name}</span></p>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                        {/* Mechanic Info */}
                        <div className="bg-[#18181b] border border-white/5 rounded-[2rem] p-6 mb-8 space-y-6">
                            <div className="flex items-center gap-6">
                                <img src={mechanic.imageUrl} alt={mechanic.name} className="w-24 h-24 rounded-2xl object-cover ring-4 ring-white/5" />
                                <div className="flex-1">
                                    <h3 className="text-2xl font-black text-white">{mechanic.name}</h3>
                                    <p className="text-sm text-gray-400 mt-1">{mechanic.email} • {mechanic.phone}</p>
                                    <div className="flex items-center gap-2 mt-3">
                                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black  tracking-widest ${verificationStatus === 'Approved' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                                            verificationStatus === 'Rejected' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                                verificationStatus === 'Submitted' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                                                    'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                                            }`}>
                                            {verificationStatus}
                                        </span>
                                        <span className="text-xs text-gray-500">Registered: {mechanic.registrationDate}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Bio & Specializations for Review */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
                                <div className="space-y-2">
                                    <h4 className="text-xs font-black text-gray-400 tracking-wider uppercase">Professional Bio</h4>
                                    <p className="text-sm text-gray-300 bg-black/25 p-4 rounded-xl border border-white/5 leading-relaxed font-medium">
                                        {mechanic.bio || "No professional bio provided."}
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <h4 className="text-xs font-black text-gray-400 tracking-wider uppercase">Specializations</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {mechanic.specializations && mechanic.specializations.length > 0 ? (
                                            mechanic.specializations.map((spec) => (
                                                <span key={spec} className="px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-xl text-xs font-black tracking-wide animate-fadeIn">
                                                    {spec}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-xs text-gray-500 italic">No specializations specified.</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Documents Grid */}
                        <div className="mb-8">
                            <h3 className="text-xl font-black text-white  tracking-tight mb-6 flex items-center gap-3">
                                <FileText className="text-primary" size={20} />
                                Submitted Documents ({documents.length})
                            </h3>
                            {documents.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {documents.map((doc) => (
                                        <div key={doc.id} className="bg-[#18181b] border border-white/5 rounded-[1.5rem] p-6 group hover:border-primary/30 transition-all">
                                            <div className="flex items-start justify-between mb-4">
                                                <div>
                                                    <h4 className="text-sm font-black text-white  tracking-wide">{doc.label}</h4>
                                                    {doc.isRequired && (
                                                        <span className="text-[9px] font-black text-primary  tracking-widest bg-primary/10 px-2 py-0.5 rounded mt-1 inline-block">Required</span>
                                                    )}
                                                </div>
                                                {doc.type && (
                                                    <span className="text-[9px] font-black text-gray-500 bg-white/5 px-2 py-1 rounded">
                                                        {doc.type === 'application/pdf' ? 'PDF' : doc.type.includes('word') ? 'DOCX' : 'IMAGE'}
                                                    </span>
                                                )}
                                            </div>
                                            {isImageFile(doc.type) ? (
                                                <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-black/40 border border-white/5 mb-4">
                                                    <img src={doc.url} alt={doc.label} className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-4">
                                                        <button
                                                            onClick={() => setViewingDocument({ url: doc.url, label: doc.label })}
                                                            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-black  tracking-widest flex items-center gap-2 backdrop-blur-sm"
                                                        >
                                                            <ZoomIn size={14} /> View Full
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="relative aspect-[4/3] rounded-xl bg-black/40 border border-white/5 mb-4 flex flex-col items-center justify-center">
                                                    {getFileTypeIcon(doc.type)}
                                                    <p className="text-xs text-gray-400 mt-2 font-bold">{doc.type === 'application/pdf' ? 'PDF Document' : 'Word Document'}</p>
                                                    <div className="flex gap-2 mt-4">
                                                        <a
                                                            href={doc.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-black  tracking-widest flex items-center gap-2 backdrop-blur-sm"
                                                        >
                                                            <ExternalLink size={14} /> Open
                                                        </a>
                                                        <a
                                                            href={doc.url}
                                                            download
                                                            className="px-4 py-2 bg-primary/20 hover:bg-primary/40 text-primary rounded-xl text-xs font-black  tracking-widest flex items-center gap-2 backdrop-blur-sm"
                                                        >
                                                            <Download size={14} /> Download
                                                        </a>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-[2rem]">
                                    <AlertCircle size={48} className="text-gray-600 mx-auto mb-4" />
                                    <p className="text-sm font-black text-gray-500  tracking-widest">No documents uploaded</p>
                                </div>
                            )}
                        </div>

                        {/* Rejection Form */}
                        {showRejectForm && (
                            <div className="bg-red-500/5 border border-red-500/20 rounded-[2rem] p-6 mb-8 animate-fadeIn">
                                <h3 className="text-lg font-black text-red-400  tracking-tight mb-4 flex items-center gap-2">
                                    <XCircle size={20} /> Rejection Reason
                                </h3>
                                <textarea
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    placeholder="Provide detailed feedback on why the verification is being rejected..."
                                    rows={4}
                                    className="w-full bg-black/40 border border-red-500/20 rounded-2xl px-6 py-4 text-white focus:border-red-500/40 outline-none transition-all placeholder-gray-600 font-medium resize-none"
                                />
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="p-8 bg-[#1A1A1A]/80 border-t border-white/5 flex flex-wrap gap-4">
                        {!showRejectForm ? (
                            <>
                                <button
                                    onClick={() => setShowRejectForm(true)}
                                    className="px-8 py-4 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-2xl font-black transition-all border border-red-500/20 text-[10px]  tracking-widest flex items-center gap-2"
                                >
                                    <XCircle size={16} /> Reject Documents
                                </button>
                                <button onClick={onClose} className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold transition-all border border-white/5 text-[10px]  tracking-widest ml-auto">Close</button>
                                <button
                                    onClick={handleApprove}
                                    disabled={isProcessing || documents.length === 0}
                                    className="px-10 py-4 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-black transition-all shadow-xl shadow-green-500/20 flex items-center justify-center gap-3 disabled:opacity-50 text-[10px]  tracking-widest"
                                >
                                    {isProcessing ? <Spinner size="sm" color="text-white" /> : <CheckCircle size={18} />}
                                    Approve & Activate
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={() => { setShowRejectForm(false); setRejectionReason(''); }}
                                    className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold transition-all border border-white/5 text-[10px]  tracking-widest"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleReject}
                                    disabled={isProcessing || !rejectionReason.trim()}
                                    className="px-10 py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-black transition-all shadow-xl shadow-red-500/20 flex items-center justify-center gap-3 disabled:opacity-50 text-[10px]  tracking-widest ml-auto"
                                >
                                    {isProcessing ? <Spinner size="sm" color="text-white" /> : <XCircle size={18} />}
                                    Confirm Rejection
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Document Viewer Modal */}
            {viewingDocument && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-fadeIn" onClick={() => setViewingDocument(null)}>
                    <div className="relative max-w-6xl max-h-[90vh] w-full" onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={() => setViewingDocument(null)}
                            className="absolute -top-12 right-0 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
                        >
                            <X size={24} />
                        </button>
                        <div className="bg-[#121212] border border-white/10 rounded-[2rem] p-4 overflow-hidden">
                            <h3 className="text-xl font-black text-white mb-4 px-4">{viewingDocument.label}</h3>
                            <div className="max-h-[70vh] overflow-auto custom-scrollbar">
                                <img src={viewingDocument.url} alt={viewingDocument.label} className="w-full h-auto" />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

const AdminMechanicsScreen: React.FC = () => {
    const { db, updateMechanicStatus, deleteMechanic, updateMechanic, addMechanic, updateMechanicOnlineStatus, loading } = useDatabase();
    const location = useLocation();
    const navigate = useNavigate();
    const [editingMechanic, setEditingMechanic] = useState<Mechanic | undefined>(undefined);
    const [reviewingMechanic, setReviewingMechanic] = useState<Mechanic | undefined>(undefined);
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' }>({ key: 'name', direction: 'ascending' });

    const requestSort = (key: SortableKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key: SortableKeys) => {
        if (sortConfig.key !== key) return <ArrowUpDown size={14} className="text-gray-600 ml-1" />;
        return sortConfig.direction === 'ascending' ? <ChevronDown size={14} className="text-primary rotate-180 ml-1" /> : <ChevronDown size={14} className="text-primary ml-1" />;
    };
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Inactive' | 'Pending'>('all');
    const [specializationFilter, setSpecializationFilter] = useState<string>('all');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

    useEffect(() => {
        // Outside click dropdown close disabled per user request
    }, []);

    useEffect(() => {
        const state = location.state as { viewMechanicId?: string };
        const mechanicIdToView = state?.viewMechanicId;

        if (mechanicIdToView && db?.mechanics) {
            const mechanicToView = db.mechanics.find(m => m.id === mechanicIdToView);
            if (mechanicToView) {
                setEditingMechanic(mechanicToView);
                setIsFormModalOpen(true);
                navigate(location.pathname, { replace: true, state: {} });
            }
        }
    }, [location.state, db, navigate, location.pathname]);

    const allSpecializations = useMemo(() => {
        if (!db?.mechanics) return [];
        const specs = new Set<string>();
        db.mechanics.forEach(m => {
            if (m.specializations && Array.isArray(m.specializations)) {
                m.specializations.forEach(s => specs.add(s));
            }
        });
        return Array.from(specs).sort();
    }, [db]);

    const filteredMechanics = useMemo(() => {
        if (!db?.mechanics) return [];
        let filtered = db.mechanics.filter(mechanic => {
            const searchMatch = (mechanic.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (mechanic.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (mechanic.specializations || []).some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
            const statusMatch = statusFilter === 'all' || mechanic.status === statusFilter;
            const specMatch = specializationFilter === 'all' || (mechanic.specializations || []).includes(specializationFilter);
            return searchMatch && statusMatch && specMatch;
        });

        filtered.sort((a, b) => {
            let aValue: any;
            let bValue: any;

            switch (sortConfig.key) {
                case 'name':
                    aValue = (a.name || '').toLowerCase();
                    bValue = (b.name || '').toLowerCase();
                    break;
                case 'rating':
                    aValue = a.rating || 0;
                    bValue = b.rating || 0;
                    break;
                case 'reviews':
                    aValue = a.reviews || 0;
                    bValue = b.reviews || 0;
                    break;
                case 'registrationDate':
                    aValue = a.registrationDate ? new Date(String(a.registrationDate).replace(/-/g, '/')).getTime() : 0;
                    bValue = b.registrationDate ? new Date(String(b.registrationDate).replace(/-/g, '/')).getTime() : 0;
                    break;
                case 'status':
                    aValue = a.status || '';
                    bValue = b.status || '';
                    break;
                default:
                    aValue = (a.name || '').toLowerCase();
                    bValue = (b.name || '').toLowerCase();
            }

            if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });

        return filtered;
    }, [db, searchQuery, statusFilter, specializationFilter, sortConfig]);

    // Calculate stats with trends
    const stats = useMemo(() => {
        if (!db?.mechanics) return { total: 0, active: 0, pending: 0, avgRating: 0, totalJobs: 0 };

        const total = db.mechanics.length;
        const active = db.mechanics.filter(m => m.status === 'Active').length;
        const pending = db.mechanics.filter(m => m.status === 'Pending').length;
        const avgRating = db.mechanics.reduce((sum, m) => sum + (m.rating || 0), 0) / (total || 1);
        const totalJobs = db.mechanics.reduce((sum, m) => sum + (m.reviews || 0), 0);

        return { total, active, pending, avgRating, totalJobs };
    }, [db]);

    // Export to CSV
    const exportToCSV = () => {
        const headers = ['Name', 'Email', 'Phone', 'Status', 'Rating', 'Reviews', 'Specializations', 'Joined'];
        const rows = (filteredMechanics || []).map(m => [
            m.name,
            m.email,
            m.phone,
            m.status,
            (m.rating || 0).toFixed(1),
            m.reviews || 0,
            (Array.isArray(m.specializations) ? m.specializations : []).join('; '),
            m.registrationDate || 'N/A'
        ]);

        const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mechanics-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    // Clear all filters
    const clearFilters = () => {
        setSearchQuery('');
        setStatusFilter('all');
        setSpecializationFilter('all');
    };

    if (loading || !db) {
        return <div className="flex items-center justify-center h-full"><Spinner size="lg" color="text-white" /></div>
    }

    const handleSaveMechanic = (mechanicData: Mechanic | Omit<Mechanic, 'id' | 'status' | 'rating' | 'reviews'>) => {
        if ('id' in mechanicData) {
            updateMechanic(mechanicData);
        } else {
            addMechanic({
                ...mechanicData,
                status: 'Pending',
                rating: 0,
                reviews: 0,
            });
        }
        setIsFormModalOpen(false);
        setEditingMechanic(undefined);
    };

    const handleDeleteMechanic = async (id: string) => {
        try {
            await deleteMechanic(id);
            setIsFormModalOpen(false);
            setEditingMechanic(undefined);
        } catch (error) {
            console.error(error);
        }
    };

    const handleApproveMechanic = async (mechanicId: string) => {
        const mechanic = db?.mechanics.find(m => m.id === mechanicId);
        if (!mechanic) return;

        const updatedMechanic: Mechanic = {
            ...mechanic,
            status: 'Active',
            verificationDocuments: {
                ...mechanic.verificationDocuments,
                verificationStatus: 'Approved'
            }
        };
        await updateMechanic(updatedMechanic);
    };

    const handleRejectMechanic = async (mechanicId: string, reason: string) => {
        const mechanic = db?.mechanics.find(m => m.id === mechanicId);
        if (!mechanic) return;

        const updatedMechanic: Mechanic = {
            ...mechanic,
            status: 'Pending',
            verificationDocuments: {
                ...mechanic.verificationDocuments,
                verificationStatus: 'Rejected'
            },
            notes: `Verification rejected: ${reason}`
        };
        await updateMechanic(updatedMechanic);
    };

    const statusColors: { [key: string]: string } = {
        Active: 'bg-green-500/20 text-green-300 border-green-500/30',
        Pending: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
        Inactive: 'bg-red-500/20 text-red-300 border-red-500/30'
    };

    const activeFiltersCount = (searchQuery ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0) + (specializationFilter !== 'all' ? 1 : 0);

    return (
        <div className="space-y-8 animate-fadeIn max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-5xl font-black text-white tracking-tighter  leading-none">Manage Mechanics</h1>
                    <div className="flex items-center gap-2 mt-4">
                        <div className="h-1 w-12 bg-primary rounded-full"></div>
                        <p className="text-gray-500 font-bold  tracking-[0.3em] text-[10px]">Workforce & Operations</p>
                    </div>
                </div>
                <div className="flex items-center gap-4 bg-white/5 p-2 rounded-[2rem] border border-white/5">
                    <div className="flex items-center bg-black/40 rounded-xl p-1 border border-white/5">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                            title="List View"
                        >
                            <List size={16} />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                            title="Grid View"
                        >
                            <Grid size={16} />
                        </button>
                    </div>
                    <button onClick={exportToCSV} className="p-4 hover:bg-white/5 text-gray-400 transition-all rounded-2xl" title="Export CSV"><Download size={20} /></button>
                    <button onClick={() => { setEditingMechanic(undefined); setIsFormModalOpen(true); }} className="px-8 py-4 bg-primary hover:bg-orange-600 text-white rounded-[1.5rem] font-black  tracking-widest text-xs shadow-2xl shadow-primary/20 transition-all active:scale-95 flex items-center gap-3">
                        <Plus size={20} strokeWidth={3} /> New Mechanic
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <EnhancedKPICard
                    title="Total Workforce"
                    value={stats.total}
                    icon={<Users size={24} className="text-white" />}
                    gradient="bg-gradient-to-br from-blue-600 to-blue-900"
                    trend={{ value: 12, isPositive: true }}
                    subtitle="Registered Specialists"
                />
                <EnhancedKPICard
                    title="Active Deployment"
                    value={stats.active}
                    icon={<CheckCircle size={24} className="text-white" />}
                    gradient="bg-gradient-to-br from-green-600 to-green-900"
                    trend={{ value: 8, isPositive: true }}
                    subtitle={`${(stats.total === 0 ? 0 : (stats.active / stats.total) * 100).toFixed(0)}% Utilization`}
                />
                <EnhancedKPICard
                    title="Pending Review"
                    value={stats.pending}
                    icon={<Clock size={24} className="text-white" />}
                    gradient="bg-gradient-to-br from-orange-600 to-orange-900"
                    trend={{ value: stats.pending > 0 ? 5 : 0, isPositive: false }}
                    subtitle="Awaiting Approval"
                />
                <EnhancedKPICard
                    title="Quality Score"
                    value={stats.avgRating.toFixed(1)}
                    icon={<Star size={24} className="text-white" />}
                    gradient="bg-gradient-to-br from-purple-600 to-purple-900"
                    subtitle={`${stats.totalJobs} Jobs Completed`}
                />
            </div>

            {/* Compact Filters */}
            <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary to-orange-600 rounded-[2rem] blur opacity-5 group-hover:opacity-10 transition duration-1000"></div>
                <div className="relative bg-[#121212]/80 backdrop-blur-xl border border-white/10 p-4 rounded-[2rem] flex flex-col lg:flex-row items-center gap-4">
                    <div className="flex-1 relative w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                        <input
                            type="text"
                            placeholder="Search by name, email, or skill..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/5 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white font-medium placeholder-gray-600 outline-none transition-all focus:border-primary/50 focus:bg-white/10"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                            className="bg-white/5 border border-white/5 rounded-xl px-3 py-2 text-sm text-white font-medium outline-none focus:border-primary/50 cursor-pointer hover:bg-white/10"
                        >
                            <option value="all">All Status</option>
                            <option value="Active">Active</option>
                            <option value="Pending">Pending</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                        <select
                            value={specializationFilter}
                            onChange={(e) => setSpecializationFilter(e.target.value)}
                            className="bg-white/5 border border-white/5 rounded-xl px-3 py-2 text-sm text-white font-medium outline-none focus:border-primary/50 cursor-pointer hover:bg-white/10 min-w-[140px]"
                        >
                            <option value="all">All Skills</option>
                            {allSpecializations.map(spec => (
                                <option key={spec} value={spec}>{spec}</option>
                            ))}
                        </select>
                        {activeFiltersCount > 0 && (
                            <button
                                onClick={clearFilters}
                                className="px-3 py-2 bg-red-500/10 text-red-400 rounded-xl text-xs font-bold hover:bg-red-500 hover:text-white transition-all flex items-center gap-1"
                            >
                                <X size={12} /> Clear
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Enhanced Listing Table vs Grid View */}
            {viewMode === 'list' ? (
                <div className="bg-[#121212] border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl animate-fadeIn">
                    <div className="overflow-x-auto custom-scrollbar min-h-[280px] pb-32">
                        {filteredMechanics.length > 0 ? (
                            <table className="w-full border-collapse">
                                <thead className="bg-black/40 sticky top-0 z-10">
                                    <tr>
                                        <th className="p-4 text-left text-xs font-black text-gray-400 tracking-wider">Mechanic</th>
                                        <th className="p-4 text-left text-xs font-black text-gray-400 tracking-wider">Contact Info</th>
                                        <th className="p-4 text-left text-xs font-black text-gray-400 tracking-wider">Specializations</th>
                                        <th className="p-4 text-left text-xs font-black text-gray-400 tracking-wider">Status</th>
                                        <th className="p-4 text-center text-xs font-black text-gray-400 tracking-wider">Verification Docs</th>
                                        <th className="p-4 text-center text-xs font-black text-gray-400 tracking-wider">Completed Jobs</th>
                                        <th className="p-4 text-left text-xs font-black text-gray-400 tracking-wider">Wallet Balance</th>
                                        <th className="p-4 text-right text-xs font-black text-gray-400 tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredMechanics.map((mechanic, idx) => (
                                        <tr
                                            key={mechanic.id}
                                            className={`border-b border-white/5 hover:bg-white/5 transition-colors ${idx % 2 === 0 ? 'bg-black/20' : 'bg-transparent'}`}
                                        >
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="relative flex-shrink-0">
                                                        <img src={mechanic.imageUrl || '/placeholder.svg'} alt={mechanic.name} className="w-11 h-11 object-cover rounded-xl ring-1 ring-white/10" />
                                                        <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#121212] ${mechanic.isOnline ? 'bg-green-500' : mechanic.status === 'Pending' ? 'bg-yellow-500' : mechanic.status === 'Active' ? 'bg-gray-500' : 'bg-red-500'}`} />
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-white text-sm flex items-center gap-1.5">
                                                            {mechanic.name}
                                                            {mechanic.isOnline && (
                                                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block" title="Online" />
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 mt-1">
                                                            <Star size={10} className="text-yellow-500 fill-yellow-500" />
                                                            <span className="text-xs font-medium text-yellow-500">{(mechanic.rating || 0).toFixed(1)}</span>
                                                            <span className="text-[10px] text-gray-600">({mechanic.reviews || 0} reviews)</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 text-xs font-medium">
                                                <div className="text-white flex items-center gap-1.5">
                                                    <Mail size={12} className="text-gray-500 flex-shrink-0" />
                                                    {mechanic.email}
                                                </div>
                                                <div className="text-gray-400 flex items-center gap-1.5 mt-1">
                                                    <Phone size={12} className="text-gray-500 flex-shrink-0" />
                                                    {mechanic.phone}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-wrap gap-1 max-w-[250px]">
                                                    {(mechanic.specializations || []).slice(0, 3).map(spec => (
                                                        <span key={spec} className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded text-[9px] font-bold tracking-tight">
                                                            {spec}
                                                        </span>
                                                    ))}
                                                    {(mechanic.specializations || []).length > 3 && (
                                                        <span className="px-1.5 py-0.5 bg-white/5 text-gray-500 rounded text-[9px] font-medium">
                                                            +{(mechanic.specializations || []).length - 3} more
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-col items-start gap-1">
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusColors[mechanic.status]}`}>
                                                        {mechanic.status}
                                                    </span>
                                                    {mechanic.verificationDocuments?.verificationStatus === 'Submitted' && (
                                                        <span className="text-[9px] font-medium text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20 mt-1 inline-block">
                                                            Needs Verification
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <span 
                                                        className={`w-2.5 h-2.5 rounded-full ${mechanic.verificationDocuments?.nbiClearanceUrl ? 'bg-blue-500' : 'bg-white/5'}`} 
                                                        title={mechanic.verificationDocuments?.nbiClearanceUrl ? "NBI Clearance: Uploaded" : "NBI Clearance: Missing"} 
                                                    />
                                                    <span 
                                                        className={`w-2.5 h-2.5 rounded-full ${mechanic.verificationDocuments?.driversLicenseUrl ? 'bg-green-500' : 'bg-white/5'}`} 
                                                        title={mechanic.verificationDocuments?.driversLicenseUrl ? "Driver's License: Uploaded" : "Driver's License: Missing"} 
                                                    />
                                                    <span 
                                                        className={`w-2.5 h-2.5 rounded-full ${mechanic.verificationDocuments?.certificateOfTrainingsUrl ? 'bg-orange-500' : 'bg-white/5'}`} 
                                                        title={mechanic.verificationDocuments?.certificateOfTrainingsUrl ? "Trainings Certification: Uploaded" : "Trainings Certification: Missing"} 
                                                    />
                                                </div>
                                            </td>
                                            <td className="p-4 text-center text-xs font-bold text-white">
                                                {mechanic.reviews || 0}
                                            </td>
                                            <td className="p-4 text-sm font-bold text-green-400">
                                                ₱{calculateMechanicWalletLedger(mechanic.id, mechanic, db.bookings || [], db.payouts || [], db?.settings?.serviceFeePercentage ?? 30).availableBalance.toLocaleString()}
                                            </td>
                                            <td className="p-4 text-right relative">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteMechanic(mechanic.id);
                                                        }}
                                                        className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:text-white hover:bg-red-500 transition-all focus:outline-none"
                                                        title="Delete Mechanic"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                    <div className="relative inline-block text-left">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setActiveDropdownId(activeDropdownId === `mechanic-${mechanic.id}` ? null : `mechanic-${mechanic.id}`);
                                                            }}
                                                            className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all focus:outline-none"
                                                            title="Actions"
                                                        >
                                                            <MoreVertical size={16} />
                                                        </button>

                                                        {activeDropdownId === `mechanic-${mechanic.id}` && (
                                                            <div
                                                                className="absolute right-0 mt-2 w-44 rounded-xl bg-[#121212] border border-white/10 shadow-2xl z-50 py-2 animate-fadeIn"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <div className="px-4 py-2.5 flex items-center justify-between border-b border-white/5 pb-3 mb-1.5">
                                                                     <span className="text-xs text-gray-400 font-extrabold tracking-wider uppercase">Availability</span>
                                                                     <button
                                                                         onClick={async () => {
                                                                             try {
                                                                                 await updateMechanicOnlineStatus(mechanic.id, !mechanic.isOnline);
                                                                             } catch (e) {
                                                                                 console.error("Failed to toggle online status", e);
                                                                             }
                                                                         }}
                                                                         className={`relative inline-flex h-5 w-9 items-center rounded-full transition-all duration-300 focus:outline-none ${mechanic.isOnline ? 'bg-green-500' : 'bg-white/10'}`}
                                                                         title={mechanic.isOnline ? "Set Offline" : "Set Online"}
                                                                     >
                                                                         <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-md transition-transform duration-300 ${mechanic.isOnline ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                                                                     </button>
                                                                 </div>
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingMechanic(mechanic);
                                                                        setIsFormModalOpen(true);
                                                                        setActiveDropdownId(null);
                                                                    }}
                                                                    className="w-full text-left px-4 py-2.5 text-sm text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 flex items-center gap-2 transition-colors"
                                                                >
                                                                    <Edit size={14} />
                                                                    Edit Info
                                                                </button>
                                                                {(mechanic.verificationDocuments?.verificationStatus === 'Submitted' || mechanic.status === 'Pending') && (
                                                                    <button
                                                                        onClick={() => {
                                                                            setReviewingMechanic(mechanic);
                                                                            setActiveDropdownId(null);
                                                                        }}
                                                                        className="w-full text-left px-4 py-2.5 text-sm text-yellow-400 hover:bg-yellow-500/10 hover:text-yellow-300 flex items-center gap-2 transition-colors"
                                                                    >
                                                                        <FileCheck size={14} />
                                                                        Review Docs
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => {
                                                                        navigate(`/mechanic/${mechanic.id}`);
                                                                        setActiveDropdownId(null);
                                                                    }}
                                                                    className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white flex items-center gap-2 transition-colors"
                                                                >
                                                                    <ExternalLink size={14} />
                                                                    View Profile
                                                                </button>
                                                                <div className="border-t border-white/5 my-1"></div>
                                                                <button
                                                                    onClick={() => {
                                                                        handleDeleteMechanic(mechanic.id);
                                                                        setActiveDropdownId(null);
                                                                    }}
                                                                    className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center gap-2 transition-colors"
                                                                >
                                                                    <Trash2 size={14} />
                                                                    Delete Mechanic
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="text-center py-16">
                                <Users size={48} className="text-gray-600 mx-auto mb-4" />
                                <p className="text-lg font-bold text-gray-400">No mechanics found</p>
                                <p className="text-xs text-gray-500 mt-1">Try adjusting your filters</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredMechanics.length > 0 ? filteredMechanics.map((mechanic) => (
                        <div key={mechanic.id} className="group relative bg-[#1a1a1a] border border-white/10 rounded-2xl p-4 hover:border-primary/40 hover:bg-[#1e1e22] transition-all duration-200">
                            {/* Header Row: Avatar + Name + Status */}
                            <div className="flex items-start gap-3 mb-3">
                                <div className="relative flex-shrink-0">
                                    <img src={mechanic.imageUrl || '/placeholder.svg'} alt={mechanic.name} className="w-12 h-12 rounded-xl object-cover ring-2 ring-white/5" />
                                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#1a1a1a] ${mechanic.isOnline ? 'bg-green-500' : mechanic.status === 'Pending' ? 'bg-yellow-500' : mechanic.status === 'Active' ? 'bg-gray-500' : 'bg-red-500'}`}></div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-bold text-white truncate">{mechanic.name}</h3>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <Star size={10} className="text-yellow-500 fill-yellow-500" />
                                        <span className="text-xs font-medium text-yellow-500">{(mechanic.rating || 0).toFixed(1)}</span>
                                        <span className="text-[10px] text-gray-600">({mechanic.reviews || 0})</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${statusColors[mechanic.status]}`}>
                                        {mechanic.status}
                                    </span>
                                    {mechanic.isOnline && (
                                        <span className="flex items-center gap-1 px-1.5 py-0.5 bg-green-500/10 rounded-full">
                                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                                            <span className="text-[8px] font-medium text-green-400">Online</span>
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Contact Row */}
                            <div className="flex items-center gap-2 mb-3 text-[10px]">
                                <Mail size={10} className="text-gray-500 flex-shrink-0" />
                                <span className="text-gray-400 truncate">{mechanic.email}</span>
                            </div>
                            <div className="flex items-center gap-2 mb-3 text-[10px]">
                                <Phone size={10} className="text-gray-500 flex-shrink-0" />
                                <span className="text-gray-400">{mechanic.phone}</span>
                            </div>

                            {/* Skills Row */}
                            <div className="mb-3">
                                <div className="flex flex-wrap gap-1">
                                    {(mechanic.specializations || []).slice(0, 2).map(spec => (
                                        <span key={spec} className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded text-[9px] font-medium">
                                            {spec}
                                        </span>
                                    ))}
                                    {(mechanic.specializations || []).length > 2 && (
                                        <span className="px-1.5 py-0.5 bg-white/5 text-gray-500 rounded text-[9px] font-medium">
                                            +{(mechanic.specializations || []).length - 2}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Stats Row */}
                            <div className="grid grid-cols-3 gap-2 mb-3">
                                <div className="bg-white/5 rounded-lg p-2 text-center">
                                    <p className="text-[8px] text-gray-500 font-medium">Docs</p>
                                    <div className="flex items-center justify-center gap-0.5 mt-0.5">
                                        {mechanic.verificationDocuments?.nbiClearanceUrl && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" title="NBI" />}
                                        {mechanic.verificationDocuments?.driversLicenseUrl && <span className="w-1.5 h-1.5 bg-green-500 rounded-full" title="License" />}
                                        {mechanic.verificationDocuments?.certificateOfTrainingsUrl && <span className="w-1.5 h-1.5 bg-purple-500 rounded-full" title="Cert" />}
                                        {!mechanic.verificationDocuments?.nbiClearanceUrl && !mechanic.verificationDocuments?.driversLicenseUrl && !mechanic.verificationDocuments?.certificateOfTrainingsUrl && <span className="text-[9px] text-gray-600">-</span>}
                                    </div>
                                </div>
                                <div className="bg-white/5 rounded-lg p-2 text-center">
                                    <p className="text-[8px] text-gray-500 font-medium">Jobs</p>
                                    <p className="text-xs font-bold text-white mt-0.5">{mechanic.reviews || 0}</p>
                                </div>
                                <div className="bg-white/5 rounded-lg p-2 text-center">
                                    <p className="text-[8px] text-gray-500 font-medium">Balance</p>
                                    <p className="text-xs font-bold text-green-400 mt-0.5">₱{calculateMechanicWalletLedger(mechanic.id, mechanic, db.bookings || [], db.payouts || [], db?.settings?.serviceFeePercentage ?? 30).availableBalance.toLocaleString()}</p>
                                </div>
                            </div>

                            {/* Verification Alert */}
                            {(mechanic.verificationDocuments?.verificationStatus === 'Submitted' || mechanic.status === 'Pending') && (
                                <div className="flex items-center gap-1.5 mb-3 p-1.5 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                                    <AlertCircle size={10} className="text-yellow-500" />
                                    <span className="text-[9px] font-medium text-yellow-500">Pending verification</span>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex items-center gap-1.5 pt-2 border-t border-white/5">
                                <button
                                    onClick={async () => {
                                        try {
                                            await updateMechanicOnlineStatus(mechanic.id, !mechanic.isOnline);
                                        } catch (e) {
                                            console.error("Failed to toggle online status", e);
                                        }
                                    }}
                                    className={`px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 ${
                                        mechanic.isOnline 
                                            ? 'bg-green-500/10 text-green-400 hover:bg-green-600 hover:text-white' 
                                            : 'bg-white/5 text-gray-400 hover:bg-gray-700 hover:text-white'
                                    }`}
                                    title={mechanic.isOnline ? "Set Offline" : "Set Online"}
                                >
                                    <span className={`w-1.5 h-1.5 rounded-full ${mechanic.isOnline ? 'bg-green-500' : 'bg-gray-500'}`} />
                                    {mechanic.isOnline ? 'Online' : 'Offline'}
                                </button>

                                <button 
                                    onClick={() => { setEditingMechanic(mechanic); setIsFormModalOpen(true); }} 
                                    className="flex-1 px-2 py-1.5 bg-white/5 hover:bg-blue-600 text-gray-400 hover:text-white rounded-lg text-[10px] font-medium transition-all flex items-center justify-center gap-1"
                                >
                                    <Edit size={11} /> Edit
                                </button>
                                {(mechanic.verificationDocuments?.verificationStatus === 'Submitted' || mechanic.status === 'Pending') && (
                                    <button
                                        onClick={() => setReviewingMechanic(mechanic)}
                                        className="flex-1 px-2 py-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-lg text-[10px] font-medium transition-all flex items-center justify-center gap-1"
                                    >
                                        <FileCheck size={11} /> Review
                                    </button>
                                )}
                                <button 
                                    onClick={() => navigate(`/mechanic/${mechanic.id}`)}
                                    className="p-1.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-all"
                                    title="View Profile"
                                >
                                    <ExternalLink size={11} />
                                </button>
                                <button 
                                    onClick={() => handleDeleteMechanic(mechanic.id)}
                                    className="p-1.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-lg transition-all"
                                    title="Delete Mechanic"
                                >
                                    <Trash2 size={11} />
                                </button>
                            </div>
                        </div>
                    )) : (
                        <div className="col-span-full flex flex-col items-center justify-center py-16 border-2 border-dashed border-white/10 rounded-2xl">
                            <Users size={32} className="text-gray-600 mb-3" />
                            <p className="text-sm font-medium text-gray-400">No mechanics found</p>
                            <p className="text-[10px] text-gray-600 mt-1">Try adjusting your filters</p>
                        </div>
                    )}
                </div>
            )}

            {isFormModalOpen && <MechanicFormModal mechanic={editingMechanic} onClose={() => setIsFormModalOpen(false)} onSave={handleSaveMechanic} onDelete={handleDeleteMechanic} />}
            {reviewingMechanic && (
                <VerificationReviewModal
                    mechanic={reviewingMechanic}
                    onClose={() => setReviewingMechanic(undefined)}
                    onApprove={handleApproveMechanic}
                    onReject={handleRejectMechanic}
                    requirements={db?.settings?.verificationRequirements}
                />
            )}
        </div>
    );
};

export default AdminMechanicsScreen;
