import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Clock, ShieldCheck, Lock, Loader2, AlertTriangle, ArrowLeft, Receipt } from 'lucide-react';
import {
    PaymentVerificationState,
    PaymentReturnInfo,
    verifyPaymentTransaction,
    watchTransactionReturnVerification
} from '../utils/paymentReturn';
import { clearPendingPaymentMarker, getPendingPaymentMarker } from '../utils/paymentRedirect';
import Spinner from '../components/Spinner';

/**
 * PaymentStatusScreen — the single, centralized payment return surface.
 *
 * Reached via:
 *   - ridersbud://payment/return?...            (native URL scheme)
 *   - https://ridersbud-10806.web.app/payment/return?...  (App Link fallback)
 *
 * SECURITY: this screen NEVER trusts gateway `status` parameters. It asks the
 * backend to re-verify with HitPay and renders only what the server-settled
 * `paymentTransactions/{id}` document says. No client-side Firestore writes.
 */

type UiPhase = 'initializing' | 'connecting' | 'waiting' | 'verifying' | 'success' | 'failed' | 'cancelled' | 'expired' | 'pending';

interface ReceiptInfo {
    reference?: string;
    amount?: number;
    currency?: string;
    paymentMethod?: string;
    paidAt?: string;
}

const stateToPhase = (state: PaymentVerificationState): UiPhase => {
    switch (state) {
        case 'INITIALIZING': return 'initializing';
        case 'CONNECTING': return 'connecting';
        case 'WAITING': return 'waiting';
        case 'VERIFYING': return 'verifying';
        case 'PAID': return 'success';
        case 'FAILED': return 'failed';
        case 'CANCELLED': return 'cancelled';
        case 'EXPIRED': return 'expired';
        case 'PENDING':
        default: return 'pending';
    }
};

