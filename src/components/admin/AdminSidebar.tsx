import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useDatabase } from '../../context/DatabaseContext';
import Spinner from '../Spinner';

const NavItem: React.FC<{ to: string; icon: React.ReactNode; label: string; isCollapsed: boolean; }> = ({ to, icon, label, isCollapsed }) => {
    return (
        <div className="relative group mb-2">
            <NavLink to={to} className={({ isActive }) => `
                relative flex items-center p-3 rounded-xl transition-all duration-300 overflow-hidden
                ${isActive
                    ? 'bg-gradient-to-r from-admin-accent/20 to-transparent text-admin-accent shadow-[0_0_15px_rgba(249,115,22,0.1)] border-l-4 border-admin-accent'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }
                ${isCollapsed ? 'justify-center' : ''}
            `}>
                <div className={`relative z-10 transition-transform duration-300 group-hover:scale-110`}>
                    {icon}
                </div>
                {!isCollapsed && (
                    <span className="ml-4 font-medium tracking-wide whitespace-nowrap relative z-10">
                        {label}
                    </span>
                )}

                {/* Hover Glow Effect */}
                <div className="absolute inset-0 bg-admin-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />
            </NavLink>

            {/* Tooltip for collapsed state */}
            {isCollapsed && (
                <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 px-4 py-2 bg-[#171618] text-white text-xs font-medium rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-[-10px] group-hover:translate-x-0 pointer-events-none z-50 border border-white/10 whitespace-nowrap">
                    {label}
                    <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-[#171618] rotate-45 border-l border-b border-white/10"></div>
                </div>
            )}
        </div>
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
            <aside className={`fixed lg:relative bg-admin-sidebar flex-shrink-0 transition-all duration-300 ease-in-out w-64 lg:w-auto ${isCollapsed ? 'lg:w-20' : 'lg:w-64'} flex items-center justify-center`}>
                <Spinner />
            </aside>
        );
    }

    const { settings } = db;
    const logoUrl = settings.adminSidebarLogoUrl || "https://storage.googleapis.com/aistudio-hosting/generative-ai/e499715a-a38f-4d32-80f2-9b2512f7a6b2/assets/RidersBUD_icon.png";

    return (
        <>
            {/* Backdrop for mobile overlay */}
            <div
                className={`fixed inset-0 bg-black/60 z-30 lg:hidden transition-opacity ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
                aria-hidden="true"
            ></div>

            <aside className={`fixed top-0 left-0 h-full bg-admin-sidebar flex-shrink-0 flex flex-col z-40 transition-all duration-300 ease-in-out border-r border-admin-border 
                lg:w-64 
                ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full lg:w-20 lg:translate-x-0'}
            `}>
                {/* Logo Section */}
                <div className={`flex items-center justify-center h-20 border-b border-admin-border flex-shrink-0 ${isCollapsed ? 'px-4' : 'px-6'}`}>
                    <img src={logoUrl} alt="Logo" className={`transition-all duration-300 ${isCollapsed ? 'w-8 h-8' : 'w-10 h-10'}`} />
                    {!isCollapsed && <span className="text-xl font-bold ml-3 whitespace-nowrap">{settings.appName}</span>}
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-4 overflow-y-auto">
                    <NavItem to="/admin/dashboard" isCollapsed={isCollapsed} label="Dashboard" icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>} />
                    <NavItem to="/admin/analytics" isCollapsed={isCollapsed} label="Analytics" icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>} />
                    <NavItem to="/admin/bookings" isCollapsed={isCollapsed} label="Bookings" icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>} />
                    <NavItem to="/admin/orders" isCollapsed={isCollapsed} label="Orders" icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>} />
                    <NavItem to="/admin/payouts" isCollapsed={isCollapsed} label="Payouts" icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} />
                    <NavItem to="/admin/catalog" isCollapsed={isCollapsed} label="Services" icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>} />
                    <NavItem to="/admin/mechanics" isCollapsed={isCollapsed} label="Mechanics" icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21V9a4 4 0 00-4-4H9" /></svg>} />
                    <NavItem to="/admin/customers" isCollapsed={isCollapsed} label="Customers" icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>} />
                    <NavItem to="/admin/marketing" isCollapsed={isCollapsed} label="Marketing" icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-2.236 9.168-5.5" /></svg>} />
                    <NavItem to="/admin/users" isCollapsed={isCollapsed} label="Users & Roles" icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} />
                    <NavItem to="/admin/settings" isCollapsed={isCollapsed} label="Settings" icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} />
                </nav>

                {/* User Profile Section */}
                <div className="mt-auto border-t border-admin-border p-3">
                    <div className="flex items-center">
                        <div className="w-10 h-10 bg-admin-accent rounded-full flex items-center justify-center font-bold text-white text-lg flex-shrink-0">
                            A
                        </div>
                        {!isCollapsed && (
                            <div className="ml-3">
                                <p className="text-sm font-semibold text-admin-text-primary">Admin User</p>
                                <button onClick={logout} className="text-xs text-admin-text-secondary hover:text-red-400">Logout</button>
                            </div>
                        )}
                    </div>
                </div>
            </aside>
        </>
    );
};

export default AdminSidebar;