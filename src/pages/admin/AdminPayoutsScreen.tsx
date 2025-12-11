import React, { useState, useMemo } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import Spinner from '../../components/Spinner';
import { PayoutRequest, Settings } from '../../types';
import Modal from '../../components/admin/Modal';
import { useNotification } from '../../context/NotificationContext';
import { CreditCard, DollarSign, Clock, CheckCircle, XCircle, AlertTriangle, Settings as SettingsIcon, Search, Filter, Ban } from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*                                SUBCOMPONENTS                               */
/* -------------------------------------------------------------------------- */

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => (
    <div className="glass-panel p-6 rounded-2xl flex items-center gap-5 border border-white/5 relative overflow-hidden group">
        <div className={`p-4 rounded-xl ${color} bg-opacity-10 text-white shadow-inner ring-1 ring-white/10`}>
            {icon}
        </div>
        <div>
            <p className="text-3xl font-bold text-white mb-1">{value}</p>
            <p className="text-sm font-medium text-gray-400 uppercase tracking-wide">{title}</p>
        </div>
    </div>
);

const PayoutDetailsModal: React.FC<{
    request: PayoutRequest;
    onClose: () => void;
    onProcess: (payoutId: string, status: 'Approved' | 'Rejected', reason?: string) => Promise<void>;
}> = ({ request, onClose, onProcess }) => {
    const { db } = useDatabase();
    const [rejectionReason, setRejectionReason] = useState('');
    const [showRejectionInput, setShowRejectionInput] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const mechanic = db?.mechanics.find(m => m.id === request.mechanicId);

    const handleProcess = async (status: 'Approved' | 'Rejected') => {
        setIsProcessing(true);
        await onProcess(request.id, status, rejectionReason);
        setIsProcessing(false);
    };

    return (
        <Modal title={`Payout Request #${request.id.slice(-6)}`} isOpen={true} onClose={onClose}>
            <div className="space-y-6 text-white min-w-[500px]">
                {/* Summary Card */}
                <div className="bg-gradient-to-br from-[#0a0a0a] to-[#111] p-6 rounded-2xl border border-white/10 flex justify-between items-center relative overflow-hidden">
                    <div className="z-10">
                        <p className="text-sm text-gray-400">Total Payout Amount</p>
                        <p className="text-3xl font-bold text-green-400">₱{request.amount.toLocaleString()}</p>
                    </div>
                    <div className="text-right z-10">
                        <p className="font-bold text-lg">{request.mechanicName}</p>
                        <p className="text-sm text-gray-500">Request ID: {request.id.slice(0, 8)}</p>
                    </div>
                    <div className="absolute right-0 bottom-0 opacity-5">
                        <DollarSign size={150} />
                    </div>
                </div>

                {/* Account Details */}
                <div className="bg-white/5 p-5 rounded-xl border border-white/5 space-y-4">
                    <h4 className="font-bold text-gray-400 uppercase text-xs tracking-wider flex items-center gap-2">
                        <CreditCard size={14} /> Destination Account
                    </h4>
                    {mechanic?.payoutDetails ? (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-gray-500">Method</p>
                                <p className="font-bold">{mechanic.payoutDetails.method}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Account Name</p>
                                <p className="font-bold">{mechanic.payoutDetails.accountName}</p>
                            </div>
                            <div className="col-span-2 p-3 bg-black/20 rounded-lg border border-white/5 font-mono text-lg tracking-widest text-center text-primary">
                                {mechanic.payoutDetails.accountNumber}
                            </div>
                            <div className="col-span-2 text-center text-xs text-gray-500">
                                {mechanic.payoutDetails.method === 'Bank Transfer' ? mechanic.payoutDetails.bankName : mechanic.payoutDetails.walletName}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center p-6 border border-dashed border-red-500/30 bg-red-500/5 rounded-xl text-red-400">
                            <AlertTriangle className="mx-auto mb-2" size={24} />
                            No payout details configured for this mechanic.
                        </div>
                    )}
                </div>

                {/* Rejection UI */}
                {showRejectionInput && (
                    <div className="bg-red-900/10 border border-red-500/20 p-4 rounded-xl animate-fadeIn">
                        <label className="text-sm font-bold text-red-300 block mb-2">Reason for Rejection</label>
                        <textarea
                            value={rejectionReason}
                            onChange={e => setRejectionReason(e.target.value)}
                            placeholder="e.g. Incorrect bank details..."
                            className="w-full bg-black/40 border border-red-500/30 rounded-lg p-3 text-white outline-none focus:border-red-500 transition-colors h-24"
                        />
                        <div className="flex justify-end gap-3 mt-3">
                            <button onClick={() => setShowRejectionInput(false)} className="text-gray-400 hover:text-white text-sm font-bold px-3">Cancel</button>
                            <button
                                onClick={() => handleProcess('Rejected')}
                                disabled={!rejectionReason.trim()}
                                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Confirm Rejection
                            </button>
                        </div>
                    </div>
                )}

                {/* Actions */}
                {request.status === 'Pending' && !showRejectionInput && (
                    <div className="flex gap-4 pt-2">
                        <button
                            onClick={() => setShowRejectionInput(true)}
                            disabled={isProcessing}
                            className="flex-1 bg-white/5 hover:bg-red-500/10 text-gray-300 hover:text-red-400 border border-white/10 hover:border-red-500/30 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                        >
                            <Ban size={18} /> Reject
                        </button>
                        <button
                            onClick={() => handleProcess('Approved')}
                            disabled={isProcessing}
                            className="flex-[2] bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-green-500/20 flex items-center justify-center gap-2"
                        >
                            {isProcessing ? <Spinner size="sm" /> : <><CheckCircle size={18} /> Approve Payout</>}
                        </button>
                    </div>
                )}
            </div>
        </Modal>
    );
};

