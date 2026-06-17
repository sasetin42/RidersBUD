import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { Service, Part, Mechanic, Booking, Customer, Settings, BookingStatus, Order, Review, Banner, FAQCategory, AdminUser, Role, Task, Database, OrderStatus, PayoutRequest, RentalCar, RentalBooking, Subscription, PromoCode, Notification } from '../types';
import { db as firestore, rtdb, storage } from '../firebase';
import { ref as rtdbRef, set as rtdbSet } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
    collection,
    doc,
    setDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    writeBatch,
    getDocs,
    arrayUnion,
    increment,
    Timestamp,
    query,
    where
} from 'firebase/firestore';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import liveData from '../data/liveData.json';
import { paymentService } from '../services/PaymentService';

interface DatabaseContextType {
    db: Database | null;
    loading: boolean;
    // CRUD Functions
    addService: (service: Omit<Service, 'id'>) => Promise<void>;
    updateService: (updatedService: Service) => Promise<void>;
    deleteService: (serviceId: string) => Promise<void>;
    addPart: (part: Omit<Part, 'id'>) => Promise<void>;
    updatePart: (updatedPart: Part) => Promise<void>;
    deletePart: (partId: string) => Promise<void>;
    addMechanic: (mechanic: Omit<Mechanic, 'id'>) => Promise<Mechanic | null>;
    updateMechanic: (updatedMechanic: Mechanic) => Promise<void>;
    updateMechanicOnlineStatus: (mechanicId: string, isOnline: boolean) => Promise<void>;
    deleteMechanic: (mechanicId: string) => Promise<void>;
    addBooking: (booking: Omit<Booking, 'id'>) => Promise<Booking | null>;
    updateBooking: (bookingId: string, updates: Partial<Booking>) => Promise<void>;
    updateBookingPayment: (bookingId: string, amount: number, status: 'pending' | 'partial' | 'paid') => Promise<void>;
    updateBookingStatus: (bookingId: string, status: BookingStatus) => Promise<void>;
    assignMechanicToBooking: (bookingId: string, mechanic: Mechanic) => Promise<void>;
    cancelBooking: (bookingId: string, reason: string) => Promise<void>;
    deleteBooking: (bookingId: string) => Promise<void>;
    deleteAllBookings: () => Promise<void>;
    addCustomer: (customer: Omit<Customer, 'id'>) => Promise<Customer | null>;
    updateCustomer: (updatedCustomer: Customer) => Promise<void>;
    updateCustomerLocation: (customerId: string, location: { lat: number; lng: number }) => Promise<void>;
    addOrder: (order: Omit<Order, 'id'>) => Promise<Order | null>;
    updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
    addBanner: (banner: Omit<Banner, 'id'>, imageFile?: File) => Promise<void>;
    updateBanner: (banner: Banner, imageFile?: File) => Promise<void>;
    deleteBanner: (id: string) => Promise<void>;
    updateSettings: (newSettings: Partial<Settings>) => Promise<void>;
    addAdminUser: (user: Omit<AdminUser, 'id'>) => Promise<void>;
    updateAdminUser: (user: AdminUser) => Promise<void>;
    deleteAdminUser: (userId: string) => Promise<void>;
    // Monetization
    addSubscription: (subscription: Omit<Subscription, 'id'>) => Promise<void>;
    updateSubscription: (subscription: Subscription) => Promise<void>;
    deleteSubscription: (subscriptionId: string) => Promise<void>;
    addPromoCode: (promoCode: Omit<PromoCode, 'id'>) => Promise<void>;
    updatePromoCode: (promoCode: PromoCode) => Promise<void>;
    deletePromoCode: (promoCodeId: string) => Promise<void>;
    updateMechanicLocation: (mechanicId: string, location: { lat: number; lng: number }, bookingId?: string) => Promise<void>;
    respondToReschedule: (bookingId: string, response: 'accepted' | 'rejected') => Promise<void>;
    // Accept a new job request (mechanic self-assigns)
    acceptJobRequest: (bookingId: string, mechanic?: Mechanic) => Promise<void>;
    // Notifications
    addNotification: (notification: Omit<Notification, 'id'>) => Promise<void>;
    markNotificationAsRead: (notificationId: string) => Promise<void>;
    markAllNotificationsAsRead: (recipientId: string) => Promise<void>;
    deleteNotification: (notificationId: string) => Promise<void>;
    clearAllNotifications: (recipientId: string) => Promise<void>;
    addPayoutRequest: (request: { mechanicId: string; mechanicName: string; amount: number; paymentMethod: string; accountDetails: string; notes?: string }) => Promise<void>;
    updatePayoutStatus: (payoutId: string, status: 'Pending' | 'Approved' | 'Paid' | 'Rejected', mechanicId: string, amount: number, adminDetails?: { id: string; name: string; notes?: string; transactionId?: string }) => Promise<void>;
    addReview: (bookingId: string, review: Omit<Review, 'id' | 'date'>) => Promise<void>;
    updateReview: (bookingId: string, review: Review) => Promise<void>;
    verifyBookingPayment: (bookingId: string) => Promise<void>;
    initiateGCashPayment: (bookingId: string, amount: number, email: string) => Promise<string>;
    notifyAdminGCashReceiptUploaded: (bookingId: string, customerName: string, serviceName: string) => Promise<void>;
    addTask: (task: Omit<Task, 'id' | 'isComplete' | 'completionDate'>) => Promise<void>;
    updateTask: (task: Task) => Promise<void>;
    deleteMultipleTasks: (taskIds: string[]) => Promise<void>;
    updateMultipleTasksStatus: (taskIds: string[], isComplete: boolean) => Promise<void>;
    updateUserNotificationSettings: (userId: string, settings: Customer['notificationSettings']) => Promise<void>;
    updateMechanicNotificationSettings: (mechanicId: string, settings: Mechanic['notificationSettings']) => Promise<void>;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

export const useDatabase = () => {
    const context = useContext(DatabaseContext);
    if (!context) {
        throw new Error('useDatabase must be used within a DatabaseProvider');
    }
    return context;
};

// Suppress Firestore SDK internal non-critical error/warn logs
// Note: index.tsx already locks console.warn and console.error with Object.defineProperty.
// Here we add a secondary in-module filter for Firestore-specific patterns using a safe helper.
const FIRESTORE_SUPPRESS = [
    'permission-denied',
    'Missing or insufficient permissions',
    'Permission denied for',
    'message channel closed',
    'asynchronous response',
    'initializeFirestore',
    'FIRESTORE INTERNAL ASSERTION FAILED',
    'Failed to load module',
    'Failed to reload',
    'Failed to fetch dynamically imported module',
    'Failed to load resource',
    'manifest.json',
    'The above error occurred',
    'Consider adding an error boundary',
    'width(-1) and height(-1)',
    'uncontrolled input',
    'Recharts',
    'auth/invalid-credential',
    'auth/too-many-requests',
    'identitytoolkit',
    'accounts:lookup',
    'Failed to restore Super Admin',
    'Cannot read properties of undefined',
    'default-src',
    'Content Security Policy',
    '.well-known',
    'com.chrome.devtools',
    'isMechanicAuthenticated',
    'is not defined',
    'ObjectMultiplex',
    'malformed chunk',
    'MaxListenersExceededWarning',
    'EventEmitter memory leak',
    'contentscript',
];


// Intercept window-level uncaught errors from Firestore/extensions
const originalOnError = window.onerror;
window.onerror = (msg, source, lineno, colno, error) => {
    const msgStr = String(msg);
    if (FIRESTORE_SUPPRESS.some(s => msgStr.includes(s)) ||
        FIRESTORE_SUPPRESS.some(s => error?.message?.includes(s))) {
        return true;
    }
    return originalOnError ? originalOnError(msg, source, lineno, colno, error) : false;
};

window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const msg = event.reason?.message || String(event.reason);
    if (FIRESTORE_SUPPRESS.some(s => msg.includes(s))) {
        event.preventDefault();
    }
});


