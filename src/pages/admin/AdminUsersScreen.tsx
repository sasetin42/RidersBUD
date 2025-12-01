import React, { useState, useMemo } from 'react';
import { AdminUser, AdminModule, PermissionLevel, RoleName } from '../../types';
import { useDatabase } from '../../context/DatabaseContext';
import Spinner from '../../components/Spinner';
import Modal from '../../components/admin/Modal';

const StatCard: React.FC<{ title: string; value: number | string; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="glass-card p-6 flex items-center gap-4 group hover:scale-[1.02] transition-all duration-300">
        <div className="w-12 h-12 rounded-xl bg-admin-accent/20 flex items-center justify-center text-admin-accent group-hover:scale-110 transition-transform duration-300 shadow-glow-sm">
            {icon}
        </div>
        <div>
            <p className="text-3xl font-bold text-white mb-1 tracking-tight">{value}</p>
            <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">{title}</p>
        </div>
    </div>
);

const modules: AdminModule[] = ['dashboard', 'analytics', 'bookings', 'services', 'mechanics', 'customers', 'marketing', 'users', 'settings'];

const UserFormModal: React.FC<{
    user?: AdminUser;
    onClose: () => void;
    onSave: (user: Omit<AdminUser, 'id'> | AdminUser) => void;
}> = ({ user, onClose, onSave }) => {
    const { db } = useDatabase();
    const [formData, setFormData] = useState({ email: user?.email || '', password: '', role: user?.role || 'Viewer' as AdminUser['role'], permissions: user?.permissions || db?.roles.find(r => r.name === 'Viewer')?.defaultPermissions || {}, });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const validate = (data = formData) => {
        const newErrors: { [key: string]: string } = {};
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) newErrors.email = "Invalid email format.";
        if (!user && (!data.password || data.password.length < 6)) { newErrors.password = "Password must be at least 6 characters for new users."; }
        else if (user && data.password && data.password.length < 6) { newErrors.password = "New password must be at least 6 characters."; }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'role') {
            const newRole = value as RoleName;
            const roleTemplate = db?.roles.find(r => r.name === newRole);
            const defaultPermissions = roleTemplate?.defaultPermissions || {};
            const newData = { ...formData, role: newRole, permissions: defaultPermissions };
            setFormData(newData);
            validate(newData);
        } else { const newData = { ...formData, [name]: value }; setFormData(newData); validate(newData); }
    };

    const handlePermissionChange = (module: AdminModule, level: PermissionLevel) => {
        setFormData(prev => ({ ...prev, permissions: { ...prev.permissions, [module]: level } }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            const finalData = { ...formData };
            if (finalData.role === 'Super Admin') { finalData.permissions = db?.roles.find(r => r.name === 'Super Admin')?.defaultPermissions || {}; }
            if (user) onSave({ ...user, ...finalData, password: finalData.password || user.password });
            else onSave(finalData as Omit<AdminUser, 'id'>);
        }
    };

    const isSaveDisabled = !formData.email || (!user && !formData.password) || Object.keys(errors).length > 0;

    return (
        <Modal title={user ? "Edit User" : "Add New User"} isOpen={true} onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Email Address</label>
                        <input type="email" name="email" value={formData.email} onChange={handleChange} className={`w-full p-3 bg-black/20 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-admin-accent/50 transition-all ${errors.email ? 'border-red-500' : 'border-white/10'}`} placeholder="admin@example.com" />
                        {errors.email && <p className="text-red-400 text-xs mt-1 font-medium">{errors.email}</p>}
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{user ? 'New Password (optional)' : 'Password'}</label>
                        <input type="password" name="password" value={formData.password} onChange={handleChange} className={`w-full p-3 bg-black/20 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-admin-accent/50 transition-all ${errors.password ? 'border-red-500' : 'border-white/10'}`} placeholder="••••••••" />
                        {errors.password && <p className="text-red-400 text-xs mt-1 font-medium">{errors.password}</p>}
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Role</label>
                        <select name="role" value={formData.role} onChange={handleChange} className="w-full p-3 bg-black/20 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-admin-accent/50 transition-all appearance-none cursor-pointer">
                            {db?.roles.map(r => <option key={r.name} value={r.name} className="bg-gray-900">{r.name}</option>)}
                        </select>
                    </div>
                </div>

                <div className="border-t border-white/10 pt-6">
                    <h3 className="text-lg font-bold text-white mb-4">Module Permissions</h3>
                    {formData.role === 'Super Admin' ? (
                        <div className="bg-admin-accent/10 border border-admin-accent/20 p-4 rounded-xl flex items-center gap-3">
                            <svg className="w-6 h-6 text-admin-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                            <p className="text-sm text-admin-accent font-medium">Super Admins have full access to all modules.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                            {modules.map(module => (
                                <div key={module} className="bg-white/5 p-3 rounded-lg border border-white/5 flex flex-col gap-2">
                                    <label className="text-sm font-bold text-gray-300 capitalize">{module}</label>
                                    <select value={formData.permissions[module] || 'none'} onChange={e => handlePermissionChange(module, e.target.value as PermissionLevel)} className="w-full p-2 bg-black/20 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-admin-accent/50">
                                        <option value="none" className="bg-gray-900">No Access</option>
                                        <option value="view" className="bg-gray-900">View Only</option>
                                        <option value="edit" className="bg-gray-900">View & Edit</option>
                                    </select>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all">Cancel</button>
                    <button type="submit" className="bg-gradient-to-r from-admin-accent to-orange-600 text-white font-bold py-2 px-6 rounded-lg hover:shadow-glow hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed" disabled={isSaveDisabled}>Save User</button>
                </div>
            </form>
        </Modal>
    )
};

const AdminUsersScreen: React.FC = () => {
    const { db, addAdminUser, updateAdminUser, deleteAdminUser, loading } = useDatabase();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<AdminUser | undefined>(undefined);

    if (loading || !db?.adminUsers) {
        return <div className="flex items-center justify-center h-full"><Spinner size="lg" color="text-white" /></div>;
    }

    const handleOpenModal = (user?: AdminUser) => { setEditingUser(user); setIsModalOpen(true); };
    const handleCloseModal = () => { setEditingUser(undefined); setIsModalOpen(false); };
    const handleSave = (user: Omit<AdminUser, 'id'> | AdminUser) => { 'id' in user ? updateAdminUser(user) : addAdminUser(user); handleCloseModal(); };
    const handleDelete = (userId: string) => { if (window.confirm('Are you sure?')) deleteAdminUser(userId); };

    const roleColors: Record<AdminUser['role'], string> = {
        'Super Admin': 'bg-red-500/20 text-red-300 border-red-500/30',
        'Content Manager': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
        'Viewer': 'bg-gray-500/20 text-gray-300 border-gray-500/30'
    };

    return (
        <div className="flex flex-col h-full space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Users & Roles</h1>
                    <p className="text-gray-400 mt-1">Manage platform administrators and their permissions.</p>
                </div>
                <button onClick={() => handleOpenModal()} className="bg-gradient-to-r from-admin-accent to-orange-600 text-white font-bold py-3 px-6 rounded-xl hover:shadow-glow hover:scale-105 transition-all shadow-lg flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    Add User
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StatCard title="Total Admin Users" value={db.adminUsers.length} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} />
                <StatCard title="Configured Roles" value={db.roles.length} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4z" /></svg>} />
            </div>

            <div className="glass-card rounded-2xl overflow-hidden border border-white/5 flex-1 flex flex-col shadow-xl">
                <div className="overflow-x-auto flex-1 custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead className="bg-black/20 backdrop-blur-md sticky top-0 z-10">
                            <tr>
                                <th className="py-4 px-6 font-bold text-gray-400 uppercase text-xs tracking-wider border-b border-white/10">Email</th>
                                <th className="py-4 px-6 font-bold text-gray-400 uppercase text-xs tracking-wider border-b border-white/10">Role</th>
                                <th className="py-4 px-6 font-bold text-gray-400 uppercase text-xs tracking-wider border-b border-white/10 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {db.adminUsers.map(user => (
                                <tr key={user.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="py-4 px-6 text-sm font-medium text-white">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-xs font-bold text-white border border-white/10">
                                                {user.email.charAt(0).toUpperCase()}
                                            </div>
                                            {user.email}
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full border ${roleColors[user.role] || 'bg-gray-500/20 text-gray-300 border-gray-500/30'}`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-sm whitespace-nowrap text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleOpenModal(user)} className="p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white transition-all" title="Edit">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                            </button>
                                            {db.adminUsers.length > 1 && (
                                                <button onClick={() => handleDelete(user.id)} className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all" title="Delete">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {isModalOpen && <UserFormModal user={editingUser} onSave={handleSave} onClose={handleCloseModal} />}
        </div>
    )
};

export default AdminUsersScreen;
