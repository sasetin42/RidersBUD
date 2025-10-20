



import React, { useState, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import SplashScreen from './pages/SplashScreen';
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
import { WishlistProvider } from './context/WishlistContext';
import WishlistScreen from './pages/WishlistScreen';
import BookingConfirmationScreen from './pages/BookingConfirmationScreen';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';
import AdminLoginScreen from './pages/admin/AdminLoginScreen';
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboardScreen from './pages/admin/AdminDashboardScreen';
import AdminCatalogScreen from './pages/admin/AdminCatalogScreen';
import AdminMechanicsScreen from './pages/admin/AdminMechanicsScreen';
import AdminBookingsScreen from './pages/admin/AdminBookingsScreen';
import AdminCustomersScreen from './pages/admin/AdminCustomersScreen';
import AdminSettingsScreen from './pages/admin/AdminSettingsScreen';
import { DatabaseProvider, useDatabase } from './context/DatabaseContext';
import PaymentScreen from './pages/PaymentScreen';
import OrderConfirmationScreen from './pages/OrderConfirmationScreen';
import OrderHistoryScreen from './pages/OrderHistoryScreen';
import { MechanicAuthProvider, useMechanicAuth } from './context/MechanicAuthContext';
import MechanicDashboardScreen from './pages/mechanic/MechanicDashboardScreen';
import MechanicBottomNav from './components/mechanic/MechanicBottomNav';
import MechanicProfileScreen from './pages/MechanicProfileScreen';
import MechanicJobDetailScreen from './pages/mechanic/MechanicJobDetailScreen';
import MechanicProfileManagementScreen from './pages/mechanic/MechanicProfileManagementScreen';
import MechanicJobsScreen from './pages/mechanic/MechanicJobsScreen';
import MechanicEarningsScreen from './pages/mechanic/MechanicEarningsScreen';
import AdminAnalyticsScreen from './pages/admin/AdminAnalyticsScreen';
import FAQScreen from './pages/FAQScreen';
import { requestNotificationPermission } from './utils/notificationManager';
import { Reminder, Database } from './types';
import MyGarageScreen from './pages/MyGarageScreen';
import AdminMarketingScreen from './pages/admin/AdminMarketingScreen';
import AIAssistantModal from './components/AIAssistantModal';
import NotificationSettingsScreen from './pages/NotificationSettingsScreen';
import MechanicNotificationSettingsScreen from './pages/mechanic/MechanicNotificationSettingsScreen';
import AdminUsersScreen from './pages/admin/AdminUsersScreen';
import { ChatNotificationProvider, useChatNotification } from './context/ChatNotificationContext';
import { ChatMessage } from './utils/chatManager';
import FavoriteMechanicsScreen from './pages/FavoriteMechanicsScreen';
import AdminOrdersScreen from './pages/admin/AdminOrdersScreen';
import MechanicTasksScreen from './pages/mechanic/MechanicTasksScreen';
import { NotificationProvider, useNotification } from './context/NotificationContext';
import NotificationToasts from './components/NotificationToasts';

const usePrevious = <T,>(value: T) => {
    const ref = useRef<T>();
    useEffect(() => {
        ref.current = value;
    }, [value]);
    return ref.current;
};


const App: React.FC = () => {
    return (
        <NotificationProvider>
            <DatabaseProvider>
                <AppInitializer />
            </DatabaseProvider>
        </NotificationProvider>
    );
};

const AppInitializer: React.FC = () => {
    const { loading: dbLoading } = useDatabase();
    const [appLoading, setAppLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setAppLoading(false), 2500); // Splash screen duration
        return () => clearTimeout(timer);
    }, []);

    if (appLoading || dbLoading) {
        return <SplashScreen />;
    }
    
    return (
        <AuthProvider>
            <AdminAuthProvider>
                <MechanicAuthProvider>
                    <CartProvider>
                        <WishlistProvider>
                            <ChatNotificationProvider>
                                <AppContent />
                            </ChatNotificationProvider>
                        </WishlistProvider>
                    </CartProvider>
                </MechanicAuthProvider>
            </AdminAuthProvider>
        </AuthProvider>
    );
};

