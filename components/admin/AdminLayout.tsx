import React, { useState } from 'react';
import AdminSidebar from './AdminSidebar';

const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    return (
        <div className="relative flex h-screen bg-gray-100 font-sans">
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                </svg>
            </button>
            
            <main className={`flex-1 overflow-y-auto transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
                <div className="p-4 sm:p-6 lg:p-8">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;