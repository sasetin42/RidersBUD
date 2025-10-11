import React, { useMemo } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import Spinner from '../../components/Spinner';

const StatCard: React.FC<{ title: string; value: string | number; change?: string; }> = ({ title, value, change }) => (
    <div className="bg-secondary p-6 rounded-lg shadow">
        <p className="text-sm text-light-gray">{title}</p>
        <div className="flex items-baseline space-x-2">
            <p className="text-4xl font-bold text-white mt-1">{value}</p>
            {change && <span className={`text-sm font-semibold ${change.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>{change}</span>}
        </div>
    </div>
);

const BarChart: React.FC<{ title: string; data: { label: string; value: number }[] }> = ({ title, data }) => {
    const maxValue = Math.max(...data.map(d => d.value), 1);
    return (
        <div className="bg-secondary p-6 rounded-lg shadow">
            <h3 className="text-lg font-bold text-white mb-4">{title}</h3>
            <div className="space-y-4">
                {data.map(({ label, value }) => (
                    <div key={label} className="flex items-center">
                        <div className="w-24 text-xs text-light-gray truncate">{label}</div>
                        <div className="flex-1 bg-field rounded-full h-4 mr-2">
                            <div
                                className="bg-primary h-4 rounded-full"
                                style={{ width: `${(value / maxValue) * 100}%` }}
                            />
                        </div>
                        <div className="w-8 text-sm font-semibold text-white text-right">{value}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const TopList: React.FC<{ title: string; items: { name: string; value: string | number }[] }> = ({ title, items }) => (
     <div className="bg-secondary p-6 rounded-lg shadow">
        <h3 className="text-lg font-bold text-white mb-4">{title}</h3>
        <ul className="space-y-3">
            {items.map((item, index) => (
                <li key={index} className="flex justify-between items-center text-sm">
                    <span className="text-light-gray">{index + 1}. {item.name}</span>
                    <span className="font-bold text-white">{item.value}</span>
                </li>
            ))}
        </ul>
    </div>
)

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

        const bookingsByMonth = bookings.reduce((acc, booking) => {
            const date = new Date(booking.date);
            // Use YYYY-MM as a reliable key for grouping and sorting by month.
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            acc[monthKey] = (acc[monthKey] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        const chartData = (Object.entries(bookingsByMonth) as [string, number][])
            // Parse the reliable monthKey and create a user-friendly label.
            .map(([monthKey, value]) => {
                const date = new Date(`${monthKey}-02`); // Use day 2 to avoid timezone issues
                const label = date.toLocaleString('default', { month: 'short', year: 'numeric' });
                return { label, value, date };
            })
            // This sort will now work correctly without runtime errors or potential type errors.
            .sort((a,b) => a.date.getTime() - b.date.getTime())
            .map(({ label, value }) => ({ label, value }))
            .slice(-6);

        const mechanicPerformance = completedBookings
            .filter(b => b.mechanic)
            .reduce((acc, booking) => {
                const mechId = booking.mechanic!.id;
                acc[mechId] = (acc[mechId] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

        const topMechanics = (Object.entries(mechanicPerformance) as [string, number][])
            .sort((a, b) => Number(b[1]) - Number(a[1]))
            .slice(0, 5)
            .map(([id, count]) => ({ 
                name: mechanics.find(m => m.id === id)?.name || 'Unknown', 
                value: `${count} jobs` 
            }));
            
        const servicePopularity = bookings
            .reduce((acc, booking) => {
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
            popularServices
        };

    }, [db]);

    if (loading || !db || !analyticsData) {
        return <div className="flex items-center justify-center h-full bg-dark-gray"><Spinner size="lg" color="text-white" /></div>;
    }

    return (
        <div className="text-white h-full flex flex-col p-6 lg:p-8 overflow-y-auto bg-dark-gray">
             <div className="flex-shrink-0 mb-6">
                <h1 className="text-4xl font-bold">Analytics</h1>
                <p className="text-light-gray mt-1">Key performance indicators for your platform.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Users" value={analyticsData.totalCustomers} change="+5.2%" />
                <StatCard title="Active Mechanics" value={analyticsData.totalMechanics} change="+2" />
                <StatCard title="Completed Jobs" value={analyticsData.completedBookingsCount} change="+12%" />
                <StatCard title="Total Revenue" value={`₱${analyticsData.totalRevenue.toLocaleString()}`} change="+8.1%" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 flex-grow">
                <div className="lg:col-span-1">
                     <BarChart title="Bookings per Month (Last 6)" data={analyticsData.bookingsByMonth} />
                </div>
                <div className="lg:col-span-1">
                    <TopList title="Top Performing Mechanics" items={analyticsData.topMechanics} />
                </div>
                <div className="lg:col-span-1">
                    <TopList title="Most Popular Services" items={analyticsData.popularServices} />
                </div>
            </div>
        </div>
    );
};

export default AdminAnalyticsScreen;