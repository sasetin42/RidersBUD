import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { Mechanic } from '../types';
import { useDatabase } from './DatabaseContext';

interface MechanicAuthContextType {
    isMechanicAuthenticated: boolean;
    mechanic: Mechanic | null;
    loading: boolean;
    login: (email: string, pass: string) => Promise<void>;
    logout: () => void;
    register: (mechanicData: Omit<Mechanic, 'id' | 'status' | 'rating' | 'reviews' | 'reviewsList' | 'password'> & { password?: string }) => Promise<void>;
    updateMechanicProfile: (updatedMechanic: Mechanic) => Promise<void>;
}

const MechanicAuthContext = createContext<MechanicAuthContextType | undefined>(undefined);

export const useMechanicAuth = () => {
    const context = useContext(MechanicAuthContext);
    if (context === undefined) {
        throw new Error('useMechanicAuth must be used within a MechanicAuthProvider');
    }
    return context;
};

export const MechanicAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { db, addMechanic, updateMechanic: dbUpdateMechanic, loading: dbLoading } = useDatabase();
    const [isMechanicAuthenticated, setIsMechanicAuthenticated] = useState<boolean>(false);
    const [mechanic, setMechanic] = useState<Mechanic | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for an existing session and validate mechanic's status
        const storedMechanicId = sessionStorage.getItem('ridersbud_mechanic_session');
        if (storedMechanicId && db) {
            const sessionMechanic = db.mechanics.find(m => m.id === storedMechanicId);
            // A mechanic can only maintain a session if they exist AND their status is 'Active'.
            if (sessionMechanic && sessionMechanic.status === 'Active') {
                setMechanic(sessionMechanic);
                setIsMechanicAuthenticated(true);
            } else {
                // If mechanic is not found (deleted) or is no longer 'Active', clear the session.
                sessionStorage.removeItem('ridersbud_mechanic_session');
            }
        }
        setLoading(false);
    }, [db]);

    const login = async (email: string, pass: string) => {
        if (!db) throw new Error("Database not ready");

        const targetMechanic = db.mechanics.find(m => m.email.toLowerCase() === email.toLowerCase());
        
        if (targetMechanic && pass === targetMechanic.password) {
            if (targetMechanic.status !== 'Active') {
                throw new Error(`Your account status is: ${targetMechanic.status}. You cannot log in.`);
            }
            setMechanic(targetMechanic);
            setIsMechanicAuthenticated(true);
            sessionStorage.setItem('ridersbud_mechanic_session', targetMechanic.id);
        } else {
            throw new Error("Invalid mechanic credentials");
        }
    };

    const logout = () => {
        setIsMechanicAuthenticated(false);
        setMechanic(null);
        sessionStorage.removeItem('ridersbud_mechanic_session');
    };
    
    const register = async (mechanicData: Omit<Mechanic, 'id' | 'status' | 'rating' | 'reviews' | 'reviewsList' | 'password'> & { password?: string }) => {
        if (!db) throw new Error("Database not ready");

        const existingMechanic = db.mechanics.find(m => m.email === mechanicData.email);
        if (existingMechanic) {
            throw new Error("An account with this email already exists.");
        }

        addMechanic({ 
            ...mechanicData, 
            password: mechanicData.password || 'password123', // Use provided password or a default
            status: 'Pending', 
            rating: 0, 
            reviews: 0 
        });
    };
    
    const updateMechanicProfile = async (updatedMechanic: Mechanic) => {
        await dbUpdateMechanic(updatedMechanic);
        setMechanic(updatedMechanic);
    };

    const isLoadingAuth = loading || dbLoading;

    return (
        <MechanicAuthContext.Provider value={{ isMechanicAuthenticated, mechanic, loading: isLoadingAuth, login, logout, register, updateMechanicProfile }}>
            {children}
        </MechanicAuthContext.Provider>
    );
};