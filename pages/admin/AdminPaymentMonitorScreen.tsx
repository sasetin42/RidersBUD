import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { collection, doc, getDoc, getDocs, query, where, orderBy, limit as fsLimit, onSnapshot } from 'firebase/firestore';
import { db as firestore, auth } from '../../firebase';
import { getHitPayProxyEndpoint } from '../../services/HitPayService';
import Spinner from '../../components/Spinner';
import {
    categorizeTransaction,
    countByCategory,
    sumAttentionAmount,
    explainVerificationSignal,
    formatRelativeTime,
    toMillis,
    CATEGORY_META,
    PaymentTransactionLike,
    PaymentMonitorCategory
} from '../../utils/paymentMonitor';
import {
    Activity,
    AlertTriangle,
    RefreshCw,
    ChevronDown,
    ChevronUp,
    Search,
    Copy,
    Check,
    Clock,
    ShieldAlert,
    Radio,
    ExternalLink,
    Zap,
    CircleDollarSign,
    History,
    Download,
    Webhook
} from 'lucide-react';

/**
 * Admin Payment Monitor — realtime health board for `paymentTransactions`.
 *
 * Buckets (see utils/paymentMonitor.ts):
 *  - Stuck      — non-terminal and untouched for > 10 minutes
 *  - Mismatched — PENDING_REVIEW / AMOUNT_/CURRENCY_/REFERENCE_MISMATCH
 *  - Retrying   — last verify attempt could not settle (GATEWAY_UNAVAILABLE, …)
 *
 * Every row exposes the full `stateHistory` timeline, the last verification
 * signal with an operator hint, and a one-click "Re-verify with HitPay"
 * action that calls the authoritative backend settlement endpoint.
 */

const formatPeso = (n: number): string =>
    `₱${(Number.isFinite(n) ? n : 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Firestore timestamp / ISO / epoch → ISO string ('' when unknown). */
const iso = (v: any): string => {
    const ms = toMillis(v);
    return ms ? new Date(ms).toISOString() : '';
};

const lastHistoryStatus = (tx: PaymentTransactionLike): string => {
    const h = Array.isArray(tx?.stateHistory) ? tx.stateHistory : [];
    return String(h[h.length - 1]?.status || tx?.status || '');
};

/** CSV writer (RFC-4180 quoting) shared shape with AdminPaymentAuditScreen. */
const downloadCsv = (filename: string, rows: Record<string, any>[]) => {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const escape = (v: any) => {
        const s = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
        return `"${s.replace(/"/g, '""')}"`;
    };
    const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
};

type FilterKey = 'attention' | 'stuck' | 'mismatch' | 'retrying' | 'verifying' | 'paid' | 'all';

const FILTERS: { key: FilterKey; label: string }[] = [
    { key: 'attention', label: 'Needs Attention' },
    { key: 'stuck', label: 'Stuck' },
    { key: 'mismatch', label: 'Mismatched' },
    { key: 'retrying', label: 'Retrying' },
    { key: 'verifying', label: 'Verifying' },
    { key: 'paid', label: 'Paid' },
    { key: 'all', label: 'All' }
];

const MATCHES_FILTER = (cat: PaymentMonitorCategory, filter: FilterKey): boolean => {
    switch (filter) {
        case 'attention': return ['stuck', 'mismatch', 'retrying'].includes(cat);
        case 'all': return true;
        default: return cat === filter;
    }
};

