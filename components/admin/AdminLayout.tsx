

import React, { useState } from 'react';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';

const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Default state: sidebar is expanded on desktop (>= 1024px), collapsed/hidden otherwise.
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);

    return (
        <div className="relative min-h-screen lg:flex bg-admin-bg text-admin-text-primary font-sans">
            <AdminSidebar 
                isSidebarOpen={isSidebarOpen} 
                onClose={() => setIsSidebarOpen(false)} 
            />
            
            <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${isSidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
                <AdminHeader onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
                <main className="flex-1 overflow-x-hidden bg-admin-bg p-4 sm:p-6">
                    <div className="max-w-full mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;