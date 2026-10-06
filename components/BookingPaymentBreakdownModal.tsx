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

    const [selectedOptionInternal, setSelectedOptionInternal] = React.useState<'downpayment' | 'full'>(paymentOption);
    const activeOption = onPaymentOptionChange ? paymentOption : selectedOptionInternal;
    const handleOptionSelect = (opt: 'downpayment' | 'full') => {
        setSelectedOptionInternal(opt);
        onPaymentOptionChange?.(opt);
    };

    const effectivePayAmount = activeOption === 'full' ? totalAmount : downpaymentAmount;

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
                    
                    {/* Payment Option Selector: 50% Downpayment vs Full Payment (100%) */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-primary uppercase tracking-wider flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                Payment Option
                            </span>
                            <span className="bg-primary/10 border border-primary/20 text-primary text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                                Verified Secure
                            </span>
                        </div>

                        {/* Interactive Option Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Option A: 50% Downpayment */}
                            <button
                                type="button"
                                onClick={() => handleOptionSelect('downpayment')}
                                className={`text-left rounded-2xl p-3.5 relative overflow-hidden transition-all duration-200 border-2 flex flex-col justify-between ${
                                    activeOption === 'downpayment'
                                        ? 'bg-gradient-to-br from-[#1e1c24] to-[#151419] border-primary shadow-lg shadow-primary/15'
                                        : 'bg-[#151518] border-white/10 hover:border-white/20 opacity-80 hover:opacity-100'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-primary">
                                        Option A
                                    </span>
                                    {activeOption === 'downpayment' ? (
                                        <span className="w-4 h-4 rounded-full bg-primary text-black flex items-center justify-center text-[10px] font-black">
                                            ✓
                                        </span>
                                    ) : (
                                        <span className="w-4 h-4 rounded-full border border-white/20" />
                                    )}
                                </div>
                                <div className="mt-2">
                                    <p className="text-xs font-bold text-gray-200">50% Downpayment</p>
                                    <p className="text-xl font-black text-white mt-0.5">
                                        {formatMoney(downpaymentAmount)}
                                    </p>
                                    <p className="text-[10px] text-gray-400 mt-1 leading-snug">
                                        Remaining {formatMoney(remainingBalance)} settled upon completion
                                    </p>
                                </div>
                                <div className="mt-2.5 flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                                    <CheckCircle2 size={12} className="flex-shrink-0" />
                                    <span>Locks your slot</span>
                                </div>
                            </button>

                            {/* Option B: Full Payment (100%) */}
                            <button
                                type="button"
                                onClick={() => handleOptionSelect('full')}
                                className={`text-left rounded-2xl p-3.5 relative overflow-hidden transition-all duration-200 border-2 flex flex-col justify-between ${
                                    activeOption === 'full'
                                        ? 'bg-gradient-to-br from-[#1e1c24] to-[#151419] border-primary shadow-lg shadow-primary/15'
                                        : 'bg-[#151518] border-white/10 hover:border-white/20 opacity-80 hover:opacity-100'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                                        Option B
                                    </span>
                                    {activeOption === 'full' ? (
                                        <span className="w-4 h-4 rounded-full bg-primary text-black flex items-center justify-center text-[10px] font-black">
                                            ✓
                                        </span>
                                    ) : (
                                        <span className="w-4 h-4 rounded-full border border-white/20" />
                                    )}
                                </div>
                                <div className="mt-2">
                                    <p className="text-xs font-bold text-gray-200">Full Payment (100%)</p>
                                    <p className="text-xl font-black text-white mt-0.5">
                                        {formatMoney(totalAmount)}
                                    </p>
                                    <p className="text-[10px] text-gray-400 mt-1 leading-snug">
                                        Fully settled upfront. No balance on completion.
                                    </p>
                                </div>
                                <div className="mt-2.5 flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                                    <CheckCircle2 size={12} className="flex-shrink-0" />
                                    <span>Zero hassle on finish</span>
                                </div>
                            </button>
                        </div>

                        {/* Informational Guidance */}
                        <div className="flex items-start gap-2 bg-white/5 rounded-xl p-2.5 border border-white/5 text-[11px] text-gray-300 leading-relaxed">
                            <Info size={14} className="text-primary flex-shrink-0 mt-0.5" />
                            {activeOption === 'full' ? (
                                <span>
                                    You are paying the complete total of <strong className="text-white">{formatMoney(totalAmount)}</strong> upfront via HitPay. Once your service is done, nothing more to pay!
                                </span>
                            ) : (
                                <span>
                                    You are only paying <strong className="text-white">{formatMoney(downpaymentAmount)}</strong> today to confirm. The remaining <strong className="text-white">{formatMoney(remainingBalance)}</strong> will only be settled once the job is safely completed.
                                </span>
                            )}
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
                        <div className="pt-3 border-t border-white/10 space-y-1.5">
                            <div className="flex items-center justify-between text-xs text-gray-400">
                                <span>Total Estimated Amount</span>
                                <span className="font-bold text-white font-mono">{formatMoney(totalAmount)}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-primary font-bold">
                                <span>{activeOption === 'full' ? 'Pay Now (100% Full Payment)' : 'Initial Downpayment (50%)'}</span>
                                <span className="font-mono">{formatMoney(effectivePayAmount)}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-gray-400">
                                <span>Remaining Balance</span>
                                <span className="font-mono">{formatMoney(activeOption === 'full' ? 0 : remainingBalance)}</span>
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
                                    {activeOption === 'full'
                                        ? `Pay Full Amount (${formatMoney(effectivePayAmount)})`
                                        : `Proceed to Pay ${formatMoney(effectivePayAmount)}`}
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
