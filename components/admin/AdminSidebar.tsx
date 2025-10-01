import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { getSettings } from '../../data/mockData';

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
    const settings = getSettings();
    const logoUrl = settings.sidebarLogoUrl || "https://storage.googleapis.com/aistudio-hosting/generative-ai/e499715a-a38f-4d32-80f2-9b2512f7a6b2/assets/RidersBUD_logo.png";

    return (
        <aside className={`bg-secondary text-white flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'}`}>
            <div className={`flex flex-col items-center border-b border-dark-gray transition-all duration-300 ${isCollapsed ? 'p-4' : 'p-6'}`}>
                <img
                    src={logoUrl}
                    alt="RidersBUD Logo"
                    className="w-16 mb-2"
                />
                <div className={`text-center transition-all duration-200 overflow-hidden ${isCollapsed ? 'opacity-0 h-0' : 'opacity-100 h-auto'}`}>
                    <h1 className="text-xl font-bold text-white whitespace-nowrap">{settings.appName || 'RidersBud'}</h1>
                    <p className="text-xs text-light-gray whitespace-nowrap">Admin Panel</p>
                </div>
            </div>
            <nav className="flex-1 p-4 space-y-2">
                <NavItem to="/admin/dashboard" isCollapsed={isCollapsed} label="Dashboard" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>} />
                <NavItem to="/admin/analytics" isCollapsed={isCollapsed} label="Analytics" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" /></svg>} />
                <NavItem to="/admin/bookings" isCollapsed={isCollapsed} label="Bookings" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>} />
                <NavItem to="/admin/mechanics" isCollapsed={isCollapsed} label="Mechanics" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" /></svg>} />
                <NavItem to="/admin/customers" isCollapsed={isCollapsed} label="Customers" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>} />
                <NavItem to="/admin/services" isCollapsed={isCollapsed} label="Services" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.532 1.532 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.532 1.532 0 01.947-2.287c1.561-.379-1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>} />
                <NavItem to="/admin/settings" isCollapsed={isCollapsed} label="Settings" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>} />
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