import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { Service, Part, Mechanic, Booking, Customer, Settings, BookingStatus, Order, Review, Banner, FAQCategory, AdminUser, Role, Task, Database, OrderStatus, PayoutRequest, RentalCar, RentalBooking, HireDriver, Subscription, PromoCode, Notification, AppService, ServiceRequest, ServiceProvider, ServicePricing, ServiceActivityLog, LiaisonBranch, LiaisonStaff, LiaisonBooking } from '../types';
import { db as firestore, rtdb, storage } from '../firebase';
import { seedRentalCars, seedHireDrivers } from '../data/mockData';
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
    where,
    getDoc
} from 'firebase/firestore';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { paymentService } from '../services/PaymentService';
import { sendEmail, sendTemplatedEmail } from '../services/emailService';
import { getJobTotalAmount, calculateMechanicWalletLedger } from '../utils/mechanicLedger';

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
    updateBookingPayment: (bookingId: string, amount: number, status: 'pending' | 'partial' | 'paid' | 'downpayment_paid', extraData?: Partial<Booking>) => Promise<void>;
    updateBookingStatus: (bookingId: string, status: BookingStatus) => Promise<void>;
    assignMechanicToBooking: (bookingId: string, mechanic: Mechanic) => Promise<void>;
    cancelBooking: (bookingId: string, reason: string) => Promise<void>;
    deleteBooking: (bookingId: string) => Promise<void>;
    deleteAllBookings: (collectionName?: string) => Promise<void>;
    addCustomer: (customer: Omit<Customer, 'id'>) => Promise<Customer | null>;
    updateCustomer: (updatedCustomer: Customer) => Promise<void>;
    updateCustomerLocation: (customerId: string, location: { lat: number; lng: number }) => Promise<void>;
    addOrder: (order: Omit<Order, 'id'>) => Promise<Order | null>;
    updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
    deleteOrder: (orderId: string) => Promise<void>;
    deleteAllOrders: () => Promise<void>;
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
    addNotification: (notification: Omit<Notification, 'id' | 'status' | 'createdAt' | 'createdBy' | 'recipientRole'> & Partial<Pick<Notification, 'status' | 'createdAt' | 'createdBy' | 'recipientRole'>>) => Promise<void>;
    markNotificationAsRead: (notificationId: string) => Promise<void>;
    markAllNotificationsAsRead: (recipientId: string) => Promise<void>;
    deleteNotification: (notificationId: string) => Promise<void>;
    clearAllNotifications: (recipientId: string, specificIds?: string[]) => Promise<void>;
    clearAllNotificationsByPrefix: (prefix: string) => Promise<void>;
    purgeGoogleMapsApiNotifications: () => Promise<number>;
    addPayoutRequest: (request: { mechanicId: string; mechanicName: string; amount: number; paymentMethod: string; accountDetails: string; notes?: string }) => Promise<void>;
    updatePayoutStatus: (payoutId: string, status: 'Pending' | 'Approved' | 'Paid' | 'Rejected', mechanicId: string, amount: number, adminDetails?: { id: string; name: string; notes?: string; transactionId?: string }) => Promise<void>;
    deletePayoutRequest: (payoutId: string) => Promise<void>;
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
    // RidersBud Services
    addAppService: (appService: Omit<AppService, 'id'>) => Promise<void>;
    updateAppService: (appService: AppService) => Promise<void>;
    deleteAppService: (id: string) => Promise<void>;
    addServiceProvider: (provider: Omit<ServiceProvider, 'id'>) => Promise<void>;
    updateServiceProvider: (provider: ServiceProvider) => Promise<void>;
    deleteServiceProvider: (id: string) => Promise<void>;
    addServicePricing: (pricing: Omit<ServicePricing, 'id'>) => Promise<void>;
    updateServicePricing: (pricing: ServicePricing) => Promise<void>;
    deleteServicePricing: (id: string) => Promise<void>;
    addServiceRequest: (request: Omit<ServiceRequest, 'id'>) => Promise<ServiceRequest>;
    updateServiceRequest: (id: string, updates: Partial<ServiceRequest>) => Promise<void>;
    updateServiceRequestStatus: (id: string, status: string, notes?: string) => Promise<void>;
    // Rental Fleet
    addRentalCar: (car: Omit<RentalCar, 'id'>) => Promise<void>;
    updateRentalCar: (car: RentalCar) => Promise<void>;
    deleteRentalCar: (id: string) => Promise<void>;
    addRentalBooking: (booking: Omit<RentalBooking, 'id'>) => Promise<RentalBooking>;
    updateRentalBooking: (id: string, updates: Partial<RentalBooking>) => Promise<void>;
    deleteRentalBooking: (id: string) => Promise<void>;
    // Hire Drivers
    addHireDriver: (driver: Omit<HireDriver, 'id'>) => Promise<void>;
    updateHireDriver: (driver: HireDriver) => Promise<void>;
    deleteHireDriver: (id: string) => Promise<void>;
    // Liaison Services
    addLiaisonBooking: (booking: Omit<LiaisonBooking, 'id'>) => Promise<LiaisonBooking>;
    updateLiaisonBooking: (id: string, updates: Partial<LiaisonBooking>) => Promise<void>;
    updateLiaisonBookingStatus: (id: string, status: LiaisonBooking['status'], notes?: string, officerName?: string) => Promise<void>;
    deleteLiaisonBooking: (id: string) => Promise<void>;
    deleteServiceRequest: (id: string) => Promise<void>;
}

// Stable context reference across HMR to prevent "must be used within a Provider" errors
// during Vite hot module reload when the context object reference changes.
const _getDbCtx = () => {
    if ((globalThis as any).__ridersbud_db_ctx) return (globalThis as any).__ridersbud_db_ctx;
    const ctx = createContext<DatabaseContextType | undefined>(undefined);
    (globalThis as any).__ridersbud_db_ctx = ctx;
    return ctx;
};
const DatabaseContext = _getDbCtx();

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
    'QuotaExceededError',
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
    'ERR_QUIC_PROTOCOL_ERROR',
    'ERR_HTTP2_PING_FAILED',
    'ERR_HTTP2_PROTOCOL_ERROR',
    'net::ERR_HTTP2_PING_FAILED',
    'Write/channel',
    'Listen/channel',
    'webchannel',
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

// Helper to remove any undefined fields recursively to prevent Firestore 'Unsupported field value: undefined' errors
const cleanFirestoreData = (obj: any): any => {
    if (obj === null || obj === undefined) return null;
    if (typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) {
        return obj
            .filter(item => item !== undefined)
            .map(item => cleanFirestoreData(item));
    }
    const cleaned: Record<string, any> = {};
    for (const [key, val] of Object.entries(obj)) {
        if (val !== undefined) {
            cleaned[key] = cleanFirestoreData(val);
        }
    }
    return cleaned;
};

