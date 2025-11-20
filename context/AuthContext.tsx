import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { Customer, Vehicle } from '../types';
import { useDatabase } from './DatabaseContext';

interface AuthContextType {
    isAuthenticated: boolean;
    user: Customer | null;
    loading: boolean;
    loginWithCredentials: (email: string, pass: string) => Promise<void>;
    registerWithCredentials: (name: string, email: string, phone: string, password: string) => Promise<void>;
    loginWithGoogle: () => Promise<void>;
    loginWithFacebook: () => Promise<void>;
    logout: () => void;
    addUserVehicle: (vehicle: Vehicle) => void;
    deleteUserVehicle: (plateNumber: string) => void;
    updateUserProfile: (updatedData: { name: string; email: string; phone: string }) => Promise<void>;
    updateUserVehicle: (vehicle: Vehicle) => void;
    setPrimaryVehicle: (plateNumber: string) => void;
    addFavoriteMechanic: (mechanicId: string) => void;
    removeFavoriteMechanic: (mechanicId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

const SESSION_KEY = 'ridersbud_session';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { db, addCustomer, updateCustomer, loading: dbLoading } = useDatabase();
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [user, setUser] = useState<Customer | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for an existing session when the app loads
        if (!dbLoading && db) {
            const storedUserId = sessionStorage.getItem(SESSION_KEY);
            if (storedUserId) {
                const sessionUser = db.customers.find(c => c.id === storedUserId);
                if (sessionUser) {
                    setUser(sessionUser);
                    setIsAuthenticated(true);
                } else {
                    // Clean up invalid session key
                    sessionStorage.removeItem(SESSION_KEY);
                }
            }
            setLoading(false);
        }
    }, [db, dbLoading]);

    const loginUser = (customer: Customer) => {
        setUser(customer);
        setIsAuthenticated(true);
        sessionStorage.setItem(SESSION_KEY, customer.id); // Save session
    };

    const loginWithCredentials = async (email: string, pass: string) => {
        if (!db) throw new Error("Database not ready");
        
        const customer = db.customers.find(c => c.email.toLowerCase() === email.toLowerCase());
        if (customer && pass === customer.password) {
            loginUser(customer);
        } else {
            throw new Error("Invalid email or password");
        }
    };
    
    const registerWithCredentials = async (name: string, email: string, phone: string, password: string) => {
        if (!db) throw new Error("Database not ready");

        const existingCustomer = db.customers.find(c => c.email.toLowerCase() === email.toLowerCase());
        if (existingCustomer) {
            throw new Error("An account with this email already exists.");
        }

        const newCustomer = await addCustomer({ name, email, phone, password, vehicles: [] });
        if(newCustomer) {
            loginUser(newCustomer);
        } else {
            throw new Error("Failed to create account.");
        }
    };

    const loginWithGoogle = async () => {
        if (!db) throw new Error("Database not ready");

        // --- SIMULATED GOOGLE AUTH RESPONSE ---
        const googleProfile = {
            name: 'Casey Becker',
            email: 'casey.becker@googlesim.com',
            picture: 'https://picsum.photos/seed/casey/200/200'
        };
        // --- END SIMULATION ---
        
        let customer = db.customers.find(c => c.email === googleProfile.email);

        if (customer) {
            loginUser(customer);
        } else {
            const newCustomer = await addCustomer({
                name: googleProfile.name,
                email: googleProfile.email,
                password: 'password', // Assign a default password for social logins
                phone: '555-000-0000', // Placeholder phone for Google sign-ups
                vehicles: [],
                picture: googleProfile.picture,
            });
            if (newCustomer) {
                loginUser(newCustomer);
            } else {
                throw new Error("Failed to create Google account.");
            }
        }
    };
    
    const loginWithFacebook = async () => {
        if (!db) throw new Error("Database not ready");

        // --- SIMULATED FACEBOOK AUTH RESPONSE ---
        const facebookProfile = {
            name: 'Drew Barrymore',
            email: 'drew.barrymore@facebooksim.com',
            picture: 'https://picsum.photos/seed/drew/200/200'
        };
        // --- END SIMULATION ---
        
        let customer = db.customers.find(c => c.email === facebookProfile.email);

        if (customer) {
            loginUser(customer);
        } else {
            const newCustomer = await addCustomer({
                name: facebookProfile.name,
                email: facebookProfile.email,
                password: 'password', 
                phone: '555-111-1111', 
                vehicles: [],
                picture: facebookProfile.picture,
            });
            if (newCustomer) {
                loginUser(newCustomer);
            } else {
                throw new Error("Failed to create Facebook account.");
            }
        }
    };

    const logout = () => {
        setIsAuthenticated(false);
        setUser(null);
        sessionStorage.removeItem(SESSION_KEY); // Clear session
    };

    const addUserVehicle = (vehicle: Vehicle) => {
        if (!user) return;
        const isFirstVehicle = user.vehicles.length === 0;
        const newVehicleWithPrimary = { ...vehicle, isPrimary: isFirstVehicle };

        const updatedUser: Customer = {
            ...user,
            vehicles: [...user.vehicles, newVehicleWithPrimary],
        };
        updateCustomer(updatedUser);
        setUser(updatedUser); // Update local state immediately for responsiveness
    };
    
    const deleteUserVehicle = (plateNumber: string) => {
        if (!user) return;

        const vehicleToDelete = user.vehicles.find(v => v.plateNumber === plateNumber);
        if (!vehicleToDelete) return;

        let updatedVehicles = user.vehicles.filter(v => v.plateNumber !== plateNumber);

        // If the deleted vehicle was primary and there are other vehicles left, make the first remaining one the new primary.
        if (vehicleToDelete.isPrimary && updatedVehicles.length > 0) {
            updatedVehicles[0] = { ...updatedVehicles[0], isPrimary: true };
        }

        const updatedUser: Customer = {
            ...user,
            vehicles: updatedVehicles,
        };
        updateCustomer(updatedUser);
        setUser(updatedUser);
    };

    const setPrimaryVehicle = (plateNumber: string) => {
        if (!user) return;
        const updatedVehicles = user.vehicles.map(v => ({
            ...v,
            isPrimary: v.plateNumber === plateNumber,
        }));
        const updatedUser: Customer = {
            ...user,
            vehicles: updatedVehicles,
        };
        updateCustomer(updatedUser);
        setUser(updatedUser);
    };

    const updateUserProfile = async (updatedData: { name: string; email: string; phone: string }) => {
        if (!user) return;
        // Simulate async operation for loading spinner feedback
        await new Promise(resolve => setTimeout(resolve, 750));
        const updatedUser: Customer = {
            ...user,
            ...updatedData
        };
        updateCustomer(updatedUser);
        setUser(updatedUser);
    };

    const updateUserVehicle = (vehicle: Vehicle) => {
        if (!user) return;
        const updatedVehicles = user.vehicles.map(v =>
            v.plateNumber === vehicle.plateNumber ? { ...vehicle, isPrimary: v.isPrimary } : v // Preserve isPrimary status on edit
        );
        const updatedUser: Customer = {
            ...user,
            vehicles: updatedVehicles,
        };
        updateCustomer(updatedUser);
        setUser(updatedUser);
    };
    
    const addFavoriteMechanic = (mechanicId: string) => {
        if (!user) return;
        const updatedUser: Customer = {
            ...user,
            favoriteMechanicIds: [...new Set([...(user.favoriteMechanicIds || []), mechanicId])],
        };
        updateCustomer(updatedUser);
        setUser(updatedUser);
    };

    const removeFavoriteMechanic = (mechanicId: string) => {
        if (!user) return;
        const updatedUser: Customer = {
            ...user,
            favoriteMechanicIds: (user.favoriteMechanicIds || []).filter(id => id !== mechanicId),
        };
        updateCustomer(updatedUser);
        setUser(updatedUser);
    };


    const isLoadingAuth = loading || dbLoading;

    return (
        <AuthContext.Provider value={{ 
            isAuthenticated, 
            user, 
            loading: isLoadingAuth, 
            loginWithCredentials,
            registerWithCredentials,
            loginWithGoogle,
            loginWithFacebook,
            logout, 
            addUserVehicle,
            deleteUserVehicle,
            updateUserProfile,
            updateUserVehicle,
            setPrimaryVehicle,
            addFavoriteMechanic,
            removeFavoriteMechanic,
        }}>
            {children}
        </AuthContext.Provider>
    );
};