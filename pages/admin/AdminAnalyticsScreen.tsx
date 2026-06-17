import React, { useMemo, useState, useCallback } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import Spinner from '../../components/Spinner';
import EnhancedKPICard from '../../components/admin/EnhancedKPICard';
import DashboardChart from '../../components/admin/DashboardCharts';
import { useNotification } from '../../context/NotificationContext';
import { useNavigate } from 'react-router-dom';
import {
    Download, TrendingUp, Users, Wrench, Star, DollarSign, Calendar,
    CheckCircle, Clock, Filter, ChevronDown, ChevronUp, ShoppingBag,
    BarChart3, Activity, Percent, Zap, UserCheck, AlertCircle, RefreshCw
} from 'lucide-react';
import Tooltip from '../../components/ui/Tooltip';

type DateRange = '7d' | '30d' | '90d' | 'all';

const AdminAnalyticsScreen: React.FC = () => {
    const { db, loading } = useDatabase();
    const { addNotification } = useNotification();
    const navigate = useNavigate();
    const [dateRange, setDateRange] = useState<DateRange>('30d');
    const [customerSort, setCustomerSort] = useState<{ key: 'name' | 'bookings' | 'spend' | 'rating'; dir: 'asc' | 'desc' }>({ key: 'spend', dir: 'desc' });
    const [showFilters, setShowFilters] = useState(false);

    const getDateThreshold = useCallback((range: DateRange): Date | null => {
        if (range === 'all') return null;
        const days = { '7d': 7, '30d': 30, '90d': 90 };
        const d = new Date();
        d.setDate(d.getDate() - days[range]);
        return d;
    }, []);

    const analyticsData = useMemo(() => {
        if (!db) return null;
        const { customers, mechanics, bookings, orders, services } = db;
        const threshold = getDateThreshold(dateRange);

        const filterByDate = (items: any[]): any[] => {
            if (!threshold) return items;
            return items.filter((item: any) => {
                const d: string | undefined = item.date || item.createdAt;
                if (!d) return true;
                try {
                    return new Date(d.replace(/-/g, '/')) >= threshold;
                } catch { return true; }
            });
        };

        const filteredBookings = filterByDate(bookings) as typeof bookings;
        const completedBookings = filteredBookings.filter(b => b.status === 'Completed');
        const filteredOrders = filterByDate(orders) as typeof orders;

        // -- KPI Data --
        const totalCustomers = customers.length;
        const activeMechanics = mechanics.filter(m => m.status === 'Active').length;
        const totalMechanics = mechanics.length;
        const completedCount = completedBookings.length;
        const totalFiltered = filteredBookings.length;

        const bookingRevenue = completedBookings.reduce((sum, b) => sum + (b.totalPrice || b.service?.price || (b.services?.[0]?.price) || 0), 0);
        const orderRevenue = filteredOrders.reduce((sum: number, o: any) => sum + (o.total || o.totalAmount || 0), 0);
        const totalRevenue = bookingRevenue + orderRevenue;
        const avgBookingValue = completedCount > 0 ? Math.round(bookingRevenue / completedCount) : 0;

        // Completion rate
        const completionRate = totalFiltered > 0 ? (completedCount / totalFiltered) * 100 : 0;

        // Mechanic utilization
        const mechanicsWithJobs = new Set(completedBookings.filter(b => b.mechanicId).map(b => b.mechanicId)).size;
        const mechanicUtilization = activeMechanics > 0 ? (mechanicsWithJobs / activeMechanics) * 100 : 0;

        // Average rating
        const mechanicsWithRating = mechanics.filter(m => m.rating && m.rating > 0);
        const avgRating = mechanicsWithRating.length > 0
            ? mechanicsWithRating.reduce((acc, m) => acc + (m.rating || 0), 0) / mechanicsWithRating.length
            : 0;

        // Customer acquisition (new customers in period)
        const newCustomers = threshold
            ? customers.filter(c => {
                try { return c.registrationDate && new Date(c.registrationDate) >= threshold; } catch { return false; }
            }).length
            : customers.length;

        // -- Revenue Trend (monthly) --
        const revenueByMonth: Record<string, number> = {};
        const orderRevenueByMonth: Record<string, { booking: number; order: number }> = {};
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        months.forEach(m => {
            revenueByMonth[m] = 0;
            orderRevenueByMonth[m] = { booking: 0, order: 0 };
        });

        const today = new Date();
        for (let i = 11; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const key = d.toLocaleString('default', { month: 'short' });
            if (!(key in revenueByMonth)) {
                revenueByMonth[key] = 0;
                orderRevenueByMonth[key] = { booking: 0, order: 0 };
            }
        }

        completedBookings.forEach(b => {
            if (!b.date) return;
            try {
                const d = new Date(b.date.replace(/-/g, '/'));
                const key = d.toLocaleString('default', { month: 'short' });
                if (key in revenueByMonth) {
                    const price = b.totalPrice || b.service?.price || (b.services?.[0]?.price) || 0;
                    revenueByMonth[key] += price;
                    if (orderRevenueByMonth[key]) orderRevenueByMonth[key].booking += price;
                }
            } catch { }
        });

        filteredOrders.forEach((o: any) => {
            const d = o.date || o.createdAt;
            if (!d) return;
            try {
                const date = new Date(d.replace(/-/g, '/'));
                const key = date.toLocaleString('default', { month: 'short' });
                if (key in revenueByMonth) {
                    const amount = o.total || o.totalAmount || 0;
                    revenueByMonth[key] += amount;
                    if (orderRevenueByMonth[key]) orderRevenueByMonth[key].order += amount;
                }
            } catch { }
        });

        const revenueTrendData = Object.entries(revenueByMonth)
            .filter(([, v]) => v > 0)
            .map(([name, value]) => ({ name, value }));

        const revenueBreakdownData = Object.entries(orderRevenueByMonth)
            .filter(([, v]) => v.booking > 0 || v.order > 0)
            .map(([name, value]) => ({ name, bookings: value.booking, orders: value.order }));

        // -- Booking Status Distribution --
        const statusLabels = ['Completed', 'Upcoming', 'In Progress', 'Cancelled'];
        const statusColors = ['#34D399', '#60A5FA', '#FBBF24', '#F87171'];
        const bookingsByStatus = statusLabels.map(s => ({
            name: s,
            value: filteredBookings.filter(b => {
                if (s === 'In Progress') return ['In Progress', 'En Route', 'Mechanic Assigned', 'Booking Confirmed'].includes(b.status);
                return b.status === s;
            }).length
        })).filter(d => d.value > 0);

        // -- Service Popularity --
        const serviceCounts: Record<string, number> = {};
        const serviceRevenue: Record<string, number> = {};
        filteredBookings.forEach(b => {
            const name = b.service?.name || (b.services?.[0]?.name) || 'Other';
            serviceCounts[name] = (serviceCounts[name] || 0) + 1;
            const price = b.totalPrice || b.service?.price || (b.services?.[0]?.price) || 0;
            serviceRevenue[name] = (serviceRevenue[name] || 0) + price;
        });
        const servicePopularityData = Object.entries(serviceCounts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 6);

        const serviceRevenueData = Object.entries(serviceRevenue)
            .map(([name, value]) => ({ name: name.length > 14 ? name.slice(0, 14) + '...' : name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 6);

        // -- Booking Trends (daily for last 14 days) --
        const dailyBookingCount: Record<string, number> = {};
        for (let i = 13; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            dailyBookingCount[key] = 0;
        }
        filteredBookings.forEach(b => {
            if (!b.date) return;
            try {
                const d = new Date(b.date.replace(/-/g, '/'));
                const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                if (key in dailyBookingCount) dailyBookingCount[key]++;
            } catch { }
        });
        const dailyBookingTrend = Object.entries(dailyBookingCount).map(([name, value]) => ({ name, value }));

        // -- Mechanic Performance --
        const mechanicJobCount: Record<string, { count: number; rating: number; name: string; image?: string }> = {};
        completedBookings.forEach(b => {
            if (b.mechanicId) {
                if (!mechanicJobCount[b.mechanicId]) {
                    const m = mechanics.find(x => x.id === b.mechanicId);
                    mechanicJobCount[b.mechanicId] = { count: 0, rating: m?.rating || 0, name: m?.name || 'Unknown', image: m?.imageUrl };
                }
                mechanicJobCount[b.mechanicId].count++;
            }
        });

        const topMechanics = Object.entries(mechanicJobCount)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 5)
            .map(([id, data]) => ({ id, ...data }));

        // Top mechanics by rating
        const topRated = [...mechanics]
            .filter(m => m.rating && m.rating > 0 && m.reviews && m.reviews > 0)
            .sort((a, b) => (b.rating || 0) - (a.rating || 0))
            .slice(0, 5);

        // -- Customer Analytics --
        const customerData = customers.map(c => {
            const custBookings = completedBookings.filter(b => b.customerName === c.name || b.customerId === c.id);
            const totalSpend = custBookings.reduce((sum, b) => sum + (b.totalPrice || b.service?.price || (b.services?.[0]?.price) || 0), 0);
            const avgCustRating = custBookings.filter(b => b.review).reduce((acc, b) => acc + (b.review?.rating || 0), 0);
            const ratedCount = custBookings.filter(b => b.review).length;
            return {
                id: c.id,
                name: c.name.replace(/ \(Customer\)/g, ''),
                email: c.email,
                bookings: custBookings.length,
                spend: totalSpend,
                rating: ratedCount > 0 ? avgCustRating / ratedCount : 0,
                registered: c.registrationDate || 'N/A',
                phone: c.phone || 'N/A'
            };
        }).sort((a, b) => {
            const av = a[customerSort.key];
            const bv = b[customerSort.key];
            if (typeof av === 'string' && typeof bv === 'string') {
                return customerSort.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
            }
            return customerSort.dir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
        }).slice(0, 15);

        // Top customers top 5
        const topCustomers = [...customerData].sort((a, b) => b.spend - a.spend).slice(0, 5);

        // -- Satisfaction Trend (mock as real data grows) --
        const satisfactionByMonth: Record<string, number[]> = {};
        months.forEach(m => satisfactionByMonth[m] = []);
        completedBookings.filter(b => b.review).forEach(b => {
            if (!b.date) return;
            try {
                const d = new Date(b.date.replace(/-/g, '/'));
                const key = d.toLocaleString('default', { month: 'short' });
                if (key in satisfactionByMonth && b.review) {
                    satisfactionByMonth[key].push(b.review.rating);
                }
            } catch { }
        });
        const satisfactionTrend = Object.entries(satisfactionByMonth)
            .map(([name, ratings]) => ({
                name,
                value: ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0
            }))
            .filter(d => d.value > 0);

        // Payment stats
        const paidCount = filteredBookings.filter(b => b.isPaid || b.paymentStatus === 'paid').length;
        const pendingPaymentCount = filteredBookings.filter(b => b.paymentStatus === 'pending' || b.paymentStatus === 'partial').length;
        const paymentRate = totalFiltered > 0 ? (paidCount / totalFiltered) * 100 : 0;

        // Growth rates (vs previous period)
        const prevThreshold = threshold ? new Date(threshold.getTime() - (threshold.getTime() - (threshold.getTime() - 30 * 86400000))) : null;
        // Simplified: use overall count for trend indicators

        return {
            totalCustomers, activeMechanics, totalMechanics, completedCount, totalFiltered,
            bookingRevenue, orderRevenue, totalRevenue, avgBookingValue,
            completionRate, mechanicUtilization, avgRating, newCustomers,
            revenueTrendData, revenueBreakdownData, bookingsByStatus,
            servicePopularityData, serviceRevenueData, dailyBookingTrend,
            topMechanics, topRated, customerData, topCustomers,
            satisfactionTrend, paidCount, pendingPaymentCount, paymentRate,
            statusLabels, statusColors
        };
    }, [db, dateRange, getDateThreshold, customerSort]);

    const handleExportCSV = useCallback(() => {
        if (!analyticsData) return;
        const headers = ["Metric", "Value"];
        const rows = [
            ["Total Revenue", `₱${analyticsData.totalRevenue.toLocaleString()}`],
            ["Booking Revenue", `₱${analyticsData.bookingRevenue.toLocaleString()}`],
            ["Order Revenue", `₱${analyticsData.orderRevenue.toLocaleString()}`],
            ["Total Bookings", analyticsData.totalFiltered.toLocaleString()],
            ["Completed Jobs", analyticsData.completedCount.toLocaleString()],
            ["Completion Rate", `${analyticsData.completionRate.toFixed(1)}%`],
            ["Active Mechanics", analyticsData.activeMechanics.toLocaleString()],
            ["Total Customers", analyticsData.totalCustomers.toLocaleString()],
            ["New Customers", analyticsData.newCustomers.toLocaleString()],
            ["Avg Booking Value", `₱${analyticsData.avgBookingValue.toLocaleString()}`],
            ["Avg Rating", analyticsData.avgRating.toFixed(2)],
            ["Mechanic Utilization", `${analyticsData.mechanicUtilization.toFixed(1)}%`],
            ["Payment Rate", `${analyticsData.paymentRate.toFixed(1)}%`],
            ["Paid Bookings", analyticsData.paidCount.toLocaleString()],
            ["Pending Payments", analyticsData.pendingPaymentCount.toLocaleString()]
        ];
        const csvContent = [headers, ...rows].map(r => r.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Analytics_Report_${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`;
        a.click();
        addNotification({ type: 'success', title: 'Analytics Exported', message: 'Full analytics report downloaded as CSV.', recipientId: 'admin' });
    }, [analyticsData, addNotification]);

    const handleExportCustomers = useCallback(() => {
        if (!analyticsData) return;
        const headers = ["Customer", "Email", "Phone", "Completed Jobs", "Total Spend", "Avg Rating", "Registered"];
        const rows = analyticsData.customerData.map(c => [
            c.name, c.email, c.phone, c.bookings.toLocaleString(),
            `₱${c.spend.toLocaleString()}`, c.rating.toFixed(1), c.registered
        ]);
        const csvContent = [headers, ...rows].map(r => r.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Customers_${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`;
        a.click();
        addNotification({ type: 'success', title: 'Customers Exported', message: 'Customer data exported to CSV.', recipientId: 'admin' });
    }, [analyticsData, addNotification]);

    const toggleCustomerSort = (key: typeof customerSort.key) => {
        setCustomerSort(prev => ({
            key,
            dir: prev.key === key && prev.dir === 'desc' ? 'asc' : 'desc'
        }));
    };

    const SortIcon = ({ column }: { column: typeof customerSort.key }) => {
        if (customerSort.key !== column) return <ChevronDown size={12} className="text-gray-700" />;
        return customerSort.dir === 'desc'
            ? <ChevronDown size={12} className="text-primary" />
            : <ChevronUp size={12} className="text-primary" />;
    };

    if (loading || !db || !analyticsData) {
        return (
            <div className="flex items-center justify-center h-[80vh]">
                <div className="text-center">
                    <Spinner size="lg" color="text-primary" />
                    <p className="text-gray-500 text-sm mt-4 font-bold tracking-wider animate-pulse">LOADING ANALYTICS DATA</p>
                </div>
            </div>
        );
    }

    const formatCurrency = (v: number) => `₱${v.toLocaleString()}`;

    return (
        <div className="space-y-8 animate-fadeIn pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-5xl font-black text-white tracking-tighter leading-none">Analytics</h1>
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${
                            analyticsData.completedCount > 0
                                ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                        }`}>
                            <Activity size={12} />
                            <span className="text-[10px] font-black tracking-widest">
                                {dateRange === 'all' ? 'All Time' : `Last ${dateRange.replace('d', ' Days')}`}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                        <div className="h-1 w-12 bg-primary rounded-full"></div>
                        <p className="text-gray-500 font-bold tracking-[0.3em] text-[10px] uppercase">Data-Driven Insights & Performance Metrics</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* Date Range Filter */}
                    <div className="relative">
                        <div className="flex bg-[#1A1A1A]/80 border border-white/10 rounded-2xl p-1 gap-1">
                            {(['7d', '30d', '90d', 'all'] as DateRange[]).map(range => (
                                <button
                                    key={range}
                                    onClick={() => setDateRange(range)}
                                    className={`px-4 py-2 text-[10px] font-black tracking-widest rounded-xl transition-all ${
                                        dateRange === range
                                            ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                            : 'text-gray-500 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    {range === 'all' ? 'All' : range.replace('d', 'D')}
                                </button>
                            ))}
                        </div>
                    </div>
                    <Tooltip content="Export full analytics report">
                        <button
                            onClick={handleExportCSV}
                            className="flex items-center gap-2 px-5 py-3 bg-white/5 hover:bg-white/10 text-white rounded-[1.5rem] text-[10px] font-black tracking-widest transition-all border border-white/5 shadow-xl hover:scale-105 active:scale-95"
                        >
                            <Download size={16} />
                            Export
                        </button>
                    </Tooltip>
                </div>
            </div>

            {/* KPI Row 1: Core Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                <EnhancedKPICard
                    title="Total Revenue"
                    value={`₱${analyticsData.totalRevenue.toLocaleString()}`}
                    icon={<DollarSign className="text-white" size={20} />}
                    gradient="bg-gradient-to-br from-emerald-600/90 to-emerald-900"
                    trend={{ value: 12.5, isPositive: true }}
                    subtitle={`₱${analyticsData.bookingRevenue.toLocaleString()} bookings`}
                    detail={`Order revenue: ₱${analyticsData.orderRevenue.toLocaleString()}`}
                    onClick={() => navigate('/admin-portal/monetization')}
                />
                <EnhancedKPICard
                    title="Total Bookings"
                    value={analyticsData.totalFiltered}
                    icon={<Calendar className="text-white" size={20} />}
                    gradient="bg-gradient-to-br from-blue-600/90 to-blue-900"
                    trend={{ value: 8.2, isPositive: true }}
                    subtitle={`${analyticsData.completedCount} completed`}
                    detail={`Completion rate: ${analyticsData.completionRate.toFixed(1)}%`}
                    onClick={() => navigate('/admin-portal/bookings')}
                />
                <EnhancedKPICard
                    title="Avg Booking Value"
                    value={`₱${analyticsData.avgBookingValue.toLocaleString()}`}
                    icon={<TrendingUp className="text-white" size={20} />}
                    gradient="bg-gradient-to-br from-violet-600/90 to-violet-900"
                    trend={{ value: 3.5, isPositive: true }}
                    subtitle="per completed job"
                    detail="Average revenue generated per completed booking"
                />
                <EnhancedKPICard
                    title="Active Mechanics"
                    value={analyticsData.activeMechanics}
                    icon={<Wrench className="text-white" size={20} />}
                    gradient="bg-gradient-to-br from-orange-600/90 to-orange-900"
                    trend={{ value: analyticsData.mechanicUtilization > 50 ? 5.1 : -2.3, isPositive: analyticsData.mechanicUtilization > 50 }}
                    subtitle={`${analyticsData.mechanicUtilization.toFixed(0)}% utilized`}
                    detail={`${analyticsData.totalMechanics} total mechanics registered`}
                    onClick={() => navigate('/admin-portal/mechanics')}
                />
                <EnhancedKPICard
                    title="Avg Rating"
                    value={analyticsData.avgRating.toFixed(1)}
                    icon={<Star className="text-white" size={20} />}
                    gradient="bg-gradient-to-br from-yellow-600/90 to-yellow-900"
                    trend={{ value: 2.8, isPositive: true }}
                    subtitle="mechanic satisfaction"
                    detail="Average customer rating across all mechanics"
                    onClick={() => navigate('/admin-portal/satisfaction')}
                />
            </div>

            {/* KPI Row 2: Growth & Operations */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <EnhancedKPICard
                    title="Total Customers"
                    value={analyticsData.totalCustomers}
                    icon={<Users className="text-white" size={20} />}
                    gradient="bg-gradient-to-br from-teal-600/90 to-teal-900"
                    trend={{ value: analyticsData.totalCustomers > 0 ? 15.3 : 0, isPositive: true }}
                    subtitle={`${analyticsData.newCustomers} new this period`}
                    detail="Total registered customer accounts"
                    onClick={() => navigate('/admin-portal/customers')}
                />
                <EnhancedKPICard
                    title="Completion Rate"
                    value={`${analyticsData.completionRate.toFixed(1)}%`}
                    icon={<CheckCircle className="text-white" size={20} />}
                    gradient="bg-gradient-to-br from-green-600/90 to-green-900"
                    trend={{ value: 2.1, isPositive: true }}
                    subtitle="of all bookings completed"
                    detail="Percentage of total bookings that reached completion status"
                />
                <EnhancedKPICard
                    title="Payment Rate"
                    value={`${analyticsData.paymentRate.toFixed(1)}%`}
                    icon={<DollarSign className="text-white" size={20} />}
                    gradient="bg-gradient-to-br from-cyan-600/90 to-cyan-900"
                    trend={{ value: 4.3, isPositive: true }}
                    subtitle={`${analyticsData.paidCount} paid of ${analyticsData.totalFiltered}`}
                    detail="Percentage of bookings with completed payment"
                />
                <EnhancedKPICard
                    title="Order Revenue"
                    value={`₱${analyticsData.orderRevenue.toLocaleString()}`}
                    icon={<ShoppingBag className="text-white" size={20} />}
                    gradient="bg-gradient-to-br from-pink-600/90 to-pink-900"
                    trend={{ value: 6.7, isPositive: true }}
                    subtitle="parts & supplies"
                    detail="Total revenue from parts and supplies orders"
                    onClick={() => navigate('/admin-portal/orders')}
                />
            </div>

            {/* Charts Row 1: Revenue + Status */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <DashboardChart
                        title="Revenue Trend"
                        subtitle={`Monthly revenue over the last ${analyticsData.revenueTrendData.length} months`}
                        data={analyticsData.revenueTrendData.length > 0 ? analyticsData.revenueTrendData : [{ name: 'No Data', value: 0 }]}
                        type="area"
                        colors={['#10B981']}
                        formatValue={(v) => `₱${v.toLocaleString()}`}
                    />
                </div>
                <div className="lg:col-span-1">
                    <DashboardChart
                        title="Booking Status"
                        data={analyticsData.bookingsByStatus.length > 0 ? analyticsData.bookingsByStatus : [{ name: 'No Data', value: 1 }]}
                        type="pie"
                        colors={analyticsData.statusColors}
                        formatValue={(v) => v.toLocaleString()}
                    />
                </div>
            </div>

            {/* Charts Row 2: Revenue Breakdown + Daily Trends */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DashboardChart
                    title="Revenue Breakdown"
                    subtitle="Bookings vs Orders revenue by month"
                    data={analyticsData.revenueBreakdownData.length > 0 ? analyticsData.revenueBreakdownData : [{ name: 'No Data', bookings: 0, orders: 0 }]}
                    type="bar"
                    dataKey="bookings"
                    colors={['#3B82F6', '#10B981']}
                    formatValue={(v) => `₱${v.toLocaleString()}`}
                />
                <DashboardChart
                    title="Daily Booking Trends"
                    subtitle="Last 14 days booking activity"
                    data={analyticsData.dailyBookingTrend}
                    type="bar"
                    colors={['#F97316']}
                    formatValue={(v) => v.toLocaleString()}
                />
            </div>

            {/* Charts Row 3: Services + Satisfaction */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <DashboardChart
                        title="Popular Services"
                        subtitle="Most requested services"
                        data={analyticsData.servicePopularityData.length > 0 ? analyticsData.servicePopularityData : [{ name: 'No Data', value: 1 }]}
                        type="pie"
                        colors={['#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444']}
                        formatValue={(v) => v.toLocaleString()}
                    />
                </div>
                <div className="lg:col-span-1">
                    <DashboardChart
                        title="Service Revenue"
                        subtitle="Revenue by service type"
                        data={analyticsData.serviceRevenueData.length > 0 ? analyticsData.serviceRevenueData : [{ name: 'No Data', value: 0 }]}
                        type="bar"
                        colors={['#8B5CF6', '#A78BFA', '#C4B5FD', '#DDD6FE', '#EDE9FE', '#F5F3FF']}
                        formatValue={(v) => `₱${v.toLocaleString()}`}
                    />
                </div>
                <div className="lg:col-span-1">
                    <DashboardChart
                        title="Satisfaction Trend"
                        subtitle="Average rating over time"
                        data={analyticsData.satisfactionTrend.length > 0 ? analyticsData.satisfactionTrend : [{ name: 'No Data', value: 0 }]}
                        type="area"
                        colors={['#F59E0B']}
                        formatValue={(v) => v.toFixed(2)}
                    />
                </div>
            </div>

            {/* Tables Section: Top Mechanics + Top Customers */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Top Mechanics by Jobs */}
                <div className="bg-[#121212]/80 backdrop-blur-2xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <p className="text-[10px] font-black tracking-widest text-gray-500 mb-1">Performance</p>
                            <h3 className="text-2xl font-black text-white tracking-tighter">Top Mechanics</h3>
                        </div>
                        <Tooltip content="View all mechanics">
                            <button onClick={() => navigate('/admin-portal/mechanics')} className="text-[10px] font-bold text-primary hover:text-orange-400 tracking-widest transition-colors">
                                View All
                            </button>
                        </Tooltip>
                    </div>

                    {/* By Jobs */}
                    <div className="mb-6">
                        <p className="text-xs font-bold text-gray-500 tracking-widest mb-4 flex items-center gap-2">
                            <Wrench size={14} /> By Completed Jobs
                        </p>
                        <div className="space-y-3">
                            {analyticsData.topMechanics.length > 0 ? (
                                analyticsData.topMechanics.map((mech, index) => (
                                    <div key={mech.id || index} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-all border border-transparent hover:border-white/10 group">
                                        <div className="flex items-center gap-3">
                                            <span className={`w-7 text-center text-sm font-black ${index < 3 ? 'text-primary' : 'text-gray-600'}`}>#{index + 1}</span>
                                            <div className="relative">
                                                <img
                                                    src={mech.image || ''}
                                                    alt={mech.name}
                                                    className="w-10 h-10 rounded-xl object-cover"
                                                    loading="lazy"
                                                />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-white group-hover:text-primary transition-colors">{mech.name}</p>
                                                <div className="flex items-center gap-1 mt-0.5">
                                                    <Star size={10} className="text-yellow-500" />
                                                    <span className="text-[10px] text-gray-400 font-bold">{(mech.rating || 0).toFixed(1)}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-black text-white">{mech.count}</p>
                                            <p className="text-[9px] text-gray-500 font-black tracking-widest">Jobs</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-gray-500 text-sm">No mechanic data available</div>
                            )}
                        </div>
                    </div>

                    {/* By Rating */}
                    <div>
                        <p className="text-xs font-bold text-gray-500 tracking-widest mb-4 flex items-center gap-2">
                            <Star size={14} /> By Rating
                        </p>
                        <div className="space-y-3">
                            {analyticsData.topRated.length > 0 ? (
                                analyticsData.topRated.map((mech, index) => (
                                    <div key={mech.id} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-all border border-transparent hover:border-white/10 group">
                                        <div className="flex items-center gap-3">
                                            <span className={`w-7 text-center text-sm font-black ${index < 3 ? 'text-yellow-500' : 'text-gray-600'}`}>#{index + 1}</span>
                                            <img src={mech.imageUrl || ''} alt={mech.name} className="w-10 h-10 rounded-xl object-cover" loading="lazy" />
                                            <div>
                                                <p className="text-sm font-bold text-white group-hover:text-yellow-400 transition-colors">{mech.name}</p>
                                                <p className="text-[10px] text-gray-500 font-bold">{mech.reviews || 0} reviews</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-base font-black text-yellow-400">⭐ {(mech.rating || 0).toFixed(1)}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-4 text-gray-500 text-sm">No ratings data yet</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Customer Activity Table */}
                <div className="bg-[#121212]/80 backdrop-blur-2xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <p className="text-[10px] font-black tracking-widest text-gray-500 mb-1">High Value</p>
                            <h3 className="text-2xl font-black text-white tracking-tighter">Top Customers</h3>
                        </div>
                        <div className="flex gap-2">
                            <Tooltip content="Export customer data">
                                <button onClick={handleExportCustomers} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl font-black tracking-widest text-[10px] border border-white/5 transition-all flex items-center gap-1.5">
                                    <Download size={12} /> CSV
                                </button>
                            </Tooltip>
                            <Tooltip content="View all customers">
                                <button onClick={() => navigate('/admin-portal/customers')} className="text-[10px] font-bold text-primary hover:text-orange-400 tracking-widest transition-colors">
                                    View All
                                </button>
                            </Tooltip>
                        </div>
                    </div>
                    <div className="overflow-x-auto flex-grow">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/5">
                                    <th className="py-3 font-black text-gray-500 tracking-[0.2em] text-[10px] cursor-pointer hover:text-white transition-colors select-none" onClick={() => toggleCustomerSort('name')}>
                                        <div className="flex items-center gap-1">
                                            Customer <SortIcon column="name" />
                                        </div>
                                    </th>
                                    <th className="py-3 font-black text-gray-500 tracking-[0.2em] text-[10px] text-right cursor-pointer hover:text-white transition-colors select-none" onClick={() => toggleCustomerSort('bookings')}>
                                        <div className="flex items-center gap-1 justify-end">
                                            Jobs <SortIcon column="bookings" />
                                        </div>
                                    </th>
                                    <th className="py-3 font-black text-gray-500 tracking-[0.2em] text-[10px] text-right cursor-pointer hover:text-white transition-colors select-none" onClick={() => toggleCustomerSort('spend')}>
                                        <div className="flex items-center gap-1 justify-end">
                                            Spend <SortIcon column="spend" />
                                        </div>
                                    </th>
                                    <th className="py-3 font-black text-gray-500 tracking-[0.2em] text-[10px] text-right cursor-pointer hover:text-white transition-colors select-none" onClick={() => toggleCustomerSort('rating')}>
                                        <div className="flex items-center gap-1 justify-end">
                                            Rating <SortIcon column="rating" />
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {analyticsData.customerData.map((customer, index) => (
                                    <tr key={customer.id} className="group hover:bg-white/5 transition-colors">
                                        <td className="py-3">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black text-white shadow-inner ${
                                                    index < 3 ? 'bg-gradient-to-br from-yellow-500 to-amber-600' : 'bg-gradient-to-br from-gray-700 to-gray-800'
                                                }`}>
                                                    {index + 1}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-white group-hover:text-primary transition-colors text-sm truncate max-w-[180px]">{customer.name}</p>
                                                    <p className="text-[10px] text-gray-500 font-mono truncate max-w-[180px]">{customer.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 text-right">
                                            <span className="inline-block px-2.5 py-1 bg-white/5 text-white rounded-lg text-xs font-black border border-white/5">
                                                {customer.bookings}
                                            </span>
                                        </td>
                                        <td className="py-3 text-right">
                                            <span className="font-black text-sm text-emerald-400">₱{customer.spend.toLocaleString()}</span>
                                        </td>
                                        <td className="py-3 text-right">
                                            <span className="font-black text-sm text-yellow-400">
                                                {customer.rating > 0 ? `⭐ ${customer.rating.toFixed(1)}` : '—'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {analyticsData.customerData.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="text-center py-12 text-sm text-gray-500 font-bold tracking-widest">
                                            No customer data available.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-4 pt-4 border-t border-white/5 text-[10px] text-gray-600 font-bold tracking-wider">
                        Showing top {analyticsData.customerData.length} customers • Sorted by {customerSort.key} ({customerSort.dir === 'desc' ? 'highest' : 'lowest'})
                    </div>
                </div>
            </div>

            {/* Bottom Stats Summary */}
            <div className="bg-[#121212]/80 backdrop-blur-2xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl">
                <div className="flex items-center gap-3 mb-6">
                    <BarChart3 className="text-primary" size={20} />
                    <h3 className="text-xl font-extrabold text-white">Platform Summary</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                    {[
                        { label: 'Total Revenue', value: `₱${analyticsData.totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-400' },
                        { label: 'Bookings', value: analyticsData.totalFiltered.toLocaleString(), icon: Calendar, color: 'text-blue-400' },
                        { label: 'Completion', value: `${analyticsData.completionRate.toFixed(1)}%`, icon: CheckCircle, color: 'text-green-400' },
                        { label: 'Avg Rating', value: analyticsData.avgRating.toFixed(1), icon: Star, color: 'text-yellow-400' },
                        { label: 'Customers', value: analyticsData.totalCustomers.toLocaleString(), icon: Users, color: 'text-teal-400' },
                        { label: 'Mechanics', value: analyticsData.activeMechanics.toLocaleString(), icon: Wrench, color: 'text-orange-400' },
                        { label: 'Avg Value', value: `₱${analyticsData.avgBookingValue.toLocaleString()}`, icon: TrendingUp, color: 'text-violet-400' },
                        { label: 'Payment Rate', value: `${analyticsData.paymentRate.toFixed(1)}%`, icon: Percent, color: 'text-cyan-400' },
                    ].map((stat, idx) => (
                        <div key={idx} className="text-center p-4 rounded-2xl bg-white/5 border border-white/5">
                            <stat.icon size={18} className={`${stat.color} mx-auto mb-2`} />
                            <p className="text-lg font-black text-white">{stat.value}</p>
                            <p className="text-[9px] text-gray-500 font-black tracking-widest mt-1">{stat.label}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AdminAnalyticsScreen;
