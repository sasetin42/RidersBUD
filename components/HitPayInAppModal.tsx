import React, { useState, useEffect, useRef } from 'react';
import { 
    X, 
    RefreshCw, 
    ShieldCheck, 
    Lock, 
    ExternalLink, 
    AlertTriangle,
    CheckCircle2
} from 'lucide-react';
import Spinner from './Spinner';

interface HitPayInAppModalProps {
    isOpen: boolean;
    checkoutUrl: string;
    onClose: () => void;
    onSuccess: (details: { reference?: string; status?: string; paymentRequestId?: string }) => void;
    onCancel: () => void;
    title?: string;
    amount?: number;
}

export const HitPayInAppModal: React.FC<HitPayInAppModalProps> = ({
    isOpen,
    checkoutUrl,
    onClose,
    onSuccess,
    onCancel,
    title = 'Online Payment',
    amount
}) => {
    const [isLoading, setIsLoading] = useState(true);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [iframeKey, setIframeKey] = useState(0);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Reset loading state when url or key changes
    useEffect(() => {
        if (isOpen) {
            setIsLoading(true);
            setShowCancelConfirm(false);
        }
    }, [isOpen, checkoutUrl, iframeKey]);

    // Handle messages / callbacks from embedded payment portals
    useEffect(() => {
        if (!isOpen) return;

        const handleMessage = (event: MessageEvent) => {
            // Check origin or event data payload
            try {
                const data = event.data;
                if (!data) return;

                // Handle string or object payloads
                if (typeof data === 'string') {
                    if (data.includes('hitpay_payment_completed') || data.includes('payment_success')) {
                        onSuccess({ status: 'completed' });
                        return;
                    }
                    if (data.includes('hitpay_payment_cancelled') || data.includes('payment_cancelled')) {
                        onCancel();
                        return;
                    }
                } else if (typeof data === 'object') {
                    if (data.type === 'HITPAY_PAYMENT_SUCCESS' || data.status === 'completed' || data.hitpay === 'completed') {
                        onSuccess({
                            reference: data.reference,
                            status: 'completed',
                            paymentRequestId: data.paymentRequestId || data.id
                        });
                        return;
                    }
                    if (data.type === 'HITPAY_PAYMENT_CANCELLED' || data.status === 'canceled' || data.status === 'cancelled') {
                        onCancel();
                        return;
                    }
                }
            } catch (err) {
                console.warn('[HitPayInAppModal] message handler notice:', err);
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [isOpen, onSuccess, onCancel]);

    // Intercept redirect url navigation if possible
    const checkIframeNavigation = () => {
        try {
            if (!iframeRef.current) return;
            const currentHref = iframeRef.current.contentWindow?.location?.href;
            if (currentHref) {
                if (currentHref.includes('status=completed') || currentHref.includes('hitpay=completed') || currentHref.includes('success=true')) {
                    const parsedUrl = new URL(currentHref);
                    const ref = parsedUrl.searchParams.get('reference') || undefined;
                    const reqId = parsedUrl.searchParams.get('payment_request_id') || undefined;
                    onSuccess({ reference: ref, status: 'completed', paymentRequestId: reqId });
                } else if (currentHref.includes('status=canceled') || currentHref.includes('status=cancelled')) {
                    onCancel();
                }
            }
        } catch (e) {
            // Cross-origin access to iframe href is blocked by browser security if cross-domain, which is expected
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
            {/* Top In-App Browser Bar */}
            <div className="bg-[#12131A] border-b border-white/10 px-4 py-3 flex items-center justify-between shadow-xl flex-shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                    <button
                        type="button"
                        onClick={() => setShowCancelConfirm(true)}
                        className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
                        title="Close payment sheet"
                    >
                        <X size={18} />
                    </button>
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                            <Lock size={12} className="text-emerald-400 flex-shrink-0" />
                            <h3 className="text-xs font-black tracking-tight text-white truncate">
                                {title}
                            </h3>
                            {amount && amount > 0 && (
                                <span className="text-[10px] font-mono font-bold text-[#FE7803] bg-[#FE7803]/10 px-2 py-0.5 rounded-full border border-[#FE7803]/20">
                                    ₱{amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </span>
                            )}
                        </div>
                        <p className="text-[9px] text-gray-400 flex items-center gap-1 truncate mt-0.5">
                            <ShieldCheck size={10} className="text-emerald-400" />
                            <span>HitPay 256-Bit SSL Encrypted Checkout</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                        type="button"
                        onClick={() => setIframeKey(k => k + 1)}
                        disabled={isLoading}
                        className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                        title="Refresh payment page"
                    >
                        <RefreshCw size={15} className={isLoading ? 'animate-spin text-[#FE7803]' : ''} />
                    </button>

                    <a
                        href={checkoutUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors hidden sm:flex"
                        title="Open in external browser if needed"
                    >
                        <ExternalLink size={15} />
                    </a>
                </div>
            </div>

            {/* High-Speed Connection Progress Bar */}
            {isLoading && (
                <div className="w-full h-1 bg-white/5 overflow-hidden flex-shrink-0">
                    <div className="w-full h-full bg-gradient-to-r from-[#FE7803] via-amber-400 to-emerald-400 animate-pulse origin-left" />
                </div>
            )}

            {/* In-App Sheet Viewport */}
            <div className="flex-1 relative w-full h-full bg-[#0A0B0E] overflow-hidden flex flex-col items-center justify-center p-6 text-center">
                {checkoutUrl.startsWith('https://') || checkoutUrl.startsWith('http://') ? (
                    <div className="w-full max-w-md bg-[#161822] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                            <ShieldCheck size={32} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white tracking-tight">HitPay Secure Gateway</h3>
                            <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                                To comply with international banking security & CSP protection protocols, HitPay processes transactions in a dedicated secure session window.
                            </p>
                            {amount && amount > 0 && (
                                <div className="mt-4 p-3 bg-white/5 rounded-xl border border-white/5">
                                    <span className="text-xs text-gray-400 block mb-0.5">Amount to Pay</span>
                                    <span className="text-xl font-mono font-black text-[#FE7803]">
                                        ₱{amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            )}
                        </div>
                        <div className="pt-2 flex flex-col gap-3">
                            <a
                                href={checkoutUrl}
                                target="_self"
                                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#FE7803] to-[#FF9033] hover:from-[#E06600] hover:to-[#FE7803] text-white font-bold text-sm uppercase tracking-wider transition-all duration-200 shadow-lg shadow-[#FE7803]/25 flex items-center justify-center gap-2"
                            >
                                <span>Continue to HitPay Checkout</span>
                                <ExternalLink size={16} />
                            </a>
                            <button
                                type="button"
                                onClick={() => setShowCancelConfirm(true)}
                                className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-xs font-bold transition-colors"
                            >
                                Cancel Payment
                            </button>
                        </div>
                    </div>
                ) : (
                    <iframe
                        key={iframeKey}
                        ref={iframeRef}
                        src={checkoutUrl}
                        title="HitPay Checkout Portal"
                        className={`w-full h-full border-0 bg-[#0F0F12] transition-opacity duration-300 ${
                            isLoading ? 'opacity-0 pointer-events-none' : 'opacity-100'
                        }`}
                        onLoad={() => {
                            setIsLoading(false);
                            checkIframeNavigation();
                        }}
                    />
                )}
            </div>

            {/* Cancel Confirmation Dialog */}
            {showCancelConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
                    <div className="bg-[#181A24] border border-white/10 rounded-2xl p-5 max-w-xs w-full space-y-4 shadow-2xl text-center">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                            <AlertTriangle size={24} />
                        </div>
                        <div>
                            <h4 className="font-bold text-white text-sm">Cancel Payment?</h4>
                            <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                                Are you sure you want to cancel? No funds will be debited and you will remain on your booking screen.
                            </p>
                        </div>
                        <div className="flex gap-2 pt-1">
                            <button
                                type="button"
                                onClick={() => setShowCancelConfirm(false)}
                                className="flex-1 py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider transition-colors"
                            >
                                Continue
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowCancelConfirm(false);
                                    onCancel();
                                }}
                                className="flex-1 py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-lg shadow-red-600/25"
                            >
                                Yes, Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HitPayInAppModal;
