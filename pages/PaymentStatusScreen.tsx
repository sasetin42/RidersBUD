import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Clock, ShieldCheck, Lock, Loader2, AlertTriangle, ArrowLeft, Receipt, FlaskConical } from 'lucide-react';
import {
    PaymentVerificationState,
    PaymentReturnInfo,
    verifyPaymentTransaction,
    watchTransactionReturnVerification,
    simulateSandboxPayment
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
    const [isSimulating, setIsSimulating] = useState(false);
    const stopRef = useRef<(() => void) | null>(null);
    const startedRef = useRef(false);

    // Resolve identity: URL params first, then the local pending marker.
    const urlInfo: PaymentReturnInfo = {
        transactionId: searchParams.get('tx') || searchParams.get('transaction') || undefined,
        referenceNumber: searchParams.get('ref') || searchParams.get('reference_number') || undefined,
        paymentRequestId: searchParams.get('prid') || searchParams.get('payment_request_id') || searchParams.get('reference') || undefined,
        paymentSessionId: searchParams.get('s') || searchParams.get('session') || searchParams.get('paymentSessionId') || undefined
    };

    useEffect(() => {
        if (startedRef.current) return;
        startedRef.current = true;

        const marker = getPendingPaymentMarker();
        // The native-scheme handoff arrives as a full URL — re-parse it if present.

        const transactionId = urlInfo.transactionId || marker?.transactionId || '';
        const referenceNumber = urlInfo.referenceNumber || marker?.referenceNumber || '';
        const paymentRequestId = urlInfo.paymentRequestId || marker?.paymentRequestId || '';
        const paymentSessionId = urlInfo.paymentSessionId || '';
        const sandbox = searchParams.get('sb') === '1' || marker?.environment === 'sandbox';

        setIsSandbox(sandbox);
        if (marker) {
            setEntityKind(marker.entityKind || '');
            setEntityId(marker.entityId || '');
        }

        if (!transactionId && !referenceNumber && !paymentRequestId && !paymentSessionId) {
            setPhase('failed');
            setMessage('We could not find a payment session to verify. If you completed a payment, it will be reflected in your booking shortly.');
            return;
        }

        setPhase('verifying');
        setMessage('Verifying your payment with HitPay…');

        // Immediate server-side re-verification (safe before/after the webhook)
        verifyPaymentTransaction({ transactionId, paymentRequestId, reference: referenceNumber, paymentSessionId, isSandbox: sandbox })
            .catch(() => { /* watcher keeps retrying */ });

        // Authoritative watcher: Firestore transaction doc + backoff verify calls
        stopRef.current = watchTransactionReturnVerification({
            transactionId,
            paymentRequestId,
            referenceNumber,
            paymentSessionId,
            isSandbox: sandbox,
            // Honest progression: VERIFYING → PENDING after 90s (was 3 min —
            // customers perceived it as "stuck forever on Verifying").
            timeoutMs: 90 * 1000,
            onState: (state, msg, tx) => {
                const nextPhase = stateToPhase(state);
                setPhase(prev => (prev === nextPhase ? prev : nextPhase));
                setMessage(prev => (prev === msg ? prev : msg));
                if (tx) {
                    setReceipt(prev => {
                        const newRef = tx.referenceNumber || referenceNumber || prev.reference;
                        const newAmt = Number(tx.amount) || prev.amount;
                        const newCurr = tx.currency || prev.currency || 'PHP';
                        const newMethod = methodLabel(tx.paymentMethod) || prev.paymentMethod;
                        const newPaidAt = tx.paidAt || tx.verifiedAt || prev.paidAt;
                        if (
                            prev.reference === newRef &&
                            prev.amount === newAmt &&
                            prev.currency === newCurr &&
                            prev.paymentMethod === newMethod &&
                            prev.paidAt === newPaidAt
                        ) {
                            return prev;
                        }
                        return {
                            reference: newRef,
                            amount: newAmt,
                            currency: newCurr,
                            paymentMethod: newMethod,
                            paidAt: newPaidAt
                        };
                    });
                    if (tx.entityKind) setEntityKind(prev => (prev === tx.entityKind ? prev : tx.entityKind));
                    if (tx.entityId) setEntityId(prev => (prev === tx.entityId ? prev : tx.entityId));
                    if (tx.environment === 'sandbox') setIsSandbox(true);
                }
            },
            onVerified: (tx) => {
                // Terminal success — clear the local pending marker so no stale
                // marker can hijack a later payment session.
                clearPendingPaymentMarker();
                if (tx) {
                    setReceipt(prev => {
                        const newRef = tx.referenceNumber || prev.reference;
                        const newAmt = Number(tx.amount) || prev.amount;
                        const newCurr = tx.currency || prev.currency;
                        const newMethod = methodLabel(tx.paymentMethod) || prev.paymentMethod;
                        const newPaidAt = tx.paidAt || tx.verifiedAt || prev.paidAt;
                        if (
                            prev.reference === newRef &&
                            prev.amount === newAmt &&
                            prev.currency === newCurr &&
                            prev.paymentMethod === newMethod &&
                            prev.paidAt === newPaidAt
                        ) {
                            return prev;
                        }
                        return {
                            reference: newRef,
                            amount: newAmt,
                            currency: newCurr,
                            paymentMethod: newMethod,
                            paidAt: newPaidAt
                        };
                    });
                }
            }
        });

        return () => {
            stopRef.current?.();
            stopRef.current = null;
            // React StrictMode mounts → cleans up → mounts again in development.
            // The old guard kept `startedRef.current = true` across the remount,
            // so the SECOND mount never started a watcher at all (no verification,
            // no timeout, screen frozen on "Verifying Payment"). Resetting here
            // makes the effect restart-safe in every environment.
            startedRef.current = false;
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
                            <div className="space-y-3">
                                {isSandbox && (phase === 'verifying' || phase === 'pending') && (
                                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-400/30 text-left space-y-2">
                                        <div className="flex items-center gap-1.5 text-amber-300 text-xs font-bold">
                                            <FlaskConical size={14} />
                                            <span>HitPay Sandbox Testing Helper</span>
                                        </div>
                                        <p className="text-[11px] text-gray-400 leading-snug">
                                            Testing in Sandbox mode? In Sandbox, HitPay requires manual webhook triggering or checkout simulation. Click below to instantly simulate a successful settlement.
                                        </p>
                                        <button
                                            type="button"
                                            disabled={isSimulating}
                                            onClick={async () => {
                                                const marker = getPendingPaymentMarker();
                                                const txId = urlInfo.transactionId || marker?.transactionId || '';
                                                const ref = urlInfo.referenceNumber || marker?.referenceNumber || '';
                                                const prId = urlInfo.paymentRequestId || marker?.paymentRequestId || '';
                                                const sId = urlInfo.paymentSessionId || '';

                                                setIsSimulating(true);
                                                setMessage('🧪 Simulating HitPay sandbox payment completion…');

                                                try {
                                                    const simRes = await simulateSandboxPayment({
                                                        transactionId: txId,
                                                        paymentRequestId: prId,
                                                        reference: ref,
                                                        paymentSessionId: sId
                                                    });

                                                    if (simRes && (simRes.ok || simRes.status === 'PAID' || simRes.result?.status === 'PAID')) {
                                                        const tx = simRes.transaction || simRes.result?.transaction;
                                                        if (tx) {
                                                            setReceipt(prev => ({
                                                                reference: tx.referenceNumber || prev.reference,
                                                                amount: Number(tx.amount) || prev.amount,
                                                                currency: tx.currency || prev.currency,
                                                                paymentMethod: methodLabel(tx.paymentMethod) || prev.paymentMethod,
                                                                paidAt: tx.paidAt || tx.verifiedAt || prev.paidAt
                                                            }));
                                                        }
                                                        setPhase('success');
                                                        setMessage('✓ Sandbox test payment simulated and verified successfully.');
                                                        clearPendingPaymentMarker();
                                                    } else {
                                                        // Re-verify immediately to fetch latest state
                                                        const verifyRes = await verifyPaymentTransaction({
                                                            transactionId: txId,
                                                            paymentRequestId: prId,
                                                            reference: ref,
                                                            paymentSessionId: sId,
                                                            isSandbox: true
                                                        });
                                                        if (verifyRes?.result?.status === 'PAID') {
                                                            setPhase('success');
                                                            setMessage('✓ Payment successfully settled in sandbox.');
                                                            clearPendingPaymentMarker();
                                                        } else {
                                                            setMessage(simRes?.message || 'Sandbox simulation dispatched. Checking confirmation…');
                                                        }
                                                    }
                                                } catch (err: any) {
                                                    setMessage(`Simulation request error: ${err?.message || 'Failed to simulate'}`);
                                                } finally {
                                                    setIsSimulating(false);
                                                }
                                            }}
                                            className="w-full py-2.5 px-3 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-black text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
                                        >
                                            {isSimulating ? (
                                                <>
                                                    <Spinner size="sm" color="text-black" />
                                                    <span>Simulating Settlement…</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span>🧪 Simulate Sandbox Payment</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}

                                <div className="flex items-center justify-center gap-2 text-[10px] text-gray-500">
                                    <Spinner size="sm" />
                                    <span>Verification continues automatically — keep this screen open or come back later.</span>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            const marker = getPendingPaymentMarker();
                                            const txId = urlInfo.transactionId || marker?.transactionId || '';
                                            const ref = urlInfo.referenceNumber || marker?.referenceNumber || '';
                                            const prId = urlInfo.paymentRequestId || marker?.paymentRequestId || '';
                                            const sId = urlInfo.paymentSessionId || '';
                                            setMessage('Checking with HitPay now…');
                                            try {
                                                const res = await verifyPaymentTransaction({
                                                    transactionId: txId,
                                                    paymentRequestId: prId,
                                                    reference: ref,
                                                    paymentSessionId: sId,
                                                    isSandbox
                                                });
                                                if (res?.result?.status === 'PAID') {
                                                    const tx = res.transaction;
                                                    if (tx) {
                                                        setReceipt(prev => ({
                                                            reference: tx.referenceNumber || prev.reference,
                                                            amount: Number(tx.amount) || prev.amount,
                                                            currency: tx.currency || prev.currency,
                                                            paymentMethod: methodLabel(tx.paymentMethod) || prev.paymentMethod,
                                                            paidAt: tx.paidAt || tx.verifiedAt || prev.paidAt
                                                        }));
                                                    }
                                                    setPhase('success');
                                                    setMessage('Your payment has been verified by HitPay.');
                                                    clearPendingPaymentMarker();
                                                } else if (res?.result?.status === 'FAILED') {
                                                    setPhase('failed');
                                                    setMessage('HitPay reported that the payment failed.');
                                                } else if (res?.result?.status === 'CANCELLED') {
                                                    setPhase('cancelled');
                                                    setMessage('The payment was cancelled.');
                                                } else if (res?.result?.status === 'EXPIRED') {
                                                    setPhase('expired');
                                                    setMessage('This payment request has expired.');
                                                } else if (
                                                    res?.result?.status === 'PENDING_REVIEW' ||
                                                    res?.result?.verificationStatus === 'AMOUNT_MISMATCH' ||
                                                    res?.result?.verificationStatus === 'CURRENCY_MISMATCH' ||
                                                    res?.result?.verificationStatus === 'REFERENCE_MISMATCH'
                                                ) {
                                                    setPhase('pending');
                                                    setMessage('We received your payment but it needs manual review. Our team will update you shortly.');
                                                } else if (res?.result?.status === 'NOT_FOUND') {
                                                    setPhase('pending');
                                                    setMessage('We could not find this payment session on the server yet. Keep this screen open — verification continues automatically.');
                                                } else {
                                                    setMessage('Payment status is still pending with HitPay. We are actively checking.');
                                                }
                                            } catch {
                                                setMessage('Could not connect to payment server. Please check your network.');
                                            }
                                        }}
                                        className="flex-1 py-2.5 rounded-lg bg-primary/20 border border-primary/40 text-primary text-xs font-bold transition-all hover:bg-primary/30"
                                    >
                                        Check Status Now
                                    </button>
                                    <button
                                        type="button"
                                        onClick={goDone}
                                        className="py-2.5 px-4 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold transition-all"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentStatusScreen;
