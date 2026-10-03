import { isSpecialServiceEnabled } from './utils/specialServicesHelper';
import React, { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { updateDoc, doc } from 'firebase/firestore';
import { db as firebaseDb } from './firebase';
import BottomNav from './components/BottomNav';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { CallProvider } from './context/CallContext';
import { IncomingCallModal, OutgoingCallModal, ActiveCallBar, FullScreenCallModal } from './components/CallUI';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';
import AdminLayout from './components/admin/AdminLayout';
import ErrorBoundary from './components/ErrorBoundary';
import GlobalChatListener from './components/chat/GlobalChatListener';
import ChatOverlay from './components/chat/ChatOverlay';
import { DatabaseProvider, useDatabase } from './context/DatabaseContext';
import { MechanicAuthProvider, useMechanicAuth } from './context/MechanicAuthContext';
import MechanicBottomNav from './components/mechanic/MechanicBottomNav';
import { GlobalPayoutApprovalListener } from './components/mechanic/GlobalPayoutApprovalListener';
import GlobalMechanicJobListener from './components/mechanic/GlobalMechanicJobListener';
import { ChatNotificationProvider, useChatNotification } from './context/ChatNotificationContext';
import { NotificationProvider, useNotification } from './context/NotificationContext';
import NotificationToasts from './components/NotificationToasts';
import TourOverlay from './components/TourOverlay';
import AppLoadingScreen from './components/AppLoadingScreen';
import ScrollToTop from './components/ScrollToTop';
import { Shield, ShoppingBag, Sparkles, ShieldCheck, Truck, Wrench, Bell, CheckCircle2 } from 'lucide-react';
import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { Geolocation } from '@capacitor/geolocation';
import { NativeSettings, AndroidSettings, IOSSettings } from 'capacitor-native-settings';
import { isGeolocationPermissionDenied, safeGetCurrentPosition, safeClearWatch, initPermissionMonitor, onPermissionChange, startPreciseWatch } from './utils/locationHelper';
import { AppUpdateService, AppVersionInfo } from './services/AppUpdateService';
import { UpdateModal } from './components/UpdateModal';

const LoginScreen = React.lazy(() => import('./pages/LoginScreen'));
const SignUpScreen = React.lazy(() => import('./pages/SignUpScreen'));
const HomeScreen = React.lazy(() => import('./pages/HomeScreen'));
const ServicesScreen = React.lazy(() => import('./pages/ServicesScreen'));
const ServiceDetailScreen = React.lazy(() => import('./pages/ServiceDetailScreen'));
const BookingScreen = React.lazy(() => import('./pages/BookingScreen'));
const ProfileScreen = React.lazy(() => import('./pages/ProfileScreen'));
const CartScreen = React.lazy(() => import('./pages/CartScreen'));
const RemindersScreen = React.lazy(() => import('./pages/RemindersScreen'));
const BookingHistoryScreen = React.lazy(() => import('./pages/BookingHistoryScreen'));
const PartsStoreScreen = React.lazy(() => import('./pages/PartsStoreScreen'));
const PartDetailScreen = React.lazy(() => import('./pages/PartDetailScreen'));
const WarrantyScreen = React.lazy(() => import('./pages/WarrantyScreen'));
const WishlistScreen = React.lazy(() => import('./pages/WishlistScreen'));
const BookingConfirmationScreen = React.lazy(() => import('./pages/BookingConfirmationScreen'));
const BookingDetailScreen = React.lazy(() => import('./pages/BookingDetailScreen'));
const AdminLoginScreen = React.lazy(() => import('./pages/admin/AdminLoginScreen'));
const AdminDashboardScreen = React.lazy(() => import('./pages/admin/AdminDashboardScreen'));
const AdminCatalogScreen = React.lazy(() => import('./pages/admin/AdminCatalogScreen'));
const AdminBookingsScreen = React.lazy(() => import('./pages/admin/AdminBookingsScreen'));
const AdminMechanicsScreen = React.lazy(() => import('./pages/admin/AdminMechanicsScreen'));
const AdminCustomersScreen = React.lazy(() => import('./pages/admin/AdminCustomersScreen'));
const AdminSettingsScreen = React.lazy(() => import('./pages/admin/AdminSettingsScreen'));
const AdminAnalyticsScreen = React.lazy(() => import('./pages/admin/AdminAnalyticsScreen'));
const AdminMarketingScreen = React.lazy(() => import('./pages/admin/AdminMarketingScreen'));
const AdminUsersScreen = React.lazy(() => import('./pages/admin/AdminUsersScreen'));
const AdminOrdersScreen = React.lazy(() => import('./pages/admin/AdminOrdersScreen'));
const AdminPayoutsScreen = React.lazy(() => import('./pages/admin/AdminPayoutsScreen'));
const AdminMonetizationScreen = React.lazy(() => import('./pages/admin/AdminMonetizationScreen'));
const AdminChatScreen = React.lazy(() => import('./pages/admin/AdminChatScreen'));
const AdminGCashPaymentsScreen = React.lazy(() => import('./pages/admin/AdminGCashPaymentsScreen'));
const AdminPaymentAuditScreen = React.lazy(() => import('./pages/admin/AdminPaymentAuditScreen'));
const AdminSatisfactionScreen = React.lazy(() => import('./pages/admin/AdminSatisfactionScreen'));
const AdminNotificationsScreen = React.lazy(() => import('./pages/admin/AdminNotificationsScreen'));
const ServicePaymentScreen = React.lazy(() => import('./pages/ServicePaymentScreen'));
const ServicePaymentConfirmationScreen = React.lazy(() => import('./pages/ServicePaymentConfirmationScreen'));
const RentCarScreen = React.lazy(() => import('./pages/RentCarScreen'));
const HireDriverScreen = React.lazy(() => import('./pages/HireDriverScreen'));
const SupportChatScreen = React.lazy(() => import('./pages/SupportChatScreen'));
const PaymentScreen = React.lazy(() => import('./pages/PaymentScreen'));
const OrderConfirmationScreen = React.lazy(() => import('./pages/OrderConfirmationScreen'));
const NotificationSettingsScreen = React.lazy(() => import('./pages/NotificationSettingsScreen'));
const MyGarageScreen = React.lazy(() => import('./pages/MyGarageScreen'));
const MechanicProfileScreen = React.lazy(() => import('./pages/MechanicProfileScreen'));
const FavoriteMechanicsScreen = React.lazy(() => import('./pages/FavoriteMechanicsScreen'));
const OrderHistoryScreen = React.lazy(() => import('./pages/OrderHistoryScreen'));
const FAQScreen = React.lazy(() => import('./pages/FAQScreen'));
const MechanicDashboardScreen = React.lazy(() => import('./pages/mechanic/MechanicDashboardScreen'));
const MechanicJobsScreen = React.lazy(() => import('./pages/mechanic/MechanicJobsScreen'));
const MechanicEarningsScreen = React.lazy(() => import('./pages/mechanic/MechanicEarningsScreen'));
const MechanicJobDetailScreen = React.lazy(() => import('./pages/mechanic/MechanicJobDetailScreen'));
const MechanicProfileManagementScreen = React.lazy(() => import('./pages/mechanic/MechanicProfileManagementScreen'));
const MechanicNotificationSettingsScreen = React.lazy(() => import('./pages/mechanic/MechanicNotificationSettingsScreen'));
const CompleteProfileScreen = React.lazy(() => import('./pages/CompleteProfileScreen'));
const AppServicesListScreen = React.lazy(() => import('./pages/services/ServicesListScreen'));
const AppServiceDetailScreen = React.lazy(() => import('./pages/services/AppServiceDetailScreen'));
const ServiceBookingFlow = React.lazy(() => import('./pages/services/ServiceBookingFlow'));
const LiaisonBookingFlow = React.lazy(() => import('./pages/services/LiaisonBookingFlow'));
const DriverBookingFlow = React.lazy(() => import('./pages/services/DriverBookingFlow'));
const hitpayLoader = () => import('./pages/HitPayCheckoutScreen');
const HitPayCheckoutScreen = React.lazy(hitpayLoader);
export const preloadHitPayCheckout = () => {
    try {
        hitpayLoader();
    } catch {}
};

import { customerTourSteps, mechanicTourSteps } from './data/tourSteps';
import { requestNotificationPermission } from './utils/notificationManager';
import { Reminder, Database } from './types';
import { ChatMessage } from './utils/chatManager';

const usePrevious = <T,>(value: T) => {
    const ref = useRef<T | undefined>();
    useEffect(() => {
        ref.current = value;
    }, [value]);
    return ref.current;
};

// Dynamic Redirects preserving subpaths & parameters
const AdminPathRedirect: React.FC = () => {
    const location = useLocation();
    const subpath = location.pathname.replace(/^\/admin/, '');
    return <Navigate to={`/admin-portal${subpath}${location.search}`} replace />;
};

const MechanicPathRedirect: React.FC = () => {
    const location = useLocation();
    const subpath = location.pathname.replace(/^\/mechanic/, '');
    return <Navigate to={`/mechanic-portal${subpath}${location.search}`} replace />;
};

const App: React.FC = () => {
    return (
        <DatabaseProvider>
            <AppInitializer />
        </DatabaseProvider>
    );
};

const AppInitializer: React.FC = () => {
    const { loading: dbLoading } = useDatabase();
    const [appLoading, setAppLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setAppLoading(false), 700);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (dbLoading) {
            const safetyTimer = setTimeout(() => setAppLoading(false), 3000);
            return () => clearTimeout(safetyTimer);
        }
    }, [dbLoading]);

    if (appLoading || dbLoading) {
        return <AppLoadingScreen message={dbLoading ? 'Connecting to server...' : undefined} />;
    }

    return (
        <BrowserRouter>
            <AuthProvider>
                <AdminAuthProvider>
                    <MechanicAuthProvider>
                        <CallProvider>
                            <NotificationProvider>
                                <CartProvider>
                                    <WishlistProvider>
                                        <ChatNotificationProvider>
                                            <AppContent />
                                        </ChatNotificationProvider>
                                    </WishlistProvider>
                                </CartProvider>
                            </NotificationProvider>
                        </CallProvider>
                    </MechanicAuthProvider>
                </AdminAuthProvider>
            </AuthProvider>
        </BrowserRouter>
    );
};


