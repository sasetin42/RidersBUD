import React, { useState } from 'react';
import AdminSidebar from './AdminSidebar';

const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    return (
        <div className="relative flex h-screen bg-dark-gray font-sans overflow-hidden">
            <AdminSidebar isCollapsed={isSidebarCollapsed} />

            {/* Sidebar Toggle Button */}
            <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className={`absolute top-1/2 -translate-y-1/2 z-20 bg-white text-gray-600 hover:bg-primary hover:text-white w-8 h-8 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ease-in-out focus:outline-none -translate-x-1/2 ${
                    isSidebarCollapsed ? 'left-20' : 'left-64'
                }`}
                aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
                <svg className={`w-5 h-5 transition-transform duration-300 ${isSidebarCollapsed ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11l-4-4m0 8l4-4"></path>
                </svg>
            </button>
            
            <main className={`flex-1 flex flex-col transition-all duration-300 ease-in-out overflow-hidden ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
                {/* Page components are now direct children and will control their own layout and scrolling */}
                {children}
            </main>
        </div>
    );
};

export default AdminLayout;