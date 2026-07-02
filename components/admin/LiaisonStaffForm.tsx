import React, { useState } from 'react';
import { LiaisonStaff, LiaisonBranch } from '../../types';
import Spinner from '../Spinner';
import { Camera, UserCheck } from 'lucide-react';
import { storageService } from '../../services/StorageService';

interface LiaisonStaffFormProps {
    liaison?: LiaisonStaff;
    onSave: (liaison: any) => void;
    onCancel: () => void;
    branches: LiaisonBranch[];
}

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
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [uploading, setUploading] = useState(false);
    const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.name.trim()) e.name = 'Name is required.';
        if (!form.phone.trim()) e.phone = 'Phone is required.';
        if (!form.imageUrl) e.imageUrl = 'Profile photo is required.';
        if (assignedBranches.length === 0) e.assignedBranches = 'At least one branch must be assigned.';
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const v = validate(); 
        setErrors(v);
        if (Object.keys(v).length > 0) return;
        
        onSave({
            ...form,
            assignedBranches,
            ...(liaison?.id ? { id: liaison.id } : {})
        });
    };

    const inp = (f: string) => `w-full p-2 bg-white/5 border rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/60 transition-all text-xs ${errors[f] ? 'border-red-500' : 'border-white/10'}`;
    const lbl = 'block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1';

    return (
        <form onSubmit={handleSubmit} className="space-y-3.5 animate-fadeIn">
            {/* Photo upload */}
            <div className="flex items-center gap-4">
                <div className="relative group cursor-pointer flex-shrink-0" onClick={() => document.getElementById('liaison-img-upload')?.click()}>
                    <div className={`w-16 h-16 rounded-full border border-dashed overflow-hidden flex items-center justify-center transition-all ${errors.imageUrl ? 'border-red-500' : 'border-white/10 group-hover:border-emerald-500/50'}`}>
                        {uploading ? <Spinner size="sm" color="text-emerald-500" />
                            : form.imageUrl ? <div className="relative w-full h-full"><img src={form.imageUrl} alt="Preview" className="w-full h-full object-cover" /><div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full"><Camera size={14} className="text-white" /></div></div>
                            : <UserCheck size={20} className="text-gray-600" />}
                    </div>
                    <input id="liaison-img-upload" type="file" accept="image/*" className="hidden" onChange={handleFile} />
                </div>
                <div className="flex-1">
                    <p className="text-xs font-bold text-gray-400 mb-0.5">Profile Photo *</p>
                    <p className="text-[10px] text-gray-600">Click to upload photo.</p>
                    {errors.imageUrl && <p className="text-red-400 text-xs mt-0.5">{errors.imageUrl}</p>}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label htmlFor="staff-name" className={lbl}>Full Name *</label>
                    <input id="staff-name" type="text" name="name" value={form.name} onChange={handleChange} placeholder="Juan dela Cruz" className={inp('name')} />
                    {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
                </div>
                <div>
                    <label htmlFor="staff-phone" className={lbl}>Phone Number *</label>
                    <input id="staff-phone" type="text" name="phone" value={form.phone} onChange={handleChange} placeholder="09xx-xxx-xxxx" className={inp('phone')} />
                    {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
                </div>
            </div>

            {/* Assigned Branches Multi-Select */}
            <div>
                <label className={lbl}>Assigned Branches *</label>
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
                        className={`w-full p-2 bg-white/5 border rounded-lg text-white text-left focus:outline-none focus:border-emerald-500/60 transition-all text-xs flex justify-between items-center ${errors.assignedBranches ? 'border-red-500' : 'border-white/10'}`}
                    >
                        <span className="truncate">
                            {assignedBranches.length === 0
                                ? 'Select assigned branches...'
                                : branches
                                      .filter(b => assignedBranches.includes(b.id))
                                      .map(b => b.name)
                                      .join(', ')}
                        </span>
                        <span className="ml-2 text-gray-400">▼</span>
                    </button>
                    {isBranchDropdownOpen && (
                        <div className="absolute z-50 w-full mt-1 bg-[#1a1a1a] border border-white/15 rounded-lg shadow-2xl max-h-48 overflow-y-auto p-2 space-y-1">
                            {branches.map(branch => {
                                const isChecked = assignedBranches.includes(branch.id);
                                return (
                                    <label
                                        key={branch.id}
                                        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/5 cursor-pointer text-xs text-white"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => toggleBranch(branch.id)}
                                            className="rounded border-white/10 bg-white/5 text-emerald-500 focus:ring-0"
                                        />
                                        <span>{branch.name}</span>
                                    </label>
                                );
                            })}
                        </div>
                    )}
                </div>
                {errors.assignedBranches && <p className="text-red-400 text-xs mt-1">{errors.assignedBranches}</p>}
            </div>

            <div className="flex flex-col pb-0.5">
                <label className={lbl}>Status</label>
                <div className="flex items-center gap-2 mt-1 cursor-pointer" onClick={() => setForm(p => ({ ...p, isAvailable: !p.isAvailable }))}>
                    <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.isAvailable ? 'bg-green-500' : 'bg-gray-600'}`}>
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${form.isAvailable ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </div>
                    <span className="text-xs text-white">{form.isAvailable ? 'Available' : 'Not Available'}</span>
                </div>
            </div>

            <div>
                <label htmlFor="staff-bio" className={lbl}>Bio / Description</label>
                <textarea id="staff-bio" name="description" value={form.description} onChange={handleChange} rows={2} placeholder="Brief liaison officer bio..." className={inp('description')} />
            </div>

            <div className="flex justify-end gap-2.5 pt-2.5 border-t border-white/5">
                <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 font-bold transition-all text-xs">Cancel</button>
                <button type="submit" disabled={uploading} className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-black hover:bg-emerald-500 transition-all disabled:opacity-50 flex items-center gap-1.5 text-xs shadow-lg shadow-emerald-600/20">
                    <UserCheck size={14} />{liaison ? 'Update Liaison' : 'Add Liaison'}
                </button>
            </div>
        </form>
    );
};
