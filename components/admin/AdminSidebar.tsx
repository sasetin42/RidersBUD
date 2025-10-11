import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useDatabase } from '../../context/DatabaseContext';
import Spinner from '../Spinner';

const NavItem: React.FC<{ to: string; icon: React.ReactNode; label: string; isCollapsed: boolean; }> = ({ to, icon, label, isCollapsed }) => {
    const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
        `flex items-center px-4 py-3 text-sm font-medium transition-colors duration-200 rounded-lg ${
            isActive ? 'bg-primary text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'
        } ${isCollapsed ? 'justify-center' : ''}`;

    return (
        <div className="relative group">
            <NavLink to={to} className={navLinkClasses}>
                {icon}
                <span className={`ml-3 whitespace-nowrap transition-opacity duration-200 ${isCollapsed ? 'opacity-0 sr-only' : 'opacity-100'}`}>
                    {label}
                </span>
            </NavLink>
            {isCollapsed && (
                <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 w-max px-2 py-1 bg-secondary text-white text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-50">
                    {label}
                </div>
            )}
        </div>
    );
};

interface AdminSidebarProps {
    isCollapsed: boolean;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ isCollapsed }) => {
    const { logout } = useAdminAuth();
    const { db } = useDatabase();

    if (!db) {
        return <aside className={`bg-secondary text-white flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'} items-center justify-center`}><Spinner /></aside>;
    }

    const { settings } = db;
    const logoUrl = settings.adminSidebarLogoUrl || settings.appLogoUrl || "https://storage.googleapis.com/aistudio-hosting/generative-ai/e499715a-a38f-4d32-80f2-9b2512f7a6b2/assets/RidersBUD_logo.png";

    return (
        <aside className={`bg-secondary text-white flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'}`}>
            <div className={`flex flex-col items-center border-b border-dark-gray transition-all duration-300 ${isCollapsed ? 'p-4' : 'p-6'}`}>
                <img
                    src={logoUrl}
                    alt="RidersBUD Admin Logo"
                    className={`transition-all duration-300 ${isCollapsed ? 'w-10' : 'w-16'} mb-2`}
                />
                <div className={`text-center transition-all duration-200 overflow-hidden ${isCollapsed ? 'opacity-0 h-0' : 'opacity-100 h-auto'}`}>
                    <h1 className="text-xl font-bold text-white whitespace-nowrap">{settings.appName || 'RidersBud'}</h1>
                    <p className="text-xs text-light-gray whitespace-nowrap">{settings.adminPanelTitle || 'Admin Panel'}</p>
                </div>
            </div>
            <nav className="flex-1 p-4 space-y-2">
                <NavItem to="/admin/dashboard" isCollapsed={isCollapsed} label="Dashboard" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>} />
                <NavItem to="/admin/analytics" isCollapsed={isCollapsed} label="Analytics" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" /></svg>} />
                <NavItem to="/admin/bookings" isCollapsed={isCollapsed} label="Bookings" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>} />
                <NavItem to="/admin/catalog" isCollapsed={isCollapsed} label="Catalog" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>} />
                <NavItem to="/admin/mechanics" isCollapsed={isCollapsed} label="Mechanics" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" /></svg>} />
                <NavItem to="/admin/customers" isCollapsed={isCollapsed} label="Customers" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>} />
                <NavItem to="/admin/marketing" isCollapsed={isCollapsed} label="Marketing" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" /></svg>} />
                <NavItem to="/admin/settings" isCollapsed={isCollapsed} label="Settings" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.01 3.05C10.511 2 9.49 2 9 3.05a1.5 1.5 0 01-2.43 1.202c-1.159-.578-2.525.43-2.235 1.737A1.5 1.5 0 012.8 7.84c-1.01.628-1.01 2.21 0 2.838a1.5 1.5 0 011.535 1.765c.29 1.308-1.076 2.315-2.235 1.737A1.5 1.5 0 019 16.95c.49 1.05 1.51 1.05 2 0a1.5 1.5 0 012.43-1.202c1.159.578 2.525-.43 2.235-1.737a1.5 1.5 0 011.535-1.765c1.01-.628 1.01-2.21 0-2.838a1.5 1.5 0 01-1.535-1.765c-.29-1.308 1.076-2.315 2.235-1.737A1.5 1.5 0 0111.01 3.05zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/></svg>} />
            </nav>
            <div className="mt-auto">
                <div className={`p-4 border-t border-dark-gray transition-all duration-300 ${isCollapsed ? 'h-24' : 'h-auto'}`}>
                    <div className={`flex items-center ${isCollapsed ? 'justify-center' : ''}`}>
                        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center font-bold text-white text-lg flex-shrink-0">
                            A
                        </div>
                        <div className={`ml-3 transition-opacity duration-200 overflow-hidden ${isCollapsed ? 'opacity-0 sr-only' : 'opacity-100'}`}>
                            <p className="text-sm font-semibold text-white whitespace-nowrap">Admin User</p>
                            <button onClick={logout} className="text-xs text-light-gray hover:text-primary transition-colors whitespace-nowrap">Logout</button>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default AdminSidebar;