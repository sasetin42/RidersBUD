import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { Customer, Vehicle } from '../types';
import { auth, db as firestore } from '../firebase';
import { 
    onAuthStateChanged, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    updateProfile,
    User as FirebaseAuthUser,
    GoogleAuthProvider,
    signInWithPopup,
    FacebookAuthProvider,
    setPersistence,
    browserLocalPersistence
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { usePresence } from '../hooks/usePresence';

interface AuthContextType {
    isAuthenticated: boolean;
    user: Customer | null;
    loading: boolean;
    loginWithCredentials: (email: string, pass: string) => Promise<void>;
    loginWithGoogle: () => Promise<void>;
    loginWithFacebook: () => Promise<void>;
    logout: () => void;
    register: (userData: Omit<Customer, 'id' | 'vehicles'>) => Promise<void>;
    updateCustomerProfile: (updatedCustomer: Customer) => Promise<void>;
    updateUserProfile: (displayName?: string, photoURL?: string) => Promise<void>;
    addUserVehicle: (vehicle: Vehicle) => Promise<void>;
    updateUserVehicle: (vehicle: Vehicle) => Promise<void>;
    deleteUserVehicle: (plateNumber: string) => Promise<void>;
    setPrimaryVehicle: (plateNumber: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        return {
            isAuthenticated: false,
            user: null,
            loading: true,
            loginWithCredentials: async () => {},
            loginWithGoogle: async () => {},
            loginWithFacebook: async () => {},
            logout: async () => {},
            register: async () => {},
            updateCustomerProfile: async () => {},
            updateUserProfile: async () => {},
            addUserVehicle: async () => {},
            updateUserVehicle: async () => {},
            deleteUserVehicle: async () => {},
            setPrimaryVehicle: async () => {}
        } as unknown as AuthContextType;
    }
    return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [user, setUser] = useState<Customer | null>(null);
    const [loading, setLoading] = useState(true);
    const [firebaseUser, setFirebaseUser] = useState<FirebaseAuthUser | null>(null);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (fbUser) => {
            setFirebaseUser(fbUser);
            if (!fbUser) {
                setUser(null);
                setIsAuthenticated(false);
                setLoading(false);
            }
        });

        return () => unsubscribeAuth();
    }, []);

    // Real-time listener for the user's customer profile.
    // Skip entirely if the signed-in user is a mechanic — MechanicAuthContext owns that session.
    // This prevents the mechanic dashboard from flickering when AuthContext tries to look up
    // a customer document for a mechanic UID (both contexts share the same Firebase auth instance).
    useEffect(() => {
        if (!firebaseUser) return;

        let unsubscribeSnapshot: (() => void) | null = null;
        let cancelled = false;

        const setupListener = async () => {
            setLoading(true);

            try {
                // Guard: check if this uid belongs to a mechanic first
                const mechanicSnap = await getDoc(doc(firestore, 'mechanics', firebaseUser.uid));
                if (cancelled) return;

                if (mechanicSnap.exists()) {
                    // This is a mechanic session — AuthContext is not responsible for it
                    setUser(null);
                    setIsAuthenticated(false);
                    setLoading(false);
                    return; // Do NOT set up any customer snapshot
                }
            } catch (_err) {
                // If mechanic check fails (permission denied / network), fall through
                // so normal customers are still handled correctly
                if (cancelled) return;
            }

            // Not a mechanic — subscribe to the customer profile
            const userDocRef = doc(firestore, 'customers', firebaseUser.uid);
            unsubscribeSnapshot = onSnapshot(userDocRef, (docSnap) => {
                if (cancelled) return;
                if (docSnap.exists()) {
                    const userData = { id: docSnap.id, ...docSnap.data() } as Customer;
                    setUser(userData);
                    setIsAuthenticated(true);
                } else {
                    setUser(null);
                    setIsAuthenticated(false);
                }
                setLoading(false);
            }, (err) => {
                if (cancelled) return;
                console.error("Auth Profile Listener Error:", err);
                setLoading(false);
            });
        };

        setupListener();

        return () => {
            cancelled = true;
            unsubscribeSnapshot?.();
        };
    }, [firebaseUser]);

    const loginWithCredentials = async (email: string, pass: string) => {
        try {
            await setPersistence(auth, browserLocalPersistence);
            await signInWithEmailAndPassword(auth, email, pass);
        } catch (error: any) {
            console.error("Login failed:", error);
            throw error;
        }
    };

    const loginWithGoogle = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await setPersistence(auth, browserLocalPersistence);
            try {
                const result = await signInWithPopup(auth, provider);
                const { user: fbUser } = result;
                
                // If they are logging in as a mechanic, don't auto-create a customer doc
                const hint = sessionStorage.getItem('auth_type_hint');
                if (hint === 'mechanic') return;

                // Check if customer doc exists, if not create it
                const customerDoc = await getDoc(doc(firestore, 'customers', fbUser.uid));
                
                // Also check if they are already a mechanic
                const mechanicDoc = await getDoc(doc(firestore, 'mechanics', fbUser.uid));
                if (mechanicDoc.exists()) return;

                if (!customerDoc.exists()) {
                    const newCustomer: Customer = {
                        id: fbUser.uid,
                        name: fbUser.displayName || 'Google User',
                        email: fbUser.email || '',
                        phone: '',
                        vehicles: [],
                        picture: fbUser.photoURL || '',
                        registrationDate: new Date().toISOString(),
                        status: 'Active'
                    };
                    await setDoc(doc(firestore, 'customers', fbUser.uid), newCustomer);
                }
            } catch (popupError: any) {
                if (
                    popupError.code === 'auth/popup-blocked' || 
                    popupError.code === 'auth/popup-closed-by-user' || 
                    popupError.code === 'auth/cancelled-popup-request' ||
                    (popupError.message && popupError.message.includes('COOP'))
                ) {
                    console.log("Popup blocked or COOP isolation triggered, trying redirect sign-in...");
                    const { signInWithRedirect } = await import('firebase/auth');
                    await signInWithRedirect(auth, provider);
                } else {
                    throw popupError;
                }
            }
        } catch (error: any) {
            console.error("Google Login Error:", error);
            throw error;
        }
    };

    const loginWithFacebook = async () => {
        const provider = new FacebookAuthProvider();
        try {
            await setPersistence(auth, browserLocalPersistence);
            try {
                const result = await signInWithPopup(auth, provider);
                const { user: fbUser } = result;
                
                const hint = sessionStorage.getItem('auth_type_hint');
                if (hint === 'mechanic') return;

                const customerDoc = await getDoc(doc(firestore, 'customers', fbUser.uid));
                const mechanicDoc = await getDoc(doc(firestore, 'mechanics', fbUser.uid));
                if (mechanicDoc.exists()) return;

                if (!customerDoc.exists()) {
                    const newCustomer: Customer = {
                        id: fbUser.uid,
                        name: fbUser.displayName || 'Facebook User',
                        email: fbUser.email || '',
                        phone: '',
                        vehicles: [],
                        picture: fbUser.photoURL || '',
                        registrationDate: new Date().toISOString(),
                        status: 'Active'
                    };
                    await setDoc(doc(firestore, 'customers', fbUser.uid), newCustomer);
                }
            } catch (popupError: any) {
                if (
                    popupError.code === 'auth/popup-blocked' || 
                    popupError.code === 'auth/popup-closed-by-user' || 
                    popupError.code === 'auth/cancelled-popup-request' ||
                    (popupError.message && popupError.message.includes('COOP'))
                ) {
                    console.log("Popup blocked or COOP isolation triggered, trying redirect sign-in...");
                    const { signInWithRedirect } = await import('firebase/auth');
                    await signInWithRedirect(auth, provider);
                } else {
                    throw popupError;
                }
            }
        } catch (error: any) {
            console.error("Facebook Login Error:", error);
            throw error;
        }
    };

    const logout = async () => {
        await signOut(auth);
    };

    const register = async (userData: Omit<Customer, 'id' | 'vehicles'> & { vehicle?: Omit<Vehicle, 'id'> }) => {
        try {
            await setPersistence(auth, browserLocalPersistence);
            const { password, vehicle, ...restOfData } = userData;
            const userCredential = await createUserWithEmailAndPassword(auth, userData.email, password || 'password123');
            const fbUser = userCredential.user;
            
            await updateProfile(fbUser, { displayName: userData.name });

            const newCustomer: Customer = {
                ...restOfData,
                id: fbUser.uid,
                vehicles: vehicle ? [{ ...vehicle, id: Date.now().toString(), isPrimary: true }] : [],
                registrationDate: new Date().toISOString(),
                status: 'Active'
            };

            await setDoc(doc(firestore, 'customers', fbUser.uid), newCustomer);
        } catch (error: any) {
            console.error("Registration error:", error);
            throw error;
        }
    };

    const updateCustomerProfile = async (updatedCustomer: Customer) => {
        try {
            await setDoc(doc(firestore, 'customers', updatedCustomer.id), updatedCustomer, { merge: true });
        } catch (error) {
            console.error("Profile Update Error:", error);
            throw error;
        }
    };

    const updateUserProfile = async (displayName?: string, photoURL?: string) => {
        if (!auth.currentUser) return;
        try {
            await updateProfile(auth.currentUser, {
                ...(displayName && { displayName }),
                ...(photoURL && { photoURL })
            });
            
            const userDocRef = doc(firestore, 'customers', auth.currentUser.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
                await setDoc(userDocRef, {
                    ...(displayName && { name: displayName }),
                    ...(photoURL && { picture: photoURL })
                }, { merge: true });
            }
        } catch (error) {
            console.error("Firebase Update Profile Error:", error);
            throw error;
        }
    };

    // Strip undefined values — Firestore rejects them and throws on write
    const sanitizeForFirestore = <T extends object>(obj: T): T => {
        return Object.fromEntries(
            Object.entries(obj).filter(([, v]) => v !== undefined)
        ) as T;
    };

    const addUserVehicle = async (vehicle: Vehicle) => {
        if (!auth.currentUser || !user) return;
        try {
            const newVehicle = sanitizeForFirestore({
                ...vehicle,
                id: Date.now().toString(),
                isPrimary: user.vehicles.length === 0
            });
            const updatedVehicles = [...user.vehicles.map(sanitizeForFirestore), newVehicle];
            const userDocRef = doc(firestore, 'customers', auth.currentUser.uid);
            await updateDoc(userDocRef, { vehicles: updatedVehicles });
        } catch (error) {
            console.error("Add Vehicle Error:", error);
            throw error;
        }
    };

    const updateUserVehicle = async (vehicle: Vehicle) => {
        if (!auth.currentUser || !user) return;
        try {
            const cleanVehicle = sanitizeForFirestore(vehicle);
            const updatedVehicles = user.vehicles.map(v =>
                v.plateNumber === vehicle.plateNumber ? cleanVehicle : sanitizeForFirestore(v)
            );
            const userDocRef = doc(firestore, 'customers', auth.currentUser.uid);
            await updateDoc(userDocRef, { vehicles: updatedVehicles });
        } catch (error) {
            console.error("Update Vehicle Error:", error);
            throw error;
        }
    };

    const deleteUserVehicle = async (plateNumber: string) => {
        if (!auth.currentUser || !user) return;
        try {
            const updatedVehicles = user.vehicles.filter(v => v.plateNumber !== plateNumber);
            const userDocRef = doc(firestore, 'customers', auth.currentUser.uid);
            await updateDoc(userDocRef, { vehicles: updatedVehicles });
        } catch (error) {
            console.error("Delete Vehicle Error:", error);
            throw error;
        }
    };

    const setPrimaryVehicle = async (plateNumber: string) => {
        if (!auth.currentUser || !user) return;
        try {
            const updatedVehicles = user.vehicles.map(v => ({
                ...v,
                isPrimary: v.plateNumber === plateNumber
            }));
            const userDocRef = doc(firestore, 'customers', auth.currentUser.uid);
            await updateDoc(userDocRef, { vehicles: updatedVehicles });
        } catch (error) {
            console.error("Set Primary Vehicle Error:", error);
            throw error;
        }
    };

    usePresence(isAuthenticated ? user?.id || null : null, 'customers');

    return (
        <AuthContext.Provider value={{ 
            isAuthenticated, 
            user, 
            loading, 
            loginWithCredentials, 
            loginWithGoogle, 
            loginWithFacebook, 
            logout, 
            register,
            updateCustomerProfile,
            updateUserProfile,
            addUserVehicle,
            updateUserVehicle,
            deleteUserVehicle,
            setPrimaryVehicle
        }}>
            {children}
        </AuthContext.Provider>
    );
};