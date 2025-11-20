

import React from 'react';
import { NavLink } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { Home, Wrench, ShoppingBag, Heart, ShoppingCart, User } from 'lucide-react';

const NavIcon = ({ icon, label, to, itemCount }: { icon: React.ReactNode; label: string; to: string; itemCount?: number }) => (
    <NavLink to={to} className={({ isActive }) => `flex flex-col items-center justify-center w-full pt-2 pb-1 text-xs transition-colors duration-200 ${isActive ? 'text-primary' : 'text-light-gray'}`}>
        <div className="relative">
            {icon}
            {itemCount !== undefined && itemCount > 0 && (
                <span className="absolute -top-1 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-white text-[10px]">
                    {itemCount}
                </span>
            )}
        </div>
        <span className="mt-1">{label}</span>
    </NavLink>
);


const BottomNav: React.FC = () => {
    const { itemCount: cartItemCount } = useCart();
    const { itemCount: wishlistItemCount } = useWishlist();

    return (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 flex justify-around items-center bg-[#1D1D1D] border-t border-dark-gray shadow-lg">
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
    );
};

export default BottomNav;