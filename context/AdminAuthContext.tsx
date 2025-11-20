
import React, { createContext, useState, useContext, ReactNode } from 'react';

interface AdminAuthContextType {
    isAdminAuthenticated: boolean;
    login: () => void;
    logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const useAdminAuth = () => {
    const context = useContext(AdminAuthContext);
    if (context === undefined) {
        throw new Error('useAdminAuth must be used within an AdminAuthProvider');
    }
    return context;
};

export const AdminAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);

    const login = () => {
        setIsAdminAuthenticated(true);
    };

    const logout = () => {
        setIsAdminAuthenticated(false);
    };

    return (
        <AdminAuthContext.Provider value={{ isAdminAuthenticated, login, logout }}>
            {children}
        </AdminAuthContext.Provider>
    );
};
