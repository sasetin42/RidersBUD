import React, { useState, useMemo } from 'react';
import { useMechanicAuth } from '../context/MechanicAuthContext';
import { useDatabase } from '../context/DatabaseContext';
import { fileToBase64 } from '../utils/fileUtils';
import Spinner from './Spinner';
import { FileText, CheckCircle, Upload, AlertCircle, Trash2, FileCheck, ShieldCheck } from 'lucide-react';

const MechanicVerificationModal: React.FC = () => {
    const { mechanic, updateMechanicProfile } = useMechanicAuth();
    const { db } = useDatabase();
    const [isLoading, setIsLoading] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);

    // Dynamic file state
    const [files, setFiles] = useState<Record<string, File>>({});
    const [previews, setPreviews] = useState<Record<string, string>>({});

    // Fallback defaults if no settings defined
    const defaultRequirements = [
        { id: 'nbi', label: 'NBI Clearance', description: 'Upload PDF or Image', isRequired: true },
        { id: 'license', label: "Driver's License", description: 'Upload PDF or Image', isRequired: true },
        { id: 'certificate', label: 'Technical Certification', description: 'Upload PDF or Image', isRequired: true }
    ];

    const requirements = useMemo(() => {
        if (db?.settings?.verificationRequirements && db.settings.verificationRequirements.length > 0) {
            return db.settings.verificationRequirements;
        }
        return defaultRequirements;
    }, [db?.settings]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, reqId: string) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setFiles(prev => ({ ...prev, [reqId]: file }));

            if (file.type.startsWith('image/')) {
                const base64 = await fileToBase64(file);
                setPreviews(prev => ({ ...prev, [reqId]: base64 }));
            } else {
                setPreviews(prev => ({ ...prev, [reqId]: 'DOC_PREVIEW' }));
            }
        }
    };

    const removeFile = (reqId: string) => {
        const newFiles = { ...files };
        delete newFiles[reqId];
        setFiles(newFiles);

        const newPreviews = { ...previews };
        delete newPreviews[reqId];
        setPreviews(newPreviews);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!mechanic) return;

        setIsLoading(true);
        try {
            const uploads: Record<string, string> = {};
            let legacyUpdates: any = {};

            // Process all files
            for (const [key, file] of Object.entries(files) as [string, File][]) {
                const base64 = await fileToBase64(file);
                uploads[key] = base64;

                // Backward compatibility mapping
                if (key === 'nbi') legacyUpdates.nbiClearanceUrl = base64;
                if (key === 'license') legacyUpdates.driversLicenseUrl = base64;
                if (key === 'certificate') legacyUpdates.certificateOfTrainingsUrl = base64;
            }

            await updateMechanicProfile({
                ...mechanic,
                verificationDocuments: {
                    ...mechanic.verificationDocuments,
                    ...legacyUpdates,
                    uploads: uploads,
                    verificationStatus: 'Submitted'
                }
            });
            setShowUploadModal(false);
        } catch (error) {
            console.error("Error uploading documents:", error);
            alert("Failed to upload documents. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    // Check if all required files are present
    const isSubmitDisabled = requirements.some(req => req.isRequired && !files[req.id]);

    // Approved - no modal needed at all, show dashboard normally
    if (mechanic?.verificationDocuments?.verificationStatus === 'Approved') {
        return null;
    }

    // Submitted - show a non-blocking top banner instead of full screen overlay
    if (mechanic?.verificationDocuments?.verificationStatus === 'Submitted') {
        return (
            <div className="fixed top-0 left-0 right-0 z-[200] max-w-md mx-auto">
                <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-3 flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-black text-yellow-400 tracking-widest">UNDER REVIEW</p>
                        <p className="text-[10px] text-gray-400 truncate">Your documents are being reviewed by our team.</p>
                    </div>
                    <ShieldCheck size={18} className="text-yellow-500 flex-shrink-0" />
                </div>
            </div>
        );
    }

    return (
        <div className="fixed top-0 left-0 right-0 z-[200] max-w-md mx-auto">
            <div className="bg-[#050505]/90 backdrop-blur-md border-b border-primary/20 px-4 py-3">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <FileCheck size={16} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-black text-primary tracking-widest">VERIFICATION REQUIRED</p>
                        <p className="text-[10px] text-gray-400 truncate">Submit your documents to start accepting jobs.</p>
                    </div>
                    <button
                        onClick={() => setShowUploadModal(true)}
                        className="px-3 py-1.5 bg-primary text-white text-[10px] font-black tracking-widest rounded-xl hover:bg-orange-600 transition-colors flex-shrink-0"
                    >
                        Submit
                    </button>
                </div>
            </div>

            {/* Full upload modal only when triggered */}
            {showUploadModal && (
                <div className="fixed inset-0 bg-[#050505]/95 backdrop-blur-xl z-[1000] flex items-center justify-center p-4">
                    <div className="bg-[#121212] border border-white/10 rounded-[2.5rem] p-8 max-w-3xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col">
                        <button
                            onClick={() => setShowUploadModal(false)}
                            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-400 hover:text-white transition-all"
                        >
                            ✕
                        </button>
                        <div className="text-center mb-8 relative z-10">
                            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-primary/20 rotate-3">
                                <FileCheck size={32} className="text-primary" />
                            </div>
                            <h2 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500  tracking-tighter">
                                Account Verification
                            </h2>
                            <p className="text-gray-500 mt-3 text-sm font-medium max-w-md mx-auto">
                                To ensure platform safety and trusted service, please provide the required documentation below.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6 flex-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {requirements.map((req) => (
                                    <div key={req.id} className={`bg-[#18181b] p-1 rounded-[1.5rem] border transition-all duration-300 group relative ${files[req.id] ? 'border-primary/50 bg-primary/5' : 'border-white/5 hover:border-white/10'}`}>
                                        <div className="p-5 h-full flex flex-col">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <label className="flex items-center gap-2 text-sm font-black text-white  tracking-wide">
                                                        {req.label}
                                                        {req.isRequired && <span className="text-primary text-[10px] bg-primary/10 px-2 py-0.5 rounded text-xs font-bold">REQ</span>}
                                                    </label>
                                                    <p className="text-[10px] text-gray-500 font-bold mt-1  tracking-widest">{req.description}</p>
                                                </div>
                                                {files[req.id] && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeFile(req.id)}
                                                        className="text-gray-500 hover:text-red-500 transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>

                                            <div className={`relative flex-1 min-h-[140px] rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden group-hover:bg-[#202022] ${files[req.id] ? 'border-primary/30 bg-[#121212]' : 'border-white/10 bg-[#121212]'}`}>
                                                {files[req.id] ? (
                                                    previews[req.id] === 'DOC_PREVIEW' ? (
                                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                                                            <FileText size={32} className="text-primary mb-2" />
                                                            <span className="text-xs font-bold text-white break-all max-w-full px-2">{files[req.id]?.name}</span>
                                                            <span className="text-[9px] text-gray-500 font-mono mt-1 ">Ready to Upload</span>
                                                        </div>
                                                    ) : (
                                                        <div className="absolute inset-0">
                                                            <img src={previews[req.id]} alt="Preview" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end justify-center p-4">
                                                                <p className="text-xs font-bold text-white truncate max-w-full">{files[req.id]?.name}</p>
                                                            </div>
                                                        </div>
                                                    )
                                                ) : (
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                                                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                                            <Upload size={16} className="text-gray-500 group-hover:text-primary transition-colors" />
                                                        </div>
                                                        <span className="text-xs font-black text-gray-500  tracking-widest group-hover:text-white transition-colors">Click to Upload</span>
                                                        <span className="text-[9px] text-gray-600 mt-1">PDF, JPG, PNG supported</span>
                                                    </div>
                                                )}
                                                <input
                                                    type="file"
                                                    accept=".png,.jpg,.jpeg,.pdf,.doc,.docx"
                                                    onChange={(e) => handleFileChange(e, req.id)}
                                                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <div className="md:col-span-2 mt-2 p-4 rounded-2xl bg-white/5 border border-white/5 flex items-start gap-4">
                                    <AlertCircle size={20} className="text-gray-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-xs font-bold text-gray-400">Pro Tip: Complete Profile</p>
                                        <p className="text-[10px] text-gray-600 mt-1 leading-relaxed">
                                            Uploading all required documents increases your approval chances by 40%. Ensure images are clear and text is readable.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading || isSubmitDisabled}
                                className={`w-full py-5 rounded-2xl font-black  tracking-widest text-xs transition-all shadow-xl flex items-center justify-center gap-3 ${isLoading || isSubmitDisabled
                                    ? 'bg-white/5 text-gray-600 cursor-not-allowed border border-white/5'
                                    : 'bg-primary text-white hover:bg-orange-600 hover:scale-[1.01] hover:shadow-primary/25'
                                    }`}
                            >
                                {isLoading ? (
                                    <>
                                        <Spinner size="sm" color="text-white" />
                                        Encrypting & Uploading...
                                    </>
                                ) : (
                                    <>
                                        Submit For Review
                                        <CheckCircle size={16} />
                                    </>
                                )}
                            </button>

                            <p className="text-center text-[10px] text-gray-600 font-medium pb-2">
                                By submitting, you agree to our Terms of Service regarding data collection and privacy.
                            </p>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MechanicVerificationModal;
