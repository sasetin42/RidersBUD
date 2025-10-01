import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
import WarrantyScreen from './pages/WarrantyScreen';
import { WishlistProvider } from './context/WishlistContext';
import WishlistScreen from './pages/WishlistScreen';
import BookingConfirmationScreen from './pages/BookingConfirmationScreen';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';
import AdminLoginScreen from './pages/admin/AdminLoginScreen';
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboardScreen from './pages/admin/AdminDashboardScreen';
import AdminServicesScreen from './pages/admin/AdminServicesScreen';
import AdminPartsScreen from './pages/admin/AdminPartsScreen';
import AdminMechanicsScreen from './pages/admin/AdminMechanicsScreen';
import AdminBookingsScreen from './pages/admin/AdminBookingsScreen';
import AdminCustomersScreen from './pages/admin/AdminCustomersScreen';
import AdminSettingsScreen from './pages/admin/AdminSettingsScreen';

const App: React.FC = () => {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 2500);
        return () => clearTimeout(timer);
    }, []);

    if (loading) {
        return <SplashScreen />;
    }

    return (
        <AuthProvider>
            <AdminAuthProvider>
                <CartProvider>
                    <WishlistProvider>
                        <AppContent />
                    </WishlistProvider>
                </CartProvider>
            </AdminAuthProvider>
        </AuthProvider>
    );
};

const AppContent: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const { isAdminAuthenticated } = useAdminAuth();
    
    return (
        <HashRouter>
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
                                    <Route path="services" element={<AdminServicesScreen />} />
                                    <Route path="parts" element={<AdminPartsScreen />} />
                                    <Route path="mechanics" element={<AdminMechanicsScreen />} />
                                    <Route path="bookings" element={<AdminBookingsScreen />} />
                                    <Route path="customers" element={<AdminCustomersScreen />} />
                                    <Route path="analytics" element={<AdminDashboardScreen />} />
                                    <Route path="settings" element={<AdminSettingsScreen />} />
                                    <Route path="*" element={<Navigate to="/admin/dashboard" />} />
                                </Routes>
                            </AdminLayout>
                        ) : (
                            <Navigate to="/admin/login" />
                        )
                    }
                />

                {/* Customer App Routes */}
                <Route
                    path="/*"
                    element={
                        <div className="max-w-md mx-auto h-screen bg-secondary text-white font-sans flex flex-col">
                            <div className="flex-grow overflow-y-auto">
                                <Routes>
                                    {isAuthenticated ? (
                                        <>
                                            <Route path="/" element={<HomeScreen />} />
                                            <Route path="/services" element={<ServicesScreen />} />
                                            <Route path="/service/:id" element={<ServiceDetailScreen />} />
                                            <Route path="/parts-store" element={<PartsStoreScreen />} />
                                            <Route path="/booking/:serviceId" element={<BookingScreen />} />
                                            <Route path="/booking-confirmation" element={<BookingConfirmationScreen />} />
                                            <Route path="/cart" element={<CartScreen />} />
                                            <Route path="/profile" element={<ProfileScreen />} />
                                            <Route path="/reminders" element={<RemindersScreen />} />
                                            <Route path="/booking-history" element={<BookingHistoryScreen />} />
                                            <Route path="/warranties" element={<WarrantyScreen />} />
                                            <Route path="/wishlist" element={<WishlistScreen />} />
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
                            {isAuthenticated && <BottomNav />}
                        </div>
                    }
                />
            </Routes>
        </HashRouter>
    )
}

export default App;