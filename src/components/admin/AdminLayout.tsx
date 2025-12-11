

import React, { useState } from 'react';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';

const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Default state: sidebar is expanded on desktop (>= 1024px), collapsed/hidden otherwise.
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);

    return (
        <div className="relative min-h-screen lg:flex font-sans bg-[#0a0a0a] text-white selection:bg-primary/30">
            {/* Global Ambient Background */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/5 rounded-full blur-[150px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 rounded-full blur-[150px] animate-pulse delay-700"></div>
            </div>

            <AdminSidebar
                isSidebarOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />

            <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out relative z-10 ${isSidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
                <AdminHeader onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
                <main className="flex-1 overflow-x-hidden p-6 relative">
                    <div className="max-w-[1600px] mx-auto animate-fadeIn">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;