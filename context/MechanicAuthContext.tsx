import React, { createContext, useState, useContext, ReactNode, useEffect, useRef } from 'react';
import { Mechanic } from '../types';
import { db as firestore, auth } from '../firebase';
import { doc, setDoc, onSnapshot, getDoc, collection, query, where, getDocs, deleteDoc, updateDoc, deleteField } from 'firebase/firestore';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged, 
    updateProfile,
    User as FirebaseAuthUser,
    GoogleAuthProvider,
    signInWithRedirect,
    getRedirectResult,
    setPersistence,
    browserLocalPersistence
} from 'firebase/auth';
import { usePresence } from '../hooks/usePresence';
import { storageService } from '../services/StorageService';
import { safeGetCurrentPosition, isGeolocationPermissionDenied } from '../utils/locationHelper';

interface MechanicAuthContextType {
    isMechanicAuthenticated: boolean;
    mechanic: Mechanic | null;
    loading: boolean;
    autoOfflineNotice: string | null;
    clearAutoOfflineNotice: () => void;
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
            autoOfflineNotice: null,
            clearAutoOfflineNotice: () => {},
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
    window.dispatchEvent(new Event('mechanicAuthChange'));
};

export const loadMechanicSessionFromStorage = (): { isBypassed: boolean; user: Mechanic | null } => {
    const isSession = localStorage.getItem('ridersbud_mechanic_session');
    if (!isSession) return { isBypassed: false, user: null };
    
    const isBypassed = localStorage.getItem('ridersbud_mechanic_bypass') === 'true';
    const userData = localStorage.getItem('ridersbud_mechanic_user_data');
    const user = userData ? JSON.parse(userData) : null;
    
    return { isBypassed, user };
};

