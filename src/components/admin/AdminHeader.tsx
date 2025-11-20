
import React from 'react';

interface AdminHeaderProps {
    onToggleSidebar: () => void;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({ onToggleSidebar }) => {
    return (
        <header className="flex-shrink-0 bg-admin-card border-b border-admin-border px-6 h-20 flex items-center justify-between z-10">
            {/* Left side: Toggle button for mobile/tablet and Search */}
            <div className="flex items-center gap-4">
                <button
                    onClick={onToggleSidebar}
                    className="text-admin-text-secondary hover:text-admin-text-primary lg:hidden"
                    aria-label="Toggle sidebar"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                    </svg>
                </button>

                {/* Search Bar */}
                <div className="relative hidden md:block">
                     <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-admin-text-secondary" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                        </svg>
                    </span>
                    <input
                        type="text"
                        placeholder="Search anything..."
                        className="w-full pl-10 pr-4 py-2 bg-admin-bg rounded-lg text-admin-text-primary placeholder-admin-text-secondary focus:outline-none focus:ring-2 focus:ring-admin-accent"
                    />
                </div>
            </div>

            {/* Icons & Profile */}
            <div className="flex items-center gap-5">
                <button className="relative text-admin-text-secondary hover:text-admin-text-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
                </button>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-admin-accent rounded-full flex items-center justify-center font-bold text-white text-sm">A</div>
                    <div className="hidden md:block">
                        <p className="text-sm font-semibold text-admin-text-primary">Admin User</p>
                        <p className="text-xs text-admin-text-secondary">Super Admin</p>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default AdminHeader;
