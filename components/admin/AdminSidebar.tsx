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
                { path: '/admin-portal/payment-audit', name: 'Payment Audit', icon: ShieldCheck, module: 'gcash-payments' },
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
                className={`fixed top-0 left-0 z-50 h-screen bg-[#151517] border-r border-white/5 flex flex-col items-center transition-all duration-300 shadow-2xl
                    ${isCollapsed ? 'w-20' : 'w-64'}
                    ${isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'}
                `}
            >
                {/* Header / Logo Section */}
                <div className="h-24 w-full flex items-center justify-center relative flex-shrink-0 px-3 border-b border-white/5">
                    {showFullMenu ? (
                        <div className="w-full flex flex-col items-center justify-center">
                            {logoUrl ? (
                                <img src={logoUrl} alt="RidersBUD Logo" className="w-full h-12 object-contain mix-blend-screen mb-1" />
                            ) : (
                                <div className="w-11 h-11 bg-primary rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-primary/20">R</div>
                            )}
                            <p className="text-[10px] text-gray-400 whitespace-nowrap overflow-hidden text-ellipsis max-w-full text-center tracking-wider">
                                Trusted Car Care Wherever You Are
                            </p>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center relative w-full">
                            {/* Circular Badge as seen in reference image */}
                            <div className="relative group/logo">
                                {compactLogoUrl ? (
                                    <div className="w-12 h-12 rounded-full p-0.5 bg-gradient-to-tr from-[#FE7803] to-[#FF9E42] shadow-[0_0_15px_rgba(254,120,3,0.35)] flex items-center justify-center overflow-hidden">
                                        <img src={compactLogoUrl} alt="Logo" className="w-full h-full object-cover rounded-full bg-black" />
                                    </div>
                                ) : (
                                    <div className="w-12 h-12 rounded-full p-0.5 bg-gradient-to-tr from-[#FE7803] to-[#FF9E42] shadow-[0_0_15px_rgba(254,120,3,0.35)] flex items-center justify-center">
                                        <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                                            <span className="text-white font-black text-sm tracking-tighter">
                                                <span className="text-[#FE7803]">R</span>B
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Chevron Toggle Button directly on top-right in collapsed mode */}
                            <button
                                onClick={() => setIsCollapsed(!isCollapsed)}
                                className="hidden lg:flex absolute -right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#1f1f23] border border-white/10 rounded-full items-center justify-center text-gray-400 hover:text-white hover:bg-primary/20 hover:border-primary/40 transition-all z-50 shadow-lg"
                                title="Expand Sidebar"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    )}

                    <button onClick={onClose} className="absolute right-4 top-1/2 -translate-y-1/2 lg:hidden text-gray-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>

                    {/* Expand/Collapse Toggle Button (Desktop Full Menu Mode) */}
                    {showFullMenu && (
                        <button
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#1f1f23] border border-white/10 rounded-full items-center justify-center text-gray-400 hover:text-white hover:border-primary/40 transition-all z-50 shadow-lg"
                            title="Collapse Sidebar"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* Navigation Menu */}
                <nav className="flex-1 w-full px-2.5 space-y-3 overflow-y-auto custom-scrollbar py-3">
                    {filteredSections.map((section, idx) => (
                        <div key={section.title} className="space-y-1">
                            {idx > 0 && (
                                <div className="py-1">
                                    <div className="h-px bg-white/5 mx-2" />
                                </div>
                            )}
                            {showFullMenu && (
                                <p className="px-3.5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1.5 transition-all">
                                    {section.title}
                                </p>
                            )}
                            <div className="space-y-1.5 flex flex-col items-center w-full">
                                {section.items.map((item) => {
                                    const isActive = location.pathname.startsWith(item.path);
                                    const Icon = item.icon;

                                    const linkContent = (
                                        <NavLink
                                            key={item.path}
                                            to={item.path}
                                            className={({ isActive }) => `
                                                relative flex items-center transition-all duration-200 group
                                                ${showFullMenu
                                                    ? 'w-full py-2.5 px-3.5 rounded-xl justify-start text-sm'
                                                    : 'w-11 h-11 rounded-full justify-center mx-auto'
                                                }
                                                ${isActive
                                                    ? 'bg-[#FE7803]/15 border border-[#FE7803]/40 text-[#FE7803] font-bold shadow-[0_0_15px_rgba(254,120,3,0.25)] ring-1 ring-[#FE7803]/20'
                                                    : 'border border-transparent text-gray-400 hover:text-white hover:bg-white/5 hover:border-white/5'
                                                }
                                            `}
                                            onClick={() => window.innerWidth < 1024 && onClose()}
                                        >
                                            {/* Glowing Active Pill Indicator (in full menu) or subtle left edge bar */}
                                            {isActive && showFullMenu && (
                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 bg-[#FE7803] w-1.5 h-6 rounded-r-full shadow-[0_0_12px_#FE7803]" />
                                            )}

                                            <div className="relative flex items-center justify-center">
                                                <Icon
                                                    size={showFullMenu ? 20 : 22}
                                                    className={`shrink-0 transition-transform duration-300 group-hover:scale-110 ${
                                                        isActive ? 'text-[#FE7803]' : 'text-gray-400 group-hover:text-white'
                                                    }`}
                                                />
                                                
                                                {/* Collapsed Badge overlay */}
                                                {!showFullMenu && item.badge !== undefined && item.badge > 0 && (
                                                    <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] font-black min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center shadow-lg shadow-red-500/50">
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
                                                        <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full ml-2 shadow-sm">
                                                            {item.badge}
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                        </NavLink>
                                    );

                                    return !showFullMenu ? (
                                        <div key={item.path} className="w-full flex justify-center">
                                            <Tooltip
                                                content={
                                                    <div className="flex items-center gap-2">
                                                        <span>{item.name}</span>
                                                        {item.badge !== undefined && item.badge > 0 && (
                                                            <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                                                                {item.badge}
                                                            </span>
                                                        )}
                                                    </div>
                                                }
                                                position="right"
                                                delay={100}
                                                className="w-auto flex justify-center"
                                            >
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
                <div className="w-full p-3 border-t border-white/5 flex flex-col items-center">
                    {showFullMenu ? (
                        <button
                            onClick={logout}
                            className="w-full flex items-center p-3 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all group justify-start border border-transparent hover:border-red-500/20"
                        >
                            <LogOut size={22} className="shrink-0 transition-transform group-hover:-translate-x-1" />
                            <span className="ml-3 font-medium text-sm whitespace-nowrap">
                                Sign Out
                            </span>
                        </button>
                    ) : (
                        <Tooltip content="Sign Out" position="right" delay={100}>
                            <button
                                onClick={logout}
                                className="w-11 h-11 flex items-center justify-center rounded-full text-red-400 hover:text-red-300 hover:bg-red-500/15 border border-transparent hover:border-red-500/25 transition-all group shadow-sm"
                                aria-label="Sign Out"
                            >
                                <LogOut size={20} className="shrink-0 transition-transform group-hover:scale-110" />
                            </button>
                        </Tooltip>
                    )}
                </div>
            </aside>
        </>
    );
};

export default React.memo(AdminSidebar);