export const AdminPaymentMonitorScreen: React.FC = () => {
    const [txs, setTxs] = useState<PaymentTransactionLike[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [streamError, setStreamError] = useState<string>('');
    const [lastSync, setLastSync] = useState<number>(0);
    const [now, setNow] = useState<number>(Date.now());
    const [filter, setFilter] = useState<FilterKey>('attention');
    const [search, setSearch] = useState('');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [verifyingId, setVerifyingId] = useState<string | null>(null);
    const [verifyResult, setVerifyResult] = useState<Record<string, string>>({});
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Deep link (?tx=<transactionId|reference|paymentRequestId>) — written by the
    // tappable escalation cards in AdminNotificationsScreen and the dashboard card.
    const [searchParams, setSearchParams] = useSearchParams();
    const deepLinkTx = searchParams.get('tx') || '';
    const deepLinkHandledRef = useRef<string>('');

    // Deep link ?filter=<stuck|mismatch|retrying|…> — used by the dashboard's
    // Stuck Transactions card. Applied once on mount; ignored afterwards so
    // manual filter-chip selection always wins.
    const filterParam = searchParams.get('filter') || '';
    const filterHandledRef = useRef(false);
    useEffect(() => {
        if (filterHandledRef.current || !filterParam) return;
        if (FILTERS.some((f) => f.key === filterParam)) {
            filterHandledRef.current = true;
            setFilter(filterParam as FilterKey);
        }
    }, [filterParam]);

    // Per-transaction webhook audit trail (lazily loaded on expand).
    const [audit, setAudit] = useState<Record<string, { log?: any; events?: any[]; loaded: boolean }>>({});

    // Realtime subscription — admins have read access via firestore.rules.
    useEffect(() => {
        const q = query(
            collection(firestore, 'paymentTransactions'),
            orderBy('createdAt', 'desc'),
            fsLimit(300)
        );
        const unsub = onSnapshot(
            q,
            (snap) => {
                setTxs(snap.docs.map((d) => ({ id: d.id, ...d.data() } as PaymentTransactionLike)));
                setLastSync(Date.now());
                setStreamError('');
                setIsLoading(false);
            },
            (err) => {
                console.error('[PaymentMonitor] snapshot error:', err);
                setStreamError(err?.message || 'Failed to stream payment transactions');
                setIsLoading(false);
            }
        );
        return () => { try { unsub(); } catch { /* ignore */ } };
    }, []);

    // Ticker: recomputes relative times + stuck thresholds every 30s.
    useEffect(() => {
        const t = window.setInterval(() => setNow(Date.now()), 30_000);
        return () => window.clearInterval(t);
    }, []);

    // Deep-link jump: auto-expand the requested transaction, widen the filter so it
    // is visible, scroll to it, then clean the URL back to a plain monitor view.
    useEffect(() => {
        if (!deepLinkTx || txs.length === 0) return;
        if (deepLinkHandledRef.current === deepLinkTx) return;
        const needle = deepLinkTx.trim().toLowerCase();
        const match = txs.find((t) =>
            String(t.id).toLowerCase() === needle ||
            String(t.referenceNumber || '').toLowerCase() === needle ||
            String(t.paymentRequestId || '').toLowerCase() === needle
        );
        if (!match) return;
        deepLinkHandledRef.current = deepLinkTx;
        setFilter('all');
        setExpandedId(match.id);
        window.setTimeout(() => {
            document.getElementById(`tx-row-${match.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 150);
        setSearchParams({}, { replace: true });
    }, [deepLinkTx, txs, setSearchParams]);

    // Lazily load the webhook delivery audit trail for the expanded transaction.
    useEffect(() => {
        if (!expandedId) return;
        const tx = txs.find((t) => t.id === expandedId);
        const prid = String(tx?.paymentRequestId || '');
        if (!prid || audit[expandedId]?.loaded) return;
        let cancelled = false;
        (async () => {
            const entry: { log?: any; events?: any[]; loaded: boolean } = { loaded: true };
            try {
                const logSnap = await getDoc(doc(firestore, 'paymentWebhookLogs', prid));
                if (logSnap.exists()) entry.log = { id: logSnap.id, ...logSnap.data() };
            } catch { /* rules / transient */ }
            try {
                const evSnap = await getDocs(query(
                    collection(firestore, 'paymentWebhookEvents'),
                    where('paymentRequestId', '==', prid),
                    fsLimit(10)
                ));
                entry.events = evSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
            } catch { /* rules / transient */ }
            if (!cancelled) setAudit((prev) => ({ ...prev, [expandedId]: entry }));
        })();
        return () => { cancelled = true; };
    }, [expandedId, txs, audit]);

    const counts = useMemo(() => countByCategory(txs, now), [txs, now]);
    const attentionAmount = useMemo(() => sumAttentionAmount(txs, now), [txs, now]);
    const paidLast24h = useMemo(() => {
        const rows = txs.filter((t) => categorizeTransaction(t, now) === 'paid' && toMillis(t?.paidAt || t?.updatedAt) > now - 86_400_000);
        return { count: rows.length, amount: rows.reduce((s, t) => s + (Number(t?.amount) || 0), 0) };
    }, [txs, now]);

    const visible = useMemo(() => {
        let list = txs
            .map((t) => ({ tx: t, cat: categorizeTransaction(t, now) }))
            .filter(({ cat }) => MATCHES_FILTER(cat, filter));

        if (search.trim()) {
            const s = search.trim().toLowerCase();
            list = list.filter(({ tx }) =>
                String(tx?.id || '').toLowerCase().includes(s) ||
                String(tx?.referenceNumber || '').toLowerCase().includes(s) ||
                String(tx?.paymentRequestId || '').toLowerCase().includes(s) ||
                String(tx?.paymentSessionId || '').toLowerCase().includes(s) ||
                String(tx?.entityId || '').toLowerCase().includes(s) ||
                String(tx?.customerEmail || '').toLowerCase().includes(s) ||
                String(tx?.customerName || '').toLowerCase().includes(s)
            );
        }
        // Attention first, then most recently created. The Stuck view sorts
        // oldest-untouched FIRST so the longest-stalled settlements surface
        // at the top of the list.
        const rank = (c: PaymentMonitorCategory) => ({ mismatch: 0, retrying: 1, stuck: 2, verifying: 3 } as any)[c] ?? 9;
        if (filter === 'stuck') {
            return list.sort((a, b) =>
                toMillis(a.tx?.updatedAt || a.tx?.createdAt) - toMillis(b.tx?.updatedAt || b.tx?.createdAt)
            );
        }
        return list.sort((a, b) => rank(a.cat) - rank(b.cat) || toMillis(b.tx?.createdAt) - toMillis(a.tx?.createdAt));
    }, [txs, now, filter, search]);

    /** Finance reconciliation export — current filter + search, one row per transaction. */
    const handleExportCsv = useCallback(() => {
        const rows = visible.map(({ tx, cat }) => ({
            transactionId: tx.id,
            referenceNumber: tx.referenceNumber || '',
            paymentRequestId: tx.paymentRequestId || '',
            paymentSessionId: tx.paymentSessionId || '',
            category: CATEGORY_META[cat].label,
            status: tx.status || '',
            verificationStatus: tx.verificationStatus || '',
            lastVerificationStatus: tx.lastVerificationStatus || '',
            lastVerificationReason: tx.lastVerificationReason || '',
            amount: Number(tx.amount) || 0,
            currency: tx.currency || 'PHP',
            environment: tx.environment || '',
            entityKind: tx.entityKind || '',
            entityId: tx.entityId || '',
            kind: tx.kind || '',
            paymentMethod: tx.paymentMethod || '',
            customerName: tx.customerName || '',
            customerEmail: tx.customerEmail || '',
            createdAt: iso(tx.createdAt),
            updatedAt: iso(tx.updatedAt),
            paidAt: iso(tx.paidAt || tx.verifiedAt),
            lastVerificationAt: iso(tx.lastVerificationAt),
            lastState: lastHistoryStatus(tx),
            stateHistoryCount: Array.isArray(tx.stateHistory) ? tx.stateHistory.length : 0,
            escalatedCount: tx.escalationCount || 0,
            checkoutUrl: tx.checkoutUrl || ''
        }));
        downloadCsv(`ridersbud_payments_${filter}_${new Date().toISOString().slice(0, 10)}.csv`, rows);
    }, [visible, filter]);

    const handleCopy = useCallback((value: string, id: string) => {
        try {
            navigator.clipboard.writeText(value);
            setCopiedId(id);
            window.setTimeout(() => setCopiedId(null), 2000);
        } catch { /* clipboard unavailable */ }
    }, []);

    const handleReverify = useCallback(async (tx: PaymentTransactionLike) => {
        if (verifyingId) return;
        setVerifyingId(tx.id);
        setVerifyResult((prev) => ({ ...prev, [tx.id]: '' }));
        try {
            let token: string | null = null;
            try { token = await auth?.currentUser?.getIdToken() || null; } catch { /* guest */ }
            const headers: Record<string, string> = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const resp = await fetch(
                getHitPayProxyEndpoint(`/api/hitpay-proxy?action=verify&id=${encodeURIComponent(tx.id)}`),
                { headers }
            );
            const data = await resp.json().catch(() => null);
            const status = String(data?.result?.status || data?.status || (resp.ok ? 'UNKNOWN' : `HTTP_${resp.status}`)).toUpperCase();
            const verification = String(data?.result?.verificationStatus || data?.verificationStatus || '').toUpperCase();
            setVerifyResult((prev) => ({
                ...prev,
                [tx.id]: status === 'PAID'
                    ? '✓ Settled as PAID — the realtime board will update momentarily.'
                    : status === 'ALREADY_SETTLED' || data?.result?.alreadySettled
                        ? `Already settled (${status}).`
                        : verification === 'GATEWAY_UNAVAILABLE'
                            ? 'HitPay unreachable from the server — it will keep retrying.'
                            : verification && verification !== 'VERIFIED'
                                ? `Verdict: ${verification}.`
                                : `Result: ${status}. Verification continues automatically.`
            }));
        } catch (e: any) {
            setVerifyResult((prev) => ({ ...prev, [tx.id]: `Re-verify failed: ${e?.message || 'network error'}` }));
        } finally {
            setVerifyingId(null);
        }
    }, [verifyingId]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0F0F10] flex flex-col items-center justify-center text-white">
                <Spinner size="lg" color="text-emerald-400" />
                <p className="mt-4 text-xs font-bold uppercase tracking-widest text-gray-500 animate-pulse">
                    Connecting to Payment Monitor…
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0F0F10] text-white p-4 sm:p-6 space-y-5">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
                        <Activity size={20} className="text-emerald-400" />
                        Payment Monitor
                    </h1>
                    <p className="text-[11px] text-gray-500 mt-1">
                        Realtime `paymentTransactions` health — stuck, mismatched, and retrying settlements
                    </p>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                        <Radio size={11} className="animate-pulse" /> Live
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-gray-400">
                        Synced {lastSync ? formatRelativeTime(lastSync, now) : '—'}
                    </span>
                </div>
            </div>

            {streamError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                    <AlertTriangle size={14} /> Stream error: {streamError}
                </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className={`p-4 rounded-2xl border ${counts.attention > 0 ? 'bg-rose-500/[0.07] border-rose-500/30' : 'bg-[#161618] border-white/5'}`}>
                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-gray-400">
                        <ShieldAlert size={12} className={counts.attention > 0 ? 'text-rose-400' : 'text-gray-500'} /> Needs Attention
                    </div>
                    <p className={`text-3xl font-black mt-2 ${counts.attention > 0 ? 'text-rose-300' : 'text-white'}`}>{counts.attention}</p>
                    <p className="text-[11px] text-gray-500 mt-1">
                        {counts.attention > 0 ? `${formatPeso(attentionAmount)} awaiting settlement` : 'All payments settled'}
                    </p>
                </div>
                <div className="p-4 rounded-2xl bg-[#161618] border border-white/5">
                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-gray-400">
                        <Clock size={12} className="text-orange-400" /> Stuck
                    </div>
                    <p className="text-3xl font-black mt-2 text-orange-300">{counts.stuck}</p>
                    <p className="text-[11px] text-gray-500 mt-1">No movement for 10+ minutes</p>
                </div>
                <div className="p-4 rounded-2xl bg-[#161618] border border-white/5">
                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-gray-400">
                        <AlertTriangle size={12} className="text-amber-400" /> Mismatched
                    </div>
                    <p className="text-3xl font-black mt-2 text-amber-300">{counts.mismatch}</p>
                    <p className="text-[11px] text-gray-500 mt-1">Blocked pending manual review</p>
                </div>
                <div className="p-4 rounded-2xl bg-[#161618] border border-white/5">
                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-gray-400">
                        <CircleDollarSign size={12} className="text-emerald-400" /> Paid (24h)
                    </div>
                    <p className="text-3xl font-black mt-2 text-emerald-300">{paidLast24h.count}</p>
                    <p className="text-[11px] text-gray-500 mt-1">{formatPeso(paidLast24h.amount)} verified</p>
                </div>
            </div>

            {/* Filters + Search */}
            <div className="flex flex-wrap items-center gap-2">
                {FILTERS.map((f) => {
                    const active = filter === f.key;
                    const badge = f.key === 'attention'
                        ? counts.attention
                        : (counts as any)[f.key] ?? 0;
                    return (
                        <button
                            key={f.key}
                            type="button"
                            onClick={() => setFilter(f.key)}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border flex items-center gap-1.5 ${
                                active
                                    ? 'bg-primary border-primary text-white'
                                    : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                            }`}
                        >
                            {f.label}
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${active ? 'bg-black/30 text-white' : 'bg-white/10 text-gray-300'}`}>
                                {badge}
                            </span>
                        </button>
                    );
                })}
                <button
                    type="button"
                    onClick={handleExportCsv}
                    disabled={!visible.length}
                    className="ml-auto sm:ml-0 px-3 py-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all disabled:opacity-40"
                    title="Download the currently visible transactions as CSV for finance reconciliation"
                >
                    <Download size={13} /> Export CSV ({visible.length})
                </button>
                <div className="relative ml-auto w-full sm:w-64">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search ref, tx, request id, customer…"
                        className="w-full pl-8 pr-3 py-2 rounded-lg bg-[#161618] border border-white/10 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-primary/50"
                    />
                </div>
            </div>

            {/* Stuck view intro — what the operator is looking at */}
            {filter === 'stuck' && visible.length > 0 && (
                <div className="p-3 rounded-xl bg-orange-500/[0.06] border border-orange-500/25 text-[11px] text-orange-200/90 flex items-start gap-2">
                    <Clock size={13} className="text-orange-300 shrink-0 mt-0.5" />
                    <p>
                        <span className="font-black">{visible.length}</span> transaction{visible.length === 1 ? '' : 's'} with no movement for 10+ minutes — oldest first. Each row shows the last verification verdict from HitPay (<span className="font-mono">lastVerificationStatus</span>) and the recorded reason; expand a row for the full diagnosis, state history, and one-click re-verify.
                    </p>
                </div>
            )}

            {/* Rows */}
            <div className="space-y-2.5">
                {visible.length === 0 && (
                    <div className="p-10 text-center rounded-2xl bg-[#161618] border border-white/5">
                        <Check size={28} className="mx-auto text-emerald-400" />
                        <p className="text-sm font-bold text-white mt-3">Nothing here</p>
                        <p className="text-xs text-gray-500 mt-1">No transactions match this filter right now.</p>
                    </div>
                )}

                {visible.map(({ tx, cat }) => {
                    const meta = CATEGORY_META[cat];
                    const expanded = expandedId === tx.id;
                    const history = Array.isArray(tx.stateHistory) ? tx.stateHistory : [];
                    const needsAttention = ['stuck', 'mismatch', 'retrying'].includes(cat);

                    return (
                        <div
                            key={tx.id}
                            id={`tx-row-${tx.id}`}
                            className={`rounded-2xl border transition-all ${
                                needsAttention ? 'bg-[#1a1518] border-white/10' : 'bg-[#161618] border-white/5'
                            }`}
                        >
                            {/* Row header */}
                            <button
                                type="button"
                                onClick={() => setExpandedId(expanded ? null : tx.id)}
                                className="w-full text-left p-4 flex flex-wrap items-center gap-3"
                            >
                                <span className={`w-2 h-2 rounded-full shrink-0 ${meta.dot} ${needsAttention ? 'animate-pulse' : ''}`} />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-mono text-xs font-bold text-white break-all">
                                            {tx.referenceNumber || tx.id}
                                        </span>
                                        <span className={`px-1.5 py-0.5 rounded border text-[9px] font-black uppercase ${meta.pill}`}>
                                            {meta.label}
                                        </span>
                                        {String(tx.environment || '') === 'sandbox' && (
                                            <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[9px] font-black uppercase">
                                                Sandbox
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-gray-500 mt-1 truncate">
                                        {tx.entityKind || 'entity'} · {tx.entityId || '—'} · {tx.customerName || tx.customerEmail || 'unknown customer'}
                                    </p>
                                    {/* Stuck-view signal: why this transaction has not settled,
                                        visible WITHOUT expanding (last verification verdict). */}
                                    {needsAttention && (
                                        <p className="text-[10px] mt-1 flex items-start gap-1.5 min-w-0">
                                            <span className={`shrink-0 mt-0.5 px-1.5 py-0.5 rounded border font-black uppercase tracking-wider text-[9px] ${
                                                cat === 'mismatch'
                                                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                                                    : cat === 'retrying'
                                                        ? 'bg-sky-500/15 border-sky-500/40 text-sky-300'
                                                        : 'bg-orange-500/15 border-orange-500/40 text-orange-300'
                                            }`}>
                                                {String(tx.lastVerificationStatus || 'NEVER_VERIFIED')}
                                            </span>
                                            <span className="text-gray-500 min-w-0 truncate" title={String(tx.lastVerificationReason || '')}>
                                                {tx.lastVerificationReason
                                                    ? String(tx.lastVerificationReason)
                                                    : tx.lastVerificationAt
                                                        ? `last checked ${formatRelativeTime(toMillis(tx.lastVerificationAt), now)} via ${String(tx.lastVerificationTrigger || 'verify')}`
                                                        : 'no verification attempt recorded yet — sweep/verify has not reached this transaction'}
                                            </span>
                                        </p>
                                    )}
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="font-black text-sm text-white">{formatPeso(Number(tx.amount) || 0)}</p>
                                    <p className="text-[10px] text-gray-500">{formatRelativeTime(toMillis(tx.updatedAt || tx.createdAt), now)}</p>
                                </div>
                                {expanded ? <ChevronUp size={15} className="text-gray-500" /> : <ChevronDown size={15} className="text-gray-500" />}
                            </button>

                            {/* Expanded detail */}
                            {expanded && (
                                <div className="px-4 pb-4 pt-1 border-t border-white/5 space-y-4">
                                    {/* Diagnostic hint */}
                                    <div className={`p-3 rounded-xl text-xs leading-relaxed border ${
                                        needsAttention
                                            ? 'bg-rose-500/[0.06] border-rose-500/25 text-rose-200'
                                            : 'bg-white/[0.03] border-white/10 text-gray-300'
                                    }`}>
                                        <span className="font-black uppercase tracking-wider text-[10px] block mb-1 text-gray-400">Diagnosis</span>
                                        {explainVerificationSignal(tx)}
                                    </div>

                                    {/* Verification signals */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                                        <div className="p-3 rounded-xl bg-black/30 border border-white/5">
                                            <p className="text-[9px] font-black uppercase tracking-wider text-gray-500 mb-2">Verification Signals</p>
                                            <div className="space-y-1.5 text-gray-300">
                                                <p><span className="text-gray-500">Status:</span> <span className="font-bold">{String(tx.status || '—')}</span></p>
                                                <p><span className="text-gray-500">verificationStatus:</span> <span className="font-bold">{String(tx.verificationStatus || '—')}</span></p>
                                                <p><span className="text-gray-500">lastVerificationStatus:</span> <span className="font-bold">{String(tx.lastVerificationStatus || '—')}</span></p>
                                                <p className="break-all"><span className="text-gray-500">lastVerificationReason:</span> {String(tx.lastVerificationReason || '—')}</p>
                                                <p><span className="text-gray-500">last attempt:</span> {tx.lastVerificationAt ? formatRelativeTime(toMillis(tx.lastVerificationAt), now) : '—'} ({String(tx.lastVerificationTrigger || '—')})</p>
                                                {(tx.escalationCount || 0) > 0 && (
                                                    <p className="text-amber-300">
                                                        <span className="text-gray-500">escalations:</span> <span className="font-bold">×{String(tx.escalationCount)}</span>
                                                        {tx.escalatedAt ? ` · last ${formatRelativeTime(toMillis(tx.escalatedAt), now)}` : ''}
                                                        {tx.escalationReason ? ` · ${String(tx.escalationReason)}` : ''}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="p-3 rounded-xl bg-black/30 border border-white/5">
                                            <p className="text-[9px] font-black uppercase tracking-wider text-gray-500 mb-2">Identifiers</p>
                                            <div className="space-y-1.5 text-gray-300">
                                                <p className="break-all"><span className="text-gray-500">tx:</span> <span className="font-mono">{tx.id}</span></p>
                                                <p className="break-all"><span className="text-gray-500">paymentRequestId:</span> <span className="font-mono">{String(tx.paymentRequestId || '—')}</span></p>
                                                <p className="break-all"><span className="text-gray-500">session:</span> <span className="font-mono">{String(tx.paymentSessionId || '—')}</span></p>
                                                <p><span className="text-gray-500">created:</span> {toMillis(tx.createdAt) ? new Date(toMillis(tx.createdAt)).toLocaleString() : '—'}</p>
                                                {tx.checkoutUrl && (
                                                    <a
                                                        href={String(tx.checkoutUrl)}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-1 text-sky-300 hover:text-sky-200 font-bold"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        Open gateway checkout <ExternalLink size={11} />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* stateHistory timeline */}
                                    <div className="p-3 rounded-xl bg-black/30 border border-white/5">
                                        <p className="text-[9px] font-black uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
                                            <History size={11} /> stateHistory timeline
                                        </p>
                                        {history.length === 0 ? (
                                            <p className="text-[11px] text-gray-500">No state history recorded.</p>
                                        ) : (
                                            <div className="space-y-0">
                                                {history.map((h, i) => {
                                                    const ts = h?.timestamp ? new Date(h.timestamp).getTime() : 0;
                                                    const isLast = i === history.length - 1;
                                                    return (
                                                        <div key={i} className="flex gap-3">
                                                            <div className="flex flex-col items-center">
                                                                <span className={`w-2.5 h-2.5 rounded-full border ${isLast ? 'bg-primary border-primary' : 'bg-white/20 border-white/20'}`} />
                                                                {!isLast && <span className="w-px flex-1 bg-white/10 min-h-[18px]" />}
                                                            </div>
                                                            <div className="pb-3">
                                                                <p className="text-[11px] font-bold text-white">
                                                                    {String(h?.status || 'UNKNOWN')}
                                                                    {isLast && <span className="ml-2 text-[9px] font-black uppercase text-primary">current</span>}
                                                                </p>
                                                                <p className="text-[10px] text-gray-500">
                                                                    {ts ? new Date(ts).toLocaleString() : 'time not recorded'}
                                                                    {h?.reason ? ` · ${String(h.reason)}` : ''}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* Webhook delivery audit trail (finance reconciliation) */}
                                    <div className="p-3 rounded-xl bg-black/30 border border-white/5">
                                        <p className="text-[9px] font-black uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
                                            <Webhook size={11} /> Webhook delivery audit trail
                                        </p>
                                        {!tx.paymentRequestId ? (
                                            <p className="text-[11px] text-gray-500">No gateway payment request id — no webhook deliveries to audit.</p>
                                        ) : !audit[tx.id]?.loaded ? (
                                            <div className="flex items-center gap-2 text-[11px] text-gray-500">
                                                <RefreshCw size={11} className="animate-spin" /> Loading webhook deliveries…
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {audit[tx.id]?.log ? (
                                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-300">
                                                        <span><span className="text-gray-500">Deliveries logged:</span> <span className="font-bold">{String((audit[tx.id].log as any).attempts || 1)}</span></span>
                                                        <span><span className="text-gray-500">Last received:</span> {(audit[tx.id].log as any).lastReceivedAt ? formatRelativeTime(toMillis((audit[tx.id].log as any).lastReceivedAt), now) : formatRelativeTime(toMillis((audit[tx.id].log as any).receivedAt), now)}</span>
                                                        <span><span className="text-gray-500">Settlement:</span> <span className="font-bold">{String((audit[tx.id].log as any).settlementStatus || '—')}</span></span>
                                                        <span>
                                                            <span className="text-gray-500">Signature:</span>{' '}
                                                            {(audit[tx.id].log as any).signatureValid === false
                                                                ? <span className="text-red-300 font-bold">INVALID</span>
                                                                : <span className="text-emerald-300 font-bold">VALID</span>}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <p className="text-[11px] text-gray-500">No webhook log found for this payment request (webhook may never have arrived — verification relied on polling).</p>
                                                )}
                                                {audit[tx.id]?.events && (audit[tx.id].events as any[]).length > 0 && (
                                                    <div className="space-y-1">
                                                        <p className="text-[9px] font-black uppercase tracking-wider text-gray-600">Deduplicated events</p>
                                                        {(audit[tx.id].events as any[]).map((ev) => (
                                                            <div key={ev.id} className="flex flex-wrap items-center gap-2 text-[10px] text-gray-400 bg-white/[0.02] border border-white/5 rounded-lg px-2.5 py-1.5">
                                                                <span className={`w-1.5 h-1.5 rounded-full ${ev.processed === true ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                                                                <span>{ev.receivedAt ? formatRelativeTime(toMillis(ev.receivedAt), now) : 'unknown time'}</span>
                                                                <span className={ev.processed === true ? 'text-emerald-300' : 'text-amber-300'}>
                                                                    {ev.processed === true ? 'processed' : (ev.willRetry === true ? 'awaiting HitPay redelivery' : 'unprocessed')}
                                                                </span>
                                                                {ev.settlementStatus && <span>· settled as <span className="text-gray-200 font-bold">{String(ev.settlementStatus)}</span></span>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-wrap items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); handleReverify(tx); }}
                                            disabled={verifyingId === tx.id}
                                            className="px-3.5 py-2 rounded-lg bg-primary hover:bg-orange-600 disabled:opacity-50 text-white text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all"
                                        >
                                            {verifyingId === tx.id
                                                ? <><RefreshCw size={12} className="animate-spin" /> Verifying…</>
                                                : <><Zap size={12} /> Re-verify with HitPay</>}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const { id, ...rest } = tx;
                                                handleCopy(JSON.stringify({ id, ...rest }, null, 2), `json-${tx.id}`);
                                            }}
                                            className="px-3.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-[11px] font-bold flex items-center gap-1.5 transition-all"
                                        >
                                            {copiedId === `json-${tx.id}` ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                                            {copiedId === `json-${tx.id}` ? 'Copied' : 'Copy JSON'}
                                        </button>
                                        {verifyResult[tx.id] && (
                                            <span className="text-[11px] text-gray-300 flex items-center gap-1.5">
                                                <RefreshCw size={11} className="text-emerald-400" /> {verifyResult[tx.id]}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <p className="text-[10px] text-gray-600 text-center pb-4">
                Showing the latest {txs.length} transactions (realtime). Categorization refreshes every 30 seconds.
            </p>
        </div>
    );
};

export default AdminPaymentMonitorScreen;
