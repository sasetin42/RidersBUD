import React, { useState, useMemo } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import Spinner from '../../components/Spinner';
import { PayoutRequest } from '../../types';
import Modal from '../../components/admin/Modal';
import { useNotification } from '../../context/NotificationContext';
import EnhancedKPICard from '../../components/admin/EnhancedKPICard';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { DollarSign, Clock, CheckCircle, XCircle, Download, Eye, Search, Filter, Calendar, Settings, TrendingUp, CreditCard, ChevronDown, ArrowUpDown, History } from 'lucide-react';

type SortableKeys = 'id' | 'mechanicName' | 'amount' | 'requestDate' | 'status';

const PayoutDetailsModal: React.FC<{
    request: PayoutRequest;
    onClose: () => void;
    onProcess: (payoutId: string, status: 'Approved' | 'Rejected' | 'Paid', details?: { notes?: string; transactionId?: string }) => void;
}> = ({ request, onClose, onProcess }) => {
    const [processing, setProcessing] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [transactionId, setTransactionId] = useState('');
    const [showRejectionInput, setShowRejectionInput] = useState(false);
    const [showPaidInput, setShowPaidInput] = useState(false);

    const handleProcess = async (status: 'Approved' | 'Rejected' | 'Paid') => {
        if (status === 'Rejected' && !rejectionReason.trim()) {
            setShowRejectionInput(true);
            return;
        }
        if (status === 'Paid' && !transactionId.trim() && !showPaidInput) {
            setShowPaidInput(true);
            return;
        }
        setProcessing(true);
        await new Promise(resolve => setTimeout(resolve, 500));
        onProcess(request.id, status, { 
            notes: status === 'Rejected' ? rejectionReason : undefined,
            transactionId: status === 'Paid' ? transactionId : undefined
        });
        setProcessing(false);
        onClose();
    };

    return (
        <Modal title={`Payout Request #${request.id.toUpperCase().slice(-6)}`} isOpen={true} onClose={onClose}>
            <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                <div className="bg-gradient-to-br from-[#1A1A1A] to-black p-6 rounded-[1.5rem] border border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-[50px] rounded-full pointer-events-none"></div>
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div>
                            <p className="text-[10px] font-black  tracking-widest text-gray-500 mb-2">Total Amount</p>
                            <p className="text-5xl font-black text-white tracking-tighter">₱{request.amount.toLocaleString()}</p>
                        </div>
                        <div className={`px-4 py-2 rounded-xl border ${
                            request.status === 'Pending' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500' : 
                            request.status === 'Approved' ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' : 
                            request.status === 'Paid' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 
                            'bg-red-500/10 border-red-500/20 text-red-500'
                        }`}>
                            <p className="text-xs font-black  tracking-widest">{request.status}</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white/5 p-6 rounded-[1.5rem] border border-white/5">
                        <p className="text-[10px] font-black  tracking-widest text-gray-500 mb-2">Mechanic Details</p>
                        <p className="font-bold text-white text-lg">{request.mechanicName}</p>
                        <div className="mt-4 pt-4 border-t border-white/5">
                            <p className="text-[10px] font-black  tracking-widest text-gray-500 mb-1">Request Date</p>
                            <p className="text-sm font-medium text-gray-300">
                                {request.requestDate ? new Date(request.requestDate).toLocaleDateString() : 'Invalid Date'}
                            </p>
                        </div>
                    </div>

                    <div className="bg-white/5 p-6 rounded-[1.5rem] border border-white/5">
                        <p className="text-[10px] font-black  tracking-widest text-gray-500 mb-2">Payment Method</p>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-primary/20 rounded-lg text-primary">
                                <CreditCard size={18} />
                            </div>
                            <p className="font-bold text-white">{request.paymentMethod}</p>
                        </div>
                        <p className="text-sm text-gray-400 font-mono bg-black/30 p-3 rounded-lg border border-white/5">{request.accountDetails}</p>
                    </div>
                </div>

                {request.notes && (
                    <div className="bg-white/5 p-6 rounded-[1.5rem] border border-white/5">
                        <p className="text-[10px] font-black  tracking-widest text-gray-500 mb-2">Request Notes</p>
                        <p className="text-sm text-white ">"{request.notes}"</p>
                    </div>
                )}

                        {(request.adminNotes || request.rejectionReason || request.transactionId) && (
                    <div className="bg-white/5 p-6 rounded-[1.5rem] border border-white/5">
                        <p className="text-[10px] font-black  tracking-widest text-gray-500 mb-2">Admin Remarks</p>
                        <p className="text-sm text-gray-300 italic">"{request.adminNotes || request.rejectionReason || 'No specific remarks.'}"</p>
                        {request.transactionId && (
                            <p className="text-xs text-primary font-mono mt-2 flex items-center gap-2">
                                <History size={14} /> Ref: {request.transactionId}
                            </p>
                        )}
                        {(request.adminName || request.processedBy) && (
                            <p className="text-[10px] text-gray-500 mt-2 font-bold uppercase tracking-tighter">
                                Processed by: {request.adminName || request.processedBy} {request.processDate && `on ${new Date(request.processDate).toLocaleDateString()}`}
                            </p>
                        )}
                    </div>
                )}

                {showRejectionInput && (
                    <div className="bg-red-500/10 p-6 rounded-[1.5rem] border border-red-500/30 animate-fadeIn">
                        <label className="block text-[10px] font-black  tracking-widest text-red-400 mb-2">Reason for Rejection *</label>
                        <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Please provide a clear reason for the mechanic..."
                            className="w-full p-4 bg-black/40 border border-red-500/30 rounded-xl text-white placeholder-red-300/50 focus:ring-1 focus:ring-red-500 focus:border-red-500 resize-none outline-none"
                            rows={3}
                        />
                    </div>
                )}

                {showPaidInput && (
                    <div className="bg-green-500/10 p-6 rounded-[1.5rem] border border-green-500/30 animate-fadeIn">
                        <label className="block text-[10px] font-black  tracking-widest text-green-400 mb-2">Transaction ID / Reference Number *</label>
                        <input
                            type="text"
                            value={transactionId}
                            onChange={(e) => setTransactionId(e.target.value)}
                            placeholder="Enter bank transfer ref or GCash ID..."
                            className="w-full p-4 bg-black/40 border border-green-500/30 rounded-xl text-white placeholder-green-300/50 focus:ring-1 focus:ring-green-500 focus:border-green-500 outline-none"
                        />
                    </div>
                )}

                {request.status === 'Pending' && (
                    <div className="flex gap-4 pt-4 border-t border-white/5">
                        <button
                            onClick={() => handleProcess('Rejected')}
                            disabled={processing}
                            className="flex-1 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white font-black  tracking-widest text-xs py-4 px-6 rounded-xl transition-all border border-red-500/20 disabled:opacity-50"
                        >
                            {processing ? <Spinner size="sm" /> : 'Reject Request'}
                        </button>
                        <button
                            onClick={() => handleProcess('Approved')}
                            disabled={processing}
                            className="flex-1 bg-blue-500/10 hover:bg-blue-500 text-blue-500 hover:text-white font-black  tracking-widest text-xs py-4 px-6 rounded-xl transition-all border border-blue-500/20 disabled:opacity-50 shadow-[0_0_20px_rgba(59,130,246,0.1)] hover:shadow-[0_0_30px_rgba(59,130,246,0.4)]"
                        >
                            {processing ? <Spinner size="sm" /> : 'Approve Request'}
                        </button>
                    </div>
                )}

                {request.status === 'Approved' && (
                    <div className="pt-4 border-t border-white/5">
                        <button
                            onClick={() => handleProcess('Paid')}
                            disabled={processing}
                            className="w-full bg-green-500/10 hover:bg-green-500 text-green-500 hover:text-white font-black  tracking-widest text-xs py-4 px-6 rounded-xl transition-all border border-green-500/20 disabled:opacity-50 shadow-[0_0_20px_rgba(34,197,94,0.1)] hover:shadow-[0_0_30px_rgba(34,197,94,0.4)]"
                        >
                            {processing ? <Spinner size="sm" /> : 'Mark as Paid'}
                        </button>
                    </div>
                )}
            </div>
        </Modal>
    );
};

const PayoutSettingsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { db, updateSettings } = useDatabase();
    const [minPayout, setMinPayout] = useState(db?.settings.minPayoutAmount || 500);
    const [payoutSchedule, setPayoutSchedule] = useState(db?.settings.payoutSchedule || 'Weekly');

    const handleSave = () => {
        updateSettings({
            minPayoutAmount: minPayout,
            payoutSchedule: payoutSchedule as 'Weekly' | 'Bi-weekly' | 'Monthly'
        });
        onClose();
    };

    return (
        <Modal title="Payout Configuration" isOpen={true} onClose={onClose}>
            <div className="space-y-8 p-2">
                <div>
                    <label className="block text-[10px] font-black  tracking-widest text-gray-500 mb-3">Minimum Payout Amount (₱)</label>
                    <div className="relative group">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₱</span>
                        <input
                            type="number"
                            value={minPayout}
                            onChange={(e) => setMinPayout(Number(e.target.value))}
                            className="w-full pl-8 pr-4 py-4 bg-white/5 border border-white/5 rounded-xl text-white font-bold focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                        />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Mechanics must earn at least this amount to request a payout.</p>
                </div>

                <div>
                    <label className="block text-[10px] font-black  tracking-widest text-gray-500 mb-3">Payout Frequency</label>
                    <select
                        value={payoutSchedule}
                        onChange={(e) => setPayoutSchedule(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-white outline-none font-bold text-sm cursor-pointer"
                    >
                        <option value="Weekly" className="bg-[#121212]">Weekly</option>
                        <option value="Bi-weekly" className="bg-[#121212]">Bi-weekly</option>
                        <option value="Monthly" className="bg-[#121212]">Monthly</option>
                    </select>
                </div>

                <div className="flex gap-4 pt-6 border-t border-white/5">
                    <button onClick={onClose} className="flex-1 bg-white/5 hover:bg-white/10 text-white font-black  tracking-widest text-xs py-4 px-6 rounded-xl transition-all border border-white/5">
                        Cancel
                    </button>
                    <button onClick={handleSave} className="flex-1 bg-primary hover:bg-orange-600 text-white font-black  tracking-widest text-xs py-4 px-6 rounded-xl transition-all shadow-lg shadow-primary/20">
                        Save Changes
                    </button>
                </div>
            </div>
        </Modal>
    );
};

const AdminPayoutsScreen: React.FC = () => {
    const { db, updatePayoutStatus, loading } = useDatabase();
    const { addNotification } = useNotification();
    const { adminUser } = useAdminAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'Pending' | 'Approved' | 'Paid' | 'Rejected'>('all');
    const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
    const [viewingRequest, setViewingRequest] = useState<PayoutRequest | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' }>({ key: 'requestDate', direction: 'descending' });

    const requestSort = (key: SortableKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key: SortableKeys) => {
        if (sortConfig.key !== key) return <ArrowUpDown size={14} className="text-gray-600 ml-1" />;
        return sortConfig.direction === 'ascending' ? <ChevronDown size={14} className="text-primary rotate-180 ml-1" /> : <ChevronDown size={14} className="text-primary ml-1" />;
    };

    const stats = useMemo(() => {
        if (!db || !db.payouts) return { totalRequests: 0, totalPaid: 0, pending: 0, avgPayout: 0 };

        const totalRequests = db.payouts.length;
        const paid = db.payouts.filter(p => p.status === 'Paid');
        const totalPaid = paid.reduce((sum, p) => sum + p.amount, 0);
        const pending = db.payouts.filter(p => p.status === 'Pending').length;
        const avgPayout = paid.length > 0 ? totalPaid / paid.length : 0;

        return { totalRequests, totalPaid, pending, avgPayout };
    }, [db]);

    const filteredRequests = useMemo(() => {
        if (!db || !db.payouts) return [];
        let filtered = db.payouts.filter(request => {
            const searchMatch = !searchQuery ||
                request.mechanicName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                request.id.toLowerCase().includes(searchQuery.toLowerCase());

            const statusMatch = statusFilter === 'all' || request.status === statusFilter;

            let dateMatch = true;
            if (dateFilter.start && dateFilter.end && request.requestDate) {
                const startDate = new Date(dateFilter.start).getTime();
                const endDate = new Date(dateFilter.end).getTime() + 86400000;
                const requestDate = new Date(request.requestDate).getTime();
                dateMatch = !isNaN(requestDate) && requestDate >= startDate && requestDate < endDate;
            }

            return searchMatch && statusMatch && dateMatch;
        });

        filtered.sort((a, b) => {
            let aValue: any;
            let bValue: any;

            switch (sortConfig.key) {
                case 'requestDate':
                    aValue = new Date(a.requestDate).getTime();
                    bValue = new Date(b.requestDate).getTime();
                    break;
                case 'amount':
                    aValue = a.amount;
                    bValue = b.amount;
                    break;
                case 'mechanicName':
                    aValue = a.mechanicName.toLowerCase();
                    bValue = b.mechanicName.toLowerCase();
                    break;
                case 'id':
                    aValue = a.id.toLowerCase();
                    bValue = b.id.toLowerCase();
                    break;
                case 'status':
                    aValue = a.status;
                    bValue = b.status;
                    break;
                default:
                    aValue = a.mechanicName.toLowerCase();
                    bValue = b.mechanicName.toLowerCase();
            }

            if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });

        return filtered;
    }, [db, searchQuery, statusFilter, dateFilter, sortConfig]);

    if (loading || !db) {
        return <div className="flex items-center justify-center h-full"><Spinner size="lg" color="text-white" /></div>;
    }

    const handleProcessRequest = async (payoutId: string, status: 'Approved' | 'Rejected' | 'Paid', details?: { notes?: string; transactionId?: string }) => {
        const request = db?.payouts.find(p => p.id === payoutId);
        if (!request) return;

        try {
            await updatePayoutStatus(
                payoutId, 
                status, 
                request.mechanicId, 
                request.amount,
                { 
                    id: adminUser?.id || 'system', 
                    name: adminUser?.name || 'System Admin', 
                    notes: details?.notes,
                    transactionId: details?.transactionId
                }
            );
            
            addNotification({
                type: 'success',
                title: 'Payout Processed',
                message: `Payout request for ${request.mechanicName} has been ${status.toLowerCase()}.`,
                recipientId: 'admin'
            });
        } catch (e) {
            addNotification({
                type: 'error',
                title: 'Processing Failed',
                message: (e as Error).message,
                recipientId: 'admin'
            });
        }
    };

    // Export to CSV
    const exportToCSV = () => {
        const headers = ['Request ID', 'Mechanic', 'Amount', 'Method', 'Status', 'Request Date', 'Processed Date'];
        const rows = filteredRequests.map(r => [
            r.id.toUpperCase().slice(-6),
            r.mechanicName,
            r.amount,
            r.paymentMethod,
            r.status,
            new Date(r.requestDate).toLocaleDateString(),
            r.processedDate ? new Date(r.processedDate).toLocaleDateString() : 'N/A'
        ]);

        const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `payouts-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const clearFilters = () => {
        setSearchQuery('');
        setStatusFilter('all');
        setDateFilter({ start: '', end: '' });
    };

    const activeFiltersCount = (searchQuery ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0) + (dateFilter.start && dateFilter.end ? 1 : 0);

    const statusColors = {
        Pending: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
        Approved: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
        Paid: 'bg-green-500/20 text-green-300 border-green-500/30',
        Rejected: 'bg-red-500/20 text-red-300 border-red-500/30'
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                    <h1 className="text-5xl font-black text-white tracking-tighter  leading-none">Payouts</h1>
                    <div className="flex items-center gap-2 mt-4">
                        <div className="h-1 w-12 bg-primary rounded-full"></div>
                        <p className="text-gray-500 font-bold  tracking-[0.3em] text-[10px]">Finance & Earnings</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="p-4 bg-white/5 hover:bg-white/10 text-white rounded-[1.5rem] border border-white/5 transition-all group"
                        title="Settings"
                    >
                        <Settings size={20} className="group-hover:rotate-90 transition-transform duration-500" />
                    </button>
                    <button
                        onClick={exportToCSV}
                        className="px-6 py-4 bg-white/5 hover:bg-white/10 text-white rounded-[1.5rem] font-black  tracking-widest text-[10px] border border-white/5 transition-all flex items-center gap-3 active:scale-95"
                    >
                        <Download size={18} />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <EnhancedKPICard
                    title="Total Requests"
                    value={stats.totalRequests}
                    icon={<DollarSign size={24} className="text-white" />}
                    gradient="bg-gradient-to-br from-blue-600 to-blue-800"
                    trend={{ value: 15, isPositive: true }}
                    subtitle="All time"
                />
                <EnhancedKPICard
                    title="Total Paid Out"
                    value={`₱${(stats.totalPaid / 1000).toFixed(1)}k`}
                    icon={<CheckCircle size={24} className="text-white" />}
                    gradient="bg-gradient-to-br from-green-600 to-green-800"
                    trend={{ value: 22, isPositive: true }}
                    subtitle="Released payouts"
                />
                <EnhancedKPICard
                    title="Pending Requests"
                    value={stats.pending}
                    icon={<Clock size={24} className="text-white" />}
                    gradient="bg-gradient-to-br from-orange-600 to-orange-800"
                    subtitle="Awaiting approval"
                />
                <EnhancedKPICard
                    title="Avg. Payout"
                    value={`₱${stats.avgPayout.toLocaleString()}`}
                    icon={<TrendingUp size={24} className="text-white" />}
                    gradient="bg-gradient-to-br from-purple-600 to-purple-800"
                    trend={{ value: 8, isPositive: true }}
                    subtitle="Per request"
                />
            </div>

            {/* Filters */}
            <div className="bg-[#121212]/80 backdrop-blur-2xl border border-white/10 p-8 rounded-[2.5rem] mb-8 relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-orange-600 to-red-600 rounded-[2.5rem] blur opacity-5 group-hover:opacity-10 transition duration-1000"></div>
                <div className="flex flex-col lg:flex-row gap-6 relative z-10">
                    <div className="relative flex-1">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                        <input
                            type="text"
                            placeholder="Search mechanic or request ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-16 pr-6 py-4 bg-white/5 border border-white/5 rounded-2xl text-white font-bold placeholder-gray-600 outline-none transition-all"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="bg-white/5 border border-white/5 rounded-2xl px-8 py-4 text-white font-bold outline-none focus:border-primary appearance-none cursor-pointer hover:bg-white/10 transition-colors"
                    >
                        <option value="all" className="bg-[#121212]">All Statuses</option>
                        <option value="Pending" className="bg-[#121212]">Pending</option>
                        <option value="Approved" className="bg-[#121212]">Approved</option>
                        <option value="Paid" className="bg-[#121212]">Paid</option>
                        <option value="Rejected" className="bg-[#121212]">Rejected</option>
                    </select>
                    <div className="flex items-center gap-4 bg-white/5 border border-white/5 rounded-2xl px-4 py-2">
                        <input
                            type="date"
                            value={dateFilter.start}
                            onChange={e => setDateFilter(prev => ({ ...prev, start: e.target.value }))}
                            className="bg-transparent text-white font-bold outline-none text-xs"
                        />
                        <span className="text-gray-500">-</span>
                        <input
                            type="date"
                            value={dateFilter.end}
                            min={dateFilter.start}
                            onChange={e => setDateFilter(prev => ({ ...prev, end: e.target.value }))}
                            className="bg-transparent text-white font-bold outline-none text-xs"
                        />
                    </div>
                    {activeFiltersCount > 0 && (
                        <button
                            onClick={clearFilters}
                            className="px-6 py-4 bg-red-500/10 text-red-500 rounded-2xl font-black  tracking-widest text-[10px] hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="bg-[#121212]/60 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/5">
                                <th className="py-8 px-8 font-black text-gray-500  tracking-[0.2em] text-[10px]">
                                    <button onClick={() => requestSort('id')} className="flex items-center hover:text-white transition-colors group">
                                        Request ID {getSortIndicator('id')}
                                    </button>
                                </th>
                                <th className="py-8 px-8 font-black text-gray-500  tracking-[0.2em] text-[10px]">
                                    <button onClick={() => requestSort('mechanicName')} className="flex items-center hover:text-white transition-colors group">
                                        Mechanic {getSortIndicator('mechanicName')}
                                    </button>
                                </th>
                                <th className="py-8 px-8 font-black text-gray-500  tracking-[0.2em] text-[10px]">
                                    <button onClick={() => requestSort('amount')} className="flex items-center hover:text-white transition-colors group">
                                        Amount {getSortIndicator('amount')}
                                    </button>
                                </th>
                                <th className="py-8 px-8 font-black text-gray-500  tracking-[0.2em] text-[10px]">Payment Method</th>
                                <th className="py-8 px-8 font-black text-gray-500  tracking-[0.2em] text-[10px]">
                                    <button onClick={() => requestSort('requestDate')} className="flex items-center hover:text-white transition-colors group">
                                        Request Date {getSortIndicator('requestDate')}
                                    </button>
                                </th>
                                <th className="py-8 px-8 font-black text-gray-500  tracking-[0.2em] text-[10px]">
                                    <button onClick={() => requestSort('status')} className="flex items-center hover:text-white transition-colors group">
                                        Status {getSortIndicator('status')}
                                    </button>
                                </th>
                                <th className="py-8 px-8 font-black text-gray-500  tracking-[0.2em] text-[10px] text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredRequests.length > 0 ? filteredRequests.map((request, index) => (
                                <tr key={request.id} className={`transition-all duration-200 hover:bg-white/[0.02] group ${index % 2 === 0 ? '' : 'bg-white/[0.01]'}`}>
                                    <td className="py-6 px-8 text-[10px] font-black  tracking-widest text-gray-500">#{request.id.toUpperCase().slice(-6)}</td>
                                    <td className="py-6 px-8 text-sm text-white font-bold">{request.mechanicName}</td>
                                    <td className="py-6 px-8 text-sm font-black text-primary">₱{request.amount.toLocaleString()}</td>
                                    <td className="py-6 px-8 text-xs text-gray-400 font-medium">{request.paymentMethod}</td>
                                    <td className="py-6 px-8 text-xs text-gray-500 font-mono">
                                        {request.requestDate ? new Date(request.requestDate).toLocaleDateString() : 'Invalid Date'}
                                    </td>
                                    <td className="py-6 px-8">
                                        <span className={`px-4 py-2 rounded-xl text-[10px] font-black  tracking-widest border ${statusColors[request.status]}`}>
                                            {request.status}
                                        </span>
                                    </td>
                                    <td className="py-6 px-8 text-center">
                                        <div className="flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                                            <button
                                                onClick={() => setViewingRequest(request)}
                                                className="p-3 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white rounded-xl border border-blue-500/20 transition-all"
                                                title="View Details"
                                            >
                                                <Eye size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={7} className="text-center py-24">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="p-6 rounded-full bg-white/5 border border-white/5">
                                                <DollarSign size={48} className="text-gray-600" />
                                            </div>
                                            <div>
                                                <p className="text-xl font-black text-gray-500  tracking-widest">No payout requests found</p>
                                                <p className="text-sm text-gray-600 mt-2 font-medium">Try adjusting your filters</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {viewingRequest && (
                <PayoutDetailsModal
                    request={viewingRequest}
                    onClose={() => setViewingRequest(null)}
                    onProcess={handleProcessRequest}
                />
            )}
            {isSettingsOpen && <PayoutSettingsModal onClose={() => setIsSettingsOpen(false)} />}
        </div>
    );
};

export default AdminPayoutsScreen;
