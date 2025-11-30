import React, { useMemo, useState } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import Spinner from '../../components/Spinner';
import { Booking } from '../../types';

const StatCard: React.FC<{ title: string; value: string | number; change?: number; prefix?: string }> = ({ title, value, change, prefix }) => (
    <div className="bg-white/5 p-6 rounded-xl shadow-lg border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
        <p className="text-sm text-gray-400 uppercase tracking-wider font-medium">{title}</p>
        <div className="flex items-baseline space-x-3 mt-2">
            <p className="text-4xl font-extrabold text-white tracking-tight">{prefix}{value}</p>
            {change !== undefined && !isNaN(change) && (
                <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${change >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                </span>
            )}
        </div>
    </div>
);

const BarChart: React.FC<{ title: string; data: { label: string; value: number }[] }> = ({ title, data }) => {
    const maxValue = Math.max(...data.map(d => d.value), 1);
    return (
        <div className="bg-white/5 p-6 rounded-xl shadow-lg border border-white/10 backdrop-blur-sm h-full flex flex-col">
            <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-wider text-sm">{title}</h3>
            <div className="space-y-5 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {data.map(({ label, value }) => (
                    <div key={label} className="grid grid-cols-[80px_1fr_50px] items-center gap-4 group">
                        <div className="text-xs text-gray-400 font-medium text-right group-hover:text-white transition-colors">{label}</div>
                        <div className="flex-1 bg-black/20 rounded-full h-3 overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-1000 ease-out bg-gradient-to-r from-admin-accent to-orange-400 relative"
                                style={{ width: `${(value / maxValue) * 100}%` }}
                            >
                                <div className="absolute inset-0 bg-white/20 group-hover:bg-white/0 transition-colors"></div>
                            </div>
                        </div>
                        <div className="text-sm font-bold text-white text-right">{value}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const TopList: React.FC<{ title: string; items: { name: string; value: string | number; subtext?: string }[] }> = ({ title, items }) => (
    <div className="bg-white/5 p-6 rounded-xl shadow-lg border border-white/10 backdrop-blur-sm">
        <h3 className="text-lg font-bold text-white mb-4 uppercase tracking-wider text-sm">{title}</h3>
        <ul className="space-y-3">
            {items.map((item, index) => (
                <li key={index} className="flex justify-between items-center p-3 rounded-lg hover:bg-white/5 transition-colors group border border-transparent hover:border-white/5">
                    <div className="flex items-center gap-3">
                        <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${index < 3 ? 'bg-admin-accent text-white shadow-lg shadow-orange-500/20' : 'bg-white/10 text-gray-400'}`}>
                            {index + 1}
                        </span>
                        <div>
                            <p className="text-sm font-semibold text-gray-200 group-hover:text-white transition-colors">{item.name}</p>
                            {item.subtext && <p className="text-xs text-gray-500">{item.subtext}</p>}
                        </div>
                    </div>
                    <span className="font-bold text-admin-accent">{item.value}</span>
                </li>
            ))}
            {items.length === 0 && <p className="text-xs text-center text-gray-500 py-4 italic">Not enough data to display.</p>}
        </ul>
    </div>
);

type Period = 'today' | 'week' | 'month' | 'year';
type SortKey = 'name' | 'bookings' | 'spend';

const CustomerActivityReport: React.FC = () => {
    const { db } = useDatabase();
    const [period, setPeriod] = useState<Period>('month');
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'spend', direction: 'desc' });

    const customerReportData = useMemo(() => {
        if (!db) return [];

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        let startDate: Date;

        switch (period) {
            case 'today': startDate = today; break;
            case 'week': startDate = new Date(today); startDate.setDate(today.getDate() - today.getDay()); break;
            case 'month': startDate = new Date(today.getFullYear(), today.getMonth(), 1); break;
            case 'year': startDate = new Date(today.getFullYear(), 0, 1); break;
        }

        const relevantBookings = db.bookings.filter(b => {
            const bookingDate = new Date(b.date.replace(/-/g, '/'));
            return bookingDate >= startDate && b.status === 'Completed';
        });

        const customerData = db.customers.map(customer => {
            const customerBookings = relevantBookings.filter(b => b.customerName === customer.name);
            return {
                id: customer.id,
                name: customer.name,
                email: customer.email,
                bookings: customerBookings.length,
                spend: customerBookings.reduce((sum, b) => sum + b.service.price, 0),
            };
        });

        return customerData.sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];
            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [db, period, sortConfig]);

    const requestSort = (key: SortKey) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        else if (sortConfig.key === key && sortConfig.direction === 'desc') direction = 'asc';
        setSortConfig({ key, direction });
    };

    return (
        <div className="bg-white/5 p-6 rounded-xl shadow-lg border border-white/10 backdrop-blur-sm mt-8">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
                <h3 className="text-lg font-bold text-white uppercase tracking-wider text-sm">Customer Activity Report</h3>
                <div className="flex p-1 bg-black/20 rounded-xl text-xs self-start sm:self-center border border-white/5">
                    {(['today', 'week', 'month', 'year'] as Period[]).map(p => (
                        <button key={p} onClick={() => setPeriod(p)} className={`px-4 py-1.5 rounded-lg capitalize font-medium transition-all ${period === p ? 'bg-admin-accent text-white shadow-md' : 'text-gray-400 hover:text-white'}`}>{p}</button>
                    ))}
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[500px]">
                    <thead>
                        <tr className="border-b border-white/10">
                            <th className="p-3 cursor-pointer text-xs uppercase font-bold text-gray-400 hover:text-white transition-colors" onClick={() => requestSort('name')}>Name</th>
                            <th className="p-3 cursor-pointer text-right text-xs uppercase font-bold text-gray-400 hover:text-white transition-colors" onClick={() => requestSort('bookings')}>Bookings</th>
                            <th className="p-3 cursor-pointer text-right text-xs uppercase font-bold text-gray-400 hover:text-white transition-colors" onClick={() => requestSort('spend')}>Total Spend</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {customerReportData.filter(c => c.bookings > 0).map(customer => (
                            <tr key={customer.id} className="hover:bg-white/5 transition-colors group">
                                <td className="p-4">
                                    <p className="font-semibold text-sm text-gray-200 group-hover:text-white">{customer.name}</p>
                                    <p className="text-xs text-gray-500">{customer.email}</p>
                                </td>
                                <td className="p-4 text-right font-mono text-sm text-gray-300">{customer.bookings}</td>
                                <td className="p-4 text-right font-mono text-sm font-bold text-admin-accent">₱{customer.spend.toLocaleString()}</td>
                            </tr>
                        ))}
                        {customerReportData.filter(c => c.bookings > 0).length === 0 && (
                            <tr><td colSpan={3} className="text-center py-12 text-sm text-gray-500 italic">No customer activity found for this period.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const AdminAnalyticsScreen: React.FC = () => {
    const { db, loading } = useDatabase();

    const analyticsData = useMemo(() => {
        if (!db) return null;
        const { customers, mechanics, bookings, orders, services } = db;

        // Helper to get month key YYYY-MM
        const getMonthKey = (dateStr: string) => {
            const date = new Date(dateStr.replace(/-/g, '/'));
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        };

        const now = new Date();
        const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevMonthKey = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

        // KPI Calculations
        const totalCustomers = customers.length;
        const totalMechanics = mechanics.filter(m => m.status === 'Active').length;

        const completedBookings = bookings.filter(b => b.status === 'Completed');
        const currentMonthBookings = completedBookings.filter(b => getMonthKey(b.date) === currentMonthKey).length;
        const prevMonthBookings = completedBookings.filter(b => getMonthKey(b.date) === prevMonthKey).length;
        const bookingChange = prevMonthBookings > 0 ? ((currentMonthBookings - prevMonthBookings) / prevMonthBookings) * 100 : 0;

        const totalBookingRevenue = completedBookings.reduce((sum, b) => sum + b.service.price, 0);
        const totalOrderRevenue = orders.reduce((sum, o) => sum + o.total, 0);
        const totalRevenue = totalBookingRevenue + totalOrderRevenue;

        const currentMonthRevenue =
            completedBookings.filter(b => getMonthKey(b.date) === currentMonthKey).reduce((sum, b) => sum + b.service.price, 0) +
            orders.filter(o => getMonthKey(o.date) === currentMonthKey).reduce((sum, o) => sum + o.total, 0);

        const prevMonthRevenue =
            completedBookings.filter(b => getMonthKey(b.date) === prevMonthKey).reduce((sum, b) => sum + b.service.price, 0) +
            orders.filter(o => getMonthKey(o.date) === prevMonthKey).reduce((sum, o) => sum + o.total, 0);

        const revenueChange = prevMonthRevenue > 0 ? ((currentMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100 : 0;

        // Charts & Lists
        const bookingsByMonth = bookings.reduce((acc, booking) => {
            const monthKey = getMonthKey(booking.date);
            acc[monthKey] = (acc[monthKey] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const chartData = (Object.entries(bookingsByMonth) as [string, number][])
            .map(([monthKey, value]) => {
                const date = new Date(`${monthKey}-02`);
                const label = date.toLocaleString('default', { month: 'short', year: 'numeric' });
                return { label, value, date };
            })
            .sort((a, b) => a.date.getTime() - b.date.getTime())
            .map(({ label, value }) => ({ label, value }))
            .slice(-6);

        const mechanicPerformance = completedBookings.filter(b => b.mechanic).reduce((acc, booking) => {
            const mechId = booking.mechanic!.id;
            acc[mechId] = (acc[mechId] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const topMechanics = (Object.entries(mechanicPerformance) as [string, number][])
            .sort((a, b) => Number(b[1]) - Number(a[1]))
            .slice(0, 5)
            .map(([id, count]) => ({
                name: mechanics.find(m => m.id === id)?.name || 'Unknown',
                value: `${count} jobs`,
                subtext: mechanics.find(m => m.id === id)?.email
            }));

        const servicePopularity = bookings.reduce((acc, booking) => {
            const serviceId = booking.service.id;
            acc[serviceId] = (acc[serviceId] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const popularServices = (Object.entries(servicePopularity) as [string, number][])
            .sort((a, b) => Number(b[1]) - Number(a[1]))
            .slice(0, 5)
            .map(([id, count]) => ({
                name: services.find(s => s.id === id)?.name || 'Unknown',
                value: `${count} bookings`
            }));

        return {
            totalCustomers,
            totalMechanics,
            completedBookingsCount: completedBookings.length,
            totalRevenue,
            bookingsByMonth: chartData,
            topMechanics,
            popularServices,
            bookingChange,
            revenueChange
        };
    }, [db]);

    if (loading || !db || !analyticsData) {
        return <div className="flex items-center justify-center h-full"><Spinner size="lg" color="text-white" /></div>;
    }

    return (
        <div className="space-y-8 pb-8">
            <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">Analytics Dashboard</h1>
                <p className="mt-2 text-gray-400">Real-time performance metrics and insights.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Users" value={analyticsData.totalCustomers.toLocaleString()} />
                <StatCard title="Active Mechanics" value={analyticsData.totalMechanics.toLocaleString()} />
                <StatCard title="Completed Jobs" value={analyticsData.completedBookingsCount.toLocaleString()} change={analyticsData.bookingChange} />
                <StatCard title="Total Revenue" value={(analyticsData.totalRevenue / 1000).toFixed(1)} prefix="₱" change={analyticsData.revenueChange} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 h-[400px]">
                    <BarChart title="Bookings Trend (Last 6 Months)" data={analyticsData.bookingsByMonth} />
                </div>
                <div className="space-y-8">
                    <TopList title="Top Performing Mechanics" items={analyticsData.topMechanics} />
                    <TopList title="Most Popular Services" items={analyticsData.popularServices} />
                </div>
            </div>
            <CustomerActivityReport />
        </div>
    );
};

export default AdminAnalyticsScreen;
