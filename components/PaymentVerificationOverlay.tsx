import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, XCircle, Clock, ShieldCheck, Lock } from 'lucide-react';
import Spinner from './Spinner';
import { PaymentEntityKind } from '../utils/firestoreCollections';
import {
    PaymentVerificationState,
    watchPaymentReturnVerification
} from '../utils/paymentReturn';

interface PaymentVerificationOverlayProps {
    isOpen: boolean;
    entityKind: PaymentEntityKind;
    entityId: string;
    paymentRequestId?: string;
    isSandbox?: boolean;
    amount?: number;
    /** Fired exactly once when the webhook's authoritative Firestore write is observed. */
    onVerified?: () => void;
    /** Dismiss for non-PAID terminal states (and after the customer taps Done). */
    onClose?: () => void;
}

/**
 * "Verifying your payment..." → "Payment Successful" only after the webhook's
 * Firestore write (requirement #10 / #8). The redirect parameters are never
 * trusted and this component never writes to Firestore itself.
 */
const PaymentVerificationOverlay: React.FC<PaymentVerificationOverlayProps> = ({
    isOpen,
    entityKind,
    entityId,
    paymentRequestId,
    isSandbox,
    amount,
    onVerified,
    onClose
}) => {
    const [state, setState] = useState<PaymentVerificationState>('VERIFYING');
    const [message, setMessage] = useState('Please wait while HitPay confirms your payment.');
    const stopRef = useRef<(() => void) | null>(null);
    const notifiedRef = useRef(false);

    useEffect(() => {
        if (!isOpen || !entityId) return;
        setState('VERIFYING');
        setMessage('Please wait while HitPay confirms your payment.');
        notifiedRef.current = false;

        stopRef.current = watchPaymentReturnVerification({
            entityKind,
            entityId,
            paymentRequestId,
            isSandbox,
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

        return () => {
            stopRef.current?.();
            stopRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, entityKind, entityId, paymentRequestId, isSandbox]);

    if (!isOpen) return null;

    const isPaid = state === 'PAID';
    const isTerminal = state === 'FAILED' || state === 'CANCELLED' || state === 'PENDING';

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-5 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
            <div className="w-full max-w-sm bg-[#161822] border border-white/10 rounded-2xl p-6 space-y-4 shadow-2xl text-center">
                <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400 font-bold uppercase tracking-widest">
                    <Lock size={11} className="text-emerald-400" />
                    <span>Secure HitPay Payment</span>
                </div>

                <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center border">
                    {state === 'VERIFYING' && (
                        <div className="flex items-center justify-center">
                            <Spinner size="lg" />
                        </div>
                    )}
                    {isPaid && (
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
                    {state === 'PENDING' && (
                        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                            <Clock size={32} />
                        </div>
                    )}
                </div>

                <div>
                    <h3 className="text-lg font-black text-white tracking-tight">
                        {state === 'VERIFYING' && 'Verifying your payment...'}
                        {state === 'PAID' && 'Payment Successful'}
                        {state === 'FAILED' && 'Payment Failed'}
                        {state === 'CANCELLED' && 'Payment Cancelled'}
                        {state === 'PENDING' && 'Payment Pending'}
                    </h3>
                    <p className="text-xs text-gray-400 mt-2 leading-relaxed">{message}</p>
                    
                    {state === 'PAID' ? (
                        <div className="mt-4 p-3.5 bg-white/5 border border-white/10 rounded-xl text-left space-y-2 text-xs">
                            <div className="flex justify-between items-center text-gray-400">
                                <span>Reference / Order:</span>
                                <span className="font-mono text-white font-bold">{entityId}</span>
                            </div>
                            {amount !== undefined && amount > 0 && (
                                <div className="flex justify-between items-center text-gray-400">
                                    <span>Amount Paid:</span>
                                    <span className="font-bold text-emerald-400">₱{amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center text-gray-400">
                                <span>Payment Method:</span>
                                <span className="text-white font-medium">HitPay Online</span>
                            </div>
                            <div className="flex justify-between items-center text-gray-400">
                                <span>Verified At:</span>
                                <span className="text-white">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                        </div>
                    ) : (
                        amount !== undefined && amount > 0 && (
                            <p className="text-[11px] text-gray-500 mt-2">
                                Amount: <span className="font-bold text-[#FE7803]">₱{amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
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
                        View Order & Continue
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
                {state === 'VERIFYING' && (
                    <div className="space-y-2">
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
