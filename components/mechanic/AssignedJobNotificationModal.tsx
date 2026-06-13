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
} from 'lucide-react';
import { Booking } from '../../types';

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
        className={`flex items-center gap-2.5 py-1.5 border-b border-white/[0.05] last:border-0 ${onClick ? 'cursor-pointer hover:bg-white/[0.04] active:bg-white/[0.08] transition-all rounded-md px-1 -mx-1' : ''}`}
        onClick={onClick}
    >
        <div className="flex-shrink-0 w-6 h-6 rounded-lg bg-white/[0.05] flex items-center justify-center">
            {icon}
        </div>
        <span className="text-[9px] font-black text-gray-500 tracking-wider uppercase flex-1 leading-none">
            {label}
        </span>
        <span className={`text-[11px] font-bold text-right leading-snug tracking-tight max-w-[65%] break-words ${isLink ? 'text-primary underline hover:text-orange-400' : 'text-gray-200'}`}>
            {value}
        </span>
    </div>
);

const AssignedJobNotificationModal: React.FC<AssignedJobNotificationModalProps> = ({
    booking,
    onClose,
}) => {
    const navigate = useNavigate();

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

    const payout =
        booking.service?.price ||
        booking.services?.[0]?.price ||
        booking.totalAmount ||
        0;

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
                className="ag-fadeIn fixed inset-0 z-[200] flex items-center justify-center p-4"
                style={{
                    backgroundColor: 'rgba(0,0,0,0.90)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                }}
            >
                {/* Ambient radial glow */}
                <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                        background:
                            'radial-gradient(ellipse 50% 40% at 50% 40%, rgba(254,120,3,0.08) 0%, transparent 70%)',
                    }}
                />

                {/* Modal Card */}
                <div
                    className="ag-scaleUp relative w-full max-w-[340px] overflow-hidden"
                    style={{
                        background: '#121212',
                        border: '1.5px solid rgba(254,120,3,0.35)',
                        borderRadius: '1.75rem',
                        padding: '1.25rem',
                        boxShadow:
                            '0 0 40px rgba(254,120,3,0.12), 0 24px 48px rgba(0,0,0,0.7)',
                    }}
                    role="alert"
                    aria-modal="true"
                    aria-labelledby="agn-title"
                >
                    {/* Top-right decorative glow blob */}
                    <div
                        className="pointer-events-none absolute -top-8 -right-8 w-32 h-32 rounded-full"
                        style={{
                            background: 'rgba(254,120,3,0.10)',
                            filter: 'blur(32px)',
                        }}
                    />

                    {/* Dismiss X button */}
                    <button
                        onClick={onClose}
                        aria-label="Dismiss notification"
                        className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center transition-all active:scale-90"
                        style={{
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.06)',
                        }}
                    >
                        <X size={12} color="#9CA3AF" />
                    </button>

                    {/* ── HEADER ── */}
                    <div className="relative z-10 flex flex-col items-center text-center mb-4">
                        {/* Subtitle badge */}
                        <div
                            className="mb-3 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-widest"
                            style={{
                                background: 'rgba(254,120,3,0.12)',
                                border: '1px solid rgba(254,120,3,0.25)',
                                color: '#FE7803',
                            }}
                        >
                            <span>🔔</span>
                            <span>INCOMING REQUEST</span>
                        </div>

                        {/* Pulsing icon ring */}
                        <div className="relative flex items-center justify-center mb-3">
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
                                className="relative w-14 h-14 rounded-2xl flex items-center justify-center"
                                style={{
                                    background:
                                        'linear-gradient(135deg, rgba(254,120,3,0.20), rgba(254,120,3,0.08))',
                                    border: '1.2px solid rgba(254,120,3,0.35)',
                                    boxShadow: '0 0 20px rgba(254,120,3,0.15)',
                                }}
                            >
                                <Briefcase size={24} color="#FE7803" strokeWidth={1.8} />
                            </div>
                        </div>

                        {/* Title */}
                        <h2
                            id="agn-title"
                            className="text-xl font-black tracking-tight leading-none mb-1"
                            style={{
                                background: 'linear-gradient(135deg, #FE7803 0%, #FFB347 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                            }}
                        >
                            New Job Assigned!
                        </h2>
                        <p className="text-[9px] text-gray-500 font-semibold tracking-wider">
                            A customer has booked your services
                        </p>
                    </div>

                    {/* ── JOB DETAILS CARD ── */}
                    <div
                        className="relative z-10 rounded-2xl mb-3"
                        style={{
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            padding: '0.75rem 1rem',
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
                        <DetailRow
                            icon={<User size={11} color="#60A5FA" strokeWidth={2.2} />}
                            label="Customer"
                            value={booking.customerName || 'Customer'}
                        />
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

                    {/* ── PAYOUT CARD ── */}
                    <div
                        className="relative z-10 rounded-2xl mb-4 overflow-hidden"
                        style={{
                            background:
                                'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(5,150,105,0.08) 100%)',
                            border: '1px solid rgba(52,211,153,0.20)',
                            padding: '0.75rem 1rem',
                        }}
                    >
                        {/* Subtle glow */}
                        <div
                            className="pointer-events-none absolute -bottom-4 -right-4 w-16 h-16 rounded-full"
                            style={{
                                background: 'rgba(52,211,153,0.15)',
                                filter: 'blur(16px)',
                            }}
                        />
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[8px] font-black text-emerald-400/70 tracking-widest uppercase mb-0.5">
                                    Estimated Earnings
                                </p>
                                <p
                                    className="text-2xl font-black leading-none tracking-tight"
                                    style={{ color: '#34D399' }}
                                >
                                    ₱{payout.toLocaleString()}
                                </p>
                            </div>
                            <div
                                className="w-9 h-9 rounded-xl flex items-center justify-center"
                                style={{
                                    background: 'rgba(52,211,153,0.12)',
                                    border: '1px solid rgba(52,211,153,0.20)',
                                }}
                            >
                                <Wallet size={16} color="#34D399" strokeWidth={1.8} />
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
