import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, XCircle, Clock, ShieldCheck, Lock, AlertTriangle, RefreshCw } from 'lucide-react';
import Spinner from './Spinner';
import { PaymentEntityKind } from '../utils/firestoreCollections';
import {
    PaymentVerificationState,
    watchPaymentReturnVerification,
    watchTransactionReturnVerification,
    verifyPaymentTransaction
} from '../utils/paymentReturn';
import { getPendingPaymentMarker } from '../utils/paymentRedirect';

interface PaymentVerificationOverlayProps {
    isOpen: boolean;
    entityKind: PaymentEntityKind;
    entityId: string;
    paymentRequestId?: string;
    /** paymentTransactions/{id} — the authoritative settlement record. */
    transactionId?: string;
    isSandbox?: boolean;
    amount?: number;
    /** Fired exactly once when the server settles the payment as PAID. */
    onVerified?: () => void;
    /** Dismiss for non-PAID terminal states (and after the customer taps Done). */
    onClose?: () => void;
}

interface ReceiptData {
    reference?: string;
    amount?: number;
    paymentMethod?: string;
    paidAt?: string;
}

const methodLabel = (method?: string): string => {
    const m = String(method || '').toLowerCase();
    if (!m) return 'HitPay Online';
    if (m.includes('gcash')) return 'GCash';
    if (m.includes('qrph')) return 'QR Ph';
    if (m.includes('maya') || m.includes('paymaya') || m.includes('upay')) return 'Maya';
    if (m.includes('card')) return 'Credit / Debit Card';
    return method as string;
};

/**
 * "Verifying your payment..." → "Payment Successful" only after the server
 * settles `paymentTransactions/{id}` (webhook + HitPay API re-verification).
 * Redirect parameters are never trusted and this component never writes to
 * Firestore itself.
 */
