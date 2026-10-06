import React, { useState } from 'react';
import { CreditCard, QrCode, Wallet, X, Lock, ShieldCheck, ChevronRight } from 'lucide-react';
import { PaymentEntityKind } from '../../utils/firestoreCollections';
import { PaymentController, PaymentControllerResult } from '../../services/payment/PaymentController';
import { PaymentState } from '../../services/payment/paymentStateMachine';
import { NativeQrPayment } from './NativeQrPayment';
import Spinner from '../Spinner';

interface SecurePaymentSheetProps {
    isOpen: boolean;
    onClose: () => void;
    entityKind: PaymentEntityKind;
    entityId: string;
    kind?: 'downpayment' | 'balance' | 'full';
    amount: number;
    currency?: string;
    purpose?: string;
    customerEmail?: string;
    customerName?: string;
    customerPhone?: string;
    onSuccess: (result: PaymentControllerResult) => void;
    onFailed?: (errorMsg: string) => void;
}

export const SecurePaymentSheet: React.FC<SecurePaymentSheetProps> = ({
    isOpen,
    onClose,
    entityKind,
    entityId,
    kind = 'full',
    amount,
    currency = 'PHP',
    purpose,
    customerEmail,
    customerName,
    customerPhone,
    onSuccess,
    onFailed
}) => {
    const [selectedMethod, setSelectedMethod] = useState<'card' | 'qrph' | 'gcash'>('card');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [paymentState, setPaymentState] = useState<PaymentState>('CREATED');
    const [statusMessage, setStatusMessage] = useState<string>('');
    const [qrCodeData, setQrCodeData] = useState<string | null>(null);
    const [activeRefNumber, setActiveRefNumber] = useState<string>('');

    if (!isOpen) return null;

    const handlePay = async () => {
        setIsSubmitting(true);
        setStatusMessage('Initializing secure payment...');

        try {
            const res = await PaymentController.pay({
                entityKind,
                entityId,
                kind: (kind as 'downpayment' | 'balance' | 'full') || 'full',
                expectedAmount: amount,
                currency,
                purpose,
                customerEmail,
                customerName,
                customerPhone,
                preferredMethod: selectedMethod,
                onStateChange: (state, msg) => {
                    setPaymentState(state);
                    if (msg) setStatusMessage(msg);
                }
            });

            if (res.qrCodeData) {
                setQrCodeData(res.qrCodeData);
                if (res.referenceNumber) setActiveRefNumber(res.referenceNumber);
                setIsSubmitting(false);
                return;
            }

            if (res.success && res.state === 'PAID') {
                onSuccess(res);
                onClose();
            } else if (!res.success) {
                onFailed?.(res.errorMessage || 'Payment was not successful.');
            }
        } catch (err: any) {
            const msg = err?.message || 'Failed to complete payment.';
            setStatusMessage(msg);
            onFailed?.(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="w-full max-w-md bg-[#121215] border border-white/10 rounded-t-[2.5rem] sm:rounded-[2rem] p-6 text-white shadow-2xl animate-slideUp">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-5">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-[#FE7803]/10 border border-[#FE7803]/20 flex items-center justify-center text-[#FE7803]">
                            <Lock size={18} />
                        </div>
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-[#FE7803] block">
                                RidersBUD Secure Checkout
                            </span>
                            <h3 className="text-sm font-bold text-white">Choose Payment Method</h3>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition cursor-pointer"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Amount Display */}
                <div className="bg-[#18181C] border border-white/5 rounded-2xl p-4 mb-5 flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                            Amount Due
                        </span>
                        <div className="text-2xl font-black text-white flex items-baseline gap-1 mt-0.5">
                            <span className="text-primary text-base">₱</span>
                            {amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            SSL Encrypted
                        </span>
                        {kind && (
                            <span className="text-[10px] text-gray-400 block mt-1 uppercase font-semibold">
                                {kind}
                            </span>
                        )}
                    </div>
                </div>

                {/* If Native QR Ph mode is active, display it */}
                {qrCodeData ? (
                    <NativeQrPayment
                        qrCodeData={qrCodeData}
                        amount={amount}
                        currency={currency}
                        referenceNumber={activeRefNumber}
                        onExpire={() => {
                            setQrCodeData(null);
                            setStatusMessage('QR code expired. Please select a method again.');
                        }}
                    />
                ) : (
                    <>
                        {/* Method Options */}
                        <div className="space-y-3 mb-6">
                            {/* Card Option */}
                            <div
                                onClick={() => setSelectedMethod('card')}
                                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                                    selectedMethod === 'card'
                                        ? 'bg-[#1E1E24] border-primary/50 shadow-lg shadow-primary/10'
                                        : 'bg-[#151518] border-white/5 hover:border-white/10'
                                }`}
                            >
                                <div className="flex items-center gap-3.5">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                        <CreditCard size={20} />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-white">Credit / Debit Card</h4>
                                        <p className="text-[10px] text-gray-400 mt-0.5">Visa, Mastercard, JCB (3D Secure in-app)</p>
                                    </div>
                                </div>
                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedMethod === 'card' ? 'border-primary bg-primary' : 'border-white/20'}`}>
                                    {selectedMethod === 'card' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                </div>
                            </div>

                            {/* QR Ph Option */}
                            <div
                                onClick={() => setSelectedMethod('qrph')}
                                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                                    selectedMethod === 'qrph'
                                        ? 'bg-[#1E1E24] border-primary/50 shadow-lg shadow-primary/10'
                                        : 'bg-[#151518] border-white/5 hover:border-white/10'
                                }`}
                            >
                                <div className="flex items-center gap-3.5">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
                                        <QrCode size={20} />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-white">QR Ph (Direct In-App)</h4>
                                        <p className="text-[10px] text-gray-400 mt-0.5">Scan with Maya, Banks, or any QR Ph app</p>
                                    </div>
                                </div>
                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedMethod === 'qrph' ? 'border-primary bg-primary' : 'border-white/20'}`}>
                                    {selectedMethod === 'qrph' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                </div>
                            </div>

                            {/* GCash Direct Link Option */}
                            <div
                                onClick={() => setSelectedMethod('gcash')}
                                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                                    selectedMethod === 'gcash'
                                        ? 'bg-[#1E1E24] border-primary/50 shadow-lg shadow-primary/10'
                                        : 'bg-[#151518] border-white/5 hover:border-white/10'
                                }`}
                            >
                                <div className="flex items-center gap-3.5">
                                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0">
                                        <Wallet size={20} />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-white">GCash App Direct</h4>
                                        <p className="text-[10px] text-gray-400 mt-0.5">Launches GCash directly without browser</p>
                                    </div>
                                </div>
                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedMethod === 'gcash' ? 'border-primary bg-primary' : 'border-white/20'}`}>
                                    {selectedMethod === 'gcash' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                </div>
                            </div>
                        </div>

                        {/* Status message */}
                        {statusMessage && (
                            <p className="text-center text-xs text-primary font-medium mb-4">
                                {statusMessage}
                            </p>
                        )}

                        {/* Submit Button */}
                        <button
                            type="button"
                            onClick={handlePay}
                            disabled={isSubmitting}
                            className="w-full py-4 rounded-2xl bg-primary hover:bg-orange-600 active:scale-[0.98] text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-primary/25 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <>
                                    <Spinner size="sm" color="text-white" />
                                    <span>Processing...</span>
                                </>
                            ) : (
                                <>
                                    <span>Pay ₱{amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    <ChevronRight size={18} />
                                </>
                            )}
                        </button>
                    </>
                )}

                {/* Footer Trust note */}
                <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-gray-400">
                    <ShieldCheck size={12} className="text-emerald-400" />
                    <span>Protected by HitPay Merchant Services & RidersBUD Security</span>
                </div>
            </div>
        </div>
    );
};
