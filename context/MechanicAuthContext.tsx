import React, { createContext, useState, useContext, ReactNode, useEffect, useRef } from 'react';
import { Mechanic } from '../types';
import { db as firestore, auth } from '../firebase';
import { doc, setDoc, onSnapshot, getDoc, collection, query, where, getDocs, deleteDoc, updateDoc } from 'firebase/firestore';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged, 
    updateProfile,
    User as FirebaseAuthUser,
    GoogleAuthProvider,
    signInWithPopup,
    setPersistence,
    browserLocalPersistence
} from 'firebase/auth';
import { usePresence } from '../hooks/usePresence';
import { storageService } from '../services/StorageService';

interface MechanicAuthContextType {
    isMechanicAuthenticated: boolean;
    mechanic: Mechanic | null;
    loading: boolean;
    login: (email: string, pass: string) => Promise<void>;
    loginWithGoogle: () => Promise<void>;
    logout: () => void;
    register: (mechanicData: Omit<Mechanic, 'id' | 'status' | 'rating' | 'reviews' | 'reviewsList' | 'password'> & { password?: string }, licenseFile?: File, idFile?: File, portfolioFiles?: File[]) => Promise<void>;
    updateMechanicProfile: (updatedMechanic: Mechanic) => Promise<void>;
    updateOnlineStatus: (isOnline: boolean) => Promise<void>;
}

const MechanicAuthContext = createContext<MechanicAuthContextType | undefined>(undefined);

export const useMechanicAuth = () => {
    const context = useContext(MechanicAuthContext);
    if (context === undefined) {
        return {
            isMechanicAuthenticated: false,
            mechanic: null,
            loading: true,
            login: async () => {},
            loginWithGoogle: async () => {},
            logout: async () => {},
            register: async () => {},
            updateMechanicProfile: async () => {},
            updateOnlineStatus: async () => {}
        } as unknown as MechanicAuthContextType;
    }
    return context;
};

const saveMechanicSessionToStorage = (user: Mechanic | null, isBypassed: boolean) => {
    if (user) {
        localStorage.setItem('ridersbud_mechanic_session', 'true');
        localStorage.setItem('ridersbud_mechanic_bypass', isBypassed ? 'true' : 'false');
        localStorage.setItem('ridersbud_mechanic_user_data', JSON.stringify(user));
    } else {
        localStorage.removeItem('ridersbud_mechanic_session');
        localStorage.removeItem('ridersbud_mechanic_bypass');
        localStorage.removeItem('ridersbud_mechanic_user_data');
    }
};

const loadMechanicSessionFromStorage = (): { isBypassed: boolean; user: Mechanic | null } => {
    const isSession = localStorage.getItem('ridersbud_mechanic_session');
    if (!isSession) return { isBypassed: false, user: null };
    
    const isBypassed = localStorage.getItem('ridersbud_mechanic_bypass') === 'true';
    const userData = localStorage.getItem('ridersbud_mechanic_user_data');
    const user = userData ? JSON.parse(userData) : null;
    
    return { isBypassed, user };
};

