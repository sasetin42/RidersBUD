
import React, { useState, useEffect, ReactNode } from 'react';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';

interface AdminLayoutProps {
    children: ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Persistent desktop collapse state (default: true / collapsed)
    const [isCollapsed, setIsCollapsed] = useState(() => {
        const saved = localStorage.getItem('admin_sidebar_collapsed');
        return saved !== null ? JSON.parse(saved) : true;
    });

    useEffect(() => {
        localStorage.setItem('admin_sidebar_collapsed', JSON.stringify(isCollapsed));
    }, [isCollapsed]);

    return (
        <div className="relative min-h-screen w-full lg:flex bg-[#0D0D10] text-gray-100 font-sans selection:bg-primary/30 selection:text-primary overflow-x-hidden">
            {/* Ambient background light gradients for enhanced glassmorphic contrast */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute -top-[20%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-primary/[0.03] blur-[120px]" />
                <div className="absolute top-[40%] -right-[15%] w-[45vw] h-[45vw] rounded-full bg-blue-600/[0.025] blur-[140px]" />
                <div className="absolute -bottom-[10%] left-[20%] w-[40vw] h-[40vw] rounded-full bg-primary/[0.02] blur-[120px]" />
            </div>

            <AdminSidebar
                isSidebarOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                isCollapsed={isCollapsed}
                setIsCollapsed={setIsCollapsed}
            />

            <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 relative z-10 ${isCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
                <AdminHeader onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
                <main className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
                    <div className="w-full space-y-8 max-w-full">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
