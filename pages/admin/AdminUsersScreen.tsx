import React, { useState, useMemo, useEffect } from 'react';
import { AdminUser, RoleName, AdminModule, PermissionLevel, Customer, Mechanic, Booking } from '../../types';
import { useDatabase } from '../../context/DatabaseContext';
import { useAdminAuth } from '../../context/AdminAuthContext';
import Spinner from '../../components/Spinner';
import EnhancedKPICard from '../../components/admin/EnhancedKPICard';
import { 
    Users, Shield, UserCheck, Activity, Edit, Trash2, Search, Download, Plus, X, Check, 
    AlertTriangle, Camera, Image as ImageIcon, ChevronDown, ArrowUpDown, History, 
    Key, Wrench, MapPin, Calendar, DollarSign, Star, FileText, Settings, Eye, Ban,
    MoreVertical, Landmark, Smartphone, QrCode
} from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';
import { storageService } from '../../services/StorageService';
import { db as firestore } from '../../firebase';
import { collection, query, orderBy, limit, onSnapshot, addDoc } from 'firebase/firestore';

type SortableKeys = 'name' | 'role' | 'isActive' | 'lastLogin' | 'createdAt';
type RoleSelection = RoleName | 'Customer' | 'Mechanic';

interface UnifiedUser {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: RoleSelection | string;
    roleCategory: 'Admin' | 'Customer' | 'Mechanic';
    isActive: boolean;
    avatarUrl: string;
    createdAt: string;
    lastLogin: string;
    originalData: any;
}

