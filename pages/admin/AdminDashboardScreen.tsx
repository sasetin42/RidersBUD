import React, { useMemo, useState, useEffect } from 'react';
import { Booking, Mechanic } from '../../types';
import LiveMap from '../../components/admin/LiveMap';
import { useDatabase } from '../../context/DatabaseContext';
import Spinner from '../../components/Spinner';
import Modal from '../../components/admin/Modal';
import { useNavigate } from 'react-router-dom';
import EnhancedKPICard from '../../components/admin/EnhancedKPICard';
import DashboardChart from '../../components/admin/DashboardCharts';
import { useNotification } from '../../context/NotificationContext';
import { Download, Plus, Clock, Users, ArrowRight, CheckCircle, AlertCircle, ShoppingBag, Map } from 'lucide-react';
import Tooltip from '../../components/ui/Tooltip';

// Icons
const Icons = {
    Revenue: <DollarIcon />,
    Bookings: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>,
    Mechanics: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
    Pending: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
};

function DollarIcon() {
    return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}

const AdminDashboardScreen: React.FC = () => {
    const { db, loading, updateBookingStatus, assignMechanicToBooking } = useDatabase();
    const { addNotification } = useNotification();
    const navigate = useNavigate();

    // UI States
    const [viewingMechanic, setViewingMechanic] = useState<Mechanic | null>(null);
    const [assigningBooking, setAssigningBooking] = useState<Booking | null>(null);
    const [isNewBookingModalOpen, setIsNewBookingModalOpen] = useState(false);
    
    // Premium Voice Dispatch System
    const prevBookingsCount = React.useRef(db?.bookings.length || 0);
    useEffect(() => {
        if (db && db.bookings.length > prevBookingsCount.current) {
            const newBooking = db.bookings[db.bookings.length - 1];

            // --- Play a premium dispatch ping via Web Audio API ---
            const playDispatchPing = (): Promise<void> => {
                return new Promise(resolve => {
                    try {
                        const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext);
                        if (!AudioCtx) { resolve(); return; }
                        const ctx = new AudioCtx();

                        // Tri-tone ascending ping (professional dispatch sound)
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

                        // Resolve after pings finish so speech starts cleanly
                        setTimeout(resolve, tones.length * 150 + 400);
                    } catch (e) {
                        resolve();
                    }
                });
            };

            // --- Select the best available voice ---
            const selectPremiumVoice = (): SpeechSynthesisVoice | null => {
                const voices = window.speechSynthesis.getVoices();
                const preferred = [
                    'Google US English', 'Microsoft Aria Online (Natural)', 'Microsoft Aria',
                    'Microsoft David Online (Natural)', 'Samantha', 'Karen'
                ];
                for (const name of preferred) {
                    const v = voices.find(v => v.name === name);
                    if (v) return v;
                }
                return voices.find(v => v.lang?.startsWith('en') && !v.name.toLowerCase().includes('zira')) || voices[0] || null;
            };

            // --- Premium Dispatch Announcement ---
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
                    `Requested service: ${newBooking.service.name}${price ? ', ' + price : ''}.`,
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

                // Voices may not be loaded yet — retry if needed
                if (window.speechSynthesis.getVoices().length === 0) {
                    window.speechSynthesis.onvoiceschanged = () => {
                        window.speechSynthesis.onvoiceschanged = null;
                        assignVoice();
                    };
                } else {
                    assignVoice();
                }
            };

            // Sequence: ping → then speak
            playDispatchPing().then(speakNewBooking);

            addNotification({
                type: 'info',
                title: '📢 Live Dispatch Alert',
                message: `Voice announcement broadcast for ${newBooking.customerName} — ${newBooking.service.name}.`,
                recipientId: 'admin',
            });
        }
        prevBookingsCount.current = db?.bookings.length || 0;
    }, [db?.bookings, addNotification]);

    const [lastUpdated, setLastUpdated] = useState(Date.now());

    // --- Data Aggregation ---
    const dashboardData = useMemo(() => {
        if (!db) return null;
        const { bookings, mechanics, settings } = db;

        // KPI Trends (Mocked logic based on counts for now, could be historical)
        const totalBookings = bookings.length;
        const activeMechanics = mechanics.filter(m => m.status === 'Active').length;
        const pendingApprovals = mechanics.filter(m => m.status === 'Pending').length;
        const totalRevenue = bookings.filter(b => b.status === "Completed").reduce((acc, curr) => {
            const price = curr.totalPrice || curr.service?.price || (curr.services && curr.services[0]?.price) || 1500;
            return acc + price;
        }, 0);

        // Revenue Trend (Last 7 Days)
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const revenueByDay: Record<string, number> = {};
        days.forEach(d => revenueByDay[d] = 0);

        bookings.filter(b => b.status === 'Completed').forEach(b => {
            const dayName = days[new Date(b.date).getDay()];
            const price = b.totalPrice || b.service?.price || (b.services && b.services[0]?.price) || 1500;
            revenueByDay[dayName] += price;
        });
        const revenueTrend = Object.entries(revenueByDay).map(([name, value]) => ({ name, value }));

        // Bookings by Status
        const bookingsByStatus = [
            { name: 'Completed', value: bookings.filter(b => b.status === 'Completed').length },
            { name: 'Upcoming', value: bookings.filter(b => b.status === 'Upcoming').length },
            { name: 'Cancelled', value: bookings.filter(b => b.status === 'Cancelled').length },
            { name: 'In Progress', value: bookings.filter(b => b.status === 'In Progress' || b.status === 'En Route').length },
        ].filter(d => d.value > 0);

        // Unassigned Bookings
        const unassignedBookings = bookings.filter(b => b.status === 'Upcoming' && !b.mechanic);

        // Recent Activity (Enhanced with variety)
        const recentActivity = [
            ...bookings.map(b => ({
                id: `b-${b.id}`,
                timestamp: new Date(b.date + ' ' + (b.time.includes('AM') || b.time.includes('PM') ? '12:00' : b.time)).getTime(),
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
            }))
        ].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);

        // Top Performing Mechanics
        const topMechanics = [...mechanics]
            .sort((a, b) => b.rating - a.rating || b.reviews - a.reviews)
            .slice(0, 5);

        return {
            totalBookings,
            activeMechanics,
            pendingApprovals,
            totalRevenue,
            bookingsByStatus,
            revenueTrend,
            unassignedBookings,
            recentActivity,
            mapMechanics: mechanics,
            topMechanics,
            settings
        };
    }, [db]);

    if (loading || !db || !dashboardData) {
        return <div className="flex items-center justify-center h-full"><Spinner size="lg" color="text-white" /></div>
    }

    const {
        totalBookings, activeMechanics, pendingApprovals, totalRevenue,
        bookingsByStatus, revenueTrend, unassignedBookings,
        recentActivity, mapMechanics, topMechanics, settings
    } = dashboardData;

    // --- Actions ---
    const handleDownloadReport = () => {
        const headers = ["Metric", "Value"];
        const rows = [
            ["Total Revenue", `P${totalRevenue}`],
            ["Total Bookings", totalBookings],
            ["Active Mechanics", activeMechanics],
            ["Pending Approvals", pendingApprovals],
            ["Unassigned Jobs", unassignedBookings.length]
        ];
        const csvContent = [headers, ...rows].map(r => r.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Dashboard_Report_${new Date().toLocaleDateString()}.csv`;
        a.click();
        addNotification({ type: 'success', title: 'Report Downloaded', message: 'The dashboard summary has been exported.', recipientId: 'admin' });
    };

    const handleAssignMechanic = async (mechanic: Mechanic) => {
        if (!assigningBooking) return;
        try {
            await assignMechanicToBooking(assigningBooking.id, mechanic);
            addNotification({
                type: 'success',
                title: 'Job Assigned',
                message: `${mechanic.name} has been assigned to ${assigningBooking.service.name} for ${assigningBooking.customerName}.`,
                recipientId: 'admin',
            });
            setAssigningBooking(null);
        } catch (error) {
            addNotification({ type: 'error', title: 'Assignment Failed', message: (error as Error).message, recipientId: 'admin' });
        }
    };

    const handleClearActivity = () => {
        addNotification({
            type: 'info',
            title: 'Activity Feed',
            message: 'Activity clearing is restricted to system maintenance cycles.',
            recipientId: 'admin',
        });
    };

    const handleViewHeatmap = () => {
        addNotification({
            type: 'info',
            title: 'Live Heatmap',
            message: 'Generating regional demand coverage report...',
            recipientId: 'admin',
        });
        setTimeout(() => {
            navigate('/admin/analytics');
        }, 1000);
    };

    const timeSince = (date: number) => {
        const seconds = Math.floor((Date.now() - date) / 1000);
        if (seconds < 60) return "just now";
        if (seconds < 3600) return Math.floor(seconds / 60) + "m ago";
        if (seconds < 86400) return Math.floor(seconds / 3600) + "h ago";
        return Math.floor(seconds / 86400) + "d ago";
    };

    return (
        <div className="space-y-8 animate-fadeIn pb-12">
            {/* Header / Welcome */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center gap-4">
                        <h1 className="text-5xl font-black text-white tracking-tighter leading-none">Dashboard Overview</h1>
                        <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-2xl voice-indicator-active group">
                            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                            <span className="text-[10px] font-black text-primary uppercase tracking-widest">Voice Intelligence Active</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                        <div className="h-1 w-12 bg-primary rounded-full"></div>
                        <p className="text-gray-500 font-bold tracking-[0.3em] text-[10px]">Realtime Platform Intelligence</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <Tooltip content="Download dashboard report as CSV" position="top">
                        <button
                            onClick={handleDownloadReport}
                            className="flex items-center gap-2 px-6 py-4 bg-white/5 hover:bg-white/10 text-white rounded-[1.5rem] text-[10px] font-black  tracking-widest transition-all border border-white/5 shadow-xl hover:scale-105 active:scale-95"
                        >
                            <Download size={18} />
                            Download Report
                        </button>
                    </Tooltip>
                    <Tooltip content="Create a new service booking" position="top">
                        <button
                            onClick={() => navigate('/admin/bookings')}
                            className="flex items-center gap-2 px-8 py-4 bg-primary hover:bg-orange-600 text-white rounded-[1.5rem] text-[10px] font-black  tracking-widest transition-all shadow-2xl shadow-primary/30 hover:scale-105 active:scale-95"
                        >
                            <Plus size={18} strokeWidth={3} />
                            New Booking
                        </button>
                    </Tooltip>
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Tooltip content="Total revenue from completed bookings" position="top">
                    <EnhancedKPICard
                        title="Total Revenue"
                        value={`₱${totalRevenue.toLocaleString()}`}
                        icon={Icons.Revenue}
                        gradient="bg-gradient-to-br from-green-600/90 to-green-900"
                        trend={{ value: 12.5, isPositive: true }}
                        subtitle="vs last week"
                    />
                </Tooltip>
                <Tooltip content="Total number of bookings received" position="top">
                    <EnhancedKPICard
                        title="Total Bookings"
                        value={totalBookings.toLocaleString()}
                        icon={Icons.Bookings}
                        gradient="bg-gradient-to-br from-blue-600/90 to-blue-900"
                        trend={{ value: 8.2, isPositive: true }}
                        subtitle="vs last week"
                    />
                </Tooltip>
                <Tooltip content="Mechanics currently active on duty" position="top">
                    <EnhancedKPICard
                        title="Active Mechanics"
                        value={activeMechanics.toLocaleString()}
                        icon={Icons.Mechanics}
                        gradient="bg-gradient-to-br from-orange-600/90 to-orange-900"
                        trend={{ value: 2.1, isPositive: true }}
                        subtitle="vs last week"
                    />
                </Tooltip>
                <Tooltip content="Mechanics pending approval review" position="top">
                    <EnhancedKPICard
                        title="Pending Approvals"
                        value={pendingApprovals.toLocaleString()}
                        icon={Icons.Pending}
                        gradient="bg-gradient-to-br from-purple-600/90 to-purple-900"
                        trend={{ value: 5, isPositive: false }}
                        subtitle="needs review"
                    />
                </Tooltip>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[450px]">
                <div className="lg:col-span-2 flex flex-col">
                    <DashboardChart
                        title="Revenue Performance"
                        subtitle="Income generated over the last 7 days"
                        data={revenueTrend}
                        type="area"
                        colors={['#10B981']}
                    />
                </div>
                <div className="lg:col-span-1 flex flex-col">
                    <DashboardChart
                        title="Booking Status Heatmap"
                        data={bookingsByStatus}
                        type="pie"
                        colors={['#34D399', '#60A5FA', '#F87171', '#FBBF24']}
                    />
                </div>
            </div>

            {/* Main Content Grid: Map + Side Panels */}
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
                                <p className="text-gray-500 text-sm mt-1">Realtime mechanic tracking and coverage area.</p>
                            </div>
                            <Tooltip content="View regional demand heatmap" position="top">
                                <button
                                    onClick={handleViewHeatmap}
                                    className="text-sm text-primary hover:text-orange-400 font-bold transition-colors"
                                >
                                    View Regional Heatmap
                                </button>
                            </Tooltip>
                        </div>
                        <div className="rounded-2xl overflow-hidden h-[550px] border border-white/10 relative z-0 shadow-inner">
                            <LiveMap
                                mechanics={mapMechanics}
                                bookings={db.bookings.filter(b => b.status === 'En Route' || b.status === 'In Progress')}
                                settings={settings}
                                onViewProfile={(id) => {
                                    const m = db?.mechanics.find(x => x.id === id);
                                    if (m) setViewingMechanic(m);
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Right Column: Activity & Unassigned */}
                <div className="space-y-8">

                    {/* Unassigned Bookings */}
                    <div className="bg-[#121212]/80 backdrop-blur-2xl border border-white/10 p-8 rounded-[2.5rem] flex flex-col max-h-[450px] shadow-2xl">
                        <div className="flex items-center justify-between mb-6 flex-shrink-0">
                            <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
                                <AlertCircle className="text-orange-500" />
                                Unassigned Jobs
                            </h3>
                            <span className="bg-orange-500/10 text-orange-500 text-[10px] font-black  tracking-widest px-2.5 py-1 rounded-full border border-orange-500/20">{unassignedBookings.length} pending</span>
                        </div>

                        <div className="overflow-y-auto pr-3 space-y-4 custom-scrollbar flex-grow">
                            {unassignedBookings.length > 0 ? (
                                unassignedBookings.map(booking => (
                                    <div key={booking.id} className="p-4 rounded-2xl bg-white/5 hover:bg-white/[0.08] transition-all border border-white/5 group relative overflow-hidden">
                                        <div className="absolute inset-y-0 left-0 w-1 bg-primary transform -translate-x-full group-hover:translate-x-0 transition-transform"></div>
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-white text-base truncate">{booking.service?.name || (booking.services && booking.services[0]?.name) || 'Unknown Service'}</p>
                                                <div className="flex items-center gap-2 mt-1.5">
                                                    <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center">
                                                        <Users size={12} className="text-blue-400" />
                                                    </div>
                                                    <p className="text-sm text-gray-400 truncate">{booking.customerName}</p>
                                                </div>
                                            </div>
                                            <Tooltip content="Assign mechanic to this job" position="top">
                                            <button
                                                onClick={() => setAssigningBooking(booking)}
                                                className="px-4 py-2 bg-primary/10 text-primary hover:bg-primary hover:text-white text-xs font-black  tracking-tighter rounded-xl transition-all shadow-lg hover:shadow-primary/30 active:scale-95"
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
                                        <CheckCircle size={32} className="text-gray-700" />
                                    </div>
                                    <p className="text-gray-500 text-sm font-medium">All jobs are currently assigned.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Recent Activity Feed */}
                    <div className="bg-[#121212]/80 backdrop-blur-2xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
                                <Clock className="text-primary" />
                                Activity Feed
                            </h3>
                            <Tooltip content="Clear activity feed entries" position="top">
                                <button
                                    onClick={handleClearActivity}
                                    className="text-[10px] font-bold text-gray-500 hover:text-white  tracking-widest transition-colors"
                                >
                                    Clear
                                </button>
                            </Tooltip>
                        </div>
                        <div className="space-y-8 relative">
                            {/* Timeline Line */}
                            <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-primary/30 via-white/5 to-transparent"></div>

                            {recentActivity.map(activity => (
                                <div key={activity.id} className="flex gap-5 relative group">
                                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 z-10 transition-transform group-hover:scale-110 shadow-lg ${activity.type === 'booking' ? 'bg-blue-600 shadow-blue-900/40' : 'bg-purple-600 shadow-purple-900/40'
                                        }`}>
                                        {activity.type === 'booking' ? <ShoppingBag size={12} className="text-white" /> : <Users size={12} className="text-white" />}
                                    </div>
                                    <div className="flex-1 -mt-0.5 min-w-0">
                                        <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                                            <span className="font-bold text-white pr-1 leading-none">{activity.title}</span>
                                            {activity.subtitle}
                                        </p>
                                        <p className="text-[10px] text-gray-600 mt-1.5 font-bold  tracking-widest flex items-center gap-1.5 ">
                                            <Clock size={10} />
                                            {timeSince(activity.timestamp)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Top Performing Mechanics Section */}
                    <div className="bg-[#121212]/80 backdrop-blur-2xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
                                <CheckCircle className="text-green-500" />
                                Top Performers
                            </h3>
                            <Tooltip content="View all registered mechanics" position="top">
                                <button
                                    onClick={() => navigate('/admin/mechanics')}
                                    className="text-[10px] font-bold text-primary hover:text-orange-400  tracking-widest transition-colors"
                                >
                                    View All
                                </button>
                            </Tooltip>
                        </div>
                        <div className="space-y-4">
                            {topMechanics.map((mechanic, index) => (
                                <div key={mechanic.id} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-all group border border-transparent hover:border-white/10">
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <img src={mechanic.imageUrl} alt={mechanic.name} className="w-10 h-10 rounded-xl object-cover" loading="lazy" />
                                            <div className="absolute -top-1 -left-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center text-[10px] font-black text-white border-2 border-[#1A1A1A]">
                                                {index + 1}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white group-hover:text-primary transition-colors">{mechanic.name}</p>
                                            <p className="text-[10px] text-gray-500 font-bold ">{mechanic.reviews} Completed Jobs</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-black text-primary">⭐ {mechanic.rating.toFixed(1)}</p>
                                        <p className="text-[10px] text-green-500/80 font-bold  tracking-tighter mt-0.5">Highly Active</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal for Mechanic Profile */}
            <Modal title="Mechanic Details" isOpen={!!viewingMechanic} onClose={() => setViewingMechanic(null)}>
                {viewingMechanic && (
                    <div className="text-white">
                        <div className="flex flex-col sm:flex-row items-center gap-8 mb-8">
                            <div className="relative">
                                <img src={viewingMechanic.imageUrl} alt={viewingMechanic.name} className="w-28 h-28 rounded-3xl object-cover ring-4 ring-primary/30 shadow-2xl" loading="lazy" />
                                <div className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-xl border-4 border-[#1A1A1A] flex items-center justify-center ${viewingMechanic.status === 'Active' ? 'bg-green-500' : 'bg-yellow-500'}`}>
                                    <CheckCircle size={14} className="text-white" />
                                </div>
                            </div>
                            <div className="text-center sm:text-left">
                                <h3 className="text-3xl font-black tracking-tighter">{viewingMechanic.name}</h3>
                                <div className="flex items-center gap-3 justify-center sm:justify-start mt-3">
                                    <span className="flex items-center gap-1 text-yellow-400 bg-yellow-400/10 px-3 py-1.5 rounded-xl text-sm font-black">
                                        ⭐ {viewingMechanic.rating.toFixed(1)}
                                    </span>
                                    <span className="text-gray-500 text-xs font-bold  tracking-widest">{viewingMechanic.reviews} SUCCESSFUL JOBS</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                            <div className="p-5 bg-white/5 rounded-3xl border border-white/5">
                                <p className="text-[10px] text-primary font-black  tracking-widest mb-3">Contact Details</p>
                                <p className="text-sm font-bold text-white">{viewingMechanic.phone}</p>
                                <p className="text-sm text-gray-400 truncate mt-1">{viewingMechanic.email}</p>
                            </div>
                            <div className="p-5 bg-white/5 rounded-3xl border border-white/5">
                                <p className="text-[10px] text-blue-400 font-black  tracking-widest mb-3">Expertise</p>
                                <div className="flex flex-wrap gap-2">
                                    {viewingMechanic.specializations.map(s => (
                                        <span key={s} className="text-[9px] font-black  tracking-tighter bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-lg text-blue-300">{s}</span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-8 border-t border-white/10">
                            <Tooltip content="Close mechanic details" position="top">
                                <button onClick={() => setViewingMechanic(null)} className="px-6 py-2.5 hover:bg-white/10 rounded-2xl text-sm font-bold transition-all text-gray-400">Close</button>
                            </Tooltip>
                            <Tooltip content="View full mechanic profile page" position="top">
                                <button onClick={() => { setViewingMechanic(null); navigate('/admin/mechanics'); }} className="px-6 py-2.5 bg-primary hover:bg-orange-600 text-white rounded-2xl text-sm font-black shadow-lg shadow-primary/30 transition-all hover:scale-105 active:scale-95">View Full Profile</button>
                            </Tooltip>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Modal for Assigning Mechanic */}
            <Modal title="Assign Mechanic" isOpen={!!assigningBooking} onClose={() => setAssigningBooking(null)}>
                {assigningBooking && (
                    <div className="space-y-6">
                        <div className="p-6 bg-primary/5 rounded-3xl border border-primary/10">
                            <p className="text-[10px] font-black text-primary  tracking-[0.2em] mb-3">ASSIGNING JOB FOR</p>
                            <h4 className="text-2xl font-black text-white tracking-tighter">{assigningBooking.customerName}</h4>
                            <div className="flex items-center gap-2 mt-2">
                                <ShoppingBag size={14} className="text-gray-500" />
                                <p className="text-gray-400 font-bold">{assigningBooking.service.name}</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <p className="text-xs font-bold text-gray-500  tracking-widest px-2">Select Available Mechanic</p>
                            <div className="max-h-[350px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                {mapMechanics.filter(m => m.status === 'Active').map(mechanic => (
                                    <Tooltip key={mechanic.id} content="Assign this mechanic to the job" position="top">
                                        <button
                                            onClick={() => handleAssignMechanic(mechanic)}
                                            className="w-full p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-between group transition-all"
                                        >
                                            <div className="flex items-center gap-4">
                                                <img src={mechanic.imageUrl} alt={mechanic.name} className="w-12 h-12 rounded-xl object-cover" loading="lazy" />
                                                <div className="text-left">
                                                    <p className="font-bold text-white group-hover:text-primary transition-colors">{mechanic.name}</p>
                                                    <p className="text-xs text-gray-500  tracking-tighter font-bold">{mechanic.specializations.slice(0, 2).join(' • ')}</p>
                                                </div>
                                            </div>
                                            <ArrowRight size={18} className="text-gray-600 group-hover:text-primary transition-colors translate-x-[-10px] opacity-0 group-hover:translate-x-0 group-hover:opacity-100 duration-300" />
                                        </button>
                                    </Tooltip>
                                ))}
                            </div>
                        </div>

                        <Tooltip content="Cancel mechanic assignment" position="top">
                            <button onClick={() => setAssigningBooking(null)} className="w-full py-4 bg-[#222] hover:bg-[#333] text-gray-400 text-xs font-black  tracking-[0.3em] rounded-2xl transition-all">
                                Cancel
                            </button>
                        </Tooltip>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default AdminDashboardScreen;