const AppContent: React.FC = () => {
    const { isAuthenticated, user } = useAuth();
    const { isAdminAuthenticated } = useAdminAuth();
    const { isMechanicAuthenticated, mechanic } = useMechanicAuth();
    const { db } = useDatabase();
    const { addNotification } = useNotification();
    const { openChatIds } = useChatNotification();
    const [isAssistantOpen, setIsAssistantOpen] = useState(false);
    
    // FIX: Changed to allow type inference, which can resolve obscure compiler errors when dealing with complex types.
    const prevDb = usePrevious(db);
    
    // Effect to generate notifications based on database changes
    useEffect(() => {
        if (!prevDb || !db) return;

        // --- CUSTOMER NOTIFICATIONS ---
        if (isAuthenticated && user) {
            // 1. Check for booking status updates
            db.bookings.forEach(currentBooking => {
                if (currentBooking.customerName !== user.name) return;
                const oldBooking = prevDb.bookings.find(b => b.id === currentBooking.id);
                if (oldBooking && oldBooking.status !== currentBooking.status) {
                     let title = ''; let message = '';
                     switch (currentBooking.status) {
                         case 'En Route': title = 'Mechanic En Route!'; message = `${currentBooking.mechanic?.name} is on the way.`; break;
                         case 'In Progress': title = 'Work has Begun!'; message = `${currentBooking.mechanic?.name} has started the ${currentBooking.service.name} service.`; break;
                         case 'Completed': title = 'Service Complete!'; message = `Your ${currentBooking.service.name} is now complete.`; break;
                     }
                     if (title) {
                         addNotification({ type: 'booking', title, message, link: '/booking-history', recipientId: `customer-${user.id}` });
                     }
                }
            });
        }

        // --- MECHANIC NOTIFICATIONS ---
        if (isMechanicAuthenticated && mechanic) {
            // 1. New Unassigned Job Alerts
            const newUnassignedJobs = db.bookings.filter(b => b.status === 'Upcoming' && !b.mechanic && !prevDb.bookings.find(pb => pb.id === b.id));
            newUnassignedJobs.forEach(job => {
                addNotification({
                    type: 'job',
                    title: 'New Job Available!',
                    message: `A ${job.service.name} for a ${job.vehicle.make} is available.`,
                    link: '/mechanic/dashboard',
                    recipientId: 'all' // This should be targeted if mechanics had specializations that matched
                });
            });

            // 2. New Assigned Job
            const newlyAssignedToMe = db.bookings.filter(b => {
                const oldBooking = prevDb.bookings.find(pb => pb.id === b.id);
                return b.mechanic?.id === mechanic.id && (!oldBooking?.mechanic || oldBooking.mechanic.id !== mechanic.id);
            });
            newlyAssignedToMe.forEach(job => {
                addNotification({
                    type: 'job',
                    title: 'You Have a New Job!',
                    message: `You've been assigned a ${job.service.name} for ${job.customerName}.`,
                    link: `/mechanic/job/${job.id}`,
                    recipientId: `mechanic-${mechanic.id}`
                });
            });
        }

    }, [db, prevDb, isAuthenticated, user, isMechanicAuthenticated, mechanic, addNotification]);

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
            today.setHours(0,0,0,0);
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
                         if (daysUntilDue === 0) { message = `Your ${reminder.serviceName} for ${reminder.vehicle} is due today!`;} 
                         else { message = `Your ${reminder.serviceName} for ${reminder.vehicle} is due in ${daysUntilDue} day${daysUntilDue > 1 ? 's' : ''}.`;}
                        addNotification({ type: 'reminder', title: 'Service Reminder', message, link: '/reminders', recipientId: `customer-${user.id}` });
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
                            type: 'chat',
                            title: `New Message from ${booking.mechanic.name}`,
                            message: lastMessage.text,
                            link: booking.status === 'Completed' ? '/booking-history' : '/', // Link depends on context
                            recipientId: `customer-${user.id}`
                         });
                    }
                } else if (isMechanicAuthenticated && mechanic && lastMessage.sender === 'customer') {
                    const booking = db.bookings.find(b => b.id === bookingId && b.mechanic?.id === mechanic.id);
                    if (booking) {
                         addNotification({
                            type: 'chat',
                            title: `New Message from ${booking.customerName}`,
                            message: lastMessage.text,
                            link: `/mechanic/job/${booking.id}`,
                            recipientId: `mechanic-${mechanic.id}`
                         });
                    }
                }
            } catch (error) { console.error("Error handling chat notification:", error); }
        };

        window.addEventListener('storage', handleChatMessage);
        return () => window.removeEventListener('storage', handleChatMessage);

    }, [isAuthenticated, isMechanicAuthenticated, user, mechanic, db, addNotification, openChatIds]);


    return (
        <HashRouter>
            <NotificationToasts />
            <Routes>
                {/* Admin Routes */}
                <Route path="/admin/login" element={<AdminLoginScreen />} />
                <Route
                    path="/admin/*"
                    element={
                        isAdminAuthenticated ? (
                            <AdminLayout>
                                <Routes>
                                    <Route path="dashboard" element={<AdminDashboardScreen />} />
                                    <Route path="catalog" element={<AdminCatalogScreen />} />
                                    <Route path="mechanics" element={<AdminMechanicsScreen />} />
                                    <Route path="bookings" element={<AdminBookingsScreen />} />
                                    <Route path="orders" element={<AdminOrdersScreen />} />
                                    <Route path="customers" element={<AdminCustomersScreen />} />
                                    <Route path="analytics" element={<AdminAnalyticsScreen />} />
                                    <Route path="marketing" element={<AdminMarketingScreen />} />
                                    <Route path="users" element={<AdminUsersScreen />} />
                                    <Route path="settings" element={<AdminSettingsScreen />} />
                                    <Route path="*" element={<Navigate to="/admin/dashboard" />} />
                                </Routes>
                            </AdminLayout>
                        ) : (
                            <Navigate to="/admin/login" />
                        )
                    }
                />

                {/* Mechanic Routes */}
                 <Route
                    path="/mechanic/*"
                    element={
                        isMechanicAuthenticated ? (
                            <div className="max-w-md mx-auto h-screen bg-secondary text-white font-sans flex flex-col overflow-hidden">
                                <div className="flex-grow overflow-y-auto">
                                    <Routes>
                                        <Route path="dashboard" element={<MechanicDashboardScreen />} />
                                        <Route path="jobs" element={<MechanicJobsScreen />} />
                                        <Route path="tasks" element={<MechanicTasksScreen />} />
                                        <Route path="earnings" element={<MechanicEarningsScreen />} />
                                        <Route path="job/:bookingId" element={<MechanicJobDetailScreen />} />
                                        <Route path="profile" element={<MechanicProfileManagementScreen />} />
                                        <Route path="notification-settings" element={<MechanicNotificationSettingsScreen />} />
                                        <Route path="*" element={<Navigate to="/mechanic/dashboard" />} />
                                    </Routes>
                                </div>
                                <MechanicBottomNav />
                            </div>
                        ) : (
                            <Navigate to="/login" state={{ from: 'mechanic' }} />
                        )
                    }
                />

                {/* Customer App Routes */}
                <Route
                    path="/*"
                    element={
                        <div className="max-w-md mx-auto h-screen bg-secondary text-white font-sans flex flex-col overflow-hidden">
                            <div className="flex-grow overflow-y-auto">
                                <Routes>
                                    {isAuthenticated ? (
                                        <>
                                            <Route path="/" element={<HomeScreen />} />
                                            <Route path="/services" element={<ServicesScreen />} />
                                            <Route path="/service/:id" element={<ServiceDetailScreen />} />
                                            <Route path="/parts-store" element={<PartsStoreScreen />} />
                                            <Route path="/part/:id" element={<PartDetailScreen />} />
                                            <Route path="/booking/:serviceId" element={<BookingScreen />} />
                                            <Route path="/booking-confirmation" element={<BookingConfirmationScreen />} />
                                            <Route path="/cart" element={<CartScreen />} />
                                            <Route path="/payment" element={<PaymentScreen />} />
                                            <Route path="/order-confirmation" element={<OrderConfirmationScreen />} />
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
                                            <Route path="*" element={<Navigate to="/" />} />
                                        </>
                                    ) : (
                                        <>
                                            <Route path="/signup" element={<SignUpScreen />} />
                                            <Route path="*" element={<LoginScreen />} />
                                        </>
                                    )}
                                </Routes>
                            </div>
                            {isAuthenticated && (
                                <>
                                    <button
                                        onClick={() => setIsAssistantOpen(true)}
                                        className="absolute bottom-20 right-5 bg-primary text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:bg-orange-600 transition-transform transform hover:scale-110 active:scale-100 z-40"
                                        aria-label="Open AI Assistant"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M9.628 2.034a1 1 0 011.744 0l1.494 3.026a1 1 0 00.745.542l3.32.483a1 1 0 01.554 1.705l-2.402 2.34a1 1 0 00-.287.885l.568 3.306a1 1 0 01-1.45 1.054l-2.968-1.56a1 1 0 00-.932 0l-2.968 1.56a1 1 0 01-1.45-1.054l.568-3.306a1 1 0 00-.287-.885l-2.402-2.34a1 1 0 01.554-1.705l3.32-.483a1 1 0 00.745-.542L9.628 2.034z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                    <BottomNav />
                                    {isAssistantOpen && <AIAssistantModal onClose={() => setIsAssistantOpen(false)} />}
                                </>
                            )}
                        </div>
                    }
                />
            </Routes>
        </HashRouter>
    )
}

export default App;