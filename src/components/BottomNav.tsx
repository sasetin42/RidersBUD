

import React from 'react';
import { NavLink } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { Home, Wrench, ShoppingBag, Heart, ShoppingCart, User } from 'lucide-react';

const NavIcon = ({ icon, label, to, itemCount }: { icon: React.ReactNode; label: string; to: string; itemCount?: number }) => (
    <NavLink
        to={to}
        className={({ isActive }) => `
            flex flex-col items-center justify-center w-full py-3 text-xs 
            transition-all duration-300 relative group
            ${isActive ? 'text-primary' : 'text-light-gray hover:text-white'}
        `}
    >
        {({ isActive }) => (
            <>
                {isActive && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-gradient-primary rounded-b-full shadow-glow-sm animate-scaleUp" />
                )}
                <div className="relative group-hover:scale-110 transition-transform duration-300 flex items-center justify-center">
                    {icon}
                    {itemCount !== undefined && itemCount > 0 && (
                        <span className="absolute -top-1 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-primary text-white text-[10px] font-bold shadow-glow-sm animate-scaleUp border border-white/20">
                            {itemCount}
                        </span>
                    )}
                </div>
                <span className="mt-1.5 font-medium leading-tight">{label}</span>
            </>
        )}
    </NavLink>
);


const BottomNav: React.FC = () => {
    const { itemCount: cartItemCount } = useCart();
    const { itemCount: wishlistItemCount } = useWishlist();

    return (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50">
            <div className="flex justify-around items-center glass-dark border-t border-white/10 shadow-2xl shadow-primary/5 animate-slideInUp">
                <NavIcon
                    to="/"
                    label="Home"
                    icon={<Home className="h-6 w-6" />}
                />
                <NavIcon
                    to="/services"
                    label="Services"
                    icon={<Wrench className="h-6 w-6" />}
                />
                <NavIcon
                    to="/parts-store"
                    label="Store"
                    icon={<ShoppingBag className="h-6 w-6" />}
                />
                <NavIcon
                    to="/wishlist"
                    label="Wishlist"
                    itemCount={wishlistItemCount}
                    icon={<Heart className="h-6 w-6" />}
                />
                <NavIcon
                    to="/cart"
                    label="Cart"
                    itemCount={cartItemCount}
                    icon={<ShoppingCart className="h-6 w-6" />}
                />
                <NavIcon
                    to="/profile"
                    label="Profile"
                    icon={<User className="h-6 w-6" />}
                />
            </div>
        </div>
    );
};

export default BottomNav;