import React, { useMemo, useState } from 'react';
import Header from '../../components/Header';
import { Booking } from '../../types';
import Spinner from '../../components/Spinner';
import { useDatabase } from '../../context/DatabaseContext';
import { useMechanicAuth } from '../../context/MechanicAuthContext';

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; }> = ({ title, value, icon }) => (
    <div className="bg-dark-gray p-4 rounded-lg">
        <div className="flex items-center gap-3">
            <div className="bg-primary/20 text-primary p-3 rounded-full">
                {icon}
            </div>
            <div>
                <p className="text-2xl font-bold text-white">{value}</p>
                <p className="text-xs text-light-gray">{title}</p>
            </div>
        </div>
    </div>
);

const BarChart: React.FC<{ data: { label: string; value: number }[] }> = ({ data }) => {
    const maxValue = Math.max(...data.map(d => d.value), 1); // Avoid division by zero
    return (
        <div className="bg-dark-gray p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-4">Last 7 Days Earnings</h3>
            <div className="flex justify-between items-end h-32 space-x-2">
                {data.map(({ label, value }) => (
                    <div key={label} className="flex-1 flex flex-col items-center justify-end" title={`₱${value.toLocaleString()}`}>
                        <div className="text-xs text-white mb-1">₱{value > 999 ? `${(value/1000).toFixed(1)}k` : value}</div>
                        <div
                            className="w-full bg-primary rounded-t-sm hover:bg-orange-600 transition-colors"
                            style={{ height: `${(value / maxValue) * 100}%` }}
                        />
                        <div className="text-xs text-light-gray mt-1">{label}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};


const EarningItemCard: React.FC<{ booking: Booking }> = ({ booking }) => {
    return (
        <div className="bg-field p-3 rounded-lg flex justify-between items-center">
            <div>
                <p className="font-semibold text-white text-sm">{booking.service.name}</p>
                <p className="text-xs text-light-gray">{booking.customerName}</p>
            </div>
            <div className="text-right">
                <p className="font-bold text-lg text-green-400">+ ₱{booking.service.price.toLocaleString()}</p>
                 {booking.isPaid === false ? (
                     <span className="text-xs font-semibold bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full">Pending Payment</span>
                ) : (
                     <span className="text-xs font-semibold bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full">Paid</span>
                )}
            </div>
        </div>
    );
};


const MechanicEarningsScreen: React.FC = () => {
    const { db, loading } = useDatabase();
    const { mechanic } = useMechanicAuth();
    const [filter, setFilter] = useState<'week' | 'month' | 'all'>('week');
    
    const { 
        earningsInPeriod, 
        jobsInPeriodCount, 
        avgJobValue, 
        groupedJobHistory, 
        chartData 
    } = useMemo(() => {
        if (!mechanic || !db) {
            return { earningsInPeriod: 0, jobsInPeriodCount: 0, avgJobValue: 0, groupedJobHistory: {}, chartData: [] };
        }

        const myCompletedJobs = db.bookings
            .filter(b => b.mechanic?.id === mechanic.id && b.status === 'Completed')
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let filteredJobs = myCompletedJobs;
        if (filter === 'week') {
            const oneWeekAgo = new Date(today);
            oneWeekAgo.setDate(today.getDate() - 6); // Include today + 6 past days
            filteredJobs = myCompletedJobs.filter(job => new Date(job.date.replace(/-/g, '/')) >= oneWeekAgo);
        } else if (filter === 'month') {
            filteredJobs = myCompletedJobs.filter(job => 
                new Date(job.date.replace(/-/g, '/')).getMonth() === today.getMonth() && 
                new Date(job.date.replace(/-/g, '/')).getFullYear() === today.getFullYear()
            );
        }

        const paidJobsInPeriod = filteredJobs.filter(job => job.isPaid !== false);
        const earnings = paidJobsInPeriod.reduce((sum, job) => sum + job.service.price, 0);
        const jobsCount = filteredJobs.length;
        const avgValue = paidJobsInPeriod.length > 0 ? earnings / paidJobsInPeriod.length : 0;
        
        const last7Days = Array.from({ length: 7 }).map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d;
        }).reverse();

        const dailyEarnings = last7Days.map(day => {
            const dayStr = day.toISOString().split('T')[0];
            const earningsForDay = myCompletedJobs
                .filter(job => job.date === dayStr && job.isPaid !== false)
                .reduce((sum, job) => sum + job.service.price, 0);
            return {
                label: day.toLocaleDateString('en-US', { weekday: 'short' }),
                value: earningsForDay
            };
        });

        const groupedHistory = filteredJobs.reduce((acc, job) => {
            const date = new Date(job.date.replace(/-/g, '/')).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            if (!acc[date]) acc[date] = [];
            acc[date].push(job);
            return acc;
        }, {} as Record<string, Booking[]>);


        return { 
            earningsInPeriod: earnings,
            jobsInPeriodCount: jobsCount,
            avgJobValue: avgValue,
            groupedJobHistory: groupedHistory,
            chartData: dailyEarnings
        };
    }, [db, mechanic, filter]);


    if (loading || !db || !mechanic) {
        return (
            <div className="flex flex-col h-full bg-secondary">
                <Header title="My Earnings" />
                <div className="flex-grow flex items-center justify-center">
                    <Spinner size="lg" />
                </div>
            </div>
        );
    }
    
    const filterOptions: { id: 'week' | 'month' | 'all', label: string }[] = [
        { id: 'week', label: 'This Week' },
        { id: 'month', label: 'This Month' },
        { id: 'all', label: 'All Time' }
    ];

    return (
        <div className="flex flex-col h-full bg-secondary">
            <Header title="My Earnings" />
            
            <main className="flex-grow overflow-y-auto p-4 space-y-6">
                <div className="flex justify-center p-1 bg-field rounded-full">
                    {filterOptions.map(option => (
                        <button 
                            key={option.id}
                            onClick={() => setFilter(option.id)}
                            className={`flex-1 text-center text-sm font-semibold py-2 rounded-full transition-colors ${filter === option.id ? 'bg-primary text-white' : 'text-light-gray'}`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <StatCard 
                        title="Paid Earnings in Period"
                        value={`₱${earningsInPeriod.toLocaleString()}`}
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
                    />
                     <StatCard 
                        title="Jobs Completed"
                        value={jobsInPeriodCount}
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6-6H3.5A2.5 2.5 0 001 4.5v15A2.5 2.5 0 003.5 22h17a2.5 2.5 0 002.5-2.5v-15A2.5 2.5 0 0020.5 2H15" /></svg>}
                    />
                    <div className="col-span-1 sm:col-span-2">
                         <StatCard 
                            title="Average Paid Job Value"
                            value={`₱${avgJobValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 2v.01" /></svg>}
                        />
                    </div>
                </div>

                <BarChart data={chartData} />
                
                <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Transaction History</h3>
                    {Object.keys(groupedJobHistory).length > 0 ? (
                        <div className="space-y-4">
                            {Object.entries(groupedJobHistory).map(([date, bookingsForDate]) => (
                                <div key={date}>
                                    <h4 className="text-sm font-semibold text-light-gray mb-2 sticky top-0 bg-secondary py-1">{date}</h4>
                                    <div className="space-y-2">
                                        {(bookingsForDate as Booking[]).map(job => <EarningItemCard key={job.id} booking={job} />)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-light-gray text-sm py-8 bg-dark-gray rounded-lg">No earnings in this period.</p>
                    )}
                </div>
            </main>
        </div>
    );
};

export default MechanicEarningsScreen;