export const MechanicAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isMechanicAuthenticated, setIsMechanicAuthenticated] = useState<boolean>(false);
    const [mechanic, setMechanic] = useState<Mechanic | null>(null);
    const [loading, setLoading] = useState(true);
    const [firebaseUser, setFirebaseUser] = useState<FirebaseAuthUser | null>(null);
    const [isBypassed, setIsBypassed] = useState(false);
    const isLocationUpdatingRef = useRef<boolean>(false);

    useEffect(() => {
        const savedSession = loadMechanicSessionFromStorage();
        if (savedSession.isBypassed && savedSession.user) {
            setIsBypassed(true);
            setMechanic(savedSession.user);
            setIsMechanicAuthenticated(true);
            setLoading(false);
            return;
        }

        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            setFirebaseUser(user);
            if (!user) {
                if (!loadMechanicSessionFromStorage().isBypassed) {
                    setMechanic(null);
                    setIsMechanicAuthenticated(false);
                    setLoading(false);
                }
            } else {
                setIsBypassed(false);
            }
        });

        return () => unsubscribeAuth();
    }, []);

    // Real-time listener for mechanic profile
    useEffect(() => {
        const activeUserId = firebaseUser?.uid || (isBypassed ? mechanic?.id : null);
        if (!activeUserId) return;

        setLoading(true);
        const mechanicDocRef = doc(firestore, 'mechanics', activeUserId);
        
        const unsubscribe = onSnapshot(mechanicDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const mechData = { id: docSnap.id, ...docSnap.data() } as Mechanic;
                setMechanic(mechData);
                
                // Only authenticate if status is Active or Pending (allow Pending to see "Awaiting Approval")
                if (mechData.status === 'Active' || mechData.status === 'Pending') {
                    setIsMechanicAuthenticated(true);
                    saveMechanicSessionToStorage(mechData, isBypassed);
                } else {
                    setIsMechanicAuthenticated(false);
                    saveMechanicSessionToStorage(null, false);
                }
            } else {
                setMechanic(null);
                setIsMechanicAuthenticated(false);
                saveMechanicSessionToStorage(null, false);
            }
            setLoading(false);
        }, (err) => {
            console.error("Mechanic Profile Listener Error:", err);
            setLoading(false);
        });

        return () => { try { unsubscribe(); } catch (_) {} };
    }, [firebaseUser, isBypassed, mechanic?.id]);

    // Live Location Tracking - High accuracy, immediate start, retry on failure
    useEffect(() => {
        let intervalId: any;
        let retryTimeoutId: any;

        if (isMechanicAuthenticated && mechanic?.isOnline && mechanic?.id) {
            const updateLocation = () => {
                if (isLocationUpdatingRef.current) {
                    console.log("[Location] Update already in progress. Skipping duplicate call.");
                    return;
                }

                if ('geolocation' in navigator) {
                    isLocationUpdatingRef.current = true;

                    const handleSuccess = async (position: GeolocationPosition) => {
                        const { latitude, longitude, accuracy } = position.coords;
                        try {
                            await setDoc(doc(firestore, 'mechanics', mechanic.id), {
                                lat: latitude,
                                lng: longitude,
                                locationAccuracy: accuracy,
                                lastLocationUpdate: new Date().toISOString()
                            }, { merge: true });
                        } catch (error) {
                            console.warn("[Location] Firestore write failed:", error);
                        } finally {
                            isLocationUpdatingRef.current = false;
                        }
                    };

                    const handleFallback = () => {
                        navigator.geolocation.getCurrentPosition(
                            handleSuccess,
                            () => {
                                isLocationUpdatingRef.current = false;
                            },
                            { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
                        );
                    };

                    navigator.geolocation.getCurrentPosition(
                        handleSuccess,
                        (error) => {
                            if (error.code === error.TIMEOUT) {
                                handleFallback();
                            } else {
                                isLocationUpdatingRef.current = false;
                            }
                        },
                        { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
                    );
                }
            };

            updateLocation();
            intervalId = setInterval(updateLocation, 30000);
        }
        
        return () => {
            if (intervalId) clearInterval(intervalId);
            if (retryTimeoutId) clearTimeout(retryTimeoutId);
        };
    }, [isMechanicAuthenticated, mechanic?.isOnline, mechanic?.id]);

    const login = async (email: string, pass: string) => {
        // First check if this email exists in customers collection
        const normalizedEmail = email.trim().toLowerCase();
        const customersRef = collection(firestore, 'customers');
        const q = query(customersRef, where('email', '==', normalizedEmail));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            throw new Error("This account is not registered as a Mechanic. Please select the correct tab.");
        }

        try {
            await setPersistence(auth, browserLocalPersistence);
            const userCredential = await signInWithEmailAndPassword(auth, email, pass);
            
            // Double check by UID
            const customerSnap = await getDoc(doc(firestore, 'customers', userCredential.user.uid));
            if (customerSnap.exists()) {
                await signOut(auth);
                throw new Error("This account is not registered as a Mechanic. Please select the correct tab.");
            }

            const mechDoc = await getDoc(doc(firestore, 'mechanics', userCredential.user.uid));
            if (!mechDoc.exists()) {
                await signOut(auth);
                throw new Error("This account is not registered as a Mechanic. Please select the correct tab.");
            }
            
            const mechData = mechDoc.data() as Mechanic;
            if (mechData.status === 'Inactive') {
                await signOut(auth);
                throw new Error("Your account is currently inactive. Please contact support.");
            }

            // Set offline status in Firestore upon login
            await setDoc(doc(firestore, 'mechanics', userCredential.user.uid), { isOnline: false }, { merge: true });
            
            setIsBypassed(false);
            saveMechanicSessionToStorage(null, false);
        } catch (error: any) {
            console.error("Login failed:", error);
            
            // Check if user is in Firestore and passwords match for local bypass
            try {
                const mechanicsRef = collection(firestore, 'mechanics');
                const qBypass = query(mechanicsRef, where('email', '==', normalizedEmail));
                const querySnapshotBypass = await getDocs(qBypass);
                
                if (!querySnapshotBypass.empty) {
                    const mechDoc = querySnapshotBypass.docs[0];
                    const mechData = { id: mechDoc.id, ...mechDoc.data() } as Mechanic;
                    
                    if (mechData.password === pass) {
                        if (mechData.status === 'Inactive') {
                            throw new Error("Your account is currently inactive. Please contact support.");
                        }
                        console.info("[AuthBypass] Signing in legacy/mock mechanic via local bypass...");
                        
                        // Set offline status in Firestore upon local bypass login
                        await setDoc(doc(firestore, 'mechanics', mechData.id), { isOnline: false }, { merge: true });
                        const updatedData = { ...mechData, isOnline: false };

                        setIsBypassed(true);
                        setMechanic(updatedData);
                        setIsMechanicAuthenticated(true);
                        saveMechanicSessionToStorage(updatedData, true);
                        return;
                    }
                }
            } catch (bypassErr: any) {
                console.error("[AuthBypass] Mechanic bypass login check failed:", bypassErr);
                if (bypassErr.message && bypassErr.message.includes("inactive")) {
                    throw bypassErr;
                }
            }
            
            // Self-healing migration for mock mechanics in development
            if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
                try {
                    const mechanicsRef = collection(firestore, 'mechanics');
                    const qMigration = query(mechanicsRef, where('email', '==', normalizedEmail));
                    const querySnapshotMigration = await getDocs(qMigration);
                    
                    if (!querySnapshotMigration.empty) {
                        const oldDoc = querySnapshotMigration.docs[0];
                        const oldData = oldDoc.data() as Mechanic;
                        const oldId = oldDoc.id;
                        
                        console.info(`[AuthSelfHealing] Found legacy mechanic doc for ${normalizedEmail}. Registering in Firebase Auth...`);
                        
                        // Create user in Firebase Auth
                        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
                        const newUid = userCredential.user.uid;
                        
                        // Copy data to new document
                        const newMechanic: Mechanic = {
                            ...oldData,
                            id: newUid
                        };
                        await setDoc(doc(firestore, 'mechanics', newUid), newMechanic);
                        
                        // Delete old document if it has a different ID
                        if (oldId !== newUid) {
                            await deleteDoc(doc(firestore, 'mechanics', oldId));
                            
                            // Proactively update any bookings that referenced the old mechanic ID
                            try {
                                const bookingsRef = collection(firestore, 'bookings');
                                const bookingsQuery = query(bookingsRef, where('mechanicId', '==', oldId));
                                const bookingsSnap = await getDocs(bookingsQuery);
                                for (const bookingDoc of bookingsSnap.docs) {
                                    await updateDoc(doc(firestore, 'bookings', bookingDoc.id), {
                                        mechanicId: newUid,
                                        'mechanic.id': newUid
                                    });
                                }
                                console.info(`[AuthSelfHealing] Migrated ${bookingsSnap.size} bookings from ${oldId} to ${newUid}`);
                            } catch (bookingErr) {
                                console.warn("[AuthSelfHealing] Failed to migrate bookings:", bookingErr);
                            }
                        }
                        
                        // Check if account status is Inactive
                        if (newMechanic.status === 'Inactive') {
                            await signOut(auth);
                            throw new Error("Your account is currently inactive. Please contact support.");
                        }
                        
                        return;
                    }
                } catch (migrationError: any) {
                    console.error("[AuthSelfHealing] Mechanic migration failed:", migrationError);
                    if (migrationError.message && migrationError.message.includes("inactive")) {
                        throw migrationError;
                    }
                }
            }
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
                
                // Check if they are actually a customer trying to log in under mechanic tab
                const customerDoc = await getDoc(doc(firestore, 'customers', fbUser.uid));
                if (customerDoc.exists()) {
                    await signOut(auth);
                    throw new Error("This account is not registered as a Mechanic. Please select the correct tab.");
                }

                // Check if mechanic doc exists
                const mechanicDoc = await getDoc(doc(firestore, 'mechanics', fbUser.uid));
                if (!mechanicDoc.exists()) {
                    // We DON'T create the doc yet because we need mandatory fields (documents, specializations)
                    // The user will be redirected to "Complete Profile"
                    console.log("New Google Mechanic - Needs profile completion");
                }
            } catch (popupError: any) {
                const isBlockError = popupError.code === 'auth/popup-blocked' || 
                    popupError.code === 'auth/popup-closed-by-user' || 
                    popupError.code === 'auth/cancelled-popup-request' ||
                    popupError.code === 'auth/network-request-failed' ||
                    (popupError.message && (
                        popupError.message.includes('COOP') || 
                        popupError.message.includes('Cross-Origin-Opener-Policy') ||
                        popupError.message.includes('block') ||
                        popupError.message.includes('blocked') ||
                        popupError.message.includes('failed') ||
                        popupError.message.includes('fetch')
                    )) ||
                    (popupError.name === 'DOMException' || popupError.message?.includes('closed'));

                if (isBlockError) {
                    console.info("Popup blocked, network failed, or COOP isolation triggered. Trying redirect sign-in...", popupError);
                    const { signInWithRedirect } = await import('firebase/auth');
                    await signInWithRedirect(auth, provider);
                } else {
                    throw popupError;
                }
            }
        } catch (error: any) {
            console.error("Mechanic Google Login Error:", error);
            throw error;
        }
    };

    const logout = async () => {
        await signOut(auth);
        setIsBypassed(false);
        saveMechanicSessionToStorage(null, false);
    };

    const register = async (
        mechanicData: Omit<Mechanic, 'id' | 'status' | 'rating' | 'reviews' | 'reviewsList' | 'password'> & { password?: string },
        licenseFile?: File,
        idFile?: File,
        portfolioFiles?: File[]
    ) => {
        const pass = mechanicData.password || 'password123';
        
        try {
            await setPersistence(auth, browserLocalPersistence);
            let fbUser = auth.currentUser;
            
            // If user isn't logged in, create them
            if (!fbUser) {
                const userCredential = await createUserWithEmailAndPassword(auth, mechanicData.email, pass);
                fbUser = userCredential.user;
            } else {
                // If logged in (e.g. Google), verify email matches or just proceed
                console.log("Using existing authenticated user for mechanic registration:", fbUser.uid);
            }
            
            if (!fbUser) throw new Error("Authentication failed during registration");

            await updateProfile(fbUser, { displayName: mechanicData.name });

            let licenseUrl = '';
            let idImageUrl = '';
            let portfolioImageUrls: string[] = [];
            
            if (licenseFile || idFile) {
                const urls = await storageService.uploadMechanicDocs(fbUser.uid, licenseFile, idFile);
                licenseUrl = urls.licenseUrl || '';
                idImageUrl = urls.idUrl || '';
            }
            
            if (portfolioFiles && portfolioFiles.length > 0) {
                const uploadPromises = portfolioFiles.map((file, index) => 
                    storageService.uploadFile(`mechanics/${fbUser.uid}/portfolio_${Date.now()}_${index}.jpg`, file)
                );
                portfolioImageUrls = await Promise.all(uploadPromises);
            }

            const settingsSnap = await getDoc(doc(firestore, 'settings', 'main'));
            const defaultImg = (settingsSnap.exists() ? settingsSnap.data()?.defaultMechanicImageUrl : null) || '/assets/logo.png';

            const newMechanic: Mechanic = {
                ...mechanicData,
                id: fbUser.uid,
                imageUrl: defaultImg,
                password: 'removed',
                status: 'Pending',
                rating: 0,
                reviews: 0,
                reviewsList: [],
                walletBalance: 0,
                totalEarnings: 0,
                businessLicenseUrl: licenseUrl || '',
                documents: idImageUrl ? [idImageUrl] : [],
                portfolioImages: portfolioImageUrls,
                verificationDocuments: {
                    verificationStatus: 'Pending',
                    idImageUrl: idImageUrl || '',
                    licenseUrl: licenseUrl || ''
                },
                isOnline: false,
                specializations: mechanicData.specializations || [],
                availability: mechanicData.availability || {
                    monday: { isAvailable: true, startTime: '08:00', endTime: '17:00' },
                    tuesday: { isAvailable: true, startTime: '08:00', endTime: '17:00' },
                    wednesday: { isAvailable: true, startTime: '08:00', endTime: '17:00' },
                    thursday: { isAvailable: true, startTime: '08:00', endTime: '17:00' },
                    friday: { isAvailable: true, startTime: '08:00', endTime: '17:00' },
                    saturday: { isAvailable: true, startTime: '09:00', endTime: '15:00' },
                    sunday: { isAvailable: false, startTime: '09:00', endTime: '15:00' }
                }
            };

            await setDoc(doc(firestore, 'mechanics', fbUser.uid), newMechanic);
            console.log("Mechanic record created/updated successfully in Firestore");
        } catch (error: any) {
            console.error("Mechanic registration error:", error);
            throw error;
        }
    };

    const updateOnlineStatus = async (isOnline: boolean) => {
        if (!mechanic) return;
        try {
            await setDoc(doc(firestore, 'mechanics', mechanic.id), { isOnline }, { merge: true });
        } catch (error) {
            console.error("Error updating online status:", error);
        }
    };

    const updateMechanicProfile = async (updatedMechanic: Mechanic) => {
        try {
            await setDoc(doc(firestore, 'mechanics', updatedMechanic.id), updatedMechanic, { merge: true });
        } catch (error) {
            console.error("Mechanic Profile Update Error:", error);
            throw error;
        }
    };

    usePresence(isMechanicAuthenticated ? mechanic?.id || null : null, 'mechanics');

    return (
        <MechanicAuthContext.Provider value={{ 
            isMechanicAuthenticated, 
            mechanic, 
            loading, 
            login, 
            loginWithGoogle,
            logout, 
            register, 
            updateMechanicProfile, 
            updateOnlineStatus 
        }}>
            {children}
        </MechanicAuthContext.Provider>
    );
};