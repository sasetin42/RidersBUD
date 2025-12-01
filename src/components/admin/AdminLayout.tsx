
import React, { useState } from 'react';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';

const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Default state: sidebar is expanded on desktop (>= 1024px), collapsed/hidden otherwise.
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);

    return (
        <div className="relative min-h-screen lg:flex bg-gradient-dark text-white font-sans overflow-hidden">
            {/* Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-admin-accent/5 blur-[120px]"></div>
                <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] rounded-full bg-blue-500/5 blur-[120px]"></div>
            </div>

            <AdminSidebar
                isSidebarOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />

            <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out relative z-10 ${isSidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
                <AdminHeader onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
                <main className="flex-1 overflow-x-hidden overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8">
                    <div className="max-w-7xl mx-auto pb-10">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;