const formatPeso = (amount?: number): string => {
    if (amount === undefined || amount === null || isNaN(Number(amount))) return '—';
    return `₱${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (iso?: string): string => {
    if (!iso) return new Date().toLocaleString();
    const d = new Date(iso);
    return isNaN(d.getTime()) ? new Date().toLocaleString() : d.toLocaleString();
};

const methodLabel = (method?: string): string => {
    const m = String(method || '').toLowerCase();
    if (!m) return 'HitPay Online';
    if (m.includes('gcash')) return 'GCash';
    if (m.includes('qrph')) return 'QR Ph';
    if (m.includes('maya') || m.includes('paymaya') || m.includes('upay')) return 'Maya';
    if (m.includes('card')) return 'Credit / Debit Card';
    return method as string;
};

const PaymentStatusScreen: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [phase, setPhase] = useState<UiPhase>('initializing');
    const [message, setMessage] = useState('Initializing Payment…');
    const [receipt, setReceipt] = useState<ReceiptInfo>({});
    const [entityKind, setEntityKind] = useState<string>('');
    const [entityId, setEntityId] = useState<string>('');
    const [isSandbox, setIsSandbox] = useState(false);
    const stopRef = useRef<(() => void) | null>(null);
    const startedRef = useRef(false);

    // Resolve identity: URL params first, then the local pending marker.
    const urlInfo: PaymentReturnInfo = {
        transactionId: searchParams.get('tx') || undefined,
        referenceNumber: searchParams.get('ref') || undefined,
        paymentRequestId: searchParams.get('prid') || undefined
    };

    useEffect(() => {
        if (startedRef.current) return;
        startedRef.current = true;

        const marker = getPendingPaymentMarker();
        // The native-scheme handoff arrives as a full URL — re-parse it if present.

        const transactionId = urlInfo.transactionId || marker?.transactionId || '';
        const referenceNumber = urlInfo.referenceNumber || marker?.referenceNumber || '';
        const paymentRequestId = urlInfo.paymentRequestId || marker?.paymentRequestId || '';
        const sandbox = searchParams.get('sb') === '1' || marker?.environment === 'sandbox';

        setIsSandbox(sandbox);
        if (marker) {
            setEntityKind(marker.entityKind || '');
            setEntityId(marker.entityId || '');
        }

        if (!transactionId && !referenceNumber && !paymentRequestId) {
            setPhase('failed');
            setMessage('We could not find a payment session to verify. If you completed a payment, it will be reflected in your booking shortly.');
            return;
        }

        setPhase('verifying');
        setMessage('Verifying your payment with HitPay…');

        // Immediate server-side re-verification (safe before/after the webhook)
        verifyPaymentTransaction({ transactionId, paymentRequestId, reference: referenceNumber, isSandbox: sandbox })
            .catch(() => { /* watcher keeps retrying */ });

        // Authoritative watcher: Firestore transaction doc + backoff verify calls
        stopRef.current = watchTransactionReturnVerification({
            transactionId,
            paymentRequestId,
            referenceNumber,
            isSandbox: sandbox,
            timeoutMs: 3 * 60 * 1000,
            onState: (state, msg, tx) => {
                setPhase(stateToPhase(state));
                setMessage(msg);
                if (tx) {
                    setReceipt({
                        reference: tx.referenceNumber || referenceNumber,
                        amount: Number(tx.amount) || undefined,
                        currency: tx.currency || 'PHP',
                        paymentMethod: methodLabel(tx.paymentMethod),
                        paidAt: tx.paidAt || tx.verifiedAt || undefined
                    });
                    if (tx.entityKind) setEntityKind(tx.entityKind);
                    if (tx.entityId) setEntityId(tx.entityId);
                    if (tx.environment === 'sandbox') setIsSandbox(true);
                }
            },
            onVerified: (tx) => {
                // Terminal success — clear the local pending marker so no stale
                // marker can hijack a later payment session.
                clearPendingPaymentMarker();
                if (tx) {
                    setReceipt(prev => ({
                        reference: tx.referenceNumber || prev.reference,
                        amount: Number(tx.amount) || prev.amount,
                        currency: tx.currency || prev.currency,
                        paymentMethod: methodLabel(tx.paymentMethod),
                        paidAt: tx.paidAt || tx.verifiedAt || prev.paidAt
                    }));
                }
            }
        });

        return () => {
            stopRef.current?.();
            stopRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Clear the marker on any terminal state (success or not)
    useEffect(() => {
        if (phase === 'failed' || phase === 'cancelled' || phase === 'expired') {
            clearPendingPaymentMarker();
        }
    }, [phase]);

    const goDone = () => {
        clearPendingPaymentMarker();
        navigate('/customer-portal/', { replace: true });
    };

    const goViewPrimary = () => {
        clearPendingPaymentMarker();
        if (entityKind === 'order') {
            navigate('/customer-portal/order-history', { replace: true });
        } else if (entityKind === 'booking' && entityId) {
            navigate(`/customer-portal/booking-detail/${entityId}`, { replace: true });
        } else {
            navigate('/customer-portal/booking-history', { replace: true });
        }
    };

    const phaseContent = (): { icon: React.ReactNode; title: string; cardClass: string } => {
        switch (phase) {
            case 'initializing':
                return {
                    icon: <Loader2 size={34} className="text-primary animate-spin" />,
                    title: 'Initializing Payment',
                    cardClass: 'border-primary/30 bg-primary/5'
                };
            case 'connecting':
                return {
                    icon: <Loader2 size={34} className="text-primary animate-spin" />,
                    title: 'Connecting to HitPay',
                    cardClass: 'border-primary/30 bg-primary/5'
                };
            case 'waiting':
                return {
                    icon: <Clock size={34} className="text-amber-400" />,
                    title: 'Waiting for Payment',
                    cardClass: 'border-amber-400/30 bg-amber-500/5'
                };
            case 'verifying':
                return {
                    icon: <Loader2 size={34} className="text-sky-400 animate-spin" />,
                    title: 'Verifying Payment',
                    cardClass: 'border-sky-400/30 bg-sky-500/5'
                };
            case 'success':
                return {
                    icon: <CheckCircle2 size={34} className="text-emerald-400" />,
                    title: '✓ Payment Successful',
                    cardClass: 'border-emerald-400/30 bg-emerald-500/5'
                };
            case 'failed':
                return {
                    icon: <XCircle size={34} className="text-red-400" />,
                    title: 'Payment Failed',
                    cardClass: 'border-red-400/30 bg-red-500/5'
                };
            case 'cancelled':
                return {
                    icon: <ShieldCheck size={32} className="text-amber-400" />,
                    title: 'Payment Cancelled',
                    cardClass: 'border-amber-400/30 bg-amber-500/5'
                };
            case 'expired':
                return {
                    icon: <AlertTriangle size={32} className="text-orange-400" />,
                    title: 'Payment Expired',
                    cardClass: 'border-orange-400/30 bg-orange-500/5'
                };
            case 'pending':
            default:
                return {
                    icon: <Clock size={34} className="text-amber-400" />,
                    title: 'Payment Verification Pending',
                    cardClass: 'border-amber-400/30 bg-amber-500/5'
                };
        }
    };

    const { icon, title, cardClass } = phaseContent();
    const isSuccess = phase === 'success';
    const isTerminal = isSuccess || phase === 'failed' || phase === 'cancelled' || phase === 'expired';

    return (
        <div className="min-h-screen bg-secondary text-white font-sans flex flex-col">
            {/* Header — SECURE HITPAY PAYMENT */}
            <div className="sticky top-0 z-10 bg-dark-gray border-b border-white/10">
                <div className="max-w-md mx-auto flex items-center gap-3 px-4 py-4">
                    <button
                        type="button"
                        onClick={goDone}
                        className="p-1.5 -ml-1 rounded-lg hover:bg-white/10 transition-colors"
                        aria-label="Back"
                    >
                        <ArrowLeft size={20} className="text-white" />
                    </button>
                    <div className="flex items-center gap-2">
                        <Lock size={14} className="text-emerald-400" />
                        <span className="text-xs font-black uppercase tracking-widest text-white">
                            Secure HitPay Payment
                        </span>
                    </div>
                    {isSandbox && (
                        <span className="ml-auto text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md bg-amber-500/15 border border-amber-400/40 text-amber-300">
                            🧪 Sandbox
                        </span>
                    )}
                </div>
            </div>

            {/* Body */}
            <div className="flex-grow flex items-start justify-center p-5">
                <div className={`w-full max-w-sm bg-[#161822] border rounded-2xl p-6 space-y-5 shadow-2xl text-center ${cardClass}`}>
                    <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center border border-white/10 bg-black/30">
                        {icon}
                    </div>

                    <div>
                        <h2 className="text-lg font-black text-white tracking-tight">{title}</h2>
                        <p className="text-xs text-gray-400 mt-2 leading-relaxed">{message}</p>
                    </div>

                    {/* Verified receipt — server-derived only */}
                    {isSuccess && (
                        <div className="p-4 bg-black/30 border border-white/10 rounded-xl text-left space-y-2.5 text-xs">
                            <div className="flex items-center gap-1.5 text-emerald-400 font-black uppercase tracking-wider text-[10px] mb-1">
                                <Receipt size={12} /> Verified Transaction
                            </div>
                            <div className="flex justify-between items-center gap-3">
                                <span className="text-gray-400">Reference:</span>
                                <span className="font-mono text-white font-bold break-all text-right">
                                    {receipt.reference || '—'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">Amount:</span>
                                <span className="font-black text-emerald-400 text-sm">{formatPeso(receipt.amount)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">Payment Method:</span>
                                <span className="text-white font-semibold">{receipt.paymentMethod || 'HitPay Online'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">Date:</span>
                                <span className="text-white">{formatDate(receipt.paidAt)}</span>
                            </div>
                        </div>
                    )}

                    {(phase === 'failed' || phase === 'cancelled' || phase === 'expired') && receipt.amount !== undefined && (
                        <p className="text-[11px] text-gray-500">
                            Amount: <span className="font-bold text-primary">{formatPeso(receipt.amount)}</span>
                        </p>
                    )}

                    {/* Actions */}
                    <div className="space-y-2.5">
                        {isSuccess && (
                            <button
                                type="button"
                                onClick={goViewPrimary}
                                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-black text-sm uppercase tracking-wider transition-all hover:from-emerald-600 hover:to-emerald-700 shadow-lg shadow-emerald-500/20"
                            >
                                {entityKind === 'order' ? 'View Order' : 'View Booking'}
                            </button>
                        )}

                        {phase === 'failed' && (
                            <button
                                type="button"
                                onClick={() => { clearPendingPaymentMarker(); navigate(-1); }}
                                className="w-full py-3.5 rounded-xl bg-primary text-white font-black text-sm uppercase tracking-wider transition-all hover:bg-orange-600"
                            >
                                Try Again
                            </button>
                        )}

                        {isTerminal && (
                            <button
                                type="button"
                                onClick={goDone}
                                className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm transition-all"
                            >
                                Done
                            </button>
                        )}

                        {!isTerminal && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-center gap-2 text-[10px] text-gray-500">
                                    <Spinner size="sm" />
                                    <span>Verification continues automatically — keep this screen open or come back later.</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={goDone}
                                    className="w-full py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold transition-all"
                                >
                                    Close
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentStatusScreen;
