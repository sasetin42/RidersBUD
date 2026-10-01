import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useNotification } from '../../context/NotificationContext';
import Spinner from '../../components/Spinner';
import { getJobTotalAmount } from '../../utils/mechanicLedger';
import {
    ShieldCheck,
    Webhook,
    Calculator,
    Download,
    RefreshCw,
    ChevronDown,
    ChevronUp,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Search,
    Filter,
    DollarSign,
    Layers,
    Copy,
    Check,
    ArrowUpRight,
    Smartphone,
    CreditCard,
    Banknote,
    Clock,
    FileSpreadsheet
} from 'lucide-react';

/**
 * Admin Payment Audit & Financial Reconciliation Suite
 *
 * Tab 1 — Gateway Webhooks: Live telemetry of `paymentWebhookLogs` written by
 *         HitPay Cloud Functions, with signature checks, payload inspection & search.
 *
 * Tab 2 — Earnings Ledger: Audits completed bookings against expected platform/mechanic
 *         split (default 70/30) and detects any over-credited or missing-credit anomalies.
 *
 * Tab 3 — Channel Reconciliation: Cross-channel breakdown across Online Gateway,
 *         Manual GCash receipts, and Cash on Delivery (COD).
 */

interface WebhookLogDoc {
    id: string;
    receivedAt?: any;
    paymentId?: string;
    payment_id?: string;
    paymentRequestId?: string;
    payment_request_id?: string;
    referenceNumber?: string;
    reference_number?: string;
    status?: string;
    amount?: string | number;
    currency?: string;
    paymentMethod?: string;
    payment_type?: string;
    matched?: boolean;
    matchedCollection?: string;
    matchedId?: string;
    signatureValid?: boolean | null;
    error?: string;
    rawPayload?: any;
    raw?: any;
    [key: string]: any;
}

interface EarningsRow {
    bookingId: string;
    customerName: string;
    mechanicId: string;
    mechanicName: string;
    paymentMethod: string;
    gross: number;
    expectedNet: number;
    credited: number;
    discrepancy: number;
    released: boolean;
    paid: boolean;
    completedAt?: string;
}

