import React, { useState, useMemo } from 'react';
import { AdminUser, RoleName, AdminModule, PermissionLevel } from '../../types';
import { useDatabase } from '../../context/DatabaseContext';
import Spinner from '../../components/Spinner';
import EnhancedKPICard from '../../components/admin/EnhancedKPICard';
import { Users, Shield, UserCheck, Activity, Edit, Trash2, Search, Download, Plus, X, Check, AlertTriangle, Camera, Image as ImageIcon, Filter, Mail, User, ChevronDown, ArrowUpDown } from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';
import { storageService } from '../../services/StorageService';

type SortableKeys = 'name' | 'role' | 'isActive' | 'lastLogin';

const AdminUsersScreen: React.FC = () => {
    const { db, addAdminUser, updateAdminUser, deleteAdminUser, loading } = useDatabase();
    const { addNotification } = useNotification();
    const [isSaving, setIsSaving] = useState(false);

    // UI State
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<RoleName | 'all'>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentUser, setCurrentUser] = useState<Partial<AdminUser>>({});
    const [formErrors, setFormErrors] = useState<string | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' }>({ key: 'name', direction: 'ascending' });
    const [showAdminUserPassword, setShowAdminUserPassword] = useState(false);

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

    // Initial Empty User State
    const initialUserState: Partial<AdminUser> = {
        name: '',
        email: '',
        role: 'Viewer',
        isActive: true,
        avatarUrl: '',
        permissions: {
            dashboard: 'read',
            analytics: 'read',
            bookings: 'read',
            catalog: 'read',
            mechanics: 'read',
            customers: 'read',
            marketing: 'read',
            users: 'read',
            settings: 'read',
            orders: 'read',
            monetization: 'read',
            payouts: 'read',
            chat: 'read',
            'gcash-payments': 'read',
            notifications: 'read'
        }
    };

    // --- CRUD Handlers ---

    const handleOpenAddModal = () => {
        setIsEditing(false);
        setCurrentUser(initialUserState);
        setFormErrors(null);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (user: AdminUser) => {
        setIsEditing(true);
        setCurrentUser({ ...user, password: '' }); // Clone user and clear password field for editing
        setFormErrors(null);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentUser({});
        setFormErrors(null);
    };

    const validateForm = () => {
        if (!currentUser.name || !currentUser.email || !currentUser.role) {
            setFormErrors("Please fill in all required fields (Name, Email, Role).");
            return false;
        }
        if (!currentUser.email.includes('@')) {
            setFormErrors("Please enter a valid email address.");
            return false;
        }
        return true;
    };

    const handleSaveUser = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setIsSaving(true);
        try {
            if (isEditing && currentUser.id) {
                // Update
                const updatedUser = {
                    ...currentUser,
                    updatedAt: new Date().toISOString()
                } as AdminUser;

                // Strip undefined values and empty passwords for Firestore compatibility
                const cleanUser: any = {};
                Object.entries(updatedUser).forEach(([key, value]) => {
                    if (value !== undefined) {
                        if (key === 'password') {
                            if (typeof value === 'string' && value.trim()) {
                                cleanUser[key] = value.trim();
                            }
                            return;
                        }
                        cleanUser[key] = value;
                    }
                });

                await updateAdminUser(cleanUser);
                addNotification({
                    type: 'success',
                    title: 'User Updated',
                    message: `${currentUser.name}'s account has been successfully updated.`,
                    recipientId: 'admin',
                });
            } else {
                // Create
                const newUser = {
                    ...initialUserState,
                    ...currentUser,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                } as Omit<AdminUser, 'id'>;

                // Strip undefined values
                const cleanNewUser: any = {};
                Object.entries(newUser).forEach(([key, value]) => {
                    if (value !== undefined) cleanNewUser[key] = value;
                });

                await addAdminUser(cleanNewUser);
                addNotification({
                    type: 'success',
                    title: 'User Created',
                    message: `New admin account for ${currentUser.name} has been created.`,
                    recipientId: 'admin',
                });
            }
            handleCloseModal();
        } catch (error: any) {
            console.error("ACTUAL DATABASE ERROR:", error);
            const errMsg = error?.message || "Unknown error occurred";
            setFormErrors(isEditing ? `Update Failed: ${errMsg}` : `Creation Failed: ${errMsg}`);
            addNotification({
                type: 'error',
                title: 'Operation Failed',
                message: errMsg,
                recipientId: 'admin',
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        const user = db?.adminUsers.find(u => u.id === userId);
        if (window.confirm(`Are you sure you want to delete ${user?.name}? This action cannot be undone.`)) {
            try {
                await deleteAdminUser(userId);
                addNotification({
                    type: 'success',
                    title: 'User Deleted',
                    message: 'Admin account has been removed.',
                    recipientId: 'admin',
                });
            } catch (error) {
                addNotification({
                    type: 'error',
                    title: 'Delete Failed',
                    message: 'Could not remove admin account.',
                    recipientId: 'admin',
                });
            }
        }
    };

    const handleExport = () => {
        if (!db?.adminUsers.length) return;

        const headers = ["Name", "Email", "Role", "Status", "Last Login", "Created At"];
        const rows = filteredUsers.map(u => [
            u.name,
            u.email,
            u.role,
            u.isActive ? 'Active' : 'Inactive',
            u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never',
            new Date(u.createdAt).toLocaleDateString()
        ]);

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Admin_Users_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        addNotification({
            type: 'success',
            title: 'Export Successful',
            message: `${filteredUsers.length} users exported to CSV.`,
            recipientId: 'admin',
        });
    };

    // --- Stats & Helpers ---

    const stats = useMemo(() => {
        if (!db) return { totalUsers: 0, activeUsers: 0, admins: 0, recentActivity: 0 };
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        return {
            totalUsers: db.adminUsers.length,
            activeUsers: db.adminUsers.filter(u => u.isActive).length,
            admins: db.adminUsers.filter(u => u.role === 'Admin' || u.role === 'Super Admin').length,
            recentActivity: db.adminUsers.filter(u => u.lastLogin && new Date(u.lastLogin).getTime() > sevenDaysAgo).length
        };
    }, [db]);

    const filteredUsers = useMemo(() => {
        if (!db) return [];
        let filtered = db.adminUsers.filter(user => {
            const searchMatch = !searchQuery ||
                user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                user.email.toLowerCase().includes(searchQuery.toLowerCase());
            const roleMatch = roleFilter === 'all' || user.role === roleFilter;
            const statusMatch = statusFilter === 'all' ||
                (statusFilter === 'active' && user.isActive) ||
                (statusFilter === 'inactive' && !user.isActive);
            return searchMatch && roleMatch && statusMatch;
        });

        filtered.sort((a, b) => {
            let aValue: any;
            let bValue: any;

            switch (sortConfig.key) {
                case 'name':
                    aValue = a.name.toLowerCase();
                    bValue = b.name.toLowerCase();
                    break;
                case 'role':
                    aValue = a.role.toLowerCase();
                    bValue = b.role.toLowerCase();
                    break;
                case 'isActive':
                    aValue = a.isActive;
                    bValue = b.isActive;
                    break;
                case 'lastLogin':
                    aValue = a.lastLogin ? new Date(a.lastLogin).getTime() : 0;
                    bValue = b.lastLogin ? new Date(b.lastLogin).getTime() : 0;
                    break;
                default:
                    aValue = a.name.toLowerCase();
                    bValue = b.name.toLowerCase();
            }

            if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });

        return filtered;
    }, [db, searchQuery, roleFilter, statusFilter, sortConfig]);

    const roleColors: Record<string, string> = {
        'Super Admin': 'bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.3)]',
        'Admin': 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.3)]',
        'Editor': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.3)]',
        'Viewer': 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIsSaving(true);
            try {
                const url = await storageService.uploadFile(`admin/avatars/${Date.now()}_${file.name}`, file);
                setCurrentUser({ ...currentUser, avatarUrl: url });
            } catch (error) {
                console.error("Image upload failed:", error);
                addNotification({
                    type: 'error',
                    title: 'Upload Failed',
                    message: 'Could not upload the image. Please try again.',
                    recipientId: 'admin',
                });
            } finally {
                setIsSaving(false);
            }
        }
    };

    if (loading) return <div className="flex justify-center items-center min-h-screen text-primary"><Spinner size="lg" color="text-primary" /></div>;
    if (!db) return <div className="text-white text-center p-10">Database Error</div>;

    return (
        <div className="flex-1 p-6 bg-[#0F0F0F] text-white min-h-screen overflow-y-auto animate-fadeIn pb-20">
            <div className="max-w-[1600px] mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 animate-slideInUp">
                    <div>
                        <h1 className="text-5xl font-black text-white tracking-tighter  leading-none">Access Control</h1>
                        <div className="flex items-center gap-2 mt-4">
                            <div className="h-1 w-12 bg-primary rounded-full"></div>
                            <p className="text-gray-500 font-bold  tracking-[0.3em] text-[10px]">User Management</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-[1.5rem] text-[10px] font-black  tracking-widest text-white transition-all hover:scale-105 active:scale-95"
                        >
                            <Download size={16} /> Export
                        </button>
                        <button
                            onClick={handleOpenAddModal}
                            className="flex items-center gap-2 px-6 py-4 bg-primary hover:bg-orange-600 rounded-[1.5rem] text-[10px] font-black  tracking-widest text-white shadow-lg shadow-primary/20 transition-all hover:shadow-glow-primary active:scale-95 group"
                        >
                            <Plus size={16} className="group-hover:rotate-90 transition-transform duration-500" /> Add User
                        </button>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-slideInUp delay-100">
                    <EnhancedKPICard
                        title="Total Users"
                        value={stats.totalUsers}
                        icon={<Users size={24} className="text-white" />}
                        gradient="bg-gradient-to-br from-blue-600 to-blue-800"
                        subtitle="All registered users"
                    />
                    <EnhancedKPICard
                        title="Active Users"
                        value={stats.activeUsers}
                        icon={<UserCheck size={24} className="text-white" />}
                        gradient="bg-gradient-to-br from-emerald-600 to-emerald-800"
                        subtitle="Currently active"
                    />
                    <EnhancedKPICard
                        title="Admins"
                        value={stats.admins}
                        icon={<Shield size={24} className="text-white" />}
                        gradient="bg-gradient-to-br from-purple-600 to-purple-800"
                        subtitle="Elevated privileges"
                    />
                    <EnhancedKPICard
                        title="Low Activity"
                        value={stats.totalUsers - stats.recentActivity}
                        icon={<Activity size={24} className="text-white" />}
                        gradient="bg-gradient-to-br from-orange-600 to-orange-800"
                        subtitle="Inactive > 7 days"
                    />
                </div>

                {/* Filters */}
                <div className="bg-[#121212]/60 backdrop-blur-xl border border-white/10 p-6 rounded-[2.5rem] flex flex-col md:flex-row gap-4 shadow-2xl animate-slideInUp delay-200">
                    <div className="relative flex-1">
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-6 py-4 bg-white/5 border border-white/5 rounded-2xl text-white font-bold text-sm outline-none transition-all placeholder-gray-600"
                        />
                        <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                    </div>
                    <div className="relative">
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value as any)}
                            className="px-6 py-4 bg-white/5 border border-white/5 rounded-2xl text-white font-bold text-xs  tracking-wider outline-none appearance-none cursor-pointer pr-10"
                        >
                            <option value="all">All Roles</option>
                            <option value="Super Admin">Super Admin</option>
                            <option value="Admin">Admin</option>
                            <option value="Editor">Editor</option>
                            <option value="Viewer">Viewer</option>
                        </select>
                        <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                    </div>
                    <div className="relative">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                            className="px-6 py-4 bg-white/5 border border-white/5 rounded-2xl text-white font-bold text-xs  tracking-wider outline-none appearance-none cursor-pointer pr-10"
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                        <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                    </div>
                </div>

                {/* User List Table */}
                <div className="bg-[#121212]/60 backdrop-blur-xl rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl animate-slideInUp delay-300">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-white/5">
                                <tr>
                                    <th className="px-8 py-6">
                                        <button onClick={() => requestSort('name')} className="flex items-center hover:text-white transition-colors text-[10px] font-black  tracking-widest text-gray-500">
                                            User Details {getSortIndicator('name')}
                                        </button>
                                    </th>
                                    <th className="px-8 py-6">
                                        <button onClick={() => requestSort('role')} className="flex items-center hover:text-white transition-colors text-[10px] font-black  tracking-widest text-gray-500">
                                            Role {getSortIndicator('role')}
                                        </button>
                                    </th>
                                    <th className="px-8 py-6">
                                        <button onClick={() => requestSort('isActive')} className="flex items-center hover:text-white transition-colors text-[10px] font-black  tracking-widest text-gray-500">
                                            Status {getSortIndicator('isActive')}
                                        </button>
                                    </th>
                                    <th className="px-8 py-6">
                                        <button onClick={() => requestSort('lastLogin')} className="flex items-center hover:text-white transition-colors text-[10px] font-black  tracking-widest text-gray-500">
                                            Last Login {getSortIndicator('lastLogin')}
                                        </button>
                                    </th>
                                    <th className="px-8 py-6 text-right text-[10px] font-black  tracking-widest text-gray-500">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredUsers.length > 0 ? filteredUsers.map(user => (
                                    <tr key={user.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                {user.avatarUrl ? (
                                                    <img
                                                        src={user.avatarUrl}
                                                        alt={user.name}
                                                        className="w-12 h-12 rounded-2xl object-cover border border-white/10 shadow-lg"
                                                    />
                                                ) : (
                                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-white font-black text-lg border border-white/10 shadow-lg">
                                                        {user.name.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="font-bold text-white text-base group-hover:text-primary transition-colors">{user.name}</div>
                                                    <div className="text-xs text-gray-500 font-mono tracking-wide">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className={`px-4 py-2 rounded-xl text-[10px] font-black  tracking-widest border ${roleColors[user.role] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            {user.isActive ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                                    <span className="text-emerald-400 text-xs font-bold  tracking-wide">Active</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"></div>
                                                    <span className="text-rose-400 text-xs font-bold  tracking-wide">Inactive</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-8 py-6 text-gray-400 text-sm font-medium">
                                            {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : <span className="text-gray-600 ">Never</span>}
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleOpenEditModal(user)}
                                                    className="p-3 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all"
                                                    title="Edit"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteUser(user.id)}
                                                    className="p-3 hover:bg-rose-500/10 rounded-xl text-gray-400 hover:text-rose-400 transition-all"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={5} className="py-24 text-center">
                                            <div className="flex flex-col items-center justify-center gap-4 text-gray-500">
                                                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center">
                                                    <User size={32} />
                                                </div>
                                                <p className="font-bold text-lg">No users found</p>
                                                <p className="text-sm">Try adjusting your filters or search query.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
                        <div className="bg-[#18181b] border border-white/10 rounded-[2.5rem] w-full max-w-xl shadow-2xl transform transition-all scale-100 overflow-hidden ring-1 ring-white/10 animate-slideUp">
                            <div className="relative h-40 bg-gradient-to-r from-primary/20 via-orange-500/10 to-transparent">
                                <button
                                    onClick={handleCloseModal}
                                    className="absolute top-6 right-6 p-3 bg-black/40 hover:bg-black/60 text-white rounded-full transition-colors z-10 backdrop-blur-md"
                                >
                                    <X size={20} />
                                </button>
                                <div className="absolute -bottom-12 left-10">
                                    <div className="relative group">
                                        <div className="w-28 h-28 rounded-3xl bg-[#121212] border-[6px] border-[#18181b] flex items-center justify-center overflow-hidden shadow-2xl">
                                            {currentUser.avatarUrl ? (
                                                <img src={currentUser.avatarUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <ImageIcon className="text-gray-700" size={32} />
                                            )}
                                        </div>
                                        <label className="absolute -bottom-2 -right-2 p-3 bg-primary hover:bg-orange-600 text-white rounded-2xl shadow-lg cursor-pointer transition-all transform hover:scale-110 active:scale-95 border-4 border-[#18181b]">
                                            <Camera size={16} />
                                            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="px-10 pt-16 pb-10">
                                <div className="mb-8 pl-1">
                                    <h2 className="text-3xl font-black text-white tracking-tighter  leading-none">
                                        {isEditing ? 'Edit Access' : 'New User'}
                                    </h2>
                                    <p className="text-gray-500 text-sm font-bold  tracking-wider mt-2">Configure permissions & profile details.</p>
                                </div>

                                <form onSubmit={handleSaveUser} className="space-y-6">
                                    {formErrors && (
                                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl flex items-center gap-3 text-xs font-bold  tracking-wide animate-shake">
                                            <AlertTriangle size={18} /> {formErrors}
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px]  tracking-widest font-black text-gray-500 ml-1">Full Name</label>
                                            <input
                                                type="text"
                                                value={currentUser.name || ''}
                                                onChange={e => setCurrentUser({ ...currentUser, name: e.target.value })}
                                                className="w-full bg-[#121212] border border-white/10 rounded-2xl px-5 py-4 text-white outline-none transition-all placeholder-gray-700 font-bold"
                                                placeholder="e.g. Alexander Pierce"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px]  tracking-widest font-black text-gray-500 ml-1">Email Address</label>
                                            <input
                                                type="email"
                                                value={currentUser.email || ''}
                                                onChange={e => setCurrentUser({ ...currentUser, email: e.target.value })}
                                                className="w-full bg-[#121212] border border-white/10 rounded-2xl px-5 py-4 text-white outline-none transition-all placeholder-gray-700 font-bold"
                                                placeholder="alex@ridersbud.com"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px]  tracking-widest font-black text-gray-500 ml-1">Access Level</label>
                                            <div className="relative">
                                                <select
                                                    value={currentUser.role || 'Viewer'}
                                                    onChange={e => setCurrentUser({ ...currentUser, role: e.target.value as RoleName })}
                                                    className="w-full bg-[#121212] border border-white/10 rounded-2xl px-5 py-4 text-white outline-none appearance-none font-bold cursor-pointer"
                                                >
                                                    <option value="Super Admin">🛡️ Super Admin</option>
                                                    <option value="Admin">⚡ Admin</option>
                                                    <option value="Editor">✏️ Editor</option>
                                                    <option value="Viewer">👁️ Viewer</option>
                                                </select>
                                                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px]  tracking-widest font-black text-gray-500 ml-1">Status</label>
                                            <div
                                                onClick={() => setCurrentUser({ ...currentUser, isActive: !currentUser.isActive })}
                                                className={`w-full h-[60px] rounded-2xl px-5 flex items-center justify-between cursor-pointer transition-all border ${currentUser.isActive ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}
                                            >
                                                <span className={`text-xs font-black  tracking-widest ${currentUser.isActive ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    {currentUser.isActive ? 'Account Active' : 'Account Disabled'}
                                                </span>
                                                <div className={`w-12 h-6 rounded-full relative transition-colors ${currentUser.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-md ${currentUser.isActive ? 'left-7' : 'left-1'}`} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px]  tracking-widest font-black text-gray-500 ml-1">
                                            {isEditing ? 'New Password (Optional)' : 'Security Setup (Password)'}
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showAdminUserPassword ? 'text' : 'password'}
                                                value={currentUser.password || ''}
                                                onChange={e => setCurrentUser({ ...currentUser, password: e.target.value })}
                                                className="w-full bg-[#121212] border border-white/10 rounded-2xl px-5 py-4 pr-14 text-white outline-none font-mono tracking-widest placeholder-gray-700 text-lg"
                                                placeholder={isEditing ? 'Leave blank to keep current password' : '••••••••'}
                                            />
                                            <button type="button" onClick={() => setShowAdminUserPassword(!showAdminUserPassword)} className="absolute inset-y-0 right-0 pr-5 flex items-center text-gray-500 hover:text-primary transition-colors">
                                                {showAdminUserPassword ? <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex gap-4 pt-4">
                                        <button
                                            type="button"
                                            onClick={handleCloseModal}
                                            className="flex-1 px-4 py-4 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-2xl font-bold transition-all border border-white/5 text-xs  tracking-widest"
                                        >
                                            Discard
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isSaving}
                                            className="flex-[2] px-4 py-4 bg-primary hover:bg-orange-600 text-white rounded-2xl font-black transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3 disabled:opacity-50 text-xs  tracking-widest hover:scale-[1.02] active:scale-95"
                                        >
                                            {isSaving ? <Spinner size="sm" color="text-white" /> : <Check size={18} />}
                                            {isEditing ? 'Update Profile' : 'Initialize Access'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default AdminUsersScreen;