export const MechanicAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const initialSession = loadMechanicSessionFromStorage();
    const hasInitialMechanicSession = localStorage.getItem('ridersbud_mechanic_session') === 'true';

    const [isMechanicAuthenticated, setIsMechanicAuthenticated] = useState<boolean>(() => !!(initialSession.user || hasInitialMechanicSession));
    const [mechanic, setMechanic] = useState<Mechanic | null>(() => initialSession.user);
    const [loading, setLoading] = useState<boolean>(() => !initialSession.isBypassed);
    const [firebaseUser, setFirebaseUser] = useState<FirebaseAuthUser | null>(null);
    const [isBypassed, setIsBypassed] = useState<boolean>(() => initialSession.isBypassed);
    const isLocationUpdatingRef = useRef<boolean>(false);
    const [autoOfflineNotice, setAutoOfflineNotice] = useState<string | null>(() => {
        return sessionStorage.getItem('ridersbud_mechanic_auto_offline_notice');
    });
    const lastUserActivityRef = useRef<number>(Date.now());

    const clearAutoOfflineNotice = () => {
        setAutoOfflineNotice(null);
        sessionStorage.removeItem('ridersbud_mechanic_auto_offline_notice');
    };

    // Listen for mechanic user interactions to update last active timestamp
    useEffect(() => {
        const handleActivity = () => {
            lastUserActivityRef.current = Date.now();
        };

        const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click'];
        events.forEach(evt => window.addEventListener(evt, handleActivity, { passive: true }));

        return () => {
            events.forEach(evt => window.removeEventListener(evt, handleActivity));
        };
    }, []);

    // Inactivity Auto-Offline Watcher:
    // If enabled in Admin Settings, automatically switches mechanic to OFFLINE
    // when inactive for greater than mechanicInactivityThresholdHours (default: 1 hour).
    useEffect(() => {
        if (!isMechanicAuthenticated || !mechanic || !mechanic.isOnline) return;

        // Reset activity baseline when mechanic goes online
        lastUserActivityRef.current = Date.now();

        const checkInactivity = async () => {
            try {
                // Read settings from localStorage cache or Firestore doc
                let autoOfflineEnabled = true;
                let thresholdHours = 1;

                const cachedSettingsStr = localStorage.getItem('ridersbud_settings_cache');
                if (cachedSettingsStr) {
                    try {
                        const parsed = JSON.parse(cachedSettingsStr);
                        if (parsed.mechanicAutoOfflineEnabled !== undefined) {
                            autoOfflineEnabled = parsed.mechanicAutoOfflineEnabled;
                        }
                        if (parsed.mechanicInactivityThresholdHours !== undefined) {
                            thresholdHours = Math.max(0.1, Number(parsed.mechanicInactivityThresholdHours));
                        }
                    } catch (_) {}
                }

                if (!autoOfflineEnabled) return;

                const thresholdMs = thresholdHours * 60 * 60 * 1000;
                const idleDuration = Date.now() - lastUserActivityRef.current;

                if (idleDuration >= thresholdMs) {
                    // Check if mechanic currently has an active ongoing job (En Route or In Progress)
                    // Ongoing jobs should NOT be interrupted
                    try {
                        const activeJobsSnap = await getDocs(
                            query(
                                collection(firestore, 'bookings'),
                                where('status', 'in', ['En Route', 'In Progress'])
                            )
                        );
                        const hasActiveJob = activeJobsSnap.docs.some(d => {
                            const data = d.data();
                            return data?.mechanic?.id === mechanic.id || data?.mechanicId === mechanic.id;
                        });

                        if (hasActiveJob) {
                            // Defer auto-offline while actively servicing an on-going job
                            lastUserActivityRef.current = Date.now();
                            return;
                        }
                    } catch (e) {
                        // If query fails, proceed with auto-offline check
                    }

                    console.warn(`[Auto-Offline] Mechanic inactive for ${Math.round(idleDuration / 60000)}m (threshold: ${thresholdHours}h). Switching to OFFLINE.`);
                    
                    // Trigger auto-offline in Firestore and local state
                    await updateOnlineStatus(false);

                    const hourDisplay = thresholdHours === 1 ? '1 hour' : `${thresholdHours} hours`;
                    const noticeMsg = `You were automatically set to OFFLINE due to ${hourDisplay} of inactivity. Tap Online to resume receiving jobs.`;
                    setAutoOfflineNotice(noticeMsg);
                    sessionStorage.setItem('ridersbud_mechanic_auto_offline_notice', noticeMsg);
                }
            } catch (err) {
                console.error("[Auto-Offline] Error checking inactivity:", err);
            }
        };

        // Check inactivity every 30 seconds
        const intervalId = setInterval(checkInactivity, 30000);
        return () => clearInterval(intervalId);
    }, [isMechanicAuthenticated, mechanic?.id, mechanic?.isOnline]);

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
        if (!activeUserId) {
            setLoading(false);
            return;
        }

        let cancelled = false;
        setLoading(true);
        const mechanicDocRef = doc(firestore, 'mechanics', activeUserId);
        
        const unsubscribe = onSnapshot(mechanicDocRef, (docSnap) => {
            if (cancelled) return;
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
            if (cancelled) return;
            console.error("Mechanic Profile Listener Error:", err);
            // Fall back to cached session if available rather than staying stuck
            const cached = loadMechanicSessionFromStorage();
            if (cached.user) {
                setMechanic(cached.user);
                setIsMechanicAuthenticated(true);
            }
            setLoading(false);
        });

        return () => {
            cancelled = true;
            try { unsubscribe(); } catch (_) {}
        };
    }, [firebaseUser?.uid, isBypassed, mechanic?.id]);

    // Live Location Tracking - High accuracy, immediate start, retry on failure
    useEffect(() => {
        let intervalId: any;
        let retryTimeoutId: any;

        if (isMechanicAuthenticated && mechanic?.isOnline && mechanic?.id) {
            const updateLocation = async () => {
                if (isLocationUpdatingRef.current) {
                    return;
                }

                const isDenied = await isGeolocationPermissionDenied();
                if (isDenied) {
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
                        safeGetCurrentPosition(
                            handleSuccess,
                            () => {
                                isLocationUpdatingRef.current = false;
                            },
                            { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
                        );
                    };

                    safeGetCurrentPosition(
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
            const loggedInMech = { ...mechData, id: userCredential.user.uid, isOnline: false };
            
            // Clear any conflicting customer session
            localStorage.removeItem('ridersbud_customer_session');
            localStorage.removeItem('ridersbud_customer_bypass');
            localStorage.removeItem('ridersbud_customer_user_data');

            setIsBypassed(false);
            setMechanic(loggedInMech);
            setIsMechanicAuthenticated(true);
            saveMechanicSessionToStorage(loggedInMech, false);
            setLoading(false);
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

                        // Clear any conflicting customer session
                        localStorage.removeItem('ridersbud_customer_session');
                        localStorage.removeItem('ridersbud_customer_bypass');
                        localStorage.removeItem('ridersbud_customer_user_data');

                        setIsBypassed(true);
                        setMechanic(updatedData);
                        setIsMechanicAuthenticated(true);
                        saveMechanicSessionToStorage(updatedData, true);
                        setLoading(false);
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
                        
                        // Clear any conflicting customer session
                        localStorage.removeItem('ridersbud_customer_session');
                        localStorage.removeItem('ridersbud_customer_bypass');
                        localStorage.removeItem('ridersbud_customer_user_data');

                        setIsBypassed(false);
                        setMechanic(newMechanic);
                        setIsMechanicAuthenticated(true);
                        saveMechanicSessionToStorage(newMechanic, false);
                        setLoading(false);
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
    };    const loginWithGoogle = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await setPersistence(auth, browserLocalPersistence);
            await signInWithRedirect(auth, provider);
        } catch (error: any) {
            console.error("Mechanic Google Login Error:", error);
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

                // Check if they are actually a customer trying to log in under mechanic tab
                const customerDoc = await getDoc(doc(firestore, 'customers', fbUser.uid));
                if (customerDoc.exists()) {
                    await signOut(auth);
                    return;
                }

                // Check if mechanic doc exists
                const mechanicDoc = await getDoc(doc(firestore, 'mechanics', fbUser.uid));
                if (!mechanicDoc.exists()) {
                    // New Google mechanic — needs profile completion
                    console.log("New Google Mechanic - Needs profile completion");
                }
            } catch (error: any) {
                console.error("Mechanic redirect result error:", error);
            }
        };
        handleRedirectResult();
    }, []);

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
        const normalizedEmail = (mechanicData.email || '').trim().toLowerCase();
        
        try {
            await setPersistence(auth, browserLocalPersistence);

            // 1. Strict Duplicate Check: Verify if email is already in use by an active Mechanic or Customer
            const mechanicsRef = collection(firestore, 'mechanics');
            const qMech = query(mechanicsRef, where('email', '==', normalizedEmail));
            const snapMech = await getDocs(qMech);
            if (!snapMech.empty) {
                throw new Error("This email address is already registered to an active Mechanic account. Please log in or use another email.");
            }

            const customersRef = collection(firestore, 'customers');
            const qCust = query(customersRef, where('email', '==', normalizedEmail));
            const snapCust = await getDocs(qCust);
            if (!snapCust.empty) {
                throw new Error("This email address is already registered to a Customer account.");
            }

            let fbUser = auth.currentUser;
            
            // If user isn't logged in, create them
            if (!fbUser) {
                try {
                    const userCredential = await createUserWithEmailAndPassword(auth, mechanicData.email, pass);
                    fbUser = userCredential.user;
                } catch (createErr: any) {
                    // If email already exists in Firebase Auth, but was DELETED from Firestore,
                    // purge the orphaned Firebase Auth account so the user can re-register!
                    if (createErr.code === 'auth/email-already-in-use') {
                        console.info("[MechanicAuthContext] Email exists in Firebase Auth but not in database. Purging orphaned user to allow re-registration...");
                        try {
                            const { getSecondaryAuth, deleteSecondaryAuth } = await import('../utils/secondaryAuth');
                            const { signInWithEmailAndPassword, deleteUser } = await import('firebase/auth');
                            const { auth: secondaryAuth, app: secondaryApp } = getSecondaryAuth();
                            try {
                                let orphanCred;
                                const fallbacks = [pass, 'password123', '123456', '123456#'];
                                for (const fb of fallbacks) {
                                    try {
                                        orphanCred = await signInWithEmailAndPassword(secondaryAuth, mechanicData.email, fb);
                                        break;
                                    } catch (_) {}
                                }
                                if (orphanCred?.user) {
                                    await deleteUser(orphanCred.user);
                                    console.info("[MechanicAuthContext] Successfully purged orphaned Firebase Auth account.");
                                }
                            } finally {
                                await deleteSecondaryAuth(secondaryApp);
                            }
                        } catch (purgeErr) {
                            console.warn("[MechanicAuthContext] Could not auto-purge orphaned user:", purgeErr);
                        }

                        // Retry user creation after orphan purge attempt
                        const userCredential = await createUserWithEmailAndPassword(auth, mechanicData.email, pass);
                        fbUser = userCredential.user;
                    } else {
                        throw createErr;
                    }
                }
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
            // Optimistically update local state
            const updatedMech = { ...mechanic, isOnline };
            setMechanic(updatedMech);
            saveMechanicSessionToStorage(updatedMech, isBypassed);

            // Write to Firestore with lastActive timestamp
            await setDoc(doc(firestore, 'mechanics', mechanic.id), { 
                isOnline,
                lastActive: new Date().toISOString()
            }, { merge: true });
        } catch (error) {
            console.error("Error updating online status:", error);
            // Revert state if error occurred
            setMechanic(mechanic);
            throw error;
        }
    };

    const updateMechanicProfile = async (updatedMechanic: Mechanic) => {
        try {
            const docRef = doc(firestore, 'mechanics', updatedMechanic.id);
            const { id, ...data } = updatedMechanic;
            const hasNoPayoutDetails = !updatedMechanic.payoutDetails || 
                Object.keys(updatedMechanic.payoutDetails).length === 0 || 
                !updatedMechanic.payoutDetails.accountNumber;

            if (hasNoPayoutDetails) {
                await updateDoc(docRef, {
                    ...data,
                    payoutDetails: deleteField(),
                    savedPayoutDestinations: updatedMechanic.savedPayoutDestinations || []
                });
            } else {
                await setDoc(docRef, updatedMechanic, { merge: true });
            }

            const cleanMechState: Mechanic = {
                ...updatedMechanic,
                ...(hasNoPayoutDetails ? { payoutDetails: undefined as any, savedPayoutDestinations: [] } : {})
            };
            setMechanic(cleanMechState);
            saveMechanicSessionToStorage(cleanMechState, isBypassed);
        } catch (error) {
            console.error("Mechanic Profile Update Error:", error);
            throw error;
        }
    };

    // Mechanics presence: update lastActive heartbeat ONLY, NEVER auto-force isOnline to true
    usePresence(isMechanicAuthenticated ? mechanic?.id || null : null, 'mechanics', false);

    return (
        <MechanicAuthContext.Provider value={{ 
            isMechanicAuthenticated, 
            mechanic, 
            loading, 
            autoOfflineNotice,
            clearAutoOfflineNotice,
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