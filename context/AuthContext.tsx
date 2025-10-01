
import React, { createContext, useState, useContext, ReactNode } from 'react';
import { User, Vehicle } from '../types';
import { mockUser } from '../data/mockData';

interface AuthContextType {
    isAuthenticated: boolean;
    user: User | null;
    login: () => void;
    logout: () => void;
    addUserVehicle: (vehicle: Vehicle) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [user, setUser] = useState<User | null>(null);

    const login = () => {
        setIsAuthenticated(true);
        setUser(mockUser);
    };

    const logout = () => {
        setIsAuthenticated(false);
        setUser(null);
    };

    const addUserVehicle = (vehicle: Vehicle) => {
        setUser(currentUser => {
            if (!currentUser) return null;
            return {
                ...currentUser,
                vehicles: [...currentUser.vehicles, vehicle],
            };
        });
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, user, login, logout, addUserVehicle }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
