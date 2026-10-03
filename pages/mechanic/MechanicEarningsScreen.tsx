import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { db as firestore } from '../../firebase';
import { 
    Wallet, ArrowUpRight, DollarSign, History, 
    CheckCircle2, TrendingUp, Info, X, 
    Check, CreditCard, Calendar, ChevronRight,
    Smartphone, Landmark, QrCode, AlertCircle, Sparkles,
    ShieldCheck, Clock, RefreshCw, Layers, Trash2, AlertTriangle, RotateCcw
} from 'lucide-react';
import Header from '../../components/Header';
import NotificationBell from '../../components/NotificationBell';
import Spinner from '../../components/Spinner';
import { PayoutRequest, Booking, Mechanic, PayoutDetails } from '../../types';
import { useDatabase } from '../../context/DatabaseContext';
import { useMechanicAuth } from '../../context/MechanicAuthContext';
import { calculateMechanicWalletLedger, getJobTotalAmount, getJobMechanicShare } from '../../utils/mechanicLedger';

interface PayoutRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    availableBalance: number;
    lockedBalance: number;
    savedDestinations: PayoutDetails[];
    onSubmit: (amount: number, method: string, details: string) => Promise<void>;
}

const PayoutRequestModal: React.FC<PayoutRequestModalProps> = ({ 
    isOpen, 
    onClose, 
    availableBalance, 
    lockedBalance,
    savedDestinations,
    onSubmit 
}) => {
    const [amount, setAmount] = useState('');
    const [selectedDestId, setSelectedDestId] = useState<string>(() => {
        const def = savedDestinations.find(d => d.isDefault) || savedDestinations[0];
        return def?.id || 'manual';
    });
    const [manualMethod, setManualMethod] = useState<'GCash' | 'Bank Transfer'>('GCash');
    const [manualDetails, setManualDetails] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const activeDestination = useMemo(() => {
        if (selectedDestId === 'manual') return null;
        return savedDestinations.find(d => d.id === selectedDestId) || null;
    }, [selectedDestId, savedDestinations]);

    const formatAmountWithCommas = (val: string): string => {
        const clean = val.replace(/[^\d.]/g, '');
        if (!clean) return '';
        const parts = clean.split('.');
        const integerPart = parts[0];
        const decimalPart = parts.length > 1 ? `.${parts[1].slice(0, 2)}` : '';
        const formattedInteger = integerPart ? parseInt(integerPart, 10).toLocaleString('en-US') : '0';
        return `${formattedInteger}${decimalPart}`;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const numAmount = parseFloat(String(amount || '0').replace(/,/g, ''));
        if (isNaN(numAmount) || numAmount < 100) {
            setError('Minimum withdrawal is ₱100.');
            return;
        }
        if (numAmount > availableBalance) {
            setError(`Amount exceeds your available balance of ₱${availableBalance.toLocaleString()}.`);
            return;
        }

        let methodString = '';
        let detailsString = '';

        if (activeDestination) {
            const isBank = activeDestination.method === 'Bank Transfer';
            methodString = isBank 
                ? `${activeDestination.bankName || 'Bank'} (Bank)` 
                : `${activeDestination.walletName || 'E-Wallet'} (E-Wallet)`;
            detailsString = `${activeDestination.accountName} - ${activeDestination.accountNumber}${activeDestination.qrCodeUrl ? ' [Has QR]' : ''}`;
        } else {
            if (!manualDetails.trim()) {
                setError('Please provide your account name and number.');
                return;
            }
            methodString = manualMethod;
            detailsString = manualDetails.trim();
        }

        setLoading(true);
        try {
            await onSubmit(numAmount, methodString, detailsString);
            setSuccess(true);
            setTimeout(() => {
                onClose();
                setSuccess(false);
                setAmount('');
                setManualDetails('');
            }, 1800);
        } catch (err: any) {
            setError(err?.message || 'Failed to submit withdrawal request.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-[#141416] rounded-t-[2.5rem] sm:rounded-[2rem] border-t sm:border border-white/10 shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
                <div className="p-6 sm:p-7 space-y-6">
                    {/* Header */}
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="p-1.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
                                    <Wallet size={16} />
                                </span>
                                <h2 className="text-xl font-black text-white tracking-tight">Withdraw Funds</h2>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] font-bold text-gray-400 mt-1">
                                <span>Available: <strong className="text-emerald-400 font-extrabold">₱{availableBalance.toLocaleString()}</strong></span>
                                <span className="w-1 h-1 rounded-full bg-white/20" />
                                <span>Processing: <strong className="text-amber-400 font-extrabold">₱{lockedBalance.toLocaleString()}</strong></span>
                            </div>
                        </div>
                        <button 
                            type="button"
                            onClick={onClose} 
                            className="p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {success ? (
                        <div className="py-10 flex flex-col items-center justify-center text-center space-y-3">
                            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
                                <Check size={32} strokeWidth={3} />
                            </div>
                            <h3 className="text-lg font-black text-white">Payout Request Submitted!</h3>
                            <p className="text-gray-400 text-xs max-w-xs">
                                Your withdrawal of <strong className="text-white">₱{parseFloat(amount || '0').toLocaleString()}</strong> is now pending admin processing.
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {error && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-xs font-bold">
                                    <AlertCircle size={15} className="shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            {/* Amount Input */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-gray-400">
                                    <label htmlFor="withdrawal-amount">Withdrawal Amount</label>
                                    <button 
                                        type="button" 
                                        onClick={() => setAmount(availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}
                                        className="text-primary hover:underline"
                                    >
                                        Withdraw Max
                                    </button>
                                </div>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black text-white/30">₱</span>
                                    <input
                                        id="withdrawal-amount"
                                        name="withdrawal-amount"
                                        type="text"
                                        inputMode="decimal"
                                        value={amount}
                                        onChange={(e) => { 
                                            const formatted = formatAmountWithCommas(e.target.value);
                                            setAmount(formatted); 
                                            setError(''); 
                                        }}
                                        placeholder="0.00"
                                        className="w-full bg-[#1C1C1F] border border-white/10 rounded-2xl p-4 pl-10 text-xl font-black text-white focus:outline-none focus:border-primary/50 transition-all placeholder:text-gray-600"
                                        required
                                    />
                                </div>
                                <div className="flex gap-2">
                                    {[500, 1000, 2000, 5000].map(val => (
                                        <button
                                            key={val}
                                            type="button"
                                            onClick={() => { setAmount(val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })); setError(''); }}
                                            className="flex-1 py-1.5 rounded-xl bg-white/5 border border-white/5 text-[10px] font-bold text-gray-400 hover:border-primary/40 hover:text-primary transition-all"
                                        >
                                            ₱{val.toLocaleString()}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Payout Destination Selector */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-gray-400">
                                    <span>Payout Destination</span>
                                    <Link to="/mechanic-portal/profile" className="text-primary hover:underline lowercase text-[10px] font-bold">
                                        manage accounts
                                    </Link>
                                </div>

                                {savedDestinations.length > 0 ? (
                                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                                        {savedDestinations.map((dest) => {
                                            const isSelected = selectedDestId === dest.id;
                                            const isBank = dest.method === 'Bank Transfer';
                                            const label = isBank ? (dest.bankName || 'Bank') : (dest.walletName || 'E-Wallet');

                                            return (
                                                <button
                                                    key={dest.id}
                                                    type="button"
                                                    onClick={() => { setSelectedDestId(dest.id); setError(''); }}
                                                    className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                                                        isSelected 
                                                            ? 'bg-primary/10 border-primary shadow-sm ring-1 ring-primary/30 text-white' 
                                                            : 'bg-[#18181A] border-white/5 hover:border-white/10 text-gray-400'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                                            isSelected ? 'bg-primary text-white' : 'bg-white/5 text-gray-400'
                                                        }`}>
                                                            {isBank ? <Landmark size={15} /> : <Smartphone size={15} />}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-xs font-black text-white truncate">{label}</p>
                                                                {dest.isDefault && (
                                                                    <span className="text-[8px] font-black px-1.5 py-0.2 rounded bg-primary/20 text-primary">PRIMARY</span>
                                                                )}
                                                                {dest.qrCodeUrl && (
                                                                    <span className="text-[8px] font-bold text-amber-400 flex items-center gap-0.5">
                                                                        <QrCode size={10} /> QR
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-[10px] text-gray-400 truncate mt-0.5">
                                                                {dest.accountName} • {dest.accountNumber}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                                        isSelected ? 'border-primary bg-primary text-white' : 'border-white/20'
                                                    }`}>
                                                        {isSelected && <Check size={10} strokeWidth={3} />}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                        <button
                                            type="button"
                                            onClick={() => { setSelectedDestId('manual'); setError(''); }}
                                            className={`w-full p-2.5 rounded-xl border text-left text-xs font-bold transition-all flex items-center justify-between ${
                                                selectedDestId === 'manual' 
                                                    ? 'bg-primary/10 border-primary text-primary' 
                                                    : 'bg-transparent border-dashed border-white/10 text-gray-400 hover:text-white'
                                            }`}
                                        >
                                            <span>+ Enter Different Account</span>
                                            {selectedDestId === 'manual' && <Check size={12} />}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="p-3 bg-white/5 border border-white/5 rounded-xl text-center">
                                        <p className="text-xs text-gray-400 mb-1 font-bold">No saved payout accounts found.</p>
                                        <Link to="/mechanic-portal/profile" className="text-xs text-primary font-black underline">
                                            Add GCash / Bank in Profile
                                        </Link>
                                    </div>
                                )}

                                {/* Manual Input Fallback */}
                                {selectedDestId === 'manual' && (
                                    <div className="space-y-3 pt-2">
                                        <div className="grid grid-cols-2 gap-2">
                                            {(['GCash', 'Bank Transfer'] as const).map(m => (
                                                <button
                                                    key={m}
                                                    type="button"
                                                    onClick={() => setManualMethod(m)}
                                                    className={`py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                                        manualMethod === m 
                                                            ? 'bg-primary/15 border-primary text-primary' 
                                                            : 'bg-white/5 border-white/5 text-gray-400 hover:text-white'
                                                    }`}
                                                >
                                                    {m === 'GCash' ? <Smartphone size={14} /> : <Landmark size={14} />}
                                                    <span>{m}</span>
                                                </button>
                                            ))}
                                        </div>
                                        <textarea
                                            value={manualDetails}
                                            onChange={(e) => setManualDetails(e.target.value)}
                                            placeholder={manualMethod === 'GCash' ? "Account Name - 0917 123 4567" : "Bank Name: Account Name - 1234567890"}
                                            className="w-full bg-[#1C1C1F] border border-white/10 rounded-xl p-3 text-xs font-medium text-white focus:outline-none focus:border-primary/50 transition-all min-h-[70px]"
                                            required
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={loading || !amount || parseFloat(amount) < 100 || parseFloat(amount) > availableBalance}
                                className="w-full bg-primary hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black py-4 rounded-2xl shadow-lg shadow-primary/25 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
                            >
                                {loading ? (
                                    <Spinner size="sm" color="text-white" />
                                ) : (
                                    <>
                                        <ShieldCheck size={16} />
                                        <span>Confirm Withdrawal Request</span>
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
    const { db, loading, addPayoutRequest, deletePayoutRequest } = useDatabase();
    const { mechanic } = useMechanicAuth();
    const [filter, setFilter] = useState<'week' | 'month' | 'all'>('week');
    const [activeTab, setActiveTab] = useState<'earnings' | 'payouts'>('earnings');
    const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
    const [payoutToDelete, setPayoutToDelete] = useState<PayoutRequest | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Live reactive mechanic profile
    const currentMechanic = useMemo(() => {
        if (!mechanic) return null;
        return db?.mechanics.find(m => m.id === mechanic.id) || mechanic;
    }, [db?.mechanics, mechanic]);

    // Saved payout destinations
    const savedDestinations: PayoutDetails[] = useMemo(() => {
        if (!currentMechanic) return [];
        const list = (currentMechanic.savedPayoutDestinations || []).filter(d => !!d?.accountNumber);
        if (list.length > 0) return list;
        if (currentMechanic.payoutDetails && currentMechanic.payoutDetails.accountNumber) {
            return [{ id: 'legacy-payout', ...currentMechanic.payoutDetails, isDefault: true }];
        }
        return [];
    }, [currentMechanic]);

    // Primary payout account label
    const primaryAccount = useMemo(() => {
        return savedDestinations.find(d => d.isDefault) || savedDestinations[0] || null;
    }, [savedDestinations]);

    // Helper: Standardize date to YYYY-MM-DD
    const normalizeDateStr = (rawDate: any): string => {
        if (!rawDate) return '';
        if (typeof rawDate === 'string') {
            if (rawDate.includes('T')) {
                return rawDate.split('T')[0];
            }
            if (rawDate.includes('-')) {
                return rawDate;
            }
        }
        const d = new Date(rawDate);
        if (isNaN(d.getTime())) return '';
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dt = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${dt}`;
    };

    // Helper: Calculate total revenue of a job accurately
    const getJobTotal = (job: any): number => {
        return getJobTotalAmount(job);
    };

    const {
        earningsInPeriod,
        jobsInPeriodCount,
        avgJobValue,
        groupedJobHistory,
        weeklyData,
        payouts,
        availableBalance,
        lockedBalance,
        allTimeEarnings,
        serviceFeePercentage,
        pendingPayout
    } = useMemo(() => {
        const defaultReturn = { 
            earningsInPeriod: 0, 
            jobsInPeriodCount: 0, 
            avgJobValue: 0, 
            groupedJobHistory: {} as Record<string, Booking[]>, 
            weeklyData: [] as { label: string; dateStr: string; value: number }[], 
            payouts: [] as PayoutRequest[],
            availableBalance: 0,
            lockedBalance: 0,
            allTimeEarnings: 0,
            serviceFeePercentage: 30,
            pendingPayout: null as PayoutRequest | null
        };

        if (!currentMechanic || !db) {
            return defaultReturn;
        }

        const mechIdStr = String(currentMechanic.id).trim();

        // Helper: Check if a booking is completed and paid
        const isCompletedJob = (b: Booking) => {
            if (!b) return false;
            const bMechId = b.mechanic?.id || b.mechanicId;
            const isMatch = bMechId != null && String(bMechId).trim() === mechIdStr;
            const status = (b.status || '').toString().toLowerCase().trim();
            return isMatch && status === 'completed';
        };

        const isPaidJob = (job: Booking) => {
            const payStatus = (job.paymentStatus || '').toString().toLowerCase().trim();
            return job.isPaid !== false && payStatus !== 'failed' && payStatus !== 'cancelled';
        };

        // All completed jobs for this mechanic/driver
        const myCompletedJobs = (db.bookings || [])
            .filter(isCompletedJob)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const now = new Date();

        // Filter based on active period
        let filteredJobs = myCompletedJobs;
        if (filter === 'week') {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(now.getDate() - 6);
            sevenDaysAgo.setHours(0, 0, 0, 0);

            filteredJobs = myCompletedJobs.filter(job => {
                const dStr = normalizeDateStr(job.date);
                if (!dStr) return false;
                const d = new Date(dStr + 'T00:00:00');
                return d >= sevenDaysAgo;
            });
        } else if (filter === 'month') {
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth();

            filteredJobs = myCompletedJobs.filter(job => {
                const dStr = normalizeDateStr(job.date);
                if (!dStr) return false;
                const d = new Date(dStr + 'T00:00:00');
                return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
            });
        }

        const serviceFeePercentage = db?.settings?.serviceFeePercentage ?? 30;

        // Net Profit computation (paid jobs net of platform commission)
        const paidJobsInPeriod = filteredJobs.filter(isPaidJob);
        const earnings = paidJobsInPeriod.reduce((sum, job) => sum + getJobMechanicShare(job, serviceFeePercentage), 0);
        const jobsCount = filteredJobs.length;
        const avgValue = paidJobsInPeriod.length > 0 ? earnings / paidJobsInPeriod.length : 0;

        // Lifetime earnings
        const allCompletedPaid = myCompletedJobs.filter(isPaidJob);
        const lifetimeNetSum = allCompletedPaid.reduce((sum, job) => sum + getJobMechanicShare(job, serviceFeePercentage), 0);
        const calcAllTime = lifetimeNetSum;

        // Rolling 7-day chart buckets (matching Sun-Sat or rolling 7 days)
        const last7Days = Array.from({ length: 7 }).map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return d;
        });

        const dailyEarnings = last7Days.map(day => {
            const dayNormalized = normalizeDateStr(day);
            const earningsForDay = myCompletedJobs
                .filter(job => {
                    if (!isPaidJob(job)) return false;
                    return normalizeDateStr(job.date) === dayNormalized;
                })
                .reduce((sum, job) => sum + getJobMechanicShare(job, serviceFeePercentage), 0);

            return {
                label: day.toLocaleDateString('en-US', { weekday: 'short' }),
                dateStr: dayNormalized,
                value: earningsForDay
            };
        });

        // Group job history by date
        const groupedHistory = filteredJobs.reduce((acc, job) => {
            const dateKey = normalizeDateStr(job.date) || 'Recent';
            if (!acc[dateKey]) acc[dateKey] = [];
            acc[dateKey].push(job);
            return acc;
        }, {} as Record<string, Booking[]>);

        // Payout history
        const myPayouts = ((db.payouts || []) as PayoutRequest[])
            .filter(p => p && p.mechanicId && String(p.mechanicId).trim() === mechIdStr)
            .sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());

        // Find primary pending payout if any (for instant one-click cancel/unlock)
        const pendingPayout = myPayouts.find(p => (p.status || '').toString().toLowerCase().trim() === 'pending') || null;

        // Dynamic Wallet Balances from authoritative ledger helper
        const walletLedger = calculateMechanicWalletLedger(
            currentMechanic.id,
            currentMechanic,
            db.bookings || [],
            db.payouts || [],
            serviceFeePercentage
        );

        return {
            earningsInPeriod: earnings,
            jobsInPeriodCount: jobsCount,
            avgJobValue: avgValue,
            groupedJobHistory: groupedHistory,
            weeklyData: dailyEarnings,
            payouts: myPayouts,
            availableBalance: walletLedger.availableBalance,
            lockedBalance: walletLedger.lockedBalance,
            allTimeEarnings: walletLedger.lifetimeEarnings != null ? walletLedger.lifetimeEarnings : calcAllTime,
            serviceFeePercentage,
            pendingPayout
        };
    }, [db, currentMechanic, filter]);

    // Self-healing balance sync: if document has stale balance differing from authoritative ledger, sync it
    useEffect(() => {
        if (!currentMechanic?.id || !db) return;
        const targetAvailable = availableBalance;
        const targetLifetime = allTimeEarnings;
        const targetLocked = lockedBalance;
        
        if (
            currentMechanic.walletBalance !== targetAvailable ||
            currentMechanic.totalEarnings !== targetLifetime ||
            currentMechanic.lockedBalance !== targetLocked
        ) {
            try {
                const mechanicRef = doc(firestore, 'mechanics', currentMechanic.id);
                updateDoc(mechanicRef, {
                    walletBalance: targetAvailable,
                    totalEarnings: targetLifetime,
                    lockedBalance: targetLocked
                }).catch(() => {});
            } catch (_) {}
        }
    }, [currentMechanic?.id, currentMechanic?.walletBalance, currentMechanic?.totalEarnings, currentMechanic?.lockedBalance, availableBalance, allTimeEarnings, lockedBalance]);

    const handlePayoutSubmit = async (amount: number, method: string, details: string) => {
        if (!currentMechanic) return;
        await addPayoutRequest({
            mechanicId: currentMechanic.id,
            mechanicName: currentMechanic.name,
            amount,
            paymentMethod: method,
            accountDetails: details,
            status: 'Pending',
            requestDate: new Date().toISOString()
        });
    };

    const handleDeletePayout = async () => {
        if (!payoutToDelete) return;
        try {
            setIsDeleting(true);
            await deletePayoutRequest(payoutToDelete.id);
            setPayoutToDelete(null);
        } catch (err: any) {
            console.error('Failed to cancel payout request:', err);
            alert(err?.message || 'Failed to cancel payout request.');
        } finally {
            setIsDeleting(false);
        }
    };

    if (loading || !db || !currentMechanic) {
        return (
            <div className="flex flex-col h-full bg-[#121212]">
                <Header title="My Earnings" rightAction={<NotificationBell />} icon={<TrendingUp size={22} />} />
                <div className="flex-grow flex items-center justify-center">
                    <Spinner size="lg" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0F0F11] text-white">
            <div className="relative min-h-screen pb-28">
                <Header title="My Earnings" rightAction={<NotificationBell />} icon={<TrendingUp size={22} />} />

                {/* Top Section Container */}
                <div className="px-4 sm:px-6 pt-4 space-y-4">

                    {/* 1. Compact Balance & Quick-Withdraw HUD */}
                    <div className="bg-gradient-to-br from-[#1A1A1E] via-[#161619] to-[#121214] p-5 rounded-3xl border border-white/10 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                            <Wallet size={100} className="text-white" />
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Available Balance</span>
                                    <span className="flex h-2 w-2 relative">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                    </span>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <p className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                                        ₱{availableBalance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                    </p>
                                    {lockedBalance > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab('payouts')}
                                            title="Click to view pending payout request"
                                            className="text-[11px] font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 active:scale-95 px-2.5 py-0.5 rounded-lg border border-amber-500/20 transition-all flex items-center gap-1 cursor-pointer"
                                        >
                                            <Clock size={11} className="text-amber-400" />
                                            <span>₱{lockedBalance.toLocaleString()} in transit</span>
                                        </button>
                                    )}
                                </div>
                                {primaryAccount && (
                                    <p className="text-[10px] font-bold text-gray-400 flex items-center gap-1 mt-1">
                                        <span>Payout to:</span>
                                        <span className="text-white font-black">{primaryAccount.method === 'Bank Transfer' ? primaryAccount.bankName : primaryAccount.walletName}</span>
                                        <span className="text-gray-500">({primaryAccount.accountNumber})</span>
                                    </p>
                                )}
                            </div>

                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsPayoutModalOpen(true)}
                                    disabled={availableBalance < 100}
                                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-3 bg-primary hover:bg-orange-600 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-primary/25 transition-all"
                                >
                                    <ArrowUpRight size={16} />
                                    <span>Withdraw Funds</span>
                                </button>
                                <Link
                                    to="/mechanic-portal/profile"
                                    title="Manage Payout Destinations"
                                    className="p-3 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-2xl border border-white/5 transition-all flex items-center justify-center"
                                >
                                    <CreditCard size={16} />
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* In-Transit Callout Alert: Informs mechanic why funds are locked and offers instant cancellation to restore available balance */}
                    {lockedBalance > 0 && (
                        <div className="bg-[#1C1813] border border-amber-500/30 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 text-xs shadow-lg animate-in fade-in duration-300">
                            <div className="flex items-start gap-3 min-w-0">
                                <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 shrink-0 mt-0.5 border border-amber-500/30">
                                    <Clock size={20} />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-black text-amber-300 text-sm tracking-tight">
                                            ₱{lockedBalance.toLocaleString()} In Transit
                                        </p>
                                        <span className="px-2 py-0.5 text-[8.5px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 rounded-md border border-amber-500/30">
                                            Pending Withdrawal
                                        </span>
                                    </div>
                                    <p className="text-gray-300 text-xs mt-1 leading-relaxed">
                                        Your earnings are locked while your withdrawal request is pending review by admin. Once processed, it will be paid to your account.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 pt-1 sm:pt-0">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('payouts')}
                                    className="px-3.5 py-2 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-xl text-xs font-bold transition-all border border-white/10 flex items-center gap-1.5"
                                >
                                    <CreditCard size={13} />
                                    <span>View Payouts</span>
                                </button>
                                {pendingPayout && (
                                    <button
                                        type="button"
                                        onClick={() => setPayoutToDelete(pendingPayout)}
                                        className="px-3.5 py-2 bg-red-500/20 hover:bg-red-500/30 active:scale-95 text-red-300 hover:text-white border border-red-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                                        title="Cancel pending withdrawal request and immediately restore funds to Available Balance"
                                    >
                                        <RotateCcw size={13} />
                                        <span>Cancel & Unlock</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* 2. Compact Performance Bar Chart */}
                    <div className="bg-[#161619] p-5 rounded-3xl border border-white/5 shadow-xl relative overflow-hidden">
                        <div className="flex items-center justify-between mb-4 relative z-10">
                            <div>
                                <p className="text-[9px] font-black text-primary uppercase tracking-[0.25em]">Weekly Growth</p>
                                <h3 className="text-lg font-black text-white tracking-tight">Performance</h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-gray-400 bg-white/5 px-2.5 py-1 rounded-xl border border-white/5">
                                    Last 7 Days
                                </span>
                                <div className="p-2 rounded-xl bg-white/5 text-primary">
                                    <TrendingUp size={16} />
                                </div>
                            </div>
                        </div>
                        <BarChart data={weeklyData} />
                    </div>

                    {/* 3. Compact 4-Grid Metrics */}
                    <div className="grid grid-cols-2 gap-3">
                        <CompactStatCard 
                            title="Net Profit"
                            value={`₱${earningsInPeriod.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                            subtitle={filter === 'week' ? 'Past 7 Days' : filter === 'month' ? 'This Month' : 'All Time'}
                            icon={<DollarSign size={16} />}
                            color="text-emerald-400"
                            badge="Paid"
                        />
                        <CompactStatCard 
                            title="Jobs Done"
                            value={jobsInPeriodCount}
                            subtitle={`${filteredJobsCountText(jobsInPeriodCount)}`}
                            icon={<CheckCircle2 size={16} />}
                            color="text-blue-400"
                        />
                        <CompactStatCard 
                            title="Avg. Job"
                            value={`₱${avgJobValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                            subtitle="Per booking ticket"
                            icon={<Info size={16} />}
                            color="text-primary"
                        />
                        <CompactStatCard 
                            title="Withdrawals"
                            value={payouts.filter(p => p.status === 'Paid').length}
                            subtitle={`${payouts.filter(p => p.status === 'Pending' || p.status === 'Approved').length} processing`}
                            icon={<CreditCard size={16} />}
                            color="text-purple-400"
                        />
                    </div>

                    {/* 4. Period Filter Pills */}
                    <div className="flex bg-[#161619] p-1 rounded-2xl border border-white/5">
                        {(['week', 'month', 'all'] as const).map((p) => (
                            <button
                                key={p}
                                onClick={() => setFilter(p)}
                                className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    filter === p 
                                        ? 'bg-white text-black shadow-md scale-[1.02]' 
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                {p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : 'All Time'}
                            </button>
                        ))}
                    </div>

                    {/* 5. Tab Switcher (Job History vs Payouts) */}
                    <div className="flex gap-2.5 pt-1">
                        <button 
                            onClick={() => setActiveTab('earnings')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.15em] transition-all border ${
                                activeTab === 'earnings' 
                                    ? 'bg-primary border-primary text-white shadow-md shadow-primary/20' 
                                    : 'bg-[#161619] border-white/5 text-gray-400 hover:text-white'
                            }`}
                        >
                            <History size={15} />
                            <span>Job History ({jobsInPeriodCount})</span>
                        </button>
                        <button 
                            onClick={() => setActiveTab('payouts')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.15em] transition-all border ${
                                activeTab === 'payouts' 
                                    ? 'bg-primary border-primary text-white shadow-md shadow-primary/20' 
                                    : 'bg-[#161619] border-white/5 text-gray-400 hover:text-white'
                            }`}
                        >
                            <CreditCard size={15} />
                            <span>Payouts ({payouts.length})</span>
                        </button>
                    </div>

                    {/* 6. List Content */}
                    <div className="space-y-4 pt-1">
                        {activeTab === 'earnings' ? (
                            <div className="space-y-5">
                                {Object.keys(groupedJobHistory).length > 0 ? (
                                    Object.entries(groupedJobHistory).map(([dateStr, bookingsForDate]) => {
                                        const dateJobs = bookingsForDate as Booking[];
                                        return (
                                            <div key={dateStr} className="space-y-2.5">
                                                <div className="flex items-center gap-3 px-1">
                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">
                                                        {formatGroupDate(dateStr)}
                                                    </span>
                                                    <div className="h-px flex-1 bg-white/5" />
                                                    <span className="text-[9px] font-bold text-gray-500">
                                                        ₱{dateJobs.reduce((sum, b) => sum + getJobTotal(b), 0).toLocaleString()}
                                                    </span>
                                                </div>
                                                <div className="space-y-2">
                                                    {dateJobs.map(booking => (
                                                        <CompactEarningItemCard key={booking.id} booking={booking} serviceFeePercentage={serviceFeePercentage} />
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-16 text-gray-500 space-y-3 bg-[#161619]/50 rounded-3xl border border-white/5">
                                        <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5">
                                            <History size={24} className="opacity-30" />
                                        </div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">No completed jobs for this period</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {payouts.length > 0 ? (
                                    payouts.map((payout) => {
                                        const pStatus = (payout.status || '').toString().toLowerCase().trim();
                                        const isPaid = pStatus === 'paid' || pStatus === 'completed' || pStatus === 'settled';
                                        const isApproved = pStatus === 'approved' || pStatus === 'processing';
                                        const isRejected = pStatus === 'rejected' || pStatus === 'declined' || pStatus === 'cancelled';
                                        const isPending = pStatus === 'pending';

                                        return (
                                            <div key={payout.id} className="bg-[#161619] p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-all">
                                                <div className="flex justify-between items-start mb-2.5">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                                                            isPaid ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                                            isRejected ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                                                            'bg-primary/10 border-primary/20 text-primary'
                                                        }`}>
                                                            <Wallet size={18} />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-black text-white tracking-tight text-sm">
                                                                ₱{Number(payout.amount || 0).toLocaleString()}
                                                            </p>
                                                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                                                                {new Date(payout.requestDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-wider border ${
                                                            isPaid ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                                            isApproved ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                                                            isRejected ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                                                            'bg-amber-500/10 border-amber-500/20 text-amber-400'
                                                        }`}>
                                                            {isApproved ? 'Approved • Disbursing' : isPaid ? 'Paid' : isRejected ? 'Rejected' : 'Pending Review'}
                                                        </span>
                                                        {isPending && (
                                                            <button
                                                                onClick={() => setPayoutToDelete(payout)}
                                                                className="px-2 py-1 rounded-lg text-red-400 hover:text-white bg-red-500/10 hover:bg-red-600 border border-red-500/20 text-[9px] font-bold tracking-wider uppercase transition-all flex items-center gap-1 cursor-pointer"
                                                                title="Cancel request and restore funds to Available Balance"
                                                            >
                                                                <RotateCcw size={11} />
                                                                <span>Cancel</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[9px] text-gray-400 font-bold">
                                                    <span className="truncate">{payout.paymentMethod}: {payout.accountDetails}</span>
                                                    {isPending && (
                                                        <span className="text-amber-400 shrink-0 ml-2">Under review</span>
                                                    )}
                                                    {isApproved && (
                                                        <span className="text-blue-400 shrink-0 ml-2 font-semibold">Processing transfer</span>
                                                    )}
                                                    {isPaid && payout.transactionId && (
                                                        <span className="text-emerald-400 font-mono shrink-0 ml-2 truncate max-w-[120px]">Ref: {payout.transactionId}</span>
                                                    )}
                                                    {isRejected && payout.rejectionReason && (
                                                        <span className="text-red-400 shrink-0 ml-2 truncate max-w-[150px]">Reason: {payout.rejectionReason}</span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-16 text-gray-500 space-y-3 bg-[#161619]/50 rounded-3xl border border-white/5">
                                        <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5">
                                            <ArrowUpRight size={24} className="opacity-30" />
                                        </div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">No withdrawal records found</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Enhanced Multi-Destination Payout Modal */}
                <PayoutRequestModal
                    isOpen={isPayoutModalOpen}
                    onClose={() => setIsPayoutModalOpen(false)}
                    availableBalance={availableBalance}
                    lockedBalance={lockedBalance}
                    savedDestinations={savedDestinations}
                    onSubmit={handlePayoutSubmit}
                />

                {/* Cancel / Delete Payout Confirmation Modal */}
                {payoutToDelete && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-[#1C1C1F] border border-white/10 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl relative">
                            <div className="flex items-center gap-3 text-red-400">
                                <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                                    <AlertTriangle size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-white text-base">Cancel Payout Request?</h4>
                                    <p className="text-xs text-gray-400">This request will be permanently removed.</p>
                                </div>
                            </div>

                            <div className="p-3.5 bg-black/40 rounded-xl border border-white/5 text-xs space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Amount:</span>
                                    <span className="font-black text-white">₱{payoutToDelete.amount.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Method:</span>
                                    <span className="font-medium text-gray-300">{payoutToDelete.paymentMethod}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Status:</span>
                                    <span className="text-amber-400 font-bold">{payoutToDelete.status}</span>
                                </div>
                                <p className="text-[11px] text-emerald-400 pt-1 border-t border-white/5">
                                    ✓ The locked amount (₱{payoutToDelete.amount.toLocaleString()}) will immediately return to your available wallet balance.
                                </p>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setPayoutToDelete(null)}
                                    disabled={isDeleting}
                                    className="flex-1 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-50"
                                >
                                    Keep Request
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDeletePayout}
                                    disabled={isDeleting}
                                    className="flex-1 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 shadow-lg shadow-red-600/25 disabled:opacity-50"
                                >
                                    {isDeleting ? (
                                        <Spinner size="sm" color="text-white" />
                                    ) : (
                                        <>
                                            <Trash2 size={14} />
                                            <span>Yes, Cancel</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const filteredJobsCountText = (count: number) => {
    if (count === 1) return '1 completed job';
    return `${count} completed jobs`;
};

const formatGroupDate = (dateStr: string): string => {
    if (!dateStr || dateStr === 'Recent') return 'Recent Completed';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        if (!isNaN(d.getTime())) {
            const today = new Date();
            if (d.toDateString() === today.toDateString()) {
                return 'Today';
            }
            const yesterday = new Date();
            yesterday.setDate(today.getDate() - 1);
            if (d.toDateString() === yesterday.toDateString()) {
                return 'Yesterday';
            }
            return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        }
    }
    return dateStr;
};

const CompactStatCard: React.FC<{ 
    title: string; 
    value: string | number; 
    subtitle?: string; 
    icon: React.ReactNode; 
    color: string;
    badge?: string;
}> = ({ title, value, subtitle, icon, color, badge }) => (
    <div className="bg-[#161619] p-4 rounded-2xl border border-white/5 shadow-md hover:border-white/10 transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 min-w-0">
                <div className={`p-1.5 rounded-xl bg-white/5 shrink-0 ${color}`}>
                    {icon}
                </div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider truncate">{title}</p>
            </div>
            {badge && (
                <span className="text-[8px] font-black text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                    {badge}
                </span>
            )}
        </div>
        <div>
            <p className="text-xl font-black text-white tracking-tight">{value}</p>
            {subtitle && (
                <p className="text-[8.5px] font-bold text-gray-500 mt-0.5 truncate">{subtitle}</p>
            )}
        </div>
    </div>
);

const CompactEarningItemCard: React.FC<{ booking: Booking; serviceFeePercentage?: number }> = ({ booking, serviceFeePercentage = 30 }) => {
    const grossTotal = getJobTotalAmount(booking);
    const mechanicShare = getJobMechanicShare(booking, serviceFeePercentage);
    const adminFee = Math.max(0, grossTotal - mechanicShare);
    const serviceImageUrl = booking.services?.[0]?.imageUrl || booking.service?.imageUrl || '';
    const serviceName = booking.services?.[0]?.name || booking.service?.name || 'Service Booking';
    const vehicleInfo = booking.vehicle 
        ? `${booking.vehicle.brand || booking.vehicle.make || ''} ${booking.vehicle.model || ''}`.trim() 
        : (booking.vehicleDetails || 'Vehicle Service');
    
    return (
        <Link 
            to={`/mechanic-portal/job/${booking.id}`}
            className="bg-[#161619] p-3.5 rounded-2xl border border-white/5 flex justify-between items-center hover:bg-[#1A1A1E] hover:border-white/10 transition-all group shadow-sm cursor-pointer block"
        >
            <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/5 overflow-hidden transition-all shrink-0 group-hover:border-primary/30">
                    {serviceImageUrl ? (
                        <img src={serviceImageUrl} alt="Service" className="w-full h-full object-cover" />
                    ) : (
                        <DollarSign className="text-gray-400 group-hover:text-primary" size={16} />
                    )}
                </div>
                <div className="min-w-0">
                    <p className="font-black text-white text-xs tracking-tight truncate max-w-[150px] sm:max-w-xs">
                        {serviceName}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[8px] text-gray-400 font-extrabold uppercase tracking-wider truncate">
                            {vehicleInfo}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-white/20" />
                        <span className="text-[8px] text-gray-500 font-bold truncate max-w-[90px]">
                            {booking.customerName}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[8px] font-bold text-gray-400 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                            Customer: ₱{grossTotal.toLocaleString()}
                        </span>
                        <span className="text-[8px] font-bold text-red-400/80 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/15">
                            Admin: -₱{adminFee.toLocaleString()}
                        </span>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                    <span className="text-[8px] font-black text-emerald-400/80 uppercase tracking-widest block leading-none mb-0.5">
                        Your Take-Home
                    </span>
                    <p className="font-black text-base text-emerald-400 tracking-tight leading-none mb-1">
                        ₱{mechanicShare.toLocaleString()}
                    </p>
                    <div className="flex items-center justify-end gap-1">
                        <div className="w-1 h-1 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]"></div>
                        <span className="text-[7.5px] font-black text-emerald-400 uppercase tracking-wider">Completed</span>
                    </div>
                </div>
                <ChevronRight className="text-gray-600 group-hover:text-white transition-colors" size={14} />
            </div>
        </Link>
    );
};

const BarChart: React.FC<{ data: { label: string; dateStr: string; value: number }[] }> = ({ data }) => {
    const maxVal = Math.max(...data.map(d => d.value), 500);

    return (
        <div className="relative h-44 flex flex-col justify-end pt-3">
            {/* Subtle Horizontal Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-5 py-2 z-0">
                <div className="w-full border-t border-dashed border-white" />
                <div className="w-full border-t border-dashed border-white" />
                <div className="w-full border-t border-dashed border-white" />
                <div className="w-full border-t border-dashed border-white" />
            </div>

            {/* Bars */}
            <div className="relative z-10 flex items-end justify-between h-36 gap-2 sm:gap-3">
                {data.map((d, i) => {
                    const hasValue = d.value > 0;
                    const heightPercent = hasValue ? Math.max(12, Math.min(100, (d.value / maxVal) * 100)) : 0;

                    return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                            {/* Track Container */}
                            <div className="relative w-full flex flex-col justify-end h-full min-h-[90px]">
                                {/* Track background */}
                                <div className="absolute inset-x-0 bottom-0 top-0 bg-white/[0.03] rounded-xl pointer-events-none" />
                                
                                {hasValue ? (
                                    <div 
                                        className="w-full bg-gradient-to-t from-primary to-orange-400 rounded-xl transition-all duration-500 shadow-md shadow-primary/20 relative"
                                        style={{ height: `${heightPercent}%` }}
                                    >
                                        {/* Tooltip Badge */}
                                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#1C1C1F] text-[9px] font-black text-white px-2 py-0.5 rounded-lg border border-white/10 whitespace-nowrap shadow-xl z-20">
                                            ₱{d.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 bg-black/40 text-[8.5px] font-black text-gray-500 px-1.5 py-0.5 rounded-md border border-white/5">
                                        ₱0
                                    </div>
                                )}
                            </div>
                            <span className="text-[9.5px] font-black text-gray-400 group-hover:text-white transition-colors tracking-tight">
                                {d.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default MechanicEarningsScreen;
