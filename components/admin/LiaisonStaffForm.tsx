import React, { useState } from 'react';
import { LiaisonStaff, LiaisonBranch } from '../../types';
import Spinner from '../Spinner';
import { Camera, UserCheck, Check, Sparkles, ChevronDown, Phone, FileText, MapPin, X } from 'lucide-react';
import { storageService } from '../../services/StorageService';

interface LiaisonStaffFormProps {
    liaison?: LiaisonStaff;
    onSave: (liaison: any) => void;
    onCancel: () => void;
    branches: LiaisonBranch[];
}

const LIAISON_SERVICE_TYPES = [
    'Vehicle Registration Renewal',
    'Transfer of Ownership',
    'New Registration',
    'Duplicate OR',
    'Duplicate CR',
    'Lost Plate',
    'Replacement Plate',
    'Change Engine',
    'Change Color',
    'Other'
];

export const LiaisonStaffForm: React.FC<LiaisonStaffFormProps> = ({
    liaison,
    onSave,
    onCancel,
    branches
}) => {
    const [form, setForm] = useState({
        name: liaison?.name || '',
        phone: liaison?.phone || '',
        imageUrl: liaison?.imageUrl || '',
        description: liaison?.description || '', // bio
        isAvailable: liaison?.isAvailable ?? true,
    });
    
    const [assignedBranches, setAssignedBranches] = useState<string[]>(
        liaison?.assignedBranches || []
    );
    const [assignedServices, setAssignedServices] = useState<string[]>(
        liaison?.assignedServices || []
    );
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [uploading, setUploading] = useState(false);
    const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
    const [isServiceDropdownOpen, setIsServiceDropdownOpen] = useState(false);

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.name.trim()) e.name = 'Name is required.';
        if (!form.phone.trim()) e.phone = 'Phone is required.';
        if (!form.imageUrl) e.imageUrl = 'Profile photo is required.';
        if (assignedBranches.length === 0) e.assignedBranches = 'At least one branch must be assigned.';
        if (assignedServices.length === 0) e.assignedServices = 'At least one service type must be assigned.';
        return e;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setForm(p => ({ ...p, [name]: value }));
        if (errors[name]) setErrors(p => { const n = { ...p }; delete n[name]; return n; });
    };

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            setUploading(true);
            const url = await storageService.uploadFile(`catalog/liaison/${Date.now()}_${file.name}`, file);
            setForm(p => ({ ...p, imageUrl: url }));
            setErrors(p => { const n = { ...p }; delete n.imageUrl; return n; });
        } catch { 
            setErrors(p => ({ ...p, imageUrl: 'Upload failed.' })); 
        } finally { 
            setUploading(false); 
        }
    };

    const toggleBranch = (branchId: string) => {
        setAssignedBranches(prev => {
            const next = prev.includes(branchId)
                ? prev.filter(id => id !== branchId)
                : [...prev, branchId];
            if (errors.assignedBranches) {
                setErrors(p => { const n = { ...p }; delete n.assignedBranches; return n; });
            }
            return next;
        });
    };

    const toggleService = (service: string) => {
        setAssignedServices(prev => {
            const next = prev.includes(service)
                ? prev.filter(s => s !== service)
                : [...prev, service];
            if (errors.assignedServices) {
                setErrors(p => { const n = { ...p }; delete n.assignedServices; return n; });
            }
            return next;
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const v = validate(); 
        setErrors(v);
        if (Object.keys(v).length > 0) return;
        
        onSave({
            ...form,
            assignedBranches,
            assignedServices,
            ...(liaison?.id ? { id: liaison.id } : {})
        });
    };

    const inp = (f: string) => `w-full p-3 bg-white/[0.03] border rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10 transition-all text-xs ${errors[f] ? 'border-red-500' : 'border-white/10'}`;
    const lbl = 'block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1';

    return (
        <form onSubmit={handleSubmit} className="space-y-4 animate-fadeIn">
            {/* Photo upload */}
            <div className="flex items-center gap-4 bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                <div className="relative group cursor-pointer flex-shrink-0" onClick={() => document.getElementById('liaison-img-upload')?.click()}>
                    <div className={`w-20 h-20 rounded-full border-2 border-dashed overflow-hidden flex items-center justify-center transition-all ${errors.imageUrl ? 'border-red-500' : 'border-white/20 group-hover:border-emerald-500/50 group-hover:scale-105 active:scale-95 shadow-inner'}`}>
                        {uploading ? <Spinner size="sm" color="text-emerald-500" />
                            : form.imageUrl ? (
                                <div className="relative w-full h-full">
                                    <img src={form.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Camera size={16} className="text-white" />
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center text-gray-500">
                                    <UserCheck size={24} />
                                </div>
                            )}
                    </div>
                    <input id="liaison-img-upload" type="file" accept="image/*" className="hidden" onChange={handleFile} />
                </div>
                <div className="flex-1">
                    <p className="text-xs font-bold text-white flex items-center gap-1.5">
                        Profile Photo <span className="text-emerald-400 font-normal text-[10px]">* Required</span>
                    </p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Recommended: Square format image, clear portrait.</p>
                    {errors.imageUrl && <p className="text-red-400 text-[10px] font-bold mt-1">{errors.imageUrl}</p>}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
                <div>
                    <label htmlFor="staff-name" className={lbl}>
                        <UserCheck size={10} className="text-emerald-400" /> Full Name *
                    </label>
                    <input id="staff-name" type="text" name="name" value={form.name} onChange={handleChange} placeholder="Juan dela Cruz" className={inp('name')} />
                    {errors.name && <p className="text-red-400 text-[10px] font-bold mt-1">{errors.name}</p>}
                </div>
                <div>
                    <label htmlFor="staff-phone" className={lbl}>
                        <Phone size={10} className="text-emerald-400" /> Phone Number *
                    </label>
                    <input id="staff-phone" type="text" name="phone" value={form.phone} onChange={handleChange} placeholder="09xx-xxx-xxxx" className={inp('phone')} />
                    {errors.phone && <p className="text-red-400 text-[10px] font-bold mt-1">{errors.phone}</p>}
                </div>
            </div>

            {/* Assigned Branches Multi-Select */}
            <div>
                <label className={lbl}>
                    <MapPin size={10} className="text-emerald-400" /> Assigned Branches *
                </label>
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => {
                            setIsBranchDropdownOpen(!isBranchDropdownOpen);
                            setIsServiceDropdownOpen(false);
                        }}
                        className={`w-full p-3 bg-white/[0.03] border rounded-xl text-white text-left focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10 transition-all text-xs flex justify-between items-center ${errors.assignedBranches ? 'border-red-500' : 'border-white/10'}`}
                    >
                        <span className="truncate">
                            {assignedBranches.length === 0
                                ? 'Select assigned branches...'
                                : branches
                                      .filter(b => assignedBranches.includes(b.id))
                                      .map(b => b.name)
                                      .join(', ')}
                        </span>
                        <ChevronDown size={14} className={`text-gray-400 transition-transform duration-200 ${isBranchDropdownOpen ? 'transform rotate-180' : ''}`} />
                    </button>
                    {isBranchDropdownOpen && (
                        <div className="absolute z-50 w-full mt-1.5 bg-[#141416]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl max-h-48 overflow-y-auto p-2 space-y-0.5 animate-fadeIn">
                            {branches.map(branch => {
                                const isChecked = assignedBranches.includes(branch.id);
                                return (
                                    <label
                                        key={branch.id}
                                        className={`flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5 cursor-pointer text-xs text-white transition-colors ${isChecked ? 'bg-emerald-500/5 text-emerald-400' : ''}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => toggleBranch(branch.id)}
                                                className="rounded-md border-white/10 bg-white/5 text-emerald-500 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5"
                                            />
                                            <span>{branch.name}</span>
                                        </div>
                                        {isChecked && <Check size={12} className="text-emerald-400 shrink-0" />}
                                    </label>
                                );
                            })}
                        </div>
                    )}
                </div>
                {errors.assignedBranches && <p className="text-red-400 text-[10px] font-bold mt-1">{errors.assignedBranches}</p>}
            </div>

            {/* Assigned Service Types Multi-Select */}
            <div>
                <label className={lbl}>
                    <FileText size={10} className="text-emerald-400" /> Assigned Service Types *
                </label>
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => {
                            setIsServiceDropdownOpen(!isServiceDropdownOpen);
                            setIsBranchDropdownOpen(false);
                        }}
                        className={`w-full p-3 bg-white/[0.03] border rounded-xl text-white text-left focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10 transition-all text-xs flex justify-between items-center ${errors.assignedServices ? 'border-red-500' : 'border-white/10'}`}
                    >
                        <span className="truncate">
                            {assignedServices.length === 0
                                ? 'Select assigned LTO service types...'
                                : assignedServices.join(', ')}
                        </span>
                        <ChevronDown size={14} className={`text-gray-400 transition-transform duration-200 ${isServiceDropdownOpen ? 'transform rotate-180' : ''}`} />
                    </button>
                    {isServiceDropdownOpen && (
                        <div className="absolute z-50 w-full mt-1.5 bg-[#141416]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl max-h-48 overflow-y-auto p-2 space-y-0.5 animate-fadeIn">
                            {LIAISON_SERVICE_TYPES.map(service => {
                                const isChecked = assignedServices.includes(service);
                                return (
                                    <label
                                        key={service}
                                        className={`flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5 cursor-pointer text-xs text-white transition-colors ${isChecked ? 'bg-emerald-500/5 text-emerald-400' : ''}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => toggleService(service)}
                                                className="rounded-md border-white/10 bg-white/5 text-emerald-500 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5"
                                            />
                                            <span>{service}</span>
                                        </div>
                                        {isChecked && <Check size={12} className="text-emerald-400 shrink-0" />}
                                    </label>
                                );
                            })}
                        </div>
                    )}
                </div>
                {errors.assignedServices && <p className="text-red-400 text-[10px] font-bold mt-1">{errors.assignedServices}</p>}
            </div>

            <div className="flex flex-col pb-0.5">
                <label className={lbl}>Status</label>
                <div className="flex items-center gap-2.5 mt-1 cursor-pointer w-fit" onClick={() => setForm(p => ({ ...p, isAvailable: !p.isAvailable }))}>
                    <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-all duration-300 ${form.isAvailable ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-white/10'}`}>
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-md transition-transform duration-300 ${form.isAvailable ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </div>
                    <span className={`text-xs font-bold transition-colors ${form.isAvailable ? 'text-emerald-400' : 'text-gray-500'}`}>
                        {form.isAvailable ? 'Active / Available' : 'Inactive / Unavailable'}
                    </span>
                </div>
            </div>

            <div>
                <label htmlFor="staff-bio" className={lbl}>Bio / Description</label>
                <textarea id="staff-bio" name="description" value={form.description} onChange={handleChange} rows={2.5} placeholder="Brief liaison officer bio..." className={inp('description')} />
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t border-white/5">
                <button type="button" onClick={onCancel} className="px-4.5 py-2.5 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 font-bold transition-all text-xs">Cancel</button>
                <button type="submit" disabled={uploading} className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-black hover:bg-emerald-500 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-1.5 text-xs shadow-lg shadow-emerald-600/20">
                    <UserCheck size={14} />{liaison ? 'Update Liaison Agent' : 'Add Liaison Agent'}
                </button>
            </div>
        </form>
    );
};