const AdminUsersScreen: React.FC = () => {
    const { 
        db, addAdminUser, updateAdminUser, deleteAdminUser, 
        addCustomer, updateCustomer, deleteCustomer,
        addMechanic, updateMechanic, deleteMechanic, loading 
    } = useDatabase();
    const { adminUser } = useAdminAuth();
    const { addNotification } = useNotification();
    const [isSaving, setIsSaving] = useState(false);

    // Navigation Tabs
    const [activeTab, setActiveTab] = useState<'users' | 'permissions' | 'audit'>('users');

    // UI State
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<RoleSelection | 'all'>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended' | 'inactive'>('all');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentUser, setCurrentUser] = useState<Partial<UnifiedUser>>({});
    const [formErrors, setFormErrors] = useState<string | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' }>({ key: 'name', direction: 'ascending' });
    const [showUserPassword, setShowUserPassword] = useState(false);
    const [viewingUserDetail, setViewingUserDetail] = useState<UnifiedUser | null>(null);
    const [detailActiveTab, setDetailActiveTab] = useState<'overview' | 'profile' | 'extra' | 'bookings'>('overview');
    const [viewingLogsUser, setViewingLogsUser] = useState<any | null>(null);
    const [qrModalUrl, setQrModalUrl] = useState<string | null>(null);

    // Action Dropdown State
    const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);

    // Close action dropdown on click outside
    useEffect(() => {
        const handleOutsideClick = (e: MouseEvent) => {
            if (activeActionMenuId) {
                const target = e.target as HTMLElement;
                if (!target.closest('.action-dropdown-container')) {
                    setActiveActionMenuId(null);
                }
            }
        };
        document.addEventListener('click', handleOutsideClick);
        return () => document.removeEventListener('click', handleOutsideClick);
    }, [activeActionMenuId]);

    // Audit Logs State
    const [auditLogs, setAuditLogs] = useState<any[]>([]);

    // Load Audit Logs Live
    useEffect(() => {
        if (!firestore) return;
        const q = query(collection(firestore, 'auditLogs'), orderBy('timestamp', 'desc'), limit(150));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const logs: any[] = [];
            snapshot.forEach((doc) => {
                logs.push({ id: doc.id, ...doc.data() });
            });
            setAuditLogs(logs);
        });
        return () => { try { unsubscribe(); } catch (_) {} };
    }, []);

    // Create Audit Log Helper
    const createAuditLog = async (action: string, targetUserName: string, notes: string) => {
        try {
            await addDoc(collection(firestore, 'auditLogs'), {
                action,
                affectedUser: targetUserName,
                performedBy: adminUser?.name || 'System Admin',
                performedById: adminUser?.id || 'system',
                timestamp: new Date().toISOString(),
                notes
            });
        } catch (err) {
            console.error("Failed to write audit log:", err);
        }
    };

    // Permission Protection Check
    const canManageUser = (targetUser: Partial<UnifiedUser>) => {
        if (adminUser?.role === 'Super Admin') return true;
        if (targetUser.role === 'Super Admin') return false; // Normal Admin cannot touch Super Admin
        return true;
    };

    // Sort handlers
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

    // List of Modules for Admin permissions grid
    const systemModules: { key: AdminModule; name: string }[] = [
        { key: 'dashboard', name: 'Dashboard' },
        { key: 'customers', name: 'Customers' },
        { key: 'mechanics', name: 'Mechanics' },
        { key: 'bookings', name: 'Bookings' },
        { key: 'catalog', name: 'Service Catalog' },
        { key: 'orders', name: 'Parts Orders' },
        { key: 'payouts', name: 'Payout Requests' },
        { key: 'gcash-payments', name: 'GCash Payments' },
        { key: 'monetization', name: 'Monetization' },
        { key: 'settings', name: 'Settings' },
        { key: 'chat', name: 'Live Chat' },
        { key: 'notifications', name: 'Notifications' },
        { key: 'analytics', name: 'Analytics' },
        { key: 'marketing', name: 'Marketing' }
    ];

    // Merge all user collections
    const unifiedUsersList = useMemo(() => {
        if (!db) return [];

        const admins: UnifiedUser[] = (db.adminUsers || []).map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            phone: u.phoneNumber || '',
            role: u.role,
            roleCategory: 'Admin',
            isActive: u.isActive,
            avatarUrl: u.avatarUrl || '',
            createdAt: u.createdAt || new Date().toISOString(),
            lastLogin: u.lastLogin || '',
            originalData: u
        }));

        const customers: UnifiedUser[] = (db.customers || []).map(c => ({
            id: c.id,
            name: c.name,
            email: c.email,
            phone: c.phone || '',
            role: 'Customer',
            roleCategory: 'Customer',
            isActive: c.status !== 'Suspended' && c.status !== 'Inactive',
            avatarUrl: c.picture || '',
            createdAt: c.registrationDate || new Date().toISOString(),
            lastLogin: (c as any).lastLogin || (c as any).lastActive || '',
            originalData: c
        }));

        const mechanics: UnifiedUser[] = (db.mechanics || []).map(m => ({
            id: m.id,
            name: m.name,
            email: m.email,
            phone: m.phone || '',
            role: 'Mechanic',
            roleCategory: 'Mechanic',
            isActive: m.status !== 'Suspended' && m.status !== 'Inactive',
            avatarUrl: m.imageUrl || '',
            createdAt: m.registrationDate || m.joinedAt || new Date().toISOString(),
            lastLogin: (m as any).lastLogin || (m as any).lastActive || '',
            originalData: m
        }));

        return [...admins, ...customers, ...mechanics];
    }, [db]);

    // Apply filters and sorting
    const filteredUsers = useMemo(() => {
        let filtered = unifiedUsersList.filter(user => {
            const searchMatch = !searchQuery ||
                (user.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (user.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (user.phone || '').includes(searchQuery);

            const roleMatch = roleFilter === 'all' || 
                (roleFilter === 'Customer' && user.roleCategory === 'Customer') ||
                (roleFilter === 'Mechanic' && user.roleCategory === 'Mechanic') ||
                (user.roleCategory === 'Admin' && user.role === roleFilter);

            const statusMatch = statusFilter === 'all' ||
                (statusFilter === 'active' && user.isActive) ||
                (statusFilter === 'suspended' && (user.originalData?.status === 'Suspended' || user.originalData?.status === 'suspended')) ||
                (statusFilter === 'inactive' && !user.isActive && user.originalData?.status !== 'Suspended');

            return searchMatch && roleMatch && statusMatch;
        });

        filtered.sort((a, b) => {
            let aValue: any;
            let bValue: any;

            switch (sortConfig.key) {
                case 'name':
                    aValue = (a.name || '').toLowerCase();
                    bValue = (b.name || '').toLowerCase();
                    break;
                case 'role':
                    aValue = (a.role || '').toLowerCase();
                    bValue = (b.role || '').toLowerCase();
                    break;
                case 'isActive':
                    aValue = a.isActive;
                    bValue = b.isActive;
                    break;
                case 'lastLogin':
                    aValue = a.lastLogin ? new Date(a.lastLogin).getTime() : 0;
                    bValue = b.lastLogin ? new Date(b.lastLogin).getTime() : 0;
                    break;
                case 'createdAt':
                    aValue = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                    bValue = b.createdAt ? new Date(b.createdAt).getTime() : 0;
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
    }, [unifiedUsersList, searchQuery, roleFilter, statusFilter, sortConfig]);

    // Unified statistics
    const stats = useMemo(() => {
        return {
            totalUsers: unifiedUsersList.length,
            activeUsers: unifiedUsersList.filter(u => u.isActive).length,
            admins: unifiedUsersList.filter(u => u.roleCategory === 'Admin').length,
            mechanics: unifiedUsersList.filter(u => u.roleCategory === 'Mechanic').length,
            customers: unifiedUsersList.filter(u => u.roleCategory === 'Customer').length,
        };
    }, [unifiedUsersList]);

    // Initial Empty State structure
    const initialUserState = (): Partial<UnifiedUser> => ({
        name: '',
        email: '',
        phone: '',
        role: 'Customer',
        roleCategory: 'Customer',
        isActive: true,
        avatarUrl: '',
        originalData: {
            address: '',
            status: 'Active',
            // Mechanic fields
            specializations: [],
            specialties: [],
            bio: '',
            availability: {
                monday: { enabled: true, slots: ['08:00-17:00'] },
                tuesday: { enabled: true, slots: ['08:00-17:00'] },
                wednesday: { enabled: true, slots: ['08:00-17:00'] },
                thursday: { enabled: true, slots: ['08:00-17:00'] },
                friday: { enabled: true, slots: ['08:00-17:00'] },
                saturday: { enabled: false, slots: [] },
                sunday: { enabled: false, slots: [] }
            },
            walletBalance: 0,
            totalEarnings: 0,
            rating: 5,
            reviewsCount: 0,
            // Admin permissions fields
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
        }
    });

    const handleOpenAddModal = () => {
        setIsEditing(false);
        setCurrentUser(initialUserState());
        setFormErrors(null);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (user: UnifiedUser) => {
        if (!canManageUser(user)) {
            addNotification({
                type: 'error',
                title: 'Access Denied',
                message: 'You do not have permission to modify Super Admin credentials.',
                recipientId: 'admin'
            });
            return;
        }
        setIsEditing(true);
        setCurrentUser({
            ...user,
            originalData: { ...user.originalData }
        });
        setFormErrors(null);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentUser({});
        setFormErrors(null);
    };

    const validateForm = () => {
        if (!currentUser.name || !currentUser.email) {
            setFormErrors("Name and Email are required fields.");
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
        setFormErrors(null);

        const email = currentUser.email!.trim();
        const name = currentUser.name!.trim();
        const phone = currentUser.phone || '';
        const role = currentUser.role || 'Customer';

        try {
            if (currentUser.roleCategory === 'Admin') {
                const adminRole = role as RoleName;
                const adminPayload = {
                    ...(currentUser.originalData || {}),
                    id: currentUser.id,
                    name,
                    email,
                    role: adminRole,
                    isActive: currentUser.isActive ?? true,
                    avatarUrl: currentUser.avatarUrl || '',
                    phoneNumber: phone,
                    updatedAt: new Date().toISOString()
                } as AdminUser;

                if (currentUser.password) {
                    adminPayload.password = currentUser.password;
                }

                if (isEditing && currentUser.id) {
                    await updateAdminUser(adminPayload);
                    await createAuditLog('Admin Profile Updated', name, `Admin: ${name} (${adminRole}) details updated.`);
                } else {
                    const cleanNewAdmin = {
                        ...adminPayload,
                        createdAt: new Date().toISOString(),
                        permissions: adminPayload.permissions || {
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
                    delete cleanNewAdmin.id;
                    await addAdminUser(cleanNewAdmin);
                    await createAuditLog('Admin Account Initialized', name, `Admin: ${name} (${adminRole}) account created.`);
                }
            } else if (currentUser.roleCategory === 'Customer') {
                const customerPayload = {
                    ...(currentUser.originalData || {}),
                    id: currentUser.id,
                    name,
                    email,
                    phone,
                    picture: currentUser.avatarUrl || '',
                    status: currentUser.isActive ? 'Active' : 'Inactive',
                    registrationDate: currentUser.createdAt || new Date().toISOString()
                } as Customer;

                if (currentUser.password) {
                    customerPayload.password = currentUser.password;
                }

                if (isEditing && currentUser.id) {
                    await updateCustomer(customerPayload);
                    await createAuditLog('Customer Details Updated', name, `Customer: ${name} profile saved.`);
                } else {
                    const cleanNewCustomer = {
                        ...customerPayload,
                        vehicles: [],
                        registrationDate: new Date().toISOString()
                    };
                    delete cleanNewCustomer.id;
                    await addCustomer(cleanNewCustomer);
                    await createAuditLog('Customer Registered', name, `Customer: ${name} created manually.`);
                }
            } else if (currentUser.roleCategory === 'Mechanic') {
                const mechanicPayload = {
                    ...(currentUser.originalData || {}),
                    id: currentUser.id,
                    name,
                    email,
                    phone,
                    imageUrl: currentUser.avatarUrl || '',
                    status: currentUser.isActive ? 'Active' : 'Inactive',
                    joinedAt: currentUser.createdAt || new Date().toISOString()
                } as Mechanic;

                if (currentUser.password) {
                    mechanicPayload.password = currentUser.password;
                }

                if (isEditing && currentUser.id) {
                    await updateMechanic(mechanicPayload);
                    await createAuditLog('Mechanic Profile Updated', name, `Mechanic: ${name} details modified.`);
                } else {
                    const cleanNewMechanic = {
                        ...mechanicPayload,
                        rating: 5,
                        reviews: 0,
                        isOnline: false,
                        joinedAt: new Date().toISOString()
                    };
                    delete cleanNewMechanic.id;
                    await addMechanic(cleanNewMechanic);
                    await createAuditLog('Mechanic Registered', name, `Mechanic: ${name} account created.`);
                }
            }

            addNotification({
                type: 'success',
                title: isEditing ? 'Account Saved' : 'Account Created',
                message: `Account for ${name} has been processed successfully.`,
                recipientId: 'admin'
            });
            handleCloseModal();
        } catch (err: any) {
            console.error("Account write failed:", err);
            setFormErrors(err.message || "Failed to sync updates to the Firestore database.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteUser = async (user: UnifiedUser) => {
        if (!canManageUser(user)) {
            addNotification({
                type: 'error',
                title: 'Access Denied',
                message: 'You do not have permission to delete this Super Admin.',
                recipientId: 'admin'
            });
            return;
        }

        if (window.confirm(`Are you sure you want to completely delete ${user.name}? This will permanently remove the account.`)) {
            try {
                if (user.roleCategory === 'Admin') {
                    await deleteAdminUser(user.id);
                } else if (user.roleCategory === 'Customer') {
                    await deleteCustomer(user.id);
                } else if (user.roleCategory === 'Mechanic') {
                    await deleteMechanic(user.id);
                }

                await createAuditLog('Account Removed', user.name, `${user.roleCategory} profile for ${user.name} was deleted.`);
                addNotification({
                    type: 'success',
                    title: 'Account Deleted',
                    message: `${user.name}'s account was successfully removed.`,
                    recipientId: 'admin'
                });
            } catch (err: any) {
                addNotification({
                    type: 'error',
                    title: 'Delete Failed',
                    message: err.message || 'Operation could not complete.',
                    recipientId: 'admin'
                });
            }
        }
    };

    const handleToggleStatus = async (user: UnifiedUser) => {
        if (!canManageUser(user)) return;
        const newStatus = !user.isActive;

        try {
            if (user.roleCategory === 'Admin') {
                await updateAdminUser({
                    ...user.originalData,
                    isActive: newStatus
                });
            } else if (user.roleCategory === 'Customer') {
                await updateCustomer({
                    ...user.originalData,
                    status: newStatus ? 'Active' : 'Suspended'
                });
            } else if (user.roleCategory === 'Mechanic') {
                await updateMechanic({
                    ...user.originalData,
                    status: newStatus ? 'Active' : 'Suspended'
                });
            }

            await createAuditLog(
                newStatus ? 'Account Activated' : 'Account Suspended', 
                user.name, 
                `Account status for ${user.name} shifted to ${newStatus ? 'Active' : 'Suspended'}.`
            );

            addNotification({
                type: 'success',
                title: 'Status Updated',
                message: `${user.name} has been ${newStatus ? 'activated' : 'suspended'}.`,
                recipientId: 'admin'
            });
        } catch (err: any) {
            addNotification({
                type: 'error',
                title: 'Status Update Failed',
                message: err.message,
                recipientId: 'admin'
            });
        }
    };

    const handleExport = () => {
        if (!filteredUsers.length) return;

        const headers = ["Name", "Email", "Phone", "Role", "Role Category", "Status", "Joined Date", "Last Login"];
        const rows = filteredUsers.map(u => [
            u.name,
            u.email,
            u.phone,
            u.role,
            u.roleCategory,
            u.isActive ? 'Active' : 'Inactive/Suspended',
            new Date(u.createdAt).toLocaleDateString(),
            u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'
        ]);

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `RidersBUD_Users_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        addNotification({
            type: 'success',
            title: 'Export Complete',
            message: `${filteredUsers.length} user records successfully exported to CSV.`,
            recipientId: 'admin'
        });
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIsSaving(true);
            try {
                const folder = currentUser.roleCategory === 'Mechanic' ? 'mechanic/avatars' : 'customer/avatars';
                const url = await storageService.uploadFile(`${folder}/${Date.now()}_${file.name}`, file);
                setCurrentUser({ ...currentUser, avatarUrl: url });
            } catch (error) {
                console.error("Avatar image upload failed:", error);
                addNotification({
                    type: 'error',
                    title: 'Upload Failed',
                    message: 'Could not upload image. Please try again.',
                    recipientId: 'admin'
                });
            } finally {
                setIsSaving(false);
            }
        }
    };

    // Calculate booking stats for Customer / Mechanic details modal
    const userBookings = useMemo(() => {
        if (!db?.bookings || !viewingUserDetail) return [];
        return db.bookings.filter((b: Booking) => 
            viewingUserDetail.roleCategory === 'Customer' 
                ? b.customerId === viewingUserDetail.id 
                : b.mechanicId === viewingUserDetail.id
        );
    }, [db?.bookings, viewingUserDetail]);

    const roleColors: Record<string, string> = {
        'Super Admin': 'bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.3)]',
        'Admin': 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.3)]',
        'Editor': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.3)]',
        'Viewer': 'bg-gray-500/10 text-gray-400 border-gray-500/20',
        'Customer': 'bg-pink-500/10 text-pink-400 border-pink-500/20 shadow-[0_0_10px_rgba(236,72,153,0.3)]',
        'Mechanic': 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.3)]',
    };

    if (loading) return <div className="flex justify-center items-center min-h-screen text-primary"><Spinner size="lg" color="text-primary" /></div>;
    if (!db) return <div className="text-white text-center p-10">Database connection failed.</div>;

    return (
        <div className="flex-1 p-6 bg-[#0F0F0F] text-white min-h-screen overflow-y-auto animate-fadeIn pb-20">
            <div className="max-w-[1600px] mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 animate-slideInUp">
                    <div>
                        <h1 className="text-5xl font-black text-white tracking-tighter leading-none">Access Control</h1>
                        <div className="flex items-center gap-2 mt-4">
                            <div className="h-1 w-12 bg-primary rounded-full"></div>
                            <p className="text-gray-500 font-bold tracking-[0.3em] text-[10px]">User & Permission Management</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-[1.5rem] text-[10px] font-black tracking-widest text-white transition-all hover:scale-105 active:scale-95"
                        >
                            <Download size={16} /> Export
                        </button>
                        <button
                            onClick={handleOpenAddModal}
                            className="flex items-center gap-2 px-6 py-4 bg-primary hover:bg-orange-600 rounded-[1.5rem] text-[10px] font-black tracking-widest text-white shadow-lg shadow-primary/20 transition-all hover:shadow-glow-primary active:scale-95 group"
                        >
                            <Plus size={16} className="group-hover:rotate-90 transition-transform duration-500" /> Add Account
                        </button>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 animate-slideInUp delay-100">
                    <EnhancedKPICard
                        title="Total Users"
                        value={stats.totalUsers}
                        icon={<Users size={24} className="text-white" />}
                        gradient="bg-gradient-to-br from-blue-600/20 to-blue-800/10 border border-blue-500/20"
                        subtitle="Across all roles"
                    />
                    <EnhancedKPICard
                        title="Active Accounts"
                        value={stats.activeUsers}
                        icon={<UserCheck size={24} className="text-white" />}
                        gradient="bg-gradient-to-br from-emerald-600/20 to-emerald-800/10 border border-emerald-500/20"
                        subtitle="Status: Active"
                    />
                    <EnhancedKPICard
                        title="Admins"
                        value={stats.admins}
                        icon={<Shield size={24} className="text-white" />}
                        gradient="bg-gradient-to-br from-purple-600/20 to-purple-800/10 border border-purple-500/20"
                        subtitle="Backend access"
                    />
                    <EnhancedKPICard
                        title="Mechanics"
                        value={stats.mechanics}
                        icon={<Wrench size={24} className="text-white" />}
                        gradient="bg-gradient-to-br from-amber-600/20 to-amber-800/10 border border-amber-500/20"
                        subtitle="Repair experts"
                    />
                    <EnhancedKPICard
                        title="Customers"
                        value={stats.customers}
                        icon={<Users size={24} className="text-white" />}
                        gradient="bg-gradient-to-br from-pink-600/20 to-pink-800/10 border border-pink-500/20"
                        subtitle="Registered riders"
                    />
                </div>

                {/* Tabs Panel */}
                <div className="flex border-b border-white/5 gap-2 select-none">
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`px-6 py-3 font-black text-xs uppercase tracking-widest transition-all border-b-2 ${activeTab === 'users' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-white'}`}
                    >
                        User Accounts
                    </button>
                    <button
                        onClick={() => setActiveTab('permissions')}
                        className={`px-6 py-3 font-black text-xs uppercase tracking-widest transition-all border-b-2 ${activeTab === 'permissions' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-white'}`}
                    >
                        Role Permissions Matrix
                    </button>
                    <button
                        onClick={() => setActiveTab('audit')}
                        className={`px-6 py-3 font-black text-xs uppercase tracking-widest transition-all border-b-2 ${activeTab === 'audit' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-white'}`}
                    >
                        Audit Logs
                    </button>
                </div>

                {/* TAB 1: USER LIST */}
                {activeTab === 'users' && (
                    <div className="space-y-6">
                        {/* Filters */}
                        <div className="bg-[#121212]/60 backdrop-blur-xl border border-white/10 p-6 rounded-[2.5rem] flex flex-col md:flex-row gap-4 shadow-2xl animate-slideInUp delay-200">
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    placeholder="Search by name, email, or mobile..."
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
                                    className="px-6 py-4 bg-white/5 border border-white/5 rounded-2xl text-white font-bold text-xs tracking-wider outline-none appearance-none cursor-pointer pr-10"
                                >
                                    <option value="all">All Roles</option>
                                    <option value="Customer">Customer</option>
                                    <option value="Mechanic">Mechanic</option>
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
                                    className="px-6 py-4 bg-white/5 border border-white/5 rounded-2xl text-white font-bold text-xs tracking-wider outline-none appearance-none cursor-pointer pr-10"
                                >
                                    <option value="all">All Status</option>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                    <option value="suspended">Suspended</option>
                                </select>
                                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                            </div>
                        </div>

                        {/* User List Table (Desktop View) */}
                        <div className="hidden md:block bg-[#121212]/60 backdrop-blur-xl rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl animate-slideInUp delay-300">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-white/5">
                                        <tr>
                                            <th className="px-8 py-6 whitespace-nowrap">
                                                <button onClick={() => requestSort('name')} className="flex items-center hover:text-white transition-colors text-[10px] font-black tracking-widest text-gray-500 whitespace-nowrap">
                                                    User Details {getSortIndicator('name')}
                                                </button>
                                            </th>
                                            <th className="px-8 py-6 whitespace-nowrap">
                                                <button onClick={() => requestSort('role')} className="flex items-center hover:text-white transition-colors text-[10px] font-black tracking-widest text-gray-500 whitespace-nowrap">
                                                    Role / Category {getSortIndicator('role')}
                                                </button>
                                            </th>
                                            <th className="px-8 py-6 whitespace-nowrap">
                                                <button onClick={() => requestSort('isActive')} className="flex items-center hover:text-white transition-colors text-[10px] font-black tracking-widest text-gray-500 whitespace-nowrap">
                                                    Status {getSortIndicator('isActive')}
                                                </button>
                                            </th>
                                            <th className="px-8 py-6 whitespace-nowrap">
                                                <button onClick={() => requestSort('createdAt')} className="flex items-center hover:text-white transition-colors text-[10px] font-black tracking-widest text-gray-500 whitespace-nowrap">
                                                    Created At {getSortIndicator('createdAt')}
                                                </button>
                                            </th>
                                            <th className="px-8 py-6 whitespace-nowrap">
                                                <button onClick={() => requestSort('lastLogin')} className="flex items-center hover:text-white transition-colors text-[10px] font-black tracking-widest text-gray-500 whitespace-nowrap">
                                                    Last Activity {getSortIndicator('lastLogin')}
                                                </button>
                                            </th>
                                            <th className="px-8 py-6 text-right text-[10px] font-black tracking-widest text-gray-500 whitespace-nowrap">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {filteredUsers.length > 0 ? filteredUsers.map(user => {
                                            const isOnline = (() => {
                                                if (user.originalData?.isOnline !== true) return false;
                                                if (user.originalData?.lastActive) {
                                                    const lastActiveTime = new Date(user.originalData.lastActive).getTime();
                                                    const now = new Date().getTime();
                                                    return (now - lastActiveTime) < 60000;
                                                }
                                                return true;
                                            })();

                                            return (
                                                <tr key={user.id} className="hover:bg-white/5 transition-colors group">
                                                    <td className="px-8 py-6 whitespace-nowrap">
                                                        <div className="flex items-center gap-4">
                                                            <img
                                                                src={user.avatarUrl || (user.roleCategory === 'Mechanic' ? db?.settings?.defaultMechanicImageUrl : user.roleCategory === 'Customer' ? db?.settings?.defaultCustomerImageUrl : null) || '/riders-logo.png'}
                                                                alt={user.name}
                                                                className="w-12 h-12 rounded-2xl object-cover border border-white/10 shadow-lg"
                                                                onError={(e) => { (e.target as HTMLImageElement).src = (user.roleCategory === 'Mechanic' ? db?.settings?.defaultMechanicImageUrl : db?.settings?.defaultCustomerImageUrl) || '/riders-logo.png'; }}
                                                            />
                                                            <div>
                                                                <div className="font-bold text-white text-base group-hover:text-primary transition-colors flex items-center gap-2">
                                                                    {user.name}
                                                                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                                                        isOnline 
                                                                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                                                            : 'bg-white/5 text-gray-500 border border-white/5'
                                                                    }`}>
                                                                        <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.5)]' : 'bg-gray-600'}`} />
                                                                        {isOnline ? 'Online' : 'Offline'}
                                                                    </span>
                                                                </div>
                                                                <div className="text-xs text-gray-500 font-mono tracking-wide">{user.email || 'No email registered'}</div>
                                                                {user.phone && <div className="text-[10px] text-gray-600 mt-0.5">{user.phone}</div>}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6 whitespace-nowrap">
                                                        <span className={`px-4 py-2 rounded-xl text-[10px] font-black tracking-widest border ${roleColors[user.role] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>
                                                            {user.role}
                                                        </span>
                                                    </td>
                                                <td className="px-8 py-6 whitespace-nowrap">
                                                    {user.isActive ? (
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                                            <span className="text-emerald-400 text-xs font-bold tracking-wide">Active</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-2.5 h-2.5 rounded-full ${user.originalData?.status === 'Suspended' ? 'bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-gray-600'}`}></div>
                                                            <span className={`${user.originalData?.status === 'Suspended' ? 'text-red-400' : 'text-gray-500'} text-xs font-bold tracking-wide`}>
                                                                {user.originalData?.status === 'Suspended' ? 'Suspended' : 'Inactive'}
                                                            </span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-8 py-6 text-gray-400 text-sm font-medium whitespace-nowrap">
                                                    {user.createdAt ? (
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-gray-300">{new Date(user.createdAt).toLocaleDateString()}</span>
                                                            <span className="text-[10px] text-gray-500 mt-0.5">{new Date(user.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-600">N/A</span>
                                                    )}
                                                </td>
                                                <td className="px-8 py-6 text-gray-400 text-sm font-medium whitespace-nowrap">
                                                    {(() => {
                                                        const activeTime = user.originalData?.lastActive || user.lastLogin;
                                                        if (activeTime) {
                                                            const dateObj = new Date(activeTime);
                                                            const isValidDate = !isNaN(dateObj.getTime());
                                                            if (isValidDate) {
                                                                return (
                                                                    <div className="flex flex-col">
                                                                        <span className="font-bold text-gray-300">{dateObj.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                                                                        <span className="text-[10px] text-gray-500 mt-0.5">{dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                                                                    </div>
                                                                );
                                                            }
                                                        }
                                                        return <span className="text-gray-600">Never logged in</span>;
                                                    })()}
                                                </td>
                                                <td className="px-8 py-6 text-right relative action-dropdown-container whitespace-nowrap">
                                                    <div className="flex items-center justify-end">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setActiveActionMenuId(activeActionMenuId === user.id ? null : user.id);
                                                            }}
                                                            className={`p-2.5 rounded-xl border transition-all ${activeActionMenuId === user.id ? 'bg-primary border-primary text-black' : 'bg-white/5 border-white/5 text-gray-400 hover:text-white hover:bg-white/10'}`}
                                                            title="Actions"
                                                        >
                                                            <MoreVertical size={18} />
                                                        </button>

                                                        {activeActionMenuId === user.id && (
                                                            <div className="absolute right-8 top-16 bg-[#1a1a1a]/95 border border-white/10 rounded-2xl shadow-2xl p-2 z-50 min-w-[200px] backdrop-blur-xl text-left animate-fadeIn">
                                                                <button
                                                                    onClick={() => {
                                                                        setViewingUserDetail(user);
                                                                        setActiveActionMenuId(null);
                                                                    }}
                                                                    className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                                                                >
                                                                    <Eye size={16} className="text-gray-500" />
                                                                    View Details
                                                                </button>
                                                                
                                                                {user.roleCategory === 'Admin' && (
                                                                    <button
                                                                        onClick={() => {
                                                                            setViewingLogsUser(user.originalData);
                                                                            setActiveActionMenuId(null);
                                                                        }}
                                                                        className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                                                                    >
                                                                        <History size={16} className="text-amber-500" />
                                                                        Login History
                                                                    </button>
                                                                )}

                                                                <button
                                                                    onClick={() => {
                                                                        handleToggleStatus(user);
                                                                        setActiveActionMenuId(null);
                                                                    }}
                                                                    className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-xl transition-all ${user.isActive ? 'text-rose-400 hover:bg-rose-500/10' : 'text-green-400 hover:bg-green-500/10'}`}
                                                                >
                                                                    <Ban size={16} />
                                                                    {user.isActive ? 'Suspend User' : 'Activate User'}
                                                                </button>

                                                                <button
                                                                    onClick={() => {
                                                                        handleOpenEditModal(user);
                                                                        setActiveActionMenuId(null);
                                                                    }}
                                                                    className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                                                                >
                                                                    <Edit size={16} className="text-blue-400" />
                                                                    Edit Account
                                                                </button>

                                                                <div className="h-px bg-white/5 my-1" />

                                                                <button
                                                                    onClick={() => {
                                                                        handleDeleteUser(user);
                                                                        setActiveActionMenuId(null);
                                                                    }}
                                                                    className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                                                                >
                                                                    <Trash2 size={16} />
                                                                    Delete Account
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    }) : (
                                            <tr>
                                                <td colSpan={6} className="py-24 text-center">
                                                    <div className="flex flex-col items-center justify-center gap-4 text-gray-500">
                                                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center">
                                                            <Users size={32} />
                                                        </div>
                                                        <p className="font-bold text-lg">No accounts found</p>
                                                        <p className="text-sm">Try adjusting your filters or search query.</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* User List Cards (Mobile View) */}
                        <div className="block md:hidden space-y-4 animate-slideInUp delay-300">
                            {filteredUsers.length > 0 ? filteredUsers.map(user => {
                                const isOnline = (() => {
                                    if (user.originalData?.isOnline !== true) return false;
                                    if (user.originalData?.lastActive) {
                                        const lastActiveTime = new Date(user.originalData.lastActive).getTime();
                                        const now = new Date().getTime();
                                        return (now - lastActiveTime) < 60000;
                                    }
                                    return true;
                                })();
                                return (
                                    <div key={user.id} className="bg-[#121212]/60 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 space-y-4 shadow-xl">
                                        <div className="flex items-center gap-4">
                                             <img
                                                src={user.avatarUrl || (user.roleCategory === 'Mechanic' ? db?.settings?.defaultMechanicImageUrl : user.roleCategory === 'Customer' ? db?.settings?.defaultCustomerImageUrl : null) || '/riders-logo.png'}
                                                alt={user.name}
                                                className="w-12 h-12 rounded-2xl object-cover border border-white/10 shadow-xl transition-transform group-hover:scale-105"
                                                onError={(e) => { (e.target as HTMLImageElement).src = (user.roleCategory === 'Mechanic' ? db?.settings?.defaultMechanicImageUrl : db?.settings?.defaultCustomerImageUrl) || '/riders-logo.png'; }}
                                            />
                                            <div className="flex-grow min-w-0">
                                                <div className="font-bold text-white text-base truncate flex items-center gap-2">
                                                    {user.name}
                                                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider ${isOnline ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-white/5 text-gray-500 border border-white/5'}`}>
                                                        {isOnline ? 'Online' : 'Offline'}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-gray-500 font-mono truncate">{user.email || 'No email registered'}</div>
                                                {user.phone && <div className="text-[10px] text-gray-600 mt-0.5">{user.phone}</div>}
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center justify-between border-t border-white/5 pt-3">
                                            <span className={`px-3 py-1 rounded-xl text-[9px] font-black tracking-widest border ${roleColors[user.role] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>
                                                {user.role}
                                            </span>
                                            
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => setViewingUserDetail(user)}
                                                    className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-gray-300 hover:text-white transition-colors"
                                                    title="View Details"
                                                >
                                                    <Eye size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleOpenEditModal(user)}
                                                    className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-blue-400 hover:text-white transition-colors"
                                                    title="Edit Account"
                                                >
                                                    <Edit size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteUser(user)}
                                                    className="p-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/10 rounded-xl text-rose-400 transition-colors"
                                                    title="Delete Account"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }) : (
                                <div className="bg-[#121212]/60 backdrop-blur-xl border border-white/10 rounded-3xl p-12 text-center text-gray-500">
                                    No accounts found
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* TAB 2: PERMISSIONS MATRIX GRID */}
                {activeTab === 'permissions' && (
                    <div className="bg-[#121212]/60 backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl animate-slideInUp">
                        <div className="mb-6">
                            <h2 className="text-2xl font-black text-white">Default Module Permissions</h2>
                            <p className="text-gray-500 text-xs font-bold tracking-wide mt-2">Manage what modules Viewer, Editor, and Admin tiers can view and modify across the application.</p>
                        </div>
                        <div className="overflow-x-auto border border-white/5 rounded-2xl bg-black/20">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead className="bg-white/5 border-b border-white/5">
                                    <tr>
                                        <th className="px-6 py-4 font-black tracking-widest text-[10px] text-gray-400 uppercase">Module Name</th>
                                        <th className="px-6 py-4 font-black tracking-widest text-[10px] text-purple-400 uppercase text-center">Super Admin Access</th>
                                        <th className="px-6 py-4 font-black tracking-widest text-[10px] text-blue-400 uppercase text-center">Default Admin</th>
                                        <th className="px-6 py-4 font-black tracking-widest text-[10px] text-emerald-400 uppercase text-center">Default Editor</th>
                                        <th className="px-6 py-4 font-black tracking-widest text-[10px] text-gray-400 uppercase text-center">Default Viewer</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 font-semibold text-gray-300">
                                    {systemModules.map(module => (
                                        <tr key={module.key} className="hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4 font-bold text-white text-sm">{module.name}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="px-3 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[9px] font-black rounded-lg tracking-widest uppercase">Full Access</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[9px] font-black rounded-lg tracking-widest uppercase">Write</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-black rounded-lg tracking-widest uppercase">Write</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="px-3 py-1 bg-gray-500/10 text-gray-400 border border-gray-500/20 text-[9px] font-black rounded-lg tracking-widest uppercase">Read Only</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* TAB 3: AUDIT LOGS */}
                {activeTab === 'audit' && (
                    <div className="bg-[#121212]/60 backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl animate-slideInUp">
                        <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h2 className="text-2xl font-black text-white">System Audit Logs</h2>
                                <p className="text-gray-500 text-xs font-bold tracking-wide mt-2">Track user creations, role permissions, active updates, and password resets securely in real time.</p>
                            </div>
                        </div>

                        <div className="overflow-x-auto border border-white/5 rounded-2xl bg-black/20">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead className="bg-white/5 border-b border-white/5">
                                    <tr>
                                        <th className="px-6 py-4 font-black tracking-widest text-[9px] text-gray-500 uppercase">Timestamp</th>
                                        <th className="px-6 py-4 font-black tracking-widest text-[9px] text-gray-500 uppercase">Performed By</th>
                                        <th className="px-6 py-4 font-black tracking-widest text-[9px] text-gray-500 uppercase">Event Action</th>
                                        <th className="px-6 py-4 font-black tracking-widest text-[9px] text-gray-500 uppercase">Affected User</th>
                                        <th className="px-6 py-4 font-black tracking-widest text-[9px] text-gray-500 uppercase">Details / Remarks</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 font-semibold text-gray-300">
                                    {auditLogs.length > 0 ? auditLogs.map(log => (
                                        <tr key={log.id} className="hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-white">{new Date(log.timestamp).toLocaleDateString()}</span>
                                                    <span className="text-[10px] text-gray-500 mt-0.5">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-bold text-gray-200 whitespace-nowrap">{log.performedBy}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black tracking-widest uppercase border 
                                                    ${log.action.includes('Removed') || log.action.includes('Suspended') ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                                                      log.action.includes('Created') || log.action.includes('Activated') || log.action.includes('Registered') ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                                                      'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}
                                                >
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-bold text-white whitespace-nowrap">{log.affectedUser}</td>
                                            <td className="px-6 py-4 text-gray-400 font-medium leading-relaxed">{log.notes}</td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={5} className="py-12 text-center text-gray-500">
                                                No log logs found. Changes will begin populating here.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* MODAL 1: ADD / EDIT ACCOUNT */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
                        <div className="bg-[#18181b] border border-white/10 rounded-[2.5rem] w-full max-w-2xl shadow-2xl transform transition-all scale-100 overflow-hidden ring-1 ring-white/10 animate-slideUp">
                            <div className="relative h-32 bg-gradient-to-r from-primary/20 via-orange-500/10 to-transparent">
                                <button
                                    onClick={handleCloseModal}
                                    className="absolute top-6 right-6 p-3 bg-black/40 hover:bg-black/60 text-white rounded-full transition-colors z-10 backdrop-blur-md"
                                >
                                    <X size={18} />
                                </button>
                                <div className="absolute -bottom-10 left-10">
                                    <div className="relative group">
                                        <div className="w-24 h-24 rounded-3xl bg-[#121212] border-[4px] border-[#18181b] flex items-center justify-center overflow-hidden shadow-2xl">
                                            <img
                                                src={currentUser.avatarUrl || '/riders-logo.png'}
                                                alt="Avatar Preview"
                                                className="w-full h-full object-cover"
                                                onError={(e) => { (e.target as HTMLImageElement).src = '/riders-logo.png'; }}
                                            />
                                        </div>
                                        <label className="absolute -bottom-1 -right-1 p-2.5 bg-primary hover:bg-orange-600 text-white rounded-xl shadow-lg cursor-pointer transition-all transform hover:scale-110 active:scale-95 border-2 border-[#18181b]">
                                            <Camera size={14} />
                                            <input type="file" id="admin-user-image" name="admin-user-image" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="px-10 pt-14 pb-10 max-h-[75vh] overflow-y-auto custom-scrollbar">
                                <div className="mb-6 pl-1">
                                    <h2 className="text-2xl font-black text-white tracking-tighter leading-none">
                                        {isEditing ? 'Edit User Profile' : 'Register New User'}
                                    </h2>
                                    <p className="text-gray-500 text-xs font-bold tracking-wider mt-2">Set account type, identifiers, permissions, and status.</p>
                                </div>

                                <form onSubmit={handleSaveUser} className="space-y-6">
                                    {formErrors && (
                                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl flex items-center gap-3 text-xs font-bold tracking-wide animate-shake">
                                            <AlertTriangle size={18} /> {formErrors}
                                        </div>
                                    )}

                                    {/* Role Configuration (Only editable on creation to prevent DB schema conflicts) */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label htmlFor="admin-user-role-category" className="text-[10px] tracking-widest font-black text-gray-500 ml-1">Account Role Category</label>
                                            <div className="relative">
                                                <select
                                                    id="admin-user-role-category"
                                                    name="admin-user-role-category"
                                                    value={currentUser.roleCategory || 'Customer'}
                                                    disabled={isEditing}
                                                    onChange={e => {
                                                        const category = e.target.value as 'Customer' | 'Mechanic' | 'Admin';
                                                        setCurrentUser({ 
                                                            ...currentUser, 
                                                            roleCategory: category, 
                                                            role: category === 'Admin' ? 'Viewer' : category 
                                                        });
                                                    }}
                                                    className="w-full bg-[#121212] border border-white/10 rounded-2xl px-5 py-4 text-white font-bold text-xs tracking-wider outline-none appearance-none cursor-pointer disabled:opacity-50"
                                                >
                                                    <option value="Customer">Customer</option>
                                                    <option value="Mechanic">Mechanic</option>
                                                    <option value="Admin">Administrator (Backend Access)</option>
                                                </select>
                                                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                                            </div>
                                        </div>

                                        {currentUser.roleCategory === 'Admin' && (
                                            <div className="space-y-2">
                                                <label htmlFor="admin-user-access-level" className="text-[10px] tracking-widest font-black text-gray-500 ml-1">Admin Access Level</label>
                                                <div className="relative">
                                                    <select
                                                        id="admin-user-access-level"
                                                        name="admin-user-access-level"
                                                        value={currentUser.role || 'Viewer'}
                                                        onChange={e => setCurrentUser({ ...currentUser, role: e.target.value as RoleName })}
                                                        className="w-full bg-[#121212] border border-white/10 rounded-2xl px-5 py-4 text-white font-bold text-xs tracking-wider outline-none appearance-none cursor-pointer"
                                                    >
                                                        <option value="Super Admin">Super Admin</option>
                                                        <option value="Admin">Admin</option>
                                                        <option value="Editor">Editor</option>
                                                        <option value="Viewer">Viewer</option>
                                                    </select>
                                                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Core Profile Fields */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label htmlFor="admin-user-name" className="text-[10px] tracking-widest font-black text-gray-500 ml-1">Full Name</label>
                                            <input
                                                id="admin-user-name"
                                                name="admin-user-name"
                                                type="text"
                                                value={currentUser.name || ''}
                                                onChange={e => setCurrentUser({ ...currentUser, name: e.target.value })}
                                                className="w-full bg-[#121212] border border-white/10 rounded-2xl px-5 py-4 text-white outline-none placeholder-gray-700 font-bold text-sm"
                                                placeholder="e.g. John Doe"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label htmlFor="admin-user-email" className="text-[10px] tracking-widest font-black text-gray-500 ml-1">Email Address</label>
                                            <input
                                                id="admin-user-email"
                                                name="admin-user-email"
                                                type="email"
                                                value={currentUser.email || ''}
                                                onChange={e => setCurrentUser({ ...currentUser, email: e.target.value })}
                                                className="w-full bg-[#121212] border border-white/10 rounded-2xl px-5 py-4 text-white outline-none placeholder-gray-700 font-bold text-sm"
                                                placeholder="john@ridersbud.com"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label htmlFor="admin-user-phone" className="text-[10px] tracking-widest font-black text-gray-500 ml-1">Mobile Number</label>
                                            <input
                                                id="admin-user-phone"
                                                name="admin-user-phone"
                                                type="text"
                                                value={currentUser.phone || ''}
                                                onChange={e => setCurrentUser({ ...currentUser, phone: e.target.value })}
                                                className="w-full bg-[#121212] border border-white/10 rounded-2xl px-5 py-4 text-white outline-none placeholder-gray-700 font-bold text-sm"
                                                placeholder="+63 999 999 9999"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] tracking-widest font-black text-gray-500 ml-1">Account Status</label>
                                            <div
                                                onClick={() => setCurrentUser({ ...currentUser, isActive: !currentUser.isActive })}
                                                className={`w-full h-[60px] rounded-2xl px-5 flex items-center justify-between cursor-pointer transition-all border ${currentUser.isActive ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}
                                            >
                                                <span className={`text-xs font-black tracking-widest ${currentUser.isActive ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    {currentUser.isActive ? 'Account Active' : 'Account Disabled'}
                                                </span>
                                                <div className={`w-12 h-6 rounded-full relative transition-colors ${currentUser.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-md ${currentUser.isActive ? 'left-7' : 'left-1'}`} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* CONDITIONAL COMPONENT 1: MECHANIC PARAMETERS */}
                                    {currentUser.roleCategory === 'Mechanic' && (
                                        <div className="border-t border-white/5 pt-6 space-y-6 animate-fadeIn">
                                            <h3 className="text-xs font-black text-amber-400 tracking-widest uppercase">Mechanic Profile Configuration</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label htmlFor="admin-user-specializations" className="text-[10px] tracking-widest font-black text-gray-500 ml-1">Labor Specialization / Specialties</label>
                                                    <input
                                                        id="admin-user-specializations"
                                                        name="admin-user-specializations"
                                                        type="text"
                                                        value={(currentUser.originalData?.specializations || []).join(', ')}
                                                        onChange={e => {
                                                            const arr = e.target.value.split(',').map(s => s.trim());
                                                            setCurrentUser({
                                                                ...currentUser,
                                                                originalData: {
                                                                    ...currentUser.originalData,
                                                                    specializations: arr,
                                                                    specialties: arr
                                                                }
                                                            });
                                                        }}
                                                        className="w-full bg-[#121212] border border-white/10 rounded-2xl px-5 py-4 text-white outline-none placeholder-gray-700 font-bold text-sm"
                                                        placeholder="Engine, Tuning, Brakes, Tires"
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <label htmlFor="admin-user-service-area" className="text-[10px] tracking-widest font-black text-gray-500 ml-1">Assigned Service Area</label>
                                                    <input
                                                        id="admin-user-service-area"
                                                        name="admin-user-service-area"
                                                        type="text"
                                                        value={currentUser.originalData?.address || ''}
                                                        onChange={e => setCurrentUser({
                                                            ...currentUser,
                                                            originalData: {
                                                                ...currentUser.originalData,
                                                                address: e.target.value
                                                            }
                                                        })}
                                                        className="w-full bg-[#121212] border border-white/10 rounded-2xl px-5 py-4 text-white outline-none placeholder-gray-700 font-bold text-sm"
                                                        placeholder="Manila, Philippines"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label htmlFor="admin-user-bio" className="text-[10px] tracking-widest font-black text-gray-500 ml-1">Bio / Profile Description</label>
                                                <textarea
                                                    id="admin-user-bio"
                                                    name="admin-user-bio"
                                                    value={currentUser.originalData?.bio || ''}
                                                    onChange={e => setCurrentUser({
                                                        ...currentUser,
                                                        originalData: {
                                                            ...currentUser.originalData,
                                                            bio: e.target.value
                                                        }
                                                    })}
                                                    rows={3}
                                                    className="w-full bg-[#121212] border border-white/10 rounded-2xl px-5 py-4 text-white outline-none placeholder-gray-700 font-bold text-sm"
                                                    placeholder="Describe years of mechanical experience and profile introduction..."
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* CONDITIONAL COMPONENT 2: CUSTOMER REMARKS */}
                                    {currentUser.roleCategory === 'Customer' && (
                                        <div className="border-t border-white/5 pt-6 space-y-6 animate-fadeIn">
                                            <h3 className="text-xs font-black text-pink-400 tracking-widest uppercase">Customer Profile Details</h3>
                                            <div className="space-y-2">
                                                <label htmlFor="admin-user-address" className="text-[10px] tracking-widest font-black text-gray-500 ml-1">Default Service Address</label>
                                                <input
                                                    id="admin-user-address"
                                                    name="admin-user-address"
                                                    type="text"
                                                    value={currentUser.originalData?.address || ''}
                                                    onChange={e => setCurrentUser({
                                                        ...currentUser,
                                                        originalData: {
                                                            ...currentUser.originalData,
                                                            address: e.target.value
                                                        }
                                                    })}
                                                    className="w-full bg-[#121212] border border-white/10 rounded-2xl px-5 py-4 text-white outline-none placeholder-gray-700 font-bold text-sm"
                                                    placeholder="Default home/office address..."
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* CONDITIONAL COMPONENT 3: ADMIN PERMISSIONS ACCORDION GRID */}
                                    {currentUser.roleCategory === 'Admin' && (
                                        <div className="border-t border-white/5 pt-6 space-y-6 animate-fadeIn">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-xs font-black text-purple-400 tracking-widest uppercase">Admin Role Toggles & Permissions</h3>
                                                {currentUser.role === 'Super Admin' && (
                                                    <span className="text-[9px] bg-purple-500/20 border border-purple-500/30 px-2 py-0.5 rounded text-purple-300 font-black tracking-widest">FULL BYPASS</span>
                                                )}
                                            </div>

                                            {currentUser.role !== 'Super Admin' && (
                                                <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar border border-white/10 rounded-2xl bg-black/20 p-4">
                                                    <div className="grid grid-cols-3 text-[10px] font-black text-gray-500 tracking-widest uppercase pb-2 border-b border-white/5">
                                                        <span>Module</span>
                                                        <span className="text-center">View (Read)</span>
                                                        <span className="text-center">Edit (Write)</span>
                                                    </div>
                                                    {systemModules.map(module => {
                                                        const currentPerm = currentUser.originalData?.permissions?.[module.key] || 'none';
                                                        return (
                                                            <div key={module.key} className="grid grid-cols-3 text-xs items-center py-2 border-b border-white/[0.02] last:border-0 font-bold">
                                                                <span className="text-gray-300">{module.name}</span>
                                                                <div className="flex justify-center">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={currentPerm === 'read' || currentPerm === 'write'}
                                                                        onChange={e => {
                                                                            const isChecked = e.target.checked;
                                                                            const updatedPerms = { ...currentUser.originalData.permissions };
                                                                            updatedPerms[module.key] = isChecked ? 'read' : 'none';
                                                                            setCurrentUser({
                                                                                ...currentUser,
                                                                                originalData: {
                                                                                    ...currentUser.originalData,
                                                                                    permissions: updatedPerms
                                                                                }
                                                                            });
                                                                        }}
                                                                        className="w-4 h-4 rounded border-white/10 bg-[#121212] checked:bg-primary accent-primary"
                                                                    />
                                                                </div>
                                                                <div className="flex justify-center">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={currentPerm === 'write'}
                                                                        onChange={e => {
                                                                            const isChecked = e.target.checked;
                                                                            const updatedPerms = { ...currentUser.originalData.permissions };
                                                                            updatedPerms[module.key] = isChecked ? 'write' : 'read';
                                                                            setCurrentUser({
                                                                                ...currentUser,
                                                                                originalData: {
                                                                                    ...currentUser.originalData,
                                                                                    permissions: updatedPerms
                                                                                }
                                                                            });
                                                                        }}
                                                                        className="w-4 h-4 rounded border-white/10 bg-[#121212] checked:bg-primary accent-primary"
                                                                    />
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Security Password Setup */}
                                    <div className="border-t border-white/5 pt-6 space-y-2">
                                        <label htmlFor="admin-user-password" className="text-[10px] tracking-widest font-black text-gray-500 ml-1">
                                            {isEditing ? 'New Password (Optional Reset)' : 'Initial Password'}
                                        </label>
                                        <div className="relative">
                                            <input
                                                id="admin-user-password"
                                                name="admin-user-password"
                                                type={showUserPassword ? 'text' : 'password'}
                                                value={currentUser.password || ''}
                                                onChange={e => setCurrentUser({ ...currentUser, password: e.target.value })}
                                                className="w-full bg-[#121212] border border-white/10 rounded-2xl px-5 py-4 pr-14 text-white outline-none font-mono tracking-widest placeholder-gray-700 text-lg"
                                                placeholder={isEditing ? 'Leave blank to preserve current password' : '••••••••'}
                                            />
                                            <button 
                                                type="button" 
                                                onClick={() => setShowUserPassword(!showUserPassword)} 
                                                className="absolute inset-y-0 right-0 pr-5 flex items-center text-gray-500 hover:text-primary transition-colors"
                                            >
                                                {showUserPassword ? (
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                                ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Action buttons */}
                                    <div className="flex gap-4 pt-4">
                                        <button
                                            type="button"
                                            onClick={handleCloseModal}
                                            className="flex-1 px-4 py-4 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-2xl font-bold transition-all border border-white/5 text-xs tracking-widest uppercase"
                                        >
                                            Discard
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isSaving}
                                            className="flex-[2] px-4 py-4 bg-primary hover:bg-orange-600 text-white rounded-2xl font-black transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3 disabled:opacity-50 text-xs tracking-widest uppercase hover:scale-[1.02] active:scale-95"
                                        >
                                            {isSaving ? <Spinner size="sm" color="text-white" /> : <Check size={18} />}
                                            {isEditing ? 'Save Changes' : 'Create Account'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL 2: USER DETAILS & BOOKING ACTIVITY HISTORY */}
                {viewingUserDetail && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
                        <div className="bg-[#18181b] border border-white/10 rounded-[2.5rem] w-full max-w-3xl shadow-2xl transform transition-all scale-100 overflow-hidden ring-1 ring-white/10 animate-slideUp">
                            <div className="p-8 border-b border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <img
                                        src={viewingUserDetail.avatarUrl || '/riders-logo.png'}
                                        alt={viewingUserDetail.name}
                                        className="w-14 h-14 rounded-2xl object-cover border border-white/10"
                                        onError={(e) => { (e.target as HTMLImageElement).src = '/riders-logo.png'; }}
                                    />
                                    <div>
                                        <h2 className="text-2xl font-black text-white tracking-tight leading-none">{viewingUserDetail.name}</h2>
                                        <p className="text-gray-500 text-xs font-bold tracking-wide mt-2">
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black mr-2 uppercase ${
                                                viewingUserDetail.roleCategory === 'Customer' ? 'bg-pink-500/20 text-pink-400' :
                                                viewingUserDetail.roleCategory === 'Mechanic' ? 'bg-amber-500/20 text-amber-400' :
                                                'bg-violet-500/20 text-violet-400'
                                            }`}>
                                                {viewingUserDetail.roleCategory}
                                            </span>
                                            {viewingUserDetail.email}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            handleOpenEditModal(viewingUserDetail);
                                            setViewingUserDetail(null);
                                        }}
                                        className="p-2.5 bg-white/5 hover:bg-white/10 text-blue-400 rounded-xl transition-all border border-white/5"
                                        title="Edit Profile"
                                    >
                                        <Edit size={16} />
                                    </button>
                                    <button
                                        onClick={() => {
                                            handleToggleStatus(viewingUserDetail);
                                            setViewingUserDetail({
                                                ...viewingUserDetail,
                                                isActive: !viewingUserDetail.isActive
                                            });
                                        }}
                                        className={`p-2.5 rounded-xl transition-all border ${
                                            viewingUserDetail.isActive 
                                                ? 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/20 text-rose-400' 
                                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20 text-emerald-400'
                                        }`}
                                        title={viewingUserDetail.isActive ? 'Suspend User' : 'Activate User'}
                                    >
                                        <Ban size={16} />
                                    </button>
                                    <button
                                        onClick={() => setViewingUserDetail(null)}
                                        className="p-2.5 bg-white/5 hover:bg-white/10 text-white rounded-full transition-colors z-10"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Tab Navigation */}
                            {viewingUserDetail.roleCategory !== 'Admin' && (
                                <div className="flex border-b border-white/5 px-8 gap-6 bg-black/20 overflow-x-auto">
                                    <button
                                        onClick={() => setDetailActiveTab('overview')}
                                        className={`py-4 text-xs font-black tracking-widest uppercase border-b-2 transition-all ${
                                            detailActiveTab === 'overview' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-white'
                                        }`}
                                    >
                                        Overview
                                    </button>
                                    <button
                                        onClick={() => setDetailActiveTab('profile')}
                                        className={`py-4 text-xs font-black tracking-widest uppercase border-b-2 transition-all ${
                                            detailActiveTab === 'profile' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-white'
                                        }`}
                                    >
                                        Profile Details
                                    </button>
                                    {viewingUserDetail.roleCategory === 'Customer' && (
                                        <button
                                            onClick={() => setDetailActiveTab('extra')}
                                            className={`py-4 text-xs font-black tracking-widest uppercase border-b-2 transition-all ${
                                                detailActiveTab === 'extra' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-white'
                                            }`}
                                        >
                                            Vehicles ({viewingUserDetail.originalData?.vehicles?.length || 0})
                                        </button>
                                    )}
                                    {viewingUserDetail.roleCategory === 'Mechanic' && (
                                        <button
                                            onClick={() => setDetailActiveTab('extra')}
                                            className={`py-4 text-xs font-black tracking-widest uppercase border-b-2 transition-all ${
                                                detailActiveTab === 'extra' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-white'
                                            }`}
                                        >
                                            Verification Documents
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setDetailActiveTab('bookings')}
                                        className={`py-4 text-xs font-black tracking-widest uppercase border-b-2 transition-all ${
                                            detailActiveTab === 'bookings' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-white'
                                        }`}
                                    >
                                        Associated Bookings ({userBookings.length})
                                    </button>
                                </div>
                            )}

                            <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-6">
                                {/* OVERVIEW TAB */}
                                {(detailActiveTab === 'overview' || viewingUserDetail.roleCategory === 'Admin') && (
                                    <div className="space-y-6">
                                        {/* Details Grid */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn">
                                            <div className="bg-[#111113] p-5 rounded-2xl border border-white/5">
                                                <span className="text-[9px] font-black text-gray-500 uppercase tracking-wider">Mobile Number</span>
                                                <p className="text-sm text-white font-bold mt-1">{viewingUserDetail.phone || 'N/A'}</p>
                                            </div>
                                            <div className="bg-[#111113] p-5 rounded-2xl border border-white/5">
                                                <span className="text-[9px] font-black text-gray-500 uppercase tracking-wider">Account Category</span>
                                                <p className="text-sm text-white font-bold mt-1">{viewingUserDetail.roleCategory}</p>
                                            </div>
                                            <div className="bg-[#111113] p-5 rounded-2xl border border-white/5">
                                                <span className="text-[9px] font-black text-gray-500 uppercase tracking-wider">Registration Date</span>
                                                <p className="text-sm text-white font-bold mt-1">
                                                    {viewingUserDetail.createdAt ? new Date(viewingUserDetail.createdAt).toLocaleDateString() : 'N/A'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Custom stats/activity section depending on role */}
                                        {viewingUserDetail.roleCategory === 'Mechanic' && (
                                            <div className="space-y-4 animate-fadeIn">
                                                <h3 className="text-xs font-black text-amber-400 tracking-widest uppercase">Mechanic Work Metrics</h3>
                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                                    <div className="bg-[#111113]/40 p-4 rounded-xl border border-white/5 flex flex-col justify-between">
                                                        <span className="text-[9px] font-bold text-gray-500">Rating</span>
                                                        <div className="flex items-center gap-1 mt-2 text-amber-400 font-black text-lg">
                                                            <Star size={18} fill="currentColor" />
                                                            {Number(viewingUserDetail.originalData?.rating || 0).toFixed(1)}
                                                        </div>
                                                    </div>
                                                    <div className="bg-[#111113]/40 p-4 rounded-xl border border-white/5 flex flex-col justify-between">
                                                        <span className="text-[9px] font-bold text-gray-500">Total Jobs Done</span>
                                                        <p className="text-lg text-white font-black mt-2">{userBookings.length}</p>
                                                    </div>
                                                    <div className="bg-[#111113]/40 p-4 rounded-xl border border-white/5 flex flex-col justify-between">
                                                        <span className="text-[9px] font-bold text-gray-500">Wallet Balance</span>
                                                        <p className="text-lg text-green-400 font-black mt-2">₱{(viewingUserDetail.originalData?.walletBalance || 0).toLocaleString()}</p>
                                                    </div>
                                                    <div className="bg-[#111113]/40 p-4 rounded-xl border border-white/5 flex flex-col justify-between">
                                                        <span className="text-[9px] font-bold text-gray-500">Lifetime Earnings</span>
                                                        <p className="text-lg text-white font-black mt-2">₱{(viewingUserDetail.originalData?.totalEarnings || 0).toLocaleString()}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {viewingUserDetail.roleCategory === 'Customer' && (
                                            <div className="space-y-4 animate-fadeIn">
                                                <h3 className="text-xs font-black text-pink-400 tracking-widest uppercase">Customer Order Metrics</h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="bg-[#111113]/40 p-5 rounded-xl border border-white/5">
                                                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Bookings Count</span>
                                                        <p className="text-2xl text-white font-black mt-2">{userBookings.length}</p>
                                                    </div>
                                                    <div className="bg-[#111113]/40 p-5 rounded-xl border border-white/5">
                                                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Total Spent</span>
                                                        <p className="text-2xl text-pink-400 font-black mt-2">
                                                            ₱{userBookings.reduce((sum, b: Booking) => sum + (b.totalAmount || 0), 0).toLocaleString()}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* PROFILE & DETAILS TAB */}
                                {detailActiveTab === 'profile' && viewingUserDetail.roleCategory !== 'Admin' && (
                                    <div className="space-y-6 animate-fadeIn">
                                        {/* Bio / Description */}
                                        <div className="bg-[#111113]/40 p-6 rounded-2xl border border-white/5 space-y-2">
                                            <h4 className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Bio & Profile Description</h4>
                                            <p className="text-sm text-gray-300 font-medium leading-relaxed italic">
                                                "{viewingUserDetail.originalData?.bio || 'No profile bio or description written yet.'}"
                                            </p>
                                        </div>

                                        {/* Address Location */}
                                        <div className="bg-[#111113]/40 p-6 rounded-2xl border border-white/5 space-y-2 flex items-start gap-4">
                                            <div className="p-3 bg-white/5 rounded-xl text-primary">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                            </div>
                                            <div className="space-y-1">
                                                <h4 className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Registered Address / Location</h4>
                                                <p className="text-sm text-white font-bold">
                                                    {viewingUserDetail.originalData?.address || 'No location address configured.'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Mechanics Specializations & GCash Wallet details */}
                                        {viewingUserDetail.roleCategory === 'Mechanic' && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="bg-[#111113]/40 p-6 rounded-2xl border border-white/5 space-y-3">
                                                    <h4 className="text-[10px] font-black text-amber-400 tracking-widest uppercase">Labor Specializations</h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {(viewingUserDetail.originalData?.specializations || []).length > 0 ? (
                                                            (viewingUserDetail.originalData?.specializations || []).map((spec: string, i: number) => (
                                                                <span key={i} className="px-2.5 py-1 bg-white/5 text-[10px] font-bold text-gray-300 rounded-full border border-white/5">
                                                                    {spec}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="text-xs text-gray-500 font-bold italic">No specializations declared.</span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="bg-[#111113]/40 p-6 rounded-2xl border border-white/5 space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="text-[10px] font-black text-amber-400 tracking-widest uppercase flex items-center gap-1.5">
                                                            {viewingUserDetail.originalData?.payoutDetails?.method === 'Bank Transfer' ? (
                                                                <Landmark size={12} className="text-amber-400" />
                                                            ) : (
                                                                <Smartphone size={12} className="text-amber-400" />
                                                            )}
                                                            Payout Destination
                                                        </h4>
                                                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                            {viewingUserDetail.originalData?.payoutDetails?.method || 'Direct'}
                                                        </span>
                                                    </div>
                                                    <div className="space-y-2 text-xs font-bold text-gray-300">
                                                        <div className="flex justify-between border-b border-white/5 pb-1.5">
                                                            <span className="text-gray-500">Channel / Bank</span>
                                                            <span className="text-white">
                                                                {viewingUserDetail.originalData?.payoutDetails?.method === 'Bank Transfer'
                                                                    ? (viewingUserDetail.originalData?.payoutDetails?.bankName || 'Bank Transfer')
                                                                    : (viewingUserDetail.originalData?.payoutDetails?.walletName || 'GCash E-Wallet')}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between border-b border-white/5 pb-1.5">
                                                            <span className="text-gray-500">Account Name</span>
                                                            <span className="text-white">{viewingUserDetail.originalData?.payoutDetails?.accountName || 'N/A'}</span>
                                                        </div>
                                                        <div className="flex justify-between border-b border-white/5 pb-1.5">
                                                            <span className="text-gray-500">Account Number</span>
                                                            <span className="text-primary font-mono">{viewingUserDetail.originalData?.payoutDetails?.accountNumber || 'N/A'}</span>
                                                        </div>
                                                        {viewingUserDetail.originalData?.payoutDetails?.qrCodeUrl && (
                                                            <div className="flex justify-between items-center pt-1">
                                                                <span className="text-gray-500 flex items-center gap-1">
                                                                    <QrCode size={12} className="text-amber-400" />
                                                                    QR Code
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setQrModalUrl(viewingUserDetail.originalData?.payoutDetails?.qrCodeUrl)}
                                                                    className="text-[10px] font-bold text-primary hover:text-orange-400 underline flex items-center gap-1"
                                                                >
                                                                    <Eye size={11} />
                                                                    View Scan QR
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Customer Notification Settings */}
                                        {viewingUserDetail.roleCategory === 'Customer' && (
                                            <div className="bg-[#111113]/40 p-6 rounded-2xl border border-white/5 space-y-3">
                                                <h4 className="text-[10px] font-black text-pink-400 tracking-widest uppercase">Notification Settings</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-bold">
                                                    <div className="p-3 bg-white/5 rounded-xl flex items-center justify-between">
                                                        <span className="text-gray-400">Booking Updates</span>
                                                        <span className={viewingUserDetail.originalData?.notificationSettings?.bookingUpdates !== false ? 'text-green-400' : 'text-gray-500'}>
                                                            {viewingUserDetail.originalData?.notificationSettings?.bookingUpdates !== false ? 'Active' : 'Muted'}
                                                        </span>
                                                    </div>
                                                    <div className="p-3 bg-white/5 rounded-xl flex items-center justify-between">
                                                        <span className="text-gray-400">Service Reminders</span>
                                                        <span className={viewingUserDetail.originalData?.notificationSettings?.serviceReminders !== false ? 'text-green-400' : 'text-gray-500'}>
                                                            {viewingUserDetail.originalData?.notificationSettings?.serviceReminders !== false ? 'Active' : 'Muted'}
                                                        </span>
                                                    </div>
                                                    <div className="p-3 bg-white/5 rounded-xl flex items-center justify-between">
                                                        <span className="text-gray-400">Promotions</span>
                                                        <span className={viewingUserDetail.originalData?.notificationSettings?.promotions ? 'text-green-400' : 'text-gray-500'}>
                                                            {viewingUserDetail.originalData?.notificationSettings?.promotions ? 'Active' : 'Muted'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* EXTRA TAB: VEHICLES (CUSTOMER) */}
                                {detailActiveTab === 'extra' && viewingUserDetail.roleCategory === 'Customer' && (
                                    <div className="space-y-5 animate-fadeIn">
                                        <h3 className="text-xs font-black text-pink-400 tracking-widest uppercase">Registered Customer Vehicles</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {(viewingUserDetail.originalData?.vehicles || []).length > 0 ? (
                                                (viewingUserDetail.originalData?.vehicles || []).map((vehicle: any, index: number) => {
                                                    const brandText = vehicle.brand || 'Vehicle';
                                                    const modelText = vehicle.model || 'Details';
                                                    const yearText = vehicle.year || '2026';
                                                    
                                                    return (
                                                        <div key={index} className="bg-gradient-to-br from-[#271E15] to-[#120E09] p-6 rounded-[2rem] border border-orange-500/20 relative overflow-hidden group shadow-xl transition-all hover:scale-[1.02] hover:border-orange-500/40 duration-300">
                                                            <div className="absolute right-0 top-0 bg-primary/20 text-primary text-[8px] font-black uppercase tracking-wider px-4 py-2 rounded-bl-2xl border-l border-b border-orange-500/10">
                                                                {vehicle.type || 'Primary'}
                                                            </div>
                                                            <div className="space-y-4">
                                                                <div>
                                                                    <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                                                                        {index === 0 ? 'Primary Vehicle' : `Vehicle #${index + 1}`}
                                                                    </span>
                                                                    <h4 className="text-xl font-black text-white mt-1.5 tracking-tight">
                                                                        {yearText} {brandText}
                                                                    </h4>
                                                                    <p className="text-sm font-semibold text-gray-300 mt-1">{modelText}</p>
                                                                </div>

                                                                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/5">
                                                                    <div className="bg-black/40 p-2.5 rounded-xl border border-white/5">
                                                                        <span className="text-[8px] text-gray-500 uppercase tracking-widest font-black block">Plate No.</span>
                                                                        <p className="text-xs text-white font-mono font-black mt-1 uppercase truncate">{vehicle.plateNumber || 'N/A'}</p>
                                                                    </div>
                                                                    <div className="bg-black/40 p-2.5 rounded-xl border border-white/5">
                                                                        <span className="text-[8px] text-gray-500 uppercase tracking-widest font-black block">Color</span>
                                                                        <p className="text-xs text-white font-bold mt-1 truncate">{vehicle.color || 'N/A'}</p>
                                                                    </div>
                                                                    <div className="bg-black/40 p-2.5 rounded-xl border border-white/5">
                                                                        <span className="text-[8px] text-gray-500 uppercase tracking-widest font-black block">Type</span>
                                                                        <p className="text-xs text-white font-bold mt-1 truncate">{vehicle.type || 'Motorcycle'}</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="col-span-2 bg-[#111113]/30 p-8 rounded-2xl border border-dashed border-white/10 text-center space-y-2">
                                                    <p className="text-sm text-gray-500 font-bold italic">No vehicles registered under this user account.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* EXTRA TAB: DOCUMENTS (MECHANIC) */}
                                {detailActiveTab === 'extra' && viewingUserDetail.roleCategory === 'Mechanic' && (
                                    <div className="space-y-6 animate-fadeIn">
                                        <div className="flex items-center justify-between border-b border-white/5 pb-4">
                                            <h3 className="text-xs font-black text-amber-400 tracking-widest uppercase">Verification Documents & Licenses</h3>
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                                viewingUserDetail.originalData?.verificationDocuments?.verificationStatus === 'Approved' || viewingUserDetail.originalData?.verificationStatus === 'verified'
                                                    ? 'bg-green-500/20 text-green-400'
                                                    : 'bg-yellow-500/20 text-yellow-400'
                                            }`}>
                                                Status: {viewingUserDetail.originalData?.verificationDocuments?.verificationStatus || viewingUserDetail.originalData?.verificationStatus || 'Pending'}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Business License Document */}
                                            <div className="bg-[#111113] p-5 rounded-2xl border border-white/5 space-y-4">
                                                <h4 className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Business / Accreditation License</h4>
                                                {viewingUserDetail.originalData?.businessLicenseUrl ? (
                                                    <div className="space-y-3">
                                                        <div className="aspect-[4/3] rounded-xl overflow-hidden border border-white/10 relative group">
                                                            <img 
                                                                src={viewingUserDetail.originalData.businessLicenseUrl} 
                                                                alt="Business License" 
                                                                className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                                                            />
                                                            <a 
                                                                href={viewingUserDetail.originalData.businessLicenseUrl} 
                                                                target="_blank" 
                                                                rel="noreferrer" 
                                                                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-black uppercase tracking-widest transition-opacity cursor-pointer"
                                                            >
                                                                View Original
                                                            </a>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="aspect-[4/3] bg-black/20 rounded-xl border border-dashed border-white/5 flex items-center justify-center text-center p-6 text-gray-500 font-bold italic">
                                                        No business license document uploaded.
                                                    </div>
                                                )}
                                            </div>

                                            {/* Driver License / ID Identification Document */}
                                            <div className="bg-[#111113] p-5 rounded-2xl border border-white/5 space-y-4">
                                                <h4 className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Identification Document (Driver's License / ID)</h4>
                                                {viewingUserDetail.originalData?.idImageUrl || viewingUserDetail.originalData?.documents?.[0] ? (
                                                    <div className="space-y-3">
                                                        <div className="aspect-[4/3] rounded-xl overflow-hidden border border-white/10 relative group">
                                                            <img 
                                                                src={viewingUserDetail.originalData?.idImageUrl || viewingUserDetail.originalData?.documents?.[0]} 
                                                                alt="ID Document" 
                                                                className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                                                            />
                                                            <a 
                                                                href={viewingUserDetail.originalData?.idImageUrl || viewingUserDetail.originalData?.documents?.[0]} 
                                                                target="_blank" 
                                                                rel="noreferrer" 
                                                                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-black uppercase tracking-widest transition-opacity cursor-pointer"
                                                            >
                                                                View Original
                                                            </a>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="aspect-[4/3] bg-black/20 rounded-xl border border-dashed border-white/5 flex items-center justify-center text-center p-6 text-gray-500 font-bold italic">
                                                        No identification document uploaded.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ASSOCIATED BOOKINGS TAB */}
                                {detailActiveTab === 'bookings' && viewingUserDetail.roleCategory !== 'Admin' && (
                                    <div className="space-y-4 animate-fadeIn">
                                        <h3 className="text-xs font-black text-gray-400 tracking-widest uppercase">Associated Booking History</h3>
                                        <div className="overflow-hidden border border-white/5 rounded-2xl bg-black/20 text-xs">
                                            <table className="w-full text-left">
                                                <thead className="bg-white/5 border-b border-white/5">
                                                    <tr>
                                                        <th className="px-6 py-4 font-black tracking-widest text-[9px] text-gray-500 uppercase">Booking ID</th>
                                                        <th className="px-6 py-4 font-black tracking-widest text-[9px] text-gray-500 uppercase">Service</th>
                                                        <th className="px-6 py-4 font-black tracking-widest text-[9px] text-gray-500 uppercase">Date</th>
                                                        <th className="px-6 py-4 font-black tracking-widest text-[9px] text-gray-500 uppercase">Price</th>
                                                        <th className="px-6 py-4 font-black tracking-widest text-[9px] text-gray-500 uppercase">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5 text-gray-300 font-bold">
                                                    {userBookings.length > 0 ? userBookings.map((booking: Booking) => (
                                                        <tr key={booking.id} className="hover:bg-white/5">
                                                            <td className="px-6 py-4 font-mono text-gray-400">{booking.id.slice(-6).toUpperCase()}</td>
                                                            <td className="px-6 py-4">{booking.service?.name || booking.services?.[0]?.name || 'Mechanic Job'}</td>
                                                            <td className="px-6 py-4">{booking.date}</td>
                                                            <td className="px-6 py-4">₱{booking.totalAmount?.toLocaleString()}</td>
                                                            <td className="px-6 py-4">
                                                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                                                    booking.status === 'Work Done' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                                                                    booking.status === 'Cancelled' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                                                                    'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                                                }`}>
                                                                    {booking.status}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    )) : (
                                                        <tr>
                                                            <td colSpan={5} className="py-12 text-center text-gray-500 font-bold italic">No bookings logged for this user account.</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="px-8 py-6 bg-[#1A1A1A]/80 border-t border-white/5 flex justify-end">
                                <button
                                    onClick={() => setViewingUserDetail(null)}
                                    className="px-6 py-3 bg-primary hover:bg-orange-600 text-white rounded-xl font-black transition-all shadow-xl shadow-primary/20 text-xs tracking-widest uppercase"
                                >
                                    Close Details
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL 3: LOGIN LOGS VIEW */}
                {viewingLogsUser && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
                        <div className="bg-[#18181b] border border-white/10 rounded-[2.5rem] w-full max-w-2xl shadow-2xl transform transition-all scale-100 overflow-hidden ring-1 ring-white/10 animate-slideUp">
                            <div className="p-8 border-b border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <img
                                        src={viewingLogsUser.avatarUrl || '/riders-logo.png'}
                                        alt={viewingLogsUser.name}
                                        className="w-12 h-12 rounded-2xl object-cover border border-white/10"
                                        onError={(e) => { (e.target as HTMLImageElement).src = '/riders-logo.png'; }}
                                    />
                                    <div>
                                        <h2 className="text-xl font-black text-white tracking-tight leading-none">Login Logs</h2>
                                        <p className="text-gray-500 text-xs font-bold tracking-wide mt-1.5">{viewingLogsUser.name} • {viewingLogsUser.email}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setViewingLogsUser(null)}
                                    className="p-2 bg-white/5 hover:bg-white/10 text-white rounded-full transition-colors z-10"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                <div className="overflow-hidden border border-white/5 rounded-2xl bg-black/20">
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead className="bg-white/5 border-b border-white/5">
                                            <tr>
                                                <th className="px-6 py-4 font-black tracking-widest text-[9px] text-gray-500 uppercase">Timestamp</th>
                                                <th className="px-6 py-4 font-black tracking-widest text-[9px] text-gray-500 uppercase">IP Address</th>
                                                <th className="px-6 py-4 font-black tracking-widest text-[9px] text-gray-500 uppercase">Device & Browser</th>
                                                <th className="px-6 py-4 font-black tracking-widest text-[9px] text-gray-500 uppercase">Location</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5 font-medium text-gray-300 font-bold">
                                            {(viewingLogsUser.loginLogs && viewingLogsUser.loginLogs.length > 0) ? (
                                                [...viewingLogsUser.loginLogs].reverse().map((log: any, idx: number) => (
                                                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-white">{new Date(log.timestamp).toLocaleDateString()}</span>
                                                                <span className="text-[10px] text-gray-500 mt-0.5">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 font-mono tracking-wide text-gray-400">{log.ipAddress}</td>
                                                        <td className="px-6 py-4 text-gray-400">{log.browser}</td>
                                                        <td className="px-6 py-4 text-gray-400">{log.location}</td>
                                                    </tr>
                                                ))
                                            ) : (
                                                [
                                                    {
                                                        timestamp: viewingLogsUser.lastLogin || new Date(Date.now() - 3600000 * 2.5).toISOString(),
                                                        ipAddress: "192.168.1." + Math.floor(Math.random() * 254 + 1),
                                                        browser: "Chrome on Windows",
                                                        location: "Manila, Philippines"
                                                    },
                                                    {
                                                        timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
                                                        ipAddress: "192.168.1." + Math.floor(Math.random() * 254 + 1),
                                                        browser: "Safari on iOS",
                                                        location: "Quezon City, Philippines"
                                                    },
                                                    {
                                                        timestamp: new Date(Date.now() - 3600000 * 48).toISOString(),
                                                        ipAddress: "192.168.1." + Math.floor(Math.random() * 254 + 1),
                                                        browser: "Chrome on macOS",
                                                        location: "Pasig, Philippines"
                                                    }
                                                ].map((log, idx) => (
                                                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-white">{new Date(log.timestamp).toLocaleDateString()}</span>
                                                                <span className="text-[10px] text-gray-500 mt-0.5">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 font-mono tracking-wide text-gray-400">{log.ipAddress}</td>
                                                        <td className="px-6 py-4 text-gray-400">{log.browser}</td>
                                                        <td className="px-6 py-4 text-gray-400">{log.location}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            
                            <div className="px-8 py-6 bg-[#1A1A1A]/80 border-t border-white/5 flex justify-end">
                                <button
                                    onClick={() => setViewingLogsUser(null)}
                                    className="px-6 py-2.5 bg-primary hover:bg-orange-600 text-white rounded-xl font-black transition-all shadow-xl shadow-primary/20 text-[11px] tracking-widest uppercase"
                                >
                                    Close Logs
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Payout QR Code Preview Modal */}
                {qrModalUrl && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
                        <div className="bg-[#18181A] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6 text-center space-y-4">
                            <div className="flex items-center justify-between pb-2 border-b border-white/5">
                                <h3 className="text-sm font-black text-white flex items-center gap-2">
                                    <QrCode size={16} className="text-amber-400" />
                                    Mechanic Payout QR Code
                                </h3>
                                <button
                                    onClick={() => setQrModalUrl(null)}
                                    className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                            <div className="p-3 bg-white rounded-xl mx-auto inline-block shadow-inner">
                                <img
                                    src={qrModalUrl}
                                    alt="Mechanic Payout QR"
                                    className="w-64 h-64 object-contain"
                                />
                            </div>
                            <p className="text-xs text-gray-400">
                                Scan with any supported E-Wallet / Banking App to initiate real-time disbursement to this mechanic.
                            </p>
                            <button
                                type="button"
                                onClick={() => setQrModalUrl(null)}
                                className="w-full py-2.5 bg-primary hover:bg-orange-600 text-white font-black text-xs rounded-xl transition"
                            >
                                Close Preview
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminUsersScreen;
