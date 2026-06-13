

import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { updateDoc, doc } from 'firebase/firestore';
import { db as firebaseDb } from './firebase';
import LoginScreen from './pages/LoginScreen';
import SignUpScreen from './pages/SignUpScreen';
import HomeScreen from './pages/HomeScreen';
import ServicesScreen from './pages/ServicesScreen';
import ServiceDetailScreen from './pages/ServiceDetailScreen';
import BookingScreen from './pages/BookingScreen';
import ProfileScreen from './pages/ProfileScreen';
import CartScreen from './pages/CartScreen';
import RemindersScreen from './pages/RemindersScreen';
import BottomNav from './components/BottomNav';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import BookingHistoryScreen from './pages/BookingHistoryScreen';
import PartsStoreScreen from './pages/PartsStoreScreen';
import PartDetailScreen from './pages/PartDetailScreen';
import WarrantyScreen from './pages/WarrantyScreen';
// FIX: Import WishlistScreen to resolve reference error.
import WishlistScreen from './pages/WishlistScreen';
import { WishlistProvider } from './context/WishlistContext';
import BookingConfirmationScreen from './pages/BookingConfirmationScreen';
import BookingDetailScreen from './pages/BookingDetailScreen';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';
import AdminLoginScreen from './pages/admin/AdminLoginScreen';
import AdminLayout from './components/admin/AdminLayout';

// Direct imports for admin screens
import AdminDashboardScreen from './pages/admin/AdminDashboardScreen';
import AdminCatalogScreen from './pages/admin/AdminCatalogScreen';
import AdminBookingsScreen from './pages/admin/AdminBookingsScreen';
import ErrorBoundary from './components/ErrorBoundary';
import GlobalChatListener from './components/chat/GlobalChatListener';
import ChatOverlay from './components/chat/ChatOverlay';

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
const AdminSatisfactionScreen = React.lazy(() => import('./pages/admin/AdminSatisfactionScreen'));
const AdminNotificationsScreen = React.lazy(() => import('./pages/admin/AdminNotificationsScreen'));

import { DatabaseProvider, useDatabase } from './context/DatabaseContext';
import PaymentScreen from './pages/PaymentScreen';
import OrderConfirmationScreen from './pages/OrderConfirmationScreen';

import OrderHistoryScreen from './pages/OrderHistoryScreen';
import { MechanicAuthProvider, useMechanicAuth } from './context/MechanicAuthContext';
import MechanicDashboardScreen from './pages/mechanic/MechanicDashboardScreen';
import MechanicBottomNav from './components/mechanic/MechanicBottomNav';
import { GlobalPayoutApprovalListener } from './components/mechanic/GlobalPayoutApprovalListener';
import MechanicProfileScreen from './pages/MechanicProfileScreen';
import MechanicJobDetailScreen from './pages/mechanic/MechanicJobDetailScreen';
import MechanicProfileManagementScreen from './pages/mechanic/MechanicProfileManagementScreen';
import MechanicJobsScreen from './pages/mechanic/MechanicJobsScreen';
import MechanicEarningsScreen from './pages/mechanic/MechanicEarningsScreen';
import FAQScreen from './pages/FAQScreen';
import { requestNotificationPermission } from './utils/notificationManager';
import { Reminder, Database } from './types';
import MyGarageScreen from './pages/MyGarageScreen';
import NotificationSettingsScreen from './pages/NotificationSettingsScreen';
import MechanicNotificationSettingsScreen from './pages/mechanic/MechanicNotificationSettingsScreen';
import { ChatNotificationProvider, useChatNotification } from './context/ChatNotificationContext';
import { ChatMessage } from './utils/chatManager';
import FavoriteMechanicsScreen from './pages/FavoriteMechanicsScreen';
import { NotificationProvider, useNotification } from './context/NotificationContext';
import NotificationToasts from './components/NotificationToasts';
import ServicePaymentScreen from './pages/ServicePaymentScreen';
import ServicePaymentConfirmationScreen from './pages/ServicePaymentConfirmationScreen';
import RentCarScreen from './pages/RentCarScreen';
import HireDriverScreen from './pages/HireDriverScreen';
import SupportChatScreen from './pages/SupportChatScreen';
import TourOverlay from './components/TourOverlay';
import { customerTourSteps, mechanicTourSteps } from './data/tourSteps';
import AppLoadingScreen from './components/AppLoadingScreen';

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


