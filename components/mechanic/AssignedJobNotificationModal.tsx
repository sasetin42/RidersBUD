import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Briefcase,
    User,
    Car,
    Calendar,
    Clock,
    Wrench,
    ChevronRight,
    X,
    Wallet,
    MapPin,
    Receipt,
    CheckCircle2,
} from 'lucide-react';
import { Booking } from '../../types';
import { useDatabase } from '../../context/DatabaseContext';

interface AssignedJobNotificationModalProps {
    booking: Booking;
    onClose: () => void;
}

interface DetailRowProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    onClick?: () => void;
    isLink?: boolean;
}

const DetailRow: React.FC<DetailRowProps> = ({ icon, label, value, onClick, isLink }) => (
    <div 
        className={`flex items-center justify-between gap-2 py-1.5 border-b border-white/[0.05] last:border-0 ${onClick ? 'cursor-pointer hover:bg-white/[0.04] active:bg-white/[0.08] transition-all rounded-md px-1' : ''}`}
        onClick={onClick}
    >
        <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="flex-shrink-0 w-6 h-6 rounded-lg bg-white/[0.05] flex items-center justify-center">
                {icon}
            </div>
            <span className="text-[9px] font-black text-gray-500 tracking-wider uppercase truncate leading-none">
                {label}
            </span>
        </div>
        <span className={`text-[11px] font-bold text-right leading-snug tracking-tight max-w-[62%] break-words line-clamp-2 ${isLink ? 'text-primary underline hover:text-orange-400' : 'text-gray-200'}`}>
            {value}
        </span>
    </div>
);