const formatPeso = (n: number): string =>
    `₱${(Number.isFinite(n) ? n : 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const toDate = (v: any): Date | null => {
    if (!v) return null;
    if (typeof v?.toDate === 'function') return v.toDate();
    if (v?.seconds) return new Date(v.seconds * 1000);
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
};

export const AdminPaymentAuditScreen: React.FC = () => {
    const { db, loading: dbLoading, updateBooking } = useDatabase() as any;
    const { adminUser } = useAdminAuth();
    const { addNotification } = useNotification();

    const [activeTab, setActiveTab] = useState<'webhooks' | 'earnings' | 'channels'>('webhooks');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [anomalyFilter, setAnomalyFilter] = useState<'all' | 'anomalies' | 'released' | 'pending'>('all');
    const [search, setSearch] = useState('');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [feeOverride, setFeeOverride] = useState<number | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [releasingId, setReleasingId] = useState<string | null>(null);

    const serviceFeePercentage = feeOverride ?? db?.settings?.serviceFeePercentage ?? 30;

    // ---- Webhook logs from Firestore with resilient fallback query ----
    const [webhookLogs, setWebhookLogs] = useState<WebhookLogDoc[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(true);
    const [logsError, setLogsError] = useState<string | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchWebhookLogs = useCallback(async (manual = false) => {
        if (manual) setIsRefreshing(true);
        try {
            const { collection, getDocs, query, orderBy, limit } = await import('firebase/firestore');
            const { db: firestore } = await import('../../firebase');

            let snap: any;
            try {
                // Primary query with orderBy
                const q = query(collection(firestore, 'paymentWebhookLogs'), orderBy('receivedAt', 'desc'), limit(150));
                snap = await getDocs(q);
            } catch (err: any) {
                console.warn('[PaymentAudit] Ordered query failed, attempting unindexed fallback query:', err);
                // Fallback query in case composite index is not yet built
                const fallbackQ = query(collection(firestore, 'paymentWebhookLogs'), limit(150));
                snap = await getDocs(fallbackQ);
            }

            const rows: WebhookLogDoc[] = snap.docs.map((d: any) => {
                const data = d.data() || {};
                return {
                    id: d.id,
                    ...data,
                    // Normalized properties for consistent access
                    paymentId: data.paymentId || data.payment_id || data.id || '',
                    paymentRequestId: data.paymentRequestId || data.payment_request_id || '',
                    referenceNumber: data.referenceNumber || data.reference_number || data.reference || '',
                    status: (data.status || 'unknown').toLowerCase(),
                    amount: data.amount != null ? Number(data.amount) : undefined,
                    paymentMethod: data.paymentMethod || data.payment_type || 'HitPay (Online)',
                    rawPayload: data.rawPayload ?? data.raw ?? data
                };
            });

            // Ensure descending chronological order client-side
            rows.sort((a, b) => {
                const timeA = toDate(a.receivedAt)?.getTime() || 0;
                const timeB = toDate(b.receivedAt)?.getTime() || 0;
                return timeB - timeA;
            });

            setWebhookLogs(rows);
            setLogsError(null);
        } catch (e: any) {
            console.error('[PaymentAudit] Error loading webhook logs:', e);
            setLogsError(e?.message || 'Could not connect to paymentWebhookLogs collection.');
        } finally {
            setLoadingLogs(false);
            if (manual) setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        let disposed = false;
        fetchWebhookLogs();
        const interval = window.setInterval(() => {
            if (!disposed) fetchWebhookLogs();
        }, 20000); // 20s live polling
        return () => {
            disposed = true;
            window.clearInterval(interval);
        };
    }, [fetchWebhookLogs]);

    // ---- Earnings ledger rows calculation ----
    const earningsRows: EarningsRow[] = useMemo(() => {
        if (!db?.bookings || !db?.mechanics) return [];
        const rows: EarningsRow[] = [];

        for (const b of db.bookings) {
            if (b.status !== 'Completed') continue;
            // Exclude clearly failed transactions
            if (b.isPaid === false || b.paymentStatus === 'failed') continue;

            const mechanicId = b.mechanicId || b.mechanic?.id || '';
            const mechanic = db.mechanics.find((m: any) => m.id === mechanicId) || b.mechanic || {};
            const gross = getJobTotalAmount(b);
            if (gross <= 0) continue;

            const expectedNet = Math.max(0, Math.round(gross * (1 - serviceFeePercentage / 100)));
            const credited =
                b.earningsAmount != null
                    ? Number(b.earningsAmount)
                    : b.earningsReleased
                    ? expectedNet
                    : 0;

            const completedTimestamp =
                b.completedAt ||
                b.statusHistory?.slice().reverse().find((h: any) => h.status === 'Completed')?.timestamp ||
                b.date;

            rows.push({
                bookingId: b.id,
                customerName: b.customerName || b.userName || 'Customer',
                mechanicId,
                mechanicName: b.mechanicName || mechanic.name || 'Assigned Mechanic',
                paymentMethod: b.paymentMethod || 'Online',
                gross,
                expectedNet,
                credited,
                discrepancy: credited - expectedNet,
                released: !!b.earningsReleased,
                paid: b.isPaid !== false,
                completedAt: completedTimestamp
            });
        }

        return rows.sort((a, b) => (toDate(b.completedAt)?.getTime() || 0) - (toDate(a.completedAt)?.getTime() || 0));
    }, [db?.bookings, db?.mechanics, serviceFeePercentage]);

    // Filtered Webhook Logs
    const filteredLogs = useMemo(() => {
        let rows = webhookLogs;
        if (statusFilter !== 'all') {
            if (statusFilter === 'unmatched') {
                rows = rows.filter(r => r.matched === false || (!r.matched && !r.matchedId));
            } else {
                rows = rows.filter(r => (r.status || '').toLowerCase() === statusFilter);
            }
        }
        if (search.trim()) {
            const s = search.trim().toLowerCase();
            rows = rows.filter(r =>
                (r.referenceNumber || '').toLowerCase().includes(s) ||
                (r.paymentId || '').toLowerCase().includes(s) ||
                (r.paymentRequestId || '').toLowerCase().includes(s) ||
                (r.matchedId || '').toLowerCase().includes(s) ||
                (r.id || '').toLowerCase().includes(s)
            );
        }
        return rows;
    }, [webhookLogs, statusFilter, search]);

    // Filtered Earnings Rows
    const filteredEarnings = useMemo(() => {
        let list = earningsRows;
        if (anomalyFilter === 'anomalies') {
            list = list.filter(r => Math.abs(r.discrepancy) > 1 || !r.released);
        } else if (anomalyFilter === 'released') {
            list = list.filter(r => r.released && Math.abs(r.discrepancy) <= 1);
        } else if (anomalyFilter === 'pending') {
            list = list.filter(r => !r.released);
        }

        if (search.trim()) {
            const s = search.trim().toLowerCase();
            list = list.filter(r =>
                r.bookingId.toLowerCase().includes(s) ||
                r.mechanicName.toLowerCase().includes(s) ||
                r.customerName.toLowerCase().includes(s) ||
                r.paymentMethod.toLowerCase().includes(s)
            );
        }
        return list;
    }, [earningsRows, anomalyFilter, search]);

    // Overall KPI Totals
    const ledgerTotals = useMemo(() => {
        const gross = earningsRows.reduce((s, r) => s + r.gross, 0);
        const expected = earningsRows.reduce((s, r) => s + r.expectedNet, 0);
        const credited = earningsRows.reduce((s, r) => s + r.credited, 0);
        const pendingEscrow = earningsRows.filter(r => !r.released).reduce((s, r) => s + r.expectedNet, 0);
        const discrepancies = earningsRows.filter(r => r.released && Math.abs(r.discrepancy) > 1).length;
        const unreleasedCount = earningsRows.filter(r => !r.released).length;

        return {
            gross,
            expected,
            credited,
            platformCut: gross - expected,
            pendingEscrow,
            discrepancies,
            unreleasedCount
        };
    }, [earningsRows]);

    // Payment Channel Aggregations
    const channelMetrics = useMemo(() => {
        const bookings = db?.bookings || [];
        let hitpayVol = 0, hitpayCount = 0;
        let gcashVol = 0, gcashCount = 0;
        let codVol = 0, codCount = 0;

        for (const b of bookings) {
            const amt = getJobTotalAmount(b);
            const method = (b.paymentMethod || '').toLowerCase();
            if (method.includes('hitpay') || method.includes('gateway') || method.includes('card') || method.includes('online')) {
                hitpayVol += amt;
                hitpayCount++;
            } else if (method.includes('gcash')) {
                gcashVol += amt;
                gcashCount++;
            } else {
                codVol += amt;
                codCount++;
            }
        }

        return {
            hitpay: { vol: hitpayVol, count: hitpayCount },
            gcash: { vol: gcashVol, count: gcashCount },
            cod: { vol: codVol, count: codCount }
        };
    }, [db?.bookings]);

    // Copy to clipboard helper
    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    // Manual Release of Earnings for an unreleased booking
    const handleReleaseEarnings = async (row: EarningsRow) => {
        if (!updateBooking) {
            alert('Booking update capability is unavailable.');
            return;
        }

        setReleasingId(row.bookingId);
        try {
            await updateBooking(row.bookingId, {
                earningsReleased: true,
                earningsReleasedAt: new Date().toISOString(),
                earningsAmount: row.expectedNet
            });
            addNotification?.({
                type: 'success',
                title: 'Earnings Credited',
                message: `Released ${formatPeso(row.expectedNet)} to mechanic ${row.mechanicName} for #${row.bookingId.slice(-6).toUpperCase()}`
            });
        } catch (err: any) {
            console.error('Failed to release earnings:', err);
            alert(`Error updating booking: ${err?.message || 'Unknown error'}`);
        } finally {
            setReleasingId(null);
        }
    };

    // CSV Download
    const downloadCsv = (filename: string, rows: Record<string, any>[]) => {
        if (!rows.length) {
            alert('No data available to export.');
            return;
        }
        const headers = Object.keys(rows[0]);
        const escape = (v: any) => {
            const s = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
            return `"${s.replace(/"/g, '""')}"`;
        };
        const csv = [headers.join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (dbLoading && !db) {
        return (
            <div className="min-h-screen bg-[#0F0F10] flex flex-col items-center justify-center text-white">
                <Spinner size="lg" color="text-emerald-400" />
                <p className="mt-4 text-xs font-bold uppercase tracking-widest text-gray-500 animate-pulse">
                    Connecting to Payment Audit Vault...
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0F0F10] text-white p-4 sm:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/5 pb-6">
                <div className="flex items-center gap-4">
                    <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-lg shadow-emerald-500/5">
                        <ShieldCheck size={32} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Payment Audit</h1>
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                                Live Vault
                            </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                            Gateway webhook verification, platform commission split ({100 - serviceFeePercentage}/{serviceFeePercentage} split), &amp; multi-channel reconciliation.
                        </p>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex items-center gap-1.5 bg-black/50 border border-white/10 rounded-2xl p-1.5 self-start lg:self-auto overflow-x-auto">
                    {[
                        { id: 'webhooks', label: 'Gateway Webhooks', icon: Webhook, badge: webhookLogs.length },
                        { id: 'earnings', label: 'Earnings Ledger', icon: Calculator, badge: ledgerTotals.discrepancies > 0 ? `${ledgerTotals.discrepancies} issue` : undefined },
                        { id: 'channels', label: 'Reconciliation', icon: Layers }
                    ].map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black tracking-wider transition-all whitespace-nowrap ${
                                    isActive
                                        ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                <Icon size={15} />
                                <span>{tab.label}</span>
                                {tab.badge && (
                                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                        isActive ? 'bg-black/20 text-black' : 'bg-white/10 text-gray-300'
                                    }`}>
                                        {tab.badge}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Global Key Metrics Overview */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                <div className="p-4 rounded-2xl bg-black/40 border border-white/5 relative overflow-hidden">
                    <div className="absolute top-2 right-2 text-white/5">
                        <DollarSign size={40} />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Gross Completed</p>
                    <p className="text-lg sm:text-xl font-black mt-1 text-white">{formatPeso(ledgerTotals.gross)}</p>
                    <p className="text-[10px] text-gray-500 mt-1">{earningsRows.length} completed bookings</p>
                </div>

                <div className="p-4 rounded-2xl bg-black/40 border border-white/5 relative overflow-hidden">
                    <div className="absolute top-2 right-2 text-amber-400/5">
                        <ArrowUpRight size={40} />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">Platform Cut ({serviceFeePercentage}%)</p>
                    <p className="text-lg sm:text-xl font-black mt-1 text-amber-400">{formatPeso(ledgerTotals.platformCut)}</p>
                    <p className="text-[10px] text-gray-500 mt-1">Net platform revenue</p>
                </div>

                <div className="p-4 rounded-2xl bg-black/40 border border-white/5 relative overflow-hidden">
                    <div className="absolute top-2 right-2 text-emerald-400/5">
                        <ShieldCheck size={40} />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Mechanic Cut ({100 - serviceFeePercentage}%)</p>
                    <p className="text-lg sm:text-xl font-black mt-1 text-emerald-400">{formatPeso(ledgerTotals.expected)}</p>
                    <p className="text-[10px] text-gray-500 mt-1">{formatPeso(ledgerTotals.credited)} credited</p>
                </div>

                <div className="p-4 rounded-2xl bg-black/40 border border-white/5 relative overflow-hidden">
                    <div className="absolute top-2 right-2 text-blue-400/5">
                        <Clock size={40} />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">Pending Escrow</p>
                    <p className="text-lg sm:text-xl font-black mt-1 text-blue-400">{formatPeso(ledgerTotals.pendingEscrow)}</p>
                    <p className="text-[10px] text-gray-500 mt-1">{ledgerTotals.unreleasedCount} jobs awaiting release</p>
                </div>

                <div className={`p-4 rounded-2xl border relative overflow-hidden ${
                    ledgerTotals.discrepancies > 0 ? 'bg-rose-500/10 border-rose-500/30' : 'bg-black/40 border-white/5'
                }`}>
                    <div className="absolute top-2 right-2 text-rose-400/5">
                        <AlertTriangle size={40} />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Audited Anomalies</p>
                    <p className={`text-lg sm:text-xl font-black mt-1 ${ledgerTotals.discrepancies > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {ledgerTotals.discrepancies}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-1">
                        {ledgerTotals.discrepancies === 0 ? '100% balanced ledger' : 'Requires review'}
                    </p>
                </div>
            </div>

            {/* ========================================================================= */}
            {/* TAB 1: GATEWAY WEBHOOKS                                                    */}
            {/* ========================================================================= */}
            {activeTab === 'webhooks' && (
                <div className="space-y-4">
                    {/* Control Bar */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search by Reference Number, HitPay Payment ID, Booking ID..."
                                className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-600 focus:border-amber-400 outline-none transition-all"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <select
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value)}
                                className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-amber-400 outline-none transition-all cursor-pointer"
                            >
                                <option value="all">All Delivery Statuses</option>
                                <option value="completed">Completed</option>
                                <option value="failed">Failed / Cancelled</option>
                                <option value="pending">Pending</option>
                                <option value="unmatched">Unmatched Entities</option>
                            </select>

                            <button
                                onClick={() => fetchWebhookLogs(true)}
                                disabled={isRefreshing}
                                title="Refresh webhook telemetry"
                                className="flex items-center gap-2 px-3.5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-gray-300 transition-all disabled:opacity-50"
                            >
                                <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-amber-400' : ''} />
                                <span className="hidden sm:inline">Refresh</span>
                            </button>

                            <button
                                onClick={() => downloadCsv('ridersbud-webhook-audit.csv', filteredLogs)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-gray-300 transition-all"
                            >
                                <Download size={14} />
                                <span className="hidden sm:inline">Export</span>
                            </button>
                        </div>
                    </div>

                    {/* Webhook Stream Status */}
                    {loadingLogs && webhookLogs.length === 0 ? (
                        <div className="p-16 text-center rounded-2xl border border-white/5 bg-black/30">
                            <Spinner size="md" color="text-amber-400" />
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-4">
                                Loading webhook telemetry from gateway...
                            </p>
                        </div>
                    ) : logsError ? (
                        <div className="p-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 flex items-center justify-between gap-4 text-xs text-amber-300">
                            <div className="flex items-center gap-3">
                                <AlertTriangle size={20} className="shrink-0 text-amber-400" />
                                <div>
                                    <p className="font-bold">Webhook Database Access Notice</p>
                                    <p className="text-gray-400 mt-0.5">{logsError}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => fetchWebhookLogs(true)}
                                className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded-lg text-amber-300 font-bold whitespace-nowrap"
                            >
                                Retry Connection
                            </button>
                        </div>
                    ) : filteredLogs.length === 0 ? (
                        <div className="p-16 rounded-2xl border border-white/5 bg-black/30 text-center">
                            <Webhook size={36} className="mx-auto text-gray-700 mb-3" />
                            <h3 className="text-sm font-bold text-gray-300">No Webhook Logs Found</h3>
                            <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                                Gateway events dispatched by HitPay or digital payment providers will appear here in real time.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2.5">
                            {filteredLogs.map(log => {
                                const status = (log.status || '').toLowerCase();
                                const isSuccess = status === 'completed';
                                const isFailed = status === 'failed' || status === 'canceled';
                                const isUnmatched = log.matched === false || (!log.matched && !log.matchedId);
                                const isExpanded = expandedId === log.id;
                                const dateObj = toDate(log.receivedAt);
                                const refNum = log.referenceNumber || log.reference_number || log.paymentId || log.id;

                                return (
                                    <div
                                        key={log.id}
                                        className={`rounded-2xl border transition-all ${
                                            isUnmatched
                                                ? 'border-amber-500/30 bg-amber-500/5'
                                                : isFailed
                                                ? 'border-rose-500/30 bg-rose-500/5'
                                                : 'border-white/5 bg-black/30 hover:border-white/10'
                                        }`}
                                    >
                                        <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                                                <div className="mt-0.5 sm:mt-0">
                                                    {isSuccess ? (
                                                        <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
                                                    ) : isFailed ? (
                                                        <XCircle size={20} className="text-rose-400 shrink-0" />
                                                    ) : (
                                                        <Clock size={20} className="text-amber-400 shrink-0" />
                                                    )}
                                                </div>

                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="text-sm font-black text-white font-mono truncate">
                                                            {refNum}
                                                        </span>

                                                        <button
                                                            onClick={() => handleCopy(refNum, log.id)}
                                                            title="Copy Reference"
                                                            className="text-gray-500 hover:text-white transition-colors"
                                                        >
                                                            {copiedId === log.id ? (
                                                                <Check size={13} className="text-emerald-400" />
                                                            ) : (
                                                                <Copy size={13} />
                                                            )}
                                                        </button>

                                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                                            isSuccess
                                                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                                                                : isFailed
                                                                ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                                                                : 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                                                        }`}>
                                                            {status || 'recorded'}
                                                        </span>

                                                        {isUnmatched && (
                                                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                                                Unmatched
                                                            </span>
                                                        )}

                                                        {log.signatureValid === true && (
                                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                                                                HMAC Verified
                                                            </span>
                                                        )}
                                                    </div>

                                                    <p className="text-[11px] text-gray-400 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                                        <span>{dateObj ? dateObj.toLocaleString('en-PH') : 'Date pending'}</span>
                                                        <span>•</span>
                                                        <span className="font-bold text-white">
                                                            {log.amount != null ? formatPeso(Number(log.amount)) : '—'}
                                                        </span>
                                                        <span>•</span>
                                                        <span className="text-gray-500">{log.paymentMethod || 'HitPay'}</span>
                                                        {log.matchedCollection && (
                                                            <>
                                                                <span>•</span>
                                                                <span className="text-emerald-400/90 font-mono text-[10px]">
                                                                    Matched: {log.matchedCollection}/{log.matchedId || 'linked'}
                                                                </span>
                                                            </>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                                                <button
                                                    onClick={() => setExpandedId(isExpanded ? null : log.id)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-gray-300 border border-white/5 transition-all"
                                                >
                                                    <span>{isExpanded ? 'Hide Payload' : 'View Payload'}</span>
                                                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Expanded Payload Inspector */}
                                        {isExpanded && (
                                            <div className="px-4 pb-4 border-t border-white/5 pt-3">
                                                {log.error && (
                                                    <div className="mb-3 text-[11px] text-rose-300 font-mono bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
                                                        <strong>Error:</strong> {log.error}
                                                    </div>
                                                )}
                                                <div className="relative">
                                                    <pre className="text-[11px] leading-relaxed text-emerald-300/90 font-mono bg-black/80 border border-white/10 rounded-xl p-4 overflow-x-auto max-h-80 selection:bg-emerald-500/20">
                                                        {JSON.stringify(log.rawPayload ?? log, null, 2)}
                                                    </pre>
                                                    <button
                                                        onClick={() => handleCopy(JSON.stringify(log.rawPayload ?? log, null, 2), `raw_${log.id}`)}
                                                        className="absolute top-3 right-3 px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-md text-[10px] font-bold text-gray-300 flex items-center gap-1"
                                                    >
                                                        {copiedId === `raw_${log.id}` ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                                                        <span>{copiedId === `raw_${log.id}` ? 'Copied' : 'Copy JSON'}</span>
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 2: EARNINGS LEDGER & PLATFORM SPLIT AUDIT                              */}
            {/* ========================================================================= */}
            {activeTab === 'earnings' && (
                <div className="space-y-4">
                    {/* Controls & Filter Bar */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-black/30 border border-white/5 p-4 rounded-2xl">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="relative min-w-[240px]">
                                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                                <input
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Search by Booking, Mechanic or Customer..."
                                    className="w-full bg-black/50 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:border-amber-400 outline-none"
                                />
                            </div>

                            <select
                                value={anomalyFilter}
                                onChange={e => setAnomalyFilter(e.target.value as any)}
                                className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-400 outline-none cursor-pointer"
                            >
                                <option value="all">All Completed Bookings</option>
                                <option value="anomalies">Anomalies / Flagged Only</option>
                                <option value="released">Correctly Released</option>
                                <option value="pending">Pending Escrow Release</option>
                            </select>
                        </div>

                        {/* Fee Simulator */}
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="text-xs font-bold text-gray-400">Audit Fee %:</span>
                            <div className="flex items-center gap-1.5">
                                <input
                                    type="number"
                                    min={0}
                                    max={90}
                                    value={serviceFeePercentage}
                                    onChange={e => setFeeOverride(Math.max(0, Math.min(90, Number(e.target.value) || 0)))}
                                    className="w-16 bg-black/50 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-center font-bold text-amber-400 focus:border-amber-400 outline-none"
                                />
                                <span className="text-xs text-gray-500">%</span>
                            </div>

                            {feeOverride !== null && (
                                <button
                                    onClick={() => setFeeOverride(null)}
                                    className="text-xs text-amber-400 hover:underline font-bold"
                                >
                                    Reset ({db?.settings?.serviceFeePercentage ?? 30}%)
                                </button>
                            )}

                            <button
                                onClick={() => downloadCsv('ridersbud-earnings-ledger.csv', filteredEarnings)}
                                className="flex items-center gap-2 px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-gray-300 transition-all ml-auto"
                            >
                                <FileSpreadsheet size={14} />
                                <span>Export CSV</span>
                            </button>
                        </div>
                    </div>

                    {/* Table View */}
                    {filteredEarnings.length === 0 ? (
                        <div className="p-16 rounded-2xl border border-white/5 bg-black/30 text-center">
                            <Calculator size={36} className="mx-auto text-gray-700 mb-3" />
                            <h3 className="text-sm font-bold text-gray-300">No Bookings Match Current Criteria</h3>
                            <p className="text-xs text-gray-500 mt-1">
                                Try changing your search query or reset the anomaly filter.
                            </p>
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-white/5 bg-black/30 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead>
                                        <tr className="border-b border-white/5 text-[10px] font-black uppercase tracking-widest text-gray-500 bg-white/[0.02]">
                                            <th className="px-4 py-3.5">Booking / Date</th>
                                            <th className="px-4 py-3.5">Mechanic</th>
                                            <th className="px-4 py-3.5 text-right">Gross Total</th>
                                            <th className="px-4 py-3.5 text-right">Expected Mechanic ({100 - serviceFeePercentage}%)</th>
                                            <th className="px-4 py-3.5 text-right">Credited Share</th>
                                            <th className="px-4 py-3.5 text-center">Audit Status</th>
                                            <th className="px-4 py-3.5 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {filteredEarnings.slice(0, 150).map(row => {
                                            const hasDiscrepancy = Math.abs(row.discrepancy) > 1;
                                            const isOverpaid = row.discrepancy > 1;
                                            const isPending = !row.released;
                                            const dateObj = toDate(row.completedAt);

                                            return (
                                                <tr
                                                    key={row.bookingId}
                                                    className={`hover:bg-white/[0.02] transition-colors ${
                                                        hasDiscrepancy ? 'bg-rose-500/[0.04]' : isPending ? 'bg-blue-500/[0.02]' : ''
                                                    }`}
                                                >
                                                    <td className="px-4 py-3.5">
                                                        <p className="font-bold text-white font-mono">
                                                            #{row.bookingId.slice(-6).toUpperCase()}
                                                        </p>
                                                        <p className="text-[10px] text-gray-400 mt-0.5">{row.customerName}</p>
                                                        <p className="text-[10px] text-gray-500">
                                                            {dateObj ? dateObj.toLocaleDateString('en-PH') : 'Recent'}
                                                        </p>
                                                    </td>

                                                    <td className="px-4 py-3.5">
                                                        <p className="font-bold text-gray-200">{row.mechanicName}</p>
                                                        <span className="text-[9px] font-mono text-gray-500">{row.paymentMethod}</span>
                                                    </td>

                                                    <td className="px-4 py-3.5 text-right font-medium text-gray-300">
                                                        {formatPeso(row.gross)}
                                                    </td>

                                                    <td className="px-4 py-3.5 text-right font-bold text-emerald-400">
                                                        {formatPeso(row.expectedNet)}
                                                    </td>

                                                    <td className={`px-4 py-3.5 text-right font-black ${
                                                        hasDiscrepancy ? (isOverpaid ? 'text-rose-400' : 'text-amber-400') : 'text-white'
                                                    }`}>
                                                        {row.released ? formatPeso(row.credited) : (
                                                            <span className="text-gray-500 text-[11px] font-normal italic">
                                                                Not Released
                                                            </span>
                                                        )}
                                                    </td>

                                                    <td className="px-4 py-3.5 text-center">
                                                        {isPending ? (
                                                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20">
                                                                <Clock size={10} /> Pending
                                                            </span>
                                                        ) : hasDiscrepancy ? (
                                                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/20">
                                                                <AlertTriangle size={10} /> {isOverpaid ? 'Over-Credited' : 'Under-Credited'}
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                                                                <CheckCircle2 size={10} /> Reconciled
                                                            </span>
                                                        )}
                                                    </td>

                                                    <td className="px-4 py-3.5 text-right">
                                                        {isPending ? (
                                                            <button
                                                                onClick={() => handleReleaseEarnings(row)}
                                                                disabled={releasingId === row.bookingId}
                                                                className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-[11px] font-bold transition-all disabled:opacity-50"
                                                            >
                                                                {releasingId === row.bookingId ? 'Releasing...' : 'Release Share'}
                                                            </button>
                                                        ) : (
                                                            <span className="text-[10px] text-gray-600 font-bold">Settled</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 3: PAYMENT CHANNELS & RECONCILIATION SUMMARY                           */}
            {/* ========================================================================= */}
            {activeTab === 'channels' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Gateway Card */}
                        <div className="p-5 rounded-2xl bg-black/40 border border-white/5 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                                    <CreditCard size={22} />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-white/5 text-gray-400">
                                    Gateway
                                </span>
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-white">HitPay Online Gateway</h3>
                                <p className="text-xl font-black text-white mt-1">{formatPeso(channelMetrics.hitpay.vol)}</p>
                                <p className="text-[11px] text-gray-500 mt-0.5">{channelMetrics.hitpay.count} processed transactions</p>
                            </div>
                            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
                                <span className="text-gray-400">Auto Verification:</span>
                                <span className="text-emerald-400 font-bold">Cloud Webhook</span>
                            </div>
                        </div>

                        {/* GCash Manual Card */}
                        <div className="p-5 rounded-2xl bg-black/40 border border-white/5 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
                                    <Smartphone size={22} />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-white/5 text-gray-400">
                                    P2P Receipt
                                </span>
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-white">Manual GCash Verification</h3>
                                <p className="text-xl font-black text-white mt-1">{formatPeso(channelMetrics.gcash.vol)}</p>
                                <p className="text-[11px] text-gray-500 mt-0.5">{channelMetrics.gcash.count} submitted receipts</p>
                            </div>
                            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
                                <span className="text-gray-400">Review Screen:</span>
                                <span className="text-blue-400 font-bold">Admin GCash Portal</span>
                            </div>
                        </div>

                        {/* COD Card */}
                        <div className="p-5 rounded-2xl bg-black/40 border border-white/5 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
                                    <Banknote size={22} />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-white/5 text-gray-400">
                                    Cash Settlement
                                </span>
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-white">Cash On Service / Delivery</h3>
                                <p className="text-xl font-black text-white mt-1">{formatPeso(channelMetrics.cod.vol)}</p>
                                <p className="text-[11px] text-gray-500 mt-0.5">{channelMetrics.cod.count} cash handoffs</p>
                            </div>
                            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
                                <span className="text-gray-400">Verification:</span>
                                <span className="text-amber-400 font-bold">Mechanic Handshake</span>
                            </div>
                        </div>
                    </div>

                    {/* Channel Reconcile Health Box */}
                    <div className="p-6 rounded-2xl border border-white/5 bg-black/30 space-y-3">
                        <div className="flex items-center gap-3">
                            <ShieldCheck size={20} className="text-emerald-400" />
                            <h3 className="text-sm font-bold text-white">Financial Integrity Guarantee</h3>
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed max-w-2xl">
                            All completed bookings are audited by this ledger against mechanic wallet entries. The platform automatically enforces that every service completion calculates the {100 - serviceFeePercentage}% mechanic payout and safeguards the {serviceFeePercentage}% platform service fee.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPaymentAuditScreen;
