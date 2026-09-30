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
    FacebookAuthProvider,
    signInWithRedirect,
    getRedirectResult,
    setPersistence,
    browserLocalPersistence
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, updateDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
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
    addFavoriteMechanic: (mechanicId: string) => Promise<void>;
    removeFavoriteMechanic: (mechanicId: string) => Promise<void>;
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
            setPrimaryVehicle: async () => {},
            addFavoriteMechanic: async () => {},
            removeFavoriteMechanic: async () => {}
        } as unknown as AuthContextType;
    }
    return context;
};

const saveCustomerSessionToStorage = (user: Customer | null, isBypassed: boolean) => {
    if (user) {
        localStorage.setItem('ridersbud_customer_session', 'true');
        localStorage.setItem('ridersbud_customer_bypass', isBypassed ? 'true' : 'false');
        localStorage.setItem('ridersbud_customer_user_data', JSON.stringify(user));
    } else {
        localStorage.removeItem('ridersbud_customer_session');
        localStorage.removeItem('ridersbud_customer_bypass');
        localStorage.removeItem('ridersbud_customer_user_data');
    }
    window.dispatchEvent(new Event('customerAuthChange'));
};

const loadCustomerSessionFromStorage = (): { isBypassed: boolean; user: Customer | null } => {
    const isSession = localStorage.getItem('ridersbud_customer_session');
    if (!isSession) return { isBypassed: false, user: null };
    
    const isBypassed = localStorage.getItem('ridersbud_customer_bypass') === 'true';
    const userData = localStorage.getItem('ridersbud_customer_user_data');
    const user = userData ? JSON.parse(userData) : null;
    
    return { isBypassed, user };
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const initialSession = loadCustomerSessionFromStorage();
    const hasInitialCustomerSession = localStorage.getItem('ridersbud_customer_session') === 'true';

    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!(initialSession.user || hasInitialCustomerSession));
    const [user, setUser] = useState<Customer | null>(() => initialSession.user);
    const [loading, setLoading] = useState<boolean>(() => !initialSession.isBypassed);
    const [firebaseUser, setFirebaseUser] = useState<FirebaseAuthUser | null>(null);
    const [isBypassed, setIsBypassed] = useState<boolean>(() => initialSession.isBypassed);

    useEffect(() => {
        const savedSession = loadCustomerSessionFromStorage();
        if (savedSession.isBypassed && savedSession.user) {
            setIsBypassed(true);
            setUser(savedSession.user);
            setIsAuthenticated(true);
            setLoading(false);
            return;
        }

        const unsubscribeAuth = onAuthStateChanged(auth, (fbUser) => {
            setFirebaseUser(fbUser);
            if (!fbUser) {
                if (!loadCustomerSessionFromStorage().isBypassed) {
                    setUser(null);
                    setIsAuthenticated(false);
                    setLoading(false);
                }
            } else {
                setIsBypassed(false);
            }
        });

        return () => unsubscribeAuth();
    }, []);

    useEffect(() => {
        const firebaseUid = firebaseUser?.uid;
        const activeUserId = firebaseUid || (isBypassed ? user?.id : null);
        if (!activeUserId) return;

        let unsubscribeSnapshot: (() => void) | null = null;
        let cancelled = false;

        const setupListener = async () => {
            setLoading(true);

            try {
                if (firebaseUid) {
                    // Guard: check if this uid belongs to a mechanic first
                    const mechanicSnap = await getDoc(doc(firestore, 'mechanics', firebaseUid));
                    if (cancelled) return;

                    if (mechanicSnap.exists()) {
                        // This is a mechanic session — AuthContext is not responsible for it
                        setUser(null);
                        setIsAuthenticated(false);
                        setLoading(false);
                        return; // Do NOT set up any customer snapshot
                    }
                }
            } catch (_err) {
                // If mechanic check fails (permission denied / network), fall through
                // so normal customers are handled correctly
                if (cancelled) return;
            }

            // Not a mechanic — subscribe to the customer profile
            const userDocRef = doc(firestore, 'customers', activeUserId);
            unsubscribeSnapshot = onSnapshot(userDocRef, (docSnap) => {
                if (cancelled) return;
                if (docSnap.exists()) {
                    const userData = { id: docSnap.id, ...docSnap.data() } as Customer;
                    setUser(userData);
                    setIsAuthenticated(true);
                    saveCustomerSessionToStorage(userData, isBypassed);
                } else {
                    setUser(null);
                    setIsAuthenticated(false);
                    saveCustomerSessionToStorage(null, false);
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
            try { unsubscribeSnapshot?.(); } catch (_) {}
        };
    }, [firebaseUser?.uid, isBypassed, user?.id]);

    const loginWithCredentials = async (email: string, pass: string) => {
        // First check if this email exists in mechanics collection
        const normalizedEmail = email.trim().toLowerCase();
        const mechanicsRef = collection(firestore, 'mechanics');
        const q = query(mechanicsRef, where('email', '==', normalizedEmail));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            throw new Error("This account is not registered as a Customer. Please select the correct tab.");
        }

        try {
            await setPersistence(auth, browserLocalPersistence);
            const userCredential = await signInWithEmailAndPassword(auth, email, pass);
            
            // Double check by UID
            const mechanicSnap = await getDoc(doc(firestore, 'mechanics', userCredential.user.uid));
            if (mechanicSnap.exists()) {
                await signOut(auth);
                throw new Error("This account is not registered as a Customer. Please select the correct tab.");
            }

            setIsBypassed(false);
            saveCustomerSessionToStorage(null, false);
        } catch (error: any) {
            console.error("Login failed:", error);
            
            // Check if user is in Firestore and passwords match for local bypass
            try {
                const customersRef = collection(firestore, 'customers');
                const qBypass = query(customersRef, where('email', '==', normalizedEmail));
                const querySnapshotBypass = await getDocs(qBypass);
                
                if (!querySnapshotBypass.empty) {
                    const customerDoc = querySnapshotBypass.docs[0];
                    const customerData = { id: customerDoc.id, ...customerDoc.data() } as Customer;
                    
                    if (customerData.password === pass) {
                        console.info("[AuthBypass] Signing in legacy/mock customer via local bypass...");
                        setIsBypassed(true);
                        setUser(customerData);
                        setIsAuthenticated(true);
                        saveCustomerSessionToStorage(customerData, true);
                        return;
                    }
                }
            } catch (bypassErr) {
                console.error("[AuthBypass] Customer bypass login check failed:", bypassErr);
            }
            
            // Self-healing migration for mock users in development
            if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
                try {
                    const customersRef = collection(firestore, 'customers');
                    const qMigration = query(customersRef, where('email', '==', normalizedEmail));
                    const querySnapshotMigration = await getDocs(qMigration);
                    
                    if (!querySnapshotMigration.empty) {
                        const oldDoc = querySnapshotMigration.docs[0];
                        const oldData = oldDoc.data() as Customer;
                        const oldId = oldDoc.id;
                        
                        console.info(`[AuthSelfHealing] Found legacy customer doc for ${normalizedEmail}. Registering in Firebase Auth...`);
                        
                        // Create user in Firebase Auth
                        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
                        const newUid = userCredential.user.uid;
                        
                        // Copy data to new document
                        const newCustomer: Customer = {
                            ...oldData,
                            id: newUid
                        };
                        await setDoc(doc(firestore, 'customers', newUid), newCustomer);
                        
                        // Delete old document if it has a different ID
                        if (oldId !== newUid) {
                            await deleteDoc(doc(firestore, 'customers', oldId));
                            
                            // Proactively update any bookings that referenced the old customer ID
                            try {
                                const bookingsRef = collection(firestore, 'bookings');
                                const bookingsQuery = query(bookingsRef, where('customerId', '==', oldId));
                                const bookingsSnap = await getDocs(bookingsQuery);
                                for (const bookingDoc of bookingsSnap.docs) {
                                    await updateDoc(doc(firestore, 'bookings', bookingDoc.id), {
                                        customerId: newUid
                                    });
                                }
                                console.info(`[AuthSelfHealing] Migrated ${bookingsSnap.size} bookings from ${oldId} to ${newUid}`);
                            } catch (bookingErr) {
                                console.warn("[AuthSelfHealing] Failed to migrate bookings:", bookingErr);
                            }
                        }
                        
                        // Success! Since createUserWithEmailAndPassword also signs in, we are logged in.
                        return;
                    }
                } catch (migrationError) {
                    console.error("[AuthSelfHealing] Customer migration failed:", migrationError);
                }
            }
            throw error;
        }
    };    const loginWithGoogle = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await setPersistence(auth, browserLocalPersistence);
            await signInWithRedirect(auth, provider);
        } catch (error: any) {
            console.error("Google Login Error:", error);
            throw error;
        }
    };

    // Handle redirect result on mount (completes the redirect sign-in flow)
    useEffect(() => {
        const handleRedirectResult = async () => {
            try {
                const result = await getRedirectResult(auth);
                if (!result) return;

                const fbUser = result.user;
                const hint = sessionStorage.getItem('auth_type_hint');
                if (hint === 'mechanic') {
                    const customerDoc = await getDoc(doc(firestore, 'customers', fbUser.uid));
                    if (customerDoc.exists()) {
                        await signOut(auth);
                        return;
                    }
                    return;
                }

                const mechanicDoc = await getDoc(doc(firestore, 'mechanics', fbUser.uid));
                if (mechanicDoc.exists()) {
                    await signOut(auth);
                    return;
                }

                const customerDoc = await getDoc(doc(firestore, 'customers', fbUser.uid));
                if (!customerDoc.exists()) {
                    const settingsSnap = await getDoc(doc(firestore, 'settings', 'main'));
                    const defaultPic = (settingsSnap.exists() ? settingsSnap.data()?.defaultCustomerImageUrl : null) || '/assets/logo.png';
                    const newCustomer: Customer = {
                        id: fbUser.uid,
                        name: fbUser.displayName || 'Google User',
                        email: fbUser.email || '',
                        phone: '',
                        vehicles: [],
                        picture: fbUser.photoURL || defaultPic,
                        registrationDate: new Date().toISOString(),
                        status: 'Active'
                    };
                    await setDoc(doc(firestore, 'customers', fbUser.uid), newCustomer);
                }
            } catch (error: any) {
                // If user came from mechanic tab via redirect, redirect to mechanic login instead
                if (error.message?.includes('not registered as a Mechanic') || error.message?.includes('not registered as a Customer')) {
                    console.info("Redirect result was for wrong role tab:", error.message);
                    return;
                }
                console.error("Redirect result error:", error);
            }
        };
        handleRedirectResult();
    }, []);
 
    const loginWithFacebook = async () => {
        const provider = new FacebookAuthProvider();
        try {
            await setPersistence(auth, browserLocalPersistence);
            await signInWithRedirect(auth, provider);
        } catch (error: any) {
            console.error("Facebook Login Error:", error);
            throw error;
        }
    };

    const logout = async () => {
        await signOut(auth);
        setIsBypassed(false);
        saveCustomerSessionToStorage(null, false);
    };

    const register = async (userData: Omit<Customer, 'id' | 'vehicles'> & { vehicle?: Omit<Vehicle, 'id'> }) => {
        try {
            await setPersistence(auth, browserLocalPersistence);
            const { password, vehicle, ...restOfData } = userData;
            const userCredential = await createUserWithEmailAndPassword(auth, userData.email, password || 'password123');
            const fbUser = userCredential.user;
            
            await updateProfile(fbUser, { displayName: userData.name });

            const settingsSnap = await getDoc(doc(firestore, 'settings', 'main'));
            const defaultPic = (settingsSnap.exists() ? settingsSnap.data()?.defaultCustomerImageUrl : null) || '/assets/logo.png';

            const hasVehicle = !!(vehicle && vehicle.make && vehicle.plateNumber);
            const newCustomer: Customer = {
                ...restOfData,
                id: fbUser.uid,
                vehicles: vehicle ? [{ ...vehicle, id: Date.now().toString(), isPrimary: true }] : [],
                picture: defaultPic,
                registrationDate: new Date().toISOString(),
                status: 'Active',
                profileCompleted: hasVehicle,
                profileCompletedAt: hasVehicle ? new Date().toISOString() : undefined
            };

            await setDoc(doc(firestore, 'customers', fbUser.uid), newCustomer);
            saveCustomerSessionToStorage(newCustomer, false);
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
    const addFavoriteMechanic = async (mechanicId: string) => {
        if (!auth.currentUser || !user) return;
        try {
            const currentFavorites = user.favoriteMechanicIds || [];
            if (!currentFavorites.includes(mechanicId)) {
                const updatedFavorites = [...currentFavorites, mechanicId];
                const userDocRef = doc(firestore, 'customers', auth.currentUser.uid);
                await updateDoc(userDocRef, { favoriteMechanicIds: updatedFavorites });
            }
        } catch (error) {
            console.error("Add Favorite Mechanic Error:", error);
            throw error;
        }
    };

    const removeFavoriteMechanic = async (mechanicId: string) => {
        if (!auth.currentUser || !user) return;
        try {
            const currentFavorites = user.favoriteMechanicIds || [];
            const updatedFavorites = currentFavorites.filter(id => id !== mechanicId);
            const userDocRef = doc(firestore, 'customers', auth.currentUser.uid);
            await updateDoc(userDocRef, { favoriteMechanicIds: updatedFavorites });
        } catch (error) {
            console.error("Remove Favorite Mechanic Error:", error);
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
            setPrimaryVehicle,
            addFavoriteMechanic,
            removeFavoriteMechanic
        }}>
            {children}
        </AuthContext.Provider>
    );
};