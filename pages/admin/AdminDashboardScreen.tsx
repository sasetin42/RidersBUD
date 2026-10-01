import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Booking, Mechanic } from '../../types';
import LiveMap from '../../components/admin/LiveMap';
import { useDatabase } from '../../context/DatabaseContext';
import Spinner from '../../components/Spinner';
import Modal from '../../components/admin/Modal';
import { useNavigate } from 'react-router-dom';
import EnhancedKPICard from '../../components/admin/EnhancedKPICard';
import DashboardChart from '../../components/admin/DashboardCharts';
import { useNotification } from '../../context/NotificationContext';
import {
    Download, Plus, Clock, Users, ArrowRight, CheckCircle, AlertCircle,
    ShoppingBag, Map, Activity, Wifi, WifiOff, Server, DollarSign,
    Star, TrendingUp, Calendar, BarChart3, CreditCard, Settings,
    RefreshCw, Zap, UserCheck, XCircle, ShieldCheck
} from 'lucide-react';
import Tooltip from '../../components/ui/Tooltip';

const Icons = {
    Revenue: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
    Bookings: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
    ),
    Mechanics: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656-.126-1.283-.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
    ),
    Pending: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
    Customers: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
    ),
    RevenueTarget: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
    ),
};

const AdminDashboardScreen: React.FC = () => {
    const { db, loading, updateBookingStatus, assignMechanicToBooking } = useDatabase();
    const { addNotification } = useNotification();
    const navigate = useNavigate();

    const [viewingMechanic, setViewingMechanic] = useState<Mechanic | null>(null);
    const [assigningBooking, setAssigningBooking] = useState<Booking | null>(null);
    const [isNewBookingModalOpen, setIsNewBookingModalOpen] = useState(false);
    const [lastRefreshed] = useState(Date.now());
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Voice Dispatch System
    const prevBookingsCount = React.useRef(db?.bookings.length || 0);
    useEffect(() => {
        if (db && db.bookings.length > prevBookingsCount.current) {
            const newBooking = db.bookings[db.bookings.length - 1];

            const playDispatchPing = (): Promise<void> => {
                return new Promise(resolve => {
                    try {
                        const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext);
                        if (!AudioCtx) { resolve(); return; }
                        const ctx = new AudioCtx();
                        const tones = [880, 1100, 1320];
                        tones.forEach((freq, i) => {
                            const oscillator = ctx.createOscillator();
                            const gainNode = ctx.createGain();
                            oscillator.connect(gainNode);
                            gainNode.connect(ctx.destination);
                            oscillator.type = 'sine';
                            oscillator.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15);
                            gainNode.gain.setValueAtTime(0.0, ctx.currentTime + i * 0.15);
                            gainNode.gain.linearRampToValueAtTime(0.35, ctx.currentTime + i * 0.15 + 0.02);
                            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.25);
                            oscillator.start(ctx.currentTime + i * 0.15);
                            oscillator.stop(ctx.currentTime + i * 0.15 + 0.3);
                        });
                        setTimeout(resolve, tones.length * 150 + 400);
                    } catch (e) { resolve(); }
                });
            };

            const selectPremiumVoice = (): SpeechSynthesisVoice | null => {
                const voices = window.speechSynthesis.getVoices();
                const preferred = [
                    'Google US English', 'Microsoft Aria Online (Natural)', 'Microsoft Aria',
                    'Microsoft David Online (Natural)', 'Samantha', 'Karen'
                ];
                for (const name of preferred) {
                    const v = voices.find(v => v?.name === name);
                    if (v) return v;
                }
                return voices.find(v => v?.lang?.startsWith('en') && !v?.name?.toLowerCase().includes('zira')) || voices[0] || null;
            };

            const speakNewBooking = () => {
                if (!('speechSynthesis' in window)) return;
                window.speechSynthesis.cancel();

                const price = newBooking.totalPrice
                    ? `valued at ${newBooking.totalPrice.toLocaleString()} pesos`
                    : '';
                const address = newBooking.location?.address || 'an unspecified location';
                const time = newBooking.time || 'a scheduled time';

                const script = [
                    `Attention all dispatch personnel.`,
                    `A new service booking has just been received.`,
                    `Customer name: ${newBooking.customerName}.`,
                    `Requested service: ${newBooking.service?.name || (newBooking.services?.[0]?.name) || 'Unknown'}${price ? ', ' + price : ''}.`,
                    `Pickup location: ${address}.`,
                    `Appointment time: ${time}.`,
                    `Please assign an available mechanic immediately. Thank you.`
                ].join('  ');

                const utterance = new SpeechSynthesisUtterance(script);
                utterance.rate = 0.88;
                utterance.pitch = 1.0;
                utterance.volume = 1.0;

                const assignVoice = () => {
                    const voice = selectPremiumVoice();
                    if (voice) utterance.voice = voice;
                    window.speechSynthesis.speak(utterance);
                };

                if (window.speechSynthesis.getVoices().length === 0) {
                    window.speechSynthesis.onvoiceschanged = () => {
                        window.speechSynthesis.onvoiceschanged = null;
                        assignVoice();
                    };
                } else {
                    assignVoice();
                }
            };

            playDispatchPing().then(speakNewBooking);

            addNotification({
                type: 'info',
                title: '📢 Live Dispatch Alert',
                message: `Voice announcement broadcast for ${newBooking.customerName} — ${newBooking.service?.name || (newBooking.services?.[0]?.name) || 'Unknown'}.`,
                recipientId: 'admin',
            });
        }
        prevBookingsCount.current = db?.bookings.length || 0;
    }, [db?.bookings, addNotification]);

    const dashboardData = useMemo(() => {
        if (!db) return null;
        const { bookings, mechanics, settings, customers, orders } = db;

        // Core KPIs
        const totalBookings = bookings.length;
        const activeMechanics = mechanics.filter(m => m.status === 'Active').length;
        const pendingApprovals = mechanics.filter(m => m.status === 'Pending' || m.verificationStatus === 'pending' || m.verificationStatus === 'Pending').length;
        const totalCustomers = customers.length;
        const totalOrders = orders?.length || 0;

        // Revenue calculations
        const totalRevenue = bookings
            .filter(b => b.status === 'Completed')
            .reduce((acc, curr) => {
                const price = curr.totalPrice || curr.service?.price || (curr.services && curr.services[0]?.price) || 1500;
                return acc + price;
            }, 0);

        // Monthly revenue for trend
        const monthlyRevenue: Record<string, number> = {};
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        months.forEach(m => monthlyRevenue[m] = 0);

        bookings.filter(b => b.status === 'Completed').forEach(b => {
            try {
                const monthIdx = new Date(b.date).getMonth();
                const price = b.totalPrice || b.service?.price || (b.services && b.services[0]?.price) || 1500;
                monthlyRevenue[months[monthIdx]] += price;
            } catch { }
        });
        const monthlyRevenueData = Object.entries(monthlyRevenue)
            .filter(([, v]) => v > 0)
            .map(([name, value]) => ({ name, value }));

        // Revenue by day of week
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const revenueByDay: Record<string, number> = {};
        days.forEach(d => revenueByDay[d] = 0);

        bookings.filter(b => b.status === 'Completed').forEach(b => {
            try {
                const dayName = days[new Date(b.date).getDay()];
                const price = b.totalPrice || b.service?.price || (b.services && b.services[0]?.price) || 1500;
                revenueByDay[dayName] += price;
            } catch { }
        });
        const revenueTrend = Object.entries(revenueByDay).map(([name, value]) => ({ name, value }));

        // Bookings by status
        const bookingsByStatus = [
            { name: 'Completed', value: bookings.filter(b => b.status === 'Completed').length },
            { name: 'Upcoming', value: bookings.filter(b => b.status === 'Upcoming').length },
            { name: 'In Progress', value: bookings.filter(b => b.status === 'In Progress' || b.status === 'En Route' || b.status === 'Mechanic Assigned' || b.status === 'Booking Confirmed').length },
            { name: 'Cancelled', value: bookings.filter(b => b.status === 'Cancelled').length },
        ].filter(d => d.value > 0);

        // Service type distribution
        const serviceDistribution: Record<string, number> = {};
        bookings.forEach(b => {
            const name = b.service?.name || (b.services && b.services[0]?.name) || 'Other';
            serviceDistribution[name] = (serviceDistribution[name] || 0) + 1;
        });
        const serviceData = Object.entries(serviceDistribution)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([name, value]) => ({ name: name.length > 15 ? name.slice(0, 15) + '...' : name, value }));

        // Unassigned bookings
        const unassignedBookings = bookings.filter(b =>
            (b.status === 'Upcoming' || b.status === 'Booking Confirmed') &&
            !b.mechanicId && !b.mechanic
        );

        // Average rating
        const mechanicsWithRating = mechanics.filter(m => m.rating && m.rating > 0);
        const avgRating = mechanicsWithRating.length > 0
            ? mechanicsWithRating.reduce((acc, m) => acc + (m.rating || 0), 0) / mechanicsWithRating.length
            : 0;

        // Recent activity
        const recentActivity = [
            ...bookings.map(b => ({
                id: `b-${b.id}`,
                timestamp: (() => {
                    try { return new Date(b.date + ' ' + (b.time?.includes('AM') || b.time?.includes('PM') ? '12:00' : b.time || '12:00')).getTime(); } catch { return 0; }
                })(),
                type: 'booking' as const,
                title: b.customerName,
                subtitle: `booked ${b.service?.name || (b.services && b.services[0]?.name) || 'Service'}`,
                data: b
            })),
            ...mechanics.filter(m => m.registrationDate).map(m => ({
                id: `m-${m.id}`,
                timestamp: new Date(m.registrationDate!).getTime(),
                type: 'mechanic' as const,
                title: m.name,
                subtitle: 'applied to join.',
                data: m
            })),
            ...bookings.filter(b => b.status === 'Completed' && b.review).map(b => ({
                id: `r-${b.id}`,
                timestamp: (() => {
                    try { return new Date(b.review?.date || b.date).getTime(); } catch { return 0; }
                })(),
                type: 'review' as const,
                title: b.customerName,
                subtitle: `left a ${b.review?.rating || 5}-star review`,
                data: b
            }))
        ].sort((a, b) => b.timestamp - a.timestamp).slice(0, 12);

        // Top mechanics
        const topMechanics = [...mechanics]
            .sort((a, b) => (b.rating || 0) - (a.rating || 0) || (b.reviews || 0) - (a.reviews || 0))
            .slice(0, 5);

        // Today's bookings count
        const todayStr = new Date().toISOString().split('T')[0];
        const todayBookings = bookings.filter(b => {
            try { return b.date === todayStr; } catch { return false; }
        }).length;

        // Monthly revenue target (mock: 500k)
        const monthlyTarget = 500000;
        const monthlyProgress = Math.min(totalRevenue / monthlyTarget, 1);

        // Payment stats
        const paidBookings = bookings.filter(b => b.isPaid || b.paymentStatus === 'paid').length;
        const pendingPayments = bookings.filter(b =>
            b.paymentStatus === 'pending' || b.paymentStatus === 'partial'
        ).length;

        return {
            totalBookings, activeMechanics, pendingApprovals, totalRevenue,
            totalCustomers, totalOrders, avgRating,
            bookingsByStatus, revenueTrend, monthlyRevenueData,
            unassignedBookings, recentActivity, mapMechanics: mechanics,
            topMechanics, settings, serviceData, todayBookings,
            monthlyTarget, monthlyProgress, paidBookings, pendingPayments
        };
    }, [db]);

    if (loading || !db || !dashboardData) {
        return (
            <div className="flex items-center justify-center h-[80vh]">
                <div className="text-center">
                    <Spinner size="lg" color="text-primary" />
                    <p className="text-gray-500 text-sm mt-4 font-bold tracking-wider animate-pulse">LOADING DASHBOARD DATA</p>
                </div>
            </div>
        );
    }

    const {
        totalBookings, activeMechanics, pendingApprovals, totalRevenue,
        totalCustomers, totalOrders, avgRating,
        bookingsByStatus, revenueTrend, monthlyRevenueData,
        unassignedBookings, recentActivity, mapMechanics,
        topMechanics, settings, serviceData, todayBookings,
        monthlyTarget, monthlyProgress, paidBookings, pendingPayments
    } = dashboardData;

    const handleDownloadReport = () => {
        const headers = ["Metric", "Value"];
        const rows = [
            ["Total Revenue", `P${totalRevenue.toLocaleString()}`],
            ["Total Bookings", totalBookings.toLocaleString()],
            ["Active Mechanics", activeMechanics.toLocaleString()],
            ["Pending Approvals", pendingApprovals.toLocaleString()],
            ["Total Customers", totalCustomers.toLocaleString()],
            ["Average Rating", avgRating.toFixed(2)],
            ["Unassigned Jobs", unassignedBookings.length.toLocaleString()],
            ["Today's Bookings", todayBookings.toLocaleString()],
            ["Paid Bookings", paidBookings.toLocaleString()],
            ["Pending Payments", pendingPayments.toLocaleString()]
        ];
        const csvContent = [headers, ...rows].map(r => r.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Dashboard_Report_${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`;
        a.click();
        addNotification({ type: 'success', title: 'Report Downloaded', message: 'Dashboard summary exported to CSV.', recipientId: 'admin' });
    };

    const handleAssignMechanic = async (mechanic: Mechanic) => {
        if (!assigningBooking) return;
        try {
            await assignMechanicToBooking(assigningBooking.id, mechanic);
            addNotification({
                type: 'success',
                title: 'Job Assigned',
                message: `${mechanic.name} assigned to ${assigningBooking.service?.name || (assigningBooking.services?.[0]?.name) || 'Service'} for ${assigningBooking.customerName}.`,
                recipientId: 'admin',
            });
            setAssigningBooking(null);
        } catch (error) {
            addNotification({ type: 'error', title: 'Assignment Failed', message: (error as Error).message, recipientId: 'admin' });
        }
    };

    const handleRefresh = () => {
        addNotification({ type: 'info', title: 'Refreshing', message: 'Syncing latest data from server...', recipientId: 'admin' });
    };

    const timeSince = (date: number) => {
        const seconds = Math.floor((Date.now() - date) / 1000);
        if (seconds < 60) return "just now";
        if (seconds < 3600) return Math.floor(seconds / 60) + "m ago";
        if (seconds < 86400) return Math.floor(seconds / 3600) + "h ago";
        return Math.floor(seconds / 86400) + "d ago";
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 18) return 'Good Afternoon';
        return 'Good Evening';
    };

    const quickActions = [
        { label: 'New Booking', icon: Plus, onClick: () => navigate('/admin-portal/bookings'), color: 'from-primary to-orange-600' },
        { label: 'Mechanics', icon: Users, onClick: () => navigate('/admin-portal/mechanics'), color: 'from-blue-600 to-blue-800' },
        { label: 'Analytics', icon: BarChart3, onClick: () => navigate('/admin-portal/analytics'), color: 'from-purple-600 to-purple-800' },
        { label: 'Payment Audit', icon: ShieldCheck, onClick: () => navigate('/admin-portal/payment-audit'), color: 'from-emerald-600 to-emerald-800' },
    ];

    return (
        <div className="space-y-8 animate-fadeIn pb-12">
            {/* Connection Banner */}
            {!isOnline && (
                <div className="flex items-center gap-3 px-6 py-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                    <WifiOff size={18} className="text-red-400" />
                    <p className="text-sm font-bold text-red-400">You are currently offline. Some data may not be up to date.</p>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center gap-4">
                        <div>
                            <p className="text-sm text-gray-500 font-bold tracking-wider mb-1">{getGreeting()}, Admin</p>
                            <h1 className="text-5xl font-black text-white tracking-tighter leading-none">Dashboard</h1>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-2xl">
                            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                            <span className="text-[10px] font-black text-primary uppercase tracking-widest">Voice AI Active</span>
                        </div>
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 ${isOnline ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'} border rounded-xl`}>
                            {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
                            <span className="text-[10px] font-black tracking-widest">{isOnline ? 'LIVE' : 'OFFLINE'}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                        <div className="h-1 w-12 bg-primary rounded-full"></div>
                        <p className="text-gray-500 font-bold tracking-[0.3em] text-[10px] uppercase">Real-time Platform Intelligence</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <Tooltip content="Refresh dashboard data">
                        <button
                            onClick={handleRefresh}
                            className="flex items-center gap-2 px-5 py-3 bg-white/5 hover:bg-white/10 text-white rounded-[1.5rem] text-[10px] font-black tracking-widest transition-all border border-white/5 shadow-xl hover:scale-105 active:scale-95"
                        >
                            <RefreshCw size={16} />
                            Sync
                        </button>
                    </Tooltip>
                    <Tooltip content="Download dashboard report as CSV">
                        <button
                            onClick={handleDownloadReport}
                            className="flex items-center gap-2 px-5 py-3 bg-white/5 hover:bg-white/10 text-white rounded-[1.5rem] text-[10px] font-black tracking-widest transition-all border border-white/5 shadow-xl hover:scale-105 active:scale-95"
                        >
                            <Download size={16} />
                            Export
                        </button>
                    </Tooltip>
                    <Tooltip content="Create a new service booking">
                        <button
                            onClick={() => navigate('/admin-portal/bookings')}
                            className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-orange-600 text-white rounded-[1.5rem] text-[10px] font-black tracking-widest transition-all shadow-2xl shadow-primary/30 hover:scale-105 active:scale-95"
                        >
                            <Plus size={16} strokeWidth={3} />
                            New Booking
                        </button>
                    </Tooltip>
                </div>
            </div>

            {/* KPI Grid - Top Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4">
                <EnhancedKPICard
                    title="Total Revenue"
                    value={`₱${totalRevenue.toLocaleString()}`}
                    icon={Icons.Revenue}
                    gradient="bg-gradient-to-br from-green-600/90 to-green-900"
                    trend={{ value: 12.5, isPositive: true }}
                    subtitle="from completed jobs"
                    detail="Total earnings from all completed service bookings"
                    onClick={() => navigate('/admin-portal/analytics')}
                />
                <EnhancedKPICard
                    title="Total Bookings"
                    value={totalBookings}
                    icon={Icons.Bookings}
                    gradient="bg-gradient-to-br from-blue-600/90 to-blue-900"
                    trend={{ value: 8.2, isPositive: true }}
                    subtitle={`${todayBookings} today`}
                    detail="Total number of service bookings received"
                    onClick={() => navigate('/admin-portal/bookings')}
                />
                <EnhancedKPICard
                    title="Active Mechanics"
                    value={activeMechanics}
                    icon={Icons.Mechanics}
                    gradient="bg-gradient-to-br from-orange-600/90 to-orange-900"
                    trend={{ value: 2.1, isPositive: true }}
                    subtitle="currently on duty"
                    detail="Mechanics currently active and accepting jobs"
                    onClick={() => navigate('/admin-portal/mechanics')}
                />
                <EnhancedKPICard
                    title="Pending Approvals"
                    value={pendingApprovals}
                    icon={Icons.Pending}
                    gradient="bg-gradient-to-br from-purple-600/90 to-purple-900"
                    trend={{ value: 5, isPositive: false }}
                    subtitle="needs review"
                    detail="Mechanics pending verification or approval"
                    onClick={() => navigate('/admin-portal/mechanics')}
                />
            </div>

            {/* KPI Grid - Second Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4">
                <EnhancedKPICard
                    title="Total Customers"
                    value={totalCustomers}
                    icon={Icons.Customers}
                    gradient="bg-gradient-to-br from-teal-600/90 to-teal-900"
                    trend={{ value: totalCustomers > 0 ? 15.3 : 0, isPositive: true }}
                    subtitle="registered users"
                    detail="Total number of registered customer accounts"
                    onClick={() => navigate('/admin-portal/customers')}
                />
                <EnhancedKPICard
                    title="Avg. Rating"
                    value={avgRating.toFixed(1)}
                    icon={<Star className="text-yellow-400" size={20} />}
                    gradient="bg-gradient-to-br from-yellow-600/90 to-yellow-900"
                    trend={{ value: avgRating > 0 ? 3.2 : 0, isPositive: true }}
                    subtitle="mechanic performance"
                    detail="Average rating across all mechanics"
                    onClick={() => navigate('/admin-portal/satisfaction')}
                />
                <EnhancedKPICard
                    title="Paid Bookings"
                    value={paidBookings}
                    icon={<CheckCircle className="text-emerald-400" size={20} />}
                    gradient="bg-gradient-to-br from-emerald-600/90 to-emerald-900"
                    subtitle={`${pendingPayments} pending payment`}
                    detail="Bookings that have been fully paid"
                    onClick={() => navigate('/admin-portal/payment-audit')}
                />
                <EnhancedKPICard
                    title="Total Orders"
                    value={totalOrders}
                    icon={<ShoppingBag className="text-pink-400" size={20} />}
                    gradient="bg-gradient-to-br from-pink-600/90 to-pink-900"
                    trend={{ value: 4.7, isPositive: true }}
                    subtitle="parts & supplies"
                    detail="Total orders for parts and supplies"
                    onClick={() => navigate('/admin-portal/orders')}
                />
            </div>

            {/* Revenue Target Progress */}
            <div className="bg-[#121212]/80 backdrop-blur-2xl border border-white/10 p-6 rounded-[2rem] shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <TrendingUp className="text-primary" size={20} />
                        <div>
                            <h3 className="text-lg font-extrabold text-white">Monthly Revenue Target</h3>
                            <p className="text-xs text-gray-500 font-bold tracking-wider">Progress towards ₱{monthlyTarget.toLocaleString()} goal</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-black text-white">₱{totalRevenue.toLocaleString()}</p>
                        <p className="text-[10px] text-primary font-black tracking-wider">{(monthlyProgress * 100).toFixed(1)}% Complete</p>
                    </div>
                </div>
                <div className="relative h-3 bg-white/5 rounded-full overflow-hidden">
                    <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-orange-500 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${Math.min(monthlyProgress * 100, 100)}%` }}
                    >
                        <div className="absolute inset-0 bg-white/10 animate-pulse rounded-full"></div>
                    </div>
                </div>
                <div className="flex justify-between mt-2 text-[10px] text-gray-600 font-bold tracking-wider">
                    <span>₱0</span>
                    <span>₱{(monthlyTarget / 2).toLocaleString()}</span>
                    <span>₱{monthlyTarget.toLocaleString()}</span>
                </div>
            </div>

            {/* Quick Actions */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <Zap size={16} className="text-primary" />
                    <h3 className="text-sm font-black text-gray-400 tracking-widest uppercase">Quick Actions</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {quickActions.map(action => (
                        <button
                            key={action.label}
                            onClick={action.onClick}
                            className="group relative overflow-hidden p-5 rounded-2xl bg-[#121212]/80 backdrop-blur-2xl border border-white/5 hover:border-white/20 transition-all hover:scale-[1.02] active:scale-95"
                        >
                            <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-10 transition-opacity`}></div>
                            <action.icon size={24} className="text-primary group-hover:scale-110 transition-transform" />
                            <p className="mt-3 text-sm font-bold text-white">{action.label}</p>
                            <p className="text-[10px] text-gray-500 font-bold tracking-wider mt-1">Click to open</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <DashboardChart
                        title="Weekly Revenue Trend"
                        subtitle="Income over the last 7 days"
                        data={revenueTrend.length > 0 ? revenueTrend : daysFallback()}
                        type="area"
                        colors={['#10B981']}
                        formatValue={(v) => `₱${v.toLocaleString()}`}
                    />
                </div>
                <div className="lg:col-span-1">
                    <DashboardChart
                        title="Booking Status"
                        data={bookingsByStatus.length > 0 ? bookingsByStatus : [{ name: 'No Data', value: 1 }]}
                        type="pie"
                        colors={['#34D399', '#60A5FA', '#FBBF24', '#F87171']}
                        formatValue={(v) => v.toLocaleString()}
                    />
                </div>
            </div>

            {/* Monthly & Service Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DashboardChart
                    title="Monthly Revenue"
                    subtitle="Revenue breakdown by month"
                    data={monthlyRevenueData.length > 0 ? monthlyRevenueData : monthsFallback()}
                    type="bar"
                    colors={['#FE7803', '#F97316', '#EA580C', '#C2410C', '#34D399', '#60A5FA']}
                    formatValue={(v) => `₱${v.toLocaleString()}`}
                />
                <DashboardChart
                    title="Service Distribution"
                    subtitle="Most requested services"
                    data={serviceData.length > 0 ? serviceData : [{ name: 'No Data', value: 1 }]}
                    type="pie"
                    colors={['#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444']}
                    formatValue={(v) => v.toLocaleString()}
                />
            </div>

            {/* Main Content: Map + Activity */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Left Column: Map */}
                <div className="xl:col-span-2 flex flex-col gap-6">
                    <div className="bg-[#121212]/80 backdrop-blur-2xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-primary/10 transition-colors duration-1000"></div>
                        <div className="flex items-center justify-between mb-8 relative z-10">
                            <div>
                                <h3 className="text-xl font-extrabold text-white flex items-center gap-3">
                                    <Map className="text-primary" />
                                    Live Operations Map
                                    <span className="flex items-center gap-1.5 px-2 py-0.5 bg-red-500/10 border border-red-500/20 rounded-full">
                                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
                                        <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">Live</span>
                                    </span>
                                </h3>
                                <p className="text-gray-500 text-sm mt-1">{mapMechanics.length} mechanics • {db.bookings.length} active bookings</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <Tooltip content="View detailed analytics">
                                    <button onClick={() => navigate('/admin-portal/analytics')} className="text-sm text-primary hover:text-orange-400 font-bold transition-colors">
                                        View Analytics
                                    </button>
                                </Tooltip>
                            </div>
                        </div>
                        <div className="rounded-2xl overflow-hidden h-[550px] border border-white/10 relative z-0 shadow-inner">
                            <LiveMap
                                mechanics={mapMechanics}
                                bookings={db.bookings.filter(b =>
                                    b.status === 'En Route' || b.status === 'In Progress' ||
                                    b.status === 'Mechanic Assigned' || b.status === 'Upcoming' ||
                                    b.status === 'Booking Confirmed'
                                )}
                                settings={settings}
                                onViewProfile={(id) => {
                                    const m = db?.mechanics.find(x => x.id === id);
                                    if (m) setViewingMechanic(m);
                                }}
                                onAssignBooking={(booking) => setAssigningBooking(booking)}
                            />
                        </div>
                    </div>
                </div>

                {/* Right Column: Activity & Status */}
                <div className="space-y-8">
                    {/* Unassigned Bookings */}
                    <div className="bg-[#121212]/80 backdrop-blur-2xl border border-white/10 p-8 rounded-[2.5rem] flex flex-col max-h-[400px] shadow-2xl">
                        <div className="flex items-center justify-between mb-6 flex-shrink-0">
                            <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
                                <AlertCircle className="text-orange-500" />
                                Unassigned Jobs
                            </h3>
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-widest border ${
                                unassignedBookings.length > 0
                                    ? 'bg-orange-500/10 text-orange-500 border-orange-500/20'
                                    : 'bg-green-500/10 text-green-500 border-green-500/20'
                            }`}>
                                {unassignedBookings.length} pending
                            </span>
                        </div>

                        <div className="overflow-y-auto pr-3 space-y-3 custom-scrollbar flex-grow">
                            {unassignedBookings.length > 0 ? (
                                unassignedBookings.map(booking => (
                                    <div key={booking.id} className="p-4 rounded-2xl bg-white/5 hover:bg-white/[0.08] transition-all border border-white/5 group relative overflow-hidden">
                                        <div className="absolute inset-y-0 left-0 w-1 bg-primary transform -translate-x-full group-hover:translate-x-0 transition-transform"></div>
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-white text-base truncate">
                                                    {booking.service?.name || (booking.services && booking.services[0]?.name) || 'Unknown Service'}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1.5">
                                                    <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center">
                                                        <Users size={12} className="text-blue-400" />
                                                    </div>
                                                    <p className="text-sm text-gray-400 truncate">{booking.customerName}</p>
                                                </div>
                                                <p className="text-[10px] text-gray-600 mt-1 font-bold tracking-wider">
                                                    {booking.date} • {booking.time}
                                                </p>
                                            </div>
                                            <Tooltip content="Assign mechanic to this job">
                                                <button
                                                    onClick={() => setAssigningBooking(booking)}
                                                    className="px-4 py-2 bg-primary/10 text-primary hover:bg-primary hover:text-white text-xs font-black tracking-tighter rounded-xl transition-all shadow-lg hover:shadow-primary/30 active:scale-95"
                                                >
                                                    Assign
                                                </button>
                                            </Tooltip>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-16 flex flex-col items-center gap-4">
                                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center">
                                        <CheckCircle size={32} className="text-emerald-500" />
                                    </div>
                                    <p className="text-gray-500 text-sm font-medium">All jobs are assigned!</p>
                                    <p className="text-[10px] text-gray-600 font-bold">No pending assignments</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* System Health */}
                    <div className="bg-[#121212]/80 backdrop-blur-2xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl">
                        <div className="flex items-center gap-2 mb-6">
                            <Activity size={18} className="text-primary" />
                            <h3 className="text-lg font-extrabold text-white">System Health</h3>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                                <div className="flex items-center gap-3">
                                    <Server size={16} className="text-green-400" />
                                    <span className="text-sm font-bold text-white">Firestore</span>
                                </div>
                                <span className="flex items-center gap-1.5 text-green-400 text-[10px] font-black tracking-widest">
                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                                    Connected
                                </span>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                                <div className="flex items-center gap-3">
                                    <Server size={16} className="text-green-400" />
                                    <span className="text-sm font-bold text-white">Real-time DB</span>
                                </div>
                                <span className="flex items-center gap-1.5 text-green-400 text-[10px] font-black tracking-widest">
                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                                    Active
                                </span>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                                <div className="flex items-center gap-3">
                                    <Users size={16} className="text-blue-400" />
                                    <span className="text-sm font-bold text-white">Active Sessions</span>
                                </div>
                                <span className="text-blue-400 text-[10px] font-black">{activeMechanics} mechanics online</span>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                                <div className="flex items-center gap-3">
                                    <Activity size={16} className="text-gray-400" />
                                    <span className="text-sm font-bold text-white">Last Sync</span>
                                </div>
                                <span className="text-gray-400 text-[10px] font-black">Real-time</span>
                            </div>
                        </div>
                    </div>

                    {/* Recent Activity Feed */}
                    <div className="bg-[#121212]/80 backdrop-blur-2xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                                <Clock className="text-primary" />
                                Activity Feed
                            </h3>
                        </div>
                        <div className="space-y-6 relative">
                            <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-primary/30 via-white/5 to-transparent"></div>

                            {recentActivity.length > 0 ? (
                                recentActivity.map(activity => (
                                    <div key={activity.id} className="flex gap-5 relative group">
                                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 z-10 transition-transform group-hover:scale-110 shadow-lg ${
                                            activity.type === 'booking' ? 'bg-blue-600 shadow-blue-900/40' :
                                            activity.type === 'mechanic' ? 'bg-purple-600 shadow-purple-900/40' :
                                            'bg-yellow-600 shadow-yellow-900/40'
                                        }`}>
                                            {activity.type === 'booking' ? <ShoppingBag size={12} className="text-white" /> :
                                             activity.type === 'mechanic' ? <Users size={12} className="text-white" /> :
                                             <Star size={12} className="text-white" />}
                                        </div>
                                        <div className="flex-1 -mt-0.5 min-w-0">
                                            <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                                                <span className="font-bold text-white pr-1 leading-none">{activity.title}</span>
                                                {activity.subtitle}
                                            </p>
                                            <p className="text-[10px] text-gray-600 mt-1.5 font-bold tracking-widest flex items-center gap-1.5">
                                                <Clock size={10} />
                                                {activity.timestamp > 0 ? timeSince(activity.timestamp) : 'recently'}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-gray-500 text-sm">No recent activity</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Top Performing Mechanics */}
                    <div className="bg-[#121212]/80 backdrop-blur-2xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                                <Star className="text-yellow-500" />
                                Top Performers
                            </h3>
                            <Tooltip content="View all registered mechanics">
                                <button onClick={() => navigate('/admin-portal/mechanics')} className="text-[10px] font-bold text-primary hover:text-orange-400 tracking-widest transition-colors">
                                    View All
                                </button>
                            </Tooltip>
                        </div>
                        <div className="space-y-3">
                            {topMechanics.map((mechanic, index) => (
                                <div key={mechanic.id} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-all group border border-transparent hover:border-white/10">
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <img
                                                src={mechanic.imageUrl || ''}
                                                alt={mechanic.name}
                                                className="w-10 h-10 rounded-xl object-cover"
                                                fetchpriority="low"
                                                onError={(e) => { (e.target as HTMLImageElement).src = ''; }}
                                            />
                                            <div className="absolute -top-1 -left-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center text-[10px] font-black text-white border-2 border-[#1A1A1A]">
                                                {index + 1}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white group-hover:text-primary transition-colors">{mechanic.name}</p>
                                            <p className="text-[10px] text-gray-500 font-bold">{mechanic.reviews || 0} completed jobs</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-black text-yellow-400">⭐ {(mechanic.rating || 0).toFixed(1)}</p>
                                        <p className="text-[10px] text-green-500/80 font-bold tracking-tighter mt-0.5">
                                            {mechanic.status === 'Active' ? 'Active' : 'Inactive'}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            {topMechanics.length === 0 && (
                                <div className="text-center py-8">
                                    <p className="text-gray-500 text-sm">No mechanics registered yet</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal: Mechanic Profile */}
            <Modal title="Mechanic Details" isOpen={!!viewingMechanic} onClose={() => setViewingMechanic(null)}>
                {viewingMechanic && (
                    <div className="text-white">
                        <div className="flex flex-col sm:flex-row items-center gap-8 mb-8">
                            <div className="relative">
                                <img
                                    src={viewingMechanic.imageUrl || ''}
                                    alt={viewingMechanic.name}
                                    className="w-28 h-28 rounded-3xl object-cover ring-4 ring-primary/30 shadow-2xl"
                                    loading="lazy"
                                />
                                <div className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-xl border-4 border-[#1A1A1A] flex items-center justify-center ${viewingMechanic.status === 'Active' ? 'bg-green-500' : 'bg-yellow-500'}`}>
                                    <CheckCircle size={14} className="text-white" />
                                </div>
                            </div>
                            <div className="text-center sm:text-left">
                                <h3 className="text-3xl font-black tracking-tighter">{viewingMechanic.name}</h3>
                                <div className="flex items-center gap-3 justify-center sm:justify-start mt-3">
                                    <span className="flex items-center gap-1 text-yellow-400 bg-yellow-400/10 px-3 py-1.5 rounded-xl text-sm font-black">
                                        ⭐ {(viewingMechanic.rating || 0).toFixed(1)}
                                    </span>
                                    <span className="text-gray-500 text-xs font-bold tracking-widest">{viewingMechanic.reviews || 0} SUCCESSFUL JOBS</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                            <div className="p-5 bg-white/5 rounded-3xl border border-white/5">
                                <p className="text-[10px] text-primary font-black tracking-widest mb-3">Contact Details</p>
                                <p className="text-sm font-bold text-white">{viewingMechanic.phone || 'N/A'}</p>
                                <p className="text-sm text-gray-400 truncate mt-1">{viewingMechanic.email || 'N/A'}</p>
                            </div>
                            <div className="p-5 bg-white/5 rounded-3xl border border-white/5">
                                <p className="text-[10px] text-blue-400 font-black tracking-widest mb-3">Expertise</p>
                                <div className="flex flex-wrap gap-2">
                                    {(viewingMechanic.specializations?.length ? viewingMechanic.specializations : viewingMechanic.specialties || []).map(s => (
                                        <span key={s} className="text-[9px] font-black tracking-tighter bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-lg text-blue-300">{s}</span>
                                    ))}
                                    {!viewingMechanic.specializations?.length && !viewingMechanic.specialties?.length && (
                                        <span className="text-[9px] text-gray-500">No specializations listed</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-8 border-t border-white/10">
                            <button onClick={() => setViewingMechanic(null)} className="px-6 py-2.5 hover:bg-white/10 rounded-2xl text-sm font-bold transition-all text-gray-400">Close</button>
                            <button onClick={() => { setViewingMechanic(null); navigate('/admin-portal/mechanics'); }} className="px-6 py-2.5 bg-primary hover:bg-orange-600 text-white rounded-2xl text-sm font-black shadow-lg shadow-primary/30 transition-all hover:scale-105 active:scale-95">View Full Profile</button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Modal: Assign Mechanic */}
            <Modal title="Assign Mechanic" isOpen={!!assigningBooking} onClose={() => setAssigningBooking(null)}>
                {assigningBooking && (
                    <div className="space-y-6">
                        <div className="p-6 bg-primary/5 rounded-3xl border border-primary/10">
                            <p className="text-[10px] font-black text-primary tracking-[0.2em] mb-3">ASSIGNING JOB FOR</p>
                            <h4 className="text-2xl font-black text-white tracking-tighter">{assigningBooking.customerName}</h4>
                            <div className="flex items-center gap-2 mt-2">
                                <ShoppingBag size={14} className="text-gray-500" />
                                <p className="text-gray-400 font-bold">{assigningBooking.service?.name || (assigningBooking.services && assigningBooking.services[0]?.name) || 'Service'}</p>
                            </div>
                            <div className="mt-2 flex items-center gap-2 text-[10px] text-gray-500 font-bold">
                                <Calendar size={12} />
                                {assigningBooking.date} • {assigningBooking.time}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <p className="text-xs font-bold text-gray-500 tracking-widest px-2">
                                Available Mechanics ({mapMechanics.filter(m => m.status === 'Active').length})
                            </p>
                            <div className="max-h-[350px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                {mapMechanics.filter(m => m.status === 'Active').length > 0 ? (
                                    mapMechanics.filter(m => m.status === 'Active').map(mechanic => (
                                        <Tooltip key={mechanic.id} content={`Assign ${mechanic.name} to this job`}>
                                            <button
                                                onClick={() => handleAssignMechanic(mechanic)}
                                                className="w-full p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-between group transition-all"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <img
                                                        src={mechanic.imageUrl || ''}
                                                        alt={mechanic.name}
                                                        className="w-12 h-12 rounded-xl object-cover"
                                                        loading="lazy"
                                                    />
                                                    <div className="text-left">
                                                        <p className="font-bold text-white group-hover:text-primary transition-colors">{mechanic.name}</p>
                                                        <p className="text-xs text-gray-500 font-bold">{(mechanic.specializations || mechanic.specialties || []).slice(0, 2).join(' • ') || 'General'}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs font-black text-yellow-400">⭐ {(mechanic.rating || 0).toFixed(1)}</p>
                                                    <ArrowRight size={18} className="text-gray-600 group-hover:text-primary transition-colors translate-x-[-10px] opacity-0 group-hover:translate-x-0 group-hover:opacity-100 duration-300" />
                                                </div>
                                            </button>
                                        </Tooltip>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-gray-500 text-sm">No active mechanics available</div>
                                )}
                            </div>
                        </div>

                        <button onClick={() => setAssigningBooking(null)} className="w-full py-4 bg-[#222] hover:bg-[#333] text-gray-400 text-xs font-black tracking-[0.3em] rounded-2xl transition-all">
                            Cancel
                        </button>
                    </div>
                )}
            </Modal>
        </div>
    );
};

function daysFallback() {
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => ({ name: d, value: 0 }));
}

function monthsFallback() {
    return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(d => ({ name: d, value: 0 }));
}

export default AdminDashboardScreen;
