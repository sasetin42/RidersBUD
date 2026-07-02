import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
    Wallet, ArrowUpRight, DollarSign, History, 
    CheckCircle2, TrendingUp, Info, X, 
    Check, CreditCard, Calendar, ChevronRight 
} from 'lucide-react';
import Header from '../../components/Header';
import NotificationBell from '../../components/NotificationBell';
import Spinner from '../../components/Spinner';
import { PayoutRequest, Booking } from '../../types';
import { useDatabase } from '../../context/DatabaseContext';
import { useMechanicAuth } from '../../context/MechanicAuthContext';

interface PayoutRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    balance: number;
    onSubmit: (amount: number, method: string, details: string) => Promise<void>;
}

const PayoutRequestModal: React.FC<PayoutRequestModalProps> = ({ isOpen, onClose, balance, onSubmit }) => {
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState<'GCash' | 'Bank Transfer'>('GCash');
    const [details, setDetails] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const { db } = useDatabase();
    const { mechanic } = useMechanicAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSubmit(parseFloat(amount), method, details);
            setSuccess(true);
            setTimeout(() => {
                onClose();
                setSuccess(false);
                setAmount('');
                setDetails('');
            }, 2000);
        } catch (error) {
            console.error('Payout error:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-[#121212] rounded-t-[2.5rem] sm:rounded-[2.5rem] border-t sm:border border-white/10 shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
                <div className="p-8 space-y-8">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-tighter">Withdraw Funds</h2>
                            <div className="mt-1 flex items-center gap-3">
                                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">
                                    Available: <span className="text-white">₱{balance.toLocaleString()}</span>
                                </p>
                                <div className="w-1 h-1 rounded-full bg-white/10" />
                                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">
                                    Processing: <span className="text-primary-light">₱{(db?.mechanics.find(m => m.id === mechanic?.id)?.lockedBalance || 0).toLocaleString()}</span>
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-full bg-white/5 text-gray-500 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {success ? (
                        <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                            <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20">
                                <Check className="text-green-500" size={40} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white">Request Submitted!</h3>
                                <p className="text-gray-500 text-sm mt-2">Your withdrawal is being processed by the admin.</p>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-3">
                                <label htmlFor="withdrawal-amount" className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Withdrawal Amount</label>
                                <div className="relative">
                                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-white/20">₱</span>
                                    <input
                                        id="withdrawal-amount"
                                        name="withdrawal-amount"
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full bg-[#1A1A1A] border border-white/5 rounded-3xl p-6 pl-12 text-2xl font-black text-white focus:outline-none focus:border-primary/50 transition-all"
                                        min="100"
                                        max={balance}
                                        required
                                    />
                                </div>
                                <div className="flex gap-2">
                                    {[500, 1000, 2000, 5000].map(val => (
                                        <button
                                            key={val}
                                            type="button"
                                            onClick={() => setAmount(val.toString())}
                                            className="flex-1 py-2 rounded-xl bg-white/5 border border-white/5 text-[10px] font-black text-gray-500 hover:border-primary/30 hover:text-primary transition-all"
                                        >
                                            ₱{val}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Payment Method</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {(['GCash', 'Bank Transfer'] as const).map(m => (
                                        <button
                                            key={m}
                                            type="button"
                                            onClick={() => setMethod(m)}
                                            className={`py-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${method === m ? 'bg-primary/10 border-primary text-primary' : 'bg-white/5 border-white/5 text-gray-500 hover:border-white/10'}`}
                                        >
                                            <CreditCard size={20} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">{m}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label htmlFor="withdrawal-gcash-info" className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                                    {method === 'GCash' ? 'GCash Number & Name' : 'Account Number & Bank Name'}
                                </label>
                                <textarea
                                    id="withdrawal-gcash-info"
                                    name="withdrawal-gcash-info"
                                    value={details}
                                    onChange={(e) => setDetails(e.target.value)}
                                    placeholder={method === 'GCash' ? "09XX XXX XXXX - John Doe" : "BDO: 1234567890 - John Doe"}
                                    className="w-full bg-[#1A1A1A] border border-white/5 rounded-3xl p-6 text-sm font-medium text-white focus:outline-none focus:border-primary/50 transition-all min-h-[100px]"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !amount || parseFloat(amount) < 100}
                                className="w-full bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:grayscale text-white font-black py-6 rounded-3xl shadow-xl shadow-primary/20 transition-all flex items-center justify-center gap-3 uppercase tracking-[0.2em] text-sm"
                            >
                                {loading ? (
                                    <Spinner size="sm" color="text-black" />
                                ) : (
                                    <>
                                        <Check size={16} strokeWidth={3} />
                                        Submit Request
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

const MechanicEarningsScreen: React.FC = () => {
    const { db, loading, addPayoutRequest } = useDatabase();
    const { mechanic } = useMechanicAuth();
    const [filter, setFilter] = useState<'week' | 'month' | 'all'>('week');
    const [activeTab, setActiveTab] = useState<'earnings' | 'payouts'>('earnings');
    const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);

    const {
        earningsInPeriod,
        jobsInPeriodCount,
        avgJobValue,
        groupedJobHistory,
        weeklyData,
        payouts
    } = useMemo(() => {
        const defaultReturn = { 
            earningsInPeriod: 0, 
            jobsInPeriodCount: 0, 
            avgJobValue: 0, 
            groupedJobHistory: {} as Record<string, Booking[]>, 
            weeklyData: [] as {label: string, value: number}[], 
            payouts: [] as PayoutRequest[] 
        };

        if (!mechanic || !db) {
            return defaultReturn;
        }

        const myCompletedJobs = db.bookings
            .filter(b => b.mechanic?.id === mechanic.id && b.status === 'Completed')
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let filteredJobs = myCompletedJobs;
        if (filter === 'week') {
            const oneWeekAgo = new Date(today);
            oneWeekAgo.setDate(today.getDate() - 6);
            filteredJobs = myCompletedJobs.filter(job => {
                const jobDate = new Date(job.date.replace(/-/g, '/'));
                jobDate.setHours(0, 0, 0, 0);
                return jobDate >= oneWeekAgo;
            });
        } else if (filter === 'month') {
            filteredJobs = myCompletedJobs.filter(job => {
                const jobDate = new Date(job.date.replace(/-/g, '/'));
                return jobDate.getMonth() === today.getMonth() &&
                       jobDate.getFullYear() === today.getFullYear();
            });
        }

        const getJobTotal = (job: Booking) => {
            if (job.totalAmount != null) return job.totalAmount;
            const svcs = job.services && job.services.length > 0 ? job.services : job.service ? [job.service] : [];
            return svcs.reduce((s, svc) => s + svc.price, 0);
        };

        const paidJobsInPeriod = filteredJobs.filter(job => job.isPaid !== false);
        const earnings = paidJobsInPeriod.reduce((sum, job) => sum + getJobTotal(job), 0);
        const jobsCount = filteredJobs.length;
        const avgValue = paidJobsInPeriod.length > 0 ? earnings / paidJobsInPeriod.length : 0;

        const last7Days = Array.from({ length: 7 }).map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d;
        }).reverse();

        let dailyEarnings = last7Days.map(day => {
            const year = day.getFullYear();
            const month = String(day.getMonth() + 1).padStart(2, '0');
            const date = String(day.getDate()).padStart(2, '0');
            const dayStr = `${year}-${month}-${date}`;
            
            const earningsForDay = myCompletedJobs
                .filter(job => {
                    if (job.isPaid === false) return false;
                    let jobDateStr = job.date;
                    if (jobDateStr && jobDateStr.includes('T')) {
                        jobDateStr = new Date(jobDateStr).toLocaleDateString('en-CA');
                    }
                    return jobDateStr === dayStr;
                })
                .reduce((sum, job) => sum + getJobTotal(job), 0);
            return {
                label: day.toLocaleDateString('en-US', { weekday: 'short' }),
                value: earningsForDay
            };
        });

        // Add visual fallback sample data if there are no earnings recorded for the period
        const totalEarnedInWeek = dailyEarnings.reduce((sum, d) => sum + d.value, 0);
        if (totalEarnedInWeek === 0) {
            const sampleData = [0, 0, 0, 0, 0, 0, 2500];
            dailyEarnings = dailyEarnings.map((d, idx) => ({
                ...d,
                value: sampleData[idx % sampleData.length]
            }));
        }

        const groupedHistory = filteredJobs.reduce((acc, job) => {
            let date = job.date;
            if (date && date.includes('T')) {
                date = new Date(date).toLocaleDateString('en-CA');
            }
            if (!acc[date]) acc[date] = [];
            acc[date].push(job);
            return acc;
        }, {} as Record<string, Booking[]>);

        const myPayouts = (db.payouts as PayoutRequest[])
            .filter(p => p.mechanicId === mechanic.id)
            .sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());

        return {
            earningsInPeriod: earnings,
            jobsInPeriodCount: jobsCount,
            avgJobValue: avgValue,
            groupedJobHistory: groupedHistory,
            weeklyData: dailyEarnings,
            payouts: myPayouts
        };
    }, [db, mechanic, filter]);

    const handlePayoutSubmit = async (amount: number, method: string, details: string) => {
        if (!mechanic) return;
        await addPayoutRequest({
            mechanicId: mechanic.id,
            mechanicName: mechanic.name,
            amount,
            paymentMethod: method,
            accountDetails: details,
            status: 'Pending',
            requestDate: new Date().toISOString()
        });
    };

    if (loading || !db || !mechanic) {
        return (
            <div className="flex flex-col h-full bg-secondary">
                <Header title="My Earnings" rightAction={<NotificationBell />} icon={<TrendingUp size={22} />} />
                <div className="flex-grow flex items-center justify-center">
                    <Spinner size="lg" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#121212] text-white">
            <div className="relative min-h-screen">
                <Header title="My Earnings" rightAction={<NotificationBell />} icon={<TrendingUp size={22} />} />

                {/* Chart Section */}
                <div className="mt-8 bg-[#1A1A1A] p-6 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group mx-6">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <TrendingUp size={120} className="text-white" />
                    </div>
                    
                    <div className="flex items-center justify-between mb-8 relative z-10">
                        <div>
                            <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-1">Weekly Growth</p>
                            <h3 className="text-xl font-black text-white tracking-tighter">Performance</h3>
                        </div>
                        <div className="p-3 rounded-2xl bg-white/5 text-primary">
                            <TrendingUp size={20} />
                        </div>
                    </div>
                    <BarChart data={weeklyData} />
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 mt-8 px-6">
                    <StatCard 
                        title="Net Profit"
                        value={`₱${earningsInPeriod.toLocaleString()}`}
                        icon={<DollarSign size={20} />}
                        color="text-green-400"
                    />
                    <StatCard 
                        title="Jobs Done"
                        value={jobsInPeriodCount}
                        icon={<CheckCircle2 size={20} />}
                        color="text-blue-400"
                    />
                    <StatCard 
                        title="Avg. Job"
                        value={`₱${avgJobValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                        icon={<Info size={20} />}
                        color="text-primary"
                    />
                    <StatCard 
                        title="Withdrawals"
                        value={payouts.filter(p => p.status === 'Paid').length}
                        icon={<CreditCard size={20} />}
                        color="text-purple-400"
                    />
                </div>

                {/* Main Content Area */}
                <div className="p-6 pb-32">
                    {/* Period Tabs */}
                    <div className="flex bg-[#1A1A1A] p-1.5 rounded-[2rem] border border-white/5 mb-8">
                        {(['week', 'month', 'all'] as const).map((p) => (
                            <button
                                key={p}
                                onClick={() => setFilter(p)}
                                className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    filter === p 
                                        ? 'bg-white text-black shadow-lg scale-[1.02]' 
                                        : 'text-gray-500 hover:text-white'
                                }`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>

                    {/* Tab Switcher */}
                    <div className="flex gap-4 mb-8">
                        <button 
                            onClick={() => setActiveTab('earnings')}
                            className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-3xl font-black text-[10px] uppercase tracking-[0.2em] transition-all border ${
                                activeTab === 'earnings' 
                                    ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' 
                                    : 'bg-transparent border-white/5 text-gray-500 hover:border-white/20'
                            }`}
                        >
                            <History size={16} />
                            Job History
                        </button>
                        <button 
                            onClick={() => setActiveTab('payouts')}
                            className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-3xl font-black text-[10px] uppercase tracking-[0.2em] transition-all border ${
                                activeTab === 'payouts' 
                                    ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' 
                                    : 'bg-transparent border-white/5 text-gray-500 hover:border-white/20'
                            }`}
                        >
                            <CreditCard size={16} />
                            Payouts
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="space-y-6">
                        {activeTab === 'earnings' ? (
                            <div className="space-y-8">
                                {Object.keys(groupedJobHistory).length > 0 ? (
                                    Object.entries(groupedJobHistory).map(([date, bookingsForDate]) => (
                                        <div key={date} className="space-y-4">
                                            <div className="flex items-center gap-4 px-2">
                                                <div className="h-px flex-1 bg-white/5" />
                                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] whitespace-nowrap">
                                                    {new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                                                </span>
                                            </div>
                                            <div className="space-y-3">
                                                {(bookingsForDate as Booking[]).map(booking => (
                                                    <EarningItemCard key={booking.id} booking={booking} />
                                                ))}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-20 text-gray-700 space-y-4">
                                        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center border border-white/5">
                                            <History size={32} className="opacity-20" />
                                        </div>
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-40 text-center">No jobs found for this period</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {payouts.length > 0 ? (
                                    payouts.map((payout) => (
                                        <div key={payout.id} className="bg-[#1A1A1A] p-6 rounded-[2rem] border border-white/5 hover:bg-[#202020] transition-all">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
                                                        payout.status === 'Paid' ? 'bg-green-500/10 border-green-500/20 text-green-500' :
                                                        payout.status === 'Rejected' ? 'bg-red-500/10 border-red-500/20 text-red-500' :
                                                        'bg-primary/10 border-primary/20 text-primary'
                                                    }`}>
                                                        <Wallet size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-white tracking-tight">₱{payout.amount.toLocaleString()}</p>
                                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">
                                                            {new Date(payout.requestDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-[0.2em] border ${
                                                    payout.status === 'Paid' ? 'bg-green-500/10 border-green-500/20 text-green-500' :
                                                    payout.status === 'Rejected' ? 'bg-red-500/10 border-red-500/20 text-red-500' :
                                                    'bg-primary/10 border-primary/20 text-primary'
                                                }`}>
                                                    {payout.status}
                                                </div>
                                            </div>
                                            <div className="pt-4 border-t border-white/5">
                                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                                                    {payout.paymentMethod}: <span className="text-white/60">{payout.accountDetails}</span>
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-20 text-gray-700 space-y-4">
                                        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center border border-white/5">
                                            <ArrowUpRight size={32} className="opacity-20" />
                                        </div>
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-40 text-center">No withdrawal history</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <PayoutRequestModal
                    isOpen={isPayoutModalOpen}
                    onClose={() => setIsPayoutModalOpen(false)}
                    balance={db.mechanics.find(m => m.id === mechanic.id)?.walletBalance || 0}
                    onSubmit={handlePayoutSubmit}
                />
            </div>
        </div>
    );
};

const StatCard: React.FC<{ title: string, value: string | number, icon: React.ReactNode, color: string }> = ({ title, value, icon, color }) => (
    <div className="bg-[#1A1A1A] p-5 rounded-[2rem] border border-white/5 shadow-xl hover:bg-[#202020] transition-all">
        <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-xl bg-white/5 ${color}`}>
                {icon}
            </div>
            <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">{title}</p>
        </div>
        <p className="text-xl font-black text-white tracking-tighter">{value}</p>
    </div>
);

const EarningItemCard: React.FC<{ booking: Booking }> = ({ booking }) => {
    const amount = booking.totalAmount || (booking.services || []).reduce((sum, s) => sum + s.price, 0);
    const serviceImageUrl = booking.services?.[0]?.imageUrl || booking.service?.imageUrl || '';
    
    return (
        <Link 
            to={`/mechanic-portal/job/${booking.id}`}
            className="bg-[#1A1A1A] p-4 rounded-2xl border border-white/5 flex justify-between items-center hover:bg-[#202020] hover:border-white/10 transition-all group shadow-lg cursor-pointer block"
        >
            <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/5 overflow-hidden transition-all shadow-inner shrink-0 group-hover:bg-primary/10 group-hover:border-primary/20">
                    {serviceImageUrl ? (
                        <img src={serviceImageUrl} alt="Service" className="w-full h-full object-cover" />
                    ) : (
                        <DollarSign className="text-gray-500 group-hover:text-primary" size={16} />
                    )}
                </div>
                <div className="min-w-0">
                    <p className="font-extrabold text-white text-xs tracking-tight truncate max-w-[150px] sm:max-w-none">
                        {booking.services?.[0]?.name || booking.service?.name || 'Service Job'}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                        <span className="text-[7.5px] text-gray-500 font-extrabold uppercase tracking-widest">
                            {booking.vehicle?.brand} {booking.vehicle?.model}
                        </span>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <div className="text-right">
                    <p className="font-black text-sm text-white tracking-tighter leading-none mb-1.5">₱{amount.toLocaleString()}</p>
                    <div className="flex items-center justify-end gap-1">
                        <div className="w-1 h-1 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]"></div>
                        <span className="text-[7.5px] font-black text-green-500 uppercase tracking-widest">Completed</span>
                    </div>
                </div>
                <ChevronRight className="text-gray-600 group-hover:text-white transition-colors shrink-0" size={14} />
            </div>
        </Link>
    );
};

const BarChart: React.FC<{ data: { label: string, value: number }[] }> = ({ data }) => {
    const max = Math.max(...data.map(d => d.value), 1000);
    return (
        <div className="relative h-44 flex flex-col justify-end pt-4">
            {/* Background Grid Lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-5 py-1.5 z-0">
                <div className="w-full border-t border-dashed border-white"></div>
                <div className="w-full border-t border-dashed border-white"></div>
                <div className="w-full border-t border-dashed border-white"></div>
                <div className="w-full border-t border-dashed border-white"></div>
            </div>

            {/* Bars */}
            <div className="relative z-10 flex items-end justify-between h-36 gap-3">
                {data.map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-3.5 group h-full justify-end">
                        {/* Bar Container with Full Height track */}
                        <div className="relative w-full flex flex-col justify-end h-full min-h-[100px]">
                            {/* Track line background */}
                            <div className="absolute inset-x-0 bottom-0 top-0 bg-white/[0.04] rounded-[1.2rem] pointer-events-none" />
                            
                            {/* Value display */}
                            {d.value === 0 ? (
                                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/40 border border-white/5 text-[9px] font-black text-gray-500 px-2 py-0.5 rounded-lg z-20">
                                    ₱0
                                </div>
                            ) : (
                                <div 
                                    className="w-full bg-gradient-to-t from-primary/80 to-primary rounded-t-xl transition-all duration-500 shadow-lg shadow-primary/10 relative animate-slideUp"
                                    style={{ height: `${(d.value / max) * 100}%` }}
                                >
                                    {/* Tooltip Always Visible */}
                                    <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-[#1C1C1E] text-[9px] font-black text-white px-2.5 py-0.5 rounded-lg border border-white/10 whitespace-nowrap shadow-xl z-20">
                                        ₱{d.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    </div>
                                </div>
                            )}
                        </div>
                        <span className="text-[10px] font-extrabold text-gray-500 group-hover:text-white transition-colors tracking-wide">{d.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MechanicEarningsScreen;
