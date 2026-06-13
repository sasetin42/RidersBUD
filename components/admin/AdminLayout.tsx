
import React, { useState, useEffect } from 'react';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';

const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Default state: sidebar is expanded on desktop (>= 1024px), collapsed/hidden otherwise.
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Persistent desktop collapse state
    const [isCollapsed, setIsCollapsed] = useState(() => {
        const saved = localStorage.getItem('admin_sidebar_collapsed');
        return saved ? JSON.parse(saved) : false;
    });

    useEffect(() => {
        localStorage.setItem('admin_sidebar_collapsed', JSON.stringify(isCollapsed));
    }, [isCollapsed]);

    return (
        <div className="relative min-h-screen lg:flex bg-[#0F0F0F] text-gray-100 font-sans selection:bg-primary/30 selection:text-primary">
            <AdminSidebar
                isSidebarOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                isCollapsed={isCollapsed}
                setIsCollapsed={setIsCollapsed}
            />

            <div className={`flex-1 flex flex-col transition-all duration-300 ${isCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
                <AdminHeader onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
                <main className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
                    <div className="w-full space-y-8">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
