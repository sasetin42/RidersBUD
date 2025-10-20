import React, { useMemo, useState } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import Spinner from '../../components/Spinner';
import { Booking } from '../../types';

const StatCard: React.FC<{ title: string; value: string | number; change?: string; }> = ({ title, value, change }) => (
    <div className="bg-admin-card p-6 rounded-xl shadow border border-admin-border">
        <p className="text-sm text-admin-text-secondary">{title}</p>
        <div className="flex items-baseline space-x-2">
            <p className="text-4xl font-bold text-admin-text-primary mt-1">{value}</p>
            {change && <span className={`text-sm font-semibold ${change.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>{change}</span>}
        </div>
    </div>
);

const BarChart: React.FC<{ title: string; data: { label: string; value: number }[] }> = ({ title, data }) => {
    const maxValue = Math.max(...data.map(d => d.value), 1);
    return (
        <div className="bg-admin-card p-6 rounded-xl shadow h-full border border-admin-border">
            <h3 className="text-lg font-bold text-admin-text-primary mb-4">{title}</h3>
            <div className="space-y-4">
                {data.map(({ label, value }) => (
                    <div key={label} className="grid grid-cols-[80px_1fr_40px] items-center gap-4">
                        <div className="text-xs text-admin-text-secondary truncate text-right">{label}</div>
                        <div className="flex-1 bg-admin-bg rounded-full h-4">
                            <div className="bg-admin-accent h-4 rounded-full transition-all duration-500 ease-out" style={{ width: `${(value / maxValue) * 100}%` }} />
                        </div>
                        <div className="text-sm font-semibold text-admin-text-primary text-right">{value}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const TopList: React.FC<{ title: string; items: { name: string; value: string | number }[] }> = ({ title, items }) => (
     <div className="bg-admin-card p-6 rounded-xl shadow border border-admin-border">
        <h3 className="text-lg font-bold text-admin-text-primary mb-4">{title}</h3>
        <ul className="space-y-3">
            {items.map((item, index) => (
                <li key={index} className="flex justify-between items-center text-sm border-b border-admin-border pb-2 last:border-b-0">
                    <span className="text-admin-text-secondary">{index + 1}. {item.name}</span>
                    <span className="font-bold text-admin-text-primary">{item.value}</span>
                </li>
            ))}
             {items.length === 0 && <p className="text-xs text-center text-admin-text-secondary">Not enough data.</p>}
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
        <div className="bg-admin-card p-6 rounded-xl shadow border border-admin-border mt-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-admin-text-primary">Customer Activity Report</h3>
                <div className="flex p-1 bg-admin-bg rounded-full text-xs">
                    {(['today', 'week', 'month', 'year'] as Period[]).map(p => (
                        <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1 rounded-full capitalize ${period === p ? 'bg-admin-accent' : ''}`}>{p}</button>
                    ))}
                </div>
            </div>
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr>
                            <th className="p-3 cursor-pointer" onClick={() => requestSort('name')}>Name</th>
                            <th className="p-3 cursor-pointer text-right" onClick={() => requestSort('bookings')}>Bookings</th>
                            <th className="p-3 cursor-pointer text-right" onClick={() => requestSort('spend')}>Total Spend</th>
                        </tr>
                    </thead>
                    <tbody>
                        {customerReportData.filter(c => c.bookings > 0).map(customer => (
                            <tr key={customer.id} className="border-t border-admin-border hover:bg-admin-bg">
                                <td className="p-3">
                                    <p className="font-semibold">{customer.name}</p>
                                    <p className="text-xs text-admin-text-secondary">{customer.email}</p>
                                </td>
                                <td className="p-3 text-right font-mono">{customer.bookings}</td>
                                <td className="p-3 text-right font-mono text-green-400">₱{customer.spend.toLocaleString()}</td>
                            </tr>
                        ))}
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
        const totalCustomers = customers.length;
        const totalMechanics = mechanics.filter(m => m.status === 'Active').length;
        const completedBookings = bookings.filter(b => b.status === 'Completed');
        const totalBookingRevenue = completedBookings.reduce((sum, b) => sum + b.service.price, 0);
        const totalOrderRevenue = orders.reduce((sum, o) => sum + o.total, 0);
        const totalRevenue = totalBookingRevenue + totalOrderRevenue;
        const bookingsByMonth = bookings.reduce((acc, booking) => { const date = new Date(booking.date.replace(/-/g, '/')); const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; acc[monthKey] = (acc[monthKey] || 0) + 1; return acc; }, {} as Record<string, number>);
        const chartData = (Object.entries(bookingsByMonth) as [string, number][]).map(([monthKey, value]) => { const date = new Date(`${monthKey}-02`); const label = date.toLocaleString('default', { month: 'short', year: 'numeric' }); return { label, value, date }; }).sort((a,b) => a.date.getTime() - b.date.getTime()).map(({ label, value }) => ({ label, value })).slice(-6);
        const mechanicPerformance = completedBookings.filter(b => b.mechanic).reduce((acc, booking) => { const mechId = booking.mechanic!.id; acc[mechId] = (acc[mechId] || 0) + 1; return acc; }, {} as Record<string, number>);
        const topMechanics = (Object.entries(mechanicPerformance) as [string, number][]).sort((a, b) => Number(b[1]) - Number(a[1])).slice(0, 5).map(([id, count]) => ({ name: mechanics.find(m => m.id === id)?.name || 'Unknown', value: `${count} jobs` }));
        const servicePopularity = bookings.reduce((acc, booking) => { const serviceId = booking.service.id; acc[serviceId] = (acc[serviceId] || 0) + 1; return acc; }, {} as Record<string, number>);
        const popularServices = (Object.entries(servicePopularity) as [string, number][]).sort((a, b) => Number(b[1]) - Number(a[1])).slice(0, 5).map(([id, count]) => ({ name: services.find(s => s.id === id)?.name || 'Unknown', value: `${count} bookings` }));
        return { totalCustomers, totalMechanics, completedBookingsCount: completedBookings.length, totalRevenue, bookingsByMonth: chartData, topMechanics, popularServices };
    }, [db]);

    if (loading || !db || !analyticsData) {
        return <div className="flex items-center justify-center h-full"><Spinner size="lg" color="text-white" /></div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Analytics</h1>
                <p className="mt-1 text-admin-text-secondary">Key performance indicators for your platform.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Users" value={analyticsData.totalCustomers} change="+5.2%" />
                <StatCard title="Active Mechanics" value={analyticsData.totalMechanics} change="+2" />
                <StatCard title="Completed Jobs" value={analyticsData.completedBookingsCount} change="+12%" />
                <StatCard title="Total Revenue" value={`₱${(analyticsData.totalRevenue/1000).toFixed(1)}k`} change="+8.1%" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <BarChart title="Bookings per Month (Last 6)" data={analyticsData.bookingsByMonth} />
                </div>
                <div className="space-y-6">
                    <TopList title="Top Performing Mechanics" items={analyticsData.topMechanics} />
                    <TopList title="Most Popular Services" items={analyticsData.popularServices} />
                </div>
            </div>
            <CustomerActivityReport />
        </div>
    );
};

export default AdminAnalyticsScreen;