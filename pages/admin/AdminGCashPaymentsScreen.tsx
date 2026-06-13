import React, { useState, useMemo, useCallback } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { useNotification } from '../../context/NotificationContext';
import Spinner from '../../components/Spinner';
import EnhancedKPICard from '../../components/admin/EnhancedKPICard';
import {
    Search, CheckCircle, XCircle, Clock, Eye, Download,
    Image as ImageIcon, ZoomIn, X, AlertCircle, Filter,
    ArrowUpDown, ChevronDown, Receipt, Smartphone, User,
    Calendar, DollarSign, ExternalLink, RefreshCcw, FileCheck
} from 'lucide-react';
import { Booking } from '../../types';

// ─────────────────────────────────────────
// Global helpers: normalize booking data shapes
// (some bookings have .service, some have .services[])
// ─────────────────────────────────────────
const getServiceName = (booking: Booking): string =>
    booking.services && booking.services.length > 0
        ? booking.services.map(s => s.name).join(', ')
        : booking.service?.name || 'Unknown Service';

const getTotalAmount = (booking: Booking): number =>
    booking.totalAmount || booking.service?.price || booking.services?.[0]?.price || 0;

/* ─────────────────────────────────────────
   Receipt Lightbox
───────────────────────────────────────── */
const ReceiptLightbox: React.FC<{ 
    booking: Booking; 
    onClose: () => void;
    onApprove?: () => void;
    onDecline?: () => void;
}> = ({ booking, onClose, onApprove, onDecline }) => {
    const isPending = !booking.isVerified && !booking.gcashDeclineReason;
    const depositAmt = getTotalAmount(booking) / 2;

    return (
        <div
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 backdrop-blur-xl p-4 sm:p-6"
        >
            {/* Close Button */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all z-50"
            >
                <X size={20} />
            </button>
            
            {/* Content Container */}
            <div className="relative max-w-xl w-full flex flex-col items-center gap-4 animate-scaleUp" onClick={e => e.stopPropagation()}>
                {/* Header Information */}
                <div className="text-center space-y-1 mb-2 shrink-0">
                    <p className="text-[10px] font-black tracking-widest text-primary uppercase">GCash Deposit Verification</p>
                    <h3 className="text-white font-black text-lg tracking-tight">₱{depositAmt.toLocaleString()} Downpayment Review</h3>
                    <p className="text-[11px] text-gray-400">Customer: <span className="font-bold text-white">{booking.customerName}</span> · Booking ID: <span className="font-mono text-gray-300">#{(booking.id || '').slice(-6).toUpperCase()}</span></p>
                </div>

                {/* Receipt Image */}
                <div className="relative w-full border border-white/10 rounded-2xl overflow-hidden shadow-2xl bg-black/50 p-2">
                    <img
                        src={booking.gcashReceiptUrl}
                        alt="GCash Receipt"
                        className="w-full max-h-[50vh] object-contain rounded-xl"
                    />
                </div>
                
                {/* External link */}
                <a
                    href={booking.gcashReceiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 text-gray-500 hover:text-white transition-colors tracking-widest text-[10px] font-black uppercase"
                >
                    <ExternalLink size={12} /> Open Full Size
                </a>

                {/* Downpayment Verification Action Bar */}
                {isPending ? (
                    <div className="w-full bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 mt-2 shrink-0">
                        <button
                            onClick={onDecline}
                            className="flex-1 py-3 bg-red-500/10 hover:bg-red-500 border border-red-500/20 text-red-400 hover:text-white font-black tracking-widest text-[10px] uppercase rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                        >
                            <XCircle size={14} /> Decline Payment
                        </button>
                        <button
                            onClick={onApprove}
                            className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white font-black tracking-widest text-[10px] uppercase rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 active:scale-[0.98]"
                        >
                            <CheckCircle size={14} /> Confirm 50% Downpayment
                        </button>
                    </div>
                ) : (
                    <div className={`w-full border rounded-2xl p-4 text-center mt-2 shrink-0 ${booking.isVerified ? 'bg-green-500/5 border-green-500/20 text-green-400' : 'bg-red-500/5 border-red-500/20 text-red-400'}`}>
                        <p className="text-xs font-black tracking-widest uppercase">
                            {booking.isVerified ? '✓ Deposit Verified & Confirmed' : '✗ Downpayment Declined'}
                        </p>
                        {booking.gcashDeclineReason && (
                            <p className="text-[11px] text-gray-500 mt-1">{booking.gcashDeclineReason}</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────
   Decline Reason Modal
───────────────────────────────────────── */
const DeclineModal: React.FC<{
    booking: Booking;
    onConfirm: (reason: string) => void;
    onClose: () => void;
    processing: boolean;
}> = ({ booking, onConfirm, onClose, processing }) => {
    const [reason, setReason] = useState('');
    const presets = [
        'GCash receipt is blurry or unreadable.',
        'Receipt amount does not match the required deposit.',
        'Receipt appears to be a duplicate submission.',
        'Name on receipt does not match booking details.',
        'Receipt has been edited or tampered with.',
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg bg-[#121212] border border-red-500/20 rounded-[2rem] shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center gap-4">
                    <div className="p-3 bg-red-500/10 rounded-2xl border border-red-500/20">
                        <XCircle size={22} className="text-red-500" />
                    </div>
                    <div>
                        <p className="text-xs font-black text-red-400  tracking-widest">Decline Payment</p>
                        <p className="text-white font-black text-lg">
                            Booking #{(booking.id || '').slice(-6).toUpperCase() || 'UNKNOWN'}
                        </p>
                    </div>
                    <button onClick={onClose} className="ml-auto p-2 hover:bg-white/5 rounded-xl text-gray-500 hover:text-white transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    {/* Customer info */}
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center gap-3">
                        <User size={16} className="text-gray-500 shrink-0" />
                        <div>
                            <p className="text-white font-bold">{booking.customerName || 'Unknown Customer'}</p>
                            <p className="text-xs text-gray-500">{getServiceName(booking)} — ₱{(booking.totalAmount || 0).toLocaleString()}</p>
                        </div>
                    </div>

                    {/* Preset reasons */}
                    <div>
                        <p className="text-[10px] font-black  tracking-widest text-gray-500 mb-3">Quick Reason</p>
                        <div className="space-y-2">
                            {presets.map(p => (
                                <button
                                    key={p}
                                    onClick={() => setReason(p)}
                                    className={`w-full text-left text-xs px-4 py-3 rounded-xl border transition-all ${
                                        reason === p
                                            ? 'bg-red-500/10 border-red-500/40 text-red-300'
                                            : 'bg-white/3 border-white/5 text-gray-400 hover:bg-white/5 hover:text-white hover:border-white/10'
                                    }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Custom reason */}
                    <div>
                        <p className="text-[10px] font-black  tracking-widest text-gray-500 mb-2">Or write a custom reason</p>
                        <textarea
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            placeholder="Provide a clear reason for the customer..."
                            rows={3}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-gray-600 outline-none focus:border-red-500/40 focus:ring-0 resize-none transition-all"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={onClose}
                            disabled={processing}
                            className="flex-1 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black  tracking-widest text-xs rounded-xl transition-all disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => onConfirm(reason)}
                            disabled={processing || !reason.trim()}
                            className="flex-1 py-4 bg-red-500 hover:bg-red-600 text-white font-black  tracking-widest text-xs rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
                        >
                            {processing ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing</> : <><XCircle size={14} /> Confirm Decline</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────
   Detail Slide-over Panel
───────────────────────────────────────── */
const PaymentDetailPanel: React.FC<{
    booking: Booking;
    onClose: () => void;
    onApprove: () => void;
    onDecline: () => void;
    processing: boolean;
}> = ({ booking, onClose, onApprove, onDecline, processing }) => {
    const [lightbox, setLightbox] = useState(false);

    const statusBadge = booking.isVerified
        ? { label: 'Approved', cls: 'bg-green-500/15 text-green-400 border-green-500/30' }
        : booking.gcashDeclineReason
        ? { label: 'Declined', cls: 'bg-red-500/15 text-red-400 border-red-500/30' }
        : { label: 'Pending Review', cls: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' };

    return (
        <>
            {lightbox && booking.gcashReceiptUrl && (
                <ReceiptLightbox 
                    booking={booking} 
                    onClose={() => setLightbox(false)} 
                    onApprove={() => {
                        setLightbox(false);
                        onApprove();
                    }}
                    onDecline={() => {
                        setLightbox(false);
                        onDecline();
                    }}
                />
            )}

            <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" />
            <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg bg-[#121212] border-l border-white/10 shadow-2xl flex flex-col overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 shrink-0 bg-[#121212]">
                    <div>
                        <p className="text-[10px] font-black  tracking-widest text-gray-500 mb-1">GCash Payment Review</p>
                        <h2 className="text-xl font-black text-white tracking-tight ">
                            #{(booking.id || '').slice(-6).toUpperCase() || 'UNKNOWN'}
                        </h2>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`px-3 py-1.5 border text-[10px] font-black  tracking-widest rounded-xl ${statusBadge.cls}`}>
                            {statusBadge.label}
                        </span>
                        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl text-gray-500 hover:text-white transition-colors">
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">

                    {/* Amount banner */}
                    <div className="relative rounded-[2rem] p-6 overflow-hidden bg-gradient-to-br from-[#1A1A1A] to-black border border-white/5">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 blur-[60px] rounded-full pointer-events-none" />
                        <p className="text-[10px] font-black  tracking-widest text-gray-500 mb-1">Down Payment Required</p>
                        <p className="text-5xl font-black text-white tracking-tighter">
                            ₱{((booking.totalAmount || booking.service?.price || booking.services?.[0]?.price || 0) / 2).toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500 font-bold mt-1">
                            50% of ₱{(booking.totalAmount || booking.service?.price || booking.services?.[0]?.price || 0).toLocaleString()} total
                        </p>
                    </div>

                    {/* Customer */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 border border-white/5 p-4 rounded-[1.5rem] space-y-1">
                            <p className="text-[9px] font-black  tracking-widest text-gray-500 flex items-center gap-1.5"><User size={10} /> Customer</p>
                            <p className="font-black text-white">{booking.customerName || 'Unknown Customer'}</p>
                            {booking.customerPhone && <p className="text-xs text-gray-400">{booking.customerPhone}</p>}
                        </div>
                        <div className="bg-white/5 border border-white/5 p-4 rounded-[1.5rem] space-y-1">
                            <p className="text-[9px] font-black  tracking-widest text-gray-500 flex items-center gap-1.5"><Calendar size={10} /> Booking Date</p>
                            <p className="font-black text-white">{booking.date}</p>
                            <p className="text-xs text-gray-400">{booking.time}</p>
                        </div>
                        <div className="bg-white/5 border border-white/5 p-4 rounded-[1.5rem] space-y-1">
                            <p className="text-[9px] font-black  tracking-widest text-gray-500 flex items-center gap-1.5"><Smartphone size={10} /> Payment</p>
                            <p className="font-black text-white">GCash</p>
                            {booking.gcashReference && <p className="text-xs text-gray-400 font-mono">{booking.gcashReference}</p>}
                        </div>
                        <div className="bg-white/5 border border-white/5 p-4 rounded-[1.5rem] space-y-1">
                            <p className="text-[9px] font-black  tracking-widest text-gray-500 flex items-center gap-1.5"><Calendar size={10} /> Submitted</p>
                            <p className="font-black text-white">
                                {booking.createdAt ? new Date(booking.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                            </p>
                            <p className="text-xs text-gray-400">
                                {booking.createdAt ? new Date(booking.createdAt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) : ''}
                            </p>
                        </div>
                    </div>

                    {/* Service */}
                    <div className="bg-white/5 border border-white/5 p-4 rounded-[1.5rem] flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-xl border border-primary/20 shrink-0">
                            <Receipt size={18} className="text-primary" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black  tracking-widest text-gray-500 mb-0.5">Service</p>
                            <p className="font-black text-white">{getServiceName(booking)}</p>
                            {booking.vehicle && (
                                <p className="text-xs text-gray-400">
                                    {booking.vehicle.year} {booking.vehicle.make} {booking.vehicle.model} · {booking.vehicle.plateNumber}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Receipt Image */}
                    <div>
                        <p className="text-[10px] font-black  tracking-widest text-gray-500 mb-3 flex items-center gap-2">
                            <ImageIcon size={12} /> GCash Transaction Screenshot
                        </p>
                        {booking.gcashReceiptUrl ? (
                            <div
                                className="relative rounded-[1.5rem] overflow-hidden border border-white/10 bg-black/60 cursor-zoom-in group"
                                onClick={() => setLightbox(true)}
                            >
                                <img
                                    src={booking.gcashReceiptUrl}
                                    alt="GCash Receipt"
                                    className="w-full max-h-64 object-contain p-3 transition-transform duration-300 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 rounded-[1.5rem]">
                                    <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-5 py-3 rounded-xl font-black text-white  tracking-widest text-xs border border-white/15">
                                        <ZoomIn size={14} /> View Full Receipt
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-40 border-2 border-dashed border-white/10 rounded-[1.5rem] flex flex-col items-center justify-center text-gray-600 gap-2">
                                <ImageIcon size={28} />
                                <p className="text-xs font-black  tracking-widest">No receipt uploaded</p>
                            </div>
                        )}
                    </div>

                    {/* Verification history */}
                    {(booking.isVerified || booking.gcashDeclineReason) && (
                        <div className={`rounded-[1.5rem] p-4 border ${booking.isVerified ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                            <div className="flex items-start gap-3">
                                {booking.isVerified
                                    ? <CheckCircle size={18} className="text-green-500 mt-0.5 shrink-0" />
                                    : <XCircle size={18} className="text-red-500 mt-0.5 shrink-0" />}
                                <div>
                                    <p className={`text-xs font-black  tracking-widest ${booking.isVerified ? 'text-green-400' : 'text-red-400'}`}>
                                        {booking.isVerified ? 'Payment Approved' : 'Payment Declined'}
                                    </p>
                                    {booking.gcashDeclineReason && (
                                        <p className="text-xs text-gray-400 mt-1">{booking.gcashDeclineReason}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sticky action footer */}
                {!booking.isVerified && !booking.gcashDeclineReason && (
                    <div className="shrink-0 p-6 border-t border-white/5 bg-[#121212] flex gap-3">
                        <button
                            onClick={onDecline}
                            disabled={processing}
                            className="flex-1 py-4 bg-red-500/10 hover:bg-red-500 border border-red-500/20 text-red-400 hover:text-white font-black  tracking-widest text-xs rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {processing ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <><XCircle size={14} /> Decline</>}
                        </button>
                        <button
                            onClick={onApprove}
                            disabled={processing || !booking.gcashReceiptUrl}
                            className="flex-1 py-4 bg-green-500 hover:bg-green-600 text-white font-black  tracking-widest text-xs rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl shadow-green-500/20"
                        >
                            {processing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><CheckCircle size={14} /> Approve</>}
                        </button>
                    </div>
                )}

                {/* Re-review footer for already-processed */}
                {(booking.isVerified || booking.gcashDeclineReason) && (
                    <div className="shrink-0 p-6 border-t border-white/5 bg-[#121212]">
                        <p className="text-center text-xs text-gray-600 font-bold  tracking-widest">
                            This payment has already been {booking.isVerified ? 'approved' : 'declined'}.
                        </p>
                    </div>
                )}
            </div>
        </>
    );
};

/* ─────────────────────────────────────────
   Main Screen
───────────────────────────────────────── */
type FilterStatus = 'all' | 'pending' | 'approved' | 'declined';
type SortKey = 'date' | 'amount' | 'customer' | 'status';
type PaymentTab = 'services' | 'stores';

type StoreOrder = {
    id: string;
    customerId?: string;
    customerName?: string;
    contactPhone?: string;
    items?: Array<{ name?: string; quantity?: number; price?: number }>;
    total?: number;
    paymentMethod?: string;
    paymentStatus?: string;
    isPaid?: boolean;
    status?: string;
    date?: string;
    createdAt?: string;
    transactionId?: string;
    gcashReference?: string;
    gcashReceiptUrl?: string;
    gcashDeclineReason?: string;
    isVerified?: boolean;
    gcashPaymentStatus?: string;
};

const getOrderItemsName = (order: StoreOrder): string =>
    order.items && order.items.length > 0
        ? order.items.map(i => i.name || 'Item').join(', ')
        : 'Unknown Items';

const getOrderTotalAmount = (order: StoreOrder): number =>
    Number(order.total || 0);

const getOrderDepositAmount = (order: StoreOrder): number =>
    getOrderTotalAmount(order);

const AdminGCashPaymentsScreen: React.FC = () => {
    const { db, verifyBookingPayment, updateBooking, loading } = useDatabase();
    const { addNotification } = useNotification();

    const [activeTab, setActiveTab] = useState<PaymentTab>('services');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
    const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'date', dir: 'desc' });
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [selectedOrder, setSelectedOrder] = useState<StoreOrder | null>(null);
    const [showDeclineModal, setShowDeclineModal] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [lightboxBooking, setLightboxBooking] = useState<Booking | null>(null);
    const [lightboxOrder, setLightboxOrder] = useState<StoreOrder | null>(null);

    // Show bookings where payment method is GCash OR has GCash receipt data
    const gcashBookings = useMemo(() => {
        if (!db?.bookings) return [];
        return db.bookings.filter(b =>
            b.paymentMethod === 'GCash' ||
            b.paymentMethod === 'gcash' ||
            !!b.gcashReceiptUrl ||
            !!b.gcashPaymentStatus
        );
    }, [db?.bookings]);

    const storeGCashOrders = useMemo<StoreOrder[]>(() => {
        if (!db?.orders) return [];
        return (db.orders as StoreOrder[]).filter(o =>
            (o.paymentMethod || '').toLowerCase() === 'gcash' ||
            !!o.gcashReceiptUrl ||
            !!o.gcashPaymentStatus
        );
    }, [db?.orders]);

    // KPI stats
    const stats = useMemo(() => {
        const pending = gcashBookings.filter(b => !b.isVerified && !b.gcashDeclineReason);
        const approved = gcashBookings.filter(b => b.isVerified);
        const declined = gcashBookings.filter(b => !!b.gcashDeclineReason && !b.isVerified);
        const withReceipt = gcashBookings.filter(b => !!b.gcashReceiptUrl);
        const approvedAmount = approved.reduce((s, b) => s + (getTotalAmount(b) / 2), 0);
        return { total: gcashBookings.length, pending: pending.length, approved: approved.length, declined: declined.length, withReceipt: withReceipt.length, approvedAmount };
    }, [gcashBookings]);

    const storeStats = useMemo(() => {
        const pending = storeGCashOrders.filter(o => !o.isVerified && !o.gcashDeclineReason);
        const approved = storeGCashOrders.filter(o => !!o.isVerified || o.paymentStatus === 'paid' || o.isPaid);
        const declined = storeGCashOrders.filter(o => !!o.gcashDeclineReason && !o.isVerified);
        const approvedAmount = approved.reduce((s, o) => s + getOrderDepositAmount(o), 0);
        return { total: storeGCashOrders.length, pending: pending.length, approved: approved.length, declined: declined.length, approvedAmount };
    }, [storeGCashOrders]);

    // Filtered + sorted list
    const filtered = useMemo(() => {
        let list = gcashBookings.filter(b => {
            const q = search.toLowerCase();
            const svcName = getServiceName(b);
            const matches = !q ||
                (b.customerName || '').toLowerCase().includes(q) ||
                (b.id || '').toLowerCase().includes(q) ||
                (b.gcashReference || '').toLowerCase().includes(q) ||
                svcName.toLowerCase().includes(q);

            const statusOk =
                statusFilter === 'all' ||
                (statusFilter === 'pending' && !b.isVerified && !b.gcashDeclineReason) ||
                (statusFilter === 'approved' && b.isVerified) ||
                (statusFilter === 'declined' && !!b.gcashDeclineReason && !b.isVerified);

            return matches && statusOk;
        });

        list.sort((a, b) => {
            let av: any, bv: any;
            switch (sort.key) {
                case 'date': av = new Date(a.createdAt || 0).getTime(); bv = new Date(b.createdAt || 0).getTime(); break;
                case 'amount': av = getTotalAmount(a); bv = getTotalAmount(b); break;
                case 'customer': av = a.customerName || ''; bv = b.customerName || ''; break;
                case 'status': av = a.isVerified ? 2 : a.gcashDeclineReason ? 0 : 1; bv = b.isVerified ? 2 : b.gcashDeclineReason ? 0 : 1; break;
            }
            if (av < bv) return sort.dir === 'asc' ? -1 : 1;
            if (av > bv) return sort.dir === 'asc' ? 1 : -1;
            return 0;
        });

        return list;
    }, [gcashBookings, search, statusFilter, sort]);

    const filteredStoreOrders = useMemo(() => {
        let list = storeGCashOrders.filter(o => {
            const q = search.toLowerCase();
            const itemsName = getOrderItemsName(o);
            const matches = !q ||
                (o.customerName || '').toLowerCase().includes(q) ||
                (o.id || '').toLowerCase().includes(q) ||
                (o.gcashReference || o.transactionId || '').toLowerCase().includes(q) ||
                itemsName.toLowerCase().includes(q);

            const isApproved = !!o.isVerified || o.paymentStatus === 'paid' || o.isPaid;
            const isDeclined = !!o.gcashDeclineReason && !o.isVerified;
            const isPending = !isApproved && !isDeclined;

            const statusOk =
                statusFilter === 'all' ||
                (statusFilter === 'pending' && isPending) ||
                (statusFilter === 'approved' && isApproved) ||
                (statusFilter === 'declined' && isDeclined);

            return matches && statusOk;
        });

        list.sort((a, b) => {
            let av: any, bv: any;
            switch (sort.key) {
                case 'date': av = new Date(a.createdAt || a.date || 0).getTime(); bv = new Date(b.createdAt || b.date || 0).getTime(); break;
                case 'amount': av = getOrderTotalAmount(a); bv = getOrderTotalAmount(b); break;
                case 'customer': av = a.customerName || ''; bv = b.customerName || ''; break;
                case 'status': {
                    const sa = (!!a.isVerified || a.paymentStatus === 'paid' || a.isPaid) ? 2 : a.gcashDeclineReason ? 0 : 1;
                    const sb = (!!b.isVerified || b.paymentStatus === 'paid' || b.isPaid) ? 2 : b.gcashDeclineReason ? 0 : 1;
                    av = sa; bv = sb;
                    break;
                }
            }
            if (av < bv) return sort.dir === 'asc' ? -1 : 1;
            if (av > bv) return sort.dir === 'asc' ? 1 : -1;
            return 0;
        });

        return list;
    }, [storeGCashOrders, search, statusFilter, sort]);

    const toggleSort = (key: SortKey) => {
        setSort(prev => prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' });
    };

    const SortIcon = ({ k }: { k: SortKey }) => {
        if (sort.key !== k) return <ArrowUpDown size={12} className="text-gray-600 ml-1 inline" />;
        return sort.dir === 'asc' ? <ChevronDown size={12} className="text-primary ml-1 inline rotate-180" /> : <ChevronDown size={12} className="text-primary ml-1 inline" />;
    };

    // ── APPROVE ────────────────────────────
    const handleApprove = async () => {
        if (!selectedBooking) return;
        setProcessing(true);
        try {
            await verifyBookingPayment(selectedBooking.id);
            addNotification({ type: 'success', title: 'Payment Approved', message: `GCash deposit for ${selectedBooking.customerName} has been verified.`, recipientId: 'admin' });
            setSelectedBooking(null);
        } catch (e) {
            addNotification({ type: 'error', title: 'Approval Failed', message: (e as Error).message, recipientId: 'admin' });
        } finally {
            setProcessing(false);
        }
    };

    const handleDirectApprove = async (booking: Booking) => {
        setProcessing(true);
        try {
            await verifyBookingPayment(booking.id);
            addNotification({ type: 'success', title: 'Payment Approved', message: `GCash deposit for ${booking.customerName} has been verified.`, recipientId: 'admin' });
            setLightboxBooking(null);
            setSelectedBooking(null);
        } catch (e) {
            addNotification({ type: 'error', title: 'Approval Failed', message: (e as Error).message, recipientId: 'admin' });
        } finally {
            setProcessing(false);
        }
    };

    // ── DECLINE ────────────────────────────
    const handleDeclineConfirm = async (reason: string) => {
        if (!selectedBooking) return;
        setProcessing(true);
        try {
            await updateBooking(selectedBooking.id, {
                gcashDeclineReason: reason,
                gcashPaymentStatus: 'declined',
                paymentStatus: 'pending',
                isVerified: false
            });

            // Notify the specific customer in real-time
            await addNotification({
                recipientId: `customer-${selectedBooking.customerId}`,
                title: '❌ GCash Receipt Declined',
                message: `Your GCash receipt for "${getServiceName(selectedBooking)}" was declined. Reason: ${reason}`,
                type: 'alert',
                date: new Date().toISOString(),
                read: false,
                link: '/customer-portal/booking-history'
            });

            addNotification({ type: 'error', title: 'Payment Declined', message: `GCash receipt for ${selectedBooking.customerName} has been declined.`, recipientId: 'admin' });
            setShowDeclineModal(false);
            setSelectedBooking(null);
        } catch (e) {
            addNotification({ type: 'error', title: 'Decline Failed', message: (e as Error).message, recipientId: 'admin' });
        } finally {
            setProcessing(false);
        }
    };

    const handleApproveStoreOrder = async (order: StoreOrder) => {
        setProcessing(true);
        try {
            await updateBooking(order.id, {} as any);
        } catch {}
        try {
            await (useDatabase() as any).updateOrderStatus?.(order.id, 'Processing');
        } catch {}
        try {
            await (useDatabase() as any).addOrder?.({} as any);
        } catch {}
        try {
            await (useDatabase() as any);
        } catch {}
        try {
            const { doc, updateDoc } = await import('firebase/firestore');
            const { db: firestore } = await import('../../firebase');
            await updateDoc(doc(firestore, 'orders', order.id), {
                isVerified: true,
                gcashDeclineReason: null,
                gcashPaymentStatus: 'verified',
                paymentStatus: 'paid',
                isPaid: true,
                status: order.status === 'Pending' ? 'Processing' : (order.status || 'Processing')
            });
            addNotification({
                type: 'success',
                title: 'Store Payment Approved',
                message: `GCash payment for ${order.customerName || 'Customer'} was approved.`,
                recipientId: 'admin'
            });
            setSelectedOrder(null);
            setLightboxOrder(null);
        } catch (e) {
            addNotification({ type: 'error', title: 'Approval Failed', message: (e as Error).message, recipientId: 'admin' });
        } finally {
            setProcessing(false);
        }
    };

    const handleDeclineStoreOrder = async (order: StoreOrder, reason: string) => {
        setProcessing(true);
        try {
            const { doc, updateDoc } = await import('firebase/firestore');
            const { db: firestore } = await import('../../firebase');
            await updateDoc(doc(firestore, 'orders', order.id), {
                isVerified: false,
                gcashDeclineReason: reason,
                gcashPaymentStatus: 'declined',
                paymentStatus: 'pending',
                isPaid: false
            });
            await addNotification({
                recipientId: `customer-${order.customerId || ''}`,
                title: '❌ Store GCash Receipt Declined',
                message: `Your GCash receipt for store order #${(order.id || '').slice(-6).toUpperCase()} was declined. Reason: ${reason}`,
                type: 'alert',
                date: new Date().toISOString(),
                read: false,
                link: '/customer-portal/order-history'
            });
            addNotification({
                type: 'error',
                title: 'Store Payment Declined',
                message: `GCash receipt for ${order.customerName || 'Customer'} was declined.`,
                recipientId: 'admin'
            });
            setShowDeclineModal(false);
            setSelectedOrder(null);
            setLightboxOrder(null);
        } catch (e) {
            addNotification({ type: 'error', title: 'Decline Failed', message: (e as Error).message, recipientId: 'admin' });
        } finally {
            setProcessing(false);
        }
    };

    if (loading || !db) {
        return <div className="flex items-center justify-center h-full"><Spinner size="lg" color="text-white" /></div>;
    }

    const activeStats = activeTab === 'services' ? stats : storeStats;
    const activeCount = activeTab === 'services' ? gcashBookings.length : storeGCashOrders.length;

    return (
        <div className="space-y-8">
            {/* ── PAGE HEADER ─────────────────── */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-5xl font-black text-white tracking-tighter  leading-none">GCash Payments</h1>
                    <div className="flex items-center gap-2 mt-4">
                        <div className="h-1 w-12 bg-primary rounded-full" />
                        <p className="text-gray-500 font-bold  tracking-[0.3em] text-[10px]">Payment Verification Center</p>
                    </div>
                </div>
                {stats.pending > 0 && (
                    <div className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/20 px-5 py-3 rounded-2xl">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                        <p className="text-yellow-400 font-black  tracking-widest text-xs">
                            {stats.pending} Pending Review{stats.pending > 1 ? 's' : ''}
                        </p>
                    </div>
                )}
            </div>

            {/* ── KPI CARDS ───────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                <EnhancedKPICard
                    title="Total Submissions"
                    value={stats.total}
                    icon={<FileCheck size={22} className="text-white" />}
                    gradient="bg-gradient-to-br from-blue-600 to-blue-800"
                    subtitle="All GCash bookings"
                />
                <EnhancedKPICard
                    title="Pending Review"
                    value={stats.pending}
                    icon={<Clock size={22} className="text-white" />}
                    gradient={stats.pending > 0 ? "bg-gradient-to-br from-yellow-600 to-orange-700" : "bg-gradient-to-br from-gray-700 to-gray-900"}
                    subtitle="Awaiting action"
                />
                <EnhancedKPICard
                    title="Approved"
                    value={stats.approved}
                    icon={<CheckCircle size={22} className="text-white" />}
                    gradient="bg-gradient-to-br from-green-600 to-green-800"
                    subtitle={`₱${(stats.approvedAmount / 1000).toFixed(1)}k collected`}
                />
                <EnhancedKPICard
                    title="Declined"
                    value={stats.declined}
                    icon={<XCircle size={22} className="text-white" />}
                    gradient="bg-gradient-to-br from-red-600 to-red-900"
                    subtitle="Rejected receipts"
                />
            </div>

            {/* ── FILTERS ─────────────────────── */}
            <div className="bg-[#121212]/80 backdrop-blur-2xl border border-white/10 p-6 rounded-[2rem] relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/10 to-blue-600/10 rounded-[2rem] blur opacity-0 group-hover:opacity-100 transition duration-700 pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                        <input
                            type="text"
                            placeholder="Search by customer, booking ID, or GCash ref..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-14 pr-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-white font-bold placeholder-gray-600 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                        />
                    </div>
                    {/* Status filter tabs */}
                    <div className="flex gap-2 bg-white/5 border border-white/5 rounded-2xl p-1.5">
                        {(['all', 'pending', 'approved', 'declined'] as FilterStatus[]).map(s => (
                            <button
                                key={s}
                                onClick={() => setStatusFilter(s)}
                                className={`px-5 py-2.5 rounded-xl text-xs font-black  tracking-widest transition-all ${
                                    statusFilter === s
                                        ? s === 'pending' ? 'bg-yellow-500 text-white'
                                        : s === 'approved' ? 'bg-green-500 text-white'
                                        : s === 'declined' ? 'bg-red-500 text-white'
                                        : 'bg-primary text-white'
                                        : 'text-gray-500 hover:text-white'
                                }`}
                            >
                                {s}
                                {s === 'pending' && stats.pending > 0 && (
                                    <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[9px] ${statusFilter === 'pending' ? 'bg-white/20' : 'bg-yellow-500 text-white'}`}>{stats.pending}</span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── TABLE ───────────────────────── */}
            <div className="bg-[#121212]/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/5">
                                <th className="py-6 px-6 text-[10px] font-black  tracking-[0.2em] text-gray-500">
                                    <button onClick={() => toggleSort('date')} className="flex items-center hover:text-white transition-colors">
                                        Date <SortIcon k="date" />
                                    </button>
                                </th>
                                <th className="py-6 px-6 text-[10px] font-black  tracking-[0.2em] text-gray-500">
                                    <button onClick={() => toggleSort('customer')} className="flex items-center hover:text-white transition-colors">
                                        Customer <SortIcon k="customer" />
                                    </button>
                                </th>
                                <th className="py-6 px-6 text-[10px] font-black  tracking-[0.2em] text-gray-500">Service</th>
                                <th className="py-6 px-6 text-[10px] font-black  tracking-[0.2em] text-gray-500">
                                    <button onClick={() => toggleSort('amount')} className="flex items-center hover:text-white transition-colors">
                                        Deposit <SortIcon k="amount" />
                                    </button>
                                </th>
                                <th className="py-6 px-6 text-[10px] font-black  tracking-[0.2em] text-gray-500">Receipt</th>
                                <th className="py-6 px-6 text-[10px] font-black  tracking-[0.2em] text-gray-500">
                                    <button onClick={() => toggleSort('status')} className="flex items-center hover:text-white transition-colors">
                                        Status <SortIcon k="status" />
                                    </button>
                                </th>
                                <th className="py-6 px-6 text-[10px] font-black  tracking-[0.2em] text-gray-500 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-24">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="p-6 rounded-full bg-white/5 border border-white/5">
                                                <Receipt size={44} className="text-gray-700" />
                                            </div>
                                            <p className="text-gray-600 font-black  tracking-widest text-sm">No GCash payments found</p>
                                            {statusFilter !== 'all' && (
                                                <button onClick={() => setStatusFilter('all')} className="text-xs text-primary font-black  tracking-widest hover:underline">
                                                    Clear filters
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ) : filtered.map((booking, idx) => {
                                const isPending = !booking.isVerified && !booking.gcashDeclineReason;
                                const isApproved = booking.isVerified;
                                const total = getTotalAmount(booking);
                                const depositAmt = total / 2;

                                return (
                                    <tr
                                        key={booking.id}
                                        className={`transition-all duration-200 hover:bg-white/[0.03] group cursor-pointer ${idx % 2 !== 0 ? 'bg-white/[0.01]' : ''}`}
                                        onClick={() => setSelectedBooking(booking)}
                                    >
                                        {/* Date */}
                                        <td className="py-5 px-6">
                                            <p className="text-white font-bold text-sm">
                                                {booking.createdAt ? new Date(booking.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : '—'}
                                            </p>
                                            <p className="text-gray-600 text-[10px] font-mono">
                                                {booking.createdAt ? new Date(booking.createdAt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) : ''}
                                            </p>
                                        </td>

                                        {/* Customer */}
                                        <td className="py-5 px-6">
                                            <p className="text-white font-bold">{booking.customerName || 'Unknown Customer'}</p>
                                            <p className="text-gray-600 text-[10px] font-mono mt-0.5">#{(booking.id || '').slice(-6).toUpperCase() || 'N/A'}</p>
                                        </td>

                                        {/* Service */}
                                        <td className="py-5 px-6">
                                            <p className="text-gray-300 text-sm font-bold">{getServiceName(booking)}</p>
                                        </td>

                                        {/* Deposit */}
                                        <td className="py-5 px-6">
                                            <p className="text-primary font-black text-base">₱{depositAmt.toLocaleString()}</p>
                                            <p className="text-gray-600 text-[10px]">of ₱{total.toLocaleString()}</p>
                                        </td>

                                        {/* Receipt thumbnail */}
                                        <td className="py-5 px-6" onClick={e => e.stopPropagation()}>
                                            {booking.gcashReceiptUrl ? (
                                                <button
                                                    onClick={() => setLightboxBooking(booking)}
                                                    className="relative group/thumb w-14 h-14 rounded-xl overflow-hidden border border-white/10 bg-black/40"
                                                >
                                                    <img src={booking.gcashReceiptUrl} alt="receipt" className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity">
                                                        <ZoomIn size={14} className="text-white" />
                                                    </div>
                                                </button>
                                            ) : (
                                                <div className="w-14 h-14 rounded-xl border border-dashed border-white/10 flex items-center justify-center">
                                                    <ImageIcon size={18} className="text-gray-700" />
                                                </div>
                                            )}
                                        </td>

                                        {/* Status badge */}
                                        <td className="py-5 px-6">
                                            {isPending ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-[10px] font-black  tracking-widest rounded-xl">
                                                    <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse" />
                                                    Pending
                                                </span>
                                            ) : isApproved ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-black  tracking-widest rounded-xl">
                                                    <CheckCircle size={10} /> Approved
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black  tracking-widest rounded-xl">
                                                    <XCircle size={10} /> Declined
                                                </span>
                                            )}
                                        </td>

                                        {/* Actions */}
                                        <td className="py-5 px-6" onClick={e => e.stopPropagation()}>
                                            <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                <button
                                                    onClick={() => setSelectedBooking(booking)}
                                                    className="p-2.5 bg-white/5 hover:bg-blue-500/20 border border-white/5 hover:border-blue-500/20 text-gray-500 hover:text-blue-400 rounded-xl transition-all"
                                                    title="View details"
                                                >
                                                    <Eye size={15} />
                                                </button>
                                                {isPending && (
                                                    <>
                                                        <button
                                                            onClick={() => { setSelectedBooking(booking); setShowDeclineModal(true); }}
                                                            className="p-2.5 bg-red-500/10 hover:bg-red-500 border border-red-500/20 text-red-400 hover:text-white rounded-xl transition-all"
                                                            title="Decline"
                                                        >
                                                            <XCircle size={15} />
                                                        </button>
                                                        <button
                                                            onClick={async () => {
                                                                setSelectedBooking(booking);
                                                                setProcessing(true);
                                                                try {
                                                                    await verifyBookingPayment(booking.id);
                                                                    addNotification({ type: 'success', title: 'Payment Approved', message: `${booking.customerName} deposit verified.`, recipientId: 'admin' });
                                                                } catch (e) {
                                                                    addNotification({ type: 'error', title: 'Error', message: (e as Error).message, recipientId: 'admin' });
                                                                } finally {
                                                                    setProcessing(false);
                                                                    setSelectedBooking(null);
                                                                }
                                                            }}
                                                            className="p-2.5 bg-green-500/10 hover:bg-green-500 border border-green-500/20 text-green-400 hover:text-white rounded-xl transition-all"
                                                            title="Approve"
                                                        >
                                                            <CheckCircle size={15} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Footer count */}
                {filtered.length > 0 && (
                    <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between">
                        <p className="text-gray-600 text-xs font-bold">
                            Showing {filtered.length} of {gcashBookings.length} GCash bookings
                        </p>
                        {search || statusFilter !== 'all' ? (
                            <button onClick={() => { setSearch(''); setStatusFilter('all'); }} className="text-xs text-primary font-black  tracking-widest hover:underline flex items-center gap-1">
                                <RefreshCcw size={10} /> Reset filters
                            </button>
                        ) : null}
                    </div>
                )}
            </div>

            {/* ── LIGHTBOX ────────────────────── */}
            {lightboxBooking && lightboxBooking.gcashReceiptUrl && (
                <ReceiptLightbox 
                    booking={lightboxBooking} 
                    onClose={() => setLightboxBooking(null)} 
                    onApprove={() => handleDirectApprove(lightboxBooking)}
                    onDecline={() => {
                        setSelectedBooking(lightboxBooking);
                        setLightboxBooking(null);
                        setShowDeclineModal(true);
                    }}
                />
            )}

            {/* ── DETAIL PANEL ────────────────── */}
            {selectedBooking && !showDeclineModal && (
                <PaymentDetailPanel
                    booking={selectedBooking}
                    onClose={() => setSelectedBooking(null)}
                    onApprove={handleApprove}
                    onDecline={() => setShowDeclineModal(true)}
                    processing={processing}
                />
            )}

            {/* ── DECLINE MODAL ───────────────── */}
            {showDeclineModal && selectedBooking && (
                <DeclineModal
                    booking={selectedBooking}
                    onConfirm={handleDeclineConfirm}
                    onClose={() => setShowDeclineModal(false)}
                    processing={processing}
                />
            )}
        </div>
    );
};

export default AdminGCashPaymentsScreen;
