import React from 'react';
import { XCircle, ArrowRight, RefreshCw, ShoppingCart, Wrench, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface CancellationData {
    type: 'Order' | 'Service Booking' | 'Car Rental' | 'Special Service';
    referenceId: string;
    amount: number;
    date: string;
    reason?: string;
    items?: Array<{ name: string; quantity?: number; price?: number }>;
    retryPath?: string;
}

interface CancellationDetailsModalProps {
    data: CancellationData;
    onClose: () => void;
}

export const CancellationDetailsModal: React.FC<CancellationDetailsModalProps> = ({ data, onClose }) => {
    const navigate = useNavigate();

    const handleDismiss = () => {
        // Cancel everything & clear booking session state
        try {
            sessionStorage.removeItem('ridersbud_booking_state');
            sessionStorage.removeItem('pendingHitPayBookingTx');
            sessionStorage.removeItem('pendingHitPayServiceTx');
            sessionStorage.removeItem('pendingHitPayTx');
            localStorage.removeItem('last_hitpay_booking_tx');
            localStorage.removeItem('last_hitpay_service_tx');
        } catch (e) {
            console.warn('Failed to clear session storage:', e);
        }
        onClose();
        navigate('/customer-portal/');
    };

    const handleRetry = () => {
        onClose();
        if (data.retryPath) {
            navigate(data.retryPath);
        } else if (data.type === 'Order') {
            navigate('/customer-portal/cart');
        } else {
            navigate('/customer-portal/booking');
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-[#18181A] border border-red-500/20 w-full max-w-md rounded-[1.75rem] overflow-hidden shadow-2xl animate-scaleUp text-white flex flex-col">
                {/* Header with Red Warning Accent */}
                <div className="bg-gradient-to-r from-red-500/15 via-red-500/5 to-transparent px-4 py-3 sm:px-5 sm:py-3.5 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0">
                            <XCircle className="w-4 h-4 animate-pulse" />
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5">
                                <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 leading-none">
                                    Transaction Cancelled
                                </span>
                            </div>
                            <h3 className="text-sm font-black text-white mt-0.5 leading-tight">Payment Aborted</h3>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-colors text-xs"
                    >
                        ✕
                    </button>
                </div>

                {/* Details Content */}
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    <p className="text-xs text-gray-300 leading-relaxed">
                        The transaction was completely cancelled as requested during payment gateway processing. No funds have been deducted.
                    </p>

                    {/* Summary Details Box */}
                    <div className="bg-[#121214] rounded-2xl p-4 border border-white/5 space-y-3">
                        <div className="flex justify-between items-center text-xs pb-2.5 border-b border-white/5">
                            <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Reference No.</span>
                            <span className="font-mono text-white font-black bg-white/5 px-2 py-0.5 rounded">
                                #{data.referenceId?.slice(-8)?.toUpperCase() || 'TXN-CANCELLED'}
                            </span>
                        </div>

                        <div className="flex justify-between items-center text-xs pb-2.5 border-b border-white/5">
                            <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Category</span>
                            <span className="text-gray-200 font-bold flex items-center gap-1.5">
                                {data.type === 'Order' ? <ShoppingCart size={13} className="text-primary" /> : <Wrench size={13} className="text-primary" />}
                                {data.type}
                            </span>
                        </div>

                        <div className="flex justify-between items-center text-xs pb-2.5 border-b border-white/5">
                            <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Amount</span>
                            <span className="text-red-400 font-black text-sm">
                                ₱{(data.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>

                        <div className="flex justify-between items-center text-xs pb-2.5 border-b border-white/5">
                            <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Date & Time</span>
                            <span className="text-gray-300 font-medium text-[11px]">{data.date || new Date().toLocaleString()}</span>
                        </div>

                        {data.reason && (
                            <div className="text-xs pt-1">
                                <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px] block mb-1">Reason</span>
                                <p className="text-gray-300 text-xs bg-red-500/5 p-2.5 rounded-xl border border-red-500/10 italic">
                                    "{data.reason}"
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Items/Services List if available */}
                    {data.items && data.items.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center justify-between">
                                <span>Cancelled Services / Items</span>
                                <span className="text-primary font-mono text-[10px]">{data.items.length} {data.items.length === 1 ? 'service' : 'services'}</span>
                            </h4>
                            <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar bg-[#121214] p-3 rounded-2xl border border-white/5">
                                {data.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-xs py-1.5 border-b border-white/5 last:border-0">
                                        <div className="flex items-center gap-2 min-w-0 pr-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                                            <span className="text-gray-200 font-bold truncate">
                                                {item.name} {item.quantity ? `(x${item.quantity})` : ''}
                                            </span>
                                        </div>
                                        {item.price !== undefined && (
                                            <span className="text-gray-300 font-mono font-bold shrink-0">
                                                ₱{Number(item.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Notice */}
                    <div className="flex items-start gap-2.5 bg-white/5 p-3 rounded-xl border border-white/5 text-[11px] text-gray-400">
                        <ShieldAlert size={16} className="text-yellow-500 shrink-0 mt-0.5" />
                        <span>Your service selection has been preserved so you can easily review, re-book, or complete checkout at any time.</span>
                    </div>
                </div>

                {/* Modal Actions */}
                <div className="p-3 bg-[#141416] border-t border-white/5 flex gap-2.5">
                    <button
                        onClick={handleDismiss}
                        className="flex-1 py-2.5 px-3 bg-white/5 hover:bg-white/10 text-gray-300 font-bold rounded-xl text-xs transition active:scale-95 text-center whitespace-nowrap"
                    >
                        Dismiss
                    </button>
                    <button
                        onClick={handleRetry}
                        className="flex-1 py-2.5 px-3 bg-gradient-to-r from-primary to-orange-600 hover:from-orange-600 hover:to-primary text-white font-black rounded-xl text-xs transition active:scale-95 shadow-lg shadow-primary/20 flex items-center justify-center gap-1.5 text-center whitespace-nowrap"
                    >
                        <RefreshCw size={13} className="shrink-0" />
                        <span>Retry Checkout</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
