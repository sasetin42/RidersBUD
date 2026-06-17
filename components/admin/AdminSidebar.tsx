import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    CalendarClock,
    Wrench,
    Users,
    ShoppingBag,
    CreditCard,
    BarChart3,
    Megaphone,
    Settings,
    ShieldCheck,
    Package,
    X,
    LogOut,
    Banknote,
    MessageCircle,
    Heart,
    Bell
} from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useDatabase } from '../../context/DatabaseContext';
import { AdminModule } from '../../types';
import Tooltip from '../ui/Tooltip';

interface AdminSidebarProps {
    isSidebarOpen: boolean;
    onClose: () => void;
    isCollapsed: boolean;
    setIsCollapsed: (collapsed: boolean) => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ isSidebarOpen, onClose, isCollapsed, setIsCollapsed }) => {
    const { logout, totalUnreadChats, adminUser } = useAdminAuth();
    const location = useLocation();
    const { db } = useDatabase();

    const menuSections: {
        title: string;
        items: { path: string; name: string; icon: any; badge?: number; module: AdminModule }[];
    }[] = [
        {
            title: 'Core',
            items: [
                { path: '/admin-portal/dashboard', name: 'Dashboard', icon: LayoutDashboard, module: 'dashboard' },
                { path: '/admin-portal/analytics', name: 'Analytics', icon: BarChart3, module: 'analytics' },
                { path: '/admin-portal/notifications', name: 'Notifications', icon: Bell, module: 'notifications' },
                { path: '/admin-portal/users', name: 'Management', icon: ShieldCheck, module: 'users' },
                { path: '/admin-portal/settings', name: 'Settings', icon: Settings, module: 'settings' },
            ]
        },
        {
            title: 'Operations',
            items: [
                { path: '/admin-portal/bookings', name: 'Bookings', icon: CalendarClock, module: 'bookings' },
                { path: '/admin-portal/mechanics', name: 'Mechanics', icon: Wrench, module: 'mechanics' },
                { path: '/admin-portal/customers', name: 'Customers', icon: Users, module: 'customers' },
                { path: '/admin-portal/chat', name: 'Live Chat', icon: MessageCircle, badge: totalUnreadChats, module: 'chat' },
                { path: '/admin-portal/satisfaction', name: 'Satisfaction', icon: Heart, module: 'chat' },
            ]
        },
        {
            title: 'Commerce',
            items: [
                { path: '/admin-portal/catalog', name: 'Service Catalog', icon: Package, module: 'catalog' },
                { path: '/admin-portal/orders', name: 'Orders', icon: ShoppingBag, module: 'orders' },
                { path: '/admin-portal/payouts', name: 'Payouts', icon: CreditCard, module: 'payouts' },
                { path: '/admin-portal/gcash-payments', name: 'GCash Payments', icon: CreditCard, module: 'gcash-payments' },
                { path: '/admin-portal/monetization', name: 'Monetization', icon: Banknote, module: 'monetization' },
            ]
        },
        {
            title: 'Growth',
            items: [
                { path: '/admin-portal/marketing', name: 'Marketing', icon: Megaphone, module: 'marketing' },
            ]
        }
    ];

    const filteredSections = menuSections.map(section => ({
        ...section,
        items: section.items.filter(item => {
            if (!adminUser) return false;
            if (adminUser.role === 'Super Admin') return true;
            return adminUser.permissions?.[item.module] !== 'none';
        })
    })).filter(section => section.items.length > 0);

    const appName = db?.settings.appName || 'Riders';
    const logoUrl = db?.settings.adminSidebarLogoUrl || db?.settings.adminPanelLogoUrl || db?.settings.appLogoUrl || '/riders-logo.png';
    const compactLogoUrl = db?.settings.sidebarLogoUrl;

    // Show full layout contents if either not collapsed or overlay is active on mobile
    const showFullMenu = !isCollapsed || isSidebarOpen;

    return (
        <>
            {/* Mobile Overlay */}
            <div
                className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                onClick={onClose}
            />

            {/* Sidebar Container */}
            <aside
                className={`fixed top-0 left-0 z-50 h-screen bg-[#1A1A1A] border-r border-white/5 flex flex-col items-center transition-all duration-300
                    ${isCollapsed ? 'w-20' : 'w-64'}
                    ${isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'}
                `}
            >
                {/* Header / Logo */}
                <div className="h-28 w-full flex flex-col items-center justify-center relative flex-shrink-0 px-4">
                    {showFullMenu ? (
                        <div className="w-full flex flex-col items-center justify-center">
                            {logoUrl ? (
                                <img src={logoUrl} alt="RidersBUD Logo" className="w-full h-14 object-contain mix-blend-screen mb-1" />
                            ) : (
                                <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-primary/20">R</div>
                            )}
                            <p className="text-[10px] text-gray-500 whitespace-nowrap overflow-hidden text-ellipsis max-w-full text-center">
                                Trusted Car Care Wherever You Are
                            </p>
                        </div>
                    ) : (
                        compactLogoUrl ? (
                            <img src={compactLogoUrl} alt="Logo" className="w-10 h-10 object-contain rounded-xl" />
                        ) : (
                            <div className="w-10 h-10 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center text-primary font-black text-base shadow-lg shadow-primary/5">
                                RB
                            </div>
                        )
                    )}

                    <button onClick={onClose} className="absolute right-4 top-1/2 -translate-y-1/2 lg:hidden text-gray-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>

                    {/* Collapse Toggle Button (Desktop Only) */}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="hidden lg:flex absolute -right-3 top-10 w-6 h-6 bg-[#1A1A1A] border border-white/10 rounded-full items-center justify-center text-gray-400 hover:text-white hover:border-white/20 transition-all z-50 shadow-md"
                        title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                    >
                        {isCollapsed ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                            </svg>
                        )}
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 w-full px-3 space-y-4 overflow-y-auto custom-scrollbar py-4">
                    {filteredSections.map((section, idx) => (
                        <div key={section.title} className="space-y-1.5">
                            {idx > 0 && <div className="border-t border-white/5 my-3 mx-2" />}
                            {showFullMenu && (
                                <p className="px-4 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2 transition-all">
                                    {section.title}
                                </p>
                            )}
                            <div className="space-y-1">
                                {section.items.map((item) => {
                                    const isActive = location.pathname.startsWith(item.path);
                                    const Icon = item.icon;

                                    const linkContent = (
                                        <NavLink
                                            key={item.path}
                                            to={item.path}
                                            className={({ isActive }) => `
                                                relative flex items-center py-3 rounded-xl transition-all duration-300 group border w-full
                                                ${showFullMenu ? 'justify-start pl-4 pr-3' : 'justify-center'}
                                                ${isActive
                                                    ? 'bg-primary/10 border-primary/20 text-primary font-bold shadow-[0_0_15px_rgba(249,115,22,0.05)]'
                                                    : 'border-transparent text-gray-400 hover:bg-white/5 hover:text-white'
                                                }
                                            `}
                                            onClick={() => window.innerWidth < 1024 && onClose()}
                                        >
                                            {isActive && (
                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full shadow-[0_0_10px_rgba(249,115,22,1)]" />
                                            )}

                                            <div className="relative flex items-center justify-center">
                                                <Icon size={20} className="shrink-0 transition-transform duration-300 group-hover:scale-110" />
                                                
                                                {/* Collapsed Badge overlay */}
                                                {!showFullMenu && item.badge !== undefined && item.badge > 0 && (
                                                    <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                                                        {item.badge}
                                                    </span>
                                                )}
                                            </div>

                                            {showFullMenu && (
                                                <>
                                                    <span className="ml-3 font-medium whitespace-nowrap overflow-hidden flex-1 text-sm">
                                                        {item.name}
                                                    </span>

                                                    {item.badge !== undefined && item.badge > 0 && (
                                                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full ml-2">
                                                            {item.badge}
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                        </NavLink>
                                    );

                                    return !showFullMenu ? (
                                        <div key={item.path} className="w-full block">
                                            <Tooltip content={item.name} position="right" className="w-full flex">
                                                {linkContent}
                                            </Tooltip>
                                        </div>
                                    ) : (
                                        linkContent
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* Footer / Logout */}
                <div className="w-full p-4 border-t border-white/5">
                    {showFullMenu ? (
                        <button
                            onClick={logout}
                            className="w-full flex items-center p-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors group justify-start"
                        >
                            <LogOut size={22} className="shrink-0" />
                            <span className="ml-3 font-medium text-sm whitespace-nowrap">
                                Sign Out
                            </span>
                        </button>
                    ) : (
                        <Tooltip content="Sign Out" position="right">
                            <button
                                onClick={logout}
                                className="w-full flex items-center justify-center p-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors group"
                            >
                                <LogOut size={22} className="shrink-0" />
                            </button>
                        </Tooltip>
                    )}
                </div>
            </aside>
        </>
    );
};

export default React.memo(AdminSidebar);
