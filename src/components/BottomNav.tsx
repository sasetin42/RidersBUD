import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Wrench, ShoppingBag, Heart, User, Circle } from 'lucide-react';
import { useCart } from '../context/CartContext';

const BottomNav: React.FC = () => {
    const location = useLocation();
    const { cartItems } = useCart();

    const hideNavPaths = ['/login', '/signup', '/admin', '/mechanic', '/payment', '/service-payment', '/order-confirmation'];
    if (hideNavPaths.some(path => location.pathname.startsWith(path))) return null;

    const navItems = [
        { path: '/home', label: 'Home', icon: Home },
        { path: '/services', label: 'Services', icon: Wrench },
        { path: '/parts-store', label: 'Shop', icon: ShoppingBag, badge: cartItems.length }, // Changed label to Shop (Parts & Tools)
        { path: '/wishlist', label: 'Wishlist', icon: Heart },
        { path: '/profile', label: 'Profile', icon: User },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pointer-events-none">
            <nav className="pointer-events-auto max-w-lg mx-auto bg-[#1A1A1A]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.5)] flex items-center justify-around h-[70px] px-2 relative overflow-hidden">
                {/* Background Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />

                {navItems.map((item) => {
                    const isActive = location.pathname.startsWith(item.path);
                    const Icon = item.icon;

                    return (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive: linkActive }) => `
                                relative flex flex-col items-center justify-center w-full h-full gap-1 transition-all duration-300 group
                                ${linkActive ? 'text-primary' : 'text-gray-500 hover:text-gray-300'}
                            `}
                        >
                            <div className={`relative p-1.5 rounded-xl transition-all duration-300 ${isActive ? 'bg-primary/10 -translate-y-1' : 'group-hover:-translate-y-0.5'}`}>
                                <Icon
                                    size={24}
                                    strokeWidth={isActive ? 2.5 : 2}
                                    className={`transition-all duration-300 ${isActive ? 'drop-shadow-[0_0_8px_rgba(234,88,12,0.5)]' : ''}`}
                                />
                                {item.badge ? (
                                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm ring-2 ring-[#1A1A1A]">
                                        {item.badge}
                                    </span>
                                ) : null}
                            </div>

                            <span className={`text-[10px] font-bold transition-all duration-300 ${isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 absolute bottom-1'}`}>
                                {item.label}
                            </span>

                            {/* Active Dot Indicator */}
                            {isActive && (
                                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-primary shadow-[0_0_5px_rgba(234,88,12,1)]" />
                            )}
                        </NavLink>
                    );
                })}
            </nav>
        </div>
    );
};

export default BottomNav;