export const DatabaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const initialSettings: Settings = {
        appName: 'RidersBUD',
        sidebarColor: '#1A1A1A',
        accentColor: '#FE7803',
        appLogoUrl: '',
        faviconUrl: '',
        gcashEnabled: false,
        gcashNumber: '',
        gcashAccountName: '',
        gcashQrCodeUrl: '',
        defaultCustomerImageUrl: '/assets/logo.png',
        defaultMechanicImageUrl: '/assets/logo.png'
    };

    const [db, setDb] = useState<Database | null>({
        services: [], parts: [], mechanics: [], bookings: [], customers: [], orders: [],
        banners: [], settings: initialSettings, faqs: [], adminUsers: [], roles: [],
        tasks: [], payouts: [], notifications: [], rentalCars: [], rentalBookings: [],
        subscriptions: [], promoCodes: []
    });
    const [loading, setLoading] = useState(true);

    // Initial Data Seeding and Realtime Listeners
    useEffect(() => {
        // Separate public and private (user-specific) unsub arrays.
        // Public listeners are set up once and never torn down on auth changes.
        // Private listeners are torn down and re-established whenever the auth user changes.
        // This prevents the logout-on-save bug: every Firestore write triggers a Firebase
        // ID token refresh → onAuthStateChanged fires → we now ONLY tear down private subs.
        let publicUnsubs: (() => void)[] = [];
        let privateUnsubs: (() => void)[] = [];

        const isLocalhost = typeof window !== 'undefined' && (
            window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1'
        );

        // Load data from liveData.json as a local fallback for a given collection.
        // Used when Firestore permission-denied errors occur on local bypass sessions.
        const loadLocalFallback = <T,>(colName: string, onNext: (data: T[]) => void) => {
            try {
                const localCollection = (liveData as Record<string, any>)[colName];
                if (Array.isArray(localCollection) && localCollection.length > 0) {
                    console.info(`[LocalFallback] Loaded ${localCollection.length} docs for "${colName}" from liveData.json`);
                    onNext(localCollection as T[]);
                }
            } catch (e) {
                console.warn(`[LocalFallback] Could not load "${colName}" from liveData.json`, e);
            }
        };

        const safeOnSnapshot = <T,>(
            ref: any,
            onNext: (data: T[]) => void,
            label: string
        ): (() => void) => {
            try {
                return onSnapshot(ref,
                    (snapshot: any) => {
                        try {
                            const data = snapshot.docs
                                ? snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() } as T))
                                : [{ id: snapshot.id, ...snapshot.data() } as T];
                            onNext(data);
                        } catch (innerErr) {
                            console.warn(`Error processing snapshot for ${label}:`, innerErr);
                        }
                    },
                    (err) => {
                        if (err?.code === 'permission-denied') {
                            // On localhost with bypass login, try liveData.json as a read fallback
                            if (isLocalhost) {
                                loadLocalFallback<T>(label, onNext);
                            } else {
                                console.warn(`Permission denied for ${label} — continuing without data`);
                            }
                        } else {
                            console.warn(`Snapshot error for ${label}:`, err?.code || err?.message || err);
                        }
                    }
                );
            } catch (setupErr) {
                console.warn(`Failed to set up snapshot listener for ${label}:`, setupErr);
                return () => {};
            }
        };

        const subscribePublic = <T,>(colName: string, stateKey: keyof Database) => {
            const q = collection(firestore, colName);
            const unsubscribe = safeOnSnapshot<T>(
                q,
                (data) => setDb(prev => prev ? { ...prev, [stateKey]: data } : null),
                colName
            );
            publicUnsubs.push(unsubscribe);
        };

        const subscribePrivate = <T,>(colName: string, stateKey: keyof Database) => {
            const q = collection(firestore, colName);
            const unsubscribe = safeOnSnapshot<T>(
                q,
                (data) => setDb(prev => prev ? { ...prev, [stateKey]: data } : null),
                colName
            );
            privateUnsubs.push(unsubscribe);
        };

        const subscribePrivateQuery = <T,>(q: any, stateKey: keyof Database) => {
            const unsubscribe = safeOnSnapshot<T>(
                q,
                (data) => setDb(prev => prev ? { ...prev, [stateKey]: data } : null),
                stateKey
            );
            privateUnsubs.push(unsubscribe);
        };

        // --- PUBLIC listeners (set up once, never destroyed on auth change) ---
        try {
            const unsubSettings = onSnapshot(doc(firestore, 'settings', 'main'),
                (docSnap) => {
                    try {
                        if (docSnap.exists()) {
                            setDb(prev => prev ? { ...prev, settings: docSnap.data() as Settings } : null);
                        } else {
                            setDoc(doc(firestore, 'settings', 'main'), initialSettings).catch(() => {});
                            setDb(prev => prev ? { ...prev, settings: initialSettings } : null);
                        }
                    } catch (innerErr) {
                        console.warn("Error processing settings snapshot:", innerErr);
                    }
                },
                (err) => console.warn("Settings subscription error, using defaults:", err?.code || err?.message || err)
            );
            publicUnsubs.push(unsubSettings);
        } catch (setupErr) {
            console.warn("Failed to set up settings listener:", setupErr);
        }

        try {
            subscribePublic('adminUsers', 'adminUsers');
            subscribePublic('services', 'services');
            subscribePublic('parts', 'parts');
            subscribePublic('banners', 'banners');
            subscribePublic('faqs', 'faqs');
            subscribePublic('mechanics', 'mechanics');
            subscribePublic('promoCodes', 'promoCodes');
            subscribePublic('roles', 'roles');
            subscribePublic('rentalCars', 'rentalCars');
            subscribePublic('subscriptions', 'subscriptions');
        } catch (err) {
            console.warn("Error setting up public Firestore listeners:", err);
        } finally {
            setLoading(false);
        }

        // --- PRIVATE listeners (torn down and re-built on every auth change / admin bypass login) ---
        const checkAndSubscribe = async (user: any) => {
            privateUnsubs.forEach(fn => fn());
            privateUnsubs = [];

            // Clear old private states to avoid notification history leakage when logging in/out or changing accounts
            setDb(prev => prev ? { 
                ...prev, 
                bookings: [], 
                customers: [], 
                orders: [], 
                tasks: [], 
                payouts: [], 
                notifications: [], 
                rentalBookings: [] 
            } : null);

            const isAdminSession = localStorage.getItem('ridersbud_admin_session') === 'true';

            if (!user && !isAdminSession) {
                return;
            }

            let isAdmin = isAdminSession;
            let isMechanic = false;

            if (user && !isAdmin) {
                try {
                    const adminDoc = await getDocs(query(collection(firestore, 'adminUsers'), where('email', '==', user.email || '')));
                    isAdmin = !adminDoc.empty;

                    const mechanicDoc = await getDocs(query(collection(firestore, 'mechanics'), where('email', '==', user.email || '')));
                    isMechanic = !mechanicDoc.empty;
                } catch (e) {
                    console.warn("Auth check error", e);
                }
            }

            if (isAdmin) {
                subscribePrivate('bookings', 'bookings');
                subscribePrivate('customers', 'customers');
                subscribePrivate('orders', 'orders');
                subscribePrivate('tasks', 'tasks');
                subscribePrivate('payouts', 'payouts');
                // Admin notifications: only get admin-specific and 'all' broadcast notifications
                subscribePrivateQuery(query(collection(firestore, 'notifications'),
                    where('recipientId', 'in', ['admin', 'all'])
                ), 'notifications');
                subscribePrivate('rentalBookings', 'rentalBookings');
            } else if (isMechanic && user) {
                subscribePrivate('bookings', 'bookings');
                subscribePrivate('customers', 'customers');
                subscribePrivateQuery(query(collection(firestore, 'tasks'), where('mechanicId', '==', user.uid)), 'tasks');
                subscribePrivateQuery(query(collection(firestore, 'payouts'), where('mechanicId', '==', user.uid)), 'payouts');
                // Mechanic notifications: only their own + broadcast 'all'
                subscribePrivateQuery(query(collection(firestore, 'notifications'),
                    where('recipientId', 'in', [`mechanic-${user.uid}`, 'all'])
                ), 'notifications');
                setDb(prev => prev ? { ...prev, orders: [], rentalBookings: [] } : null);
            } else if (user) {
                // Standard Customer
                const unsubCustomer = safeOnSnapshot(
                    doc(firestore, 'customers', user.uid),
                    (data) => setDb(prev => prev ? { ...prev, customers: data } : null),
                    'customer'
                );
                privateUnsubs.push(unsubCustomer);

                subscribePrivateQuery(query(collection(firestore, 'bookings'), where('customerId', '==', user.uid)), 'bookings');
                subscribePrivateQuery(query(collection(firestore, 'orders'), where('customerId', '==', user.uid)), 'orders');
                subscribePrivateQuery(query(collection(firestore, 'rentalBookings'), where('customerId', '==', user.uid)), 'rentalBookings');
                // Customer notifications: only their own + broadcast 'all'
                subscribePrivateQuery(query(collection(firestore, 'notifications'),
                    where('recipientId', 'in', [`customer-${user.uid}`, 'all'])
                ), 'notifications');
                setDb(prev => prev ? { ...prev, tasks: [], payouts: [] } : null);
            }
        };

        const authUnsub = onAuthStateChanged(auth, checkAndSubscribe);

        // Listen for admin bypass auth events
        const handleAdminAuthChange = () => {
            checkAndSubscribe(auth.currentUser);
        };
        window.addEventListener('adminAuthChange', handleAdminAuthChange);
        window.addEventListener('storage', handleAdminAuthChange);

        // Run initial check
        checkAndSubscribe(auth.currentUser);

        return () => {
            authUnsub();
            window.removeEventListener('adminAuthChange', handleAdminAuthChange);
            window.removeEventListener('storage', handleAdminAuthChange);
            publicUnsubs.forEach(u => u());
            privateUnsubs.forEach(u => u());
        };
    }, []);

    // Global Side Effects: Update Favicon and App Title
    useEffect(() => {
        if (db?.settings) {
            // Update Title
            if (db.settings.appName) {
                document.title = db.settings.appName;
            }

            // Update Favicon
            if (db.settings.faviconUrl) {
                const link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
                if (link) {
                    link.href = db.settings.faviconUrl;
                } else {
                    const newLink = document.createElement('link');
                    newLink.rel = 'icon';
                    newLink.href = db.settings.faviconUrl;
                    document.head.appendChild(newLink);
                }
            }
        }
    }, [db?.settings?.faviconUrl, db?.settings?.appName]);



    // --- CRUD Implementations ---
    // Note: React 18 / Firestore auto-updates via the listeners above. 
    // We just write to Firestore here.

    const sendNotification = async (notif: Omit<Notification, 'id'>) => {
        const newNotif = {
            ...notif,
            id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            read: false
        } as Notification;

        try {
            await addDoc(collection(firestore, 'notifications'), {
                ...notif,
                timestamp: Date.now(),
                read: false
            });
        } catch (e) {
            console.warn("Failed to send notification to Firestore, using local fallback:", e);
            setDb(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    notifications: [newNotif, ...(prev.notifications || [])]
                };
            });
        }
    };

    const addService = async (service: Omit<Service, 'id'>) => {
        await addDoc(collection(firestore, 'services'), service);
        await sendNotification({
            recipientId: 'all',
            title: 'New Service Available',
            message: `Check out our new service: ${service.name}`,
            type: 'info',
            date: new Date().toISOString(),
            read: false,
            link: '/services'
        });
    };

    const updateService = async (service: Service) => {
        const { id, ...data } = service;
        await updateDoc(doc(firestore, 'services', id), data);
    };

    const deleteService = async (id: string) => {
        await deleteDoc(doc(firestore, 'services', id));
    };

    const addPart = async (part: Omit<Part, 'id'>) => {
        await addDoc(collection(firestore, 'parts'), part);
        await sendNotification({
            recipientId: 'all',
            title: 'New Tools & Parts',
            message: `${part.name} is now available in the store.`,
            type: 'info',
            date: new Date().toISOString(),
            read: false,
            link: '/customer-portal/parts-store'
        });
    };

    const updatePart = async (part: Part) => {
        await updateDoc(doc(firestore, 'parts', part.id), { ...part });
    };

    const deletePart = async (id: string) => {
        await deleteDoc(doc(firestore, 'parts', id));
    };

    const addMechanic = async (mechanic: Omit<Mechanic, 'id'>) => {
        try {
            // Dynamically import Firebase App and Auth SDKs to execute on-demand
            const { initializeApp, deleteApp } = await import('firebase/app');
            const { getAuth, createUserWithEmailAndPassword } = await import('firebase/auth');

            // Configure secondary app config matching primary Firebase project config
            const secondaryConfig = {
                apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyD_ot0rEnYcP0l4fseVinRPFuUFuHYFn3A",
                authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "ridersbud-10806.firebaseapp.com",
                projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "ridersbud-10806",
                storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "ridersbud-10806.firebasestorage.app",
                messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "492813766406",
                appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:492813766406:web:c35e8974032a01fb8f9887",
                databaseURL: "https://ridersbud-10806-default-rtdb.firebaseio.com/"
            };

            const secondaryAppName = `secondary-mechanic-creation-${Date.now()}`;
            const secondaryApp = initializeApp(secondaryConfig, secondaryAppName);
            const secondaryAuth = getAuth(secondaryApp);

            // Generate user credentials in Firebase Auth without disrupting admin session
            const userCredential = await createUserWithEmailAndPassword(
                secondaryAuth, 
                mechanic.email, 
                mechanic.password || 'password123'
            );
            const fbUser = userCredential.user;
            const uid = fbUser.uid;

            // Delete secondary app immediately to release resources
            await deleteApp(secondaryApp);

            // Structure mechanic payload to match database schemas
            const newMechanic: Mechanic = {
                ...mechanic,
                id: uid,
                imageUrl: mechanic.imageUrl || db?.settings?.defaultMechanicImageUrl || '/assets/logo.png',
                password: mechanic.password || 'password123',
                registrationDate: new Date().toISOString(),
                joinedAt: new Date().toISOString(),
                status: mechanic.status || 'Pending',
                rating: mechanic.rating || 0,
                reviews: mechanic.reviews || 0,
                reviewsList: mechanic.reviewsList || [],
                walletBalance: mechanic.walletBalance || 0,
                totalEarnings: mechanic.totalEarnings || 0,
                isOnline: mechanic.isOnline || false,
                availability: mechanic.availability || {
                    monday: { isAvailable: true, startTime: '08:00', endTime: '17:00' },
                    tuesday: { isAvailable: true, startTime: '08:00', endTime: '17:00' },
                    wednesday: { isAvailable: true, startTime: '08:00', endTime: '17:00' },
                    thursday: { isAvailable: true, startTime: '08:00', endTime: '17:00' },
                    friday: { isAvailable: true, startTime: '08:00', endTime: '17:00' },
                    saturday: { isAvailable: true, startTime: '09:00', endTime: '15:00' },
                    sunday: { isAvailable: false, startTime: '09:00', endTime: '15:00' }
                }
            };

            // Write Mechanic profile to Firestore using generated Auth UID
            await setDoc(doc(firestore, 'mechanics', uid), newMechanic);
            return newMechanic;
        } catch (error: any) {
            console.error("[DatabaseContext] Mechanic Auth pre-creation failed:", error);
            throw error;
        }
    };

    const cleanObject = (obj: any) => {
        const newObj: any = {};
        Object.keys(obj).forEach(key => {
            if (obj[key] !== undefined) {
                newObj[key] = obj[key] === null ? null : obj[key];
                if (typeof newObj[key] === 'object' && newObj[key] !== null) {
                    if (Array.isArray(newObj[key])) {
                        newObj[key] = newObj[key].map((item: any) => typeof item === 'object' ? cleanObject(item) : item);
                    } else {
                        newObj[key] = cleanObject(newObj[key]);
                    }
                }
            }
        });
        return newObj;
    };

    const updateMechanic = async (mechanic: Mechanic) => {
        const { id, ...data } = mechanic;
        
        const oldMechanicDoc = db?.mechanics.find(m => m.id === id);
        const oldPassword = oldMechanicDoc?.password;
        const oldEmail = oldMechanicDoc?.email || mechanic.email;

        if (mechanic.password && mechanic.password !== oldPassword) {
            const { getSecondaryAuth, deleteSecondaryAuth } = await import('../utils/secondaryAuth');
            const { signInWithEmailAndPassword, updatePassword } = await import('firebase/auth');

            const { auth: secondaryAuth, app: secondaryApp } = getSecondaryAuth();
            try {
                let userCredential;
                try {
                    userCredential = await signInWithEmailAndPassword(
                        secondaryAuth,
                        oldEmail,
                        oldPassword || ''
                    );
                } catch (firstErr) {
                    const fallbacks = ['password123', '123456', '123456#'];
                    for (const fallbackPass of fallbacks) {
                        if (fallbackPass === oldPassword) continue;
                        try {
                            userCredential = await signInWithEmailAndPassword(
                                secondaryAuth,
                                oldEmail,
                                fallbackPass
                            );
                            console.info(`[DatabaseContext] Successfully signed in mechanic ${id} with fallback password.`);
                            break;
                        } catch (_) {}
                    }
                }

                if (userCredential) {
                    await updatePassword(userCredential.user, mechanic.password);
                    console.info(`[DatabaseContext] Successfully synced and updated Firebase Auth password for mechanic ${id}.`);
                } else {
                    console.warn(`[DatabaseContext] Could not authenticate mechanic ${id} in Firebase Auth to update password, letting self-healing handles it.`);
                }
            } catch (err: any) {
                console.warn(`[DatabaseContext] Failed to update mechanic Auth password:`, err);
            } finally {
                await deleteSecondaryAuth(secondaryApp);
            }
        }

        const cleanedData = cleanObject(data);
        const batch = writeBatch(firestore);
        
        // 1. Update the mechanic document
        batch.update(doc(firestore, 'mechanics', id), cleanedData);

        // 2. Propagate name/phone/image changes to active bookings
        const relatedBookings = db?.bookings.filter(b => b.mechanicId === id) || [];
        relatedBookings.forEach(booking => {
            const bookingRef = doc(firestore, 'bookings', booking.id);
            batch.update(bookingRef, {
                mechanicName: mechanic.name,
                mechanic: {
                    ...booking.mechanic,
                    name: mechanic.name,
                    phone: mechanic.phone,
                    imageUrl: mechanic.imageUrl || ''
                }
            });
        });

        await batch.commit();
        console.log(`[DatabaseContext] Updated mechanic ${id} and propagated to ${relatedBookings.length} bookings.`);
    };

    const deleteMechanic = async (id: string) => {
        const batch = writeBatch(firestore);
        
        // 1. Find all bookings assigned to this mechanic
        const bookingsToUpdate = db?.bookings.filter(b => b.mechanicId === id || b.mechanic?.id === id) || [];
        
        bookingsToUpdate.forEach(booking => {
            const bookingRef = doc(firestore, 'bookings', booking.id);
            batch.update(bookingRef, {
                mechanicId: null,
                mechanic: null,
                mechanicName: 'Unassigned',
                status: 'Pending' as BookingStatus
            });
        });

        // 2. Delete the mechanic document
        batch.delete(doc(firestore, 'mechanics', id));

        await batch.commit();
        console.log(`[DatabaseContext] Deleted mechanic ${id} and unassigned ${bookingsToUpdate.length} bookings.`);
    };

    const updateMechanicOnlineStatus = async (id: string, isOnline: boolean) => {
        await updateDoc(doc(firestore, 'mechanics', id), { isOnline });
    };

    const updateMechanicLocation = async (id: string, location: { lat: number; lng: number }, bookingId?: string) => {
        // 1. Update Firestore for persistent record and general discovery
        await updateDoc(doc(firestore, 'mechanics', id), { 
            lat: location.lat, 
            lng: location.lng, 
            lastLocationUpdate: new Date().toISOString() 
        });

        // 2. Update RTDB for low-latency live tracking if there's an active booking
        if (bookingId) {
            const trackingRef = rtdbRef(rtdb, `tracking/${bookingId}/mechanicLocation`);
            await rtdbSet(trackingRef, {
                lat: location.lat,
                lng: location.lng,
                timestamp: Date.now()
            });
        }
    };

    const addBooking = async (booking: Omit<Booking, 'id'>) => {
        const mechId = booking.mechanicId || booking.mechanic?.id || null;
        const mechName = booking.mechanicName || booking.mechanic?.name || 'Unassigned';
        const newBooking = {
            ...booking,
            mechanicId: mechId,
            mechanicName: mechName,
            createdAt: new Date().toISOString(),
            statusHistory: [{ status: booking.status, timestamp: new Date().toISOString() }]
        };
        const ref = await addDoc(collection(firestore, 'bookings'), newBooking);
        // General admin booking notification
        await sendNotification({
            recipientId: 'admin',
            title: 'New Booking Received',
            message: `New booking for ${booking.services[0]?.name || 'Service'} from ${booking.customerName}`,
            type: 'alert',
            date: new Date().toISOString(),
            read: false,
            link: '/admin-portal/bookings'
        });

        return { id: ref.id, ...newBooking } as Booking;
    };

    // Called by GCashPaymentModal after receipt upload — pings admin in real-time
    const notifyAdminGCashReceiptUploaded = async (bookingId: string, customerName: string, serviceName: string) => {
        await sendNotification({
            recipientId: 'admin',
            title: '📸 GCash Receipt Uploaded',
            message: `${customerName} uploaded a GCash receipt for "${serviceName}". Review required.`,
            type: 'alert',
            date: new Date().toISOString(),
            read: false,
            link: '/admin-portal/gcash-payments'
        });
    };

    const updateBooking = async (id: string, updates: Partial<Booking>) => {
        try {
            await updateDoc(doc(firestore, 'bookings', id), updates);
        } catch (e) {
            console.warn(`[Firestore Write Failed] updateBooking for ${id} failed, falling back to local update:`, e);
            setDb(prev => {
                if (!prev) return null;
                const updatedBookings = prev.bookings.map(b => b.id === id ? { ...b, ...updates } : b);
                return { ...prev, bookings: updatedBookings };
            });
        }
    };

    const updateBookingPayment = async (id: string, amount: number, status: 'pending' | 'partial' | 'paid') => {
        try {
            const bookingRef = doc(firestore, 'bookings', id);
            await updateDoc(bookingRef, {
                paymentStatus: status,
                isPaid: status === 'paid',
                paidAmount: increment(amount)
            });
        } catch (e) {
            console.warn(`[Firestore Write Failed] updateBookingPayment for ${id} failed, falling back to local update:`, e);
            setDb(prev => {
                if (!prev) return null;
                const updatedBookings = prev.bookings.map(b => {
                    if (b.id === id) {
                        return {
                            ...b,
                            paymentStatus: status,
                            isPaid: status === 'paid',
                            paidAmount: (b.paidAmount || 0) + amount
                        };
                    }
                    return b;
                });
                return { ...prev, bookings: updatedBookings };
            });
        }
    };


    const updateBookingStatus = async (id: string, status: BookingStatus) => {
        let booking = db?.bookings.find(b => b.id === id);

        try {
            await updateDoc(doc(firestore, 'bookings', id), {
                status,
                statusHistory: arrayUnion({ status, timestamp: new Date().toISOString() })
            });
        } catch (e) {
            console.warn(`[Firestore Write Failed] updateBookingStatus for booking ${id} failed, falling back to local update:`, e);
            // Local fallback update
            setDb(prev => {
                if (!prev) return null;
                const updatedBookings = prev.bookings.map(b => {
                    if (b.id === id) {
                        const newHistory = [...(b.statusHistory || [])];
                        if (!newHistory.some(h => h.status === status)) {
                            newHistory.push({ status, timestamp: new Date().toISOString() });
                        }
                        return {
                            ...b,
                            status,
                            statusHistory: newHistory
                        };
                    }
                    return b;
                });
                return { ...prev, bookings: updatedBookings };
            });
            // Re-read local backup
            booking = booking || db?.bookings.find(b => b.id === id);
        }

        if (booking) {
            // Phase 3: Live Payments & Escrow Release (50% split for Completed job)
            if (status === 'Completed' && booking.mechanicId) {
                const amount = booking.totalAmount || booking.services?.[0]?.price || booking.service?.price || 0;
                const mechanicShare = Math.floor(amount * 0.5);
                try {
                    const mechanicRef = doc(firestore, 'mechanics', booking.mechanicId);
                    await updateDoc(mechanicRef, {
                        walletBalance: increment(mechanicShare),
                        totalEarnings: increment(mechanicShare)
                    });
                } catch (e) {
                    console.warn(`[Firestore Write Failed] updateMechanic for mechanic ${booking.mechanicId} failed, falling back to local update:`, e);
                    setDb(prev => {
                        if (!prev) return null;
                        const updatedMechanics = prev.mechanics.map(m => {
                            if (m.id === booking.mechanicId) {
                                return {
                                    ...m,
                                    walletBalance: (m.walletBalance || 0) + mechanicShare,
                                    totalEarnings: (m.totalEarnings || 0) + mechanicShare
                                };
                            }
                            return m;
                        });
                        return { ...prev, mechanics: updatedMechanics };
                    });
                }

                await sendNotification({
                    recipientId: `mechanic-${booking.mechanicId}`,
                    title: 'Payment Released',
                    message: `Funds (₱${mechanicShare.toLocaleString()}) for job #${booking.id.slice(-5).toUpperCase()} have been added to your balance.`,
                    type: 'success',
                    date: new Date().toISOString(),
                    read: false,
                    link: '/mechanic-portal/earnings'
                });
            }
        }
    };

    const assignMechanicToBooking = async (bookingId: string, mechanic: Mechanic) => {
        await updateDoc(doc(firestore, 'bookings', bookingId), {
            mechanicId: mechanic.id,
            mechanicName: mechanic.name,
            mechanic: {
                id: mechanic.id,
                name: mechanic.name,
                email: mechanic.email,
                phone: mechanic.phone,
                imageUrl: mechanic.imageUrl,
                rating: mechanic.rating,
                reviews: mechanic.reviews
            },
            status: 'Mechanic Assigned' as BookingStatus
        });

    };

    const cancelBooking = async (bookingId: string, reason: string) => {
        await updateDoc(doc(firestore, 'bookings', bookingId), {
            status: 'Cancelled' as BookingStatus,
            cancellationReason: reason
        });

        const booking = db?.bookings.find(b => b.id === bookingId);
        if (booking) {
            const serviceName = booking.services?.[0]?.name || booking.service?.name || 'service';
            await sendNotification({
                recipientId: 'admin',
                title: 'Booking Cancelled',
                message: `Booking for ${serviceName} was cancelled.`,
                type: 'alert',
                date: new Date().toISOString(),
                read: false
            });
        }
    };

    const deleteBooking = async (bookingId: string) => {
        await deleteDoc(doc(firestore, 'bookings', bookingId));
    };

    const deleteAllBookings = async () => {
        const batch = writeBatch(firestore);
        const bookingsSnapshot = await getDocs(collection(firestore, 'bookings'));
        bookingsSnapshot.forEach((docSnap) => {
            batch.delete(doc(firestore, 'bookings', docSnap.id));
        });
        await batch.commit();
    };

    const verifyBookingPayment = async (bookingId: string) => {
        const booking = db?.bookings.find(b => b.id === bookingId);
        if (!booking) return;

        const batch = writeBatch(firestore);
        const bookingRef = doc(firestore, 'bookings', bookingId);

        const total = booking.totalAmount || booking.services?.[0]?.price || booking.service?.price || 0;
        const depositAmount = Math.ceil(total * 0.5);
        const hasPartialPaid = (booking.paidAmount || 0) > 0 && (booking.paidAmount || 0) < total;
        const isFinalBalancePayment = booking.isVerified === true && booking.paymentStatus === 'partial' && hasPartialPaid;

        const updatedPaymentStatus = isFinalBalancePayment ? 'paid' : 'partial';
        const updatedPaidAmount = isFinalBalancePayment ? total : Math.max(booking.paidAmount || 0, depositAmount);
        const updatedIsPaid = isFinalBalancePayment;

        batch.update(bookingRef, {
            isVerified: true,
            paymentStatus: updatedPaymentStatus,
            isPaid: updatedIsPaid,
            paidAmount: updatedPaidAmount,
            gcashPaymentStatus: 'verified',
            gcashDeclineReason: null,
            status: booking.status === 'Upcoming' ? 'Booking Confirmed' : booking.status,
        });

        await batch.commit();

        const serviceName = booking.services?.[0]?.name || booking.service?.name || 'Service';
        const customerMessage = isFinalBalancePayment
            ? `Your GCash remaining balance for "${serviceName}" has been verified. Your booking is now fully paid!`
            : `Your GCash deposit for "${serviceName}" has been verified. Your booking is confirmed!`;

await sendNotification({
            recipientId: `customer-${booking.customerId}`,
            title: isFinalBalancePayment ? '✅ Remaining Balance Paid' : '✅ Payment Verified!',
            message: customerMessage,
            type: 'success',
            date: new Date().toISOString(),
            read: false,
            link: `/customer-portal/booking-detail/${bookingId}`
        });

        // Also notify the mechanic when payment is verified (MAIN FIX)
        if (booking.mechanicId) {
            await sendNotification({
                recipientId: `mechanic-${booking.mechanicId}`,
                title: isFinalBalancePayment ? '🎉 Job Fully Paid - Ready to Start!' : '💰 Deposit Received - Job Confirmed!',
                message: `Payment verified for "${serviceName}". Customer ${isFinalBalancePayment ? 'has fully paid' : 'deposit confirmed'}. Please proceed with the service.`,
                type: 'success',
                date: new Date().toISOString(),
                read: false,
                link: `/mechanic-portal/job-detail/${bookingId}`
            });
        }
    };

    const initiateGCashPayment = async (bookingId: string, amount: number, email: string) => {
        const response = await paymentService.createGCashPayment(amount, bookingId, email);
        
        // Only update if it's not a temporary reference ID
        if (!bookingId.startsWith('RB-')) {
            try {
                await updateDoc(doc(firestore, 'bookings', bookingId), {
                    paymentIntentId: response.paymentIntentId,
                    paymentStatus: 'awaiting_payment',
                    checkoutUrl: response.checkoutUrl
                });
            } catch (e) {
                console.warn("Could not update booking payment info - doc may not exist yet", e);
            }
        }

        // In a real app, you'd redirect. Here we simulate the real-time callback too.
        // We set a timeout to simulate the user finishing the payment on GCash.
        setTimeout(async () => {
            if (bookingId.startsWith('RB-')) return;
            try {
                const bookingRef = doc(firestore, 'bookings', bookingId);
                await updateDoc(bookingRef, {
                    paymentStatus: 'paid',
                    isPaid: true,
                    status: 'Booking Confirmed',
                    statusHistory: arrayUnion({ 
                        status: 'Booking Confirmed', 
                        timestamp: new Date().toISOString() 
                    })
                });
                console.log(`[DatabaseContext] Real-time Payment Sync: Booking ${bookingId} marked as PAID`);
            } catch (error) {
                console.error("Error updating booking after simulated payment:", error);
            }
        }, 5000); // 5 seconds simulation

        return response.checkoutUrl;
    };

    const addCustomer = async (customer: Omit<Customer, 'id'>) => {
        try {
            // Dynamically import Firebase App and Auth SDKs to execute on-demand
            const { initializeApp, deleteApp } = await import('firebase/app');
            const { getAuth, createUserWithEmailAndPassword } = await import('firebase/auth');

            // Configure secondary app config matching primary Firebase project config
            const secondaryConfig = {
                apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyD_ot0rEnYcP0l4fseVinRPFuUFuHYFn3A",
                authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "ridersbud-10806.firebaseapp.com",
                projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "ridersbud-10806",
                storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "ridersbud-10806.firebasestorage.app",
                messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "492813766406",
                appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:492813766406:web:c35e8974032a01fb8f9887",
                databaseURL: "https://ridersbud-10806-default-rtdb.firebaseio.com/"
            };

            const secondaryAppName = `secondary-customer-creation-${Date.now()}`;
            const secondaryApp = initializeApp(secondaryConfig, secondaryAppName);
            const secondaryAuth = getAuth(secondaryApp);

            // Generate user credentials in Firebase Auth without disrupting admin session
            const userCredential = await createUserWithEmailAndPassword(
                secondaryAuth, 
                customer.email, 
                customer.password || 'password123'
            );
            const fbUser = userCredential.user;
            const uid = fbUser.uid;

            // Delete secondary app immediately to release resources
            await deleteApp(secondaryApp);

            // Structure customer payload to match database schemas
            const newCustomer: Customer = {
                ...customer,
                id: uid,
                picture: customer.picture || db?.settings?.defaultCustomerImageUrl || '/assets/logo.png',
                registrationDate: new Date().toISOString(),
                status: customer.status || 'Active'
            };

            // Write Customer profile to Firestore using generated Auth UID
            await setDoc(doc(firestore, 'customers', uid), newCustomer);
            return newCustomer;
        } catch (error: any) {
            console.error("[DatabaseContext] Customer Auth pre-creation failed:", error);
            throw error;
        }
    };

    const updateCustomer = async (customer: Customer) => {
        const { id, ...data } = customer;

        const oldCustomerDoc = db?.customers.find(c => c.id === id);
        const oldPassword = oldCustomerDoc?.password;
        const oldEmail = oldCustomerDoc?.email || customer.email;

        if (customer.password && customer.password !== oldPassword) {
            const { getSecondaryAuth, deleteSecondaryAuth } = await import('../utils/secondaryAuth');
            const { signInWithEmailAndPassword, updatePassword } = await import('firebase/auth');

            const { auth: secondaryAuth, app: secondaryApp } = getSecondaryAuth();
            try {
                let userCredential;
                try {
                    userCredential = await signInWithEmailAndPassword(
                        secondaryAuth,
                        oldEmail,
                        oldPassword || ''
                    );
                } catch (firstErr) {
                    const fallbacks = ['password123', '123456', '123456#'];
                    for (const fallbackPass of fallbacks) {
                        if (fallbackPass === oldPassword) continue;
                        try {
                            userCredential = await signInWithEmailAndPassword(
                                secondaryAuth,
                                oldEmail,
                                fallbackPass
                            );
                            console.info(`[DatabaseContext] Successfully signed in customer ${id} with fallback password.`);
                            break;
                        } catch (_) {}
                    }
                }

                if (userCredential) {
                    await updatePassword(userCredential.user, customer.password);
                    console.info(`[DatabaseContext] Successfully synced and updated Firebase Auth password for customer ${id}.`);
                } else {
                    console.warn(`[DatabaseContext] Could not authenticate customer ${id} in Firebase Auth to update password, letting self-healing handles it.`);
                }
            } catch (err: any) {
                console.warn(`[DatabaseContext] Failed to update customer Auth password:`, err);
            } finally {
                await deleteSecondaryAuth(secondaryApp);
            }
        }

        const cleanedData = cleanObject(data);
        const batch = writeBatch(firestore);
        
        // 1. Update the customer document
        batch.update(doc(firestore, 'customers', id), cleanedData);

        // 2. Propagate name/phone changes to all their bookings
        const relatedBookings = db?.bookings.filter(b => b.customerId === id) || [];
        relatedBookings.forEach(booking => {
            const bookingRef = doc(firestore, 'bookings', booking.id);
            batch.update(bookingRef, {
                customerName: customer.name,
                customerPhone: customer.phone
            });
        });

        await batch.commit();
        console.log(`[DatabaseContext] Updated customer ${id} and propagated to ${relatedBookings.length} bookings.`);
    };

    const deleteCustomer = async (id: string) => {
        const batch = writeBatch(firestore);
        
        // 1. Find all bookings and orders for this customer
        const bookingsToDelete = db?.bookings.filter(b => b.customerId === id) || [];
        const ordersToDelete = db?.orders.filter(o => o.customerId === id) || [];
        
        bookingsToDelete.forEach(b => batch.delete(doc(firestore, 'bookings', b.id)));
        ordersToDelete.forEach(o => batch.delete(doc(firestore, 'orders', o.id)));

        // 2. Delete the customer document
        batch.delete(doc(firestore, 'customers', id));

        await batch.commit();
        console.log(`[DatabaseContext] Deleted customer ${id} and cleaned up ${bookingsToDelete.length} bookings and ${ordersToDelete.length} orders.`);
    };

    const updateCustomerLocation = async (id: string, loc: { lat: number; lng: number }) => {
        await updateDoc(doc(firestore, 'customers', id), {
            lat: loc.lat,
            lng: loc.lng,
            lastLocationUpdate: new Date().toISOString()
        });
    };

    const addOrder = async (order: Omit<Order, 'id'>) => {
        const sanitizedOrder = cleanObject(order);
        const ref = await addDoc(collection(firestore, 'orders'), sanitizedOrder);
        return { id: ref.id, ...sanitizedOrder } as Order;
    };

    const updateOrderStatus = async (id: string, status: OrderStatus) => {
        await updateDoc(doc(firestore, 'orders', id), {
            status,
            statusHistory: arrayUnion({ status, timestamp: new Date().toISOString() })
        });
    };

    const uploadFile = async (file: File, path: string): Promise<string> => {
        const fileRef = storageRef(storage, path);
        await uploadBytes(fileRef, file);
        return await getDownloadURL(fileRef);
    };

    const addBanner = async (banner: Omit<Banner, 'id'>, imageFile?: File) => {
        let imageUrl = banner.imageUrl;
        if (imageFile) {
            imageUrl = await uploadFile(imageFile, `banners/${Date.now()}_${imageFile.name}`);
        }
        await addDoc(collection(firestore, 'banners'), { ...banner, imageUrl });
    };

    const updateBanner = async (banner: Banner, imageFile?: File) => {
        let imageUrl = banner.imageUrl;
        if (imageFile) {
            imageUrl = await uploadFile(imageFile, `banners/${Date.now()}_${imageFile.name}`);
        }
        const { id, ...bannerData } = banner;
        await updateDoc(doc(firestore, 'banners', id), { ...bannerData, imageUrl });
    };

    const deleteBanner = async (id: string) => {
        await deleteDoc(doc(firestore, 'banners', id));
    };

    const updateSettings = async (updates: Partial<Settings>) => {
        const settingsRef = doc(firestore, 'settings', 'main');
        await setDoc(settingsRef, updates, { merge: true });
    };

    const addAdminUser = async (user: Omit<AdminUser, 'id'>) => {
        const { getSecondaryAuth, deleteSecondaryAuth } = await import('../utils/secondaryAuth');
        const { createUserWithEmailAndPassword } = await import('firebase/auth');

        const { auth: secondaryAuth, app: secondaryApp } = getSecondaryAuth();
        try {
            const userCredential = await createUserWithEmailAndPassword(
                secondaryAuth,
                user.email,
                user.password || 'password123'
            );
            const uid = userCredential.user.uid;

            const newAdminUser: AdminUser = {
                ...user,
                id: uid,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            await setDoc(doc(firestore, 'adminUsers', uid), newAdminUser);
        } finally {
            await deleteSecondaryAuth(secondaryApp);
        }
    };

    const updateAdminUser = async (user: AdminUser) => {
        const { id, ...data } = user;
        const oldAdminDoc = db?.adminUsers.find(u => u.id === id);
        const oldPassword = oldAdminDoc?.password;
        const oldEmail = oldAdminDoc?.email || user.email;

        if (user.password && user.password !== oldPassword) {
            const { getSecondaryAuth, deleteSecondaryAuth } = await import('../utils/secondaryAuth');
            const { signInWithEmailAndPassword, updatePassword } = await import('firebase/auth');

            const { auth: secondaryAuth, app: secondaryApp } = getSecondaryAuth();
            try {
                const userCredential = await signInWithEmailAndPassword(
                    secondaryAuth,
                    oldEmail,
                    oldPassword || ''
                );
                await updatePassword(userCredential.user, user.password);
            } catch (err) {
                console.error("[DatabaseContext] Failed to update admin Auth password:", err);
                throw err;
            } finally {
                await deleteSecondaryAuth(secondaryApp);
            }
        }

        await updateDoc(doc(firestore, 'adminUsers', id), {
            ...data,
            updatedAt: new Date().toISOString()
        });
    };

    const deleteAdminUser = async (id: string) => {
        await deleteDoc(doc(firestore, 'adminUsers', id));
    };

    // --- Monetization CRUD ---
    const updatePayoutStatus = async (
        payoutId: string, 
        status: 'Pending' | 'Approved' | 'Paid' | 'Rejected', 
        mechanicId: string, 
        amount: number,
        adminDetails?: { id: string; name: string; notes?: string; transactionId?: string }
    ) => {
        const payoutRef = doc(firestore, 'payouts', payoutId);
        const mechanicRef = doc(firestore, 'mechanics', mechanicId);
        
        const currentPayout = db?.payouts.find(p => p.id === payoutId);
        const previousStatus = currentPayout?.status;

        const batch = writeBatch(firestore);

        // Update Payout Document
        batch.update(payoutRef, {
            status,
            processDate: new Date().toISOString(),
            processedBy: adminDetails?.name || 'System Admin', // Legacy field
            adminId: adminDetails?.id || 'system',
            adminName: adminDetails?.name || 'System Admin',
            adminNotes: adminDetails?.notes || '',
            transactionId: adminDetails?.transactionId || '',
            ...(status === 'Rejected' && adminDetails?.notes ? { rejectionReason: adminDetails.notes } : {})
        });

        // Balance Logic
        if (status === 'Approved' && previousStatus === 'Pending') {
            // Deduct from wallet, move to locked
            batch.update(mechanicRef, {
                walletBalance: increment(-amount),
                lockedBalance: increment(amount)
            });
        } else if (status === 'Paid') {
            if (previousStatus === 'Approved') {
                // Deduct from locked
                batch.update(mechanicRef, {
                    lockedBalance: increment(-amount)
                });
            } else if (previousStatus === 'Pending') {
                // Direct Paid (skipping Approved stage)
                batch.update(mechanicRef, {
                    walletBalance: increment(-amount)
                });
            }
        } else if (status === 'Rejected') {
            if (previousStatus === 'Approved') {
                // Reverse: move from locked back to wallet
                batch.update(mechanicRef, {
                    lockedBalance: increment(-amount),
                    walletBalance: increment(amount)
                });
            }
            // If it was Pending, nothing was deducted yet, so no balance change needed
        }

        await batch.commit();

        // Notifications
        let notificationTitle = 'Payout Update';
        let notificationMessage = '';
        let notificationType: 'info' | 'success' | 'warning' | 'alert' = 'info';

        if (status === 'Approved') {
            notificationTitle = 'Payout Approved';
            notificationMessage = `Your payout request for ₱${amount.toLocaleString()} has been approved and is being processed.`;
            notificationType = 'success';
        } else if (status === 'Paid') {
            notificationTitle = 'Payout Processed';
            notificationMessage = `Your payout of ₱${amount.toLocaleString()} has been successfully transferred to your account. Transaction completed.`;
            notificationType = 'success';
        } else if (status === 'Rejected') {
            notificationTitle = 'Payout Rejected';
            notificationMessage = `Your payout request for ₱${amount.toLocaleString()} was rejected. Reason: ${adminDetails?.notes || 'No reason provided.'}`;
            notificationType = 'alert';
        }

        if (notificationMessage) {
            await sendNotification({
                recipientId: `mechanic-${mechanicId}`,
                title: notificationTitle,
                message: notificationMessage,
                type: notificationType,
                date: new Date().toISOString(),
                read: false,
                link: '/mechanic-portal/profile'
            });
        }
    };

    const addPayoutRequest = async (request: { mechanicId: string; mechanicName: string; amount: number; paymentMethod: string; accountDetails: string; notes?: string }) => {
        // Double check balance accounting for other pending requests
        const mechanic = db?.mechanics.find(m => m.id === request.mechanicId);
        const pendingAmount = db?.payouts
            .filter(p => p.mechanicId === request.mechanicId && p.status === 'Pending')
            .reduce((sum, p) => sum + p.amount, 0) || 0;

        const completedJobs = db?.bookings.filter(b => (b.mechanic?.id === request.mechanicId || b.mechanicId === request.mechanicId) && b.status === 'Completed') || [];
        const calculatedEarnings = completedJobs.reduce((sum, job) => sum + (job.service?.price || job.services?.[0]?.price || 0), 0);
        const lifetimeEarnings = (mechanic as any)?.totalEarnings || calculatedEarnings;
        const availableBalanceBase = (mechanic?.walletBalance || 0) || lifetimeEarnings;

        if (mechanic && availableBalanceBase - pendingAmount < request.amount) {
            throw new Error('Insufficient wallet balance (Pending requests: ₱' + pendingAmount.toLocaleString() + ').');
        }

        await addDoc(collection(firestore, 'payouts'), {
            ...request,
            status: 'Pending',
            requestDate: new Date().toISOString(),
            submittedAt: new Date().toISOString()
        });

        await sendNotification({
            recipientId: 'admin',
            title: 'New Payout Request',
            message: `${request.mechanicName} has requested a payout of ₱${request.amount.toLocaleString()}`,
            type: 'alert',
            date: new Date().toISOString(),
            read: false,
            link: '/admin-portal/payouts'
        });
    };

    const addSubscription = async (subscription: Omit<Subscription, 'id'>) => {
        await addDoc(collection(firestore, 'subscriptions'), subscription);
    };

    const updateSubscription = async (subscription: Subscription) => {
        const { id, ...data } = subscription;
        await updateDoc(doc(firestore, 'subscriptions', id), data);
    };

    const deleteSubscription = async (id: string) => {
        await deleteDoc(doc(firestore, 'subscriptions', id));
    };

    const addPromoCode = async (promoCode: Omit<PromoCode, 'id'>) => {
        await addDoc(collection(firestore, 'promoCodes'), promoCode);
    };

    const updatePromoCode = async (promoCode: PromoCode) => {
        const { id, ...data } = promoCode;
        await updateDoc(doc(firestore, 'promoCodes', id), data);
    };

    const deletePromoCode = async (id: string) => {
        await deleteDoc(doc(firestore, 'promoCodes', id));
    };

    const respondToReschedule = async (bookingId: string, response: 'accepted' | 'rejected') => {
        const booking = db?.bookings.find(b => b.id === bookingId);
        if (!booking || !booking.rescheduleDetails) return;

        if (response === 'accepted') {
            await updateDoc(doc(firestore, 'bookings', bookingId), {
                status: 'Upcoming' as BookingStatus,
                date: booking.rescheduleDetails.newDate,
                time: booking.rescheduleDetails.newTime,
                rescheduleDetails: null,
                statusHistory: arrayUnion({ status: 'Reschedule Accepted', timestamp: new Date().toISOString() })
            });
        } else {
            await updateDoc(doc(firestore, 'bookings', bookingId), {
                status: 'Upcoming' as BookingStatus,
                rescheduleDetails: null,
                statusHistory: arrayUnion({ status: 'Reschedule Rejected', timestamp: new Date().toISOString() })
            });
        }
    };

    // Mechanic accepts an incoming job request and self-assigns
    const acceptJobRequest = async (bookingId: string, mechanicParam?: Mechanic) => {
        const mechanicUser = auth.currentUser;
        if (!mechanicUser && !mechanicParam) throw new Error('Not authenticated');

        const mechanicDoc = mechanicParam || db?.mechanics.find(m => m.id === (mechanicUser?.uid));
        if (!mechanicDoc) throw new Error('Mechanic profile not found');

        await updateDoc(doc(firestore, 'bookings', bookingId), {
            mechanicId: mechanicDoc.id,
            mechanicName: mechanicDoc.name,
            mechanic: {
                id: mechanicDoc.id,
                name: mechanicDoc.name,
                email: mechanicDoc.email,
                phone: mechanicDoc.phone,
                imageUrl: mechanicDoc.imageUrl || '',
                rating: mechanicDoc.rating,
                reviews: mechanicDoc.reviews
            },
            status: 'Mechanic Assigned' as BookingStatus,
            statusHistory: arrayUnion({ status: 'Mechanic Assigned', timestamp: new Date().toISOString() })
        });

        const booking = db?.bookings.find(b => b.id === bookingId);
        if (booking) {
            const serviceName = booking.services?.[0]?.name || booking.service?.name || 'service';
            await sendNotification({
                recipientId: `customer-${booking.customerId}`,
                title: '✅ Mechanic Accepted Your Job',
                message: `${mechanicDoc.name} has accepted your ${serviceName} request and will be heading to you soon.`,
                type: 'success',
                date: new Date().toISOString(),
                read: false,
                link: `/customer-portal/booking-detail/${bookingId}`
            });
        }
    };

    const addNotification = async (notification: Omit<Notification, 'id'>) => {
        try {
            await addDoc(collection(firestore, 'notifications'), notification);
        } catch (e) {
            console.warn("[Notification] addNotification failed:", e);
        }
    };

    const markNotificationAsRead = async (id: string) => {
        try {
            await updateDoc(doc(firestore, 'notifications', id), { read: true });
        } catch (e) {
            console.warn("[Notification] markNotificationAsRead failed:", e);
        }
    };

    const markAllNotificationsAsRead = async (recipientId: string) => {
        try {
            const batch = writeBatch(firestore);
            // Only mark user's own notifications as read, NEVER mark 'all' broadcasts
            const unread = db?.notifications.filter(n =>
                n.recipientId === recipientId && n.recipientId !== 'all' && !n.read
            ) || [];
            unread.forEach(n => {
                batch.update(doc(firestore, 'notifications', n.id), { read: true });
            });
            if (unread.length > 0) {
                await batch.commit();
            }
        } catch (e) {
            console.warn("[Notification] markAllNotificationsAsRead failed:", e);
        }
    };

    const deleteNotification = async (id: string) => {
        try {
            await deleteDoc(doc(firestore, 'notifications', id));
        } catch (e) {
            console.warn("[Notification] deleteNotification failed:", e);
        }
    };

    const clearAllNotifications = async (recipientId: string) => {
        try {
            const batch = writeBatch(firestore);
            // Only delete notifications where recipientId EXACTLY matches current user
            // NEVER delete or modify 'all' broadcast notifications (they belong to everyone)
            const myNotifs = db?.notifications.filter(n =>
                n.recipientId === recipientId && n.recipientId !== 'all'
            ) || [];
            myNotifs.forEach(n => {
                batch.delete(doc(firestore, 'notifications', n.id));
            });
            if (myNotifs.length > 0) {
                await batch.commit();
            }
        } catch (e) {
            console.warn("[Notification] clearAllNotifications failed:", e);
        }
    };

    const clearAllNotificationsByPrefix = async (prefix: string) => {
        try {
            const batch = writeBatch(firestore);
            const matched = db?.notifications.filter(n =>
                n.recipientId?.startsWith(prefix) && n.recipientId !== 'all'
            ) || [];
            matched.forEach(n => {
                batch.delete(doc(firestore, 'notifications', n.id));
            });
            if (matched.length > 0) {
                await batch.commit();
            }
        } catch (e) {
            console.warn("[Notification] clearAllNotificationsByPrefix failed:", e);
        }
    };

    const markAllNotificationsAsReadByPrefix = async (prefix: string) => {
        try {
            const batch = writeBatch(firestore);
            const matched = db?.notifications.filter(n =>
                n.recipientId?.startsWith(prefix) && n.recipientId !== 'all' && !n.read
            ) || [];
            matched.forEach(n => {
                batch.update(doc(firestore, 'notifications', n.id), { read: true });
            });
            if (matched.length > 0) {
                await batch.commit();
            }
        } catch (e) {
            console.warn("[Notification] markAllNotificationsAsReadByPrefix failed:", e);
        }
    };

    const addReview = async (bookingId: string, reviewData: Omit<Review, 'id' | 'date'>) => {
        const booking = db?.bookings.find(b => b.id === bookingId);
        if (!booking) throw new Error('Booking not found');

        const review: Review = {
            ...reviewData,
            id: `review-${Date.now()}`,
            date: new Date().toISOString(),
            bookingId
        };

        // Update Booking with Review
        await updateDoc(doc(firestore, 'bookings', bookingId), {
            review,
            isReviewed: true
        });

        // Update Mechanic Rating
        const targetMechanicId = booking.mechanicId || booking.mechanic?.id || reviewData.mechanicId;
        if (targetMechanicId) {
            const mechanic = db?.mechanics.find(m => m.id === targetMechanicId);
            if (mechanic) {
                const currentRating = mechanic.rating || 0;
                const currentReviews = mechanic.reviews || 0;
                const newReviews = currentReviews + 1;
                const newRating = ((currentRating * currentReviews) + review.rating) / newReviews;

                await updateDoc(doc(firestore, 'mechanics', targetMechanicId), {
                    rating: newRating,
                    reviews: newReviews,
                    reviewsList: arrayUnion(review)
                });

                // Notify mechanic about new review
                const mechanicName = reviewData.mechanicName || booking.mechanicName || booking.mechanic?.name || 'Mechanic';
                await sendNotification({
                    recipientId: `mechanic-${targetMechanicId}`,
                    title: '⭐ New Review Received',
                    message: `${reviewData.customerName} gave you ${review.rating} star${review.rating > 1 ? 's' : ''}! "${review.comment.slice(0, 80)}${review.comment.length > 80 ? '...' : ''}"`,
                    type: 'success',
                    date: new Date().toISOString(),
                    read: false,
                    link: '/mechanic-portal/profile'
                });
            }
        }
    };

    const updateReview = async (bookingId: string, updatedReview: Review) => {
        const booking = db?.bookings.find(b => b.id === bookingId);
        if (!booking || !booking.review) throw new Error('Booking or review not found');
        const oldReview = booking.review;

        await updateDoc(doc(firestore, 'bookings', bookingId), {
            review: { ...updatedReview, updatedAt: new Date().toISOString() }
        });

        // Update Mechanic Rating
        if (booking.mechanicId) {
            const mechanic = db?.mechanics.find(m => m.id === booking.mechanicId);
            if (mechanic) {
                const currentRating = mechanic.rating || 0;
                const numReviews = mechanic.reviews || 1; // Prevent division by zero
                // Calculate old total score, subtract old rating, add new rating, divide by same count
                const newRating = ((currentRating * numReviews) - oldReview.rating + updatedReview.rating) / numReviews;

                // For reviewsList update, we'd successfully need to replace the item in the array.
                // Firestore arrayRemove/Union is simple but for updating an object inside, we need to read-modify-write the whole array
                // OR we just accept we can't easily update the array object deep prop without reading.
                // Since we have 'db' state, we can filter and reconstruct.
                const updatedReviewsList = (mechanic.reviewsList || []).map((r: Review) => r.id === updatedReview.id ? updatedReview : r);

                await updateDoc(doc(firestore, 'mechanics', booking.mechanicId), {
                    rating: newRating,
                    reviewsList: updatedReviewsList
                });
            }
        }
    };

    const addTask = async (task: Omit<Task, 'id' | 'isComplete' | 'completionDate'>) => {
        await addDoc(collection(firestore, 'tasks'), {
            ...task,
            isComplete: false,
            createdAt: new Date().toISOString()
        });
    };

    const updateTask = async (task: Task) => {
        const { id, ...data } = task;
        await updateDoc(doc(firestore, 'tasks', id), data);
    };

    const deleteMultipleTasks = async (taskIds: string[]) => {
        const batch = writeBatch(firestore);
        taskIds.forEach(id => {
            batch.delete(doc(firestore, 'tasks', id));
        });
        await batch.commit();
    };

    const updateMultipleTasksStatus = async (taskIds: string[], isComplete: boolean) => {
        const batch = writeBatch(firestore);
        taskIds.forEach(id => {
            batch.update(doc(firestore, 'tasks', id), {
                isComplete,
                completionDate: isComplete ? new Date().toISOString() : null
            });
        });
        await batch.commit();
    };


    const updateUserNotificationSettings = async (userId: string, settings: Customer['notificationSettings']) => {
        await updateDoc(doc(firestore, 'customers', userId), { notificationSettings: settings ?? null });
        console.log(`[DatabaseContext] Updated notification settings for customer ${userId}`);
    };

    const updateMechanicNotificationSettings = async (mechanicId: string, settings: Mechanic['notificationSettings']) => {
        await updateDoc(doc(firestore, 'mechanics', mechanicId), { notificationSettings: settings ?? null });
        console.log(`[DatabaseContext] Updated notification settings for mechanic ${mechanicId}`);
    };

    return (
        <DatabaseContext.Provider value={{
            db,
            loading,
            addService,
            updateService,
            deleteService,
            addPart,
            updatePart,
            deletePart,
            addMechanic,
            updateMechanic,
            updateMechanicOnlineStatus,
            updateMechanicLocation,
            deleteMechanic,
            addBooking,
            updateBooking,
            updateBookingPayment,
            updateBookingStatus,
            assignMechanicToBooking,
            cancelBooking,
            deleteBooking,
            deleteAllBookings,
            respondToReschedule,
            acceptJobRequest,
            addCustomer,
            updateCustomer,
            deleteCustomer,
            updateCustomerLocation,
            addOrder,
            updateOrderStatus,
            addPayoutRequest,
            updatePayoutStatus,
            addBanner,
            updateBanner,
            deleteBanner,
            updateSettings,
            addAdminUser,
            updateAdminUser,
            deleteAdminUser,
            addSubscription,
            updateSubscription,
            deleteSubscription,
            addPromoCode,
            updatePromoCode,
            deletePromoCode,
            addNotification,
            markNotificationAsRead,
            markAllNotificationsAsRead,
            deleteNotification,
            clearAllNotifications,
            clearAllNotificationsByPrefix,
            markAllNotificationsAsReadByPrefix,
            addReview,
            updateReview,
            verifyBookingPayment,
            initiateGCashPayment,
            notifyAdminGCashReceiptUploaded,
            addTask,
            updateTask,
            deleteMultipleTasks,
            updateMultipleTasksStatus,
            updateUserNotificationSettings,
            updateMechanicNotificationSettings
        }}>
            {children}
        </DatabaseContext.Provider>
    );
};
