
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useScrollDirection } from '../hooks/useScrollDirection';
import Tooltip from './ui/Tooltip';

const NavIcon = ({ icon, label, to, itemCount, end }: { icon: React.ReactNode; label: string; to: string; itemCount?: number; end?: boolean }) => (
    <Tooltip content={label} position="top">
        <NavLink to={to} end={end} aria-label={label} className="relative group flex flex-col items-center justify-center w-full h-full btn-haptic">
        {({ isActive }) => (
            <>
                {/* Top Indicator - Matches Mechanic Design */}
                <div className={`absolute top-0 w-8 h-1 bg-primary rounded-b-full transition-all duration-300 ${isActive ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}></div>

                {/* Icon Container */}
                <div className={`p-2 rounded-2xl transition-all duration-300 relative ${isActive ? 'bg-white/10 text-primary scale-110 shadow-[0_0_15px_rgba(255,107,0,0.3)]' : 'text-gray-500 group-hover:text-gray-300'}`}>
                    {icon}
                    {itemCount !== undefined && itemCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-white text-[9px] ring-2 ring-[#121212] font-bold">
                            {itemCount}
                        </span>
                    )}
                </div>
                {/* Labels hidden to match Mechanic design perfectly */}
                {/* <span className="absolute bottom-1 text-[9px] font-bold ...">{label}</span> */}
            </>
        )}
    </NavLink>
    </Tooltip>
);

const BottomNav: React.FC = () => {
    const { itemCount: cartItemCount } = useCart();
    const { itemCount: wishlistItemCount } = useWishlist();
    const location = useLocation();
    const scrollDirection = useScrollDirection();

    // Hide BottomNav on Support Chat, Booking Process (Booking, Payment, Service-Payment), Service Details, and Part Details screen
    // We unhide it when the booking is successful (confirmation screens or success query param)
    // NOTE: Cart intentionally kept visible so users can easily navigate home from cart
    const isBookingProcess = (
        location.pathname.includes('/booking/') || 
        location.pathname.includes('/payment') || 
        location.pathname.includes('/service-payment') ||
        location.pathname.includes('/app-services/book/') ||
        location.pathname.includes('/app-services/liaison-book/')
    ) && !location.pathname.includes('-confirmation') && !location.search.includes('success=true');

    const isDetailView = 
        location.pathname.includes('/service/') || 
        location.pathname.includes('/part/') ||
        (location.pathname.includes('/app-services/') && !location.pathname.includes('/book/') && !location.pathname.includes('/liaison-book/'));
    const isSupport = location.pathname.includes('/support-chat');

    if (isBookingProcess || isDetailView || isSupport) {
        return null;
    }

    return (
        <div 
            className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ease-in-out ${scrollDirection === 'down' ? 'translate-y-full' : 'translate-y-0'}`}
        >
            <div className="w-full flex justify-between items-center bg-[#121212]/95 backdrop-blur-xl border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] px-4 sm:px-8 h-16 sm:h-20 pb-[env(safe-area-inset-bottom)]">
                <NavIcon
                    to="/customer-portal"
                    label="Home"
                    end
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>}
                />
                <NavIcon
                    to="/customer-portal/services"
                    label="Services"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                />
                <NavIcon
                    to="/customer-portal/parts-store"
                    label="Store"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>}
                />
                <NavIcon
                    to="/customer-portal/wishlist"
                    label="Wishlist"
                    itemCount={wishlistItemCount}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 016.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z" /></svg>}
                />
                <NavIcon
                    to="/customer-portal/cart"
                    label="Cart"
                    itemCount={cartItemCount}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
                />
                <NavIcon
                    to="/customer-portal/profile"
                    label="Profile"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>}
                />
            </div>
        </div>
    );
};

export default BottomNav;
