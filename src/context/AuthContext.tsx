
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { Customer, Vehicle } from '../types';
import { useDatabase } from './DatabaseContext';
import { useNotification } from './NotificationContext';
import { supabase } from '../lib/supabase';
import { uploadAvatar, deleteOldAvatar } from '../utils/imageUpload';

interface AuthContextType {
    isAuthenticated: boolean;
    user: Customer | null;
    loading: boolean;
    loginWithCredentials: (email: string, pass: string) => Promise<void>;
    registerWithCredentials: (name: string, email: string, phone: string, password: string) => Promise<void>;
    loginWithGoogle: () => Promise<void>;
    loginWithFacebook: () => Promise<void>;
    logout: () => void;
    addUserVehicle: (vehicle: Vehicle) => Promise<void>;
    deleteUserVehicle: (plateNumber: string) => Promise<void>;
    updateUserProfile: (updatedData: { name: string; email: string; phone: string; picture?: string; }) => Promise<void>;
    updateUserVehicle: (vehicle: Vehicle) => Promise<void>;
    setPrimaryVehicle: (plateNumber: string) => Promise<void>;
    addFavoriteMechanic: (mechanicId: string) => Promise<void>;
    removeFavoriteMechanic: (mechanicId: string) => Promise<void>;
    subscribeToMechanic: (mechanicId: string) => Promise<void>;
    unsubscribeFromMechanic: (mechanicId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { addNotification } = useNotification();
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [user, setUser] = useState<Customer | null>(null);
    const [loading, setLoading] = useState(true);

    // Fetch user profile and vehicles from Supabase
    const fetchUserProfile = async (userId: string, email: string) => {
        try {
            // Fetch profile
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (profileError) throw profileError;

            // Fetch vehicles
            const { data: vehicles, error: vehiclesError } = await supabase
                .from('vehicles')
                .select('*')
                .eq('owner_id', userId);

            if (vehiclesError) throw vehiclesError;

            // Map to Customer type
            const customer: Customer = {
                id: profile.id,
                name: profile.full_name || email.split('@')[0],
                email: profile.email,
                password: '', // Password not stored in client
                phone: profile.phone || '',
                picture: profile.avatar_url,
                vehicles: vehicles.map((v: any) => ({
                    make: v.make,
                    model: v.model,
                    year: v.year,
                    plateNumber: v.plate_number,
                    imageUrls: v.image_urls || [],
                    isPrimary: v.is_primary,
                    vin: v.vin,
                    mileage: v.mileage,
                    insuranceProvider: v.insurance_provider,
                    insurancePolicyNumber: v.insurance_policy_number
                })),
                favoriteMechanicIds: profile.favorite_mechanic_ids || [],
                subscribedMechanicIds: profile.subscribed_mechanic_ids || []
            };

            setUser(customer);
            setIsAuthenticated(true);
        } catch (error) {
            console.error('Error fetching user profile:', error);
            // Fallback or error handling
        }
    };

    useEffect(() => {
        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                fetchUserProfile(session.user.id, session.user.email!);
            } else {
                setLoading(false);
            }
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                fetchUserProfile(session.user.id, session.user.email!);
            } else {
                setUser(null);
                setIsAuthenticated(false);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // When user is set, loading is done
    useEffect(() => {
        if (user) setLoading(false);
    }, [user]);

    const loginWithCredentials = async (email: string, pass: string) => {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password: pass,
        });

        if (error) throw new Error(error.message);
    };

