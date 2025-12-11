import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useDatabase } from '../../context/DatabaseContext';
import Spinner from '../Spinner';
import {
    LayoutDashboard,
    TrendingUp,
    Calendar,
    ShoppingCart,
    CreditCard,
    Package,
    Wrench,
    Users,
    Megaphone,
    ShieldCheck,
    Settings,
    LogOut
} from 'lucide-react';

const NavItem: React.FC<{ to: string; icon: React.ReactNode; label: string; isCollapsed: boolean; }> = ({ to, icon, label, isCollapsed }) => {
    return (
        <NavLink
            to={to}
            className={({ isActive }) => `
                flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden
                ${isActive
                    ? 'bg-gradient-to-r from-primary/20 to-orange-600/10 text-primary font-bold shadow-[0_0_15px_rgba(234,88,12,0.3)] border border-primary/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'}
                ${isCollapsed ? 'justify-center' : ''}
            `}
        >
            <div className={`relative z-10 transition-transform duration-300 group-hover:scale-110`}>
                {icon}
            </div>

            {!isCollapsed && (
                <span className="relative z-10 text-sm whitespace-nowrap transition-all duration-300">
                    {label}
                </span>
            )}

            {/* Hover Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            {/* Active Indicator Bar */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 bg-primary transition-all duration-300 ${isCollapsed ? '' : 'rounded-r-full'} ${({ isActive }: { isActive: boolean }) => isActive ? 'opacity-100' : 'opacity-0'}`} />
        </NavLink>
    );
};

interface AdminSidebarProps {
    isSidebarOpen: boolean;
    onClose: () => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ isSidebarOpen, onClose }) => {
    const { logout } = useAdminAuth();
    const { db } = useDatabase();

    // In desktop view, the sidebar is "collapsed" when it's not "open"
    const isCollapsed = !isSidebarOpen;

    if (!db) {
        return (
            <aside className={`fixed lg:relative bg-[#0a0a0a] flex-shrink-0 transition-all duration-300 ease-in-out w-64 lg:w-auto ${isCollapsed ? 'lg:w-20' : 'lg:w-64'} flex items-center justify-center border-r border-white/5`}>
                <Spinner />
            </aside>
        );
    }

    const { settings } = db;
    const logoUrl = settings.appLogoUrl || "https://storage.googleapis.com/aistudio-hosting/generative-ai/e499715a-a38f-4d32-80f2-9b2512f7a6b2/assets/RidersBUD_icon.png";

    return (
        <>
            {/* Backdrop for mobile overlay */}
            <div
                className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
                aria-hidden="true"
            ></div>

            <aside className={`fixed top-0 left-0 h-full bg-[#0a0a0a]/95 backdrop-blur-2xl flex-shrink-0 flex flex-col z-50 transition-all duration-300 ease-in-out border-r border-white/5 shadow-2xl
                lg:w-64 
                ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full lg:w-20 lg:translate-x-0'}
            `}>
                {/* Logo Section */}
                <div className={`flex items-center justify-center h-24 flex-shrink-0 transition-all duration-300 ${isCollapsed ? 'px-2' : 'px-6'}`}>
                    <div className="relative group cursor-pointer">
                        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-50 group-hover:opacity-100 transition-opacity"></div>
                        <img src={logoUrl} alt="Logo" className={`relative transition-all duration-300 object-contain drop-shadow-2xl ${isCollapsed ? 'w-10 h-10' : 'w-12 h-12'}`} />
                    </div>
                    {!isCollapsed && (
                        <div className="ml-3 animate-fadeIn">
                            <h1 className="text-xl font-bold text-white tracking-tight leading-none">Riders<span className="text-primary">BUD</span></h1>
                            <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">Admin Panel</p>
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-1 custom-scrollbar">
                    <p className={`text-[10px] font-bold text-gray-500 uppercase tracking-wider px-3 mb-2 transition-opacity ${isCollapsed ? 'opacity-0 hidden' : 'opacity-100'}`}>Overview</p>
                    <NavItem to="/admin/dashboard" isCollapsed={isCollapsed} label="Dashboard" icon={<LayoutDashboard size={20} />} />
                    <NavItem to="/admin/analytics" isCollapsed={isCollapsed} label="Analytics" icon={<TrendingUp size={20} />} />

                    <div className="my-4 border-t border-white/5" />
                    <p className={`text-[10px] font-bold text-gray-500 uppercase tracking-wider px-3 mb-2 transition-opacity ${isCollapsed ? 'opacity-0 hidden' : 'opacity-100'}`}>Management</p>

                    <NavItem to="/admin/bookings" isCollapsed={isCollapsed} label="Bookings" icon={<Calendar size={20} />} />
                    <NavItem to="/admin/orders" isCollapsed={isCollapsed} label="Orders" icon={<ShoppingCart size={20} />} />
                    <NavItem to="/admin/payouts" isCollapsed={isCollapsed} label="Payouts" icon={<CreditCard size={20} />} />
                    <NavItem to="/admin/catalog" isCollapsed={isCollapsed} label="Catalog" icon={<Package size={20} />} />
                    <NavItem to="/admin/mechanics" isCollapsed={isCollapsed} label="Mechanics" icon={<Wrench size={20} />} />
                    <NavItem to="/admin/customers" isCollapsed={isCollapsed} label="Customers" icon={<Users size={20} />} />

                    <div className="my-4 border-t border-white/5" />
                    <p className={`text-[10px] font-bold text-gray-500 uppercase tracking-wider px-3 mb-2 transition-opacity ${isCollapsed ? 'opacity-0 hidden' : 'opacity-100'}`}>System</p>

                    <NavItem to="/admin/marketing" isCollapsed={isCollapsed} label="Marketing" icon={<Megaphone size={20} />} />
                    <NavItem to="/admin/users" isCollapsed={isCollapsed} label="Users & Roles" icon={<ShieldCheck size={20} />} />
                    <NavItem to="/admin/settings" isCollapsed={isCollapsed} label="Settings" icon={<Settings size={20} />} />
                </nav>

                {/* User Profile Section */}
                <div className="mt-auto border-t border-white/5 p-4 bg-white/5 backdrop-blur-md">
                    <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-orange-700 flex items-center justify-center font-bold text-white shadow-lg ring-2 ring-white/10 flex-shrink-0">
                                A
                            </div>
                            {!isCollapsed && (
                                <div className="transition-all duration-300">
                                    <p className="text-sm font-bold text-white truncate">Admin User</p>
                                    <p className="text-xs text-primary truncate">Super Admin</p>
                                </div>
                            )}
                        </div>

                        {!isCollapsed && (
                            <button
                                onClick={logout}
                                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all hover:rotate-90"
                                title="Logout"
                            >
                                <LogOut size={18} />
                            </button>
                        )}
                    </div>
                </div>
            </aside>
        </>
    );
};

export default AdminSidebar;