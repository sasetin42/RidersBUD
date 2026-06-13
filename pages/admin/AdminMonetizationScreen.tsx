import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDatabase } from '../../context/DatabaseContext';
import { useNotification } from '../../context/NotificationContext';
import { Subscription, PromoCode } from '../../types';
import Spinner from '../../components/Spinner';
import DashboardChart from '../../components/admin/DashboardCharts';
import EnhancedKPICard from '../../components/admin/EnhancedKPICard';
import {
    TrendingUp,
    Users,
    Ticket,
    AlertCircle,
    Plus,
    Search,
    Filter,
    MoreVertical,
    Download,
    CreditCard,
    ArrowUpRight,
    ArrowDownRight,
    CheckCircle2,
    Calendar,
    Settings,
    X,
    Wifi,
    WifiOff,
    ExternalLink,
    Copy,
    Shield,
    Wrench
} from 'lucide-react';

type MonetizationTab = 'overview' | 'subscriptions' | 'promo-codes' | 'dunning' | 'payment-gateway';

const AdminMonetizationScreen: React.FC = () => {
    const navigate = useNavigate();
    const { db, loading, addPromoCode, updatePromoCode, deletePromoCode, addSubscription, updateSubscription } = useDatabase();
    const { addNotification } = useNotification();

    const [activeTab, setActiveTab] = useState<MonetizationTab>('overview');
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddPromoModalOpen, setIsAddPromoModalOpen] = useState(false);

    const [newPromo, setNewPromo] = useState<Omit<PromoCode, 'id'>>({
        code: '',
        discountType: 'Percentage',
        discountValue: 0,
        description: '',
        expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
        usageLimit: 100,
        usageCount: 0,
        isActive: true,
        category: 'General'
    });

    const handleAddPromo = async () => {
        if (!newPromo.code || newPromo.discountValue <= 0) {
            addNotification({ type: 'error', title: 'Invalid Promo', message: 'Please provide a valid code and discount value.', recipientId: 'admin' });
            return;
        }

        try {
            await addPromoCode(newPromo);
            addNotification({ type: 'success', title: 'Promo Created', message: `Code ${newPromo.code} is now active!`, recipientId: 'admin' });
            setIsAddPromoModalOpen(false);
            setNewPromo({
                code: '',
                discountType: 'Percentage',
                discountValue: 0,
                description: '',
                expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
                usageLimit: 100,
                usageCount: 0,
                isActive: true,
                category: 'General'
            });
        } catch (error) {
            addNotification({ type: 'error', title: 'Save Failed', message: 'Could not create promo code.', recipientId: 'admin' });
        }
    };

    // --- Mock Data / Aggregations ---
    const stats = useMemo(() => {
        if (!db) return null;
        const activeSubs = db.subscriptions.filter(s => s.status === 'Active');
        const mrr = activeSubs.reduce((sum, s) => sum + (s.billingCycle === 'Monthly' ? s.amount : s.amount / 12), 0);
        const totalRevenue = db.orders.reduce((sum, o) => sum + o.total, 0) + db.bookings.filter(b => b.isPaid).reduce((sum, b) => sum + (b.service?.price || 0), 0);

        return {
            mrr,
            activeSubsCount: activeSubs.length,
            totalRevenue,
            churnRate: 2.4, // Mock
            ltv: 12500, // Mock
        };
    }, [db]);

    const chartData = [
        { name: 'Jul', value: 45000 },
        { name: 'Aug', value: 52000 },
        { name: 'Sep', value: 48000 },
        { name: 'Oct', value: 61000 },
        { name: 'Nov', value: 55000 },
        { name: 'Dec', value: 67000 },
    ];

    if (loading || !db) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <Spinner size="lg" color="text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fadeIn pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 animate-slideInUp">
                <div>
                    <h1 className="text-5xl font-black text-white tracking-tighter  leading-none">Monetization</h1>
                    <div className="flex items-center gap-2 mt-4">
                        <div className="h-1 w-12 bg-primary rounded-full"></div>
                        <p className="text-gray-500 font-bold  tracking-[0.3em] text-[10px]">Revenue & Subscriptions</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-[1.5rem] text-[10px] font-black  tracking-widest text-white transition-all hover:scale-105 active:scale-95">
                        <Download size={16} /> Export Data
                    </button>
                    {activeTab === 'promo-codes' && (
                        <button
                            onClick={() => setIsAddPromoModalOpen(true)}
                            className="flex items-center gap-2 px-6 py-4 bg-primary hover:bg-orange-600 rounded-[1.5rem] text-[10px] font-black  tracking-widest text-white shadow-lg shadow-primary/20 transition-all hover:shadow-glow-primary active:scale-95 group"
                        >
                            <Plus size={16} className="group-hover:rotate-90 transition-transform duration-500" /> Create Promo
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 p-1.5 bg-[#121212]/80 backdrop-blur-xl border border-white/10 rounded-[2rem] w-fit shadow-2xl animate-slideInUp delay-100">
                {[
                    { id: 'overview', label: 'Overview', icon: TrendingUp },
                    { id: 'payment-gateway', label: 'Payment Gateway', icon: CreditCard },
                    { id: 'subscriptions', label: 'Subscriptions', icon: Users },
                    { id: 'promo-codes', label: 'Promo Codes', icon: Ticket },
                    { id: 'dunning', label: 'Dunning', icon: AlertCircle },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as MonetizationTab)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-[1.5rem] text-[10px] font-black  tracking-widest transition-all ${activeTab === tab.id
                            ? 'bg-primary text-white shadow-lg shadow-primary/25 scale-105'
                            : 'text-gray-500 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <tab.icon size={14} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Switcher */}
            <div className="animate-fadeIn">
                {activeTab === 'overview' && stats && (
                    <div className="space-y-8">
                        {/* KPI Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <EnhancedKPICard
                                title="Monthly Recurring (MRR)"
                                value={`₱${stats.mrr.toLocaleString()}`}
                                icon={<TrendingUp size={24} />}
                                gradient="bg-gradient-to-br from-indigo-600 to-indigo-800"
                                trend={{ value: 12.5, isPositive: true }}
                            />
                            <EnhancedKPICard
                                title="Active Subscribers"
                                value={stats.activeSubsCount.toString()}
                                icon={<Users size={24} />}
                                gradient="bg-gradient-to-br from-emerald-600 to-emerald-800"
                                trend={{ value: 8.2, isPositive: true }}
                            />
                            <EnhancedKPICard
                                title="Total Gross Revenue"
                                value={`₱${stats.totalRevenue.toLocaleString()}`}
                                icon={<CreditCard size={24} />}
                                gradient="bg-gradient-to-br from-orange-600 to-orange-800"
                                trend={{ value: 15.4, isPositive: true }}
                            />
                            <EnhancedKPICard
                                title="Churn Rate"
                                value={`${stats.churnRate}%`}
                                icon={<AlertCircle size={24} />}
                                gradient="bg-gradient-to-br from-rose-600 to-rose-800"
                                trend={{ value: 0.2, isPositive: false }}
                            />
                        </div>

                        {/* Revenue Chart */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[450px]">
                            <div className="lg:col-span-2 shadow-2xl rounded-[2.5rem] overflow-hidden border border-white/5 bg-[#121212]/60 backdrop-blur-xl">
                                <DashboardChart
                                    title="Revenue Growth"
                                    subtitle="Combined income from subscriptions & transactions"
                                    data={chartData}
                                    type="area"
                                    colors={['#f97316']}
                                />
                            </div>
                            <div className="lg:col-span-1 bg-[#121212]/60 backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl flex flex-col h-full">
                                <h3 className="text-2xl font-black text-white  tracking-tighter mb-8">Revenue Mix</h3>
                                <div className="space-y-8 flex-grow">
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-400 font-bold  tracking-wider text-[10px]">Subscriptions</span>
                                            <span className="text-white font-black">65%</span>
                                        </div>
                                        <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                                            <div className="h-full bg-primary shadow-[0_0_10px_rgba(249,115,22,0.5)]" style={{ width: '65%' }} />
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-400 font-bold  tracking-wider text-[10px]">Services</span>
                                            <span className="text-white font-black">25%</span>
                                        </div>
                                        <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                                            <div className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ width: '25%' }} />
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-400 font-bold  tracking-wider text-[10px]">Parts Store</span>
                                            <span className="text-white font-black">10%</span>
                                        </div>
                                        <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                                            <div className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" style={{ width: '10%' }} />
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-8 p-6 bg-primary/10 border border-primary/20 rounded-2xl backdrop-blur-md">
                                    <p className="text-xs text-primary font-bold flex items-center gap-3  tracking-wide">
                                        <Plus size={16} /> Upgrade marketing to boost LTV
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Payment Gateway Tab */}
                {activeTab === 'payment-gateway' && (
                    <div className="space-y-8">
                        {/* Gateway Status Hero */}
                        {(() => {
                            const settings = db.settings;
                            const isSandbox = settings?.hitpaySandboxMode ?? true;
                            const hasLiveKeys = !!(settings?.hitpayApiKey && settings?.hitpaySalt);
                            const hasSandboxKeys = !!(settings?.hitpaySandboxApiKey && settings?.hitpaySandboxSalt);
                            const isConnected = isSandbox ? hasSandboxKeys : hasLiveKeys;
                            const activeKeyPreview = isSandbox
                                ? (settings?.hitpaySandboxApiKey || '').slice(0, 12) + '...'
                                : (settings?.hitpayApiKey || '').slice(0, 12) + '...';

                            return (
                                <>
                                    {/* Status Card */}
                                    <div className={`p-8 rounded-[2.5rem] border-2 relative overflow-hidden transition-all ${isConnected
                                            ? 'bg-emerald-500/5 border-emerald-500/20'
                                            : 'bg-rose-500/5 border-rose-500/20'
                                        }`}>
                                        <div className="absolute top-0 right-0 p-8 opacity-5">
                                            <CreditCard size={200} />
                                        </div>
                                        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                                            <div className="flex items-center gap-6">
                                                <div className={`w-20 h-20 rounded-[1.5rem] flex items-center justify-center shadow-2xl ${isConnected
                                                        ? 'bg-emerald-500/20 shadow-emerald-500/20'
                                                        : 'bg-rose-500/20 shadow-rose-500/20'
                                                    }`}>
                                                    {isConnected
                                                        ? <Wifi size={32} className="text-emerald-400" />
                                                        : <WifiOff size={32} className="text-rose-400" />
                                                    }
                                                </div>
                                                <div>
                                                    <h2 className="text-3xl font-black text-white  tracking-tight">HitPay Gateway</h2>
                                                    <div className="flex items-center gap-3 mt-2">
                                                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black  tracking-widest border ${isConnected
                                                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                                                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                                                            }`}>
                                                            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-rose-400'
                                                                }`} />
                                                            {isConnected ? 'Connected' : 'Not Configured'}
                                                        </div>
                                                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black  tracking-widest border ${isSandbox
                                                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                                                                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                                            }`}>
                                                            {isSandbox ? <Wrench size={10} /> : <Shield size={10} />}
                                                            {isSandbox ? 'Sandbox' : 'Live'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => navigate('/admin-portal/settings')}
                                                className="flex items-center gap-3 px-8 py-4 bg-white/10 hover:bg-white/15 border border-white/10 rounded-[1.5rem] text-[10px] font-black  tracking-widest text-white transition-all hover:scale-105 active:scale-95 group"
                                            >
                                                <Settings size={16} />
                                                Configure in Settings
                                                <ExternalLink size={12} className="opacity-50 group-hover:opacity-100 transition-opacity" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Credential Details Grid */}
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {/* Live Credentials Card */}
                                        <div className={`p-6 rounded-[2rem] border transition-all ${!isSandbox ? 'bg-[#151515] border-emerald-500/20' : 'bg-[#0d0d0d] border-white/5 opacity-60'
                                            }`}>
                                            <div className="flex items-center gap-3 mb-6">
                                                <div className="p-2.5 rounded-lg bg-emerald-500/10">
                                                    <Shield size={16} className="text-emerald-400" />
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-black text-white  tracking-wider">Live Credentials</h3>
                                                    <p className="text-[10px] text-gray-500 font-medium mt-0.5">Production environment</p>
                                                </div>
                                                {!isSandbox && (
                                                    <span className="ml-auto text-[9px] font-black  tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">Active</span>
                                                )}
                                            </div>
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between p-3 bg-black/30 rounded-xl">
                                                    <div>
                                                        <p className="text-[9px] text-gray-500 font-black  tracking-widest">API Key</p>
                                                        <p className="text-sm text-white font-mono mt-1">
                                                            {hasLiveKeys ? (settings?.hitpayApiKey || '').slice(0, 16) + '••••••••••' : '— Not Set —'}
                                                        </p>
                                                    </div>
                                                    {hasLiveKeys && <CheckCircle2 size={16} className="text-emerald-400" />}
                                                </div>
                                                <div className="flex items-center justify-between p-3 bg-black/30 rounded-xl">
                                                    <div>
                                                        <p className="text-[9px] text-gray-500 font-black  tracking-widest">Salt</p>
                                                        <p className="text-sm text-white font-mono mt-1">
                                                            {hasLiveKeys ? '••••••••••••••••' : '— Not Set —'}
                                                        </p>
                                                    </div>
                                                    {hasLiveKeys && <CheckCircle2 size={16} className="text-emerald-400" />}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Sandbox Credentials Card */}
                                        <div className={`p-6 rounded-[2rem] border transition-all ${isSandbox ? 'bg-[#151515] border-amber-500/20' : 'bg-[#0d0d0d] border-white/5 opacity-60'
                                            }`}>
                                            <div className="flex items-center gap-3 mb-6">
                                                <div className="p-2.5 rounded-lg bg-amber-500/10">
                                                    <Wrench size={16} className="text-amber-400" />
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-black text-white  tracking-wider">Sandbox Credentials</h3>
                                                    <p className="text-[10px] text-gray-500 font-medium mt-0.5">Testing environment</p>
                                                </div>
                                                {isSandbox && (
                                                    <span className="ml-auto text-[9px] font-black  tracking-widest text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">Active</span>
                                                )}
                                            </div>
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between p-3 bg-black/30 rounded-xl">
                                                    <div>
                                                        <p className="text-[9px] text-gray-500 font-black  tracking-widest">API Key</p>
                                                        <p className="text-sm text-white font-mono mt-1">
                                                            {hasSandboxKeys ? (settings?.hitpaySandboxApiKey || '').slice(0, 16) + '••••••••••' : '— Not Set —'}
                                                        </p>
                                                    </div>
                                                    {hasSandboxKeys && <CheckCircle2 size={16} className="text-amber-400" />}
                                                </div>
                                                <div className="flex items-center justify-between p-3 bg-black/30 rounded-xl">
                                                    <div>
                                                        <p className="text-[9px] text-gray-500 font-black  tracking-widest">Salt</p>
                                                        <p className="text-sm text-white font-mono mt-1">
                                                            {hasSandboxKeys ? '••••••••••••••••' : '— Not Set —'}
                                                        </p>
                                                    </div>
                                                    {hasSandboxKeys && <CheckCircle2 size={16} className="text-amber-400" />}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Recent Transactions from Bookings */}
                                    <div className="bg-[#121212]/60 backdrop-blur-xl border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden">
                                        <div className="p-8 border-b border-white/10 flex items-center justify-between">
                                            <div>
                                                <h3 className="text-xl font-black text-white  tracking-tight">Recent Online Payments</h3>
                                                <p className="text-xs text-gray-500 mt-1 font-medium">Bookings paid via HitPay gateway</p>
                                            </div>
                                        </div>
                                        <div className="divide-y divide-white/5">
                                            {db.bookings
                                                .filter(b => b.isPaid || b.paymentStatus === 'paid' || b.paymentStatus === 'partial')
                                                .slice(0, 8)
                                                .map((booking, i) => (
                                                    <div key={booking.id || i} className="px-8 py-5 flex items-center justify-between group hover:bg-white/5 transition-colors">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black">
                                                                {(booking.customerName || 'C').charAt(0)}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-white">{booking.customerName || 'Customer'}</p>
                                                                <p className="text-xs text-gray-500">{booking.service?.name || 'Service'} • {new Date(booking.date).toLocaleDateString()}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-sm font-black text-primary">₱{(booking.totalAmount || booking.service?.price || 0).toLocaleString()}</p>
                                                            <p className={`text-[10px] font-black  tracking-widest mt-1 ${booking.paymentStatus === 'paid' ? 'text-emerald-400' : 'text-amber-400'
                                                                }`}>
                                                                {booking.paymentStatus || 'Paid'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            {db.bookings.filter(b => b.isPaid || b.paymentStatus === 'paid' || b.paymentStatus === 'partial').length === 0 && (
                                                <div className="px-8 py-16 text-center">
                                                    <CreditCard size={40} className="text-gray-700 mx-auto mb-4" />
                                                    <p className="text-gray-500 font-bold  tracking-widest text-xs">No online payments yet</p>
                                                    <p className="text-gray-600 text-xs mt-1">Payments will appear here once customers pay via HitPay</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                )}

                {activeTab === 'subscriptions' && (
                    <div className="bg-[#121212]/60 backdrop-blur-xl border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden">
                        <div className="p-8 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search subscribers..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-white/5 border border-white/5 rounded-2xl pl-12 pr-6 py-4 text-sm text-white font-bold transition-all placeholder-gray-600"
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                <button className="p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-gray-400 hover:text-white transition-all">
                                    <Filter size={18} />
                                </button>
                                <button className="flex items-center gap-2 px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-[10px] font-black  tracking-widest text-white transition-all">
                                    Active Only
                                </button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-white/5 bg-white/5">
                                        <th className="px-8 py-6 text-[10px] font-black  tracking-widest text-gray-500">Subscriber</th>
                                        <th className="px-8 py-6 text-[10px] font-black  tracking-widest text-gray-500">Plan</th>
                                        <th className="px-8 py-6 text-[10px] font-black  tracking-widest text-gray-500">Status</th>
                                        <th className="px-8 py-6 text-[10px] font-black  tracking-widest text-gray-500">Billing</th>
                                        <th className="px-8 py-6 text-[10px] font-black  tracking-widest text-gray-500">Next Renewal</th>
                                        <th className="px-8 py-6 text-[10px] font-black  tracking-widest text-gray-500 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {db.subscriptions.length > 0 ? (
                                        db.subscriptions.map((sub, index) => (
                                            <tr key={sub.id} className="group hover:bg-white/5 transition-colors">
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white shadow-inner bg-gradient-to-br from-gray-700 to-gray-800`}>
                                                            {sub.customerName.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-white group-hover:text-primary transition-colors">{sub.customerName}</p>
                                                            <p className="text-xs text-gray-500 font-mono">ID: #{sub.id.slice(-6)}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <span className={`px-4 py-2 rounded-xl text-[10px] font-black  tracking-widest border ${sub.plan === 'Enterprise' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                                        sub.plan === 'Premium' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                                                            'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                        }`}>
                                                        {sub.plan}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2 h-2 rounded-full ${sub.status === 'Active' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' :
                                                            sub.status === 'Cancelled' ? 'bg-gray-500' : 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]'
                                                            }`} />
                                                        <span className={`text-xs font-bold  tracking-wide ${sub.status === 'Active' ? 'text-emerald-400' : 'text-gray-400'}`}>
                                                            {sub.status}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <p className="text-sm font-black text-white">₱{sub.amount.toLocaleString()}</p>
                                                    <p className="text-[10px] text-gray-500  tracking-wider font-bold">{sub.billingCycle}</p>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <p className="text-sm text-gray-300 flex items-center gap-2 font-medium">
                                                        <Calendar size={14} className="text-primary" />
                                                        {new Date(sub.endDate).toLocaleDateString()}
                                                    </p>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <button className="p-3 hover:bg-white/10 rounded-xl text-gray-500 hover:text-white transition-all">
                                                        <MoreVertical size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="px-8 py-20 text-center text-gray-500 font-bold  tracking-widest">No subscriptions found. Start your first campaign!</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'promo-codes' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {db.promoCodes.length > 0 ? (
                            db.promoCodes.map((promo) => (
                                <div key={promo.id} className="bg-[#121212]/60 backdrop-blur-xl border border-white/5 p-8 rounded-[2rem] shadow-2xl space-y-6 group hover:border-primary/30 transition-all hover:-translate-y-1 duration-300">
                                    <div className="flex justify-between items-start">
                                        <div className="px-4 py-2 bg-primary/10 border border-primary/20 rounded-xl">
                                            <span className="text-lg font-black text-primary tracking-[0.2em]">{promo.code}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${promo.isActive ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-gray-500'}`} />
                                            <span className="text-[10px] font-black text-gray-500  tracking-widest">{promo.isActive ? 'Active' : 'Paused'}</span>
                                        </div>
                                    </div>

                                    <div>
                                        <p className="text-4xl font-black text-white tracking-tight flex items-baseline gap-2">
                                            {promo.discountType === 'Percentage' ? `${promo.discountValue}%` : `₱${promo.discountValue}`}
                                            <span className="text-sm font-bold text-gray-500  tracking-widest">OFF</span>
                                        </p>
                                        <p className="text-sm text-gray-400 mt-2 font-medium leading-relaxed">{promo.description}</p>
                                    </div>

                                    <div className="flex justify-between items-end pt-6 border-t border-white/5">
                                        <div className="space-y-1">
                                            <p className="text-[9px] text-gray-500  font-black tracking-widest">Usage Limit</p>
                                            <div className="flex items-center gap-2">
                                                <div className="w-24 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                                    <div className="h-full bg-white transition-all duration-1000" style={{ width: `${Math.min((promo.usageCount / promo.usageLimit) * 100, 100)}%` }}></div>
                                                </div>
                                                <p className="text-xs text-white font-bold">{promo.usageCount}/{promo.usageLimit}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all">
                                                <Settings size={16} />
                                            </button>
                                            <button
                                                onClick={() => deletePromoCode(promo.id)}
                                                className="p-3 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl text-rose-400 transition-all"
                                            >
                                                <MoreVertical size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full py-24 text-center space-y-6 bg-[#121212]/40 rounded-[3rem] border-2 border-dashed border-white/5">
                                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto text-gray-600">
                                    <Ticket size={32} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-white mb-2  tracking-tight">No Promo Codes</h3>
                                    <p className="text-gray-500 max-w-sm mx-auto font-medium">Create a discount code to encourage more bookings and sales during holiday seasons.</p>
                                </div>
                                <button
                                    onClick={() => setIsAddPromoModalOpen(true)}
                                    className="px-8 py-4 bg-primary text-white font-black  tracking-widest text-xs rounded-[1.5rem] shadow-lg shadow-primary/20 hover:scale-105 transition-all"
                                >
                                    Create Your First Promo
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'dunning' && (
                    <div className="space-y-6">
                        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-4">
                            <div className="w-12 h-12 bg-rose-500/20 rounded-xl flex items-center justify-center text-rose-400">
                                <AlertCircle size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-white">4 Failed Payments Detected</h3>
                                <p className="text-sm text-gray-400">System is automatically retrying. Some users may need manual outreach.</p>
                            </div>
                            <button className="ml-auto px-4 py-2 bg-rose-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-rose-500/20 transition-all hover:scale-105">
                                Review Issues
                            </button>
                        </div>

                        <div className="bg-[#1A1A1A]/60 backdrop-blur-xl border border-white/5 rounded-2xl shadow-xl overflow-hidden">
                            <div className="p-6 border-b border-white/5">
                                <h3 className="font-bold text-white  text-xs tracking-widest text-gray-500">Recent Payment Failures</h3>
                            </div>
                            <div className="divide-y divide-white/5">
                                {[
                                    { name: 'Michael Chen', plan: 'Premium', amount: 2500, date: '2 hours ago', error: 'Insufficient funds' },
                                    { name: 'Sarah Wilson', plan: 'Basic', amount: 1200, date: '5 hours ago', error: 'Card expired' },
                                    { name: 'David Miller', plan: 'Premium', amount: 2500, date: 'Yesterday', error: 'Bank declined' },
                                ].map((issue, i) => (
                                    <div key={i} className="p-4 flex items-center justify-between group hover:bg-white/5 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-400 font-bold">
                                                {issue.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-white">{issue.name}</p>
                                                <p className="text-xs text-gray-500">{issue.plan} Plan • ₱{issue.amount.toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded ">{issue.error}</p>
                                            <p className="text-xs text-gray-500 mt-1">{issue.date}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="p-4 bg-black/20 text-center">
                                <button className="text-sm text-primary font-bold hover:underline">View All Issues</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal for adding/editing promo codes */}
            {isAddPromoModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
                    <div className="bg-[#18181b] border border-white/10 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-slideUp ring-1 ring-white/10">
                        <div className="p-8 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <h2 className="text-2xl font-black text-white  tracking-tight">New Promo Code</h2>
                            <button onClick={() => setIsAddPromoModalOpen(false)} className="text-gray-500 hover:text-white transition-colors p-2 bg-white/5 hover:bg-white/10 rounded-full">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-[10px] font-black  tracking-widest text-gray-500 mb-2">Discount Code</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. SUMMER2024"
                                        value={newPromo.code}
                                        onChange={(e) => setNewPromo({ ...newPromo, code: e.target.value.toUpperCase() })}
                                        className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-4 text-white outline-none  font-black tracking-widest placeholder:tracking-normal placeholder:font-sans placeholder:text-gray-700 transition-all font-mono text-lg"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[10px] font-black  tracking-widest text-gray-500 mb-2">Discount Type</label>
                                        <div className="relative">
                                            <select
                                                value={newPromo.discountType}
                                                onChange={(e) => setNewPromo({ ...newPromo, discountType: e.target.value as any })}
                                                className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-4 text-white outline-none appearance-none font-bold text-sm cursor-pointer"
                                            >
                                                <option value="Percentage">Percentage</option>
                                                <option value="Fixed Amount">Fixed Amount</option>
                                            </select>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                                <ArrowDownRight size={14} className="text-gray-500" />
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black  tracking-widest text-gray-500 mb-2">Value</label>
                                        <input
                                            type="number"
                                            placeholder="20"
                                            value={newPromo.discountValue}
                                            onChange={(e) => setNewPromo({ ...newPromo, discountValue: Number(e.target.value) })}
                                            className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-4 text-white outline-none font-bold text-sm"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black  tracking-widest text-gray-500 mb-2">Category</label>
                                    <div className="relative">
                                        <select
                                            value={newPromo.category}
                                            onChange={(e) => setNewPromo({ ...newPromo, category: e.target.value as any })}
                                            className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-4 text-white outline-none appearance-none font-bold text-sm cursor-pointer"
                                        >
                                            <option value="General">General</option>
                                            <option value="Services">Services</option>
                                            <option value="Store">Store</option>
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                            <ArrowDownRight size={14} className="text-gray-500" />
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black  tracking-widest text-gray-500 mb-2">Description</label>
                                    <textarea
                                        rows={3}
                                        placeholder="What is this code for?"
                                        value={newPromo.description}
                                        onChange={(e) => setNewPromo({ ...newPromo, description: e.target.value })}
                                        className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-4 text-white outline-none resize-none font-medium text-sm"
                                    ></textarea>
                                </div>
                            </div>
                            <div className="flex gap-4 pt-2">
                                <button
                                    onClick={() => setIsAddPromoModalOpen(false)}
                                    className="flex-1 px-6 py-4 rounded-xl bg-white/5 text-gray-400 font-bold  tracking-wider text-xs hover:bg-white/10 hover:text-white transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddPromo}
                                    className="flex-1 px-6 py-4 rounded-xl bg-primary text-white font-black  tracking-widest text-xs shadow-lg shadow-primary/20 hover:bg-orange-600 hover:scale-[1.02] active:scale-95 transition-all"
                                >
                                    Create Promo
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminMonetizationScreen;


