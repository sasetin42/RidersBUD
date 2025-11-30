
import React, { useState, useMemo } from 'react';
import { AdminUser, AdminModule, PermissionLevel, RoleName } from '../../types';
import { useDatabase } from '../../context/DatabaseContext';
import Spinner from '../../components/Spinner';
import Modal from '../../components/admin/Modal';

const StatCard: React.FC<{ title: string; value: number | string; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-admin-card p-5 rounded-xl shadow-lg flex items-center gap-4 border border-admin-border">
        <div className="bg-admin-bg p-3 rounded-full text-admin-accent">{icon}</div>
        <div>
            <p className="text-2xl font-bold text-admin-text-primary">{value}</p>
            <p className="text-sm text-admin-text-secondary">{title}</p>
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
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div>
                    <label className="text-sm text-admin-text-secondary">Email Address</label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} className={`w-full p-2 bg-admin-bg border rounded ${errors.email ? 'border-red-500' : 'border-admin-border'}`} />
                    {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
                </div>
                <div>
                    <label className="text-sm text-admin-text-secondary">{user ? 'New Password (optional)' : 'Password'}</label>
                    <input type="password" name="password" value={formData.password} onChange={handleChange} className={`w-full p-2 bg-admin-bg border rounded ${errors.password ? 'border-red-500' : 'border-admin-border'}`} />
                    {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
                </div>
                <div>
                    <label className="text-sm text-admin-text-secondary">Role</label>
                    <select name="role" value={formData.role} onChange={handleChange} className="w-full p-2 bg-admin-bg border rounded border-admin-border">
                        {db?.roles.map(r => <option key={r.name}>{r.name}</option>)}
                    </select>
                </div>
                <div className="border-t border-admin-border pt-4">
                    <h3 className="text-lg font-bold mb-2">Module Permissions</h3>
                    {formData.role === 'Super Admin' ? (
                        <p className="text-sm text-admin-text-secondary bg-admin-bg p-3 rounded-md">Super Admins have full 'edit' access to all modules.</p>
                    ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                            {modules.map(module => (
                                <div key={module} className="grid grid-cols-2 items-center">
                                    <label className="text-sm capitalize">{module}</label>
                                    <select value={formData.permissions[module] || 'none'} onChange={e => handlePermissionChange(module, e.target.value as PermissionLevel)} className="w-full p-1 bg-admin-bg border rounded border-admin-border text-sm">
                                        <option value="none">No Access</option> <option value="view">View Only</option> <option value="edit">View & Edit</option>
                                    </select>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="flex justify-end gap-4 pt-4">
                    <button type="button" onClick={onClose} className="bg-admin-border text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-600">Cancel</button>
                    <button type="submit" className="bg-admin-accent text-white font-bold py-2 px-4 rounded-lg hover:bg-orange-600 disabled:opacity-50" disabled={isSaveDisabled}>Save User</button>
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
    const roleColors: Record<AdminUser['role'], string> = { 'Super Admin': 'bg-red-500/20 text-red-300', 'Content Manager': 'bg-blue-500/20 text-blue-300', 'Viewer': 'bg-gray-500/20 text-gray-300' };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex-shrink-0">
                <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
                    <h1 className="text-3xl font-bold">Users & Roles</h1>
                    <button onClick={() => handleOpenModal()} className="bg-admin-accent text-white font-bold py-2 px-4 rounded-lg hover:bg-orange-600 transition">+ Add User</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
                    <StatCard title="Total Admin Users" value={db.adminUsers.length} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} />
                    <StatCard title="Configured Roles" value={db.roles.length} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4z" /></svg>} />
                </div>
            </div>
            <div className="flex-1 overflow-auto">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead className="sticky top-0 bg-admin-bg z-10">
                            <tr>
                                <th className="py-3 px-2 font-semibold text-admin-text-secondary uppercase text-xs border-b border-admin-border">Email</th>
                                <th className="py-3 px-2 font-semibold text-admin-text-secondary uppercase text-xs border-b border-admin-border">Role</th>
                                <th className="py-3 px-2 font-semibold text-admin-text-secondary uppercase text-xs border-b border-admin-border">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-admin-border">
                            {db.adminUsers.map(user => (
                                <tr key={user.id} className="hover:bg-admin-card">
                                    <td className="py-4 px-2 text-sm">{user.email}</td>
                                    <td className="py-4 px-2">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${roleColors[user.role] || 'bg-gray-500/20 text-gray-300'}`}>{user.role}</span>
                                    </td>
                                    <td className="py-4 px-2 text-sm whitespace-nowrap">
                                        <button onClick={() => handleOpenModal(user)} className="font-semibold text-blue-400 hover:text-blue-300 mr-4">Edit</button>
                                        {db.adminUsers.length > 1 && (
                                            <button onClick={() => handleDelete(user.id)} className="font-semibold text-red-400 hover:text-red-300">Delete</button>
                                        )}
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
