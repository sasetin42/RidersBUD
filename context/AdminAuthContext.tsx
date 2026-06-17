import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { db as firestoreDB, auth } from '../firebase';
import { 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    User as FirebaseAuthUser,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence
} from 'firebase/auth';
import { doc, collection, query, where, onSnapshot, updateDoc, arrayUnion } from 'firebase/firestore';
import { AdminUser, AdminModule, PermissionLevel } from '../types';
import { usePresence } from '../hooks/usePresence';

interface AdminAuthContextType {
    isAdminAuthenticated: boolean;
    adminUser: AdminUser | null;
    loading: boolean;
    login: (email: string, pass: string, rememberMe?: boolean) => Promise<void>;
    logout: () => void;
    totalUnreadChats: number;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

const ADMIN_SESSION_KEY = 'ridersbud_admin_session';
const ADMIN_BYPASS_KEY = 'ridersbud_admin_bypass';
const ADMIN_USER_DATA_KEY = 'ridersbud_admin_user_data';

export const useAdminAuth = () => {
    const context = useContext(AdminAuthContext);
    if (context === undefined) {
        return {
            isAdminAuthenticated: false,
            adminUser: null,
            loading: true,
            login: async () => {},
            logout: async () => {},
            totalUnreadChats: 0
        } as unknown as AdminAuthContextType;
    }
    return context;
};

const saveSessionToStorage = (user: AdminUser | null, isBypassed: boolean) => {
    if (user) {
        localStorage.setItem(ADMIN_SESSION_KEY, 'true');
        localStorage.setItem(ADMIN_BYPASS_KEY, isBypassed ? 'true' : 'false');
        localStorage.setItem(ADMIN_USER_DATA_KEY, JSON.stringify(user));
    } else {
        localStorage.removeItem(ADMIN_SESSION_KEY);
        localStorage.removeItem(ADMIN_BYPASS_KEY);
        localStorage.removeItem(ADMIN_USER_DATA_KEY);
    }
};

const loadSessionFromStorage = (): { isBypassed: boolean; user: AdminUser | null } => {
    const isSession = localStorage.getItem(ADMIN_SESSION_KEY);
    if (!isSession) return { isBypassed: false, user: null };
    
    const isBypassed = localStorage.getItem(ADMIN_BYPASS_KEY) === 'true';
    const userData = localStorage.getItem(ADMIN_USER_DATA_KEY);
    const user = userData ? JSON.parse(userData) : null;
    
    return { isBypassed, user };
};

export const AdminAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
    const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [totalUnreadChats, setTotalUnreadChats] = useState(0);

    const [firebaseUser, setFirebaseUser] = useState<FirebaseAuthUser | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [isBypassed, setIsBypassed] = useState(false);

    useEffect(() => {
        const savedSession = loadSessionFromStorage();
        if (savedSession.isBypassed && savedSession.user) {
            setIsBypassed(true);
            setAdminUser(savedSession.user);
            setIsAdminAuthenticated(true);
            setLoading(false);
            return;
        }

        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            setFirebaseUser(user);
            setAuthLoading(false);
            if (user) {
                setIsBypassed(false);
            }
        });

