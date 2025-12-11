import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Briefcase, CheckSquare, Wallet, User } from 'lucide-react';

const MechanicBottomNav: React.FC = () => {
    const location = useLocation();

    // Only show on mechanic routes
    // Ensure this covers all main mechanic screens
    if (!location.pathname.startsWith('/mechanic')) return null;

    const navItems = [
        { path: '/mechanic/dashboard', label: 'Home', icon: LayoutDashboard },
        { path: '/mechanic/jobs', label: 'Jobs', icon: Briefcase },
        { path: '/mechanic/tasks', label: 'Tasks', icon: CheckSquare },
        { path: '/mechanic/earnings', label: 'Earnings', icon: Wallet },
        { path: '/mechanic/profile', label: 'Profile', icon: User },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pointer-events-none">
            <nav className="pointer-events-auto max-w-lg mx-auto bg-[#1A1A1A]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.5)] flex items-center justify-around h-[70px] px-2 relative overflow-hidden">
                {/* Background Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />

                {navItems.map((item) => {
                    const isLinkActive = location.pathname.startsWith(item.path);
                    const Icon = item.icon;

                    return (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={`
                                relative flex flex-col items-center justify-center w-full h-full gap-1 transition-all duration-300 group
                                ${isLinkActive ? 'text-primary' : 'text-gray-500 hover:text-gray-300'}
                            `}
                        >
                            <div className={`relative p-1.5 rounded-xl transition-all duration-300 ${isLinkActive ? 'bg-primary/10 -translate-y-1' : 'group-hover:-translate-y-0.5'}`}>
                                <Icon
                                    size={24}
                                    strokeWidth={isLinkActive ? 2.5 : 2}
                                    className={`transition-all duration-300 ${isLinkActive ? 'drop-shadow-[0_0_8px_rgba(234,88,12,0.5)]' : ''}`}
                                />
                            </div>

                            <span className={`text-[10px] font-bold transition-all duration-300 ${isLinkActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 absolute bottom-1'}`}>
                                {item.label}
                            </span>

                            {/* Active Dot Indicator */}
                            {isLinkActive && (
                                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-primary shadow-[0_0_5px_rgba(234,88,12,1)]" />
                            )}
                        </NavLink>
                    );
                })}
            </nav>
        </div>
    );
};

export default MechanicBottomNav;