const PayoutSettingsModal: React.FC<{ onClose: () => void; }> = ({ onClose }) => {
    const { db, updateSettings } = useDatabase();
    const [settings, setSettings] = useState(db!.settings);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        await updateSettings(settings);
        setIsSaving(false);
        onClose();
    };

    return (
        <Modal title="Global Payout Configuration" isOpen={true} onClose={onClose}>
            <div className="space-y-6 text-white min-w-[400px]">
                <div className="space-y-4">
                    <div>
                        <label className="text-xs text-gray-400 uppercase font-bold mb-1 block">Minimum Payout (₱)</label>
                        <input type="number" value={settings.minimumPayout} onChange={e => setSettings(s => ({ ...s, minimumPayout: Number(e.target.value) }))} className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-2.5 focus:border-primary focus:ring-1 outline-none" />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 uppercase font-bold mb-1 block">Maximum Payout (₱)</label>
                        <input type="number" value={settings.maximumPayout} onChange={e => setSettings(s => ({ ...s, maximumPayout: Number(e.target.value) }))} className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-2.5 focus:border-primary focus:ring-1 outline-none" />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 uppercase font-bold mb-1 block">Auto-Schedule</label>
                        <select value={settings.payoutSchedule} onChange={e => setSettings(s => ({ ...s, payoutSchedule: e.target.value as Settings['payoutSchedule'] }))} className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-2.5 focus:border-primary focus:ring-1 outline-none">
                            <option value="Manual">Manual Approval Only</option>
                            <option value="Weekly">Weekly (Fridays)</option>
                            <option value="Bi-weekly">Bi-weekly (1st & 15th)</option>
                        </select>
                    </div>
                </div>
                <div className="flex justify-end pt-4 border-t border-white/10">
                    <button onClick={handleSave} disabled={isSaving} className="bg-primary hover:bg-orange-600 text-white font-bold py-2 px-6 rounded-lg transition-colors flex items-center gap-2">
                        {isSaving ? <Spinner size="sm" /> : 'Save Configuration'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

/* -------------------------------------------------------------------------- */
/*                               MAIN COMPONENT                               */
/* -------------------------------------------------------------------------- */

const AdminPayoutsScreen: React.FC = () => {
    const { db, processPayoutRequest, loading } = useDatabase();
    const { addNotification } = useNotification();

    const [statusFilter, setStatusFilter] = useState<'all' | PayoutRequest['status']>('all');
    const [viewingRequest, setViewingRequest] = useState<PayoutRequest | null>(null);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

    if (loading || !db) return <div className="flex items-center justify-center h-full"><Spinner size="lg" color="text-white" /></div>;

    // Derived Data
    const filteredPayouts = useMemo(() => {
        let payouts = [...db.payouts].sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
        if (statusFilter !== 'all') payouts = payouts.filter(p => p.status === statusFilter);
        return payouts;
    }, [db.payouts, statusFilter]);

    const stats = useMemo(() => {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const totalPaidMonth = db.payouts
            .filter(p => p.status === 'Approved' && p.processDate && new Date(p.processDate) >= firstDayOfMonth)
            .reduce((sum, p) => sum + p.amount, 0);
        return {
            pending: db.payouts.filter(p => p.status === 'Pending').length,
            totalPaidMonth,
            pendingAmount: db.payouts.filter(p => p.status === 'Pending').reduce((sum, p) => sum + p.amount, 0),
        };
    }, [db.payouts]);

    const handleProcessRequest = async (payoutId: string, status: 'Approved' | 'Rejected', reason?: string) => {
        try {
            await processPayoutRequest(payoutId, status, reason);
            addNotification({ type: 'success', title: 'Success', message: `Payout has been ${status.toLowerCase()}.`, recipientId: 'all' });
            setViewingRequest(null);
        } catch (e) {
            addNotification({ type: 'error', title: 'Error', message: (e as Error).message, recipientId: 'all' });
        }
    };

    return (
        <div className="space-y-8 animate-slideInUp">
            {/* Header & Stats */}
            <div>
                <div className="flex justify-between items-end mb-6">
                    <h1 className="text-3xl font-bold text-white">Financials</h1>
                    <button
                        onClick={() => setIsSettingsModalOpen(true)}
                        className="bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 px-4 py-2 rounded-xl flex items-center gap-2 transition-colors text-sm font-bold"
                    >
                        <SettingsIcon size={16} /> Settings
                    </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <StatCard title="Pending Requests" value={stats.pending} icon={<Clock size={24} />} color="bg-yellow-500" />
                    <StatCard title="Pending Amount" value={`₱${stats.pendingAmount.toLocaleString()}`} icon={<AlertTriangle size={24} />} color="bg-orange-500" />
                    <StatCard title="Paid This Month" value={`₱${(stats.totalPaidMonth / 1000).toFixed(1)}k`} icon={<CheckCircle size={24} />} color="bg-green-500" />
                </div>
            </div>

            {/* Main Content */}
            <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden flex flex-col min-h-[500px]">
                {/* Toolbar */}
                <div className="p-5 border-b border-white/5 flex gap-4 bg-white/5">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="bg-[#0a0a0a] text-white border border-white/10 rounded-xl px-4 py-2.5 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 cursor-pointer min-w-[200px]"
                    >
                        <option value="all">All Transactions</option>
                        <option value="Pending">Pending Review</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                    </select>
                </div>

                {/* Table */}
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/[0.02] text-xs uppercase tracking-wider text-gray-400 font-medium">
                                <th className="p-5 pl-6">Mechanic</th>
                                <th className="p-5">Amount</th>
                                <th className="p-5">Request Date</th>
                                <th className="p-5">Status</th>
                                <th className="p-5">Process Date</th>
                                <th className="p-5 text-right pr-6">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-sm">
                            {filteredPayouts.length > 0 ? filteredPayouts.map(payout => (
                                <tr key={payout.id} className="group hover:bg-white/5 transition-colors">
                                    <td className="p-5 pl-6 font-bold text-white group-hover:text-primary transition-colors">
                                        {payout.mechanicName}
                                    </td>
                                    <td className="p-5 font-mono text-green-400 font-bold">
                                        ₱{payout.amount.toLocaleString()}
                                    </td>
                                    <td className="p-5 text-gray-400">
                                        {new Date(payout.requestDate).toLocaleDateString()}
                                    </td>
                                    <td className="p-5">
                                        <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wide border ${payout.status === 'Approved' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                payout.status === 'Rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                    'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                            }`}>
                                            {payout.status}
                                        </span>
                                    </td>
                                    <td className="p-5 text-gray-400">
                                        {payout.processDate ? new Date(payout.processDate).toLocaleDateString() : '—'}
                                    </td>
                                    <td className="p-5 text-right pr-6">
                                        <button
                                            onClick={() => setViewingRequest(payout)}
                                            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-primary/20 hover:text-primary text-gray-300 transition-all text-xs font-bold"
                                        >
                                            Review
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan={6} className="p-10 text-center text-gray-500">No records found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {viewingRequest && <PayoutDetailsModal request={viewingRequest} onClose={() => setViewingRequest(null)} onProcess={handleProcessRequest} />}
            {isSettingsModalOpen && <PayoutSettingsModal onClose={() => setIsSettingsModalOpen(false)} />}
        </div>
    );
};

export default AdminPayoutsScreen;