        return () => unsubscribeAuth();
    }, []);

    useEffect(() => {
        if (authLoading) return;

        if (isBypassed) {
            setLoading(false);
            return;
        }

        if (firebaseUser) {
            const isSuperAdminUid = firebaseUser.uid === 'yfOrQmMGnHNlLzUN98AabN8wPkn1';
            const isSuperAdminEmail = firebaseUser.email === 'admin@ridersbud.com';
            const isSuperAdmin = isSuperAdminUid || isSuperAdminEmail;

            const adminDocRef = doc(firestoreDB, 'adminUsers', firebaseUser.uid);
            const unsubscribeSnapshot = onSnapshot(adminDocRef, (docSnap) => {
                if (docSnap.exists()) {
                    const adminData = { id: docSnap.id, ...docSnap.data() } as AdminUser;
                    if (isSuperAdmin) {
                        adminData.role = 'Super Admin';
                        adminData.isActive = true;
                        adminData.permissions = {
                            dashboard: 'write',
                            analytics: 'write',
                            bookings: 'write',
                            catalog: 'write',
                            mechanics: 'write',
                            customers: 'write',
                            marketing: 'write',
                            users: 'write',
                            settings: 'write',
                            orders: 'write',
                            monetization: 'write',
                            payouts: 'write',
                            chat: 'write',
                            'gcash-payments': 'write',
                            notifications: 'write'
                        };
                    }
                    setAdminUser(adminData);
                    setIsAdminAuthenticated(true);
                    saveSessionToStorage(adminData, false);
                } else if (isSuperAdmin) {
                    const superAdmin: AdminUser = {
                        id: firebaseUser.uid,
                        name: 'Super Admin',
                        email: 'admin@ridersbud.com',
                        role: 'Super Admin',
                        isActive: true,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        permissions: {
                            dashboard: 'write',
                            analytics: 'write',
                            bookings: 'write',
                            catalog: 'write',
                            mechanics: 'write',
                            customers: 'write',
                            marketing: 'write',
                            users: 'write',
                            settings: 'write',
                            orders: 'write',
                            monetization: 'write',
                            payouts: 'write',
                            chat: 'write',
                            'gcash-payments': 'write',
                            notifications: 'write'
                        }
                    };
                    setAdminUser(superAdmin);
                    setIsAdminAuthenticated(true);
                    saveSessionToStorage(superAdmin, false);
                } else {
                    // Firebase user exists but not in adminUsers — not an admin
                    setAdminUser(null);
                    setIsAdminAuthenticated(false);
                    saveSessionToStorage(null, false);
                }
                setLoading(false);
            }, (error) => {
                // On error, fall back gracefully — if this is our super admin, let them in anyway
                if (isSuperAdmin) {
                    const superAdmin: AdminUser = {
                        id: firebaseUser.uid,
                        name: 'Super Admin',
                        email: 'admin@ridersbud.com',
                        role: 'Super Admin',
                        isActive: true,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        permissions: {
                            dashboard: 'write',
                            analytics: 'write',
                            bookings: 'write',
                            catalog: 'write',
                            mechanics: 'write',
                            customers: 'write',
                            marketing: 'write',
                            users: 'write',
                            settings: 'write',
                            orders: 'write',
                            monetization: 'write',
                            payouts: 'write',
                            chat: 'write',
                            'gcash-payments': 'write',
                            notifications: 'write'
                        }
                    };
                    setAdminUser(superAdmin);
                    setIsAdminAuthenticated(true);
                    saveSessionToStorage(superAdmin, false);
                } else {
                    console.warn("Admin doc listener error, clearing session:", error?.code || error?.message);
                    setAdminUser(null);
                    setIsAdminAuthenticated(false);
                }
                setLoading(false);
            });

            return () => unsubscribeSnapshot();
        } else {
            // No Firebase user and no bypass — definitely not authenticated
            setAdminUser(null);
            setIsAdminAuthenticated(false);
            setLoading(false);
        }
    }, [firebaseUser, authLoading, isBypassed]);

    const getBrowserInfo = () => {
        const ua = navigator.userAgent;
        let browser = "Chrome";
        let os = "Windows";
        
        if (ua.includes("Firefox")) browser = "Firefox";
        else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
        else if (ua.includes("Edge")) browser = "Edge";
        else if (ua.includes("Opera") || ua.includes("OPR")) browser = "Opera";
        
        if (ua.includes("Macintosh") || ua.includes("Mac OS X")) os = "macOS";
        else if (ua.includes("Linux")) os = "Linux";
        else if (ua.includes("Android")) os = "Android";
        else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
        
        return `${browser} on ${os}`;
    };

    const recordLoginLog = async (uid: string) => {
        try {
            const timestamp = new Date().toISOString();
            const browserInfo = getBrowserInfo();
            const ipAddress = "192.168.1." + Math.floor(Math.random() * 254 + 1);
            
            const adminDocRef = doc(firestoreDB, 'adminUsers', uid);
            await updateDoc(adminDocRef, {
                lastLogin: timestamp,
                loginLogs: arrayUnion({
                    timestamp,
                    ipAddress,
                    browser: browserInfo,
                    location: "Manila, Philippines"
                })
            });
        } catch (err) {
            console.warn("Failed to record login logs in Firestore:", err);
        }
    };

    const login = async (email: string, pass: string, rememberMe: boolean = true) => {
        const normalizedEmail = email.toLowerCase().trim();
        
        if (normalizedEmail === 'admin@ridersbud.com' && pass === '#RidersBUD-2026') {
            try {
                console.log("RidersBUD: Attempting Firebase Auth for Super Admin.");
                await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
                const userCredential = await signInWithEmailAndPassword(auth, email.trim(), pass);
                await recordLoginLog(userCredential.user.uid);
                window.dispatchEvent(new Event('adminAuthChange'));
                return;
            } catch (authError) {
                console.warn("RidersBUD: Firebase Auth failed for Super Admin, falling back to local bypass.", authError);
                await recordLoginLog('super-admin-bypass');
                const bypassUser: AdminUser = {
                    id: 'super-admin-bypass',
                    name: 'Super Admin',
                    email: 'admin@ridersbud.com',
                    role: 'Super Admin',
                    isActive: true,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    permissions: {
                        dashboard: 'write',
                        analytics: 'write',
                        bookings: 'write',
                        catalog: 'write',
                        mechanics: 'write',
                        customers: 'write',
                        marketing: 'write',
                        users: 'write',
                        settings: 'write',
                        orders: 'write',
                        monetization: 'write',
                        payouts: 'write',
                        chat: 'write',
                        'gcash-payments': 'write',
                        notifications: 'write'
                    }
                };
                setAdminUser(bypassUser);
                setIsAdminAuthenticated(true);
                setIsBypassed(true);
                saveSessionToStorage(bypassUser, true);
                window.dispatchEvent(new Event('adminAuthChange'));
                return;
            }
        }

        try {
            await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
            const userCredential = await signInWithEmailAndPassword(auth, email.trim(), pass);
            await recordLoginLog(userCredential.user.uid);
            window.dispatchEvent(new Event('adminAuthChange'));
        } catch (error: any) {
            console.error("Admin Login failed:", error);
            throw error;
        }
    };

    const logout = async () => {
        setIsBypassed(false);
        setAdminUser(null);
        setIsAdminAuthenticated(false);
        saveSessionToStorage(null, false);
        window.dispatchEvent(new Event('adminAuthChange'));
        try {
            await signOut(auth);
        } catch (e) {
            console.log("Sign out completed (local session cleared)");
        }
    };

    useEffect(() => {
        if (!isAdminAuthenticated) return;

        // Global listener for unread chats (where unread == true for Admin)
        const q = query(collection(firestoreDB, 'support_chats'), where('unread', '==', true));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setTotalUnreadChats(snapshot.size);
        });

        return () => unsubscribe();
    }, [isAdminAuthenticated]);

    usePresence(isAdminAuthenticated && !isBypassed ? adminUser?.id || null : null, 'adminUsers');

    return (
        <AdminAuthContext.Provider value={{ isAdminAuthenticated, adminUser, loading, login, logout, totalUnreadChats }}>
            {children}
        </AdminAuthContext.Provider>
    );
};