export const DatabaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const getCachedSettings = (): Settings => {
        try {
            const cached = localStorage.getItem('ridersbud_settings_cache');
            if (cached) {
                return JSON.parse(cached);
            }
        } catch (e) {}
        return {
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
            defaultMechanicImageUrl: '/assets/logo.png',
            hitpayEnabled: true,
            hitpaySandboxMode: true,
            hitpayApiKey: 'live_ec0ea2cf67cf38d8c57c20b56cca7b56034d66400cbd70e2517529a5baaac2cb',
            hitpaySalt: 'Wj5xX1V5DmDJ4hZOlvR9GrTWrgZi8OAJImleDzSMsB7xOlYgK74QlsoCTSetXAAM',
            hitpaySandboxApiKey: 'test_8f19363aee170cc711e558a5503ae6176a25cc7f382cc9aa8c0cf3d81f8639f8',
            hitpaySandboxSalt: 'EsIA9lzyrf9czdNqs7IVZMCKrEmONcvxfSNJpPdaGDr4PxwC6g89J00RtPKreNUL',
            modules: [
                { id: 'rent-a-car', name: 'Rent a Car', enabled: true, bannerMessage: '' },
                { id: 'driver-for-hire', name: 'Driver for Hire', enabled: true, bannerMessage: '' },
                { id: 'liaison-assistance', name: 'Liaison Registration Assistance', enabled: true, bannerMessage: '' },
                { id: 'towing', name: 'Towing Service', enabled: true, bannerMessage: '' }
            ],
            // Default HQ / Store Location
            address: "Carmona Commercial Center, Governor's Drive, Cavite, Philippines",
            storeName: 'RidersBUD Parts & Tools Store',
            storeAddress: "Carmona Commercial Center, Governor's Drive, Cavite, Philippines",
            storeLatitude: 14.3149,
            storeLongitude: 121.0583,
            storePhone: '+63 917 888 7433',
            autoDetectStoreLocation: true,
            // Mechanic Auto-Offline Inactivity Policy
            mechanicAutoOfflineEnabled: true,
            mechanicInactivityThresholdHours: 1,
            // Android In-App APK Update Controls
            appUpdateConfig: {
                versionCode: 2,
                versionName: '1.0.1',
                apkUrl: 'https://ridersbud-10806.web.app/releases/RidersBUD-latest.apk',
                releaseNotes: '• Auto updates added\n• High precision GPS fix\n• Improved driver dispatching',
                mandatory: false,
                fileSizeMb: '27.3 MB',
                showUpdateModal: true,
                targetAudience: 'all',
                externalDownloadUrl: '',
                allowRemindLater: true
            },
            // Specialized Service Customizations (Car Rental, Driver for Hire, Liaison, Towing)
            serviceCustomizations: {
                carRental: {
                    enabled: true,
                    bannerMessage: '',
                    securityDepositAmount: 3000,
                    driverAddonDailyRate: 800,
                    minRentalDays: 1,
                    fuelPolicy: 'full_to_full',
                    dailyMileageLimitKm: 300,
                    insuranceDailyFee: 350,
                    lateReturnPenaltyPerHour: 200,
                    requireValidLicense: true,
                    requireValidId: true,
                    cancellationWindowHours: 24,
                    termsAndConditions: 'Drivers must possess a valid driver\'s license and government-issued ID. Security deposit is fully refundable upon safe vehicle return with no damages.'
                },
                driverHire: {
                    enabled: true,
                    bannerMessage: '',
                    twoHoursRate: 1600,
                    fourHoursRate: 3200,
                    eightHoursRate: 4500,
                    airportTransferRate: 5500,
                    depositPercentage: 50,
                    overtimeRatePerHour: 400,
                    customerCarDiscount: 0,
                    nightDifferentialRatePerHour: 250,
                    advanceBookingNoticeHours: 2,
                    allowCustomerCarOnly: false,
                    termsAndConditions: 'Driver for Hire services require a 50% deposit upon booking confirmation. Overtime charges apply after the selected hourly package.'
                },
                liaison: {
                    enabled: true,
                    bannerMessage: '',
                    renewalServiceFee: 1500,
                    transferOwnershipFee: 2200,
                    duplicateDocFee: 1200,
                    documentPickupFee: 250,
                    rushProcessingFee: 500,
                    leadTimeDays: 2,
                    requireEmissionTestCopy: true,
                    requireInsuranceCopy: true,
                    termsAndConditions: 'Liaison officers handle official LTO document processing. Government fees and document clearance are settled prior to submission.'
                },
                towing: {
                    enabled: true,
                    bannerMessage: '',
                    baseHookupFee: 1500,
                    perKmRate: 65,
                    flatbedSurcharge: 800,
                    winchingRecoveryFee: 1200,
                    nightDifferentialSurcharge: 500,
                    maxDispatchRadiusKm: 50,
                    priorityResponseTimeMinutes: 30,
                    emergencyHotline: '0917-888-7433',
                    termsAndConditions: 'Towing dispatch operates 24/7. Base hookup includes the first 5km; succeeding distance is calculated based on exact GPS coordinates.'
                }
            }
        };
    };

    const initialSettings: Settings = getCachedSettings();

    const getCachedServiceRequests = (): ServiceRequest[] => {
        try {
            const raw = localStorage.getItem('rb_recent_service_requests');
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    };

    const [db, setDb] = useState<Database | null>({
        services: [], parts: [], mechanics: [], bookings: [], customers: [], orders: [],
        banners: [], settings: initialSettings, faqs: [], adminUsers: [], roles: [],
        tasks: [], payouts: [], notifications: [], rentalCars: [], rentalBookings: [], hireDrivers: [],
        subscriptions: [], promoCodes: [],
        appServices: [], serviceRequests: getCachedServiceRequests(), serviceProviders: [], servicePricing: [], serviceActivityLogs: [],
        liaisonBookings: [], liaisonStaff: [], liaisonBranches: []
    });
    const [loading, setLoading] = useState(true);

    // Initial Data Seeding and Realtime Listeners
    useEffect(() => {
        let currentSubscribedId = '';
        let currentSubscribedRole = ''; // 'admin' | 'mechanic' | 'customer' | 'none'

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
        let cachedLiveData: Record<string, any> | null = null;
        const loadLocalFallback = async <T,>(colName: string, onNext: (data: T[]) => void) => {
            try {
                if (!cachedLiveData) {
                    cachedLiveData = (await import('../data/liveData.json')).default;
                }
                const localCollection = cachedLiveData[colName];
                if (Array.isArray(localCollection) && localCollection.length > 0) {
                    console.info(`[LocalFallback] Loaded ${localCollection.length} docs for "${colName}" from liveData.json`);
                    onNext(localCollection as T[]);
                }
            } catch (e) {
                console.warn(`[LocalFallback] Could not load "${colName}" from liveData.json`, e);
            }
        };

        // Public load synchronization tracker to avoid premature loading=false
        let loadedCollectionsCount = 0;
        const expectedPublicCollectionsCount = 17; // settings + 16 subscribePublic calls
        let safetyTimer: any = null;

        const markPublicCollectionLoaded = () => {
            loadedCollectionsCount++;
            if (loadedCollectionsCount >= expectedPublicCollectionsCount) {
                if (safetyTimer) clearTimeout(safetyTimer);
                setLoading(false);
            }
        };

        // Safety timeout to guarantee the loading screen goes away even if network hangs
        safetyTimer = setTimeout(() => {
            setLoading(false);
        }, 1500);

        const safeOnSnapshot = <T,>(
            ref: any,
            onNext: (data: T[]) => void,
            label: string,
            onDone?: () => void
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
                        if (onDone) onDone();
                    },
                    (err) => {
                        const errCode = err?.code || '';
                        const errMsg = err?.message || '';
                        // 404 = stale session / channel gone — Firebase auto-retries internally.
                        // Suppress the noisy console output since it's self-healing.
                        if (errMsg.includes('404') || errCode === 'not-found') {
                            // No-op: the SDK will re-establish the channel automatically
                        } else if (errCode === 'permission-denied' || errCode === 'unavailable') {
                            // On localhost with bypass login or when offline/unavailable, try liveData.json as a read fallback
                            if (isLocalhost) {
                                loadLocalFallback<T>(label, onNext);
                            } else {
                                console.warn(`Error for ${label}: ${errCode} — continuing without data`);
                            }
                        } else if (errMsg.includes('QUIC') || errMsg.includes('net::') || errMsg.includes('ERR_CONNECTION_CLOSED')) {
                            // Network transport errors — self-healing, suppress noise
                        } else {
                            console.warn(`Snapshot error for ${label}:`, errCode || errMsg || err);
                        }
                        if (onDone) onDone();
                    }
                );
            } catch (setupErr) {
                console.warn(`Failed to set up snapshot listener for ${label}:`, setupErr);
                if (onDone) onDone();
                return () => {};
            }
        };

        const subscribePublic = <T,>(colName: string, stateKey: keyof Database) => {
            const q = collection(firestore, colName);
            const unsubscribe = safeOnSnapshot<T>(
                q,
                (data) => {
                    setDb(prev => prev ? { ...prev, [stateKey]: data } : null);

                    if (colName === 'services' && Array.isArray(data)) {
                        const existingServices = data as any[];
                        const hasPMS = existingServices.some(s => 
                            (s.name && s.name.trim().toLowerCase() === 'pms') || 
                            (s.id && s.id === 'pms') ||
                            (s.name && s.name.toLowerCase().includes('periodic maintenance'))
                        );
                        if (!hasPMS) {
                            console.info("[DatabaseContext] Auto-seeding missing PMS service in services collection...");
                            const pmsService = {
                                id: 'pms',
                                name: 'PMS',
                                description: 'Periodic Maintenance Service covering multi-point vehicle inspection, fluid checks, filter cleaning, and preventive tuning.',
                                price: 3500,
                                estimatedTime: '2-3 hours',
                                imageUrl: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?q=80&w=800&auto=format&fit=crop',
                                category: 'Maintenance',
                                isActive: true,
                                icon: '<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>'
                            };
                            setDoc(doc(firestore, 'services', 'pms'), pmsService).catch(err => {
                                console.warn("Failed to auto-seed PMS service:", err);
                            });
                        }
                    }

                    // Auto-seed if collection is empty
                    if (data.length === 0) {
                        if (colName === 'rentalCars') {
                            console.info("[DatabaseContext] Seeding rentalCars collection...");
                            seedRentalCars.forEach(car => {
                                const { id, ...carData } = car;
                                addDoc(collection(firestore, 'rentalCars'), carData).catch(err => 
                                    console.warn("Failed to seed car:", err)
                                );
                            });
                        } else if (colName === 'hireDrivers') {
                            console.info("[DatabaseContext] Seeding hireDrivers collection...");
                            seedHireDrivers.forEach(driver => {
                                const { id, ...driverData } = driver;
                                addDoc(collection(firestore, 'hireDrivers'), driverData).catch(err => 
                                    console.warn("Failed to seed driver:", err)
                                );
                            });
                        } else if (colName === 'liaisonStaff') {
                            console.info("[DatabaseContext] Seeding liaisonStaff collection...");
                            const staffToSeed = [
                                {
                                    id: 'liaison-juan',
                                    name: 'Juan Dela Cruz',
                                    phone: '09181234567',
                                    imageUrl: '/assets/logo.png',
                                    rating: 4.8,
                                    assignedBranches: ['lto-qc', 'lto-pasay'],
                                    assignedServices: ['Vehicle Registration Renewal', 'Transfer of Ownership'],
                                    isAvailable: true,
                                    description: 'Experienced Liaison Officer specializing in registration and license renewals.',
                                    totalJobs: 24
                                },
                                {
                                    id: 'liaison-maria',
                                    name: 'Maria Santos',
                                    phone: '09182345678',
                                    imageUrl: '/assets/logo.png',
                                    rating: 4.9,
                                    assignedBranches: ['lto-makati', 'lto-pasay'],
                                    assignedServices: ['Vehicle Registration Renewal', 'Duplicate OR', 'Duplicate CR'],
                                    isAvailable: true,
                                    description: 'Efficient and professional, handling LTO documents with care.',
                                    totalJobs: 18
                                },
                                {
                                    id: 'liaison-ramon',
                                    name: 'Ramon Valenzuela',
                                    phone: '09183456789',
                                    imageUrl: '/assets/logo.png',
                                    rating: 4.7,
                                    assignedBranches: ['lto-qc', 'lto-makati'],
                                    assignedServices: ['Vehicle Registration Renewal', 'Lost Plate', 'Replacement Plate'],
                                    isAvailable: true,
                                    description: 'Dedicated officer with deep knowledge of LTO policies and procedures.',
                                    totalJobs: 15
                                }
                            ];
                            staffToSeed.forEach(staff => {
                                setDoc(doc(firestore, 'liaisonStaff', staff.id), staff).catch(err =>
                                    console.warn("Failed to seed staff:", err)
                                );
                            });
                        }
                    }

                    if (colName === 'liaisonBranches' && data.length < 20) {
                        console.info("[DatabaseContext] Seeding/Syncing liaisonBranches collection with coordinates...");
                        const branchesToSeed = [
                            { id: 'lto-qc', name: 'LTO Quezon City District Office', address: 'East Avenue, Diliman, Quezon City', city: 'Quezon City', phone: '09171234567', isAvailable: true, lat: 14.6441, lng: 121.0483 },
                            { id: 'lto-pasay', name: 'LTO Pasay District Office', address: 'Domestic Road, Pasay City', city: 'Pasay City', phone: '09172345678', isAvailable: true, lat: 14.5441, lng: 120.9942 },
                            { id: 'lto-makati', name: 'LTO Makati District Office', address: 'Pililia Street, Brgy. Valenzuela, Makati City', city: 'Makati City', phone: '09173456789', isAvailable: true, lat: 14.5613, lng: 121.0180 },
                            { id: 'lto-manila', name: 'LTO Manila Central Office', address: 'San Marcelino St, Ermita, Manila', city: 'Manila', phone: '09174561111', isAvailable: true, lat: 14.5888, lng: 120.9856 },
                            { id: 'lto-taguig', name: 'LTO Taguig Extension Office', address: 'SM Aura Premier, McKinley Parkway, Taguig', city: 'Taguig', phone: '09174562222', isAvailable: true, lat: 14.5469, lng: 121.0543 },
                            { id: 'lto-paranaque', name: 'LTO Parañaque District Office', address: 'Olivares Plaza, Sucat Road, Parañaque', city: 'Parañaque', phone: '09174563333', isAvailable: true, lat: 14.4792, lng: 121.0194 },
                            { id: 'lto-cebu', name: 'LTO Cebu City District Office', address: 'N. Bacalso Avenue, Cebu City', city: 'Cebu City', phone: '09174567890', isAvailable: true, lat: 10.3060, lng: 123.9056 },
                            { id: 'lto-mandaue', name: 'LTO Mandaue District Office', address: 'J.C. De Veyra St, Mandaue City', city: 'Mandaue', phone: '09174564444', isAvailable: true, lat: 10.3308, lng: 123.9372 },
                            { id: 'lto-lapulapu', name: 'LTO Lapu-Lapu District Office', address: 'Pajo, Lapu-Lapu City', city: 'Lapu-Lapu', phone: '09174565555', isAvailable: true, lat: 10.3167, lng: 123.9667 },
                            { id: 'lto-bacolod', name: 'LTO Bacolod District Office', address: 'Cottage Road, Bacolod City', city: 'Bacolod', phone: '09174566666', isAvailable: true, lat: 10.6763, lng: 122.9511 },
                            { id: 'lto-iloilo', name: 'LTO Iloilo District Office', address: 'El 98 Street, Jaro, Iloilo City', city: 'Iloilo City', phone: '09179123456', isAvailable: true, lat: 10.6978, lng: 122.5855 },
                            { id: 'lto-tacloban', name: 'LTO Tacloban District Office', address: 'Real Street, Tacloban City', city: 'Tacloban', phone: '09174567777', isAvailable: true, lat: 11.2333, lng: 125.0000 },
                            { id: 'lto-davao', name: 'LTO Davao City District Office', address: 'Quimpo Boulevard, Davao City', city: 'Davao City', phone: '09175678901', isAvailable: true, lat: 7.0863, lng: 125.6144 },
                            { id: 'lto-gensan', name: 'LTO General Santos District Office', address: 'Bulaong Road, General Santos City', city: 'GenSan', phone: '09174568888', isAvailable: true, lat: 6.1228, lng: 125.1724 },
                            { id: 'lto-cdo', name: 'LTO Cagayan de Oro District Office', address: 'M.H. Del Pilar Street, Cagayan de Oro City', city: 'Cagayan de Oro', phone: '09178901234', isAvailable: true, lat: 8.4822, lng: 124.6472 },
                            { id: 'lto-zamboanga', name: 'LTO Zamboanga District Office', address: 'Veterans Avenue, Zamboanga City', city: 'Zamboanga City', phone: '09179012345', isAvailable: true, lat: 6.9080, lng: 122.0620 },
                            { id: 'lto-butuan', name: 'LTO Butuan District Office', address: 'J.C. Aquino Ave, Butuan City', city: 'Butuan', phone: '09174569999', isAvailable: true, lat: 8.9475, lng: 125.5406 },
                            { id: 'lto-baguio', name: 'LTO Baguio District Office', address: 'Governor Pack Road, Baguio City', city: 'Baguio City', phone: '09176789012', isAvailable: true, lat: 16.4076, lng: 120.5978 },
                            { id: 'lto-angeles', name: 'LTO Angeles District Office', address: 'McArthur Highway, Angeles City, Pampanga', city: 'Angeles', phone: '09174560000', isAvailable: true, lat: 15.1432, lng: 120.5883 },
                            { id: 'lto-naga', name: 'LTO Naga District Office', address: 'Concepcion Grande, Naga City', city: 'Naga', phone: '09174560011', isAvailable: true, lat: 13.6218, lng: 123.1948 },
                            { id: 'lto-dagupan', name: 'LTO Dagupan District Office', address: 'Caranglaan Road, Dagupan City', city: 'Dagupan', phone: '09174560022', isAvailable: true, lat: 16.0433, lng: 120.3433 }
                        ];
                        branchesToSeed.forEach(branch => {
                            setDoc(doc(firestore, 'liaisonBranches', branch.id), branch).catch(err =>
                                console.warn("Failed to seed branch:", err)
                            );
                        });
                    }

                    if (colName === 'liaisonStaff' && data.length < 5) {
                        console.info("[DatabaseContext] Seeding/Syncing liaisonStaff collection with 5 mockup agents...");
                        const staffToSeed = [
                            {
                                id: 'liaison-juan',
                                name: 'Juan Dela Cruz',
                                phone: '09181234567',
                                imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
                                rating: 4.8,
                                assignedBranches: ['lto-qc', 'lto-pasay'],
                                assignedServices: ['Vehicle Registration Renewal', 'Transfer of Ownership'],
                                isAvailable: true,
                                description: 'Experienced Liaison Officer specializing in registration and license renewals.',
                                totalJobs: 24
                            },
                            {
                                id: 'liaison-maria',
                                name: 'Maria Santos',
                                phone: '09182345678',
                                imageUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200',
                                rating: 4.9,
                                assignedBranches: ['lto-makati', 'lto-pasay', 'lto-manila'],
                                assignedServices: ['Vehicle Registration Renewal', 'Duplicate OR', 'Duplicate CR'],
                                isAvailable: true,
                                description: 'Efficient and professional, handling LTO documents with care.',
                                totalJobs: 18
                            },
                            {
                                id: 'liaison-ramon',
                                name: 'Ramon Valenzuela',
                                phone: '09183456789',
                                imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
                                rating: 4.7,
                                assignedBranches: ['lto-angeles', 'lto-pampanga', 'lto-dagupan'],
                                assignedServices: ['Vehicle Registration Renewal', 'Lost Plate', 'Replacement Plate'],
                                isAvailable: true,
                                description: 'Dedicated officer with deep knowledge of LTO policies and procedures.',
                                totalJobs: 15
                            },
                            {
                                id: 'liaison-sarah',
                                name: 'Sarah Geronimo',
                                phone: '09184567890',
                                imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200',
                                rating: 4.95,
                                assignedBranches: ['lto-cebu', 'lto-mandaue', 'lto-lapulapu'],
                                assignedServices: ['Vehicle Registration Renewal', 'Transfer of Ownership', 'Change Engine', 'Change Color'],
                                isAvailable: true,
                                description: 'Visayas regional coordinator, handles all document liaisons with premium efficiency.',
                                totalJobs: 32
                            },
                            {
                                id: 'liaison-michael',
                                name: 'Michael Dinglasan',
                                phone: '09185678901',
                                imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200',
                                rating: 4.85,
                                assignedBranches: ['lto-davao', 'lto-gensan'],
                                assignedServices: ['Vehicle Registration Renewal', 'New Registration', 'Other'],
                                isAvailable: true,
                                description: 'Mindanao document handling specialist, fast processing speed and highly reliable.',
                                totalJobs: 21
                            }
                        ];
                        staffToSeed.forEach(staff => {
                            setDoc(doc(firestore, 'liaisonStaff', staff.id), staff).catch(err =>
                                console.warn("Failed to seed staff:", err)
                            );
                        });
                    }

                    if (colName === 'appServices' && Array.isArray(data)) {
                        // Deduplicate in memory and only purge if exact duplicates exist
                        const seenSlugs = new Set<string>();
                        const cleanData: any[] = [];
                        const duplicateIdsToDelete: string[] = [];

                        data.forEach((service: any) => {
                            const serviceSlug = service.slug || service.name?.toLowerCase().replace(/\s+/g, '-');
                            if (seenSlugs.has(serviceSlug)) {
                                duplicateIdsToDelete.push(service.id);
                            } else {
                                seenSlugs.add(serviceSlug);
                                cleanData.push(service);
                            }
                        });

                        // Delete duplicate docs once without triggering infinite write loops
                        if (duplicateIdsToDelete.length > 0) {
                            duplicateIdsToDelete.forEach(id => {
                                deleteDoc(doc(firestore, 'appServices', id)).catch(() => {});
                            });
                        }

                        // Auto-seed defaults ONLY if collection is completely empty
                        if (data.length === 0) {
                            const defaultServices = [
                                {
                                    name: 'Rent a Car',
                                    slug: 'rent-a-car',
                                    description: 'Browse and rent from our collection of well-maintained vehicles for your personal or business needs.',
                                    isActive: true,
                                    category: 'Special Services',
                                    imageUrl: '/images/services/rent_a_car.png',
                                    features: ['Well-maintained Vehicles', 'Affordable Rates', 'Flexible Terms'],
                                    createdAt: '2026-01-01T00:00:00.000Z',
                                    updatedAt: '2026-01-01T00:00:00.000Z',
                                    order: 1
                                },
                                {
                                    name: 'Driver for Hire',
                                    slug: 'driver-for-hire',
                                    description: 'Professional and reliable drivers for your special trips, errands, or emergencies.',
                                    isActive: true,
                                    category: 'Special Services',
                                    imageUrl: '/images/services/driver_for_hire.png',
                                    features: ['Professional Drivers', 'Flexible Hours', 'Safe Travel'],
                                    createdAt: '2026-01-01T00:00:00.000Z',
                                    updatedAt: '2026-01-01T00:00:00.000Z',
                                    order: 2
                                },
                                {
                                    name: 'Registration Assistance',
                                    slug: 'registration-assistance',
                                    description: 'Hassle-free LTO car registration, license renewal, and transfer of ownership services.',
                                    isActive: true,
                                    category: 'Special Services',
                                    imageUrl: '/images/services/registration_assistance.png',
                                    features: ['Fast Processing', 'No Long Lines', 'Document Verification'],
                                    createdAt: '2026-01-01T00:00:00.000Z',
                                    updatedAt: '2026-01-01T00:00:00.000Z',
                                    order: 3
                                },
                                {
                                    name: 'Towing',
                                    slug: 'towing',
                                    description: 'Reliable and fast towing service to get your vehicle to a safe location or partner shop.',
                                    isActive: true,
                                    category: 'Special Services',
                                    imageUrl: '/images/services/towing.png',
                                    features: ['24/7 Availability', 'Quick Response', 'Safe Vehicle Handling'],
                                    createdAt: '2026-01-01T00:00:00.000Z',
                                    updatedAt: '2026-01-01T00:00:00.000Z',
                                    order: 4
                                }
                            ];

                            defaultServices.forEach(defaultService => {
                                addDoc(collection(firestore, 'appServices'), defaultService).catch(() => {});
                            });
                        }
                    }
                },
                colName,
                markPublicCollectionLoaded
            );
            publicUnsubs.push(unsubscribe);
        };

        const subscribePrivate = <T,>(colName: string, stateKey: keyof Database) => {
            const q = collection(firestore, colName);
            const unsubscribe = safeOnSnapshot<T>(
                q,
                (data) => {
                    if (stateKey === 'notifications' && Array.isArray(data)) {
                        const isGoogleMapsTest = (item: any) => {
                            const title = (item?.title || '').toLowerCase();
                            const message = (item?.message || '').toLowerCase();
                            return (
                                title.includes('google map') ||
                                title.includes('google maps') ||
                                title.includes('maps api') ||
                                message.includes('google maps api') ||
                                message.includes('api key connection test')
                            );
                        };

                        // Filter from memory state immediately
                        const cleanNotifications = (data as any[]).filter(n => !isGoogleMapsTest(n));
                        setDb(prev => prev ? { ...prev, notifications: cleanNotifications } : null);

                        // Batch delete any matching docs in the background
                        const staleDocs = (data as any[]).filter(isGoogleMapsTest);
                        if (staleDocs.length > 0) {
                            try {
                                const batch = writeBatch(firestore);
                                staleDocs.forEach(d => {
                                    if (d.id) batch.delete(doc(firestore, 'notifications', d.id));
                                });
                                batch.commit().catch(e => console.warn('[DatabaseContext] Auto-purge Maps notifs error:', e));
                            } catch (e) {
                                console.warn('[DatabaseContext] Auto-purge batch error:', e);
                            }
                        }
                    } else {
                        setDb(prev => prev ? { ...prev, [stateKey]: data } : null);
                    }
                },
                colName
            );
            privateUnsubs.push(unsubscribe);
        };

        const subscribePrivateQuery = <T,>(q: any, stateKey: keyof Database) => {
            const unsubscribe = safeOnSnapshot<T>(
                q,
                (data) => {
                    if (stateKey === 'notifications' && Array.isArray(data)) {
                        const isGoogleMapsTest = (item: any) => {
                            const title = (item?.title || '').toLowerCase();
                            const message = (item?.message || '').toLowerCase();
                            return (
                                title.includes('google map') ||
                                title.includes('google maps') ||
                                title.includes('maps api') ||
                                message.includes('google maps api') ||
                                message.includes('api key connection test')
                            );
                        };

                        const cleanNotifications = (data as any[]).filter(n => !isGoogleMapsTest(n));
                        setDb(prev => prev ? { ...prev, notifications: cleanNotifications } : null);

                        const staleDocs = (data as any[]).filter(isGoogleMapsTest);
                        if (staleDocs.length > 0) {
                            try {
                                const batch = writeBatch(firestore);
                                staleDocs.forEach(d => {
                                    if (d.id) batch.delete(doc(firestore, 'notifications', d.id));
                                });
                                batch.commit().catch(e => console.warn('[DatabaseContext] Auto-purge query Maps notifs error:', e));
                            } catch (e) {
                                console.warn('[DatabaseContext] Auto-purge batch error:', e);
                            }
                        }
                    } else {
                        setDb(prev => prev ? { ...prev, [stateKey]: data } : null);
                    }
                },
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
                            const newSettings = docSnap.data() as Settings;
                            localStorage.setItem('ridersbud_settings_cache', JSON.stringify(newSettings));
                            setDb(prev => prev ? { ...prev, settings: newSettings } : null);
                        } else {
                            setDoc(doc(firestore, 'settings', 'main'), initialSettings).catch(() => {});
                            localStorage.setItem('ridersbud_settings_cache', JSON.stringify(initialSettings));
                            setDb(prev => prev ? { ...prev, settings: initialSettings } : null);
                        }
                    } catch (innerErr) {
                        console.warn("Error processing settings snapshot:", innerErr);
                    }
                    markPublicCollectionLoaded();
                },
                (err) => {
                    const errCode = err?.code || '';
                    const errMsg = err?.message || '';
                    // Gracefully suppress connection drops and self-healing network channel resets
                    if (errMsg.includes('404') || errCode === 'not-found' || errMsg.includes('QUIC') || errMsg.includes('net::') || errMsg.includes('ERR_CONNECTION_CLOSED')) {
                        // Silent retry handled automatically by Firestore SDK
                    } else {
                        console.warn("Settings subscription error, using defaults:", errCode || errMsg || err);
                    }
                    // Guarantee local fallback is used
                    const cached = getCachedSettings();
                    setDb(prev => prev ? { ...prev, settings: cached } : null);
                    markPublicCollectionLoaded();
                }
            );
            publicUnsubs.push(unsubSettings);
        } catch (setupErr) {
            console.warn("Failed to set up settings listener:", setupErr);
            markPublicCollectionLoaded();
        }

        // Stagger public subscriptions in batches to avoid QUIC_TOO_MANY_RTOS.
        // Opening too many simultaneous Firestore listeners overwhelms the transport.
        const publicBatches = [
            [
                ['adminUsers', 'adminUsers'] as const,
                ['services', 'services'] as const,
                ['parts', 'parts'] as const,
                ['banners', 'banners'] as const,
                ['faqs', 'faqs'] as const,
            ],
            [
                ['mechanics', 'mechanics'] as const,
                ['promoCodes', 'promoCodes'] as const,
                ['roles', 'roles'] as const,
                ['rentalCars', 'rentalCars'] as const,
                ['hireDrivers', 'hireDrivers'] as const,
            ],
            [
                ['subscriptions', 'subscriptions'] as const,
                ['appServices', 'appServices'] as const,
                ['serviceProviders', 'serviceProviders'] as const,
                ['servicePricing', 'servicePricing'] as const,
            ],
        ];
        const publicTimers: any[] = [];
        publicBatches.forEach((batch, i) => {
            publicTimers.push(setTimeout(() => {
                try {
                    batch.forEach(([col, key]) => subscribePublic(col, key));
                } catch (err) {
                    console.warn("Error setting up public Firestore listeners batch:", err);
                }
            }, i * 200));
        });
        // Liaison branches/staff are less critical — subscribe last
        publicTimers.push(setTimeout(() => {
            try {
                subscribePublic<LiaisonBranch>('liaisonBranches', 'liaisonBranches');
                subscribePublic<LiaisonStaff>('liaisonStaff', 'liaisonStaff');
            } catch (err) {
                console.warn("Error setting up liaison Firestore listeners:", err);
            }
        }, 800));

        // --- PRIVATE listeners (torn down and re-built on every auth change / admin bypass login) ---
        const checkAndSubscribe = async (user: any) => {
            const isAdminSession = localStorage.getItem('ridersbud_admin_session') === 'true';
            const isCustomerSession = localStorage.getItem('ridersbud_customer_session') === 'true';
            const isMechanicSession = localStorage.getItem('ridersbud_mechanic_session') === 'true';

            let bypassCustomer: any = null;
            if (isCustomerSession) {
                try {
                    const userDataStr = localStorage.getItem('ridersbud_customer_user_data');
                    if (userDataStr) {
                        bypassCustomer = JSON.parse(userDataStr);
                    }
                } catch (e) {
                    console.warn("Error parsing customer bypass user data in DatabaseContext:", e);
                }
            }

            let bypassMechanic: any = null;
            if (isMechanicSession) {
                try {
                    const userDataStr = localStorage.getItem('ridersbud_mechanic_user_data');
                    if (userDataStr) {
                        bypassMechanic = JSON.parse(userDataStr);
                    }
                } catch (e) {
                    console.warn("Error parsing mechanic bypass user data in DatabaseContext:", e);
                }
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

            // Determine target identity and role
            let targetId = '';
            let targetRole = 'none';

            if (isAdmin) {
                targetId = 'admin';
                targetRole = 'admin';
            } else if (isMechanic && user) {
                targetId = user.uid;
                targetRole = 'mechanic';
            } else if (isMechanicSession && bypassMechanic) {
                targetId = bypassMechanic.id;
                targetRole = 'mechanic';
            } else if (user || bypassCustomer) {
                targetId = user?.uid || bypassCustomer?.id || '';
                targetRole = 'customer';
            }

            // Guard: If we are already subscribed to this session, bypass resubscription
            if (currentSubscribedId === targetId && currentSubscribedRole === targetRole) {
                return;
            }

            // Update tracked subscription session
            currentSubscribedId = targetId;
            currentSubscribedRole = targetRole;

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
                rentalBookings: [],
                serviceRequests: [],
                serviceActivityLogs: [],
                liaisonBookings: []
            } : null);

            if (targetRole === 'none') {
                return;
            }

            // Helper to stagger private subscriptions and avoid QUIC transport overwhelm
            const staggerPrivate = (fn: () => void, delayMs: number) => {
                setTimeout(fn, delayMs);
            };

            if (isAdmin) {
                // Batch 1 (immediate): core data
                subscribePrivate('bookings', 'bookings');
                subscribePrivate('customers', 'customers');
                subscribePrivate('orders', 'orders');
                // Batch 2 (200ms): secondary data
                staggerPrivate(() => {
                    subscribePrivate('tasks', 'tasks');
                    subscribePrivate('payouts', 'payouts');
                    subscribePrivate('notifications', 'notifications');
                }, 200);
                // Batch 3 (500ms): tertiary data
                staggerPrivate(() => {
                    subscribePrivate('rentalBookings', 'rentalBookings');
                    subscribePrivate('serviceRequests', 'serviceRequests');
                    subscribePrivate('serviceActivityLogs', 'serviceActivityLogs');
                    subscribePrivate<LiaisonBooking>('liaisonBookings', 'liaisonBookings');
                }, 500);
            } else if (isMechanic && user) {
                subscribePrivate('bookings', 'bookings');
                subscribePrivate('customers', 'customers');
                staggerPrivate(() => {
                    subscribePrivateQuery(query(collection(firestore, 'tasks'), where('mechanicId', '==', user.uid)), 'tasks');
                    subscribePrivateQuery(query(collection(firestore, 'payouts'), where('mechanicId', '==', user.uid)), 'payouts');
                    subscribePrivateQuery(query(collection(firestore, 'notifications'),
                        where('recipientId', 'in', [user.uid, 'all']),
                        where('recipientRole', '==', 'mechanic')
                    ), 'notifications');
                }, 200);
                setDb(prev => prev ? { ...prev, orders: [], rentalBookings: [] } : null);
            } else if (isMechanicSession && bypassMechanic) {
                const mechanicId = bypassMechanic.id;
                subscribePrivate('bookings', 'bookings');
                subscribePrivate('customers', 'customers');
                staggerPrivate(() => {
                    subscribePrivateQuery(query(collection(firestore, 'tasks'), where('mechanicId', '==', mechanicId)), 'tasks');
                    subscribePrivateQuery(query(collection(firestore, 'payouts'), where('mechanicId', '==', mechanicId)), 'payouts');
                    subscribePrivateQuery(query(collection(firestore, 'notifications'),
                        where('recipientId', 'in', [mechanicId, 'all']),
                        where('recipientRole', '==', 'mechanic')
                    ), 'notifications');
                }, 200);
                setDb(prev => prev ? { ...prev, orders: [], rentalBookings: [] } : null);
            } else if (user || bypassCustomer) {
                // Standard Customer
                const customerId = user?.uid || bypassCustomer?.id;
                if (customerId) {
                    const unsubCustomer = safeOnSnapshot(
                        doc(firestore, 'customers', customerId),
                        (data) => setDb(prev => prev ? { ...prev, customers: data } : null),
                        'customer'
                    );
                    privateUnsubs.push(unsubCustomer);

                    subscribePrivateQuery(query(collection(firestore, 'bookings'), where('customerId', '==', customerId)), 'bookings');
                    subscribePrivateQuery(query(collection(firestore, 'orders'), where('customerId', '==', customerId)), 'orders');
                    staggerPrivate(() => {
                        subscribePrivateQuery(query(collection(firestore, 'rentalBookings'), where('customerId', '==', customerId)), 'rentalBookings');
                        subscribePrivateQuery(query(collection(firestore, 'serviceRequests'), where('customerId', '==', customerId)), 'serviceRequests');
                        subscribePrivateQuery(query(collection(firestore, 'serviceActivityLogs'), where('customerId', '==', customerId)), 'serviceActivityLogs');
                        subscribePrivateQuery(query(collection(firestore, 'liaisonBookings'), where('customerId', '==', customerId)), 'liaisonBookings');
                        subscribePrivateQuery(query(collection(firestore, 'notifications'),
                            where('recipientId', 'in', [customerId, 'all']),
                            where('recipientRole', '==', 'customer')
                        ), 'notifications');
                    }, 200);
                }
                setDb(prev => prev ? { ...prev, tasks: [], payouts: [] } : null);
            }
        };

        const authUnsub = onAuthStateChanged(auth, checkAndSubscribe);

        // Listen for auth bypass events
        const handleAdminAuthChange = () => {
            checkAndSubscribe(auth.currentUser);
        };
        window.addEventListener('adminAuthChange', handleAdminAuthChange);
        window.addEventListener('customerAuthChange', handleAdminAuthChange);
        window.addEventListener('mechanicAuthChange', handleAdminAuthChange);
        window.addEventListener('storage', handleAdminAuthChange);

        // Run initial check
        checkAndSubscribe(auth.currentUser);

        return () => {
            if (safetyTimer) clearTimeout(safetyTimer);
            publicTimers.forEach(t => clearTimeout(t));
            authUnsub();
            window.removeEventListener('adminAuthChange', handleAdminAuthChange);
            window.removeEventListener('customerAuthChange', handleAdminAuthChange);
            window.removeEventListener('mechanicAuthChange', handleAdminAuthChange);
            window.removeEventListener('storage', handleAdminAuthChange);
            publicUnsubs.forEach(u => { try { u(); } catch (_) {} });
            privateUnsubs.forEach(u => { try { u(); } catch (_) {} });
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

    const sendNotification = async (notif: Omit<Notification, 'id' | 'status' | 'createdAt' | 'createdBy' | 'recipientRole'> & Partial<Pick<Notification, 'status' | 'createdAt' | 'createdBy' | 'recipientRole'>>) => {
        let recipientId = notif.recipientId || 'all';
        let recipientRole: 'customer' | 'mechanic' | 'admin' | undefined;

        if (recipientId.startsWith('mechanic-')) {
            recipientId = recipientId.replace('mechanic-', '');
            recipientRole = 'mechanic';
        } else if (recipientId.startsWith('customer-')) {
            recipientId = recipientId.replace('customer-', '');
            recipientRole = 'customer';
        } else if (recipientId === 'admin') {
            recipientRole = 'admin';
        }

        const newNotif = {
            ...notif,
            recipientId,
            recipientRole: notif.recipientRole || recipientRole,
            id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            status: 'unread',
            read: false,
            createdAt: notif.createdAt || new Date().toISOString(),
            createdBy: notif.createdBy || auth.currentUser?.uid || 'system'
        } as Notification;

        if (!auth.currentUser) {
            setDb(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    notifications: [newNotif, ...(prev.notifications || [])]
                };
            });
            return;
        }

        try {
            await addDoc(collection(firestore, 'notifications'), {
                ...notif,
                recipientId,
                recipientRole: notif.recipientRole || recipientRole,
                timestamp: Date.now(),
                status: 'unread',
                read: false,
                createdAt: notif.createdAt || new Date().toISOString(),
                createdBy: notif.createdBy || auth.currentUser?.uid || 'system'
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
            recipientRole: 'customer',
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

    const addAppService = async (appService: Omit<AppService, 'id'>) => {
        await addDoc(collection(firestore, 'appServices'), appService);
    };

    const updateAppService = async (appService: AppService) => {
        const { id, ...data } = appService;
        await updateDoc(doc(firestore, 'appServices', id), data);
    };

    const deleteAppService = async (id: string) => {
        await deleteDoc(doc(firestore, 'appServices', id));
    };

    const addServiceProvider = async (provider: Omit<ServiceProvider, 'id'>) => {
        await addDoc(collection(firestore, 'serviceProviders'), provider);
    };

    const updateServiceProvider = async (provider: ServiceProvider) => {
        const { id, ...data } = provider;
        await updateDoc(doc(firestore, 'serviceProviders', id), data);
    };

    const deleteServiceProvider = async (id: string) => {
        await deleteDoc(doc(firestore, 'serviceProviders', id));
    };

    const addServicePricing = async (pricing: Omit<ServicePricing, 'id'>) => {
        await addDoc(collection(firestore, 'servicePricing'), pricing);
    };

    const updateServicePricing = async (pricing: ServicePricing) => {
        const { id, ...data } = pricing;
        await updateDoc(doc(firestore, 'servicePricing', id), data);
    };

    const deleteServicePricing = async (id: string) => {
        await deleteDoc(doc(firestore, 'servicePricing', id));
    };

    const addServiceRequest = async (request: Omit<ServiceRequest, 'id'>): Promise<ServiceRequest> => {
        const docRef = await addDoc(collection(firestore, 'serviceRequests'), request);
        const newRecord: ServiceRequest = {
            id: docRef.id,
            ...request
        };

        // Optimistically update local database state immediately so customer & admin see it without delay
        setDb(prev => {
            if (!prev) return prev;
            const existing = prev.serviceRequests || [];
            if (existing.some(r => r.id === docRef.id)) return prev;
            return {
                ...prev,
                serviceRequests: [newRecord, ...existing]
            };
        });

        // Backup to local storage for instant offline / reload hydration
        try {
            const rawStored = localStorage.getItem('rb_recent_service_requests');
            const stored = rawStored ? JSON.parse(rawStored) : [];
            localStorage.setItem('rb_recent_service_requests', JSON.stringify([newRecord, ...stored.filter((r: any) => r.id !== docRef.id)].slice(0, 50)));
        } catch {
            // ignore storage errors
        }
        
        // Sync realtime live location to Firebase RTDB tracking path if available
        if ((request as any).location && docRef.id) {
            try {
                const locObj: any = (request as any).location;
                const lat = locObj.latitude ?? locObj.lat;
                const lng = locObj.longitude ?? locObj.lng;
                if (typeof lat === 'number' && typeof lng === 'number') {
                    rtdbSet(rtdbRef(rtdb, `tracking/${docRef.id}/customerLocation`), {
                        lat,
                        lng,
                        address: locObj.address || 'Client Location',
                        updatedAt: Date.now()
                    }).catch(err => console.warn('[RTDB Sync Error] Failed to update serviceRequest location in RTDB:', err));
                }
            } catch (e) {
                console.warn('[RTDB Sync Error] Failed to prepare serviceRequest location for RTDB:', e);
            }
        }

        await addDoc(collection(firestore, 'serviceActivityLogs'), {
            requestId: docRef.id,
            customerId: request.customerId,
            statusTo: request.status || 'Pending',
            notes: 'Request created',
            updatedBy: request.customerId,
            updatedAt: new Date().toISOString()
        });

        await sendNotification({
            recipientId: 'admin',
            title: 'New Service Request',
            message: `${request.customerName} requested ${request.serviceName}`,
            type: 'info',
            date: new Date().toISOString(),
            read: false,
            link: '/admin/services/requests'
        });

        return newRecord;
    };

    // --- Rental Car CRUD ---
    const addRentalCar = async (car: Omit<RentalCar, 'id'>) => {
        await addDoc(collection(firestore, 'rentalCars'), car);
    };

    const updateRentalCar = async (car: RentalCar) => {
        const { id, ...data } = car;
        await updateDoc(doc(firestore, 'rentalCars', id), data);
    };

    const deleteRentalCar = async (id: string) => {
        await deleteDoc(doc(firestore, 'rentalCars', id));
    };

    const addRentalBooking = async (booking: Omit<RentalBooking, 'id'>): Promise<RentalBooking> => {
        const bookingData = {
            ...booking,
            status: booking.status || 'Received',
            createdAt: booking.createdAt || new Date().toISOString()
        };
        
        let newId = '';
        if (auth.currentUser) {
            const docRef = await addDoc(collection(firestore, 'rentalBookings'), bookingData);
            newId = docRef.id;
        } else {
            newId = doc(collection(firestore, 'rentalBookings')).id;
        }
        
        const createdBooking = { id: newId, ...bookingData } as RentalBooking;
        
        // Sync realtime live location to Firebase RTDB tracking path if available
        if (bookingData.location && newId) {
            try {
                const locObj: any = bookingData.location;
                const lat = locObj.latitude ?? locObj.lat;
                const lng = locObj.longitude ?? locObj.lng;
                if (typeof lat === 'number' && typeof lng === 'number') {
                    rtdbSet(rtdbRef(rtdb, `tracking/${newId}/customerLocation`), {
                        lat,
                        lng,
                        address: locObj.address || 'Client Address',
                        updatedAt: Date.now()
                    }).catch(err => console.warn('[RTDB Sync Error] Failed to update customerLocation:', err));
                }
            } catch (e) {
                console.warn('[RTDB Sync Error] Failed to prepare customerLocation:', e);
            }
        }
        
        setDb(prev => {
            if (!prev) return null;
            return {
                ...prev,
                rentalBookings: [createdBooking, ...(prev.rentalBookings || [])]
            };
        });
        
        return createdBooking;
    };

    const updateRentalBooking = async (id: string, updates: Partial<RentalBooking>) => {
        let updatedRecord: RentalBooking | null = null;
        let targetCustomerId = '';
        let targetVehicleName = 'Rental Vehicle';

        setDb(prev => {
            if (!prev) return null;
            const updated = (prev.rentalBookings || []).map(b => {
                if (b.id === id) {
                    targetCustomerId = b.customerId || '';
                    const car = prev.rentalCars?.find(c => c.id === b.carId);
                    if (car) targetVehicleName = `${car.make} ${car.model}`;
                    const history = b.statusHistory ? [...b.statusHistory] : [];
                    if (updates.status && updates.status !== b.status) {
                        history.push({
                            status: updates.status,
                            timestamp: new Date().toISOString(),
                            note: updates.cancelReason ? `Cancellation Reason: ${updates.cancelReason}` : `Status updated to ${updates.status}`
                        });
                    }
                    const merged = { ...b, ...updates, statusHistory: history, updatedAt: new Date().toISOString() };
                    updatedRecord = merged;
                    return merged;
                }
                return b;
            });
            return { ...prev, rentalBookings: updated };
        });

        if (auth.currentUser) {
            try {
                const bookingRef = doc(firestore, 'rentalBookings', id);
                await updateDoc(bookingRef, {
                    ...updates,
                    statusHistory: updatedRecord?.statusHistory || [],
                    updatedAt: new Date().toISOString()
                });
            } catch (e) {
                console.warn(`[Firestore Write Failed] updateRentalBooking for ${id} failed, but local cache is updated:`, e);
            }
        }

        // Send customer notification if status changed
        if (updates.status && targetCustomerId) {
            try {
                await sendNotification({
                    recipientId: targetCustomerId,
                    title: 'Car Rental Status Update',
                    message: `Your booking for ${targetVehicleName} is now: ${updates.status}.`,
                    type: 'booking_status',
                    date: new Date().toISOString(),
                    read: false,
                    link: `/customer-portal/booking/${id}`
                });
            } catch (notifErr) {
                console.warn('[Notification] Failed to send rental status notification:', notifErr);
            }
        }
    };

    const deleteRentalBooking = async (id: string) => {
        setDb(prev => {
            if (!prev) return null;
            const filtered = (prev.rentalBookings || []).filter(b => b.id !== id);
            return { ...prev, rentalBookings: filtered };
        });

        try {
            await deleteDoc(doc(firestore, 'rentalBookings', id));
        } catch (e) {
            console.warn(`[Firestore Delete Failed] deleteRentalBooking for ${id} failed:`, e);
        }
    };

    // --- Hire Driver CRUD ---
    const addHireDriver = async (driver: Omit<HireDriver, 'id'>) => {
        await addDoc(collection(firestore, 'hireDrivers'), driver);
    };

    const updateHireDriver = async (driver: HireDriver) => {
        const { id, ...data } = driver;
        await updateDoc(doc(firestore, 'hireDrivers', id), data);
    };

    const deleteHireDriver = async (id: string) => {
        await deleteDoc(doc(firestore, 'hireDrivers', id));
    };

    // --- Liaison Booking CRUD ---
    const addLiaisonBooking = async (booking: Omit<LiaisonBooking, 'id'>): Promise<LiaisonBooking> => {
        const sanitizedBooking = cleanFirestoreData(booking);
        const docRef = await addDoc(collection(firestore, 'liaisonBookings'), sanitizedBooking);
        const record: LiaisonBooking = { id: docRef.id, ...sanitizedBooking };

        // Optimistically update local database state
        setDb(prev => {
            if (!prev) return prev;
            const existing = prev.liaisonBookings || [];
            if (existing.some(b => b.id === docRef.id)) return prev;
            return {
                ...prev,
                liaisonBookings: [record, ...existing]
            };
        });

        await sendNotification({
            recipientId: 'admin',
            title: 'New Liaison Booking',
            message: `New booking received for LTO ${booking.serviceType} from ${booking.customerName}`,
            type: 'info',
            date: new Date().toISOString(),
            read: false,
            link: '/admin/liaison/bookings'
        });
        return record;
    };

    const updateLiaisonBooking = async (id: string, updates: Partial<LiaisonBooking>) => {
        const sanitizedUpdates = cleanFirestoreData(updates);
        // Optimistically update local database state
        setDb(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                liaisonBookings: (prev.liaisonBookings || []).map(b => 
                    b.id === id ? { ...b, ...sanitizedUpdates, updatedAt: new Date().toISOString() } : b
                )
            };
        });

        try {
            const bookingRef = doc(firestore, 'liaisonBookings', id);
            await updateDoc(bookingRef, {
                ...sanitizedUpdates,
                updatedAt: new Date().toISOString()
            });
        } catch (e) {
            console.warn(`[Firestore Update Failed] updateLiaisonBooking for ${id}:`, e);
        }
    };

    const updateLiaisonBookingStatus = async (id: string, status: LiaisonBooking['status'], notes?: string, officerName?: string) => {
        const bookingRef = doc(firestore, 'liaisonBookings', id);
        const bookingSnap = await getDoc(bookingRef);
        if (!bookingSnap.exists()) return;
        const bookingData = bookingSnap.data() as LiaisonBooking;
        const newHistoryItem = {
            status,
            timestamp: new Date().toISOString(),
            officerName: officerName || bookingData.liaisonName || 'System',
            notes: notes || `Status changed to ${status}`
        };
        await updateDoc(bookingRef, {
            status,
            statusHistory: arrayUnion(newHistoryItem)
        });

        await sendNotification({
            recipientId: bookingData.customerId,
            title: 'Liaison Booking Updated',
            message: `Your Liaison booking status is now: ${status}`,
            type: 'booking_status',
            date: new Date().toISOString(),
            read: false,
            link: '/customer-portal/liaison-bookings'
        });
    };

    const updateServiceRequestStatus = async (id: string, status: string, notes?: string) => {
        // Optimistically update local database state
        setDb(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                serviceRequests: (prev.serviceRequests || []).map(r => 
                    r.id === id ? { ...r, status, updatedAt: new Date().toISOString() } : r
                )
            };
        });

        // Update local storage cache if available
        try {
            const rawStored = localStorage.getItem('rb_recent_service_requests');
            if (rawStored) {
                const stored = JSON.parse(rawStored);
                localStorage.setItem('rb_recent_service_requests', JSON.stringify(
                    stored.map((r: any) => r.id === id ? { ...r, status, updatedAt: new Date().toISOString() } : r)
                ));
            }
        } catch {
            // ignore
        }

        const reqDoc = await getDoc(doc(firestore, 'serviceRequests', id));
        if (!reqDoc.exists()) return;
        
        const reqData = reqDoc.data() as ServiceRequest;
        const oldStatus = reqData.status;

        await updateDoc(doc(firestore, 'serviceRequests', id), {
            status,
            updatedAt: new Date().toISOString()
        });

        await addDoc(collection(firestore, 'serviceActivityLogs'), {
            requestId: id,
            customerId: reqData.customerId,
            statusFrom: oldStatus,
            statusTo: status,
            notes: notes || `Status changed to ${status}`,
            updatedBy: auth.currentUser?.uid || 'admin',
            updatedAt: new Date().toISOString()
        });

        await sendNotification({
            recipientId: reqData.customerId,
            title: 'Service Request Updated',
            message: `Your request for ${reqData.serviceName} is now: ${status}`,
            type: 'booking_status',
            date: new Date().toISOString(),
            read: false,
            link: '/customer-portal/'
        });
    };

    const updateServiceRequest = async (id: string, updates: Partial<ServiceRequest>) => {
        // Optimistically update local database state
        setDb(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                serviceRequests: (prev.serviceRequests || []).map(r => 
                    r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r
                )
            };
        });

        // Update local storage cache if available
        try {
            const rawStored = localStorage.getItem('rb_recent_service_requests');
            if (rawStored) {
                const stored = JSON.parse(rawStored);
                localStorage.setItem('rb_recent_service_requests', JSON.stringify(
                    stored.map((r: any) => r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r)
                ));
            }
        } catch {
            // ignore
        }

        try {
            await updateDoc(doc(firestore, 'serviceRequests', id), {
                ...updates,
                updatedAt: new Date().toISOString()
            });
        } catch (e) {
            console.warn(`[Firestore Update Failed] updateServiceRequest for ${id}:`, e);
        }
    };

    const deleteLiaisonBooking = async (id: string) => {
        setDb(prev => {
            if (!prev) return null;
            return {
                ...prev,
                liaisonBookings: (prev.liaisonBookings || []).filter(b => b.id !== id)
            };
        });
        try {
            await deleteDoc(doc(firestore, 'liaisonBookings', id));
        } catch (e) {
            console.warn(`[Firestore Delete Failed] deleteLiaisonBooking for ${id} failed:`, e);
        }
    };

    const deleteServiceRequest = async (id: string) => {
        setDb(prev => {
            if (!prev) return null;
            return {
                ...prev,
                serviceRequests: (prev.serviceRequests || []).filter(r => r.id !== id)
            };
        });
        try {
            await deleteDoc(doc(firestore, 'serviceRequests', id));
        } catch (e) {
            console.warn(`[Firestore Delete Failed] deleteServiceRequest for ${id} failed:`, e);
        }
    };

    const addPart = async (part: Omit<Part, 'id'>) => {
         await addDoc(collection(firestore, 'parts'), part);
         await sendNotification({
             recipientId: 'all',
             recipientRole: 'customer',
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
        try {
            await updateDoc(doc(firestore, 'mechanics', id), { 
                lat: location.lat, 
                lng: location.lng, 
                lastLocationUpdate: new Date().toISOString() 
            });
        } catch (_) {}

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
        
        let initialStatus = booking.status;
        if (mechId && db?.bookings) {
            const hasOngoing = db.bookings.some(b => 
                b.mechanicId === mechId && 
                ['Mechanic Assigned', 'En Route', 'In Progress'].includes(b.status)
            );
            if (hasOngoing) {
                initialStatus = 'On Hold';
            }
        }

        const newBooking = {
            ...booking,
            mechanicId: mechId,
            mechanicName: mechName,
            status: initialStatus,
            createdAt: new Date().toISOString(),
            statusHistory: [{ status: initialStatus, timestamp: new Date().toISOString() }]
        };

        if (!auth.currentUser) {
            console.info("[DatabaseContext] Performing local mock addBooking (bypass mode)");
            const mockId = `booking-local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const bookingWithId = { id: mockId, ...newBooking } as Booking;
            setDb(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    bookings: [bookingWithId, ...(prev.bookings || [])]
                };
            });
            return bookingWithId;
        }

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

        if (db?.settings?.smtpHost) {
            const templateData = {
                customerName: booking.customerName || 'Valued Customer',
                customerPhone: booking.customerPhone || '',
                customerEmail: booking.customerEmail || '',
                bookingId: ref.id,
                serviceName: booking.services?.[0]?.name || (booking as any).serviceType || 'Automotive Service',
                date: booking.date || new Date().toLocaleDateString(),
                time: booking.time || '',
                totalAmount: (booking.totalAmount || booking.price || 0).toLocaleString(),
                paymentMethod: booking.paymentMethod || 'HitPay / GCash',
                pickupLocation: (booking as any).pickupLocation || (booking as any).location || 'Customer Address'
            };

            // Admin alert
            if (db.settings.emailOnNewBooking) {
                sendTemplatedEmail(
                    'admin_new_booking',
                    db.settings.contactEmail || 'admin@ridersbud.com',
                    templateData,
                    db.settings
                ).catch(err => console.warn("Admin SMTP email notification skipped:", err?.message || err));
            }

            // Customer confirmation
            if (booking.customerEmail) {
                sendTemplatedEmail(
                    'booking_confirmed',
                    booking.customerEmail,
                    templateData,
                    db.settings
                ).catch(err => console.warn("Customer SMTP email notification skipped:", err?.message || err));
            }
        }

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
        if (!auth.currentUser) {
            console.info("[DatabaseContext] Performing local mock updateBooking (bypass mode)");
            setDb(prev => {
                if (!prev) return null;
                const updatedBookings = prev.bookings.map(b => b.id === id ? { ...b, ...updates } : b);
                return { ...prev, bookings: updatedBookings };
            });
            return;
        }
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

    const updateBookingPayment = async (id: string, amount: number, status: 'pending' | 'partial' | 'paid' | 'downpayment_paid', extraData?: Partial<Booking>) => {
        const booking = db?.bookings.find(b => b.id === id);
        const isFull = status === 'paid' || extraData?.isPaid === true;
        const txReference = extraData?.balancePaymentRef || extraData?.downpaymentRef || extraData?.hitpayReference || `TXN-${Date.now()}`;
        const txType = isFull ? 'balance' : 'downpayment';
        
        const newTransaction = {
            id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            type: txType as 'downpayment' | 'balance' | 'full',
            amount: amount,
            method: extraData?.paymentMethod || 'HitPay (Online)',
            reference: txReference,
            paidAt: new Date().toISOString(),
            status: 'completed',
            gatewayResponse: {
                hitpayPaymentRequestId: extraData?.hitpayPaymentRequestId,
                hitpayReference: extraData?.hitpayReference
            }
        };

        const existingTxs = booking?.paymentTransactions || [];
        const updatedTransactions = [...existingTxs.filter(t => t.reference !== txReference), newTransaction];

        const updatePayload: any = {
            paymentStatus: status,
            isPaid: isFull,
            paymentTransactions: updatedTransactions,
            ...(extraData || {})
        };

        if (!auth.currentUser) {
            console.info("[DatabaseContext] Performing local mock updateBookingPayment (bypass mode)");
            setDb(prev => {
                if (!prev) return null;
                const updatedBookings = prev.bookings.map(b => b.id === id ? { 
                    ...b, 
                    ...updatePayload,
                    paidAmount: extraData?.paidAmount !== undefined ? extraData.paidAmount : ((b.paidAmount || 0) + amount)
                } : b);
                return { ...prev, bookings: updatedBookings };
            });
        } else {
            try {
                const bookingRef = doc(firestore, 'bookings', id);
                await updateDoc(bookingRef, {
                    ...updatePayload,
                    paidAmount: extraData?.paidAmount !== undefined ? extraData.paidAmount : increment(amount)
                });
            } catch (e) {
                console.warn(`[Firestore Write Failed] updateBookingPayment for ${id} failed, falling back to local update:`, e);
                setDb(prev => {
                    if (!prev) return null;
                    const updatedBookings = prev.bookings.map(b => {
                        if (b.id === id) {
                            return {
                                ...b,
                                ...updatePayload,
                                paidAmount: extraData?.paidAmount !== undefined ? extraData.paidAmount : ((b.paidAmount || 0) + amount)
                            };
                        }
                        return b;
                    });
                    return { ...prev, bookings: updatedBookings };
                });
            }
        }

        // 1. Notify Customer
        if (booking?.customerId && status !== 'pending') {
            await sendNotification({
                recipientId: `customer-${booking.customerId}`,
                title: isFull ? '✅ Final Payment Completed' : '💳 50% Downpayment Verified',
                message: isFull 
                    ? `Your full payment (Ref: ${txReference}) for Booking #${id.slice(-6).toUpperCase()} is confirmed. Thank you!`
                    : `Your 50% initial downpayment (Ref: ${txReference}) for Booking #${id.slice(-6).toUpperCase()} has been secured & verified via ${extraData?.paymentMethod || 'HitPay'}.`,
                type: 'success',
                link: `/customer-portal/booking-detail/${id}`,
                date: new Date().toISOString(),
                read: false
            }).catch(console.warn);
        }

        // 2. Notify Assigned Mechanic if assigned
        const targetMechanicId = booking?.mechanicId || booking?.mechanic?.id || extraData?.mechanicId;
        if (targetMechanicId) {
            await sendNotification({
                recipientId: `mechanic-${targetMechanicId}`,
                title: isFull ? '💰 Balance Payment Received' : '💳 50% Downpayment Secured',
                message: isFull
                    ? `Customer has settled the remaining balance for Job #${id.slice(-6).toUpperCase()}.`
                    : `50% Downpayment (₱${amount.toLocaleString()}) has been paid and verified for Job #${id.slice(-6).toUpperCase()}. You may proceed with the job.`,
                type: 'info',
                link: `/mechanic-portal/job-details/${id}`,
                date: new Date().toISOString(),
                read: false
            }).catch(console.warn);
        }

        // 3. Notify Admin
        await sendNotification({
            recipientId: 'admin',
            title: isFull ? '💰 Final Payment Settled' : '💳 50% Downpayment Received',
            message: `Booking #${id.slice(-6).toUpperCase()} received ₱${amount.toLocaleString()} via ${extraData?.paymentMethod || 'HitPay'} (Ref: ${txReference}).`,
            type: 'info',
            link: `/admin/bookings`,
            date: new Date().toISOString(),
            read: false
        }).catch(console.warn);
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
            if (booking.customerId && booking.status !== status) {
                await sendNotification({
                    recipientId: `customer-${booking.customerId}`,
                    title: '🔄 Booking Status Updated',
                    message: `Your booking status has been updated to: ${status}.`,
                    type: 'info',
                    link: `/customer-portal/booking-detail/${id}`,
                    date: new Date().toISOString(),
                    read: false
                });
            }

            // Notify mechanic on status change (covers admin/system-initiated updates)
            if (booking.mechanicId && booking.status !== status) {
                await sendNotification({
                    recipientId: `mechanic-${booking.mechanicId}`,
                    title: '🔄 Booking Status Updated',
                    message: `Booking #${id.slice(-6)} status changed to: ${status}.`,
                    type: 'info',
                    link: `/mechanic-portal/job/${id}`,
                    date: new Date().toISOString(),
                    read: false
                });
            }

            // Phase 3: Live Payments & Escrow Release
            if (status === 'Completed' && booking.mechanicId) {
                const totalJobRevenue = getJobTotalAmount(booking);
                // Calculate dynamic platform service fee cut (default 10% or from settings)
                const feePercentage = db?.settings?.serviceFeePercentage ?? 10;
                const platformCut = Math.round(totalJobRevenue * (feePercentage / 100));
                // Mechanic receives net revenue (job total minus platform commission)
                const mechanicShare = Math.max(0, totalJobRevenue - platformCut);

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
                    message: `Earnings (₱${mechanicShare.toLocaleString()}) for job #${booking.id.slice(-5).toUpperCase()} have been credited to your available balance.`,
                    type: 'success',
                    date: new Date().toISOString(),
                    read: false,
                    link: '/mechanic-portal/earnings'
                });
            }

            if (status === 'Completed' || status === 'Cancelled') {
                const mechanicId = booking.mechanicId;
                if (mechanicId && db?.bookings) {
                    const onHoldBookings = db.bookings.filter(b => b.mechanicId === mechanicId && b.status === 'On Hold');
                    if (onHoldBookings.length > 0) {
                        const oldestOnHold = onHoldBookings.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime())[0];
                        if (oldestOnHold) {
                            await updateBookingStatus(oldestOnHold.id, 'Mechanic Assigned');
                        }
                    }
                }
            }
        }
    };

    const assignMechanicToBooking = async (bookingId: string, mechanic: Mechanic) => {
        let assignedStatus: BookingStatus = 'Mechanic Assigned';
        if (db?.bookings) {
            const hasOngoing = db.bookings.some(b => 
                b.mechanicId === mechanic.id && 
                ['Mechanic Assigned', 'En Route', 'In Progress'].includes(b.status)
            );
            if (hasOngoing) {
                assignedStatus = 'On Hold';
            }
        }

        await updateDoc(doc(firestore, 'bookings', bookingId), {
            mechanicId: mechanic.id,
            mechanicName: mechanic.name,
            mechanic: {
                id: mechanic.id,
                name: mechanic.name,
                email: mechanic.email,
                phone: mechanic.phone,
                imageUrl: mechanic.imageUrl || '',
                rating: mechanic.rating || 0,
                reviews: mechanic.reviews || 0
            },
            status: assignedStatus,
            statusHistory: arrayUnion({ status: assignedStatus, timestamp: new Date().toISOString() })
        });

        let booking = db?.bookings.find(b => b.id === bookingId);
        if (!booking) {
            const docSnap = await getDoc(doc(firestore, 'bookings', bookingId));
            if (docSnap.exists()) {
                booking = { id: docSnap.id, ...docSnap.data() } as Booking;
            }
        }

        if (booking?.customerId) {
            await sendNotification({
                recipientId: `customer-${booking.customerId}`,
                title: '👨‍🔧 Mechanic Assigned',
                message: `${mechanic.name} has accepted your job and will be handling your service.`,
                type: 'info',
                link: `/customer-portal/booking-detail/${bookingId}`,
                date: new Date().toISOString(),
                read: false
            });
        }

        // Notify the mechanic of the assignment
        const serviceName = booking?.services?.[0]?.name || booking?.service?.name || 'Service';
        await sendNotification({
            recipientId: `mechanic-${mechanic.id}`,
            title: '🔧 You Have a New Job',
            message: `You've been assigned to ${serviceName} for ${booking?.customerName || 'a customer'}.`,
            type: 'success',
            link: `/mechanic-portal/job/${bookingId}`,
            date: new Date().toISOString(),
            read: false
        });
    };

    const cancelBooking = async (bookingId: string, reason: string) => {
        const booking = db?.bookings.find(b => b.id === bookingId);
        if (booking && (booking.status === 'Cancelled' || (booking.status as string) === 'CANCELLED')) {
            console.warn(`[cancelBooking] Booking ${bookingId} is already cancelled.`);
            return;
        }

        setDb(prev => {
            if (!prev) return null;
            return {
                ...prev,
                bookings: (prev.bookings || []).map(b => b.id === bookingId ? { ...b, status: 'Cancelled' as BookingStatus, cancellationReason: reason } : b)
            };
        });

        await updateDoc(doc(firestore, 'bookings', bookingId), {
            status: 'Cancelled' as BookingStatus,
            cancellationReason: reason
        });

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

            // Notify the customer
            if (booking.customerId) {
                await sendNotification({
                    recipientId: `customer-${booking.customerId}`,
                    title: '❌ Booking Cancelled',
                    message: `Your booking for ${serviceName} has been cancelled. Reason: ${reason}`,
                    type: 'alert',
                    date: new Date().toISOString(),
                    read: false,
                    link: `/customer-portal/booking-history`
                });
            }

            // Notify mechanic if one was assigned (MAIN FIX)
            if (booking.mechanicId) {
                await sendNotification({
                    recipientId: `mechanic-${booking.mechanicId}`,
                    title: '🚨 Booking Cancelled',
                    message: `Booking for "${serviceName}" from ${booking.customerName || 'Customer'} has been cancelled.`,
                    type: 'alert',
                    date: new Date().toISOString(),
                    read: false,
                    link: `/mechanic-portal/jobs`
                });
            }

            if (db?.settings?.smtpHost) {
                const cancelData = {
                    customerName: booking.customerName || 'Valued Customer',
                    bookingId: booking.id,
                    serviceName: serviceName,
                    reason: reason || 'Requested by user/admin',
                    refundStatus: 'In Review / Processing'
                };

                // Admin cancellation alert
                if (db.settings.emailOnCancellation) {
                    sendTemplatedEmail(
                        'booking_cancelled',
                        db.settings.contactEmail || 'admin@ridersbud.com',
                        cancelData,
                        db.settings
                    ).catch(err => console.warn("Admin SMTP email notification skipped:", err?.message || err));
                }

                // Customer cancellation notification
                if (booking.customerEmail) {
                    sendTemplatedEmail(
                        'booking_cancelled',
                        booking.customerEmail,
                        cancelData,
                        db.settings
                    ).catch(err => console.warn("Customer SMTP email notification skipped:", err?.message || err));
                }
            }
        }
    };

    const deleteBooking = async (bookingId: string) => {
        setDb(prev => {
            if (!prev) return null;
            return {
                ...prev,
                bookings: (prev.bookings || []).filter(b => b.id !== bookingId)
            };
        });
        try {
            await deleteDoc(doc(firestore, 'bookings', bookingId));
        } catch (e) {
            console.warn(`[Firestore Delete Failed] deleteBooking for ${bookingId}:`, e);
        }
    };

    const deleteAllBookings = async (collectionName: string = 'bookings') => {
        const batch = writeBatch(firestore);
        const bookingsSnapshot = await getDocs(collection(firestore, collectionName));
        bookingsSnapshot.forEach((docSnap) => {
            batch.delete(doc(firestore, collectionName, docSnap.id));
        });
        await batch.commit();
    };

    const verifyBookingPayment = async (bookingId: string) => {
        // Check regular bookings first, then rental bookings, then service requests (Driver for Hire / Towing)
        const booking = db?.bookings.find(b => b.id === bookingId);
        const rentalBooking = !booking ? db?.rentalBookings?.find(b => b.id === bookingId) : null;
        const serviceReq = (!booking && !rentalBooking) ? db?.serviceRequests?.find(s => s.id === bookingId) : null;
        const targetBooking = booking || rentalBooking || serviceReq;
        const isRentalBooking = !booking && !!rentalBooking;
        const isServiceRequest = !booking && !rentalBooking && !!serviceReq;

        if (!targetBooking) return;

        const total = (targetBooking as any).totalAmount || (targetBooking as any).totalPrice || (targetBooking as any).services?.[0]?.price || (targetBooking as any).service?.price || 0;
        const depositAmount = (targetBooking as any).downpaymentAmount ? Number((targetBooking as any).downpaymentAmount) : Math.ceil(total * 0.5);
        const hasPartialPaid = ((targetBooking as any).paidAmount || 0) > 0 && ((targetBooking as any).paidAmount || 0) < total;
        const isFinalBalancePayment = (targetBooking as any).isVerified === true && (targetBooking as any).paymentStatus === 'partial' && hasPartialPaid;

        const updatedPaymentStatus = isFinalBalancePayment ? 'paid' : 'partial';
        const updatedPaidAmount = isFinalBalancePayment ? total : Math.max((targetBooking as any).paidAmount || 0, depositAmount);
        const updatedIsPaid = isFinalBalancePayment;

        const collectionName = isRentalBooking ? 'rentalBookings' : isServiceRequest ? 'serviceRequests' : 'bookings';
        const batch = writeBatch(firestore);
        const bookingRef = doc(firestore, collectionName, bookingId);

        batch.update(bookingRef, {
            isVerified: true,
            paymentStatus: updatedPaymentStatus,
            isPaid: updatedIsPaid,
            paidAmount: updatedPaidAmount,
            gcashPaymentStatus: 'verified',
            gcashDeclineReason: null,
            status: (targetBooking as any).status === 'Upcoming' ? 'Booking Confirmed' : (targetBooking as any).status,
        });

        await batch.commit();

        // Update local cache
        if (isRentalBooking) {
            setDb(prev => {
                if (!prev) return null;
                const updated = (prev.rentalBookings || []).map(b =>
                    b.id === bookingId
                        ? { ...b, isVerified: true, paymentStatus: updatedPaymentStatus as any, isPaid: updatedIsPaid, paidAmount: updatedPaidAmount, gcashPaymentStatus: 'verified' as any, gcashDeclineReason: undefined }
                        : b
                );
                return { ...prev, rentalBookings: updated };
            });
        } else if (isServiceRequest) {
            setDb(prev => {
                if (!prev) return null;
                const updated = (prev.serviceRequests || []).map(s =>
                    s.id === bookingId
                        ? { ...s, isVerified: true, paymentStatus: updatedPaymentStatus as any, isPaid: updatedIsPaid, paidAmount: updatedPaidAmount, gcashPaymentStatus: 'verified' as any, gcashDeclineReason: undefined }
                        : s
                );
                return { ...prev, serviceRequests: updated };
            });
        }

        const serviceName = (targetBooking as any).services?.[0]?.name || (targetBooking as any).service?.name || 'Car Rental';
        const customerMessage = isFinalBalancePayment
            ? `Your GCash remaining balance for "${serviceName}" has been verified. Your booking is now fully paid!`
            : `Your GCash deposit for "${serviceName}" has been verified. Your booking is confirmed!`;

        await sendNotification({
            recipientId: `customer-${(targetBooking as any).customerId}`,
            title: isFinalBalancePayment ? '✅ Remaining Balance Paid' : '✅ Payment Verified!',
            message: customerMessage,
            type: 'success',
            date: new Date().toISOString(),
            read: false,
            link: `/customer-portal/booking-detail/${bookingId}`
        });

        // Also notify the mechanic when payment is verified
        if ((targetBooking as any).mechanicId) {
            await sendNotification({
                recipientId: `mechanic-${(targetBooking as any).mechanicId}`,
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
        try {
            await updateDoc(doc(firestore, 'customers', id), {
                lat: loc.lat,
                lng: loc.lng,
                lastLocationUpdate: new Date().toISOString()
            });
        } catch (_) {}
    };

    const addOrder = async (order: Omit<Order, 'id'>) => {
        const sanitizedOrder = cleanObject(order);

        // Deduct inventory stock for ordered parts
        if (order.items && Array.isArray(order.items)) {
            for (const item of order.items) {
                if (item.id && item.quantity) {
                    const currentPart = db?.parts?.find(p => p.id === item.id);
                    if (currentPart) {
                        const newStock = Math.max(0, (currentPart.stock ?? 0) - item.quantity);
                        setDb(prev => {
                            if (!prev) return null;
                            const updatedParts = (prev.parts || []).map(p =>
                                p.id === item.id ? { ...p, stock: newStock } : p
                            );
                            return { ...prev, parts: updatedParts };
                        });
                        if (auth.currentUser) {
                            try {
                                await updateDoc(doc(firestore, 'parts', item.id), { stock: newStock });
                            } catch (stockErr) {
                                console.warn(`[DatabaseContext] Failed to update stock for part ${item.id}:`, stockErr);
                            }
                        }
                    }
                }
            }
        }

        if (!auth.currentUser) {
            console.info("[DatabaseContext] Performing local mock addOrder (bypass mode)");
            const mockId = `order-local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const orderWithId = { id: mockId, ...sanitizedOrder } as Order;
            setDb(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    orders: [orderWithId, ...(prev.orders || [])]
                };
            });
            return orderWithId;
        }
        const ref = await addDoc(collection(firestore, 'orders'), sanitizedOrder);
        return { id: ref.id, ...sanitizedOrder } as Order;
    };

    const updateOrderStatus = async (id: string, status: OrderStatus) => {
        if (!auth.currentUser) {
            console.info("[DatabaseContext] Performing local mock updateOrderStatus (bypass mode)");
            setDb(prev => {
                if (!prev) return null;
                const updatedOrders = prev.orders.map(o => o.id === id ? { 
                    ...o, 
                    status,
                    statusHistory: [...(o.statusHistory || []), { status, timestamp: new Date().toISOString() }]
                } : o);
                return { ...prev, orders: updatedOrders };
            });
            return;
        }
        await updateDoc(doc(firestore, 'orders', id), {
            status,
            statusHistory: arrayUnion({ status, timestamp: new Date().toISOString() })
        });
    };

    const deleteOrder = async (id: string) => {
        setDb(prev => {
            if (!prev) return null;
            return {
                ...prev,
                orders: (prev.orders || []).filter(o => o.id !== id)
            };
        });
        try {
            await deleteDoc(doc(firestore, 'orders', id));
        } catch (e) {
            console.warn(`[Firestore Delete Failed] deleteOrder for ${id} failed:`, e);
        }
    };

    const deleteAllOrders = async () => {
        if (!auth.currentUser) {
            setDb(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    orders: []
                };
            });
            return;
        }
        const batch = writeBatch(firestore);
        const ordersSnapshot = await getDocs(collection(firestore, 'orders'));
        ordersSnapshot.forEach((docSnap) => {
            batch.delete(doc(firestore, 'orders', docSnap.id));
        });
        await batch.commit();
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

        // Determine current mechanic's current wallet and locked balances
        const currentMechanic = db?.mechanics.find(m => m.id === mechanicId);
        
        // Calculate safe baseline from bookings ledger
        const mechanicBookings = db?.bookings.filter(b => (b.mechanic?.id === mechanicId || b.mechanicId === mechanicId) && b.status === 'Completed') || [];
        const lifetimeEarnings = (currentMechanic as any)?.totalEarnings ?? mechanicBookings.reduce((sum, job: any) => {
            if (job.isPaid === false || job.paymentStatus === 'failed') return sum;
            if (job.totalAmount != null && Number(job.totalAmount) > 0) return sum + Number(job.totalAmount);
            if (job.price != null && Number(job.price) > 0) return sum + Number(job.price);
            const svcs = job.services && job.services.length > 0 ? job.services : (job.service ? [job.service] : []);
            const svcsSum = svcs.reduce((s: number, svc: any) => s + (Number(svc.price) || 0), 0);
            const addCosts = (job.additionalCosts || []).reduce((s: number, c: any) => s + (Number(c.price) || 0), 0);
            return sum + svcsSum + addCosts + (Number(job.laborFee) || 0);
        }, 0);

        // Sum existing payouts (excluding the one being updated)
        const otherPayouts = (db?.payouts || []).filter(p => p.mechanicId === mechanicId && p.id !== payoutId);
        const otherPaidSum = otherPayouts
            .filter(p => p.status === 'Paid' || p.status === 'Completed')
            .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        const otherApprovedSum = otherPayouts
            .filter(p => p.status === 'Approved')
            .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

        // Ledger available = lifetime - all non-rejected payouts (paid + approved)
        // Projected totals incorporating this status transition
        const projectedPaid = otherPaidSum + (status === 'Paid' ? amount : 0);
        const projectedApproved = otherApprovedSum + (status === 'Approved' ? amount : 0);

        // Calculate reconciled balances
        const newWalletBalance = Math.max(0, lifetimeEarnings - projectedPaid - projectedApproved);
        const newLockedBalance = projectedApproved;

        batch.update(mechanicRef, {
            walletBalance: newWalletBalance,
            lockedBalance: newLockedBalance
        });

        // Apply local optimistic state update immediately so UI never lags or freezes
        setDb(prev => {
            if (!prev) return null;
            const updatedPayouts = prev.payouts.map(p => {
                if (p.id === payoutId) {
                    return {
                        ...p,
                        status,
                        processDate: new Date().toISOString(),
                        processedBy: adminDetails?.name || 'System Admin',
                        adminId: adminDetails?.id || 'system',
                        adminName: adminDetails?.name || 'System Admin',
                        adminNotes: adminDetails?.notes || '',
                        transactionId: adminDetails?.transactionId || '',
                        ...(status === 'Rejected' && adminDetails?.notes ? { rejectionReason: adminDetails.notes } : {})
                    };
                }
                return p;
            });

            const updatedMechanics = prev.mechanics.map(m => {
                if (m.id === mechanicId) {
                    return {
                        ...m,
                        walletBalance: newWalletBalance,
                        lockedBalance: newLockedBalance
                    };
                }
                return m;
            });

            return {
                ...prev,
                payouts: updatedPayouts,
                mechanics: updatedMechanics
            };
        });

        try {
            await batch.commit();
        } catch (commitErr) {
            console.warn('[Firestore] Batch commit for payout update failed, operating on optimistic local state:', commitErr);
        }

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
        const mechanic = db?.mechanics.find(m => m.id === request.mechanicId);
        const feePercentage = db?.settings?.serviceFeePercentage ?? 10;
        // Authoritative real-time wallet ledger calculation
        const walletLedger = calculateMechanicWalletLedger(
            request.mechanicId,
            mechanic,
            db?.bookings || [],
            db?.payouts || [],
            feePercentage
        );

        const availableBalance = walletLedger.availableBalance;
        const pendingAmount = walletLedger.pendingPayoutsTotal;

        if (availableBalance < request.amount) {
            throw new Error(`Insufficient wallet balance. Available: ₱${availableBalance.toLocaleString()} (Pending requests: ₱${pendingAmount.toLocaleString()}).`);
        }

        const newPayoutId = 'po_' + Date.now();
        const newPayoutDoc: PayoutRequest = {
            id: newPayoutId,
            ...request,
            status: 'Pending',
            requestDate: new Date().toISOString(),
            submittedAt: new Date().toISOString()
        };

        // Optimistic local update
        setDb(prev => {
            if (!prev) return null;
            return {
                ...prev,
                payouts: [newPayoutDoc, ...prev.payouts]
            };
        });

        try {
            const docRef = await addDoc(collection(firestore, 'payouts'), {
                ...request,
                status: 'Pending',
                requestDate: new Date().toISOString(),
                submittedAt: new Date().toISOString()
            });
            // Align local id with Firestore generated id if available
            setDb(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    payouts: prev.payouts.map(p => p.id === newPayoutId ? { ...p, id: docRef.id } : p)
                };
            });
        } catch (e) {
            console.warn('[Firestore] addPayoutRequest write failed, using local optimistic state:', e);
        }

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

    const deletePayoutRequest = async (payoutId: string) => {
        const targetPayout = db?.payouts.find(p => p.id === payoutId);
        if (!targetPayout) return;

        const mechanicId = targetPayout.mechanicId;
        const currentMechanic = db?.mechanics.find(m => m.id === mechanicId);

        // Recalculate balances excluding this payout
        const mechanicBookings = db?.bookings.filter(b => (b.mechanic?.id === mechanicId || b.mechanicId === mechanicId) && b.status === 'Completed') || [];
        const lifetimeEarnings = (currentMechanic as any)?.totalEarnings ?? mechanicBookings.reduce((sum, job: any) => {
            if (job.isPaid === false || job.paymentStatus === 'failed') return sum;
            if (job.totalAmount != null && Number(job.totalAmount) > 0) return sum + Number(job.totalAmount);
            if (job.price != null && Number(job.price) > 0) return sum + Number(job.price);
            const svcs = job.services && job.services.length > 0 ? job.services : (job.service ? [job.service] : []);
            const svcsSum = svcs.reduce((s: number, svc: any) => s + (Number(svc.price) || 0), 0);
            const addCosts = (job.additionalCosts || []).reduce((s: number, c: any) => s + (Number(c.price) || 0), 0);
            return sum + svcsSum + addCosts + (Number(job.laborFee) || 0);
        }, 0);

        const remainingPayouts = (db?.payouts || []).filter(p => p.mechanicId === mechanicId && p.id !== payoutId);
        const remainingPaid = remainingPayouts
            .filter(p => p.status === 'Paid' || p.status === 'Completed')
            .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        const remainingApproved = remainingPayouts
            .filter(p => p.status === 'Approved')
            .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

        const newWalletBalance = Math.max(0, lifetimeEarnings - remainingPaid - remainingApproved);
        const newLockedBalance = remainingApproved;

        // Optimistic local update
        setDb(prev => {
            if (!prev) return null;
            return {
                ...prev,
                payouts: (prev.payouts || []).filter(p => p.id !== payoutId),
                mechanics: (prev.mechanics || []).map(m => {
                    if (m.id === mechanicId) {
                        return {
                            ...m,
                            walletBalance: newWalletBalance,
                            lockedBalance: newLockedBalance
                        };
                    }
                    return m;
                })
            };
        });

        // Live persistence in Firestore
        try {
            const batch = writeBatch(firestore);
            batch.delete(doc(firestore, 'payouts', payoutId));
            if (mechanicId) {
                batch.update(doc(firestore, 'mechanics', mechanicId), {
                    walletBalance: newWalletBalance,
                    lockedBalance: newLockedBalance
                });
            }
            await batch.commit();
        } catch (err) {
            console.warn('[Firestore] deletePayoutRequest failed, relying on optimistic state:', err);
        }

        // Notify mechanic
        if (mechanicId) {
            await sendNotification({
                recipientId: `mechanic-${mechanicId}`,
                title: 'Payout Request Removed',
                message: `Payout request #${payoutId.slice(-6).toUpperCase()} for ₱${Number(targetPayout.amount).toLocaleString()} was deleted.`,
                type: 'info',
                date: new Date().toISOString(),
                read: false,
                link: '/mechanic-portal/earnings'
            });
        }
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
                rating: mechanicDoc.rating || 0,
                reviews: mechanicDoc.reviews || 0
            },
            status: 'Mechanic Assigned' as BookingStatus,
            statusHistory: arrayUnion({ status: 'Mechanic Assigned', timestamp: new Date().toISOString() })
        });

        let booking = db?.bookings.find(b => b.id === bookingId);
        if (!booking) {
            const docSnap = await getDoc(doc(firestore, 'bookings', bookingId));
            if (docSnap.exists()) {
                booking = { id: docSnap.id, ...docSnap.data() } as Booking;
            }
        }

        if (booking?.customerId) {
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

        // Notify the mechanic confirming their acceptance
        const svcName = booking?.services?.[0]?.name || booking?.service?.name || 'Service';
        await sendNotification({
            recipientId: `mechanic-${mechanicDoc.id}`,
            title: '✅ You Accepted This Job',
            message: `You've accepted the ${svcName} request for ${booking?.customerName || 'Customer'}.`,
            type: 'success',
            link: `/mechanic-portal/job/${bookingId}`,
            date: new Date().toISOString(),
            read: false
        });
    };

    const addNotification = async (notification: Omit<Notification, 'id'>) => {
        try {
            await addDoc(collection(firestore, 'notifications'), {
                ...notification,
                createdBy: (notification as any).createdBy || auth.currentUser?.uid || 'system'
            });
        } catch (e) {
            console.warn("[Notification] addNotification failed:", e);
            // Local fallback
            const newNotif = {
                ...notification,
                createdBy: (notification as any).createdBy || auth.currentUser?.uid || 'system',
                id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            } as Notification;
            setDb(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    notifications: [newNotif, ...(prev.notifications || [])]
                };
            });
        }
    };

    const markNotificationAsRead = async (id: string) => {
        setDb(prev => {
            if (!prev) return null;
            return {
                ...prev,
                notifications: (prev.notifications || []).map(n => 
                    n.id === id ? { ...n, read: true, status: 'read' as const } : n
                )
            };
        });

        try {
            await updateDoc(doc(firestore, 'notifications', id), { read: true, status: 'read' });
        } catch (e) {
            console.warn("[Notification] markNotificationAsRead failed:", e);
        }
    };

    const markAllNotificationsAsRead = async (recipientId: string) => {
        let cleanId = recipientId;
        if (cleanId.startsWith('customer-')) cleanId = cleanId.replace('customer-', '');
        else if (cleanId.startsWith('mechanic-')) cleanId = cleanId.replace('mechanic-', '');

        setDb(prev => {
            if (!prev) return null;
            return {
                ...prev,
                notifications: (prev.notifications || []).map(n => {
                    const isOwn = (n.recipientId === cleanId || n.recipientId === recipientId) && n.recipientId !== 'all';
                    if (isOwn && !n.read) {
                        return { ...n, read: true, status: 'read' as const };
                    }
                    return n;
                })
            };
        });

        try {
            const batch = writeBatch(firestore);
            // Only mark user's own notifications as read, NEVER mark 'all' broadcasts
            const unread = db?.notifications.filter(n =>
                (n.recipientId === cleanId || n.recipientId === recipientId) && n.recipientId !== 'all' && !n.read
            ) || [];
            unread.forEach(n => {
                batch.update(doc(firestore, 'notifications', n.id), { read: true, status: 'read' });
            });
            if (unread.length > 0) {
                await batch.commit();
            }
        } catch (e) {
            console.warn("[Notification] markAllNotificationsAsRead failed:", e);
        }
    };

    const deleteNotification = async (id: string) => {
        setDb(prev => {
            if (!prev) return null;
            return {
                ...prev,
                notifications: (prev.notifications || []).filter(n => n.id !== id)
            };
        });

        try {
            await deleteDoc(doc(firestore, 'notifications', id));
        } catch (e) {
            console.warn("[Notification] deleteNotification failed:", e);
        }
    };

    const clearAllNotifications = async (recipientId: string, specificIds?: string[]) => {
        let cleanId = recipientId;
        if (cleanId.startsWith('customer-')) cleanId = cleanId.replace('customer-', '');
        else if (cleanId.startsWith('mechanic-')) cleanId = cleanId.replace('mechanic-', '');

        const isAdmin = cleanId === 'admin' || recipientId === 'admin';
        const isMechanic = cleanId.startsWith('m-') || recipientId.startsWith('mechanic-');

        const isMatchingNotification = (n: any) => {
            if (specificIds && specificIds.length > 0) {
                return specificIds.includes(n.id);
            }
            if (isAdmin) {
                return n.recipientRole === 'admin' || n.recipientId === 'admin' || n.recipientId === 'all' || !n.recipientRole;
            }
            if (isMechanic) {
                return n.recipientId === cleanId || n.recipientId === `mechanic-${cleanId}` || (n.recipientRole === 'mechanic');
            }
            // Customer or General
            return n.recipientId === cleanId || n.recipientId === `customer-${cleanId}` || n.recipientRole === 'customer' || n.recipientId === 'all' || !n.recipientRole;
        };

        setDb(prev => {
            if (!prev) return null;
            return {
                ...prev,
                notifications: (prev.notifications || []).filter(n => !isMatchingNotification(n))
            };
        });

        try {
            const batch = writeBatch(firestore);
            const myNotifs = db?.notifications?.filter(isMatchingNotification) || [];
            myNotifs.forEach(n => {
                if (n.id) {
                    batch.delete(doc(firestore, 'notifications', n.id));
                }
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
            const isCustomer = prefix === 'customer-';
            const isMechanic = prefix === 'mechanic-';
            const matched = db?.notifications.filter(n =>
                (n.recipientId?.startsWith(prefix) || 
                 (isCustomer && n.recipientRole === 'customer') || 
                 (isMechanic && n.recipientRole === 'mechanic')) && 
                n.recipientId !== 'all'
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
            const isCustomer = prefix === 'customer-';
            const isMechanic = prefix === 'mechanic-';
            const matched = db?.notifications.filter(n =>
                (n.recipientId?.startsWith(prefix) || 
                 (isCustomer && n.recipientRole === 'customer') || 
                 (isMechanic && n.recipientRole === 'mechanic')) && 
                n.recipientId !== 'all' && !n.read
            ) || [];
            matched.forEach(n => {
                batch.update(doc(firestore, 'notifications', n.id), { read: true, status: 'read' });
            });
            if (matched.length > 0) {
                await batch.commit();
            }
        } catch (e) {
            console.warn("[Notification] markAllNotificationsAsReadByPrefix failed:", e);
        }
    };

    const purgeGoogleMapsApiNotifications = async (): Promise<number> => {
        try {
            // Find in local memory / Firestore
            const notifsQuery = query(collection(firestore, 'notifications'));
            const snap = await getDocs(notifsQuery);
            const targetDocIds: string[] = [];

            snap.docs.forEach(docSnap => {
                const data = docSnap.data();
                const title = (data.title || '').toLowerCase();
                const message = (data.message || '').toLowerCase();
                if (
                    title.includes('google map') ||
                    title.includes('google maps') ||
                    title.includes('maps api') ||
                    message.includes('google maps api') ||
                    message.includes('api key connection test')
                ) {
                    targetDocIds.push(docSnap.id);
                }
            });

            // Optimistically update local database state
            setDb(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    notifications: (prev.notifications || []).filter(n => {
                        const title = (n.title || '').toLowerCase();
                        const message = (n.message || '').toLowerCase();
                        return !(
                            title.includes('google map') ||
                            title.includes('google maps') ||
                            title.includes('maps api') ||
                            message.includes('google maps api') ||
                            message.includes('api key connection test') ||
                            targetDocIds.includes(n.id)
                        );
                    })
                };
            });

            if (targetDocIds.length > 0) {
                const batch = writeBatch(firestore);
                targetDocIds.forEach(id => {
                    batch.delete(doc(firestore, 'notifications', id));
                });
                await batch.commit();
                console.info(`[Notification] Successfully purged ${targetDocIds.length} Google Maps API notifications.`);
            }

            return targetDocIds.length;
        } catch (e) {
            console.warn("[Notification] purgeGoogleMapsApiNotifications failed:", e);
            return 0;
        }
    };

    const addReview = async (bookingId: string, reviewData: Omit<Review, 'id' | 'date'>) => {
        let bookingType: 'booking' | 'serviceRequest' | 'rentalBooking' | null = null;
        let targetBooking: any = null;

        // 1. Look in db.bookings or Firestore 'bookings'
        targetBooking = db?.bookings?.find(b => b.id === bookingId);
        if (targetBooking) {
            bookingType = 'booking';
        } else {
            try {
                const bookingSnap = await getDoc(doc(firestore, 'bookings', bookingId));
                if (bookingSnap.exists()) {
                    targetBooking = { id: bookingSnap.id, ...bookingSnap.data() };
                    bookingType = 'booking';
                }
            } catch (e) {
                console.warn("[addReview] Fallback bookings fetch failed:", e);
            }
        }

        // 2. Look in db.serviceRequests or Firestore 'serviceRequests' (Driver for Hire, Towing, etc.)
        if (!targetBooking) {
            targetBooking = db?.serviceRequests?.find(s => s.id === bookingId);
            if (targetBooking) {
                bookingType = 'serviceRequest';
            } else {
                try {
                    const reqSnap = await getDoc(doc(firestore, 'serviceRequests', bookingId));
                    if (reqSnap.exists()) {
                        targetBooking = { id: reqSnap.id, ...reqSnap.data() };
                        bookingType = 'serviceRequest';
                    }
                } catch (e) {
                    console.warn("[addReview] Fallback serviceRequests fetch failed:", e);
                }
            }
        }

        // 3. Look in db.rentalBookings or Firestore 'rentalBookings' (Car Rental)
        if (!targetBooking) {
            targetBooking = db?.rentalBookings?.find(r => r.id === bookingId);
            if (targetBooking) {
                bookingType = 'rentalBooking';
            } else {
                try {
                    const rentSnap = await getDoc(doc(firestore, 'rentalBookings', bookingId));
                    if (rentSnap.exists()) {
                        targetBooking = { id: rentSnap.id, ...rentSnap.data() };
                        bookingType = 'rentalBooking';
                    }
                } catch (e) {
                    console.warn("[addReview] Fallback rentalBookings fetch failed:", e);
                }
            }
        }

        if (!targetBooking || !bookingType) throw new Error('Booking not found');

        const review: Review = {
            ...reviewData,
            id: `review-${Date.now()}`,
            date: new Date().toISOString(),
            bookingId
        };

        // Update Document in Firestore with Review & update optimistic local state
        if (bookingType === 'booking') {
            await updateDoc(doc(firestore, 'bookings', bookingId), {
                review,
                isReviewed: true
            });
            setDb(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    bookings: prev.bookings.map(b => b.id === bookingId ? { ...b, review, isReviewed: true } : b)
                };
            });
        } else if (bookingType === 'serviceRequest') {
            await updateDoc(doc(firestore, 'serviceRequests', bookingId), {
                review,
                isReviewed: true
            });
            setDb(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    serviceRequests: (prev.serviceRequests || []).map(s => s.id === bookingId ? { ...s, review, isReviewed: true } as any : s)
                };
            });
        } else if (bookingType === 'rentalBooking') {
            await updateDoc(doc(firestore, 'rentalBookings', bookingId), {
                review,
                isReviewed: true
            });
            setDb(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    rentalBookings: (prev.rentalBookings || []).map(r => r.id === bookingId ? { ...r, review, isReviewed: true } as any : r)
                };
            });
        }

        // Update Mechanic Rating if it's a mechanic
        const targetMechanicId = targetBooking.mechanicId || targetBooking.mechanic?.id || reviewData.mechanicId;
        if (targetMechanicId && targetMechanicId !== 'driver-assigned') {
            const mechanic = db?.mechanics.find(m => m.id === targetMechanicId);
            if (mechanic) {
                const currentRating = mechanic.rating || 0;
                const currentReviews = mechanic.reviews || 0;
                const newReviews = currentReviews + 1;
                const newRating = Number((((currentRating * currentReviews) + review.rating) / newReviews).toFixed(1));

                await updateDoc(doc(firestore, 'mechanics', targetMechanicId), {
                    rating: newRating,
                    reviews: newReviews,
                    reviewsList: arrayUnion(review)
                });

                setDb(prev => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        mechanics: prev.mechanics.map(m => m.id === targetMechanicId ? {
                            ...m,
                            rating: newRating,
                            reviews: newReviews,
                            reviewsList: [...(m.reviewsList || []), review]
                        } : m)
                    };
                });

                // Notify mechanic about new review
                const mechanicName = reviewData.mechanicName || targetBooking.mechanicName || targetBooking.mechanic?.name || 'Mechanic';
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

        // Update Hire Driver Rating if it's a Driver for Hire
        const targetDriverName = targetBooking.driverName || targetBooking.details?.selectedDriverName || reviewData.mechanicName;
        const targetDriverId = targetBooking.driverId || reviewData.mechanicId;
        const driver = (db?.hireDrivers || []).find(d => 
            (targetDriverId && d.id === targetDriverId) || 
            (targetDriverName && d.name.toLowerCase() === targetDriverName.toLowerCase())
        );

        if (driver) {
            const currentRating = driver.rating || 5.0;
            const currentTrips = driver.totalTrips || 1;
            const newTrips = currentTrips + 1;
            const newRating = Number((((currentRating * currentTrips) + review.rating) / newTrips).toFixed(1));

            try {
                await updateDoc(doc(firestore, 'hireDrivers', driver.id), {
                    rating: newRating,
                    totalTrips: newTrips
                });
            } catch (err) {
                console.warn("[addReview] hireDrivers update in Firestore warning:", err);
            }

            setDb(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    hireDrivers: (prev.hireDrivers || []).map(d => d.id === driver.id ? {
                        ...d,
                        rating: newRating,
                        totalTrips: newTrips
                    } : d)
                };
            });
        }
    };

    const updateReview = async (bookingId: string, updatedReview: Review) => {
        let bookingType: 'booking' | 'serviceRequest' | 'rentalBooking' | null = null;
        let targetBooking: any = null;

        // 1. Look in db.bookings or Firestore 'bookings'
        targetBooking = db?.bookings?.find(b => b.id === bookingId);
        if (targetBooking) {
            bookingType = 'booking';
        } else {
            try {
                const bookingSnap = await getDoc(doc(firestore, 'bookings', bookingId));
                if (bookingSnap.exists()) {
                    targetBooking = { id: bookingSnap.id, ...bookingSnap.data() };
                    bookingType = 'booking';
                }
            } catch (e) {
                console.warn("[updateReview] Fallback bookings fetch failed:", e);
            }
        }

        // 2. Look in db.serviceRequests or Firestore 'serviceRequests'
        if (!targetBooking) {
            targetBooking = db?.serviceRequests?.find(s => s.id === bookingId);
            if (targetBooking) {
                bookingType = 'serviceRequest';
            } else {
                try {
                    const reqSnap = await getDoc(doc(firestore, 'serviceRequests', bookingId));
                    if (reqSnap.exists()) {
                        targetBooking = { id: reqSnap.id, ...reqSnap.data() };
                        bookingType = 'serviceRequest';
                    }
                } catch (e) {
                    console.warn("[updateReview] Fallback serviceRequests fetch failed:", e);
                }
            }
        }

        // 3. Look in db.rentalBookings or Firestore 'rentalBookings'
        if (!targetBooking) {
            targetBooking = db?.rentalBookings?.find(r => r.id === bookingId);
            if (targetBooking) {
                bookingType = 'rentalBooking';
            } else {
                try {
                    const rentSnap = await getDoc(doc(firestore, 'rentalBookings', bookingId));
                    if (rentSnap.exists()) {
                        targetBooking = { id: rentSnap.id, ...rentSnap.data() };
                        bookingType = 'rentalBooking';
                    }
                } catch (e) {
                    console.warn("[updateReview] Fallback rentalBookings fetch failed:", e);
                }
            }
        }

        if (!targetBooking || !targetBooking.review) throw new Error('Booking or review not found');
        const oldReview = targetBooking.review;
        const reviewPayload = { ...updatedReview, updatedAt: new Date().toISOString() };

        if (bookingType === 'booking') {
            await updateDoc(doc(firestore, 'bookings', bookingId), {
                review: reviewPayload
            });
            setDb(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    bookings: prev.bookings.map(b => b.id === bookingId ? { ...b, review: reviewPayload } : b)
                };
            });
        } else if (bookingType === 'serviceRequest') {
            await updateDoc(doc(firestore, 'serviceRequests', bookingId), {
                review: reviewPayload
            });
            setDb(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    serviceRequests: (prev.serviceRequests || []).map(s => s.id === bookingId ? { ...s, review: reviewPayload } as any : s)
                };
            });
        } else if (bookingType === 'rentalBooking') {
            await updateDoc(doc(firestore, 'rentalBookings', bookingId), {
                review: reviewPayload
            });
            setDb(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    rentalBookings: (prev.rentalBookings || []).map(r => r.id === bookingId ? { ...r, review: reviewPayload } as any : r)
                };
            });
        }

        // Update Mechanic Rating
        const mechanicId = targetBooking.mechanicId || targetBooking.mechanic?.id;
        if (mechanicId && mechanicId !== 'driver-assigned') {
            const mechanic = db?.mechanics.find(m => m.id === mechanicId);
            if (mechanic) {
                const currentRating = mechanic.rating || 0;
                const numReviews = mechanic.reviews || 1;
                const newRating = Number((((currentRating * numReviews) - oldReview.rating + updatedReview.rating) / numReviews).toFixed(1));

                const updatedReviewsList = (mechanic.reviewsList || []).map((r: Review) => r.id === updatedReview.id ? reviewPayload : r);

                await updateDoc(doc(firestore, 'mechanics', mechanicId), {
                    rating: newRating,
                    reviewsList: updatedReviewsList
                });

                setDb(prev => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        mechanics: prev.mechanics.map(m => m.id === mechanicId ? {
                            ...m,
                            rating: newRating,
                            reviewsList: updatedReviewsList
                        } : m)
                    };
                });
            }
        }

        // Update Driver Rating
        const targetDriverName = targetBooking.driverName || targetBooking.details?.selectedDriverName;
        const targetDriverId = targetBooking.driverId;
        const driver = (db?.hireDrivers || []).find(d => 
            (targetDriverId && d.id === targetDriverId) || 
            (targetDriverName && d.name.toLowerCase() === targetDriverName.toLowerCase())
        );
        if (driver) {
            const currentRating = driver.rating || 5.0;
            const trips = driver.totalTrips || 1;
            const newRating = Number((((currentRating * trips) - oldReview.rating + updatedReview.rating) / trips).toFixed(1));

            try {
                await updateDoc(doc(firestore, 'hireDrivers', driver.id), {
                    rating: newRating
                });
            } catch (err) {
                console.warn("[updateReview] hireDrivers update in Firestore warning:", err);
            }

            setDb(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    hireDrivers: (prev.hireDrivers || []).map(d => d.id === driver.id ? {
                        ...d,
                        rating: newRating
                    } : d)
                };
            });
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
            addAppService,
            updateAppService,
            deleteAppService,
            addServiceProvider,
            updateServiceProvider,
            deleteServiceProvider,
            addServicePricing,
            updateServicePricing,
            deleteServicePricing,
            addServiceRequest,
            updateServiceRequest,
            updateServiceRequestStatus,
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
            deleteOrder,
            deleteAllOrders,
            addPayoutRequest,
            updatePayoutStatus,
            deletePayoutRequest,
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
            purgeGoogleMapsApiNotifications,
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
            updateMechanicNotificationSettings,
            addRentalCar,
            updateRentalCar,
            deleteRentalCar,
            addRentalBooking,
            updateRentalBooking,
            deleteRentalBooking,
            addHireDriver,
            updateHireDriver,
            deleteHireDriver,
            addLiaisonBooking,
            updateLiaisonBooking,
            updateLiaisonBookingStatus,
            deleteLiaisonBooking,
            deleteServiceRequest,
        }}>
            {children}
        </DatabaseContext.Provider>
    );
};
