import React from 'react';
import { 
    CreditCard, ShieldCheck, X, ArrowRight, CheckCircle2, 
    Clock, AlertCircle, Info, Lock, ChevronRight, Wrench, Car, User
} from 'lucide-react';
import Spinner from './Spinner';

interface ServiceItem {
    id?: string;
    name: string;
    price: number;
    category?: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onProceed: () => void;
    paymentOption?: 'downpayment' | 'full';
    onPaymentOptionChange?: (option: 'downpayment' | 'full') => void;
    isProcessing?: boolean;
    processingStage?: string;
    currency?: string;
    services: ServiceItem[];
    totalAmount: number;
    downpaymentAmount: number;
    remainingBalance: number;
    customerName?: string;
    scheduledDate?: string;
    scheduledTime?: string;
    vehicleDetails?: string;
    mechanicName?: string;
    isSpecialRentalOrDriver?: boolean;
    rentalDetails?: {
        type: 'car' | 'driver' | 'both';
        days: number;
        carName?: string;
        driverName?: string;
    };
}

export const BookingPaymentBreakdownModal: React.FC<Props> = ({
    isOpen,
    onClose,
    onProceed,
    paymentOption = 'downpayment',
    onPaymentOptionChange,
    isProcessing = false,
    processingStage,
    currency = '₱',
    services,
    totalAmount,
    downpaymentAmount,
    remainingBalance,
    scheduledDate,
    scheduledTime,
    vehicleDetails,
    mechanicName,
    isSpecialRentalOrDriver,
    rentalDetails
}) => {
    if (!isOpen) return null;

    const formatMoney = (val: number) => {
        return `${currency}${val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
            {/* Modal Container */}
            <div 
                className="relative w-full max-w-lg bg-[#141416] border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[85vh] animate-slideInUp font-sans"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header Pattern Background */}
                <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-primary/15 via-primary/5 to-transparent pointer-events-none" />

                {/* Top Bar / Header */}
                <div className="relative z-10 px-5 pt-5 pb-3 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center shadow-lg shadow-primary/20 text-white flex-shrink-0">
                            <CreditCard size={20} />
                        </div>
                        <div>
                            <h3 className="text-base sm:text-lg font-black text-white tracking-tight leading-tight">
                                Payment Breakdown
                            </h3>
                            <p className="text-[11px] text-gray-400 font-medium">
                                Review your deposit & final balance details
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isProcessing}
                        className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition border border-white/5 disabled:opacity-50"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Modal Scrollable Body */}
                <div className="relative z-10 overflow-y-auto p-5 space-y-4 flex-grow custom-scrollbar">
                    
                    {/* 50% Initial Downpayment & Completion Balance Card */}
                    <div className="bg-gradient-to-br from-[#1d1712] via-[#161414] to-[#121215] border border-primary/30 rounded-2xl p-4 shadow-xl shadow-black/40 space-y-3.5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

                        {/* Status / Policy Badge */}
                        <div className="flex items-center justify-between relative z-10">
                            <span className="text-[10px] font-black text-primary uppercase tracking-wider flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                Payment Structure
                            </span>
                            <span className="bg-primary/10 border border-primary/25 text-primary text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                <ShieldCheck size={11} className="text-primary" />
                                Verified Secure
                            </span>
                        </div>

                        {/* 50% Initial Deposit Display */}
                        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#1c1917]/80 border border-primary/20 rounded-xl p-3.5">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-black text-gray-200 uppercase tracking-wide">
                                        50% Initial Downpayment
                                    </span>
                                    <span className="text-[9px] font-black text-primary bg-primary/15 border border-primary/30 px-1.5 py-0.5 rounded">
                                        Due Now
                                    </span>
                                </div>
                                <p className="text-2xl font-black text-white mt-1 tracking-tight">
                                    {formatMoney(downpaymentAmount)}
                                </p>
                                <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1">
                                    <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                                    Locks your mechanic schedule & confirms booking
                                </p>
                            </div>

                            <div className="sm:text-right border-t sm:border-t-0 sm:border-l border-white/10 pt-2.5 sm:pt-0 sm:pl-3.5">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                                    Remaining Balance (50%)
                                </span>
                                <span className="text-base font-black text-gray-200 font-mono mt-0.5 block">
                                    {formatMoney(remainingBalance)}
                                </span>
                                <span className="text-[10px] text-primary font-bold block mt-0.5">
                                    Pay after service completion
                                </span>
                            </div>
                        </div>

                        {/* Completion Notice */}
                        <div className="flex items-start gap-2 bg-white/5 rounded-xl p-3 border border-white/5 text-[11px] text-gray-300 leading-relaxed relative z-10">
                            <Info size={15} className="text-primary flex-shrink-0 mt-0.5" />
                            <span>
                                You only pay <strong className="text-white font-bold">{formatMoney(downpaymentAmount)}</strong> today to confirm your booking. The remaining balance of <strong className="text-white font-bold">{formatMoney(remainingBalance)}</strong> (completing the full total of <strong className="text-white font-bold">{formatMoney(totalAmount)}</strong>) will only be settled once your mechanic arrives and successfully completes the services.
                            </span>
                        </div>
                    </div>

                    {/* Itemized Services / Package Summary */}
                    <div className="bg-[#18181b] rounded-2xl p-4 border border-white/5 space-y-3">
                        <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                            <Wrench size={13} className="text-primary" />
                            Selected Services & Fees
                        </h4>

                        <div className="divide-y divide-white/5 space-y-2 pt-1">
                            {services.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs pt-2 first:pt-0">
                                    <div className="min-w-0 pr-2">
                                        <p className="font-bold text-gray-200 truncate">{item.name}</p>
                                        {item.category && (
                                            <p className="text-[10px] text-gray-500 font-medium">{item.category}</p>
                                        )}
                                    </div>
                                    <span className="font-mono font-bold text-white flex-shrink-0">
                                        {formatMoney(item.price)}
                                    </span>
                                </div>
                            ))}

                            {/* Special Car Rental / Driver Hire add-ons */}
                            {isSpecialRentalOrDriver && rentalDetails && (
                                <div className="pt-2 text-xs space-y-1">
                                    {rentalDetails.carName && (
                                        <div className="flex items-center justify-between text-gray-300">
                                            <span className="flex items-center gap-1 text-[11px]">
                                                <Car size={12} className="text-primary" /> {rentalDetails.carName} ({rentalDetails.days} days)
                                            </span>
                                        </div>
                                    )}
                                    {rentalDetails.driverName && (
                                        <div className="flex items-center justify-between text-gray-300">
                                            <span className="flex items-center gap-1 text-[11px]">
                                                <User size={12} className="text-primary" /> {rentalDetails.driverName} ({rentalDetails.days} days)
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Calculation Summary */}
                        <div className="pt-3 border-t border-white/10 space-y-2">
                            <div className="flex items-center justify-between text-xs text-gray-400">
                                <span>Total Estimated Amount</span>
                                <span className="font-bold text-white font-mono">{formatMoney(totalAmount)}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs bg-primary/10 border border-primary/20 rounded-xl px-3 py-2 text-primary font-bold">
                                <span>Pay Now (50% Initial Downpayment)</span>
                                <span className="font-mono text-white font-extrabold text-sm">{formatMoney(downpaymentAmount)}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs px-1 text-gray-300">
                                <span className="flex items-center gap-1.5">
                                    <Clock size={12} className="text-primary" />
                                    <span>Remaining Balance (After Mechanic Service)</span>
                                </span>
                                <span className="font-mono font-bold text-gray-200">{formatMoney(remainingBalance)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Booking Details Context Card */}
                    {(scheduledDate || vehicleDetails || mechanicName) && (
                        <div className="bg-[#18181b] rounded-2xl p-3.5 border border-white/5 text-xs text-gray-400 space-y-2">
                            <p className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Appointment Overview</p>
                            <div className="grid grid-cols-2 gap-2 text-[11px]">
                                {scheduledDate && (
                                    <div>
                                        <span className="text-gray-500 block text-[9px] uppercase font-bold">Schedule</span>
                                        <span className="text-gray-200 font-semibold">{scheduledDate} {scheduledTime && `• ${scheduledTime}`}</span>
                                    </div>
                                )}
                                {vehicleDetails && (
                                    <div>
                                        <span className="text-gray-500 block text-[9px] uppercase font-bold">Vehicle</span>
                                        <span className="text-gray-200 font-semibold truncate block">{vehicleDetails}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Trust & Safe Payment Guarantee */}
                    <div className="flex items-center gap-3 p-3.5 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                        <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 flex-shrink-0">
                            <ShieldCheck size={20} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-black text-emerald-300">100% Safe & Protected Payment</p>
                            <p className="text-[11px] text-emerald-200/90 leading-snug mt-0.5">
                                Your money is held safely until your mechanic arrives and completes the job. If you cancel, you get a quick and hassle-free refund.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Bottom Sticky Action Buttons */}
                <div className="relative z-10 p-4 sm:p-5 bg-[#141416] border-t border-white/10 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                    <button
                        type="button"
                        onClick={onProceed}
                        disabled={isProcessing}
                        className={`w-full h-14 rounded-2xl text-white font-black text-sm sm:text-base uppercase tracking-wider transition-all duration-300 shadow-lg flex items-center justify-center gap-2 ${
                            isProcessing
                                ? 'bg-gradient-to-r from-orange-500 via-primary to-orange-600 shadow-primary/40 animate-pulse cursor-wait'
                                : 'bg-gradient-to-r from-primary via-orange-500 to-orange-600 hover:from-orange-600 hover:to-primary shadow-primary/25 active:scale-98'
                        }`}
                    >
                        {isProcessing ? (
                            <>
                                <Spinner size="sm" color="text-white" />
                                <span className="font-extrabold tracking-wide">{processingStage || 'Connecting to HitPay...'}</span>
                            </>
                        ) : (
                            <>
                                <span>
                                    Proceed to Pay {formatMoney(downpaymentAmount)} (50% Downpayment)
                                </span>
                                <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                    {isProcessing && (
                        <p className="text-center text-[11px] text-emerald-300/90 font-bold mt-2.5 leading-snug">
                            Secure HitPay Payment — You are securely completing your payment with HitPay.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BookingPaymentBreakdownModal;
