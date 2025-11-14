import React, { useState, useMemo } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import Spinner from '../../components/Spinner';
import { PayoutRequest, Settings } from '../../types';
import Modal from '../../components/admin/Modal';
import { useNotification } from '../../context/NotificationContext';

const StatCard: React.FC<{ title: string; value: string | number; }> = ({ title, value }) => (
    <div className="bg-admin-card p-4 rounded-xl shadow border border-admin-border">
        <p className="text-sm text-admin-text-secondary">{title}</p>
        <p className="text-3xl font-bold text-admin-text-primary mt-1">{value}</p>
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
    const [error, setError] = useState('');

    const mechanic = db?.mechanics.find(m => m.id === request.mechanicId);
    
    const handleProcess = async (status: 'Approved' | 'Rejected') => {
        if (status === 'Rejected' && !rejectionReason.trim()) {
            setError('Please provide a reason for rejection.');
            return;
        }
        setError('');
        setIsProcessing(true);
        await onProcess(request.id, status, rejectionReason);
        setIsProcessing(false);
    };

    return (
        <Modal title={`Payout Request #${request.id.slice(-6)}`} isOpen={true} onClose={onClose}>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                <div className="bg-admin-bg p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-sm text-admin-text-secondary">Mechanic</p>
                            <p className="font-bold text-lg">{request.mechanicName}</p>
                        </div>
                        <div>
                            <p className="text-sm text-admin-text-secondary text-right">Amount</p>
                            <p className="font-bold text-lg text-green-400">₱{request.amount.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
                {mechanic?.payoutDetails ? (
                    <div className="bg-admin-bg p-4 rounded-lg">
                        <h4 className="font-bold text-admin-accent mb-2">Payout Destination</h4>
                        <p className="text-sm"><span className="text-admin-text-secondary">Method:</span> {mechanic.payoutDetails.method}</p>
                        {mechanic.payoutDetails.method === 'Bank Transfer' ? (
                             <p className="text-sm"><span className="text-admin-text-secondary">Bank:</span> {mechanic.payoutDetails.bankName}</p>
                        ) : (
                             <p className="text-sm"><span className="text-admin-text-secondary">Wallet:</span> {mechanic.payoutDetails.walletName}</p>
                        )}
                        <p className="text-sm"><span className="text-admin-text-secondary">Account Name:</span> {mechanic.payoutDetails.accountName}</p>
                        <p className="text-sm"><span className="text-admin-text-secondary">Account Number:</span> {mechanic.payoutDetails.accountNumber}</p>
                    </div>
                ) : (
                    <p className="text-sm text-center text-red-400 bg-red-900/50 p-3 rounded-md">Mechanic has no payout details configured.</p>
                )}
                {showRejectionInput && (
                    <div className="pt-4">
                        <label className="text-sm text-admin-text-secondary">Reason for Rejection</label>
                        <textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} rows={3} className={`w-full p-2 bg-admin-bg border rounded mt-1 ${error ? 'border-red-500' : 'border-admin-border'}`} />
                         {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
                        <button onClick={() => handleProcess('Rejected')} disabled={isProcessing} className="w-full mt-2 bg-red-600 font-bold py-2 px-4 rounded-lg flex items-center justify-center">
                             {isProcessing ? <Spinner size="sm" /> : 'Confirm Rejection'}
                        </button>
                    </div>
                )}
            </div>
            {request.status === 'Pending' && !showRejectionInput && (
                 <div className="mt-6 flex justify-end gap-4 border-t border-admin-border pt-4">
                    <button onClick={() => setShowRejectionInput(true)} disabled={isProcessing} className="bg-red-800/50 text-red-300 font-bold py-2 px-4 rounded-lg hover:bg-red-800/80">Reject</button>
                    <button onClick={() => handleProcess('Approved')} disabled={isProcessing} className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 flex items-center justify-center min-w-[150px]">
                        {isProcessing ? <Spinner size="sm" /> : 'Approve Payout'}
                    </button>
                </div>
            )}
        </Modal>
    );
};

const PayoutSettingsModal: React.FC<{
    onClose: () => void;
}> = ({ onClose }) => {
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
        <Modal title="Payout Settings" isOpen={true} onClose={onClose}>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-admin-text-secondary mb-1">Minimum Payout Amount (₱)</label>
                    <input 
                        type="number" 
                        value={settings.minimumPayout} 
                        onChange={e => setSettings(s => ({ ...s, minimumPayout: Number(e.target.value) }))} 
                        className="w-full p-2 bg-admin-bg border border-admin-border rounded-md"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-admin-text-secondary mb-1">Maximum Payout Amount (₱)</label>
                    <input 
                        type="number" 
                        value={settings.maximumPayout} 
                        onChange={e => setSettings(s => ({ ...s, maximumPayout: Number(e.target.value) }))} 
                        className="w-full p-2 bg-admin-bg border border-admin-border rounded-md"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-admin-text-secondary mb-1">Payout Schedule</label>
                    <select 
                        value={settings.payoutSchedule} 
                        onChange={e => setSettings(s => ({ ...s, payoutSchedule: e.target.value as Settings['payoutSchedule'] }))} 
                        className="w-full p-2 bg-admin-bg border border-admin-border rounded-md"
                    >
                        <option value="Manual">Manual Processing</option>
                        <option value="Weekly">Weekly (e.g., every Friday)</option>
                        <option value="Bi-weekly">Bi-weekly (e.g., 1st and 15th)</option>
                    </select>
                </div>
            </div>
            <div className="mt-6 flex justify-end gap-4 border-t border-admin-border pt-4">
                <button onClick={onClose} disabled={isSaving} className="bg-admin-border font-bold py-2 px-4 rounded-lg">Cancel</button>
                <button onClick={handleSave} disabled={isSaving} className="bg-admin-accent font-bold py-2 px-4 rounded-lg flex items-center justify-center min-w-[120px]">
                    {isSaving ? <Spinner size="sm"/> : 'Save Settings'}
                </button>
            </div>
        </Modal>
    );
};


