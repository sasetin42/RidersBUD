import React, { createContext, useState, useContext, ReactNode, useEffect, useRef } from 'react';
import { Mechanic } from '../types';
import { db as firestore, auth } from '../firebase';
import { doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';
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

export const MechanicAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isMechanicAuthenticated, setIsMechanicAuthenticated] = useState<boolean>(false);
    const [mechanic, setMechanic] = useState<Mechanic | null>(null);
    const [loading, setLoading] = useState(true);
    const [firebaseUser, setFirebaseUser] = useState<FirebaseAuthUser | null>(null);
    const isLocationUpdatingRef = useRef<boolean>(false);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            setFirebaseUser(user);
            if (!user) {
                setMechanic(null);
                setIsMechanicAuthenticated(false);
                setLoading(false);
            }
        });

        return () => unsubscribeAuth();
    }, []);

    // Real-time listener for mechanic profile
    useEffect(() => {
        if (!firebaseUser) return;

        setLoading(true);
        const mechanicDocRef = doc(firestore, 'mechanics', firebaseUser.uid);
        
        const unsubscribe = onSnapshot(mechanicDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const mechData = { id: docSnap.id, ...docSnap.data() } as Mechanic;
                setMechanic(mechData);
                
                // Only authenticate if status is Active or Pending (allow Pending to see "Awaiting Approval")
                if (mechData.status === 'Active' || mechData.status === 'Pending') {
                    setIsMechanicAuthenticated(true);
                } else {
                    setIsMechanicAuthenticated(false);
                }
            } else {
                setMechanic(null);
                setIsMechanicAuthenticated(false);
            }
            setLoading(false);
        }, (err) => {
            console.error("Mechanic Profile Listener Error:", err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [firebaseUser]);

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
                                console.warn("[Location] Mechanic location error:", error.message);
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
        try {
            await setPersistence(auth, browserLocalPersistence);
            const userCredential = await signInWithEmailAndPassword(auth, email, pass);
            const mechDoc = await getDoc(doc(firestore, 'mechanics', userCredential.user.uid));
            
            if (!mechDoc.exists()) {
                await signOut(auth);
                throw new Error("Invalid mechanic credentials - Account not found in mechanics collection.");
            }
            
            const mechData = mechDoc.data() as Mechanic;
            if (mechData.status === 'Inactive') {
                await signOut(auth);
                throw new Error("Your account is currently inactive. Please contact support.");
            }
        } catch (error: any) {
            // Log is suppressed in index.html for identitytoolkit/auth/ patterns
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
                
                // Check if mechanic doc exists
                const mechanicDoc = await getDoc(doc(firestore, 'mechanics', fbUser.uid));
                if (!mechanicDoc.exists()) {
                    // We DON'T create the doc yet because we need mandatory fields (documents, specializations)
                    // The user will be redirected to "Complete Profile"
                    console.log("New Google Mechanic - Needs profile completion");
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
            console.error("Mechanic Google Login Error:", error);
            throw error;
        }
    };

    const logout = async () => {
        await signOut(auth);
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

            const newMechanic: Mechanic = {
                ...mechanicData,
                id: fbUser.uid,
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