    const registerWithCredentials = async (name: string, email: string, phone: string, password: string) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name,
                    phone: phone,
                    role: 'customer'
                }
            }
        });

        if (error) throw new Error(error.message);

        if (data.user) {
            addNotification({
                type: 'success',
                title: 'Welcome!',
                message: 'Your account has been created successfully.',
                recipientId: `customer-${data.user.id}`
            });
        }
    };

    const loginWithGoogle = async () => {
        // Placeholder for Google Auth
        console.log("Google login not yet implemented with Supabase");
    };

    const loginWithFacebook = async () => {
        // Placeholder for Facebook Auth
        console.log("Facebook login not yet implemented with Supabase");
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setIsAuthenticated(false);
        setUser(null);
    };

    // --- Vehicle Operations (Synced with Supabase) ---

    const addUserVehicle = async (vehicle: Vehicle) => {
        if (!user) return;

        const isFirstVehicle = user.vehicles.length === 0;
        const newVehicle = {
            owner_id: user.id,
            make: vehicle.make,
            model: vehicle.model,
            year: vehicle.year,
            plate_number: vehicle.plateNumber,
            image_urls: vehicle.imageUrls,
            is_primary: isFirstVehicle,
            vin: vehicle.vin,
            mileage: vehicle.mileage,
            insurance_provider: vehicle.insuranceProvider,
            insurance_policy_number: vehicle.insurancePolicyNumber
        };

        const { error } = await supabase.from('vehicles').insert(newVehicle);
        if (error) {
            console.error("Error adding vehicle:", error);
            return;
        }

        // Refresh profile to get updated vehicles
        fetchUserProfile(user.id, user.email);
    };

    const deleteUserVehicle = async (plateNumber: string) => {
        if (!user) return;

        const { error } = await supabase
            .from('vehicles')
            .delete()
            .eq('owner_id', user.id)
            .eq('plate_number', plateNumber);

        if (error) {
            console.error("Error deleting vehicle:", error);
            return;
        }

        fetchUserProfile(user.id, user.email);
    };

    const setPrimaryVehicle = async (plateNumber: string) => {
        if (!user) return;

        // 1. Set all user's vehicles to is_primary = false
        await supabase
            .from('vehicles')
            .update({ is_primary: false })
            .eq('owner_id', user.id);

        // 2. Set the selected vehicle to is_primary = true
        await supabase
            .from('vehicles')
            .update({ is_primary: true })
            .eq('owner_id', user.id)
            .eq('plate_number', plateNumber);

        fetchUserProfile(user.id, user.email);
    };

    const updateUserProfile = async (updatedData: { name: string; email: string; phone: string; picture?: string | File; }) => {
        if (!user) return;

        let avatarUrl = user.picture;

        // If picture is a File object, upload it to Supabase Storage
        if (updatedData.picture && updatedData.picture instanceof File) {
            try {
                // Delete old avatar if exists
                if (user.picture) {
                    await deleteOldAvatar(user.picture, user.id);
                }

                // Upload new avatar
                avatarUrl = await uploadAvatar(updatedData.picture, user.id);
            } catch (error) {
                console.error('Avatar upload failed:', error);
                throw new Error(error instanceof Error ? error.message : 'Failed to upload avatar');
            }
        } else if (typeof updatedData.picture === 'string') {
            // If picture is already a URL string, use it directly
            avatarUrl = updatedData.picture;
        }

        const updates = {
            full_name: updatedData.name,
            phone: updatedData.phone,
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', user.id);

        if (error) throw error;

        fetchUserProfile(user.id, user.email);
    };

    const updateUserVehicle = async (vehicle: Vehicle) => {
        if (!user) return;

        const updates = {
            make: vehicle.make,
            model: vehicle.model,
            year: vehicle.year,
            image_urls: vehicle.imageUrls,
            vin: vehicle.vin,
            mileage: vehicle.mileage,
            insurance_provider: vehicle.insuranceProvider,
            insurance_policy_number: vehicle.insurancePolicyNumber
        };

        const { error } = await supabase
            .from('vehicles')
            .update(updates)
            .eq('owner_id', user.id)
            .eq('plate_number', vehicle.plateNumber);

        if (error) console.error("Error updating vehicle:", error);

        fetchUserProfile(user.id, user.email);
    };

    const addFavoriteMechanic = async (mechanicId: string) => {
        if (!user) return;
        const newFavorites = [...new Set([...(user.favoriteMechanicIds || []), mechanicId])];

        const { error } = await supabase
            .from('profiles')
            .update({ favorite_mechanic_ids: newFavorites })
            .eq('id', user.id);

        if (!error) {
            setUser({ ...user, favoriteMechanicIds: newFavorites });
            addNotification({ type: 'success', title: 'Favorite Added', message: 'Mechanic saved to your favorites.', recipientId: `customer-${user.id}` });
        }
    };

    const removeFavoriteMechanic = async (mechanicId: string) => {
        if (!user) return;
        const newFavorites = (user.favoriteMechanicIds || []).filter(id => id !== mechanicId);

        const { error } = await supabase
            .from('profiles')
            .update({ favorite_mechanic_ids: newFavorites })
            .eq('id', user.id);

        if (!error) {
            setUser({ ...user, favoriteMechanicIds: newFavorites });
            addNotification({ type: 'success', title: 'Favorite Removed', message: 'Mechanic removed from your favorites.', recipientId: `customer-${user.id}` });
        }
    };

    const subscribeToMechanic = async (mechanicId: string) => {
        if (!user) return;
        const newSubscriptions = [...new Set([...(user.subscribedMechanicIds || []), mechanicId])];

        const { error } = await supabase
            .from('profiles')
            .update({ subscribed_mechanic_ids: newSubscriptions })
            .eq('id', user.id);

        if (!error) {
            setUser({ ...user, subscribedMechanicIds: newSubscriptions });
            addNotification({ type: 'success', title: 'Subscribed!', message: 'You will now receive updates from this mechanic.', recipientId: `customer-${user.id}` });
        }
    };

    const unsubscribeFromMechanic = async (mechanicId: string) => {
        if (!user) return;
        const newSubscriptions = (user.subscribedMechanicIds || []).filter(id => id !== mechanicId);

        const { error } = await supabase
            .from('profiles')
            .update({ subscribed_mechanic_ids: newSubscriptions })
            .eq('id', user.id);

        if (!error) {
            setUser({ ...user, subscribedMechanicIds: newSubscriptions });
            addNotification({ type: 'success', title: 'Unsubscribed', message: 'You will no longer receive updates.', recipientId: `customer-${user.id}` });
        }
    };

    const isLoadingAuth = loading;

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
            subscribeToMechanic,
            unsubscribeFromMechanic,
        }}>
            {children}
        </AuthContext.Provider>
    );
};