interface ModuleGuardProps {
    moduleId: string;
    children: React.ReactNode;
}

const ModuleGuard: React.FC<ModuleGuardProps> = ({ moduleId, children }) => {
    const { db } = useDatabase();
    
    const modules = db?.settings?.modules;
    const module = modules?.find(m => m.id === moduleId);
    
    // Check both modules and serviceCustomizations
    let isExplicitlyDisabled = false;
    if (module && module.enabled === false) {
        isExplicitlyDisabled = true;
    }
    if (moduleId === 'rent-a-car' && !isSpecialServiceEnabled('carRental', db?.settings)) {
        isExplicitlyDisabled = true;
    } else if (moduleId === 'driver-for-hire' && !isSpecialServiceEnabled('driverHire', db?.settings)) {
        isExplicitlyDisabled = true;
    } else if (moduleId === 'liaison-assistance' && !isSpecialServiceEnabled('liaison', db?.settings)) {
        isExplicitlyDisabled = true;
    } else if (moduleId === 'towing' && !isSpecialServiceEnabled('towing', db?.settings)) {
        isExplicitlyDisabled = true;
    }

    if (isExplicitlyDisabled) {
        if (moduleId === 'parts-store') {
            return (
                <div className="flex flex-col items-center justify-center min-h-[85vh] px-4 py-8 text-center bg-secondary animate-fadeIn">
                    <div className="w-full max-w-md bg-[#141417] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-80" />

                        <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4 text-primary shadow-[0_0_20px_rgba(255,107,0,0.25)]">
                            <ShoppingBag className="w-8 h-8" />
                        </div>

                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-wider mb-2">
                            <Sparkles size={12} className="animate-spin text-amber-400" />
                            Upcoming Feature
                        </div>

                        <h2 className="text-2xl font-black text-white tracking-tight mb-2">Parts & Tools Store</h2>

                        {module.bannerMessage ? (
                            <div className="mb-5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 leading-relaxed font-medium">
                                {module.bannerMessage}
                            </div>
                        ) : (
                            <p className="text-gray-400 text-xs leading-relaxed mb-5">
                                Our curated automotive parts and specialty tools catalog is coming soon with direct doorstep delivery and certified fitment guarantee.
                            </p>
                        )}

                        <div className="space-y-2.5 text-left mb-6">
                            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center gap-3">
                                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                                    <ShieldCheck size={16} />
                                </div>
                                <span className="text-xs font-bold text-gray-200">100% Genuine OEM & Warrantied Parts</span>
                            </div>
                            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center gap-3">
                                <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                                    <Truck size={16} />
                                </div>
                                <span className="text-xs font-bold text-gray-200">Real-Time Delivery & Courier Tracking</span>
                            </div>
                            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center gap-3">
                                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                                    <Wrench size={16} />
                                </div>
                                <span className="text-xs font-bold text-gray-200">On-Site Mechanic Installation Option</span>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2.5">
                            <button
                                onClick={() => window.location.href = '/customer-portal/services'}
                                className="flex-1 py-3 px-4 bg-primary text-white font-bold text-xs tracking-wider uppercase rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-95"
                            >
                                Browse Services
                            </button>
                            <button
                                onClick={() => window.location.href = '/customer-portal/'}
                                className="py-3 px-5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white font-bold text-xs rounded-xl border border-white/10 transition-all active:scale-95"
                            >
                                Back Home
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center bg-secondary animate-fadeIn">
                <div className="w-20 h-20 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-6">
                    <Shield className="text-rose-500 w-10 h-10" />
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight mb-2">Service Temporarily Offline</h2>
                <p className="text-gray-400 text-sm max-w-sm mb-6 leading-relaxed">
                    {module.bannerMessage || `We apologize, but the ${module.name} service is currently unavailable. Please check back later.`}
                </p>
                <button
                    onClick={() => window.location.href = '/customer-portal/'}
                    className="px-6 py-3 bg-primary text-white font-black text-xs tracking-widest uppercase rounded-xl hover:bg-primary/95 transition-all shadow-lg shadow-primary/20"
                >
                    Go Back Home
                </button>
            </div>
        );
    }
    
    return <>{children}</>;
};

const AppServiceSlugGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { slug } = useParams<{ slug: string }>();
    let moduleId = '';
    if (slug === 'rent-a-car') moduleId = 'rent-a-car';
    else if (slug === 'driver-for-hire') moduleId = 'driver-for-hire';
    else if (slug === 'registration-assistance') moduleId = 'liaison-assistance';
    else if (slug === 'towing') moduleId = 'towing';
    
    if (moduleId) {
        return <ModuleGuard moduleId={moduleId}>{children}</ModuleGuard>;
    }
    return <>{children}</>;
};