import ScrollToTop from './components/ScrollToTop';

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
        const timer = setTimeout(() => setAppLoading(false), 2500);
        return () => clearTimeout(timer);
    }, []);

    if (appLoading || dbLoading) {
        return <AppLoadingScreen message={dbLoading ? 'Connecting to server...' : undefined} />;
    }

    return (
        <BrowserRouter>
            <AuthProvider>
                <AdminAuthProvider>
                    <MechanicAuthProvider>
                        <NotificationProvider>
                            <CartProvider>
                                <WishlistProvider>
                                    <ChatNotificationProvider>
                                        <AppContent />
                                    </ChatNotificationProvider>
                                </WishlistProvider>
                            </CartProvider>
                        </NotificationProvider>
                    </MechanicAuthProvider>
                </AdminAuthProvider>
            </AuthProvider>
        </BrowserRouter>
    );
};

import CompleteProfileScreen from './pages/CompleteProfileScreen';

const AppContent: React.FC = () => {
    const location = useLocation();

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
        location.pathname.includes('/cart')
    ) && !location.pathname.includes('-confirmation') && !location.search.includes('success=true');
    const isDetailView = location.pathname.includes('/service/') || location.pathname.includes('/part/');
    const isSupport = location.pathname.includes('/support-chat');
    const hideCustomerBottomPadding = isBookingProcess || isDetailView || isSupport;
    const isMapScreen = location.pathname.includes('/booking/') && !location.pathname.includes('-confirmation');

    const prevDb = usePrevious<Database | null>(db);
    const watchIdRef = useRef<number | null>(null);
    const isCustomerLocationUpdatingRef = useRef<boolean>(false);

    // Tour / Onboarding state
    const [showTour, setShowTour] = useState(false);
    const [tourRole, setTourRole] = useState<'customer' | 'mechanic'>('customer');

    // Location enforcement states
    const [isLocationBlocked, setIsLocationBlocked] = useState(false);
    const [locationChecking, setLocationChecking] = useState(false);

    useEffect(() => {
        if (isAuthenticated && user && !user.hasSeenTour) {
            setTourRole('customer');
            setShowTour(true);
        } else if (isMechanicAuthenticated && mechanic && !mechanic.hasSeenTour) {
            setTourRole('mechanic');
            setShowTour(true);
        }
    }, [isAuthenticated, user, isMechanicAuthenticated, mechanic]);

    const markTourSeen = async () => {
        try {
            if (user) {
                await updateDoc(doc(firebaseDb, 'customers', user.id), { hasSeenTour: true });
            } else if (mechanic) {
                await updateDoc(doc(firebaseDb, 'mechanics', mechanic.id), { hasSeenTour: true });
            }
        } catch (e) {}
    };

    const handleTourComplete = async () => {
        setShowTour(false);
        await markTourSeen();
    };

    const handleTourSkip = async () => {
        setShowTour(false);
        await markTourSeen();
    };

    // Location enforcement check function
    const checkLocationPermission = () => {
        if (!('geolocation' in navigator)) {
            setIsLocationBlocked(true);
            return;
        }
        setLocationChecking(true);

        const handleSuccess = (position: GeolocationPosition) => {
            setIsLocationBlocked(false);
            setLocationChecking(false);
            if (isAuthenticated && user && updateCustomerLocation) {
                updateCustomerLocation(user.id, {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
            } else if (isMechanicAuthenticated && mechanic && updateMechanicLocation) {
                updateMechanicLocation(mechanic.id, {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
            }
        };

        const handleFallback = () => {
            navigator.geolocation.getCurrentPosition(
                handleSuccess,
                (error) => {
                    console.warn("[Location] Enforcement fallback check error:", error.message);
                    setIsLocationBlocked(true);
                    setLocationChecking(false);
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
                    console.warn("[Location] Enforcement check error:", error.message);
                    setIsLocationBlocked(true);
                    setLocationChecking(false);
                }
            },
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
        );
    };

    // Prompt location permissions immediately upon login/session start
    useEffect(() => {
        const isLoggedIn = isAuthenticated || isMechanicAuthenticated;
        if (isLoggedIn) {
            checkLocationPermission();
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

        // --- CUSTOMER NOTIFICATIONS ---
        if (isAuthenticated && user) {
            db.bookings.forEach(currentBooking => {
                if (currentBooking.customerName !== user.name) return;
                
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
        }

        // --- MECHANIC NOTIFICATIONS ---
        if (isMechanicAuthenticated && mechanic) {
            // 1. New Unassigned Job Alerts
            const newUnassignedJobs = db.bookings.filter(b => b.status === 'Upcoming' && !b.mechanic && !prevDb.bookings.find(pb => pb.id === b.id));
            newUnassignedJobs.forEach(job => {
                const eventKey = `unassigned:${job.id}`;
                if (trackEventNotification(eventKey)) {
                    addNotification({
                        type: 'info',
                        title: 'New Job Available',
                        message: `A ${job.services?.[0]?.name || job.service?.name || 'service'} for a ${job.vehicle?.make || 'vehicle'} is available.`,
                        link: '/mechanic-portal/dashboard',
                        recipientId: 'all'
                    });
                }
            });

            // 2. New Assigned Job
            const newlyAssignedToMe = db.bookings.filter(b => {
                const oldBooking = prevDb.bookings.find(pb => pb.id === b.id);
                return b.mechanic?.id === mechanic.id && (!oldBooking?.mechanic || oldBooking.mechanic.id !== mechanic.id);
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

        const updateLocation = () => {
            if (isCustomerLocationUpdatingRef.current) {
                console.log("[Location] Customer update already in progress. Skipping duplicate call.");
                return;
            }

            if ('geolocation' in navigator) {
                isCustomerLocationUpdatingRef.current = true;

                const handleSuccess = (position: GeolocationPosition) => {
                    updateCustomerLocation(user.id, {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                    isCustomerLocationUpdatingRef.current = false;
                };
                
                const handleFallback = () => {
                    // Fallback to standard accuracy on timeout/high-accuracy error
                    navigator.geolocation.getCurrentPosition(
                        handleSuccess,
                        () => {
                            isCustomerLocationUpdatingRef.current = false;
                        }, // Silently suppress final errors/timeouts to avoid warning spam
                        { enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 }
                    );
                };

                navigator.geolocation.getCurrentPosition(
                    handleSuccess,
                    (error) => {
                        if (error.code === error.TIMEOUT) {
                            handleFallback();
                        } else {
                            console.warn("[Location] Customer location error:", error.message);
                            isCustomerLocationUpdatingRef.current = false;
                        }
                    },
                    { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
                );
            }
        };

        updateLocation();
        const intervalId = setInterval(updateLocation, 30000); // 30 seconds interval to match mechanic side
        return () => clearInterval(intervalId);
    }, [isAuthenticated, user, updateCustomerLocation]);

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
            watchIdRef.current = navigator.geolocation.watchPosition(
                (position) => {
                    updateCustomerLocation(user.id, {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                },
                (error) => {
                    console.warn("[Location] En Route customer location error:", error.message);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
            );
        } else if (!activeBooking && watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
    }, [db?.bookings.length, user, isAuthenticated, updateCustomerLocation]);

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
            mechanicWatchIdRef.current = navigator.geolocation.watchPosition(
                (position) => {
                    updateMechanicLocation(mechanic.id, {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    }, activeJob.id);
                },
                (error) => {
                    console.warn("[Location] En Route mechanic location error:", error.message);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
            );
        } else if (!activeJob && mechanicWatchIdRef.current !== null) {
            navigator.geolocation.clearWatch(mechanicWatchIdRef.current);
            mechanicWatchIdRef.current = null;
        }
    }, [db?.bookings.length, mechanic, isMechanicAuthenticated, updateMechanicLocation]);

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

        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#0A0A0A] text-white p-6">
                <div className="max-w-md w-full text-center space-y-8">
                    <div className="relative flex justify-center">
                        <div className="absolute w-24 h-24 bg-primary/10 rounded-full animate-ping"></div>
                        <div className="relative w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center border border-primary/30">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                    </div>
                    
                    <div className="space-y-3">
                        <h1 className="text-2xl font-black tracking-tight text-white">Live Location Required</h1>
                        <p className="text-sm text-gray-400 leading-relaxed px-4">
                            RidersBUD relies on real-time location to connect users with nearby mechanics and track active jobs. Please enable live location services to continue using your account.
                        </p>
                    </div>

                    <div className="pt-4 space-y-4">
                        <button
                            onClick={checkLocationPermission}
                            disabled={locationChecking}
                            className="w-full bg-primary hover:bg-orange-600 text-white font-bold py-4 rounded-xl transition duration-200 shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                        >
                            {locationChecking ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>Activating GPS...</span>
                                </>
                            ) : (
                                <span>Enable Location Access</span>
                            )}
                        </button>
                        
                        <div className="p-4 bg-[#1E1E1E] rounded-xl border border-white/5 text-left text-xs text-gray-500 leading-normal space-y-2">
                            <p className="font-bold text-gray-400 uppercase tracking-wider text-[10px]">How to enable:</p>
                            <p><strong>Mobile/Browser:</strong> Tap the lock/info icon next to the URL in the address bar, change Location setting to "Allow", and try again.</p>
                        </div>

                        <button
                            onClick={handleLogout}
                            className="text-xs text-gray-500 hover:text-white font-semibold transition"
                        >
                            Sign Out Account
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
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
            <Routes>
                {/* Admin Routes */}
                <Route 
                    path="/admin-login" 
                    element={
                        adminLoading && localStorage.getItem('ridersbud_admin_session') === 'true' ? (
                            <AppLoadingScreen message="Verifying session..." />
                        ) : isAdminAuthenticated ? (
                            <Navigate to="/admin-portal/dashboard" />
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
                                        <Route path="gcash-payments" element={<AdminGCashPaymentsScreen />} />
                                        <Route path="satisfaction" element={<AdminSatisfactionScreen />} />
                                        <Route path="notifications" element={<AdminNotificationsScreen />} />
                                        <Route path="*" element={<Navigate to="/admin-portal/dashboard" />} />
                                    </Routes>
                                </React.Suspense>
                            </AdminLayout>
                        ) : (
                            <Navigate to="/admin-login" />
                        )
                    }
                />

                {/* Mechanic Routes */}
                <Route
                    path="/mechanic-portal/*"
                    element={
                        (mechLoading || authLoading) ? (
                            <AppLoadingScreen message="Verifying session..." />
                        ) : isMechanicAuthenticated ? (
                            <div className="max-w-md mx-auto min-h-screen bg-secondary text-white font-sans pb-20">
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
                                        <Route path="*" element={<Navigate to="/mechanic-portal/dashboard" />} />
                                    </Routes>
                                </ErrorBoundary>
                                <MechanicBottomNav />
                                <GlobalPayoutApprovalListener />
                            </div>
                        ) : (
                            <Navigate to="/login" state={{ from: 'mechanic' }} />
                        )
                    }
                />

                {/* Customer App Routes */}
                <Route
                    path="/customer-portal/*"
                    element={
                        <div className={`max-w-md mx-auto bg-secondary text-white font-sans ${
                            isMapScreen 
                                ? 'h-screen h-[100dvh] overflow-hidden' 
                                : isAuthenticated && !hideCustomerBottomPadding 
                                    ? 'min-h-screen pb-20' 
                                    : 'min-h-screen'
                        }`}>
                            <div className={`${isMapScreen ? 'h-full' : 'min-h-screen'} flex flex-col`}>
                                <React.Suspense fallback={<AppLoadingScreen />}>
                                <Routes>
                                    {isAuthenticated ? (
                                        isProfileIncomplete() ? (
                                            <Route path="*" element={<Navigate to="/complete-profile" />} />
                                        ) : (
                                            <>
                                                <Route path="/" element={<HomeScreen />} />
                                                <Route path="/services" element={<ServicesScreen />} />
                                                <Route path="/service/:id" element={<ServiceDetailScreen />} />
                                                <Route path="/parts-store" element={<PartsStoreScreen />} />
                                                <Route path="/part/:id" element={<PartDetailScreen />} />
                                                <Route path="/booking/:serviceId" element={<BookingScreen />} />
                                                <Route path="/booking-confirmation" element={<BookingConfirmationScreen />} />
                                                <Route path="/booking-detail/:bookingId" element={<BookingDetailScreen />} />
                                                <Route path="/cart" element={<CartScreen />} />
                                                <Route path="/payment" element={<PaymentScreen />} />
                                                <Route path="/service-payment" element={<ServicePaymentScreen />} />
                                                <Route path="/order-confirmation" element={<OrderConfirmationScreen />} />
                                                <Route path="/service-payment-confirmation" element={<ServicePaymentConfirmationScreen />} />
                                                <Route path="/profile" element={<ProfileScreen />} />
                                                <Route path="/notification-settings" element={<NotificationSettingsScreen />} />
                                                <Route path="/my-garage" element={<MyGarageScreen />} />
                                                <Route path="/mechanic-profile/:mechanicId" element={<MechanicProfileScreen />} />
                                                <Route path="/favorite-mechanics" element={<FavoriteMechanicsScreen />} />
                                                <Route path="/reminders" element={<RemindersScreen />} />
                                                <Route path="/booking-history/:plateNumber?" element={<BookingHistoryScreen />} />
                                                <Route path="/order-history" element={<OrderHistoryScreen />} />
                                                <Route path="/warranties" element={<WarrantyScreen />} />
                                                <Route path="/wishlist" element={<WishlistScreen />} />
                                                <Route path="/faq" element={<FAQScreen />} />
                                                <Route path="/rent-a-car" element={<RentCarScreen />} />
                                                <Route path="/hire-a-driver" element={<HireDriverScreen />} />
                                                <Route path="/support-chat" element={<SupportChatScreen />} />
                                                <Route path="*" element={<Navigate to="/customer-portal/" />} />
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
                    }
                />

                {/* Complete Profile Route */}
                <Route path="/complete-profile" element={<CompleteProfileScreen />} />

                {/* Standalone /login route */}
                <Route
                    path="/login"
                    element={
                        isMechanicAuthenticated ? (
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
        </>
    )
}

export default App;