const PaymentVerificationOverlay: React.FC<PaymentVerificationOverlayProps> = ({
    isOpen,
    entityKind,
    entityId,
    paymentRequestId,
    transactionId,
    isSandbox,
    amount,
    onVerified,
    onClose
}) => {
    const [state, setState] = useState<PaymentVerificationState>('VERIFYING');
    const [message, setMessage] = useState('Please wait while HitPay confirms your payment.');
    const [receipt, setReceipt] = useState<ReceiptData>({});
    const stopRef = useRef<(() => void) | null>(null);
    const notifiedRef = useRef(false);
    const [isManualRefreshing, setIsManualRefreshing] = useState(false);

    const handleManualReverify = async () => {
        if (isManualRefreshing) return;
        setIsManualRefreshing(true);
        try {
            const marker = getPendingPaymentMarker();
            const txId = transactionId || marker?.transactionId || '';
            const prId = paymentRequestId || marker?.paymentRequestId || '';
            const sb = isSandbox ?? (marker?.environment === 'sandbox');
            await verifyPaymentTransaction({
                transactionId: txId || undefined,
                paymentRequestId: prId || undefined,
                isSandbox: sb
            });
        } catch {
            // ignore
        } finally {
            setTimeout(() => setIsManualRefreshing(false), 2000);
        }
    };

    useEffect(() => {
        if (!isOpen || (!entityId && !transactionId)) return;
        setState('VERIFYING');
        setMessage('Please wait while HitPay confirms your payment.');
        setReceipt({});
        notifiedRef.current = false;

        // Single pending payment at a time: the local marker carries the
        // authoritative transaction identity when the caller didn't pass it.
        const marker = getPendingPaymentMarker();
        const effectiveTxId = transactionId || marker?.transactionId || '';
        const effectivePrId = paymentRequestId || marker?.paymentRequestId || undefined;
        const effectiveSandbox = isSandbox ?? (marker?.environment === 'sandbox');

        if (effectiveTxId) {
            // Authoritative path: server-settled transaction record + backoff verify
            stopRef.current = watchTransactionReturnVerification({
                transactionId: effectiveTxId,
                paymentRequestId: effectivePrId,
                isSandbox: effectiveSandbox,
                timeoutMs: 90 * 1000,
                onState: (nextState, nextMessage, tx) => {
                    setState(nextState);
                    setMessage(nextMessage);
                    if (tx) {
                        setReceipt({
                            reference: tx.referenceNumber,
                            amount: Number(tx.amount) || undefined,
                            paymentMethod: methodLabel(tx.paymentMethod),
                            paidAt: tx.paidAt || tx.verifiedAt
                        });
                    }
                },
                onVerified: (tx) => {
                    if (tx) {
                        setReceipt({
                            reference: tx.referenceNumber,
                            amount: Number(tx.amount) || undefined,
                            paymentMethod: methodLabel(tx.paymentMethod),
                            paidAt: tx.paidAt || tx.verifiedAt
                        });
                    }
                    if (notifiedRef.current) return;
                    notifiedRef.current = true;
                    onVerified?.();
                }
            });
        } else {
            // Legacy entity-level watcher (no transaction record available)
            stopRef.current = watchPaymentReturnVerification({
                entityKind,
                entityId,
                paymentRequestId: effectivePrId,
                isSandbox: effectiveSandbox,
                onState: (nextState, nextMessage) => {
                    setState(nextState);
                    setMessage(nextMessage);
                },
                onVerified: () => {
                    if (notifiedRef.current) return;
                    notifiedRef.current = true;
                    onVerified?.();
                }
            });
        }

        return () => {
            stopRef.current?.();
            stopRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, entityKind, entityId, paymentRequestId, transactionId, isSandbox]);

    if (!isOpen) return null;

    const isPaid = state === 'PAID';
    const isTerminal = state === 'FAILED' || state === 'CANCELLED' || state === 'EXPIRED' || state === 'PENDING';
    const displayAmount = receipt.amount ?? amount;
    const isSuccess = isPaid;

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-5 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
            <div className="w-full max-w-sm bg-[#161822] border border-white/10 rounded-2xl p-6 space-y-4 shadow-2xl text-center">
                <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400 font-bold uppercase tracking-widest">
                    <Lock size={11} className="text-emerald-400" />
                    <span>Secure HitPay Payment</span>
                    {isSandbox && (
                        <span className="ml-1 px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-400/40 text-amber-300 text-[9px]">
                            SANDBOX
                        </span>
                    )}
                </div>

                <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center border">
                    {(state === 'VERIFYING' || state === 'INITIALIZING' || state === 'CONNECTING') && (
                        <div className="flex items-center justify-center">
                            <Spinner size="lg" />
                        </div>
                    )}
                    {state === 'WAITING' && <Clock size={32} className="text-amber-400" />}
                    {isSuccess && (
                        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                            <CheckCircle2 size={34} />
                        </div>
                    )}
                    {state === 'FAILED' && (
                        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center">
                            <XCircle size={34} />
                        </div>
                    )}
                    {state === 'CANCELLED' && (
                        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                            <ShieldCheck size={32} />
                        </div>
                    )}
                    {state === 'EXPIRED' && (
                        <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/30 text-orange-400 flex items-center justify-center">
                            <AlertTriangle size={32} />
                        </div>
                    )}
                    {state === 'PENDING' && (
                        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                            <Clock size={32} />
                        </div>
                    )}
                </div>

                <div>
                    <h3 className="text-lg font-black text-white tracking-tight">
                        {(state === 'VERIFYING' || state === 'INITIALIZING' || state === 'CONNECTING') && 'Verifying your payment...'}
                        {state === 'WAITING' && 'Waiting for Payment'}
                        {state === 'PAID' && '✓ Payment Successful'}
                        {state === 'FAILED' && 'Payment Failed'}
                        {state === 'CANCELLED' && 'Payment Cancelled'}
                        {state === 'EXPIRED' && 'Payment Expired'}
                        {state === 'PENDING' && 'Payment Verification Pending'}
                    </h3>
                    <p className="text-xs text-gray-400 mt-2 leading-relaxed">{message}</p>

                    {state === 'PAID' ? (
                        <div className="mt-4 p-3.5 bg-white/5 border border-white/10 rounded-xl text-left space-y-2 text-xs">
                            {receipt.reference && (
                                <div className="flex justify-between items-center gap-2">
                                    <span className="text-gray-400">Reference:</span>
                                    <span className="font-mono text-white font-bold break-all text-right">{receipt.reference}</span>
                                </div>
                            )}
                            {displayAmount !== undefined && displayAmount > 0 && (
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400">Amount Paid:</span>
                                    <span className="font-bold text-emerald-400">
                                        ₱{Number(displayAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            )}
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">Payment Method:</span>
                                <span className="text-white font-medium">{receipt.paymentMethod || 'HitPay Online'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">Verified At:</span>
                                <span className="text-white">
                                    {receipt.paidAt
                                        ? new Date(receipt.paidAt).toLocaleString()
                                        : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    ) : (
                        displayAmount !== undefined && displayAmount > 0 && (
                            <p className="text-[11px] text-gray-500 mt-2">
                                Amount: <span className="font-bold text-[#FE7803]">₱{Number(displayAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                            </p>
                        )
                    )}
                </div>

                {isPaid && (
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-black text-sm uppercase tracking-wider transition-all hover:from-emerald-600 hover:to-emerald-700 shadow-lg shadow-emerald-500/20"
                    >
                        View Booking & Continue
                    </button>
                )}
                {isTerminal && (
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm transition-all"
                    >
                        Close
                    </button>
                )}
                {!isPaid && !isTerminal && (
                    <div className="space-y-2">
                        <button
                            type="button"
                            onClick={handleManualReverify}
                            disabled={isManualRefreshing}
                            className="w-full py-2.5 rounded-xl bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-2"
                        >
                            <RefreshCw size={13} className={isManualRefreshing ? 'animate-spin' : ''} />
                            <span>{isManualRefreshing ? 'Checking HitPay...' : 'Re-verify Payment Now'}</span>
                        </button>
                        <p className="text-[10px] text-gray-500 leading-snug">
                            You can safely keep this screen open — we will update you automatically.
                        </p>
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold transition-all"
                        >
                            Close
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PaymentVerificationOverlay;