const AppContent: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Prime the geolocation permission cache early so all subsequent checks are synchronous
        initPermissionMonitor();

        // Native: light system-bar icons for the dark theme (edge-to-edge fullscreen)
        if (Capacitor.isNativePlatform()) {
            SystemBars.setStyle({ style: SystemBarsStyle.Dark }).catch(() => {});
        }

        // Listen for native deep linking (appUrlOpen from external browser/GCash app redirects)
        let appUrlListener: any = null;
        if (Capacitor.isNativePlatform()) {
            CapApp.addListener('appUrlOpen', (event) => {
                try {
                    console.log('[Capacitor] App opened via deep link:', event.url);
                    const rawUrl = event.url;
                    // Handle ridersbud:// or custom scheme or web domain
                    let parsedUrl: URL;
                    if (rawUrl.startsWith('ridersbud://') || rawUrl.startsWith('com.sasetin42.ridersbud://')) {
                        // Transform custom scheme into relative path
                        const cleanPath = rawUrl.replace(/^[a-zA-Z0-9.-]+:\/\//, '/');
                        parsedUrl = new URL(cleanPath, 'https://ridersbud-10806.web.app');
                    } else {
                        parsedUrl = new URL(rawUrl);
                    }

                    const pathname = parsedUrl.pathname || '/';
                    const search = parsedUrl.search || '';
                    const fullTarget = `${pathname}${search}`;

                    // If it contains payment status params, route accordingly
                    const status = parsedUrl.searchParams.get('status') || parsedUrl.searchParams.get('hitpay');
                    if (status) {
                        navigate(fullTarget, { replace: true });
                    } else if (pathname && pathname !== '/') {
                        navigate(fullTarget);
                    }
                } catch (deepLinkErr) {
                    console.warn('[Capacitor] Failed to parse deep link URL:', deepLinkErr);
                }
            }).then(handle => {
                appUrlListener = handle;
            }).catch(console.warn);
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            if (appUrlListener && typeof appUrlListener.remove === 'function') {
                appUrlListener.remove();
            }
        };
    }, [navigate]);

    // Prevent browser from restoring scroll position on navigation
    useLayoutEffect(() => {
        if ('scrollRestoration' in window.history) {
            window.history.scrollRestoration = 'manual';
        }
    }, []);

    const { isAuthenticated, user, loading: authLoading, logout: customerLogout } = useAuth();
    const { isAdminAuthenticated, loading: adminLoading } = useAdminAuth();
    const { isMechanicAuthenticated, mechanic, loading: mechLoading, logout: mechanicLogout } = useMechanicAuth();
    const { db, updateCustomerLocation, updateMechanicLocation } = useDatabase();
    const { addNotification } = useNotification();
    const { openChatIds } = useChatNotification();

    const isBookingProcess = (
        location.pathname.includes('/booking/') || 
        location.pathname.includes('/payment') || 
        location.pathname.includes('/service-payment') ||
        location.pathname.includes('/hitpay-checkout') ||
        location.pathname.includes('/app-services/book/') ||
        location.pathname.includes('/app-services/liaison-book/') ||
        location.pathname.includes('/cart')
    ) && !location.pathname.includes('-confirmation') && !location.search.includes('success=true');
    const isDetailView = 
        location.pathname.includes('/service/') || 
        location.pathname.includes('/part/') ||
        (location.pathname.includes('/app-services/') && !location.pathname.includes('/book/') && !location.pathname.includes('/liaison-book/'));
    const isSupport = location.pathname.includes('/support-chat');
    const hideCustomerBottomPadding = isBookingProcess || isDetailView || isSupport;
    const isMapScreen = location.pathname.includes('/booking/') && !location.pathname.includes('-confirmation');
 
    // Ultra-Fast Payment Loading: preload HitPay chunk in background during checkout/booking navigation
    useEffect(() => {
        if (isBookingProcess) {
            preloadHitPayCheckout();
        }
    }, [isBookingProcess]);

    const prevDb = usePrevious<Database | null>(db);
    const isInitialLoadRef = useRef(true);
    const prevUserIdRef = useRef<string | null>(null);

    const currentUserId = user?.id || mechanic?.id || null;
    if (currentUserId !== prevUserIdRef.current) {
        isInitialLoadRef.current = true;
        prevUserIdRef.current = currentUserId;
    }

    const watchIdRef = useRef<number | null>(null);
    const isCustomerLocationUpdatingRef = useRef<boolean>(false);
    const lastCustomerLocationUpdateRef = useRef<number>(0);

    // Tour / Onboarding state
    const [showTour, setShowTour] = useState(false);
    const [tourRole, setTourRole] = useState<'customer' | 'mechanic'>('customer');

    // In-App Auto Update State
    const [updateInfo, setUpdateInfo] = useState<AppVersionInfo | null>(null);
    const [showUpdateModal, setShowUpdateModal] = useState(false);

    useEffect(() => {
        const userRole = isMechanicAuthenticated ? 'mechanic' : isAuthenticated ? 'customer' : 'guest';
        // Run update check on mount and whenever auth state settles
        AppUpdateService.checkForUpdates(userRole).then((result) => {
            if (result.updateAvailable && result.latestVersion) {
                // Determine if modal should be shown based on both service evaluation and live db.settings
                const liveConfig = db?.settings?.appUpdateConfig;
                const isModalGloballyHidden = liveConfig?.showUpdateModal === false || result.latestVersion.showUpdateModal === false;
                const isAudienceDisabled = liveConfig?.targetAudience === 'none' || result.latestVersion.targetAudience === 'none';
                
                let audienceAllowed = true;
                const audience = liveConfig?.targetAudience || result.latestVersion.targetAudience || 'all';
                if (audience === 'customers' && userRole !== 'customer') {
                    audienceAllowed = false;
                } else if (audience === 'mechanics' && userRole !== 'mechanic') {
                    audienceAllowed = false;
                } else if (audience === 'none') {
                    audienceAllowed = false;
                }

                const shouldShow = !isModalGloballyHidden && !isAudienceDisabled && audienceAllowed && (result.shouldShowModal !== false);

                setUpdateInfo(result.latestVersion);
                if (shouldShow) {
                    setShowUpdateModal(true);
                } else {
                    setShowUpdateModal(false);
                }
            } else {
                setShowUpdateModal(false);
            }
        });
    }, [isAuthenticated, isMechanicAuthenticated, db?.settings?.appUpdateConfig]);

    // Location enforcement states
    const [isLocationBlocked, setIsLocationBlocked] = useState(false);
    const [locationChecking, setLocationChecking] = useState(false);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [permissionState, setPermissionState] = useState<PermissionState | null>(null);
    const [activeInstructionTab, setActiveInstructionTab] = useState<'safari' | 'chrome' | 'native'>('chrome');

    useEffect(() => {
        const checkTourSeen = () => {
            if (isAuthenticated && user) {
                const tourKey = `ridersbud_tour_seen_${user.id}`;
                const hasSeenLocal = localStorage.getItem(tourKey) === 'true' || localStorage.getItem('ridersbud_tour_seen') === 'true';
                if (!user.hasSeenTour && !hasSeenLocal) {
                    setTourRole('customer');
                    setShowTour(true);
                } else {
                    setShowTour(false);
                }
            } else if (isMechanicAuthenticated && mechanic) {
                const tourKey = `ridersbud_tour_seen_${mechanic.id}`;
                const hasSeenLocal = localStorage.getItem(tourKey) === 'true' || localStorage.getItem('ridersbud_tour_seen') === 'true';
                if (!mechanic.hasSeenTour && !hasSeenLocal) {
                    setTourRole('mechanic');
                    setShowTour(true);
                } else {
                    setShowTour(false);
                }
            }
        };

        checkTourSeen();
    }, [isAuthenticated, user, isMechanicAuthenticated, mechanic]);

    const markTourSeen = async () => {
        try {
            if (user) {
                localStorage.setItem(`ridersbud_tour_seen_${user.id}`, 'true');
                localStorage.setItem('ridersbud_tour_seen', 'true');
                await updateDoc(doc(firebaseDb, 'customers', user.id), { hasSeenTour: true });
            } else if (mechanic) {
                localStorage.setItem(`ridersbud_tour_seen_${mechanic.id}`, 'true');
                localStorage.setItem('ridersbud_tour_seen', 'true');
                await updateDoc(doc(firebaseDb, 'mechanics', mechanic.id), { hasSeenTour: true });
            }
        } catch (e) {
            console.warn("Could not save tour state to firestore:", e);
        }
    };

    const handleTourComplete = async () => {
        setShowTour(false);
        await markTourSeen();
    };

    const handleTourSkip = async () => {
        setShowTour(false);
        await markTourSeen();
    };

    // Location enforcement check function wrapped in useCallback
    const checkLocationPermission = useCallback(() => {
        setLocationChecking(true);
        setLocationError(null);

        const handleSuccess = async (position: GeolocationPosition) => {
            setIsLocationBlocked(false);
            setLocationChecking(false);
            setLocationError(null);
            
            const coords = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };

            // Save to localStorage for future fallback
            localStorage.setItem('ridersbud_last_known_location', JSON.stringify(coords));

            try {
                if (isAuthenticated && user && updateCustomerLocation) {
                    await updateCustomerLocation(user.id, coords);
                } else if (isMechanicAuthenticated && mechanic && updateMechanicLocation) {
                    await updateMechanicLocation(mechanic.id, coords);
                }
            } catch (err) {
                console.warn('[Location] Failed to save location to database:', err);
            }
        };

        const handleError = (error: GeolocationPositionError) => {
            setLocationChecking(false);

            // Attempt fallback to last known cached location
            const lastKnown = localStorage.getItem('ridersbud_last_known_location');
            const isNative = Capacitor.isNativePlatform();

            if (lastKnown) {
                try {
                    const coords = JSON.parse(lastKnown);
                    setIsLocationBlocked(false);
                    setLocationError(null);
                    
                    if (isAuthenticated && user && updateCustomerLocation) {
                        updateCustomerLocation(user.id, coords);
                    } else if (isMechanicAuthenticated && mechanic && updateMechanicLocation) {
                        updateMechanicLocation(mechanic.id, coords);
                    }
                    return;
                } catch (e) {}
            }

            // Fallback for native APK mobile wrappers if no cache is available
            if (isNative) {
                const defaultCoords = { lat: 14.5995, lng: 120.9842 }; // Manila default
                setIsLocationBlocked(false);
                setLocationError(null);
                
                if (isAuthenticated && user && updateCustomerLocation) {
                    updateCustomerLocation(user.id, defaultCoords);
                } else if (isMechanicAuthenticated && mechanic && updateMechanicLocation) {
                    updateMechanicLocation(mechanic.id, defaultCoords);
                }
                return;
            }

            setIsLocationBlocked(true);

            switch (error.code) {
                case error.PERMISSION_DENIED:
                    setLocationError("Permission Denied. Please allow location access in your system/browser settings.");
                    break;
                case error.POSITION_UNAVAILABLE:
                    setLocationError("Position Unavailable. Ensure your device GPS is turned ON and has a cellular/WiFi connection.");
                    break;
                case error.TIMEOUT:
                    setLocationError("Request timed out. Please try again or step closer to a window/open area.");
                    break;
                default:
                    setLocationError("Could not retrieve location. Please refresh and try again.");
            }
        };

        const isNative = Capacitor.isNativePlatform();

        const runWebGeolocation = async () => {
            const isDenied = await isGeolocationPermissionDenied();
            if (isDenied) {
                setIsLocationBlocked(true);
                setLocationChecking(false);
                handleError({
                    code: 1, // PERMISSION_DENIED
                    message: "Geolocation permission has been blocked or ignored in browser settings.",
                    PERMISSION_DENIED: 1,
                    POSITION_UNAVAILABLE: 2,
                    TIMEOUT: 3
                } as GeolocationPositionError);
                return;
            }

            safeGetCurrentPosition(
                handleSuccess,
                async (error) => {
                    if (error.code === error.PERMISSION_DENIED) {
                        handleError(error);
                        return;
                    }
                    const denied = await isGeolocationPermissionDenied();
                    if (denied) {
                        handleError({
                            code: 1,
                            message: "Geolocation permission has been blocked or ignored in browser settings.",
                            PERMISSION_DENIED: 1,
                            POSITION_UNAVAILABLE: 2,
                            TIMEOUT: 3
                        } as GeolocationPositionError);
                        return;
                    }
                    if (error.code === error.TIMEOUT || error.code === error.POSITION_UNAVAILABLE) {
                        safeGetCurrentPosition(
                            handleSuccess,
                            handleError,
                            { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
                        );
                    } else {
                        handleError(error);
                    }
                },
                { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
            );
        };

        if (isNative) {
            Geolocation.checkPermissions().then((permissions) => {
                if (permissions.location === 'granted') {
                    Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 })
                        .then((position) => {
                            handleSuccess({
                                coords: {
                                    latitude: position.coords.latitude,
                                    longitude: position.coords.longitude
                                }
                            } as GeolocationPosition);
                        })
                        .catch((err) => {
                            Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 15000 })
                                .then((position) => {
                                    handleSuccess({
                                        coords: {
                                            latitude: position.coords.latitude,
                                            longitude: position.coords.longitude
                                        }
                                    } as GeolocationPosition);
                                })
                                .catch(() => {
                                    handleError({
                                        code: 2, // POSITION_UNAVAILABLE
                                        message: err?.message || "Position unavailable",
                                        PERMISSION_DENIED: 1,
                                        POSITION_UNAVAILABLE: 2,
                                        TIMEOUT: 3
                                    } as GeolocationPositionError);
                                });
                        });
                } else {
                    Geolocation.requestPermissions({ permissions: ['location', 'coarseLocation'] }).then((reqStatus) => {
                        if (reqStatus.location === 'granted' || reqStatus.coarseLocation === 'granted') {
                            // Run the standard check again
                            setLocationChecking(false);
                            // Set a micro-timeout or direct call
                            Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 })
                                .then((position) => {
                                    handleSuccess({
                                        coords: {
                                            latitude: position.coords.latitude,
                                            longitude: position.coords.longitude
                                        }
                                    } as GeolocationPosition);
                                })
                                .catch(() => {
                                    runWebGeolocation();
                                });
                        } else {
                            // Fallback to web geolocation instead of blocking immediately
                            runWebGeolocation();
                        }
                    }).catch((err) => {
                        console.warn("[Location] requestPermissions rejected:", err);
                        // Fallback to web geolocation
                        runWebGeolocation();
                    });
                }
            }).catch(() => {
                runWebGeolocation();
            });
        } else {
            runWebGeolocation();
        }
    }, [isAuthenticated, user, updateCustomerLocation, isMechanicAuthenticated, mechanic, updateMechanicLocation]);

    const checkLocationPermissionRef = useRef(checkLocationPermission);
    useEffect(() => {
        checkLocationPermissionRef.current = checkLocationPermission;
    }, [checkLocationPermission]);

    // Watch permission state change if API available
    useEffect(() => {
        if (typeof navigator !== 'undefined' && navigator.permissions && navigator.permissions.query) {
            navigator.permissions.query({ name: 'geolocation' })
                .then((status) => {
                    setPermissionState(status.state);
                    status.onchange = () => {
                        setPermissionState(status.state);
                        if (status.state === 'granted') {
                            setIsLocationBlocked(false);
                            setLocationError(null);
                            checkLocationPermissionRef.current();
                        } else if (status.state === 'denied') {
                            setIsLocationBlocked(true);
                        } else if (status.state === 'prompt') {
                            // User reset permission — allow retry
                            setLocationError(null);
                        }
                    };
                })
                .catch(() => {});
        }
    }, [isAuthenticated, isMechanicAuthenticated]);

    // Fix 3: Visibility-change polling fallback for browsers that don't fire onchange after returning from settings
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && isLocationBlocked && (isAuthenticated || isMechanicAuthenticated)) {
                setTimeout(() => {
                    checkLocationPermissionRef.current();
                }, 500);
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [isLocationBlocked, isAuthenticated, isMechanicAuthenticated]);

    // Prompt location permissions immediately upon login/session start
    useEffect(() => {
        const isLoggedIn = isAuthenticated || isMechanicAuthenticated;
        if (isLoggedIn) {
            checkLocationPermissionRef.current();
        } else {
            setIsLocationBlocked(false);
        }
    }, [isAuthenticated, isMechanicAuthenticated]);

    // Profile Completion Check Logic
    // We want to redirect if:
    // 1. User is authenticated (customer or mechanic)
    // 2. Profile is missing mandatory fields
    // 3. Current path is NOT already /complete-profile or logout
    const isProfileIncomplete = () => {
        // Only redirect customers with missing profile data
        // Mechanics handle profile completion via the in-app verification modal
        if (isAuthenticated && user) {
            if (user.profileCompleted) return false;
            if (user.phone && user.vehicles && user.vehicles.length > 0) return false;

            // Check dedicated completed flag
            if (localStorage.getItem(`ridersbud_profile_completed_${user.id}`) === 'true') {
                return false;
            }

            // Check cached customer session to prevent false positive redirect during initial Firestore snapshot reload
            try {
                const cachedUserStr = localStorage.getItem('ridersbud_customer_user_data');
                if (cachedUserStr) {
                    const cachedUser = JSON.parse(cachedUserStr);
                    if (cachedUser && cachedUser.id === user.id) {
                        if (cachedUser.profileCompleted) return false;
                        if (cachedUser.phone && cachedUser.vehicles && cachedUser.vehicles.length > 0) return false;
                    }
                }
            } catch (_) {}

            return !user.phone || !user.vehicles || user.vehicles.length === 0;
        }
        return false;
    };

    // Deduplication tracker — track which events have already triggered a notification in this session
    // to prevent redundant pop-ups during state re-synchronizations.
    const getSessionNotifiedEvents = (): Set<string> => {
        try {
            const data = sessionStorage.getItem('notified_booking_events');
            return data ? new Set(JSON.parse(data)) : new Set();
        } catch {
            return new Set();
        }
    };

    const trackEventNotification = (eventKey: string): boolean => {
        const events = getSessionNotifiedEvents();
        if (events.has(eventKey)) return false;
        events.add(eventKey);
        try {
            sessionStorage.setItem('notified_booking_events', JSON.stringify(Array.from(events)));
        } catch {}
        return true;
    };

    // Effect to generate notifications based on database changes
    useEffect(() => {
        if (!prevDb || !db) return;

        // Suppress notifications on initial database load/sync to avoid alerting about historical actions
        if (isInitialLoadRef.current) {
            db.bookings.forEach(b => {
                trackEventNotification(`${b.id}:${b.status}`);
                trackEventNotification(`pmt_status:${b.id}:${b.paymentStatus}`);
                trackEventNotification(`pmt_required_work_done:${b.id}`);
                trackEventNotification(`unassigned:${b.id}`);
                if (mechanic) {
                    trackEventNotification(`assigned:${b.id}:${mechanic.id}`);
                }
                trackEventNotification(`paid:${b.id}`);
            });
            if (db.orders && Array.isArray(db.orders)) {
                db.orders.forEach(o => {
                    trackEventNotification(`new_order:${o.id}`);
                    trackEventNotification(`order_status:${o.id}:${o.status}`);
                });
            }
            isInitialLoadRef.current = false;
            return;
        }

        // --- CUSTOMER NOTIFICATIONS ---
        if (isAuthenticated && user) {
            db.bookings.forEach(currentBooking => {
                if (currentBooking.customerId !== user.id && currentBooking.customerName !== user.name) return;
                
                // Track status transitions
                const oldBooking = prevDb.bookings.find(b => b.id === currentBooking.id);
                if (oldBooking && oldBooking.status !== currentBooking.status) {
                    const eventKey = `${currentBooking.id}:${currentBooking.status}`;
                    if (trackEventNotification(eventKey)) {
                        let title = ''; let message = ''; let notifType: 'info' | 'success' | 'warning' | 'alert' = 'info';
                        switch (currentBooking.status) {
                            case 'Mechanic Assigned': title = 'Mechanic Assigned'; message = `${currentBooking.mechanic?.name} has been assigned to your job.`; notifType = 'info'; break;
                            case 'En Route': title = 'Mechanic En Route'; message = `${currentBooking.mechanic?.name} is on the way.`; notifType = 'info'; break;
                            case 'In Progress': title = 'Work has Begun'; message = `${currentBooking.mechanic?.name} has started the ${currentBooking.services?.[0]?.name || currentBooking.service?.name || 'service'}.`; notifType = 'info'; break;
                            case 'Completed': title = 'Service Complete'; message = `Your ${currentBooking.services?.[0]?.name || currentBooking.service?.name || 'service'} is now complete.`; notifType = 'success'; break;
                        }
                        if (title) {
                            addNotification({ type: notifType, title, message, link: '/customer-portal/booking-history', recipientId: `customer-${user.id}` });
                        }
                    }
                }

                // Check for payment status changes to notify customer to complete payment
                if (oldBooking) {
                    // Scenario A: Payment reminder triggered by mechanic (or transition to requiring second payment)
                    // Let's notify customer if paymentStatus becomes 'partial' or remaining balance is requested,
                    // or if the mechanic clicks the Payment Reminder notification button.
                    // We can track if a notification was sent or check status transitions.
                    // Let's also check if the booking's verification or payment status changes in a way that requires customer action.
                    if (oldBooking.paymentStatus !== currentBooking.paymentStatus) {
                        const eventKey = `pmt_status:${currentBooking.id}:${currentBooking.paymentStatus}`;
                        if (trackEventNotification(eventKey)) {
                            if (currentBooking.paymentStatus === 'partial') {
                                addNotification({
                                    type: 'warning',
                                    title: 'Remaining Balance Payment Required',
                                    message: `Your booking #${currentBooking.id.slice(-6)} is partially paid. Please complete the remaining payment.`,
                                    link: `/customer-portal/booking-detail/${currentBooking.id}`,
                                    recipientId: `customer-${user.id}`
                                });
                            }
                        }
                    }
                    
                    // Trigger live notification to Customer if they need to pay to complete booking (e.g. status changes or remaining balance needs payment)
                    if (oldBooking.status !== currentBooking.status && currentBooking.status === 'Work Done') {
                        const eventKey = `pmt_required_work_done:${currentBooking.id}`;
                        if (trackEventNotification(eventKey)) {
                            const totalAmt = currentBooking.totalAmount || 0;
                            const paidAmt = currentBooking.paidAmount || 0;
                            const remaining = totalAmt - paidAmt;
                            if (remaining > 0) {
                                addNotification({
                                    type: 'warning',
                                    title: 'Payment Required to Complete',
                                    message: `Work is done! Please pay the remaining balance of ₱${remaining.toLocaleString()} to complete booking #${currentBooking.id.slice(-6)}.`,
                                    link: `/customer-portal/booking-detail/${currentBooking.id}`,
                                    recipientId: `customer-${user.id}`
                                });
                            }
                        }
                    }
                }
            });

            // Order Notifications
            if (db.orders && Array.isArray(db.orders)) {
                db.orders.forEach(currentOrder => {
                    // Check if it belongs to the user
                    if (currentOrder.customerId !== user.id && currentOrder.customerName !== user.name) return;

                    const oldOrder = prevDb.orders?.find(o => o.id === currentOrder.id);
                    if (!oldOrder) {
                        // Only notify for new orders created in the last 60 seconds to prevent notifications for historical orders on mount/refresh
                        const orderTime = currentOrder.date ? new Date(currentOrder.date).getTime() : 0;
                        const isRecent = !isNaN(orderTime) && (Date.now() - orderTime < 60000);
                        const eventKey = `new_order:${currentOrder.id}`;
                        if (isRecent && trackEventNotification(eventKey)) {
                            addNotification({
                                type: 'success',
                                title: 'Order Placed Successfully',
                                message: `Your order #${currentOrder.id.slice(-6)} has been placed.`,
                                link: `/customer-portal/order-history?id=${currentOrder.id}`,
                                recipientId: `customer-${user.id}`
                            });
                        }
                    } else if (oldOrder.status !== currentOrder.status) {
                        const eventKey = `order_status:${currentOrder.id}:${currentOrder.status}`;
                        if (trackEventNotification(eventKey)) {
                            let title = 'Order Update';
                            let message = `Your order #${currentOrder.id.slice(-6)} status is now ${currentOrder.status}.`;
                            let notifType: 'info' | 'success' | 'warning' | 'alert' = 'info';

                            switch (currentOrder.status) {
                                case 'Processing':
                                    title = 'Order Processing';
                                    message = `We are now processing your order #${currentOrder.id.slice(-6)}.`;
                                    notifType = 'info';
                                    break;
                                case 'Shipped':
                                    title = 'Order Shipped';
                                    message = `Your order #${currentOrder.id.slice(-6)} has been shipped!`;
                                    notifType = 'info';
                                    break;
                                case 'Delivered':
                                    title = 'Order Delivered';
                                    message = `Your order #${currentOrder.id.slice(-6)} has been delivered. Thank you!`;
                                    notifType = 'success';
                                    break;
                                case 'Cancelled':
                                    title = 'Order Cancelled';
                                    message = `Your order #${currentOrder.id.slice(-6)} has been cancelled.`;
                                    notifType = 'alert';
                                    break;
                            }

                            addNotification({
                                type: notifType,
                                title,
                                message,
                                link: `/customer-portal/order-history?id=${currentOrder.id}`,
                                recipientId: `customer-${user.id}`
                            });
                        }
                    }
                });
            }
        }

        // --- MECHANIC NOTIFICATIONS ---
        if (isMechanicAuthenticated && mechanic) {
            // 1. New Unassigned Job Alerts
            const newUnassignedJobs = db.bookings.filter(b => {
                const isVerified = b.isVerified === true || b.gcashPaymentStatus === 'verified';
                if (!isVerified) return false;
                if (b.status !== 'Upcoming' || b.mechanic) return false;
                const oldBooking = prevDb.bookings.find(pb => pb.id === b.id);
                return !oldBooking || !(oldBooking.isVerified === true || oldBooking.gcashPaymentStatus === 'verified');
            });
            newUnassignedJobs.forEach(job => {
                const eventKey = `unassigned:${job.id}`;
                if (trackEventNotification(eventKey)) {
                    addNotification({
                        type: 'info',
                        title: 'New Job Available',
                        message: `A ${job.services?.[0]?.name || job.service?.name || 'service'} for a ${job.vehicle?.make || 'vehicle'} is available.`,
                        link: '/mechanic-portal/dashboard',
                        recipientId: 'all',
                        recipientRole: 'mechanic'
                    });
                }
            });

            // 2. New Assigned Job
            const newlyAssignedToMe = db.bookings.filter(b => {
                const isVerified = b.isVerified === true || b.gcashPaymentStatus === 'verified';
                if (!isVerified) return false;
                if (b.mechanic?.id !== mechanic.id) return false;
                const oldBooking = prevDb.bookings.find(pb => pb.id === b.id);
                const newlyAssigned = !oldBooking?.mechanic || oldBooking.mechanic.id !== mechanic.id;
                const newlyVerified = oldBooking && !(oldBooking.isVerified === true || oldBooking.gcashPaymentStatus === 'verified');
                return newlyAssigned || newlyVerified;
            });
            newlyAssignedToMe.forEach(job => {
                const eventKey = `assigned:${job.id}:${mechanic.id}`;
                if (trackEventNotification(eventKey)) {
                    addNotification({
                        type: 'info',
                        title: 'You Have a New Job',
                        message: `You've been assigned a ${job.services?.[0]?.name || job.service?.name || 'service'} for ${job.customerName}.`,
                        link: `/mechanic-portal/job/${job.id}`,
                        recipientId: `mechanic-${mechanic.id}`
                    });
                }
            });

            // 3. Payment Received
            db.bookings.forEach(currentBooking => {
                if (currentBooking.mechanic?.id !== mechanic.id) return;
                const oldBooking = prevDb.bookings.find(b => b.id === currentBooking.id);
                if (oldBooking && oldBooking.isPaid !== true && currentBooking.isPaid === true) {
                    const eventKey = `paid:${currentBooking.id}`;
                    if (trackEventNotification(eventKey)) {
                        const price = currentBooking.totalAmount || currentBooking.services?.[0]?.price || currentBooking.service?.price || 0;
                        addNotification({
                            type: 'success',
                            title: 'Payment Received',
                            message: `You've received a payment of ₱${price.toLocaleString()} for booking #${currentBooking.id.slice(-6)}.`,
                            link: `/mechanic-portal/earnings`,
                            recipientId: `mechanic-${mechanic.id}`
                        });
                    }
                }
            });
        }

    }, [db, prevDb, isAuthenticated, user, isMechanicAuthenticated, mechanic, addNotification]);

    // Periodic customer location tracking (realtime while logged in)
    useEffect(() => {
        if (!isAuthenticated || !user || !updateCustomerLocation) return;

        let intervalId: ReturnType<typeof setInterval> | null = null;

        const updateLocation = async () => {
            const now = Date.now();
            if (isCustomerLocationUpdatingRef.current || (now - lastCustomerLocationUpdateRef.current) < 25000) {
                return;
            }

            const isDenied = await isGeolocationPermissionDenied();
            if (isDenied) {
                // Stop polling — no point retrying when browser has blocked geolocation
                if (intervalId !== null) {
                    clearInterval(intervalId);
                    intervalId = null;
                }
                return;
            }

            if ('geolocation' in navigator) {
                isCustomerLocationUpdatingRef.current = true;

                const onComplete = () => {
                    lastCustomerLocationUpdateRef.current = Date.now();
                    isCustomerLocationUpdatingRef.current = false;
                };

                const handleSuccess = (position: GeolocationPosition) => {
                    updateCustomerLocation(user.id, {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                    onComplete();
                };

                safeGetCurrentPosition(
                    handleSuccess,
                    (error) => {
                        if (error.code === error.TIMEOUT) {
                            safeGetCurrentPosition(
                                handleSuccess,
                                onComplete,
                                { enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 }
                            );
                        } else {
                            onComplete();
                        }
                    },
                    { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
                );
            }
        };

        updateLocation();
        intervalId = setInterval(updateLocation, 60000);

        // Also listen for permission changes — restart polling if permission is re-granted
        const unsubscribe = onPermissionChange((state) => {
            if (state === 'denied') {
                if (intervalId !== null) {
                    clearInterval(intervalId);
                    intervalId = null;
                }
            } else if (state === 'granted' && intervalId === null) {
                updateLocation();
                intervalId = setInterval(updateLocation, 60000);
            }
        });

        return () => {
            if (intervalId !== null) clearInterval(intervalId);
            unsubscribe();
        };
    }, [isAuthenticated, user, updateCustomerLocation]);

    // Serialized active booking status to trigger effects when statuses change
    const activeBookingStatuses = db?.bookings?.map(b => `${b.id}:${b.status}`).join(',') || '';

    // Effect for Live Customer Location Tracking (En Route)
    useEffect(() => {
        if (!isAuthenticated || !user || !db || !updateCustomerLocation) {
            return;
        }

        const activeBooking = db.bookings.find(b =>
            b.customerName === user.name &&
            b.mechanic &&
            b.status === 'En Route'
        );

        if (activeBooking && watchIdRef.current === null) {
            // Guard: only attempt geolocation if permission is not denied
            isGeolocationPermissionDenied().then(isDenied => {
                if (isDenied || watchIdRef.current !== null) return;

                // Unified precise stream: native GPS first, degraded network readings filtered,
                // stationary jitter deadband — identical behaviour to every live map in the app.
                startPreciseWatch(
                    (fix) => {
                        updateCustomerLocation(user.id, { lat: fix.lat, lng: fix.lng });
                    },
                    () => {},
                    { enableHighAccuracy: true, timeout: 10000, maximumAge: 3000 }
                ).then(id => {
                    watchIdRef.current = id;
                });
            });
        } else if (!activeBooking && watchIdRef.current !== null) {
            safeClearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
    }, [activeBookingStatuses, user, isAuthenticated, updateCustomerLocation]);

    const mechanicWatchIdRef = useRef<number | null>(null);
    // Effect for Live Mechanic Location Tracking (En Route)
    useEffect(() => {
        if (!isMechanicAuthenticated || !mechanic || !db || !updateMechanicLocation) {
            return;
        }

        const activeJob = db.bookings.find(b => 
            b.mechanic?.id === mechanic.id && 
            b.status === 'En Route'
        );

        if (activeJob && mechanicWatchIdRef.current === null) {
            // Guard: only attempt geolocation if permission is not denied
            isGeolocationPermissionDenied().then(isDenied => {
                if (isDenied || mechanicWatchIdRef.current !== null) return;

                // Same unified precise stream the customer side uses, so both parties'
                // positions arrive filtered, deduped and consistent on every tracking map.
                startPreciseWatch(
                    (fix) => {
                        updateMechanicLocation(mechanic.id, { lat: fix.lat, lng: fix.lng }, activeJob.id);
                    },
                    () => {},
                    { enableHighAccuracy: true, timeout: 10000, maximumAge: 3000 }
                ).then(id => {
                    mechanicWatchIdRef.current = id;
                });
            });
        } else if (!activeJob && mechanicWatchIdRef.current !== null) {
            safeClearWatch(mechanicWatchIdRef.current);
            mechanicWatchIdRef.current = null;
        }
    }, [activeBookingStatuses, mechanic, isMechanicAuthenticated, updateMechanicLocation]);

    // Effect for Time-based and Chat Notifications
    useEffect(() => {
        // 1. Request general notification permission on login
        if (isAuthenticated || isMechanicAuthenticated) {
            requestNotificationPermission();
        }

        // 2. Customer Service Reminders (runs periodically)
        if (isAuthenticated && user) {
            const storedRemindersJSON = localStorage.getItem('serviceReminders');
            const reminders: Reminder[] = storedRemindersJSON ? JSON.parse(storedRemindersJSON) : [];
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const oneWeekFromNow = new Date(today);
            oneWeekFromNow.setDate(today.getDate() + 7);

            reminders.forEach(reminder => {
                const dateParts = reminder.date.split('-');
                const reminderDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));

                if (reminderDate >= today && reminderDate <= oneWeekFromNow) {
                    const notifiedThisSession = sessionStorage.getItem(`notified_reminder_${reminder.id}`);
                    if (!notifiedThisSession) {
                        const daysUntilDue = Math.round((reminderDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                        let message;
                        if (daysUntilDue === 0) { message = `Your ${reminder.serviceName} for ${reminder.vehicle} is due today!`; }
                        else { message = `Your ${reminder.serviceName} for ${reminder.vehicle} is due in ${daysUntilDue} day${daysUntilDue > 1 ? 's' : ''}.`; }
                        addNotification({ type: 'warning', title: 'Service Reminder', message, link: '/customer-portal/reminders', recipientId: `customer-${user.id}` });
                        sessionStorage.setItem(`notified_reminder_${reminder.id}`, 'true');
                    }
                }
            });
        }

        // 3. Chat Message Listener
        const handleChatMessage = (event: StorageEvent) => {
            if (!event.key?.startsWith('chat_') || !event.newValue || !db) return;

            const bookingId = event.key.replace('chat_', '');
            if (openChatIds.has(bookingId)) return;

            try {
                const messages: ChatMessage[] = JSON.parse(event.newValue);
                const lastMessage = messages[messages.length - 1];
                if (!lastMessage) return;

                if (isAuthenticated && user && lastMessage.sender === 'mechanic') {
                    const booking = db.bookings.find(b => b.id === bookingId && b.customerName === user.name);
                    if (booking?.mechanic) {
                        addNotification({
                            type: 'info',
                            title: `New Message from ${booking.mechanic.name}`,
                            message: lastMessage.text,
                            link: booking.status === 'Completed' ? '/customer-portal/booking-history' : `/customer-portal/booking-detail/${booking.id}`,
                            recipientId: `customer-${user.id}`
                        });
                    }
                } else if (isMechanicAuthenticated && mechanic && lastMessage.sender === 'customer') {
                    const booking = db.bookings.find(b => b.id === bookingId && b.mechanic?.id === mechanic.id);
                    if (booking) {
                        addNotification({
                            type: 'info',
                            title: `New Message from ${booking.customerName}`,
                            message: lastMessage.text,
                            link: `/mechanic-portal/job/${booking.id}`,
                            recipientId: `mechanic-${mechanic.id}`
                        });
                    }
                }
            } catch (error) { console.error("Error handling chat notification:", error); }
        };

        window.addEventListener('storage', handleChatMessage);
        return () => window.removeEventListener('storage', handleChatMessage);

    }, [isAuthenticated, isMechanicAuthenticated, user, mechanic, db, addNotification, openChatIds]);

    if (isLocationBlocked && (isAuthenticated || isMechanicAuthenticated)) {
        const handleLogout = () => {
            if (isAuthenticated) {
                customerLogout();
            } else if (isMechanicAuthenticated) {
                mechanicLogout();
            }
        };

        const handleBypassLocation = () => {
            const defaultCoords = { lat: 14.5995, lng: 120.9842 }; // Default to Manila
            setIsLocationBlocked(false);
            setLocationError(null);
            localStorage.setItem('ridersbud_last_known_location', JSON.stringify(defaultCoords));
            
            const saveLocation = async () => {
                try {
                    if (isAuthenticated && user && updateCustomerLocation) {
                        await updateCustomerLocation(user.id, defaultCoords);
                    } else if (isMechanicAuthenticated && mechanic && updateMechanicLocation) {
                        await updateMechanicLocation(mechanic.id, defaultCoords);
                    }
                } catch (err) {
                    console.warn('[Location Bypass] Failed to save bypass location to database:', err);
                }
            };
            saveLocation();
        };

        const handleTurnOnLocationService = () => {
            const isNative = Capacitor.isNativePlatform();
            if (isNative) {
                NativeSettings.open({
                    optionAndroid: AndroidSettings.ApplicationDetails,
                    optionIOS: IOSSettings.App
                }).then(() => {
                    // Check location automatically when settings are closed / user returns
                    setTimeout(() => {
                        checkLocationPermission();
                    }, 1000);
                }).catch(() => {
                    checkLocationPermission();
                });
            } else {
                checkLocationPermission();
            }
        };

        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#0A0A0A] text-white p-6">
                <div className="max-w-sm w-full bg-[#1C1C1E] border border-white/5 rounded-3xl p-6 shadow-2xl text-center space-y-6 z-10">
                    
                    {/* Visual Onboarding Illustration */}
                    <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-black/40 border border-white/5">
                        <img 
                            src="/location_onboarding_illustration.jpg" 
                            alt="Enable Location Service" 
                            className="w-full h-full object-cover" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#1C1C1E] via-transparent to-transparent"></div>
                    </div>

                    <div className="space-y-2">
                        <h1 className="text-lg font-black tracking-tight text-white leading-snug">
                            We need your location so you can use the app properly.
                        </h1>
                        <p className="text-xs text-gray-400 font-medium leading-relaxed">
                            Can you turn on your location service?
                        </p>
                    </div>

                    {locationError && (
                        <div className="p-3 border rounded-xl text-center bg-red-500/10 border-red-500/20">
                            <span className="text-[11px] font-medium text-red-300">{locationError}</span>
                        </div>
                    )}

                    <div className="space-y-3">
                        <button
                            onClick={handleTurnOnLocationService}
                            disabled={locationChecking}
                            className="w-full bg-primary hover:bg-orange-600 text-white text-sm font-bold py-3.5 rounded-xl transition duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
                        >
                            {locationChecking ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>Verifying Access...</span>
                                </>
                            ) : (
                                <span>Turn on location service</span>
                            )}
                        </button>

                        <button
                            onClick={handleBypassLocation}
                            className="w-full py-3 bg-white/5 border border-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-bold rounded-xl transition-all duration-200"
                        >
                            Use Default Location (Bypass)
                        </button>
                    </div>

                    <div className="pt-2">
                        <button onClick={handleLogout} className="text-xs text-gray-500 hover:text-white font-semibold transition">
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            {!isOnline && (
                <div className="fixed top-0 left-0 right-0 z-[999999] bg-[#FF6B00] text-white px-4 py-2.5 text-center text-xs font-black tracking-widest uppercase flex items-center justify-center gap-2 shadow-lg animate-in slide-in-from-top duration-300">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    Offline Mode Active (Using Cached Data)
                </div>
            )}
            {showTour && (
                <TourOverlay
                    steps={tourRole === 'customer' ? customerTourSteps : mechanicTourSteps}
                    role={tourRole}
                    onComplete={handleTourComplete}
                    onSkip={handleTourSkip}
                />
            )}
            <ScrollToTop />
            <NotificationToasts />
            <GlobalChatListener />
            <ChatOverlay />
            <React.Suspense fallback={<AppLoadingScreen />}>
                <Routes>
                    {/* Admin Routes */}
                    <Route 
                        path="/admin-login" 
                        element={
                            adminLoading && localStorage.getItem('ridersbud_admin_session') === 'true' ? (
                                <AppLoadingScreen message="Verifying session..." />
                            ) : isAdminAuthenticated ? (
                                <Navigate to="/admin-portal/dashboard" replace />
                            ) : (
                                <AdminLoginScreen />
                            )
                        } 
                    />
                    <Route
                        path="/admin-portal/*"
                        element={
                            adminLoading && localStorage.getItem('ridersbud_admin_session') === 'true' ? (
                                <AppLoadingScreen message="Verifying session..." />
                            ) : isAdminAuthenticated ? (
                                <AdminLayout>
                                    <React.Suspense fallback={<AppLoadingScreen message="Loading..." />}>
                                        <Routes>
                                            <Route path="dashboard" element={<AdminDashboardScreen />} />
                                            <Route path="catalog" element={<ErrorBoundary><AdminCatalogScreen /></ErrorBoundary>} />
                                            <Route path="mechanics" element={<AdminMechanicsScreen />} />
                                            <Route path="bookings" element={<ErrorBoundary><AdminBookingsScreen /></ErrorBoundary>} />
                                            <Route path="orders" element={<AdminOrdersScreen />} />
                                            <Route path="payouts" element={<AdminPayoutsScreen />} />
                                            <Route path="customers" element={<AdminCustomersScreen />} />
                                            <Route path="analytics" element={<AdminAnalyticsScreen />} />
                                            <Route path="marketing" element={<AdminMarketingScreen />} />
                                            <Route path="monetization" element={<AdminMonetizationScreen />} />
                                            <Route path="users" element={<AdminUsersScreen />} />
                                            <Route path="settings" element={<AdminSettingsScreen />} />
                                            <Route path="chat" element={<AdminChatScreen />} />
                                            <Route path="gcash-payments" element={<Navigate to="/admin-portal/payment-audit" replace />} />
                                            <Route path="payment-audit" element={<AdminPaymentAuditScreen />} />
                                            <Route path="satisfaction" element={<AdminSatisfactionScreen />} />
                                            <Route path="notifications" element={<AdminNotificationsScreen />} />
                                            <Route path="*" element={<Navigate to="/admin-portal/dashboard" replace />} />
                                        </Routes>
                                    </React.Suspense>
                                </AdminLayout>
                            ) : (
                                <Navigate to="/admin-login" replace />
                            )
                        }
                    />

                    {/* Mechanic Routes */}
                    <Route
                        path="/mechanic-portal/*"
                        element={
                            mechLoading && localStorage.getItem('ridersbud_mechanic_session') === 'true' ? (
                                <AppLoadingScreen />
                            ) : isMechanicAuthenticated ? (
                                <div className="max-w-md mx-auto min-h-screen bg-secondary text-white font-sans pb-20 overflow-x-hidden relative">
                                    <ErrorBoundary fallback={
                                        <div className="flex flex-col items-center justify-center h-screen p-8 text-center gap-6">
                                            <div className="w-20 h-20 rounded-3xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                                            </div>
                                            <div>
                                                <p className="text-lg font-black text-white tracking-tight">Something went wrong</p>
                                                <p className="text-xs text-gray-500 mt-2 font-medium">An error occurred loading this page.</p>
                                            </div>
                                            <button onClick={() => window.location.reload()} className="bg-primary text-white font-black px-6 py-3 rounded-2xl text-xs tracking-widest shadow-xl shadow-primary/20">
                                                Reload App
                                            </button>
                                        </div>
                                    }>
                                        <Routes>
                                            <Route path="dashboard" element={<MechanicDashboardScreen />} />
                                            <Route path="jobs" element={<MechanicJobsScreen />} />
                                            <Route path="earnings" element={<MechanicEarningsScreen />} />
                                            <Route path="job/:bookingId" element={<MechanicJobDetailScreen />} />
                                            <Route path="profile" element={<MechanicProfileManagementScreen />} />
                                            <Route path="notification-settings" element={<MechanicNotificationSettingsScreen />} />
                                            <Route path="support-chat" element={<SupportChatScreen />} />
                                            <Route path="*" element={<Navigate to="/mechanic-portal/dashboard" replace />} />
                                        </Routes>
                                    </ErrorBoundary>
                                    <MechanicBottomNav />
                                    <GlobalPayoutApprovalListener />
                                    <GlobalMechanicJobListener />
                                </div>
                            ) : (
                                <Navigate to="/login" replace state={{ from: 'mechanic' }} />
                            )
                        }
                    />

                    {/* Customer App Routes */}
                    <Route
                        path="/customer-portal/*"
                        element={
                            authLoading && localStorage.getItem('ridersbud_customer_session') === 'true' ? (
                                <AppLoadingScreen />
                            ) : (
                                <div className={`max-w-md mx-auto bg-secondary text-white font-sans ${
                                    isMapScreen 
                                        ? 'h-[100dvh] overflow-hidden' 
                                        : isAuthenticated && !hideCustomerBottomPadding 
                                            ? 'min-h-screen pb-20' 
                                            : 'min-h-screen'
                                }`}>
                                    <div className={`${isMapScreen ? 'h-full' : 'min-h-full'} flex-1 flex flex-col`}>
                                        <React.Suspense fallback={<AppLoadingScreen />}>
                                        <Routes>
                                            {isAuthenticated ? (
                                                isProfileIncomplete() ? (
                                                    <Route path="*" element={<Navigate to="/complete-profile" replace />} />
                                                ) : (
                                                    <>
                                                        <Route path="/" element={<HomeScreen />} />
                                                        <Route path="/services" element={<ServicesScreen />} />
                                                        <Route path="/service/:id" element={<ServiceDetailScreen />} />
                                                        <Route path="/app-services" element={<AppServicesListScreen />} />
                                                        <Route path="/app-services/:slug" element={<AppServiceSlugGuard><AppServiceDetailScreen /></AppServiceSlugGuard>} />
                                                        <Route path="/app-services/book/:slug" element={<AppServiceSlugGuard><ServiceBookingFlow /></AppServiceSlugGuard>} />
                                                        <Route path="/app-services/liaison-book/:slug" element={<ModuleGuard moduleId="liaison-assistance"><LiaisonBookingFlow /></ModuleGuard>} />
                                                        <Route path="/app-services/driver-book/:slug" element={<ModuleGuard moduleId="driver-for-hire"><DriverBookingFlow /></ModuleGuard>} />
                                                        <Route path="/parts-store" element={<ModuleGuard moduleId="parts-store"><PartsStoreScreen /></ModuleGuard>} />
                                                        <Route path="/part/:id" element={<ModuleGuard moduleId="parts-store"><PartDetailScreen /></ModuleGuard>} />
                                                        <Route path="/booking" element={<BookingScreen />} />
                                                        <Route path="/booking/:serviceId" element={<BookingScreen />} />
                                                        <Route path="/booking-confirmation" element={<BookingConfirmationScreen />} />
                                                        <Route path="/booking-detail/:bookingId" element={<BookingDetailScreen />} />
                                                        <Route path="/cart" element={<ModuleGuard moduleId="parts-store"><CartScreen /></ModuleGuard>} />
                                                        <Route path="/payment" element={<PaymentScreen />} />
                                                        <Route path="/hitpay-checkout" element={<HitPayCheckoutScreen />} />
                                                        <Route path="/service-payment" element={<ServicePaymentScreen />} />
                                                        <Route path="/service-payment/:bookingId" element={<ServicePaymentScreen />} />
                                                        <Route path="/order-confirmation" element={<OrderConfirmationScreen />} />
                                                        <Route path="/service-payment-confirmation" element={<ServicePaymentConfirmationScreen />} />
                                                        <Route path="/profile" element={<ProfileScreen />} />
                                                        <Route path="/notification-settings" element={<NotificationSettingsScreen />} />
                                                        <Route path="/my-garage" element={<MyGarageScreen />} />
                                                        <Route path="/mechanic-profile/:mechanicId" element={<MechanicProfileScreen />} />
                                                        <Route path="/favorite-mechanics" element={<FavoriteMechanicsScreen />} />
                                                        <Route path="/reminders" element={<RemindersScreen />} />
                                                        <Route path="/booking-history/:plateNumber?" element={<BookingHistoryScreen />} />
                                                        <Route path="/bookings" element={<Navigate to="/customer-portal/" replace />} />
                                                        <Route path="/my-service-requests" element={<Navigate to="/customer-portal/" replace />} />
                                                        <Route path="/order-history" element={<ModuleGuard moduleId="parts-store"><OrderHistoryScreen /></ModuleGuard>} />
                                                        <Route path="/warranties" element={<WarrantyScreen />} />
                                                        <Route path="/wishlist" element={<ModuleGuard moduleId="parts-store"><WishlistScreen /></ModuleGuard>} />
                                                        <Route path="/faq" element={<FAQScreen />} />
                                                        <Route path="/rent-a-car" element={<ModuleGuard moduleId="rent-a-car"><RentCarScreen /></ModuleGuard>} />
                                                        <Route path="/rent-car" element={<Navigate to="/customer-portal/rent-a-car" replace />} />
                                                        <Route path="/hire-a-driver" element={<ModuleGuard moduleId="driver-for-hire"><HireDriverScreen /></ModuleGuard>} />
                                                        <Route path="/hire-driver" element={<Navigate to="/customer-portal/hire-a-driver" replace />} />
                                                        <Route path="/driver-for-hire" element={<Navigate to="/customer-portal/hire-a-driver" replace />} />
                                                        <Route path="/support-chat" element={<SupportChatScreen />} />
                                                        <Route path="*" element={<Navigate to="/customer-portal/" replace />} />
                                                    </>
                                                )
                                            ) : (
                                                <>
                                                    <Route path="/signup" element={<SignUpScreen />} />
                                                    <Route path="*" element={<LoginScreen />} />
                                                </>
                                            )}
                                        </Routes>
                                        </React.Suspense>
                                    </div>
                                    {isAuthenticated && !isProfileIncomplete() && (
                                        <BottomNav />
                                    )}
                                </div>
                            )
                        }
                    />

                    {/* Complete Profile Route */}
                    <Route path="/complete-profile" element={<CompleteProfileScreen />} />

                    {/* Standalone /hitpay-checkout route accessible from anywhere */}
                    <Route
                        path="/hitpay-checkout"
                        element={
                            <div className="max-w-md mx-auto min-h-screen bg-secondary text-white font-sans flex flex-col">
                                <HitPayCheckoutScreen />
                            </div>
                        }
                    />

                    {/* Standalone /login route */}
                    <Route
                        path="/login"
                        element={
                            (authLoading || mechLoading) && (localStorage.getItem('ridersbud_customer_session') === 'true' || localStorage.getItem('ridersbud_mechanic_session') === 'true') ? (
                                <AppLoadingScreen />
                            ) : isMechanicAuthenticated ? (
                                <Navigate to="/mechanic-portal/dashboard" replace />
                            ) : isAuthenticated ? (
                                <Navigate to="/customer-portal/" replace />
                            ) : (
                                <div className="max-w-md mx-auto min-h-screen bg-secondary text-white font-sans flex flex-col">
                                    <LoginScreen />
                                </div>
                            )
                        }
                    />

                    {/* Root Redirects */}
                    <Route path="/admin/*" element={<AdminPathRedirect />} />
                    <Route path="/mechanic/*" element={<MechanicPathRedirect />} />
                    <Route path="/" element={
                        isMechanicAuthenticated ? <Navigate to="/mechanic-portal/dashboard" replace /> : <Navigate to="/customer-portal" replace />
                    } />
                    <Route path="*" element={<Navigate to="/customer-portal" replace />} />
                </Routes>

                {/* Global Call UI — always mounted */}
                <IncomingCallModal />
                <OutgoingCallModal />
                <FullScreenCallModal />
                <ActiveCallBar />

                {/* In-App Auto Update Modal */}
                <UpdateModal
                    isOpen={showUpdateModal}
                    updateInfo={updateInfo}
                    onClose={() => setShowUpdateModal(false)}
                />
            </React.Suspense>
        </>
    )
}

export default App;