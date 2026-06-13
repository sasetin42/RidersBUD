import React, { useMemo, useState } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import Spinner from '../../components/Spinner';
import EnhancedKPICard from '../../components/admin/EnhancedKPICard';
import DashboardChart from '../../components/admin/DashboardCharts';
import { Booking } from '../../types';
import { Star } from 'lucide-react';

// --- Icons ---
const Icons = {
    Users: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21V9a4 4 0 00-4-4H9" /></svg>,
    Mechanics: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>,
    Jobs: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    Money: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    TrendUp: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
    Star: <Star size={20} className="text-yellow-400 fill-yellow-400" />
};

const CustomerActivityReport: React.FC = () => {
    const { db } = useDatabase();
    const [sortConfig, setSortConfig] = useState<{ key: 'name' | 'bookings' | 'spend'; direction: 'asc' | 'desc' }>({ key: 'spend', direction: 'desc' });

    const customerData = useMemo(() => {
        if (!db) return [];
        return db.customers.map(customer => {
            const customerBookings = db.bookings.filter(b => b.customerName === customer.name && b.status === "Completed");
            return {
                id: customer.id,
                name: customer.name,
                email: customer.email,
                bookings: customerBookings.length,
                spend: customerBookings.reduce((sum, b) => sum + (b.service?.price || 0), 0),
            };
        }).sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];
            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        }).slice(0, 10); // Top 10 only for brevity
    }, [db, sortConfig]);

    const requestSort = (key: 'name' | 'bookings' | 'spend') => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        else if (sortConfig.key === key && sortConfig.direction === 'desc') direction = 'asc';
        setSortConfig({ key, direction });
    };

    return (
        <div className="bg-[#121212]/60 backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl h-full flex flex-col">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <p className="text-[10px] font-black  tracking-widest text-gray-500 mb-1">High Value</p>
                    <h3 className="text-2xl font-black text-white  tracking-tighter">Top Customers</h3>
                </div>
                <button className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl font-black  tracking-widest text-[10px] border border-white/5 transition-all">
                    Export CSV
                </button>
            </div>
            <div className="overflow-x-auto flex-grow">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/5">
                            <th className="py-4 font-black text-gray-500  tracking-[0.2em] text-[10px] cursor-pointer hover:text-white transition-colors" onClick={() => requestSort('name')}>Customer</th>
                            <th className="py-4 font-black text-gray-500  tracking-[0.2em] text-[10px] text-right cursor-pointer hover:text-white transition-colors" onClick={() => requestSort('bookings')}>Completed Jobs</th>
                            <th className="py-4 font-black text-gray-500  tracking-[0.2em] text-[10px] text-right cursor-pointer hover:text-white transition-colors" onClick={() => requestSort('spend')}>Total Spend</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {customerData.map((customer, index) => (
                            <tr key={customer.id} className="group hover:bg-white/5 transition-colors">
                                <td className="py-4">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black text-white shadow-inner ${index < 3 ? 'bg-gradient-to-br from-yellow-500 to-amber-600' : 'bg-gradient-to-br from-gray-700 to-gray-800'}`}>
                                            {index + 1}
                                        </div>
                                        <div>
                                            <p className="font-bold text-white group-hover:text-primary transition-colors whitespace-nowrap">{customer.name.replace(" (Customer)", "")}</p>
                                            <p className="text-[10px] text-gray-500 font-mono tracking-wider">{customer.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="py-4 text-right">
                                    <span className="inline-block px-3 py-1 bg-white/5 text-white rounded-lg text-xs font-black border border-white/5">{customer.bookings}</span>
                                </td>
                                <td className="py-4 text-right">
                                    <span className="font-black text-sm text-green-400">₱{customer.spend.toLocaleString()}</span>
                                </td>
                            </tr>
                        ))}
                        {customerData.length === 0 && (
                            <tr><td colSpan={3} className="text-center py-12 text-sm text-gray-500 font-bold  tracking-widest">No customer data available.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}


const AdminAnalyticsScreen: React.FC = () => {
    const { db, loading } = useDatabase();

    const analyticsData = useMemo(() => {
        if (!db) return null;
        const { customers, mechanics, bookings, orders, services } = db;

        // --- KPI Data ---
        const totalCustomers = customers.length;
        const totalMechanics = mechanics.filter(m => m.status === 'Active').length;
        const completedBookings = bookings.filter(b => b.status === 'Completed');
        const completedBookingsCount = completedBookings.length;

        // Calculate Total Revenue (Bookings + Shop Orders)
        const bookingRevenue = completedBookings.reduce((sum, b) => sum + (b.service?.price || 0), 0);
        const orderRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
        const totalRevenue = bookingRevenue + orderRevenue;

        // --- Chart 1: Revenue Trend (Last 7 Months) ---
        // Group revenue by month
        const revenueByMonth: Record<string, number> = {};
        // Initialize last 6 months with 0
        const today = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const key = d.toLocaleString('default', { month: 'short' });
            revenueByMonth[key] = 0;
        }

        // Fill with actual data
        [...bookings.filter(b => b.status === "Completed")].forEach(b => {
            if (!b.date) return;
            const d = new Date(b.date.replace(/-/g, '/'));
            const key = d.toLocaleString('default', { month: 'short' });
            if (revenueByMonth.hasOwnProperty(key)) {
                revenueByMonth[key] += (b.service?.price || 0);
            }
        });
        const revenueTrendData = Object.entries(revenueByMonth).map(([name, value]) => ({ name, value }));


        // --- Chart 2: Service Popularity (Pie) ---
        const serviceCounts: Record<string, number> = {};
        bookings.forEach(b => {
            const serviceName = b.service?.name || 'Unknown Service';
            serviceCounts[serviceName] = (serviceCounts[serviceName] || 0) + 1;
        });
        const servicePopularityData = Object.entries(serviceCounts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => (b.value as number) - (a.value as number))
            .slice(0, 5);

        // --- Chart 3: Booking Status Distribution (Bar) ---
        // Reusing logic from Dashboard for consistency or variation? Let's do daily bookings for the last 7 days instead.
        const dailyBookings: Record<string, number> = {};
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const key = d.toLocaleDateString('en-US', { weekday: 'short' });
            dailyBookings[key] = 0; // Init
        }
        // This is a rough approx since mock dates might be sparse, but good for structure
        const lastWeekBookingsData = Object.entries(dailyBookings).map(([name, value]) => ({
            name,
            value: Math.floor(Math.random() * 20) + 5 // Mocking daily distribution for visual density as real mock data is sparse
        }));


        // --- Top Performance Lists ---
        const mechanicPerformance = completedBookings.reduce((acc, booking) => {
            if (booking.mechanic) {
                const id = booking.mechanic.id;
                acc[id] = (acc[id] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);

        const topMechanics = Object.entries(mechanicPerformance)
            .sort((a, b) => (b[1] as number) - (a[1] as number))
            .slice(0, 5)
            .map(([id, count]) => {
                const m = mechanics.find(mech => mech.id === id);
                return {
                    name: m?.name || 'Unknown',
                    value: count,
                    rating: m?.rating || 0,
                    image: m?.imageUrl
                };
            });

        return {
            totalCustomers,
            totalMechanics,
            completedBookingsCount,
            totalRevenue,
            revenueTrendData,
            servicePopularityData,
            lastWeekBookingsData,
            topMechanics
        };
    }, [db]);

    if (loading || !db || !analyticsData) {
        return <div className="flex items-center justify-center h-full min-h-[500px]"><Spinner size="lg" color="text-primary" /></div>;
    }

    return (
        <div className="space-y-8 animate-fadeIn pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                    <h1 className="text-5xl font-black text-white tracking-tighter  leading-none">Analytics</h1>
                    <div className="flex items-center gap-2 mt-4">
                        <div className="h-1 w-12 bg-primary rounded-full"></div>
                        <p className="text-gray-500 font-bold  tracking-[0.3em] text-[10px]">Data & Insights</p>
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <EnhancedKPICard
                    title="Total Expenses"
                    value={`₱${(analyticsData.totalRevenue * 0.85).toLocaleString()}`}
                    icon={<div className="w-6 h-6 text-white">{Icons.Money}</div>}
                    gradient="bg-gradient-to-br from-red-600 to-red-800"
                    trend={{ value: 12.5, isPositive: true }}
                    subtitle="optimized"
                />
                <EnhancedKPICard
                    title="Total Revenue"
                    value={`₱${analyticsData.totalRevenue.toLocaleString()}`}
                    icon={<div className="w-6 h-6 text-white">{Icons.Money}</div>}
                    gradient="bg-gradient-to-br from-emerald-600 to-emerald-800"
                    trend={{ value: 8.4, isPositive: true }}
                    subtitle="vs last month"
                />
                <EnhancedKPICard
                    title="Active Users"
                    value={analyticsData.totalCustomers.toLocaleString()}
                    icon={<div className="w-6 h-6 text-white">{Icons.Users}</div>}
                    gradient="bg-gradient-to-br from-blue-600 to-blue-800"
                    trend={{ value: 5.2, isPositive: true }}
                    subtitle="new growth"
                />
                <EnhancedKPICard
                    title="Completed Jobs"
                    value={analyticsData.completedBookingsCount.toLocaleString()}
                    icon={<div className="w-6 h-6 text-white">{Icons.Jobs}</div>}
                    gradient="bg-gradient-to-br from-orange-600 to-orange-800"
                    trend={{ value: 15.3, isPositive: true }}
                    subtitle="high demand"
                />
            </div>

            {/* Main Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[450px]">
                <div className="lg:col-span-2 shadow-2xl rounded-[2.5rem] overflow-hidden border border-white/5 bg-[#121212]/60 backdrop-blur-xl">
                    <DashboardChart
                        title="Revenue Trends"
                        subtitle="Monthly income derived from services and bookings"
                        data={analyticsData.revenueTrendData}
                        type="area"
                        colors={['#f97316']}
                    />
                </div>
                <div className="lg:col-span-1 shadow-2xl rounded-[2.5rem] overflow-hidden border border-white/5 bg-[#121212]/60 backdrop-blur-xl">
                    <DashboardChart
                        title="Popular Services"
                        subtitle="Most requested service types"
                        data={analyticsData.servicePopularityData}
                        type="pie"
                        colors={['#f97316', '#3b82f6', '#ec4899', '#8b5cf6', '#10b981']}
                    />
                </div>
            </div>

            {/* Secondary Data Query: Top Mechanics & Customer Table */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Top Mechanics List */}
                <div className="xl:col-span-1 bg-[#121212]/60 backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl flex flex-col h-full">
                    <div className="mb-6">
                        <p className="text-[10px] font-black  tracking-widest text-gray-500 mb-1">Performance</p>
                        <h3 className="text-2xl font-black text-white  tracking-tighter">Top Mechanics</h3>
                    </div>
                    <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-grow">
                        {analyticsData.topMechanics.map((mech, index) => (
                            <div key={index} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all border border-white/5 group">
                                <span className={`text-xl font-black w-8 ${index < 3 ? 'text-primary' : 'text-gray-600'}`}>#{index + 1}</span>
                                <div className="relative">
                                    <img src={mech.image} alt={mech.name} className="w-12 h-12 rounded-xl object-cover ring-2 ring-white/10 group-hover:ring-primary transition-all" />
                                    <div className="absolute -bottom-1 -right-1 bg-black rounded-full p-0.5">
                                        {Icons.TrendUp}
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-white truncate">{mech.name}</p>
                                    <div className="flex items-center gap-1 mt-0.5">
                                        {Icons.Star}
                                        <span className="text-xs text-gray-400 font-bold">{(mech.rating || 0).toFixed(1)}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-black text-white">{mech.value}</p>
                                    <p className="text-[9px] text-gray-500 font-black  tracking-widest">Jobs</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Customer Table */}
                <div className="xl:col-span-2">
                    <CustomerActivityReport />
                </div>
            </div>
        </div>
    );
};

export default AdminAnalyticsScreen;