const AdminPayoutsScreen: React.FC = () => {
    const { db, processPayoutRequest, loading } = useDatabase();
    const { addNotification } = useNotification();
    const [statusFilter, setStatusFilter] = useState<'all' | PayoutRequest['status']>('all');
    const [viewingRequest, setViewingRequest] = useState<PayoutRequest | null>(null);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

    const filteredPayouts = useMemo(() => {
        if (!db?.payouts) return [];
        let payouts = [...db.payouts].sort((a,b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
        if (statusFilter !== 'all') {
            payouts = payouts.filter(p => p.status === statusFilter);
        }
        return payouts;
    }, [db, statusFilter]);
    
    const stats = useMemo(() => {
        if (!db?.payouts) return { pending: 0, totalPaidMonth: 0 };
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const totalPaidMonth = db.payouts
            .filter(p => p.status === 'Approved' && p.processDate && new Date(p.processDate) >= firstDayOfMonth)
            .reduce((sum, p) => sum + p.amount, 0);
        return {
            pending: db.payouts.filter(p => p.status === 'Pending').length,
            totalPaidMonth,
        };
    }, [db]);

    if (loading || !db) {
        return <div className="flex items-center justify-center h-full"><Spinner size="lg" color="text-white" /></div>;
    }

    const handleProcessRequest = async (payoutId: string, status: 'Approved' | 'Rejected', reason?: string) => {
        try {
            await processPayoutRequest(payoutId, status, reason);
            // FIX: Add missing `recipientId` property.
            addNotification({ type: 'success', title: 'Payout Processed', message: `Request #${payoutId.slice(-6)} has been ${status.toLowerCase()}.`, recipientId: 'all' });
            setViewingRequest(null);
        } catch (e) {
            // FIX: Add missing `recipientId` property.
            addNotification({ type: 'error', title: 'Processing Failed', message: (e as Error).message, recipientId: 'all' });
        }
    };
    
    const statusColors: Record<PayoutRequest['status'], string> = { Pending: 'bg-yellow-500/20 text-yellow-300', Approved: 'bg-green-500/20 text-green-300', Rejected: 'bg-red-500/20 text-red-300' };

    return (
        <div className="flex flex-col h-full overflow-hidden">
             <div className="flex-shrink-0">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold">Payouts Management</h1>
                    <button onClick={() => setIsSettingsModalOpen(true)} className="bg-admin-card text-white font-bold py-2 px-4 rounded-lg hover:bg-admin-border transition flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.532 1.532 0 012.287-.947c1.372.836 2.942-.734-2.106-2.106a1.532 1.532 0 01.947-2.287c1.561-.379-1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>
                        Payout Settings
                    </button>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
                    <StatCard title="Pending Requests" value={stats.pending} />
                    <StatCard title="Paid This Month" value={`₱${(stats.totalPaidMonth/1000).toFixed(1)}k`} />
                </div>
                <div className="flex items-center gap-4 mb-4">
                     <p className="text-sm text-admin-text-secondary">Filter by status:</p>
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="w-full max-w-xs p-2 bg-admin-card border border-admin-border rounded-lg">
                        <option value="all">All</option>
                        <option value="Pending">Pending</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                    </select>
                </div>
            </div>
            <div className="flex-1 overflow-auto mt-4">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead className="sticky top-0 bg-admin-bg z-10">
                            <tr>
                                <th className="py-3 px-2 font-semibold text-admin-text-secondary uppercase text-xs border-b border-admin-border">Mechanic</th>
                                <th className="py-3 px-2 font-semibold text-admin-text-secondary uppercase text-xs border-b border-admin-border">Amount</th>
                                <th className="py-3 px-2 font-semibold text-admin-text-secondary uppercase text-xs border-b border-admin-border">Request Date</th>
                                <th className="py-3 px-2 font-semibold text-admin-text-secondary uppercase text-xs border-b border-admin-border">Status</th>
                                <th className="py-3 px-2 font-semibold text-admin-text-secondary uppercase text-xs border-b border-admin-border">Process Date</th>
                                <th className="py-3 px-2 font-semibold text-admin-text-secondary uppercase text-xs border-b border-admin-border">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-admin-border">
                            {filteredPayouts.map(payout => (
                                <tr key={payout.id} className="hover:bg-admin-card">
                                    <td className="py-3 px-2 text-sm">{payout.mechanicName}</td>
                                    <td className="py-3 px-2 text-sm font-semibold text-green-400">₱{payout.amount.toLocaleString()}</td>
                                    <td className="py-3 px-2 text-xs">{new Date(payout.requestDate).toLocaleDateString()}</td>
                                    <td className="py-3 px-2"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[payout.status]}`}>{payout.status}</span></td>
                                    <td className="py-3 px-2 text-xs">{payout.processDate ? new Date(payout.processDate).toLocaleDateString() : 'N/A'}</td>
                                    <td className="py-3 px-2"><button onClick={() => setViewingRequest(payout)} className="font-semibold text-blue-400 hover:text-blue-300 text-sm">View</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                 {filteredPayouts.length === 0 && <p className="text-center py-10 text-admin-text-secondary">No payout requests match the current filters.</p>}
            </div>
            {viewingRequest && <PayoutDetailsModal request={viewingRequest} onClose={() => setViewingRequest(null)} onProcess={handleProcessRequest} />}
            {isSettingsModalOpen && <PayoutSettingsModal onClose={() => setIsSettingsModalOpen(false)} />}
        </div>
    );
};

export default AdminPayoutsScreen;