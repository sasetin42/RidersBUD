import React, { useState, useMemo } from 'react';
import { AdminUser, AdminModule, PermissionLevel, RoleName } from '../../types';
import { useDatabase } from '../../context/DatabaseContext';
import Spinner from '../../components/Spinner';
import Modal from '../../components/admin/Modal';
import { Users, Shield, Lock, Eye, Edit, Trash2, Plus, CheckCircle, XCircle } from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*                                SUBCOMPONENTS                               */
/* -------------------------------------------------------------------------- */

const StatCard: React.FC<{ title: string; value: number | string; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => (
    <div className="glass-panel p-5 rounded-2xl flex items-center gap-4 border border-white/5 relative overflow-hidden group">
        <div className={`p-3 rounded-xl ${color} bg-opacity-10 text-white shadow-inner ring-1 ring-white/10`}>
            {icon}
        </div>
        <div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{title}</p>
        </div>
    </div>
);

const UserFormModal: React.FC<{
    user?: AdminUser;
    onClose: () => void;
    onSave: (user: Omit<AdminUser, 'id'> | AdminUser) => void;
}> = ({ user, onClose, onSave }) => {
    const { db } = useDatabase();
    const modules: AdminModule[] = ['dashboard', 'analytics', 'bookings', 'catalog', 'mechanics', 'customers', 'marketing', 'users', 'settings'];

    // State
    const [formData, setFormData] = useState({
        email: user?.email || '',
        password: '',
        role: user?.role || 'Viewer' as AdminUser['role'],
        permissions: user?.permissions || db?.roles.find(r => r.name === 'Viewer')?.defaultPermissions || {},
    });
    const [activeTab, setActiveTab] = useState<'details' | 'permissions'>('details');

    // Handlers
    const handleRoleChange = (newRole: RoleName) => {
        const roleTemplate = db?.roles.find(r => r.name === newRole);
        setFormData({ ...formData, role: newRole, permissions: roleTemplate?.defaultPermissions || {} });
    };

    const handlePermissionToggle = (module: AdminModule) => {
        const current = formData.permissions[module] || 'none';
        const next: PermissionLevel = current === 'none' ? 'view' : current === 'view' ? 'edit' : 'none';
        setFormData(prev => ({ ...prev, permissions: { ...prev.permissions, [module]: next } }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const finalData = { ...formData };
        if (finalData.role === 'Super Admin') finalData.permissions = db?.roles.find(r => r.name === 'Super Admin')?.defaultPermissions || {};
        user ? onSave({ ...user, ...finalData, password: finalData.password || user.password }) : onSave(finalData as Omit<AdminUser, 'id'>);
    };

    return (
        <Modal title={user ? "Edit Admin User" : "Add New Admin"} isOpen={true} onClose={onClose}>
            <div className="flex flex-col h-[500px] min-w-[600px] text-white">
                {/* Tabs */}
                <div className="flex border-b border-white/10 mb-6">
                    <button onClick={() => setActiveTab('details')} className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'details' ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-white'}`}>
                        <Users size={16} /> User Details
                    </button>
                    <button onClick={() => setActiveTab('permissions')} className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'permissions' ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-white'}`}>
                        <Shield size={16} /> Access Control
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-grow flex flex-col">
                    <div className="flex-grow overflow-y-auto pr-2">
                        {activeTab === 'details' ? (
                            <div className="space-y-6">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Email Address</label>
                                    <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-3 focus:border-primary outline-none mt-1" required />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">{user ? 'Change Password' : 'Password'}</label>
                                    <input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-3 focus:border-primary outline-none mt-1" placeholder={user ? "Leave blank to keep current" : "Min. 6 characters"} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Role Assignment</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {db?.roles.map(r => (
                                            <div
                                                key={r.name}
                                                onClick={() => handleRoleChange(r.name)}
                                                className={`p-3 rounded-lg border cursor-pointer transition-all ${formData.role === r.name ? 'bg-primary/20 border-primary' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                                            >
                                                <div className="flex items-center gap-2 font-bold text-sm">
                                                    <div className={`w-3 h-3 rounded-full ${formData.role === r.name ? 'bg-primary' : 'bg-gray-600'}`} />
                                                    {r.name}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {formData.role === 'Super Admin' ? (
                                    <div className="text-center py-12 bg-green-500/10 rounded-xl border border-green-500/20">
                                        <Shield size={48} className="mx-auto text-green-400 mb-4" />
                                        <h3 className="text-lg font-bold text-green-400">Full System Access</h3>
                                        <p className="text-sm text-green-300/80 mt-2">Super Admins have unrestricted access to all modules.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-2">
                                        {modules.map(module => (
                                            <div key={module} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 hover:border-white/10">
                                                <span className="capitalize font-medium text-sm text-gray-200">{module}</span>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => handlePermissionToggle(module)}
                                                        className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase transition-all border ${(formData.permissions[module] || 'none') === 'edit' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                                                            (formData.permissions[module] || 'none') === 'view' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                                                                'bg-red-500/20 text-red-400 border-red-500/30'
                                                            }`}
                                                    >
                                                        {formData.permissions[module] || 'None'}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="border-t border-white/10 pt-4 mt-4 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-5 py-2 rounded-xl border border-white/10 font-bold text-gray-400 hover:text-white transition-colors">Cancel</button>
                        <button type="submit" className="px-5 py-2 rounded-xl bg-primary hover:bg-orange-600 font-bold text-white shadow-lg shadow-orange-500/20 transition-colors">Save User</button>
                    </div>
                </form>
            </div>
        </Modal>
    );
};

/* -------------------------------------------------------------------------- */
/*                               MAIN COMPONENT                               */
/* -------------------------------------------------------------------------- */

const AdminUsersScreen: React.FC = () => {
    const { db, addAdminUser, updateAdminUser, deleteAdminUser, loading } = useDatabase();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<AdminUser | undefined>(undefined);

    if (loading || !db?.adminUsers) return <div className="flex items-center justify-center h-full"><Spinner size="lg" color="text-white" /></div>;

    // Handlers
    const handleSave = (user: Omit<AdminUser, 'id'> | AdminUser) => { 'id' in user ? updateAdminUser(user) : addAdminUser(user); setIsModalOpen(false); setEditingUser(undefined); };
    const handleDelete = (userId: string) => { if (window.confirm('Delete this user?')) deleteAdminUser(userId); };

    // Role Colors
    const roleConfig: Record<AdminUser['role'], { color: string, icon: any }> = {
        'Super Admin': { color: 'bg-red-500', icon: Shield },
        'Content Manager': { color: 'bg-blue-500', icon: Edit },
        'Viewer': { color: 'bg-gray-500', icon: Eye }
    };

    return (
        <div className="space-y-8 animate-slideInUp">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-white mb-6">Users & Roles</h1>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <StatCard title="Total Admins" value={db.adminUsers.length} icon={<Users size={24} />} color="bg-blue-500" />
                    <StatCard title="Roles Configured" value={db.roles.length} icon={<Lock size={24} />} color="bg-purple-500" />
                    <div className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col justify-center items-start gap-2 bg-gradient-to-br from-primary/20 to-transparent">
                        <button
                            onClick={() => { setEditingUser(undefined); setIsModalOpen(true); }}
                            className="bg-white text-primary font-bold py-2 px-6 rounded-xl hover:bg-gray-100 transition shadow-lg w-full flex items-center justify-center gap-2"
                        >
                            <Plus size={20} /> Add New User
                        </button>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/5 bg-white/[0.02] text-xs uppercase tracking-wider text-gray-400 font-medium">
                            <th className="p-5 pl-6">Email Address</th>
                            <th className="p-5">Access Role</th>
                            <th className="p-5">Permissions</th>
                            <th className="p-5 text-right pr-6">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {db.adminUsers.map(user => {
                            const config = roleConfig[user.role] || { color: 'bg-gray-500', icon: Users };
                            return (
                                <tr key={user.id} className="group hover:bg-white/5 transition-colors">
                                    <td className="p-5 pl-6">
                                        <div className="flex items-center gap-3 font-bold text-white">
                                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-mono">{user.email.substring(0, 2).toUpperCase()}</div>
                                            {user.email}
                                        </div>
                                    </td>
                                    <td className="p-5">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-white ${config.color} bg-opacity-20 border border-white/10`}>
                                            <config.icon size={12} /> {user.role}
                                        </span>
                                    </td>
                                    <td className="p-5 text-sm text-gray-400">
                                        {user.role === 'Super Admin' ? (
                                            <span className="text-green-400 flex items-center gap-1"><CheckCircle size={14} /> Full Access</span>
                                        ) : (
                                            <span className="opacity-70">{Object.keys(user.permissions).length} Custom Modules</span>
                                        )}
                                    </td>
                                    <td className="p-5 text-right pr-6 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => { setEditingUser(user); setIsModalOpen(true); }} className="p-2 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white rounded-lg transition-colors"><Edit size={16} /></button>
                                        <button onClick={() => handleDelete(user.id)} className="p-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-lg transition-colors"><Trash2 size={16} /></button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {isModalOpen && <UserFormModal user={editingUser} onSave={handleSave} onClose={() => { setEditingUser(undefined); setIsModalOpen(false); }} />}
        </div>
    );
};

export default AdminUsersScreen;