const AssignedJobNotificationModal: React.FC<AssignedJobNotificationModalProps> = ({
    booking,
    onClose,
}) => {
    const navigate = useNavigate();
    const { db } = useDatabase();
    const [imageError, setImageError] = React.useState(false);

    const customer = React.useMemo(() => {
        if (!db?.customers) return null;
        const list = Array.isArray(db.customers) ? db.customers : [db.customers as any];
        return (
            list.find((c) => c.id === booking.customerId) ||
            list.find((c) => (booking as any).customerEmail && c.email?.toLowerCase() === (booking as any).customerEmail.toLowerCase()) ||
            list.find((c) => booking.customerName && c.name?.toLowerCase() === booking.customerName.toLowerCase()) ||
            null
        );
    }, [db?.customers, booking.customerId, (booking as any).customerEmail, booking.customerName]);

    const defaultUiAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(booking.customerName || 'Customer')}&background=FE7803&color=fff&bold=true&size=128`;

    const rawImageUrl =
        customer?.picture ||
        (booking as any).customerAvatar ||
        (booking as any).customerPhoto ||
        (booking as any).customerImage ||
        db?.settings?.defaultCustomerImageUrl ||
        '';

    const isValidImage = (url: string) =>
        url &&
        !url.includes('placeholder') &&
        !url.includes('placehold.co') &&
        !url.startsWith('data:image/svg') &&
        url !== '/placeholder.svg';

    const imageUrl = isValidImage(rawImageUrl) ? rawImageUrl : defaultUiAvatar;
    const hasImage = !imageError;

    const handleViewDetails = () => {
        onClose();
        navigate(`/mechanic-portal/job/${booking.id}`);
    };

    const handleMapClick = () => {
        const lat = booking.location?.lat;
        const lng = booking.location?.lng;
        const address = booking.location?.address;

        if (lat && lng) {
            window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
        } else if (address) {
            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
        } else {
            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.customerName + ' location')}`, '_blank');
        }
    };

    const subtotal =
        booking.totalAmount ||
        booking.services?.reduce((acc, s) => acc + (s.price || 0), 0) ||
        booking.service?.price ||
        booking.price ||
        0;

    const downpaymentAmount =
        booking.paidAmount != null && Number(booking.paidAmount) > 0
            ? Number(booking.paidAmount)
            : booking.downpaymentAmount != null && Number(booking.downpaymentAmount) > 0
            ? Number(booking.downpaymentAmount)
            : Math.round(subtotal * 0.5);

    const remainingBalance =
        booking.remainingBalance != null
            ? Number(booking.remainingBalance)
            : Math.max(0, subtotal - downpaymentAmount);

    const payout = subtotal;

    const paymentMethodLabel =
        booking.paymentMethod ||
        booking.downpaymentMethod ||
        'Online Payment';

    const isDownpaymentPaid =
        booking.isPaid ||
        (typeof booking.paymentStatus === 'string' &&
            (booking.paymentStatus.toLowerCase().includes('paid') ||
                booking.paymentStatus.toLowerCase().includes('downpayment'))) ||
        !!booking.downpaymentPaidAt ||
        !!booking.isVerified;

    const formattedDate = new Date(
        booking.date.replace(/-/g, '/')
    ).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
    });

    const vehicleLabel =
        `${booking.vehicle?.make || ''} ${booking.vehicle?.model || ''}`.trim() ||
        'Vehicle';

    return (
        <>
            {/* Keyframe styles injected inline */}
            <style>{`
                @keyframes ag-fadeIn {
                    from { opacity: 0; }
                    to   { opacity: 1; }
                }
                @keyframes ag-scaleUp {
                    from { opacity: 0; transform: scale(0.92) translateY(16px); }
                    to   { opacity: 1; transform: scale(1)    translateY(0);    }
                }
                @keyframes ag-ping-ring {
                    0%   { transform: scale(1);    opacity: 0.7; }
                    70%  { transform: scale(1.45); opacity: 0;   }
                    100% { transform: scale(1.45); opacity: 0;   }
                }
                @keyframes ag-gradient-shift {
                    0%   { background-position: 0%   50%; }
                    50%  { background-position: 100% 50%; }
                    100% { background-position: 0%   50%; }
                }
                .ag-fadeIn   { animation: ag-fadeIn  0.2s ease forwards; }
                .ag-scaleUp  { animation: ag-scaleUp 0.3s cubic-bezier(0.25, 1, 0.5, 1) forwards; }
                .ag-ping-ring {
                    animation: ag-ping-ring 1.8s cubic-bezier(0,0,0.2,1) infinite;
                }
                .ag-grad-btn {
                    background: linear-gradient(135deg, #FE7803, #FF9F40);
                    background-size: 200% 200%;
                    animation: ag-gradient-shift 3s ease infinite;
                }
            `}</style>

            {/* Backdrop */}
            <div
                className="ag-fadeIn fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 overflow-y-auto overflow-x-hidden"
                style={{
                    backgroundColor: 'rgba(0,0,0,0.88)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                }}
            >
                {/* Ambient radial glow */}
                <div
                    className="pointer-events-none absolute inset-0 overflow-hidden"
                    style={{
                        background:
                            'radial-gradient(ellipse 50% 40% at 50% 40%, rgba(254,120,3,0.08) 0%, transparent 70%)',
                    }}
                />

                {/* Modal Card */}
                <div
                    className="ag-scaleUp relative w-full max-w-[340px] xs:max-w-[360px] max-h-[92vh] flex flex-col overflow-y-auto overflow-x-hidden custom-scrollbar mx-auto my-auto"
                    style={{
                        background: '#121212',
                        border: '1.5px solid rgba(254,120,3,0.35)',
                        borderRadius: '1.75rem',
                        padding: '1.15rem 1rem',
                        boxShadow:
                            '0 0 40px rgba(254,120,3,0.12), 0 24px 48px rgba(0,0,0,0.7)',
                    }}
                    role="alert"
                    aria-modal="true"
                    aria-labelledby="agn-title"
                >
                    {/* Top-right decorative glow blob */}
                    <div
                        className="pointer-events-none absolute -top-8 -right-8 w-32 h-32 rounded-full overflow-hidden"
                        style={{
                            background: 'rgba(254,120,3,0.10)',
                            filter: 'blur(32px)',
                        }}
                    />

                    {/* Dismiss X button */}
                    <button
                        onClick={onClose}
                        aria-label="Dismiss notification"
                        className="absolute top-3.5 right-3.5 w-7 h-7 rounded-full flex items-center justify-center transition-all active:scale-90 z-20"
                        style={{
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.08)',
                        }}
                    >
                        <X size={12} color="#9CA3AF" />
                    </button>

                    {/* ── HEADER (Inline Avatar + Title + Description) ── */}
                    <div className="relative z-10 flex flex-col items-center mb-3">
                        {/* Subtitle badge */}
                        <div
                            className="mb-3 self-center flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase"
                            style={{
                                background: 'rgba(254,120,3,0.12)',
                                border: '1px solid rgba(254,120,3,0.25)',
                                color: '#FE7803',
                            }}
                        >
                            <span className="text-[10px] leading-none">🔔</span>
                            <span>INCOMING REQUEST</span>
                        </div>

                        {/* Inline Image & Text Row */}
                        <div className="flex items-center gap-3 w-full px-1">
                            {/* Pulsing icon ring & Image */}
                            <div className="relative flex-shrink-0 flex items-center justify-center">
                                {/* Ping ring 1 */}
                                <span
                                    className="ag-ping-ring absolute inline-flex w-14 h-14 rounded-2xl"
                                    style={{ background: 'rgba(254,120,3,0.20)' }}
                                />
                                {/* Ping ring 2 — delayed */}
                                <span
                                    className="ag-ping-ring absolute inline-flex w-14 h-14 rounded-2xl"
                                    style={{
                                        background: 'rgba(254,120,3,0.10)',
                                        animationDelay: '0.6s',
                                    }}
                                />
                                {/* Icon container */}
                                <div
                                    className="relative w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden bg-white/[0.04]"
                                    style={{
                                        border: '1.2px solid rgba(254,120,3,0.35)',
                                        boxShadow: '0 0 20px rgba(254,120,3,0.15)',
                                    }}
                                >
                                    {hasImage ? (
                                        <img
                                            src={imageUrl}
                                            alt={booking.customerName || 'Customer'}
                                            className="w-full h-full object-cover rounded-2xl"
                                            onError={(e) => {
                                                if ((e.currentTarget as HTMLImageElement).src !== defaultUiAvatar) {
                                                    (e.currentTarget as HTMLImageElement).src = defaultUiAvatar;
                                                } else {
                                                    setImageError(true);
                                                }
                                            }}
                                        />
                                    ) : (
                                        <User size={24} color="#FE7803" strokeWidth={1.8} />
                                    )}
                                </div>
                            </div>

                            {/* Title & Description to the right of image */}
                            <div className="flex flex-col text-left min-w-0 flex-1 justify-center">
                                <h2
                                    id="agn-title"
                                    className="text-lg xs:text-xl font-black tracking-tight leading-tight mb-0.5 truncate"
                                    style={{
                                        background: 'linear-gradient(135deg, #FE7803 0%, #FFB347 100%)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        backgroundClip: 'text',
                                    }}
                                >
                                    New Job Assigned!
                                </h2>
                                <p className="text-[10px] text-gray-400 font-medium tracking-normal leading-snug line-clamp-2">
                                    A customer has booked your services
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* ── JOB DETAILS CARD ── */}
                    <div
                        className="relative z-10 rounded-2xl mb-3 overflow-hidden"
                        style={{
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            padding: '0.65rem 0.85rem',
                        }}
                    >
                        <DetailRow
                            icon={<Wrench size={11} color="#FE7803" strokeWidth={2.2} />}
                            label="Service"
                            value={
                                booking.service?.name ||
                                booking.services?.[0]?.name ||
                                'Service'
                            }
                        />
                        <div className="flex items-center justify-between gap-2 py-1.5 border-b border-white/[0.04]">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                <div className="flex-shrink-0 w-6 h-6 rounded-lg bg-white/[0.05] flex items-center justify-center">
                                    <User size={11} color="#60A5FA" strokeWidth={2.2} />
                                </div>
                                <span className="text-[9px] font-black text-gray-500 tracking-wider uppercase truncate leading-none">
                                    Customer
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5 min-w-0 max-w-[62%] justify-end">
                                <img
                                    src={imageUrl}
                                    alt={booking.customerName || 'Customer'}
                                    className="w-4 h-4 rounded-full object-cover flex-shrink-0 border border-white/10"
                                    onError={(e) => {
                                        (e.currentTarget as HTMLImageElement).src = defaultUiAvatar;
                                    }}
                                />
                                <span className="text-[11px] font-semibold text-white tracking-wide truncate">
                                    {booking.customerName || 'Customer'}
                                </span>
                            </div>
                        </div>
                        <DetailRow
                            icon={<MapPin size={11} color="#EF4444" strokeWidth={2.2} />}
                            label="Map Link"
                            value={booking.location?.address || 'View Live Map ↗'}
                            onClick={handleMapClick}
                            isLink
                        />
                        <DetailRow
                            icon={<Car size={11} color="#22D3EE" strokeWidth={2.2} />}
                            label="Vehicle"
                            value={vehicleLabel}
                        />
                        <DetailRow
                            icon={<Calendar size={11} color="#34D399" strokeWidth={2.2} />}
                            label="Date"
                            value={formattedDate}
                        />
                        <DetailRow
                            icon={<Clock size={11} color="#FBBF24" strokeWidth={2.2} />}
                            label="Time"
                            value={booking.time}
                        />
                    </div>

                    {/* ── PAYMENT BREAKDOWN CARD ── */}
                    <div
                        className="relative z-10 rounded-2xl mb-3.5 overflow-hidden"
                        style={{
                            background:
                                'linear-gradient(145deg, rgba(16,185,129,0.12) 0%, rgba(5,150,105,0.06) 100%)',
                            border: '1px solid rgba(52,211,153,0.22)',
                            padding: '0.65rem 0.85rem',
                        }}
                    >
                        {/* Subtle glow */}
                        <div
                            className="pointer-events-none absolute -bottom-4 -right-4 w-20 h-20 rounded-full"
                            style={{
                                background: 'rgba(52,211,153,0.15)',
                                filter: 'blur(18px)',
                            }}
                        />

                        {/* Top Header of Breakdown */}
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-emerald-500/15 gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                                <Receipt size={12} className="text-emerald-400 flex-shrink-0" />
                                <span className="text-[9px] font-black text-emerald-400 tracking-wider uppercase truncate">
                                    Payment Breakdown
                                </span>
                            </div>
                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border flex-shrink-0 ${
                                isDownpaymentPaid
                                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                    : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                            }`}>
                                {isDownpaymentPaid ? '50% DP Paid' : 'Payment Pending'}
                            </span>
                        </div>

                        {/* Itemized lines */}
                        <div className="space-y-1.5 text-[10px] mb-2.5">
                            {/* Service Subtotal */}
                            <div className="flex items-center justify-between text-gray-400">
                                <span>Service Rate / Subtotal</span>
                                <span className="font-mono text-gray-200 font-bold">₱{subtotal.toLocaleString()}</span>
                            </div>

                            {/* 50% Initial Downpayment */}
                            <div className="flex items-center justify-between text-gray-400">
                                <div className="flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                    <span>50% Downpayment</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="font-mono text-emerald-400 font-bold">₱{downpaymentAmount.toLocaleString()}</span>
                                    {isDownpaymentPaid && (
                                        <CheckCircle2 size={10} className="text-emerald-400" />
                                    )}
                                </div>
                            </div>

                            {/* 50% Remaining Balance */}
                            <div className="flex items-center justify-between text-gray-400">
                                <div className="flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                                    <span>Remaining Balance</span>
                                </div>
                                <span className="font-mono text-amber-300 font-bold">₱{remainingBalance.toLocaleString()}</span>
                            </div>

                            {/* Method */}
                            <div className="flex items-center justify-between text-[9px] text-gray-500 pt-0.5">
                                <span>Payment Method</span>
                                <span className="text-gray-300 font-semibold">{paymentMethodLabel}</span>
                            </div>
                        </div>

                        {/* Estimated Earnings Bottom Highlight */}
                        <div className="pt-2 border-t border-emerald-500/20 flex items-center justify-between">
                            <div>
                                <p className="text-[8px] font-black text-emerald-400/80 tracking-widest uppercase mb-0.5">
                                    Total Earnings
                                </p>
                                <p
                                    className="text-xl font-black leading-none tracking-tight"
                                    style={{ color: '#34D399' }}
                                >
                                    ₱{payout.toLocaleString()}
                                </p>
                            </div>
                            <div
                                className="w-8 h-8 rounded-xl flex items-center justify-center"
                                style={{
                                    background: 'rgba(52,211,153,0.15)',
                                    border: '1px solid rgba(52,211,153,0.25)',
                                }}
                            >
                                <Wallet size={15} color="#34D399" strokeWidth={1.8} />
                            </div>
                        </div>
                    </div>

                    {/* ── ACTION BUTTONS ── */}
                    <div className="relative z-10 grid grid-cols-2 gap-2.5">
                        {/* Dismiss */}
                        <button
                            onClick={onClose}
                            className="flex items-center justify-center gap-1.5 py-3 rounded-xl text-[9px] font-black tracking-wider text-gray-300 transition-all active:scale-95"
                            style={{
                                background: 'rgba(255,255,255,0.04)',
                                border: '1px solid rgba(255,255,255,0.08)',
                            }}
                        >
                            <X size={10} strokeWidth={2.5} />
                            DISMISS
                        </button>

                        {/* View Details */}
                        <button
                            onClick={handleViewDetails}
                            className="ag-grad-btn flex items-center justify-center gap-1.5 py-3 rounded-xl text-[9px] font-black tracking-wider text-white transition-all active:scale-95 hover:brightness-110"
                            style={{
                                boxShadow:
                                    '0 6px 16px rgba(254,120,3,0.25), 0 2px 6px rgba(254,120,3,0.15)',
                            }}
                        >
                            VIEW JOB
                            <ChevronRight size={11} strokeWidth={2.8} />
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default AssignedJobNotificationModal;
